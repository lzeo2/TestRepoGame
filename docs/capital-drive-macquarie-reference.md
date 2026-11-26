# Macquarie shop exterior reference

23 November 2026. An original detail overlay decorates the existing Macquarie
Place retail bodies `osm-807686377` and `osm-807686378`. Their source geometry,
heights, collision and road ownership remain unchanged. The source is the pinned
Belconnen OSM tile `belconnen-1-1.json`, SHA256
`31efb13b871c068aaed1960280ade85e82818249085e26f5d76a16a1c9e39c51`,
under [ODbL1.0](https://www.openstreetmap.org/copyright).

Two ACT Government photographs were actually displayed during the reference
review, on the [completed Macquarie shops project page](https://www.cityservices.act.gov.au/Infrastructure-Projects/programs/suburban-infrastructure-program/completed-projects/macquarie-shops-improvements):

- [Shop-edge paving and brick wall](https://www.cityservices.act.gov.au/__data/assets/image/0012/2898363/macquarie-mural-1.jpg)
- [Planting, masonry and public utility furniture](https://www.cityservices.act.gov.au/__data/assets/image/0004/2898364/macquarie-mural-2.jpg)

The observed features were pale rectangular-jointed concrete, low brick walls,
pale corrugated roof fascia, dense shrubs near mature trees, dark mulch and low
irregular stone retaining masonry. The overlay uses original shallow mortar
courses, fascia strips, draped paving joints, low shrub clusters and ground-level
masonry edging. It copies no photograph, mural, logo or other artwork. Locations
and dimensions of these decorative details are estimates; the source does not
establish an exact camera pose or measured paving width. The playground fringe
used for optional low planting follows OSM way647917559; original parking-aisle
ways28015944/517269096/1065864503/1065864505/1065864514/1189754470 exclude all
decorative ground strips, including aisles omitted by the broader road overlay.

The ACT [copyright page](https://www.cityservices.act.gov.au/copyright) permits
unaltered personal/non-commercial organisational copying and otherwise requires
permission to copy, adapt, publish, distribute or commercialise site material.
These photos are reference observations, not CC-licensed game assets. Google
Street View was blocked by an unusual-traffic check after one ordinary reload;
this work makes no Google Street View observation claim. The two photos cover
one shop site, rather than the planned random residential/arterial sample.

`createMacquarieShopsView(scene,map,heightAt,{canStand})` returns
`update(focus)`, `dispose()` and `stats`. `canStand` optionally applies the existing
simulation's actor clearance. The folded pale-metal fascia follows both mapped roof perimeters. Its repeating
profile is generated locally in a 512-byte texture with mipmaps. The muted
folds resolve smoothly as the player drives away. Other surfaces sample a
flat strip in that same texture. One merged Lambert mesh hides beyond
320m; the capped allocation is2200triangles. Exact current geometry and physical
paving clearance are checked by:

```sh
node scripts/test_capital_macquarie_shops_view.mjs
```

The test checks actual bundled Belconnen bodies and terrain, every paving vertex
against source collision, denial of all ground detail when the supplied clearance
fails, bounded geometry, stable updates, distance hiding and idempotent disposal.
Native visual acceptance and device frame rate remain integration checks.
