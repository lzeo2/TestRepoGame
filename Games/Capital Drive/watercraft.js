import { roadProfile } from './road-network.js';

export const WATERCRAFT_OFFERS = Object.freeze([
  Object.freeze({id:'boat',kind:'boat',name:'Lake launch',price:2400,length:4.8,width:2.1,maxSpeed:14,acceleration:3.8,braking:7,turnRate:.65,drag:.55}),
  Object.freeze({id:'jet-ski',kind:'jet-ski',name:'Reed jet ski',price:1600,length:2.7,width:1.1,maxSpeed:23,acceleration:7.5,braking:11,turnRate:1.35,drag:.8}),
]);
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const gap = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const offset = (p,side,forward) => ({x:p.x+Math.cos(p.yaw)*side-Math.sin(p.yaw)*forward,z:p.z-Math.sin(p.yaw)*side-Math.cos(p.yaw)*forward});
const copy = value => value==null?null:JSON.parse(JSON.stringify(value));
function outsideLanes(p,roads){
  for(const road of roads)for(let i=1;i<road.points.length;i++){
    const a=road.points[i-1],b=road.points[i];
    if(p.x<Math.min(a[0],b[0])-16||p.x>Math.max(a[0],b[0])+16||p.z<Math.min(a[1],b[1])-16||p.z>Math.max(a[1],b[1])+16)continue;
    const profile=roadProfile(road);if(!profile.trafficAllowed)continue;
    const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p.x-a[0])*dx+(p.z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
    if(Math.hypot(p.x-a[0]-t*dx,p.z-a[1]-t*dz)<profile.driveWidth/2+1.5)return false;
  }
  return true;
}

// Supplied-clock lake transport only. Purchases, player state and saves stay outside.
export function createWatercraft(map,simulation,{owns=()=>false,heightAt=()=>0,canExit}={}) {
  const water = (x,z) => simulation.waterAt(x,z,{underBridge:true});
  const stand = canExit || (pose => water(pose.x,pose.z) ? true : simulation.moveActor ? !simulation.moveActor({...pose},0,0,.45).blocked : true);
  const lake = map.areas?.find(area=>area.sourceId==='relation/3400115'&&area.type==='water') || map.areas?.find(area=>area.type==='water');
  const preferred=['Menindee Drive','Wendouree Drive','Alexandrina Drive','Lady Denman Drive'];
  const roads=(map.roads||[]).filter(road=>roadProfile(road).trafficAllowed&&preferred.includes(road.name));
  roads.sort((a,b)=>preferred.indexOf(a.name)-preferred.indexOf(b.name));
  const crafts=[];let activeId=null,disposed=false,seat=null,seatSource=null;
  function floats(pose,length,width) {
    for(const side of [-width/2,0,width/2])for(const forward of [-length/2,0,length/2]){
      const p=offset(pose,side,forward);if(!water(p.x,p.z))return false;
    }
    return true;
  }
  let dock=null;
  if(lake?.points?.length){
    for(const road of roads){
      const candidates=[];
      for(const point of road.points){
        const land={x:point[0],z:point[1]};if(water(land.x,land.z))continue;
        for(let i=0;i<lake.points.length-1;i++){
          const p=lake.points[i],shore={x:p[0],z:p[1]},distance=gap(land,shore);
          if(distance>80||distance<2)continue;
          candidates.push({land,shore,distance,index:i});
        }
      }
      candidates.sort((a,b)=>a.distance-b.distance);
      for(const candidate of candidates){
        const {land,shore,distance}=candidate,nx=(shore.x-land.x)/distance,nz=(shore.z-land.z)/distance;
        const yaw=Math.atan2(-nx,-nz),dry={x:shore.x-nx*1.5,z:shore.z-nz*1.5};
        if(water(dry.x,dry.z)||!stand(dry)||!outsideLanes(dry,map.roads||[]))continue;
        for(const inset of [4,6,9]){
          const centre={x:shore.x+nx*inset,z:shore.z+nz*inset,yaw};
          const positions=WATERCRAFT_OFFERS.map((offer,i)=>({...offset(centre,(i?1:-1)*4,0),yaw}));
          if(!positions.every((pose,i)=>gap(pose,dry)<=8&&floats(pose,WATERCRAFT_OFFERS[i].length,WATERCRAFT_OFFERS[i].width)))continue;
          const y=water(centre.x,centre.z)?.y??map.lakeWaterLevel??5.93;
          dock={id:'boat-shed',name:'Boat Shed',x:dry.x,z:dry.z,radius:8,yaw,shore:{...dry,y:heightAt(dry.x,dry.z)},
            water:{x:centre.x,z:centre.z,y},sign:{x:dry.x,z:dry.z,y:heightAt(dry.x,dry.z),yaw},
            approach:{...land},sourceId:lake.sourceId||String(lake.id),roadId:road.id,roadName:road.name};
          positions.forEach((pose,i)=>crafts.push({...WATERCRAFT_OFFERS[i],...pose,id:`watercraft:${WATERCRAFT_OFFERS[i].kind}`,y,speed:0,active:true,occupied:false}));
          break;
        }
        if(dock)break;
      }
      if(dock)break;
    }
  }
  const initial=crafts.map(copy);
  const active = () => crafts.find(c=>c.id===activeId)||null;
  const view = craft => craft?Object.freeze({...craft,owned:owns(craft.kind)===true,occupied:craft.id===activeId}):null;
  function nearest(pose){
    if(disposed||!finite(pose))return null;
    let best=null;
    for(const craft of crafts){const distance=gap(pose,craft);if(distance<=7&&(!best||distance<best.distance))best={...view(craft),distance};}
    return best?Object.freeze(best):null;
  }
  function board(id,ctx={}){
    if(disposed||active()||ctx.valid!==true||ctx.onFoot!==true||ctx.indoors||ctx.recovering||!finite(ctx.pose))return {ok:false,message:'Approach the launch on foot.'};
    const craft=crafts.find(c=>c.id===id);
    if(!craft||gap(ctx.pose,craft)>7||!floats(craft,craft.length,craft.width))return {ok:false,message:'Move beside your moored watercraft.'};
    if(owns(craft.kind)!==true)return {ok:false,message:`Buy the ${craft.name} at Boat Shed first.`};
    activeId=craft.id;craft.occupied=true;craft.speed=0;
    return {ok:true,message:`${craft.name}: W/S throttle, A/D steer. Stop before E exits.`,craftId:craft.id,pose:copy(craft)};
  }
  function dismount(ctx={}){
    const craft=active();if(disposed||!craft||ctx.valid!==true)return {ok:false,message:'Watercraft unavailable.'};
    if(Math.abs(craft.speed)>.8)return {ok:false,message:'Stop before leaving the watercraft.'};
    const candidates=[];
    for(const side of [-1,1])for(const forward of [0,-craft.length/2,craft.length/2])candidates.push(offset(craft,side*(craft.width/2+1),forward));
    candidates.push(offset(craft,0,-craft.length/2-1),offset(craft,0,craft.length/2+1));
    for(const swimming of [false,true])for(const pose of candidates){
      if(!!water(pose.x,pose.z)!==swimming||(swimming&&ctx.allowSwimmingExit===false)||!stand(pose)||crafts.some(other=>other!==craft&&gap(pose,other)<Math.hypot(other.length,other.width)/2+.45))continue;
      craft.speed=0;craft.occupied=false;activeId=null;
      return {ok:true,message:swimming?'Left the watercraft. WASD swims; reach dry shore to walk.':'Back on shore.',pose:{...pose,y:swimming?water(pose.x,pose.z).y:heightAt(pose.x,pose.z),yaw:craft.yaw},swimming};
    }
    return {ok:false,message:'No clear exit. Move closer to an open shoreline.'};
  }
  function step(dt,input={},ctx={}){
    if(!Number.isFinite(dt)||dt<0)throw new Error('Watercraft dt must be finite and nonnegative.');
    const craft=active();if(disposed||!craft||ctx.valid!==true||ctx.paused||!dt)return;
    const elapsed=Math.min(dt,.1),throttle=clamp(Number(input.throttle)||0,-1,1),steer=clamp(Number(input.steer??input.turn)||0,-1,1);
    craft.speed+=throttle*(throttle<0&&craft.speed>0?craft.braking:craft.acceleration)*elapsed;
    if(!throttle)craft.speed*=Math.exp(-craft.drag*elapsed);
    if(input.brake)craft.speed*=Math.exp(-craft.braking*elapsed);
    craft.speed=clamp(craft.speed,-3.5,craft.maxSpeed);
    const count=Math.max(1,Math.ceil(Math.abs(craft.speed)*elapsed/.3)),slice=elapsed/count;
    for(let i=0;i<count;i++){
      const yaw=craft.yaw+steer*craft.turnRate*(.15+Math.min(1,Math.abs(craft.speed)/5))*slice*(craft.speed<0?-1:1);
      const pose={x:craft.x-Math.sin(yaw)*craft.speed*slice,z:craft.z-Math.cos(yaw)*craft.speed*slice,yaw};
      if(!floats(pose,craft.length,craft.width)||crafts.some(other=>other!==craft&&gap(pose,other)<Math.hypot(craft.length,craft.width)/2+Math.hypot(other.length,other.width)/2)) {craft.speed=0;break;}
      Object.assign(craft,pose);craft.y=water(craft.x,craft.z).y;
    }
  }
  function snapshot(){return Object.freeze({dock:copy(dock),crafts:Object.freeze(crafts.map(view)),activeId,active:view(active()),prompt:active()?'W/S throttle · A/D steer · stop, then E exits':''});}
  function reset(){activeId=null;seat=null;seatSource=null;crafts.forEach((craft,i)=>Object.assign(craft,copy(initial[i])));}
  return {nearest,board,dismount,step,snapshot,interact:ctx=>active()?dismount(ctx):board(nearest(ctx?.pose)?.id,ctx),
    get dock(){return copy(dock);},get vehicles(){return crafts;},get active(){return view(active());},get isActive(){return activeId!==null&&!disposed;},
    get seatPose(){const craft=active();if(!craft){seat=null;seatSource=null;return null;}
      if(seatSource&&seatSource.id===craft.id&&seatSource.x===craft.x&&seatSource.z===craft.z&&seatSource.y===craft.y&&seatSource.yaw===craft.yaw&&seatSource.speed===craft.speed)return seat;
      seatSource={id:craft.id,x:craft.x,z:craft.z,y:craft.y,yaw:craft.yaw,speed:craft.speed};
      seat=Object.freeze({...offset(craft,0,-.2),y:craft.y+.5,yaw:craft.yaw,speed:craft.speed,id:craft.id});return seat;},
    reset,dispose(){if(disposed)return;reset();for(const craft of crafts)craft.active=false;disposed=true;}};
}
