# Appendix: hero mesh needs

Status: requests for the world/orchestrator wishlist flow, not approved assets or
permission to generate/import them. **No Blender. Keep the existing hero kits,
abilities, procedural 3D FX and camera working while mesh requests wait.**
The hero team is not starting a parallel model pipeline.

## Evidence and priority

Reviewed current `createHeroVisual()` in
[`hero-visuals.mjs`](../../Games/Jankolock3D/heroes/hero-visuals.mjs) against the
[hero capture sheet](../maintenance/audits/jankolock-3d-qa/heroes-fx-contact-sheet.png)
and [desktop comparison](../maintenance/audits/jankolock-3d-qa/heroes-mockup-vs-implemented.png).
These observations concern the current primitive meshes, not a grade of the
kits or an assessment of unimported concept art. Prioritize silhouette and
rear/three-quarter readability over tiny surface details: the shoulder camera
mostly sees backs, hands and weapons, not faces.

| Hero / request | Weakest current parts | Needed mesh work | Preserve |
| --- | --- | --- | --- |
| **Stampead / primary body + stamp gauntlet** | Large blank box torso; slab shoulders and arms merge together; stamp fist is a red cuboid; tread boots read as two blocks. | Defined shoulder/elbow/wrist joints and layered paper/armor forms; a recognizable stamp handle, housing and rubber striking plate; shaped boots with an evident sole/contact surface. Give the back a readable postroom identity rather than adding face detail first. Keep the stamp hand separable for melee motion. | Broad tank silhouette, stamp motif, clear right-hand attack origin, heavy melee/hook/slam/Overtime kit. Do not enlarge shoulder gear into the reticle. |
| **Snipeoff / slender body + ruler rifle** | Straight legs and narrow rectangular torso look like a stick figure; flat coat-tail strips do not read as cloth; long ruler weapon has little silhouette separation from the forearm. | A coherent lean silhouette with articulated limbs, folded/split coat tails and a clearly held long precision weapon. Build a visible grip, stock and muzzle; keep the coat/back outline readable from behind without filling the scope view. Retain a distinctive pencil/audit identity in the approved headwear or equipment. | Tall, narrow profile; rifle length; tether and headshot readability; longshot, headshot crown and reveal FX stay procedural. |
| **Turretina / engineer body + stapler carbine** | Flat folder-coat body; spool bun is stacked cylinders; block hands and satchel; carbine blends into the right arm. | Layered workwear/folder panels, coherent spool/headwear form, separate hands around a recognizable stapler weapon, and a readable rear tool pouch or folded tripod. Request a complete body assembly rather than unrelated decorative accessories. | Sturdy engineer silhouette, visible tool equipment, free right-side muzzle space. Do not change deploy ranges, collision or ability timing. |
| **Gooey Sticky / cohesive adhesive support body** | Two intersecting spheres, disconnected round hands and square feet; the label is a rigid plane; the lid appears detached from the body. | A continuous adhesive silhouette with intentional hand/foot transitions, a seated tilted lid and an attached label. If the orchestrator selects a different approved body concept, carry the glue-pot/support identity through coherent outer clothing/equipment rather than leaving a pile of primitives. | Original blob-support identity unless the operator approves an archetype change; low, broad outline; recognizable lid and hands. Puddles, glue fan, missionbomb and healing aura remain existing geometry FX. |

Suggested ordering is Stampead and Snipeoff first, then Turretina and Gooey;
world/orchestrator owns the actual queue. This is four hero assemblies, not a
request for a separate file for every limb. Named rigid parts in one assembly
are sufficient; do not require a new skeletal-animation framework just to
replace primitive silhouettes.

### Optional fifth request: Turretina's deployed stapler

The current tripod is readable, but its head is a plain box and its barrel is a
rod. If budget remains after the four bodies, request one compact stapler-turret
assembly with a stable tripod/base and a separate yawing head/barrel. Preserve
its existing placement, aiming and firing behavior. Do not replace the filing
wall, grenade, chain-gun attack FX or other ability geometry as part of this
optional prop request. The current procedural turret remains usable meanwhile.

## Mesh handoff requirements

- Route concept selection, generation, provenance and import through the
  world/orchestrator owner. Existing `hero-concepts/` work is sibling-owned;
  this appendix neither edits it nor treats its presence as approval. Resolve
  any human-form versus original blob/stamp-character direction there before
  commissioning a mesh. Any new concept imagery uses the mandated codex-imagen
  flow, not Blender or a fallback concept tool.
- Use metres, Y-up, feet on Y=0, facing -Z. Preserve the current collision body
  (0.45m radius, 1.8m standing height) independently of decorative geometry;
  Snipeoff's headwear can remain visually taller. No mesh-derived hitbox change.
- Keep root placement caller-owned and retain `createHeroVisual()` lifecycle
  compatibility. Provide identifiable torso/head, hands and feet; movable
  stamp/weapon/coat pieces need sensible local pivots. Existing procedural bob,
  stride, aim and slide motion must remain usable or be deliberately adapted.
- Keep the right-hand muzzle and melee attachment positions identifiable.
  Align cosmetic parts with the existing attack origins; a new mesh must not
  silently shift damage rays, projectiles or camera collision. Inventory/shop
  scaling and `docs/jank3d-hero-kits.json` are outside this replacement scope.
- Prefer local GLB assemblies with simple material separation and no runtime
  external assets. Contract caps: each model **under 8 MB**, textures at most
  **1024x1024**, no committed file over 20 MB. Fewer materials and sensible
  geometry matter more than hidden seams; renderer performance still needs
  measurement, not an invented triangle-budget acceptance claim.
- Original stationery parody only. Preserve source/license/generation receipts;
  no copied commercial-game assets or marks. No emissive neon/glow to disguise
  weak silhouettes. Keep the flat UI unchanged; this appendix creates no new
  HUD, icon, select-card or mockup requirement.
- On eventual import, compare rear/three-quarter views and normal/RMB framing,
  wall-clamped camera, slide and double jump in each existing `devhero-N.html`.
  Recheck all four abilities per hero and disposal. Capture fresh evidence;
  the reviewer, not the builder, grades it. No camera redesign merely to hide
  a weak replacement mesh.

## Immediate action

Documentation only. Leave the current meshes as working placeholders and keep
all kit/FX code intact. Wait for the world/orchestrator's selected assets and
handoff rather than making meshes, acquiring tools or changing runtime now.
