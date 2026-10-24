import base64
import hashlib
import hmac
import logging
import os
import secrets
from datetime import datetime, timedelta

import jwt
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

_jwt_secret = os.getenv("JWT_SECRET_KEY")
if _jwt_secret:
    SECRET_KEY = _jwt_secret
else:
    SECRET_KEY = "DEV_ONLY_WEAK_SECRET_DO_NOT_USE_IN_PRODUCTION"
    logger.warning(
        "JWT_SECRET_KEY ortam değişkeni tanımlı değil! "
        "Geliştirme için zayıf bir anahtar kullanılıyor. "
        "Production'da JWT_SECRET_KEY mutlaka ayarlanmalıdır."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# Veritabanındaki mevcut hash'ler passlib'in pbkdf2_sha256 biçiminde
# ("$pbkdf2-sha256$<tur>$<tuz>$<özet>", base64'te '+' yerine '.', dolgusuz).
# Biçim aynen korunuyor ki hiçbir kullanıcının parolası geçersiz kalmasın.
_PBKDF2_SCHEME = "pbkdf2-sha256"
_PBKDF2_ROUNDS = 29000


def _ab64_encode(raw: bytes) -> str:
    return base64.b64encode(raw).rstrip(b"=").replace(b"+", b".").decode("ascii")


def _ab64_decode(text: str) -> bytes:
    text = text.replace(".", "+")
    return base64.b64decode(text + "=" * (-len(text) % 4))


def _pbkdf2(password: str, salt: bytes, rounds: int) -> bytes:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)


def hash_password(password: str) -> str:
    if not password:
        return ""
    salt = secrets.token_bytes(16)
    digest = _pbkdf2(password, salt, _PBKDF2_ROUNDS)
    return f"${_PBKDF2_SCHEME}${_PBKDF2_ROUNDS}${_ab64_encode(salt)}${_ab64_encode(digest)}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        _, scheme, rounds, salt, digest = hashed_password.split("$")
        if scheme != _PBKDF2_SCHEME:
            return False
        expected = _ab64_decode(digest)
        actual = _pbkdf2(plain_password, _ab64_decode(salt), int(rounds))
    except ValueError:
        return False
    return hmac.compare_digest(actual, expected)


def create_access_token(subject: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"sub": subject, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user_email(token: str) -> str:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Geçersiz bilet , lütfen tekrar giriş yap!",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str | None = payload.get("sub")
        if email is None:
            raise credentials_exception
        return email
    except jwt.PyJWTError:
        raise credentials_exception

