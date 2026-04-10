import logging

from fastapi import FastAPI

from .api import router
from .db import engine
from .models import Base

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()
app.include_router(router)


@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Veritabanı tabloları başarıyla oluşturuldu.")
    except Exception as exc:
        logger.error(f"Tablo oluşturma hatası: {exc}")

