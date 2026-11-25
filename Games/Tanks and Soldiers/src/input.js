import {clamp} from './core.js';

export function createInput(canvas,onPause,onInteract,onLock=()=>{},onOrder=()=>{}) {
  const keys=new Set(),events=[],touch={forward:0,right:0,fire:false,aim:false,sprint:false,jump:false};
  let mode='mouse',reloadPulse=false;
  let fire=false,aim=false,yaw=0,pitch=0,active=false,pending=false,requestId=0,promiseRequest=false,wasLocked=false,unlockUntil=0;
  const clear=()=>{keys.clear();fire=false;aim=false;reloadPulse=false;for(const key of Object.keys(touch))touch[key]=typeof touch[key]==='number'?0:false;};
  const locked=()=>document.pointerLockElement===canvas;
  const record=(type,detail='')=>{events.push({type,detail,at:performance.now(),requestId,active,pending,locked:locked()});if(events.length>80)events.shift();};
  const readyToLock=()=>!document.hidden&&!active&&!pending&&!locked()&&(mode==='touch'||performance.now()>=unlockUntil);
  function fail(error,id) {
    record('request-rejected',`${error.name||'Error'}: ${error.message||error}`);
    // A cancelled/older request must never pause a later, successfully acquired lock.
    if(id!==requestId||!pending)return;
    pending=false;clear();onPause(error);
  }
  document.addEventListener('keydown',e=>{
    if(!active)return;
    if(e.code==='Escape'&&mode==='touch'){clear();onPause();return;}
    if(e.target?.closest?.('button,input,select'))return;
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code))e.preventDefault();
    if(e.code==='Escape'){clear();record('escape');return;} // The browser owns the default unlock gesture.
    if(e.code==='KeyE'&&!e.repeat)onInteract();
    if(e.code==='KeyQ'&&!e.repeat)onOrder();
    keys.add(e.code);
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  document.addEventListener('mousemove',e=>{if(active&&mode==='mouse'&&locked()){yaw-=e.movementX*.002;pitch=clamp(pitch-e.movementY*.002,-1.35,1.35);}});
  document.addEventListener('mousedown',e=>{if(active&&mode==='mouse'&&locked()){if(e.button===0)fire=true;if(e.button===2)aim=true;}});
  document.addEventListener('mouseup',e=>{if(e.button===0)fire=false;if(e.button===2)aim=false;});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  document.addEventListener('pointerlockchange',()=>{
    const acquired=locked();
    if(!acquired&&wasLocked) {
      // Chromium rejects immediate recapture after Escape. Wait for a fresh user click,
      // never a timer-driven request that loses the browser's user-activation permission.
      unlockUntil=performance.now()+1300;
    }
    wasLocked=acquired;record(acquired?'lock-acquired':'lock-released');
    if(acquired) {
      if(pending&&mode==='mouse'){pending=false;onLock();}
      else if(!active||mode==='touch')document.exitPointerLock(); // Acquisition completed after cancellation.
    } else if(active&&mode==='mouse') {active=false;clear();onPause();}
    // A queued release from the old session must not cancel a pending new request.
  });
  document.addEventListener('pointerlockerror',()=>{
    record('pointerlockerror');
    if(pending&&!promiseRequest)fail(new Error('Browser refused mouse capture'),requestId);
  });
  window.addEventListener('blur',()=>{record('blur');clear();if(active||pending)onPause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();if(active||pending)onPause();}});
  return {
    get mode(){return mode;},
    setMode(value){
      if(!['mouse','touch'].includes(value))throw new Error('Unknown control mode');
      if(active||pending)throw new Error('Pause before changing controls');
      mode=value;clear();requestId++;record('mode',mode);
    },
    control(event){
      if(!active||mode!=='touch')return;
      if(event.type==='move'&&Number.isFinite(event.forward)&&Number.isFinite(event.right)){touch.forward=clamp(event.forward,-1,1);touch.right=clamp(event.right,-1,1);}
      if(event.type==='look'&&Number.isFinite(event.dx)&&Number.isFinite(event.dy)){yaw-=clamp(event.dx,-200,200)*.005;pitch=clamp(pitch-clamp(event.dy,-200,200)*.005,-1.35,1.35);}
      if(event.type==='button'&&['fire','aim','sprint','jump'].includes(event.action))touch[event.action]=!!event.down;
      if(event.type==='pulse'){if(event.action==='interact')onInteract();if(event.action==='order')onOrder();if(event.action==='reload')reloadPulse=true;if(event.action==='pause')onPause();}
    },
    setActive(value){
      active=value;clear();
      if(!value){requestId++;pending=false;if(locked())document.exitPointerLock();}
      record(value?'input-active':'input-inactive');
    },
    setLook(y=0,p=0){yaw=y;pitch=p;},
    readyToLock,
    get pending(){return pending;},
    lock(){
      if(!readyToLock()){record('request-not-ready');return false;}
      if(mode==='touch'){record('touch-start');onLock();return true;}
      pending=true;promiseRequest=false;const id=++requestId;record('request');
      try{const result=canvas.requestPointerLock();promiseRequest=!!result?.catch;if(promiseRequest)result.catch(error=>fail(error,id));}
      catch(error){fail(error,id);}
      return true;
    },
    inspect(){return {mode,touch:{...touch},active,pending,requestId,yaw,pitch,ready:readyToLock(),waitMs:Math.max(0,unlockUntil-performance.now()),events:events.map(e=>({...e}))};},
    sample(dt){
      if(active){yaw+=((keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0))*dt;pitch=clamp(pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*.7*dt,-1.35,1.35);}
      const reload=active&&(keys.has('KeyR')||(dt>0&&reloadPulse));if(dt>0)reloadPulse=false;
      return {forward:clamp(+keys.has('KeyW')-keys.has('KeyS')+touch.forward,-1,1),right:clamp(+keys.has('KeyD')-keys.has('KeyA')+touch.right,-1,1),sprint:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.sprint,jump:keys.has('Space')||touch.jump,fire:fire||touch.fire||keys.has('KeyF'),aim:aim||touch.aim,yaw,pitch,reload};
    }
  };
}
