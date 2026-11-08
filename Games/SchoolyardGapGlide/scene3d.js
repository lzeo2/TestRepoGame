/* Offline polygonal view only. FlyerEngine/ui.js remain the sole simulation,
 * input, pause, scoring and reset owners. Engine pixels map to world x/y at
 * z=0; blue gate depth extends AWAY from that exact collision plane. */
(function () {
  'use strict';
  const canvas = document.getElementById('world3d');
  const fallbackLabel = document.getElementById('render-status');
  const api = window.schoolyard3d = {
    ready: false, game: 'flyer', view: 'perspective', renderer: 'fallback2d',
    frames: 0, drawCalls: 0, triangles: 0, gateMeshes: 0,
    collisionPlaneZ: 0, worldUnitsPerPixel: .01, fallbackReason: null
  };
  let renderer;
  let active = true;
  let raf = null;
  const geometries = new Set();
  const materials = new Set();
  function fallback(reason) {
    active = false; // Latched: context restoration cannot unhide a broken view.
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null;
    if (canvas) canvas.hidden = true;
    api.ready = false;
    api.renderer = 'fallback2d';
    api.fallbackReason = reason;
    if (fallbackLabel) {
      fallbackLabel.textContent = '2D view: ' + reason;
      fallbackLabel.hidden = false;
    }
    geometries.forEach(g => g.dispose());
    materials.forEach(m => m.dispose());
    if (renderer) renderer.dispose();
  }
  if (!canvas || !window.THREE || !window.schoolyardGame) {
    fallback('WebGL unavailable');
    return;
  }
  canvas.addEventListener('webglcontextlost', function (event) {
    event.preventDefault();
    if (active) fallback('WebGL context lost');
  });
  try {
    const T = window.THREE;
    // Probe before THREE's constructor, which otherwise logs an error for an
    // expected unsupported context even though the playable fallback succeeds.
    const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'low-power' });
    if (!context) { fallback('WebGL unavailable'); return; }
    renderer = new T.WebGLRenderer({ canvas, context, antialias: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(480, 640, false);
    renderer.outputColorSpace = T.SRGBColorSpace;
    const scene = new T.Scene();
    scene.background = new T.Color('#29383e');
    // Slightly left/above the play plane: perspective shows side/top faces
    // while keeping BOTH world boundaries and the full 480px approach visible.
    const camera = new T.PerspectiveCamera(32, 480 / 640, .1, 40);
    camera.position.set(-.3, 4.4, 13.8);
    camera.lookAt(2.4, 3.2, 0);
    scene.add(new T.HemisphereLight('#e8f0ea', '#6d6760', 2));
    const sun = new T.DirectionalLight('#fff1d5', 2);
    sun.position.set(-4, 9, 7);
    scene.add(sun);
    function mat(color, unlit = false) {
      const material = unlit ? new T.MeshBasicMaterial({ color }) : new T.MeshLambertMaterial({ color });
      materials.add(material);
      return material;
    }
    const palette = {
      paving: mat('#414b4c'), chalk: mat('#a7b1a5'), brick: mat('#77574d'),
      trim: mat('#a6967c'), glass: mat('#344f59'), metal: mat('#95aeb3'),
      locker: mat('#477080'), dark: mat('#24363e'), gate: mat('#496f83'),
      edge: mat('#d9ba79'), skin: mat('#dfbc99', true), shirt: mat('#667f64', true),
      hair: mat('#d9ba79', true), wing: mat('#f1e6c9', true), ink: mat('#161e23', true)
    };
    const cube = new T.BoxGeometry(1, 1, 1);
    const ball = new T.SphereGeometry(1, 10, 6);
    geometries.add(cube); geometries.add(ball);
    function box(parent, w, h, d, x, y, z, material) {
      const mesh = new T.Mesh(cube, material);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    function sphere(parent, r, x, y, z, material) {
      const mesh = new T.Mesh(ball, material);
      mesh.scale.set(r, r, r);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }
    // Original courtyard architecture, all solid geometry, no textures/assets.
    box(scene, 10, .14, 5, 2.4, -.08, -.6, palette.paving);
    box(scene, 10, 5.5, .45, 2.4, 2.75, -2.8, palette.brick);
    box(scene, 10, .16, .65, 2.4, 5.5, -2.7, palette.trim);
    for (let y = .4; y < 5.5; y += .7) {
      box(scene, 10, .025, .025, 2.4, y, -2.56, palette.trim);
    }
    for (let x = -1; x < 7; x += 1.6) {
      box(scene, 1.15, 1.4, .14, x, 3.8, -2.48, palette.metal);
      box(scene, 1.02, 1.27, .04, x, 3.8, -2.38, palette.glass);
      box(scene, .04, 1.3, .05, x, 3.8, -2.34, palette.metal);
      box(scene, 1.02, .04, .05, x, 3.8, -2.34, palette.metal);
    }
    for (let x = -.8; x < 6.4; x += .56) {
      box(scene, .5, 1.5, .3, x, .79, -2.28, palette.locker);
      for (let y = 1.22; y <= 1.38; y += .07) {
        box(scene, .25, .018, .012, x, y, -2.12, palette.dark);
      }
      box(scene, .035, .14, .04, x + .15, .78, -2.1, palette.metal);
    }
    for (let x = -1; x <= 7; x += 1) {
      box(scene, .018, .012, 4.8, x, .001, -.6, palette.chalk);
    }
    // Floor/ceiling rails align with the engine's y=640/y=0 boundaries.
    box(scene, 4.8, .04, .5, 2.4, -.02, -.25, palette.trim);
    box(scene, 4.8, .04, .5, 2.4, 6.42, -.25, palette.trim);

    const avatar = new T.Group();
    avatar.name = 'polygonal-glider';
    scene.add(avatar);
    // Broad faceted wings/body use the existing r14 disk, not a larger scale.
    // Shallow solids limit perspective displacement when rays return to z=0,
    // including at ceiling/floor. CPU tests project EVERY vertex, rim included.
    // Unlit solid fills keep the light wing/dark rim readable against brick;
    // the rim is actual bounded volume, not a screen-space outline or glow.
    box(avatar, .122, .12, .06, 0, -.012, .006, palette.shirt).name = 'body';
    box(avatar, .148, .14, .048, 0, -.012, -.013, palette.ink).name = 'body-rim';
    sphere(avatar, .049, 0, .073, .001, palette.ink).name = 'head-rim';
    sphere(avatar, .041, 0, .075, .014, palette.skin).name = 'head';
    box(avatar, .08, .024, .055, 0, .103, .016, palette.hair);
    for (const side of [-1, 1]) {
      box(avatar, .043, .04, .045, side * .036, -.088, .002, palette.ink);
      const rim = sphere(avatar, 1, side * .052, -.012, -.005, palette.ink);
      rim.scale.set(.074, .054, .03);
      rim.name = 'wing-rim-' + side;
      const wing = sphere(avatar, 1, side * .052, -.01, .004, palette.wing);
      wing.scale.set(.067, .043, .031);
      wing.name = 'wing-' + side;
    }
    box(avatar, .16, .019, .041, 0, -.027, .027, palette.ink);
    const goggles = box(avatar, .077, .022, .018, 0, .079, .052, palette.ink);

    const gates = new Map();
    let previousState = null;
    function makeGate(id) {
      const group = new T.Group();
      group.name = 'gate-' + id;
      // The FRONT face of each main solid is z=0, depth .5 behind it.
      const upper = box(group, 1, 1, .5, 0, 0, -.25, palette.gate);
      const lower = box(group, 1, 1, .5, 0, 0, -.25, palette.gate);
      // Gold contact-edge strips remain wholly inside the collision solids.
      const topEdge = box(group, 1, .045, .012, 0, 0, .001, palette.edge);
      const bottomEdge = box(group, 1, .045, .012, 0, 0, .001, palette.edge);
      scene.add(group);
      return { group, upper, lower, topEdge, bottomEdge };
    }
    function clearGate(id, gate) {
      scene.remove(gate.group);
      gates.delete(id); // Shared cube/materials stay live; no per-gate GPU assets.
    }
    function sync(state) {
      if (state !== previousState) {
        for (const [id, gate] of gates) clearGate(id, gate);
        previousState = state;
      }
      const person = window.Schoolyard.roster.find(p => p.id === window.Schoolyard.selected) || window.Schoolyard.roster[0];
      palette.hair.color.set(person.color);
      palette.shirt.color.set(person.shirt);
      goggles.visible = person.id === 'ian';
      avatar.position.set(state.player.x * .01, (state.height - state.player.y) * .01, 0);
      // No decorative movement, duplicate physics, engine input or engine step.
      const live = new Set();
      for (const gate of state.gates) {
        live.add(gate.id);
        let mesh = gates.get(gate.id);
        if (!mesh) { mesh = makeGate(gate.id); gates.set(gate.id, mesh); }
        const width = gate.width * .01;
        const upperHeight = (gate.center - gate.gap / 2) * .01;
        const lowerHeight = (state.height - gate.center - gate.gap / 2) * .01;
        mesh.group.position.x = (gate.x + gate.width / 2) * .01;
        mesh.upper.scale.set(width, upperHeight, .5);
        mesh.upper.position.y = state.height * .01 - upperHeight / 2;
        mesh.lower.scale.set(width, lowerHeight, .5);
        mesh.lower.position.y = lowerHeight / 2;
        mesh.topEdge.scale.x = mesh.bottomEdge.scale.x = width;
        mesh.topEdge.position.y = (state.height - gate.center + gate.gap / 2) * .01 + .0225;
        mesh.bottomEdge.position.y = lowerHeight - .0225;
        // Cull approach meshes until they enter the engine's original viewport.
        mesh.group.visible = gate.x <= state.width && gate.x + gate.width >= 0;
      }
      for (const [id, gate] of gates) if (!live.has(id)) clearGate(id, gate);
      api.gateMeshes = gates.size;
    }
    function frame() {
      raf = null;
      if (!active) return;
      try {
        const state = window.schoolyardGame.state;
        if (!state) throw new Error('Missing game state');
        sync(state);
        renderer.render(scene, camera);
        // A context loss can occur during render: never unhide after the latch.
        if (!active) return;
        if (renderer.getContext().isContextLost()) { fallback('WebGL context lost'); return; }
        api.ready = true;
        api.renderer = 'WebGL';
        api.frames++;
        api.drawCalls = renderer.info.render.calls;
        api.triangles = renderer.info.render.triangles;
        api.geometries = renderer.info.memory.geometries;
        api.textures = renderer.info.memory.textures;
        api.fallbackReason = null;
        canvas.hidden = false;
        if (fallbackLabel) fallbackLabel.hidden = true;
      } catch (_) {
        fallback('3D render unavailable');
        return;
      }
      raf = window.requestAnimationFrame(frame);
    }
    // Inspectable QA references are not evidence of a successful WebGL render.
    api.scene = scene;
    api.camera = camera;
    raf = window.requestAnimationFrame(frame);
  } catch (_) {
    fallback('WebGL unavailable');
  }
}());
