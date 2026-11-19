import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
export function createStuntRampsView(scene,stunts) {
  const positions=[],colors=[];
  const color=new THREE.Color(0xb87935);
  for(const r of stunts.ramps) {
    const [a,b,c,d]=r.vertices;
    const lowC=[c[0],r.base,c[2]],lowD=[d[0],r.base,d[2]];
    for(const p of [a,d,c,a,c,b,b,c,lowC,a,lowD,d,lowD,lowC,c,lowD,c,d]){positions.push(...p);colors.push(color.r,color.g,color.b);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
  const material=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geometry,material);mesh.name='Fictional park stunt ramps';scene.add(mesh);
  return {dispose(){scene.remove(mesh);geometry.dispose();material.dispose();}};
}
