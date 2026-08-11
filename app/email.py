"""Transactional email via Resend's HTTP API. A thin wrapper, not a client
library, so tests can monkeypatch send_magic_link_email without any network
call — pytest must never actually send email.
"""

import os

import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")


def send_magic_link_email(to_email: str, token: str) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not set — add it to .env")

    link = f"{FRONTEND_URL}/verify?token={token}"
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Your Backstamp sign-in link",
            "html": f'<p>Click to sign in: <a href="{link}">{link}</a></p><p>This link expires in 15 minutes.</p>',
        },
        timeout=10,
    )
    resp.raise_for_status()
