# Portal feature maintenance

<!-- maintenance-site: portal -->

Baseline: `8c8a055`; runtime read-only for this documentation pass. Source links are [UX](../../../assets/portal-ux.js), [entry](../../../index.html), [polish](../../../assets/portal-polish.css) and [catalog](../../../games.json). The compiled bundle application tail was inspected for its interface, not every line of React/motion internals. Start with [architecture](../../ARCHITECTURE.md) and [audit findings](../audits/portal.md).

## Catalog and render ownership

The bundle's `Gu()` fetches `./games.json`, rejects a non-array and exposes loading/error. `Ju()` filters non-object rows, category and title/description substrings before rendering `Bu()` through `Vu()`. The base chips (`Ru`) are All, Action, Puzzle, Strategy, Classic, Sports and Riddle. UX `fetchGames()` makes a second, internally shared request, normalizes tag aliases/deduplicates them and caches `_gamesList`. `findGameData(title)` and the URL Map both rely on exact unique titles; favorites instead rely on IDs. Duplicate titles can launch the wrong entry even with unique IDs.

The seven required catalog fields are not an exhaustive schema. Optional `tags`, `players`, `howto` drive injected badges and detail metadata. At this baseline there are 115 entries; categories are action 24, classic 19, puzzle 17, strategy 16, arcade 11, sports 10, story 4, word 4, card 4, idle 3, simulation 2, riddle 1. `updateCategoryCounts()` uses the full normalized list, not the visible filtered list. Zero-count badges are omitted. `applyFilterMetadata()` derives missing `data-cat-id` from label text after removing the count clone, so numbers must not become part of category identity.

## Category, tag and favorites intersection

`UX_EXTRA_CATS` adds arcade/card/idle/story/simulation/word via `injectUxCatChips()`. A click toggles `activeUxCat`, programmatically clicks bundle All if required, then applies `data-ux-cat-hidden`. `uxChipProgrammatic` prevents the capture listener from clearing the just-selected category. A user click on a bundle chip clears the UX category, avoiding two independent categories intersecting to zero.

`buildTagFilterRow()` exposes only supported tags actually present: `TAG_LABELS` maps `2p`, `coop`, `hacked`. `toggleTagFilter()` synchronizes row/card `aria-pressed`; `applyTagFilter()` requires **every** selected tag. Co-op plus 2 players is an intersection, not a union. Card badges are injected as buttons, but polish hides non-hacked badges on the shelf; player/co-op metadata remains in filters/details. Aliases affect UX data only, not the raw catalog or compiled engine.

`injectFavToggle()` adds Favorites without owning star persistence. `isBundleFav()` reads `.game-card__fav.active` or its Remove-from-favorites label. `applyFavFilter()` writes `data-ux-fav-hidden`. The hide selectors in `index.html` intersect category, tag, favorite and search attributes with `display: none !important`. Preserve those selectors and use `visibleCards()` rather than raw DOM count for result feedback.

## Search, keyboard and empty states

`fuzzyMatch()` removes whitespace from the lowercase query and checks substring or ordered subsequence against the lowercase **title**. It does not rank typo distance or search arbitrary controls. The bundle's separate substring search also includes descriptions. `/` focuses `.search-bar__input` unless an editor/select/contenteditable or detail panel owns focus. Card arrows select visible geometric neighbors; Home/End select first/last; Enter/Space launches; `i` opens information.

`initDebouncedSearch()` is intended to stop non-empty input reaching React so fuzzy-only matches remain mounted. Empty input is replayed after 180ms via the native value setter and a bubbling input event marked `data-ux-search-replay`. Escape replays empty immediately. However the capture listener's `stopImmediatePropagation()` also blocks `initFuzzySearch()`'s document bubble listener. Non-empty input does not reliably reach the intended immediate overlay; later DOM mutations can incidentally apply it. This is an open source finding, not a completed feature check.

`updateResultStatus()` writes a polite singular/plural game count. `updateClearFiltersBtn()` exposes Clear filters only for an empty result with active filters. `doClearFilters()` clears input, active tags, favorite-only and UX category, then clicks the first category button (currently All). React owns its No games found panel; stylesheet `:has(.app__error)` suppresses that panel on load failure. There is no implemented retry button despite styles for `.app__error button`; a page reload is the current recovery path.

## Sort and recent discovery

`initSortControl()` injects a native select before the tag row. Default `sortMode` is `catalog` (Portal order); A to Z, Category and Recently played are alternatives. It is not default chronological/recent sorting. `sortCards()` only targets `.bento-grid__standard` when present, then sorts by title/category or `recentTimestamp()` descending with alphabetical ties. Featured entries remain ahead of standard cards. Returning to Portal order currently returns early without restoring DOM order; see audit.

`recordRecent()` stores launch intent, not confirmed gameplay, before opening a URL. `renderRecentRow()` creates text-safe buttons above the grid and hides the row when empty. A recent chip runs the same launch guard. Random game chooses uniformly from `_gamesList`, not filtered/visible/favorite games; failure to load UX data produces no launch. Sort/recent schema and corrupt-data hazards are in [browser state](browser-state.md).

## Launch, details and fallback modal

`initCardNewTab()` captures clicks and blocks React on card/Play except favorite/info/tag controls. `openCard()` retries lookup after the shared catalog promise if Enter arrives early. `openGameUrl()` calls `safeGamePath()`, records recent and uses `window.open(url, '_blank')`; blocked popup switches to same-tab navigation. The guard requires `Games/`, rejects traversal segments, encoded dot/slash/backslash/NUL, control characters and remote schemes. It validates path shape, not license, file existence or successful loading.

Information buttons call `openDetailPanel(card, trigger)`; the DOM has `#ux-detail-title`, `.ux-detail__panel`, Play and Close. Description/howto/title/player data use `textContent`; optional players are stringified and ranges display verbatim. Backdrop/Close/Escape close and return focus; Tab cycles within the dialog. No body scroll lock or inert background is added here. `trapDetailFocus()` installs a handler per opening that is removed on Escape or a subsequent key event after closure, not synchronously on every Close path.

The compiled `Wu()` iframe modal remains but normal captured launch bypasses it. `syncModal()` adds one dialog root, load/error status, title, safe Open-in-new-tab link and focus backstop. Iframe load means the document loaded, not that gameplay is ready; no timeout confirms asset readiness. Do not remove this fallback solely because ordinary clicks bypass it without checking all call paths.

## Safe refurbishment and verification

Smallest fixes belong in authored UX shared helpers: search routing, recent validation, catalog retry/status and DOM reconciliation. Keep bundle DOM class contracts and preserve title/ID identity separately. Do not hand-edit compiled React or replace working game menus. Density controls, copy-link/share actions, deep-link query state, custom scroll-spy and account features were **not found** in the audited authored portal/application tail. `portal-share.png` is metadata imagery, not a share widget. Motion-library IntersectionObserver code is not proof of an active portal scroll feature.

Actual focused browser result: `portal review checks passed` from `scripts/test_portal_review.py`. It checks layout/theme/tag/count interactions, not search, random launch, popup denial, recent corruption or gameplay. Recommended next native steps: type a fuzzy query and a no-result query, Escape/Clear, switch bundle/extra categories with combined tags/favorites, inspect details with keyboard, exercise popup allowed/blocked paths and all sort modes. Main must review screenshots and accessibility judgment; the worker does not label source-only flows as working. Full release gate remains separate.
