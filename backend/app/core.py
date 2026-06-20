import logging
import os
from datetime import datetime, timedelta

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

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

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    if not password:
        return ""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


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
    except JWTError:
        raise credentials_exception

