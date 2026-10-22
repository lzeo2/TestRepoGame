# Jankolock / Wings: study and integration

## Scope and coordination

Requested path: `Games/Jankolock`, the retained Canvas arena, **not** the registered
3D replacement at `Games/Jankolock3D`. Catalog ID 240 points to the latter. This
change does not silently redirect the task, register the old game or modify 3D.
No games added; catalog remains 128 entries. No push.

Baseline `9ef8381`: Jankolock tree `b15cff44b576881444a20faf39f054621ee2ccdf`
and Wings tree `f8b4f06e6dd62100e6d24ccbbdda7fb431a4d297` match the inventory.
`git log -- Games/Jankolock` still ends at `940cbba` before this integration;
no `jankolock-hud-fire` milestone is present. The 3D path's latest inspected
milestone is `15f31e9`, not a HUD/fire delivery. Therefore health rendering,
weapon cadence, input handlers and shot animation are deliberately untouched.
This patch adds independent confirmed-hit feedback, onboarding and pause focus.
A future HUD/fire delivery may touch the same `ui.js`, HTML or CSS files: merge
these small hunks rather than replacing files. That sequencing dependency remains
open; this receipt does not claim to have integrated an absent worker commit.

Read the [legacy manual](maintenance/games/unregistered-jankolock.md) for provenance,
existing gameplay and hardware limits, and the [Wings manual](maintenance/games/232-wings.md)
for its unresolved rights and runtime qualifications. No Wings assets, code,
fonts, panels or dependencies were copied.

## Ranked differentiators and concrete transfer decisions

1. **Confirm outcomes, not just button presses.** Wings' `GameSession.onEvents`
   routes authoritative `hit` events to impact effects, damage direction and
   numeric hitmarkers; `kill` has a stronger marker/banner. Its HUD protects the
   kill marker from subsequent ordinary hits. Jankolock previously exposed shots,
   abilities and kills, but not nonfatal confirmed damage. **Integrated:** one hit
   event in shared `damageActor`, used by both bullets and slam; actual HP damage
   and shield absorption, target coordinates, short hit X/label, separate incoming
   label and stronger kill label. Cover, immunity and decoys cannot fake actor-hit
   confirmation. Kill display takes priority over subsequent ordinary hits.
2. **Teach the current action in the current state.** Wings' lobby exposes Controls
   as a first-level action; `controlRows` follows the steering scheme, and spawn
   details explain actual roles/loadouts. Jankolock's detailed controls were tucked
   behind a closed details element. **Integrated:** a short primer immediately
   before Start, plus actionable empty/held/contested-ring, overtime, death and
   spawn-protection guidance in the existing status line. No tutorial modal or
   mandatory extra launch step.
3. **Each important outcome has its own audible meaning.** Wings separates weapon
   sustain/stop, hit/explosion, warnings and menu actions through the session audio
   owner. **Integrated:** short original synthesized hit, hurt, friendly/hostile
   capture and respawn tones through Jankolock's existing oscillator cleanup/mute
   logic. Existing shot/ability/kill/round sounds remain; default sound stays off.
4. **Transitions own both input and the next action.** Wings' spawn/flying/dead and
   pause lifecycle enables/releases input, resets following at spawn and disposes
   session listeners. Jankolock already has guarded lobby/play/pause/result/draft
   transitions, input release and one bounded fixed-step RAF. **Integrated:** pause
   now focuses Resume; transient combat labels hide outside play and clear at a
   new round/reset. Preserved the existing engine state machine rather than
   installing another menu controller.
5. **Camera responsiveness is intentional, not maximal movement.** Wings uses
   frame-time exponential chase/orientation smoothing, direct cockpit/gunner
   views, terrain clearance, model-specific sight offsets and a spawn follow reset.
   Jankolock already projects the whole arena consistently and inversely maps the
   pointer. **Preserved:** fixed tactical overview and interpolation; no chase,
   cockpit, camera shake or smoothing of aiming. Flying-camera motion would hide
   flanks/cover and disrupt a stable tactical aim plane.
6. **Death and history explain what happened without delaying the next decision.**
   Wings has a local-emphasis killfeed, brief death view and ordinary hangar return.
   Jankolock already has a 3-second respawn, collision-aware spawn candidates,
   protection, per-round kill/capture reports and between-round item drafts.
   **Integrated:** explicit respawn/protection explanations and a return cue.
   **Skipped:** another killfeed/history store, death camera, selectable aircraft
   respawn flow or copied panels. Four actors and existing reports do not justify
   those systems; the existing 64-event tail remains bounded.
7. **Code craft follows ownership.** Wings separates input, simulation, renderer,
   HUD, audio and session disposal, with source recovery through `port.patch`.
   Jankolock's small immutable data / private mutable engine / UI split is already
   appropriate. **Integrated:** feedback originates at the shared damage boundary,
   not hit guesses from sprites, projectile disappearance or HP polling. Reused
   the event tail, RAF, palette, audio and native controls; no framework, transport,
   global state grants or extra animation loop.

## Comparison table

| Area | Wings, inspected behavior | Jankolock before | Jankolock after / decision |
| --- | --- | --- | --- |
| Menu flow | Solo / bots / custom / Controls / Settings; keyboard navigation, spawn and pause return paths | Direct hero selection, Start, optional trophy hall; round report then draft | Preserved faster direct flow; Pause focuses Resume; feedback stays out of menus |
| Onboarding | First-level Controls; scheme-specific reference and selected-role descriptions | Hero kit cards; detailed inputs collapsed; generic play status | Visible pre-Start primer; state-specific objective, death, overtime and protection hints |
| Feedback richness | Confirmed numeric hitmarker, stronger kill, directional damage, effects, audio, killfeed, contextual HUD | Muzzle flash, bullets, actor/health HUD, simple action/round tones | Confirmed impact X, HP/shield labels, incoming/kill priority and distinct outcome tones; no copied panels |
| Input latency | Samples each frame; fixed simulation/local prediction and immediate local weapon hints; clears old seat triggers | Native pointer/keys/sticks sampled by a 60 Hz fixed-step loop, interpolated drawing | Unchanged; HUD/fire worker owns firing response. No new delay or smoothing in input. No measured end-to-end latency claim for either game |
| Camera controls | Chase/cockpit, free-look, zoom/gunner views; frame-time smoothing and spawn follow reset | Stable whole-arena oblique projection; inverse pointer mapping; no camera controls | Intentionally unchanged for tactical sightlines and stable aiming; impact marker uses that same projection |

Wings is a strong reference for feedback hierarchy and lifecycle, not universally
superior: its menus are keyboard/mouse-oriented, mobile layout is not touch
flight, rights are unresolved, and fresh native flight/audio were not accepted by
this comparison. Its generated runtime was inspected read-only. The source patch
provides authored lifecycle/camera/input context; generated `game` and `scene`
chunks corroborate hitmarker, event routing and smoothing behavior. This is not
a full upstream engine audit.

## Verification and visual review

Commands and actual output:

- `node --check Games/Jankolock/engine.js`, `node --check Games/Jankolock/ui.js`
  and `node --check scripts/test_jankolock_engine.mjs`: exit 0.
- `node scripts/test_jankolock_data.mjs`: `PASS jankolock data`, including 243
  four-draft paths and 1,423 legal inventories.
- `node scripts/test_jankolock_engine.mjs`: `PASS engine fixtures` and
  `PASS deterministic two-round normal-input replay`. Added immunity, shield,
  effective overkill, dead-target, cover and shared slam-feedback assertions.
- `python3 -B scripts/test_jankolock_browser.py --port 8937 --seconds 300`:
  `PASS: rounds=2 checks=3 errors=0 wall=83.96s`. Final source tested, desktop
  sound enabled after confirming default-off; mobile retains the muted path.
  Two real Dispatch wins (kill then capture), item/stat application, deaths and
  respawns, both visible combat-feedback channels, reset, simultaneous 320px
  touch move/aim/fire, cancel, Q, frozen pause/resume and focused Resume passed.
- Catalog validation: `PASS catalog: 128 unique IDs, required schema, all entry URLs tracked`.
- `git diff --check`: exit 0. Added runtime requests/dependencies: none.

Native runner produced 26 screenshots and 26 layout checks. Reviewed desktop
light/dark gameplay and dark lobby, mobile light lobby and light/dark gameplay,
including incoming damage and respawn states. Controls meet 44px and no horizontal
overflow was detected. Flat paper/ink, local fonts and Dispatch/Returns styling
remain. The existing 320px arena is still too small for precise aiming; this is
not claimed as handheld ergonomics acceptance. Labels use a wrapping grid stack,
not fixed competing offsets. Small static impact markers do not add camera shake,
full-screen flashes or optional decorative motion.

Artifacts remain in the runner's RAM evidence directory, printed by the command:
`browser/result.json`, `browser/desktop-{light,dark}-gameplay.png`,
`browser/mobile-{light,dark}-gameplay.png`, and lobby/draft/results/reset captures.
They are volatile evidence, not committed artwork. A separate bounded current
Wings browser probe captured `comparison/wings-{1440,390}-{menu,controls}.png`:
2/2 menu -> Controls -> Escape return sequences, zero page errors/external
requests. Reviewed desktop menu and mobile Controls; Wings uses its existing dark
palette rather than a fabricated light theme. No Wings flight was launched.

No full 128-game fleet smoke, hardware performance/physical input acceptance or
audio listening acceptance is claimed. Existing engine fixtures and native proof
are not substitutes for a separately authorized full release gate. No publication
or push; no new game, model, asset ingestion or registration.
