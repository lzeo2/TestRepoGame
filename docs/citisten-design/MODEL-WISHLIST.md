# CITISTEN external model wishlist

Operator handoff, 2026-10-22. **Blender is OFF in this repository.** External
sculpting is operator-run. This document requests art; it does not fetch,
register or accept an external asset. No push is authorized.

## Rating and delivery contract

**Quality now** is a subjective photorealism score for the last visually reviewed
procedural baseline (`e2d2df2`, A-world / WORLD-kit / WORLD-agents captures),
not a score for unfinished Astra mesh work. The current detailed procedural
pass is in progress and has not had its new visual review. Scale: 1 = placeholder,
3 = readable blockout, 5 = credible game asset, 8 = convincing close-up,
10 = reference-quality photorealism. Low scores below are intentional.

Triangle targets are **LOD0 per asset**, not whole-scene triangle budgets.
Astra is building original procedural geometry within these targets; an external
artist should improve form and authored detail, not merely subdivide it.
Size caps include geometry and attributable texture payload, in MiB
(1 MiB = 1,048,576 bytes). Share common atlases instead of duplicating them.
Listed caps total **51 MiB**, below the operator's **60,000,000-byte** growth
ceiling with about 6.5 MB reserved for code/evidence. This is a proposed future
art allocation, not permission to ingest it during this pass. Current procedural
code and QA must independently remain below the same 60 MB growth ceiling.

All assets must be original or have explicit reusable source/license evidence.
Deliver local GLB or an equally self-contained mesh package, no remote URIs,
external textures, plugins or required online renderer. Supply a manifest with
actual triangles, bounds, byte sizes, texture resolutions and provenance.
Use metres, Y-up, base at Y=0; citizen, zombie and cars face local -Z. Preserve
existing visual footprints and simulation hitboxes. Ordinary lots are 10m.
Facade/window textures must be at least **512 x 512**, preferably a shared
1024px atlas, with base color, roughness, normal and AO; separate warm window
emission mask. No baked directional sunlight in base color. Provide reduced
LODs and preserve readable silhouettes; the existing 40 FPS gate remains HOLD.

## Items to commission

| Model | Scene role / approximate dimensions | LOD0 triangle target | Payload cap | Quality now /10 | What external sculpt / authored art adds |
| --- | --- | ---: | ---: | ---: | --- |
| Town hall | Civic anchor and clock tower; 18m wide, 15m deep, 17m high | 100k–140k | 8 MiB | 2 | Convincing architectural proportions, carved capitals/pediment, fluted columns, clock relief, cornices, steps and authored masonry/weathering. Preserve the readable civic silhouette. |
| Residential row building | Three-house lot; about 8 x 6m, 4m high | 8k–24k | 3 MiB | 2 | Distinct row-house roofs, gutters/downpipes, recessed doors, framed windows, chimneys, brick bonds and restrained lived-in variation. Avoid random geometry noise. |
| Commercial building | Mid-rise employment block; about 8 x 8m, 11m high | 20k–60k | 4 MiB | 2 | Floor-correct storefront/window proportions, deep reveals, parapets, rooftop HVAC, glazing variation and material transitions. Real shopfront depth without copied branding. |
| Industrial shed | Broad production building; about 9 x 8m, 5.5m high | 8k–30k | 3 MiB | 2 | Corrugated roof/walls, structural bays, loading-door tracks, vents, pipes, believable seams and localized grime. |
| Power plant | Utility source with two stacks; about 8 x 7m, 13m high | 10k–40k | 3 MiB | 2 | Curved stack profiles, service gantries, turbine housing, pipe junctions, cable cabinets and industrial finish variation. No fictional gameplay machinery. |
| Water tower | Elevated water supply; about 6 x 6m, 10m high | 8k–30k | 2 MiB | 2 | Convincing tank curvature, welded seams, ladders, cross-bracing, access platform and realistic painted steel. |
| Police station | Compact public service lot; about 7 x 7m, 5m high | 8k–25k | 2 MiB | 2 | Recessed entrance, credible glazing, civic facade, roof equipment and restrained material identification without borrowed logos. |
| Fire station | Two-bay emergency service; about 8 x 7m, 8m high | 8k–30k | 2 MiB | 2 | Segmented apparatus doors, bay depth, lintels, hose tower details and believable brick/metal transitions. |
| Watchtower | Defensive lookout; about 4 x 4m, 10m high | 8k–30k | 2 MiB | 2 | Braced structural frame, ladder/stairs, guardrails, lookout openings, roof thickness, timber end grain and joints. |
| Wall segment | Repeating defensive boundary, local X axis; 10m long, 1m thick, 4.2m high | 5k–15k | 1 MiB | 2 | Convincing masonry bond, chipped coping, joint depth and clean end-to-end seams. Keep damage cosmetic unless separately integrated. |
| Tree | Park vegetation; roughly 3m crown width, 5m high | 2k–15k per tree | 1 MiB | 1 | Organic trunk taper/branch hierarchy, root flare, leaf clusters and authored bark; natural silhouette variants rather than box or sphere stacks. |
| Park furniture / base | Existing park lot, 8 x 8m; excludes shared tree payload | 5k–12k assembled with trees | 1 MiB | 2 | Proper bench construction, worn path edging and planted-ground transitions. Reuse the commissioned tree; no duplicate texture payload. |
| Zombie | Hunched hostile agent; about 1.65m high, arms forward | 15k–30k | 3 MiB | 1 | Coherent anatomy, purposeful asymmetry, hands/face, convincing torn clothing, authored skin/cloth roughness and deformation-ready topology. No rig or animation acceptance is implied. |
| Citizen | Upright civilian agent; about 1.9m high | 15k–30k | 3 MiB | 1 | Believable anatomy/proportions, face/hair/hands, layered clothing folds, shoes and restrained outfit variation. Later rigging is a separate task. |
| Compact car, base | Current road agent; about 1.7 x 3.5m, 1.5m high | 5k–10k | 2 MiB | 2 | Coherent body surfacing, wheel arches, real tires/rims, cabin glass, headlights, bumpers and panel gaps. Keep current road footprint and orientation. |
| Patrol car variant | Optional visual variant of the same road footprint; not currently a separate sim role | 5k–10k | 1.5 MiB | 1 | Authored trim/lightbar/body variant sharing the base car materials. Currently absent: score is placeholder-level, not a claim it exists. No policing behavior implied. |
| Utility car variant | Optional compact work-vehicle appearance; preserve current car footprint | 5k–10k | 1.5 MiB | 1 | Distinct practical rear body/roof equipment and materials using the shared car kit. Currently absent; no delivery or service behavior implied. |
| Water / terrain material set | Buildable ground remains flat; water is outside the buildable grid | Terrain <=10k; water plane 2, detail in normals | 3 MiB | 1 | Authored tileable grass/soil/asphalt and shoreline transitions; multi-scale water normals/roughness for moving specular. This is a material/environment art task, not an excuse for high-poly flat planes. |

## External handback checklist

- Include beauty views plus wireframe, LOD counts, dimensions and UV layouts.
- Include day/night facade views with emission disabled/enabled; avoid textures
  that imply windows on roofs, undersides or non-building objects.
- Show contact AO separately from base color; no permanent sun-direction shadows.
- Keep all source notices and originality qualifications with the delivery.
- Integration must review silhouettes, footprint fit, materials, disposal, offline
  closure and actual rendered frame cost before replacing procedural assets.
- A large triangle count, accepted wishlist or external render is not gameplay,
  target-hardware performance, publication or photorealism acceptance.
