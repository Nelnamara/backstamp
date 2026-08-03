<!-- title: Backstamp — Data Model Proposal (Curate + Acquire) -->

# Data Model Proposal — Curate & Acquire

*Staged database schema for Pillars 1–2, built against [SCOPE.md](SCOPE.md). Stage A is
implemented (see `app/models.py`); B–D are proposed, not yet built.*

Stack: **Postgres** (Neon for dev — see root `.env.example`), **SQLModel**, item photos
stored as files on disk with the path in the database.

## Stage A — Core catalog (implemented)

Everything needed to log an item, photograph it, tag it, and track its value over time.

- **`app_user`** — ownership + role stub only (id, username, role). Just enough for
  `item.owner_id` to point at something real; signup/invite/login is separate,
  undesigned work. `POST /users` is a bare stopgap for now, no password.
- **`franchise` / `item_type` / `rarity`** — the fixed taxonomy, as lookup tables rather
  than a hardcoded list, so adding a new one later is a data row (`POST /franchises` etc.),
  not a code change. Seeded with a small starter set at migration time.
- **`item`** — the collectible itself: taxonomy links, `redemption_status`
  (not_applicable / unredeemed / redeemed / redeemed_elsewhere / orphaned),
  `exclusive_channel` (goody_bag / on_site_store / employee_only / community_rep_gift),
  `trade_stock`, `edition_number` / `edition_total`.
- **`photo`** — one row per photo (item / packaging / coa / condition / other). GPS/EXIF
  is stripped on upload by re-encoding from raw pixel data before the file is ever written
  (`app/photos.py`) — the locked privacy rule, not a nice-to-have. HEIC isn't supported yet
  (flagged in SCOPE.md's Known Hard Parts) — JPEG/PNG/WebP only for now.
- **`value_history`** — append-only log (SCOPE.md asks for worth *over time*, not a
  single overwritable number). A row is logged automatically at `purchase_price` when an
  item is created.
- **`tag` / `item_tag`** — free-form tagging, many-to-many.

Deleting an item cascades to its photos, value history, and tag links.

## Stage B — Curate: condition & provenance (proposed)

- **`pin_condition`** — one-to-one with an item, only for pins: moon gap, pin-back/clutch
  match, post straightness, enamel chip count. Replaces a generic Mint/Good/Poor field.
- **`provenance_anchor`** — proof attached at first cataloging (receipt, order
  confirmation, badge photo), app-timestamped. The timestamp has **no edit path, by
  design** — the point is that *when* a claim was made is harder to fake retroactively
  than the object itself.
- **`guest_signed_provenance`** — autographed items: guest name, con, date, session type.
  A `witnessed_by_user_id` column is a placeholder for Connect's optical-transfer
  confirmation, which doesn't have a schema yet.

## Stage C — Curate: community content-ops (proposed, hold after modeling)

Both accepted in SCOPE.md but explicitly flagged there as ongoing curation jobs, not
one-time builds. Proposal: model the tables so nothing else changes shape later, but hold
off building the actual moderation/editorial tooling until Stage A/B are proven.

- **`hallmark_reference`** — crowdsourced backstamp/pin-back/plating authentication
  reference, with a status routed through the trust & council review process (Connect's
  job to enforce, not this table's).
- **`set_manifest` / `set_manifest_member`** — editorial series definitions (e.g. a given
  year's BlizzCon pin run), independent of who owns what — lets Acquire notice a missing
  member of a set someone's partway through.

## Stage D — Acquire (proposed)

- **`wishlist_entry`** — `variant_spec` is a flexible JSON field rather than fixed
  columns, since the exact variant taxonomy isn't nailed down yet (SCOPE.md's own example:
  "only the glow-in-the-dark chase /50, not the base pin"). Plus `condition_floor`,
  `coa_required`, `price_ceiling`.
- **`watcher_source`** — seeded with the four locked sources (eBay, Craigslist, Blizzard
  Gear Store, Facebook Marketplace). No login/session field anywhere, on purpose — the
  standing rule is that watchers never hold a stored session. Adding a fifth source later
  (once it clears the legality/ToS review) is a new row, not a code change.
- **`watcher_hit`** — one row per match, before/after being checked against the wishlist
  entry's spec.
- **No new table for want/have swap-matching** — it's a query ("does anyone else's item
  have `trade_stock = true` matching my wishlist filters"), not new infrastructure, per
  SCOPE.md's own reasoning.

## Open calls made during this design pass

1. Franchise/item type/rarity are lookup tables, not a fixed list in code.
2. Wishlist variant matching is a flexible JSON field, not fixed columns.
3. The `app_user` table is a stub — id, username, role — nothing else. Signup, invite
   codes, and login itself are separate, undesigned work.
4. Hallmark reference and set manifests are modeled but building the actual tooling is
   proposed to wait, since SCOPE.md flags both as ongoing curation jobs.
5. Guest-signed provenance's witness field is a stub with nothing behind it yet — it's
   there for when Connect's optical-transfer confirmation ships.
6. Collection value is a history log, not a single column, to match "worth over time."
7. Provenance-anchor timestamps have no edit path, on purpose — see Stage B above.
