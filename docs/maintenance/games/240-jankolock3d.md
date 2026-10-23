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

`environment.mjs` is now mounted by `world-scene.mjs` for layered district
architecture and local procedural material maps; see ENVIRONMENT.md. The
shared `character-assets.mjs` validates/caches local GLBs. `game.mjs`, the hero
ranges and systems demo preload their real models; `heroes/hero-model.mjs`
replaces the primitive body factory while preserving existing ability FX.
`systems-view.mjs` mounts the detailed candle trooper, shares its GPU geometry
and isolates per-unit pose/material/candle state. Bodies use named rigid pivots,
not skin/IK/face rigs. Runtime metadata exposes measured model hashes/counts.

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
Environment and character geometry are original code-generated meshes. Four
codex-imagen concept plates preceded the Astra-built fallback GLBs. Five new
self-contained models total 21,486,656 bytes; their source/receipts are beside each
file. Hero counts are 179,388/171,818/170,342/179,556 triangles; trooper 31,730.
Local 512px procedural surfaces/normals and 11 environment PNG maps are original.
Local r186 loader/exporter/geometry/clone addons retain MIT provenance; only
local import paths were remapped. Inspection covers import closure, receipts,
actual decoded assets and regression behavior, not exhaustive human sculpt or
upstream-addon algorithm review. Research URLs are references only; no
reference-game pixels/meshes ship. See CREDITS.md and ENVIRONMENT.md.

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
- Systems resume fixes recall from a friendly base ring outside the hero's fixed
  lane assignment. All six friendly rings now channel; enemy ownership, radius,
  duration and cancellation checks remain. The regression failed before the
  shared-check fix, then passed for both teams without rewriting lane assignment.
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
assertions. Bot regression: eight groups. Systems regression: 18 groups plus
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
with hashes matching the then-current, pre-visual-pass runtime. All A-I named PNGs exist;
older A/B/H/I remain their own qualified historical evidence. See the audit's
COMPLETION.md and per-letter JSON, not the interrupted full-run receipt.
No full-fleet/hardware/reviewer grade or push is inferred.

### Historical Stampead delivery and environment follow-up

This delivery-only receipt predates live integration and the current visual-pass
captures below. It is retained as provenance, not the present loader status.
Committed model `e627cee` is a concept-led original procedural interpretation,
not a photoreal sculpt or visually accepted character. Actual
`models/stampead/model.glb` independently verifies at **5,797,108 bytes**,
**179,388 triangles**, **45 drawables**, **13 materials**, with SHA-256
`f3479144cf4e33eb183b5b8983815740858899463c7a1a749c4420892ef688f3`.
Receipt, decoded GLB counts, topology/material/UV/pivot/bounds checks and the
fresh source build agree. Its builder uses existing local three.js/exporter
only. Source/provenance/rigid-animation limits are in `models/stampead/README.md`.
No receipt field or hash was fabricated or changed during parent verification.

`node Games/Jankolock3D/models/stampead/build.mjs --check` passed without rewriting
assets. An independent local-loader check parsed the actual GLB, cloned all45
meshes with the shared procedural surfaces, and exercised idempotent clone
cleanup. This proves loader compatibility, not live hero integration or visual
quality. No screenshot, animation clearance, likeness or hardware pass is
claimed for this delivery; the model worker needs no further delivery action.

The world architecture already consumes the new environment module. Fresh
`environment-test.mjs` passed: 66,904 instances, 926,466 assembled full-detail
triangles, 280 coarse batches, 41 reusable geometries, and11 original PNG maps
of1,210,564 bytes. It checks dynamic death/Patron retreat, detail cutoff and
cleanup with renderer I/O mocked. These are CPU construction totals, not frame
counts or FPS. `world-test.mjs` again passed491 assertions. The new environment
and ACES/hemisphere lighting need fresh browser/subjective review; earlier A-I
screenshots do not accept these changed runtime bytes.

WORLD.md records that both operator temporary contract files were unavailable
at the latest resumed preflight. Work retains the previously read/pasted
world-only brief; no replacement shared-spec clauses were invented. Disk was
above the normal guard, so the missing temporary copies are not an idle gate.

Inventory refresh was then correctly blocked by another owner's staged
Turretina files. All five model deliveries are now committed; no foreign file
was staged/reset to manufacture a pass. Final inventory still requires all
inspected source changes committed before refresh.

### Systems brief-authorized resume

The operator substituted the systems brief for the missing shared spec. Both
`jank3d-spec.md` and `jank3d-brief-systems.txt` were absent from their supplied
temporary locations; the earlier verbatim systems brief is retained in the
session. No missing ALWAYS/ASK/NEVER clauses were invented. Scope remains the
six requested gameplay systems, with B/C/D/F evidence for independent review.

The one-condition recall fix and regression are documented in SYSTEMS.md.
Fresh checks complete18 systems groups, the600-second scripted lane chain,
both integrated chain directions and8 bot groups. The receipt at
`docs/maintenance/audits/jankolock-3d-qa/systems-resume-evidence.json` records the
current source hashes, commands, missing-contract context and remaining gates.
No new UI, geometry, model, dependency, game, catalog edit or push is included.
Historical screenshots do not establish acceptance of changed world/model bytes.

## Historical integrated procedural visual pass

The four committed concept plates preceded mesh work; no Blender/bpy/sculpt tool
or new dependency was used. All four hero bodies and the trooper now render
from actual verified GLBs, with local 512px surfaces/normals. New model bytes and
triangles are recorded above; including the unchanged supplied portrait there
are six GLBs totaling 24,715,028 bytes. Every file is below 8 MiB. No game/ID was
added, catalog count stays 127 and no publication/push is authorized.

Fresh `visual-pass/` evidence has ten COMPLETE-builder-checks-only receipts:
four E cases, four P cases, A and H. It contains 36 actual 1280x720 captures,
635 recorded HTTP200 responses, zero retained errors and stable runtime hashes.
E records all 16 native ability keys/real FX. P adds all four clean model views,
three native movement-input checks with explicit fixture clock advances and
four labeled concept/model twins. A records three native short walks and full
770m native-E rides with scripted elapsed time, alive/free-mode arrivals, plus
a labeled aerial camera. H is the normal lobby without a fixture query, both
HTML themes, with supplied portrait behind glass and actual selected GLB.

The previous 300s E and 180s P batch timeouts remain in
`visual-pass-before-idle-fix/` and `visual-pass-before-single-hero/`; they are not
completed passes. Single-hero bounded retries completed every case. Continuous
GPU redraw during pause/finished state was removed; each frozen capture asserts
that the real renderer frame counter stays unchanged. This is an idle-work
regression, not an FPS benchmark. The dedicated-profile/CDP advisory recipe was
not exercised. System Chromium, serialized profiles and existing disk guards
remain; no waiver was used.

The [wishlist](../../jank3d-design/MODEL-WISHLIST.md) remains operator-run external
art requests only. Current procedural scores are 5/4/4/5, not photoreal or
reference-quality acceptance. Faces, hands, cloth/hoses, rigid motion and lack
of character LOD remain weaknesses. City facades/recesses/turnouts are real new
geometry, but the broad straight primary corridors, sparse park dressing,
stylized clouds and primitive combat objectives remain visible quality gaps.
Independent review `b91a600` gives A/E/H a QUALIFIED mechanical evidence pass,
not final art/hardware/release acceptance. It verifies all 36 raw PNG hashes,
59 selected source hashes, actual GLB budgets and CPU behavior. JSON configs/kit
receipts and environment PNGs are outside the capture hash selector; that gap
is not retroactively filled. Midway arrival is visually occluded and slide pose
still reads upright. No full native 900m lane walk, final subjective art review,
supported GPU, real handheld, full offline/release smoke or match-fun acceptance
is inferred from these checks.

## Operator dark-default presentation follow-up

Natural UI default is now dark regardless of OS preference. Every HTML entry
sets dark mode before modules; CSS defaults and loading/canvas placeholders are
dark before JavaScript. Existing main/workshop light toggles remain accessible.
Shared tokens cover hero cards, HUD/shop and minimap; no simulation, hero pose,
model, world route, geometry or lighting logic is changed. The proposed slide
pose repair was paused for this order and has not been implemented.

The operator explicitly retains existing A-I receipts across this theme-only
change. Original images, hashes and capture records remain untouched. The model
packet verifier now compares source/runner bytes to recorded `bedb052`, not to
new UI bytes; original model bytes verify through Git and screenshots against
actual files. This is
historical-source verification, not an assertion that current CSS equals old
CSS. Additive `theme-qa.py` checks script-free dark startup on all seven entries,
OS-light/cache-cold initial dark hero selection, HUD/shop/minimap and native
light toggles on desktop/mobile. Source commit `e235109` is exactly
`jank3d: dark-default-ui`. Fresh results under
`docs/maintenance/audits/jankolock-3d-qa/dark-default/`: 12 original screenshots,
241 HTTP200 responses, zero retained errors, 81 current source/resource hashes
stable, seven script-free dark entries and four live cold first-paint checks.
Each context forces OS light preference with empty storage/disabled HTTP cache;
no QA query or gameplay grants. Actual minimap fills switch between dark and
light. Desktop/mobile images were inspected in both modes. UI eight checks,
both integrated 600s chains and the current inventory checker pass. Browser and
loopback server closed. No prior failed receipt is relabeled; no full-catalog
release gate, new game, Blender work or push is implied.

## Separate operator external-assembly integration

The operator supplied five original dot `rigid_v2` GLBs. Four bodies now replace
the procedural files exactly; the new deployed stapler replaces the existing
ability's primitive tripod. Their manifests, linear palettes, real rigid-node
guides and regenerated actual byte/SHA/count receipts are retained per model.
Gooey's delivered folder name maps to `models/gooey`; its ten-node blob rig is
intentional. The other movable counts are 17/23/20; no dummy joints or extra
triangles were invented to meet the earlier procedural targets.

Actual hero triangles/bytes: Stampead 25,596/948,632; Turretina 22,416/1,022,124;
Snipeoff 19,160/818,532; Gooey 48,760/1,242,716. Prop 3,248/161,804. Four heroes total
4,032,004 bytes; five delivery GLBs total 4,193,808. With unchanged trooper/portrait,
seven live GLBs total 9,014,644 bytes. Model drawables are 69/81/75/30/16; smaller
files do not prove better FPS. Current source is inspected through actual
GLB decoding, finite/index/normal/bounds/axis/pivot checks and authored adapter
review, not independent creation-history or `.blend` source inspection.

`character-assets.mjs` verifies GLB and sidecar hashes, manifests, actual counts,
units, palette indices/names and rig hierarchy/pivots. Linear colors retain
supplied roughness/metalness with per-instance material copies. Existing 512px
surfaces/normals use closest families; fourteen missing UVs are supplied at
runtime without touching the delivered bytes. `hero-model.mjs` maps real node
names with rest-relative limits, preserving two-handed grips and root placement.
The deployed prop aims its own yaw/pitch bearing and recoils; tracer origin is
its cosmetic muzzle while authority/ranges/damage origins remain unchanged.
Gameplay, hitboxes, world export, dark-default/light toggle and portrait are
unchanged. Slides/jumps remain conservative, with no skin, IK or planted feet.

External provenance says Blender-authored by the operator's dot, original art;
no repository agent launched Blender/bpy. No `.blend` file was delivered despite
its declared path. Originality is operator-declared, not independently proven.
Old generators/results remain at `bf215f0` in Git, not discarded or overwritten
in history. Current reproducible integrity command is
`node Games/Jankolock3D/models/import-external.mjs --check`; old build.mjs files
still describe the original procedural fallbacks.

Fresh structural/rig/material/ability/lifecycle checks pass, including 2,540
poses. New `external-model-qa.py` serves the actual fallback devhero files from
Git `bf215f0` and current files under separate loopback path prefixes, then
captures real before/after views with native walks and Turretina deployment.
No screenshot substitution, fake camera or gameplay state grant is used.
The first bounded gate completed: four before/after pairs, 11 native screenshots,
361 HTTP200 responses, zero retained errors and 100 stable source/resource hashes.
The before namespace executed actual Git fallback files, not substituted images.
New views exercised native walks for all four heroes, the real deployed stapler,
and normal integrated lobby/HUD with five bots. Actual pairs/prop/lobby/HUD were
inspected. Source integration is `f73a500` (`jank3d: external-hero-models`);
evidence and the six-line inventory update are committed in `40ba135`.

Input custody records 25 exact-copy files totaling 4,433,562 bytes, including
five rig aliases equal to their retained canonical rig files. Cached-content
and constructed-runtime-path audits found no required raw-drop consumer;
optional offline `--ingest` is distinct from normal runtime/check paths.
The explicitly authorized `external-art/` deletion completed after render/copy
verification. Both canonical audit and 2,540-pose tests passed without the raw
directory. Fallback GLBs/source stay recoverable in Git `bf215f0`; trooper and
portrait are unchanged. See the [external integration report](../audits/jankolock-3d-qa/external-models/README.md).

Disk recovery allowed only final docs/index work under a bounded 10 MB waiver,
`TMPDIR=/dev/shm`, stop below 1,800,000,000 free bytes, no assets/browser retries
or push. Cleanup/evidence commits were not repeated. Model/source checks are
not art/40FPS/hardware/full-release acceptance; 127 catalog entries remain.

## Terrain safety and scene/UI maintenance follow-up

Shared collision milestone `6c58203` blocks lateral entry from the sewer/plaza
into higher solid terrain; the floor callback no longer silently loses that
boundary. Controller and traveler clamp to the existing 448m limit. Invalid
motion or feet below -32m recover to the last safe grounded position (initial
controller fallback or world start before one exists), without filling the
legitimate -10m sewer or -6m plaza. A subsequent screenshot exposed the same
above-eye terrain being ignored by the shoulder-camera sweep; the camera now
rejects it rather than exposing the void. Both body and camera reserve radius
clearance at steep terrain edges while retaining normal ramp stepping.
Controller 1,396 assertions and world
505 assertions pass in fresh Node reruns. These are fixtures, not native play.

The match shell removes the repeated top resource-health readout in favor of
the existing health bar, hides unused inventory cells/panel, shortens lobby copy,
compacts ability buttons and moves the repeated map legend into Controls. Map,
objectives, cooldowns, input buttons, loading/error states and accessible canvas
labels remain. The parallel HUD/input follow-up owns numeric health presentation
and has its own source/verification section below.

Scenery uses the existing local architectural maps, plus three original 128px
in-memory aggregate textures for asphalt, concrete and earth. World-scaled UVs,
three merged static surface draws, less opposing light fill, terrain retaining
faces, a visible outer curb and building base/roof recesses improve definition.
The old three faceted cloud props are removed and the sun matches the key light.
Plaza paving previously floated at -3m; it now rests on its -6m floor. Existing
model/texture file bytes, immutable map data and routes are untouched. See
[environment details](../../../Games/Jankolock3D/ENVIRONMENT.md). CPU environment
checks pass at 67,028 instances / 927,954 assembled triangles / 280 coarse batches;
these are construction totals, not per-frame FPS or hardware acceptance.

`scenery-qa.py` is a bounded system-Chromium check with no external requests. The
first fixed-900ms native probe failed without observed movement; its receipt and
five captures are retained. The retry waits for measured simulation advancement:
nine captures, both native keyboard terrain-edge probes, 70 responses and zero
recorded errors. Desktop/mobile-width HUDs were inspected in dark/light themes;
scene placements are explicitly loopback API fixtures, not native route proof.
That nine-capture result predates the last camera sweep/retaining alignment and
parallel fixed-mobile-HUD repair. Two later centre-only captures passed the
mechanical assertions but still showed a void sliver; subjective review rejected
those images. The final radius-aware retry passes two native-keyboard edge
probes, two captures, 70 responses and zero errors, with browser/server closed.
Both images were inspected: terrain walls now occlude the void. See the
[pinned receipts and final captures](../audits/jankolock-3d-qa/scenery-maintenance/README.md).
The broader nine-shot review remains historical for its exact source hashes;
images are not silently relabeled. A separate mobile-HUD scroll capture is
recorded in the HUD owner's follow-up below.

The block grid, broad roads, primitive combat objectives, rigid vegetation,
uncollidable dressing and lack of scene contact shadows remain visual limits.
This pass is a lightweight material/lighting/definition improvement, not a
photorealistic or supported-hardware acceptance claim. Integration still fails
only its stale catalog-count assertion after the previously listed chain checks;
no assertion/filter was weakened. No full-fleet gate, new game or push occurred.

## Operator health, input and shot-feedback follow-up

Built on realism worker milestones `6c58203` (fall-through) and `ef5cd06` (UI
trim), without editing their terrain, scenery, structures or catalog. The existing
health progress element is moved to a dedicated high-contrast top-left HUD with
numeric current/max HP and green (>50%), amber (>25%) and red states. It remains
visible during active play in both themes; mobile width leaves the minimap clear.
The match status moves below it. Values are finite/clamped and the native progress
label exposes the numbers/state without a live announcement every update.

Mouse primary press and the touch Fire button now attempt the shot synchronously,
not on click/release or the next frame. The shared firing boundary refreshes
camera aim, targets and item modifiers and rejects lobby/pause/hidden/dead/winner,
pregame, shop and modal states. Runtime ammo/reload/cooldown remain authoritative;
there is no pending-shot queue. Held-fire timers advance before retrying in the
update loop. Releasing aim or a different touch no longer cancels held Fire.
Keyboard action edges already ignore key repeats and are unchanged.

Accepted basic shots use the existing Three.js FX manager: at most five meshes
sharing low-poly geometry (flash, tracer, three contact sparks), 120ms lifetime, no light,
new texture, model or network load. Cosmetic emitters follow each delivered
weapon/hand node; covered damage rays and HP authority are unchanged. A six-degree
rest-relative torso kick decays over 120ms, respecting rig limits, root placement
and two-handed grips. No camera shake or new animation loop is introduced.

Checks: `node Games/Jankolock3D/combat-input-test.mjs` exercises the actual host
callbacks in a VM with no RAF, including synchronous mouse/touch fire, cooldown,
no queued tap, cancellation and state guards. UI self-test now has 14 checks,
including HP thresholds and invalid values. Hero runtime/visual checks pass;
external-rig regression passes 2,540 poses with shot recoil included. Bot eight
groups and systems 18 groups plus the scripted match pass. These are CPU/VM
checks, not phone FPS or native hardware acceptance. Integration regression runs
both scripted chains and portrait checks, then fails its pre-existing hardcoded
catalog assertion: actual 128 entries, expected 127. No catalog edit or test
weakening is included. Full-fleet smoke, push and publication remain held.

Desktop/mobile health HUD images in both themes from the scenery worker were
reviewed: readable numbers, bar and map separation. A follow-up makes the health
HUD viewport-fixed, measuring the header with one disposable ResizeObserver so
it stays visible while scrolling down to phone Fire controls. The sole added
390x844 screenshot (`jankolock-hud-scroll.png`, RAM-only) confirms HP 700/700 and
unchanged HUD rectangle x8/y187/224x65.5 after scrolling 344px, with zero recorded
console/page errors. This successful layout probe uses an explicitly frozen
loopback fixture, not live-frame/input performance evidence. The preceding live
touch Close probe timed out before any screenshot; browser/server closed on both
attempts. No phone FPS or live-touch acceptance is inferred. The focused input
check also pins the viewport-fixed CSS against regression.

## Future outlook

Independent stable-source A-I review and mockup comparison, human full-match
balance/pacing, neutral/boss/rejuvenator completion and supported hardware/touch
verification. Keep incomplete mechanics and fixture qualifications visible.
Registration is already the existing-ID rewrite; publication/push remain held.
