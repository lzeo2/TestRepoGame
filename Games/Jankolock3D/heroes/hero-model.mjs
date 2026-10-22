import { cloneCharacter } from '../character-assets.mjs';

// Runtime pose adapter over the actual committed GLB, not a second primitive hero.
export function createHeroVisual(id) {
  if(!['stampead','turretina','snipeoff','gooey'].includes(id))throw new RangeError(`Unknown hero: ${id}`);
  const asset=cloneCharacter(id),group=asset.group;
  const body=group.children[0]??group;
  const joint=name=>group.getObjectByName(name);
  const joints=['arm-left','arm-right','leg-left','leg-right','cape'].map(name=>joint(name));
  const rests=joints.map(part=>part?.rotation.clone());
  let clock=0,disposed=false;
  return {group,metadata:asset.metadata,
    update(dt,{state='idle',speed=0,yaw=0,aiming=false}={}) {
      if(disposed)return;
      clock+=Math.max(0,Number.isFinite(dt)?dt:0);group.rotation.y=Number.isFinite(yaw)?yaw:0;
      const moving=Math.min(1,Math.abs(Number.isFinite(speed)?speed:0)/8),step=Math.sin(clock*9)*moving;
      body.position.y=Math.abs(step)*.022;
      body.userData.pose=state;
      body.rotation.x=state==='slide'?-.42:state==='dash'?-.17:state==='jump'?-.08:state==='fall'?.06:0;
      // Preserve authored rigid anatomy; no cartoon vertical squash.
      joints.forEach((part,i)=>{
        if(!part)return;part.rotation.copy(rests[i]);
        if(i<2)part.rotation.x+=(i?1:-1)*step*.12+(aiming?-.08:0);
        else if(i<4)part.rotation.x+=(i===2?1:-1)*step*.2+(state==='slide'?.35:0);
        else part.rotation.x+=Math.sin(clock*2.2)*.015;
      });
    },
    dispose(){if(disposed)return;disposed=true;asset.dispose();}
  };
}
