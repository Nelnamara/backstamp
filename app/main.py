from fastapi import FastAPI

from app.routers import items, lookups, users

app = FastAPI(title="Backstamp")

app.include_router(items.router)
app.include_router(lookups.router)
app.include_router(users.router)


@app.get("/health")
def health():
    return {"status": "ok"}
