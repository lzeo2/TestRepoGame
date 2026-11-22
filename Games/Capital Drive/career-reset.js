export const SAVE_KEY = 'capital-drive-v1';
export const CAREER_KEY = 'capital-drive-career-v1';
export const TUTORIAL_KEY = 'capital-drive-tutorial-v1';
export const CAPITAL_PROGRESS_KEYS = Object.freeze([SAVE_KEY, TUTORIAL_KEY, CAREER_KEY]);

export function clearCapitalProgress(storage) {
  const saved = [];
  try {
    for (const key of CAPITAL_PROGRESS_KEYS) {
      const value = storage.getItem(key);
      if (value === null) continue;
      if (typeof value !== 'string') throw new Error('Unexpected browser storage value.');
      saved.push({key, value});
    }
  } catch {
    return {ok:false, message:'Capital Drive could not read saved progress.'};
  }

  const attempted = [];
  try {
    for (const record of saved) {
      if (storage.getItem(record.key) !== record.value) throw new Error('Saved progress changed during reset.');
      attempted.push(record);
      storage.removeItem(record.key);
    }
  } catch {
    let restored = true;
    for (const {key, value} of attempted.reverse()) {
      try {
        const current = storage.getItem(key);
        // Another tab may have written here during the reset. Keep its save.
        if (current === null) storage.setItem(key, value);
        else if (current !== value) restored = false;
      } catch {
        restored = false;
      }
    }
    return {ok:false, message:restored ? 'The reset stopped. Your saved progress was restored.' :
      'The reset stopped before all saved progress could be restored.'};
  }

  return {ok:true, message:'Capital Drive progress cleared.'};
}
