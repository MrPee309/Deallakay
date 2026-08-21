"""
International Supplier Hub: a B2B directory where DealLaKay technicians and
sellers can discover international suppliers (manufacturers, distributors,
wholesalers), see what they carry, check Haiti shipping, and send inquiries.

DealLaKay is a connection/discovery layer here — NOT a payment processor or
merchant of record. No checkout, no payment, no order fulfillment in this
phase (matches the "future order support" placeholder only).

New collections (justified — this is a genuinely new business-entity type,
not a duplicate of users/products):
  suppliers, supplier_products, supplier_shipping_services, supplier_inquiries
"""
import uuid
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel

import auth as auth_lib
from shared import db, NO_ID, now_iso, get_current_user, create_notification

router = APIRouter(prefix="/api", tags=["suppliers"])

SUPPLIER_TYPES = [
    "Manufacturer", "Distributor", "Wholesaler", "Parts Supplier", "Electronics Supplier",
    "Mobile Phone Parts Supplier", "Laptop Parts Supplier", "Accessories Supplier",
    "Repair Equipment Supplier", "Tools Supplier", "International Supplier", "Shipping/Logistics Provider",
]

# USA prioritized first (main current target), rest ordered by relevance to
# this marketplace. "Other" has no fixed calling code — phone is only checked
# for a leading "+" in that case, not against a specific prefix.
SUPPLIER_COUNTRIES = [
    {"name": "United States", "code": "+1"},
    {"name": "Canada", "code": "+1"},
    {"name": "Dominican Republic", "code": "+1"},
    {"name": "China", "code": "+86"},
    {"name": "Mexico", "code": "+52"},
    {"name": "Panama", "code": "+507"},
    {"name": "Jamaica", "code": "+1"},
    {"name": "Brazil", "code": "+55"},
    {"name": "United Kingdom", "code": "+44"},
    {"name": "France", "code": "+33"},
    {"name": "Germany", "code": "+49"},
    {"name": "Spain", "code": "+34"},
    {"name": "South Korea", "code": "+82"},
    {"name": "Japan", "code": "+81"},
    {"name": "India", "code": "+91"},
    {"name": "United Arab Emirates", "code": "+971"},
    {"name": "Other", "code": ""},
]
_COUNTRY_CODES = {c["name"]: c["code"] for c in SUPPLIER_COUNTRIES}

# Expected count of digits AFTER the country code, per country — catches a
# fake number like "+1234" that has the right prefix but isn't a real phone
# number length. Approximate (not full E.164 validation), but enough to
# reject obviously-fake entries. (min, max) digits.
_COUNTRY_PHONE_DIGITS = {
    "United States": (10, 10), "Canada": (10, 10), "Dominican Republic": (10, 10),
    "China": (11, 11), "Mexico": (10, 10), "Panama": (7, 8), "Jamaica": (10, 10),
    "Brazil": (10, 11), "United Kingdom": (10, 10), "France": (9, 9), "Germany": (10, 11),
    "Spain": (9, 9), "South Korea": (9, 10), "Japan": (9, 10), "India": (10, 10),
    "United Arab Emirates": (9, 9),
}


@router.get("/supplier-countries")
async def get_supplier_countries():
    return SUPPLIER_COUNTRIES


def _validate_supplier_phone(phone: str, country: str):
    phone = phone.strip()
    if not phone.startswith("+"):
        raise HTTPException(status_code=400, detail="Antre nimewo a ak kòd peyi a (egzanp +1...).")
    expected_code = _COUNTRY_CODES.get(country, "")
    if expected_code:
        if not phone.startswith(expected_code):
            raise HTTPException(status_code=400, detail=f"Nimewo a dwe kòmanse ak {expected_code}, kòd peyi ({country}) ou chwazi a.")
        digits_after_code = "".join(ch for ch in phone[len(expected_code):] if ch.isdigit())
        lo, hi = _COUNTRY_PHONE_DIGITS.get(country, (7, 15))
        if not (lo <= len(digits_after_code) <= hi):
            raise HTTPException(
                status_code=400,
                detail=f"Nimewo pa sanble valab pou {country} — apre {expected_code}, li dwe gen {lo if lo == hi else f'{lo}-{hi}'} chif.",
            )
    else:
        total_digits = "".join(ch for ch in phone if ch.isdigit())
        if not (7 <= len(total_digits) <= 15):
            raise HTTPException(status_code=400, detail="Nimewo telefòn pa sanble valab.")



# ---------------- Models ----------------
class SupplierIn(BaseModel):
    company_name: str
    logo: str = ""
    cover_image: str = ""
    short_description: str = ""
    full_description: str = ""
    country: str
    state_province: str = ""
    city: str = ""
    website: str = ""
    supplier_types: List[str] = []
    categories: List[str] = []  # reuses DealLaKay category "type" values (phone/laptop/parts/accessories/tools)
    brands: List[str] = []
    years_in_business: Optional[int] = None
    wholesale_available: bool = False
    moq_info: str = ""
    ships_to_haiti: bool = False
    ships_internationally: bool = False
    contact_email: str = ""
    contact_phone: str
    contact_whatsapp: str = ""
    external_contact_link: str = ""
    show_contact_publicly: bool = False  # supplier controls visibility; default off per privacy rules
    accept_supplier_terms: bool = False


class SupplierProductIn(BaseModel):
    name: str
    category: Optional[str] = None
    brand: str = ""
    model_compatibility: str = ""
    description: str = ""
    availability: str = "in_stock"  # in_stock, limited, out_of_stock, made_to_order
    wholesale_price: Optional[float] = None
    moq: Optional[int] = None
    product_url: str = ""
    sku: str = ""


class ShippingServiceIn(BaseModel):
    name: str
    owned_by_supplier: bool = True
    carrier_name: str = ""
    countries_served: List[str] = []
    ships_to_haiti: bool = False
    estimated_delivery: str = ""
    tracking_available: bool = False
    pickup_available: bool = False
    quote_required: bool = False
    notes: str = ""


class SupplierInquiryIn(BaseModel):
    product_requested: str
    quantity: int = 1
    target_price: Optional[float] = None
    message: str = ""
    shipping_destination: str = "Ayiti"
    related_request_id: Optional[str] = None


# ---------------- Helpers ----------------
async def _optional_user(request: Request) -> Optional[dict]:
    auth_header = request.headers.get("Authorization", "")
    token = auth_header[7:] if auth_header.startswith("Bearer ") else None
    if not token:
        return None
    try:
        payload = auth_lib.decode_token(token)
    except Exception:
        return None
    return await db.users.find_one({"id": payload["sub"]}, NO_ID)


def _public_supplier(s: dict, authed: bool) -> dict:
    out = {
        "id": s["id"], "company_name": s["company_name"], "logo": s.get("logo", ""),
        "cover_image": s.get("cover_image", ""), "short_description": s.get("short_description", ""),
        "country": s["country"], "state_province": s.get("state_province", ""), "city": s.get("city", ""),
        "supplier_types": s.get("supplier_types", []), "categories": s.get("categories", []),
        "brands": s.get("brands", []), "years_in_business": s.get("years_in_business"),
        "wholesale_available": s.get("wholesale_available", False), "moq_info": s.get("moq_info", ""),
        "ships_to_haiti": s.get("ships_to_haiti", False), "ships_internationally": s.get("ships_internationally", False),
        "verified": s.get("verified", False), "featured": s.get("featured", False),
        "status": s.get("status", "active"), "full_description": s.get("full_description", ""),
        "website": s.get("website", ""),
    }
    # Contact details only reach authenticated users, and only if the supplier
    # opted to show them (or the caller owns the profile — handled by caller).
    if authed and s.get("show_contact_publicly"):
        out.update({
            "contact_email": s.get("contact_email", ""), "contact_phone": s.get("contact_phone", ""),
            "contact_whatsapp": s.get("contact_whatsapp", ""), "external_contact_link": s.get("external_contact_link", ""),
        })
    return out


async def _get_owned_supplier(sid: str, user: dict) -> dict:
    s = await db.suppliers.find_one({"id": sid})
    if not s:
        raise HTTPException(status_code=404, detail="Founisè pa jwenn.")
    if s["owner_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Ou pa gen dwa.")
    return s


# ---------------- Supplier profile ----------------
@router.post("/suppliers")
async def create_supplier(data: SupplierIn, user: dict = Depends(get_current_user)):
    if not data.company_name.strip():
        raise HTTPException(status_code=400, detail="Antre non konpayi a.")
    if not data.country.strip():
        raise HTTPException(status_code=400, detail="Antre peyi a.")
    if data.country.strip().lower() in ("ayiti", "haiti"):
        raise HTTPException(status_code=400, detail="Founisè yo dwe lòtbò — pa Ayiti.")
    if data.country not in _COUNTRY_CODES:
        raise HTTPException(status_code=400, detail="Chwazi yon peyi nan lis la.")
    if not data.contact_phone.strip():
        raise HTTPException(status_code=400, detail="Nimewo telefòn entènasyonal obligatwa.")
    _validate_supplier_phone(data.contact_phone, data.country)
    if not data.accept_supplier_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte Kondisyon Founisè yo.")
    bad_types = [t for t in data.supplier_types if t not in SUPPLIER_TYPES]
    if bad_types:
        raise HTTPException(status_code=400, detail=f"Tip founisè pa valab: {', '.join(bad_types)}")
    s = {
        "id": str(uuid.uuid4()),
        "owner_id": user["id"],
        "owner_username": user["username"],
        **data.model_dump(),
        "status": "pending",  # admin must approve before it appears in the public directory
        "verified": False,
        "featured": False,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.suppliers.insert_one(dict(s))
    return {**_public_supplier(s, authed=True), "message": "Demann ou an atant apwobasyon admin."}


@router.get("/suppliers/my")
async def my_suppliers(user: dict = Depends(get_current_user)):
    items = await db.suppliers.find({"owner_id": user["id"]}, NO_ID).to_list(50)
    return [_public_supplier(s, authed=True) for s in items]


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
        results.append(s)

    sort_key = {
        "verified": lambda e: (not e.get("verified"), not e.get("featured")),
        "recommended": lambda e: (not e.get("featured"), not e.get("verified")),
        "name": lambda e: e["company_name"].lower(),
        "recent": lambda e: e.get("created_at") or "",
    }
    results.sort(key=sort_key.get(sort, sort_key["recommended"]), reverse=(sort == "recent"))

    total = len(results)
    skip = (page - 1) * limit
    page_items = results[skip: skip + limit]
    # Anonymous visitors can browse the directory (discoverability), but never
    # get contact details — _public_supplier() strips those unless authed=True.
    user = await _optional_user(request)
    return {
        "suppliers": [_public_supplier(s, authed=bool(user)) for s in page_items],
        "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit,
    }


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
    if out["is_owner"]:
        out.update({
            "contact_email": s.get("contact_email", ""), "contact_phone": s.get("contact_phone", ""),
            "contact_whatsapp": s.get("contact_whatsapp", ""), "external_contact_link": s.get("external_contact_link", ""),
        })
    return out


@router.put("/suppliers/{sid}")
async def update_supplier(sid: str, data: SupplierIn, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    bad_types = [t for t in data.supplier_types if t not in SUPPLIER_TYPES]
    if bad_types:
        raise HTTPException(status_code=400, detail=f"Tip founisè pa valab: {', '.join(bad_types)}")
    if data.contact_phone.strip():
        _validate_supplier_phone(data.contact_phone, data.country)
    updates = data.model_dump()
    updates["updated_at"] = now_iso()
    await db.suppliers.update_one({"id": sid}, {"$set": updates})
    return {"message": "Founisè modifye."}


@router.post("/suppliers/{sid}/verify-request")
async def request_supplier_verification(sid: str, user: dict = Depends(get_current_user)):
    s = await _get_owned_supplier(sid, user)
    existing = await db.supplier_verifications.find_one({"supplier_id": sid, "status": "pending"})
    if existing:
        return {"message": "Demann verifikasyon deja an atant."}
    await db.supplier_verifications.insert_one({
        "id": str(uuid.uuid4()), "supplier_id": sid, "company_name": s["company_name"],
        "owner_id": user["id"], "status": "pending", "created_at": now_iso(),
    })
    return {"message": "Demann verifikasyon voye. Admin ap revize li."}


# ---------------- Supplier products ----------------
@router.post("/suppliers/{sid}/products")
async def add_supplier_product(sid: str, data: SupplierProductIn, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Antre non pwodwi a.")
    p = {"id": str(uuid.uuid4()), "supplier_id": sid, **data.model_dump(), "created_at": now_iso()}
    await db.supplier_products.insert_one(dict(p))
    return {k: v for k, v in p.items() if k != "_id"}


@router.get("/suppliers/{sid}/products")
async def list_supplier_products(sid: str):
    return await db.supplier_products.find({"supplier_id": sid}, NO_ID).sort("created_at", -1).to_list(200)


@router.put("/suppliers/{sid}/products/{pid}")
async def update_supplier_product(sid: str, pid: str, data: SupplierProductIn, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    p = await db.supplier_products.find_one({"id": pid, "supplier_id": sid})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    await db.supplier_products.update_one({"id": pid}, {"$set": data.model_dump()})
    return {"message": "ok"}


@router.delete("/suppliers/{sid}/products/{pid}")
async def delete_supplier_product(sid: str, pid: str, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    await db.supplier_products.delete_one({"id": pid, "supplier_id": sid})
    return {"message": "Efase."}


# ---------------- Shipping services ----------------
@router.post("/suppliers/{sid}/shipping-services")
async def add_shipping_service(sid: str, data: ShippingServiceIn, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    if not data.name.strip():
        raise HTTPException(status_code=400, detail="Antre non sèvis livrezon an.")
    svc = {"id": str(uuid.uuid4()), "supplier_id": sid, **data.model_dump(), "created_at": now_iso()}
    await db.supplier_shipping_services.insert_one(dict(svc))
    return {k: v for k, v in svc.items() if k != "_id"}


@router.get("/suppliers/{sid}/shipping-services")
async def list_shipping_services(sid: str):
    return await db.supplier_shipping_services.find({"supplier_id": sid}, NO_ID).sort("created_at", 1).to_list(50)


@router.delete("/suppliers/{sid}/shipping-services/{svc_id}")
async def delete_shipping_service(sid: str, svc_id: str, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    await db.supplier_shipping_services.delete_one({"id": svc_id, "supplier_id": sid})
    return {"message": "Efase."}


# ---------------- Inquiries ----------------
@router.post("/suppliers/{sid}/inquiries")
async def create_inquiry(sid: str, data: SupplierInquiryIn, user: dict = Depends(get_current_user)):
    if not (user.get("is_seller") or user.get("is_technician")):
        raise HTTPException(status_code=403, detail="Ou dwe vandè oswa teknisyen pou kontakte yon founisè.")
    # Only VERIFIED sellers/technicians may contact international suppliers —
    # unverified accounts can still browse a supplier's products/profile, but
    # the "contact" action itself is gated to protect suppliers from fraud.
    is_verified_seller = False
    is_verified_tech = False
    if user.get("is_seller"):
        sp = await db.seller_profiles.find_one({"user_id": user["id"]}, NO_ID)
        is_verified_seller = bool(sp and sp.get("seller_verified"))
    if user.get("is_technician"):
        tp = await db.technician_profiles.find_one({"user_id": user["id"]}, NO_ID)
        is_verified_tech = bool(tp and tp.get("technician_verified"))
    if not (is_verified_seller or is_verified_tech):
        raise HTTPException(status_code=403, detail="Ou dwe yon vandè oswa teknisyen VERIFYE pou kontakte yon founisè.")
    s = await db.suppliers.find_one({"id": sid})
    if not s or s.get("status") != "active":
        raise HTTPException(status_code=404, detail="Founisè pa jwenn.")
    if not data.product_requested.strip():
        raise HTTPException(status_code=400, detail="Antre pwodwi w bezwen an.")
    if data.related_request_id:
        r = await db.part_requests.find_one({"id": data.related_request_id, "user_id": user["id"]})
        if not r:
            raise HTTPException(status_code=400, detail="Demann pyès sa a pa jwenn.")
    inquiry = {
        "id": str(uuid.uuid4()),
        "supplier_id": sid,
        "user_id": user["id"],
        "username": user["username"],
        "product_requested": data.product_requested,
        "quantity": data.quantity,
        "target_price": data.target_price,
        "message": data.message,
        "shipping_destination": data.shipping_destination,
        "related_request_id": data.related_request_id,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.supplier_inquiries.insert_one(dict(inquiry))
    await create_notification(s["owner_id"], "supplier_inquiry", f"@{user['username']} voye yon demann sou '{data.product_requested}'", f"/suppliers/{sid}")
    return {k: v for k, v in inquiry.items() if k != "_id"}


@router.get("/suppliers/{sid}/inquiries")
async def list_supplier_inquiries(sid: str, user: dict = Depends(get_current_user)):
    await _get_owned_supplier(sid, user)
    return await db.supplier_inquiries.find({"supplier_id": sid}, NO_ID).sort("created_at", -1).to_list(200)


@router.get("/my-supplier-inquiries")
async def my_inquiries(user: dict = Depends(get_current_user)):
    return await db.supplier_inquiries.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(200)
