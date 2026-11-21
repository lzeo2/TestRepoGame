import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { CAMPUS_BARRIERS, CAMPUS_BOUNDARY, CAMPUS_GATES } from './campus.js';

// Original procedural steel posts and open wire panels. Both batches follow the
// exact exported collision spans, including every estimated fixed-open gap.
export function createCampusView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Telopea Park School perimeter';scene.add(root);
  const solids=[],wires=[],entrancePieces=[],obstacles=[],entranceDetails=[];
  const ground=(x,z)=>{const y=heightAt(x,z);return Number.isFinite(y)?y:0;};
  const triangle=(a,b,c)=>solids.push(...a,...b,...c);
  function prism(points,base,top) {
    const bottom=points.map(([x,z])=>[x,base(x,z),z]),upper=points.map(([x,z])=>[x,top(x,z),z]);
    for(let i=0;i<4;i++){const j=(i+1)%4;triangle(bottom[i],bottom[j],upper[j]);triangle(bottom[i],upper[j],upper[i]);}
    triangle(upper[0],upper[1],upper[2]);triangle(upper[0],upper[2],upper[3]);
  }
  for(const span of CAMPUS_BARRIERS) {
    const [a,b]=[span.a,span.b],ya=ground(...a),yb=ground(...b);
    const terrain=(x,z)=>ya+((x-a[0])*(b[0]-a[0])+(z-a[1])*(b[1]-a[1]))/(span.width*span.width)*(yb-ya);
    const postWidth=Math.min(.09,span.width),fraction=postWidth/span.width;
    const post=span.points.map((p,i)=>i===1?[span.points[0][0]+(p[0]-span.points[0][0])*fraction,span.points[0][1]+(p[1]-span.points[0][1])*fraction]:i===2?[span.points[3][0]+(p[0]-span.points[3][0])*fraction,span.points[3][1]+(p[1]-span.points[3][1])*fraction]:p);
    prism(post,terrain,(x,z)=>terrain(x,z)+span.height);
    prism(span.points,(x,z)=>terrain(x,z)+span.height-.045,(x,z)=>terrain(x,z)+span.height);
    const line=(u,v)=>wires.push(...u,...v);
    for(const y of [.2,.6,1,1.4])line([a[0],ya+y,a[1]],[b[0],yb+y,b[1]]);
    const count=Math.max(1,Math.ceil(span.width/.42));
    for(let i=0;i<=count;i++) {
      const t=i/count,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t,y=ya+(yb-ya)*t;
      line([x,y+.1,z],[x,y+span.height-.05,z]);
    }
  }
  function geometry(values) {
    const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(values,3));
    result.computeBoundingSphere();return result;
  }
  const solidGeometry=geometry(solids),wireGeometry=geometry(wires);solidGeometry.computeVertexNormals();
  const solidMaterial=new THREE.MeshLambertMaterial({color:0x42494a});
  const wireMaterial=new THREE.LineBasicMaterial({color:0x63706b});
  const posts=new THREE.Mesh(solidGeometry,solidMaterial),panels=new THREE.LineSegments(wireGeometry,wireMaterial);
  posts.name='Campus fence posts and top rails';panels.name='Campus open wire panels';root.add(posts,panels);
  // Requested entrance cues, estimated beside the NSW Crescent mapped-path gate.
  // No inspected panorama establishes these poles or the arrangement of rocks.
  const gate=CAMPUS_GATES.find(g=>g.id==='telopea-gate-11'),dx=(gate.inside[0]-gate.outside[0])/6,dz=(gate.inside[1]-gate.outside[1])/6;
  const tx=dz,tz=-dx,yaw=Math.atan2(-tz,tx);
  const distance=(x,z,a,b)=>{const vx=b[0]-a[0],vz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*vx+(z-a[1])*vz)/(vx*vx+vz*vz||1)));return Math.hypot(x-a[0]-t*vx,z-a[1]-t*vz);};
  const inside=(x,z,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
  function clear(x,z,r) {
    return inside(x,z,CAMPUS_BOUNDARY)&&!(map.buildings||[]).some(b=>inside(x,z,b.points)||b.points.some((a,i)=>distance(x,z,a,b.points[(i+1)%b.points.length])<r))&&
      CAMPUS_GATES.every(g=>distance(x,z,g.outside,g.inside)>r+3)&&
      (map.roads||[]).every(road=>road.points.slice(1).every((b,i)=>distance(x,z,road.points[i],b)>(road.width||2)/2+r+.8));
  }
  function colored(g,tint) {
    if(g.index){const original=g;g=g.toNonIndexed();original.dispose();}g.deleteAttribute('uv');
    const rgb=new THREE.Color(tint),colors=new Float32Array(g.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3)rgb.toArray(colors,i);g.setAttribute('color',new THREE.BufferAttribute(colors,3));entrancePieces.push(g);
  }
  function add(g,x,z,tint) {colored(g.rotateY(yaw).translate(x,ground(x,z),z),tint);}
  let flagLayer=0;
  function flagBox(x,z,u,v,w,h,tint,roll=0) {add(new THREE.BoxGeometry(w,h,.016).rotateZ(roll).translate(u,v,.02+flagLayer++*.002),x,z,tint);}
  function star(x,z,u,v,r,points=7) {
    const positions=[];for(let i=0;i<points*2;i++) {const a=i*Math.PI/points,b=(i+1)*Math.PI/points,ra=i%2?r*.43:r,rb=(i+1)%2?r*.43:r;positions.push(u,v,.075,u+Math.sin(a)*ra,v+Math.cos(a)*ra,.075,u+Math.sin(b)*rb,v+Math.cos(b)*rb,.075);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();add(g,x,z,0xffffff);
  }
  for(const [index,side] of [-1,1].entries()) {
    let placement=null;
    for(const inset of [5,7,9,12,15]) {for(const along of [7,10,13,17,21]) {
      const x=gate.x+tx*along*side+dx*inset,z=gate.z+tz*along*side+dz*inset;
      if(clear(x,z,3.5)){placement={x,z};break;}
    }if(placement)break;}
    if(!placement)continue;
    const {x,z}=placement;
    entranceDetails.push(Object.freeze({kind:index?'Aboriginal flag':'Australian flag',x,z,gateId:gate.id,estimated:true}));
    add(new THREE.CylinderGeometry(.045,.06,6,8).translate(0,3,0),x,z,0xb7bdb6);
    if(index===0) {
      flagBox(x,z,.87,5,1.7,.85,0x142d67);
      // Union canton and Commonwealth/Southern Cross stars, original flat geometry.
      flagBox(x,z,.445,5.21,.85,.06,0xffffff,.42);flagBox(x,z,.445,5.21,.85,.06,0xffffff,-.42);
      flagBox(x,z,.445,5.21,.85,.022,0xc02d38,.42);flagBox(x,z,.445,5.21,.85,.022,0xc02d38,-.42);
      flagBox(x,z,.445,5.21,.85,.10,0xffffff);flagBox(x,z,.445,5.21,.10,.43,0xffffff);
      flagBox(x,z,.445,5.21,.85,.045,0xc02d38);flagBox(x,z,.445,5.21,.045,.43,0xc02d38);
      star(x,z,.44,4.79,.14);for(const [u,v,r,p] of [[1.29,5.27,.075,7],[1.08,5.02,.075,7],[1.49,5.02,.075,7],[1.28,4.73,.075,7],[1.43,4.88,.045,5]])star(x,z,u,v,r,p);
    } else {
      // Aboriginal Flag: black upper half, red lower half, centred yellow sun.
      // Commonwealth acquired copyright in 2022; government guidance permits free use.
      // https://www.pmc.gov.au/honours-and-symbols/australian-national-symbols/australian-aboriginal-flag
      flagBox(x,z,.87,5.21,1.7,.425,0x171717);flagBox(x,z,.87,4.79,1.7,.425,0xc62828);
      add(new THREE.CircleGeometry(.21,20).translate(.87,5,.075),x,z,0xf7d32b);
    }
    if(index===0) {
      const planterX=x+tx*1.6,planterZ=z+tz*1.6;
      add(new THREE.BoxGeometry(.7,.45,.7).translate(0,.225,0),planterX,planterZ,0x9f7758);
      add(new THREE.CylinderGeometry(.20,.16,.5,6).translate(0,.65,0),planterX,planterZ,0x526642);
      for(let petal=0;petal<7;petal++)add(new THREE.SphereGeometry(.1,5,3).translate(Math.cos(petal/7*Math.PI*2)*.12,.95+petal%2*.06,Math.sin(petal/7*Math.PI*2)*.12),planterX,planterZ,0xb94344);
      add(new THREE.BoxGeometry(1.15,.55,.08).translate(0,1.65,0),x,z,0x655c4b);
      const digits={1:'bc',2:'abdeg',3:'abcdg',8:'abcdefg',9:'abcdfg'};
      const segments={a:[0,.12,.10,.018],b:[.055,.065,.018,.10],c:[.055,-.065,.018,.10],d:[0,-.12,.10,.018],e:[-.055,-.065,.018,.10],f:[-.055,.065,.018,.10],g:[0,0,.10,.018]};
      for(const [row,year] of ['1923','1983'].entries())for(let i=0;i<4;i++)for(const segment of digits[year[i]]) {
        const [u,v,w,h]=segments[segment];add(new THREE.BoxGeometry(w,h,.015).translate((i-1.5)*.21+u,1.79-row*.28+v,.052),x,z,0xe8d9b2);
      }
      const points=[[-.35,-.35],[.35,-.35],[.35,.35],[-.35,.35]].map(([u,v])=>Object.freeze([planterX+Math.cos(yaw)*u+Math.sin(yaw)*v,planterZ-Math.sin(yaw)*u+Math.cos(yaw)*v]));
      obstacles.push(Object.freeze({id:'telopea-waratah-planter',kind:'planter',height:.45,points:Object.freeze(points)}));
      entranceDetails.push(Object.freeze({kind:'waratah and 1923/1983 plaque',x:planterX,z:planterZ,gateId:gate.id,estimated:true}));
    }
    const rockX=x-tx*1.1,rockZ=z-tz*1.1;
    add(new THREE.IcosahedronGeometry(1,0).scale(1.1,.6,.8).rotateY(index*.7).translate(0,.48,0),rockX,rockZ,index?0x888274:0xa39b88);
    const points=[[-1.1,-.8],[1.1,-.8],[1.1,.8],[-1.1,.8]].map(([u,v])=>Object.freeze([rockX+Math.cos(yaw)*u+Math.sin(yaw)*v,rockZ-Math.sin(yaw)*u+Math.cos(yaw)*v]));
    obstacles.push(Object.freeze({id:`telopea-entrance-rock-${index}`,kind:'rock',height:1.08,points:Object.freeze(points)}));
    entranceDetails.push(Object.freeze({kind:'rock',x:rockX,z:rockZ,gateId:gate.id,estimated:true}));
  }
  let entranceMesh=null,entranceGeometry=null,entranceMaterial=null;
  if(entrancePieces.length) {
    entranceGeometry=mergeGeometries(entrancePieces,false);entrancePieces.forEach(g=>g.dispose());entranceGeometry.computeBoundingSphere();
    entranceMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});entranceMesh=new THREE.Mesh(entranceGeometry,entranceMaterial);entranceMesh.name='Estimated entrance flags and rocks';root.add(entranceMesh);
  }
  const minX=Math.min(...CAMPUS_BOUNDARY.map(p=>p[0])),maxX=Math.max(...CAMPUS_BOUNDARY.map(p=>p[0]));
  const minZ=Math.min(...CAMPUS_BOUNDARY.map(p=>p[1])),maxZ=Math.max(...CAMPUS_BOUNDARY.map(p=>p[1]));
  let disposed=false;
  function update(focus) {
    if(disposed)return;
    if(entranceMesh)entranceMesh.visible=!!focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)&&Math.hypot(focus.x-gate.x,focus.z-gate.z)<100;
    root.visible=!!focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)&&
      Math.hypot(Math.max(minX-focus.x,0,focus.x-maxX),Math.max(minZ-focus.z,0,focus.z-maxZ))<500;
  }
  update(null);
  return {update,obstacles:Object.freeze(obstacles),entranceDetails:Object.freeze(entranceDetails),
    get stats(){return Object.freeze({barriers:CAMPUS_BARRIERS.length,gates:CAMPUS_GATES.length,
      visible:!disposed&&root.visible,drawCalls:!disposed&&root.visible?2+(entranceMesh?.visible?1:0):0,entranceDraws:!disposed&&root.visible&&entranceMesh?.visible?1:0,triangles:solids.length/9+(entranceGeometry?.attributes.position.count||0)/3,
      lineSegments:wires.length/6,geometryCount:2+(entranceGeometry?1:0),materialCount:2+(entranceMaterial?1:0),textureCount:0,disposed});},
    dispose(){if(disposed)return;disposed=true;root.visible=false;scene.remove(root);solidGeometry.dispose();wireGeometry.dispose();solidMaterial.dispose();wireMaterial.dispose();entranceGeometry?.dispose();entranceMaterial?.dispose();},
  };
}
