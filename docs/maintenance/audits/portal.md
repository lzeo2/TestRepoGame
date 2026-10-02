# Portal source audit and refurbishment queue

<!-- maintenance-audit: portal -->

Baseline `8c8a055`; provider/model printed from the actual environment: `openai-codex` / `gpt-6.1-sol`. Scope is documentation only. Runtime findings below are **open**, not silently fixed. Main owns severity acceptance, design/UI judgment, runtime authorization and final integration.

## Coverage and evidence limits

Read in full: `index.html`, `assets/portal-ux.js`, `assets/portal-polish.css`, `assets/index-CUsUGgbt.css`, `main.min.js`, `favicon.svg`, `icons.svg`, both font OFL files, font-source documentation, existing README/architecture, scope/quality/AGENTS, portal test and full/sparse smoke runners. Inspected compiled portal application anchors `Ru`, `Bu`, `Vu`, `Hu`, `Uu`, `__portalSafeSrc`, `Wu`, `Gu`, `qu`, `Ju`; sampled generic library clipboard/IntersectionObserver contexts. The **entire 328650-byte minified React/motion/vendor implementation was not human-reviewed**. No game engine/binary was certified by reading the portal wrapper. Font binaries were hash-checked, not reverse-engineered.

Historical sampling included `docs/GAMES.md` opening catalog/coverage sections, wiki Home/Adding-a-Game, `docs/audit_batches/batch_0.md` and `docs/catalog_parts/sources_11.md`. Historical counts, score labels, controls and licensing claims were not accepted as fresh native proof. Source rights remain a per-game review, including the distinction between a wrapper license and underlying assets/ROMs.

Actual results: Git-backed catalog/schema/unique-ID/title assertions passed for 115 entries; entry/UX/module/stub syntax passed; local font hashes matched; the existing focused browser runner printed `portal review checks passed`. It does not cover the failure cases below. Full catalog gate and gameplay native checks were not run by this worker. No subjective screenshot pass is claimed.

## P-01: non-empty search is stopped before its own overlay

**Severity: HIGH.** `assets/portal-ux.js`, `initDebouncedSearch()` capture input listener (`e.stopImmediatePropagation()`), `initFuzzySearch()` document bubble listener and `onMutations()` delayed fallback.

Impact: ordinary input cannot reach the immediate fuzzy handler because capture stops the event before the document bubble phase. React is also intentionally excluded. An unrelated later body/class mutation may eventually apply `searchInput.value`, so search is unreliable and timing-dependent rather than the advertised every-keystroke filter. This is functional discovery failure, not only a misleading comment.

Minimal root fix: apply the fuzzy overlay in the same accepted capture input route before stopping propagation, with explicit composition/empty replay handling; remove or restrict the now-redundant bubble path. Do not restore bundle substring filtering in a way that unmounts fuzzy-only hits.

Recommended native repro: on a stable loaded grid type `zzzz`, then a known title/subsequence, without category/theme interaction; assert visible cards change immediately. Repeat IME composition, Escape and empty Clear filters. **Actually run:** source/event-order tracing only; focused runner contains no typed-search assertions.

## P-02: parsed recent arrays are not validated records

**Severity: HIGH.** `assets/portal-ux.js`, `getRecentList()`, `renderRecentRow()`, `recentTimestamp()` and `recordRecent()`.

Impact: synthetic `[null]` is valid JSON and passes the array check; `.title` dereference can throw from reconciliation or sort. Writer `.url` filtering also throws and silently loses the new recent record. Read history is unbounded despite the writer's eight-record limit. Favorites' corrupt-JSON handling does not protect this separate key.

Minimal root fix: normalize in the shared history reader to safe objects/string title/guarded local URL/finite timestamp, deduplicate and cap eight; have the writer use that normalized result. Keep text-safe rendering and never clear unrelated game storage.

Recommended native repro: set only `unblockmath_recent` to synthetic null/wrong-shaped/oversized arrays in a disposable context, reload, sort Recent, launch and recheck the bound. **Actually run:** read/write caller tracing, not injected-browser corruption tests.

## P-03: reconciliation generates its own continuous work

**Severity: MEDIUM.** `assets/portal-ux.js`, `onMutations()`/`MutationObserver`, `updateCategoryCounts()`, `updateResultStatus()` and `renderRecentRow()`.

Impact: observed child mutations invoke an 80ms reconciliation, which removes/recreates all category-count nodes, replaces status text and rebuilds recent-row children. Those writes are inside the same observed body subtree and schedule another pass even when data did not change. This can create perpetual idle DOM work, repeated promise callbacks/layout reads and battery/low-end performance cost. Rate limiting to 80ms is not convergence.

Minimal root fix: make these three writers idempotent (update only changed count/text/history); narrow/ignore self-owned mutations if still needed. Do not add another observer or declare browser speed acceptable without measurement.

Recommended native check: instrument/count reconciliation and DOM mutations over a five-second idle interval after initial settling, then category/favorite changes; profile before/after on actual target hardware. **Actually run:** source feedback-cycle tracing only. No measured CPU/FPS value is asserted.

## P-04: Portal order cannot undo a user sort

**Severity: MEDIUM.** `assets/portal-ux.js`, `sortCards()` early return for `sortMode === 'catalog'`, `initSortControl()` change handler.

Impact: selecting A to Z mutates standard-card DOM order; returning to Portal order does not restore it. Featured cards never participate in nondefault sorting, although the continuous shelf can suggest a whole-catalog sort. Current documentation now describes the actual partition; global sorting is a design decision, not automatically a bug fix.

Minimal root fix: reorder standard cards by the canonical catalog index when catalog mode is selected. Preserve React's featured partition unless Main explicitly changes that product behavior.

Recommended native repro: record baseline standard-title order, choose A to Z, return Portal order and compare; repeat category/React rerender and reload. **Actually run:** source branch/DOM mutation tracing, no sort interaction pass.

## P-05: storage read success does not protect favorite writes

**Severity: MEDIUM.** `index.html` head storage shim (`__um_probe` getItem), `assets/index-CRWHmtoy.js` application `qu()` persistence effect.

Impact: bundle reads/parses favorites defensively but its setItem effect is unguarded. A read-capable/write-denied or quota-full store bypasses the shim and can throw during React persistence. The UX's caught theme/sort/history writes do not cover this bundle-owned caller.

Minimal root fix: under new runtime permission, handle write capability/failure at the authored storage boundary with a tested scoped fallback, or recover legitimate application source and guard the effect there. Do not hand-edit compiled code, globally swallow errors or clear origin saves to obtain a green run.

Recommended native repro: synthetic read-success/setItem-throws storage implementation, fresh render and star toggle; separately test access denial and persistence after reload. **Actually run:** source read/write-boundary inspection. Theme reload passed in the focused runner, not write denial.

## P-06: failed UX catalog request is cached forever for that page

**Severity: MEDIUM.** `assets/portal-ux.js`, `fetchGames()` catch/resolved `_gamesPromise`, `fetchGameUrlCache()` cache, `openCard()` and `openDetailPanel()`.

Impact: a transient UX request failure can leave bundle-rendered cards whose captured clicks cannot resolve a URL, plus absent tags/info behavior. Retry from `openCard()` reuses the same empty resolved promise. The bundle error UI reflects its independent fetch, not this layer's failure, so launch failure can be silent.

Minimal root fix: keep a visible UX catalog error/retry path and clear the failed promise before a bounded explicit retry. Maintain one internal shared request; do not poll indefinitely or introduce a second catalog source.

Recommended native repro: fail only the UX JSON request once while bundle fetch succeeds, restore responses, click card/info/random and exercise explicit retry. **Actually run:** dual-reader/cache tracing. No network fault injection.

## Other review holds, not fabricated critical findings

Detail handler cleanup is delayed for Close/backdrop paths; `.ux-detail` does not inert/scroll-lock the background. Review dialog lifecycle and screen-reader/zoom behavior before expanding UI. Native/ARIA H1 duplication needs Main's semantic decision. Relative OG image metadata needs a deployed crawler check; it is not itself an observed failed fetch.

No runtime third-party font request appears in inspected root source; three local OFL faces loaded in the focused runner. Constant SVG `innerHTML` is not catalog XSS. Generic library clipboard/IntersectionObserver tokens do not establish share widgets/scroll-spy. No density control, copy URL action, root manifest or cache-worker registration was found. The root compatibility stub has a tracked constructed game consumer; it is not deleted. No secrets were reproduced in this report.

## Future work and release hold

Week one: authorize and regress search/history/reconciliation repairs first; resolve compiled-source/write-boundary ownership and catalog recovery. Week two: Main-led keyboard, zoom, mobile/theme and dialog review, preserving the flat authored shell. Week three: licensed source/dependency research for lightweight 3D additions, with operator ID allocation and no guaranteed count. Week four: real hardware/native game/save/restart checks and the unchanged full catalog gate. These are priorities, not completed work or autonomous month-long execution.

Known holds: runtime findings remain unfixed by design; vendor internals/provenance not fully reviewed; Foldwild native input/party-save status is independent and held; full release gate remains Main's responsibility. This pass adds **zero games** and makes no registration/publication/push decision.
