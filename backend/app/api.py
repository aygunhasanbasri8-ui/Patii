from fastapi import APIRouter, BackgroundTasks, Depends, File, Request, UploadFile
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from . import db, models, notifications, rate_limit, schemas, services, uploads

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
router = APIRouter(prefix="/api")


def get_current_user(
    session: Session = Depends(db.get_db), token: str = Depends(oauth2_scheme)
) -> models.User:
    return services.get_user_from_token(session, token)


@router.post("/auth/register")
def register(user: schemas.UserCreate, bg: BackgroundTasks, session: Session = Depends(db.get_db)):
    return services.register_user(session, user, bg)


@router.post("/auth/verify-email")
def verify_email(payload: schemas.VerifyEmail, session: Session = Depends(db.get_db)):
    return services.verify_email_code(session, payload)


@router.post("/auth/resend-verification")
def resend_verification(payload: schemas.ResendVerification, bg: BackgroundTasks, session: Session = Depends(db.get_db)):
    return services.resend_verification_code(session, payload, bg)


@router.post("/auth/login")
def login(user_data: schemas.UserLogin, request: Request, session: Session = Depends(db.get_db)):
    return services.login_user(session, user_data, rate_limit.client_ip(request))


@router.post("/auth/forgot-password")
def forgot_password(payload: schemas.ForgotPassword, bg: BackgroundTasks, session: Session = Depends(db.get_db)):
    return services.request_password_reset(session, payload, bg)


@router.post("/auth/reset-password")
def reset_password(payload: schemas.ResetPassword, session: Session = Depends(db.get_db)):
    return services.reset_password(session, payload)


@router.post("/pets/add")
def add_pet(
    pet: schemas.PetCreate,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.add_pet_for_owner(session, pet, user)


@router.get("/pets/me")
def list_my_pets(
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.get_my_pets(session, user)


@router.get("/pets/my-pets/{owner_id}")
def get_my_pets(
    owner_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.get_owner_pets(session, owner_id, user)


@router.put("/pets/{pet_id}")
def update_pet(
    pet_id: int,
    pet: schemas.PetUpdate,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.update_pet_for_owner(session, pet_id, pet, user)


@router.delete("/pets/{pet_id}")
def delete_pet(
    pet_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.remove_pet_for_owner(session, pet_id, user)


@router.post("/pets/{pet_id}/avatar")
async def upload_pet_avatar(
    pet_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    # Limitin 1 baytı fazlası okunuyor, dosyanın tamamını belleğe almadan "çok büyük" anlaşılsın
    file_bytes = await file.read(uploads.MAX_AVATAR_BYTES + 1)
    return services.upload_pet_avatar(session, pet_id, user, file_bytes)


@router.post("/analyze/meow")
async def analyze_meow(
    pet_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
    audio: UploadFile | None = File(default=None),
):
    audio_bytes = await audio.read() if audio is not None else None
    return services.analyze_meow(session, pet_id, user, audio_bytes)


@router.post("/reminders/add")
def add_reminder(
    rem: schemas.ReminderCreate,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.add_reminder(session, rem, user)


@router.get("/reminders/pet/{pet_id}")
def get_pet_reminders(
    pet_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.get_pet_reminders(session, pet_id, user)


@router.get("/reminders/history/pet/{pet_id}")
def get_pet_reminder_history(
    pet_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.get_pet_reminder_history(session, pet_id, user)


@router.put("/reminders/{rem_id}")
def update_reminder(
    rem_id: int,
    rem: schemas.ReminderUpdate,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.update_reminder_for_owner(session, rem_id, rem, user)


@router.delete("/reminders/{rem_id}")
def delete_reminder(
    rem_id: int,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.remove_reminder(session, rem_id, user)


@router.post("/notifications/token")
def register_push_token(
    payload: schemas.PushTokenRegister,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return notifications.register_token(session, user, payload.token, payload.platform)


@router.delete("/notifications/token")
def unregister_push_token(
    token: str,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return notifications.unregister_token(session, user, token)


@router.post("/chatbot/ask")
def ask_chatbot(
    payload: schemas.ChatAsk,
    session: Session = Depends(db.get_db),
    user: models.User = Depends(get_current_user),
):
    return services.ask_chatbot(session, payload, user)
