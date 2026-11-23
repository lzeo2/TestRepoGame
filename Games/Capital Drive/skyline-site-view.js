import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const CAPACITY=112,RANGE=650;
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
// Original temporary mission props, never an address, building plan or collider.
export function createSkylineSiteView(scene,heightAt=()=>0,{cover=[]}={}) {
  const root=new THREE.Group();root.name='Fictional Skylark retrieval props';scene.add(root);
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial({color:0xffffff});
  const props=new THREE.InstancedMesh(geometry,material,CAPACITY);props.name='Skylark mission props';props.frustumCulled=false;root.add(props);props.count=0;
  const pose=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  // Copy the shared physical descriptors once; decorative pieces partition the
  // same box rather than protruding into an unrepresented collision surface.
  const coverProps=Object.freeze((Array.isArray(cover)?cover:[]).filter(p=>valid(p)&&Number.isFinite(p.y)&&
    ['barrier','crate'].includes(p.kind)&&['width','length','height'].every(key=>Number.isFinite(p[key])&&p[key]>0))
    .slice(0,18).map(p=>Object.freeze({...p,yaw:Number.isFinite(p.yaw)?p.yaw:0})));
  let disposed=false,shown=false,lastKey='',layout=null,staticCount=0,shownCover=0;
  const ground=p=>Number.isFinite(p.y)?p.y:Number.isFinite(heightAt(p.x,p.z))?heightAt(p.x,p.z):0;
  function box(point,x,y,z,w,h,d,tint,yaw=0){
    if(props.count>=CAPACITY)return;
    const angle=Number.isFinite(point.yaw)?point.yaw:0,c=Math.cos(angle),s=Math.sin(angle);
    pose.position.set(point.x+c*x+s*z,ground(point)+y,point.z-s*x+c*z);pose.rotation.set(0,angle+yaw,0);pose.scale.set(w,h,d);pose.updateMatrix();
    props.setMatrixAt(props.count,pose.matrix);props.setColorAt(props.count++,color.setHex(tint));
  }
  function ring(point,radius,tint,width=.20){for(let i=0;i<16;i++){const angle=i*Math.PI/8;box(point,Math.sin(angle)*radius,.065,Math.cos(angle)*radius,width,.035,radius*.39,tint,angle+Math.PI/2);}}
  function joint(a,b,width=.024,shade=0xd4d5c1){
    if(props.count>=CAPACITY)return;
    direction.subVectors(b,a);const length=direction.length();
    pose.position.copy(a).add(b).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(up,direction.normalize());pose.scale.set(width,length,width);pose.updateMatrix();
    props.setMatrixAt(props.count,pose.matrix);props.setColorAt(props.count++,color.setHex(shade));
  }
  function flightGate(point,previous){
    const dx=point.x-previous.x,dz=point.z-previous.z,length=Math.hypot(dx,dz)||1;
    const ringPoint=(angle,out)=>out.set(point.x+dz/length*Math.cos(angle)*point.radius,
      point.y+Math.sin(angle)*point.radius,point.z-dx/length*Math.cos(angle)*point.radius);
    const a=new THREE.Vector3(),b=new THREE.Vector3();
    for(let i=0;i<20;i++)joint(ringPoint(i*Math.PI/10,a),ringPoint((i+1)*Math.PI/10,b),.9,i%2?0xf2bc56:0xd99d3e);
  }
  function rebuild(snapshot,nearSite,nearGate){
    props.count=0;shownCover=0;
    if(nearSite){
      for(const p of coverProps){
        const barrier=p.kind==='barrier',body=barrier?.84:.90,cap=1-body;
        box(p,0,p.height*body/2,0,p.width,p.height*body,p.length,barrier?0xa0a59c:0x956b46);
        box(p,0,p.height*(body+cap/2),0,p.width,p.height*cap,p.length,barrier?0xd8b34c:0x614b36);
        shownCover++;
      }
      const open=['loot','boss','helipad','boarding','flight'].includes(snapshot.stage);
      for(const [i,p]of (layout.searches||[]).slice(0,3).entries())if(valid(p)){
        const markerIndex=(layout.searches||[]).findIndex(cache=>cache.id===snapshot.marker?.id);
        const searched=markerIndex>=0?i<markerIndex:['safe-approach','safe','loot','boss','helipad','boarding','flight'].includes(snapshot.stage);
        box(p,0,.43,0,1.05,.85,.72,0x5d6b5a);box(p,0,.89,0,1.12,.08,.77,0x858b70);
        box(p,0,.48,-.37,.6,.25,.025,snapshot.marker?.id===p.id?0xd8b06c:searched?0xa4b79c:0x7a8074);
      }
      const safe=layout.safe;
      if(valid(safe)){
        box(safe,0,.85,0,1.6,1.7,1.05,0x49545b);
        box(safe,0,.86,-.54,1.35,1.42,.035,0x202c32);
        box(safe,open?-1.15:0,.86,open?-.95:-.58,.15,1.42,1.32,0x85918d,open?-.9:Math.PI/2);
        if(!open){box(safe,.2,.9,-.67,.22,.22,.06,0xc2ad79);box(safe,-.3,1.2,-.67,.25,.16,.04,0x8ba99d);}
      }
      if(valid(layout.loot)&&snapshot.stage==='loot'&&!snapshot.lootCollected){const p=layout.loot;box(p,0,.25,0,.9,.48,.55,0x2d3b44);box(p,0,.51,0,.35,.08,.12,0xb8b59e);for(const x of [-.31,.31])box(p,x,.25,-.29,.06,.3,.03,0xd0b983);}
      if(valid(layout.helipad)){const p=layout.helipad;ring(p,9.5,0xc6c7ae);for(const x of [-2,2])box(p,x,.08,0,.45,.045,4.5,0xe2dfbd);box(p,0,.08,0,4.4,.045,.45,0xe2dfbd);}
      if(valid(layout.landing)&&['freefall','flare','landing'].includes(snapshot.stage)){
        const p=layout.landing,radius=Math.max(8,Math.min(32,Number.isFinite(p.radius)?p.radius:28));
        // Broad contrasting stripes remain legible from the authored high dive.
        ring(p,radius,0x393c36,1.55);ring(p,radius,0xf7cd61,.85);
        box(p,0,.10,0,1.1,.045,13,0xf2edcf,Math.PI/4);
        box(p,0,.10,0,1.1,.045,13,0xf2edcf,-Math.PI/4);
      }
      if(valid(snapshot.marker)&&!['flight','freefall','flare','landing'].includes(snapshot.stage))ring(snapshot.marker,2.7,0xd3ae68);
    }
    if(nearGate){
      const index=layout.airRoute.findIndex(point=>point.id===snapshot.marker.id);
      if(index>=0)flightGate(snapshot.marker,layout.airRoute[index-1]||layout.helipad);
    }
  }
  function update(snapshot,focus={}){
    if(disposed)return;
    const active=snapshot?.active===true&&snapshot.layout?.fictional===true;
    root.visible=active;shown=active;if(!active){props.count=0;shownCover=0;lastKey='';return;}
    const nearSite=!valid(focus)||!valid(snapshot.layout.origin)||Math.hypot(focus.x-snapshot.layout.origin.x,focus.z-snapshot.layout.origin.z)<RANGE;
    const marker=snapshot.marker;
    const nearGate=snapshot.stage==='flight'&&valid(marker)&&Number.isFinite(marker.y)&&marker.radius>0&&
      (!valid(focus)||Math.hypot(focus.x-marker.x,focus.z-marker.z)<850);
    const nextKey=[snapshot.missionId,snapshot.stage,marker?.id,snapshot.lootCollected,nearSite,nearGate].join(':');
    if(layout!==snapshot.layout||nextKey!==lastKey){layout=snapshot.layout;rebuild(snapshot,nearSite,nearGate);lastKey=nextKey;staticCount=props.count;props.instanceMatrix.needsUpdate=true;if(props.instanceColor)props.instanceColor.needsUpdate=true;}
    props.count=staticCount;
    props.userData.frameCount=props.count;
  }
  return {update,physicalProps:Object.freeze([]),stats(){return {draws:disposed||!shown?0:(props.userData.frameCount?1:0),instances:shown?props.userData.frameCount||0:0,cover:!disposed&&shown?shownCover:0,parachute:false};},
    dispose(){if(disposed)return;disposed=true;shown=false;root.removeFromParent();geometry.dispose();material.dispose();}};
}
