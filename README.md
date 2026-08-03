# Backstamp

A self-hosted-to-start app for cataloging, wishlisting, and connecting with other collectors — pins, Blizzard Entertainment merch, Star Trek and sci-fi collectables, and the oddities in between.

Full scope, locked decisions, and open backlog: see [docs/SCOPE.md](docs/SCOPE.md).

## Status

Stages A and B of the data model are live: the core catalog (items, photos, tags,
value-over-time) plus pin condition, provenance anchors, and guest-signed autographs, for
Pillar 1 (Curate), backed by Postgres. See
[docs/data-model-proposal.md](docs/data-model-proposal.md) for the full staged plan (A–D)
this came from. Auth doesn't exist yet — see "Users" below.

## Quick start

```
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env          # then fill in a real Postgres connection string
alembic upgrade head
uvicorn app.main:app --reload
```

Then check `http://127.0.0.1:8000/health`, or browse the interactive API docs at
`http://127.0.0.1:8000/docs`.

Run the test suite with `pytest` — it runs against the same database as `DATABASE_URL`,
inside a transaction that's always rolled back, so it never leaves real rows behind.

## Users

There's no signup/login yet (see SCOPE.md's Platform & Architecture section — it's
separate, undesigned work). `POST /users` is a bare stopgap — just a username, no
password — so `item.owner_id` has something real to point at. Every item needs an
`owner_id` from an existing user.
