import logging
import os

import httpx

logger = logging.getLogger(__name__)

_BREVO_URL = "https://api.brevo.com/v3/smtp/email"
_SENDER_EMAIL = "noreply@pati.app"
_SENDER_NAME = "Pati"


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    api_key = os.getenv("BREVO_API_KEY")
    if not api_key:
        logger.warning("BREVO_API_KEY tanımlı değil. E-posta gönderilmedi: %s", to_email)
        return False

    payload = {
        "sender": {"name": _SENDER_NAME, "email": _SENDER_EMAIL},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content,
    }

    try:
        resp = httpx.post(
            _BREVO_URL,
            json=payload,
            headers={"api-key": api_key, "Content-Type": "application/json"},
            timeout=10.0,
        )
        resp.raise_for_status()
        logger.info("E-posta gönderildi: %s", to_email)
        return True
    except Exception as exc:
        logger.error("E-posta gönderilemedi (%s): %s", to_email, exc)
        return False
