// Public exterior motifs on selected retained OSM buildings. The world streamer
// owns every underlying wall, roof and collision polygon, including shop doors.
import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const DESIGNS = {
  'daramalan-college': {kind:'brick', label:'DARAMALAN COLLEGE', facing:[1,0], wall:0x994c3c, trim:0xc1a69b},
  'dickson-college': {kind:'curved', label:'DICKSON COLLEGE', facing:[0,-1], wall:0xb1b7b5, trim:0x344f68},
  'lyneham-high-school': {kind:'mosaic', label:'LYNEHAM HIGH SCHOOL', facing:[1,0], wall:0x996447, trim:0x577b95},
  'st-ninians-church': {kind:'stone', label:'ST NINIAN’S', facing:[0,1], wall:0x9e9380, trim:0x7c4b39},
  'abc-canberra': {kind:'clock', label:'ABC CANBERRA', facing:[-1,0], wall:0xbab4a4, trim:0x454b4b},
  'parklands-hotel': {kind:'hotel', label:'PARKLANDS', facing:[0,1], wall:0xa8a7a1, trim:0x55585d},
  'dickson-village': {kind:'podium', label:'DICKSON VILLAGE', facing:[-1,0], wall:0xac8161, trim:0x343c3e},
};
const RANGE = 280;
const TINT = new THREE.Color();
const glass = 0x526972;

function detailMesh(positions, colors, material, uvs) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  if (uvs) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material);
}

function publicLabels() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 256;
  const brush = canvas.getContext('2d');
  if (!brush) return null;
  brush.font = 'bold 23px sans-serif'; brush.textAlign = 'center';
  brush.textBaseline = 'middle';
  Object.values(DESIGNS).forEach((design, index) => {
    brush.fillStyle = design.kind === 'curved' || design.kind === 'mosaic' ? '#284966' : '#424749';
    brush.fillRect(0, index * 32, 512, 32);
    brush.fillStyle = '#f2f0dd'; brush.fillText(design.label, 256, index * 32 + 16);
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function chooseFace(ring, facing) {
  let area = 0;
  for (let i=0; i<ring.length; i++) {
    const a=ring[i], b=ring[(i+1)%ring.length];
    area += a[0]*b[1]-a[1]*b[0];
  }
  if (Math.abs(area) < 1) return null;
  const sign = Math.sign(area);
  let best = null;
  for (let i=0; i<ring.length; i++) {
    const a=ring[i], b=ring[(i+1)%ring.length];
    const length=Math.hypot(b[0]-a[0], b[1]-a[1]);
    if (length < 8) continue;
    const tx=(b[0]-a[0])/length, tz=(b[1]-a[1])/length;
    const nx=tz*sign, nz=-tx*sign;
    const score = (0.3 + Math.max(0,nx*facing[0]+nz*facing[1])) * Math.sqrt(Math.min(length,55));
    if (!best || score>best.score) best={length,tx,tz,nx,nz,score,sign,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2};
  }
  return best;
}

function decorate(kind, height, width, wall, trim, tri) {
  // x follows this facade, y is height above its base, z is outward relief.
  const left=-width/2, right=width/2;
  const face=(a,b,c,d,color)=>{tri(a,b,c,color);tri(a,c,d,color);};
  const panel=(x,y,w,h,depth,color)=>face([x-w/2,y-h/2,depth],[x+w/2,y-h/2,depth],
    [x+w/2,y+h/2,depth],[x-w/2,y+h/2,depth],color);
  const ledge=(x,y,w,depth,color)=>face([x-w/2,y,0],[x+w/2,y,0],
    [x+w/2,y,depth],[x-w/2,y,depth],color);
  function arch(x,y,r,ry,color,depth,half=false) {
    const start=half ? 0 : -Math.PI;
    for(let i=0;i<12;i++){
      const a=start+(Math.PI-start)*i/12, b=start+(Math.PI-start)*(i+1)/12;
      tri([x,y,depth],[x+r*Math.cos(a),y+ry*Math.sin(a),depth],
        [x+r*Math.cos(b),y+ry*Math.sin(b),depth],color);
    }
  }
  function gable(x,span,y,rise,setback,roofColor) {
    const a=[x-span/2,y,.2], b=[x+span/2,y,.2], peak=[x,y+rise,.2];
    tri(a,b,peak,wall);
    face(a,peak,[x,y+rise,-setback],[a[0],y,-setback],roofColor);
    face(peak,b,[b[0],y,-setback],[x,y+rise,-setback],roofColor);
    return peak;
  }
  // Preserve the public shopping tenancies at street level.
  if(kind==='podium'){
    panel(0,height-1.25,width,2.4,.13,0x4d5151);
    const fins=Math.min(27,Math.floor(width/.82));
    for(let i=0;i<fins;i++){
      const x=left+(i+.5)*width/fins;
      panel(x,height-1.18,.22,2.1,.22,i%3===0?0xa77956:0xc09670);
      face([x+.11,height-2.23,.22],[x+.11,height-.13,.22],
        [x+.11,height-.13,.13],[x+.11,height-2.23,.13],0x806445);
    }
    ledge(0,height+.04,width,.31,trim);
    return {y:height-1.22,depth:.25,span:Math.min(11,width*.54)};
  }
  panel(0,height/2,width,height,.12,wall);
  if(kind==='stone'){
    // Window arches have rectangular jambs, rounded heads and brick reveals.
    for(let course=0;course<7;course++){
      const y=.6+course*(height-.7)/7;
      for(let j=0;j<8;j++){
        const x=left+(j+.45+(course%2)*.12)*width/8;
        panel(x,y,width/8*.84,.22,.132,[0x968774,0xb2a48e,0xa4967d][(course+j)%3]);
      }
    }
    for(const x of [-width*.31,0,width*.31]){
      const sy=height*.56, r=Math.min(1.12,width*.072);
      panel(x,sy-.93,2*r,1.87,.15,trim); arch(x,sy,r,1.06,trim,.15,true);
      panel(x,sy-.86,1.52*r,1.74,.17,0x455257); arch(x,sy,.76*r,.81,0x455257,.17,true);
      panel(x,sy-.3,.075,2.56,.19,0xd2c7b2);
    }
    const roofY=height+.12, depth=Math.min(width*.25,5), rise=depth*.65;
    face([left,roofY,.22],[right,roofY,.22],[right,roofY+rise,-depth],[left,roofY+rise,-depth],0x69706c);
    face([left,roofY+rise,-depth],[right,roofY+rise,-depth],[right,roofY,-2*depth],[left,roofY,-2*depth],0x555d5b);
    tri([left,roofY,.22],[left,roofY+rise,-depth],[left,roofY,-2*depth],wall);
    tri([right,roofY,-2*depth],[right,roofY+rise,-depth],[right,roofY,.22],wall);
    return null;
  }
  const rows=kind==='clock'?3:2;
  const bays=Math.min(kind==='hotel'?6:10,Math.max(3,Math.floor(width/3.2)));
  for(let row=0;row<rows;row++){
    const floor=height/rows, y=(row+.53)*floor;
    for(let i=0;i<bays;i++){
      const span=width/bays, x=left+(i+.5)*span;
      const pane=kind==='hotel'?span*.48:span*.83;
      panel(x,y,pane+.14,floor*.63+.13,.15,trim);
      panel(x,y,pane,floor*.63,.17,glass);
      panel(x,y+floor*.19,pane,floor*.21,.178,[0x8b9d9f,0x788f98,0x92a0a0][(i+row)%3]);
      panel(x,y+floor*.075,pane,.075,.185,trim);
      panel(x,y,.085,floor*.63,.18,0xc2c9bc);
      if(kind==='mosaic' && row===0)panel(x,floor*.14,span*.82,floor*.22,.17,
        [0x53718b,0x7891a5,0x557e97,0x6a849c][i%4]);
    }
    panel(0,(row+1)*floor-.12,width,.22,.20,trim);
  }
  if(kind==='brick'){
    for(let i=0;i<5;i++){
      const x=left+.35+i*.52;
      panel(x,height*.51,.20,height*.94,.23,i%2?0xb06853:0x824737);
    }
    const x=right-1.48;
    arch(x,height*.74,.87,.87,0xc99576,.23);
    arch(x,height*.74,.65,.65,0x475b65,.24);
  } else if(kind==='curved'){
    const widthCap=Math.min(width*.77,19);
    for(let i=0;i<12;i++){
      const xl=widthCap*(i/12-.5), xr=widthCap*((i+1)/12-.5);
      const y=x=>height+.1+.42*Math.cos(x/widthCap*Math.PI);
      face([xl,height-.8,.22],[xr,height-.8,.22],[xr,y(xr),.22],[xl,y(xl),.22],0xbcc1be);
    }
  } else if(kind==='mosaic'){
    gable(right-width*.16,width*.3,height+.1,1.75,2.3,0x608092);
  } else if(kind==='hotel'){
    for(const x of [-width*.25,width*.25]){
      const span=width*.41;
      gable(x,span,height+.1,Math.min(2.8,span*.24),3.6,0x41494c);
      panel(x,height+.61,1.1,.68,.23,0x52616b);
    }
  } else if(kind==='clock'){
    // The public Northbourne display is an identifying feature. This stylised
    // fixed reading has no dependency on real weather or a GPU clock.
    const cx=right-2.2, cy=height*.66;
    panel(cx,cy,3.65,1.42,.23,0x222520);
    for(const [offset,segments] of [[-.82,'bc'],[.22,'abcdefg']]){
      const parts={a:[0,.43,.43,.09],b:[.25,.22,.09,.39],c:[.25,-.22,.09,.39],
        d:[0,-.43,.43,.09],e:[-.25,-.22,.09,.39],f:[-.25,.22,.09,.39],g:[0,0,.43,.09]};
      for(const segment of segments){const [x,y,w,h]=parts[segment];panel(cx+offset+x,cy+y,w,h,.25,0xf5b453);}
    }
    arch(cx+.89,cy+.29,.13,.13,0xf5b453,.25);
  }
  return {y:kind==='curved'?height-.24:height-.68,depth:.27,span:Math.min(11,width*.6)};
}

export function createNorthFrontages(scene,map,heightAt) {
  const places=(map?.landmarks||[]).filter(s=>Object.hasOwn(DESIGNS,s.id));
  const ids=new Set(places.map(s=>s.sourceBuildingId));
  const buildings=new Map();
  for(const b of map?.buildings||[]){
    if(ids.has(b.id)) buildings.set(b.id,b);
    if(buildings.size===ids.size) break;
  }
  const sites=[], claimed=new Set();
  let geometryMaterial, labelMaterial, atlas;
  for(const place of places){
    const b=buildings.get(place.sourceBuildingId), data=DESIGNS[place.id];
    if(!b || claimed.has(b.id) || !Number.isFinite(b.height) || b.height<3)continue;
    const ring=b.points;
    if(!Array.isArray(ring)||ring.length<3||ring.length>160||
       !ring.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))continue;
    const face=chooseFace(ring,data.facing);
    if(!face)continue;
    const base=Math.max(...ring.map(([x,z])=>heightAt(x,z)))+.12;
    if(!Number.isFinite(base))continue;
    const width=Math.min(face.length-.6,data.kind==='stone'?24:40);
    const group=new THREE.Group();group.position.set(face.x,base,face.z);
    group.name=place.name+' public frontage';group.visible=false;
    const xyz=[],colors=[];
    const local=([x,y,z])=>[face.tx*x+face.nx*z,y,face.tz*x+face.nz*z];
    const tri=(a,b,c,tint)=>{
      TINT.setHex(tint);
      for(const p of [a,b,c]){xyz.push(...local(p));colors.push(TINT.r,TINT.g,TINT.b);}
    };
    const label=decorate(data.kind,b.height,width,data.wall,data.trim,tri);
    // Carry the spandrel and parapet colours around real corners, allowing
    // the ordinary window bays to remain visible on the other elevations.
    if (['brick','curved','mosaic','hotel','clock'].includes(data.kind)) {
      for (let i=0;i<ring.length;i++){
        const a=ring[i], e=ring[(i+1)%ring.length], dx=e[0]-a[0], dz=e[1]-a[1], len=Math.hypot(dx,dz);
        if(len<6)continue;
        const nx=face.sign*dz/len, nz=-face.sign*dx/len;
        const edgePoint=(p,y)=>[p[0]-face.x+nx*.105,y,p[1]-face.z+nz*.105];
        for(const [y,h,color] of [[.32,.38,data.wall],[b.height*.5,.32,data.trim],[b.height-.14,.2,data.trim]]){
          const v=[edgePoint(a,y-h/2),edgePoint(e,y-h/2),edgePoint(e,y+h/2),edgePoint(a,y+h/2)];
          TINT.setHex(color);
          for(const index of [0,1,2,0,2,3]){xyz.push(...v[index]);colors.push(TINT.r,TINT.g,TINT.b);}
        }
      }
    }
    geometryMaterial??=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
    group.add(detailMesh(xyz,colors,geometryMaterial));
    if(label){
      if(atlas===undefined){atlas=publicLabels();if(atlas)labelMaterial=new THREE.MeshLambertMaterial({map:atlas,side:THREE.DoubleSide});}
      if(labelMaterial){
        const {span,y,depth}=label, k=Object.keys(DESIGNS).indexOf(place.id);
        // UV left/right must follow the viewer, regardless of polygon winding.
        const right=(face.tx*face.nz-face.tz*face.nx)>0?1:-1;
        const halfHeight=Math.min(.55,span/20),p0=local([-right*span/2,y-halfHeight,depth]);
        const p1=local([right*span/2,y-halfHeight,depth]),p2=local([right*span/2,y+halfHeight,depth]);
        const p3=local([-right*span/2,y+halfHeight,depth]),v1=1-(k*32+1)/256,v0=1-(k*32+31)/256;
        group.add(detailMesh([...p0,...p1,...p2,...p0,...p2,...p3],null,labelMaterial,[0,v0,1,v0,1,v1,0,v0,1,v1,0,v1]));
      }
    }
    scene.add(group);claimed.add(b.id);
    sites.push({id:place.id,kind:data.kind,group,triangles:group.children.reduce((n,m)=>n+m.geometry.attributes.position.count/3,0)});
  }
  function update(focus){
    for(const {group} of sites){
      group.visible=Boolean(focus) && (focus.x-group.position.x)**2+(focus.z-group.position.z)**2 < RANGE*RANGE;
    }
  }
  function stats(){
    let visible=0,draws=0,triangles=0;
    for(const s of sites)if(s.group.visible){visible++;draws+=s.group.children.length;triangles+=s.triangles;}
    return {sites:sites.length,visible,draws,triangles,atlas:!!atlas};
  }
  function dispose(){
    for(const {group} of sites){scene.remove(group);for(const m of group.children)m.geometry.dispose();}
    sites.length=0;geometryMaterial?.dispose();labelMaterial?.dispose();atlas?.dispose();geometryMaterial=labelMaterial=atlas=null;
  }
  return {update,stats,dispose};
}
