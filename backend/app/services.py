import random
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import core, repositories, schemas


def register_user(db: Session, payload: schemas.UserCreate) -> dict:
    db_user = repositories.get_user_by_email(db, payload.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı!")

    user = repositories.create_user(
        db=db,
        full_name=payload.full_name,
        email=payload.email,
        hashed_password=core.hash_password(payload.password),
    )
    return {"message": "Kayıt başarılı!", "user_id": user.id}


def login_user(db: Session, payload: schemas.UserLogin) -> dict:
    user = repositories.get_user_by_email(db, payload.email)
    if not user or not core.verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı!")

    token = core.create_access_token(user.email)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_name": user.full_name,
        "user_id": user.id,
    }


def add_pet_for_owner(db: Session, payload: schemas.PetCreate, token: str) -> dict:
    email = core.get_current_user_email(token)
    pet = repositories.create_pet(
        db=db,
        name=payload.name,
        species=payload.species,
        breed=payload.breed,
        owner_id=payload.owner_id,
    )
    return {"message": f"{pet.name} güvenli şekilde eklendi!", "owner": email}


def get_owner_pets(db: Session, owner_id: int, token: str):
    core.get_current_user_email(token)
    return repositories.get_pets_by_owner(db, owner_id)


def update_pet_for_owner(db: Session, pet_id: int, payload: schemas.PetUpdate, token: str) -> dict:
    core.get_current_user_email(token)
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")
    repositories.update_pet(db, pet, payload.name, payload.species, payload.breed)
    return {"message": "Pati bilgileri güncellendi.", "pet_id": pet.id}


def remove_pet_for_owner(db: Session, pet_id: int, token: str) -> dict:
    core.get_current_user_email(token)
    pet = repositories.get_pet_by_id(db, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")
    repositories.delete_pet(db, pet)
    return {"message": "Pati silindi."}


def analyze_meow(pet_id: int, token: str) -> dict:
    core.get_current_user_email(token)
    moods = [
        "Acıktım, mama ver!",
        "Uykum var, beni rahat bırak.",
        "Oyun oynamak istiyorum!",
        "Seni çok seviyorum",
        "Dışarı çıkmak istiyorum.",
    ]
    return {
        "pet_id": pet_id,
        "status": "Analiz Tamamlandı",
        "result": random.choice(moods),
        "confidence": 0.95,
    }


def add_reminder(db: Session, payload: schemas.ReminderCreate, token: str) -> dict:
    core.get_current_user_email(token)
    pet = repositories.get_pet_by_id(db, payload.pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pati bulunamadı!")

    reminder = repositories.create_reminder(
        db=db,
        pet_id=payload.pet_id,
        text=f"{payload.title}: {payload.description}",
        date=payload.remind_at,
    )
    return {"message": "Hatırlatıcı başarıyla kuruldu!", "reminder_id": reminder.id}


def get_pet_reminders(db: Session, pet_id: int, token: str):
    core.get_current_user_email(token)
    return repositories.get_reminders_by_pet(db, pet_id)


def get_pet_reminder_history(db: Session, pet_id: int, token: str):
    core.get_current_user_email(token)
    reminders = repositories.get_reminders_by_pet(db, pet_id)
    today = datetime.utcnow().date()

    def is_past(reminder_date: str) -> bool:
        try:
            return datetime.strptime(reminder_date, "%d/%m/%Y").date() < today
        except ValueError:
            return False

    history = [rem for rem in reminders if is_past(rem.date)]
    return history


def remove_reminder(db: Session, rem_id: int, token: str) -> dict:
    core.get_current_user_email(token)
    reminder = repositories.get_reminder_by_id(db, rem_id)
    if not reminder:
        raise HTTPException(status_code=404, detail="Hatırlatıcı zaten yok!")

    repositories.delete_reminder(db, reminder)
    return {"message": "Hatırlatıcı silindi."}

