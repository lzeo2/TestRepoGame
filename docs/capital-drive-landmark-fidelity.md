# Capital Drive landmark exteriors

The composed map currently contains 162 landmark records, 398 other searchable places and 88 regional place records. These sets overlap. They include suburbs, transit stops, parks and services as well as buildings. The five Inner South landmark models and 25 named regional building exteriors below can be checked independently against their geometry in the game.

## Individual public exteriors

| Place | Details represented | Public reference |
| --- | --- | --- |
| Parliament House | Four faceted stainless pylons rake inward, bend into an open vertical cluster and carry the flag above the grass roof. The model retains an 81 m mast above the 18 m roof crest. The flag has a folded fly, a canton and stars. | [Parliamentary Education Office](https://peo.gov.au/understand-our-parliament/parliament-house/australias-parliament-house), [Australian Stainless Steel Development Association](https://www.assda.asn.au/blog/209-monumentally-successful) |
| Old Parliament House | Four arched, bronze-framed glazed bays, cream stone-coloured reveals and stepped parapet bands across the white front elevation. Bay spacing, the terrain and stair dimensions are approximate. | [Museum of Australian Democracy heritage plan](https://www.moadoph.gov.au/sites/default/files/2023-01/MoAD-Heritage-Management-Plan-2021-26.pdf) |
| Kingston Powerhouse / Canberra Glassworks | Paired industrial gables, roughcast concrete, multipaned steel windows and a projecting central parapet. Warren Langley’s *Touching Lightly* rises 23 m, with a 2 m diameter glass shaft and horizontal bands. | [Australian Institute of Architects heritage citation](https://www.architecture.com.au/wp-content/uploads/r012_kingston_powerhouse_rstca.pdf), [artist’s project page](https://www.warrenlangley.com.au/project/touching-lightly/) |
| Manuka Oval | The Jack Fingleton Scoreboard sits on the four shipped corners of OSM way 1290130248. Its shutters face the pitch along the infield side. Face height, shutters and colours are an interpretation. Six floodlight towers and stepped stands define the wider ground. | [Manuka Oval history](https://manukaoval.com.au/about-manuka-oval/history/), [venue diagram](https://manukaoval.com.au/wp-content/uploads/2019/04/Manuka-Oval-Map-with-Media-Centre_2019.pdf), [source footprint](https://www.openstreetmap.org/way/1290130248) |
| Manuka Pool | Existing terrain-following perimeter, open gate between two pillars, cream entrance buildings with terracotta hip roofs, roof tile courses, geometric sun rays and the mapped basin. | [Site outline](https://www.openstreetmap.org/way/51677758), [basin outline](https://www.openstreetmap.org/way/58851110) |
| Dickson Library | Enrico Taglietti’s low building has a projecting concrete fascia with a shaded soffit over manganese-coloured brick and recessed-looking glazing. Its outer ring comes from OSM way 5124277. The overhang depth is an artistic estimate. | [ACT Heritage background](https://www.act.gov.au/__data/assets/pdf_file/0006/148344/dickson-library-background-information.pdf), [source footprint](https://www.openstreetmap.org/way/5124277) |
| Belconnen Library | A contrasting pale concrete fascia, strong horizontal cantilever and shaded glazing distinguish this library. The cantilever is compressed to keep nearby paths visually open. | [ACT Heritage registration](https://www.legislation.act.gov.au/DownloadFile/ni/2024-70/20240216-83181/PDF/2024-70.PDF), [Australian Institute of Architects](https://www.architecture.com.au/wp-content/uploads/r125_belconnen_library_chandler_street_belconnen.pdf) |
| AIS Arena | Twelve dark, raking masts and 36 stays rise against a pale roof. Triangular edge bracing and blue cladding sit above the lower walls. Their positioning follows cross-sections through the mapped, rotated building outline. The public project description supplies the counts. Height and individual cable profiles are estimates. | [FDC AIS Arena project](https://www.fdcbuilding.com.au/projects/ais-arena/), [exterior reference](https://www.coliseum-online.com/dernier-cri-look-for-australia-ais-arena/) |
| Belconnen Arts Centre | Graphite cladding, vertical panel joints, a contrasting light roof edge and glazing give the civic arts building its own palette. The model simplifies the centre’s different construction stages. | [DJAS project](https://www.djas.com.au/projects/belconnen-arts-centre-bac/) |

## Wider coverage

The regional renderer draws the exterior walls and roofs on the mapped building rings, including concave outlines and courtyards. Each of its 25 named owners gets a glazed entrance, a projecting canopy where the wall is wide enough, framed window bands and sills with shaded returns. Six families divide the secondary details between libraries, campuses, arenas, shopping centres, hospitals and exhibition buildings. Decorative entrances and lettering are artistic interpretations.

| Area | Buildings in this renderer |
| --- | --- |
| Acton | ANU Chifley Library, ANU Menzies Library, School of Music / Llewellyn Hall, Marie Reay Teaching Centre, Di Riddell Building, Kambri Culture Centre |
| North Canberra and Gungahlin | Dickson Library, Exhibition Park in Canberra, Gungahlin Leisure Centre, Gungahlin Public Library, Marketplace Gungahlin |
| Belconnen, Bruce and outer west | AIS Arena, Belconnen Arts Centre, Belconnen Library, Canberra International Sports and Aquatic Centre, University of Canberra, Westfield Belconnen, Kippax Public Library, Latham Shopping Hub |
| Woden, Tuggeranong and Molonglo | Canberra Hospital, Woden Library, South Point Tuggeranong, Tuggeranong Library, Coombs Shops, Denman Prospect Shops |

Other parts of the map have separate owners. The Australian War Memorial uses `war-memorial-view.js`. Black Mountain Tower and the former waterpark use `north-places-view.js`. Canberra Centre and the lake bridges use `civic-view.js`. The airport terminal, Telopea school perimeter and ANU lawn use `airport-view.js`, `campus-view.js` and `anu-campus-view.js` respectively. Civic Skatepark uses `civic-extras-view.js`. Manuka and Kingston shopping precincts, commercial tenants, Macquarie shops and the Civic noodle restaurant use the shopping, storefront, Macquarie and noodle-shop views. Most ordinary houses and unnamed commercial buildings still use the streamed world renderer’s footprint-based architecture. The references above cover public exteriors; surrounding interiors, facade colours, roof equipment, signage and neighbouring houses generally remain approximate.

## Verification

Run from the repository root with Node:

```sh
node scripts/test_capital_landmarks.mjs
node scripts/test_capital_regional_landmarks_view.mjs
node scripts/test_capital_regions_actual.mjs
```

The five fixed models use 14,186 triangles across all detail levels and two shared materials. The 25 regional building models together contain 19,124 triangles. A camera at each of the 25 source footprints submitted at most 3,434 triangles in two opaque draws. Site detail switches at 280 m and its shell at 650 m. Geometry positions, normals, colours and terrain samples remain static. An index prefix changes only when the set of visible buildings changes. Frame rate on an Intel N100 was not measured in this test.
