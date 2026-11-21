# Living Civic source notes

14 November 2026, Australia/Sydney. Existing Capital Drive245; no new game or
catalog registration. Source data is kept distinct from original game activities.

## Restaurant references actually inspected

The priority parody remains **Lambzhou 1919**, searchable by the real restaurant's
name, 1919 Lanzhou Beef Noodle. The official directory places it on Bunda Street
opposite Garema Place:
<https://canberracentre.qicre.com/eat-and-drink/1919-lanzhou-beef-noodle/>.

Root visually inspected these official Canberra interior photographs:

- <https://1919lanzhoubeefnoodle.com.au/wp-content/uploads/2022/09/Canberra-3.jpg>
- <https://1919lanzhoubeefnoodle.com.au/wp-content/uploads/2022/09/Canberra-4.jpg>

Observed cues include honey timber slats/crossbeams, warm strips, cream/grey tile,
blue chairs, orange banquette and a long stainless preparation/pass counter on
**the left of the entrance aisle**, with dining on the right and a rear-right
booth. The active room now follows that relative arrangement. Its dimensions,
furniture spacing and navigable stations are original estimates, not a measured
floorplan. The chef/server and diners are fictional adults.

A Canberra exterior photograph was located through the public listing
<https://au.localitybiz.com/22867878/1919-lanzhou-beef-noodle-canberra> and actually
viewed by Root. Its image URL is:
<https://img.localitybiz.com/ANJU3Dv0_1iyVLdX_1GOONfYJjvyUPSxgiNxoo3rdOk-7avt4bQwCv6HHzHu9tv0ED4sbNesxo6qAwMjvFKcH5XiUESni6743-6ZbnM=s1600-w480>.
It supports the flush deep oxblood fascia, cream illustrated transom, dark tiled
right pier, black full-height frames and left chef display window. The unsupported
projecting awning/timber posts were removed. The retained source doorway is an
estimate; the photographed left-of-centre entrance is not claimed to be copied
exactly. Transient floral opening displays, logos, mural artwork and photos were
not reproduced or bundled. Runtime art is original procedural geometry.

The operator explicitly allowed Google Maps Street View after an automatic review
interpreted the earlier Sites restriction too broadly. Retrying the approved cloud
browser failed technically with “Browser Use could not read requirements.” No new
restaurant panorama was inspected and no Street View reconstruction is claimed.
The four earlier documented March2026 samples remain dated earlier evidence.

## Nearby stores and public space

`data/civic-extras.json` and the generated prefix of `civic-extras.js` retain exact
OSM POIs, matched source outlines, nine public walking paths and source URLs/hashes.
The original twenty Manuka descriptors and priority noodle descriptor are kept.
There are now **26 mapped parody shops**, plus two fictional gym/supplies services.

| OSM node | Source name | Game-facing parody | Source footprint |
| --- | --- | --- | --- |
| 890228732 | Impact Comics | Wham Comics | osm-232852302 |
| 10679626475 | Landspeed Records | Landspin Records | osm-232852302 |
| 8196052995 | Via Dolce | Via Doughce | osm-232852302 |
| 14065555895 | Good Games | Decent Games | osm-232852302 |
| 2161998101 | Happy's | Chappy's | osm-223616354 |

POI coordinates and footprints are source facts; facade units, entrances, room
plans, stock tasks, food, prices, staff and fictional robberies are authored.
Names of real businesses remain provenance/search aliases. OSM data remains
ODbL1.0, © OpenStreetMap contributors. This is a bounded source snapshot, not a
claim about the current tenancy of every shop.

## Civic skate park

ACT's `ACTGOV_Skate_Park_Assets` service identifies **CITY SKATE PARK**, asset
**SKPK6**, OBJECTID9, Cooyong Street. The exact polygon covers459.4356square metres;
it is broader than OSM way647898558. The item declares CC BY4.0, © Australian
Capital Territory. Item49edc3f1639f444bbbafa4e9fbffc6bc and the retained feature/item
responses are pinned by SHA256 in the builder. Source service:
<https://services1.arcgis.com/E5n4f1VY84i0xSjy/arcgis/rest/services/ACTGOV_Skate_Park_Assets/FeatureServer>.

Public ACT skate-park information and the descriptions at
<https://skatermaps.com/the-yard-skate-park/> and
<https://blog.skateboard.com.au/skateparks/australia/the-yard-skate-park/>
inform a miniramp, hip/bank, coping, rail and blocks. Feature positions and heights
are original interpretations within the ACT polygon. This is a walkable/rideable
park with ramps, not a skateboarding trick system.

The polygon cuts426.915square metres from the overlapping source body
`osm-584970594`, including its facade. The same polygon governs visible roof/wall
subtraction and collision clearance; the physical rail and ramp height sampler
share the rendered feature descriptors. The source footprint itself is unchanged.

## Reproduction

The existing north-map cache supplies all source OSM records. Keep raw downloads
outside the repository. From its root, use explicit output paths:

```sh
python3 -B scripts/build_capital_civic_extras.py --cache <north-cache> --act-cache <act-source-cache> --output <external-json> --module-output <external-module>
node scripts/test_capital_civic_extras.mjs
node scripts/test_capital_skate_opening.mjs
python3 -B scripts/check_capital_drive.py
python3 -B scripts/check_capital_drive.py --browser --living-browser --output <fresh-external-directory>
```

The builder validates the pinned inputs; it installs and downloads nothing.
Generate twice and byte-compare both outputs against the committed files. An exact
source polygon or passed geometry fixture does not establish visual fidelity,
survey accuracy, current business status or target-device performance.
