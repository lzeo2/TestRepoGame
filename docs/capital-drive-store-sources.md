# Mapped parody store sources, 14 November 2026

The owner requested real store locations with parody names, including Coles to
Coals, and robbery activities at those locations. This adds seven retail sites
from retained OpenStreetMap nodes, matched to the existing ACT/OSM footprint map.
The geographic source snapshot remains unchanged. Shop signs, prices, tills and
robberies are original fictional gameplay. Real names below are provenance only;
game-facing names are the parodies.

| Source tag name | Game name | District | Public street | OSM object | Matched footprint |
| --- | --- | --- | --- | --- | --- |
| Coles | Coals | Manuka | Flinders Way | node/358293199 | act-87705-0 |
| Paperchain | Paperback Chain | Manuka | Franklin Street | node/439239650 | osm-940856911 |
| Manuka Newsagency | Newsweak | Manuka | Franklin Street | node/439239719 | act-93708-0 |
| Scoop Wholefoods | Scoot Wholefoods | Kingston | Kennedy Street | node/6275666787 | act-74936-0 |
| The Book Cow | The Book Moo | Kingston | Jardine Street | node/12918449444 | act-83689-0 |
| Joe's Boots | Toe Boots | Kingston | Jardine Street | node/12918449448 | act-87807-0 |
| Supa Express | Super Expressive | Red Hill | Discovery Street | node/11906941518 | act-114794-0 |

`data/stores.json` records the exact source latitude/longitude, element version
and modification timestamp, footprint and derived frontage. Its source snapshot
is the retained map date, 12 November 2026. Element timestamps describe edits,
not an independent date of current business operation. Eighteen retained OSM tile
hashes and the unchanged map/profile hashes are pinned in metadata. OpenStreetMap
contributors, ODbL1.0; matching ACT outlines retain CC-BY4.0 attribution.

The current [Coles Manuka directory](https://www.coles.com.au/find-stores/coles/act/manuka-859)
was also found during public source research. No store web assets or logos are
bundled. Public OSM object pages are `https://www.openstreetmap.org/node/<id>`.

Frontages and interaction points are **estimates**, derived from the matched
footprint edge facing a named public street. They are not tagged or surveyed
entrances. All points are outside the actual building polygons; approach radius
is4.8m, about2.7m from the selected facade. Coals' OSM point is inside the larger
Manuka Plaza footprint; its approximate Flinders Way frontage is33m from that
point. Stores with ambiguous rear or remote frontages were excluded, including
Supabarn and two Griffith candidates. This is a bounded selection, not complete
business coverage across Canberra.

Original facade overlays add parody fascia, awnings, glazing/door treatment and
a TILL cue without deleting source buildings or pretending to expose interiors.
Seven facades use1288triangles/two batches and one local bitmap text atlas, culled
at180m. The separate generic gym/supplies signs are reduced to two posts. Search
accepts both the source name and parody name while displaying only the parody.
The existing saved `crescent-kiosk`/`manuka-store` cooldown keys remain valid,
although their old fictional food markers are retired. New stores each retain
independent till cooldowns. Actual proximity and building sight are required;
remote, occluded and Free roam activity cannot pay career cash.

Rebuild without downloads, using explicit temporary outputs:

```sh
python3 -B scripts/build_capital_stores.py --cache <external-cache> --output <temporary-json> --module-output <temporary-js>
node scripts/test_capital_stores.mjs --cache <external-cache>
```

The source test verifies every cached tile hash, exact source node/footprint,
projection, public approach, orientation, strict parodies and two byte-identical
rebuilds. `stores.js` is generated from the same selection as `data/stores.json`.
Review source and confidence before adding another shop; do not guess a named
store's entrance or expand by arbitrary nearest-building matching.
