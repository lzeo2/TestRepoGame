# Archery maintenance manual

<!-- maintenance-game: Games/Archery -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **149**, category `sports`, not featured. Entry: `Games/Archery/index.html` ([local entry](../../../Games/Archery/index.html)). Tracked tree: **2 files, 55,721 bytes**; entry blob `130d4aee8752369c4785cc28bdf4eef227b689d2`. Existing ingested single-file Canvas2D game; no runtime dependency beyond browser APIs. All gameplay, controls and styling were read, not merely the entry header. Source references no external runtime loads; actual offline native play remains untested here.

## Implementation map

`index.html` owns the 640x500 `#canvas`, HUD `#arrowsLeft/#score/#wind`, `#endOverlay/#verdict/#finalScore`, and `#againBtn/#restartBtn`. `Util.getMousePos` maps viewport coordinates to logical pixels. `Target` draws nested ellipse rings, relocates between shots, and carries stuck arrows. `Arrow.setAim` clamps power 10..100; `draw` calculates shaft/tip then advances per-frame flight with gravity 0.4, A=0.01 and wind. `checkCollision` assigns nested-ring score; `checkBoundary` resolves misses. `resolveShot` updates HUD and schedules next target after a hit. `startRound` resets round state; one `update` RAF renders continuously.

**Source review coverage:** complete HTML/CSS and every inline function/class/input listener read, plus shipped GPL text and source dossier. No unread compiled game engine or binary art exists in this two-file tree. Canvas output itself was not visually reviewed.

## Gameplay and controls

Round auto-starts; no separate Start gate. Ten arrows score 1/2/3/4 by ring, with 15 points needed to win after all arrows. Press/drag anywhere on field, release to shoot; pointer capture supports mouse/touch. Left/Right change keyboard angle, Up/Down power, Space launch. R restarts only while state is play because the listener returns otherwise; end-screen Play again and Restart round still work by click. There is no audio implementation. Target motion is step-based between shots, not a constantly moving target during every aim. Win/lose text uses the score threshold; no persistent best score.

## State and persistence

Globals own `state`, `score`, `arrowsLeft`, `wind`, `locked`, popups and dead arrows; arrow and target retain geometry. No localStorage/cookie/save key. Successful shots create an untracked 350ms timeout in `resolveShot`; restart does not cancel it. RAF starts once and is not restarted by `startRound`, so repeated restarts do not intentionally multiply loops. Pointer state `mouseDown` and `kbAngle` are outside the reset function. Canvas backing pixels are fixed, CSS scales presentation; no devicePixelRatio adjustment.

## Dependencies and provenance

Header and [source dossier](../../catalog_parts/sources_10.md) identify https://github.com/bibhuticoder/archery-master at `107cbc9b8ff84f3ee53bfac43e26cf5d4b30a78e`, GPL-3.0; the full GPL v3 text is shipped as `Games/Archery/LICENSE`. This is locally recorded evidence, not a new upstream/network verification. Adaptations include inlining, wind, ten-arrow threshold and pointer/keyboard HUD. Preserve source/modification and copyleft notices; do not relabel MIT. Graphics are drawn in code, with system font stack and no asset files.

## Audit findings

- **MEDIUM, stale round callback:** `resolveShot` / `setTimeout(advance,350)` survives `startRound`. Hit then immediately restart; old advance relocates the new target and can unlock a newer in-flight resolution. Root fix: store/cancel the timeout at reset, or round-token guard the callback.
- **MEDIUM, input lifecycle:** pointer listeners omit `pointercancel/lostpointercapture`; reset leaves `mouseDown` and keyboard aim unchanged, and arrow keys do not prevent browser scrolling. Cancel/blur/reset should clear drag state; keyboard handling should suppress defaults only for handled game inputs and synchronize its angle with reset aim.
- **MEDIUM, flight controls:** key listener calls `setAim` even while arrow is flying/locked, unlike guarded pointerdown. Mid-flight keys change velocity, not just next-shot aim. Root fix: gate aim mutations on the same rest/unlocked state used by launch/input.
- **LOW, frame-rate sensitivity:** `Arrow.draw` advances physics without elapsed time. At different refresh rates flight/target timing changes. Measure first; preserve trajectory with fixed-step timing if a patch is authorized.
No user-input HTML sink, runtime third-party dependency or save corruption path was found in the fully read authored logic.

## Safe iteration

Keep ring scoring/ellipse ordering and per-shot wind. Fix delayed callback/input gates in the shared round/input boundary, not extra guards in each button. Do not rewrite ingested physics or add synthetic sound/promotional overlays. Preserve GPL files and corresponding readable code. Any timestep change needs trajectory/score checks; cancel old round work before resetting target.

## Verification

**Actually run:** inline JS `node --check` via stdin parsed; tree and notice inspection completed. Browser, native controls and screenshots: **zero**. To reproduce syntax, extract the sole inline script from `git show HEAD:Games/Archery/index.html` with Python's HTMLParser and pipe to `node --check`; do not send HTML itself to Node.

Main's recommended bounded native checks: drag-release touch/mouse at CSS-scaled width, every ring and miss, ten arrows to both verdicts, end-screen restart, hit-then-immediate-restart race, canceled drag/blur, keyboard aim during flight, 60/120Hz timing and page-scroll behavior. Confirm no external requests and focus-visible restart buttons. Full catalog smoke is separate and cannot certify scoring.

## Future outlook

Week 1: race/input reproduction and license retention. Week 2: approved reset/cancel gates and accurate R-key copy. Week 3: keyboard focus, canvas description and score announcement review. Week 4: hardware timing/DPI measurements before any fixed-step work. Defer new rounds, assets and elaborate test framework; one focused reset/shot regression suffices for an authorized logic fix.
