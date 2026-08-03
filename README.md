# Backstamp

A self-hosted-to-start app for cataloging, wishlisting, and connecting with other collectors — pins, Blizzard Entertainment merch, Star Trek and sci-fi collectables, and the oddities in between.

Full scope, locked decisions, and open backlog: see [docs/SCOPE.md](docs/SCOPE.md).

## Status

Early scaffolding only — no real endpoints yet.

## Quick start

```
python -m venv venv
source venv/bin/activate      # venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then check `http://127.0.0.1:8000/health`.
