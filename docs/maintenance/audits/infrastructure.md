# Infrastructure source audit

<!-- maintenance-audit: infrastructure -->

## Scope and evidence

Delegation 59; actual environment printed `PI_PROVIDER=openai-codex` and
`PI_MODEL=gpt-6.1-sol`. Source baseline:
`8c8a055813b35bbd5d8b632423328333b4252d43`. Owned output is only the four new
site manuals and this audit. No runtime, license, catalog, sparse-selection,
proxy, Netlify or game changes. No addition, registration, deletion or push.

Manuals:
[deployment](../site/deployment-and-routing.md),
[disabled proxy](../site/proxy-disabled.md),
[shared emulation](../site/emulation-runtime.md),
[rights/sparse workflow](../site/rights-and-sparse-workflow.md).
Main owns integration, design, subjective UI review, rights disposition and
release. Findings are recommendations, not patches applied by this worker.

Read AGENTS, CODE_QUALITY, maintenance SCOPE and `docs/proxy.md` completely before
review. Read complete Netlify config/function and all four tracked UV files;
read all nine small EmulatorJS wrappers and loader, storage, GameManager,
gamepad, minifier and version metadata. Inspected selected emulator bootstrap,
network, core/ROM cache, controls, persistence and netplay functions. Relevant
live-minified tokens were cross-checked; that is not whole-bundle review.

Also read complete BitLife/Subway wrappers and their build JSON, Baldi build
JSON, Fancy Pants 3/Bloons subpage/Crush the Castle wrappers, local shared stubs,
Balatro CREDITS, current pending-rights/removal/font evidence and historical
catalog source batches 9/10 and audit batch/playtest samples 5/7/R9/R10.
Read the Character Alsen JavaScript response path without editing protected
files. Reviewed thumbnail construction and smoke/sparse-gate mechanisms.
Legacy `docs/GAMES.md` and wiki count/security introductions were sampled for
staleness, not fully re-audited gameplay statements.

**Coverage exclusions:** emulator engine outside selected ranges; full minified
vendor code; touch/shader/socket/compression implementation; 39 core archive
contents; ROM/ZIP/WASM/SWF/Unity compiled gameplay; every legacy engine's external
endpoint/font closure; all game controls/fidelity; licensing adjudication.
No binary decompilation or archive expansion occurred. Wrapper reading is not a
claim of fully reviewing engines. No exploit, browser, network, screenshot or
hardware run was performed.

## Ranked source findings

Each row is a separate source finding. Native repro steps below are recommended,
not executed. HIGH rights entries are release evidence holds, not adjudicated
copyright infringement. No secret was discovered or repeated in this audit.

| ID / severity | Exact path and anchor | Impact and minimum root fix | Recommended repro / verification |
| --- | --- | --- | --- |
| **INF-14 / HIGH** | `Games/Character AI/Alsen.html:addMessage()` line 415, HTML sink line 433, called by `handleInput()` with raw `userInput.value` and by bot replies | `bubble.innerHTML = text.replace(...)` interprets user markup. Generated name replies can also carry unescaped text. Confirmed source flow, not merely an `innerHTML` keyword hit. Fix the shared message sink to plain text with newline CSS, separating any intentional trusted markup. **Protected read-only: no fix authorized here; main must escalate for an explicit protected-boundary decision.** | In an isolated nonpublished copy/profile, enter inert HTML and inspect whether markup becomes an element. A later approved fix must preserve literal text and multiline replies on both user/bot routes. No payload execution was attempted. |
| **INF-06 / HIGH** | `Games/_emulatorjs/data/emulator.js:checkForUpdates()` line 232; constructor line 248; corresponding live `emulator.min.js` fragment | Localhost/127.0.0.1 or debug boot performs remote version fetch to `raw.githack.com`. Violates strict offline dependency policy in development and contaminates native loading evidence. Remove/disable updater at shared source and update production artifact using a legitimate reproducible path; do not hand-edit compiled output or install tooling here. | Localhost cold-load a licensed fixture with third parties blocked; record requests and unhandled failures. Hosted normal mode should be checked separately because the trigger is conditional. |
| **INF-08 / HIGH** | `Games/_emulatorjs/data/storage.js:EJS_STORAGE.put/remove`; `GameManager.js` constructor/save-save sync callbacks | `put/remove` open errors and some delete errors leave promises pending; save filesystem sync errors are ignored. Save/cache actions can hang or appear successful despite persistence failure. Settle all error/abort paths and propagate save errors to one visible runtime handler. | Deny IndexedDB or inject open/transaction failures in a disposable profile; verify exports/settings remain usable, an error is visible and no save success is claimed. Check IDBFS sync failures independently. |
| **INF-12 / HIGH** | `Games/DrMario/index.html:EJS_gameUrl` and entries 115-121; `_emulatorjs` embedded About/license; `Games/Balatro/CREDITS.md` | Commercial ROM/binary redistribution terms are unverified; emulator GPL does not license ROMs. Balatro's local MIT claim is not independent source/assets verification. Core pins/source obligations are incomplete. Resolve code/assets rights separately with canonical immutable source and retained notices; owner decision required, no blanket removal or new permission claim. | Source/notices/asset-owner review before release. Browser loading cannot resolve this finding. Existing retention instruction is not copyright-holder consent. |
| **INF-07 / MEDIUM** | `Games/_emulatorjs/data/loader.js:loadScript/loadStyle` | Promises have only `onload`; missing JS/CSS awaits forever. Add shared error rejection/deadline and clear useful unavailable state once, rather than nine wrapper workarounds. | Block `emulator.min.js` then CSS independently; require bounded failure feedback and recoverable reload. |
| **INF-10 / MEDIUM** | `Games/_emulatorjs/data/emulator.js:saveSettings/loadRewindEnabled/loadSettings` lines 3522-3593; live minified counterparts | `localStorage` property/read/write access is outside JSON catches. Denial/quota errors can interrupt constructor or settings actions despite parse recovery. Guard storage operations, retain in-memory defaults and distinguish play from unsaved settings. | Storage-denied profile and full quota; malformed JSON is a different case and must still recover. |
| **INF-11 / MEDIUM** | `Games/_emulatorjs/data/GameManager.js:getStateInfo()` | A 50 ms interval has no timeout/cancellation; failed native save-state export can poll indefinitely. Add deadline and cleanup on failure/teardown, rejecting the operation. | Simulate native state info never becoming nonempty; verify interval ends and save UI reports failure. |
| **INF-09 / MEDIUM** | `Games/_emulatorjs/data/emulator.js:downloadGameCore()` lines 626-645 | Thread and nonthread downloads share the same `<core>-wasm.data` cache key; changing mode may execute the wrong cached archive. Include mode/revision in cache identity before enabling threads. Current wrappers do not enable threads, so this is conditional, not a proven current crash. | Authorized future mode-switch fixture, warm both directions; verify fetched archive/mode identity and required isolation headers. |
| **INF-15 / MEDIUM** | `Games/_emulatorjs/data/emulator.js:downloadRom()` lines 975-1002 | Cache validation uses basename and content-length, not content identity. Same-length replacement or repeated basename can return stale/different data. Key by resolved game identity and pinned revision/content hash; migrate cache without deleting saves. | Controlled licensed fixture with equal-length different payloads at two paths and after update; verify intended bytes cold/warm. |
| **INF-01 / MEDIUM** | `uv/index.js:serviceWorker.register` before `BACKEND_ENABLED` launch gate | If distribution/config became available, a root worker would register even with backend disabled. Today's missing config exits first. Gate registration itself under an explicitly reviewed inert-state policy, never enable the relay as a fix. | Static assertion plus disposable browser test that a distribution-only hypothetical change cannot silently register root scope. No distribution change is authorized here. |
| **INF-02 / MEDIUM** | `uv/index.html` bundle/client script tags; current `uv/` Git listing | Unavailable feature loads missing local scripts, creating predictable console/request noise. Simplify to honest static disabled state without missing-dependency probes. Keep back navigation and disabled launch. | Hosted `/uv/` unavailable state remains accessible without script errors; no backend or worker activation. |
| **INF-03 / MEDIUM** | `netlify/functions/bare.js:publicBareUrl` | Arbitrary `PUBLIC_BARE_URL` environment string is public JSON. A secret-bearing URL set by mistake would be disclosed; no actual secret is established. Reject sensitive/nonpublic values or omit field, with review. | Invoke handler only with harmless synthetic values, then hosted test; assert false flags and absent credentials. Do not enumerate live environment. |
| **INF-04 / MEDIUM** | `netlify.toml:[[headers]] Content-Security-Policy` | `frame-ancestors 'self'` protects framing only, not script/fetch policy. Add source-aware report-only evaluation before any enforced tightening; preserve existing headers and engine compatibility. | Hosted headers, inline/blob/WASM/worker matrix; local Python server cannot prove platform headers. |
| **INF-05 / MEDIUM** | `docs/wiki/Security.md:Offline-first as a security property` | Categorical no-remote-dependency statement exceeds current evidence; shared updater is a confirmed conditional remote call and compiled legacy closure is unreviewed. Main should reconcile current claim against source, preserving historical evidence. | Cross-reference current loader reports and dated source audits, not a prior smoke pass. |
| **INF-13 / MEDIUM** | `docs/GAMES.md` / `docs/wiki/Game-List.md` introductions; `docs/pending-rights.md` introductory count | Historical 120/113 counts differ from current 115. Generic controls/rights claims can mislead later maintenance. Main should update current summaries/index links without rewriting removal history or inventing control support. | Git-backed inventory checker after all page writers land; compare per-game source, not folder presence on sparse disk. |

## Non-findings and constraints

- No active `/bare/*` forwarding config. Status JSON's `status:'ok'` is function
  status with `proxyEnabled:false`, `localBare:false`, `bare:null`; it is not
  evidence of functioning proxy. No endpoint added or enabled.
- Current UV distribution absence was checked against Git. Historical proxy
  docs' absence statement is not contradicted by the sparse filesystem.
- `cdnScript` in Fancy Pants 3 points to **local** `ruffle/ruffle.js`; naming alone
  does not establish external traffic. Ruffle fallback/shared hashed payloads
  have real consumers. No shared runtime files were deemed unused.
- Dormant emulator netplay URL is gated by debug plus experimental flag, not an
  observed ordinary production connection. Links in About/license UI are not
  runtime asset fetches. `new Function('return this')` in a vendor global-object
  fallback is not a proven user-controlled XSS flow.
- `GameManager` uses virtual filesystem paths for engine operation. Do not
  misclassify those as this audit machine's path leakage; no such paths are
  copied into committed evidence.
- `storage/js/cloak.js` exists as a local no-op; old benign-filter wording about
  cloak absence cannot prove the current file missing. Favicon/shared stub
  consumers were recorded, not deleted.
- No Eagler-named baseline path; protect offline/GPL/ownership requirements if
  present in future. Character AI remains byte-unchanged and read-only.

## Inventory and storage evidence

NUL-safe `git ls-tree -rlz 8c8a055` established:

```text
catalog: 115 entries, 115 unique IDs, required fields and tracked URLs PASS
shared emulator: 75 files, 51334846 bytes; cores 39
storage: 6 files, 28941987 bytes; images: 1 file, 1024 bytes
```

Storage consists of a 34-byte no-op cloak plus five Ruffle files. Four tracked
`.gba` files exist (Balatro, DrMario, MarioKartSuperCircuit, StreetFighter2);
other GBA wrappers use local ZIPs. Counts by selected extension across Games:
11 `.swf`, 13 `.wasm` (15 site-wide including shared storage), no loose
`.nes/.gb/.gbc/.n64/.z64/.v64/.sfc/.smc`. These counts do not classify ZIP/core
contents and do not imply rights clearance.

Small-entry source scan found nine shared EmulatorJS consumers, five shared
Ruffle consumers, six cloak consumers and eight favicon consumers. This is a
bounded entry scan, **not absence evidence for all engine-generated requests**.
No Google Fonts/CDN EmulatorJS match was found in that entry subset; full legacy
font/compiled network closure remains outside this worker's evidence.

Owned source extraction used 911,047 logical temporary bytes, below 1 MiB;
document payload is measured separately in completion output. No 51 MB runtime
or 1.88 GB Games materialization. Initial and final rounded disk guard:
`29G 26G 2.4G 92% /`; no filesystem-free-space delta is inferred at that precision.
No source assets or original models were modified.

## Actually executed verification

```text
node --check via Git stdin: PASS (13 scripts; no execution)
GBA wrappers: PASS (9 inline scripts, 9 local gameUrl blobs, shared loader)
catalog: PASS (115 entries/unique IDs/required fields/tracked URLs)
deployment/proxy: PASS (root publish, only UV rewrite, frame-ancestors CSP, false flags, 4 absent UV distribution blobs, no Eagler-named paths)
source temporary extraction logical bytes: 911047
owned Markdown: PASS (5 paths; sections, baseline, relative links, no personal-email/local-path/em-dash patterns)
PASS: pinned static routes, disabled proxy flags and 115 Git catalog URLs
```

Thirteen parsed scripts: `uv/index.js`, `uv/sw.js`, `uv/uv.config.js`,
`netlify/functions/bare.js`, emulator `loader.js`, `storage.js`, `GameManager.js`,
`gamepad.js`, `emulator.js`, `emulator.min.js`, `minify/index.js`,
`storage/js/cloak.js` and `main.min.js`. Parsing the minifier does not run it or
prove dependencies installed. Inline wrapper checks covered exactly the nine
entries listed in the emulation manual. No patched/authored runtime code exists
in this diff, so no behavior-changing code is being represented as tested.

**Native/browser gate count: 0. Hosted HTTP checks: 0. Screenshots: 0.
Full gate: not run by worker.** A timed-out initial broad consumer grep was
replaced with bounded small-entry Git-blob inspection; it is not counted as full
reference-audit success. Diff/owned-document assertions run before commit are
reported in completion, not guessed here.

### Small runnable source invariant check

Read-only; run from repository root. This establishes source invariants, not
Netlify HTTP behavior or runtime safety:

```sh
python3 -B - <<'PY'
import json, subprocess, tomllib
ref = '8c8a055'
def blob(path):
    return subprocess.check_output(['git', 'show', ref + ':' + path])
config = tomllib.loads(blob('netlify.toml').decode())
assert config['build']['publish'] == '.'
assert config['redirects'] == [{'from': '/uv', 'to': '/uv/', 'status': 200}]
assert config['headers'][0]['values']['Content-Security-Policy'] == "frame-ancestors 'self'"
assert 'var BACKEND_ENABLED = false;' in blob('uv/index.js').decode()
assert 'proxyEnabled: false' in blob('netlify/functions/bare.js').decode()
games = json.loads(blob('games.json'))
assert len(games) == len({g['id'] for g in games}) == 115
for game in games:
    subprocess.check_call(['git', 'cat-file', '-e', ref + ':' + game['url']])
print('PASS: pinned static routes, disabled proxy flags and 115 Git catalog URLs')
PY
```

## Recommended native/release sequence

1. Main resolves protected/rights findings and ranks source repairs; this worker
   makes no gameplay/UI judgment. No automatic legal deletion or rebuild.
2. Obtain legitimate reproducible vendor update path before touching bundles;
   retain notices and add one small failure-path regression for actual new logic.
3. With writers stopped, main runs unchanged full catalog smoke through the
   approved sparse wrapper. Preserve filters and report exclusions separately.
   Current smoke has no `pageerror` listener, an 8-second default wait, software
   GL flags and known-error/request filtering. It does not prove complete play.
4. Focused native checks above, real desktop/mobile both-theme screenshots,
   cold/warm offline profiles and N100/Safari testing are independent evidence.
5. Any failing or blocked gate remains explicit. Owner decides release exceptions;
   no push from this task, no unattended month-long promise.

## Future outlook

Immediate: protected message sink decision, conditional updater and save failure
handling; parallel owner rights/source triage. Next: loader/storage/cold-cache
reliability and wrapper focus/control help. Only then research source-verified
lightweight 3D ports, with no guaranteed count or new-build permission inferred
from this audit. End-of-month checkpoint: fresh full loading gate, targeted
interaction/save evidence, rights disposition and actual hardware results before
main requests a release decision.
