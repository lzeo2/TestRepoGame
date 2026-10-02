# Free Throw maintenance manual

<!-- maintenance-game: Games/FreeThrow -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **152**, category `sports`, not featured. Entry: `Games/FreeThrow/index.html` ([local entry](../../../Games/FreeThrow/index.html)). Tracked tree: **2 files, 17,662 bytes**; entry blob `1fea822550cd2a5ed51c37e0dc91ee1aef3d7c18`. Existing ingested DOM-animated basketball adaptation. No external runtime script/font/asset is referenced. Source-grounded controls are clear, but restart/scoring defects below are static findings, not newly observed browser outcomes.

## Implementation map

The single `index.html` defines CSS court/backboard/rim/net and DOM ball; no canvas/compiled engine. Key IDs: `gameContainer`, `ball`, `power-level`, `shoot-button`, `aim-left/right`, `space-indicator`, `score`, `shots-left`, `shot-clock`, `startOverlay`, `game-over`, `playBtn`, `restart-button`. `startPower` oscillates meter with a 20ms interval; `shoot` snapshots relative geometry, subtracts a shot and computes velocity from power-quality/aim offset. `animateShot` applies gravity, draws position, calls `bounceOffRim`, detects scores/bounds and schedules RAF. `endShot/resetBall/startShotClock` manage the next attempt; `gameOver/restartGame` manage round overlays.

**Source review coverage:** complete HTML/CSS and every inline listener/function read, shipped MIT notice and source dossier read. No unread binary/minified game engine is present. Native physics trajectory and screenshot quality were not reviewed.

## Gameplay and controls

Start button enables play and a 24-second clock. Hold Space or mouse/touch Shoot, release near 70% power; Left/Right or labeled aim buttons change aim. Ten attempts, two points per made basket, 12-point win target. Clock expiry consumes an attempt. R restarts only when playing; result button restarts after end. Arrow buttons are 46px, Shoot at least 52px high, explicit focus-visible styles are present. Keyboard aiming itself does not cancel browser arrow scrolling. There is no audio. The source comment promising one score per shot is not enforced by a latch.

## State and persistence

Globals own score, shots, clock, power, aim, animation/hand/Space/playing flags and velocities. No persistent key/save mechanism. Shot clock interval is cleared on shoot/end; power interval is cleared on shoot/gameOver but not reset/clock-violation transitions. Each shot's RAF ID is untracked. `restartGame` resets score/ball/clock but leaves old RAF and flags alive, so a mid-flight restart can mutate the fresh round. CSS court geometry is read live; ball starts with a centering transform and retains that transform during numeric left/top animation, a visual-versus-collision coordinate concern to verify natively.

## Dependencies and provenance

Header and [source dossier](../../catalog_parts/sources_10.md) identify https://github.com/jeremymartinezq/Basketball-game at `2bf12dc1f9c29c9e2be2b538076d2f2033103d32`. `Games/FreeThrow/LICENSE` contains MIT and the 2025 jeremymartinezq notice. Evidence is repository-local, not newly fetched upstream proof. Changes include ten-shot/12-point round, rim collision and flat styling. Preserve the notice and attribution; do not invent separate artwork dependencies. All visible geometry is CSS/system type.

## Audit findings

- **HIGH, mid-shot restart corruption:** `restartGame` does not cancel RAF or reset `isAnimating/spacePressed/powerInterval`. Reproduce shoot then R before bounds; old `animateShot/endShot` can run against reset counters/ball. Root fix: one cancel-round-work function used by restart/gameOver, tracked RAF/token, reset all input/animation flags before fresh clock.
- **MEDIUM, score counted repeatedly:** `animateShot` increments score whenever overlap predicate matches, with no `scoredThisShot` flag. Lowering downward velocity does not mathematically prevent next-frame overlap. Minimal fix: per-shot latch initialized in shoot/reset, set on first valid descending crossing; prefer previous/current position crossing over occupancy alone.
- **MEDIUM, charging lifecycle:** Shoot binds mouseup/touchend only on the button, no mouse capture, cancel or blur reset. Release outside, or hold through clock expiry: charge interval can outlive the attempt. Use native pointer capture/cancel with shared stop-charge/reset handling.
- **LOW, frame-rate-dependent physics:** gravity/velocity update once per RAF without elapsed time; rim bounce calculations and DOM transforms need real-hardware checks before recalibration.
No storage-security bug applies because this game has no persistence. Syntax success does not refute lifecycle/scoring findings.

## Safe iteration

Keep MIT notices and upstream power/aim physics identity. The smallest authorized repair centralizes timer/RAF/input cleanup and per-shot scoring state; do not add guards to only the restart button because R and clock expiry share the defect. Treat CSS ball center and numeric coordinates as one invariant. Preserve native buttons/labels and local-only dependency closure, with focused regression checks rather than a game-engine rewrite.

## Verification

**Actually run:** inline script parsed with stdin `node --check`, Git inventory and license/source inspection. Native tests and screenshots: **zero**. Sparse syntax reproduction: Python HTMLParser extracts inline script from `git show HEAD:Games/FreeThrow/index.html`, then pipe JavaScript to `node --check`.

Recommended Main native cases: Start, near-green made shot and poor-release miss, left/right aim, one basket adds exactly two points, all ten attempts and both verdicts, 24-second violation, charging through expiry, mouse release outside/canceled touch/blur, R mid-flight and mid-charge, result restart. Check 360px geometry, scroll prevention, high-refresh timing and scoring/visual alignment. No worker browser or full smoke was spawned; unfiltered catalog gate stays Main-owned.

## Future outlook

Week 1: reproduce restart/duplicate scoring and retain ingest evidence. Week 2: approved cancellation/latch repair with one runnable regression. Week 3: pointer lifecycle and keyboard focus/score announcement review. Week 4: real hardware timing and small-screen rim geometry. Defer sound, extra modes and cosmetic refurbishment until round accounting and restart are trustworthy.
