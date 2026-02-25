"""Seed database with sample data"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path
import uuid

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Sample data
AREAS = ["Downtown", "Airport Road", "Highway Exit 12", "Business District", "Mall Road", "Stadium Area"]
CATEGORIES = ["Premium", "Normal", "Economy"]
LOCATIONS = [
    {"area": "Downtown", "location": "Main Street & 5th Ave", "lat": 17.3850, "lng": 78.4867},
    {"area": "Airport Road", "location": "Terminal 1 Entry", "lat": 17.2403, "lng": 78.4294},
    {"area": "Highway Exit 12", "location": "NH44 Junction", "lat": 17.4400, "lng": 78.3489},
    {"area": "Business District", "location": "Tech Park Entrance", "lat": 17.4485, "lng": 78.3908},
    {"area": "Mall Road", "location": "Shopping Complex North", "lat": 17.4239, "lng": 78.4738},
    {"area": "Stadium Area", "location": "Sports Complex Gate 2", "lat": 17.4326, "lng": 78.4071},
]

IMAGES = [
    "https://images.pexels.com/photos/6684281/pexels-photo-6684281.jpeg",
    "https://images.unsplash.com/photo-1762417582263-7f423d344b77",
    "https://images.unsplash.com/photo-1759548845680-8fb15e1f95e1",
    "https://images.pexels.com/photos/19317897/pexels-photo-19317897.jpeg"
]

async def seed_database():
    print("Starting database seeding...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.hoardings.delete_many({})
    await db.bookings.delete_many({})
    await db.electric_poles.delete_many({})
    await db.maintenance_logs.delete_many({})
    print("Cleared existing data")
    
    # Create admin user
    admin_id = f"user_{uuid.uuid4().hex[:12]}"
    admin_data = {
        "user_id": admin_id,
        "email": "admin@adgrid.gov",
        "name": "Admin User",
        "role": "admin",
        "aadhaar_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_data)
    print(f"Created admin user: admin@adgrid.gov")
    
    # Create sample customer
    customer_id = f"user_{uuid.uuid4().hex[:12]}"
    customer_data = {
        "user_id": customer_id,
        "email": "customer@example.com",
        "name": "John Advertiser",
        "role": "customer",
        "phone": "+91-9876543210",
        "aadhaar_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(customer_data)
    print(f"Created customer: customer@example.com")
    
    # Create sample agent
    agent_id = f"user_{uuid.uuid4().hex[:12]}"
    agent_data = {
        "user_id": agent_id,
        "email": "agent@adgrid.gov",
        "name": "Field Agent",
        "role": "agent",
        "phone": "+91-9876543211",
        "aadhaar_verified": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(agent_data)
    print(f"Created agent: agent@adgrid.gov")
    
    # Create hoardings
    hoarding_count = 274
    hoardings_data = []
    
    for i in range(hoarding_count):
        loc = LOCATIONS[i % len(LOCATIONS)]
        category = CATEGORIES[i % 3]
        
        # Pricing based on category
        if category == "Premium":
            price = 500.0 + (i * 10)
            size = "40x20 ft"
            visibility = "High"
        elif category == "Normal":
            price = 250.0 + (i * 5)
            size = "30x15 ft"
            visibility = "Medium"
        else:
            price = 100.0 + (i * 2)
            size = "20x10 ft"
            visibility = "Low"
        
        # Status distribution: 60% Available, 30% Booked, 10% Maintenance
        if i % 10 < 6:
            status = "Available"
        elif i % 10 < 9:
            status = "Booked"
        else:
            status = "Maintenance"
        
        hoarding = {
            "hoarding_id": f"HRD_{uuid.uuid4().hex[:10].upper()}",
            "title": f"{category} Billboard - {loc['area']} #{i+1}",
            "location": loc["location"],
            "area": loc["area"],
            "coordinates": {"lat": loc["lat"] + (i * 0.001), "lng": loc["lng"] + (i * 0.001)},
            "size": size,
            "category": category,
            "status": status,
            "price_per_day": price,
            "images": [IMAGES[i % len(IMAGES)]],
            "visibility_level": visibility,
            "description": f"High-traffic {category.lower()} billboard in {loc['area']}. Perfect for brand visibility.",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        hoardings_data.append(hoarding)
    
    await db.hoardings.insert_many(hoardings_data)
    print(f"Created {hoarding_count} hoardings")
    
    # Create electric poles
    poles_data = []
    for i in range(475):
        loc = LOCATIONS[i % len(LOCATIONS)]
        pole = {
            "pole_id": f"POLE_{uuid.uuid4().hex[:10].upper()}",
            "location": f"{loc['location']} - Pole {i+1}",
            "coordinates": {"lat": loc["lat"] + (i * 0.0005), "lng": loc["lng"] + (i * 0.0005)},
            "status": "Active" if i % 20 != 0 else "Maintenance",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        poles_data.append(pole)
    
    await db.electric_poles.insert_many(poles_data)
    print(f"Created 475 electric poles")
    
    # Create sample bookings
    booked_hoardings = [h for h in hoardings_data if h["status"] == "Booked"]
    bookings_data = []
    
    for i, hoarding in enumerate(booked_hoardings[:30]):
        booking = {
            "booking_id": f"BKG_{uuid.uuid4().hex[:10].upper()}",
            "user_id": customer_id,
            "hoarding_id": hoarding["hoarding_id"],
            "start_date": "2026-02-01",
            "end_date": "2026-02-28",
            "duration_days": 27,
            "amount": hoarding["price_per_day"] * 27,
            "status": "Confirmed",
            "payment_status": "Paid",
            "payment_id": f"pi_{uuid.uuid4().hex[:16]}",
            "noc_number": f"NOC_{uuid.uuid4().hex[:10].upper()}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        bookings_data.append(booking)
    
    if bookings_data:
        await db.bookings.insert_many(bookings_data)
        print(f"Created {len(bookings_data)} sample bookings")
    
    print("Database seeding completed!")
    print("\n=== TEST CREDENTIALS ===")
    print("Admin: admin@adgrid.gov")
    print("Customer: customer@example.com")
    print("Agent: agent@adgrid.gov")
    print("========================\n")

if __name__ == "__main__":
    asyncio.run(seed_database())
