# Gladihoppers (id 47) - play-flow audit

CODE-REVIEW ONLY. No browser run in this pass.

## Identity
- Catalog id 47, registered, directory `Games/Gladihoppers/` (10 files, 48,049,914 B).
- Entry: `index.html`, blob 97d8dd2263bff3a8e9c10cb191b8f7872d7d8558, tree 3be492719b4c2676d66feef9882f76cd624acd19.
- Source baseline: `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Header comment states vendored Unity WebGL build (v3.0.1, Dreamon Studios) from github.com/1000unblockedgames/Gladihoppers commit a14cd76, ad/analytics scripts removed, local no-op Poki SDK stub; provenance comment retained, not independently verified here.

## Source inspected
- `index.html` (2,703 B) read in full:
  - `#shell > #frame > #gameContainer`, `#error` (hidden), `#hud` with `#fullscreenBtn` ("Fullscreen") and `#restartBtn` ("Restart") - authored, 44px min-height, focus-visible outline.
  - `window.config = {}` (Unity config).
  - `Object.defineProperty(document, 'xURL', { get: ... document.URL })` shim.
  - `patch/js/UnityLoader.2019.2.js` then `js/gladihoppers.js` (loader bootstrap; bodies not read).
- `git ls-tree`: `Build/` tree fb2e1dc2e16c8c98ccbb0d361b7bff47f2ac60cc (compiled), `patch/`, `js/`, `appmanifest.json`.

## Held
- `Build/` compiled Unity engine and `js/gladihoppers.js` bootstrap: all mechanics (menus, fights, controls, win/lose, save) **UNKNOWN pending engine/runtime review**. Online PvP/IAP noted as inert-without-network by comment only; not verified.

## Flow (wrapper only)
- Boot: entry -> UnityLoader patch -> `js/gladihoppers.js` -> `#gameContainer`.
- Start/input/loop/score/win-lose/restart: **UNKNOWN** (compiled build).
- Wrapper actions verified: `#fullscreenBtn`, `#restartBtn` handlers live inside held `js/gladihoppers.js` - wiring not verified.

## UI bloat classification: NONE (wrapper)
- Wrapper adds only two functional buttons (Fullscreen, Restart) and a hidden error slot. Flat colors, black buttons, 44px targets, visible focus - house-aligned. Engine UI: UNKNOWN.

## Popup/modal inventory
- None in wrapper markup. Engine menus/popups: UNKNOWN.

## Animation/simulation
- Wrapper has no loop; all animation inside Unity build: OPAQUE/HELD. `#restartBtn` may re-instantiate the game - mechanism held.

## Findings
1. (Info) Compiled engine blocks source gameplay review; runtime pass required for any controls/win-lose claim.
2. (Info) `xURL` defineProperty shim purpose is opaque (likely legacy anti-devtools); harmless in wrapper but unexplained - note only, no fix.

## Recommended playable view
- Keep `#frame`/`#gameContainer`, `#hud` buttons and `#error`; engine menus untouched pending runtime review.

## Validation status
CODE-REVIEW ONLY. Smallest needed check: browser-load, confirm offline boot with no network calls, record start menu, controls, fight outcome/restart, and whether Fullscreen/Restart work.
