# Backlog

Ordered. Written 2026-08-16, after the pivot to the native app (`mobile/`).
Last updated 2026-09-01 — **Tier 1 is complete.** Next up is Tier 2.

**The shape of the problem:** the backend has ~69 working, tested endpoints.
The phone app has 6 screens and touches maybe a fifth of them. Most of what
follows is the app catching up to backend work that already exists — that's
fast work, not new design. The genuinely-unbuilt items are in Tier 3 and are
flagged as such.

**Current honest ceiling:** the app only works on the same WiFi as this PC,
with the backend running on it. Nothing is deployed. That's fine for testing
and is a deliberate deferral, not an oversight — but it's the reason this
isn't yet something you could hand to another collector.

---

## Tier 1 — makes it a real daily tool for user #1

Everything here has a finished backend. No design questions open.

1. ~~**Item detail screen.**~~ **DONE** (ea9394b) Tap an item → its photos, condition, provenance,
   value history, tags. Edit it. Delete it. *Right now you can add an item
   and then never look at it again — this is the single biggest hole.*
2. ~~**Multiple photos per item, and removing one.**~~ **DONE** (ea9394b) Item / packaging / COA /
   condition shots, per SCOPE's photo model. Add screen takes exactly one.
3. ~~**Wishlist: create, pause, delete on the phone.**~~ **DONE** (bd99dc8) Currently read-only —
   you can see entries made on the web app but can't add one.
4. ~~**Pin condition + provenance capture.**~~ **DONE** Moon gap, pin-back, post
   straightness, chips; receipt/badge-photo provenance anchor at intake.
   *These are the fields that make this not a spreadsheet.*
5. ~~**Log current value.**~~ **DONE** (ea9394b) Append to value history so the dashboard number
   means something over time.
6. ~~**Sort and filter the catalog.**~~ **DONE** Search exists; franchise/type/trade
   filters and sort do not.

## Tier 2 — makes it an app, and multi-person

7. **Standalone build (EAS Build).** Your own icon on the home screen, no
   Expo Go, installable, submittable. *This is the "would I actually ship
   this" bar, and it's a build-config task, not a rewrite.*
8. ~~**Invite generation on the phone.**~~ **DONE** Backend done; only the web app can
   mint invites today.
9. ~~**Community post creation.**~~ **DONE** Feed is read-only on the phone.
10. ~~**Contacts + trust tiers screens.**~~ **DONE** Grant/promote/expire. Backend done.
11. ~~**Convention check-in screen.**~~ **DONE** Manual + the notify-my-contacts path.
    Backend done.
12. **Trade records + vouches.** The trust anchor. Backend done.
13. **Sets & Reference.** Exists on web, absent on phone.

## Tier 3 — genuinely unbuilt (needs design, not just screens)

14. **Optical-transfer exchange.** Connect's actual core mechanic — the
    animated-QR phone-to-phone handshake. *No backend, no design pass. This
    is the biggest single piece of unbuilt product in the whole scope.*
15. **Marketplace watchers that actually poll.** eBay API, Craigslist RSS,
    Blizzard stock checks. Schema and the endpoint a poller would call both
    exist; the poller does not. Needs an eBay dev account (yours to file).
16. **Offline / bad-signal behavior.** SCOPE names con-floor connectivity as
    a first-class constraint. The app currently assumes a reachable backend
    for every screen. Needs a caching story.
17. **Push notifications.** Requires the standalone build (#7) plus APNs/FCM.
18. **Photo watermarking** for trade listings (date + username burned in) —
    accepted 2026-08-04, never built.
19. **Sets-to-item linking.** Known gap; you chose honest-read-only instead
    of faking completion tracking. Revisit when Sets matters.
20. **Passkeys.** Chosen alongside magic link; only magic link is built.
21. **Hosting/deploy** (Fly.io or Railway, per SCOPE) — the step that makes
    it reachable off your WiFi.
22. **Moderation tooling.** Report thresholds, council review workflow.
    Tables exist, deliberately no tooling. Also an App Store requirement
    for social features.

---

## Deliberate non-goals right now

- The `web/` app. It works, it's on `main`, it is not the product. Keeping
  it as an admin/desktop surface is a decision to make later, not now.
- Native Swift/Kotlin. Expo/RN covers both platforms; SCOPE's "native iOS
  next" is satisfied by a real standalone build.
