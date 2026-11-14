import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { roadProfile } from './road-network.js';

export const CIVIC_BUILDING_IDS=Object.freeze(['osm-46081156','osm-584970594','osm-584970595']);
const approachEdge=[[-231.17,-4135.75],[-266.14,-4209.99]];
const approachLength=Math.hypot(approachEdge[1][0]-approachEdge[0][0],approachEdge[1][1]-approachEdge[0][1]);
export const CIVIC_LANDMARKS=Object.freeze([Object.freeze({
  id:'canberra-centre',name:'Canberra Centre',radius:150,
  x:(approachEdge[0][0]+approachEdge[1][0])/2+(approachEdge[1][1]-approachEdge[0][1])/approachLength*4,
  z:(approachEdge[0][1]+approachEdge[1][1])/2-(approachEdge[1][0]-approachEdge[0][0])/approachLength*4,
  sourceBuildingId:'osm-46081156',anchorType:'estimated public-facing exterior approach',
  description:'Civic shopping centre at Bunda Street. Original facades follow mapped footprints; rooms are approximate.',
})]);
// These source bridge ways cross the lake. Other tagged overpasses are not lake decks.
const BRIDGE_IDS=new Set(['way/4878920','way/75247036','way/75247010','way/4878927','way/4878928']);
const GLYPHS=['01110 10001 10001 11111 10001 10001 10001','11110 10001 10001 11110 10001 10001 11110','01111 10000 10000 10000 10000 10000 01111','11110 10001 10001 10001 10001 10001 11110','11111 10000 10000 11110 10000 10000 11111','11111 10000 10000 11110 10000 10000 10000','01111 10000 10000 10111 10001 10001 01111','10001 10001 10001 11111 10001 10001 10001','11111 00100 00100 00100 00100 00100 11111','00111 00010 00010 00010 10010 10010 01100','10001 10010 10100 11000 10100 10010 10001','10000 10000 10000 10000 10000 10000 11111','10001 11011 10101 10101 10001 10001 10001','10001 11001 10101 10011 10001 10001 10001','01110 10001 10001 10001 10001 10001 01110','11110 10001 10001 11110 10000 10000 10000','01110 10001 10001 10001 10101 10010 01101','11110 10001 10001 11110 10100 10010 10001','01111 10000 10000 01110 00001 00001 11110','11111 00100 00100 00100 00100 00100 00100','10001 10001 10001 10001 10001 10001 01110','10001 10001 10001 10001 10001 01010 00100','10001 10001 10001 10101 10101 10101 01010','10001 10001 01010 00100 01010 10001 10001','10001 10001 01010 00100 00100 00100 00100','11111 00001 00010 00100 01000 10000 11111'];
const LABELS=['CAPITOL CENTRE','THREAD THEORY','BEAN THERE','BYTE BOUTIQUE'];
function distance(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
}

export function createCivicView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Civic centre and source bridge exteriors';scene.add(root);
  const body={positions:[],colors:[]},glass={positions:[],colors:[]},bridges={positions:[],colors:[]},signs={positions:[],uvs:[]};
  const color=new THREE.Color(),ownedGeometry=[],ownedMaterials=[],ownedTextures=[],barriers=[];
  const buildings=(map.buildings||[]).filter(b=>CIVIC_BUILDING_IDS.includes(b.id));
  const bridgeRoads=(map.roads||[]).filter(r=>BRIDGE_IDS.has(r.sourceId)&&r.sourceTags?.bridge==='yes');
  const segments=bridgeRoads.flatMap(r=>r.points.slice(1).map((b,i)=>({road:r,a:r.points[i],b,width:roadProfile(r).driveWidth})));
  const finiteHeight=(x,z)=>{const y=heightAt(x,z);if(!Number.isFinite(y))throw new Error('Civic view requires finite supplied terrain/deck height');return y;};
  function tri(batch,a,b,c,tint){color.set(tint);for(const p of [a,b,c]){batch.positions.push(...p);batch.colors.push(color.r,color.g,color.b);}}
  function quad(batch,a,b,c,d,tint){tri(batch,a,b,c,tint);tri(batch,a,c,d,tint);}
  function wall(batch,a,b,lowA,lowB,highA,highB,tint){quad(batch,[a[0],lowA,a[1]],[b[0],lowB,b[1]],[b[0],highB,b[1]],[a[0],highA,a[1]],tint);}
  function sign(a,b,base,labelIndex,width=12) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length,nx=tz,nz=-tx;
    const x=(a[0]+b[0])/2+nx*.12,z=(a[1]+b[1])/2+nz*.12,h=.85;
    const backing=[[-width/2-.2,-.62],[width/2+.2,-.62],[width/2+.2,.62],[-width/2-.2,.62]].map(p=>[x+tx*p[0]-nx*.025,base+p[1],z+tz*p[0]-nz*.025]);
    quad(body,...backing,0x303f43);
    const points=[[-width/2,-h/2],[width/2,-h/2],[width/2,h/2],[-width/2,h/2]].map(p=>[x+tx*p[0],base+p[1],z+tz*p[0]]);
    const v0=1-(labelIndex+1)/4,v1=1-labelIndex/4;
    const uvs=[[0,v0],[1,v0],[1,v1],[0,v1]];
    for(const i of [0,1,2,0,2,3]){signs.positions.push(...points[i]);signs.uvs.push(...uvs[i]);}
  }
  let facadeSpans=0;
  for(const building of buildings) {
    const points=building.points.map(p=>[...p]);if(points[0][0]===points.at(-1)[0]&&points[0][1]===points.at(-1)[1])points.pop();
    const area=points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0);
    if(area<0)points.reverse();
    const base=Math.max(...points.map(p=>finiteHeight(...p)))+.12;
    const connector=building.id==='osm-584970595',low=base+(connector?3.2:0),top=base+building.height;
    for(const face of THREE.ShapeUtils.triangulateShape(points.map(p=>new THREE.Vector2(...p)),[])) {
      const p=face.map(i=>[points[i][0],top,points[i][1]]);tri(body,p[2],p[1],p[0],0xb0b4af);
      if(connector)tri(body,[p[0][0],low,p[0][2]],[p[1][0],low,p[1][2]],[p[2][0],low,p[2][2]],0x868b84);
    }
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.02)continue;
      const tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length,nx=tz,nz=-tx;
      wall(body,a,b,connector?low:Math.min(finiteHeight(...a),finiteHeight(...b))-.15,connector?low:Math.min(finiteHeight(...a),finiteHeight(...b))-.15,top,top,0xcac6b8);
      const offset=(p,d)=>[p[0]+nx*d,p[1]+nz*d],u=offset(a,.04),v=offset(b,.04);
      const levels=connector?1:Math.max(1,Number(building.sourceTags?.['building:levels'])||2);
      for(let level=0;level<levels;level++) {
        const floor=connector?low:base+level*3.2;
        wall(glass,u,v,floor+.55,floor+.55,Math.min(top-.45,floor+2.55),Math.min(top-.45,floor+2.55),level===0?0x405c60:0x71878a);
        wall(body,offset(a,.065),offset(b,.065),floor+2.65,floor+2.65,Math.min(top,floor+3.05),Math.min(top,floor+3.05),0xe4ded0);
      }
      if(!connector&&length>12) {
        // A shallow canopy and restrained mullion rhythm, rather than a fictional tenant plan.
        quad(body,[a[0],base+2.9,a[1]],[a[0]+nx*1.4,base+2.9,a[1]+nz*1.4],[b[0]+nx*1.4,base+2.9,b[1]+nz*1.4],[b[0],base+2.9,b[1]],0x394748);
        for(let d=3;d<length;d+=7) {
          const aa=[a[0]+tx*(d-.06)+nx*.07,a[1]+tz*(d-.06)+nz*.07],bb=[a[0]+tx*(d+.06)+nx*.07,a[1]+tz*(d+.06)+nz*.07];
          wall(body,aa,bb,base+.5,base+.5,top-.4,top-.4,0xb5b9ae);
        }
        facadeSpans++;
      }
    }
    if(building.id==='osm-46081156') {
      sign(approachEdge[0],approachEdge[1],base+3.65,0,16);
      sign(points[37],points[38],base+3.65,1,12);
      sign(points[26],points[27],base+3.65,2,11);
      sign(points[0],points[1],base+3.65,3,12);
      // Original double entrance panels coincide with the exported clear Bunda-side approach.
      const a=approachEdge[0],b=approachEdge[1],mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,tx=(b[0]-a[0])/approachLength,tz=(b[1]-a[1])/approachLength;
      for(const side of [-1,1]) {
        const u=[mx+tx*(side*.65-.59)+tz*.09,mz+tz*(side*.65-.59)-tx*.09],v=[mx+tx*(side*.65+.59)+tz*.09,mz+tz*(side*.65+.59)-tx*.09];
        wall(glass,u,v,base+.08,base+.08,base+2.6,base+2.6,0x8ca8a4);
      }
    }
  }
  for(const segment of segments) {
    const {a,b,width}=segment,length=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/length,nz=(b[0]-a[0])/length,steps=Math.ceil(length/12);
    for(const side of [-1,1])for(let j=0;j<steps;j++) {
      const at=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],u=at(j/steps),v=at((j+1)/steps),off=width/2+1.9;
      const aa=[u[0]+nx*off*side,u[1]+nz*off*side],bb=[v[0]+nx*off*side,v[1]+nz*off*side];
      // Adjacent mapped carriageways must not have a parapet through their lanes.
      const middle=[(aa[0]+bb[0])/2,(aa[1]+bb[1])/2];
      if(segments.some(other=>other!==segment&&distance(...middle,other.a,other.b)<other.width/2+1.8))continue;
      const ya=finiteHeight(...u)+.14,yb=finiteHeight(...v)+.14,d=.18;
      const q=[[aa[0]+nx*d,aa[1]+nz*d],[bb[0]+nx*d,bb[1]+nz*d],[bb[0]-nx*d,bb[1]-nz*d],[aa[0]-nx*d,aa[1]-nz*d]];
      if(q.some(p=>segments.some(other=>distance(...p,other.a,other.b)<other.width/2+.3)))continue;
      wall(bridges,q[0],q[1],ya,yb,ya+1.05,yb+1.05,0xb9b5a7);wall(bridges,q[3],q[2],ya,yb,ya+1.05,yb+1.05,0xb9b5a7);
      quad(bridges,[q[0][0],ya+1.05,q[0][1]],[q[1][0],yb+1.05,q[1][1]],[q[2][0],yb+1.05,q[2][1]],[q[3][0],ya+1.05,q[3][1]],0xd7d0bb);
      barriers.push(Object.freeze({id:`civic-parapet-${barriers.length}`,sourceId:segment.road.sourceId,kind:'bridge-parapet',height:1.05,points:Object.freeze(q.map(p=>Object.freeze(p)))}));
    }
  }
  const makeMesh=(batch,material,name)=>{
    if(!batch.positions.length){material.dispose();return null;}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
    if(batch.colors)geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3));
    if(batch.uvs)geometry.setAttribute('uv',new THREE.Float32BufferAttribute(batch.uvs,2));
    geometry.computeVertexNormals();geometry.computeBoundingSphere();ownedGeometry.push(geometry);ownedMaterials.push(material);
    const mesh=new THREE.Mesh(geometry,material);mesh.name=name;root.add(mesh);return mesh;
  };
  const bodyMesh=makeMesh(body,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),'Civic exact source bodies');
  const glassMesh=makeMesh(glass,new THREE.MeshStandardMaterial({vertexColors:true,roughness:.28,metalness:.15,side:THREE.DoubleSide}),'Civic glazing and entry panels');
  const bridgeMesh=makeMesh(bridges,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),'Source lake bridge parapets');
  let signMesh=null;
  if(signs.positions.length) {
    const width=512,height=128,pixels=new Uint8Array(width*height*4);
    LABELS.forEach((label,row)=>{
      const left=Math.floor((width-(label.length*6-1)*3)/2);
      for(let c=0;c<label.length;c++) {
        if(label[c]===' ')continue;const rows=GLYPHS[label.charCodeAt(c)-65].split(' ');
        for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(rows[y][x]==='1')for(let dy=0;dy<3;dy++)for(let dx=0;dx<3;dx++) {
          const p=((height-1-row*32-5-y*3-dy)*width+left+c*18+x*3+dx)*4;pixels[p]=246;pixels[p+1]=237;pixels[p+2]=211;pixels[p+3]=255;
        }
      }
    });
    const texture=new THREE.DataTexture(pixels,width,height);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;ownedTextures.push(texture);
    signMesh=makeMesh(signs,new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,side:THREE.DoubleSide}),'Original Civic parody signs');
  }
  const centre=CIVIC_LANDMARKS[0];
  let disposed=false,visible=false,near=false,bridgeVisible=false;
  function update(focus) {
    if(disposed)return;const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z);
    const d=valid?Math.hypot(focus.x-centre.x,focus.z-centre.z):Infinity;visible=d<1050;near=d<550;
    bridgeVisible=!!valid&&segments.some(s=>distance(focus.x,focus.z,s.a,s.b)<1400);
    if(bodyMesh)bodyMesh.visible=visible;if(glassMesh)glassMesh.visible=near;if(signMesh)signMesh.visible=near;if(bridgeMesh)bridgeMesh.visible=bridgeVisible;
  }
  update(null);
  const centreTriangles=(body.positions.length+glass.positions.length+signs.positions.length)/9,bridgeTriangles=bridges.positions.length/9;
  return {update,barriers:Object.freeze(barriers),get stats(){return Object.freeze({buildings:buildings.length,facadeSpans,signs:signs.positions.length?4:0,bridgeSourceWays:new Set(bridgeRoads.map(r=>r.sourceId)).size,bridgeParapets:barriers.length,centreTriangles,bridgeTriangles,triangles:centreTriangles+bridgeTriangles,drawCalls:[bodyMesh&&visible,glassMesh&&near,signMesh&&near,bridgeMesh&&bridgeVisible].filter(Boolean).length,geometryCount:ownedGeometry.length,materialCount:ownedMaterials.length,textureCount:ownedTextures.length,visible,near,bridgeVisible,disposed});},dispose(){if(disposed)return;disposed=true;visible=near=bridgeVisible=false;scene.remove(root);ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());ownedTextures.forEach(t=>t.dispose());}};
}
