# Capital Drive landmark references

13 November 2026. Dedicated geometry is original, authored from public architectural
facts and the existing local ACT building outlines. No photographs, Street View
images, textures, models or other proprietary assets are bundled. These are bounded
visual interpretations, not measured architectural reconstructions. Geographic
source JSON is unchanged. Coordinates use its origin149.137E,-35.318S and its
111320m/degree equirectangular projection (longitude scaled by cos(latitude)).

## Public reference facts inspected

- [Parliamentary Education Office: Australia's Parliament House](https://peo.gov.au/understand-our-parliament/parliament-house/australias-parliament-house):
  two curved walls separate the chambers; flag mast81m. [Building dimensions](https://peo.gov.au/understand-our-parliament/your-questions-on-notice/questions/why-was-parliament-house-built-in-canberra)
  gives300m by300m. [Parliament: flag](https://www.aph.gov.au/Visit_Parliament/Things_to_Do/Learn_about_the_flag)
  confirms the accessible grass roof and81m height. [2018–19 departmental report](https://www.aph.gov.au/About_Parliament/Parliamentary_departments/Department_of_Parliamentary_Services/Publications/Annual_Reports/Annual_Report_2018-19/Part_3_Performance/Activities_and_achievements)
  gives12.8m by6.4m flag and81m above the deck. The render uses a300m broad
  footprint, two sloping lawns, a curved pale north frontage, axial hall, formal
  paved forecourt/pool and four steel mast legs converging above the roof. Roof
  deck18m above local anchor and curve profile are estimates, not survey heights.
  Mast top99m above that anchor represents81m above the estimated18m deck.
- [Museum of Australian Democracy: architecture](https://www.moadoph.gov.au/about/old-parliament-house/architecture):
  John Smith Murdoch, stripped classical, three storeys, two chambers. Render uses
  a146m broad white/pale body, central portico, raised parapet, regularly spaced
  windows, stairs and flagstaff. Body14m height and ornament are estimates. Axis
  is shared with Parliament, facing northeast (local yaw-0.615rad).
- [ACT: Manuka Oval lighting submission](https://www.cmtedd.act.gov.au/__data/assets/pdf_file/0003/1343586/2019-056.pdf):
  six towers,47m maximum height. [Supplier report](https://www.ukexportnews.co.uk/news/1687/Abacus-Lighting-Secures-Major-Contract-For-Manuka-Oval)
  gives six45m masts leaning9degrees towards the ground. Render uses six
  approximately47m overall silhouettes, inward-bowed masts, bowed trapezoid
  light banks with three pale lamp rows, two simplified covered
  grandstands and a170m by198m ground following terrain. Seats, exact stand
  arrangement and ground size are approximations. The source ACT outline circles
  the oval: replacing its generic ten-metre extrusion avoids a solid stadium drum.
- [Canberra Glassworks: history](https://canberraglassworks.com/what_we_do/):
  Kingston Power House completed1915, Murdoch, coal-fired, converted to Glassworks
  in2007; current address11Wentworth Avenue. [ACT precinct conservation plan,
  October2023, page69](https://hdp-au-prod-app-act-yoursay-files.s3.ap-southeast-2.amazonaws.com/6216/9896/7033/Kingston_Powerhouse_Historic_Precinct_CMP_-_Volume_A.pdf)
  states the original chimney/flue were demolished; the1947base supports the
  contemporary glass artwork *Touching Lightly*. [Fabricator reference](https://publicart.work/touching-lightly-warren-langley/)
  gives23m height, glass and steel. [Artist description](https://www.warrenlangley.com.au/project/touching-lightly/)
  calls the pillar a reference to both the historic and present uses. The render
  has a simplified28m by50m industrial hall, high windows/buttresses,23m pale
  tower and low chimney base. It does not assert a surviving tall brick chimney.
  Hall shape/height and tower offset are approximations. Anchor is the public
  coordinate-35.3115975,149.1436952, aligned to ACT footprint act-120773-0.

## Anchors and explicit footprint replacement

| Site | Latitude, longitude | Approximate local x,z (m) | Replaced source IDs |
| --- | --- | --- | --- |
| Parliament House | -35.3081,149.1245 | -1135.40,-1102.07 | act-130946-0, act-82956-0, act-104361-0, act-123850-0, act-85758-0, act-86145-0, act-83409-0, act-133856-0, act-116798-0 |
| Old Parliament House | -35.3021,149.1297 | -663.08,-1769.99 | act-97135-0 |
| Manuka Oval | -35.3183,149.1348 | -199.83,33.40 | act-133342-0 |
| Kingston Powerhouse | -35.3115975,149.1436952 | 608.14,-712.73 | act-120773-0 |

Replacement is an exact ID intersection with available source buildings. No
radius-based erasure, neighbouring Fitters' Workshop replacement, data rewrite,
or general collision rewrite. Parent integration supplies map.landmarkBuildingIds
before createWorldView. Building collision remains the source geometry.
National Gallery/Portrait Gallery are deferred from this bounded study.

## Runtime budget and verification

Four sites, eight merged meshes, two pooled vertex-colour materials,5232triangles.
No images, runtime fetch, animation loop or mutable global state. Local terrain
sets each anchor; the oval and forecourt sample terrain. Main buildings use deep
foundations where needed to close slopes. Detail disappears after850m plus site
radius; skyline stays until4200m plus site radius. Coarse silhouette material
ignores the street fog so it remains visible across the inner south; normal
Three.js depth testing still allows intervening terrain/buildings to occlude it.
No opacity fade or per-frame allocation. update accepts x/z or position.x/z;
time is currently unused because landmarks are static. Disposal is idempotent.

`node scripts/test_capital_landmarks.mjs` passed: four sites,5232triangles,
12exact replacement IDs, pure lookup/projection, anchor grounding, orientation,
81m mast above estimated roof deck, finite buffers, near/far culling, fog-aware
skyline and eight geometry/two material disposals. Existing world regression and
syntax/diff checks also passed. These checks do not establish N100 hardware FPS,
whole-site fidelity or safe walking on roofs. Root owns the updated game maintenance manual and further visual review.


## Street View comparison: Parliament frontage

Root reported an actual Street View inspection on13November2026. Requested road
point-35.3061889,149.1254594; actual panorama-35.3061877,149.1254252,
Federation Mall, heading210degrees, pitch4degrees, imageryMarch2015.
[Reproducible request URL](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.3061889,149.1254594&heading=210&pitch=4)
uses the requested point; Google can resolve to a different panorama over time.

Root's observed cues: broad terracotta/red-brick forecourt; waist-high grey
bollards; low curved white/pale retaining wall framing the sloping grass roof
wings; symmetrical two-storey white column/window grid; thin pale legs rising
into the pyramidal mast and central antenna/flag; building low beneath roof edges;
stepped white slabs behind the frontage; trees flanking the right.

The model already represented the broad sloping lawns, curved pale frontage and
four converging mast legs. This comparison changed the foreground paving to muted
terracotta, lowered the foreground posts to terrain-grounded1m grey bollards,
raised the central columns to frame both window rows and added two pale stepped
roof slabs. Vegetation remains the shared world renderer's source-derived trees.
These are original geometric interpretations of a single reported view, not
photogrammetry or a current whole-building survey. No panorama image is bundled.

The earlier A23 approach sample, imageryMay2024, showed an underpass rather than
the house; it is not evidence for the facade.


## Further Street View comparisons

Root reported these actual inspections on13November2026. URLs below reproduce
requested road points; later Google resolution may choose different panoramas.
No new preview, near/distant rendering or hardware PASS is claimed here.

| Site | Requested point and view | Actual panorama and label | Imagery date |
| --- | --- | --- | --- |
| Old Parliament House | [Request](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.3012358,149.129513&heading=170): -35.3012358,149.129513, heading170 | -35.301251,149.1295641;18King George Terrace | March2026 |
| Manuka Oval | [Request](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.3193311,149.1354692&heading=320&pitch=2): -35.3193311,149.1354692, heading320,pitch2 | -35.3193672,149.13544;Manuka Circle | September2020 |
| Kingston Powerhouse | [Request](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.3119305,149.1430886&heading=55): -35.3119305,149.1430886, heading55 | -35.3119202,149.1431044;11Wentworth Avenue | March2026 |

Old Parliament observations: white two-storey exposed facade, red-brick plinth,
stepped pale parapets, regular dark rectangular windows, central entry with
scaffolding at that date, flag rows and paved forecourt/parking/bus bay. The model
now shows two exposed window rows (the official three-storey overall plan remains
correct), a red plinth following terrain and low stepped parapet slabs. Scaffolding
and dated parking arrangements are not reconstructed. Exact proportions remain
estimates rather than measured perspective correction.

Manuka observations: tall slender curved grey masts, broad curved/trapezoid light
heads with multiple horizontal rows, black picket perimeter, low stands behind
mature trees, grass verge and concrete footpath. The model replaces straight
single-segment masts and rectangular heads with four-section inward bows and bowed
trapezoid banks carrying three lamp rows. The nearby batch has terrain-grounded
black pickets and two rails; no new meshes/materials are needed. Stand arrangement
remains an approximation; shared world trees/verges/footpaths remain in charge of
the surroundings. The distant batch retains the distinctive bowed mast/head shape.

Kingston observations: a tall conifer obscures much of the target, with grass
verges, footpaths, a paved precinct and glimpses of the heritage hall roof. This
is a limited exterior reference. It does not verify the chimney, hall dimensions,
complete layout or orientation. The geometry remains based on the source footprint
and public conservation/Glassworks/artwork references; it was not changed from
this obstructed view. No proprietary imagery is bundled or used as a texture.


## Parliament entrance visibility correction

Root's normal-UI capture from the reference approach, local world point
(-1048.26,-1314.81), exposed an authored geometry error: the original continuous
13m curved wall stood in front of the central column/window grid. It hid the
entrance, and generated trees occupied the open forecourt. This was an occlusion
bug, not evidence of a terrain interpolation failure. Root sampled centre46.235m,
approach41.412m and centre-front44.86m from the local DEM.

The curved frontage now has an approximately85m central gap and terrain-grounded
6m wing walls. A68m pavilion backing supports the entrance, with its glazing in
front of the backing and its twelve window bays between thirteen columns. The
marble tint is lighter white/cream for Parliament geometry only. Shared world
lighting, grass and other landmark colours are unchanged. The gap is physical
geometry removal; no depth-test bypass or transparent wall masks the problem.

`LANDMARK_CLEARINGS` exports two frozen world-coordinate polygons: the Parliament
forecourt transformed from local x±80m,z[-235,-145] using the same-0.615rad axis,
and the inner Manuka playing field ellipse with80m/94m radii. Parent integration
sets `map.landmarkTreeExclusions = LANDMARK_CLEARINGS` before world construction.
The existing world tree generator skips only candidate centres inside these
polygons. It preserves neighbouring plots, flanking trees, original building
outlines, source JSON, terrain and the9000-tree/per-chunk budgets. This is an
explicit authored open-space interpretation, not a new geographic dataset.

The new raycast regression traces from the local forecourt through a window bay
and requires its first hit to be the glass at z-152.14m; the former curved wall
would fail it. A world-generator regression verifies exact candidate removal in
a supplied polygon and unchanged tree generation for a distant polygon. Frozen
clearing/projection checks, finite buffers, LOD and disposal checks also pass.
`node scripts/test_capital_landmarks.mjs`, the existing world regression, syntax
checks and `git diff --check` passed after this change. Current budget:5232
triangles, eight meshes, two materials. Root owns the normal-UI recapture and
near/distant visual acceptance; these numerical checks do not assert a new preview
PASS or exact architectural fidelity.


## Final bounded roof and flag polish

Root's reviewed entrance/clearing capture made the pavilion and mast recognisable,
but showed a remaining silhouette mismatch: the lawn roof had its full18m height
at the front/back edges, leaving a tall pale wedge. Each lawn strip now uses two
inclined green surfaces. The z±132m edge has12percent of that strip's central
height (maximum2.16m); it rises to18m at z0 and falls to0m at the outer x±150m
edges. This retains the central roof deck, hall, mast and footprint dimensions,
while keeping the visible grass incline above the low frontage. The height
profile is an authored approximation guided by the same reported exterior view,
not an additional survey or an asserted construction section.

The12.8m by6.4m blue flag plane now carries original flat white/red canton bands,
a seven-point Commonwealth star and simplified Southern Cross stars. All markings
are vertex-coloured triangles on slightly separated planes to avoid depth conflict;
no downloaded flag image, texture or logo asset is used. Geometry stays in the
existing skyline buffer, so distant views retain the markings. This adds144
triangles across roof and flag compared with the preceding correction, for5232
total, eight meshes and two materials. Source data, tree clearings and collision
remain unchanged.

The landmark regression still passes its entrance-glass raycast and now verifies
low front/back roof edges,18m central crest, zero-height outer lawn edge, white/red
flag geometry and finite buffers. Syntax and diff checks passed. Root owns the
final recapture from the same Parliament approach; no new image PASS is claimed
by this static geometry check.


## Manuka Pool and material continuation, 14 November 2026

The existing cached tile `osm-tile-1-1-2.json` has SHA256
`d8ead176fd89c9420ba8e9711cb8736a475fe56f73a852981fe25a053b72c7ab`.
OSM way58851110, version11, timestamp2024-04-18T09:56:58Z, is tagged
`leisure=swimming_pool`, `name=Manuka Pool`, `length=30.5`, `location=outdoor`,
`operator=ACT Government`. Its four source corners are:

| Latitude | Longitude | Local x,z metres |
| --- | --- | --- |
| -35.3168694 |149.1356152 | -125.78,-125.86 |
| -35.3169403 |149.1357385 | -114.58,-117.97 |
| -35.3171668 |149.1355430 | -132.34,-92.75 |
| -35.3170959 |149.1354197 | -143.54,-100.64 |

OSM sports-centre way51677758, version7, timestamp2025-04-12T00:37:07Z, names
the larger Manuka Swimming Pool site. Its full boundary is not the water surface.
The source quad projects to roughly30.85 by13.70metres. Rendering replaces only
ACT `act-75267-0`, the6.5m generic block occupying the basin. Nearby
`act-92000-0`, `act-95964-0` and `act-125329-0` remain. A level water quad uses the
maximum sampled corner terrain+.3m; one-metre coping, five lane guides and a small
unbranded entrance marker are original approximate art, not measured architecture.
The exact basin receives a procedural-tree exclusion. Source JSON is unchanged.

The pool adds84triangles/two merged meshes: five sites now total5316triangles,
ten meshes and the same two pooled materials. A bounded original near-material
shader grain adds surface variation without new photographs, textures or lights.
The distant material remains fog-free. Parliament entrance-glass raycast, low
lawn edges/18m crest,81m mast, flag colours and grounding protections still pass.

No additional pool panorama was inspected. The preceding recorded Street View
observations inform architectural cues; the pool shape comes from licensed OSM
geometry. This continuation makes no photogrammetry, survey or citywide imagery
claim. Fresh browser evidence belongs to the expansion receipt.
