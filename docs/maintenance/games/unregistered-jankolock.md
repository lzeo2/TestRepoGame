<!-- maintenance-game: Games/Jankolock -->
# Retained legacy JANKOLOCK maintenance manual

## Identity and status

Operator-authorized original browser genre translation, not an ingested or
Valve-affiliated port. Historically registered as catalog ID240, title JANKOLOCK,
action category, entry `Games/Jankolock/index.html`. Integration commit `d9088a2`
moves that existing ID to `Games/Jankolock3D/index.html`; this legacy tree is now
unregistered and retained, not deleted. This page describes the old game.
Solo player plus ally bot versus two rival
bots. Canvas2.5D core, separate optional three.js trophy lobby. No multiplayer.
Research/design history is preserved; the old sliding-puzzle recommendation is
superseded by the operator's Valve-reference resolution. See
[provenance](../../jankolock-provenance.md) and [build receipt](../../jankolock-release.md).
Registration and targeted smoke do not grant push/publication approval.

The operator rejected this 2D implementation for the subsequent 3D rebuild.
The replacement is documented in the current
[JANKOLOCK 3D manual](240-jankolock3d.md); its earlier development history remains
in [the historical unregistered guide](unregistered-jankolock3d.md). Its checks do not accept this old
game or certify the complete rebuilt game. The older full-size portrait below
remains untouched; the replacement uses a separately approved optimized relief.

## Implementation map

`index.html` -> `ui.js` -> `data.js`/`engine.js`, `style.css` -> shared local fonts.
Engine owns mutable state in a WeakMap keyed by a frozen handle. Public APIs:
createMatch/startMatch/step/selectHero/setPaused/advanceRound/chooseItem/restart/
snapshot. Snapshot is detached; UI's only global diagnostic,
`window.jankolockSnapshot()`, deep-freezes its observation. No setters or QA grants.
Data exports frozen ARENA/HEROES/ITEMS/RULES, validated statsFor/draftOffers/botItem.

UI owns one fixed-step RAF, keyboard/pointer/touch intent, Canvas projection,
HUD/native panels, original WebAudio and settings. Confirmed `hit` events originate
in shared damageActor (bullets and slam), include target/position, actual HP loss
and shield absorption, and use the existing 64-event tail. Immunity, cover and
decoys do not produce actor-hit confirmation. Projection is
`x=40+x+(y-300)*.07`, `y=80+y*.9`; pointer aiming inverts it. Actors, bullets,
cover, abilities and bots use engine collision, not sprite outlines. Sweep/LOS
share rectHit; moveActor handles body/dash/knockback contacts; tickBullets handles
cover-before-target impact; tickCapture scores after uncontested warm-up.

Hall lazily imports portrait.js on explicit entry, then config and local vendor
only if enabled. Runtime exact size/SHA-256 verification precedes GLTFLoader.
Context loss is terminal through each asynchronous continuation; late parsed
resources are disposed. Back/abort/pagehide dispose scene/renderer/listeners/RAF.
UI shell heading/Back are hidden once the module owns those controls.
Human review covered all authored runtime/tests and actual patches. Vendor
review is exact-donor bytes/import/header/MIT/syntax, not 59k-line human review.

## Gameplay and controls

Three original heroes: Tin Courier (dash/cone burst), Wobble Postmaster
(shield/radial slam), Rattle Clerk (decoy/fan). Two abilities each; Q/E labels
and cooldowns are factual. 960x600 ground-plane arena, four cover blocks, central
radius70 ring. Base HP100, speed150, basic damage14, cooldown0.24s. Bots have
seeded reaction/aim error and fixed-corner navigation, not hidden damage boosts.

Uncontested occupancy warms for1s then scores2 influence/s; kill adds4. First40
or higher influence at60s wins. Tied timeout enters sudden death; next kill or
capture score decides. Death respawns after3s with1s protection canceled by
shooting. First3 round wins wins the best-of5 match. Between nonfinal rounds,
Continue offers3 distinct items; one pick applies next round and persists,
maximum2 stacks. Each bot also gets one item. Reset clears the match to hero lobby.

WASD/arrows move; pointer aims/primary button fires; IJKL/Space keyboard aim/fire;
Q/E abilities; P/Escape pauses. Touch has separate movement and aim/fire pads
plus native ability buttons. Cancel/lost capture clears input. Blur/hidden page
pauses. The lobby exposes a short control primer before Start. During play the
existing status line explains empty/held/contested rings, overtime, death and
spawn protection. Pause focuses Resume. Short house-styled labels distinguish
outgoing hits, incoming damage and a stronger kill confirmation; a two-tone X
marks the confirmed impact location, not the current aim or a guessed hit.
Optional synthesized hit/hurt/capture/respawn cues reuse the existing audio owner;
sound remains off by default. No camera shake, aiming lag, firing cadence,
health-bar or shot-animation change. Trophy hall has native Back, WASD/arrows and touch movement buttons;
pawn bumps a cylinder, never collides with the dense GLB. Optional smash gag
was not implemented; no such feature is claimed.

## State and persistence

`jankolock-settings` localStorage contains theme light/dark, mute boolean and
cosmetic motion boolean only. Malformed or denied reads fall back; write errors
leave play usable. No saved match, cloud/account, analytics, network multiplayer,
service worker or backend. Default sound/motion off. Reduced motion overrides
wobble. Restart creates a new handle, clears inventory/scores/events/projectiles,
releases input and closes audio/hall. No migration of the abandoned puzzle design.

## Dependencies and provenance

[Game notices](../../../Games/Jankolock/CREDITS.md), [portrait receipt](../../../Games/Jankolock/assets/portrait-receipt.json).
Operator-supplied in-house photo3d portrait generated2026-10-20, unchanged hash
`abe1b2ee07038d6926813542a2127bca06cb19564f535dd49c593ea60c199fc9`,
10,972,672 bytes/421,968 triangles. Lobby only, no decimation. Supplier's
photorealistic-quality FAIL remains; user-requested use is the recorded source
permission, not independent likeness adjudication.

Local Circuit Ward three.js r160 donor closure1,414,498 bytes with full MIT,
upstream pin `d04539a76736ff500cae883d6a38b3dd8643c548`; no donor edits/checkouts.
Shared local Bungee/Atkinson fonts retain OFL. No third-party runtime requests.
No reference-game hero names/art/text/audio/code/marks imported. A potential
generic name overlap was removed: original roster name is Wobble Postmaster,
internalID postmaster. Historical review still records the superseded label.

## Audit findings

- **Closed M1:** portrait context loss during an awaited asset/digest/parse could
  resurrect ready without renderer. stopped() now guards all awaits, disposes
  late trees; four VM ordering regressions and native software-browser races pass.
- **Low:** byte-identical vendor core retains donor whitespace warning at46517.
  Authored whitespace is clean; full diff is not advertised as warning-free.
- **Limit:** full two-round native proof uses Postmaster. Other kits have unit
  fixtures and all-hero simulation, not equivalent full native campaigns.
- **Limit:** 320px layout has usable44px controls/readable HUD but small arena
  characters/labels. Desktop/landscape recommended for aiming precision.
- **Hold:** supported target GPU/performance and real handheld ergonomics unverified.
  Software render is not hardware acceptance; portrait is approximate, not photoreal.

## Safe iteration

Trace all callers before changing engine/data exports, hero IDs or collision.
Keep movement/LOS/projectiles on shared geometry, no sprite-driven hitboxes or
browser QA state grants. Fixture module instrumentation is confined to the
Node test copy, never production. Add regressions to the existing small scripts.
Keep unavailable/disposed terminal; do not abort Back's listener controller
merely to stop one pending load. Preserve exact GLB/vendor bytes and notices.
No STUN/TURN/signaling or proxy changes; online remains separately scoped phase2.
Keep sparse selection unchanged, explicit-path staging, floor2GiB. Test profiles/
screenshots in RAM, Chromium `/usr/bin/chromium`, isolated ports>=8910, bounded
servers with finally shutdown. Never stage sibling Wings/Character AI or audits.

## Verification

Run `node scripts/test_jankolock_data.mjs`,
`node scripts/test_jankolock_engine.mjs`,
`python3 -B scripts/test_jankolock_browser.py --port 8916`, and
`python3 -B scripts/test_jankolock_portrait.py --preview --browser`.
Browser runner uses real input/no time or state grants, observes two round
wins/capture/combat/death/respawn, drafts one of3 and verifies120HP after Envelope,
then resets. Separate320px simultaneous touch/cancel/Q/pause/resume passes.
Portrait validates decoded accessors/index bounds,6 malformed cases,4 VM await
races, CPU full-triangle preview and SwiftShader GLTF load/scene/bump/Back tests.
Actual outputs, screenshot review, targeted smoke and outstanding maintenance
checker guard are recorded in the [current build receipt](../../jankolock-release.md).

The [Wings comparison and integration receipt](../../jankolock-wings-comparison.md)
records the current bounded follow-up, exact path distinction from Jankolock3D,
worker coordination, native feedback assertions, reviewed screenshots and remaining
hardware/audio-listening/full-fleet limits. No acceptance of the 3D replacement is
implied. The feedback regression extends the existing engine/browser checks above.

Coverage checker requires all source committed and global Games tree clean.
Refresh inventory only after the inspected source commit; confirm other records
unchanged. Do not reset/stage sibling work or weaken the checker. No full fleet
smoke is run in this task.

## Future outlook

Balance with human play and profile real target hardware. Consider a mobile
camera/layout improvement only from play feedback. Online phase2 requires its
own host authority/draft/disconnect/validation contract and native device proof;
manual WebRTC precedent is not an implemented feature. No new game, ID, push,
publication or portrait optimization is authorized by this outlook.
