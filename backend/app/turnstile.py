import logging
import os

import httpx
from fastapi import HTTPException

logger = logging.getLogger(__name__)

_TURNSTILE_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify(token: str | None) -> None:
    secret = os.getenv("TURNSTILE_SECRET_KEY")
    if not secret:
        return

    if not token:
        raise HTTPException(status_code=400, detail="Turnstile doğrulaması gerekli.")

    try:
        resp = httpx.post(
            _TURNSTILE_URL,
            data={"secret": secret, "response": token},
            timeout=5.0,
        )
        if not resp.json().get("success"):
            raise HTTPException(status_code=400, detail="Turnstile doğrulaması başarısız.")
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Turnstile API hatası, geçildi: %s", exc)
