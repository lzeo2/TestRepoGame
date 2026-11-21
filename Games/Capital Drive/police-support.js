// Two unarmed spotting craft; the existing police owner supplies the only clock.
export function createPoliceSupport(simulation, { heightAt=()=>0 }={}) {
  let craft=[], memory={x:simulation.player.x,z:simulation.player.z};
  function reset(){craft=[];memory={x:simulation.player.x,z:simulation.player.z};}
  function step(dt,state,target,room=null){
    if(!Number.isFinite(dt)||dt<=0)return false;
    if(state.sandbox||state.wanted<3){reset();return false;}
    dt=Math.min(dt,.05);
    const kinds=state.wanted>=4?['drone','helicopter']:['drone'];
    craft=craft.filter(item=>kinds.includes(item.kind));
    for(const kind of kinds)if(!craft.some(item=>item.kind===kind))craft.push({id:`police-${kind}`,kind,
      x:memory.x+90,z:memory.z+60,y:0,yaw:0,seesPlayer:false,sightClock:0,age:0});
    let seen=false;
    for(const item of craft){
      item.age+=dt;item.sightClock-=dt;
      if(room || state.health===0)item.seesPlayer=false;
      if(item.sightClock<=0){
        item.sightClock=.4;
        item.seesPlayer=!room && state.health!==0 && Math.hypot(item.x-target.x,item.z-target.z)<180 && simulation.hasLineOfSight(item,target);
        if(item.seesPlayer)memory={x:target.x,z:target.z};
      }
      const goal=memory;
      const offset=item.kind==='helicopter'?45:28;
      const x=goal.x+Math.cos(item.age*.15)*offset,z=goal.z+Math.sin(item.age*.15)*offset;
      const dx=x-item.x,dz=z-item.z,d=Math.hypot(dx,dz),amount=Math.min(d,dt*(item.kind==='helicopter'?22:16));
      if(d>0){item.x+=dx/d*amount;item.z+=dz/d*amount;item.yaw=Math.atan2(-dx,-dz);}
      item.y=heightAt(item.x,item.z)+(item.kind==='helicopter'?48:24);
      seen ||= item.seesPlayer;
    }
    return seen;
  }
  return {step,reset,report(point){if(point&&[point.x,point.z].every(Number.isFinite))memory={x:point.x,z:point.z};},
    snapshot:()=>Object.freeze(craft.map(item=>Object.freeze({...item,interiorId:null,armed:false})))};
}
