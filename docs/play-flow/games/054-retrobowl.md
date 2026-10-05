# Play flow: Retro Bowl (id 54, registered)

- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `Games/RetroBowl`, 36 files, 5592513 bytes. Doc: `docs/maintenance/games/054-retrobowl.md` (not owned). CODE-REVIEW ONLY.

## Source inspected

- `Games/RetroBowl/index.html` blob `05ed3791ec854efb401de6ae08c1b08d00533477` read completely.
- Entry script `html5game/RetroBowl.js` (4121962 bytes) is **compiled GameMaker HTML5 output**: `git ls-tree -l` confirmed size; only the wrapper load path was inspected. **Engine mechanics UNKNOWN** pending engine/runtime review; no progression, animation, win/lose or control scheme is claimed here.
- Wrapper observed: `div.gm4html5_div_class#gm4html5_div_id` containing `img#GM4HTML5_loadingscreen` (hidden) and `canvas#canvas` 853x480, then `html5game/RetroBowl.js`, then an inline stub.
- Also present: `html5game/uph_poki.js` (Poki glue), data `.txt` tables (Teams, Names, Schedule17, LanguageUS, Achievements), sounds/images. Not gameplay-inspected.

## Visible wrapper flow (source-backed only)

1. Boot: `window load` -> sets `window.PokiSDK_loadState = 0` and calls `GameMaker_Init()`.
2. Offline shim: inline `window.PokiSDK` no-op stub (`init/gameplayStart/gameplayStop/commercialBreak -> Promise`, `rewardedBreak -> false`) so ad/analytics calls resolve inertly. This is wrapper UI only, not game flow.
3. Start/setup/input/core loop/score/win-lose/restart: **held - compiled engine, not inspected.**

## UI bloat: UNKNOWN

Visible shell is only the GameMaker canvas plus CSS for `div.gm4html5_login` login-dialog styling (present in CSS; whether any dialog is ever created is engine-side, UNKNOWN). No portal-side bloat observed in `index.html`.

## Popups/modals

No HTML modals in the wrapper. The compiled code may create `div.gm4html5_login`-styled dialogs: UNKNOWN, do not assume.

## Animation/simulation

Opaque. The RAF/step loop lives inside `html5game/RetroBowl.js`; renderer-vs-model split cannot be determined from the wrapper. Held.

## Findings

1. INFO - ad SDK is already replaced by a local stub; keep it (offline rule). No fix.
2. INFO - no wrapper defects found. Engine-level review still required before any gameplay claim.

## Recommended playable view

Keep `#canvas`, the loading screen and the Poki stub. Nothing decorative to remove in the wrapper; any UI trimming must wait for engine inspection.

## Validation status

CODE-REVIEW ONLY. Smallest check still needed: load `Games/RetroBowl/index.html`, confirm `GameMaker_Init()` starts, canvas renders a menu, and one full down/quit cycle works - results must be recorded as runtime observation, not source proof.
