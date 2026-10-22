# CITISTEN UI API and maintenance

## Ownership and entry

UI-only lane: `Games/Citisten3D/ui.mjs`, `ui.css`, `ui-preview.html`,
`ui-preview.mjs`, `ui-qa.py`. No simulation, world mesh or camera maths here.
`ui-preview.html` is a labelled standalone preview, not the game entry.
The main integration lane owns `index.html` and gameplay input wiring.

## Mounting contract

```js
import { createUI } from './ui.mjs';
// Load ui.css in the document. root is an empty div over the world canvas.
const ui = createUI(root, {
  onStart(mode) { /* create/reset simulation: 'free' or 'defense' */ },
  onTool(type) { /* integration selects placement tool */ },
  onMenu() { /* pause simulation while main menu is open */ },
  onResume() { /* restore previous speed */ },
  onRestart(mode) { /* reset same mode */ }
});
ui.update(sim.state, { roads: world.roads, size: 200 });
const events = sim.drainEvents(); // integration consumes ONCE per frame
ui.events(events); // same array may also go to world FX
ui.setTool('residential'); // reflect integration-owned keyboard shortcuts
ui.showMenu();
ui.destroy(); // listeners, timers and DOM removed
```

`onStart` and `onRestart` run synchronously before the menu closes. Throwing
keeps the menu visible and shows an error. Return a promise only if integration
handles its own loading/error state. Start automatically exposes the game HUD;
`update` with `phase:'lost'` opens the loss dialog once. `showGame()` also
exposes the HUD for sim-lane screenshot harnesses. `showMenu()` keeps an
already-acknowledged loss acknowledged, so subsequent lost-state updates
cannot reopen the dialog over the menu. Updating with a non-lost state
resets loss detection when replacing a simulation externally.

## Tools and state

Tool IDs: `road`, `residential`, `commercial`, `industrial`, `power`, `water`,
`police`, `fire`, `park`, `wall`, `barricade`, `watchtower`, `bulldoze`.
Barricade is disabled: the published simulation API does not implement it.
Town hall is pre-placed and has no placement tool. Keyboard hints are text
only: `1` road, `2/3/4` residential/commercial/industrial, `5/6` power/water,
`7/8/9` police/fire/park, `B` wall, `N` watchtower, `X` bulldoze.
Integration owns actual hotkeys. Initial selected tool is `road`; initialise
the integration's placement selection to match, or call `setTool` on start.
Tool buttons expose `data-tool` and
`aria-pressed`; group buttons expose `data-group` and `aria-expanded`.

`update` reads the published sim state without mutation: budget/population,
power/water demand and supply, demand by zone, mode, phase, night, score,
kills, peakPopulation, townHallHp/MaxHp, buildings and zombies. Roads use the world's documented
read-only `cells` Set and `cell(key)` method. No undocumented adapters.
Minimap is a top-down 2D data snapshot, not a world renderer. Night blips are
shown only in defense mode during `phase:'night'`. The map starts collapsed
on phone widths and remains expandable. Loss stats use peak population,
not the surviving population.

## Notifications

Pass the sim event array to `events`. UI handles placed/removed/blackout,
wave-warning/wave/milestone/night-survived/repaired. Placement bursts collapse
by event type; duplicate text is suppressed for eight seconds. At most three
polite toasts are visible on desktop, one prioritised notice on phone widths;
wave/blackout warnings take precedence over construction and milestones in
the same batch. Each expires after six seconds. New runs clear old feedback
and initialise the Road selection before invoking the integration callback.
Shots, damage and kills do not create toasts. UI never calls `drainEvents` itself.

## Style, sources and evidence

Generated original mockups: `docs/citisten-design/ui-mockup-*.png`.
Solid surfaces, one ochre interaction accent, black buttons, 4px corners,
local Bungee/Atkinson with readable fallbacks. Portal-style `data-theme`
and guarded localStorage, with an isolated `citisten-theme` key and dark
default. Light toggle does not alter the portal preference.
No copied game UI or assets. Local font provenance remains in
`docs/portal-font-sources.md`. Genre mechanics are references, not art sources.

## Verification and limits

Run `python3 -B Games/Citisten3D/ui-qa.py` with no other Chromium gate active.
It pins system Chromium, uses an isolated loopback server, and terminates both.
It exercises documented APIs against labelled fixture state, not gameplay.
Screenshot output: `docs/maintenance/audits/citisten-QA/J-ui-*.png` and
J comparison collages. These are evidence for reviewer grading, not acceptance.
C/D/F/G/H/I integrated gameplay gates belong to the integration lane.
Initial browser regression produced 36 fixture screenshots and 10 collages
with zero console/page/network errors. Screenshot review then found a narrow
tool-label fit issue and a toast/banner edge overlap. Tooltips are positioned
against the options panel so edge buttons cannot push hints off-screen. A loss-to-menu edge and
minimap town hall drawing order were also corrected with new regression
assertions. A subsequent 320px screenshot review also found stacked notices
touching the tool options; phone feedback now coalesces to one urgent notice.
New runs clear old-session notices and reset initial tool feedback. Final-source
evidence is pending the shared browser queue.
Harness-only corrections during initial QA: native Tab rather than programmatic
focus for `:focus-visible`, reset HP/budget fixture values between themes, and
a braced Playwright storage override so the returned function is not invoked
by the test driver. No UI assertions were removed to obtain a passing run.
Native touch gameplay, screen-reader review and target-device tests remain held.
Main owns canonical maintenance inventory updates and full fleet/no-push gates.
