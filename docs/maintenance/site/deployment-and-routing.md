# Deployment and routing

<!-- maintenance-site: deployment-and-routing -->

## Identity and status

Source baseline: `8c8a055813b35bbd5d8b632423328333b4252d43`. This is a
source-only infrastructure review, not a deployed HTTP or gameplay certificate.
The catalog has 115 entries; all 115 URLs resolve to Git blobs. The root is the
published static artifact, not an application source/build workspace.
See [scope](../SCOPE.md), [disabled proxy](proxy-disabled.md), and
[infrastructure findings](../audits/infrastructure.md).

## Implementation map

- `netlify.toml:[build]` sets `publish = "."`; no build command is configured.
  `[functions]` names `netlify/functions`. The only tracked function is
  `netlify/functions/bare.js`, an informational status handler, not a relay.
- `index.html` loads `assets/index-CRWHmtoy.js` as a module and
  `assets/index-CUsUGgbt.css`, then the authored `assets/portal-polish.css` and
  deferred `assets/portal-ux.js`. Preserve ordering. The compiled bundle has no
  editable source here; use the authored layers for bounded refurbishment.
- The catalog is `games.json`, not `docs/catalog_parts/*.json`. In the authored
  UX layer, `fetchGames()` fetches `./games.json` and shares its promise.
  Catalog URLs are relative files beneath `Games/`; spaces are legitimate path
  characters, not evidence of missing assets. Compare decoded URLs with Git.
- The root proxy anchor uses `href="./uv/"`. The only active configured redirect
  is `/uv` to `/uv/` with status **200**, a rewrite rather than a promised 301/302.
  There is no active `/bare/*` redirect and no explicit SPA catch-all in this
  configuration. Directory/index serving and any platform fallback need hosted
  confirmation; do not infer every unknown URL's response from local Python HTTP.
- Static games bootstrap their own files. Shared dependencies can escape the
  game folder: `../_emulatorjs/data/loader.js`, `../../storage/ruffle/ruffle.js`,
  `../../images/ico.ico`, and deeper variants. Deploying one wrapper without its
  dependency closure is not deploying that game.

## Headers and runtime constraints

`netlify.toml:[[headers]] for "/*"` configures:

| Header | Configured value | Boundary |
| --- | --- | --- |
| `X-Content-Type-Options` | `nosniff` | Serve scripts/WASM with correct MIME; HTML error pages cannot stand in for missing assets. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Not a prohibition on outgoing connections. |
| `Content-Security-Policy` | `frame-ancestors 'self'` | Same-origin embedding allowed; foreign framing restricted. No `script-src`, `connect-src`, `style-src`, or `default-src` policy exists. |

`/uv/sw.js` additionally gets `Service-Worker-Allowed: /` and
`Cache-Control: public, max-age=0, must-revalidate`. This permits root scope; it
does not register a worker or enable a backend. Local `http.server` does not
apply these Netlify headers or execute functions.

Do not weaken headers. Conversely, imposing an untested blanket `script-src
'self'` would break inline wrapper scripts and EmulatorJS's blob-script bootstrap;
WASM compilation, worker/blob URLs, WebGL exports and inline styles need a
compatibility inventory before a separately reviewed CSP change. Legacy
`new Function`/`eval` hits in vendor code require caller/data-flow triage, not an
automatic XSS verdict or permission to add `unsafe-eval`. No COOP/COEP headers
are configured; emulator threaded cores require `SharedArrayBuffer` and must not
be enabled just because thread archives exist.

## State and persistence

The status function emits `cache-control: no-store`. The UV worker has explicit
revalidation, but there is no site-wide cache policy here for `games.json`, HTML,
or unhashed shared runtime assets. EmulatorJS independently caches cores/ROMs in
IndexedDB. A cached working game does not prove a cold first visit works, and a
same-length ROM replacement can evade its length-based validation. See
[emulation runtime](emulation-runtime.md) before changing payloads or versions.
No general PWA/offline-install service worker is established by this config.

## Dependencies and provenance

Deployment uses the existing compiled portal, local font files and vendored
engines. [Portal font evidence](../../portal-font-sources.md) pins OFL notices and
binary hashes, separately from license-source revisions. This does not license
game artwork or commercial ports. Static packaging, offline guards and mirror
URLs establish neither owner consent nor redistribution rights.

## Audit findings

- **INF-04, MEDIUM:** `netlify.toml` CSP has only `frame-ancestors`. It does not
  contain script/network execution. Minimal future fix: source-aware report-only
  policy and cold/hot regression matrix before enforce mode; no header change
  is authorized here.
- **INF-05, MEDIUM:** historical `docs/wiki/Security.md` says no remote-dependent
  games remain. Source review of shared EmulatorJS finds a conditional remote
  update fetch; the old statement cannot substitute for a current network audit.
  Minimal fix: main-owned documentation reconciliation against current source.
- A `/bare/*` 404 is the intended disabled outcome, not a bug requiring a redirect.
  Actual hosted status/header behavior was **not tested** by this worker.

## Safe iteration

Keep the root publish model. Do not add a build pipeline, dependencies, aliases,
or an all-path HTML fallback to mask missing game assets. Patch authored wrappers
or config only under an explicit runtime assignment, preserving vendor notices.
Stage named files, never all changes in the shared tree. Review cache invalidation
alongside any shared runtime modification, and retain a reversible small commit.
Any backend/proxy change requires separate security sign-off, absent in this run.

## Verification

Actually run: Git-backed catalog parse/ID/required-field/URL assertions, config
inspection, and syntax checks recorded in [audit evidence](../audits/infrastructure.md).
**Native/browser runs: 0. Hosted requests: 0. Screenshots: 0.**

Recommended hosted checks, not executed:

1. Record GET response status and headers for `/`, `/games.json`, `/uv`, `/uv/`,
   `/uv/sw.js`, `/bare/v3/`, and `/.netlify/functions/bare`. Expect disabled relay
   status, not a functioning Bare protocol. Check an unknown asset path for HTML
   fallback and a known WASM for MIME. Do not POST credentials or test relaying.
2. Open a space-containing catalog path directly, then in the portal iframe;
   inspect request URLs and same-origin frame policy. Test root-mounted and
   subpath hosting separately because UV paths are absolute.
3. Clear caches in a disposable browser profile. Inspect cold and warm shared
   runtime loads, keyboard focus, touch, sound, restart and save restoration.
4. Main alone runs the unchanged all-catalog gate after all writers stop:
   `xvfb-run python3 scripts/smoke_test_games.py`. For the approved bounded sparse
   procedure use `xvfb-run python3 scripts/run_sparse_smoke.py`; it invokes that
   unchanged gate, restores selection and rejects concurrent repository edits.
   No filtered/targeted run substitutes for the full gate. No push here.

The smoke script waits 8 seconds by default, optionally clicks a Play/Start
selector, filters known console/request substrings, and does not subscribe to
`pageerror`. Passing means bounded loading under those filters, not full gameplay,
rights, mobile, Safari, audio or N100 hardware quality. Preserve failure filters;
report exclusions rather than expanding them to obtain green output.

## Future outlook

Week 1: hosted headers/status/MIME and cold-cache evidence, rights holds first.
Week 2: prioritize shared failure feedback and wrapper accessibility, not an
engine rewrite. Week 3: evaluate source-verified lightweight 3D dependencies in
isolated planning, without a guaranteed addition count. Week 4: repeat full
loading and targeted real-device interaction checks before owner release review.
This is a plan, not unattended month-long work or publication authorization.
