"""
Security hardening utilities: brute-force rate limiting and image upload validation.

RATE LIMITING — implementation note
------------------------------------
This uses an in-process (in-memory) sliding-window counter, not Redis or another
shared store. That is a deliberate choice for the current infrastructure:

  - Render's free/starter web service runs a single instance (WEB_CONCURRENCY=1
    was observed in production logs), so an in-memory store is consistent across
    all requests today.
  - There is no Redis (or similar shared cache) currently provisioned for this
    project, and adding one would be new infrastructure, not a "least disruptive"
    change for a security-hardening pass.

LIMITATION: if this service is ever scaled to more than one backend instance
(e.g. Render's paid "scale to N instances" tier), each instance will keep its
own counters, effectively multiplying the limits by the instance count. If/when
that happens, replace the in-memory store below with a shared one (e.g. Redis)
— the `_hits` dict is the only place that would need to change.
"""
import time
import base64
import binascii
import os
from collections import defaultdict
from fastapi import HTTPException, Request

# ---------------- Rate limiting ----------------
# key -> list of unix timestamps (seconds) of recent attempts
_hits: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    # Render (and most PaaS) sit behind a proxy; the real client IP is in
    # X-Forwarded-For. Fall back to the direct connection if absent.
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(bucket: str, max_attempts: int, window_seconds: int):
    """
    Returns a FastAPI dependency that limits requests to `max_attempts` per
    `window_seconds`, keyed by (bucket, client IP). Raises 429 with a
    Retry-After header when the limit is exceeded. Does not reveal anything
    about *why* a request was rejected beyond "too many attempts".
    """
    def _dep(request: Request):
        key = f"{bucket}:{_client_ip(request)}"
        now = time.time()
        window_start = now - window_seconds
        attempts = _hits[key]
        # Drop expired attempts.
        while attempts and attempts[0] < window_start:
            attempts.pop(0)
        if len(attempts) >= max_attempts:
            retry_after = int(attempts[0] + window_seconds - now) + 1
            raise HTTPException(
                status_code=429,
                detail="Twòp tantativ. Tann yon ti moman anvan w eseye ankò.",
                headers={"Retry-After": str(max(retry_after, 1))},
            )
        attempts.append(now)
    return _dep


# ---------------- Image upload validation ----------------
# Conservative defaults for now: MongoDB Atlas free tier caps out at 512MB
# total. At 6MB x 10 images, a SINGLE listing could use ~60MB — over 10% of
# the whole database in one product. 2MB x 6 keeps worst-case abuse well
# under 15MB per listing, while still being generous for a compressed photo
# (the frontend already compresses uploads to well under 500KB typically).
# Raise these via env vars once storage capacity grows (e.g. a paid Atlas
# tier or a move to external image storage) — no code change needed.
MAX_IMAGE_BYTES = int(os.environ.get("IMAGE_MAX_BYTES", 2 * 1024 * 1024))  # 2 MB default
MAX_IMAGES_PER_PRODUCT = int(os.environ.get("IMAGE_MAX_COUNT", 6))

_MAGIC_BYTES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
    "image/webp": (b"RIFF",),  # WEBP has "WEBP" at offset 8, checked separately below
}


def _validate_one_image(data_url: str, index: int):
    if not isinstance(data_url, str) or not data_url.startswith("data:"):
        raise HTTPException(status_code=400, detail=f"Imaj #{index + 1} pa gen bon fòma.")
    try:
        header, b64data = data_url.split(",", 1)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Imaj #{index + 1} pa gen bon fòma.")
    mime = header[5:].split(";")[0].strip().lower()
    if mime not in _MAGIC_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"Imaj #{index + 1}: fòma '{mime}' pa aksepte. Sèlman JPEG, PNG, oswa WEBP.",
        )
    try:
        raw = base64.b64decode(b64data, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(status_code=400, detail=f"Imaj #{index + 1} domaje oswa pa valab.")
    if len(raw) > MAX_IMAGE_BYTES:
        mb = MAX_IMAGE_BYTES // (1024 * 1024)
        raise HTTPException(status_code=400, detail=f"Imaj #{index + 1} twò gwo (limit {mb}MB).")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail=f"Imaj #{index + 1} vid.")
    magic_ok = any(raw.startswith(sig) for sig in _MAGIC_BYTES[mime])
    if mime == "image/webp":
        magic_ok = raw.startswith(b"RIFF") and raw[8:12] == b"WEBP"
    if not magic_ok:
        raise HTTPException(
            status_code=400,
            detail=f"Imaj #{index + 1}: kontni fichye a pa matche ak fòma '{mime}' li deklare a.",
        )


def validate_images(images: list[str]):
    """Raises HTTPException(400) if any image is missing/oversized/wrong type/corrupt."""
    if len(images) > MAX_IMAGES_PER_PRODUCT:
        raise HTTPException(
            status_code=400,
            detail=f"Maksimòm {MAX_IMAGES_PER_PRODUCT} imaj pou chak pwodwi.",
        )
    for i, img in enumerate(images):
        _validate_one_image(img, i)
