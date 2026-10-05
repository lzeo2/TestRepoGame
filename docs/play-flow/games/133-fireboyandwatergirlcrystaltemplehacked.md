# Fireboy and Watergirl Crystal Temple Hacked (id 133) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 133, registered, directory `Games/FireboyAndWatergirlCrystalTempleHacked/`.
- Entry: `index.html`, blob e2ea8c977d48900098e3be4dbdec742fba843201, tree 3e34833abf5c054682f994efdb42b6ab93bcfc8e, 128 files.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Loads the same bundle name as id 128: `gameName = "fireboy-and-watergirl-crystal-temple.min.js"`.

## Source inspected
- `index.html` (2563 B) read in full. Identical wrapper to id 128 plus an added inline `<style>` block for `.hacked-badge` (fixed, top:10px right:10px, z-index 9999, `pointer-events: none`) and body child `<div class="hacked-badge">HACKED - All Levels Unlocked</div>`.

## Held
- The "All Levels Unlocked" claim originates in the authored badge text only. Whether the shared bundle actually unlocks levels is **UNKNOWN pending engine/runtime review**; the wrapper contains no unlock code.
- All engine mechanics: **UNKNOWN** (opaque bundle).

## Flow (wrapper only)
- Boot: same RequireJS cache-buster path as id 128 into `#container`.
- Start/input/loop/score/win/lose/restart: **UNKNOWN**.

## UI bloat classification: MILD
- Persistent: `#debug-fps`, `#hammer`, plus persistent red `.hacked-badge` overlay (decorative label, non-interactive, never dismissed).
- Badge is a label, not a menu; no ads/modals in wrapper.

## Popup/modal inventory
- None in wrapper. `oncontextmenu="return false"` present.

## Animation/simulation
- Wrapper has no loop; bundle OPAQUE/HELD.

## Findings
1. (Medium) Persistent `.hacked-badge` claims a game-state property ("All Levels Unlocked") that no inspected source implements; it may misdescribe runtime behaviour. Necessary fix if ever authorized: verify against a runtime session first, then either prove the claim in a maintainer note or reword/remove the badge in the wrapper. No change in this docs-only pass.

## Recommended playable view
- Keep canvas/HUD/touch/start/restart; the `.hacked-badge` is a removable overlay candidate in a future authorized wrapper change (verify claim first).

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, confirm whether levels are actually unlocked in the engine UI, and record controls/restart.
