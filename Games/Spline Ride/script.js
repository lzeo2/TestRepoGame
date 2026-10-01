// Adapted from three.js r160 webgl_geometry_extrude_splines.html.
// Copyright © 2010-2023 three.js authors, MIT. See vendor/LICENSE and CREDITS.md.
import * as THREE from './vendor/three.module.js';
import * as Curves from './vendor/CurveExtras.js';
import { OrbitControls } from './vendor/OrbitControls.js';

const direction = new THREE.Vector3();
const binormal = new THREE.Vector3();
const normal = new THREE.Vector3();
const position = new THREE.Vector3();
const lookAt = new THREE.Vector3();
const pipeSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 10, -10), new THREE.Vector3(10, 0, -10),
  new THREE.Vector3(20, 0, 0), new THREE.Vector3(30, 0, 10),
  new THREE.Vector3(30, 0, 20), new THREE.Vector3(20, 0, 30),
  new THREE.Vector3(10, 0, 30), new THREE.Vector3(0, 0, 30),
  new THREE.Vector3(-10, 10, 30), new THREE.Vector3(-10, 20, 30),
  new THREE.Vector3(0, 30, 30), new THREE.Vector3(10, 30, 30),
  new THREE.Vector3(20, 30, 15), new THREE.Vector3(10, 30, 10),
  new THREE.Vector3(0, 30, 10), new THREE.Vector3(-10, 20, 10),
  new THREE.Vector3(-10, 10, 10), new THREE.Vector3(0, 0, 10),
  new THREE.Vector3(10, -10, 10), new THREE.Vector3(20, -15, 10),
  new THREE.Vector3(30, -15, 10), new THREE.Vector3(40, -15, 10),
  new THREE.Vector3(50, -15, 10), new THREE.Vector3(60, 0, 10),
  new THREE.Vector3(70, 0, 0), new THREE.Vector3(80, 0, 0),
  new THREE.Vector3(90, 0, 0), new THREE.Vector3(100, 0, 0)
]);
const sampleClosedSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, -40, -40), new THREE.Vector3(0, 40, -40),
  new THREE.Vector3(0, 140, -40), new THREE.Vector3(0, 40, 40),
  new THREE.Vector3(0, -40, 40)
]);
sampleClosedSpline.curveType = 'catmullrom';
sampleClosedSpline.closed = true;
const splines = {
  GrannyKnot: new Curves.GrannyKnot(),
  HeartCurve: new Curves.HeartCurve(3.5),
  VivianiCurve: new Curves.VivianiCurve(70),
  KnotCurve: new Curves.KnotCurve(),
  HelixCurve: new Curves.HelixCurve(),
  TrefoilKnot: new Curves.TrefoilKnot(),
  TorusKnot: new Curves.TorusKnot(20),
  CinquefoilKnot: new Curves.CinquefoilKnot(20),
  TrefoilPolynomialKnot: new Curves.TrefoilPolynomialKnot(14),
  FigureEightPolynomialKnot: new Curves.FigureEightPolynomialKnot(),
  DecoratedTorusKnot4a: new Curves.DecoratedTorusKnot4a(),
  DecoratedTorusKnot4b: new Curves.DecoratedTorusKnot4b(),
  DecoratedTorusKnot5a: new Curves.DecoratedTorusKnot5a(),
  DecoratedTorusKnot5c: new Curves.DecoratedTorusKnot5c(),
  PipeSpline: pipeSpline,
  SampleClosedSpline: sampleClosedSpline
};
const labels = ['Granny knot', 'Heart', 'Viviani curve', 'Knot curve', 'Helix',
  'Trefoil knot', 'Torus knot', 'Cinquefoil knot', 'Trefoil polynomial knot',
  'Figure-eight polynomial knot', 'Decorated torus 4a', 'Decorated torus 4b',
  'Decorated torus 5a', 'Decorated torus 5c', 'Pipe spline', 'Closed Catmull-Rom'];
const params = { spline: 'GrannyKnot', scale: 4, extrusionSegments: 64,
  radiusSegments: 8, closed: true, animationView: false, lookAhead: false };
const ui = Object.fromEntries(['path', 'play', 'restart', 'view', 'scale', 'sides',
  'closed', 'ahead', 'progress', 'percent', 'laps', 'stage', 'canvas', 'status']
  .map(id => [id, document.getElementById(id)]));
Object.keys(splines).forEach((key, i) => ui.path.add(new Option(labels[i], key)));
const material = new THREE.MeshLambertMaterial({ color: 0x496777 });
const wireframeMaterial = new THREE.MeshBasicMaterial({ color: 0x17252f,
  opacity: 0.18, wireframe: true, transparent: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeee9d8);
scene.add(new THREE.AmbientLight(0xffffff));
const light = new THREE.DirectionalLight(0xffffff, 1.5);
light.position.set(0, 0, 1);
scene.add(light);
const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10000);
camera.position.set(0, 50, 500);
const splineCamera = new THREE.PerspectiveCamera(84, 1, 0.01, 1000);
const parent = new THREE.Object3D();
scene.add(parent);
parent.add(splineCamera);
const marker = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xc99647 }));
parent.add(marker);
let tubeGeometry, mesh, renderer, controls, resizeObserver, raf;
let playing = false, elapsed = 0, previousTime = 0, frames = 0;
const looptime = 20 * 1000;

function addTube() {
  if (mesh !== undefined) {
    parent.remove(mesh);
    mesh.geometry.dispose();
  }
  const extrudePath = splines[params.spline];
  tubeGeometry = new THREE.TubeGeometry(extrudePath, params.extrusionSegments,
    2, params.radiusSegments, params.closed);
  mesh = new THREE.Mesh(tubeGeometry, material);
  mesh.add(new THREE.Mesh(tubeGeometry, wireframeMaterial));
  parent.add(mesh);
  setScale();
}
function setScale() {
  mesh.scale.set(params.scale, params.scale, params.scale);
}
function animateCamera() {
  controls.enabled = !params.animationView;
  ui.view.textContent = `View: ${params.animationView ? 'Ride' : 'Orbit'}`;
  ui.view.setAttribute('aria-label', `Switch to ${params.animationView ? 'Orbit' : 'Ride'} view`);
  marker.visible = !params.animationView;
}
function updateProgress() {
  const progress = (elapsed % looptime) / looptime * 100;
  ui.progress.value = progress;
  ui.progress.textContent = `${Math.floor(progress)}%`;
  ui.percent.value = `${Math.floor(progress)}%`;
  ui.laps.value = Math.floor(elapsed / looptime);
}
function setPlaying(value) {
  playing = value && !document.hidden;
  previousTime = performance.now();
  if (playing) params.animationView = true;
  ui.play.textContent = playing ? 'Pause' : 'Play';
  ui.play.setAttribute('aria-pressed', String(playing));
  animateCamera();
}
function restart() {
  elapsed = 0;
  params.animationView = false;
  setPlaying(false);
  controls.reset();
  updateProgress();
}
function resize() {
  const width = ui.canvas.clientWidth;
  const height = ui.canvas.clientHeight;
  if (!width || !height) return;
  for (const c of [camera, splineCamera]) {
    c.aspect = width / height;
    c.updateProjectionMatrix();
  }
  const cap = Math.min(1, 1280 / width, 720 / height);
  renderer.setSize(Math.max(1, Math.floor(width * cap)), Math.max(1, Math.floor(height * cap)), false);
}
function render() {
  // Upstream arclength sampling and Frenet-frame camera orientation, unchanged math.
  const t = (elapsed % looptime) / looptime;
  tubeGeometry.parameters.path.getPointAt(t, position);
  position.multiplyScalar(params.scale);
  marker.position.copy(position);
  const segments = tubeGeometry.tangents.length;
  const pickt = t * segments;
  const pick = Math.floor(pickt);
  const pickNext = (pick + 1) % segments;
  binormal.subVectors(tubeGeometry.binormals[pickNext], tubeGeometry.binormals[pick]);
  binormal.multiplyScalar(pickt - pick).add(tubeGeometry.binormals[pick]);
  tubeGeometry.parameters.path.getTangentAt(t, direction);
  const offset = 15;
  normal.copy(binormal).cross(direction);
  position.add(normal.clone().multiplyScalar(offset));
  splineCamera.position.copy(position);
  tubeGeometry.parameters.path.getPointAt((t + 30 / tubeGeometry.parameters.path.getLength()) % 1, lookAt);
  lookAt.multiplyScalar(params.scale);
  if (!params.lookAhead) lookAt.copy(position).add(direction);
  splineCamera.matrix.lookAt(splineCamera.position, lookAt, normal);
  splineCamera.quaternion.setFromRotationMatrix(splineCamera.matrix);
  renderer.render(scene, params.animationView ? splineCamera : camera);
}
function animate(time) {
  if (playing) elapsed += Math.max(0, time - previousTime);
  previousTime = time;
  render();
  frames++;
  updateProgress();
  raf = requestAnimationFrame(animate);
}
Object.defineProperty(window, 'splineRideSnapshot', { get() {
  const activeCamera = params.animationView ? splineCamera : camera;
  return Object.freeze({ playing, view: params.animationView ? 'Ride' : 'Orbit',
    path: params.spline, progress: (elapsed % looptime) / looptime * 100,
    laps: Math.floor(elapsed / looptime), frames,
    geometryCount: renderer?.info.memory.geometries ?? 0,
    drawCalls: renderer?.info.render.calls ?? 0,
    width: ui.canvas.width, height: ui.canvas.height,
    cameraPosition: Object.freeze(activeCamera.position.toArray()),
    cameraQuaternion: Object.freeze(activeCamera.quaternion.toArray()),
    cameraAspects: Object.freeze([camera.aspect, splineCamera.aspect]) });
} });

try {
  renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true });
  renderer.setPixelRatio(1);
  controls = new OrbitControls(camera, ui.canvas);
  controls.minDistance = 100;
  controls.maxDistance = 2000;
  addTube();
  setPlaying(false); // Orbit is static by default, including reduced-motion users.
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(ui.stage);
  resize();
  ui.status.textContent = '';
  ui.play.addEventListener('click', () => setPlaying(!playing));
  ui.restart.addEventListener('click', restart);
  ui.view.addEventListener('click', () => {
    params.animationView = !params.animationView;
    animateCamera();
  });
  ui.path.addEventListener('change', () => {
    params.spline = ui.path.value;
    addTube();
    restart();
  });
  ui.scale.addEventListener('change', () => { params.scale = Number(ui.scale.value); setScale(); });
  ui.sides.addEventListener('change', () => { params.radiusSegments = Number(ui.sides.value); addTube(); });
  ui.closed.addEventListener('change', () => { params.closed = ui.closed.checked; addTube(); });
  ui.ahead.addEventListener('change', () => { params.lookAhead = ui.ahead.checked; animateCamera(); });
  document.addEventListener('keydown', event => {
    if (event.target.closest('select, input, button, summary, a') || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.code === 'Space') setPlaying(!playing);
    else if (event.code === 'KeyR') restart();
    else if (event.code === 'KeyV') { params.animationView = !params.animationView; animateCamera(); }
    else if (!playing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.code)) {
      const backwards = ['ArrowLeft', 'ArrowDown'].includes(event.code);
      elapsed = Math.max(0, elapsed + (backwards ? -200 : 200));
      updateProgress();
    } else return;
    event.preventDefault();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPlaying(false); });
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) setPlaying(false); });
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(raf);
    resizeObserver.disconnect();
    controls.dispose();
    tubeGeometry.dispose();
    marker.geometry.dispose();
    marker.material.dispose();
    material.dispose();
    wireframeMaterial.dispose();
    renderer.dispose();
  }, { once: true });
  previousTime = performance.now();
  raf = requestAnimationFrame(animate);
} catch (error) {
  ui.status.textContent = `3D view could not start: ${error.message}. Try a WebGL-enabled browser.`;
  for (const id of ['play', 'restart', 'view', 'path', 'scale', 'sides', 'closed', 'ahead']) ui[id].disabled = true;
}
