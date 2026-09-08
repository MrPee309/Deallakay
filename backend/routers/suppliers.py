"""
International Supplier directory: profiles (admin-approved before public),
supplier products, shipping services, and inquiries.

RECONSTRUCTED — this file was found overwritten with a duplicate copy of
products.py (identical content/line count) during a verification pass.
Rebuilt from the actual frontend contract (Suppliers.jsx, SupplierProfile.jsx,
BecomeSupplier.jsx) plus the admin.py endpoints that were still intact
(GET /admin/suppliers, PUT /admin/suppliers/{id}/{action}), which were
unaffected since they live in a different file. Test this file's endpoints
thoroughly before relying on it.
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

import auth as auth_lib
from shared import db, NO_ID, now_iso, get_current_user, create_notification

router = APIRouter(prefix="/api", tags=["suppliers"])

SUPPLIER_COUNTRIES = [
    {"name": "United States", "code": "+1"},
    {"name": "Dominican Republic", "code": "+1"},
    {"name": "China", "code": "+86"},
    {"name": "Panama", "code": "+507"},
    {"name": "France", "code": "+33"},
    {"name": "Canada", "code": "+1"},
    {"name": "Turkey", "code": "+90"},
    {"name": "United Arab Emirates", "code": "+971"},
    {"name": "Other", "code": ""},
]


class SupplierIn(BaseModel):
    company_name: str
    short_description: str = ""
    full_description: str = ""
    country: str
    state_province: str = ""
    city: str = ""
    website: str = ""
    supplier_types: List[str] = []
    categories: List[str] = []
    brands: List[str] = []
    years_in_business: Optional[int] = None
    wholesale_available: bool = False
    moq_info: str = ""
    ships_to_haiti: bool = False
    ships_internationally: bool = False
    contact_email: str = ""
    contact_phone: str
    show_contact_publicly: bool = False
    logo: str = ""


class SupplierProductIn(BaseModel):
    title: str
    description: str = ""
    price: Optional[float] = None
    moq: Optional[int] = None
    images: List[str] = []


class SupplierShippingServiceIn(BaseModel):
    name: str
    description: str = ""
    estimated_days: Optional[str] = None
    price_info: str = ""


class SupplierInquiryIn(BaseModel):
    product_requested: str
    quantity: int = 1
    message: str = ""


async def _optional_user(request: Request) -> Optional[dict]:
    """Same pattern as get_current_user, but returns None instead of 401 —
    supplier listings are public, but show more (private contact info, if
    the supplier opted in) to logged-in users."""
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        payload = auth_lib.decode_token(token)
        user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
        return user
    except Exception:
        return None


def _public_supplier(s: dict, authed: bool) -> dict:
    """Strips private contact fields unless the supplier opted in
    (show_contact_publicly) AND the viewer is logged in."""
    out = {
        "id": s["id"],
        "owner_id": s["owner_id"],
        "company_name": s["company_name"],
        "logo": s.get("logo", ""),
        "short_description": s.get("short_description", ""),
        "full_description": s.get("full_description", ""),
        "country": s.get("country", ""),
        "state_province": s.get("state_province", ""),
        "city": s.get("city", ""),
        "website": s.get("website", ""),
        "supplier_types": s.get("supplier_types", []),
        "categories": s.get("categories", []),
        "brands": s.get("brands", []),
        "years_in_business": s.get("years_in_business"),
        "wholesale_available": s.get("wholesale_available", False),
        "moq_info": s.get("moq_info", ""),
        "ships_to_haiti": s.get("ships_to_haiti", False),
        "ships_internationally": s.get("ships_internationally", False),
        "verified": s.get("verified", False),
        "featured": s.get("featured", False),
        "status": s.get("status", "pending"),
        "created_at": s.get("created_at"),
    }
    if authed and s.get("show_contact_publicly"):
        out["contact_email"] = s.get("contact_email", "")
        out["contact_phone"] = s.get("contact_phone", "")
    return out


@router.get("/supplier-countries")
async def list_supplier_countries():
    return SUPPLIER_COUNTRIES


@router.get("/suppliers")
async def list_suppliers(
    request: Request,
    q: Optional[str] = None,
    country: Optional[str] = None,
    supplier_type: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    ships_to_haiti: Optional[bool] = None,
    verified: Optional[bool] = None,
    sort: str = "recommended",
    page: int = 1,
    limit: int = 20,
):
    page = max(1, page)
    limit = max(1, min(limit, 50))
    query: dict = {"status": "active"}
    if country:
        query["country"] = country
    if supplier_type:
        query["supplier_types"] = supplier_type
    if category:
        query["categories"] = category
    if brand:
        query["brands"] = brand
    if ships_to_haiti:
        query["ships_to_haiti"] = True
    if verified:
        query["verified"] = True

    user = await _optional_user(request)
    items = await db.suppliers.find(query, NO_ID).to_list(500)
    results = []
    for s in items:
        if q:
            haystack = " ".join([
                s["company_name"], s.get("short_description", ""), s.get("country", ""),
                " ".join(s.get("brands", [])), " ".join(s.get("supplier_types", [])),
            ]).lower()
            if q.lower() not in haystack:
                continue
        results.append(_public_supplier(s, authed=bool(user)))

    sort_keys = {
        "recommended": lambda e: (not e.get("featured"), not e.get("verified")),
        "verified": lambda e: (not e.get("verified"), not e.get("featured")),
        "name": lambda e: e["company_name"].lower(),
        "recent": lambda e: e.get("created_at") or "",
    }
    results.sort(key=sort_keys.get(sort, sort_keys["recommended"]), reverse=(sort == "recent"))

    total = len(results)
    start = (page - 1) * limit
    page_items = results[start:start + limit]
    return {"suppliers": page_items, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}


@router.get("/suppliers/my")
async def my_suppliers(user: dict = Depends(get_current_user)):
    items = await db.suppliers.find({"owner_id": user["id"]}, NO_ID).to_list(50)
    return [_public_supplier(s, authed=True) for s in items]


@router.post("/suppliers")
async def create_supplier(data: SupplierIn, user: dict = Depends(get_current_user)):
    if user.get("role") in ("admin", "staff"):
        raise HTTPException(status_code=403, detail="Kont Admin/Anplwaye pa ka kreye yon pwofil Founisè — se yon wòl sipèvizyon, pa yon patisipan mache a.")
    supplier = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        **data.model_dump(),
        "verified": False,
        "featured": False,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.suppliers.insert_one(dict(supplier))
    return {k: v for k, v in supplier.items() if k != "_id"}


@router.get("/suppliers/{sid}")
async def get_supplier(sid: str, request: Request):
    s = await db.suppliers.find_one({"id": sid}, NO_ID)
    if not s:
        raise HTTPException(status_code=404, detail="Founisè pa jwenn.")
    user = await _optional_user(request)
    is_owner_or_admin = bool(user and (user["id"] == s["owner_id"] or user.get("role") == "admin"))
    if s.get("status") != "active" and not is_owner_or_admin:
        raise HTTPException(status_code=404, detail="Founisè pa jwenn.")
    out = _public_supplier(s, authed=bool(user))
    out["is_owner"] = bool(user and user["id"] == s["owner_id"])
    if is_owner_or_admin:
        out["contact_email"] = s.get("contact_email", "")
        out["contact_phone"] = s.get("contact_phone", "")
    return out


@router.get("/suppliers/{sid}/products")
async def list_supplier_products(sid: str):
    return await db.supplier_products.find({"supplier_id": sid}, NO_ID).sort("created_at", -1).to_list(200)


@router.post("/suppliers/{sid}/products")
async def add_supplier_product(sid: str, data: SupplierProductIn, user: dict = Depends(get_current_user)):
    s = await db.suppliers.find_one({"id": sid})
    if not s or (s["owner_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Aksè refize.")
    p = {"id": str(uuid.uuid4()), "supplier_id": sid, **data.model_dump(), "created_at": now_iso()}
    await db.supplier_products.insert_one(dict(p))
    return {k: v for k, v in p.items() if k != "_id"}


@router.get("/suppliers/{sid}/shipping-services")
async def list_supplier_shipping(sid: str):
    return await db.supplier_shipping_services.find({"supplier_id": sid}, NO_ID).sort("created_at", 1).to_list(50)


@router.post("/suppliers/{sid}/shipping-services")
async def add_supplier_shipping(sid: str, data: SupplierShippingServiceIn, user: dict = Depends(get_current_user)):
    s = await db.suppliers.find_one({"id": sid})
    if not s or (s["owner_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Aksè refize.")
    svc = {"id": str(uuid.uuid4()), "supplier_id": sid, **data.model_dump(), "created_at": now_iso()}
    await db.supplier_shipping_services.insert_one(dict(svc))
    return {k: v for k, v in svc.items() if k != "_id"}


@router.post("/suppliers/{sid}/inquiries")
async def send_supplier_inquiry(sid: str, data: SupplierInquiryIn, user: dict = Depends(get_current_user)):
    s = await db.suppliers.find_one({"id": sid})
    if not s or s.get("status") != "active":
        raise HTTPException(status_code=404, detail="Founisè pa jwenn.")
    inquiry = {
        "id": str(uuid.uuid4()),
        "supplier_id": sid,
        "user_id": user["id"],
        "user_name": user.get("full_name", user["username"]),
        "product_requested": data.product_requested,
        "quantity": data.quantity,
        "message": data.message,
        "status": "pending",
        "created_at": now_iso(),
    }
    await db.supplier_inquiries.insert_one(dict(inquiry))
    await create_notification(
        s["owner_id"], "supplier_inquiry",
        f"{inquiry['user_name']} voye yon demann pou: {data.product_requested}", f"/suppliers/{sid}",
    )
    return {"message": "Demann ou voye bay founisè a."}


@router.get("/suppliers/{sid}/inquiries")
async def get_supplier_inquiries(sid: str, user: dict = Depends(get_current_user)):
    s = await db.suppliers.find_one({"id": sid})
    if not s or (s["owner_id"] != user["id"] and user.get("role") != "admin"):
        raise HTTPException(status_code=403, detail="Aksè refize.")
    return await db.supplier_inquiries.find({"supplier_id": sid}, NO_ID).sort("created_at", -1).to_list(200)
