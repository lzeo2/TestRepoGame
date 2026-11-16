import assert from 'node:assert/strict';
import {createProgression} from '../Games/Capital Drive/progression.js';
import {createGameplay} from '../Games/Capital Drive/gameplay.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {WEAPONS} from '../Games/Capital Drive/weapons.js';
const map={bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},spawn:{x:0,z:0,yaw:0},roads:[],buildings:[],landmarks:[],storyHomes:{basement:{roomId:'house-safe'}}};
const pool=(offset=0)=>Object.fromEntries(WEAPONS.map((weapon,i)=>[weapon.id,{ammo:Math.min(weapon.magazine,i+offset),reserveAmmo:i+offset+10}]));
const profiles=['street','student','corporate','basement'];
const legacy=createProgression(map).serialize();
assert.equal(Object.hasOwn(legacy,'inventoryProfiles'),false);assert.equal(Object.hasOwn(legacy,'crewHealth'),false);
const p=createProgression(map,legacy);assert.equal(p.getInventory('street'),null);assert.equal(p.getCrewHealth('merc-river'),null);
const cash=p.state.cash,pose=structuredClone(map.spawn);
for(const [i,id] of profiles.entries())assert(p.saveInventory(id,pool(i)));
assert.equal(p.state.cash,cash);assert.deepEqual(map.spawn,pose,'saving ammo cannot move the player or world');
const saved=p.serialize(),loaded=createProgression(map,saved);
for(const [i,id] of profiles.entries())assert.deepEqual(loaded.getInventory(id),pool(i));
const detached=loaded.getInventory('street');detached.pistol.ammo=12;assert.notEqual(loaded.getInventory('street').pistol.ammo,12);
const original=pool();loaded.saveInventory('street',original);original.pistol.reserveAmmo=200;assert.notEqual(loaded.getInventory('street').pistol.reserveAmmo,200);
const malformed=[null,[],{}, {...pool(),unknown:{ammo:0,reserveAmmo:0}}];
for(const [field,value] of [['ammo',-1],['ammo',1.5],['ammo',NaN],['ammo',Infinity],['ammo',13],['reserveAmmo',241],['reserveAmmo','2']]){
 const bad=pool();bad.pistol[field]=value;malformed.push(bad);
}
const missing=pool();delete missing.shotgun;malformed.push(missing);
malformed.push({...pool(),pistol:{ammo:0,reserveAmmo:0,extra:0}});
const game=createGameplay(map,createSimulation(map,{trafficCount:0}),{hasWeapon:id=>id==='pistol'});
for(const bad of malformed){
 const before=loaded.serialize(),state=game.snapshot();assert.equal(loaded.saveInventory('street',bad),false);assert.deepEqual(loaded.serialize(),before);
 assert.equal(game.restoreInventory(bad),false);assert.deepEqual(game.snapshot(),state,'invalid restore is atomic');
 assert.throws(()=>createProgression(map,{...legacy,inventoryProfiles:{street:bad}}),/inventory/);
}
for(const bad of [{unknown:pool()},[],null])assert.throws(()=>createProgression(map,{...legacy,inventoryProfiles:bad}),/inventory/);
assert.equal(loaded.saveInventory('kit',pool()),false);
const exact=pool(3),protectedBefore={actor:{...game.state.actor},health:game.state.health,wanted:4,vehicle:{...game.state.vehicle}};
game.state.wanted=4;game.state.reloading=1;assert(game.restoreInventory(exact));
assert.deepEqual(game.inventorySnapshot(),exact);assert.equal(game.state.reloading,0);
assert.deepEqual(game.state.actor,protectedBefore.actor);assert.equal(game.state.health,protectedBefore.health);assert.equal(game.state.wanted,4);assert.deepEqual(game.state.vehicle,protectedBefore.vehicle);
assert.equal(game.state.weapon,'unarmed','restore does not equip anything');assert.equal(game.setWeapon('shotgun'),false,'restored unowned ammo does not grant a weapon');
assert(game.setWeapon('pistol'));assert.deepEqual(game.inventorySnapshot(),exact,'first equip after restore cannot overfill a loaded magazine');
// Actual stash callbacks + durable inventory save, including wanted/active
// campaign contexts that deliberately do not capture a resumable body pose.
const career=createProgression(map);career.state.equipment.pistol=true;
const live=createGameplay(map,createSimulation(map,{trafficCount:0}),{hasWeapon:id=>career.state.equipment[id]===true});
live.state.mode='foot';live.state.wanted=3;assert(live.restoreInventory(pool(3)));
const context=owner=>({pose:{x:0,z:0},onFoot:true,health:100,vehicleHealth:100,wanted:3,respawnSerial:0,campaign:true,interior:{roomId:'house-safe'},
 getInventory:()=>({equipment:{...owner.state.equipment},ammunition:live.inventorySnapshot()}),takeInventory:item=>live.takeInventory(item),giveInventory:item=>live.giveInventory(item)});
const total=()=>live.inventorySnapshot().pistol.ammo+live.inventorySnapshot().pistol.reserveAmmo+(career.state.stashes['house-safe']?.ammo.pistol||0);
const initial=total();assert(career.stash('house-safe','deposit','ammo','pistol',5,context(career)).ok);assert.equal(total(),initial);
assert(career.saveInventory('student',live.inventorySnapshot()));
const afterDeposit=createProgression(map,career.serialize());
const resumed=createGameplay(map,createSimulation(map,{trafficCount:0}),{hasWeapon:id=>afterDeposit.state.equipment[id]===true});
assert(resumed.restoreInventory(afterDeposit.getInventory('student')));
assert.equal(resumed.inventorySnapshot().pistol.ammo+resumed.inventorySnapshot().pistol.reserveAmmo+afterDeposit.state.stashes['house-safe'].ammo.pistol,initial,'deposit then reload conserves actual player plus stash ammunition');
const withdrawal={...context(afterDeposit),getInventory:()=>({equipment:{...afterDeposit.state.equipment},ammunition:resumed.inventorySnapshot()}),giveInventory:item=>resumed.giveInventory(item),takeInventory:item=>resumed.takeInventory(item)};
assert(afterDeposit.stash('house-safe','withdraw','ammo','pistol',3,withdrawal).ok);assert(afterDeposit.saveInventory('student',resumed.inventorySnapshot()));
const afterWithdrawal=createProgression(map,afterDeposit.serialize());
assert.equal(afterWithdrawal.getInventory('student').pistol.ammo+afterWithdrawal.getInventory('student').pistol.reserveAmmo+afterWithdrawal.state.stashes['house-safe'].ammo.pistol,initial,'withdraw then reload conserves both owners');
// Hired health belongs to the career, including an exact downed zero.
const hiring=createProgression(map);hiring.state.cash=10000;
const hireContext={pose:{x:0,z:0},onFoot:true,health:100,vehicleHealth:100,wanted:0,respawnSerial:0};
assert(hiring.hireCrew('merc-river',hireContext).ok);assert.equal(hiring.getCrewHealth('merc-river'),100);
assert(hiring.saveCrewHealth('merc-river',0));assert.equal(createProgression(map,hiring.serialize()).getCrewHealth('merc-river'),0);
for(const health of [-1,101,NaN,Infinity,'0']){const before=hiring.serialize();assert.equal(hiring.saveCrewHealth('merc-river',health),false);assert.deepEqual(hiring.serialize(),before);}
assert.equal(hiring.saveCrewHealth('merc-stone',80),false);
for(const crewHealth of [null,[],{'merc-stone':0},{'merc-river':NaN},{'merc-river':-1},{'merc-river':101}])assert.throws(()=>createProgression(map,{...hiring.serialize(),crewHealth}),/crew health/);
assert(hiring.rehireCrew('merc-river',hireContext).ok);assert.equal(hiring.getCrewHealth('merc-river'),100);
assert(hiring.dismissCrew('merc-river',hireContext).ok);assert.equal(hiring.getCrewHealth('merc-river'),null);assert.equal(Object.hasOwn(hiring.serialize(),'crewHealth'),false);
const oldHire={...legacy,hiredCrew:['merc-river']};assert.equal(createProgression(map,oldHire).getCrewHealth('merc-river'),100,'legacy hire defaults to healthy');
console.log('Capital inventory persistence PASS: strict independent profiles, detached legacy saves, atomic capped restore without grants/pose changes, actual wanted stash deposit/withdraw reload conservation, and durable crew zero/renewal/dismissal');
