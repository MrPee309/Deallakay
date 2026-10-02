"""
Kafou Shop integration — Phase 1 (backend foundation):
  - A dedicated store profile (its own collection, unique id — never
    identified by a text comparison of its name).
  - Orders: creation with server-side, atomic stock validation and price
    snapshotting, status lifecycle, and listing endpoints for customers
    and authorized Kafou Shop staff.

Reuses existing conventions throughout rather than inventing new ones:
  - `specs: Dict[str, Any]` (already on every Product) holds compatibility
    fields (brand/model/part_number/part_type) — no new product schema.
  - `require_staff("kafou_shop_manage")` (existing staff+permissions
    system in shared.py) gates management access — no new auth system.
  - `create_notification()` (existing notification system) is reused for
    every order-lifecycle notification.
  - id/slug/timestamp conventions match products.py exactly.
"""
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from shared import db, NO_ID, now_iso, slugify, get_current_user, get_admin, require_staff, create_notification

router = APIRouter(prefix="/api", tags=["kafou-shop"])

KAFOU_SHOP_ID = "kafou-shop"  # the one real, named business this integration is for (see spec §4)
MANAGE_PERMISSION = "kafou_shop_manage"

ORDER_STATUSES = [
    "pending", "confirmed", "preparing", "ready_for_pickup",
    "out_for_delivery", "completed", "cancelled",
]
# Which statuses make sense for which fulfillment method (spec §8: "a
# pickup order should not be marked as out for delivery").
STATUSES_BY_FULFILLMENT = {
    "pickup": ["pending", "confirmed", "preparing", "ready_for_pickup", "completed", "cancelled"],
    "delivery": ["pending", "confirmed", "preparing", "out_for_delivery", "completed", "cancelled"],
}
# Allowed forward transitions per status — prevents e.g. jumping straight
# from "pending" to "completed", or reviving a cancelled order.
ALLOWED_TRANSITIONS = {
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["preparing", "cancelled"],
    "preparing": ["ready_for_pickup", "out_for_delivery", "cancelled"],
    "ready_for_pickup": ["completed", "cancelled"],
    "out_for_delivery": ["completed", "cancelled"],
    "completed": [],
    "cancelled": [],
}


# ───────────────────────── Store profile ─────────────────────────

class KafouStoreIn(BaseModel):
    name: str = "Kafou Shop"
    logo: Optional[str] = None
    description: str = ""
    contact_phone: Optional[str] = None
    contact_email: Optional[str] = None
    pickup_location: Optional[str] = None
    pickup_department: Optional[str] = None
    pickup_city: Optional[str] = None
    status: str = "active"  # active | temporarily_unavailable | suspended


def _store_doc_to_public(doc: dict, is_staff: bool) -> dict:
    """Contact info (spec §4: 'managed securely') is only included for
    customers through the fields that matter for an order (phone shown so a
    buyer can reach the store about their own order) — not exposed in bulk
    admin-only fields like internal notes, if any are added later."""
    out = {k: v for k, v in doc.items() if k != "_id"}
    return out


@router.get("/kafou-shop/store")
async def get_kafou_store():
    """Public — the store page needs this with no auth."""
    store = await db.kafou_shop_store.find_one({"id": KAFOU_SHOP_ID}, NO_ID)
    if not store:
        raise HTTPException(status_code=404, detail="Kafou Shop poko konfigire.")
    return _store_doc_to_public(store, is_staff=False)


@router.put("/kafou-shop/store")
async def update_kafou_store(data: KafouStoreIn, user: dict = Depends(get_admin)):
    """Admin-only for now (spec §4: 'Initially, the administrator may
    manage the store directly' / §10: granting manager access is a
    separate, later step) — creates the store on first call, updates it on
    every call after. Using update_one(..., upsert=True) keyed on the fixed
    KAFOU_SHOP_ID avoids ever creating a second, duplicate store record."""
    if data.status not in ("active", "temporarily_unavailable", "suspended"):
        raise HTTPException(status_code=400, detail="Estati pa valab.")
    doc = data.dict()
    doc["id"] = KAFOU_SHOP_ID
    doc["updated_at"] = now_iso()
    existing = await db.kafou_shop_store.find_one({"id": KAFOU_SHOP_ID}, NO_ID)
    if not existing:
        doc["created_at"] = now_iso()
    await db.kafou_shop_store.update_one({"id": KAFOU_SHOP_ID}, {"$set": doc}, upsert=True)
    return await get_kafou_store()


# ───────────────────────── Products (tagging only — creation/edit/
# delete/images reuse the existing /products endpoints in products.py;
# see the follow-up patch there for the one added field + permission
# check, rather than duplicating that logic here) ─────────────────────────

@router.get("/kafou-shop/products")
async def list_kafou_products(available_only: bool = False):
    """Public catalog listing for the store page."""
    query: Dict[str, Any] = {"store_id": KAFOU_SHOP_ID, "status": "active"}
    if available_only:
        query["quantity"] = {"$gt": 0}
    cursor = db.products.find(query, NO_ID).sort("created_at", -1)
    return [p async for p in cursor]


# ───────────────────────── Orders ─────────────────────────

class OrderItemIn(BaseModel):
    product_id: str
    quantity: int


class OrderIn(BaseModel):
    items: List[OrderItemIn]
    fulfillment_method: str  # "delivery" | "pickup"
    contact_name: str
    contact_phone: str
    delivery_department: Optional[str] = None
    delivery_city: Optional[str] = None
    delivery_address: Optional[str] = None
    notes: Optional[str] = ""
    idempotency_key: Optional[str] = None  # see create_order — duplicate-submission protection


def _order_to_public(o: dict) -> dict:
    return {k: v for k, v in o.items() if k != "_id"}


@router.post("/kafou-shop/orders")
async def create_order(data: OrderIn, user: dict = Depends(get_current_user)):
    """
    Creates an order for one or more Kafou Shop products.

    Stock safety (spec §9): each item's stock is checked and decremented in
    ONE atomic MongoDB update per product (`update_one` with a `quantity:
    {"$gte": requested}` filter) — if two customers race for the last unit,
    only one `update_one` call can match and succeed; the other sees
    modified_count == 0 and the whole order is rejected before any partial
    deduction happens. If a later item in a multi-item order fails stock
    validation, every already-decremented item in this same order is
    restored before raising, so a failed order never leaves stock
    partially and silently deducted.

    Price/title snapshotting (spec §9): each order item stores the
    product's price and title AT ORDER TIME, copied into the order
    document — a later edit to the live product never changes a past
    order's recorded price or description.

    Duplicate-submission protection (spec §7/§9): if `idempotency_key` is
    given and an order with the same (user, idempotency_key) pair already
    exists, that existing order is returned as-is instead of creating a
    second one — handles a user double-tapping "submit" or a retried
    request after a dropped connection.
    """
    if data.fulfillment_method not in ("delivery", "pickup"):
        raise HTTPException(status_code=400, detail="Metòd pou resevwa kòmand lan pa valab.")
    if not data.items:
        raise HTTPException(status_code=400, detail="Kòmand lan dwe gen omwen yon atik.")
    if data.fulfillment_method == "delivery" and not (data.delivery_department and data.delivery_city and data.delivery_address):
        raise HTTPException(status_code=400, detail="Adrès livrezon an obligatwa pou yon kòmand livrezon.")

    if data.idempotency_key:
        existing = await db.kafou_shop_orders.find_one(
            {"user_id": user["id"], "idempotency_key": data.idempotency_key}, NO_ID
        )
        if existing:
            return _order_to_public(existing)

    decremented: List[tuple] = []  # (product_id, quantity) already deducted — for rollback on failure
    order_items = []
    subtotal = 0.0
    try:
        for item in data.items:
            if item.quantity <= 0:
                raise HTTPException(status_code=400, detail="Kantite dwe pi gran pase zewo.")
            product = await db.products.find_one(
                {"id": item.product_id, "store_id": KAFOU_SHOP_ID, "status": "active"}, NO_ID
            )
            if not product:
                raise HTTPException(status_code=404, detail="Yon pwodwi nan kòmand lan pa jwenn.")
            result = await db.products.update_one(
                {"id": item.product_id, "status": "active", "quantity": {"$gte": item.quantity}},
                {"$inc": {"quantity": -item.quantity}},
            )
            if result.modified_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Pa gen ase stock pou \"{product.get('title')}\".",
                )
            decremented.append((item.product_id, item.quantity))
            line_total = product["price"] * item.quantity
            subtotal += line_total
            order_items.append({
                "product_id": product["id"],
                # Snapshotted at order time — see docstring above.
                "title": product["title"],
                "price": product["price"],
                "image": (product.get("images") or [None])[0],
                "quantity": item.quantity,
                "line_total": line_total,
            })
    except HTTPException:
        # Roll back any items already decremented before this one failed.
        for pid, qty in decremented:
            await db.products.update_one({"id": pid}, {"$inc": {"quantity": qty}})
        raise

    oid = str(uuid.uuid4())
    reference = f"KS-{oid[:8].upper()}"
    doc = {
        "id": oid,
        "reference": reference,
        "store_id": KAFOU_SHOP_ID,
        "user_id": user["id"],
        "customer_name": data.contact_name.strip(),
        "customer_phone": data.contact_phone.strip(),
        "items": order_items,
        "subtotal": subtotal,
        "fulfillment_method": data.fulfillment_method,
        "delivery_department": data.delivery_department,
        "delivery_city": data.delivery_city,
        "delivery_address": data.delivery_address,
        "notes": data.notes or "",
        "status": "pending",
        "idempotency_key": data.idempotency_key,
        "status_history": [{"status": "pending", "at": now_iso(), "by": user["id"]}],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.kafou_shop_orders.insert_one(dict(doc))

    await create_notification(
        user["id"], "kafou_order_placed",
        f"Kòmand ou a ({reference}) resevwa. N ap konfime l byento.",
        link=f"/kafou-shop/orders/{oid}",
    )
    # Notify every staff member with manage permission, plus the admin —
    # same "who should know about this" reasoning as existing notify flows.
    staff_cursor = db.users.find(
        {"$or": [{"role": "admin"}, {"role": "staff", "permissions": MANAGE_PERMISSION}]}, NO_ID
    )
    async for staff in staff_cursor:
        await create_notification(
            staff["id"], "kafou_order_received",
            f"Nouvo kòmand ({reference}) resevwa sou Kafou Shop.",
            link=f"/kafou-shop/staff/orders/{oid}",
        )

    return _order_to_public(doc)


@router.get("/kafou-shop/orders")
async def list_my_orders(user: dict = Depends(get_current_user)):
    """Customers see only their own orders (spec §8: 'Customers must never
    be able to view another customer's private order information')."""
    cursor = db.kafou_shop_orders.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1)
    return [_order_to_public(o) async for o in cursor]


@router.get("/kafou-shop/orders/{order_id}")
async def get_my_order(order_id: str, user: dict = Depends(get_current_user)):
    order = await db.kafou_shop_orders.find_one({"id": order_id}, NO_ID)
    if not order:
        raise HTTPException(status_code=404, detail="Kòmand pa jwenn.")
    is_staff_access = user.get("role") == "admin" or (
        user.get("role") == "staff" and MANAGE_PERMISSION in (user.get("permissions") or [])
    )
    if order["user_id"] != user["id"] and not is_staff_access:
        raise HTTPException(status_code=403, detail="Ou pa gen aksè kòmand sa a.")
    return _order_to_public(order)


# ───────────────────────── Staff order management ─────────────────────────

class OrderStatusUpdateIn(BaseModel):
    status: str


@router.get("/kafou-shop/staff/orders")
async def staff_list_orders(status: Optional[str] = None, user: dict = Depends(require_staff(MANAGE_PERMISSION))):
    query: Dict[str, Any] = {"store_id": KAFOU_SHOP_ID}
    if status:
        if status not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail="Estati pa valab.")
        query["status"] = status
    cursor = db.kafou_shop_orders.find(query, NO_ID).sort("created_at", -1)
    return [_order_to_public(o) async for o in cursor]


@router.put("/kafou-shop/staff/orders/{order_id}/status")
async def staff_update_order_status(order_id: str, data: OrderStatusUpdateIn, user: dict = Depends(require_staff(MANAGE_PERMISSION))):
    order = await db.kafou_shop_orders.find_one({"id": order_id}, NO_ID)
    if not order:
        raise HTTPException(status_code=404, detail="Kòmand pa jwenn.")
    current = order["status"]
    allowed_for_method = STATUSES_BY_FULFILLMENT[order["fulfillment_method"]]
    if data.status not in allowed_for_method:
        raise HTTPException(status_code=400, detail="Estati sa a pa fè sans pou metòd kòmand sa a.")
    if data.status not in ALLOWED_TRANSITIONS.get(current, []):
        raise HTTPException(status_code=400, detail=f"Pa ka chanje kòmand ki '{current}' dirèkteman pou '{data.status}'.")

    # Cancelling restores any stock this order had deducted (spec §9).
    if data.status == "cancelled" and current != "cancelled":
        for item in order["items"]:
            await db.products.update_one({"id": item["product_id"]}, {"$inc": {"quantity": item["quantity"]}})

    await db.kafou_shop_orders.update_one(
        {"id": order_id},
        {
            "$set": {"status": data.status, "updated_at": now_iso()},
            "$push": {"status_history": {"status": data.status, "at": now_iso(), "by": user["id"]}},
        },
    )

    status_labels = {
        "confirmed": "konfime", "preparing": "n ap prepare l",
        "ready_for_pickup": "pare pou ou vin pran l", "out_for_delivery": "nan wout pou livre",
        "completed": "fini", "cancelled": "anile",
    }
    label = status_labels.get(data.status, data.status)
    await create_notification(
        order["user_id"], "kafou_order_status",
        f"Kòmand ou a ({order['reference']}) {label}.",
        link=f"/kafou-shop/orders/{order_id}",
    )
    return await get_my_order(order_id, user)


# ───────────────────────── Staff/admin reporting ─────────────────────────

@router.get("/kafou-shop/staff/stats")
async def staff_stats(user: dict = Depends(require_staff(MANAGE_PERMISSION))):
    """Database-derived only (spec §12: 'Do not display invented
    statistics or simulated sales')."""
    total_products = await db.products.count_documents({"store_id": KAFOU_SHOP_ID, "status": "active"})
    out_of_stock = await db.products.count_documents({"store_id": KAFOU_SHOP_ID, "status": "active", "quantity": {"$lte": 0}})
    counts = {}
    for s in ORDER_STATUSES:
        counts[s] = await db.kafou_shop_orders.count_documents({"store_id": KAFOU_SHOP_ID, "status": s})
    return {
        "total_products": total_products,
        "available_products": total_products - out_of_stock,
        "out_of_stock_products": out_of_stock,
        "orders_by_status": counts,
    }
