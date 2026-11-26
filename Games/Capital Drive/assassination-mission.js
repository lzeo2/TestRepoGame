import { roadProfile } from './road-network.js';

export const ASSASSINATION_MISSION_ID = 'blackthorn-account';
export const ASSASSINATION_TARGET_ID = 'blackthorn-voss';
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const PUBLIC = new Set(['residential', 'living_street', 'tertiary', 'secondary', 'unclassified']);

export function createAssassinationCompound(origin,extraction,{road='',sourceRoad=''}={}) {
  const c=Math.cos(origin.yaw),s=Math.sin(origin.yaw);
  const point=(x,z)=>({x:origin.x+c*x+s*z,z:origin.z-s*x+c*z,yaw:origin.yaw});
  const prop=(id,kind,x,z,width,depth,height,color)=>({id:`blackthorn-${id}`,kind,...point(x,z),width,depth,height,color});
  const front={id:'blackthorn-front',label:'Public front gate',...point(0,-1.5),radius:2,
    path:[point(0,-2),point(0,2.8),point(0,5.6)]};
  const service={id:'blackthorn-service',label:'Service side passage',...point(-6.3,3),radius:2,
    path:[point(-7.2,-2),point(-7.2,3),point(-3.5,3),point(-1.6,5.5)]};
  const uniform={id:'blackthorn-uniform',kind:'uniform',label:'Collection crew uniform',...point(-6.1,.1),radius:1.4};
  const distraction={id:'blackthorn-distraction',kind:'distraction',label:'Generator radio distraction',...point(-6.1,4.8),radius:1.4};
  const rearStop={...point(-1.6,6.6),yaw:origin.yaw-Math.PI/2};
  const stealth={guardPost:point(2.4,3),patrol:[point(-1.6,5.5),point(1.6,5.5),point(1.6,6.6),rearStop],
    uniform,distraction,investigate:point(-3.5,3),diversionApproach:point(-2.55,6.6),
    restrictedPolygon:[[-4.8,0],[4.8,0],[4.8,7.8],[-4.8,7.8]].map(([x,z])=>{const p=point(x,z);return [p.x,p.z];})};
  return freeze({id:'blackthorn-yard',name:'Blackthorn collection yard',origin:{...origin},width:10,depth:8,
    sourceRoad,road,fictional:true,approaches:{front,service},landmarks:{uniform,distraction},stealth,
    extraction:{...extraction,id:'blackthorn-extraction',label:'Separate verge pickup',radius:4},
    props:[
      prop('front-west-screen','screen',-3.2,0,3.2,.18,1.9,0x69746c),
      prop('front-east-screen','screen',3.2,0,3.2,.18,1.9,0x69746c),
      prop('west-front-screen','screen',-4.8,.8,.18,1.6,1.9,0x69746c),
      prop('west-rear-screen','screen',-4.8,6.15,.18,3.3,1.9,0x69746c),
      prop('east-screen','screen',4.8,4,.18,8,1.9,0x69746c),
      prop('rear-screen','screen',0,7.8,9.6,.18,1.9,0x69746c),
      prop('guard-booth','guard-booth',3.3,1.4,2.2,2.1,2.5,0x7c8074),
      prop('east-crate','crate',3.6,5.9,1.1,1.2,.85,0x6c776e),
      prop('uniform-rack','uniform-rack',-6.1,1.45,.8,.5,1.6,0x405e7b),
      prop('generator-radio','distraction-radio',-6.1,6.1,1,.7,1.1,0x9b7843),
    ]});
}

// A fictional temporary compound on checked open ground, never a real tenancy or surveyed layout.
export function createAssassinationChapter(map, { canStand = () => false, hasLineOfSight = () => false, nearestRoad,canTraverse } = {}) {
  const anchor = map?.landmarks?.find(p => p.id === 'kingston');
  if (!finite(anchor)) return null;
  const candidates = [];
  for (const road of map.roads || []) {
    if (!PUBLIC.has(road.type) || !road.name || road.bridge || road.tunnel || ['private', 'no'].includes(road.sourceTags?.access)) continue;
    const half = roadProfile(road).driveWidth / 2;
    for (let i = 1; i < road.points.length; i++) {
      const a = road.points[i - 1], b = road.points[i], dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < 65) continue;
      for (const t of [.25, .5, .75]) for (const side of [-1, 1]) {
        const tangentX = dx / length, tangentZ = dz / length, nx = -tangentZ * side, nz = tangentX * side;
        const street = { x: a[0] + dx * t, z: a[1] + dz * t };
        const origin = { x: street.x + nx * (half + 7), z: street.z + nz * (half + 7), yaw: Math.atan2(nx, nz) };
        const distance = Math.hypot(origin.x - anchor.x, origin.z - anchor.z);
        const exitT = t + (t < .5 ? 1 : -1) * 40 / length;
        if (distance > 210 || exitT < .05 || exitT > .95) continue;
        const exit = { x: a[0] + dx * exitT + nx * (half + 5.5), z: a[1] + dz * exitT + nz * (half + 5.5) };
        candidates.push({ origin, street, exit, distance, road: road.name, sourceRoad: road.sourceId || road.id });
      }
    }
  }
  candidates.sort((a, b) => a.distance - b.distance || a.origin.x - b.origin.x || a.origin.z - b.origin.z);
  for (const candidate of candidates.slice(0, 160)) {
    const { origin, street, exit } = candidate, c = Math.cos(origin.yaw), s = Math.sin(origin.yaw);
    const point = (x, z) => ({ x: origin.x + c * x + s * z, z: origin.z - s * x + c * z, yaw: origin.yaw });
    const approach = point(0, -1.5), target = point(0, 5.6);
    const compound=createAssassinationCompound(origin,exit,candidate);
    const paths=[compound.approaches.front.path,compound.approaches.service.path,
      [point(-7.2,-2),approach,exit],compound.stealth.patrol.concat(compound.stealth.patrol[0]),
      [compound.approaches.service.path[2],compound.stealth.diversionApproach]];
    const probes = [-7.7,-5,0,5].flatMap(x => [0,4,8].map(z => point(x,z)));
    probes.push(approach, exit, ...[-1, 1].map(x => point(x, 4.8)));
    for (let i = 1; i < 12; i++) probes.push({ x: approach.x + (exit.x - approach.x) * i / 12, z: approach.z + (exit.z - approach.z) * i / 12 });
    if (!probes.every(p => canStand(p))) continue;
    if (nearestRoad && probes.some(p => {
      const near = nearestRoad(p.x, p.z);
      return near && near.distance < roadProfile(near.road).driveWidth / 2 + 2;
    })) continue;
    if (!hasLineOfSight(street, approach) || !hasLineOfSight(approach, target)) continue;
    const clearPath=path=>path.slice(1).every((to,index)=>{
      const from=path[index];
      if(typeof canTraverse==='function') {
        const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/4));
        return Array.from({length:steps},(_,i)=>[
          {x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps},
          {x:from.x+(to.x-from.x)*(i+1)/steps,z:from.z+(to.z-from.z)*(i+1)/steps},
        ]).every(([a,b])=>canTraverse(a,b,.45)===true);
      }
      const steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.z-from.z)/.4));
      return Array.from({length:steps+1},(_,i)=>({x:from.x+(to.x-from.x)*i/steps,z:from.z+(to.z-from.z)*i/steps})).every(canStand);
    });
    if(!paths.every(clearPath)||![compound.stealth.uniform,compound.stealth.distraction,compound.stealth.guardPost].every(canStand))continue;
    return freeze({ id: ASSASSINATION_MISSION_ID, name: 'The Blackthorn account', contact: 'Mara', optional: true,
      assassination: true, combat: true, reward: 2600, time: 900, compound,
      briefing: `Adrian Voss patrols a fictional collection yard beside ${candidate.road}. The side passage has a worker disguise and a radio to distract the guard. Crouch behind Voss for a silent takedown, or fight him. Get out through the separate pickup.`,
      outro: 'Mara: Voss is dead. You cleared the yard and the search. The Blackthorn account is closed.',
      cutscene: { id: ASSASSINATION_MISSION_ID, title: 'The Blackthorn account', lines: [
        { speaker: 'Mara', text: 'Adrian Voss runs the Blackthorn extortion crew. He is meeting his collectors at their temporary yard.', duration: 4 },
        { speaker: 'Mara', text: 'The side passage has workwear and a radio. Keep your weapon stowed. Voss patrols the rear aisle.', duration: 5 },
        { speaker: 'Mara', text: 'Get behind him for a quiet takedown. Then get to the pickup and lose any police following you.', duration: 4 },
      ] },
      stages: [
        { ...approach, kind: 'foot',approaches:[compound.approaches.front,compound.approaches.service], radius: 3, hold: .5, clear: true, label: 'Reach the front gate or service passage on foot' },
        { ...target, kind: 'assassination', targetId: ASSASSINATION_TARGET_ID, targetName: 'Adrian Voss', appearanceId: 'contract:blackthorn-voss',
          radius: 90, hold: 0, label: 'Eliminate Adrian Voss' },
        { ...exit, kind: 'escape', arriveOnFoot: true, radius: 4, hold: 1, clear: true, requireWanted: false,
          label: 'Reach the pickup on foot. Lose any police tail.' },
      ] });
  }
  return null;
}
