// CPU traversal/controller contract, not native-input or rendered gameplay proof.
import assert from 'node:assert/strict';
import { createWorldData, ZIP_SPEED } from './world-data.mjs';
import { createTraveler, interaction, interact, stepTraveler, surfaceHeight, capsuleIntersects } from './traversal.mjs';
import { PlayerController } from './heroes/player-controller.mjs';
const world=createWorldData();
const at=p=>Object.assign(createTraveler(world),p);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
function wait(s,seconds,w=world) {
  for(let t=0;t<seconds-1e-8;t+=.025)stepTraveler(w,s,{},.025);
}
function finish(s,w=world) {
  for(let n=0;s.mode==='zip'&&n<1500;n++)stepTraveler(w,s,{},.025);
  assert.equal(s.mode,'free');assert.equal(s.ride,null);
  assert.equal(s.grounded,true);assert.equal(s.vy,0);
  assert.ok(!w.boxes.some(b=>capsuleIntersects(s,b)),'clear endpoint capsule');
}
let passed=0,failed=0;
function test(name,fn) {
  try {fn();passed++;console.log(`PASS ${name}`);}
  catch(error) {failed++;console.error(`FAIL ${name}: ${error.message}`);}
}
test('all real rails: three round trips, both ends, unchanged speed and timed reboard',()=>{
  for(const line of world.stations) {
    const s=at(line.a);
    for(let n=0;n<6;n++) {
      const origin=line[n%2?'b':'a'],destination=line[n%2?'a':'b'];
      close(s.x,origin.x);close(s.z,origin.z);
      stepTraveler(world,s,{interact:true},.025);
      assert.equal(s.mode,'zip');assert.equal(s.ride.direction,n%2?-1:1);
      const z=s.z;stepTraveler(world,s,{},.025);close(Math.abs(s.z-z),ZIP_SPEED*.025);
      finish(s);close(s.x,destination.x);close(s.z,destination.z);
      interact(world,s);assert.equal(s.mode,'free');
      wait(s,.775);assert.ok(s.cooldown>0);interact(world,s);assert.equal(s.mode,'free');
      wait(s,.05);assert.equal(s.cooldown,0);
    }
  }
});
test('station reach includes nearby hanging feet, rejects distant/high boarding',()=>{
  for(const line of world.stations)for(const end of ['a','b']) {
    const p=line[end];
    assert.equal(interaction(world,at({...p,x:p.x+1,y:p.y+6}))?.kind,'zip');
    assert.notEqual(interaction(world,at({...p,x:p.x+6.1}))?.kind,'zip');
    assert.notEqual(interaction(world,at({...p,y:p.y+6.1}))?.kind,'zip');
  }
});
test('E detach clears attachment and grounded state, cooldown then ground reboard',()=>{
  const s=at(world.stations[0].a);interact(world,s);wait(s,.35);interact(world,s);
  assert.equal(s.mode,'free');assert.equal(s.ride,null);assert.equal(s.grounded,false);assert.equal(s.vy,4);
  interact(world,s);assert.equal(s.mode,'free');
  wait(s,2);const p=world.stations[0].a;
  Object.assign(s,p);stepTraveler(world,s,{},0);interact(world,s);assert.equal(s.mode,'zip');
});
test('jump detach ignores attach lock, later reverse boarding remains legal',()=>{
  const s=at(world.stations[0].b);interact(world,s);
  stepTraveler(world,s,{jump:true},.025);
  assert.equal(s.mode,'free');assert.equal(s.ride,null);assert.ok(s.vy>0);assert.equal(s.grounded,false);
  wait(s,2);Object.assign(s,world.stations[0].b);stepTraveler(world,s,{},0);
  interact(world,s);assert.equal(s.ride.direction,-1);
});
test('endpoint uses real supported height, not hardcoded ground',()=>{
  const line=world.stations[0],deck={id:'station-deck',minX:line.b.x-3,maxX:line.b.x+3,minZ:line.b.z-3,maxZ:line.b.z+3,minY:0,maxY:3};
  const w={...world,boxes:[...world.boxes,deck],stations:[{...line,b:{...line.b,y:3}}]};
  const s=at(line.a);interact(w,s);finish(s,w);close(s.y,3);
  wait(s,1,w);interact(w,s);assert.equal(s.ride.direction,-1);
});
test('missing/stale/corrupt rail ownership releases without exception or teleport',()=>{
  for(const ride of [null,{id:'removed',t:.5,direction:1},{id:'graft',t:NaN,direction:1},{id:'graft',t:.5,direction:0}]) {
    const s=at({x:-250,y:8,z:0,mode:'zip',ride});
    stepTraveler(world,s,{},.025);assert.equal(s.mode,'free');assert.equal(s.ride,null);
    assert.ok(Number.isFinite(s.y));close(s.x,-250);close(s.z,0);
  }
});
test('fall recovery and public fresh reset remove ride locks',()=>{
  const s=at(world.stations[0].a);interact(world,s);s.y=-100;
  stepTraveler(world,s,{},0);assert.equal(s.mode,'free');assert.equal(s.ride,null);assert.equal(s.cooldown,0);
  interact(world,s);assert.equal(s.mode,'zip');
  Object.assign(s,createTraveler(world));assert.equal(s.cooldown,0);assert.equal(s.ride,null);assert.equal(s.collected.size,0);
  interact(world,s);assert.equal(s.mode,'zip');
});
test('real controller handoff: endpoint walking/collision and airborne detach velocity',()=>{
  const s=at(world.stations[0].a);interact(world,s);finish(s);
  const c=new PlayerController({position:s,boxes:world.boxes,ramps:world.ramps,floorHeight:(x,z,maxY)=>surfaceHeight(world,x,z,maxY)});
  c.position.set(s.x,s.y,s.z);c.velocity.set(0,s.vy,0);c.grounded=s.grounded;
  c.update(.025,{forward:1});assert.ok(c.position.z<s.z);assert.equal(c.grounded,true);
  // Host owns free locomotion: advance cooldown separately, never run two movement solvers.
  s.cooldown=Math.max(0,s.cooldown-.8);Object.assign(s,c.position);interact(world,s);assert.equal(s.mode,'zip');
  wait(s,.35);interact(world,s);c.position.set(s.x,s.y,s.z);c.velocity.set(0,s.vy,0);c.grounded=s.grounded;
  const y=c.position.y;c.update(.025,{});assert.ok(c.position.y>y);assert.equal(c.grounded,false);
});
console.log(`rail-reuse-test: ${passed} passed, ${failed} failed`);
if(failed)process.exitCode=1;
