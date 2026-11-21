// One tick of render history. Never pass the sampled pose back to gameplay.
export function createFootMotion(){
  const drawn={};
  let actor=null,room=null,x=0,z=0,yaw=0,speed=0,jump=0,lastBlend=0;
  function capture(pose,space){
    actor=pose;room=space;lastBlend=0;
    if(!pose)return;
    x=pose.x;z=pose.z;yaw=pose.yaw;speed=pose.speed;jump=pose.jumpHeight;
  }
  function sample(pose,space,fraction,cut=false){
    if(!pose||pose!==actor||space!==room||cut){actor=null;room=null;return pose;}
    const dx=pose.x-x,dz=pose.z-z,dy=pose.jumpHeight-jump;
    // Clear history across teleports and other discontinuous position changes.
    if(!(dx*dx+dz*dz<.75**2&&Math.abs(dy)<.75)){actor=null;room=null;return pose;}
    // The paused loop clears its accumulator. Retain the last presented phase.
    const t=lastBlend=Math.max(lastBlend,Math.min(1,fraction));
    if(t===1||(dx===0&&dz===0&&dy===0&&yaw===pose.yaw&&speed===pose.speed))return pose;
    let heading=pose.yaw-yaw;
    if(Math.abs(heading)>Math.PI)heading=Math.atan2(Math.sin(heading),Math.cos(heading));
    Object.assign(drawn,pose);
    drawn.x=x+dx*t;drawn.z=z+dz*t;drawn.jumpHeight=jump+dy*t;
    drawn.yaw=yaw+heading*t;drawn.speed=speed+(pose.speed-speed)*t;
    return drawn;
  }
  return {capture,sample};
}
