import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const RANGE=300,MAX_PROPS=16;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const freezePoints=points=>Object.freeze(points.map(p=>Object.freeze(p)));
function rectangle({x,z,yaw,width,depth},front=-depth/2,back=depth/2) {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return freezePoints([[-width/2,front],[width/2,front],[width/2,back],[-width/2,back]]
    .map(([u,v])=>[x+c*u+s*v,z-s*u+c*v]));
}

// The controller registers these same boxes before building collision and shot
// indices. Visibility never changes their physical authority or allocates props.
export function createAssassinationSiteView(scene,compound,heightAt=()=>0) {
  let mesh=null,geometry=null,material=null,disposed=false;
  const barriers=[],empty=Object.freeze([]);
  let footprint=empty,treeExclusion=empty;
  if(compound) {
    if(!point(compound.origin)||!Number.isFinite(compound.origin.yaw)||
      ![compound.width,compound.depth].every(v=>Number.isFinite(v)&&v>0&&v<=30)||
      !Array.isArray(compound.props)||compound.props.length>MAX_PROPS)throw new Error('Invalid assassination compound geometry.');
    const box={...compound.origin,width:compound.width,depth:compound.depth};
    footprint=rectangle(box,0,compound.depth);
    treeExclusion=rectangle({...box,width:compound.width+4},-2,compound.depth+2);
    for(const [index,prop] of compound.props.entries()) {
      if(!point(prop)||![prop.yaw,prop.width,prop.depth,prop.height].every(Number.isFinite)||
        prop.width<=0||prop.depth<=0||prop.height<=0||Math.max(prop.width,prop.depth)>30||prop.height>6)
        throw new Error('Invalid assassination compound prop.');
      const points=rectangle(prop),heights=points.map(([x,z])=>heightAt(x,z));
      if(!heights.every(Number.isFinite))throw new Error('Assassination compound requires finite ground heights.');
      // Bury the flat box toe and raise its top across the small local grade.
      const y=Math.min(...heights),height=Math.max(...heights)-y+prop.height;
      barriers.push(Object.freeze({id:prop.id||`${compound.id}-prop-${index}`,kind:prop.kind,
        x:prop.x,z:prop.z,yaw:prop.yaw,width:prop.width,depth:prop.depth,y,height,
        color:Number.isInteger(prop.color)?prop.color:0x69746c,points}));
    }
    if(scene&&barriers.length) {
      geometry=new THREE.BoxGeometry(1,1,1);material=new THREE.MeshLambertMaterial({color:0xffffff});
      mesh=new THREE.InstancedMesh(geometry,material,barriers.length);
      mesh.name='Fictional Blackthorn collection yard';mesh.visible=false;mesh.count=barriers.length;
      const transform=new THREE.Object3D(),color=new THREE.Color();
      for(const [index,prop] of barriers.entries()) {
        transform.position.set(prop.x,prop.y+prop.height/2,prop.z);transform.rotation.set(0,prop.yaw,0);
        transform.scale.set(prop.width,prop.height,prop.depth);transform.updateMatrix();
        mesh.setMatrixAt(index,transform.matrix);mesh.setColorAt(index,color.setHex(prop.color));
      }
      mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();scene.add(mesh);
    }
  }
  const bodies=Object.freeze(barriers);
  return Object.freeze({barriers:bodies,footprint,treeExclusion,
    update(focus){if(mesh&&!disposed)mesh.visible=!!point(focus)&&Math.hypot(focus.x-compound.origin.x,focus.z-compound.origin.z)<RANGE;},
    get stats(){return Object.freeze({props:bodies.length,instances:disposed?0:bodies.length,visible:!!mesh?.visible,
      drawCalls:Number(!disposed&&!!mesh?.visible),triangles:disposed?0:bodies.length*12,
      geometryCount:Number(!disposed&&!!geometry),materialCount:Number(!disposed&&!!material),disposed});},
    dispose(){if(disposed)return;disposed=true;if(mesh){mesh.visible=false;scene.remove(mesh);mesh.dispose();geometry.dispose();material.dispose();}}
  });
}
