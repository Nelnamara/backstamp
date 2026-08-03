from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional

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


class User(SQLModel, table=True):
    """Ownership + role stub only — signup/invite/login is separate, undesigned work."""

    __tablename__ = "app_user"

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    role: UserRole = Field(default=UserRole.member)
    created_at: datetime = Field(default_factory=utcnow)


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
