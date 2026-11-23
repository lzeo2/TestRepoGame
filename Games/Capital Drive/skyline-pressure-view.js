import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const RANGE=450,SEGMENTS=32;
const point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
// Original fictional pressure art. The source snapshot alone owns targets,
// timing, damage and cancellation; this adapter never creates another drone.
export function createSkylinePressureView(scene,heightAt=()=>0){
  const root=new THREE.Group();root.name='Skylark hostile pressure';root.visible=false;scene.add(root);
  const geometry=new THREE.BoxGeometry(1,1,1);
  const droneMaterial=new THREE.MeshLambertMaterial({color:0xffffff});
  const warningMaterial=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,toneMapped:false});
  const drone=new THREE.InstancedMesh(geometry,droneMaterial,24),ring=new THREE.InstancedMesh(geometry,warningMaterial,SEGMENTS+2);
  drone.name='Hostile Skylark quadrotor';ring.name='Skylark red strike telegraph';
  drone.frustumCulled=ring.frustumCulled=false;drone.visible=ring.visible=false;drone.count=ring.count=0;ring.renderOrder=2;
  root.add(drone,ring);
  const pose=new THREE.Object3D(),color=new THREE.Color(),forward=new THREE.Vector3(0,0,1),direction=new THREE.Vector3();
  let disposed=false,ringKey='',droneKey='';
  const ground=(x,z)=>{const y=heightAt(x,z);return Number.isFinite(y)?y:0;};
  const nearby=(p,focus)=>!point(focus)||Math.hypot(p.x-focus.x,p.z-focus.z)<RANGE;
  function box(mesh,p,x,y,z,w,h,d,tint,turn=0){
    const yaw=Number.isFinite(p.yaw)?p.yaw:0,c=Math.cos(yaw),s=Math.sin(yaw);
    pose.position.set(p.x+c*x+s*z,p.y+y,p.z-s*x+c*z);pose.rotation.set(0,yaw+turn,0);pose.scale.set(w,h,d);pose.updateMatrix();
    mesh.setMatrixAt(mesh.count,pose.matrix);mesh.setColorAt(mesh.count++,color.setHex(tint));
  }
  function upload(mesh){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}
  function drawDrone(p,jammed){
    drone.count=0;
    box(drone,p,0,0,0,.9,.3,.65,0x30363d);
    box(drone,p,0,.17,0,.58,.06,.5,jammed?0xc29a54:0xc74636);
    box(drone,p,0,-.19,-.28,.27,.2,.27,0x23282e);
    box(drone,p,0,-.19,-.43,.15,.12,.035,0xf25c43);
    for(const turn of [-1,1])box(drone,p,0,0,0,.09,.09,1.76,0x4d535a,turn*Math.atan2(.72,.5));
    for(const x of [-.72,.72])for(const z of [-.5,.5]){
      box(drone,p,x,.04,z,.22,.18,.22,0x222930);
      box(drone,p,x,.15,z,.52,.035,.065,0x141b22);
      box(drone,p,x,.15,z,.065,.035,.52,0x141b22);
      box(drone,p,x,.045,z-.12,.12,.07,.035,jammed?0xc29a54:0xf15340);
    }
    const health=Math.max(0,Math.min(1,p.health/p.maxHealth));
    box(drone,p,0,.43,0,.94,.07,.07,0x20252b);
    box(drone,p,-.46*(1-health),.43,-.045,.92*health,.05,.025,jammed?0xc29a54:0xed5945);
    upload(drone);
  }
  function drawRing(p){
    ring.count=0;
    for(let i=0;i<SEGMENTS;i++){
      const a=i*Math.PI*2/SEGMENTS,b=(i+1)*Math.PI*2/SEGMENTS;
      const ax=p.x+Math.cos(a)*p.radius,az=p.z+Math.sin(a)*p.radius,bx=p.x+Math.cos(b)*p.radius,bz=p.z+Math.sin(b)*p.radius;
      const ay=ground(ax,az)+.13,by=ground(bx,bz)+.13;
      direction.set(bx-ax,by-ay,bz-az);const length=direction.length();
      pose.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);pose.quaternion.setFromUnitVectors(forward,direction.normalize());pose.scale.set(.3,.055,length*1.025);pose.updateMatrix();
      ring.setMatrixAt(ring.count,pose.matrix);ring.setColorAt(ring.count++,color.setHex(i%2?0xff4938:0xc52824));
    }
    const center={x:p.x,z:p.z,y:ground(p.x,p.z)+.14};
    box(ring,center,0,0,0,.22,.04,Math.min(3,p.radius),0xff6046,Math.PI/4);
    box(ring,center,0,0,0,.22,.04,Math.min(3,p.radius),0xff6046,-Math.PI/4);
    upload(ring);
  }
  function update(snapshot,focus={}){
    if(disposed)return;
    const active=snapshot?.active===true&&snapshot.interiorId==null&&focus?.interiorId==null;
    root.visible=active;drone.visible=ring.visible=false;
    if(!active){drone.count=ring.count=0;ringKey=droneKey='';return;}
    const d=snapshot.drone;
    if(d?.active===true&&d.hostile===true&&point(d)&&[d.y,d.yaw,d.health,d.maxHealth].every(Number.isFinite)&&d.health>0&&d.maxHealth>0&&nearby(d,focus)){
      drone.visible=true;
      const key=[d.id,d.x,d.y,d.z,d.yaw,d.health,d.maxHealth,snapshot.jammed===true].join(':');
      if(key!==droneKey){drawDrone(d,snapshot.jammed===true);droneKey=key;}
    }else{drone.count=0;droneKey='';}
    const p=snapshot.strike;
    if(p?.active===true&&point(p)&&Number.isFinite(p.radius)&&p.radius>0&&p.radius<=60&&Number.isFinite(p.remaining)&&p.remaining>0&&Number.isFinite(p.total)&&p.total>0&&nearby(p,focus)){
      ring.visible=true;
      const key=[p.id,p.x,p.z,p.radius].join(':');
      if(key!==ringKey){drawRing(p);ringKey=key;}
      warningMaterial.opacity=.6+.35*(1-Math.max(0,Math.min(1,p.remaining/p.total)));
    }else{ring.count=0;ringKey='';}
  }
  return {update,get stats(){const draws=disposed?0:Number(drone.visible)+Number(ring.visible);return Object.freeze({disposed,draws,drawCalls:draws,meshes:disposed?0:2,geometryCount:disposed?0:1,materialCount:disposed?0:2,droneVisible:!disposed&&drone.visible,strikeVisible:!disposed&&ring.visible,instances:disposed?0:drone.count+ring.count,triangles:disposed?0:(drone.count+ring.count)*12});},
    dispose(){if(disposed)return;disposed=true;root.visible=drone.visible=ring.visible=false;drone.count=ring.count=0;drone.dispose();ring.dispose();geometry.dispose();droneMaterial.dispose();warningMaterial.dispose();root.clear();root.removeFromParent();}};
}
