import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Exercise the actual controller adapters without a renderer or a second clock.
const source=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
function extract(name){
  const start=source.indexOf(`function ${name}(`);
  assert(start>=0,`controller function ${name} exists`);
  const body=source.indexOf('{',start);let depth=1,end=body+1;
  for(;depth&&end<source.length;end++)depth+=(source[end]==='{')-(source[end]==='}');
  return source.slice(start,end);
}
let move={x:0,y:0,active:false},look={x:0,y:0,active:false};
const stick=(get,reset)=>({snapshot:get,clear:reset});
const env={droneActive:false,keys:new Set(),touch:new Set(),actionTouch:new Set(),miniKeys:new Set(),touchHolds:new Map(),
  moveStick:stick(()=>({...move}),()=>{move={x:0,y:0,active:false};}),
  lookStick:stick(()=>({...look}),()=>{look={x:0,y:0,active:false};}),
  THREE:{MathUtils:{clamp:(value,min,max)=>Math.max(min,Math.min(max,value))}},
  footCameraYaw:0,footLookPitch:0,MAX_AIM_PITCH:1.22,orbitHeight:0,orbit:0,lookPitch:0,orbitHold:0,
  tutorialSerials:{orbitSerial:0},mouseAim:false,mouseFire:false,dragging:false,pointer:null,mapDrag:null,
  gameplay:{state:{mode:'foot',actor:{impactTime:0},recovery:null,passenger:false}},
  activities:{snapshot:()=>({active:false})},rentalHack:{snapshot:()=>({active:false})},micromobility:{snapshot:()=>({active:false})},
  canPlayerAttack:()=>true,streetChallenge:()=>null,paused:()=>false};
const api=Function('env',`with(env){${['clearInput','touchInputEnabled','bindTouchHold','walkingInput','input','updateTouchCamera'].map(extract).join('\n')};return {clearInput,bindTouchHold,walkingInput,input,updateTouchCamera};}`)(env);
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-9,`${actual} ~= ${expected}`);
move={x:.25,y:-.5,active:true};
near(api.walkingInput().moveX,.25);near(api.walkingInput().moveZ,-.5);
near(api.input().steer,.25);near(api.input().throttle,.5);
env.footCameraYaw=Math.PI/2;near(api.walkingInput().moveX,-.5);near(api.walkingInput().moveZ,-.25);
env.keys.add('KeyW');near(api.input().throttle,1);
env.keys.add('KeyS');near(api.input().throttle,.5);
env.keys.clear();env.touch.add('boost');env.touch.add('handbrake');
assert(api.input().boost&&api.input().handbrake&&api.walkingInput().sprint&&api.walkingInput().jump);
env.actionTouch.add('aim');env.actionTouch.add('fire');assert(api.walkingInput().aim&&api.walkingInput().fire);
env.keys.add('KeyX');assert(api.walkingInput().crouch);env.keys.delete('KeyX');assert(!api.walkingInput().crouch);
env.actionTouch.add('crouch');assert(api.walkingInput().crouch);env.actionTouch.delete('crouch');
env.canPlayerAttack=()=>false;assert(!api.walkingInput().fire&&!api.walkingInput().aim);
env.gameplay.state.passenger=true;assert.deepEqual(api.walkingInput(),{});env.gameplay.state.passenger=false;
env.footCameraYaw=0;look={x:1,y:.5,active:true};api.updateTouchCamera(.05);
near(env.footCameraYaw,-.105);near(env.footLookPitch,-.0425);assert.equal(env.tutorialSerials.orbitSerial,1);
env.gameplay.state.mode='vehicle';api.updateTouchCamera(10);
near(env.orbit,-.1575);near(env.lookPitch,-.045);assert.equal(env.tutorialSerials.orbitSerial,2);
const camera=[env.orbit,env.lookPitch];api.updateTouchCamera(0);assert.deepEqual([env.orbit,env.lookPitch],camera);
look={x:0,y:-1,active:true};env.lookPitch=.72;api.updateTouchCamera(.05);
assert.equal(env.tutorialSerials.orbitSerial,2,'a pitch clamped at its limit cannot credit a tutorial camera move');
env.paused=()=>true;move={x:1,y:-1,active:true};look={x:1,y:1,active:true};api.updateTouchCamera(.05);
assert(!move.active&&!look.active);assert.equal(env.tutorialSerials.orbitSerial,2);

class Button extends EventTarget{
  captured=new Set();setPointerCapture(id){this.captured.add(id);}hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);this.emit('lostpointercapture',id);}
  emit(type,id){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,pointerType:'touch',button:0});this.dispatchEvent(e);}
}
const run=new Button(),fire=new Button();api.bindTouchHold(run,env.touch,'boost');api.bindTouchHold(fire,env.actionTouch,'fire');
env.touch.clear();env.actionTouch.clear();run.emit('pointerdown',1);assert(!env.touch.size,'paused buttons do not latch');
env.paused=()=>false;run.emit('pointerdown',1);fire.emit('pointerdown',2);
run.emit('pointerdown',3);run.emit('pointerup',3);assert(env.touch.has('boost'),'another finger cannot release the owning hold');
fire.emit('pointercancel',2);assert(!env.actionTouch.has('fire'));assert(env.touch.has('boost'),'other controls survive independent cancellation');
env.keys.add('KeyW');env.miniKeys.add('x');env.mouseFire=true;env.dragging=true;
api.clearInput();assert(!env.keys.size&&!env.miniKeys.size&&!env.touch.size&&!env.actionTouch.size&&!env.touchHolds.size);
assert(!run.captured.size&&!env.mouseFire&&!env.dragging);
console.log('PASS touch controller: analog movement, camera-relative walking, keyboard mixing, guarded actions, supplied camera time and owner-only holds/reset');
