def test_create_item_logs_initial_value_history(client, test_user):
    resp = client.post(
        "/items",
        json={
            "owner_id": test_user.id,
            "name": "BlizzCon 2019 Murloc Pin",
            "purchase_price": "45.00",
            "trade_stock": True,
        },
    )
    assert resp.status_code == 201
    item = resp.json()
    assert item["redemption_status"] == "not_applicable"
    assert item["trade_stock"] is True

    history = client.get(f"/items/{item['id']}/value-history").json()
    assert len(history) == 1
    assert history[0]["value"] == "45.00"


def test_create_item_without_price_logs_no_value_history(client, test_user):
    resp = client.post("/items", json={"owner_id": test_user.id, "name": "Undated find"})
    item = resp.json()
    assert client.get(f"/items/{item['id']}/value-history").json() == []


def test_get_missing_item_404s(client, test_user):
    assert client.get("/items/999999999").status_code == 404


def test_update_item_partial(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Loose pin"}).json()

    resp = client.patch(
        f"/items/{item['id']}",
        json={"edition_number": 12, "edition_total": 500},
    )
    assert resp.status_code == 200
    updated = resp.json()
    assert updated["edition_number"] == 12
    assert updated["edition_total"] == 500
    # Untouched fields survive a partial update.
    assert updated["name"] == "Loose pin"
    assert updated["updated_at"] != item["updated_at"]


def test_add_and_remove_tag(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Tag test item"}).json()
    item_id = item["id"]

    assert client.post(f"/items/{item_id}/tags/murloc").json() == ["murloc"]
    tags = client.post(f"/items/{item_id}/tags/blizzcon-exclusive").json()
    assert set(tags) == {"murloc", "blizzcon-exclusive"}

    remaining = client.delete(f"/items/{item_id}/tags/murloc").json()
    assert remaining == ["blizzcon-exclusive"]


def test_add_value_history_entry(client, test_user):
    item = client.post(
        "/items", json={"owner_id": test_user.id, "name": "Appreciating item", "purchase_price": "10.00"}
    ).json()

    client.post(f"/items/{item['id']}/value-history", json={"value": "25.00", "recorded_at": "2026-12-01"})
    history = client.get(f"/items/{item['id']}/value-history").json()

    assert [h["value"] for h in history] == ["10.00", "25.00"]


def test_delete_item_cascades_tags_and_value_history(client, test_user):
    item = client.post(
        "/items", json={"owner_id": test_user.id, "name": "To be deleted", "purchase_price": "5.00"}
    ).json()
    item_id = item["id"]
    client.post(f"/items/{item_id}/tags/some-tag")

    resp = client.delete(f"/items/{item_id}")
    assert resp.status_code == 204
    assert client.get(f"/items/{item_id}").status_code == 404


def test_list_items_filters_by_owner(client, test_user, session):
    from app.models import User

    other = User(username="pytest-other-owner")
    session.add(other)
    session.commit()
    session.refresh(other)

    client.post("/items", json={"owner_id": test_user.id, "name": "Mine"})
    client.post("/items", json={"owner_id": other.id, "name": "Theirs"})

    mine = client.get("/items", params={"owner_id": test_user.id}).json()
    assert {i["name"] for i in mine} == {"Mine"}
