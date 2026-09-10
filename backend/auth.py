"""
Low-level authentication utilities: password hashing (bcrypt) and JWT access
tokens (PyJWT). Used by routers/auth.py, routers/admin.py, and the
get_current_user dependency in shared.py — never contains any endpoint
itself.

RECONSTRUCTED — this file was found overwritten with the content that
actually belongs in routers/auth.py (both files are named "auth.py", which
is what caused the mix-up). Rebuilt to match the exact contract every other
file in the codebase already calls: hash_password, verify_password,
create_access_token(user_id, username, role, token_version), and
decode_token(token) -> payload with "sub" (user id) and "tv" (token
version). Test login/register/token-refresh thoroughly after deploying this.
"""
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = int(os.environ.get("JWT_EXPIRES_DAYS", 30))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, username: str, role: str, token_version: int = 0) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "role": role,
        "tv": token_version,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
