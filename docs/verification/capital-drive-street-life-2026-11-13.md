# Capital Drive Street Life, 13 November 2026

This continues the existing owner-authorized original game **245**. No game was
added or registered: the catalog remains **133**, with **139** projects and six
unregistered projects. The operator requested the GTA-style continuation, actual
Street View comparisons, previews, reusable development instructions and a
separate teleport-enabled free roam mode. The final instruction was: “merge all
prs when done with everything.” Canberra is to merge before basketball PR #8.

## Result

Street Life now supports walking, sprinting, jumping, entering and stealing cars,
melee and pistol input, witnessed offences, bounded police pursuit/search,
recurring courier/race/theft/getaway jobs, cash, owned cars, garage storage,
repairs and paint. Arrest or defeat respawns at a station/hospital approach,
deducts bounded cash and retains completed jobs. More reactive left-hand traffic
and adult pedestrians share the real-source inner-south map.

Street Life has no map teleport, nearby spawn or road-recovery action. The
handlers also enforce the mode, including programmatic clicks on hidden controls.
Free roam supplies teleporting, all cars/paint and a local address index without
earning career progress. The address index contains **3,446** explicit OSM
records and **2,893** distinct address labels; way locations are centroids,
street-only fallback results are not precise addresses, and unrecorded numbers
are not invented. See [address provenance](../capital-drive-address-sources.md).

Four original landmark models add Parliament House, Old Parliament House,
Manuka Oval and Kingston Powerhouse. These replace twelve specified ACT building
outlines, leaving **12,550** ordinary rendered buildings from **12,572** source
outlines. Landmark geometry totals **5,232 triangles**, eight meshes and two
materials. Landmark clearings exclude trees only from the corresponding
forecourt/playing field; geography, terrain and road coordinates are unchanged.

The [reference record](../capital-drive-landmark-references.md) gives the exact
panoramas actually inspected: Parliament frontage, March 2015; Old Parliament,
March 2026; Manuka Circle, September 2020; and the obstructed Kingston approach,
March 2026. Observed features include the Parliament pavilion, grass roof,
four-leg mast and terracotta forecourt, Old Parliament's stepped pale frontage,
and Manuka's curved floodlight heads. Kingston's tree-obscured panorama was not
treated as a clear facade reference. The contemporary glass artwork replaces
the demolished historical brick chimney. No Google images or textures ship.

The [preview index](../capital-drive-previews/README.md) contains actual browser
captures. They show simplified original architecture, not photogrammetry or
whole-district Street View correspondence. The previously inspected Telopea,
Manuka, Kingston and Red Hill street references remain separately documented.

## Verification

The final browser harness at `e9545312f0380958e2d3a6e02f95a51336b1fb0e`
reported **66 checks passed**, seventeen captures, zero console/page errors,
zero failed local requests and zero third-party runtime requests. Its
[machine receipt](capital-drive-street-browser-2026-11-13.json) has SHA-256
`17b0716f43977d4f313c0187cd100d42ea68209b6056579ddcc98512ac1df114`.

Normal keyboard/mouse/touch input covers driving/drifting, pause, pedestrians,
map zoom/pan, exact safe-ground teleport, all eleven discoveries, real-address
search, garage/paint, persistence and both modes. Street Life starts a parcel
job through its ordinary UI, drives to completion, earns $300 and reloads the
saved result. Normal E input exits/re-enters the owned car and claims the staged
parked wagon; the old vehicle remains visible without duplicating the claimed
parked instance. Foot movement, sprint/jump, aiming/firing, police response and
paused simulation are exercised. Positive gameplay checks use no state setters
or progress grants. Separate explicit fixtures cover hidden-action rejection,
denied storage and the unavailable-WebGL 2D fallback.

A separate final review at `5f87c9c892285cf98a35dbd2bdaa1e51f53533fd`
reported **16 checks passed** with no errors or external requests. Its
[receipt](capital-drive-street-final-ui-2026-11-13.json) covers actual landmark
WebGL geometry from the sampled Parliament approach, pause-to-garage access,
keyboard focus after enabling sound, mobile garage layout, five 44px car
choices and mobile sound. Later changes are price labels, the guarded start
action, the expanded browser check and documentation. The final review's
[renderer snapshot](capital-drive-street-renderer-2026-11-13.json) is a software
frame, not target-hardware performance evidence.

The authored runner `python3 -B scripts/check_capital_drive.py` reported
**37/37 commands PASS**: fourteen module syntax checks, eleven test syntax
checks, eleven focused suites and whitespace validation. The suites exercise
actual-map traffic/60-second simulation, vehicle ownership/claims, swept foot
collision, building line of sight, police search, career economy and repeated
jobs, malformed/denied saves, bounded actor resources, pedestrian attribution,
geodata, world/landmark geometry, address search and map projection. The actual
road graph has **28,323 nodes**, **48,290 directed edges** and forty local cars.
Pedestrians remain eighty adults across 3,153 safe paths and eight instanced
draws. All source and fixtures are local.

Browser review found and fixed three substantive issues: AI drivers could
wrongly attribute pedestrian reports to an innocent player; a curved Parliament
wall hid its central pavilion; and phone users could not reach the garage.
Regressions now check responsible-driver attribution, the entrance opening and
ordinary pause-menu garage access. The stationary no-action browser case
retains zero wanted level. Browser harness waits observe movement/stage state
rather than granting progress or suppressing failures.

Sitemap validation reports **133 Git-backed game URLs plus the portal**.
Maintenance coverage is refreshed after committed source. The reusable
[development skill](../../.agents/skills/capital-drive-development/SKILL.md)
and [workflow](../../.agents/skills/capital-drive-development/references/workflow.md)
describe the state owners, bounded tests, source imports and evidence rules.
The standard-library address importer reproduced its output byte for byte.

## Limits and release decision

No Intel N100 / 8 GB hardware was available. Software WebGL proves functioning
rendering/input, not a measured 30/60 FPS hardware result. Building heights,
ordinary facades and vegetation remain estimates. The unchanged 513 by 513
terrain is interpolated from ACT 2020 two-metre contours, approximately twelve
metre cells, not a native one-metre DEM. Previously disclosed numerical
interpolation residuals remain; they are not independent survey accuracy.
Whole Canberra, detailed interiors and a cinematic campaign are not implemented.

The unchanged full-catalog gate was **not rerun**. The dated
[12 November receipt](capital-drive-2026-11-12.md) records **123/133, exit 1,
release HOLD**, with ten unrelated certificate failures; Capital Drive passed.
That is historical loading evidence, not a fresh full-fleet pass. The operator's
explicit merge-all instruction authorizes proceeding with the reported hold.
No failure filters, TLS policy, protected game, shared car factory, proxy or
unrelated game were changed to obtain a pass.

Temporary QA servers and browsers were shut down. A separate playable ZIP
contains 31 game/dependency files, notices, a favicon and local-server launch
instructions; **2,649,383 bytes**, source revision `e954531`. Its import closure,
per-file SHA-256 comparison and ZIP CRC passed. It is a downloadable preview,
not a persistent public deployment.

## Milestones and footprint

Six disjoint worker scopes handled simulation, foot/police gameplay, pedestrians,
progression/UI adapter, actor rendering and landmarks. Each used bounded tasks,
explicit-path commits and exclusive index windows; workers did not push. Root
owned controller integration, provenance, subjective preview review and release.

| Commit | Scope |
| --- | --- |
| `bc5e5f1` | Bounded sidewalk pedestrian reactions |
| `97b0ee4` | Traffic/vehicle/actor simulation adapters |
| `0fd3737`, `a149aa8` | Jobs, economy, repeat jobs and car condition |
| `f5a49e3` | Foot/combat and bounded police/search |
| `4d64155` | Articulated actors and pooled effects |
| `9c13944`, `40dac86`, `471c4a5` | Landmark geometry and inspected references |
| `332a939` | Explicit-source local address search |
| `21c8538` | Reproducible development workflow/check runner |
| `0e27f26`, `9a2c0a8` | Garage/jobs UI and root two-mode integration |
| `d707804`, `69c4e73` | Responsible-driver reports and idle regression |
| `eac0484`, `5a5026e`, `5f87c9c` | Visible pavilion, grass roof/flag and phone controls |
| `c0c4f60`, `e954531` | Browser coverage and ordinary vehicle claims |
| `2216aa6` | Final controls, manual and provenance reconciliation |

Game payload is **23 files, 8,725,498 bytes**, up from 7,986,198
(**+739,300 bytes**). Shared dependencies are unchanged. Game tree SHA-1:
`71613390b65ed421d135058f06e43fb21f2c0fcd`.
The 626,814-byte address file has SHA-256
`9186624ae78f0863baca806cfccd03a9b907708e229d70926322ff9959a78ab9`.
The unchanged 7,791,998-byte geography file has SHA-256
`f62bdacc290865799023f461b0be923d0fc48a8a7ca75fcfb241637c5790f425`.
More than 27 GiB remained free before final evidence packaging.

## Reproduction

```sh
python3 -B scripts/check_capital_drive.py
python3 -B scripts/test_capital_drive_browser.py --output <external-output>
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
git diff --check
```

Run from the repository root with the documented narrow checkout. Optional
browser/geodata packages and raw source caches remain outside the repository.
