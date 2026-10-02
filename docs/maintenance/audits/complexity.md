# Complexity and coupling audit

<!-- maintenance-audit: complexity -->

Frozen source: `8c8a055813b35bbd5d8b632423328333b4252d43`.
This is an evidence-backed refurbishment queue, not deletion permission.
[Static findings](static-tree.md) contain correctness/security issues separately;
[machine evidence](static-tree.json) contains clone/storage candidates.
Main owns design and integration. No runtime changes were made by delegation 57.

## Ranked simplification candidates

1. **shrink:** repeated Unity exports should share only verified identical payloads,
   after tracing all relative/constructed loaders; retain distinct entry behavior.
   `Games/SubwaySurfers/Build/SanFrancisco/` and both nested/hacked copies contain
   four identical `SanFrancisco.data.unityweb` blobs of 27,979,216 bytes and four
   identical `SanFrancisco.wasm.code.unityweb` blobs of 25,765,359 bytes. Their
   duplicate logical bytes are 83,937,648 and 77,296,077 respectively. This is
   identity proof, not proof of unused assets or a promised 161 MB deletion.
2. **shrink:** repeated Ovo media can share a stable local asset location only after
   walking each version's Construct data manifest, service-worker cache and replay
   compatibility; retain variant engines. `track4.ogg`/`track 4.ogg` have twelve
   identical 3,505,459-byte copies; `track1.ogg`/`track 1.ogg` have twelve identical
   2,977,190-byte copies. Names with spaces and version-relative loaders matter.
3. **shrink:** portal mutations should update changed values, not rebuild count and
   recent-row nodes on every observer turn. Reuse current nodes and existing state,
   not another renderer. Anchors: `assets/portal-ux.js`, `onMutations()`,
   `updateCategoryCounts()`, `renderRecentRow()`, `updateResultStatus()`.
4. **shrink:** `sortCards()` can snapshot current card order once; it currently calls
   `$$('.game-card', grid)` again for every comparison in its changed-order loop.
   `recentTimestamp()` also repeatedly parses `unblockmath_recent` during the
   sort comparator. Read that small list once per sort, not through a new cache
   service. No N100/ARM timing or FPS improvement has been measured.
5. **delete candidate, not authorized:** `assets/game-save.js` exports `GameSave`
   with `load`, `save`, `clear`, `listAll`, but the tracked HTML/JS consumer search
   found only the utility itself. Replacement is nothing **only if** wider
   constructed-path/data-template tracing and owner review confirms absence of
   consumers. Do not migrate games' existing save keys into this generic utility
   merely to justify retaining it.
6. **shrink:** `Games/Ovo/1.4.5/unlockalllevels.js`, `getLanguageValue()`, repeats the
   exact same `en-us`/`text`/`Hellish` replacement branch twice. Retain one branch;
   preserve the separate `Coin God` behavior and upstream notices. This is a small
   inherited helper cleanup, not grounds to rewrite the Construct language engine.

Net: removable lines unknown; dependency removals unknown. No fabricated savings.
The measured identical-blob duplicate ceiling for groups of at least 1 KiB is
791,533,422 logical bytes over 1,520 groups. This is **not** reclaimable disk space:
Git already shares identical blobs, references can require separate deployed paths,
and compressed/check-out sizes differ. Top 30 groups with bounded path samples are
in JSON; truncated group paths are explicitly marked. No deletion happened.

## Dependency and architecture map

### Portal: two cooperating render/state owners

The authored UX layer reads `games.json` once through `fetchGames()` and builds
`_gameUrlCache` through `fetchGameUrlCache()`. The compiled React bundle owns its
cards, base category chips and favorites. UX adds extra category chips, tag/favorite
filters, fuzzy search, sorting, recent history and detail dialog behavior by DOM
selectors. Exact coupling points include `.bento-grid`, `.game-card__title`,
`.game-card__fav.active`, `.category-filter__btn`, `.search-bar__input` and
`data-ux-*-hidden` attributes. Titles act as lookup keys in `THUMBS`, `GAME_ICONS`,
`findGameData()` and the URL map, whereas the catalog's stable IDs identify entries.

`initCardNewTab()` captures card clicks to suppress the bundle modal route;
`initDebouncedSearch()` captures input and selectively replays events through the
native input value setter. `uxChipProgrammatic` prevents a generated All click from
undoing the extra category state. These are specific frozen-bundle compatibility
constraints, not gratuitous abstractions to delete on sight. Renaming selectors,
removing capture handlers or reparenting React nodes can break sibling features.
Do not hand-edit `assets/index-CRWHmtoy.js` to remove this coupling.

Safe first refurbishment: fix idempotent writes and persisted-state validation at
shared helpers; prove combined category/tag/favorite/search clearing and keyboard
navigation before rearranging state ownership. Restore source/build provenance
before any later consolidation into one renderer. A fresh SPA/toolchain is not
needed for the immediate fixes and is not authorized by this audit.

`GAME_ICONS` contains entries for previously removed titles, but `getGameIcon()`
can consume title keys dynamically. Missing current catalog matches alone are not
sufficient deletion evidence: check local search/caller contracts and owner intent.
The eight old thumbnail mappings mentioned in earlier audit context are not assumed
broken here; no current broken thumbnail claim was manufactured.

### Shared emulator: useful centralization, fragile failure boundary

`Games/_emulatorjs/data/loader.js` maps wrapper globals to one runtime config,
including `EJS_gameUrl`, `EJS_core`, `EJS_paths`, `EJS_language`, `EJS_cheats` and
`EJS_netplayServer`. Default loading uses `emulator.min.js`/`emulator.min.css`;
debug mode loads individual runtime components. This shared dependency has many
wrapper consumers and is not an orphan game. Preserve it and its licensing.

Current promises lack failed-resource rejection; patching this once at the loader
is smaller and more reliable than per-game spinners/timeouts. Update/network rules
must remain explicit. The string `https://netplay.emulatorjs.org` is a default config,
not proof that every wrapper connects. Binary/ROM legality and performance remain
separate gates; a shared emulator license does not grant ROM redistribution rights.

### Independent inherited engines and variants

Unity, Construct, GameMaker, Ruffle and hand-authored games are distinct runtime
families. A generic game engine abstraction would erase important upstream
bootstrap, persistence and license boundaries. Prefer bounded wrapper fixes.
Duplicate blob identity helps plan storage, not infer interchangeable gameplay.
The nested Subway export differs from the cleaned catalog entry: it loads analytics
and its own loader path. Removing a nested tree without tracing URLs/cache/engine
paths could break directly linked consumers even if catalog smoke stays green.

Circuit Ward's `PeerRoom` is not a one-implementation factory to eliminate: it
owns peer identity, packet validation, sequence/epoch rejection, channel limits,
pairing deadlines and close/abort cleanup. Native WebRTC with empty ICE servers and
manual signaling is already the dependency-minimal option. Do not replace it with
accounts, room-code services, a third-party signaling library or a public relay.
No native pairing/performance test was run by this worker.

## Evidence before any proposed cut

Actually run consumer search:

```text
git grep --cached -l -e 'GameSave' -e 'game-save.js' -- 'Games/**/*.js' 'Games/**/*.html' 'assets/*.js' '*.html' 'uv/*.js'
assets/game-save.js
```

This includes sparse-excluded tracked HTML/JS, but it is not a whole-engine dynamic
reference proof. Separate searches found Ovo `offline.js` cache-list references to
both SDK harness and unlock helper; those are consumers, not permission to delete.
Use frozen Git blob access for follow-up instead of a broad Games checkout.

Before any sharing/deletion: enumerate every identical group path using Git
object identity, inspect relative loader/publicPath configuration, search tracked
HTML/JS/CSS/manifests plus archive/template strings, and record a per-path consumer
map. Preserve original models/notices/protected Character AI and offline solo.
Stage only approved explicit paths. Never delete audit history for stale counts.

## Month refurbishment order and verification

1. **Week 1:** owner/security triage of confirmed remote executable helper pages;
   shared loader error boundary; portal observer and corrupt-recent handling.
   Keep proxy disabled. No asset consolidation before consumer evidence.
2. **Week 2:** approve bounded sort/search/filter and accessibility fixes. Native
   desktop/mobile review in both themes verifies focus, touch targets, restart and
   loading feedback. Do not treat parser success as design review.
3. **Week 3:** source/provenance-led bundle/asset sharing research. Confirm licenses,
   source revisions, data manifests, cache behavior and rollback first. New 3D
   additions remain a plan with separate permission/rights/hardware gates.
4. **Week 4:** actual low-end hardware profiling, complete gameplay/save/reset
   sampling and regression review. Performance projections without measurements
   stay unknown; do not promise a game count or background month-long work.

Actually run in this task: Git metadata/blob scan, resolver self-test, 220 Node
parser units, catalog/schema/tracked-URL checks and source consumer search. Native
checks: zero. Recommended checks include corrupt storage, idle mutation traces,
sort round-trip, blocked emulator resources and conditional update requests.
Main performs the unchanged full native catalog smoke gate serially and owns
screenshots, subjective acceptance and release. No dependency/framework was added.
