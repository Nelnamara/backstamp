from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import GuestSignedProvenance, Photo, PinCondition, ProvenanceAnchor
from app.routers.items import _get_item_or_404
from app.schemas import (
    GuestSignedProvenanceCreate,
    GuestSignedProvenanceRead,
    PinConditionRead,
    PinConditionSet,
    ProvenanceAnchorCreate,
    ProvenanceAnchorRead,
)

router = APIRouter(prefix="/items/{item_id}", tags=["provenance"])


# ---- Pin condition (one row per item, upsert) ----


@router.put("/pin-condition", response_model=PinConditionRead)
def set_pin_condition(item_id: int, payload: PinConditionSet, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    condition = session.get(PinCondition, item_id)
    if condition:
        for field, value in payload.model_dump().items():
            setattr(condition, field, value)
    else:
        condition = PinCondition(item_id=item_id, **payload.model_dump())
    session.add(condition)
    session.commit()
    session.refresh(condition)
    return condition


@router.get("/pin-condition", response_model=PinConditionRead)
def get_pin_condition(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    condition = session.get(PinCondition, item_id)
    if not condition:
        raise HTTPException(404, "No pin condition set for this item")
    return condition


@router.delete("/pin-condition", status_code=204)
def delete_pin_condition(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    condition = session.get(PinCondition, item_id)
    if condition:
        session.delete(condition)
        session.commit()


# ---- Provenance anchors (create + list only — no update, ever) ----


@router.post("/provenance-anchors", response_model=ProvenanceAnchorRead, status_code=201)
def create_provenance_anchor(
    item_id: int, payload: ProvenanceAnchorCreate, session: Session = Depends(get_session)
):
    _get_item_or_404(item_id, session)
    photo = session.get(Photo, payload.photo_id)
    if not photo or photo.item_id != item_id:
        raise HTTPException(400, "photo_id must be an existing photo on this same item")

    anchor = ProvenanceAnchor(item_id=item_id, proof_type=payload.proof_type, photo_id=payload.photo_id)
    session.add(anchor)
    session.commit()
    session.refresh(anchor)
    return anchor


@router.get("/provenance-anchors", response_model=List[ProvenanceAnchorRead])
def list_provenance_anchors(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    query = select(ProvenanceAnchor).where(ProvenanceAnchor.item_id == item_id).order_by(
        ProvenanceAnchor.app_timestamp
    )
    return session.exec(query).all()


@router.delete("/provenance-anchors/{anchor_id}", status_code=204)
def delete_provenance_anchor(item_id: int, anchor_id: int, session: Session = Depends(get_session)):
    anchor = session.get(ProvenanceAnchor, anchor_id)
    if not anchor or anchor.item_id != item_id:
        raise HTTPException(404, "Provenance anchor not found")
    session.delete(anchor)
    session.commit()


# ---- Guest-signed provenance ----


@router.post("/guest-signatures", response_model=GuestSignedProvenanceRead, status_code=201)
def create_guest_signature(
    item_id: int, payload: GuestSignedProvenanceCreate, session: Session = Depends(get_session)
):
    _get_item_or_404(item_id, session)
    signature = GuestSignedProvenance(item_id=item_id, **payload.model_dump())
    session.add(signature)
    session.commit()
    session.refresh(signature)
    return signature


@router.get("/guest-signatures", response_model=List[GuestSignedProvenanceRead])
def list_guest_signatures(item_id: int, session: Session = Depends(get_session)):
    _get_item_or_404(item_id, session)
    query = select(GuestSignedProvenance).where(GuestSignedProvenance.item_id == item_id)
    return session.exec(query).all()


@router.delete("/guest-signatures/{signature_id}", status_code=204)
def delete_guest_signature(item_id: int, signature_id: int, session: Session = Depends(get_session)):
    signature = session.get(GuestSignedProvenance, signature_id)
    if not signature or signature.item_id != item_id:
        raise HTTPException(404, "Guest signature not found")
    session.delete(signature)
    session.commit()
