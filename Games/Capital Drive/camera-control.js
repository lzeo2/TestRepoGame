import {MAX_AIM_PITCH} from './ballistics.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=n=>Number.isFinite(n)?n:0;
export function lookAngles(yaw,pitch,dx,dy){
  return {yaw:finite(yaw)-clamp(finite(dx),-240,240)*.0045,
    pitch:clamp(finite(pitch)-clamp(finite(dy),-240,240)*.0045,-MAX_AIM_PITCH,MAX_AIM_PITCH)};
}
export function footCameraFrame(pose,{yaw=0,pitch=0,ground=0,aiming=false,indoors=false}={}){
  yaw=finite(yaw);pitch=clamp(finite(pitch),-MAX_AIM_PITCH,MAX_AIM_PITCH);
  const x=finite(pose?.x),z=finite(pose?.z),eye=finite(ground)+1.45+Math.max(0,finite(pose?.jumpHeight));
  const distance=indoors?(aiming?2.5:3.2):(aiming?3.4:5.8),shoulder=aiming?.55:.12;
  const sy=Math.sin(yaw),cy=Math.cos(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),reach=aiming?32:14;
  return {camera:{x:x+sy*distance*cp+cy*shoulder,y:eye+(aiming?.48:.85)-sp*distance,z:z+cy*distance*cp-sy*shoulder},
    target:{x:x-sy*reach*cp,y:eye+sp*reach,z:z-cy*reach*cp}};
}
export const cameraBlend=(dt,aiming=false)=>1-Math.exp(-Math.max(0,Math.min(.1,finite(dt)))*(aiming?18:11));
