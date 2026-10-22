// Deterministic consumers of published APIs. No simulation or renderer replacement.
import { RoadGrid } from '../../Games/Citisten3D/roads.mjs';
import { createSimulation } from '../../Games/Citisten3D/sim.mjs';

function check(ok, message) { if (!ok) throw Error(message); }
function place(sim, type, x, z) {
  const result = sim.place(type, x, z);
  check(result.ok, `${type} ${x},${z}: ${result.reason}`);
  return result.building;
}

export function trafficFixture(roads = new RoadGrid(32)) {
  roads.place({x:4,z:8}, {x:20,z:8});
  roads.place({x:20,z:8}, {x:20,z:20});
  const sim = createSimulation({size:32,mode:'free',seed:8,roads});
  place(sim,'power',6,7); place(sim,'water',8,7);
  place(sim,'park',6,9); place(sim,'residential',4,9); place(sim,'industrial',21,20);
  let car;
  for (let i=0; i<80 && !car; i++) {
    sim.update(.25);
    car = sim.state.cars.find(c=>c.path.length >= 25);
  }
  check(car, 'No real simulation car spawned');
  const id = car.id, route = structuredClone(car.path), observations = [];
  const expected = roads.path(route[0],route.at(-1));
  check(JSON.stringify(route) === JSON.stringify(expected), 'Car route differs from roads.path');
  check(route.some((p,i)=>i && p.x!==route[i-1].x) && route.some((p,i)=>i && p.z!==route[i-1].z), 'Route needs a corner');
  function observe() {
    car = sim.state.cars.find(c=>c.id===id);
    check(car, 'Tracked car disappeared before final checkpoint');
    const p = roads.center(car.x,car.z), cell = roads.worldToCell(p.x,p.z);
    check(cell && roads.has(cell.x,cell.z), 'Simulation car left road occupancy');
    check(car.roadVersion===roads.version, 'Route invalidated during fixture');
    const snapshot = {id,time:sim.state.time,segment:car.segment,x:car.x,z:car.z,heading:car.heading,parked:car.parked,roadCell:cell};
    observations.push(snapshot);
    return snapshot;
  }
  observe();
  return {roads,sim,id,route,observations,
    checkpoint(segment) {
      for (let i=0; car.segment<segment && i<400; i++) { sim.update(.25); observe(); }
      check(car.segment===segment, `Did not reach segment ${segment}`);
      return observe();
    },
  };
}

export const utilityCases = ['connected','power-removed','water-removed','both-removed','road-cut','road-restored','power-overload','water-overload','isolated-sources'];
export function utilityFixture(name, roads = new RoadGrid(32)) {
  check(utilityCases.includes(name), 'Unknown utility fixture');
  const rows = [8,11,14,18,21,24];
  for (const z of rows) roads.place({x:3,z},{x:28,z});
  roads.place({x:3,z:8},{x:3,z:24});
  roads.place({x:16,z:14},{x:16,z:15});
  const sim = createSimulation({size:32,mode:'free',seed:8,roads});
  place(sim,'power',4,7); place(sim,'water',6,7);
  const target = place(sim,'residential',24,12);
  place(sim,'park',23,12);
  sim.update(2); // establish the connected baseline through the real economy tick
  check(target.powered && target.watered, 'Baseline home is not supplied');
  if (['power-removed','both-removed','isolated-sources'].includes(name)) check(sim.bulldoze(4,7).ok,'Power removal failed');
  if (['water-removed','both-removed','isolated-sources'].includes(name)) check(sim.bulldoze(6,7).ok,'Water removal failed');
  if (['road-cut','road-restored'].includes(name)) {
    roads.set(3,9,false); sim.update(2);
    check(!target.powered && !target.watered, 'Road cut did not isolate home');
    if (name==='road-restored') roads.set(3,9,true);
  }
  if (name==='isolated-sources') { place(sim,'power',28,28); place(sim,'water',30,28); }
  if (name.endsWith('overload')) {
    if (name==='water-overload') for (const x of [8,10,12]) place(sim,'power',x,7);
    const required = name==='power-overload' ? 50 : 110;
    let added=0;
    for (const z of rows) for (let x=5;x<=28 && added<required;x++) {
      if (sim.state.buildings.some(b=>b.x===x && b.z===z+1) || roads.has(x,z+1)) continue;
      place(sim,'industrial',x,z+1); added++;
    }
    check(added===required,'Overload fixture incomplete');
  }
  sim.update(2);
  const {power,water} = sim.state;
  const powerFails = ['power-removed','both-removed','road-cut','power-overload','isolated-sources'].includes(name);
  const waterFails = ['water-removed','both-removed','road-cut','water-overload','isolated-sources'].includes(name);
  check((power.unserved>.01)===powerFails, `${name}: incorrect power result`);
  check((water.unserved>.01)===waterFails, `${name}: incorrect water result`);
  if (name==='isolated-sources') check(power.supply>power.demand && water.supply>water.demand,'Island must have spare aggregate supply');
  if (name==='road-restored') check(target.powered && target.watered,'Home did not recover');
  return {roads,sim,summary:{case:name,time:sim.state.time,power:{...power},water:{...water},
    target:{id:target.id,x:target.x,z:target.z,powered:target.powered,watered:target.watered},buildings:sim.state.buildings.length}};
}
