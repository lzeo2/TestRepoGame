# ANU campus supplement

This supplement reuses the existing Civic/north map and terrain. It adds no
geographic expansion, downloaded artwork, interiors or vehicle road segments.

Source: OpenStreetMap contributors, ODbL 1.0. Existing verified snapshot:
`https://api.openstreetmap.org/api/0.6/map.json?bbox=149.1165%2C-35.2855%2C149.13%2C-35.27675`.
The data module retains its source URL/hash and feature versions/timestamps for
paving and lawn. Existing map attribution and ODbL notices remain applicable.

The six existing footprint sources are ways 5001918 (JB Chifley Building),
52334273 (R.G. Menzies Library), 50632761 (ANU School of Music, including
Llewellyn Hall), 674003253 (Marie Reay Teaching Centre), 672271093 (Di Riddell
Building), and 674574898 (Culture Centre). Their source outlines and heights
remain map-owned; colours, doors and facade patterns are original interpretations.
Heights inherited from floor counts are estimates, not surveyed building heights.

Kambri Lawn uses the actual closed outline of way 674596357. University Avenue
walking paving uses ways 672266049, 1250117992, 1250117993, 1250117994 and
1250117995. The first has an OSM width of 10 metres; the other four use an
explicit original 6-metre paving-width estimate. Way 1250117993 is a layer-one
pedestrian bridge. Its surface interpolates endpoint terrain heights, an estimate
that does not claim a surveyed deck elevation. It remains outside vehicle routing.
The lawn fill does not invent holes or additional grass parcels.

Public search labels include ANU (campus boundary way 279984863), Kambri (the
mapped lawn) and Llewellyn Hall (node 978025744), alongside the six building names.
Locations are projected using the existing origin [149.137, -35.318]. Vertex
means used for place labels are approximate label anchors, not public entrances.

Integration: call `applyAnuCampus(map)` after retained map composition. Use
`createAnuCampusView(scene, heightAt)` for the two local surface draws, with normal
update/disposal. Facades use the existing `library` and `campus` regional designs.
The existing regional site's cap must be accounted for by the integration owner;
the helper does not raise renderer limits. `anuBridgeHeightAt` optionally supplies
walking support on the bridge only and returns null elsewhere.

Check: `node scripts/test_capital_anu.mjs`. Source/geometry checks do not establish
native gameplay, measured architecture, access permission or release acceptance.
