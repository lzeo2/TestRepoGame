import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from '../../assets/car-arcade/models.js';

export function createView(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(1);
  renderer.setClearColor('#b8c4ca');
  host.replaceChildren(renderer.domElement);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#b8c4ca', 100, 240);
  const camera = new THREE.PerspectiveCamera(52, 1, .1, 320);
  scene.add(new THREE.HemisphereLight('#fff4dd', '#575753', 2.4));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2); sun.position.set(-12, 20, 8); scene.add(sun);
  const resources = [], npc = new Map(), dummy = new THREE.Object3D();
  function material(color) { const m = new THREE.MeshLambertMaterial({ color }); resources.push(m); return m; }
  function geometry(w, h, d) { const g = new THREE.BoxGeometry(w, h, d); resources.push(g); return g; }
  function box(w, h, d, color, x, y, z) {
    const mesh = new THREE.Mesh(geometry(w, h, d), material(color)); mesh.position.set(x, y, z); scene.add(mesh); return mesh;
  }
  box(500, .2, 500, '#92917d', 0, -.25, -80);
  const road = box(14, .12, 360, '#45474b', 0, -.08, -110);
  box(.2, .18, 360, '#ddd6c4', -7.3, 0, -110); box(.2, .18, 360, '#ddd6c4', 7.3, 0, -110);
  const lines = new THREE.InstancedMesh(geometry(.12, .025, 4), material('#e6ddc4'), 90); scene.add(lines);
  const buildings = new THREE.InstancedMesh(geometry(1, 1, 1), material('#8b7662'), 48); scene.add(buildings);
  const signs = new THREE.Group(); scene.add(signs);
  for (const [i, text] of ['LAD / NORTH', 'CUH / BOROUGH', 'CUZ / TAKE CARE'].entries()) {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#dfd5b9'; ctx.fillRect(0, 0, 256, 64); ctx.fillStyle = '#222'; ctx.font = 'bold 23px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(text, 128, 41);
    const texture = new THREE.CanvasTexture(canvas); resources.push(texture);
    const mat = new THREE.MeshBasicMaterial({ map: texture }); resources.push(mat);
    const g = new THREE.PlaneGeometry(8, 2); resources.push(g);
    const sign = new THREE.Mesh(g, mat); sign.position.set(-12, 4, -45 - i * 70); signs.add(sign);
  }
  let player = null, orbit = .65, frames = 0, wheelAngle = 0, lastDistance = 0, dragging = null;
  let counts = { traffic: 0, police: 0, rivals: 0 };
  function select(id) {
    if (player?.userData.carId === id) return;
    if (player) scene.remove(player);
    player = createCar(id); scene.add(player);
  }
  function turn(amount) { orbit += amount; }
  const down = e => { dragging = e.clientX; host.setPointerCapture(e.pointerId); };
  const move = e => { if (dragging !== null) { orbit += (e.clientX - dragging) * .012; dragging = e.clientX; } };
  const up = () => { dragging = null; };
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', up);
  function draw(profile, run, steer = 0) {
    select(run?.carId || profile.selected);
    const width = host.clientWidth, height = Math.max(230, Math.min(innerHeight * (innerWidth < 760 ? .40 : .56), 500));
    if (renderer.domElement.width !== width || renderer.domElement.height !== Math.floor(height)) { renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); }
    const distance = run?.distance || 0;
    wheelAngle -= Math.max(0, distance - lastDistance) / player.userData.profile.wheelRadius; lastDistance = distance;
    player.position.set(run?.x || 0, 0, 0); player.rotation.y = run ? -steer * .10 : 0;
    for (const wheel of player.userData.wheels) wheel.rotation.x = run ? wheelAngle : 0;
    road.visible = !!run; lines.visible = !!run; buildings.visible = !!run; signs.visible = !!run;
    for (let i = 0; i < 90; i++) {
      dummy.position.set([-3.5, 0, 3.5][i % 3], .01, -Math.floor(i / 3) * 10 + distance % 10 + 20); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); lines.setMatrixAt(i, dummy.matrix);
    }
    lines.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 48; i++) {
      const height = 5 + (i * 7 % 19); dummy.position.set((i % 2 ? -1 : 1) * (18 + i % 4 * 5), height / 2, -Math.floor(i / 2) * 15 + distance % 15 + 25); dummy.scale.set(8, height, 9); dummy.updateMatrix(); buildings.setMatrixAt(i, dummy.matrix);
    }
    buildings.instanceMatrix.needsUpdate = true;
    const active = new Set(); counts = { traffic: 0, police: 0, rivals: 0 };
    for (const type of ['traffic', 'police', 'rivals']) for (const e of run?.[type] || []) {
      const key = `${type}:${e.id}`; active.add(key); counts[type]++;
      if (!npc.has(key)) { const model = createCar(e.carId, type === 'police' ? { color: '#eeeeee' } : {}); npc.set(key, model); scene.add(model); }
      const model = npc.get(key); model.position.set(e.x, 0, -(e.distance - run.distance));
      for (const wheel of model.userData.wheels) wheel.rotation.x = -e.distance / model.userData.profile.wheelRadius;
    }
    for (const [key, model] of npc) if (!active.has(key)) { scene.remove(model); npc.delete(key); }
    if (run) { camera.position.set(run.x * .45, 6.2, 12); camera.lookAt(run.x * .5, .5, -20); }
    else { camera.position.set(Math.sin(orbit) * 7, 3.1, Math.cos(orbit) * 7); camera.lookAt(0, .65, 0); }
    renderer.render(scene, camera); frames++;
  }
  return { draw, turn, inspect: () => ({ frames, triangles: renderer.info.render.triangles, drawcalls: renderer.info.render.calls, modelId: player?.userData.carId || null, world: { ...counts }, dpr: 1 }),
    dispose() { host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', up); renderer.dispose(); for (const r of resources) r.dispose(); disposeCars(); host.replaceChildren(); } };
}
