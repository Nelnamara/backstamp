from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.photos import storage_dir
from app.routers import acquire, auth, connect, content_ops, items, lookups, provenance, users

app = FastAPI(title="Backstamp")

# Open CORS for now: the mobile app (native fetch) doesn't need it, but the
# Expo web target and any browser client do. Tighten allow_origins to the
# real web origins once this is deployed rather than running on localhost/LAN.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(items.router)
app.include_router(lookups.router)
app.include_router(users.router)
app.include_router(provenance.router)
app.include_router(content_ops.router)
app.include_router(acquire.router)
app.include_router(connect.router)
app.include_router(auth.router)

# Serves the stored photo files (already EXIF/GPS-stripped at upload) so the
# web UI can render them; storage_dir() creates the folder if it's missing.
app.mount("/photos", StaticFiles(directory=storage_dir()), name="photos")


@app.get("/health")
def health():
    return {"status": "ok"}
