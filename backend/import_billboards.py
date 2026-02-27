"""Import billboard data from JSON file"""
import asyncio
import json
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

IMAGES = [
    "https://images.pexels.com/photos/6684281/pexels-photo-6684281.jpeg",
    "https://images.unsplash.com/photo-1762417582263-7f423d344b77",
    "https://images.unsplash.com/photo-1759548845680-8fb15e1f95e1",
    "https://images.pexels.com/photos/19317897/pexels-photo-19317897.jpeg"
]

async def import_billboards():
    print("Starting billboard import...")
    
    # Load JSON data
    with open('/app/backend/billboard_data.json', 'r') as f:
        billboards_json = json.load(f)
    
    print(f"Found {len(billboards_json)} billboards in JSON")
    
    # Clear existing hoardings
    await db.hoardings.delete_many({})
    print("Cleared existing hoardings")
    
    # Transform and insert
    hoardings_data = []
    
    for i, billboard in enumerate(billboards_json):
        # Map status
        if i % 10 < 7:
            status = "Available"
        elif i % 10 < 9:
            status = "Booked"
        else:
            status = "Maintenance"
        
        # Determine visibility based on category
        if billboard['category'] == 'Premium':
            visibility = 'High'
        elif billboard['category'] == 'Standard':
            visibility = 'Medium'
        else:
            visibility = 'Low'
        
        hoarding = {
            "hoarding_id": billboard['UIB'],
            "title": billboard['title'],
            "location": billboard['description'],
            "area": billboard['location']['area'],
            "city": billboard['location']['city'],
            "district": billboard['location']['district'],
            "country": billboard['location']['country'],
            "coordinates": billboard['location']['coordinates'],
            "size": billboard['dimensions'],
            "category": billboard['category'],
            "status": status,
            "price_per_day": float(billboard['pricing']['baseprice']),
            "images": [IMAGES[i % len(IMAGES)]],
            "visibility_level": visibility,
            "description": billboard['description'],
            "type": billboard['type'],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        hoardings_data.append(hoarding)
    
    await db.hoardings.insert_many(hoardings_data)
    print(f"Successfully imported {len(hoardings_data)} billboards!")
    
    # Print stats
    stats = {
        "total": len(hoardings_data),
        "available": sum(1 for h in hoardings_data if h['status'] == 'Available'),
        "booked": sum(1 for h in hoardings_data if h['status'] == 'Booked'),
        "maintenance": sum(1 for h in hoardings_data if h['status'] == 'Maintenance'),
        "premium": sum(1 for h in hoardings_data if h['category'] == 'Premium'),
        "standard": sum(1 for h in hoardings_data if h['category'] == 'Standard'),
        "economy": sum(1 for h in hoardings_data if h['category'] == 'Economy'),
    }
    
    print("\n=== IMPORT STATISTICS ===")
    print(f"Total Hoardings: {stats['total']}")
    print(f"Available: {stats['available']}")
    print(f"Booked: {stats['booked']}")
    print(f"Maintenance: {stats['maintenance']}")
    print(f"Premium: {stats['premium']}")
    print(f"Standard: {stats['standard']}")
    print(f"Economy: {stats['economy']}")
    print("========================\n")

if __name__ == "__main__":
    asyncio.run(import_billboards())
