# Capital Drive cache, character state and CPU verification

15 November 2026. Existing original game245 only; no new registrations, assets,
external runtime requests or source geography. Baseline is merged PR23
`ffb5df6f3b702703d83fc2a784741b5033694844`. The
[contract](../capital-drive-cache-and-performance-contract.md) and
[manual](../maintenance/games/245-capital-drive.md) give state owners and exact
reproduction commands. The owner authorized continued implementation and merging.

## Final source gate

`python3 -B scripts/check_capital_drive.py` returned:
**PASS Capital Drive: 247/247 commands passed.**
It requires74game JS files,85Node suites,12JSON data files and176total required
files, including two new Python cache checks. Log `capital-cache-full-247.log`
is40,581bytes, SHA256 `d8c31a33100c6de3ef4436f49334bbed47ac1f2f92ced6fab60e0d5ce8530eab`.
This checks the final runtime, including manifest drift, hero restoration, Fight,
collision broad phase and render policy; it is not a full-fleet loading gate.

The manifest check reports93files/15,602,350bytes, version
`c91a5af5add529a14e2316d54197076734daefc30ef4f6d3425231b79da9ec84`.
It covers the actual runtime closure and local attribution links. Six fetched
map JSON files total12,013,726bytes; a seventh JSON is credits-linked validation.
The generator's six tests and the actual-worker Node regression cover complete
installation, hash corruption/retry, unchanged-file reuse, partial failure,
request boundaries, scoped cleanup, cache repair and denied-storage fallback.

The strict checkpoint suite has94assertions. Actual controller functions execute
against real Simulation/Gameplay/checkpoint owners for independent switch/back,
health/ammo/car/actor poses, eight busy guards, same-hero no-op, outside-room
capture, failure rollback and the existing save writer. Restore does not call
the view callback which would move a parked car again or auto-load magazines.
Legacy careers without the optional `protagonists` field remain valid.

Collision differential checks compare the pinned pre-optimization simulation at
`87b5d21325de3acb2ef51df1653c32ca8012f8eb` (same collision source as deployed PR23).
They pass300inclusive AABB queries,2500rotated body-pair decisions,2400actual-map
pose/sweep/LOS/nearest-road probes and a600-frame40-car replay sampled every60frames.
Positions and traffic state match exactly. A200-distant-polygons fixture records
zero narrow-phase geometry reads while nearby contacts still block. Existing
contacts, people, terrain/lake/bridges, skate openings, ambient routes and junction
queues remain strict. Node replay timing around1231→412ms is observational,
not a pass threshold, browser frame-rate claim or claimed startup reduction.

## Native cache and hero checks

All output directories below are external artifacts. The real-game native cases
use actual UI/keyboard/mouse input, ordinary saves and read-only inspection;
no cash grants, synthetic saves, gameplay setters or synthetic clocks.

| Case | Result | Scope |
| --- | --- | --- |
| `capital-cache-native-20261115-a3` |18/18,58.15s| Actual full WebGL cold boot, registration after readiness, Saving→Saved, complete93-file cache, native driving/pagehide save, zero warm module/map origin bodies with ordinary HTTP caching disabled, offline full-game reload/drive and exact save bytes. |
| `capital-heroes-native-20261115-a1` |24/24,40.58s| Kit walks and pauses normally; first Milo home/Rowan office visits; switches return each own pose/health/weapon without cash/progress gain; real reload and normal Start restore selected Milo and inactive checkpoints. |
| `capital-cache-restart-fixture-20261115-a1` |5/5,1.43s| Lightweight actual worker, separate persistent browser process restart, same profile, offline stored asset reuse. Not a full3D/career restart playthrough. |

All three final cases have empty console/page error, failed request and external
request arrays. The controlled observer is outside the game scope. The cached
shell/modules/map files come from CacheStorage, not a secretly warmed HTTP cache.
The restart fixture specifically separates process-persistent storage from a
same-context tab reload. Hero physical restoration permits the documented small
safe-position adjustment if a live obstruction occupies the stored pose.

Results SHA256:

- Native cache: `7a5a32de2ff54d36df2041860617939d29ce701995726440719b62b439c3b9a6`.
- Heroes: `b08e399a738585f0d1afc8a6480cda3253d8497742da33f4fd984bd5a6b14bbb`.
- Persistent restart fixture: `8c3c12e0510d22ce54b9c9c018f341259ef3726cd24d45c5504e67c9a6ea9ba3`.

Earlier focused mechanisms also passed: fallback6/6 in23.34s and update/scope
fixture10/10 in4.49s. The former denied registration/CacheStorage while leaving
career storage available; actual Start/W/D still worked. The latter installed
actual worker v1/v2 fixture files, retained v1 while v2 waited, closed old clients,
activated v2 and preserved sibling requests/unrelated caches. They precede the
later hero/render UI additions. Results hashes respectively
`7512deb7139598d8d80572deb6c7792df9d5085b85de069102598b7c6191900a` and
`9574134685fdceabb311d522f2bd0250d46b45e4517fc5f4eee46cad773210a1`.
That early fixture recorded an incidental automatic favicon404 console message;
its HTML now supplies an inert favicon. It was not a game error or fabricated
clean-console acceptance. The final restart fixture is clean.

Retained native a1/a2 failed at an incorrect fixed JSON-count inventory assertion
(4observations,19.98/20.54s). Actual cache storage was complete; one count included
all exported JSON instead of runtime files, then omitted the credits validation
JSON. After two failures that fixed-count protocol was abandoned and reported.
The final alternative checks every actual manifest entry plus the six explicit
runtime maps. Failure hashes are
`2f0d55225ccaf2970a5092108c8ec89a71ad8848bbcb6acf402aa4dfdfe5087d`
and `4bb1fd9b4bd98a4976c469b2a968fa329242c15f3d9fca0e96f4e6ec1f173ad2`.
Their observations are not counted as completed native passes.

## Actual CPU profiles

`scripts/profile_capital_drive.py` records CDP sampled profiles, per-function/
stack aggregates, Performance metrics, process CPU counters, RAF intervals,
read-only source/game snapshots and actual rendered-frame counters where present.
Each case uses normal Street Life Start, idle, held W or normal Pause for about
eight seconds at1280×800 CSS. Raw `.cpuprofile` files remain in each evidence
directory. Baseline was a narrow exact Git export of deployed PR23, avoiding
concurrent source changes. Later runs blocked service workers to exclude first
cache installation from play CPU. The original baseline had no worker to run.

| ScriptDuration, seconds per~8s case | PR23 baseline | Optimized Low | Change |
| --- | ---: | ---: | ---: |
|3D idle|3.072|1.493|51%less|
|3D driving|3.247|1.265|61%less|
|2D control idle|3.315|1.090|67%less|
|2D control driving|3.925|1.169|70%less|
|3D paused|0.319|0.040|88%less|

The2D mode is an explicitly labelled `--disable-webgl` control, not3D gameplay
acceptance. Its CPU reduction supports the collision finding independently of
software graphics. The strongest sampled baseline hot path was
`polygonContact → physicalContact → staticVehicleClear → canOccupy → moveVehicle → updateTraffic`,
with additional bus and next-edge feasibility callers. Driving grouped self
samples included909ms polygonContact,605ms projectSegment,354ms physicalContact
and280ms vehicleOverlap. Optimized idle polygonContact self samples fell about
89%; the exact replay checks guard behavioral equivalence.

The paused3D case still drew98calls/241,421triangles continuously before the fix.
Afterward, with queues drained, it rendered **zero frames**, and graphics-process
CPU fell **32.53→0.04CPU-seconds**. Main TaskDuration fell8.564→0.338seconds.
An extra2D paused refresh was observed in its measured window; do not claim every
paused window on every renderer must have exactly zero frames while dirty state
or queued geometry remains. Settings/resize, pending chunks, cutscenes and live
Yoober follow are intentional render exceptions.

Cloud WebGL reports **SwiftShader Vulkan software rendering**. Its graphics
process is multi-threaded and can consume several CPU-seconds per wall second;
that is not the renderer's JavaScript percentage. Its `(program)` pseudo-frame
is unattributed/native work and is not labelled a JavaScript hotspot. Even after
the collision fix, active3D software graphics remains the larger aggregate cost.

## Performance preset experiment

The final Performance preset was separately measured against optimized Low,
with the same source geometry and physical rules. Performance caps640×360/20FPS,
versus Low960×540/30. At the test aspect ratio, actual backing sizes are576×360
and864×540; CSS remains1280×800. These are maximum sizes, not stretched pixels.

| Actual driving window | Optimized Low | Performance |
| --- | ---: | ---: |
| Rendered frames / measured seconds |118/8.17|162/8.08|
| Graphics-process CPU-seconds |31.41|27.63|
| RAF p50 / p95, ms |66.7/83.4|33.3/50.1|

Performance achieved about20actual renders/sec versus14, with12%less aggregate
software graphics CPU in this window. More frame/simulation opportunities slightly
increased ScriptDuration1.265→1.387s; it is not another collision optimization.
Its paused case still rendered zero. Software backends now default Performance;
hardware backends default Low, and an explicit saved choice wins. The quality
setting is remembered separately from career data.

These are short single-host comparisons, not statistical/hardware certification.
Inputs are time-based and routes can end at different positions as the scheduler
improves; inspect the source hashes and snapshots rather than treating scenery as
a precisely fixed GPU workload. RAF callbacks are not actual visual renders.
Cold3D readiness stayed around17.4s: download caching does not eliminate scene
reconstruction. N100/8GB, native hardware GPU FPS, whole-city smoothness and total
unique browser RAM remain unmeasured. Summed per-process RSS double-counts shared
pages and is not total unique memory.

Profile report SHA256:

- `capital-cpu-baseline-20261115-a1`: `89d4846bbec7e31be11911065bea731f5eb6d2a28c7185317864a9dfc964ab8a`.
- `capital-cpu-2d-control-20261115-a1`: `14784d915724641b112f59562a544b221ae1d632e087d3076688af99179b5f77`.
- `capital-cpu-optimized-20261115-a1`: `a45a4d2677843062996c91c80ce6101fd620b17af0783e688ce3e91a7362f33c`.
- `capital-cpu-optimized-2d-20261115-a1`: `d638451835165b26eb656157a35c9b7a56ec79db1a5cdf20239edb0afcfc254a`.
- `capital-cpu-performance-20261115-a1`: `538cf5ece84d81d6f5d8fad862dbf3c29d5effdcb201d5154d94e3c474562957`.

## Native pink-earmuff fight

`capital-earmuff-native-20261115-a1` passed16/16checks in38.73s in one attempt.
Actual Free-roam map search/teleport, E entry and WASD reach the clear aisle;
E/Fight starts real windup, captured noodle flight, NPC punch serial and fresh
ordinary encounter. The player's actual F reduces the guest's health100→75
through Gameplay. Pause freezes the result; sandbox player health/cash/campaign
remain unchanged. No synthetic clock, actor setters or save grants. This is an
ordinary Free-roam fight, not an earned Rowan mission or career injury proof.
Zero errors/failed/external requests. Results SHA256
`5592fe79ca24af09cec65ed31e6a174d5ef88f5ae31c2fa9c1314b36d396efec`.
`earmuff-fight-after-player-hit.png` records the real aftermath under Pause;
it is not programmatic component art or a claimed exact fist-contact frame.
The pause panel obscures the guest, so the image is UI/context evidence; the
read-only snapshots establish the actual punch serial and health reduction.

## Scope and remaining evidence

The game tree is92files/15,421,920bytes versus PR23's87/15,385,419:
+36,501bytes and five small JS files, with no new graphic asset library. The
selected89JS/JSON/HTML/CSS deployment files are verified separately after merge.
Catalog remains134registered games; geographic/address/terrain data, shared car/
font assets, Character AI, proxy, Netlify settings and catalog bytes are unchanged.
Maintenance/sitemap reconciliation is separate from gameplay acceptance.

The actual-room source Fight checks verify clear reachable aisle, bowl/punch,
player damage, retaliation, pause/LOS/dead/remote/gun/exit guards and no ordinary
campaign credit. Full native Rowan lunch/heists and paid gym careers remain
unverified; original school/home/whole Centre layouts remain interpretations.
Existing fleet certificate holds remain separately dated, not overwritten by
this owner-authorized targeted continuation. All bounded QA servers and browser
processes are closed before shipping; raw artifacts remain outside Git.
