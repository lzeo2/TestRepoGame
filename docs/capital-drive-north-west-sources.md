# Northern and western Canberra street extension

21 November 2026. This is a bounded extension of existing Capital Drive245,
separate from the retained Civic, airport and original inner-south snapshots.
It adds source streets, source place labels and contour-derived ground. It adds
no buildings, interiors, surveyed entrances or invented connecting roads.

The northern source box is149.110–149.153°E,35.272–35.235°S. The western box
is149.075–149.112°E,35.322–35.268°S. Twelve official OpenStreetMap map-API
responses are pinned by exact URL, filename and SHA256 in
`data/north-west.json`. Raw responses remain in an external developer cache.
© OpenStreetMap contributors, ODbL1.0; the established attribution remains in
the game. Source place nodes identify Dickson, Lyneham, O'Connor, Turner,
Yarralumla and Black Mountain. These are map labels, not asserted entrances.
Acton already lies within the retained Civic snapshot; this pass extends the
streets west of it rather than manufacturing a new Acton centre.

The sidecar adds3,129road runs/14,735segments/17,864points, approximately1.33MB
of JSON. Shared OSM endpoint IDs, exact projected coordinates, one-way,
roundabout, access, sidewalk, speed and directional speed tags remain intact.
Segments already in the three pinned existing snapshots are excluded by their
unordered source-node pair. Widths and untagged speed defaults are estimates.
The boundary retains the full already-sourced western lake shore. Real clipped
road ends and access-restricted service branches are retained; whole-city road
coverage is not claimed.

The new ground tile comes from the retained ACT2020 LiDAR-derived2m contour
archive, SHA256
`b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9`.
© Australian Capital Territory, CC-BY4.0. The builder uses the same EPSG7855
linear interpolation and550m AHD datum offset as the Civic terrain importer,
with approximately100m cells. This is resampled contour terrain, not a native
DEM, bathymetry or surveyed road grades. No nearest-fill cells are permitted.
Earlier25m and airport terrain retain priority. A150m transition outside prior
coverage meets its exact edge heights; this transition is an authored seam,
not an additional elevation observation.

The existing streamed street adapter handles the new roads. No new building
geometry, timers, texture, runtime network source or separate traffic fleet is
added. Graph growth and JSON size are separate from browser RAM and device FPS;
N100 performance and native travel acceptance remain unmeasured.

Reproduce with pinned external sources and existing developer geospatial tools:

```sh
python3 -B scripts/build_capital_north_west.py --cache <external-osm-cache> --fetch
python3 -B scripts/build_capital_north_west.py --cache <external-osm-cache>
python3 -B scripts/build_capital_north_west_terrain.py --source <pinned-act-archive>
python3 -B scripts/test_capital_north_west_builder.py
node scripts/test_capital_north_west.mjs
node scripts/test_capital_game_data.mjs
```

The final cache manifest/build stamp must be regenerated after integrating this
isolated source lane with the release branch. Cache authority requires the
whole ten-file map set; an older worker falls back to ordinary local loading.

## Northern premises and Giant Spray

The subsequent update imports 33 selected building footprints and nine mapped
premises from the same pinned OpenStreetMap cache. The set includes Dickson
Library, Dickson Village, Daramalan College, Dickson College, Lyneham High,
St Ninian's, ABC Canberra and Black Mountain Tower. The tower uses OSM
way 37693613 and its tagged 195.2 m height. Its model is an original
interpretation. The archive room and robbery are fictional game content.
Other heights come from tagged levels where available and estimates elsewhere.

Eight northern stores use exact retail POI nodes and their containing source
footprints. Display names are original parodies. The frontage allocator
checks public roadside approaches and non-overlapping windows. In-game
entrances are estimated from the building footprints.

Giant Spray uses Big Splash's source perimeter (way 27480300), four pool
outlines and six slide centerlines. The game's empty pools, worn slides
and sign are an original abandoned-waterpark interpretation. The separate
`giant-spray.json` overlay retains only 47 public road runs around the park
and its connections to the existing map. Its metadata pins the raw OSM
map API tile, exact feature identifiers and source versions. OSM contributors
retain ODbL 1.0 attribution. The updated contour grid covers both western
overlays and retains its ACT and Aerometrex CC BY 4.0 attribution.

```sh
python3 -B scripts/build_capital_giant_spray.py --help
python3 -B scripts/build_capital_stores.py --help
python3 -B scripts/build_capital_north_west_terrain.py --source <pinned-act-archive>
node scripts/test_capital_giant_spray.mjs
node scripts/test_capital_north_places_view.mjs
```
