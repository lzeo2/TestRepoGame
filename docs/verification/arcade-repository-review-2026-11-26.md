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

1. **P1, addressed: recover catalog-dependent actions after a transient load failure.** Baseline `fetchGames()` cached failure as an empty result while React loaded independently. Commit `340cf7fc` adds visible Retry catalog, remembers failure to prevent observer-driven storms, and resets catalog and URL promises on explicit retry. A successful retry reloads when the compiled app itself owns an initial error state. The worker reports `scripts/test_portal_discovery.py` passing one failed authored request, no automatic retry, explicit Retry, details, card launch and random launch against local HTML route fixtures, exactly two authored attempts. These verify portal routes, not game play. Keep independent React/UX ownership and first-load error reporting in regression coverage.

2. **P1, overview reconciled; CI remains: keep inventory/release guidance current and automate cheap checks.** `README.md` and `docs/ARCHITECTURE.md` still describe 115 entries, while the maintenance introduction says 134 and later calls 125 current; baseline is 135. Root README also says no PWA manifest although `index.html` links `manifest.webmanifest`. Current entry points now link the generated maintenance inventory instead of duplicating current counts, and the October handover is labeled historical. Preserve dated receipts and keep the generated inventory synchronized after source commits. Add a minimal CI job for catalog schema/unique IDs/Git paths, syntax and relevant regression checks; keep the full browser gate as a separate unchanged release gate. `python3 -B scripts/check_maintenance_docs.py` exited 1 during concurrent work with `Commit inspected source changes before validating its inventory.` This is an integration prerequisite, not proof the inventory checker is broken; rerun after game/catalog commits settle.

3. **P2: fill discovery metadata from verified controls.** 124/135 entries lack each of `players` and `howto`. Build a small backlog ordered by usage/featured games; verify actual input and solo/local-multiplayer behavior before filling fields. Do not infer capabilities from titles or tags. Validate keyboard/touch instructions on the corresponding game start path as well as its detail card. The count measures missing optional data, not 124 proven inaccessible games.

4. **P2: establish loading/cache budgets before changing payloads.** `netlify.toml` provides explicit caching only for `/uv/sw.js`; effective production defaults were not measured. Add tested long-lived caching only for truly immutable versioned assets, and revalidation for catalog/HTML/mutable authored scripts. The root manifest does not install an offline cache. Largest project totals are Ovo **616,416,444 bytes**, SubwaySurfersHacked **144,518,581**, and SubwaySurfers **144,515,568**. Both Subway trees contain repeated 27,979,216-byte SanFrancisco data files, and their active entry references `Build/SanFrancisco/SanFrancisco.json`. Trace manifests, constructed URLs, worker requests and byte identities before deduplication; totals do not establish downloaded bytes or unused files. Record cold/warm launch transfer and time-to-play on a constrained profile, and preserve loading/error feedback.

5. **P2: tighten modal lifecycle and verify actual assistive use.** `assets/portal-ux.js` closes the custom detail dialog and restores focus, but `trapDetailFocus()` removes its key handler on a later key event for non-Escape closure. The background is not made inert. Use a single explicitly disposed handler (or a tested native dialog), then verify repeated open/Close/backdrop cycles, keyboard containment, focus return, screen-reader background access, narrow screens and both themes. Existing `aria-modal` plus Tab handling alone is not a screen-reader acceptance result. Retain the repository's 44px control standard; WCAG 2.2 AA target-size minimum is 24 CSS pixels with exceptions, so do not conflate the two.

6. **P3: recover portal source and reduce layered ownership.** The compiled React portal has no authored source project here, while `assets/portal-ux.js` reconciles rendered DOM through a subtree/class observer and `index.html` retains substantial historical CSS. Recover a reproducible source build before a broad redesign. In the interim, keep bounded changes in authored files and measure observer callbacks/idle work; do not hand-edit the compiled bundle. Source recovery should eventually unify catalog loading and UI state, removing the split-reader coordination now handled by explicit retry.

## Improvements delivered in this run

This review delivers the sparse-safe inventory, prioritized evidence, primary-source references and corrected live overviews in `README.md`, `docs/ARCHITECTURE.md` and `docs/maintenance/README.md`. Historical audit counts remain historical; the manifest and Foldwild registration descriptions now match source.

Committed substantive work inspected through commit stats: `161c3dae` adds four everyday vehicles in the shared fleet/model definitions; `38a5fe38` adds player/crew training branches; `d12196bf` adds mode-specific safehouse improvements; `b5f719d4` adds domestic furnishing to source-shaped homes. Each includes targeted regression scripts. These are distinct game-system changes, not a wholesale game redesign, and their browser/device acceptance remains the integration owner's responsibility. No whole-fleet pass or hardware acceptance is claimed here.


### Final integration review

Rechecked committed tree `8b30b729`: **16,242 files / 2,323,080,687 logical bytes**; catalog still **135 entries / 141 game projects**, metadata still 101 tags and 11 each players/howto. Later uncommitted training integration is outside this snapshot. No new catalog records, proxy changes or runtime third-party dependencies appear in the reviewed feature commits.

Portal commit `340cf7fc` also supplies safe two-line summaries on every card, 16:9 desktop art, natural title height, and compact illustrated rows below 480px, retaining local assets. The `/` search shortcut is discoverable on fine-pointer devices and exposed with `aria-keyshortcuts`. Its worker reports discovery/layout/44px-action checks at 1440/390/320 in both themes and a passing full `scripts/test_portal_refurbishment.py` across 135 catalog entries. The latter now waits for both restored query and count at a Sports/filter intersection; it retains an exact Soccer Random assertion. This addresses a reproduced asynchronous harness race rather than weakening the expected result. Captures are temporary worker evidence, not this reviewer's subjective screenshot approval or screen-reader acceptance.

Capital commit `8b30b729` exposes training tracks and home improvements in the existing phone UI. Follow-up `0521f32e` caches effects and separates crew completion credits; `8b682082` reconciles fleet/garage regressions. Independent reruns during this final review passed:

- `node scripts/test_capital_domestic_view.mjs`: 12 actual lazy rooms, four domestic styles, reachable stations, one merged batch, reuse/disposal; **1,420–2,120 triangles**, **134,184–198,224 retained geometry bytes**. These are test geometry metrics, not GPU memory or FPS.
- `node scripts/test_capital_skill_trees.mjs`: branches, effect isolation, bounded saves, receipt deduplication, actual walking distance and medical recovery effects.
- `node scripts/test_capital_city_training_ui.mjs`: track keyboard navigation, prerequisites/actions, focus restoration, contextual disabled/free-roam states and improvement actions.

Remaining gaps are precise: optional source-verified controls metadata; current inventory regeneration after final commits; automated cheap CI; measured production cache headers/cold-warm launch budgets; modal listener/background accessibility; reproducible portal source; real keyboard/touch/screen-reader and constrained-device gameplay acceptance. The domestic renderer batches static shapes and adds no decorative dynamic lights, but no current hardware frame-time budget has been measured. Window-like interior dressing is decorative opaque geometry inset into existing walls, not reconstructed openings or a thermal model. Preserve exterior/collision truth and inspect unusual footprints before expanding it. For training acceptance, show current points, prerequisite, effect and next achievable action together, then test returning players and keyboard-only purchases; passing state tests does not prove this information is understandable in play.

## Primary references researched

These are general design/engineering guidance, not evidence of this site's measured conformance or performance:

- [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/2023/REC-WCAG22-20231005/): keyboard access, focus, timing and target-size requirements. Apply to portal controls and nonessential motion; consider each game's essential interaction separately.
- [W3C WAI: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/): focus visibility and 24px AA target minimum, distinct from the project's stronger 44px target rule.
- [Google web.dev: image performance issues](https://web.dev/learn/images/performance-issues): defer below-fold images, reserve dimensions, avoid lazy-loading the initial important image. Existing portal thumbnails already use lazy loading; measure before applying another blanket change.
- [Google web.dev: HTTP cache](https://web.dev/articles/http-cache): versioned URLs support long-lived caching; mutable URLs require freshness discipline. This supports a narrow cache policy, not immutable caching of every game file.
- [Chrome: Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api): lifecycle transitions and suspension guidance for future per-engine pause/audio checks. This review did not establish fleet-wide background-pause defects.
- [Three.js: Optimize Lots of Objects](https://threejs.org/manual/pages/optimize-lots-of-objects.html): each mesh introduces draw overhead; geometry merging can reduce it. This directly supports the domestic renderer's existing merged static batch, while still requiring measured frame times before larger room detail budgets.
- [Microsoft Xbox Accessibility Guideline 109: Objective clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109): players should be able to review clear tasks/objectives and ongoing progress without memorizing them. Apply this to discoverable training prerequisites, earned points and next steps. It is general guidance, not certification of this UI or a requirement to simplify every mechanic.
- [Australian Government YourHome: Glazing](https://www.yourhome.gov.au/passive-design/glazing) and [Orientation](https://www.yourhome.gov.au/passive-design/orientation): window size, orientation, climate and shading interact. Use these as contextual reference for Australian domestic visual variety; they do not establish that fictional interior dressing represents a particular real home's openings, energy rating or construction compliance.


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
