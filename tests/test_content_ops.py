from app.routers import content_ops


def test_no_status_update_routes_exist():
    """Stage C is deliberately schema-only — confirm there's genuinely no
    moderation/status-transition route, not just that nothing calls one."""
    all_methods = set()
    for route in content_ops.router.routes:
        all_methods.update(route.methods)
    assert "PATCH" not in all_methods
    assert "PUT" not in all_methods


def test_hallmark_reference_defaults_to_pending(client, test_user):
    resp = client.post(
        "/hallmark-references",
        json={"submitted_by_user_id": test_user.id, "description": "Genuine backstamp reads 'BLIZZARD 2019'"},
    )
    assert resp.status_code == 201
    assert resp.json()["status"] == "pending"

    listed = client.get("/hallmark-references").json()
    assert any(r["id"] == resp.json()["id"] for r in listed)


def test_set_manifest_and_members(client, session):
    from sqlmodel import select

    from app.models import Franchise

    franchise_id = session.exec(
        select(Franchise).where(Franchise.name == "Blizzard Entertainment")
    ).first().id

    manifest = client.post(
        "/set-manifests", json={"name": "BlizzCon 2024 Pin Series", "franchise_id": franchise_id}
    ).json()
    assert manifest["is_active"] is True

    member = client.post(
        f"/set-manifests/{manifest['id']}/members", json={"name": "Base pin"}
    )
    assert member.status_code == 201

    members = client.get(f"/set-manifests/{manifest['id']}/members").json()
    assert [m["name"] for m in members] == ["Base pin"]


def test_set_manifest_member_404s_for_missing_manifest(client):
    resp = client.post("/set-manifests/999999/members", json={"name": "Ghost member"})
    assert resp.status_code == 404
