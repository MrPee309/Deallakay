"""
Admin endpoints: dashboard stats, user management, product moderation, IMEI
verification, reports, seller verification requests, category management,
and site settings. All protected by get_admin (role == "admin").

Moved out of server.py during Phase 2A modularization. Behavior, paths, request
formats, and response formats are unchanged from before the move.
"""
import re
import uuid
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

import auth as auth_lib
from seed_data import DEFAULT_SETTINGS
from shared import db, NO_ID, now_iso, slugify, get_admin, create_notification, require_staff, STAFF_PERMISSIONS

router = APIRouter(prefix="/api/admin", tags=["admin"])


class CategoryIn(BaseModel):
    name_ht: str
    name_fr: str = ""
    name_en: str = ""
    icon: str = "tag"
    type: str = "accessories"


class SubcategoryIn(BaseModel):
    name: str


class SettingsIn(BaseModel):
    site_branding: Optional[Dict[str, Any]] = None
    listing_mode: Optional[str] = None
    safety_messages: Optional[List[str]] = None


@router.get("/stats")
async def admin_stats(admin: dict = Depends(get_admin)):
    return {
        "total_users": await db.users.count_documents({}),
        "total_sellers": await db.users.count_documents({"is_seller": True}),
        "active_listings": await db.products.count_documents({"status": "active"}),
        "pending_listings": await db.products.count_documents({"status": "pending"}),
        "sold_products": await db.products.count_documents({"status": "sold"}),
        "reported_listings": await db.reports.count_documents({"status": "open"}),
        "verified_sellers": await db.seller_profiles.count_documents({"seller_verified": True}),
    }


@router.get("/users")
async def admin_users(q: Optional[str] = None, admin: dict = Depends(get_admin)):
    query = {}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        query = {"$or": [{"username": rx}, {"email": rx}, {"full_name": rx}]}
    return await db.users.find(query, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)


@router.get("/users/{uid}")
async def admin_user_detail(uid: str, admin: dict = Depends(get_admin)):
    u = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    prof = await db.seller_profiles.find_one({"user_id": uid}, NO_ID)
    products = await db.products.find({"seller_id": uid}, {"_id": 0, "images": 0}).to_list(500)
    reports = await db.reports.count_documents({"target_type": "seller", "target_id": uid})
    return {"user": u, "seller_profile": prof, "products": products, "reports": reports}


@router.put("/users/{uid}/{action}")
async def admin_user_action(uid: str, action: str, admin: dict = Depends(get_admin)):
    if action == "delete":
        await db.users.delete_one({"id": uid})
        await db.products.delete_many({"seller_id": uid})
        return {"message": "Itilizatè efase."}
    status_map = {"suspend": "suspended", "ban": "banned", "restore": "active"}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    await db.users.update_one({"id": uid}, {"$set": {"status": status_map[action]}, "$inc": {"token_version": 1}})
    return {"message": f"Itilizatè {status_map[action]}."}


@router.get("/products")
async def admin_products(status: Optional[str] = None, admin: dict = Depends(require_staff("moderate_products"))):
    query = {}
    if status:
        query["status"] = status
    products = await db.products.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for p in products:
        p["images"] = p.get("images", [])[:1]
    return products


@router.get("/products/{pid}/imei")
async def admin_view_imei(pid: str, admin: dict = Depends(require_staff("moderate_products"))):
    p = await db.products.find_one({"id": pid}, NO_ID)
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    return {"imei": p.get("imei", "")}


@router.put("/products/{pid}/moderate/{decision}")
async def admin_moderate(pid: str, decision: str, admin: dict = Depends(require_staff("moderate_products"))):
    p = await db.products.find_one({"id": pid})
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if decision == "approve":
        await db.products.update_one({"id": pid}, {"$set": {"status": "active"}})
        await create_notification(p["seller_id"], "listing", f"Pwodwi '{p['title']}' apwouve.", f"/product/{p['slug']}")
    elif decision == "reject":
        await db.products.update_one({"id": pid}, {"$set": {"status": "rejected"}})
        await create_notification(p["seller_id"], "listing", f"Pwodwi '{p['title']}' rejte.", "")
    else:
        raise HTTPException(status_code=400, detail="Desizyon pa valab.")
    return {"message": "ok"}


@router.put("/products/{pid}/verify-imei")
async def admin_verify_imei(pid: str, admin: dict = Depends(require_staff("moderate_products"))):
    await db.products.update_one({"id": pid}, {"$set": {"imei_verified": True}})
    return {"message": "IMEI verifye."}


@router.get("/reports")
async def admin_reports(admin: dict = Depends(require_staff("handle_reports"))):
    return await db.reports.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.put("/reports/{rid}/resolve")
async def admin_resolve_report(rid: str, admin: dict = Depends(require_staff("handle_reports"))):
    await db.reports.update_one({"id": rid}, {"$set": {"status": "resolved"}})
    return {"message": "ok"}


@router.get("/verifications")
async def admin_verifications(admin: dict = Depends(get_admin)):
    return await db.seller_verifications.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.put("/verifications/{vid}/{decision}")
async def admin_verify_seller(vid: str, decision: str, admin: dict = Depends(get_admin)):
    v = await db.seller_verifications.find_one({"id": vid})
    if not v:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    status = "approved" if decision == "approve" else "rejected"
    await db.seller_verifications.update_one({"id": vid}, {"$set": {"status": status}})
    if decision == "approve":
        await db.seller_profiles.update_one({"user_id": v["user_id"]}, {"$set": {"seller_verified": True}})
        await create_notification(v["user_id"], "verified", "Ou se yon Vandè Verifye kounye a!", "")
    return {"message": "ok"}


@router.get("/technician-verifications")
async def admin_technician_verifications(admin: dict = Depends(get_admin)):
    return await db.technician_verifications.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.put("/technician-verifications/{vid}/{decision}")
async def admin_verify_technician(vid: str, decision: str, admin: dict = Depends(get_admin)):
    v = await db.technician_verifications.find_one({"id": vid})
    if not v:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    status = "approved" if decision == "approve" else "rejected"
    await db.technician_verifications.update_one({"id": vid}, {"$set": {"status": status}})
    if decision == "approve":
        await db.technician_profiles.update_one({"user_id": v["user_id"]}, {"$set": {"technician_verified": True}})
        await create_notification(v["user_id"], "verified", "Ou se yon Teknisyen Verifye kounye a!", "")
    return {"message": "ok"}


@router.post("/categories")
async def admin_add_category(data: CategoryIn, admin: dict = Depends(get_admin)):
    cnt = await db.categories.count_documents({})
    cat = {
        "id": str(uuid.uuid4()),
        "slug": slugify(data.name_en or data.name_ht),
        "name_ht": data.name_ht, "name_fr": data.name_fr, "name_en": data.name_en,
        "icon": data.icon, "type": data.type, "order": cnt + 1, "subcategories": [],
    }
    await db.categories.insert_one(dict(cat))
    return {k: v for k, v in cat.items() if k != "_id"}


@router.put("/categories/{cid}")
async def admin_edit_category(cid: str, data: CategoryIn, admin: dict = Depends(get_admin)):
    await db.categories.update_one({"id": cid}, {"$set": data.model_dump()})
    return {"message": "ok"}


@router.delete("/categories/{cid}")
async def admin_delete_category(cid: str, admin: dict = Depends(get_admin)):
    await db.categories.delete_one({"id": cid})
    return {"message": "ok"}


@router.post("/categories/{cid}/subcategories")
async def admin_add_subcategory(cid: str, data: SubcategoryIn, admin: dict = Depends(get_admin)):
    sub = {"id": str(uuid.uuid4()), "name": data.name, "slug": slugify(data.name)}
    await db.categories.update_one({"id": cid}, {"$push": {"subcategories": sub}})
    return sub


@router.delete("/categories/{cid}/subcategories/{sid}")
async def admin_delete_subcategory(cid: str, sid: str, admin: dict = Depends(get_admin)):
    await db.categories.update_one({"id": cid}, {"$pull": {"subcategories": {"id": sid}}})
    return {"message": "ok"}


@router.get("/settings")
async def admin_get_settings(admin: dict = Depends(get_admin)):
    s = await db.settings.find_one({"id": "site-settings"}, NO_ID)
    return s or DEFAULT_SETTINGS


@router.put("/settings")
async def admin_update_settings(data: SettingsIn, admin: dict = Depends(get_admin)):
    updates = {}
    if data.site_branding is not None:
        updates["site_branding"] = data.site_branding
    if data.listing_mode is not None:
        updates["listing_mode"] = data.listing_mode
    if data.safety_messages is not None:
        updates["safety_messages"] = data.safety_messages
    await db.settings.update_one({"id": "site-settings"}, {"$set": updates}, upsert=True)
    return {"message": "Paramèt anrejistre."}


# ---------------- Supplier Hub moderation ----------------
@router.get("/suppliers")
async def admin_suppliers(admin: dict = Depends(require_staff("approve_suppliers"))):
    return await db.suppliers.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.put("/suppliers/{sid}/{action}")
async def admin_supplier_action(sid: str, action: str, admin: dict = Depends(require_staff("approve_suppliers"))):
    status_map = {"approve": {"status": "active"}, "reject": {"status": "rejected"},
                  "suspend": {"status": "suspended"}, "unsuspend": {"status": "active"},
                  "feature": {"featured": True}, "unfeature": {"featured": False}}
    if action not in status_map:
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    s = await db.suppliers.find_one({"id": sid})
    if not s:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    await db.suppliers.update_one({"id": sid}, {"$set": status_map[action]})
    if action == "approve":
        await create_notification(s["owner_id"], "supplier_approved", f"'{s['company_name']}' apwouve — li vizib sou sit la kounye a!", f"/suppliers/{sid}")
    elif action == "reject":
        await create_notification(s["owner_id"], "supplier_rejected", f"Demann founisè '{s['company_name']}' rejte.", "")
    return {"message": "ok"}


# ---------------- Seller applications (pending approval) ----------------
@router.get("/seller-applications")
async def admin_seller_applications(admin: dict = Depends(require_staff("approve_sellers"))):
    return await db.seller_profiles.find({}, NO_ID).sort("date_joined", -1).to_list(500)


@router.put("/seller-applications/{uid}/{action}")
async def admin_seller_action(uid: str, action: str, admin: dict = Depends(require_staff("approve_sellers"))):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    p = await db.seller_profiles.find_one({"user_id": uid})
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if action == "approve":
        await db.seller_profiles.update_one({"user_id": uid}, {"$set": {"status": "active"}})
        await db.users.update_one({"id": uid}, {"$set": {"is_seller": True}})
        await create_notification(uid, "seller_approved", "Demann Vandè ou apwouve — ou ka poste pwodwi kounye a!", "")
    else:
        await db.seller_profiles.update_one({"user_id": uid}, {"$set": {"status": "rejected"}})
        await create_notification(uid, "seller_rejected", "Demann Vandè ou rejte.", "")
    return {"message": "ok"}


# ---------------- Technician applications (pending approval) ----------------
@router.get("/technician-applications")
async def admin_technician_applications(admin: dict = Depends(require_staff("approve_technicians"))):
    return await db.technician_profiles.find({}, NO_ID).sort("date_joined", -1).to_list(500)


@router.put("/technician-applications/{uid}/{action}")
async def admin_technician_action(uid: str, action: str, admin: dict = Depends(require_staff("approve_technicians"))):
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="Aksyon pa valab.")
    p = await db.technician_profiles.find_one({"user_id": uid})
    if not p:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    if action == "approve":
        await db.technician_profiles.update_one({"user_id": uid}, {"$set": {"status": "active"}})
        await db.users.update_one({"id": uid}, {"$set": {"is_technician": True}})
        await create_notification(uid, "technician_approved", "Demann Teknisyen ou apwouve — ou vizib pou kliyan kounye a!", "")
    else:
        await db.technician_profiles.update_one({"user_id": uid}, {"$set": {"status": "rejected"}})
        await create_notification(uid, "technician_rejected", "Demann Teknisyen ou rejte.", "")
    return {"message": "ok"}


@router.get("/supplier-verifications")
async def admin_supplier_verifications(admin: dict = Depends(get_admin)):
    return await db.supplier_verifications.find({}, NO_ID).sort("created_at", -1).to_list(500)


@router.put("/supplier-verifications/{vid}/{decision}")
async def admin_verify_supplier(vid: str, decision: str, admin: dict = Depends(get_admin)):
    v = await db.supplier_verifications.find_one({"id": vid})
    if not v:
        raise HTTPException(status_code=404, detail="Pa jwenn.")
    status = "approved" if decision == "approve" else "rejected"
    await db.supplier_verifications.update_one({"id": vid}, {"$set": {"status": status}})
    if decision == "approve":
        await db.suppliers.update_one({"id": v["supplier_id"]}, {"$set": {"verified": True}})
        await create_notification(v["owner_id"], "verified", f"'{v['company_name']}' se yon Founisè Verifye kounye a!", "")
    return {"message": "ok"}


# ---------------- Staff (limited-permission admin helpers) ----------------
class StaffIn(BaseModel):
    username: str
    permissions: List[str] = []


class StaffCreateIn(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    phone: str = ""
    password: str
    permissions: List[str] = []


@router.post("/staff/create-account")
async def create_staff_account(data: StaffCreateIn, admin: dict = Depends(get_admin)):
    """Creates a BRAND NEW account with Staff role directly — for when the
    admin is hiring/onboarding someone who doesn't already have a DealLakay
    account, and wants to hand them a working login themselves rather than
    have them self-register. Full-admin only (not delegable to Staff)."""
    bad = [p for p in data.permissions if p not in STAFF_PERMISSIONS]
    if bad:
        raise HTTPException(status_code=400, detail=f"Otorizasyon pa valab: {', '.join(bad)}")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Modpas la dwe gen omwen 8 karaktè.")
    email = data.email.lower().strip()
    username = data.username.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sa a deja itilize.")
    if await db.users.find_one({"username": username}):
        raise HTTPException(status_code=400, detail="Non itilizatè sa a deja pran.")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "full_name": data.full_name.strip(),
        "username": username,
        "email": email,
        "phone": data.phone.strip(),
        "password_hash": auth_lib.hash_password(data.password),
        "country": "Ayiti",
        "department": "",
        "city": "",
        "role": "staff",
        "permissions": data.permissions,
        "status": "active",
        # Admin is creating and vouching for this account directly, so it's
        # treated as verified from the start — no need to make a new staff
        # member click a verification email link before they can log in.
        "email_verified": True,
        "phone_verified": False,
        "is_seller": False,
        "is_technician": False,
        "avatar": "",
        "token_version": 0,
        "terms_accepted": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    return {"message": "Kont anplwaye kreye.", "username": username, "email": email}


@router.get("/staff-permissions")
async def list_staff_permissions(admin: dict = Depends(get_admin)):
    """Full-admin only — the fixed list of scopes available to grant."""
    return STAFF_PERMISSIONS


@router.get("/staff")
async def list_staff(admin: dict = Depends(get_admin)):
    staff = await db.users.find({"role": "staff"}, {"_id": 0, "password_hash": 0}).to_list(200)
    return staff


@router.post("/staff")
async def add_staff(data: StaffIn, admin: dict = Depends(get_admin)):
    """Promotes an EXISTING user account to Staff with the given
    permissions. Never grants is_seller/is_technician — Staff/Admin stay
    entirely outside the marketplace roles, on purpose."""
    bad = [p for p in data.permissions if p not in STAFF_PERMISSIONS]
    if bad:
        raise HTTPException(status_code=400, detail=f"Otorizasyon pa valab: {', '.join(bad)}")
    u = await db.users.find_one({"username": data.username})
    if not u:
        raise HTTPException(status_code=404, detail="Itilizatè pa jwenn.")
    if u.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Itilizatè sa a se deja yon Admin total.")
    await db.users.update_one({"id": u["id"]}, {"$set": {"role": "staff", "permissions": data.permissions}})
    await create_notification(u["id"], "staff_granted", "Ou vin yon manm ekip DealLakay ak dwa administratif limite.", "")
    return {"message": "ok"}


@router.put("/staff/{uid}")
async def update_staff(uid: str, data: StaffIn, admin: dict = Depends(get_admin)):
    bad = [p for p in data.permissions if p not in STAFF_PERMISSIONS]
    if bad:
        raise HTTPException(status_code=400, detail=f"Otorizasyon pa valab: {', '.join(bad)}")
    u = await db.users.find_one({"id": uid})
    if not u or u.get("role") != "staff":
        raise HTTPException(status_code=404, detail="Manm ekip pa jwenn.")
    await db.users.update_one({"id": uid}, {"$set": {"permissions": data.permissions}})
    return {"message": "ok"}


@router.delete("/staff/{uid}")
async def remove_staff(uid: str, admin: dict = Depends(get_admin)):
    """Revokes Staff status entirely — back to a normal Client account."""
    u = await db.users.find_one({"id": uid})
    if not u or u.get("role") != "staff":
        raise HTTPException(status_code=404, detail="Manm ekip pa jwenn.")
    await db.users.update_one({"id": uid}, {"$set": {"role": "user", "permissions": []}})
    return {"message": "ok"}
