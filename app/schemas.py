from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel

from app.models import (
    ExclusiveChannel,
    MoonGap,
    PhotoType,
    PostStraightness,
    ProofType,
    RedemptionStatus,
)


class ItemCreate(SQLModel):
    owner_id: int
    name: str
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    rarity_id: Optional[int] = None
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None
    redemption_status: RedemptionStatus = RedemptionStatus.not_applicable
    exclusive_channel: Optional[ExclusiveChannel] = None
    trade_stock: bool = False
    edition_number: Optional[int] = None
    edition_total: Optional[int] = None


class ItemUpdate(SQLModel):
    name: Optional[str] = None
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    rarity_id: Optional[int] = None
    purchase_price: Optional[Decimal] = None
    purchase_date: Optional[date] = None
    redemption_status: Optional[RedemptionStatus] = None
    exclusive_channel: Optional[ExclusiveChannel] = None
    trade_stock: Optional[bool] = None
    edition_number: Optional[int] = None
    edition_total: Optional[int] = None


class ItemRead(SQLModel):
    id: int
    owner_id: int
    name: str
    franchise_id: Optional[int]
    item_type_id: Optional[int]
    rarity_id: Optional[int]
    purchase_price: Optional[Decimal]
    purchase_date: Optional[date]
    redemption_status: RedemptionStatus
    exclusive_channel: Optional[ExclusiveChannel]
    trade_stock: bool
    edition_number: Optional[int]
    edition_total: Optional[int]
    created_at: datetime
    updated_at: datetime


class LookupCreate(SQLModel):
    name: str


class LookupRead(SQLModel):
    id: int
    name: str


class RarityCreate(SQLModel):
    name: str
    sort_order: int = 0


class RarityRead(SQLModel):
    id: int
    name: str
    sort_order: int


class PhotoRead(SQLModel):
    id: int
    item_id: int
    photo_type: PhotoType
    file_path: str
    uploaded_at: datetime


class ValueHistoryCreate(SQLModel):
    value: Decimal
    recorded_at: Optional[date] = None


class ValueHistoryRead(SQLModel):
    id: int
    item_id: int
    value: Decimal
    recorded_at: date


class PinConditionSet(SQLModel):
    moon_gap: MoonGap = MoonGap.none
    pin_back_original: bool = True
    post_straightness: PostStraightness = PostStraightness.straight
    enamel_chip_count: int = 0


class PinConditionRead(SQLModel):
    item_id: int
    moon_gap: MoonGap
    pin_back_original: bool
    post_straightness: PostStraightness
    enamel_chip_count: int


class ProvenanceAnchorCreate(SQLModel):
    proof_type: ProofType
    photo_id: int


class ProvenanceAnchorRead(SQLModel):
    id: int
    item_id: int
    proof_type: ProofType
    photo_id: int
    app_timestamp: datetime


class GuestSignedProvenanceCreate(SQLModel):
    guest_name: str
    convention_name: str
    convention_date: date
    session_type: str
    witnessed_by_user_id: Optional[int] = None


class GuestSignedProvenanceRead(SQLModel):
    id: int
    item_id: int
    guest_name: str
    convention_name: str
    convention_date: date
    session_type: str
    witnessed_by_user_id: Optional[int]
