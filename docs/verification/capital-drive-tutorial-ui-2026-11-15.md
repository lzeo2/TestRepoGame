# Capital Drive tutorial, interface and UI work verification

15 November 2026. Existing original game245, continued from merged PR26
`552e40d8908f24b9f2b95e93d3d979279b8b21a5`. The owner requested continued UX,
UI and optimisation work plus a tutorial. The
[contract](../capital-drive-tutorial-and-ui-contract.md) and
[manual](../maintenance/games/245-capital-drive.md) give state ownership and
reproduction commands. Existing fleet/hardware limits remain separately dated.

## Scope and source checks

`tutorial.js` adds nine observed lessons with strict independent preferences,
fresh action baselines, pause/relocation rejection, explicit menu observation,
Skip/replay and exactly-once bounded events. The controller uses real input,
poses and successful menu actions, keeps career writes separate and protects
attacks while guided play is active. Actual-function regression executes the
controller adapters for successful/denied menus, connected/unconnected routes,
preference-only saving, denied storage, no body/career writes and retained
ordinary-job attack protection.

`activity-ui.js` caches the existing panel's nodes, compares properties before
writing and reuses cue tiles. Its DOM fixture verifies3600unchanged renders with
zero additional writes, queries or element creation; active progress, grips,
prices, car/scooter sequences, terminal/leave/clear/disposal still update.
Empty snapshots use shared constants. The controller still drains every real
event and validates matching work/fitness sessions through the original owners.
The existing paid gym/controller and character-switch suites pass unchanged.

The start screen is shorter, Help works before play and from Pause/F1, native
topics group controls, mobile header/credit targets are enlarged, and light
focus/progress/wanted colours have stronger contrast. Hints/toasts no longer
cover the same mobile HUD areas. Successful manual routes return to play and
use the actual player focus rather than the parked car. Menu/renderer controls
before Start are disabled until they can act; Help remains available.

Source milestones: `28b0ba08` activity adapter/tests, `207af2a7` tutorial
owner/tests, `13d15fd1` actual-UI opt-out in existing native tests/profiler and
`1ef64d0c` controller/UI integration and regression. The opt-out touches33normal
Start sites in18existing files, retaining32clicks/one tap, all assertions and
gameplay setup. Seven old Start driving text selectors now use the stable Start
button ID after its visible label changed to Start game. Python AST parsing,
normalised old-logic comparison and diff checks pass; no state grants are used.

External focused source logs and SHA256:

- `capital-tutorial-state-source.log`: `854dc9eecb4fcf186afba0d7d3a0afa678d73fa29d81e94849da446c22632a01`.
- `capital-activity-ui-source.log`: `48f13e457bc1fcaa59747a97ceb0bb11cc03ed2daade5e306a9f4932c5affc3f`.
- `capital-native-tutorial-optout-source.log`: `5ea344687289c240d9f97317a2c577847fc3ca9b03ff9eee9860129799c2094b`.

The final full runner returned **PASS Capital Drive:273/273 commands passed**.
It requires80game JavaScript modules,95Node suites,12JSON files and192required
files total. Both Python cache checks, actual activity/controller/campaign rules,
all retained collision/streaming tests and `git diff --check` pass. Runtime is
the unchanged `1ef64d0c` integration; `9101be1e` adds only the native harness.
Maintenance inventory,134unique tracked catalog URLs and sitemap checks pass.
The external full log `capital-tutorial-ui-full-273.log` is44,840bytes, SHA256
`debed17095ceba48d68b8b3da1e87558df4279528e8c88ace402296722dddd9d`.

## Native tutorial and responsive UI

The baseline UI audit uses an exact PR26 export. Twenty cases/eight frames
exercise desktop1280×800 and mobile390×844 in dark/light themes, normal starts,
HUD, pause, shops, phone, Tab focus and Escape. No overflow/errors occur, but
mobile header controls are only33–42px wide, credits are too small, and the
start toast/interaction hint cover player status/minimap. There is no tutorial.
The baseline digest SHA256 is
`2e88a0ad7a7f06bd1711e61bb5f30f3fb2d99b1b3805e14e5d85f36ee9722104`.

`capital-tutorial-native-20261115-a2` passes137assertions across29UI states with
eight captures. Actual camera drag, E exit/entry, foot travel, car travel over10m,
S braking, successful manual route, Shops and Jobs complete all nine lessons.
Skip, opt-out after reload, replay, Done and stored completion use normal UI.
Starting cash, completed jobs and campaign progress remain unchanged. There are
no page/console errors, failed requests or external runtime loads.

The six runtime-source observations show only style.css changed during that run;
the tutorial/controller/simulation source stayed stable. This establishes the
functional path and its dated CSS caveat, not a falsely immutable final UI pass.
Final UI therefore uses an exact immutable `1ef64d0c` export in
`capital-tutorial-final-layout-20261115-a1`:134assertions,31states, seven frames,
60.03s. All six measured begin/end source hashes match. Header targets are at
least44px, keyboard focus/Escape work, controls fit, and toast/player-status plus
hint/minimap intersections are zero. The actual street-title/career intersection
is also zero at desktop/mobile in both themes; an earlier visual concern was
checked rather than turned into a layout claim.

The root reviewer inspected the actual desktop coach and mobile-light HUD/help
plus desktop-light Help frames. Guided play focuses the mobile lower HUD on its
coach; ordinary map and controls return after completion/Skip. The final layout
batch covers presentation/menu flow, not a second native full tutorial traversal
or touch-steering acceptance. All owned browsers/servers close after each run.

Final immutable layout results SHA256:
`d00846e26f9efc642dfc44417c8177239c802e7195a8376912ef464e3922b988`.
Its detailed final worker digest is
`fb483661d9ea8c38f7f9ad99d85df1bc4ee60bcc78ec904f82dd67a85842114f`.
The final harness SHA256 is
`6c264505da55475fa67343f6362773e9e2434f2197c43f5972876016b92306ee`.
All121exported game/shared files match the frozen source. The root reviewer also
inspected final mobile-dark coaching, mobile-light HUD, desktop-light Help and
desktop-dark start captures. Profile/layout runs deliberately block workers;
their start-screen cache-unavailable message reflects that test context.

Native a2 results SHA256:
`43546f9fc0e9148f272a5b336f039e9d91b3ff06e6e969f899ad1e8294e27386`.
Its worker digest is
`04dc53578bbdc27117ad3804168ed8ecaa50c03483a45b89b50d86fae0735b88`.

The retained a1 failed after15recorded assertions at57.39s. Its strict route
assertion observed about2m of ordinary coasting after Set route resumed the
world while the test still held S. The corrected harness genuinely stops the
car before that assertion, handles auto-closed map dialogs and uses Pause to
reach Shops on mobile. Collision or the production clock was not weakened.
Failed results SHA256:
`0dd6153e8b39c81c4bf5791cf2157feab78eafad13aa73e6f500a51485e2c709`.

## Paired cloud profiles

Baseline is an exact PR26 export; candidate is exact `1ef64d0c`. Both use actual
Street Life input,1280×800CSS, Performance quality,576×360backing canvas and
eight-second idle/driving/paused windows. Service workers are blocked to exclude
cache installation; guided controls are unchecked through the real UI. Simulation
and render-gate hashes are identical. These short time-based routes can finish
at different positions and are not statistical or target-device certification.

| Per approximately8s window | Baseline idle / drive / paused | Candidate idle / drive / paused |
| --- | --- | --- |
| ScriptDuration, seconds |1.5891 /1.4810 /0.04117|1.6218 /1.4276 /0.02956|
| Style recalculations |150 /288 /485|151 /166 /1|
| Layout count |42 /43 /1|39 /43 /1|
| Actual rendered frames |144 /165 /0|153 /166 /0|
| Software graphics CPU-seconds |29.10 /28.97 /0.05|28.18 /27.52 /0.06|

The activity adapter's write counter stays8→8 in all three candidate windows;
initial setup occurred before measurement. The strong finding is reduced repeated
DOM/style work, especially while paused, with real cues/scoring retained. Idle
script time slightly increases and active graphics remains the larger cost.
Do not describe the table as a guaranteed overall FPS or N100 improvement.
The software graphics process is multi-threaded; its CPU-seconds can exceed wall
time. RAF callbacks are not actual render counts. Both profiles have no errors.

Baseline report SHA256:
`970eaedd3b177d34fcf74cdbc06f019ca481db3cc3ea3269dcdf78c95bcdd0cb`.
Raw cpuprofiles, snapshots and paired-summary.json remain in the external
baseline/candidate directories. This work adds no new crowd/vehicle geometry,
reduces no collision coverage and changes no quality target or map population.
Candidate report SHA256:
`f143c00d530f806ccd1fc13b3008ea32fb617bd07d4b9a99d9a2f2e0225432ca`;
paired summary:
`b870ba1915065b5a1a451bdf8762915ed5330ced3535e3de192fcfd734553bf3`.

## Storage and acceptance limits

The generated local offline closure is99files/15,672,251bytes, version
`1853f457ac0c756621e59ab189c46d359db47ca28678f9482f83b9bca9088c34`.
Download storage remains scoped/hash-verified; tutorial preferences use their
own small key. Catalog134, geography/address/terrain data, shared car/font bytes,
protected game and proxy/backend remain unchanged. No new game is registered.
N100/8GB hardware, full-campaign completion and whole-city smoothness remain
unmeasured. Source/DOM fixtures are not substitutes for naturally earned career
rewards; the native tutorial deliberately earns none.

`capital-tutorial-cache-native-20261115-a1` passes19/19 in59.43s against the final
runtime with workers enabled: full99entry installation, zero warm page-map fetch
requests or origin module/map bodies with ordinary HTTP caching disabled, offline
reload/normal W/D driving and exact native career-save preservation. All error,
failed request and external request arrays are empty. Results SHA256:
`c66349b3342d61461a36d936037f78f469527f2a5ba06feed22c607e7d6dbf13`.

The Git-backed game tree grows96→98files and15,469,171→15,493,573bytes
(24,402bytes added). Cache closure grows97→99files and24,109bytes. These are
source/download bytes, not total browser RAM. No new game or catalog ID is added.
