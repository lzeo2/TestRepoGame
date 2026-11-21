import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {airportRoadPosts} from './airport-road-details.js';

const CELL=500,MAX_RESIDENT=28,LOAD_RADIUS=1250,EVICT_RADIUS=1750;
const keyAt=(x,z)=>`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;
function segment(a,b,width) {
  const d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<.01)return null;
  const nx=-(b[1]-a[1])/d*width/2,nz=(b[0]-a[0])/d*width/2;
  return [[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]];
}

// Original low-poly exterior on the pinned terminal outline. Source rings and
// runway axes are shared with the map; heights and facade details are estimates.
export function createAirportView(scene,map,heightAt) {
  const root=new THREE.Group();root.name='Canberra Airport streamed exterior';scene.add(root);
  const airport=map.airport,cells=new Map(),resident=new Map();let disposed=false,created=0,evicted=0,pending=0;
  const color=new THREE.Color(),material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const add=(points,tint,height=.05,kind='ground')=>{
    const x=points.reduce((s,p)=>s+p[0]/points.length,0),z=points.reduce((s,p)=>s+p[1]/points.length,0),key=keyAt(x,z);
    if(!cells.has(key))cells.set(key,{key,x:(Math.floor(x/CELL)+.5)*CELL,z:(Math.floor(z/CELL)+.5)*CELL,items:[]});
    cells.get(key).items.push({points,tint,height,kind});
  };
  const posts=airportRoadPosts(map);
  for(const post of posts)add([[post.x,post.z]],0xe3ded0,1.05,'reflector');
  for(const s of airport?.surfaces||[]) {
    if(s.closed) add(s.points,0x898a80,.055);
    else for(let i=1;i<s.points.length;i++) {
      const a=s.points[i-1],b=s.points[i],p=segment(a,b,s.width);if(!p)continue;
      // Long source axes need intermediate terrain samples: endpoint-only
      // planes can disappear into the contour surface between distant nodes.
      const pieces=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/25));
      for(let piece=0;piece<pieces;piece++) {
        const point=t=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
        add(segment(point(piece/pieces),point((piece+1)/pieces),s.width),s.kind==='runway'?0x444a4a:0x737771,s.kind==='runway'?.10:.075);
      }
      if(s.kind==='runway') {
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]),tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length;
        for(let d=0;d<length;d+=60) {
          const e=Math.min(length,d+22),aa=[a[0]+tx*d,a[1]+tz*d],bb=[a[0]+tx*e,a[1]+tz*e],stripe=segment(aa,bb,.9);
          if(stripe)add(stripe,0xe8e4d5,.14);
        }
      }
    }
  }
  const terminal=(map.buildings||[]).find(b=>b.id===airport?.terminalBuildingId);
  if(terminal) {
    const points=terminal.points.slice(0,-1),height=terminal.height;
    if(points.reduce((sum,a,i)=>{const b=points[(i+1)%points.length];return sum+a[0]*b[1]-b[0]*a[1];},0)<0)points.reverse();
    add(points,0xb8beb9,height,'roof');
    for(let i=0;i<points.length;i++) {
      const a=points[i],b=points[(i+1)%points.length];add([a,b],0xb6c0bc,height,'wall');
      // Glazing bands follow the exact footprint; original cladding, no photos.
      add([a,b],0x344f59,11.5,'glass');
      const l=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(l>12)for(let d=0;d<l;d+=9) {
        const t=Math.min(1,d/l),u=Math.min(1,(d+.24)/l);
        add([[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t],[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]],0xcbd0c9,height,'mullion');
      }
    }
  }
  function build(cell) {
    const positions=[],colors=[];
    const tri=(a,b,c,tint)=>{color.set(tint);for(const p of [a,b,c]){positions.push(...p);colors.push(color.r,color.g,color.b);}};
    const quad=(a,b,c,d,tint)=>{tri(a,b,c,tint);tri(a,c,d,tint);};
    for(const item of cell.items) {
      const {points,tint,height,kind}=item;
      if(kind==='reflector') {
        const [[x,z]]=points,y=heightAt(x,z);
        quad([x-.1,y,z],[x+.1,y,z],[x+.1,y+height,z],[x-.1,y+height,z],tint);
        quad([x,y,z-.1],[x,y,z+.1],[x,y+height,z+.1],[x,y+height,z-.1],tint);
        quad([x-.11,y+.78,z-.015],[x+.11,y+.78,z-.015],[x+.11,y+.98,z-.015],[x-.11,y+.98,z-.015],0xd5b858);
      } else if(['wall','glass','mullion'].includes(kind)) {
        const [a,b]=points,base=Math.max(heightAt(...a),heightAt(...b));
        const low=base+(kind==='glass'?2.5:0),top=base+height;
        // Glazing is slightly outside the source wall to avoid coincident faces.
        const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1,off=kind==='glass'?.035:kind==='mullion'?.06:0;
        const ax=a[0]+dz/length*off,az=a[1]-dx/length*off,bx=b[0]+dz/length*off,bz=b[1]-dx/length*off;
        quad([ax,low,az],[bx,low,bz],[bx,top,bz],[ax,top,az],tint);
      } else {
        const ring=points.map(p=>new THREE.Vector2(...p)),flat=kind==='roof'?Math.max(...points.map(p=>heightAt(...p)))+height:null;
        for(const face of THREE.ShapeUtils.triangulateShape(ring,[])) {
          const p=face.map(i=>[points[i][0],flat??heightAt(...points[i])+height,points[i][1]]);tri(p[2],p[1],p[0],tint);
        }
      }
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=`Airport cell ${cell.key}`;root.add(mesh);resident.set(cell.key,{mesh,cell,triangles:positions.length/9,bytes:Object.values(geometry.attributes).reduce((s,a)=>s+a.array.byteLength,0)});created++;
  }
  function remove(key) {const item=resident.get(key);if(!item)return;root.remove(item.mesh);item.mesh.geometry.dispose();resident.delete(key);evicted++;}
  function update(focus) {
    if(disposed)return;
    const valid=focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z),distance=cell=>valid?Math.hypot(cell.x-focus.x,cell.z-focus.z):Infinity;
    for(const [key,item] of resident)if(distance(item.cell)>EVICT_RADIUS)remove(key);
    const desired=[...cells.values()].filter(cell=>distance(cell)<LOAD_RADIUS).sort((a,b)=>distance(a)-distance(b)).slice(0,MAX_RESIDENT);
    const wanted=new Set(desired.map(cell=>cell.key));
    for(const [key,item] of resident){item.mesh.visible=wanted.has(key);if(resident.size>=MAX_RESIDENT&&!wanted.has(key))remove(key);}
    // Bound frame-time creation. Idle updates finish the small queue.
    const queue=desired.filter(cell=>!resident.has(cell.key));pending=queue.length;
    for(const cell of queue.slice(0,2)){if(resident.size>=MAX_RESIDENT)break;build(cell);pending--;}
  }
  const stats=()=>Object.freeze({residentChunks:resident.size,maxResidentChunks:MAX_RESIDENT,sourceChunks:cells.size,pendingChunks:pending,createdChunks:created,evictedChunks:evicted,
    drawCalls:[...resident.values()].filter(i=>i.mesh.visible).length,triangles:[...resident.values()].reduce((s,i)=>s+i.triangles,0),bufferBytes:[...resident.values()].reduce((s,i)=>s+i.bytes,0),terminalFootprints:terminal?1:0,sourceSurfaces:airport?.surfaces.length||0,decorativePosts:posts.length,maxDecorativePosts:96,disposed});
  return {update,get stats(){return stats();},dispose(){if(disposed)return;disposed=true;for(const key of [...resident.keys()])remove(key);pending=0;material.dispose();scene.remove(root);}};
}
