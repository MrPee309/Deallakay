
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import re
import secrets
import logging

import auth as auth_lib
import email_service
from seed_data import CATEGORIES, DEPARTMENTS, DEFAULT_SETTINGS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deallakay")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="DealLakay API")
api = APIRouter(prefix="/api")

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
# Only expose verification/reset links directly in API responses when explicitly
# enabled for local development. Must never be "true" in production, since it lets
# anyone bypass email verification / take over accounts via password reset.
DEMO_MODE = os.environ.get("DEMO_MODE", "false").strip().lower() == "true"

NO_ID = {"_id": 0}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:60] or "item"


# ---------------- Models ----------------
class RegisterIn(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str
    country: str = "Ayiti"
    department: str
    city: str
    accept_terms: bool


class LoginIn(BaseModel):
    username: str
    password: str


class ResendIn(BaseModel):
    email: EmailStr


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str


class BecomeSellerIn(BaseModel):
    accept_seller_terms: bool
    accept_marketplace_rules: bool


class SellerSettingsIn(BaseModel):
    whatsapp_enabled: Optional[bool] = None
    whatsapp_number: Optional[str] = None
    show_phone: Optional[bool] = None
    show_location: Optional[bool] = None
    bio: Optional[str] = None
    store_name: Optional[str] = None
    store_description: Optional[str] = None
    avatar: Optional[str] = None


class ProductIn(BaseModel):
    category: str
    subcategory: Optional[str] = None
    title: str
    description: str = ""
    price: float
    quantity: int = 1
    condition: str = "Used"
    department: str
    city: str
    neighborhood: Optional[str] = ""
    specs: Dict[str, Any] = {}
    images: List[str] = []
    main_image_index: int = 0
    imei: Optional[str] = ""
    status: str = "active"


class MessageIn(BaseModel):
    content: str


class ConversationIn(BaseModel):
    product_id: str


class ReviewIn(BaseModel):
    seller_id: str
    rating: int
    comment: str = ""


class ReportIn(BaseModel):
    target_type: str
    target_id: str
    reason: str
    description: str = ""


class CategoryIn(BaseModel):
    name_ht: str
    name_fr: str = ""
    name_en: str = ""
    icon: str = "tag"
    type: str = "accessories"


class SubcategoryIn(BaseModel):
    name: str


class SettingsIn(BaseModel):
    site_branding: Optional[Dict[str, Any]] = None
    listing_mode: Optional[str] = None
    safety_messages: Optional[List[str]] = None


# ---------------- Auth dependency ----------------
async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Ou pa konekte.")
    try:
        payload = auth_lib.decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session ou ekspire. Konekte ankÃ².")
    user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
    if not user:
        raise HTTPException(status_code=401, detail="ItilizatÃ¨ pa jwenn.")
    if payload.get("tv", 0) != user.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Session ou fÃ¨men. Konekte ankÃ².")
    if user.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail="Kont ou sispann. Kontakte sipÃ².")
    user.pop("password_hash", None)
    return user


async def get_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="AksÃ¨ admin sÃ¨lman.")
    return user


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "full_name": u.get("full_name"),
        "username": u.get("username"),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "country": u.get("country"),
        "department": u.get("department"),
        "city": u.get("city"),
        "role": u.get("role"),
        "email_verified": u.get("email_verified", False),
        "phone_verified": u.get("phone_verified", False),
        "is_seller": u.get("is_seller", False),
        "avatar": u.get("avatar", ""),
        "created_at": u.get("created_at"),
    }


# ---------------- WebSocket manager ----------------
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id, [])
        if ws in conns:
            conns.remove(ws)

    async def send(self, user_id: str, data: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


async def create_notification(user_id: str, ntype: str, message: str, link: str = ""):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "message": message,
        "link": link,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(dict(notif))
    await manager.send(user_id, {"event": "notification", "data": {k: v for k, v in notif.items() if k != "_id"}})


# ---------------- Meta endpoints ----------------
@api.get("/")
async def root():
    return {"message": "DealLakay API"}


@api.get("/config")
async def get_config():
    s = await db.settings.find_one({"id": "site-settings"}, NO_ID)
    if not s:
        s = DEFAULT_SETTINGS
    return {"site_branding": s["site_branding"], "listing_mode": s.get("listing_mode", "auto"), "safety_messages": s.get("safety_messages", [])}


@api.get("/categories")
async def get_categories():
    return await db.categories.find({}, NO_ID).sort("order", 1).to_list(100)


@api.get("/locations")
async def get_locations():
    return await db.locations.find({}, NO_ID).to_list(100)


# ---------------- Auth endpoints ----------------
@api.post("/auth/register")
async def register(data: RegisterIn):
    if not data.accept_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte Terms & Conditions.")
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Modpas yo pa menm.")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Modpas la dwe gen omwen 6 karaktÃ¨.")
    email = data.email.lower().strip()
    username = data.username.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sa a deja itilize.")
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Non itilizatÃ¨ sa a deja pran.")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "full_name": data.full_name.strip(),
        "username": username,
        "email": email,
        "phone": data.phone.strip(),
        "password_hash": auth_lib.hash_password(data.password),
        "country": data.country,
        "department": data.department,
        "city": data.city,
        "role": "user",
        "status": "active",
        "email_verified": False,
        "phone_verified": False,
        "is_seller": False,
        "avatar": "",
        "token_version": 0,
        "terms_accepted": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = secrets.token_urlsafe(32)
    await db.email_tokens.insert_one({
        "token": token, "user_id": uid, "type": "verify",
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    email_service.send_verification_email(email, data.full_name, link)
    resp = {"message": "Nou voye yon email verification. Verifye email ou avan ou konekte."}
    if DEMO_MODE:
        resp["demo_verification_link"] = link
    return resp


@api.get("/auth/verify-email")
async def verify_email(token: str):
    rec = await db.email_tokens.find_one({"token": token, "type": "verify"})
    if not rec:
        raise HTTPException(status_code=400, detail="Lyen verifikasyon an pa valab.")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lyen an ekspire. Mande yon nouvo.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_tokens.delete_one({"token": token})
    return {"message": "Email ou verifye! Ou ka konekte kounye a."}


@api.post("/auth/resend-verification")
async def resend_verification(data: ResendIn):
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=404, detail="Email pa jwenn.")
    if user.get("email_verified"):
        return {"message": "Email deja verifye."}
    await db.email_tokens.delete_many({"user_id": user["id"], "type": "verify"})
    token = secrets.token_urlsafe(32)
    await db.email_tokens.insert_one({
        "token": token, "user_id": user["id"], "type": "verify",
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    email_service.send_verification_email(user["email"], user["full_name"], link)
    resp = {"message": "Nou voye email verification an ankÃ²."}
    if DEMO_MODE:
        resp["demo_verification_link"] = link
    return resp


@api.post("/auth/login")
async def login(data: LoginIn):
    username = data.username.lower().strip()
    user = await db.users.find_one({"username": username})
    if not user:
        user = await db.users.find_one({"email": username})
    if not user or not auth_lib.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Non itilizatÃ¨ oswa modpas pa kÃ²rÃ¨k.")
    if user.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail="Kont ou sispann. Kontakte sipÃ².")
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Verifye email ou avan ou konekte.")
    token = auth_lib.create_access_token(user["id"], user["username"], user["role"], user.get("token_version", 0))
    return {"access_token": token, "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.post("/auth/logout-all")
async def logout_all(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$inc": {"token_version": 1}})
    return {"message": "Tout sesyon fÃ¨men."}


@api.post("/auth/forgot-password")
async def forgot_password(data: ForgotIn):
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.email_tokens.insert_one({
            "token": token, "user_id": user["id"], "type": "reset",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        })
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        email_service.send_reset_email(user["email"], user["full_name"], link)
        resp = {"message": "Si email la egziste, nou voye yon lyen reset."}
        if DEMO_MODE:
            resp["demo_reset_link"] = link
        return resp
    return {"message": "Si email la egziste, nou voye yon lyen reset."}


@api.post("/auth/reset-password")
async def reset_password(data: ResetIn):
    rec = await db.email_tokens.find_one({"token": data.token, "type": "reset"})
    if not rec or datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lyen reset la pa valab oswa ekspire.")
    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Modpas la dwe gen omwen 6 karaktÃ¨.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": auth_lib.hash_password(data.password)}, "$inc": {"token_version": 1}})
    await db.email_tokens.delete_one({"token": data.token})
    return {"message": "Modpas chanje. Ou ka konekte kounye a."}


@api.post("/auth/verify-phone")
async def verify_phone(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"phone_verified": True}})
    return {"message": "TelefÃ²n ou verifye."}


# ---------------- Seller endpoints ----------------
@api.post("/seller/become")
async def become_seller(data: BecomeSellerIn, user: dict = Depends(get_current_user)):
    if not data.accept_seller_terms or not data.accept_marketplace_rules:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte rÃ¨g vandÃ¨ yo.")
    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email ou dwe verifye.")
    existing = await db.seller_profiles.find_one({"user_id": user["id"]})
    if not existing:
        await db.seller_profiles.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "status": "active",
            "seller_verified": False,
            "whatsapp_enabled": True,
            "whatsapp_number": user.get("phone", ""),
            "show_phone": True,
            "show_location": True,
            "bio": "",
            "store_name": "",
            "store_description": "",
            "rating": 0,
            "review_count": 0,
            "followers": 0,
            "date_joined": now_iso(),
        })
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_seller": True}})
    return {"message": "Ou se yon vandÃ¨ kounye a!", "status": "active"}


@api.get("/seller/profile")
async def my_seller_profile(user: dict = Depends(get_current_user)):
    prof = await db.seller_profiles.find_one({"user_id": user["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon vandÃ¨.")
    return prof


@api.put("/seller/settings")
async def update_seller_settings(data: SellerSettingsIn, user: dict = Depends(get_current_user)):
    prof = await db.seller_profiles.find_one({"user_id": user["id"]})
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon vandÃ¨.")
    updates = {k: v for k, v in data.model_dump().items() if v is not None and k != "avatar"}
    if updates:
        await db.seller_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    if data.avatar is not None:
        await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": data.avatar}})
    return {"message": "ParamÃ¨t anrejistre."}


@api.post("/seller/verify-request")
async def request_verification(user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=400, detail="Ou dwe yon vandÃ¨.")
    existing = await db.seller_verifications.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        return {"message": "Demann verifikasyon ou deja an atant."}
    await db.seller_verifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "status": "pending",
        "created_at": now_iso(),
    })
    return {"message": "Demann verifikasyon voye. Admin ap revize li."}


@api.get("/seller/dashboard")
async def seller_dashboard(user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=403, detail="Ou poko yon vandÃ¨.")
    sid = user["id"]
    active = await db.products.count_documents({"seller_id": sid, "status": {"$in": ["active", "pending"]}})
    sold = await db.products.count_documents({"seller_id": sid, "status": "sold"})
    drafts = await db.products.count_documents({"seller_id": sid, "status": "draft"})
    prods = await db.products.find({"seller_id": sid}, NO_ID).to_list(1000)
    views = sum(p.get("views", 0) for p in prods)
    favs = sum(p.get("favorites_count", 0) for p in prods)
    convs = await db.conversations.find({"seller_id": sid}, NO_ID).to_list(1000)
    unread = 0
    for c in convs:
        unread += await db.messages.count_documents({"conversation_id": c["id"], "sender_id": {"$ne": sid}, "read": False})
    prof = await db.seller_profiles.find_one({"user_id": sid}, NO_ID)
    return {
        "stats": {"active": active, "sold": sold, "drafts": drafts, "views": views, "favorites": favs, "messages": unread},
        "profile": prof,
    }


@api.get("/sellers/{username}")
async def public_seller(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="VandÃ¨ pa jwenn.")
    prof = await db.seller_profiles.find_one({"user_id": u["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="VandÃ¨ pa jwenn.")
    product_count = await db.products.count_documents({"seller_id": u["id"], "status": "active"})
    products = await db.products.find({"seller_id": u["id"], "status": "active"}, NO_ID).sort("created_at", -1).to_list(50)
    for p in products:
        p["images"] = p.get("images", [])[:1]
        p.pop("imei", None)
    return {
        "user": {"id": u["id"], "full_name": u["full_name"], "username": u["username"], "avatar": u.get("avatar", ""),
                 "department": u.get("department"), "city": u.get("city"), "created_at": u.get("created_at"),
                 "email_verified": u.get("email_verified"), "phone_verified": u.get("phone_verified"),
                 "phone": u.get("phone") if prof.get("show_phone") else None},
        "profile": prof,
        "product_count": product_count,
        "products": products,
    }


@api.get("/sellers/{username}/reviews")
async def seller_reviews(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="VandÃ¨ pa jwenn.")
    return await db.reviews.find({"seller_id": u["id"]}, NO_ID).sort("created_at", -1).to_list(200)


# ---------------- Product endpoints ----------------
def strip_private(p: dict, is_owner=False):
    p = {k: v for k, v in p.items() if k != "_id"}
    if not is_owner:
        p.pop("imei", None)
    return p


@api.post("/products")
async def create_product(data: ProductIn, user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=403, detail="Ou dwe yon vandÃ¨ pou vann.")
    if data.status not in ("active", "draft"):
        raise HTTPException(status_code=400, detail="Estati pa valab.")
    settings = await db.settings.find_one({"id": "site-settings"}, NO_ID)
    listing_mode = settings.get("listing_mode", "auto") if settings else "auto"
    status = data.status
    if status == "active" and listing_mode == "approval":
        status = "pending"
    pid = str(uuid.uuid4())
    slug = f"{slugify(data.title)}-{pid[:6]}"
    doc = {
        "id": pid,
        "slug": slug,
        "seller_id": user["id"],
        "seller_username": user["username"],
        "category": data.category,
        "subcategory": data.subcategory,
        "title": data.title.strip(),
        "description": data.description,
        "price": data.price,
        "currency": "HTG",
        "quantity": data.quantity,
        "condition": data.condition,
        "department": data.department,
        "city": data.city,
        "neighborhood": data.neighborhood,
        "specs": data.specs,
        "images": data.images[:10],
        "main_image_index": data.main_image_index,
        "imei": data.imei or "",
        "imei_verified": False,
        "status": status,
        "views": 0,
        "favorites_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.products.insert_one(doc)
    return strip_private(doc, is_owner=True)


@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    department: Optional[str] = None,
    city: Optional[str] = None,
    condition: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    verified_seller: Optional[bool] = None,
    seller_id: Optional[str] = None,
    sort: str = "newest",
    page: int = 1,
    limit: int = 20,
):
    query: Dict[str, Any] = {"status": "active"}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if department:
        query["department"] = department
    if city:
        query["city"] = city
    if condition:
        query["condition"] = condition
    if seller_id:
        query["seller_id"] = seller_id
    if min_price is not None or max_price is not None:
        pr: Dict[str, Any] = {}
        if min_price is not None:
            pr["$gte"] = min_price
        if max_price is not None:
            pr["$lte"] = max_price
        query["price"] = pr
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": rx}, {"description": rx}, {"seller_username": rx}, {"subcategory": rx}]
    if verified_seller:
        verified_ids = await db.seller_profiles.find({"seller_verified": True}, {"user_id": 1}).to_list(1000)
        query["seller_id"] = {"$in": [v["user_id"] for v in verified_ids]}

    sort_map = {
        "newest": [("created_at", -1)],
        "oldest": [("created_at", 1)],
        "price_low": [("price", 1)],
        "price_high": [("price", -1)],
        "most_viewed": [("views", -1)],
        "most_popular": [("favorites_count", -1)],
    }
    sort_by = sort_map.get(sort, [("created_at", -1)])
    total = await db.products.count_documents(query)
    skip = max(0, (page - 1) * limit)
    products = await db.products.find(query, NO_ID).sort(sort_by).skip(skip).limit(limit).to_list(limit)
    for p in products:
        p.pop("imei", None)
        p["images"] = p.get("images", [])[:1]
    return {"products": products, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@api.get("/my-products")
async def my_products(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"seller_id": user["id"]}
    if status:
        query["status"] = status
    products = await db.products.find(query, NO_ID).sort("created_at", -1).to_list(500)
    for p in products:
        p["images"] = p.get("images", [])[:1]
    return products


@api.get("/products/{identifier}")
async def get_product(identifier: str, request: Request):
    p = await db.products.find_one({"$or": [{"id": identifier}, {"slug": identifier}]})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    await db.products.update_one({"id": p["id"]}, {"$inc": {"views": 1}})
    p["views"] = p.get("views", 0) + 1
    seller = await db.users.find_one({"id": p["seller_id"]}, NO_ID)
    prof = await db.seller_profiles.find_one({"user_id": p["seller_id"]}, NO_ID)
    is_owner = False
    is_fav = False
    try:
        cur = await get_current_user(request)
        is_owner = cur["id"] == p["seller_id"] or cur.get("role") == "admin"
        is_fav = bool(await db.favorites.find_one({"user_id": cur["id"], "product_id": p["id"]}))
    except Exception:
        pass
    result = strip_private(p, is_owner=is_owner)
    seller_info = None
    if seller and prof:
        seller_info = {
            "id": seller["id"], "full_name": seller["full_name"], "username": seller["username"],
            "avatar": seller.get("avatar", ""), "department": seller.get("department"), "city": seller.get("city"),
            "created_at": seller.get("created_at"),
            "email_verified": seller.get("email_verified"), "phone_verified": seller.get("phone_verified"),
            "seller_verified": prof.get("seller_verified"), "rating": prof.get("rating", 0),
            "review_count": prof.get("review_count", 0),
            "phone": seller.get("phone") if prof.get("show_phone") else None,
            "whatsapp_enabled": prof.get("whatsapp_enabled"),
            "whatsapp_number": prof.get("whatsapp_number") if prof.get("whatsapp_enabled") else None,
            "store_name": prof.get("store_name"),
        }
    return {"product": result, "seller": seller_info, "is_favorite": is_fav}


@api.put("/products/{pid}")
async def update_product(pid: str, data: ProductIn, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa modifye.")
    if p["status"] == "sold":
        raise HTTPException(status_code=400, detail="Pwodwi vann pa ka modifye. Restore l anvan.")
    updates = data.model_dump()
    updates["images"] = updates["images"][:10]
    updates["updated_at"] = now_iso()
    if updates.get("status") not in ("active", "draft"):
        updates["status"] = p["status"]
    await db.products.update_one({"id": pid}, {"$set": updates})
    updated = await db.products.find_one({"id": pid}, NO_ID)
    return strip_private(updated, is_owner=True)


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.delete_one({"id": pid})
    return {"message": "Pwodwi efase."}


@api.post("/products/{pid}/mark-sold")
async def mark_sold(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p or (p["seller_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.update_one({"id": pid}, {"$set": {"status": "sold", "sold_at": now_iso()}})
    return {"message": "Pwodwi make kÃ²m VANN."}


@api.post("/products/{pid}/restore")
async def restore_product(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p or (p["seller_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.update_one({"id": pid}, {"$set": {"status": "active"}})
    return {"message": "Pwodwi restore."}


# ---------------- Favorites ----------------
@api.post("/favorites/{pid}")
async def toggle_favorite(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    existing = await db.favorites.find_one({"user_id": user["id"], "product_id": pid})
    if existing:
        await db.favorites.delete_one({"user_id": user["id"], "product_id": pid})
        await db.products.update_one({"id": pid}, {"$inc": {"favorites_count": -1}})
        return {"favorited": False}
    await db.favorites.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "product_id": pid, "created_at": now_iso()})
    await db.products.update_one({"id": pid}, {"$inc": {"favorites_count": 1}})
    if p["seller_id"] != user["id"]:
        await create_notification(p["seller_id"], "favorite", f"Yon moun renmen '{p['title']}'", f"/product/{p['slug']}")
    return {"favorited": True}


@api.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, NO_ID).to_list(500)
    ids = [f["product_id"] for f in favs]
    products = await db.products.find({"id": {"$in": ids}}, NO_ID).to_list(500)
    for p in products:
        p.pop("imei", None)
        p["images"] = p.get("images", [])[:1]
    return products


# ---------------- Messaging ----------------
@api.post("/conversations")
async def create_conversation(data: ConversationIn, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": data.product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka voye mesaj ba tÃ¨t ou.")
    existing = await db.conversations.find_one({"product_id": data.product_id, "buyer_id": user["id"]}, NO_ID)
    if existing:
        return existing
    conv = {
        "id": str(uuid.uuid4()),
        "product_id": data.product_id,
        "product_title": p["title"],
        "product_image": (p.get("images") or [""])[0] if p.get("images") else "",
        "buyer_id": user["id"],
        "buyer_username": user["username"],
        "seller_id": p["seller_id"],
        "seller_username": p["seller_username"],
        "last_message": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.conversations.insert_one(dict(conv))
    return conv


@api.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]}, NO_ID).sort("updated_at", -1).to_list(200)
    for c in convs:
        c["unread"] = await db.messages.count_documents({"conversation_id": c["id"], "sender_id": {"$ne": user["id"]}, "read": False})
        other_id = c["seller_id"] if c["buyer_id"] == user["id"] else c["buyer_id"]
        other = await db.users.find_one({"id": other_id}, NO_ID)
        c["other_user"] = {"username": other["username"], "avatar": other.get("avatar", "")} if other else {}
    return convs


@api.get("/conversations/{cid}/messages")
async def get_messages(cid: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid}, NO_ID)
    if not conv or user["id"] not in (conv["buyer_id"], conv["seller_id"]):
        raise HTTPException(status_code=403, detail="AksÃ¨ refize.")
    await db.messages.update_many({"conversation_id": cid, "sender_id": {"$ne": user["id"]}}, {"$set": {"read": True}})
    msgs = await db.messages.find({"conversation_id": cid}, NO_ID).sort("created_at", 1).to_list(1000)
    return {"conversation": conv, "messages": msgs}


@api.post("/conversations/{cid}/messages")
async def send_message(cid: str, data: MessageIn, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid})
    if not conv or user["id"] not in (conv["buyer_id"], conv["seller_id"]):
        raise HTTPException(status_code=403, detail="AksÃ¨ refize.")
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": cid,
        "sender_id": user["id"],
        "sender_username": user["username"],
        "content": data.content,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one({"id": cid}, {"$set": {"last_message": data.content, "updated_at": now_iso()}})
    recipient = conv["seller_id"] if conv["buyer_id"] == user["id"] else conv["buyer_id"]
    clean = {k: v for k, v in msg.items() if k != "_id"}
    await manager.send(recipient, {"event": "message", "data": clean, "conversation_id": cid})
    await create_notification(recipient, "message", f"Nouvo mesaj de @{user['username']}", "/messages")
    return clean


@app.websocket("/api/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = auth_lib.decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=1008)
        return
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)


# ---------------- Reviews ----------------
@api.post("/reviews")
async def create_review(data: ReviewIn, user: dict = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating dwe ant 1 ak 5.")
    if data.seller_id == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka evalye tÃ¨t ou.")
    if await db.reviews.find_one({"seller_id": data.seller_id, "buyer_id": user["id"]}):
        raise HTTPException(status_code=400, detail="Ou deja evalye vandÃ¨ sa a.")
    verified = bool(await db.conversations.find_one({"seller_id": data.seller_id, "buyer_id": user["id"]}))
    review = {
        "id": str(uuid.uuid4()),
        "seller_id": data.seller_id,
        "buyer_id": user["id"],
        "buyer_username": user["username"],
        "buyer_avatar": user.get("avatar", ""),
        "rating": data.rating,
        "comment": data.comment,
        "verified": verified,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(dict(review))
    all_reviews = await db.reviews.find({"seller_id": data.seller_id}).to_list(1000)
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews), 1)
    await db.seller_profiles.update_one({"user_id": data.seller_id}, {"$set": {"rating": avg, "review_count": len(all_reviews)}})
    await create_notification(data.seller_id, "review", f"Nouvo avi {data.rating} zetwal de @{user['username']}", "")
    return {k: v for k, v in review.items() if k != "_id"}


# ---------------- Reports ----------------
@api.post("/reports")
async def create_report(data: ReportIn, user: dict = Depends(get_current_user)):
    report = {
        "id": str(uuid.uuid4()),
        "target_type": data.target_type,
        "target_id": data.target_id,
        "reporter_id": user["id"],
        "reporter_username": user["username"],
        "reason": data.reason,
        "description": data.description,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.reports.insert_one(dict(report))
    return {"message": "RapÃ² ou voye. MÃ¨si."}


# ---------------- Notifications ----------------
@api.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(100)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": notifs, "unread": unread}


@api.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}


@api.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}


# ---------------- Admin ----------------
@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(get_admin)):
    return {
        "total_users": await db.users.count_documents({}),
        "total_sellers": await db.users.count_documents({"is_seller": True}),
        "active_listings": await db.products.count_documents({"status": "active"}),
        "pending_listings": await db.products.count_documents({"status": "pending"}),
        "sold_products": await db.products.count_documents({"status": "sold"}),
        "reported_listings": await db.reports.count_documents({"status": "open"}),
        "verified_sellers": await db.seller_profiles.count_documents({"seller_verified": True}),
    }


@api.get("/admin/users")
async def admin_users(q: Optional[str] = None, admin: dict = Depends(get_admin)):
    query = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query = {"$or": [{"username": rx}, {"email": rx}, {"full_name": rx}]}
    return await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)


@api.get("/admin/users/{uid}")
async def admin_user_detail(uid: str, admin: dict = Depends(get_admin)):
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    prof = await db.seller_profiles.find_one({"user_id": uid}, NO_ID)
    products = await db.products.find({"seller_id": uid}, {"_id": 0, "images": 0}).to_list(500)
    reports = await db.reports.count_documents({"target_type": "seller", "target_id": uid})
    return {"user": u, "seller_profile": prof, "products": products, "reports": reports}


@api.put("/admin/users/{uid}/{action}")
async def admin_user_action(uid: str, action: str, admin: dict = Depends(get_admin)):
    if action == "delete":
        await db.users.delete_one({"id": uid})
        await db.products.delete_many({"seller_id": uid})
        return {"message": "ItilizatÃ¨ efase."}
    status_map = {"suspend": "suspended", "ban": "banned", "restore": "active"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    await db.users.update_one({"id": uid}, {"$set": {"status": status_map[action]}, "$inc": {"token_version": 1}})
    return {"message": f"ItilizatÃ¨ {status_map[action]}."}


@api.get("/admin/products")
async def admin_products(status: Optional[str] = None, admin: dict = Depends(get_admin)):
    query = {}
    if status:
        query["status"] = status
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for p in products:
        p["images"] = p.get("images", [])[:1]
    return products


@api.get("/admin/products/{pid}/imei")
async def admin_view_imei(pid: str, admin: dict = Depends(get_admin)):
    p = await db.products.find_one({"id": pid}, NO_ID)
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    return {"imei": p.get("imei", "")}


@api.put("/admin/products/{pid}/moderate/{decision}")
async def admin_moderate(pid: str, decision: str, admin: dict = Depends(get_admin)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if decision == "approve":
        await db.products.update_one({"id": pid}, {"$set": {"status": "active"}})
        await create_notification(p["seller_id"], "listing", f"Pwodwi '{p['title']}' apwouve.", f"/product/{p['slug']}")
    elif decision == "reject":
        await db.products.update_one({"id": pid}, {"$set": {"status": "rejected"}})
        await create_notification(p["seller_id"], "listing", f"Pwodwi '{p['title']}' rejte.", "")
    else:
        raise HTTPException(status_code=400, detail="Desizyon pa valab.")
    return {"message": "ok"}


@api.put("/admin/products/{pid}/verify-imei")
async def admin_verify_imei(pid: str, admin: dict = Depends(get_admin)):
    await db.products.update_one({"id": pid}, {"$set": {"imei_verified": True}})
    return {"message": "IMEI verifye."}


@api.get("/admin/reports")
async def admin_reports(admin: dict = Depends(get_admin)):
    return await db.reports.find({}, NO_ID).sort("created_at", -1).to_list(500)


@api.put("/admin/reports/{rid}/resolve")
async def admin_resolve_report(rid: str, admin: dict = Depends(get_admin)):
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved"}})
    return {"message": "ok"}


@api.get("/admin/verifications")
async def admin_verifications(admin: dict = Depends(get_admin)):
    return await db.seller_verifications.find({}, NO_ID).sort("created_at", -1).to_list(500)


@api.put("/admin/verifications/{vid}/{decision}")
async def admin_verify_seller(vid: str, decision: str, admin: dict = Depends(get_admin)):
    v = await db.seller_verifications.find_one({"id": vid})
    if not v:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    status = "approved" if decision == "approve" else "rejected"
    await db.seller_verifications.update_one({"id": vid}, {"$set": {"status": status}})
    if decision == "approve":
        await db.seller_profiles.update_one({"user_id": v["user_id"]}, {"$set": {"seller_verified": True}})
        await create_notification(v["user_id"], "verified", "Ou se yon VandÃ¨ Verifye kounye a!", "")
    return {"message": "ok"}


@api.post("/admin/categories")
async def admin_add_category(data: CategoryIn, admin: dict = Depends(get_admin)):
    cnt = await db.categories.count_documents({})
    cat = {
        "id": str(uuid.uuid4()),
        "slug": slugify(data.name_en or data.name_ht),
        "name_ht": data.name_ht, "name_fr": data.name_fr, "name_en": data.name_en,
        "icon": data.icon, "type": data.type, "order": cnt + 1, "subcategories": [],
    }
    await db.categories.insert_one(dict(cat))
    return {k: v for k, v in cat.items() if k != "_id"}


@api.put("/admin/categories/{cid}")
async def admin_edit_category(cid: str, data: CategoryIn, admin: dict = Depends(get_admin)):
    await db.categories.update_one({"id": cid}, {"$set": data.model_dump()})
    return {"message": "ok"}


@api.delete("/admin/categories/{cid}")
async def admin_delete_category(cid: str, admin: dict = Depends(get_admin)):
    await db.categories.delete_one({"id": cid})
    return {"message": "ok"}


@api.post("/admin/categories/{cid}/subcategories")
async def admin_add_subcategory(cid: str, data: SubcategoryIn, admin: dict = Depends(get_admin)):
    sub = {"id": str(uuid.uuid4()), "name": data.name, "slug": slugify(data.name)}
    await db.categories.update_one({"id": cid}, {"$push": {"subcategories": sub}})
    return sub


@api.delete("/admin/categories/{cid}/subcategories/{sid}")
async def admin_delete_subcategory(cid: str, sid: str, admin: dict = Depends(get_admin)):
    await db.categories.update_one({"id": cid}, {"$pull": {"subcategories": {"id": sid}}})
    return {"message": "ok"}


@api.get("/admin/settings")
async def admin_get_settings(admin: dict = Depends(get_admin)):
    s = await db.settings.find_one({"id": "site-settings"}, NO_ID)
    return s or DEFAULT_SETTINGS


@api.put("/admin/settings")
async def admin_update_settings(data: SettingsIn, admin: dict = Depends(get_admin)):
    updates = {}
    if data.site_branding is not None:
        updates["site_branding"] = data.site_branding
    if data.listing_mode is not None:
        updates["listing_mode"] = data.listing_mode
    if data.safety_messages is not None:
        updates["safety_messages"] = data.safety_messages
    await db.settings.update_one({"id": "site-settings"}, {"$set": updates}, upsert=True)
    return {"message": "ParamÃ¨t anrejistre."}


app.include_router(api)

_cors_origins_env = os.environ.get("CORS_ORIGINS", "").strip()
_cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,  # must be explicit domains; "*" is unsafe with allow_credentials=True
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    if await db.categories.count_documents({}) == 0:
        await db.categories.insert_many([dict(c) for c in CATEGORIES])
    if await db.locations.count_documents({}) == 0:
        await db.locations.insert_many([dict(d) for d in DEPARTMENTS])
    if await db.settings.count_documents({"id": "site-settings"}) == 0:
        await db.settings.insert_one(dict(DEFAULT_SETTINGS))
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("username", unique=True)
        await db.products.create_index("slug")
        await db.products.create_index([("status", 1), ("category", 1)])
    except Exception as e:
        logger.warning(f"index: {e}")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@deallakay.com").lower()
    admin_username = os.environ.get("ADMIN_USERNAME", "admin").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin123!")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        aid = str(uuid.uuid4())
        await db.users.insert_one({
            "id": aid, "full_name": "DealLakay Admin", "username": admin_username,
            "email": admin_email, "phone": "+50900000000", "password_hash": auth_lib.hash_password(admin_password),
            "country": "Ayiti", "department": "Ouest", "city": "Port-au-Prince", "role": "admin",
            "status": "active", "email_verified": True, "phone_verified": True, "is_seller": True,
            "avatar": "", "token_version": 0, "terms_accepted": True, "created_at": now_iso(),
        })
        await db.seller_profiles.insert_one({
            "id": str(uuid.uuid4()), "user_id": aid,
            "status": "active", "seller_verified": True, "whatsapp_enabled": True, "whatsapp_number": "+50900000000",
            "show_phone": True, "show_location": True, "bio": "Ekip DealLakay", "store_name": "DealLakay Official",
            "store_description": "", "rating": 0, "review_count": 0, "followers": 0, "date_joined": now_iso(),
        })
    elif not auth_lib.verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": auth_lib.hash_password(admin_password)}})
    logger.info("DealLakay startup complete")


@app.on_event("shutdown")
async def shutdown():
    client.close()
