# Original monster roster and GLB production appendix

Planning-only handoff for the parallel monster RPG concept. This file does not register a game, implement battles, request a backend, or authorize production. The orchestrator owns the final pitch, element wheel and balance. All 80 working species names and creature designs are newly devised here, without franchise references or borrowed assets; this is not a trademark-clearance claim. No GLBs have been generated or verified yet.

## Counts and notation

- **80 species; five elements; exactly 16 species per element; 10 body-plan families of eight.**
- **35 basic, 40 evolved, five boss.** Evolution stage and model tier are separate: non-boss third-stage creatures remain `evolved` for the triangle budget.
- **15 three-stage lines, 15 two-stage lines, five single-stage species.** Evolution never crosses a family or element. Suggested level thresholds: first evolution at 12; second at 26. Single-stage species do not evolve. Bosses are encounter forms of their listed final evolution, not extra species.
- **75 FAMILY-SHARED variants; five BOSS/UNIQUE-GLB species.** Each of the 10 families gets one reusable base topology, not eight unrelated models. The five bosses need new silhouettes. Each species still has a separately named export so its parts and baked vertex colors are unambiguous.
- Stats are individually assigned base **HP / energy / attack / defense / speed**, not level-scaled or measured combat balance. Abilities are ordered slots 1–4, usable immediately for this design draft.
- `basic`: **at most 799 triangles**; `evolved`: **at most 1,499**; `boss`: **at most 2,599**. These are strict `<800 / <1500 / <2600` limits after triangulation, counting every visible part.

## Elements and ability vocabulary

These are anatomy themes, not a replacement for the orchestrator's five-element battle wheel. Every damaging action below has its owner's element. Non-damaging actions have no element multiplier.

| Element | Design domain | Species |
| --- | --- | ---: |
| Cindrel | Stored heat and fired-clay anatomy | 16 |
| Rillune | Fluid pressure and hollow reservoir anatomy | 16 |
| Loamveil | Living fiber and layered soil anatomy | 16 |
| Gleamric | Redirected light and faceted mineral anatomy | 16 |
| Hushmere | Damped sound and folded membrane anatomy | 16 |

Ability glossary is normative for this draft: the roster's four names refer to complete actions below, not unspecified flavor. Each action consumes one turn. Pay energy before its effect; insufficient energy blocks selection. Restore/heal is capped at the user's energy/HP maximum. Healing, shields, energy restore and positive buffs target the user; damage, debuffs and statuses target the active enemy. Abilities do not revive defeated creatures.

`P` is damage power; a suggested neutral baseline is `max(1, floor(P * attack / max(1, defense)))`, before the orchestrator's elemental multiplier. Shields absorb damage first and last until depleted or the end of the next two owner turns; reapplication replaces, not adds. Percentage stat modifiers last until the end of the next two affected-creature turns, do not stack, and refresh on reapplication. Calculate modified stats from base stats, floor, minimum 1. Count duration only on subsequent turns, not the application turn. Switching clears temporary shields, stat modifiers and negative statuses.

Negative status definitions: **Scorch** deals 6 shield-bypassing HP damage at the end of each of the next two affected turns; **Drag** reduces speed 20%; **Fray** reduces defense 20%; **Haze** reduces attack 20%; **Hush** adds 2 to ability energy costs. All last two subsequent affected turns. One negative status at a time; a new status replaces the old. A status or modifier of the same stat replaces that stat's previous modifier, rather than multiplying repeatedly. Self-cleanse removes the negative status only, not other stat modifiers. Energy restore actions remain available at zero energy, except while Hush adds its surcharge. If no action is affordable, a universal **Wait** action restores 3 energy and consumes a turn; it is not a fifth species ability. These rules are a coherent tuning proposal, not code or a mandate to change the main design.

### Cindrel abilities

| Ability | Energy cost | Effect |
| --- | ---: | --- |
| Coal Nudge | 2 | P18 damage |
| Kiln Dart | 4 | P28 damage |
| Soot Hook | 5 | P22 damage; apply Scorch |
| Heat Stitch | 6 | heal 20 HP |
| Ember Bank | 0 | restore 7 energy |
| Ash Apron | 4 | gain an 18-HP shield |
| Draft Lunge | 5 | P20 damage; own speed +20% for 2 turns |
| Slag Seal | 4 | own defense +25% for 2 turns |
| Crucible Cry | 8 | P42 damage |
| Cinder Wake | 7 | P30 damage; apply Scorch |

### Rillune abilities

| Ability | Energy cost | Effect |
| --- | ---: | --- |
| Cup Knock | 2 | P16 damage |
| Runnel Jet | 4 | P26 damage |
| Weir Pull | 5 | P20 damage; apply Drag |
| Reservoir Sip | 6 | heal 24 HP |
| Condense | 0 | restore 8 energy |
| Basin Screen | 4 | gain a 20-HP shield |
| Sluice Step | 5 | P18 damage; own speed +25% for 2 turns |
| Backwash | 6 | P24 damage; remove own negative status |
| Pressure Bell | 8 | P40 damage |
| Undertow Knot | 7 | P28 damage; apply Drag |

### Loamveil abilities

| Ability | Energy cost | Effect |
| --- | ---: | --- |
| Pith Peck | 2 | P18 damage |
| Root Lever | 4 | P28 damage |
| Burr Comb | 5 | P20 damage; apply Fray |
| Sap Mend | 6 | heal 22 HP |
| Mulch Rest | 0 | restore 7 energy |
| Bark Wrap | 4 | gain a 22-HP shield |
| Shoot Rush | 5 | P20 damage; own attack +20% for 2 turns |
| Graft Brace | 4 | own defense +30% for 2 turns |
| Coppice Crush | 8 | P44 damage |
| Furrow Split | 7 | P30 damage; apply Fray |

### Gleamric abilities

| Ability | Energy cost | Effect |
| --- | ---: | --- |
| Facet Tap | 2 | P16 damage |
| Lens Lance | 4 | P30 damage |
| Glare Fold | 5 | P18 damage; apply Haze |
| Luster Patch | 6 | heal 18 HP; remove own negative status |
| Light Gather | 0 | restore 7 energy |
| Prism Screen | 4 | gain a 16-HP shield |
| Ray Skip | 5 | P20 damage; own speed +30% for 2 turns |
| Focus Edge | 4 | own attack +25% for 2 turns |
| Spectrum Cut | 8 | P42 damage |
| Halo Shutter | 7 | P28 damage; apply Haze |

### Hushmere abilities

| Ability | Energy cost | Effect |
| --- | ---: | --- |
| Muffle Bump | 2 | P17 damage |
| Quiet Ripple | 4 | P27 damage |
| Hollow Note | 5 | P19 damage; apply Hush |
| Still Mend | 6 | heal 20 HP |
| Pause Draw | 0 | restore 8 energy |
| Velvet Wall | 4 | gain a 19-HP shield |
| Fold Slip | 5 | P19 damage; own speed +25% for 2 turns |
| Low Chord | 4 | enemy attack -25% for 2 turns |
| Resonant Press | 8 | P41 damage |
| Silence Pleat | 7 | P29 damage; apply Hush |

## GLB delivery contract

Generate original low-poly creatures from anatomy descriptions only. No source images, recognizable franchise silhouettes, logos, lettering, costumes or borrowed models. Solid matte colors with readable silhouettes; no gradients or glowing VFX. The palette columns mean **body / underside / accent**, all baked as opaque `COLOR_0` vertex colors. Inset eye facets use `#181818`; they are part of the joined geometry, not texture decals or separate objects. Each species' parts list replaces sibling variant parts; do not accumulate every family's decorations.

Dimensions are **width X × height Y × depth Z in meters**, including all appendages; tolerance ±5%. Use glTF 2.0 `.glb`, +Y up, facing +Z, ground origin `(0,0,0)`, centered horizontally, lowest support point at Y=0; apply transforms. Stand or perch in a stable neutral pose. Wings, membranes and crests attach to the body; no detached floating parts. One joined static mesh node and one triangle primitive, one opaque matte material with vertex colors, flat normals, 16-bit indices, metallic 0 and roughness 1. Ring/body openings are real thick geometry, not alpha cutouts or single-sided sheets. No rig, skin, bones, animation, morphs, textures, UV dependency, Draco, Meshopt, compression extensions, lights, cameras, pedestal, scenery or VFX. No extension should be required to display the file. These constraints target the existing offline local three.js r160/WebGL1 path; compatibility is not claimed until import verification.

**Batch order:** build and retain each family's base topology first; duplicate it for the seven/eight shared variants, changing only scale, named appendages and vertex-color regions. For the first family of each element there are seven shared species and one unique boss; the second has eight shared species. Author the five bosses separately after the shared silhouettes are reviewed. Family base prototypes are working geometry, not additional species. Do not deliver 80 unrelated sculpted bases. Expected species exports: 75 shared variants + five unique bosses = 80 GLBs. Each prompt below is self-contained for copy-paste; reuse instructions preserve batching without requiring another prompt's text.

| Family | Element | Shared species | Unique species | Base silhouette |
| --- | --- | ---: | --- | --- |
| Kilnback | Cindrel | 7 | Kilnarch | Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. |
| Scoriwing | Cindrel | 8 | none | Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. |
| Cupfin | Rillune | 7 | Vesselorn | Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. |
| Bellstrider | Rillune | 8 | none | Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. |
| Rootspindle | Loamveil | 7 | Rhizocairn | Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. |
| Canopyfold | Loamveil | 8 | none | Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. |
| Prismburrow | Gleamric | 7 | Spectrumor | Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. |
| Halofoil | Gleamric | 8 | none | Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. |
| Hushcoil | Hushmere | 7 | Quiethelix | Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. |
| Echohoop | Hushmere | 8 | none | Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. |

## Family-grouped species and copy-paste prompts

Every roster row assigns all five stats and four ability slots. Every batch row lists the exact dimensions, hues and parts used in its standalone prompt. `none (terminal)` includes both final evolutions and single-stage species.

### F01 Kilnback (Cindrel)

**Shared base geometry:** Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants.

**Evolution lines:**

- Cindupp -> Briknudge -> Hearthol
- Tufflet -> Clastump -> Kilnarch
- Sootnub -> Ashbarrow

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01 | Cindupp | Cindrel | Kilnback | basic; 1/3 | Briknudge (level 12) | FAMILY-SHARED | 48 / 20 / 25 / 30 / 22 | Coal Nudge; Soot Hook; Ember Bank; Ash Apron |
| 02 | Briknudge | Cindrel | Kilnback | evolved; 2/3 | Hearthol (level 26) | FAMILY-SHARED | 72 / 26 / 39 / 46 / 28 | Kiln Dart; Soot Hook; Heat Stitch; Slag Seal |
| 03 | Hearthol | Cindrel | Kilnback | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 100 / 32 / 54 / 65 / 34 | Kiln Dart; Draft Lunge; Slag Seal; Crucible Cry |
| 04 | Tufflet | Cindrel | Kilnback | basic; 1/3 | Clastump (level 12) | FAMILY-SHARED | 45 / 22 / 28 / 25 / 27 | Coal Nudge; Soot Hook; Ember Bank; Slag Seal |
| 05 | Clastump | Cindrel | Kilnback | evolved; 2/3 | Kilnarch (level 26) | FAMILY-SHARED | 74 / 29 / 44 / 42 / 33 | Kiln Dart; Heat Stitch; Ash Apron; Cinder Wake |
| 06 | Kilnarch | Cindrel | Kilnback | boss; 3/3 | none (terminal) | BOSS/UNIQUE-GLB | 148 / 44 / 72 / 88 / 36 | Heat Stitch; Ash Apron; Crucible Cry; Cinder Wake |
| 07 | Sootnub | Cindrel | Kilnback | basic; 1/2 | Ashbarrow (level 12) | FAMILY-SHARED | 52 / 18 / 22 / 34 / 18 | Coal Nudge; Kiln Dart; Ember Bank; Ash Apron |
| 08 | Ashbarrow | Cindrel | Kilnback | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 86 / 25 / 35 / 58 / 24 | Kiln Dart; Soot Hook; Ash Apron; Slag Seal |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Cindupp | 0.55 × 0.38 × 0.72 | #B86745 / #E8D3AF / #E4A24A | one small central dorsal tile; six stubby feet; smooth head |
| Briknudge | 0.78 × 0.55 × 1.02 | #AC533C / #E9CF9B / #D99435 | three overlapping dorsal tiles; broad forefeet; one blunt brow ridge |
| Hearthol | 1.05 × 0.72 × 1.34 | #924535 / #DDC49D / #D88332 | five interlocking dorsal tiles; shovel forefeet; two cheek shields; widened tail paddle |
| Tufflet | 0.50 × 0.42 × 0.65 | #C77952 / #E3D0B2 / #F0B353 | two round dorsal knobs; narrow feet; short upward tail tip |
| Clastump | 0.82 × 0.66 × 1.05 | #A65D48 / #D8C09A / #E49F41 | four blunt back knobs; thick front shoulders; forked paddle tip |
| Kilnarch | 1.80 × 1.45 × 2.20 | #793E35 / #E6CDA5 / #D58A36 | unique six-legged vaulted kiln body; arched plate ribs; huge double shovel forefeet; broad three-lobed tail; crown of five blunt vents |
| Sootnub | 0.48 × 0.32 × 0.60 | #70605A / #CBBB9E / #C88B49 | flat charcoal-colored back slab; wide rear feet; squared tail end |
| Ashbarrow | 0.88 × 0.58 × 1.14 | #61504B / #D3BE9E / #B9793F | two broad back slabs; reinforced cheek plates; thick rectangular tail paddle |

#### 01 Cindupp | FAMILY-SHARED

```text
Generate cindupp.glb: an original Cindrel-type creature named Cindupp, basic tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: one small central dorsal tile; six stubby feet; smooth head; omit other sibling decorations. Overall bounds X width 0.55 m, Y height 0.38 m, Z depth 0.72 m, including appendages, within 5%. Solid matte vertex colors: body #B86745, underside #E8D3AF, accent #E4A24A, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 02 Briknudge | FAMILY-SHARED

```text
Generate briknudge.glb: an original Cindrel-type creature named Briknudge, evolved tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: three overlapping dorsal tiles; broad forefeet; one blunt brow ridge; omit other sibling decorations. Overall bounds X width 0.78 m, Y height 0.55 m, Z depth 1.02 m, including appendages, within 5%. Solid matte vertex colors: body #AC533C, underside #E9CF9B, accent #D99435, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 03 Hearthol | FAMILY-SHARED

```text
Generate hearthol.glb: an original Cindrel-type creature named Hearthol, evolved tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: five interlocking dorsal tiles; shovel forefeet; two cheek shields; widened tail paddle; omit other sibling decorations. Overall bounds X width 1.05 m, Y height 0.72 m, Z depth 1.34 m, including appendages, within 5%. Solid matte vertex colors: body #924535, underside #DDC49D, accent #D88332, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 04 Tufflet | FAMILY-SHARED

```text
Generate tufflet.glb: an original Cindrel-type creature named Tufflet, basic tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: two round dorsal knobs; narrow feet; short upward tail tip; omit other sibling decorations. Overall bounds X width 0.50 m, Y height 0.42 m, Z depth 0.65 m, including appendages, within 5%. Solid matte vertex colors: body #C77952, underside #E3D0B2, accent #F0B353, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 05 Clastump | FAMILY-SHARED

```text
Generate clastump.glb: an original Cindrel-type creature named Clastump, evolved tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: four blunt back knobs; thick front shoulders; forked paddle tip; omit other sibling decorations. Overall bounds X width 0.82 m, Y height 0.66 m, Z depth 1.05 m, including appendages, within 5%. Solid matte vertex colors: body #A65D48, underside #D8C09A, accent #E49F41, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 06 Kilnarch | BOSS/UNIQUE-GLB

```text
Generate kilnarch.glb: an original Cindrel-type creature named Kilnarch, boss tier, BOSS/UNIQUE-GLB. Unique boss geometry, not a scaled family base: unique six-legged vaulted kiln body; arched plate ribs; huge double shovel forefeet; broad three-lobed tail; crown of five blunt vents. Keep Kilnback ancestry through its blunt face and palette, but use this new silhouette. Overall bounds X width 1.80 m, Y height 1.45 m, Z depth 2.20 m, including appendages, within 5%. Solid matte vertex colors: body #793E35, underside #E6CDA5, accent #D58A36, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 2599 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 07 Sootnub | FAMILY-SHARED

```text
Generate sootnub.glb: an original Cindrel-type creature named Sootnub, basic tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: flat charcoal-colored back slab; wide rear feet; squared tail end; omit other sibling decorations. Overall bounds X width 0.48 m, Y height 0.32 m, Z depth 0.60 m, including appendages, within 5%. Solid matte vertex colors: body #70605A, underside #CBBB9E, accent #C88B49, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 08 Ashbarrow | FAMILY-SHARED

```text
Generate ashbarrow.glb: an original Cindrel-type creature named Ashbarrow, evolved tier, FAMILY-SHARED. Family-shared Kilnback variant: Low six-legged oval with a blunt wedge head, three fused dorsal plates, short paddle tail and two inset square eyes. Keep the same torso, head, leg sockets and tail root across shared variants. Species parts only: two broad back slabs; reinforced cheek plates; thick rectangular tail paddle; omit other sibling decorations. Overall bounds X width 0.88 m, Y height 0.58 m, Z depth 1.14 m, including appendages, within 5%. Solid matte vertex colors: body #61504B, underside #D3BE9E, accent #B9793F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F02 Scoriwing (Cindrel)

**Shared base geometry:** Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants.

**Evolution lines:**

- Flarivet -> Tarsail -> Crestoven
- Coppuff -> Fluefrill
- Emberick -> Brazifold
- Sparvane (single-stage)

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 09 | Flarivet | Cindrel | Scoriwing | basic; 1/3 | Tarsail (level 12) | FAMILY-SHARED | 40 / 24 / 29 / 20 / 36 | Coal Nudge; Soot Hook; Ember Bank; Draft Lunge |
| 10 | Tarsail | Cindrel | Scoriwing | evolved; 2/3 | Crestoven (level 26) | FAMILY-SHARED | 62 / 32 / 44 / 31 / 51 | Kiln Dart; Heat Stitch; Draft Lunge; Slag Seal |
| 11 | Crestoven | Cindrel | Scoriwing | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 85 / 40 / 60 / 43 / 66 | Kiln Dart; Draft Lunge; Crucible Cry; Cinder Wake |
| 12 | Coppuff | Cindrel | Scoriwing | basic; 1/2 | Fluefrill (level 12) | FAMILY-SHARED | 46 / 22 / 23 / 27 / 29 | Coal Nudge; Heat Stitch; Ember Bank; Ash Apron |
| 13 | Fluefrill | Cindrel | Scoriwing | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 76 / 30 / 37 / 43 / 40 | Kiln Dart; Soot Hook; Ash Apron; Slag Seal |
| 14 | Emberick | Cindrel | Scoriwing | basic; 1/2 | Brazifold (level 12) | FAMILY-SHARED | 38 / 25 / 31 / 18 / 40 | Coal Nudge; Kiln Dart; Ember Bank; Draft Lunge |
| 15 | Brazifold | Cindrel | Scoriwing | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 60 / 34 / 49 / 29 / 58 | Kiln Dart; Soot Hook; Draft Lunge; Crucible Cry |
| 16 | Sparvane | Cindrel | Scoriwing | basic; 1/1 | none (terminal) | FAMILY-SHARED | 55 / 29 / 34 / 28 / 37 | Coal Nudge; Heat Stitch; Slag Seal; Cinder Wake |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Flarivet | 0.58 × 0.62 × 0.42 | #CF805A / #EED9BC / #D8953C | three ribs per folded wing; tiny forehead stud; short tapered tail |
| Tarsail | 0.88 × 0.92 × 0.62 | #B96D50 / #E4C5A0 / #E4A847 | five ribs per wing; swept brow; long wedge tail |
| Crestoven | 1.22 × 1.26 × 0.80 | #9E503D / #E7CDA6 / #D98D2F | seven ribs per wing; three connected forehead fins; flared tail fan |
| Coppuff | 0.52 × 0.56 × 0.46 | #BD765A / #E1CBB3 / #CA8F46 | rounded chest collar; two broad wing lobes; round tail nub |
| Fluefrill | 0.92 × 0.98 × 0.70 | #A15A46 / #DBBD9C / #D99C49 | stacked chest collar plates; four wing lobes; flat chimney-shaped crest |
| Emberick | 0.66 × 0.58 × 0.40 | #D18B60 / #F0DABD / #B66F39 | thin spear-shaped wing tips; cheek tabs; long narrow tail |
| Brazifold | 1.06 × 0.90 × 0.62 | #A96343 / #E5C6A1 / #C77E30 | double spear wing tips; forward shoulder tabs; split narrow tail |
| Sparvane | 0.60 × 0.70 × 0.48 | #BC684D / #E8CDA9 / #E0A650 | single off-center dorsal vane; blunt diamond wing tips; short ribbed tail |

#### 09 Flarivet | FAMILY-SHARED

```text
Generate flarivet.glb: an original Cindrel-type creature named Flarivet, basic tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: three ribs per folded wing; tiny forehead stud; short tapered tail; omit other sibling decorations. Overall bounds X width 0.58 m, Y height 0.62 m, Z depth 0.42 m, including appendages, within 5%. Solid matte vertex colors: body #CF805A, underside #EED9BC, accent #D8953C, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 10 Tarsail | FAMILY-SHARED

```text
Generate tarsail.glb: an original Cindrel-type creature named Tarsail, evolved tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: five ribs per wing; swept brow; long wedge tail; omit other sibling decorations. Overall bounds X width 0.88 m, Y height 0.92 m, Z depth 0.62 m, including appendages, within 5%. Solid matte vertex colors: body #B96D50, underside #E4C5A0, accent #E4A847, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 11 Crestoven | FAMILY-SHARED

```text
Generate crestoven.glb: an original Cindrel-type creature named Crestoven, evolved tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: seven ribs per wing; three connected forehead fins; flared tail fan; omit other sibling decorations. Overall bounds X width 1.22 m, Y height 1.26 m, Z depth 0.80 m, including appendages, within 5%. Solid matte vertex colors: body #9E503D, underside #E7CDA6, accent #D98D2F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 12 Coppuff | FAMILY-SHARED

```text
Generate coppuff.glb: an original Cindrel-type creature named Coppuff, basic tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: rounded chest collar; two broad wing lobes; round tail nub; omit other sibling decorations. Overall bounds X width 0.52 m, Y height 0.56 m, Z depth 0.46 m, including appendages, within 5%. Solid matte vertex colors: body #BD765A, underside #E1CBB3, accent #CA8F46, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 13 Fluefrill | FAMILY-SHARED

```text
Generate fluefrill.glb: an original Cindrel-type creature named Fluefrill, evolved tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: stacked chest collar plates; four wing lobes; flat chimney-shaped crest; omit other sibling decorations. Overall bounds X width 0.92 m, Y height 0.98 m, Z depth 0.70 m, including appendages, within 5%. Solid matte vertex colors: body #A15A46, underside #DBBD9C, accent #D99C49, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 14 Emberick | FAMILY-SHARED

```text
Generate emberick.glb: an original Cindrel-type creature named Emberick, basic tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: thin spear-shaped wing tips; cheek tabs; long narrow tail; omit other sibling decorations. Overall bounds X width 0.66 m, Y height 0.58 m, Z depth 0.40 m, including appendages, within 5%. Solid matte vertex colors: body #D18B60, underside #F0DABD, accent #B66F39, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 15 Brazifold | FAMILY-SHARED

```text
Generate brazifold.glb: an original Cindrel-type creature named Brazifold, evolved tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: double spear wing tips; forward shoulder tabs; split narrow tail; omit other sibling decorations. Overall bounds X width 1.06 m, Y height 0.90 m, Z depth 0.62 m, including appendages, within 5%. Solid matte vertex colors: body #A96343, underside #E5C6A1, accent #C77E30, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 16 Sparvane | FAMILY-SHARED

```text
Generate sparvane.glb: an original Cindrel-type creature named Sparvane, basic tier, FAMILY-SHARED. Family-shared Scoriwing variant: Pear-shaped upright body on two splayed tripod feet, small blunt-beaked head, two short folded fan wings and a wedge tail. Reuse the torso, neck, wing roots and foot sockets across shared variants. Species parts only: single off-center dorsal vane; blunt diamond wing tips; short ribbed tail; omit other sibling decorations. Overall bounds X width 0.60 m, Y height 0.70 m, Z depth 0.48 m, including appendages, within 5%. Solid matte vertex colors: body #BC684D, underside #E8CDA9, accent #E0A650, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F03 Cupfin (Rillune)

**Shared base geometry:** Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants.

**Evolution lines:**

- Dewgob -> Runnelip -> Basinull
- Driplug -> Weirseal -> Vesselorn
- Poolbit -> Troughlobe

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 17 | Dewgob | Rillune | Cupfin | basic; 1/3 | Runnelip (level 12) | FAMILY-SHARED | 50 / 24 / 22 / 27 / 24 | Cup Knock; Weir Pull; Condense; Basin Screen |
| 18 | Runnelip | Rillune | Cupfin | evolved; 2/3 | Basinull (level 26) | FAMILY-SHARED | 76 / 32 / 34 / 42 / 31 | Runnel Jet; Weir Pull; Reservoir Sip; Backwash |
| 19 | Basinull | Rillune | Cupfin | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 108 / 40 / 47 / 60 / 39 | Runnel Jet; Sluice Step; Backwash; Pressure Bell |
| 20 | Driplug | Rillune | Cupfin | basic; 1/3 | Weirseal (level 12) | FAMILY-SHARED | 55 / 22 / 21 / 32 / 19 | Cup Knock; Weir Pull; Condense; Backwash |
| 21 | Weirseal | Rillune | Cupfin | evolved; 2/3 | Vesselorn (level 26) | FAMILY-SHARED | 88 / 30 / 33 / 52 / 26 | Runnel Jet; Reservoir Sip; Basin Screen; Undertow Knot |
| 22 | Vesselorn | Rillune | Cupfin | boss; 3/3 | none (terminal) | BOSS/UNIQUE-GLB | 166 / 48 / 64 / 84 / 29 | Reservoir Sip; Basin Screen; Pressure Bell; Undertow Knot |
| 23 | Poolbit | Rillune | Cupfin | basic; 1/2 | Troughlobe (level 12) | FAMILY-SHARED | 44 / 27 / 26 / 21 / 32 | Cup Knock; Runnel Jet; Condense; Basin Screen |
| 24 | Troughlobe | Rillune | Cupfin | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 70 / 36 / 41 / 33 / 45 | Runnel Jet; Weir Pull; Basin Screen; Backwash |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Dewgob | 0.58 × 0.34 × 0.68 | #5A89B5 / #DCE4DC / #A6BDD5 | one shallow bowl ridge on back; small triangular fins; round toes |
| Runnelip | 0.82 × 0.50 × 0.96 | #4276A4 / #CFDDD8 / #88B3D4 | two linked bowl ridges; elongated side fins; broad lip shelf |
| Basinull | 1.14 × 0.68 × 1.30 | #335C87 / #DAE5D9 / #8EA8C9 | three low bowl ridges; double-lobed fins; thick horseshoe lip |
| Driplug | 0.52 × 0.40 × 0.64 | #7298B8 / #E5E6D8 / #9CB4D4 | closed dome cap on back; paddle feet; short squared fins |
| Weirseal | 0.88 × 0.64 × 1.06 | #547D9F / #D8E0D0 / #A3BDCF | stepped dome cap; braced front feet; folded rectangular fins |
| Vesselorn | 1.95 × 1.30 × 2.25 | #365975 / #E4E8D9 / #8BB3D4 | unique wide cistern torso on four pillar feet; twin fused reservoir shoulders; flared shelf snout; huge connected rudder tail; five blunt crown plugs |
| Poolbit | 0.46 × 0.30 × 0.62 | #80A9C6 / #E1EADC / #C2D3DF | slim belly; upturned fin edges; extended forked tail |
| Troughlobe | 0.80 × 0.48 × 1.05 | #628AAE / #DCE6D5 / #AFC9DE | long belly ridge; broad upturned fins; two rounded tail forks |

#### 17 Dewgob | FAMILY-SHARED

```text
Generate dewgob.glb: an original Rillune-type creature named Dewgob, basic tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: one shallow bowl ridge on back; small triangular fins; round toes; omit other sibling decorations. Overall bounds X width 0.58 m, Y height 0.34 m, Z depth 0.68 m, including appendages, within 5%. Solid matte vertex colors: body #5A89B5, underside #DCE4DC, accent #A6BDD5, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 18 Runnelip | FAMILY-SHARED

```text
Generate runnelip.glb: an original Rillune-type creature named Runnelip, evolved tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: two linked bowl ridges; elongated side fins; broad lip shelf; omit other sibling decorations. Overall bounds X width 0.82 m, Y height 0.50 m, Z depth 0.96 m, including appendages, within 5%. Solid matte vertex colors: body #4276A4, underside #CFDDD8, accent #88B3D4, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 19 Basinull | FAMILY-SHARED

```text
Generate basinull.glb: an original Rillune-type creature named Basinull, evolved tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: three low bowl ridges; double-lobed fins; thick horseshoe lip; omit other sibling decorations. Overall bounds X width 1.14 m, Y height 0.68 m, Z depth 1.30 m, including appendages, within 5%. Solid matte vertex colors: body #335C87, underside #DAE5D9, accent #8EA8C9, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 20 Driplug | FAMILY-SHARED

```text
Generate driplug.glb: an original Rillune-type creature named Driplug, basic tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: closed dome cap on back; paddle feet; short squared fins; omit other sibling decorations. Overall bounds X width 0.52 m, Y height 0.40 m, Z depth 0.64 m, including appendages, within 5%. Solid matte vertex colors: body #7298B8, underside #E5E6D8, accent #9CB4D4, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 21 Weirseal | FAMILY-SHARED

```text
Generate weirseal.glb: an original Rillune-type creature named Weirseal, evolved tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: stepped dome cap; braced front feet; folded rectangular fins; omit other sibling decorations. Overall bounds X width 0.88 m, Y height 0.64 m, Z depth 1.06 m, including appendages, within 5%. Solid matte vertex colors: body #547D9F, underside #D8E0D0, accent #A3BDCF, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 22 Vesselorn | BOSS/UNIQUE-GLB

```text
Generate vesselorn.glb: an original Rillune-type creature named Vesselorn, boss tier, BOSS/UNIQUE-GLB. Unique boss geometry, not a scaled family base: unique wide cistern torso on four pillar feet; twin fused reservoir shoulders; flared shelf snout; huge connected rudder tail; five blunt crown plugs. Keep Cupfin ancestry through its blunt face and palette, but use this new silhouette. Overall bounds X width 1.95 m, Y height 1.30 m, Z depth 2.25 m, including appendages, within 5%. Solid matte vertex colors: body #365975, underside #E4E8D9, accent #8BB3D4, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 2599 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 23 Poolbit | FAMILY-SHARED

```text
Generate poolbit.glb: an original Rillune-type creature named Poolbit, basic tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: slim belly; upturned fin edges; extended forked tail; omit other sibling decorations. Overall bounds X width 0.46 m, Y height 0.30 m, Z depth 0.62 m, including appendages, within 5%. Solid matte vertex colors: body #80A9C6, underside #E1EADC, accent #C2D3DF, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 24 Troughlobe | FAMILY-SHARED

```text
Generate troughlobe.glb: an original Rillune-type creature named Troughlobe, evolved tier, FAMILY-SHARED. Family-shared Cupfin variant: Squat four-legged reservoir body with an oval belly, wide lip-shaped snout, two attached side fins and a flat forked tail. Reuse belly, snout, leg roots, fin roots and tail root across shared variants. Species parts only: long belly ridge; broad upturned fins; two rounded tail forks; omit other sibling decorations. Overall bounds X width 0.80 m, Y height 0.48 m, Z depth 1.05 m, including appendages, within 5%. Solid matte vertex colors: body #628AAE, underside #DCE6D5, accent #AFC9DE, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F04 Bellstrider (Rillune)

**Shared base geometry:** Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants.

**Evolution lines:**

- Rillipod -> Chimeford -> Catarill
- Mistank -> Fogstilt
- Nacreep -> Tidaloom
- Pluvell (single-stage)

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 25 | Rillipod | Rillune | Bellstrider | basic; 1/3 | Chimeford (level 12) | FAMILY-SHARED | 42 / 26 / 24 / 22 / 35 | Cup Knock; Weir Pull; Condense; Sluice Step |
| 26 | Chimeford | Rillune | Bellstrider | evolved; 2/3 | Catarill (level 26) | FAMILY-SHARED | 66 / 35 / 38 / 34 / 48 | Runnel Jet; Reservoir Sip; Sluice Step; Backwash |
| 27 | Catarill | Rillune | Bellstrider | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 92 / 44 / 52 / 48 / 61 | Runnel Jet; Sluice Step; Pressure Bell; Undertow Knot |
| 28 | Mistank | Rillune | Bellstrider | basic; 1/2 | Fogstilt (level 12) | FAMILY-SHARED | 51 / 24 / 20 / 31 / 24 | Cup Knock; Reservoir Sip; Condense; Basin Screen |
| 29 | Fogstilt | Rillune | Bellstrider | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 82 / 33 / 32 / 50 / 35 | Runnel Jet; Weir Pull; Basin Screen; Backwash |
| 30 | Nacreep | Rillune | Bellstrider | basic; 1/2 | Tidaloom (level 12) | FAMILY-SHARED | 39 / 29 / 27 / 19 / 40 | Cup Knock; Runnel Jet; Condense; Sluice Step |
| 31 | Tidaloom | Rillune | Bellstrider | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 63 / 39 / 43 / 30 / 56 | Runnel Jet; Weir Pull; Sluice Step; Pressure Bell |
| 32 | Pluvell | Rillune | Bellstrider | basic; 1/1 | none (terminal) | FAMILY-SHARED | 58 / 31 / 30 / 34 / 33 | Cup Knock; Reservoir Sip; Backwash; Undertow Knot |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Rillipod | 0.46 × 0.65 × 0.48 | #6C91B3 / #E5E3CE / #AFC8D8 | one scalloped bell rim; short stilts; small side paddles |
| Chimeford | 0.68 × 0.98 × 0.68 | #47779C / #DADCC9 / #90B4CF | double scalloped rim; longer stilts; crescent paddles |
| Catarill | 0.92 × 1.35 × 0.90 | #365E82 / #E4E1CA / #A6BFDA | three stacked rim bands; braced stilts; wide downturned paddles |
| Mistank | 0.56 × 0.54 × 0.54 | #92AABF / #E9E4D7 / #BBCBDC | bulbous bell dome; thick short legs; rounded rim tabs |
| Fogstilt | 0.82 × 0.92 × 0.76 | #738FA8 / #E2DBCB / #A6BDCF | double bulb dome; flared knee pads; four broad rim tabs |
| Nacreep | 0.42 × 0.60 × 0.48 | #81A8B8 / #E8E4CE / #B6CED6 | narrow bell neck; thin bent stilts; swept-back side paddles |
| Tidaloom | 0.64 × 1.04 × 0.72 | #5B8B9F / #DCDCC4 / #98C1D1 | tall ribbed bell neck; angular stilts; doubled swept paddles |
| Pluvell | 0.62 × 0.82 × 0.60 | #587F9B / #ECE5D2 / #B2C8D9 | asymmetric but balanced bell rim; one large left paddle and one small right paddle; broad feet |

#### 25 Rillipod | FAMILY-SHARED

```text
Generate rillipod.glb: an original Rillune-type creature named Rillipod, basic tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: one scalloped bell rim; short stilts; small side paddles; omit other sibling decorations. Overall bounds X width 0.46 m, Y height 0.65 m, Z depth 0.48 m, including appendages, within 5%. Solid matte vertex colors: body #6C91B3, underside #E5E3CE, accent #AFC8D8, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 26 Chimeford | FAMILY-SHARED

```text
Generate chimeford.glb: an original Rillune-type creature named Chimeford, evolved tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: double scalloped rim; longer stilts; crescent paddles; omit other sibling decorations. Overall bounds X width 0.68 m, Y height 0.98 m, Z depth 0.68 m, including appendages, within 5%. Solid matte vertex colors: body #47779C, underside #DADCC9, accent #90B4CF, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 27 Catarill | FAMILY-SHARED

```text
Generate catarill.glb: an original Rillune-type creature named Catarill, evolved tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: three stacked rim bands; braced stilts; wide downturned paddles; omit other sibling decorations. Overall bounds X width 0.92 m, Y height 1.35 m, Z depth 0.90 m, including appendages, within 5%. Solid matte vertex colors: body #365E82, underside #E4E1CA, accent #A6BFDA, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 28 Mistank | FAMILY-SHARED

```text
Generate mistank.glb: an original Rillune-type creature named Mistank, basic tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: bulbous bell dome; thick short legs; rounded rim tabs; omit other sibling decorations. Overall bounds X width 0.56 m, Y height 0.54 m, Z depth 0.54 m, including appendages, within 5%. Solid matte vertex colors: body #92AABF, underside #E9E4D7, accent #BBCBDC, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 29 Fogstilt | FAMILY-SHARED

```text
Generate fogstilt.glb: an original Rillune-type creature named Fogstilt, evolved tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: double bulb dome; flared knee pads; four broad rim tabs; omit other sibling decorations. Overall bounds X width 0.82 m, Y height 0.92 m, Z depth 0.76 m, including appendages, within 5%. Solid matte vertex colors: body #738FA8, underside #E2DBCB, accent #A6BDCF, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 30 Nacreep | FAMILY-SHARED

```text
Generate nacreep.glb: an original Rillune-type creature named Nacreep, basic tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: narrow bell neck; thin bent stilts; swept-back side paddles; omit other sibling decorations. Overall bounds X width 0.42 m, Y height 0.60 m, Z depth 0.48 m, including appendages, within 5%. Solid matte vertex colors: body #81A8B8, underside #E8E4CE, accent #B6CED6, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 31 Tidaloom | FAMILY-SHARED

```text
Generate tidaloom.glb: an original Rillune-type creature named Tidaloom, evolved tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: tall ribbed bell neck; angular stilts; doubled swept paddles; omit other sibling decorations. Overall bounds X width 0.64 m, Y height 1.04 m, Z depth 0.72 m, including appendages, within 5%. Solid matte vertex colors: body #5B8B9F, underside #DCDCC4, accent #98C1D1, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 32 Pluvell | FAMILY-SHARED

```text
Generate pluvell.glb: an original Rillune-type creature named Pluvell, basic tier, FAMILY-SHARED. Family-shared Bellstrider variant: Inverted bell body above four stilt legs, small face inset on the front rim, two attached side paddles and a short rear balancing peg. Reuse the bell core, rim and four leg attachment points across shared variants. Species parts only: asymmetric but balanced bell rim; one large left paddle and one small right paddle; broad feet; omit other sibling decorations. Overall bounds X width 0.62 m, Y height 0.82 m, Z depth 0.60 m, including appendages, within 5%. Solid matte vertex colors: body #587F9B, underside #ECE5D2, accent #B2C8D9, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F05 Rootspindle (Loamveil)

**Shared base geometry:** Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants.

**Evolution lines:**

- Budriv -> Vinchew -> Trellisect
- Loamtick -> Furrowisp -> Rhizocairn
- Pithnip -> Bolegraze

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | Budriv | Loamveil | Rootspindle | basic; 1/3 | Vinchew (level 12) | FAMILY-SHARED | 46 / 22 / 27 / 26 / 25 | Pith Peck; Burr Comb; Mulch Rest; Bark Wrap |
| 34 | Vinchew | Loamveil | Rootspindle | evolved; 2/3 | Trellisect (level 26) | FAMILY-SHARED | 71 / 29 / 42 / 40 / 34 | Root Lever; Burr Comb; Sap Mend; Graft Brace |
| 35 | Trellisect | Loamveil | Rootspindle | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 99 / 36 / 57 / 57 / 44 | Root Lever; Shoot Rush; Graft Brace; Coppice Crush |
| 36 | Loamtick | Loamveil | Rootspindle | basic; 1/3 | Furrowisp (level 12) | FAMILY-SHARED | 53 / 20 / 24 / 33 / 19 | Pith Peck; Burr Comb; Mulch Rest; Graft Brace |
| 37 | Furrowisp | Loamveil | Rootspindle | evolved; 2/3 | Rhizocairn (level 26) | FAMILY-SHARED | 84 / 27 / 38 / 53 / 27 | Root Lever; Sap Mend; Bark Wrap; Furrow Split |
| 38 | Rhizocairn | Loamveil | Rootspindle | boss; 3/3 | none (terminal) | BOSS/UNIQUE-GLB | 158 / 43 / 76 / 85 / 28 | Sap Mend; Bark Wrap; Coppice Crush; Furrow Split |
| 39 | Pithnip | Loamveil | Rootspindle | basic; 1/2 | Bolegraze (level 12) | FAMILY-SHARED | 42 / 24 / 30 / 21 / 33 | Pith Peck; Root Lever; Mulch Rest; Bark Wrap |
| 40 | Bolegraze | Loamveil | Rootspindle | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 67 / 32 / 47 / 33 / 46 | Root Lever; Burr Comb; Bark Wrap; Graft Brace |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Budriv | 0.44 × 0.32 × 0.72 | #89945A / #DBCBA2 / #B89245 | one folded bud on back; six short legs; tiny cheek shoots |
| Vinchew | 0.68 × 0.50 × 1.06 | #738045 / #CFBE90 / #C4A255 | two curled back shoots; hooked forelegs; broad cheek leaves |
| Trellisect | 0.96 × 0.70 × 1.46 | #596C39 / #D8C598 / #AB8C3F | three connected trellis arches over back; shovel forelegs; split cheek leaves |
| Loamtick | 0.48 × 0.36 × 0.66 | #95855B / #E2CCA3 / #798646 | two soil-like dorsal plates; blunt legs; round face shield |
| Furrowisp | 0.78 × 0.60 × 1.00 | #806E48 / #D6BE91 / #89934E | four dorsal plates; thick foreleg cuffs; forked face shield |
| Rhizocairn | 1.85 × 1.40 × 2.35 | #655A3C / #DAC494 / #778847 | unique six-legged root mound with buttress torso; three fused root arches; broad spade head; crown of blunt root stubs; three-prong anchored tail |
| Pithnip | 0.40 × 0.30 × 0.64 | #A1A76A / #E5D8AE / #B39B52 | narrow pod body; long pointed forelegs; single upright back shoot |
| Bolegraze | 0.66 × 0.46 × 1.10 | #788C50 / #D4CAA0 / #A7893E | long segmented pod; two upright shoots; blade-shaped forelegs and tail tip |

#### 33 Budriv | FAMILY-SHARED

```text
Generate budriv.glb: an original Loamveil-type creature named Budriv, basic tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: one folded bud on back; six short legs; tiny cheek shoots; omit other sibling decorations. Overall bounds X width 0.44 m, Y height 0.32 m, Z depth 0.72 m, including appendages, within 5%. Solid matte vertex colors: body #89945A, underside #DBCBA2, accent #B89245, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 34 Vinchew | FAMILY-SHARED

```text
Generate vinchew.glb: an original Loamveil-type creature named Vinchew, evolved tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: two curled back shoots; hooked forelegs; broad cheek leaves; omit other sibling decorations. Overall bounds X width 0.68 m, Y height 0.50 m, Z depth 1.06 m, including appendages, within 5%. Solid matte vertex colors: body #738045, underside #CFBE90, accent #C4A255, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 35 Trellisect | FAMILY-SHARED

```text
Generate trellisect.glb: an original Loamveil-type creature named Trellisect, evolved tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: three connected trellis arches over back; shovel forelegs; split cheek leaves; omit other sibling decorations. Overall bounds X width 0.96 m, Y height 0.70 m, Z depth 1.46 m, including appendages, within 5%. Solid matte vertex colors: body #596C39, underside #D8C598, accent #AB8C3F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 36 Loamtick | FAMILY-SHARED

```text
Generate loamtick.glb: an original Loamveil-type creature named Loamtick, basic tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: two soil-like dorsal plates; blunt legs; round face shield; omit other sibling decorations. Overall bounds X width 0.48 m, Y height 0.36 m, Z depth 0.66 m, including appendages, within 5%. Solid matte vertex colors: body #95855B, underside #E2CCA3, accent #798646, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 37 Furrowisp | FAMILY-SHARED

```text
Generate furrowisp.glb: an original Loamveil-type creature named Furrowisp, evolved tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: four dorsal plates; thick foreleg cuffs; forked face shield; omit other sibling decorations. Overall bounds X width 0.78 m, Y height 0.60 m, Z depth 1.00 m, including appendages, within 5%. Solid matte vertex colors: body #806E48, underside #D6BE91, accent #89934E, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 38 Rhizocairn | BOSS/UNIQUE-GLB

```text
Generate rhizocairn.glb: an original Loamveil-type creature named Rhizocairn, boss tier, BOSS/UNIQUE-GLB. Unique boss geometry, not a scaled family base: unique six-legged root mound with buttress torso; three fused root arches; broad spade head; crown of blunt root stubs; three-prong anchored tail. Keep Rootspindle ancestry through its blunt face and palette, but use this new silhouette. Overall bounds X width 1.85 m, Y height 1.40 m, Z depth 2.35 m, including appendages, within 5%. Solid matte vertex colors: body #655A3C, underside #DAC494, accent #778847, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 2599 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 39 Pithnip | FAMILY-SHARED

```text
Generate pithnip.glb: an original Loamveil-type creature named Pithnip, basic tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: narrow pod body; long pointed forelegs; single upright back shoot; omit other sibling decorations. Overall bounds X width 0.40 m, Y height 0.30 m, Z depth 0.64 m, including appendages, within 5%. Solid matte vertex colors: body #A1A76A, underside #E5D8AE, accent #B39B52, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 40 Bolegraze | FAMILY-SHARED

```text
Generate bolegraze.glb: an original Loamveil-type creature named Bolegraze, evolved tier, FAMILY-SHARED. Family-shared Rootspindle variant: Long segmented seedpod torso on six pointed walking legs, small wedge face, paired cheek shoots and a short root tail. Reuse the three torso segments, face block, leg roots and tail root across shared variants. Species parts only: long segmented pod; two upright shoots; blade-shaped forelegs and tail tip; omit other sibling decorations. Overall bounds X width 0.66 m, Y height 0.46 m, Z depth 1.10 m, including appendages, within 5%. Solid matte vertex colors: body #788C50, underside #D4CAA0, accent #A7893E, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F06 Canopyfold (Loamveil)

**Shared base geometry:** Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants.

**Evolution lines:**

- Leafnock -> Veilbough -> Coppicrown
- Burruff -> Thornmantle
- Mosskip -> Fernclasp
- Sprigbell (single-stage)

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 41 | Leafnock | Loamveil | Canopyfold | basic; 1/3 | Veilbough (level 12) | FAMILY-SHARED | 47 / 24 / 24 / 28 / 26 | Pith Peck; Burr Comb; Mulch Rest; Shoot Rush |
| 42 | Veilbough | Loamveil | Canopyfold | evolved; 2/3 | Coppicrown (level 26) | FAMILY-SHARED | 73 / 32 / 38 / 43 / 36 | Root Lever; Sap Mend; Shoot Rush; Graft Brace |
| 43 | Coppicrown | Loamveil | Canopyfold | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 103 / 40 / 52 / 61 / 47 | Root Lever; Shoot Rush; Coppice Crush; Furrow Split |
| 44 | Burruff | Loamveil | Canopyfold | basic; 1/2 | Thornmantle (level 12) | FAMILY-SHARED | 54 / 20 / 26 / 34 / 18 | Pith Peck; Sap Mend; Mulch Rest; Bark Wrap |
| 45 | Thornmantle | Loamveil | Canopyfold | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 87 / 28 / 42 / 55 / 26 | Root Lever; Burr Comb; Bark Wrap; Graft Brace |
| 46 | Mosskip | Loamveil | Canopyfold | basic; 1/2 | Fernclasp (level 12) | FAMILY-SHARED | 40 / 26 / 28 / 20 / 39 | Pith Peck; Root Lever; Mulch Rest; Shoot Rush |
| 47 | Fernclasp | Loamveil | Canopyfold | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 65 / 35 / 44 / 32 / 55 | Root Lever; Burr Comb; Shoot Rush; Coppice Crush |
| 48 | Sprigbell | Loamveil | Canopyfold | basic; 1/1 | none (terminal) | FAMILY-SHARED | 60 / 30 / 32 / 37 / 29 | Pith Peck; Sap Mend; Graft Brace; Furrow Split |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Leafnock | 0.58 × 0.56 × 0.42 | #8F9D64 / #E0D2A8 / #B39651 | single hood leaf; two small arm panels; rounded feet |
| Veilbough | 0.86 × 0.84 × 0.62 | #718348 / #D1C397 / #AE8741 | two layered hood leaves; long arm panels; stem-shaped brow |
| Coppicrown | 1.20 × 1.16 × 0.84 | #526B3C / #DCCBA0 / #C09C4B | three hood leaves forming broad crown; ribbed arm panels; reinforced split feet |
| Burruff | 0.52 × 0.48 × 0.48 | #998951 / #E3CCA0 / #7F914D | three blunt hood burrs; round arm lobes; squat torso |
| Thornmantle | 0.86 × 0.78 × 0.72 | #7F713E / #D5BE8C / #6B8042 | seven short blunt hood burrs; thick shoulder mantle; broad arm lobes |
| Mosskip | 0.60 × 0.46 × 0.38 | #A3AC79 / #E4DDBA / #988145 | flat trailing hood; narrow arm panels; long split toes |
| Fernclasp | 0.96 × 0.72 × 0.58 | #7B925C / #D4CCA4 / #AF9351 | forked trailing hood; jointless hooked arm panels; long flat feet |
| Sprigbell | 0.62 × 0.64 × 0.50 | #889960 / #E6D5AA / #BA984B | bell-shaped closed hood; one left cheek sprig and two right cheek sprigs; broad front arm panels |

#### 41 Leafnock | FAMILY-SHARED

```text
Generate leafnock.glb: an original Loamveil-type creature named Leafnock, basic tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: single hood leaf; two small arm panels; rounded feet; omit other sibling decorations. Overall bounds X width 0.58 m, Y height 0.56 m, Z depth 0.42 m, including appendages, within 5%. Solid matte vertex colors: body #8F9D64, underside #E0D2A8, accent #B39651, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 42 Veilbough | FAMILY-SHARED

```text
Generate veilbough.glb: an original Loamveil-type creature named Veilbough, evolved tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: two layered hood leaves; long arm panels; stem-shaped brow; omit other sibling decorations. Overall bounds X width 0.86 m, Y height 0.84 m, Z depth 0.62 m, including appendages, within 5%. Solid matte vertex colors: body #718348, underside #D1C397, accent #AE8741, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 43 Coppicrown | FAMILY-SHARED

```text
Generate coppicrown.glb: an original Loamveil-type creature named Coppicrown, evolved tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: three hood leaves forming broad crown; ribbed arm panels; reinforced split feet; omit other sibling decorations. Overall bounds X width 1.20 m, Y height 1.16 m, Z depth 0.84 m, including appendages, within 5%. Solid matte vertex colors: body #526B3C, underside #DCCBA0, accent #C09C4B, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 44 Burruff | FAMILY-SHARED

```text
Generate burruff.glb: an original Loamveil-type creature named Burruff, basic tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: three blunt hood burrs; round arm lobes; squat torso; omit other sibling decorations. Overall bounds X width 0.52 m, Y height 0.48 m, Z depth 0.48 m, including appendages, within 5%. Solid matte vertex colors: body #998951, underside #E3CCA0, accent #7F914D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 45 Thornmantle | FAMILY-SHARED

```text
Generate thornmantle.glb: an original Loamveil-type creature named Thornmantle, evolved tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: seven short blunt hood burrs; thick shoulder mantle; broad arm lobes; omit other sibling decorations. Overall bounds X width 0.86 m, Y height 0.78 m, Z depth 0.72 m, including appendages, within 5%. Solid matte vertex colors: body #7F713E, underside #D5BE8C, accent #6B8042, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 46 Mosskip | FAMILY-SHARED

```text
Generate mosskip.glb: an original Loamveil-type creature named Mosskip, basic tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: flat trailing hood; narrow arm panels; long split toes; omit other sibling decorations. Overall bounds X width 0.60 m, Y height 0.46 m, Z depth 0.38 m, including appendages, within 5%. Solid matte vertex colors: body #A3AC79, underside #E4DDBA, accent #988145, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 47 Fernclasp | FAMILY-SHARED

```text
Generate fernclasp.glb: an original Loamveil-type creature named Fernclasp, evolved tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: forked trailing hood; jointless hooked arm panels; long flat feet; omit other sibling decorations. Overall bounds X width 0.96 m, Y height 0.72 m, Z depth 0.58 m, including appendages, within 5%. Solid matte vertex colors: body #7B925C, underside #D4CCA4, accent #AF9351, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 48 Sprigbell | FAMILY-SHARED

```text
Generate sprigbell.glb: an original Loamveil-type creature named Sprigbell, basic tier, FAMILY-SHARED. Family-shared Canopyfold variant: Short upright bulb torso on two broad split feet, small face under a hood, two leaf-shaped folded arm panels and a stub stem tail. Reuse bulb, hood core, shoulder roots and foot sockets across shared variants. Species parts only: bell-shaped closed hood; one left cheek sprig and two right cheek sprigs; broad front arm panels; omit other sibling decorations. Overall bounds X width 0.62 m, Y height 0.64 m, Z depth 0.50 m, including appendages, within 5%. Solid matte vertex colors: body #889960, underside #E6D5AA, accent #BA984B, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F07 Prismburrow (Gleamric)

**Shared base geometry:** Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants.

**Evolution lines:**

- Shardip -> Facetusk -> Geodelve
- Glimknob -> Latticlaw -> Spectrumor
- Chalkit -> Opalden

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 49 | Shardip | Gleamric | Prismburrow | basic; 1/3 | Facetusk (level 12) | FAMILY-SHARED | 43 / 25 / 28 / 24 / 30 | Facet Tap; Glare Fold; Light Gather; Prism Screen |
| 50 | Facetusk | Gleamric | Prismburrow | evolved; 2/3 | Geodelve (level 26) | FAMILY-SHARED | 67 / 33 / 44 / 37 / 42 | Lens Lance; Glare Fold; Luster Patch; Focus Edge |
| 51 | Geodelve | Gleamric | Prismburrow | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 93 / 41 / 60 / 53 / 55 | Lens Lance; Ray Skip; Focus Edge; Spectrum Cut |
| 52 | Glimknob | Gleamric | Prismburrow | basic; 1/3 | Latticlaw (level 12) | FAMILY-SHARED | 50 / 23 / 23 / 32 / 22 | Facet Tap; Glare Fold; Light Gather; Focus Edge |
| 53 | Latticlaw | Gleamric | Prismburrow | evolved; 2/3 | Spectrumor (level 26) | FAMILY-SHARED | 81 / 31 / 37 / 52 / 31 | Lens Lance; Luster Patch; Prism Screen; Halo Shutter |
| 54 | Spectrumor | Gleamric | Prismburrow | boss; 3/3 | none (terminal) | BOSS/UNIQUE-GLB | 146 / 47 / 82 / 78 / 38 | Luster Patch; Prism Screen; Spectrum Cut; Halo Shutter |
| 55 | Chalkit | Gleamric | Prismburrow | basic; 1/2 | Opalden (level 12) | FAMILY-SHARED | 38 / 28 / 32 / 19 / 39 | Facet Tap; Lens Lance; Light Gather; Prism Screen |
| 56 | Opalden | Gleamric | Prismburrow | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 61 / 38 / 51 / 30 / 56 | Lens Lance; Glare Fold; Prism Screen; Focus Edge |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Shardip | 0.50 × 0.34 × 0.66 | #958AB3 / #E9DFCD / #CAB45D | one small back facet; short ear plates; rounded spade feet |
| Facetusk | 0.76 × 0.52 × 0.96 | #7D709F / #DED2BC / #C6A84D | three back facets; two blunt cheek wedges; wide front spades |
| Geodelve | 1.04 × 0.72 × 1.32 | #635884 / #E4D9C6 / #B6963D | five back facets; broad diamond forehead; double-layer front spades |
| Glimknob | 0.54 × 0.40 × 0.62 | #ABA0BC / #EDE3D0 / #D2BD75 | rounded polygonal back dome; thick ear plates; short tail |
| Latticlaw | 0.86 × 0.66 × 1.02 | #8D809F / #D8CAB5 / #BFA55E | crossed solid back ridges without holes; squared cheek plates; thick spade toes |
| Spectrumor | 1.90 × 1.45 × 2.30 | #6A5B87 / #E8DDC8 / #C4A64E | unique low crystal bastion torso on four enormous spade feet; seven fused stepped dorsal facets; split diamond brow; two side buttresses; broad chevron tail |
| Chalkit | 0.46 × 0.30 × 0.70 | #C2BAC9 / #F0E8D8 / #BDA963 | slim pale torso; swept ear plates; long chisel tail |
| Opalden | 0.74 × 0.48 × 1.14 | #A69DB6 / #E6DDC8 / #B49342 | elongated faceted back; double swept ear plates; tapered split chisel tail |

#### 49 Shardip | FAMILY-SHARED

```text
Generate shardip.glb: an original Gleamric-type creature named Shardip, basic tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: one small back facet; short ear plates; rounded spade feet; omit other sibling decorations. Overall bounds X width 0.50 m, Y height 0.34 m, Z depth 0.66 m, including appendages, within 5%. Solid matte vertex colors: body #958AB3, underside #E9DFCD, accent #CAB45D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 50 Facetusk | FAMILY-SHARED

```text
Generate facetusk.glb: an original Gleamric-type creature named Facetusk, evolved tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: three back facets; two blunt cheek wedges; wide front spades; omit other sibling decorations. Overall bounds X width 0.76 m, Y height 0.52 m, Z depth 0.96 m, including appendages, within 5%. Solid matte vertex colors: body #7D709F, underside #DED2BC, accent #C6A84D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 51 Geodelve | FAMILY-SHARED

```text
Generate geodelve.glb: an original Gleamric-type creature named Geodelve, evolved tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: five back facets; broad diamond forehead; double-layer front spades; omit other sibling decorations. Overall bounds X width 1.04 m, Y height 0.72 m, Z depth 1.32 m, including appendages, within 5%. Solid matte vertex colors: body #635884, underside #E4D9C6, accent #B6963D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 52 Glimknob | FAMILY-SHARED

```text
Generate glimknob.glb: an original Gleamric-type creature named Glimknob, basic tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: rounded polygonal back dome; thick ear plates; short tail; omit other sibling decorations. Overall bounds X width 0.54 m, Y height 0.40 m, Z depth 0.62 m, including appendages, within 5%. Solid matte vertex colors: body #ABA0BC, underside #EDE3D0, accent #D2BD75, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 53 Latticlaw | FAMILY-SHARED

```text
Generate latticlaw.glb: an original Gleamric-type creature named Latticlaw, evolved tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: crossed solid back ridges without holes; squared cheek plates; thick spade toes; omit other sibling decorations. Overall bounds X width 0.86 m, Y height 0.66 m, Z depth 1.02 m, including appendages, within 5%. Solid matte vertex colors: body #8D809F, underside #D8CAB5, accent #BFA55E, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 54 Spectrumor | BOSS/UNIQUE-GLB

```text
Generate spectrumor.glb: an original Gleamric-type creature named Spectrumor, boss tier, BOSS/UNIQUE-GLB. Unique boss geometry, not a scaled family base: unique low crystal bastion torso on four enormous spade feet; seven fused stepped dorsal facets; split diamond brow; two side buttresses; broad chevron tail. Keep Prismburrow ancestry through its blunt face and palette, but use this new silhouette. Overall bounds X width 1.90 m, Y height 1.45 m, Z depth 2.30 m, including appendages, within 5%. Solid matte vertex colors: body #6A5B87, underside #E8DDC8, accent #C4A64E, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 2599 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 55 Chalkit | FAMILY-SHARED

```text
Generate chalkit.glb: an original Gleamric-type creature named Chalkit, basic tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: slim pale torso; swept ear plates; long chisel tail; omit other sibling decorations. Overall bounds X width 0.46 m, Y height 0.30 m, Z depth 0.70 m, including appendages, within 5%. Solid matte vertex colors: body #C2BAC9, underside #F0E8D8, accent #BDA963, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 56 Opalden | FAMILY-SHARED

```text
Generate opalden.glb: an original Gleamric-type creature named Opalden, evolved tier, FAMILY-SHARED. Family-shared Prismburrow variant: Low faceted pear torso on four spade feet, blunt diamond head, two triangular ear plates and a short chisel tail. Reuse the torso facets, head core, leg sockets and tail root across shared variants. Species parts only: elongated faceted back; double swept ear plates; tapered split chisel tail; omit other sibling decorations. Overall bounds X width 0.74 m, Y height 0.48 m, Z depth 1.14 m, including appendages, within 5%. Solid matte vertex colors: body #A69DB6, underside #E6DDC8, accent #B49342, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F08 Halofoil (Gleamric)

**Shared base geometry:** Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants.

**Evolution lines:**

- Raymote -> Lensfoil -> Aurelvane
- Glasprig -> Refrafold
- Lustrip -> Sheenlobe
- Halodot (single-stage)

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 57 | Raymote | Gleamric | Halofoil | basic; 1/3 | Lensfoil (level 12) | FAMILY-SHARED | 37 / 28 / 30 / 18 / 43 | Facet Tap; Glare Fold; Light Gather; Ray Skip |
| 58 | Lensfoil | Gleamric | Halofoil | evolved; 2/3 | Aurelvane (level 26) | FAMILY-SHARED | 59 / 38 / 48 / 29 / 61 | Lens Lance; Luster Patch; Ray Skip; Focus Edge |
| 59 | Aurelvane | Gleamric | Halofoil | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 82 / 47 / 66 / 41 / 78 | Lens Lance; Ray Skip; Spectrum Cut; Halo Shutter |
| 60 | Glasprig | Gleamric | Halofoil | basic; 1/2 | Refrafold (level 12) | FAMILY-SHARED | 44 / 26 / 25 / 27 / 32 | Facet Tap; Luster Patch; Light Gather; Prism Screen |
| 61 | Refrafold | Gleamric | Halofoil | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 72 / 35 / 40 / 44 / 45 | Lens Lance; Glare Fold; Prism Screen; Focus Edge |
| 62 | Lustrip | Gleamric | Halofoil | basic; 1/2 | Sheenlobe (level 12) | FAMILY-SHARED | 35 / 30 / 34 / 16 / 47 | Facet Tap; Lens Lance; Light Gather; Ray Skip |
| 63 | Sheenlobe | Gleamric | Halofoil | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 56 / 41 / 54 / 26 / 67 | Lens Lance; Glare Fold; Ray Skip; Spectrum Cut |
| 64 | Halodot | Gleamric | Halofoil | basic; 1/1 | none (terminal) | FAMILY-SHARED | 52 / 34 / 37 / 30 / 41 | Facet Tap; Luster Patch; Focus Edge; Halo Shutter |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Raymote | 0.62 × 0.60 × 0.30 | #B6A7CB / #EEE3CB / #C6B35F | thin single crest arc attached at both ends; small diamond foils; short feet |
| Lensfoil | 0.94 × 0.90 × 0.44 | #9484B2 / #DFD1B9 / #C4A74A | thick crescent crest; broad folded foils; central cheek facet |
| Aurelvane | 1.28 × 1.24 × 0.58 | #786695 / #E9DCC3 / #B9973A | double connected crest crescents; layered foil edges; three-part brow facet |
| Glasprig | 0.54 × 0.54 × 0.34 | #C0B0C8 / #ECE0CD / #B7A36B | short blunt crest sprig; round-ended foils; thick wedge feet |
| Refrafold | 0.88 × 0.86 × 0.50 | #9E8AAE / #DDCFB8 / #C0A25C | three connected crest prongs; wide rectangular foils; reinforced face frame |
| Lustrip | 0.70 × 0.52 × 0.28 | #AB9FC5 / #F1E8D4 / #D1BA64 | narrow backward crest; pointed foils; long forward toes |
| Sheenlobe | 1.10 × 0.82 × 0.42 | #8C7EB0 / #E1D7C2 / #BDA044 | long hooked crest attached to neck; split pointed foils; extended wedge toes |
| Halodot | 0.68 × 0.74 × 0.36 | #A396BC / #EFE1C6 / #BBA052 | closed polygon crest loop fused to head; one large and one small foil lobe on each side; squat wedge feet |

#### 57 Raymote | FAMILY-SHARED

```text
Generate raymote.glb: an original Gleamric-type creature named Raymote, basic tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: thin single crest arc attached at both ends; small diamond foils; short feet; omit other sibling decorations. Overall bounds X width 0.62 m, Y height 0.60 m, Z depth 0.30 m, including appendages, within 5%. Solid matte vertex colors: body #B6A7CB, underside #EEE3CB, accent #C6B35F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 58 Lensfoil | FAMILY-SHARED

```text
Generate lensfoil.glb: an original Gleamric-type creature named Lensfoil, evolved tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: thick crescent crest; broad folded foils; central cheek facet; omit other sibling decorations. Overall bounds X width 0.94 m, Y height 0.90 m, Z depth 0.44 m, including appendages, within 5%. Solid matte vertex colors: body #9484B2, underside #DFD1B9, accent #C4A74A, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 59 Aurelvane | FAMILY-SHARED

```text
Generate aurelvane.glb: an original Gleamric-type creature named Aurelvane, evolved tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: double connected crest crescents; layered foil edges; three-part brow facet; omit other sibling decorations. Overall bounds X width 1.28 m, Y height 1.24 m, Z depth 0.58 m, including appendages, within 5%. Solid matte vertex colors: body #786695, underside #E9DCC3, accent #B9973A, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 60 Glasprig | FAMILY-SHARED

```text
Generate glasprig.glb: an original Gleamric-type creature named Glasprig, basic tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: short blunt crest sprig; round-ended foils; thick wedge feet; omit other sibling decorations. Overall bounds X width 0.54 m, Y height 0.54 m, Z depth 0.34 m, including appendages, within 5%. Solid matte vertex colors: body #C0B0C8, underside #ECE0CD, accent #B7A36B, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 61 Refrafold | FAMILY-SHARED

```text
Generate refrafold.glb: an original Gleamric-type creature named Refrafold, evolved tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: three connected crest prongs; wide rectangular foils; reinforced face frame; omit other sibling decorations. Overall bounds X width 0.88 m, Y height 0.86 m, Z depth 0.50 m, including appendages, within 5%. Solid matte vertex colors: body #9E8AAE, underside #DDCFB8, accent #C0A25C, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 62 Lustrip | FAMILY-SHARED

```text
Generate lustrip.glb: an original Gleamric-type creature named Lustrip, basic tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: narrow backward crest; pointed foils; long forward toes; omit other sibling decorations. Overall bounds X width 0.70 m, Y height 0.52 m, Z depth 0.28 m, including appendages, within 5%. Solid matte vertex colors: body #AB9FC5, underside #F1E8D4, accent #D1BA64, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 63 Sheenlobe | FAMILY-SHARED

```text
Generate sheenlobe.glb: an original Gleamric-type creature named Sheenlobe, evolved tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: long hooked crest attached to neck; split pointed foils; extended wedge toes; omit other sibling decorations. Overall bounds X width 1.10 m, Y height 0.82 m, Z depth 0.42 m, including appendages, within 5%. Solid matte vertex colors: body #8C7EB0, underside #E1D7C2, accent #BDA044, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 64 Halodot | FAMILY-SHARED

```text
Generate halodot.glb: an original Gleamric-type creature named Halodot, basic tier, FAMILY-SHARED. Family-shared Halofoil variant: Flat upright lozenge torso balanced on two wedge feet, a small central face, two folded side foils and a connected curved crest behind the head. Reuse torso, face patch, foil roots, feet and crest attachment across shared variants. Species parts only: closed polygon crest loop fused to head; one large and one small foil lobe on each side; squat wedge feet; omit other sibling decorations. Overall bounds X width 0.68 m, Y height 0.74 m, Z depth 0.36 m, including appendages, within 5%. Solid matte vertex colors: body #A396BC, underside #EFE1C6, accent #BBA052, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F09 Hushcoil (Hushmere)

**Shared base geometry:** Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants.

**Evolution lines:**

- Murnub -> Duskcurl -> Velvetorque
- Hushpip -> Nullwrithe -> Quiethelix
- Gloamlet -> Foldnacre

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 65 | Murnub | Hushmere | Hushcoil | basic; 1/3 | Duskcurl (level 12) | FAMILY-SHARED | 46 / 26 / 25 / 25 / 27 | Muffle Bump; Hollow Note; Pause Draw; Velvet Wall |
| 66 | Duskcurl | Hushmere | Hushcoil | evolved; 2/3 | Velvetorque (level 26) | FAMILY-SHARED | 72 / 35 / 39 / 39 / 38 | Quiet Ripple; Hollow Note; Still Mend; Low Chord |
| 67 | Velvetorque | Hushmere | Hushcoil | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 102 / 44 / 54 / 55 / 50 | Quiet Ripple; Fold Slip; Low Chord; Resonant Press |
| 68 | Hushpip | Hushmere | Hushcoil | basic; 1/3 | Nullwrithe (level 12) | FAMILY-SHARED | 52 / 24 / 22 / 32 / 21 | Muffle Bump; Hollow Note; Pause Draw; Low Chord |
| 69 | Nullwrithe | Hushmere | Hushcoil | evolved; 2/3 | Quiethelix (level 26) | FAMILY-SHARED | 83 / 33 / 35 / 52 / 30 | Quiet Ripple; Still Mend; Velvet Wall; Silence Pleat |
| 70 | Quiethelix | Hushmere | Hushcoil | boss; 3/3 | none (terminal) | BOSS/UNIQUE-GLB | 154 / 50 / 70 / 82 / 35 | Still Mend; Velvet Wall; Resonant Press; Silence Pleat |
| 71 | Gloamlet | Hushmere | Hushcoil | basic; 1/2 | Foldnacre (level 12) | FAMILY-SHARED | 39 / 29 / 29 / 20 / 38 | Muffle Bump; Quiet Ripple; Pause Draw; Velvet Wall |
| 72 | Foldnacre | Hushmere | Hushcoil | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 63 / 39 / 46 / 32 / 54 | Quiet Ripple; Hollow Note; Velvet Wall; Low Chord |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Murnub | 0.52 × 0.30 × 0.60 | #82778E / #DED5CF / #B49AA8 | one shallow back pleat; short cheek folds; rounded tail end |
| Duskcurl | 0.80 × 0.48 × 0.92 | #6C607C / #CEC1BD / #AE8B9C | three back pleats; curled cheek folds; wide fan tail |
| Velvetorque | 1.10 × 0.66 × 1.26 | #554B68 / #DCCFC8 / #A37D91 | five broad back pleats; double cheek folds; thick three-lobed tail |
| Hushpip | 0.48 × 0.36 × 0.56 | #8D8294 / #E1D4CB / #A68999 | high central coil; small triangular cheek folds; broad support pads |
| Nullwrithe | 0.86 × 0.62 × 0.98 | #6E627F / #D4C6BC / #987489 | tall double coil; thick side pleats; large joined cheek shields |
| Quiethelix | 1.95 × 1.35 × 2.10 | #493F5D / #DBCDC3 / #AD8A9D | unique triple folded coil bastion; four broad fused support pads; hood-like cheek membranes; crown of connected pleat fins; massive fan tail |
| Gloamlet | 0.46 × 0.28 × 0.68 | #A193A8 / #E8DBD1 / #B58C9E | loose slender coil; swept cheek membranes; long thin tail |
| Foldnacre | 0.74 × 0.44 × 1.12 | #85758F / #D8C9BE / #A6788F | elongated loose coil; two swept membrane layers; hooked flat tail |

#### 65 Murnub | FAMILY-SHARED

```text
Generate murnub.glb: an original Hushmere-type creature named Murnub, basic tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: one shallow back pleat; short cheek folds; rounded tail end; omit other sibling decorations. Overall bounds X width 0.52 m, Y height 0.30 m, Z depth 0.60 m, including appendages, within 5%. Solid matte vertex colors: body #82778E, underside #DED5CF, accent #B49AA8, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 66 Duskcurl | FAMILY-SHARED

```text
Generate duskcurl.glb: an original Hushmere-type creature named Duskcurl, evolved tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: three back pleats; curled cheek folds; wide fan tail; omit other sibling decorations. Overall bounds X width 0.80 m, Y height 0.48 m, Z depth 0.92 m, including appendages, within 5%. Solid matte vertex colors: body #6C607C, underside #CEC1BD, accent #AE8B9C, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 67 Velvetorque | FAMILY-SHARED

```text
Generate velvetorque.glb: an original Hushmere-type creature named Velvetorque, evolved tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: five broad back pleats; double cheek folds; thick three-lobed tail; omit other sibling decorations. Overall bounds X width 1.10 m, Y height 0.66 m, Z depth 1.26 m, including appendages, within 5%. Solid matte vertex colors: body #554B68, underside #DCCFC8, accent #A37D91, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 68 Hushpip | FAMILY-SHARED

```text
Generate hushpip.glb: an original Hushmere-type creature named Hushpip, basic tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: high central coil; small triangular cheek folds; broad support pads; omit other sibling decorations. Overall bounds X width 0.48 m, Y height 0.36 m, Z depth 0.56 m, including appendages, within 5%. Solid matte vertex colors: body #8D8294, underside #E1D4CB, accent #A68999, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 69 Nullwrithe | FAMILY-SHARED

```text
Generate nullwrithe.glb: an original Hushmere-type creature named Nullwrithe, evolved tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: tall double coil; thick side pleats; large joined cheek shields; omit other sibling decorations. Overall bounds X width 0.86 m, Y height 0.62 m, Z depth 0.98 m, including appendages, within 5%. Solid matte vertex colors: body #6E627F, underside #D4C6BC, accent #987489, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 70 Quiethelix | BOSS/UNIQUE-GLB

```text
Generate quiethelix.glb: an original Hushmere-type creature named Quiethelix, boss tier, BOSS/UNIQUE-GLB. Unique boss geometry, not a scaled family base: unique triple folded coil bastion; four broad fused support pads; hood-like cheek membranes; crown of connected pleat fins; massive fan tail. Keep Hushcoil ancestry through its blunt face and palette, but use this new silhouette. Overall bounds X width 1.95 m, Y height 1.35 m, Z depth 2.10 m, including appendages, within 5%. Solid matte vertex colors: body #493F5D, underside #DBCDC3, accent #AD8A9D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 2599 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 71 Gloamlet | FAMILY-SHARED

```text
Generate gloamlet.glb: an original Hushmere-type creature named Gloamlet, basic tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: loose slender coil; swept cheek membranes; long thin tail; omit other sibling decorations. Overall bounds X width 0.46 m, Y height 0.28 m, Z depth 0.68 m, including appendages, within 5%. Solid matte vertex colors: body #A193A8, underside #E8DBD1, accent #B58C9E, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 72 Foldnacre | FAMILY-SHARED

```text
Generate foldnacre.glb: an original Hushmere-type creature named Foldnacre, evolved tier, FAMILY-SHARED. Family-shared Hushcoil variant: Thick horizontal coiled body with a short blunt head, four small support pads underneath, two folded cheek membranes and a broad flattened tail. Reuse the coil core, head block, pad sockets and tail root across shared variants. Species parts only: elongated loose coil; two swept membrane layers; hooked flat tail; omit other sibling decorations. Overall bounds X width 0.74 m, Y height 0.44 m, Z depth 1.12 m, including appendages, within 5%. Solid matte vertex colors: body #85758F, underside #D8C9BE, accent #A6788F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

### F10 Echohoop (Hushmere)

**Shared base geometry:** Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants.

**Evolution lines:**

- Thrumkin -> Ringmur -> Resonelle
- Pallbit -> Stillarch
- Nimbloop -> Sablewheel
- Whisquet (single-stage)

| ID | Species | Type | Family | Model tier; evolution stage | Next evolution | Model flag | HP / energy / attack / defense / speed | Four abilities, slots 1–4 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 73 | Thrumkin | Hushmere | Echohoop | basic; 1/3 | Ringmur (level 12) | FAMILY-SHARED | 41 / 28 / 27 / 21 / 37 | Muffle Bump; Hollow Note; Pause Draw; Fold Slip |
| 74 | Ringmur | Hushmere | Echohoop | evolved; 2/3 | Resonelle (level 26) | FAMILY-SHARED | 65 / 38 / 42 / 33 / 52 | Quiet Ripple; Still Mend; Fold Slip; Low Chord |
| 75 | Resonelle | Hushmere | Echohoop | evolved; 3/3 | none (terminal) | FAMILY-SHARED | 90 / 48 / 58 / 47 / 68 | Quiet Ripple; Fold Slip; Resonant Press; Silence Pleat |
| 76 | Pallbit | Hushmere | Echohoop | basic; 1/2 | Stillarch (level 12) | FAMILY-SHARED | 50 / 25 / 22 / 31 / 25 | Muffle Bump; Still Mend; Pause Draw; Velvet Wall |
| 77 | Stillarch | Hushmere | Echohoop | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 81 / 34 / 35 / 51 / 36 | Quiet Ripple; Hollow Note; Velvet Wall; Low Chord |
| 78 | Nimbloop | Hushmere | Echohoop | basic; 1/2 | Sablewheel (level 12) | FAMILY-SHARED | 36 / 31 / 31 / 17 / 44 | Muffle Bump; Quiet Ripple; Pause Draw; Fold Slip |
| 79 | Sablewheel | Hushmere | Echohoop | evolved; 2/2 | none (terminal) | FAMILY-SHARED | 58 / 42 / 50 / 27 / 63 | Quiet Ripple; Hollow Note; Fold Slip; Resonant Press |
| 80 | Whisquet | Hushmere | Echohoop | basic; 1/1 | none (terminal) | FAMILY-SHARED | 56 / 35 / 35 / 32 / 39 | Muffle Bump; Still Mend; Low Chord; Silence Pleat |

**Generation batch variants** (W × H × D, meters; body / underside / accent):

| Species | Dimensions | Vertex palette | Parts / silhouette changes |
| --- | --- | --- | --- |
| Thrumkin | 0.54 × 0.58 × 0.30 | #92849A / #E2D5CC / #B395A4 | one broad hoop rim; small round side tabs; short bridge |
| Ringmur | 0.82 × 0.88 × 0.44 | #786881 / #D1C3B9 / #A68195 | double hoop rim; wider side tabs; raised face bridge |
| Resonelle | 1.12 × 1.20 × 0.60 | #5E506C / #DECEC4 / #B48A9D | triple pleated hoop rim; fan-shaped side tabs; broad arched face bridge |
| Pallbit | 0.50 × 0.50 × 0.36 | #A99BAA / #E7DCD1 / #A88F9B | squat thick hoop; tiny flat tabs; broad square feet |
| Stillarch | 0.84 × 0.82 × 0.54 | #8B7D93 / #D6C7BB / #97798C | tall thick hoop; braced side tabs; wide connected heel blocks |
| Nimbloop | 0.60 × 0.56 × 0.26 | #87768F / #E7D8CE / #C09AAE | thin elliptical hoop; swept pointed tabs; long toe wedges |
| Sablewheel | 0.98 × 0.90 × 0.40 | #655472 / #D4C4BA / #AD819B | elongated elliptical hoop; doubled swept tabs; forward wedge feet |
| Whisquet | 0.62 × 0.70 × 0.38 | #9B8A9F / #E6D6C9 / #BA8D9F | unequal left and right hoop thickness; three small connected top folds; rounded face bridge |

#### 73 Thrumkin | FAMILY-SHARED

```text
Generate thrumkin.glb: an original Hushmere-type creature named Thrumkin, basic tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: one broad hoop rim; small round side tabs; short bridge; omit other sibling decorations. Overall bounds X width 0.54 m, Y height 0.58 m, Z depth 0.30 m, including appendages, within 5%. Solid matte vertex colors: body #92849A, underside #E2D5CC, accent #B395A4, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 74 Ringmur | FAMILY-SHARED

```text
Generate ringmur.glb: an original Hushmere-type creature named Ringmur, evolved tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: double hoop rim; wider side tabs; raised face bridge; omit other sibling decorations. Overall bounds X width 0.82 m, Y height 0.88 m, Z depth 0.44 m, including appendages, within 5%. Solid matte vertex colors: body #786881, underside #D1C3B9, accent #A68195, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 75 Resonelle | FAMILY-SHARED

```text
Generate resonelle.glb: an original Hushmere-type creature named Resonelle, evolved tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: triple pleated hoop rim; fan-shaped side tabs; broad arched face bridge; omit other sibling decorations. Overall bounds X width 1.12 m, Y height 1.20 m, Z depth 0.60 m, including appendages, within 5%. Solid matte vertex colors: body #5E506C, underside #DECEC4, accent #B48A9D, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 76 Pallbit | FAMILY-SHARED

```text
Generate pallbit.glb: an original Hushmere-type creature named Pallbit, basic tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: squat thick hoop; tiny flat tabs; broad square feet; omit other sibling decorations. Overall bounds X width 0.50 m, Y height 0.50 m, Z depth 0.36 m, including appendages, within 5%. Solid matte vertex colors: body #A99BAA, underside #E7DCD1, accent #A88F9B, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 77 Stillarch | FAMILY-SHARED

```text
Generate stillarch.glb: an original Hushmere-type creature named Stillarch, evolved tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: tall thick hoop; braced side tabs; wide connected heel blocks; omit other sibling decorations. Overall bounds X width 0.84 m, Y height 0.82 m, Z depth 0.54 m, including appendages, within 5%. Solid matte vertex colors: body #8B7D93, underside #D6C7BB, accent #97798C, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 78 Nimbloop | FAMILY-SHARED

```text
Generate nimbloop.glb: an original Hushmere-type creature named Nimbloop, basic tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: thin elliptical hoop; swept pointed tabs; long toe wedges; omit other sibling decorations. Overall bounds X width 0.60 m, Y height 0.56 m, Z depth 0.26 m, including appendages, within 5%. Solid matte vertex colors: body #87768F, underside #E7D8CE, accent #C09AAE, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 79 Sablewheel | FAMILY-SHARED

```text
Generate sablewheel.glb: an original Hushmere-type creature named Sablewheel, evolved tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: elongated elliptical hoop; doubled swept tabs; forward wedge feet; omit other sibling decorations. Overall bounds X width 0.98 m, Y height 0.90 m, Z depth 0.40 m, including appendages, within 5%. Solid matte vertex colors: body #655472, underside #D4C4BA, accent #AD819B, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 1499 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

#### 80 Whisquet | FAMILY-SHARED

```text
Generate whisquet.glb: an original Hushmere-type creature named Whisquet, basic tier, FAMILY-SHARED. Family-shared Echohoop variant: Upright thick horseshoe torso closed by a low front bridge, two broad planted feet, face inset into the bridge, two short side tabs and a small rear stabilizer. Reuse ring core, bridge, face patch, feet and tab roots across shared variants. Species parts only: unequal left and right hoop thickness; three small connected top folds; rounded face bridge; omit other sibling decorations. Overall bounds X width 0.62 m, Y height 0.70 m, Z depth 0.38 m, including appendages, within 5%. Solid matte vertex colors: body #9B8A9F, underside #E6D6C9, accent #BA8D9F, inset eye facets #181818; no gradients. glTF 2.0 binary GLB; at most 799 triangles after triangulating ALL parts. One joined static mesh node, one triangle primitive, one opaque COLOR_0 vertex-color material, flat normals, 16-bit indices, metallic 0, roughness 1. +Y up, face +Z, centered X/Z, origin on ground, lowest support at Y=0, transforms applied. Stable neutral planted/perched pose; all parts attached, thick closed surfaces. No rig, bones, skin, animation, morphs, textures, UV dependency, Draco, Meshopt, compression or required extensions. No lights, cameras, pedestal, scenery, effects, lettering, logos, borrowed assets or recognizable franchise anatomy. Export only the creature.
```

## Production acceptance and limits

Before accepting any generated GLB, inspect its actual node/primitive count, triangle count, bounds, `COLOR_0`, indices, materials and absence of textures, animations/skins and extensions. Import it in the local renderer, check the +Z face and ground placement, and view front/side/back silhouettes at gameplay size. Shared variants must visibly differ by the listed parts as well as hues. Bosses must have their listed unique silhouettes, not enlarged common bases. Review geometry and generated output provenance; a prompt is not license evidence or a successful model import. This docs-only handoff has no generated assets, renders, runtime gate result or delivery claims.

## Runnable roster consistency check

Run from the repository root. This checks the authored appendix, not ungenerated GLBs or gameplay. It uses only Python's standard library and does not create files.

```sh
python3 - <<'PY'
from collections import Counter
from pathlib import Path
import re
text = Path('docs/monster-roster-glbs.md').read_text()
rows = []
for line in text.splitlines():
    if re.match(r'^\| \d{2} \|', line):
        rows.append([cell.strip() for cell in line.strip('|').split('|')])
assert len(rows) == 80
assert [int(r[0]) for r in rows] == list(range(1, 81))
assert len({r[1] for r in rows}) == 80
assert Counter(r[2] for r in rows) == dict.fromkeys(
    ['Cindrel', 'Rillune', 'Loamveil', 'Gleamric', 'Hushmere'], 16)
assert len(Counter(r[3] for r in rows)) == 10
assert set(Counter(r[3] for r in rows).values()) == {8}
assert Counter(r[4].split(';')[0] for r in rows) == {'basic':35, 'evolved':40, 'boss':5}
assert Counter(r[6] for r in rows) == {'FAMILY-SHARED':75, 'BOSS/UNIQUE-GLB':5}
glossary = {}
for name, cost, effect in re.findall(r'^\| ([^|]+) \| (\d+) \| ([^|]+) \|$', text, re.M):
    glossary[name.strip()] = (int(cost), effect.strip())
assert len(glossary) == 50
by_name = {r[1]:r for r in rows}
for r in rows:
    stats = [int(n.strip()) for n in r[7].split('/')]
    assert len(stats) == 5 and all(n > 0 for n in stats)
    abilities = [n.strip() for n in r[8].split(';')]
    assert len(set(abilities)) == 4 and all(n in glossary for n in abilities)
    assert all(glossary[n][0] <= stats[1] for n in abilities)
    if not r[5].startswith('none'):
        target = by_name[r[5].split(' (')[0]]
        assert target[2:4] == r[2:4]
        a, total = map(int, r[4].split('; ')[1].split('/'))
        b, target_total = map(int, target[4].split('; ')[1].split('/'))
        assert b == a+1 and total == target_total
        assert all(int(y) > int(x) for x,y in zip(r[7].split('/'), target[7].split('/')))
assert len(re.findall(r'^- \w+ \(single-stage\)$', text, re.M)) == 5
prompts = re.findall(r'```text\n(.*?)\n```', text, re.S)
assert len(prompts) == 80
for r, prompt in zip(rows, prompts):
    tier = r[4].split(';')[0]
    ceiling = {'basic':799, 'evolved':1499, 'boss':2599}[tier]
    assert prompt.startswith('Generate ' + r[1].lower() + '.glb:')
    assert r[6] in prompt and f'at most {ceiling} triangles' in prompt
    assert len(re.findall(r'#[0-9A-F]{6}', prompt)) == 4
    assert len(re.findall(r'[XYZ] (?:width|height|depth) [0-9]+\.[0-9]{2} m', prompt)) == 3
    for requirement in ['One joined static mesh node', 'COLOR_0', 'No rig', 'textures', 'Draco', 'Meshopt']:
        assert requirement in prompt
print('PASS: 80 species; 16 per element; 10 families; 80 complete prompts; 75 shared + 5 unique bosses')
print('Families: ' + ', '.join(dict.fromkeys(r[3] for r in rows)))
PY
```
