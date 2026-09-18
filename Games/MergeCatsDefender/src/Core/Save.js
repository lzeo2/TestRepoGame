/* =========================================================================
 * Merge Cats Defender — Core: local persistence (localStorage)
 * Stores currency, unit unlocks, chosen roster, and level progress.
 * ========================================================================= */
window.PD = window.PD || {};

PD.Save = {
  KEY: 'pawdefense.save.v1',
  data: null,

  // Supported display-scaling modes. `fit` is the compatibility default:
  // pre-change saves (and any unknown stored value) normalize to it so older
  // data always loads with the complete letterboxed game view.
  DISPLAY_MODES: ['fit', 'fill'],
  DISPLAY_DEFAULT: 'fit',

  _default: function () {
    return {
      coins: 300,
      gems: 5,
      unlocks: PD.STARTER_UNLOCKS.slice(),
      roster: PD.DEFAULT_ROSTER.slice(),
      cleared: [],          // level indexes cleared
      settings: { music: true, sound: true, vibrate: true, display: this.DISPLAY_DEFAULT }
    };
  },

  // Bring a loaded settings object up to the current schema without discarding
  // unrelated fields. Only `display` needs validation today; audio/vibration are
  // plain booleans defaulted by field-fill below.
  _normalizeSettings: function (settings) {
    var s = settings || {};
    if (this.DISPLAY_MODES.indexOf(s.display) === -1) s.display = this.DISPLAY_DEFAULT;
    return s;
  },

  load: function () {
    if (this.data) return this.data;
    try {
      var raw = window.localStorage.getItem(this.KEY);
      this.data = raw ? JSON.parse(raw) : this._default();
    } catch (e) {
      this.data = this._default();
    }
    // Fill any missing top-level fields from defaults (forward-compat)
    var d = this._default();
    for (var k in d) if (!(k in this.data)) this.data[k] = d[k];
    // Fill any missing settings sub-fields, then validate display mode.
    this.data.settings = this.data.settings || {};
    for (var sk in d.settings) if (!(sk in this.data.settings)) this.data.settings[sk] = d.settings[sk];
    this._normalizeSettings(this.data.settings);
    return this.data;
  },

  // Persist a validated display-scaling mode. Unknown values fall back to the
  // compatibility default; existing progress and other settings are untouched.
  setDisplayMode: function (mode) {
    var s = this.load().settings;
    s.display = (this.DISPLAY_MODES.indexOf(mode) === -1) ? this.DISPLAY_DEFAULT : mode;
    this.save();
    return s.display;
  },

  displayMode: function () {
    return this._normalizeSettings(this.load().settings).display;
  },

  save: function () {
    try { window.localStorage.setItem(this.KEY, JSON.stringify(this.data)); }
    catch (e) { /* storage disabled — run in-memory only */ }
  },

  addCoins: function (n) { this.load().coins += n; this.save(); },
  addGems:  function (n) { this.load().gems  += n; this.save(); },

  isUnlocked: function (unitId) { return this.load().unlocks.indexOf(unitId) !== -1; },

  unlock: function (unitId) {
    var d = this.load();
    if (d.unlocks.indexOf(unitId) === -1) { d.unlocks.push(unitId); this.save(); return true; }
    return false;
  },

  isCleared: function (levelIndex) { return this.load().cleared.indexOf(levelIndex) !== -1; },

  isLevelUnlocked: function (levelIndex) {
    return levelIndex === 0 || this.isCleared(levelIndex - 1);
  },

  // Returns list of newly unlocked unit ids.
  clearLevel: function (levelIndex, coinReward, gemReward) {
    var d = this.load();
    if (d.cleared.indexOf(levelIndex) === -1) d.cleared.push(levelIndex);
    d.coins += coinReward || 0;
    d.gems += gemReward || 0;
    var newly = [];
    var grants = PD.UNLOCK_ON_CLEAR[levelIndex] || [];
    for (var i = 0; i < grants.length; i++) {
      if (this.unlock(grants[i])) newly.push(grants[i]);
    }
    this.save();
    return newly;
  }
};
