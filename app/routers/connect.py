"""Stage E — Connect (Pillar 3): contacts/trust, convention check-ins,
trade records + vouches, reports, and the shared community page.

Two things deliberately left as bare mechanism rather than full policy:
- ExchangeSession (an optical-transfer scan) does NOT auto-create a
  Contact. SCOPE.md doesn't lock whether a scan should immediately grant
  a default tier or prompt the user to pick one — that's a real product
  decision for whoever builds the Connect UI, not something to invent
  here. The two are separate, independently-created records for now.
- Contact.expires_at is caller-supplied, not computed server-side.
  SCOPE.md's "end of the convention (or after N days)" wording doesn't
  pin an exact policy — inventing a specific number would be a unilateral
  design call, not implementation.

Report review (threshold-triggers-flag, council clear/warn/suspend) is
deferred moderation tooling, same pattern as Stage C's hallmark_reference.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, or_, select

from app.db import get_session
from app.models import (
    CommunityPost,
    CommunityPostItem,
    Contact,
    ConventionCheckIn,
    ExchangeSession,
    Item,
    Report,
    TradeRecord,
    Vouch,
    utcnow,
)
from app.schemas import (
    CommunityPostCreate,
    CommunityPostRead,
    ContactCreate,
    ContactRead,
    ConventionCheckInCreate,
    ConventionCheckInRead,
    ExchangeSessionCreate,
    ExchangeSessionRead,
    ReportCreate,
    ReportRead,
    TradeRecordCreate,
    TradeRecordRead,
    VouchCreate,
    VouchRead,
)

router = APIRouter(tags=["connect"])


# ---- Contacts & trust tiers ----


@router.post("/contacts", response_model=ContactRead, status_code=201)
def upsert_contact(payload: ContactCreate, session: Session = Depends(get_session)):
    """Re-granting to the same (from, to) pair updates the existing row in
    place — tier, expiry, and promoted status are always the CURRENT grant,
    not a history of past ones."""
    existing = session.get(Contact, (payload.from_user_id, payload.to_user_id))
    if existing:
        existing.tier = payload.tier
        existing.expires_at = payload.expires_at
        existing.promoted = payload.promoted
        contact = existing
    else:
        contact = Contact(**payload.model_dump())
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.get("/contacts", response_model=List[ContactRead])
def list_contacts(user_id: int = Query(...), session: Session = Depends(get_session)):
    query = select(Contact).where(
        or_(Contact.from_user_id == user_id, Contact.to_user_id == user_id)
    )
    return session.exec(query).all()


# ---- Exchange sessions (optical-transfer scan log) ----


@router.post("/exchange-sessions", response_model=ExchangeSessionRead, status_code=201)
def create_exchange_session(
    payload: ExchangeSessionCreate, session: Session = Depends(get_session)
):
    exchange = ExchangeSession(**payload.model_dump())
    session.add(exchange)
    session.commit()
    session.refresh(exchange)
    return exchange


@router.get("/exchange-sessions", response_model=List[ExchangeSessionRead])
def list_exchange_sessions(
    user_id: Optional[int] = None, session: Session = Depends(get_session)
):
    query = select(ExchangeSession)
    if user_id is not None:
        query = query.where(
            or_(
                ExchangeSession.initiator_user_id == user_id,
                ExchangeSession.counterpart_user_id == user_id,
            )
        )
    return session.exec(query).all()


# ---- Convention check-ins ----


@router.post("/convention-checkins", response_model=ConventionCheckInRead, status_code=201)
def create_convention_checkin(
    payload: ConventionCheckInCreate, session: Session = Depends(get_session)
):
    checkin = ConventionCheckIn(**payload.model_dump())
    session.add(checkin)
    session.commit()
    session.refresh(checkin)
    return checkin


@router.get("/convention-checkins", response_model=List[ConventionCheckInRead])
def list_convention_checkins(
    user_id: Optional[int] = None,
    convention_name: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(ConventionCheckIn)
    if user_id is not None:
        query = query.where(ConventionCheckIn.user_id == user_id)
    if convention_name is not None:
        query = query.where(ConventionCheckIn.convention_name == convention_name)
    return session.exec(query).all()


@router.get("/convention-checkins/{checkin_id}/notify-targets", response_model=List[int])
def checkin_notify_targets(checkin_id: int, session: Session = Depends(get_session)):
    """Who to notify on this check-in: friends only, per the owner's
    decision — existing, non-expired contacts, not everyone at the con.
    Real push delivery needs the native app (see SCOPE.md Known Hard
    Parts); this just returns the target user ids."""
    checkin = session.get(ConventionCheckIn, checkin_id)
    if not checkin:
        raise HTTPException(404, "Check-in not found")

    query = select(Contact).where(
        or_(Contact.from_user_id == checkin.user_id, Contact.to_user_id == checkin.user_id)
    )
    contacts = session.exec(query).all()
    now = utcnow()
    targets = set()
    for c in contacts:
        if c.expires_at is not None and c.expires_at < now:
            continue
        other = c.to_user_id if c.from_user_id == checkin.user_id else c.from_user_id
        targets.add(other)
    return sorted(targets)


# ---- Trade records & vouches ----


@router.post("/trade-records", response_model=TradeRecordRead, status_code=201)
def create_trade_record(payload: TradeRecordCreate, session: Session = Depends(get_session)):
    trade = TradeRecord(**payload.model_dump())
    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade


@router.get("/trade-records", response_model=List[TradeRecordRead])
def list_trade_records(user_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(TradeRecord)
    if user_id is not None:
        query = query.where(
            or_(TradeRecord.initiator_user_id == user_id, TradeRecord.counterpart_user_id == user_id)
        )
    return session.exec(query).all()


@router.post("/trade-records/{trade_id}/confirm", response_model=TradeRecordRead)
def confirm_trade_record(trade_id: int, session: Session = Depends(get_session)):
    trade = session.get(TradeRecord, trade_id)
    if not trade:
        raise HTTPException(404, "Trade record not found")
    trade.confirmed_by_counterpart = True
    session.add(trade)
    session.commit()
    session.refresh(trade)
    return trade


@router.post("/vouches", response_model=VouchRead, status_code=201)
def create_vouch(payload: VouchCreate, session: Session = Depends(get_session)):
    trade = session.get(TradeRecord, payload.trade_record_id)
    if not trade:
        raise HTTPException(404, "Trade record not found")
    if not trade.confirmed_by_counterpart:
        raise HTTPException(400, "Trade must be confirmed by both parties before it can be vouched")
    parties = {trade.initiator_user_id, trade.counterpart_user_id}
    if payload.voucher_user_id not in parties or payload.vouched_user_id not in parties:
        raise HTTPException(400, "Vouch must be between the two parties on the trade record")
    if payload.voucher_user_id == payload.vouched_user_id:
        raise HTTPException(400, "Cannot vouch for yourself")

    vouch = Vouch(**payload.model_dump())
    session.add(vouch)
    session.commit()
    session.refresh(vouch)
    return vouch


@router.get("/vouches", response_model=List[VouchRead])
def list_vouches(vouched_user_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Vouch)
    if vouched_user_id is not None:
        query = query.where(Vouch.vouched_user_id == vouched_user_id)
    return session.exec(query).all()


# ---- Reports (bare create/list — review workflow deferred) ----


@router.post("/reports", response_model=ReportRead, status_code=201)
def create_report(payload: ReportCreate, session: Session = Depends(get_session)):
    report = Report(**payload.model_dump())
    session.add(report)
    session.commit()
    session.refresh(report)
    return report


@router.get("/reports", response_model=List[ReportRead])
def list_reports(session: Session = Depends(get_session)):
    return session.exec(select(Report)).all()


# ---- Community page posts ----


@router.post("/community-posts", response_model=CommunityPostRead, status_code=201)
def create_community_post(payload: CommunityPostCreate, session: Session = Depends(get_session)):
    for item_id in payload.item_ids:
        item = session.get(Item, item_id)
        if not item or item.owner_id != payload.user_id:
            raise HTTPException(400, f"item {item_id} is not one of this user's own items")

    post = CommunityPost(
        user_id=payload.user_id, post_type=payload.post_type, caption=payload.caption
    )
    session.add(post)
    session.commit()
    session.refresh(post)
    post_id, created_at = post.id, post.created_at

    for item_id in payload.item_ids:
        session.add(CommunityPostItem(post_id=post_id, item_id=item_id))
    session.commit()

    return CommunityPostRead(
        id=post_id,
        user_id=payload.user_id,
        post_type=payload.post_type,
        caption=payload.caption,
        created_at=created_at,
        item_ids=payload.item_ids,
    )


@router.get("/community-posts", response_model=List[CommunityPostRead])
def list_community_posts(
    post_type: Optional[str] = None,
    user_id: Optional[int] = None,
    session: Session = Depends(get_session),
):
    query = select(CommunityPost)
    if post_type is not None:
        query = query.where(CommunityPost.post_type == post_type)
    if user_id is not None:
        query = query.where(CommunityPost.user_id == user_id)
    posts = session.exec(query).all()

    result = []
    for post in posts:
        item_ids = session.exec(
            select(CommunityPostItem.item_id).where(CommunityPostItem.post_id == post.id)
        ).all()
        result.append(CommunityPostRead(**post.model_dump(), item_ids=item_ids))
    return result


@router.delete("/community-posts/{post_id}", status_code=204)
def delete_community_post(post_id: int, session: Session = Depends(get_session)):
    post = session.get(CommunityPost, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    session.delete(post)
    session.commit()
