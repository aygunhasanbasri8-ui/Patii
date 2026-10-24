"""Hatırlatıcı bildirimleri: Expo push token kaydı ve günlük gönderim.

Sunucu her gün REMINDER_NOTIFY_HOUR'da (varsayılan 09:00, Türkiye saati) o güne
düşen hatırlatıcılar için sahibinin cihazlarına Expo push bildirimi yollar.
Birden fazla replika aynı anda çalışsa bile bir hatırlatıcı günde bir kez
gönderilir: gönderimden önce satır koşullu UPDATE ile "sahipleniliyor".
"""

import logging
import os
import re
import threading
from datetime import datetime

import httpx
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from . import models, recurrence, repositories
from .services import advance_repeating

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_EXPO_BATCH = 100  # Expo tek istekte en fazla 100 mesaj kabul ediyor
_TOKEN_RE = re.compile(r"^Expo(nent)?PushToken\[[A-Za-z0-9_\-]+\]$")

NOTIFY_HOUR = int(os.getenv("REMINDER_NOTIFY_HOUR", "9"))
CHECK_INTERVAL_SEC = int(os.getenv("REMINDER_CHECK_INTERVAL_SEC", "600"))


def register_token(db: Session, user: models.User, token: str, platform: str | None) -> dict:
    token = (token or "").strip()
    if not _TOKEN_RE.match(token):
        raise HTTPException(status_code=400, detail="Geçersiz bildirim anahtarı.")

    row = db.query(models.PushToken).filter(models.PushToken.token == token).first()
    if row is None:
        db.add(models.PushToken(user_id=user.id, token=token, platform=platform))
    else:
        # Aynı cihazda başka hesapla giriş yapıldıysa bildirimler yeni hesaba gitsin
        row.user_id, row.platform = user.id, platform
    db.commit()
    return {"message": "Bildirimler açıldı."}


def unregister_token(db: Session, user: models.User, token: str) -> dict:
    db.query(models.PushToken).filter(
        models.PushToken.token == token, models.PushToken.user_id == user.id
    ).delete(synchronize_session=False)
    db.commit()
    return {"message": "Bildirimler kapatıldı."}


def send_expo(messages: list[dict]) -> list[dict]:
    """Mesajları Expo'ya yollar, her mesaj için Expo'nun "ticket"ını döner."""
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if os.getenv("EXPO_ACCESS_TOKEN"):
        headers["Authorization"] = f"Bearer {os.environ['EXPO_ACCESS_TOKEN']}"
    tickets: list[dict] = []
    with httpx.Client(timeout=15) as client:
        for start in range(0, len(messages), _EXPO_BATCH):
            resp = client.post(EXPO_PUSH_URL, json=messages[start:start + _EXPO_BATCH], headers=headers)
            resp.raise_for_status()
            tickets.extend(resp.json().get("data", []))
    return tickets


def _claim(db: Session, reminder_id: int, today) -> bool:
    claimed = (
        db.query(models.Reminder)
        .filter(
            models.Reminder.id == reminder_id,
            or_(models.Reminder.last_notified_on.is_(None), models.Reminder.last_notified_on < today),
        )
        .update({models.Reminder.last_notified_on: today}, synchronize_session=False)
    )
    db.commit()
    return claimed == 1


def run_once(db: Session, now: datetime | None = None, sender=send_expo) -> int:
    """Bir tur: tekrarlıları ileri sarar, saati geldiyse bugünküleri gönderir.

    Gönderilen bildirim sayısını döner.
    """
    now = now or datetime.now(recurrence.TIMEZONE)
    today = now.date()
    advance_repeating(db, repositories.get_repeating_reminders_due_before(db, today), today)
    if now.hour < NOTIFY_HOUR:
        return 0

    # Sadece bugüne düşenler: özellik açılmadan önceki eski hatırlatıcılar topluca gitmesin
    candidates = (
        db.query(models.Reminder)
        .filter(
            models.Reminder.due_date == today,
            or_(models.Reminder.last_notified_on.is_(None), models.Reminder.last_notified_on < today),
        )
        .all()
    )
    sent = 0
    for reminder in candidates:
        pet = reminder.pet
        tokens = [t.token for t in pet.owner.push_tokens] if pet and pet.owner else []
        if not tokens or not _claim(db, reminder.id, today):
            continue
        title, _, body = (reminder.text or "").partition(": ")
        messages = [
            {
                "to": token,
                "title": f"{pet.name}: {title}" if title else f"{pet.name} için hatırlatma",
                "body": body or title,
                "sound": "default",
                "data": {"reminder_id": reminder.id, "pet_id": pet.id},
            }
            for token in tokens
        ]
        try:
            tickets = sender(messages)
        except Exception:
            # Sahiplenmeyi geri al ki bir sonraki tur yeniden denesin
            logger.warning("Bildirim gönderilemedi (hatırlatıcı %s)", reminder.id, exc_info=True)
            reminder.last_notified_on = None
            db.commit()
            continue
        sent += len(messages)
        _drop_dead_tokens(db, tokens, tickets)
    return sent


def _drop_dead_tokens(db: Session, tokens: list[str], tickets: list[dict]) -> None:
    dead = [
        token for token, ticket in zip(tokens, tickets)
        if ticket.get("status") == "error"
        and (ticket.get("details") or {}).get("error") == "DeviceNotRegistered"
    ]
    if dead:
        db.query(models.PushToken).filter(models.PushToken.token.in_(dead)).delete(synchronize_session=False)
        db.commit()


class ReminderScheduler:
    """Uygulamayla birlikte açılan arka plan iş parçacığı."""

    def __init__(self, session_factory):
        self._session_factory = session_factory
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._loop, name="reminder-scheduler", daemon=True)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _loop(self) -> None:
        while not self._stop.is_set():
            db = self._session_factory()
            try:
                count = run_once(db)
                if count:
                    logger.info("%d hatırlatıcı bildirimi gönderildi", count)
            except Exception:
                logger.exception("Hatırlatıcı zamanlayıcısı turu başarısız")
            finally:
                db.close()
            self._stop.wait(CHECK_INTERVAL_SEC)
