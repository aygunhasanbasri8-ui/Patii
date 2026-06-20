from datetime import datetime

from sqlalchemy.orm import Session

from . import models


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, full_name: str, email: str, hashed_password: str) -> models.User:
    user = models.User(full_name=full_name, email=email, hashed_password=hashed_password)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_verification(
    db: Session, user: models.User, code: str, sent_at: datetime
) -> models.User:
    user.verification_code = code
    user.verification_code_sent_at = sent_at
    db.commit()
    db.refresh(user)
    return user


def mark_user_verified(db: Session, user: models.User) -> models.User:
    user.is_verified = True
    user.verification_code = None
    user.verification_code_sent_at = None
    db.commit()
    db.refresh(user)
    return user


def update_user_reset_code(
    db: Session, user: models.User, code: str, expires_at: datetime
) -> models.User:
    user.reset_code = code
    user.reset_code_expires_at = expires_at
    db.commit()
    db.refresh(user)
    return user


def update_user_password(db: Session, user: models.User, hashed_password: str) -> models.User:
    user.hashed_password = hashed_password
    user.reset_code = None
    user.reset_code_expires_at = None
    db.commit()
    db.refresh(user)
    return user


def create_pet(
    db: Session,
    name: str,
    species: str,
    breed: str,
    owner_id: int,
    avatar_type: str | None = None,
    avatar_value: str | None = None,
) -> models.Pet:
    pet = models.Pet(
        name=name,
        species=species,
        breed=breed,
        owner_id=owner_id,
        avatar_type=avatar_type,
        avatar_value=avatar_value,
    )
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def get_pets_by_owner(db: Session, owner_id: int) -> list[models.Pet]:
    return db.query(models.Pet).filter(models.Pet.owner_id == owner_id).all()


def get_pet_by_id(db: Session, pet_id: int) -> models.Pet | None:
    return db.query(models.Pet).filter(models.Pet.id == pet_id).first()


def update_pet(
    db: Session,
    pet: models.Pet,
    name: str,
    species: str,
    breed: str,
    avatar_type: str | None = None,
    avatar_value: str | None = None,
) -> models.Pet:
    pet.name = name
    pet.species = species
    pet.breed = breed
    pet.avatar_type = avatar_type
    pet.avatar_value = avatar_value
    db.commit()
    db.refresh(pet)
    return pet


def update_pet_avatar(
    db: Session, pet: models.Pet, avatar_type: str, avatar_value: str
) -> models.Pet:
    pet.avatar_type = avatar_type
    pet.avatar_value = avatar_value
    db.commit()
    db.refresh(pet)
    return pet


def delete_pet(db: Session, pet: models.Pet) -> None:
    db.delete(pet)
    db.commit()


def create_reminder(db: Session, pet_id: int, text: str, date: str) -> models.Reminder:
    reminder = models.Reminder(text=text, date=date, pet_id=pet_id)
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_reminders_by_pet(db: Session, pet_id: int) -> list[models.Reminder]:
    return db.query(models.Reminder).filter(models.Reminder.pet_id == pet_id).all()


def get_reminder_by_id(db: Session, reminder_id: int) -> models.Reminder | None:
    return db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()


def update_reminder(db: Session, reminder: models.Reminder, text: str, date: str) -> models.Reminder:
    reminder.text = text
    reminder.date = date
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder: models.Reminder) -> None:
    db.delete(reminder)
    db.commit()
