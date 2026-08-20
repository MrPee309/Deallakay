"""
Request a Part: a buyer posts what they're looking for (a part, device, or
repair) that they couldn't find on the marketplace; sellers/technicians can
respond with offers. Reuses the existing users/notifications/location system —
new collections (part_requests, part_offers) since this is a genuinely new
relationship, not a duplicate of the products/marketplace system.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

import security
from shared import db, NO_ID, now_iso, get_current_user, create_notification

router = APIRouter(prefix="/api", tags=["requests"])


class PartRequestIn(BaseModel):
    title: str
    description: str = ""
    category: Optional[str] = None
    department: str
    city: str
    images: List[str] = []


class OfferIn(BaseModel):
    price: float
    message: str = ""
    images: List[str] = []


@router.post("/requests")
async def create_request(data: PartRequestIn, user: dict = Depends(get_current_user)):
    if not data.title.strip():
        raise HTTPException(status_code=400, detail="Antre yon tit.")
    if not data.category:
        raise HTTPException(status_code=400, detail="Chwazi yon kategori.")
    if not data.department.strip() or not data.city.strip():
        raise HTTPException(status_code=400, detail="Chwazi depatman ak vil ou.")
    security.validate_images(data.images)
    req = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "title": data.title.strip(),
        "description": data.description,
        "category": data.category,
        "department": data.department,
        "city": data.city,
        "images": data.images[:6],
        "status": "open",
        "offer_count": 0,
        "created_at": now_iso(),
    }
    await db.part_requests.insert_one(dict(req))
    # Target the alert: if the requester picked a category, notify sellers who
    # have actually listed products in that category (i.e. relevant to what's
    # being asked for) plus every technician (a technician can often help
    # regardless of category). With no category chosen, fall back to alerting
    # every seller/technician so the request still gets seen.
    if data.category:
        relevant_seller_ids = await db.products.distinct("seller_id", {"category": data.category})
        notify_targets = await db.users.find(
            {"id": {"$ne": user["id"]}, "$or": [{"id": {"$in": relevant_seller_ids}}, {"is_technician": True}]},
            {"id": 1},
        ).to_list(5000)
    else:
        notify_targets = await db.users.find(
            {"id": {"$ne": user["id"]}, "$or": [{"is_seller": True}, {"is_technician": True}]},
            {"id": 1},
        ).to_list(5000)
    for t in notify_targets:
        await create_notification(t["id"], "new_request", f"Nouvo demann: '{req['title']}'", f"/requests/{req['id']}")
    return {k: v for k, v in req.items() if k != "_id"}


@router.get("/requests")
async def list_requests(category: Optional[str] = None, department: Optional[str] = None, page: int = 1, limit: int = 20):
    query: dict = {"status": "open"}
    if category:
        query["category"] = category
    if department:
        query["department"] = department
    total = await db.part_requests.count_documents(query)
    skip = max(0, (page - 1) * limit)
    items = await db.part_requests.find(query, NO_ID).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"requests": items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.get("/requests/my")
async def my_requests(user: dict = Depends(get_current_user)):
    return await db.part_requests.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(200)


@router.get("/requests/{rid}")
async def get_request(rid: str, user: dict = Depends(get_current_user)):
    r = await db.part_requests.find_one({"id": rid}, NO_ID)
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    is_owner = r["user_id"] == user["id"]
    offers = await db.part_offers.find({"request_id": rid}, NO_ID).sort("created_at", 1).to_list(200) if is_owner else []
    my_offer = None if is_owner else await db.part_offers.find_one({"request_id": rid, "seller_id": user["id"]}, NO_ID)
    return {"request": r, "offers": offers, "is_owner": is_owner, "my_offer": my_offer}


@router.put("/requests/{rid}/close")
async def close_request(rid: str, user: dict = Depends(get_current_user)):
    r = await db.part_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.part_requests.update_one({"id": rid}, {"$set": {"status": "closed"}})
    return {"message": "Demann fèmen."}


@router.put("/requests/{rid}/offers/{oid}/propose-accept")
async def propose_accept_offer(rid: str, oid: str, user: dict = Depends(get_current_user)):
    """Owner's side of the handshake: signals intent to accept, but the deal
    only becomes final once the offerer confirms via /confirm below — an
    offer can't be accepted unilaterally without the offerer agreeing too."""
    r = await db.part_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    if r["status"] != "open":
        raise HTTPException(status_code=400, detail="Demann sa deja fèmen/rezoud.")
    o = await db.part_offers.find_one({"id": oid, "request_id": rid})
    if not o:
        raise HTTPException(status_code=404, detail="Òf pa jwenn.")
    await db.part_offers.update_one({"id": oid}, {"$set": {"owner_accepted": True}})
    await create_notification(o["seller_id"], "offer_proposed", f"@{user['username']} vle aksepte òf ou sou '{r['title']}' — konfime pou fini.", f"/requests/{rid}")
    return {"message": "Pwopozisyon voye. Tann konfimasyon moun ki fè òf la."}


@router.put("/requests/{rid}/offers/{oid}/confirm")
async def confirm_offer(rid: str, oid: str, user: dict = Depends(get_current_user)):
    """Offerer's side of the handshake — only they can finalize their own offer."""
    o = await db.part_offers.find_one({"id": oid, "request_id": rid})
    if not o:
        raise HTTPException(status_code=404, detail="Òf pa jwenn.")
    if o["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    if not o.get("owner_accepted"):
        raise HTTPException(status_code=400, detail="Pwopriyetè demann lan poko pwopoze aksepte òf sa.")
    r = await db.part_requests.find_one({"id": rid})
    if not r or r["status"] != "open":
        raise HTTPException(status_code=400, detail="Demann sa pa disponib ankò.")
    await db.part_offers.update_one({"id": oid}, {"$set": {"seller_confirmed": True}})
    await db.part_requests.update_one({"id": rid}, {"$set": {"status": "fulfilled", "accepted_offer_id": oid}})
    await create_notification(r["user_id"], "offer_confirmed", f"@{user['username']} konfime — antant lan fini pou '{r['title']}'!", f"/requests/{rid}")
    return {"message": "Konfime! Antant lan fini."}


@router.put("/requests/{rid}/offers/{oid}/decline")
async def decline_offer_proposal(rid: str, oid: str, user: dict = Depends(get_current_user)):
    """Offerer declines the owner's accept proposal (e.g. after discussing and
    changing their mind) — resets the proposal instead of forcing a deal through."""
    o = await db.part_offers.find_one({"id": oid, "request_id": rid})
    if not o:
        raise HTTPException(status_code=404, detail="Òf pa jwenn.")
    if o["seller_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    r = await db.part_requests.find_one({"id": rid})
    await db.part_offers.update_one({"id": oid}, {"$set": {"owner_accepted": False}})
    if r:
        await create_notification(r["user_id"], "offer_declined", f"@{user['username']} pa dakò ak pwopozisyon an sou '{r['title']}'.", f"/requests/{rid}")
    return {"message": "Pwopozisyon refize."}


@router.delete("/requests/{rid}")
async def delete_request(rid: str, user: dict = Depends(get_current_user)):
    r = await db.part_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    await db.part_requests.delete_one({"id": rid})
    await db.part_offers.delete_many({"request_id": rid})
    return {"message": "Demann efase."}


@router.post("/requests/{rid}/offers")
async def create_offer(rid: str, data: OfferIn, user: dict = Depends(get_current_user)):
    if not (user.get("is_seller") or user.get("is_technician")):
        raise HTTPException(status_code=403, detail="Ou dwe vandè oswa teknisyen pou fè yon òf.")
    r = await db.part_requests.find_one({"id": rid})
    if not r:
        raise HTTPException(status_code=404, detail="Demann pa jwenn.")
    if r["status"] != "open":
        raise HTTPException(status_code=400, detail="Demann sa fèmen deja.")
    if r["user_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka fè òf sou pwòp demann ou.")
    if data.price <= 0:
        raise HTTPException(status_code=400, detail="Antre yon pri valab.")
    if await db.part_offers.find_one({"request_id": rid, "seller_id": user["id"]}):
        raise HTTPException(status_code=400, detail="Ou deja fè yon òf sou demann sa.")
    security.validate_images(data.images)
    offer = {
        "id": str(uuid.uuid4()),
        "request_id": rid,
        "seller_id": user["id"],
        "seller_username": user["username"],
        "is_technician": user.get("is_technician", False),
        "is_seller": user.get("is_seller", False),
        "price": data.price,
        "message": data.message,
        "images": data.images[:6],
        "owner_accepted": False,
        "seller_confirmed": False,
        "created_at": now_iso(),
    }
    await db.part_offers.insert_one(dict(offer))
    await db.part_requests.update_one({"id": rid}, {"$inc": {"offer_count": 1}})
    await create_notification(r["user_id"], "offer", f"@{user['username']} fè yon òf sou demann '{r['title']}'", f"/requests/{rid}")
    return {k: v for k, v in offer.items() if k != "_id"}
