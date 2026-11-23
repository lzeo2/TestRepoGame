import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {roadProfile} from './road-network.js';

export const MACQUARIE_SHOPS_REFERENCE = Object.freeze({id:'macquarie-shops',name:'Macquarie Shops',
  x:-7008,z:-7760,radius:55,buildingIds:Object.freeze(['osm-807686377','osm-807686378']),
  source:Object.freeze({file:'belconnen-1-1.json',sha256:'31efb13b871c068aaed1960280ade85e82818249085e26f5d76a16a1c9e39c51',
    license:'ODbL-1.0',attribution:'© OpenStreetMap contributors',
    url:'https://api.openstreetmap.org/api/0.6/map.json?bbox=149.055000%2C-35.258250%2C149.075000%2C-35.243500'}),
  references:Object.freeze(['https://www.cityservices.act.gov.au/__data/assets/image/0012/2898363/macquarie-mural-1.jpg',
    'https://www.cityservices.act.gov.au/__data/assets/image/0004/2898364/macquarie-mural-2.jpg']),
  note:'Original material/planting interpretation of publicly viewed ACT shop-exterior photos. No copied photo, mural, logo, observed entrance, surveyed paving width or new collider.'});

// Exact local source driveway lines excluded even where the broad regional road
// overlay omits these parking aisles. Never paint the inferred foot strip there.
const DRIVEWAYS=[
  [[-6989.94,-7731.65],[-6966.3,-7756.41],[-6958.7,-7763.74],[-6945.2,-7777.59],[-6941.7,-7781.19]],
  [[-6966.3,-7756.41],[-6973.16,-7763.15],[-7005.73,-7795.17],[-7009.94,-7799.31],[-7012.02,-7802.41],[-7012.62,-7804.99]],
  [[-6941.7,-7781.19],[-6934.41,-7788.67]],
  [[-7035.96,-7757.78],[-7005.1,-7728.95],[-7003.75,-7727.68]],
  [[-7012.62,-7804.99],[-7011.89,-7809.93],[-7010.39,-7817.98],[-7008.5,-7828.04]],
  [[-7003.75,-7727.68],[-6995.65,-7728.55],[-6989.94,-7731.65]],
];
const PLAYGROUND=[[-7029.96,-7808.42],[-7030.35,-7803.96],[-7032.26,-7800.56],[-7031.89,-7798.19],[-7032.84,-7796.83],[-7035.78,-7795.47],[-7041.5,-7792.61],[-7043.34,-7791.16],[-7044.5,-7795.81],[-7044.62,-7810.29],[-7029.96,-7808.42]];
const inside=(x,z,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])yes=!yes;
}return yes;};
const segmentDistance=(x,z,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);};

export function createMacquarieShopsView(scene,map,heightAt,{canStand=()=>true}={}){
  const site=MACQUARIE_SHOPS_REFERENCE,buildings=site.buildingIds.map(id=>map.buildings?.find(b=>b.id===id)).filter(Boolean);
  const stats={buildings:buildings.length,triangles:0,drawCalls:0,pavingJoints:0,shrubs:0,stonePieces:0};
  const root=new THREE.Group();root.name='Macquarie source shops original detail';
  const positions=[],colors=[],color=new THREE.Color();let disposed=false,geometry=null,material=null,mesh=null;
  const ground=(x,z)=>{const y=heightAt(x,z);if(!Number.isFinite(y))throw new Error('Macquarie detail requires finite terrain');return y;};
  function tri(a,b,c,tint){color.setHex(tint);for(const p of[a,b,c]){positions.push(p[0]-site.x,p[1],p[2]-site.z);colors.push(color.r,color.g,color.b);}stats.triangles++;}
  function quad(a,b,c,d,tint){tri(a,b,c,tint);tri(a,c,d,tint);}
  const roads=(map.roads||[]).filter(r=>r.points?.some(p=>Math.hypot(p[0]-site.x,p[1]-site.z)<180));
  const nearby=(map.buildings||[]).filter(b=>b.points?.some(p=>Math.hypot(p[0]-site.x,p[1]-site.z)<120));
  function clear(x,z,margin=.25){
    if(!canStand({x,z,yaw:0})||nearby.some(b=>inside(x,z,b.points)))return false;
    for(const r of roads){const gap=roadProfile(r).driveWidth/2+roadProfile(r).pavementWidth+.3+margin;
      for(let i=1;i<r.points.length;i++)if(segmentDistance(x,z,r.points[i-1],r.points[i])<gap)return false;}
    for(const r of DRIVEWAYS)for(let i=1;i<r.length;i++)if(segmentDistance(x,z,r[i-1],r[i])<2.25+margin)return false;
    return true;
  }
  function groundStrip(a,b,width,tint){
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<.01)return false;
    const nx=-(b[1]-a[1])/length*width/2,nz=(b[0]-a[0])/length*width/2;
    const ps=[[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]];
    for(let i=0;i<=Math.ceil(length/.3);i++){const t=i/Math.ceil(length/.3);if(!clear(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}
    if(!ps.every(p=>clear(...p)))return false;
    quad(...ps.map(p=>[p[0],ground(...p)+.045,p[1]]),tint);return true;
  }
  for(const building of buildings){
    const ring=building.points.slice(0,-1),area=ring.reduce((s,a,i)=>{const b=ring[(i+1)%ring.length];return s+a[0]*b[1]-b[0]*a[1];},0);
    const base=Math.max(...ring.map(p=>ground(...p)))+.12,roof=base+building.height;
    for(let i=0;i<ring.length;i++){
      const a=ring[i],b=ring[(i+1)%ring.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(length<3)continue;
      const tx=(b[0]-a[0])/length,tz=(b[1]-a[1])/length,nx=(area>0?tz:-tz),nz=(area>0?-tx:tx);
      const at=(u,y,offset=.028)=>[a[0]+tx*u+nx*offset,y,a[1]+tz*u+nz*offset];
      quad(at(0,roof-.29,.05),at(length,roof-.29,.05),at(length,roof+.02,.05),at(0,roof+.02,.05),0xd7d6cc);
      // Shallow original mortar courses, preserving every existing door/window.
      for(let y=base+.22;y<Math.min(roof-.35,base+1.05);y+=.22)quad(at(0,y),at(length,y),at(length,y+.018),at(0,y+.018),0xb4a59a);
      for(let u=1;u<length-1;u+=1.8){
        const p=offset=>[a[0]+tx*u+nx*offset,a[1]+tz*u+nz*offset];
        if(groundStrip(p(1.2),p(2.5),.024,0x8f8b80))stats.pavingJoints++;
      }
    }
  }
  // Original low clusters on the mapped playground fringe, away from source
  // aisles and the shop approach. Positions/materials are estimates, not a
  // transcription of a photographed planting plan or new physical boundaries.
  if(buildings.length===site.buildingIds.length)for(const[x,z]of[[-7042.4,-7807.6],[-7039.8,-7807.3],[-7037.1,-7806.9]]){
    if(!inside(x,z,PLAYGROUND)||![-1,0,1].every(dx=>[-1,0,1].every(dz=>clear(x+dx,z+dz,.6))))continue;
    const y=ground(x,z);
    for(let k=0;k<3;k++){
      const cx=x+(k-1)*.42,cz=z+(k%2)*.32,r=.52,h=.62+(k%2)*.18;
      const top=[cx,y+h,cz];for(let j=0;j<6;j++){
        const a=j*Math.PI/3,b=(j+1)*Math.PI/3;
        tri([cx+Math.cos(a)*r,y+.17,cz+Math.sin(a)*r],[cx+Math.cos(b)*r,y+.17,cz+Math.sin(b)*r],top,j%2?0x68784e:0x7e895c);
      }stats.shrubs++;
    }
    // Small masonry-coloured ground edging stays below a shoe sole, adding no
    // invented retaining wall that the unchanged actor could walk through.
    for(let k=0;k<4;k++)if(groundStrip([x-1+k*.5,z+1.35],[x-.59+k*.5,z+1.35],.15,k%2?0x89897d:0xa4a18f))stats.stonePieces++;
  }
  if(stats.triangles>2200)throw new Error('Macquarie shop detail triangle cap');
  if(positions.length){
    geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();
    material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});mesh=new THREE.Mesh(geometry,material);mesh.visible=false;
    root.position.set(site.x,0,site.z);root.add(mesh);scene.add(root);
  }
  return{stats,update(focus){if(disposed||!mesh)return;mesh.visible=Number.isFinite(focus?.x)&&Number.isFinite(focus?.z)&&Math.hypot(focus.x-site.x,focus.z-site.z)<320;stats.drawCalls=Number(mesh.visible);},
    dispose(){if(disposed)return;disposed=true;geometry?.dispose();material?.dispose();root.removeFromParent();stats.drawCalls=0;}};
}
