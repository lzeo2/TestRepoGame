# Portal feature maintenance

<!-- maintenance-site: portal -->

Audit baseline: `8c8a055`. Delegation 73 subsequently repaired P-01 through P-04 in the authored UX layer; see [refurbishment evidence](../portal-refurbishment.md). Source links are [UX](../../../assets/portal-ux.js), [entry](../../../index.html), [polish](../../../assets/portal-polish.css) and [catalog](../../../games.json). The compiled bundle application tail was inspected for its interface, not every line of React/motion internals. Start with [architecture](../../ARCHITECTURE.md) and [audit findings](../audits/portal.md).

## Fleet reconciliation status (2026-10-15)

Lane7 reconciled the inventory to **125 registered / 130 projects** after Git
comparison; stale-count statements in the lane4 receipts below describe their
run-time baseline, not the current inventory. The [handover](../audits/fleet-2026-10-15-handover.md)
and [QA report](../audits/fleet-2026-10-15-lane6.md) preserve the historical **failed 122/125**
full gate. Approved identity remediation is now verified; the fresh full gate is
next after the [pre-gate handover](../audits/fleet-followup-handover.md) commit.
No release/push acceptance follows from inventory coverage, routing fixtures or
the focused portal passes.

Lane5's authored SEO layer adds a third independent local catalog read for
browser-only Info/player metadata. It does not add shareable selection URLs.
The static follow-up now covers all 124 nonprotected entry descriptions, excluding
read-only Character AI, without tracking; OG metadata remains incomplete.
Manifest light launch colors do not
force a light installed UI. See [deployment limits](deployment-and-routing.md).

## Catalog and render ownership

The bundle's `Gu()` fetches `./games.json`, rejects a non-array and exposes loading/error. `Ju()` filters non-object rows, category and title/description substrings before rendering `Bu()` through `Vu()`. The base chips (`Ru`) are All, Action, Puzzle, Strategy, Classic, Sports and Riddle. UX `fetchGames()` makes a second, internally shared request, normalizes tag aliases/deduplicates them and caches `_gamesList`. `findGameData(title)` and the URL Map both rely on exact unique titles; favorites instead rely on IDs. Duplicate titles can launch the wrong entry even with unique IDs.

The seven required catalog fields are not an exhaustive schema. Optional `tags`, `players`, `howto` drive injected badges and detail metadata. At this baseline there are 115 entries; categories are action 24, classic 19, puzzle 17, strategy 16, arcade 11, sports 10, story 4, word 4, card 4, idle 3, simulation 2, riddle 1. `updateCategoryCounts()` uses the full normalized list, not the visible filtered list. Zero-count badges are omitted. `applyFilterMetadata()` derives missing `data-cat-id` from label text after removing the count clone, so numbers must not become part of category identity.

## Category, tag and favorites intersection

`UX_EXTRA_CATS` adds arcade/card/idle/story/simulation/word via `injectUxCatChips()`. A click toggles `activeUxCat`, programmatically clicks bundle All if required, then applies `data-ux-cat-hidden`. `uxChipProgrammatic` prevents the capture listener from clearing the just-selected category. A user click on a bundle chip clears the UX category, avoiding two independent categories intersecting to zero.

`buildTagFilterRow()` exposes only supported tags actually present: `TAG_LABELS` maps `2p`, `coop`, `hacked`. `toggleTagFilter()` synchronizes row/card `aria-pressed`; `applyTagFilter()` requires **every** selected tag. Co-op plus 2 players is an intersection, not a union. Card badges are injected as buttons, but polish hides non-hacked badges on the shelf; player/co-op metadata remains in filters/details. Aliases affect UX data only, not the raw catalog or compiled engine.

`injectFavToggle()` adds Favorites without owning star persistence. `isBundleFav()` reads `.game-card__fav.active` or its Remove-from-favorites label. `applyFavFilter()` writes `data-ux-fav-hidden`. The hide selectors in `index.html` intersect category, tag, favorite and search attributes with `display: none !important`. Preserve those selectors and use `visibleCards()` rather than raw DOM count for result feedback.

## Search, keyboard and empty states

`fuzzyMatch()` removes whitespace from the lowercase query and checks substring or ordered subsequence against the lowercase **title**. It does not rank typo distance or search arbitrary controls. The bundle's separate substring search also includes descriptions. `/` focuses `.search-bar__input` unless an editor/select/contenteditable or detail panel owns focus. Card arrows select visible geometric neighbors; Home/End select first/last; Enter/Space launches; `i` opens information. Capture-phase arrow/Home/End routing also handles nested card controls through the same visible-card list, bypassing the bundle's unfiltered Play/Favorite navigation. Native Tab and nested button activation remain unchanged.

`initDebouncedSearch()` now routes accepted capture-phase input **and native change-on-blur** through its local `routeSearchInput()` and `applyFuzzySearch()` before excluding React. The redundant bubble handler was removed. `searchValue` owns the overlay query; `onMutations()` restores that value when a React category/favorite rerender resets its controlled input, then reapplies the overlay to new cards. React retains an empty query so fuzzy-only cards stay mounted. Empty input is replayed after 180ms via the native value setter and a bubbling event marked `data-ux-search-replay`; Escape and Clear filters replay immediately. The replay route clears overlay state and lets React see only empty input.

Composition start cancels pending clear replay and marks `searchComposing`; composing input remains excluded from React but is not filtered mid-composition. Composition end routes the committed value through the same handler. The regression includes a synthetic composition protocol fixture, **not** a trusted OS IME acceptance check. Native fill, blur via controls, Escape, empty input and Clear filters passed without unrelated theme/category mutations masking input.

`updateResultStatus()` writes a polite singular/plural game count only if its text changes. Category-count spans are reused, updated only on count changes and removed only for zero counts. Recent rendering similarly compares a normalized-list signature on `data-ux-recent`. These writers now converge rather than scheduling their own perpetual 80ms reconciliation; the child/subtree/class observer remains necessary for React-owned card/filter/favorite changes. `updateClearFiltersBtn()` exposes Clear filters only for an empty result with active filters. Its category check uses `data-cat-id`, not label text containing a count. Overlay-empty results get one short hint: use a game's heart when the current category has no favorites, otherwise shorten the search or clear filters. The native reset button describes itself with that hint. `doClearFilters()` clears input, active tags, favorite-only and UX category, explicitly selects the All category, and focuses search without scrolling before the removed reset button can strand keyboard focus. React owns its No games found panel; stylesheet `:has(.app__error)` suppresses that panel on load failure. There is no implemented retry button despite styles for `.app__error button`; a page reload is the current recovery path.

## Sort and recent discovery

`initSortControl()` injects a native select before the tag row. Default `sortMode` is `catalog` (Portal order); A to Z, Category and Recently played are alternatives. It is not default chronological/recent sorting. `sortCards()` only targets `.bento-grid__standard` when present, then sorts by title/category or `recentTimestamp(title, list)` descending with alphabetical ties. Recent mode reads one fresh normalized history snapshot per sort and passes it to each comparison; other modes do not read history. No page-global history cache is introduced. Featured entries remain ahead of standard cards. Portal order now builds a title-to-index `Map` from `_gamesList`, restores canonical standard-card ranks and appends only when the snapshot order differs. Unknown titles retain stable trailing order; the featured partition remains separate. Native A-to-Z/reload/Portal-order and Category/Portal-order comparisons passed.

`recordRecent()` stores launch intent, not confirmed gameplay, before opening a URL. `renderRecentRow()` creates text-safe buttons above the grid and hides the row when empty. A recent chip runs the same launch guard. Random game chooses uniformly from `_gamesList`, not filtered/visible/favorite games; failure to load UX data produces no launch. Sort/recent schema and corrupt-data hazards are in [browser state](browser-state.md).

## Launch, details and fallback modal

Current owner fullscreen change: `initCardLaunch()` captures card/Play clicks except favorite/info/tag controls. `openCard()` retains the early catalog retry. `openGameUrl()` retains `safeGamePath()` and recent recording, then calls `openGamePlayer()` for **every catalog game**. Card/Play/Enter/Space, Info Play, recent and random share that boundary. Native `<dialog>` supplies inert background/focus handling; an unsandboxed same-origin titled iframe occupies the entire viewport with fullscreen/autoplay/gamepad delegation, preserving existing game storage/input capabilities. `requestFullscreen()` runs in the user gesture, not iframe load. Native fullscreen hides all surrounding portal chrome and its fallback controls. Escape/browser exit reveals only Back/Fullscreen; closing removes the frame/document and restores opener focus without scrolling. Unsupported/denied native fullscreen retains edge-to-edge viewport playback, not a popup or navigation away. Info closes before opening the player so it cannot reclaim focus. No game DOM/header/HUD/start/restart/control source is stripped; those belong to the games, including protected Character AI. Browser fullscreen permission and mobile support cannot be forced. The guard still requires `Games/`, rejects traversal segments, encoded dot/slash/backslash/NUL, control characters and remote schemes. It validates path shape, not license, file existence or successful loading. [Current scope/native evidence](../../portal-fullscreen.md).

Information buttons call `openDetailPanel(card, trigger)`; the DOM has `#ux-detail-title`, `.ux-detail__panel`, Play and Close. Description/howto/title/player data use `textContent`; optional players are stringified and ranges display verbatim. Backdrop/Close/Escape close and return focus; Tab cycles within the dialog. No body scroll lock or inert background is added here. `trapDetailFocus()` installs a handler per opening that is removed on Escape or a subsequent key event after closure, not synchronously on every Close path.

The compiled `Wu()` iframe modal remains but normal captured launch bypasses it. `syncModal()` adds one dialog root, load/error status, title, safe Open-in-new-tab link and focus backstop. Iframe load means the document loaded, not that gameplay is ready; no timeout confirms asset readiness. Do not remove this fallback solely because ordinary clicks bypass it without checking all call paths.

## Fleet lane4 bounded verification (2026-10-15)

Current catalog has 125 entries, versus 118 in the already-stale maintenance inventory. Lane4 did not add/register games or refresh inventory (lane7 owns reconciliation). Read the complete authored UX/CSS and root entry, plus bundle application-tail callers; framework internals were not exhaustively reviewed. Existing image injection already sets native lazy loading and async decoding, so it was left alone. No analytics, HTML, compiled bundle, sparse selection or dependencies changed in this lane.

`python3 -B scripts/test_portal_fleet.py` passed: empty Favorites/search guidance, keyboard reset-to-search, nested Play arrow/End and Favorite Home through visible cards, native Tab, fuzzy-only search, desktop/mobile light/dark, 44px controls, compact single-result positioning and no document overflow. A separately labeled saved-history fixture checks recent-chip size and compact row styling, not gameplay/launch success. Console/page-error collection was empty. The test uses the real portal/catalog, not gameplay. Screenshots and logs are temporary lane4 fleet artifacts. Main subsequently reviewed the four desktop/mobile light/dark captures as readable and compact; this is not gameplay or device acceptance. `scripts/test_portal_review.py` also reported `portal review checks passed`. The unchanged refurbishment runner failed its 5000ms `.ux-sort__select` wait twice (initial load, then malformed-history reload); the second run reached passing search/IME-protocol/filter/sort/idle checks first. This is a failed runner, not a full pass. The unchanged `scripts/test_portal_fullscreen.py` was also attempted under Xvfb but exceeded the 240-second bound without a result receipt; it is held, not passed. Its real Snake phase also requires sparse-excluded assets that this lane was forbidden to materialize. OS IME, screen readers, actual hardware and full-game smoke remain unverified.

`node --check assets/portal-ux.js`, owned diff whitespace checks and catalog required-field/unique-integer-ID/Git-URL validation passed. `python3 -B scripts/check_maintenance_docs.py` failed before edits with `Inventory stale`; no refresh was attempted. Full release acceptance/push remains separate.

### Lane4 follow-up diagnosis

The [2026-10-15 follow-up](../audits/fleet-2026-10-15-lane4.md) preserves runtime source and both original regression runners. A 360-second-bounded original refurbishment execution with temporary exception observation reached all malformed-history cases, then failed its unchanged 5000ms recent-chip wait on the 1,001-record oversized fixture (line 190). Captured DOM already contained 125 cards, the visible sort and eight recent chips. Serving pre-lane4 UX/CSS from `2680ee0` under the same current catalog failed at the same assertion. This is not evidence that lane4 introduced the timeout; the earlier line-182 sort wait was not reproduced or explained conclusively. No speculative reset architecture or timeout weakening was applied.

The fullscreen source intentionally spends 1.1 seconds per close before re-entry, and its historical 116-entry run took 381.46 seconds. The earlier 240-second kill therefore cannot establish a portal deadlock. Follow-up fixture-only fullscreen passed 125 routes/all entrypoints and policy denial at 390/320 in 427.14 seconds; real Snake remains explicitly deferred without changing shared sparse state. Independent final-source fleet/review checks and the 2/2 local payload budget also passed. Exact receipts and remaining holds are in the linked audit. Main's reported full125 result was 122/125, failed, not a release pass.

### Oversized-history follow-up

The [history follow-up](../audits/fleet-followup-history.md), starting at `e787681`, measured 1,374 raw-history parses for 687 comparisons in one native recent sort. Passing a single fresh validated snapshot into the comparator reduced that to one parse, preserving the first-valid-URL rule, eight-item cap, timestamp ordering and alphabetical ties. No renderer reset, bundle, layout, SEO or storage-rewrite change was made.

The optimization does **not** establish complete readiness acceptance. Two unchanged refurbishment executions still failed the existing 5000ms sort wait, on malformed-history reload and initial load respectively. The final serialized fleet regression passed all existing checks plus the new raw-history/freshness/one-parse assertions in 21s. Full fullscreen reached real Snake and a 390px denial capture, then hit its 650s process bound without final acceptance. The follow-up records these receipts and DOM timing observations separately. Historical lane4 failures are retained rather than relabeled as passes.

## Thumbnail recovery (2026-10-21)

Explicit `THUMBS` aliases take precedence over the lowercase title-slug fallback.
Missing JPGs downgrade to the local SVG icon; `data-ux-thumb-failed` prevents the
mutation observer from reinserting the same failed image indefinitely. Changing
its resolved URL permits a later attempt. Thumbnail loading does not establish
that the underlying game loads or plays. See the [thumbnail sweep](../audits/thumbs-sweep-20261021.md)
for capture guards, final counts and known local-source gaps. The [shipping receipt](../audits/thumbs-ship-20261021.md) records the merged 127-game catalog, four fresh portal theme/viewport checks, 110 loaded card images, 17 SVG fallbacks and the operator's full-gate exception for this push.

## Fresh thumbnail sweep v3

The [v3 receipt](../../thumb-sweep-v3.md) records a new registered-catalog sweep,
not reuse of the earlier loader/shell captures. The batch tool serves immutable
HEAD game blobs directly from Git, including sparse-excluded dependencies; it
requires HTTP 200 and leaves acceptance to visual review. Accepted images retain
the 1280x720 viewport and use optimized progressive JPEG. Rejected loaders,
menus, unavailable renderers and timed-out automation retain the old image (or
existing SVG fallback); no game source is repaired by this sweep. Fresh hacked
Snake, Doodle Jump and three Fireboy captures use their own files, not aliases
of the base game.
The tool regression covers safe paths, exact Git blob delivery and real 404s.

The v3.1 continuation gives Merge Cats Defender Hacked its own image-path alias,
`mergecatsdefenderhacked.jpg`, after native stage-one deployment reached a real
wave. Its original HACKED badge must not overwrite the base game's shared art.
The base `mergecatsdefender.jpg` bytes remain unchanged. Jetpack Joyride Hacked
likewise maps to `jetpackjoyridehacked.jpg` after a real scrolling-run capture,
so its badge cannot overwrite the newly captured normal variant. These are only
image mapping changes, not catalog/gameplay or rights changes; capture/alias
guards cover both dedicated names. Other v3.1 results and holds are in the linked receipt.

## Safe refurbishment and verification

Smallest fixes belong in authored UX shared helpers: search routing, recent validation, catalog retry/status and DOM reconciliation. Keep bundle DOM class contracts and preserve title/ID identity separately. Do not hand-edit compiled React or replace working game menus. Density controls, copy-link/share actions, deep-link query state, custom scroll-spy and account features were **not found** in the audited authored portal/application tail. `portal-share.png` is metadata imagery, not a share widget. Motion-library IntersectionObserver code is not proof of an active portal scroll feature.

Historical focused browser result: `portal review checks passed` from `scripts/test_portal_review.py`. Delegation 73 also ran `scripts/test_portal_refurbishment.py`: native fuzzy/empty search, Clear/Escape, favorite/tag/category combinations, persisted-sort restoration, negative recent-storage fixtures and normal UI launch recording passed. Its read-only idle probe observed zero mutations across counts/status/recent for 1200ms after settling. At that historical baseline neither runner proved random launch, popup denial, trusted OS IME, target-hardware CPU/FPS or gameplay. Current launch tests target native fullscreen and actual policy denial rather than popup behavior; original popup receipts remain historical. Recommended next native steps: type a fuzzy query and a no-result query, Escape/Clear, switch bundle/extra categories with combined tags/favorites, inspect details with keyboard, exercise popup allowed/blocked paths and all sort modes. Main must review screenshots and accessibility judgment; the worker does not label source-only flows as working. Full release gate remains separate.
