import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// A tiny single-batch fictional compound. GPU buffers exist only near the depot;
// source footprints and fences remain with simulation when the view is evicted.
export function createDefenceDepotView(scene,map,heightAt) {
  const depot=map.defenceDepot,root=new THREE.Group();root.name='Fictional Capital Defence Depot';scene.add(root);
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  let mesh=null,disposed=false,loads=0,evictions=0;
  const stats={residentBytes:0,triangles:0,draws:0,pendingChunks:0,loads:0,evictions:0};
  function build() {
    const positions=[],colors=[],color=new THREE.Color(),p=depot.point;
    const tri=(a,b,c,tint)=>{color.set(tint);for(const vertex of [a,b,c]){positions.push(...vertex);colors.push(color.r,color.g,color.b);}};
    const quad=(a,b,c,d,tint)=>{tri(a,b,c,tint);tri(a,c,d,tint);};
    const vertex=(u,v,y)=>{const [x,z]=p(u,v);return [x,heightAt(x,z)+y,z];};
    const box=(u,v,w,h,d,tint,base=0,topColor=0xa0a493)=>{
      const q=[vertex(u-w/2,v-d/2,base),vertex(u+w/2,v-d/2,base),vertex(u+w/2,v+d/2,base),vertex(u-w/2,v+d/2,base)];
      const top=q.map(a=>[a[0],a[1]+h,a[2]]);
      for(let i=0;i<4;i++){const j=(i+1)%4;quad(q[i],q[j],top[j],top[i],tint);}quad(...top,topColor);
    };
    // Small terrain-draped apron tiles retain the mapped ground instead of a
    // large floating flat slab. The real approach remains an ordinary road.
    // Leave a twenty-metre central corridor for the road and its shoulders.
    // Independent draped meshes must never compete for the same asphalt area.
    for(let u=-40;u<40;u+=10)for(let v=5;v<45;v+=10){
      if(u>=-10&&u<10)continue;
      quad(vertex(u,v,.18),vertex(u+10,v,.18),vertex(u+10,v+10,.18),vertex(u,v+10,.18),0x77796e);
    }
    const mark=(u,v,w,d,h,tint)=>quad(vertex(u-w/2,v-d/2,h),vertex(u+w/2,v-d/2,h),vertex(u+w/2,v+d/2,h),vertex(u-w/2,v+d/2,h),tint);
    mark(0,64,12,12,.087,0x515659);
    mark(-1.15,64,.45,3.8,.103,0xf3e5b4);
    mark(1.15,64,.45,3.8,.103,0xf3e5b4);
    mark(0,64,2.3,.45,.103,0xf3e5b4);
    for(const {kind,u,v} of depot.parkedVehicles){
      if(kind==='tank'){
        for(const side of [-1,1]){
          box(u+side*1.7,v,1,.97,6.6,0x333935,.2,0x424944);
          for(let i=-2;i<=2;i++)box(u+side*2.14,v+i*1.04,.12,.27,.72,0x666c5a,.46,0x777d6a);
        }
        box(u,v,3.7,.92,5.9,0x53644d,1,0x697a59);
        box(u,v+.3,2.5,1.1,2.8,0x53644d,1.92,0x697a59);
        box(u,v-1.65,.32,.35,2.4,0x535f50,2.3,0x65725d);
      }else{
        box(u,v,2.8,1.54,12.8,0x787c79,.59,0xa1a7a2);
        box(u,v+2.8,1.8,.96,2.5,0x2f4d58,2.1,0x567d86);
        for(const side of [-1,1]){
          const wing=(dx,dz,y)=>vertex(u+side*dx,v+dz,y);
          tri(wing(1.3,-.55,1.66),wing(6,-.55,1.32),wing(6,2.35,1.33),0x89938d);
          tri(wing(1.3,-.55,1.66),wing(6,2.35,1.33),wing(1.3,2.35,1.63),0x89938d);
          box(u+side*.97,v-1.3,.55,.52,.75,0x2c3334,.2,0x404844);
        }
        tri(vertex(u,v-5.9,2),vertex(u,v-3.8,4.1),vertex(u,v-2.9,2),0x929d97);
      }
    }
    for(const u of [-25,25]){
      box(u,68,28,7,40,0x737b65);
      const a=vertex(u-14,48,7),b=vertex(u+14,48,7),c=vertex(u,48,9),aa=vertex(u-14,88,7),bb=vertex(u+14,88,7),cc=vertex(u,88,9);
      tri(a,b,c,0x969b86);tri(aa,cc,bb,0x969b86);quad(a,c,cc,aa,0x565f55);quad(c,b,bb,cc,0x616a5d);
      // Broad shutter faces and high horizontal seams make the hangars legible.
      for(let row=0;row<6;row++)quad(vertex(u-10,47.95,.2+row),vertex(u+10,47.95,.2+row),vertex(u+10,47.95,1.1+row),vertex(u-10,47.95,1.1+row),row%2?0x4c554b:0x566052);
    }
    box(17,12,9,3.2,9,0xa29f8c);box(17,12,10,.25,10,0x5c655b,3.2);
    quad(vertex(14,7.45,1.2),vertex(20,7.45,1.2),vertex(20,7.45,2.5),vertex(14,7.45,2.5),0x405763);
    for(const [u,v,w,d] of [[-25.5,0,39,.25],[25.5,0,39,.25],[-45,50,.25,100],[45,50,.25,100],[0,100,90,.25]])box(u,v,w,2.2,d,0x7c8273);
    // White gate posts emphasize a usable twelve-metre opening; no barrier arm.
    for(const u of [-6.5,6.5]){box(u,0,.55,2.5,.55,0xcac9b6);box(u,0,.6,.25,.6,0xd4b653,1.7);}
    box(-23,-.5,20,2.8,.35,0x343d36,2.6);
    const glyphs={D:['11110','10001','10001','10001','11110'],E:['11111','10000','11110','10000','11111'],P:['11110','10001','11110','10000','10000'],O:['01110','10001','10001','10001','01110'],T:['11111','00100','00100','00100','00100']};
    for(const [index,letter] of [...'DEPOT'].entries())for(let row=0;row<5;row++)for(let column=0;column<5;column++)if(glyphs[letter][row][column]==='1'){
      const u=-31+index*3.1+column*.5,y=4.8-row*.45;
      quad(vertex(u,-.7,y),vertex(u+.4,-.7,y),vertex(u+.4,-.7,y+.35),vertex(u,-.7,y+.35),0xf1e7c4);
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Uint8BufferAttribute(colors.map(c=>Math.round(Math.min(1,c)*255)),3,true));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    mesh=new THREE.Mesh(geometry,material);mesh.name='Fictional depot hangars guardhouse fence and sign';root.add(mesh);
    stats.residentBytes=Object.values(geometry.attributes).reduce((n,a)=>n+a.array.byteLength,0);stats.triangles=positions.length/9;stats.draws=1;stats.loads=++loads;
  }
  function evict(){if(!mesh)return;root.remove(mesh);mesh.geometry.dispose();mesh=null;stats.residentBytes=stats.triangles=stats.draws=0;stats.evictions=++evictions;}
  function update(focus){if(disposed||!depot)return;const distance=focus?Math.hypot(focus.x-depot.landmark.x,focus.z-depot.landmark.z):Infinity;if(distance>950)evict();else if(distance<700&&!mesh)build();root.visible=distance<800;}
  function dispose(){if(disposed)return;disposed=true;evict();material.dispose();scene.remove(root);}
  return {update,dispose,stats};
}
