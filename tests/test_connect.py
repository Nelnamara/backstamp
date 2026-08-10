def _make_user(session, username):
    from app.models import User

    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_contact_upsert_updates_existing_row_in_place(client, test_user, session):
    other = _make_user(session, "pytest-contact-other")

    first = client.post(
        "/contacts", json={"from_user_id": test_user.id, "to_user_id": other.id, "tier": "tier_1"}
    )
    assert first.status_code == 201
    assert first.json()["tier"] == "tier_1"

    second = client.post(
        "/contacts",
        json={"from_user_id": test_user.id, "to_user_id": other.id, "tier": "tier_3", "promoted": True},
    )
    assert second.status_code == 201
    assert second.json()["tier"] == "tier_3"
    assert second.json()["promoted"] is True

    listed = client.get("/contacts", params={"user_id": test_user.id}).json()
    assert len(listed) == 1  # upsert, not a second row


def test_contacts_list_is_directional_both_ways(client, test_user, session):
    other = _make_user(session, "pytest-contact-other2")
    client.post("/contacts", json={"from_user_id": test_user.id, "to_user_id": other.id})
    client.post("/contacts", json={"from_user_id": other.id, "to_user_id": test_user.id, "tier": "tier_2"})

    mine = client.get("/contacts", params={"user_id": test_user.id}).json()
    assert len(mine) == 2


def test_checkin_notify_targets_only_includes_nonexpired_contacts(client, test_user, session):
    from datetime import timedelta

    from app.models import utcnow

    friend = _make_user(session, "pytest-checkin-friend")
    expired_contact_user = _make_user(session, "pytest-checkin-expired")

    client.post("/contacts", json={"from_user_id": friend.id, "to_user_id": test_user.id, "tier": "tier_1"})
    client.post(
        "/contacts",
        json={
            "from_user_id": expired_contact_user.id,
            "to_user_id": test_user.id,
            "tier": "tier_1",
            "expires_at": (utcnow() - timedelta(days=1)).isoformat(),
        },
    )

    checkin = client.post(
        "/convention-checkins",
        json={
            "user_id": test_user.id,
            "convention_name": "BlizzCon",
            "convention_date": "2026-11-01",
            "method": "manual",
        },
    ).json()

    targets = client.get(f"/convention-checkins/{checkin['id']}/notify-targets").json()
    assert friend.id in targets
    assert expired_contact_user.id not in targets


def test_vouch_requires_confirmed_trade(client, test_user, session):
    other = _make_user(session, "pytest-vouch-other")

    trade = client.post(
        "/trade-records", json={"initiator_user_id": test_user.id, "counterpart_user_id": other.id}
    ).json()

    unconfirmed = client.post(
        "/vouches",
        json={"trade_record_id": trade["id"], "voucher_user_id": test_user.id, "vouched_user_id": other.id},
    )
    assert unconfirmed.status_code == 400

    confirmed = client.post(f"/trade-records/{trade['id']}/confirm")
    assert confirmed.json()["confirmed_by_counterpart"] is True

    vouch = client.post(
        "/vouches",
        json={"trade_record_id": trade["id"], "voucher_user_id": test_user.id, "vouched_user_id": other.id},
    )
    assert vouch.status_code == 201


def test_vouch_rejects_non_party_and_self_vouch(client, test_user, session):
    other = _make_user(session, "pytest-vouch-other2")
    stranger = _make_user(session, "pytest-vouch-stranger")

    trade = client.post(
        "/trade-records", json={"initiator_user_id": test_user.id, "counterpart_user_id": other.id}
    ).json()
    client.post(f"/trade-records/{trade['id']}/confirm")

    not_a_party = client.post(
        "/vouches",
        json={"trade_record_id": trade["id"], "voucher_user_id": test_user.id, "vouched_user_id": stranger.id},
    )
    assert not_a_party.status_code == 400

    self_vouch = client.post(
        "/vouches",
        json={"trade_record_id": trade["id"], "voucher_user_id": test_user.id, "vouched_user_id": test_user.id},
    )
    assert self_vouch.status_code == 400


def test_community_post_requires_own_items(client, test_user, session):
    from sqlmodel import select

    from app.models import Franchise

    franchise_id = session.exec(
        select(Franchise).where(Franchise.name == "Blizzard Entertainment")
    ).first().id

    mine = client.post(
        "/items", json={"owner_id": test_user.id, "name": "My showcase pin", "franchise_id": franchise_id}
    ).json()

    other = _make_user(session, "pytest-post-other")
    theirs = client.post(
        "/items", json={"owner_id": other.id, "name": "Their pin", "franchise_id": franchise_id}
    ).json()

    rejected = client.post(
        "/community-posts",
        json={
            "user_id": test_user.id,
            "post_type": "showcase",
            "caption": "My BlizzCon set",
            "item_ids": [mine["id"], theirs["id"]],
        },
    )
    assert rejected.status_code == 400

    accepted = client.post(
        "/community-posts",
        json={
            "user_id": test_user.id,
            "post_type": "showcase",
            "caption": "My BlizzCon set",
            "item_ids": [mine["id"]],
        },
    )
    assert accepted.status_code == 201
    assert accepted.json()["item_ids"] == [mine["id"]]

    listed = client.get("/community-posts", params={"post_type": "showcase"}).json()
    assert any(p["id"] == accepted.json()["id"] for p in listed)


def test_report_bare_create_and_list(client, test_user, session):
    other = _make_user(session, "pytest-report-other")
    created = client.post(
        "/reports", json={"reporter_user_id": test_user.id, "reported_user_id": other.id, "reason": "no-show trade"}
    )
    assert created.status_code == 201
    assert created.json()["status"] == "pending"

    listed = client.get("/reports").json()
    assert any(r["id"] == created.json()["id"] for r in listed)
