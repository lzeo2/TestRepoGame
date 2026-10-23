export const SAVE_KEY = 'citisten-save-v1';

// Storage is optional: private browsing/quota/corrupt data must not stop play.
export function readSave(storage) {
  try {
    const json = (storage ?? globalThis.localStorage).getItem(SAVE_KEY);
    if (!json) return { snapshot: null, error: '' };
    if (json.length > 8_000_000) throw new Error('Save is too large');
    const snapshot = JSON.parse(json);
    if (snapshot?.version !== 1 || !snapshot.state || !Array.isArray(snapshot.roads)) throw new Error('Unsupported save');
    return { snapshot, error: '' };
  } catch (error) {
    return { snapshot: null, error: `Saved town unavailable: ${error.message}` };
  }
}

export function saveTown(sim, { storage, speed = sim.state.speed } = {}) {
  try {
    const snapshot = sim.snapshot();
    snapshot.state.speed = speed; // Menu/tutorial pause is not the player's speed selection.
    (storage ?? globalThis.localStorage).setItem(SAVE_KEY, JSON.stringify(snapshot));
    return { ok: true, error: '' };
  } catch (error) {
    return { ok: false, error: `Town could not be saved: ${error.message}` };
  }
}
