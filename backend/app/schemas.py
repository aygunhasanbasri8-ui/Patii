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
    owner_id: int


class PetUpdate(BaseModel):
    name: str
    species: str
    breed: str


class ReminderCreate(BaseModel):
    pet_id: int
    title: str
    description: str
    remind_at: str

