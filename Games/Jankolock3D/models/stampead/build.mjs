// Original procedural Stampead, interpreted from the supplied concept plate.
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries, mergeVertices } from '../../vendor/addons/BufferGeometryUtils.js';
import { exportModel, measureModel } from '../model-build.mjs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const TAU = Math.PI * 2;
const V = (a) => new THREE.Vector3(...a);
const mix = (a,b,t) => a+(b-a)*t;
const gauss = (x,c,w) => Math.exp(-(((x-c)/w)**2));

// Indexed parametric surfaces retain useful longitudinal UVs after batching.
function surface(n,m,fn) {
  // Spend samples on shaped surfaces, not sub-millimetre tessellation.
  n=Math.max(4,Math.round(n*.64));m=Math.max(2,Math.round(m*.60));
  const positions=[], uv=[], indices=[];
  for(let j=0;j<=m;j++) for(let i=0;i<=n;i++) {
    positions.push(...fn(i/n,j/m)); uv.push(i/n,j/m);
  }
  for(let j=0;j<m;j++) for(let i=0;i<n;i++) {
    const a=j*(n+1)+i,b=a+1,c=a+n+1,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}

// Profile rows: y, lateral radius, depth radius, center x, center z.
function profile(rows,t) {
  const p=t*(rows.length-1),i=Math.min(rows.length-2,Math.floor(p)),f=p-i;
  return rows[0].map((_,k)=> {
    const a=rows[Math.max(0,i-1)][k],b=rows[i][k],c=rows[i+1][k],d=rows[Math.min(rows.length-1,i+2)][k];
    return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);
  });
}
function loft(rows,n=64,m=48,wrinkles=0,shape=1,face=false) {
  return surface(n,m,(u,v)=> {
    const [y,rx,rz,cx,cz]=profile(rows,v),a=u*TAU;
    const wave=wrinkles*Math.sin(v*80+Math.sin(a*3)*2)*Math.sin(Math.PI*v)**2;
    const x=cx+Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**shape*(rx+wave);
    let z=cz-Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**shape*(rz+wave*.6);
    if(face && Math.cos(a)>0) {
      // Continuous orbital sockets, cheekbones, nasolabial planes and lower jaw.
      const front=Math.cos(a)**6;
      z+=front*(.012*(gauss(x,-.041,.022)+gauss(x,.041,.022))*gauss(y,1.843,.018)
        -.013*(gauss(x,-.051,.027)+gauss(x,.051,.027))*gauss(y,1.807,.022)
        -.016*gauss(x,0,.042)*gauss(y,1.747,.022)
        +.006*gauss(x,0,.06)*gauss(y,1.777,.009));
    }
    return [x,y,z];
  });
}
function rounded(w,h,d,r=.012) {
  r=Math.min(r,w/3,h/3,d/3);
  const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);
  const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.001,d-2*r),bevelEnabled:true,bevelThickness:r,bevelSize:r*.45,bevelSegments:2,steps:1,curveSegments:3});
  return g.translate(0,0,-d/2+r);
}

export function buildModel() {
  const root=new THREE.Group(); root.name='Stampead';
  root.userData={front:'-Z',units:'metres',source:'Original procedural interpretation of supplied Stampead concept',pose:'Relaxed broad stance; joint-origin rigid animation groups, not a skin rig'};
  const material=(name,color,roughness,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness});
  const M={
    cream:material('warm chipped enamel',0xd2c4a1,.62,.28),
    edge:material('exposed armor edge',0x8b8066,.48,.62),
    brass:material('aged brass fittings',0x9d793c,.38,.78),
    steel:material('dark mechanical steel',0x363c3c,.34,.82),
    leather:material('oxblood leather',0x4b3028,.83,.02),
    cloth:material('olive brown work uniform',0x494639,.96),
    red:material('crimson wool cape',0x6c2528,.98),
    stitch:material('waxed ochre thread',0xb09b70,.93),
    black:material('charcoal cap and boot rubber',0x232526,.77,.02),
    skin:material('weathered warm skin',0xac8063,.88),
    shadow:material('skin creases and lips',0x735044,.94),
    eye:material('muted eye whites',0xbcb7a2,.35),
    iris:material('dark hazel iris',0x383a2d,.31)
  };
  const groups={}, batches=new Map();
  for(const [name,p] of Object.entries({torso:[0,1.10,0],head:[0,1.69,0],'arm-left':[-.31,1.55,0],'arm-right':[.31,1.55,0],'leg-left':[-.15,.99,0],'leg-right':[.15,.99,0],cape:[-.27,1.59,.09]})) {
    const g=new THREE.Group();g.name=name;g.position.copy(V(p));root.add(g);groups[name]=g;batches.set(g,new Map());
  }
  function add(group,key,geometry,p=[0,0,0],rotation=[0,0,0],scale=[1,1,1]) {
    const matrix=new THREE.Matrix4().compose(V(p),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),V(scale));
    geometry.applyMatrix4(matrix); geometry.translate(...groups[group].position.clone().negate().toArray());
    // Extrusions have per-face normals; keep them, but index for uniform merging.
    if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
    geometry.clearGroups();
    const bucket=batches.get(groups[group]);if(!bucket.has(key))bucket.set(key,[]);bucket.get(key).push(geometry);
  }
  function box(g,k,p,size,r=.01,rot=[0,0,0]) {add(g,k,rounded(...size,r),p,rot);}
  function ellipsoid(g,k,p,s,n=32,m=20) {add(g,k,new THREE.SphereGeometry(1,Math.round(n*.8),Math.round(m*.8)),p,[0,0,0],s);}
  function tube(g,k,points,r,segments=24,radial=10) {
    const curve=new THREE.CatmullRomCurve3(points.map(V));
    add(g,k,new THREE.TubeGeometry(curve,Math.max(8,Math.round(segments*.75)),r,Math.max(6,Math.round(radial*.8)),false));
  }
  function cylinder(g,k,a,b,r1,r2=r1,n=24) {
    const start=V(a),end=V(b),delta=end.clone().sub(start);
    const geo=new THREE.CylinderGeometry(r2,r1,delta.length(),n,1,false);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    add(g,k,geo,start.add(end).multiplyScalar(.5).toArray());
  }
  function rivet(g,p,r=.0045) {
    cylinder(g,'brass',[p[0],p[1],p[2]+.003],[p[0],p[1],p[2]-.003],r,r*.8,12);
  }
  function seam(g,k,points,r=.002) {tube(g,k,points,r,Math.max(12,Math.min(32,points.length)),8);}
  function buckle(g,p,w=.044,h=.052) {
    const [x,y,z]=p;
    box(g,'brass',[x,y-h/2,z],[w,.006,.008],.002);
    box(g,'brass',[x,y+h/2,z],[w,.006,.008],.002);
    box(g,'brass',[x-w/2,y,z],[.006,h,.008],.002);
    box(g,'brass',[x+w/2,y,z],[.006,h,.008],.002);
    cylinder(g,'brass',[x,y,z-.004],[x,y+h*.45,z-.004],.0025,.0025,8);
  }
  // Curved plate: a finite-thickness shell with rolled perimeter, not a box.
  function armor(g,rows,a0,a1,key='cream',n=48,m=20) {
    const point=(u,v,offset=0)=> {
      const [y,rx,rz,cx,cz]=profile(rows,v),a=mix(a0,a1,u);
      const bevel=.006*Math.sin(Math.PI*u)**.35*Math.sin(Math.PI*v)**.35;
      return [cx+(rx+offset+bevel)*Math.sin(a),y,cz-(rz+offset+bevel)*Math.cos(a)];
    };
    const outside=surface(n,m,(u,v)=>point(u,v));
    add(g,key,outside);
    // Perimeter is joined to its inset inner rim; no dense hidden back surface.
    for(const side of [0,1,2,3]) {
      const edge=(t,offset)=> side<2?point(t,side,offset):point(side-2,t,offset);
      add(g,'edge',surface(n,2,(u,v)=>edge(u,-.009*v)));
      const pts=Array.from({length:17},(_,i)=>edge(i/16,.0015));
      seam(g,'edge',pts,.0027);
    }
    for(const u of [.08,.92])for(const v of [.12,.5,.88])rivet(g,point(u,v,.004));
  }

  // Tailored uniform and anatomical shoulders beneath layered cuirass.
  add('torso','cloth',loft([[.93,.13,.09,0,.025],[1.04,.21,.125,0,.018],[1.18,.21,.125,0,.01],[1.36,.27,.145,0,0],[1.48,.28,.13,0,0],[1.58,.20,.105,0,.01],[1.63,.09,.07,0,0]],64,40,.002));
  armor('torso',[[1.29,.225,.149,0,0],[1.38,.266,.159,0,0],[1.50,.264,.145,0,0],[1.57,.14,.111,0,0]],-1.48,1.48,'cream',72,36);
  // Separate overlapping abdominal lames, with natural waist taper.
  for(let i=0;i<3;i++)armor('torso',[[1.09+i*.065,.205+i*.009,.135,0,0],[1.14+i*.065,.22+i*.012,.145,0,0],[1.18+i*.065,.215+i*.012,.143,0,0]],-1.45,1.45,'cream',52,12);
  armor('torso',[[1.32,.245,.14,0,.012],[1.48,.26,.14,0,.012],[1.57,.135,.10,0,.012]],1.55,4.72,'cream',56,24);
  add('torso','leather',loft([[1.005,.216,.145,0,0],[1.055,.22,.148,0,0],[1.10,.218,.145,0,0]],64,8));
  box('torso','brass',[0,1.058,-.164],[.105,.076,.021],.006);
  box('torso','steel',[0,1.058,-.178],[.067,.049,.008],.003);
  for(const x of [-.041,.041])for(const y of [1.033,1.083])rivet('torso',[x,y,-.184]);
  // Rigid tall officer gorget surrounds a visible neck.
  add('head','skin',loft([[1.58,.067,.06,0,0],[1.65,.074,.064,0,0],[1.73,.065,.063,0,-.006],[1.78,.07,.065,0,-.002]],48,24));
  armor('torso',[[1.555,.101,.085,0,0],[1.62,.105,.087,0,0],[1.67,.091,.079,0,0]],-.99,4.13,'leather',60,18);
  armor('torso',[[1.565,.107,.09,0,0],[1.60,.109,.093,0,0],[1.655,.096,.085,0,0]],-1.4,-.3,'cream',24,18);
  armor('torso',[[1.565,.107,.09,0,0],[1.60,.109,.093,0,0],[1.655,.096,.085,0,0]],.3,1.4,'cream',24,18);
  buckle('torso',[0,1.61,-.092],.046,.045);
  // Tassets hang separately over the upper thighs.
  for(const s of [-1,1])armor('torso',[[.84,.105,.035,s*.142,-.125],[.92,.117,.044,s*.142,-.117],[1.014,.102,.041,s*.142,-.116]],-.95,.95,'cream',36,24);

  // Head is an asymmetric-in-detail human profile, with integrated facial planes.
  add('head','skin',loft([[1.707,.025,.040,0,-.016],[1.731,.055,.061,0,-.010],[1.76,.075,.070,0,0],[1.794,.082,.071,0,0],[1.827,.086,.073,0,0],[1.861,.083,.072,0,0],[1.902,.081,.072,0,.003],[1.935,.061,.053,0,.004],[1.951,.002,.002,0,.004]],112,96,0,.86,true));
  // Nose bridge and alae are shaped as one profiled mesh, not a ball nose.
  add('head','skin',loft([[1.792,.011,.011,0,-.082],[1.801,.021,.022,0,-.09],[1.814,.017,.027,0,-.092],[1.835,.011,.019,0,-.084],[1.861,.008,.008,0,-.075]],40,32));
  for(const s of [-1,1]) {
    ellipsoid('head','shadow',[s*.012,1.799,-.106],[.005,.003,.003],16,10);
    // Ears: flattened helix with inset concha and raised antihelix.
    ellipsoid('head','skin',[s*.084,1.823,.001],[.017,.032,.014],32,24);
    ellipsoid('head','shadow',[s*.095,1.825,-.010],[.008,.019,.004],24,16);
    tube('head','skin',[[s*.091,1.802,-.009],[s*.104,1.816,-.011],[s*.103,1.844,-.006],[s*.091,1.849,-.008]],.004,24,10);
    ellipsoid('head','eye',[s*.037,1.844,-.064],[.020,.0078,.009],32,20);
    ellipsoid('head','iris',[s*.037,1.844,-.073],[.005,.005,.002],24,16);
    ellipsoid('head','black',[s*.037,1.844,-.075],[.0023,.003,.001],16,12);
    for(const upper of [false,true])tube('head','skin',[[s*.017,1.843,-.067],[s*.036,1.844+(upper?.009:-.007),-.072],[s*.057,1.844,-.062]],.003,22,10);
    tube('head','skin',[[s*.012,1.866,-.077],[s*.035,1.868,-.079],[s*.061,1.861,-.065]],.008,26,12);
    tube('head','black',[[s*.014,1.867,-.083],[s*.035,1.869,-.085],[s*.060,1.862,-.072]],.0026,22,8);
    seam('head','shadow',[[s*.022,1.802,-.086],[s*.029,1.789,-.080],[s*.034,1.774,-.074]],.0013);
    seam('head','shadow',[[s*.057,1.836,-.068],[s*.069,1.829,-.059]],.0011);
    seam('head','skin',[[s*.043,1.797,-.082],[s*.059,1.808,-.078],[s*.071,1.820,-.061]],.002);
  }
  tube('head','shadow',[[-.032,1.775,-.074],[-.015,1.781,-.083],[0,1.779,-.086],[.014,1.78,-.083],[.032,1.775,-.074]],.0025,32,10);
  tube('head','skin',[[-.029,1.771,-.075],[0,1.770,-.087],[.029,1.771,-.075]],.004,28,10);
  for(let j=0;j<3;j++)seam('head','shadow',[[-.049,1.884+j*.008,-.063],[0,1.889+j*.008,-.073],[.047,1.885+j*.008,-.064]],.0008);
  // Peaked officer cap with squashed crown, piping, badge and curved leather visor.
  add('head','black',loft([[1.902,.084,.075,0,.003],[1.922,.095,.084,0,.003],[1.949,.114,.089,0,.007],[1.974,.104,.085,0,.008],[1.983,.060,.049,0,.008],[1.985,.001,.001,0,.008]],72,32,.0007,.87));
  add('head','leather',loft([[1.902,.086,.077,0,.003],[1.914,.091,.081,0,.003],[1.927,.095,.083,0,.003]],64,6));
  add('head','black',surface(64,20,(u,v)=> {
    const a=mix(-1.45,1.45,u),r=mix(.079,.135,v);
    return [Math.sin(a)*r,1.906-.024*v-.007*Math.sin(Math.PI*u),-.002-Math.cos(a)*r];
  }));
  for(const y of [1.903,1.928])seam('head','brass',Array.from({length:33},(_,i)=>{const a=i/32*TAU;return [.094*Math.sin(a),y,.003-.083*Math.cos(a)];}),.0017);
  ellipsoid('head','brass',[0,1.95,-.087],[.014,.019,.0035],28,20);
  ellipsoid('head','steel',[0,1.95,-.091],[.009,.013,.002],24,16);
  box('head','brass',[0,1.949,-.094],[.007,.013,.003],.001);

  for(const s of [-1,1]) {
    const arm=s<0?'arm-left':'arm-right',leg=s<0?'leg-left':'leg-right';
    // Shoulder-to-wrist contour: deltoid, biceps, elbow, forearm and narrow wrist.
    add(arm,'cloth',loft([[.82,.041,.044,s*.405,-.012],[.94,.054,.06,s*.409,.005],[1.09,.069,.064,s*.411,.010],[1.21,.061,.061,s*.397,.015],[1.31,.077,.073,s*.374,.012],[1.44,.094,.085,s*.336,.006],[1.55,.088,.076,s*.30,0],[1.59,.025,.025,s*.28,0]],64,58,.0025));
    armor(arm,[[1.39,.096,.095,s*.337,0],[1.47,.112,.104,s*.321,0],[1.55,.102,.092,s*.295,0],[1.585,.048,.055,s*.280,0]],-1.65,1.65,'cream',56,26);
    armor(arm,[[1.275,.075,.079,s*.378,.005],[1.34,.084,.086,s*.362,.005],[1.415,.089,.088,s*.343,.005]],-1.5,1.5,'cream',48,20);
    ellipsoid(arm,'steel',[s*.395,1.223,-.018],[.07,.065,.065],32,24);
    cylinder(arm,'brass',[s*.398,1.224,-.072],[s*.398,1.224,-.084],.036,.036,36);
    cylinder(arm,'steel',[s*.398,1.224,-.084],[s*.398,1.224,-.088],.021,.021,24);
    armor(arm,[[.928,.052,.063,s*.408,-.004],[1.01,.065,.077,s*.414,0],[1.12,.076,.079,s*.41,0],[1.177,.056,.065,s*.402,0]],-1.43,1.43,'cream',48,28);
    for(const y of [.932,1.127])add(arm,'leather',loft([[y-.012,.063,.077,s*.41,0],[y+.012,.063,.077,s*.41,0]],48,4));
    buckle(arm,[s*.41,.94,-.083],.035,.030);
    armor(arm,[[.838,.046,.045,s*.408,-.01],[.892,.05,.054,s*.408,-.008]],-1.4,4.7,'steel',40,10);
    // Gloved palm, four separated bent fingers and opposing thumb.
    add(arm,'black',loft([[.761,.027,.025,s*.409,-.024],[.783,.046,.032,s*.409,-.024],[.827,.046,.033,s*.407,-.018],[.856,.035,.028,s*.405,-.013]],40,28));
    armor(arm,[[.78,.041,.012,s*.408,-.052],[.813,.043,.016,s*.407,-.05],[.838,.033,.012,s*.405,-.05]],-1.35,1.35,'steel',32,12);
    for(let f=0;f<4;f++) {
      const x=s*.409+(f-1.5)*.021,y=.784-Math.abs(f-1.3)*.005;
      tube(arm,'black',[[x,y,-.034],[x,y-.036,-.045],[x,y-.050,-.022],[x,y-.034,-.007]],.010,24,12);
      ellipsoid(arm,'steel',[x,y-.006,-.051],[.010,.012,.005],16,12);
      seam(arm,'edge',[[x-.006,y-.034,-.049],[x+.006,y-.034,-.049]],.0017);
    }
    tube(arm,'black',[[s*.366,.82,-.018],[s*.350,.79,-.028],[s*.362,.764,-.032],[s*.377,.768,-.031]],.014,28,12);

    // Thick human thighs taper to actual knee joints and shaped lower legs.
    const x=s*.15;
    add(leg,'cloth',loft([[.31,.051,.055,x,.01],[.43,.070,.073,x,.014],[.53,.076,.076,x,.021],[.62,.072,.071,x,.008],[.71,.102,.096,x,.013],[.85,.113,.101,x,.018],[.98,.111,.104,x,.023],[1.04,.079,.076,x,.024]],72,72,.004,.95));
    // Side thigh plate, working harness and front kneecap.
    armor(leg,[[.69,.096,.093,x,.014],[.78,.114,.109,x,.014],[.94,.114,.109,x,.014]],s<0?-1.7:.35,s<0?-.35:1.7,'leather',32,26);
    for(const y of [.73,.93])add(leg,'leather',loft([[y-.014,.116,.111,x,.014],[y+.014,.116,.111,x,.014]],48,4));
    armor(leg,[[.52,.053,.062,x,-.015],[.56,.077,.091,x,-.015],[.62,.084,.095,x,-.015],[.675,.060,.071,x,-.015]],-1.6,1.6,'cream',52,30);
    armor(leg,[[.555,.047,.085,x,-.029],[.588,.060,.094,x,-.029],[.641,.048,.085,x,-.029]],-1.3,1.3,'leather',36,18);
    for(const y of [.56,.64])for(const dx of [-.035,.035])rivet(leg,[x+dx,y,-.111]);
    armor(leg,[[.335,.054,.067,x,0],[.42,.069,.079,x,.014],[.50,.065,.078,x,.014]],-1.3,1.3,'cream',44,24);
    // Boots: tall fitted shaft, instep/ankle crease and broad rounded toe.
    add(leg,'leather',loft([[.065,.072,.112,x,-.034],[.11,.078,.121,x,-.048],[.16,.067,.086,x,-.006],[.22,.055,.062,x,.015],[.29,.061,.065,x,.017],[.365,.073,.075,x,.017]],64,48,.002,.80));
    add(leg,'black',loft([[.018,.075,.134,x,-.046],[.027,.082,.140,x,-.046],[.06,.084,.141,x,-.046],[.077,.079,.134,x,-.044]],64,16,0,.65));
    armor(leg,[[.27,.064,.07,x,.015],[.34,.073,.079,x,.017],[.38,.074,.079,x,.017]],-1.5,1.5,'leather',40,18);
    for(const y of [.18,.295,.355]) {
      add(leg,'leather',loft([[y-.012,.071,.075,x,.011],[y+.012,.071,.075,x,.011]],48,4));
      buckle(leg,[x+s*.044,y,-.054],.028,.031);
    }
    // Real tread blocks touch y=0; soles are not floating.
    for(let i=0;i<8;i++)for(const dx of [-.056,.056])box(leg,'black',[x+dx,.01135,-.153+i*.029],[.037,.020,.018],.003);
    for(let i=0;i<6;i++) {
      const y=.13+i*.019,z=-.112+i*.008;
      for(const dx of [-.028,.028]) {
        rivet(leg,[x+dx,y,z],.0035);
        seam(leg,'leather',[[x+dx,y-.004,z-.003],[x+dx,y+.004,z-.003]],.002);
      }
      tube(leg,'stitch',[[x-.026,y,z-.004],[x,y+.011,z-.009],[x+.026,y+.019,z+.003]],.002,14,8);
      tube(leg,'stitch',[[x+.026,y,z-.005],[x,y+.011,z-.011],[x-.026,y+.019,z+.003]],.002,14,8);
    }
    seam(leg,'stitch',[[x-.063,.086,-.117],[x-.063,.10,-.17],[x,.105,-.183],[x+.063,.10,-.17],[x+.063,.086,-.117]],.002);
    for(const dx of [-.056,.056])seam(leg,'stitch',[[x+dx,.13,-.08],[x+dx,.20,-.042],[x+dx,.32,-.038]],.0015);
  }

  // Front diagonal leather baldric follows the cuirass rather than hovering.
  const strap=[[-.20,1.565,-.102],[-.135,1.46,-.158],[-.055,1.35,-.174],[.045,1.23,-.165],[.15,1.10,-.12]];
  add('torso','leather',surface(8,48,(u,v)=> {
    const p=new THREE.CatmullRomCurve3(strap.map(V)).getPoint(v);
    return [p.x+(u-.5)*.052,p.y+(u-.5)*.035,p.z-.005*Math.sin(Math.PI*u)];
  }));
  for(const side of [-1,1])seam('torso','stitch',strap.map(([x,y,z])=>[x+side*.022,y+side*.015,z-.003]),.0013);
  buckle('torso',[-.06,1.36,-.183],.047,.056);
  box('torso','brass',[.12,1.44,-.151],[.066,.041,.008],.004,[0,.22,0]);
  for(const x of [.095,.145])rivet('torso',[x,1.44,-.162],.003);
  // Hip pouches: soft profile bodies, overlapping flaps, clasps and stitched edges.
  for(const [x,y,z] of [[-.22,1.025,-.105],[.246,1.01,-.04],[-.248,1.05,.065]]) {
    box('torso','leather',[x,y-.055,z],[.10,.16,.075],.019);
    box('torso','leather',[x,y+.008,z-.043],[.109,.070,.016],.01,[.13,0,0]);
    rivet('torso',[x,y-.008,z-.057],.007);
    for(const dx of [-.043,.043])seam('torso','stitch',[[x+dx,y-.115,z-.04],[x+dx,y-.015,z-.047],[x+dx,y+.034,z-.046]],.0013);
  }
  // Rucksack silhouette and two longitudinal straps remain exposed on the back.
  add('torso','cloth',loft([[1.08,.13,.06,0,.165],[1.13,.184,.09,0,.18],[1.31,.182,.091,0,.182],[1.46,.168,.078,0,.17],[1.50,.11,.045,0,.17]],64,44,.002,.50));
  box('torso','leather',[0,1.43,.26],[.32,.13,.024],.022);
  for(const x of [-.113,.113]) {
    box('torso','leather',[x,1.295,.28],[.031,.335,.012],.004);
    // Back buckles are built facing +Z, including their central tongue.
    for(const y of [1.18,1.36]) {
      box('torso','brass',[x-.016,y,.292],[.005,.043,.009],.001);
      box('torso','brass',[x+.016,y,.292],[.005,.043,.009],.001);
      for(const dy of [-.021,.021])box('torso','brass',[x,y+dy,.292],[.037,.005,.009],.001);
      box('torso','brass',[x,y,.299],[.004,.028,.006],.001);
    }
    seam('torso','stitch',[[x-.012,1.14,.288],[x-.012,1.45,.288]],.0012);
  }
  for(const x of [-.185,.185])box('torso','leather',[x,1.22,.205],[.064,.16,.09],.018);
  tube('torso','leather',[[-.06,1.49,.195],[-.045,1.54,.205],[.045,1.54,.205],[.06,1.49,.195]],.009,24,12);
  // Cape fans from left shoulder into actual longitudinal folds and a ragged hem.
  const capePoint=(u,v)=> {
    const width=mix(.19,.62,v),x=-.23+(u-.5)*width-.13*v;
    const fold=Math.sin(u*TAU*5.5+v*.9)*(.014+.029*v)+Math.sin(u*TAU*12-v*3)*.004*v;
    const y=1.56-1.00*v+.055*Math.cos(u*Math.PI)-.026*Math.sin(u*37)**2*v**10;
    const z=.09+.17*v+.08*Math.sin(Math.PI*v)+fold+.07*Math.sin(Math.PI*u);
    return [x,y,z];
  };
  M.red.side=THREE.DoubleSide;
  add('cape','red',surface(132,112,capePoint));
  for(const u of [0,1])seam('cape','leather',Array.from({length:35},(_,i)=>capePoint(u,i/34)),.003);
  seam('cape','red',Array.from({length:81},(_,i)=>capePoint(i/80,1)),.004);
  // Shoulder drape wraps over the front corner into the main sheet.
  add('cape','red',surface(64,28,(u,v)=> {
    const a=mix(-1.4,1.7,u),r=.095+.065*v;
    return [-.275+Math.sin(a)*r,1.545+.045*Math.sin(Math.PI*v)-.13*v,.01-Math.cos(a)*r];
  }));
  for(let i=0;i<44;i++) {
    const p=capePoint((i+.4)/44,1);
    seam('cape','red',[p,[p[0]+.004*Math.sin(i),p[1]-.008-(i%4)*.003,p[2]+.003]],.0018);
  }
  cylinder('torso','brass',[-.24,1.55,-.112],[-.24,1.55,-.134],.043,.039,48);
  cylinder('torso','edge',[-.24,1.55,-.135],[-.24,1.55,-.139],.029,.029,40);
  for(let i=0;i<8;i++){const a=i/8*TAU;rivet('torso',[-.24+Math.sin(a)*.032,1.55+Math.cos(a)*.032,-.141],.003);}
  box('torso','brass',[-.24,1.55,-.144],[.021,.025,.006],.003);

  // Stamp hammer hangs from the right gloved grip; actual stepped mechanism.
  const weapon='arm-right',a=[.414,.79,-.015],b=[.54,.22,-.06];
  cylinder(weapon,'steel',a,b,.018,.023,32);
  for(let i=0;i<10;i++) {
    const t=.06+i*.018,p=V(a).lerp(V(b),t);
    cylinder(weapon,'leather',[p.x,p.y-.004,p.z],[p.x,p.y+.004,p.z],.025,.025,24);
  }
  cylinder(weapon,'brass',[.46,.60,-.031],[.475,.53,-.037],.036,.036,40);
  cylinder(weapon,'steel',[.475,.53,-.037],[.53,.285,-.056],.050,.057,48);
  for(let i=0;i<8;i++) {
    const a=i/8*TAU,dx=Math.sin(a)*.052,dz=Math.cos(a)*.052;
    cylinder(weapon,'brass',[.48+dx,.52,-.037+dz],[.53+dx,.29,-.055+dz],.006,.007,14);
  }
  for(const [x,y,z] of [[.477,.53,-.037],[.526,.30,-.055]])cylinder(weapon,'brass',[x,y-.012,z],[x,y+.012,z],.064,.064,40);
  box(weapon,'steel',[.548,.203,-.06],[.235,.095,.176],.013,[0,0,.20]);
  box(weapon,'brass',[.553,.166,-.06],[.255,.027,.194],.007,[0,0,.20]);
  box(weapon,'black',[.558,.143,-.06],[.231,.022,.174],.005,[0,0,.20]);
  // Raised original mailing-grid stamp face, not copied insignia or text.
  for(let i=0;i<5;i++)box(weapon,'steel',[.475+i*.039,.123+(i-2)*.008,-.06],[.008,.009,.143],.002);
  for(let j=0;j<3;j++)box(weapon,'steel',[.553,.126,-.115+j*.055],[.194,.009,.008],.002,[0,0,.20]);
  for(const x of [.46,.51,.56,.61])for(const y of [.18,.22])rivet(weapon,[x,y,-.153],.005);

  // One drawable per material per animation pivot; preserve world-space pose.
  for(const [group,bucket] of batches)for(const [key,geometries] of bucket) {
    const geometry=mergeGeometries(geometries,false);
    assert(geometry,`Cannot merge ${group.name}/${key}`);
    const mesh=new THREE.Mesh(mergeVertices(geometry,1e-6),M[key]);geometry.dispose();mesh.name=`${group.name}-${key}`;
    mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);
    for(const source of geometries)source.dispose();
  }
  return root;
}

function checkGLB() {
  const path=new URL('./model.glb',import.meta.url),bytes=readFileSync(path);
  const receipt=JSON.parse(readFileSync(new URL('./receipt.json',import.meta.url),'utf8'));
  assert.equal(bytes.readUInt32LE(0),0x46546c67);assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString());
  const primitives=json.meshes.flatMap(m=>m.primitives);
  const triangles=primitives.reduce((n,p)=>n+json.accessors[p.indices].count/3,0);
  assert.equal(triangles,receipt.triangles);assert(triangles>=120000&&triangles<=250000);
  assert.equal(bytes.length,receipt.bytes);assert(bytes.length<6000000);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),receipt.sha256);
  assert(primitives.length<=64);assert.equal(json.materials.length,receipt.materials.length);
  assert(!json.images&&!json.textures);
  for(const p of primitives){assert.equal(p.mode??4,4);assert(p.attributes.NORMAL!==undefined&&p.attributes.TEXCOORD_0!==undefined);}
  // Read the exported positions and node transforms, rather than trusting source bounds.
  const binOffset=20+bytes.readUInt32LE(12)+8, bounds=new THREE.Box3();
  function visit(index,parent) {
    const node=json.nodes[index],matrix=new THREE.Matrix4();
    if(node.matrix)matrix.fromArray(node.matrix);
    else matrix.compose(V(node.translation??[0,0,0]),new THREE.Quaternion(...(node.rotation??[0,0,0,1])),V(node.scale??[1,1,1]));
    matrix.premultiply(parent);
    if(node.mesh!==undefined)for(const p of json.meshes[node.mesh].primitives) {
      const accessor=json.accessors[p.attributes.POSITION],view=json.bufferViews[accessor.bufferView];
      assert.equal(accessor.componentType,5126);assert.equal(accessor.type,'VEC3');
      const start=binOffset+(view.byteOffset??0)+(accessor.byteOffset??0),stride=view.byteStride??12;
      for(let i=0;i<accessor.count;i++) {
        const xyz=[0,1,2].map(k=>bytes.readFloatLE(start+i*stride+k*4));
        assert(xyz.every(Number.isFinite));bounds.expandByPoint(V(xyz).applyMatrix4(matrix));
      }
    }
    for(const child of node.children??[])visit(child,matrix);
  }
  for(const node of json.scenes[json.scene??0].nodes)visit(node,new THREE.Matrix4());
  const actualBounds={min:bounds.min.toArray(),max:bounds.max.toArray()};
  const fresh=measureModel(buildModel());
  assert.equal(fresh.triangles,triangles);assert.deepEqual(fresh.bounds,receipt.bounds);
  for(const side of ['min','max'])for(let k=0;k<3;k++)assert(Math.abs(actualBounds[side][k]-receipt.bounds[side][k])<1e-6);
  assert(Math.abs(actualBounds.min[1])<.001);assert(actualBounds.max[1]>=1.8&&actualBounds.max[1]<=2.1);
  for(const name of ['torso','head','arm-left','arm-right','leg-left','leg-right','cape'])assert(json.nodes.some(n=>n.name===name));
  console.log(JSON.stringify({check:'GLB bytes/hash/topology/materials/UVs/pivots/bounds',triangles,bytes:bytes.length,drawables:primitives.length,materials:json.materials.length,bounds:actualBounds,sha256:receipt.sha256}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--check'))checkGLB();
  else await exportModel(buildModel(),new URL('./model.glb',import.meta.url),{label:'Stampead: original procedural postroom inspector'});
}
