# Wings realism pass: source-loss interruption

## Status

**Incomplete, no realism runtime delivered, no push.** Existing lighting commits
`cad81ac0` and `143c8394` remain intact. Speedboat assets/generator and the lighting
worker's source were not overwritten. No game, aircraft geometry, catalog ID,
dependency or external runtime load was added by this lane.

During integration, both ignored directories `.tmp/wings-realism/` and
`.tmp/wings-time-of-day/` disappeared. This lane did not remove them. The actor
and cause are unknown. Direct directory listings and Git commands subsequently
returned `No such file or directory`. The directories are absent, not merely
dirty. The main repository cannot recover their private Git objects automatically.
Operator recovery ticket `pi-538686-1792800095350-4755b416` remains unresolved.
Do not promote the results below into delivery or native acceptance.

## Completed before the loss

These were isolated source milestones, not commits in the public worktree:

| Private commit | Scope |
| --- | --- |
| `2d05e7d` | Preserve seven aircraft's source PBR factors; deterministic local ORM/normal maps and restrained weathering, no GLB changes |
| `26ddfa3` | Jitter-aware terrain normals, mineral/scree/soil shading and height-cache invalidation; unchanged geography/collision topology |
| `908477c` | Actual Three 0.186 CSM helper, bounded quality maps, disposal/resource regression |
| `a22a345` | Merge committed daylight source `1e4fb16` into the aircraft candidate |

Uncommitted candidate work added ray-marched cloud volumes, depth clipping and
optical/GLSL-graph checks, plus cascade integration into the daylight/world/scene
boundaries. Cloud delegation was interrupted twice by incoming coordination
messages; its retained candidate was reviewed and exercised by the parent, not
reported as a finished worker delivery. Private stale locks were removed only
inside this lane's nested Git directory, never the shared repository lock.

The approved exact Three 0.186.0 package was eventually located through lighting
build metadata; esbuild 0.28.2 was already installed externally. Nothing was
installed. An earlier tooling hold was therefore resolved before these checks.

## Actual measurements and output

The source builder emitted:

```text
PASS esbuild 0.28.2; Three 0.186.0; 25 files; 3524765 bytes
PASS generated imports, HTML/CSS entries and worker references resolve; no external module imports or .ts URLs
```

This build included the cloud candidate before the later cascade-integration
edits. It was not a final delivered build, and its files were lost with the tree.

The retained `scripts/check_wings_realism.mjs` subsequently exercised all five
source CPU/graph suites after the cascade integration edits:

```text
PASS 762 source PBR factors; finite deterministic ORM/normal maps and local UVs
PASS unchanged geometry conversion, rigs, loadouts, animation and day/night SpotLight paths
PASS 5 Wings realism CPU/graph suites; generated Node syntax checks; no browser or FPS claim
```

The aircraft guard was deliberately rebased from the earlier night-light source
to committed daylight source `1e4fb16`; immutable section SHA-256 guards replaced
its dependence on private Git objects. It retained the newer horizon-shadow fix,
not a weakened geometry/gameplay check. That test source is now missing too.

- All seven aircraft GLB hashes, triangle counts and file sizes were unchanged:
  F/A-18 16,896 / 912,784 B; Apache 11,322 / 745,072 B; A-10 17,576 / 952,180 B;
  YF-12 18,028 / 780,572 B; B-2 4,740 / 283,788 B; F-15 41,352 / 1,176,316 B;
  F-35 40,812 / 1,174,768 B.
- Terrain: 160,801 baked vertices; 320,000 full-grid triangles. Retained rendered
  totals including skirts were 13,188 / 3,640 / 1,070 / 357 by LOD, unchanged.
  38,376 triangle-interior samples had maximum error `1.535e-12 m`.
  Existing baked height range remained -74.38 to 574.53 m.
- Terrain worker's one-shot 100-cluster process CPU sample increased
  767.427 to 966.623 ms; this is not a performance improvement or FPS claim.
  Runtime geography/tile source increased 50,091 to 50,999 UTF-8 bytes.
- Cloud proxy triangles: 0/2/4 before, 0/12/24 after for Low/Balanced/High.
  Six actual GLSL graph cases covered standard/reversed/logarithmic depth;
  graph generation is not driver shader compilation or a GPU draw.
- CSM: two 1024-square maps on Balanced; three 2048-square maps on High.
  Estimated color/depth payloads were 16,777,216 / 100,663,296 bytes, not measured
  GPU allocations. Three graph/resource cases passed, seven targets disposed.
  No geometry was added; shadow passes would redraw existing geometry.
- **FPS before/after: not measured. Screenshots: zero for this lane.** No browser
  was launched. The Foldwild reservation was honored and a next-slot release
  recorded in `.tmp/foldwild-ui-polish-qa/READY.md`; a sibling browser remained
  active after that hold was released. No process was killed.

## Source findings and unmet goals

The current game was not flat: it already had an eroded coastal heightmap shared
by renderer LOD0 and `groundHeight` collision, with hills, valleys and coastlines.
There is no `floorHeight` API in this source. Adding a second GLB terrain would
have duplicated the authoritative collision surface. Existing water already
uses Gerstner waves, shader sky reflections, ship wakes and shoreline foam;
lighting's committed pass ties its light/color to time of day. Existing rain,
wind-driven particles, spray and height fog were preserved, not newly invented.

Realism completion is **not** established. The CSM candidate used softened native
PCF, not contact-hardening/variable penumbra or screen-space contact shadows.
Aircraft wind buffeting was not implemented. Local scene-object water reflections,
photographic quality, native shader execution, mobile/desktop visual review and
FPS remain unverified. Existing rights, physical-device and gameplay holds in the
[Wings manual](../games/232-wings.md) remain separate.

## Recovery and verification

Restore only the two missing source directories from an operator backup if one
exists; verify the private commit objects and uncommitted candidate. Do not
recreate files and reuse these measurements as if they applied to new bytes.
The surviving runner is an explicit source-recovery tool, not a default gate or
a passing check against today's served bundles. It requires the five missing
source checks. After restoration:

```sh
node --check scripts/check_wings_realism.mjs
node scripts/check_wings_realism.mjs --source .tmp/wings-realism/source \
  --three-root "$THREE_ROOT" --esbuild-root "$ESBUILD_ROOT" \
  --models Games/Wings/models
```

Re-run a final source build, clean-pin patch recovery, generated Node checks,
solo/jet regressions and local-reference checks before paired runtime delivery.
Then obtain one serialized native visual/performance pass; never invent FPS.
No full-fleet smoke or push was requested or run. Main Wings manual/inventory
were concurrently dirty and were not overwritten by this lane. Maintenance
coverage remains subject to the unchanged checker and concurrent source owners.
