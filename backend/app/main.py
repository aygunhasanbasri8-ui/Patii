import logging
import traceback

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from .api import router
from .db import engine
from .models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
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

