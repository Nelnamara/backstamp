from typing import List

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import Franchise, ItemType, Rarity, Tag
from app.schemas import LookupCreate, LookupRead, RarityCreate, RarityRead

router = APIRouter(tags=["lookups"])


@router.get("/franchises", response_model=List[LookupRead])
def list_franchises(session: Session = Depends(get_session)):
    return session.exec(select(Franchise)).all()


@router.post("/franchises", response_model=LookupRead, status_code=201)
def create_franchise(payload: LookupCreate, session: Session = Depends(get_session)):
    franchise = Franchise(name=payload.name)
    session.add(franchise)
    session.commit()
    session.refresh(franchise)
    return franchise


@router.get("/item-types", response_model=List[LookupRead])
def list_item_types(session: Session = Depends(get_session)):
    return session.exec(select(ItemType)).all()


@router.post("/item-types", response_model=LookupRead, status_code=201)
def create_item_type(payload: LookupCreate, session: Session = Depends(get_session)):
    item_type = ItemType(name=payload.name)
    session.add(item_type)
    session.commit()
    session.refresh(item_type)
    return item_type


@router.get("/rarities", response_model=List[RarityRead])
def list_rarities(session: Session = Depends(get_session)):
    return session.exec(select(Rarity).order_by(Rarity.sort_order)).all()


@router.post("/rarities", response_model=RarityRead, status_code=201)
def create_rarity(payload: RarityCreate, session: Session = Depends(get_session)):
    rarity = Rarity(name=payload.name, sort_order=payload.sort_order)
    session.add(rarity)
    session.commit()
    session.refresh(rarity)
    return rarity


@router.get("/tags", response_model=List[LookupRead])
def list_tags(session: Session = Depends(get_session)):
    return session.exec(select(Tag)).all()


@router.post("/tags", response_model=LookupRead, status_code=201)
def create_tag(payload: LookupCreate, session: Session = Depends(get_session)):
    tag = Tag(name=payload.name)
    session.add(tag)
    session.commit()
    session.refresh(tag)
    return tag
