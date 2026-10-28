// Source-only topology proof. No browser/game-feel or target-device performance claim.
import assert from 'node:assert/strict';
import { WORLD, blocked, clearPath, chaseTarget } from '../Games/Slipstream Borough/world.js';
assert.equal(WORLD.blocks.length, 40);
assert.equal(WORLD.shortcuts.length, 4);
assert(Object.isFrozen(WORLD.shortcuts));
assert(!blocked(0, 0));
assert.deepEqual(WORLD.blocks.find(b => b.x === 25 && b.z === 25), {x:25,z:25,width:28,depth:28,height:10});
assert(new Set(WORLD.blocks.map(b => `${b.width}/${b.depth}`)).size >= 3);
assert(WORLD.blocks.some(b => b.height === 7));
const nodes = [];
for (let x = -150; x <= 150; x += 50) for (let z = -150; z <= 150; z += 50) nodes.push({x,z});
for (const lane of WORLD.shortcuts) {
  assert(Object.isFrozen(lane));
  const horizontal = lane.width > lane.depth;
  const at = (along, across = 0) => ({x:lane.x+(horizontal?along:across),z:lane.z+(horizontal?across:along)});
  const a = at(-25), b = at(25);
  assert(clearPath(a,b), 'shortcut really bypasses the former solid block');
  for (const side of [-3.9,0,3.9]) assert(clearPath(at(-25,side),at(25,side)), 'usable width after collision inflation');
  assert(!clearPath(at(-25,4.01),at(25,4.01)), 'no widened invisible clearance through walls');
  assert.equal(Math.hypot(a.x-b.x,a.z-b.z),50);
  // Former full block forced a >=100m junction detour; the open cut is 50m.
  assert.deepEqual(chaseTarget(a,b),b);
  for (const along of [-25,0,25]) nodes.push(at(along));
  // A routed pursuit must also reach a target around the next solid block.
  const target = {x:Math.floor(a.x/50)*50,z:Math.floor(a.z/50)*50};
  let cursor = at(0);
  for (let step=0; step<12 && Math.hypot(cursor.x-target.x,cursor.z-target.z)>.001; step++) {
    const next=chaseTarget(cursor,target);
    assert(clearPath(cursor,next)); assert.notDeepEqual(next,cursor,'routing cannot stick inside a service lane'); cursor=next;
  }
  assert.deepEqual(cursor,target);
}
assert(nodes.length <= 64);
const reached = new Set([0]), queue = [0];
for (const index of queue) for (const [i,node] of nodes.entries()) {
  const a=nodes[index], distance=Math.abs(a.x-node.x)+Math.abs(a.z-node.z);
  if (!reached.has(i) && distance>0 && distance<=50 && (a.x===node.x||a.z===node.z) && clearPath(a,node)) {reached.add(i);queue.push(i);}
}
assert.equal(reached.size,nodes.length,'every original junction and shortcut node belongs to one collision-safe component');
// Sample both directions around the unchanged civilian circuits, including rounded corners.
for (const extent of [46.5,96.5]) {
  const radius=9, edge=extent-radius;
  for (const side of [-1,1]) {
    assert(clearPath({x:-edge,z:side*extent},{x:edge,z:side*extent}));
    assert(clearPath({x:side*extent,z:-edge},{x:side*extent,z:edge}));
    for (const sx of [-1,1]) {
      let previous;
      for (let i=0;i<=32;i++) {
        const angle=i/32*Math.PI/2, point={x:sx*(edge+radius*Math.cos(angle)),z:side*(edge+radius*Math.sin(angle))};
        assert(!blocked(point.x,point.z)); if(previous)assert(clearPath(previous,point)); previous=point;
      }
    }
  }
}
console.log(`PASS 4 fixed shortcuts, usable radius-safe width, ${WORLD.blocks.length} varied solid parcels, ${nodes.length}-node connected routing, preserved start/collision corner and both civilian circuits. Source-only.`);
