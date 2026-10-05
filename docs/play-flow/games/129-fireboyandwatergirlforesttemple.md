# Fireboy & Watergirl: Forest Temple (id 129) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 129, registered, directory `Games/FireboyAndWatergirlForestTemple/`.
- Entry: `index.html`, blob 7332d44fe049bfd327bb47b3668e9debda9e598b, tree 19c14e284216a519b93a4e4a33df9cdfa485ae32, 124 files.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Branded title "Fireboy & Watergirl 1 Forest Temple"; no upstream rules assumed.

## Source inspected
- `index.html` (2672 B) read in full: legacy conditional comments, `assets/css/app.css`, `#root > #container/#hammer/#debug-fps`, RequireJS + cache buster, `gameName = "fireboy-and-watergirl-forest-temple.min.js"`, and an authored wrapper config object:
  - `var _azerionIntegration = { af:false, sa:false, la:false, bd:0, playBtn:true, cp:false }` (ad/SDK integration flags, all disabled except `playBtn`).
- Bundle `fireboy-and-watergirl-forest-temple.min.js` blob 4ccbb010547d00f39fdba5e4d4344e0823c7d34b, 1,914,952 B: NOT read (compiled/minified).

## Held
- Engine mechanics (co-op movement, level flow, win/lose, saves) **UNKNOWN pending engine/runtime review**. Meaning of each `_azerionIntegration` flag inside the bundle not verified.

## Flow (wrapper only)
- Boot: entry -> require.js -> `version.js` -> `require([bundle])` into `#container`.
- Start/input/loop/score/win/lose/restart: **UNKNOWN**.

## UI bloat classification: MILD
- Persistent: `#debug-fps`, `#hammer`, plus `_azerionIntegration.playBtn = true` may cause an engine-side play button (opaque; classify engine menu as UNKNOWN).
- No authored title cards/ads/modals in wrapper.

## Popup/modal inventory
- None authored in wrapper; engine-side unknown.

## Animation/simulation
- No wrapper loop; bundle rendering/model animation OPAQUE/HELD.

## Findings
1. (Info) Ad-integration flags exist in wrapper but ad SDKs are set false; confirm at runtime that no network ad call fires (offline-first rule). Docs-only pass: no fix.

## Recommended playable view
- Preserve canvas, engine HUD/touch/start/restart; wrapper contributes no decorative layers to strip.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, confirm offline boot, actual start/play controls, win/lose and restart.
