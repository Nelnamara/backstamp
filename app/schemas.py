from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel

from app.models import (
    ConditionFloor,
    ExclusiveChannel,
    HallmarkStatus,
    MoonGap,
    PhotoType,
    PostStraightness,
    ProofType,
    RedemptionStatus,
    WatcherAccessType,
    WishlistStatus,
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


class HallmarkReferenceCreate(SQLModel):
    submitted_by_user_id: int
    description: str
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None


class HallmarkReferenceRead(SQLModel):
    id: int
    franchise_id: Optional[int]
    item_type_id: Optional[int]
    description: str
    status: HallmarkStatus
    submitted_by_user_id: int


class SetManifestCreate(SQLModel):
    name: str
    franchise_id: int
    is_active: bool = True


class SetManifestRead(SQLModel):
    id: int
    name: str
    franchise_id: int
    is_active: bool


class SetManifestMemberCreate(SQLModel):
    name: str


class SetManifestMemberRead(SQLModel):
    id: int
    set_manifest_id: int
    name: str


class WishlistEntryCreate(SQLModel):
    user_id: int
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    variant_spec: dict = {}
    condition_floor: ConditionFloor = ConditionFloor.any
    coa_required: bool = False
    price_ceiling: Optional[Decimal] = None
    status: WishlistStatus = WishlistStatus.active


class WishlistEntryUpdate(SQLModel):
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    variant_spec: Optional[dict] = None
    condition_floor: Optional[ConditionFloor] = None
    coa_required: Optional[bool] = None
    price_ceiling: Optional[Decimal] = None
    status: Optional[WishlistStatus] = None


class WishlistEntryRead(SQLModel):
    id: int
    user_id: int
    franchise_id: Optional[int]
    item_type_id: Optional[int]
    variant_spec: dict
    condition_floor: ConditionFloor
    coa_required: bool
    price_ceiling: Optional[Decimal]
    status: WishlistStatus


class WatcherSourceRead(SQLModel):
    id: int
    name: str
    access_type: WatcherAccessType
    is_active: bool


class WatcherHitCreate(SQLModel):
    watcher_source_id: int
    external_listing_url: str
    listing_price: Optional[Decimal] = None


class WatcherHitRead(SQLModel):
    id: int
    wishlist_entry_id: int
    watcher_source_id: int
    external_listing_url: str
    listing_price: Optional[Decimal]
    matched_at: datetime
    notified: bool


class TradeMatchRead(SQLModel):
    id: int
    owner_id: int
    name: str
    franchise_id: Optional[int]
    item_type_id: Optional[int]
    name: str


class GuestSignedProvenanceRead(SQLModel):
    id: int
    item_id: int
    guest_name: str
    convention_name: str
    convention_date: date
    session_type: str
    witnessed_by_user_id: Optional[int]
