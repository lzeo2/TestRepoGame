# Mini Golf: maintenance manual

<!-- maintenance-game: Games/MiniGolf -->

## Identity and status

Registered ID 202, category `sports`, featured `false`. Entry: `Games/MiniGolf/index.html` ([open source](../../../Games/MiniGolf/index.html)). Source baseline `8c8a055`; 5 tracked files, 13,252 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: read full `game.js` and inspected entry/CSS/credits/license in bounded source views; no vendor engine is present. `index.html` provides a 520x420 `#game`, HUD `#strokes/#hole/#best`, `#message` and `#restart`. The IIFE boots `newGame`, then one perpetual `requestAnimationFrame(loop)`.

`newHole` resets ball and one central rectangular obstacle and calls `placeHole` for a random upper-field cup. `pos` maps CSS-scaled coordinates to backing pixels. `putt` caps pull distance at 120, sets velocity, and increments strokes. `update` applies friction, wall/obstacle bounces, then slow-speed cup detection. `draw` paints the board, aim line and flagstick. This source is a randomized endless-hole game, not the six authored holes described in historical `sources_10.md`.

## Gameplay and controls

Playable on load. Mouse/touch pull from near the ball and release to putt; arrow keys modify keyboard pull and Space/Enter shoots. Sinking displays the current stroke count and starts another hole after 1.2 seconds. There is no finite course win/loss; do not add one merely to satisfy a template. The button says Restart Hole but calls `newHole(true)`, resetting the hole number and total strokes too.

## State and persistence

Closure variables own ball, cup, obstacles, total strokes, hole number and aim. `minigolf-best` stores a numeric best with guarded read/write. However strokes accumulate across holes, so best compares cumulative run strokes, not per-hole performance. `pull` survives restarts. The next-hole timeout is not stored or canceled by restart. One animation loop runs throughout; new-hole calls do not start additional loops.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/gamelabz/html5-game-mini-golf, revision `742dc3530869d51ef8e4fb601a200202a62def81`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit. Historical catalog-parts reports describe an earlier self-made implementation under this title and must not override the current local credits/source.

## Audit findings

- MEDIUM, `game.js::update` sink timeout and `newHole`: restarting within 1.2 seconds of a sink still allows the old callback to advance the new game. Recommended repro: sink, immediately restart, wait. Minimal fix: retain/clear transition timer or invalidate it with a session token in the shared reset.
- MEDIUM, `game.js::showKeyAim`: keyboard vector is `aimStart - mouse`, whereas drag pull uses initial ball point minus pulled pointer. Default `{x:0,y:90}` shoots downward toward the bottom from the initial ball position. Native test should verify advertised aim semantics; fix the keyboard coordinate construction, not physics.
- LOW, `game.js::draw` uses `createLinearGradient` despite credits describing gradient removal. This is a source-policy mismatch, not a loading failure.

## Safe iteration

Patch lifecycle in `newHole`, where button, initial boot and delayed progression converge. Preserve guarded storage; decide whether best is per-hole or run-based before migrating `minigolf-best`. Correct keyboard aim without modifying mouse physics. Do not replace this port with the historical in-house course.

## Verification

Recommended native sequence: compare mouse drag, touch pull and keyboard shot direction; sink twice and observe cumulative strokes; restart during sink delay; reload with valid/corrupt/denied best storage. Test touch cancellation and release outside the canvas. Inspect reduced-motion shell and mobile HUD, not only canvas dimensions.

Actually run: Git blob inventory and `node --check` via standard input for 1 external/inline script units, 1/1 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/MiniGolf/game.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: delayed-reset race and consistent keyboard aim. Week 2: clarify restart/best labels, visible status announcements and focus. Later: deterministic hole fixtures for bounce tests and frame-rate-independent friction after measurement. No course expansion or generated assets are authorized here.
