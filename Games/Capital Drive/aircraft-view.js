import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

function jetGeometry(model) {
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
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

// Exactly two persistent meshes share one material. Updates never create GPU
// resources; their fixed model bounds stay valid under ordinary world transforms.
export function createAircraftView(scene, heightAt = () => 0) {
  const root = new THREE.Group(); root.name = 'Original stealable jets'; scene.add(root);
  const geometry = [jetGeometry(0), jetGeometry(1)];
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const meshes = geometry.map((g, i) => {
    const mesh = new THREE.Mesh(g, material); mesh.name = i ? 'Peregrine jet' : 'Kestrel jet';
    mesh.visible = false; root.add(mesh); return mesh;
  });
  let disposed = false, visible = 0;
  function update(snapshot, focus) {
    if (disposed) return;
    visible = 0;
    for (let i = 0; i < meshes.length; i++) {
      const plane = snapshot?.planes?.[i], mesh = meshes[i];
      mesh.visible = Boolean(plane && (!focus || plane.id === snapshot.activeId || Math.hypot(plane.x-focus.x,plane.z-focus.z)<1800));
      if (!plane || !mesh.visible) continue;
      mesh.position.set(plane.x, Number.isFinite(plane.y) ? plane.y : heightAt(plane.x,plane.z), plane.z);
      mesh.rotation.set(plane.pitch || 0, plane.yaw || 0, plane.bank || 0,'YXZ');
      visible++;
    }
  }
  return { update,
    get stats() { return Object.freeze({ models:2, meshes:disposed?0:2, visible, drawCalls:visible,
      triangles:disposed?0:geometry.reduce((sum,g)=>sum+g.attributes.position.count/3,0),
      bufferBytes:disposed?0:geometry.reduce((sum,g)=>sum+Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0),0), disposed }); },
    dispose() { if(disposed)return; disposed=true; visible=0; scene.remove(root);
      for(const g of geometry)g.dispose(); material.dispose(); },
  };
}
