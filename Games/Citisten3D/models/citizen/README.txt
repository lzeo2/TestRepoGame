CITISTEN citizen — rigid articulation revision 2

model.blend is the editable clean rest-pose source. model.glb is LOD0; model_LOD1.glb and model_LOD2.glb preserve its complete named joint tree. Coordinates: metres, Y-up, facing -Z.

Use rig.json (also manifest.rig.json) for actual exported node names, local pivots, parents and motion ranges. Limb bend and wheel roll use local X; steering and door yaw local Y. Citizen/zombie have a 2-second in-place rigid walk clip. Other assets have no baked animation.

Recolor using palette.json. Clone materials per runtime instance before tint changes; materials are already uniquely namespaced per model. Embedded textures are immutable and may stay shared. No game code is provided.

The posed_front.jpg and posed_rear.jpg show non-rest local-joint rotations. local_rotation_tests.json tests every articulating node for fixed pivot plus actual descendant motion; exported_rig_validation.json verifies nodes, parent edges and pivot translations in every GLB.

Original generated artwork from the supplied Blender source; no external assets/marks. Doors are exterior panels only; opening reveals original fixed structure rather than a newly invented cabin interior. Rigid joints are not a skin/deformation acceptance claim. No target-hardware performance/game integration acceptance.

Portable re-export: blender -b citisten/citizen/model.blend -t 2 --python tools/agents_vehicles/reexport_from_blend.py
The helper requires only this delivered .blend, not the earlier source package. Actual binary GLB node/vertex/texture/loop tests are in actual_glb_motion_validation.json.

Lower-LOD ground contact: the decimation exporter flattens only the lowest four rubber-sole vertices per foot to ground (maximum extension about 6 mm). Joint frames and walk clips remain unchanged. See reexport_receipt.json for exact repair measurements.
