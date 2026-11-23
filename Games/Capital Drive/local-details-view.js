import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { LANDMARKS, POOL_GATE_APPROACHES } from './landmarks.js';

const RANGE=110;
// Original small history notices, not copies of existing plaques or official artwork.
// Text facts: Canberra Tracks Manuka; ACT Kingston Powerhouse heritage register.
const GLYPHS={
 '1':'010/110/010/010/111','3':'110/001/010/001/110','9':'111/101/111/001/111',
 A:'010/101/111/101/101',B:'110/101/110/101/110',D:'110/101/101/101/110',
 E:'111/100/110/100/111',F:'111/100/110/100/100',H:'101/101/111/101/101',
 I:'111/010/010/010/111',L:'100/100/100/100/111',N:'101/111/111/111/101',
 O:'111/101/101/101/111',R:'110/101/110/101/101',S:'111/100/111/001/111',
 T:'111/010/010/010/010',W:'101/101/111/111/101',
};
const inside=(x,z,ring)=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
const distance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);};

export function createLocalDetailsView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Original local history details';scene.add(root);
  const material=new THREE.MeshLambertMaterial({vertexColors:true}),records=[],obstacles=[];
  let disposed=false;
  const poolGate=POOL_GATE_APPROACHES[0];
  const radii=[4,8,14,22,32],reach=radii.at(-1);
  const boundsFor=points=>({minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),
    minZ:Math.min(...points.map(p=>p[1])),maxZ:Math.max(...points.map(p=>p[1]))});
  const buildings=(map.buildings||[]).map(body=>({body,...boundsFor(body.points)}));
  const barriers=(map.barriers||[]).filter(body=>body.points).map(body=>({body,...boundsFor(body.points)}));
  const segments=(map.roads||[]).flatMap(road=>road.points.slice(1).map((b,i)=>({a:road.points[i],b,
    clearance:(road.width||2)/2+2,...boundsFor([road.points[i],b])})));
  const within=(item,base,pad)=>item.minX<=base[0]+pad&&item.maxX>=base[0]-pad&&item.minZ<=base[1]+pad&&item.maxZ>=base[1]-pad;
  const specifications=[['manuka-pool','1931','Pool opened in 1931',poolGate.outside],['manuka-oval','BLANDFORDIA','Earlier name: Blandfordia Recreation Reserve'],['kingston-powerhouse','WHISTLE','Historic powerhouse whistle and siren']];
  function clear(x,z,candidates) {
    if(map.bounds&&(x<map.bounds.minX+2||x>map.bounds.maxX-2||z<map.bounds.minZ+2||z>map.bounds.maxZ-2))return false;
    if(candidates.buildings.some(({body:b})=>inside(x,z,b.points)||b.points.some((a,i)=>distance(x,z,a,b.points[(i+1)%b.points.length])<2)))return false;
    if(candidates.barriers.some(({body:b})=>inside(x,z,b.points)||b.points.some((a,i)=>distance(x,z,a,b.points[(i+1)%b.points.length])<2)))return false;
    if(distance(x,z,poolGate.outside,poolGate.inside)<4)return false;
    return candidates.segments.every(s=>distance(x,z,s.a,s.b)>s.clearance);
  }
  for(const [id,label,fact,override] of specifications) {
    const anchor=LANDMARKS.find(s=>s.id===id);if(!anchor)continue;
    const base=override||[anchor.x+(id==='manuka-oval'?85:20),anchor.z];
    // Every probe is within reach; only source bounds outside its complete
    // clearance envelope are skipped. Original ordering and tests stay exact.
    const candidates={buildings:buildings.filter(b=>within(b,base,reach+2)),barriers:barriers.filter(b=>within(b,base,reach+2)),
      segments:segments.filter(s=>within(s,base,reach+s.clearance))};
    let spot=null;
    for(const radius of radii) {for(let i=0;i<16;i++){const a=i/16*Math.PI*2,x=base[0]+Math.cos(a)*radius,z=base[1]+Math.sin(a)*radius;if(clear(x,z,candidates)&&Number.isFinite(heightAt(x,z))){spot={x,z};break;}}if(spot)break;}
    if(!spot)continue;
    const y=heightAt(spot.x,spot.z),pieces=[];
    function box(x,dy,z,w,h,d,tint) {
      const g=new THREE.BoxGeometry(w,h,d).translate(spot.x+x,y+dy,spot.z+z),rgb=new THREE.Color(tint),colors=new Float32Array(g.attributes.position.count*3);
      for(let i=0;i<colors.length;i+=3)rgb.toArray(colors,i);g.setAttribute('color',new THREE.BufferAttribute(colors,3));pieces.push(g);
    }
    box(0,.75,0,.12,1.5,.12,0x73796b);box(0,1.65,0,2.8,.85,.12,0x77765f);
    const scale=Math.min(.105,2.5/(label.length*4-1)),left=-(label.length*4-1)*scale/2;
    for(let c=0;c<label.length;c++)for(const [row,pixels] of GLYPHS[label[c]].split('/').entries()) {
      for(let col=0;col<3;){if(pixels[col]!=='1'){col++;continue;}const start=col;while(col<3&&pixels[col]==='1')col++;box(left+(c*4+(start+col-1)/2)*scale,1.65+(2-row)*scale,.071,(col-start)*scale*.86,scale*.86,.018,0xe9dfc0);}
    }
    const geometry=mergeGeometries(pieces,false);pieces.forEach(g=>g.dispose());geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`Original history notice: ${label}`;mesh.visible=false;root.add(mesh);
    const descriptor=Object.freeze({id:`local-history-${id}`,landmarkId:id,x:spot.x,z:spot.z,anchor:Object.freeze({x:anchor.x,z:anchor.z}),label,fact,estimated:true,placementNote:'Authored notice near a real anchor; no claim an actual sign occupies this position.'});
    records.push({mesh,descriptor});
    obstacles.push(Object.freeze({id:descriptor.id,kind:'history-notice',height:2.1,points:Object.freeze([[-1.4,-.08],[1.4,-.08],[1.4,.08],[-1.4,.08]].map(([x,z])=>Object.freeze([spot.x+x,spot.z+z])))}));
  }
  function update(focus) {if(disposed)return;for(const {mesh,descriptor:d} of records)mesh.visible=!!focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)&&Math.hypot(focus.x-d.x,focus.z-d.z)<RANGE;}
  return {update,details:Object.freeze(records.map(r=>r.descriptor)),obstacles:Object.freeze(obstacles),
    get stats(){return Object.freeze({sites:records.length,drawCalls:disposed?0:records.filter(r=>r.mesh.visible).length,maxDrawCalls:3,triangles:records.reduce((n,r)=>n+r.mesh.geometry.index.count/3,0),geometryCount:records.length,materialCount:disposed?0:1,textureCount:0,cullDistance:RANGE,disposed});},
    dispose(){if(disposed)return;disposed=true;scene.remove(root);for(const {mesh} of records)mesh.geometry.dispose();material.dispose();}};
}
