# Capital Drive geographic data

Snapshot imported on 12 November 2026, enriched on 13 November 2026. This directory contains real geographic
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
312,757 unique OSM objects supplied the snapshot. The enriched output retains
5,197 drivable road runs, 1,464 green/water polygons and 4,886 supplementary OSM
building outlines. The initial snapshot retained 4,860 OSM outlines.
Actual polygon-overlap checks now replace
the original fifteen-metre centre-distance heuristic, preserving distinct close
neighbours and suppressing overlapping geometry from lower-priority sources.

Changes: road geometry is clipped to contiguous runs of source nodes inside the
extent. No road links are invented across clipped gaps. Source node IDs preserve
junction topology. Coordinates are projected into local metres, rounded to two
decimals. Widths, speeds and building heights use source tags where available
and explicitly estimated defaults otherwise. Non-driving paths are omitted.
The initial snapshot omitted OSM building outlines when their centre was within
fifteen metres of an ACT footprint centre. The enriched snapshot instead uses
the polygon-overlap priority described below. Public accessibility and current
road restrictions are not certified. This is a game map, not navigation or surveying data.

## Explicit address index

The separate `addresses.json` index also derives from the same OSM snapshot,
© OpenStreetMap contributors, ODbL 1.0. It retains 3,446 explicit house-number
and street tags with source object IDs. Tagged nodes retain coordinates; tagged
ways use approximate representative centroids. Missing numbers are never
interpolated or invented. The index retains input hashes and import metadata;
its coverage does not certify current addresses or entrance locations.

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

### Current model: ACT 2020 LiDAR-derived contours

© Australian Capital Territory, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
The current 513 by 513 terrain grid is interpolated from the official
[2020 two-metre contour download](https://actmapi-open-data.s3.amazonaws.com/DataDownload/GIS/Contours/2020/Contour_2m.gdb.zip).
The [ACTmapi source item](https://www.arcgis.com/home/item.html?id=8c12c8e2e9f340908164d4aab9355e28)
identifies its source as the 2020 one-metre AHD LiDAR DEM, mosaicked/resampled,
adaptively smoothed, contoured every two metres from base elevation 550m, and
generalised with 0.06m tolerance. This is an interpolated contour-derived terrain
model, **not the original one-metre DEM or a claim of one-metre accuracy**.

The bounded extraction includes 2,130 source contour features and a 300m margin.
187,807 unique samples at ten-metre line spacing are triangulated linearly in
MGA2020 (EPSG:7855), then evaluated at the geographic output grid. Cells are
approximately 12.60 by 11.74 metres. Heights are in AHD metres minus the existing
550m game datum. Elevation ranges from 556 to 810m AHD. Every grid cell lies
inside the source sample convex hull; no old Mapzen, nearest-neighbour or
invented-height filling is used. Contour interpolation can flatten local extrema,
span unsampled depressions and omit kerbs or abrupt road cuts.

Held-out interior samples of long contours have median absolute residual 0.071m,
p95 0.609m and maximum 37.615m. These are interpolation consistency measurements,
not independent survey accuracy; the maximum outlier remains a limitation.
The final model uses every source sample, including the validation samples.
Compared with the old terrain at aligned grid locations, median change is -3m,
p95 absolute change 8.12m, maximum absolute change 86m. Different source, datum
handling and resolution prevent interpreting these differences as measured
absolute error. See [quantitative checks](geodata-validation.json).

The public Geoscience Australia 2025 five-metre LiDAR WCS was also checked.
Its Canberra subset contained 1,350,630 zero-valued cells and was rejected.

### Historical terrain source, retained attribution

The initial 129 by 129 Mapzen grid is superseded by the ACT contour model.
The following source and modifications describe that earlier snapshot.

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

Run `python3 -B scripts/build_capital_drive_map.py --cache <external-cache> --fetch --fetch-details`
from the repository root with the developer dependencies listed below. Raw network
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

## Additional Microsoft outlines

Microsoft GlobalML Building Footprints, licensed under the
[Community Data License Agreement Permissive 2.0](CDLA-Permissive-2.0.txt).
[Publisher source and release details](https://github.com/microsoft/GlobalMLBuildingFootprints).
The official Australia quadkey 311230302 file in the 2026-02-03 distribution
(indexed upload 2026-02-23) supplies 9,320 candidate outlines in this district.
It is a machine-derived satellite imagery dataset; individual capture dates and
on-ground existence have not been independently verified. The distribution date
is not the date each building was surveyed. Heights are satellite-derived
estimates when provided, otherwise explicit visual defaults.

3,023 candidates add missing outlines after actual polygon-overlap rejection
against ACT and OSM sources. Priority is ACT, then OSM, then Microsoft. A candidate
is suppressed when intersection area exceeds 35% of the smaller outline's area;
this conservative heuristic is not cadastral reconciliation. No random houses
are generated. Source identifiers retain the quadkey and original record index.
Total output is 12,572 outlines, 3,049 more than the initial snapshot.

Rebuild enriched sources with `--fetch-details`; this developer import additionally
requires NumPy, Shapely, SciPy, Pyogrio/OpenFileGDB and Pyproj, installed outside
the repository. The pinned official Microsoft tile and ACT contour archive stay
in the external cache. The runtime only reads the resulting local JSON.
