# Fireboy & Watergirl 4: Crystal Temple (id 128) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 128, registered, directory `Games/FireboyAndWatergirlCrystalTemple/`.
- Entry: `index.html`, blob 29e541671da4d658fd076cccb99425da94077eee, tree 7818e77931e3f8bded7fc60fe2145ba501184d69, 128 files.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Branded title "Fireboy & Watergirl 4 Crystal Temple"; no upstream rules assumed from the title.

## Source inspected
- `index.html` (2223 B) read in full: `#root > #container/#hammer/#debug-fps`, `oncontextmenu="return false"` on body, RequireJS loader with cache buster, `gameName = "fireboy-and-watergirl-crystal-temple.min.js"`.
- Bundle `fireboy-and-watergirl-crystal-temple.min.js` blob 115ff411b13b5421bd5dfefbc3e46777d5e7717e, 1,935,375 B: NOT read (compiled/minified).

## Held
- All engine mechanics (movement, levels, co-op logic, win/lose, saves) **UNKNOWN pending engine/runtime review**.

## Flow (wrapper only)
- Boot: entry -> require.js -> `version.js` -> `require([bundle])` into `#container`.
- Start/input/loop/score/win/lose/restart: **UNKNOWN** (opaque bundle).
- Exit: none in wrapper.

## UI bloat classification: MILD
- Persistent wrapper DOM: `#debug-fps`, `#hammer`. No authored title cards, ads or modals. Engine menus opaque.

## Popup/modal inventory
- None in wrapper; `oncontextmenu="return false"` blocks right-click globally (input restriction, not a popup).

## Animation/simulation
- No wrapper RAF; all rendering/model animation inside bundle: OPAQUE/HELD.

## Findings
1. (Info) Compiled bundle requires runtime review for gameplay claims; no docs-only fix.
2. (Low) `oncontextmenu="return false"` on `body` disables right-click for the whole game page. Only revisit if a future wrapper change is authorized; no fix now.

## Recommended playable view
- Preserve `#container` canvas plus whatever HUD/touch/start/restart the runtime exposes; wrapper adds nothing decorative to strip.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load the entry, confirm boot, record real start state, controls, HUD, win/lose and restart.
