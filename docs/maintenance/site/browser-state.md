# Portal browser state and recovery

<!-- maintenance-site: browser-state -->

Audited source `8c8a055`: `index.html` storage shim, `assets/portal-ux.js` in full and relevant compiled application tail. No state migration or runtime patch was made. [Portal features](portal.md) covers DOM consumers; [audit](../audits/portal.md) separates open defects from recommended fixes.

## Stored keys and actual formats

| Key | Writer/readers | Format, bound and lifetime |
| --- | --- | --- |
| `unblockmath_favorites` | Bundle `qu()`, `Bu()`/`Vu()` star state; UX reads rendered star state, not this key | JSON array of IDs. Read permits numbers **or strings**, no deduplication, catalog-membership filter or explicit size cap. Numeric catalog IDs use strict `includes`. |
| `unblockmath_recent` | `recordRecent()`, `getRecentList()`, `renderRecentRow()`, `recentTimestamp()` | JSON array of `{title, url, ts}` objects, `ts=Date.now()` milliseconds. Writer deduplicates by URL, prepends and caps to `RECENT_MAX=8`. Reader does not cap or validate elements. |
| `unblockmath_sort` | Ready callback, sort-select change, `sortCards()` | Plain string: `catalog`, `title`, `category`, `recent`; invalid stored values ignored. Default `catalog`. |
| `theme` | `initThemeToggle()` preference/apply/save closures | Plain `light` or `dark`; invalid initial value falls back to OS preference. Persists explicit choice. |
| `__um_probe` | Head shim `getItem` only | Read probe, not a saved user setting. No write/removal is performed by the probe. |

All are same-origin localStorage with **no encryption**, account, server synchronization, export or cross-tab event reconciliation. Values can be edited by same-origin scripts and browser tools. The portal does not store game progress centrally or inspect every game's save. Per-game localStorage/IndexedDB/engine saves have separate owners and must not be erased as a portal repair shortcut.

## Favorites: identity and failures

The bundle initializer wraps get/JSON parse in a try and returns `[]` for malformed JSON or a non-array; it filters elements to number/string. The following persistence effect calls `localStorage.setItem` **without** a try. This distinction matters: good corrupt-read handling does not guarantee storage-denied writes cannot disrupt React. The head shim only handles access/read denial, not a store that can read but throws quota/write errors.

`toggleFavorite(id)` uses strict membership, removes matching values or appends the numeric ID. An old string `"7"` does not favorite catalog number `7`; stale IDs remain in storage but display no star when their entry disappears. Renumbering or reusing an ID can transfer a favorite to an unrelated game. Keep IDs stable and allocate new IDs only with the operator/live catalog; never silently reuse a removed ID.

`isBundleFav(card)` treats `.game-card__fav.active` or the Remove-from-favorites label as truth. `favOnly` is page-memory only, so reloading preserves stars but clears the Favorites filter. No storage-event listener updates an already open second tab. A safe future migration should validate/deduplicate allowed numeric IDs while preserving the previous raw value for rollback; changing a compiled effect requires source recovery or an approved authored storage-boundary fix, not hand-editing the bundle.

## Recent history: launch intent, not completion

`openGameUrl()` validates the path, resolves a missing title from `_gameUrlCache`, then records before `window.open`. Blocked popup fallback navigates same-tab. A launch can therefore appear in history even if the game subsequently fails. Random selection and detail Play share this helper; card/keyboard paths and recent chip clicks reach it too. The row is not a win/score log and has no clearing UI.

`recordRecent()` catches storage/parse failures and accepts only an array at top level. It filters `e.url` without element validation: `[null]` throws inside the outer try and silently prevents the new record. `getRecentList()` catches parse/access failures but returns any array unchanged. `renderRecentRow()` dereferences `entry.title`/`entry.url` outside that catch; `[null]` can throw during reconciliation. `recentTimestamp()` likewise dereferences `.title`. This is a real trust-boundary gap even though history labels use safe `textContent` and launch URLs are rechecked.

The eight-record bound applies only on successful writes. A manually altered or older huge array can create arbitrarily many buttons and repeated scans until replaced. Unknown paths may still appear as chips, although `safeGamePath()` rejects launch outside Games. Minimal fix is one shared read validator: filter object records with string title/local guarded URL and finite timestamp, deduplicate URLs, bound eight, then let all three readers use it. Do not add a general database/history service.

## Theme and sort preferences

`getPreferredTheme()` accepts light/dark, otherwise prefers OS light when matched and dark by default. `applyTheme()` updates `html[data-theme]` and `meta[name=color-scheme]`; `updateIcon()` shows the destination sun/moon. `saveTheme()` catches writes so the current page still switches when persistence fails. OS change listener refuses to auto-switch whenever **any** stored theme string exists, including an invalid string. An invalid key can thus follow the OS on initial load but stop following later changes. Normalize invalid stored state before deciding it is explicit preference.

Sort initialization validates the four modes. Writes are caught; sort selection works in memory even if saving fails. `recentTimestamp()` uses history title, whereas recent deduplication uses URL and favorites use ID: changing titles can break recent sorting without affecting favorites. `sortCards()` mutates standard-container DOM order, and catalog mode does not restore its previous order. Saved A-to-Z survives reload; selecting Portal order afterward currently leaves that reordered DOM until React reconstructs it. Featured partition is unaffected. A minimal repair should derive baseline order from the fetched catalog/ID and apply it, not build a second catalog.

## Transient caches, filters and timers

`_gamesPromise` and `_gameCachePromise` persist only for the page. `_gamesList` and `_gameUrlCache` are filled once; failed UX fetch becomes a resolved empty cache with no retry. Active tags, extra category, favorites-only, detail dialog/opener, recent row reference, banner dismissal and sort DOM reference are IIFE memory. Bundle owns its own catalog/loading/error/search/category/modal state. None of these filters serialize to URL query parameters.

Timers are search clear replay (180ms), mutation reconciliation (80ms), category class cleanup (260ms) and random launch feedback (550ms). `MutationObserver` persists for page lifetime and watches child/subtree/class changes. No teardown API is exported because normal navigation unloads the page. That does not make self-triggering observer work harmless; counts/status DOM writes can schedule repeated reconciliation. Detail key handlers have closure-based cleanup that is delayed on non-key close paths. See findings before adding further observers.

## Storage denial and safe support workflow

The head shim obtains localStorage and calls getItem; if that fails, it defines a memory implementation with get/set/remove/clear/key/length. Persistence degrades to the current page. If `Object.defineProperty(window, 'localStorage', ...)` fails, the code deliberately leaves the browser error visible. It does not test write availability, quota, storage permissions changing after startup or cross-origin/game iframe storage.

Recommended native cases, not run here: fresh profile; malformed favorites JSON; mixed string/numeric IDs; quota-denied setItem; `unblockmath_recent=[null]`; oversized history; invalid theme; two tabs; title rename; popup denial; each sort after a reload. Never paste real personal browser values into evidence. Use synthetic objects and clear only the four portal keys in a throwaway test context. Removing all origin storage risks game save loss. The focused portal runner actually tested theme reload persistence and layout, not this failure matrix; no claim of full storage robustness follows from its pass.
