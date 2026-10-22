# Heroes: evidence handoff, not an acceptance grade

## Delivered phases

1. Read shared contract and previous postroom lore; no 2D gameplay port.
2. Captured real Foldwild reference; generated two codex-imagen mockups before
   hero UI implementation. Flat authored CSS, local fonts, one UI accent,
   dark/light themes, Arcade navigation and touch controls.
3. Built four original hero meshes, the shared movement/shoulder camera,
   sixteen kit abilities and geometry FX. Exported baseline JSON for systems.
4. Exercised Node regressions and normal browser input, reviewed screenshots,
   tightened shoulder/muzzle framing, and repeated the full hero-only check.

## Files and scale

- `Games/Jankolock3D/heroes/`: 14 authored files, 1,881 LOC including tests,
  browser runner and integration manual; runtime HTML/CSS/modules are 1,144 LOC.
- Four entries: `devhero-1.html` Stampead, `devhero-2.html` Turretina,
  `devhero-3.html` Snipeoff, `devhero-4.html` Gooey Sticky.
- Shared modules: `player-controller.mjs`, `hero-visuals.mjs`,
  `hero-runtime.mjs`; shared page: `devhero.mjs` / `devhero.css`.
- Baseline definitions: `docs/jank3d-hero-kits.json` (55 LOC).
- Contract/API/limits: `Games/Jankolock3D/heroes/HEROES.md`.
- Updated `docs/maintenance/games/unregistered-jankolock3d.md` and the existing
  Jankolock3D inventory record only. Other teams own their source/manual claims.
- Mockups: `docs/jank3d-design/ui-mockup-heroes.png` and
  `ui-mockup-heroes-mobile.png` (generated before UI).

Hero source commits: `7451d8e` controller; `03bc3be` meshes/FX; `c9bb9b9`
kits/harnesses; `b7e442a` shoulder/muzzle framing. Evidence/inventory has its own
following documentation commit. No registration, catalog edit, push or new game
addition by this team. Existing catalog remains 127 entries; this rebuild is
original work under the operator's existing-game order, not an ingested port.

## Actual check output

```
player-controller-test: 808 assertions passed (Node only; native camera/input acceptance unproven)
PASS: 4 heroes, 16 unique kit FX + 7 generic FX; positions, depth, links, expiry, cap, disposal
hero-runtime-test: 16 kit casts, cooldown/expiry/cleanup, cover, headshots, tether break, slide ammo, turret, grenade bounce and healing checked (not native acceptance)
hero-qa: 4 hero pages HTTP 200; 34 screenshots; 23 observations; 0 retained errors. Reviewer acceptance pending.
PASS: 133 game documents cover 127 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
Catalog: 127 entries; unique integer IDs, required schema and tracked URLs OK
```

Authored module `node --check`, Python AST parse and `git diff --check` also
returned exit 0. External-load scan found only the relative kit fetch, SVG
namespace identifiers, local QA server and documentation reference URLs.
There are no added remote runtime loads. The browser runner also blocks and
records external requests. The Node output's native-unproven qualifier is the
unit runner's scope, not a substitute for the separate browser observations.

## Screenshot evidence for E

38 hero-prefixed PNG files in this directory:

- `heroes-{1..4}-ability-{1..4}.png`: sixteen normal-input ability captures.
- `heroes-{1..4}-{light,dark}.png`: eight hero page captures.
- `heroes-pointerlook.png`, `heroes-aim.png`, `heroes-double-jump.png`,
  `heroes-dash.png`, `heroes-slide.png`, `heroes-camera-wall-clamp.png`.
- `heroes-mobile-{light,dark}.png` and `heroes-mobile-full-{light,dark}.png`.
- `heroes-foldwild-reference.png`, `heroes-fx-contact-sheet.png`.
- `heroes-mockup-vs-implemented.png` and
  `heroes-mobile-mockup-vs-implemented.png`: labeled generated/runtime twins.

`heroes-browser-report.json` preserves each capture's filename, RGB variance
and read-only observation. Desktop frames are 1280x720; genuine mobile frames
are 390x844 or full-page, and labeled twins/contact sheets have montage sizes.
No blank images passed the script's variance threshold. No production state
setters, forced-time advance or game-state grants were used for native input.

These are builder evidence for criterion **E**, not a PASS grade. The independent
reviewer must assess the sixteen distinct FX, camera and movement themselves.
No A-D or F-I grade is claimed; even HTTP/variance observations do not replace
reviewer criterion I grading of the assembled game.

## Holds and integration blockers

- Systems adapter is not written by this team. Generic systems damage currently
  has a 32m range, separate ammo/timers and no kit-healing/status adapter. It must
  reconcile kit range, slide ammo, magazines, headshot/spirit scaling, healing,
  slow, parry and invulnerability without direct HP mutation or double scaling.
- World zipline/teleporter/vent flow and rotated ramp slab collision are separate
  integration work. Isolated AABB/controller tests do not establish the combined
  world path. Active reveal tracks captured target positions, but new spawns and
  dead targets are not reselected during its six-second lifetime.
- Target-hardware performance, real handheld ergonomics, full-match behavior,
  balance and independent E grading remain unverified. Software Chromium is not
  a GPU acceptance substitute. No full-fleet smoke or release gate was run.
- Earlier native runs failed on synthetic Escape and a lock-entry input race;
  real input handling was repaired and fresh complete runs succeeded. The
  Hermes advice ticket `pi-2013739-1792620736344-cfba482a` supplied diagnosis, not
  acceptance or a waiver. The initially missing shared spec was subsequently
  provided and read before implementation.
- Working-tree remainder outside the owned hero paths is the world team's
  `docs/jank3d-design/ui-mockup-world-controls.png`; it was not staged or removed.

Shared free storage was 4,217,741,312 bytes at initial inspection and
4,179,648,512 bytes at the pre-evidence-commit checkpoint, a 38,092,800-byte
decrease including concurrent teams. No broad checkout, browser install,
third-party dependency installation or deletion outside the worktree occurred.
