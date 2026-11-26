# Canberra streetlight columns

The game keeps its citywide road-based lighting and adds recorded columns on eleven shopping streets in Manuka, Kingston, Civic, Dickson, Belconnen and Phillip. The ACT Government records supply positions, column heights, lamp technology and, where known, outreach lengths. Galvanised, timber, concrete and heritage palettes distinguish column families. The direction of each arm follows its retained street. Colours and luminaire shapes are interpretations.

Source attribution is © Australian Capital Territory, licensed under CC BY 4.0. The local snapshot selects active Roads ACT records, converts geographic coordinates to game metres, omits non-column fixtures and retains the fields used by the renderer. Source attribution also applies to the generated coordinates in `streetlight-columns.js`. [ACT Government Streetlight Column Assets](https://www.arcgis.com/home/item.html?id=5667c9c728e3490a951638c9fcf02a66) · [ACTmapi terms](https://www.actmapi.act.gov.au/terms-and-conditions) · [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)

## Placement and performance

The retained response has 530 records. After keeping supported freestanding columns with a recorded height and one or two lamps, the offline snapshot contains 508 positions. One housing represents each source column. At boot, a position must be clear of water, bridge decks, occupied geometry and carriageways, and close to its named road. When the ACT and OSM locations disagree, that asset is omitted. Estimated poles within 12 metres of a retained survey pole give way to the survey pole.

The composed-map fixture with static world obstacles placed 442 surveyed and 219 estimated columns. The previous renderer placed 220 estimated citywide. Retained surveyed counts are 85 Eyre Street, 83 Bunda Street, 55 Emu Bank, 53 Giles Street, 47 Corinna Street, 43 Alinga Street, 37 Woolley Street, 18 Challis Street, nine each on Furneaux and Bougainville Streets and three on Franklin Street.

A spatial index selects columns within 520 metres of the focus tile. The renderer caps visible columns at 220. Moving through all 661 fixture locations produced a peak of 123 visible columns, one instanced draw in daylight and two at night. The night draw combines the lens and a soft pool sampled against the road slope. A synthetic 300-column cluster stayed inside the same cap. Six hundred stationary updates while alternating daylight and night produced zero spatial queries and zero instance matrix writes. These are scene measurements from the software test, independent of hardware frame rate.

## Reproduction

Use an external path for the reviewed ArcGIS response. The importer checks its SHA-256 before generating the offline module. The game makes no online GIS requests.

```sh
python3 -B scripts/import_capital_streetlight_columns.py --source /tmp/capital-streetlight-columns.geojson --fetch --check
node scripts/test_capital_streetlights.mjs
```

The focused test uses the retained south, north and airport map fixture. This smaller footprint places 285 surveyed and 218 estimated columns. It checks world clearance, source heights and outreach, coloured night pools, stationary updates, range culling, bounded dense scenes and disposal.
