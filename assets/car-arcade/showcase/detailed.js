import * as THREE from '../vendor/three.module.js';
import { UTILITY_STUDIES, SPORT_STUDIES } from './detail-profiles.js';

// Original numerical studies, not replicas, performance claims or live fleet data.
export const PASSENGER_STUDIES = Object.freeze(Object.fromEntries([
  ['bricklet','Bricklet80','#927f63','#d7cfbc',1.68,3.65,1.48,2.30,.91,-.28,.32,-.18,.21,1.32,'saloon',4,'BRK 80'],
  ['finch','Finch Sport','#4882b5','#283b50',1.78,3.96,1.30,2.48,.79,-.25,.33,-.08,.18,1.28,'fastback',2,'FNC 21'],
  ['lantern','Lantern Saloon','#755c94','#755c94',1.86,4.58,1.51,2.77,.95,-.25,.29,-.13,.17,1.44,'saloon',4,'LTN 32'],
  ['comet','Comet Coupe','#c74c55','#342d35',1.90,4.32,1.28,2.61,.78,-.21,.30,-.06,.13,1.32,'coupe',2,'CMT 48'],
  ['orchard','Orchard Wagon','#778a49','#778a49',1.89,4.82,1.62,2.91,1.00,-.29,.43,-.17,.36,1.48,'wagon',4,'ORC 62'],
  ['horizon','Horizon GT','#a75139','#a75139',1.98,4.92,1.35,2.91,.83,-.18,.32,-.04,.17,1.44,'fastback',2,'HRZ 15'],
  ['morrow','Morrow Roadster','#d5b85a','#393c40',1.84,4.08,1.22,2.48,.73,-.22,.23,-.10,.13,1.32,'roadster',2,'MRW 22'],
  ['relay','Relay Touring','#4868a0','#4868a0',1.94,4.96,1.47,3.02,.92,-.28,.34,-.15,.22,1.49,'saloon',4,'RLY 42'],
  ['tempest','Tempest Sprint','#9b4d82','#30313a',2.02,4.38,1.24,2.70,.74,-.29,.34,-.08,.15,1.30,'hyper',2,'TMP 60'],
  ['sunray','Sunray Halo','#e6a92d','#37393e',2.12,4.76,1.20,2.89,.71,-.32,.31,-.12,.09,1.34,'prototype',2,'SUN 16'],
].map(([id,name,color,roofColor,width,length,height,wheelbase,bodyHeight,cabinFront,cabinRear,roofFront,roofRear,roofWidth,form,doors,plate]) =>
  [id,Object.freeze({id,name,color,roofColor,width,length,height,wheelbase,bodyHeight,cabinFront,cabinRear,roofFront,roofRear,roofWidth,form,doors,plate})])));

export function createDetailedCar(id) {
  if (typeof id !== 'string' || ![PASSENGER_STUDIES,UTILITY_STUDIES,SPORT_STUDIES].some(map => Object.hasOwn(map,id))) throw new RangeError('Unknown detailed study');
  const p = [PASSENGER_STUDIES,UTILITY_STUDIES,SPORT_STUDIES].find(map => Object.hasOwn(map,id))[id];
  const car = new THREE.Group(), wheels = [], batches = new Map();
  car.name = `${id}-detailed-study`;
  const {width:W,length:L,height:H,bodyHeight:B,form} = p;
  const cf=p.cabinFront*L, cr=p.cabinRear*L, rf=p.roofFront*L, rr=p.roofRear*L;
  const open=form==='roadster', pickup=form==='pickup', cargo=['van','panel'].includes(form);
  const sport=['coupe','fastback','roadster','hyper','prototype'].includes(form);
  const radius=Math.min(B*.39, W*.185), clearance=radius*.75;
  const standard=(name,color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({name,color,roughness,metalness,side:THREE.DoubleSide});
  const paint=new THREE.MeshPhysicalMaterial({name:'body-paint',color:p.color,roughness:.27,metalness:.22,clearcoat:.55,side:THREE.DoubleSide});
  const roof=new THREE.MeshPhysicalMaterial({name:'roof-paint',color:p.roofColor,roughness:.29,clearcoat:.5,side:THREE.DoubleSide});
  const glass=new THREE.MeshPhysicalMaterial({name:'window-glass',color:'#52616b',roughness:.13,transparent:true,opacity:.55,depthWrite:false,transmission:0,side:THREE.DoubleSide,forceSinglePass:true});
  const lens=new THREE.MeshPhysicalMaterial({name:'lamp-lens',color:'#e6eceb',roughness:.12,transparent:true,opacity:.3,depthWrite:false,transmission:0,side:THREE.DoubleSide,forceSinglePass:true});
  const trim=standard('cab-plastic','#292d30'), rubber=standard('rubber','#191b1d',.92), fabric=standard('seat-fabric','#56504b',.96);
  const chrome=standard('chrome','#b5bdc1',.23,1), red=standard('rear-reflector','#a7292d',.3), plate=standard('registration-plate','#ffffff');
  plate.userData.label=p.plate;
  const add=(g,mat,parent=car)=>{
    const key=parent.uuid+mat.uuid;
    if(!batches.has(key)) batches.set(key,{parent,mat,position:[],normal:[],uv:[],index:[]});
    const b=batches.get(key), base=b.position.length/3;
    for(const name of ['position','normal','uv']) for(const n of g.attributes[name].array) b[name].push(n);
    if(g.index) for(const n of g.index.array) b.index.push(base+n);
    else for(let i=0;i<g.attributes.position.count;i++) b.index.push(base+i);
    g.dispose();
  };
  const surface=(mat,fn,nu=24,nv=8)=>{
    const pos=[],uv=[],indices=[];
    for(let j=0;j<=nv;j++) for(let i=0;i<=nu;i++){pos.push(...fn(i/nu,j/nv));uv.push(i/nu,j/nv);}
    for(let j=0;j<nv;j++) for(let i=0;i<nu;i++){const a=j*(nu+1)+i;indices.push(a,a+nu+1,a+1,a+1,a+nu+1,a+nu+2);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();add(g,mat);
  };
  const rounded=(mat,x,y,z,w,h,d,r=.02,parent=car,rx=0)=>{
    r=Math.min(r,w/2,h/2,d/2);
    const g=new THREE.BoxGeometry(w,h,d,3,3,3), a=g.attributes.position;
    for(let i=0;i<a.count;i++){
      const v=new THREE.Vector3().fromBufferAttribute(a,i), c=new THREE.Vector3(THREE.MathUtils.clamp(v.x,-w/2+r,w/2-r),THREE.MathUtils.clamp(v.y,-h/2+r,h/2-r),THREE.MathUtils.clamp(v.z,-d/2+r,d/2-r));
      v.sub(c).normalize().multiplyScalar(r).add(c);a.setXYZ(i,v.x,v.y,v.z);
    }
    g.computeVertexNormals();g.rotateX(rx);g.translate(x,y,z);add(g,mat,parent);
  };
  const tube=(mat,points,r=.006,steps=16,parent=car)=>add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),steps,r,4,false),mat,parent);
  const mix=THREE.MathUtils.lerp;
  // Side skins and decks share the exact belt edge. Wheels are real apertures.
  const half=z=>W/2*(1-(sport?.16:.09)*Math.pow(Math.abs(z)/(L/2),4)) + (['hyper','prototype'].includes(form)? .025*Math.cos(z/L*2*Math.PI):0);
  const belt=z=>B-(sport?.12:.065)*Math.pow(Math.abs(z)/(L/2),4);
  const bottom=z=>{
    let y=clearance;
    for(const axle of [-p.wheelbase/2,p.wheelbase/2]){const d=z-axle,r=radius+.035;if(Math.abs(d)<r)y=Math.max(y,radius+Math.sqrt(r*r-d*d));}
    return y;
  };
  const skin=(side,z,v)=>[side*(half(z)-.025*(1-v)**3-.045*v**5),mix(bottom(z),belt(z),v),z];
  for(const side of [-1,1]){
    surface(paint,(u,v)=>skin(side,(u-.5)*L,v),80,6);
    for(const axle of [-p.wheelbase/2,p.wheelbase/2]){
      // Lip follows the same open stamping, with a curved outward rolled edge.
      surface(paint,(u,v)=>{const a=u*Math.PI,r=radius+.035+.025*v,z=axle+r*Math.cos(a);return [side*(half(z)-.023+.012*Math.sin(v*Math.PI)),radius+r*Math.sin(a),z];},24,3);
    }
  }
  const deck=(start,end)=>surface(paint,(u,v)=>{const z=mix(start,end,v);return [(2*u-1)*(half(z)-.045),belt(z)+.04*Math.sin(Math.PI*u),z];},24,12);
  deck(-L/2,cf);
  if(!pickup) deck(cr,L/2); // Never put an opaque deck across the cabin or pickup bed.
  for(const end of [-1,1]) surface(paint,(u,v)=>{
    const z=end*L/2;return [(2*u-1)*(half(z)-.025*(1-v)**3-.045*v**5),mix(clearance,belt(z)+.04*Math.sin(Math.PI*u),v),z];
  },24,8);
  rounded(trim,0,clearance-.035,0,W*.77,.06,L*.84);
  // The roof and each canopy panel use identical corners, with a mild crown.
  const roofEdge=(u)=>H-.045+.018*Math.sin(Math.PI*u);
  const sidePane=(side,u,v)=>{
    const z=mix(mix(cf,cr,u),mix(rf,rr,u),v);
    return [side*mix(half(z)-.045,p.roofWidth/2,v),mix(belt(z),roofEdge(u),v),z];
  };
  const endPane=(rear,u,v)=>{
    const z=mix(rear?cr:cf,rear?rr:rf,v),w=mix(half(z)-.045,p.roofWidth/2,v);
    return [(2*u-1)*w,mix(belt(z)+.04*Math.sin(Math.PI*u),H-.045+.045*Math.sin(Math.PI*u),v),z+(rear?1:-1)*.018*Math.sin(Math.PI*u)*Math.sin(Math.PI*v)];
  };
  const framed=(fn,a=0,b=1)=>{
    const inset=v=>.045+.035*(Math.exp(-v*24)+Math.exp(-(1-v)*24));
    surface(glass,(u,v)=>fn(mix(a+inset(v)*(b-a),b-inset(v)*(b-a),u),.12+.76*v),16,8);
    for(const [lo,hi] of [[0,.12],[.88,1]])surface(paint,(u,v)=>fn(mix(a,b,u),mix(lo,hi,v)),16,2);
    for(const edge of [0,1]){
      surface(paint,(u,v)=>fn(edge?b-inset(v)*(b-a)*u:a+inset(v)*(b-a)*u,.12+.76*v),3,10);
      const points=[];for(let i=0;i<=16;i++){const v=i/16;points.push(fn(edge?b-inset(v)*(b-a):a+inset(v)*(b-a),.12+.76*v));}tube(rubber,points,.004,16);
    }
    for(const v of [0,1]){const points=[];for(let i=0;i<=16;i++)points.push(fn(mix(a+inset(v)*(b-a),b-inset(v)*(b-a),i/16),.12+.76*v));tube(rubber,points,.004,16);}
  };
  framed((u,v)=>endPane(false,u,v));
  if(!open){
    surface(roof,(u,v)=>[(2*u-1)*p.roofWidth/2,roofEdge(v)+.045*Math.sin(Math.PI*u),mix(rf,rr,v)],24,16);
    framed((u,v)=>endPane(true,u,v));
    for(const side of [-1,1]){
      const splits=cargo?[0,.43,1]:p.doors===4?[0,.49,1]:[0,1];
      for(let i=1;i<splits.length;i++){
        const a=splits[i-1],b=splits[i];
        if(cargo && a>.4)surface(paint,(u,v)=>sidePane(side,mix(a,b,u),v),16,8);
        else framed((u,v)=>sidePane(side,u,v),a,b);
      }
    }
  } else {
    // Open cockpit: windshield only, no invisible roof or side-window mesh.
    for(const side of [-1,1])tube(chrome,[[side*W*.20,B+.02,cr-.20],[side*W*.20,H-.13,cr-.20],[side*W*.37,H-.13,cr-.20],[side*W*.37,B+.02,cr-.20]],.025,12);
  }
  if(pickup){
    const start=cr+.045,end=L/2-.07;
    rounded(rubber,0,clearance+.13,(start+end)/2,W*.85,.065,end-start);
    for(const side of [-1,1])rounded(paint,side*(W/2-.08),(B+clearance+.13)/2,(start+end)/2,.075,B-clearance-.13,end-start);
    rounded(paint,0,(B+clearance+.13)/2,start,W*.87,B-clearance-.13,.06);
    for(let i=-4;i<=4;i++)rounded(trim,i*W*.08,clearance+.17,(start+end)/2,.014,.018,end-start-.06,.006);
  }
  // Actual shut lines follow the sampled side rather than floating flat outlines.
  for(const side of [-1,1]){
    const n=p.doors/2;
    for(let door=0;door<n;door++){
      const a=mix(cf,cr,door/n)+.035,b=mix(cf,cr,(door+1)/n)-.035,points=[];
      const corners=[[a,.99],[b,.99],[b,.12],[a,.12],[a,.99]];
      for(let j=1;j<corners.length;j++)for(let i=0;i<=10;i++){const t=i/10,q=skin(side,mix(corners[j-1][0],corners[j][0],t),mix(corners[j-1][1],corners[j][1],t));q[0]+=side*.003;points.push(q);}
      tube(trim,points,.0025,40);
      const z=b-.14,q=skin(side,z,.83);rounded(chrome,q[0]+side*.013,q[1],z,.026,.027,.14,.01);
    }
    const mz=cf+.10,my=B+.12;
    tube(trim,[[side*(half(mz)-.03),my,mz],[side*(W/2+.08),my+.025,mz+.04]],.015,4);
    rounded(paint,side*(W/2+.10),my+.045,mz+.04,.17,.10,.13,.045);
    const mirror=new THREE.PlaneGeometry(.135,.07);mirror.translate(side*(W/2+.10),my+.045,mz+.109);add(mirror,chrome);
  }
  if(cargo || pickup){
    const z=L/2+.004;
    for(const side of [-1,1])tube(trim,[[side*W*.39,clearance+.08,z],[side*W*.39,B-.10,z],[side*.008,B-.10,z],[side*.008,clearance+.08,z]],.003,16);
    rounded(chrome,0,B*.68,z+.014,.16,.025,.02,.007);
  }
  // Recessed reflector bowls with continuous curved covers, generic lamp geometry.
  for(const end of [-1,1])for(const side of [-1,1]){
    const x=side*W*.29,y=B*.73,z=end*(L/2+.018),a=W*(sport?.105:.083),b=B*(sport?.050:.095);
    const point=(u,v,depth)=>{const t=u*Math.PI*2;return [x+a*v*Math.cos(t),y+b*v*Math.sin(t),z+end*depth];};
    surface(trim,(u,v)=>point(u,1+.14*v,.015*(1-v)),32,2);
    surface(end<0?chrome:red,(u,v)=>point(u,v,.008+.012*v*v),32,5);
    surface(lens,(u,v)=>point(u,v,.028+.012*(1-v*v)),32,5);
  }
  for(const end of [-1,1]){
    rounded(trim,0,clearance+.06,end*(L/2+.014),W*.76,.105,.055,.025);
    const g=new THREE.PlaneGeometry(.34,.075);if(end<0)g.rotateY(Math.PI);g.translate(0,clearance+.07,end*(L/2+.044));add(g,plate);
  }
  if(sport){
    for(const side of [-1,1])for(let i=0;i<3;i++)rounded(trim,side*W*.36,B+.01,cr+.07+i*.06,.18,.017,.027,.008);
    rounded(trim,0,clearance-.01,-L/2+.08,W*.83,.027,.16,.01);
  }
  // All cabin coordinates are derived from the physical canopy and belt.
  const seatX=W*.205, eyeY=B+(H-B)*.57, eyeZ=Math.min(mix(rf,rr,.48),cf+.95);
  const floorY=clearance+.085, cushionY=floorY+.13, dashZ=cf+.17, dashY=B-.035;
  rounded(rubber,0,floorY,(cf+cr)/2,W*.80,.055,cr-cf-.08);
  for(const side of [-1,1]){
    rounded(fabric,side*seatX,cushionY,eyeZ+.03,W*.25,.13,.49,.05);
    rounded(fabric,side*seatX,(cushionY+eyeY)/2,eyeZ+.27,W*.23,eyeY-cushionY,.12,.04,car,-.1);
    rounded(fabric,side*seatX,eyeY-.035,eyeZ+.29,W*.14,.16,.105,.04);
    for(const offset of [-1,1])rounded(trim,side*seatX+offset*W*.105,cushionY+.055,eyeZ+.03,.075,.13,.43,.025);
    rounded(trim,side*W*.425,(floorY+B)/2,(cf+cr)/2,.06,B-floorY,cr-cf-.08,.02);
    rounded(fabric,side*W*.404,B-.17,eyeZ,.04,.13,.57,.015);
    rounded(trim,side*W*.39,B-.20,eyeZ,.10,.06,.40,.02);
  }
  if(p.doors===4 && !pickup && cr-eyeZ>.8){
    rounded(fabric,0,cushionY+.03,cr-.36,W*.65,.13,.42,.05);
    rounded(fabric,0,(cushionY+eyeY)/2,cr-.15,W*.64,eyeY-cushionY,.11,.035);
  }
  rounded(trim,0,dashY,dashZ,W*.80,.16,.29,.04);
  const gaugeY=B+.045,gaugeZ=dashZ+.155;
  rounded(trim,-seatX,gaugeY,gaugeZ-.055,.39,.16,.13,.03);
  for(const [i,dx] of [-.085,.085].entries()){
    const x=-seatX+dx,g=new THREE.CircleGeometry(.060,28);g.translate(x,gaugeY,gaugeZ+.012);add(g,standard(i?'dial-rpm':'dial-speed','#24282a'));
    const ring=new THREE.TorusGeometry(.063,.004,4,24);ring.translate(x,gaugeY,gaugeZ+.013);add(ring,chrome);
    tube(red,[[x,gaugeY,gaugeZ+.017],[x-.032,gaugeY-.032,gaugeZ+.017]],.002,1);
  }
  const radio=new THREE.PlaneGeometry(.19,.057);radio.translate(0,dashY,gaugeZ+.004);add(radio,standard('console-radio','#ffffff'));
  for(const x of [-W*.34,W*.13,W*.34]){
    rounded(rubber,x,dashY,gaugeZ,.115,.06,.012,.005);
    for(let i=0;i<3;i++)rounded(chrome,x,dashY-.02+i*.02,gaugeZ+.008,.10,.003,.006,.001);
  }
  rounded(trim,0,floorY+.15,eyeZ-.19,.19,.24,.67,.035);
  tube(chrome,[[0,floorY+.26,eyeZ-.28],[0,floorY+.40,eyeZ-.30]],.013,3);
  rounded(rubber,0,floorY+.41,eyeZ-.30,.06,.045,.065,.02);
  const steerZ=gaugeZ+.23,steerY=B+.03;
  const steering=new THREE.TorusGeometry(.14,.014,6,28);steering.rotateX(-.22);steering.translate(-seatX,steerY,steerZ);add(steering,rubber);
  tube(trim,[[-seatX,dashY,dashZ],[-seatX,steerY,steerZ]],.023,3);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;tube(chrome,[[-seatX,steerY,steerZ],[-seatX+.128*Math.cos(a),steerY+.125*Math.sin(a),steerZ-.028*Math.sin(a)]],.009,2);}
  rounded(trim,-seatX,steerY,steerZ+.008,.065,.065,.03,.012);
  for(const dx of [-.11,0,.11])rounded(rubber,-seatX+dx,floorY+.055,dashZ+.09,.052,.08,.028,.008,car,-.3);
  for(const z of [-p.wheelbase/2,p.wheelbase/2])for(const side of [-1,1]){
    const wheel=new THREE.Group();wheel.name=`${z<0?'front':'rear'}-${side<0?'left':'right'}-wheel`;wheel.position.set(side*(W/2-.11),radius,z);car.add(wheel);wheels.push(wheel);
    const profile=[[.69,-.10],[.84,-.105],[.97,-.075],[1,-.04],[1,.04],[.97,.075],[.84,.105],[.69,.10]].map(([r,y])=>new THREE.Vector2(radius*r,y));
    const tire=new THREE.LatheGeometry(profile,28);tire.rotateZ(Math.PI/2);add(tire,rubber,wheel);
    const disc=new THREE.CylinderGeometry(radius*.59,radius*.59,.016,28);disc.rotateZ(Math.PI/2);disc.translate(side*.075,0,0);add(disc,chrome,wheel);
    rounded(red,side*.09,radius*.35,radius*.28,.034,.09,.05,.012,wheel);
    const rim=new THREE.TorusGeometry(radius*.69,.016,6,28);rim.rotateY(Math.PI/2);rim.translate(side*.107,0,0);add(rim,chrome,wheel);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(chrome,[[side*.11,radius*.12*Math.cos(a),radius*.12*Math.sin(a)],[side*.11,radius*.66*Math.cos(a+.08),radius*.66*Math.sin(a+.08)]],.014,2,wheel);}
    const hub=new THREE.CylinderGeometry(radius*.18,radius*.18,.025,16);hub.rotateZ(Math.PI/2);hub.translate(side*.113,0,0);add(hub,chrome,wheel);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rounded(trim,side*.132,radius*.12*Math.cos(a),radius*.12*Math.sin(a),.009,.012,.012,.003,wheel);}
  }
  for(const b of batches.values()){
    const g=new THREE.BufferGeometry();for(const name of ['position','normal','uv'])g.setAttribute(name,new THREE.Float32BufferAttribute(b[name],name==='uv'?2:3));g.setIndex(b.index);
    const mesh=new THREE.Mesh(g,b.mat);mesh.name=b.parent===car?b.mat.name:'wheel-component';mesh.castShadow=!b.mat.transparent;mesh.receiveShadow=true;b.parent.add(mesh);
  }
  car.userData={id,name:p.name,wheels,front:'-Z',showcaseOnly:true,cockpit:{eye:[-seatX,eyeY,eyeZ],target:[-seatX,eyeY-.015,-L]}};
  return car;
}
