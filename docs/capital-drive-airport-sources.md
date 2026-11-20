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
The tag's vertical datum is unverified and is not used as the elevation authority
when the bundled ACT contour tile is available. The original flat25m relative
apron and1000m approach blend remain a fallback only when no valid elevation
tile is supplied; that fallback assumes compatibility with the550m game offset.

`applyAirport(map,snapshot,elevation)` composes the airport after the north
terrain tile. Normal loading supplies `data/airport-terrain.json`, described
below. Existing base/north grids remain unchanged, and the western seam retains
its exact prior sampler ownership. Airport terrain, buildings, road renderers,
cars and pedestrians share the supplied height sampler. The returned map also
retains the terminal replacement ID and source airport tree clearing.
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

19 November 2026 terrain continuation: `data/airport-terrain.json` samples the
same pinned ACT 2020 LiDAR-derived 2m contour archive as the northern tile:
https://actmapi-open-data.s3.amazonaws.com/DataDownload/GIS/Contours/2020/Contour_2m.gdb.zip
SHA256 `b8090f3ab023c2821747a760470eb8e53173c6d1b7a35dbb2a306885da7981b9`.
© Australian Capital Territory and Aerometrex Limited, CC BY 4.0, AHD;
550m is subtracted for the local
vertical origin. The 89 by 122 grid spans 149.169–149.217E, 35.336–35.282S at
49.54 by49.68m spacing. These are interpolated contours, not native DEM cells
or surveyed pavement levels. The builder records 106718 contour samples and
9190 finite held-out numerical checks (median absolute residual0.050m,
p95 0.590m, maximum8.388m); three further held-out predictions lay outside the
training convex hull. These checks measure internal interpolation consistency,
not independent terrain accuracy. The final grid has no missing cells or
nearest-neighbour fill. Smoothed source contours and approximately50m sampling
cannot reproduce every road cut, small embankment or terrain depression.

The eastern tile blends from the exact existing western seam over 350m.
Mapped runway axes receive an authored linear endpoint grade with a 45m shoulder
blend; this is gameplay engineering, not a surveyed airfield reconstruction.
Existing base/northern samples and bridge authority remain unchanged. No live
terrain service is called. Research checked on19 November2026:

- [ACTmapi imagery and elevation access](https://www.actmapi.act.gov.au/access-imagery-and-elevation)
  directs users to the official ELVIS elevation service.
- [ACT Government LiDAR data](https://www.planning.act.gov.au/professionals/survey-spatial/spatial-information/lidar-data)
  documents the2020 capture, datum choices, CC BY4.0 and requested ACT/Aerometrex attribution.
- [ACT contour item metadata](https://www.arcgis.com/home/item.html?id=8c12c8e2e9f340908164d4aab9355e28)
  identifies the2m contours derived from the2020 one-metre AHD DEM. The local
  game uses the pinned downloadable contour archive, not streamed vector tiles.
- [Geoscience Australia five-metre LiDAR WCS metadata](https://ecat.ga.gov.au/geonetwork/srv/api/records/22be4b55-2466-4320-e053-10a3070a5236)
  supplies an alternative official service and CC BY4.0 licence. Its bounded
  Canberra request returned an empty raster tile, so no WCS heights were used.

`airport-view.js` samples mapped runway/taxiway axes in at most25m strips rather
than stretching one endpoint plane through the terrain. `airport-road-details.js`
adds at most96 decorative reflector posts along source Terminal Avenue,
Pialligo Avenue and Majura approach centre lines. Shared `roadProfile` widths
place them outside the carriageway; private/no-access roads, bridge segments,
rail/airside tags and30m junction mouths/end clearances are excluded. Posts are
original estimated roadside details, not surveyed equipment or source-tagged
guardrails. They have no barrier collision and are merged into the existing
streamed cell geometry without a separate post mesh/material per object.

`stunt-ramps.js` places bounded original fictional equipment only in mapped park
corridors checked against roads, buildings, water and private access tags. These
are gameplay additions, not real Canberra facilities or assertions of public
vehicle access. Shared vertices and support planes drive rendering and vehicle
support. `vehicle-flight.js` and simulation integration handle ramp ascent,
airtime and landing; this is bounded arcade behaviour, not vehicle dynamics
validation. Park classification does not establish public driving permission.
The cap is six placements, with fewer admitted when mapped clearance checks fail.

Focused source checks are `scripts/test_capital_airport_terrain.mjs`,
`scripts/test_capital_airport_details.mjs` and
`scripts/test_capital_stunt_ramps.mjs`. Their fixtures check numerical/source
invariants, bounded presentation and shared support geometry. Native visual
acceptance and sustained target-device performance remain separate gates.
