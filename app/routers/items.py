from datetime import date
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlmodel import Session, select

from app.db import get_session
from app.models import Item, ItemTag, Photo, PhotoType, Tag, ValueHistory, utcnow
from app.photos import save_stripped_photo
from app.schemas import (
    ItemCreate,
    ItemRead,
    ItemUpdate,
    PhotoRead,
    ValueHistoryCreate,
    ValueHistoryRead,
)

router = APIRouter(prefix="/items", tags=["items"])


def _get_item_or_404(item_id: int, session: Session) -> Item:
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    return item


@router.post("", response_model=ItemRead, status_code=201)
def create_item(payload: ItemCreate, session: Session = Depends(get_session)):
    item = Item.model_validate(payload)
    session.add(item)
    session.commit()
    session.refresh(item)

    if item.purchase_price is not None:
        session.add(ValueHistory(item_id=item.id, value=item.purchase_price))
        session.commit()

    return item


@router.get("", response_model=List[ItemRead])
def list_items(
    owner_id: Optional[int] = None,
    trade_stock: Optional[bool] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    session: Session = Depends(get_session),
):
    query = select(Item)
    if owner_id is not None:
        query = query.where(Item.owner_id == owner_id)
    if trade_stock is not None:
        query = query.where(Item.trade_stock == trade_stock)
    query = query.order_by(Item.id).offset(offset).limit(limit)
    return session.exec(query).all()


@router.get("/{item_id}", response_model=ItemRead)
def get_item(item_id: int, session: Session = Depends(get_session)):
    return _get_item_or_404(item_id, session)


@router.patch("/{item_id}", response_model=ItemRead)
def update_item(item_id: int, payload: ItemUpdate, session: Session = Depends(get_session)):
    item = _get_item_or_404(item_id, session)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    item.updated_at = utcnow()
    session.add(item)
    session.commit()
    session.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_item(item_id: int, session: Session = Depends(get_session)):
    item = _get_item_or_404(item_id, session)
    # The DB cascade removes photo ROWS, but never touches the files —
    # without this, every deleted item leaks its photos onto disk forever.
    for photo in session.exec(select(Photo).where(Photo.item_id == item_id)).all():
        Path(photo.file_path).unlink(missing_ok=True)
    session.delete(item)
    session.commit()


# ---- Tags ----


@router.get("/{item_id}/tags", response_model=List[str])
def list_item_tags(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    query = select(Tag.name).join(ItemTag, ItemTag.tag_id == Tag.id).where(ItemTag.item_id == item_id)
    return session.exec(query).all()


@router.post("/{item_id}/tags/{tag_name}", response_model=List[str], status_code=201)
def add_item_tag(item_id: int, tag_name: str, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()
    if not tag:
        tag = Tag(name=tag_name)
        session.add(tag)
        session.commit()
        session.refresh(tag)
    if not session.get(ItemTag, (item_id, tag.id)):
        session.add(ItemTag(item_id=item_id, tag_id=tag.id))
        session.commit()
    return list_item_tags(item_id, session)


@router.delete("/{item_id}/tags/{tag_name}", response_model=List[str])
def remove_item_tag(item_id: int, tag_name: str, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    tag = session.exec(select(Tag).where(Tag.name == tag_name)).first()
    if tag:
        link = session.get(ItemTag, (item_id, tag.id))
        if link:
            session.delete(link)
            session.commit()
    return list_item_tags(item_id, session)


# ---- Photos ----


@router.get("/{item_id}/photos", response_model=List[PhotoRead])
def list_item_photos(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    query = select(Photo).where(Photo.item_id == item_id).order_by(Photo.uploaded_at)
    return session.exec(query).all()


@router.post("/{item_id}/photos", response_model=PhotoRead, status_code=201)
async def upload_item_photo(
    item_id: int,
    file: UploadFile = File(...),
    photo_type: PhotoType = Form(PhotoType.item),
    session: Session = Depends(get_session),
):
    _get_item_or_404(item_id, session)
    raw = await file.read()
    stored_path = save_stripped_photo(raw)

    photo = Photo(item_id=item_id, photo_type=photo_type, file_path=stored_path)
    session.add(photo)
    session.commit()
    session.refresh(photo)
    return photo


@router.delete("/{item_id}/photos/{photo_id}", status_code=204)
def delete_item_photo(item_id: int, photo_id: int, session: Session = Depends(get_session)):
    photo = session.get(Photo, photo_id)
    if not photo or photo.item_id != item_id:
        raise HTTPException(404, "Photo not found")
    Path(photo.file_path).unlink(missing_ok=True)
    session.delete(photo)
    session.commit()


# ---- Value history ----


@router.get("/{item_id}/value-history", response_model=List[ValueHistoryRead])
def list_value_history(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    query = (
        select(ValueHistory)
        .where(ValueHistory.item_id == item_id)
        .order_by(ValueHistory.recorded_at)
    )
    return session.exec(query).all()


@router.post("/{item_id}/value-history", response_model=ValueHistoryRead, status_code=201)
def add_value_history(
    item_id: int, payload: ValueHistoryCreate, session: Session = Depends(get_session)
):
    _get_item_or_404(item_id, session)
    entry = ValueHistory(
        item_id=item_id,
        value=payload.value,
        recorded_at=payload.recorded_at or date.today(),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry
