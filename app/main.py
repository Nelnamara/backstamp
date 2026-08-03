from fastapi import FastAPI

from app.routers import acquire, content_ops, items, lookups, provenance, users

app = FastAPI(title="Backstamp")

app.include_router(items.router)
app.include_router(lookups.router)
app.include_router(users.router)
app.include_router(provenance.router)
app.include_router(content_ops.router)
app.include_router(acquire.router)


@app.get("/health")
def health():
    return {"status": "ok"}
