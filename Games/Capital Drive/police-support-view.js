import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

// Original pooled block-built spotting helicopter and quad-rotor drone.
export function createPoliceSupportView(scene) {
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial({color:0x343e4b});
  const rotorGeometry=new THREE.BoxGeometry(1,1,1),rotorMaterial=new THREE.MeshLambertMaterial({color:0x182029});
  const bodies=new THREE.InstancedMesh(geometry,material,8),rotors=new THREE.InstancedMesh(rotorGeometry,rotorMaterial,6);
  bodies.frustumCulled=rotors.frustumCulled=false;scene.add(bodies,rotors);
  const pose=new THREE.Object3D();let elapsed=0,disposed=false;
  const stats={craft:0,drawCalls:0,geometryCount:2,materialCount:2,lightsCreated:0};
  function update(descriptors=[],dt=0,{interior=false}={}) {
    if(disposed)return;
    if(Number.isFinite(dt)&&dt>0)elapsed=(elapsed+Math.min(dt,.1))%1000;
    let bodyCount=0,rotorCount=0;stats.craft=0;
    function part(mesh,craft,x,y,z,sx,sy,sz,spin=0){
      const c=Math.cos(craft.yaw||0),s=Math.sin(craft.yaw||0);
      pose.position.set(craft.x+c*x+s*z,craft.y+y,craft.z-s*x+c*z);
      pose.rotation.set(0,(craft.yaw||0)+spin,0);pose.scale.set(sx,sy,sz);pose.updateMatrix();
      mesh.setMatrixAt(mesh===bodies?bodyCount++:rotorCount++,pose.matrix);
    }
    if(!interior)for(const craft of descriptors.slice(0,2)){
      if(![craft.x,craft.y,craft.z].every(Number.isFinite))continue;
      stats.craft++;
      if(craft.kind==='helicopter'){
        part(bodies,craft,0,0,0,2,1.6,4);part(bodies,craft,0,.2,3, .45,.5,4);
        part(bodies,craft,0,1,4.5,.3,1.8,1);part(rotors,craft,0,1.2,0,9,.12,.35,elapsed*22);
      }else{
        part(bodies,craft,0,0,0,.9,.35,.9);
        for(const x of [-.8,.8])for(const z of [-.8,.8])part(rotors,craft,x,.15,z,1,.05,.12,elapsed*35);
      }
    }
    bodies.count=bodyCount;rotors.count=rotorCount;bodies.visible=bodyCount>0;rotors.visible=rotorCount>0;
    if(bodyCount)bodies.instanceMatrix.needsUpdate=true;if(rotorCount)rotors.instanceMatrix.needsUpdate=true;
    stats.drawCalls=Number(bodies.visible)+Number(rotors.visible);
  }
  update();
  return {update,stats,dispose(){if(disposed)return;disposed=true;scene.remove(bodies,rotors);geometry.dispose();rotorGeometry.dispose();material.dispose();rotorMaterial.dispose();
    stats.craft=stats.drawCalls=stats.geometryCount=stats.materialCount=0;}};
}
