from datetime import date, datetime

from app import models, notifications
from app.recurrence import TIMEZONE

TOKEN = "ExponentPushToken[abc123]"


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _pet_with_reminder(client, auth_token, remind_at, repeat=None):
    pet_id = client.post("/api/pets/add", json={"name": "Pamuk", "species": "Kedi", "breed": "Van"},
                         headers=_auth(auth_token)).json()["pet_id"]
    body = {"pet_id": pet_id, "title": "Aşı", "description": "Kuduz aşısı", "remind_at": remind_at}
    if repeat:
        body["repeat"] = repeat
    resp = client.post("/api/reminders/add", json=body, headers=_auth(auth_token))
    assert resp.status_code == 200, resp.text
    return pet_id, resp.json()["reminder_id"]


def _at(day: date, hour: int) -> datetime:
    return datetime(day.year, day.month, day.day, hour, 0, tzinfo=TIMEZONE)


class FakeSender:
    def __init__(self, fail=False, ticket=None):
        self.batches, self.fail, self.ticket = [], fail, ticket or {"status": "ok"}

    def __call__(self, messages):
        if self.fail:
            raise OSError("ağ yok")
        self.batches.append(messages)
        return [self.ticket for _ in messages]


def test_token_is_validated_and_not_duplicated(client, auth_token, db_session):
    assert client.post("/api/notifications/token", json={"token": "x"}, headers=_auth(auth_token)).status_code == 400
    assert client.post("/api/notifications/token", json={"token": TOKEN, "platform": "android"},
                       headers=_auth(auth_token)).status_code == 200
    # Aynı cihaz ikinci kez kaydedilince kopya oluşmuyor
    client.post("/api/notifications/token", json={"token": TOKEN}, headers=_auth(auth_token))
    assert db_session.query(models.PushToken).count() == 1

    client.delete("/api/notifications/token", params={"token": TOKEN}, headers=_auth(auth_token))
    assert db_session.query(models.PushToken).count() == 0


def test_due_reminder_is_sent_once_after_notify_hour(client, auth_token, db_session):
    today = date(2026, 11, 2)
    client.post("/api/notifications/token", json={"token": TOKEN}, headers=_auth(auth_token))
    _pet_with_reminder(client, auth_token, "02/11/2026")
    _pet_with_reminder(client, auth_token, "01/11/2026")  # dünkü, hiç gönderilmemeli

    sender = FakeSender()
    assert notifications.run_once(db_session, _at(today, 8), sender) == 0
    assert notifications.run_once(db_session, _at(today, 9), sender) == 1
    assert notifications.run_once(db_session, _at(today, 15), sender) == 0

    message = sender.batches[0][0]
    assert message["to"] == TOKEN
    assert message["title"] == "Pamuk: Aşı" and message["body"] == "Kuduz aşısı"


def test_failed_send_is_retried_and_dead_tokens_removed(client, auth_token, db_session):
    today = date(2026, 11, 2)
    client.post("/api/notifications/token", json={"token": TOKEN}, headers=_auth(auth_token))
    _pet_with_reminder(client, auth_token, "02/11/2026")

    assert notifications.run_once(db_session, _at(today, 9), FakeSender(fail=True)) == 0
    dead = FakeSender(ticket={"status": "error", "details": {"error": "DeviceNotRegistered"}})
    assert notifications.run_once(db_session, _at(today, 10), dead) == 1
    assert db_session.query(models.PushToken).count() == 0


def test_repeating_reminder_moves_to_next_occurrence(client, auth_token, db_session):
    client.post("/api/notifications/token", json={"token": TOKEN}, headers=_auth(auth_token))
    pet_id, rid = _pet_with_reminder(client, auth_token, "31/08/2026", repeat="FREQ=MONTHLY;INTERVAL=1")

    sender = FakeSender()
    # 30 Eylül: 31 Ağustos'un aylık tekrarı ay sonuna denk geliyor
    assert notifications.run_once(db_session, _at(date(2026, 9, 30), 9), sender) == 1
    reminder = db_session.get(models.Reminder, rid)
    assert reminder.date == "30/09/2026"

    notifications.run_once(db_session, _at(date(2026, 10, 2), 9), sender)
    db_session.refresh(reminder)
    assert reminder.date == "31/10/2026"
    assert reminder.repeat_rule == "FREQ=MONTHLY;INTERVAL=1"


def test_invalid_repeat_rule_is_rejected(client, auth_token):
    pet_id = client.post("/api/pets/add", json={"name": "Pamuk", "species": "Kedi", "breed": "Van"},
                         headers=_auth(auth_token)).json()["pet_id"]
    resp = client.post("/api/reminders/add", json={
        "pet_id": pet_id, "title": "Aşı", "description": "x", "remind_at": "02/11/2026", "repeat": "FREQ=HOURLY",
    }, headers=_auth(auth_token))
    assert resp.status_code == 422
