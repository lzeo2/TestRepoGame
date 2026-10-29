// Actual source/GLTFLoader/template/combat/flight. CPU render state, never native pixels.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

assert(process.env.THREE_ROOT && process.env.ESBUILD_ROOT, 'Use approved existing tools');
const three = resolve(process.env.THREE_ROOT), tool = resolve(process.env.ESBUILD_ROOT);
const manifest = JSON.parse(readFileSync(resolve(three, 'package.json')));
assert.equal(manifest.version, '0.186.0');
assert.equal(JSON.parse(readFileSync(resolve(tool, 'package.json'))).version, '0.28.2');
const { build } = await import(pathToFileURL(resolve(tool, 'lib/main.js')));
const T = await import(pathToFileURL(resolve(three, 'build/three.module.js')));
const base = fileURLToPath(new URL('../', import.meta.url)), src = resolve(base, 'source/games/wings/src');
const baseline = 'e539b2d3c20a209159009bfb225b0db9dd6952eb';
const original = ['fighter', 'apache', 'warthog', 'blackbird', 'bomber', 'f15', 'f35'];
const originalPair = ['f16c', 'mig29'];
const priorNative = [...originalPair, 'typhoon', 'su35s'];
const newPair = ['rafale', 'jf17'];
const nextPair = ['gripen', 'mig31'];
const latestPair = ['mirage2000', 'su34'];
const oldNative = [...priorNative, ...newPair, ...nextPair];
const seventeenNative = [...oldNative, ...latestPair];
const trainerPair = ['fa50', 'yak130'];
const nineteenNative = [...seventeenNative, ...trainerPair];
const twentyNative = [...nineteenNative, 'hawkt2'];
const twentyOneNative = [...twentyNative, 'su25sm'];
const twentyOnePin = 'c61d2c8f';
const twentyOneDescriptor = JSON.parse(execFileSync('git', ['show', `${twentyOnePin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const twentyTwoNative = [...nineteenNative, 'hawkt2', 'su25sm', 'a10c'];
const deliveryKinds = ['hawkt2', 'su25sm', 'a10c', 'f35a', 'j20'];
const twentyThreeNative = [...twentyTwoNative, 'f35a'];
const added = [...twentyThreeNative, 'j20'];
const twentyThreePin = 'f6ba2421';
const twentyThreeDescriptor = JSON.parse(execFileSync('git', ['show', `${twentyThreePin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const twentyTwoPin = '4cac4413';
const twentyTwoDescriptor = JSON.parse(execFileSync('git', ['show', `${twentyTwoPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const twentyPin = '9a4efe06f695f8eda36cefa226c7082c94a2c930';
const twentyDescriptor = JSON.parse(execFileSync('git', ['show', `${twentyPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const nineteenPin = 'b39d50967c002e18c8f88d74d2db49b20ef160d2';
const nineteenDescriptor = JSON.parse(execFileSync('git', ['show', `${nineteenPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const seventeenPin = '53355f0b';
const seventeenDescriptor = JSON.parse(execFileSync('git', ['show', `${seventeenPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const fifteenPin = '100190fd47903a07975080c858573a2e56e67cc8';
const fifteenDescriptor = JSON.parse(execFileSync('git', ['show', `${fifteenPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const thirteenPin = '782056940737a7b2f8fd145f50d7926f86643eec';
const thirteenDescriptor = JSON.parse(execFileSync('git', ['show', `${thirteenPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const elevenPin = '9626f909';
const elevenDescriptor = JSON.parse(execFileSync('git', ['show', `${elevenPin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const ninePin = '359d4758';
const priorDescriptor = JSON.parse(execFileSync('git', ['show', `${ninePin}:Games/Wings/authoring/native-fighter-pair.json`], { cwd: base, encoding: 'utf8' }));
const identities = {
  f16c: ['f-16c', 'b2c38684cd1f7d904e6d076f600f0233a3b481b8ea5434fc186411d31fa1cf30'],
  mig29: ['mig-29', 'b94eb1885dd2119ff135a824f2879b94f792340e684d51ded704a552d64d88c8'],
  typhoon: ['eurofighter-typhoon', 'cae157180c649ac6d4c3b43dd7ae1a5322d7cc2985f961fdbcf6effa4b99b835'],
  su35s: ['su-35s', '858eda509c102f2079a2af96fdfd6c7e8027d289bfd7d2797be38ba17a636433'],
  rafale: ['rafale-c', 'e547d577a3a533ad6c8cadaed6f53d1b5e0850bcbf985ac6dc631488f5100561'],
  jf17: ['jf-17-block-iii', 'b6bb06bbbf51c6af467e0e636a703d85cc53cff8b8b8b3f757e68db11aebb52a'],
  gripen: ['jas-39c-gripen', 'f996e62f23cf56027b885767fcb30ae954824b198254dd8a644a14fcacd9e789'],
  mig31: ['mig-31bm', 'dd4b8a9741ff4fb325c4a5534d1a0264148c1f0f91078f9dfcca565435e9c82f'],
  mirage2000: ['mirage-2000c', '5e17fb6db155a50fccaa52ccb4ec1989293441d0346769c43774dc370ce1f4dd'],
  su34: ['su-34', '8c2f3633dd39e47a0259b0954c831bee5f8531ed38db48a9e383c277166ff50a'],
  fa50: ['fa-50', 'adf3e81efc5c5841bc30b9fa526ae7bdf83f0ccbad8fa12a142f43b73b7484f6'],
  yak130: ['yak-130', '0bff616f2330806c42860c8d705f7ae05616f2a84e05d44530da4538da44505e'],
  hawkt2: ['hawk-t2', '9289e2d589b8a295392b2d100c1c3462ee935f1e4837e937e0fea5240bfb54e7'],
  su25sm: ['su-25sm', 'cf231893435e7283a5950bd7ca15591bb2ff9159ab29c001ea7b9412204b4663'],
  a10c: ['a-10c', '74c58cd536be3705b347d7c32fa76b54a0692a992fadde65f82772037187d623'],
  f35a: ['f-35a', '956550b4cba4a7e4bf4f6bccd71609673f46705a7f249b18adf8f38f2a646e01'],
  j20: ['j-20', '9d70ac66e30c70a69c76b8e0c7c0151a74a4e5ab9f12691cef738b816707b862'],
};
const entries = {
  'sim/vehicles.ts': 'VEHICLES, VEHICLE_KINDS, WEAPONS',
  'sim/flight.ts': 'createFlightState, stepFlight, NEUTRAL_INPUT, isStalled',
  'sim/combat.ts': 'ARMOR, createCombatState, createWeapons, applySeatInput, stepCombat, muzzlePosition',
  'sim/bots.ts': 'chooseBotVehicle',
  'render/aircraft.ts': 'CONFIG, createAircraftView, aircraftStats',
  'render/camera.ts': 'CameraRig',
  'audio/engines.ts': 'EngineVoice, ENGINE_REF, ENGINE_LOUDNESS',
};
function threePlugin(external = true) {
  return { name: 'approved-three', setup(api) {
    api.onResolve({ filter: /^three(?:\/.*)?$/ }, ({ path }) => {
      const key = path === 'three' ? '.' : `.${path.slice(5)}`;
      let target = manifest.exports[key];
      if (!target) for (const [pattern, value] of Object.entries(manifest.exports))
        if (pattern.endsWith('*') && key.startsWith(pattern.slice(0, -1))) target = value.replace('*', key.slice(pattern.length - 1));
      if (typeof target === 'object') target = target.import;
      assert.equal(typeof target, 'string', key);
      const file = resolve(three, target);
      return external ? { path: pathToFileURL(file).href, external: true } : { path: file };
    });
  } };
}
async function sourceApi(pin = null) {
  const plugins = [threePlugin()];
  if (pin) plugins.push({ name: 'pinned-aircraft-preimage', setup(api) {
    api.onLoad({ filter: /\/(?:vehicles|flight|bots|types|aircraft|camera|engines)\.ts$/ }, ({ path }) => {
      if (!path.startsWith(src)) return;
      const relative = `Games/Wings/source/games/wings/src${path.slice(src.length)}`;
      return { contents: execFileSync('git', ['show', `${pin}:${relative}`], { cwd: base, encoding: 'utf8' }), loader: 'ts' };
    });
  } });
  const result = await build({ stdin: { contents: Object.entries(entries).map(([file, names]) =>
    `export { ${names} } from ${JSON.stringify(resolve(src, file))};`).join('\n'), resolveDir: src },
    bundle: true, platform: 'node', format: 'esm', write: false, minify: true, legalComments: 'none', plugins });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].contents).toString('base64')}`);
}
const api = await sourceApi(), old = await sourceApi(baseline), nine = await sourceApi(ninePin), eleven = await sourceApi(elevenPin), thirteen = await sourceApi(thirteenPin), fifteen = await sourceApi(fifteenPin), seventeen = await sourceApi(seventeenPin), nineteen = await sourceApi(nineteenPin), twenty = await sourceApi(twentyPin), twentyOne = await sourceApi(twentyOnePin), twentyTwo = await sourceApi(twentyTwoPin), twentyThree = await sourceApi(twentyThreePin);
assert.deepEqual(twentyThree.VEHICLE_KINDS, [...original, ...twentyThreeNative], 'coherent twenty-three-kind pinned baseline');
assert.deepEqual(twentyTwo.VEHICLE_KINDS, [...original, ...twentyTwoNative], 'coherent twenty-two-kind pinned baseline');
assert.deepEqual(twentyOne.VEHICLE_KINDS, [...original, ...twentyOneNative], 'coherent twenty-one-kind pinned baseline');
assert.deepEqual(twenty.VEHICLE_KINDS, [...original, ...twentyNative], 'coherent twenty-kind pinned baseline');
assert.deepEqual(nineteen.VEHICLE_KINDS, [...original, ...nineteenNative], 'coherent nineteen-kind pinned baseline');
assert.deepEqual(seventeen.VEHICLE_KINDS, [...original, ...seventeenNative], 'coherent seventeen-kind pinned baseline');
assert.deepEqual(fifteen.VEHICLE_KINDS, [...original, ...oldNative], 'coherent fifteen-kind pinned baseline');
assert.deepEqual(thirteen.VEHICLE_KINDS, [...original, ...priorNative, ...newPair], 'coherent thirteen-kind pinned baseline');
const helicopterAppend = api.VEHICLE_KINDS.length === 27 ? ['ah64d', 'mi28n'] : [];
assert.deepEqual(api.VEHICLE_KINDS, [...original, ...added, 'tu160', ...helicopterAppend]);
if (helicopterAppend.length) {
  const hd = JSON.parse(readFileSync(resolve(base, 'authoring/native-helicopter-pair.json')));
  assert.equal(hd.schema, 'wings_native_helicopter_pair_v1');
  assert.deepEqual(Object.keys(hd.models), helicopterAppend);
  for (const kind of helicopterAppend) {
    const d = hd.models[kind], v = api.VEHICLES[kind];
    assert.equal(createHash('sha256').update(readFileSync(resolve(base, d.file))).digest('hex'), d.sha256);
    assert.equal(v.flight, 'heli'); assert.equal(v.stall, 0);
    assert.deepEqual(v.seatWeapons, [['rockets', null], ['hellfire', null]]);
    assert.deepEqual(v.hardpoints, d.hardpoints); assert.equal(v.hardpoints.missiles[1].length, 4);
    assert(!v.hardpoints.gun); assert.deepEqual(api.CONFIG[kind].afterburners, []);
    assert.deepEqual(api.CONFIG[kind].spinners, d.rotors.map(r => ({ name: r.node, axis: r.axis, speed: r.speed, driver: r.driver })));
    assert(Number.isFinite(api.ARMOR[kind]) && api.ARMOR[kind] > 0);
  }
}
assert.deepEqual(api.WEAPONS, twentyOne.WEAPONS, 'all existing weapon IDs and ballistics remain byte-equivalent values');
for (const kind of [...original, ...originalPair]) {
  assert.deepEqual(api.VEHICLES[kind], nine.VEHICLES[kind], `${kind}: exact original-nine spec`);
  assert.deepEqual(api.CONFIG[kind], nine.CONFIG[kind], `${kind}: exact original-nine rig`);
  assert.equal(api.ENGINE_REF[kind], nine.ENGINE_REF[kind]);
  assert.equal(api.ENGINE_LOUDNESS[kind], nine.ENGINE_LOUDNESS[kind]);
}
for (const kind of original) {
  assert.deepEqual(api.VEHICLES[kind], old.VEHICLES[kind], `${kind}: exact original spec/loadout/hardpoints`);
  assert.deepEqual(api.CONFIG[kind], old.CONFIG[kind], `${kind}: exact original rig`);
  assert.equal(api.ENGINE_REF[kind], old.ENGINE_REF[kind]);
  assert.equal(api.ENGINE_LOUDNESS[kind], old.ENGINE_LOUDNESS[kind]);
}
const world = { groundHeight: () => 20, onRunway: () => true, half: 1000000, ceiling: 10000 };
const spawn = { position: [0, 3000, 0], yaw: 0, onGround: false };
for (const kind of original) {
  const a = api.createFlightState(kind, spawn), b = old.createFlightState(kind, spawn);
  for (let tick = 0; tick < 900; tick++) {
    const input = { ...api.NEUTRAL_INPUT, throttle: Math.sin(tick / 30), pitch: .15, yaw: tick > 300 ? .2 : 0, roll: tick < 60 ? .2 : 0, boost: tick > 600 };
    api.stepFlight(a, input, 1 / 60, world); old.stepFlight(b, input, 1 / 60, world);
    assert.deepEqual(a, b, `${kind}: unchanged tick ${tick}`);
  }
  const aRig = new api.CameraRig(new T.PerspectiveCamera()), bRig = new old.CameraRig(new T.PerspectiveCamera());
  for (const method of ['cockpitBody', 'chaseBody']) {
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0]
      : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
    aRig[method](...args); bRig[method](...args);
    assert.deepEqual(aRig.pos.toArray(), bRig.pos.toArray());
    assert.deepEqual(aRig.quat.toArray(), bRig.quat.toArray());
  }
}
for (const kind of nine.VEHICLE_KINDS) {
  const a = api.createFlightState(kind, spawn), b = nine.createFlightState(kind, spawn);
  for (let tick = 0; tick < 900; tick++) {
    const input = { ...api.NEUTRAL_INPUT, throttle: Math.sin(tick / 30), pitch: .15, yaw: tick > 300 ? .2 : 0, roll: tick < 60 ? .2 : 0, boost: tick > 600 };
    api.stepFlight(a, input, 1 / 60, world); nine.stepFlight(b, input, 1 / 60, world);
    assert.deepEqual(a, b, `${kind}: original-nine unchanged tick ${tick}`);
  }
  const aRig = new api.CameraRig(new T.PerspectiveCamera()), bRig = new nine.CameraRig(new T.PerspectiveCamera());
  for (const method of ['cockpitBody', 'chaseBody', 'gunner']) {
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0]
      : method === 'gunner' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, 0, -1)]
      : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
    aRig[method](...args); bRig[method](...args);
    assert.deepEqual(aRig.pos.toArray(), bRig.pos.toArray());
    assert.deepEqual(aRig.quat.toArray(), bRig.quat.toArray());
  }
}
for (const kind of eleven.VEHICLE_KINDS) {
  assert.deepEqual(api.VEHICLES[kind], eleven.VEHICLES[kind], `${kind}: exact original-eleven spec`);
  assert.deepEqual(api.CONFIG[kind], eleven.CONFIG[kind], `${kind}: exact original-eleven rig/control`);
  assert.equal(api.ENGINE_REF[kind], eleven.ENGINE_REF[kind]);
  assert.equal(api.ENGINE_LOUDNESS[kind], eleven.ENGINE_LOUDNESS[kind]);
  const a = api.createFlightState(kind, spawn), b = eleven.createFlightState(kind, spawn);
  for (let tick = 0; tick < 900; tick++) {
    const input = { ...api.NEUTRAL_INPUT, throttle: Math.sin(tick / 30), pitch: .15, yaw: tick > 300 ? .2 : 0, roll: tick < 60 ? .2 : 0, boost: tick > 600 };
    api.stepFlight(a, input, 1 / 60, world); eleven.stepFlight(b, input, 1 / 60, world);
    assert.deepEqual(a, b, `${kind}: original-eleven unchanged tick ${tick}`);
  }
  const aRig = new api.CameraRig(new T.PerspectiveCamera()), bRig = new eleven.CameraRig(new T.PerspectiveCamera());
  for (const method of ['cockpitBody', 'chaseBody', 'gunner']) {
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0]
      : method === 'gunner' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, 0, -1)]
      : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
    aRig[method](...args); bRig[method](...args);
    assert.deepEqual(aRig.pos.toArray(), bRig.pos.toArray());
    assert.deepEqual(aRig.quat.toArray(), bRig.quat.toArray());
  }
}
for (const kind of thirteen.VEHICLE_KINDS) {
  assert.deepEqual(api.VEHICLES[kind], thirteen.VEHICLES[kind], `${kind}: exact original-thirteen spec`);
  assert.deepEqual(api.CONFIG[kind], thirteen.CONFIG[kind], `${kind}: exact original-thirteen rig/control`);
  assert.equal(api.ENGINE_REF[kind], thirteen.ENGINE_REF[kind]);
  assert.equal(api.ENGINE_LOUDNESS[kind], thirteen.ENGINE_LOUDNESS[kind]);
  const a = api.createFlightState(kind, spawn), b = thirteen.createFlightState(kind, spawn);
  for (let tick = 0; tick < 900; tick++) {
    const input = { ...api.NEUTRAL_INPUT, throttle: Math.sin(tick / 30), pitch: .15, yaw: tick > 300 ? .2 : 0, roll: tick < 60 ? .2 : 0, boost: tick > 600 };
    api.stepFlight(a, input, 1 / 60, world); thirteen.stepFlight(b, input, 1 / 60, world);
    assert.deepEqual(a, b, `${kind}: original-thirteen unchanged tick ${tick}`);
  }
  const aRig = new api.CameraRig(new T.PerspectiveCamera()), bRig = new thirteen.CameraRig(new T.PerspectiveCamera());
  for (const method of ['cockpitBody', 'chaseBody', 'gunner']) {
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0]
      : method === 'gunner' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, 0, -1)]
      : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
    aRig[method](...args); bRig[method](...args);
    assert.deepEqual(aRig.pos.toArray(), bRig.pos.toArray());
    assert.deepEqual(aRig.quat.toArray(), bRig.quat.toArray());
  }
}
for (const reference of [fifteen, seventeen, nineteen, twenty, twentyOne, twentyTwo, twentyThree]) for (const kind of reference.VEHICLE_KINDS) {
  assert.deepEqual(api.VEHICLES[kind], reference.VEHICLES[kind], `${kind}: exact prior ${reference.VEHICLE_KINDS.length}-kind spec`);
  assert.deepEqual(api.CONFIG[kind], reference.CONFIG[kind], `${kind}: exact prior rig/control`);
  assert.equal(api.ENGINE_REF[kind], reference.ENGINE_REF[kind]);
  assert.equal(api.ENGINE_LOUDNESS[kind], reference.ENGINE_LOUDNESS[kind]);
  const a = api.createFlightState(kind, spawn), b = reference.createFlightState(kind, spawn);
  for (let tick = 0; tick < 900; tick++) {
    const input = { ...api.NEUTRAL_INPUT, throttle: Math.sin(tick / 30), pitch: .15, yaw: tick > 300 ? .2 : 0, roll: tick < 60 ? .2 : 0, boost: tick > 600 };
    api.stepFlight(a, input, 1 / 60, world); reference.stepFlight(b, input, 1 / 60, world);
    assert.deepEqual(a, b, `${kind}: prior ${reference.VEHICLE_KINDS.length}-kind unchanged tick ${tick}`);
  }
  for (const method of ['cockpitBody', 'chaseBody', 'gunner']) {
    const aRig = new api.CameraRig(new T.PerspectiveCamera()), bRig = new reference.CameraRig(new T.PerspectiveCamera());
    const args = method === 'cockpitBody' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], 0, 0]
      : method === 'gunner' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, 0, -1)]
      : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
    aRig[method](...args); bRig[method](...args);
    assert.deepEqual(aRig.pos.toArray(), bRig.pos.toArray()); assert.deepEqual(aRig.quat.toArray(), bRig.quat.toArray());
  }
}
// Compare equal populations. The ordinary twenty-four-kind pool extends twenty-three.
for (const [prior, kinds] of [[old, original], [nine, nine.VEHICLE_KINDS], [eleven, eleven.VEHICLE_KINDS], [thirteen, thirteen.VEHICLE_KINDS], [fifteen, fifteen.VEHICLE_KINDS], [seventeen, seventeen.VEHICLE_KINDS], [nineteen, nineteen.VEHICLE_KINDS], [twenty, twenty.VEHICLE_KINDS], [twentyOne, twentyOne.VEHICLE_KINDS], [twentyTwo, twentyTwo.VEHICLE_KINDS], [twentyThree, twentyThree.VEHICLE_KINDS], [api, api.VEHICLE_KINDS]]) {
  for (const crowded of [[], kinds.map(kind => ({ kind, alive: true, team: 0 }))]) {
    let a = 232, b = 232;
    const next = value => (Math.imul(value, 1664525) + 1013904223) >>> 0;
    for (let i = 0; i < 1000; i++) {
      const expected = prior.chooseBotVehicle({ team: 0 }, [], crowded, () => (a = next(a)) / 4294967296);
      assert.equal(api.chooseBotVehicle({ team: 0 }, [], crowded, () => (b = next(b)) / 4294967296, kinds), expected);
      assert.equal(a, b);
    }
  }
}
let seed = 232;
const rng = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const bot = { id: 'pair-bot', team: 0 };
const selected = new Set(Array.from({ length: 3000 }, () => api.chooseBotVehicle(bot, [], [], rng)));
assert.deepEqual([...selected].sort(), [...api.VEHICLE_KINDS].sort());
for (const kind of added) for (let i = 0; i < 30; i++) assert.equal(api.chooseBotVehicle(bot, [], [], rng, [kind]), kind);
assert.equal(api.chooseBotVehicle(bot, [], [], rng, []), undefined);
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign']), undefined);
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign', 'hawkt2']), 'hawkt2');
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign', 'su25sm']), 'su25sm');
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign', 'a10c']), 'a10c');
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign', 'f35a']), 'f35a');
assert.equal(api.chooseBotVehicle(bot, [], [], rng, ['foreign', 'j20']), 'j20');
assert.match(readFileSync(resolve(src, 'sim/bots.ts'), 'utf8'), helicopterAppend.length
  ? /yak130: 1, hawkt2: 1, su25sm: 1, a10c: 1, f35a: 1, j20: 1, tu160: 1, ah64d: 1, mi28n: 1 \}/
  : /yak130: 1, hawkt2: 1, su25sm: 1, a10c: 1, f35a: 1, j20: 1, tu160: 1 \}/, 'only explicit verified helicopter append extends old weights');
console.log('PASS original seven 6300 + nine 8100 + eleven 9900 + thirteen 11700 + fifteen 13500 + seventeen 15300 + nineteen 17100 + twenty 18000 + twenty-one 18900 + twenty-two 19800 + twenty-three 20700 = 159300 ticks/specs/rigs/controls/audio/camera parity; 24000 coherent seven/nine/eleven/thirteen/fifteen/seventeen/nineteen/twenty/twenty-one/twenty-two/twenty-three/all25 choices/RNG; all25 bot weights and strict foreign filters');

const repo = resolve(base, '../..');
const historyPin = 'c488b4ab';
const historicalModels = execFileSync('git', ['ls-tree', '-r', '--name-only', historyPin, 'Games/Wings/models'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('.glb'));
assert.equal(historicalModels.length, 50);
const historicalReceipts = ['named', 'expanded', 'six-aircraft', 'four-vessel', 'eight-aircraft', 'five-vessel', 'ten-aircraft', 'twelve-aircraft', 'six-vessel', 'thirteen-aircraft', 'fourteen-aircraft'].map(name => `docs/wings-local-native/${name}-coalition-flight.json`);
for (const path of [...historicalModels, ...historicalReceipts])
  assert.deepEqual(readFileSync(resolve(repo, path)), execFileSync('git', ['show', `${historyPin}:${path}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 }), `${path}: historical bytes unchanged`);
console.log('PASS all 50 previous GLBs and all eleven historical flight receipts byte-exact, including five-vessel setup and ten/thirteen/fourteen-aircraft coverage FAILs');
const preservedPin = '0de93d6e';
const allHistoricalModels = execFileSync('git', ['ls-tree', '-r', '--name-only', preservedPin, 'Games/Wings/models'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('.glb'));
assert.equal(allHistoricalModels.length, 52);
const allHistoricalReceipts = [...historicalReceipts, 'docs/wings-local-native/fifteen-aircraft-coalition-flight.json'];
assert.equal(allHistoricalReceipts.length, 12);
for (const path of [...allHistoricalModels, ...allHistoricalReceipts])
  assert.deepEqual(readFileSync(resolve(repo, path)), execFileSync('git', ['show', `${preservedPin}:${path}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 }), `${path}: all historical bytes unchanged`);
const descriptor = JSON.parse(readFileSync(resolve(base, 'authoring/native-fighter-pair.json')));
const recordsPath = 'authoring/supplied-fighters/repair-record.json';
const repairs = JSON.parse(readFileSync(resolve(base, recordsPath)));
const oldRepairs = JSON.parse(execFileSync('git', ['show', `${preservedPin}:Games/Wings/${recordsPath}`], { cwd: repo, encoding: 'utf8' }));
for (const kind of twentyTwoNative) {
  assert.deepEqual(descriptor.models[kind], twentyTwoDescriptor.models[kind], `${kind}: exact prior fifteen descriptor`);
  assert(oldRepairs.models[kind], `${kind}: historical repair record exists`);
  assert.deepEqual(repairs.models[kind], oldRepairs.models[kind], `${kind}: exact historical repair record`);
}
console.log('PASS all 52 historical GLBs, fifteen descriptors/repair records and TWELVE historical flight receipts byte-exact, including fifteen-kind coverage FAIL');
for (const kind of originalPair) assert.deepEqual(descriptor.models[kind], priorDescriptor.models[kind], `${kind}: exact original descriptor`);
for (const kind of priorNative) assert.deepEqual(descriptor.models[kind], elevenDescriptor.models[kind], `${kind}: exact prior-four descriptor`);
for (const kind of [...priorNative, ...newPair]) assert.deepEqual(descriptor.models[kind], thirteenDescriptor.models[kind], `${kind}: exact prior-six descriptor`);
for (const kind of oldNative) {
  assert.deepEqual(descriptor.models[kind], fifteenDescriptor.models[kind], `${kind}: exact prior-eight descriptor`);
  assert(descriptor.models[kind].controls.every(c => !Object.hasOwn(c, 'pitch_gain')), `${kind}: old ABI unchanged`);
  for (const file of [descriptor.models[kind].file, `models/supplied/${identities[kind][0]}.glb`])
    assert.deepEqual(readFileSync(resolve(base, file)), execFileSync('git', ['show', `${fifteenPin}:Games/Wings/${file}`], { cwd: base }), `${file}: exact old GLB bytes`);
}
for (const kind of seventeenNative) assert.deepEqual(descriptor.models[kind], seventeenDescriptor.models[kind], `${kind}: exact old ten descriptor`);
for (const kind of nineteenNative) assert.deepEqual(descriptor.models[kind], nineteenDescriptor.models[kind], `${kind}: exact old twelve descriptor`);
for (const kind of twentyNative) assert.deepEqual(descriptor.models[kind], twentyDescriptor.models[kind], `${kind}: exact old thirteen descriptor`);
for (const kind of twentyOneNative) assert.deepEqual(descriptor.models[kind], twentyOneDescriptor.models[kind], `${kind}: exact old fourteen descriptor`);
for (const kind of twentyThreeNative) assert.deepEqual(descriptor.models[kind], twentyThreeDescriptor.models[kind], `${kind}: exact prior sixteen descriptor`);
const all54Pin = '87c4ed04';
const all54Models = execFileSync('git', ['ls-tree', '-r', '--name-only', all54Pin, 'Games/Wings/models'], { cwd: repo, encoding: 'utf8' }).trim().split('\n').filter(p => p.endsWith('.glb'));
const all13Receipts = [...allHistoricalReceipts, 'docs/wings-local-native/sixteen-aircraft-coalition-flight.json'];
assert.equal(all54Models.length, 54); assert.equal(all13Receipts.length, 13);
const old16Repairs = JSON.parse(execFileSync('git', ['show', `${all54Pin}:Games/Wings/${recordsPath}`], { cwd: repo, encoding: 'utf8' }));
for (const kind of twentyThreeNative) assert.deepEqual(repairs.models[kind], old16Repairs.models[kind], `${kind}: exact prior sixteen repair entry`);
for (const path of [...all54Models, ...all13Receipts])
  assert.deepEqual(readFileSync(resolve(repo, path)), execFileSync('git', ['show', `${all54Pin}:${path}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 }), `${path}: all54/all13 historical bytes unchanged`);
console.log('PASS all54 older GLBs, sixteen descriptor/repair entries and thirteen historical receipts byte-exact, including sixteen-aircraft coverage FAIL');
assert.deepEqual(Object.keys(descriptor.models), added);
{
  const d = descriptor.models.j20, spec = api.VEHICLES.j20;
  assert.deepEqual(spec.seatWeapons, [['cannon20', 'tvmissile'], ['maverick', null]]);
  assert.equal(spec.cruise, 160); assert.equal(spec.boost, 220); assert.equal(spec.stall, 60); assert.equal(spec.maxHp, 450);
  assert(!spec.stealth, 'J-20 does not opt into native stealth');
  assert.notEqual(spec.model, api.VEHICLES.f35.model, 'distinct supplied J-20, not relabeled old F35');
  assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
  assert.equal(d.file, 'models/derived/wings_j20.glb');
  assert.equal(d.afterburning, false, 'visual opt-out only, not real engine capability');
  assert.deepEqual(api.CONFIG.j20.afterburners, []); assert.deepEqual(api.CONFIG.j20.spinners, []);
  assert.equal(api.CONFIG.j20.doors, undefined);
  assert(!d.native_pivots.some(n => /bay|lift.?fan|gear|hook|rudder/i.test(n)), 'no invented mechanics or renamed whole fins');
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, [c.driver, c.axis, c.gain, c.max_rad]])), {
    elevon_L: ['roll', 'x', -1, .22], elevon_R: ['roll', 'x', 1, .22],
    canard_L: ['pitch', 'x', -1, .22], canard_R: ['pitch', 'x', -1, .22],
    vertical_stabilizer_1: ['yaw', 'y', -1, .28], vertical_stabilizer_2: ['yaw', 'y', -1, .28],
  }, 'actual source elevons/canards/whole fins and Y-axis yaw');
  assert.equal(new Set(d.controls.map(c => c.node)).size, 6);
  assert(d.controls.every(c => !Object.hasOwn(c, 'pitch_gain')));
  assert(Math.abs(d.bounds.max[0] - d.bounds.min[0] - 13.5) < .02, 'approximate art span, not official dimensions');
  assert(Math.abs(d.bounds.max[2] - d.bounds.min[2] - 20.4) < .02, 'approximate art length, not official dimensions');
  assert.deepEqual(d.exhausts.map(e => [e.node, e.anchor]), [['exhaust_core_L', 'exhaust_L'], ['exhaust_core_R', 'exhaust_R']]);
  assert(d.exhausts[0].position[0] < 0 && d.exhausts[1].position[0] > 0, 'separate measured outlets');
  for (const pair of d.hardpoints.missiles) assert(pair[0][0] < -1 && pair[1][0] > 1, 'four generic external arcade stores');
}
{
  const d = descriptor.models.f35a, spec = api.VEHICLES.f35a;
  assert.deepEqual(spec.seatWeapons, [['cannon20', 'aim9'], ['tvmissile', null]]);
  assert.equal(spec.cruise, 145); assert.equal(spec.boost, 200); assert.equal(spec.stall, 55); assert.equal(spec.maxHp, 450);
  assert(!spec.stealth, 'F-35A classname does not opt into native stealth');
  assert(api.VEHICLES.f35.stealth, 'original F-35 keeps stealth');
  assert.notEqual(spec.model, api.VEHICLES.f35.model, 'genuine supplied A, not renamed original F-35');
  assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
  assert.equal(d.file, 'models/derived/wings_f35a.glb');
  assert.equal(d.afterburning, false, 'visual opt-out only, not a real engine capability claim');
  assert.deepEqual(api.CONFIG.f35a.afterburners, []); assert.deepEqual(api.CONFIG.f35a.spinners, []);
  assert.equal(api.CONFIG.f35a.doors, undefined);
  assert(!d.native_pivots.some(n => /bay|lift.?fan|gear|hook/i.test(n)), 'no invented bay/liftfan/gear/naval controls');
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, [c.driver, c.axis, c.gain, c.max_rad]])), {
    flaperon_L: ['roll', 'x', -1, .22], flaperon_R: ['roll', 'x', 1, .22],
    tailplane_L: ['pitch', 'x', -1, .22], tailplane_R: ['pitch', 'x', -1, .22],
    rudder_1: ['yaw', 'y', -1, .28], rudder_2: ['yaw', 'y', -1, .28],
  }, 'actual signed independent F-35A surfaces');
  assert.equal(new Set(d.controls.map(c => c.node)).size, 6);
  assert(d.controls.every(c => !Object.hasOwn(c, 'pitch_gain')));
  assert(Math.abs(d.bounds.max[0] - d.bounds.min[0] - 10.7) < .02);
  assert(Math.abs(d.bounds.max[2] - d.bounds.min[2] - 15.7) < .02);
  assert.deepEqual(d.exhausts.map(e => [e.node, e.anchor]), [['exhaust_core', 'exhaust']]);
  for (const pair of d.hardpoints.missiles) assert(pair[0][0] < -1 && pair[1][0] > 1, 'four external arcade stores');
}
{
  const d = descriptor.models.a10c, spec = api.VEHICLES.a10c;
  assert.deepEqual(spec.seatWeapons, [['gau8', 'aim9'], ['maverick', null]]);
  assert.equal(spec.cruise, 90); assert.equal(spec.boost, 115); assert.equal(spec.stall, 42); assert.equal(spec.maxHp, 600); assert(!spec.stealth);
  assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, c.driver])), { aileron_L: 'roll', aileron_R: 'roll', elevator_L: 'pitch', elevator_R: 'pitch', rudder_L: 'yaw', rudder_R: 'yaw' });
  assert.equal(new Set(d.controls.map(c => c.node)).size, 6);
  assert(d.controls.every(c => !Object.hasOwn(c, 'pitch_gain')));
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, [c.axis, c.gain, c.max_rad]])), {
    aileron_L: ['x', -1, .22], aileron_R: ['x', 1, .22],
    elevator_L: ['x', -1, .22], elevator_R: ['x', -1, .22],
    rudder_L: ['y', -1, .28], rudder_R: ['y', -1, .28],
  }, 'actual signed independent A-10C controls');
  assert.equal(d.file, 'models/derived/wings_a10c.glb'); assert.equal(d.afterburning, false);
  assert.deepEqual(api.CONFIG.a10c.afterburners, []); assert.deepEqual(api.CONFIG.a10c.spinners, []);
  assert(Math.abs(d.bounds.max[0] - d.bounds.min[0] - 17.42) < .02);
  assert(Math.abs(d.bounds.max[2] - d.bounds.min[2] - 16.16) < .02);
  assert.equal(d.exhausts.length, 2);
  assert(d.exhausts.every(e => e.position[1] > 1 && e.position[2] > 5), 'actual raised rear twin outlets');
  assert(d.exhausts[0].position[0] < -1 && d.exhausts[1].position[0] > 1, 'independent left/right turbofans');
  assert(!d.native_pivots.some(n => /gau8|barrel/.test(n)), 'generic barrel adapter has no fabricated rotary gun rig');
  assert.notEqual(spec.model, api.VEHICLES.warthog.model, 'supplied A-10C never relabels the original Warthog');
}
{
  const d = descriptor.models.su25sm, spec = api.VEHICLES.su25sm;
  assert.deepEqual(spec.seatWeapons, [['cannon20', 'aim9'], ['maverick', null]]);
  assert.equal(spec.cruise, 100); assert.equal(spec.boost, 130); assert.equal(spec.stall, 44); assert.equal(spec.maxHp, 550); assert(!spec.stealth);
  assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, c.driver])), { aileron_L: 'roll', aileron_R: 'roll', elevator_L: 'pitch', elevator_R: 'pitch', rudder_center: 'yaw' });
  assert.equal(new Set(d.controls.map(c => c.node)).size, 5);
  assert(d.controls.every(c => !Object.hasOwn(c, 'pitch_gain')), 'independent real surfaces, not fake elevons');
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, [c.axis, c.gain, c.max_rad]])), {
    aileron_L: ['x', -1, .22], aileron_R: ['x', 1, .22],
    elevator_L: ['x', -1, .22], elevator_R: ['x', -1, .22], rudder_center: ['y', -1, .28],
  }, 'source-specific signed aileron/elevator/rudder ABI');
  assert.equal(d.file, 'models/derived/wings_su25sm.glb');
  assert.equal(d.afterburning, false);
  assert.deepEqual(api.CONFIG.su25sm.afterburners, []); assert.deepEqual(api.CONFIG.su25sm.spinners, []);
}
for (const [kind, cruise, boost, officer] of [['fa50', 130, 180, 'tvmissile'], ['yak130', 105, 140, 'maverick'], ['hawkt2', 95, 125, 'maverick']]) {
  const spec = api.VEHICLES[kind], d = descriptor.models[kind];
  assert.deepEqual(spec.seatWeapons, [['cannon20', 'aim9'], [officer, null]]);
  assert.equal(spec.cruise, cruise); assert.equal(spec.boost, boost); assert(!spec.stealth);
  assert.equal(spec.radius, Math.max(...d.bounds.max.map((v, i) => v - d.bounds.min[i])) / 2);
  assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, c.driver])), { elevon_L: 'roll', elevon_R: 'roll', tailplane_L: 'pitch', tailplane_R: 'pitch', rudder_1: 'yaw' });
  assert.equal(new Set(d.controls.map(c => c.node)).size, 5);
  assert(d.controls.every(c => !Object.hasOwn(c, 'pitch_gain')));
  assert.equal(d.file, `models/derived/wings_${kind}.glb`);
}
assert.equal(descriptor.models.yak130.afterburning, false);
assert.deepEqual(Object.entries(descriptor.models).filter(([, d]) => Object.hasOwn(d, 'afterburning')).map(([k]) => k), ['yak130', 'hawkt2', 'su25sm', 'a10c', 'f35a', 'j20']);
assert.equal(descriptor.models.hawkt2.afterburning, false);
assert.deepEqual(api.CONFIG.hawkt2.afterburners, []);
assert.deepEqual(api.CONFIG.hawkt2.spinners, []);
assert.deepEqual(api.CONFIG.yak130.afterburners, []);
assert.deepEqual(api.CONFIG.yak130.spinners, []);
assert.equal(api.CONFIG.fa50.afterburners.length, 1);
for (const [kind, cruise, boost, officer] of [['mirage2000', 145, 205, 'tvmissile'], ['su34', 140, 190, 'maverick']]) {
  assert.deepEqual(api.VEHICLES[kind].seatWeapons, [['cannon20', 'aim9'], [officer, null]]);
  assert.equal(api.VEHICLES[kind].cruise, cruise); assert.equal(api.VEHICLES[kind].boost, boost);
  assert(!api.VEHICLES[kind].stealth);
  const { bounds } = descriptor.models[kind];
  assert.equal(api.VEHICLES[kind].radius, Math.max(...bounds.max.map((v, i) => v - bounds.min[i])) / 2);
}
for (const [kind, cruise, boost, officer] of [['gripen', 140, 195, 'maverick'], ['mig31', 185, 250, 'tvmissile']]) {
  assert.deepEqual(api.VEHICLES[kind].seatWeapons, [['cannon20', 'aim9'], [officer, null]]);
  assert.equal(api.VEHICLES[kind].cruise, cruise); assert.equal(api.VEHICLES[kind].boost, boost);
  assert(!api.VEHICLES[kind].stealth);
  const { bounds } = descriptor.models[kind];
  assert.equal(api.VEHICLES[kind].radius, Math.max(...bounds.max.map((v, i) => v - bounds.min[i])) / 2);
}
for (const [kind, cruise, boost] of [['rafale', 145, 200], ['jf17', 135, 190]]) {
  assert.deepEqual(api.VEHICLES[kind].seatWeapons, [['cannon20', 'aim9'], ['maverick', null]]);
  assert.equal(api.VEHICLES[kind].cruise, cruise); assert.equal(api.VEHICLES[kind].boost, boost);
  const { bounds } = descriptor.models[kind];
  assert.equal(api.VEHICLES[kind].radius, Math.max(...bounds.max.map((v, i) => v - bounds.min[i])) / 2);
}
assert.deepEqual(api.VEHICLES.typhoon.seatWeapons, [['cannon20', 'aim9'], ['tvmissile', null]]);
assert.deepEqual(api.VEHICLES.su35s.seatWeapons, [['cannon20', 'tvmissile'], ['maverick', null]]);
for (const kind of ['typhoon', 'su35s']) {
  assert.equal(api.VEHICLES[kind].cruise, 155); assert.equal(api.VEHICLES[kind].boost, 215);
  assert(Number.isFinite(api.VEHICLES[kind].radius) && api.VEHICLES[kind].radius > 0);
}
assert(api.VEHICLES.su35s.radius > api.VEHICLES.typhoon.radius, 'larger measured Su-35S collision silhouette');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const entity = (kind, id = kind, team = 0, position = [0, 5000, 0]) => ({ id, kind, team, alive: true,
  flight: api.createFlightState(kind, { position, yaw: 0, onGround: false }), hp: api.VEHICLES[kind].maxHp, maxHp: api.VEHICLES[kind].maxHp,
  seats: [`${id}-pilot`, `${id}-officer`], aim: [null, null], weapons: api.createWeapons(kind),
  flareCount: 12, flaresReadyAt: 0, abilityReadyAt: 0, spottedUntil: 0, lastDamagedBy: null, spawnedAt: 0 });
{
  const legacy = entity('warthog'), cs = api.createCombatState(); cs.ships = {}; cs.turrets = [];
  api.applySeatInput(cs, legacy, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: true, flares: false, ability: false }, [legacy], 100, []);
  assert.deepEqual(legacy.weapons[0].map(w => w.ammo), [1099, 37], 'original Warthog gun and rockets unchanged');
  assert.deepEqual(cs.projectiles.map(p => p.weapon), ['gau8', 'rockets']);
}
// Static high-altitude CPU fixtures exercise every registered incoming-damage path.
for (const kind of api.VEHICLE_KINDS) {
  assert(Number.isFinite(api.ARMOR[kind]) && api.ARMOR[kind] > 0, `${kind}: mandatory finite native armor`);
  const attacker = entity('fighter', `${kind}-all-attacker`), victim = entity(kind, `${kind}-all-victim`, 1, [0, 5000, -120]);
  const cs = api.createCombatState(); cs.ships = {}; cs.turrets = [];
  for (let tick = 0; tick < 60; tick++) {
    const now = 100 + tick / 60;
    api.applySeatInput(cs, attacker, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [attacker, victim], now, []);
    api.stepCombat(cs, [attacker, victim], 1 / 60, now, []);
    assert(Number.isFinite(victim.hp), `${kind}: finite incoming HP every tick`);
  }
  assert(victim.hp < victim.maxHp, `${kind}: actual native incoming damage`);
}
console.log(`PASS all ${api.VEHICLE_KINDS.length} registered kinds: finite positive armor and actual incoming cannon damage, ${api.VEHICLE_KINDS.length * 60} combat ticks (CPU fixtures)`);
// Numeric AudioParam spies exercise real voice/update/release logic, not audible output.
function engineSignature(module, kind) {
  const values = [], nodes = [];
  const node = () => {
    const n = { connect() {}, disconnect() {}, start() { this.started = true; }, stop() { this.stopped = true; } };
    const index = nodes.push(n) - 1;
    for (const key of ['gain', 'frequency', 'detune', 'playbackRate', 'Q', 'positionX', 'positionY', 'positionZ'])
      n[key] = { value: 0, cancelScheduledValues() {}, setTargetAtTime(value) { assert(Number.isFinite(value), `${kind}: finite ${key}`); this.value = value; values.push([index, key, value]); } };
    return n;
  };
  const ctx = { currentTime: 0, createGain: node, createBiquadFilter: node, createPanner: node, createOscillator: node, createBufferSource: node };
  const core = { ctx, now: 0, engineBus: node(), bank: { pink: {}, brown: {}, rotor: {} }, hrtfInUse: 0, distanceTo: () => 0, doppler: () => 1 };
  const me = entity(kind), voice = new module.EngineVoice(core, 'audio-fixture', kind, me);
  if (kind === 'yak130' || deliveryKinds.includes(kind) || kind === 'f35a') assert.equal(voice.burner, null, `${kind}: no synthesized burner layer`);
  for (const throttle of [0, .5, 1]) { me.flight.throttle = throttle; core.now += .1; voice.update(me, true, false); }
  voice.release(); assert(voice.dying && Number.isFinite(voice.stopAt)); voice.dispose();
  assert(nodes.some(n => n.started)); assert(nodes.filter(n => n.started).every(n => n.stopped));
  assert.equal(core.hrtfInUse, 0);
  return values;
}
for (const kind of nine.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(nine, kind), `${kind}: original-nine actual engine parameter parity`);
assert.notDeepEqual(engineSignature(api, 'typhoon'), engineSignature(api, 'su35s'), 'distinct new synthesized engine parameters');
for (const kind of eleven.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(eleven, kind), `${kind}: original-eleven actual engine parameter parity`);
for (const kind of thirteen.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(thirteen, kind), `${kind}: original-thirteen actual engine parameter parity`);
for (const kind of fifteen.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(fifteen, kind), `${kind}: original-fifteen actual engine parameter parity`);
for (const kind of seventeen.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(seventeen, kind), `${kind}: original-seventeen actual engine parameter parity`);
for (const kind of nineteen.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(nineteen, kind), `${kind}: original-nineteen actual engine parameter parity`);
for (const kind of twenty.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(twenty, kind), `${kind}: original-twenty actual engine parameter parity`);
for (const kind of twentyOne.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(twentyOne, kind), `${kind}: original-twenty-one actual engine parameter parity`);
for (const kind of twentyTwo.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(twentyTwo, kind), `${kind}: original-twenty-two actual engine parameter parity`);
for (const kind of twentyThree.VEHICLE_KINDS) assert.deepEqual(engineSignature(api, kind), engineSignature(twentyThree, kind), `${kind}: original-twenty-three actual engine parameter parity`);
const signatures = added.map(kind => JSON.stringify(engineSignature(api, kind)));
assert.equal(new Set(signatures).size, added.length, 'seventeen distinct finite native synthesized voices');
console.log('PASS original nine/eleven/thirteen/fifteen/seventeen/nineteen/twenty/twenty-one/twenty-two/twenty-three actual engine parameters unchanged; seventeen distinct finite engine graphs and release/disposal (Yak/Hawk/Su25/A10C/F35A/J20 no native burner layer, not real engine capability or audible acceptance)');
const near = (a, b, label = 'coordinates') => assert(new T.Vector3(...a).distanceTo(new T.Vector3(...b)) < 1e-4, `${label}: ${a} vs ${b}`);
const saved = { fetch: globalThis.fetch, self: globalThis.self, bitmap: globalThis.createImageBitmap };
const { GLTFLoader } = await import(pathToFileURL(resolve(three, 'examples/jsm/loaders/GLTFLoader.js')));
const boxes = [];
try {
  globalThis.self = globalThis;
  // Node lacks ImageBitmap. Instrument PNG dimensions only; this proves map/UV identity, not texel rendering.
  globalThis.createImageBitmap = async blob => {
    const bytes = Buffer.from(await blob.arrayBuffer());
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), sha256: hash(bytes), close() {} };
  };
  globalThis.fetch = async input => {
    const url = typeof input === 'string' ? input : input.url;
    if (url.startsWith('blob:')) return saved.fetch(input);
    assert.match(url, /^\/models\/(?:derived\/)?[\w.-]+\.glb$/);
    return new Response(readFileSync(resolve(base, url.slice(1))));
  };
  for (const reference of [fifteen, seventeen, nineteen, twenty, twentyOne, twentyTwo, twentyThree]) for (const kind of reference.VEHICLE_KINDS) {
    const views = [api.createAircraftView(kind, 0, 'low'), reference.createAircraftView(kind, 0, 'low'), api.createAircraftView(kind, 0, 'low')];
    try {
      const deadline = performance.now() + 15000;
      while (views.some(v => !v.ready) && performance.now() < deadline) await delay(1);
      assert(views.every(v => v.ready), `${kind}: prior ${reference.VEHICLE_KINDS.length}-kind real templates ready`);
      const me = entity(kind), camera = new T.PerspectiveCamera();
      camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true);
      views.forEach(v => v.setLocal(true));
      const controls = api.CONFIG[kind].controls;
      const zeroControls = controls?.map(c => ({ ...c, pitch_gain: c.pitch_gain ?? 0 }));
      for (const rates of [[0, 0, 0], [100, 0, 0], [0, -100, 0], [0, 0, 100], [.17, -.23, -.31], [-100, 100, -100], [0, 0, 0]]) {
        me.flight.angularVelocity = rates;
        for (let tick = 0; tick < 180; tick++) {
          views[0].update(me, [], 1 / 60, camera); views[1].update(me, [], 1 / 60, camera);
          api.CONFIG[kind].controls = zeroControls;
          try { views[2].update(me, [], 1 / 60, camera); } finally { api.CONFIG[kind].controls = controls; }
          const bones = v => v.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones;
          const reference = bones(views[0]);
          for (const view of views.slice(1)) bones(view).forEach((b, i) => {
            assert.equal(b.name, reference[i].name);
            assert.deepEqual(b.position.toArray(), reference[i].position.toArray(), `${kind}: old bone position`);
            assert.deepEqual(b.scale.toArray(), reference[i].scale.toArray(), `${kind}: old bone scale`);
            assert(b.quaternion.angleTo(reference[i].quaternion) < 1e-7, `${kind}/${b.name}: old/optional-zero bone pose parity`);
          });
        }
      }
      if (kind === 'f35' && reference === twentyTwo) {
        const doors = v => v.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones.filter(b => b.name.startsWith('bay_door_'));
        const rest = doors(views[0]).map(b => b.quaternion.clone());
        assert.equal(rest.length, 2);
        for (const [seat, slot] of [[0, 0], [0, 1], [1, 0]]) {
          views.forEach(v => v.setFiring(seat, slot, true));
          for (let tick = 0; tick < 180; tick++) views.forEach(v => v.update(me, [], 1 / 60, camera));
          doors(views[0]).forEach((b, i) => {
            assert.equal(b.quaternion.angleTo(rest[i]) > .1, slot === 1 || seat === 1, 'original F35 bay triggers exclude cannon');
            for (const v of views.slice(1)) assert(b.quaternion.angleTo(doors(v)[i].quaternion) < 1e-7, 'original F35 actual bay pose parity');
          });
          views.forEach(v => v.setFiring(seat, slot, false));
          // Existing bay closure is exponential, not an instant snap to rest.
          for (let tick = 0; tick < 1200; tick++) views.forEach(v => v.update(me, [], 1 / 60, camera));
          doors(views[0]).forEach((b, i) => assert(b.quaternion.angleTo(rest[i]) < 1e-7, 'original F35 bay closes'));
        }
        console.log('PASS original F35 actual recessed bay rig: pilot/officer missile triggers, cannon exclusion and return match old22 exactly');
      }
      if (kind === 'warthog') {
        const barrel = v => v.root.getObjectByName('model').children.find(m => m.isSkinnedMesh).skeleton.bones.find(b => b.name === 'gau8_barrels');
        const rest = barrel(views[0]).quaternion.clone();
        views.forEach(v => v.setFiring(0, 0, true));
        for (let tick = 0; tick < 180; tick++) {
          views.forEach(v => v.update(me, [], 1 / 60, camera));
          for (const v of views.slice(1)) assert(barrel(v).quaternion.angleTo(barrel(views[0]).quaternion) < 1e-7, 'original Warthog actual gun-spin parity');
        }
        assert(barrel(views[0]).quaternion.angleTo(rest) > .01, 'original Warthog retains real spinning barrel');
      }
    } finally { views.forEach(v => v.dispose()); }
  }
  console.log('PASS all old fifteen/seventeen/nineteen/twenty/twenty-one/twenty-two/twenty-three actual native bone poses: rest/pitch/yaw/roll/mixed/clamp/return; absent pitch_gain equals explicit zero, existing mixed gain retained, pinned old renderers');
  for (const kind of added) {
    const d = descriptor.models[kind], spec = api.VEHICLES[kind], cfg = api.CONFIG[kind];
    assert.equal(descriptor.archive_sha256, '4e37a104ba356790f6f9a0632c99d34b77dc023649e3cab830d895ec55c471d8');
    const [slug, sourceHash] = identities[kind];
    assert.equal(d.source_model_id, `wings.original.${slug}.v1`);
    assert.equal(d.source_sha256, sourceHash);
    assert.equal(hash(readFileSync(resolve(base, `models/supplied/${slug}.glb`))), d.source_sha256);
    assert.equal(spec.model, d.file);
    assert.deepEqual(cfg.stores.map(g => [g.weapons, g.order]), [
      [[[0, 1]], ['missile_L2', 'missile_R2']], [[[1, 0]], ['missile_L1', 'missile_R1']],
    ], 'two stores per native missile slot');
    if (['typhoon', 'su35s', ...newPair, ...nextPair].includes(kind)) {
      const pitch = ['typhoon', 'rafale', 'gripen'].includes(kind) ? 'canard' : 'tailplane';
      const expected = { elevon_L: 'roll', elevon_R: 'roll', [`${pitch}_L`]: 'pitch', [`${pitch}_R`]: 'pitch', rudder_1: 'yaw' };
      if (kind === 'su35s' || kind === 'mig31') expected.rudder_2 = 'yaw';
      assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, c.driver])), expected, 'actual source-specific control channels');
      assert.equal(d.file, `models/derived/wings_${kind}.glb`);
    }
    if (latestPair.includes(kind)) {
      const expected = kind === 'mirage2000'
        ? { elevon_L: 'roll', elevon_R: 'roll', rudder_1: 'yaw' }
        : { elevon_L: 'roll', elevon_R: 'roll', canard_L: 'pitch', canard_R: 'pitch', tailplane_L: 'pitch', tailplane_R: 'pitch', rudder_1: 'yaw', rudder_2: 'yaw' };
      assert.deepEqual(Object.fromEntries(d.controls.map(c => [c.node, c.driver])), expected);
      assert.equal(new Set(d.controls.map(c => c.node)).size, d.controls.length, 'one control per actual pivot');
      if (kind === 'mirage2000') assert.deepEqual(d.controls.filter(c => c.driver === 'roll').map(c => [c.gain, c.pitch_gain]), [[-1, -1], [1, -1]], 'delta elevon pitch/roll ABI');
      else assert(d.controls.filter(c => c.driver === 'pitch').length === 4, 'Su-34 four real pitch surfaces');
      assert.equal(d.file, `models/derived/wings_${kind}.glb`);
    }
    assert.deepEqual(cfg.shadow, [d.bounds.max[0] - d.bounds.min[0], d.bounds.max[2] - d.bounds.min[2]], 'measured native shadow');
    const bytes = readFileSync(resolve(base, d.file));
    assert.equal(hash(bytes), d.sha256);
    const raw = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    raw.scene.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(raw.scene); boxes.push(box.getSize(new T.Vector3()).toArray());
    near(box.min.toArray(), d.bounds.min, 'actual min'); near(box.max.toArray(), d.bounds.max, 'actual max');
    assert(box.max.z - box.min.z > 10 && box.max.z - box.min.z < 25, 'metre-unit fighter length');
    for (const root of raw.scene.children) {
      near(root.scale.toArray(), [1, 1, 1]); near(root.position.toArray(), [0, 0, 0]);
      assert(root.quaternion.angleTo(new T.Quaternion()) < 1e-6, 'canonical identity root');
    }
    const point = name => { const node = raw.scene.getObjectByName(name); assert(node, name); return node.getWorldPosition(new T.Vector3()).toArray(); };
    near(point('gun_muzzle'), d.hardpoints.gun);
    near(point('cockpit_eye'), d.cockpit);
    assert(d.cockpit[2] < 0 && d.hardpoints.gun[2] < 0, 'native -Z forward');
    for (const [seat, pair] of d.hardpoints.missiles.entries()) for (const [rail, p] of pair.entries()) near(point(`missile_${rail ? 'R' : 'L'}${seat ? 1 : 2}_launch`), p);
    for (const e of d.exhausts) { near(point(e.anchor), e.position); assert(e.position[2] > 0, 'aft +Z exhaust'); }
    assert.equal(d.exhausts.length, ['f16c', 'jf17', 'gripen', 'mirage2000', 'fa50', 'hawkt2', 'f35a'].includes(kind) ? 1 : 2);
    if ([...trainerPair, ...deliveryKinds].includes(kind)) {
      assert.deepEqual(d.exhausts.map(e => [e.node, e.anchor]), kind === 'fa50' ? [['afterburner', 'exhaust']] : kind === 'hawkt2' || kind === 'f35a' ? [['exhaust_core', 'exhaust']] : [['exhaust_core_L', 'exhaust_L'], ['exhaust_core_R', 'exhaust_R']]);
      assert(d.exhausts.every(e => d.native_pivots.includes(e.node)));
    }
    if (newPair.includes(kind)) {
      assert.deepEqual(d.exhausts.map(e => [e.node, e.anchor]), kind === 'rafale'
        ? [['afterburner_L', 'exhaust_L'], ['afterburner_R', 'exhaust_R']] : [['afterburner', 'exhaust']]);
    }
    if (nextPair.includes(kind)) assert.deepEqual(d.exhausts.map(e => [e.node, e.anchor]), kind === 'gripen'
      ? [['afterburner', 'exhaust']] : [['afterburner_L', 'exhaust_L'], ['afterburner_R', 'exhaust_R']]);
    const view = api.createAircraftView(kind, 0, 'low');
    try {
      const deadline = performance.now() + 15000;
      while (!view.ready && performance.now() < deadline) await delay(1);
      assert(view.ready, `${kind}: actual native loader/template ready`);
      assert(!view.root.getObjectByName('placeholder'));
      const model = view.root.getObjectByName('model'), meshes = model.children.filter(m => m.isSkinnedMesh);
      assert(meshes.length > 0 && meshes.every(m => m.visible));
      let rawTriangles = 0, rawVertices = 0;
      raw.scene.traverse(m => { if (m.isMesh) { rawTriangles += m.geometry.index.count / 3; rawVertices += m.geometry.getAttribute('position').count; } });
      const bodyMeshes = meshes.filter(m => m.name !== 'flame');
      assert.equal(bodyMeshes.reduce((n, m) => n + m.geometry.index.count / 3, 0), rawTriangles, 'no source triangles dropped by batching');
      assert.equal(bodyMeshes.reduce((n, m) => n + m.geometry.getAttribute('position').count, 0), rawVertices, 'no source vertices dropped by batching');
      assert.equal(api.aircraftStats(kind).triangles, rawTriangles + cfg.afterburners.length * 196, 'exact source plus applicable existing flame cones');
      const skeleton = meshes[0].skeleton;
      const bone = name => { const b = skeleton.bones.find(b => b.name === name); assert(b, name); return b; };
      const attached = name => {
        const index = skeleton.bones.indexOf(bone(name));
        return meshes.some(m => { const skin = m.geometry.getAttribute('skinIndex'); for (let i = 0; i < skin.count; i++) if (skin.getX(i) === index) return true; return false; });
      };
      for (const name of [...d.controls.map(c => c.node), ...cfg.stores.flatMap(g => g.order), ...d.exhausts.map(e => e.node)]) assert(attached(name), `${name}: real geometry on native bone`);
      let mapped = 0;
      raw.scene.traverse(mesh => {
        if (!mesh.isMesh) return;
        const source = mesh.material;
        if (!source.map) return;
        mapped++;
        const dest = meshes.find(m => m.material.map?.image === source.map.image ||
          (m.material.map && m.material.color.equals(source.color) && m.material.roughness === source.roughness && m.material.metalness === source.metalness));
        assert(dest, 'source body PBR/map coverage');
        for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) {
          assert.equal(!!dest.material[key], !!source[key]);
          if (source[key]) assert.equal(dest.material[key].image.sha256, source[key].image.sha256, `${key}: exact embedded PNG bytes`);
        }
        assert.equal(dest.material.opacity, source.opacity);
        assert.equal(dest.material.transparent, source.transparent);
        assert(dest.geometry.hasAttribute('uv'));
        const sourceUV = mesh.geometry.getAttribute('uv'), destUV = dest.geometry.getAttribute('uv');
        const uvSet = new Set(Array.from({ length: destUV.count }, (_, i) => `${destUV.getX(i)},${destUV.getY(i)}`));
        for (let i = 0; i < sourceUV.count; i++) assert(uvSet.has(`${sourceUV.getX(i)},${sourceUV.getY(i)}`), 'source UV coverage');
      });
      assert(mapped > 0, 'supplied body maps actually present');
      const me = entity(kind), camera = new T.PerspectiveCamera(); camera.position.fromArray(me.flight.position); camera.updateMatrixWorld(true);
      view.setLocal(true);
      const update = (ticks = 1) => { for (let i = 0; i < ticks; i++) view.update(me, [], 1 / 60, camera); view.root.updateMatrixWorld(true); };
      update();
      for (const q of [[0, 0, 0, 1], [0, Math.SQRT1_2, 0, Math.SQRT1_2]]) {
        me.flight.orientation = q; update();
        const worldPoint = p => new T.Vector3(...p).applyQuaternion(new T.Quaternion(...q)).add(new T.Vector3(...me.flight.position)).toArray();
        near(view.anchors.get('gun').getWorldPosition(new T.Vector3()).toArray(), worldPoint(d.hardpoints.gun));
        near(api.muzzlePosition(me, 0, spec.seatWeapons[0][0], [0, 0, 0]), worldPoint(d.hardpoints.gun));
        for (const e of d.exhausts) near(view.anchors.get(e.anchor).getWorldPosition(new T.Vector3()).toArray(), worldPoint(e.position), `${kind}: actual rotated exhaust anchor`);
        for (const seat of [0, 1]) for (const rail of [0, 1]) near(api.muzzlePosition(me, seat, spec.seatWeapons[seat][seat ? 0 : 1], [0, 0, 0], rail), worldPoint(d.hardpoints.missiles[seat][rail]));
        const rig = new api.CameraRig(new T.PerspectiveCamera()); rig.cockpitBody(1 / 60, kind, me.flight.position, q, 0, 0);
        near(rig.pos.toArray(), worldPoint(d.cockpit));
        if ([...nextPair, ...latestPair, ...trainerPair, ...deliveryKinds].includes(kind)) {
          rig.apply(1 / 60);
          near(rig.camera.position.toArray(), worldPoint(d.cockpit), `${kind}: applied real rotated cockpit camera`);
          assert(rig.camera.quaternion.angleTo(new T.Quaternion(...q)) < 1e-6);
        }
      }
      me.flight.orientation = [0, 0, 0, 1]; update();
      const rests = d.controls.map(c => bone(c.node).quaternion.clone());
      for (const sign of [-1, 1]) {
        me.flight.angularVelocity = [sign * 100, sign * 100, sign * 100]; update(180);
        d.controls.forEach((c, i) => {
          const expected = rests[i].clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(c.axis === 'x' ? 1 : 0, c.axis === 'y' ? 1 : 0, c.axis === 'z' ? 1 : 0), Math.sign(sign * (c.gain + (c.pitch_gain ?? 0))) * c.max_rad));
          assert(bone(c.node).quaternion.angleTo(expected) < 1e-4, `${c.node}: signed limited deflection from rest`);
        });
      }
      me.flight.angularVelocity = [0, 0, 0]; update(180);
      d.controls.forEach((c, i) => assert(bone(c.node).quaternion.angleTo(rests[i]) < 1e-4));
      for (const [axis, driver] of ['pitch', 'yaw', 'roll'].entries()) {
        for (const sign of [-1, 1]) {
          me.flight.angularVelocity = [0, 0, 0]; me.flight.angularVelocity[axis] = sign * 100; update(180);
          d.controls.forEach((c, i) => {
            const gain = (c.driver === driver ? c.gain : 0) + (driver === 'pitch' ? c.pitch_gain ?? 0 : 0);
            const angle = Math.sign(sign * gain) * c.max_rad;
            const expected = rests[i].clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(c.axis === 'x' ? 1 : 0, c.axis === 'y' ? 1 : 0, c.axis === 'z' ? 1 : 0), angle));
            assert(bone(c.node).quaternion.angleTo(expected) < 1e-4, `${c.node}: isolated ${driver} signed pose`);
          });
        }
      }
      me.flight.angularVelocity = [0, 0, 0]; update(180);
      d.controls.forEach((c, i) => assert(bone(c.node).quaternion.angleTo(rests[i]) < 1e-4));
      if (latestPair.includes(kind) || kind === 'su25sm' || kind === 'a10c' || kind === 'f35a' || kind === 'j20') {
        for (const rates of [[.1, 0, 0], [0, .1, 0], [0, -.1, 0], [0, 0, .1], [.12, 0, -.08], [100, 0, -100], [-100, 0, 100], [0, 0, 0]]) {
          me.flight.angularVelocity = rates; update(180);
          d.controls.forEach((c, i) => {
            const rate = rates[c.driver === 'pitch' ? 0 : c.driver === 'yaw' ? 1 : 2];
            const angle = Math.max(-c.max_rad, Math.min(c.max_rad, rate * c.gain + (c.pitch_gain ?? 0) * rates[0]));
            const expected = rests[i].clone().multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(c.axis === 'x' ? 1 : 0, c.axis === 'y' ? 1 : 0, c.axis === 'z' ? 1 : 0), angle));
            assert(bone(c.node).quaternion.angleTo(expected) < 1e-5, `${kind}/${c.node}: actual mixed/clamped/rest control`);
          });
          if (kind === 'mirage2000' && rates[1] === 0 && (rates[0] === 0 || rates[2] === 0)) {
            const left = rests[0].clone().invert().multiply(bone('elevon_L').quaternion);
            const right = rests[1].clone().invert().multiply(bone('elevon_R').quaternion);
            assert(left.angleTo(rates[0] === 0 ? right.invert() : right) < 1e-5, 'actual delta pure pitch symmetric / pure roll antisymmetric');
          }
        }
        console.log(`PASS ${kind}: real pure-pitch/pure-roll/mixed-clamp/rest bone poses, no duplicate pivots`);
      }
      for (const group of cfg.stores) {
        const [seat, slot] = group.weapons[0], id = spec.seatWeapons[seat][slot], w = api.WEAPONS[id];
        assert.equal(w.ammo, 2);
        const shooter = entity(kind, `${kind}-${seat}`), target = entity('fighter', 'target', 1, [0, 5000, -600]);
        const cs = api.createCombatState(); cs.ships = {}; cs.turrets = [];
        const events = [], input = { aim: [0, 0, -1], firePrimary: false, fireSecondary: false, flares: false, ability: false };
        let now = 100;
        for (let tick = 0; tick < Math.ceil(w.lockTime * 60) + 1; tick++) {
          api.applySeatInput(cs, shooter, seat, input, [shooter, target], now, events); api.stepCombat(cs, [shooter, target], 1 / 60, now, events); now += 1 / 60;
        }
        assert.equal(shooter.weapons[seat][slot].lock, 1);
        input.firePrimary = slot === 0; input.fireSecondary = slot === 1;
        api.applySeatInput(cs, shooter, seat, input, [shooter, target], now, events);
        assert.equal(shooter.weapons[seat][slot].ammo, 1); assert.equal(cs.missiles.length, 1);
        const missile = cs.missiles[0]; assert.equal(missile.owner, shooter.seats[seat]); assert.equal(missile.weapon, id);
        near(missile.position.map((n, i) => n + missile.velocity[i] / 60), api.muzzlePosition(shooter, seat, id, [0, 0, 0], 0));
        view.update(shooter, [], 1 / 60, camera);
        assert(bone(group.order[0]).scale.x < .001 && bone(group.order[1]).scale.x > .9);
        me.weapons[seat][slot].ammo = 0; update(); assert(group.order.every(name => bone(name).scale.x < .001));
        const regen = api.createCombatState(); regen.ships = {}; regen.turrets = [];
        for (let count = 1; count <= 2; count++) {
          api.stepCombat(regen, [me], w.refill / 2, 200 + count * w.refill, []); update();
          assert.equal(me.weapons[seat][slot].ammo, count); assert.equal(group.order.filter(name => bone(name).scale.x > .9).length, count);
        }
      }
      const cs = api.createCombatState(), ammo = me.weapons[0][0].ammo; cs.ships = {}; cs.turrets = [];
      api.applySeatInput(cs, me, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [me], 100, []);
      const gunId = spec.seatWeapons[0][0], gun = api.WEAPONS[gunId];
      assert.equal(gun.kind, 'gun');
      assert.equal(me.weapons[0][0].ammo, ammo - 1); assert(cs.projectiles.some(p => p.weapon === gunId));
      if (kind === 'a10c') {
        assert.equal(gunId, 'gau8'); assert.deepEqual(gun, twentyOne.WEAPONS.gau8, 'unchanged native GAU-8 ballistics/ammo/rate');
        assert.equal(ammo, gun.ammo); assert.equal(cs.projectiles.length, 1);
        const p = cs.projectiles[0];
        assert.equal(p.owner, me.seats[0]); assert.equal(p.vehicle, me.id); assert.equal(p.ttl, gun.ttl);
        assert(Math.abs(Math.hypot(...p.velocity.map((n, i) => n - me.flight.velocity[i])) - gun.speed) < 1e-6);
        near(p.position.map((n, i) => n + p.velocity[i] / 60), api.muzzlePosition(me, 0, gunId, [0, 0, 0]));
        assert(Math.abs(me.weapons[0][0].readyAt - (100 + 1 / gun.rate)) < 1e-8);
        api.applySeatInput(cs, me, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [me], 100, []);
        assert.equal(me.weapons[0][0].ammo, ammo - 1, 'native cooldown blocks duplicate fire');
        api.applySeatInput(cs, me, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [me], 100 + 1 / gun.rate, []);
        assert.equal(me.weapons[0][0].ammo, ammo - 2); assert.equal(cs.projectiles.length, 2);
        console.log('PASS A-10C real native gau8 fire, ballistics, owner/source, muzzle, 1100 ammo and 30Hz cooldown; generic source barrel, no rotary rig claim');
      }
      if (kind === 'f35a' || kind === 'j20') {
        assert.equal(gunId, 'cannon20'); assert.deepEqual(gun, twentyTwo.WEAPONS.cannon20);
        const p = cs.projectiles[0];
        assert.equal(p.owner, me.seats[0]); assert.equal(p.vehicle, me.id); assert.equal(p.ttl, gun.ttl);
        near(p.position.map((n, i) => n + p.velocity[i] / 60), api.muzzlePosition(me, 0, gunId, [0, 0, 0]));
        assert(Math.abs(Math.hypot(...p.velocity.map((n, i) => n - me.flight.velocity[i])) - gun.speed) < 1e-6);
        api.applySeatInput(cs, me, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [me], 100, []);
        assert.equal(me.weapons[0][0].ammo, ammo - 1, 'existing cannon cooldown');
        api.stepCombat(cs, [me], gun.refill, 200, []);
        assert.equal(me.weapons[0][0].ammo, gun.ammo, 'actual native cannon regeneration');
        console.log(`PASS ${kind} actual generic cannon20 owner/source/muzzle/ballistics/cooldown/ammo regeneration; both fitted missile locks/fire/stores regenerated above, no real caliber/fit claim`);
      }
      // Static high-altitude CPU combat fixture: new target kinds must take
      // finite native incoming damage (missing ARMOR entries formerly yield NaN).
      {
        assert.equal(api.ARMOR[kind], 1, `${kind}: actual parent-owned armor`);
        const attacker = entity('fighter', `${kind}-attacker`), victim = entity(kind, `${kind}-victim`, 1, [0, 5000, -120]);
        const incoming = api.createCombatState(); incoming.ships = {}; incoming.turrets = [];
        for (let tick = 0; tick < 60; tick++) {
          const now = 100 + tick / 60;
          api.applySeatInput(incoming, attacker, 0, { aim: [0, 0, -1], firePrimary: true, fireSecondary: false, flares: false, ability: false }, [attacker, victim], now, []);
          api.stepCombat(incoming, [attacker, victim], 1 / 60, now, []);
        }
        assert(Number.isFinite(victim.hp) && victim.hp < victim.maxHp, 'new airframe native armor/damage path');
        console.log(`PASS ${kind}: finite actual native incoming damage`);
      }
      me.flight.throttle = 0; view.setBoost(false); update(180);
      if (kind === 'yak130' || deliveryKinds.includes(kind) || kind === 'f35a') {
        assert.equal(meshes.filter(m => m.name === 'afterburner' || m.name === 'flame').length, 0, `${kind}: actual template has no burner materials or cone mesh`);
        assert(!skeleton.bones.some(b => b.name.startsWith('afterburner')));
        raw.scene.traverse(n => assert(!n.name.startsWith('afterburner'), 'no fake glow role via afterburner ancestor'));
        const cores = meshes.filter(m => m.name === 'glow'); assert(cores.length > 0, 'actual static warm cores');
        for (const e of d.exhausts) {
          let rawCoreMeshes = 0;
          raw.scene.getObjectByName(e.node).traverse(n => {
            if (!n.isMesh) return;
            rawCoreMeshes++;
            const c = n.material.emissive;
            assert(c.r > c.g && c.g > c.b && c.r + c.g + c.b > .05 && c.r + c.g + c.b < .3, 'restrained warm source emission, not a burner');
          });
          assert(rawCoreMeshes > 0);
          if (kind === 'hawkt2' || kind === 'f35a' || kind === 'j20') assert.equal(rawCoreMeshes, 1, 'one genuine source mesh per core');
          const index = skeleton.bones.indexOf(bone(e.node));
          assert(cores.some(m => {
            const skin = m.geometry.getAttribute('skinIndex');
            for (let i = 0; i < skin.count; i++) if (skin.getX(i) === index) return true;
            return false;
          }), `${e.node}: actual geometry uses static glow material`);
        }
        for (const m of cores) assert(m.material.color.r < .3 && m.material.color.r > m.material.color.g && m.material.color.g > m.material.color.b, 'existing faint warm glow conversion');
        const colors = cores.map(m => m.material.color.toArray()), scales = d.exhausts.map(e => bone(e.node).scale.toArray());
        for (const throttle of [1, 0]) for (const boost of [true, false]) {
          me.flight.throttle = throttle; view.setBoost(boost); update(180);
          assert.deepEqual(cores.map(m => m.material.color.toArray()), colors, `${kind}: no boost/throttle brightness`);
          assert.deepEqual(d.exhausts.map(e => bone(e.node).scale.toArray()), scales, `${kind}: no boost stretch`);
        }
        // Pause (zero dt), seat leave/rejoin and a fresh entity must not turn static cores into burners.
        for (const local of [false, true]) {
          view.setLocal(local); view.setBoost(true); me.flight.throttle = 1;
          view.update(me, [], 0, camera);
          assert.deepEqual(cores.map(m => m.material.color.toArray()), colors, `${kind}: paused/seat-change static brightness`);
          assert.deepEqual(d.exhausts.map(e => bone(e.node).scale.toArray()), scales, `${kind}: paused/seat-change static geometry`);
        }
        const clean = entity(kind);
        for (let tick = 0; tick < 180; tick++) view.update(clean, [], 1 / 60, camera);
        assert.deepEqual(cores.map(m => m.material.color.toArray()), colors, `${kind}: reset static brightness`);
        assert.deepEqual(d.exhausts.map(e => bone(e.node).scale.toArray()), scales, `${kind}: reset static geometry`);
        assert.equal(d.exhausts.length, kind === 'hawkt2' || kind === 'f35a' ? 1 : 2);
        assert.equal(cfg.afterburners.length, 0);
        console.log(`PASS ${kind} actual ${d.exhausts.length} static warm core(s): no cone/flame/afterburner material/bone, no boost brightness/stretch`);
      } else {
        const glow = meshes.find(m => m.name === 'afterburner'), flame = meshes.find(m => m.name === 'flame'); assert(glow && flame); assert.equal(flame.visible, false);
        const idle = glow.material.color.r, scales = d.exhausts.map(e => bone(e.node).scale.z);
        me.flight.throttle = 1; update(180); assert(flame.visible && glow.material.color.r > idle * 2);
        view.setBoost(true); update(180); assert(glow.material.color.r > idle * 3);
        d.exhausts.forEach((e, i) => assert(bone(e.node).scale.z > scales[i] * 2));
      }
      if ([...trainerPair, ...deliveryKinds].includes(kind)) {
        me.alive = false; view.setBoost(true); update();
        assert.equal(view.root.visible, false, 'death hides actual rig');
        view.setLocal(false); update();
        assert.equal(view.root.visible, false, 'seat leave cannot revive dead rig');
        me.alive = true;
        me.flight.angularVelocity = [100, -100, 100]; me.weapons[0][1].ammo = 0; me.weapons[1][0].ammo = 0; update(180);
        const reset = entity(kind); view.setLocal(false); view.setLocal(true); view.setBoost(false);
        for (let tick = 0; tick < 180; tick++) view.update(reset, [], 1 / 60, camera);
        d.controls.forEach((c, i) => assert(bone(c.node).quaternion.angleTo(rests[i]) < 1e-4, 'reset pose from dirty state'));
        assert(cfg.stores.flatMap(g => g.order).every(n => bone(n).scale.x > .9), 'reset ammo restores all four stores');
        const stale = api.createAircraftView(kind, 0, 'low'); stale.dispose(); await delay(1);
        assert(!stale.ready && stale.root.children.length === 0, 'disposed template never reattaches');
        view.dispose(); view.update(reset, [], 1 / 60, camera);
        assert(!view.ready && view.root.children.length === 0, 'stale update after disposal cannot restore rig');
        console.log(`PASS ${kind}: actual death/seat-leave, dirty control/ammo reset, disposal and stale-template/update rejection`);
      }
      console.log(`PASS ${kind}: actual GLB hash/bounds/axis/PBR; raw ${rawTriangles} / native template ${api.aircraftStats(kind).triangles} triangles; controls/stores/exhaust; transformed muzzles/cockpit; real lock/fire/ammo/regen`);
    } finally { view.dispose(); assert.equal(view.root.children.length, 0); }
    const straight = api.createFlightState(kind, spawn), boosted = api.createFlightState(kind, spawn), turn = api.createFlightState(kind, spawn);
    for (let tick = 0; tick < 600; tick++) {
      api.stepFlight(straight, api.NEUTRAL_INPUT, 1 / 60, world);
      api.stepFlight(boosted, { ...api.NEUTRAL_INPUT, boost: true }, 1 / 60, world);
      api.stepFlight(turn, { ...api.NEUTRAL_INPUT, yaw: .5, pitch: .1 }, 1 / 60, world);
    }
    assert(Math.hypot(...boosted.velocity) > Math.hypot(...straight.velocity) + 10);
    assert.notDeepEqual(turn.orientation, straight.orientation);
    assert([straight, boosted, turn].every(f => [...f.position, ...f.velocity, ...f.orientation].every(Number.isFinite) && !f.crashed));
    const stall = api.createFlightState(kind, spawn); stall.velocity = [0, 0, -10]; assert(api.isStalled(stall));
    for (let i = 0; i < 60; i++) api.stepFlight(stall, api.NEUTRAL_INPUT, 1 / 60, world);
    assert(stall.velocity.every(Number.isFinite));
    const ground = api.createFlightState(kind, { position: [0, 22, 0], yaw: 0, onGround: true });
    for (let i = 0; i < 900; i++) api.stepFlight(ground, { ...api.NEUTRAL_INPUT, throttle: 1, boost: true, pitch: i > 120 ? .25 : 0 }, 1 / 60, world);
    assert(!ground.crashed && !ground.onGround && ground.position[1] > 50);
    ground.position = [0, 20, 0]; ground.velocity = [0, -50, 0]; api.stepFlight(ground, api.NEUTRAL_INPUT, 1 / 60, world); assert.equal(ground.crashed, 'terrain');
    assert.equal(api.createFlightState(kind, spawn).crashed, null);
    if ([...newPair, ...nextPair, ...latestPair, ...trainerPair, ...deliveryKinds].includes(kind)) {
      // Low ordinary runway, below the catapult threshold; only normal FlightInput drives takeoff.
      const runway = { ...world, groundHeight: () => 1 };
      const start = { position: [0, 3, 0], yaw: 0, onGround: true };
      const normal = api.createFlightState(kind, start), boost = api.createFlightState(kind, start);
      for (let tick = 0; tick < 60; tick++) {
        api.stepFlight(normal, { ...api.NEUTRAL_INPUT, throttle: 1 }, 1 / 60, runway);
        api.stepFlight(boost, { ...api.NEUTRAL_INPUT, throttle: 1, boost: true }, 1 / 60, runway);
      }
      assert(normal.onGround && boost.onGround && !normal.crashed && !boost.crashed);
      assert(Math.hypot(...boost.velocity) > Math.hypot(...normal.velocity) + 10, `${kind}: ordinary runway boost accelerates`);
      for (let tick = 60; tick < 900; tick++) {
        api.stepFlight(normal, { ...api.NEUTRAL_INPUT, throttle: 1, pitch: tick > 120 ? .25 : 0 }, 1 / 60, runway);
        api.stepFlight(boost, { ...api.NEUTRAL_INPUT, throttle: 1, boost: true, pitch: tick > 120 ? .25 : 0 }, 1 / 60, runway);
      }
      assert([normal, boost].every(f => !f.crashed && !f.onGround && f.position[1] > 50 && [...f.position, ...f.velocity, ...f.orientation].every(Number.isFinite)), `${kind}: normal and boosted non-catapult takeoff`);
      for (const method of ['chaseBody', 'gunner']) {
        const rig = new api.CameraRig(new T.PerspectiveCamera());
        const args = method === 'gunner' ? [1 / 60, kind, spawn.position, [0, 0, 0, 1], new T.Vector3(0, 0, -1)]
          : [1 / 60, kind, spawn.position, [0, 0, -150], [0, 0, 0, 1], 0, 0, () => 20];
        rig[method](...args);
        assert([...rig.pos.toArray(), ...rig.quat.toArray()].every(Number.isFinite), `${kind}: actual finite ${method} camera`);
        if ([...nextPair, ...latestPair, ...trainerPair, ...deliveryKinds].includes(kind)) {
          const expected = method === 'chaseBody'
            ? [spawn.position[0], spawn.position[1] + 6, spawn.position[2] + (d.bounds.max[2] - d.bounds.min[2]) * 1.6 * (1 + 150 / 900)]
            : [spawn.position[0], spawn.position[1] + d.bounds.min[1] - 1.5, spawn.position[2] + d.bounds.min[2] - 2];
          near(rig.pos.toArray(), expected, `${kind}: descriptor-derived actual ${method} eye`);
          rig.apply(1 / 60);
          near(rig.camera.position.toArray(), expected, `${kind}: applied real ${method} camera`);
          assert(rig.camera.quaternion.angleTo(rig.quat) < 1e-6);
        }
      }
      console.log(`PASS ${kind}: ordinary non-catapult normal/boosted ground acceleration and takeoff; finite actual chase/gunner cameras`);
    }
  }
  assert.equal(new Set(boxes.map(b => b.join(','))).size, 17, 'seventeen genuinely distinct supplied aircraft geometries');
  assert(boxes[9][0] > boxes[8][0] && boxes[9][2] > boxes[8][2], 'Su-34 actual span/length exceed Mirage');
  assert(boxes[7][0] > boxes[6][0] && boxes[7][2] > boxes[6][2], 'MiG-31BM actual span/length exceed Gripen');
  assert(boxes[3][0] > boxes[2][0] && boxes[3][2] > boxes[2][2], 'Su-35S actual span/length exceed Typhoon');
} finally { globalThis.fetch = saved.fetch; globalThis.self = saved.self; globalThis.createImageBitmap = saved.bitmap; }
function handlingProbe(kind, speed, input, ticks) {
  const state = api.createFlightState(kind, spawn); state.velocity = [0, 0, -speed];
  for (let tick = 0; tick < ticks; tick++) api.stepFlight(state, { ...api.NEUTRAL_INPUT, ...input }, 1 / 60, world);
  assert(!state.crashed && [...state.position, ...state.velocity, ...state.angularVelocity].every(Number.isFinite));
  return state;
}
assert(Math.abs(handlingProbe('typhoon', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('su35s', 100, { roll: 1 }, 30).angularVelocity[2]), 'Typhoon faster actual roll');
assert(handlingProbe('typhoon', 180, { pitch: 1 }, 30).angularVelocity[0] > handlingProbe('su35s', 180, { pitch: 1 }, 30).angularVelocity[0], 'Typhoon stronger high-speed turn');
assert(handlingProbe('su35s', 60, { pitch: 1 }, 30).angularVelocity[0] > handlingProbe('typhoon', 60, { pitch: 1 }, 30).angularVelocity[0], 'Su-35S stronger low-speed pitch; wider Typhoon recovery');
const bleed = kind => Math.hypot(...handlingProbe(kind, 100, {}, 120).velocity) - Math.hypot(...handlingProbe(kind, 100, { pitch: .6 }, 120).velocity);
assert(bleed('su35s') > bleed('typhoon'), 'Su-35S heavier actual sustained-turn energy loss');
console.log('PASS actual arcade handling contrast: Typhoon faster roll/high-speed turn; Su-35S stronger low-speed pitch and heavier turn-energy loss');
assert(Math.abs(handlingProbe('rafale', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('jf17', 100, { roll: 1 }, 30).angularVelocity[2]), 'Rafale faster actual roll');
assert(handlingProbe('rafale', 95, { pitch: 1 }, 30).angularVelocity[0] > handlingProbe('jf17', 95, { pitch: 1 }, 30).angularVelocity[0], 'Rafale stronger actual medium-speed pitch');
for (const kind of newPair) assert(handlingProbe(kind, 60, { pitch: .4 }, 120).angularVelocity[0] > 0, `${kind}: predictable finite low-speed control`);
console.log('PASS Rafale/JF-17 distinct actual arcade roll/medium-speed pitch; finite positive low-speed control');
assert(Math.abs(handlingProbe('gripen', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('mig31', 100, { roll: 1 }, 30).angularVelocity[2]), 'Gripen faster actual roll');
for (const speed of [60, 100]) assert(handlingProbe('gripen', speed, { pitch: .4 }, 30).angularVelocity[0] > handlingProbe('mig31', speed, { pitch: .4 }, 30).angularVelocity[0], 'Gripen tighter low/medium-speed pitch');
assert(Math.hypot(...handlingProbe('mig31', 200, {}, 600).velocity) > Math.hypot(...handlingProbe('gripen', 200, {}, 600).velocity) + 20, 'MiG-31BM greater high-speed energy retention');
console.log('PASS Gripen/MiG-31BM distinct actual low/medium-speed pitch, roll and high-speed energy retention; arcade tuning only');
assert(Math.abs(handlingProbe('mirage2000', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('su34', 100, { roll: 1 }, 30).angularVelocity[2]), 'Mirage more agile actual roll');
assert(handlingProbe('mirage2000', 100, { pitch: .6 }, 30).angularVelocity[0] > handlingProbe('su34', 100, { pitch: .6 }, 30).angularVelocity[0], 'Mirage stronger actual pitch');
for (const kind of latestPair) assert(bleed(kind) > 0, `${kind}: sustained pitch has real energy cost`);
assert(bleed('su34') > bleed('mirage2000'), 'heavy Su-34 greater sustained-load energy cost');
console.log('PASS Mirage delta agility/high-alpha energy cost versus heavier Su-34 sustained-load cost; arcade only');
assert(Math.abs(handlingProbe('fa50', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('yak130', 100, { roll: 1 }, 30).angularVelocity[2]), 'FA-50 more responsive actual roll');
assert(handlingProbe('fa50', 95, { pitch: .6 }, 30).angularVelocity[0] > handlingProbe('yak130', 95, { pitch: .6 }, 30).angularVelocity[0], 'FA-50 stronger medium-speed pitch');
assert(Math.hypot(...handlingProbe('fa50', 100, {}, 600).velocity) > Math.hypot(...handlingProbe('yak130', 100, {}, 600).velocity) + 15, 'Yak slower training/attack cruise');
for (const kind of [...trainerPair, ...deliveryKinds]) assert(handlingProbe(kind, 55, { pitch: .4 }, 120).angularVelocity[0] > 0, `${kind}: finite positive low-speed control`);
console.log('PASS FA-50 responsive compact fighter versus slower Yak-130 training/attack; native boost arcade only, no real afterburner claim for Yak');
for (const reference of ['yak130', 'fa50']) {
  assert(Math.abs(handlingProbe(reference, 95, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('hawkt2', 95, { roll: 1 }, 30).angularVelocity[2]), `${reference}: more responsive roll than Hawk trainer`);
  assert(Math.hypot(...handlingProbe(reference, 100, {}, 600).velocity) > Math.hypot(...handlingProbe('hawkt2', 100, {}, 600).velocity) + 5, `${reference}: faster actual cruise than Hawk trainer`);
}
console.log('PASS Hawk T2 distinct slower single-engine trainer handling, cruise/boost 95/125, low stall42; native boost arcade power aid only');
for (const reference of ['hawkt2', 'yak130']) {
  assert(Math.abs(handlingProbe(reference, 95, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('su25sm', 95, { roll: 1 }, 30).angularVelocity[2]), `${reference}: faster roll than heavier Su25`);
  assert(handlingProbe(reference, 60, { pitch: .4 }, 30).angularVelocity[0] > handlingProbe('su25sm', 60, { pitch: .4 }, 30).angularVelocity[0], `${reference}: stronger low-speed pitch than heavier Su25`);
}
assert(bleed('su25sm') > bleed('yak130'), 'heavier Su25 sustained-turn energy cost');
console.log('PASS Su-25SM distinct heavier low-speed ground-attack arcade handling, cruise/boost100/130 stall44; not measured performance/certified armor, boost not afterburner');
assert(Math.abs(handlingProbe('su25sm', 95, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('a10c', 95, { roll: 1 }, 30).angularVelocity[2]), 'A-10C slower roll than Su25');
assert(handlingProbe('su25sm', 60, { pitch: .4 }, 30).angularVelocity[0] > handlingProbe('a10c', 60, { pitch: .4 }, 30).angularVelocity[0], 'A-10C heavier low-speed pitch');
assert(Math.hypot(...handlingProbe('su25sm', 100, {}, 600).velocity) > Math.hypot(...handlingProbe('a10c', 100, {}, 600).velocity) + 5, 'A-10C lower actual cruise than Su25');
console.log('PASS A-10C distinct slower/heavier ground-attack arcade tuning90/115 stall42 HP600 roll2 induced.15; boost is not afterburning, not certified armor/performance');
assert(Math.abs(handlingProbe('f16c', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('f35a', 100, { roll: 1 }, 30).angularVelocity[2]), 'F-35A medium fighter rolls less sharply than F16C');
assert(bleed('f35a') > bleed('f16c'), 'F-35A heavier sustained-turn energy loss than F16C');
console.log('PASS F-35A conservative medium-fighter arcade tuning145/200 stall55 HP450 roll4.1 induced.1; one static core/no AB VFX, not a real non-afterburning engine claim');
assert(Math.abs(handlingProbe('f16c', 100, { roll: 1 }, 30).angularVelocity[2]) > Math.abs(handlingProbe('j20', 100, { roll: 1 }, 30).angularVelocity[2]), 'J-20 long fighter rolls less sharply than F16C');
assert(handlingProbe('f16c', 100, { pitch: .6 }, 30).angularVelocity[0] > handlingProbe('j20', 100, { pitch: .6 }, 30).angularVelocity[0], 'J-20 heavier actual pitch response');
assert(bleed('j20') > bleed('f16c'), 'J-20 heavier sustained-turn energy loss');
console.log('PASS J-20 conservative long-fighter arcade tuning160/220 stall60 HP450 roll3.6 induced.12; two static cores, no real performance/engine/armament claim');
const compiled = await build({ entryPoints: [resolve(src, 'main.ts'), resolve(src, 'render/aircraft-preview/main.ts')], outdir: 'in-memory',
  bundle: true, platform: 'browser', format: 'esm', write: false,
  plugins: [threePlugin(false)], loader: { '.css': 'empty' }, define: { 'import.meta.env.BASE_URL': '"./"' } });
assert.equal(compiled.outputFiles.length, 2); assert(compiled.outputFiles.every(f => f.contents.length > 0));
console.log(`PASS new kinds offline boost/turn/stall/takeoff/crash/reset; actual main.ts/preview write:false compilation: ${compiled.outputFiles.map(f => f.contents.length).join('/')} bytes. CPU only; all registered armor/damage paths passed. Original UI/bridge integration, native pixels and listening acceptance are separate gates.`);
