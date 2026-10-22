<!-- maintenance-game: Games/Jankolock3D -->
# JANKOLOCK maintenance manual

## Identity and status

Existing catalog ID 240 now launches `Games/Jankolock3D/index.html`, replacing the
operator-rejected 2D entry without deleting its tree or adding a game/ID. Original
in-house office-parody 3D MOBA-shooter; not an ingested port or affiliated title.
127 catalog entries remain. Integration and catalog rewrite are authorized;
push/publication are not. See the [integration guide](../../../Games/Jankolock3D/INTEGRATION.md).
The former [unregistered guide](unregistered-jankolock3d.md) retains lane-team
history; [legacy game](unregistered-jankolock.md) documents the retained 2D tree.
Historical PASS receipts are not current full-game acceptance.

## Implementation map

`index.html` -> `game.mjs`, `integration.css` and `integration-ui.mjs`, using
`world-data.mjs`, `world-scene.mjs`, `traversal.mjs`, `systems.mjs`, existing
`systems-ui`/CSS/actor layer, `heroes/` controller/runtime/visuals and `bots.mjs`.
One renderer/scene/camera/RAF. Shared immutable world data matches the tracked
`docs/jank3d-spawns.json`; 42 source markers yield 38 simulated objectives with
one shared Patron per team. `match-world.mjs` derives feet-height waypoints at
real ramp edges so troopers follow Midway's bridge deck, not its underside,
without changing the immutable exported world. Dynamic groups sync HP outcome/position,
not an unrelated decorative world layered over gameplay.

Inspected authored integration, bot, hero-intent adapter, movement repairs,
portrait loader/optimizer/config/receipt, UI and focused regressions. Lane teams
provide deeper module receipts in WORLD.md, SYSTEMS.md and heroes/HEROES.md.
Vendor inspection is byte equality/import closure/license/syntax, not a full
human review of upstream three.js. Prior isolated harnesses remain available.

## Gameplay and controls

One human plus two allies versus three enemy bots. Three original lanes,
25-second four-trooper squads per team/lane after 30-second pregame, floating
shootable secure/deny souls and radius-attracted ground souls. Souls also level
heroes. Shop at base/death, tiers 800/1600/3200/6400, six slots plus Walker-earned
flex slots; actual passive/active systems effects, not decorative purchases.
Guardians -> Walkers -> both base guards -> both shrines per lane -> all six
shrines -> shared Patron P1 retreat -> P2 death. Either team's P2 death ends play.

Four original selectable heroes with distinct four-ability kits. WASD movement,
mouse/drag/arrows look, LMB fire/RMB aim, Ctrl sprint, Shift dash, Space double
jump, C slide/free slide ammo, Q melee, F parry, R reload, 1-4 abilities, E world
interaction, B shop, held X at own retreat ring. Pause/resume/restart and touch
buttons are present. Ziplines/teleport/vents/rope reuse world traversal. Bots
follow lane waves, use visible-target abilities, buy passive items, collect
souls and retreat for base healing. Minimap tracks lanes, structures and heroes.

## State and persistence

All match state is memory-only. Systems owns HP/economy/statuses/objective locks;
hero runtime owns kit ammo/cooldowns; controller owns motion; world traveler
owns traversal and collected/broken crate IDs. Runtime intents scale once in
systems. Configured-kit orb shots do not spend a second magazine. Input clears
on blur/hidden; hidden time is discarded. One loop is disposed on pagehide.
Theme is presentation-only; no accounts, saves, sockets, backend, analytics or
runtime third-party loads. Portrait SHA verification uses loopback/HTTPS crypto.
Normal `window.jank3dSnapshot()` is observational. Explicit `?qa=` policies load
only on loopback, labeled as scripted fixtures with no HP/lock/winner assignments.

## Dependencies and provenance

Local three.js r186 core/module and intact MIT notice match the staging package
byte-for-byte. Fonts are existing local Bungee/Atkinson with their OFL notices.
All geometry/characters are original primitives. Mechanics-only research URLs
are recorded in WORLD.md/SYSTEMS.md/HEROES.md; no reference-game assets imported.

Approved in-house supplied-photo relief derivative: 3,228,372 bytes, 124,512
triangles, SHA-256 `8463eee8276187cacaba912d9540279ad1bb338aa382e9448632aa9a33892514`.
Original 10,972,672-byte external supplied-original remains unchanged. Deterministic
1.5mm clustering, real source/derived hashes and measured centroid displacement
are in CREDITS.md/portrait-receipt.json. This is a shallow photo-derived relief,
not a full head scan. Loader verifies config/bytes/SHA before mounting behind
glass in the shared-scene room. No absolute machine path is part of runtime data.

## Audit findings

- Integration closes the missing shared scene, dynamic objective rendering,
  systems-owned kit ranges/healing/statuses, remote FX origins, ramp slab/camera
  collision and five-bot boundaries. Runtime ammo/Overtime are not double-applied.
- Recall/respawn events reconcile valid teleports immediately; active-item dash
  requests remain collision-resolved. Ctrl-held movement registers normally.
- World camps/Mid-Boss/rejuvenator and crate economy rewards remain incomplete;
  markers/traversal do not establish those mechanics. Structures have combat
  hit bounds, not full movement colliders. Bot navigation is lane-only.
- 10-15 minute pacing, fun/balance, target GPU and real handheld ergonomics are
  unverified. Station coverage is 770m, not 900m edge-to-edge. Native exhaustive
  lane walking is not proved by an aerial screenshot or API clock advancement.
- Independent portrait review is H QUALIFIED on its pinned image/source bytes;
  later integration changes require a stable final run. No full-game grade is
  inferred from it. Software screenshots are not supported-hardware acceptance.

## Safe iteration

Keep locks/rewards/damage in systems, kit ammo/timers in runtime, and collision in
shared motion code. Trace both standalone and integrated callers. Do not assign
HP/winner/locks to make QA green. Preserve supplied original and derived integrity
pins; rerun the deterministic optimizer and real hash/count checks after changes.
Preserve historical failed/interrupted receipts and distinguish native input
from seeded/repositioned/API-clock fixtures. Do not edit bundled portal assets,
protected games, disabled proxies, vendor bytes or unrelated catalog entries.
Use explicit paths, system Chromium, isolated bounded loopback servers, serialized
browser slots and the disk guard before asset writes. No installs/new runtime deps.

## Verification

Run `node Games/Jankolock3D/integration-test.mjs` and the commands in INTEGRATION.md.
Current integration regression passes both 600-second chain directions with six
configured heroes, fractional start clock, real bridge-height waypoints,
19 falls, separate Patron phases,
orb single-accounting and portrait integrity/corruption checks. Catalog parses:
127 unique IDs, required schema fields; only entry240 differs from pre-integration.
World regression: 491 assertions. Controller regression after ramp repair: 1,365
assertions. Bot regression: eight groups. Systems regression: 17 groups plus
600-second script. Hero runtime/visual and UI self-checks pass. Syntax and authored
diff checks pass; immutable vendor's historical whitespace note is retained.

Browser command: `TMPDIR=/dev/shm SMOKE_PORT=8947 timeout --signal=TERM
--kill-after=15s 420s python3 -B Games/Jankolock3D/integration-qa.py`.
Evidence is under `docs/maintenance/audits/jankolock-3d-qa/integration/`.
The JSON identifies actual native interactions versus scripted setup, pixel
variance, source hashes, request status/errors and partial failures. Attempts
1/2 failed; later runs were interrupted by user messages. Do not read a partial
RUNNING receipt or prior screenshots as a completed pass. Final run/grades are
recorded separately after the shared browser slot is released.

No full-fleet smoke or push ran. The unchanged complete registered-game browser
gate remains mandatory before any separately authorized future push. Maintenance
checker must run after inspected source commits and inventory reconciliation.

### Short letter follow-up

The bounded [letter runner](../../../Games/Jankolock3D/LETTER-QA.md) avoids rerunning
A/B/H/I before every missing-letter capture. C completed with four nonblank shots,
a native secure, actual ground pickup and API deny (0 -> 120 souls), 26 HTTP200
responses and zero recorded errors. D/G completed with four shots, 52 HTTP200
responses and zero errors: actual 19 falls, P2 at570, victory at590, clock600,
and a symmetric Defeat. D's timeline is a labeled QA overlay of actual systems
events, not a fabricated game HUD. Both reports pin stable runtime bytes.

E now captures all sixteen native ability keys/real frozen FX across all four
heroes in the integrated world, plus a labeled contact sheet. F's retry captures
the shop, purchases at all four tiers, +200 max HP, a collision-resolved 10m dash
and active burst; its approved-mockup/actual-shop twin is retained. The first
active-selector failure and its exact images remain archived. Completed C-G
runs total 29 full-size captures, 208 HTTP200 responses and zero recorded errors,
with hashes matching current runtime bytes. All A-I named PNGs now exist;
older A/B/H/I remain their own qualified historical evidence. See the audit's
COMPLETION.md and per-letter JSON, not the interrupted full-run receipt.
No full-fleet/hardware/reviewer grade or push is inferred.

## Future outlook

Independent stable-source A-I review and mockup comparison, human full-match
balance/pacing, neutral/boss/rejuvenator completion and supported hardware/touch
verification. Keep incomplete mechanics and fixture qualifications visible.
Registration is already the existing-ID rewrite; publication/push remain held.
