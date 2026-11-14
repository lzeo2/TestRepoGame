import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { CAMPUS_BARRIERS, CAMPUS_BOUNDARY, CAMPUS_GATES } from './campus.js';

// Original procedural steel posts and open wire panels. Both batches follow the
// exact exported collision spans, including every estimated fixed-open gap.
export function createCampusView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Telopea Park School perimeter';scene.add(root);
  const solids=[],wires=[];
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
  const minX=Math.min(...CAMPUS_BOUNDARY.map(p=>p[0])),maxX=Math.max(...CAMPUS_BOUNDARY.map(p=>p[0]));
  const minZ=Math.min(...CAMPUS_BOUNDARY.map(p=>p[1])),maxZ=Math.max(...CAMPUS_BOUNDARY.map(p=>p[1]));
  let disposed=false;
  function update(focus) {
    if(disposed)return;
    root.visible=!!focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z)&&
      Math.hypot(Math.max(minX-focus.x,0,focus.x-maxX),Math.max(minZ-focus.z,0,focus.z-maxZ))<500;
  }
  update(null);
  return {update,
    get stats(){return Object.freeze({barriers:CAMPUS_BARRIERS.length,gates:CAMPUS_GATES.length,
      visible:!disposed&&root.visible,drawCalls:!disposed&&root.visible?2:0,triangles:solids.length/9,
      lineSegments:wires.length/6,geometryCount:2,materialCount:2,textureCount:0,disposed});},
    dispose(){if(disposed)return;disposed=true;root.visible=false;scene.remove(root);solidGeometry.dispose();wireGeometry.dispose();solidMaterial.dispose();wireMaterial.dispose();},
  };
}
