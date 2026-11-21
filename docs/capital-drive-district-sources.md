# Manuka, homes and Civic source record

Owner-authorized continuation, 14 November 2026 (Australia/Sydney). Capital Drive
remains the existing original game245. No GTA code, missions, characters or assets
are used. The new six-chapter campaign is an original courier/depot story.

## Source geography and shopping

The original `canberra.json`, addresses and road-profile files remain unchanged.
The independent `canberra-north.json` overlay contains3,223 source road runs,
3,648 OSM outlines and the complete Lake Burley Griffin relation3400115:2,491
outer vertices and seven inner rings. Seventeen official OSM API snapshots,
including the full relation, have pinned URLs and SHA256 hashes in its metadata.
Runtime merging preserves node identities, directed roads and exact coordinates.
Overlap with existing ACT outlines is audited separately; lower-priority duplicate
OSM bodies are suppressed only while their paired base outline remains present.
OSM-derived layers remain ODbL1.0, © OpenStreetMap contributors.

The drivable rectangle extends north to35.268°S, through Commonwealth and Kings
Avenue bridges to Civic. The full lake polygon extends beyond its western edge;
this is not whole-Canberra or a complete drivable lakeside circuit. Island holes
remain holes in rendering and collision. Only source bridge corridors exempt
actors/vehicles from water collision. Parliament/Manuka Pool source boundaries
and the existing Street Life travel guard remain intact.

Twenty Manuka parody stores retain the seven old IDs; priority Civic restaurant
Lambzhou1919 is the twenty-first mapped store. Five distinct precincts use exact
retained outlines, named retail nodes and17 unique exterior footways. Actual
source names remain provenance/search aliases. Neighbouring facade units do not
overlap. Manuka Terrace's ACT body is replaced by original two-level architecture;
the other courts/arcades remain distinct places. No parking polygon was available
in this retained subset; no complete parking plan is asserted.

References inspected for architectural facts:

- [Manuka Terrace shop guide](https://www.manukaterrace.com.au/shop-guide): lower
  and upper public levels; no surveyed tenant/interior plan was obtained.
- [Manuka Terrace location](https://www.manukaterrace.com.au/find-us): Franklin
  Street/Flinders Way corner and parking access.
- [Griffith Neighbourhood Plan](https://www.gnca.org.au/wp-content/uploads/Griffith-Neighbourhood-Plan.pdf):
  separate Village/Court complexes, active retail frontages and The Lawns link.
- [NCA Scrivener Dam](https://www.nca.gov.au/attractions/scrivener-dam): normal
  full supply level555.93mAHD. The game uses this fixed design level,5.93m above
  its550m datum. This is not a live water-level feed; construction can lower it.

Existing Street View observations in `capital-drive-street-references.md` inform
materials, awnings, verges and canopy. No new image inspection is claimed in this
pass, and no proprietary imagery is bundled. Facades and estimated public doors
are authored interpretations of source outlines, not photogrammetry.

## Terrain, fencing and interiors

`north-terrain.json` samples the same pinned ACT2020 LiDAR-derived two-metre
contour archive as the base. © Australian Capital Territory, CC-BY4.0. The259×157
grid uses roughly25m cells,166,066 contour samples and a100m blending strip. The
base remains exact south of that strip. No grid cell uses a nearest-neighbour
fill. Held-out numerical consistency has p95 absolute residual0.618m and maximum
49.04m, with two unpredicted held-out samples; these are not independent survey
accuracy measurements. This is neither native DEM resolution nor bathymetry.
Bridge deck profiles are authored estimates, continuous at source-way joints;
terrain, water, road deck and camera heights have separate responsibilities.

Telopea's exact school site is OSM way233960420 v6,214 closed coordinates. The
same186 fence spans govern rendering and physical collision. Eleven openings
preserve mapped foot/cycleway crossings. No tagged gate hardware was available;
these are explicitly estimated openings. Source public road carriageways remain
clear, including where the amenity boundary overlaps a road margin.

House doors are shared with their rendered exterior descriptors. Interiors are
original plausible furnished living/kitchen/bed/bath layouts; they are not real
private floorplans. Retail rooms have shelves/counters. Canberra Centre's public
door and source exteriors anchor an original small concourse interpretation.
Only one entered interior has a generated plan and graphics at a time; leaving
discards it and returns to the same exterior approach. Room movement and camera
use those same walls. Commercial actions require the relevant indoor counter.
Approximate gardens derive from road/footprint relationships, not cadastral lots.

## Reproduction

Use retained pinned source caches, external output directories, existing
Python/Node and the repository root. Live OSM map-API replies can change; a future
fresh fetch must fail the recorded hash check rather than masquerade as the old
snapshot. Do not replace tracked data until byte comparisons and source review pass.

```sh
python3 -B scripts/build_capital_stores.py --cache <base-cache> --north-cache <north-cache> --output <stores-json> --module-output <stores-js> --precinct-output <precinct-json> --precinct-module-output <precinct-js>
node scripts/test_capital_stores.mjs --cache <base-cache> --north-cache <north-cache>
PYTHONPATH=<external-geodata-packages> python3 -B scripts/build_capital_north.py --cache <north-cache> --fetch --output <north-json>
PYTHONPATH=<external-geodata-packages> python3 -B scripts/build_capital_north.py --cache <north-cache> --output <north-repeat-json>
PYTHONPATH=<external-geodata-packages> python3 -B scripts/build_capital_north_terrain.py --source <pinned-ACT-contour-archive> --output <terrain-json>
python3 -B scripts/check_capital_drive.py
python3 -B scripts/test_capital_district_browser.py --output <fresh-external-directory>
```

The north importer also needs external Shapely for its footprint-overlap audit.
The optional terrain importer needs external NumPy, Shapely, Pyogrio, Pyproj and
SciPy. They are developer tools, not game dependencies. Runtime assets and data
are local. Compare generated files using `cmp` and SHA256; retain failed QA runs.
Native IntelN100/8GB performance remains unmeasured.

## Priority restaurant references

The owner specifically requested Lanzhou1919. The retained north tile
`osm-map-2-2.json`, SHA256
`9a5186374e5fd2df256dad728da76f1b958649f1635b4f2200b1dc94441a4e23`,
contains OSM node5656111023, version7, timestamp2025-09-14T21:26:26Z,
1919LanzhouBeefNoodle, level0, at35.2783536°S/149.1330983°E. It lies inside
Canberra Centre footprint way584970594. The source node has no address or mapped
restaurant entrance. An estimated6.2m facade unit faces source Bunda Street; it
is not the nearby mapped general mall entrance. The real name and the owner's
spelling are searchable aliases; game signs/services use Lambzhou1919, following
the earlier parody-shop instruction.

The [official branch page](https://1919lanzhoubeefnoodle.com.au/store/canberra-centre/)
confirms ShopEG11c Canberra Centre. The
[Centre directory](https://canberracentre.qicre.com/eat-and-drink/1919-lanzhou-beef-noodle/)
places it on the ground floor of Bunda Street opposite Garema Place. These are
business references, not transferred address tags from a neighbouring shop.

Two official photos were actually viewed on14November2026:
[Canberra-3](https://1919lanzhoubeefnoodle.com.au/wp-content/uploads/2022/09/Canberra-3.jpg)
and [Canberra-4](https://1919lanzhoubeefnoodle.com.au/wp-content/uploads/2022/09/Canberra-4.jpg).
The publisher's upload path is dated2022; capture dates are not established.
Observed cues include honey timber slats/cross-beams, warm strip lighting, cream
and grey tile, stainless open prep counter, orange banquettes, blue seating and
pale tables. Original room art uses these material/furniture cues, with original
menu swatches and dish details. No photo, wall mural, logo or text artwork is
bundled. Exterior fascia and complete floorplan remain authored estimates; no
new restaurant Street View panorama was inspected.

The dedicated exterior measures1,438triangles/three draws with a512×256 original
bitmap atlas and200m culling. Its four table/chair obstacle footprints are also
used by movement. The lazy restaurant room measures2,412triangles/one draw and
211,064geometry bytes, with no textures, extra lights or NPC allocation. It has
a two-metre entrance and clear central aisle/counter approach. These are bounded
adapter measurements, not a claim of photorealism or target-device performance.

Run the focused normal-input review with a fresh external output directory:

```sh
python3 -B scripts/check_capital_drive.py --browser --priority-shop-browser --output <fresh-external-directory>
```
