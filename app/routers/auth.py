"""Auth: magic-link signup/login, invite codes, server-side sessions.

Passkeys are a deliberate follow-up, not built here — WebAuthn's crypto
verification is a genuinely separate chunk of work, and cramming it in
alongside magic links would repeat the overclaiming mistake from the
screens build. This pass is magic link + invites + sessions, fully
working end to end.

Session strategy: a DB-backed token in an httpOnly cookie, not a JWT —
revoking a session is just deleting a row, no token-blacklist needed.
`secure=False` on the cookie is a real gap once this deploys off
localhost over HTTPS; flagging it here rather than silently shipping it.
"""

import secrets
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from sqlmodel import Session, select

from app.db import get_session
from app.email import send_magic_link_email
from app.models import Invite, MagicLinkToken, User, UserSession, utcnow
from app.routers.users import UserRead
from app.schemas import InviteRead, LoginRequest, SignupRequest, VerifyRequest

router = APIRouter(prefix="/auth", tags=["auth"])

MAGIC_LINK_TTL = timedelta(minutes=15)
SESSION_TTL = timedelta(days=30)
SESSION_COOKIE = "session"


def get_current_user(
    session: Session = Depends(get_session),
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
) -> User:
    if not session_token:
        raise HTTPException(401, "Not logged in")
    user_session = session.exec(
        select(UserSession).where(UserSession.token == session_token)
    ).first()
    if not user_session or user_session.expires_at < utcnow():
        raise HTTPException(401, "Session expired or invalid")
    user = session.get(User, user_session.user_id)
    if not user:
        raise HTTPException(401, "Session user no longer exists")
    return user


def _issue_session(user: User, session: Session, response: Response) -> None:
    token = secrets.token_urlsafe(32)
    user_session = UserSession(token=token, user_id=user.id, expires_at=utcnow() + SESSION_TTL)
    session.add(user_session)
    session.commit()
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=True,
        samesite="lax",
        secure=False,  # flip to True once this runs behind HTTPS, not localhost
        max_age=int(SESSION_TTL.total_seconds()),
    )


@router.post("/invites", response_model=InviteRead, status_code=201)
def create_invite(
    session: Session = Depends(get_session), current_user: User = Depends(get_current_user)
):
    invite = Invite(code=secrets.token_urlsafe(6), created_by_user_id=current_user.id)
    session.add(invite)
    session.commit()
    session.refresh(invite)
    return invite


@router.post("/signup/request", status_code=202)
def request_signup(payload: SignupRequest, session: Session = Depends(get_session)):
    invite = session.exec(select(Invite).where(Invite.code == payload.invite_code)).first()
    if not invite:
        raise HTTPException(400, "Invalid invite code")
    if invite.redeemed_by_user_id is not None:
        raise HTTPException(400, "Invite code already used")
    if invite.expires_at is not None and invite.expires_at < utcnow():
        raise HTTPException(400, "Invite code expired")

    if session.exec(select(User).where(User.email == payload.email)).first():
        raise HTTPException(400, "An account with that email already exists")
    if session.exec(select(User).where(User.username == payload.username)).first():
        raise HTTPException(400, "That username is taken")

    token = MagicLinkToken(
        token=secrets.token_urlsafe(32),
        email=payload.email,
        pending_username=payload.username,
        invite_code=payload.invite_code,
        expires_at=utcnow() + MAGIC_LINK_TTL,
    )
    session.add(token)
    session.commit()
    send_magic_link_email(payload.email, token.token)
    return {"detail": "Check your email for a sign-in link"}


@router.post("/login/request", status_code=202)
def request_login(payload: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        raise HTTPException(404, "No account with that email — you may need an invite to sign up")

    token = MagicLinkToken(
        token=secrets.token_urlsafe(32), email=payload.email, expires_at=utcnow() + MAGIC_LINK_TTL
    )
    session.add(token)
    session.commit()
    send_magic_link_email(payload.email, token.token)
    return {"detail": "Check your email for a sign-in link"}


@router.post("/verify", response_model=UserRead)
def verify(
    payload: VerifyRequest, response: Response, session: Session = Depends(get_session)
):
    link_token = session.exec(
        select(MagicLinkToken).where(MagicLinkToken.token == payload.token)
    ).first()
    if not link_token:
        raise HTTPException(400, "Invalid link")
    if link_token.consumed_at is not None:
        raise HTTPException(400, "This link has already been used")
    if link_token.expires_at < utcnow():
        raise HTTPException(400, "This link has expired")

    if link_token.pending_username is not None:
        invite = session.exec(
            select(Invite).where(Invite.code == link_token.invite_code)
        ).first()
        if not invite or invite.redeemed_by_user_id is not None:
            raise HTTPException(400, "That invite is no longer valid")

        user = User(username=link_token.pending_username, email=link_token.email)
        session.add(user)
        session.commit()
        session.refresh(user)

        invite.redeemed_by_user_id = user.id
        invite.redeemed_at = utcnow()
        session.add(invite)
        session.commit()
    else:
        user = session.exec(select(User).where(User.email == link_token.email)).first()
        if not user:
            raise HTTPException(400, "No account for this link anymore")

    link_token.consumed_at = utcnow()
    session.add(link_token)
    session.commit()

    _issue_session(user, session, response)
    return user


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session: Session = Depends(get_session),
    session_token: Optional[str] = Cookie(default=None, alias=SESSION_COOKIE),
):
    if session_token:
        user_session = session.exec(
            select(UserSession).where(UserSession.token == session_token)
        ).first()
        if user_session:
            session.delete(user_session)
            session.commit()
    response.delete_cookie(SESSION_COOKIE)


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user
