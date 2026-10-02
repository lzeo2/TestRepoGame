# Architecture: UNBLOCKMATH // ARCADE

Audited source: `8c8a055`. Read [the maintenance manual](maintenance/README.md), [scope](maintenance/SCOPE.md), [AGENTS](../AGENTS.md) and [quality contract](CODE_QUALITY.md) before changing runtime. This map describes the actual shipped interface, not an available React source project.

## File ownership

| Path | Responsibility and patch boundary |
| --- | --- |
| `index.html` | Document metadata, storage-denial shim, native hidden H1, `#root`, skip link, static proxy/random controls, large historical inline CSS layer. Authored source, but runtime read-only during this audit. |
| `assets/index-CRWHmtoy.js` | Compiled React/React DOM, motion/icon library code and portal application. No source map reference found. Do not hand-edit; source recovery/reproducible rebuild is a separate owner decision. |
| `assets/index-CUsUGgbt.css` | Compiled baseline plus historical override sections. New bounded styling belongs in the authored polish file, not another compiled layer. |
| `assets/portal-ux.js` | Vanilla IIFE: capture-phase launch/search routing, filter overlays, catalog cache, DOM annotation, theme, history, details and observer reconciliation. |
| `assets/portal-polish.css` | Last stylesheet: local fonts, theme tokens, shelf layout, 44px controls, motion suppression and responsive overrides. |
| `games.json` | Canonical runtime catalog, not generated documentation. Seven required fields plus optional tags/players/howto. |
| `assets/fonts/`, `assets/thumbs/`, `assets/portal-share.png`, `favicon.svg` | Local presentation dependencies. Font licenses are beside families; thumbnail/image rights need their own evidence, not the font license. |
| `icons.svg` | Legacy social/documentation SVG symbols. Root entry/UX/application-tail inspection found no active portal consumer; tracked game CSS does reference this filename. Do not delete on that limited observation. |
| `main.min.js` | 105-byte comment-only compatibility stub. A tracked Fireboy/Watergirl engine constructs `/main.min.js`; it is not the portal bootstrap, analytics implementation or proof of engine-wide network neutrality. |
| `Games/<Name>/` | Game-specific HTML, authored wrappers and vendor exports. Some entries are nested or differently named; use catalog URL, not an assumed `index.html`. |
| `Games/_emulatorjs/` | Shared emulator runtime, infrastructure rather than a registered game. |
| `netlify.toml`, `netlify/functions/`, `uv/` | Deployment/security and disabled proxy boundary; see the dedicated operational docs before any work. |
| `scripts/`, `docs/maintenance/` | Runnable checks, source-grounded manuals, findings and inventory. Tests do not generate runtime catalog entries. |

## Startup and two catalog readers

The head storage shim probes `window.localStorage.getItem('__um_probe')` before the module bundle. It substitutes per-page memory only when access/read fails; a successful read does not prove writes are allowed. The bundle creates React StrictMode under `#root`. Its application tail has `Gu` (catalog fetch), `qu` (favorites), `Ju` (app state), `Bu` (card), `Vu` (partition/grid navigation), `Hu` (search), `Uu` (base categories) and `Wu` (iframe modal). These names are observed compiled anchors, not stable public APIs.

The deferred UX script calls `ready(...)`, initializes listeners and independently calls `fetchGames()`. `_gamesPromise` shares that request within the UX layer; it does **not** share the bundle's request. `fetchGameUrlCache()` produces a title-to-URL Map from the same UX promise. `_gamesList` provides tags, counts, details and random selection. A transient UX request failure resolves to `[]` and is cached for that page. Meanwhile the bundle can render cards from its own successful fetch, leaving launch/details unavailable. Catalog changes therefore need a page reload, not just filesystem replacement.

`onMutations()` reconciles after an 80ms timer. It adds card roles, category identifiers, injected chips, tags/info buttons, sorting/status/recent rows and modal backstops. It observes body child/subtree mutations and `class` changes; it is not a bespoke scroll observer. See [portal findings](maintenance/audits/portal.md) for the self-triggering reconciliation risk and search event-order defect.

## Discovery and launch flow

React owns base category state and favorites. UX adds six category chips and four hide attributes for category, tags, favorites and fuzzy title search. CSS hides a card when **any** hide attribute is present. `visibleCards()` tests connection, style and layout; this count drives the polite `.ux-result-status`, while category counts always use the complete UX catalog.

Capture-phase `initCardNewTab()` intercepts card/Play clicks before React. Favorites, info and badges are exempt. Cards use `openCard()` for Enter/Space and geometry-based arrow navigation. `openGameUrl()` validates `safeGamePath()`, records recent launch intent and opens the local URL in a new tab; a blocked popup falls back to the current tab. This means normal portal launch bypasses `Wu`'s iframe modal. The modal's sandbox, loading/focus/close logic remains fallback infrastructure and must not be described as the normal active play surface.

`openDetailPanel()` creates `.ux-detail`, shows text-safe catalog metadata, focuses Play, traps Tab and returns focus on closure. Details are not game controls; `howto` is catalog data that still needs source/native verification. Sort only reorders the standard container; featured cards retain their separate bundle partition despite `display: contents` making the shelf look continuous.

## Browser and deployment boundaries

Portal preferences are same-origin unencrypted localStorage: `unblockmath_favorites`, `unblockmath_recent`, `unblockmath_sort` and `theme`. There is no portal account/cloud sync or root game-save aggregation. [Browser-state documentation](maintenance/site/browser-state.md) records validation, bounds and migration hazards.

The portal requests local JSON, JS/CSS, thumbnails and three font files. Root startup does not install a service worker or link a manifest; a cold offline navigation can still fail when assets are not cached. Game engines and the separate UV launcher have their own dependencies and worker behavior. Do not infer all-game offline compliance from the root interface.

Netlify publishes `.` without a build. Local `http.server` browser tests do not reproduce Netlify headers/functions/redirects. `/bare/*` remains disabled; the Proxy link is navigation to an honest launcher, not a working relay. This architecture pass does not authorize any backend or security changes.

## Inventory, provenance and iteration

There are 115 catalog entries, 120 game directories and the shared runtime at this source. 2048, Foldwild, Hextris, QWOP and Slope are unregistered. `Games/` is sparse-excluded normally: Git tree/blob access is authoritative, missing workspace files are not missing deployed assets. The manual includes unregistered games without registering them.

Historical `docs/GAMES.md`, wiki and audit batches contain useful source trails but stale counts and claims. Prior "original code" descriptions are not legal evidence. Verify each upstream/code/art/ROM term separately; local availability, an MIT wrapper or browser success cannot relicense another work. Operator-authorized originals do not create standing permission for new self-made games. Foldwild's held input/native QA remains separate from portal checks.

For refurbishment, fix authored event/state boundaries first, preserve selectors consumed by UX/tests, and leave compiled engines alone. Main owns subjective desktop/mobile/theme review and final integration. Use the [testing manual](maintenance/site/testing.md) for static and native coverage; no publication follows automatically from a documentation commit.
