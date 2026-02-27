from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Header, Response
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from jose import jwt
import os
import logging
import uuid
import secrets
import qrcode
import io
from pathlib import Path
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest, CheckoutSessionResponse

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Environment variables
JWT_SECRET = os.environ.get('JWT_SECRET', 'secret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')

# Create FastAPI app
app = FastAPI(title="AdGrid API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============= MODELS =============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    role: str  # admin, customer, agent
    phone: Optional[str] = None
    picture: Optional[str] = None
    aadhaar_verified: bool = False
    mobile_verified: bool = False
    created_at: datetime

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class Hoarding(BaseModel):
    hoarding_id: str
    title: str
    location: str
    area: str
    coordinates: Dict[str, float]  # {lat, lng}
    size: str  # e.g., "20x10 ft"
    category: str  # Premium, Normal, Economy
    status: str  # Available, Booked, Maintenance
    price_per_day: float
    images: List[str]
    visibility_level: str  # High, Medium, Low
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Booking(BaseModel):
    booking_id: str
    user_id: str
    hoarding_id: str
    start_date: str
    end_date: str
    duration_days: int
    amount: float
    status: str  # Pending, Confirmed, Active, Completed, Cancelled
    payment_status: str  # Pending, Paid, Failed
    payment_id: Optional[str] = None
    noc_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class MaintenanceLog(BaseModel):
    log_id: str
    hoarding_id: str
    agent_id: str
    status: str  # Active, Under Maintenance, Damaged
    notes: Optional[str] = None
    images: List[str] = []
    created_at: datetime

class ElectricPole(BaseModel):
    pole_id: str
    location: str
    coordinates: Dict[str, float]
    status: str  # Active, Maintenance
    created_at: datetime

class PaymentTransaction(BaseModel):
    transaction_id: str
    booking_id: str
    session_id: str
    amount: float
    currency: str
    status: str  # Pending, Completed, Failed
    payment_status: str
    metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime

class ChatMessage(BaseModel):
    session_id: str
    message: str
    role: str  # user, assistant
    timestamp: datetime

# Request Models
class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    role: str  # customer, agent
    phone: str  # Mobile number

class SessionRequest(BaseModel):
    session_id: str

class VerifyAadhaarRequest(BaseModel):
    aadhaar_number: str
    otp: str

class VerifyMobileRequest(BaseModel):
    phone: str
    otp: str

class BookingRequest(BaseModel):
    hoarding_id: str
    start_date: str
    end_date: str

class MaintenanceUpdateRequest(BaseModel):
    hoarding_id: str
    status: str
    notes: Optional[str] = None
    images: Optional[List[str]] = []

class HoardingRequestModel(BaseModel):
    title: str
    location: str
    area: str
    city: str
    district: str
    country: str
    coordinates: Dict[str, float]
    size: str
    category: str
    price_per_day: float
    visibility_level: str
    description: str
    type: str

class VerifyEmailRequest(BaseModel):
    email: str
    code: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class PosterGenerateRequest(BaseModel):
    prompt: str
    hoarding_id: Optional[str] = None

class ComplaintRequest(BaseModel):
    subject: str
    description: str
    category: str  # Technical, Billing, Service, Other

class FeedbackRequest(BaseModel):
    rating: int  # 1-5
    comment: str
    category: str  # Platform, Service, Experience

# ============= AUTHENTICATION UTILITIES =============

def create_jwt_token(user_id: str, role: str) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def decode_jwt_token(token: str) -> dict:
    """Decode JWT token"""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(
    request: Request,
    authorization: Optional[str] = Header(None)
) -> dict:
    """Get current authenticated user from cookie or header"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    # Try to get token from cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token and authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization.replace("Bearer ", "")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check session in database
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Session not found")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user_doc

# ============= AUTH ROUTES =============

@api_router.post("/auth/register")
async def register(req: RegisterRequest):
    """Register new user with JWT"""
    # Check if user exists
    existing = await db.users.find_one({"email": req.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_data = {
        "user_id": user_id,
        "email": req.email,
        "name": req.name,
        "phone": req.phone,
        "role": req.role,
        "aadhaar_verified": False,
        "mobile_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_data)
    
    # Create session
    session_token = f"jwt_{secrets.token_urlsafe(32)}"
    session_data = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    return {
        "user": user_data,
        "session_token": session_token
    }

@api_router.post("/auth/login")
async def login(req: LoginRequest):
    """Login with JWT (simplified for demo)"""
    user_doc = await db.users.find_one({"email": req.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Create new session
    session_token = f"jwt_{secrets.token_urlsafe(32)}"
    session_data = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    return {
        "user": user_doc,
        "session_token": session_token
    }

@api_router.post("/auth/session")
async def process_emergent_session(req: SessionRequest, response: Response):
    """Process Emergent OAuth session_id"""
    # REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    
    # Call Emergent Auth API
    import requests
    auth_response = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": req.session_id}
    )
    
    if auth_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Invalid session")
    
    data = auth_response.json()
    
    # Check if user exists
    user_doc = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_data = {
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture"),
            "role": "customer",  # Default role
            "aadhaar_verified": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_data)
        user_doc = user_data
    
    # Create session
    session_token = data["session_token"]
    session_data = {
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_data)
    
    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current user"""
    return user

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    """Logout user"""
    # Delete session
    await db.user_sessions.delete_many({"user_id": user["user_id"]})
    
    # Clear cookie
    response.delete_cookie("session_token", path="/")
    
    return {"message": "Logged out successfully"}

@api_router.post("/auth/send-mobile-otp")
async def send_mobile_otp(phone: str):
    """Send OTP to mobile number (mock implementation)"""
    # Generate 6-digit OTP
    otp = str(secrets.randbelow(1000000)).zfill(6)
    
    # Store OTP in database with expiry
    await db.mobile_otps.insert_one({
        "phone": phone,
        "otp": otp,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # In production, send SMS via Twilio/other SMS provider
    logger.info(f"Mobile OTP for {phone}: {otp}")
    
    return {"message": "OTP sent to mobile", "otp": otp}  # Remove OTP in production

@api_router.post("/auth/verify-mobile")
async def verify_mobile(req: VerifyMobileRequest):
    """Verify mobile OTP"""
    otp_doc = await db.mobile_otps.find_one(
        {"phone": req.phone, "otp": req.otp},
        {"_id": 0}
    )
    
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check expiry
    expires_at = datetime.fromisoformat(otp_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="OTP expired")
    
    # Delete used OTP
    await db.mobile_otps.delete_one({"phone": req.phone, "otp": req.otp})
    
    return {"message": "Mobile verified successfully", "verified": True}

@api_router.post("/auth/verify-aadhaar")
async def verify_aadhaar(req: VerifyAadhaarRequest, user: dict = Depends(get_current_user)):
    """Verify Aadhaar (mock implementation)"""
    # In production, integrate with UIDAI API
    # For demo, accept any 12-digit number and 6-digit OTP
    
    if len(req.aadhaar_number) != 12 or len(req.otp) != 6:
        raise HTTPException(status_code=400, detail="Invalid Aadhaar or OTP")
    
    # Update user
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"aadhaar_verified": True}}
    )
    
    return {"message": "Aadhaar verified successfully", "verified": True}

@api_router.post("/auth/send-verification-email")
async def send_verification_email(email: str):
    """Send verification code to email (mock implementation)"""
    # Generate 6-digit code
    code = str(secrets.randbelow(1000000)).zfill(6)
    
    # Store code in database with expiry
    await db.verification_codes.insert_one({
        "email": email,
        "code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # In production, send email via SendGrid/Resend
    logger.info(f"Verification code for {email}: {code}")
    
    return {"message": "Verification code sent to email", "code": code}  # Remove code in production

@api_router.post("/auth/verify-email")
async def verify_email(req: VerifyEmailRequest):
    """Verify email with code"""
    code_doc = await db.verification_codes.find_one(
        {"email": req.email, "code": req.code},
        {"_id": 0}
    )
    
    if not code_doc:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Check expiry
    expires_at = datetime.fromisoformat(code_doc["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Mark as verified
    await db.users.update_one(
        {"email": req.email},
        {"$set": {"email_verified": True}}
    )
    
    # Delete used code
    await db.verification_codes.delete_one({"email": req.email, "code": req.code})
    
    return {"message": "Email verified successfully", "verified": True}

# ============= HOARDINGS ROUTES =============

@api_router.get("/hoardings")
async def get_hoardings(
    category: Optional[str] = None,
    status: Optional[str] = None,
    area: Optional[str] = None,
    city: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None
):
    """Get all hoardings with filters"""
    query = {}
    
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    if city:
        query["city"] = {"$regex": city, "$options": "i"}
    if min_price is not None or max_price is not None:
        query["price_per_day"] = {}
        if min_price is not None:
            query["price_per_day"]["$gte"] = min_price
        if max_price is not None:
            query["price_per_day"]["$lte"] = max_price
    
    hoardings = await db.hoardings.find(query, {"_id": 0}).to_list(1000)
    return {"hoardings": hoardings, "count": len(hoardings)}

@api_router.get("/areas")
async def get_areas():
    """Get unique areas for search"""
    areas = await db.hoardings.distinct("area")
    cities = await db.hoardings.distinct("city")
    return {"areas": sorted(areas), "cities": sorted(cities)}

@api_router.get("/hoardings/{hoarding_id}")
async def get_hoarding(hoarding_id: str):
    """Get single hoarding"""
    hoarding = await db.hoardings.find_one({"hoarding_id": hoarding_id}, {"_id": 0})
    if not hoarding:
        raise HTTPException(status_code=404, detail="Hoarding not found")
    return hoarding

@api_router.post("/hoardings")
async def create_hoarding(hoarding: Hoarding, user: dict = Depends(get_current_user)):
    """Create new hoarding (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    hoarding_data = hoarding.dict()
    hoarding_data["created_at"] = datetime.now(timezone.utc).isoformat()
    hoarding_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.hoardings.insert_one(hoarding_data)
    return hoarding_data

@api_router.put("/hoardings/{hoarding_id}")
async def update_hoarding(
    hoarding_id: str,
    updates: dict,
    user: dict = Depends(get_current_user)
):
    """Update hoarding (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.hoardings.update_one(
        {"hoarding_id": hoarding_id},
        {"$set": updates}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Hoarding not found")
    
    return {"message": "Updated successfully"}

# ============= BOOKINGS ROUTES =============

@api_router.post("/bookings")
async def create_booking(req: BookingRequest, user: dict = Depends(get_current_user)):
    """Create new booking - Direct booking without payment"""
    # Check if hoarding exists and available
    hoarding = await db.hoardings.find_one({"hoarding_id": req.hoarding_id}, {"_id": 0})
    if not hoarding:
        raise HTTPException(status_code=404, detail="Hoarding not found")
    
    if hoarding["status"] != "Available":
        raise HTTPException(status_code=400, detail="Hoarding not available")
    
    # Calculate duration and amount
    start = datetime.fromisoformat(req.start_date)
    end = datetime.fromisoformat(req.end_date)
    duration = (end - start).days
    amount = duration * hoarding["price_per_day"]
    
    # Generate NOC number
    noc_number = f"NOC_{uuid.uuid4().hex[:10].upper()}"
    
    # Create booking - direct confirmation without payment
    booking_id = f"BKG_{uuid.uuid4().hex[:10].upper()}"
    booking_data = {
        "booking_id": booking_id,
        "user_id": user["user_id"],
        "hoarding_id": req.hoarding_id,
        "hoarding_title": hoarding["title"],
        "start_date": req.start_date,
        "end_date": req.end_date,
        "duration_days": duration,
        "amount": amount,
        "status": "Confirmed",  # Direct confirmation
        "noc_number": noc_number,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking_data)
    
    # Update hoarding status to Booked
    await db.hoardings.update_one(
        {"hoarding_id": req.hoarding_id},
        {"$set": {"status": "Booked", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return booking_data

@api_router.get("/bookings")
async def get_bookings(user: dict = Depends(get_current_user)):
    """Get user bookings"""
    if user["role"] == "admin":
        bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    else:
        bookings = await db.bookings.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(1000)
    
    return {"bookings": bookings}

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Get single booking"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check access
    if user["role"] != "admin" and booking["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return booking

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: dict = Depends(get_current_user)):
    """Cancel a booking"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check access
    if user["role"] != "admin" and booking["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Can only cancel Pending or Confirmed bookings
    if booking["status"] not in ["Pending", "Confirmed"]:
        raise HTTPException(status_code=400, detail="Cannot cancel this booking")
    
    # Update booking status
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "status": "Cancelled",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update hoarding status back to Available
    await db.hoardings.update_one(
        {"hoarding_id": booking["hoarding_id"]},
        {"$set": {"status": "Available", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Booking cancelled successfully"}

# ============= PAYMENT ROUTES =============

@api_router.post("/payments/checkout")
async def create_checkout(booking_id: str, origin_url: str, user: dict = Depends(get_current_user)):
    """Create Stripe checkout session"""
    # Get booking
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Initialize Stripe
    host_url = origin_url
    webhook_url = f"{host_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
    
    # Create checkout session
    success_url = f"{origin_url}/payment-success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/payment-cancel"
    
    checkout_request = CheckoutSessionRequest(
        amount=float(booking["amount"]),
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"booking_id": booking_id, "user_id": user["user_id"]}
    )
    
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction
    transaction_data = {
        "transaction_id": f"TXN_{uuid.uuid4().hex[:10].upper()}",
        "booking_id": booking_id,
        "session_id": session.session_id,
        "amount": booking["amount"],
        "currency": "inr",
        "status": "Pending",
        "payment_status": "Pending",
        "metadata": {"user_id": user["user_id"]},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payment_transactions.insert_one(transaction_data)
    
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    """Get payment status"""
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    checkout_status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction
    transaction = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    
    if transaction and checkout_status.payment_status == "paid":
        # Update transaction
        await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "Completed"}},
            {"$set": {
                "status": "Completed",
                "payment_status": "Completed",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Update booking
        noc_number = f"NOC_{uuid.uuid4().hex[:10].upper()}"
        await db.bookings.update_one(
            {"booking_id": transaction["booking_id"]},
            {"$set": {
                "payment_status": "Paid",
                "status": "Confirmed",
                "noc_number": noc_number,
                "payment_id": session_id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Hoarding status is already "Booked" from booking creation
        # Just ensure it's still booked
        booking = await db.bookings.find_one({"booking_id": transaction["booking_id"]}, {"_id": 0})
        await db.hoardings.update_one(
            {"hoarding_id": booking["hoarding_id"]},
            {"$set": {"status": "Booked", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total,
        "currency": checkout_status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhooks"""
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(body, signature)
        logger.info(f"Webhook received: {webhook_response.event_type}")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# ============= ADMIN ROUTES =============

@api_router.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(get_current_user)):
    """Get admin dashboard stats"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Count stats
        total_hoardings = await db.hoardings.count_documents({})
        available_hoardings = await db.hoardings.count_documents({"status": "Available"})
        booked_hoardings = await db.hoardings.count_documents({"status": "Booked"})
        maintenance_hoardings = await db.hoardings.count_documents({"status": "Maintenance"})
        
        # Category breakdown
        premium_count = await db.hoardings.count_documents({"category": "Premium"})
        standard_count = await db.hoardings.count_documents({"category": "Standard"})
        normal_count = await db.hoardings.count_documents({"category": "Normal"})
        economy_count = await db.hoardings.count_documents({"category": "Economy"})
        
        # Revenue calculation
        completed_bookings = await db.bookings.find({"status": {"$in": ["Confirmed", "Completed"]}}, {"_id": 0}).to_list(1000)
        total_revenue = sum(b["amount"] for b in completed_bookings)
        
        # Monthly revenue
        now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_bookings = [b for b in completed_bookings if datetime.fromisoformat(b["created_at"]) >= month_start]
        monthly_revenue = sum(b["amount"] for b in monthly_bookings)
        
        # Electric poles
        total_poles = await db.electric_poles.count_documents({})
        
        # In-process bookings
        in_process = await db.bookings.count_documents({"status": "Pending"})
        
        return {
            "total_hoardings": total_hoardings,
            "available_hoardings": available_hoardings,
            "booked_hoardings": booked_hoardings,
            "maintenance_hoardings": maintenance_hoardings,
            "in_process": in_process,
            "total_electric_poles": total_poles or 475,
            "category_breakdown": {
                "premium": premium_count,
                "standard": standard_count,
                "normal": normal_count,
                "economy": economy_count
            },
            "monthly_revenue": monthly_revenue,
            "yearly_revenue": total_revenue,
            "revenue_growth": 12.5  # Mock percentage
        }
    except Exception as e:
        logger.error(f"Admin stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/recent-bookings")
async def get_recent_bookings(user: dict = Depends(get_current_user)):
    """Get recent bookings for admin"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    bookings = await db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    
    # Enrich with user and hoarding info
    for booking in bookings:
        user_doc = await db.users.find_one({"user_id": booking["user_id"]}, {"_id": 0, "name": 1, "email": 1})
        hoarding_doc = await db.hoardings.find_one({"hoarding_id": booking["hoarding_id"]}, {"_id": 0, "title": 1, "location": 1})
        booking["user_name"] = user_doc.get("name") if user_doc else "Unknown"
        booking["hoarding_title"] = hoarding_doc.get("title") if hoarding_doc else "Unknown"
    
    return {"bookings": bookings}

@api_router.get("/admin/revenue")
async def get_revenue_by_month(month: Optional[int] = None, year: Optional[int] = None, user: dict = Depends(get_current_user)):
    """Get revenue filtered by month and year"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Default to current month/year if not provided
    now = datetime.now(timezone.utc)
    target_month = month or now.month
    target_year = year or now.year
    
    # Get all confirmed bookings
    all_bookings = await db.bookings.find({"status": {"$in": ["Confirmed", "Completed"]}}, {"_id": 0}).to_list(1000)
    
    # Filter by month and year
    filtered_bookings = []
    for booking in all_bookings:
        booking_date = datetime.fromisoformat(booking["created_at"])
        if booking_date.month == target_month and booking_date.year == target_year:
            filtered_bookings.append(booking)
    
    revenue = sum(b["amount"] for b in filtered_bookings)
    
    return {
        "month": target_month,
        "year": target_year,
        "revenue": revenue,
        "booking_count": len(filtered_bookings),
        "bookings": filtered_bookings
    }

@api_router.get("/admin/hoarding-requests")
async def get_hoarding_requests(user: dict = Depends(get_current_user)):
    """Get all hoarding requests (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    requests = await db.hoarding_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"requests": requests}

@api_router.post("/admin/approve-hoarding/{request_id}")
async def approve_hoarding_request(request_id: str, user: dict = Depends(get_current_user)):
    """Approve hoarding request and create hoarding"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get request
    request_doc = await db.hoarding_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request_doc["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Generate unique hoarding ID
    # Format: APKKD#### (AP = Andhra Pradesh, KKD = Kakinada)
    last_hoarding = await db.hoardings.find_one({}, {"_id": 0, "hoarding_id": 1}, sort=[("hoarding_id", -1)])
    
    if last_hoarding and last_hoarding["hoarding_id"].startswith("APKKD"):
        # Extract number and increment
        last_num = int(last_hoarding["hoarding_id"][5:])
        new_num = last_num + 1
        hoarding_id = f"APKKD{new_num:04d}"
    else:
        # Start from APKKD0050 (after existing 49)
        hoarding_id = f"APKKD0050"
    
    # Create hoarding from request data
    hoarding_data = request_doc["hoarding_data"]
    hoarding_data["hoarding_id"] = hoarding_id
    hoarding_data["status"] = "Available"
    hoarding_data["images"] = ["https://images.pexels.com/photos/6684281/pexels-photo-6684281.jpeg"]
    hoarding_data["created_at"] = datetime.now(timezone.utc).isoformat()
    hoarding_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Insert hoarding
    await db.hoardings.insert_one(hoarding_data)
    
    # Update request status
    await db.hoarding_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "Approved",
            "hoarding_id": hoarding_id,
            "approved_by": user["user_id"],
            "approved_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Hoarding request approved", "hoarding_id": hoarding_id}

@api_router.post("/admin/reject-hoarding/{request_id}")
async def reject_hoarding_request(request_id: str, reason: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Reject hoarding request"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get request
    request_doc = await db.hoarding_requests.find_one({"request_id": request_id}, {"_id": 0})
    if not request_doc:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if request_doc["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Request already processed")
    
    # Update request status
    await db.hoarding_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": "Rejected",
            "rejected_by": user["user_id"],
            "rejection_reason": reason or "Not specified",
            "rejected_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Hoarding request rejected"}

# ============= AGENT ROUTES =============

@api_router.get("/agent/hoardings")
async def get_agent_hoardings(user: dict = Depends(get_current_user)):
    """Get hoardings for agent (maintenance view)"""
    if user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    
    # Get all hoardings (in production, filter by assigned agent)
    hoardings = await db.hoardings.find({}, {"_id": 0}).to_list(1000)
    return {"hoardings": hoardings}

@api_router.post("/agent/maintenance")
async def update_maintenance(req: MaintenanceUpdateRequest, user: dict = Depends(get_current_user)):
    """Update maintenance status"""
    if user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    
    # Update hoarding status
    await db.hoardings.update_one(
        {"hoarding_id": req.hoarding_id},
        {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Create maintenance log
    log_data = {
        "log_id": f"LOG_{uuid.uuid4().hex[:10].upper()}",
        "hoarding_id": req.hoarding_id,
        "agent_id": user["user_id"],
        "status": req.status,
        "notes": req.notes,
        "images": req.images or [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.maintenance_logs.insert_one(log_data)
    
    return {"message": "Maintenance updated successfully", "log": log_data}

@api_router.get("/agent/maintenance/{hoarding_id}")
async def get_maintenance_logs(hoarding_id: str, user: dict = Depends(get_current_user)):
    """Get maintenance logs for a hoarding"""
    if user["role"] not in ["agent", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    logs = await db.maintenance_logs.find({"hoarding_id": hoarding_id}, {"_id": 0}).to_list(100)
    return {"logs": logs}

@api_router.post("/agent/hoarding-request")
async def request_new_hoarding(req: HoardingRequestModel, user: dict = Depends(get_current_user)):
    """Agent requests to add new hoarding (requires admin approval)"""
    if user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    
    # Generate request ID
    request_id = f"REQ_{uuid.uuid4().hex[:10].upper()}"
    
    # Create request
    request_data = {
        "request_id": request_id,
        "agent_id": user["user_id"],
        "agent_name": user["name"],
        "hoarding_data": req.dict(),
        "status": "Pending",  # Pending, Approved, Rejected
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.hoarding_requests.insert_one(request_data)
    
    return {"message": "Hoarding request submitted successfully", "request_id": request_id, "status": "Pending"}

@api_router.get("/agent/my-requests")
async def get_my_requests(user: dict = Depends(get_current_user)):
    """Get agent's hoarding requests"""
    if user["role"] != "agent":
        raise HTTPException(status_code=403, detail="Agent access required")
    
    requests = await db.hoarding_requests.find({"agent_id": user["user_id"]}, {"_id": 0}).to_list(100)
    return {"requests": requests}

@api_router.delete("/agent/hoarding/{hoarding_id}")
async def delete_hoarding(hoarding_id: str, user: dict = Depends(get_current_user)):
    """Agent deletes a hoarding"""
    if user["role"] not in ["agent", "admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if hoarding exists and not booked
    hoarding = await db.hoardings.find_one({"hoarding_id": hoarding_id}, {"_id": 0})
    if not hoarding:
        raise HTTPException(status_code=404, detail="Hoarding not found")
    
    if hoarding["status"] == "Booked":
        raise HTTPException(status_code=400, detail="Cannot delete booked hoarding")
    
    # Delete hoarding
    await db.hoardings.delete_one({"hoarding_id": hoarding_id})
    
    return {"message": "Hoarding deleted successfully"}

# ============= AI ROUTES =============

@api_router.post("/ai/chat")
async def ai_chatbot(req: ChatRequest, user: dict = Depends(get_current_user)):
    """AI Chatbot for assistance"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    session_id = req.session_id or f"chat_{user['user_id']}_{uuid.uuid4().hex[:8]}"
    
    # Initialize chat
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message="You are AdGrid Assistant, helping users with billboard/hoarding bookings, pricing, and information. Be helpful and concise."
    )
    chat.with_model("openai", "gpt-5.2")
    
    # Send message
    user_message = UserMessage(text=req.message)
    response = await chat.send_message(user_message)
    
    # Save to database
    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_id": user["user_id"],
        "message": req.message,
        "response": response,
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    
    return {"response": response, "session_id": session_id}

@api_router.post("/ai/generate-poster")
async def generate_poster(req: PosterGenerateRequest, user: dict = Depends(get_current_user)):
    """Generate AI poster for advertising"""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="AI service not configured")
    
    # Use OpenAI DALL-E for image generation
    from openai import AsyncOpenAI
    client_openai = AsyncOpenAI(api_key=EMERGENT_LLM_KEY)
    
    try:
        response = await client_openai.images.generate(
            model="dall-e-3",
            prompt=req.prompt,
            size="1024x1024",
            quality="standard",
            n=1
        )
        
        image_url = response.data[0].url
        
        # Save generation record
        await db.poster_generations.insert_one({
            "user_id": user["user_id"],
            "hoarding_id": req.hoarding_id,
            "prompt": req.prompt,
            "image_url": image_url,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"image_url": image_url, "prompt": req.prompt}
    except Exception as e:
        logger.error(f"Poster generation error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate poster: {str(e)}")

# ============= NOC ROUTES =============

@api_router.get("/noc/{booking_id}/download")
async def download_noc(booking_id: str, user: dict = Depends(get_current_user)):
    """Generate and download NOC certificate"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["user_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not booking.get("noc_number"):
        raise HTTPException(status_code=400, detail="NOC not generated yet. Complete payment first.")
    
    # Generate QR code for NOC
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(f"NOC:{booking['noc_number']}:BKG:{booking_id}")
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img_io = io.BytesIO()
    img.save(img_io, 'PNG')
    img_io.seek(0)
    
    return StreamingResponse(img_io, media_type="image/png", headers={
        "Content-Disposition": f"attachment; filename=NOC_{booking['noc_number']}.png"
    })

# ============= COMPLAINT & FEEDBACK ROUTES =============

@api_router.post("/complaints")
async def submit_complaint(req: ComplaintRequest, user: dict = Depends(get_current_user)):
    """Submit a complaint"""
    complaint_id = f"CMP_{uuid.uuid4().hex[:10].upper()}"
    complaint_data = {
        "complaint_id": complaint_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "user_email": user["email"],
        "subject": req.subject,
        "description": req.description,
        "category": req.category,
        "status": "Open",  # Open, In Progress, Resolved, Closed
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.complaints.insert_one(complaint_data)
    
    return {"message": "Complaint submitted successfully", "complaint_id": complaint_id}

@api_router.get("/complaints")
async def get_complaints(user: dict = Depends(get_current_user)):
    """Get user complaints or all complaints for admin"""
    if user["role"] == "admin":
        complaints = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    else:
        complaints = await db.complaints.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    return {"complaints": complaints}

@api_router.post("/feedback")
async def submit_feedback(req: FeedbackRequest, user: dict = Depends(get_current_user)):
    """Submit feedback"""
    feedback_id = f"FDB_{uuid.uuid4().hex[:10].upper()}"
    feedback_data = {
        "feedback_id": feedback_id,
        "user_id": user["user_id"],
        "user_name": user["name"],
        "rating": req.rating,
        "comment": req.comment,
        "category": req.category,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.feedback.insert_one(feedback_data)
    
    return {"message": "Thank you for your feedback!", "feedback_id": feedback_id}

@api_router.get("/feedback")
async def get_feedback(user: dict = Depends(get_current_user)):
    """Get all feedback (Admin only)"""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    feedback = await db.feedback.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"feedback": feedback}

# ============= ROOT ROUTE =============

@api_router.get("/")
async def root():
    return {"message": "AdGrid API - Smart Billboard Management System"}

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
