# Capital Drive geographic data

Snapshot imported on 12 November 2026. This directory contains real geographic
data converted for an original driving game. The game has no runtime dependency
on the source services. Geographic data does not imply endorsement by its
contributors or public agencies.

## OpenStreetMap roads, green areas and supplementary building outlines

© OpenStreetMap contributors. Available under the
[Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
See [OpenStreetMap copyright and attribution](https://www.openstreetmap.org/copyright).
The OSM-derived database layers in `canberra.json` remain available under ODbL;
the separately attributed ACT and terrain layers retain their source terms.

Source: the official OpenStreetMap v0.6 map API,
`https://api.openstreetmap.org/api/0.6/map.json`, downloaded as eighteen adaptive
bounding-box tiles and unioned by object type and ID. The enclosing extent is
149.103 to 149.174 degrees east and -35.352 to -35.298 degrees north.
312,757 unique OSM objects supplied the snapshot. Output retains 5,197 drivable
road runs, 1,464 green/water polygons and 4,860 supplementary building outlines.

Changes: road geometry is clipped to contiguous runs of source nodes inside the
extent. No road links are invented across clipped gaps. Source node IDs preserve
junction topology. Coordinates are projected into local metres, rounded to two
decimals. Widths, speeds and building heights use source tags where available
and explicitly estimated defaults otherwise. Non-driving paths are omitted.
OSM building outlines are omitted when their centre is within fifteen metres of
an ACT footprint centre; this heuristic can leave overlaps or omit distinct
small structures. Public accessibility and current road restrictions are not
certified. This is a game map, not navigation or surveying data.

## ACT building footprints

© Australian Capital Territory. Licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
[ACTmapi data terms](https://www.actmapi.act.gov.au/terms-and-conditions) apply.

Dataset: ACTGOV_BUILDING_FOOTPRINTS, ArcGIS item
[`ec6743ed841841ec83dc6c69c9b80dd9`](https://www.arcgis.com/home/item.html?id=ec6743ed841841ec83dc6c69c9b80dd9).
The publisher describes this as a static dataset no longer being updated, derived
from several sources including LiDAR. Its item metadata explicitly names the
Australian Capital Territory and CC BY 4.0.

Source service:
`https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_BUILDING_FOOTPRINTS/FeatureServer/0`.
The extent query requested geographic coordinates (outSR=4326), ordered by
OBJECTID, in five pages: 1,000 + 1,000 + 1,000 + 1,000 + 544 features. Duplicate
OBJECTIDs are removed. The 4,544 features produce 4,663 exterior polygon parts.

Changes: local metre projection, two-decimal rounding, exterior rings only;
polygon holes are not rendered. Building height is **not** supplied by this
dataset. The 3.8/6.5/10 metre heights are visual estimates based on footprint
area. Facades, roof treatments and colours are game artwork, not surveyed detail.

## Terrain

Mapzen terrain tiles. Global GMTED2010 and SRTM terrain data courtesy of the
U.S. Geological Survey. Australia terrain data © Commonwealth of Australia
(Geoscience Australia) 2017, licensed under
[Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).
USGS SRTM/GMTED data are public domain. Attribution does not claim that every
listed source contributes to every sample or identify an unverified per-pixel
source lineage.

Source: six zoom-13 Terrarium PNG tiles from
`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/13/{x}/{y}.png`, x=7488
through 7490, y=4955 through 4956. Decoding uses
`height = red * 256 + green + blue / 256 - 32768` metres. A regular 129 by 129
nearest-pixel sample grid is stored after subtracting a 550 metre datum; terrain
values are rounded to two decimals. Resolution and resampling cannot reproduce
kerbs, retaining walls, bridges or exact road grading.

The complete supplied upstream [terrain attribution notice](terrain-attribution.md)
is retained. Source documentation:
[Tilezen/Joerd attribution](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)
and [data sources](https://github.com/tilezen/joerd/blob/master/docs/data-sources.md).

## Reproduction and integrity

Run `python3 -B scripts/build_capital_drive_map.py --cache <external-cache> --fetch`
from the repository root with Python, curl and Pillow available. Raw network
responses stay outside the game directory. Rebuilding from a populated cache
does not require network access. Re-fetching later may change upstream data.

`canberra.json` records the import date, source counts and SHA-256 hashes for the
exact consumed OSM tiles, merged OSM extract, ACT pages/metadata, six terrain
tiles and terrain source/attribution documentation. The raw files are not runtime
assets. Landmark coordinates identify approximate exploration destinations;
school and neighbourhood names do not imply affiliation. All seven destination
anchors lie beside the largest connected drivable road component.
The Kingston Foreshore destination uses source OSM node 102279215 on Eastlake
Parade, rather than the earlier approximate point beyond the drivable streets.
