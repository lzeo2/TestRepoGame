<!-- maintenance-game: Games/TronLightCycles -->
# Tron Light Cycles maintenance

## Identity and status

Registered ID **163**, category `arcade`, entry `Games/TronLightCycles/index.html`. Baseline `8c8a055`; five files, 428,531 bytes. This is local two-player light-cycle play, not a human-versus-AI engine. All script dependencies are local; current offline/browser behavior was not tested here.

## Implementation map

**Source review coverage:** complete HTML/inline CSS and `sketch.js` read, MIT notice and p5 license evidence inspected. The 393,537-byte minified p5 runtime was not human-reviewed in entirety. No asset/audio binaries occur.

HTML loads `p5.min.js` then `sketch.js` and calls `tronStart`. p5 owns `setup/draw`; setup creates a 600 by 600 canvas, two `Player` objects and a 15 FPS target. `draw` updates both riders, checks both tails for death and draws the heads/trails. `handleKey` is shared by `keyPressed` and touch-pad callbacks. `tronRestart` resets riders and pauses; `gameOver` resets both and fills the canvas with the winner's color.

`Player.update` stores the old coordinate in `tail`, advances by grid scale `20`, and constrains the head to the canvas bounds. `checkIfDied` scans own and opponent tail coordinates. This readable engine is small enough to review fully; only p5 internals are outside human coverage.

## Gameplay and controls

Player 1 uses W/A/S/D; player 2 arrows. Immediate reversal is rejected by comparing the current velocity. Two d-pads call the same direction API directly on touchstart/mousedown. The first round auto-starts. Space resumes after a reset; Restart itself pauses rather than beginning a live round.

Hitting a tail ends a round, with a transient winner-color fill followed by the paused title text. There is no cumulative score or textual winner announcement. There is no AI selector or AI movement code. The catalog's AI claim is therefore inaccurate, even though two-player play is implemented. Audio is absent.

## State and persistence

Globals own `player1/player2`, `paused`, canvas dimensions and scale. Each rider owns initial/current position, velocity, color and tail array. Reset empties the arrays; p5 continues drawing in paused mode. No localStorage, save key or network state exists. Tail collision scans and drawing are linear in trail length each frame, but rounds normally end on collision; profiling, not a speculative spatial index, should drive optimization.

## Dependencies and provenance

Header and [source record](../../catalog_parts/sources_3.md) identify Fábio Lourenço's `https://github.com/faboyds/Tron`, recorded revision `f95e35bc26f0c3778162c3de6e42a19c9fc60b2a`. Local `LICENSE-MIT.txt` carries that attribution. p5.js 0.6.0 is separately LGPL-2.1 with `p5-LICENSE.txt`; the header records p5 tag revision `a1599e958302d813a1848355cd9fe0d73b45a1ed`. These are committed evidence, not a fresh upstream comparison. Preserve both license families.

## Audit findings

- **HIGH, static touch flow:** `sketch.js`, `tronRestart`, sets `paused = 1`; HTML touch pads only send direction codes, never Space. A touch-only user cannot resume after Restart or death. Root fix: an accessible Start/resume action invoking the existing `tronStart`, not a new launch layer.
- **MEDIUM, static:** `gameOver` provides no stable winner text and `draw` quickly paints the paused prompt; outcome is color-only. Root fix: retain winner state and announce it in DOM before the next round.
- **MEDIUM, static rules:** `draw/checkIfDied` sequentially reset shared riders and omit head-to-head collision detection. Equal-head collisions and simultaneous deaths need explicit settlement before mutating either rider. Recommended repro: steer heads into the same cell on the same tick.
- **MEDIUM, evidence mismatch:** catalog description promises an AI absent from `setup/draw/handleKey`. Main should correct copy to factual local two-player controls, without adding gameplay under this docs lease.

## Safe iteration

Keep p5 vendored and preserve its license. Fix resume/outcome in the authored wrapper/sketch API; do not modify p5 or replace the whole game. Separate collision computation from reset only when adding a demonstrated regression case. Preserve anti-reversal semantics and both control sets. No new assets, remote multiplayer or catalog changes were made.

## Verification

Actually run: Git inventory/catalog identity and JS syntax checks, [batch 65](../audits/games-65.md). **Native runs: 0**. [Historical P1a](../../audit_batches/playtest_p1a.md) reported pixels and restart using an older overlay path; current HTML has no such overlay.

Recommended native steps: keyboard and two-pad steering, anti-reversal, both winner colors, simultaneous/head-on collision, mobile death/restart/resume, Space and repeated reset. Read via `git show HEAD:Games/TronLightCycles/sketch.js`; Main owns browser assets and the full serial smoke gate.

## Future outlook

Week 1: touch resume and factual two-player description. Week 2: stable result text, keyboard default-scroll control, mobile pad overlap and contrast review. Later: collision symmetry tests and measured frame behavior. AI and online rooms are intentionally deferred feature requests, not assumed refurbishment scope.
