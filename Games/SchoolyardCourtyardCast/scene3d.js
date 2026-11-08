/* Side-on polygonal live view. The overhaul engine alone owns all contacts.
 * Centers: (engine x/50, (540-engine y)/50, 0); blocks extend behind z=0.
 * ui.js owns the single RAF. No model imports, secondary physics or spectators.
 */
(function () {
  'use strict';
  const canvas=document.getElementById('world3d'),input=document.getElementById('world');
  const label=document.getElementById('render-status'),game=window.schoolyardGame;
  const api=window.schoolyard3d={ready:false,game:'launcher',view:'perspective',renderer:'fallback2d',frames:0,drawCalls:0,triangles:0,
    screenPoint:()=>null,screenToWorld:()=>null};
  const geometries=new Set(),materials=new Set();let active=true,renderer;
  function fallback(reason) {
    if(!active)return;active=false;api.ready=false;api.renderer='fallback2d';api.fallbackReason=reason;
    if(canvas)canvas.hidden=true;if(game&&game.cancelAim)game.cancelAim();
    if(label){label.textContent='2D';label.hidden=false;}
    geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());if(renderer)renderer.dispose();
  }
  if(!canvas||!input||!window.THREE||!game){fallback('WebGL unavailable');return;}
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback('WebGL context lost');});
  try {
    const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl){fallback('WebGL unavailable');return;}
    const T=window.THREE;
    renderer=new T.WebGLRenderer({canvas,context:gl,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(960,600,false);renderer.outputColorSpace=T.SRGBColorSpace;
    const scene=new T.Scene();scene.background=new T.Color('#29383e');
    const fullCamera=new T.PerspectiveCamera(29,960/600,.1,90);
    let camera=fullCamera;
    camera.position.set(9.6,4.8,27);camera.lookAt(9.6,4.8,0);camera.updateMatrixWorld(true);
    const mobileCamera=new T.OrthographicCamera(-5.6,5.6,6,-6,.1,90);
    mobileCamera.position.set(5.6,4.8,27);mobileCamera.lookAt(5.6,4.8,0);mobileCamera.updateMatrixWorld(true);
    let framingWidth=960;
    function fitCamera(){
      if(framingWidth===input.width)return;
      framingWidth=input.width;
      renderer.setSize(framingWidth,600,false);
      // Orthographic mobile XY keeps extrusion depth inside the true contact edges.
      camera=framingWidth!==960?mobileCamera:fullCamera;
      if(camera===mobileCamera){const half=framingWidth/100;camera.left=-half;camera.right=half;camera.position.set(half,4.8,27);camera.lookAt(half,4.8,0);}
      api.camera=camera;api.view=framingWidth!==960?'orthographic':'perspective';
      camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
    }
    scene.add(new T.HemisphereLight('#e8f0ea','#6d6760',2));const sun=new T.DirectionalLight('#fff1d5',2);sun.position.set(-4,12,10);scene.add(sun);
    function mat(color){const m=new T.MeshLambertMaterial({color});materials.add(m);return m;}
    const p={ground:mat('#414b4c'),brick:mat('#77574d'),trim:mat('#a6967c'),glass:mat('#344f59'),metal:mat('#95aeb3'),
      blue:mat('#668da0'),heavy:mat('#477080'),dark:mat('#172831'),wood:mat('#694b36'),rubber:mat('#c4ac7d'),gold:mat('#e5c98b'),white:mat('#edf0e9'),teacher:mat('#a27c68'),brace:mat('#354f6c')};
    const roster={};for(const person of window.Schoolyard.roster){
      const variants=roster[person.id]={base:{body:mat(person.shirt),cap:mat(person.color)}};
      for(const skin of window.LauncherProgress.skins[person.id])if(skin.id!=='base')variants[skin.id]={body:mat(skin.body),cap:mat(skin.cap)};
    }
    const cube=new T.BoxGeometry(1,1,1),sphere=new T.SphereGeometry(1,14,10),cylinder=new T.CylinderGeometry(1,1,1,8);
    [cube,sphere,cylinder].forEach(g=>geometries.add(g));
    function mesh(parent,geometry,material,x,y,z,sx,sy,sz){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);parent.add(m);return m;}
    const box=(parent,w,h,d,x,y,z,m)=>mesh(parent,cube,m,x,y,z,w,h,d);
    const ball=(parent,r,x,y,z,m)=>mesh(parent,sphere,m,x,y,z,r,r,r);
    const world=(x,y,z=0)=>new T.Vector3(x/50,(540-y)/50,z);
    const up=new T.Vector3(0,1,0),delta=new T.Vector3();
    function rod(parent,m){return mesh(parent,cylinder,m,0,0,0,1,1,1);}
    function connect(m,a,b,r){delta.copy(b).sub(a);m.position.copy(a).add(b).multiplyScalar(.5);m.scale.set(r,delta.length(),r);m.quaternion.setFromUnitVectors(up,delta.normalize());}
    const legacyWorld=new T.Group();legacyWorld.name='legacy-courtyard';scene.add(legacyWorld);
    const humanWorld=window.LauncherCourtyard(T,{cube,sphere,mat});scene.add(humanWorld);
    // Historical environment stays unchanged outside the converted human layouts.
    box(legacyWorld,24,.3,8,9.6,-.15,-.6,p.ground);box(legacyWorld,24,8.8,.7,9.6,4.4,-3,p.brick);box(legacyWorld,24,.22,.95,9.6,8.8,-3,p.trim);
    const mortar=[];
    for(let row=1;row<16;row++){const y=row*.55;mortar.push([24,.025,.035,9.6,y,-2.63]);for(let x=-1+(row%2)*1.1;x<22;x+=2.2)mortar.push([.025,.52,.035,x,y+.27,-2.63]);}
    const joints=new T.InstancedMesh(cube,p.trim,mortar.length),transform=new T.Object3D();
    mortar.forEach(([w,h,d,x,y,z],i)=>{transform.scale.set(w,h,d);transform.position.set(x,y,z);transform.updateMatrix();joints.setMatrixAt(i,transform.matrix);});joints.instanceMatrix.needsUpdate=true;legacyWorld.add(joints);
    for(const x of [0,3.7,7.4,11.1,14.8,18.5]){box(legacyWorld,2.4,2.8,.24,x,5.5,-2.5,p.metal);box(legacyWorld,2.13,2.53,.08,x,5.5,-2.35,p.glass);box(legacyWorld,.06,2.53,.05,x,5.5,-2.29,p.metal);box(legacyWorld,2.13,.06,.05,x,5.5,-2.29,p.metal);}
    for(let x=0;x<=20;x+=2.4)box(legacyWorld,.025,.012,7.5,x,.006,-.6,p.trim);
    box(legacyWorld,19.2,.025,.14,9.6,.013,0,p.trim);
    // Sphere/cap/face volumes make each launchable body itself recognizable.
    function makeBall(name,teacher=false) {
      const group=new T.Group();group.name=name;scene.add(group);
      const body=ball(group,1,0,0,0,teacher?p.teacher:roster.jack.base.body);
      const face=new T.Group();face.name='face';group.add(face);
      const cap=box(face,1.2,.2,.2,0,.64,.62,teacher?p.dark:roster.jack.base.cap);
      const goggles=box(face,1.5,.3,.12,0,.08,.88,p.dark);
      for(const side of [-1,1])ball(face,.095,side*.32,.05,.99,p.white);
      if(teacher)box(face,.32,.18,.08,0,-.46,.82,p.dark);
      return {group,body,face,cap,goggles,teacher};
    }
    const character=makeBall('launched-character');
    // ponytail: two waiting balls cover these three-character drafts; grow with longer authored queues.
    const queued=[makeBall('queued-character-0'),makeBall('queued-character-1')];
    function styleBall(m,id,pose,reduced,poseTime,dragging=false,skin='base') {
      const variants=roster[id]||roster.jack,colors=variants[skin]||variants.base;
      m.body.material=pose==='brace'?p.brace:colors.body;m.cap.material=colors.cap;m.goggles.visible=id==='ian';
      m.group.userData.character=id;m.group.userData.pose=pose;
      m.face.scale.set(pose==='brace'?.82:1,dragging?.88:pose==='brace'?.82:1,1);
      const phase=Math.max(0,Math.min(1,(.24-poseTime)/.24));
      m.face.rotation.z=reduced?0:pose==='dash'?phase*Math.PI*2:pose==='hop'?Math.sin(phase*Math.PI)*.4:0;
      m.face.position.y=!reduced&&pose==='hop'?Math.sin(phase*Math.PI)*.08:0;
    }
    const humanPool=new Map();
    const humanFixed={pants:mat('#293942'),dark:p.dark,white:p.white};
    const humanSkin={};for(const role of ['jack','ian','sim','teacher'])humanSkin[role]=mat(window.LauncherHuman.palette(role,'#000','#000').skin);
    function makeHuman(role,name){
      const group=new T.Group();group.name=name;group.userData.human=true;scene.add(group);
      const parts=window.LauncherHuman.sample(role).parts.map(part=>{const m=new T.Mesh(part.shape==='sphere'?sphere:cube,p.dark);m.name=part.name;group.add(m);return m;});
      return {group,parts,role};
    }
    function humanAt(key,role,name){let m=humanPool.get(key);if(m&&m.role!==role){scene.remove(m.group);humanPool.delete(key);m=null;}if(!m){m=makeHuman(role,name);humanPool.set(key,m);}m.group.name=name;return m;}
    function syncHuman(m,body,view,skin='base',scale=1,dragging=false){
      const role=m.role,colors=role==='teacher'?{body:p.teacher,cap:p.dark}:(roster[role][skin]||roster[role].base);
      const palette={...humanFixed,...colors,skin:humanSkin[role]};
      const sample=window.LauncherHuman.sample(role,body.pose||'loaded',{time:game.state.time,poseTime:body.poseTime,dragging,reducedMotion:view.reducedMotion});
      sample.parts.forEach((part,i)=>{const mesh=m.parts[i],factor=part.shape==='box'?2:1;mesh.material=palette[part.material];mesh.position.set(part.x,-part.y,part.z);mesh.scale.set(part.sx*factor,part.sy*factor,part.sz*factor);mesh.rotation.z=-part.angle;});
      m.group.position.copy(world(body.x,body.y));m.group.scale.setScalar(body.r/50*scale);m.group.userData.character=role;m.group.userData.pose=body.pose||'loaded';m.group.userData.proxyRadius=body.r;m.group.visible=true;
    }
    const trail=new T.Group();trail.name='dash-trail';trail.userData.decorative=true;scene.add(trail);
    const streaks=[1,2,3].map(i=>ball(trail,.04,0,0,0,p.gold));
    const sling=new T.Group();sling.name='sling';scene.add(sling);
    box(sling,.3,1.55,.34,2.9,.8,-.12,p.wood);
    const left=world(119,414),right=world(168,414);
    connect(rod(sling,p.wood),world(145,480,-.12),left,.13);connect(rod(sling,p.wood),world(145,480,-.12),right,.13);
    const elasticLeft=rod(sling,p.rubber),elasticRight=rod(sling,p.rubber);
    elasticLeft.name='elastic-left';elasticRight.name='elastic-right';
    const preview=Array.from({length:24},()=>{const m=ball(scene,.045,0,0,0,p.gold);m.visible=false;return m;});
    const blocks=new Map(),teachers=new Map();let previousState;
    function prune(map){for(const m of map.values())scene.remove(m.group||m);map.clear();}
    function sync(s,view) {
      const humans=s.presentation==='human-courtyard-v1';humanWorld.visible=humans;legacyWorld.visible=!humans;
      scene.background.set(humans?'#a4afb0':'#29383e');
      humanPool.forEach(m=>{m.group.visible=false;m.group.name='human-standby';});
      character.group.visible=!humans;character.group.name=humans?'legacy-launched-character':'launched-character';
      if(s!==previousState){prune(blocks);prune(teachers);previousState=s;}
      for(const b of s.blocks){
        let m=blocks.get(b.id);if(!m){m=new T.Group();m.name=b.id;scene.add(m);box(m,b.w/50,b.h/50,.6,0,0,-.3,b.material==='wood'?p.wood:b.mass>1.4?p.heavy:p.blue);
          if(b.material==='wood')box(m,Math.hypot(b.w,b.h)/50*.75,.045,.035,0,0,.01,p.rubber).rotation.z=Math.atan2(b.h,b.w);
          blocks.set(b.id,m);}
        m.position.copy(world(b.x,b.y));m.rotation.z=-b.angle;
      }
      for(const t of s.teachers){
        let m=teachers.get(t.id);if(!m){m=humans?makeHuman('teacher',t.id):makeBall(t.id,true);teachers.set(t.id,m);}
        const event=s.clears.find(e=>e.id===t.id),age=event?s.time-event.time:0;
        const pop=t.cleared?Math.max(0,1-age/.18):1;
        if(humans)syncHuman(m,t,view,'base',pop);
        else {m.group.position.copy(world(t.x,t.y));m.group.scale.setScalar(t.r/50*pop);}
        m.group.visible=!t.cleared||age<.18;
        m.group.userData.cleared=t.cleared;
      }
      const b=s.ball;character.group.position.copy(world(b.x,b.y));character.group.scale.setScalar(b.r/50);
      styleBall(character,b.character,b.pose,view.reducedMotion,b.poseTime,s.dragging,view.skins[b.character]);
      if(humans)syncHuman(humanAt('current',b.character,'launched-character'),b,view,view.skins[b.character],1,s.dragging);
      const start=s.phase==='ready'?s.nextIndex+1:s.nextIndex;
      queued.forEach((m,i)=>{const id=s.queue[start+i];m.group.visible=!humans&&Boolean(id);if(id){
        if(humans)syncHuman(humanAt('wait-'+i,id,'human-queued-'+i),{x:42+i*40,y:516,r:24,pose:'loaded'},view,view.skins[id]);
        else {m.group.position.copy(world(42+i*36,524));m.group.scale.setScalar(14/50);styleBall(m,id,'loaded',true,0,false,view.skins[id]);}}});
      const elastic=s.phase==='ready'?world(b.x,b.y):world(s.anchor.x,s.anchor.y);
      connect(elasticLeft,left,elastic,.035);connect(elasticRight,right,elastic,.035);
      trail.visible=b.pose==='dash'&&!view.reducedMotion;
      const speed=Math.hypot(b.vx,b.vy)||1;
      streaks.forEach((m,i)=>m.position.copy(world(b.x-b.vx/speed*(i+1)*12,b.y-b.vy/speed*(i+1)*12)));
      preview.forEach((m,i)=>{const q=view.preview[i];m.visible=Boolean(q);if(q)m.position.copy(world(q.x,q.y));});
      api.blockMeshes=blocks.size;api.teacherMeshes=teachers.size;
    }
    const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),0),pointer=new T.Vector2(),hit=new T.Vector3();
    api.screenPoint=(x,y)=>{
      if(!api.ready||!Number.isFinite(x)||!Number.isFinite(y))return null;
      fitCamera();
      const r=input.getBoundingClientRect();if(!r.width||!r.height)return null;
      const point=world(x,y).project(camera);return{x:r.left+(point.x+1)*r.width/2,y:r.top+(1-point.y)*r.height/2};
    };
    api.screenToWorld=(x,y)=>{
      if(!api.ready||!Number.isFinite(x)||!Number.isFinite(y))return null;
      fitCamera();
      const r=input.getBoundingClientRect();if(!r.width||!r.height)return null;
      pointer.set((x-r.left)/r.width*2-1,1-(y-r.top)/r.height*2);ray.setFromCamera(pointer,camera);
      return ray.ray.intersectPlane(plane,hit)?{x:hit.x*50,y:540-hit.y*50}:null;
    };
    api.scene=scene;api.camera=camera;
    api.renderFrame=()=>{
      if(!active)return;
      try {
        if(gl.isContextLost()){fallback('WebGL context lost');return;}
        if(!api.ready)game.cancelAim();
        fitCamera();sync(game.state,game.view);renderer.render(scene,camera);
        if(!active)return;if(gl.isContextLost()){fallback('WebGL context lost');return;}
        api.ready=true;api.renderer='WebGL';api.frames++;api.drawCalls=renderer.info.render.calls;api.triangles=renderer.info.render.triangles;
        api.geometries=renderer.info.memory.geometries;api.textures=renderer.info.memory.textures;api.fallbackReason=null;
        let visibleMeshDraws=0,triangles=0;scene.traverseVisible(n=>{if(n.isMesh){visibleMeshDraws++;triangles+=(n.geometry.index?n.geometry.index.count:n.geometry.attributes.position.count)/3*(n.isInstancedMesh?n.count:1);}});
        api.cpuBudget={visibleMeshDraws,triangles,scope:'geometry estimate, not native GPU performance'};
        canvas.hidden=false;if(label)label.hidden=true;
      } catch(_){fallback('3D render unavailable');}
    };
  } catch(_){fallback('WebGL unavailable');}
}());
