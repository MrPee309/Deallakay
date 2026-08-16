"""Seed demo sellers and products for DealLakay. Idempotent-ish: clears demo products first."""
import os
import uuid
import re
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pathlib import Path
from pymongo import MongoClient

load_dotenv(Path(__file__).parent / ".env")
import auth as auth_lib

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]


def now_iso(mins_ago=0):
    return (datetime.now(timezone.utc) - timedelta(minutes=mins_ago)).isoformat()


def slugify(t):
    t = re.sub(r"[^\w\s-]", "", t.lower()).strip()
    return re.sub(r"[\s_-]+", "-", t)[:60]


IMG = {
    "phone": [
        "https://images.unsplash.com/photo-1616410011236-7a42121dd981?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1591337676887-a217a6970a8a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    ],
    "laptop": [
        "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1531297484001-80022131f5a1?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    ],
    "parts": [
        "https://images.unsplash.com/photo-1632749042303-7f7a18ed6ff0?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1697952431907-8542919a16b3?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    ],
    "accessories": [
        "https://images.unsplash.com/photo-1619972899619-d94cb196b37a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1574920162043-b872873f19c8?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1677145503755-5a8c581671fe?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
        "https://images.unsplash.com/photo-1566793474285-2decf0fc182a?crop=entropy&cs=srgb&fm=jpg&q=85&w=800",
    ],
}

SELLERS = [
    {"username": "petertech", "full_name": "Peter Joseph", "email": "peter@demo.com", "store": "Peter Tech Store", "verified": True, "dep": "Ouest", "city": "Pétion-Ville", "wa": "+50937112233"},
    {"username": "marieshop", "full_name": "Marie Lucien", "email": "marie@demo.com", "store": "", "verified": False, "dep": "Nord", "city": "Cap-Haïtien", "wa": "+50938224455"},
    {"username": "techkapfix", "full_name": "Jean Baptiste", "email": "jean@demo.com", "store": "KapFix Repair", "verified": True, "dep": "Ouest", "city": "Delmas", "wa": "+50934556677"},
]

PRODUCTS = [
    ("phone", "iPhone", "iPhone 13 Pro Max 256GB", 165000, "Like New", {"model": "iPhone 13 Pro Max", "storage": "256GB", "color": "Graphite", "battery_health": "91%", "carrier": "Unlocked", "unlocked": "Unlocked", "activation_lock": "Off / Clean", "physical_condition": "Ekselan", "functional_condition": "Working"}),
    ("phone", "Samsung", "Samsung Galaxy S22 Ultra 128GB", 98000, "Good", {"model": "Galaxy S22 Ultra", "storage": "128GB", "color": "Phantom Black", "battery_health": "88%", "carrier": "Unlocked", "unlocked": "Unlocked", "activation_lock": "Off / Clean", "functional_condition": "Working"}),
    ("phone", "iPhone", "iPhone 12 64GB Blan", 62000, "Good", {"model": "iPhone 12", "storage": "64GB", "color": "White", "battery_health": "84%", "carrier": "Digicel", "unlocked": "Unlocked", "functional_condition": "Working"}),
    ("phone", "Tecno", "Tecno Camon 20 Pro", 28000, "New", {"model": "Camon 20 Pro", "storage": "256GB", "color": "Black", "unlocked": "Unlocked", "functional_condition": "Working"}),
    ("laptop", "MacBook", "MacBook Pro 14\" M1 Pro 512GB", 245000, "Like New", {"model": "MacBook Pro 14", "processor": "Apple M1 Pro", "ram": "16GB", "storage_type": "SSD", "storage_capacity": "512GB", "screen_size": "14\"", "os": "macOS Sonoma", "charger_included": "Wi", "functional_condition": "Working"}),
    ("laptop", "HP", "HP EliteBook 840 G7 i7", 78000, "Good", {"model": "EliteBook 840 G7", "processor": "Intel Core i7", "cpu_generation": "10th Gen", "ram": "16GB", "storage_type": "SSD", "storage_capacity": "512GB", "screen_size": "14\"", "os": "Windows 11", "charger_included": "Wi", "functional_condition": "Working"}),
    ("laptop", "Dell", "Dell XPS 13 i5 8GB", 92000, "Good", {"model": "XPS 13", "processor": "Intel Core i5", "cpu_generation": "11th Gen", "ram": "8GB", "storage_type": "SSD", "storage_capacity": "256GB", "screen_size": "13.3\"", "os": "Windows 11", "charger_included": "Wi", "functional_condition": "Working"}),
    ("parts", "iPhone Parts", "iPhone 12 Screen OLED Orijinal", 12500, "New", {"brand": "Apple", "compatible_model": "iPhone 12 / 12 Pro", "originality": "Original", "working_status": "Working"}, 15),
    ("parts", "Batteries", "Batri iPhone 11 - Konpatib", 3500, "New", {"brand": "Generic", "compatible_model": "iPhone 11", "originality": "Compatible", "working_status": "Working"}, 30),
    ("parts", "SSD", "SSD NVMe 1TB Samsung 980", 9800, "New", {"brand": "Samsung", "compatible_model": "Laptop / Desktop", "originality": "Original", "working_status": "Working"}, 8),
    ("accessories", "Earbuds", "AirPods Pro 2nd Gen", 18500, "New", {"brand": "Apple", "model": "AirPods Pro 2", "compatibility": "iOS / Android", "new_used": "New"}, 12),
    ("accessories", "Chargers", "Chajè USB-C 20W Fast Charge", 1800, "New", {"brand": "Anker", "compatibility": "Universal", "new_used": "New"}, 50),
    ("accessories", "Smart Watches", "Apple Watch Series 8 45mm", 42000, "Like New", {"brand": "Apple", "model": "Series 8", "compatibility": "iPhone", "new_used": "Used"}),
]


def run():
    # clear previous demo data
    demo_ids = [u["username"] for u in SELLERS]
    existing = list(db.users.find({"username": {"$in": demo_ids}}))
    for u in existing:
        db.products.delete_many({"seller_id": u["id"]})
        db.seller_profiles.delete_many({"user_id": u["id"]})
    db.users.delete_many({"username": {"$in": demo_ids}})

    seller_ids = {}
    for s in SELLERS:
        uid = str(uuid.uuid4())
        seller_ids[s["username"]] = uid
        db.users.insert_one({
            "id": uid, "full_name": s["full_name"], "username": s["username"], "email": s["email"],
            "phone": s["wa"], "password_hash": auth_lib.hash_password("demo123"),
            "country": "Ayiti", "department": s["dep"], "city": s["city"], "role": "user",
            "status": "active", "email_verified": True, "phone_verified": True, "is_seller": True,
            "avatar": "", "token_version": 0, "terms_accepted": True, "created_at": now_iso(60 * 24 * 30),
        })
        db.seller_profiles.insert_one({
            "id": str(uuid.uuid4()), "user_id": uid, "status": "active", "seller_verified": s["verified"],
            "whatsapp_enabled": True, "whatsapp_number": s["wa"], "show_phone": True, "show_location": True,
            "bio": "", "store_name": s["store"], "store_description": "Vandè teknoloji ki serye.",
            "rating": 0, "review_count": 0, "followers": 0, "date_joined": now_iso(60 * 24 * 30),
        })

    usernames = list(seller_ids.keys())
    for i, prod in enumerate(PRODUCTS):
        cat_type, sub, title, price, cond = prod[0], prod[1], prod[2], prod[3], prod[4]
        specs = prod[5]
        qty = prod[6] if len(prod) > 6 else 1
        seller_username = usernames[i % len(usernames)]
        sid = seller_ids[seller_username]
        seller = db.users.find_one({"id": sid})
        imgs = IMG[cat_type]
        pid = str(uuid.uuid4())
        db.products.insert_one({
            "id": pid, "slug": f"{slugify(title)}-{pid[:6]}", "seller_id": sid, "seller_username": seller_username,
            "category": cat_type, "subcategory": sub, "title": title, "description": f"{title} an bon eta. Kontakte m pou plis enfòmasyon. Pri negosyab.",
            "price": price, "currency": "HTG", "quantity": qty, "condition": cond,
            "department": seller["department"], "city": seller["city"], "neighborhood": "",
            "specs": specs, "images": [imgs[i % len(imgs)], imgs[(i + 1) % len(imgs)]], "main_image_index": 0,
            "imei": "354879061234567" if cat_type == "phone" else "", "imei_verified": False,
            "status": "active", "views": (i * 37 + 12), "favorites_count": (i * 3) % 11,
            "created_at": now_iso(i * 120), "updated_at": now_iso(i * 120),
        })

    print(f"Seeded {len(SELLERS)} sellers and {len(PRODUCTS)} products.")


if __name__ == "__main__":
    run()
