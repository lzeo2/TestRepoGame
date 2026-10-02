# Archery maintenance manual

<!-- maintenance-game: Games/Archery -->

Source audit baseline: `8c8a055`; current approved runtime refurbishment: delegation 72. See [patch evidence](../archery-refurbishment.md). Historical delegation 64 syntax-only review is superseded for the input/timer findings, not for unmeasured hardware limits.

## Identity and status

Registered ID **149**, category `sports`, not featured. Entry: `Games/Archery/index.html` ([local entry](../../../Games/Archery/index.html)). Existing ingested single-file Canvas2D game; no new game or registration. Current tree: **2 files, 57,010 bytes**; entry **21,869 bytes**, blob `d73f863b586aabaa68f29140891c1792ee16f134`, SHA-256 `b16ca71abf902a2875b8d726ba5bcf2d6c864d5664d933ade16b5c2fd878f2d7`. Main owns inventory refresh after the source commit.

Source references no external runtime loads. Focused Chromium desktop/mobile native gameplay now passed with non-local traffic blocked and zero attempted external loads. This is not full catalog acceptance, an N100 result, or a general accessibility certification.

## Implementation map

`index.html` owns the 640x500 `#canvas`, HUD `#arrowsLeft/#score/#wind`, `#endOverlay/#verdict/#finalScore`, and `#againBtn/#restartBtn`. `Util.getMousePos` maps CSS-scaled coordinates to logical pixels; `getAngle` retains the upstream bottom-left ordering rule. `Target.updateRings/draw` maintain four concentric-offset ellipses; `move/step` relocate the target between shots and carry stuck arrows.

`Arrow.setAim` is the shared mutation boundary for pointermove, pointerup and all four aim keys. It now rejects non-play, locked and non-rest states. `Arrow.launch` shares the same gate and clears unfinished input before flight. `draw` calculates the shaft/tip and advances per-frame flight; `checkCollision/checkBoundary` resolve hits/misses through `resolveShot`. `startRound` is called by R, both buttons and auto-start. One continuously scheduled `update` RAF renders all states; restart does not create a second loop.

**Source review coverage:** complete HTML, CSS and all inline classes/functions/listeners read against the unchanged baseline, then the full patch reviewed. The tree has no compiled engine or binary art. The shipped GPL file and local source dossier identify provenance; no new upstream download or network verification was performed. Main owns subjective visual review of the captured real-game screenshots.

## Gameplay and controls

The round auto-starts. Ten arrows score 1/2/3/4 by nested ring; a final score of at least 15 wins after all ten arrows. Wind is re-rolled per shot. Successful shots deliberately retain their 350ms display delay before target movement/unlock. Misses advance immediately. The target moves toward a random destination between shots; input is not redesigned to wait for that movement.

Press/drag on the field and release to shoot with mouse or touch; power is clamped to 10..100. `tabindex="0"`, an accessible label and visible focus outline make the field keyboard-focusable. Pointerdown and round restart focus it without scrolling. While focused, Left/Right rotate by 0.04 radians, Up/Down change power by four, Space launches, and R restarts during play **and after the verdict**. Aim/launch keys cannot change a flying arrow or the locked post-hit aim. Keyboard aim starts from the current arrow angle, including a pointer-set angle.

Only handled keys on the field suppress browser defaults; Ctrl/Alt/Meta shortcuts and native button Space/Enter are left alone. Play again and Restart round still use their original buttons. Pointer cancel, capture loss, window blur and restart clear a drag rather than firing it. There is no audio or persistent best score.

## State and persistence

Globals own `state`, `score`, `arrowsLeft`, `wind`, `locked`, `popups`, `deadArrows`, `pendingAdvance`, `mouseDown`, `mouseDownPos`, `activePointer` and `kbAngle`; arrow/target objects retain geometry. No localStorage, cookies or save keys exist.

`resolveShot` stores exactly one delayed hit callback in `pendingAdvance`; `advance` clears that reference on entry. `startRound` cancels and clears it before resetting the new round. It resets target position/destination, arrow, wind, score, arrows, popups and stuck arrows, then calls `clearInput`. `clearInput` clears drag ownership before releasing capture, so the ensuing lost-capture event can safely call it again; it synchronizes keyboard angle with the arrow. Pointermove/up accept only the captured pointer ID. `Arrow.launch` also clears any drag when Space launches it.

Canvas backing pixels remain fixed; CSS scales presentation without devicePixelRatio adjustment. Physics constants remain gravity 0.4 and horizontal acceleration 0.01 plus wind per rendered frame.

## Dependencies and provenance

Header and [source dossier](../../catalog_parts/sources_10.md) record https://github.com/bibhuticoder/archery-master at `107cbc9b8ff84f3ee53bfac43e26cf5d4b30a78e`, GPL-3.0. The full GPL v3 text remains unchanged in `Games/Archery/LICENSE`. This is locally recorded evidence, not a fresh upstream rights verification. GPL is copyleft, not the dossier introduction's generic "permissive" characterization.

Existing adaptations include inlining, wind, the ten-arrow threshold and pointer/keyboard HUD. This refurbishment adds only reset/input lifecycle correctness and field focus support. Preserve source/modification and copyleft notices; do not relabel MIT. Graphics are drawn in code with system fonts and no runtime asset files, third-party libraries or new remote dependencies.

## Audit findings

- **MEDIUM, fixed stale callback:** `index.html: resolveShot / startRound`. The old `setTimeout(advance,350)` survived restart and moved the new target/unlocked future work. Root fix: `pendingAdvance` ownership with cancel/null at the round boundary. Baseline native hit/R reproduction failed with `old hit callback moved restarted target`; patched desktop/touch reproduction passed.
- **MEDIUM, fixed flight controls:** `index.html: Arrow.setAim / keydown`. Keyboard aim previously replaced live velocity while flying or locked. Root fix: shared rest/play/unlocked guard, with the same keyboard handling gate. Native flight power and locked angle/power tests passed.
- **MEDIUM, fixed input lifecycle:** `index.html: clearInput / pointer listeners / startRound`. Cancel/blur/capture loss were absent and restart retained drag/keyboard state. Root fix: clear ownership/release capture/synchronize angle at launch, reset and lifecycle events. Native touchCancel and desktop/touch restart-during-drag passed; blur/lostcapture were tested with **synthetic negative fixtures**, not claimed as trusted OS events.
- **MEDIUM, fixed keyboard default/focus boundary:** `index.html: canvas / keydown`. Arrow keys could scroll the document; document-wide Space stole native button activation. Root fix: focusable/labeled field, field-scoped handled-key suppression, unchanged native button actions. Native Space on both buttons passed.
- **LOW, fixed terminal R mismatch:** `index.html: keydown`. The old early return on non-play state contradicted documented R restart at the verdict. R is now handled before the play gate when the field has focus; normal ten-miss terminal R passed.
- **LOW, deferred frame-rate sensitivity:** `index.html: Arrow.draw / Target.step`. Physics and target motion advance per RAF without elapsed time. Measure 60/120Hz first; a fixed-step change needs trajectory/score parity and is intentionally outside this patch.

No user-input HTML sink, runtime third-party dependency or persistence-corruption path was found in the fully read game logic. Lack of these findings does not certify every platform/browser input edge case.

## Safe iteration

Patch the shared `setAim/launch`, `startRound`, `clearInput` and owned timeout boundaries, not per-button workarounds. Preserve ellipse collision ordering, 1..4 scoring, ten arrows, 15-point threshold, the 350ms hit display, wind and upstream bow/arrow art. No debug grant/setter API or synthetic positive-gameplay hook was added. Do not replace the ingested engine or add a launch overlay.

Rollback only the owned Archery source/test/manual/report paths through a separately authorized revert; never reset the shared worktree. There is no save migration. A timestep/DPI patch requires measured browser/device evidence, not assumptions about a familiar archery engine.

## Verification

**Actually run:** sole inline script extracted with HTMLParser and passed to `node --check` via stdin; regression Python AST parsed; owned-path `git diff --check` passed. Historical [P2b playtest](../../audit_batches/playtest_p2b.md) remains dated and did not establish the hit/restart race. Current native command:

```sh
timeout 180 python3 -B scripts/test_archery_refurbishment.py
# Negative proof against the immutable old blob; expected assertion failure:
timeout 180 python3 -B scripts/test_archery_refurbishment.py --baseline
```

Requires Main's narrow Archery checkout lease and already-installed Chromium/Playwright; does not materialize other games or install anything. The runner serves only the game on port 8812 and closes browser contexts/server in `finally`. Baseline failed on the native stale-hit race. Patched native runs passed desktop 1280x720 and touch 390x720, plus a 320px overflow assertion. Ten normal legal misses reached loss, R restarted the terminal round, and ten real pointer/touch shots reached **40 points** and a win on both devices; native Space activated Play again and Restart round. Computed legal aiming reads target/wind only and does not modify state, RNG or storage. Touch uses Chromium's trusted CDP input, not a mouse substitute. Runtime errors, failed requests, HTTP errors and attempted external loads were all zero.

Screenshots are temporary `archery-refurbishment/desktop.jpg`, `390.jpg` and `320.jpg` for Main's review, not committed art. Full catalog smoke, N100/hardware, 60/120Hz parity, OS-level blur, assistive-technology review, every ring boundary and high-DPI quality remain unverified. `python3 -B scripts/check_maintenance_docs.py` was run; source must be committed and Main's inventory refreshed before the current tree can pass it.

## Future outlook

Week 1: integrate/review the bounded timer/input patch and current native evidence; retain license/source notices. Week 2: Main's desktop/mobile focus/contrast and score announcement review, without repainting upstream artwork. Week 3: sample real 60/120Hz trajectories, devicePixelRatio and N100 performance. Week 4: authorize only measured fixed-step/DPI improvements with score parity if needed. Defer new rounds, assets, sound, build tooling and replacement engines. No new game, catalog change, registration, publication or push is part of this work.
