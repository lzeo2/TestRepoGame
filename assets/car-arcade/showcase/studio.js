import * as THREE from '../vendor/three.module.js';
import { createCar as pip } from './pip.js';
import { createCar as brindle } from './brindle.js';

const canvas = document.getElementById('studio'), status = document.getElementById('status');
const factories = { pip, brindle }, scene = new THREE.Scene();
let renderer, environment, current, drag = null, pending = 0, frames = 0, disposed = false, failure = null;
const camera = new THREE.PerspectiveCamera(32, 1, .1, 60);
function disposeObject(object) {
  const geometries = new Set(), materials = new Set();
  object.traverse(node => { if (node.isMesh) { geometries.add(node.geometry); for (const mat of Array.isArray(node.material) ? node.material : [node.material]) materials.add(mat); } node.shadow?.map?.dispose(); node.shadow?.mapPass?.dispose(); });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
}
function fail(error) { failure = String(error.message || error); status.textContent = `Studio unavailable: ${failure}. No game state was changed.`; }
function schedule() { if (!pending && !disposed && !failure) pending = requestAnimationFrame(draw); }
function frameCamera() {
  const scale = Math.max(1, 1.4 / camera.aspect);
  camera.position.set(4.4 * scale, .72 + 2.03 * scale, -5.35 * scale); camera.lookAt(0, .72, 0);
}
function draw() {
  pending = 0;
  try {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); frameCamera(); }
    renderer.render(scene, camera); frames++;
    status.textContent = `${current.userData.name} / actual 3D render / ${renderer.info.render.triangles.toLocaleString()} frame triangles / ${renderer.info.render.calls} draws. Device performance unmeasured.`;
  } catch (error) { fail(error); }
}
function select(id) {
  if (disposed || !renderer || !Object.hasOwn(factories, id)) return;
  if (current) { scene.remove(current); disposeObject(current); }
  current = factories[id](); scene.add(current);
  frameCamera();
  current.traverse(node => {
    if (!node.isMesh) return;
    const mats = Array.isArray(node.material) ? node.material : [node.material];
    // ponytail: thin-pane alpha, restore refraction only on a GPU-tested high tier.
    for (const mat of mats) if (mat.transparent) { mat.transmission = 0; mat.forceSinglePass = true; }
    node.castShadow = !mats.some(m => m.transparent); node.receiveShadow = true;
  });
  schedule();
}
try {
  renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.background = new THREE.Color('#ece9e2');
  // Original procedural softboxes, not downloaded HDRs or photographic textures.
  const room = new THREE.Scene(); room.background = new THREE.Color('#b6b3ab');
  const walls = new THREE.Mesh(new THREE.BoxGeometry(20,12,20), new THREE.MeshBasicMaterial({color:'#b6b3ab',side:THREE.BackSide}));
  walls.position.y = 5; room.add(walls);
  for (const [x,y,z,w,h,rotation] of [[-4,4,-2,7,4,Math.PI/2],[4,5,1,8,4,-Math.PI/2],[0,5,-7,7,3,0]]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color().setRGB(5,5,5),side:THREE.DoubleSide}));
    panel.position.set(x,y,z); panel.rotation.y = rotation; room.add(panel);
  }
  const pmrem = new THREE.PMREMGenerator(renderer); environment = pmrem.fromScene(room,.035,.1,30); scene.environment = environment.texture;
  pmrem.dispose(); disposeObject(room);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshStandardMaterial({color:'#c9c5bc',roughness:.58,metalness:.02}));
  floor.rotation.x = -Math.PI/2; floor.position.y = -.006; floor.receiveShadow = true; scene.add(floor);
  scene.add(new THREE.HemisphereLight(0xffffff,0xa9a299,.65));
  const key = new THREE.DirectionalLight(0xffffff,3.5); key.position.set(-3,7,-4); key.castShadow = true;
  key.shadow.mapSize.set(1024,1024); Object.assign(key.shadow.camera,{left:-4,right:4,top:4,bottom:-4,near:.1,far:16}); key.shadow.bias = -.00015; key.shadow.normalBias = .01; scene.add(key);
  const fill = new THREE.DirectionalLight(0xe1eaff,.9); fill.position.set(4,2,3); scene.add(fill);
  select('pip');
} catch (error) { fail(error); }
function rotate(amount) { if (current && !failure) { current.rotation.y += amount; schedule(); } }
document.getElementById('car').onchange = event => { try { select(event.target.value); } catch (error) { fail(error); } };
document.getElementById('left').onclick = () => rotate(-.22); document.getElementById('right').onclick = () => rotate(.22);
document.getElementById('reset').onclick = () => { if (current) { current.rotation.y = 0; schedule(); } };
canvas.addEventListener('keydown', event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); rotate(event.key==='ArrowLeft'?-.12:.12); } });
canvas.addEventListener('pointerdown', event => { drag = {id:event.pointerId,x:event.clientX}; canvas.setPointerCapture(event.pointerId); });
canvas.addEventListener('pointermove', event => { if (drag?.id === event.pointerId) { rotate((event.clientX-drag.x)*.009); drag.x = event.clientX; } });
for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, () => { drag = null; });
window.addEventListener('resize', schedule); window.addEventListener('blur', () => { drag = null; });
canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); fail(new Error('Graphics context lost; reload to recover')); });
function framed() {
  if (!current) return false;
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
Object.defineProperty(window,'carStudioSnapshot',{get:()=>Object.freeze({...glassStats(),framed:framed(),id:document.getElementById('car').value,name:current?.userData.name,frames,angle:current?.rotation.y,triangles:renderer?.info.render.triangles,drawCalls:renderer?.info.render.calls,geometryCount:renderer?.info.memory.geometries,revision:THREE.REVISION,error:failure})});
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(pending);renderer?.dispose();environment?.dispose();disposeObject(scene);});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
