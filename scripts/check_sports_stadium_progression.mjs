import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Game as BasketballGame,SAVE_KEY as basketballKey} from '../Games/StealBasketballer/js/game.js';
import {Game as FootballGame,SAVE_KEY as footballKey} from '../Games/StealFootballer/js/game.js';

// Detached authority fixtures: these funds/recruits are not naturally earned UI progress.
class MemoryStorage {
  values=new Map();
  writes=[];
  getItem(key) { return this.values.get(key)??null; }
  setItem(key,value) { this.writes.push(key);this.values.set(key,String(value)); }
}
const clone=value=>JSON.parse(JSON.stringify(value));
for (const [sport,Game,key,otherKey,recruitGates] of [
  ['Basketballer',BasketballGame,basketballKey,footballKey,[3,6,10]],
  ['Footballer',FootballGame,footballKey,basketballKey,[3,6,11]]
]) {
  const data=JSON.parse(await readFile(new URL(`../Games/Steal${sport}/data/catalog.json`,import.meta.url),'utf8'));
  const storage=new MemoryStorage();
  for (const suffix of ['',':backup',':damaged']) storage.values.set(otherKey+suffix,'other sport sentinel'+suffix);
  storage.values.set('unrelated-setting','keep');
  const sentinels=new Map(storage.values);
  let now=600;
  const options={storage,clock:()=>now,random:()=>.5};
  const game=new Game(data,options);
  const recruitId=game.catalog.keys().next().value;
  const saveFields=Object.keys(game.normalize(game.state)).sort();
  assert.equal(game.state.stadiumLevel,0);
  function setRecruits(count) {
    game.state.roster=[];
    for (let i=0;i<count;i++) game.state.roster.push(game.recruit(recruitId));
  }
  function denied(reason) {
    const before=clone(game.state),writes=storage.writes.length;
    const result=game.action('upgradeStadium');
    assert.equal(result.ok,false,`${sport}: ${reason}`);
    assert.deepEqual(game.state,before,`${sport}: rejected ${reason} mutated state`);
    assert.equal(storage.writes.length,writes,`${sport}: rejected ${reason} wrote a save`);
  }
  for (let level=1;level<=3;level++) {
    now+=60;
    const cost=[1200,4500,12000][level-1],recruits=recruitGates[level-1];
    assert.equal(game.state.stadiumLevel,level-1);
    assert.equal(game.snapshot().stadium.next.cost,cost,`${sport}: existing tier cost`);
    assert.equal(game.snapshot().stadium.next.recruits,recruits,`${sport}: existing recruit gate`);
    setRecruits(recruits-1);game.state.coins=cost;
    denied('insufficient recruits');
    setRecruits(recruits);game.state.coins=cost-1;
    denied('insufficient coins');
    game.state.coins=cost;
    game.setLocation({atHome:false,base:0});denied('away from home');
    game.setLocation({atHome:true});
    assert.equal(game.action('beginBattle').ok,true);
    denied('active match');
    assert.equal(game.action('endBattle',{result:{score:[0,0],forfeit:true}}).ok,true);
    game.setLocation({atHome:false,base:0});
    assert.equal(game.action('steal',{base:0,index:0}).ok,true);
    game.setLocation({atHome:true});denied('carrying a recruit');
    assert.equal(game.action('drop').ok,true);
    const before=clone(game.state);
    assert.equal(game.action('upgradeStadium').ok,true,`${sport}: tier ${level} purchase`);
    assert.deepEqual(game.state,{...before,coins:0,stadiumLevel:level},`${sport}: exact price and only tier/coins change`);
    assert.equal(game.snapshot().stadium.level,level);
    const loaded=new Game(data,options);
    assert.equal(loaded.state.stadiumLevel,level,`${sport}: tier survives reload`);
    assert.equal(loaded.state.coins,0,`${sport}: exact balance survives reload`);
    assert.deepEqual(loaded.state.roster,game.state.roster,`${sport}: recruits survive reload`);
    assert.deepEqual(Object.keys(JSON.parse(storage.values.get(key))).sort(),saveFields,`${sport}: saved schema unchanged`);
  }
  assert.equal(game.snapshot().stadium.next,null);
  game.state.coins=100000;denied('maximum tier');
  assert.equal(game.state.stadiumLevel,3);
  assert.ok(storage.writes.every(write=>write===key||write===key+':backup'),`${sport}: only own main/backup keys written`);
  for (const [sentinel,value] of sentinels) assert.equal(storage.values.get(sentinel),value,`${sport}: untouched ${sentinel}`);
  console.log(`PASS ${sport}: stadium tiers 1–3; recruit gates ${recruitGates.join('/')}; costs 1200/4500/12000; five rejection gates without mutation; exact purchases; max tier; reload and save isolation`);
}
