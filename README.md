# Backstamp

A self-hosted-to-start app for cataloging, wishlisting, and connecting with other collectors — pins, Blizzard Entertainment merch, Star Trek and sci-fi collectables, and the oddities in between.

Full scope, locked decisions, and open backlog: see [docs/SCOPE.md](docs/SCOPE.md).

## Status

**Curate (catalog) and Acquire (wishlist) are fully built and usable**, both backend and
the actual screens: catalog with search/filter/sort, item detail with edit/delete/tags/photo
management, add-item wizard, wishlist, a private valuation dashboard, and set/hallmark
reference. **Auth is real** — magic-link sign-in, invite-gated signup, server-side sessions;
see "Auth" below. **Connect (Pillar 3) has its backend built — contacts/trust tiers,
convention check-ins, trade records + vouches, reports, community posts — but no screens
yet**, so it shows as "coming soon" in the nav rather than a broken page.
See [docs/data-model-proposal.md](docs/data-model-proposal.md) for the full data-model plan
this came from, and [docs/SCOPE.md](docs/SCOPE.md) for the product spec.

## Quick start

**Windows (PowerShell):**

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
```

If that second line errors with something like "running scripts is disabled on this
system," run this once, then retry the line above:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then continue:

```powershell
pip install -r requirements.txt
Copy-Item .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

**macOS / Linux / Git Bash:**

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

Either way, fill in a real Postgres connection string and a Resend API key (for sending
sign-in emails — see "Auth" below) in `.env` before running `alembic upgrade head`. Then
check `http://127.0.0.1:8000/health`, or browse the interactive API docs at
`http://127.0.0.1:8000/docs`.

**The actual app (the screens) is a separate React app in `web/`.** In a second terminal,
from the repo root:

```bash
cd web
npm install
npm run dev
```

Then open `http://localhost:5173`. The dev server proxies API calls to the backend on
:8000, so both need to be running.

Run the test suite with `pytest` — it runs against the same database as `DATABASE_URL`,
inside a transaction that's always rolled back, so it never leaves real rows behind.

## Auth

Sign-in is magic-link, no passwords: enter your email, click the link that gets emailed to
you, you're in. New accounts require an invite code from someone already signed in (the
"+ Invite" button in the app header generates one) — this enforces SCOPE.md's locked
invite-only-at-launch rule. Sessions are a server-side token in an httpOnly cookie.

Sending the sign-in email requires a [Resend](https://resend.com) API key in `.env`
(`RESEND_API_KEY`). Without a verified sending domain, emails go out from Resend's shared
sandbox address and commonly land in spam — fine for local development, worth fixing with a
verified domain before inviting real people.

Passkey support (sign in with device fingerprint/face unlock instead of email) is planned
but not built yet.
