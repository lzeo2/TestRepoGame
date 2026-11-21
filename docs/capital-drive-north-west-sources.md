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
