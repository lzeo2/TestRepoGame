# Capital Drive development workflow

## Establish the working boundary

1. Read the files listed in SKILL.md, then inspect current Git status, branch,
   source and callers. Do not reset another worker's edits. Use `rg`/`rg --files`
   for authored code and `git ls-files` or `git show HEAD:...` for sparse files.
2. Run `df -h /` before downloads or checkout growth. Below 2 GiB free, stop growth
   and report. Record `git sparse-checkout list` when enabled. Expand only the
   needed game/shared assets with the repository's existing sparse convention;
   preserve the original selection and restore it after verification. Do not
   perform a full Games checkout.
3. This is an existing owner-authorized original game, catalog 245. Read credits,
   `docs/capital-drive-sources.md`, street-reference notes and data licenses before
   changing source-derived content. Do not add runtime remote requests or assets.
4. State concrete owned paths and the behavior being changed. For authorized
   parallel work, use disjoint modules and one exclusive index window per commit.
   Keep each task at most 20 minutes. Never use broad staging or push implicitly.

## Static setup and module ownership

Serve the repository root, not the game folder, because imports use shared local
assets. No npm setup, build step or node_modules is needed. Node pure suites load
local browser modules and local Three.js; they do not require a GPU. Optional
Python Playwright and geodata packages belong in an external environment. Do not
install them into this repository or vendor unrelated tooling.

| Owner | Source/API boundary |
| --- | --- |
| Controller | `script.js`, `index.html`, `style.css`: input, camera, HUD/dialogs, mode guards, render loop, career/discovery storage and target display |
| Simulation | `simulation.js`: directed left-lane graph, driving/traffic, claims, actor collision and building-obstructed sight |
| Gameplay | `gameplay.js`: injected simulation/pedestrians callbacks, foot movement/combat, police pursuit/search, vehicle health, respawn serial |
| Progression | `progression.js`: `createProgression(map,saved)`, jobs, owned cars, costs, validated serialize/load, drained events; no DOM/storage |
| Pedestrians | `pedestrians.js`: bounded sidewalk population, alert/strike/reactions, consumed offence events |
| Rendering | `actor-view.js`, `landmarks-view.js`, `world-view.js`, `neighbourhood.js`: pooled local geometry, grounding, culling/disposal; no physics/RAF |
| Geographic/navigation data | `data/canberra.json`, `navigation.js`, `map-projection.js`, `landmarks.js`, `address-search.js`, `data/addresses.json`: consistent projection, directed routes and offline lookup |

Coordinates are metres: x east, z south. Yaw forward is
`(-sin(yaw),-cos(yaw))`. Root supplies dt and context. `dt=0` freezes dynamics;
modules never add their own animation loops. Keep detached read-only QA snapshots
and no production gameplay setters. A new adapter must dispose pooled resources
idempotently and must not mutate geographic source data.

Gameplay context for progression is `{pose,onFoot,vehicle,wanted,vehicleHealth,
respawnSerial}`. Jobs require real arrival, ordered checkpoints, the required
stolen vehicle or a real wanted/clear interval, as appropriate. Clicks cannot
award cash. Failure, cancellation and respawn cannot mark a job complete.
Completed IDs survive penalties. Garage operations validate location, ownership
and costs; root applies successful repair results and local vehicle retrieval.

## Mode, storage and travel rules

Street Life guards both visible UI and action handlers against map teleport and
Start nearby. It uses walking/driving to reach jobs and garages. Free roam keeps
map travel and offline street/address/landmark search but cannot earn career cash
or completion. Mode switches reset world/transient state. Never route sandbox
mission or police callbacks into the career economy.

Keep the existing discovered-place save independent from the separate career
key chosen by the controller. Before modifying save code, trace validation,
migration, read errors, write errors and the overwrite-disable flag. Unknown
versions, corrupt shapes and denied storage must visibly report a problem and
leave the original source unwritten. No origin-wide clear/reset. `serialize()`
returns career data, not active jobs or player teleport positions. Test reload,
unknown versions, malformed owned IDs, duplicate/completion dependencies and
storage denied behavior. Use isolated browser contexts/fixtures for corrupt-save
negative cases; never erase a user's live progress to make a test pass.

## Source and landmark changes

Read `docs/capital-drive-street-references.md` and `docs/capital-drive-landmark-references.md`
before deciding what has actually been observed. Four March 2026 Street View
samples in the earlier notes establish only those observed exteriors, not whole
city coverage. For a fresh public Street View observation, record the inspected
URL, location, visible imagery date, camera direction and concrete architectural
features. If a panorama fails, report that limitation and use separately cited
public architectural/heritage sources; do not claim it was inspected.

Use reference imagery to inform original geometry, never bundle screenshots,
Google textures, proprietary meshes or copied game assets. Record rights/source
URLs and dates for reusable geographic data. Preserve OSM ODbL, ACT CC-BY 4.0 and
Microsoft CDLA notices and source qualifications. Distinguish observed dimensions
from approximate game geometry. Job/garage markers are fictional locations beside
roads and cannot impersonate real businesses.

Project real anchors using origin 149.137 E, -35.318 S:
`x=(lon-149.137)*111320*cos(-35.318*pi/180)` and
`z=-(lat+35.318)*111320`. Add landmark metadata in `landmarks.js`, bounded geometry
in `landmarks-view.js`, and reference notes. Suppress only individually inspected
source footprint IDs through `replacedBuildingIds(map)`; proximity is not evidence
that every nearby building should disappear. Parliament House prioritizes its
northeast land axis, grass roof/rising wings, curved pale facade, forecourt and
81 m mast. Check terrain grounding and visibility from street approaches, not only
an overhead screenshot. Keep skyline silhouettes visible at their intended LOD.

## Rebuild source-derived files deliberately

Builders are separate manual operations, never part of the check runner. Inspect
their current code and arguments first. Keep an external raw cache and record its
hashes/source dates. The map builder writes tracked `data/canberra.json`; run it
only within an explicitly assigned data change and review the diff. Do not fetch
new data merely to repair UI or gameplay.

```sh
python3 -B scripts/build_capital_drive_map.py --help
python3 -B scripts/build_capital_drive_addresses.py --help
# Choose an existing external source cache; do not put raw objects in Git.
python3 -B scripts/build_capital_drive_map.py --cache "$CAPITAL_SOURCE_CACHE"
python3 -B scripts/build_capital_drive_addresses.py --cache "$CAPITAL_SOURCE_CACHE" --date 2026-11-13
```

Set `CAPITAL_SOURCE_CACHE` to a directory outside the repository. A first import
may use map-builder `--fetch`; optional `--fetch-details` imports Microsoft
outlines and ACT contour data and requires its external scientific/geodata
packages. Both switches run the build afterwards. Review source availability,
licenses, disk cost and output before using them. Reusing the same raw cache is
more reproducible than refetching a changing public endpoint. The address builder
uses explicit tagged OSM nodes/ways, records source hashes and omits unsupported
relations; approximate centroids are not entrances. Do not invent address numbers
or promise complete coverage. Test offline query normalization, missing addresses,
street/landmark results and travel restrictions using the address suite.

Existing terrain is a 513x513 interpolation of ACT 2020 two-metre AHD contours,
roughly 12 m cells, not the unavailable native one-metre DEM. Retain held-out median,
p95 and maximum residuals and provenance. Never silently fill unknown terrain or
replace finite elevations with zeros. Changes to `geodata-validation.json` need
fresh source evidence; never edit expectations just to admit an accidental rebuild.

## Performance and pure verification

Target remains N100/8GB with a capped 60 Hz simulation and 30/60 render options.
Source-level budgets are guards, not hardware FPS acceptance. Keep traffic default 40,
hard limit 56; police at most 4; pooled shots and pedestrians bounded. Current
landmark suite requires four sites, eight merged meshes and fewer than 16000
triangles with near detail 850 m and skyline 4200 m. Extend a budget only with a
measured reason and explicit review. Actor view pools geometry/materials/effects;
read its stats and suite before adding meshes. Avoid per-frame allocations across
the whole city, dynamic textures, new lights per vehicle and high-detail distant
landmarks. Preserve merged chunks, culling, finite buffers and disposal checks.

Run:

```sh
python3 -B scripts/check_capital_drive.py --dry-run
python3 -B scripts/check_capital_drive.py
```

The runner requires these modules: `script.js`, `simulation.js`, `navigation.js`,
`map-projection.js`, `world-view.js`, `neighbourhood.js`, `pedestrians.js`,
`gameplay.js`, `progression.js`, `actor-view.js`, `landmarks.js`,
`landmarks-view.js`, `address-search.js`. It checks their syntax and the syntax of
all suites, then runs the exact `scripts/test_capital_` suites: `drive.mjs`
(with actual map argument), `pedestrians.mjs`, `neighbourhood.mjs`, `world.mjs`,
`geodata.mjs`, `map.mjs`, `gameplay.mjs`, `progression.mjs`, `actors.mjs`,
`landmarks.mjs`, `addresses.mjs`, followed by `git diff --check`.
Missing modules/data/suites fail; nothing silently skips. Each pure command has a
120 second limit; total run is bounded to 900 seconds. Actual exit codes are printed.
The first failure stops the run. Fix or report it; do not weaken a suite.

## Bounded browser evidence and handoff

For browser work, choose a fresh external directory. The runner enforces that it
is outside the repository and requires both flags:

```sh
python3 -B scripts/check_capital_drive.py --browser --output "$CAPITAL_QA_OUTPUT"
```

Set `CAPITAL_QA_OUTPUT` explicitly. The browser suite uses its own temporary
localhost server, shuts it down in `finally`, and writes results/screenshots there.
The runner has a 600 second browser limit, kills the test process group on timeout
on the target Linux environment, and writes `runner-results.json` alongside the
browser's `results.json`. A failed run is still failed if screenshots exist.
The existing browser suite's coverage is whatever current assertions establish;
do not label old 36-check evidence as complete Street Life acceptance.

Use normal keys/mouse for positive proof: walk/sprint, stop/exit/enter a nearby
vehicle, aim/fire/melee and reload, wanted sight/search/escape, nearby delivery,
ordered race, stolen target handoff, garage costs/retrieval, reload persistence,
free-roam address search/map travel, Street Life travel denial, pause and blur.
Inspect actual desktop/mobile frames in both themes, landmark approaches,
keyboard focus and 44 px touch controls. Snapshot reads aid diagnosis but are not
permission to grant money, move actors or complete jobs synthetically. Report
unexercised flows and real N100/native-device holds.

For an optional interactive preview, use one foreground terminal server with an
external time bound, for example `timeout 120s python3 -m http.server 8765 --bind
127.0.0.1`, and open `/Games/Capital%20Drive/`. Stop it when the preview ends; no
persistent dev server. This command assumes an available port and Linux timeout.

Commit explicit owned paths after syntax/pure gates and any required browser
review. Record commit IDs, exact command outcomes, source hashes, artifact paths,
remaining limitations and every dirty path. No automatic full-fleet test or push:
the full registered-catalog release gate runs only for an explicit push/release
order; the historical 123/133 result remains held until superseded by fresh full
fleet evidence. Targeted passes do not erase that hold.

After the inspected source commit, the documentation owner updates
`docs/maintenance/games/245-capital-drive.md`, then deliberately refreshes Git-backed
inventory with `python3 -B scripts/check_maintenance_docs.py --refresh` and verifies
`python3 -B scripts/check_maintenance_docs.py`. Refresh is not a substitute for
reviewed prose and must not be mixed into the runner. Publication remains a
separate operator decision.
