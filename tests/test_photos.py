from io import BytesIO
from pathlib import Path

import piexif
from PIL import Image


def _jpeg_with_gps() -> bytes:
    image = Image.new("RGB", (40, 40), color="blue")
    gps_ifd = {
        piexif.GPSIFD.GPSLatitude: ((40, 1), (0, 1), (0, 1)),
        piexif.GPSIFD.GPSLatitudeRef: "N",
    }
    exif_bytes = piexif.dump({"GPS": gps_ifd})
    buf = BytesIO()
    image.save(buf, format="JPEG", exif=exif_bytes)
    return buf.getvalue()


def test_upload_strips_exif_and_gps(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Photo item"}).json()

    source = _jpeg_with_gps()
    assert Image.open(BytesIO(source)).info.get("exif"), "fixture should actually carry EXIF"

    resp = client.post(
        f"/items/{item['id']}/photos",
        files={"file": ("gps.jpg", source, "image/jpeg")},
        data={"photo_type": "item"},
    )
    assert resp.status_code == 201
    photo = resp.json()
    stored_path = Path(photo["file_path"])

    try:
        with Image.open(stored_path) as stored:
            stored.load()
            assert not stored.info.get("exif")
            assert dict(stored.getexif()) == {}
    finally:
        stored_path.unlink(missing_ok=True)


def test_upload_rejects_non_image(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Bad upload item"}).json()

    resp = client.post(
        f"/items/{item['id']}/photos",
        files={"file": ("notes.txt", b"this is not an image", "text/plain")},
        data={"photo_type": "item"},
    )
    assert resp.status_code == 400


def test_list_photos_for_item(client, test_user):
    item = client.post("/items", json={"owner_id": test_user.id, "name": "Multi-photo item"}).json()
    source = _jpeg_with_gps()

    resp = client.post(
        f"/items/{item['id']}/photos",
        files={"file": ("box.jpg", source, "image/jpeg")},
        data={"photo_type": "packaging"},
    )
    stored_path = Path(resp.json()["file_path"])

    try:
        photos = client.get(f"/items/{item['id']}/photos").json()
        assert len(photos) == 1
        assert photos[0]["photo_type"] == "packaging"
    finally:
        stored_path.unlink(missing_ok=True)
