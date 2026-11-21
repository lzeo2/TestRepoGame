# Capital Drive precincts, rooms, Civic and campaign

14 November2026, Australia/Sydney. Existing owner-authorized original game 245.
Catalog remains134 registered entries /140 projects; zero games added. The owner
requested the combined changes and standing push/merge-all authorization remains.

## Delivered behavior

- Twenty source-backed Manuka parody businesses in five precincts, plus priority
  Lambzhou 1919 at the sourced Civic location, with separate
  centre/court/arcade geometry, estimated nonoverlapping facades and clear paving.
- Source-guided suburban palettes, coherent frontages and650 bounded rear gardens.
- E entry at rendered house/shop doors; one generated furnished plan/view at a
  time, wall/furniture collision, same-door return and disposal. Shop activities
  require the active counter. House layouts are plausible originals.
- Telopea site fencing shares186 view/collision spans and11 estimated openings
  at actual mapped paths. Public road carriageways stay clear.
- An independent pinned OSM overlay connects both lake bridges to Civic. Source
  Canberra Centre exteriors and an enterable original four-unit concourse are
  included. Fifty-one duplicated OSM/ACT ground bodies are suppressed through
  measured source overlaps and paired-ID guards; original geography stays intact.
- Lake relation3400115 retains its full shoreline and seven island holes in
  world/map rendering and collision. The western lake extends beyond play bounds.
  Shared bridge corridors govern continuous estimated deck heights and water
  exemptions; the north ground comes from actual ACT contour interpolation.
- Campaign adds six ordered original chapters with briefings, timed drive/foot/
  interior/theft/escape objectives, retry and one-time rewards. Completion shares
  the career save write; legacy careers remain valid. Free roam cannot advance it.
- More compact static lighting attributes, cached/indexed water contacts and
  skipped exterior graphics updates indoors reduce memory/update work. Indoor
  camera fallback hides the actor when a wall forces an eye-level view; foot HUD
  omits vehicle instruments.

Source URLs, hashes, import instructions and fidelity limits are in the
[source record](../capital-drive-district-sources.md). No new Street View viewing
or proprietary imagery is claimed. No runtime remote loads/dependencies added.

## Verification and retained failures

The final authored runner contains37 modules and30 pure suites:98 source
commands. The latest priority run passed99/99 including its browser command. A first integration run caught a Set/Array helper
mismatch in the water broad phase; it was fixed before browser review. The
source suites cover exact geographic inputs, legacy/corrupt saves, campaign
ordering/retry/sandbox/reward gates, lazy room identity/movement/disposal, indoor
service authority, closed-ring water-hole area and source bridge physics.

Actual-source crossing regressions retain16,101 merged building outlines,
1,464 areas and160 visible parapet barriers. Four directed Commonwealth/Kings
routes pass1,350 occupancy/height samples and2,686m of external-car sweeps,
with player-step and foot sweeps, expansion joints, open-water blocking and island
passage. Pure fixtures are not native gameplay proof.

Bounded Playwright runs used system Chromium with software WebGL. Positive proof
uses keyboard/mouse and normal Free roam map travel; snapshots are read-only.
No cash grants, actor setters or synthetic mission completions were used.

| Run | Observed result |
| --- | --- |
| `qa-01` | Failed after19 checks: the test walked into its own parked car outside Coals. |
| `qa-02` | Failed after21 checks: shop entry/lazy loading worked, but the test steered too close to a shelf. Worker stopped after two failures; root explicitly took over. |
| `root-final-01` | Passed55 checks in240.64s, including campaign spawn pickup/timer/map guard, Centre/shop/house entry, indoor counter guard, disposal, lake/fence frames and phone dark/light start/map layouts. |
| `final-clean` | Runner95/96: browser did not start because the runner-created empty directory conflicted with the harness's strict new-directory guard. Guard now accepts an empty caller-created directory and rejects prior evidence. |
| `final-reviewed-01` | Failed after26 checks: an arbitrary1.9m waypoint demanded movement about3mm beyond a solid facade. It was already inside the2.8m E interaction range. The test now stops at2.4m and still requires real E entry. |
| `final-reviewed-02` | Passed96/96 runner commands, with57 browser assertions in288.36s, including the normal school gate crossing and reviewed indoor camera/HUD. |
| `priority-noodles-01` | Runner stopped87/99: the physical-site fixture still used only the southern bounds. It now uses the actual merged map and retains all21 approach checks. No browser started. |
| `priority-noodles-02` | Failed after6 browser checks: root treated the screenshot helper's None return as a snapshot. The helper call was corrected. No game/page/request error occurred. |
| `priority-noodles-03` | Passed99/99 runner commands, with27 focused browser assertions in75.88s: real-name search, detailed facade, normal entry, specialised dining/kitchen/dishes, counter UI, sandbox denial, exit/disposal and distance culling. |

All completed browser runs shut down their temporary server/browser; failed
evidence was retained. Both final successful runs had zero page/console/request or external-load
errors. Root viewed the actual district, phone and priority restaurant frames.
The Civic sign was visibly mirrored during review; its UV direction is corrected,
covered by an outside-observer readability regression and a fresh priority frame.

## Performance evidence and limits

A paired merged-map Node fixture used the same source, positions, UVs, meshes and
triangle counts, changing only attribute storage. World buffers fell from
1,001,184,444 to527,598,585bytes; neighbourhood buffers from72,741,024 to36,370,512.
Combined:1,073,925,468→563,969,097bytes,47.49% less (486.3MiB saved). Normals have
component error at most0.5/127, colours/alpha at most0.5/255. Shaders renormalize
normals. Scratch vectors and a numeric tint cache also reduce construction work.
The paired profiled world timings10.939s/9.969s and neighbourhood3.282s/3.440s
are noisy shared-machine observations, not a speed guarantee or N100 benchmark.

Shopping geometry uses5,298triangles/two draws, storefronts3,680/two, campus
3,720/two, Civic centre1,853 plus960bridge parapet triangles/at mostfour draws.
One active actual shop uses at most696triangles/one draw; the original Centre
concourse uses1,764/one. Actor rendering is separate. These are adapter budgets,
not total scene draw counts or whole-device frame rates.

Native IntelN100/8GB performance remains unmeasured. The browser campaign proof
covers the first pickup/timer, not a complete six-chapter playthrough. Phone proof
covers layouts, not touch driving. Interiors/tenancies, gardens, facades and bridge
decks are interpretations, not surveyed reconstructions. North contour residuals
and sparse source limits remain in the source record.

The full-fleet gate was not rerun. Its retained123/133 result with ten unrelated
certificate failures remains a historical HOLD; targeted passes do not replace
it. Shipping follows the owner's continuing merge-all instruction, not a claim
of a fresh full-fleet pass. Protected/portal/proxy/shared car-factory paths are
unchanged. Disk checks showed28GiB free before and after (rounded); no precise
whole-workspace byte baseline was recorded.

## Reproducible workflow and release

The development skill, workflow, authored runner and source builders are updated.
No packages/build tooling are installed into the repository. Raw API/contour
caches and screenshots stay external. The playable archive includes local
runtime dependencies and data; it needs only a static server.

Final source milestone: `5c2e3060`. Source, maintenance inventory/checker and sitemap reconciliation passed for
the owner-authorized update. GitHub
history and the final handoff record the merge/deployment result; this source
receipt does not predict a deployment success. Original sparse selection is
restored at handoff.

## Priority restaurant evidence

The owner added Lanzhou 1919 while the district release was being completed.
Retained OSM node5656111023 establishes the actual Civic source position. Its
restaurant-specific door is estimated, not surveyed. Display remains Lambzhou 1919
under the earlier parody-shop convention; real-name and typo aliases resolve.
Two official Canberra interior photographs were actually viewed for material and
furniture cues. No reference images, mural, logo or original text artwork ship.

The exterior measures1,438triangles/three draws with a512×256 local original atlas;
its furniture has four matching physical footprints. The specialised room measures
2,412triangles/one draw/211,064geometry bytes, with no textures, extra lights or
NPC allocation. Normal-input footage shows orange booths, bowls/chopsticks,
timber detailing, tile floor and an open prep counter. These remain approximate
original low-cost models, not a photorealistic or surveyed recreation.

The final27-check flow does not claim a positive career purchase/robbery, full
campaign playthrough or hardware FPS. It verifies the sandbox counter denial and
unchanged cash; source regressions separately cover actual career purchases,
timed robbery, counter authority, interruption and single payouts.

## Milestone commits

- `04c7a25e` docs: define shopping precinct and neighbourhood character pass
- `fcfedb04` feat: expand sourced Manuka shops and precinct geometry
- `45865bcd` docs: scope interiors Civic expansion and campaign
- `8df49902` feat: model source shopping centre and clear pedestrian approaches
- `07a09a11` feat: add lazy furnished Capital Drive interiors
- `72f234c0` feat: add bounded suburban gardens and character
- `3e3e6e5e` feat: fence Telopea campus with source-aligned public path gaps
- `ad703f43` feat: add pinned Civic and complete lake source overlay
- `d4fdd548` feat: add ordered Canberra campaign missions and saved chapters
- `c744ab64` feat: sample real contour terrain through Canberra Civic
- `e6348168` feat: add source-aligned Civic centre and lake bridge parapets
- `60204566` test: sweep actual Canberra bridge and island crossings
- `3fab5c8a` test: add bounded Canberra district browser review
- `3e1945b0` feat: connect campaign interiors Civic and physical lake crossings
- `4bbc1789` perf: compact Capital Drive static lighting buffers
- `b1e17420` fix: suppress source-paired duplicate expansion buildings
- `c5ad1803` feat: add lazy Canberra Centre concourse interior
- `2185075e` fix: finish Civic entry indoor camera and source-aware presentation
- `38462127` test: stop door approaches within the real interaction range
- `09a42bc3` feat: map sourced Lambzhou 1919 noodle shop in Civic
- `3e0105f2` feat: add detailed original noodle-shop frontage at source location
- `6e775385` feat: furnish source-tied Civic noodle restaurant interior
- `5c2e3060` feat: integrate detailed Lambzhou restaurant and verify normal entry
