import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { buildRoadGraph, createSimulation, pointOnLane } from '../Games/Capital Drive/simulation.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles } from '../Games/Capital Drive/road-network.js';
import { findRoute } from '../Games/Capital Drive/navigation.js';
const road = { id:'covered',sourceId:'way/347384260',name:'Bunda Street',type:'living_street',width:7.5,
  sourceTags:{covered:'yes'},points:[[-20,0],[20,0]],nodes:['a','b'] };
const building = {id:'osm-46081156',type:'commercial',points:[[-5,-5],[5,-5],[5,5],[-5,5]],height:9.6};
const make = changes => ({bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},roads:[road],buildings:[building],spawn:{x:-40,z:0,yaw:0},...changes});
const graph = world => createSimulation(world,{trafficCount:0}).graph;
assert.equal(buildRoadGraph([road]).edges.length,2,'ordinary standalone graph contract retained');
assert.equal(graph(make()).edges.length,0,'known covered-solid mismatch removes travel edges');
assert.equal(graph(make()).segments.length,1,'source road segment retained');
for (const world of [make({roads:[{...road,sourceTags:{}}]}),make({roads:[{...road,sourceTags:{covered:'yes',layer:'1'}}]}),
  make({roads:[{...road,sourceTags:{covered:'yes',bridge:'yes'}}]}),make({buildings:[{...building,type:'roof'}]}),
  make({collisionReplacedBuildingIds:[building.id]}),make({buildings:[{...building,id:'unrelated-building'}]}),
  make({roads:[{...road,sourceId:'unrelated-way'}]})]) assert.equal(graph(world).edges.length,2,'guard remains source- and solid-specific');
const courtyard = {...building,innerRings:[{points:[[-4,-4],[4,-4],[4,4],[-4,4]]}]};
assert.equal(graph(make({buildings:[courtyard],roads:[{...road,points:[[-3,0],[3,0]]}]})).edges.length,2,'road entirely in actual courtyard remains connected');
assert.equal(graph(make({buildings:[courtyard]})).edges.length,0,'courtyard does not exempt crossing solid walls');
for (const points of [[[-20,5],[20,5]],[[-20,-5],[20,-5]],[[-20,0],[-5,0]]]) {
  assert.equal(graph(make({roads:[{...road,points}]})).edges.length,0,'solid-boundary contact is physically unavailable to a whole car');
}
assert.equal(graph(make({roads:[{...road,points:[[-5,0],[0,0]]}]})).edges.length,0,'boundary-to-solid interval is blocked');
const approach = {...road,id:'approach',sourceId:'way/380074148',sourceTags:{},points:[[-30,0],[0,0]],nodes:['c','d']};
assert.equal(graph(make({roads:[road,approach]})).edges.length,0,'blocked connecting approach cannot remain a GPS goal spur');
const clear = {...road,id:'clear',sourceId:'other',points:[[-30,20],[30,20]],nodes:['clear-a','clear-b']};
assert.equal(graph(make({roads:[road,clear]})).edges.length,2,'unrelated ordinary travel retained');
const json = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url),'utf8'));
const map = applyMapExpansion(applyRoadProfiles(await json('canberra'),await json('road-profiles')),await json('canberra-north'));
// Match the controller's retained-building replacement identities. Otherwise
// Petrie is falsely tested against the old solid footprint replaced at boot.
const controller=await readFile(new URL('../Games/Capital Drive/script.js',import.meta.url),'utf8');
const replacement=controller.match(/map\.collisionReplacedBuildingIds=\[([^\]]+)\]/);
assert(replacement,'actual controller collision replacement identities exist');
map.collisionReplacedBuildingIds=[...replacement[1].matchAll(/'([^']+)'/g)].map(match=>match[1]);
assert.deepEqual(map.collisionReplacedBuildingIds,['act-75267-0','osm-584970595'],'fixture follows exact current controller replacement identities');
const simulation = createSimulation(map,{trafficCount:0}), original = buildRoadGraph(map.roads);
const covered = simulation.graph.segments.filter(s=>s.road.sourceId==='way/347384260');
assert.equal(covered.length,2); assert(covered.every(s=>s.edges.length===0));
assert.equal(simulation.graph.segments.length,original.segments.length);
for (const [index,edge] of simulation.graph.edges.entries()) assert.equal(edge.id,index,'edge IDs remain dense and index-safe');
for (const [x,z] of [[-277.29,-4204.18],[-289.22,-4229.64],[-297.12,-4246.49]]) {
  const node=[...simulation.graph.nodes.values()].find(n=>n.x===x&&n.z===z);
  assert(node); assert.equal(node.outgoing.length,0,'inside-solid Bunda node cannot attract GPS or traffic');
  assert.equal(simulation.canOccupy({x,z,yaw:0,id:'probe'}),false,'physical building collision remains present');
}
assert.equal(simulation.nearestRoad(-289.22,-4229.64).road.sourceId,'way/347384260','nearest source metadata remains intact');
const ends=[{x:-236.46,z:-4117.09},{x:-340.66,z:-4339.77}], results=[];
for(const [direction,from,to] of [['north-to-south',ends[0],ends[1]],['south-to-north',ends[1],ends[0]]]) {
  const route=findRoute(simulation.graph,from,to);
  assert(route.length>2, `${direction}: directed alternate route exists`);
  const failures={centreline:[],lane:[]}; let length=0,samples=0;
  for(let i=1;i<route.length;i++) {
    const a=route[i-1],b=route[i],dx=b[0]-a[0],dz=b[1]-a[1],distance=Math.hypot(dx,dz),yaw=Math.atan2(-dx,-dz);
    const edge=simulation.graph.edges.find(e=>e.from.x===a[0]&&e.from.z===a[1]&&e.to.x===b[0]&&e.to.z===b[1]);
    assert(edge, `${direction}: route uses a real directed edge`); length+=distance;
    const count=Math.ceil(distance/.5);
    for(let j=0;j<=count;j++) {
      const t=j/count;
      const centreline={id:'route-probe',x:a[0]+dx*t,z:a[1]+dz*t,yaw};
      const lane={id:'route-probe',...pointOnLane(edge,distance*t)};
      for(const [kind,pose] of [['centreline',centreline],['lane',lane]]) if(!simulation.canOccupy(pose)) failures[kind].push({segment:i,road:edge.road.name,x:pose.x,z:pose.z});
      samples++;
    }
  }
  for(const kind of ['centreline','lane']) assert.equal(failures[kind].length,0,`${direction}: ${kind} static whole-car sweep blocked: ${JSON.stringify(failures[kind].slice(0,3))}`);
  results.push(`${direction} ${Math.round(length)}m/${samples} samples each at centreline and actual directed lane offset`);
}
console.log(`Capital covered road routes: PASS (${original.edges.length-simulation.graph.edges.length} blocked travel edges excluded; source geometry/collision retained; ${results.join('; ')}; sample spacing<=0.5m; live traffic, corner rotation, terrain and boot decorative/world barriers unverified)`);
