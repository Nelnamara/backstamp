from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
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
    auto_connect_at_conventions: bool


class UserUpdate(SQLModel):
    """Only the Connect privacy toggle is editable here — broader profile
    editing is auth-flow work, not designed yet."""

    auto_connect_at_conventions: Optional[bool] = None


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


@router.patch("/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
