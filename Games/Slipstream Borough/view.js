import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from '../../assets/car-arcade/models.js';
import { WORLD } from './world.js';

export function createView(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor('#b8c4ca');
  host.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#b8c4ca', 100, 240);
  const camera = new THREE.PerspectiveCamera(52, 1, .1, 500);
  scene.add(new THREE.HemisphereLight('#fff4dd', '#575753', 2.4));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(-12, 20, 8); scene.add(sun);
  const resources = [], npc = new Map(), dummy = new THREE.Object3D();
  const own = resource => { resources.push(resource); return resource; };
  const material = color => own(new THREE.MeshLambertMaterial({ color }));
  const unitBox = own(new THREE.BoxGeometry(1, 1, 1));
  const palette = new Map();
  function box(w, h, d, color, x, y, z, parent = scene) {
    if (!palette.has(color)) palette.set(color, material(color));
    const mesh = new THREE.Mesh(unitBox, palette.get(color));
    mesh.scale.set(w, h, d); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  function instance(mesh, index, x, y, z, w, h, d) {
    dummy.position.set(x, y, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(w, h, d);
    dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
  }
  box(700, .2, 700, '#92917d', 0, -.25, 0);
  const highway = new THREE.Group(); scene.add(highway);
  box(14, .12, 360, '#45474b', 0, -.08, -110, highway);
  box(.2, .18, 360, '#ddd6c4', -7.3, 0, -110, highway);
  box(.2, .18, 360, '#ddd6c4', 7.3, 0, -110, highway);
  const lines = new THREE.InstancedMesh(unitBox, material('#e6ddc4'), 90); highway.add(lines);
  const buildings = new THREE.InstancedMesh(unitBox, material('#8b7662'), 48); highway.add(buildings);
  for (const [i, text] of ['LAD / NORTH', 'CUH / BOROUGH', 'CUZ / TAKE CARE'].entries()) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#dfd5b9'; ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#222'; ctx.font = 'bold 23px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 41);
    const texture = own(new THREE.CanvasTexture(canvas));
    const sign = new THREE.Mesh(own(new THREE.PlaneGeometry(8, 2)), own(new THREE.MeshBasicMaterial({ map: texture })));
    sign.position.set(-12, 4, -45 - i * 70); highway.add(sign);
  }

  // Static city transforms come from the same rectangles as simulation collision.
  const city = new THREE.Group(); scene.add(city);
  const extent = WORLD.limit * 2;
  const cityBuildings = new THREE.InstancedMesh(unitBox, material('#9b8875'), WORLD.blocks.length);
  WORLD.blocks.forEach((b, i) => {
    instance(cityBuildings, i, b.x, b.height / 2, b.z, b.width, b.height, b.depth);
    cityBuildings.setColorAt(i, new THREE.Color(['#b8a086', '#918b80', '#bdac93', '#9a8777'][i % 4]));
  });
  cityBuildings.instanceMatrix.needsUpdate = true; city.add(cityBuildings);
  const streetEdge = Math.floor(WORLD.limit / WORLD.grid) * WORLD.grid;
  const streets = streetEdge * 2 / WORLD.grid + 1;
  const cityLines = new THREE.InstancedMesh(unitBox, material('#e6ddc4'), streets * (streets - 1) * 6);
  let lineIndex = 0;
  for (let p = -streetEdge; p <= streetEdge; p += WORLD.grid) {
    box(WORLD.streetHalfWidth * 2, .1, extent, '#45474b', p, -.09, 0, city);
    box(extent, .1, WORLD.streetHalfWidth * 2, '#45474b', 0, -.085, p, city);
    for (let q = -streetEdge; q < streetEdge; q += WORLD.grid) {
      // Leave each intersection open, including its crossing center lines.
      for (const offset of [18, 26, 34]) {
        instance(cityLines, lineIndex++, p, -.025, q + offset, .15, .02, 4);
        instance(cityLines, lineIndex++, q + offset, -.025, p, 4, .02, .15);
      }
    }
  }
  cityLines.instanceMatrix.needsUpdate = true; city.add(cityLines);
  for (const side of [-1, 1]) {
    // Inner face is the exact finite boundary, not a looping scenery strip.
    box(1, 1.2, extent + 2, '#d4c5a7', side * (WORLD.limit + .5), .6, 0, city);
    box(extent, 1.2, 1, '#d4c5a7', 0, .6, side * (WORLD.limit + .5), city);
  }

  const mounts = Object.fromEntries(['smoke', 'emp', 'decoy', 'boost', 'repair'].map(key => [key, new THREE.Group()]));
  const hardware = material('#626c71');
  const canister = own(new THREE.CylinderGeometry(.09, .09, .28, 12)); canister.rotateX(Math.PI / 2);
  for (const x of [-.21, .21]) {
    const mesh = new THREE.Mesh(canister, hardware); mesh.position.x = x; mounts.smoke.add(mesh);
  }
  const coil = own(new THREE.TorusGeometry(.18, .027, 5, 16)); coil.rotateX(Math.PI / 2);
  mounts.emp.add(new THREE.Mesh(coil, material('#9d8f70')));
  box(.34, .08, .3, '#383b43', 0, 0, 0, mounts.decoy);
  box(.025, .35, .025, '#ddd6c4', 0, .2, 0, mounts.decoy);
  const beacon = new THREE.Mesh(own(new THREE.SphereGeometry(.095, 8, 6)), material('#e1ab45'));
  beacon.position.y = .39; mounts.decoy.add(beacon);
  const flameGeometry = own(new THREE.ConeGeometry(.11, .55, 7)); flameGeometry.rotateX(Math.PI / 2);
  const flameMaterial = own(new THREE.MeshBasicMaterial({ color: '#ffb744' }));
  const flames = new THREE.Group(); mounts.boost.add(flames);
  for (const x of [-.22, .22]) {
    const pipe = new THREE.Mesh(canister, hardware); pipe.position.x = x; mounts.boost.add(pipe);
    const flame = new THREE.Mesh(flameGeometry, flameMaterial); flame.position.set(x, 0, .36); flames.add(flame);
  }
  box(.48, .18, .32, '#b34e34', 0, .06, 0, mounts.repair);
  box(.29, .02, .065, '#f2e8d2', 0, .16, 0, mounts.repair);
  box(.065, .02, .23, '#f2e8d2', 0, .162, 0, mounts.repair);
  const smokeMaterial = own(new THREE.MeshLambertMaterial({ color: '#90938e', transparent: true, opacity: .43, depthWrite: false }));
  const smoke = new THREE.InstancedMesh(own(new THREE.SphereGeometry(1, 8, 6)), smokeMaterial, 12); scene.add(smoke);
  const pulseMaterial = own(new THREE.MeshBasicMaterial({ color: '#a7d7e4', transparent: true, opacity: .65, depthWrite: false }));
  const pulse = new THREE.Mesh(coil, pulseMaterial); scene.add(pulse);
  const decoyEffect = new THREE.Mesh(coil, own(new THREE.MeshBasicMaterial({ color: '#e1ab45' }))); scene.add(decoyEffect);
  const repairEffect = new THREE.Mesh(coil, own(new THREE.MeshBasicMaterial({ color: '#eee6c8' }))); scene.add(repairEffect);
  for (const object of [highway, city, smoke, pulse, decoyEffect, flames, repairEffect]) object.visible = false;
  const cosmetics = new THREE.Group(), stripeMaterial = material('#ffffff');
  const ray = new THREE.Raycaster(), downDirection = new THREE.Vector3(0, -1, 0);
  const cameraTarget = new THREE.Vector3(), cameraDirection = new THREE.Vector3();
  let player = null, orbit = .65, frames = 0, wheelAngle = 0, lastDistance = 0, lastRun = null;
  let dragging = null, signature = '', privateMaterials = [], mounted = 'none', disposed = false;
  let worldMode = 'garage', counts = { traffic: 0, police: 0, rivals: 0 };
  let stripe = null, spoiler = false;

  function select(id, appearance, gadget) {
    const next = JSON.stringify([id, appearance.paint, appearance.wheels, appearance.stripe, appearance.spoiler, gadget]);
    if (signature === next) return;
    for (const mount of Object.values(mounts)) mount.removeFromParent();
    cosmetics.removeFromParent(); cosmetics.clear();
    if (!player || player.userData.carId !== id) {
      player?.removeFromParent(); privateMaterials.forEach(m => m.dispose());
      player = createCar(id); scene.add(player);
      const paint = player.getObjectByName('body'); paint.material = paint.material.clone();
      const rim = player.userData.wheels[0].material.clone();
      player.userData.wheels.forEach(w => { w.material = rim; });
      privateMaterials = [paint.material, rim];
    }
    privateMaterials[0].color.set(appearance.paint); privateMaterials[1].color.set(appearance.wheels);
    const { width, height, length } = player.userData.dimensions;
    mounted = gadget; stripe = appearance.stripe || null; spoiler = !!appearance.spoiler;
    if (mounts[gadget]) {
      const rear = gadget === 'smoke' || gadget === 'boost';
      mounts[gadget].position.set(0, rear ? .36 : height + .06, rear ? length / 2 + .02 : 0);
      player.add(mounts[gadget]);
    }
    // Raycast an identity-space proxy, never mutate the shared body geometry.
    const body = new THREE.Mesh(player.getObjectByName('body').geometry, privateMaterials[0]);
    function surface(z) {
      ray.set(new THREE.Vector3(0, height + 1, z), downDirection);
      return ray.intersectObject(body, false)[0]?.point.y ?? height * .55;
    }
    if (stripe) {
      stripeMaterial.color.set(stripe);
      // Hood-only stripe avoids painting over glass or an open cockpit.
      for (let i = 0; i < 12; i++) {
        const z = length * (-.45 + i * .011);
        const mesh = new THREE.Mesh(unitBox, stripeMaterial);
        mesh.scale.set(width * .13, .018, length * .012);
        mesh.position.set(0, surface(z) + .012, z); cosmetics.add(mesh);
      }
    }
    if (spoiler) {
      const z = length * .42, base = surface(z), top = base + .26;
      for (const side of [-1, 1]) box(.04, .26, .07, '#383b43', side * width * .28, base + .13, z, cosmetics);
      const wing = new THREE.Mesh(unitBox, privateMaterials[0]);
      wing.scale.set(width * .84, .055, length * .065); wing.position.set(0, top, z); cosmetics.add(wing);
    }
    player.add(cosmetics); signature = next;
  }
  function turn(amount) { orbit += amount; }
  const down = e => { dragging = e.clientX; host.setPointerCapture(e.pointerId); };
  const move = e => { if (dragging !== null) { orbit += (e.clientX - dragging) * .012; dragging = e.clientX; } };
  const up = () => { dragging = null; };
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move);
  host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up); host.addEventListener('lostpointercapture', up);

  function draw(profile, run, steer = 0) {
    if (disposed) return;
    const id = run?.carId || profile.selected, custom = profile.customizations[id];
    select(id, run?.appearance || custom, run?.gadget || custom.gadget);
    const width = Math.max(1, host.clientWidth);
    const height = Math.floor(Math.max(230, Math.min(innerHeight * (innerWidth < 760 ? (run && run.gadget !== 'none' ? .32 : .40) : .56), 500)));
    if (renderer.domElement.width !== width || renderer.domElement.height !== height) {
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    }
    const roam = run?.mode === 'roam', distance = run?.distance || 0;
    worldMode = roam ? 'roam' : run ? run.mode : 'garage';
    if (lastRun !== (run?.id ?? null)) { wheelAngle = 0; lastDistance = 0; lastRun = run?.id ?? null; }
    wheelAngle -= Math.max(0, distance - lastDistance) / player.userData.profile.wheelRadius;
    lastDistance = distance;
    player.position.set(roam ? run.world.x : run?.x || 0, 0, roam ? run.world.z : 0);
    // Three's local -Z forward uses the same yaw convention as WORLD.
    player.rotation.y = roam ? run.world.heading : run ? -steer * .10 : 0;
    for (const wheel of player.userData.wheels) wheel.rotation.x = run ? wheelAngle : 0;
    highway.visible = !!run && !roam; city.visible = !!roam;
    if (highway.visible) {
      for (let i = 0; i < 90; i++) instance(lines, i, [-3.5, 0, 3.5][i % 3], .01, -Math.floor(i / 3) * 10 + distance % 10 + 20, .12, .025, 4);
      lines.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < 48; i++) {
        const h = 5 + (i * 7 % 19);
        instance(buildings, i, (i % 2 ? -1 : 1) * (18 + i % 4 * 5), h / 2, -Math.floor(i / 2) * 15 + distance % 15 + 25, 8, h, 9);
      }
      buildings.instanceMatrix.needsUpdate = true;
      // Recompute moving instance bounds rather than retain a stale first-frame sphere.
      lines.computeBoundingSphere(); buildings.computeBoundingSphere();
    }
    const active = new Set(); counts = { traffic: 0, police: 0, rivals: 0 };
    for (const type of ['traffic', 'police', 'rivals']) for (const e of run?.[type] || []) {
      const key = `${run.id}:${type}:${e.id}`; active.add(key); counts[type]++;
      if (!npc.has(key)) {
        const model = createCar(e.carId, type === 'police' ? { color: '#eeeeee' } : {});
        npc.set(key, { model, angle: 0, x: e.world?.x, z: e.world?.z, distance: e.distance }); scene.add(model);
      }
      const state = npc.get(key), model = state.model;
      const traveled = roam ? Math.hypot(e.world.x - state.x, e.world.z - state.z) : Math.abs(e.distance - state.distance);
      state.angle -= traveled / model.userData.profile.wheelRadius;
      state.x = e.world?.x; state.z = e.world?.z; state.distance = e.distance;
      model.position.set(roam ? e.world.x : e.x, 0, roam ? e.world.z : -(e.distance - run.distance));
      model.rotation.y = roam ? e.world.heading : 0;
      for (const wheel of model.userData.wheels) wheel.rotation.x = state.angle;
    }
    for (const [key, state] of npc) if (!active.has(key)) { state.model.removeFromParent(); npc.delete(key); }
    const running = run?.status === 'running';
    smoke.visible = running && run.gadget === 'smoke' && run.gadgetTime > 0;
    pulse.visible = running && run.gadget === 'emp' && run.gadgetTime > 0;
    decoyEffect.visible = running && run.gadget === 'decoy' && run.gadgetTime > 0;
    flames.visible = running && run.gadget === 'boost' && run.gadgetTime > 0;
    repairEffect.visible = running && run.gadget === 'repair' && run.gadgetCooldown > 14;
    const yaw = player.rotation.y, sin = Math.sin(yaw), cos = Math.cos(yaw);
    if (smoke.visible) {
      for (let i = 0; i < 12; i++) {
        const side = Math.sin(i * 7 + run.elapsed) * .9, back = player.userData.dimensions.length / 2 + 1 + i * .55;
        const size = .8 + i % 4 * .25;
        instance(smoke, i, player.position.x + side * cos + back * sin, .5 + i % 4 * .4, player.position.z - side * sin + back * cos, size, size, size);
      }
      smoke.instanceMatrix.needsUpdate = true; smoke.computeBoundingSphere();
    }
    if (pulse.visible) { pulse.position.set(player.position.x, .13, player.position.z); pulse.scale.setScalar(6 + (3 - run.gadgetTime) * 20); pulseMaterial.opacity = .65 * run.gadgetTime / 3; }
    if (decoyEffect.visible) {
      decoyEffect.position.set(roam ? run.gadgetTarget.x : player.position.x, .25, roam ? run.gadgetTarget.z : -8);
      decoyEffect.scale.setScalar(5 + Math.sin(run.elapsed * 5));
    }
    if (flames.visible) flames.scale.z = .9 + .2 * Math.sin(run.elapsed * 24);
    if (repairEffect.visible) { repairEffect.position.set(player.position.x, .25, player.position.z); repairEffect.scale.setScalar(4 + (15 - run.gadgetCooldown) * 4); }
    if (roam) {
      cameraTarget.set(player.position.x, 1, player.position.z);
      camera.position.set(player.position.x + sin * 11, 6.2, player.position.z + cos * 11);
      city.updateMatrixWorld(true);
      cameraDirection.copy(camera.position).sub(cameraTarget);
      ray.far = cameraDirection.length(); ray.set(cameraTarget, cameraDirection.normalize());
      const obstruction = ray.intersectObject(cityBuildings, false)[0];
      if (obstruction) camera.position.copy(cameraTarget).addScaledVector(ray.ray.direction, Math.max(.3, obstruction.distance - .4));
      ray.far = Infinity;
      camera.lookAt(player.position.x - sin * 7, 1, player.position.z - cos * 7);
    } else if (run) { camera.position.set(run.x * .45, 6.2, 12); camera.lookAt(run.x * .5, .5, -20); }
    else { camera.position.set(Math.sin(orbit) * 7, 3.1, Math.cos(orbit) * 7); camera.lookAt(0, .65, 0); }
    renderer.render(scene, camera); frames++;
  }
  function inspect() {
    const customization = Object.freeze({ paint: player?.getObjectByName('body').material.color.getHexString(), wheels: player?.userData.wheels[0].material.color.getHexString(), mounted, stripe, spoiler });
    return Object.freeze({ frames, triangles: renderer.info.render.triangles, drawcalls: renderer.info.render.calls,
      modelId: player?.userData.carId || null, world: Object.freeze({ ...counts }), worldMode,
      cityBlocks: city.visible ? cityBuildings.count : 0,
      pose: player ? Object.freeze({ x: player.position.x, z: player.position.z, heading: player.rotation.y }) : null,
      customization, effects: Object.freeze({ smokePuffs: smoke.visible ? smoke.count : 0, empVisible: pulse.visible, decoyVisible: decoyEffect.visible, boostVisible: flames.visible, repairVisible: repairEffect.visible }), dpr: 1 });
  }
  return { draw, turn, inspect,
    dispose() {
      if (disposed) return; disposed = true;
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); host.removeEventListener('lostpointercapture', up);
      scene.traverse(object => { if (object.isInstancedMesh) object.dispose(); });
      scene.clear(); npc.clear(); renderer.dispose(); privateMaterials.forEach(m => m.dispose());
      for (const r of resources) r.dispose(); disposeCars(); host.replaceChildren();
    }
  };
}
