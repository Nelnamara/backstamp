from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlmodel import SQLModel

from app.models import (
    CheckInMethod,
    ConditionFloor,
    ConnectTier,
    ExclusiveChannel,
    HallmarkStatus,
    MoonGap,
    PhotoType,
    PostStraightness,
    PostType,
    ProofType,
    RedemptionStatus,
    ReportStatus,
    WatcherAccessType,
    WishlistPriority,
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
    name: str
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    variant_spec: dict = {}
    condition_floor: ConditionFloor = ConditionFloor.any
    coa_required: bool = False
    price_ceiling: Optional[Decimal] = None
    status: WishlistStatus = WishlistStatus.active
    priority: Optional[WishlistPriority] = None


class WishlistEntryUpdate(SQLModel):
    name: Optional[str] = None
    franchise_id: Optional[int] = None
    item_type_id: Optional[int] = None
    variant_spec: Optional[dict] = None
    condition_floor: Optional[ConditionFloor] = None
    coa_required: Optional[bool] = None
    price_ceiling: Optional[Decimal] = None
    status: Optional[WishlistStatus] = None
    priority: Optional[WishlistPriority] = None


class WishlistEntryRead(SQLModel):
    id: int
    user_id: int
    name: str
    franchise_id: Optional[int]
    item_type_id: Optional[int]
    variant_spec: dict
    condition_floor: ConditionFloor
    coa_required: bool
    price_ceiling: Optional[Decimal]
    status: WishlistStatus
    priority: Optional[WishlistPriority]


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


class ContactCreate(SQLModel):
    from_user_id: int
    to_user_id: int
    tier: ConnectTier = ConnectTier.tier_1
    expires_at: Optional[datetime] = None
    promoted: bool = False


class ContactRead(SQLModel):
    from_user_id: int
    to_user_id: int
    tier: ConnectTier
    granted_at: datetime
    expires_at: Optional[datetime]
    promoted: bool


class ExchangeSessionCreate(SQLModel):
    initiator_user_id: int
    counterpart_user_id: int


class ExchangeSessionRead(SQLModel):
    id: int
    initiator_user_id: int
    counterpart_user_id: int
    occurred_at: datetime


class ConventionCheckInCreate(SQLModel):
    user_id: int
    convention_name: str
    convention_date: date
    method: CheckInMethod


class ConventionCheckInRead(SQLModel):
    id: int
    user_id: int
    convention_name: str
    convention_date: date
    method: CheckInMethod
    checked_in_at: datetime


class TradeRecordCreate(SQLModel):
    initiator_user_id: int
    counterpart_user_id: int
    note: Optional[str] = None


class TradeRecordRead(SQLModel):
    id: int
    initiator_user_id: int
    counterpart_user_id: int
    occurred_at: datetime
    confirmed_by_counterpart: bool
    note: Optional[str]


class VouchCreate(SQLModel):
    trade_record_id: int
    voucher_user_id: int
    vouched_user_id: int


class VouchRead(SQLModel):
    id: int
    trade_record_id: int
    voucher_user_id: int
    vouched_user_id: int
    created_at: datetime


class ReportCreate(SQLModel):
    reporter_user_id: int
    reported_user_id: int
    reason: str


class ReportRead(SQLModel):
    id: int
    reporter_user_id: int
    reported_user_id: int
    reason: str
    status: ReportStatus
    created_at: datetime


class CommunityPostCreate(SQLModel):
    user_id: int
    post_type: PostType
    caption: str
    item_ids: list[int] = []


class CommunityPostRead(SQLModel):
    id: int
    user_id: int
    post_type: PostType
    caption: str
    created_at: datetime
    item_ids: list[int]


class InviteRead(SQLModel):
    id: int
    code: str
    created_by_user_id: Optional[int]
    redeemed_by_user_id: Optional[int]
    created_at: datetime
    redeemed_at: Optional[datetime]
    expires_at: Optional[datetime]


class LoginRequest(SQLModel):
    email: str


class SignupRequest(SQLModel):
    email: str
    username: str
    invite_code: str


class VerifyRequest(SQLModel):
    token: str
