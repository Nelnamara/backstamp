def test_update_user_auto_connect_setting(client, test_user):
    assert test_user.auto_connect_at_conventions is False

    resp = client.patch(f"/users/{test_user.id}", json={"auto_connect_at_conventions": True})
    assert resp.status_code == 200
    assert resp.json()["auto_connect_at_conventions"] is True

    listed = client.get("/users").json()
    mine = next(u for u in listed if u["id"] == test_user.id)
    assert mine["auto_connect_at_conventions"] is True


def test_update_user_404(client):
    resp = client.patch("/users/999999", json={"auto_connect_at_conventions": True})
    assert resp.status_code == 404
