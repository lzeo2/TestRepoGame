# Frozen-tree static code audit

<!-- maintenance-audit: tracked-tree -->

Source: `8c8a055813b35bbd5d8b632423328333b4252d43`. Collector: delegation 57,
actual `openai-codex/gpt-6.1-sol`. Runtime is read-only in this task. This report
covers the entire tracked tree's metadata and selected source extensions by
machine scan, not every engine by human review. See [machine evidence](static-tree.json),
[complexity review](complexity.md), and [scope contract](../SCOPE.md).

## Method and measured coverage

`../../../scripts/audit_site_tree.py` uses `git ls-tree -rlz` and a single
`git cat-file --batch` reader against a resolved, frozen commit. NUL-delimited
metadata handles spaces/Unicode without shell splitting. Files are read through
128 KiB chunks, incremental UTF-8 decoding and a 4 KiB overlap. Regex matching is
delayed over that overlap to avoid double counting split tokens. No Games
checkout, dependency installation, dev server or binary-engine extraction occurs.

| Measurement | Actual result |
| --- | ---: |
| Tracked blobs, all extensions | 11,830 |
| Tracked logical bytes | 1,931,546,285 |
| Source-extension blobs scanned | 2,217 |
| Source-extension bytes scanned | 232,115,906 |
| Games source-extension blobs scanned | 2,145 |
| Games source-extension bytes scanned | 230,312,473 |
| Extension-excluded blobs | 9,613 |
| Extension-excluded bytes | 1,699,430,379 |
| JavaScript/HTML files over the structural parse cap | 81 |
| Node parser units passed / failed | 220 / 0 |
| Native browser checks by this worker | 0 |
| Screenshots by this worker | 0 |

Exact per-extension counts/bytes are `scanned_extensions` and
`excluded_extensions` in the JSON. Selected extensions are HTML/HTM, JS/MJS/CJS,
CSS, JSON, TOML, Python and shell. CSS and TOML receive pattern scanning, not
language parsing. JSON receives pattern scanning; only the runtime catalog is
schema-validated here. Historical Markdown/licenses and arbitrary extensionless
text are outside the machine pattern selection. They are not mislabeled binaries.

Structural parsing is capped at 512 KiB per file; selected standalone Node checks
are additionally capped at 128 KiB. HTML inline checks exclude external scripts,
JSON-LD and other non-JavaScript types. Inline modules use module mode; file mode
is inferred from extension or top-level import/export syntax. Standalone selection
covers `assets/`, `uv/`, `netlify/`, or basename `script.js`, `main.js`, `boot.js`,
`game.js`, `loader.js`. Size/name does not prove a file is authored. The 220 units
are 172 inline classic scripts, 43 classic files and 5 module files. No framework
or compiled engine was executed by Node.

The memory bound concerns file content: only chunk windows or a file below the
512 KiB structural cap are retained. Tree metadata/candidate lists also occupy
memory; this is not a measured total-RSS guarantee. Evidence is 404,331 bytes,
under 1 MiB. Whole binary content is neither copied to the session nor scanned.

## Catalog and literal dependency closure

All 115 catalog entries have unique integer IDs, required fields with expected
basic types, and URLs resolving to tracked blobs. This does not certify category
semantics, controls, rights or runtime loading. There are 121 Games directories:
120 games plus `_emulatorjs` infrastructure. The five unregistered directories are
`2048`, `Foldwild`, `Hextris`, `QWOP`, `Slope`. None was registered or deleted.

HTML attribute scanning produced seven external-reference candidates and nine
missing-local-reference candidates. These are not seven confirmed gameplay
requests or nine broken registered games. Resolver behavior: strips query/fragment,
decodes percent escapes, handles root-relative and protocol-relative URLs,
rejects tree escapes, models a literal `<base>` and directory trailing slashes.
It does not model Netlify rewrite endpoints, script-mutated bases, `srcset`, CSS
`url()` closure, dynamically constructed engine paths or compressed asset URLs.

Canonical metadata is not a resource fetch. `Games/GeometryDashLite/index.html:13`
is `link rel=canonical`, so its external URL is a non-finding for offline loading.
The six script references below are actual executable HTML loads on those pages.
No remote iframe dependency was identified by the literal HTML scan. That narrow
result does not establish that all dynamic loaders or game internals are offline.

## Human-triaged findings

### ST-01: CRITICAL, public nested export pages load analytics

- **Path/anchor:** `Games/SubwaySurfers/subwaysurfers/index.html:3` and
  `Games/SubwaySurfersHacked/subwaysurfers/index.html:3`, async script `src` on
  `www.googletagmanager.com`; inline `gtag` setup follows it.
- **Impact:** loading either tracked, publicly deployable nested page schedules a
  third-party executable script. These are not catalog entries, but root publish
  exposes them. This violates the runtime third-party-load rule and is a shipping
  hold, not evidence that the cleaned registered entry performs the same load.
- **Source evidence:** the inspected cleaned `Games/SubwaySurfers/index.html`
  instead loads `js/poki-noop.js`, `Build/UnityLoader.js`, local build JSON and an
  XHR/fetch routing hook. The nested export starts `master-loader.js` and retains
  `4399.z.js`. The nested loader/SDK internals were not fully human-reviewed.
- **Minimal root fix:** remove analytics loading/setup at the nested wrapper
  boundary after owner approval, or explicitly exclude these helper routes from
  publication. Do not solve this by editing Unity blobs or deleting the folder
  without consumer tracing. Preserve code/asset notices.
- **Recommended native repro:** load each exact nested path with request logging;
  expect the analytics script request. Then test the registered entry separately
  with external requests blocked and with start/restart input. Not run here.

### ST-02: CRITICAL, published Ovo SDK harnesses fetch remote code

- **Path/anchor:** `Games/Ovo/1.4.5/sdk.html:5`, `Games/Ovo/kaizo/sdk.html:5`,
  `Games/Ovo/reverse/sdk.html:5`; script host `gameframe.crazygames.com`.
- **Impact:** direct helper-page visits request a third-party SDK. The inspected
  1.4.5 harness calls `Crazygames.load(options)`, specifies iframe loader mode and
  a localhost test target, and reloads when `document.referrer` is empty. This is
  a development/ad test harness, not proof that the catalog landing page uses it.
- **Minimal root fix:** make the wrapper non-networking or exclude the harness
  from published routes with explicit owner approval. Trace service-worker cache
  lists before removing it: 1.4.5 `offline.js` includes `sdk.html` and
  `unlockalllevels.js`. Mere lack of a catalog link is not absence of consumers.
- **Recommended native repro:** navigate with and without a referrer, log SDK
  requests and observe reload behavior; inspect the service-worker cache path.
  Not run here. The fetch dependency is confirmed from HTML, not browser capture.

### ST-03: CRITICAL, shared localization utility loads analytics

- **Path/anchor:** `Games/_emulatorjs/data/localization/Translate.html:4`, async
  `www.googletagmanager.com` script plus inline analytics setup.
- **Impact:** a public localization maintenance tool violates offline-first on
  direct visit. It is not the gameplay loader; the distinction does not excuse
  publishing remote executable code.
- **Minimal root fix:** remove the tool's analytics import/setup or restrict its
  deployed route after approval. Keep localization JSON/runtime consumers intact.
- **Recommended native repro:** visit the exact utility page with request capture,
  translate an input and verify no third-party requests after the approved patch.
  Not run here; the rest of the tool was not exhaustively reviewed.

### ST-04: HIGH, localhost/debug EmulatorJS startup contacts an update server

- **Path/anchor:** `Games/_emulatorjs/data/emulator.js:232`, `checkForUpdates()`;
  constructor at approximately line 249 calls it for `EJS_DEBUG_XX === true` or
  hostname `localhost`/`127.0.0.1`. The equivalent condition and remote fetch are
  also present in `emulator.min.js:1`, the normal loader's selected bundle.
- **Impact:** local testing/serving is not zero-outbound even without netplay.
  The fetch goes to `raw.githack.com`; no rejection handler is supplied. This is
  a source-confirmed conditional request, not an always-on production fetch.
- **Minimal root fix:** explicit offline configuration must prevent the shared
  update probe for local as well as deployed use. Coordinate source and shipped
  vendor bundle through a reproducible upstream/vendor patch process, not casual
  hand-editing of minified code. Preserve licenses; do not enable netplay.
- **Recommended native repro:** run an emulator wrapper at localhost with
  `EJS_DEBUG_XX` unset and watch the version request/rejected promise. Repeat on
  deployment hostname to verify the conditional distinction. Not run here.

### ST-05: MEDIUM, shared loader promises cannot reject failed resource loads

- **Path/anchor:** `Games/_emulatorjs/data/loader.js`, `loadScript(file)` and
  `loadStyle(file)`. Both receive `reject` but assign only `onload`, no `onerror`;
  sequential awaits precede construction of `window.EJS_emulator`.
- **Impact:** a missing/blocked JS or CSS dependency leaves startup awaiting an
  unresolved promise. Static file existence cannot test HTTP/blocking failures.
- **Minimal root fix:** reject failed loads at these shared helpers and surface a
  controlled startup message at the enclosing async bootstrap. Do not add a
  separate timeout workaround to every emulator wrapper.
- **Recommended native repro:** block `emulator.min.js`, then `emulator.min.css`,
  separately. Assert an error and retry/reload affordance instead of silent stall.
  Not run here; the small loader was read completely.

### ST-06: MEDIUM, portal observer schedules its own DOM rebuilds

- **Path/anchor:** `assets/portal-ux.js`, `onMutations()`, `updateCategoryCounts()`,
  `updateResultStatus()`, `renderRecentRow()`, final `mo.observe(document.body, ...)`.
- **Impact:** the observer watches subtree child-list changes; its 80 ms callback
  removes/recreates count nodes and assigns status `textContent`, creating new
  mutations even when semantic data is unchanged. Recent-row reconstruction
  adds further churn when populated. A debounce does not terminate self-induced
  mutation feedback. CPU/FPS/power cost has not been measured on target hardware.
- **Minimal root fix:** make these writes idempotent and scope observer work to
  relevant external mutations. Do not replace React or add another reconciliation
  framework. Preserve focus, filters, recent history and live announcements.
- **Recommended native repro:** record idle DOM mutations/callback count after
  catalog hydration for 10 seconds, including empty and populated recent history.
  Require quiescence after the fix; inspect both themes/mobile layouts. Not run.

### ST-07: MEDIUM, persisted recent entries are not structurally validated

- **Path/anchor:** `assets/portal-ux.js`, `getRecentList()`, `recordRecent()`,
  `recentTimestamp()`, `renderRecentRow()`; save key `unblockmath_recent`.
- **Impact:** JSON validity plus `Array.isArray` accepts `[null]`; consumers then
  dereference `.title`/`.url`. Rendering fails outside the storage reader's catch,
  aborting the observer callback before `syncModal()`. This is corrupt-state
  handling, not demonstrated XSS: displayed title/URL use `textContent`, and game
  opening uses `safeGamePath()`.
- **Minimal root fix:** validate/filter non-null record shape once in the shared
  read path, reuse it in writers/comparators, retain the safe path guard.
- **Recommended native repro:** save `[null]`, `[1]`, a mixed valid/invalid list and
  invalid JSON under that key; reload, sort recent and open cards. Require a
  usable portal and safe surviving records. Not run here.

### ST-08: MEDIUM, choosing catalog sort does not restore catalog order

- **Path/anchor:** `assets/portal-ux.js`, `sortCards()` early return when
  `sortMode === 'catalog'`, plus `initSortControl()` change handler.
- **Impact:** sorting by title/category/recent mutates DOM order, then selecting
  Portal order simply returns. Until a bundle re-render the prior sort remains.
- **Minimal root fix:** derive original rank from the existing catalog and apply
  it when catalog mode is selected. Do not duplicate the catalog or rebuild cards.
- **Recommended native repro:** choose A to Z, then Portal order without changing
  category/search; compare to initial standard-grid order and featured grouping.
  Not run here.

### ST-09: LOW, literal helper/icon references do not resolve in Git

- **Paths/anchors:** `Games/DogeMiner/index.html:10` image metadata target
  `img/dogeminer_300x300.png`; `Games/Ovo/src/vandim/index.html:15,20` icon target
  `icon-256.png`; both nested Subway export pages at lines 13 and 38 point to
  missing `Games/images/ico.ico` and `Games/storage/js/cloak.js`.
- **Impact:** metadata/icons are not proven gameplay failures. Nested cloak scripts
  can produce missing-request errors. Do not recreate tab-cloaking behavior merely
  to make the scanner green.
- **Minimal root fix:** correct to an existing intended local resource or remove
  obsolete wrapper tags after consumer/rights review. Do not fabricate assets.
- **Recommended native repro:** inspect exact-path network failures and rendered
  icons, independently of catalog smoke filtering. Not run here.

## Candidates and explicit non-findings

`pattern_candidates` records counts and up to three lines per category/file, not
source snippets. Full source data flow must be traced before promoting a hit.
`eval`, `innerHTML`, `document.write`, timers and network APIs in frameworks or
compiled engines are not automatically exploitable, live, or runaway.

- `Games/Ovo/1.4.5/unlockalllevels.js`, `getTranslations()` at line 420, contains
  a remote spreadsheet fetch. This complete small helper was read, including
  language/replay functions and the capped Xiaomi/service-worker timers. Neither
  its invocation nor all Construct event-data callers were established in this
  task. It is a network-capable candidate, not confirmed load-time egress.
- Ovo Poki SDK bundles, nested Subway SDKs and BasketRandom/Vex7 inherited
  `main.min.js` copies contain literal network calls. Confirm bootstrap reachability
  and guards first. Their complete internals were not human-reviewed.
- EmulatorJS's `netplayUrl` default is a string; constructor gates netplay on both
  debug and experimental flags. It is not evidence of unconditional sockets.
- `Games/Circuit Ward/multiplayer.js`, `_makePeer()`, uses
  `RTCPeerConnection({ iceServers: [] })`. Manual offer/answer signaling, bounded
  packets and `_drop()`/`close()` cleanup were inspected. Do not classify this as
  STUN/TURN or an external signaling service. Peer traffic is still networking;
  local pairing/playability was not tested here.
- `netlify.toml` has no active `/bare/*` forwarding redirect. The only template is
  commented. `uv/index.js` has `BACKEND_ENABLED = false`; dependency absence
  prevents registration in this frozen tree. `netlify/functions/bare.js` returns
  `proxyEnabled: false`, `localBare: false`; `PUBLIC_BARE_URL` is informational.
  Proxy enabling is explicitly prohibited. Missing `uv.bundle.js`/`uv.client.js`
  references are expected disabled-dependency holds, not instructions to install.
- No credential-prefix candidates were reported. This limited pattern set cannot
  certify absence of secrets. Machine-path candidates retain only file/line/count;
  no private paths or credential contexts are reproduced.
- `assets/portal-ux.js` constant SVG writes are not catalog-controlled HTML. Detail
  text is assigned through `textContent`. This does not certify the compiled React
  bundle or every engine's user-input/import/save boundaries.

## Files not human-reviewed in entirety

The JSON `parse_cap_exclusions` lists all 81 oversized JS/HTML files by exact path
and size. Notable examples: `Games/TempleRun2/bundle_original.js` (15,348,548 bytes),
`Games/Run3/tn6pS9dCf37xAhkJv/Run3.js` (7,043,941), `Games/DriftBoss/game.js`
(4,582,907), RetroBowl engines and Ovo data/runtime variants. They received chunk
pattern coverage, not complete manual engine review or syntax certification.
`assets/index-CRWHmtoy.js` is a compiled bundle, not editable authored source.
All compressed Unity data/framework/code, WASM, SWF, ROMs, textures, audio and
models remain outside human engine/content review in this task. The binary/blob
metadata includes their sizes and identical-blob groups, not legal clearance.

To enumerate all extension-excluded paths without checkout, use the script's
`EXTENSIONS` set against `git ls-tree -rlz 8c8a055`. Excluded extension counts and
bytes are preserved in JSON; no selective sample is labeled a full binary review.
The individual game/manual workers provide separate small-source review. This
worker read the portal UX and selected shared loaders/helpers, not all 120 games'
small authored files. Protected Character AI source was machine-read only, never
edited. Eaglercraft was not restored or relicensed.

## Historical evidence and provenance boundaries

Read `docs/audit_batches/batch_0.md`, `docs/catalog_parts/sources_11.md`,
`docs/GAMES.md`, `docs/wiki/Home.md`, `docs/wiki/Game-List.md` from the frozen Git
tree as historical evidence. Their earlier 120-entry claims differ from the
actual 115-entry catalog and must not be used as current allocation/loading proof.
Source URLs/revisions in older ingest reports are historical claims, not new
upstream verification. No whole-engine download/diff or license inference from
franchise names was performed. Binary duplication does not imply shared rights.

## Actually run verification and safe handoff

Commands run, with actual outputs:

```text
python3 -B scripts/audit_site_tree.py --self-test
PASS: URL resolver and HTML comment/JSON-LD self-test

python3 -B scripts/audit_site_tree.py --revision 8c8a055 --syntax --output docs/maintenance/audits/static-tree.json
source_commit: 8c8a055813b35bbd5d8b632423328333b4252d43
scanned_files: 2217; scanned_bytes: 232115906
catalog entries: 115; unique IDs: 115; schema_errors: []; missing_urls: []
syntax_summary: {"pass": 220}
elapsed_seconds: 133.81
Evidence: 404331 bytes
```

The self-test covers local/root-relative/protocol-relative URLs, percent escapes,
query/fragment stripping, tree escapes, base URLs, ambiguous backslashes and HTML
comment/JSON-LD exclusion. It does not test browser URL normalization exhaustively.
A prior development self-test caught and corrected directory-base resolution;
only the final successful output is the baseline evidence.

Disk checks reported 2.4 GiB free; owned source/evidence/docs are under 1 MiB logical
bytes. Sparse selection stayed unchanged. No game/runtime edits, additions,
registration, deletion, dependency installation or push occurred.

Main owns the unchanged serial full catalog gate, native reproduction, screenshots,
subjective UI judgment, fixes and release. Parser success is not a substitute for
`xvfb-run python3 scripts/smoke_test_games.py`. Confirmed external-load findings and
unreviewed engine/rights boundaries remain holds. On approved fixes, rerun the
collector against a newly resolved commit and review classifications, not just
counts. Do not weaken request/error filtering or claim all games fully reviewed.
