from app.db import SessionLocal, engine, get_db
from app.models import Base


def init_db():
    Base.metadata.create_all(bind=engine)