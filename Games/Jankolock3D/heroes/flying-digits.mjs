// Adapter convention: fixed input heading, horizontal world-UP yaw fan.
// Collision is swept point vs radius-expanded standard AABBs. Box corners are
// conservative, not rounded mesh/sphere geometry or a native physics guarantee.
export const FLYING_DIGITS = Object.freeze({id:'flyingdigits',slot:3,cooldown:8,range:25,
  damageType:'weapon',baseDamage:18,baseHeal:0,spiritScale:0,slow:0,invulnerable:false,
  windup:.25,projectileCount:4,projectileSpeed:40,projectileRadius:.2,spreadDegrees:28,
  maxHitsPerTarget:2,fireInterval:0,pattern:'fan',duration:25/40});

export function isFlyingDigits(a) {
  return Object.entries(FLYING_DIGITS).every(([key,value])=>a[key]===value);
}

export function flyingDigitDirections(direction,definition=FLYING_DIGITS) {
  const length=Math.hypot(direction.x,direction.y,direction.z);
  if(!Number.isFinite(length)||length===0)throw new RangeError('Invalid flight direction');
  return Array.from({length:definition.projectileCount},(_,index)=>{
    const angle=(-definition.spreadDegrees/2+index*definition.spreadDegrees/(definition.projectileCount-1))*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    return {x:(direction.x*c+direction.z*s)/length,y:direction.y/length,z:(direction.z*c-direction.x*s)/length};
  });
}

export function segmentBoxFraction(start,end,box,radius=0) {
  let enter=0,exit=1;
  for(const axis of ['x','y','z']) {
    const upper=axis.toUpperCase(),min=(box.min?box.min[axis]:box[`min${upper}`])-radius;
    const max=(box.max?box.max[axis]:box[`max${upper}`])+radius,delta=end[axis]-start[axis];
    if(delta===0){if(start[axis]<min||start[axis]>max)return null;continue;}
    const a=(min-start[axis])/delta,b=(max-start[axis])/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit)return null;
  }
  return enter;
}

export function flyingDigitStep(projectile,dt,boxes,targets,team) {
  const a=projectile.definition,range=a.id==='sheenwall'?a.projectileRange:a.range,distance=Math.min(Math.max(0,range-projectile.travelled),a.projectileSpeed*Math.max(0,dt));
  const start=projectile.position,end={x:start.x+projectile.direction.x*distance,y:start.y+projectile.direction.y*distance,z:start.z+projectile.direction.z*distance};
  let contact=null;
  const test=(bounds,target,wall)=>{
    const fraction=segmentBoxFraction(start,end,bounds,a.projectileRadius);
    if(fraction!==null&&(!contact||fraction<contact.fraction))contact={fraction,target,wall};
  };
  // Cover wins exact ties. Targets retain ordinary manual-hit eligibility.
  for(const wall of boxes)if(wall.panelTarget?.alive!==false)test(wall,wall.panelTarget??null,wall);
  for(const target of targets) {
    if(target.kind==='panel'||target.alive===false||target.team===team)continue;
    const p=target.position,r=target.radius??.6,h=target.height??1.8;
    test({minX:p.x-r,maxX:p.x+r,minY:p.y,maxY:p.y+h,minZ:p.z-r,maxZ:p.z+r},target,null);
  }
  const fraction=contact?.fraction??1;
  const position={x:start.x+(end.x-start.x)*fraction,y:start.y+(end.y-start.y)*fraction,z:start.z+(end.z-start.z)*fraction};
  const travelled=Math.min(range,projectile.travelled+distance*fraction);
  return {position,travelled,contact,done:!!contact||travelled>=range};
}
