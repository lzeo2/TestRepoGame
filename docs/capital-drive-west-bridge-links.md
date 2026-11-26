# Yarralumla and Western Lake bridge sources

Capital Drive now joins the existing Lady Denman Drive approaches across Scrivener Dam using the mapped road centreline. The earlier north-west and Molonglo imports stopped on opposite sides of the dam because their source boxes left a longitude gap.

The 227.2 m road span is OpenStreetMap way 76997565 version 12. Its two original node IDs still meet the approaches. Four added road runs close the gaps using way 50845453 from its earlier north-west endpoint to the eastern dam abutment, all of way 76997565, way 546708906 to its earlier Molonglo endpoint, and the missing middle of way 76997563 near the zoo. The National Capital Authority identifies Lady Denman Drive as the public road that crosses the dam. Its published normal lake level is 555.93 m AHD.
[Scrivener Dam](https://www.nca.gov.au/attractions/scrivener-dam) · [OSM source way](https://www.openstreetmap.org/way/76997565)

A scan of 144 SHA-256 pinned map API tiles found 675 independently represented cycleway, footway, bridleway and track bridges. The 97.9 m shared-path span near Yarralumla and Government House is way 38013588. The Kent Street shared-path crossing, way 1136952546, now uses the nearby road crossing's separation from the two Adelaide Avenue carriageways. Biyaligee Boardwalk, Kate Slatter Walk, Butters Bridge and Drakeford Drive Overpass retain their own mapped geometry. The export follows source-connected approaches for 55 m, stopping at a source vertex, and records 65 source decks whose approach mapping is partial. Path widths are estimates where tags omit dimensions.
[Lake shared-path source](https://www.openstreetmap.org/way/38013588) · [Kent Street shared-path source](https://www.openstreetmap.org/way/1136952546) · [ACT path programme](https://www.cityservices.act.gov.au/Infrastructure-Projects/programs/path-network-improvements)

The importer excludes 25 restricted or inactive spans. Fifteen same-layer paths already covered across their full width by mapped road bridge geometry share that existing physical deck. Three mapped driveway decks remain local access surfaces. Eleven missing track and service spans are included among the nonmotor routes. Neither group is eligible for ambient traffic or bus routes. Existing ACT terrain and regional map source bytes retain their pins. Road and path elevations remain estimates, and missing approach nodes remain gaps in the source.
[OpenStreetMap attribution](https://www.openstreetmap.org/copyright)

The generated module contains 4,023 runs and 13,018 source segments including approaches. It occupies about 1.58 MB as local JavaScript. The game reads it through the existing map composition and streams its geometry in the normal world chunks. At composition, shared path coordinates are deduplicated against existing roads and the routing check finds the restored road crossing in both directions.

```sh
python3 -B scripts/build_capital_west_bridge_links.py --west-cache <north-west-raw-directory> --scrivener-file <pinned-scrivener-tile> --regional-cache <existing-regional-caches-parent> --output <external-output.js>
node scripts/test_capital_west_bridge_links.mjs
```

The regression checks the exact source endpoints, registered support corridors, public approach continuity, source segment ownership and normal GPS across the dam in both directions. It also checks that a motor route never shortcuts along a new cycleway.
