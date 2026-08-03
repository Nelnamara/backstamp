"""Tests run against the real dev database (Neon), inside a SAVEPOINT that
always rolls back — so nothing a test does is ever actually persisted, even
though the app code under test calls session.commit() same as it would live.
See SQLAlchemy's "join a session into an external transaction" recipe.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event
from sqlmodel import Session

from app.db import engine, get_session
from app.main import app
from app.models import User


@pytest.fixture()
def session():
    connection = engine.connect()
    outer_transaction = connection.begin()
    db_session = Session(bind=connection)

    nested = connection.begin_nested()

    @event.listens_for(db_session, "after_transaction_end")
    def _restart_savepoint(sess, trans):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    try:
        yield db_session
    finally:
        db_session.close()
        outer_transaction.rollback()
        connection.close()


@pytest.fixture()
def client(session):
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def test_user(session):
    user = User(username="pytest-user")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
