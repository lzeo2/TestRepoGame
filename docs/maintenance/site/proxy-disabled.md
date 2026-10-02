# Disabled proxy maintenance

<!-- maintenance-site: proxy-disabled -->

## Identity and status

Reviewed Git source at `8c8a055`. `/bare/*` must stay disabled. No security sign-off,
backend work, dependency installation or endpoint repointing is authorized.
Read [original proxy design](../../proxy.md) for history, but its enable/install
instructions are not permission for this run. All four UV distribution files
are actually **absent from Git**, not merely absent from the sparse workspace.

## Implementation map

The complete tracked launcher is `uv/index.html`, `uv/index.js`, `uv/uv.config.js`
and `uv/sw.js` (4 files, 15,117 logical bytes). All four were read in full.

1. HTML starts with disabled `#launch-btn`, `#proxy-form`, labelled `#proxy-url`
   and hidden `#uv-status[role=status]`. It loads `uv.bundle.js`, config,
   `uv.client.js`, then `index.js`. The bundle/client tags point to missing local
   files; failed loads are expected source consequences, not a working proxy.
2. Config exits when `UltravioletCodec` is undefined, leaving `self.__uv$config`
   undefined. Otherwise it supplies `bare: '/bare/'`, `prefix: '/service/'`, codec
   methods and absolute `/uv/` handler/client/bundle/config/worker paths.
3. `index.js` closes over `BACKEND_ENABLED = false`. `report()` uses
   `textContent`, updates `hidden` and `.is-error`; `setLaunchDisabled()` sets
   native `disabled` and `aria-disabled`. Missing config returns **before** worker
   registration or form-handler binding, so today's absent distribution does
   not register a new root worker through this entry.
4. If config were present, registration of `/uv/sw.js` with `{scope:'/'}` occurs
   **before** the backend flag is consulted. Registration failure reports an
   error but is not a readiness prerequisite for the rest of that hypothetical
   flow. Do not equate the backend flag with complete worker isolation.
5. `uv/sw.js` tries relative `importScripts('./uv.sw.js')`; on failure it logs
   and calls `self.registration.unregister()`, with swallowed unregister errors.
   The imported distribution is not tracked, so it provides no relay here.
6. `netlify/functions/bare.js:exports.handler` is reached at
   `/.netlify/functions/bare`, not at `/bare/*`. It returns 200 JSON with
   `status:'ok'`, `proxyEnabled:false`, `localBare:false`, `bare:null`,
   `publicBareUrl`, explanatory strings and config/document paths. "ok" means
   this status handler responded, not that a proxy is healthy.

## Input and trust boundaries

The submit handler, if dependency setup reaches it, prevents default and checks
`BACKEND_ENABLED` first. Its inactive URL path trims input, rejects C0/DEL/C1
characters, defaults missing schemes to HTTPS, and `isHttpUrl()` accepts only
`http:`/`https:` via `URL`. Navigation would be `prefix + encode(url)` using
`window.location.assign()`. These client checks are neither server access control
nor an SSRF-resistant forwarding service. No forwarding service exists here.
No URL input is written into the DOM via HTML interpretation.

`PUBLIC_BARE_URL` is read directly from environment and serialized to public
JSON. It changes neither config, launcher flag nor Netlify redirects. Treat it
as public data: no credentials, tokens, private internal addresses or personal
information in the value. The handler does not sanitize a mistakenly secret
value. No environment values were enumerated or echoed during this audit.

## State and persistence

No launcher localStorage/save keys exist. Service-worker registration is
origin-level browser state; a previously installed worker can survive repository
changes. Source absence is not proof that existing profiles have no worker.
Recommended diagnosis uses a disposable profile and inventories registrations
without indiscriminately clearing the whole origin's game saves. Root scope is
permitted by `Service-Worker-Allowed: /`, not established by that header alone.
Absolute config/register paths also prevent claiming subpath-host compatibility
from `sw.js`'s relative import alone.

## Dependencies and provenance

The named upstream package is `@titaniumnetwork-dev/ultraviolet`; its distribution,
license and pinned revision are not present in this launcher tree. Do not claim
an installed UV release. The repository contains no Bare server implementation.
Netlify's function response is informational; a static server cannot become a
long-lived WebSocket-upgrade server through this function. No public relay is
configured. Historic third-party relay URLs in comments are history, not loads.

## Audit findings

- **INF-01, MEDIUM:** `uv/index.js`, registration before `BACKEND_ENABLED` gate.
  A future distribution-only change could install a root worker despite disabled
  backend status. Minimal fix under a separate approved assignment: gate worker
  registration on explicit disabled-state policy and verified readiness, never
  enable the backend as a repair. Today's missing config still exits first.
- **INF-02, MEDIUM:** `uv/index.html` missing bundle/client script tags create
  local load errors for an intentionally unavailable feature. Minimal fix:
  maintain a static unavailable page without probing missing distribution files;
  preserve honest status, disabled launch and back navigation. Do not vendor UV
  or activate a relay to silence the errors.
- **INF-03, MEDIUM:** `bare.js:publicBareUrl` publishes an unrestricted environment
  string. This is a potential misconfiguration exposure, **not evidence of a
  discovered secret**. Minimal future fix: reject credential-bearing/nonpublic
  informational URLs or omit the field, with security review.

## Safe iteration

Only disabled-state wording/accessibility and inert-launch behavior are normal
maintenance patch points, subject to an actual runtime assignment. Keep
`BACKEND_ENABLED=false`, `proxyEnabled=false`, `localBare=false`, `/bare/` config
and no active redirect. Keep status in plain text. Do not copy old `npm` setup
steps into a task as required remediation. Historical `docs/proxy.md` statements
about absent distributions match current Git, but its enable guidance is
superseded by this run's explicit prohibition and AGENTS sign-off boundary.

## Verification

Actually run: `node --check` via Git-blob stdin for launcher/config/worker/function;
static config and distribution-absence assertions. The status function was
inspected, not invoked on Netlify. **Native/browser checks: 0; hosted checks: 0.**
Recommended: in a disposable browser profile open `/uv/`, verify disabled button,
clear unavailable status, no successful root registration, and back-link focus.
Record intended missing-script requests separately from other failures. On the
actual host check `/bare/v3/` is unavailable and function JSON remains false even
with a harmless informational URL; inspect `no-store` and scope headers. A local
Python HTTP 404 does not establish Netlify behavior. Do not send real credentials,
relay traffic or mutate runtime flags to test inactive code.

## Future outlook

First simplify the unavailable feature and correct status-endpoint terminology.
Later review origin-level worker cleanup and env disclosure boundaries. Proxy
activation is deliberately excluded from the refurbishment month; it needs a
separate operator security decision, not merely a controlled-server suggestion.
