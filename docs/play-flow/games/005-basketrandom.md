# Basket Random — play-flow audit (batch 1)

- Identity: catalog id 5, registered. `Games/BasketRandom/`, entry
  `Games/BasketRandom/index.html` (blob `a3704d1f5823391f25298c87a14e8c77de2cf718`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 77 files / 3,385,055 B.
  `@source.txt` present (blob `bcd4bdb3`, not read).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. Construct 3 export: `<meta name="generator"
  content="Construct 3">`, `appmanifest.json`, `style.css`, a keydown guard
  preventing default for space/arrows (lines 14-21), then scripts:
  `box2d.wasm.js`, `scripts/supportcheck.js`, `scripts/offlineclient.js`,
  `scripts/main.f.js`, `scripts/register-sw.js`.
- `scripts/register-sw.js` (blob `f3e5e2071d4402fa901035e355c36db87d7e2f7f`),
  read fully: `C3_RegisterSW` body is dead (`if (navigator.serviceWorker &&
  1 == 0)`), so no service worker registers.
- `scripts/c3runtime.js` (blob `2559316c582565021abf4f75ab1b006bf2d4b372`,
  ~967 KB): only the injection site inspected — it creates a script element
  with `r.src='js/main.min.js'` inserted into the document (grep context:
  `...getElementById(a)||(...r.id=a,r.src='js/main.min.js',n.parentNode.insertBefore(r,n))...`
  tagged `'gamedi...'`). Full runtime body held.
- `js/main.min.js` (blob `62a3330be3df3c18a80a7e028498840de2c78d5a`):
  endpoint scan only — contains absolute URLs:
  `https://www.googletagmanager.com/gtag/js?id=`,
  `http://imasdk.googleapis.com/js/sdkloader/ima3.js`,
  `https://ana.headerlift.com/event?`,
  `https://cdn.gamedock.io/gamedock-web-tracker/...`,
  `https://ext.minijuegosgratis.com/external-host/main.js`,
  `https://game.api.gamedistribution.com/...`, `https://html5.api.gamedistribution.com/...`.
  Execution conditions not verified (CODE-REVIEW ONLY).
- `js/analytics_ubg_v1_4.js` (blob `371c2d2a`, googletagmanager URL) and
  `js/ubg235_client_v1_1.js` (blob `96eaeec9`, `https://ubg235.com/...`) are
  present; no reference to them found in `index.html` or `scripts/main.f.js`.
- Held: `scripts/main.f.js`, `scripts/main.js`, `scripts/offlineclient.js`,
  `scripts/supportcheck.js`, `data.json` (Construct project data), all image/
  media assets, `ubg235.html`, `appmanifest.json`, `style.css`.

## Flow (wrapper visible; engine largely UNKNOWN)

- Boot: `supportcheck.js` → `offlineclient.js` → `main.f.js` loads
  `scripts/c3runtime.js` (+ workers, `opus.wasm.js`), which loads `data.json`
  and renders the Construct runtime.
- Start/setup, input mapping, core loop, scoring, win/lose, restart:
  **UNKNOWN pending engine review** — all logic is in the Construct runtime +
  `data.json`, uninspected. The keydown guard in the entry only blocks page
  scroll for space/arrows.
- The `c3runtime` → `js/main.min.js` injection is a real source-level load of
  an ad/analytics SDK bundle; whether its network calls fire at runtime is
  **not verified here**.

## UI bloat: UNKNOWN

- Authored wrapper: NONE (no visible chrome beyond a hidden `#fb-root`).
- All menus/HUD are engine-rendered from `data.json` — inventory held.

## Popups / modals

- None authored. Engine-rendered overlays (including any ads/share prompts the
  SDK bundle might add) held pending runtime check.

## Animation / simulation

- Construct c3 runtime + Box2D wasm (`box2d.wasm.js`): opaque. No authored
  game loop in this directory.

## Findings

- **HIGH** — `scripts/c3runtime.js` injects `js/main.min.js`, which carries
  third-party endpoints (gtag, IMA SDK, headerlift, gamedock, minijuegos,
  gamedistribution). Offline policy (CODE_QUALITY §1.2) forbids runtime
  third-party loads; this is a candidate violation until proven inert.
  Root: `scripts/c3runtime.js` (injection site) → `js/main.min.js`.
  Fix direction: block/strip the injection path, then verify offline in a
  browser; do not delete files without tracing remaining consumers.
- MEDIUM — dormant `js/analytics_ubg_v1_4.js` and `js/ubg235_client_v1_1.js`
  (tracking clients) sit in the tree unreferenced by the entry; evidence before
  any deletion: grep all consumers first (this report only grepped entry +
  `main.f.js`).
- LOW — `ubg235.html` alternate entry exists and is not linked from
  `index.html`; harmless but unowned surface.

## Recommended playable view

Nothing authored to trim yet; the whole visible UI is engine output. Any
playable-view or popup decision must wait for the runtime/`data.json` review
and the HIGH finding above.
