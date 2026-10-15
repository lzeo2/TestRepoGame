# Portal verification and release boundaries

<!-- maintenance-site: testing -->

Documentation audit baseline: `8c8a055`. This worker changed only assigned Markdown paths. It did not materialize Games, change sparse selection, install packages, modify catalog/runtime, register games or push. Main owns the serial full gate, screenshot judgment and final integration. [Scope](../SCOPE.md) and [quality contract](../../CODE_QUALITY.md) take precedence over historical wiki instructions.

## Current completed follow-up (2026-10-15)

See [completed gate](../audits/fleet-followup-full-gate.md) and
[follow-up handover](../audits/fleet-followup-handover.md) for receipts/commits.
Latest unchanged full gate at `2d2eb61`: **124/125, exit 1, release HOLD**;
125 visits, 124 ok, only Ovo failed three `ERR_NETWORK_CHANGED` requests.
Jetpack Joyride Hacked, Wings, Server Survival and Astray logged ok. Defaults
8000ms wait / 15000ms navigation, no targeting or individual retry, exclusions
unchanged and counts not logged. Exact sparse/configuration restoration passed;
owned processes ended and port8986 closed. No smoke screenshots or gameplay
acceptance. Network root cause remains unproven; pending stable-host ticket
`pi-364975-1792055134651` is not permission for this lane to rerun. The 122/125
result below remains historical failure evidence.
Wings lazy menu startup changed the shared-browser sequence from 1/3 to 3/3 twice;
model integration subsequently recorded 2/3 then 3/3 twice. These menu visits do
not certify flight. Astra/solo/model checks and static SEO/sitemap pass; unavailable-
GPU fixtures and Main's picker screenshot review are not supported-GPU acceptance.
Converted-material rendering hit a 40s bound. Jetpack's three boots had zero
transport failures but separate SDK/audio findings, not three clean passes.
Portal recent sorting now parses once instead of 1,374 times; the fleet runner
passed, but both original refurbishment attempts failed and full fullscreen hit
650s without a final result. No root cause for those remaining timeouts is claimed.

`git diff --check e787681..HEAD` **fails**, exit 2: generated aircraft shader and
Astra test-bundle vendor/shader whitespace, **22 diagnostics** total. Rebuild
`b5a7158` removed current host-path comments and reduced the test-only bundle from
884,415 to 539,850 bytes; historical `d435f12` path content is not remediated
(ticket `1792053112900` pending). Approved identity remediation is complete,
not this separate history-content task. Existing Three MIT notice is retained;
test-only bundling is not new runtime payload. No checker weakening or bundle
hand-edit is authorized.
Owned documentation whitespace PASS is not a global PASS. Ticket
`1792052078368` remains pending; rights/hardware/release holds persist.

## Historical fleet results (2026-10-15, before follow-up)

The [completed lane6 report](../audits/fleet-2026-10-15-lane6.md) records the
unchanged all-125 smoke gate at `5ed48f4`: **122/125, exit 1**, default 8000ms,
no targeting arguments, adapter floor raised in memory to 2 GiB. Exact sparse
restoration succeeded; it does not make the gate pass. Existing exclusions were
untouched and their counts are not logged, so neither zero exclusions nor clean
unfiltered loading is established. The smoke captured no screenshots.

Jetpack Joyride Hacked had seven failed requests (three retained samples report
`ERR_NETWORK_CHANGED`); Server Survival/Astray hit 15-second navigation timeouts.
[Triage](../audits/fleet-2026-10-15-triage.md) isolates a post-Wings native context
stall pattern but leaves its underlying cause unresolved. Individual/pair passes
are diagnostic only; no runtime fix or filter change followed. Jetpack stays held.

[Lane4 follow-up](../audits/fleet-2026-10-15-lane4.md): fleet UI and visual-review
runners passed; local payload budget passed 2/2 (desktop transfer 848,720 bytes,
mobile 780,617). Routing fixtures passed all 125 entries/all entrypoints plus
actual fullscreen denial at 390/320 in 427.14s, **real Snake explicitly deferred**.
This is not an unchanged full fullscreen-runner pass. Original refurbishment
failed line 190 on oversized history on both current and pre-lane4 UX/CSS; the
earlier line-182 sort timeout remains unresolved. Main reviewed desktop/mobile
light/dark fleet screenshots as readable and compact; fixtures are not gameplay.

Lane7 refreshed inventory only after Git comparison: 130 projects, 125 registered,
five unregistered, shared emulator runtime separate. This closes stale coverage,
not gameplay/rights/release acceptance. [Handover](../audits/fleet-2026-10-15-handover.md)
records pending source/SEO and identity-remediation release holds. The older
checks below retain their dated baselines; they are not current acceptance.

## Checks actually run in the historical documentation pass

| Command/check | Actual result and limitation |
| --- | --- |
| Environment print | `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`; actual environment, not a requested label. |
| Git-backed catalog assertions at `8c8a055` | `115 catalog entries: required schema, unique IDs/titles and Git-backed URLs OK`. This proves entry blobs exist in Git, not runtime asset closure or rights. |
| `node --check < assets/portal-ux.js` | Exit 0, no output. Syntax only. |
| `node --input-type=module --check < assets/index-CRWHmtoy.js` | Exit 0, no output. Vendor/application bundle syntax, not full human review. |
| `node --check < main.min.js` | Exit 0, no output; comment-only stub. |
| `sha256sum assets/fonts/*/*.woff2` | All three hashes match `docs/portal-font-sources.md`. No upstream network fetch/build comparison was made. |
| `timeout 180 python3 -B scripts/test_portal_review.py` | Exit 0; exact success line `portal review checks passed`. Focused portal browser pass, not registered-game gate. |

The existing runner launched real headless Chromium, used a bounded ephemeral-port `ThreadingHTTPServer`, closed the browser and shut down/closed its server in `finally`. No persistent development server remains. Root assets already existed in the sparse workspace. The command used the existing Playwright installation, not a new dependency. Actual portal native runs: **one focused runner invocation**. Actual full catalog runs by this worker: **zero**. Gameplay/restart/save/native hardware runs by this worker: **zero**.

The runner wrote desktop light/dark and 390/320px light/dark/hacked-card screenshots to temporary storage. Main should inspect the produced `after-portal-light.png`, `after-portal-dark.png` and `mobile-{width}-{theme}[-hacked].png` files before subjective approval. These filenames identify evidence, not committed images or proof of visual acceptance. Its output also glob-lists existing mobile screenshots, so a listed filename alone is not evidence that a fresh capture passed.

## What the focused runner proves

`wait_for_portal()` waits for the expected raw card count, makes images eager, waits for completed natural widths, tag controls and fonts. `check_category_counts()` compares all chip counts against current catalog data, including synthetic recreated-count/empty-chip mutation cases. `check_shelf_design()` checks 6/4px radii, all three loaded fonts, relocated toolbar/footer controls, initials/info placement and sampled theme/active-chip contrast at least 4.5:1.

Desktop covers ArrowRight from the first focused card, theme switch and dark persistence after reload. Tag checks normalize aliases and assert 2p/coop intersections. Mobile checks card thumbnail/body separation, two-line title clamp, badge containment, touch dimensions/nonshrinking controls, no document overflow, horizontal category-scroll discoverability and category counts after tag/category changes. It captures both themes at 390 and 320px widths.

It does **not** test fuzzy input routing, no-result clear behavior, favorites persistence/corruption, recent records, sort restoration, popup allowed/blocked navigation, random selection, info focus lifecycle, iframe fallback, network-denied bootstrap, crawler metadata or every contrast state. It attaches no explicit all-request external-load allowlist or `pageerror` collector. The banner-text assertion checks the DOM string, not an actual offline transition. Font `document.fonts.ready` and a parser pass do not prove usability on low-end hardware. Therefore the documented source defects can coexist with this passing focused test.

## Small reproducible static checks

Use README's Git-backed URL/schema command instead of `os.path.isfile` when Games is sparse-excluded. For exact source review without materialization, extract only a bounded text blob with `git show HEAD:Games/<Name>/<entry>` into temporary storage, then read it; use `git ls-tree -rlz` for quoted/Unicode paths and byte budgets. Do not treat missing workspace files or a UTF-8/minified parse as a missing/fully reviewed engine.

```bash
node --check < assets/portal-ux.js
node --input-type=module --check < assets/index-CRWHmtoy.js
git diff --check -- README.md docs/ARCHITECTURE.md docs/maintenance/site docs/maintenance/audits/portal.md
python3 -B scripts/check_maintenance_docs.py
```

The maintenance coverage checker is Main's integrated-doc check: incomplete parallel game pages can fail while this worker's assigned pages are valid. `--refresh` mutates the shared inventory and is not a worker permission. Pattern-scan remote loads using tracked content and trace constructors/callers; URL/license links and inert vendor SDK definitions are not automatically active third-party requests. Conversely blocked/ignored requests are not offline compliance. Report exact source anchors and native observations separately.

For a nontrivial authorized runtime fix, leave one small runnable regression in its owner's scope. Search repair should dispatch actual input and assert visible titles without a second mutation; recent validation should cover null/wrong-shaped/oversized records; observer repair should count reconciliation after idle. No new framework or speculative harness is needed. These are proposed tests, not tests added/run by this documentation worker.

## Mandatory full gate and sparse operation

Before any push, the project requires `xvfb-run python3 scripts/smoke_test_games.py` over **all** registered entries. The approved sparse route is `xvfb-run python3 scripts/run_sparse_smoke.py`; it runs the unchanged all-games script via `runpy`, materializing one planned game/dependency set per browser page. It refuses forwarded targeting arguments, requires a clean stable tree/cone selection, restores original sparse config and has a 300MiB Games budget with a historical 1.5GiB exceptional floor. Fleet lane6 explicitly raised that floor in memory to 2GiB; the historical default does not authorize going below the current operator floor. Do not run it concurrently with commits or use that exceptional budget for normal worker operations. Normal worker growth keeps at least 2GB free.

`run_sparse_smoke.py --self-test` and `--plan` do not perform native game loading. Restoration success is not a gate pass. A targeted `--games` invocation or this portal runner cannot replace the full gate. Main must record current count, exact output, failures/exclusions, peak/remaining storage and restored selection. Any blocked gate means no push unless the operator explicitly decides an exception.

The full smoke script waits eight seconds after DOM loading, tries generic Play/Start selectors and watches console errors plus failed/4xx requests. It uses documented broad `BENIGN`, `KNOWN_BENIGN`, `BENIGN_REQS` exclusions, software-GL/headless environment arguments and per-game windows. It does not listen to `pageerror`, complete levels, prove audio, restart or save roundtrips, audit legal terms or benchmark N100 hardware. Do not weaken filtering for green output. Report exclusions separately rather than translating 115 loading passes into 115 fully tested games.

## Recommended native and month checkpoints

Immediate: reproduce the portal findings with synthetic state, then fix the shared authored boundaries under new runtime authorization. Week two: Main reviews actual keyboard/screen-reader, zoom/landscape, light/dark mobile, offline banner and dialog screenshots. Week three: source/license/dependency research for a few lightweight 3D candidates; no count-driven fabrication or automatic registration. Week four: actual target-hardware profiling, full release gate and save/restart checks with a signed hold list. The month is a plan, not background automation or permission to publish.

Finish each milestone with explicit-path anonymous commits, `git diff --check`, disk evidence and the actual shared `git status`; other workers' dirty paths are not ours to stage/erase. These docs do not assert a clean shared tree, game rights, native Foldwild resolution or a release decision.
