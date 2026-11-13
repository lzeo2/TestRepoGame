import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { LANDMARKS } from './landmarks.js';

const NEAR_RANGE = 850, FAR_RANGE = 4200;
const PALE = 0xd9d5c5, GRASS = 0x7e915d, GLASS = 0x526c72, METAL = 0xb9c1be;

// Original low-poly architectural studies. Two merged buffers per site, no textures.
export function createLandmarksView(scene, map, heightAt) {
  const root = new THREE.Group(); root.name = 'Canberra landmarks'; scene.add(root);
  const nearMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const farMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: false });
  const box = new THREE.BoxGeometry(1, 1, 1), cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const records = [], color = new THREE.Color(), v = new THREE.Vector3();
  const stats = { landmarks: 0, meshes: 0, triangles: 0, visibleNear: 0, visibleDistant: 0, nearRange: NEAR_RANGE, farRange: FAR_RANGE };
  let disposed = false;
  for (const site of LANDMARKS) {
    if (map.bounds && (site.x < map.bounds.minX || site.x > map.bounds.maxX || site.z < map.bounds.minZ || site.z > map.bounds.maxZ)) continue;
    const group = new THREE.Group(); group.name = site.name; group.position.set(site.x, heightAt(site.x, site.z), site.z);
    // Parliament's land axis is northeast, parallel to the Old Parliament facade axis.
    group.rotation.y = site.id.includes('parliament') ? -0.615 : site.id === 'kingston-powerhouse' ? 0.755 : 0;
    root.add(group);
    const batches = [{ positions: [], colors: [] }, { positions: [], colors: [] }];
    let detail = false;
    const groundY = (x, z) => heightAt(site.x + Math.cos(group.rotation.y) * x + Math.sin(group.rotation.y) * z, site.z - Math.sin(group.rotation.y) * x + Math.cos(group.rotation.y) * z) - group.position.y;
    const groundPoint = (x, z, lift = 0.18) => [x, groundY(x, z) + lift, z];
    function tri(a, b, c, tint) {
      const batch = batches[detail ? 0 : 1]; color.setHex(tint);
      batch.positions.push(...a, ...b, ...c);
      for (let i = 0; i < 3; i++) batch.colors.push(color.r, color.g, color.b);
    }
    function quad(a, b, c, d, tint) { tri(a, b, c, tint); tri(a, c, d, tint); }
    function primitive(geometry, x, y, z, sx, sy, sz, tint, rotation = 0) {
      const position = geometry.attributes.position, index = geometry.index;
      const matrix = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotation), new THREE.Vector3(sx, sy, sz));
      for (let i = 0; i < (index ? index.count : position.count); i += 3) {
        const points = [];
        for (let k = 0; k < 3; k++) { v.fromBufferAttribute(position, index ? index.getX(i + k) : i + k).applyMatrix4(matrix); points.push(v.toArray()); }
        tri(...points, tint);
      }
    }
    const block = (x, y, z, sx, sy, sz, tint, rotation = 0) => primitive(box, x, y, z, sx, sy, sz, tint, rotation);
    function beam(a, b, radius, tint) {
      const direction = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
      const g = new THREE.CylinderGeometry(radius, radius, direction.length(), 6);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()));
      primitive(g, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, 1, 1, 1, tint); g.dispose();
    }
    function windows(width, z, y, columns, rows, spacing = 3.3) {
      for (let row = 0; row < rows; row++) for (let i = 0; i < columns; i++) block((i + 0.5) / columns * width - width / 2, y + row * spacing, z, width / columns * 0.48, 1.9, 0.18, GLASS);
    }
    if (site.id === 'parliament-house') {
      // The raised lawn is split around the axial central hall, not a conical hill.
      for (const side of [-1, 1]) {
        for (let i = 0; i < 12; i++) {
          const x0 = side * (18 + i * 11), x1 = side * (18 + (i + 1) * 11);
          const y0 = 18 * (1 - i / 12), y1 = 18 * (1 - (i + 1) / 12);
          quad([x0,y0,-132],[x1,y1,-132],[x1,y1,132],[x0,y0,132],GRASS);
          quad([x0,-13,-132],[x1,-13,-132],[x1,y1,-132],[x0,y0,-132],PALE);
          quad([x1,-13,132],[x0,-13,132],[x0,y0,132],[x1,y1,132],PALE);
        }
      }
      for (const side of [-1, 1]) quad([side*150,-13,-132],[side*150,-13,132],[side*150,0,132],[side*150,0,-132],PALE);
      block(0, 6, 0, 36, 22, 250, PALE);
      block(0, 18, 0, 29, 3, 180, GLASS);
      // Pale curved facade across the north forecourt, segmented for a real arc silhouette.
      for (let i = 0; i < 24; i++) {
        const a = -1.15 + i / 24 * 2.3, b = -1.15 + (i + 1) / 24 * 2.3;
        const p = t => [Math.sin(t)*150, -79-Math.cos(t)*74];
        const u=p(a), w=p(b); block((u[0]+w[0])/2, 3.5, (u[1]+w[1])/2, Math.hypot(w[0]-u[0],w[1]-u[1])+0.2, 13, 3.5, PALE, -Math.atan2(w[1]-u[1],w[0]-u[0]));
      }
      // Four stainless legs converge into the mast, 81 metres above its roof deck.
      for (const x of [-19,19]) for (const z of [-19,19]) beam([x,18,z],[0,81,0],0.65,METAL);
      beam([0,70,0],[0,99,0],0.55,METAL);
      quad([0,96,0],[12.8,94.6,1.4],[12.8,88.2,1.4],[0,89.6,0],0x23395d);
      detail = true;
      quad(groundPoint(-72,-157),groundPoint(72,-157),groundPoint(72,-221),groundPoint(-72,-221),0xbcb6a7);
      const poolY=groundY(0,-193)+0.24;
      block(0,poolY,-193,38,0.12,26,0x66858a);
      for (let i=-6;i<=6;i++) block(i*5,2.8,-150,1.1,6,3.8,PALE);
      windows(62,-151.9,3.2,13,2);
      for (const side of [-1,1]) for (let i=0;i<6;i++) block(side*(42+i*17),1.3,-143+i*4,0.8,3,0.8,0x7b8075);
    } else if (site.id === 'old-parliament-house') {
      block(0,2,0,146,12,84,PALE);
      block(0,7,-43,42,13,15,0xe5e0d0);
      for (const x of [-60,60]) block(x,4,-36,24,14,25,0xe8e2d2);
      block(0,14,-40,47,1.1,18,PALE);
      beam([0,14,-40],[0,28,-40],0.22,METAL);
      detail = true;
      windows(139,-42.2,1.3,30,3);
      for (let i=-3;i<=3;i++) block(i*4.8,7,-51,1,10,1.3,PALE);
      for (let i=0;i<7;i++) block(0,-1+i*0.3,-55-i*1.4,35+i*2,0.35,2,PALE);
      block(0,3,-51.5,6,5,0.3,0x716d58);
    } else if (site.id === 'manuka-oval') {
      // Oval is a ground surface, never the source footprint's solid ten-metre drum.
      const n=64;
      for(let i=0;i<n;i++) { const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2; tri(groundPoint(0,0,0.25),groundPoint(Math.cos(a)*85,Math.sin(a)*99,0.25),groundPoint(Math.cos(b)*85,Math.sin(b)*99,0.25),0x6c914f); }
      for (let i=0;i<6;i++) {
        const a=(i/6+0.08)*Math.PI*2,x=Math.cos(a)*104,z=Math.sin(a)*115;
        beam([x,-3,z],[x*0.95,44,z*0.95],0.55,METAL);
        block(x*0.95,44,z*0.95,12,5,1.4,0xd1d0b9,-a);
      }
      for (const side of [-1,1]) { block(side*88,5,0,17,13,74,0xb6b8ad); block(side*88,13,-3,24,2,80,0x697a76); }
      detail=true;
      block(0,0.32,0,3.2,0.1,24,0xb8a379);
      for(const side of [-1,1]) for(let i=0;i<5;i++) block(side*(77+i*2.3),2+i*1.6,0,2,0.6,68,0x647e86);
      for(let i=0;i<64;i++) { const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2; beam([Math.cos(a)*88,1,Math.sin(a)*102],[Math.cos(b)*88,1,Math.sin(b)*102],0.12,0xdfd9c5); }
    } else {
      block(0,4,0,28,16,50,0xa47553);
      block(0,13,0,29,2,51,0x77796f);
      // Contemporary glass chimney artwork on the historic demolished stack site.
      primitive(cylinder,-3,11.5,44,2.1,23,2.1,0xb8caca);
      block(-3,0.6,44,6,2.5,6,0x91684b);
      block(0,2.5,30,16,9,14,0xa47553);
      detail=true;
      for(const side of [-1,1]) for(let i=0;i<7;i++) {
        block(side*14.1,7,-21+i*7,0.15,7,3.6,GLASS);
        block(side*14.2,7,-21+i*7,0.2,0.2,3.8,PALE);
      }
      windows(25,-25.1,6,5,2,4);
      for(const side of [-1,1]) for(let i=0;i<8;i++) block(side*14.3,6,-24+i*7,0.7,13,0.8,0xc0966c);
    }
    // Near includes the silhouette batch; far renders only that coarse geometry.
    const meshes=[];
    for(let i=0;i<2;i++) {
      const batch=batches[i], geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(batch.positions,3));
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(batch.colors,3)); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,i===0?nearMaterial:farMaterial); mesh.name=i===0?'Landmark nearby detail':'Landmark skyline'; group.add(mesh); meshes.push(mesh);
      stats.meshes++;stats.triangles+=batch.positions.length/9;
    }
    records.push({site,group,detail:meshes[0]});stats.landmarks++;
  }
  box.dispose();cylinder.dispose();
  function update(focus) {
    if(disposed)return;
    const x=focus?.x??focus?.position?.x??0,z=focus?.z??focus?.position?.z??0;
    stats.visibleNear=0;stats.visibleDistant=0;
    for(const record of records) {
      const distance=Math.hypot(record.site.x-x,record.site.z-z);
      record.group.visible=distance<FAR_RANGE+record.site.radius;
      record.detail.visible=distance<NEAR_RANGE+record.site.radius;
      if(record.group.visible) { if(record.detail.visible)stats.visibleNear++;else stats.visibleDistant++; }
    }
  }
  function dispose() {
    if(disposed)return;disposed=true;
    root.traverse(object=>{if(object.isMesh)object.geometry.dispose();});nearMaterial.dispose();farMaterial.dispose();root.removeFromParent();
    stats.visibleNear=0;stats.visibleDistant=0;
  }
  update(map.spawn);
  return {update,dispose,stats};
}
