import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import router
from .db import engine
from .ml_model import load_model
from .models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(os.path.join(_STATIC_DIR, "uploads"), exist_ok=True)

app = FastAPI()

# PRODUCTION'DA "*" yerine spesifik domain listesi kullan (ALLOWED_ORIGINS env var).
_raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
_origins = [o.strip() for o in _raw_origins.split(",")] if _raw_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.mount("/static", StaticFiles(directory=_STATIC_DIR), name="static")
app.include_router(router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Beklenmeyen hata [%s %s]: %s\n%s",
        request.method,
        request.url,
        exc,
        traceback.format_exc(),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Sunucuda beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin."},
    )


@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Veritabanı tabloları başarıyla oluşturuldu.")
    except Exception as exc:
        logger.error(f"Tablo oluşturma hatası: {exc}")

    load_model()