import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMapExpansion} from '../Games/Capital Drive/map-expansion.js';
import {applyAirport} from '../Games/Capital Drive/airport.js';
import {applyRoadProfiles,roadProfile} from '../Games/Capital Drive/road-network.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createStealthContracts,planStealthChapter,STEALTH_CONTRACT_IDS} from '../Games/Capital Drive/stealth-contracts.js';

const reader=name=>JSON.parse(readFileSync(new URL(`../Games/Capital Drive/data/${name}.json`,import.meta.url)));
const map=applyAirport(applyMapExpansion(applyRoadProfiles(reader('canberra'),reader('road-profiles')),reader('canberra-north')),
  reader('airport'),reader('airport-terrain'));
const simulation=createSimulation(map,{trafficCount:0});
const canStand=point=>!simulation.moveActor({...point},0,0,.45).blocked;
const contracts=createStealthContracts(map,{canStand,hasLineOfSight:simulation.hasLineOfSight,nearestRoad:simulation.nearestRoad});
assert.deepEqual(contracts.chapters.map(chapter=>chapter.id),STEALTH_CONTRACT_IDS);
assert.equal(createStealthContracts(map,{canStand:()=>false,hasLineOfSight:()=>true}).chapters.length,0,'blocked layouts are not published');

let serial=0,playablePlans=0;
const actions=new Set();
for(const chapter of contracts.chapters){
  assert(Object.isFrozen(chapter)&&Object.isFrozen(chapter.approaches)&&Object.isFrozen(chapter.exits));
  assert.equal(chapter.approaches.length,2);
  assert.equal(chapter.exits.length,2);
  assert.notEqual(chapter.approaches[0].stages[0].action,chapter.approaches[1].stages[0].action);
  assert.equal(planStealthChapter(chapter,{approachId:'invalid'}),null);
  assert.equal(planStealthChapter(chapter,{exitId:'invalid'}),null);
  const implicit=planStealthChapter(chapter);
  assert.equal(implicit.stealthPlan.approachId,chapter.approaches[0].id);
  assert.equal(implicit.stealthPlan.exitId,chapter.exits[0].id);
  for(const approach of chapter.approaches)for(const exit of chapter.exits){
    const plan=planStealthChapter(chapter,{approachId:approach.id,exitId:exit.id});
    assert(plan.stealth&&plan.optional&&!plan.combat);
    assert(plan.stages.length>=4);
    assert.equal(plan.stages.at(-1).action,'extract');
    assert.equal(plan.stages.at(-1).x,exit.x);
    const active={id:plan.id,stealth:true,stealthPlan:plan.stealthPlan,stage:1,target:plan.stages[1]};
    const context={pose:{x:active.target.x,z:active.target.z},onFoot:true,wanted:0,crouching:true};
    assert.equal(contracts.resolve(active,context).ok,false,'stage skipping cannot acquire a receipt');
    for(const target of plan.stages){
      actions.add(target.action);
      active.stage=plan.stages.indexOf(target);active.target=target;
      context.pose={x:target.x,z:target.z};
      assert(canStand(target),'every marked stage supports a foot body');
      const nearest=simulation.nearestRoad(target.x,target.z);
      assert(nearest.distance>=roadProfile(nearest.road).driveWidth/2+2,'marked stage clears the vehicle lanes');
      for(const wrong of [{onFoot:false},{interior:{}},{paused:true},{recovering:true},{passenger:true},{wanted:1},
        {visible:false},{visible:()=>false},{pose:{x:target.x+15,z:target.z}},{health:0}]){
        assert.equal(contracts.resolve(active,{...context,...wrong}).ok,false);
      }
      if(target.crouch)assert.equal(contracts.resolve(active,{...context,crouching:false}).ok,false);
      active.target={...target,id:'foreign-prop'};
      assert.equal(contracts.resolve(active,context).ok,false);
      active.target=target;
      const outcome=contracts.resolve(active,context);
      assert(outcome.ok&&Object.isFrozen(outcome.receipt));
      assert.deepEqual(outcome.receipt,{id:chapter.id,stage:active.stage,serial:++serial});
      assert.equal(contracts.resolve(active,context).ok,false,'one receipt per real stage');
    }
    playablePlans++;
  }
}
assert.equal(playablePlans,16);
assert.deepEqual([...actions].sort(),['cover','disarm','divert','evidence','extract','handoff','scout']);
console.log(`PASS four checked stealth contracts, ${playablePlans} plans, all stage/extraction receipts, sight/stance/wanted, replay denial and immutable plans`);
