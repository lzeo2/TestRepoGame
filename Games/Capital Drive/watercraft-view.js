import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const LIMIT=2, RANGE_SQUARED=280**2, SIGN_RANGE_SQUARED=180**2;
const INK=0x213739, IVORY=0xf0eee1, TEAL=0x237d83, CYAN=0x2eb4d1;
const GLASS=0x597e88, GREY=0x697c81, GOLD=0xe8ae61;
const part=(x,y,z,width,height,length,colour,turn=0,tilt=0)=>({x,y,z,width,height,length,colour,turn,tilt});

// Low, stepped bows and layered hull bands deliberately give the two original
// models different silhouettes even at a distance.
const BOAT=[
  part(0,-.13,.18,1.82,.41,3.45,INK),part(0,-.12,-1.75,1.32,.36,.75,INK),part(0,-.08,-2.24,.57,.25,.39,INK),
  part(0,.16,.22,2.12,.31,3.67,IVORY),part(0,.22,-1.77,1.61,.29,.78,IVORY),part(0,.25,-2.28,.66,.25,.44,IVORY),
  part(0,.09,.07,2.145,.095,3.84,TEAL),part(0,.15,-1.83,1.64,.095,.605,TEAL),
  part(0,.345,.02,1.92,.07,3.41,GREY),part(0,.389,-1.66,1.4,.105,.9,IVORY),part(0,.417,-2.24,.6,.075,.32,IVORY),
  part(-1.01,.46,.27,.13,.161,3.49,IVORY),part(1.01,.46,.27,.13,.161,3.49,IVORY),
  part(0,.47,1.95,2.02,.17,.19,IVORY),
  part(0,.68,-.83,1.49,.38,.1,GLASS,0,-.29),part(0,.86,-.87,1.54,.055,.085,INK),
  part(.53,.55,.15,.55,.24,.66,0xcfb198),part(.53,.77,.4,.55,.36,.18,0xcfb198),
  part(-.52,.55,.18,.53,.25,.67,0xcfb198),part(-.52,.76,.44,.53,.34,.16,0xcfb198),
  part(0,.49,1.24,1.6,.19,.45,0xcfb198),part(0,.43,2.22,.51,.43,.46,INK),
  part(0,.67,2.2,.52,.12,.45,GREY),part(0,.44,2.46,.27,.059,.018,GOLD),
];
const SKI=[
  part(0,-.1,.12,.81,.3,1.75,INK),part(0,-.07,-.97,.58,.23,.6,INK),
  part(0,.12,.14,1.04,.23,1.83,CYAN),part(0,.196,-.96,.76,.24,.63,CYAN),part(0,.191,-1.32,.41,.17,.17,CYAN),
  part(0,.269,.21,.97,.086,1.75,IVORY),part(0,.338,.12,.67,.19,1.68,CYAN),
  part(0,.45,-.615,.56,.22,.76,TEAL),part(0,.523,-.435,.411,.172,.42,CYAN),
  part(0,.57,.455,.43,.18,.86,INK),part(0,.662,.675,.405,.095,.4,GREY),
  part(-.393,.334,.39,.118,.027,1.13,INK),part(.393,.334,.39,.118,.027,1.13,INK),
  part(0,.71,-.48,.18,.32,.18,INK,0,-.24),part(0,.85,-.57,.75,.065,.08,INK),
  part(0,.401,-1.146,.32,.061,.025,IVORY),part(0,.312,1.019,.24,.075,.022,GOLD),
];
const BODY_MODELS={boat:{width:2.15,length:5.1,parts:BOAT},'jet-ski':{width:1.04,length:2.83,parts:SKI}};
const DRIVER_SKIN=0xc8986f, DRIVER_VEST=0xe3a452;
const BOAT_DRIVER=[
  part(.53,1.02,.07,.37,.53,.24,TEAL),part(.53,1.075,-.056,.32,.33,.045,DRIVER_VEST),
  part(.53,1.4,.02,.23,.275,.225,DRIVER_SKIN),part(.53,1.549,.013,.248,.057,.23,INK),
  part(.33,.92,-.32,.12,.119,.48,TEAL),part(.73,.92,-.32,.12,.119,.48,TEAL),
];
const SKI_DRIVER=[
  part(0,1.015,.12,.39,.5,.26,TEAL,0,-.26),part(0,1.065,-.02,.34,.333,.08,DRIVER_VEST,0,-.26),
  part(0,1.359,-.038,.23,.274,.23,DRIVER_SKIN),part(0,1.5,-.04,.27,.07,.27,INK),
  part(-.22,.912,-.28,.115,.118,.55,TEAL,0,-.1),part(.22,.912,-.28,.115,.118,.55,TEAL,0,-.1),
  part(-.291,.574,.341,.149,.34,.27,INK),part(.291,.574,.341,.149,.34,.27,INK),
];
const GLYPHS={B:[14,9,14,9,14],O:[6,9,9,9,6],A:[6,9,15,9,9],T:[15,6,6,6,6],S:[7,8,6,1,14],H:[9,9,15,9,9],E:[15,8,14,8,15],D:[14,9,9,9,14]};
const SIGN=[part(-1.58,.8,0,.11,1.6,.11,GREY),part(1.58,.8,0,.11,1.6,.11,GREY),
  part(0,1.62,0,3.48,.524,.085,TEAL),part(0,1.369,-.049,3.48,.032,.028,GOLD)];
for (const [letterIndex,letter] of [...'BOAT SHED'].entries()) {
  if (letter===' ') continue;
  GLYPHS[letter].forEach((bits,row)=>{
    const cells=bits.toString(2).padStart(4,'0');
    for (const match of cells.matchAll(/1+/g)) {
      const size=match[0].length;
      SIGN.push(part(-1.59+.36*letterIndex+.072*(match.index+(size-1)/2),1.777-row*.078,-.057,size*.071,.071,.031,IVORY));
    }
  });
}
const CAPACITY=LIMIT*(Math.max(BOAT.length+BOAT_DRIVER.length,SKI.length+SKI_DRIVER.length)+2)+SIGN.length;

export function createWatercraftView(scene) {
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial({color:0xffffff});
  const mesh=new THREE.InstancedMesh(geometry,material,CAPACITY);
  mesh.name='Original lake boat, jet ski and shed sign';mesh.count=0;mesh.visible=false;mesh.frustumCulled=false;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(mesh);
  const box=new THREE.Object3D(),colour=new THREE.Color();
  let previous='',disposed=false,bodies=0,wakes=0,signShown=false;

  function setBoxes(parts,craft,widthScale=1,lengthScale=1) {
    const c=Math.cos(craft.yaw),s=Math.sin(craft.yaw);
    for (const part of parts) {
      const x=part.x*widthScale,z=part.z*lengthScale;
      box.position.set(craft.x+c*x+s*z,craft.y+part.y,craft.z-s*x+c*z);
      box.rotation.set(part.tilt,craft.yaw+part.turn,0,'YXZ');
      box.scale.set(part.width*widthScale,part.height,part.length*lengthScale);box.updateMatrix();
      mesh.setMatrixAt(mesh.count,box.matrix);mesh.setColorAt(mesh.count,colour.setHex(part.colour));mesh.count++;
    }
  }
  function inRange(p,focus,range) {
    return p&&[p.x,p.y,p.z,p.yaw,focus?.x,focus?.z].every(Number.isFinite)&&((p.x-focus.x)**2+(p.z-focus.z)**2)<=range;
  }
  function update(snapshot,focus) {
    if (disposed) return;
    const selected=[];
    for (const craft of snapshot?.crafts||[]) {
      if (selected.length===LIMIT) break;
      if (inRange(craft,focus,RANGE_SQUARED)&&Object.hasOwn(BODY_MODELS,craft.kind)) selected.push(craft);
    }
    const candidate=snapshot?.dock?.sign;
    const sign=inRange(candidate,focus,SIGN_RANGE_SQUARED)?candidate:null;
    const key=selected.map(c=>`${c.kind}:${c.x}:${c.y}:${c.z}:${c.yaw}:${c.width}:${c.length}:${!!c.occupied}:${Math.round(Math.abs(c.speed||0)*4)}`).join(';')+(sign?`|${sign.x}:${sign.y}:${sign.z}:${sign.yaw}`:'');
    if (key===previous) return;
    previous=key;mesh.count=0;bodies=selected.length;wakes=0;signShown=!!sign;

    for (const craft of selected) {
      const model=BODY_MODELS[craft.kind];
      const width=Number.isFinite(craft.width)&&craft.width>0?craft.width:model.width;
      const length=Number.isFinite(craft.length)&&craft.length>0?craft.length:model.length;
      setBoxes(model.parts,craft,width/model.width,length/model.length);
      if (craft.occupied) setBoxes(craft.kind==='boat'?BOAT_DRIVER:SKI_DRIVER,craft,width/model.width,length/model.length);
      const speed=Math.round(Math.abs(craft.speed||0)*4)/4;
      if (speed>=1.5) {
        const span=Math.min(5,1.1+speed*.42),stern=length/2+span*.45;
        setBoxes([part(-width*.49,.013,stern,.15,.025,span,0xb3d6d0,-.22),
          part(width*.49,.013,stern,.15,.025,span,0xb3d6d0,.22)],craft);
        wakes++;
      }
    }
    if (sign) setBoxes(SIGN,sign);
    mesh.visible=mesh.count>0;mesh.instanceMatrix.needsUpdate=true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate=true;
  }
  return Object.freeze({update,get stats(){return Object.freeze({bodies,wakes,sign:signShown,drawCalls:Number(mesh.visible),triangles:12*mesh.count,capacity:CAPACITY,disposed});},dispose(){
    if (disposed) return;
    disposed=true;bodies=0;wakes=0;signShown=false;mesh.count=0;mesh.visible=false;
    mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();
  }});
}
