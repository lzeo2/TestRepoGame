<!-- maintenance-game: Games/Joust -->
# Joust maintenance

## Identity and status

Registered ID **162**, category `arcade`, entry `Games/Joust/index.html`. Baseline `8c8a055`; four files, 1,205,691 bytes. The 1,194,707-byte webpack bundle includes Phaser and a small game tail. Wrapper loading is local, but a concrete collision-path defect prevents certifying gameplay from earlier movement tests.

## Implementation map

**Source review coverage:** full HTML/inline CSS/control bridge and bundled license notices read. Extracted and read the complete final game module beginning with the last `"use strict"`; reviewed relevant keyboard-plugin snippets. The large minified Phaser implementation was not reviewed in entirety. No claim of full engine security/performance certification is made.

HTML loads `bundle.js`; its last module creates an 800 by 600 Arcade Physics game and exports `window.joustGame`. `JoustScene` is the string anchor for the minified scene class. Scene `create` generates platform/player/enemy textures, creates three enemy objects, adds colliders/overlaps, score/lives text, then pauses itself. Wrapper `waitForScene` polls up to 200 times at 100ms and resumes the scene once. `#restartBtn` reloads the page.

The enemy class is minified `s`, anchored by `spawnAwayFromPlayer`, `patrol`, `attackPlayer`, `evadePlayer` and `learnFromDefeat`. Player class `n` uses `createCursorKeys` and `JustDown` for flapping. Scene `handlePlayerEnemyCollision` calls an enemy method that is absent from that class.

## Gameplay and controls

Source implements left/right velocity and an impulse on each fresh Space press, not continuous hold-to-flap. Wrapper buttons `#btn-left`, `#btn-right`, `#btn-flap` dispatch matching synthetic keydown/up, including `keyCode`, `which` and `code`. Escape asks the scene to restart. HTML describes striking enemies from above; the intended collision branch awards 100 per defeated enemy, replaces that enemy, or loses a life. Three lives lead to physics pause and a Game Over prompt. Those outcomes are unreachable safely until the missing collision method is resolved. No separate wave progression is present in the inspected game module.

## State and persistence

Scene properties own player, enemy array, score, lives and text objects. Enemy evasion skill reads unguarded `localStorage.getItem('successRate')`; `learnFromDefeat` can write the same key, but no caller appears in the game tail. No saved match exists. Wrapper polling has no visible error result after its finite wait. Phaser owns loop and physics teardown; those internals were not certified here.

## Dependencies and provenance

`LICENSE-MIT.txt` credits Christian Schladetsch; `bundle.js.LICENSE.txt` retains Phaser/component MIT notices. [Historical ingestion record](../../catalog_parts/sources_3.md) and header identify `https://github.com/cschladetsch/JsJoust`, revision `88cb734e4bc149e6e81c8abf6993e5f35aac66d8`. This audit did not compare upstream or rebuild the bundle. The game tail's scene preload is empty and texture generation is active; helper-class preload image strings are not called by that scene. Missing `assets/*.png` therefore are not independently established fetch failures.

## Audit findings

- **HIGH, static:** `bundle.js`, game-tail anchors `handlePlayerEnemyCollision` / `r.handleCollision(t)`: enemy class `s` neither defines nor inherits `handleCollision`. A real overlap calls undefined and throws instead of settling the joust. Recommended repro: reach player/enemy overlap and capture the exception, not just hold an arrow. Root fix requires recovering the matching authored collision source and an authorized reproducible build; do not hand-edit a compiled bundle.
- **HIGH, static lifecycle:** scene `create` always calls `this.scene.pause()`, including a scene restart; wrapper resume runs once. Escape restart can leave the recreated scene paused. Root fix in authored scene lifecycle or a bounded wrapper event bridge after review; native confirm required.
- **MEDIUM, static:** `successRate` preference read is unguarded. Storage denial can stop enemy construction. Guard the source preference once and default to 0.5; do not add cloud persistence.

## Safe iteration

Maintain local bundle/notices and procedural art. Wrapper patch points are `waitForScene`, `fireKey` and Restart/error feedback; gameplay patches require original source/build authorization. Inspect scene properties rather than assuming a canvas hash measures movement: Phaser buffers made the old probe misleading. No runtime changes were authorized in this task.

## Verification

Actually run: Git inventory/catalog and stdin JS parsing, [batch 65](../audits/games-65.md); **0 native runs**. [Historical P1a](../../audit_batches/playtest_p1a.md) verified player movement and reload restart, explicitly no scored enemy hit. It does not refute the collision defect or prove Escape restart.

Recommended native checks: overlap from above/below, score/lives, three-life failure, Escape twice and DOM reload Restart, denied storage, coarse-pointer flap release and touchcancel. `git show HEAD:Games/Joust/index.html` permits sparse-safe reading; Main owns browser asset extraction/full smoke.

## Future outlook

Week 1: recover source and isolate collision/restart failures before visual refurbishment. Week 2: explicit loading failure and input release/blur handling. Later: actual N100 frame profiling and mobile layout. New waves or art are deferred until the existing collision loop works and the build is reproducible.
