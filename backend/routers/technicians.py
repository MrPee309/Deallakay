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

AVAILABILITY_STATUSES = ["available", "busy", "offline", "by_appointment"]


class BecomeTechnicianIn(BaseModel):
    accept_technician_terms: bool
    specialties: List[str] = []
    service_departments: List[str] = []
    bio: str = ""
    years_experience: Optional[int] = None
    languages: List[str] = []
    availability: str = "available"


class TechnicianSettingsIn(BaseModel):
    specialties: Optional[List[str]] = None
    service_departments: Optional[List[str]] = None
    bio: Optional[str] = None
    years_experience: Optional[int] = None
    languages: Optional[List[str]] = None
    availability: Optional[str] = None
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
    if data.availability not in AVAILABILITY_STATUSES:
        raise HTTPException(status_code=400, detail="Estati disponiblite pa valab.")
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
            "languages": data.languages,
            "availability": data.availability,
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
    if data.availability is not None and data.availability not in AVAILABILITY_STATUSES:
        raise HTTPException(status_code=400, detail="Estati disponiblite pa valab.")
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
    q: Optional[str] = None,
    specialty: Optional[str] = None,
    department: Optional[str] = None,
    city: Optional[str] = None,
    availability: Optional[str] = None,
    verified: Optional[bool] = None,
    sort: str = "recommended",
    page: int = 1,
    limit: int = 20,
):
    page = max(1, page)
    limit = max(1, min(limit, 50))  # hard cap so a bad/huge limit can't force-load everything
    query: dict = {"status": "active"}
    if specialty:
        query["specialties"] = specialty
    if department:
        query["service_departments"] = department
    if availability:
        if availability not in AVAILABILITY_STATUSES:
            raise HTTPException(status_code=400, detail="Estati disponiblite pa valab.")
        query["availability"] = availability
    if verified:
        query["technician_verified"] = True

    # Pull the filtered pool (capped) and join with users server-side, since
    # keyword search spans both collections (name lives on users, specialties/
    # bio live on technician_profiles) — no Elasticsearch, just an in-app join
    # over a bounded pool, safe at this marketplace's scale.
    profiles = await db.technician_profiles.find(query, NO_ID).to_list(500)
    results = []
    for p in profiles:
        u = await db.users.find_one({"id": p["user_id"]}, NO_ID)
        if not u:
            continue
        if city and u.get("city") != city:
            continue
        entry = {
            "username": u["username"], "full_name": u["full_name"], "avatar": u.get("avatar", ""),
            "city": u.get("city"), "department": u.get("department"),
            "specialties": p.get("specialties", []), "technician_verified": p.get("technician_verified", False),
            "rating": p.get("rating", 0), "review_count": p.get("review_count", 0),
            "availability": p.get("availability", "available"),
            "years_experience": p.get("years_experience"),
            "bio": p.get("bio", ""), "date_joined": p.get("date_joined"),
        }
        if q:
            haystack = " ".join([
                entry["full_name"], entry["username"], entry["bio"],
                " ".join(entry["specialties"]), entry["city"] or "", entry["department"] or "",
            ]).lower()
            if q.lower() not in haystack:
                continue
        results.append(entry)

    sort_key = {
        "verified": lambda e: (not e["technician_verified"], -e["rating"]),
        "rating": lambda e: -e["rating"],
        "experience": lambda e: -(e["years_experience"] or 0),
        "recent": lambda e: e["date_joined"] or "",
        "recommended": lambda e: (not e["technician_verified"], -e["rating"], -(e["years_experience"] or 0)),
    }
    results.sort(key=sort_key.get(sort, sort_key["recommended"]), reverse=(sort == "recent"))
    for e in results:
        e.pop("date_joined", None)
        e.pop("bio", None)

    total = len(results)
    skip = (page - 1) * limit
    page_items = results[skip: skip + limit]
    return {"technicians": page_items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.get("/technicians/work-feed")
async def technicians_work_feed(limit: int = 40):
    """Public photo catalog aggregating recent work posts across ALL technicians
    (only items that actually have a photo), so browsing /technicians feels like
    flipping through a catalog rather than a plain profile list."""
    items = await db.technician_work.find({"images.0": {"$exists": True}}, NO_ID).sort("created_at", -1).limit(limit).to_list(limit)
    results = []
    for w in items:
        u = await db.users.find_one({"id": w["technician_user_id"]}, NO_ID)
        if not u:
            continue
        results.append({
            "id": w["id"], "title": w["title"], "image": w["images"][0],
            "technician_username": u["username"], "technician_name": u["full_name"],
        })
    return results


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


@router.post("/technicians/{username}/contact")
async def contact_technician(username: str, user: dict = Depends(get_current_user)):
    """Starts (or reuses) a conversation with a technician, reusing the same
    `conversations` collection and Messages page as product conversations —
    just without a product attached. `product_title`/`product_image` are
    reused as the generic "subject" shown in the inbox, so no frontend/
    messaging changes are needed."""
    tu = await db.users.find_one({"username": username.lower()}, NO_ID)
    if not tu:
        raise HTTPException(status_code=404, detail="Teknisyen pa jwenn.")
    if not tu.get("is_technician"):
        raise HTTPException(status_code=400, detail="Itilizatè sa a pa yon teknisyen.")
    if tu["id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka voye mesaj ba tèt ou.")
    existing = await db.conversations.find_one({"seller_id": tu["id"], "buyer_id": user["id"], "product_id": None}, NO_ID)
    if existing:
        return existing
    conv = {
        "id": str(uuid.uuid4()),
        "product_id": None,
        "product_title": f"Teknisyen: {tu['full_name']}",
        "product_image": tu.get("avatar", ""),
        "buyer_id": user["id"],
        "buyer_username": user["username"],
        "seller_id": tu["id"],
        "seller_username": tu["username"],
        "last_message": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.conversations.insert_one(dict(conv))
    return conv
