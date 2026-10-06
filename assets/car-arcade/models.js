import * as THREE from './vendor/three.module.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';
import { BY_ID } from './fleet.js';

// Authored longitudinal profiles: cowl, roof start/end, rear glass, belt height,
// nose/tail half-width factors, roof width, wheelbase fraction, distinguishing form.
const profiles = {
  bricklet: [-.23, -.18, .20, .29, .56, .94, .96, .85, .66, 'worn'],
  pip: [-.28, -.17, .24, .36, .52, .80, .87, .77, .65, 'retro'],
  parcel: [-.30, -.22, .32, .40, .49, .87, .98, .91, .66, 'panel'],
  finch: [-.19, -.06, .15, .35, .56, .77, .91, .76, .66, 'lip'],
  lantern: [-.23, -.13, .17, .29, .54, .93, .95, .82, .65, 'saloon'],
  comet: [-.16, -.01, .13, .38, .55, .73, .86, .72, .64, 'fastback'],
  orchard: [-.27, -.15, .33, .41, .52, .91, .96, .88, .68, 'rails'],
  pebble: [-.28, -.17, .20, .34, .53, .85, .89, .79, .64, 'rally'],
  dockside: [-.39, -.31, .36, .43, .48, .96, .98, .94, .70, 'van'],
  horizon: [-.12, .01, .19, .32, .56, .81, .89, .75, .68, 'gt'],
  morrow: [-.13, -.04, .12, .23, .61, .77, .88, .72, .62, 'open'],
  gravel: [-.26, -.17, .26, .35, .53, .91, .93, .84, .65, 'scout'],
  relay: [-.26, -.08, .21, .35, .55, .86, .92, .79, .70, 'tourer'],
  tempest: [-.14, .02, .16, .31, .58, .68, .92, .70, .66, 'wing'],
  atlas: [-.29, -.20, .04, .13, .52, .97, .99, .89, .71, 'pickup'],
  sunray: [-.20, -.02, .17, .32, .57, .63, .83, .65, .69, 'halo'],
};
const prototypes = new Map();
const materials = new Map();
const dark = '#23272c', metal = '#a3a8a9', rubber = '#151719';

function material(key, parameters) {
  if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial(parameters));
  return materials.get(key);
}

// All pieces become indexed position/normal/color only, then one draw per batch.
function add(parts, geometry, color = '#ffffff') {
  geometry.deleteAttribute('uv');
  geometry.clearGroups();
  const rgb = new THREE.Color(color);
  const colors = new Float32Array(geometry.attributes.position.count * 3);
  for (let i = 0; i < colors.length; i += 3) rgb.toArray(colors, i);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  parts.push(geometry);
}
function box(parts, color, x, y, z, w, h, l, rx = 0, ry = 0, rz = 0) {
  const g = new THREE.BoxGeometry(w, h, l);
  g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z);
  add(parts, g, color);
}
function beam(parts, color, a, b, thickness) {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
  const g = new THREE.CylinderGeometry(thickness, thickness, start.distanceTo(end), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
  g.translate(...start.add(end).multiplyScalar(.5).toArray());
  add(parts, g, color);
}
// A bevelled eight-corner section avoids a stack of rectangular body boxes.
function hull(parts, sections, color = '#ffffff') {
  const vertices = [], indices = [];
  for (const [z, w, bottom, top] of sections) {
    const bevel = Math.min(.08, (top - bottom) * .23);
    for (const [x, y] of [[-w + bevel,bottom], [w - bevel,bottom], [w,bottom + bevel], [w,top - bevel], [w - bevel,top], [-w + bevel,top], [-w,top - bevel], [-w,bottom + bevel]]) vertices.push(x, y, z);
  }
  for (let s = 0; s < sections.length - 1; s++) for (let j = 0; j < 8; j++) {
    const a = s * 8 + j, b = s * 8 + (j + 1) % 8;
    indices.push(a, b, b + 8, a, b + 8, a + 8);
  }
  for (let j = 1; j < 7; j++) {
    indices.push(0, j + 1, j);
    const end = (sections.length - 1) * 8;
    indices.push(end, end + j, end + j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  g.setIndex(indices); g.computeVertexNormals(); add(parts, g, color);
}
function merge(parts) {
  const g = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!g) throw new Error('Car geometry merge failed');
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
function wheelGeometry(r, spokes) {
  const parts = [];
  const tire = new THREE.CylinderGeometry(r - .018, r - .018, .22, 20);
  tire.rotateZ(Math.PI / 2); add(parts, tire, rubber);
  for (let i = 0; i < 20; i++) {
    const angle = i * Math.PI / 10;
    box(parts, '#35383a', 0, (r - .018) * Math.cos(angle), (r - .018) * Math.sin(angle), .232, .028, .072, angle);
  }
  for (const side of [-1, 1]) {
    const rim = new THREE.TorusGeometry(r * .62, .022, 4, 20);
    rim.rotateY(Math.PI / 2); rim.translate(side * .116, 0, 0); add(parts, rim, metal);
    const hub = new THREE.CylinderGeometry(r * .19, r * .19, .018, 10);
    hub.rotateZ(Math.PI / 2); hub.translate(side * .12, 0, 0); add(parts, hub, metal);
    for (let i = 0; i < spokes; i++) {
      const a = i * Math.PI * 2 / spokes;
      box(parts, metal, side * .116, r * .36 * Math.cos(a), r * .36 * Math.sin(a), .018, r * .48, .035, a);
      box(parts, dark, side * .135, r * .13 * Math.cos(a), r * .13 * Math.sin(a), .014, .023, .023);
    }
  }
  return merge(parts);
}
function build(car) {
  const [cowl, rf, rr, rear, belt, nose, tail, roofWidth, axle, form] = profiles[car.id];
  const w = car.width / 2, l = car.length, h = car.height, y = h * belt;
  const r = Math.min(.40, h * .225), wheelZ = l * axle / 2;
  const paint = [], details = [], windows = [];
  hull(paint, [[-l/2 + .08,w*nose,.30,y*.88], [-l*.32,w*.93,.26,y], [l*.29,w*.93,.26,y], [l/2-.08,w*tail,.31,y*.95]]);
  if (form !== 'open') {
    hull(windows, [[cowl*l,w*.82,y-.015,y+.035], [rf*l,w*roofWidth*.92,y,h-.06], [rr*l,w*roofWidth*.92,y,h-.06], [rear*l,w*.83,y-.015,y+.035]]);
    hull(form === 'retro' ? details : paint, [[rf*l,w*roofWidth*.96,h-.09,h], [rr*l,w*roofWidth*.96,h-.09,h]], form === 'retro' ? '#e2d6ba' : '#ffffff');
  } else {
    beam(paint, '#ffffff', [-w*.75,y,cowl*l], [-w*.65,h-.04,rf*l], .035);
    beam(paint, '#ffffff', [w*.75,y,cowl*l], [w*.65,h-.04,rf*l], .035);
    const slope = Math.atan2((rf-cowl)*l,h-y);
    box(windows, '#ffffff', 0,(y+h)/2,(rf+cowl)*l/2,w*1.35,Math.hypot(h-y,(rf-cowl)*l),.025,slope);
    beam(details, metal, [-w*.65,h-.03,rf*l],[w*.65,h-.03,rf*l],.026);
    for (const side of [-1,1]) {
      const hoop = new THREE.TorusGeometry(.18,.025,5,12,Math.PI);
      hoop.translate(side*w*.42,y+.17,l*.12); add(details,hoop,metal);
    }
  }
  for (const side of [-1,1]) {
    const x = side*w*.94;
    for (const z of [-wheelZ,wheelZ]) {
      const fender = new THREE.TorusGeometry(r+.025,.055,5,16,Math.PI);
      fender.rotateY(Math.PI/2); fender.translate(x,r,z); add(paint,fender);
    }
    if (form !== 'open') {
      for (const [low,high] of [[cowl,rf],[rear,rr]]) beam(paint,'#ffffff',[side*w*.83,y,low*l],[side*w*roofWidth*.93,h-.065,high*l],.028);
      beam(details,dark,[side*w*.83,y,l*.055],[side*w*roofWidth*.93,h-.075,l*.055],.024);
    }
    box(details,metal,x,y-.035,0,.028,.025,l*.69);
    // Door shut-lines, sill, handle, mirror stalk and reflective face.
    for (const z of [cowl*l+.09,l*.11,rear*l-.07]) box(details,dark,x,y*.73,z,.02,y*.47,.014);
    box(details,dark,x,.32,0,.045,.07,l*.49);
    box(details,metal,x,y-.095,l*.025,.037,.035,.17);
    if (['saloon','rails','van','tourer','scout'].includes(form)) box(details,metal,x,y-.095,l*.23,.037,.035,.17);
    beam(details,dark,[x,y+.07,cowl*l+.09],[side*(w-.08),y+.13,cowl*l+.16],.025);
    box(paint,'#ffffff',side*(w-.06),y+.14,cowl*l+.16,.12,.09,.18);
    box(details,metal,side*(w-.06),y+.14,cowl*l+.255,.10,.065,.009);
    // Upholstery, headrest and dashboard remain visible through tinted glazing.
    box(details,'#66574a',side*w*.4,y+.02,l*.07,w*.57,.10,.39);
    box(details,'#66574a',side*w*.4,y+.16,l*.15,w*.56,.30,.09,-.12);
    box(details,dark,side*w*.4,y+.34,l*.16,.19,.11,.08);
    box(details,dark,side*w*.63,.31,l*.46,.09,.07,.20);
  }
  box(details,dark,0,y+.055,cowl*l+.12,w*1.5,.11,.18);
  const steering = new THREE.TorusGeometry(.115,.018,5,12);
  steering.rotateX(-.45); steering.translate(-w*.4,y+.19,cowl*l+.25); add(details,steering,dark);
  for (const end of [-1,1]) {
    box(details,form === 'worn' ? '#696c64' : dark,0,.43,end*(l/2-.04),w*1.72,.12,.08);
    box(details,'#ddd3b4',0,.52,end*(l/2+.004),.28,.085,.012);
    for (const side of [-1,1]) {
      if (end === -1 && ['retro','rally','worn'].includes(form)) {
        const lamp = new THREE.CylinderGeometry(.12,.12,.04,16);
        lamp.rotateX(Math.PI/2); lamp.translate(side*w*.63,y*.78,-l/2+.02); add(details,lamp,'#fff1c0');
      } else box(details,end === -1 ? '#fff1c0' : '#b42f27',side*w*.61,y*.80,end*(l/2-.02),w*.42,.095,.06);
    }
  }
  for (let i = 0; i < 5; i++) box(details,metal,0,y*.64+i*.027,-l/2+.019,w*.58,.013,.025);
  // Hood shut lines and screen wipers.
  for (const side of [-1,1]) {
    beam(details,dark,[side*w*.57,y*.91,-l*.45],[side*w*.62,y+.006,cowl*l],.008);
    beam(details,dark,[side*w*.45,y+.05,cowl*l+.015],[side*w*.13,y+.07,cowl*l+.025],.012);
  }
  if (form === 'worn') {
    for (let i = 0; i < 7; i++) box(details,i%2 ? '#684b36' : '#b5a68a',-w*.944,y*.64+(i%3)*.055,-l*.22+i*.16,.016,.025+i*.006,.12);
    box(details,'#797b70',w*.25,y+.007,-l*.34,.34,.012,.24,.018);
    box(details,'#383832',w*.63,y*.79,-l/2-.004,.18,.025,.008,0,0,.33);
  }
  if (['rails','scout','van','panel'].includes(form)) {
    for (const side of [-1,1]) beam(details,metal,[side*w*.65,h-.02,rf*l+.10],[side*w*.65,h-.02,rr*l-.10],.025);
  }
  if (['van','panel'].includes(form)) {
    for (const side of [-1,1]) box(paint,'#ffffff',side*w*.82,(y+h)/2,l*.23,.045,(h-y)*.68,l*.25);
    box(details,dark,0,y*.78,l/2-.009,.018,y*.51,.014);
  }
  if (form === 'pickup') {
    box(details,dark,0,y+.01,l*.30,w*1.52,.035,l*.28);
    for (let i = -3; i <= 3; i++) box(details,metal,i*w*.19,y+.034,l*.30,.025,.02,l*.27);
    for (const side of [-1,1]) box(paint,'#ffffff',side*w*.85,y+.10,l*.30,.10,.20,l*.31);
  }
  if (['lip','fastback','gt','wing','halo'].includes(form)) {
    box(details,dark,0,.29,-l*.46,w*1.7,.045,.18);
    for (const side of [-1,1]) for (let i = 0; i < 3; i++) box(details,dark,side*w*.94,y*.79,l*.19+i*.065,.021,.10,.025,0,0,side*.22);
    if (['wing','halo'].includes(form)) {
      for (const side of [-1,1]) box(details,dark,side*w*.55,y+.18,l*.40,.035,.29,.06);
      box(paint,'#ffffff',0,y+.33,l*.40,w*1.7,.055,.22,-.10);
    }
  }
  if (['rally','scout'].includes(form)) {
    for (const side of [-1,1]) {
      box(details,dark,side*w*.86,.24,wheelZ+.18,.22,.27,.035);
      const lamp = new THREE.CylinderGeometry(.105,.105,.07,12);
      lamp.rotateX(Math.PI/2); lamp.translate(side*w*.26,y*.83,-l/2-.025); add(details,lamp,'#ffe8a1');
    }
  }
  // Left front seat, ahead of the headrest and behind the wheel. Keep short
  // pickup cabins under their actual roof rather than behind its rear edge.
  const eye = Object.freeze([-w*.4, y+(h-y)*.63, l*Math.min(.06,rr-.005)]);
  const cockpit = Object.freeze({eye, target:Object.freeze([eye[0],eye[1],-l])});
  const result = {paint:merge(paint), details:merge(details), glass:merge(windows), wheel:wheelGeometry(r, car.style === 'sport' ? 7 : 5), r, wheelZ, cockpit};
  return result;
}
function paintColor(options, fallback) {
  if (!options || typeof options !== 'object' || ![Object.prototype,null].includes(Object.getPrototypeOf(options))) throw new TypeError('Expected plain car options');
  const descriptors = Object.getOwnPropertyDescriptors(options);
  for (const key of Reflect.ownKeys(descriptors)) if (key !== 'color' || !Object.hasOwn(descriptors[key],'value')) throw new TypeError('Unknown or accessor car option');
  const supplied = descriptors.color?.value;
  const value = supplied === undefined ? fallback : supplied;
  if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value.toLowerCase();
  if (Number.isInteger(value) && value >= 0 && value <= 0xffffff) return `#${value.toString(16).padStart(6,'0')}`;
  throw new TypeError('Color must be #RRGGBB or a 24-bit integer');
}

export function createCar(id, options = {}) {
  if (typeof id !== 'string' || !Object.hasOwn(BY_ID,id)) throw new RangeError('Unknown car ID');
  const car = BY_ID[id], color = paintColor(options,car.color);
  if (!prototypes.has(id)) prototypes.set(id,build(car));
  const p = prototypes.get(id), group = new THREE.Group();
  group.name = id;
  const solid = material('detail',{vertexColors:true,roughness:.72,metalness:.18});
  const body = material(color,{color,vertexColors:true,roughness:.43,metalness:.26});
  const glass = material('glass',{color:'#748e99',vertexColors:true,transparent:true,opacity:.38,roughness:.21,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
  glass.forceSinglePass = true;
  for (const [name,geometry,mat] of [['body',p.paint,body],['trim-interior',p.details,solid],['glazing',p.glass,glass]]) {
    const mesh = new THREE.Mesh(geometry,mat); mesh.name = name; group.add(mesh);
  }
  const wheels = [];
  for (const z of [-p.wheelZ,p.wheelZ]) for (const side of [-1,1]) {
    const wheel = new THREE.Mesh(p.wheel,solid);
    wheel.name = `${z < 0 ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}`;
    wheel.position.set(side*(car.width/2-.13),-p.wheel.boundingBox.min.y,z); group.add(wheel); wheels.push(wheel);
  }
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  let triangles = 0, drawCalls = 0;
  group.traverse(o => {
    if (o.isMesh) { triangles += o.geometry.index.count/3; drawCalls++; }
  });
  group.userData = Object.freeze({carId:id,wheels:Object.freeze(wheels),triangles,drawCalls,cockpit:p.cockpit,
    dimensions:Object.freeze({width:size.x,height:size.y,length:size.z}),
    profile:Object.freeze({form:profiles[id][9],wheelRadius:p.r,axleHeight:-p.wheel.boundingBox.min.y,wheelbase:p.wheelZ*2,forward:'-Z',wheelAxis:'X',measurement:'local unrotated geometry; single color pass, no shadows'})});
  return group;
}

// Final renderer teardown only: never dispose resources when removing one car.
export function disposeCars() {
  for (const p of prototypes.values()) for (const key of ['paint','details','glass','wheel']) p[key].dispose();
  for (const m of materials.values()) m.dispose();
  prototypes.clear(); materials.clear();
}
