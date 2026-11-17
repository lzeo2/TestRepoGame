import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

function quadrotorGeometry() {
  const positions=[], colors=[], color=new THREE.Color();
  function box(x,y,z,w,h,d,tint) {
    color.setHex(tint);
    const vertices=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];
    for(const face of [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[3,2,6,7],[4,5,1,0]]) {
      for(const index of [face[0],face[1],face[2],face[0],face[2],face[3]]) {
        const p=vertices[index]; positions.push(x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2); colors.push(color.r,color.g,color.b);
      }
    }
  }
  box(0,0,0,.42,.18,.48,0xd2b566); box(0,-.1,-.25,.18,.13,.13,0x26303a);
  for(const x of [-1,1]) for(const z of [-1,1]) {
    box(x*.2,0,z*.2,.5,.065,.06,0x343d47);
    box(x*.4,.025,z*.2,.1,.12,.1,0x343d47);
    box(x*.4,.1,z*.2,.37,.025,.07,0x1d252c);
    box(x*.4,.1,z*.2,.07,.025,.37,0x1d252c);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere(); return geometry;
}

// One pooled draw, original quadrotor geometry, no loop or resource churn.
export function createDroneView(scene) {
  const geometry=quadrotorGeometry(), material=new THREE.MeshLambertMaterial({vertexColors:true});
  const mesh=new THREE.Mesh(geometry,material); mesh.name='Recon quadrotor'; mesh.visible=false; scene.add(mesh);
  let disposed=false;
  return {
    update(snapshot,{firstPerson=false}={}) {
      if(disposed)return;
      const active=Boolean(snapshot?.active && [snapshot.x,snapshot.y,snapshot.z,snapshot.yaw].every(Number.isFinite));
      mesh.visible=active && !firstPerson;
      if(active) { mesh.position.set(snapshot.x,snapshot.y,snapshot.z); mesh.rotation.set(0,snapshot.yaw,0); }
    },
    get stats() { return Object.freeze({meshes:disposed?0:1,visible:mesh.visible?1:0,drawCalls:mesh.visible?1:0,
      triangles:disposed?0:geometry.attributes.position.count/3,disposed}); },
    dispose() { if(disposed)return; disposed=true; mesh.visible=false; scene.remove(mesh); geometry.dispose(); material.dispose(); }
  };
}
