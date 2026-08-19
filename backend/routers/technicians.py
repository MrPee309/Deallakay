"""
Technician Profile endpoints: become a technician, technician profile/settings,
public technician directory + detail pages, technician reviews (reusing the
existing generalized /reviews endpoint with target_type="technician").

New in Phase 2C. Mirrors the existing seller_profiles pattern (routers/sellers.py)
so the two systems share the same shape and conventions, without reusing the
SAME collection — a user can independently be a seller, a technician, or both.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import security
from shared import db, NO_ID, now_iso, get_current_user

router = APIRouter(prefix="/api", tags=["technicians"])

SPECIALTIES = [
    "Reparasyon Telefòn", "Reparasyon Laptop", "Chanjman Ekran", "Chanjman Batri",
    "Reparasyon Kat Mè (Motherboard)", "Data Recovery", "Deblokaj iCloud/FRP",
    "Enstalasyon Lojisyèl", "Reparasyon Konsòl Jwèt", "Lòt Sèvis Teknik",
]


class BecomeTechnicianIn(BaseModel):
    accept_technician_terms: bool
    specialties: List[str] = []
    service_departments: List[str] = []
    bio: str = ""
    years_experience: Optional[int] = None


class TechnicianSettingsIn(BaseModel):
    specialties: Optional[List[str]] = None
    service_departments: Optional[List[str]] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None
    whatsapp_enabled: Optional[bool] = None
    whatsapp_number: Optional[str] = None
    show_phone: Optional[bool] = None
    avatar: Optional[str] = None


class TechnicianWorkIn(BaseModel):
    title: str
    description: str = ""
    images: List[str] = []


@router.get("/technician-specialties")
async def get_specialties():
    return SPECIALTIES


@router.post("/technician/become")
async def become_technician(data: BecomeTechnicianIn, user: dict = Depends(get_current_user)):
    if not data.accept_technician_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte règ teknisyen yo.")
    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email ou dwe verifye.")
    bad_specialties = [s for s in data.specialties if s not in SPECIALTIES]
    if bad_specialties:
        raise HTTPException(status_code=400, detail=f"Espesyalite pa valab: {', '.join(bad_specialties)}")
    existing = await db.technician_profiles.find_one({"user_id": user["id"]})
    if not existing:
        await db.technician_profiles.insert_one({
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "status": "active",
            "technician_verified": False,
            "specialties": data.specialties,
            "service_departments": data.service_departments,
            "bio": data.bio,
            "years_experience": data.years_experience,
            "whatsapp_enabled": True,
            "whatsapp_number": user.get("phone", ""),
            "show_phone": True,
            "rating": 0,
            "review_count": 0,
            "date_joined": now_iso(),
        })
    await db.users.update_one({"id": user["id"]}, {"$set": {"is_technician": True}})
    return {"message": "Ou se yon teknisyen kounye a!", "status": "active"}


@router.get("/technician/profile")
async def my_technician_profile(user: dict = Depends(get_current_user)):
    prof = await db.technician_profiles.find_one({"user_id": user["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon teknisyen.")
    return prof


@router.put("/technician/settings")
async def update_technician_settings(data: TechnicianSettingsIn, user: dict = Depends(get_current_user)):
    prof = await db.technician_profiles.find_one({"user_id": user["id"]})
    if not prof:
        raise HTTPException(status_code=404, detail="Ou poko yon teknisyen.")
    if data.specialties is not None:
        bad = [s for s in data.specialties if s not in SPECIALTIES]
        if bad:
            raise HTTPException(status_code=400, detail=f"Espesyalite pa valab: {', '.join(bad)}")
    updates = {k: v for k, v in data.model_dump().items() if v is not None and k != "avatar"}
    if updates:
        await db.technician_profiles.update_one({"user_id": user["id"]}, {"$set": updates})
    if data.avatar is not None:
        await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": data.avatar}})
    return {"message": "Paramèt anrejistre."}


@router.post("/technician/verify-request")
async def request_technician_verification(user: dict = Depends(get_current_user)):
    if not user.get("is_technician"):
        raise HTTPException(status_code=400, detail="Ou dwe yon teknisyen.")
    existing = await db.technician_verifications.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        return {"message": "Demann verifikasyon ou deja an atant."}
    await db.technician_verifications.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "status": "pending",
        "created_at": now_iso(),
    })
    return {"message": "Demann verifikasyon voye. Admin ap revize li."}


@router.get("/technicians")
async def list_technicians(
    specialty: Optional[str] = None,
    department: Optional[str] = None,
    verified: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
):
    query: dict = {"status": "active"}
    if specialty:
        query["specialties"] = specialty
    if department:
        query["service_departments"] = department
    if verified:
        query["technician_verified"] = True
    total = await db.technician_profiles.count_documents(query)
    skip = max(0, (page - 1) * limit)
    profiles = await db.technician_profiles.find(query, NO_ID).sort("rating", -1).skip(skip).limit(limit).to_list(limit)
    results = []
    for p in profiles:
        u = await db.users.find_one({"id": p["user_id"]}, NO_ID)
        if not u:
            continue
        results.append({
            "username": u["username"], "full_name": u["full_name"], "avatar": u.get("avatar", ""),
            "city": u.get("city"), "department": u.get("department"),
            "specialties": p.get("specialties", []), "technician_verified": p.get("technician_verified", False),
            "rating": p.get("rating", 0), "review_count": p.get("review_count", 0),
        })
    return {"technicians": results, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.get("/technicians/{username}")
async def public_technician(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="Teknisyen pa jwenn.")
    prof = await db.technician_profiles.find_one({"user_id": u["id"]}, NO_ID)
    if not prof:
        raise HTTPException(status_code=404, detail="Teknisyen pa jwenn.")
    return {
        "user": {"id": u["id"], "full_name": u["full_name"], "username": u["username"], "avatar": u.get("avatar", ""),
                 "department": u.get("department"), "city": u.get("city"), "created_at": u.get("created_at"),
                 "email_verified": u.get("email_verified"), "phone_verified": u.get("phone_verified"),
                 "phone": u.get("phone") if prof.get("show_phone") else None},
        "profile": prof,
    }


@router.get("/technicians/{username}/reviews")
async def technician_reviews(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="Teknisyen pa jwenn.")
    return await db.reviews.find({"seller_id": u["id"], "target_type": "technician"}, NO_ID).sort("created_at", -1).to_list(200)


# ---------------- Work portfolio ("shop" / galri travay) ----------------
@router.post("/technician/work")
async def create_work(data: TechnicianWorkIn, user: dict = Depends(get_current_user)):
    if not user.get("is_technician"):
        raise HTTPException(status_code=403, detail="Ou dwe yon teknisyen.")
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Antre yon tit.")
    security.validate_images(data.images)
    work = {
        "id": str(uuid.uuid4()),
        "technician_user_id": user["id"],
        "title": data.title.strip(),
        "description": data.description,
        "images": data.images[:10],
        "created_at": now_iso(),
    }
    await db.technician_work.insert_one(dict(work))
    return {k: v for k, v in work.items() if k != "_id"}


@router.get("/technician/work")
async def my_work(user: dict = Depends(get_current_user)):
    return await db.technician_work.find({"technician_user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(200)


@router.put("/technician/work/{wid}")
async def update_work(wid: str, data: TechnicianWorkIn, user: dict = Depends(get_current_user)):
    w = await db.technician_work.find_one({"id": wid})
    if not w:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if w["technician_user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa modifye.")
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Antre yon tit.")
    security.validate_images(data.images)
    updates = {"title": data.title.strip(), "description": data.description, "images": data.images[:10]}
    await db.technician_work.update_one({"id": wid}, {"$set": updates})
    return {"message": "ok"}


@router.delete("/technician/work/{wid}")
async def delete_work(wid: str, user: dict = Depends(get_current_user)):
    w = await db.technician_work.find_one({"id": wid})
    if not w:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if w["technician_user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.technician_work.delete_one({"id": wid})
    return {"message": "Efase."}


@router.get("/technicians/{username}/work")
async def public_work(username: str):
    u = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not u:
        raise HTTPException(status_code=404, detail="Teknisyen pa jwenn.")
    return await db.technician_work.find({"technician_user_id": u["id"]}, NO_ID).sort("created_at", -1).to_list(200)
