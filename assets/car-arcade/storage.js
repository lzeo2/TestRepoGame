const MAX_BYTES = 128 * 1024;
const KEYS = new Set(['slipstream-borough-v1', 'garage-borough-v1']);
const encoder = new TextEncoder();

function checkKey(key) {
  if (!KEYS.has(key)) throw new Error('Unsupported save key.');
}

function checkSize(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_BYTES || encoder.encode(raw).length > MAX_BYTES) {
    throw new Error('Save exceeds 128 KiB.');
  }
}

function checkedState(state, validate) {
  // The game validator checks descriptors before reading and returns canonical data.
  const result = validate(state);
  if (!result || typeof result !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(result))) {
    throw new Error('Invalid save profile.');
  }
  return result;
}

export function loadSave(key, validate, storage) {
  let raw = null;
  let error = 'Save storage is unavailable. Reload or explicitly reset before saving.';
  try {
    checkKey(key);
    const store = storage === undefined ? globalThis.localStorage : storage;
    raw = store.getItem(key);
    if (raw === null) return { state: null, error: null, raw };
    error = 'Saved data is invalid or exceeds 128 KiB. Original data was not changed.';
    checkSize(raw);
    const state = checkedState(JSON.parse(raw), validate);
    return { state, error: null, raw };
  } catch {
    return { state: null, error, raw };
  }
}

export function saveSave(key, state, validate, expectedRaw, storage) {
  let raw = null;
  let error = 'Save storage is unavailable. Reload or explicitly reset before saving.';
  try {
    checkKey(key);
    const store = storage === undefined ? globalThis.localStorage : storage;
    raw = store.getItem(key);
    if ((expectedRaw !== null && typeof expectedRaw !== 'string') || raw !== expectedRaw) {
      return { raw, error: 'Save changed elsewhere. Reload before saving; no data was written.' };
    }
    error = 'Profile is invalid or exceeds 128 KiB. No data was written.';
    const nextRaw = JSON.stringify(checkedState(state, validate));
    checkSize(nextRaw);
    error = 'Save write failed (storage denied or quota full). Progress is not saved.';
    // ponytail: exact-byte stale check only, not a cross-tab transaction or ABA lock.
    store.setItem(key, nextRaw);
    return { raw: nextRaw, error: null };
  } catch {
    return { raw, error };
  }
}
