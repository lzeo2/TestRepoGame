# Arcade repository review, 26 November 2026

The highest-value remaining changes are to make game controls easier to find,
put fast catalog checks on pull requests, and measure the largest downloads
on a constrained connection. The arcade has 135 working catalog paths across
several generations of web games and a compiled portal whose original build
project is missing.

## Scope

The inventory at `774fbff3` contained 16,234 tracked files and 2,323,012,857
logical bytes. The game directory contained 141 projects and one shared
emulator runtime. All 135 catalog IDs, titles and entry paths were checked
against the Git tree, including sparse-excluded paths. Six unlisted projects
were left in their existing registration state.

The source review sampled native canvas, Unity and Ruffle entry paths and
inspected the portal shell, authored scripts and styles, shared assets, hosting
and proxy configuration, Capital Drive and the maintenance tooling. This was
an inventory of the whole repository with representative code inspection.
Browser testing covered the portal and the changed game. Historical receipts
identify other games previously tested.

## Changes from the review

- **Games are easier to identify before launch.** All cards show a short
  catalog description with the original local artwork. Mobile cards use the
  available width and keep actions reachable. Desktop search supports the
  slash key. Browser coverage includes 320, 390 and 1440 px widths across the
  two themes. [Desktop preview](arcade-capital-2026-11-26/portal-desktop.webp)
  · [Mobile preview](arcade-capital-2026-11-26/portal-mobile.webp)
- **A failed download has a recovery path.** Previously a transient failure
  fetching `games.json` could leave Info, launch and random selection broken
  for the rest of the page session. Retry now reopens the download. A browser
  regression failed the first request on purpose, verified the page stayed
  idle, retried successfully, opened details and followed both launch paths.
- **Game details keep keyboard focus inside.** Opening Info makes the rest of
  the page inert. Close, Escape, backdrop clicks and browser navigation release
  the handlers immediately and restore focus when the originating card still
  exists. Repeated cycles, pre-existing inert elements and elements added while
  the dialog is open are covered. A screen-reader pass remains worthwhile.
- **More listings explain how to play.** Ovo, Run 3 and Steal a Footballer
  for Your Team now have source-verified controls and player counts. The
  keyboard browser test opened Footballer's Info, read its instructions,
  tabbed to Close and returned focus to Info. The overview and architecture
  pages now link to the generated catalog inventory.
- **Capital Drive spends less bandwidth updating traffic graphics.** A repeatable
  40-car test now marks 3,320 floating-point values for upload per update,
  down from 49,672 with whole buffers. Hidden batches mark zero values.
  This is a renderer data-volume measure. User-visible frame rates still need
  hardware measurements. [Capital Drive release evidence](capital-drive-homes-fleet-training-2026-11-26.md)

## What to change next

| Priority | Finding | Next change and acceptance check |
| --- | --- | --- |
| 1 | 121 of 135 entries still lack a controls field and a player count. Both figures were 124 before this pass. | Start with frequently played games. Verify controls and player mode from the game, then ensure Info displays the same instructions on a phone and with a keyboard. |
| 2 | There is no tracked pull-request workflow for the catalog's existing checks. | Run unique ID/title, tracked entry path, generated sitemap, inventory and affected source checks on changed paths. A deliberately broken entry should fail before merge. |
| 3 | Ovo occupies 616 MB in Git. Each Subway Surfers variant occupies about 145 MB. Matching-size 27,979,216-byte SanFrancisco data files occur more than once. | Measure cold and warm bytes and time to first input for representative engines. Trace actual loader manifests, offline paths and content hashes before deduplication. Revalidate stable HTML/catalog URLs and reserve long cache lifetimes for genuinely immutable assets. |
| 4 | The compiled React bundle and authored portal scripts both manage discovery state. The original React build project is absent. | Recover the project, dependency versions and build command. Rebuild reproducibly before moving catalog and dialog ownership into one implementation. |
| 5 | Geometry budgets and Chromium tests cover only part of the player's experience. | Run an N100 drive crossing bridges and district boundaries for at least five minutes, then repeat through a furnished home. Record frame-time tails, graphics mode, resolution and memory. Do a separate screen-reader pass through search, filters, Info and Play. |

## Research applied

W3C's keyboard, visible focus and target-size guidance informed the details
dialog and the mobile checks. The arcade uses 44 px controls. WCAG's AA minimum
is 24 CSS pixels, subject to exceptions. [WCAG 2.2](https://www.w3.org/TR/2023/REC-WCAG22-20231005/)
· [WAI guide to WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)

Google's browser guidance supports reserving image dimensions, prioritizing
visible content, and choosing cache lifetime from the asset's update policy.
The Page Lifecycle guidance is relevant for later checks on background audio
and simulation. [Image performance](https://web.dev/learn/images/performance-issues)
· [HTTP caching](https://web.dev/articles/http-cache)
· [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)

Three.js documents the cost of many separate meshes and the need to dispose
of geometries. Capital Drive merges domestic fixtures for the active room
and releases them on exit. Xbox's objective-clarity guidance informed the
training panel's visible points, prerequisites and effects.
[Three.js geometry batching](https://threejs.org/manual/pages/optimize-lots-of-objects.html)
· [Three.js resource disposal](https://threejs.org/manual/pages/how-to-dispose-of-objects.html)
· [Xbox Accessibility Guideline 109](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109)

The Australian Government's YourHome guides discuss how climate, shading and
orientation influence windows. They provide context for further local
residential art. Individual home interiors here are authored interpretations
inside mapped footprints. [Glazing](https://www.yourhome.gov.au/passive-design/glazing)
· [Orientation](https://www.yourhome.gov.au/passive-design/orientation)

## Reproducing the inventory

```sh
git ls-tree -rlz HEAD > /tmp/arcade-tree.z
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
python3 -B scripts/test_portal_refurbishment.py
python3 -B scripts/test_portal_discovery.py
```

```python
import json
import subprocess

rows = subprocess.check_output(['git', 'ls-tree', '-rlz', 'HEAD']).split(b'\0')
files = {path.decode(): int(meta.split()[3])
         for row in rows if row for meta, path in [row.split(b'\t', 1)]}
games = json.load(open('games.json'))
assert len({g['id'] for g in games}) == len(games)
assert len({g['title'] for g in games}) == len(games)
assert all(g['url'] in files for g in games)
projects = {p.split('/')[1] for p in files if p.startswith('Games/')}
print(len(files), sum(files.values()), len(games), len(projects - {'_emulatorjs'}))
print({key: sum(key not in game for game in games) for key in ('players', 'howto')})
```
