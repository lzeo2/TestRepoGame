const ID='skyline-atv',LENGTH=2,WIDTH=1.3,HEIGHT=1.75;
const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const axis=n=>Number.isFinite(n)?Math.max(-1,Math.min(1,n)):0;
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const copy=p=>p?Object.freeze({...p}):null;

// A single transient mission vehicle. No ownership, garage, theft or save state.
export function createSkylineAtv({heightAt,canOccupy,moveVehicle,canStand,canSee}={}){
  if([heightAt,canOccupy,moveVehicle,canStand,canSee].some(fn=>typeof fn!=='function'))throw new TypeError('ATV requires terrain and shared body/exit collision adapters');
  let vehicle=null;
  const options=()=>({ignoreId:ID,length:LENGTH,width:WIDTH});
  const offset=(p,side,aft)=>({x:p.x+Math.cos(p.yaw)*side+Math.sin(p.yaw)*aft,z:p.z-Math.sin(p.yaw)*side+Math.cos(p.yaw)*aft,yaw:p.yaw});
  function spawn(landing){
    if(vehicle)return {ok:false,reason:'atv-already-spawned'};
    if(!finite(landing))return {ok:false,reason:'invalid-landing'};
    const anchor={x:landing.x,z:landing.z,yaw:Number.isFinite(landing.yaw)?landing.yaw:0};
    for(const [side,aft] of [[4,0],[-4,0],[0,5],[0,-5],[6,3],[-6,3]]){
      const p=offset(anchor,side,aft),y=heightAt(p.x,p.z);
      if(!Number.isFinite(y))continue;
      const body={id:ID,kind:'atv',...p,y,speed:0,length:LENGTH,width:WIDTH,height:HEIGHT,active:true,occupied:false};
      if(!canOccupy(body,options())||!canStand(p,options())||!canSee(anchor,p,options()))continue;
      vehicle=body;return {ok:true,id:ID,vehicle:copy(vehicle)};
    }
    return {ok:false,reason:'no-clear-atv-stand'};
  }
  function interact(context={}){
    if(!vehicle||context.valid===false||context.paused||context.recovering||context.interior)return {ok:false,reason:'atv-unavailable'};
    if(vehicle.occupied){
      if(Math.abs(vehicle.speed)>.4)return {ok:false,reason:'stop-before-exit'};
      for(const [side,aft] of [[1.35,0],[-1.35,0],[0,1.75],[0,-1.75]]){
        const p=offset(vehicle,side,aft),y=heightAt(p.x,p.z);
        if(!Number.isFinite(y)||!canStand(p,options())||!canSee(vehicle,p,options()))continue;
        vehicle.occupied=false;vehicle.speed=0;return {ok:true,exited:true,exitPose:{...p,y}};
      }
      return {ok:false,reason:'atv-exit-blocked'};
    }
    if(context.onFoot!==true||!finite(context.pose)||gap(context.pose,vehicle)>2.6||(context.pose.jumpHeight||0)>1.5||(Number.isFinite(context.pose.y)&&Math.abs(context.pose.y-vehicle.y)>2.5)||!canSee(context.pose,vehicle,options()))return {ok:false,reason:'approach-atv-on-foot'};
    vehicle.occupied=true;return {ok:true,boarded:true,id:ID};
  }
  function step(dt,input={},context={}){
    if(!vehicle?.occupied||context.valid===false||context.paused||!Number.isFinite(dt)||dt<=0)return;
    const elapsed=Math.min(.1,dt),count=Math.ceil(elapsed/.025),h=elapsed/count;
    for(let i=0;i<count;i++){
      const braking=!!(input.brake||input.handbrake),throttle=braking?0:axis(input.throttle),steer=axis(input.steer);
      if(throttle)vehicle.speed=Math.max(-3.4,Math.min(12,vehicle.speed+throttle*(vehicle.speed*throttle<0?9:4)*h));
      else {vehicle.speed*=Math.exp(-(braking?9:1.6)*h);if(Math.abs(vehicle.speed)<.025)vehicle.speed=0;}
      const before={x:vehicle.x,y:vehicle.y,z:vehicle.z,yaw:vehicle.yaw};
      const yaw=vehicle.yaw-steer*vehicle.speed*.22/(1+Math.abs(vehicle.speed)*.09)*h;
      if(canOccupy({...vehicle,yaw},{...options(),fromPose:vehicle}))vehicle.yaw=yaw;
      const requested=vehicle.speed*h;
      const result=moveVehicle(vehicle,-Math.sin(vehicle.yaw)*requested,-Math.cos(vehicle.yaw)*requested,options());
      const floor=heightAt(vehicle.x,vehicle.z);
      if(!Number.isFinite(floor)||Math.abs(floor-before.y)>1.2){Object.assign(vehicle,before);vehicle.speed=0;break;}
      vehicle.y=floor;vehicle.yaw=Math.atan2(Math.sin(vehicle.yaw),Math.cos(vehicle.yaw));
      if(result?.blocked)vehicle.speed=0;
    }
  }
  return {spawn,interact,step,reset(){vehicle=null;},get vehicle(){return copy(vehicle);},
    get seatPose(){return vehicle?.occupied?Object.freeze({id:ID,x:vehicle.x,y:vehicle.y+1.55,z:vehicle.z,yaw:vehicle.yaw,speed:vehicle.speed}):null;},
    snapshot:()=>Object.freeze({vehicle:copy(vehicle),occupied:vehicle?.occupied===true})};
}
