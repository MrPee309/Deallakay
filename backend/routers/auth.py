"""
Authentication endpoints: register, login, Google sign-in, email verification,
forgot/reset password, logout-all, verify-phone.

Moved out of server.py during Phase 2A modularization. Behavior, paths, request
formats, and response formats are unchanged from before the move — this is the
same code, just relocated so server.py doesn't have to hold every endpoint in
the app.
"""
import os
import re
import uuid
import secrets
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr

import auth as auth_lib
import email_service
import security
from seed_data import DEPARTMENTS
from shared import db, now_iso, get_current_user, public_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
# Only expose verification/reset links directly in API responses when explicitly
# enabled for local development. Must never be "true" in production, since it lets
# anyone bypass email verification / take over accounts via password reset.
DEMO_MODE = os.environ.get("DEMO_MODE", "false").strip().lower() == "true"
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


RL_LOGIN_MAX = _int_env("RATE_LIMIT_LOGIN_MAX", 8)
RL_LOGIN_WINDOW = _int_env("RATE_LIMIT_LOGIN_WINDOW_S", 15 * 60)
RL_REGISTER_MAX = _int_env("RATE_LIMIT_REGISTER_MAX", 5)
RL_REGISTER_WINDOW = _int_env("RATE_LIMIT_REGISTER_WINDOW_S", 60 * 60)
RL_FORGOT_MAX = _int_env("RATE_LIMIT_FORGOT_MAX", 4)
RL_FORGOT_WINDOW = _int_env("RATE_LIMIT_FORGOT_WINDOW_S", 60 * 60)
RL_RESET_MAX = _int_env("RATE_LIMIT_RESET_MAX", 8)
RL_RESET_WINDOW = _int_env("RATE_LIMIT_RESET_WINDOW_S", 60 * 60)
RL_RESEND_MAX = _int_env("RATE_LIMIT_RESEND_MAX", 4)
RL_RESEND_WINDOW = _int_env("RATE_LIMIT_RESEND_WINDOW_S", 60 * 60)


# ---------------- Models ----------------
class RegisterIn(BaseModel):
    full_name: str
    username: str
    email: EmailStr
    phone: str
    password: str
    confirm_password: str
    country: str = "Ayiti"
    department: str
    city: str
    accept_terms: bool


class LoginIn(BaseModel):
    username: str
    password: str


class ResendIn(BaseModel):
    email: EmailStr


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str


class GoogleAuthIn(BaseModel):
    credential: str
    department: Optional[str] = None
    city: Optional[str] = None


# ---------------- Endpoints ----------------
@router.post("/register")
async def register(data: RegisterIn, _rl=Depends(security.rate_limit("register", RL_REGISTER_MAX, RL_REGISTER_WINDOW))):
    if not data.accept_terms:
        raise HTTPException(status_code=400, detail="Ou dwe aksepte Terms & Conditions.")
    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Modpas yo pa menm.")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Modpas la dwe gen omwen 8 karaktè.")
    if not data.phone.strip():
        raise HTTPException(status_code=400, detail="Nimewo telefòn ou obligatwa.")
    if not data.department.strip():
        raise HTTPException(status_code=400, detail="Chwazi depatman ou.")
    if not data.city.strip():
        raise HTTPException(status_code=400, detail="Chwazi vil ou.")
    dep_match = next((d for d in DEPARTMENTS if d["name"] == data.department), None)
    if not dep_match or data.city not in dep_match["cities"]:
        raise HTTPException(status_code=400, detail="Depatman oswa vil pa valab.")
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
        "country": data.country,
        "department": data.department,
        "city": data.city,
        "role": "user",
        "status": "active",
        "email_verified": False,
        "phone_verified": False,
        "is_seller": False,
        "avatar": "",
        "token_version": 0,
        "terms_accepted": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = secrets.token_urlsafe(32)
    await db.email_tokens.insert_one({
        "token": token, "user_id": uid, "type": "verify",
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    email_service.send_verification_email(email, data.full_name, link)
    resp = {"message": "Nou voye yon email verification. Verifye email ou avan ou konekte."}
    if DEMO_MODE:
        resp["demo_verification_link"] = link
    return resp


@router.get("/verify-email")
async def verify_email(token: str, _rl=Depends(security.rate_limit("verify-email", 20, 60 * 60))):
    rec = await db.email_tokens.find_one({"token": token, "type": "verify"})
    if not rec:
        raise HTTPException(status_code=400, detail="Lyen verifikasyon an pa valab.")
    if datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lyen an ekspire. Mande yon nouvo.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"email_verified": True}})
    await db.email_tokens.delete_one({"token": token})
    return {"message": "Email ou verifye! Ou ka konekte kounye a."}


@router.post("/resend-verification")
async def resend_verification(data: ResendIn, _rl=Depends(security.rate_limit("resend", RL_RESEND_MAX, RL_RESEND_WINDOW))):
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if not user:
        raise HTTPException(status_code=404, detail="Email pa jwenn.")
    if user.get("email_verified"):
        return {"message": "Email deja verifye."}
    await db.email_tokens.delete_many({"user_id": user["id"], "type": "verify"})
    token = secrets.token_urlsafe(32)
    await db.email_tokens.insert_one({
        "token": token, "user_id": user["id"], "type": "verify",
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
    })
    link = f"{FRONTEND_URL}/verify-email?token={token}"
    email_service.send_verification_email(user["email"], user["full_name"], link)
    resp = {"message": "Nou voye email verification an ankò."}
    if DEMO_MODE:
        resp["demo_verification_link"] = link
    return resp


@router.post("/login")
async def login(data: LoginIn, _rl=Depends(security.rate_limit("login", RL_LOGIN_MAX, RL_LOGIN_WINDOW))):
    username = data.username.lower().strip()
    user = await db.users.find_one({"username": username})
    if not user:
        user = await db.users.find_one({"email": username})
    if not user or not auth_lib.verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Non itilizatè oswa modpas pa kòrèk.")
    if user.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail="Kont ou sispann. Kontakte sipò.")
    if not user.get("email_verified"):
        raise HTTPException(status_code=403, detail="Verifye email ou avan ou konekte.")
    token = auth_lib.create_access_token(user["id"], user["username"], user["role"], user.get("token_version", 0))
    return {"access_token": token, "user": public_user(user)}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@router.post("/google")
async def google_auth(data: GoogleAuthIn):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google login pa konfigire sou sèvè a.")
    try:
        resp = requests.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": data.credential},
            timeout=10,
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Pa ka verifye ak Google kounye a. Eseye ankò.")
    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Token Google pa valab.")
    info = resp.json()
    if info.get("aud") != GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=401, detail="Token Google pa valab pou sit sa a.")
    if info.get("email_verified") not in ("true", True):
        raise HTTPException(status_code=401, detail="Email Google ou pa verifye.")

    email = info["email"].lower().strip()
    google_id = info["sub"]
    user = await db.users.find_one({"email": email})

    if user:
        if user.get("status") in ("banned", "suspended"):
            raise HTTPException(status_code=403, detail="Kont ou sispann. Kontakte sipò.")
        updates = {"email_verified": True}
        if not user.get("google_id"):
            updates["google_id"] = google_id
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
        user.update(updates)
    else:
        if not data.department or not data.city:
            # First-time Google sign-up needs department/city; ask the frontend to collect it.
            raise HTTPException(status_code=422, detail="Chwazi depatman ak vil ou pou fini enskripsyon an.")
        uid = str(uuid.uuid4())
        base_username = re.sub(r"[^a-z0-9]", "", email.split("@")[0].lower()) or "itilizatè"
        username = base_username
        suffix = 1
        while await db.users.find_one({"username": username}):
            suffix += 1
            username = f"{base_username}{suffix}"
        user = {
            "id": uid,
            "full_name": info.get("name", email.split("@")[0]),
            "username": username,
            "email": email,
            "phone": "",
            "password_hash": None,
            "google_id": google_id,
            "country": "Ayiti",
            "department": data.department,
            "city": data.city,
            "role": "user",
            "status": "active",
            "email_verified": True,
            "phone_verified": False,
            "is_seller": False,
            "avatar": info.get("picture", ""),
            "token_version": 0,
            "terms_accepted": True,
            "created_at": now_iso(),
        }
        await db.users.insert_one(user)

    token = auth_lib.create_access_token(user["id"], user["username"], user["role"], user.get("token_version", 0))
    return {"access_token": token, "user": public_user(user)}


@router.post("/logout-all")
async def logout_all(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$inc": {"token_version": 1}})
    return {"message": "Tout sesyon fèmen."}


@router.post("/forgot-password")
async def forgot_password(data: ForgotIn, _rl=Depends(security.rate_limit("forgot", RL_FORGOT_MAX, RL_FORGOT_WINDOW))):
    user = await db.users.find_one({"email": data.email.lower().strip()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.email_tokens.insert_one({
            "token": token, "user_id": user["id"], "type": "reset",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        })
        link = f"{FRONTEND_URL}/reset-password?token={token}"
        email_service.send_reset_email(user["email"], user["full_name"], link)
        resp = {"message": "Si email la egziste, nou voye yon lyen reset."}
        if DEMO_MODE:
            resp["demo_reset_link"] = link
        return resp
    return {"message": "Si email la egziste, nou voye yon lyen reset."}


@router.post("/reset-password")
async def reset_password(data: ResetIn, _rl=Depends(security.rate_limit("reset", RL_RESET_MAX, RL_RESET_WINDOW))):
    rec = await db.email_tokens.find_one({"token": data.token, "type": "reset"})
    if not rec or datetime.fromisoformat(rec["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lyen reset la pa valab oswa ekspire.")
    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Modpas la dwe gen omwen 8 karaktè.")
    await db.users.update_one({"id": rec["user_id"]}, {"$set": {"password_hash": auth_lib.hash_password(data.password)}, "$inc": {"token_version": 1}})
    await db.email_tokens.delete_one({"token": data.token})
    return {"message": "Modpas chanje. Ou ka konekte kounye a."}


@router.post("/verify-phone")
async def verify_phone(user: dict = Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"phone_verified": True}})
    return {"message": "Telefòn ou verifye."}
