// Shared metres/elevation authority. Source contour grids stay immutable.
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, fraction) => a + (b - a) * fraction;

function validGrid(grid) {
  return grid?.cols > 1 && grid?.rows > 1 && grid.maxX > grid.minX && grid.maxZ > grid.minZ &&
    grid.heights?.length === grid.cols * grid.rows;
}

function inside(grid, x, z) {
  return x >= grid.minX && x <= grid.maxX && z >= grid.minZ && z <= grid.maxZ;
}

function sample(grid, x, z) {
  const tx = clamp((x - grid.minX) / (grid.maxX - grid.minX), 0, 1) * (grid.cols - 1);
  const tz = clamp((z - grid.minZ) / (grid.maxZ - grid.minZ), 0, 1) * (grid.rows - 1);
  const ix = Math.min(grid.cols - 2, Math.floor(tx));
  const iz = Math.min(grid.rows - 2, Math.floor(tz));
  const fx = tx - ix, fz = tz - iz, offset = iz * grid.cols + ix;
  return lerp(lerp(grid.heights[offset], grid.heights[offset + 1], fx),
    lerp(grid.heights[offset + grid.cols], grid.heights[offset + grid.cols + 1], fx), fz);
}

// Confirmed OSM grade-separated road pairs in the retained source snapshots.
// X/Z and direction remain source geometry. Five metres is an authored game
// clearance estimate, not a surveyed structure or legal vehicle-height limit.
export const BRIDGE_CLEARANCE_SITES=Object.freeze([
  {name:'Gungahlin Drive',over:['5046256','72525397'],under:['782482615','668279727','489194325']},
  {name:'Gungahlin Drive',over:['73028188','5638253'],under:['668268023','668268012']},
  {name:'Kent Street',over:['667672050','1136952546'],under:['183083401','77004916']},
  {name:'Barry Drive',over:['53537161','53537162'],under:['192541793']},
  {name:'Carruthers Street',over:['26661928','50856748'],under:['668406211','546708907']},
  {name:'Cotter Road Offramp',over:['26651010'],under:['77004917','73011078']},
  {name:'Cotter Road',over:['10277907','10277901'],under:['26662181','75858653']},
  {name:'Tuggeranong Parkway',over:['24985048','75500315'],under:['75508758']},
  {name:'Glenloch Interchange',over:['24147667','73232298','24241635','24241648','73316086','172274879'],
    under:['669690422','24145489','996503653']},
  {name:'Glenloch Interchange',over:['1124045979','1124045980'],under:['294434708']},
  {name:'Lady Denman Drive',over:['76997565'],under:[],waterClearance:2.5},
].map(site=>Object.freeze({...site,over:Object.freeze(site.over.map(id=>`way/${id}`)),under:Object.freeze(site.under.map(id=>`way/${id}`))})));
const RAMP=160,CLEARANCE=5,key=p=>`${p[0]},${p[1]}`;
const tagged=r=>Boolean(r.sourceTags?.bridge&&r.sourceTags.bridge!=='no');
const source=r=>r.sourceId||`way/${String(r.id).split('-')[0]}`;

function crossing(a,b,c,d){
  const dx=b[0]-a[0],dz=b[1]-a[1],ex=d[0]-c[0],ez=d[1]-c[1],cross=dx*ez-dz*ex;
  if(Math.abs(cross)<1e-8)return null;
  const px=c[0]-a[0],pz=c[1]-a[1],u=(px*ez-pz*ex)/cross,v=(px*dz-pz*dx)/cross;
  return u>1e-6&&u<1-1e-6&&v>=0&&v<=1?[a[0]+u*dx,a[1]+u*dz]:null;
}
const LAKE_UNDER_ROADS = {
  'Commonwealth Avenue': new Set(['way/1089981018','way/23035340','way/5640616']),
  'Kings Avenue': new Set(['way/4844798','way/673080483']),
};

function prepareBridgeClearance(roads,deckRoads,{groundHeightAt,deckHeightAt,lakeWaterLevel,additionalSites = [],lakeSites = [],lakeFields}){
  const bySource=new Map(),lifts=new Map(),ramps=new Map(),crossings=[];
  for(const road of roads){const id=source(road);if(!bySource.has(id))bySource.set(id,[]);bySource.get(id).push(road);}
  const deckIds=new Set(deckRoads.map(r=>r.id));
  for(const site of [...BRIDGE_CLEARANCE_SITES,...lakeSites,...additionalSites]){
    const upper=site.lakeRoads||site.over.flatMap(id=>bySource.get(id)||[]).filter(road=>tagged(road)&&!lakeFields.has(road.id));
    const lower=site.under.flatMap(id=>bySource.get(id)||[]).filter(r=>!tagged(r));
    const verifyLayer=additionalSites.includes(site);
    let lift=site.lakeLift||0;
    // These coarse terrain cells sample the dam slope beneath the roadway.
    // Grade the named road corridor from a continuous deck above the lake.
    if(site.waterClearance)for(const road of upper)for(const point of road.points){
      const baseline=deckHeightAt(road,...point);
      if(Number.isFinite(baseline))lift=Math.max(lift,lakeWaterLevel+site.waterClearance-baseline);
    }
    for(const over of upper)for(const under of lower)for(let i=1;i<over.points.length;i++)for(let j=1;j<under.points.length;j++){
      if(verifyLayer&&!(Number(over.sourceTags?.layer)>Number(under.sourceTags?.layer||0)))continue;
      const p=crossing(over.points[i-1],over.points[i],under.points[j-1],under.points[j]);if(!p)continue;
      const baseline=deckHeightAt(over,...p);if(!Number.isFinite(baseline))continue;
      // A lower road can itself approach a separate raised deck, as at the
      // Glenloch slips. Use its established paved support at the crossing.
      const lowerSupport=rampHeightAt(under,...p);lift=Math.max(lift,lowerSupport+CLEARANCE-baseline);
      crossings.push(Object.freeze({over:source(over),under:source(under),x:p[0],z:p[1],clearance:CLEARANCE}));
    }
    if(lift<=0||!upper.length)continue;
    // Connected bridge joints in this same named corridor receive one lift.
    // Exact source nodes are the only connection rule; nearby roads never join.
    const affected=new Set(upper),points=new Set(upper.flatMap(r=>r.points.map(key)));
    let changed=true;
    while(changed){changed=false;for(const road of deckRoads){
      if(affected.has(road)||road.name!==site.name||(!site.lakeRoads&&lakeFields.has(road.id))||!road.points.some(p=>points.has(key(p))))continue;
      affected.add(road);road.points.forEach(p=>points.add(key(p)));changed=true;
    }}
    for(const road of affected)lifts.set(road.id,Math.max(lifts.get(road.id)||0,lift));
    const pathNetwork=upper.some(road=>road.standalonePath);
    const network=roads.filter(r=>!deckIds.has(r.id)&&(r.name===site.name||pathNetwork&&r.standalonePath));
    const graph=new Map();
    for(const road of network)for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      for(const [p,q]of [[a,b],[b,a]]){const id=key(p);if(!graph.has(id))graph.set(id,[]);graph.get(id).push({id:key(q),length});}
    }
    const distances=new Map(),pending=new Set(),anchors=new Map();
    for(const road of affected)for(let i=0;i<road.points.length;i++){
      const p=road.points[i],id=key(p);
      if(!graph.has(id))continue;
      const field=site.lakeRoads&&lakeFields.get(road.id);
      if(field){
        const inner=road.points[i===0?1:i-1],dx=p[0]-inner[0],dz=p[1]-inner[1],span=Math.hypot(dx,dz)||1;
        anchors.set(id,{point:p,field,tx:dx/span,tz:dz/span});
      }
      distances.set(id,0);pending.add(id);
    }
    while(pending.size){
      let nearest,best=Infinity;for(const id of pending)if(distances.get(id)<best){best=distances.get(id);nearest=id;}
      pending.delete(nearest);if(best>=RAMP)continue;
      for(const edge of graph.get(nearest)||[]){const cost=best+edge.length;if(cost<(distances.get(edge.id)??Infinity)){distances.set(edge.id,cost);anchors.set(edge.id,anchors.get(nearest));if(cost<RAMP)pending.add(edge.id);}}
    }
    for(const road of network)for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],da=distances.get(key(a))??Infinity,db=distances.get(key(b))??Infinity;
      const reach=road.standalonePath?45:RAMP;
      if(Math.min(da,db)>=reach)continue;
      if(!ramps.has(road.id))ramps.set(road.id,[]);
      ramps.get(road.id).push({a,b,da,db,length:Math.hypot(b[0]-a[0],b[1]-a[1]),
        lift,anchorA:anchors.get(key(a)),anchorB:anchors.get(key(b)),reach});
    }
  }
  function rampHeightAt(road,x,z){
    const ground=groundHeightAt(x,z);let result=ground,nearest=Infinity;
    for(const s of ramps.get(road.id)||[]){
      const dx=s.b[0]-s.a[0],dz=s.b[1]-s.a[1],t=Math.max(0,Math.min(1,((x-s.a[0])*dx+(z-s.a[1])*dz)/(s.length*s.length||1)));
      const offset=Math.hypot(x-s.a[0]-dx*t,z-s.a[1]-dz*t);
      if(offset>(Number(road.width)||8)/2+3||offset>nearest+1e-6)continue;
      const fromA=s.da+t*s.length,fromB=s.db+(1-t)*s.length;
      const distance=Math.min(fromA,fromB);
      if(distance>=s.reach)continue;
      const f=distance/s.reach,weight=1-f*f*(3-2*f);
      // Join the deck's flat cross-section across lane and pavement width,
      // then return to the unchanged contour surface at the outer end.
      const px=s.a[0]+dx*t,pz=s.a[1]+dz*t;
      const anchor=fromA<=fromB?s.anchorA:s.anchorB;
      let raised;
      if(anchor){
        const [ax,az]=anchor.point;
        // At the joint, match the plane normal to the bridge even if the
        // approach immediately turns. Blend to the connected road distance.
        const outward=Math.max(0,(x-ax)*anchor.tx+(z-az)*anchor.tz);
        const phase=clamp(Math.max(outward,distance-10)/15,0,1);
        const blend=phase*phase*(3-2*phase);
        const travel=lerp(outward,distance,blend);
        const deck=lerp(anchor.field(x,z),anchor.field(ax+x-px,az+z-pz),blend)+s.lift;
        // Use absolute elevation to avoid double lifting an uphill bank.
        const tail=clamp((travel-s.reach*.7)/(s.reach*.3),0,1);
        raised=lerp(deck-travel*.045,ground,tail*tail*(3-2*tail));
      } else {
        const centre=groundHeightAt(px,pz);
        raised=ground+(s.lift+centre-ground)*weight;
      }
      if(offset<nearest-1e-6)result=ground;nearest=offset;
      result=Math.max(result,raised);
    }
    return result;
  }
  return {lift:road=>lifts.get(road.id)||0,hasRamp:road=>ramps.has(road.id),rampHeightAt,
    stats:Object.freeze({crossings:Object.freeze(crossings),raisedRoads:lifts.size,rampRoads:ramps.size,rampMetres:RAMP})};
}

/** map.terrain is the original grid; terrainTiles are separately sourced grids.
 * Optional bridgeDecks: [{roadId,heights:[y per source road point]}]. Heights are
 * authored deck estimates, never source contour samples. Only tagged bridge
 * roads receive a deck; no water polygon or surrounding land is raised.
 */
export function createTerrainSampler(map) {
  const base = validGrid(map.terrain) ? map.terrain : null;
  const tiles = (map.terrainTiles || []).filter(validGrid);
  const blendSources = new Map();
  for (let i = 0; i < tiles.length; i++) {
    const metres = tiles[i].blendPreviousMetres;
    if (Number.isFinite(metres) && metres > 0) {
      blendSources.set(tiles[i], { metres, grids: [...tiles.slice(0, i), ...(base ? [base] : [])] });
    }
  }
  function tileHeight(grid, x, z) {
    const value = sample(grid, x, z);
    if (grid !== base && base && inside(base, x, z) && Number.isFinite(grid.blendSouthZ) && Number.isFinite(grid.blendNorthZ)) {
      const fraction = clamp((grid.blendSouthZ - z) / (grid.blendSouthZ - grid.blendNorthZ), 0, 1);
      return lerp(sample(base, x, z), value, fraction * fraction * (3 - 2 * fraction));
    }
    return value;
  }
  function blendOutside(tile, x, z, { metres, grids }) {
    // A coarse extension must agree with the previous tile at its edge.
    // Keep the existing source untouched and blend only on the exterior.
    if (base && inside(base, x, z)) return sample(base, x, z);
    let nearest = null, distanceSquared = metres * metres, edgeX = x, edgeZ = z;
    for (const prior of grids) {
      const px = clamp(x, prior.minX, prior.maxX), pz = clamp(z, prior.minZ, prior.maxZ);
      const dx = x - px, dz = z - pz, candidate = dx * dx + dz * dz;
      if (candidate >= distanceSquared) continue;
      nearest = prior; distanceSquared = candidate; edgeX = px; edgeZ = pz;
    }
    const height = tileHeight(tile, x, z);
    if (!nearest) return height;
    const fraction = Math.sqrt(distanceSquared) / metres;
    const former = blendSources.get(nearest);
    const edge = former ? blendOutside(nearest, edgeX, edgeZ, former) : tileHeight(nearest, edgeX, edgeZ);
    return lerp(edge, height, fraction * fraction * (3 - 2 * fraction));
  }
  function groundHeightAt(x, z) {
    const tile = tiles.find(grid => inside(grid, x, z) && !(grid.preserveWestEdge && x === grid.minX));
    if (!tile) return base ? sample(base, x, z) : 0;
    const sources = blendSources.get(tile);
    return sources ? blendOutside(tile, x, z, sources) : tileHeight(tile, x, z);
  }

  // Fixed normal design level, not a live reading: NCA Scrivener Dam lists
  // 555.93m AHD. Deck clearance/profile above this level remains authored.
  const lakeWaterLevel = Number.isFinite(map.lakeWaterLevel) ? map.lakeWaterLevel : 5.93;
  const minimumLakeDeck = lakeWaterLevel + 2.5;
  const estimates = new Map((map.bridgeDecks || []).map(deck => [String(deck.roadId), deck.heights]));
  const tagged = road => {
    const value = road.sourceTags?.bridge ?? road.tags?.bridge ?? road.bridge;
    return value && value !== 'no';
  };
  const keyOf = point => `${point[0]},${point[1]}`;
  const roads = (map.roads || []).filter(road => road.points?.length > 1);
  const bridgeRoads = roads.filter(tagged);
  const bridgeEnds = new Set(bridgeRoads.flatMap(road => [keyOf(road.points[0]), keyOf(road.points.at(-1))]));
  // OSM bridge expansion joints can be separate short untagged ways. Include
  // only a direct connector whose two ends are already bridge abutment nodes.
  const connectors = roads.filter(road => !tagged(road) && bridgeEnds.has(keyOf(road.points[0])) &&
    bridgeEnds.has(keyOf(road.points.at(-1))) && road.points.slice(1).reduce((total, p, i) =>
      total + Math.hypot(p[0] - road.points[i][0], p[1] - road.points[i][1]), 0) <= 50);
  const deckRoads = [...bridgeRoads, ...connectors];
  const nodes = new Map();
  for (const road of deckRoads) for (let i = 0; i < road.points.length; i++) {
    const p = road.points[i], key = keyOf(p);
    if (!nodes.has(key)) nodes.set(key, { point: p, neighbours: new Map(), names: new Set() });
    nodes.get(key).names.add(road.name);
    if (i) {
      const previous = road.points[i - 1], other = keyOf(previous), distance = Math.hypot(p[0] - previous[0], p[1] - previous[1]);
      nodes.get(key).neighbours.set(other, distance);
      nodes.get(other).neighbours.set(key, distance);
    }
  }
  const nodeHeights = new Map(), nodeProfiles = new Map(), visited = new Set(), lakeComponents=[];
  for (const start of nodes.keys()) {
    if (visited.has(start)) continue;
    const component = [], queue = [start];
    visited.add(start);
    for (let i = 0; i < queue.length; i++) {
      const key = queue[i]; component.push(key);
      for (const next of nodes.get(key).neighbours.keys()) if (!visited.has(next)) { visited.add(next); queue.push(next); }
    }
    const ends = component.filter(key => nodes.get(key).neighbours.size === 1);
    const firstKey = ends[0] || component[0];
    const distances = new Map([[firstKey, 0]]), pending = new Set(component);
    // Tiny static bridge graphs; shortest distance preserves shared joint heights.
    while (pending.size) {
      let key, best = Infinity;
      for (const candidate of pending) if ((distances.get(candidate) ?? Infinity) < best) { key = candidate; best = distances.get(candidate); }
      if (key === undefined) break;
      pending.delete(key);
      for (const [next, distance] of nodes.get(key).neighbours) if (best + distance < (distances.get(next) ?? Infinity)) distances.set(next, best + distance);
    }
    const lastKey = component.reduce((a, b) => (distances.get(a) || 0) > (distances.get(b) || 0) ? a : b);
    const length = distances.get(lastKey) || 1;
    const lakeBridge = length > 200 && component.some(key => [...nodes.get(key).names].some(name => name === 'Kings Avenue' || name === 'Commonwealth Avenue'));
    const first = groundHeightAt(...nodes.get(firstKey).point), last = groundHeightAt(...nodes.get(lastKey).point);
    const arch=lakeBridge?1.2:0;
    if(lakeBridge)lakeComponents.push(deckRoads.filter(road=>road.points.some(point=>distances.has(keyOf(point)))));
    for (const key of component) {
      const t = (distances.get(key) || 0) / length;
      // A shallow authored deck estimate, not a claim of surveyed bridge levels.
      const y = lerp(first, last, t) + arch * 4 * t * (1 - t);
      nodeHeights.set(key, lakeBridge ? Math.max(minimumLakeDeck, y) : y);
      nodeProfiles.set(key, { t, first, last, lakeBridge, arch });
    }
  }
  // Close parallel source ways can describe the same physical lake deck.
  // Share one world-space profile without merging their logical road owners.
  const sectionRoads=[...new Set(lakeComponents.flat())],lakeGroups=[];
  const distanceTo=(p,a,b)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
    return Math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dz*t);
  };
  const overlaps=(a,b)=>{
    if(a.name!==b.name)return false;
    const radius=((Number(a.width)||7.5)+(Number(b.width)||7.5))/2;
    for(let i=1;i<a.points.length;i++)for(let j=1;j<b.points.length;j++)
      if(Math.min(distanceTo(a.points[i-1],b.points[j-1],b.points[j]),distanceTo(a.points[i],b.points[j-1],b.points[j]),
        distanceTo(b.points[j-1],a.points[i-1],a.points[i]),distanceTo(b.points[j],a.points[i-1],a.points[i]))<radius)return true;
    return false;
  };
  for(const road of sectionRoads){
    const connected=lakeGroups.filter(group=>group.some(other=>overlaps(road,other)));
    if(!connected.length)lakeGroups.push([road]);
    else{connected[0].push(road);for(const group of connected.slice(1)){connected[0].push(...group);lakeGroups.splice(lakeGroups.indexOf(group),1);}}
  }
  const lakeFields=new Map(),lakeSites=[];
  for(const group of lakeGroups){
    const points=group.flatMap(road=>road.points);let start=points[0],end=points[1],longest=0;
    for(const a of points)for(const b of points){const d=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d>longest){longest=d;start=a;end=b;}}
    const dx=end[0]-start[0],dz=end[1]-start[1],lengthSquared=dx*dx+dz*dz;
    const fraction=(x,z)=>clamp(((x-start[0])*dx+(z-start[1])*dz)/lengthSquared,0,1);
    const samples=[];let first=minimumLakeDeck,last=minimumLakeDeck,arch=1.2;
    for(const road of group)for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],sx=b[0]-a[0],sz=b[1]-a[1],span=Math.hypot(sx,sz);if(!span)continue;
      const radius=(Number(road.width)||7.5)/2+2,steps=Math.max(1,Math.ceil(span)),widthSteps=Math.ceil(radius*2);
      for(let j=0;j<=steps;j++)for(let cross=0;cross<=widthSteps;cross++){
        const side=cross/widthSteps*2-1;
        const u=j/steps,x=lerp(a[0],b[0],u)-sz/span*radius*side,z=lerp(a[1],b[1],u)+sx/span*radius*side;
        const t=fraction(x,z),bank=groundHeightAt(x,z);samples.push({t,bank});
        if(t<.01)first=Math.max(first,bank+.08);if(t>.99)last=Math.max(last,bank+.08);
      }
    }
    if(group.some(road=>road.name==='Kings Avenue')){
      // The lake-edge contour drops into the bank below Kings' road landing.
      // Anchor its authored abutment to the next 20m of connected high ground,
      // so the road rises above that bank instead of inheriting a 35% cliff.
      for(const bridge of group)for(const endPoint of [bridge.points[0],bridge.points.at(-1)]){
        const t=fraction(...endPoint);if(t>.01&&t<.99)continue;
        let landing=-Infinity;
        for(const road of roads){
          if(deckRoads.includes(road)||road.name!==bridge.name)continue;
          const endKey=keyOf(endPoint),forward=keyOf(road.points[0])===endKey,backward=keyOf(road.points.at(-1))===endKey;
          if(!forward&&!backward)continue;
          const points=forward?road.points:[...road.points].reverse();let travelled=0;
          for(let i=1;i<points.length&&travelled<20;i++){
            const a=points[i-1],b=points[i],sx=b[0]-a[0],sz=b[1]-a[1],span=Math.hypot(sx,sz);if(!span)continue;
            const distance=Math.min(span,20-travelled),steps=Math.max(1,Math.ceil(distance)),radius=(Number(road.width)||7.5)/2+2;
            for(let j=0;j<=steps;j++)for(const side of [-1,-.5,0,.5,1]){
              const u=distance*j/steps/span;
              landing=Math.max(landing,groundHeightAt(lerp(a[0],b[0],u)-sz/span*radius*side,lerp(a[1],b[1],u)+sx/span*radius*side));
            }
            travelled+=distance;
          }
        }
        if(t<.01)first=Math.max(first,landing+.08);else last=Math.max(last,landing+.08);
      }
    }
    for(const {t,bank}of samples){const curve=4*t*(1-t);if(curve>1e-9)arch=Math.max(arch,(bank-lerp(first,last,t)+.08)/curve);}
    const field=(x,z)=>{const t=fraction(x,z);return lerp(first,last,t)+arch*4*t*(1-t);};
    for(const road of group)lakeFields.set(road.id,field);

    // Keep the measured-in-game grade of the existing curve. Raise parallel
    // decks together and taper back to the terrain along exact connected roads.
    const belowIds=map.additionalBridgeCrossings?.length&&LAKE_UNDER_ROADS[group[0].name];
    if(!belowIds)continue;
    let lakeLift=0;
    for(const below of roads.filter(road=>belowIds.has(source(road)))) {
      for(const above of group)for(let i=1;i<above.points.length;i++)for(let j=1;j<below.points.length;j++){
        const p=crossing(above.points[i-1],above.points[i],below.points[j-1],below.points[j]);if(!p)continue;
        lakeLift=Math.max(lakeLift,groundHeightAt(...p)+CLEARANCE-field(...p));
      }
    }
    if(lakeLift>0)lakeSites.push({name:group[0].name,lakeRoads:group,lakeLift,under:[]});
  }
  const clearance=prepareBridgeClearance(roads,deckRoads,{groundHeightAt,lakeWaterLevel,additionalSites:map.additionalBridgeCrossings,lakeSites,lakeFields,deckHeightAt(road,x,z){
    if(estimates.has(String(road.id)))return NaN;
    let nearest=Infinity,height=NaN;
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);
      const distance=Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);
      if(distance<nearest){nearest=distance;height=lerp(nodeHeights.get(keyOf(a)),nodeHeights.get(keyOf(b)),t);}
    }
    return height;
  }});
  const bridgeSegments = [];
  const cells = new Map(), cellSize = 80;
  for (const road of deckRoads) {
    const explicit = estimates.get(String(road.id));
    const heights = road.points.map((point, index) => explicit?.length === road.points.length && Number.isFinite(explicit[index]) ? explicit[index] : nodeHeights.get(keyOf(point)));
    const radius = (Number(road.width) || 7.5) / 2 + 2;
    for (let i = 1; i < road.points.length; i++) {
      const originalA = road.points[i - 1], originalB = road.points[i];
      const pieces = Math.max(1, Math.ceil(Math.hypot(originalB[0] - originalA[0], originalB[1] - originalA[1]) / 25));
      const profileA = nodeProfiles.get(keyOf(originalA)), profileB = nodeProfiles.get(keyOf(originalB));
      const profileHeight = fraction => {
        const field=lakeFields.get(road.id);
        if(field&&!explicit)return field(lerp(originalA[0],originalB[0],fraction),lerp(originalA[1],originalB[1],fraction))+clearance.lift(road);
        if (explicit?.length === road.points.length) return lerp(heights[i - 1], heights[i], fraction);
        const t = lerp(profileA.t, profileB.t, fraction);
        const y = lerp(profileA.first, profileA.last, t) + profileA.arch * 4 * t * (1 - t);
        return (profileA.lakeBridge ? Math.max(minimumLakeDeck, y) : y)+clearance.lift(road);
      };
      for (let piece = 0; piece < pieces; piece++) {
        const t0 = piece / pieces, t1 = (piece + 1) / pieces;
        const a = [lerp(originalA[0], originalB[0], t0), lerp(originalA[1], originalB[1], t0)];
        const b = [lerp(originalA[0], originalB[0], t1), lerp(originalA[1], originalB[1], t1)];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        if (!dx && !dz) continue;
        const segment = { a, b, dx, dz, lengthSquared: dx * dx + dz * dz, radius, y0: profileHeight(t0), y1: profileHeight(t1), roadId: road.id };
        bridgeSegments.push(segment);
        for (let cx = Math.floor((Math.min(a[0], b[0]) - radius) / cellSize); cx <= Math.floor((Math.max(a[0], b[0]) + radius) / cellSize); cx++) {
          for (let cz = Math.floor((Math.min(a[1], b[1]) - radius) / cellSize); cz <= Math.floor((Math.max(a[1], b[1]) + radius) / cellSize); cz++) {
            const key = `${cx},${cz}`;
            if (!cells.has(key)) cells.set(key, []);
            cells.get(key).push(segment);
          }
        }
      }
    }
  }

  // Road surfaces need an owner: a ground road below a bridge must not inherit
  // the deck merely because its X/Z lies inside the bridge's horizontal mask.
  const ownedDecks=new Map();
  for(const segment of bridgeSegments) {
    if(!ownedDecks.has(segment.roadId))ownedDecks.set(segment.roadId,[]);
    ownedDecks.get(segment.roadId).push(segment);
  }
  const project=(x,z,a,b)=>{
    const dx=b[0]-a[0],dz=b[1]-a[1],lengthSquared=dx*dx+dz*dz;
    const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(lengthSquared||1),0,1);
    return {t,distance:Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t),dx,dz,lengthSquared};
  };
  function ownDeckHeight(road,x,z) {
    const field=lakeFields.get(road.id);if(field&&!estimates.has(String(road.id)))return field(x,z)+clearance.lift(road);
    let nearest=Infinity,result=null;
    for(const segment of ownedDecks.get(road.id)||[]) {
      const p=project(x,z,segment.a,segment.b);
      if(p.distance<nearest){nearest=p.distance;result=lerp(segment.y0,segment.y1,p.t);}
    }
    return result;
  }
  const jointHeights=new Map();
  for(const segment of bridgeSegments)for(const [point,y]of [[segment.a,segment.y0],[segment.b,segment.y1]]) {
    const key=keyOf(point);jointHeights.set(key,Math.max(jointHeights.get(key)??-Infinity,y));
  }
  const approaches=new Map();
  for(const road of roads) {
    if(ownedDecks.has(road.id))continue;
    for(const point of [road.points[0],road.points.at(-1)]) {
      const node=nodes.get(keyOf(point));
      // A source abutment can branch into parallel deck ways. Its road
      // approach still meets their shared joint even when deck degree is two.
      if(!node || !jointHeights.has(keyOf(point)))continue;
      if(!approaches.has(road.id))approaches.set(road.id,[]);
      const points=point===road.points[0]?road.points:[...road.points].reverse();
      const segments=[];let distance=0;
      for(let i=1;i<points.length&&distance<20;i++){
        const a=points[i-1],b=points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
        if(length>0){segments.push({a,b,distance,length});distance+=length;}
      }
      const bridge=deckRoads.find(other=>other.points.some(p=>keyOf(p)===keyOf(point)));
      const field=bridge&&!estimates.has(String(bridge.id))&&lakeFields.get(bridge.id);
      const outer=segments.find(segment=>segment.distance+segment.length>=20);
      let landing=null;
      if(field&&bridge.name==='Kings Avenue'&&outer){
        const t=(20-outer.distance)/outer.length,dx=outer.b[0]-outer.a[0],dz=outer.b[1]-outer.a[1];
        landing={x:lerp(outer.a[0],outer.b[0],t),z:lerp(outer.a[1],outer.b[1],t),nx:-dz/outer.length,nz:dx/outer.length};
      }
      approaches.get(road.id).push({point,deck:jointHeights.get(keyOf(point)),field,segments,landing});
    }
  }
  function roadHeightAt(road,x,z) {
    const ground=groundHeightAt(x,z);
    if(!road)return ground;
    const deck=ownDeckHeight(road,x,z);
    if(deck!==null)return Math.max(ground,deck);
    if(clearance.hasRamp(road))return clearance.rampHeightAt(road,x,z);
    let result=ground;
    for(const approach of approaches.get(road.id)||[]) {
      if(Math.hypot(x-approach.point[0],z-approach.point[1])>=20+(Number(road.width)||8))continue;
      let nearest=Infinity,distance=Infinity,offset=0;
      for(const segment of approach.segments){
        const p=project(x,z,segment.a,segment.b);
        if(p.distance<nearest){
          nearest=p.distance;distance=segment.distance+p.t*segment.length;
          offset=((x-segment.a[0])*(-p.dz)+(z-segment.a[1])*p.dx)/segment.length;
        }
      }
      if(distance>=20)continue;
      // Match the bridge cross-section, rather than adding one centreline
      // height delta to sloping bank terrain. Fade along the source road so
      // lane and pavement edges meet the same abutment plane as the deck.
      const t=distance/20,weight=1-t*t*(3-2*t);
      const landing=approach.landing;
      const outer=landing?groundHeightAt(landing.x+landing.nx*offset,landing.z+landing.nz*offset):ground;
      result=Math.max(result,lerp(outer,approach.field?approach.field(x,z):approach.deck,weight));
    }
    return result;
  }
  // Only bridge-neighbourhood road segments are indexed. Ordinary city poses
  // return ground without scanning roads; explicit traffic road ownership wins.
  const vehicleCells=new Map(),walkwayCells=new Map(),vehicleInfluenceCells=new Set();
  for(const key of cells.keys()) {
    const [cx,cz]=key.split(',').map(Number);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)vehicleInfluenceCells.add(`${cx+dx},${cz+dz}`);
  }
  for(const road of roads) {
    if(road.standalonePath){
      if(!approaches.has(road.id)&&!clearance.hasRamp(road))continue;
    }else if(!/^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|service)(?:_link)?$/.test(road.type||''))continue;
    const indexed=road.standalonePath?walkwayCells:vehicleCells;
    for(let i=1;i<road.points.length;i++) {
      const a=road.points[i-1],b=road.points[i],padding=(Number(road.width)||8)/2+3;
      const segment={road,a,b,padding};
      for(let cx=Math.floor((Math.min(a[0],b[0])-padding)/cellSize);cx<=Math.floor((Math.max(a[0],b[0])+padding)/cellSize);cx++)
        for(let cz=Math.floor((Math.min(a[1],b[1])-padding)/cellSize);cz<=Math.floor((Math.max(a[1],b[1])+padding)/cellSize);cz++) {
          const key=`${cx},${cz}`;
          if(!vehicleInfluenceCells.has(key)&&!clearance.hasRamp(road))continue;
          if(!indexed.has(key))indexed.set(key,[]);
          indexed.get(key).push(segment);
        }
    }
  }
  function vehicleHeightAt(pose,road=null) {
    if(road)return roadHeightAt(road,pose.x,pose.z);
    const supportY=Number.isFinite(pose.supportY)&&Number.isFinite(pose.supportX)&&Number.isFinite(pose.supportZ)&&
      Math.hypot(pose.x-pose.supportX,pose.z-pose.supportZ)<=8?pose.supportY:pose.y;
    let best=Infinity,owner=null,supportedBest=Infinity,supportedOwner=null;
    for(const segment of vehicleCells.get(`${Math.floor(pose.x/cellSize)},${Math.floor(pose.z/cellSize)}`)||[]) {
      const p=project(pose.x,pose.z,segment.a,segment.b);
      if(p.distance>segment.padding)continue;
      const alignment=Number.isFinite(pose.yaw)?Math.abs((-Math.sin(pose.yaw)*p.dx-Math.cos(pose.yaw)*p.dz)/Math.sqrt(p.lengthSquared||1)):1;
      const score=p.distance+4*(1-alignment);
      if(score<best){best=score;owner=segment.road;}
      // A live unowned pose can turn underneath an overhead road. Preserve
      // its current support level instead of snapping to the road it faces.
      // Allow the body-base offset and local slopes; poses without nearby
      // vertical support retain the ordinary horizontal spawn/fall lookup.
      if(Number.isFinite(supportY)&&score<supportedBest&&Math.abs(supportY-roadHeightAt(segment.road,pose.x,pose.z))<=1.5){
        supportedBest=score;supportedOwner=segment.road;
      }
    }
    return roadHeightAt(supportedOwner||owner,pose.x,pose.z);
  }

  function bridgeHeightAt(x, z) {
    let nearest = Infinity, result = null;
    for (const segment of cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || []) {
      const t = clamp(((x - segment.a[0]) * segment.dx + (z - segment.a[1]) * segment.dz) / segment.lengthSquared, 0, 1);
      const distance = Math.hypot(x - segment.a[0] - segment.dx * t, z - segment.a[1] - segment.dz * t);
      if (distance <= segment.radius && distance < nearest) {
        nearest = distance;
        result = lerp(segment.y0, segment.y1, t);
      }
    }
    return result;
  }

  function isOnBridge(x, z, radius = 0) {
    for (const segment of cells.get(`${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`) || []) {
      const t = clamp(((x - segment.a[0]) * segment.dx + (z - segment.a[1]) * segment.dz) / segment.lengthSquared, 0, 1);
      if (Math.hypot(x - segment.a[0] - segment.dx * t, z - segment.a[1] - segment.dz * t) + Math.max(0, radius) <= segment.radius) return true;
    }
    return false;
  }

  function heightAt(x, z) {
    const ground = groundHeightAt(x, z), deck = bridgeHeightAt(x, z);
    if(deck!==null)return Math.max(ground,deck);
    // Walkers and props on the short source-connected approach use its paved
    // elevation outside the rounded deck mask. Reuse the local vehicle index;
    // distant ground and explicitly owned underpass roads stay unchanged.
    let nearest=Infinity,owner=null;
    const key=`${Math.floor(x/cellSize)},${Math.floor(z/cellSize)}`;
    for(const indexed of [walkwayCells,vehicleCells])for(const segment of indexed.get(key)||[]){
      if(!approaches.has(segment.road.id)&&!clearance.hasRamp(segment.road))continue;
      const p=project(x,z,segment.a,segment.b),width=(Number(segment.road.width)||8)/2+2;
      if(p.distance<=width&&p.distance<nearest){nearest=p.distance;owner=segment.road;}
    }
    return owner?roadHeightAt(owner,x,z):ground;
  }
  return { groundHeightAt, heightAt, roadHeightAt, vehicleHeightAt, bridgeHeightAt, isOnBridge, bridgeSegments: Object.freeze(bridgeSegments.map(segment => Object.freeze({ roadId: segment.roadId, a: Object.freeze([...segment.a]), b: Object.freeze([...segment.b]), y0: segment.y0, y1: segment.y1, radius: segment.radius }))), stats: Object.freeze({ tiles: tiles.length, bridgeSegments: bridgeSegments.length,clearance:clearance.stats }) };
}
