# Yarralumla and Western Lake bridge sources

Capital Drive now joins the existing Lady Denman Drive approaches across Scrivener Dam using the mapped road centreline. The earlier north-west and Molonglo imports stopped on opposite sides of the dam because their source boxes left a longitude gap.

The 227.2 m road span is OpenStreetMap way 76997565 version 12. Its two original node IDs still meet the approaches. Four added road runs close the gaps using way 50845453 from its earlier north-west endpoint to the eastern dam abutment, all of way 76997565, way 546708906 to its earlier Molonglo endpoint, and the missing middle of way 76997563 near the zoo. The National Capital Authority identifies Lady Denman Drive as the public road that crosses the dam. Its published normal lake level is 555.93 m AHD.
[Scrivener Dam](https://www.nca.gov.au/attractions/scrivener-dam) · [OSM source way](https://www.openstreetmap.org/way/76997565)

Twenty-two public cycleway, footway, path and bridleway bridges now have mapped centrelines and their immediate approaches. The 97.9 m shared-path span near Yarralumla and Government House is way 38013588. The parallel Kent Street cycleway crossing is way 1136952546. Smaller spans run beside Schlich, Weston, Loftus and Alexandrina Drive. The export retains the source geometry at both ends and follows each directly connected approach for at least 55 m when sufficient source way length remains. Path colours and widths are estimates where sources give no width. Motor routing and bus/traffic selection keep these paths separate from the streets.
[Lake shared-path source](https://www.openstreetmap.org/way/38013588) · [Kent Street shared-path source](https://www.openstreetmap.org/way/1136952546) · [ACT strategic path work](https://www.cityservices.act.gov.au/Infrastructure-Projects/programs/path-network-improvements)

The sidecar contains 66 runs and 259 source segments, including 23 tagged bridge runs across motor and nonmotor routes. It uses five SHA-256 pinned OpenStreetMap map API tiles. Every admitted path has a separately mapped connection at both ends. Restricted and disconnected facility paths and unsurveyed cross-sections remain outside this bounded extract. Existing ACT contour grids and regional packs retain their original bytes.
[OpenStreetMap attribution](https://www.openstreetmap.org/copyright)

```sh
python3 -B scripts/build_capital_west_bridge_links.py --west-cache <north-west-raw-directory> --scrivener-file <pinned-scrivener-tile> --output <external-output.js>
node scripts/test_capital_west_bridge_links.mjs
```

The regression checks the exact source endpoints, registered support corridors, public approach continuity, source segment ownership and normal GPS across the dam in both directions. It also checks that a motor route never shortcuts along a new cycleway.
