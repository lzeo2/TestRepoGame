# Canberra park barbecues and drinking water

Capital Drive includes 79 public electric barbecues and 112 drinking fountains
in 41 Canberra suburbs. Each fixture uses its own ACT Government asset ID and
survey point. At Lennox Gardens, Yarralumla, the twin hotplates of BBQ429 and
the bottle refill station DRFN315 are 13.6 metres apart in both the source and
the game. At Telopea Park, Barton, the game places double hotplates at the four
marked positions BBQ70, BBQ71, BBQ73 and BBQ125.

## Sources and visual interpretation

Point locations and selected attributes are adapted from **ACTGOV Barbecue
Assets** and **ACTGOV Drinking Fountain Assets**, © Australian Capital
Territory, published by ACTmapi. Both items specify Creative Commons
Attribution 4.0. Data were retrieved on 26 November 2026. The location and
suburb text comes from the source registers. The importer converts WGS84
coordinates to the game's local metres and changes upper case labels to
title case. [Barbecue item and licence](https://www.arcgis.com/home/item.html?id=2dba861348484345a4dd87b9537d97bf)
· [Drinking fountain item and licence](https://www.arcgis.com/home/item.html?id=3402be5e428445b6b80454bca2ff21e4)
· [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
· [ACTmapi terms](https://www.actmapi.act.gov.au/terms-and-conditions)

The barbecue model selection follows the registered hotplate combination.
There are four single and 75 double units. A source bench material is retained
where recorded. Only active metal drinking fountains with a known dog-bowl
field are included. Eighteen are bottle refill stations and five others have
a dog bowl. Municipal standards and the ACT Chief Health Officer's report
describe bottle refill facilities and their use. Fixture heading, wear,
surface patterns and exact commercial models are artistic interpretations.
[ACT barbecue asset register](https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_Barbecue_Assets/FeatureServer/1)
· [ACT drinking fountain asset register](https://services1.arcgis.com/E5n4f1VY84i0xSjy/ArcGIS/rest/services/ACTGOV_Drinking_Fountain_Assets/FeatureServer/1)
· [ACT public barbecues](https://www.cityservices.act.gov.au/public-land/public-spaces-and-facilities/barbecues)
· [ACT Chief Health Officer Report](https://www.act.gov.au/__data/assets/pdf_file/0014/2324102/ACT-Chief-Health-Officer-Report-2018.pdf)

## Inclusion and clearance

The importer reads the municipal asset points in ID order. It selects named
public parks, parklands, gardens, picnic areas, foreshore, plazas, playgrounds
and shopping precincts inside the component road pack extents. It drops
inactive entries, enclosed grounds, schools and equipment outside the supported
material or fuel types. Eligibility follows recorded ownership and place
descriptions. These records are a dated selection and do not establish current
access or operating condition.

The importer screened 206 candidates against the composed source map and the
existing static-world obstacle fixture. It checked the model envelope against
all drive lanes, buildings, fences, source water bodies and previously admitted
equipment. A conflicting feature is omitted at its surveyed point. This avoids
placing equipment inside rendered enclosed sheds or forcing a park asset to a
different side of a road. Runtime search, rendering and collision can share the
same projected coordinates and original asset ID. The game makes no remote
requests for this layer.

## Rebuild and verify

Use Python 3 and Node from the repository root. Choose an external directory to
retain the two original ArcGIS responses. A cache containing both listed files
can repeat the import offline. After an upstream revision, the checksum guard
requires the older source responses, or a newly reviewed snapshot and pin.

```sh
python3 -B scripts/import_capital_park_amenities.py --cache /tmp/canberra-park-input --fetch --check
python3 -B scripts/import_capital_park_amenities.py --cache /tmp/canberra-park-input --output /tmp/park-amenities.js
node --check scripts/filter_capital_park_amenities.mjs
```

| WGS84 GeoJSON input | Raw source rows | SHA-256 |
| --- | ---: | --- |
| Barbecue.geojson | 347 | 2f83b231f260c66ee938d680f969980b741277dad5d5d65a326817ed756fac48 |
| Drinking_Fountain.geojson | 267 | 7d3aefb61a16556fdb0dce6d065a59a0cc4b4d86662d6d150bc474724424c4b2 |

[Importer](../scripts/import_capital_park_amenities.py)
· [Static clearance pass](../scripts/filter_capital_park_amenities.mjs)
· [Retained game records](../Games/Capital%20Drive/park-amenities.js)
