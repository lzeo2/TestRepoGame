// Original office-supply district. Units: metres; y is up; positions are feet.
export const WALK_SPEED = 8;
export const ZIP_SPEED = WALK_SPEED * 3;
export const LIMIT = 448;
export const LANES = Object.freeze([
  Object.freeze({ id: 'graft', name: 'Graft', x: -240, color: 0xdcb839 }),
  Object.freeze({ id: 'midway', name: 'Midway', x: 0, color: 0x517cbe }),
  Object.freeze({ id: 'greenhedge', name: 'Greenhedge', x: 240, color: 0x65934c })
]);
export const TEAM_COLORS = Object.freeze({ carbon: 0xb45640, ivory: 0xe8d6ac });
const freeze = value => {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
export function createWorldData() {
  const boxes = [], ramps = [], spawns = [], stations = [], buildings = [], bridges = [];
  const box = (id, x, y, z, w, h, d, kind = 'building') => {
    const b = { id, minX: x-w/2, maxX: x+w/2, minY: y, maxY: y+h, minZ: z-d/2, maxZ: z+d/2, kind };
    boxes.push(b); return b;
  };
  const ramp = (id, minX, maxX, minZ, maxZ, axis, start, end) => ramps.push({ id, minX, maxX, minZ, maxZ, axis, start, end });
  for (const lane of LANES) {
    stations.push({ id: lane.id, lane: lane.id, a: { x: lane.x-10, y: 0, z: -385 }, b: { x: lane.x-10, y: 0, z: 385 } });
    for (const [team, sign] of [['carbon', -1], ['ivory', 1]]) {
      const add = (type, n, dx, z, y = 0) => spawns.push({ id: `${team}-${lane.id}-${type}-${n}`, team, lane: lane.id, type, position: { x: lane.x+dx, y, z: sign*z } });
      add('guardian', 1, 12, 105, 3);
      box(`${team}-${lane.id}-approach`, lane.x+12, 0, sign*105, 18, 3, 22, 'platform');
      if (sign === 1) ramp(`${team}-${lane.id}-ramp`, lane.x+3, lane.x+21, 76, 94, 'z', 0, 3);
      else ramp(`${team}-${lane.id}-ramp`, lane.x+3, lane.x+21, -94, -76, 'z', 3, 0);
      add('walker', 1, 12, 220);
      for (const [n, dx] of [[1,-13],[2,13]]) { add('base-guardian', n, dx, 315); add('shrine', n, dx, 360); }
      add('patron', 1, 0, 415);
    }
  }
  let index = 0;
  for (const x of [-408,-348,-168,-108,108,168,348,408]) {
    for (const z of [-342,-252,-162,-72,72,162,252,342]) {
      if ((x === 108 || x === 168) && z === 72) continue; // sunken plaza
      const h = 12 + (index++ % 5)*4;
      const b = box(`office-${index}`, x, 0, z, 36, h, 42);
      buildings.push({ ...b, x, z, height: h, color: [0xb3a48e,0x9eacae,0xb7ad99,0xa18f7d][index%4] });
      // Every roof has a side access ramp, not a painted roof that cannot be reached.
      ramp(`roof-access-${index}`, x+18, x+24, z-26, z+17, 'z', 0, h);
      box(`roof-landing-${index}`, x+21, h-0.5, z+19, 6, 0.5, 4, 'landing');
    }
  }
  for (const x of [-408,-168,108,348]) {
    for (const z of [-252,162]) {
      const a = buildings.find(b => b.x === x && b.z === z);
      const b = buildings.find(b => b.x === x+60 && b.z === z);
      if (!a || !b) continue;
      const r = { id: `roof-link-${x}-${z}`, minX: x+17, maxX: x+43, minZ: z-3, maxZ: z+3, axis: 'x', start: a.height, end: b.height };
      ramps.push(r); bridges.push(r);
    }
  }
  box('mid-bridge', 0, 2, 0, 42, 1, 70, 'bridge');
  ramp('mid-south-ramp', -21,21,-55,-35,'z',0,3);
  ramp('mid-north-ramp', -21,21,35,55,'z',3,0);
  ramp('sewer-access', 40,90,-9,9,'x',-10,0);
  ramp('plaza-access',170,205,75,100,'x',-6,0);
  box('staple-tower', -95, 0, 0, 25, 30, 25, 'tower');
  const rope = { id: 'staple-rope', x: -79, z: 0, bottom: 0, top: 30, landing: { x: -84, y: 30, z: 0 } };
  const portals = [{ id:'carbon-stamp', x:-290,y:0,z:-300 }, { id:'ivory-stamp',x:290,y:0,z:300 }];
  const vents = [{ id:'west-vent',x:-384,y:0,z:-72,target:{x:-408,y:24,z:-72}}, { id:'east-vent',x:372,y:0,z:72,target:{x:348,y:20,z:72}}];
  // Derive target heights from the same roof data used by collision.
  for (const v of vents) v.target.y = buildings.find(b => b.x === v.target.x && b.z === v.target.z).height;
  const camps = [{id:'paper-jungle',x:-120,z:110},{id:'binder-jungle',x:125,z:-110}];
  const crates = [];
  for (const c of camps) {
    for (const dx of [-7,0,7]) {
      const id = `${c.id}-crate-${dx}`; crates.push({id,x:c.x+dx,y:0,z:c.z,kind:'breakable'});
      box(id,c.x+dx,0,c.z,3,3,3,'crate');
    }
    box(`${c.id}-cover`,c.x,0,c.z+10,20,2,3,'cover');
  }
  crates.push({id:'tower-soul',x:-95,y:30,z:0,kind:'soul'},{id:'graft-soul',x:-234,y:0,z:-370,kind:'soul'},{id:'plaza-soul',x:125,y:-6,z:110,kind:'soul'});
  return freeze({ version: 1, units:'metres', footprint:{width:900,depth:900}, lanes:LANES, teams:['carbon','ivory'], boxes, ramps, buildings, bridges, spawns, stations, rope, portals, vents, camps, crates, midBoss:{id:'sewer-mid-boss',x:-35,y:-10,z:0}, pit:{minX:90,maxX:170,minZ:60,maxZ:140,y:-6}, start:{x:-250,y:0,z:-380} });
}
export function rampHeight(r,x,z) {
  const t = r.axis === 'x' ? (x-r.minX)/(r.maxX-r.minX) : (z-r.minZ)/(r.maxZ-r.minZ);
  return r.start + Math.max(0,Math.min(1,t))*(r.end-r.start);
}
export function terrainHeight(x,z) {
  if (x>=40 && x<=90 && z>=-9 && z<=9) return -10+(x-40)/5;
  if (x>=170 && x<=205 && z>=75 && z<=100) return -6+(x-170)*6/35;
  if (x>=-65 && x<=65 && z>=-28 && z<=28) return -10;
  if (x>=90 && x<=170 && z>=60 && z<=140) return -6;
  return 0;
}
