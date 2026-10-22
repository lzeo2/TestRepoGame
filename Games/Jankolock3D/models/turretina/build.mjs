// Original Turretina geometry, interpreted from the supplied concept plate.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries, mergeVertices } from '../../vendor/addons/BufferGeometryUtils.js';
import { exportModel, measureModel } from '../model-build.mjs';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const TAU = Math.PI * 2;
const V = a => new THREE.Vector3(...a);
const gaussian = (x, c, r) => Math.exp(-(((x - c) / r) ** 2));

// Indexed, UV-bearing patches: density follows curved silhouettes and cloth folds.
function patch(nu, nv, point, reverse = false) {
  nu = Math.max(3, Math.round(nu * .75)); nv = Math.max(2, Math.round(nv * .75));
  const p = [], uv = [], indices = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    p.push(...point(i / nu, j / nv)); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    indices.push(...(reverse ? [a, b, a + 1, a + 1, b, b + 1] : [a, a + 1, b, a + 1, b + 1, b]));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}
function profile(rows, y) {
  let k = 0;
  while (k < rows.length - 2 && rows[k + 1][0] < y) k++;
  const t = THREE.MathUtils.clamp((y - rows[k][0]) / (rows[k + 1][0] - rows[k][0]), 0, 1);
  return rows[k].map((_, c) => {
    const a = rows[Math.max(0, k - 1)][c], b = rows[k][c];
    const d = rows[Math.min(rows.length - 1, k + 2)][c], e = rows[k + 1][c];
    return .5 * ((2 * b) + (-a + e) * t + (2 * a - 5 * b + 4 * e - d) * t * t + (-a + 3 * b - 3 * e + d) * t ** 3);
  });
}
function loft(rows, nu = 64, nv = 48, folds = 0, phase = 0) {
  return patch(nu, nv, (u, v) => {
    const y = THREE.MathUtils.lerp(rows[0][0], rows.at(-1)[0], v);
    const [, rx, rz, cx = 0, cz = 0] = profile(rows, y), a = u * TAU;
    const crease = folds * Math.sin(v * 48 + 2.6 * Math.sin(a * 3 + phase)) * Math.sin(Math.PI * v) ** 2;
    return [cx + (rx + crease) * Math.sin(a), y, cz + (rz + crease * .65) * Math.cos(a)];
  });
}

export function buildModel() {
  const root = new THREE.Group(); root.name = 'Turretina';
  const materials = {};
  for (const [name, color, roughness, metalness] of [
    ['skin', 0xc69071, .77, 0], ['lips', 0x925348, .8, 0],
    ['hair', 0x211b18, .91, 0], ['eye', 0xd8cbb7, .36, 0],
    ['jacket', 0x35373a, .95, 0], ['cream', 0xd6c6a2, .67, .25],
    ['leather', 0x563124, .9, 0], ['stitch', 0xa48553, .95, 0],
    ['brass', 0xa8803d, .38, .78], ['steel', 0x30383b, .43, .82],
    ['copper', 0x9f5733, .4, .8], ['canvas', 0x77705a, .98, 0],
    ['ochre', 0xad762a, .5, .48], ['glass', 0x677b7c, .17, .48],
  ]) materials[name] = new THREE.MeshStandardMaterial({ name, color, roughness, metalness });
  const groups = new Map();
  function pivot(name, position) {
    const group = new THREE.Group(); group.name = name; group.position.fromArray(position);
    root.add(group); groups.set(name, { group, bins: new Map() }); return name;
  }
  const torso = pivot('torso', [0, 1.08, 0]);
  const head = pivot('head', [0, 1.6, 0]);
  const left = pivot('arm-left', [.235, 1.47, 0]);
  const right = pivot('arm-right', [-.235, 1.47, 0]);
  const legL = pivot('leg-left', [.105, .99, 0]);
  const legR = pivot('leg-right', [-.105, .99, 0]);
  const pack = pivot('cape', [0, 1.47, .12]);
  function add(part, mat, geometry, pos = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
    const matrix = new THREE.Matrix4().compose(V(pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), V(scale));
    geometry.applyMatrix4(matrix);
    // Extruded fittings have duplicate corners; weld only identical normal/UV vertices.
    if (!geometry.index) geometry = mergeVertices(geometry);
    const bin = groups.get(part).bins;
    if (!bin.has(mat)) bin.set(mat, []);
    bin.get(mat).push(geometry);
  }
  function ell(part, mat, pos, size, segments = 40, rings = 24, rotation) {
    add(part, mat, new THREE.SphereGeometry(1, Math.max(8, Math.round(segments * .8)), Math.max(6, Math.round(rings * .8))), pos, size, rotation);
  }
  function tube(part, mat, points, radius, steps = 24, sides = 8, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(V), closed, 'centripetal');
    add(part, mat, new THREE.TubeGeometry(curve, Math.max(3, Math.round(steps * .8)), radius, Math.max(5, Math.round(sides * .8)), closed));
  }
  function rod(part, mat, a, b, r, r2 = r, sides = 20) {
    const delta = V(b).sub(V(a));
    const g = new THREE.CylinderGeometry(r2, r, delta.length(), sides, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    add(part, mat, g, V(a).add(V(b)).multiplyScalar(.5).toArray());
  }
  function rim(part, mat, center, rx, ry, radius = .003, steps = 48) {
    const pts = Array.from({ length: 16 }, (_, i) => [center[0] + rx * Math.cos(i * TAU / 16), center[1] + ry * Math.sin(i * TAU / 16), center[2]]);
    tube(part, mat, pts, radius, steps, 8, true);
  }
  function bevel(part, mat, pos, size, rotation = [0, 0, 0], radius = .006) {
    const [w, h, d] = size, shape = new THREE.Shape();
    const r = Math.min(radius, w / 4, h / 4, d / 4);
    shape.moveTo(-w / 2 + r, -h / 2); shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, steps: 1, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -d / 2 + r); add(part, mat, g, pos, [1, 1, 1], rotation);
  }
  function buckle(part, x, y, z, w = .035, h = .045) {
    tube(part, 'brass', [[x-w/2,y-h/2,z],[x+w/2,y-h/2,z],[x+w/2,y+h/2,z],[x-w/2,y+h/2,z]], .0035, 24, 8, true);
    rod(part, 'brass', [x-w/2,y,z], [x+w/2,y,z], .0025);
  }
  function rivet(part, pos, radius = .004) { ell(part, 'brass', pos, [radius, radius, radius * .45], 12, 8); }

  // Tailored jacket, waist suppression, shoulder line, continuous sculpted fabric folds.
  add(torso, 'jacket', loft([
    [.99,.139,.092,0,.012],[1.06,.158,.101,0,.008],[1.16,.126,.086,0,0],
    [1.28,.145,.098,0,0],[1.39,.179,.112,0,.007],[1.47,.207,.093,0,.014],
    [1.51,.159,.083,0,.016],[1.55,.064,.059,0,.01],
  ], 88, 72, .0038));
  add(torso, 'skin', loft([[1.51,.052,.048,0,.012],[1.59,.045,.043,0,.009],[1.67,.051,.048,0,.006]], 48, 22));
  // The cream cuirass is a curved shell, not a cuboid or a pair of spheres.
  add(torso, 'cream', patch(72, 56, (u,v) => {
    const y = 1.19 + v*.255, x = (u-.5) * (v<.7 ? .285 + v*.03 : .31-(v-.7)*.2);
    const z = -.105 - .032*Math.sin(Math.PI*v) - .022*(1-(x/.18)**2);
    return [x,y,z];
  }, true));
  for (const side of [-1,1]) {
    tube(torso,'brass',[[side*.143,1.19,-.119],[side*.152,1.29,-.139],[side*.146,1.39,-.137],[side*.12,1.445,-.123]],.003,32);
    tube(torso,'leather',[[side*.11,1.2,-.142],[side*.15,1.34,-.153],[side*.145,1.49,-.085],[side*.13,1.51,.05],[side*.13,1.36,.14]],.012,32,10);
    for (let i=0;i<4;i++) rivet(torso,[side*(.12+i*.006),1.215+i*.067,-.148]);
    // Folded jacket lapels and cream shirt collar.
    add(torso,'jacket',patch(16,18,(u,v)=>[side*(.055+u*.065+v*.023),1.53-v*.16,-.059-u*.035-v*.023],side<0));
    add(torso,'cream',patch(12,14,(u,v)=>[side*(.039+u*.025+v*.018),1.58-v*.14,-.041-u*.025-v*.025],side<0));
    buckle(torso,side*.136,1.433,-.143,.028,.037);
  }
  tube(torso,'leather',[[-.03,1.55,-.055],[0,1.49,-.085],[.024,1.53,-.06]],.012,18,10);

  // Anatomical head: jaw taper, cheeks, eye sockets, brow, bridge, tip and chin in one surface.
  const headRows = [[1.625,.028,.039,0,-.012],[1.646,.057,.058,0,-.003],[1.68,.073,.076,0,.006],
    [1.73,.085,.084,0,.006],[1.78,.083,.087,0,.009],[1.83,.081,.083,0,.013],
    [1.87,.067,.068,0,.016],[1.895,.018,.027,0,.015]];
  add(head,'skin',patch(112,88,(u,v)=>{
    const y=1.625+v*.27, [,rx,rz,,cz]=profile(headRows,y), a=u*TAU;
    const x=rx*Math.sin(a); let z=cz+rz*Math.cos(a);
    const front=Math.max(0,-Math.cos(a))**10;
    const nose=.048*gaussian(x,0,.018)*gaussian(y,1.738,.018)+.025*gaussian(x,0,.014)*gaussian(y,1.768,.04);
    const cheek=.013*(gaussian(x,-.05,.025)+gaussian(x,.05,.025))*gaussian(y,1.733,.025);
    const sockets=.014*(gaussian(x,-.036,.023)+gaussian(x,.036,.023))*gaussian(y,1.771,.013);
    const brow=.009*(gaussian(x,-.037,.027)+gaussian(x,.037,.027))*gaussian(y,1.787,.011);
    const chin=.012*gaussian(x,0,.03)*gaussian(y,1.654,.018);
    z+=front*(sockets-nose-cheek-brow-chin);
    return [x,y,z];
  }));
  for(const side of [-1,1]) {
    // Pinna, recessed concha, helix and tragus, not featureless side disks.
    ell(head,'skin',[side*.084,1.751,.008],[.018,.029,.011],32,24,[0,side*.25,side*.12]);
    ell(head,'lips',[side*.09,1.752,-.001],[.008,.018,.006],24,16);
    tube(head,'skin',[[side*.086,1.726,-.001],[side*.096,1.736,-.005],[side*.099,1.763,0],[side*.087,1.776,0],[side*.083,1.758,-.004]],.004,28,8);
    ell(head,'skin',[side*.081,1.744,-.007],[.005,.008,.005],16,12);
    // Modest almond eyes with real upper/lower lids and eyebrows.
    ell(head,'eye',[side*.034,1.768,-.076],[.021,.008,.007],32,20);
    ell(head,'glass',[side*.035,1.768,-.0825],[.0064,.0065,.0017],24,16);
    ell(head,'hair',[side*.035,1.768,-.084],[.0028,.0035,.001],16,12);
    const eyeX=side*.034;
    tube(head,'skin',[[eyeX-.021,1.767,-.076],[eyeX-.01,1.775,-.082],[eyeX+.009,1.776,-.082],[eyeX+.021,1.769,-.075]],.0025,28,8);
    tube(head,'skin',[[eyeX-.021,1.767,-.076],[eyeX,1.761,-.082],[eyeX+.021,1.769,-.075]],.002,24,8);
    tube(head,'hair',[[eyeX-.021,1.786,-.077],[eyeX,1.793,-.086],[eyeX+.019,1.787,-.077]],.003,24,8);
    ell(head,'lips',[side*.012,1.728,-.119],[.005,.0023,.003],16,10);
  }
  tube(head,'lips',[[-.025,1.697,-.077],[-.012,1.701,-.085],[0,1.698,-.09],[.011,1.701,-.085],[.024,1.697,-.077]],.0031,36,10);
  tube(head,'lips',[[-.024,1.696,-.078],[0,1.692,-.088],[.024,1.696,-.078]],.0035,32,10);
  // Hair cap has a face opening; the wavy locks/bun carry the silhouette.
  add(head,'hair',patch(64,32,(u,v)=>{
    const a=u*TAU, front=Math.max(0,-Math.cos(a)), low=1.689+front*.129;
    const y=low+v*(1.9-low), s=Math.sqrt(Math.max(.015,1-((y-1.79)/.125)**2));
    return [(.089+.002*Math.sin(a*17+v*7))*s*Math.sin(a),y,.016+.095*s*Math.cos(a)];
  }));
  ell(head,'hair',[.025,1.757,.106],[.071,.063,.049],48,32);
  for(let i=0;i<23;i++) {
    const a=i*TAU/23, x=.025+.055*Math.sin(a), y=1.757+.048*Math.cos(a);
    tube(head,'hair',[[x,y,.117],[x+.014*Math.cos(a),y+.012,.151],[x-.022,y-.024,.151],[.025,1.752,.112]],.0045,28,7);
  }
  for(const side of [-1,1]) for(let i=0;i<7;i++) {
    const x=side*(.049+i*.006);
    tube(head,'hair',[[x,1.866,-.051+i*.005],[side*(.067+i*.003),1.815,-.069+i*.008],[side*(.079+i*.002),1.77,-.052+i*.008],[side*(.068+i*.004),1.71,-.017+i*.009]],.0028,36,7);
  }
  // Ochre hard hat shell, rolled rim, panel ribs, strap and parked goggles.
  add(head,'ochre',new THREE.SphereGeometry(1,54,24,0,TAU,0,Math.PI/2),[0,1.847,.014],[.102,.115,.107]);
  const brim=Array.from({length:24},(_,i)=>[.114*Math.sin(i*TAU/24),1.848,.012+.121*Math.cos(i*TAU/24)]);
  tube(head,'ochre',brim,.007,72,10,true);
  for(const a of [-.75,.75,Math.PI]) {
    const pts=Array.from({length:12},(_,i)=>{const t=i/11*Math.PI/2;return [.104*Math.cos(t)*Math.sin(a),1.848+.116*Math.sin(t),.014+.109*Math.cos(t)*Math.cos(a)];});
    tube(head,'brass',pts,.0027,28,8);
  }
  tube(head,'leather',Array.from({length:24},(_,i)=>[.102*Math.sin(i*TAU/24),1.873,.014+.106*Math.cos(i*TAU/24)]),.008,64,8,true);
  for(const side of [-1,1]) {
    ell(head,'glass',[side*.045,1.897,-.089],[.033,.027,.009],40,24,[.25,side*.16,0]);
    rim(head,'brass',[side*.045,1.897,-.099],.034,.028,.004,48);
    rim(head,'steel',[side*.045,1.897,-.101],.027,.022,.0018,40);
    rivet(head,[side*.086,1.872,-.06],.005);
  }
  tube(head,'brass',[[-.012,1.898,-.102],[0,1.904,-.105],[.012,1.898,-.102]],.003,16,8);

  // Trouser legs and lace-up boots, stance slightly asymmetrical.
  for(const [part,s] of [[legL,1],[legR,-1]]) {
    const x=s*.118, z=s===1?.025:0;
    add(part,'jacket',loft([[.28,.061,.062,x,z],[.4,.069,.068,x,z],[.55,.076,.072,x-s*.008,z],
      [.65,.078,.076,x-s*.012,z],[.79,.09,.083,x-s*.014,z],[.94,.102,.091,x-s*.025,z],[1.02,.091,.088,x-s*.026,z]],64,68,.0055,s));
    // Raised outer seam follows the cut rather than a painted stripe.
    tube(part,'stitch',[[x+s*.064,.34,z],[x+s*.074,.56,z],[x+s*.087,.77,z],[x+s*.08,.97,z]],.0015,40,6);
    add(part,'cream',patch(40,36,(u,v)=>{
      const a=(u-.5)*2.5, t=v*Math.PI;
      return [x+.074*Math.sin(a)*(.7+.3*Math.sin(t)),.505+v*.16,z-.063-.03*Math.cos(a)*Math.sin(t)];
    }, true));
    tube(part,'leather',[[x-.066,.53,z-.047],[x-.075,.59,z-.057],[x-.059,.665,z-.061],[x+.05,.665,z-.061],[x+.074,.59,z-.057],[x+.06,.52,z-.047]],.006,48,8);
    for(const yy of [.54,.64]) for(const ss of [-1,1]) rivet(part,[x+ss*.055,yy,z-.075]);
    // Toe/instep and tapered shaft, with wrinkles at the ankle.
    add(part,'leather',loft([[.035,.063,.126,x,z-.04],[.063,.068,.131,x,z-.044],[.095,.063,.118,x,z-.038],
      [.13,.055,.089,x,z-.015],[.18,.052,.063,x,z],[.25,.057,.062,x,z],[.34,.065,.065,x,z]],64,48,.0028,s));
    add(part,'steel',loft([[0,.063,.126,x,z-.04],[.016,.069,.133,x,z-.04],[.033,.068,.133,x,z-.04]],48,8));
    // Sculpted toe cap seam and leather welt.
    tube(part,'stitch',[[x-.06,.067,z-.117],[x-.04,.095,z-.149],[x,.103,z-.159],[x+.04,.095,z-.149],[x+.06,.067,z-.117]],.002,36,8);
    for(let i=0;i<8;i++) {
      const y=.105+i*.026, front=z-(i<2?.104-i*.019:.064);
      for(const side of [-1,1]) rim(part,'brass',[x+side*.022,y,front],.004,.004,.0012,12);
      tube(part,'stitch',[[x-.022,y,front-.002],[x+.022,y+.021,front-.006]],.0018,8,6);
      tube(part,'stitch',[[x+.022,y,front-.002],[x-.022,y+.021,front-.006]],.0018,8,6);
    }
    for(const yy of [.16,.313]) {
      add(part,'leather',loft([[yy,.063,.068,x,z],[yy+.024,.065,.069,x,z]],40,5));
      buckle(part,x+s*.049,yy+.012,z-.047,.025,.027);
    }
    for(let i=0;i<5;i++) for(const ss of [-1,1]) bevel(part,'steel',[x+ss*.064,.017,z-.13+i*.047],[.012,.018,.023]);
  }

  // Split leather apron: shaped panels, folded hem, seams, rivets and tools.
  for(const s of [-1,1]) {
    const apronPoint=(u,v)=>{const x=s*(.008+u*(.142+.018*v));return [x,1.135-v*(.285+.018*Math.sin(u*Math.PI)), -.106-.021*Math.sin(u*Math.PI)-.013*Math.sin(v*Math.PI)+.008*Math.sin(u*12+v*7)*v];};
    add(torso,'leather',patch(42,44,apronPoint,s<0));
    for(const u of [.04,.95]) tube(torso,'stitch',Array.from({length:12},(_,i)=>apronPoint(u,i/11).map((q,j)=>q+(j===2?-.002:0))),.0013,32,6);
    tube(torso,'stitch',Array.from({length:12},(_,i)=>apronPoint(i/11,.96).map((q,j)=>q+(j===2?-.002:0))),.0015,32,6);
  }
  add(torso,'leather',loft([[1.105,.146,.108,0,0],[1.16,.143,.105,0,0]],64,8));
  buckle(torso,0,1.134,-.114,.061,.047);
  for(let i=0;i<7;i++) rivet(torso,[.045+i*.013,1.135,-.112+(.045+i*.013)**2]);
  function pouch(part,x,y,z,w,h,mat='leather',back=false) {
    const sign=back?1:-1;
    add(part,mat,loft([[y-h/2,w*.36,.021,x,z],[y-h*.38,w*.5,.031,x,z],[y+h*.36,w*.49,.028,x,z],[y+h/2,w*.43,.018,x,z]],36,24,.001));
    add(part,mat,patch(24,14,(u,v)=>[x+(u-.5)*w*.92,y+h*.47-v*h*.32,z+sign*(.029+.008*Math.sin(v*Math.PI))],back));
    tube(part,'stitch',[[x-w*.4,y+h*.36,z+sign*.033],[x-w*.4,y-h*.36,z+sign*.028],[x+w*.4,y-h*.36,z+sign*.028],[x+w*.4,y+h*.36,z+sign*.033]],.0014,32,6);
    buckle(part,x,y+h*.2,z+sign*.041,.019,.025);
  }
  pouch(torso,-.175,1.025,-.045,.066,.14);
  pouch(torso,.121,.965,-.145,.066,.14);
  pouch(torso,-.171,.855,-.039,.053,.112);
  for(let i=0;i<4;i++) {
    const x=.075+i*.022;
    rod(torso,'brass',[x,.88,-.178],[x,1.06+i%2*.018,-.178],.005);
    rod(torso,'leather',[x,.99,-.178],[x,1.045,-.178],.008);
    bevel(torso,'steel',[x,1.075+i%2*.018,-.178],[.014,.018,.008]);
  }

  // Sleeves, bent elbows, bare forearms, fitted fingerless gloves and individual fingers.
  for(const [part,s] of [[left,1],[right,-1]]) {
    const bent=s<0, elbow=[s*.285,1.245,-.005];
    const wrist=bent?[-.355,1.39,-.192]:[.301,1.04,-.028];
    add(part,'jacket',loft([[1.227,.056,.057,s*.282,-.005],[1.27,.071,.066,s*.277,.006],
      [1.37,.074,.075,s*.253,.012],[1.46,.084,.079,s*.217,.014],[1.49,.052,.053,s*.205,.014]],56,48,.004,s));
    // Compression folds across the elbow, rolled sleeve lip.
    ell(part,'jacket',elbow,[.06,.055,.059],36,24);
    tube(part,'stitch',[[s*.272,1.24,-.063],[s*.307,1.285,-.043],[s*.327,1.35,.006]],.0016,24,6);
    rod(part,'jacket',[s*.285,1.225,-.005],[s*.285,1.253,-.005],.061,.064,40);
    const mid=V(elbow).lerp(V(wrist),.52).toArray();
    const forearm=new THREE.SphereGeometry(1,40,30), direction=V(wrist).sub(V(elbow));
    forearm.scale(.045,direction.length()*.57,.043);
    forearm.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize()));
    add(part,'skin',forearm,mid);
    const hand=V(wrist).add(direction.clone().normalize().multiplyScalar(.066));
    const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());
    const local=(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(q).add(hand).toArray();
    const palm=new THREE.SphereGeometry(1,36,24);palm.scale(.034,.045,.022);palm.applyQuaternion(q);
    add(part,'leather',palm,hand.toArray());
    rod(part,'leather',V(wrist).sub(direction.clone().normalize().multiplyScalar(.025)).toArray(),V(wrist).add(direction.clone().normalize().multiplyScalar(.022)).toArray(),.043,.04,32);
    // Wrist plate plus guard studs.
    ell(part,'cream',V(wrist).add(new THREE.Vector3(0,0,-.037)).toArray(),[.028,.048,.009],32,20);
    for(let i=0;i<4;i++) {
      const xx=(i-1.5)*.015, length=[.042,.052,.049,.039][i];
      tube(part,'skin',[local(xx,.027,-.005),local(xx,.052,-.008),local(xx,.034+length,-.022),local(xx,.032+length,-.034)],.007,20,10);
      tube(part,'leather',[local(xx,.012,-.004),local(xx,.029,-.009),local(xx,.044,-.011)],.0085,12,8);
      ell(part,'skin',local(xx,.052,-.012),[.008,.008,.008],16,10);
      tube(part,'stitch',[local(xx-.004,.025,-.021),local(xx+.004,.025,-.021)],.0012,4,6);
    }
    tube(part,'skin',[local(-.027,-.005,0),local(-.044,.014,-.013),local(-.038,.04,-.031)],.01,24,10);
    for(const yy of [-.025,.025]) rivet(part,local(.022,yy,-.023));
  }

  // Rucksack with rounded packed volume, seams, shoulder straps, flap and bedroll.
  add(pack,'canvas',loft([[1.015,.114,.047,0,.181],[1.06,.145,.082,0,.19],[1.2,.149,.085,0,.19],
    [1.37,.141,.078,0,.19],[1.48,.113,.053,0,.183]],72,56,.003));
  add(pack,'canvas',patch(40,30,(u,v)=>[(u-.5)*(.27-.02*v),1.47-v*.16,.245+.037*Math.sin(v*Math.PI/2)-.035*(2*u-1)**2],true));
  for(const s of [-1,1]) {
    tube(pack,'leather',[[s*.095,1.02,.259],[s*.108,1.23,.282],[s*.094,1.47,.235],[s*.12,1.51,.06],[s*.17,1.39,-.055],[s*.15,1.22,-.08]],.01,48,10);
    tube(pack,'stitch',[[s*.13,1.06,.247],[s*.143,1.2,.255],[s*.135,1.37,.247],[s*.11,1.46,.235]],.0018,40,6);
    pouch(pack,s*.073,1.16,.284,.108,.132,'canvas',true);
    buckle(pack,s*.095,1.34,.284,.032,.042);
    buckle(pack,s*.095,1.095,.29,.032,.042);
  }
  const roll=new THREE.CylinderGeometry(.056,.056,.29,48,6);roll.rotateZ(Math.PI/2);
  add(pack,'canvas',roll,[0,1.49,.217]);
  for(const s of [-1,1]) {
    const pts=[];for(let i=0;i<100;i++){const a=i/99*Math.PI*7,r=.005+.045*i/99;pts.push([s*.147,1.49+r*Math.cos(a),.217+r*Math.sin(a)]);}
    tube(pack,'stitch',pts,.0028,100,7);
    tube(pack,'leather',Array.from({length:20},(_,i)=>[s*.09,1.49+.058*Math.cos(i*TAU/20),.217+.058*Math.sin(i*TAU/20)]),.009,40,8,true);
  }
  // Folded brass tripod, pointed steel feet, clamps, hinge and cable spools.
  for(let i=0;i<3;i++) {
    const x=.185+(i-1)*.019,z=.196+(i===1?.025:0);
    rod(pack,'brass',[x,.98,z],[x,1.52,z],.008,.01,24);
    rod(pack,'steel',[x,.87,z],[x,1.05,z],.006,.007,20);
    add(pack,'steel',new THREE.ConeGeometry(.009,.035,20),[x,.857,z],[1,1,1],[Math.PI,0,0]);
    for(const y of [1.02,1.28,1.48]) rod(pack,'brass',[x,y,z],[x,y+.018,z],.014,.014,24);
  }
  ell(pack,'brass',[.184,1.54,.2],[.035,.025,.025],32,20);
  for(const y of [1.17,1.39]) {
    rod(pack,'copper',[-.19,y-.054,.2],[-.19,y+.054,.2],.034,.034,32);
    for(const yy of [y-.06,y+.06]) rod(pack,'brass',[-.19,yy-.004,.2],[-.19,yy+.004,.2],.044,.044,32);
    const pts=Array.from({length:380},(_,i)=>{const a=i/379*TAU*19;return [-.19+.035*Math.sin(a),y-.05+i/379*.1,.2+.035*Math.cos(a)];});
    tube(pack,'copper',pts,.002,380,6);
  }

  // Stapler carbine: bevelled receiver, exposed staple magazine, copper return spring,
  // twin rails, fasteners, grip and trigger guard. It is parented to the bent arm.
  const gun=right;
  const gx=-.392, gz=-.27;
  bevel(gun,'steel',[gx,1.55,gz],[.058,.43,.061],[0,0,-.08]);
  bevel(gun,'brass',[gx-.012,1.36,gz],[.077,.12,.073],[0,0,-.08]);
  bevel(gun,'brass',[gx+.014,1.79,gz],[.084,.073,.078],[0,0,-.08]);
  bevel(gun,'leather',[gx+.047,1.435,gz+.009],[.04,.13,.044],[0,0,.34]);
  for(const dx of [-.027,.027]) rod(gun,'brass',[gx+dx,1.43,gz-.041],[gx+dx,1.77,gz-.041],.006);
  bevel(gun,'steel',[gx,1.6,gz-.042],[.032,.266,.014]);
  // Individually shaped staple crowns rather than a painted magazine texture.
  for(let i=0;i<27;i++) {
    const y=1.474+i*.009;
    tube(gun,'copper',[[gx-.014,y,gz-.05],[gx-.014,y+.003,gz-.058],[gx+.014,y+.003,gz-.058],[gx+.014,y,gz-.05]],.0018,8,6);
  }
  rod(gun,'steel',[gx-.058,1.43,gz],[gx-.058,1.68,gz],.009);
  const spring=Array.from({length:480},(_,i)=>{const a=i/479*TAU*24;return [gx-.058+.016*Math.sin(a),1.445+i/479*.219,gz+.016*Math.cos(a)];});
  tube(gun,'copper',spring,.0027,480,7);
  for(const y of [1.43,1.68]) rod(gun,'brass',[gx-.058,y-.012,gz],[gx-.058,y+.012,gz],.022);
  tube(gun,'brass',[[gx+.022,1.5,gz-.004],[gx+.081,1.496,gz-.004],[gx+.08,1.421,gz-.004],[gx+.02,1.418,gz-.004]],.005,32,10,true);
  tube(gun,'steel',[[gx+.028,1.494,gz-.008],[gx+.048,1.465,gz-.008],[gx+.043,1.45,gz-.008]],.004,18,8);
  for(const y of [1.32,1.38,1.45,1.73,1.79,1.815]) for(const dx of [-.025,.025]) {
    rivet(gun,[gx+dx,y,gz-.041],.0045);
    tube(gun,'steel',[[gx+dx-.002,y,gz-.044],[gx+dx+.002,y,gz-.044]],.0008,3,5);
  }
  bevel(gun,'steel',[gx+.014,1.834,gz],[.047,.018,.033]);
  bevel(gun,'brass',[gx+.014,1.85,gz],[.054,.02,.039]);

  // Keep articulation groups while reducing hundreds of fittings to one drawable/material.
  for(const {group,bins} of groups.values()) for(const [mat,geometries] of bins) {
    const g=mergeGeometries(geometries,false); assert(g,`Cannot merge ${group.name}/${mat}`);
    g.translate(-group.position.x,-group.position.y,-group.position.z);
    const mesh=new THREE.Mesh(g,materials[mat]);mesh.name=`${group.name}-${mat}`;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
  }
  root.userData={author:'Original in-house procedural geometry',reference:'docs/jank3d-design/hero-concepts/turretina.png at 79dc4c8',forward:'-Z',units:'metres',animation:'Rigid top-level pivots; no skin weights or facial rig'};
  return root;
}

// Importing buildModel never writes an asset. The direct CLI is also the regression check.
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const root=buildModel(), m=measureModel(root);
  assert(m.meshes<=64,`Drawable budget ${m.meshes}`);
  assert(Math.abs(m.bounds.min[1])<.001,'Feet must be grounded');
  assert(m.bounds.max[1]>=1.8 && m.bounds.max[1]<=2.1,'Adult scale');
  assert.deepEqual(root.children.map(g=>g.name),['torso','head','arm-left','arm-right','leg-left','leg-right','cape']);
  for(const g of root.children) for(const mesh of g.children) {
    assert(mesh.geometry.getAttribute('uv').count===mesh.geometry.getAttribute('position').count);
    assert(!mesh.material.map && mesh.material.isMeshStandardMaterial);
  }
  await exportModel(root,new URL('./model.glb',import.meta.url),{label:'Turretina: original human engineer procedural concept interpretation'});
}
