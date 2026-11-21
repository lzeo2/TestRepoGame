import { BUILTIN_BOTS } from './bots.js';

const STORAGE_KEY = 'chess-workshop-rankings-v1';
const DEFAULT_ALIAS = 'Player';
const ALIAS_LENGTH = 24;
const MAX_ROWS = 20;
const RECENT_IDS = 256;
const MAX_TIME_MS = 7 * 24 * 3600 * 1000;
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const BOARDS = new Map([
  ...BUILTIN_BOTS.map(bot => [bot.id, { label: bot.name, goal: bot.goal }]),
  ['mate1', { label: 'Mate in one' }],
  ['mate2', { label: 'Mate in two' }],
]);

function displayName(value) {
  if (typeof value !== 'string') return DEFAULT_ALIAS;
  return Array.from(value.normalize('NFC').replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, ' ').trim())
    .slice(0, ALIAS_LENGTH).join('') || DEFAULT_ALIAS;
}

function aliasKey(alias) {
  return alias.toLowerCase();
}

function integerBetween(value, low, high) {
  return Number.isSafeInteger(value) && value >= low && value <= high;
}

function validId(id) {
  return typeof id === 'string' && ID.test(id);
}

function compare(a, b) {
  return (a.moves ?? 0) - (b.moves ?? 0) || a.ms - b.ms || a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

function keepBest(rows, board, candidate) {
  const key = aliasKey(candidate.alias);
  const previous = rows.find(row => aliasKey(row.alias) === key);
  if (previous && compare(previous, candidate) <= 0) return false;
  const next = rows.filter(row => row !== previous).concat(candidate).sort(compare).slice(0, MAX_ROWS);
  board.set(candidate.board, next);
  return next.includes(candidate);
}

function snapshot(raw) {
  const initial = { alias: DEFAULT_ALIAS, board: new Map(), recent: [] };
  if (typeof raw !== 'string' || raw.length > 120_000) return initial;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1) return initial;
    initial.alias = displayName(data.alias);
    if (Array.isArray(data.recent)) {
      initial.recent = [...new Set(data.recent.slice(-RECENT_IDS).filter(validId))];
    }
    if (!Array.isArray(data.rows)) return initial;
    const ids = new Set();
    for (const row of data.rows.slice(0, BOARDS.size * MAX_ROWS)) {
      const category = BOARDS.get(row?.board);
      if (!category || !validId(row.id) || ids.has(row.id) || !integerBetween(row.ms, 0, MAX_TIME_MS)
          || !integerBetween(row.at, 0, Number.MAX_SAFE_INTEGER)) continue;
      if (category.goal && !integerBetween(row.moves, 0, 10_000)) continue;
      ids.add(row.id);
      const entry = { board: row.board, id: row.id, alias: displayName(row.alias), ms: row.ms, at: row.at };
      if (category.goal) entry.moves = row.moves;
      keepBest(initial.board.get(row.board) ?? [], initial.board, entry);
    }
  } catch {
    return initial;
  }
  return initial;
}

export function createRankingStore(storage) {
  let raw;
  let current = snapshot();
  let persistent = !!storage;

  function sync() {
    if (!persistent) return;
    try {
      const value = storage.getItem(STORAGE_KEY);
      if (value !== raw) {
        raw = value;
        current = snapshot(raw);
      }
    } catch {
      persistent = false;
    }
  }

  function persist() {
    if (!persistent) return false;
    try {
      const data = { version: 1, alias: current.alias, recent: current.recent, rows: [...current.board.values()].flat() };
      raw = JSON.stringify(data);
      storage.setItem(STORAGE_KEY, raw);
      return true;
    } catch {
      persistent = false;
      return false;
    }
  }

  function record(board, id, seconds, moves) {
    if (!validId(id) || !Number.isFinite(seconds) || seconds < 0) return false;
    const ms = Math.round(seconds * 1000);
    if (!integerBetween(ms, 0, MAX_TIME_MS)) return false;
    sync();
    if (current.recent.includes(id) || [...current.board.values()].some(rows => rows.some(row => row.id === id))) return false;
    current.recent.push(id);
    if (current.recent.length > RECENT_IDS) current.recent.shift();
    const entry = { board, id, alias: current.alias, ms, at: Date.now() };
    if (moves !== undefined) entry.moves = moves;
    const placed = keepBest(current.board.get(board) ?? [], current.board, entry);
    persist();
    return placed;
  }

  return {
    alias() { sync(); return current.alias; },
    setAlias(name) { sync(); current.alias = displayName(name); return persist(); },
    isPersistent() { sync(); return persistent; },
    rows(board) { sync(); return (current.board.get(board) ?? []).map(row => ({ ...row })); },
    recordMatch(data) {
      const { botId, moves, seconds, id } = data ?? {};
      const bot = BOARDS.get(botId);
      return !!bot?.goal && integerBetween(moves, 0, 10_000) && record(botId, id, seconds, moves);
    },
    recordPuzzle(data) {
      const { kind, seconds, id } = data ?? {};
      return (kind === 'mate1' || kind === 'mate2') && record(kind, id, seconds);
    },
  };
}

function timeLabel(ms) {
  const tenths = Math.round(ms / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  const minutes = Math.floor(tenths / 600);
  return `${minutes}:${(tenths % 600 / 10).toFixed(1).padStart(4, '0')}`;
}

export function mountRankings(container) {
  const doc = container.ownerDocument;
  const view = doc.defaultView;
  let storage;
  try { storage = view.localStorage; } catch { storage = undefined; }
  const store = createRankingStore(storage);
  container.classList.add('cw-rankings');

  const heading = doc.createElement('div');
  heading.className = 'cw-rankings-heading';
  const scope = doc.createElement('p');
  scope.className = 'cw-rankings-scope';
  const board = doc.createElement('select');
  board.setAttribute('aria-label', 'Leaderboard');
  for (const [label, matches] of [['Bot matches', true], ['Puzzles', false]]) {
    const group = doc.createElement('optgroup');
    group.label = label;
    for (const [id, config] of BOARDS) {
      if (!!config.goal !== matches) continue;
      const option = doc.createElement('option');
      option.value = id;
      option.textContent = config.label;
      group.append(option);
    }
    board.append(group);
  }
  const filter = doc.createElement('label');
  filter.append('Leaderboard', board);
  heading.append(filter, scope);

  const form = doc.createElement('form');
  form.className = 'cw-rankings-alias';
  const profileLabel = doc.createElement('label');
  profileLabel.textContent = 'Player name';
  const alias = doc.createElement('input');
  alias.type = 'text';
  alias.maxLength = ALIAS_LENGTH;
  alias.autocomplete = 'off';
  alias.dir = 'auto';
  profileLabel.append(alias);
  const save = doc.createElement('button');
  save.type = 'submit';
  save.textContent = 'Save name';
  const notice = doc.createElement('p');
  notice.setAttribute('role', 'status');
  notice.className = 'cw-rankings-notice';
  form.append(profileLabel, save, notice);

  const rule = doc.createElement('p');
  rule.className = 'cw-rankings-rule';
  const results = doc.createElement('div');
  results.className = 'cw-rankings-results';
  container.append(heading, form, rule, results);

  function refresh() {
    if (doc.activeElement !== alias) alias.value = store.alias();
    scope.textContent = store.isPersistent()
      ? 'Ranks and player names are saved in this browser.'
      : 'Ranks and player names are kept in this tab until it closes.';
    const selected = BOARDS.get(board.value);
    const rows = store.rows(board.value);
    rule.textContent = selected.goal
      ? 'Fewest moves ranks first. Fastest time breaks ties.'
      : 'Fastest solve ranks first.';
    results.replaceChildren();
    if (!rows.length) {
      const message = doc.createElement('p');
      message.className = 'cw-rankings-empty';
      const action = selected.goal === 'win' ? `Beat ${selected.label}` : selected.goal === 'draw'
        ? `Draw a game against ${selected.label}` : `Solve a ${selected.label.toLowerCase()} puzzle`;
      message.textContent = `${action} to set a record.`;
      results.append(message);
      return;
    }

    const table = doc.createElement('table');
    table.setAttribute('aria-label', `${selected.label} leaderboard`);
    const header = table.createTHead().insertRow();
    for (const label of (selected.goal ? ['Rank', 'Player', 'Moves', 'Time'] : ['Rank', 'Player', 'Time'])) {
      const th = doc.createElement('th');
      th.scope = 'col';
      th.textContent = label;
      header.append(th);
    }
    const body = table.createTBody();
    rows.forEach((entry, i) => {
      const row = body.insertRow();
      const rank = row.insertCell();
      rank.textContent = String(i + 1);
      const player = row.insertCell();
      player.textContent = entry.alias;
      player.dir = 'auto';
      if (selected.goal) row.insertCell().textContent = String(entry.moves);
      row.insertCell().textContent = timeLabel(entry.ms);
    });
    results.append(table);
  }

  board.addEventListener('change', refresh);
  form.addEventListener('submit', event => {
    event.preventDefault();
    store.setAlias(alias.value);
    alias.value = store.alias();
    notice.textContent = `Future scores use the name ${alias.value}.`;
    refresh();
  });
  view.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) refresh();
  });
  refresh();
  return {
    recordMatch(data) { const placed = store.recordMatch(data); if (placed) refresh(); return placed; },
    recordPuzzle(data) { const placed = store.recordPuzzle(data); if (placed) refresh(); return placed; },
    refresh,
  };
}
