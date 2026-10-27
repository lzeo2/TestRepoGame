// Narrow packaging regression: staged index, or an optional historical Git ref.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),ref=process.argv[2]??'';
const text=p=>execFileSync('git',['show',`${ref}:${p}`],{cwd:root,encoding:'utf8'});
const names=['jank3d-hero-kits.json','jank3d-ribbon-seraph-kit.json','jank3d-trio-kits.json'];
const loader=text('Games/Jankolock3D/game.mjs');
assert(loader.includes(`const definitions=await Promise.all([${names.map(n=>`'${n}'`).join(',')}]`));
assert(loader.includes('fetch(`../../docs/${name}`)')&&loader.includes('definitions.flatMap(document=>document.heroes)'));
const runtime=text('Games/Jankolock3D/heroes/hero-runtime.mjs');
const declaration=runtime.split('\n').find(line=>line.startsWith('const CAST_IDS = new Set('));
assert(declaration,'Actual HeroRuntime ability schema constant');
const supported=new Set(runInNewContext(declaration+'\n[...CAST_IDS]')),ids=new Set();
for(const name of names) {
  const document=JSON.parse(text('docs/'+name));assert.equal(document.schemaVersion,1);
  assert(Array.isArray(document.heroes)&&document.heroes.length);
  for(const kit of document.heroes) {
    assert(typeof kit.id==='string'&&!ids.has(kit.id));ids.add(kit.id);
    assert(typeof kit.name==='string'&&typeof kit.role==='string'&&Number.isFinite(kit.health)&&kit.health>0);
    for(const key of ['baseDamage','range','interval','magazine','reload'])assert(Number.isFinite(kit.weapon[key])&&kit.weapon[key]>0,`${kit.id}: weapon ${key}`);
    assert(kit.melee.baseDamage>0&&kit.melee.range>0&&kit.melee.cooldown>0);
    assert.deepEqual(kit.abilities.map(a=>a.slot),[1,2,3,4]);
    for(const ability of kit.abilities)assert(supported.has(ability.id)&&Number.isFinite(ability.cooldown)&&ability.cooldown>0,`${kit.id}: unsupported ability`);
  }
}
assert.equal(ids.size,8);
console.log('PASS: three literal boot JSON documents; eight unique four-slot kits match actual HeroRuntime IDs/required fields');
