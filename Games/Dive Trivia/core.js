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
    // Only whole-word spelling errors, never short symbols, digits or prefixes.
    if (Array.from(value).length < 4 || Array.from(value).length > 80 || !/^[\p{L} ]+$/u.test(value)) return unknown();
    let best = null;
    let nearest = 3;
    let ambiguous = false;
    for (const group of prompt.groups) {
      for (const answer of group.answers) {
        for (const label of [answer.text, ...answer.aliases]) {
          const candidate = normalize(label);
          if (Array.from(candidate).length < 4 || !/^[\p{L} ]+$/u.test(candidate) ||
              candidate.startsWith(value) || value.startsWith(candidate)) continue;
          const distance = spellingDistance(value, candidate);
          if (distance > 2 || distance >= Array.from(value).length / 2) continue;
          if (distance < nearest) {
            nearest = distance;
            best = { answer: answer.text, tier: Math.max(0, group.tier - 1) };
            ambiguous = false;
          } else if (distance === nearest && best.answer !== answer.text) {
            ambiguous = true;
          }
        }
      }
    }
    if (!best || ambiguous) return unknown();
    return { recognized: true, points: POINTS[best.tier], ...best, closeSpelling: true };
  }

  function spellingDistance(left, right) {
    const a = Array.from(left), b = Array.from(right);
    if (Math.abs(a.length - b.length) > 2) return 3;
    // Full Damerau-Levenshtein, including edits around transposed letters.
    // Inputs are capped at 80 code points by score/submit; keys are local data.
    const limit = a.length + b.length;
    const rows = Array.from({ length: a.length + 2 }, () => Array(b.length + 2).fill(0));
    rows[0][0] = limit;
    for (let i = 0; i <= a.length; i++) { rows[i + 1][0] = limit; rows[i + 1][1] = i; }
    for (let j = 0; j <= b.length; j++) { rows[0][j + 1] = limit; rows[1][j + 1] = j; }
    const seen = new Map();
    for (let i = 1; i <= a.length; i++) {
      let matched = 0;
      for (let j = 1; j <= b.length; j++) {
        const previous = seen.get(b[j - 1]) || 0;
        const column = matched;
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        if (!cost) matched = j;
        rows[i + 1][j + 1] = Math.min(rows[i][j] + cost, rows[i + 1][j] + 1,
          rows[i][j + 1] + 1, rows[previous][column] + i - previous - 1 + 1 + j - column - 1);
      }
      seen.set(a[i - 1], i);
    }
    return rows[a.length + 1][b.length + 1];
  }

  function medianScore(prompt) {
    const scores = prompt.groups.flatMap(group => group.answers.map(() => POINTS[group.tier])).sort((a, b) => a - b);
    const middle = Math.floor(scores.length / 2);
    return scores.length % 2 ? scores[middle] : (scores[middle - 1] + scores[middle]) / 2;
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
      requireData(prompt.medianLampreyScore === medianScore(prompt), 'Invalid reef median: ' + prompt.id);
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

  function createRun(prompts, now, usedAnswers = []) {
    requireData(Array.isArray(prompts) && prompts.length === ROUND_COUNT &&
      prompts.every(prompt => prompt && label(prompt.id) && Array.isArray(prompt.groups)) &&
      new Set(prompts.map(prompt => prompt.id)).size === ROUND_COUNT, 'Run needs seven distinct prompts');
    requireData(validNow(now), 'Supply a finite monotonic millisecond clock');
    requireData(Array.isArray(usedAnswers) && usedAnswers.every(label), 'Invalid answer history');
    return { phase: 'question', index: 0, deadline: now + ROUND_MS, records: [], total: 0,
      prompts: prompts.slice(), usedAnswers: new Set(usedAnswers.map(normalize)), hint: '' };
  }

  function record(run, input, timedOut) {
    const result = timedOut ? unknown() : score(run.prompts[run.index], input);
    run.hint = '';
    if (result.recognized) {
      const key = normalize(result.answer);
      if (run.usedAnswers.has(key)) {
        run.hint = 'Already answered. Try another answer.';
        return false;
      }
      run.usedAnswers.add(key);
    }
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

  function parseHistory(raw) {
    const empty = { seeds: [], results: [] };
    let value;
    try { value = JSON.parse(raw); } catch { return empty; }
    if (!value || !Array.isArray(value.seeds) || !Array.isArray(value.results)) return empty;
    const seeds = value.seeds.filter(item => item && typeof item.id === 'string' && item.id.length <= 200 &&
      Array.isArray(item.answers) && item.answers.every(answer => label(answer) && Array.from(answer).length <= 80))
      .map(item => ({ id: item.id, answers: [...new Set(item.answers.map(normalize))] }));
    const results = value.results.filter(item => item && ['daily', 'numbered', 'pack'].includes(item.mode) &&
      typeof item.key === 'string' && item.key.length <= 80 && validDate(item.date) &&
      (item.mode !== 'daily' || item.key === item.date) &&
      Array.isArray(item.tiers) && item.tiers.length === POINTS.length &&
      item.tiers.every(n => Number.isInteger(n) && n >= 0 && n <= ROUND_COUNT) &&
      item.tiers.reduce((sum, n) => sum + n, 0) <= ROUND_COUNT &&
      item.total === item.tiers.reduce((sum, n, tier) => sum + n * POINTS[tier], 0))
      .map(item => ({ mode: item.mode, key: item.key, date: item.date, total: item.total, tiers: item.tiers.slice() }));
    return { seeds, results };
  }

  function validDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && utcDate(date) === value;
  }

  function historySeed(version, selection) {
    return JSON.stringify([version, selection.mode, selection.key, selection.date]);
  }

  function logResult(history, selection, run) {
    if (run.phase !== 'finished') return false;
    const tiers = POINTS.map((_, tier) => run.records.filter(record => record.recognized && record.tier === tier).length);
    history.results.push({ ...selection, total: run.total, tiers });
    return true;
  }

  function historyStats(history, today) {
    const days = new Map();
    const tiers = POINTS.map(() => 0);
    let best = 0;
    for (const result of history.results) {
      best = Math.max(best, result.total);
      result.tiers.forEach((count, tier) => { tiers[tier] += count; });
      if (result.mode === 'daily' && (!days.has(result.date) || days.get(result.date).total < result.total)) days.set(result.date, result);
    }
    // A streak stays live until today's UTC daily has been missed.
    let day = new Date(today + 'T00:00:00.000Z');
    if (!days.has(utcDate(day))) day.setUTCDate(day.getUTCDate() - 1);
    let streak = 0;
    while (days.has(utcDate(day))) { streak++; day.setUTCDate(day.getUTCDate() - 1); }
    return { best, streak, tiers, completed: history.results.length,
      days: [...days.values()].sort((a, b) => b.date.localeCompare(a.date)) };
  }

  globalThis.DiveCore = Object.freeze({ normalize, score, medianScore, validateData, selectPrompts, utcDate,
    createRun, submit, expire, next, parseHistory, historySeed, logResult, historyStats });
}());
