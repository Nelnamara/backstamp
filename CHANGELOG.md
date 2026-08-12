# Changelog

Reverse-chronological. This didn't exist until 2026-08-11 — everything before that date is
reconstructed from real commit history (`git log`), not written as it happened.

## 2026-08-11

- **Connect screens**: Contacts (manual trust-tier grants + an auto-connect-at-conventions
  privacy toggle — optical-transfer phone scanning is NOT built, this is a manual stand-in),
  Convention Check-ins (with a "who'd be notified" preview — real push needs the native app,
  not built), Community page (Showcase/Trade/Seeking posts, optionally tagging your own
  items). Branch `connect-screens`, not yet merged.
- Fixed a stale "no roadmap doc" gap — this file.

## 2026-08-10/11

- **Real login wired into the frontend.** Replaced the old "type a username" stopgap
  entirely with an actual sign-in screen: magic-link email, invite-gated signup, session
  cookie, working invite-generator and log-out in the header.
- **Branch cleanup incident.** Auth had been built on its own branch before the prior
  Connect/nav branch was merged — two branches with divergent migration histories fighting
  over the one shared dev database. Consolidated: merged auth into the Connect/nav branch,
  fixed the migration chain to be linear, fast-forwarded into `main`, deleted both feature
  branches. Standing rule since: never build directly on `main` again (that fix itself was
  committed straight to `main`, which was later flagged as the wrong call).
- **Auth backend**: magic-link login/signup, invite codes, server-side sessions
  (`User.email`, `Invite`, `MagicLinkToken`, `UserSession`). Email via Resend's HTTP API.
  Passkeys chosen alongside magic link but not built yet.
- **Connect backend (Stage E)**: `Contact` (directional trust tiers, ephemeral unless
  promoted), `ExchangeSession` (scan log, not auto-linked to Contact creation — that's an
  open product decision), `ConventionCheckIn` + notify-targets, `TradeRecord` (mutual
  confirmation) + `Vouch`, `Report` (bare, moderation workflow deferred), `CommunityPost` +
  `CommunityPostItem`.
- Catalog/Item Detail screens got real edit, delete, tag add/remove, and sort — the backend
  routes already existed from Stage A; only the UI wiring was missing.
- Nav restructured around SCOPE.md's actual locked 3-pillar architecture (Curate/Acquire/
  Connect) with Dashboard as the landing screen, not a 4th pillar.

## 2026-08-08

- Fourth external design reference reviewed (a Figma Make export) alongside my own
  Display-Case mock and Claude Design's blind pass — informed the search/filter addition
  and confirmed the 3-pillar IA independently (all three sources were built from SCOPE.md).
- All six original screens built and merged: Catalog, Item Detail (accession card), Add
  Item (stepped wizard), Wishlist, Dashboard (private valuation), Sets & Reference.
- Quick Start fixed for PowerShell (`Activate.ps1`, not bare `activate`).

## 2026-08-03

- Full Curate + Acquire data model (Stages A–D): core catalog, photos, tags, value
  history, pin condition, provenance anchors, guest-signed provenance, hallmark reference
  + set manifests (schema only, tooling deliberately deferred), wishlist, watcher sources,
  watcher hits, want/have swap-matching.

## 2026-08-02

- Repo seeded: SCOPE.md, README, FastAPI skeleton.
