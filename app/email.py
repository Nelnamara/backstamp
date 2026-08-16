"""Transactional email via Resend's HTTP API. A thin wrapper, not a client
library, so tests can monkeypatch send_magic_link_email without any network
call — pytest must never actually send email.
"""

import os

import httpx

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.environ.get("RESEND_FROM_EMAIL", "onboarding@resend.dev")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
# Where the phone app's sign-in deep link points. In Expo Go (dev) the app
# is reached via Metro's exp:// URL and paths go after "/--/". In a real
# standalone build this becomes "backstamp://". Set APP_LINK_BASE in .env.
APP_LINK_BASE = os.environ.get("APP_LINK_BASE", "backstamp:/")


def send_magic_link_email(to_email: str, token: str) -> None:
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY is not set — add it to .env")

    # Primary: opens the phone app directly via its URL scheme (deep link).
    # Some mail clients won't make a custom scheme tappable, so the raw
    # token is shown too as a paste-in fallback, and the web link is kept
    # for anyone signing in from a browser.
    app_link = f"{APP_LINK_BASE.rstrip('/')}/verify?token={token}"
    web_link = f"{FRONTEND_URL}/verify?token={token}"
    html = (
        f'<p><a href="{app_link}" style="display:inline-block;padding:12px 18px;'
        f'background:#b8914a;color:#1a130a;text-decoration:none;border-radius:6px;'
        f'font-weight:bold">Open Backstamp &amp; sign in</a></p>'
        f'<p style="color:#666;font-size:13px">If that button does nothing on your phone, '
        f'open the Backstamp app and paste this code:</p>'
        f'<p style="font-family:monospace;font-size:15px;word-break:break-all">{token}</p>'
        f'<p style="color:#999;font-size:12px">Signing in from a computer instead? '
        f'<a href="{web_link}">Use this link</a>. Expires in 15 minutes.</p>'
    )
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": "Your Backstamp sign-in link",
            "html": html,
        },
        timeout=10,
    )
    resp.raise_for_status()
