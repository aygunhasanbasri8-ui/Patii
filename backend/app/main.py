import logging
import os
import traceback

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import router
from .db import SessionLocal, engine
from .ml_model import load_model
from .models import Base
from .notifications import ReminderScheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(os.path.join(_STATIC_DIR, "uploads"), exist_ok=True)


class _SafeStaticFiles(StaticFiles):
    # Doğrulamadan önce yüklenmiş .html/.svg gibi dosyalar aynı origin'de script çalıştırmasın
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Security-Policy"] = "default-src 'none'; sandbox"
        return response


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

app.mount("/static", _SafeStaticFiles(directory=_STATIC_DIR), name="static")
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
        logger.error("Tablo oluşturma hatası: %s", exc)

    load_model()

    # Birden çok worker/replika olursa her biri çalışır; gönderim koşullu UPDATE ile tekilleşiyor
    if os.getenv("REMINDER_NOTIFICATIONS", "1") != "0":
        app.state.reminder_scheduler = ReminderScheduler(SessionLocal)
        app.state.reminder_scheduler.start()


@app.on_event("shutdown")
def shutdown():
    scheduler = getattr(app.state, "reminder_scheduler", None)
    if scheduler is not None:
        scheduler.stop()