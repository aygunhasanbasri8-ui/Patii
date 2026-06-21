import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

_SENDER_NAME = "Pati"


def send_email(to_email: str, subject: str, html_content: str) -> bool:
    gmail_address = os.getenv("GMAIL_ADDRESS")
    gmail_password = os.getenv("GMAIL_APP_PASSWORD")

    if not gmail_address or not gmail_password:
        logger.warning("GMAIL_ADDRESS veya GMAIL_APP_PASSWORD tanımlı değil. E-posta gönderilmedi: %s", to_email)
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{_SENDER_NAME} <{gmail_address}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(gmail_address, gmail_password)
            smtp.sendmail(gmail_address, to_email, msg.as_bytes())
        logger.info("E-posta gönderildi: %s", to_email)
        return True
    except Exception as exc:
        logger.error("E-posta gönderilemedi (%s): %s", to_email, exc)
        return False
