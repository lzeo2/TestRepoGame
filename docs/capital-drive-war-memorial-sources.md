# Australian War Memorial public exterior

The original exterior model was added on 22 November 2026. The gallery heist now
uses a playable entrance on the Memorial's main game building. The gallery and
its exhibition, staff, entrance and campaign objectives are original game designs.

The local source is the same pinned OpenStreetMap northern snapshot used by
`data/canberra-north.json`. The developer-only builder reads the external cache;
the game imports the compiled, approximately 20 KB `war-memorial-data.js` directly.
It makes no additional runtime request and includes no photographs, logos,
proprietary textures or third-party model.

## Source and placement

OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/),
[attribution](https://www.openstreetmap.org/copyright). The pinned tile is
`osm-map-3-2.json`, from the official API's
[bounded map export](https://api.openstreetmap.org/api/0.6/map.json?bbox=149.14350000000002%2C-35.2855%2C149.157%2C-35.27675).
Its SHA256 is
`472a108371afbdcaa9c0427d0321b4eff9f4892316a6e56d4fd4fc424c5dc335`.
The source review date is 22 November 2026; this is not a claim about the cache's
retrieval date. Per-feature source edit timestamps and versions are retained in
the compiled data.

| Public source | Use |
| --- | --- |
| [relation 7527080](https://www.openstreetmap.org/relation/7527080), version 4 | Named Memorial multipolygon; identifies outer and courtyard rings |
| [way 5090724](https://www.openstreetmap.org/way/5090724), version 21 | Exact 61-point closed outer ring, tagged 11.2 m height and `#dacbbe` building colour |
| [way 520199710](https://www.openstreetmap.org/way/520199710), version 6 | Exact 10-point closed courtyard hole in the roof |
| [way 520199707](https://www.openstreetmap.org/way/520199707), version 3 | Source tower outline and tagged 21.7 m height |
| [way 520199676](https://www.openstreetmap.org/way/520199676), version 2 | Source 17-point dome base, 28.7 m total height, 7 m roof height |
| [way 1343905213](https://www.openstreetmap.org/way/1343905213) | Public Parade Ground polygon |
| ways 1489603134/35/36/41/42,1489603154/55/56,1489430294 | Nine further public paved/terrace polygons; 1489603142 is tagged as a step area |
| ways 1489603112–29,1489603153 | Nineteen exact grass polygons around the public forecourt |
| ways 1489603132/33,1489603143–50 | Ten public footway lines; their rendered 2 m width is estimated |

All source IDs, versions, source URLs, safe geometry tags and exact projected
points are available in the compiled data. The origin remains 149.137° E,
35.318° S, using the existing equirectangular metres with x east and z south.
The named `australian-war-memorial` pin is at x 1085.71, z −4164.17 and references
the existing `osm-5090724` building. The dome centre is approximately
x 1095.61, z −4178.02. The public Parade Ground lies around x 968.22, z −4003.72;
the mapped stair-area approach around x 1019.51, z −4074.01 remains physically
clear under the existing building-collision owner.

## Interpretation and physical limits

The source plan defines the building silhouette, courtyard hole and dome base.
The sandstone courses, window/pilaster pattern, cornices, copper-toned dome
facets and tread joints are original architectural estimates. They are not
surveyed details or a claim that imagery was inspected. In particular, the OSM
dome source tags describe glass and its approximate shape; the muted copper/green
presentation is an authored visual interpretation. No claim is made that the
source's tagged heights or materials represent a surveyed, current building.

The source terrain remains authoritative. Public surfaces are subdivided to
approximately 7 m edges and draped 0.055 m above the existing terrain; decorative
tread joints sit 0.08 m above it. There are no invented raised physical stair
platforms. The main model's roof uses the tagged 11.2 m height above a horizontal
foundation datum derived from the maximum terrain height along the outline.
Existing sampled ground varies approximately 4.39 m across that outline, so this
is a simplified foundation estimate rather than a measured architectural level.

`prepareWarMemorial(map)` retains the original road, building and terrain
references. It checks source footprint agreement and suppresses only the
corresponding generic building draws. The original courtyard and exterior remain
in the collision owner. An authored door cue uses the actual exterior polygon and
transitions to the lazy gallery room. Only the mapped main footprint and public
paving polygons exclude random trees.

Black Mountain Tower follows the same room transition at its mapped tower base.
The Manuka branch of Civic Mutual Bank uses ACT footprint `act-87705-0` and the
public bank point [OpenStreetMap node 439239484](https://www.openstreetmap.org/node/439239484)
in the pinned southern map cache, version 4. The door, the branch name and the
vault-symbol game are authored designs. The existing Civic branch retains its
own robbery and cash handover.

## Integration and verification

Apply `prepareWarMemorial(map)` after the northern map composition and before
constructing generic world geometry. Create
`createWarMemorialView(scene,map,terrainSampler.groundHeightAt)`, pass the existing
focus to `update(focus)` in the controller's loop and call `dispose()` on teardown.
The view owns no loop or gameplay state. `buildWarMemorialGeometry(site,heightAt)`
is separately exported for source tests.

The model has 7,469 triangles: 5,905 in the body/public grounds and 1,564 in the facade
and terrace detail. Two merged meshes share one locally owned Lambert material.
Their position, colour and normal buffers total 806,652 bytes. The detail hides
beyond 520 m; the complete model hides beyond 3,000 m. Updates create no geometry;
disposal releases both buffers and the shared material exactly once.

Rebuild from the existing external northern cache:

```sh
python3 -B scripts/build_capital_war_memorial.py --source-cache /path/to/north-cache
node scripts/test_capital_war_memorial.mjs --source-cache /path/to/north-cache
```

The builder verifies the exact pinned raw hash before reading source elements.
The optional source-cache regression rebuilds twice and compares both outputs
byte for byte with the compiled module. The normal regression needs only the
repository files:

```sh
node scripts/test_capital_war_memorial.mjs
```

The 22 November source run passed: exact source footprints, unchanged physical
owners, roof triangle area excluding the full courtyard hole, complete placement
within existing map bounds, finite source-terrain buffers, a physically clear
public approach, bounded geometry, distance visibility and idempotent disposal.
This source/Three geometry check does not establish native visual acceptance,
historical architectural accuracy or measured device frame rate. The controller,
offline cache closure, attribution link and native review remain the integration
owner's responsibility.
