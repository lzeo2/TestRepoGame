import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from '../../assets/car-arcade/models.js';

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({canvas, antialias:true});
  renderer.setPixelRatio(1);
  renderer.setClearColor('#d0bda3');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 100);
  camera.position.set(15, 15, 21); camera.lookAt(0, 0, -1);
  scene.add(new THREE.HemisphereLight('#fff3df', '#71644f', 2.4));
  const sun = new THREE.DirectionalLight('#ffffff', 2.5); sun.position.set(-8, 18, 10); scene.add(sun);
  const geometry = new THREE.BoxGeometry(1, 1, 1), materials = [], textures = [];
  const batches = new Map();
  function box(color, x,y,z,w,h,d) {
    if (!batches.has(color)) batches.set(color, []);
    batches.get(color).push([x,y,z,w,h,d]);
  }
  // Open dollhouse workshop: brick courses, roof trusses, tools and working bays.
  box('#a39781',0,-.2,-1,25,.4,20);
  box('#b78160',0,2.4,-10,25,4.8,.3);
  box('#b78160',-12.4,2.4,-3,.3,4.8,14);
  for(let y=.4;y<4.8;y+=.6) for(let x=-12;x<12;x+=1.5) box('#9b674d',x+(Math.round(y*10)%2)*.3,y,-9.81,1.35,.025,.025);
  for(const x of [-11.7,-4,4,11.7]) { box('#474d4a',x,2.5,-9.5,.18,5,.25); box('#474d4a',x,4.9,-3,.18,.18,13); }
  for(const z of [-8,-3,2]) box('#e8ddba',0,4.8,z,24,.12,.15);
  for(let i=0;i<8;i++) {
    const x=-9+(i%4)*6, z=i<4?-5:1;
    box('#e9d8ad',x-.0,.015,z,5.3,.025,.06);
    box('#e9d8ad',x-2.6,.015,z-2.5,.06,.025,5);
  }
  for(let i=0;i<5;i++) {
    box('#555f64',-8+i*3,1,-9,2.7,1.8,.8);
    for(let y=.4;y<1.8;y+=.4) {box('#adb3ac',-8+i*3,y,-8.56,2.4,.025,.04);box('#d9c699',-8+i*3,y+.12,-8.5,.6,.055,.08);}
    box('#c49c58',-8+i*3,1.96,-9,2.8,.15,1);
  }
  for(let i=0;i<12;i++) box('#343c3e',-10+i*.4,2.8+(i%3)*.14,-9.58,.09,.5,.09);
  box('#b64d36',10,1,-8.8,.55,1.1,.55); box('#ddd2b8',10,1.8,-9.6,.8,.6,.05);
  box('#494f50',0,.10,6.7,6.8,.2,5.6);
  box('#d8a447',0,.22,6.7,6.2,.04,5.1);
  box('#3b4142',0,.27,6.7,5.6,.06,4.6);
  const matrix = new THREE.Matrix4(), pos = new THREE.Vector3(), scale = new THREE.Vector3(), quat = new THREE.Quaternion();
  for(const [color,parts] of batches) {
    const mat = new THREE.MeshStandardMaterial({color,roughness:.85}); materials.push(mat);
    const mesh = new THREE.InstancedMesh(geometry,mat,parts.length);
    parts.forEach(([x,y,z,w,h,d],i)=>{matrix.compose(pos.set(x,y,z),quat,scale.set(w,h,d));mesh.setMatrixAt(i,matrix);});scene.add(mesh);
  }
  function sign(text,x,y,z,width) {
    const c=document.createElement('canvas');c.width=768;c.height=128;
    const ctx=c.getContext('2d');ctx.fillStyle='#ece0bd';ctx.fillRect(0,0,768,128);ctx.fillStyle='#292823';ctx.font='bold 42px sans-serif';ctx.textAlign='center';ctx.fillText(text,384,78);
    const texture=new THREE.CanvasTexture(c);textures.push(texture);
    const mat=new THREE.MeshBasicMaterial({map:texture});materials.push(mat);
    const g=new THREE.PlaneGeometry(width,width/6), mesh=new THREE.Mesh(g,mat);mesh.position.set(x,y,z);scene.add(mesh);return g;
  }
  const signGeometry=[sign('BOROUGH MOTOR WORKS',0,3.9,-9.6,10),sign('CHECK THE OIL, LAD',7.5,2.9,-9.55,5)];
  const workerMat=new THREE.MeshStandardMaterial({color:'#486a91'});materials.push(workerMat);
  const workers=new THREE.InstancedMesh(geometry,workerMat,9);scene.add(workers);
  const bayMat=new THREE.MeshStandardMaterial({color:'#ba6b35'});materials.push(bayMat);
  const lifts=new THREE.InstancedMesh(geometry,bayMat,8);scene.add(lifts);
  const slots=new Map(); let angle=-.5, owned=0, preview='bricklet', lastWidth=0,lastHeight=0;
  function put(key,id,x,z,rotation=0) {
    let car=slots.get(key);
    if(car?.name!==id) {if(car) scene.remove(car); car=createCar(id);slots.set(key,car);scene.add(car);}
    car.position.set(x,key==='stand'?.31:.03,z);car.rotation.y=rotation;
  }
  function update(business, selected) {
    preview=selected.carId; owned=business.inventory.length;
    put('stand',preview,0,6.7,angle);
    business.inventory.forEach((item,i)=>put(i,item.carId,-9+(i%4)*6,i<4?-5:1));
    for(const [key,car] of slots) if(typeof key==='number'&&key>=owned){scene.remove(car);slots.delete(key);}
    lifts.count=business.bays*2;
    for(let i=0;i<lifts.count;i++){matrix.compose(pos.set(-11.4+Math.floor(i/2)*6,1.25,i%2?-2.7:-7.3),quat,scale.set(.22,2.5,.3));lifts.setMatrixAt(i,matrix);}lifts.instanceMatrix.needsUpdate=true;
    workers.count=business.staff*3;
    for(let i=0;i<business.staff;i++) for(let p=0;p<3;p++){matrix.compose(pos.set(-7+i*6,p===0?1.5:.8,-2),quat,scale.set(p===0?.32:.45,p===0?.32:p===1?.65:.8,.35));workers.setMatrixAt(i*3+p,matrix);}workers.instanceMatrix.needsUpdate=true;
  }
  function rotate(delta){angle+=delta;const car=slots.get('stand');if(car)car.rotation.y=angle;}
  function render(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w!==lastWidth||h!==lastHeight){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();lastWidth=w;lastHeight=h;}
    renderer.render(scene,camera);
  }
  return {update,rotate,render,inspect:()=>({triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls,dpr:1,ownedCars:owned,selectedCar:preview,angle}),
    dispose(){renderer.dispose();geometry.dispose();signGeometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());disposeCars();}};
}
