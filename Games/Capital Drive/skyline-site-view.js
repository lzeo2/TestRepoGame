import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const CAPACITY=112,RANGE=650;
const valid=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
// Original temporary mission props, never an address, building plan or collider.
export function createSkylineSiteView(scene,heightAt=()=>0) {
  const root=new THREE.Group();root.name='Fictional Skylark retrieval props';scene.add(root);
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshLambertMaterial({color:0xffffff});
  const props=new THREE.InstancedMesh(geometry,material,CAPACITY);props.frustumCulled=false;root.add(props);props.count=0;
  const canopyGeometry=new THREE.BufferGeometry(),positions=[],colors=[];
  const tint=new THREE.Color();
  // Curved ram-air canopy with closed leading/trailing faces, authored once.
  const arc=u=>[u*7,3.4+1.9*Math.cos(u*Math.PI),0];
  function triangle(a,b,c,color){tint.setHex(color);for(const p of [a,b,c]){positions.push(...p);colors.push(tint.r,tint.g,tint.b);}}
  for(let i=0;i<10;i++){
    const u=i/10-.5,v=(i+1)/10-.5,a=arc(u),b=arc(v),color=i%3===0?0xdd9951:0x547d9c;
    const af=[a[0],a[1],-1.35],ab=[a[0],a[1],1.35],bf=[b[0],b[1],-1.35],bb=[b[0],b[1],1.35];
    triangle(af,ab,bf,color);triangle(ab,bb,bf,color);
    for(const z of [-1.35,1.35]){const lowA=[a[0],a[1]-.32,z],lowB=[b[0],b[1]-.32,z];triangle([a[0],a[1],z],lowA,lowB,0x3d596c);triangle([a[0],a[1],z],lowB,[b[0],b[1],z],0x3d596c);}
  }
  canopyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));canopyGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));canopyGeometry.computeVertexNormals();
  const canopyMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
  const canopy=new THREE.Mesh(canopyGeometry,canopyMaterial);canopy.name='Player deployed ram-air parachute';root.add(canopy);canopy.visible=false;
  const pose=new THREE.Object3D(),color=new THREE.Color(),up=new THREE.Vector3(0,1,0),direction=new THREE.Vector3();
  let disposed=false,shown=false,lastKey='',layout=null,staticCount=0;
  const ground=p=>Number.isFinite(p.y)?p.y:Number.isFinite(heightAt(p.x,p.z))?heightAt(p.x,p.z):0;
  function box(point,x,y,z,w,h,d,tint,yaw=0){
    if(props.count>=CAPACITY)return;
    const angle=Number.isFinite(point.yaw)?point.yaw:0,c=Math.cos(angle),s=Math.sin(angle);
    pose.position.set(point.x+c*x+s*z,ground(point)+y,point.z-s*x+c*z);pose.rotation.set(0,angle+yaw,0);pose.scale.set(w,h,d);pose.updateMatrix();
    props.setMatrixAt(props.count,pose.matrix);props.setColorAt(props.count++,color.setHex(tint));
  }
  function ring(point,radius,tint){for(let i=0;i<16;i++){const angle=i*Math.PI/8;box(point,Math.sin(angle)*radius,.065,Math.cos(angle)*radius,.20,.035,radius*.39,tint,angle+Math.PI/2);}}
  function rope(a,b){
    if(props.count>=CAPACITY)return;
    direction.subVectors(b,a);pose.position.copy(a).add(b).multiplyScalar(.5);pose.quaternion.setFromUnitVectors(up,direction.clone().normalize());pose.scale.set(.024,direction.length(),.024);pose.updateMatrix();
    props.setMatrixAt(props.count,pose.matrix);props.setColorAt(props.count++,color.setHex(0xd4d5c1));
  }
  function rebuild(snapshot,nearSite){
    props.count=0;
    if(nearSite){
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
      if(valid(layout.landing)&&['freefall','parachute','landing'].includes(snapshot.stage))ring(layout.landing,8,0xd1a965);
      if(valid(snapshot.marker)&&!['flight','freefall','parachute','landing'].includes(snapshot.stage))ring(snapshot.marker,2.7,0xd3ae68);
    }
  }
  function update(snapshot,focus={}){
    if(disposed)return;
    const active=snapshot?.active===true&&snapshot.layout?.fictional===true;
    root.visible=active;shown=active;if(!active){canopy.visible=false;props.count=0;lastKey='';return;}
    const nearSite=!valid(focus)||!valid(snapshot.layout.origin)||Math.hypot(focus.x-snapshot.layout.origin.x,focus.z-snapshot.layout.origin.z)<RANGE;
    const nextKey=[snapshot.missionId,snapshot.stage,snapshot.marker?.id,snapshot.lootCollected,nearSite].join(':');
    if(layout!==snapshot.layout||nextKey!==lastKey){layout=snapshot.layout;rebuild(snapshot,nearSite);lastKey=nextKey;staticCount=props.count;}
    props.count=staticCount;
    // Ropes follow the authoritative pose; no freefall canopy or landed canopy.
    const p=snapshot.pose;
    canopy.visible=snapshot.stage==='parachute'&&valid(p)&&Number.isFinite(p.y);
    if(canopy.visible){
      canopy.position.set(p.x,p.y,p.z);canopy.rotation.set(0,Number.isFinite(p.yaw)?p.yaw:0,0);canopy.updateMatrix();
      const c=Math.cos(canopy.rotation.y),s=Math.sin(canopy.rotation.y);
      for(const side of [-1,1])for(const z of [-1,1]){
        const a=new THREE.Vector3(side*.25,1.35,z*.12),b=new THREE.Vector3(side*3.1,3.7,z*1.1);
        for(const v of [a,b]){const x=v.x;v.set(p.x+c*x+s*v.z,p.y+v.y,p.z-s*x+c*v.z);}rope(a,b);
      }
    }
    props.instanceMatrix.needsUpdate=true;if(props.instanceColor)props.instanceColor.needsUpdate=true;
    props.userData.frameCount=props.count;
  }
  return {update,physicalProps:Object.freeze([]),stats(){return {draws:disposed||!shown?0:(props.userData.frameCount?1:0)+(canopy.visible?1:0),instances:shown?props.userData.frameCount||0:0,parachute:!disposed&&shown&&canopy.visible};},
    dispose(){if(disposed)return;disposed=true;shown=false;root.removeFromParent();geometry.dispose();material.dispose();canopyGeometry.dispose();canopyMaterial.dispose();}};
}
