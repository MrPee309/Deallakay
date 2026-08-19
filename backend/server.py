from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, WebSocket, WebSocketDisconnect, Query
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid
import re

import auth as auth_lib
import email_service
import security
from seed_data import CATEGORIES, DEPARTMENTS, DEFAULT_SETTINGS
from shared import db, client, NO_ID, now_iso, slugify, get_current_user, get_admin, public_user, logger, manager, create_notification
from routers.auth import router as auth_router
from routers.products import router as products_router
from routers.sellers import router as sellers_router
from routers.social import router as social_router

app = FastAPI(title="DealLakay API")
api = APIRouter(prefix="/api")


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
        return {"message": "Itilizatè efase."}
    status_map = {"suspend": "suspended", "ban": "banned", "restore": "active"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    await db.users.update_one({"id": uid}, {"$set": {"status": status_map[action]}, "$inc": {"token_version": 1}})
    return {"message": f"Itilizatè {status_map[action]}."}


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
        await create_notification(v["user_id"], "verified", "Ou se yon Vandè Verifye kounye a!", "")
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
    return {"message": "Paramèt anrejistre."}


app.include_router(auth_router)
app.include_router(products_router)
app.include_router(sellers_router)
app.include_router(social_router)
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

# Paths that serve FastAPI's own HTML (Swagger/ReDoc) need their CDN scripts/styles
# to load, so a strict CSP would break them. Everything else on this API returns
# only JSON, so a locked-down CSP there is safe and adds no functional risk.
_DOCS_PATHS = {"/docs", "/redoc", "/openapi.json"}


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path not in _DOCS_PATHS:
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


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
