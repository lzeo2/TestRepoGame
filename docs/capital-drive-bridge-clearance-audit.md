# Canberra bridge coverage and support

The bridge census used the retained OpenStreetMap tiles for the existing Canberra, airport, north-west and regional map packs. The added Scrivener source tile closes the gap between the west and Molonglo extracts. Several retained sections of Adelaide Avenue, Monaro Highway and Capital Circle had a road centreline but lost their bridge tags at import. The base sidecar now keeps bridge, layer, tunnel and covered tags on those same exported road runs. [Retained tags importer](../scripts/build_capital_road_profiles.py) · [Public path and roadway coverage](capital-drive-west-bridge-links.md) · [Rail structures and sources](capital-drive-rail-bridges.md)

## Bridge elevations and physical support

The game keeps a lower road, an upper deck, and the volume of the deck as separate objects. The full-map infrastructure check sampled 2,656 compiled bridge segments and 2,154 deck-to-approach joins. The deck renderer and cover checks share the paved edges. Cars maintain their existing road support while driving, and a person exiting a car takes the same road level. Grounded movement, water and chase cameras can use the space under the deck. Physical contact with railings is checked at the railing's road elevation.

A positive OSM layer establishes which of two mapped roads goes above the other. The imported roads and approaches use the same source coordinates. The five-metre road-surface target is an estimate for gameplay. The grade audit checks 134 motor and 57 walking or cycling deck pairs at distinct positive-layer centreline intersections over lower, non-tunnel roads. Parkes Place uses its 4.1 m mapped restriction plus the deck slab. The other sampled clearances use the five-metre road-surface target. It sets aside shallow parallel lines and samples within a metre of a segment endpoint, where the records can be parts of the same join. It checks the grade separation rather than claiming a survey or guaranteed tall-vehicle clearance at every point. [Grading inputs](../Games/Capital%20Drive/bridge-grade-crossings.js)

The lake bridges retain their cross-section and existing deck slope. At a connected abutment, the approach reads the deck height at the joint and tapers back along neighbouring source road nodes. Lane and pavement checks at twelve joins found a worst gap of approximately 2.2 cm. The measured deck grades were 3.40% at Commonwealth Avenue, 1.77% at Kings Avenue and 0.35% at Scrivener Dam. The first two lifts reproduce distinct lower bankside passages. The restored Scrivener road uses a minimum 2.5 m above the normal design water level. [National Capital Authority](https://www.nca.gov.au/attractions/scrivener-dam)

Run the scoped suite from the repository root.

```sh
node scripts/test_capital_bridge_grade_census.mjs
node scripts/test_capital_lake_deck_grades.mjs
node scripts/test_capital_bridge_road_bands.mjs
node scripts/test_capital_bridge_vehicle_layers.mjs
node scripts/test_capital_west_bridge_links.mjs
node scripts/test_capital_rail_bridges.mjs
```

The native western bridge test uses a disposable game profile and a normal Free roam map selection to arrive near each crossing. Real driving, parking, exit and walking inputs follow. It records live road support, collisions and camera clearance for those cases. Run `python3 -B scripts/test_capital_west_bridge_browser.py --help` for the profile, game selection and output options.
