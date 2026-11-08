# Lane Run

<!-- maintenance-game: Games/SchoolyardLaneRun -->

## Identity and status
Original Schoolyard Trio runner, catalog 242. Published as an in-progress game at the operator's request to test on the hosted site, not as a completed device-accepted release. Imported from the original private standalone source commit `8a853cbae92d6a14c9fafb2f290c10b72be49f79`; no model photos or likeness GLBs are included.

## Implementation map
`index.html`, `style.css`, `engine.js`, `ui.js`, `scene3d.js`, `shared.js`, and the local `vendor/three.iife.js` with `vendor/THREE-LICENSE.txt`. The HTML is adjusted to its independent catalog folder, preserving authored game logic. No runtime build step or remote loader.

## Gameplay and controls
Three-lane endless run. Left/Right or A/D change lanes; Up/Space jumps; Down/S slides; touch buttons mirror those inputs. Start, Pause and Restart are visible. A polygonal WebGL courtyard is attempted with a playable 2D fallback; score and distance update from the engine.

## State and persistence
The shared fictional Jack/Ian/Sim roster uses the `schoolyard-character` key; the run itself is local session state. Restart creates a new bounded run. The same roster source is copied independently into the three catalog folders.

## Dependencies and provenance
Owner-authorized original offline browser prototype. The local Three.js 0.186.0 bundle carries its MIT license; its embedded shader whitespace is preserved. No source photos, private GLBs, network calls or externally hosted assets. New character Alsen and real-person rigged models are not integrated in this published snapshot.

## Audit findings
The source repo reports a CPU-only elevated rear three-quarter camera projection check. That is not a native WebGL performance or phone visual pass. The host's renderer has had WebGL failures; test the actual hosted fallback and genuine inputs. Current public entry differs only in local relative script paths and navigation link.

## Safe iteration
Maintain independent offline asset closure, collision-aligned visible obstacles, keyboard/touch parity and same-origin roster. Keep real likeness and reference files private; publication of this fictional prototype does not grant permission for model uploads. No change to sibling games or proxy.

## Verification
Before packaging, original `node tests/run.js` reached eleven runner engine passes and the runner projection check, then timed out later in the broader launcher-heavy suite at 100 seconds; it was not a full-suite PASS. The release entry and all referenced files were statically checked and touched scripts passed `node --check`. Full-fleet smoke was not run before this owner-directed production test; retain that release-risk exception and test the hosted game separately.

## Future outlook
Verify hosted start, move/dodge/jump/slide, collision/failure, restart, desktop/mobile framing and WebGL/fallback independently. Physical-device FPS and private character rigs remain open.
