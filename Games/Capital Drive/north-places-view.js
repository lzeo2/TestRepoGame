import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const finite=n=>Number.isFinite(n)?n:0;
const PALETTE={concrete:0xb8b5aa,dark:0x39474d,glass:0x456773,rust:0x937259,blue:0x8ba8aa};
const validPoints=points=>(points||[]).filter(p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)).slice(0,96);

// Original interpretive geometry. The map's tower footprint remains authoritative;
// the dry pool outlines are scenery, with no public-access or operating-ride claim.
export function createNorthPlacesView(scene,{tower,towerFootprint,waterpark,heightAt=()=>0}={}) {
  const roots=[],geometries=new Set(),materials=new Set(),textures=new Set();
  const counters={towerInstances:0,waterparkInstances:0,pools:0,slideTriangles:0};
  const physicalProps=[];
  let disposed=false;
  const ground=(x,z)=>finite(heightAt(x,z));
  const own=g=>(geometries.add(g),g);
  const material=(options)=>{const m=new THREE.MeshLambertMaterial(options);materials.add(m);return m;};
  const box=own(new THREE.BoxGeometry(1,1,1)),cylinder=own(new THREE.CylinderGeometry(1,1,1,24));
  function batch(root,geometry,items,far=false){
    if(!items.length)return;
    const mesh=new THREE.InstancedMesh(geometry,material({color:0xffffff,fog:!far}),items.length),pose=new THREE.Object3D(),color=new THREE.Color();
    for(const [i,item] of items.entries()){
      pose.position.set(...item.position);pose.scale.set(...item.size);pose.rotation.set(...(item.rotation||[0,0,0]));pose.updateMatrix();
      mesh.setMatrixAt(i,pose.matrix);mesh.setColorAt(i,color.setHex(item.color));
    }
    mesh.computeBoundingSphere();root.add(mesh);
  }
  function siteRoot(spec,name,range){
    const root=new THREE.Group();root.name=name;root.position.set(finite(spec.x),ground(spec.x,spec.z),finite(spec.z));root.rotation.y=finite(spec.yaw);
    scene.add(root);roots.push({root,range,x:root.position.x,z:root.position.z});return root;
  }
  if(tower){
    const root=siteRoot(tower,'Black Mountain Tower interpretive model',10000),pieces=[];
    const height=195.2;
    const ring=(y,r,h,color)=>pieces.push({position:[0,y+h/2,0],size:[r,h,r],color});
    const footprint=validPoints(towerFootprint);
    if(footprint.length>3&&footprint[0][0]===footprint.at(-1)[0]&&footprint[0][1]===footprint.at(-1)[1])footprint.pop();
    if(footprint.length>=3){
      const c=Math.cos(root.rotation.y),s=Math.sin(root.rotation.y);
      const base=footprint.map(([x,z])=>{
        const dx=x-root.position.x,dz=z-root.position.z;
        return [dx*c-dz*s,ground(x,z)-root.position.y-.12,dx*s+dz*c];
      });
      const roof=Math.max(...base.map(point=>point[1]))+4.12;
      const top=base.map(([x,,z])=>[x,roof,z]),vertices=[];
      for(const triangle of THREE.ShapeUtils.triangulateShape(top.map(([x,,z])=>new THREE.Vector2(x,z)),[])){
        for(const index of triangle)vertices.push(...top[index]);
      }
      for(let i=0;i<base.length;i++){
        const j=(i+1)%base.length;
        for(const point of [base[i],base[j],top[i],top[i],base[j],top[j]])vertices.push(...point);
      }
      const geo=own(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
      const podium=new THREE.Mesh(geo,material({color:PALETTE.concrete,fog:false,side:THREE.DoubleSide}));
      podium.name='Tower podium on the mapped footprint';root.add(podium);
    }else ring(0,9,2,PALETTE.concrete);
    // The open lower terraces and the enclosed two-storey drum have distinct
    // profiles. Original broad silhouettes are sufficient at skyline distances.
    for(const [y,r,h] of [[1,5.5,53],[54,5.2,48],[102,3.7,15]])ring(y,r,h,PALETTE.concrete);
    const antennas=[];
    for(const [y,r] of [[54,15.1],[61.1,15.3],[68.2,15.1]]){
      ring(y,r,1.2,0xd5ceba);
      ring(y+1.2,r*.95,.22,0x888577);
      for(let i=0;i<6;i++){
        const angle=(i/6+(y===61.1?.08:0))*Math.PI*2;
        antennas.push({position:[Math.sin(angle)*(r-1),y+2.5,Math.cos(angle)*(r-1)],size:[.19,3.6,.19],color:0x68716f});
      }
      for(let i=0;i<5;i++) {
        const angle=(i/5+(y===61.1?.13:.025))*Math.PI*2;
        pieces.push({position:[Math.sin(angle)*(r-.25),y+2.25,Math.cos(angle)*(r-.25)],
          size:[1.52,.40,1.52],rotation:[Math.PI/2,0,-angle],color:0xe0e0d3});
      }
    }
    // Step the soffit outward under the glass crown. Pale mullions interrupt
    // two dark horizontal belts, with small open terraces above them.
    for(const [y,r,h] of [[72,7.8,1.2],[73.2,9.5,1.2],[74.4,11,1.2],[75.6,12.8,1.4],
      [77,13.65,1.4],[78.4,13.65,2.4],[80.8,13.65,.8],[81.6,13.65,2.4],[84,13.8,1.0],
      [87.5,8.9,.75],[91,7.5,.65]])ring(y,r,h,[78.4,81.6].includes(y)?0x3f5153:0xd1cbb7);
    for(let i=0;i<28;i++){
      const angle=i*Math.PI/14;
      antennas.push({position:[Math.sin(angle)*13.65,81.2,Math.cos(angle)*13.65],size:[.22,5.8,.20],
        rotation:[0,angle,0],color:0xdad6c7});
    }
    ring(117,2.35,25,0xbfbdae);ring(142,1.45,25,0xc9c4b6);ring(167,.68,height-167,0x93978e);
    batch(root,cylinder,pieces,true);batch(root,box,antennas,true);counters.towerInstances=pieces.length+antennas.length;
    counters.towerGlazedLevels=2;counters.towerOpenTerraces=3;
    root.userData.height=height;
  }
  if(waterpark){
    const root=siteRoot(waterpark,'Giant Spray former waterpark interpretive scenery',650),boxes=[],posts=[],poolVertices=[];
    const origin=root.position,angle=-root.rotation.y,ca=Math.cos(angle),sa=Math.sin(angle);
    const local=([x,z],lift=0)=>{const dx=x-origin.x,dz=z-origin.z;return [dx*ca+dz*sa,ground(x,z)-origin.y+lift,-dx*sa+dz*ca];};
    const addBox=(position,size,color,rotation=[0,0,0])=>boxes.push({position,size,color,rotation});
    function edge(a,b,width,height,color){
      const dx=b[0]-a[0],dz=b[2]-a[2];
      addBox([(a[0]+b[0])/2,(a[1]+b[1])/2+height/2,(a[2]+b[2])/2],[width,height,Math.hypot(dx,dz)],color,[0,Math.atan2(dx,dz),0]);
    }
    for(const pool of (waterpark.pools||[]).slice(0,8)){
      const outline=validPoints(pool.points);if(outline.length<3)continue;
      const points=outline.map(p=>local(p,.045)),shape=points.map(p=>new THREE.Vector2(p[0],p[2]));
      for(const triangle of THREE.ShapeUtils.triangulateShape(shape,[]))for(const i of triangle)poolVertices.push(...points[i]);
      for(let i=0;i<points.length;i++)edge(points[i],points[(i+1)%points.length],.4,.28,PALETTE.concrete);
      counters.pools++;
    }
    if(poolVertices.length){
      const geo=own(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(poolVertices,3));geo.computeVertexNormals();
      const mesh=new THREE.Mesh(geo,material({color:0xa7bdba,side:THREE.DoubleSide}));mesh.name='Dry faded concrete pool outlines';root.add(mesh);
    }
    // Source centerlines with original, approximate elevation and weathered styling.
    const slideVertices=[];
    const sourceSlides=(waterpark.slides||[]).slice(0,6).map(s=>validPoints(s.points)).filter(p=>p.length>1);
    const paths=sourceSlides.map(points=>points.map((p,i)=>local(p,.45+7*(1-i/(points.length-1)))));
    if(!paths.length){
      const path=[];
      for(let i=0;i<=28;i++){
        const t=i/28,pathAngle=t*Math.PI*1.3;
        path.push([Math.sin(pathAngle)*5,7*(1-t)+.45,-Math.cos(pathAngle)*5+t*6]);
      }
      paths.push(path);
    }
    for(const path of paths)for(let i=0;i<path.length-1;i++){
      const a=path[i],b=path[i+1],dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1,nx=-dz/length,nz=dx/length;
      const corners=[];
      for(const p of [a,b])for(const side of [-1,1])corners.push([p[0]+nx*side*.85,p[1],p[2]+nz*side*.85]);
      const [al,ar,bl,br]=corners;
      for(const p of [al,bl,ar,ar,bl,br])slideVertices.push(...p);
      for(const [lo,hi] of [[al,bl],[br,ar]]){
        const up=p=>[p[0],p[1]+.5,p[2]];
        for(const p of [lo,hi,up(lo),up(lo),hi,up(hi)])slideVertices.push(...p);
      }
      if(i%7===0){const base=a[1]-(.45+7*(1-i/(path.length-1))),h=a[1]-base;posts.push({position:[a[0],base+h/2,a[2]],size:[.16,h,.16],color:PALETTE.rust});}
    }
    const slide=own(new THREE.BufferGeometry());slide.setAttribute('position',new THREE.Float32BufferAttribute(slideVertices,3));slide.computeVertexNormals();
    root.add(new THREE.Mesh(slide,material({color:PALETTE.blue,side:THREE.DoubleSide})));counters.slideTriangles=slideVertices.length/9;counters.slides=paths.length;
    const start=paths[0][0],startGround=start[1]-7.45;
    addBox([start[0],start[1],start[2]],[3,.25,3],PALETTE.concrete);
    for(const x of [-1.2,1.2])posts.push({position:[start[0]+x,startGround+7.45/2,start[2]],size:[.14,7.45,.14],color:PALETTE.rust});
    for(let i=0;i<10;i++)addBox([start[0],startGround+7.45*i/10,start[2]-3+i*.3],[2.3,.16,.5],PALETTE.rust);
    const perimeter=validPoints(waterpark.points).map(p=>local(p));
    for(let i=0;i<perimeter.length;i++){
      const a=perimeter[i],b=perimeter[(i+1)%perimeter.length];
      posts.push({position:[a[0],a[1]+1.1,a[2]],size:[.1,2.2,.1],color:PALETTE.rust});
      for(const lift of [.6,1.7])edge([a[0],a[1]+lift,a[2]],[b[0],b[1]+lift,b[2]],.06,.06,PALETTE.rust);
    }
    const boundary=validPoints(waterpark.points);
    const center=boundary.length?boundary.reduce((p,q)=>[p[0]+q[0]/boundary.length,p[1]+q[1]/boundary.length],[0,0]):[waterpark.x,waterpark.z];
    const approach=waterpark.approach||{x:center[0],z:center[1]-20};
    let nearest=center,best=Infinity;
    for(let i=0;i<boundary.length;i++){
      const a=boundary[i],b=boundary[(i+1)%boundary.length],dx=b[0]-a[0],dz=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((approach.x-a[0])*dx+(approach.z-a[1])*dz)/(dx*dx+dz*dz||1)));
      const p=[a[0]+dx*t,a[1]+dz*t],d=(p[0]-approach.x)**2+(p[1]-approach.z)**2;if(d<best){nearest=p;best=d;}
    }
    const inside=p=>{
      let yes=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){
        const a=boundary[i],b=boundary[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;
      }return yes;
    };
    let signPoint=center;
    const reach=Math.hypot(center[0]-nearest[0],center[1]-nearest[1])||1;
    for(const inset of [7,12,20,reach]){
      const t=Math.min(1,inset/reach),p=[nearest[0]+(center[0]-nearest[0])*t,nearest[1]+(center[1]-nearest[1])*t];
      const facing=Math.atan2(approach.x-p[0],approach.z-p[1]),rx=Math.cos(facing)*3.2,rz=-Math.sin(facing)*3.2;
      if(inside(p)&&inside([p[0]+rx,p[1]+rz])&&inside([p[0]-rx,p[1]-rz])){signPoint=p;break;}
    }
    const signAt=local(signPoint),toward=local([approach.x,approach.z]),signYaw=Math.atan2(toward[0]-signAt[0],toward[2]-signAt[2]);
    const rx=Math.cos(signYaw),rz=-Math.sin(signYaw);
    addBox([signAt[0],signAt[1]+2.7,signAt[2]],[6,1.4,.16],0x596762,[0,signYaw,0]);
    for(const x of [-2.5,2.5])posts.push({position:[signAt[0]+x*rx,signAt[1]+1.3,signAt[2]+x*rz],size:[.12,2.6,.12],color:PALETTE.rust});
    root.userData.signPoint=[...signPoint];
    if(typeof document!=='undefined'){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;const ctx=canvas.getContext('2d');
      if(ctx){
        ctx.fillStyle='#596762';ctx.fillRect(0,0,512,128);ctx.fillStyle='#e5dfc9';ctx.textAlign='center';ctx.font='bold 44px sans-serif';ctx.fillText('GIANT SPRAY',256,57);ctx.font='22px sans-serif';ctx.fillText('FORMER WATERPARK',256,98);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.add(texture);
        const sign=new THREE.Mesh(own(new THREE.PlaneGeometry(5.8,1.3)),material({map:texture,side:THREE.DoubleSide}));sign.position.set(signAt[0]+Math.sin(signYaw)*.09,signAt[1]+2.7,signAt[2]+Math.cos(signYaw)*.09);sign.rotation.y=signYaw;root.add(sign);
      }
    }
    batch(root,box,boxes);batch(root,cylinder,posts);counters.waterparkInstances=boxes.length+posts.length;
  }
  function update(focus){if(disposed)return;for(const site of roots)site.root.visible=!!focus&&(finite(focus.x)-site.x)**2+(finite(focus.z)-site.z)**2<site.range**2;}
  function stats(){
    let draws=0,triangles=0,visibleSites=0;
    if(!disposed)for(const site of roots)if(site.root.visible){visibleSites++;site.root.traverse(o=>{if(o.isMesh){draws++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});}
    return {...counters,draws,triangles,visibleSites,disposed};
  }
  function dispose(){if(disposed)return;disposed=true;for(const site of roots)scene.remove(site.root);geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  return {update,dispose,stats,physicalProps};
}
