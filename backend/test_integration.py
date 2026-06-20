from datetime import datetime, timedelta

from app.models import User


class TestEmailVerificationFlow:
    def test_unverified_user_cannot_login(self, client):
        client.post("/api/auth/register", json={
            "full_name": "Unverified User",
            "email": "unverified@example.com",
            "password": "password123",
        })
        resp = client.post("/api/auth/login", json={
            "email": "unverified@example.com",
            "password": "password123",
        })
        assert resp.status_code == 403
        assert "doğrula" in resp.json()["detail"].lower()

    def test_wrong_verification_code_rejected(self, client, db_session):
        client.post("/api/auth/register", json={
            "full_name": "Wrong Code User",
            "email": "wrongcode@example.com",
            "password": "password123",
        })
        user = db_session.query(User).filter(User.email == "wrongcode@example.com").first()
        real_code = user.verification_code
        wrong_code = "000000" if real_code != "000000" else "111111"

        resp = client.post("/api/auth/verify-email", json={
            "email": "wrongcode@example.com",
            "code": wrong_code,
        })
        assert resp.status_code == 400

    def test_full_register_verify_login(self, client, db_session):
        resp = client.post("/api/auth/register", json={
            "full_name": "Integration User",
            "email": "integration@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200

        resp = client.post("/api/auth/login", json={
            "email": "integration@example.com",
            "password": "password123",
        })
        assert resp.status_code == 403

        user = db_session.query(User).filter(User.email == "integration@example.com").first()
        code = user.verification_code
        assert code is not None

        resp = client.post("/api/auth/verify-email", json={
            "email": "integration@example.com",
            "code": code,
        })
        assert resp.status_code == 200

        resp = client.post("/api/auth/login", json={
            "email": "integration@example.com",
            "password": "password123",
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_resend_verification_rate_limit(self, client, db_session):
        client.post("/api/auth/register", json={
            "full_name": "Resend User",
            "email": "resend@example.com",
            "password": "password123",
        })
        resp = client.post("/api/auth/resend-verification", json={"email": "resend@example.com"})
        assert resp.status_code == 429
        assert "saniye" in resp.json()["detail"].lower()

    def test_resend_verification_after_cooldown(self, client, db_session):
        client.post("/api/auth/register", json={
            "full_name": "Resend User 2",
            "email": "resend2@example.com",
            "password": "password123",
        })
        user = db_session.query(User).filter(User.email == "resend2@example.com").first()
        user.verification_code_sent_at = datetime.utcnow() - timedelta(seconds=61)
        db_session.commit()

        resp = client.post("/api/auth/resend-verification", json={"email": "resend2@example.com"})
        assert resp.status_code == 200

        db_session.refresh(user)
        assert user.verification_code is not None


class TestForgotPasswordFlow:
    def _register_and_verify(self, client, db_session, email="reset@example.com", password="original123"):
        client.post("/api/auth/register", json={
            "full_name": "Reset User",
            "email": email,
            "password": password,
        })
        user = db_session.query(User).filter(User.email == email).first()
        user.is_verified = True
        db_session.commit()
        return user

    def test_forgot_password_unknown_email_returns_200(self, client):
        resp = client.post("/api/auth/forgot-password", json={"email": "ghost@example.com"})
        assert resp.status_code == 200

    def test_full_forgot_reset_login(self, client, db_session):
        email = "resetflow@example.com"
        self._register_and_verify(client, db_session, email=email)

        resp = client.post("/api/auth/forgot-password", json={"email": email})
        assert resp.status_code == 200

        user = db_session.query(User).filter(User.email == email).first()
        db_session.refresh(user)
        reset_code = user.reset_code
        assert reset_code is not None

        resp = client.post("/api/auth/reset-password", json={
            "email": email,
            "code": reset_code,
            "new_password": "newpassword456",
        })
        assert resp.status_code == 200

        resp = client.post("/api/auth/login", json={"email": email, "password": "newpassword456"})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

        resp = client.post("/api/auth/login", json={"email": email, "password": "original123"})
        assert resp.status_code == 401

    def test_wrong_reset_code_rejected(self, client, db_session):
        email = "wrongreset@example.com"
        user = self._register_and_verify(client, db_session, email=email)

        client.post("/api/auth/forgot-password", json={"email": email})
        db_session.refresh(user)
        real_code = user.reset_code
        wrong_code = "000000" if real_code != "000000" else "111111"

        resp = client.post("/api/auth/reset-password", json={
            "email": email,
            "code": wrong_code,
            "new_password": "newpassword456",
        })
        assert resp.status_code == 400

    def test_expired_reset_code_rejected(self, client, db_session):
        email = "expiredreset@example.com"
        user = self._register_and_verify(client, db_session, email=email)

        user.reset_code = "123456"
        user.reset_code_expires_at = datetime.utcnow() - timedelta(minutes=1)
        db_session.commit()

        resp = client.post("/api/auth/reset-password", json={
            "email": email,
            "code": "123456",
            "new_password": "newpassword456",
        })
        assert resp.status_code == 400
        assert "süre" in resp.json()["detail"].lower()

    def test_reset_password_too_short_rejected(self, client, db_session):
        email = "shortpw@example.com"
        user = self._register_and_verify(client, db_session, email=email)

        user.reset_code = "999999"
        user.reset_code_expires_at = datetime.utcnow() + timedelta(minutes=15)
        db_session.commit()

        resp = client.post("/api/auth/reset-password", json={
            "email": email,
            "code": "999999",
            "new_password": "abc",
        })
        assert resp.status_code == 400
        assert "6 karakter" in resp.json()["detail"].lower()
