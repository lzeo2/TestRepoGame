# Fireboy and Watergirl Hacked (Light Temple) (id 131) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 131, registered, directory `Games/FireboyAndWatergirlHacked/`.
- Entry: `index.html`, blob 4f2b3d3556adb6069984432e752ef7b6f91836d9, tree af873f8ce85ef0ca1672512f52a024b7de9b4456, 137 files.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Loads the same bundle as id 127: `gameName = "fireboy-and-watergirl-light-temple.min.js"`. Page title "Fireboy & Watergirl 2 Light Temple"; no upstream rules assumed.

## Source inspected
- `index.html` (2633 B) read in full. Same wrapper as id 127 (`assets/styles/main.css`, `#root > #container/#hammer/#debug-fps`, RequireJS cache-buster) plus inline `.hacked-badge` style and `<div class="hacked-badge">HACKED - All Levels Unlocked</div>` (fixed, z-index 9999, `pointer-events:none`).

## Held
- "All Levels Unlocked" is authored badge text only; no unlock code in inspected wrapper. Actual unlock state **UNKNOWN pending engine/runtime review**.
- Engine mechanics: **UNKNOWN** (opaque bundle, same blob family as id 127).

## Flow (wrapper only)
- Boot: entry -> require.js -> `version.js` -> `require([bundle])` into `#container`.
- Start/input/loop/score/win/lose/restart: **UNKNOWN**.

## UI bloat classification: MILD
- Persistent: `#debug-fps`, `#hammer`, persistent red `.hacked-badge` overlay. No authored ads/modals.

## Popup/modal inventory
- None in wrapper.

## Animation/simulation
- No wrapper loop; bundle OPAQUE/HELD.

## Findings
1. (Medium) Persistent badge asserts unlock behaviour not evidenced by inspected source; verify at runtime, then reword/remove in an authorized wrapper change. Docs-only pass: no change.

## Recommended playable view
- Keep canvas/HUD/touch/start/restart; `.hacked-badge` removable after runtime verification.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, verify level availability, controls, restart.
