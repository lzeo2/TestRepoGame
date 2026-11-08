/* Real WebGL schoolyard view over the original accessible input canvas.
 * RunnerEngine alone owns collision, timing, score and reset. The 2D canvas
 * stays live as a fallback if WebGL cannot render a frame. */
(function () {
  'use strict';
  const T = window.THREE;
  const canvas = document.getElementById('world3d');
  if (!T || !canvas || !window.schoolyardGame) return;
  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  } catch (_) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(480, 640, false);
  renderer.outputColorSpace = T.SRGBColorSpace;

  const scene = new T.Scene();
  scene.background = new T.Color('#a3b8ba');
  scene.fog = new T.Fog('#a3b8ba', 21, 45);
  const camera = new T.PerspectiveCamera(54, 480 / 640, 0.1, 75);
  camera.position.set(0, 11.8, 13.6);
  camera.lookAt(0, .9, -6.8);
  scene.add(new T.HemisphereLight('#e8f0ea', '#6d6760', 2.2));
  const sun = new T.DirectionalLight('#fff1d5', 2.2);
  sun.position.set(-7, 12, 5);
  scene.add(sun);
  const mat = color => new T.MeshLambertMaterial({ color });
  const palette = {
    paving: mat('#4a5455'), chalk: mat('#bfc8b7'), brick: mat('#77574d'), mortar: mat('#a2806b'),
    locker: mat('#477080'), lockerDark: mat('#253943'), metal: mat('#95aeb3'),
    wood: mat('#d3af73'), planter: mat('#a27663'), leaves: mat('#7f9579'),
    skin: mat('#d7ad89'), dark: mat('#1b2831'), shirt: mat('#647e70'), hair: mat('#d9ba79')
  };
  function box(parent, w, h, d, x, y, z, material) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  function sphere(parent, r, x, y, z, material) {
    const mesh = new T.Mesh(new T.SphereGeometry(r, 12, 8), material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  }
  box(scene, 9, .12, 55, 0, -.08, -10, palette.paving);
  for (const x of [-1.25, 1.25]) {
    for (let z = -24; z <= 10; z += 3.2) box(scene, .045, .015, 1.45, x, .003, z, palette.chalk);
  }
  for (const side of [-1, 1]) {
    box(scene, .35, 3.7, 56, side * 4.6, 1.85, -10, palette.brick);
    box(scene, .44, .13, 56, side * 4.6, 3.73, -10, palette.mortar);
    for (let z = -24; z < 11; z += 2.4) {
      box(scene, .016, .035, 2.1, side * 4.39, .72, z, palette.mortar);
      box(scene, .016, .035, 2.1, side * 4.39, 2.04, z, palette.mortar);
    }
    for (let z = -19; z < -7; z += 2.4) {
      box(scene, .66, 1.75, 1.8, side * 4.08, .93, z, palette.locker);
      box(scene, .04, .42, .58, side * 3.72, 1.45, z, palette.lockerDark);
      box(scene, .07, .06, .42, side * 3.68, .96, z, palette.metal);
    }
  }
  box(scene, 9.2, 4.8, .65, 0, 2.4, -26.6, palette.brick);
  box(scene, 2.4, 3.2, .1, 0, 1.6, -26.2, palette.lockerDark);
  box(scene, 6, .2, .4, 0, 4.2, -26.1, palette.mortar);
  for (const x of [-3.1, 3.1]) box(scene, 1.6, 1.6, .1, x, 2.2, -26.15, palette.metal);

  const avatar = new T.Group();
  scene.add(avatar);
  const legs = [];
  const arms = [];
  box(avatar, .82, .92, .48, 0, 1.23, 0, palette.shirt);
  box(avatar, .85, .18, .52, 0, .72, 0, palette.dark);
  sphere(avatar, .35, 0, 1.94, 0, palette.skin);
  box(avatar, .76, .13, .62, 0, 2.23, -.08, palette.hair);
  for (const side of [-1, 1]) {
    const leg = new T.Group(); leg.position.set(side * .22, .7, 0); avatar.add(leg);
    box(leg, .29, .62, .33, 0, -.33, 0, palette.dark);
    box(leg, .32, .17, .48, 0, -.67, .08, palette.dark);
    legs.push(leg);
    const arm = new T.Group(); arm.position.set(side * .52, 1.6, 0); avatar.add(arm);
    box(arm, .23, .57, .25, 0, -.3, 0, palette.shirt);
    sphere(arm, .13, 0, -.62, 0, palette.skin);
    arms.push(arm);
  }
  const props = new Map();
  const laneX = [-2.5, 0, 2.5];
  function makeProp(type) {
    const group = new T.Group();
    if (type === 'barrier') {
      for (const x of [-.75, .75]) box(group, .14, .7, .16, x, .35, 0, palette.wood);
      box(group, 1.8, .26, .24, 0, .72, 0, palette.wood);
      for (const x of [-.35, .35]) box(group, .19, .26, .26, x, .72, .03, palette.dark);
    } else if (type === 'frame') {
      for (const x of [-.86, .86]) box(group, .17, 2.13, .2, x, 1.07, 0, palette.metal);
      box(group, 1.92, .25, .25, 0, 2.12, 0, palette.metal);
      box(group, 1.45, .12, .15, 0, 1.86, 0, palette.wood);
    } else {
      box(group, 1.6, .58, .9, 0, .29, 0, palette.planter);
      sphere(group, .48, -.27, .89, 0, palette.leaves);
      sphere(group, .44, .24, .92, -.08, palette.leaves);
    }
    scene.add(group);
    return group;
  }
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  function frame() {
    const state = window.schoolyardGame.state;
    if (state) {
      const person = window.Schoolyard.roster.find(p => p.id === window.Schoolyard.selected) || window.Schoolyard.roster[0];
      palette.hair.color.set(person.color);
      palette.shirt.color.set(person.shirt);
      avatar.position.set(laneX[state.player.lane], 0, 3.15);
      const jump = state.player.jump > 0 ? Math.sin(Math.PI * (1 - state.player.jump / .85)) * 1.25 : 0;
      avatar.position.y = jump;
      avatar.scale.y = state.player.slide > 0 ? .55 : 1;
      const stride = !reduced.matches && state.status === 'playing' ? Math.sin(state.time * 13) * .43 : 0;
      legs[0].rotation.x = stride; legs[1].rotation.x = -stride;
      arms[0].rotation.x = -stride; arms[1].rotation.x = stride;
      const live = new Set();
      for (const obstacle of state.obstacles) {
        live.add(obstacle.id);
        let mesh = props.get(obstacle.id);
        if (!mesh) { mesh = makeProp(obstacle.type); props.set(obstacle.id, mesh); }
        mesh.position.set(laneX[obstacle.lane], 0, 3.15 + (obstacle.y - state.player.y) / 29);
        mesh.visible = mesh.position.z < 10 && mesh.position.z > -26;
      }
      for (const [id, mesh] of props) if (!live.has(id)) {
        scene.remove(mesh);
        mesh.traverse(node => { if (node.geometry) node.geometry.dispose(); });
        props.delete(id);
      }
      try {
        renderer.render(scene, camera);
        if (canvas.hidden) {
          canvas.hidden = false;
          window.schoolyard3d = { ready: true, renderer: 'WebGL', view: 'perspective', game: 'runner', frames: 1, drawCalls: renderer.info.render.calls };
        } else if (window.schoolyard3d && window.schoolyard3d.ready) {
          window.schoolyard3d.frames++;
          window.schoolyard3d.drawCalls = renderer.info.render.calls;
        }
      } catch (_) {
        canvas.hidden = true;
        window.schoolyard3d = { ready: false, renderer: 'fallback2d' };
        renderer.dispose();
        return;
      }
    }
    window.requestAnimationFrame(frame);
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); canvas.hidden = true;
    window.schoolyard3d = { ready: false, renderer: 'fallback2d' };
  });
  window.requestAnimationFrame(frame);
})();
