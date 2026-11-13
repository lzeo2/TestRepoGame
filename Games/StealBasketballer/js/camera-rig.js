import {COURT} from './court-config.js';

export const CAMERA_ZOOM=Object.freeze({min:.65,max:1.8});
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const point=(p,fallback=[0,0,0])=>[finite(p?.x??p?.[0],fallback[0]),finite(p?.y??p?.[1],fallback[1]),finite(p?.z??p?.[2],fallback[2])];
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const length=p=>Math.hypot(...p);
const normalized=p=>p.map(v=>v/length(p));
const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);

// Distance needed to contain the court and hoops, including at oblique orbit angles.
export function courtFitDistance({aspect=1,fov=52,yaw=0}={}) {
  aspect=clamp(finite(aspect,1),.2,5);fov=clamp(finite(fov,52),30,90);yaw=finite(yaw);
  const direction=[Math.sin(yaw)*.54,.84,Math.cos(yaw)*.54];
  const forward=normalized(direction),right=[Math.cos(yaw),0,-Math.sin(yaw)];
  const up=[-forward[1]*Math.sin(yaw),Math.hypot(forward[0],forward[2]),-forward[1]*Math.cos(yaw)];
  const tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect;
  let distance=0;
  for(const x of [-COURT.halfLength-2,COURT.halfLength+2])for(const z of [-COURT.halfWidth-2,COURT.halfWidth+2])for(const y of [0,12]) {
    const p=[x,y-3,z];
    distance=Math.max(distance,dot(p,forward)+Math.abs(dot(p,right))/tanH,dot(p,forward)+Math.abs(dot(p,up))/tanV);
  }
  return distance*1.1;
}

/** Pure presentation state. Input positions accept arrays or Vector3-like objects.
 * Match subjects use court-local coordinates; pitch is their world-space origin.
 * update returns detached arrays; caller owns Three camera/projection updates.
 * A zero/invalid dt freezes an initialized rig. reset explicitly permits a cut.
 */
export class CameraRig {
  constructor({position,target}={}) {this.position=position?point(position):null;this.target=target?point(target):null;this.previousSubject=null;this.subjectKey=null;}
  reset({position,target}={}) {this.position=position?point(position):null;this.target=target?point(target):null;this.previousSubject=null;this.subjectKey=null;}
  update(dt,{mode='avatar',index=0,zoom=1,yaw,orbit=0,aspect=1,fov=52,match,pitch,avatar}={}) {
    const elapsed=clamp(finite(dt),0,.25),origin=point(pitch),person=point(avatar);
    zoom=clamp(finite(zoom,1),CAMERA_ZOOM.min,CAMERA_ZOOM.max);yaw=finite(yaw,finite(orbit));
    let desired=[person[0],person[1]+3,person[2]],offset=[20,23,30],subject=null,key=mode;
    if(mode!=='avatar') {
      desired=[origin[0],origin[1]+3,origin[2]];
      const fit=courtFitDistance({aspect,fov,yaw});offset=normalized([0,.84,.54]).map(v=>v*fit);
      if(['ball','player','celebration','icon'].includes(mode)&&match) {
        const players=match.players||[],celebration=match.celebration;
        if(mode==='ball') {
          // Grounded possession avoids dribble-height and hand animation feedback.
          const owner=Number.isInteger(match.ball?.owner)?players[match.ball.owner]:null;
          subject=owner&&!match.ball?.flight?owner:match.ball;key=`ball:${owner&&!match.ball?.flight?match.ball.owner:'flight'}`;
        } else if(mode==='celebration') {
          subject=players[celebration?.scorerIndex]||players.find(p=>(p.name===celebration?.scorer||p.id===celebration?.scorer||p.key===celebration?.scorer)&&p.side===celebration?.side);
        } else subject=players[clamp(Math.trunc(finite(index)),0,9)];
        if(subject) {
          const p=point(subject);p[0]=clamp(p[0],-COURT.halfLength,COURT.halfLength);p[2]=clamp(p[2],-COURT.halfWidth,COURT.halfWidth);p[1]=3;
          // Lead is capped, and never inferred across possession changes/teleports.
          if(elapsed>0&&this.previousSubject&&this.subjectKey===key)for(const axis of [0,2]) {
            const delta=p[axis]-this.previousSubject[axis];
            p[axis]+=Math.abs(delta)<8?clamp(delta/elapsed*.12,-2.5,2.5):0;
          }
          if(elapsed>0||!this.previousSubject){this.previousSubject=point(subject);this.subjectKey=key;}
          desired=origin.map((v,i)=>v+p[i]);
          offset=mode==='icon'?[0,19,21]:mode==='celebration'?[24,24,28]:[0,40,38];
        }
      }
      if(mode==='hoop'||mode==='goalcorner') {
        const side=index===1?-1:1;desired=[origin[0]+side*COURT.rimX,origin[1]+COURT.rimY,origin[2]];offset=[side*20,24,32];
      }
    }
    const sin=Math.sin(yaw),cos=Math.cos(yaw),rotated=[offset[0]*cos+offset[2]*sin,offset[1],offset[2]*cos-offset[0]*sin].map(v=>v/zoom);
    // Above the tallest court-side structures, even at maximum close zoom.
    rotated[1]=Math.max(mode==='avatar'?12:18,rotated[1]);
    if(!this.target)this.target=desired.slice();
    else if(elapsed>0) {
      const delta=desired.map((v,i)=>v-this.target[i]),distance=length(delta),deadzone=mode==='ball'?.65:0;
      if(distance>deadzone) {
        const blend=(-Math.expm1(-elapsed*3.5))*(distance-deadzone)/distance;
        this.target=mix(this.target,desired,Math.min(blend,(mode==='ball'?42:90)*elapsed/distance));
      }
    }
    const goal=this.target.map((v,i)=>v+rotated[i]);
    if(!this.position)this.position=goal;
    else if(elapsed>0)this.position=mix(this.position,goal,-Math.expm1(-elapsed*5));
    return {position:this.position.slice(),target:this.target.slice(),near:.3,far:2400,zoom,distance:length(this.position.map((v,i)=>v-this.target[i]))};
  }
}
export const createCameraRig=options=>new CameraRig(options);
