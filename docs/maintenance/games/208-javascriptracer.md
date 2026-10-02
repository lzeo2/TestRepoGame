# JavaScript Racer: maintenance manual

<!-- maintenance-game: Games/JavaScriptRacer -->

## Identity and status

Registered ID 208, category `arcade`, featured `false`. Entry: `Games/JavaScriptRacer/index.html` ([open source](../../../Games/JavaScriptRacer/index.html)). Source baseline `8c8a055`; 11 tracked files, 8,563,701 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry inline game/input logic, `common.js`, `common.css`, `stats.js`, credits/license through bounded source views. Projection and traffic algorithms have not been exhaustively certified. Sprite/audio payloads were inventoried but not reviewed for their separate rights or appearance. Entry builds a pseudo-3D 2D canvas racer, not a WebGL engine. `Game.run` loads local `images/background.png` and `sprites.png`, installs input, then drives fixed-step updates and rendering.

Inline `update/updateCars/updateCarOffset` handle acceleration, curve drift, off-road and car collisions. `resetRoad/addRoad/addSegment` construct track geometry; `render` projects segments and draws atlas sprites through `Render` helpers. `reset/refreshTweakUI` alter camera, resolution, lanes and fog. HUD uses `#speed_value/#current_lap_time_value/#last_lap_time_value/#fast_lap_time_value`. `bindPress` adapts four touch buttons; `#tb-restart` performs a lightweight run reset.

## Gameplay and controls

Arrow keys or WASD steer/accelerate/brake; small-screen buttons offer the same held booleans. It starts on image readiness. Complete laps improve time; obstacles reduce speed, not lives, and there is no terminal win/loss. Resolution and track-view controls are native inputs. The music mute control is a span. Restart clears position, speed, playerX and lap counters but keeps fastest lap and world traffic. Its containing touch-controls block is hidden above 760px, so desktop has no visible restart control.

## State and persistence

Globals own segments, cars, player position, speed, lap counters and held inputs. `Dom.storage` is direct `window.localStorage || {}`; keys are generic `fast_lap_time` and `muted`. Image readiness initializes fastest to 180 if absent. `Game.run` uses one requestAnimationFrame chain with fixed-step accumulator and one-second delta cap. `Game.stats` creates a five-second status interval. Music unlock listeners remove themselves after the first key/pointer event.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/jakesgordon/javascript-racer, revision `3e8a060b5900755db27f899612a74a77427c853e`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH, `common.js::Dom.storage` and entry `ready/update`: acquiring storage and writes are unguarded. Denied storage can stop bootstrap or interrupt a lap. Recommended repro: deny storage in a disposable browser context; minimal root fix is a guarded storage adapter with in-memory fallback at Dom, used by music and lap timing.
- MEDIUM, `index.html::#touch-controls` media rule: desktop restart is hidden while instructions promise it. Keep Restart outside the touch-only container or show that control independently.
- MEDIUM, `common.js::Game.setKeyListener` and entry held booleans: no blur/visibility release; alt-tab while accelerating can leave a stuck input. Reset all held booleans at one shared lifecycle boundary.
- MEDIUM, `common.js::loadImages` has load-only callbacks; an image error prevents ready forever. Add explicit visible failure.

## Safe iteration

Patch shared storage/input/image boundaries rather than every HUD call. Preserve upstream road projection and image atlas dimensions. Do not remove consumed music variants or sprite sheets without consumer tracing. Keep MIT credits and investigate asset-specific terms before replacement. Restart should preserve best time deliberately, not wipe unrelated origin keys.

## Verification

Recommended native sequence: accelerate, steer, collide and complete two laps; toggle mute, reload and verify best; restart at desktop/mobile widths; release a held touch outside its button and blur a keyboard hold. Test denied/corrupt saves and missing-image recovery. Check HUD width because mobile override scales canvas but retains fixed-width HUD.

Actually run: Git blob inventory and `node --check` via standard input for 4 external/inline script units, 4/4 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/JavaScriptRacer/common.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: guarded storage and reachable restart. Week 2: blur/input release and responsive HUD/mute semantics. Later: profile drawDistance, resolution and 200-car loop before changing defaults; document separate sprite/music rights. Preserve open-ended lap play; no fabricated victory screen.
