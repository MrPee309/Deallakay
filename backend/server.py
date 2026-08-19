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
from routers.admin import router as admin_router

app = FastAPI(title="DealLakay API")
api = APIRouter(prefix="/api")


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


app.include_router(auth_router)
app.include_router(products_router)
app.include_router(sellers_router)
app.include_router(social_router)
app.include_router(admin_router)
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
