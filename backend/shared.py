"""
Shared infrastructure used across server.py and routers/*.

This module exists so that server.py and any router module can both depend on
the same MongoDB connection, the same `get_current_user`/`get_admin` auth
dependencies, and the same small helpers — without importing from each other
and risking circular imports.

Nothing in this file's *behavior* changed during the Phase 2A modularization;
this is the same code that used to live directly in server.py, moved here
unchanged so it can be shared.
"""
import os
import re
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict

from fastapi import HTTPException, Request, Depends, WebSocket
from motor.motor_asyncio import AsyncIOMotorClient

import auth as auth_lib

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deallakay")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

NO_ID = {"_id": 0}


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def slugify(text: str) -> str:
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    text = re.sub(r"[\s_-]+", "-", text)
    return text[:60] or "item"


# ---------------- Auth dependency ----------------
async def get_current_user(request: Request) -> dict:
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Ou pa konekte.")
    try:
        payload = auth_lib.decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Session ou ekspire. Konekte ankò.")
    user = await db.users.find_one({"id": payload["sub"]}, NO_ID)
    if not user:
        raise HTTPException(status_code=401, detail="Itilizatè pa jwenn.")
    if payload.get("tv", 0) != user.get("token_version", 0):
        raise HTTPException(status_code=401, detail="Session ou fèmen. Konekte ankò.")
    if user.get("status") in ("banned", "suspended"):
        raise HTTPException(status_code=403, detail="Kont ou sispann. Kontakte sipò.")
    user.pop("password_hash", None)
    return user


async def get_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Aksè admin sèlman.")
    return user


def public_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "full_name": u.get("full_name"),
        "username": u.get("username"),
        "email": u.get("email"),
        "phone": u.get("phone"),
        "country": u.get("country"),
        "department": u.get("department"),
        "city": u.get("city"),
        "role": u.get("role"),
        "email_verified": u.get("email_verified", False),
        "phone_verified": u.get("phone_verified", False),
        "is_seller": u.get("is_seller", False),
        "avatar": u.get("avatar", ""),
        "created_at": u.get("created_at"),
    }


# ---------------- WebSocket manager / notifications ----------------
class ConnectionManager:
    def __init__(self):
        self.active: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        conns = self.active.get(user_id, [])
        if ws in conns:
            conns.remove(ws)

    async def send(self, user_id: str, data: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


async def create_notification(user_id: str, ntype: str, message: str, link: str = ""):
    notif = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": ntype,
        "message": message,
        "link": link,
        "read": False,
        "created_at": now_iso(),
    }
    await db.notifications.insert_one(dict(notif))
    await manager.send(user_id, {"event": "notification", "data": {k: v for k, v in notif.items() if k != "_id"}})

