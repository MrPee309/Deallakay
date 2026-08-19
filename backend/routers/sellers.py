"""
Seller endpoints: become a seller, seller profile/settings, verification
requests, seller dashboard stats, and public seller pages (profile + reviews).

Moved out of server.py during Phase 2A modularization. Behavior, paths, request
formats, and response formats are unchanged from before the move.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from shared import db, NO_ID, now_iso, get_current_user

router = APIRouter(prefix="/api", tags=["sellers"])


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


@router.post("/seller/become")
async def become_seller(data: BecomeSellerIn, user: dict = Depends(get_current_user)):
    if not data.accept_seller_terms or not data.accept_marketplace_rules:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte règ vandè yo.")
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
    return {"message": "Ou se yon vandè kounye a!", "status": "active"}


@router.get("/seller/profile")
async def my_seller_profile(user: dict = Depends(get_current_user)):
    prof = await db.seller_profiles.find_one({"user_id": user["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon vandè.")
    return prof


@router.put("/seller/settings")
async def update_seller_settings(data: SellerSettingsIn, user: dict = Depends(get_current_user)):
    prof = await db.seller_profiles.find_one({"user_id": user["id"]})
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon vandè.")
    updates = {k: v for k, v in data.model_dump().items() if v is not None and k != "avatar"}
    if updates:
        await db.seller_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    if data.avatar is not None:
        await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": data.avatar}})
    return {"message": "Paramèt anrejistre."}


@router.post("/seller/verify-request")
async def request_verification(user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=400, detail="Ou dwe yon vandè.")
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


@router.get("/seller/dashboard")
async def seller_dashboard(user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=403, detail="Ou poko yon vandè.")
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


@router.get("/sellers/{username}")
async def public_seller(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="Vandè pa jwenn.")
    prof = await db.seller_profiles.find_one({"user_id": u["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="Vandè pa jwenn.")
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


@router.get("/sellers/{username}/reviews")
async def seller_reviews(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="Vandè pa jwenn.")
    return await db.reviews.find({"seller_id": u["id"]}, NO_ID).sort("created_at", -1).to_list(200)
