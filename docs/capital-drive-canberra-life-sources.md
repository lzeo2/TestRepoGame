# City-life source and reproduction record

14 November 2026. Existing OSM ODbL 1.0 and ACT CC-BY 4.0 attribution remains in
the game credits. Public pages below are references, not bundled assets. All
runtime code/data stays local; raw source caches and research images stay outside
the repository.

## Pinned source exports

`build_capital_street_assets.py` validates 18 raw south tiles and 17 north files
against the existing map manifests. The derived `osm.json` is not counted as a
second raw source. It exports 388 stop facilities from389 raw stop/platform
records, 13 fuel sites from15 raw records (12 petrol/one hydrogen), and24 named
fitness venues after excluding outdoor/unnamed/private cases. Exact source IDs,
tags, versions, timestamps, duplicate records and coordinate methods are retained.
Source way centroids are labelled as such; entrances/heading/furniture are estimates.

```sh
python3 -B scripts/build_capital_street_assets.py --cache <south-cache> --north-cache <north-cache> --output <external-json> --module-output <external-js>
node scripts/test_capital_street_assets.mjs --cache <south-cache> --north-cache <north-cache>
python3 -B scripts/build_capital_highway_barriers.py --cache <south-cache> --output <external-json> --module-output <external-js>
node scripts/test_capital_highway_barriers.mjs --cache <south-cache>
```

Rebuild twice into separate external outputs and compare both JSON and generated
module bytes to each other and tracked files. The barrier builder validates the
18 raw south tiles, keeps source node IDs and clipping fractions, and distinguishes
all998 evidence segments from658 ground runtime strips. Road-profile regeneration
retains its pinned caches and now exports lane/sidewalk semantics without changing
widths. Each builder's `--help` gives exact arguments and installs nothing.

The Red Hill habitat uses OSM way1208261619 v10, timestamp2026-02-12T20:45:18Z,
199 projected coordinates from a source tile whose SHA256 is
`f985be02b01495fd7ed77a9a4f268016f5d2b4b131d2f001f4db7f0e76008fc5`.
The fallback is gated on that map source hash. Source attributes credit CAPAD2022;
the game does not invent a park polygon on a school playing field.

Six apparent fuel-canopy/ACT-body pairs were measured by exact polygon
intersection. Covered fractions range0.142..0.924, below the0.95 replacement
threshold; **zero whole ACT bodies are changed**. This preserves attached shops.
Pumps/signs only render at clear source-supported placements. Hydrogen is not
presented as an ordinary petrol station. Current operation/brands/prices are not
asserted from old source tags; displayed assets are original and unbranded.

## Public references and observations

| Reference | Supported facts and limits |
| --- | --- |
| [Transport Canberra developer information](https://www.transport.act.gov.au/contact-us/information-for-developers) | Official GTFS/KML and CC-BY4.0 information. Linked November2026 KML download returned403; pinned OSM is the usable positional source, not a current official timetable. |
| [ACT road-barrier service](https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_Road_Barrier_Assets/FeatureServer) |65 Hindmarsh attributes were read, but neither query returned geometry. No rails are positioned from that attributes-only cache. Runtime paths instead use exact OSM guard_rail ways. |
| [Official Centre directory](https://canberracentre.qicre.com/stores/) and [Centre map](https://canberracentre.qicre.com/visit/centre-map/) | Directory supports Ground/Level1 and Monaro naming. Public map uses Mappedin; no actual floorplan image was visually inspected and no tenant adjacency is inferred from alphabetical listings. |
| [Monaro Mall architectural press kit](https://www.bowerbird.io/kits/canberra-centre-monaro-mall) |2017 architectural text describes coffered ground arcades, stone/marble portals, patterned floors and a double-height Petrie entrance. It supports original material/form cues, not an exact current whole-centre plan. No photos, mosaic artwork or logos are bundled. |
| [Telopea history](https://www.telopea.act.edu.au/about_our_school/history) |1923 opening,1983 agreement/1984 French-Australian operations and waratah name. Requested rocks/flag positions are estimates by a mapped NSW Crescent gate, not observed survey locations. |
| [Australian Aboriginal Flag guidance](https://www.pmc.gov.au/government/australian-national-symbols/australian-flags/australian-aboriginal-flag) |Commonwealth acquisition/free public use in2022; original simple flag geometry, no copied school insignia or third-party artwork. |
| [Canberra Tracks Manuka](https://www.canberratracks.act.gov.au/other-sites/manuka) |Blandfordia reserve name, pool opening1931 and local heritage. Original small history cues use facts, not copied interpretive signs. |
| [Kingston Arts Precinct](https://www.act.gov.au/BuiltforCBR/browse-all-projects/entertainment-arts-and-sports/kingston-arts-precinct) |Powerhouse, Fitters Workshop and former transport depot are distinct historic anchors. Heritage records inform an original whistle-history notice, not sampled audio or official art. |
| [Narrabundah shops works](https://www.cityservices.act.gov.au/Infrastructure-Projects/city-inner-north-and-inner-south/completed/narrabundah-shops-improvements) |Seating, paving, tree pits, paths and retaining-wall character; no copied murals or assertion of exact final positions. |
| [Red Hill Nature Reserve](https://www.parks.act.gov.au/find-a-nature-park/canberra-nature-park/red-hill-nature-reserve) |Grassy woodland/old-tree habitat. ACT kangaroo records support presence, not exact live positions/population. |

The older Street View record remains in `capital-drive-street-references.md`.
New Google Maps interaction failed because the browser-control connection could
not load requirements and the native accessibility provider was disconnected.
This was not an observed site bot block. No new imagery date, view or panorama is
claimed. Official Centre page HTML exposed its public map provider, but further
reference retrieval did not produce a visible floorplan. The ground-floor game
wing must therefore stay labelled an interpretation.

Highgate OSM way1282674423 v3 (2025-01-18) explicitly has
`tunnel=building_passage`, `layer=-1`, `maxheight=2.2`, `highway=service` and
`oneway=yes`. Its source path overlaps ACT body`act-88781-0`, whose ground-level
opening is not represented. A collision-checked public southern-loop detour via
Jardine/Eyre/Kennedy was diagnosed separately. This record does not authorize
deleting the body or inventing a wider opening; passage work needs shared roof,
wall, height-clearance and collision geometry in a later source correction.
