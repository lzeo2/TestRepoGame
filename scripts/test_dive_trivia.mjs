// Regression for the original rare-answer trivia genre clone, not a reference brand.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const coreURL = new URL('../Games/Dive Trivia/core.js', import.meta.url);
const questionsURL = new URL('../Games/Dive Trivia/questions.js', import.meta.url);
const sandbox = vm.createContext({});
vm.runInContext(`
  Math.random = () => { throw new Error('Ambient randomness forbidden'); };
  Date.now = () => { throw new Error('Ambient clock forbidden'); };
  for (const name of ['localStorage', 'sessionStorage', 'document', 'setTimeout', 'setInterval']) {
    Object.defineProperty(globalThis, name, { get() { throw new Error(name + ' forbidden'); } });
  }
`, sandbox);
vm.runInContext(readFileSync(coreURL, 'utf8'), sandbox, { filename: 'core.js' });
const core = sandbox.DiveCore;
const plain = value => JSON.parse(JSON.stringify(value));
const ids = prompts => Array.from(prompts, prompt => prompt.id);
let checks = 0;
function test(name, check) {
  check();
  checks++;
  console.log('PASS ' + name);
}

const fixture = {
  version: 'fixture.1',
  packs: ['nature', 'science'].map(id => ({ id, title: id, description: id + ' fixture' })),
  prompts: Array.from({ length: 14 }, (_, i) => ({
    id: 'prompt-' + String(i).padStart(2, '0'),
    pack: i < 7 ? 'nature' : 'science',
    text: 'Internal engine fixture ' + i,
    medianLampreyScore: 45,
    groups: Array.from({ length: 6 }, (_, tier) => ({
      tier,
      answers: [{ text: 'Answer ' + tier, aliases: ['Alias ' + tier] }]
    }))
  }))
};
const prompt = fixture.prompts[0];
const selection = { mode: 'daily', key: '2026-10-19' };

test('normalization keeps word boundaries and meaningful symbols', () => {
  assert.equal(core.normalize('  CAFÉ\tCrème!  '), 'cafe creme');
  assert.equal(core.normalize('L’été'), "lete");
  assert.equal(core.normalize('rock & roll'), core.normalize('Rock and Roll'));
  assert.equal(core.normalize('New-Zealand'), 'new zealand');
  assert.equal(core.normalize('Ｆｕｌｌ'), 'full');
  assert.notEqual(core.normalize('A B'), core.normalize('AB'));
  assert.notEqual(core.normalize('C'), core.normalize('C++'));
});

test('all six curated tiers and exact aliases; numeric and prefix guesses rejected', () => {
  for (const [tier, points] of [10, 15, 30, 60, 85, 100].entries()) {
    for (const input of ['Answer ' + tier, '  ALIAS ' + tier + '!!  ']) {
      assert.deepEqual(plain(core.score(prompt, input)), { recognized: true, points, tier, answer: 'Answer ' + tier });
    }
  }
  for (const input of ['', '   ', 'Anser 5', 'Answer', 'Answer 55', 'not listed']) {
    assert.deepEqual(plain(core.score(prompt, input)), { recognized: false, points: 0, tier: null, answer: null });
  }
});

test('data validation accepts fixture and rejects malformed content', () => {
  assert.equal(core.validateData(fixture), true);
  const invalid = [
    d => { delete d.version; },
    d => { d.packs = []; },
    d => { delete d.prompts; },
    d => { d.prompts = []; },
    d => { d.packs.push(d.packs[0]); },
    d => { d.prompts[1].id = d.prompts[0].id; },
    d => { d.packs[0].title = ' '; },
    d => { d.packs[0].description = ''; },
    d => { d.prompts[0].text = '!!!'; },
    d => { d.prompts[0].pack = 'missing'; },
    d => { d.prompts[0].groups.pop(); },
    d => { delete d.prompts[0].medianLampreyScore; },
    d => { d.prompts[0].medianLampreyScore = 100; },
    d => { d.prompts[0].groups[0].tier = 1; },
    d => { d.prompts[0].groups[0].tier = -1; },
    d => { d.prompts[0].groups[0].tier = 6; },
    d => { d.prompts[0].groups[0].tier = '0'; },
    d => { d.prompts[0].groups[0].answers = []; },
    d => { d.prompts[0].groups[0].answers[0].text = ''; },
    d => { d.prompts[0].groups[0].answers[0].aliases = ['']; },
    d => { d.prompts[0].groups[0].answers[0].aliases = 'alias'; },
    d => { d.prompts[0].groups[0].answers[0].aliases.push('Ánswer 1'); },
    d => { d.prompts[0].groups[0].answers.push({ text: 'Answer 0', aliases: [] }); },
    d => { d.prompts[0].groups[0].answers.push(d.prompts[0].groups[0].answers[0]); },
    d => { d.prompts.pop(); }
  ];
  for (const change of invalid) {
    const data = structuredClone(fixture);
    change(data);
    assert.throws(() => core.validateData(data));
  }
});

test('UTC dates and strict calendar/mode/key validation', () => {
  assert.equal(core.utcDate(new Date('2026-10-20T01:00:00+14:00')), '2026-10-19');
  assert.equal(core.utcDate(new Date('2026-10-19T23:00:00-12:00')), '2026-10-20');
  assert.match(core.utcDate(), /^\d{4}-\d{2}-\d{2}$/);
  assert.throws(() => core.utcDate(new Date(NaN)));
  for (const key of ['2024-02-29', '2000-02-29', '2026-12-31', '0099-01-01']) {
    assert.equal(core.selectPrompts(fixture, { mode: 'daily', key }).length, 7);
  }
  for (const key of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-01', '2026-01-01Z', ' 2026-01-01', '2026-01-01\n', 'x']) {
    assert.throws(() => core.selectPrompts(fixture, { mode: 'daily', key }), key);
  }
  for (const key of ['1', '999999']) assert.equal(core.selectPrompts(fixture, { mode: 'numbered', key }).length, 7);
  for (const key of ['0', '1000000', '-1', '1.0', '01', '1e2', ' 1', '1\n', 1]) {
    assert.throws(() => core.selectPrompts(fixture, { mode: 'numbered', key }));
  }
  assert.throws(() => core.selectPrompts(fixture, { mode: 'pack', key: 'unknown' }));
  assert.throws(() => core.selectPrompts(fixture, { mode: 'unknown', key: '1' }));
});

test('deterministic seven from stable ID order, version/mode/key seed', () => {
  const before = JSON.stringify(fixture);
  const selected = core.selectPrompts(fixture, selection);
  assert.equal(selected.length, 7);
  assert.equal(new Set(ids(selected)).size, 7);
  assert.deepEqual(ids(selected), ['prompt-03', 'prompt-11', 'prompt-05', 'prompt-01', 'prompt-07', 'prompt-12', 'prompt-02']);
  assert.ok(selected.every(p => fixture.prompts.includes(p)));
  assert.deepEqual(ids(selected), ids(core.selectPrompts(fixture, selection)));
  const reversed = structuredClone(fixture);
  reversed.prompts.reverse();
  reversed.packs.reverse();
  assert.deepEqual(ids(selected), ids(core.selectPrompts(reversed, selection)));
  const revised = { ...fixture, version: 'fixture.2' };
  assert.notDeepEqual(ids(selected), ids(core.selectPrompts(revised, selection)));
  assert.notDeepEqual(ids(selected), ids(core.selectPrompts(fixture, { ...selection, key: '2026-10-20' })));
  assert.notDeepEqual(ids(selected), ids(core.selectPrompts(fixture, { mode: 'numbered', key: '1' })));
  for (const key of ['nature', 'science']) {
    const options = { mode: 'pack', key };
    const packed = core.selectPrompts(fixture, options);
    assert.equal(packed.length, 7);
    assert.ok(packed.every(p => p.pack === key));
    assert.deepEqual(ids(packed), ids(core.selectPrompts(fixture, options)));
  }
  assert.equal(JSON.stringify(fixture), before);
  console.log('Daily fixture IDs: ' + ids(selected).join(','));
});

const seven = fixture.prompts.slice(0, 7);
test('run input bounds, immutable record, submission lock and deadline edge', () => {
  const run = core.createRun(seven, 100);
  assert.equal(run.phase, 'question');
  assert.equal(run.index, 0);
  assert.equal(run.deadline, 25100);
  assert.equal(run.total, 0);
  assert.equal(run.records.length, 0);
  assert.notEqual(run.prompts, seven);
  assert.equal(core.next(run, 101), false);
  assert.equal(core.submit(run, 'x'.repeat(81), 102), false);
  assert.equal(core.submit(run, null, 102), false);
  assert.equal(core.submit(run, 'Answer 5', NaN), false);
  assert.equal(core.expire(run, 25099), false);
  assert.equal(core.submit(run, '  Alias 5  ', 25099), true);
  assert.deepEqual(plain(run.records[0]), { promptId: seven[0].id, input: 'Alias 5', recognized: true, points: 100, tier: 5, answer: 'Answer 5', timedOut: false });
  assert.ok(Object.isFrozen(run.records[0]));
  assert.throws(() => { run.records[0].points = 999; });
  assert.equal(core.submit(run, 'Answer 0', 25099), false);
  assert.equal(core.expire(run, 25100), false);
  assert.equal(run.total, 100);
  assert.equal(core.next(run, 30000), true);
  assert.equal(run.index, 1);
  assert.equal(run.deadline, 55000);
  assert.equal(core.submit(run, 'Answer 5', 55000), true);
  assert.deepEqual(plain(run.records[1]), { promptId: seven[1].id, input: 'Answer 5', recognized: false, points: 0, tier: null, answer: null, timedOut: true });
  assert.equal(run.total, 100);
  const unicode = core.createRun(seven, 0);
  assert.equal(core.submit(unicode, '🦉'.repeat(81), 1), false);
  assert.equal(core.submit(unicode, '  ' + '🦉'.repeat(80) + '  ', 1), true);
  assert.equal(Array.from(unicode.records[0].input).length, 80);
  const late = core.createRun(seven, 0);
  assert.equal(core.submit(late, 'x'.repeat(81), 25000), false);
  assert.equal(late.records.length, 0);
  assert.equal(core.expire(late, 25000), true);
  assert.equal(late.records[0].points, 0);
});

test('expiry, unknown, seven-round finish and maximum depth', () => {
  const run = core.createRun(seven, 0);
  assert.equal(core.expire(run, 24999), false);
  assert.equal(core.expire(run, 25000), true);
  assert.equal(core.expire(run, 25001), false);
  assert.equal(run.records[0].timedOut, true);
  assert.equal(run.records[0].points, 0);
  for (let index = 1; index < 7; index++) {
    assert.equal(core.next(run, index * 30000), true);
    assert.equal(core.submit(run, 'unknown', index * 30000 + 1), true);
  }
  assert.equal(core.next(run, 220000), true);
  assert.equal(run.phase, 'finished');
  assert.equal(run.records.length, 7);
  assert.equal(run.total, 0);
  assert.equal(core.submit(run, 'Answer 5', 220001), false);
  assert.equal(core.expire(run, 999999), false);
  assert.equal(core.next(run, 220001), false);
  const distinct = structuredClone(seven);
  distinct.forEach((prompt, index) => { prompt.groups[5].answers[0].text = 'Best ' + index; });
  const perfect = core.createRun(distinct, 0);
  for (let index = 0; index < 7; index++) {
    assert.equal(core.submit(perfect, 'Best ' + index, index * 30000), true);
    assert.equal(core.next(perfect, (index + 1) * 30000), true);
  }
  assert.equal(perfect.phase, 'finished');
  assert.equal(perfect.total, 700);
  assert.equal(perfect.total * 10, 7000);
  for (const now of [NaN, Infinity, -Infinity, undefined, '0']) assert.throws(() => core.createRun(seven, now));
  assert.throws(() => core.createRun(seven.slice(1), 0));
  assert.throws(() => core.createRun(Array(7).fill(seven[0]), 0));
});

vm.runInContext(readFileSync(questionsURL, 'utf8'), sandbox, { filename: 'questions.js' });
const data = sandbox.DiveQuestions;
test('real question data validation, every canonical answer and alias', () => {
  assert.equal(core.validateData(data), true);
  for (const prompt of data.prompts) {
    for (const group of prompt.groups) {
      for (const answer of group.answers) {
        for (const input of [answer.text, ...answer.aliases]) {
          const result = core.score(prompt, input);
          assert.equal(result.answer, answer.text);
          assert.equal(result.tier, group.tier);
        }
      }
    }
  }
  assert.equal(core.selectPrompts(data, selection).length, 7);
  for (const pack of data.packs) assert.equal(core.selectPrompts(data, { mode: 'pack', key: pack.id }).length, 7);
  console.log(`Real data: ${data.prompts.length} prompts / ${data.packs.length} packs / version ${data.version}`);
});
test('local typo edits, aliases, NFKD and one-tier penalty with Shallows floor', () => {
  const penguins = data.prompts.find(p => p.id === 'nature-penguins');
  for (const input of ['galapgaos', 'galapgos', 'galapxgos', 'galapxgxs']) {
    const result = core.score(penguins, input);
    assert.equal(result.answer, 'Galapagos penguin', input);
    assert.equal(result.tier, 4);
    assert.equal(result.points, 85);
    assert.equal(result.closeSpelling, true);
  }
  assert.equal(core.score(penguins, 'Ａｄéｌｉｅ ｐｅｎｇｉｕｎ').tier, 0);
  assert.equal(core.score(penguins, 'Ａｄéｌｉｅ ｐｅｎｇｉｕｎ').closeSpelling, true);
  assert.equal(core.score(penguins, 'Ａｄéｌｉｅ').tier, 1);
  assert.equal(core.score(penguins, 'Ａｄéｌｉｅ').closeSpelling, undefined);
  assert.equal(core.score(penguins, 'empeorr').tier, 0);
  assert.equal(core.score(penguins, 'empeorr').points, 10);
  const cats = data.prompts.find(p => p.id === 'nature-cats');
  assert.equal(core.score(cats, 'loin').answer, 'Lion');
  // Full DL allows insertion between a pair that is also transposed.
  assert.equal(core.score({ groups: [{ tier: 5, answers: [{ text: 'xxabcxx', aliases: [] }] }] }, 'xxcaxx').points, 85);
});

test('garbage, prefixes, short inputs and out-of-prompt answers stay unrecognized', () => {
  const penguins = data.prompts.find(p => p.id === 'nature-penguins');
  for (const input of ['galap', 'galapago', 'galapagoszzz', 'galxxxgos', 'pen', 'penguin', 'kng', 'x',
    'zzzzzzzz', 'cat', 'galapago5', 'galapago+', 'galapago🦉', 'x'.repeat(81)]) {
    assert.equal(core.score(penguins, input).recognized, false, input);
  }
  const elements = data.prompts.find(p => p.id === 'science-one-letter-elements');
  assert.equal(core.score(elements, 'W').answer, 'Tungsten');
  assert.equal(core.score(elements, 'X').recognized, false);
  assert.equal(core.score(elements, 'WW').recognized, false);
});

test('cross-answer fuzzy collisions rejected; exact takes priority; aliases do not vote', () => {
  const collision = { groups: [
    { tier: 5, answers: [{ text: 'Mole', aliases: ['móle', 'molle'] }] },
    { tier: 1, answers: [{ text: 'Male', aliases: ['mále'] }] }
  ] };
  assert.equal(core.score(collision, 'mile').recognized, false);
  collision.groups.reverse();
  assert.equal(core.score(collision, 'mile').recognized, false);
  assert.equal(core.score(collision, 'male').tier, 1);
  assert.equal(core.score(collision, 'moll').answer, 'Mole');
  assert.equal(core.score(collision, 'moll').tier, 4);
  assert.equal(core.score(collision, 'male').closeSpelling, undefined);
  assert.equal(core.score({ groups: [{ tier: 2, answers: [{ text: 'Adelie', aliases: ['adélie', 'adelie'] }] }] }, 'adleie').tier, 1);
  // Distance two is rejected at exactly half the input length.
  assert.equal(core.score({ groups: [{ tier: 5, answers: [{ text: 'Abcd', aliases: [] }] }] }, 'axyd').recognized, false);
});

test('repeat canonical/alias/typo rejection keeps round and timer; timeout still ends it', () => {
  const run = core.createRun(seven, 0);
  assert.equal(core.submit(run, 'Alias 5', 1), true);
  assert.equal(core.next(run, 100), true);
  assert.equal(core.submit(run, 'Answer 5', 101), false);
  assert.equal(run.hint, 'Already answered. Try another answer.');
  assert.equal(run.phase, 'question');
  assert.equal(run.records.length, 1);
  assert.equal(run.deadline, 25100);
  assert.equal(run.total, 100);
  assert.equal(core.submit(run, 'Alias 4', 102), true);
  const penguins = data.prompts.find(p => p.id === 'nature-penguins');
  const real = core.selectPrompts(data, { mode: 'pack', key: 'nature' });
  const ordered = [penguins, ...real.filter(p => p.id !== penguins.id)];
  const prior = ['galapagos penguin'];
  const replay = core.createRun(ordered, 0, prior);
  assert.equal(core.submit(replay, 'galapgaos', 1), false);
  assert.equal(core.submit(replay, 'galápagos', 2), false);
  assert.equal(core.submit(replay, 'galapagos penguin', 25000), true);
  assert.equal(replay.records[0].timedOut, true);
  assert.equal(replay.total, 0);
  assert.deepEqual(prior, ['galapagos penguin']);
});

test('seeded persistent history survives parsing, separates days/modes and uses canonical identity', () => {
  const history = core.parseHistory(null);
  const selected = { mode: 'daily', key: '2026-10-19', date: '2026-10-19' };
  const id = core.historySeed(data.version, selected);
  history.seeds.push({ id, answers: ['Answer 5'] });
  const restored = core.parseHistory(JSON.stringify(history));
  const replay = core.createRun(seven, 0, restored.seeds.find(seed => seed.id === id).answers);
  assert.equal(core.submit(replay, 'Alias 5', 1), false);
  assert.notEqual(id, core.historySeed(data.version, { mode: 'daily', key: '2026-10-20', date: '2026-10-20' }));
  assert.notEqual(id, core.historySeed(data.version, { ...selected, mode: 'numbered' }));
  assert.notEqual(id, core.historySeed('new version', selected));
  assert.equal(core.submit(core.createRun(seven, 0), 'Alias 5', 1), true);
  const element = data.prompts.find(p => p.id === 'science-one-letter-elements');
  const unit = data.prompts.find(p => p.id === 'science-derived-units');
  const cross = [element, unit, ...data.prompts.filter(p => p.id !== element.id && p.id !== unit.id).slice(0, 5)];
  const run = core.createRun(cross, 0);
  assert.equal(core.submit(run, 'W', 1), true);
  assert.equal(core.next(run, 100), true);
  assert.equal(core.submit(run, 'W', 101), true); // Tungsten and Watt are different answers.
  assert.deepEqual(Array.from(run.usedAnswers), ['tungsten', 'watt']);
});

test('history guards corrupt storage; finished-only results, best depth, UTC streak and tier totals', () => {
  for (const raw of [null, '{', 'null', '[]', '{}', '{"seeds":{},"results":[]}']) {
    assert.deepEqual(plain(core.parseHistory(raw)), { seeds: [], results: [] });
  }
  const history = core.parseHistory(null);
  const run = core.createRun(seven, 0);
  const selected = { mode: 'daily', key: '2026-10-19', date: '2026-10-19' };
  assert.equal(core.logResult(history, selected, run), false);
  for (let index = 0; index < 7; index++) {
    assert.equal(core.submit(run, index === 0 ? 'Answer 5' : '', index * 30000), true);
    assert.equal(core.next(run, (index + 1) * 30000), true);
  }
  assert.equal(core.logResult(history, selected, run), true);
  history.results.push({ ...history.results[0], date: '2026-10-20', key: '2026-10-20' });
  history.results.push({ ...history.results[0], total: 0, tiers: [0, 0, 0, 0, 0, 0] });
  history.results.push({ ...history.results[0], total: 700 }); // Corrupt inconsistent score.
  history.results.push({ ...history.results[0], date: '2026-02-30', key: '2026-02-30' });
  history.seeds.push({ id: 'invalid', answers: [null] });
  const restored = core.parseHistory(JSON.stringify(history));
  assert.equal(restored.results.length, 3);
  assert.equal(restored.seeds.length, 0);
  const stats = core.historyStats(restored, '2026-10-20');
  assert.equal(stats.best, 100);
  assert.equal(stats.completed, 3);
  assert.equal(stats.days.length, 2);
  assert.equal(stats.days[1].total, 100); // Best of multiple completions on one day.
  assert.equal(stats.streak, 2);
  assert.deepEqual(Array.from(stats.tiers), [0, 0, 0, 0, 0, 2]);
  assert.equal(core.historyStats(restored, '2026-10-21').streak, 2);
  assert.equal(core.historyStats(restored, '2026-10-22').streak, 0);
  assert.equal(core.historyStats(core.parseHistory(null), '2026-10-20').best, 0);
  const year = { seeds: [], results: ['2023-12-31', '2024-01-01'].map(date => ({ ...restored.results[0], date, key: date })) };
  assert.equal(core.historyStats(year, '2024-01-01').streak, 2);
  const leap = { seeds: [], results: ['2024-02-28', '2024-02-29', '2024-03-01'].map(date => ({ ...restored.results[0], date, key: date })) };
  assert.equal(core.historyStats(leap, '2024-03-01').streak, 3);
});

test('fixed reef medians derive only from canonical tier counts, never aliases or ambient randomness', () => {
  for (const prompt of data.prompts) {
    assert.equal(prompt.medianLampreyScore, core.medianScore(prompt));
    assert.equal(prompt.medianLampreyScore, prompt.id === 'science-standard-amino-acids' ? 30 : 45);
  }
  const unequal = { groups: [{ tier: 0, answers: [{}, {}, {}] }, { tier: 5, answers: [{}] }] };
  assert.equal(core.medianScore(unequal), 10);
  assert.equal(core.medianScore({ groups: [{ tier: 4, answers: [{ aliases: ['many', 'aliases'] }] }] }), 85);
  const selected = core.selectPrompts(data, selection);
  assert.ok(selected.reduce((sum, prompt) => sum + prompt.medianLampreyScore, 0) <= 315);
});
console.log(`Dive Trivia: ${checks} checks passed (TZ=${process.env.TZ || 'system'}).`);
