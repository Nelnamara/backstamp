<!-- title: Backstamp — Scope Doc -->

# Backstamp — Scope Doc
*Name locked: **Backstamp** — the mark on the reverse of a pin/badge that proves its maker and authenticity. Specific to the pin/Blizzard-trading crowd, and echoes the backstamp/hallmark fake-alert reference already in Pillar 1. Last synced with conversation: 2026-08-03.*

> **Status: provisional, workshop-in-progress.** Everything in "Decided So Far" reflects what's been agreed in conversation up to this point — it is not a spec to build against yet, and none of it is final until explicitly confirmed. The "Backlog" section exists specifically so open questions get tracked honestly instead of quietly resolved by omission. If something here is wrong or premature, say so — this doc should never claim more certainty than actually exists.

---

## Overview

A self-hosted-to-start app for managing a physical collectables collection (Blizzard Entertainment-heavy, plus a heavy Star Trek and broader sci-fi following), built around three pillars:

1. **Curate** — catalog and index the collection.
2. **Acquire** — a curated wishlist watched automatically across marketplaces, with notifications on a hit.
3. **Connect** — a social layer for meeting and trading with other collectors, added on top of the same foundation (not a pivot away from 1–2).

Pillars 1–2 are useful solo, from day one. Pillar 3 only becomes real once other collectors are using the app too — so it's a natural build-order, not a scope cut.

---

## Decided So Far

### Identity & Repo
- New, standalone repo — not connected to any other project.
- **Name: locked — Backstamp.** User's own coinage, not from the candidate shortlist (Hoardshare, Cache, etc., all superseded). Ties directly to the backstamp/hallmark authentication reference already accepted in Pillar 1.

### Product Principles — Privacy & Trust
Locked as concrete, falsifiable product decisions (not a vibe or a policy line) — the app treats housing a valuable, resellable physical collection as something with real safety and ethical weight, and this is the reasoning ledger for that:
- **Valuation data is never a product.** Purchase-price/current-value data is never sold, never used to train a pricing model or a "market intelligence" upsell, even anonymized/aggregated. No notification ever frames a user's own collection value as a reason to sell it.
- **The catalog is a burglary map if mishandled, so it's designed against that from day one:** GPS/EXIF stripped automatically from every uploaded photo before storage; an aggregate "total collection value" is never rendered anywhere except the owner's own private dashboard; Community Showcase entries opt in per item (not per account) and never surface a running total; convention check-in visibility is delayed/coarse rather than live GPS.
- **Marketplace watchers never hold a stored login/session**, as a standing rule (see Acquire) — not a one-off decision for Facebook alone.
- **Community Showcase entries are de-indexed by default** (noindex/nofollow) and un-showcasing is a real delete, with a short grace period, not a soft-hide — a shared display shouldn't become a permanent, googleable inventory listing years later.

### Pillar 1 — Curate
- Catalog with a **fixed taxonomy** (franchise / type / rarity) plus **free-form tags** for anything that doesn't fit.
- Tracks **purchase price and current market value** (collection worth over time, not just a static catalog).
- **Multiple photos per item** — item itself, box/packaging, certificate of authenticity/numbering, condition shots.
- **Redemption-code status as a first-class field** — unredeemed / redeemed / redeemed-by-someone-else / orphaned, for hybrid physical/digital items (WoW TCG loot, BlizzCon in-game codes). Same box, same pin — categorically different collectible depending on status.
- **Day-zero provenance anchor** — optionally attach proof (receipt, order confirmation, badge photo) at first cataloging, timestamped by the app itself. Fakes overwhelmingly enter a collection at resale, not original purchase, so *when a claim was made* is harder to fake retroactively than the object itself.
- **Exclusive-channel tag** for convention-tied items — goody-bag/swag, on-site store purchase, employee-only, community-rep gift. Visually identical items from different channels carry different trade value and different fake-risk.
- **Pin-specific condition fields** (for items tagged as enamel pins) — moon gap, pin-back/clutch match-to-original, post straightness, enamel chip count — replacing a generic Mint/Good/Poor field with the vocabulary traders actually use.
- **Numbered-edition / COA registry** — structured edition_number/edition_total/COA-photo field now; an optional "does this edition number look plausible against known run sizes" check deferred to later.
- **Guest-signed provenance** for autographed items — guest name, con + date, session type — optionally corroborated by a second attendee's optical-transfer "I witnessed this" confirmation (ties into the Connect exchange mechanism below).
- **"Trade Stock" flag** — items can be marked as current trade stock vs. home/keep. Governs what's shown by default during a Connect exchange (see Pillar 3).
- **Accepted, cost flagged — Franchise hallmark / fake-alert reference**: a crowdsourced authentication reference (backstamp text, pin-back hardware, plating) with community fake-circulation flags routed through the trust/council system. Accepted, but this is a standing content-ops and moderation job, not a one-time schema addition — needs a real plan for who sources and maintains it.
- **Accepted, cost flagged — Living set manifests**: editorially-maintained set/series definitions (e.g. a given year's BlizzCon pin series) so completion tracking survives events like a manufacturer folding mid-series, feeding missing members into Acquire automatically. Accepted, but needs permanent, accurate curation across every series — an ongoing burden, not a one-time build.

### Pillar 2 — Acquire
- Curated wishlist with automated watchers, notifying on a match.
- Sources agreed so far:
  - **eBay** — official API, saved search.
  - **Craigslist** — RSS search feeds.
  - **Blizzard Gear Store** — poll for restocks/sales.
  - **Facebook Marketplace** — public search only, **no login**.
- **Facebook private-group scraping explicitly deferred** — would require a logged-in session, which risks the account being flagged/banned by Facebook's bot detection. Held off by choice, not forgotten.
- **Watchers never hold a stored login/session, as a standing architectural rule** — not just a one-off for Facebook. eBay uses OAuth with the narrowest read-only scope; Blizzard Gear Store checks are unauthenticated stock/price polling only. This generalizes the FB deferral so the next "can we also watch this private group/site" request has a pre-agreed answer instead of being re-litigated under feature pressure.
- **Watcher list policy locked: ship the base set above now; expand via a roadmap gated on legality/ToS allowability per source.** Not open-ended — each candidate source gets evaluated the same way eBay/Craigslist/Blizzard Store/FB Marketplace already were (official API or public-only access = safe to add; login-required scraping = deferred/risky) before it's built, regardless of how many users request it.
- **Community-suggested watcher sources** feed that roadmap — users can propose a site, but proposing doesn't bypass the legality/ToS review.
- **Variant-aware wishlist entries** — a wishlist row can specify an acceptable-variant tree (e.g. "only the glow-in-the-dark chase /50, not the base pin") and a condition floor (sealed/MIB vs. loose acceptable, COA required) so watcher hits get filtered against the actual spec instead of firing on every listing sharing a near-identical title.
- **Price ceiling per wishlist item.** Collectible prices genuinely swing (BlizzCon-week FOMO spikes, a discontinued line going up once it's the last of its kind) — a per-item price ceiling means a watcher hit above your set budget doesn't compete for attention the same way a hit at or under it does.
- **Want/have swap-matching engine — locked.** Matches your wishlist against other users' tradeable-flagged duplicates (built on the "Trade Stock" flag above) — the digital version of trading lanyards of dupes. Requires server-side wishlist/tradeable-state data, which Acquire's own background watchers already need regardless, so it's not new infrastructure on top of what's already committed.

### Pillar 3 — Connect
- Social layer for meeting other collectors, seeing each other's collections/wishlists, and trading info — particularly at conventions.
- **Exchange mechanism: optical transfer** (screen-to-camera, modeled on [decimen-optical-transfer](https://github.com/bashalarmistalt/decimen-optical-transfer), MIT licensed). Animated QR / fountain-coded data shown on one phone's screen, captured by another's camera. Chosen specifically because it needs **no network** (critical on a crowded convention floor with bad WiFi/cellular) and **no Bluetooth/NFC pairing friction** (iOS restricts peer-to-peer NFC and background BLE scanning hard, and NFC/"Bump"-style discovery is largely a dead end technically).
- **Tiered sharing model** for what gets exchanged:
  - **Tier 1 (default handshake):** profile, social links, desired contact info, groups/marketplaces/sites they're active on.
  - **Tier 2:** wishlist.
  - **Tier 3 (highest trust):** full collection.
  - **Escalation mechanic: user-driven, per-contact, changeable at any time.** You set/update a contact's trust level yourself — it's not automatic and not locked once set. You can grant the top tier immediately on a first scan if you want (no forced gradual earn-in).
  - **Default-behavior refinement (accepted): grants are ephemeral unless promoted.** A tier grant from a given exchange expires automatically at the end of the convention (or after N days) unless you explicitly promote it to permanent — the opposite of the "connected forever by default" pattern most social apps use. This sets the *default* when nobody's touched a relationship, it doesn't change the user-driven/changeable-anytime rule above — flag it if that's not what was meant.
- **"Trade Stock" vs. "Keep Board"** — the default Tier 2 exchange surfaces only items flagged trade stock (see Curate), not the full collection.
- **Digital "flash card" lanyard mode** — an opt-in screen state showing only trade-stock + a short want-list, shown phone-to-phone the way a physical trading lanyard gets flashed to a stranger.
- **Convention check-ins**: notify friends when a collector checks in at a specific convention (Comic-Con, BlizzCon, etc.). **Mechanism: both geofencing and manual check-in** — con-floor cell service is unreliable enough that manual needs to always be available as a fallback, not just a nice-to-have.
- **Community Showcase**: a separate, public gallery for showing off sets/displays — opt-in per item/set, independent of the tiered trust system. De-indexed by default (see Product Principles).
- **Trust & safety — moderation model locked:**
  - Community-driven vouching and scammer-flagging. Vouching requires an actual logged interaction/trade (not open to anyone-vouches-for-anyone) to resist gaming via sockpuppets.
  - **Locked process:** any user can report a listing/profile/interaction (Facebook-style) → reports accumulate against an account and a threshold (e.g. 3 independent reports) triggers a soft flag — limited visibility or a trade cooldown, not a public accusation — pending review (Reddit-style) → the council (forum-trusted-user pattern) reviews flagged cases and decides clear/warn/suspend, with appeals through the same council.
  - **Refinement, locked alongside it:** vouches/flags attach to a specific transaction/context rather than accumulating into one global reputation number, and a flag doesn't go public until a private mediation step with the flagged user completes — avoids the callout-post pile-on pattern seen in collector Facebook groups. No visible leaderboard-style trust score.
  - **Already agreed implication for the build:** the user model needs a **role/permission layer from day one** (member / council / admin), even though only "member" exists at MVP — so promoting someone later is a role flag flip, not a data-model rewrite.

### Platform & Architecture
- **Backend: FastAPI (Python)** — explicitly chosen over Flask.
- **Frontend:** hosted web app (PWA) to start, with browser-based camera capture for photo intake. Native **iOS app next**, **Android after that**, both against the same FastAPI REST API.
- **Hosting: locked — a small managed platform (Fly.io or Railway)**, not a home server (doesn't fit once other people's accounts/data exist) and not a raw VPS (real ongoing ops burden for no benefit at this scale). Low cost and near-zero ops overhead at invite-only scale, with a clear upgrade path later.
- **Locked: invite-only at launch, open beta later.** De-risks moderation/infra before opening signup, with the account/privacy model designed so opening later is a config change, not a rewrite.
- **Business model locked: subscription-based, plus eventual sponsorships with specific collector communities.** Subscription is the primary revenue path — no ads, no data-brokering, consistent with the Product Principles valuation-data charter above. Community sponsorships (e.g. a Blizzard fan group, a con, a pin-trading community) are an intended later revenue path too, and need their own guardrail when designed: sponsorship should mean visibility/placement paid for by a sponsor, never injected ads in ACQUIRE match results and never selling user purchase-intent data to a sponsor — the same line the valuation-data charter already draws for anyone else.

### Known Hard Parts (flagged, not to be waved away)
Called out explicitly because of a standing sensitivity: past AI-assisted builds have oversold something as a quick, simple build ("it's just CSS") when the real complexity showed up later. These are named up front so that doesn't repeat:
- iOS Safari camera/HEIC/EXIF quirks in the PWA capture flow.
- iOS Safari's limited, version-dependent web-push support — a native app + APNs may be needed for push to actually work reliably.
- Facebook Marketplace scraping has no API and needs ongoing maintenance as Facebook changes its frontend.
- A native iOS app is a separate Swift/Xcode codebase and distribution process — not "point SwiftUI at the API and done."
- Apple's App Store requires content moderation / block / report tooling for apps with user profiles and social interaction — directly relevant to the Connect pillar and the flagging system, not an optional add-on.
- **Franchise hallmark reference and Living set manifests** (Pillar 1, accepted) are both standing content-ops/curation jobs, not one-time builds — someone has to source and keep them accurate.

## Tabled — Not Now
Explicitly punted, not forgotten or silently dropped:
- **Storage & material-interaction log** (Pillar 1) — real and well-observed (PVC off-gassing, GITD paint fade), but "a bit much to start." Revisit once the core pillars are shipped and stable.
- **Android app timeline/scope** — gated partly on the user not currently having a way to test; cloud device-testing services (Firebase Test Lab, BrowserStack) are a future bridge if/when this comes back up.
- **Sponsorship guardrails** — the business model locks subscription + eventual community sponsorships, but the specific mechanics (what a sponsor gets, how it stays distinct from paid placement in match results) aren't designed yet. Tabled alongside Android.

---

## Backlog — Needs Workshopping

1. **Data model specifics for Pillars 1–2** — concrete schema and screens. In progress now.
2. **Concrete watcher-source roadmap** — policy is locked (base set now, legality/ToS-gated expansion), but the actual candidate list and evaluation order (Mercari, OfferUp, unofficial Blizzard pin sites, etc.) isn't drafted yet.

---

## Appendix

This doc was built out of a live workshopping conversation, not a pre-written spec — see that conversation for the full reasoning trail behind each decision above. A structured ideation workflow generated and critically scored 55 feature ideas across eight collector-specific lenses (pin-trading culture, completionism/display, authentication/counterfeits, marketplace mechanics, convention experience, legacy/stewardship, oddities-handling, privacy-as-differentiator); the accepted results are folded into "Decided So Far" above, and the interactive review pass (accept/maybe/reject + notes) is what resolved them.
