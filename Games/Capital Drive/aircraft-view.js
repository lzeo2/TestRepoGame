import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

function paintedGeometry(draw) {
  const positions = [], colors = [], color = new THREE.Color();
  const triangle = (a, b, c, tint) => {
    color.setHex(tint);
    for (const p of [a, b, c]) { positions.push(...p); colors.push(color.r, color.g, color.b); }
  };
  const quad = (a, b, c, d, tint) => { triangle(a, b, c, tint); triangle(a, c, d, tint); };
  const box = (x, y, z, w, h, l, tint) => {
    const a = [x-w/2,y-h/2,z-l/2], b = [x+w/2,y-h/2,z-l/2];
    const c = [x+w/2,y+h/2,z-l/2], d = [x-w/2,y+h/2,z-l/2];
    const e = [x-w/2,y-h/2,z+l/2], f = [x+w/2,y-h/2,z+l/2];
    const g = [x+w/2,y+h/2,z+l/2], j = [x-w/2,y+h/2,z+l/2];
    quad(a,b,c,d,tint); quad(f,e,j,g,tint); quad(e,a,d,j,tint);
    quad(b,f,g,c,tint); quad(d,c,g,j,tint); quad(e,f,b,a,tint);
  };
  draw({triangle,quad,box});
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function jetGeometry(model) {
  return paintedGeometry(({triangle,quad,box})=>{
  const shell = model ? 0xe9e0c9 : 0xe5e9e6, trim = model ? 0x914b35 : 0x405b83;
  // Authored eight-sided tapered fuselage, no downloaded or branded model.
  const rings = [[-5,.15,1.25],[-3.2,.8,1.45],[1.9,.75,1.4],[4.7,.28,1.3]];
  for (let r = 1; r < rings.length; r++) {
    const [za,ra,ya] = rings[r-1], [zb,rb,yb] = rings[r];
    for (let i = 0; i < 8; i++) {
      const a = i/8*Math.PI*2, b = (i+1)/8*Math.PI*2;
      quad([Math.cos(a)*ra,ya+Math.sin(a)*ra,za], [Math.cos(a)*rb,yb+Math.sin(a)*rb,zb],
        [Math.cos(b)*rb,yb+Math.sin(b)*rb,zb], [Math.cos(b)*ra,ya+Math.sin(b)*ra,za], shell);
    }
  }
  for (const [z,r,y] of [rings[0], rings.at(-1)]) for (let i=0;i<8;i++) {
    const a=i/8*Math.PI*2,b=(i+1)/8*Math.PI*2;
    triangle([0,y,z],[Math.cos(a)*r,y+Math.sin(a)*r,z],[Math.cos(b)*r,y+Math.sin(b)*r,z],shell);
  }
  for (const side of [-1,1]) {
    const tip = model ? 4.5 : 4.35;
    quad([side*.5,1.3,-1.3],[side*tip,1.22,1.1],[side*tip,1.15,1.9],[side*.5,1.2,1.4],trim);
    quad([side*.25,1.65,3.3],[side*2.1,1.7,4.4],[side*2.1,1.6,4.8],[side*.25,1.5,4.3],trim);
    box(side*.96,1.6,2.6,.64,.7,2.15,0x687174);
    box(side*1.5,.27,.8,.2,.54,.65,0x252c2d);
  }
  quad([0,1.6,2.7],[0,3.1,4.1],[0,3.1,4.7],[0,1.5,4.65],trim);
  box(0,2.04,-2,.96,.35,1.35,0x283d4a);
  box(0,.25,-2.8,.2,.5,.62,0x252c2d);
  });
}

function helicopterGeometry() {
  return paintedGeometry(({quad,box})=>{
    const body=0x707954,trim=0x323d29,opposite=0xdaac49,glass=0x243c47;
    box(0,1.76,-.56,2.58,1.78,4.3,body);
    box(0,2.58,-.58,2.3,.35,3.6,trim);
    box(0,2.91,.26,1.55,.57,1.87,body);
    quad([-1.23,1.4,-2.715],[1.23,1.4,-2.715],[1.03,2.52,-2.36],[-1.03,2.52,-2.36],glass);
    for(const side of [-1,1]){
      box(side*1.3,2.17,-1.15,.045,.74,2.13,glass);
      box(side*1.315,1.63,-.25,.052,.12,3.6,opposite);
      box(side*1.15,.18,-.45,.19,.19,5.2,0x333835);
      for(const z of [-1.7,.91])box(side*1.07,.62,z,.13,.78,.13,0x333835);
    }
    box(0,1.97,2.62,.65,.61,2.8,trim);
    box(0,2.25,3.95,.45,1.01,.58,body);
    box(0,2.16,3.52,2.05,.14,.53,body);
    box(.26,2.7,4,.08,1.17,.135,0x2c322d);
    box(.26,2.7,4,.08,.135,1.17,0x2c322d);
  });
}

// Aircraft share one material. The depot interceptor reuses a jet geometry
// and the rotorcraft uses caller-supplied frame time for its blades.
export function createAircraftView(scene, heightAt = () => 0) {
  const root = new THREE.Group(); root.name = 'Original flyable aircraft'; scene.add(root);
  const geometry = [jetGeometry(0),jetGeometry(1),helicopterGeometry(),
    paintedGeometry(({box})=>{
      box(0,0,0,9.8,.065,.255,0x30352c);
      box(0,0,0,.255,.065,9.8,0x30352c);
      for(const side of [-1,1]){
        box(side*4.69,.006,0,.42,.072,.265,0xf0da81);
        box(0,.006,side*4.69,.265,.072,.42,0xf0da81);
      }
      box(0,-.13,0,.45,.27,.45,0x394238);
    })];
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const meshes = geometry.slice(0,3).map((g, i) => {
    const mesh = new THREE.Mesh(g, material); mesh.name = ['Kestrel jet','Peregrine jet','Wattle helicopter'][i];
    mesh.visible = false; root.add(mesh); return mesh;
  });
  const blades=new THREE.Mesh(geometry[3],material);blades.name='Wattle main rotor';
  blades.position.set(0,3.42,.2);meshes[2].add(blades);
  let disposed = false, visible = 0, depotJet=null;
  function poseAircraft(mesh,plane,snapshot,focus) {
    mesh.visible=Boolean(plane&&(!focus||plane.id===snapshot.activeId||Math.hypot(plane.x-focus.x,plane.z-focus.z)<1800));
    if(!mesh.visible)return false;
    mesh.position.set(plane.x,Number.isFinite(plane.y)?plane.y:heightAt(plane.x,plane.z),plane.z);
    mesh.rotation.set(plane.pitch||0,plane.yaw||0,plane.bank||0,'YXZ');
    return true;
  }
  function update(snapshot, focus, dt = 0) {
    if (disposed) return;
    visible = 0;
    for (let i = 0; i < meshes.length; i++) {
      const mesh=meshes[i];
      const plane=snapshot?.planes?.find(p=>i===2?p.kind==='helicopter':p.id===`jet:${i+1}`||p.loaner&&p.kind==='jet'&&p.model===i);
      if(!poseAircraft(mesh,plane,snapshot,focus))continue;
      if(i===2&&plane.id===snapshot.activeId&&!plane.wrecked&&dt>0)blades.rotation.y=(blades.rotation.y+dt*34*(plane.rotor||0))%(2*Math.PI);
      visible+=i===2?2:1;
    }
    const interceptor=snapshot?.planes?.find(p=>p.id==='jet:depot');
    if(interceptor&&!depotJet){
      depotJet=new THREE.Mesh(geometry[1],material);depotJet.name=interceptor.name;root.add(depotJet);
    }
    if(depotJet&&poseAircraft(depotJet,interceptor,snapshot,focus))visible++;
  }
  return { update,
    get stats() { return Object.freeze({ models:depotJet?4:3, meshes:disposed?0:depotJet?5:4, visible, drawCalls:visible,
      triangles:disposed?0:geometry.reduce((sum,g)=>sum+g.attributes.position.count/3,0)+(depotJet?geometry[1].attributes.position.count/3:0),
      bufferBytes:disposed?0:geometry.reduce((sum,g)=>sum+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0),0), disposed }); },
    dispose() { if(disposed)return; disposed=true; visible=0; scene.remove(root);
      for(const g of geometry)g.dispose(); material.dispose(); },
  };
}
