import {MAX_AIM_PITCH} from './ballistics.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(n)?n:0;
export function lookAngles(yaw,pitch,dx,dy){
  return {yaw:finite(yaw)-clamp(finite(dx),-240,240)*.0045,
    pitch:clamp(finite(pitch)-clamp(finite(dy),-240,240)*.0045,-MAX_AIM_PITCH,MAX_AIM_PITCH)};
}
export function footCameraFrame(pose,{yaw=0,pitch=0,ground=0,aiming=false,indoors=false,scoped=false}={}){
  yaw=finite(yaw);pitch=clamp(finite(pitch),-MAX_AIM_PITCH,MAX_AIM_PITCH);
  const x=finite(pose?.x),z=finite(pose?.z),eye=finite(ground)+(pose?.crouching?1:1.45)+Math.max(0,finite(pose?.jumpHeight));
  const distance=indoors?(aiming?2.5:3.2):(aiming?3.4:5.8),shoulder=aiming?.55:.12;
  const sy=Math.sin(yaw),cy=Math.cos(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),reach=aiming?32:14;
  if(scoped){
    const height=eye-.1;
    return {camera:{x,y:height,z},target:{x:x-sy*reach*cp,y:height+sp*reach,z:z-cy*reach*cp}};
  }
  return {camera:{x:x+sy*distance*cp+cy*shoulder,y:eye+(aiming?.48:.85)-sp*distance,z:z+cy*distance*cp-sy*shoulder},
    target:{x:x-sy*reach*cp,y:eye+sp*reach,z:z-cy*reach*cp}};
}
export const cameraBlend=(dt,aiming=false)=>1-Math.exp(-Math.max(0,Math.min(.1,finite(dt)))*(aiming?18:11));

export function createExplosionShake() {
  const offset={x:0,y:0,z:0,roll:0};
  let strength=0,elapsed=0,duration=.55,phase=0;
  const level=()=>strength*Math.max(0,1-elapsed/duration)**2;
  function kick(distance,radius,damage) {
    if(![distance,radius,damage].every(Number.isFinite)||distance<0||radius<=0||damage<=0)return false;
    const closeness=1-distance/(radius*3);
    if(closeness<=0)return false;
    strength=Math.max(level(),clamp(damage/100,.15,1.7)*closeness*.28);
    duration=clamp(.42+radius*.014,.42,.7);elapsed=0;phase=(phase+1.9)%(Math.PI*2);
    return true;
  }
  function advance(dt,suppressed=false) {
    if(suppressed)strength=0;
    if(!strength)return null;
    elapsed+=Math.max(0,finite(dt));
    const amplitude=level();
    if(amplitude<.0001){strength=0;return null;}
    offset.x=Math.sin(elapsed*73+phase)*amplitude;
    offset.y=Math.cos(elapsed*59+phase)*amplitude*.61;
    offset.z=Math.sin(elapsed*41+phase)*amplitude*.35;
    offset.roll=Math.sin(elapsed*67+phase)*amplitude*.085;
    return offset;
  }
  return {kick,advance};
}
