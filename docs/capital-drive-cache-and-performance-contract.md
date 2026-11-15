# Capital Drive: download storage, character resumes and CPU work

15 November 2026, continuation after PR23. This changes existing game245 only.
All runtime files remain local. [Story contract](capital-drive-story-and-streaming-contract.md)
and [maintenance manual](maintenance/games/245-capital-drive.md) describe the
retained state owners; [verification](verification/capital-drive-cache-cpu-2026-11-15.md)
separates native input, component/source tests and measured cloud profiles.
The later [indoor pursuit continuation](capital-drive-indoor-pursuit-contract.md)
adds direct stored-map reads, Milo's driving start and work while wanted.

## Repeat visits

`cache-client.js` registers `service-worker.js` after the real game has booted.
First boot is not blocked on offline storage. A status below the loading line
reports saving, successful storage, a waiting update or a genuine failure.
Cookies and career localStorage are not used for game downloads.

The worker installs the generated `cache-manifest.js`: the exact reachable local
module/data/shell/style/font/favicon/attribution closure. The current manifest
contains97files/15,648,142bytes. It includes six runtime map JSON files totaling
12,013,726bytes plus one credits-linked validation JSON. It does not blindly
copy duplicate exports from the entire data directory. The large source map is
7,791,998bytes; the north sidecar is3,065,485bytes.

Every entry carries its SHA256 and byte length. Installation uses at most four
concurrent files, verifies new responses and fails the new revision atomically
if a file is missing, stale or corrupt. Existing HTTP-cached responses can be
reused; mismatched bytes get one reload fetch. Content-addressed entries from
this game's older response caches can be reused across revisions, so changing a
small module does not require downloading the unchanged maps again.

The cache name includes this game's scope path and a content version derived
from closure bytes plus worker source. GET requests matching that exact allowlist
use local CacheStorage first. Directory/index navigations share the cached shell;
other requests, methods and origins are not intercepted. Scope stays within the
game directory, including under the GitHub Pages repository prefix. No root
service-worker/header/proxy change is needed. Shared vehicle/font files requested
by the controlled game can be cached without controlling other games.

`game-data.js` additionally asks the active controlling worker for its own scoped
cache and exact six map hash keys. Warm boot reads those Responses directly from
CacheStorage, avoiding page map-fetch requests as well as origin downloads.
Descriptor and reads share a750ms limit. Missing/denied entries, an old worker
or no controller fall back to all six ordinary local fetches. Cold boot still
loads maps normally. The worker descriptor never grants arbitrary cache reads
or mixes an active revision with a newer waiting one.

Updates install in the background. They wait for existing game tabs to close;
there is no forced activation or mid-mission reload. Once active, a revision
cleans only this game's older scope-prefixed caches. It never clears career
storage or another application's caches. Open all game tabs again after closing
them to use a waiting update. Browsers can evict stored data under disk pressure;
private browsing can remove it when the session ends.

Storage denial, unavailable service workers and insecure contexts leave normal
online loading available. Cache misses can fall back to the network; only matching
verified responses repair the stored entry. Thus atomic installation protects a
complete revision, but arbitrary later storage eviction is not a promise that
all old code can be reconstructed from a newer server. The offline guarantee is
bounded to a successfully installed, retained cache. Download reuse does not
persist GPU objects or eliminate JavaScript/JSON parsing, routing/index creation
or local scene setup on a new document.

## Independent protagonists

`protagonist-state.js` validates an optional `protagonists` field in the existing
career record. Its version1 contains separate Kit/Rowan/Milo checkpoints, while
campaign progress remains strict v2. Old careers without the optional field
still load. The existing single career writer commits it with cash and campaign
progress; there is no independent save writer or timer.

Each checkpoint contains foot/driving mode, actor pose, parked car pose/model/
paint/condition/stolen flag, character health, selected weapon and all four ammo
pools. Copies are detached and frozen; bounds, fleet IDs, weapon capacities,
field shapes and numbers are checked. Money, ownership/unlocks and completed
missions remain shared career progress. Dormant protagonists are not continuously
simulated, and their old transient room/NPC/police state is not serialized.

Between missions, changing hero captures the previous person and restores the
selected person's own state. A first visit uses that hero's checked opening
approach. Cars and actors resume stopped. If saved placement is obstructed,
Gameplay tries bounded nearby clear positions (car12m, actor6m), otherwise fails
and restores the previous state. Ammo is copied exactly without first-equip or
starter-ammo duplication. The car view refresh does not move it a second time.
An interior capture uses that room's actual exterior return pose, resuming outside
its door instead of recreating arbitrary old room/furniture coordinates.

Active missions, wanted/recovery, passenger/rental rides, work/activities and
vehicle challenges block switching with a visible reason. Same-hero selection is
a no-op. Completed progress is preserved through switch/reload. Position capture
while a transient mission or recovery is active is deliberately skipped, retaining
the last resumable checkpoint. This supersedes the earlier shared-position
mid-session switching behavior; it is character switching, not map teleporting.

## Pink-earmuff encounter

At Lambzhou1919, E beside Dot opens dialogue. **Fight** starts a real bowl windup,
noodle throw and fist retaliation. **F** punches; movement dodges. Use fists for
a fistfight; guns still frighten contacts. The controller disables this choice
during protected work. Apology and Back off remain available in ordinary dialogue.
The ordinary Fight result is `confrontation`; only the separately bound Rowan
mission can emit `noodle-fight` credit after its actual throw and melee.

Existing furniture and people collision remain. The narrow booth itself is not
a clear standing pose, so no teleport through the table or banquette is added.
Actual generated-room sweeps verify a reachable aisle within the real melee/
retaliation ranges, with player damage to the guest and live retaliation after
stun. Anger lasts20seconds for ordinary Fight; campaign timings remain unchanged.
Pause, sight, reach, health, interruption, guns and room disposal still govern it.

## Measured CPU corrections

The profiler records actual Chrome DevTools CPU samples, process CPU counters,
RAF intervals, rendered-frame deltas, read-only snapshots and source hashes.
Baseline is the deployed PR23 commit `ffb5df6f`. Its largest attributable script
hot path was repeated polygon feasibility checking for traffic and buses.
`SpatialGrid.query` previously returned every object in intersected whole cells.
It now rejects exact inserted AABBs outside the inclusive query envelope before
expensive polygon work. Distant vehicle pairs also get a conservative enclosing
circle rejection; nearby SAT and swept contact formulas remain unchanged.
Two parked query radii now explicitly cover their existing narrow-phase reach.

A differential regression compares old/new query and physical decisions,2500
rotated body pairs,2400actual-map probes and a600-frame40-car replay. It requires
identical positions/state, rather than gaining speed by disabling contacts,
removing cars/buildings or allowing tunnelling. Wall-clock Node timings are
observations, never flaky pass thresholds.

`render-gate.js` also stops repeated rendering of an unchanged paused/hidden view.
Nearby queued geometry can finish, dirty resize/model changes get a fresh frame,
and active play, live Yoober tracking and caption camera scenes keep rendering.
The single world clock/RAF owner is unchanged. Read-only diagnostics include an
actual rendered-frame counter; RAF callbacks alone are not visual frame rate.

Rendering choices are **Performance** (640×360 maximum,20FPS target), **Low**
(960×540,30target) and **Standard** (1440×900,60target). Aspect ratio is retained.
Detected software renderers default to Performance; hardware renderers default
Low. An explicit saved choice overrides detection through a separate small
`capital-drive-rendering-v1` preference, without changing the career. All modes
retain source geometry/colliders; Performance trades image resolution/frame cap
for lower graphics work. Targets are limits, not hardware performance guarantees.

## Reproduce

```sh
python3 -B scripts/build_capital_cache.py --write
python3 -B scripts/build_capital_cache.py --check
python3 -B scripts/test_capital_cache_manifest.py
node scripts/test_capital_cache.mjs
node scripts/test_capital_game_data.mjs
node scripts/test_capital_protagonist_state.mjs
node scripts/test_capital_character_switching.mjs
node scripts/test_capital_collision_performance.mjs
node scripts/test_capital_render_gate.mjs
python3 -B scripts/test_capital_cache_browser.py --scenario native --output <fresh-external-cache-directory>
python3 -B scripts/test_capital_cache_browser.py --scenario heroes --output <fresh-external-heroes-directory>
python3 -B scripts/profile_capital_drive.py --root <exact-source-export> --mode 3d --quality low --seconds 8 --output <fresh-external-profile-directory>
python3 -B scripts/check_capital_drive.py
```

Regenerate the manifest after the final runtime edits, then check it before
committing. Its content-derived version must change with dependencies or worker
logic. The profiler's2D control is explicitly labelled and never described as3D
acceptance. Cloud SwiftShader/process CPU is not Intel N100 hardware evidence.
