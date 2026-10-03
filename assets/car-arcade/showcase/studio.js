import * as THREE from '../vendor/three.module.js';
import { createCar as pip } from './pip.js';
import { createCar as brindle } from './brindle.js';
import { createGarage } from './garage.js';
import { decorateCar, decorateGarage } from './realism.js';

const canvas = document.getElementById('studio'), status = document.getElementById('status');
const factories = { pip, brindle }, scene = new THREE.Scene();
let renderer, environment, current, garage, drag = null, pending = 0, frames = 0, disposed = false, failure = null;
let view = 'exterior', look = 0, renderedCar = null, retiredCar = null, initializationTimer = 0;
const windowOpacity = new Map();
const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
function disposeObject(object) {
  const geometries = new Set(), materials = new Set(), textures = new Set(), targets = new Set();
  object.traverse(node => {
    if (node.isMesh) { geometries.add(node.geometry); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat); }
    for (const target of [node.shadow?.map, node.shadow?.mapPass]) if (target) targets.add(target);
  });
  for (const mat of materials) for (const value of Object.values(mat)) {
    if (value?.isTexture && value !== environment?.texture) textures.add(value);
  }
  targets.forEach(t => { textures.delete(t.texture); t.dispose(); });
  textures.forEach(t => t.dispose()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
function fail(error) { failure = String(error.message || error); status.textContent = `Studio unavailable: ${failure}. No game state was changed.`; }
function schedule() {
  // Cold shader compilation must not block the document/font load event.
  if (document.readyState === 'complete' && renderer && current && !pending && !disposed && !failure) pending = requestAnimationFrame(draw);
}
function frameCamera() {
  if (!current) return;
  current.updateWorldMatrix(true, true);
  camera.fov = view === 'cockpit' ? 62 : 32;
  camera.near = view === 'cockpit' ? .025 : .1;
  camera.updateProjectionMatrix();
  if (view === 'cockpit') {
    const {eye, target} = current.userData.cockpit;
    const localEye = new THREE.Vector3(...eye);
    const direction = new THREE.Vector3(...target).sub(localEye).applyAxisAngle(new THREE.Vector3(0, 1, 0), look);
    camera.position.copy(current.localToWorld(localEye.clone()));
    camera.lookAt(current.localToWorld(localEye.add(direction)));
  } else {
    // Fit all eight actual world-bound corners, including depth, to 90% NDC.
    const bounds = new THREE.Box3().setFromObject(current), center = bounds.getCenter(new THREE.Vector3());
    const outward = new THREE.Vector3(4.4, .95, -5.35).normalize();
    camera.position.copy(center).add(outward); camera.lookAt(center); camera.updateMatrixWorld();
    const inverse = camera.quaternion.clone().invert(), tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let distance = 0;
    for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) {
      const p = new THREE.Vector3(x, y, z).sub(center).applyQuaternion(inverse);
      distance = Math.max(distance, p.z + Math.abs(p.x) / (tan * camera.aspect * .9), p.z + Math.abs(p.y) / (tan * .9));
    }
    camera.position.copy(center).addScaledVector(outward, distance); camera.lookAt(center);
  }
  camera.updateMatrixWorld();
}
function draw() {
  pending = 0;
  try {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) { renderer.setSize(width, height, false); camera.aspect = width / height; }
    frameCamera(); renderer.render(scene, camera); frames++;
    // Retain the old GPU programs until the new car has acquired matching ones.
    if (retiredCar) { disposeObject(retiredCar); retiredCar = null; }
    renderedCar = current;
    status.textContent = `${current.userData.name} / ${view} / parked 3D study / ${renderer.info.render.triangles.toLocaleString()} frame triangles / ${renderer.info.render.calls} draws. Device performance unmeasured.`;
  } catch (error) { fail(error); }
}
function select(id) {
  if (disposed || !renderer || !Object.hasOwn(factories, id)) return;
  if (current) {
    scene.remove(current);
    if (current === renderedCar) retiredCar = current;
    else disposeObject(current);
  }
  windowOpacity.clear();
  current = factories[id](); decorateCar(current); scene.add(current);
  current.traverse(node => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    // ponytail: thin-pane alpha, restore refraction only on a GPU-tested high tier.
    for (const mat of mats) {
      if (mat.transparent) { mat.transmission = 0; mat.forceSinglePass = true; }
      if (mat.name === 'window-glass' && !windowOpacity.has(mat)) windowOpacity.set(mat, mat.opacity);
    }
    node.castShadow = !mats.some(m => m.transparent); node.receiveShadow = true;
  });
  setView(view);
}
function initialize() {
  if (disposed) return;
  try {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color('#ece9e2');
  garage = createGarage(); decorateGarage(garage); scene.add(garage);
  garage.traverse(node => {
    if (node.isMesh && node.material.name === 'garage-window') {
      node.material.emissive.setRGB(.65,.72,.8); node.material.emissiveIntensity = 2;
    }
  });
  scene.add(new THREE.HemisphereLight(0xe3eaf3,0x80766a,.42));
  const key = new THREE.DirectionalLight(0xfff4e3,2.8); key.position.set(-3,7,-4); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:16}); key.shadow.bias = -.00005; key.shadow.normalBias = .003; key.shadow.radius = 3; scene.add(key);
  const fill = new THREE.DirectionalLight(0xdde8fb,.55); fill.position.set(4,2,3); scene.add(fill);
  // ponytail: diffuse workshop capture; fully lit capture needs GPU validation.
  // Separate materials avoid modifying the live scene's lighting/program state.
  const room = new THREE.Scene(), reflectedGarage = garage.clone(true), captureMaterials = new Set();
  room.background = scene.background.clone(); reflectedGarage.position.y = -.85;
  reflectedGarage.traverse(node => {
    if (!node.isMesh) return;
    const source = node.material;
    const color = source.color.clone();
    if (source.name === 'garage-window') color.setRGB(3,3.2,3.5);
    node.material = new THREE.MeshBasicMaterial({color, map:source.map, side:THREE.DoubleSide});
    captureMaterials.add(node.material);
  });
  room.add(reflectedGarage);
  const pmrem = new THREE.PMREMGenerator(renderer);
  try { environment = pmrem.fromScene(room,.035,.1,30); }
  finally { captureMaterials.forEach(material => material.dispose()); pmrem.dispose(); }
  // Geometry and color maps are borrowed from the live garage, not disposed here.
  scene.environment = environment.texture;
  select('pip');
  } catch (error) { fail(error); }
}
function setView(next) {
  if (disposed || !current || failure) return;
  view = next;
  for (const [mat, opacity] of windowOpacity) mat.opacity = view === 'cockpit' ? .12 : opacity;
  document.getElementById('cockpit').setAttribute('aria-pressed', String(view === 'cockpit'));
  document.getElementById('left').textContent = view === 'cockpit' ? 'Look left' : 'Rotate left';
  document.getElementById('right').textContent = view === 'cockpit' ? 'Look right' : 'Rotate right';
  canvas.setAttribute('aria-label', `Original parked 3D car, ${view}. Drag or use left and right arrows to ${view === 'cockpit' ? 'look around' : 'rotate'}. C switches view; Escape returns outside.`);
  // Mode and physical camera must agree before the next asynchronous paint.
  frameCamera(); schedule();
}
function rotate(amount) {
  if (current && !failure && !disposed) {
    if (view === 'cockpit') look = THREE.MathUtils.clamp(look - amount, -1.25, 1.25);
    else current.rotation.y += amount;
    schedule();
  }
}
document.getElementById('car').onchange = event => { try { select(event.target.value); } catch (error) { fail(error); } };
document.getElementById('left').onclick = () => rotate(-.22); document.getElementById('right').onclick = () => rotate(.22);
document.getElementById('reset').onclick = () => { if (current) { look = 0; if (view === 'exterior') current.rotation.y = 0; schedule(); } };
document.getElementById('cockpit').onclick = () => setView(view === 'exterior' ? 'cockpit' : 'exterior');
document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches('input,textarea')) return;
  if (event.key.toLowerCase() === 'c' && !event.repeat) { event.preventDefault(); setView(view === 'exterior' ? 'cockpit' : 'exterior'); }
  else if (event.key === 'Escape') { event.preventDefault(); setView('exterior'); }
  else if (!event.target.matches('select') && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); rotate(event.key === 'ArrowLeft' ? -.12 : .12); }
});
canvas.addEventListener('pointerdown', event => { drag = {id:event.pointerId,x:event.clientX}; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) { rotate((event.clientX-drag.x)*.009); drag.x = event.clientX; } });
for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, () => { drag = null; });
// Deliver document load before beginning costly graphics work on software GPUs.
if (document.readyState === 'complete') initializationTimer = setTimeout(initialize, 0);
else window.addEventListener('load', () => { initializationTimer = setTimeout(initialize, 0); }, {once:true});
window.addEventListener('resize', schedule); window.addEventListener('blur', () => { drag = null; });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost; reload to recover')); });
function framed() {
  if (!current || view !== 'exterior') return false;
  const bounds = new THREE.Box3().setFromObject(current);
  for (const x of [bounds.min.x,bounds.max.x]) for (const y of [bounds.min.y,bounds.max.y]) for (const z of [bounds.min.z,bounds.max.z]) {
    const p = new THREE.Vector3(x,y,z).project(camera);
    if (Math.abs(p.x) > .97 || Math.abs(p.y) > .97 || Math.abs(p.z) >= 1) return false;
  }
  return true;
}
function glassStats() {
  const mats = new Set(); current?.traverse(node => { if (node.isMesh) for (const mat of Array.isArray(node.material) ? node.material : [node.material]) if (mat.transparent) mats.add(mat); });
  return {refractingMaterials:[...mats].filter(m=>m.transmission>0).length,singlePassGlass:[...mats].every(m=>m.forceSinglePass)};
}
function garageStats() {
  let garageTriangles = 0, garageMeshes = 0;
  garage?.traverse(node => { if (node.isMesh) { garageMeshes++; garageTriangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3; } });
  return {garageTriangles, garageMeshes};
}
Object.defineProperty(window,'carStudioSnapshot',{get:()=>Object.freeze({...glassStats(),...garageStats(),view,cameraLocal:current ? Object.freeze(current.worldToLocal(camera.position.clone()).toArray()) : null,look,framed:framed(),id:document.getElementById('car').value,name:current?.userData.name,frames,angle:current?.rotation.y,triangles:renderer?.info.render.triangles,drawCalls:renderer?.info.render.calls,geometryCount:renderer?.info.memory.geometries,textureCount:renderer?.info.memory.textures,revision:THREE.REVISION,error:failure})});
window.addEventListener('pagehide',()=>{if(disposed)return;disposed=true;drag=null;clearTimeout(initializationTimer);cancelAnimationFrame(pending);pending=0;disposeObject(scene);if(retiredCar)disposeObject(retiredCar);retiredCar=null;renderedCar=null;windowOpacity.clear();environment?.dispose();renderer?.dispose();});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
