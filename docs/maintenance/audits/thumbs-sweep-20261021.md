# Thumbnail recovery sweep, 2026-10-21

## Scope and root cause

Branch `feat/thumbs`, starting at `ae924bf`. No games added, registered, changed
or published. No push or full-catalog gameplay smoke gate was attempted.

The earlier capture loop served a sparse-excluded `Games/` tree. It ignored
`page.goto()`'s response and took screenshots of the loopback HTTP error page.
Independent Git-blob hashing of all 80 JPGs added by `ae924bf` returned:

```text
INVALID COMMIT ADDED JPGS: 80
INVALID COMMIT MD5 COUNTS: {'38758b3a66a1d38a20778216445e54b6': 80}
```

The invalid files had already been deleted at initial inspection, leaving 84
hand-picked JPGs. The historical commit remains intact. Materialized directories
do not guarantee complete assets: initial inspection found 114 game directories
but 16 missing catalog entry files. All 125 catalog URLs are tracked in Git;
local absence is not a deployed-site 404 claim. No checkout/sparse operations
were performed and `Games/` was not removed.

## Attribution and inspected-source limits

While this session was blocked on capacity, an intervening process supplied 56
480x270 JPGs, bringing the directory to 140. There was no capture state file and
no capture process remaining when work resumed. This session did **not** capture
those files and cannot retrospectively certify their navigation responses or
that the new guards ran on them. Fill-only behavior preserved them. A contact
sheet was reviewed: they show game boards, menus, help screens and loaders,
not the identical Python error page. Some are loader/shell frames (notably the
Fireboy Flash and Merge Cats entries), not proof of ready gameplay. These are
usable fallback images with that visual-quality limitation, not full gameplay
acceptance. The operator's reply to tooling ticket
`pi-1771138-1792579470613-2af12d7e` subsequently attributed the 55-file re-encode
pass to agent `95d197d`, citing its 21:54 log and filesystem birthtime evidence.
That establishes the reported encode/QA provenance, not retrospective HTTP
response evidence for the original captures; the qualification above remains.

The final-size grayscale scan rejected intervening `asteroids.jpg` (mean 17.72,
sd 7.46). Its consumer is the title-slug fallback for catalog Asteroids; removing
it intentionally selects SVG. A fresh guarded attempt also failed (sd 7.68).
Thus 55 intervening replacements remain. These 55 were explicitly encoded in
place to 480x270 JPEG quality 70 during this session (51 byte streams changed),
then rescanned and live-tested again. The other 25 invalid-batch paths are
removed: 15 genuine gaps and 10 alias-redundant paths. The 84 originals were
not changed during this recovery. The earlier commit had resized/recompressed
originals too; that accepted side effect was not undone.

## Guard design

`scripts/capture_game_thumbs.py` now:

- Resolves and checks the local catalog file before navigation. Missing files
  are recorded failures without screenshots. Remote/escaping paths are rejected.
- Requires a non-null `page.goto()` Response with status **exactly 200**.
- Compares MD5 against every existing JPG and rejects grayscale standard deviation
  below 8, both before and after resize. Rejected bytes never reach disk, rather
  than writing an invalid image and subsequently removing it.
- Resizes only new accepted captures to 480x270, JPEG quality 70, in memory.
- Honors portal `THUMBS` aliases; existing art wins. Actual output existence,
  not a stale `done` record, decides completion. Recorded failures remain skipped
  on resume; removing the specific failure entry permits a deliberate retry.
- Pins system Chromium, requires RAM `TMPDIR`, runs one browser sequentially,
  closes pages/browser/server and checks the mandatory 2 GiB storage floor.

Fresh execution, with browser scratch in RAM, reached:

```text
done: 0 ok, 14 fail
FAIL Asteroids: ValueError: blank JPG: mean=17.69, sd=7.68 < 8
done: 0 ok, 15 fail
missing thumbs to attempt: 0; retained failures: 15
```

Zero successful **fresh** captures is intentional: existing intervening images
were preserved, while all remaining candidates failed honestly. Duck Hunt and
Balatro returned 200 for their entry pages but were blank at capture time.
Balatro also requested missing local `_emulatorjs/data/loader.js` (404).
No dependency install or game-source repair was attempted.

The pending portal auto-slug/image-error fallback was reviewed and corrected:
a failed image URL is marked on its icon so metadata reconciliation cannot
reinsert it forever. Four explicit aliases were added for the Fireboy hacked
variants and Merge Cats Defender Hacked. Existing base aliases remain; existing
hand-picked Cookie Clicker Hacked and Breakout Hacked art is retained.

## Final asset and catalog checks

Actual command output:

```text
FINAL JPG FILES: 139
FINAL DUPLICATE GROUPS: []
FINAL DUPLICATE GROUPS >50: []
FINAL BLANK SD<8: []
FINAL DIMENSIONS: 139/139 at 480x270
FINAL REPLACEMENTS: 55 bytes 571727
INVALID BATCH PATHS REMOVED: 25
ORIGINALS CHANGED THIS TASK: []
CATALOG: 125 entries; schema/unique integer IDs/tracked URLs PASS
thumbnail guard self-test: PASS (local path, HTTP 200, aliases, duplicate, blank)
node --check assets/portal-ux.js: PASS
```

There are **110 catalog titles with a resolving JPG**, 15 with intentional SVG
fallbacks. The asset count is larger because retained originals include art not
currently mapped to a registered title. No bulk deletion of those originals.

### Exact remaining gaps

| Title | Reason |
| --- | --- |
| Tron Light Cycles | Local entry missing; no screenshot |
| Ultimate Tic-Tac-Toe | Local entry missing; no screenshot |
| Video Poker | Local entry missing; no screenshot |
| Yahtzee | Local entry missing; no screenshot |
| War | Local entry missing; no screenshot |
| Word Search | Local entry missing; no screenshot |
| Word Ladder | Local entry missing; no screenshot |
| Word Scramble | Local entry missing; no screenshot |
| Tower of Hanoi | Local entry missing; no screenshot |
| Tower Defense | Local entry missing; no screenshot |
| Tag Relay | Local entry missing; no screenshot |
| Wings | Local entry missing; no screenshot |
| Duck Hunt | HTTP 200; blank grayscale mean 1.00, sd 0.00 |
| Balatro | HTTP 200; blank grayscale mean 11.00, sd 0.00; missing emulator loader |
| Asteroids | HTTP 200; fresh grayscale mean 17.69, sd 7.68 |

No duplicate-based rejection occurred during this guarded run; none of the
retained files duplicates another. No groups over 50, the historical error-page
signature, remain.

## Live portal and visual review

A bounded Python HTTP server on port 8915 and pinned headless system Chromium
were run sequentially with RAM scratch. All cards were scrolled into view.
Actual output:

```text
cards: 125
images: 110
loaded: 110
broken: 0
svgFallbacks: 15
missingImageRegression: PASS: one failed request, SVG stable after three reconciliations
HTTP server PID: 1849750 (terminated on exit)
```

All 11 hacked cards loaded their mapped JPG. New Fireboy aliases resolve to
`fireboyandwatergirl.jpg`, `fireboywatergirlforesttemple.jpg`, and
`fireboywatergirl4crystaltemple.jpg`; Merge Cats Defender Hacked resolves to
`mergecatsdefender.jpg`. No redundant hacked slug captures were created.

The requested full-page screenshot is the temporary `portal_thumbs_final.png`.
Desktop 1280x900 and mobile 390x844 screenshots in light and dark were reviewed:
readable titles/actions, expected cropped thumbnails, no document overflow.
These screenshots do not establish gameplay readiness or rights clearance.

## Runnable regressions

The capture guard regression is dependency-light (Pillow, no browser):

```sh
python3 -B scripts/capture_game_thumbs.py --self-test
```

For the portal fallback regression, run a temporary server on port 8915, then
execute the following with `TMPDIR=/dev/shm python3 -B`. Terminate the server by
its exact PID afterwards. No browser installation is needed:

```python
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True)
    try:
        page = browser.new_page()
        failures = []
        def fail(route):
            failures.append(route.request.url)
            route.abort()
        page.route('**/assets/thumbs/snake.jpg', fail)
        page.goto('http://127.0.0.1:8915/index.html', wait_until='networkidle')
        card = page.locator('.game-card[data-title="Snake"]')
        card.scroll_into_view_if_needed()
        page.wait_for_timeout(1500)
        for _ in range(3):
            page.evaluate("document.body.appendChild(document.createElement('span'))")
            page.wait_for_timeout(200)
        assert len(failures) == 1
        assert card.locator('.game-card__icon img').count() == 0
        assert card.locator('.game-card__icon svg').count() == 1
        print('stable missing-thumbnail fallback: PASS')
    finally:
        browser.close()
```

## Storage, commits and maintenance gate

The first inspection returned 1,721 MiB free, below the mandatory 2 GiB floor;
work stopped and capacity ticket `pi-1771138-1792563167366-8667409f` was filed.
Actual resumed baseline was **2,632,294,400 bytes** free. Browser scratch,
logs and contact sheets used RAM; the requested final screenshot is temporary.
No browser downloads, build tools, history rewrites, garbage collection or push.

Commits were initially blocked by an empty, stale worktree Git index lock dating
from 17:01 AEDT. No Git process or open lock holder was found. It lived outside
this worktree and was not removed by this agent. The operator subsequently
removed it and answered tooling tickets `pi-1771138-1792579470613-2af12d7e`
and `pi-1771138-1792579896629-60e20149`. On resume the lock was absent and root
free space was **2,608,500,736 bytes**. No replacement lock was deleted.

Both ordinary restore and `GIT_OPTIONAL_LOCKS=0` restore failed on the same lock.
The user-authorized Superhot restoration was therefore performed by streaming
its HEAD Git blob back to the existing file. The resulting file, HEAD and origin
all hash to `bd905ca6c797a3597cf58e269c4f7ed7812f21fe`; Git status is clean for
that path, and no game change will be staged. This restoration accounts for
about 20 MB of the root storage increase.

The first maintenance check failed on that unrelated dirty game path. After
restoration, the unchanged checker returned:

```text
PASS: 130 game documents cover 125 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Before lock resolution, observed root free space was **2,609,737,728 bytes**, a decrease of
**22,556,672 bytes** from the resumed baseline, predominantly the explicitly
requested restoration of the existing Superhot blob plus the final screenshot.
This is measured filesystem-wide accounting, not exclusive per-process usage.
After lock resolution, the requested scoped commits landed:

- `ad7bf88` - `chore: portal thumbnail auto-fallback with icon downgrade`
- `3a8f7a5` - `feat: recapture portal thumbnails with 404/dupe guards`

The separate documentation milestone is `docs: record honest thumbnail sweep results`;
its SHA and final clean-status/storage receipt are supplied in the final handoff.
Only explicit intended paths were staged. Superhot matches HEAD/origin and is
excluded from both source commits. Capture guard self-test, resume (zero pending,
15 retained failures), all-file hash/blank/dimension scans, catalog validation,
syntax and maintenance checks were rerun successfully. The final browser pass
again returned 125 cards, 110 loaded JPGs, 15 SVG fallbacks, zero broken images,
all 11 hacked images loaded and stable missing-image fallback regression.
No new games, full game-smoke acceptance, publication or push.
