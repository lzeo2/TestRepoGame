import { WEAPON_WHEEL_KEY } from './weapon-wheel.js';

const STORAGE_KEY = 'capital-drive-utility-keys-v1';
export const UTILITY_KINDS = ['medkit', 'repair-kit', 'jammer'];
export const UTILITY_NAMES = { 'medkit': 'Medkit', 'repair-kit': 'Repair kit', 'jammer': 'Jammer' };
export const DEFAULT_UTILITY_KEYS = { 'medkit': 'Digit8', 'repair-kit': 'Digit9', 'jammer': 'Digit0' };

// Codes the core dispatch in script.js already handles; rebinding must not shadow them.
const CORE_CONTROL_CODES = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX', 'KeyZ', 'KeyI', 'KeyF', 'KeyY', 'KeyL',
  'KeyN', 'KeyO', 'KeyR', 'KeyV', 'KeyC', 'KeyU', 'KeyT', 'KeyQ', 'KeyB', 'KeyM',
  'KeyP', 'KeyJ', 'KeyK', 'KeyE', 'KeyG', 'KeyH', 'Escape', 'Space', 'ShiftLeft',
  'ShiftRight', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1',
  WEAPON_WHEEL_KEY,
  ...Array.from({ length: 7 }, (_, index) => 'Digit' + (index + 1)),
]);

const CODE_PATTERN = /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|F([1-9]|1[0-2])|Comma|Period|Slash|Semicolon|Quote|Backquote|BracketLeft|BracketRight|Minus|Equal|Backslash)$/;

let keys = { ...DEFAULT_UTILITY_KEYS };

function storage() { return typeof localStorage === 'undefined' ? null : localStorage; }

function validCode(code) { return typeof code === 'string' && CODE_PATTERN.test(code); }

function normalizeKeys(saved) {
  const result = {}, used = new Set();
  for (const kind of UTILITY_KINDS) {
    const code = saved?.[kind];
    if (validCode(code) && !CORE_CONTROL_CODES.has(code) && !used.has(code)) {
      result[kind] = code;
      used.add(code);
    }
  }
  const defaults = Object.values(DEFAULT_UTILITY_KEYS);
  for (const kind of UTILITY_KINDS) {
    if (result[kind]) continue;
    const preferred = DEFAULT_UTILITY_KEYS[kind];
    const code = used.has(preferred) ? defaults.find(value => !used.has(value)) : preferred;
    result[kind] = code;
    used.add(code);
  }
  return result;
}

export function loadUtilityKeys() {
  let saved = null;
  try { saved = JSON.parse(storage()?.getItem(STORAGE_KEY) ?? 'null'); } catch { saved = null; }
  keys = normalizeKeys(saved);
  return { ...keys };
}

export function saveUtilityKeys(next) {
  keys = normalizeKeys(next);
  try { storage()?.setItem(STORAGE_KEY, JSON.stringify(keys)); } catch { /* settings stay for this session */ }
  return { ...keys };
}

export function rebindUtility(kind, code) {
  if (!UTILITY_KINDS.includes(kind)) return { ok: false, message: 'Unknown utility item.' };
  if (!validCode(code)) return { ok: false, message: 'That key cannot be used.' };
  if (CORE_CONTROL_CODES.has(code)) return { ok: false, message: 'That key is used by the game controls.' };
  const holder = UTILITY_KINDS.find(other => keys[other] === code);
  if (holder && holder !== kind) {
    return { ok: false, message: `That key is used by the ${UTILITY_NAMES[holder].toLowerCase()}.` };
  }
  keys[kind] = code;
  saveUtilityKeys(keys);
  return { ok: true, message: `${UTILITY_NAMES[kind]} set to ${keyLabelFor(code)}.` };
}

export function utilityKeyFor(kind) { return keys[kind] ?? null; }

export function matchUtilityKey(code) { return UTILITY_KINDS.find(kind => keys[kind] === code) ?? null; }

export function keyLabelFor(code) {
  if (!validCode(code)) return code;
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit') || code.startsWith('Numpad')) return code.slice(-1);
  return { Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\' }[code] ?? code;
}
