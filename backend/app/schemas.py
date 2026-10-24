from typing import Optional

from pydantic import BaseModel, field_validator

from .recurrence import normalize_rule


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class VerifyEmail(BaseModel):
    email: str
    code: str


class ResendVerification(BaseModel):
    email: str


class ForgotPassword(BaseModel):
    email: str


class ResetPassword(BaseModel):
    email: str
    code: str
    new_password: str


class PetCreate(BaseModel):
    name: str
    species: str
    breed: str
    avatar_type: Optional[str] = None   # "icon" | "photo" | None
    avatar_value: Optional[str] = None  # emoji or server path


class PetUpdate(PetCreate):
    pass


class PetResponse(BaseModel):
    id: int
    name: str
    species: str
    breed: str
    owner_id: int
    avatar_type: Optional[str] = None
    avatar_value: Optional[str] = None

    model_config = {"from_attributes": True}


class _ReminderFields(BaseModel):
    title: str
    description: str
    remind_at: str
    # "FREQ=MONTHLY;INTERVAL=3" gibi; verilmezse tek seferlik (eski istemciler göndermiyor)
    repeat: str | None = None

    @field_validator("repeat")
    @classmethod
    def _valid_rule(cls, value: str | None) -> str | None:
        return normalize_rule(value)


class ReminderCreate(_ReminderFields):
    pet_id: int


class ReminderUpdate(_ReminderFields):
    pass


class ChatAsk(BaseModel):
    question: str
    pet_id: int | None = None


class PushTokenRegister(BaseModel):
    token: str
    platform: str | None = None
