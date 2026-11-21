import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const LIMIT = 3;
const RANGE_SQUARED = 135 ** 2;
const INK = 0x26383a;
const PALE = 0xe1dfc8;
const TEAL = 0x267989;
const AMBER = 0xf1a44f;
const METAL = 0x809293;
const part = (x, y, z, width, height, depth, colour) => ({x,y,z,width,height,depth,colour});

// Original local prop art. All shapes share the same box and material batch.
const MODELS = Object.freeze({
  scope: [
    part(0,.13,0,.82,.26,.65,INK),
    part(0,.58,0,.18,.84,.18,METAL),
    part(0,1.09,0,.58,.2,.38,TEAL),
    part(-.16,1.09,-.21,.15,.13,.08,PALE), part(.16,1.09,-.21,.15,.13,.08,PALE),
    part(0,1.21,.02,.27,.045,.17,AMBER),
  ],
  credential: [
    part(0,.07,0,.77,.14,.55,INK),
    part(0,.47,0,.62,.66,.42,TEAL), part(0,.42,-.222,.49,.52,.036,METAL),
    part(0,.82,0,.72,.09,.47,INK),
    part(.07,.89,-.055,.26,.046,.2,PALE), part(.12,.92,-.055,.055,.014,.16,AMBER),
  ],
  ledger: [
    part(0,.26,0,.88,.52,.64,0x795742), part(0,.32,-.325,.83,.042,.025,AMBER),
    part(0,.54,0,.91,.065,.67,INK),
    part(0,.598,0,.64,.052,.45,TEAL), part(-.153,.629,0,.294,.018,.41,PALE),
    part(.153,.629,0,.294,.018,.41,PALE), part(0,.643,0,.037,.012,.43,AMBER),
  ],
  relay: [
    part(0,.06,0,.84,.12,.66,INK), part(0,.58,0,.68,.96,.42,METAL),
    part(0,.82,-.23,.54,.29,.065,TEAL), part(0,1.09,0,.75,.07,.47,INK),
    part(.14,1.25,.11,.065,.28,.065,METAL),
    part(-.16,.85,-.271,.095,.075,.03,AMBER), part(.04,.85,-.271,.095,.075,.03,PALE),
    part(0,.29,-.224,.49,.02,.022,INK),
  ],
  case: [
    part(0,.06,0,1,.12,.61,INK), part(0,.28,0,.91,.32,.55,AMBER),
    part(0,.44,0,.96,.07,.585,0x644837),
    part(-.29,.34,0,.071,.27,.587,INK), part(.29,.34,0,.071,.27,.587,INK),
    part(-.13,.52,0,.048,.13,.075,INK), part(.13,.52,0,.048,.13,.075,INK),
    part(0,.58,0,.29,.045,.075,INK), part(0,.31,-.291,.21,.1,.025,PALE),
  ],
  dummy: [
    // Training silhouette, mounted on a visible rig and painted with safety bars.
    part(0,.06,0,.99,.12,.7,INK), part(0,.56,0,.15,.92,.16,METAL),
    part(0,1.15,0,.5,.51,.25,AMBER), part(0,1.34,-.136,.46,.09,.026,INK),
    part(0,1.59,0,.27,.32,.25,PALE),
    part(-.32,1.1,0,.13,.49,.22,TEAL), part(.32,1.1,0,.13,.49,.22,TEAL),
  ],
  exit: [
    part(0,.04,0,.92,.08,.65,INK), part(-.29,.62,0,.08,1.2,.085,METAL),
    part(.29,.62,0,.08,1.2,.085,METAL), part(0,1.18,0,.85,.29,.12,TEAL),
    part(0,1.18,-.068,.54,.095,.022,PALE),
    part(-.23,1.23,-.069,.09,.055,.022,PALE), part(-.23,1.13,-.069,.09,.055,.022,PALE),
    part(0,.17,-.315,.32,.065,.035,AMBER),
  ],
});
const CAPACITY = LIMIT * Math.max(...Object.values(MODELS).map(model=>model.length));

export function createStealthContractsView(scene, heightAt) {
  const geometry=new THREE.BoxGeometry(1,1,1), material=new THREE.MeshLambertMaterial({color:0xffffff});
  const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);
  mesh.name='Stealth contract objectives';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const box=new THREE.Object3D(),colour=new THREE.Color();
  let previous='',propsShown=0,disposed=false;

  function update(props, focus) {
    if (disposed) return;
    const visible=[];
    let fingerprint='';
    if (Number.isFinite(focus?.x)&&Number.isFinite(focus?.z)) {
      for (const prop of props??[]) {
        if (visible.length===LIMIT) break;
        if (!prop||!Object.hasOwn(MODELS,prop.visual)||![prop.x,prop.z].every(Number.isFinite)||
          ((prop.x-focus.x)**2+(prop.z-focus.z)**2)>RANGE_SQUARED) continue;
        const yaw=Number.isFinite(prop.yaw)?prop.yaw:0;
        const elevation=Number.isFinite(prop.y)?prop.y:undefined;
        visible.push({visual:prop.visual,x:prop.x,z:prop.z,yaw,elevation});
        fingerprint+=`${prop.visual}/${prop.x}/${prop.z}/${yaw}/${elevation};`;
      }
    }
    if (fingerprint===previous) return;
    previous=fingerprint;
    propsShown=0;mesh.count=0;
    for (const prop of visible) {
      const floor=prop.elevation??heightAt(prop.x,prop.z);
      if (!Number.isFinite(floor)) continue;
      const c=Math.cos(prop.yaw),s=Math.sin(prop.yaw);
      box.rotation.set(0,prop.yaw,0);
      for (const part of MODELS[prop.visual]) {
        box.position.set(prop.x+c*part.x+s*part.z,floor+part.y,prop.z-s*part.x+c*part.z);
        box.scale.set(part.width,part.height,part.depth);box.updateMatrix();
        mesh.setMatrixAt(mesh.count,box.matrix);mesh.setColorAt(mesh.count,colour.setHex(part.colour));mesh.count++;
      }
      propsShown++;
    }
    mesh.visible=mesh.count>0;
    mesh.instanceMatrix.needsUpdate=true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
  }

  return Object.freeze({update,get stats(){return Object.freeze({props:propsShown,drawCalls:Number(mesh.visible),triangles:mesh.count*12,capacity:CAPACITY,disposed});},dispose(){
    if (disposed) return;
    disposed=true;mesh.count=0;mesh.visible=false;propsShown=0;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();
  }});
}
