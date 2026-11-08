/* Live approved slice: one Engine state, one RAF, same input in 3D and fallback. */
(function () {
  'use strict';
  const engine = window.LauncherOverhaul, crew = window.Schoolyard, saves=window.LauncherProgress;
  let storage;try{storage=window.localStorage;}catch(_){}
  const loaded=saves.load(storage),progress=loaded.data;
  let saveAvailable=loaded.available;
  const mapButtons=[],skinButtons=[];
  const byId = id => document.getElementById(id);
  const canvas = byId('world'), ctx = canvas.getContext('2d');
  const angle = byId('angle'), power = byId('power');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width:600px)');
  const names = { jack:'Jack', ian:'Ian', sim:'Sim' }, powers = { jack:'Dash', ian:'Brace', sim:'Hop' };
  let state = engine.create(progress.highest), paused = document.hidden, lastFrame = null, drag = null;
  let modalPaused = false, descriptionKey = '', flightClick = null;
  function text(id, value) { const node=byId(id);value=String(value);if(node.textContent!==value)node.textContent=value; }
  function announce(value) { text('announcer',value); }
  function focusCourt() { canvas.focus({preventScroll:true}); }
  function ready() { return !paused && !document.hidden && state.status==='playing' && state.phase==='ready'; }
  function modalOpen(){return ['help','map','skins'].some(id=>byId(id).open);}
  function abilityReady() { const b=state.ball;return !drag && !modalOpen() && !paused && !document.hidden && state.status==='playing' && state.phase==='flight' && b.active && !b.abilityUsed && b.y+b.r<state.groundY-.5; }
  function keyboardPull() {
    const a=Number(angle.value)*Math.PI/180, length=Math.max(4,Math.min(state.maxPull,Number(power.value)));
    if(!Number.isFinite(a)||!Number.isFinite(length))return null;
    return {x:state.anchor.x-Math.cos(a)*length,y:state.anchor.y+Math.sin(a)*length};
  }
  function defaultAim() {
    const [dx,dy]=engine.levelInfo(state.level).solution[0];
    angle.value=Math.atan2(dy,dx)*180/Math.PI;power.value=Math.hypot(dx,dy);
  }
  function refreshProgress() {
    byId('storage-status').hidden=saveAvailable;text('earned-stars','Stars '+saves.totalStars(progress));
    mapButtons.forEach((button,i)=>{const n=i+1,stars=progress.stars[n]||0;button.disabled=n>progress.highest;
      button.textContent=String(n)+(stars?' · '+stars:'');button.setAttribute('aria-label','Level '+n+', '+(button.disabled?'locked':stars+' best stars, score '+(progress.scores[n]||0)));});
    skinButtons.forEach(({button,role,skin})=>{button.disabled=!saves.owned(progress,role,skin.id);button.setAttribute('aria-pressed',String(progress.equipped[role]===skin.id));
      button.setAttribute('aria-label',names[role]+' '+skin.name+(button.disabled?', locked: '+(skin.stars?skin.stars+' stars':'clear level '+skin.chapter):', earned'));});
  }
  function persist(){saveAvailable=saves.save(storage,progress);refreshProgress();}
  function fitCourt() {
    // ponytail: only converted layouts have reviewed phone bounds; keep legacy full width.
    const humanPhone=compact.matches&&state.presentation==='human-courtyard-v1';
    const width=humanPhone?(engine.levelInfo(state.level).mobileWidth||560):960;
    canvas.dataset.framing=humanPhone?'human-mobile':'full';canvas.style.aspectRatio=width+' / 600';
    if(canvas.width===width)return;
    canvas.width=width;flightClick=null;
    if(drag)cancelAim(); // A resize cannot reinterpret a held pull or tap.
  }
  function refresh() {
    fitCourt();
    const b=state.ball, remaining=state.teachers.filter(t=>!t.cleared).length;
    text('level',state.level+' / '+engine.levelCount);text('teachers',remaining);text('score',state.score);
    const first=state.phase==='ready'?state.nextIndex:Math.max(0,state.nextIndex-1);
    text('queue',state.queue.slice(first).map(id=>names[id]).join('  '));
    text('ability',powers[b.character]);byId('ability').disabled=!abilityReady();
    byId('ability').setAttribute('aria-label',names[b.character]+' '+powers[b.character]+', once per flight');
    byId('pause').disabled=state.status!=='playing';text('pause',paused?'Resume':'Pause');
    byId('pause').setAttribute('aria-pressed',String(paused));
    byId('launch').disabled=!ready()||Boolean(drag);angle.disabled=power.disabled=!ready()||Boolean(drag);
    text('angle-value',Number(angle.value).toFixed(1)+'°');text('power-value',Math.round(Number(power.value)));
    canvas.dataset.ready=String(ready());canvas.dataset.dragging=String(Boolean(drag));
    byId('outcome').hidden=state.status==='playing';
    byId('next').hidden=state.status!=='won'||state.level>=engine.levelCount;
    text('result-title',state.status==='won'?'Clear':'Retry');text('stars',state.status==='won'?'Stars '+state.stars+' / 3':'');
    const key=state.level+':'+state.clears.length+':'+canvas.width;
    if(key!==descriptionKey){descriptionKey=key;text('fixture-description','World 960 by 600, ground at 540. '+(canvas.width!==960?'Mobile view shows 0 to '+canvas.width+' across. ':'')+state.teachers.map((t,i)=>'Teacher '+(i+1)+': '+(t.cleared?'clear':Math.round(t.x)+' across, '+Math.round(t.y)+' down, radius '+t.r)+'.').join(' '));}
  }
  function cancelAim() {
    const old=drag;drag=null;flightClick=null;
    engine.input(state,'cancel');
    if(old&&canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);
    refresh();
  }
  function loadLevel(level) {
    if(!Number.isInteger(level)||level<1||level>engine.levelCount||level>progress.highest)return false;
    cancelAim();state=engine.create(level);paused=document.hidden;lastFrame=null;descriptionKey='';defaultAim();refresh();draw();
    announce('Level '+level+'. '+names[state.ball.character]+' loaded.');return true;
  }
  function restart() { loadLevel(state.level); }
  function togglePause() {
    if(state.status!=='playing')return;
    cancelAim();paused=!paused||document.hidden;lastFrame=null;refresh();announce(paused?'Paused.':'Resumed.');
  }
  function useAbility() { flightClick=null;if(abilityReady()&&engine.input(state,'ability')){refresh();announce(names[state.ball.character]+' '+powers[state.ball.character]+'.');} }
  function release() {
    flightClick=null;
    const used=engine.input(state,'release');refresh();
    if(used)announce(names[state.ball.character]+' launched.');return used;
  }
  function launchKeyboard() {
    if(!ready()||drag)return;
    const point=keyboardPull();if(!point)return;
    engine.input(state,'pull',point.x,point.y);release();
  }
  function worldPoint(event) {
    const view=window.schoolyard3d;
    if(view&&view.ready)return view.screenToWorld(event.clientX,event.clientY);
    const rect=canvas.getBoundingClientRect();
    return {x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};
  }
  function pull(event) { const point=worldPoint(event);if(point)engine.input(state,'pull',point.x,point.y); }
  canvas.addEventListener('pointerdown',event=>{
    flightClick=null;
    if(event.button!==0||event.isPrimary===false||!Number.isFinite(event.clientX)||!Number.isFinite(event.clientY))return;
    if(abilityReady()){
      flightClick={id:event.pointerId,type:event.pointerType,x:event.clientX,y:event.clientY,body:state.ball,moved:false,released:false};return;
    }
    if(!ready()||drag)return;
    const point=worldPoint(event);if(!point)return;
    const radius=Math.max(state.ball.r,22*canvas.width/canvas.getBoundingClientRect().width);
    if(Math.hypot(point.x-state.ball.x,point.y-state.ball.y)>radius)return;
    event.preventDefault();focusCourt();drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};
    canvas.setPointerCapture(event.pointerId);refresh();
  });
  canvas.addEventListener('pointermove',event=>{
    if(flightClick&&flightClick.id===event.pointerId&&Math.hypot(event.clientX-flightClick.x,event.clientY-flightClick.y)>=4)flightClick.moved=true;
    if(!drag||drag.id!==event.pointerId)return;
    event.preventDefault();if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>=4)drag.moved=true;
    pull(event);refresh();
  });
  canvas.addEventListener('pointerup',event=>{
    if(flightClick&&flightClick.id===event.pointerId){
      const r=canvas.getBoundingClientRect();
      flightClick.released=!flightClick.moved&&Math.hypot(event.clientX-flightClick.x,event.clientY-flightClick.y)<4&&event.clientX>=r.left&&event.clientX<=r.left+r.width&&event.clientY>=r.top&&event.clientY<=r.top+r.height;
      if(!flightClick.released)flightClick=null;
      else if(flightClick.type==='touch'&&event.pointerType==='touch'){
        const tap=flightClick;flightClick=null;
        // A fresh completed touch is sufficient; Chromium can omit its click.
        if(tap.body===state.ball)useAbility();
      }
      return; // Mouse still waits for click. The launch-release pointer never arms this branch.
    }
    if(!drag||drag.id!==event.pointerId)return;
    event.preventDefault();pull(event);const old=drag;drag=null;
    if(old.moved)release();else engine.input(state,'cancel');
    if(canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);refresh();
  });
  canvas.addEventListener('click',event=>{
    const tap=flightClick;
    if(!tap||!tap.released||tap.body!==state.ball||event.detail===0||event.pointerId!==undefined&&event.pointerId!==tap.id)return;
    useAbility();
  });
  canvas.addEventListener('pointercancel',event=>{if(flightClick&&flightClick.id===event.pointerId)flightClick=null;if(drag&&drag.id===event.pointerId)cancelAim();});
  canvas.addEventListener('lostpointercapture',event=>{
    if(flightClick&&flightClick.id===event.pointerId&&!flightClick.released)flightClick=null;
    if(drag&&drag.id===event.pointerId)cancelAim();
  });
  byId('ability').addEventListener('click',useAbility);
  byId('pause').addEventListener('click',togglePause);
  byId('restart').addEventListener('click',()=>{restart();focusCourt();});
  byId('result-retry').addEventListener('click',()=>{restart();focusCourt();});
  byId('next').addEventListener('click',()=>{if(state.status==='won'&&state.level<engine.levelCount){loadLevel(state.level+1);focusCourt();}});
  byId('launch').addEventListener('click',()=>{launchKeyboard();focusCourt();});
  angle.addEventListener('input',refresh);power.addEventListener('input',refresh);
  function openDialog(id) {
    if(modalOpen())return;
    modalPaused=paused;cancelAim();paused=true;lastFrame=null;refresh();refreshProgress();byId(id).showModal();
  }
  for(const id of ['help','map','skins']) {
    byId(id+'-open').addEventListener('click',()=>openDialog(id));
    byId(id+'-close').addEventListener('click',()=>byId(id).close());
    byId(id).addEventListener('close',()=>{paused=modalPaused||document.hidden;lastFrame=null;refresh();focusCourt();});
  }
  for(let n=1;n<=engine.levelCount;n++){
    const button=document.createElement('button');button.type='button';button.id='level-'+n;button.dataset.level=String(n);
    button.addEventListener('click',()=>{loadLevel(n);byId('map').close();});byId('level-grid').appendChild(button);mapButtons.push(button);
  }
  for(const role of Object.keys(names)){
    const section=document.createElement('fieldset'),legend=document.createElement('legend'),grid=document.createElement('div');
    section.className='skin-set';legend.textContent=names[role];grid.className='skin-grid';section.appendChild(legend);section.appendChild(grid);
    for(const skin of saves.skins[role]){
      const button=document.createElement('button'),swatch=document.createElement('span'),name=document.createElement('span');
      button.type='button';button.id='skin-'+role+'-'+skin.id;swatch.className='skin-swatch';swatch.setAttribute('aria-hidden','true');
      swatch.style.backgroundColor=skin.body||crew.roster.find(p=>p.id===role).shirt;name.textContent=skin.name;button.appendChild(swatch);button.appendChild(name);
      button.addEventListener('click',()=>{if(saves.equip(progress,role,skin.id)){persist();draw();}});grid.appendChild(button);skinButtons.push({button,role,skin});
    }
    byId('skin-catalog').appendChild(section);
  }
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.isComposing)return;
    if(event.target.closest('input,select,textarea,button,a,summary,dialog,[contenteditable]'))return;
    const code=event.code;
    if(code==='Escape'&&drag){event.preventDefault();cancelAim();return;}
    if(code==='KeyP'&&event.target===canvas){event.preventDefault();if(!event.repeat)togglePause();return;}
    if(code==='Space'||code==='Enter'){event.preventDefault();if(!event.repeat){if(state.phase==='flight')useAbility();else launchKeyboard();}return;}
    if(!ready()||drag)return;
    if(code==='ArrowLeft'||code==='ArrowRight'){event.preventDefault();angle.value=Math.max(0,Math.min(90,Number(angle.value)+(code==='ArrowRight'?1:-1)));refresh();}
    if(code==='ArrowUp'||code==='ArrowDown'){event.preventDefault();power.value=Math.max(4,Math.min(state.maxPull,Number(power.value)+(code==='ArrowUp'?2:-2)));refresh();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAim();paused=true;lastFrame=null;refresh();}});
  window.addEventListener('blur',cancelAim);

  function previewPoints() {
    if(!ready())return [];
    const position=state.dragging?state.ball:keyboardPull();if(!position)return [];
    let x=position.x,y=position.y,vy=(state.anchor.y-y)*state.pullScale;
    const vx=(state.anchor.x-x)*state.pullScale, points=[],r=state.ball.r;
    for(let i=0;i<288;i++) {
      vy+=600/240;x+=vx/240;y+=vy/240;
      const block=state.blocks.some(b=>{const c=Math.cos(b.angle),s=Math.sin(b.angle),dx=x-b.x,dy=y-b.y,lx=dx*c+dy*s,ly=-dx*s+dy*c;return Math.hypot(lx-Math.max(-b.w/2,Math.min(b.w/2,lx)),ly-Math.max(-b.h/2,Math.min(b.h/2,ly)))<=r;});
      if(block||state.teachers.some(t=>!t.cleared&&Math.hypot(x-t.x,y-t.y)<=r+t.r)||y+r>=state.groundY||x>960)break;
      if(i%12===0)points.push({x,y});
    }
    return points;
  }
  function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
  function line(points,color,width=2){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(points[0],points[1]);for(let i=2;i<points.length;i+=2)ctx.lineTo(points[i],points[i+1]);ctx.stroke();}
  function circle(x,y,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  function drawHuman(b,role,teacher,scale){
    role=teacher?'teacher':role;
    const person=crew.roster.find(p=>p.id===role)||crew.roster[0],skin=saves.palette(progress,role);
    const colors=window.LauncherHuman.palette(role,teacher?'#a27c68':skin.body||person.shirt,teacher?'#293942':skin.cap||person.color);
    const pose=window.LauncherHuman.sample(role,b.pose||'loaded',{time:state.time,poseTime:b.poseTime,dragging:!teacher&&b===state.ball&&state.dragging,reducedMotion:reduced.matches});
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(b.r*scale,b.r*scale);
    ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.clip();
    for(const part of pose.parts){ctx.save();ctx.translate(part.x,part.y);ctx.rotate(part.angle);ctx.fillStyle=colors[part.material];
      if(part.shape==='sphere'){ctx.beginPath();ctx.ellipse(0,0,part.sx,part.sy,0,0,Math.PI*2);ctx.fill();}
      else ctx.fillRect(-part.sx,-part.sy,part.sx*2,part.sy*2);
      ctx.restore();}
    ctx.restore();
  }
  function drawBall(b,role,teacher=false,scale=1) {
    if(state.presentation==='human-courtyard-v1'){drawHuman(b,role,teacher,scale);return;}
    const person=crew.roster.find(p=>p.id===role)||crew.roster[0],r=b.r;
    ctx.save();ctx.translate(b.x,b.y);ctx.scale(scale,scale);
    // Keep every rotating feature and contrast stroke inside the authoritative circle.
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
    const compact=canvas.getBoundingClientRect().width<600;
    const skin=saves.palette(progress,role);
    circle(0,0,r,teacher?'#a27c68':skin.body||person.shirt);
    ctx.strokeStyle=compact?'#e9ebe5':'#18262d';ctx.lineWidth=compact?3:2;ctx.beginPath();ctx.arc(0,0,r-ctx.lineWidth/2,0,Math.PI*2);ctx.stroke();
    let spin=0;
    if(!reduced.matches&&!teacher){const phase=Math.max(0,Math.min(1,(.24-b.poseTime)/.24));if(b.pose==='dash')spin=phase*Math.PI*2;if(b.pose==='hop')spin=Math.sin(phase*Math.PI)*.4;}
    ctx.rotate(spin);
    if(!teacher&&b.pose==='brace')ctx.scale(.82,.82);
    rect(-r*.6,-r*.86,r*1.2,r*.27,teacher?'#24363e':skin.cap||person.color);
    if(teacher||role==='ian')rect(-r*.78,-r*.32,r*1.56,r*.43,'#172831');
    for(const side of [-1,1])circle(side*r*.32,-r*.1,r*(compact?.16:.1),'#edf0e9');
    if(teacher)rect(-r*.25,r*.45,r*.5,r*.18,'#24363e');
    ctx.restore();
  }
  function drawCourtyard2d(){
    rect(0,0,960,600,'#a4afb0');rect(20,150,920,185,'#866b58');
    for(let y=158;y<335;y+=15)line([20,y,940,y],'#a58a72',1);
    rect(334,145,245,190,'#624e42');rect(326,138,261,12,'#46545a');
    rect(20,142,314,12,'#46545a');rect(579,142,361,12,'#46545a');
    for(const x of [50,122,194,266,620,692,764,836])for(const y of [178,254]){rect(x,y,42,44,'#b5b4a0');rect(x+4,y+4,34,36,'#354e57');}
    rect(397,254,118,81,'#b5b4a0');rect(402,258,108,77,'#354e57');line([456,258,456,335],'#b5b4a0',4);
    rect(0,335,960,265,'#65706b');
    for(const y of [350,382,424,477,539,599])line([0,y,960,y],'#92998a',1);
    for(let x=-600;x<1700;x+=130)line([480+(x-480)*.25,335,x,600],'#92998a',1);
    for(const x of [18,925]){rect(x-5,100,10,235,'#625b43');circle(x,100,48,'#4c6957');circle(x-25,132,40,'#4c6957');circle(x+25,140,39,'#4c6957');}
  }
  function draw2d() {
    ctx.clearRect(0,0,960,600);
    if(state.presentation==='human-courtyard-v1')drawCourtyard2d();
    else {rect(0,0,960,600,'#29383e');rect(0,75,960,395,'#77574d');
      for(let y=85;y<470;y+=24)line([0,y,960,y],'#a2806b',1);
      for(let x=35;x<960;x+=150){rect(x,150,100,130,'#95aeb3');rect(x+5,155,90,120,'#344f59');line([x+50,155,x+50,275],'#95aeb3',3);}
      rect(0,470,960,130,'#414b4c');}
    line([0,540,960,540],'#bfc8b7',3);
    for(const b of state.blocks){ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.angle);rect(-b.w/2,-b.h/2,b.w,b.h,b.material==='wood'?'#98764b':'#668da0');ctx.strokeStyle='#24363e';ctx.lineWidth=2;ctx.strokeRect(-b.w/2+1,-b.h/2+1,b.w-2,b.h-2);if(b.material==='wood')line([-b.w*.35,b.h*.35,b.w*.35,-b.h*.35],'#d0b384',3);ctx.restore();}
    for(const t of state.teachers){const clear=state.clears.find(e=>e.id===t.id);const age=clear?state.time-clear.time:0;if(t.cleared&&age>=.18)continue;drawBall(t,null,true,t.cleared?Math.max(.01,1-age/.18):1);}
    const start=state.phase==='ready'?state.nextIndex+1:state.nextIndex;
    state.queue.slice(start).forEach((role,i)=>drawBall({x:42+i*(state.presentation==='human-courtyard-v1'?40:36),y:state.presentation==='human-courtyard-v1'?516:524,r:state.presentation==='human-courtyard-v1'?24:14},role));
    for(const point of previewPoints())circle(point.x,point.y,2.2,'#e5c98b');
    line([145,535,145,470],'#694b36',14);line([145,480,119,414],'#694b36',10);line([145,480,168,414],'#694b36',10);
    const b=state.ball;const elastic=state.phase==='ready'?b:state.anchor;
    line([119,414,elastic.x,elastic.y,168,414],'#c4ac7d',3);
    if(b.pose==='dash'&&!reduced.matches){const speed=Math.hypot(b.vx,b.vy)||1;for(let i=1;i<=3;i++)circle(b.x-b.vx/speed*i*12,b.y-b.vy/speed*i*12,Math.max(1,5-i),'#e5c98b');}
    drawBall(b,b.character);
  }
  function draw() {const view=window.schoolyard3d;if(view&&view.renderFrame){view.renderFrame();if(view.ready)return;}draw2d();}
  function frame(now) {
    const oldStatus=state.status,oldClears=state.clears.length,oldBall=state.ball;
    const dt=lastFrame===null?0:(now-lastFrame)/1000;lastFrame=now;
    if(!paused&&!document.hidden)engine.step(state,dt);
    if(state.clears.length>oldClears)announce('Teacher clear. '+state.teachers.filter(t=>!t.cleared).length+' left.');
    if(state.ball!==oldBall)announce(names[state.ball.character]+' loaded.');
    if(state.status!==oldStatus){if(state.status==='won'){saves.recordWin(progress,state.level,state.score,state.stars);persist();}announce(state.status==='won'?'Level clear. '+state.stars+' stars.':'Retry.');}
    refresh();draw();requestAnimationFrame(frame);
  }
  window.schoolyardGame={engine:'overhaul',get state(){return state;},get progress(){return progress;},restart,loadLevel,cancelAim,
    get view(){return {paused,reducedMotion:reduced.matches,preview:previewPoints(),skins:progress.equipped};}};
  defaultAim();refreshProgress();refresh();draw();requestAnimationFrame(frame);
}());
