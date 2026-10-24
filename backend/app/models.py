from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_verified = Column(Boolean, nullable=False, default=False, server_default="0")
    verification_code = Column(String, nullable=True)
    verification_code_sent_at = Column(DateTime, nullable=True)
    reset_code = Column(String, nullable=True)
    reset_code_expires_at = Column(DateTime, nullable=True)
    failed_code_attempts = Column(Integer, nullable=False, default=0, server_default="0")

    pets = relationship("Pet", back_populates="owner")
    push_tokens = relationship("PushToken", back_populates="user", cascade="all, delete-orphan")


class Pet(Base):
    __tablename__ = "pets"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    species = Column(String)
    breed = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    avatar_type = Column(String, nullable=True)   # "icon" | "photo" | None
    avatar_value = Column(String, nullable=True)  # emoji string or "/static/uploads/..."

    owner = relationship("User", back_populates="pets")
    reminders = relationship("Reminder", back_populates="pet")


class Reminder(Base):
    __tablename__ = "reminders"
    id = Column(Integer, primary_key=True, index=True)
    text = Column(String)
    # İstemcinin gördüğü "gg/aa/yyyy" metni; eski sürümler bunu okuyor, o yüzden duruyor
    date = Column(String)
    pet_id = Column(Integer, ForeignKey("pets.id"))
    # Bildirim zamanlayıcısının sorguladığı gerçek tarih (date metninden üretilir)
    due_date = Column(Date, nullable=True, index=True)
    repeat_rule = Column(String, nullable=True)   # "FREQ=MONTHLY;INTERVAL=3" gibi, bkz. recurrence.py
    repeat_start = Column(Date, nullable=True)    # tekrarlar hep buradan sayılıyor
    last_notified_on = Column(Date, nullable=True)

    pet = relationship("Pet", back_populates="reminders")


class PushToken(Base):
    """Kullanıcının bildirim alacağı cihaz (Expo push token)."""

    __tablename__ = "push_tokens"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token = Column(String, nullable=False, unique=True)
    platform = Column(String, nullable=True)  # "ios" | "android"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    user = relationship("User", back_populates="push_tokens")
