# Below the Obvious

<!-- maintenance-game: Games/Dive Trivia -->

## Identity and status

Catalog 235, `Games/Dive Trivia/index.html`, category word. Owner-authorized original rare-answer trivia, not an ingested port. The operator selected the name Below the Obvious on 2026-10-21; the directory and `dive-trivia` storage namespace remain unchanged. The corrected 2026-10-19 chat order permits solo first and Battle phase 2. No online multiplayer or publication is claimed. See [provenance/controls](../../dive-trivia-provenance.md) and [transport research](../../kirrlion-mp-research.md).

## Implementation map

Fully inspected authored files: `index.html` (semantic launch/game/results), `style.css` (solid-color ocean, desktop/mobile light/dark), `guide.svg` (original Buoy drone), `script.js` (DOM/controller/clock/storage), `core.js` (normalization, schema, deterministic selection and run state machine), `questions.js` (28 prompts, four packs, 344 answers), `CREDITS.md`. No compiled engine, upstream bundle, external SDK or hidden source limit. Shared local fonts are referenced through `../../assets/fonts/`.

## Gameplay and controls

Seven prompts per run, 25 seconds each, type any recognized answer then Enter/Lock answer, or Pass. Six editorial tiers award 10/15/30/60/85/100 points, ten metres per point. Scores accumulate to at most 700 / 7,000 m. Timeout, unknown and pass score zero without ending the run. Reveal includes the finite answer key. Next starts a fresh question; round seven has field notes, replay and home. Quit confirms loss of unfinished progress. Keyboard, touch/native keyboard, mouse, theme and visible focus are supported. No invented lose condition for an open score challenge.

## State and persistence

`DiveCore` supplies finite-clock create/submit/expire/next operations. Submit is locked once; receipt at the deadline is too late; records freeze. Controller uses `performance.now()` and one interval, cleared at reveal/home/pagehide; pageshow restores a live timer and visibility return rechecks expiry. No active run is restored after reload. UTC daily seed/version selects everyone’s same seven, independent of timezone and local storage. Packs and numbered 1–999999 dives are deterministic. Keys `dive-trivia:theme` and `dive-trivia:last:v1` store theme and only one completed `{label,total}` summary. Storage reads/parsing/bounds/writes are guarded; blocked saving reports nonfatal feedback. No accounts or analytics.

## Dependencies and provenance

Self-made under this operator order; no upstream revision or invented license. Original factual organization and drone SVG, existing local fonts with [retained evidence](../../portal-font-sources.md). No runtime third-party loads, sockets or fetches; no new packages. Browser scripts are classic local files, no build. Online Battle is not initialized or implemented. Source and answer keys are inspectable, so no anti-cheat claim.

## Audit findings

First browser run failed 44px portal-link height despite passing functional checks. Root fix applied to shared `.portal` CSS target, not to a checker filter. Review then caught 80-character unbroken answers clipping inside mobile cards, missed by root-only overflow detection. Wrapping was fixed at the shared workbench boundary; regression now checks internal overflow and narrow-screen long-answer reveal/results. Final full rerun passed with zero findings. Unknown answers are honestly reported as unlisted, never proved incorrect. Coverage is intentionally finite; broad categories omit many valid answers. Rarity is subjective, not frequency research. No independent external fact audit of all memberships, real hardware/mobile keyboard, screen-reader or 12-device network acceptance. Initial pool is small and packs/dailies repeat. No cold hosted offline install/service worker. Desktop has depth-based drone movement; mobile compact header retains numeric depth, not the full vertical scale.

## Safe iteration

Edit only this project, its owned tests/manuals and separately authorized catalog entry. Never touch Wings/Character AI, proxy settings, hosting headers or sibling main. Validate every normalized alias after content changes; bump dataset version deliberately because it changes deterministic dailies. Keep scoring/locks in core, no duplicated UI scoring and no ambient randomness. Do not add silent fuzzy matches or live rarity claims. Battle must pass provisioning, privacy/policy and protocol gates in the research doc before being enabled. No same-device channel disguised as online proof. Keep ports >=8900 and terminate servers.

## Verification

2026-10-21 shipping pass: operator-selected name applied to title, breadcrumb, credits and catalog without changing storage keys. Core regression passed 8 checks; targeted registered smoke passed 1/1 with zero retained console errors or failed requests. The [shipping receipt](../audits/thumbs-ship-20261021.md) records the explicitly requested full-fleet exception, not a full-fleet PASS.

2026-10-19: `node scripts/test_dive_trivia.mjs` reports **8 checks passed**, including every canonical answer/alias, six tiers, invalid data/dates, stable selections, exact deadline/locking, seven-round finish and max depth. Browser rerun on stable game bytes reports **17 groups, 28 screenshots, 85.531 seconds, zero external attempts/browser errors/request failures/findings**; genuine timeout observed at 25.38 seconds. Daily matching tested in independent desktop/mobile contexts, not online. All four packs and numbered bounds/restart paths exercised via actual typing/click/tap, no game-state/time grants. Offline after-load seven-round play, unknown HTML-safe literal, quit cancellation/acceptance, malformed/blocked storage and 320/390px/light/dark layouts covered. Script: `scripts/test_dive_trivia_browser.py`, port8911; server/browser terminated. Evidence ignored under `.swarmforge-logs/dive-trivia/`. Orchestrator visually reviewed desktop light launch/dark question, mobile320 light launch and mobile390 dark reveal; also reviewed desktop dark launch, mobile320 light question and long-answer reveal/results; all other screenshots retained.

Targeted registered-game smoke, source syntax, catalog Git URLs and inventory gates are recorded in [handover](../../dive-trivia-handover.md). No full fleet rerun or push; that remains operator/main-swarm scope. Historical fleet passes do not accept this new game.

## Future outlook

The final name is Below the Obvious, selected by the operator on 2026-10-21. Expand original answer coverage and fact-check before growing the pool. Battle is phase 2: recommended private Supabase Broadcast with host-authoritative friendly-game protocol, subject to actual service/account/security provisioning, simultaneous-submit/reconnect/hidden-answer tests, real two-client relay proof and 12-client checks. Real multi-device/school WiFi remains unverified. No standing authorization for other additions or auto-publication.
