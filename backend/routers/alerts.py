"""
Deal Alerts: a buyer sets criteria (keyword, category/subcategory, department/
city, max price) and gets notified automatically when a new product matching
those criteria is published — reuses the existing product/notification system,
just a new small collection to store each user's saved search criteria.
"""
import uuid
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from shared import db, NO_ID, now_iso, get_current_user

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


class AlertIn(BaseModel):
    keyword: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    department: Optional[str] = None
    city: Optional[str] = None
    max_price: Optional[float] = None


@router.post("")
async def create_alert(data: AlertIn, user: dict = Depends(get_current_user)):
    if not any([data.keyword, data.category, data.department, data.max_price]):
        raise HTTPException(status_code=400, detail="Mete omwen yon kritè pou alèt la.")
    if await db.deal_alerts.count_documents({"user_id": user["id"]}) >= 20:
        raise HTTPException(status_code=400, detail="Maksimòm 20 alèt pou chak itilizatè.")
    alert = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "keyword": (data.keyword or "").strip() or None,
        "category": data.category,
        "subcategory": data.subcategory,
        "department": data.department,
        "city": data.city,
        "max_price": data.max_price,
        "active": True,
        "created_at": now_iso(),
    }
    await db.deal_alerts.insert_one(dict(alert))
    return {k: v for k, v in alert.items() if k != "_id"}


@router.get("")
async def my_alerts(user: dict = Depends(get_current_user)):
    return await db.deal_alerts.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(50)


@router.put("/{aid}")
async def update_alert(aid: str, data: AlertIn, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    updates = data.model_dump()
    updates["keyword"] = (updates.get("keyword") or "").strip() or None
    await db.deal_alerts.update_one({"id": aid}, {"$set": updates})
    return {"message": "Alèt modifye."}


@router.put("/{aid}/toggle")
async def toggle_alert(aid: str, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    await db.deal_alerts.update_one({"id": aid}, {"$set": {"active": not a.get("active", True)}})
    return {"message": "ok"}


@router.delete("/{aid}")
async def delete_alert(aid: str, user: dict = Depends(get_current_user)):
    a = await db.deal_alerts.find_one({"id": aid})
    if not a or a["user_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Alèt pa jwenn.")
    await db.deal_alerts.delete_one({"id": aid})
    return {"message": "Alèt efase."}
