# BitLife — play-flow audit (batch 1)

- Identity: catalog id 49, registered. `Games/BitLife/`, entry
  `Games/BitLife/index.html` (blob `010230590a9739765aff6c21823227ce4e41985b`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 12 files / 20,405,872 B.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully, including the provenance comment:
  fan-hosted Unity WebGL port (companyName "3kh0.github.io") of Candywriter's
  BitLife, vendored from `github.com/a456pur/seraph` (branch main,
  `games/bitlife`); gtag and tab-cloak script removed.
- Verified inline offline guard (read verbatim): monkey-patches
  `XMLHttpRequest.prototype.open` and rewrites any URL matching
  `/unity3d\.com|appspot\.com|herokuapp\.com|amongus-online\.net/` to
  `json/null.json?<url>` so Unity IAP / ad-config / cloud-transfer calls are
  routed local. Comment states social/website/store links remain
  user-initiated browser links.
- Wrapper: `TemplateData/UnityProgress.js` (blob `a7dd2dd4`),
  `Build/UnityLoader.js` (blob `40e8eca0`), instantiate
  `UnityLoader.instantiate("gameContainer", "Build/BitLife.json",
  {onProgress: UnityProgress})`, `#gameContainer` full-viewport,
  data-URI SVG favicon, `Build/` blobs (data `d44b3489`, wasm code
  `965d3b67`, wasm framework `f2dc369b`), `json/null.json` (blob `0967ef42`).
  All compiled/binary: **not inspected**. `style.css` (blob `3cf9029d`) not read.

## Flow (wrapper visible; engine UNKNOWN)

- Boot: `UnityLoader` reads `Build/BitLife.json` → progress via
  `UnityProgress` → compiled build in `#gameContainer`.
- Start/setup, input, core loop, life simulation, score/progression, win/lose,
  restart: **UNKNOWN pending engine/runtime review.** All mechanics live in
  compiled Unity data/wasm. No controls, animation or ending may be inferred
  from the title.

## UI bloat: UNKNOWN (wrapper NONE)

- Authored shell has no visible chrome beyond the canvas container; loader UI
  comes from `UnityProgress` (genuine loading state).
- In-game menus/ad prompts are engine-rendered — inventory held. The offline
  guard exists specifically because the build embeds store/ad surfaces.

## Popups / modals

- None authored. Engine-side modals held. Any store/ad attempts are forced to
  `json/null.json` by the guard above (behaviour of the failed loads inside
  the engine unverified at runtime).

## Animation / simulation

- Opaque Unity build. No authored loop.

## Findings

- MEDIUM — compiled-engine gap: no source evidence for input, progression or
  restart; smallest needed check: runtime play pass (start a life, age, open
  menus) plus network tab confirmation that the XHR guard fires.
- LOW — offline guard logs `console.log("--fx--BitLife offline route--", url)`
  on every rewritten request (entry inline script); noise only, remove if
  touched.

## Recommended playable view

No authored text to trim. In-engine popups/menus (including store/ad prompts)
must be reviewed at runtime before any playable-view decision.
