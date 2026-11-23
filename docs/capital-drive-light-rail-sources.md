# Capital Drive light rail source notes

Capital Line runs through all 14 mapped stops on the operating Alinga Street
to Gungahlin Place corridor. The two tracks are about 11.9 km each. Both use
projected OpenStreetMap `railway=tram` ways, directional stop-position nodes and
connected terminal crossovers. Each of the 28 platforms uses a mapped polygon.
Separate side platforms and paired island halves retain their own boarding and
exit points. The generated asset records the route relations, way and node IDs,
input files and SHA-256 pins. © OpenStreetMap contributors, ODbL 1.0.

The source-constrained approaches sit near the directional stop doors and must
pass foot-clearance checks. The original shelter models and game schedule use
eight regular trams and one on-demand set. In-game service ends at Alinga Street
in Civic and Gungahlin Place in the north.

To rebuild the sourced geometry with the existing Canberra snapshot caches, run
from the repository root:

```sh
python3 -B scripts/build_capital_light_rail.py \
  --cache /tmp/canberra-north-data \
  --cache /tmp/capital-north-west-osm \
  --cache /tmp/capital-regions-north
node scripts/test_capital_light_rail.mjs
```

All three cache directories need their original manifests and raw snapshots.
The generator verifies their hashes and the station order in both route
relations. The offline regression checks all 28 dry approaches, connected road
access, opposite-platform rejection, the Civic parcel journey, long rides and a
full service cycle for all eight scheduled trams.
