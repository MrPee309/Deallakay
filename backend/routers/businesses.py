"""
Local Business ("Biznis Lokal") endpoints: become a business, business
profile/settings, public business directory + detail pages, business
reviews (reusing the existing generalized /reviews endpoint with
target_type="business").

Mirrors the existing seller_profiles/technician_profiles pattern exactly
so this new system shares the same shape/conventions — a user can
independently be a seller, technician, driver, AND a business, all at
once, without duplicating auth/roles/collections.
"""
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import security
from shared import db, NO_ID, now_iso, get_current_user, create_notification, fire_notify_me

router = APIRouter(prefix="/api", tags=["businesses"])

BUSINESS_TYPES = [
    "Otèl", "Restoran", "Garaj / Mekanisyen", "Famasi", "Estidyo",
    "Salon Bòte", "Sant Sèvis", "Magazen", "Lekòl", "Lòt",
]


class BusinessIn(BaseModel):
    accept_business_terms: bool
    business_type: str
    business_name: str
    description: str = ""
    phone: str = ""
    department: str
    city: str
    area: str = ""
    photos: List[str] = []


class BusinessUpdateIn(BaseModel):
    business_type: Optional[str] = None
    business_name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    photos: Optional[List[str]] = None


@router.post("/businesses/become")
async def become_business(data: BusinessIn, user: dict = Depends(get_current_user)):
    if user.get("role") in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Kont Admin/Anplwaye pa ka enskri yon Biznis Lokal — se yon wòl sipèvizyon.")
    if not data.accept_business_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte règ Biznis Lokal yo.")
    if data.business_type not in BUSINESS_TYPES:
        raise HTTPException(status_code=400, detail=f"Tip biznis pa valab. Chwazi: {', '.join(BUSINESS_TYPES)}")
    if not data.business_name.strip():
        raise HTTPException(status_code=400, detail="Non biznis la obligatwa.")
    if not data.department or not data.city:
        raise HTTPException(status_code=400, detail="Depatman ak Vil obligatwa.")

    existing = await db.business_profiles.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Ou deja gen yon Biznis Lokal anrejistre oswa an atant.")

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "business_type": data.business_type,
        "business_name": data.business_name.strip(),
        "description": data.description,
        "phone": data.phone,
        "department": data.department,
        "city": data.city,
        "area": data.area,
        "photos": data.photos[:10],
        "status": "pending",
        "rating": 0,
        "review_count": 0,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.business_profiles.insert_one(dict(doc))
    # is_business is intentionally NOT set on the user here — same pattern
    # as Sellers/Technicians/Drivers: no public visibility until an admin
    # approves this application.
    return {"message": "Demann Biznis Lokal ou voye! Li an atant apwobasyon admin.", "status": "pending"}


@router.get("/businesses/me")
async def get_my_business(user: dict = Depends(get_current_user)):
    b = await db.business_profiles.find_one({"user_id": user["id"]}, NO_ID)
    if not b:
        raise HTTPException(status_code=404, detail="Ou pa gen yon Biznis Lokal.")
    return b


@router.put("/businesses/me")
async def update_my_business(data: BusinessUpdateIn, user: dict = Depends(get_current_user)):
    b = await db.business_profiles.find_one({"user_id": user["id"]})
    if not b:
        raise HTTPException(status_code=404, detail="Ou pa gen yon Biznis Lokal.")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "business_type" in updates and updates["business_type"] not in BUSINESS_TYPES:
        raise HTTPException(status_code=400, detail="Tip biznis pa valab.")
    if updates:
        updates["updated_at"] = now_iso()
        await db.business_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    return {"message": "ok"}


@router.get("/business-types")
async def get_business_types():
    return BUSINESS_TYPES


# ---------------- Public directory ----------------
@router.get("/businesses")
async def list_businesses(
    q: Optional[str] = None,
    business_type: Optional[str] = None,
    department: Optional[str] = None,
    city: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
):
    query: Dict[str, Any] = {"status": "active"}
    if business_type:
        query["business_type"] = business_type
    if department:
        query["department"] = department
    if city:
        query["city"] = city
    if q:
        query["$or"] = [
            {"business_name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
        ]
    total = await db.business_profiles.count_documents(query)
    skip = (page - 1) * limit
    items = await db.business_profiles.find(query, NO_ID).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"businesses": items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.get("/businesses/{business_id}")
async def get_business(business_id: str):
    b = await db.business_profiles.find_one({"id": business_id, "status": "active"}, NO_ID)
    if not b:
        raise HTTPException(status_code=404, detail="Biznis pa jwenn.")
    return b
