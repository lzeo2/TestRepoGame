import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

// Original municipal furniture, facing +Z. Heights are in metres from the pavement.
// The 2.1 m refill tower follows the ACT Water on Tap programme's documented height.
const body = (width, depth, height) => Object.freeze({width, depth, height});
const singleCabinet=body(1.32,.88,.93), doubleCabinet=body(2.04,.88,.93);
const lowFountain = body(.62, .60, .95), refillTower = body(.62, .60, 2.1);
export const PARK_AMENITY_BODIES = Object.freeze({
  bbqSingle:singleCabinet, bbqDouble:doubleCabinet, bbqSingleConcrete:singleCabinet, bbqDoubleConcrete:doubleCabinet,
  fountain:lowFountain, fountainDog:lowFountain, refill:refillTower, refillDog:refillTower,
});

export function parkAmenityVariant(site) {
  if (site.kind === 'bbq') {
    const cabinet = site.plates === 2 ? 'bbqDouble' : 'bbqSingle';
    return site.bench === 'concrete' ? cabinet + 'Concrete' : cabinet;
  }
  if (site.kind === 'fountain') {
    if (site.refill) return site.dogBowl ? 'refillDog' : 'refill';
    return site.dogBowl ? 'fountainDog' : 'fountain';
  }
  throw new Error('Unknown park amenity kind: ' + site.kind);
}

const STAINLESS = 0xc8ccca, EDGE = 0xe4e6dd, WELD = 0x929795;
const RECESS = 0x252b2b, PAINT = 0x414c4c, GASKET = 0x393a39, STONE = 0xa59f92;

// Rounded rectangular sections. Detached top/bottom caps keep the vertical edge
// normals independent of the caps and avoid the dark corners of a smoothed cube.
function loft(sections, radius, steps = 3) {
  const positions = [], uvs = [], indices = [];
  const count = (steps + 1) * 4;
  const rings = sections.map(([y, width, depth, z = 0]) => {
    const r = Math.min(radius, width * .45, depth * .45);
    const ring = [];
    for (let corner = 0; corner < 4; corner++) {
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - r);
      const cz = (corner < 2 ? 1 : -1) * (depth / 2 - r);
      for (let i = 0; i <= steps; i++) {
        const angle = (corner + i / steps) * Math.PI / 2;
        ring.push([cx + Math.cos(angle) * r, y, z + cz + Math.sin(angle) * r]);
      }
    }
    return ring;
  });
  for (let h = 0; h < rings.length; h++) {
    const ring = rings[h];
    for (let i = 0; i < count; i++) {
      const a = h * count + i, b = h * count + (i + 1) % count;
      positions.push(...ring[i]);
      uvs.push(i / count, ring[i][1]);
      if (h < rings.length - 1) indices.push(a, a + count, b + count, a, b + count, b);
    }
  }
  for (const upper of [false, true]) {
    const ring = upper ? rings[rings.length - 1] : rings[0];
    const first = positions.length / 3;
    for (const [x,y,z] of ring) {
      positions.push(x,y,z);
      uvs.push(x,z);
    }
    for (let i = 1; i < count - 1; i++) {
      if (upper) indices.push(first, first + i + 1, first + i);
      else indices.push(first, first + i, first + i + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function builder(materials) {
  const groups = new Map();
  function part(key, geometry, tint, x = 0, y = 0, z = 0) {
    geometry.translate(x,y,z);
    const color = new THREE.Color(tint), count = geometry.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) color.toArray(colors, i * 3);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors,3));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(geometry);
  }
  function box(key, shade, x,y,z, w,h,d) {
    part(key, new THREE.BoxGeometry(w,h,d), shade, x,y,z);
  }
  function rounded(key, tint, x,y,z, w,h,d,r) {
    part(key, loft([[-h/2,w,d],[h/2,w,d]],r), tint,x,y,z);
  }
  function rod(key, tint, a, b, r, segments = 8) {
    const from = new THREE.Vector3(...a), to = new THREE.Vector3(...b);
    const direction = to.clone().sub(from);
    const g = new THREE.CylinderGeometry(r,r,direction.length(),segments);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
    const mid = from.lerp(to,.5);
    part(key,g,tint,mid.x,mid.y,mid.z);
  }
  function finish() {
    return Array.from(groups, ([key, parts]) => {
      const geometry = mergeGeometries(parts,false);
      for (const part of parts) part.dispose();
      if (!geometry) throw new Error('Cannot merge park furniture parts.');
      geometry.computeBoundingSphere();
      return {geometry, material:materials[key]};
    });
  }
  return {part,box,rounded,rod,finish};
}

// Local photo maps cover 1.4 m square. Preserve the scale and horizontal bond
// around the cabinet, independent of its width and the number of hotplates.
function cabinetBrick(width, height, depth) {
  const g = new THREE.BoxGeometry(width,height,depth);
  const {normal,position,uv} = g.attributes;
  for (let i = 0; i < uv.count; i++) {
    const x = position.getX(i), y = position.getY(i) + height / 2, z = position.getZ(i);
    const nx = normal.getX(i), nz = normal.getZ(i);
    const u = Math.abs(nx) > .5 ? width / 2 - nx * z : nz * x;
    uv.setXY(i, (u + width / 2) / 1.4, (Math.abs(normal.getY(i)) > .5 ? z : y) / 1.4);
  }
  return g;
}

function barbecue(materials, double, hasMasonryMap, concrete = false) {
  const m = builder(materials), w = double ? 2.04 : 1.32;
  m.rounded('finish',STONE,0,.025,0, w+.18,.05,1.04,.028);
  m.box('finish',GASKET,0,.077,0,w-.10,.054,.76);
  m.part('masonry',cabinetBrick(w-.075,.744,.80),hasMasonryMap ? 0xffffff : 0xb89980,0,.474,0);
  m.rounded('finish',GASKET,0,.853,0,w-.025,.030,.837,.021);
  const counter = loft([[.855,w-.024,.86],[.866,w,.88],[.897,w,.88],[.905,w-.014,.866]],.025);
  m.part(concrete ? 'finish' : 'steel',counter,concrete ? 0xa99f88 : STAINLESS);
  for (const x of double ? [-.49,.49] : [0]) {
    // Pressed, flat electric plates have a raised lip and a grease outlet.
    m.rounded('finish',RECESS,x,.908,0,.668,.012,.590,.026);
    m.part('steel',loft([[.910,.659,.581],[.925,.651,.573],[.930,.637,.559]],.025),EDGE,x);
    m.rounded('steel',0x85837c,x,.930,0,.587,.0015,.510,.019);
    m.rounded('finish',0x474840,x+.211,.9315,.199,.064,.0015,.026,.009);
    // Access hatch and push button align below the hotplate.
    m.rounded('finish',RECESS,x,.493,.402,.511,.453,.018,.006);
    m.box('steel',WELD,x,.493,.414,.490,.424,.010);
    m.box('steel',STAINLESS,x,.506,.421,.455,.375,.008);
    for (const dx of [-.18,.18]) for (const y of [.352,.650])
      m.rod('steel',0x6e716c,[x+dx,y,.422],[x+dx,y,.428],.010,6);
    for (let i=0; i<5; i++) m.box('finish',0x565857,x-.02,.390+i*.015,.426,.19,.004,.002);
    m.box('finish',PAINT,x,.752,.407,.248,.060,.012);
    m.rod('steel',EDGE,[x+.073,.752,.413],[x+.073,.752,.430],.021,12);
    m.rod('finish',0x4f6d55,[x+.073,.752,.431],[x+.073,.752,.436],.014,12);
    for (const [i,length] of [.082,.066,.074].entries()) m.box('finish',0xe0dfd0,x-.041,.766-i*.012,.415,length,.003,.002);
  }
  return m.finish();
}

function bowl(m, x,y,z,r) {
  // One continuous spun sheet from the underside, over the rolled rim, down
  // into the concave catch basin. The centre remains open above the waste outlet.
  const profile = [[.08,-.58],[.43,-.50],[.76,-.28],[.98,-.10],[1,.00],[.965,.025],[.92,-.045],[.72,-.22],[.42,-.38],[.12,-.44]];
  const g = new THREE.LatheGeometry(profile.map(([h,v])=>new THREE.Vector2(h*r,v*r)),24);
  m.part('steel',g,STAINLESS,x,y,z);
  m.rod('finish',RECESS,[x,y-r*.49,z],[x,y-r*.441,z],r*.123,12);
  for(const offset of [-1,0,1])
    m.box('steel',WELD,x+offset*r*.044,y-r*.438,z,r*.014,r*.012,r*.17);
}

function fountain(materials, refill, dogBowl) {
  const m=builder(materials);
  m.rounded('finish',STONE,0,.021,0,.77,.042,.80,.045);
  m.rounded('steel',WELD,0,.055,-.110,.38,.026,.31,.029);
  for (const x of [-.15,.15]) for (const z of [-.23,.014])
    m.rod('steel',STAINLESS,[x,.068,z],[x,.078,z],.013,6);
  if (refill) {
    m.part('steel',loft([[.067,.279,.216],[.117,.293,.230],[2.052,.293,.230],[2.090,.280,.220],[2.10,.25,.20]],.035),STAINLESS,0,0,-.113);
    // Direction-independent refill bays sit on both sides of the column.
    // The high-contrast wrap is original, with an unbranded water drop.
    for(const side of [-1,1]) {
      const faceZ = -.113 + side*.116;
      m.box('finish',0x2e7291,0,1.293,faceZ,.222,1.476,.005);
      const drop = new THREE.LatheGeometry([[0,-.074],[.044,-.050],[.052,-.020],[.040,.015],[0,.091]].map(([r,y])=>new THREE.Vector2(r,y)),12);
      drop.scale(1,1,.075);
      m.part('finish',drop,0xd7ebed,0,1.814,faceZ+side*.002);
      m.box('finish',0xadced4,0,1.640,faceZ+side*.003,.118,.009,.003);
      m.box('finish',0x8fb4bf,0,1.606,faceZ+side*.003,.076,.005,.003);
      const x = side*.177;
      m.rounded('steel',WELD,x,.855,-.109,.111,.029,.169,.014);
      m.rounded('finish',RECESS,x,.871,-.109,.082,.005,.122,.011);
      for(let i=0;i<4;i++) m.box('steel',WELD,x,.875,-.148+i*.024,.07,.004,.006);
      m.rounded('steel',EDGE,x,1.232,-.105,.124,.061,.154,.020);
      m.rod('finish',RECESS,[side*.195,1.183,-.105],[side*.195,1.208,-.105],.018,12);
      m.rod('steel',WELD,[side*.145,1.139,-.11],[side*.156,1.139,-.11],.024,12);
    }
  } else {
    // Sweep the front of the pedestal out to support the cantilevered basin.
    m.part('finish',loft([[.067,.24,.21,-.11],[.15,.217,.183,-.117],[.56,.183,.18,-.091],[.70,.19,.191,-.013],[.78,.198,.166,.020]],.055),PAINT);
    m.rounded('steel',WELD,0,.133,-.117,.222,.017,.19,.045);
  }
  bowl(m,0,.824,.089,.201);
  m.rod('steel',WELD,[0,.655,-.086],[0,.722,.085],.058,12);
  // Rubber mouthguard over the angled outlet, and a separate push plunger.
  m.rod('steel',STAINLESS,[.108,.798,.208],[.108,.886,.202],.031,12);
  m.rod('finish',GASKET,[.108,.883,.204],[.094,.912,.177],.031,12);
  m.rod('steel',EDGE,[.100,.903,.185],[.085,.925,.166],.016,10);
  m.rod('finish',RECESS,[.083,.928,.163],[.082,.930,.162],.009,10);
  m.rod('steel',STAINLESS,[-.145,.803,.179],[-.165,.811,.193],.021,12);
  if (dogBowl) {
    m.rod('steel',WELD,[-.05,.128,-.074],[-.17,.128,.095],.020,10);
    bowl(m,-.17,.162,.112,.129);
  }
  return m.finish();
}

// The supplied photo maps belong to the caller. Shared model resources belong
// to this factory, including the small original brushed-finish roughness map.
export function createParkAmenityModels({masonryMap=null,masonryNormalMap=null}={}) {
  const steelGrain = new Uint8Array(64*64*4);
  for (let y=0; y<64; y++) for(let x=0; x<64; x++) {
    const i=(64*y+x)*4, v=195+((Math.imul(y+23,1297)^Math.imul((x>>3)+13,1777)) & 47);
    steelGrain.set([v,v,v,255],i);
  }
  const grain = new THREE.DataTexture(steelGrain,64,64);
  grain.wrapS=grain.wrapT=THREE.RepeatWrapping;
  grain.magFilter=THREE.LinearFilter;
  grain.minFilter=THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps=true;grain.needsUpdate=true;
  const material=(name,options)=>new THREE.MeshStandardMaterial({name,vertexColors:true,...options});
  const materials = {
    steel:material('Brushed stainless and worn cooktops',{metalness:.45,roughness:.47,roughnessMap:grain}),
    finish:material('Powder coat, concrete pads and fittings',{metalness:.06,roughness:.73}),
    masonry:material('Weathered cabinet brick',{map:masonryMap,normalMap:masonryNormalMap,normalScale:new THREE.Vector2(.55,.55),roughness:.91}),
  };
  const templates = {
    bbqSingle:barbecue(materials,false,!!masonryMap), bbqDouble:barbecue(materials,true,!!masonryMap),
    bbqSingleConcrete:barbecue(materials,false,!!masonryMap,true), bbqDoubleConcrete:barbecue(materials,true,!!masonryMap,true),
    fountain:fountain(materials,false,false), fountainDog:fountain(materials,false,true),
    refill:fountain(materials,true,false), refillDog:fountain(materials,true,true),
  };
  let disposed=false;
  return {templates,dispose() {
    if(disposed)return;
    disposed=true;
    for(const batch of Object.values(templates).flat())batch.geometry.dispose();
    for(const material of Object.values(materials))material.dispose();
    grain.dispose();
  }};
}
