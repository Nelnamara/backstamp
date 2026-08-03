from app.routers import provenance


def test_no_update_route_exists_for_provenance_anchors():
    """The anti-fake guarantee only holds if there is no way to edit an
    anchor's timestamp after creation — confirm that route genuinely
    doesn't exist, not just that nothing currently calls it."""
    methods_by_path = {}
    for route in provenance.router.routes:
        methods_by_path.setdefault(route.path, set()).update(route.methods)

    anchor_paths = [p for p in methods_by_path if "provenance-anchors" in p]
    assert anchor_paths, "expected at least one provenance-anchors route"
    for path in anchor_paths:
        assert "PUT" not in methods_by_path[path]
        assert "PATCH" not in methods_by_path[path]


def test_pin_condition_upsert(client, test_user):
    item = client.post(
        "/items", json={"owner_id": test_user.id, "name": "BlizzCon Murloc Pin"}
    ).json()
    item_id = item["id"]

    assert client.get(f"/items/{item_id}/pin-condition").status_code == 404

    created = client.put(
        f"/items/{item_id}/pin-condition",
        json={"moon_gap": "slight", "enamel_chip_count": 1},
    )
    assert created.status_code == 200
    body = created.json()
    assert body["moon_gap"] == "slight"
    assert body["enamel_chip_count"] == 1
    assert body["pin_back_original"] is True  # default held

    updated = client.put(
        f"/items/{item_id}/pin-condition",
        json={"moon_gap": "wide", "enamel_chip_count": 2, "pin_back_original": False},
    )
    assert updated.json()["moon_gap"] == "wide"
    assert updated.json()["enamel_chip_count"] == 2

    fetched = client.get(f"/items/{item_id}/pin-condition")
    assert fetched.json()["moon_gap"] == "wide"


def test_pin_condition_delete(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Loose pin"}).json()
    item_id = item["id"]
    client.put(f"/items/{item_id}/pin-condition", json={})

    assert client.delete(f"/items/{item_id}/pin-condition").status_code == 204
    assert client.get(f"/items/{item_id}/pin-condition").status_code == 404


def test_provenance_anchor_requires_photo_on_same_item(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Anchored item"}).json()
    other_item = client.post("/items", json={"owner_id": test_user.id, "name": "Other item"}).json()

    from io import BytesIO
    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (10, 10)).save(buf, format="PNG")
    photo = client.post(
        f"/items/{other_item['id']}/photos",
        files={"file": ("x.png", buf.getvalue(), "image/png")},
        data={"photo_type": "item"},
    ).json()

    resp = client.post(
        f"/items/{item['id']}/provenance-anchors",
        json={"proof_type": "receipt", "photo_id": photo["id"]},
    )
    assert resp.status_code == 400

    from pathlib import Path

    Path(photo["file_path"]).unlink(missing_ok=True)


def test_provenance_anchor_create_and_list(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Anchored item 2"}).json()

    from io import BytesIO
    from pathlib import Path

    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (10, 10)).save(buf, format="PNG")
    photo = client.post(
        f"/items/{item['id']}/photos",
        files={"file": ("receipt.png", buf.getvalue(), "image/png")},
        data={"photo_type": "other"},
    ).json()

    try:
        created = client.post(
            f"/items/{item['id']}/provenance-anchors",
            json={"proof_type": "receipt", "photo_id": photo["id"]},
        )
        assert created.status_code == 201
        assert created.json()["app_timestamp"]

        listed = client.get(f"/items/{item['id']}/provenance-anchors").json()
        assert len(listed) == 1
        assert listed[0]["proof_type"] == "receipt"
    finally:
        Path(photo["file_path"]).unlink(missing_ok=True)


def test_guest_signature_crud(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Autographed photo"}).json()
    item_id = item["id"]

    created = client.post(
        f"/items/{item_id}/guest-signatures",
        json={
            "guest_name": "Chris Metzen",
            "convention_name": "BlizzCon",
            "convention_date": "2019-11-01",
            "session_type": "photo-op",
        },
    )
    assert created.status_code == 201
    sig_id = created.json()["id"]

    listed = client.get(f"/items/{item_id}/guest-signatures").json()
    assert len(listed) == 1

    assert client.delete(f"/items/{item_id}/guest-signatures/{sig_id}").status_code == 204
    assert client.get(f"/items/{item_id}/guest-signatures").json() == []


def test_delete_item_cascades_stage_b_rows(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Cascade test"}).json()
    item_id = item["id"]
    client.put(f"/items/{item_id}/pin-condition", json={})
    client.post(
        f"/items/{item_id}/guest-signatures",
        json={
            "guest_name": "Someone",
            "convention_name": "Con",
            "convention_date": "2020-01-01",
            "session_type": "general",
        },
    )

    assert client.delete(f"/items/{item_id}").status_code == 204
    # No FK-violation error means the cascade actually worked.
