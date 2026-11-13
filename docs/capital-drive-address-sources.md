# Capital Drive offline address search

The Street Life branch adds an offline search index for the existing inner-south
Canberra district. `Games/Capital Drive/data/addresses.json` contains 3,446
explicit OpenStreetMap address records with 2,893 distinct labels. Coverage is
partial: absence from this index does not mean an address does not exist.

## Source and permission

Source: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright).
The original map importer downloaded the [OSM v0.6 map API](https://api.openstreetmap.org/api/0.6/map.json)
as an adaptive 3 by 3 tile snapshot for west 149.103, south -35.352, east
149.174, north -35.298. The existing geographic snapshot is dated 12 November
2026; the address extraction is dated 13 November 2026. This extraction reuses
those cached responses and makes no fresh network request or claim of live data.
See [the existing source record](capital-drive-sources.md).

The address JSON records the SHA-256 of each of the 18 original JSON responses,
source URL, license, extraction date, bounds and projection. The source responses
remain in an external developer cache; contributor account names and edit-history
metadata are not copied into runtime data. The distributable address database
retains ODbL attribution and source identifiers (`osm:node:ID` or `osm:way:ID`).

Only explicit `addr:housenumber` plus `addr:street` tags are used. There is no
interpolation of house numbers, reverse geocoding, inferred suburb or invented
address. Forty-five tagged relations are omitted because this importer does not
interpret relation geometry. Records whose representative point falls outside
the loaded district are omitted. Source `addr:suburb` is retained when present;
blank values remain blank. Identical labels can refer to several mapped objects,
particularly apartment complexes. The file preserves each source object, while
search displays an identical label only once.

## Location precision

Tagged nodes retain their source coordinate. Tagged ways use the polygon area
centroid for closed nondegenerate outlines, or mean vertices otherwise. A centroid
is an approximate location associated with the source address tag, **not** an
entrance, surveyed address point, delivery access point or safe vehicle spawn.
Concave outlines can place a centroid outside the outline. Root-owned arrival
collision checks remain necessary. Unit tags are not indexed individually.

Projection matches the geographic snapshot: origin 149.137 E, -35.318 latitude;
`x = (lon - 149.137) * 111320 * cos(-35.318 degrees)`;
`z = (-35.318 - lat) * 111320`. Local metres round to two decimals and geographic
coordinates to seven decimals. Neither rounding nor projection establishes survey
accuracy.

## Reproduce and verify

First obtain the existing external map-import cache using
`scripts/build_capital_drive_map.py`; its cached `osm.json` manifest names the
original tile responses. Do not put the raw cache in the repository. The address
importer uses only Python's standard library and reads the original responses,
including address nodes omitted from the map's ways-only derived `osm.json`.

```sh
python3 -B scripts/build_capital_drive_addresses.py --cache "$CAPITAL_DRIVE_CACHE" --date 2026-11-13
node scripts/test_capital_addresses.mjs
node --check 'Games/Capital Drive/address-search.js'
node --check scripts/test_capital_addresses.mjs
git diff --check
```

The output is deterministic for the same source responses/date. The importer
never fetches data and requires the explicit external cache path. SHA-256 hashes
can verify that the source response bytes match the recorded snapshot.

`createAddressSearch(map, addresses)` accepts the address array or the complete
JSON payload. It returns `search(query, limit=10)` and reads only supplied data.
Results have `{id,label,x,z,kind,detail}`; kind is `address`, `street` or `landmark`.
Supply the merged runtime landmarks through `map.landmarks`. Street results use
the halfway point along the longest mapped way with that name and explicitly say
there is no house number. They do not establish precise address coverage.
Search normalises case, punctuation, diacritics and common Australian street
suffixes. Exact number/street matches rank above partial matches. Queries with
unknown numbers do not fabricate house-number results or call a remote service.

The tests cover source metadata, all address coordinates/projection/bounds,
explicit labels, suffix and exact-number ranking, road/landmark distinctions,
immutable result descriptors, sampled actual-address queries, importer geometry,
and omitted unsupported/missing geometry. These are source and pure-logic checks;
they do not certify real-world address accuracy or browser UI acceptance.
