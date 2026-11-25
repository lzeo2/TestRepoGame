# Verified residential infill

`data/residential-supplement.json` adds actual OpenStreetMap residential building
outlines inside the existing Belconnen, north and south regional terrain. It
adds no roads, geographic bounds, terrain, fabricated houses or guessed parcels.
The retained mapped roads provide the surrounding street network.

© OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/).
See [OpenStreetMap attribution](https://www.openstreetmap.org/copyright) and the
existing [geographic data notices](../Games/Capital%20Drive/data/LICENSE.md).
The OSM-derived supplement is available under ODbL 1.0. Original facade art and
estimated heights do not establish surveyed architecture or private interiors.

The builder verifies every external raw tile against its retained manifest.
The bundle carries all three source manifests, URLs, SHA256 hashes and snapshot
dates, plus baseline map hashes. Every added building retains its source way ID,
version and timestamp. Coordinates use the retained [149.137, -35.318] origin,
rounded to centimetres. No raw source download or Python package is needed at
runtime. Raw cache files remain outside the repository.

| Source region | Explicit residential ways | Already retained | Eligible extra | Added |
| --- | ---: | ---: | ---: | ---: |
| Belconnen | 7,925 | 1,294 | 6,626 | 6,626 |
| North | 6,083 | 2,010 | 4,035 | 4,033 |
| South | 7,557 | 1,681 | 5,790 | 5,789 |

The 16,448 added footprints occupy 7,528,633 bytes. No eligible source candidates
were omitted by the 9,000-per-region safety allocation. Three mutually overlapping
extra outlines were rejected. Other omissions: 121 outlines overlap retained
footprints by more than five percent of the smaller polygon; five are invalid
or outside the 20–6,000 square metre housing scale; three are members of building
multipolygons and are omitted instead of filling their unprocessed holes.
The 4,985 already retained source ways keep their existing owners and geometry.

Coverage is limited to the filtered source pool inside the three mapped regions.
Untagged buildings, relation-only housing, unrecorded homes and streets beyond
the retained regional extent are outside that pool.
Known OSM residential tags include houses, detached and semidetached houses,
terraces, apartments, residential blocks, bungalows and cabins. Garages, sheds
and generic `building=yes` outlines are not guessed to be homes.

Heights use OSM height tags, then 3.2 metres per tagged level, then an explicit
four-metre massing estimate. Actual outlines remain unchanged. No inference of
occupants, private access, current tenancy or property floorplans is made.

## Reproduction and integration

The developer builder needs Shapely and the three existing regional raw caches:

```sh
python3 -B scripts/build_capital_residential.py --cache-root /path/to/external/cache-parent
node scripts/test_capital_residential.mjs
node scripts/test_capital_residential.mjs --render
```

The cache parent contains `capital-regions-belconnen`, `capital-regions-north`
and `capital-regions-south`. The builder also pins the seven existing map source
bundles, so a changed baseline must be deliberately rebuilt and reviewed.

Load the JSON locally through the existing game bootstrap and call
`applyResidentialExpansion(map, supplement)` after regional overlays and before
collision/index construction. The helper validates projection, residential tags,
closed polygons, finite heights and retained terrain coverage. It preserves
existing terrain, roads, bounds, places and all previous building references.
The existing streamed world renderer remains responsible for local geometry and
its 36-chunk resident cap. Source tests and CPU geometry measurements do not
establish browser/GPU performance or release acceptance.

## Bounded CPU measurements

A detached low-graphics source-map comparison measured initial streamed world
construction at 2,898 ms before and 3,084 ms after infill. Three added-home
viewpoints drained eight update calls each, loading at most two chunks per call.
Resident chunk counts stayed 16, 16 and 15 in both maps, below the existing cap
of 36. Buffers changed from 3.6/2.3/2.6 MB to 5.9/2.3/2.7 MB for the sampled
Belconnen/north/south views. Triangles changed from 50,834/31,875/35,854 to
82,468/31,935/38,486. These are single CPU geometry samples with mocked canvases,
not frame-rate or device benchmarks. Composition took approximately 57–78 ms;
the composed simulation index took approximately 0.94–1.13 seconds.

The external-cache deterministic rebuild matched SHA256
`172717ae6ab5e4d1205d220b2f55533094b11e1fb8e7a2b713f4b2422edfc5a9`.
