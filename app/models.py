from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    """Naive datetime representing the current instant in UTC — matches the
    plain (non-timezone-aware) DATETIME columns already in use, without the
    deprecation warning that bare datetime.utcnow() now carries.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


class UserRole(str, Enum):
    member = "member"
    council = "council"
    admin = "admin"


class RedemptionStatus(str, Enum):
    not_applicable = "not_applicable"
    unredeemed = "unredeemed"
    redeemed = "redeemed"
    redeemed_elsewhere = "redeemed_elsewhere"
    orphaned = "orphaned"


class ExclusiveChannel(str, Enum):
    goody_bag = "goody_bag"
    on_site_store = "on_site_store"
    employee_only = "employee_only"
    community_rep_gift = "community_rep_gift"


class PhotoType(str, Enum):
    item = "item"
    packaging = "packaging"
    coa = "coa"
    condition = "condition"
    other = "other"


class MoonGap(str, Enum):
    none = "none"
    slight = "slight"
    moderate = "moderate"
    wide = "wide"


class PostStraightness(str, Enum):
    straight = "straight"
    bent = "bent"
    replaced = "replaced"


class ProofType(str, Enum):
    receipt = "receipt"
    order_confirmation = "order_confirmation"
    badge_photo = "badge_photo"
    other = "other"


class HallmarkStatus(str, Enum):
    pending = "pending"
    verified = "verified"
    flagged_fake = "flagged_fake"


class ConditionFloor(str, Enum):
    any = "any"
    loose_acceptable = "loose_acceptable"
    sealed_mib = "sealed_mib"


class WishlistStatus(str, Enum):
    active = "active"
    paused = "paused"
    fulfilled = "fulfilled"


class WatcherAccessType(str, Enum):
    official_api = "official_api"
    rss = "rss"
    public_scrape_no_login = "public_scrape_no_login"


class WishlistPriority(str, Enum):
    """Collector-vocabulary priority, adopted from the Claude Design pass
    during the UI merge (2026-08-04). Nullable — most entries carry no tag
    at all; only Grail/Filler render one."""

    grail = "grail"
    filler = "filler"


class ConnectTier(str, Enum):
    """SCOPE.md's locked Pillar 3 tiers: 1=profile/socials/contact info,
    2=+wishlist, 3=+full collection."""

    tier_1 = "tier_1"
    tier_2 = "tier_2"
    tier_3 = "tier_3"


class CheckInMethod(str, Enum):
    geofence = "geofence"
    manual = "manual"


class ReportStatus(str, Enum):
    """Bare status only — the report-threshold-triggers-flag logic and the
    council clear/warn/suspend review workflow are deferred moderation
    tooling, same pattern as hallmark_reference's status field."""

    pending = "pending"
    soft_flagged = "soft_flagged"
    resolved = "resolved"


class PostType(str, Enum):
    """Community-page post categories. Showcase is deliberately NOT tied to
    the formal SetManifest system — a post just groups whichever of a
    user's own items they choose, sidestepping the set-completion-linking
    gap flagged during Sets & Reference."""

    showcase = "showcase"
    trade = "trade"
    seeking = "seeking"


class User(SQLModel, table=True):
    """Ownership + role stub only — signup/invite/login is separate, undesigned work."""

    __tablename__ = "app_user"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    role: UserRole = Field(default=UserRole.member)
    created_at: datetime = Field(default_factory=utcnow)
    # Privacy default: off. Only affects whether merely checking into the
    # same convention as another auto-pair user creates a Contact — an
    # explicit optical-transfer scan always works regardless of this.
    auto_connect_at_conventions: bool = Field(default=False)


class Franchise(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class ItemType(SQLModel, table=True):
    __tablename__ = "item_type"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class Rarity(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    sort_order: int = Field(default=0)


class Tag(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)


class ItemTag(SQLModel, table=True):
    __tablename__ = "item_tag"

    item_id: Optional[int] = Field(
        default=None, foreign_key="item.id", primary_key=True, ondelete="CASCADE"
    )
    tag_id: Optional[int] = Field(
        default=None, foreign_key="tag.id", primary_key=True, ondelete="CASCADE"
    )


class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="app_user.id", index=True)
    franchise_id: Optional[int] = Field(default=None, foreign_key="franchise.id")
    item_type_id: Optional[int] = Field(default=None, foreign_key="item_type.id")
    rarity_id: Optional[int] = Field(default=None, foreign_key="rarity.id")

    name: str
    purchase_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    purchase_date: Optional[date] = Field(default=None)

    redemption_status: RedemptionStatus = Field(default=RedemptionStatus.not_applicable)
    exclusive_channel: Optional[ExclusiveChannel] = Field(default=None)
    trade_stock: bool = Field(default=False)
    edition_number: Optional[int] = Field(default=None)
    edition_total: Optional[int] = Field(default=None)

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Photo(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    photo_type: PhotoType = Field(default=PhotoType.item)
    file_path: str
    uploaded_at: datetime = Field(default_factory=utcnow)


class ValueHistory(SQLModel, table=True):
    __tablename__ = "value_history"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    value: Decimal = Field(max_digits=10, decimal_places=2)
    recorded_at: date = Field(default_factory=date.today)


class PinCondition(SQLModel, table=True):
    """One row per item, only for items typed as a pin. Replaces a generic
    Mint/Good/Poor field with the vocabulary pin traders actually use."""

    __tablename__ = "pin_condition"

    item_id: Optional[int] = Field(
        default=None, foreign_key="item.id", primary_key=True, ondelete="CASCADE"
    )
    moon_gap: MoonGap = Field(default=MoonGap.none)
    pin_back_original: bool = Field(default=True)
    post_straightness: PostStraightness = Field(default=PostStraightness.straight)
    enamel_chip_count: int = Field(default=0)


class ProvenanceAnchor(SQLModel, table=True):
    """Proof attached at first cataloging. app_timestamp is write-once by
    design — no update endpoint ever touches it. The whole point is that
    *when* a claim was made is harder to fake retroactively than the object
    itself; an editable timestamp would quietly defeat that."""

    __tablename__ = "provenance_anchor"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    proof_type: ProofType
    photo_id: int = Field(foreign_key="photo.id")
    app_timestamp: datetime = Field(default_factory=utcnow)


class GuestSignedProvenance(SQLModel, table=True):
    """Autographed items. witnessed_by_user_id is a stub with nothing behind
    it yet — the real corroboration mechanism is Connect's optical-transfer
    exchange, which doesn't have a schema yet."""

    __tablename__ = "guest_signed_provenance"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id", index=True, ondelete="CASCADE")
    guest_name: str
    convention_name: str
    convention_date: date
    session_type: str
    witnessed_by_user_id: Optional[int] = Field(default=None, foreign_key="app_user.id")


class HallmarkReference(SQLModel, table=True):
    """Crowdsourced backstamp/pin-back/plating authentication reference.
    Status is meant to route through Connect's trust & council review
    process — that review workflow is deferred tooling, not this table's
    job; this stage is the table only."""

    __tablename__ = "hallmark_reference"

    id: Optional[int] = Field(default=None, primary_key=True)
    franchise_id: Optional[int] = Field(default=None, foreign_key="franchise.id")
    item_type_id: Optional[int] = Field(default=None, foreign_key="item_type.id")
    description: str
    status: HallmarkStatus = Field(default=HallmarkStatus.pending)
    submitted_by_user_id: int = Field(foreign_key="app_user.id")


class SetManifest(SQLModel, table=True):
    """Editorial series definition (e.g. a given year's BlizzCon pin run),
    independent of who owns what."""

    __tablename__ = "set_manifest"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    franchise_id: int = Field(foreign_key="franchise.id")
    is_active: bool = Field(default=True)


class SetManifestMember(SQLModel, table=True):
    __tablename__ = "set_manifest_member"

    id: Optional[int] = Field(default=None, primary_key=True)
    set_manifest_id: int = Field(
        foreign_key="set_manifest.id", index=True, ondelete="CASCADE"
    )
    name: str


class WishlistEntry(SQLModel, table=True):
    """variant_spec is a flexible JSONB blob rather than fixed columns —
    the exact variant taxonomy isn't nailed down yet (SCOPE.md's own
    example: "only the glow-in-the-dark chase /50, not the base pin")."""

    __tablename__ = "wishlist_entry"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="app_user.id", index=True, ondelete="CASCADE")
    name: str
    franchise_id: Optional[int] = Field(default=None, foreign_key="franchise.id")
    item_type_id: Optional[int] = Field(default=None, foreign_key="item_type.id")
    variant_spec: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    condition_floor: ConditionFloor = Field(default=ConditionFloor.any)
    coa_required: bool = Field(default=False)
    price_ceiling: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    status: WishlistStatus = Field(default=WishlistStatus.active)
    priority: Optional[WishlistPriority] = Field(default=None)


class WatcherSource(SQLModel, table=True):
    """No login/session field anywhere, on purpose — the standing rule is
    that watchers never hold a stored session. Seeded with the four
    locked sources; adding a fifth (once it clears legality/ToS review)
    is a new row, not a code change."""

    __tablename__ = "watcher_source"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    access_type: WatcherAccessType
    is_active: bool = Field(default=True)


class WatcherHit(SQLModel, table=True):
    __tablename__ = "watcher_hit"

    id: Optional[int] = Field(default=None, primary_key=True)
    wishlist_entry_id: int = Field(
        foreign_key="wishlist_entry.id", index=True, ondelete="CASCADE"
    )
    watcher_source_id: int = Field(foreign_key="watcher_source.id")
    external_listing_url: str
    listing_price: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)
    matched_at: datetime = Field(default_factory=utcnow)
    notified: bool = Field(default=False)


class Contact(SQLModel, table=True):
    """Directional: my grant to you and yours to me are tracked separately,
    since trust is per-contact and user-driven, not symmetric — one row
    per direction, re-granting updates it in place. Ephemeral by default:
    expires_at is always set on creation; `promoted` is the only way a
    grant survives past that."""

    __tablename__ = "contact"

    from_user_id: int = Field(foreign_key="app_user.id", primary_key=True, ondelete="CASCADE")
    to_user_id: int = Field(foreign_key="app_user.id", primary_key=True, ondelete="CASCADE")
    tier: ConnectTier = Field(default=ConnectTier.tier_1)
    granted_at: datetime = Field(default_factory=utcnow)
    expires_at: Optional[datetime] = Field(default=None)
    promoted: bool = Field(default=False)


class ExchangeSession(SQLModel, table=True):
    """Log of an actual optical-transfer scan between two phones — the
    explicit person-to-person path that always works regardless of either
    user's auto-pair setting."""

    __tablename__ = "exchange_session"

    id: Optional[int] = Field(default=None, primary_key=True)
    initiator_user_id: int = Field(foreign_key="app_user.id", index=True)
    counterpart_user_id: int = Field(foreign_key="app_user.id", index=True)
    occurred_at: datetime = Field(default_factory=utcnow)


class ConventionCheckIn(SQLModel, table=True):
    __tablename__ = "convention_check_in"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="app_user.id", index=True, ondelete="CASCADE")
    convention_name: str
    convention_date: date
    method: CheckInMethod
    checked_in_at: datetime = Field(default_factory=utcnow)


class TradeRecord(SQLModel, table=True):
    """A trade only counts as a legitimate vouch anchor once both sides
    confirm it happened — initiator creates it, counterpart confirms
    separately, so one person can't fabricate a trade to fake a vouch."""

    __tablename__ = "trade_record"

    id: Optional[int] = Field(default=None, primary_key=True)
    initiator_user_id: int = Field(foreign_key="app_user.id", index=True)
    counterpart_user_id: int = Field(foreign_key="app_user.id", index=True)
    occurred_at: datetime = Field(default_factory=utcnow)
    confirmed_by_counterpart: bool = Field(default=False)
    note: Optional[str] = Field(default=None)


class Vouch(SQLModel, table=True):
    """Attaches to a specific confirmed trade rather than accumulating into
    a global reputation number, per the locked trust model."""

    __tablename__ = "vouch"

    id: Optional[int] = Field(default=None, primary_key=True)
    trade_record_id: int = Field(foreign_key="trade_record.id", index=True, ondelete="CASCADE")
    voucher_user_id: int = Field(foreign_key="app_user.id", index=True)
    vouched_user_id: int = Field(foreign_key="app_user.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)


class Report(SQLModel, table=True):
    """Bare create/list only at this stage — the threshold-triggers-flag
    logic and full council review workflow are deferred moderation
    tooling, same pattern as hallmark_reference."""

    __tablename__ = "report"

    id: Optional[int] = Field(default=None, primary_key=True)
    reporter_user_id: int = Field(foreign_key="app_user.id", index=True)
    reported_user_id: int = Field(foreign_key="app_user.id", index=True)
    reason: str
    status: ReportStatus = Field(default=ReportStatus.pending)
    created_at: datetime = Field(default_factory=utcnow)


class CommunityPost(SQLModel, table=True):
    """One shared community page, filterable by post_type. De-indexing the
    page from search engines is a web-server concern, not a schema field."""

    __tablename__ = "community_post"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="app_user.id", index=True, ondelete="CASCADE")
    post_type: PostType
    caption: str
    created_at: datetime = Field(default_factory=utcnow)


class CommunityPostItem(SQLModel, table=True):
    """Loose reference to items a post is showing off/offering/seeking —
    deliberately NOT tied to the formal SetManifest system, so Showcase
    posts don't inherit the set-completion-linking gap flagged during
    Sets & Reference."""

    __tablename__ = "community_post_item"

    post_id: Optional[int] = Field(
        default=None, foreign_key="community_post.id", primary_key=True, ondelete="CASCADE"
    )
    item_id: Optional[int] = Field(
        default=None, foreign_key="item.id", primary_key=True, ondelete="CASCADE"
    )
