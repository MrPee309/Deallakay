"""
"Social" endpoints: conversations/messages (+ the WebSocket connection),
reviews, reports, and notifications.

Moved out of server.py during Phase 2A modularization. Behavior, paths, request
formats, and response formats are unchanged from before the move.
"""
import uuid

from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel

import auth as auth_lib
from shared import db, NO_ID, now_iso, get_current_user, manager, create_notification

router = APIRouter(prefix="/api", tags=["social"])


class ConversationIn(BaseModel):
    product_id: str


class MessageIn(BaseModel):
    content: str


class ReviewIn(BaseModel):
    seller_id: str
    rating: int
    comment: str = ""


class ReportIn(BaseModel):
    target_type: str
    target_id: str
    reason: str
    description: str = ""


# ---------------- Messaging ----------------
@router.post("/conversations")
async def create_conversation(data: ConversationIn, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"id": data.product_id})
    if not p:
        raise HTTPException(status_code=404, detail="Pwodwi pa jwenn.")
    if p["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka voye mesaj ba tèt ou.")
    existing = await db.conversations.find_one({"product_id": data.product_id, "buyer_id": user["id"]}, NO_ID)
    if existing:
        return existing
    conv = {
        "id": str(uuid.uuid4()),
        "product_id": data.product_id,
        "product_title": p["title"],
        "product_image": (p.get("images") or [""])[0] if p.get("images") else "",
        "buyer_id": user["id"],
        "buyer_username": user["username"],
        "seller_id": p["seller_id"],
        "seller_username": p["seller_username"],
        "last_message": "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.conversations.insert_one(dict(conv))
    return conv


@router.get("/conversations")
async def list_conversations(user: dict = Depends(get_current_user)):
    convs = await db.conversations.find({"$or": [{"buyer_id": user["id"]}, {"seller_id": user["id"]}]}, NO_ID).sort("updated_at", -1).to_list(200)
    for c in convs:
        c["unread"] = await db.messages.count_documents({"conversation_id": c["id"], "sender_id": {"$ne": user["id"]}, "read": False})
        other_id = c["seller_id"] if c["buyer_id"] == user["id"] else c["buyer_id"]
        other = await db.users.find_one({"id": other_id}, NO_ID)
        c["other_user"] = {"username": other["username"], "avatar": other.get("avatar", "")} if other else {}
    return convs


@router.get("/conversations/{cid}/messages")
async def get_messages(cid: str, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid}, NO_ID)
    if not conv or user["id"] not in (conv["buyer_id"], conv["seller_id"]):
        raise HTTPException(status_code=403, detail="Aksè refize.")
    await db.messages.update_many({"conversation_id": cid, "sender_id": {"$ne": user["id"]}}, {"$set": {"read": True}})
    msgs = await db.messages.find({"conversation_id": cid}, NO_ID).sort("created_at", 1).to_list(1000)
    return {"conversation": conv, "messages": msgs}


@router.post("/conversations/{cid}/messages")
async def send_message(cid: str, data: MessageIn, user: dict = Depends(get_current_user)):
    conv = await db.conversations.find_one({"id": cid})
    if not conv or user["id"] not in (conv["buyer_id"], conv["seller_id"]):
        raise HTTPException(status_code=403, detail="Aksè refize.")
    msg = {
        "id": str(uuid.uuid4()),
        "conversation_id": cid,
        "sender_id": user["id"],
        "sender_username": user["username"],
        "content": data.content,
        "read": False,
        "created_at": now_iso(),
    }
    await db.messages.insert_one(dict(msg))
    await db.conversations.update_one({"id": cid}, {"$set": {"last_message": data.content, "updated_at": now_iso()}})
    recipient = conv["seller_id"] if conv["buyer_id"] == user["id"] else conv["buyer_id"]
    clean = {k: v for k, v in msg.items() if k != "_id"}
    await manager.send(recipient, {"event": "message", "data": clean, "conversation_id": cid})
    await create_notification(recipient, "message", f"Nouvo mesaj de @{user['username']}", "/messages")
    return clean


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    try:
        payload = auth_lib.decode_token(token)
        user_id = payload["sub"]
    except Exception:
        await websocket.close(code=1008)
        return
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception:
        manager.disconnect(user_id, websocket)


# ---------------- Reviews ----------------
@router.post("/reviews")
async def create_review(data: ReviewIn, user: dict = Depends(get_current_user)):
    if data.rating < 1 or data.rating > 5:
        raise HTTPException(status_code=400, detail="Rating dwe ant 1 ak 5.")
    if data.seller_id == user["id"]:
        raise HTTPException(status_code=400, detail="Ou pa ka evalye tèt ou.")
    if await db.reviews.find_one({"seller_id": data.seller_id, "buyer_id": user["id"]}):
        raise HTTPException(status_code=400, detail="Ou deja evalye vandè sa a.")
    verified = bool(await db.conversations.find_one({"seller_id": data.seller_id, "buyer_id": user["id"]}))
    review = {
        "id": str(uuid.uuid4()),
        "seller_id": data.seller_id,
        "buyer_id": user["id"],
        "buyer_username": user["username"],
        "buyer_avatar": user.get("avatar", ""),
        "rating": data.rating,
        "comment": data.comment,
        "verified": verified,
        "created_at": now_iso(),
    }
    await db.reviews.insert_one(dict(review))
    all_reviews = await db.reviews.find({"seller_id": data.seller_id}).to_list(1000)
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews), 1)
    await db.seller_profiles.update_one({"user_id": data.seller_id}, {"$set": {"rating": avg, "review_count": len(all_reviews)}})
    await create_notification(data.seller_id, "review", f"Nouvo avi {data.rating} zetwal de @{user['username']}", "")
    return {k: v for k, v in review.items() if k != "_id"}


# ---------------- Reports ----------------
@router.post("/reports")
async def create_report(data: ReportIn, user: dict = Depends(get_current_user)):
    report = {
        "id": str(uuid.uuid4()),
        "target_type": data.target_type,
        "target_id": data.target_id,
        "reporter_id": user["id"],
        "reporter_username": user["username"],
        "reason": data.reason,
        "description": data.description,
        "status": "open",
        "created_at": now_iso(),
    }
    await db.reports.insert_one(dict(report))
    return {"message": "Rapò ou voye. Mèsi."}


# ---------------- Notifications ----------------
@router.get("/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    notifs = await db.notifications.find({"user_id": user["id"]}, NO_ID).sort("created_at", -1).to_list(100)
    unread = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"notifications": notifs, "unread": unread}


@router.post("/notifications/read-all")
async def read_all_notifications(user: dict = Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}


@router.post("/notifications/{nid}/read")
async def read_notification(nid: str, user: dict = Depends(get_current_user)):
    await db.notifications.update_one({"id": nid, "user_id": user["id"]}, {"$set": {"read": True}})
    return {"message": "ok"}
