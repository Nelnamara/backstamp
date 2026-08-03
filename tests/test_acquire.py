def test_watcher_sources_are_seeded_and_have_no_credential_field(client):
    sources = client.get("/watcher-sources").json()
    names = {s["name"] for s in sources}
    assert names == {"eBay", "Craigslist", "Blizzard Gear Store", "Facebook Marketplace"}
    for source in sources:
        assert set(source.keys()) == {"id", "name", "access_type", "is_active"}


def test_wishlist_entry_create_and_variant_spec(client, test_user):
    resp = client.post(
        "/wishlist",
        json={
            "user_id": test_user.id,
            "variant_spec": {"chase": True, "edition_max": 50, "finish": "glow-in-the-dark"},
            "condition_floor": "sealed_mib",
            "coa_required": True,
            "price_ceiling": "75.00",
        },
    )
    assert resp.status_code == 201
    entry = resp.json()
    assert entry["status"] == "active"
    assert entry["variant_spec"]["finish"] == "glow-in-the-dark"


def test_wishlist_entry_update_and_delete(client, test_user):
    entry = client.post("/wishlist", json={"user_id": test_user.id}).json()

    updated = client.patch(f"/wishlist/{entry['id']}", json={"status": "paused"})
    assert updated.json()["status"] == "paused"

    assert client.delete(f"/wishlist/{entry['id']}").status_code == 204
    assert client.get(f"/wishlist/{entry['id']}").status_code == 404


def test_wishlist_entry_list_filters_by_user(client, test_user, session):
    from app.models import User

    other = User(username="pytest-other-wisher")
    session.add(other)
    session.commit()
    session.refresh(other)

    client.post("/wishlist", json={"user_id": test_user.id})
    client.post("/wishlist", json={"user_id": other.id})

    mine = client.get("/wishlist", params={"user_id": test_user.id}).json()
    assert len(mine) == 1
    assert mine[0]["user_id"] == test_user.id


def test_watcher_hit_create_list_and_mark_notified(client, test_user):
    entry = client.post("/wishlist", json={"user_id": test_user.id}).json()
    ebay = next(s for s in client.get("/watcher-sources").json() if s["name"] == "eBay")

    created = client.post(
        f"/wishlist/{entry['id']}/hits",
        json={
            "watcher_source_id": ebay["id"],
            "external_listing_url": "https://ebay.example/listing/123",
            "listing_price": "42.00",
        },
    )
    assert created.status_code == 201
    assert created.json()["notified"] is False
    hit_id = created.json()["id"]

    listed = client.get(f"/wishlist/{entry['id']}/hits").json()
    assert len(listed) == 1

    marked = client.post(f"/wishlist/{entry['id']}/hits/{hit_id}/mark-notified")
    assert marked.json()["notified"] is True


def test_watcher_hit_rejects_unknown_source(client, test_user):
    entry = client.post("/wishlist", json={"user_id": test_user.id}).json()
    resp = client.post(
        f"/wishlist/{entry['id']}/hits",
        json={"watcher_source_id": 999999, "external_listing_url": "https://example.com"},
    )
    assert resp.status_code == 400


def test_trade_matches_excludes_own_items_and_filters_by_franchise(client, test_user, session):
    from sqlmodel import select

    from app.models import Franchise, User

    other = User(username="pytest-trade-partner")
    session.add(other)
    session.commit()
    session.refresh(other)

    blizzard_id = session.exec(
        select(Franchise).where(Franchise.name == "Blizzard Entertainment")
    ).first().id
    star_trek_id = session.exec(
        select(Franchise).where(Franchise.name == "Star Trek")
    ).first().id

    # My own trade-stock item — should never show up in my own matches.
    client.post(
        "/items",
        json={"owner_id": test_user.id, "name": "My own dupe", "franchise_id": blizzard_id, "trade_stock": True},
    )
    # Someone else's trade-stock item in a DIFFERENT franchise — shouldn't match.
    client.post(
        "/items",
        json={"owner_id": other.id, "name": "Their Star Trek pin", "franchise_id": star_trek_id, "trade_stock": True},
    )
    # Someone else's trade-stock item in the SAME franchise — should match.
    theirs = client.post(
        "/items",
        json={"owner_id": other.id, "name": "Their Blizzard dupe", "franchise_id": blizzard_id, "trade_stock": True},
    ).json()

    entry = client.post(
        "/wishlist", json={"user_id": test_user.id, "franchise_id": blizzard_id}
    ).json()

    matches = client.get(f"/wishlist/{entry['id']}/matches").json()
    assert [m["id"] for m in matches] == [theirs["id"]]
