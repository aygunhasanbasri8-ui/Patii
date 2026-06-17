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


def create_pet(db: Session, name: str, species: str, breed: str, owner_id: int) -> models.Pet:
    pet = models.Pet(name=name, species=species, breed=breed, owner_id=owner_id)
    db.add(pet)
    db.commit()
    db.refresh(pet)
    return pet


def get_pets_by_owner(db: Session, owner_id: int) -> list[models.Pet]:
    return db.query(models.Pet).filter(models.Pet.owner_id == owner_id).all()


def get_pet_by_id(db: Session, pet_id: int) -> models.Pet | None:
    return db.query(models.Pet).filter(models.Pet.id == pet_id).first()


def update_pet(db: Session, pet: models.Pet, name: str, species: str, breed: str) -> models.Pet:
    pet.name = name
    pet.species = species
    pet.breed = breed
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

