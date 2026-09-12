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


# ---------------- Location (GPS) — Phase 2 ----------------
# A location older than this is never treated as "the driver is here right
# now" — the driver just drops out of nearby-search results until a fresh
# heartbeat arrives. This does NOT change their online/offline status field
# (that's an explicit driver action); it only affects whether they're
# considered findable.
LOCATION_STALE_SECONDS = 180


class LocationIn(BaseModel):
    lat: float
    lng: float


def _is_valid_coordinate(lat: float, lng: float) -> bool:
    return -90 <= lat <= 90 and -180 <= lng <= 180


@router.put("/drivers/location")
async def update_driver_location(data: LocationIn, user: dict = Depends(get_current_user)):
    if not _is_valid_coordinate(data.lat, data.lng):
        raise HTTPException(status_code=400, detail="Kowòdone pa valab.")
    d = await db.transport_drivers.find_one({"user_id": user["id"]})
    if not d:
        raise HTTPException(status_code=404, detail="Ou pa gen yon pwofil Chofè.")
    if not user.get("is_moto_driver") or d.get("verification_status") != "verified":
        raise HTTPException(status_code=403, detail="Chofè ou poko verifye.")
    # A driver can only ever write THEIR OWN location — the query is keyed
    # on user_id from the authenticated token, never a client-supplied id,
    # so one driver can't overwrite another's coordinates.
    await db.driver_locations.update_one(
        {"driver_id": user["id"]},
        {"$set": {
            "driver_id": user["id"],
            "location": {"type": "Point", "coordinates": [data.lng, data.lat]},
            "status": d.get("status", "offline"),
            "updated_at": now_iso(),
        }},
        upsert=True,
    )
    return {"message": "ok"}


def _seconds_since(iso_ts: str) -> float:
    from datetime import datetime, timezone
    try:
        then = datetime.fromisoformat(iso_ts)
        return (datetime.now(timezone.utc) - then).total_seconds()
    except Exception:
        return float("inf")


async def find_nearby_available_drivers(lng: float, lat: float, service_type: Optional[str] = None, radius_km: float = 5.0, limit: int = 20) -> list:
    """Reusable geospatial query — the actual matching engine (Phase 3) will
    call this directly rather than duplicating the query. Only returns
    drivers who are simultaneously: verified, marked 'available', AND have
    a location fresh within LOCATION_STALE_SECONDS. Distance calculation
    happens in MongoDB via $near, never by loading every driver into the
    app and computing distances in Python/JS."""
    locs = await db.driver_locations.find({
        "location": {"$near": {"$geometry": {"type": "Point", "coordinates": [lng, lat]}, "$maxDistance": radius_km * 1000}},
        "status": "available",
    }, NO_ID).to_list(limit * 3)  # over-fetch a bit before filtering staleness/verification below

    fresh_locs = [l for l in locs if _seconds_since(l["updated_at"]) <= LOCATION_STALE_SECONDS]
    driver_ids = [l["driver_id"] for l in fresh_locs]
    if not driver_ids:
        return []

    query = {"user_id": {"$in": driver_ids}, "verification_status": "verified", "status": "available"}
    if service_type:
        query["service_types"] = service_type
    drivers = await db.transport_drivers.find(query, NO_ID).to_list(limit)
    loc_by_driver = {l["driver_id"]: l for l in fresh_locs}
    results = []
    for d in drivers:
        loc = loc_by_driver.get(d["user_id"])
        if loc:
            results.append({**_public_driver(d), "coordinates": loc["location"]["coordinates"]})
    return results[:limit]


@router.get("/admin/nearby-drivers-check")
async def admin_check_nearby_drivers(lat: float, lng: float, radius_km: float = 5.0, admin: dict = Depends(get_admin)):
    """Diagnostic endpoint so Phase 2's geospatial query can be verified
    end-to-end before Phase 3 (the real client-facing matching engine)
    exists to exercise it."""
    return await find_nearby_available_drivers(lng, lat, radius_km=radius_km)


# ================= Phase 3 — Requests + Matching Engine =================
REQUEST_EXPIRY_SECONDS = 180  # if no driver accepts within this window, NO_DRIVER_FOUND
MAX_DRIVERS_NOTIFIED = 5
SEARCH_RADII_KM = [2, 5, 10]  # progressive — stop at the first radius with candidates


class RequestIn(BaseModel):
    service_type: ServiceType
    pickup_address: str
    pickup_lat: float
    pickup_lng: float
    destination_address: str
    # No geocoding service exists in this project to turn a typed address
    # into coordinates, and matching only needs the PICKUP point (drivers
    # are found near where they'll pick up, not the destination) — so
    # destination coordinates are optional, kept only for a future map
    # integration, never faked.
    destination_lat: Optional[float] = None
    destination_lng: Optional[float] = None
    passenger_count: Optional[int] = 1
    package_description: str = ""
    notes: str = ""


def _public_request(r: dict) -> dict:
    return {
        "id": r["id"],
        "service_type": r["service_type"],
        "pickup_address": r["pickup_address"],
        "destination_address": r["destination_address"],
        "passenger_count": r.get("passenger_count"),
        "package_description": r.get("package_description", ""),
        "notes": r.get("notes", ""),
        "status": r["status"],
        "matched_driver_id": r.get("matched_driver_id"),
        "conversation_id": r.get("conversation_id"),
        "created_at": r["created_at"],
    }


@router.post("/requests")
async def create_request(data: RequestIn, user: dict = Depends(get_current_user)):
    has_destination_coords = data.destination_lat is not None and data.destination_lng is not None
    if not _is_valid_coordinate(data.pickup_lat, data.pickup_lng) or (has_destination_coords and not _is_valid_coordinate(data.destination_lat, data.destination_lng)):
        raise HTTPException(status_code=400, detail="Kowòdone pa valab.")

    # Progressive radius search — stop at the first radius with any
    # candidates, rather than always searching the widest radius (keeps
    # notifications targeted, per spec section 16).
    candidates = []
    for radius in SEARCH_RADII_KM:
        candidates = await find_nearby_available_drivers(data.pickup_lng, data.pickup_lat, service_type=data.service_type, radius_km=radius, limit=MAX_DRIVERS_NOTIFIED)
        if candidates:
            break

    request_id = str(uuid.uuid4())
    notified_ids = [c["user_id"] for c in candidates]
    status = "matching" if notified_ids else "no_driver_found"

    req = {
        "id": request_id,
        "requester_id": user["id"],
        "service_type": data.service_type,
        "pickup_address": data.pickup_address,
        "pickup_location": {"type": "Point", "coordinates": [data.pickup_lng, data.pickup_lat]},
        "destination_address": data.destination_address,
        "destination_location": (
            {"type": "Point", "coordinates": [data.destination_lng, data.destination_lat]}
            if data.destination_lat is not None and data.destination_lng is not None else None
        ),
        "passenger_count": data.passenger_count,
        "package_description": data.package_description,
        "notes": data.notes,
        "status": status,
        "notified_driver_ids": notified_ids,
        "matched_driver_id": None,
        "conversation_id": None,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.transport_requests.insert_one(dict(req))

    label = "Moto Taxi" if data.service_type == "moto_taxi" else "Livrezon"
    for driver_id in notified_ids:
        await create_notification(
            driver_id, "transport_request",
            f"🏍️ Nouvo demand {label}: {data.pickup_address} → {data.destination_address}",
            f"/transport-request-incoming?id={request_id}",
        )

    return _public_request(req)


@router.get("/requests/mine")
async def my_requests(user: dict = Depends(get_current_user)):
    reqs = await db.transport_requests.find({"requester_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(50)
    return [_public_request(r) for r in reqs]


@router.get("/requests/{rid}")
async def get_request(rid: str, user: dict = Depends(get_current_user)):
    r = await db.transport_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["requester_id"] != user["id"] and user["id"] not in r.get("notified_driver_ids", []) and r.get("matched_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Aksè refize.")
    # A "matching" request whose window has passed and nobody accepted
    # flips to NO_DRIVER_FOUND the next time anyone checks it — no
    # background job needed for this MVP.
    if r["status"] == "matching" and _seconds_since(r["created_at"]) > REQUEST_EXPIRY_SECONDS:
        await db.transport_requests.update_one({"id": rid}, {"$set": {"status": "no_driver_found", "updated_at": now_iso()}})
        r["status"] = "no_driver_found"
    return _public_request(r)


@router.get("/driver/pending-requests")
async def driver_pending_requests(user: dict = Depends(get_current_user)):
    reqs = await db.transport_requests.find({"notified_driver_ids": user["id"], "status": "matching"}, NO_ID).sort("created_at", -1).to_list(20)
    return [_public_request(r) for r in reqs]


@router.post("/requests/{rid}/accept")
async def accept_request(rid: str, user: dict = Depends(get_current_user)):
    d = await db.transport_drivers.find_one({"user_id": user["id"]})
    if not d or d.get("verification_status") != "verified" or not user.get("is_moto_driver"):
        raise HTTPException(status_code=403, detail="Chofè ou poko verifye.")
    if user["id"] not in (await db.transport_requests.find_one({"id": rid}, {"notified_driver_ids": 1}) or {}).get("notified_driver_ids", []):
        raise HTTPException(status_code=403, detail="Ou pa t nan lis chofè yo kontakte pou demann sa a.")

    # Atomic: the filter requires status still "matching" — if two drivers
    # race to accept, only the FIRST update that matches wins; the second
    # gets modified_count == 0 and learns the request is already taken.
    # This is the mechanism, not a lock/queue — MongoDB guarantees a single
    # document update is atomic.
    result = await db.transport_requests.update_one(
        {"id": rid, "status": "matching"},
        {"$set": {"status": "accepted", "matched_driver_id": user["id"], "updated_at": now_iso()}},
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=409, detail="Demann sa a deja pran pa yon lòt chofè, oswa li ekspire.")

    r = await db.transport_requests.find_one({"id": rid})
    await db.transport_drivers.update_one({"user_id": user["id"]}, {"$set": {"status": "busy"}})

    # Reuse the EXISTING conversations collection/format — a Transport
    # match is now a legitimate DealLakay relationship, same principle as
    # a Deal Alert response already grants Messenger access.
    existing_conv = await db.conversations.find_one({
        "product_id": None,
        "$or": [
            {"buyer_id": r["requester_id"], "seller_id": user["id"]},
            {"buyer_id": user["id"], "seller_id": r["requester_id"]},
        ],
    })
    if existing_conv:
        conv_id = existing_conv["id"]
    else:
        client = await db.users.find_one({"id": r["requester_id"]}, NO_ID)
        driver_user = await db.users.find_one({"id": user["id"]}, NO_ID)
        conv_id = str(uuid.uuid4())
        await db.conversations.insert_one({
            "id": conv_id,
            "product_id": None,
            "product_title": f"🏍️ {r['pickup_address']} → {r['destination_address']}",
            "product_image": (driver_user or {}).get("avatar", ""),
            "buyer_id": r["requester_id"],
            "buyer_username": (client or {}).get("username", ""),
            "seller_id": user["id"],
            "seller_username": (driver_user or {}).get("username", ""),
            "last_message": "",
            "transport_request_id": rid,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
    await db.transport_requests.update_one({"id": rid}, {"$set": {"conversation_id": conv_id}})

    await create_notification(r["requester_id"], "transport_accepted", "🏍️ Yon chofè aksepte demann ou an!", f"/active-trip?id={rid}")
    return _public_request(await db.transport_requests.find_one({"id": rid}))


@router.post("/requests/{rid}/reject")
async def reject_request(rid: str, user: dict = Depends(get_current_user)):
    await db.transport_requests.update_one({"id": rid}, {"$pull": {"notified_driver_ids": user["id"]}})
    return {"message": "ok"}


@router.post("/requests/{rid}/cancel")
async def cancel_request(rid: str, user: dict = Depends(get_current_user)):
    r = await db.transport_requests.find_one({"id": rid})
    if not r or r["requester_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["status"] in ("trip_started", "trip_completed"):
        raise HTTPException(status_code=400, detail="Ou pa ka anile yon kous ki deja kòmanse.")
    await db.transport_requests.update_one({"id": rid}, {"$set": {"status": "cancelled", "updated_at": now_iso()}})
    if r.get("matched_driver_id"):
        await db.transport_drivers.update_one({"user_id": r["matched_driver_id"]}, {"$set": {"status": "available"}})
        await create_notification(r["matched_driver_id"], "transport_cancelled", "Kliyan an anile demann lan.", "")
    return {"message": "ok"}


# ================= Phase 4 — Trip Lifecycle =================
# Status progression after "accepted": accepted (driver en route) →
# arrived → trip_started → trip_completed. Each transition is guarded so
# a step can never be skipped or done out of order (e.g. a driver cannot
# complete a trip that never started).
_TRIP_TRANSITIONS = {
    "arrived": "accepted",
    "start": "arrived",
    "complete": "trip_started",
}
_TRIP_NEW_STATUS = {
    "arrived": "arrived",
    "start": "trip_started",
    "complete": "trip_completed",
}


async def _driver_trip_action(rid: str, action: str, user: dict) -> dict:
    r = await db.transport_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r.get("matched_driver_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Ou pa chofè ki matche ak kous sa a.")
    required_status = _TRIP_TRANSITIONS[action]
    if r["status"] != required_status:
        raise HTTPException(status_code=400, detail=f"Kous la dwe nan estati '{required_status}' anvan sa a.")
    new_status = _TRIP_NEW_STATUS[action]
    await db.transport_requests.update_one({"id": rid}, {"$set": {"status": new_status, "updated_at": now_iso()}})
    return await db.transport_requests.find_one({"id": rid})


@router.post("/requests/{rid}/arrived")
async def mark_arrived(rid: str, user: dict = Depends(get_current_user)):
    r = await _driver_trip_action(rid, "arrived", user)
    await create_notification(r["requester_id"], "driver_arrived", "📍 Chofè a rive!", f"/active-trip?id={rid}")
    return _public_request(r)


@router.post("/requests/{rid}/start")
async def start_trip(rid: str, user: dict = Depends(get_current_user)):
    r = await _driver_trip_action(rid, "start", user)
    await create_notification(r["requester_id"], "trip_started", "🏍️ Kous la kòmanse.", f"/active-trip?id={rid}")
    return _public_request(r)


@router.post("/requests/{rid}/complete")
async def complete_trip(rid: str, user: dict = Depends(get_current_user)):
    r = await _driver_trip_action(rid, "complete", user)
    await db.transport_drivers.update_one({"user_id": user["id"]}, {"$set": {"status": "available"}})
    await create_notification(r["requester_id"], "trip_completed", "✅ Kous la fini. Mèsi paske w itilize DealLakay!", f"/active-trip?id={rid}")
    return _public_request(r)


@router.get("/history")
async def transport_history(user: dict = Depends(get_current_user)):
    """Both roles use the same endpoint — results differ based on whether
    the caller is the requester or the matched driver on each record."""
    reqs = await db.transport_requests.find({
        "$or": [{"requester_id": user["id"]}, {"matched_driver_id": user["id"]}],
        "status": {"$in": ["trip_completed", "cancelled", "no_driver_found"]},
    }, NO_ID).sort("updated_at", -1).to_list(100)
    return [_public_request(r) for r in reqs]


# ================= Phase 6 — Admin Live Activity =================
@router.get("/admin/live-activity")
async def admin_live_activity(admin: dict = Depends(get_admin)):
    """Real-time snapshot for the Admin Dashboard — reuses existing
    collections, no separate tracking system."""
    return {
        "active_trips": await db.transport_requests.count_documents({"status": {"$in": ["accepted", "arrived", "trip_started"]}}),
        "available_drivers": await db.transport_drivers.count_documents({"status": "available", "verification_status": "verified"}),
        "busy_drivers": await db.transport_drivers.count_documents({"status": "busy", "verification_status": "verified"}),
        "requests_today": await db.transport_requests.count_documents({"created_at": {"$gte": (now_iso()[:10])}}),
        "no_driver_found_today": await db.transport_requests.count_documents({"status": "no_driver_found", "created_at": {"$gte": (now_iso()[:10])}}),
    }
