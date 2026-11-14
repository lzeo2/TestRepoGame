// Transient original cast. Campaign remains the sole owner of stages and rewards.
const HEROES = Object.freeze(['student','corporate','basement']);
const EMPTY = Object.freeze([]), RADIUS = .32;
const LINES = Object.freeze({
  student: 'Kit: These delivery stickers all carry the same depot code.',
  corporate: 'Rowan: My missing presentation has finally produced useful paperwork.',
  basement: 'Milo: Three receipts. Going outside was suspiciously productive.'
});
const point = value => value && Number.isFinite(value.x) && Number.isFinite(value.z);
function projection(x,z,a,b) {
  const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(length*length||1)));
  return {x:a[0]+dx*t,z:a[1]+dz*t,dx:dx/(length||1),dz:dz/(length||1),length,t};
}
export function createCampaignScenes(map, simulation) {
  const kingston=map.landmarks?.find(place=>place.id==='kingston');
  const segments=[];
  for(const road of map.roads||[]) {
    if(['private','no'].includes(road.sourceTags?.access)||road.sourceTags?.foot==='no'||!['residential','tertiary','secondary','living_street','service','footway','path','pedestrian'].includes(road.type))continue;
    for(let i=1;i<road.points.length;i++)segments.push({road,a:road.points[i-1],b:road.points[i]});
  }
  let people=EMPTY, dialogueLines=EMPTY, signature='', elapsed=0;
  function clear(){people=EMPTY;dialogueLines=EMPTY;signature='';elapsed=0;}
  function candidates(goal) {
    const found=[];
    for(const {road,a,b} of segments) {
      const q=projection(goal.x,goal.z,a,b), pedestrian=['footway','path','pedestrian'].includes(road.type);
      if(q.length<2||Math.hypot(goal.x-q.x,goal.z-q.z)>20)continue;
      for(const along of [0,-2,2,-4,4])for(const side of [-1,1])for(const extra of [1,1.7,2.4]) {
        const offset=pedestrian?0:(road.width||5)/2+extra;
        const x=q.x+q.dx*along-q.dz*offset*side,z=q.z+q.dz*along+q.dx*offset*side;
        if(Math.hypot(x-goal.x,z-goal.z)>Math.min(12,(goal.radius||16)-RADIUS))continue;
        const on=projection(x,z,a,b);
        if(on.t<=.01||on.t>=.99)continue;
        // A source roadside must also avoid the carriageway of crossing roads.
        if(segments.some(segment=>!['footway','path','pedestrian'].includes(segment.road.type)&&Math.hypot(x-projection(x,z,segment.a,segment.b).x,z-projection(x,z,segment.a,segment.b).z)<(segment.road.width||5)/2+RADIUS+.15))continue;
        found.push({x,z,yaw:Math.atan2(goal.x-x,goal.z-z)+Math.PI,sourceRoadId:String(road.id)});
      }
    }
    return found.sort((a,b)=>Math.hypot(a.x-goal.x,a.z-goal.z)-Math.hypot(b.x-goal.x,b.z-goal.z));
  }
  function clearPosition(candidate,id) {
    if(!simulation.canOccupy({...candidate,id},{length:1,width:.8,ignorePersonId:id}))return false;
    // Verify an actual short foot sweep in both directions, using temporary actors only.
    for(const sign of [-1,1]) {
      const actor={...candidate,id}, result=simulation.moveActor(actor,sign*.08,0,RADIUS);
      if(result.blocked||Math.abs(actor.x-candidate.x-sign*.08)>1e-6||Math.abs(actor.z-candidate.z)>1e-6)return false;
    }
    return true;
  }
  // Choose an authored public approach from a source road, never the landmark's
  // schematic centre, which can fall inside an opaque source building.
  let meetingPoint=null;
  if(point(kingston)) {
    const nearby=segments.map(segment=>({...segment,q:projection(kingston.x,kingston.z,segment.a,segment.b)}))
      .filter(({q})=>Math.hypot(q.x-kingston.x,q.z-kingston.z)<60)
      .sort((a,b)=>Math.hypot(a.q.x-kingston.x,a.q.z-kingston.z)-Math.hypot(b.q.x-kingston.x,b.q.z-kingston.z));
    for(const {road,q} of nearby) {
      for(const side of [-1,1]) {
        const offset=(road.width||5)/2+1.2;
        const goal={x:q.x-q.dz*offset*side,z:q.z+q.dx*offset*side,radius:16};
        if(!clearPosition({...goal,yaw:0},'campaign-meeting-approach'))continue;
        const options=candidates(goal), selected=[];
        for(const candidate of options) {
          if(selected.every(other=>Math.hypot(candidate.x-other.x,candidate.z-other.z)>=1.2)&&clearPosition(candidate,'campaign-placement'))selected.push(candidate);
          if(selected.length===2)break;
        }
        if(selected.length>=2){meetingPoint=Object.freeze({x:goal.x,z:goal.z,name:'Kingston public approach'});break;}
      }
      if(meetingPoint)break;
    }
  }
  function update(ctx={},dt=0) {
    const mission=ctx.mission, goal=mission?.target;
    if(ctx.mode!=='campaign'||ctx.recovery||ctx.recovering||ctx.interior||mission?.id!=='three-receipts'||mission.stage!==0||!HEROES.includes(ctx.character)||!point(goal)||!point(kingston)||Math.hypot(goal.x-kingston.x,goal.z-kingston.z)>80){clear();return;}
    if(ctx.paused)return;
    const key=`${ctx.character}:${goal.x}:${goal.z}`;
    if(signature!==key) {
      signature=key;elapsed=0;const selected=[];
      for(const hero of HEROES.filter(id=>id!==ctx.character)) {
        const id=`campaign-meeting:${hero}`;
        const candidate=candidates(goal).find(p=>selected.every(other=>Math.hypot(p.x-other.x,p.z-other.z)>=1.2)&&(!point(ctx.pose)||Math.hypot(p.x-ctx.pose.x,p.z-ctx.pose.z)>=1)&&clearPosition(p,id));
        if(candidate)selected.push(Object.freeze({...candidate,id,appearanceId:`player:${hero}`,radius:RADIUS,active:true,gesturePhase:0}));
      }
      people=Object.freeze(selected);dialogueLines=Object.freeze(selected.map(person=>LINES[person.appearanceId.slice(7)]));
    }
    if(!Number.isFinite(dt)||dt<=0)return;
    elapsed+=Math.min(.1,dt);
    people=Object.freeze(people.map(person=>Object.freeze({...person,gesturePhase:elapsed})));
  }
  function clipMovement(actor,dx,dz,radius=.45) {
    if(![actor?.x,actor?.z,dx,dz,radius].every(Number.isFinite))return {dx:0,dz:0,blocked:false};
    const reach=Math.max(0,Math.min(4,radius))+RADIUS+.02;
    let x=actor.x,z=actor.z,rx=dx,rz=dz,blocked=false;
    for(let iteration=0;iteration<4;iteration++) {
      const length2=rx*rx+rz*rz;if(length2<1e-12)break;
      let first=1,hit=null;
      for(const person of people) {
        if(person.id===actor.id||person.active===false)continue;
        const ox=x-person.x,oz=z-person.z,dot=ox*rx+oz*rz,c=ox*ox+oz*oz-reach*reach;
        if(dot>=0)continue;
        const discriminant=dot*dot-length2*c;if(discriminant<0)continue;
        const t=c<=0?0:(-dot-Math.sqrt(discriminant))/length2;
        if(t>=0&&t<=first){first=t;hit=person;}
      }
      if(!hit){x+=rx;z+=rz;break;}
      blocked=true;const t=Math.max(0,first-.001/Math.sqrt(length2));
      x+=rx*t;z+=rz*t;rx*=1-t;rz*=1-t;
      const nx=x-hit.x,nz=z-hit.z,length=Math.hypot(nx,nz)||1,inward=(rx*nx+rz*nz)/length;
      if(inward<0){rx-=nx/length*inward;rz-=nz/length*inward;}
    }
    return {dx:x-actor.x,dz:z-actor.z,blocked};
  }
  return {update,clear,clipMovement,meetingPoint,get people(){return people;},get dialogueLines(){return dialogueLines;}};
}
