from typing import Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str


class UserLogin(BaseModel):
    email: str
    password: str


class PetCreate(BaseModel):
    name: str
    species: str
    breed: str
    avatar_type: Optional[str] = None   # "icon" | "photo" | None
    avatar_value: Optional[str] = None  # emoji or server path


class PetUpdate(BaseModel):
    name: str
    species: str
    breed: str
    avatar_type: Optional[str] = None
    avatar_value: Optional[str] = None


class PetResponse(BaseModel):
    id: int
    name: str
    species: str
    breed: str
    owner_id: int
    avatar_type: Optional[str] = None
    avatar_value: Optional[str] = None

    model_config = {"from_attributes": True}


class ReminderCreate(BaseModel):
    pet_id: int
    title: str
    description: str
    remind_at: str


class ReminderUpdate(BaseModel):
    title: str
    description: str
    remind_at: str


class ChatAsk(BaseModel):
    question: str
    pet_id: int | None = None
