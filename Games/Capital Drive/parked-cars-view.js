import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { mergeGeometries } from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';
import { CAPITAL_BY_ID } from '../../assets/car-arcade/fleet.js';

// Three static batches per cell, independent of fleet variety. Vertex ranges
// retain owner identity when a parked car is handed to the live vehicle owner.
export function createParkedCarsView(scene, cars, heightAt) {
  const prototypes = new Map(), chunks = [], records = new Map();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  function prototype(id) {
    if (prototypes.has(id)) return prototypes.get(id);
    const spec = CAPITAL_BY_ID[id] || CAPITAL_BY_ID.lantern;
    const { length:l, width:w, height:h } = spec, suv = id === 'gravel', wagon = id === 'orchard';
    const batches = [[], [], []];
    function part(batch, geometry, color, x, y, z, rotate = false) {
      if (rotate) geometry.rotateZ(Math.PI / 2);
      geometry.translate(x, y, z);
      const g = geometry;
      g.deleteAttribute('uv'); g.clearGroups();
      const c = new THREE.Color(color), colors = new Float32Array(g.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) c.toArray(colors, i);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3)); batches[batch].push(g);
    }
    const box = (batch,color,x,y,z,sx,sy,sz) => part(batch,new THREE.BoxGeometry(sx,sy,sz),color,x,y,z);
    const panel = (color,x,y,z,sx,sy,ry=0) => { const g=new THREE.PlaneGeometry(sx,sy);g.rotateY(ry);part(2,g,color,x,y,z); };
    const radius = suv ? .39 : .33, belt = h * .57;
    box(0,0xffffff,0,(radius*.65+belt)/2,0,w*.96,belt-radius*.65,l);
    const cabinLength = l * (wagon ? .65 : suv ? .59 : .48), cabinZ = wagon ? l*.07 : l*.015;
    box(1,0x344b55,0,(belt+h-.06)/2,cabinZ,w*.82,h-.06-belt,cabinLength);
    box(0,0xffffff,0,h-.04,cabinZ,w*.85,.08,cabinLength*.91);
    // Pillars split the glass into real side windows and frame both screens.
    for (const side of [-1,1]) {
      for (const z of [cabinZ])
        box(0,0xffffff,side*w*.415,(belt+h-.06)/2,z,.055,h-.06-belt,.065);
      for (const z of [-l*.30,l*.30]) {
        part(2,new THREE.CylinderGeometry(radius,radius,.18,8,1),0x202528,side*(w/2-.09),radius,z,true);

      }
      panel(0xe9dfb7,side*w*.31,belt*.81,-l/2-.006,w*.22,.13,Math.PI);
      panel(0xa43832,side*w*.33,belt*.83,l/2+.006,w*.19,.15);

    }
    for (const z of [-1,1]) panel(0x444c51,0,radius*.83,z*(l/2+.012),w*.85,.10,z<0?Math.PI:0);
    const result = batches.map(parts => { const g = mergeGeometries(parts,false); parts.forEach(p=>p.dispose()); return g; });
    prototypes.set(id,result); return result;
  }
  const cells = new Map();
  for (const car of cars) { const key = `${Math.floor(car.x/300)},${Math.floor(car.z/300)}`; if (!cells.has(key)) cells.set(key,[]); cells.get(key).push(car); }
  for (const cell of cells.values()) {
    const group = new THREE.Group(), parts = [[],[],[]], offsets = [0,0,0];
    const center = {x:Math.floor(cell[0].x/300)*300+150,z:Math.floor(cell[0].z/300)*300+150};
    group.position.set(center.x,0,center.z);
    for (const car of cell) {
      const matrix = new THREE.Matrix4().makeRotationY(car.yaw);
      matrix.setPosition(car.x-center.x,heightAt(car),car.z-center.z);
      const ranges = prototype(car.modelId).map((source,batch) => {
        const g = source.clone().applyMatrix4(matrix);
        if (batch===0) { const c = new THREE.Color(car.color); const a = g.attributes.color; for(let i=0;i<a.count;i++)a.setXYZ(i,c.r,c.g,c.b); }
        const range = {start:offsets[batch],count:g.attributes.position.count};
        offsets[batch]+=range.count; parts[batch].push(g); return range;
      });
      records.set(car.id,{id:car.id,ranges,hidden:false,meshes:null,saved:null});
    }
    const meshes = parts.map(list => { const geometry = mergeGeometries(list,false); list.forEach(g=>g.dispose()); geometry.computeBoundingSphere(); const mesh = new THREE.Mesh(geometry,material); group.add(mesh); return mesh; });
    for(const car of cell) records.get(car.id).meshes=meshes;
    scene.add(group);chunks.push({group,...center});
  }
  prototypes.forEach(list=>list.forEach(g=>g.dispose()));
  function hide(id) {
    const record=records.get(id);if(!record||record.hidden)return false;
    record.saved=record.ranges.map((range,batch)=>{
      const a=record.meshes[batch].geometry.attributes.position, start=range.start*3,end=(range.start+range.count)*3;
      const saved=a.array.slice(start,end);a.array.fill(0,start,end);a.needsUpdate=true;return saved;
    });record.hidden=true;return true;
  }
  function restore() {
    for(const record of records.values())if(record.hidden){record.ranges.forEach((range,batch)=>{const a=record.meshes[batch].geometry.attributes.position;a.array.set(record.saved[batch],range.start*3);a.needsUpdate=true;});record.hidden=false;record.saved=null;}
  }
  return {chunks,records,hide,restore,
    cull(focus){for(const chunk of chunks)chunk.group.visible=Math.hypot(chunk.x-focus.x,chunk.z-focus.z)<812;},
    dispose(){for(const chunk of chunks){scene.remove(chunk.group);for(const mesh of chunk.group.children)mesh.geometry.dispose();}material.dispose();records.clear();chunks.length=0;}
  };
}
