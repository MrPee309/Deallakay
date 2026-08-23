"""
Deal Alerts: DEMAND ("I'm looking for X") and OFFER ("I have X available")
posts. A basic client can only create/see their own DEMAND alerts. Technicians
and sellers can create both types and discover relevant community alerts from
other users. Verified international suppliers (suppliers.status == "active")
see the entire DEMAND + OFFER pool. Reuses the existing product/notification
system — no new database beyond the existing deal_alerts collection, extended
with an alert_type field and a few OFFER-relevant fields.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from shared import db, NO_ID, now_iso, get_current_user

router = APIRouter(prefix="/api", tags=["alerts"])

ALERT_TYPES = ("DEMAND", "OFFER")


class AlertIn(BaseModel):
    alert_type: str = "DEMAND"
    keyword: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    quantity: Optional[int] = None
    condition: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    max_price: Optional[float] = None  # DEMAND: most the requester will pay
    price: Optional[float] = None      # OFFER: the seller/technician's asking price


async def _is_verified_supplier(user_id: str) -> bool:
    s = await db.suppliers.find_one({"user_id": user_id, "status": "active"})
    return s is not None


def _creator_role_label(u: dict) -> str:
    if u.get("is_technician") and u.get("is_seller"):
        return "Teknisyen & Vandè"
    if u.get("is_technician"):
        return "Teknisyen"
    if u.get("is_seller"):
        return "Vandè"
    return "Kliyan"


@router.post("/alerts")
async def create_alert(data: AlertIn, user: dict = Depends(get_current_user)):
    alert_type = (data.alert_type or "DEMAND").upper()
    if alert_type not in ALERT_TYPES:
        raise HTTPException(status_code=400, detail="Kalite alèt pa valab.")

    # Business rule: only technicians/sellers may post an OFFER ("I have this
    # available"). A basic client may only ever post a DEMAND. Enforced here,
    # server-side — never trust a frontend-submitted alert_type/role.
    if alert_type == "OFFER" and not (user.get("is_technician") or user.get("is_seller")):
        raise HTTPException(status_code=403, detail="Sèlman teknisyen ak vandè ka poste yon Òf.")

    if not any([data.keyword, data.category, data.department, data.max_price, data.price]):
        raise HTTPException(status_code=400, detail="Mete omwen yon kritè pou alèt la.")
    if await db.deal_alerts.count_documents({"user_id": user["id"]}) >= 20:
        raise HTTPException(status_code=400, detail="Maksimòm 20 alèt pou chak itilizatè.")

    alert = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "alert_type": alert_type,
        "keyword": (data.keyword or "").strip() or None,
        "category": data.category,
        "subcategory": data.subcategory,
        "brand": data.brand,
        "model": data.model,
        "quantity": data.quantity,
        "condition": data.condition,
        "description": (data.description or "").strip() or None,
        "department": data.department,
        "city": data.city,
        "max_price": data.max_price,
        "price": data.price,
        "active": True,
        "created_at": now_iso(),
    }
    await db.deal_alerts.insert_one(dict(alert))
    return {k: v for k, v in alert.items() if k != "_id"}


@router.get("/alerts")
async def my_alerts(user: dict = Depends(get_current_user)):
    return await db.deal_alerts.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(50)


@router.get("/alerts/discover")
async def discover_alerts(
    category: Optional[str] = None,
    department: Optional[str] = None,
    alert_type: Optional[str] = None,
    user: dict = Depends(get_current_user),
):
    """Community alerts from OTHER users — visibility enforced here, not the
    frontend. A basic client (no technician/seller role, not a verified
    supplier, not admin) gets an empty list: per business rule they can only
    ever see their own alerts."""
    is_admin = user.get("role") == "admin"
    is_supplier = await _is_verified_supplier(user["id"])
    is_pro = user.get("is_technician") or user.get("is_seller")

    if not (is_admin or is_supplier or is_pro):
        return []

    query: dict = {"active": True, "user_id": {"$ne": user["id"]}}
    if alert_type and alert_type.upper() in ALERT_TYPES:
        query["alert_type"] = alert_type.upper()
    if category:
        query["category"] = category
    if department:
        query["department"] = department

    # Technicians/sellers (not verified suppliers/admin) get a lightly relevance-
    # scoped feed via the optional category/department filters above — full
    # automatic relevance matching (specialty/inventory inference) is out of
    # scope for this phase, per spec. Verified suppliers and admins see the
    # unrestricted pool.
    alerts = await db.deal_alerts.find(query, NO_ID).sort("created_at", -1).to_list(100)

    creator_ids = list({a["user_id"] for a in alerts})
    creators = await db.users.find({"id": {"$in": creator_ids}}, NO_ID).to_list(len(creator_ids) or 1)
    creator_map = {c["id"]: c for c in creators}
    for a in alerts:
        c = creator_map.get(a["user_id"], {})
        a["creator_name"] = c.get("full_name", "Itilizatè")
        a["creator_role"] = _creator_role_label(c)

    return alerts


@router.put("/alerts/{aid}")
async def update_alert(aid: str, data: AlertIn, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    alert_type = (data.alert_type or a.get("alert_type", "DEMAND")).upper()
    if alert_type == "OFFER" and not (user.get("is_technician") or user.get("is_seller")):
        raise HTTPException(status_code=403, detail="Sèlman teknisyen ak vandè ka poste yon Òf.")
    updates = data.model_dump()
    updates["alert_type"] = alert_type
    updates["keyword"] = (updates.get("keyword") or "").strip() or None
    updates["description"] = (updates.get("description") or "").strip() or None
    await db.deal_alerts.update_one({"id": aid}, {"$set": updates})
    return {"message": "Alèt modifye."}


@router.put("/alerts/{aid}/toggle")
async def toggle_alert(aid: str, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    await db.deal_alerts.update_one({"id": aid}, {"$set": {"active": not a.get("active", True)}})
    return {"message": "ok"}


@router.delete("/alerts/{aid}")
async def delete_alert(aid: str, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    await db.deal_alerts.delete_one({"id": aid})
    return {"message": "Alèt efase."}
