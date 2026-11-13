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
  approximately47m overall silhouettes, broad light banks, two simplified covered
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

Four sites, eight merged meshes, two pooled vertex-colour materials,5276triangles.
No images, runtime fetch, animation loop or mutable global state. Local terrain
sets each anchor; the oval and forecourt sample terrain. Main buildings use deep
foundations where needed to close slopes. Detail disappears after850m plus site
radius; skyline stays until4200m plus site radius. Coarse silhouette material
ignores the street fog so it remains visible across the inner south; normal
Three.js depth testing still allows intervening terrain/buildings to occlude it.
No opacity fade or per-frame allocation. update accepts x/z or position.x/z;
time is currently unused because landmarks are static. Disposal is idempotent.

`node scripts/test_capital_landmarks.mjs` passed: four sites,5276triangles,
12exact replacement IDs, pure lookup/projection, anchor grounding, orientation,
81m mast above estimated roof deck, finite buffers, near/far culling, fog-aware
skyline and eight geometry/two material disposals. Existing world regression and
syntax/diff checks also passed. These checks do not establish N100 hardware FPS,
whole-site fidelity or safe walking on roofs. Root owns visual/Street View review
and the updated game maintenance manual.
