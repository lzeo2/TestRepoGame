import {createInteriorNavigation} from './interior-navigation.js';

const point=p=>p&&[p.x,p.z].every(Number.isFinite);
const copy=p=>Object.freeze({x:p.x,z:p.z,yaw:Number.isFinite(p.yaw)?p.yaw:0});
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
      const room={id:plan.id,safehouse:!!safehouse,known:!!known,playerInside:true,
        outside:copy(outside),approach:Object.freeze([...approach.filter(point),outside].map(copy)),inside:copy(plan.spawn),exit:copy(plan.exit),floorY:plan.floorY,
        contains(p){
          if(!point(p))return false;
          const c=Math.cos(plan.origin.yaw),s=Math.sin(plan.origin.yaw),x=p.x-plan.origin.x,z=p.z-plan.origin.z;
          return Math.abs(c*x-s*z)<plan.width/2&&s*x+c*z>0&&s*x+c*z<plan.depth;
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
