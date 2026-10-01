import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import * as data from '../Games/Foldwild/data.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'});
const read = path => readFileSync(new URL('../' + path, import.meta.url));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const keys = (object, expected) => assert.deepEqual(Object.keys(object).sort(), expected.split(' ').sort());
const {SPECIES, BY_ID, ABILITIES, ELEMENTS, ELEMENT_WHEEL, OPTIONAL_HIDDEN_SPECIES} = data;
keys(data, 'SPECIES BY_ID ABILITIES ELEMENTS ELEMENT_WHEEL OPTIONAL_HIDDEN_SPECIES');
assert.deepEqual(ELEMENTS, ['Cindrel', 'Rillune', 'Loamveil', 'Gleamric', 'Hushmere']);
assert.deepEqual(ELEMENT_WHEEL, {Cindrel: 'Loamveil', Loamveil: 'Gleamric', Gleamric: 'Hushmere', Hushmere: 'Rillune', Rillune: 'Cindrel'});
assert.equal(OPTIONAL_HIDDEN_SPECIES, null);
assert.equal(SPECIES.length, 80);
assert.equal(Object.keys(BY_ID).length, 80);
for (const element of ELEMENTS) assert.equal(SPECIES.filter(s => s.element === element).length, 16);
const families = [...new Set(SPECIES.map(s => s.family))];
assert.equal(families.length, 10);
for (const family of families) assert.equal(SPECIES.filter(s => s.family === family).length, 8);
for (const [tier, count] of Object.entries({basic: 35, evolved: 40, boss: 5})) {
  assert.equal(SPECIES.filter(s => s.tier === tier).length, count);
}
assert.equal(SPECIES.filter(s => s.unique).length, 5);

// Compare to committed evidence, not an upload path or a duplicated fixture.
const normative = git('show', 'HEAD:docs/monster-roster-glbs.md');
assert.equal(sha(Buffer.from(normative)), '7673827d68e1f38af48d3fd8eb903924f26d9518f72f872416e78c96ec1d3190');
const rows = normative.split('\n').filter(line => /^\| \d{2} \|/.test(line))
  .map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));
assert.equal(rows.length, 80);
const dimensions = new Map([...normative.matchAll(/^\| (\w+) \| ([\d.]+) × ([\d.]+) × ([\d.]+) \|/gm)]
  .map(([, name, width, height, depth]) => [name, {width: +width, height: +height, depth: +depth}]));
assert.equal(dimensions.size, 80);
const delivery = git('show', 'HEAD:docs/monster-model-delivery.md');
const hashes = new Map([...delivery.matchAll(/^\| (\w+) \| `glb\/([^`]+)` \| \d+ \| [^|]+ \| (\d+) \| `([a-f0-9]{64})` \|$/gm)]
  .map(([, name, path, bytes, hash]) => [name, {path, bytes: +bytes, hash}]));
assert.equal(hashes.size, 80);
const tracked = new Set(git('ls-files', '-z', '--', 'Games/Foldwild/models').split('\0').filter(Boolean));
assert.equal(tracked.size, 80);
let modelBytes = 0;
for (const [index, s] of SPECIES.entries()) {
  keys(s, 'id number name element family tier stage evolvesTo evolveLevel stats abilities model bounds unique');
  keys(s.stats, 'hp energy attack defense speed');
  keys(s.bounds, 'width height depth');
  assert.equal(s.id, s.name.toLowerCase());
  assert.equal(s.number, index + 1);
  assert.equal(BY_ID[s.id], s);
  assert.ok([1, 2, 3].includes(s.stage));
  assert.equal(s.unique, s.tier === 'boss');
  assert.ok(Object.values(s.stats).every(n => Number.isInteger(n) && n > 0));
  assert.ok(Object.values(s.bounds).every(n => Number.isFinite(n) && n > 0));
  assert.equal(s.abilities.length, 4);
  assert.equal(new Set(s.abilities).size, 4);
  for (const ability of s.abilities) assert.ok(Object.hasOwn(ABILITIES, ability));
  const row = rows[index];
  const evolution = row[5].match(/^(\w+) \(level (12|26)\)$/);
  assert.deepEqual([s.number, s.name, s.element, s.family, s.tier, s.stage, s.unique, s.stats, s.abilities, s.evolvesTo, s.evolveLevel],
    [+row[0], row[1], row[2], row[3], row[4].split(';')[0], +row[4].split('; ')[1][0], row[6] === 'BOSS/UNIQUE-GLB',
      Object.fromEntries(['hp', 'energy', 'attack', 'defense', 'speed'].map((key, i) => [key, +row[7].split('/')[i]])),
      row[8].split('; '), evolution ? evolution[1].toLowerCase() : null, evolution ? +evolution[2] : null]);
  assert.deepEqual(s.bounds, dimensions.get(s.name));
  if (s.evolvesTo !== null) {
    const next = BY_ID[s.evolvesTo];
    assert.ok(next);
    assert.equal(next.family, s.family);
    assert.equal(next.element, s.element);
    assert.equal(next.stage, s.stage + 1);
    assert.equal(s.evolveLevel, s.stage === 1 ? 12 : 26);
  } else assert.equal(s.evolveLevel, null);
  const seen = new Set();
  for (let id = s.id; id !== null; id = BY_ID[id].evolvesTo) {
    assert.ok(!seen.has(id), 'evolution cycle');
    seen.add(id);
  }
  assert.equal(s.model, `models/${s.family}/${s.id}.glb`);
  const path = 'Games/Foldwild/' + s.model;
  assert.ok(tracked.has(path), path);
  const evidence = hashes.get(s.name);
  assert.equal(s.model, 'models/' + evidence.path);
  const bytes = read(path);
  assert.equal(bytes.length, evidence.bytes);
  assert.equal(sha(bytes), evidence.hash);
  modelBytes += bytes.length;
}
assert.equal(modelBytes, 7300844);
for (const family of families) {
  const actual = readdirSync(new URL(`../Games/Foldwild/models/${family}/`, import.meta.url)).sort();
  assert.deepEqual(actual, SPECIES.filter(s => s.family === family).map(s => s.id + '.glb').sort());
}

// Reconstruct normative wording from normalized actions: catches omitted/extra effects.
const glossary = [...normative.matchAll(/^\| ([^|]+) \| (\d+) \| ([^|]+) \|$/gm)];
assert.equal(glossary.length, 50);
assert.equal(Object.keys(ABILITIES).length, 50);
for (const [, name, cost, effect] of glossary) {
  const action = ABILITIES[name.trim()];
  assert.ok(action);
  assert.equal(action.cost, +cost);
  const parts = [];
  for (const [key, value] of Object.entries(action)) {
    if (key === 'cost') continue;
    if (key === 'power') parts.push(`P${value} damage`);
    else if (key === 'status') {
      assert.ok(['Scorch', 'Drag', 'Fray', 'Haze', 'Hush'].includes(value));
      parts.push(`apply ${value}`);
    } else if (key === 'heal') parts.push(`heal ${value} HP`);
    else if (key === 'restore') parts.push(`restore ${value} energy`);
    else if (key === 'shield') parts.push(`gain ${value === 18 ? 'an' : 'a'} ${value}-HP shield`);
    else if (key === 'buff' || key === 'debuff') {
      keys(value, 'stat percent');
      assert.ok(['attack', 'defense', 'speed'].includes(value.stat));
      assert.ok(Number.isInteger(value.percent) && value.percent > 0);
      parts.push(`${key === 'buff' ? 'own' : 'enemy'} ${value.stat} ${key === 'buff' ? '+' : '-'}${value.percent}% for 2 turns`);
    } else if (key === 'cleanse') {
      assert.equal(value, true);
      parts.push('remove own negative status');
    } else assert.fail('unknown action field: ' + key);
    if (['power', 'heal', 'restore', 'shield'].includes(key)) assert.ok(Number.isInteger(value) && value > 0);
  }
  assert.equal(parts.join('; '), effect.trim(), name);
}
console.log('PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes');
