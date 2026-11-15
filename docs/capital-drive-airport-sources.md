# Canberra Airport local source extension

15 November 2026. This extends existing Capital Drive245. It adds no game, online
map tiles, airport service, airline identity or proprietary reference imagery.
The airport was outside both existing snapshots: the original map ended at
x3360.79 (149.174E), while the northern sidecar ended at x1816.64.

`data/airport.json` contains nine bounded official OpenStreetMap v0.6 map API
responses, fetched for149.169–149.217E and35.336–35.282S. Its `meta.source.files`
records every exact source URL, cache filename and SHA256. The snapshot is
OpenStreetMap contributors, ODbL1.0, with attribution and licence URLs retained.
The existing local data licence and credits cover OpenStreetMap; the new sidecar
contains no contributor/contact metadata. Original geometry is authored here.

There are1931road sections with shared source nodes, one-way/access tags and
Pialligo/Terminal Avenue approaches;826complete OSM building rings strictly east
of the old map edge;58closed water outlines; and120runway, taxiway and apron
features. No road segment bridges a clipped gap. Existing exact road segments
are deduplicated by the established map-expansion helper. Existing source
snapshots and their physical footprints remain intact.

The terminal is OSM way66860402, a107-point closed footprint. It remains a static
collision body while the dedicated view replaces its ordinary generated facade.
Its14m height, glazed bands, mullions and roof massing are original estimates.
The source terminal ring and runway axes are followed; this is an exterior
interpretation, not a surveyed floorplan, current terminal inspection or Street
View observation. The two sourced runway axes are12/30 and17/35; displaced
threshold sections remain separately identified in the source data. Taxiway
widths without source width tags are explicitly marked as estimates.

OSM aerodrome way456858759 supplies the airport boundary and `ele=575` tag.
The tag's vertical datum is unverified. A flat25m relative apron assumes it is
compatible with the game's existing550m datum. New eastern terrain blends over
1000m from the original source-grid edge to this estimate. Its boundary rows
align with the original terrain lattice so the seam preserves its exact source
heights. The new grid carries `estimated:true`; no sourced contour tile is
rewritten and no survey accuracy is claimed. Airport terrain, source buildings,
road renderers, cars and pedestrians use the same supplied height sampler.

`applyAirport(map,snapshot)` is a pure composition step after installing the north
terrain tile. It returns the new source map, estimated terrain tile, terminal
replacement ID and source airport tree clearing. The controller retains these
when assembling its ordinary replacement/clearing arrays. No teleport is added.
The searchable airport anchor is an interior source point of public Terminal
Avenue. The regression routes there and back from the original spawn on the
directed road graph, using Pialligo Avenue, and retains the terminal collision.

`createAirportView(scene,map,heightAt)` owns no clock or network operations.
It streams merged500m cells, allocates at most two cells per update, keeps at
most28resident cells, loads within1250m and evicts beyond1750m. Distant airport
geometry has zero resident buffers. Updates expose `pendingChunks` for the
controller's existing render gate. Each cell owns its geometry; eviction and
idempotent disposal release geometry, and final disposal releases the one shared
material. There are no textures or per-frame model factories.

Rebuild with a developer-only cache outside the repository:

```sh
python3 -B scripts/build_capital_airport.py --cache <external-cache> --fetch
node scripts/test_capital_airport.mjs
```

`--fetch` reuses the currently committed sidecar's pinned source manifest and
refuses changed live bytes. A reviewed new source snapshot requires explicit
source pin updates. The game reads only the bundled JSON. Native airport driving,
visual acceptance and N100 performance are separate checks; pure geometry and
route tests do not establish them.
