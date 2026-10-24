import * as THREE from '../vendor/three.module.js';
import { surface } from './character-surfaces.js';

// Museum-specimen variants: modeled anatomy, micro-surface PBR and unsettling
// asymmetry. All eight silhouettes, +Z faces, shared resources and rigs survive.
const PI = Math.PI;
const materials = new Map(), geometries = new Map(), prototypes = new Map();
let robotPaintMap;
function wornPaintMap() {
  if (!robotPaintMap) {
    const source=surface('metal').map.image, data=new Uint8Array(source.data.length);
    for(let i=0;i<data.length;i+=4) {
      const v=180+Math.round(source.data[i]*.45); data[i]=data[i+1]=data[i+2]=v; data[i+3]=255;
    }
    robotPaintMap=new THREE.DataTexture(data,source.width,source.height);
    robotPaintMap.name='robot/scratched-enamel'; robotPaintMap.colorSpace=THREE.SRGBColorSpace;
    robotPaintMap.wrapS=robotPaintMap.wrapT=THREE.RepeatWrapping; robotPaintMap.generateMipmaps=true;
    robotPaintMap.minFilter=THREE.LinearMipmapLinearFilter; robotPaintMap.magFilter=THREE.LinearFilter;
    robotPaintMap.needsUpdate=true;
  }
  return robotPaintMap;
}
function mat(value, metalness = 0, emissive = 0) {
  if (typeof value === 'string') return surface(value);
  const key = `${value}/${metalness}/${emissive}`;
  if (!materials.has(key)) {
    const m = surface('metal').clone();
    m.name = `Worn enamel ${value.toString(16)}`; m.map=wornPaintMap();
    m.color.setHex(value); m.metalness = metalness || 0.18;
    m.roughness = metalness ? 0.38 : 0.66;
    m.emissive.setHex(emissive || 0); m.emissiveIntensity = emissive ? 0.5 : 0;
    materials.set(key, m);
  }
  return materials.get(key);
}
function geometry(name, factory) { if (!geometries.has(name)) geometries.set(name, factory()); return geometries.get(name); }
const sphereGeo = () => geometry('sphere', () => new THREE.SphereGeometry(1, 20, 12));
const beadGeo = () => geometry('bead', () => new THREE.SphereGeometry(1, 10, 7));
const boxGeo = () => geometry('box', () => new THREE.BoxGeometry(1, 1, 1));
const cylinderGeo = () => geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 24));
const coneGeo = () => geometry('cone', () => new THREE.ConeGeometry(1, 1, 16));
function mesh(parent, geo, color, pos = [0, 0, 0], size = [1, 1, 1], rotation = null, metallic = 0, glow = 0) {
  const m = new THREE.Mesh(geo, mat(color, metallic, glow));
  m.position.set(...pos); m.scale.set(...size); if (rotation) m.rotation.set(...rotation);
  m.castShadow = m.receiveShadow = true; parent.add(m); return m;
}
const orb = (p, c, pos, size, rot = null, metallic = 0) => mesh(p, sphereGeo(), c, pos, size, rot, metallic);
const bead = (p, c, pos, size, rot = null) => mesh(p, beadGeo(), c, pos, size, rot);
const box = (p, c, pos, size, rot = null, metallic = 0, glow = 0) => mesh(p, boxGeo(), c, pos, size, rot, metallic, glow);
const cylinder = (p, c, pos, size, rot = null, metallic = 0) => mesh(p, cylinderGeo(), c, pos, size, rot, metallic);
const cone = (p, c, pos, size, rot = null, metallic = 0) => mesh(p, coneGeo(), c, pos, size, rot, metallic);
function torus(p, color, pos, radius, tube, rotation = [0, 0, 0], metallic = 0, arc = PI * 2, sides = 28) {
  return mesh(p, geometry(`torus-${radius}-${tube}-${arc}-${sides}`, () => new THREE.TorusGeometry(radius, tube, 6, sides, arc)), color, pos, [1, 1, 1], rotation, metallic);
}
function segment(p, color, from, to, radius = 0.1, metallic = 0) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const m = cylinder(p, color, a.clone().add(b).multiplyScalar(0.5).toArray(), [radius, a.distanceTo(b), radius], null, metallic);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize()); return m;
}
// Varying tube radius gives tendons, tapering arms and curved horns real anatomy.
function tendon(p, color, points, radii, segments = 24, sides = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(v => new THREE.Vector3(...v)));
  const geo = new THREE.TubeGeometry(curve, segments, 1, sides, false), pos = geo.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, u = t * (radii.length - 1), k = Math.min(radii.length - 2, Math.floor(u));
    const r = THREE.MathUtils.lerp(radii[k], radii[k + 1], u - k), c = curve.getPointAt(t);
    for (let j = 0; j <= sides; j++) {
      const n = i * (sides + 1) + j;
      pos.setXYZ(n, c.x + (pos.getX(n) - c.x) * r, c.y + (pos.getY(n) - c.y) * r, c.z + (pos.getZ(n) - c.z) * r);
    }
  }
  geo.computeVertexNormals(); return mesh(p, geo, color);
}
const noodle = (p,c,pts,r) => tendon(p,c,pts,[r,r],24,8);
function pivot(parent, pos, motion) {
  const g = new THREE.Group(); g.position.set(...pos);
  if (motion) g.userData.motion = {...motion, baseX:pos[0],baseY:pos[1],baseZ:pos[2]};
  parent.add(g); return g;
}
function pillow(p, color, pos, scale, power = 0.52) {
  const geo = geometry(`pillow-${power}`, () => {
    const g = new THREE.SphereGeometry(1, 28, 20), a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const sp = v => Math.sign(v) * Math.pow(Math.abs(v),power);
      const x=sp(a.getX(i)), y=sp(a.getY(i)), z=sp(a.getZ(i));
      const wrinkle = 1 + .014*Math.sin(x*17+y*8)*Math.sin(y*13+z*7);
      a.setXYZ(i,x*wrinkle,y*wrinkle,z*wrinkle);
    }
    g.computeVertexNormals(); return g;
  });
  return mesh(p,geo,color,pos,scale);
}
function star(parent,color,pos,radius=.18,metallic=0) {
  const shape=new THREE.Shape();
  for(let i=0;i<10;i++){const r=i%2?radius*.43:radius,a=PI/2+i*PI/5;i?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
  shape.closePath();return mesh(parent,new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSize:.008,bevelThickness:.008,bevelSegments:1}),color,pos,undefined,null,metallic);
}
// Restrained wet eyeballs live INSIDE fleshy lids rather than floating above a
// flat face. Iris fibers / scleral capillaries are actual surface maps.
function eyes(p,y,z,separation=.22,r=.13,skin='gum',options={}) {
  const pair=pivot(p,[options.x||0,y,z]); pair.userData.staticBatch=true;
  for(const side of [-1,1]) {
    const x=side*separation, yy=side===1?.008:-.008;
    orb(pair,'cavity',[x,yy,-.018],[r*1.5,r*.92,r*.55],[0,0,side*-.07]);
    orb(pair,'sclera',[x,yy,0],[r*1.13,r*.73,r*.61]);
    orb(pair,'iris',[x+side*r*.035,yy-r*.045,r*.526],[r*.49,r*.52,r*.12]);
    orb(pair,'cavity',[x+side*r*.035,yy-r*.045,r*.637],[r*(options.slit?.07:.205),r*(options.slit?.37:.24),r*.065]);
    for (const upper of [true,false]) {
      const sign=upper?1:-1;
      tendon(pair,skin,[[x-r*1.15,yy,0],[x-r*.55,yy+sign*r*.63,r*.39],[x+r*.35,yy+sign*r*(upper?.61:.52),r*.42],[x+r*1.15,yy,.02]],[r*.18,r*(upper?.28:.16),r*.12],12,6);
    }
    // Tear duct and a single recessed brow muscle, deliberately asymmetric.
    bead(pair,'gum',[x-side*r*1.04,yy-.008,r*.09],[r*.12,r*.13,r*.16]);
    tendon(pair,skin,[[x-r*1.15,yy+r*.79,-r*.18],[x,yy+r*1.05,r*.05],[x+r*1.25,yy+r*.6,-r*.18]],[r*.18,r*.33,r*.15],12,6);
  }
  return pair;
}
function mouth(p, pos, width=.35, height=.13, skin='gum',teeth=7) {
  const g=pivot(p,pos); g.userData.staticBatch=true; orb(g,'cavity',[0,0,0],[width,height,.045]);
  for(const s of [-1,1]) tendon(g,skin,[[-width,0,0],[-width*.55,s*height*.9,.025],[width*.1,s*height,.027],[width*.75,s*height*.56,.02],[width,0,0]],[.024,.033,.026,.014],16,6);
  for(let i=0;i<teeth;i++) {
    const x=(i/(teeth-1)-.5)*width*1.56, h=height*(.49+.13*Math.sin(i*4.8));
    bead(g,'teeth',[x,height*.36,.037],[width/teeth*.64,h,.025],[0,0,.06*Math.sin(i*8)]);
    if(height>.11) bead(g,'teeth',[x,-height*.59,.034],[width/teeth*.58,height*.29,.021],[0,0,.08*Math.sin(i)]);
  }
}
function claws(g,x,y,z,color='horn',count=3) {
  for(let i=0;i<count;i++) tendon(g,color,[[x+(i-(count-1)/2)*.074,y,z],[x+(i-(count-1)/2)*.082,y-.022,z+.075],[x+(i-(count-1)/2)*.085,y-.035,z+.12]],[.026,.018,.002],7,5);
}
function loafPenguin(g) {
  // A stale sourdough cross-section around a gaunt, almost living bird.
  pillow(g,'crust',[0,1.18,-.055],[.67,.99,.4],.72);
  pillow(g,'crumb',[0,1.15,.327],[.565,.84,.072],.69);
  orb(g,'feather',[0,1.01,.38],[.45,.76,.215]);
  orb(g,'paleFeather',[0,.9,.567],[.255,.51,.06]);
  orb(g,'feather',[0,1.64,.39],[.38,.37,.23]);
  eyes(g,1.71,.565,.155,.103,'feather');
  tendon(g,'horn',[[0,1.48,.59],[0,1.45,.73],[0,1.42,.89]],[.115,.085,.003],16,10);
  tendon(g,'cavity',[[-.085,1.447,.691],[0,1.425,.79],[.085,1.447,.69]],[.009,.011,.009],10,5);
  for(const s of [-1,1]) {
    const w=pivot(g,[s*.43,1.31,.26],{axis:'z',amplitude:.06,frequency:1.7,phase:s});
    tendon(w,'feather',[[0,0,0],[s*.11,-.27,.05],[s*.18,-.59,.01],[s*.17,-.76,-.02]],[.14,.11,.07,.002],22,8);
    for(let f=0;f<4;f++) tendon(w,'feather',[[s*.05,-.1-f*.11,.09],[s*.17,-.35-f*.09,.1],[s*.18,-.52-f*.07,.04]],[.036,.04,.003],10,5);
    tendon(g,'horn',[[s*.25,.33,.18],[s*.26,.18,.21],[s*.27,.08,.31]],[.065,.044,.06],14,7);
    for(let t=-1;t<=1;t++) tendon(g,'horn',[[s*.27,.095,.31],[s*.27+t*.095,.066,.4],[s*.27+t*.14,.046,.55]],[.044,.03,.006],10,6);
  }
  for(let i=-1;i<=1;i++) tendon(g,'crust',[[i*.28-.06,1.88,.29],[i*.28,2.01,.25],[i*.28+.065,2.08,.15]],[.025,.037,.016],12,6);
  pillow(g,'butter',[.12,2.18,-.025],[.17,.08,.135],.35).rotation.z=-.14;
}
function espressoOctopus(g) {
  for(let i=0;i<8;i++) {
    const a=i*PI/4, c=Math.cos(a),s=Math.sin(a);
    const leg=pivot(g,[c*.24,.45,s*.24],{axis:'z',amplitude:.055,frequency:1.2,phase:i*.8});
    const pts=[[0,0,0],[c*.28,-.18,s*.3],[c*.55,-.29,s*.55],[c*.77,-.19,s*.69],[c*.88,.035,s*.62]];
    tendon(leg,'octopus',pts,[.17,.145,.095,.052,.004],32,9);
    for(let j=0;j<6;j++) for(const row of [-1,1]) {
      const t=(j+1)/7, rr=.045*(1-.45*t), radial=.25+t*.54;
      const x=c*radial-s*.046*row,z=s*radial+c*.046*row,y=-.19-.075*Math.sin(t*PI);
      const sucker=torus(leg,'gum',[x,y+.051,z],rr,rr*.3,[PI/2,0,0],0,PI*2,9);
      sucker.scale.set(1,.85,1);
      mesh(leg,geometry('sucker-disk',()=>new THREE.CircleGeometry(1,9)),'cavity',[x,y+.057,z],[rr*.65,rr*.65,1],[-PI/2,0,0]);
    }
  }
  orb(g,'octopus',[0,.92,-.05],[.54,.66,.48]);
  orb(g,'octopus',[0,1.15,-.18],[.44,.43,.36]);
  eyes(g,1.07,.428,.242,.139,'octopus',{slit:true});
  orb(g,'gum',[0,.736,.414],[.09,.065,.073]);
  mouth(g,[0,.72,.469],.066,.074,'octopus',0);
  // Porcelain cup, dark coffee meniscus, chipped double wall and handle.
  cylinder(g,'ceramic',[0,1.77,-.08],[.49,.57,.49]);
  torus(g,'ceramic',[0,2.055,-.08],.472,.039,[PI/2,0,0]);
  cylinder(g,'cavity',[0,2.038,-.08],[.44,.017,.44]);
  torus(g,'crust',[0,2.049,-.08],.407,.018,[PI/2,0,0]);
  torus(g,'ceramic',[.53,1.79,-.08],.227,.069,[0,0,0]);
  tendon(g,'crumb',[[-.11,2.062,-.14],[-.2,2.062,-.04],[0,2.062,.13],[.16,2.062,-.07],[.04,2.062,-.12]],[.035,.035,.02],26,6);
  // A last thin curl of nicotine-colored steam keeps the original silhouette.
  const steam=pivot(g,[0,2.055,-.1],{axis:'y',amplitude:.17,frequency:.65});
  tendon(steam,'horn',[[-.07,0,0],[-.12,.12,0],[.04,.29,0],[-.01,.41,0]],[.017,.015,.007,.001],22,6);
}
function cactusDJ(g) {
  cylinder(g,'crust',[0,.26,0],[.45,.5,.4]);
  torus(g,'crust',[0,.5,0],.44,.062,[PI/2,0,0]);
  cylinder(g,'soil',[0,.507,0],[.389,.017,.355]);
  orb(g,'cactus',[0,1.28,0],[.405,.91,.35]);
  for(let i=0;i<9;i++) {
    const a=i*2*PI/9;
    tendon(g,'cactus',[[Math.sin(a)*.26,.52,Math.cos(a)*.24],[Math.sin(a)*.39,1.05,Math.cos(a)*.32],[Math.sin(a)*.32,1.86,Math.cos(a)*.27],[Math.sin(a)*.13,2.07,Math.cos(a)*.13]],[.038,.04,.03,.002],26,6);
    for(let j=0;j<6;j++) {
      const y=.71+j*.22,r=.36-.05*Math.abs(y-1.25),x=Math.sin(a)*r,z=Math.cos(a)*r*.9;
      bead(g,'horn',[x,y,z],[.023,.027,.018]);
      for(const side of [-1,1]) tendon(g,'horn',[[x,y,z],[x+Math.sin(a)*.095,y+side*.074,z+Math.cos(a)*.095]],[.008,.001],3,4);
    }
  }
  for(const s of [-1,1]) {
    const arm=pivot(g,[s*.3,1.12,0],{axis:'z',amplitude:.035,frequency:1.4,phase:s});
    tendon(arm,'cactus',[[0,0,0],[s*.35,.02,0],[s*.48,.29,-.015],[s*.43,.53,-.01]],[.17,.15,.12,.026],26,9);
    for(let i=0;i<5;i++) tendon(arm,'horn',[[s*.42,.13+i*.066,.09],[s*.55,.15+i*.066,.19]],[.008,.001],3,4);
  }
  torus(g,'metal',[0,1.76,-.06],.465,.059,[0,0,0],0,PI);
  for(const s of [-1,1]) {
    cylinder(g,'cloth',[s*.427,1.66,0],[.205,.135,.205],[0,0,PI/2]);
    cylinder(g,'metal',[s*.51,1.66,0],[.17,.063,.17],[0,0,PI/2]);
  }
  eyes(g,1.635,.329,.174,.091,'cactus');
  // Broken aviators: brows hide below tarnished wire, eyes are still visible.
  for(const s of [-1,1]) {
    const rim=torus(g,'metal',[s*.177,1.665,.417],.116,.016);rim.scale.set(1.05,.67,1);
    box(g,'metal',[s*.174,1.714,.42],[.19,.035,.018],[0,0,s*.07]);
  }
  segment(g,'metal',[-.058,1.68,.423],[.058,1.68,.423],.013);
  mouth(g,[0,1.35,.335],.11,.043,'cactus',5);
  const chain=torus(g,'horn',[0,1.09,.27],.212,.019); chain.scale.y=1.13;
  box(g,'metal',[0,.67,.5],[1.07,.155,.47],[-.09,0,0]);
  for(const s of [-1,1]) {cylinder(g,'cavity',[s*.29,.759,.53],[.178,.021,.178]);torus(g,'metal',[s*.29,.776,.53],.118,.008,[PI/2,0,0]);}
  for(let i=0;i<4;i++) box(g,i%2?'horn':'lava',[(i-1.5)*.105,.778,.645],[.036,.022,.066]);
  star(g,'membrane',[.06,2.15,.01],.15);
}
function lunarCow(g) {
  // Lean shoulders, articulated hocks and split hooves; the cow still wears its orbit.
  orb(g,'cow',[0,1.01,-.1],[.57,.63,.45]);
  for(const x of [-.34,.34]) for(const z of [-.25,.26]) {
    tendon(g,'cow',[[x*.9,.97,z],[x,.5,z-.035],[x,.25,z+.02]],[.145,.087,.065],20,8);
    bead(g,'cow',[x,.45,z-.022],[.108,.12,.09]);
    for(const d of [-1,1]) pillow(g,'horn',[x+d*.064,.105,z+.049],[.065,.101,.158],.65);
  }
  tendon(g,'cow',[[0,1.07,.045],[0,1.52,.015],[0,1.94,.035]],[.3,.26,.23],22,10);
  orb(g,'cow',[0,1.87,.066],[.35,.43,.35]);
  orb(g,'cow',[0,1.67,.34],[.295,.25,.31]);
  eyes(g,1.97,.321,.221,.105,'cow',{slit:true});
  orb(g,'gum',[0,1.612,.554],[.288,.145,.146]);
  for(const s of [-1,1]) {
    orb(g,'cavity',[s*.158,1.651,.675],[.056,.038,.025],[0,0,s*.31]);
    const ear=pivot(g,[s*.28,2.01,-.01]);
    orb(ear,'cow',[s*.21,.012,0],[.28,.114,.115],[0,0,s*.21]);
    orb(ear,'gum',[s*.225,.014,.087],[.178,.065,.025],[0,0,s*.21]);
    tendon(g,'horn',[[s*.25,2.146,-.03],[s*.36,2.33,-.06],[s*.33,2.5,.015],[s*.26,2.57,.05]],[.082,.059,.025,.001],22,9);
  }
  tendon(g,'cavity',[[-.22,1.536,.615],[0,1.506,.662],[.23,1.547,.615]],[.011,.014,.009],18,5);
  const ring=pivot(g,[0,.95,-.06],{axis:'y',amplitude:.12,frequency:.8});
  torus(ring,'metal',[0,0,0],.83,.03,[PI/2+.17,0,-.16]);
  bead(ring,'horn',[-.81,.14,0],[.094,.094,.094]);
  const tail=pivot(g,[.42,.99,-.35],{axis:'z',amplitude:.09,frequency:1.2});
  tendon(tail,'cow',[[0,0,0],[.2,-.07,-.19],[.24,-.42,-.2],[.15,-.56,-.17]],[.033,.029,.022,.013],23,7);
  orb(tail,'feather',[.15,-.57,-.17],[.065,.105,.058]);
  star(g,'horn',[0,2.56,-.01],.105);
}
function discoBanana(g) {
  tendon(g,'banana',[[-.25,.61,0],[-.03,.89,0],[.105,1.4,-.025],[.015,1.91,0],[-.19,2.2,.02]],[.18,.285,.27,.185,.045],42,14);
  tendon(g,'bananaFlesh',[[-.16,.87,.16],[.071,1.25,.21],[.02,1.72,.2],[-.15,2.11,.1]],[.13,.177,.16,.045],34,12);
  tendon(g,'horn',[[-.19,2.15,.02],[-.25,2.32,-.01],[-.31,2.36,-.014]],[.066,.052,.016],10,7);
  for(const s of [-1,1]) {
    const peel=pivot(g,[s*.1,.98,-.015],{axis:'z',amplitude:.055,frequency:1.1,phase:s});
    tendon(peel,'banana',[[0,0,0],[s*.3,.16,.015],[s*.48,.08,.03],[s*.52,-.27,.01],[s*.63,-.41,.03]],[.135,.124,.096,.058,.009],28,8);
    tendon(peel,'bananaFlesh',[[s*.01,.025,.1],[s*.3,.18,.092],[s*.46,.06,.105],[s*.5,-.25,.06]],[.09,.079,.049,.008],25,7);
    tendon(g,'gum',[[s*.15,.69,.0],[s*.22,.37,-.035],[s*.25,.17,.04]],[.06,.034,.032],20,7);
    pillow(g,'metal',[s*.28,.09,.135],[.175,.088,.244],.63);
  }
  eyes(g,1.691,.34,.136,.09,'bananaFlesh');
  mouth(g,[.015,1.414,.398],.15,.102,'bananaFlesh',7);
  for(const s of [-1,1]) tendon(g,'bananaFlesh',[[s*.16,1.62,.337],[s*.2,1.52,.308],[s*.18,1.39,.3]],[.028,.034,.012],14,6);
  box(g,'cloth',[0,1.145,.314],[.37,.076,.045]);
  for(const s of [-1,1]) cone(g,'cloth',[s*.115,1.143,.35],[.1,.19,.046],[0,0,s*PI/2]);
  const arm=pivot(g,[.42,1.21,.025],{axis:'z',amplitude:.035,frequency:1.3});
  tendon(arm,'gum',[[0,0,0],[.19,-.04,.02],[.36,.11,.01]],[.039,.023,.026],16,7);
  for(let f=0;f<4;f++) tendon(arm,'gum',[[.34,.1,.01+(f-1.5)*.025],[.42,.15,.01+(f-1.5)*.027],[.45,.2,.01+(f-1.5)*.024]],[.014,.011,.003],10,5);
  const disco=pivot(g,[.83,1.66,.015],{axis:'y',speed:.24});
  mesh(disco,geometry('disco',()=>new THREE.IcosahedronGeometry(.235,2)),'metal');
  for(let r=0;r<4;r++) for(let k=0;k<8;k++) {
    const a=k*PI/4+(r%2)*.18, y=(r-1.5)*.102,rad=Math.sqrt(.238*.238-y*y);
    box(disco,'ceramic',[Math.sin(a)*rad,y,Math.cos(a)*rad],[.051,.058,.012],[0,a,0]);
  }
  star(g,'metal',[-.47,1.96,.07],.095);
}
function cosmicDuck(g) {
  orb(g,'duckFeather',[0,.88,-.035],[.58,.67,.5]);
  orb(g,'duckFeather',[0,1.27,.12],[.32,.46,.3]);
  tendon(g,'duckFeather',[[0,1.09,.16],[0,1.52,.07],[0,1.79,.09]],[.25,.19,.235],22,10);
  orb(g,'duckFeather',[0,1.79,.1],[.348,.335,.32]);
  eyes(g,1.864,.344,.202,.081,'duckFeather');
  pillow(g,'horn',[0,1.673,.518],[.251,.08,.272],.84);
  pillow(g,'horn',[0,1.589,.498],[.218,.04,.229],.9);
  tendon(g,'cavity',[[-.218,1.612,.59],[0,1.609,.754],[.218,1.612,.59]],[.009,.011,.009],20,5);
  for(const s of [-1,1]) bead(g,'cavity',[s*.105,1.715,.623],[.025,.01,.04]);
  for(const s of [-1,1]) {
    tendon(g,'horn',[[s*.26,.38,.09],[s*.255,.18,.07],[s*.28,.09,.22]],[.05,.035,.051],14,7);
    orb(g,'horn',[s*.28,.063,.3],[.174,.051,.239]);
    for(let f=-1;f<=1;f++) tendon(g,'horn',[[s*.28,.08,.24],[s*.28+f*.089,.061,.38],[s*.28+f*.12,.04,.51]],[.025,.024,.005],10,5);
    const w=pivot(g,[s*.45,1.13,-.02],{axis:'z',amplitude:s*.05,frequency:1.5});
    orb(w,'duckFeather',[s*.06,-.16,0],[.17,.37,.21],[0,0,s*.23]);
    for(let f=0;f<6;f++) tendon(w,'duckFeather',[[s*.07,-.02-f*.046,.145],[s*(.15+f*.012),-.2-f*.045,.14],[s*(.12+f*.015),-.45-f*.037,.035]],[.055,.05,.001],15,6);
  }
  pillow(g,'cloth',[0,.79,-.442],[.435,.51,.046],.52).rotation.x=.13;
  torus(g,'cloth',[0,1.31,.0],.322,.045,[PI/2,0,0]);
  star(g,'metal',[0,1.23,.344],.1);
  cylinder(g,'cloth',[0,2.06,.063],[.389,.063,.375]);
  tendon(g,'cloth',[[0,2.055,.055],[-.025,2.27,.04],[-.13,2.48,.06],[-.19,2.56,.075]],[.305,.195,.082,.003],22,14);
  star(g,'horn',[-.19,2.57,.075],.105);
  star(g,'metal',[-.005,2.205,.29],.077);
  const wand=pivot(g,[.68,.75,.1],{axis:'z',amplitude:.035,frequency:1.1});
  tendon(wand,'horn',[[0,0,0],[.03,.47,0],[.08,.85,0]],[.025,.022,.017],18,6);
  star(wand,'metal',[.08,.89,0],.16);
}
function volcanoRavioli(g) {
  pillow(g,'pasta',[0,1.05,0],[.65,.61,.32],.49);
  // Folded hem is one continuous wavy seam, with real pinched fork marks.
  const border=[];
  for(let i=0;i<=64;i++) {
    const a=i/64*PI*2, sp=v=>Math.sign(v)*Math.pow(Math.abs(v),.46), w=1+.031*Math.sin(a*28);
    border.push([sp(Math.sin(a))*.659*w,1.04+sp(Math.cos(a))*.629*w,.014]);
  }
  tendon(g,'pasta',border,[.072,.072],128,7);
  for(let i=0;i<44;i++) {
    const a=i/44*PI*2,sp=v=>Math.sign(v)*Math.pow(Math.abs(v),.46);
    const x=sp(Math.sin(a))*.667,y=1.04+sp(Math.cos(a))*.638;
    tendon(g,'crust',[[x*.96,1.04+(y-1.04)*.95,.059],[x, y,.073],[x*1.03,1.04+(y-1.04)*1.03,.049]],[.009,.012,.005],5,5);
  }
  for(const s of [-1,1]) {
    tendon(g,'pasta',[[s*.31,.45,0],[s*.3,.22,-.025],[s*.33,.1,.095]],[.069,.044,.046],14,7);
    pillow(g,'crust',[s*.32,.08,.16],[.164,.073,.214],.69);
    const arm=pivot(g,[s*.64,1.12,0],{axis:'z',amplitude:.052,frequency:1.4,phase:s});
    tendon(arm,'pasta',[[0,0,0],[s*.14,-.09,.01],[s*.24,.075,.04],[s*.27,.25,.03]],[.059,.043,.031,.008],18,7);
    for(let f=0;f<3;f++) tendon(arm,'pasta',[[s*.25,.17,.03],[s*(.29+f*.018),.25+f*.035,.04]],[.015,.003],7,5);
  }
  eyes(g,1.196,.307,.214,.115,'pasta');
  mouth(g,[.0,.873,.336],.16,.115,'pasta',7);
  for(const s of [-1,1]) tendon(g,'pasta',[[s*.33,1.14,.289],[s*.32,1.01,.299],[s*.235,.89,.316]],[.027,.039,.012],16,6);
  // Basalt vent and hardened rivulets surround the ember interior.
  mesh(g,new THREE.CylinderGeometry(.133,.345,.49,20,5,true),'soil',[0,1.858,-.046]);
  torus(g,'soil',[0,2.105,-.046],.134,.054,[PI/2,0,0]);
  cylinder(g,'lava',[0,2.092,-.046],[.108,.018,.108]);
  for(let i=0;i<4;i++){const a=i*1.6;tendon(g,'lava',[[Math.sin(a)*.13,2.09,Math.cos(a)*.13-.04],[Math.sin(a)*.2,1.93,Math.cos(a)*.23-.04],[Math.sin(a)*.29,1.72,Math.cos(a)*.29-.04]],[.018,.024,.006],18,6);}
  const fire=pivot(g,[0,2.12,-.04],{axis:'y',amplitude:.13,frequency:2.1,bob:.016});
  tendon(fire,'lava',[[0,0,0],[.04,.17,0],[-.035,.34,.014],[.032,.46,.028]],[.108,.074,.032,.001],22,9);
  for(const s of [-1,1]) tendon(fire,'lava',[[s*.13,.015,0],[s*.17,.17,.02],[s*.13,.26,0]],[.035,.022,.001],12,6);
  orb(g,'cactus',[-.28,1.73,.13],[.21,.035,.105],[0,0,-.28]);
  orb(g,'cactus',[-.4,1.8,.1],[.16,.029,.075],[0,0,-.8]);
}
function dragonWing(parent,side) {
  const pts=[[0,0,0],[side*.18,.35,0],[side*.62,.53,-.035],[side*.51,.12,.01],[side*.63,-.19,.025],[side*.28,-.14,.04],[side*.17,-.34,.015]];
  // Sculpted bat-like membrane with a bulging center and tensioned struts.
  const center=[side*.26,.04,.095],positions=[],uv=[];
  for(let i=0;i<pts.length;i++) {
    for(const v of [center,pts[i],pts[(i+1)%pts.length]]) {positions.push(...v);uv.push(Math.abs(v[0])/ .65,(v[1]+.34)/.9);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.computeVertexNormals();
  const membrane=mesh(parent,geo,'membrane');membrane.material.side=THREE.DoubleSide;
  for(const tip of [pts[2],pts[4],pts[6]]) tendon(parent,'scales',[[0,0,0],[side*.22,.095,.057],tip],[.046,.031,.003],16,6);
  tendon(parent,'scales',pts.slice(0,3),[.051,.038,.006],18,6);
}
function goldenNoodleDragon(g) {
  tendon(g,'scales',[[-.36,.45,0],[-.04,.69,0],[.25,1.06,-.03],[.08,1.41,.015],[-.12,1.76,.04]],[.2,.265,.245,.22,.21],42,12);
  tendon(g,'horn',[[-.31,.51,.168],[-.02,.73,.218],[.21,1.06,.185],[.08,1.35,.197],[-.09,1.55,.214]],[.115,.142,.125,.095],36,9);
  for(let i=0;i<10;i++) {
    const t=i/9,y=.58+t*.87,x=.12*Math.sin(t*PI*1.6)-.12*(1-t);
    tendon(g,'scales',[[x-.095,y,.245],[x,y-.022,.262],[x+.095,y,.242]],[.01,.016,.01],10,5);
  }
  const tail=pivot(g,[-.37,.46,0],{axis:'y',amplitude:.095,frequency:.8});
  tendon(tail,'scales',[[0,0,0],[-.41,-.2,0],[-.65,-.13,-.05],[-.7,.15,-.1],[-.53,.34,-.08]],[.145,.106,.075,.041,.002],30,9);
  for(const s of [-1,1]) {
    tendon(g,'scales',[[s*.18,.66,.01],[s*.31,.37,.02],[s*.27,.12,.19]],[.125,.08,.062],20,8);
    orb(g,'scales',[s*.28,.098,.24],[.155,.087,.173]);claws(g,s*.28,.094,.363);
    const w=pivot(g,[s*.19,1.36,-.13],{axis:'y',amplitude:.095,frequency:1.8,phase:s});dragonWing(w,s);
  }
  orb(g,'scales',[-.11,1.858,.06],[.34,.315,.28]);
  orb(g,'scales',[-.11,1.734,.339],[.278,.169,.278]);
  orb(g,'horn',[-.11,1.595,.317],[.222,.075,.24]);
  eyes(g,1.937,.27,.192,.102,'scales',{x:-.11,slit:true});
  mouth(g,[-.11,1.636,.506],.21,.055,'scales',9);
  for(const s of [-1,1]) {
    bead(g,'cavity',[s*.125-.11,1.785,.571],[.044,.028,.019],[0,0,s*.19]);
    tendon(g,'horn',[[s*.2-.11,2.047,-.01],[s*.28-.11,2.221,-.06],[s*.24-.11,2.395,.026]],[.071,.045,.001],24,8);
    tendon(g,'horn',[[s*.205-.11,1.684,.407],[s*.4-.11,1.62,.52],[s*.52-.11,1.737,.49],[s*.56-.11,1.88,.45]],[.018,.014,.008,.001],26,5);
    tendon(g,'scales',[[s*.12-.11,2.017,.238],[s*.21-.11,2.0,.22],[s*.29-.11,1.947,.12]],[.061,.052,.014],16,7);
  }
  for(let i=0;i<5;i++) tendon(g,'horn',[[.04,1.0+i*.135,-.238],[.04,1.1+i*.135,-.355],[.04,1.2+i*.135,-.34]],[.062,.035,.001],10,6);
  star(g,'metal',[-.11,2.42,.04],.108);
}

const builders=[loafPenguin,espressoOctopus,cactusDJ,lunarCow,discoBanana,cosmicDuck,volcanoRavioli,goldenNoodleDragon];
const names=['loaf penguin','espresso octopus','cactus dj','lunar cow','disco banana','cosmic duck','volcano ravioli','golden noodle dragon'];

// Batch only within a static group. Animated appendages retain separate pivots;
// cloned instances share GPU resources but never transforms or motion state.
function mergeStatic(group) {
  for(const child of [...group.children]) if(child.isGroup && child.userData.staticBatch) {
    child.updateMatrix();
    for(const part of [...child.children]) { part.applyMatrix4(child.matrix); group.add(part); }
    group.remove(child);
  }
  for(const c of [...group.children]) if(c.isGroup) mergeStatic(c);
  const buckets=new Map();
  for(const c of group.children){if(!c.isMesh||c.userData.keepMesh)continue;if(!buckets.has(c.material))buckets.set(c.material,[]);buckets.get(c.material).push(c);}
  for(const [material,meshes] of buckets){
    if(meshes.length<2)continue;const positions=[],normals=[],uvs=[];
    for(const child of meshes){child.updateMatrix();const geo=child.geometry.index?child.geometry.toNonIndexed():child.geometry.clone();geo.applyMatrix4(child.matrix);for(const v of geo.attributes.position.array)positions.push(v);for(const v of geo.attributes.normal.array)normals.push(v);for(const v of geo.attributes.uv.array)uvs.push(v);geo.dispose();group.remove(child);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.computeBoundingSphere();geo.userData.characterMerged=true;
    const m=new THREE.Mesh(geo,material);m.castShadow=m.receiveShadow=true;group.add(m);
  }
}
function resolveKind(value){if(Number.isFinite(Number(value)))return((Math.floor(Number(value))%8)+8)%8;const normalized=String(value).toLowerCase().replace(/[_-]/g,' ');const index=names.findIndex(name=>normalized.includes(name)||name.includes(normalized));return index<0?0:index;}
export function createCollectible(kindOrIndex=0,scale=1){
  const kind=resolveKind(kindOrIndex);
  if(!prototypes.has(kind)){
    const model=new THREE.Group();builders[kind](model);mergeStatic(model);
    const bounds=new THREE.Box3().setFromObject(model),normalization=2.3/(bounds.max.y-bounds.min.y);
    model.scale.setScalar(normalization);model.position.y=-bounds.min.y*normalization;model.userData.baseY=model.position.y;prototypes.set(kind,model);
  }
  const root=new THREE.Group(),model=prototypes.get(kind).clone(true);root.add(model);root.scale.setScalar(scale);
  root.userData.kind=kind;root.userData.characterName=names[kind];root.userData.characterType='collectible';root.userData.height=2.3*scale;root.userData.rig=model;root.userData.animatedParts=[];root.userData.surfaceStyle='specimen-pbr';
  model.traverse(n=>{if(n.userData.motion)root.userData.animatedParts.push(n);});return root;
}
export function animateCollectible(group,t,delta=0){
  const data=group.userData,rig=data.rig;if(!rig)return;const phase=(data.kind||0)*.79;
  rig.position.y=rig.userData.baseY+Math.sin(t*1.25+phase)*.01;rig.rotation.z=Math.sin(t*.8+phase)*.009;
  for(const part of data.animatedParts||[]){const m=part.userData.motion;part.rotation[m.axis||'z']=m.speed?t*m.speed:Math.sin(t*m.frequency+(m.phase||0))*m.amplitude;if(m.bob)part.position.y=m.baseY+Math.sin(t*3.1)*m.bob;}
}
export function createAvatar(color = 0x5cf2d2) {
  const root = new THREE.Group();
  const rig = new THREE.Group();
  root.add(rig);
  const dark = 0x263c50;
  // Scratched enamel keeps the explorer readable against the organic specimens.
  box(rig, color, [0, 1.07, 0], [0.64, 0.7, 0.38]);
  box(rig, 0xe7fff9, [0, 1.1, 0.209], [0.39, 0.36, 0.045]);
  box(rig, dark, [0, 0.74, 0], [0.6, 0.13, 0.4]);
  box(rig, 0xffd279, [0.01, 0.75, 0.22], [0.16, 0.12, 0.045], null, 0.3);
  box(rig, dark, [0, 1.06, -0.27], [0.51, 0.51, 0.25]);
  box(rig, color, [0, 1.09, -0.42], [0.34, 0.3, 0.08]);
  const head = pivot(rig, [0, 1.65, 0], null);
  box(head, color, [0, 0, 0], [0.78, 0.61, 0.57]);
  box(head, dark, [0, 0.005, 0.3], [0.64, 0.37, 0.08]);
  for (const side of [-1, 1]) {
    box(head, 0xd1fff6, [side * 0.17, 0.035, 0.347], [0.105, 0.13, 0.018], null, 0, 0x78efdf);
    cylinder(head, 0xffd279, [side * 0.405, 0, 0], [0.12, 0.07, 0.12], [0, 0, PI / 2], 0.3);
  }
  box(head, 0x83b9b9, [0, -0.11, 0.347], [0.16, 0.027, 0.02]);
  segment(head, dark, [0.18, 0.29, 0], [0.18, 0.47, 0], 0.035);
  orb(head, 0xffd279, [0.18, 0.5, 0], [0.085, 0.085, 0.085]);
  const limbs = {};
  for (const side of [-1, 1]) {
    const arm = pivot(rig, [side * 0.44, 1.33, 0], null);
    box(arm, color, [0, -0.19, 0], [0.23, 0.4, 0.26]);
    box(arm, dark, [0, -0.47, 0.015], [0.23, 0.18, 0.25]);
    const leg = pivot(rig, [side * 0.19, 0.71, 0], null);
    box(leg, dark, [0, -0.22, 0], [0.24, 0.46, 0.27]);
    box(leg, color, [0, -0.34, 0.15], [0.2, 0.17, 0.065]);
    box(leg, 0xfffaf0, [0, -0.6, 0.07], [0.29, 0.2, 0.43]);
    limbs[side < 0 ? 'leftArm' : 'rightArm'] = arm;
    limbs[side < 0 ? 'leftLeg' : 'rightLeg'] = leg;
  }
  mergeStatic(rig);
  root.userData = { rig, head, limbs, height: 2.24, characterType: 'avatar' };
  return root;
}

export function animateAvatar(group, t, moving = false, carrying = false) {
  const { rig, head, limbs } = group.userData;
  if (!rig || !limbs) return;
  const stride = moving ? Math.sin(t * 11) * 0.64 : Math.sin(t * 2.5) * 0.025;
  limbs.leftLeg.rotation.x = stride;
  limbs.rightLeg.rotation.x = -stride;
  limbs.leftArm.rotation.x = carrying ? -1.22 + stride * 0.06 : -stride * 0.8;
  limbs.rightArm.rotation.x = carrying ? -1.22 - stride * 0.06 : stride * 0.8;
  limbs.leftArm.rotation.z = carrying ? -0.13 : -0.035;
  limbs.rightArm.rotation.z = carrying ? 0.13 : 0.035;
  rig.position.y = moving ? Math.abs(Math.sin(t * 11)) * 0.065 : Math.sin(t * 2.5) * 0.017;
  rig.rotation.z = moving ? Math.sin(t * 11) * 0.025 : 0;
  head.rotation.y = moving ? Math.sin(t * 5.5) * 0.035 : Math.sin(t * 1.1) * 0.075;
}

// Use this instead of disposing every traversed geometry/material. Collectible
// instances share all render resources with cached models, and the primitive
// geometry/material pools are also shared with avatars.
export function disposeCharacter(group) {
  if (!group) return;
  group.removeFromParent();
  if (group.userData.characterType === 'avatar') {
    const disposed = new Set();
    group.traverse(node => {
      const geo = node.geometry;
      if (geo?.userData.characterMerged && !disposed.has(geo)) {
        geo.dispose();
        disposed.add(geo);
      }
    });
  }
  group.clear();
  group.userData = {};
}
