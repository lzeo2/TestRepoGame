/* =========================================================================
 * Merge Cats Defender — Core: AudioManager
 *
 * The asset pack ships NO audio files, but the UI has music/sound/vibrate
 * toggles. This manager synthesises tiny WebAudio blips so the game feels
 * alive and NEVER crashes on a missing sound key. All calls are mute-aware.
 * ========================================================================= */
window.PD = window.PD || {};

PD.Audio = {
  ctx: null,

  _ctx: function () {
    if (this.ctx) return this.ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    } catch (e) { this.ctx = null; }
    return this.ctx;
  },

  _s: function () { return PD.Save.load().settings; },

  // Low-level tone generator ------------------------------------------------
  _tone: function (freq, dur, type, gain) {
    if (!this._s().sound) return;
    var ctx = this._ctx();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    var t = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  },

  // Named SFX — safe no-ops when muted -------------------------------------
  shoot:    function () { this._tone(660, 0.06, 'square', 0.05); },
  hit:      function () { this._tone(300, 0.05, 'sawtooth', 0.05); },
  explode:  function () { this._tone(120, 0.22, 'sawtooth', 0.09); this._tone(90, 0.28, 'triangle', 0.06); },
  place:    function () { this._tone(520, 0.08, 'sine', 0.08); this._tone(780, 0.10, 'sine', 0.05); },
  coin:     function () { this._tone(880, 0.06, 'sine', 0.06); this._tone(1180, 0.06, 'sine', 0.05); },
  click:    function () { this._tone(440, 0.05, 'square', 0.06); },
  error:    function () { this._tone(160, 0.14, 'square', 0.07); },
  bossHorn: function () { this._tone(140, 0.5, 'sawtooth', 0.1); this._tone(180, 0.5, 'triangle', 0.07); },
  win:      function () { var self = this;[523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { self._tone(f, 0.18, 'triangle', 0.08); }, i * 120); }); },
  lose:     function () { var self = this;[440, 349, 262].forEach(function (f, i) { setTimeout(function () { self._tone(f, 0.28, 'sawtooth', 0.08); }, i * 180); }); },

  vibrate: function (ms) {
    if (this._s().vibrate && navigator.vibrate) { try { navigator.vibrate(ms || 20); } catch (e) {} }
  },

  /* ---- Music (looping soundtrack, separate from synthesized SFX) ---------
   * One authoritative Phaser sound instance lives across scene transitions.
   * `pending` is the last requested key (remembered even when muted or when
   * autoplay is blocked). SFX stay governed by the separate `sound` setting. */
  music: { current: null, key: null, pending: null, failed: {}, armed: false },

  _soundMgr: function () {
    return (window.PawDefenseGame && window.PawDefenseGame.sound) || null;
  },

  // Request a scene's soundtrack. Idempotent for the already-active key.
  playMusic: function (key) {
    if (!key) return;
    this.music.pending = key;
    if (!this._s().music) return;                 // muted: remembered, not played
    var mgr = this._soundMgr();
    if (!mgr) return;
    if (this.music.key === key && this.music.current && this.music.current.isPlaying) return;
    this._startMusic(key);
    this._armAutoplayRetry();
  },

  _startMusic: function (key) {
    var mgr = this._soundMgr();
    if (!mgr) return;
    if (this.music.failed[key]) return;           // never retry a broken asset
    if (!mgr.game.cache.audio.exists(key)) { this.music.failed[key] = true; return; }
    this._disposeCurrent();                        // single authoritative player
    var snd;
    try { snd = mgr.add(key, { loop: true, volume: 0.35 }); }
    catch (e) { this.music.failed[key] = true; return; }
    this.music.current = snd;
    this.music.key = key;
    try { snd.play(); } catch (e) { /* locked/blocked -> retried on first gesture */ }
  },

  _disposeCurrent: function () {
    if (this.music.current) {
      try { this.music.current.stop(); this.music.current.destroy(); } catch (e) {}
      this.music.current = null;
    }
    this.music.key = null;
  },

  // Full stop (forget the pending track too).
  stopMusic: function () {
    this.music.pending = null;
    this._disposeCurrent();
  },

  // Music toggle: OFF stops audio but remembers the scene's track; ON resumes it.
  setMusicEnabled: function (on) {
    if (on) { if (this.music.pending) this.playMusic(this.music.pending); }
    else { this._disposeCurrent(); }              // keep `pending` for re-enable
  },

  // When autoplay is blocked, retry the pending track after the first gesture.
  _armAutoplayRetry: function () {
    if (this.music.armed) return;
    this.music.armed = true;
    var self = this, mgr = this._soundMgr();
    var retry = function () {
      if (self._s().music && self.music.pending &&
          (!self.music.current || !self.music.current.isPlaying)) {
        self._startMusic(self.music.pending);
      }
    };
    if (mgr && mgr.locked && mgr.once) { mgr.once('unlocked', retry); }
    window.addEventListener('pointerdown', retry, { once: true });
    window.addEventListener('keydown', retry, { once: true });
  }
};
