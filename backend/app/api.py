from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import db, schemas, services

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
router = APIRouter(prefix="/api")


@router.post("/auth/register")
def register(user: schemas.UserCreate, session: Session = Depends(db.get_db)):
    return services.register_user(session, user)


@router.post("/auth/login")
def login(user_data: schemas.UserLogin, session: Session = Depends(db.get_db)):
    return services.login_user(session, user_data)


@router.post("/pets/add")
def add_pet(
    pet: schemas.PetCreate,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.add_pet_for_owner(session, pet, token)


@router.get("/pets/my-pets/{owner_id}")
def get_my_pets(
    owner_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.get_owner_pets(session, owner_id, token)


@router.put("/pets/{pet_id}")
def update_pet(
    pet_id: int,
    pet: schemas.PetUpdate,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.update_pet_for_owner(session, pet_id, pet, token)


@router.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.remove_pet_for_owner(session, pet_id, token)


@router.post("/analyze/meow")
async def analyze_meow(
    pet_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
    audio: UploadFile | None = File(default=None),
):
    audio_bytes = await audio.read() if audio is not None else None
    return services.analyze_meow(session, pet_id, token, audio_bytes)


@router.post("/reminders/add")
def add_reminder(
    rem: schemas.ReminderCreate,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.add_reminder(session, rem, token)


@router.get("/reminders/pet/{pet_id}")
def get_pet_reminders(
    pet_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.get_pet_reminders(session, pet_id, token)


@router.get("/reminders/history/pet/{pet_id}")
def get_pet_reminder_history(
    pet_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.get_pet_reminder_history(session, pet_id, token)


@router.put("/reminders/{rem_id}")
def update_reminder(
    rem_id: int,
    rem: schemas.ReminderUpdate,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.update_reminder_for_owner(session, rem_id, rem, token)


@router.delete("/reminders/{rem_id}")
def delete_reminder(
    rem_id: int,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.remove_reminder(session, rem_id, token)


@router.post("/chatbot/ask")
def ask_chatbot(
    payload: schemas.ChatAsk,
    session: Session = Depends(db.get_db),
    token: str = Depends(oauth2_scheme),
):
    return services.ask_chatbot(session, payload, token)