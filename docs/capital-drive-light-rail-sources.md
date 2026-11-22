# Capital Drive light rail source notes

Capital Line runs through five mapped Canberra stops. It uses Alinga Street,
Elouera Street, Ipima Street, Macarthur Avenue and Dickson Interchange. The track
uses projected OpenStreetMap `railway=tram` ways, and each direction stops at
the mapped `public_transport=stop_position` node. The two terminal turns follow
connected track and crossover ways. The data includes the input filenames,
SHA-256 hashes, OSM way identifiers and station nodes. © OpenStreetMap
contributors, ODbL 1.0.

The foot approaches sit within the modelled islands near their directional
stop positions. Ground clearance selects a nearby safe approach where needed.
The service timing, fleet, visual design, platform details and any activities
are fictional gameplay. The north end of this game service is Dickson.

To rebuild the sourced geometry with the existing Canberra snapshot caches, run
from the repository root:

```sh
python3 -B scripts/build_capital_light_rail.py \
  --cache /tmp/canberra-north-data \
  --cache /tmp/capital-north-west-osm
node scripts/test_capital_light_rail.mjs
```

Both cache directories need their original manifests and raw snapshots. The
generator checks their hashes and runs offline. The game loads its small local
derivative. The own-physics test checks every stop against the assembled terrain
and movement geometry, rides between the first two stops and exercises the spare
tram call at an empty platform. It also steps all fixed sets around a full
service cycle.
