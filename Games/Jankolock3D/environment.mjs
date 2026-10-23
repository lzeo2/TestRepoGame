import * as THREE from './vendor/three.module.js';
import { LANES, terrainHeight } from './world-data.mjs';

// Original architecture over immutable collision footprints. No simulation state.
export function createEnvironment(scene, world, loadTexture = url => new THREE.TextureLoader().load(url)) {
  const root = new THREE.Group(); root.name = 'original-city'; scene.add(root);
  const textures = [], materials = [], geometries = new Map(), batches = new Map(), detailGroups = [];
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
  const position = new THREE.Vector3(), up = new THREE.Vector3(0,1,0);
  const texture = (name, color = false) => {
    const t = loadTexture(new URL(`./textures/environment/${name}.png`, import.meta.url).href);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t); return t;
  };
  const material = options => { const m = new THREE.MeshStandardMaterial(options); materials.push(m); return m; };
  const masonry = name => material({map:texture(`${name}-color`,true),roughnessMap:texture(`${name}-rough`),
    aoMap:texture(`${name}-ao`),aoMapIntensity:.75,roughness:1});
  const brick = masonry('brick'), stone = masonry('limestone');
  const metal = material({map:texture('metal-color',true),roughnessMap:texture('metal-rough'),
    aoMap:texture('metal-ao'),aoMapIntensity:.65,roughness:1,metalness:.5});
  const trim = material({color:0xc2b49a,roughness:.86});
  const dark = material({color:0x343c3b,roughness:.74,metalness:.25});
  const glass = material({color:0x344b51,roughness:.31,metalness:.28});
  const roof = material({color:0x696963,roughness:.98});
  const wood = material({color:0x75563c,roughness:.9});
  const leaves = material({map:texture('foliage-color',true),roughness:.96});
  const lamp = material({color:0xe5d1a0,emissive:0xe5b56a,emissiveIntensity:.35,roughness:.6});
  const paving = material({color:0x8d8b7e,roughness:1});
  const signsTexture = texture('signs-color',true);
  const signs = material({map:signsTexture,roughness:.88});
  const geo = (key, make) => {
    if (!geometries.has(key)) geometries.set(key,make());
    return geometries.get(key);
  };
  const cube = geo('cube',()=>new THREE.BoxGeometry(1,1,1));
  const cylinder = geo('cylinder',()=>new THREE.CylinderGeometry(1,1,1,12));
  const canopy = geo('canopy',()=>new THREE.SphereGeometry(1,12,8));
  const cone = geo('cone',()=>new THREE.ConeGeometry(1,1,16));
  const arch = geo('arch',()=>new THREE.RingGeometry(1.3,1.6,16,1,0,Math.PI));
  const doorArch = geo('door-arch',()=>new THREE.CircleGeometry(1.3,16,0,Math.PI));
  const fan = geo('fan',()=>new THREE.TorusGeometry(.8,.09,4,16));
  function add(g, m, x,y,z, sx=1,sy=1,sz=1, ry=0, target=root, q=null) {
    if (!batches.has(target)) batches.set(target,new Map());
    const key=g.uuid+m.uuid, list=batches.get(target);
    if (!list.has(key)) list.set(key,{g,m,transforms:[]});
    position.set(x,y,z); scale.set(sx,sy,sz);
    rotation.setFromAxisAngle(up,ry);
    matrix.compose(position,q || rotation,scale);
    list.get(key).transforms.push(matrix.clone());
  }
  function box(m,x,y,z,w,h,d,ry=0,target=root) {
    // UV density, not extra subdivisions: mortar stays metre-scaled on long walls.
    const g=m===brick||m===stone?geo(`masonry-${w}-${h}-${d}`,()=>{
      const g=cube.clone(),uv=g.attributes.uv;
      for(let face=0;face<6;face++)for(let i=face*4;i<face*4+4;i++)
        uv.setXY(i,uv.getX(i)*(face<2?d:w)/2,uv.getY(i)*(face<2?h:face<4?d:h)/2);
      return g;
    }):cube;
    add(g,m,x,y,z,w,h,d,ry,target);
  }
  const rod=(m,x,y,z,r,h,target=root)=>add(cylinder,m,x,y,z,r,h,r,0,target);
  function beam(m,a,b,r,target=root) {
    const direction=new THREE.Vector3().subVectors(b,a),middle=new THREE.Vector3().addVectors(a,b).multiplyScalar(.5);
    add(cylinder,m,middle.x,middle.y,middle.z,r,direction.length(),r,0,target,
      new THREE.Quaternion().setFromUnitVectors(up,direction.normalize()));
  }
  function board(index,x,y,z,w,h,ry,target=root) {
    const g=geo(`sign-${index}`,()=>{
      const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,(uv.getY(i)+3-index)/4);
      return g;
    });
    add(g,signs,x,y,z,w,h,1,ry,target);
  }
  // Static architecture shares spatial instance batches; fine details disappear
  // beyond 155m. Automatic frustum culling keeps offscreen buffers off the GPU.
  const cityChunks=new Map();
  for (const [index,b] of world.buildings.entries()) {
    const district=LANES.reduce((a,l)=>Math.abs(l.x-b.x)<Math.abs(a.x-b.x)?l:a,LANES[0]).id;
    const wall=district==='midway'?stone:brick;
    const chunk=`${Math.floor((b.x+450)/240)}:${Math.floor((b.z+450)/300)}`;
    if(!cityChunks.has(chunk)) {const g=new THREE.Group();g.name=`architecture-${chunk}`;root.add(g);cityChunks.set(chunk,g);}
    const group=cityChunks.get(chunk);
    const detail=new THREE.Group();detail.name=`detail-${b.id}`;root.add(detail);
    detail.userData.center={x:b.x,z:b.z};detailGroups.push(detail);
    // The core is behind the openings, not a full cube painted with window decals.
    box(wall,b.x,b.height/2,b.z,34.4,b.height,40.4,0,group);
    box(roof,b.x,b.height-.08,b.z,36,.16,42,0,group);
    // Recessed dark footings and a narrow roof fascia anchor the shell without
    // a shadow map or screen-space pass. They stay inside the collision footprint.
    box(dark,b.x,.08,b.z,35.8,.16,41.8,0,group);
    box(dark,b.x,b.height-.26,b.z,35.8,.18,41.8,0,group);
    for(const [angle,width,depth] of [[0,36,21],[Math.PI,36,21],[Math.PI/2,42,18],[-Math.PI/2,42,18]]) {
      const sin=Math.sin(angle),cos=Math.cos(angle);
      const point=(u,y,v)=>new THREE.Vector3(b.x+u*cos+v*sin,y,b.z-u*sin+v*cos);
      const fbox=(m,u,y,v,w,h,d,target=group)=>{const p=point(u,y,v);box(m,p.x,p.y,p.z,w,h,d,angle,target);};
      // Piers/spandrels form physical 0.6m recesses on all four elevations.
      fbox(trim,0,.35,depth-.1,width,.7,.5);
      for(let y=4;y<b.height;y+=4) {
        fbox(wall,0,y+.5,depth-.4,width,1,.8);
        const columns=width/6;
        for(let i=0;i<columns;i++) {
          const u=-width/2+3+i*6;
          fbox(wall,u-2.55,y+2.5,depth-.4,.9,3,.8);
          fbox(wall,u+2.55,y+2.5,depth-.4,.9,3,.8);
          fbox(glass,u,y+2.35,depth-.62,4.15,2.65,.09);
          fbox(trim,u,y+3.8,depth-.18,4.5,.25,.7);
          fbox(trim,u,y+1,depth+.03,4.6,.22,.75);
          fbox(dark,u,y+2.35,depth-.48,.09,2.7,.12,detail);
          fbox(dark,u,y+2.35,depth-.47,4.2,.08,.12,detail);
          if(district==='midway') {
            fbox(trim,u-2.15,y+2.4,depth-.02,.22,2.9,.22,detail);
            fbox(trim,u+2.15,y+2.4,depth-.02,.22,2.9,.22,detail);
          }
        }
      }
      // Shopfronts and a real semicircular archivolt at each entrance.
      const bays=width/6,door=Math.floor(bays/2);
      for(let i=0;i<bays;i++) {
        const u=-width/2+3+i*6;
        fbox(trim,u-2.7,2.1,depth-.2,.6,3.7,.6);
        fbox(glass,u,1.9,depth-.64,4.6,3.1,.08);
        if(i===door) {
          fbox(dark,u,1.3,depth-.5,2.5,2.6,.14);
          const p=point(u,2.4,depth+.04);add(arch,trim,p.x,p.y,p.z,1,1,1,angle,group);
          const inset=point(u,2.4,depth-.42);add(doorArch,dark,inset.x,inset.y,inset.z,1,1,1,angle,group);
          for(const side of [-1,1])fbox(trim,u+side*1.45,1.2,depth+.03,.3,2.4,.4);
          fbox(trim,u,2.9,depth+.08,.18,.55,.35,detail);
          fbox(metal,u+.7,1.2,depth-.35,.12,.6,.12,detail);
        } else {
          fbox(dark,u,1.8,depth-.46,.12,3.1,.15,detail);
          fbox(dark,u,1.1,depth-.46,4.6,.13,.15,detail);
          // Shallow sloped metal shop canopy entirely above head height.
          fbox(metal,u,3.7,depth+.45,5.1,.18,1.4);
        }
      }
      // Cornice with stepped profiles, brackets, and district-specific fins.
      for(const [y,out,height] of [[b.height-.9,.15,.35],[b.height-.5,.4,.35],[b.height-.15,.7,.25]])
        fbox(trim,0,y,depth+out,width+1.1,height,.5);
      for(let u=-width/2+1.5;u<width/2;u+=3)fbox(trim,u,b.height-1.35,depth+.1,.42,.6,.65,detail);
      if(district==='midway')for(let u=-width/2+1;u<width/2;u+=6)
        fbox(trim,u,b.height/2+1.8,depth+.1,.35,b.height-4,.5);
      const p=point(-width/4,4.7,depth+.18);
      board(district==='graft'?0:district==='midway'?1:2,p.x,p.y,p.z,width*.43,1.45,angle,group);
    }
    if(district==='midway') {
      // Stepped parapet and radiating metal inlay, not a taller collision roof.
      for(const [w,h] of [[15,.8],[11,1.5],[6,2.3]])box(stone,b.x,b.height+h/2,b.z-20,w,h,.8,0,group);
      for(let i=-3;i<=3;i++)beam(metal,new THREE.Vector3(b.x,b.height+.25,b.z-20.5),
        new THREE.Vector3(b.x+i*.65,b.height+2-Math.abs(i)*.2,b.z-20.5),.045,detail);
    }
    // Rooftop props stay in the north-west service pocket, clear of vent landing,
    // east access ramps and the transverse centre roof-link. No new colliders.
    box(metal,b.x-10,b.height+1,b.z-11,6,2,4,0,group);
    for(const dx of [-11.6,-8.4]) {
      add(fan,dark,b.x+dx,b.height+2.04,b.z-11,1,1,1,0,detail,
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
      for(let i=0;i<4;i++)box(dark,b.x+dx,b.height+2.05,b.z-11,.15,.05,1.3,i*Math.PI/4,detail);
    }
    for(let z=-12.5;z<=-9.5;z+=.5)box(dark,b.x-13.05,b.height+1,b.z+z,.08,1.6,.12,0,detail);
    if(index%3===0) {
      for(const dx of [-2,2])for(const dz of [-2,2])rod(metal,b.x-9+dx,b.height+1.7,b.z-16+dz,.13,3.4,detail);
      rod(wood,b.x-9,b.height+5,b.z-16,2.7,3.5,group);
      for(const y of [3.5,5,6.5])rod(metal,b.x-9,b.height+y,b.z-16,2.76,.14,detail);
      add(cone,metal,b.x-9,b.height+7.25,b.z-16,3,1.2,3,0,group);
    }
    // Fire escapes on north facade, never on the east roof-access corridor.
    if(district==='graft')for(let y=7;y<b.height-1;y+=4) {
      box(metal,b.x+7,y,b.z-22.2,7,.16,2.4,0,group);
      for(const dx of [3.6,10.4]) {
        rod(dark,b.x+dx,y+.6,b.z-23.3,.06,1.2,detail);
        beam(dark,new THREE.Vector3(b.x+dx,y-3.8,b.z-22.2),new THREE.Vector3(b.x+dx,y,b.z-23.2),.06,detail);
      }
      box(dark,b.x+7,y+1.2,b.z-23.3,7,.08,.08,0,detail);
      for(let dx=4;dx<=10;dx+=.6)rod(dark,b.x+dx,y+.6,b.z-23.3,.035,1.2,detail);
      for(let step=0;step<9;step++)box(metal,b.x+10,y-step*.44,b.z-22.9+step*.11,1,.07,.28,0,detail);
    }
    if(index%7===0) {
      // A roof billboard and its diagonal, visible load-bearing frame.
      box(dark,b.x-3,b.height+4.5,b.z-17,15,4.2,.35,0,group);
      board(3,b.x-3,b.height+4.5,b.z-16.8,14.6,3.7,0,group);
      for(const dx of [-9,3]) {
        rod(metal,b.x+dx,b.height+2,b.z-17,.13,4,detail);
        beam(metal,new THREE.Vector3(b.x+dx,b.height,b.z-12),new THREE.Vector3(b.x+dx,b.height+6,b.z-17),.1,detail);
      }
    }
    if(index%9===0) {
      // Scaffold is on the west facade; clear of every east access ramp.
      for(const z of [-16,-8,0,8,16])rod(metal,b.x-19.1,b.height/2,b.z+z,.09,b.height,detail);
      for(let y=4;y<b.height;y+=4) {
        box(wood,b.x-18.8,y,b.z,1.4,.12,34,0,detail);
        for(const z of [-16,-8,0,8])beam(metal,new THREE.Vector3(b.x-19.1,y-4,b.z+z),new THREE.Vector3(b.x-19.1,y,b.z+z+8),.07,detail);
      }
    }
    if(district==='greenhedge')for(let j=0;j<5;j++) {
      // Ivy follows the blank side-wall piers, not a floating canopy decal.
      add(canopy,leaves,b.x-18.1,3+j*2,b.z-14+(index%3),.45,2.5,2.8,0,detail);
    }
  }
  // Boulevard lamps stand on the outer edge, clear of lane walking/zip traces.
  for(const lane of LANES)for(let z=-330;z<=330;z+=60)for(const side of [-1,1]) {
    const x=lane.x+side*27;
    const group=new THREE.Group();root.add(group);group.userData.center={x,z};detailGroups.push(group);
    rod(dark,x,3.8,z,.13,7.6,group);rod(trim,x,.25,z,.38,.5,group);
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(x,7,z),new THREE.Vector3(x-side*1.5,10,z),new THREE.Vector3(x-side*3,7.8,z));
    // Tube segments follow the bent neck; no redundant subdivisions of solids.
    const g=geo(`lamp-neck-${side}`,()=>new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0,0,0),new THREE.Vector3(-side*1.5,3,0),new THREE.Vector3(-side*3,.8,0)),12,.1,5,false));
    add(g,dark,x,7,z,1,1,1,0,group);
    const tip=curve.getPoint(1);add(cone,dark,tip.x,tip.y,tip.z,.65,.45,.65,0,group);
    rod(lamp,tip.x,tip.y-.25,tip.z,.43,.18,group);
    if(lane.id==='greenhedge') {
      const tx=x+side*8;
      rod(wood,tx,2.8,z,.36,5.6,group);
      for(const [dx,dy,dz,r] of [[0,6,0,3.3],[-1.8,5.6,1,2.4],[1.4,7,-1,2.6]]) {
        beam(wood,new THREE.Vector3(tx,3,z),new THREE.Vector3(tx+dx,dy,z+dz),.15,group);
        const spread=1+Math.sin(z*.31+side*2+dy)*.16;
        add(canopy,leaves,tx+dx,dy,z+dz,r*spread,r*.78,r/spread,z*.03,group);
      }
    }
  }
  // Original sagging service wires between building pairs, above head/zip height.
  for(const b of world.buildings.filter((_,i)=>i%4===0)) {
    const neighbor=world.buildings.find(n=>n.x===b.x&&n.z===b.z+90);
    if(!neighbor)continue;
    const y=Math.max(b.height,neighbor.height)+2;
    const curve=new THREE.QuadraticBezierCurve3(new THREE.Vector3(b.x-15,y,b.z+21),new THREE.Vector3(b.x-15,y-5,b.z+45),new THREE.Vector3(b.x-15,y,neighbor.z-21));
    const g=geo(`wire-${b.id}`,()=>new THREE.TubeGeometry(curve,16,.055,3,false));
    add(g,dark,0,0,0);
  }
  // Flat rounded turnout paving only where the shared terrain and collision are
  // clear. This does not add a pretend road through a building or alter physics.
  let corners=0;
  for(const lane of LANES)for(const z of [-280,-140,140,280])for(const side of [-1,1]) {
    const x=lane.x+side*30,cz=z+19,r=10;
    const clear=terrainHeight(x,cz)===0 && ![...world.boxes,...world.ramps].some(b=>
      x+r>b.minX&&x-r<b.maxX&&cz+r>b.minZ&&cz-r<b.maxZ);
    if(!clear)continue;
    const g=geo('turnout',()=>new THREE.CircleGeometry(1,24));
    add(g,paving,x,.055,cz,r,r,1,0,root,new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
    corners++;
  }
  let triangles=0,instances=0;
  for(const [parent,sets] of batches)for(const {g,m,transforms} of sets.values()) {
    const mesh=new THREE.InstancedMesh(g,m,transforms.length);
    transforms.forEach((t,i)=>mesh.setMatrixAt(i,t));mesh.computeBoundingSphere();parent.add(mesh);
    instances+=transforms.length;triangles+=(g.index?g.index.count:g.attributes.position.count)/3*transforms.length;
  }
  // Texture-space AO darkens real mortar/metal grooves, not screen-space AO and
  // not an invented contact-shadow claim. All maps use the geometry's UV channel 0.
  let disposed=false;
  return {
    root,
    update(camera) {for(const g of detailGroups) {const c=g.userData.center;g.visible=Math.hypot(camera.position.x-c.x,camera.position.z-c.z)<155;}},
    diagnostics:()=>({buildings:world.buildings.length,instances,triangles,geometries:geometries.size,staticChunks:cityChunks.size,
      textureCount:textures.length,cornerTurnouts:corners,detailDistance:155}),
    dispose() {if(disposed)return;disposed=true;root.removeFromParent();root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());root.clear();}
  };
}
