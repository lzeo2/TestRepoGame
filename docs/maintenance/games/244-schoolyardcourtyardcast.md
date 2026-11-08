# Courtyard Cast

<!-- maintenance-game: Games/SchoolyardCourtyardCast -->

## Identity and status
Original Schoolyard Trio slingshot prototype, catalog 244. Owner explicitly requested an early hosted test release, not a declaration that the planned 200-level campaign or 3D/mobile acceptance is complete. Pinned standalone source commit `8a853cbae92d6a14c9fafb2f290c10b72be49f79`. No private GLBs or photos are included.

## Implementation map
`index.html`, `style.css`, `shared.js`, `levels.js`, `overhaul-engine.js`, `progress.js`, `human.js`, `ui.js`, `courtyard.js`, `scene3d.js`, `engine.js`, and local MIT-licensed `vendor/three.iife.js`. Only HTML relative links and catalog navigation were changed for this independent folder.

## Gameplay and controls
Side-on schoolyard slingshot: pull/release a human-shaped fictional Jack, Ian or Sim; a fresh in-flight click/tap or Space uses Dash, Brace or Hop. Fictional teacher targets clear on actual contact, falling block impact or ground fall. Retry, map, skins and help are available. There are twenty authored draft levels, not 200 finished or visually accepted levels. WebGL courtyard and 2D fallback remain separate evidence paths.

## State and persistence
The `progress.js` module manages unlocked levels, earned stars and best scores with a guarded storage fallback to session-only play. The shared roster selection uses `schoolyard-character`. A restart resets the current level's transient state, not earned progress.

## Dependencies and provenance
Owner-authorized original offline prototype; no source/art copied from reference games. Three.js 0.186.0 MIT bundle and notice are local. User-supplied face references and Jack/Ian/Alsen models, plus provisional Sim model, are private and not present in this public game. Alsen is a proposed fourth character but not implemented in this pinned runtime.

## Audit findings
Older levels include legacy circle or unsolved layouts. One historical mobile touch-ability probe failed; the 3D GPU route and native visual batch remain unaccepted. CPU/source solutions do not prove the twenty levels can be won through ordinary hosted play. A hosted prototype must not be described as the final campaign.

## Safe iteration
Preserve real-input physics/collision, fictional-only teacher targets, authored progression, blocked-storage fallback and existing player saves. Do not publish likeness GLBs or reference photos without a separate explicit review. Keep actual hitboxes aligned with visible bodies and source-tested level recipes.

## Verification
Before packaging, touched JavaScript syntax, catalog references and offline dependencies were checked. The pinned source's `node tests/run.js` timed out after 100 seconds in its launcher-heavy part; no full-suite success is claimed. The prior source-only and 2D fallback receipts are historical; no new hosted win/mobile/3D acceptance has run. Owner explicitly requested production testing without first completing the full-fleet smoke gate; retain this known risk and verify on the hosted snapshot.

## Future outlook
Test hosted pull/release, each character's power, loss/retry, actual win/unlock and saved progression on desktop and touch. Expand verified human-shaped levels in batches only after current failures and browser admission are resolved. Rigged private likenesses are separate future intake.
