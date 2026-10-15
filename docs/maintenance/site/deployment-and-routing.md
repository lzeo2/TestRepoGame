# Deployment and routing

<!-- maintenance-site: deployment-and-routing -->

## Identity and status

Current SEO/PWA review (2026-10-15), starting source `81656833`: **125**
registered games, all URLs checked against Git. The operator-confirmed static
base is **https://lzeo2.github.io/TestRepoGame/**. Repository-root files are the
published artifact beneath that subpath; no application build is needed.
The Netlify configuration review below is historical (`8c8a055`), not evidence
that GitHub Pages applies Netlify headers, redirects or functions. Current local
browser checks are bounded portal checks, not hosted HTTP or gameplay acceptance.
See [scope](../SCOPE.md), [disabled proxy](proxy-disabled.md), and
[infrastructure findings](../audits/infrastructure.md).

## Implementation map

- `netlify.toml:[build]` sets `publish = "."`; no build command is configured.
  `[functions]` names `netlify/functions`. The only tracked function is
  `netlify/functions/bare.js`, an informational status handler, not a relay.
- `index.html` loads `assets/index-CRWHmtoy.js` as a module and
  `assets/index-CUsUGgbt.css`, then the authored `assets/portal-polish.css` and
  deferred `assets/portal-ux.js`, followed by `assets/portal-seo.js`. Preserve
  ordering. The compiled bundle has no editable source here; use the authored
  layers for bounded refurbishment.
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
`manifest.webmanifest` now supplies Add-to-home-screen metadata, but no general
PWA caching service worker is registered. Installation is not a complete offline
cache: a cold visit still needs the server and games retain their own dependencies.

## Dependencies and provenance

Deployment uses the existing compiled portal, local font files and vendored
engines. [Portal font evidence](../../portal-font-sources.md) pins OFL notices and
binary hashes, separately from license-source revisions. This does not license
game artwork or commercial ports. Static packaging, offline guards and mirror
URLs establish neither owner consent nor redistribution rights.

## SEO, sitemap and install metadata (2026-10-15)

- `index.html` has absolute canonical, OG URL and OG image URLs under the confirmed
  GitHub Pages base. Other new resource links are relative, including the manifest,
  sitemap, Apple touch icon and authored metadata script. No deep-link route,
  duplicate launch page, build pipeline or new third-party runtime load was added.
- Run `python3 -B scripts/generate_sitemap.py` after a catalog change, then
  `python3 -B scripts/generate_sitemap.py --check`. It emits 126 URLs (portal plus
  125 entries), validates decoded paths against `git ls-files`, rejects duplicate
  IDs/URLs and invalid paths, and percent-encodes spaces. It does not require Games
  to exist in the sparse working tree. No invented modification dates/priorities.
  Submission/discovery by actual crawlers is not verified; no robots file changed.
- `assets/portal-seo.js` updates document title, description and OG title/description
  while Info/player selection is open and restores root values on close. It reads
  the local catalog once because the compiled shelf omits description nodes.
  Canonical/OG URL remain the real portal URL. **These are runtime browser metadata,
  not crawler-readable per-title static pages.** The authorized static follow-up
  now finds descriptions in all **124 nonprotected entry heads** (125 registered
  games total). Character AI remains a documented read-only exception. This lane
  changed 108 of its 122 owned entries and retained 14 meaningful descriptions;
  Wings and Jetpack Joyride Hacked are separately owned. OG coverage remains 5
  titles and 3 descriptions, not a claim of complete social metadata. See
  [exact metadata changes and limits](../audits/fleet-followup-descriptions.md).
  No engine, runtime tracking, style, canonical or routing changes were made by
  this metadata lane; crawler discovery/indexing is still unverified.
- Manifest `id`, `start_url`, `scope` resolve to the deployment directory; display
  requests standalone. Light `#f5f5f7` background/theme colors express a launch
  surface preference, **not a forced installed light theme**. The existing portal
  theme toggle, saved preference and OS default remain unchanged. Browser chrome,
  splash screens, installation availability and system overrides vary by platform;
  native Android/iOS installation and forced-dark behavior are unverified. No
  custom install prompt or service worker was added, and no offline promise made.
- `assets/pwa-{180,192,512}.png` are local rasterizations of the existing authored
  `favicon.svg` rounded tile/U polygon, not game art or imported branding. They
  total 15,855 bytes; manifest icons use purpose `any`, not a maskable-safe claim.
  Rasterization used existing Pillow, with no dependency installation.

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

Current focused checks: `python3 -B scripts/test_portal_seo.py --browser` passed
125 native Info selections/descriptions, player/reset, root/subpath URLs, manifest,
icon sizes and desktop/mobile light/dark portal loads. Four screenshots reviewed;
no page/HTTP errors, no service-worker registrations. Player documents are explicit
routing fixtures, not gameplay evidence. Original HTML body (except the new local
script tag), original script elements and compiled JS/CSS remain byte-for-byte.
`G-ERN6R7YHJ5` was absent in both baseline/current index; no analytics was added,
removed or altered. Hosted requests and native installation checks: **0**.
See [current evidence and limits](../audits/fleet-2026-10-15-lane5.md).

Historical Git/config/syntax checks remain in
[audit evidence](../audits/infrastructure.md). Maintenance coverage first blocked
on concurrent Games edits, then on `Inventory stale: inspect changes, then run
--refresh.` Inventory was not refreshed by lane5 and then predated seven registrations
(118 versus 125). Lane7 subsequently reconciled 130 project manuals / 125 registered
entries after Git inspection. The [fleet handover](../audits/fleet-2026-10-15-handover.md)
retains the historical failed 122/125 full gate and then-pending identity hold.
Approved remediation is now verified in the [pre-gate follow-up](../audits/fleet-followup-handover.md);
the fresh full gate is still next, not passed. Its former static-description gap
is superseded only by the bounded metadata
receipt below, not by gameplay or hosted crawler acceptance. Documentation
coverage does not authorize push.

Static-description follow-up: `python3 -B scripts/update_game_descriptions.py
--check` reports 124/124 nonprotected descriptions and zero owned changes needed.
`python3 -B scripts/test_portal_seo.py --check --metadata-baseline e787681` checks
125 catalog mappings, 126 sitemap URLs, protected-tree identity, byte-preserving
parser fixtures and all 122 owned entry diffs. Apply mode excludes Character AI,
Wings and Jetpack Joyride Hacked; it reads sparse HEAD blobs and writes only changed
entries without changing sparse selection. ASCII entities preserve existing
charsets/BOM/newlines. The delegated pre-gate documentation lane now refreshes
inventory after committed source and byte-preservation inspection. No new browser,
screenshot or full-fleet result
is claimed by this static follow-up.

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
