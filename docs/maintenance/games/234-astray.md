# Astray maintenance

<!-- maintenance-game: Games/Astray -->

## Identity and status

Catalog 234. Ingested original WebGL maze game by wwwtyro, not locally invented. Static port with original rendering and physics. Focused test passed; no release gate claim.

## Implementation map

`index.html` owns the loop, scene, Box2D physics, keyboard callbacks and level progression. `maze.js` generates the maze. `keyboard.js`, `Three.js`, `Box2dWeb.min.js` and `jquery.js` are original local dependencies. The complete authored entry was inspected; dependency internals were not reviewed in full.

## Gameplay and controls

The first maze starts automatically. Arrow keys or H/J/K/L move the ball; hold I for help. Reach the exit to grow the maze and advance a level. Local direction buttons support pointer/touch input. Restart reloads level 1. This is an open-ended increasing maze challenge, not a game with a fabricated failure screen.

## State and persistence

All state is in page memory: mazeDimension, gameState, wWorld/wBall and Three scene. No save or external server. Reload resets progress. Original scene replacement on level changes needs separate long-run resource testing.

## Dependencies and provenance

Pin `d3c4f61f2cbbe35752fbfa205f85a41d7f9fe0f0`, verified Unlicense in `License.md`. Complete dependency MIT/BSD/zlib-style notices and source evidence are in `CREDITS.md` and `vendor-notices/`. Textures are supplied upstream; no separate restriction was found.

## Audit findings

Upstream texture paths were root-absolute and are now relative. Original had no convenient restart or touch controls; bounded native buttons now reuse the original physics path. This older renderer has no target-device performance certification. No full maze completion or long-run memory acceptance is claimed.

## Safe iteration

Keep the game loop and original keyboard axis semantics. Pointer axis must clear on release, cancel, capture loss and window blur. Do not replace the engine to modernize syntax. Preserve dependency notices. The final sweep removes upstream trailing blank lines only from the entry and maze generator; no additional mechanics change.

## Verification

`python3 -B scripts/test_phase3_ports.py Astray --port 8234`: automatic start, arrow-key movement, I help, level-1 restart and pointer direction/release PASS. Observed console errors 0, HTTP errors 0, blocked-external request attempts 0. Desktop/mobile light/dark preference screenshots at `docs/phase3-evidence/Astray-*.png` show the original fixed scene styling. Physical touch and complete level traversal remain unverified.

## Future outlook

Verify real phone gestures and native traversal to the exit; check resource disposal over many increasing levels. Full-catalog smoke remains a separate pre-push gate.
