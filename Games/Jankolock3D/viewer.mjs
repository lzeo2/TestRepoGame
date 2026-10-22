import { createWorldData } from './world-data.mjs';
import { createTraveler, stepTraveler, interaction, travelerSnapshot } from './traversal.mjs';
import { createWorldScene } from './world-scene.mjs';
const canvas=document.querySelector('#world'),prompt=document.querySelector('#prompt');
const world=createWorldData(),traveler=createTraveler(world),keys=new Set(),abort=new AbortController();
const on=(target,type,fn,options={})=>target.addEventListener(type,fn,{...options,signal:abort.signal});
let scene,raf=0,last=0,yaw=Math.PI,pitch=0,jump=false,action=false,fly=false,flyTime=0,home=null,sound=false,audio=null,disposed=false,drag=null,statusAt=0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const failure=error=>{prompt.textContent=`World unavailable: ${error.message||error}. Reload to retry.`;dispose();};
function clearInput(){keys.clear();jump=false;action=false;drag=null;}
function bell(){
  if(!sound||!audio)return;
  const t=audio.currentTime;
  for(const [hz,gain] of [[660,.13],[991,.06],[1325,.025]]) {
    const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=hz;
    g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.0001,t+1.1);
    o.connect(g);g.connect(audio.destination);o.start(t);o.stop(t+1.2);o.onended=()=>{o.disconnect();g.disconnect();};
  }
}
function dispose(){
  if(disposed)return;disposed=true;cancelAnimationFrame(raf);raf=0;clearInput();abort.abort();scene?.dispose();
  if(audio){audio.close().catch(()=>{});audio=null;}
}
function frame(time){
  raf=0;if(disposed||document.hidden)return;
  try{
    const dt=Math.min(.25,(time-last)/1000||0);last=time;
    if(fly){
      flyTime+=dt;const t=flyTime/32;
      traveler.x=Math.sin(t)*420;traveler.z=-Math.cos(t)*420;traveler.y=370+Math.sin(t)*20;
      yaw=Math.atan2(traveler.x,traveler.z);pitch=-.74;
    }else{
      yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt*1.5;
      pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt*1.2,-1.35,1.35);
      // Preserve elapsed time on slow renderers without enlarging physics steps.
      let remaining=dt;
      do {
        const step=Math.min(.025,remaining);
        stepTraveler(world,traveler,{yaw,pitch,forward:(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),side:(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),up:(keys.has('Space')?1:0)-(keys.has('ShiftLeft')?1:0),jump,interact:action},step);
        jump=false;action=false;if(traveler.event==='bell')bell();remaining-=step;
      }while(remaining>1e-8);
    }
    jump=false;action=false;scene.sync(traveler);scene.render(traveler,yaw,pitch);
    if(time-statusAt>250){
      statusAt=time;const hit=interaction(world,traveler);
      const text=fly?'Bounded district flythrough · toggle off to return':hit?.label||(traveler.y<0?`Below street · stamina ${Math.round(traveler.stamina)}%`:'Explore three lanes · E near traversal markers');
      if(prompt.textContent!==text)prompt.textContent=text;
    }
    raf=requestAnimationFrame(frame);
  }catch(error){failure(error);}
}
function resume(){if(!disposed&&!document.hidden&&!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
try{
  scene=createWorldScene(canvas,world);
  Object.defineProperty(window,'jank3dWorldSnapshot',{configurable:true,value:()=>Object.freeze({traveler:travelerSnapshot(traveler),render:scene.diagnostics(),paused:document.hidden,disposed,flythrough:fly,spawns:world.spawns.length})});
  on(window,'resize',()=>scene.resize());
  on(window,'keydown',e=>{
    if(e.code==='Space'&&e.target.closest('button'))return;
    if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyE','ShiftLeft'].includes(e.code)){
      e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='Space')jump=true;if(e.code==='KeyE')action=true;}
    }
  });
  on(window,'keyup',e=>keys.delete(e.code));on(window,'blur',clearInput);
  on(canvas,'pointerdown',e=>{drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus();});
  on(canvas,'pointermove',e=>{if(drag?.id!==e.pointerId||fly)return;yaw-=(e.clientX-drag.x)*.004;pitch=clamp(pitch-(e.clientY-drag.y)*.004,-1.35,1.35);drag.x=e.clientX;drag.y=e.clientY;});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])on(canvas,type,()=>{drag=null;});
  for(const button of document.querySelectorAll('[data-hold]')){
    on(button,'pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.hold);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])on(button,type,()=>keys.delete(button.dataset.hold));
    on(button,'keydown',e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();keys.add(button.dataset.hold);}});
    on(button,'keyup',()=>keys.delete(button.dataset.hold));on(button,'blur',()=>keys.delete(button.dataset.hold));
  }
  on(document.querySelector('#jump'),'click',()=>{jump=true;});on(document.querySelector('#interact'),'click',()=>{action=true;});
  on(document.querySelector('#walk'),'click',e=>{if(fly)return;traveler.walk=!traveler.walk;traveler.mode='free';traveler.ride=null;e.currentTarget.textContent=`Walk: ${traveler.walk?'on':'off'}`;e.currentTarget.setAttribute('aria-pressed',String(traveler.walk));});
  on(document.querySelector('#fly'),'click',e=>{
    fly=!fly;clearInput();
    if(fly){home={x:traveler.x,y:traveler.y,z:traveler.z,yaw,pitch};traveler.mode='free';traveler.ride=null;flyTime=0;}
    else{traveler.x=home.x;traveler.y=home.y;traveler.z=home.z;yaw=home.yaw;pitch=home.pitch;traveler.vy=0;}
    document.querySelector('#walk').disabled=fly;e.currentTarget.textContent=`Flythrough: ${fly?'on':'off'}`;e.currentTarget.setAttribute('aria-pressed',String(fly));
  });
  on(document.querySelector('#sound'),'click',async e=>{
    const button=e.currentTarget;
    try{sound=!sound;if(sound){audio??=new AudioContext();await audio.resume();if(disposed)return;bell();}button.textContent=`Sound: ${sound?'on':'off'}`;button.setAttribute('aria-pressed',String(sound));}
    catch(error){sound=false;button.textContent='Sound: off';button.setAttribute('aria-pressed','false');prompt.textContent=`Audio unavailable: ${error.message}`;}
  });
  on(document,'visibilitychange',()=>{clearInput();if(document.hidden){cancelAnimationFrame(raf);raf=0;audio?.suspend().catch(()=>{});}else{if(sound)audio?.resume().catch(()=>{});resume();}});
  on(canvas,'webglcontextlost',e=>{e.preventDefault();failure(new Error('Graphics context lost'));});
  on(window,'pagehide',dispose);on(window,'error',e=>failure(e.error||new Error(e.message)));on(window,'unhandledrejection',e=>failure(e.reason));
  scene.render(traveler,yaw,pitch);resume();
}catch(error){failure(error);}
