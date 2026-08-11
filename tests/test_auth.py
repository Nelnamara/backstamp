import pytest
from sqlmodel import select

from app.models import User


@pytest.fixture()
def sent_emails(monkeypatch):
    """Captures (email, token) pairs instead of calling Resend for real —
    pytest must never send an actual email."""
    captured = []

    def fake_send(to_email, token):
        captured.append((to_email, token))

    monkeypatch.setattr("app.routers.auth.send_magic_link_email", fake_send)
    return captured


def _login_as(client, session, sent_emails, user):
    """Logs the TestClient in as `user` via the real login flow, so its
    cookie jar carries a valid session for later calls in the test."""
    client.post("/auth/login/request", json={"email": user.email})
    token = sent_emails[-1][1]
    client.post("/auth/verify", json={"token": token})


def test_signup_requires_valid_invite(client, sent_emails):
    resp = client.post(
        "/auth/signup/request",
        json={"email": "newcollector@example.com", "username": "newcollector", "invite_code": "not-real"},
    )
    assert resp.status_code == 400
    assert sent_emails == []


def test_full_signup_flow_creates_user_and_redeems_invite(client, session, sent_emails, test_user):
    test_user.email = "inviter@example.com"
    session.add(test_user)
    session.commit()
    _login_as(client, session, sent_emails, test_user)

    invite = client.post("/auth/invites")
    assert invite.status_code == 201
    code = invite.json()["code"]

    signup = client.post(
        "/auth/signup/request",
        json={"email": "newcollector@example.com", "username": "pytest-newcollector", "invite_code": code},
    )
    assert signup.status_code == 202
    assert sent_emails[-1][0] == "newcollector@example.com"
    token = sent_emails[-1][1]

    verified = client.post("/auth/verify", json={"token": token})
    assert verified.status_code == 200
    assert verified.json()["username"] == "pytest-newcollector"
    assert verified.json()["email"] == "newcollector@example.com"

    new_user = session.exec(select(User).where(User.username == "pytest-newcollector")).first()
    assert new_user is not None

    reused = client.post(
        "/auth/signup/request",
        json={"email": "another@example.com", "username": "pytest-another", "invite_code": code},
    )
    assert reused.status_code == 400


def test_magic_link_token_is_single_use(client, session, sent_emails, test_user):
    test_user.email = "onceuser@example.com"
    session.add(test_user)
    session.commit()

    client.post("/auth/login/request", json={"email": test_user.email})
    token = sent_emails[-1][1]

    first = client.post("/auth/verify", json={"token": token})
    assert first.status_code == 200

    second = client.post("/auth/verify", json={"token": token})
    assert second.status_code == 400


def test_login_request_unknown_email_404(client, sent_emails):
    resp = client.post("/auth/login/request", json={"email": "nobody@example.com"})
    assert resp.status_code == 404
    assert sent_emails == []


def test_invite_creation_requires_login(client):
    resp = client.post("/auth/invites")
    assert resp.status_code == 401


def test_me_and_logout(client, session, sent_emails, test_user):
    test_user.email = "sessiontest@example.com"
    session.add(test_user)
    session.commit()
    _login_as(client, session, sent_emails, test_user)

    me = client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "sessiontest@example.com"

    logout = client.post("/auth/logout")
    assert logout.status_code == 204

    after = client.get("/auth/me")
    assert after.status_code == 401
