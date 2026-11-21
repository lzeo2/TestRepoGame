import { roadProfile } from './road-network.js';
import { projectSegment } from './simulation.js';

const separation = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const position = p => [p.x, p.z];
const localPoint = ({x,z,yaw}, dx, dz) => ({x:x + Math.cos(yaw)*dx - Math.sin(yaw)*dz, z:z + Math.sin(yaw)*dx + Math.cos(yaw)*dz});
const corners = (site, width, depth) => [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z]) => localPoint(site,x*width/2,z*depth/2));

function inside(point, polygon) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[i], [bx, bz] = polygon[j];
    if ((az > point.z) !== (bz > point.z) && point.x < (bx-ax)*(point.z-az)/(bz-az)+ax) result = !result;
  }
  return result;
}

// Leave a continuous drive-in corridor and the checked full-size car pose at
// the refill point. Roofs are overhead. Only the grounded parts become solids.
function planSite(bay, source, simulation, heightAt, retainedRoofs) {
  const approach = simulation.nearestRoad(bay.x, bay.z);
  if (!approach) return null;
  const yaw = approach.distance > .5 ? Math.atan2(approach.x-bay.x,bay.z-approach.z) : -bay.yaw;
  const origin = {...bay,yaw};
  const nearRoads = simulation.graph.segments.filter(({a,b}) => Math.max(a[0],b[0]) >= bay.x-24 && Math.min(a[0],b[0]) <= bay.x+24 &&
    Math.max(a[1],b[1]) >= bay.z-24 && Math.min(a[1],b[1]) <= bay.z+24)
    .map(segment => ({...segment, edge:roadProfile(segment.road).driveWidth/2}));
  const roadClear = (p, margin, overhead = false) => nearRoads.every(road => (overhead && road.road.type === 'service') ||
    projectSegment(p.x,p.z,road.a,road.b).distance > road.edge + margin);
  const parkedAxis = [-1.55,1.55].map(t=>[bay.x-Math.sin(bay.yaw)*t,bay.z-Math.cos(bay.yaw)*t]);
  const parksClear = (p, radius) => projectSegment(p.x,p.z,...parkedAxis).distance > 1.25+radius;
  const approachClear = (p, radius) => projectSegment(p.x,p.z,position(approach),position(bay)).distance > 1.75+radius;
  const groundClear = (p, radius) => Number.isFinite(heightAt(p.x,p.z)) && simulation.canOccupy({...p,yaw:0}, {length:1,width:Math.max(.5,radius*2),ignoreId:'player'});
  const used = [];
  const checkProp = (p, width, depth) => {
    const radius = Math.hypot(width,depth)/2;
    return roadClear(p,radius+.15) && parksClear(p,radius) && approachClear(p,radius) && groundClear(p,radius) &&
      used.every(other => separation(p,other) > radius+Math.hypot(other.width,other.depth)/2+.15);
  };
  const sourceRoof = source.canopy;
  const retained = sourceRoof?.existingRoofIds?.map(id=>retainedRoofs.get(id)).find(Boolean);
  let canopy = null;
  if (retained && separation(sourceRoof,bay)<9) {
    // Match the height of the retained flat roof in world-view.js.
    const roofBase = Math.max(...retained.points.map(([x,z]) => heightAt(x,z))) + .12 + Math.max(2.5,Math.min(50,Number(retained.height)||3.8));
    const candidates = [];
    for (const dx of [-4,-3,-2,2,3,4]) for (const dz of [-2,2,-3,3]) {
      const foot = localPoint(sourceRoof,dx,dz);
      if (roofBase-heightAt(foot.x,foot.z)>2.5 && corners({...foot,yaw:sourceRoof.yaw},.4,.4).every(p=>inside(p,retained.points)) && checkProp(foot,.36,.36)) candidates.push(foot);
    }
    const first = candidates[0], second = first && candidates.find(foot => separation(first,foot) > 3);
    if (second) {
      const projected = sourceRoof.points.map(([x,z]) => localPoint({x:0,z:0,yaw:-sourceRoof.yaw},x-sourceRoof.x,z-sourceRoof.z));
      const span = axis => Math.max(...projected.map(p=>p[axis]))-Math.min(...projected.map(p=>p[axis]));
      canopy = {...sourceRoof,width:span('x'),depth:span('z'),roofBase,existing:true,feet:[first,second].map(foot=>({...foot,width:.36,depth:.36}))};
    }
  }
  if (!canopy) {
    // On a tightly mapped lot the canopy can sit to either side of the bay,
    // with the roof cantilevered from the outside, leaving the parking aisle open.
    const layouts = [[0,0,5.2,6.4],[0,.65,4.6,5.6],[-2.5,.3,3.2,5.6],[2.5,.3,3.2,5.6],[-2.2,1,2.6,4.2],[2.2,1,2.6,4.2]];
    for (const dx of [-3.2,3.2,-4.3,4.3,-5.2,5.2]) for (const dz of [0,2,-2,4,-3,6]) layouts.push([dx,dz,2.5,4]);
    for (const angle of [0,Math.PI/2,Math.PI/4]) for (const dx of [-2.5,2.5,-3.7,3.7,-4.7,4.7]) for (const dz of [0,1.5,-1.5,3,-3,5]) layouts.push([dx,dz,2.2,3.55,angle]);
    for (const [dx,dz,width,depth,angle = 0] of layouts) {
      const roof = {...localPoint(origin,dx,dz),yaw:yaw+angle};
      const pts = corners(roof,width,depth);
      if (!roadClear(roof,0,true) || !pts.every(p => roadClear(p,0,true) && groundClear(p,.25)) ||
          !pts.every((p,i) => simulation.hasLineOfSight(p,pts[(i+1)%pts.length]))) continue;
      const sides = [-1,1].map(side => [-1,1].map(end => localPoint(roof,side*(width/2-.19),end*(depth/2-.23))));
      const feet = sides.flat().filter(foot => checkProp(foot,.36,.36));
      if (feet.length < 2 || !feet.some(foot=>separation(feet[0],foot)>2.6)) continue;
      const roofBase = Math.max(...[roof,...feet].map(p=>heightAt(p.x,p.z)))+4.2;
      if (!Number.isFinite(roofBase)) continue;
      canopy = {...roof,width,depth,roofBase,feet:feet.map(foot=>({...foot,width:.36,depth:.36}))};
      break;
    }
  }
  if (canopy) used.push(...canopy.feet);

  const pumps = [];
  for (const side of [-1,1]) {
    const points = [0,1.6,-1.6,2.6].flatMap(dz => [2.3,2.85,3.4].map(dx=>localPoint(origin,side*dx,dz)));
    const pump = points.find(p=>checkProp(p,.88,.56));
    if (pump) {
      const fixture = {...pump,yaw,width:.88,depth:.56};
      pumps.push(fixture); used.push(fixture);
    }
  }
  const signPoints = [-2.6,-1.5,0,1.5,2.8].flatMap(dz => [-3.8,3.8,-3,3,-4.6,4.6].map(dx=>localPoint(origin,dx,dz)));
  const sign = [Math.PI/3,-Math.PI/3,0].flatMap(angle=>signPoints.map(p=>({...p,yaw:yaw+angle})))
    .find(p=>checkProp(p,.42,.42) && corners(p,2.55,.42).every(c=>roadClear(c,0)&&Number.isFinite(heightAt(c.x,c.z))));

  // Keep the compact pad around the checked parking pose, clipping complete
  // tiles at roads and buildings so the paving never competes with their faces.
  const paving = [], tileSize = 1.42;
  for (let x = -2; x <= 2; x++) for (let z = -2; z <= 2; z++) {
    const tile = {...localPoint(bay,x*tileSize,z*tileSize),yaw:bay.yaw,width:tileSize,depth:tileSize};
    const outline = corners(tile,tileSize,tileSize);
    if ([tile,...outline].every(p=>roadClear(p,.12) && groundClear(p,.18)) &&
        outline.every((p,i)=>simulation.hasLineOfSight(p,outline[(i+1)%outline.length]))) paving.push(tile);
  }
  return { id:bay.id, canopy, pumps, paving, sign:sign?{...sign,width:.42,depth:.42}:null };
}

export function buildPetrolForecourts(nitroStations, sources, simulation, heightAt, buildings = []) {
  const byId = new Map(sources.map(source=>[source.id,source]));
  const retainedRoofs = new Map(buildings.filter(building=>building.type==='roof'&&building.points?.length>=3).map(roof=>[roof.id,roof]));
  const sites = [], barriers = [];
  for (const bay of nitroStations) {
    const source = byId.get(bay.id);
    if (source?.category !== 'petrol') continue;
    const site = planSite(bay,source,simulation,heightAt,retainedRoofs);
    if (!site) continue;
    sites.push(site);
    const supports = (site.canopy?.feet||[]).map(part=>({...part,yaw:site.canopy.yaw,height:site.canopy.roofBase-heightAt(part.x,part.z)}));
    const pumps = site.pumps.map(part=>({...part,height:1.52}));
    const parts = [...supports,...pumps,...(site.sign?[{...site.sign,height:3.2}]:[])];
    for (const [index,part] of parts.entries()) barriers.push({
      id:`${site.id}-forecourt-${index}`,type:'petrol-fixture',height:part.height,
      points:corners(part,part.width,part.depth).map(position),
    });
  }
  return {sites,barriers};
}
