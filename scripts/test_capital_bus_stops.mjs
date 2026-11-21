import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createSimulation } from '../Games/Capital Drive/simulation.js';
import { createBuses } from '../Games/Capital Drive/buses.js';
import { applyMapExpansion } from '../Games/Capital Drive/map-expansion.js';
import { applyRoadProfiles, roadProfile } from '../Games/Capital Drive/road-network.js';
import { BUS_STOPS } from '../Games/Capital Drive/street-assets.js';

const read = async name => JSON.parse(await readFile(new URL(`../Games/Capital Drive/data/${name}`,import.meta.url),'utf8'));
const map = applyRoadProfiles(applyMapExpansion(await read('canberra.json'),await read('canberra-north.json')),await read('road-profiles.json'));
const sourceBefore = JSON.stringify(BUS_STOPS), sourceById = new Map(BUS_STOPS.map(stop=>[stop.id,stop]));
const sim = createSimulation(map,{trafficCount:0}); sim.player.active = false;
const buses = createBuses(map,sim); sim.setExternalVehicles(buses.vehicles);
assert.equal(buses.vehicles.length,2);
const initial = buses.snapshot();
for(const bus of initial) {
  assert(bus.servedStops.length>0 && bus.servedStops.length<=12,'each actual fictional circuit serves bounded source stops');
  assert(bus.nextStop && !bus.currentStop);
  for(const stop of bus.servedStops) {
    const source = sourceById.get(stop.id), edge = sim.graph.edges[stop.edgeId];
    assert(source); assert.equal(stop.sourceId,`${source.source.type}/${source.source.id}`);
    assert.deepEqual([stop.x,stop.z,stop.yaw,stop.ref],[source.x,source.z,source.yaw,source.ref],'mapped platform anchors remain exact');
    assert.equal(stop.roadId,edge.road.id); assert(roadProfile(edge.road).busAllowed);
    assert(bus.routeEdgeIds.includes(edge.id));
    const p=stop.stoppingPose, dx=stop.x-p.x,dz=stop.z-p.z;
    assert(Math.cos(p.yaw)*dx-Math.sin(p.yaw)*dz<0,'the exact platform is on the actual left entrance side');
    assert(Math.hypot(stop.x-stop.doorPose.x,stop.z-stop.doorPose.z)<=1.8,'the bus door is within source-pole boarding reach');
    assert(sim.canOccupy({...p,id:bus.id},{length:10.6,width:2.45,ignoreId:bus.id}),'projected bus stopping body is physically clear');
  }
}
const signalController=sim.trafficLights, beforeRed=buses.snapshot();
sim.trafficLights={stopDistance:()=>0};
for(let i=0;i<30;i++)buses.step(.1);
for(let i=0;i<2;i++)assert.deepEqual([buses.vehicles[i].x,buses.vehicles[i].z],[beforeRed[i].x,beforeRed[i].z],'red/amber holds actual-stop buses without bypass');
sim.trafficLights=signalController;
const dwell = new Map(), resumed = new Set();
let boardedAtSource = false;
for(let tick=0;tick<9000 && (resumed.size<2 || !boardedAtSource);tick++) {
  const prior=buses.snapshot(); buses.step(.1); const next=buses.snapshot();
  for(let i=0;i<2;i++) {
    const bus=next[i], before=prior[i];
    assert(Math.hypot(bus.x-before.x,bus.z-before.z)<=.721,'mapped stops retain physical bounded travel');
    assert(bus.stopVisits-before.stopVisits<=1,'one arrival never fires a stop repeatedly');
    if(bus.currentStop) {
      assert.equal(bus.speed,0); assert(bus.dwellRemaining>0 && bus.dwellRemaining<=7);
      const record=dwell.get(bus.id);
      if(!record) {
        dwell.set(bus.id,{elapsed:0,x:bus.x,z:bus.z,visits:bus.stopVisits});
        const paused=buses.snapshot(); buses.step(0); buses.step(NaN); assert.deepEqual(buses.snapshot(),paused,'pause freezes mapped stop clocks');
        if(!boardedAtSource) {
          const stop=bus.currentStop, player={id:'player-body',x:stop.x,z:stop.z,radius:.35};
          sim.setExternalPeople([player,{...player,id:'other-platform-adult'}]);
          assert.equal(buses.interact({pose:stop,onFoot:true}).ok,false,'another person at the actual pole blocks boarding');
          sim.setExternalPeople([player]);
          const result=buses.interact({pose:stop,onFoot:true});
          assert(result.boarded,'standing at the unchanged mapped pole can board the physical left door');
          sim.setExternalPeople([]); assert(buses.interact({onFoot:true}).exited);
          boardedAtSource=true;
        }
      } else {
        record.elapsed+=.1;
        assert.equal(bus.x,record.x); assert.equal(bus.z,record.z); assert.equal(bus.stopVisits,record.visits,'the same dwell cannot retrigger');
      }
    } else if(dwell.has(bus.id) && bus.speed>.2) {
      assert(dwell.get(bus.id).elapsed>=6.8,'the bus dwells seven active seconds before resuming');
      resumed.add(bus.id);
    }
  }
}
assert.equal(resumed.size,2,'both source-map buses physically arrive, dwell and resume'); assert(boardedAtSource);
assert.equal(JSON.stringify(BUS_STOPS),sourceBefore,'transport never rewrites source assets');
buses.reset(); assert.deepEqual(buses.snapshot(),initial,'reset restores all stop clocks, visits and next stop');
console.log('PASS mapped bus stops: exact source IDs/positions, legal left-door road projections, two physical arrivals, seven-second dwell/resume, pause/reset, source-pole boarding/self exemption/other-adult blocking and bounded stop state');
