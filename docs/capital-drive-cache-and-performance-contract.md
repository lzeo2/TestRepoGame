# Capital Drive: download storage, character resumes and CPU work

15 November 2026, continuation after PR23. This changes existing game245 only.
The16November city continuation refreshes the closure figures below, including the sourced airport sidecar. All runtime files remain local. [Story contract](capital-drive-story-and-streaming-contract.md)
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
contains128files/17,276,970bytes. It includes seven runtime map JSON files totaling
13,297,483bytes plus one credits-linked validation JSON. It does not blindly
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
cache and exact seven map hash keys. Warm boot reads those Responses directly from
CacheStorage, avoiding page map-fetch requests as well as origin downloads.
Descriptor and reads share a750ms limit. Missing/denied entries, an old worker
or no controller fall back to all seven ordinary local fetches. Cold boot still
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

## Sustained bridge collision and bounded retained state, 16 November 2026

Lake-edge water tests used to walk the whole 2,491-vertex outer shoreline for
each physical contact. Bridge profiles attributed most sampled JavaScript work
there, despite lower rendered geometry than at Telopea. `water-contact.js` now
prepares immutable water-ring segment trees once. Z-filtered parity and
branch-and-bound nearest-edge lookup retain the existing projection, winding,
source-order tie, normal and depth results. Bridge openings are checked first;
building/barrier contacts remain live and unchanged. Do not replace this with
per-position result caching or simplify the lake collision shape for speed.

The deterministic water regression requires exact old/new contacts and trajectories
over actual shoreline/island/bridge cases and a repeated 40-car bridge replay.
Node wall time is observational. The controller also prunes seated-occupant pose
entries after descriptors disappear, including expired patrol IDs; shared model
resources retain their separate lifetime. This small retention correction is not
the demonstrated primary bridge bottleneck.

Use `scripts/profile_capital_sustained.py` for paired exact exports. The short
`--scenario bridge-windows` compares first Telopea, Commonwealth, Kings and return
Telopea windows. The default sustained scenario uses a wall-time floor of at least
six minutes and separately records actual supplied simulation-clock advancement.
Official Free-roam map clicks are explicit streaming stress fixtures, not natural
driving. Queue drain, map/teleport construction profiles and paused forced-GC
memory probes are separated from active windows. Keep source/load hashes, raw
profiles, actual sampling duration and render counts. Requested 8-second timers
can overrun during stalls. Weak GL ownership counters count logical live objects,
not GPU bytes; CPU/process/heap numbers on SwiftShader do not certify an N100.

```sh
node scripts/test_capital_water_contact.mjs
node scripts/test_capital_collision_cache.mjs
python3 -B scripts/profile_capital_sustained.py --root ../capital-drive-evidence/baseline-export --output ../capital-drive-evidence/bridge-baseline --scenario bridge-windows --mode streaming-stress --quality low
python3 -B scripts/profile_capital_sustained.py --root ../capital-drive-evidence/candidate-export --output ../capital-drive-evidence/bridge-candidate --scenario bridge-windows --mode streaming-stress --quality low
python3 -B scripts/profile_capital_sustained.py --root ../capital-drive-evidence/candidate-export --output ../capital-drive-evidence/sustained-candidate --seconds 390 --mode streaming-stress --quality low
```

Run those browser commands sequentially on the shared CPU lease. Baseline and
candidate exports must include the exact game, shared cars/fonts and root favicon.
Use fresh external output directories. A positive `--minimum-active-seconds`
also requires that much supplied simulation time; wall time alone never proves
five minutes of unpaused simulation.

## Routing around the modelled Centre obstruction

Campaign-route auditing also found a separate Canberra Centre modelling mismatch:
its retained solid footprint overlaps the real covered Bunda Street. A bounded
source-pinned graph guard avoids the intersecting Bunda travel edges and their
inside-footprint approaches, retaining all source road segments, visible geometry
and physical collision. GPS and the shared traffic/service route graph use the
detour. This is avoidance of the game's blocked undercroft, not a claim that the
real street is closed or that its final architectural model has been corrected.
Keep exact segment/boundary/courtyard and source-identity negative controls; do
not remove a whole building or permit vehicles through solid walls to pass tests.

## Medical location and automatic campaign retries

Medical recovery captures the actual exterior player/seat position before room
or vehicle callbacks clear it. After the existing delayed recovery it checks the
nearest mapped public road, then collision-checked fallback roads. It no longer
requests Woden. Costs, arrest placement and completed progress keep their owners.
This is local recovery placement, not a claim that real hospitals are mapped.

The campaign owner retains a transient failed normal attempt on timeout or
recovery. The controller automatically restarts it at stage zero only when alive,
unpaused and recovered in Campaign. It resets the deadline, action baselines,
activities, recon and crew, without repeating its cutscene, moving the player,
rolling back the world, restoring timeout health/ammo or granting completed
progress. A recovery finishes before retry starts. Current controlled shared-crew
identity survives. Cancel, a successful manual start, hero selection or a mode
change clears pending retries; previews never queue normal retries. Pending
attempts are not serialized. Keep stale-receipt, repeated-failure and once-only
reward checks. See the [all-mission audit](verification/capital-drive-campaign-playability-2026-11-16.md)
for what normal objective-chain tests establish and what still needs native play.

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


## Body-query flamegraph continuation, 17 November 2026

The [fresh receipt](verification/capital-drive-flame-escape-2026-11-17.md) compares
an exact5e1b0544 export with a simulation-only overlay. Static car feasibility
now queries one conservative body envelope, then retains every original circle
sample and its inclusive AABB filter. Geometry and bridge callbacks stay live.
The nearby-car SAT path also keeps its original four separating axes as scalar
values, avoiding temporary vectors and callbacks. Differential state checks are
authoritative; lower query counts alone are not
speed evidence. The full release also changes yard geometry, so it is measured
separately rather than called an identical physics workload.

`scripts/profile_capital_collision.mjs` records deterministic source-hashed
physics, per-step distributions, state checksums and separate sampled allocations.
`scripts/analyse_capital_profile.py` turns Chrome/Node CPU samples into a local,
searchable flamegraph and bottom-up table. Allocation sampling follows timing
and checksum capture; its cumulative estimates are neither retained RAM nor GPU
bytes. See the receipt and development skill for exact commands and limitations.
