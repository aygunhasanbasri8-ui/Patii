from sqlalchemy import Column, ForeignKey, Integer, String
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    pets = relationship("Pet", back_populates="owner")


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
    date = Column(String)
    pet_id = Column(Integer, ForeignKey("pets.id"))

    pet = relationship("Pet", back_populates="reminders")

