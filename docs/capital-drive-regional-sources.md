# Capital Drive regional expansion

23 November 2026. Three locally cached source packs extend the drivable map
with 11,213 road sections, 6,929 building footprints and 61 searchable places.
Shared source nodes connect the new roads to the retained network. Road names,
one-way tags, speed tags and exact source geometry are retained where available.
The importer bounds the subset and omits private roads, driveways and parking
aisles from the extensions.

A second residential pass restored 704 complete, non-overlapping OpenStreetMap
footprints in Downer, Watson, Gungahlin, Woden and Greenway. Each checked 750 m
window now retains at least 75% of the eligible source-mapped homes. Total source
coverage varies by suburb. The original terrain, roads and retained bodies are
preserved. The two revised packs add about 276 KB to the offline bundle.

| Region | Coverage | Selected places |
| --- | --- | --- |
| Belconnen | Town centre, Bruce, the university approaches and surrounding streets | Westfield Belconnen, Belconnen Library, Arts Centre, AIS Arena, Canberra Stadium, University of Canberra, Lake Ginninderra |
| North Canberra | Inner north east, Watson and Hackett, Mitchell and Gungahlin | Exhibition Park in Canberra, Watson Shops, Hackett Shops, Gungahlin Public Library, Marketplace Gungahlin, Gungahlin Leisure Centre, Yerrabi and Gungahlin ponds |
| South Canberra | Woden, Garran and the connected corridor to Greenway | Woden Library and Town Square, Canberra Hospital, South Point Tuggeranong, Tuggeranong Library, Town Park and Lake Tuggeranong |

Each region JSON records its bounding boxes, official OpenStreetMap v0.6 API pulls
and SHA-256 pins. The source packs retain complete lake outlines and their island
rings. The [landmark selection](../scripts/capital_region_landmarks.py) records the
public source IDs used for named places and selected architectural footprints.
Where a wider district and a suburb share a name, search and the driving HUD use
the local suburb marker.
Façade treatments and untagged heights are original visual estimates. Pools of
regional façade meshes only display near the player. Generic buildings and exact
source colliders retain their existing owners. © OpenStreetMap contributors,
[ODbL 1.0](https://www.openstreetmap.org/copyright).

The regional grids sample the pinned ACT 2020 two-metre contour archive at about
100 m spacing. Existing terrain receives priority, with a 150 m blend at joins.
Water heights are estimates derived from shoreline contours where an elevation
tag is absent. The navigable regions are bounded source snapshots. All other
architecture and render budgets are maintained by the existing simulation and
streamed rendering owners. © Australian Capital Territory, CC BY 4.0.

The renderer subtracts higher-priority terrain rectangles before drawing the
regional grids. It lowers visible ground inside the mapped water outlines and
keeps the island holes. A 25 m sample of the four lake meshes reduced exposed
ground from 5.7–9.7% to at most 0.47%. Small patches can remain at the shoreline.
The road and collision elevation samplers retain the source grid.

Source tests verified six two-way trips, 127 shared seam nodes, offline landmark
search, the existing career save and all four lake boundaries. A separate audit
checked car clearance at 1,312 routed arterial lane midpoints. Those samples are
distinct from driving an entire route with player input.

## Rebuild

Keep the raw caches and developer geospatial environment outside Git. The map
builder checks each raw file against its pinned manifest. Use the retained ACT
contour archive and install its Python dependencies outside the checkout.

```sh
python3 -B scripts/build_capital_region_terrain.py \
  --source /path/to/Contour_2m.gdb.zip \
  --extent 149.02 -35.46 149.20 -35.16 --cell-metres 100 \
  --output /path/to/regional-grid.json
python3 -B scripts/build_capital_regions.py --region belconnen \
  --source-cache /path/to/capital-regions-belconnen \
  --terrain-grid /path/to/regional-grid.json \
  --output 'Games/Capital Drive/data/region-belconnen.json'
python3 -B scripts/build_capital_regions.py --region north \
  --source-cache /path/to/capital-regions-north \
  --terrain-grid /path/to/regional-grid.json \
  --earlier-region 'Games/Capital Drive/data/region-belconnen.json' \
  --output 'Games/Capital Drive/data/region-north.json'
python3 -B scripts/build_capital_regions.py --region south \
  --source-cache /path/to/capital-regions-south \
  --terrain-grid /path/to/regional-grid.json \
  --earlier-region 'Games/Capital Drive/data/region-belconnen.json' \
  --earlier-region 'Games/Capital Drive/data/region-north.json' \
  --output 'Games/Capital Drive/data/region-south.json'
python3 -B scripts/build_capital_cache.py --write
node scripts/test_capital_regions_actual.mjs
```

The terrain source is the ACT [contour archive](https://actmapi-open-data.s3.amazonaws.com/DataDownload/GIS/Contours/2020/Contour_2m.gdb.zip).
Its source hash and interpolated-grid hash are carried in each generated terrain
record. The source build reports support from observed contours. These grids do
not supply surveyed bridge elevations, current water levels or game interiors.
