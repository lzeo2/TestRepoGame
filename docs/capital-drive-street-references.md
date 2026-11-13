# Canberra street references, 13 November 2026

Four public Google Street View panoramas were opened and visually inspected for
this iteration. Each displayed **March 2026** imagery. The links below request
the inspected approach; Google can snap a future visit to different imagery.
The displayed coordinates record the actual selected panorama. These are visual
references, not an independent survey or a claim that every local street was
checked. No Google imagery, tiles, screenshots or textures are bundled with the
game. The game uses original procedural surfaces and licensed geographic data.

| Reference | Displayed panorama | Observed cues used in the game |
| --- | --- | --- |
| [Telopea Park School / NSW Crescent](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.31445,149.13330&heading=110&pitch=0&fov=80) | -35.3144484, 149.1331508; Barton; heading 110° | Two-storey red-brick base and cream upper facade, white arched central windows, low terracotta roof, dark vertical fence and a parking setback. Broad grass verges, footpath and mature broadleaf trees. Double white road lines, bus-stop markings and a small refuge. |
| [Manuka / Flinders Way](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.32018,149.13372&heading=220&pitch=0&fov=85) | -35.3201931, 149.1347783; Flinders Way; heading 220° | Low cream Art Deco corner retail with stepped parapets, dark continuous awnings and glazed fronts. Broad paved footpaths, cafe furniture, hedge planters, a raised zebra crossing, refuge and curved steel street lights. |
| [Kingston / Giles Street](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.315437,149.140456&heading=170&pitch=0&fov=85) | -35.3154256, 149.1404902; 50 Giles Street; heading 170° | Low cream parapet shops, dark continuous awnings, tall glazing and slim columns. Wide brick paving, red-brick planters, hedges, green benches, parallel parking and curved street lights. A 40-area sign is visible. |
| [Red Hill / Pelsart Street](https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=-35.337204,149.130415&heading=270&pitch=0&fov=85) | -35.3372089, 149.1303658; 42 Pelsart Street; heading 270° | A narrow street with short white centre dashes, wide grass verges, sloping ground and overlapping mature tree canopies. Houses sit behind deep setbacks, hedges and pale low walls; the walking strip includes gravel. |

The first Kingston coordinate snapped to a contributed shop interior dated
October 2020. That interior was discarded; the Giles Street exterior above is
the reference used for street observations.

## Applied interpretation

`world-view.js` enriches the existing main school footprint with the two-storey
brick/cream treatment and central arched windows. Neighbourhood details add a
bounded fence/parking apron. Nearby NSW Crescent road markings use the observed
double-line/bus-stop cues. Manuka and Kingston receive low parapets, dark awnings,
glazing and crossings/refuges at real graph junctions. These are approximate
district treatments; crossing positions and shop dimensions are not surveyed.
Manuka/Kingston mapped commercial footprints also receive clipped brick-colour
paved forecourts where the street-facing setback is clear, following the broad
paved retail frontages in the inspected references. They are not cadastral paving
boundaries and do not replace parks, roads or residential front gardens.

Larger asymmetric broadleaf canopies, tiled/brick/render surfaces, windows,
eaves, chimneys, verandahs, gardens, fences and letterboxes make ordinary streets
fuller. They do not establish the exact species, landscaping, facade or current
business at each address. Red Hill's narrow verge/setback character is a guide
for further refinement; the game still derives simplified footpaths and does
not reproduce each gravel strip or retaining wall.

Road geometry comes from OSM; footprints come from ACT, OSM and Microsoft.
Terrain comes from ACT's 2020 LiDAR-derived two-metre contours, interpolated to
about twelve-metre cells. Street View was used to compare appearance, not to
derive elevations. See [source record](capital-drive-sources.md) and
[terrain validation](../Games/Capital%20Drive/data/geodata-validation.json).
