# National public buildings in Capital Drive

Four dedicated exteriors use the named OpenStreetMap building rings already shipped with the game. The local map projection measures metres east and south from 149.137° E, 35.318° S. The model builder keeps the building's terrain contacts and provides its street-facing silhouette in both graphics settings. Photographs and aerial imagery were used as visual references. The game generates its own geometry offline.

| Location | Source footprint | Details visible in-game |
| --- | --- | --- |
| National Museum of Australia, Acton Peninsula | [way 5035476](https://www.openstreetmap.org/way/5035476) | The bent, raised entrance ribbon connects to the forecourt side of the public hall. It rises to the museum's published height of 30 metres. Bronze, crimson, silver and dark gallery walls follow both arms of the courtyard. Six lens-shaped rooflights break up the pale roof toward Lake Burley Griffin. |
| National Library of Australia, Parkes | [way 5954392](https://www.openstreetmap.org/way/5954392) | Sixteen marble-clad columns along each long side and eight across each end stand in front of the recessed, bronze-toned window wall. Gray trachyte steps at the Parkes Place end lead to the podium. The projecting eave has a visible underside and the shallow hipped roof has a weathered copper finish. |
| Royal Australian Mint, Deakin | [way 217376654](https://www.openstreetmap.org/way/217376654) | The rectangular production building has fourteen parallel bands of raised rooflights. The public face uses pale vertical blades, inset dark glazing, a narrow canopy and a horizontal fascia. The front is oriented to the mapped north-side entrance. |
| National Convention Centre Canberra, Civic | [way 210305032](https://www.openstreetmap.org/way/210305032) | The Constitution Avenue approach has a freestanding cobalt entrance screen, a recessed glass foyer and pale walls with horizontal ribbon windows. Above the source footprint, the rectangular west hall and the chamfered auditorium roof give the two ends distinct profiles. |

## Street and aerial references

The Museum describes the colours, the thirty-metre Uluru line loop and the arrangement of its separate buildings. Public entrance tags on the source outline locate the modelled forecourt. [National Museum of Australia building](https://www.nma.gov.au/visit/the-museum-building) · [Visiting the Museum](https://www.nma.gov.au/visit)

The Library documents the 16 by 8 column arrangement, exterior marble, grey trachyte podium and copper roof. Its drone photograph and mapped main entrance establish the public-facing end. [National Library building](https://www.library.gov.au/visit/our-building) · [Library aerial photograph](https://www.library.gov.au/sites/default/files/styles/news_media_listing/public/images/2024-10/exterior-location-carparks-drone-2023.jpg)

The Mint's public fact sheet shows the rhythm and colour of its street-facing piers. The Convention Centre’s published address and a September 2023 public photograph identify the blue steelwork at the current venue. [Royal Australian Mint visitor fact sheet](https://www.ramint.gov.au/sites/default/files/2025-04/factsheets-about-royal-australian-mint.pdf) · [National Convention Centre Canberra](https://nccc.com.au/) · [Constitution Avenue entrance photograph](https://commons.wikimedia.org/wiki/File:Constitution_Ave_entrance_to_the_National_Convention_Centre_September_2023.jpg)

North-up aerial references were compared with the local footprints to identify the museum rooflights, the Mint roof ridges and the Convention Centre auditorium. The parts, colours and remaining heights are hand-modelled approximations. [Esri World Imagery and imagery credits](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9)

## Rendering and verification

All details enter the existing opaque mesh in the source building's 350-metre chunk. Ring triangulation preserves the Museum courtyard. The runtime compiles the geometry when the chunk loads and frees it on eviction. Low graphics retains the main structures and cuts secondary mullions, panel joints and truss subdivisions.

Run `node scripts/test_capital_national_architecture.mjs` from the repository root. It reads both shipped map packs, checks the footprint skirts, roof shape and winding, published dimensions, colour faces and per-setting triangle budgets. It loads, evicts and reloads real buildings through the production world streamer and verifies that each uses one opaque chunk draw.

| Building | Triangles at Low | Triangles at Standard |
| --- | ---: | ---: |
| National Museum | 920 | 1,200 |
| National Library | 598 | 1,178 |
| Royal Australian Mint | 709 | 737 |
| National Convention Centre | 538 | 830 |
