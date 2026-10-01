# Spline Ride credits

Adapted from the **three.js authors' r160 spline extrusion example**, MIT.
This is an ingested open-ended 3D demo, not a new flight game. No win/lose rules,
collectibles, score, downloaded artwork, models, audio or textures were added.

- Official repository: https://github.com/mrdoob/three.js
- Pinned peeled r160 commit: `d04539a76736ff500cae883d6a38b3dd8643c548`
- Original entry: https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/webgl_geometry_extrude_splines.html
- Curves: https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/jsm/curves/CurveExtras.js
- Orbit input: https://github.com/mrdoob/three.js/blob/d04539a76736ff500cae883d6a38b3dd8643c548/examples/jsm/controls/OrbitControls.js
- Full retained MIT notice: [vendor/LICENSE](vendor/LICENSE), copyright © 2010-2023 three.js authors.

The sixteen original curve instances, local Catmull-Rom point lists,
TubeGeometry construction, arclength sampling, binormal interpolation, normal
offset and camera quaternion math remain upstream-derived. CurveExtras and
OrbitControls are unchanged except their single bare `three` import is rewritten
to `./three.module.js`. Mathematical reference comments remain intact.
The engine and notice are exact copies of the already tracked r160 vendor bytes.

Local changes: native path/play/pause/restart/view and geometry controls instead
of Stats/lil-gui; paused Orbit default; resettable 20-second playback with actual
path progress and completed laps; keyboard shortcuts/manual stepping; native
background pause and reduced-motion handling; both-camera resize, DPR 1 and
1280×720 drawing-buffer cap; geometry/resource disposal; read-only frozen
snapshot; cream/steel-blue shell and amber path marker. No shadows or effects.

Typography reuses the existing locally hosted Atkinson Hyperlegible files in
`../../assets/fonts/atkinson-hyperlegible/`. Copyright 2020 Braille Institute of
America, Inc.; SIL Open Font License 1.1 retained at
[the shared font notice](../../assets/fonts/atkinson-hyperlegible/OFL.txt).
System fonts are the fallback. No runtime third-party resources are loaded.

Exact upstream/local byte and SHA-256 evidence and runnable verification:
[`../../docs/spline-ride-sources.md`](../../docs/spline-ride-sources.md).
