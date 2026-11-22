import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import {mergeGeometries} from '../../assets/car-arcade/vendor/BufferGeometryUtils.js';

const CAP=24,RANGE=240;
// Staged original scenery, not species/population data. No gameplay queries.
export function createBirdsView(scene,{sites=[],heightAt=()=>0}={}) {
  const root=new THREE.Group();root.name='Staged black and white bird flocks';scene.add(root);
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const parts=[];
  const color=(g,tint)=>{const c=new THREE.Color(tint),values=new Float32Array(g.attributes.position.count*3);for(let i=0;i<values.length;i+=3)c.toArray(values,i);g.deleteAttribute('uv');g.setAttribute('color',new THREE.BufferAttribute(values,3));return g;};
  parts.push(color(new THREE.SphereGeometry(1,8,5).scale(.15,.13,.30),0x20272b));
  parts.push(color(new THREE.SphereGeometry(1,6,4).scale(.12,.12,.13).translate(0,.13,-.23),0x20272b));
  parts.push(color(new THREE.BoxGeometry(.13,.055,.15).translate(0,.19,-.11),0xe7e4d9));
  parts.push(color(new THREE.BoxGeometry(.13,.035,.29).rotateX(-.12).translate(0,-.02,.37),0x20272b));
  parts.push(color(new THREE.ConeGeometry(.035,.16,4).rotateX(-Math.PI/2).translate(0,.12,-.40),0xa7aba3));
  const body=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
  const wing=new THREE.BufferGeometry();wing.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.12,.58,0,.08,.12,0,.28,0,0,-.12,.12,0,.28,0,0,.13],3));wing.computeVertexNormals();color(wing,0x20272b);
  const wingParts=[wing,color(new THREE.BoxGeometry(.20,.012,.12).translate(.22,.012,.09),0xe7e4d9)];
  const wingPieces=wingParts.map(g=>g.index?g.toNonIndexed():g);
  const wingGeometry=mergeGeometries(wingPieces,false);
  wingPieces.forEach((g,i)=>{if(g!==wingParts[i])g.dispose();});
  // Dispose the temporary strip and patch; the merged geometry owns all arrays.
  wingParts.forEach(g=>g.dispose());
  const meshes=[body,wingGeometry,wingGeometry].map((g,i)=>{const mesh=new THREE.InstancedMesh(g,material,CAP);mesh.name=['Bird bodies','Bird left wings','Bird right wings'][i];mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);root.add(mesh);return mesh;});
  const staging=sites.filter(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)).slice(0,16).map((s,i)=>{const y=heightAt(s.x,s.z);return {x:s.x,z:s.z,y:Number.isFinite(y)?y:0,seed:i*2.17};});
  const pose=new THREE.Object3D(),wingPose=new THREE.Object3D(),matrix=new THREE.Matrix4();let elapsed=0,visible=0,disposed=false;
  function update(focus,dt=0,{lowGraphics=false,paused=false,reducedMotion=false}={}){
    if(disposed)return;
    if(!paused&&!reducedMotion)elapsed+=Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0));
    visible=0;const limit=lowGraphics?12:CAP;
    if(focus&&Number.isFinite(focus.x)&&Number.isFinite(focus.z))for(const site of staging){
      if((site.x-focus.x)**2+(site.z-focus.z)**2>RANGE**2)continue;
      for(let i=0;i<6&&visible<limit;i++){
        const phase=elapsed*.22+site.seed+i*.16,radius=14+(i%3)*2;
        pose.position.set(site.x+Math.sin(phase)*radius,site.y+10+i*.6+Math.sin(phase*2)*.65,site.z+Math.cos(phase)*radius);pose.rotation.set(0,phase-Math.PI/2,Math.sin(phase)*.09);pose.scale.setScalar(.85+(i%3)*.10);pose.updateMatrix();
        meshes[0].setMatrixAt(visible,pose.matrix);
        for(let j=1;j<3;j++){
          const side=j===1?-1:1;
          wingPose.position.set(side*.09,.03,0);wingPose.rotation.set(0,0,side*(reducedMotion?.12:Math.sin(elapsed*8+i+site.seed)*.52));wingPose.scale.set(side,1,1);wingPose.updateMatrix();matrix.multiplyMatrices(pose.matrix,wingPose.matrix);meshes[j].setMatrixAt(visible,matrix);
        }
        visible++;
      }
      if(visible>=limit)break;
    }
    for(const mesh of meshes){mesh.count=visible;mesh.visible=visible>0;mesh.instanceMatrix.needsUpdate=true;}
  }
  const trianglesPerBird=(body.index?.count||body.attributes.position.count)/3+2*(wingGeometry.index?.count||wingGeometry.attributes.position.count)/3;
  return {update,stats:()=>({visible,capacity:CAP,sites:staging.length,draws:visible?3:0,triangles:visible*trianglesPerBird,disposed}),dispose(){if(disposed)return;disposed=true;visible=0;scene.remove(root);body.dispose();wingGeometry.dispose();material.dispose();meshes.forEach(m=>m.dispose());}};
}
