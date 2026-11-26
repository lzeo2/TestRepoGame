# Capital Drive bridge footprints without transport tags

The 26 November 2026 bridge census compared 143 pinned OpenStreetMap snapshots with the composed Capital Drive map. Thirteen ways carried a bridge tag without an active highway or railway centreline tag. Closed rings were compared with mapped transport centrelines using line intersection. Area describes the outline, and overlap measures the length of the relevant centreline inside it. Two successive ACTmapi aerial captures distinguish surviving and removed former bridges. [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) · [ACTmapi aerial imagery](https://www.actmapi.act.gov.au/access-imagery-and-elevation)

| OSM way | Geometry | Match and disposition |
| --- | ---: | --- |
| [1098966149](https://www.openstreetmap.org/way/1098966149) | 57.66 m line | Underground sewage pipeline tagged as a utility. |
| [1231840644](https://www.openstreetmap.org/way/1231840644) | 11.42 m line | Separate disused service bridge over the Sullivans Creek drain at Thoroughbred Park. It is visible in current aerial imagery and appears as streamed scenery at its mapped endpoints. |
| [1354866684](https://www.openstreetmap.org/way/1354866684) | 1,229.1 m² outline | Monaro Highway concrete viaduct 3175. Way 64377757 overlaps 101.0 m. |
| [1354866685](https://www.openstreetmap.org/way/1354866685) | 1,232.4 m² outline | Monaro Highway concrete viaduct 3194. Way 64377694 overlaps 101.6 m. |
| [1355896350](https://www.openstreetmap.org/way/1355896350) | 329.0 m² outline | Gungaderra Creek light rail deck. Tracks 767984382 and 767984384 overlap 35.2 m and 35.1 m. The outline describes the common rail structure. |
| [1355896351](https://www.openstreetmap.org/way/1355896351) | 338.8 m² outline | Eastern Flemington Road deck. Way 75858480 overlaps 27.0 m. |
| [1355896352](https://www.openstreetmap.org/way/1355896352) | 339.7 m² outline | Western Flemington Road deck. Way 70517547 overlaps 27.1 m. |
| [1550023134](https://www.openstreetmap.org/way/1550023134) | 746.1 m² outline | National Gallery to High Court pedestrian deck. Way 51801463 overlaps 93.5 m and its connector 906720084 overlaps 3.9 m. Both Parkes Place carriageways pass below. |
| [1550061862](https://www.openstreetmap.org/way/1550061862) | 5.4 m² outline | Gallery garden footbridge. Way 1550061861 overlaps 2.2 m. |
| [1557946784](https://www.openstreetmap.org/way/1557946784) | 1,351.9 m² outline | Capital Circle concrete beam bridge. Way 668433116 overlaps 99.6 m. |
| [351624571](https://www.openstreetmap.org/way/351624571) | 18.49 m former centreline | Former Holdens Creek crossing near the old Uriarra Road pavement. Its separate beam outline is way 770910350. The bridge is visible in the ACTmapi November 2024 capture, and the Current service shows a rock-lined open channel and severed approaches at the same site. The removed deck was omitted. |
| [701074065](https://www.openstreetmap.org/way/701074065) | 398.6 m² outline | University Avenue bridge over Sullivans Creek. The complete 32.67 m of way 1250117993 overlaps the outline. Its dedicated model and pedestrian support already belong to the ANU campus renderer. |
| [907236573](https://www.openstreetmap.org/way/907236573) | 6.55 m line | Short fence less than 1 m from footbridge way 906946058 at Loftus Street, on that path’s separate visual alignment. |

The National Gallery identifies the raised pedestrian connection to the High Court. Its park loop road remains a separate, lower surface. [National Gallery Sculpture Garden design brief](https://nga.gov.au/media/dd/documents/national_gallery_sculpture_garden_competition_stage_one_brief_and_terms_and_conditions.pdf) · [National Capital Authority precinct heritage plan](https://www.nca.gov.au/sites/default/files/2023-07/high_court_of_australia_and_national_gallery_of_australia_precinct_hmp.pdf)

The racecourse span retains two exact OSM way 1231840644 version 2 nodes from the pinned `corridor-0-0.json` source tile (SHA-256 `eef045b67decbda93b1e23929a3097f399946bf6ce62bc2ed1ce317cbdac51ac`). The model uses an estimated 3.6 m width, a muted deck and pale side beams from the current aerial at the service’s 0.0746 m/pixel level. The height above game grade and abutment shape are approximations because the local contour grid does not resolve the channel. The streamed solid batch adds 60 triangles. The structure contributes no route or playable access. [ACTmapi Current aerial service](https://tiles.arcgis.com/tiles/E5n4f1VY84i0xSjy/arcgis/rest/services/ACT_Aerial_Imagery_Current/MapServer) · [ACTmapi November 2024 imagery](https://tiles.arcgis.com/tiles/E5n4f1VY84i0xSjy/arcgis/rest/services/2024_11_full_75mm/MapServer)

Run `node scripts/test_capital_disused_bridge.mjs` for deployed source coordinates, the composed map’s route inventory, both chunk graphics profiles and unchanged ground support.
