import assert from 'node:assert/strict';
import { createHeistActivities } from '../Games/Capital Drive/heist-activities.js';

const bank = { id:'civic-bank', name:'Civic Mutual Bank', kind:'bank', x:0, z:0, radius:3 };
const jewel = { id:'manuka-jewels', name:'Manuka Facets', kind:'jeweller', x:0, z:100 };
const rail = { id:'rail-parcels', name:'Metro Parcel Run', kind:'rail', x:100, z:0,
  stopId:'rail-alinga', arrivalStopId:'rail-elouera', boarding:{x:106,z:0}, pickup:{x:300,z:0} };
const onFoot = (pose, extra = {}) => ({ pose, onFoot:true, wanted:0, ...extra });
const aboard = (pose, railStopId = null, extra = {}) => ({ pose, wanted:0, railPassenger:true, railStopId, ...extra });

function roomFor(site) {
  const id = `interior-${site.id}`;
  const employee = { id:`${id}-employee`, roomId:id, storeId:site.id, kind:'employee', health:100, x:401, z:498 };
  const loot = { id:`${id}-loot`, x:403, z:500, radius:1.4 };
  const room = { id, storeId:site.id, heistSiteId:site.id, employeeId:employee.id, loot };
  const entry = onFoot({x:401,z:500}, { indoors:true, room, employee, armed:true, aiming:true, aimYaw:0 });
  const counter = { ...entry, pose:{x:loot.x,z:loot.z}, armed:false, aiming:false };
  return { room, employee, entry, counter };
}

function fixture(options) {
  const heat = [], rewards = [];
  const heists = createHeistActivities({ sites:[bank,jewel,rail], onHeat:event=>heat.push(event),
    onReward:event=>rewards.push(event), ...options });
  return { heists, heat, rewards };
}

function playSequence(heists, ctx) {
  const sequence = heists.snapshot().challenge.sequence;
  for (const symbol of sequence) {
    heists.step(1/60, ctx);
    heists.step(1/60, ctx, { [symbol]:true });
  }
}

{
  const { room, employee, entry, counter } = roomFor(bank);
  let obstructed;
  const { heists, heat, rewards } = fixture({canSee:(a,b)=> {
    if (a.interiorId || b.interiorId) assert.equal(a.interiorId, b.interiorId, 'indoor sight checks use the same room');
    return b.id !== obstructed;
  }});
  assert.equal(heists.interact(onFoot(bank)), null, 'shop entrance proceeds through the ordinary interior interaction');
  for (const ctx of [{...entry, busy:true}, {...entry, doorway:true}, {...entry, swimming:true}, {...entry, onFoot:false},
    {...entry, paused:true}, {...entry, recovering:true}, {...entry, room:null}, {...entry, indoors:false},
    {...entry, room:{...room,id:'interior-another-store'}}, {...entry, room:{...room,heistSiteId:jewel.id}},
    {...entry, employee:{...employee,id:'visitor'}}, {...entry, employee:{...employee,kind:'visitor'}},
    {...entry, employee:{...employee,roomId:'interior-another-store'}}, {...entry, employee:{...employee,health:0}},
    {...entry, pose:{x:408,z:508}}]) {
    assert.equal(heists.interact(ctx), null);
  }
  obstructed = employee.id;
  assert.equal(heists.interact(entry), null, 'cannot threaten an employee through an obstruction');
  obstructed = null;
  assert.match(heists.interact({...entry,wanted:2}).message, /clear your wanted/i);
  for (const ctx of [counter, {...entry,armed:false}, {...entry,aiming:false}, {...entry,aimYaw:Math.PI}]) {
    assert.match(heists.interact(ctx).message, /aim at the employee/i);
    assert.equal(heists.active, false);
  }
  assert.deepEqual(heat, [], 'neither drawing a weapon nor interacting at loot starts heat');
  assert.equal(heists.interact(entry).ok, true);
  assert.equal(heists.snapshot().phase, 'surrender');
  assert.equal(heists.snapshot().challenge, null);
  assert.equal(heists.snapshot().target, null, 'an interior target is kept out of GPS');
  assert.deepEqual(heists.snapshot().indoorTarget, { ...room.loot, name:'Cash', interiorId:room.id });
  const roomCrime = heists.roomCrime;
  assert.deepEqual(roomCrime, {type:'robbery',targetId:employee.id,phase:'handover'});
  assert.equal(heists.roomCrime, roomCrime, 'the renderer can reuse the crime descriptor');
  assert.equal(heists.snapshot().employeeId, employee.id);
  assert.equal(heists.interact(entry), null, 'loot requires getting within counter reach');
  assert.equal(heists.interact(roomFor(jewel).counter), null, 'another shop cannot satisfy the objective');
  assert.equal(heists.interact({...counter,doorway:true}), null, 'the normal exit always takes priority');
  assert.equal(heists.interact({...counter,employee:{...employee,health:0}}), null);
  obstructed = room.loot.id;
  assert.equal(heists.interact(counter), null, 'loot cannot be taken through an obstruction');
  assert.equal(heat.length, 0);
  obstructed = null;
  assert.match(heists.interact(counter).message, /exit the building/i);
  assert.equal(heists.snapshot().phase, 'escape');
  assert.deepEqual(heat, [{ id:bank.id, kind:'bank', point:{x:0,z:0}, severity:3 }]);
  assert.match(heists.snapshot().guidance, /exit the building/i);
  assert.equal(heists.roomCrime, roomCrime);
  assert.equal(heists.interact(counter), null, 'collecting twice never reapplies heat');
  assert.equal(heat.length, 1);
  assert.equal(heists.interact({...counter,doorway:true}), null, 'escape keeps the normal exit button');
  heists.step(.1, onFoot({x:120,z:0}));
  assert.equal(rewards.length, 0, 'a career completion requires actually acquiring wanted stars');
  heists.step(.1, {...counter,wanted:3});
  heists.step(.1, counter);
  assert.equal(rewards.length, 0, 'distance from the outdoor anchor does not count while indoors');
  heists.step(.1, onFoot({x:120,z:0},{wanted:1}));
  assert.equal(heists.roomCrime, null);
  heists.step(.1, onFoot({x:25,z:0}));
  assert.equal(heists.active, true, 'clearing heat beside the pickup is insufficient');
  assert.match(heists.step(.1, onFoot({x:120,z:0})).message, /2,750/);
  assert.deepEqual(rewards, [{ id:bank.id, kind:'bank', amount:2750 }]);
  assert.equal(heists.step(.1,onFoot({x:120,z:0})), null);
  assert.equal(heists.snapshot().active, false);
  assert.match(heists.interact(entry).message, /available in 360s/);
  for (let second=0;second<360;second++) heists.step(1, onFoot(bank,{paused:true}));
  assert.match(heists.interact(entry).message, /available in 360s/);
  for (let second=0;second<360;second++) heists.step(1, entry);
  assert.equal(heists.interact(entry).ok, true, 'the cooled-down target can be replayed');
}

{
  const { heists, heat, rewards } = fixture();
  const { entry, counter, employee } = roomFor(jewel);
  assert.equal(heists.interact(entry).ok, true);
  assert.match(heists.step(1/60, onFoot({x:10,z:100})).message, /left before collecting/i);
  assert.equal(heists.roomCrime, null);
  assert.equal(heists.interact(entry).ok, true, 'leaving before loot allows immediate retry');
  assert.match(heists.step(1/60, {...entry,employee:{...employee,health:0}}).message, /employee is unavailable/i);
  assert.deepEqual(heat, []);
  assert.match(heists.interact({...entry,armed:false,aiming:false,employee:{...employee,lastPlayerHit:true},wanted:1}).message, /jewellery/);
  assert.match(heists.snapshot().guidance, /jewellery/);
  assert.equal(heists.interact(counter).ok, true);
  heists.step(.1, onFoot({x:10,z:100},{wanted:2}));
  assert.equal(heists.step(.1, onFoot({x:40,z:100})).ok, true);
  assert.equal(heat.at(0).severity, 2);
  assert.equal(rewards.at(0).amount, 1500);
}

{
  const { heists, heat, rewards } = fixture();
  const entry = onFoot(rail);
  assert.match(heists.interact(onFoot(rail,{wanted:1})).message, /clear your wanted/i);
  assert.equal(heists.interact(onFoot(rail,{busy:true})), null);
  assert.equal(heists.interact(entry).ok, true);
  assert.equal(heists.snapshot().phase, 'board');
  assert.equal(heists.snapshot().target.x, rail.boarding.x);
  assert.equal(heists.interact(entry), null, 'active job does not intercept the boarding button');
  assert.equal(heists.step(.1, aboard(rail.boarding, 'rail-ipima')), null);
  assert.equal(heists.step(.1, aboard(rail.boarding, rail.stopId)).ok, true);
  assert.equal(heists.snapshot().target.x, rail.pickup.x);
  assert.equal(heists.interact(aboard(rail.boarding, rail.stopId)), null);
  assert.equal(heists.interact(aboard(rail.pickup, 'rail-ipima')), null);
  assert.equal(heists.interact(aboard(rail.pickup)), null, 'pickup cannot start between stops');
  assert.equal(heists.interact(aboard(rail.pickup, rail.arrivalStopId)).ok, true);
  const ride = aboard(rail.pickup);
  assert.deepEqual(heists.snapshot().challenge.sequence,['up','y','x']);
  heists.step(1/60, ride, {up:true});
  assert.equal(heists.snapshot().challenge.index, 0, 'input held at admission cannot count');
  heists.step(1/60, ride);
  heists.step(1/60, ride, {up:true});
  heists.step(1/60, ride, {up:true});
  assert.equal(heists.snapshot().challenge.index, 1, 'holding a key cannot repeat the action');
  heists.step(1/60, ride);
  assert.match(heists.step(1/60, ride, {x:true}).message,/Wrong symbol/);
  assert.equal(heists.snapshot().challenge.index, 0);
  playSequence(heists, aboard(rail.pickup));
  assert.equal(heists.interact(aboard(rail.pickup)), null, 'departure can use normal disembarking');
  assert.equal(heists.step(.1, aboard({x:500,z:0},null,{wanted:2})), null);
  assert.equal(heists.step(.1, aboard({x:500,z:0})), null, 'staying aboard is not an extraction');
  assert.match(heists.snapshot().guidance,/leave the train/i);
  assert.equal(heists.step(.1,onFoot({x:500,z:0})).ok,true);
  assert.equal(heat.length,1);
  assert.equal(rewards.at(0).amount,1950);
}

{
  const { heists, heat, rewards } = fixture();
  const { entry, counter } = roomFor(jewel);
  const practice = { ...entry, sandbox:true };
  assert.equal(heists.interact(practice).ok, true);
  assert.equal(heists.interact(counter), null, 'switching modes cannot turn rehearsal loot into career loot');
  assert.equal(heists.interact({...counter,sandbox:true}).ok, true);
  assert.equal(heists.step(.1,onFoot({x:55,z:100},{sandbox:true})).message,'Practice heist complete.');
  assert.deepEqual(heat, []);
  assert.deepEqual(rewards, []);
  assert.equal(heists.interact(entry).ok, true, 'practice creates no cooldown');
  assert.match(heists.step(.1,{...entry,recovering:true}).message,/interrupted/);
  heists.interact(entry);
  assert.match(heists.step(.1,practice).message,/interrupted/);
  heists.interact(entry);
  heists.interact(counter);
  assert.match(heists.step(.1,{...counter,recovering:true}).message,/interrupted/);
  assert.match(heists.interact(entry).message, /available in 45s/);
  assert.equal(rewards.length, 0);
  heists.interact(onFoot(rail));
  heists.step(.1,aboard(rail.boarding,rail.stopId));
  assert.match(heists.step(.1,onFoot(rail.pickup)).message,/left the train/);
}

console.log('PASS parody heists: enter, confront, collect, escape, light rail symbol pickup, one payout, cooldown and practice isolation.');
