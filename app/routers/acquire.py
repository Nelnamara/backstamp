from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.db import get_session
from app.models import Item, WatcherHit, WatcherSource, WishlistEntry
from app.schemas import (
    TradeMatchRead,
    WatcherHitCreate,
    WatcherHitRead,
    WatcherSourceRead,
    WishlistEntryCreate,
    WishlistEntryRead,
    WishlistEntryUpdate,
)

router = APIRouter(tags=["acquire"])


def _get_wishlist_entry_or_404(entry_id: int, session: Session) -> WishlistEntry:
    entry = session.get(WishlistEntry, entry_id)
    if not entry:
        raise HTTPException(404, "Wishlist entry not found")
    return entry


# ---- Wishlist entries ----


@router.post("/wishlist", response_model=WishlistEntryRead, status_code=201)
def create_wishlist_entry(payload: WishlistEntryCreate, session: Session = Depends(get_session)):
    entry = WishlistEntry.model_validate(payload)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.get("/wishlist", response_model=List[WishlistEntryRead])
def list_wishlist_entries(
    user_id: Optional[int] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    session: Session = Depends(get_session),
):
    query = select(WishlistEntry)
    if user_id is not None:
        query = query.where(WishlistEntry.user_id == user_id)
    query = query.offset(offset).limit(limit)
    return session.exec(query).all()


@router.get("/wishlist/{entry_id}", response_model=WishlistEntryRead)
def get_wishlist_entry(entry_id: int, session: Session = Depends(get_session)):
    return _get_wishlist_entry_or_404(entry_id, session)


@router.patch("/wishlist/{entry_id}", response_model=WishlistEntryRead)
def update_wishlist_entry(
    entry_id: int, payload: WishlistEntryUpdate, session: Session = Depends(get_session)
):
    entry = _get_wishlist_entry_or_404(entry_id, session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


@router.delete("/wishlist/{entry_id}", status_code=204)
def delete_wishlist_entry(entry_id: int, session: Session = Depends(get_session)):
    entry = _get_wishlist_entry_or_404(entry_id, session)
    session.delete(entry)
    session.commit()


# ---- Watcher sources (read-only — adding one is a legality/ToS-reviewed
# decision, not a normal API action) ----


@router.get("/watcher-sources", response_model=List[WatcherSourceRead])
def list_watcher_sources(session: Session = Depends(get_session)):
    return session.exec(select(WatcherSource)).all()


# ---- Watcher hits ----


@router.post("/wishlist/{entry_id}/hits", response_model=WatcherHitRead, status_code=201)
def create_watcher_hit(
    entry_id: int, payload: WatcherHitCreate, session: Session = Depends(get_session)
):
    _get_wishlist_entry_or_404(entry_id, session)
    if not session.get(WatcherSource, payload.watcher_source_id):
        raise HTTPException(400, "watcher_source_id does not exist")

    hit = WatcherHit(wishlist_entry_id=entry_id, **payload.model_dump())
    session.add(hit)
    session.commit()
    session.refresh(hit)
    return hit


@router.get("/wishlist/{entry_id}/hits", response_model=List[WatcherHitRead])
def list_watcher_hits(entry_id: int, session: Session = Depends(get_session)):
    _get_wishlist_entry_or_404(entry_id, session)
    query = select(WatcherHit).where(WatcherHit.wishlist_entry_id == entry_id).order_by(
        WatcherHit.matched_at
    )
    return session.exec(query).all()


@router.post("/wishlist/{entry_id}/hits/{hit_id}/mark-notified", response_model=WatcherHitRead)
def mark_watcher_hit_notified(entry_id: int, hit_id: int, session: Session = Depends(get_session)):
    hit = session.get(WatcherHit, hit_id)
    if not hit or hit.wishlist_entry_id != entry_id:
        raise HTTPException(404, "Watcher hit not found")
    hit.notified = True
    session.add(hit)
    session.commit()
    session.refresh(hit)
    return hit


# ---- Want/have swap-matching — no new table, just a query against
# Item.trade_stock, per the proposal's own reasoning ----


@router.get("/wishlist/{entry_id}/matches", response_model=List[TradeMatchRead])
def find_trade_matches(entry_id: int, session: Session = Depends(get_session)):
    entry = _get_wishlist_entry_or_404(entry_id, session)

    query = select(Item).where(Item.trade_stock == True, Item.owner_id != entry.user_id)  # noqa: E712
    if entry.franchise_id is not None:
        query = query.where(Item.franchise_id == entry.franchise_id)
    if entry.item_type_id is not None:
        query = query.where(Item.item_type_id == entry.item_type_id)

    return session.exec(query).all()
