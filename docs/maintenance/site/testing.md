# Portal verification and release boundaries

<!-- maintenance-site: testing -->

Documentation audit baseline: `8c8a055`. This worker changed only assigned Markdown paths. It did not materialize Games, change sparse selection, install packages, modify catalog/runtime, register games or push. Main owns the serial full gate, screenshot judgment and final integration. [Scope](../SCOPE.md) and [quality contract](../../CODE_QUALITY.md) take precedence over historical wiki instructions.

## Checks actually run in this pass

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

Before any push, the project requires `xvfb-run python3 scripts/smoke_test_games.py` over **all** registered entries. The approved sparse route is `xvfb-run python3 scripts/run_sparse_smoke.py`; it runs the unchanged all-games script via `runpy`, materializing one planned game/dependency set per browser page. It refuses forwarded targeting arguments, requires a clean stable tree/cone selection, restores original sparse config and tracks the 300MiB Games/1.5GiB exceptional floor. Do not run it concurrently with commits or use that exceptional budget for normal worker operations. Normal worker growth keeps at least 2GB free.

`run_sparse_smoke.py --self-test` and `--plan` do not perform native game loading. Restoration success is not a gate pass. A targeted `--games` invocation or this portal runner cannot replace the full gate. Main must record current count, exact output, failures/exclusions, peak/remaining storage and restored selection. Any blocked gate means no push unless the operator explicitly decides an exception.

The full smoke script waits eight seconds after DOM loading, tries generic Play/Start selectors and watches console errors plus failed/4xx requests. It uses documented broad `BENIGN`, `KNOWN_BENIGN`, `BENIGN_REQS` exclusions, software-GL/headless environment arguments and per-game windows. It does not listen to `pageerror`, complete levels, prove audio, restart or save roundtrips, audit legal terms or benchmark N100 hardware. Do not weaken filtering for green output. Report exclusions separately rather than translating 115 loading passes into 115 fully tested games.

## Recommended native and month checkpoints

Immediate: reproduce the portal findings with synthetic state, then fix the shared authored boundaries under new runtime authorization. Week two: Main reviews actual keyboard/screen-reader, zoom/landscape, light/dark mobile, offline banner and dialog screenshots. Week three: source/license/dependency research for a few lightweight 3D candidates; no count-driven fabrication or automatic registration. Week four: actual target-hardware profiling, full release gate and save/restart checks with a signed hold list. The month is a plan, not background automation or permission to publish.

Finish each milestone with explicit-path anonymous commits, `git diff --check`, disk evidence and the actual shared `git status`; other workers' dirty paths are not ours to stage/erase. These docs do not assert a clean shared tree, game rights, native Foldwild resolution or a release decision.
