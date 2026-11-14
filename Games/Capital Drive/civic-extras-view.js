import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { EXTRA_STORES, SKATEPARK, SKATEPARK_LANDMARK, RAMP_SURFACES, BARRIERS } from './civic-extras.js';

// Original five-column bitmap lettering, emitted into the shared solid batch.
const LETTERS=['01110 10001 10001 11111 10001 10001 10001','11110 10001 10001 11110 10001 10001 11110','01111 10000 10000 10000 10000 10000 01111','11110 10001 10001 10001 10001 10001 11110','11111 10000 10000 11110 10000 10000 11111','11111 10000 10000 11110 10000 10000 10000','01111 10000 10000 10111 10001 10001 01111','10001 10001 10001 11111 10001 10001 10001','11111 00100 00100 00100 00100 00100 11111','00111 00010 00010 00010 10010 10010 01100','10001 10010 10100 11000 10100 10010 10001','10000 10000 10000 10000 10000 10000 11111','10001 11011 10101 10101 10001 10001 10001','10001 11001 10101 10011 10101 10011 10001','01110 10001 10001 10001 10001 10001 01110','11110 10001 10001 11110 10000 10000 10000','01110 10001 10001 10001 10101 10010 01101','11110 10001 10001 11110 10100 10010 10001','01111 10000 10000 01110 00001 00001 11110','11111 00100 00100 00100 00100 00100 00100','10001 10001 10001 10001 10001 10001 01110','10001 10001 10001 10001 10001 01010 00100','10001 10001 10001 10101 10101 10101 01010','10001 10001 01010 00100 01010 10001 10001','10001 10001 01010 00100 00100 00100 00100','11111 00001 00010 00100 01000 10000 11111'];

export function createCivicExtrasView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Civic parody storefronts and interpreted skatepark';scene.add(root);
  const positions=[],colors=[],ranges=[];const tint=new THREE.Color();
  const ground=(x,z)=>{const y=heightAt(x,z);if(!Number.isFinite(y))throw new Error('Civic extras require finite terrain height');return y;};
  function tri(a,b,c,color) {tint.set(color);for(const p of [a,b,c]){positions.push(...p);colors.push(tint.r,tint.g,tint.b);}}
  function quad(a,b,c,d,color) {tri(a,b,c,color);tri(a,c,d,color);}
  function box(point,w,h,d,color) {
    const p=[[-w/2,0,-d/2],[w/2,0,-d/2],[w/2,h,-d/2],[-w/2,h,-d/2],[-w/2,0,d/2],[w/2,0,d/2],[w/2,h,d/2],[-w/2,h,d/2]].map(q=>point(...q));
    for(const f of [[0,1,2,3],[4,7,6,5],[0,4,5,1],[3,2,6,7],[1,5,6,2],[0,3,7,4]])quad(...f.map(i=>p[i]),color);
  }
  for(const store of EXTRA_STORES) {
    const start=positions.length/3,f=store.frontage,angle=f.yaw+Math.PI,tx=Math.cos(angle),tz=-Math.sin(angle),nx=Math.sin(angle),nz=Math.cos(angle),base=ground(f.x,f.z);
    const at=(u,y,w)=>[f.x+tx*u+nx*w,base+y,f.z+tz*u+nz*w];
    const piece=(u,y,w,width,height,depth,color)=>box((x,h,z)=>at(u+x,y+h,w+z),width,height,depth,color);
    const width=f.width-.12,accent=store.type==='food'?0x854733:0x344765;
    piece(0,0,0,width,2.9,.10,0xc5baa5);
    piece(0,2.65,.10,width,.64,.12,accent);
    piece(0,.04,.10,.95,2.36,.06,0x303b42);
    piece(0,.62,.15,.72,1.58,.025,0x8ca6a8);
    for(const side of [-1,1])piece(side*(width/4+.25),.48,.13,Math.max(.45,(width-1.5)/2),1.8,.045,0x617d87);
    piece(0,2.48,.45,width,.10,.85,accent);
    const label=store.name.toUpperCase(),pixel=Math.min(.067,(width-.30)/(label.length*6));
    for(let n=0;n<label.length;n++) {
      const glyph=label[n]==="'"?'00100 00100 00000 00000 00000 00000 00000':LETTERS[label.charCodeAt(n)-65];
      if(!glyph)continue;
      const rows=glyph.split(' ');
      for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1') {
        const u=(n*6+x-label.length*3)*pixel,v=3.21-y*pixel;
        quad(at(u,v,.17),at(u+pixel*.88,v,.17),at(u+pixel*.88,v-pixel*.88,.17),at(u,v-pixel*.88,.17),0xfff4d8);
      }
    }
    ranges.push({x:f.x,z:f.z,start,count:positions.length/3-start,visible:true});
  }
  const skateStart=positions.length/3,boundary=SKATEPARK.polygon.slice(0,-1);
  for(const indices of THREE.ShapeUtils.triangulateShape(boundary.map(p=>new THREE.Vector2(...p)),[])) {
    const p=indices.map(i=>{const [x,z]=boundary[i];return [x,ground(x,z)+.035,z];});tri(p[2],p[1],p[0],0xa8aaa3);
  }
  const rampEdges=new Map();
  for(const surface of RAMP_SURFACES)for(const triangle of surface.triangles) {
    tri(...triangle.map(([x,y,z])=>[x,ground(x,z)+.045+y,z]),0xbcbcb2);
    for(let i=0;i<3;i++) {
      const a=triangle[i],b=triangle[(i+1)%3],key=[a.join(','),b.join(',')].sort().join('|');
      const edge=rampEdges.get(key);if(edge)edge.count++;else rampEdges.set(key,{a,b,count:1});
    }
  }
  for(const {a,b,count} of rampEdges.values())if(count===1&&(a[1]>0||b[1]>0)) {
    const ga=ground(a[0],a[2])+.045,gb=ground(b[0],b[2])+.045;
    quad([a[0],ga,a[2]],[b[0],gb,b[2]],[b[0],gb+b[1],b[2]],[a[0],ga+a[1],a[2]],0x90958f);
  }
  for(const rail of BARRIERS) {
    const dx=rail.b[0]-rail.a[0],dz=rail.b[1]-rail.a[1],length=Math.hypot(dx,dz),tx=dx/length,tz=dz/length,nx=-tz,nz=tx;
    const centre=[(rail.a[0]+rail.b[0])/2,(rail.a[1]+rail.b[1])/2],base=ground(...centre);
    box((x,y,z)=>[centre[0]+tx*x+nx*z,base+rail.height+y,centre[1]+tz*x+nz*z],length,.09,.09,0x394147);
    for(const p of [rail.a,rail.b])box((x,y,z)=>[p[0]+x,ground(...p)+y,p[1]+z],.09,rail.height,.09,0x394147);
  }
  ranges.push({x:SKATEPARK_LANDMARK.x,z:SKATEPARK_LANDMARK.z,start:skateStart,count:positions.length/3-skateStart,visible:true});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;root.add(mesh);
  const original=geometry.attributes.position.array.slice();let disposed=false,visible=0;
  function update(focus) {
    if(disposed)return;visible=0;let dirty=false;
    for(const range of ranges) {
      const show=!!focus&&Math.hypot(focus.x-range.x,focus.z-range.z)<190;
      if(show)visible++;
      if(show===range.visible)continue;range.visible=show;dirty=true;
      for(let i=range.start*3;i<(range.start+range.count)*3;i++)geometry.attributes.position.array[i]=show?original[i]:0;
    }
    if(dirty)geometry.attributes.position.needsUpdate=true;mesh.visible=visible>0;
  }
  update(null);
  return {update,get stats(){return {sites:EXTRA_STORES.length,skateparks:1,visible,drawCalls:visible?1:0,triangles:positions.length/9,geometryCount:1,materialCount:1,textureCount:0,disposed};},
    dispose(){if(disposed)return;disposed=true;visible=0;scene.remove(root);geometry.dispose();material.dispose();}};
}
