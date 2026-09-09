"""
Transpò & Livrezon (moto taxi + delivery): driver profiles, stations,
driver online/offline status — Phase 1 (foundation) only.

Follows the exact pattern already established for Sellers/Technicians in
this codebase: registering as a driver creates a pending profile but does
NOT grant any capability (is_moto_driver stays False) until an admin
approves it. No new backend, no new database — this reuses the existing
db connection, get_current_user, get_admin, require_staff, and
create_notification from shared.py.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from shared import db, NO_ID, now_iso, get_current_user, get_admin, create_notification

router = APIRouter(prefix="/api/transport", tags=["transport"])

SERVICE_TYPES = ["moto_taxi", "delivery", "moto_taxi_delivery"]
DRIVER_STATUSES = ["offline", "available", "busy", "suspended"]


class MotorcycleIn(BaseModel):
    brand: str
    model: str
    year: Optional[int] = None
    color: str = ""
    plate: str


class BecomeDriverIn(BaseModel):
    city: str
    area: str = ""
    station_id: Optional[str] = None
    service_types: List[str]
    motorcycle: MotorcycleIn
    accept_driver_terms: bool


def _public_driver(d: dict) -> dict:
    return {
        "id": d["id"],
        "user_id": d["user_id"],
        "city": d.get("city", ""),
        "area": d.get("area", ""),
        "station_id": d.get("station_id"),
        "service_types": d.get("service_types", []),
        "motorcycle": d.get("motorcycle", {}),
        "verification_status": d.get("verification_status", "pending"),
        "status": d.get("status", "offline"),
        "rating": d.get("rating", 0),
        "review_count": d.get("review_count", 0),
        "created_at": d.get("created_at"),
    }


@router.post("/drivers/become")
async def become_driver(data: BecomeDriverIn, user: dict = Depends(get_current_user)):
    if user.get("role") in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Kont Admin/Anplwaye pa ka vin Chofè Moto — se yon wòl sipèvizyon, pa yon patisipan sèvis la.")
    if not data.accept_driver_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte règ Chofè yo.")
    if not user.get("email_verified"):
        raise HTTPException(status_code=400, detail="Email ou dwe verifye.")
    bad_types = [s for s in data.service_types if s not in SERVICE_TYPES]
    if bad_types:
        raise HTTPException(status_code=400, detail=f"Kalite sèvis pa valab: {', '.join(bad_types)}")
    if data.station_id and not await db.transport_stations.find_one({"id": data.station_id, "status": "active"}):
        raise HTTPException(status_code=400, detail="Stasyon pa jwenn oswa pa aktif.")

    existing = await db.transport_drivers.find_one({"user_id": user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="Ou deja gen yon demann Chofè an atant oswa aktif.")

    driver = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "city": data.city,
        "area": data.area,
        "station_id": data.station_id,
        "service_types": data.service_types,
        "motorcycle": data.motorcycle.model_dump(),
        "verification_status": "pending",
        "status": "offline",
        "rating": 0,
        "review_count": 0,
        "created_at": now_iso(),
    }
    await db.transport_drivers.insert_one(dict(driver))
    # is_moto_driver is intentionally NOT set here — same reasoning as
    # Sellers/Technicians: the account only gains the ability to go
    # available and receive requests once an admin approves this.
    return {"message": "Demann ou voye! Li an atant apwobasyon admin anvan ou vin yon Chofè aktif.", "status": "pending"}


@router.get("/drivers/me")
async def get_my_driver_profile(user: dict = Depends(get_current_user)):
    d = await db.transport_drivers.find_one({"user_id": user["id"]}, NO_ID)
    if not d:
        raise HTTPException(status_code=404, detail="Ou pa gen yon pwofil Chofè.")
    return _public_driver(d)


class StatusIn(BaseModel):
    status: str


@router.put("/drivers/status")
async def update_driver_status(data: StatusIn, user: dict = Depends(get_current_user)):
    if data.status not in DRIVER_STATUSES:
        raise HTTPException(status_code=400, detail="Estati pa valab.")
    if data.status == "suspended":
        raise HTTPException(status_code=403, detail="Sèlman admin ka sispann yon chofè.")
    d = await db.transport_drivers.find_one({"user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Ou pa gen yon pwofil Chofè.")
    if not user.get("is_moto_driver"):
        raise HTTPException(status_code=403, detail="Chofè ou poko apwouve pa admin.")
    if d.get("verification_status") != "verified":
        raise HTTPException(status_code=403, detail="Chofè ou poko verifye.")
    if d.get("status") == "busy" and data.status == "available":
        raise HTTPException(status_code=400, detail="Ou pa ka vin disponib pandan ou nan yon kous.")
    await db.transport_drivers.update_one({"user_id": user["id"]}, {"$set": {"status": data.status}})
    return {"message": "Estati ou mete ajou.", "status": data.status}


# ---------------- Stations (public read) ----------------
@router.get("/stations")
async def list_stations(city: Optional[str] = None):
    query = {"status": "active"}
    if city:
        query["city"] = city
    stations = await db.transport_stations.find(query, NO_ID).sort("name", 1).to_list(200)
    for s in stations:
        s["driver_count"] = await db.transport_drivers.count_documents({"station_id": s["id"], "verification_status": "verified"})
    return stations
