# Portal oversized-history follow-up

<!-- maintenance-audit: fleet-followup-history -->

## Scope and inspected source

Baseline `e787681`, 125 registered games / 130 inventoried projects. Read AGENTS, the quality contract, maintenance index/inventory, portal/browser-state/accessibility guides and the archived lane4 follow-up. Read the complete authored UX and all three portal regression runners; traced every `sortCards`, `recentTimestamp` and `getRecentList` caller. Inventory verification initially reported:

```text
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Owned changes are the authored UX, fleet regression and these four maintenance pages. No compiled bundle, HTML, SEO, catalog, game, stylesheet, dependency, sparse selection or inventory edits belong to this follow-up. No analytics was added. Archived `lane4-followup/` evidence was read-only. Other workers/coordinator concurrently changed game and SEO files; those are excluded from this commit.

## Measured cause and smallest patch

The existing path is `onMutations()` (80ms reconciliation), `initSortControl()` / native select change, `sortCards()`, comparator, `recentTimestamp()`, `getRecentList()`. Previously both sides of every recent comparison reread localStorage, parsed the entire raw JSON and normalized it. The renderer and launch writer also use `getRecentList()` but are not comparator callers.

A temporary response-instrumented real Chromium portal counted actual comparator calls, reader calls and JSON parses, and timed the synchronous sort. The fixture is the original 1,000 generated records plus a duplicate first URL (1,001 records, 74,739 characters), not a normalized eight-record substitute. Both captures retained raw SHA256 `6d8b11c417c06a297d7ad401a48fb699f8d37962f530135cb2b6b49aef7f569b`, matching the archived fixture. No gameplay state was granted.

| Actual sort | Comparisons | Reads / parses before | Reads / parses after | Before ms | After ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Native select into recent | 687 | 1374 / 1374 | 1 / 1 | 1561.8 | 175.8 |
| Reload's populated-card sort | 687 | 1374 / 1374 | 1 / 1 | 1731.6 | 73.7 |
| Subsequent already-sorted reconciliation | 122 | 244 / 244 | 1 / 1 | 219.5 | 3.1 |

Evidence: temporary `history/before-profile.log`, `history/after-profile.log` and the profiling script. These are individual shared-host samples with observation overhead, not benchmark medians or a target-device guarantee. Parse counts identify redundant work independently of wall-clock noise.

The patch obtains `getRecentList()` once inside recent-mode `sortCards()` and passes that local list to `recentTimestamp(title, list)`. Non-recent modes do not read history. There is no global stale cache, new Map keyed by potentially duplicate titles, observer/reset layer or input truncation. Existing validation, first-valid-URL deduplication, first-matching-title lookup, eight-record cap, descending timestamp comparison, alphabetical ties, featured partition and append-only-on-order-change logic remain intact. Reads still preserve malformed/raw storage, and the existing writer still prepends the latest launch.

## Readiness is a separate unresolved acceptance boundary

The earlier archived evidence reproduced the original oversized-history timeout on both current and pre-lane4 UX/CSS. This follow-up does not reinterpret those failures as passes.

The before-profile reload passed its 5000ms recent-chip wait; the after-profile reload failed the same wait despite the large reduction in sort work. Both post-wait captures contained 125 cards, a connected sort and eight chips. Therefore the measured parse defect is real, but is **not a sufficient explanation or fix for all selector timeouts**.

A separate read-only DOM observer recorded actual readiness with patched source. On malformed reload, the connected, 153x44 sort existed at 751ms and 125 cards at 1531.4ms. On oversized reload, the sort existed at 474.5ms, cards at 1461.6ms and a connected 95.1875x44 recent chip at 3042.4ms. Both waits passed in that diagnostic sample. The observer changes timing and does not replace the original acceptance runner. No evidence here justifies resetting cached DOM references or changing an engine.

## Original runner results and regression

Both original test files remain byte-for-byte unchanged:

- `scripts/test_portal_refurbishment.py`: SHA256 `ba89c904b9d9f9447a7b14b08f33e97a97bad24f171bdcefb0d7c3c8c5eefb1f`.
- `scripts/test_portal_fullscreen.py`: SHA256 `280b1e75ead656b0b06127e04cef737c16c314a2381022c483797129e4772967`.

The original refurbishment ran twice with `PORTAL_TEST_PORT=0`, a 180-second process bound and **unchanged 5000ms assertions**:

1. Exit 1, 56s. Printed passing idle/search/composition-protocol/favorites/filter/sort checkpoints, then failed line 182 waiting for the sort on malformed-history reload.
2. Exit 1, 20s. Failed the initial `load()` sort wait before history fixtures.

Receipts: `history/refurbishment.log`, `history/refurbishment-retry.log`. Stopped after these two attempts. Requested coordinator/Hermes diagnosis; `ask_hermes` is not exposed in this session. No timeout relaxation or speculative repair followed. Complete refurbishment acceptance is **blocked**.

The extended fleet runner preserves every existing assertion and adds the raw oversized reload with 5000ms waits, exact eight unique chip labels, raw preservation, one parse during native sorting, same-document freshness, first-URL deduplication, descending timestamps and malformed-storage preservation. JSON.parse instrumentation is confined to the disposable test page, not production. Its first run passed through the existing visual/focus checks, then failed the added sort-readiness wait; this is not a whole-run pass.

The unchanged full fullscreen runner used `timeout 650s xvfb-run -a python3 -B -u scripts/test_portal_fullscreen.py` on its own ephemeral server. Receipt: `ELAPSED=650 EXIT=124`. It produced `real-snake-fullscreen.jpg` and `denied-390-routing-fixture.jpg` in its temporary output directory but no `result.json` or final PASS. Source ordering places those captures after all 125 routing cases, the real Snake Start/Pause/Resume/wall-loss/restart assertions and entry into policy-denial checks. This is bounded partial evidence, **not** a complete fullscreen pass. Real Snake was materialized by the coordinator; its game.js/style.css were unchanged, while a concurrent coordinator edit added only an HTML description. This lane did not modify it. No shortened fixture-only replacement or extra retry was substituted.

The first process-launch wrapper tried an unavailable `/usr/bin/time`; that wrapper failed before executing either runner and was replaced with shell elapsed-time reporting. The receipts above are actual subsequent runner executions, not that harness failure. The final fleet retry was serialized after fullscreen termination, still with all assertions intact. It passed in 21 seconds, exit 0:

```text
PASS oversized history native-sort profile: {"parses": 1, "ms": 3.4000000059604645}
PASS history fresh snapshots, first-URL dedup, descending timestamps, malformed raw storage preserved
PASS fleet portal: 125 games; empty hints, reset focus, filtered nested keyboard navigation, native Tab, fuzzy search, 44px targets; desktop/mobile light/dark; saved-recent layout fixture; zero console/page errors
ELAPSED=21 EXIT=0
```

Receipt: `history/fleet-retry.log`. One complete browser runner passed; original refurbishment and full fullscreen acceptance remain blocked. The final fleet's 3.4ms sample starts from alphabetical order and must not be substituted for the like-for-like 687-comparison profile table.

## Static checks and storage

`node --check assets/portal-ux.js` and owned-path `git diff --check` exited 0. Python AST parsing of the extended fleet test passed. Catalog validation printed:

```text
PASS catalog: 125 records; required fields, unique integer IDs, Git-backed URLs
PASS fleet Python syntax
```

The later maintenance checker was blocked by concurrent game changes, not refreshed or bypassed:

```text
AssertionError: Commit inspected source changes before validating its inventory.
```

Initial measured free space was 2,358,980,608 bytes; final free space was 2,337,333,248 bytes (shared-filesystem delta -21,647,360 bytes), always above the 2GB stop threshold. Final process inspection found no remaining portal test runners or this lane's Xvfb server. The final maintenance check repeated the concurrent-source assertion above; no refresh was attempted. Added-runtime-load review finds no new URL, fetch, socket, script, font or asset loads: the production diff only changes argument passing and a local history snapshot.

## Visual and shipping limits

No layout changed. Main's prior four desktop/mobile light/dark screenshots were already judged readable and compact; this change needs no redesign. Existing fleet screenshots were regenerated before its new history check failed, but this worker does not replace Main's visual judgment. Native devices, screen readers, OS IME, general storage-denial handling, source rights and complete game acceptance remain outside this bounded fix.

No game was added, ingested, fabricated, registered or published. No push. The unchanged full registered-game smoke gate was not rerun by this lane; the historical 122/125 failure is not superseded by portal routing checks. All temporary servers bind independent ephemeral ports and are bounded/closed by their runners.
