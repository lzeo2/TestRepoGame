// Original concept-led adhesive specialist. Metres, Y-up, facing -Z.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries } from '../../vendor/addons/BufferGeometryUtils.js';
import { exportModel, measureModel } from '../model-build.mjs';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const TAU = Math.PI * 2;
const vec = p => new THREE.Vector3(...p);
const mix = (a, b, t) => a + (b - a) * t;
const gauss = (x, c, w) => Math.exp(-(((x - c) / w) ** 2));

// Indexed UV grids keep the curved cloth/face surfaces compact, without hidden subdivision.
function surface(nu, nv, point) {
  const positions = [], uv = [], indices = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    positions.push(...point(i / nu, j / nv)); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    indices.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

function profileAt(rows, t) {
  const y = mix(rows[0][0], rows.at(-1)[0], t);
  let k = 0; while (k < rows.length - 2 && rows[k + 1][0] < y) k++;
  const a = rows[k], b = rows[k + 1], s = (y - a[0]) / (b[0] - a[0]);
  return [y, ...a.slice(1).map((v, i) => mix(v, b[i + 1], s))];
}

// Rows: height, lateral radius, depth radius, lateral centre, depth centre.
function garment(rows, nu, nv, folds = .008, start = 0, arc = TAU) {
  return surface(nu, nv, (u, v) => {
    const [y, rx, rz, cx = 0, cz = 0] = profileAt(rows, v), a = start + u * arc;
    const vertical = Math.sin(a * 13 + .8 * Math.sin(v * 9)) + .4 * Math.sin(a * 23 - v * 5);
    const compression = Math.sin(v * 39 + a * 3) * (.25 + .75 * Math.sin(a * 2) ** 2);
    const f = folds * (vertical * (.45 + .55 * (1 - v)) + compression * Math.sin(Math.PI * v));
    return [cx + Math.sin(a) * (rx + f), y + folds * .35 * Math.sin(a * 7) * (1 - v), cz - Math.cos(a) * (rz + f)];
  });
}

export function buildModel() {
  const root = new THREE.Group(); root.name = 'gooey-adhesive-specialist';
  const mat = {};
  const material = (key, color, roughness, metalness, extra = {}) => {
    mat[key] = new THREE.MeshStandardMaterial({ name: key, color, roughness, metalness, ...extra });
  };
  material('ivory-rubberized-coat', '#d5c6a3', .72, .03, { side: THREE.DoubleSide });
  material('ivory-protective-plate', '#e3d3af', .43, .16, { side: THREE.DoubleSide });
  material('ochre-enamel', '#b48b45', .44, .30);
  material('machined-brass', '#a77b35', .30, .78);
  material('recessed-bronze', '#584229', .48, .67);
  material('brown-leather-straps-boots', '#35291f', .69, .02);
  material('ribbed-rubber', '#24251f', .82, 0);
  material('weathered-skin-face', '#b47c57', .80, 0);
  material('skin-lip-ear', '#87543f', .81, 0);
  material('hair-brows-moustache', '#403b32', .94, 0);
  material('eye-sclera', '#d1c7ab', .36, 0);
  material('eye-iris', '#494b3b', .30, 0);
  material('visor-clear', '#d7dfd9', .16, .08, { transparent: true, opacity: .10, depthWrite: false, side: THREE.DoubleSide });
  const bins = new Map();
  function pivot(name, xyz) {
    const p = new THREE.Group(); p.name = name; p.position.set(...xyz); root.add(p); bins.set(p, new Map()); return p;
  }
  const torso = pivot('torso', [0, 1.12, 0]);
  const head = pivot('head', [0, 1.65, 0]);
  const cape = pivot('cape', [0, 1.1, .04]);
  const arms = [-1, 1].map(s => pivot(s < 0 ? 'arm-right' : 'arm-left', [s * .29, 1.49, 0]));
  const legs = [-1, 1].map(s => pivot(s < 0 ? 'leg-right' : 'leg-left', [s * .14, .93, 0]));
  function put(p, key, geometry) {
    geometry.translate(-p.position.x, -p.position.y, -p.position.z);
    const byMaterial = bins.get(p); if (!byMaterial.has(key)) byMaterial.set(key, []);
    byMaterial.get(key).push(geometry);
  }
  function ell(p, key, xyz, scale, segments = 32, rings = 20, rotation = [0, 0, 0]) {
    const small = Math.max(...scale) < .035;
    const g = new THREE.SphereGeometry(1, Math.min(segments, small ? 16 : 24), Math.min(rings, small ? 12 : 16));
    g.applyMatrix4(new THREE.Matrix4().compose(vec(xyz), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), vec(scale)));
    put(p, key, g);
  }
  function rod(p, key, a, b, radius, topRadius = radius, radial = 24) {
    const delta = vec(b).sub(vec(a));
    const g = new THREE.CylinderGeometry(topRadius, radius, delta.length(), radial, 1);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
    g.translate(...vec(a).add(vec(b)).multiplyScalar(.5).toArray()); put(p, key, g);
  }
  function pipe(p, key, points, radius, steps = 48, radial = 10, ribs = 0) {
    const curve = new THREE.CatmullRomCurve3(points.map(vec));
    steps = Math.max(8, Math.round(steps * .75));
    if (radius < .009) radial = Math.min(radial, 8);
    const g = new THREE.TubeGeometry(curve, steps, radius, radial, false);
    if (ribs) {
      const pos = g.attributes.position;
      for (let i = 0; i <= steps; i++) {
        const centre = curve.getPointAt(i / steps), factor = 1 + .17 * Math.cos(i / steps * TAU * ribs);
        for (let j = 0; j <= radial; j++) {
          const n = i * (radial + 1) + j;
          const q = new THREE.Vector3().fromBufferAttribute(pos, n).sub(centre).multiplyScalar(factor).add(centre);
          pos.setXYZ(n, q.x, q.y, q.z);
        }
      }
      g.computeVertexNormals();
    }
    put(p, key, g);
  }
  function ring(p, key, xyz, radius, tube, rotation = [0, 0, 0], segments = 48) {
    const g = new THREE.TorusGeometry(radius, tube, 8, Math.min(segments, 36));
    g.rotateX(rotation[0]); g.rotateY(rotation[1]); g.rotateZ(rotation[2]); g.translate(...xyz); put(p, key, g);
  }
  function buckle(p, xyz, width = .055, height = .07) {
    const [x, y, z] = xyz, r = .008;
    pipe(p, 'machined-brass', [[x - width / 2, y, z], [x - width / 2, y + height / 2 - r, z], [x, y + height / 2, z], [x + width / 2, y + height / 2 - r, z], [x + width / 2, y - height / 2 + r, z], [x, y - height / 2, z], [x - width / 2, y - height / 2 + r, z], [x - width / 2, y, z]], .005, 40, 8);
    rod(p, 'machined-brass', [x, y - height / 2, z - .004], [x, y + height / 2, z - .004], .0035, .0035, 12);
  }
  function strap(p, points, width, key = 'brown-leather-straps-boots') {
    const curve = new THREE.CatmullRomCurve3(points.map(vec));
    put(p, key, surface(6, 44, (u, v) => {
      const q = curve.getPoint(v); return [q.x + (u - .5) * width, q.y, q.z - .004 * Math.sin(u * Math.PI)];
    }));
  }

  // Broad human chest, raised curved breastplate, folded lapels and a split coat skirt.
  put(torso, 'ivory-rubberized-coat', garment([[1.05,.225,.155,0,0],[1.18,.255,.18,0,0],[1.35,.28,.18,0,.01],[1.48,.275,.14,0,.015],[1.55,.16,.11,0,0]], 80, 48, .007));
  put(torso, 'ivory-protective-plate', surface(64, 32, (u, v) => {
    const a = mix(-1.04, 1.04, u), y = 1.28 + v * .205;
    return [Math.sin(a) * (.255 - .025 * v), y + .025 * Math.cos(a), -.024 - Math.cos(a) * (.171 - .025 * v)];
  }));
  pipe(torso, 'machined-brass', [[-.22,1.335,-.12],[-.15,1.30,-.18],[0,1.30,-.199],[.15,1.30,-.18],[.22,1.335,-.12]], .004, 64);
  for (const s of [-1, 1]) {
    put(torso, 'ivory-protective-plate', surface(30, 24, (u, v) => [s * (.035 + .115 * v + u * .055), 1.58 - .26 * v + u * .018, -.107 - .075 * v - .022 * Math.sin(u * Math.PI)]));
    pipe(torso, 'recessed-bronze', [[s*.07,1.58,-.116],[s*.11,1.48,-.158],[s*.18,1.32,-.195]], .0035, 32);
    const start = s < 0 ? Math.PI + .045 : .045;
    put(cape, 'ivory-rubberized-coat', garment([[.48,.35,.235,0,.016],[.64,.318,.225,0,.01],[.83,.28,.19,0,0],[1.02,.238,.164,0,0],[1.12,.232,.157,0,0]], 64, 48, .012, start, Math.PI - .09));
    // Curved hem and slit binding are modeled seams, not painted rectangles.
    const hem = [];
    for (let j = 0; j <= 32; j++) {
      const a = start + j / 32 * (Math.PI - .09);
      hem.push([Math.sin(a)*(.35 + .012*Math.sin(a*13)), .483 + .004*Math.sin(a*7), .016-Math.cos(a)*(.235+.012*Math.sin(a*13))]);
    }
    pipe(cape, 'ivory-protective-plate', hem, .006, 96, 8);
    pipe(cape, 'ivory-protective-plate', [[s*.016,.49,-.22],[s*.024,.68,-.23],[s*.027,.88,-.195],[s*.035,1.10,-.17]], .006, 56, 8);
    strap(torso, [[s*.19,1.1,-.165],[s*.235,1.32,-.15],[s*.23,1.50,-.10],[s*.19,1.56,.03],[s*.17,1.43,.18],[s*.17,1.15,.18]], .043);
    buckle(torso, [s*.222,1.39,-.174], .05, .067);
  }
  put(torso, 'brown-leather-straps-boots', garment([[1.064,.245,.173,0,0],[1.145,.247,.175,0,0]], 80, 4, .001));
  buckle(torso, [-.045,1.106,-.184], .09, .072);
  for (let i=0;i<4;i++) ell(torso,'recessed-bronze',[.035+i*.023,1.106,-.18],[.003,.003,.002],12,8);
  for (const s of [-1,1]) {
    ell(torso,'brown-leather-straps-boots',[s*.247,1.035,-.061],[.064,.087,.072],32,20);
    ell(torso,'brown-leather-straps-boots',[s*.248,1.085,-.092],[.067,.035,.062],32,16);
    buckle(torso,[s*.25,1.05,-.132],.035,.044);
    ring(torso,'machined-brass',[s*.20,1.12,-.131],.025,.005);
  }
  // Anatomical legs, gathered knees, shaped leather boots with separately curved soles.
  for (let k=0;k<2;k++) {
    const s=k===0?-1:1, p=legs[k], x=s*.153;
    put(p,'ivory-rubberized-coat',garment([[.31,.078,.085,x,.025],[.43,.088,.083,x,.015],[.52,.092,.094,x,-.01],[.65,.105,.10,x,.015],[.80,.113,.115,x,.02]],48,32,.009));
    ell(p,'ivory-protective-plate',[x,.485,-.071],[.081,.083,.031],32,20);
    put(p,'brown-leather-straps-boots',garment([[.085,.087,.095,x,.012],[.17,.073,.077,x,.025],[.25,.077,.078,x,.027],[.34,.084,.082,x,.02]],48,24,.005));
    ell(p,'brown-leather-straps-boots',[x,.095,-.062],[.099,.083,.173],40,24);
    ell(p,'ribbed-rubber',[x,.033,-.05],[.103,.033,.186],40,16);
    pipe(p,'machined-brass',[[x-.088,.052,.065],[x-.099,.052,-.07],[x-.076,.052,-.19],[x,.052,-.23],[x+.076,.052,-.19],[x+.099,.052,-.07],[x+.088,.052,.065]],.003,64,8);
    for (const y of [.22,.30]) {
      put(p,'brown-leather-straps-boots',garment([[y,.084,.087,x,.022],[y+.027,.084,.087,x,.022]],40,2,.001));
      buckle(p,[x+s*.035,y+.014,-.064],.04,.034);
    }
    for (let n=0;n<5;n++) {
      const y=.125+n*.015,z=-.14+n*.016;
      pipe(p,'recessed-bronze',[[x-.045,y,z],[x,y+.008,z-.008],[x+.045,y+.014,z]],.003,12,6);
    }
    for(let n=0;n<7;n++) for(const edge of [-1,1]) {
      ell(p,'ribbed-rubber',[x+edge*.082,.025,-.17+n*.04],[.019,.018,.014],12,8);
    }
  }
  // Sleeves narrow through the elbows to long gauntlets; hands have individual bent digits.
  for(let k=0;k<2;k++) {
    const s=k===0?-1:1,p=arms[k];
    put(p,'ivory-rubberized-coat',garment([[1.12,.087,.089,s*.386,-.004],[1.23,.099,.10,s*.365,.011],[1.36,.116,.12,s*.328,.013],[1.49,.116,.125,s*.286,0]],48,32,.008));
    ell(p,'ivory-protective-plate',[s*.304,1.48,.005],[.142,.09,.142],40,24);
    put(p,'ivory-protective-plate',surface(40,24,(u,v)=>{
      const a=mix(-1.7,1.7,u); return [s*(.31+.08*v)+Math.sin(a)*.102,1.46-.14*v,-Math.cos(a)*.129];
    }));
    pipe(p,'machined-brass',[[s*.22,1.475,-.105],[s*.30,1.47,-.14],[s*.39,1.43,-.09]],.004,32);
    put(p,'ivory-rubberized-coat',garment([[.98,.069,.075,s*.418,-.051],[1.06,.079,.085,s*.405,-.032],[1.14,.087,.087,s*.387,0]],48,24,.007));
    ell(p,'brown-leather-straps-boots',[s*.385,1.14,.078],[.067,.077,.022],28,16);
    put(p,'brown-leather-straps-boots',garment([[.9,.063,.06,s*.435,-.065],[.97,.069,.073,s*.423,-.05],[1.07,.082,.079,s*.404,-.018]],40,24,.004));
    for(const y of [.96,1.04]) ring(p,'recessed-bronze',[s*(.435-(y-.9)*.16),y,-.045],.074,.005,[Math.PI/2,0,0],40);
    ell(p,'brown-leather-straps-boots',[s*.438,.875,-.074],[.066,.081,.038],32,20,[.16,0,s*.14]);
    for(let f=0;f<4;f++) {
      const x=s*(.401+f*.024),y=.84-Math.sin((f+1)/5*Math.PI)*.014;
      pipe(p,'brown-leather-straps-boots',[[x,y+.035,-.08],[x+s*.005,y-.023,-.095],[x+s*.002,y-.051,-.12],[x-s*.008,y-.045,-.139]],.013-f*.0005,28,12);
      ell(p,'recessed-bronze',[x,y+.014,-.108],[.012,.015,.005],16,10);
    }
    pipe(p,'brown-leather-straps-boots',[[s*.385,.91,-.077],[s*.372,.875,-.11],[s*.385,.84,-.139]],.021,28,12);
  }

  // Twin rear pressure reservoirs: real curved walls, ribs, caps, cradle brackets and valves.
  for(const s of [-1,1]) {
    const x=s*.13,z=.236;
    put(torso,'ochre-enamel',garment([[1.16,.069,.069,x,z],[1.20,.085,.085,x,z],[1.48,.085,.085,x,z],[1.54,.067,.067,x,z]],64,30,.001));
    ell(torso,'ivory-protective-plate',[x,1.535,z],[.069,.032,.069],32,16);
    ell(torso,'recessed-bronze',[x,1.163,z],[.069,.022,.069],32,12);
    for(const y of [1.205,1.26,1.435,1.49]) ring(torso,'machined-brass',[x,y,z],.087,.009,[Math.PI/2,0,0],48);
    for(let j=0;j<8;j++) {
      const a=j/8*TAU;
      rod(torso,'ivory-protective-plate',[x+Math.sin(a)*.085,1.28,z+Math.cos(a)*.085],[x+Math.sin(a)*.085,1.42,z+Math.cos(a)*.085],.003,.003,10);
    }
    rod(torso,'machined-brass',[x,1.55,z],[x,1.585,z],.066,.066,48);
    for(let j=0;j<24;j++) {
      const a=j/24*TAU;
      rod(torso,'recessed-bronze',[x+Math.sin(a)*.067,1.555,z+Math.cos(a)*.067],[x+Math.sin(a)*.067,1.58,z+Math.cos(a)*.067],.003,.003,8);
    }
    pipe(torso,'machined-brass',[[x,1.585,z],[x,1.62,z],[x*.5,1.64,.205],[x*.45,1.58,.17]],.012,32,12);
    for(const y of [1.24,1.46]) {
      pipe(torso,'brown-leather-straps-boots',[[x-.078,y,.19],[x-.095,y,.27],[x,y,.335],[x+.095,y,.27],[x+.078,y,.19]],.012,36,10);
      for(const edge of [-1,1]) ell(torso,'machined-brass',[x+edge*.055,y,.313],[.008,.008,.005],12,8);
    }
    rod(torso,'recessed-bronze',[x,1.15,z],[x,1.11,z],.029,.029,24);
    ring(torso,'machined-brass',[x,1.13,z],.03,.005,[Math.PI/2,0,0],32);
  }
  pipe(torso,'ribbed-rubber',[[.13,1.12,.236],[.16,.90,.31],[.38,.82,.28],[.52,.93,.08],[.43,1.05,-.06]],.019,320,12,65);
  pipe(arms[0],'ribbed-rubber',[[-.13,1.12,.236],[-.20,.89,.35],[-.46,.69,.25],[-.61,.76,-.04],[-.50,.94,-.21]],.022,384,12,76);

  // Original glue sprayer: pressure sleeve, open cage, piston, trigger and tapered nozzle.
  const gun=arms[0], breech=vec([-.46,.92,-.206]), muzzle=vec([-.50,.48,-.43]);
  const along=t=>breech.clone().lerp(muzzle,t).toArray();
  rod(gun,'ochre-enamel',along(.05),along(.78),.064,.073,64);
  for(const t of [.05,.18,.70,.80]) {
    rod(gun,'machined-brass',along(t-.015),along(t+.015),t>.75?.058:.078,t>.75?.058:.078,48);
  }
  for(let j=0;j<6;j++) {
    const a=j/6*TAU,off=[Math.cos(a)*.078,0,Math.sin(a)*.071];
    const a0=vec(along(.18)).add(vec(off)).toArray(),b0=vec(along(.70)).add(vec(off)).toArray();
    rod(gun,'recessed-bronze',a0,b0,.007,.007,16);
  }
  rod(gun,'machined-brass',along(.8),along(.96),.048,.019,48);
  rod(gun,'recessed-bronze',along(.96),along(1),.024,.019,32);
  ell(gun,'ribbed-rubber',along(1.003),[.014,.008,.014],24,12,[.48,0,0]);
  rod(gun,'machined-brass',[-.535,.91,-.21],[-.55,.73,-.29],.018,.018,24);
  rod(gun,'recessed-bronze',[-.55,.73,-.29],[-.56,.68,-.315],.008,.008,16);
  pipe(gun,'brown-leather-straps-boots',[[-.45,.93,-.205],[-.426,.93,-.139],[-.43,.865,-.128]],.022,28,14);
  pipe(gun,'machined-brass',[[-.46,.94,-.20],[-.50,.89,-.172],[-.493,.823,-.17],[-.438,.827,-.139]],.007,36,10);
  pipe(gun,'recessed-bronze',[[-.46,.907,-.176],[-.463,.875,-.163],[-.448,.86,-.156]],.006,20,10);
  ell(gun,'machined-brass',[-.534,.88,-.25],[.029,.029,.012],32,16,[0,.65,0]);
  ell(gun,'ivory-protective-plate',[-.54,.88,-.259],[.022,.022,.007],24,12,[0,.65,0]);
  pipe(gun,'recessed-bronze',[[-.54,.88,-.268],[-.55,.891,-.265]],.002,8,6);
  const marker=new THREE.Group(); marker.name='glue-sprayer-muzzle'; marker.position.copy(muzzle).sub(gun.position); gun.add(marker);

  // A human head inside an open-front helmet, not a solid sphere standing in for a face.
  ell(head,'weathered-skin-face',[0,1.754,-.005],[.086,.113,.083],48,32);
  put(head,'weathered-skin-face',surface(64,56,(u,v)=>{
    const y=mix(1.657,1.878,v), width=.075+.026*Math.sin(v*Math.PI)-.012*gauss(v,0,.17);
    const xn=u*2-1,x=xn*width;
    let z=-.026-.086*Math.sqrt(Math.max(0,1-xn*xn));
    z-=.046*gauss(x,0,.020)*gauss(y,1.767,.045); // bridge and nose tip
    z-=.017*gauss(x,0,.039)*gauss(y,1.706,.024); // muzzle and lips
    z-=.016*gauss(x,0,.043)*gauss(y,1.674,.02); // chin
    for(const s of [-1,1]) {
      z+=.014*gauss(x,s*.037,.024)*gauss(y,1.803,.018); // eye sockets
      z-=.013*gauss(x,s*.056,.028)*gauss(y,1.756,.032); // cheek bones
      z-=.012*gauss(x,s*.036,.031)*gauss(y,1.827,.012); // brow ridge
    }
    return [x,y,z];
  }));
  for(const s of [-1,1]) {
    ell(head,'weathered-skin-face',[s*.09,1.773,-.016],[.019,.034,.019],28,20);
    ell(head,'skin-lip-ear',[s*.099,1.775,-.031],[.009,.023,.007],24,16);
    ell(head,'eye-sclera',[s*.035,1.803,-.109],[.021,.009,.010],32,16);
    ell(head,'eye-iris',[s*.035,1.803,-.118],[.007,.007,.002],24,16);
    ell(head,'hair-brows-moustache',[s*.035,1.803,-.12],[.0032,.0045,.0015],16,12);
    pipe(head,'weathered-skin-face',[[s*.015,1.804,-.112],[s*.034,1.814,-.115],[s*.055,1.805,-.107]],.004,28,8);
    pipe(head,'skin-lip-ear',[[s*.016,1.800,-.113],[s*.035,1.795,-.115],[s*.054,1.802,-.107]],.0025,28,8);
    pipe(head,'hair-brows-moustache',[[s*.012,1.831,-.119],[s*.034,1.837,-.117],[s*.064,1.827,-.10]],.006,32,10);
    ell(head,'weathered-skin-face',[s*.017,1.753,-.145],[.014,.010,.011],24,16);
    ell(head,'skin-lip-ear',[s*.018,1.750,-.152],[.006,.003,.003],16,10);
    pipe(head,'skin-lip-ear',[[s*.022,1.744,-.131],[s*.033,1.726,-.121],[s*.034,1.708,-.116]],.0018,24,6);
    pipe(head,'hair-brows-moustache',[[s*.004,1.729,-.135],[s*.023,1.730,-.132],[s*.04,1.716,-.115]],.007,28,10);
  }
  pipe(head,'skin-lip-ear',[[-.029,1.709,-.124],[0,1.712,-.137],[.029,1.709,-.124]],.004,40,10);
  pipe(head,'skin-lip-ear',[[-.027,1.705,-.122],[0,1.700,-.135],[.027,1.705,-.122]],.0035,40,10);
  // Short sculpted beard edge and hair at the temples stay below the clear eye/nose opening.
  for(const s of [-1,1]) {
    pipe(head,'hair-brows-moustache',[[s*.078,1.79,-.067],[s*.073,1.728,-.086],[s*.045,1.678,-.103],[s*.008,1.669,-.106]],.009,48,10);
    for(let j=0;j<6;j++) pipe(head,'hair-brows-moustache',[[s*(.065+j*.003),1.84,-.065],[s*(.075+j*.002),1.80,-.05]],.0015,12,6);
  }
  // Rear helmet shell is deliberately cut away across the front face aperture.
  put(head,'ivory-protective-plate',surface(64,32,(u,v)=>{
    const a=mix(.89,TAU-.89,u),phi=mix(.18,1.94,v);
    return [Math.sin(a)*Math.sin(phi)*.145,1.818+Math.cos(phi)*.16,-Math.cos(a)*Math.sin(phi)*.14+.006];
  }));
  ell(head,'ivory-protective-plate',[0,1.934,.013],[.132,.045,.127],48,24);
  put(head,'ivory-protective-plate',garment([[1.624,.12,.117,0,0],[1.66,.147,.145,0,0],[1.70,.138,.139,0,0]],64,16,.001));
  // Rounded rectangular brass rim follows a curved visor, with an unobstructed transparent centre.
  const visorPoint=a=>{
    const sn=Math.sin(a),cs=Math.cos(a);
    const x=.131*Math.sign(sn)*Math.abs(sn)**.65,y=1.803+.137*Math.sign(cs)*Math.abs(cs)**.65;
    return [x,y,-.184+.038*(x/.131)**2];
  };
  const rim=[]; for(let i=0;i<=96;i++)rim.push(visorPoint(i/96*TAU));
  pipe(head,'recessed-bronze',rim,.012,192,10);
  pipe(head,'machined-brass',rim.map(([x,y,z])=>[x,y,z-.006]),.007,192,10);
  put(head,'visor-clear',surface(32,24,(u,v)=>{
    const x=mix(-.125,.125,u), h=.131*(1-(Math.abs(x)/.134)**5)**.2;
    return [x,1.803+mix(-h,h,v),-.184+.038*(x/.131)**2];
  }));
  for(let j=0;j<12;j++) {
    const p=visorPoint(j/12*TAU); p[2]-=.012;
    ell(head,'machined-brass',p,[.005,.005,.003],12,8);
  }
  for(const s of [-1,1]) {
    rod(head,'recessed-bronze',[s*.13,1.74,.005],[s*.165,1.74,.005],.041,.041,32);
    rod(head,'machined-brass',[s*.165,1.74,.005],[s*.175,1.74,.005],.033,.033,32);
    for(let j=0;j<10;j++) {
      const a=j/10*TAU;
      rod(head,'recessed-bronze',[s*.178,1.74+Math.sin(a)*.008,.005+Math.cos(a)*.008],[s*.178,1.74+Math.sin(a)*.028,.005+Math.cos(a)*.028],.002,.002,8);
    }
  }
  rod(head,'machined-brass',[0,1.962,.012],[0,1.984,.012],.082,.082,64);
  rod(head,'ochre-enamel',[0,1.984,.012],[0,2.043,.012],.074,.071,64);
  ell(head,'machined-brass',[0,2.043,.012],[.072,.008,.072],48,16);
  for(let j=0;j<36;j++) {
    const a=j/36*TAU;
    rod(head,'machined-brass',[Math.sin(a)*.075,1.986,.012+Math.cos(a)*.075],[Math.sin(a)*.072,2.041,.012+Math.cos(a)*.072],.0025,.0025,8);
  }
  for(const y of [1.972,1.980]) ring(head,'recessed-bronze',[0,y,.012],.081,.0025,[Math.PI/2,0,0],64);

  // Each material is merged only within its actual rigid animation pivot.
  for(const [p, groups] of bins) for(const [key, geometries] of groups) {
    const geometry=mergeGeometries(geometries,false);
    assert(geometry, `Unable to merge ${p.name}/${key}`);
    const mesh=new THREE.Mesh(geometry,mat[key]); mesh.name=`${p.name}-${key}`;
    mesh.castShadow=mesh.receiveShadow=true; p.add(mesh); geometries.forEach(g=>g.dispose());
  }
  // Convert the front-view drafting coordinates to character-right +X, preserving outward winding.
  root.traverse(object => {
    object.position.x *= -1;
    if (!object.isMesh) return;
    object.geometry.scale(-1, 1, 1);
    const index = object.geometry.index;
    for (let i = 0; i < index.count; i += 3) {
      const b = index.getX(i + 1); index.setX(i + 1, index.getX(i + 2)); index.setX(i + 2, b);
    }
  });
  root.userData.provenance='Original procedural interpretation of supplied gooey.png, concept-first commit 79dc4c8; no reference-game art.';
  return root;
}

function check(root) {
  const measured=measureModel(root);
  const a=new THREE.Vector3(), b=new THREE.Vector3(), c=new THREE.Vector3();
  assert(measured.triangles>=120000 && measured.triangles<=250000);
  assert(measured.meshes<=64);
  assert(Math.abs(measured.bounds.min[1])<.001);
  assert(measured.bounds.max[1]>=1.9 && measured.bounds.max[1]<=2.1);
  for(const name of ['torso','head','arm-left','arm-right','leg-left','leg-right','cape','glue-sprayer-muzzle']) assert(root.getObjectByName(name),name);
  assert(root.getObjectByName('arm-right').position.x > 0);
  assert(root.getObjectByName('arm-left').position.x < 0);
  root.traverse(o=>{
    if(!o.isMesh)return;
    assert(o.visible && o.geometry.index);
    for(const attribute of ['position','normal','uv']) assert([...o.geometry.attributes[attribute].array].every(Number.isFinite));
    const { position, uv }=o.geometry.attributes, index=o.geometry.index;
    assert.equal(position.count,uv.count);
    for(let i=0;i<index.count;i+=3) {
      a.fromBufferAttribute(position,index.getX(i));
      b.fromBufferAttribute(position,index.getX(i+1));
      c.fromBufferAttribute(position,index.getX(i+2));
      assert(b.sub(a).cross(c.sub(a)).lengthSq()>1e-20,`Zero-area triangle in ${o.name}`);
    }
    assert(!o.material.map && !o.material.normalMap);
  });
  return measured;
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const model=buildModel(), measured=check(model);
  if(process.argv.includes('--check')) {
    const bytes=readFileSync(new URL('./model.glb',import.meta.url));
    const receipt=JSON.parse(readFileSync(new URL('./receipt.json',import.meta.url),'utf8'));
    const document=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
    const triangles=document.meshes.reduce((n,m)=>n+m.primitives.reduce((t,p)=>t+document.accessors[p.indices].count/3,0),0);
    assert.equal(bytes.readUInt32LE(0),0x46546c67); assert.equal(bytes.readUInt32LE(8),bytes.length);
    assert.equal(bytes.length,receipt.bytes); assert(bytes.length<6000000);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.sha256);
    assert.equal(triangles,measured.triangles); assert.equal(triangles,receipt.triangles);
    assert.equal(document.meshes.length,measured.meshes); assert.equal(measured.meshes,receipt.meshes);
    assert(!document.images?.length); assert(document.buffers.every(b=>!b.uri));
    console.log(`Gooey checks: ${triangles} triangles, ${measured.meshes} drawables, ${bytes.length} bytes; indexed UVs, finite geometry, pivots, bounds and GLB hash agree.`);
  } else await exportModel(model,new URL('./model.glb',import.meta.url),{label:'Gooey Sticky: original human adhesive specialist'});
}
