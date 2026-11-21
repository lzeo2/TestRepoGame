import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { SHOPPING_PRECINCTS, SHOPPING_BUILDING_IDS } from './shopping-precincts.js';
import { MAPPED_STORES } from './stores.js';

const RANGE = 450;
const strip = (a,b,width) => {
  const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
  if(length<.01)return null;
  const nx=-(b[1]-a[1])/length*width/2,nz=(b[0]-a[0])/length*width/2;
  return [[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]];
};
const paths=[...new Map(SHOPPING_PRECINCTS.flatMap(p=>p.paths).map(p=>[p.id,p])).values()];
// These are prop exclusions, not claims that an opaque source building is a passage.
export const SHOPPING_CLEARINGS=Object.freeze([
  ...paths.flatMap(p=>p.points.slice(1).map((b,i)=>strip(p.points[i],b,p.width+2))),
  ...MAPPED_STORES.map(s=>strip([s.frontage.x,s.frontage.z],[s.x,s.z],s.frontage.width+2)),
].filter(Boolean).map(p=>Object.freeze(p.map(v=>Object.freeze(v)))));

function inside(x,z,points) {
  let hit=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j];
    if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }
  return hit;
}
function distance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}

export function createShoppingView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Source shopping precinct exteriors';
  const solid={positions:[],colors:[]},glass={positions:[],colors:[]};
  const buildings=map.buildings||[],roads=(map.roads||[]).flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,width:r.width||7.5})));
  const buildingCells=new Map(),roadCells=new Map(),cell=32;
  function index(items,target,points,margin) {
    for(const item of items) {
      const p=points(item),m=margin(item);
      for(let x=Math.floor((Math.min(...p.map(v=>v[0]))-m)/cell);x<=Math.floor((Math.max(...p.map(v=>v[0]))+m)/cell);x++)
        for(let z=Math.floor((Math.min(...p.map(v=>v[1]))-m)/cell);z<=Math.floor((Math.max(...p.map(v=>v[1]))+m)/cell);z++) {
          const key=`${x},${z}`;if(!target.has(key))target.set(key,[]);target.get(key).push(item);
        }
    }
  }
  index(buildings,buildingCells,b=>b.points,()=>1);
  index(roads,roadCells,r=>[r.a,r.b],r=>r.width/2+1);
  const nearby=(target,x,z)=>target.get(`${Math.floor(x/cell)},${Math.floor(z/cell)}`)||[];
  const available=new Set(buildings.map(b=>b.id));
  const managed=SHOPPING_PRECINCTS.flatMap(p=>p.buildings).filter(b=>SHOPPING_BUILDING_IDS.includes(b.id)&&available.has(b.id));
  const counters={buildings:managed.length,precincts:SHOPPING_PRECINCTS.length,paths:0,pathSections:0,apronSections:0,furniture:0};
  const color=new THREE.Color();
  const y=(x,z)=>{const h=heightAt(x,z);if(!Number.isFinite(h))throw new Error('Shopping exteriors require finite terrain');return h;};
  function triangle(batch,a,b,c,tint) {
    color.set(tint);
    for(const p of [a,b,c]){batch.positions.push(...p);batch.colors.push(color.r,color.g,color.b);}
  }
  function quad(batch,a,b,c,d,tint){triangle(batch,a,b,c,tint);triangle(batch,a,c,d,tint);}
  function clear(x,z,margin=.12) {
    return !nearby(buildingCells,x,z).some(b=>inside(x,z,b.points)||b.points.some((a,i)=>distance(x,z,a,b.points[(i+1)%b.points.length])<margin))
      &&!nearby(roadCells,x,z).some(r=>distance(x,z,r.a,r.b)<r.width/2+.25);
  }
  function paved(q,tint) {
    // Half-metre subdivisions and perimeter samples prevent bridges through bodies/roads.
    const probes=[...q,[(q[0][0]+q[2][0])/2,(q[0][1]+q[2][1])/2],...q.map((a,i)=>[(a[0]+q[(i+1)%4][0])/2,(a[1]+q[(i+1)%4][1])/2])];
    if(!probes.every(p=>clear(...p)))return false;
    const candidates=new Set(q.flatMap(p=>nearby(buildingCells,...p)));
    const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
    const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;
    for(const building of candidates) {
      if(building.points.some(p=>inside(...p,q)))return false;
      if(q.some((a,i)=>building.points.some((b,j)=>intersects(a,q[(i+1)%4],b,building.points[(j+1)%building.points.length]))))return false;
    }
    const p=q.map(v=>[v[0],y(...v)+.14,v[1]]);
    quad(solid,p[0],p[3],p[2],p[1],tint);return true;
  }
  for(const path of paths) {
    let drawn=false;
    for(let i=1;i<path.points.length;i++) {
      const a=path.points[i-1],b=path.points[i],n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5);
      for(let j=0;j<n;j++) {
        const point=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        if(paved(strip(point(j/n),point((j+1)/n),path.width),0xb6a18e)){counters.pathSections++;drawn=true;}
      }
    }
    if(drawn)counters.paths++;
  }
  for(const building of managed) {
    const points=building.points.slice();
    if(points[0][0]===points.at(-1)[0]&&points[0][1]===points.at(-1)[1])points.pop();
    const base=Math.max(...points.map(p=>y(...p)))+.12,top=base+building.height;
    const area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    const shape=points.map(p=>new THREE.Vector2(...p));
    for(const face of THREE.ShapeUtils.triangulateShape(shape,[])) {
      const p=face.map(i=>[points[i][0],top,points[i][1]]);
      triangle(solid,p[2],p[1],p[0],0xb7b4a2);
    }
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(length<.01)continue;
      const nx=(area>0?1:-1)*(b[1]-a[1])/length,nz=(area>0?-1:1)*(b[0]-a[0])/length;
      function panel(batch,low,high,out,tint) {
        const aa=[a[0]+nx*out,low,a[1]+nz*out],bb=[b[0]+nx*out,low,b[1]+nz*out];
        const cc=[bb[0],high,bb[2]],dd=[aa[0],high,aa[2]];
        if(area>0)quad(batch,aa,dd,cc,bb,tint);else quad(batch,aa,bb,cc,dd,tint);
      }
      panel(solid,Math.min(y(...a),y(...b))-.2,top,0,0xd5c9af);
      panel(glass,base+.55,base+2.85,.035,0x49676c);
      panel(glass,base+4.8,base+7.65,.035,0x69868a);
      panel(solid,base+3.45,base+4.65,.055,0xe1d4b8);
      panel(solid,top-.6,top,.055,0xe1d4b8);
      // Broad dark canopy follows the ACT edge continuously, including the curved corner.
      const canopy=[a,b].map(p=>[p[0]+nx*1.55,base+3.18,p[1]+nz*1.55]);
      quad(solid,[a[0],base+3.18,a[1]],canopy[0],canopy[1],[b[0],base+3.18,b[1]],0x343d3e);
      panel(solid,base+3.02,base+3.18,1.55,0x343d3e);
      const n=Math.ceil(length/.5);
      for(let j=0;j<n;j++) {
        const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        const u=at(j/n),v=at((j+1)/n);
        if(paved([[u[0]+nx*.2,u[1]+nz*.2],[v[0]+nx*.2,v[1]+nz*.2],[v[0]+nx*2.8,v[1]+nz*2.8],[u[0]+nx*2.8,u[1]+nz*2.8]],0xb9aa95))counters.apronSections++;
      }
      // Restrained structural rhythm on long spans; no invented tenant plan.
      if(length>7)for(let d=2.5;d<length;d+=5) {
        const t=d/length,x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
        const w=.075,tx=(b[0]-a[0])/length*w,tz=(b[1]-a[1])/length*w;
        quad(solid,[x-tx+nx*.065,base+.5,z-tz+nz*.065],[x+tx+nx*.065,base+.5,z+tz+nz*.065],[x+tx+nx*.065,base+7.7,z+tz+nz*.065],[x-tx+nx*.065,base+7.7,z-tz+nz*.065],0xc9c5b3);
      }
    }
  }
  // A few low planters sit beside clear retail approaches, leaving the door corridor open.
  for(const store of MAPPED_STORES.filter(s=>SHOPPING_BUILDING_IDS.includes(s.buildingId)).slice(0,3)) {
    const f=store.frontage,nx=-Math.sin(f.yaw),nz=-Math.cos(f.yaw),tx=Math.cos(f.yaw),tz=-Math.sin(f.yaw);
    const x=f.x+nx*1.7+tx*(f.width/2+1),z=f.z+nz*1.7+tz*(f.width/2+1);
    const q=strip([x-tx*.55,z-tz*.55],[x+tx*.55,z+tz*.55],.6);
    if(!q.every(p=>clear(...p,.3))||MAPPED_STORES.some(s=>Math.hypot(x-s.x,z-s.z)<3))continue;
    const ground=y(x,z);
    for(let i=0;i<4;i++){const a=q[i],b=q[(i+1)%4];quad(solid,[a[0],ground,a[1]],[b[0],ground,b[1]],[b[0],ground+.45,b[1]],[a[0],ground+.45,a[1]],0x958976);}
    quad(solid,...q.map(p=>[p[0],ground+.46,p[1]]),0x536447);counters.furniture++;
  }
  const meshes=[],geometries=[],materials=[];
  for(const [batch,glazed] of [[solid,false],[glass,true]]) {
    if(!batch.positions.length)continue;
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const material=glazed?new THREE.MeshStandardMaterial({vertexColors:true,roughness:.3,metalness:.15,side:THREE.DoubleSide}):new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geometry,material);mesh.name=glazed?'Terrace glazing':'Shopping paving and architecture';root.add(mesh);meshes.push(mesh);geometries.push(geometry);materials.push(material);
  }
  scene.add(root);
  const xs=[],zs=[];for(const batch of [solid,glass])for(let i=0;i<batch.positions.length;i+=3){xs.push(batch.positions[i]);zs.push(batch.positions[i+2]);}
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs);
  const triangles=(solid.positions.length+glass.positions.length)/9;
  let disposed=false,visible=false;
  function update(focus){if(disposed)return;const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z);visible=!!valid&&Math.hypot(Math.max(minX-focus.x,0,focus.x-maxX),Math.max(minZ-focus.z,0,focus.z-maxZ))<RANGE;root.visible=visible;}
  update(null);
  return {update,get stats(){return Object.freeze({...counters,visible,drawCalls:visible?meshes.length:0,triangles,geometryCount:geometries.length,materialCount:materials.length,cullDistance:RANGE,disposed});},dispose(){if(disposed)return;disposed=true;visible=false;scene.remove(root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
}
