/* Original rare-answer trivia genre clone, not reference-brand code or content. */
(function () {
  'use strict';

  const POINTS = [10, 15, 30, 60, 85, 100];
  const ROUND_MS = 25000;
  const ROUND_COUNT = 7;

  function normalize(text) {
    // Apostrophes join letters; other punctuation preserves word boundaries.
    // & explicitly means "and". Keep symbols such as + so C and C++ differ.
    return text.trim().normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
      .replace(/[\u2018\u2019\u02bc]/g, "'").replace(/'/g, '')
      .replace(/&/g, ' and ').replace(/\p{P}/gu, ' ').replace(/\s+/gu, ' ').trim();
  }

  function unknown() {
    return { recognized: false, points: 0, tier: null, answer: null };
  }

  function score(prompt, input) {
    const value = normalize(input);
    if (!value) return unknown();
    for (const group of prompt.groups) {
      for (const answer of group.answers) {
        if ([answer.text, ...answer.aliases].some(label => normalize(label) === value)) {
          return { recognized: true, points: POINTS[group.tier], tier: group.tier, answer: answer.text };
        }
      }
    }
    return unknown();
  }

  function requireData(condition, message) {
    if (!condition) throw new TypeError(message);
  }

  function label(value) {
    return typeof value === 'string' && normalize(value).length > 0;
  }

  function validateData(data) {
    requireData(data && label(data.version), 'Missing data version');
    requireData(Array.isArray(data.packs) && data.packs.length > 0, 'Missing packs');
    requireData(Array.isArray(data.prompts) && data.prompts.length >= ROUND_COUNT, 'Need seven prompts');
    const packs = new Map();
    for (const pack of data.packs) {
      requireData(pack && label(pack.id) && label(pack.title) && label(pack.description), 'Empty pack label');
      requireData(!packs.has(pack.id), 'Duplicate pack ID: ' + pack.id);
      packs.set(pack.id, 0);
    }
    const ids = new Set();
    for (const prompt of data.prompts) {
      requireData(prompt && label(prompt.id) && label(prompt.text), 'Empty prompt label');
      requireData(!ids.has(prompt.id), 'Duplicate prompt ID: ' + prompt.id);
      ids.add(prompt.id);
      requireData(packs.has(prompt.pack), 'Missing prompt pack: ' + prompt.id);
      packs.set(prompt.pack, packs.get(prompt.pack) + 1);
      requireData(Array.isArray(prompt.groups) && prompt.groups.length === POINTS.length, 'Need six tier groups: ' + prompt.id);
      const tiers = new Set();
      const answers = new Map();
      let answerIndex = 0;
      for (const group of prompt.groups) {
        requireData(group && Number.isInteger(group.tier) && group.tier >= 0 && group.tier < POINTS.length && !tiers.has(group.tier), 'Invalid tier: ' + prompt.id);
        tiers.add(group.tier);
        requireData(Array.isArray(group.answers) && group.answers.length > 0, 'Empty answer group: ' + prompt.id);
        for (const answer of group.answers) {
          answerIndex++;
          requireData(answer && label(answer.text) && Array.isArray(answer.aliases), 'Invalid answer: ' + prompt.id);
          for (const text of [answer.text, ...answer.aliases]) {
            requireData(label(text), 'Empty answer label: ' + prompt.id);
            const key = normalize(text);
            // Redundant spellings within one answer are harmless, competing answers are not.
            requireData(!answers.has(key) || answers.get(key) === answerIndex, 'Normalized answer collision: ' + prompt.id + ' / ' + key);
            answers.set(key, answerIndex);
          }
        }
      }
    }
    for (const [id, count] of packs) requireData(count >= ROUND_COUNT, 'Pack needs seven prompts: ' + id);
    return true;
  }

  function utcDate(date = new Date()) {
    const iso = date.toISOString();
    if (!/^\d{4}-/.test(iso)) throw new RangeError('Date must have a four-digit UTC year');
    return iso.slice(0, 10);
  }

  function selectPrompts(data, { mode, key }) {
    validateData(data);
    requireData(typeof key === 'string', 'Key must be a string');
    if (mode === 'daily') {
      requireData(/^\d{4}-\d{2}-\d{2}$/.test(key), 'Invalid UTC daily date');
      const date = new Date(key + 'T00:00:00.000Z');
      requireData(Number.isFinite(date.getTime()) && utcDate(date) === key, 'Invalid UTC daily date');
    } else if (mode === 'numbered') {
      requireData(/^[1-9]\d{0,5}$/.test(key), 'Numbered key must be 1..999999');
    } else if (mode === 'pack') {
      requireData(data.packs.some(pack => pack.id === key), 'Unknown pack');
    } else {
      throw new TypeError('Unknown mode');
    }
    const prompts = data.prompts.filter(prompt => mode !== 'pack' || prompt.pack === key)
      .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    // FNV-1a seed plus Mulberry32 shuffle, pinned to version/mode/key only.
    let state = 2166136261;
    for (const char of JSON.stringify([data.version, mode, key])) {
      state = Math.imul(state ^ char.codePointAt(0), 16777619) >>> 0;
    }
    for (let i = prompts.length - 1; i > 0; i--) {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = Math.imul(state ^ (state >>> 15), state | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      const j = Math.floor(((value ^ (value >>> 14)) >>> 0) / 4294967296 * (i + 1));
      [prompts[i], prompts[j]] = [prompts[j], prompts[i]];
    }
    return prompts.slice(0, ROUND_COUNT);
  }

  function validNow(now) {
    return Number.isFinite(now) && Number.isFinite(now + ROUND_MS);
  }

  function createRun(prompts, now) {
    requireData(Array.isArray(prompts) && prompts.length === ROUND_COUNT &&
      prompts.every(prompt => prompt && label(prompt.id) && Array.isArray(prompt.groups)) &&
      new Set(prompts.map(prompt => prompt.id)).size === ROUND_COUNT, 'Run needs seven distinct prompts');
    requireData(validNow(now), 'Supply a finite monotonic millisecond clock');
    return { phase: 'question', index: 0, deadline: now + ROUND_MS, records: [], total: 0, prompts: prompts.slice() };
  }

  function record(run, input, timedOut) {
    const result = timedOut ? unknown() : score(run.prompts[run.index], input);
    run.records.push(Object.freeze({ promptId: run.prompts[run.index].id, input, ...result, timedOut }));
    run.total += result.points;
    run.phase = 'reveal';
    return true;
  }

  function submit(run, input, now) {
    if (run.phase !== 'question' || !validNow(now) || typeof input !== 'string') return false;
    input = input.trim();
    // Count Unicode code points, not UTF-16 units. Never score truncated text.
    if (Array.from(input).length > 80) return false;
    return record(run, input, now >= run.deadline);
  }

  function expire(run, now) {
    if (run.phase !== 'question' || !validNow(now) || now < run.deadline) return false;
    return record(run, '', true);
  }

  function next(run, now) {
    if (run.phase !== 'reveal' || !validNow(now)) return false;
    if (run.index === ROUND_COUNT - 1) {
      run.phase = 'finished';
    } else {
      run.index++;
      run.deadline = now + ROUND_MS;
      run.phase = 'question';
    }
    return true;
  }

  globalThis.DiveCore = Object.freeze({ normalize, score, validateData, selectPrompts, utcDate, createRun, submit, expire, next });
}());
