import * as THREE from '../vendor/three.module.js';

// Host descriptors own HP/lifetime; this layer owns only exact meshes/shared boxes.
export function createKeepClearLayer(scene,boxes) {
  const records=new Map();
  function remove(id,record) {
    const index=boxes.indexOf(record.box);if(index>=0)boxes.splice(index,1);
    if(record.mesh)scene.remove(record.mesh);
    if(record.geometry){record.geometry.dispose();record.geometry=null;}
    if(record.material){record.material.dispose();record.material=null;}
    records.delete(id);
  }
  const layer={
    lastCleanupError:null,
    sync(sim) {
      const panels=(sim.wallPanels?.()??[]).filter(p=>p.alive!==false),ids=new Set(panels.map(p=>p.id));
      for(const [id,record] of records)if(!ids.has(id)||!record.ready)remove(id,record);
      for(const panel of panels) {
        const old=records.get(panel.id);if(old){old.box.panelTarget=panel;continue;}
        const b=panel.bounds,record={box:{...b,id:panel.id,panelTarget:panel},geometry:null,material:null,mesh:null,ready:false};
        records.set(panel.id,record);
        try {
          record.geometry=new THREE.BoxGeometry(b.maxX-b.minX,b.maxY-b.minY,b.maxZ-b.minZ);
          record.material=new THREE.MeshBasicMaterial({color:panel.color??'#6c8589'});
          record.mesh=new THREE.Mesh(record.geometry,record.material);
          record.mesh.position.set((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,(b.minZ+b.maxZ)/2);
          scene.add(record.mesh);boxes.push(record.box);record.ready=true;
        } catch(error) {
          try{remove(panel.id,record);}catch(cleanupError){layer.lastCleanupError={id:panel.id,error:cleanupError};}
          throw error;
        }
      }
    },
    dispose(){for(const [id,record] of records)remove(id,record);}
  };
  return layer;
}
