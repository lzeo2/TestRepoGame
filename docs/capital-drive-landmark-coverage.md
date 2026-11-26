# Finding Canberra’s public buildings

Free roam map search indexes seven public buildings by their retained OpenStreetMap way IDs. The same results are available when selecting a campaign waypoint. Selecting a result centres the map on the building. The label comes from the loaded map pack. Missing buildings produce no venue result.

| Search name | Source footprint | Map pack |
| --- | --- | --- |
| Shine Dome | [4970449](https://www.openstreetmap.org/way/4970449) | canberra-north |
| National Museum of Australia | [5035476](https://www.openstreetmap.org/way/5035476) | canberra-north |
| National Library of Australia | [5954392](https://www.openstreetmap.org/way/5954392) | canberra-north |
| National Convention Centre | [210305032](https://www.openstreetmap.org/way/210305032) | canberra-north |
| Canberra Outlet Centre | [30160608](https://www.openstreetmap.org/way/30160608) | airport |
| Royal Australian Mint | [217376654](https://www.openstreetmap.org/way/217376654) | region-south |
| National Arboretum Canberra Village Centre | [663660535](https://www.openstreetmap.org/way/663660535) | region-molonglo |

An east–west line through the middle of the footprint supplies the centre of its widest interior span. This puts the marker inside concave outlines and clear of courtyards. It describes an approximate map location. Public entrances and accessible approaches require separate source evidence. These records live in the existing local search index, so entry into a neighbourhood causes no network request and draws no extra minimap pins.

The 26 November 2026 audit counted 162 static landmark records before this search extension. That inventory includes districts, outdoor attractions and shops as well as buildings. The 398 additional search places included 388 bus stops. A search-only footprint, a point of interest and a detailed architectural model have different uses. [Map source](../Games/Capital%20Drive/map-source.js) · [Architectural models and references](capital-drive-landmark-fidelity.md)

Run `node scripts/test_capital_addresses.mjs` to check the seven shipped footprints, pin positions, transit search ordering, unlisted IDs and courtyards.

Kippax Fair now has the 7,497 m² outer footprint of OSM relation 9912221. The importer joins ways 27243622 and 713272037 using their shared endpoint node IDs and rejects an open ring. The shipped West Belconnen overlay contains 1,194 building footprints. Its other 1,193 footprints, 1,782 roads and terrain match the earlier pack. The mall’s height is estimated from its single mapped storey. [OSM source](https://www.openstreetmap.org/relation/9912221) · [Offline importer](../scripts/build_capital_west_belconnen.py)
