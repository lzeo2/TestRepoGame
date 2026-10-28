<!-- maintenance-game: Games/Jankolock3D -->
# JANKOLOCK maintenance manual

## Identity and status

**Packaging hotfix (2026-10-27):** release `532c9ee0` omitted two committed
runtime inputs fetched by `game.mjs`, causing `Hero definitions HTTP 404` before
lobby setup. Exact `c19405ab` copies of `docs/jank3d-ribbon-seraph-kit.json` and
`docs/jank3d-trio-kits.json` are restored; no game code/model/QA draft changed.
`node scripts/check_jank_boot_dependencies.mjs` validates only the three literal
boot definitions, eight unique four-slot native kits and the actual HeroRuntime
ability IDs/required fields. No recursive dependency scanner is included. The
same check fails against `532c9ee0` on the missing JSON. This fixes a packaging omission,
not hardware or WebGL. Native/Prism Warden/expansion acceptance remains held.

**Known-failure release, explicitly authorized 2026-10-27:** committed snapshot
`c19405ab` only; unfinished dirty native QA repairs are excluded. The retained
diagnostic draft fails its 60,000-byte guard (79,317 bytes); released committed
QA files are the distinct 59,999-byte pair. Prism Warden native failures remain,
expansion is incomplete and no forty-hero/native certification is made. Fresh
expansion/full-fleet native acceptance was not run for this release.
[Exact scope, pins and holds](../../known-failure-release-20261027.md) supersede
historical no-publication permission statements below, not failed evidence.

Existing catalog ID 240 now launches `Games/Jankolock3D/index.html`, replacing the
operator-rejected 2D entry without deleting its tree or adding a game/ID. Original
in-house office-parody 3D MOBA-shooter; not an ingested port or affiliated title.
129 catalog entries currently parse; this follow-up adds no game/ID. Integration and catalog rewrite are authorized;
push/publication are not. See the [integration guide](../../../Games/Jankolock3D/INTEGRATION.md).
The former [unregistered guide](unregistered-jankolock3d.md) retains lane-team
history; [legacy game](unregistered-jankolock.md) documents the retained 2D tree.
Historical PASS receipts are not current full-game acceptance.
Latest supplied-hero native result: **Ribbon Seraph, Spoollash and Checkmate
Regent pass; Prism Warden remains held**. See the follow-up execution cycle
below for genuine captures, exact scope and the unresolved capture blocker.

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

Eight selectable heroes: the original four, supplied Ribbon Seraph and the
supplied Spoollash, Checkmate Regent and Prism Warden. The latter four use
explicit native-engine four-ability adaptations (see follow-ups below). WASD movement,
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
129 unique integer IDs, required schema fields/types and tracked URLs; entry240
still targets the integrated page. No catalog bytes change in the J5 follow-up.
World regression: 491 assertions. Controller regression after ramp repair: 1,365
assertions. Bot regression: nine groups, including inactive tether cleanup.
Systems regression: 18 groups plus
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

## Heroes restored-contract continuation

The hero lane read the restored repository-root contract and verified MD5
`aaa75071e498f6ca977db0e06fad2641` before resuming; earlier missing temporary
spec/brief copies were not replaced with invented clauses. No Blender, new
mesh, rig-pose change, UI restyle, kit rebalance or dependency was introduced.

The active Snipeoff reveal now tracks current live enemy records and positions,
including new targets and death/removal/team/range changes. It reuses cage
geometry/materials and retains the original six-second lifetime, cooldown,
cover-blocked shots and systems-owned damage. The shared runtime fix serves
both integrated/bot target replacement and persistent range dummies. The Node
regression verifies membership, replacement-position behavior, reuse, expiry,
cleanup and unchanged health; direct-point FX callers remain compatible.

The current hero runner preserves older captures by writing `heroes-resume/`
under the existing audit directory. Fresh output records four entry HTTP200s,
37 native screenshots, 24 observations, 270 total HTTP200 responses, zero
retained errors and 106 stable source/resource hashes. It includes all sixteen
abilities, pointer lock/aim, dash/double jump/slide/free ammo, wall clamp, mobile
held/released touch, and native reveal across dummy death/respawn/expiry. Two
labeled mockup twins and a contact sheet bring the packet to 40 PNGs. Images
were inspected; mobile retains native 390px layout. Source hashes and native
image SHA/variance are recorded, with explicit COMPLETE/FAILED status.

This is current isolated E evidence, not builder grading or a replacement for
independent integrated A-I review. The supplied rigid slide pose still reads
upright; real hardware, handheld ergonomics, full matches and full-fleet release
gates remain held. Historical art/letter/model receipts are not overwritten.
See [hero API/receipt](../../../Games/Jankolock3D/heroes/HEROES.md) and
[resume packet](../audits/jankolock-3d-qa/heroes-resume/README.md).

## Approved portrait audit-directory follow-up

The dedicated portrait runner now writes only to the approved maintenance audit
path, preserving its historical game-path SKIP receipt. A broad process-search
false-positive risk was removed: actual Chromium processes and Playwright driver
commands block the gate; shell argument text and zombie processes do not. The
small `portrait-qa-test.py` regression passes without launching a browser.

Fresh `portrait-resume/` evidence records one browser attempt, two normal-lobby
1280x720 images in actual dark/light themes, one labeled unscaled crop, 69 HTTP200
responses, zero retained errors and 64 stable runtime/config/model hashes.
The earlier zero-attempt preflight SKIP remains in
`portrait-resume-preflight-skip/`. Saved images show the relief visibly inside
its display frame without menu occlusion. It remains a soft, shallow supplied
photo relief, not scan/likeness/glass-realism acceptance. Lobby/no-fixture state,
portrait metadata and byte/SHA pins passed; browser/server cleanup was verified.
This is fresh builder H evidence, not a new independent grade, whole-resource
hash audit, hardware/full-game/release pass or push. Runtime/models/catalog are
unchanged. See [portrait receipt](../../../Games/Jankolock3D/PORTRAIT-QA.md).

## Optimized Ribbon Seraph follow-up

Current source was compared against the inventory before edits: Jankolock3D,
Citisten3D, Foldwild, legacy Jankolock and Wings already had stale tree pins.
Only this game's inventory row is reconciled here; other owners' rows are not
blindly refreshed. Earlier manual counts and render receipts remain historical.
At this Ribbon-only milestone, trio files from `fc116792` were present but not
registered in the hero loader. Their subsequent integration is documented below;
this historical Ribbon receipt does not accept their gameplay. Monk remains manifest-only: the newly supplied
archive contains no Monk model, regardless of START_HERE's duo label.

`models/ribbon-seraph/` now contains exact clean model/rig/palette bytes plus an
independent receipt and [custody/kit report](../../../Games/Jankolock3D/models/ribbon-seraph/README.md).
Only 3,416,831 supplied bytes were extracted. No LOD without a consumer, optional
FX, Blend, PDF, render or archive code was ingested/executed. Actual GLB hash is
`fd7fdb83aa53d16e4d677360dc78a62c95b000336dede7d4d1d497c69a1fd702`:
3,395,656 bytes, 17,888 triangles, 23 glTF meshes / 36 drawable primitives,
six materials, 18 embedded PNGs <=512px and 17 rigid controls. Originality is
operator/supplier-declared, not independently proven. The existing manifest is
unchanged; its file list describes the external delivery, not public file presence.

`character-assets.mjs` now adapts this particular manifest and semantic palette,
checks variant/sidecar hashes and retains authored PBR maps instead of replacing
them with procedural surfaces. `hero-model.mjs` clamps core/wing/spool/trail poses
to the delivered rig, applies .73 visual scale (~1.8m crown) and supplies a tested
cosmetic front emitter. Standard capsule, target volume, covered damage origin,
movement and systems authority remain unchanged. No flight or mesh collision.
`game.mjs` adds its preload and separate `docs/jank3d-ribbon-seraph-kit.json`;
the UI creates a real selectable card per loaded kit rather than rejecting a
fifth hero. Start configures that selected kit, not merely a decorative GLB.

The proposed archive kit is not supported as-is (missing ability IDs, non-melee
channel, uninterpreted delivery/effect objects). The explicit native adaptation
uses hitscan Typebar, melee Selvage Cut, damaging Catchline tether, non-invulnerable
Carriage Return speed buff, live through-cover Carbon Witness reveal, and an
instant covered Full Width cone. The report lists each difference from proposed
projectiles/windups/cone-sampled reveal/shared cast budgets; no parity claim is
made. Original four/trio kit definitions and hero-runtime/systems logic are untouched.

Fresh Node checks: Ribbon Seraph real GLB/hash/PNG streams/PBR, clone isolation,
420 bounded poses, scale/emitter, systems-accepted weapon/melee/four casts,
cooldowns/cover/linked slow/speed cleanup, normal collision/reset/disposal pass.
Bitmap creation is mocked; actual game interaction, browser image decoding,
rendering, native lobby selection/input, art quality, target hardware and balance
are **not verified**. Existing runtime (16 casts), visual (16 kit + 7 generic FX),
external rig (2,540 poses), original asset importer (five models), UI (14 checks),
bots (eight groups) and controller (1,396 assertions) checks pass. Syntax and
`git diff --check` pass. Catalog independently validates 129 unique IDs/schema
and tracked URLs, with no catalog edit or new game.

The unchanged integration test completes both 600s chains, orb accounting and
portrait integrity, then fails its pre-existing hardcoded catalog assertion:
`129 !== 127` at line 71. It is not weakened or reported as passing. The global
maintenance checker also reports stale inventory outside this scope, including
the four other pre-existing project rows above and its recorded 127-entry catalog
versus the actual 129; no unrelated source is certified.
No browser, screenshots, full fleet, installation, broad checkout or push ran.
Work uses the one-run bounded disk waiver: <=20,000,000 bytes additional growth,
checking available bytes before writes/staging/commit, halt below 1,400,000,000.

## Supplied trio gameplay integration

This bounded follow-up starts after `5d11a7cc` and `fc116792`. The inventory's
Jankolock3D tree matched HEAD before edits. The operator reports the newly named
trio zip is byte-identical to the earlier supply; no archive was opened, extracted
or recopied. All twelve committed trio GLB/manifest/palette/rig files remain exact.
Their manifests' `gameplay_implemented:false` describes the base delivery, not
the now-integrated entry. Supplier authorship remains declared, not independently
proven. See [trio custody/kit/verification receipt](../../../Games/Jankolock3D/models/TRIO.md).

The shared loader now checks their distinct manifests, actual SHA/counts and
new independently measured sidecar receipts, preserves semantic embedded PBR and
clones isolated materials/geometry. Actual bytes/triangles: Spoollash
3,102,828/19,448; Checkmate Regent 4,213,784/18,148; Prism Warden 2,847,116/18,454.
They contain 60 embedded <=512px PNGs in total. Bounded rest-relative rig adapters,
visual crown scaling and cosmetic weapon sockets reuse the existing pattern.
The standard capsule/target volume and covered damage origin do not follow art
protrusions; no skin/IK/foot planting or mesh-collision guarantee is added.
Ribbon's kit, pose branch and asset bytes remain intact.

`game.mjs` preloads the trio and appends `docs/jank3d-trio-kits.json` to the two
existing kit sources. Ribbon's data-driven UI supplies eight real selectable
cards. Start configures the selected kit in systems; the five original bot kits
remain unchanged. Spoollash has damaging tether, self-hook, instant covered cone
and non-invulnerable speed. Regent has solid filing barricade, covered damage/slow
slam, precision hitscan and brief invulnerability/speed. Warden has precision
hitscan, live through-cover reveal, enhanced headshots and bouncing fused blast.
All three have weapon/melee/reload and normal movement. No proposed whip contact,
enemy pull, chess summons, reflection/refraction or flight is claimed. HP and
weapon/cooldown budgets are relative to the original roster, not human-playtested
balance. Generic existing ability FX remain stylistically generic.

Fresh `node Games/Jankolock3D/heroes/trio-test.mjs` separately reports:
- Asset presence/loader: three pinned GLBs/sidecars, real GLTF parsing, 60 PNG
  stream inflations, PBR/clone isolation, 630 bounded poses and real sockets.
- CPU gameplay: three accepted kits, weapons/melee/reload/cover/collision and 12
  effective casts with systems-owned damage/statuses, expiry/reset/disposal.
- Selection VM: actual eight-card/click/select/start bodies, each trio's real
  runtime/configured kit, replaced-model disposal and in-match selection lock.
  DOM and bot startup are mocked; no native interaction or rendered-game claim.
Bitmap upload is mocked. Native lobby/input, GPU/PBR appearance, visual pose
clearance, full-match balance, startup/texture-memory cost and hardware stay held.

Ribbon's 420-pose/four-cast check passes unchanged, as do external rig (2,540
poses), original runtime/visual (16 casts/FX), controller (1,396 assertions), bots
(eight groups), combat input, original five-model importer and UI (14 checks).
Systems passes 18 groups plus its 600-second script with supported
`--no-evidence`; default mode stops before writing at its existing
2,178,940,928-byte disk guard. Syntax and `git diff --check` pass. Catalog remains
129 unique IDs with valid schema/tracked URLs; no game/ID or catalog edit.
Unchanged integration still completes its chains/orb/portrait checks before the
pre-existing `129 !== 127` catalog red. Global maintenance inventory already has
unrelated stale rows/catalog count; only this game's inspected row is reconciled,
not a blanket refresh or global coverage pass. No checks are weakened.

No browser, screenshots, asset work, install, full-fleet smoke or push ran. The
one-run waiver bounds text/test edits and one commit to 12,000,000 added bytes,
with `TMPDIR=/dev/shm`, byte-level free-space checks before growth and a hard
1,400,000,000-byte floor. No normal disk policy change is implied. Foreign Wings
work is not staged or changed by this task.

## J5 browser-free integration repairs (2026-10-24)

Reviewed the actual callers after implementer commits `07965b20` and `737a559f`.
Before this repair the inventory still pinned tree `942ee284020451a8033e2876dbd3d7fbdbe9e5c9`
versus HEAD tree `b90aa4a8eb7d485986b0c8f583e5ba26c3cc3eb2`; the entry blob
`d5d05b09d1a68e6770476d52dbf81acb1d4fd86f` matched. Inventory/index reconciliation
belongs to sibling orchestrator orch771b, not this bounded source commit.
Citisten, Foldwild, shared inventory and README are untouched by J5.

- The bot effect wrapper alone now forwards `tether-end` before its disposed,
  passive, dead and inactive-match gates. The existing systems host validates
  source, configured kit/ability and target and applies the cleanup once; all
  normal effect/damage suppression stays in place. A real bot runtime regression
  checks death, reset, disposal, passive cover break and finished-match reset:
  linked victim speed returns from 4 to 8, HP is unchanged by cleanup, damage
  applies exactly once, duplicate resets/disposal emit no second cleanup, and
  invalid cleanup still fails host validation. Finished phase is an explicit
  negative-path fixture, not gameplay victory evidence.
- `letter-qa.py P --hero` rejects Ribbon/trio IDs with argparse exit 2 before
  guard, browser imports, server or output work. Only the original four have
  concept-comparison fixtures. E still accepts all eight heroes/32 slots.
  COMPLETE now requires nonempty current-run captures, checks and responses;
  stale output files alone cannot satisfy it.
- Letter, integration and external-model runners reuse `qa_roster.runtime_hashes`.
  It includes local source/runners, JSON model sidecars/receipts, portrait config,
  GLBs, local PNG textures, all three external kit JSONs, the roster helper and
  the three consumed local fonts. Required model/kit/config/helper/font inputs
  fail closed when absent. The browser-free regression executes each real hash
  selector against small text fixtures in shared memory, mutates every required
  JSON/config/helper/texture/font selection and checks missing required inputs.
  No historical receipt/hash is rewritten or retroactively accepted.
- Integration's stale expected count is corrected to exactly 129, retaining
  exact uniqueness, required schema and ID240 URL checks. It additionally checks
  integer IDs, schema value types and every URL against tracked Git paths,
  including sparse-excluded files. No filters/assertions are weakened.

Fresh commands/results (no browser or evidence output):

- `node --check` on bots, bot regression and integration regression: exit 0.
- `node Games/Jankolock3D/bots-test.mjs`: `bots-test: 9 groups passed` with the
  printed death/reset/dispose/passive/finished cleanup coverage.
- `node Games/Jankolock3D/heroes/ribbon-seraph-test.mjs`: `PASS Ribbon Seraph`,
  420 bounded poses, four casts, reset/disposal; bitmap upload mocked.
- `node Games/Jankolock3D/heroes/trio-test.mjs`: `PASS trio assets/loader`,
  `PASS trio CPU gameplay`, `PASS trio selection VM`; 630 poses and 12 casts.
- `node Games/Jankolock3D/systems-test.mjs --no-evidence`:
  `18 regression groups completed; scripted match completed` and
  `timeline write skipped (--no-evidence)`.
- `node Games/Jankolock3D/integration-test.mjs`: both 600s chains/19 falls,
  single orb accounting and portrait corruption rejection pass; final output:
  `integration: catalog parses, 129 unique integer IDs, schema fields/types and tracked URLs valid, id240 targets integrated page`.
- `python3 -B Games/Jankolock3D/qa-roster-test.py`: `PASS QA roster`,
  `PASS QA letters`, `PASS QA hashes`. AST parsing of all five touched Python
  modules passes without bytecode writes.
- Maintenance coverage check before commit reports
  `AssertionError: Commit inspected source changes before validating its inventory.`
  Global coverage remains held for the owning orchestrator's final source commit
  and inventory refresh; this lane neither refreshes nor certifies other rows.

No games, IDs, assets, dependencies, runtime external loads, captures, browser,
install/build, full-fleet test or push were added/run. These are CPU/runner checks,
not fresh A-I/art/native input/texture upload, balance, hardware or release
acceptance. Existing incomplete mechanics and full-release holds remain.

## Operator native-gameplay corrective cycle

Source milestone `a86bd144` fixes reproduced keyboard/touch actions using stale
camera/target records before the next frame. Combat inputs now share the same
pause, hidden, death, shop, modal, finished and pregame guards; world interaction
remains available during pregame. The shared area helper also fixes double
self-healing when the integrated target list contains the caster, and stops
healing-only aura from emitting rejected zero-damage intents.

`node Games/Jankolock3D/integrated-actions-test.mjs` passes 124 source-callback
groups using real systems, runtime and bot records with mocked DOM/bitmap upload.
It covers all eight kits/32 abilities, keyboard/touch, native callback guards,
actual bot damage and tether movement/cover/range/death/reset/disposal/expiry.
This is a pure regression, not browser input or rendered gameplay acceptance.
`509d2044` adds detached read-only tether target/lifetime and authoritative bot
HP/speed snapshots. Ten bot regression groups verify observation cannot mutate
state and linked slow clears. `c8266584` adds a bounded supplied-hero native
runner with eight browser-free tests. Its loopback-only aiming fixture retains
soul aim and can aim at actual combat bounds without changing actor state.
Ribbon/Spool must damage and slow a live bot, capture the linked FX, then clear
slow at zero-time range break; Regent/Warden must damage a live bot with native
weapon input. All four require real card/start/movement/action input and normal
bot combat observations. Placement, aim, clock and inspection camera are labeled
API setup, not native travel, aiming or match progression.

The first fresh Ribbon pilot loaded 91 HTTP200 resources without browser errors,
then timed out on native card actionability before any photo/gameplay assertion.
A separate bounded diagnostic found all cards visible/enabled/hit-testable with
stable bounds, and a native card click succeeded, but two rAF callbacks and a
12-second screenshot stalled. Neither attempt produced a JPEG or gameplay pass;
source hashes and owned cleanup passed. Their original failure JSONs remain in
`../audits/jankolock-3d-qa/native-supplied-20261024/`.

`7245ca57` removes independently reproduced static-lobby GPU redraw waste: ten
unchanged callbacks previously drew ten times; now one initial draw plus actual
selection/resize invalidations. The lobby camera is initialized before any
observer draw. Active gameplay is not rate-capped. The real-source regression
now passes 125 groups, including one RAF chain, idle/selection/resize and pause/
resume rendering. This does not prove the native GPU/input stall is resolved.
The runner retains a strict post-selection render assertion, measured against
its pre-click frame counter (`740c3d74`, eight runner tests pass). One post-fix
native pass was separately queued after
Wings and Foldwild explicitly released their follow-up slots.

That single post-fix Ribbon pass also failed at card actionability: click began
at 15.76 seconds, timed out after ten seconds and finalized at 27.02 seconds.
It loaded 91 HTTP200 resources, recorded no browser errors and retained stable
source hashes, but produced **zero images and zero native gameplay passes**.
Spoollash, Checkmate Regent and Prism Warden were not launched into the same
common blocker. The original and post-fix failures plus the separate diagnostic
are preserved, not relabeled as acceptance:

- [First pilot](../audits/jankolock-3d-qa/native-supplied-20261024/ribbon-seraph-20261025T011228Z-be294801.json).
- [Layout/rAF diagnostic](../audits/jankolock-3d-qa/native-supplied-20261024/diagnostic-ribbon-20261025T011855Z-fce75bb7.json).
- [Single post-fix pilot](../audits/jankolock-3d-qa/native-supplied-20261024/ribbon-seraph-20261025T012757Z-1e68f4a7.json).

Owned browser/server cleanup and zero-root/driver checks passed after each
launch; the slot was explicitly released. Two Hermes advice requests were
cancelled; unresolved tooling ticket `pi-15717-1792891774042-957aee3d` retains the
measured actionability/rAF/capture blocker. No GPU/model cause is established.
There is no further browser retry in this cycle. Genuine hero/gameplay previews,
native bot/tether acceptance and supported-device verification remain held.

Final independent pure checks: eight suites passed, including 125 integrated
source-callback groups, ten bot groups, Ribbon/trio real-GLB and pose checks,
32 kit abilities and eight runner tests; seven touched Node modules pass syntax.
These are explicitly not rendered gameplay. Asset/vendor bytes remain unchanged.
No Citisten changes, new games, weakened assertions, install or push.

## Follow-up execution cycle (2026-10-25)

Operator renewed bounded native verification permission after the retained
failures above. Actual current result is **three clean builder-native cases,
one held**, not four-hero/full-game acceptance. The existing eight-hero registry,
all supplied model/sidecar/vendor bytes, Citisten and Foldwild are unchanged.
No game, ID, runtime dependency, installation, full-fleet gate or push was added.

Corrections and observation changes:

- `3082e3b8`: fixes reproduced stale shared QA camera projection (0.201–0.242
  NDC error before repair), and draws initial lobby/selection/resize directly
  without waiting for rAF. Real-camera/withheld-rAF regressions pass 137 groups.
- `a56113da`: timer-polled physical mouse/keyboard actionability retains stable
  bounds, visibility, enabled state, viewport and hit-testing; scrolling uses
  the native wheel. Fresh CDP captures discard the first frame and reject stale
  timestamps, callback/cleanup errors and nonzero worker stderr.
- `584ad623` / `3742ca96`: persistent startup stages and bounded failure probes
  distinguish response headers from finished resource bodies. No extra waits.
- `431e0618`: actual guarded header hover replaces a no-op same-viewport paint.
  `3c001bbd` also requests an initial hover before any frame arrives, allowing
  at most one distinct second hover after a new frame. No click/style mutation.
- `cb0683cb`: batches redundant QA-only GPU syncs. Bot contact uses explicit
  placement and one normal .05-second simulation tick instead of a 55-second
  march; stronger checks require newly player-targeted shots/casts plus HP loss,
  or unchanged HP while the real invulnerability buff is active. No HP grants.

| Hero | Native case | Seconds | Bot-contact player HP |
| --- | --- | ---: | --- |
| Ribbon Seraph | PASS-builder-native-checks-only | 98.93 | 560 -> 393.5 |
| Spoollash | PASS-builder-native-checks-only | 107.64 | 580 -> 413.5 |
| Checkmate Regent | PASS-builder-native-checks-only | 102.87 | 660 -> 660, Castle Guard active |
| Prism Warden | HELD: no accepted compositor frame | 141.45 at default quality | Not reached |

Each clean case has three genuine 1280x720 JPEGs, fresh second-frame acceptance,
selected-render counter 2 -> 3, unchanged runtime/time/render counter during
capture, four native casts, movement/weapon/reload/melee and observed bot
retaliation. Worker and outer stderr are zero bytes; supervisor exits 0;
callback/browser/cleanup errors are empty and owned browser/server close succeeds.
Ribbon's live tether gives target HP 550 -> 532 and speed 8 -> 5.6 -> 8;
Spoollash gives 550 -> 528.4 and 8 -> 5.2 -> 8. Their zero-time range breaks
preserve HP and simulation time. Bot-contact HP above is observed after images.

[Verified three-hero preview](../audits/jankolock-3d-qa/native-supplied-20261024/verified-three-hero-previews-20261025.jpg)
is a labeled, uncropped scale-down of the actual model views, not concept art.
[Parent replay and raw-image links/hashes](../audits/jankolock-3d-qa/native-supplied-20261024/review-20261025.json)
retain all nine accepted originals. Actual native gameplay views:
[Ribbon](../audits/jankolock-3d-qa/native-supplied-20261024/ribbon-seraph-20261025T054827Z-9eb11804-native-gameplay.jpg),
[Spoollash](../audits/jankolock-3d-qa/native-supplied-20261024/spoollash-20261025T055042Z-dd76742b-native-gameplay.jpg),
[Regent](../audits/jankolock-3d-qa/native-supplied-20261024/checkmate-regent-20261025T055240Z-0c9aebcc-native-gameplay.jpg).
All three model/gameplay views were visually reviewed. Spoollash's long cable
is partly outside the inspection viewport; no full-appendage framing is claimed.

Warden readiness and real card selection pass, with 91/91 completed HTTP200s and
zero browser errors, but CDP emits zero frames within 12 seconds even after a
guarded physical hover. Stop/detach and browser-close acknowledgement fail;
pending-task/TargetClosed/pipe errors remain failures, not filtered noise.
The two bootstrap attempts are retained. A separate single transmission trial
`490c2ef1` also gave zero frames: card-to-capture 13.85s versus 13.21s at default
quality. The .5 transmission-buffer setting did not help and was reverted in
`d5942f1a`; `world-scene.mjs` exactly matches the clean cases again. Eleven live
GLBs were inspected: only Warden has transmission (.10/.18) and IOR 1.46.
Raw/loaded/cloned factors and all original bytes remain exact. This difference
is a correlation, **not a proven GPU/model cause**. No Warden image/gameplay
pass is substituted. All failed receipts, three partial failed-Ribbon images
and nonzero stderr are retained.

Limits remain 30s readiness, 12s capture, 140s work, 165s total and 180s outer
supervision. Fourteen pure runner tests pass; the two QA files total 59,999 bytes
under the unchanged 60,000-byte cap. All 349 hashes are stable before/after each
case, including 202 foreign intake files. Current runtime/assets match the
three accepted cases; only named capture-helper/test revisions differ, listed
explicitly in the parent receipt. Their historical source pins are not rewritten.

Input is native mouse/keyboard with labeled API position, aim, clock and
inspection-camera setup, not unassisted matches/travel. PBR/art quality, rigid
pose clearance/feet planting, full matches/balance, mobile/touch, target GPU/FPS
and release remain held. Independent postflight found no live owned browser,
driver, runner or new profile; two baseline artifact directories were preserved.
The browser/server slot is explicitly released; there are no more launches in
this cycle. Advisor ticket `pi-242434-1792908615655-1cb93c87` is answered with a
bounded future read-only protocol-versus-sync timing diagnostic requiring new
approval; it establishes no root cause or permission to retry.

The earlier G26 trace draft measured 65,832 bytes and passed 14/15 tests, failing
only the original 60,000-byte assertion; parent review also found that trace
write failure could skip cleanup. That snapshot is not the subsequent G27/G28
source. The historical G28 safety correction measures **75,122 bytes** (44,901 + 30,221).
Fresh worker and independent parent replay both give **17/18**, with only the
unchanged size assertion failing. Failure injection verifies attempted ACK,
CDP stop/detach, browser/manager/server cleanup, retained operation-primary errors,
late trace-error FAIL gates and deadline propagation. AST/diff checks pass.
The exact snapshot hashes and old/new test distinction are recorded in the
[staged integration receipt](../audits/jank40-staged-integration-20261025.md).
Both QA files remain **uncommitted**; no assertion/cap was relaxed or bypassed.
The old startup advice is superseded by later native results, not a current gate.
No new advice on that answered hold or browser retry was requested.

Proposed extraction would count the original pair plus every extracted helper
and test module under the same aggregate 60,000-byte guard. Extraction alone
saves no bytes: at least 15,122 bytes of real shared-code/fixture deduplication
would need proving while preserving every exact check. A bounded G29 semantic
reuse investigation found only 2,272 gross bytes of eligible exact duplication
before helper costs/overlap, not a proof against every parameterized redesign.
It produced no compliant candidate and restored G28 byte-for-byte: all 168
assertion predicates, 18 test names and 29 case/loop vectors match. The fresh
17/18 result still fails only the size guard. No new formatting/minification,
extraction, size exception or QA commit is implemented/claimed. Citisten's
0920 actual release is received, but native Warden remains unrun while this
diagnostic gate is red. The accepted three cases and failed evidence stay intact.

### Uncommitted async diagnostic repair, 2026-10-27

A CPU-only reproduction using the installed Playwright sync bridge demonstrates
that raising SIGALRM inside its dispatcher kills the fiber; a later synchronous
call cannot start and spins until another alarm. The healthy and cooperative
async-timeout controls complete normally. This proves a cleanup-failure mechanism,
not the exact cause of the historical Warden zero-frame failures.

The current uncommitted candidate replaces that path with public async Playwright,
cooperative absolute deadlines, single-owner FIFO frame ACKs and bounded cleanup.
The producer retains all88 original predicate ASTs after removing Await nodes;
native observations/actions are unchanged apart from async/await. The adapter
retains18 test names/29 vectors and adds a cancellation/follow-up control. Parent
alignment restores the original delayed-wheel fixture and supplies a live cleanup
deadline, without changing their assertions.

Exact pinned suite: **17/18, exit1**, solely the physical-size assertion:
**45,885 +33,432 =79,317 bytes**,19,317 above the unchanged60,000-byte guard.
AST/compile and scoped whitespace pass. The passing49-suite JS input pins remain
unchanged and were not replayed. Volatile receipts are
`jank-d108-async-20261027/REPORT.md`, `final-official-tests.log` and the retained
sync-bridge RED/control reports. Additional scratch CPU controls are analysis,
not independent native acceptance or uncounted production helpers.

Both QA files remain unstaged/uncommitted; their failed predecessors and original
native reports are preserved. No inventory refresh certifies this candidate.
No new browser/renderer run, assets, threshold changes, install or push. Warden's
retained actual native failures remain held and are not reclassified as passing
or merely not-run. Native execution of this candidate remains blocked by size.

### Current source and hero boundary, 2026-10-28

Fresh real Host/route/UI-state audit rejects all40 raw proposals without changing
visible hero/stats/events, then admits only the five guarded profiles with explicit
`partialSlice` opt-in. Public-host QA requests still reject; no ordinary roster
addition is inferred from a loopback adapter.

| Definition/profile group | Configured slots | Remaining boundary |
| --- | --- | --- |
| Ordinary roster | 8 selectable definitions /32 slots | Separate existing engine kits, not eight newly accepted native cases |
| Odo, Whitespace, Laminate, Cassette | 1/2/3/4 each | Four CPU QA adapters, not full proposal/native/art parity |
| Fern (`office-plants`) | 1/3 | 2 Planter Shelter and4 Office Conservatory unavailable |
| Other35 proposed kits | None | All140 slots unavailable |

Thus **18/160 proposed slots have compatible CPU QA adapters;142 remain held**.
Fern2/4 still require genuine arc/radial planter compositions, not resized generic
panels. Forty decoded/rigged bodies, retained raw proposals, weapon/melee checks
and five QA profiles are different acceptance axes. None establishes forty
complete heroes, thirteen accepted ordinary kits or expansion native acceptance.

Independent HTTP checks of live `heroes/hero-runtime.mjs`, `systems.mjs`,
`heroes/qa-slices.mjs` and `integration-ui.mjs` returned200 and byte-matched
committed `c19405ab`. This is source delivery, not visible gameplay. The already
live boot-JSON fix was neither repeated nor changed. The serial release owner
confirmed main `885cbb20`, no retained browser reservation, and sole push ownership;
no capture reservation or native GO was inferred.

A bounded typed-contract/scenario feasibility check used the actual preserved
pair, retained all18 names/29 vectors and made no source edits. Its concrete
accounting established no safe19,317-byte saving; no further unchanged cap-golf
or renderer rerun follows. Native QA remains79,317/60,000 bytes and17/18, with
that sole failing source-size gate. Historical Warden zero-frame/cleanup failures
remain unresolved; the async candidate's current native behavior has not been
measured. Current CPU scope receipt: `jank-current-hero-scope-20261028.json`;
feasibility accounting: `jank-d109-feasibility-20261028/REPORT.md` (volatile working
evidence). No new game, dependencies, model change, gameplay/QA source mutation or push.

## Forty-hero intake and staged art integration

The operator's newly received archive is retained unchanged with SHA-256
`c7c4deae17e83aa3333f45f87ec224ae56316fd918438960c17501017b8565b7`.
Three bounded real Paseo lanes, at most two concurrently, are recorded in
[dispatch](../../jank40-dispatch.md). The existing parent retains runtime,
registry/controller merge authority and corrective native QA; intake sends no
prompt while it is running and uses no browser. No existing hero is deleted,
no Mucilage Monk asset is invented, and no supplied script or Blender file runs.

[Independent asset intake](../../jank40-assets.md) decodes all 86 GLBs (40 clean,
40 FX, six cel) and validates geometry, real named controls, materials, actual
body/FX bounds, archive guards/CRCs and hashes. Forty unchanged clean models plus
selected metadata under `models/expansion40/` total 8,939,076 supplied bytes,
including the supplier README. Clean models total 7,992,988 bytes / 126,626
triangles / 750 named rigid controls. Optional variants and full-size portraits
remain in the original archive. Supplier/operator originality declarations are
not independently proven. Bounds-method and two forward-axis qualifications
remain explicit; collision and damage do not follow decorative bounds.

[All-40 kit mapping](../../jank40-kit-mapping.md) records the real 40 weapons,
40 melees, 160 slots and 388 effects against current pinned primitives. Fifty
effect cores can reuse current behavior; 338 require mechanics. No complete
proposed slot is currently equivalent, and all forty raw kits fail real host
validation. These are review proposals, not playable definitions or an approved
native adaptation. [Integration handoff](../../jank40-parent-handoff.md) lists
exact loader, named-pose, per-instance material, kit/authority and acceptance
tasks. [Animation plan and standalone regression](../../jank40-animation-integration.md)
cover all forty named rigs and 160 slot gestures; 4,760 bounded reference poses,
real GLTFLoader parsing and per-instance material isolation pass. At that intake
snapshot all forty used no-op fallback walks; the production adapters below
replace that fallback without registering playable kits. Sampled ground-contact error remains
up to .041935m below / .017788m above ground at proposed1.8m visual height. These
are CPU reference-plan checks, not production integration or native acceptance.
The small labeled contact sheet is supplied illustration art, not rendered
gameplay. Existing eight playable heroes and all native/hardware/release holds
remain unchanged. Staging/commits require a serialized shared-index grant; no
push or fleet release gate is implied by intake checks.

### Committed production art adapters, 2026-10-25

Intake checkpoint `e3388eca` commits the unchanged supplied payload and independent
review tools. Historical custody/source pins stay historical; three source pins
had already drifted at that checkpoint. `38d58903` adds an explicit forty-ID,
clean-only loader branch with lazy SHA-pinned central receipt/sidecar validation,
actual GLTFLoader geometry/rig checks and exact transformed-vertex body bounds.
Original heroes make no expansion-asset/receipt request. `MeshBasicMaterial`
clones retain the supplied linear flat colors and per-instance isolation/sharing;
no procedural texture/normalScale/PBR assumptions are applied to unlit assets.

`cf37b1e4` promotes all forty named rig recipes into the production visual factory:
750 controls, caller-owned root, rest-relative clamping and measured clean-body
1.8m normalization. Bipeds/tripods/wheels use their real controls, not humanoid
fallbacks. Rolling uses the corrected negative distance/radius sign, checked by
contact-velocity cancellation forward/reverse at two yaws. The production test
covers 4,800 bounded poses and actual loader-backed factories for all forty.
This does not establish foot planting, terrain contact, native blend/clearance,
GPU performance or the two held forward directions. Fixed-wheel lateral scrub
is explicit, not disguised as forward rolling. No floating rig was invented.

`10c498be` fixes unsupported ability IDs falsely spending cooldown/counting casts,
and rejected overlapping barricades altering bookkeeping/replacing old effects.
Real systems-host regressions preserve HP/intents/FX/ammo/cooldowns/lastAbility,
existing walls and successful callback/reentrancy ordering. `57e2e52b` passes
read-only world velocity through both real runtime visual-update sites; a clearly
synthetic original-kit/real Odometer fixture verifies reverse/strafe at two yaws.
It is not an adaptation of Odometer's proposed kit.

All forty production art adapters are CPU-tested; **the game still has eight
selectable/playable definitions**. No registry, catalog or controller physics
change is shipped. `setAcceptedAction` exposes explicit already-accepted visual
phase sampling only. At this stage runtime phase/lifetime wiring and all proposed
kit mechanics remained implementation work. Later weapon and four instant-native
slot cue consumers are recorded under S5/S6 below; other phase policies and
proposed mechanics remain held. No new cast timers, fake successful slots, channel
renames or approximate playable definitions were invented. All forty raw kits
still reject, and all 160 complete proposed slots remain unsupported. Source,
rendering, full-match, hardware and release gates are distinct. No browser,
full-fleet run, supplied-code execution, dependency or push was performed.

### Status-only fractional slow foundation (S1)

`df71ef7f` adds a real systems-owned, caster-ranged status intent for typed enemy
heroes/troopers without inventing chip damage. `99308f12` bounds this new pure
slow to **0 < fraction <= .9**, matching the unchanged controller's 10% movement
floor. A measured .95 request previously reported .4 speed while the controller
produced .8; that unsupported request now rejects instead of approximating it.
Normal-clock systems-to-controller tests agree at .4/.9 (4.8/.8 speed) and expire
normally. Controller physics and existing damaging-slow behavior are unchanged.

The host requires an ability baseline with zero damage/heal/spirit scaling,
`damageType: none`, positive bounded range/duration and no mixed protection,
speed or headshot payload. It validates source/target/team/phase/invulnerability,
rejects structures and applies the existing strongest-slow/expiry storage. Runtime
hit/area paths require typed hero/trooper targets and existing visibility; player
descriptors now preserve kind and bot status uses the existing box/terrain gate.
Tests cover unchanged HP/ammo/economy, spoof/malformed/role/range/cover boundaries,
ordinary timed lifetime, caster versus victim recall/cloak semantics, victim
death and seven linked-tether cleanup paths. No remote-zone authority, root,
new cast ID, raw-kit adaptation or registration is claimed.

Fresh worker and parent verification passes six required suites: **22 systems
groups, 141 integrated callback groups, 11 bot groups**, runtime and supplied-hero
checks, retaining all 32 original abilities. Eight touched-script syntax/diff
checks pass. Parent collection pins 353 resource hashes unchanged. The optional
broader integration attempt timed out and remains historically **PARTIAL**.
After a long host/Git stall cleared, a single CPU-profiled diagnostic on a quiet
host passed all original integration assertions in 34.746s under the unchanged
90s hard limit, with 353 unchanged hashes. CPU/phase samples indicate CPU-heavy
match simulation on that run; prior contention is plausible, not established.
The separate 10s profile-processing limit stopped function attribution. No
unchanged blind retry or wait increase was used. The 75,122-byte QA draft/cap/
native holds remain separate and unchanged. See the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s1-status-only-slow-foundation).

### Shared healing-target repair (S2, 2026-10-26)

`b538f7f5` fixes the shared aura/puddle emitter sending heal intents to known
friendly structures, which the authoritative systems host correctly rejects.
Both original Gooey casts reproduced one rejected structure-heal intent before
the one-guard fix; both now emit zero. Real-host regressions near an actual
friendly objective retain valid typed/legacy-untyped ally healing, one caster
heal per pulse, original mixed puddle damage and cover/dead/radius/expiry rules.
Injury uses `sim.damage`, not HP grants. Structure HP and ammo/economy stay
unchanged; host validation, kit data, numbers and controller physics are intact.

Worker and independent parent pass all six required suites: 22 systems groups,
141 actual callback groups, 11 bot groups and all 32 existing abilities. The
parent collection preserves 353 resource hashes; two syntax/diff checks pass.
No optional integration/browser/native/fleet retry or new game ran. The earlier
profiled CPU integration pass remains pinned to its prior source snapshot, not
a new full-game acceptance of S2. Only Jank's factual inventory row is refreshed.
The [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s2-shared-healing-target-repair-2026-10-26)
retains RED/GREEN and G29 feasibility qualifications.

### Payload cast-admission repair (S3, 2026-10-26)

`7f534915` fixes a reproduced silent-success boundary: configured unsupported
pure-slow payloads returned true, spent cooldown 5, incremented casts and made FX
without emitting any actual effect. A definition-only predicate is now shared
by hit delivery and admission, before aiming or cast mutation. Nine payload-only
dispatches are covered: volley, glue, slam, longshot, tether, turret, grenade,
missionbomb and empty offensive puddle. Positive damage and genuine healing-only
puddles retain their existing paths; utility/buff/movement handlers are not
blanket-rejected for having zero damage or no immediate emitted event.

The real-host regression checks **99 rejection cases across nine IDs**, including
unsupported fractions, missing fields, invalid duration/range and mixed spirit
payload. Rejection preserves nonempty HP/intents/FX/ammo/cooldowns/casts/lastAbility/
scene state and never reaches aiming. Valid damaging/pure-slow misses, actual
Overtime buff/expiry, real zero-damage wall-hook movement, healing-only puddles
and S2 aura/puddle healing remain accepted. No HP grants, invented damage, kit
registration, remote-zone authority, controller change or proposed-kit parity.
This is narrow payload admission, not complete validation of arbitrary buff kits.

Worker and independent parent pass six required suites, **22 systems / 141
callback / 11 bot groups**, all 32 existing abilities, two syntax/diff checks and
353 unchanged resource hashes. The earlier two read-only probes and five
counterexamples are retained in the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s3-payload-admission-repair-2026-10-26).
Wings' ordered handoff finished and its final release was independently verified
before this source task; its new inventory row remains untouched. G28's two
uncommitted diagnostic files and native/rendering/size holds are unchanged.

### Periodic interval admission repair (S4, 2026-10-26)

`393d912c` validates and copies a finite positive interval when configuring
`turret/puddle/aura/chaingun`; `02b3cfad` checks the same contract before runtime
cast aiming or mutation, including later client-definition changes. Missing
intervals reproduced `next=NaN`: deployments fired every update, while periodic
buffs stopped after their first pulse. A missing-interval turret delivered 24
accepted hits in 1.2s instead of following its .65s baseline. Invalid initial
kit input now leaves registration/resources untouched and permits a valid retry.

Permanent checks cover 36 malformed host baselines, 24 mutable-client runtime
rejections, normal feedback/expiry, nonperiodic omission and unchanged configured
state. Existing .65/.12/1/1 intervals stay unchanged. Finite positive extremes
remain admitted: no new min/max, cadence loop, timing or kit values were invented.
The existing one-pulse-per-update ceiling remains; this does not establish exact
sub-frame cadence or proposed-kit parity. Injury uses authoritative damage, not
HP grants. All S1-S3 assertions and 32 existing abilities remain.

Worker and independent parent pass six required suites: **24 systems / 141
callback / 11 bot groups**, four syntax/diff checks and 353 unchanged resource
hashes. Both exact two-path source leases released empty/unlocked. Only Jank's
factual inventory row changes; foreign Wings work and the held G28 pair remain
untouched. No browser/native, optional integration, fleet, new game, install or
push ran. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s4-periodic-interval-admission-2026-10-26).

### Accepted weapon-pose consumer (S5, 2026-10-26)

`5a97e1f7` connects explicitly accepted weapon shots to the staged expansion
visual API. Only a successful `fire()` commit creates an owned cue; runtime time
samples the existing .12s shot/recoil visual window, now one shared constant.
Phase is not inferred from recoil, cooldown, FX count or a hit. Accepted misses
therefore animate; cosmetic shot FX alone do not. Original eight visual paths
remain optional-API-compatible. No model, rig recipe, physics or kit changes.

Real Odometer art with a synthetic original Turretina kit verifies the actual
named weapon joint at start/mid/end, zero-dt stability, fresh-shot restart,
rejected fire/slot/melee/parry preservation, accepted nonweapon cancellation,
callback reentry ordering and reset/death-caller-reset/disposal rest. Caller root
and read-only world velocity stay intact. No owned cue means runtime does not
erase another test owner's explicit slot sample.

Worker and independent parent pass **7/7 targeted commands**: six required suites
plus all-forty production rig compatibility. Existing 24 systems / 141 callback /
11 bot groups, 32 abilities, 99 payload and 24 interval cases remain; two syntax/
diff checks pass and 353 resource hashes stay unchanged. The worker finished
10m02s, two seconds over its assigned bound, then stopped; this is recorded rather
than hidden. Source and metadata use separate exact-path index windows.

This is **weapon-only CPU infrastructure**, not forty playable kits, slot/melee/
channel phase wiring, proposed timing parity, art/foot-plant/contact approval,
native rendering, GPU/FPS, touch or release acceptance. Looping slots are not
stretched into clips. At S5 all slot phases remained held; S6 below adds only
four instant-native cosmetic cue types. No new duration value, mechanical cast
timer, game, screenshot, browser, dependency or push was added.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s5-accepted-weapon-pose-consumer-2026-10-26).

### Instant native-slot cue consumer (S6, 2026-10-26)

`21280ec0` generalizes the owned cue lifecycle to weapon or slot, retaining a
read-compatible `weaponAction` getter. Volley/glue (.8s), slam (1s) and longshot
(.65s) use exactly their existing native FX windows for post-acceptance cosmetic
sampling. `9d38f048` adds actual Odometer joint checks for four IDs across five
valid slot mappings, including a synthetic slot swap rather than a fifth slot.

Acceptance commits before callbacks; rejected actions preserve the current cue,
and the latest accepted shot/slot wins through reentry. Damage remains immediate
at the original cast time, before phase advancement. Accepted misses animate;
normal-dt phase/expiry/repeat, zero-dt stability, lifecycle, noninstant cancellation
and external-owner protection pass. No new duration value, windup, mechanical
hit timing, rig recipe, controller, registered kit or snapshot field is added.

Both lanes and independent parent pass **7/7 targeted commands**, 353 unchanged
resource hashes, 24 systems / 141 callback / 11 bot groups and all previous
32/99/24 checks. Source claims are snapshot-specific: implementation initially
passed the pre-S6 tests; the test lane and parent then passed the final pair.
The test lane's READY report was 7m34s, within its bound; subsequent session
compaction was not additional implementation, and no message/grant was sent to
that peer until fresh idle verification. Exact one-file commit windows released
empty/unlocked before the next grant.

This remains staged CPU presentation, not any complete proposed slot or forty
playable kits. Hook/tether, looping buffs, deployments, projectiles, melee/parry
and channel cue policies are still held; no long effect is stretched into a clip.
Art/contact/blends, native rendering/input, hardware and release remain held.
No browser, capture, full fleet, dependency, new game or push ran. See the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s6-instant-native-slot-cue-consumer-2026-10-26).

### Independent slow lifetime (S7, 2026-10-26)

`417c1eaa` adds an optional immutable `slowDuration` baseline; omission keeps the
validated legacy `duration`. An explicitly supplied value must be finite,
positive and <=3600s, the existing duration ceiling. Pure and damaging slow paths
use this host-owned lifetime, while owner buffs/protection, item slows, cues and
cleanup retain their previous rules. Any supplied event override must match;
standard runtime intents omit the field. Status telemetry reports the applied
slow lifetime, not a longer owner duration.

`671087e8` adds known-cast and shared-hit admission plus real-host regressions:
192 malformed client cases preserve nonempty state; normal .05s updates verify
.25s aura refresh and .5s last-application linger after leaving/field expiry.
A .5s damaging slow expires while native glue FX remains; omission preserves the
old lifetime, HP changes only on the hit, and valid client mutation cannot extend
the immutable host baseline. Invalid initial registration is transactional.
No published kit values, rate, new ID, controller or visual-window changes.

The telemetry review first reproduced `3 !== .5`, then corrected the producer
and added legacy/override assertions. Independent final verification passes
**7/7 targeted commands**, **27 systems / 141 callback / 11 bot groups**, all
previous 32/99/24 checks and 353 frozen resource hashes. Earlier lane results
are not transferred across that telemetry change. The runtime lane reported
8m36s, 36 seconds over its bound, then stopped; this is retained in the receipt.

This foundation matches the supplied distinction between zone lifetime and slow
linger, but does not implement detached/multiple zones, new origin authority,
layouts, per-cast budgets, full effect graphs or forty playable definitions.
Native/art/hardware/release and the unchanged G28 size gate remain held. No
browser, capture, optional integration/fleet run, new game or push occurred.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s7-independent-slow-lifetime-2026-10-26).

### Active buff FX replacement cleanup (S8, 2026-10-26)

`aa0752ea` fixes the shared overtime/headshot/xray/chaingun/aura branch retaining
superseded FX after a legal overlapping recast. RED reproduced two live overtime
handles, the old one still with 2.75s remaining. The replacement handle is now
created successfully before the old same-ID handle is disposed; the new owner
is assigned before its existing host callback. No premature `buff-end` is sent.

`05fb9001` verifies all five handlers with real host/scene records: one current
same-ID handle, detached/retired old group, unrelated FX/buffs preserved, refreshed
host state past the old deadline, idempotent stale disposal, one new-owner end,
callback reentry and orphan-free visual reset/disposal. A factory-throw fixture
retains the old record/handle; existing precommitted cooldown/count changes are
explicitly not rolled back. Configured duration/rate/data, HP/status rules,
reset-side status semantics and cue policies are unchanged.

Worker and independent parent pass **7/7 targeted commands**, 27 systems / 141
callback / 11 bot groups and 353 unchanged resource hashes; two syntax/diff checks
pass. Earlier lane results remain tied to their recorded test snapshots. Only
Jank's factual inventory row changes; all foreign work and the G28 pair remain
untouched. No browser/native/FPS, optional integration/fleet run, new game,
installation or push. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s8-active-buff-fx-replacement-cleanup-2026-10-26).

### Team-aware cloak target eligibility (S9, 2026-10-26)

`aed6effe` fixes one shared player descriptor predicate used by action, fire and
tick: living same-team heroes remain eligible while cloaked. It uses the current
authoritative `hero.team`, not a fixed team. Enemy-cloak exclusion and dead-ally
rejection remain unchanged; no cloak state or visibility policy is rewritten.

`ffb4b982` retains all prior 141 callback groups and adds four real-host/source
cases: both teams through simulated keyboard/touch callbacks. Scripted initial
funds buy/activate the actual cloak item; API damage establishes injury. Gooey's
actual aura heals the cloaked ally and self once without changing cloak/recall.
Enemy cloak still excludes aimed fire/cone damage/status, dead allies stay
ineligible, descriptor facts stay intact, and no structure heal or zero-damage
intent leaks. Pinned-baseline RED reproduced all four missed heals.

Worker and independent parent pass **6/6 required suites**, now **145 callback
/ 27 systems / 11 bot groups**, with 353 unchanged resource hashes and syntax/
diff checks. This is Node VM/source-callback proof, not physical input, rendered
visibility, new AoE/reveal semantics or native/FPS acceptance. No browser, rigs
(unaffected), optional integration/fleet, new game, dependency or push. Existing
forty-kit/native holds remain. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s9-team-aware-cloak-target-eligibility-2026-10-26).

### Explicit native timer admission (S10, 2026-10-26)

`eb08573e` / `2008356d` align host registration and before-mutation runtime
admission for eleven timer-backed casts: an explicit finite duration in the
existing **[0,3600]** range is required. Missing duration previously registered
as zero but became `left=NaN` in runtime; RED reproduced a non-expiring grenade.
No positive minimum is invented: explicit zero, zero-fuse detonation/zero-tether
initial damage and instant/weapon/melee duration omission remain valid.

Host/runtime each reject **132 malformed cases**; 33 boundary registrations and
33 runtime admissions retain zero/MIN_VALUE/3600. Zero-fuse grenades/missionbombs
detonate once; zero tether hits once and cleans up. The maximum is admission/reset
proof, not simulated expiry. The old 99-case fixture still runs all assertions,
now applying missing duration after valid host registration.

Worker/independent parent pass **6/6 suites**, **29 systems / 145 callbacks / 11
bot groups**, four syntax/diff checks and 353 unchanged resource hashes. All 32
live slots and prior admission/cue/lifecycle tests remain. No authored values,
new IDs, raw-kit registration, geometry, browser/FPS or new lifetime precision
claim. Native/forty-kit holds remain; see the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s10-explicit-native-ownerfuse-timer-admission-2026-10-26).

### Persistent emitter instance/origin receipts (S11, 2026-10-26)

`f67f2d8d` / `aa513a1f` bind existing turret/puddle HP effects to live registered
instances. RED accepted forged cross-map origins without starts. The host now
copies each start's ground point and immutable owner duration, validates a
source-monotonic safe-integer ID and horizontal placement envelope, and derives
the exact turret muzzle (+.9m) or puddle center. HP events require that current
ID/origin before expiry; caster movement afterward remains legitimate.

Expiry/death revoke anchors. Duplicate/stale ends cannot revoke replacement
owners; cleanup survives dead/passive/disposed/finished bot gates without
weakening combat filters. Runtime removal is membership-first/idempotent, so
stale teardown cannot splice a fresh deployment or unrelated wall. IDs survive
reset and allocate after cleanup callbacks: a parent-proven cross-ability
reentry ordering failure now has permanent RED/GREEN tests in both directions.

Final independent **6/6 suites**, **32 systems / 145 callbacks / 12 bots**, six
syntax/diff checks and 353 unchanged hashes pass. Earlier runtime **5/6** and
parent ordering failures remain historical partials, not green receipts. API
placement is CPU setup. Horizontal bounds are not floor/LOS/vertical-physics
certification; pure slow remains caster-ranged. Projectile-origin authority,
rate/per-cast budgets, layouts and complete raw slots remain held. No browser,
art/native/FPS/full-match, registration or publication acceptance follows.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s11-persistent-emitter-instanceorigin-receipts-2026-10-26).

### Opt-in anchored pure-slow puddle component (S12, 2026-10-26)

`f27b03a2` / `ae41f792` add staged `anchoredSlow: true` support only for a
validated pure-slow puddle with positive radius. Omitted/false remains exactly
the legacy caster-ranged path; current eight kit definitions are unchanged.
The host copies the flag and requires the live S11 instance, exact center and
radius before status application. Missing/spoofed fields cannot opt in or
downgrade host authority. Runtime checks definitions before aim/mutation and
uses field-centered range/LOS, not the caster's later position or sight line.

CPU real-host fixtures verify refresh with the caster 100m away, no HP/heal
intents, field-wall blocking, `.5s` last-application linger after exit/expiry,
immutable flag/radius, stale/missing IDs and 144 transactional runtime
rejections. The unchanged legacy S11 caster-range assertion still passes.

Host lane stopped partial at its bound; runtime recorded 5/6 on an earlier
systems-test hash. Parent independently passes **6/6** on the corrected final
snapshot: **35 systems / 145 callbacks / 12 bots**, four syntax/diff checks and
353 unchanged hashes. Those historical failures/timeouts are not relabeled.
This is one opt-in native component, not raw-kit registration, multiple zones,
full budgets, host geometry certification or native/GPU/full-match acceptance.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s12-opt-in-anchored-pure-slow-puddle-component-2026-10-26).

### Optional per-target slow application budgets (S13, 2026-10-26)

`5a18ce17` / `ecd1bd2f` add `maxApplicationsPerTarget` only to explicitly
anchored pure-slow puddles. Omission stays uncapped; a supplied value must be a
positive safe integer. Immutable host counters belong to each instance/target
and increment only after all status guards accept. Exhaustion rejects without
refresh or mutation; leaving/reentering or waiting for slow expiry does not
reset the count. A new instance gets a new budget, while S7 linger still ends
from the last accepted application.

The producer reserves before callbacks and retains a reservation only for a
structured synchronous `{ok:true}` result. NACK/non-ACK/throw rolls it back on
the old record, never its replacement. Bot callbacks now return the existing
host result without changing filters. Missing/lost ACKs are not acceptance;
the host independently enforces the cap. Callback failure after host application
is not a host rollback.

Worker and independent parent pass **6/6 suites**, **38 systems / 145 callbacks
/ 13 bots**, six syntax/diff checks and 353 unchanged hashes. Tests retain all
prior checks and add 29 runtime budget rejections, per-target/instance/source
isolation, cap/linger, ACK/reentry and tamper controls. Current kit data stays
unchanged; this is not a damage/heal/total-cast budget, complete slot, native or
balance acceptance. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s13-per-target-anchored-slow-application-budgets-2026-10-26).

### Reentrant projectile detonation ownership (S14, 2026-10-26)

`09a48441` / `dabffad9` fix expired projectiles remaining owned through explosion
callbacks. Pinned RED reproduced duplicate detonation, callback-created owner
deletion through `splice(-1,1)`, and cancelled-sibling motion. Snapshot entries
are now checked for live membership, and expired owners are consumed before
teardown/explosion/area callbacks. New callback-created projectiles survive
without advancing in the old copied tick; cancelled siblings are skipped.

Both projectile types retain normal/zero fuses, bounce/gravity and committed
multi-target AoE. Recast same/other-type controls finish fresh fuses once;
callback exceptions retain identity without retrying consumed owners or claiming
host HP rollback. All prior assertions remain. Worker/parent pass **6/6 suites**,
**38 systems / 145 callbacks / 13 bots**, two syntax/diff checks and 353 unchanged
hashes. CPU target-following/API placement is not native ballistics certification;
projectile-origin provenance and all native/full-kit holds remain unchanged.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s14-reentrant-projectile-detonation-ownership-2026-10-26).

### Stale periodic snapshot ownership (S15, 2026-10-26)

`f59889ff` / `35a65993` add two loop-start guards: buff snapshots must still be
the current same-ID object; deployments must still be live members. Cancelled
entries are skipped before timers, positions, expiry and pulses. Pinned RED
reproduced fresh-buff deletion, cancelled aura healing and stale puddle intents.

Real-host GREEN retains callback-created owners unadvanced, suppresses cancelled
aura/chaingun/deployment ticks, and confirms uncancelled owners still advance.
All prior assertions remain. Worker/parent pass **6/6 suites**, **38 systems /
145 callbacks / 13 bots**, two syntax/diff checks and 353 unchanged hashes.
This is copied-snapshot ownership only, not a new policy for cancellation during
an already-entered area pulse or altered phase ordering. Current kit values,
projectile-origin findings and native/full-kit holds remain unchanged.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s15-stale-periodic-snapshot-ownership-2026-10-26).

### Cancellation inside continuous area pulses (S16, 2026-10-26)

`8d343476` / `2562af94` pass the actual aura/puddle owner into the shared area
path and recheck it before each target and self-heal. Cancelling/removing or
replacing that owner stops the rest of its continuous pulse. Already-applied
effects remain applied; fresh same-ID owners do not authorize old pulses.
Unowned one-shot AoE remains committed, including unchanged S14 controls.

Pinned RED reproduced post-cancel aura healing and stale puddle-ID intents.
GREEN covers reset/recast/removal, first-application preservation, fresh-owner
timing and full uncancelled ally/self healing. All previous assertions remain.
Worker/parent pass **6/6 suites**, **38 systems / 145 callbacks / 13 bots**, two
syntax/diff checks and 353 unchanged hashes. This extends S15's copied-entry
fix to current continuous pulses, not to projectile provenance, Host authority,
authored values, native/GPU/full-match or full-kit acceptance.
See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s16-cancellation-inside-continuous-area-pulses-2026-10-26).

### Reentrant pending tether adoption (S17, 2026-10-26)

`e2c49c5c` / `9fbf1f9e` publish pending tether ownership before old cleanup/hit
callbacks, retire the old link before new damage/status, and check identity
before hitting. No post-hit assignment can resurrect a cancelled link or
overwrite a callback-created replacement. New FX creation precedes retirement,
so a factory failure retains the prior link without rolling back cast costs.

Pinned RED showed reset resurrecting a disposed link with slow still active,
and old-end reentry producing three hits/two FX while overwriting the new link.
Real Host-first GREEN covers reset/dispose, same/different-target recasts,
ordered cleanup, miss visuals, factory retention and primary exceptions. Already
applied HP is not rolled back. Worker/parent pass **6/6 suites**, **38 systems /
145 callbacks / 13 bots**, two syntax/diff checks and 353 unchanged hashes;
prior assertions remain. No data, Host protocol, native render or full-kit gate
is changed. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s17-reentrant-pending-tether-adoption-2026-10-26).

### Quiescent synchronous reset admission (S18, 2026-10-26)

`3331a1db` / `23482113` block native action/update entry points and nested reset
while reset cleanup is running. Cleanup notifications still reach the host;
`finally` releases the barrier on return or exception. Actions after reset
returns remain valid. Configuration/read helpers are not newly blocked.

Pinned RED reproduced reset-time hits/slow without an owner and orphan turret/
puddle anchors. GREEN uses ready preconditions to verify false/void return
contracts, no aim/cost/FX/HP/time mutation, real host cleanup, after-return action
admission and exception identity/unlocking. Prior assertions remain. Worker/
parent pass **6/6 suites**, **38 systems / 145 callbacks / 13 bots**, two syntax/
diff checks and 353 unchanged hashes. This is not permanent disposed-runtime
protection, blanket internal-intent filtering or rollback after a partial reset/
already-applied host effect. Native/full-kit holds are unchanged; see the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s18-quiescent-synchronous-reset-admission-2026-10-26).

### Terminal native disposal admission (S19, 2026-10-26)

`4d288836` / `de64614a` close native action/update admission before disposal
starts. Nested and successfully completed disposal are no-ops; a failed stage
propagates its primary error and permits explicit retry without reopening action
admission. Reset stays available for cleanup but cannot reactivate the instance.

Corrected diagnosis: the existing FX disposed guard already prevented observed
post-disposal HP/scene recreation. Pinned RED instead proved native bookkeeping
mutation before its exception and continued runtime clock advancement. GREEN
rejects false/void before these changes, checks ready reload and other native
APIs, phase callbacks, real host cleanup, repeated/nested disposal, failure/retry
and independent instance admission. Worker partial/fixture failure/timeout stay
partial; parent passes **6/6 suites**, **38 systems / 145 callbacks / 13 bots**,
two syntax/diff checks and 353 unchanged hashes on final pins. No blanket internal
intent filter, transactional rollback or complete teardown after a failed stage
is claimed. Native/full-kit holds remain; see the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s19-terminal-native-disposal-admission-2026-10-26).

### Owned native buff cancellation (S20, 2026-10-26)

`c7ff048b` / `1607f292` share identity-safe buff removal between expiry and reset/
disposal. Each current owner emits one existing `buff-end`; replacement refresh
still emits none, and stale records cannot end fresh owners. Host/bot cleanup
admits this end while dead/inactive without bypassing role, payload, source,
team/self validation or ordinary combat/start filters.

RED proved ownerless Overtime invulnerability/speed after reset/disposal. GREEN
revokes native Overtime and headshot authority, checks all five native buff IDs,
real bot forwarding, cancellation/replacement counts and partial cleanup/retry.
S15 now distinguishes legitimate reset cancellation from forbidden stale expiry;
its assertion remains. Worker partial/overrun remains partial. Parent passes
**6/6 suites**, **40 systems / 145 callbacks / 14 bots**, six syntax/diff checks
and 353 unchanged hashes. No complete teardown/HP rollback after an exception,
new kit registration or native/full-kit acceptance is claimed; see the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s20-owned-native-buff-cancellation-2026-10-26).

### Atomic modifier snapshot admission (S21, 2026-10-26)

`c9856ce7` / `51492659` validate one own-entry modifier snapshot before applying
any values to the existing object. Rejected mixed batches no longer leave a valid
prefix applied. Existing five keys, bounds/errors, partial/inherited/empty input
semantics and ammo clamping remain; getters are not reread during application.

A real Host/native-kit fixture retains 55 rejection cases plus identity/cue/
nonempty-state checks, getter behavior, valid bounds/ammo and normal-clock weapon
use. Prior assertions remain. Targeted worker checks pass; parent passes
**6/6 final suites**, **40 systems / 145 callbacks / 14 bots**, two syntax/diff checks and 353
unchanged hashes. This is modifier admission, not rollback of external getter/
proxy side effects, new authority over Host cadence, or native/full-kit acceptance;
see the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s21-atomic-modifier-snapshot-admission-2026-10-26).

### Terminal closure inside update callbacks (S22, 2026-10-26)

`76fd71df` / `8e25c3f3` check terminal closure at copied-owner entries and four
update-phase boundaries. Owned continuous pulses also stop when closed, even if
caught partial disposal left their owner pending. Reset-only ordering is not
redesigned. Ownerless one-shot AoE already committed still completes.

RED proved a successful buff-callback disposal followed by attempted movement
FX on disposed resources. All four phase checks, no post-close automatic work,
committed grenade/missionbomb AoE and explicit partial-cleanup retry are covered.
The first float-boundary fixture failure remains separate from corrected RED.
Targeted worker checks and parent **6/6 suites** pass: **40 systems / 145 callbacks /
14 bots**, two syntax/diff checks, 353 unchanged hashes and prior assertions.
A callback explicitly catching a teardown error is not Runtime error suppression;
no HP rollback/full teardown after failure or native/full-kit acceptance is
claimed. See the [checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s22-terminal-closure-inside-update-callbacks-2026-10-26).

### Bot turret automatic cloak eligibility (S23, 2026-10-26)

`04cf544e` / `6bcaa0fa` expose live readonly `autoTargetable` on shared bot target
descriptors and reuse it in bot selection and turret acquisition. Missing optional
facts remain eligible for legacy adapters. Actual liveness, manual traces, owned/
one-shot area paths, xray, Host validation and the player adapter are unchanged.

RED proved a purchased/activated cloaked enemy was hit by an autonomous bot turret.
GREEN covers both teams, injury/expiry reveal on the old descriptor, shared/
readonly facts, cloaked-ally aura healing and unchanged manual cone damage. Item
currency is imported CPU setup, not economy acceptance; no HP/cloak/status grants.
The first wrong-item-API fixture failure remains separate from corrected RED.
Parent **6/6 suites** pass: **40 systems / 145 callbacks / 17 bots**, three syntax/
diff checks, 353 unchanged hashes and prior assertions. This is automatic target
eligibility, not general cloak/AoE immunity or native/full-kit acceptance. See the
[checkpoint receipt](../audits/jank40-staged-integration-20261025.md#s23-bot-turret-automatic-cloak-eligibility-2026-10-26).

### Odo compatible playable slice (2026-10-26)

`f112f852` adds the loopback-only route
`?qa=jank40-slice&hero=odometer`: actual Odometer model, exact Dash Counter weapon
and Fast Lane with0.1s windup, speed1.7 for2s and cooldown6s. `e1d0859e` enables
Mileage Tap: exact62 base damage/range2.8/cooldown1, preserving the supplied weapon
channel rather than silently converting it to native melee damage. `f232637c`
enables Flying Digits:0.25s windup, four simultaneous40m/s/radius0.2 swept markers,
28-degree fan/range25/18 weapon base each/max2 accepted hits per target/CD8.
`cfacc762` enables End of Shift Sprint:0.5s windup/CD23, following radius5 field
for4s, allies/self speed1.35 refreshed at0.25s up to16 accepted applications with
0.75s independent linger, separate0.5s/max8 zone clock, and one caster-only0.45s
opening invulnerability window. No forced routing or damage. Real troopers now
consume the speed status; self pulses use current controller feet, not stale Game
position copies. Both gaps were reproduced before their bounded fixes.
`0f95cc00` enables Speed Trap:0.25s windup/CD11, resolution-time covered ground
reticle within16m, fixed radius3 field for4s, separate0.5s/max8 zone clock and
0.25s refreshes capped16 per target/effect. Slow0.4 lasts0.5s; team-scoped enemy
reveal lasts1.5s, independently after field exit/end. No HP/chip/healing/forced
routing, cloak removal or automatic-targeting rewrite. Host-owned reveal drives
pooled current-position cage markers after source Runtime cleanup; not supplied
art or mesh-exact outlines. All four slots are enabled in the explicit QA profile;
39 other expansion kits remain unavailable. One pending ability is shown locked,
not queued. Normal eight-kit URLs/bots and ordinary melee rules are unchanged.

The Speed Trap checkpoint passes **20/20 suites**, thirteen JS syntax/diff checks and370 closure
hashes unchanged across replay. Checks include41 default/raw and112 opt-in
rejection/retries; all prior gameplay; new Host8/40 controls,26 baseline cases and55
no-mutation negatives; fixed anchors, independent slow/reveal clocks/caps/tails,
actual cloak/Overtime APIs and NPC0.4 ->0.24 ->0.4 walking per0.05s. Actual models/
controllers/camera prove covered point casting,8 ->4.8 ->8 slow, no HP/ammo,
team facts/outline view, lifecycle, callback cancellation and real ACK cleanup.
All32 ordinary UI slots plus all twelve cross-slot QA locks pass. Older known
subsets remain valid. Dependency partials and Host21m30s overrun stay recorded,
not transferred to final stable replay. UI/entry hosts are mocked; scene-view
checks are CPU, not physical rendering. Conservative collisions and receipt/range/budget
guards are not native/mesh/Host trajectory/LOS/floor/network/cadence proof.
Initial failures and pre-landing REDs remain separate; no case was dropped.
This is a usable four-slot QA profile, not an accepted Odo/forty-hero/native release.
See [the slice support report, commands and native hold](../../jank40-odometer-slice.md).

### Whitespace partial QA profile (2026-10-26)

`0fee7838` adds explicit loopback `?qa=jank40-slice&hero=whitespace`, using its
supplied body/rig. Exact Margin Flick18/range22/interval0.3/mag16/reload1.4/head1.4
and weapon-channel Blank Edge62/range2.9/cooldown1 are playable. Wide Margin has
0.1s windup/CD6, self speed1.55 for2.5s, no HP/heal/invulnerability/forced movement.
Slots2–4 stay unavailable before cost/FX. Selector guard is centralized once;
normal eight kits/bots are unchanged. Report: two QA profiles,38 other kits held,
not two accepted kits. Supplied originals/proposal remain unchanged.

The initial Whitespace checkpoint has **22/22 suites**, ten syntax/diff checks,374 closure hashes stable
across replay. New56 malformed-profile retries/22 forged-self-target negatives,
actual body/Host/controller weapon/melee/parry and8 ->12.4 ->8 motion/lifecycle,
real Game/Host wiring for both QA choices, native32 UI/Odo subset/40 raw controls
pass. Two bounded disjoint lanes, parent-only integration. CPU/VM checks do not
establish native/art/balance/full-match acceptance; all existing holds remain.
See [the shared support/source/verification report](../../jank40-odometer-slice.md#whitespace-partial-qa-extension).

### Clean Break extension (2026-10-26)

`0324a172` enables Whitespace slot3:0.25s windup/CD12, self invulnerability0.7s
and speed1.2 for1s. Host owns two immutable expiry records; cleanup revokes both.
Actual Runtime/Host attacks show damage resuming at0.7s while speed remains;
normal wall collision,9.6m/s motion and stronger Wide Margin12.4 precedence pass.
No invisibility/phasing/teleport/ally protection/healing/cloak gain. Supplied FX/
pose/native acceptance remains held; only slots2/4 are now unavailable.

The Clean Break checkpoint has **23/23 suites**, seven syntax/diff checks,375 stable closure hashes;
77 malformed-profile retries/42 forged-self-target cases, lifecycle/refresh/stale/
error/cleanup and existing White1/Odo/native8/raw40/32 UI controls pass. Generic UI
already supports the new slot without edits. Two bounded disjoint lanes, parent
integration only; source/full commands and CPU/native qualifications are in the
[shared report](../../jank40-odometer-slice.md#clean-break-independent-clock-extension).

### Unprinted Passage extension (2026-10-26)

`b4913d04` enables Whitespace slot4:0.65s windup/CD24, six fixed radius3 zones
spaced3m over15m for5s. Overlapping allies/self get one1.35-speed refresh and
enemies one0.25-slow refresh per0.25s sample, capped20 per component/target;
each lasts0.5s independently of the0.5s/max10 zone clock. No portal/phasing/
collision removal/HP/heal/forced routing. Full-route covered placement rejects
before cost; later obstruction records a failed resolution and brief feedback,
never a shortened or fake successful field. Rings are authored local primitives.

The Passage checkpoint has **26/26 suites**, twelve syntax/diff checks,378 stable closure hashes,
including the shared FX regression.64 transactional protocol rejections retain
prior57 and add sparse/getter input coverage; dense immutable snapshots, current
self, source100m away, fixed geometry, real NPC consumers, caps/tails/immunity and
lifecycle/ACK/reentry pass. First combined failure was obsolete unsupported4 in
Clean's test; replaced by actual Host activation, not hidden or runtime weakened.
Only White2 remains unavailable; native/art/full-match/device acceptance stays
held. [Commands/conventions/receipts](../../jank40-odometer-slice.md#unprinted-passage-six-zone-extension).

### Laminate partial QA profile (2026-10-26)

`d52459ec` adds explicit loopback `?qa=jank40-slice&hero=laminate` with the supplied
body/rig and literal740HP. Gloss Push18/range18/interval0.35/mag14/reload1.5/head1.3
and weapon-channel Corner Clip62/range3/cooldown1.2 are playable. Laminated Sprint
slot3 has0.1s windup/CD8,4s self speed1.4 and separate0.25s opening invulnerability.
No displacement/knockdown/control-immunity promise, healing/cloak/phase/teleport.
Slots1/2/4 remain unavailable. Three QA profiles/37 other kits held, not accepted
ordinary additions; original eight player/bot kits and supplied assets are unchanged.

The initial Laminate checkpoint has **28/28 suites**, ten syntax/diff checks,381 stable closure hashes;
58 malformed-profile retries/25 forged-self-only cases, actual model/Host/controller
combat/items/parry/11.2m/s collision/lifecycle, three actual Game/Host VM choices and
native32/Odo/White/raw40 controls pass. Initial current-ammo fixture failure remains
failed; authored14 capacity and real Runtime reload are separate. Item currency is
CPU setup. [Source/support/limits](../../jank40-odometer-slice.md#laminate-partial-qa-extension).
Native/art/device/full-match/balance acceptance remains held; no walls are approximated.

### Permanent Record extension (2026-10-26)

`0b04e7dd` enables Laminate4:0.6s windup/CD25, radius9 ward following the caster
for4s, four global pulses0/1/2/3s,0.25s protection per living allied combatant/self.
No objective/enemy grants, entry-triggered extras, fifth pulse or25% damage
reduction. Host validates immutable instance/current origin/radius/typed team,
pulse indices and bounded±0.05s substep phase, with per-target index sets. End
stops future pulses but preserves current0.25s committed effects.

The Permanent Record checkpoint has **30/30 suites**, nine syntax/diff checks,384 stable closure hashes;
59 new transactional rejection/retry cases, actual model/Host enemy/NPC attacks
show unchanged damage between shields, moving center/current self, late entry,
deduplication, tails, Sprint/lifecycle/reentry/ACK/error/closed behavior. All earlier
native8/Odo/White/raw40/32 UI controls pass. Only Lam1/2 remain unavailable; Approved
Only's100% stop is not a90% substitute. Existing ring feedback is not supplied-art
or native acceptance. [Full commands/limits](../../jank40-odometer-slice.md#permanent-record-four-pulse-extension).

### Approved Only exact self-stop (2026-10-26)

`95a3631e` enables Laminate2 with0.25s windup/CD13 and1.5s self invulnerability/
100% movement stop, not90% slow. Host owns a narrow self-only stop record;
Controller's default-off flag blocks voluntary locomotion/momentum/new movement
inputs while preserving aim/combat/gravity/collision/recharge. Old hostile-slow
ceiling/default Controller floor are unchanged. Game reads Host before physics,
cancels ride bypass, blocks movement interactions/item dash transactionally and
allows crates plus validated recall/respawn recovery. No phasing, air freeze,
external-force immunity or selective sync-channel protection is certified.

The Approved Only checkpoint has **34/34 suites**, ten syntax/diff checks,386 stable closure hashes;
existing1396 Controller assertions/combat inputs plus actual model/Host/Controller/
Game-source VM tests and21 forged-intent checks pass. Exact stop/expiry recovery,
boost restoration, gravity, traversal/dash denial, combat and lifecycle are tested.
Original expiry-expectation fixture failures remain separate. Only Laminate1 and
Whitespace2 remain unavailable; native/art/device/full-match/balance gates stay
held. [Source/commands/semantics](../../jank40-odometer-slice.md#approved-only-exact-self-stop-extension).

### Cassette combat/Side A slice (2026-10-26)

`60c9c48d` adds explicit loopback `?qa=jank40-slice&hero=cassette`, supplied body/
rig,560HP, Tape Spool18/r23/interval0.32/mag15/reload1.5/head1.4 and weapon-channel
Cassette Corner58/r2.9/CD1. Side A1 has0.25s windup/CD6, fixed radius4 cue placed
within8m for0.25s, one initial ally/self combatant speed1.3 grant lasting2s.
Outside self, late entry/reentry and end-of-cue receive no extra grant. Tails
survive cue cleanup; no damage/heal/invulnerability/forced movement is substituted.
Slots2–4 stay unavailable. Four QA profiles/36 other kits held; native8/bots unchanged.

The first Side A checkpoint has **36/36 suites**, twelve syntax/diff checks,390 stable closure
hashes;69 malformed profiles/retries,37 transactional receipts, actual model/Host/
controller combat/parry/items/10.4m/s motion/collision/cue/tail/lifecycle checks,
NPC0.4 ->0.52 ->0.4 walking, four real Game/Host VM choices and all earlier gates
pass. Input pulse0 is bounded to a canonical0.05s birth phase, not arbitrary
entry grants or general network/cadence/floor/LOS authority. Source parameters/
custody and CPU/native/art limitations are in the
[shared report](../../jank40-odometer-slice.md#cassette-combat-and-side-a-first-pulse-extension).

### Cassette Bad Rewind/Recorded Assembly (2026-10-26)

`52d202da` enables2/4. Bad Rewind has0.25s windup/CD12, concurrent0.6s protection/
2s speed1.5, no state rewind. Assembly has0.7s windup/CD24, fixed radius7 cue within
10m for4s, four0.2s shields at0/1/2/3s and independent sixteen0.25s speed samples
of1.2 for1s. No heal/restore/continuous shield/percentage reduction. Accepted tails
survive cancellation; remaining components stop on owner loss. Tape Snag3 held.

The expanded Cassette checkpoint has **38/38 suites**, nine syntax/diff checks,393 stable closure hashes,
92 transactional receipt rejections and actual model/Host/Controller/NPC independent
clock/cap/tail/collision/reentry/error checks pass. Exact0.2s testing found floating
expiry32.900000000000006; shared creation now canonicalizes only future grid-roundoff,
not arbitrary durations. Four birth-time,0.073s and1e-12 controls pass unchanged
in meaning; original partial/RED and answered advice remain recorded. No blanket
epsilon, longer shield or assertion weakening. All prior profiles/native32/default
8/raw40 gates remain. [Commands/limits](../../jank40-odometer-slice.md#bad-rewind-and-recorded-assembly-extension).
Native/render/art/device/full-match/balance gates still held.

### Cassette Tape Snag / four-slot QA profile (2026-10-26)

`a3b1140e` enables3:0.25s windup/CD10, captured covered enemy unit within13m,
current-ID resolution recheck, one3s link breaking beyond15m/cover, twelve0.25s
samples of35% slow with independent0.5s tails. No damage/forced movement/flat3s
slow; old native damaging tether/end-cleanse unchanged. Typed hero/trooper scope
excludes objectives. Failed resolution shows `Link lost` with committed cooldown.

The Tape Snag checkpoint has **40/40 suites**, eleven syntax/diff checks,396 stable closure
hashes,81 transactional receipt rejections; actual model/Host/Controller5.2 speed/
collision/dt0 breaks/caps/tails/reentry/error checks and NPC0.4 ->0.26 ->0.4 pass.
Shared status expiry is byte-for-byte unchanged, including exact0.2/nongrid/tiny
regressions in the final batch. All eight Cassette subsets/native8/raw40/native32/
four entry choices and older assertions remain. Odo/Cassette each have four CPU QA
slots,14 supported/146 held total; White2/Lam1 and36 other kits unavailable.
Source/receipt/conventions and Host LOS/reticle/windup/network limits are in the
[shared report](../../jank40-odometer-slice.md#tape-snag-owned-link-extension).
No native/render/art/full-match/balance acceptance or push is inferred.

### Keep Clear / four-slot Whitespace QA profile (2026-10-26)

`ec49ca9d` enables2:0.25s windup/CD11/range13, two independent280HP panels for4s,
exact5×2.6×0.3m dimensions,5m clear gap/open ends. Nearest-cardinal input-axis
binding, current covered resolution point and flat/unoccupied placement checks
are explicit; late obstruction reports `Panels blocked` with committed cost.
Host owns geometry/HP/expiry/instance; the shared scene layer renders two local
box primitives and colliders, not supplied art or the old invulnerable barricade.

The Keep Clear checkpoint has **44/44 suites**, seventeen syntax/diff checks,402 stable closure hashes;
real Host/model/controller/bot/NPC/Game VM tests cover both-team movement, swept
ride blocking/occupied landing denial, projectiles/melee/fan/grenade/AoE cover,
orb denial, independent destruction/expiry/recast/death/cleanup and25 transactional
Host rejects/retries. Surface-inside/center-outside range RED is fixed in both
damage APIs, with just-outside1e-6/retry controls; native entity ranges unchanged.
Status canonicalizer and all prior exact0.2/nongrid/tiny-duration tests stay intact.
No wall healing/lifesteal/rewards, reflection or Sheen Wall splinter substitute.

Odo/Whitespace/Cassette each have four CPU QA slots; Laminate2/3/4 only:15 supported,
145 held,36 other kits unavailable. Original eight player/bot definitions stay.
Operator-approved exact index windows are separate from implementation/browser
permission; only parent-authored manual hunks and Jank inventory row are updated.
[Commands/conventions/limits](../../jank40-odometer-slice.md#keep-clear-destructible-panel-extension).
Native input/render/art/GPU/FPS/full-match/balance/release remain held; no push.

### Sheen Wall / four-slot Laminate QA profile (landed2026-10-27)

`6761ca22` enables Laminate1's complete0.25s windup/CD12/range8 graph: one
650HP7×3×0.3m panel for4s and three30m/s/radius0.2/20°/range14/base12 weapon
splinters, max1 hit/target. Wall/burst clocks and ledgers are independent; no
reflection or copied incoming damage. Ordinary friendly-panel collision can block
its own shards. Captured cardinal normal/fan heading, current resolution reticle/
muzzle and late wall-failure/independent-burst behavior are explicit conventions.

The Sheen Wall checkpoint has **46/46 suites**,13 syntax/diff checks,405 stable closure hashes;53
Host transactional rejects, actual model/Host/Controller/scene/Game VM, all prior
44 and exact expiry/surface-range regressions pass. A bounded compatibility fix
restores old Flying Digits behavior when unrelated new flight metadata is present.
Original RED/fixture failures remain recorded. [Commands/limits](../../jank40-odometer-slice.md#sheen-wall-independent-panelburst-extension).
Four profiles×four CPU slots =16/160 support,144 held; no native/art/full-match/
release acceptance. Fresh landing checks match the pinned46-suite snapshot.
Leo explicitly approved new `JANK-SHEEN-WALL-01/-02`; exact13 source paths landed,
then only parent-authored manual hunks, the two support reports and the Jank
inventory row are reconciled separately. No old window reuse or push/browser/cleanup/waiver.

### Fern combat/support QA profile (2026-10-27)

`394c46c4` adds guarded `hero=office-plants`, supplied nameFern,
560HP, Seed Labeler15/r23/.28/mag18/reload1.4/head1.3 and weapon-channel Pot Rim
58/r2.9/CD1. Window Patch1 has0.25s windup/CD8/point10/r4/owner3,12 quarter-second
speed1.2 grants lasting0.75s (last tail3.5); separate0.5s/max6 zone clock. Patient
Growth3 has0.25s windup/CD11/point7/r3/owner2.25 and only two0.35s shields at0/2,
last tail2.35. No healing/regen/continuous immunity/percentage reduction. Fern2/4
remain held, not fake arc/radial planters. Original eight player/bot kits unchanged.

Current **49/49 suites**,14 syntax/diff,410 stable closure hashes;104 malformed
profiles/174 transactional receipt rejects, actual model/Host/controller/NPC speed/
full-damage shield gaps/clock/tail/lifecycle/ACK/error checks and five actual Game
VM entries pass. Old four profiles change only lore; all prior46/status-expiry/
surface-range/flight namespace regressions remain. Source custody/CPU-native
limits and commands: [full report](../../jank40-odometer-slice.md#fern-combat-and-independent-support-fields).

Fresh landing49/49 also passed on the same pins; further passing tests are skipped
when hashes are unchanged. Current user-conveyed Hermes coordination authorization
and release order authorize the two original constrained transactions, not a
fabricated Leo quote. Source14-path transaction released in0.57s; metadata stages
only parent manual hunks/two reports/Jank row. Four full CPU profiles plus Fern1/3
mean18/160 supported slots,142 held,35 other kits unavailable, not ordinary roster
additions. No browser/captures/install/push/cleanup/waiver. Native/art/GPU/FPS/
touch/full-match/balance holds stay. Jank-only release remains HOLD: retained
Warden zero-frame/cleanup failures are actual failures; expansion native and the
current full-fleet gate are not run. See the release audit, not CPU counts, for
readiness. Foldwild's designated main writer receives review-only selective diff;
no whole-branch merge or competing push is authorized.

## Future outlook

Independent stable-source A-I review and mockup comparison, human full-match
balance/pacing, neutral/boss/rejuvenator completion and supported hardware/touch
verification. Keep incomplete mechanics and fixture qualifications visible.
Registration is already the existing-ID rewrite; publication/push remain held.
