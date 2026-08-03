import os
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

SUPPORTED_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
MAX_PHOTO_BYTES = 25 * 1024 * 1024


def storage_dir() -> Path:
    root = Path(os.environ.get("PHOTO_STORAGE_DIR", "storage/photos"))
    root.mkdir(parents=True, exist_ok=True)
    return root


def save_stripped_photo(raw: bytes) -> str:
    """Re-encode from raw pixel data only, so no EXIF/GPS/ICC/text-chunk
    metadata from the original file survives — the privacy rule SCOPE.md
    locks in is "GPS/EXIF stripped automatically from every uploaded photo
    before storage," not just on request.
    """
    if len(raw) > MAX_PHOTO_BYTES:
        raise HTTPException(400, "Photo is larger than the 25MB limit.")

    try:
        image = Image.open(BytesIO(raw))
        image.load()
    except UnidentifiedImageError:
        raise HTTPException(400, "That file isn't a readable image.")
    except Image.DecompressionBombError:
        raise HTTPException(400, "Image dimensions are too large.")

    real_format = (image.format or "").upper()
    if real_format not in SUPPORTED_FORMATS:
        raise HTTPException(
            400,
            f"Unsupported photo type: {real_format or 'unknown'}. "
            "Use JPEG, PNG, or WebP — HEIC isn't supported yet "
            "(see SCOPE.md's Known Hard Parts).",
        )

    clean = Image.new(image.mode, image.size)
    clean.putdata(image.get_flattened_data())

    filename = f"{uuid.uuid4()}.{SUPPORTED_FORMATS[real_format]}"
    path = storage_dir() / filename
    clean.save(path, format=real_format)
    return path.as_posix()


async def read_upload(upload: UploadFile) -> bytes:
    return await upload.read()
