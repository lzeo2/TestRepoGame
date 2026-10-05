# Geometry Dash Lite (id 66) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 66, registered, directory `Games/GeometryDashLite/` (33 files, 54,991,081 B).
- Entry: `index.html`, blob e4a142970a4d0124bac2658c6b3669374d621d4e, tree 6142e881670eef8a6cd804fe58bdfe0aaa004f73.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Branded title "Geometry Dash Lite"; no assumptions about its progression/controls from the title.

## Source inspected
- `index.html` (8,354 B) read in full:
  - `../../storage/js/cloak.js` script tag (blob 38c9c6618e7a36548d6019e12d869805f55096da exists in tree).
  - `#gameContainer`; `#loader` with `.logo` (`image/loading.png`), `.spinner`, `.progress` images.
  - `Build/UnityLoader.js` + `UnityLoader.instantiate("gameContainer", "Build/GeometryDashLite.json", { onProgress: UnityProgress })`.
  - `UnityProgress()` writes `#loader .progress .full` `scaleX` and hides loader at progress 1 (2s timeout).
  - Auto-dismiss script: on `DOMContentLoaded` clicks every `<button>` whose `innerHTML == "OK"` immediately and again at 1000ms.
  - jQuery `themes/geometrydashlite.io/rs/js/jquery-3.4.1.min.js` + `ToggleInfo()/ShowInfo()/HideInfo()` operating on `div.main-panel`, `div.main-panel-ads`, `div.main-panel-content`, `button.hide-main-panel` - none of these selectors exist anywhere in `index.html` (dead wrapper code unless the Unity build injects them: UNKNOWN).

## Held
- Unity WebGL build (`Build/`, `StreamingAssets/`): compiled engine. All mechanics (menus, attempt/score, death/restart, controls) **UNKNOWN pending engine/runtime review**.

## Flow (wrapper only)
- Boot: `index.html` -> `UnityLoader.instantiate` with progress UI in `#loader`.
- Start/input/loop/score/progression/win-lose/restart: **UNKNOWN** (compiled build). The wrapper's only verified UI action is the auto-click of "OK" buttons.

## UI bloat classification: UNKNOWN (engine) / MILD (wrapper)
- Wrapper: persistent gradient backgrounds (`body` and `#loader` use `linear-gradient`) - house style bans gradients in our shell; this is upstream wrapper CSS kept as-is, noted as a finding, not auto-recolored.
- Dead jQuery info-panel code referencing `.main-panel-ads` (ad-panel residue) with no matching markup; `ToggleInfo`/`ShowInfo`/`HideInfo` appear unreferenced from authored markup.
- Engine menus: UNKNOWN.

## Popup/modal inventory
- Wrapper: none visible in markup. The OK-auto-click script exists specifically to dismiss in-engine dialogs (count/description unknown until runtime). Engine popups: UNKNOWN.

## Animation/simulation
- Wrapper: CSS `spinner-spin` keyframes (loader only) and `scaleX` progress transform. All game animation inside the Unity build: OPAQUE/HELD.

## Findings
1. (Medium) Dead ad-panel jQuery (`div.main-panel-ads`, `ToggleInfo`, `ShowInfo`, `HideInfo`) is unreachable from authored markup; if a future authorized cleanup is issued, remove after grepping for engine-injected DOM. No change now.
2. (Low) Wrapper gradients conflict with house flat-color rule for shell CSS; upstream art/CSS not to be recolored wholesale - record only.
3. (Info) Blanket auto-click of any button labeled "OK" at load and 1s is a broad dismissal hook; behaviour depends on engine dialogs. HOLD - needs runtime observation before touching.

## Recommended playable view
- Keep `#gameContainer` full-screen, loader, and engine HUD/touch/start/restart as the runtime reveals; strip nothing from engine menus without a runtime pass.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, confirm Unity build boots offline (cloak.js resolves, no network), record start menu, actual controls, death/restart, and any dialogs the OK-clicker dismisses.
