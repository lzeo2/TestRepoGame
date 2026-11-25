# Whole-repository review, 2026-11-26

Baseline: `774fbff3`; review performed 2026-11-25 UTC for the requested 26 November handover. This is static coverage of the entire tracked inventory and all catalog records, with representative source checks, not exhaustive vendor-line review or fresh gameplay/release acceptance. No protected Character AI implementation was inspected. No deployment, push, proxy enablement or asset deletion is included.

## Inventory and coverage

NUL-delimited `git ls-tree -rlz HEAD` reports **16,234 tracked files, 2,323,012,857 logical bytes** (not Git pack size or browser transfer). `Games/` contains **13,305 files, 141 game projects and one shared runtime** (`_emulatorjs`). The runtime catalog has **135 records, 12 categories, unique IDs/titles and 135 tracked entry URLs**. Six projects are unregistered: 2048, Garage Borough, Hextris, Jankolock, QWOP and Slope. Their absence from the catalog is not permission to register them. Optional metadata: 101 records have tags; only 11 have `players`, and 11 have `howto`.

| Subsystem | Inspected evidence and boundaries |
| --- | --- |
| Portal and discovery | Root HTML/manifest; authored UX startup, catalog cache, observer and detail-dialog close/focus handling; CSS change boundary; compiled bundle ownership documented in `docs/ARCHITECTURE.md`. Bundle framework internals not line-audited. |
| Game fleet | Every catalog URL checked against Git; project/size inventory across sparse-excluded files. Representative Snake HTML (canvas, score/restart and mobile controls), Subway Surfers HTML (local Unity loader, progress wrapper, offline adapter), Fleeing the Complex HTML (local Ruffle/SWF), Capital Drive HTML (module preload, controls and local CSP). These show several runtime families, not native-play acceptance. |
| Shared assets/storage | Local fonts/thumbs, Ruffle and emulator inventory. 140 files under `assets/thumbs/` does not imply 140 unique game artworks or complete rights review. |
| Hosting/proxy | `netlify.toml`, `netlify/functions/bare.js`, `uv/index.js`: static root publication, headers and disabled backend. Keep `BACKEND_ENABLED = false`; no functional relay is promised. |
| Maintenance and verification | 2,190 tracked documentation files and 504 script files; maintenance index/inventory, architecture and release manuals reviewed. No tracked `.github/` workflow found. Historical fleet receipts remain dated evidence. |

## Prioritized next changes

1. **P1: recover catalog-dependent actions after a transient load failure.** In `assets/portal-ux.js`, `fetchGames()` catches failure, returns `[]`, and retains the fulfilled `_gamesPromise`; `fetchGameUrlCache()` also retains its result. React reads the catalog separately. Consequently a successful React request and failed UX request can leave visible cards without corresponding UX launch/detail metadata until reload. Implement a bounded retry/retry action with an explicit error state and reset dependent caches; preserve a genuine successful empty result. Reproduce with a local fixture that fails only the UX catalog request once, then succeeds; assert Play, random and details recover. This is source-derived behavior, not a network-failure browser reproduction from this review.

2. **P1: reconcile current inventory/release guidance and automate cheap checks.** `README.md` and `docs/ARCHITECTURE.md` still describe 115 entries, while the maintenance introduction says 134 and later calls 125 current; baseline is 135. Root README also says no PWA manifest although `index.html` links `manifest.webmanifest`. Add one generated inventory summary with source revision, update current entry points, and retain older receipts explicitly as history. Add a minimal CI job for catalog schema/unique IDs/Git paths, syntax and relevant regression checks; keep the full browser gate as a separate unchanged release gate. `python3 -B scripts/check_maintenance_docs.py` exited 1 during concurrent work with `Commit inspected source changes before validating its inventory.` This is an integration prerequisite, not proof the inventory checker is broken; rerun after game/catalog commits settle.

3. **P2: fill discovery metadata from verified controls.** 124/135 entries lack each of `players` and `howto`. Build a small backlog ordered by usage/featured games; verify actual input and solo/local-multiplayer behavior before filling fields. Do not infer capabilities from titles or tags. Validate keyboard/touch instructions on the corresponding game start path as well as its detail card. The count measures missing optional data, not 124 proven inaccessible games.

4. **P2: establish loading/cache budgets before changing payloads.** `netlify.toml` provides explicit caching only for `/uv/sw.js`; effective production defaults were not measured. Add tested long-lived caching only for truly immutable versioned assets, and revalidation for catalog/HTML/mutable authored scripts. The root manifest does not install an offline cache. Largest project totals are Ovo **616,416,444 bytes**, SubwaySurfersHacked **144,518,581**, and SubwaySurfers **144,515,568**. Both Subway trees contain repeated 27,979,216-byte SanFrancisco data files, and their active entry references `Build/SanFrancisco/SanFrancisco.json`. Trace manifests, constructed URLs, worker requests and byte identities before deduplication; totals do not establish downloaded bytes or unused files. Record cold/warm launch transfer and time-to-play on a constrained profile, and preserve loading/error feedback.

5. **P2: tighten modal lifecycle and verify actual assistive use.** `assets/portal-ux.js` closes the custom detail dialog and restores focus, but `trapDetailFocus()` removes its key handler on a later key event for non-Escape closure. The background is not made inert. Use a single explicitly disposed handler (or a tested native dialog), then verify repeated open/Close/backdrop cycles, keyboard containment, focus return, screen-reader background access, narrow screens and both themes. Existing `aria-modal` plus Tab handling alone is not a screen-reader acceptance result. Retain the repository's 44px control standard; WCAG 2.2 AA target-size minimum is 24 CSS pixels with exceptions, so do not conflate the two.

6. **P3: recover portal source and reduce layered ownership.** The compiled React portal has no authored source project here, while `assets/portal-ux.js` reconciles rendered DOM through a subtree/class observer and `index.html` retains substantial historical CSS. Recover a reproducible source build before a broad redesign. In the interim, keep bounded changes in authored files and measure observer callbacks/idle work; do not hand-edit the compiled bundle. Source recovery should eventually unify catalog loading and UI state, reducing the split-reader failure in priority 1.

## Improvements delivered in this run

This review itself delivers the sparse-safe inventory, prioritized evidence and primary-source references. Concurrent portal/vehicle/home changes are outside this document's ownership; their implementation and verification receipts must be checked after integration. They are not treated as completed merely because their files are dirty. No whole-fleet pass or hardware acceptance is claimed here.

## Primary references researched

These are general design/engineering guidance, not evidence of this site's measured conformance or performance:

- [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/2023/REC-WCAG22-20231005/): keyboard access, focus, timing and target-size requirements. Apply to portal controls and nonessential motion; consider each game's essential interaction separately.
- [W3C WAI: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): focus visibility and 24px AA target minimum, distinct from the project's stronger 44px target rule.
- [Google web.dev: image performance issues](https://web.dev/learn/images/performance-issues): defer below-fold images, reserve dimensions, avoid lazy-loading the initial important image. Existing portal thumbnails already use lazy loading; measure before applying another blanket change.
- [Google web.dev: HTTP cache](https://web.dev/articles/http-cache): versioned URLs support long-lived caching; mutable URLs require freshness discipline. This supports a narrow cache policy, not immutable caching of every game file.
- [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): lifecycle transitions and suspension guidance for future per-engine pause/audio checks. This review did not establish fleet-wide background-pause defects.

## Reproduction

Run against the intended committed baseline; working-tree source changes can legitimately block the inventory checker. Do not broadly materialize Games.

```bash
git rev-parse --short HEAD
git ls-tree -rlz HEAD > /tmp/arcade-review-tree.z
python3 -B scripts/check_maintenance_docs.py
```

```python
import collections, json, subprocess
rows = subprocess.check_output(['git', 'ls-tree', '-rlz', 'HEAD']).split(b'\0')
files = {path.decode(): int(meta.split()[3])
         for row in rows if row for meta, path in [row.split(b'\t', 1)]}
games = json.load(open('games.json'))
assert len({g['id'] for g in games}) == len(games)
assert len({g['title'] for g in games}) == len(games)
assert all(g['url'] in files for g in games)
projects = {p.split('/')[1] for p in files if p.startswith('Games/')}
print(len(files), sum(files.values()), len(games), len(projects - {'_emulatorjs'}))
print(collections.Counter(g['cat'] for g in games))
print({k: sum(k in g for g in games) for k in ('tags', 'players', 'howto')})
```
