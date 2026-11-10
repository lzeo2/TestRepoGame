# Steal a Footballer: targeted continuation, 10 November 2026

The owner requested an up-to-date checkout, more recognizable stylized human
footballers, harder progression and better gameplay feel. Specific failures were
weak close finishing, easy dribbles past defenders/keepers, and no shot after
rounding a keeper. The owner selected a 20–30 minute first-superstar target and
explicitly authorized low-impact playtesting. This supersedes the October stop
for these targeted checks. No push or release was requested.

## Scope and source review

Fetched origin and fast-forwarded `main` by 938 commits to `31680023`, with no
local commits ahead. Initial game tree/entry hashes matched the Git inventory.
This is the existing owner-authorized solo port from private source `30b0c28`;
the upstream notices, catalog identities, source world and prices remain.

No game was added, ingested, replaced or newly registered. The catalog stays at
132 registered games; the inventory covers 138 projects plus shared runtime.
No authored change touches Character AI, proxy policy or the portal bundle.

## Changes and delegation log

| Commit | Change | Owned paths / review digest |
| --- | --- | --- |
| `ef197acd` | Keyboard and modal focus | Delegations 2/4: `js/app.js`, `js/input.js`, `tests/input.mjs`. HUD movement keys work; native form/activation behavior stays available; inert background, tactics focus restoration and Tab containment. |
| `145dec68` | Human proportions | Delegations 1/3: `js/actors.js`, `tests/actors.mjs`. Tapered shirt/shorts, longer legs, narrower shoulders, rounded anatomy and retained appearance profiles; six articulated groups and geometry cleanup remain. |
| `47e12cf3` | Finishing and contested possession | Delegation 5: `js/match.js`, `tests/match.mjs`. Urgent central AI chances precede normal delays/duels; keeper location affects finishing; keepers contest nearby carriers; reachable practice pressure. |
| `8fc61a3b` | Bounded browser checks | Delegation 6: `tests/browser.py`. Optional quick/low-impact mode, existing browser executable support, keyboard/focus and native touch checks; skipped checks are explicitly recorded. |
| `31fdada0` | Progression and presentation follow-up | Root: game/UI balance, regression updates, curved facial hair, on-demand model preview, port contract and maintenance manual. |
| `fc48cd2e` | Debrief consistency | Delegations 8/11: the independent progression review found old four-goal copy; `js/app.js` now describes advancement after every win. |
| `f4a6a716` | Keeper restart guard | Delegations 7/10: the independent match review reproduced immediate distribution after a foot collection; the AI now respects closed phases, with an actual-step regression. |

The orchestrator reviewed actual source diffs and the desktop/mobile/model
captures. Workers used the requested `gpt-6.1-sol` model, committed explicit
owned paths, and did not push. Delegation 9 independently checked geometry
cleanup, input behavior and retained evidence without finding a clear defect.
The initial economy read-only review found no
clear theft/save defect; the later progression changes address the owner's
balance request rather than relabeling documented non-resumable carry state.

Passive income is 60% of the exported rate. Fresh NPC plots offer starters;
later raid pools stay below the most expensive owned recruit and cap at Rare.
Refills take 90 seconds and raids trigger 45-second rival shields. Icon event
signings require six wins, with tokens earnable before unlock. Opponents start
stronger and advance one practice tier per win, capped at three. Saved players
and currency remain intact. Fractional income is visible in the UI.

The `playwright` skill was installed in the user's skill directory. The existing
repository Python browser runner was used with a user-profile Playwright
binding and already installed Chromium. No build tooling or repository
`node_modules` was added. No external model wishlist is needed for this
procedural style pass: the requested silhouettes were created in code.

## Verification

All five focused Node suites pass: input, game, match, actors and world. Match
checks include both attacking directions, urgent finishing, beaten keepers,
bad-angle restraint, manual Icon shooting, legal indirect restarts, keeper ball
contests, practice pressure and eight complete seeded simulations.

Actual output excerpts:

```text
PASS input shortcuts, native activation, rerender focus and modal tab containment
PASS actors: adult proportions; 125 source profiles x3 kit patterns; max 2826 triangles; geometry release.
PASS catalog: 132 unique entries, schema valid, all URLs tracked.
PASS syntax: five authored modules and model preview
42 browser acceptance checks passed; 2 skipped
PASS: 138 game documents cover 132 registered + 6 unregistered games; Git inventory current.
```

Game regressions cover slower income, early Icon purchase rejection without
spending tokens, rival tiers/refill/shields, progression tiers, traits/training,
market actions, battle reward locks, theft/defense and save recovery. World
fixtures preserve 3,095 static primitives, 261 stadium parts, 12 bases and all
appearance/pose combinations; maximum tested actor count is six meshes and
2,730 triangles. Three kit patterns reach at most 2,826 triangles.

The browser pass used one browser, sequential isolated contexts, low graphics,
muted audio, device scale 1 and roughly 30fps animation callbacks. It passed 42
checks, including normal purchase/sale/reload, HUD keyboard movement, Escape
resume, modal inert/Tab containment, tactics focus, kits/staff/upgrades/events,
22-player match start, paused income, spectator/zoom, moving players, ability
and substitution UI, native CDP touch joystick movement and mobile panels.
It retained no page exceptions or missing assets. The two explicit skips are
completed-match reward settlement and debrief contents. The full-fleet gate was
not run, since no push/release was ordered. Both browser and HTTP server ended.
This browser run precedes the two final cross-review fixes. The keeper-delay
regression and complete targeted match suite passed after its fix; the debrief
copy received syntax/diff checks. No additional browser session was opened.

Reproduce the focused source checks with:

```sh
node Games/StealFootballer/tests/input.mjs
node Games/StealFootballer/tests/game.mjs
node Games/StealFootballer/tests/match.mjs
node Games/StealFootballer/tests/actors.mjs
node Games/StealFootballer/tests/world.mjs
python3 -X utf8 -B scripts/check_maintenance_docs.py
```

For the browser runner, generate an isolated rich fixture using
`tests/fixture.mjs`, serve the repository locally, and pass `--fixture`,
`--quick`, `--low-impact`, `--executable-path` and `--artifacts`. It does not
modify the owner's actual browser save or Roblox wallet. The model review
fixture is `Games/StealFootballer/tests/actors-preview.html`; it renders only
when the selection/view changes. JavaScript parsing, Python AST parsing,
catalog/Git URL checks and `git diff --check` passed. Added source introduces
no external loads or machine-specific paths.

## Captures and limits

- [Messi, Cristiano Ronaldo and R9](steal-footballer-2026-11-10/icons.png)
- [Maradona, Neymar and Mbappe](steal-footballer-2026-11-10/superstars.png)
- [Desktop match](steal-footballer-2026-11-10/desktop-match.png)
- [Mobile world](steal-footballer-2026-11-10/mobile-world.png)
- [Browser check results](steal-footballer-2026-11-10/browser-results.json)

The game has one fixed presentation theme; no second game theme was introduced.
The six previewed players are stylized approximations, not sculpted or certified
likenesses. Exact per-player likeness, full normal-input match/debrief, manual
penalties, substitution outcomes, theft/deposit browser acceptance, physical
mobile/GPU performance and offline acceptance remain open. The 20–30 minute
first-superstar preference remains a pacing target; this short pass does not
establish real-session completion time.

Game source grows from 2,836,570 to 2,861,215 bytes (+24,645 bytes, 26 to 30
files). Four captures total 355,495 bytes, with 2,327 bytes of browser results.
About 106 GiB remained free at completion. Pre-existing untracked
`.gitignore.txt` and legacy `react-app/` leftovers were preserved. No push.
