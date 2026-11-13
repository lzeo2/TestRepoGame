# Shopping precinct and neighbourhood character, 14 November 2026

Owner follow-up: map more parody shops and make the layout faithful to shopping
centres such as Manuka; consider what makes suburbs/neighbourhoods feel real and
implement that. Existing Capital Drive245, no new game/catalog entry. Prior
merge-all authorization persists. Keep the forgiving driving rules and traffic
instancing from PR13. Source geography/addresses/terrain stay unchanged.

Use bounded disjoint Sol workers, explicit commits and exclusive index windows.
Root owns integration, UI/physics/QA/written source and maintenance evidence.
No packages/runtime remote assets, shared car-factory/protected/portal/proxy edits.
No invented verified entrances, retail tenancies, layouts or photogrammetry claims.

## Owners and interfaces

M1 owns scripts/build_capital_stores.py, stores.js, data/stores.json,
new shopping-precincts.js/data/shopping-precincts.json and scripts/test_capital_stores.mjs.
Extend the retained-source selection with useful exact Manuka retail/food nodes,
about15–25total verified stores where clear frontages exist. Preserve all7old
IDs and legacy cooldowns. Every display business name is an original parody.
Extend eligible named source cafes/restaurants where clear evidence exists;
exclude ambiguous premises rather than inventing tenant coordinates. Allocate
nonoverlapping facade units for neighbouring source points; centres/arcades use
explicit source ways/footpaths/areas rather than one name on a large generic wall.

shopping-precincts.js exports frozen SHOPPING_PRECINCTS array, each
{id,name,sourceName,boundary,buildings,paths,parking,roads,source}, where buildings
are {id,points,height,levels,role}, paths are {id,points,width,sourceType}, parking
are {id,points,sourceType}. Exact site/footprint/path coordinates come from the
retained OSM/ACT source. The initial sites are Manuka retail polygon31974923 and
Manuka Terrace (Coals buildingact-87705-0), plus source-defined court/arcade areas
only if present. Paths/parking may be empty when not sourced. role flags like
'centre'/'arcade'/'street-row' are explicit authored interpretations. name uses
parody centre labels where appropriate; sourceName remains provenance. Export
SHOPPING_BUILDING_IDS only for buildings actually replaced by M2 geometry (M1
and M2 coordinate exact list; root defaults onlyact-87705-0). Source metadata and
reproducible output args cover both store and precinct sidecars/modules.

M2 owns new shopping-view.js, storefronts-view.js, tests/test equivalents
scripts/test_capital_shopping.mjs and test_capital_storefronts.mjs. Adapter
createShoppingView(scene,map,heightAt) -> update(focus),stats,dispose; imports
SHOPPING_PRECINCTS. Model Manuka Terrace as a source-footprint centre with
recognisable levels/entrances/continuous retail glazing/awning/roof bands and
parking approach, plus real connected source pedestrian/paved areas where clear.
Preserve exact source footprint body and existing collision (no fake interior
claim). Source Manuka Village/Court/Style Arcade are distinct complexes if mapped,
not one fictional indoor mall. SHOPS sit on contiguous appropriate facades with
unit-width variation/awnings/tills. Keep broad footpaths/open passages and sparse
cafe furniture/planters/racks/bins where clear of roads/buildings/doors. A facade
must not be hidden by the old generic body: root excludes explicit replacement
IDs using existing map.landmarkBuildingIds renderer boundary. Avoid procedural
trees/furniture over main shop approaches; export SHOPPING_CLEARINGS if needed.
Merged target<=4draws/12000triangles for precinct additions, storefronts<=2draws.
Use static precomputed buffers, bounded LOD/culling, idempotent owned disposal.

M3 owns world-view.js/neighbourhood.js, new suburb-character.js and existing
world/neighbourhood tests. Improve believable local patterns: Red Hill deep
setbacks/gardens/mature canopy, Kingston compact mixed use/apartments and hard
frontages, Manuka/Griffith older brick/cream houses and shop rows, Barton avenue
verges. Use source height/type/footprint/setback relationships and existing
recorded street cues; profiles are bounded architectural interpretations, not
surveyed suburb/cadastral boundaries. Add coherent driveways/kerb drops, fence
and gate gaps, varied restrained gardens/porches/roof details, apartment entry/
balcony rhythm where source supports. Never scatter props over paths/roads,
new stores or park polygons. Preserve mapped driveway/pavement widths and school/
landmark clearings. Better tree normals/forms may improve natural shading without
adding citywide geometry. No new lights per object/uncapped textures or dense
uniform clutter; source detail total increase measured and bounded, not doubled.
map.shoppingManagedBuildingIds lets neighbourhood skip M2-managed retail fronts.

Root owns script.js, districts.js if needed, service/progression/map/search/UI,
physical integration, test runner/new integration fixtures, source docs/skill,
normal browser review and release. Preserve new store source IDs/save compatibility
and street-life no-teleport/free-roam no-earn guards. New source paths may be
rendered only in actually clear ground; no claim of walkable arcades through
opaque source buildings. Render and movement must agree where a passage is added.

## Evidence and source cues

Official manukaterrace.com.au confirms Franklin/Flinders corner, parking and
lower/upper levels. Public Griffith Neighbourhood Plan describes separate Manuka
Village/Thetis Court, active ground-floor shopfronts with some upper businesses,
and The Lawns pedestrian link between Bougainville and Palmerston Lane. Historical
centre documents describe three levels; current official guide labels lower/upper.
Record this limitation; do not invent a complete interior plan from web snippets.
Use retained OSM ways/nodes for spatial mapping. Existing March2026 exterior
Street View observations support cream parapets, dark awnings, glazed fronts,
brick paving/planters, verges/mature trees and residential setbacks. No new imagery
claim without actual inspection; no proprietary image assets bundled.

Cheap actual-source checks gate milestones. Then one bounded normal-input browser
batch reviews Manuka centre/shops/passages and contrasting residential streets,
desktop/phone, signs/robbery gates, no errors/external requests and measured draw/
geometry budgets. Source numerical checks do not certify N100 performance or
Street View reconstruction. Preserve failures and resource cleanup; update manual
and inventory only after source commits. Merge completed PR under standing order.
