# Private delivered runtime models

Selected actual members of the user-supplied `Individual_Models_Small.zip` (rigged military/football delivery, 2026-11-08). Private staging use only; no public redistribution/license grant inferred. GLBs are byte-for-byte copies; no bundled scripts were extracted or executed. No football, environment, cockpit, variant, or lower-LOD files are installed. The Kestrel is the delivered full-detail aircraft (no LOD suffix in its actual filename).

| Archive member (local filename is its basename) | Bytes | SHA-256 |
| --- | ---: | --- |
| `output/soldier/FactionA_Soldier_LOD0.glb` | 536688 | `df3db7fd0c372c901ce21ce966dbbbfb6548fee5634bf460363d3ef2c162134a` |
| `output/ground_naval/faction_a_tank_lod0.glb` | 845664 | `b4b1513532560f520ddf4abde6b6aeabc7c15fc2b93e818f6697d3469d8552b8` |
| `output/aircraft/A_Kestrel_multirole.glb` | 344756 | `398d098cc0eb739ecc78f19f0543837971b7d50c8b87a3278f36486d02a70629` |
| `output/ground_naval/faction_a_patrol_lod0.glb` | 590512 | `592fbebaef080e7b2bbf2eb68e491410f184cd35aca74be17eb9ef5f8553c504` |

Total model payload: 2,317,620 bytes. Soldier has one weighted 22-joint skin and four prototype clips; tank/jet/boat are articulated rigid meshes. All four carry embedded PNG textures and no external resources/required extensions. Authored units are metres, Y-up, forward -Z; runtime keeps these transforms and the patrol boat's waterline origin. Team tint is a private-runtime material override, not a file modification.

The pack README recommends Three 0.187.0; this prototype uses the requested matching r186 engine/loader/utils. See `docs/delivered-model-integration.md` for verification limits. These are delivered prototype assets, not an assertion of commissioned-art acceptance or browser/GPU approval.
