# Portal reliability refurbishment

Delegation 73, authorized authored-runtime exception to the documentation-only audit. Actual provider/model: `openai-codex` / `gpt-6.1-sol`. Audit baseline remains `8c8a055`; worker began at shared HEAD `aae2f66`. The historical [portal audit](audits/portal.md) is preserved unchanged. This report supersedes only its P-01 through P-04 open-status claims for the changed authored helpers, not P-05/P-06 or the rest of the audit.

## Scope and inspected coverage

Read all 1730 pre-change lines of `assets/portal-ux.js`, including every caller of search replay/overlay, recent reader/writer/render/sort, category counts, result status and sorting. Read quality/scope/AGENTS and the three affected site guides completely. The existing portal audit supplies the compiled application interface evidence; this repair did **not** human-review every minified React/motion/vendor function. Game engines/binaries were not inspected or changed. No sparse selection changed, no Games checkout/install, new runtime request, font, asset, framework or global storage shim was added.

Changed runtime surface is only [portal-ux.js](../../assets/portal-ux.js). Regression is [test_portal_refurbishment.py](../../scripts/test_portal_refurbishment.py); manuals are [portal](site/portal.md), [browser state](site/browser-state.md) and [accessibility/style](site/accessibility-and-style.md). Root HTML, authored CSS, compiled assets, catalog, registration, licenses and protected content remain outside this task.

## Findings and minimal root repairs

### P-01, HIGH: search event routing

Anchor: `initDebouncedSearch()` accepted capture route formerly stopped non-empty input before `initFuzzySearch()` could receive it. Native baseline non-empty `zzzz` left 115 cards visible immediately. Later mutation churn could hide this defect.

Repair: local `routeSearchInput()` invokes existing `applyFuzzySearch()` synchronously for accepted input and native **change** events, while keeping React's substring query empty. The native regression exposed a sibling cause: blur emits change; if not captured, React filters/unmounts all cards before the Clear-filters click can land. Both events now use one route. Redundant document bubble fuzzy handling was removed. `searchValue` survives React category/favorite rerenders; `onMutations()` restores the controlled input's displayed value and reapplies the overlay. Empty replay is allowed through to React; Escape/Clear clear stored overlay state even if React has reset the DOM input. Composition start cancels pending empty replay, composing input does not reach React and end commits through the same route.

Actually run: normal Playwright input fill, Escape, Clear button, empty fill, favorite click and bundle/extra category/tag combinations. `sccrrndm` immediately leaves only Soccer Random visible while all 115 cards remain mounted. Synthetic composition events verify protocol routing separately; trusted OS IME remains unverified.

### P-02, HIGH: recent-history trust boundary

Anchors: `getRecentList()`, `recordRecent()`, `renderRecentRow()`, `recentTimestamp()`. Previously only the top-level array was checked; null records could dereference outside the parser catch and prevent recording. Writer-only eight-item limits did not protect readers.

Repair: shared reader validates object/string title/string exact safe Games path/finite numeric millisecond timestamp, deduplicates exact URLs and returns at most eight projected records. Writer consumes that normalized reader before prepend/truncation; it validates its new path/title too. Render/sort consume the same reader. No read-time migration or whole-origin deletion occurs. Valid path shape does not prove catalog membership/file existence/provenance. Oversized raw JSON still has parsing/invalid-prefix scan cost, but cannot create an oversized row.

Actually run: negative `[null]`, `[1]`, malformed JSON, mixed types, remote/encoded/whitespace paths, wrong title/timestamp types, nonfinite timestamp and 1000-entry duplicate fixture. Rendering stayed bounded at eight; a normal UI Play after corrupt history recorded Soccer Random with numeric `Date.now()` timestamp and preserved favorites plus an unrelated synthetic game-save sentinel. Popup was closed without claiming game load/gameplay proof. Baseline null-history observation yielded zero captured pageerrors in its short sample, so this report does not invent a baseline native crash; the shape hazard was confirmed by source.

### P-03, MEDIUM: self-induced observer feedback

Anchors: `updateCategoryCounts()`, `updateResultStatus()`, `renderRecentRow()`, `onMutations()`. Baseline read-only observation counted **300 mutations in 1200ms** across counts/status/recent after settling.

Repair: reuse count spans, update changed text only and remove only obsolete zero-count spans. Result text is assigned only if different. Recent rendering compares `JSON.stringify()` of at most eight normalized records with `data-ux-recent` before rebuilding. Class assignments on retained count spans are avoided too, because class is observed. The existing child/subtree/class observer remains to reconcile React category/star/new-card changes; no extra observer or polling framework was introduced.

Actually run: read-only observer measured **zero mutations in 1200ms** after a 600ms settle, with empty history and again with a populated eight-item row. Search and filter changes still updated result counts. This is bounded DOM convergence evidence, not CPU/FPS/battery profiling or an N100 acceptance claim.

### P-04, MEDIUM: restoring canonical Portal order

Anchor: `sortCards()` previously returned immediately in catalog mode after another sort had changed DOM order. Native baseline restoration comparison was False.

Repair: derive title-to-rank Map from existing `_gamesList`, sort standard cards by canonical rank and compare one pre-sort snapshot before append. This also removes repeated DOM queries from order comparison. Featured partition remains untouched. Unknown titles retain stable trailing order; no second catalog fetch or initial-DOM-rank cache was introduced.

Actually run: A to Z differs from initial standard-title order; its saved preference survives reload; selecting Portal order restores that initial canonical sequence. Category then Portal order likewise restores it. Recent ordering puts the normally launched standard Soccer Random card first.

## Runnable verification and actual output

Run from repository root, using installed Playwright/Chromium; no dependencies installed:

```sh
node --check assets/portal-ux.js
timeout 180s xvfb-run python3 -B scripts/test_portal_refurbishment.py
python3 -B scripts/check_maintenance_docs.py
git diff --check
```

The regression serves repository files on loopback port 8813 (`PORTAL_TEST_PORT` override), uses a disposable browser context and shuts down server/context/browser in bounded scope. Positive feature checks use ordinary UI; negative storage and synthetic composition fixtures are labeled. The idle observer only observes DOM and resolves its own result. No portal debug globals/state grants are used. Catalog count is read dynamically, not hardcoded for acceptance.

Actual successful native output:

```text
PASS P-03 idle: 0 observed mutations over 1200ms after settling
PASS P-01 native fuzzy search, no hits, Escape, Clear filters, empty input
PASS synthetic composition fixture (OS IME not tested)
PASS native favorite/search/tag/bundle category/extra category intersections
PASS P-04 catalog order after A to Z, reload, Category
PASS P-02 malformed/mixed/unsafe/nonfinite/oversized history, dedup eight, native launch writer, unrelated storage preserved
PASS desktop/mobile 390/320 both themes: native taps, focus, dialog keyboard, targets, overflow; zero portal pageerrors
portal refurbishment checks passed: 115 catalog entries; four JPEG screenshots
```

Syntax passed without output. The maintenance checker initially reported `Inventory stale: inspect changes, then run --refresh.` Main owns the shared inventory refresh after concurrent source changes; this worker did not overwrite it. Final checker outcome is reported in the completion digest. Full registered-game smoke is **not run by this worker** and remains Main's serial release gate.

Four real JPEG screenshots are temporary evidence under the system temporary `portal-refurbishment` directory: `desktop-light-search.jpg`, `desktop-dark-search.jpg`, `mobile-light.jpg`, `mobile-dark.jpg`. Desktop search shows one real title hit; mobile shows the default restored shelf. No image, style or subjective UI acceptance is claimed until Main reviews them.

## Known holds and next maintenance

P-05 bundle favorite write denial and P-06 failed UX catalog retry remain open, as do detail-handler teardown/background inertness, heading semantics, deployed metadata crawling and trusted OS IME. Do not hand-edit the bundle or globally suppress storage errors to fix these. Popup denial, storage quota/access denial, two-tab reconciliation, screen readers/zoom and actual low-end hardware profiling need separate checks. The existing focused layout runner and full catalog gate are independent Main checks, not silently substituted by this runner.

No game was added (ingested or self-made), registered, published or pushed. No game save was cleared. This bounded reliability wave does not authorize new-game/month-long implementation or a redesign of the featured partition.
