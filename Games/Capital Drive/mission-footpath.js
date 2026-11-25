const finite=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const gap=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const copy=p=>Object.freeze({x:p.x,z:p.z});

// Simulation caps one requested move at 8m. Chain short real sweeps and verify
// each destination so a cap or partial slide cannot masquerade as clearance.
export function createFootTraversal(moveActor){
  return function canTraverse(from,to,radius=.45){
    if(typeof moveActor!=='function'||!finite(from)||!finite(to))return false;
    const actor={...from},distance=gap(from,to),steps=Math.max(1,Math.ceil(distance/4));
    if(steps>20)return false;
    for(let i=1;i<=steps;i++){
      const x=from.x+(to.x-from.x)*i/steps,z=from.z+(to.z-from.z)*i/steps;
      const result=moveActor(actor,x-actor.x,z-actor.z,radius);
      if(result?.blocked||Math.hypot(actor.x-x,actor.z-z)>.02)return false;
    }
    return true;
  };
}

// Read-only, local door guidance. The injected swept movement query owns real
// clearance; this helper cannot move a body or complete a mission objective.
export function createMissionFootpath({canTraverse}={}){
  let cached=null;
  const stats={plans:0,probes:0};
  function clear(a,b){stats.probes++;return canTraverse(Object.freeze({...a}),copy(b),.45)===true;}
  function guide(dto,{pose,onFoot=false,indoors=false,stage='',obstructionRevision=0,blocked=false}={}){
    if(typeof canTraverse!=='function'||!dto?.entryId||dto.indoors||indoors||!onFoot||!finite(dto.point)||!finite(pose)||gap(pose,dto.point)>32){cached=null;return dto;}
    const target=dto.point,key=`${dto.entryId}:${target.x}:${target.z}:${String(stage)}:${String(obstructionRevision)}`;
    if(!cached||cached.key!==key||blocked||gap(pose,cached.origin)>=2||(cached.waypoint&&gap(pose,cached.waypoint)<.9)){
      stats.plans++;
      cached={key,origin:copy(pose),waypoint:null};
      if(!clear(pose,target)){
        const dx=target.x-pose.x,dz=target.z-pose.z,length=gap(pose,target),ux=dx/length,uz=dz/length,candidates=[];
        // Axis elbows help a person step past a parked car or follow a fence.
        // Local side offsets also cover diagonal source facades without a grid.
        for(const offset of [-4,0,4])candidates.push({x:pose.x,z:target.z+offset},{x:target.x+offset,z:pose.z});
        for(const t of [.5,1])for(const side of [-6,-3,3,6])candidates.push({x:pose.x+dx*t-uz*side,z:pose.z+dz*t+ux*side});
        candidates.sort((a,b)=>gap(pose,a)+gap(a,target)-gap(pose,b)-gap(b,target));
        for(const point of candidates){
          if(gap(pose,point)<1||gap(point,target)<1||gap(pose,point)+gap(point,target)>length+20)continue;
          if(clear(pose,point)&&clear({...pose,...point},target)){cached.waypoint=copy(point);break;}
        }
      }
    }
    if(!cached.waypoint)return dto;
    return Object.freeze({...dto,point:cached.waypoint,doorPoint:copy(target),distance:gap(pose,cached.waypoint),footpath:true,
      instruction:'Follow the clear path around the obstacle to the door.'});
  }
  return {guide,reset(){cached=null;},get stats(){return Object.freeze({...stats});}};
}
