"""Stage C — hallmark reference + set manifests.

Bare create/list only, on purpose: SCOPE.md flags both of these as ongoing
curation/moderation jobs, not one-time builds. The tables exist so nothing
else has to change shape later, but the actual moderation workflow (status
transitions, council review, editorial upkeep) is deferred tooling — not
built here.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import HallmarkReference, SetManifest, SetManifestMember
from app.schemas import (
    HallmarkReferenceCreate,
    HallmarkReferenceRead,
    SetManifestCreate,
    SetManifestMemberCreate,
    SetManifestMemberRead,
    SetManifestRead,
)

router = APIRouter(tags=["content-ops"])


@router.post("/hallmark-references", response_model=HallmarkReferenceRead, status_code=201)
def create_hallmark_reference(
    payload: HallmarkReferenceCreate, session: Session = Depends(get_session)
):
    reference = HallmarkReference(**payload.model_dump())
    session.add(reference)
    session.commit()
    session.refresh(reference)
    return reference


@router.get("/hallmark-references", response_model=List[HallmarkReferenceRead])
def list_hallmark_references(session: Session = Depends(get_session)):
    return session.exec(select(HallmarkReference)).all()


@router.post("/set-manifests", response_model=SetManifestRead, status_code=201)
def create_set_manifest(payload: SetManifestCreate, session: Session = Depends(get_session)):
    manifest = SetManifest(**payload.model_dump())
    session.add(manifest)
    session.commit()
    session.refresh(manifest)
    return manifest


@router.get("/set-manifests", response_model=List[SetManifestRead])
def list_set_manifests(session: Session = Depends(get_session)):
    return session.exec(select(SetManifest)).all()


@router.post(
    "/set-manifests/{set_manifest_id}/members",
    response_model=SetManifestMemberRead,
    status_code=201,
)
def create_set_manifest_member(
    set_manifest_id: int,
    payload: SetManifestMemberCreate,
    session: Session = Depends(get_session),
):
    if not session.get(SetManifest, set_manifest_id):
        raise HTTPException(404, "Set manifest not found")
    member = SetManifestMember(set_manifest_id=set_manifest_id, name=payload.name)
    session.add(member)
    session.commit()
    session.refresh(member)
    return member


@router.get(
    "/set-manifests/{set_manifest_id}/members",
    response_model=List[SetManifestMemberRead],
)
def list_set_manifest_members(set_manifest_id: int, session: Session = Depends(get_session)):
    if not session.get(SetManifest, set_manifest_id):
        raise HTTPException(404, "Set manifest not found")
    query = select(SetManifestMember).where(SetManifestMember.set_manifest_id == set_manifest_id)
    return session.exec(query).all()
