from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, SQLModel, select

from app.db import get_session
from app.models import User, UserRole

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(SQLModel):
    username: str


class UserRead(SQLModel):
    id: int
    username: str
    role: UserRole


@router.post("", response_model=UserRead, status_code=201)
def create_user(payload: UserCreate, session: Session = Depends(get_session)):
    """Stopgap only — no password, no auth. Just enough for item.owner_id
    to point at something real until signup/login gets its own design pass.
    """
    user = User(username=payload.username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@router.get("", response_model=List[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
