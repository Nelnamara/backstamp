# Backstamp — Mobile App (Expo / React Native)

The real phone app. Curate / Acquire / Connect as bottom tabs, talking to the
FastAPI backend in the repo root.

## Run it on your phone

1. **Install "Expo Go"** from the App Store (iOS) or Play Store (Android).

2. **Start the backend** — from the repo root, bound so your phone can reach it:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

3. **Start the app** — from this `mobile/` folder:
   ```bash
   npm install     # first time only
   npx expo start
   ```
   A QR code prints in the terminal.

4. **Scan the QR** with your phone's camera (iOS) or the Expo Go app (Android).
   The app opens on your phone.

Your phone and PC must be on the **same WiFi**. The app auto-discovers the PC's
LAN address from the Expo dev server, so no manual IP entry — as long as the
backend is running on `0.0.0.0:8000`.

## Signing in

Magic link: enter your email, tap "Email me a sign-in link," open the email,
copy the link, and paste it back into the app. (Deep-linking so the email link
opens the app directly is a follow-up; for now you paste it.)

## Known limits of this first version

- The sign-in session is held in memory — closing/restarting the app means
  signing in again. Persisting it (stay logged in) is next.
- Read + browse is fully wired (dashboard, catalog, wishlist, community feed).
  Creating/editing from the phone (add item, add wishlist entry, post) is the
  next increment — those endpoints exist and work; the phone screens for them
  aren't built yet.
- No camera capture yet (SCOPE.md's photo-first intake) — a later increment.
