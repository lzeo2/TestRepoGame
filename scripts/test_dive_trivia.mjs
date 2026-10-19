// Regression for the original rare-answer trivia genre clone, not a reference brand.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
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

test('all six curated tiers and exact aliases; no fuzzy matches', () => {
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
  const perfect = core.createRun(seven, 0);
  for (let index = 0; index < 7; index++) {
    assert.equal(core.submit(perfect, 'Answer 5', index * 30000), true);
    assert.equal(core.next(perfect, (index + 1) * 30000), true);
  }
  assert.equal(perfect.phase, 'finished');
  assert.equal(perfect.total, 700);
  assert.equal(perfect.total * 10, 7000);
  for (const now of [NaN, Infinity, -Infinity, undefined, '0']) assert.throws(() => core.createRun(seven, now));
  assert.throws(() => core.createRun(seven.slice(1), 0));
  assert.throws(() => core.createRun(Array(7).fill(seven[0]), 0));
});

if (existsSync(questionsURL)) {
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
} else {
  console.log('Real questions.js not present; engine tested with internal fixture only.');
}
console.log(`Dive Trivia: ${checks} checks passed (TZ=${process.env.TZ || 'system'}).`);
