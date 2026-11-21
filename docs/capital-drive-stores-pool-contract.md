# Mapped parody stores and Manuka Pool, 14 November 2026

Owner follow-up: map real inner-south store locations, use parody business names
including Coles -> Coals, make those stores robbable, and make Manuka Pool a
recognisable enclosed complex with fences/gates and surrounding detail.
Existing game245, catalog134 unchanged. Prior push/merge-all authorization persists.

Use the existing local Capital Drive skill, source/manual rules, bounded Sol
workers and exclusive commit windows. No runtime external assets, shared car
factory/protected/portal/proxy edits. Original geographic/address/terrain JSON
stays unchanged; new source-derived store sidecars and runtime site geometry are
explicit additions. Read old evidence as dated history.

## Disjoint owners

- P1 mapped stores: new stores.js, data/stores.json, reproducible store builder,
  test_capital_stores.mjs. Exact cached OSM nodes/ways and footprint matching,
  parody labels, source metadata and clear street approaches. No other code/docs.
- P2 pool: landmarks.js, landmarks-view.js, test_capital_landmarks.mjs. Actual
  sports-centre boundary/basin, referenced entrance architecture, bounded fences,
  gates/walls/deck/lawns/hedges. Export collision rectangles matching enclosure.
- P3 storefronts: new storefronts-view.js, test_capital_storefronts.mjs. Original
  mapped parody fascia/awning/doors at source-facing facades, useful approach
  markers/till interaction cues, locally generated original text. Preserve source
  buildings and merge/cull/dispose bounded geometry. No real logos.
- Root: services/progression/UI/controller/physical barrier integration, reference
  prose/manual/skill/runner, browser review/evidence and shipping.

## Store registry contract

stores.js exports frozen MAPPED_STORES and LEGACY_SHOP_IDS. Every mapped entry:
{id,name,type:'food'|'retail',x,z,radius,road,price:35,heal:35,robbery:180..350,
 sourceName,source:{type,id,lat,lon,version,timestamp},buildingId,
 building:{points,height},frontage:{x,z,yaw,width},district}.
name is the parody label; sourceName is provenance only and never game-facing.
x/z is a clear on-foot approach beside an actual public road, radius<=5.5m.
frontage.x/z lies just outside the matched building's street-facing edge; yaw
faces away from the building toward the approach. Include exact source position
separately; never describe an estimated entrance as an observed OSM entrance.
Map Coles Manuka as Coals, then a bounded useful selection of verified nearby
stores (about6–12) across Manuka/Kingston/Griffith/Red Hill where source exists.
All business labels are parodies, with case-insensitive aliases for map search.
Exclude sensitive/nonretail premises. LEGACY_SHOP_IDS=['crescent-kiosk','manuka-store']
keeps prior saved cooldown validation even when old fictional food markers retire.

Builder reads retained external OSM tiles, deduplicates exact element IDs,
records raw source hashes/date, finds source building footprint and a public
street-facing clear approach. Writes data/stores.json and generated stores.js
reproducibly. No network or source-map rebuild is required. Geometry/approach
checks use actual map polygons, no made-up coordinates or real business logos.

## Pool contract

Existing exact OSM basin58851110 and larger site51677758 are authoritative for
placement. Only inspected act-75267-0 is replaced. Preserve other community
buildings. Public heritage/operator references support rendered cream brick
Art Deco entrance, wrought-iron details and terracotta hipped roofs; record
observed vs inferred geometry. No new Street View claim without an actual view.
Export POOL_BARRIERS as frozen polygons/rectangles outside explicit gate gaps,
POOL_GATE_APPROACHES and the frozen basin. Root adds these to runtime collision
and water handling. Fixed gates remain passable; fenced spans block actors/cars.
Keep actual boundary/basin separation and no fence across the water. Render and
collision extents agree. Preserve Parliament/other landmark regressions/LOD.

## Integration and verification

Root replaces generic food services with mapped parody entries while preserving
fictional gym/arms services and old save cooldown keys. Map/search/sign/UI use
parody names. Robbery location/witness/equipment/timer/cooldown checks remain
Game-owned; remote or sandbox actions cannot earn. Use tighter storefront radius
and building sight checks where appropriate so another street cannot rob a till.
Normal desktop/phone Free roam views verify mapped signs/enclosure/gates; source
suites verify exact mapping, clear approaches, render/contact alignment, save
compatibility and robbery authority. Retain failures and distinguish normal input
from isolated source fixtures. Source milestones commit before inventory refresh.
