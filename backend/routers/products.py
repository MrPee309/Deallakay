"""
Product endpoints: create, list, detail, update, delete, mark-sold, restore,
plus favorites (closely coupled — favoriting reads/writes products directly).

Moved out of server.py during Phase 2A modularization. Behavior, paths, request
formats, and response formats are unchanged from before the move.
"""
import re
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

import security
from shared import db, NO_ID, now_iso, slugify, get_current_user, create_notification

router = APIRouter(prefix="/api", tags=["products"])


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


def strip_private(p: dict, is_owner=False):
    p = {k: v for k, v in p.items() if k != "_id"}
    if not is_owner:
        p.pop("imei", None)
    return p


@router.post("/products")
async def create_product(data: ProductIn, user: dict = Depends(get_current_user)):
    if not user.get("is_seller"):
        raise HTTPException(status_code=403, detail="Ou dwe yon vandè pou vann.")
    if data.status not in ("active", "draft"):
        raise HTTPException(status_code=400, detail="Estati pa valab.")
    security.validate_images(data.images)
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


@router.get("/products")
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


@router.get("/my-products")
async def my_products(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {"seller_id": user["id"]}
    if status:
        query["status"] = status
    products = await db.products.find(query, NO_ID).sort("created_at", -1).to_list(500)
    for p in products:
        p["images"] = p.get("images", [])[:1]
    return products


@router.get("/products/{identifier}")
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


@router.put("/products/{pid}")
async def update_product(pid: str, data: ProductIn, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa modifye.")
    if p["status"] == "sold":
        raise HTTPException(status_code=400, detail="Pwodwi vann pa ka modifye. Restore l anvan.")
    security.validate_images(data.images)
    updates = data.model_dump()
    updates["images"] = updates["images"][:10]
    updates["updated_at"] = now_iso()
    if updates.get("status") not in ("active", "draft"):
        updates["status"] = p["status"]
    await db.products.update_one({"id": pid}, {"$set": updates})
    updated = await db.products.find_one({"id": pid}, NO_ID)
    return strip_private(updated, is_owner=True)


@router.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.delete_one({"id": pid})
    return {"message": "Pwodwi efase."}


@router.post("/products/{pid}/mark-sold")
async def mark_sold(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p or (p["seller_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.update_one({"id": pid}, {"$set": {"status": "sold", "sold_at": now_iso()}})
    return {"message": "Pwodwi make kòm VANN."}


@router.post("/products/{pid}/restore")
async def restore_product(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": pid})
    if not p or (p["seller_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.products.update_one({"id": pid}, {"$set": {"status": "active"}})
    return {"message": "Pwodwi restore."}


@router.post("/favorites/{pid}")
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


@router.get("/favorites")
async def get_favorites(user: dict = Depends(get_current_user)):
    favs = await db.favorites.find({"user_id": user["id"]}, NO_ID).to_list(500)
    ids = [f["product_id"] for f in favs]
    products = await db.products.find({"id": {"$in": ids}}, NO_ID).to_list(500)
    for p in products:
        p.pop("imei", None)
        p["images"] = p.get("images", [])[:1]
    return products
