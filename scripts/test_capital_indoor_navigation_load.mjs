import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createInteriorNavigation } from '../Games/Capital Drive/interior-navigation.js';
import { createPoliceRooms } from '../Games/Capital Drive/police-rooms.js';

const source=execFileSync('git',['show','83f476088c6dbb0ca9f66fbea09889f4c65b9486:Games/Capital Drive/interior-navigation.js'],
  {cwd:new URL('../',import.meta.url),encoding:'utf8'});
const {createInteriorNavigation:oldNavigation}=await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const plan={id:'six-officer-room',origin:{x:0,z:0,yaw:0},width:9,depth:9,floorY:0,walls:[],
  furniture:[{x:0,z:4.5,yaw:0,width:3,depth:1,height:.7}],spawn:{x:0,z:2},exit:{x:0,z:1}};
const from={x:0,z:2},target={x:0,z:7},owners=Array.from({length:6},(_,i)=>`police:${i}`);
function round(nav,ids=owners){
  return ids.map(id=>{
    const waypoint=nav.nextWaypoint(from,target,id);assert(waypoint,'detour exists around the retained low table');
    assert(nav.canTraverse(from,waypoint),'every shortcut retains swept physical clearance');return waypoint;
  });
}
const old=oldNavigation(plan),nav=createInteriorNavigation(plan);
assert.equal(nav.stats.gridBuilds,0);assert(!nav.canTraverse(from,target),'fixture requires a real field, not direct walking');
assert.deepEqual(round(nav),round(old),'cache capacity does not change physical waypoints');
assert.equal(nav.stats.searches,6);const warm={...nav.stats};
for(let tick=0;tick<30;tick++){assert.deepEqual(round(nav),round(old));}
assert.deepEqual(nav.stats,warm,'six fixed-owner fields perform no BFS rebuild after warmup');
assert.equal(old.stats.searches,186,'pinned four-field cache rebuilds every owner field on every subsequent round');
assert.equal(nav.stats.gridBuilds,1);assert.equal(nav.stats.cachedPaths,6);
const paused={...nav.stats};assert.deepEqual(nav.stats,paused,'navigation has no independent time owner');
for(let owner=0;owner<40;owner++)round(nav,[`temporary:${owner}`]);
assert.equal(nav.stats.cachedPaths,6,'owner churn remains bounded');
round(nav);const rewarmed=nav.stats.searches;
for(let tick=0;tick<10;tick++)round(nav);
assert.equal(nav.stats.searches,rewarmed,'ordinary six-owner reuse resumes after eviction');
assert(nav.stats.nodes<=2000);

const rooms=createPoliceRooms(),units=owners.map(id=>({id,health:100,interiorId:plan.id}));
let room=rooms.enter(plan,{id:plan.id},{outside:{x:0,z:-1},units});
for(const id of owners)assert(room.nextWaypoint(from,target,id));
assert.equal(room.stats.cachedPaths,6);
rooms.leave();rooms.prune(units);assert(rooms.resolve(plan.id),'occupied room retains its physical navigation');
room=null;rooms.prune([]);assert.equal(rooms.resolve(plan.id),null);assert.equal(rooms.snapshot().length,0,'unoccupied room drops its sole registry reference');
const fresh=rooms.enter(plan,{id:plan.id},{outside:{x:0,z:-1}});assert.equal(fresh.stats.gridBuilds,0);assert.equal(fresh.stats.cachedPaths,0,'re-entry gets fresh lazy navigation after disposal');
rooms.clear();assert.equal(rooms.snapshot().length,0);
console.log('Capital indoor navigation load PASS: pinned old 186 BFS builds versus six warm current fields without rebuild; exact physical waypoints, bounded eviction/reuse and occupied-room retention/pruning.');
