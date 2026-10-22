water_tower — rigid v2

model.glb is LOD0. model_LOD1/2.glb are alternatives where present. model.blend contains editable mesh nodes, rigid controls, packed original maps and separated REVIEW_ camera/lights. rig.json and manifest.rig.json are identical aliases.

No skeletal rig, skin weights or baked clips; static nodes are intentional.
Palette factors are linear-RGB multiplicative tint, not arbitrary exact RGB replacement of colored texture pixels.
For independently tinted spawned instances, clone the instance material objects before editing factors; never mutate a shared loader-cache material. Maps remain immutable and may be shared.
Reduced LODs preserve original geometry/texture resolutions; each LOD is a standalone alternative, not loaded simultaneously.

All-LOD bytes: 2052520; original cap: 2097152; passes: True.
Water-tower runtime mesh duplicate vertices welded only at exact positions/UVs and <=0.1 degree normal angle; all triangles and original texture bytes unchanged. Source .blend retains editable unwelded split-normal representation.
