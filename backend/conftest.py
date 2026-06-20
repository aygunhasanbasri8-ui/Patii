import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

os.environ.setdefault("JWT_SECRET_KEY", "test-only-secret-not-for-production")

from app.db import get_db  # noqa: E402 — env var set edilmeden önce import olmamalı
from app.models import Base, User  # noqa: E402
from main import app  # noqa: E402

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def mock_send_email(monkeypatch):
    monkeypatch.setattr("app.mail.send_email", lambda *a, **kw: True)


@pytest.fixture(autouse=True)
def bypass_turnstile(monkeypatch):
    monkeypatch.setattr("app.turnstile.verify", lambda token: None)


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def registered_user(client, db_session):
    user_data = {
        "full_name": "Test User",
        "email": "test@example.com",
        "password": "testpassword123"
    }
    resp = client.post("/api/auth/register", json=user_data)
    assert resp.status_code == 200, resp.text
    user = db_session.query(User).filter(User.email == user_data["email"]).first()
    user.is_verified = True
    db_session.commit()
    return user_data


@pytest.fixture
def auth_token(client, registered_user):
    response = client.post("/api/auth/login", json={
        "email": registered_user["email"],
        "password": registered_user["password"]
    })
    return response.json()["access_token"]
