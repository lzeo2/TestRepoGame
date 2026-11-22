import {createInteriorNavigation} from './interior-navigation.js';

const point=p=>p&&[p.x,p.z].every(Number.isFinite);
const copy=p=>Object.freeze({x:p.x,z:p.z,yaw:Number.isFinite(p.yaw)?p.yaw:0});
function ringLocation(x,z,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[j],b=ring[i],dx=b.x-a.x,dz=b.z-a.z;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
    // Match the collider's point-domain boundary tolerance, without treating
    // furniture or a temporarily occupied doorway as another room's space.
    if(Math.hypot(x-a.x-dx*t,z-a.z-dz*t)<1e-8)return -1;
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside?1:0;
}
// Only the active room and rooms occupied by the four pursuers retain navigation.
export function createPoliceRooms({navigation=createInteriorNavigation,clipMovement}={}){
  const rooms=new Map();let current=null;
  function prune(units=[]){
    const occupied=new Set(units.filter(unit=>unit.health>0&&unit.interiorId).map(unit=>unit.interiorId));
    for(const id of rooms.keys())if(id!==current&&!occupied.has(id))rooms.delete(id);
  }
  return {
    enter(plan,entry,{outside,safehouse=false,known=false,units=[],approach=[]}={}){
      if(!plan?.id||entry?.id!==plan.id||!point(outside)||!point(plan.spawn)||!point(plan.exit))throw new Error('Invalid pursuit room.');
      if(current&&rooms.has(current))rooms.get(current).playerInside=false;
      let nav=null;
      const getNav=()=>nav||(nav=navigation(plan));
      const footprint=plan.footprint?.length>=3?plan.footprint:null;
      const holes=footprint?(plan.footprintHoles||[]).map(ring=>ring.points||ring):[];
      const room={id:plan.id,safehouse:!!safehouse,known:!!known,playerInside:true,
        outside:copy(outside),approach:Object.freeze([...approach.filter(point),outside].map(copy)),inside:copy(plan.spawn),exit:copy(plan.exit),floorY:plan.floorY,
        contains(p){
          if(!point(p))return false;
          const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),x=p.x-plan.origin.x,z=p.z-plan.origin.z;
          const localX=c*x-s*z,localZ=s*x+c*z;
          if(footprint)return ringLocation(localX,localZ,footprint)===1&&holes.every(ring=>ringLocation(localX,localZ,ring)===0);
          return Math.abs(localX)<plan.width/2&&localZ>0&&localZ<plan.depth;
        },
        moveActor(actor,dx,dz,radius=.45){
          const clipped=clipMovement?.(room,actor,dx,dz,radius)||{dx,dz,blocked:false};
          const result=getNav().moveActor(actor,clipped.dx,clipped.dz,radius);
          return {...result,blocked:result.blocked||!!clipped.blocked};
        },
        hasLineOfSight:(a,b)=>getNav().hasLineOfSight(a,b),
        nextWaypoint:(from,to,owner)=>getNav().nextWaypoint(from,to,owner),
        get stats(){return nav?{...nav.stats}:{gridBuilds:0,nodes:0,searches:0,cachedPaths:0};},
      };
      rooms.set(plan.id,room);current=plan.id;prune(units);return room;
    },
    leave(){if(current&&rooms.has(current))rooms.get(current).playerInside=false;current=null;},
    get current(){return rooms.get(current)||null;},
    resolve:id=>rooms.get(id)||null,
    prune,
    clear(){rooms.clear();current=null;},
    snapshot(){return Object.freeze([...rooms.values()].map(room=>Object.freeze({id:room.id,safehouse:room.safehouse,known:room.known,playerInside:room.playerInside,stats:Object.freeze(room.stats)})));},
  };
}
