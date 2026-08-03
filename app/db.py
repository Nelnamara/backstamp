import os

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv()


def _with_psycopg_driver(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


DATABASE_URL = _with_psycopg_driver(os.environ["DATABASE_URL"])

# pool_pre_ping: Neon's compute can auto-suspend after idling, which drops
# stale pooled connections — this checks a connection is alive before use
# instead of handing back a dead one.
engine = create_engine(DATABASE_URL, pool_pre_ping=True)


def get_session():
    with Session(engine) as session:
        yield session
