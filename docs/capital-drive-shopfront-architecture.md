# Canberra shopfronts

The playable map has 29 named retail sites across eight districts. Each site has a retained OSM point, a public facing unit allocated on an existing facade, and a parody name. In WebGL, the shared frontage renderer draws 28. Lambzhou 1919 on Bunda Street has a dedicated frontage with a visible cook. Five Manuka precincts keep their separate source boundaries and paths. Manuka Terrace has a purpose-built shell. Canberra Centre has three retained shopping-centre footprints and a dedicated Bunda entrance. Macquarie Shops has a separate, ACT-photo-informed treatment for its two registered buildings. Rental forecourts are fictional facilities.

## Visible references

| Place | Source and extent | In-game treatment |
| --- | --- | --- |
| Franklin and Flinders streets, Manuka | [Canberra Tracks, Manuka](https://www.canberratracks.act.gov.au/other-sites/manuka), [Manuka Terrace](https://www.manukaterrace.com.au/) and the existing [March 2026 exterior observations](capital-drive-precinct-character-contract.md#evidence-and-source-cues) | Cream parapets, continuous dark awnings and separate glass tenancies. The Terrace retains its curved corner. The new upper transom, sill, coping and shelter edge wrap around the source outline. |
| Paperchain, Manuka | [March 2025 interior photograph](https://commons.wikimedia.org/wiki/File:Interior_of_Paperchain_Bookstore_March_2025.jpg) and [August 2026 photograph](https://commons.wikimedia.org/wiki/File:Interior_of_Paperchain_Bookstore_August_2026.jpg) | Paperback Chain shows books spine-out, groups of front-facing covers, timber shelving and ceiling lights through the windows. |
| Kennedy Street, Kingston | [ACT heritage registration, Early Kingston Shops](https://www.legislation.act.gov.au/DownloadFile/ni/2024-268/20240604-83867/PDF/2024-268.PDF) and [registration background and photographs](https://www.act.gov.au/__data/assets/pdf_file/0004/2463133/early-kingston-shopping-precinct-appendix-background-information.pdf) | The Kennedy Street frontage has light masonry reveals and a fine raised course below the parapet. The glass and inner trim vary by tenant. |
| Joe’s Boots, Jardine Street | [Griffith Narrabundah Community Association, *Eastlaker*, March 2019, p. 11](https://www.gnca.org.au/wp-content/uploads/Eastlaker-March-2019.pdf) | Toe Boots uses short rows of footwear on green shelving, with distinct shafts and soles. |
| Red Hill group shops | [Public exterior photograph](https://commons.wikimedia.org/wiki/File:Red_Hill_shops,_Canberra.jpg) | Super Expressive has the group’s low red sign band and neutral grey frontage. The existing source building supplies the roof and setback. |
| Hall Street, Lyneham | [February 2026 Supaexpress exterior](https://commons.wikimedia.org/wiki/File:Supaexpress_supermarket_at_Lyneham_February_2026.jpg) | Supper Express combines a dark sign face, light metal awning edge, warm masonry surround and visible grocery shelves. |
| Brigalow Street, Lyneham | [WheelEasy exterior and booth photographs of Tilley’s](https://wheeleasy.org/explore/tilley-s-devine-cafe-gallery) | The café has dark booth backs, warm wall lights and tapered greenery at the windows. The greenery is illustrated inside the frontage so the path stays clear. |
| Lowanna Street, Braddon | [July 2023 photograph of the supermarket and takeaway](https://commons.wikimedia.org/wiki/File:Takeaway_store_and_supermarket_on_Lowanna_Street_Braddon_July_2023.jpg) | Braddon Suppermarket has a narrow blue fascia with pale shopfront panels alongside the display windows. |
| Macpherson Street, O’Connor | [Historic O’Connor group-shop photograph](https://commons.wikimedia.org/wiki/File:O%27connor_shops_canberra_act.jpg) | The game uses a deep green fascia and warm masonry as precinct cues. This older image gives the colour family of the strip. The specific grocer’s current fitout is an interpretation. |
| Woolley Street, Dickson | [ACT Dickson Centre Master Plan](https://www.planning.act.gov.au/__data/assets/pdf_file/0007/2356747/dickson-centre-master-plan-2011.pdf) and [January 2025 street photograph](https://commons.wikimedia.org/wiki/File:Woolley_Street_Dickson_January_2025.jpg) | Restaurant, grocery and supermarket windows contain different fixtures. Short shelter soffits and warm light details distinguish the Dickson facades. |
| Bunda Street, Civic | [Public Mather/Bunda elevation drawing](https://dafinder.blob.core.windows.net/dadocuments/DOCs/ELEV-202138386-01.pdf) and [January 2024 street photograph](https://commons.wikimedia.org/wiki/File:Bunda_Street_January_2024.jpg) | The Canberra Centre entrance has a shelter lip, warm-grey fascia, contrasting door stiles, kickplates and inset overhead lights. The game keeps its existing Bunda approach and elevated connector. |
| Macquarie Shops | [ACT City Services exterior 1](https://www.cityservices.act.gov.au/__data/assets/image/0012/2898363/macquarie-mural-1.jpg) and [exterior 2](https://www.cityservices.act.gov.au/__data/assets/image/0004/2898364/macquarie-mural-2.jpg) | The dedicated renderer already models the rendered wall, planted edge, continuous sheltered path and original wall art. |
| Lambzhou 1919 | [Restaurant and exterior reference record](capital-drive-living-interiors-contract.md) | The dedicated frontage retains the warm timber, black framing and kitchen window. Its store ID is excluded from the shared batch. |

The merchandise art, colours and signs ship as original drawings. The table distinguishes individual-shop evidence from precinct examples. One elevation or public photograph records a particular view and date. Other mapped tenants use their available store type, allocated width and district style. The geometry is a street-scale interpretation. Facade finishes do not change navigation, entrances or collision.

## Rendering and verification

Both shop windows share the existing local sign atlas. Sprites for groceries, books, bakery trays, restaurant booths, takeaway menu boards, boots and general merchandise occupy previously unused margins. Each shop has a glazed door, transom, pull handle, soffit lights and a narrow roof-edge trim. The material responds to scene lighting. Overlapping transparent panes would add overdraw, so the displays use opaque colour and small baked reflections.

Two meshes hold the shared storefronts. Their positions and UVs never change. When the player crosses the 180-metre visibility boundary, only the active index ranges upload. No distant facade triangles are submitted. The architecture uses the existing image atlas and has no external requests. The Manuka and Civic architecture retains its existing distance culling.

Run these three checks from the repository root.

```sh
node scripts/test_capital_storefronts.mjs
node scripts/test_capital_shopping.mjs
node scripts/test_capital_civic.mjs
```

The tests check every named facade against its assigned width, terrain and approach direction. They compare the submitted draw indices with the expected visible sites and verify that geometry buffers stay static across districts. Precinct tests check the source buildings, clear paths, triangle budgets, existing bridge clearances and disposal.
