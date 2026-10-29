// Parent calls unlock() from a start gesture and play(preference) only for a
// newly completed objective. This module neither observes nor deduplicates goals.
const attempt = operation => {
  try { operation(); return true; } catch { return false; }
};

export class CompletionCue {
  #AudioContext;
  #context = null;
  #voice = null;
  #unlocked = false;
  #disposed = false;
  #status = 'locked';

  constructor({AudioContext = globalThis.AudioContext ?? globalThis.webkitAudioContext} = {}) {
    this.#AudioContext = AudioContext;
  }

  // Last outcome: locked, ready, unsupported, blocked, error or disposed.
  get status() { return this.#status; }

  // Resolves to false on unavailable/blocked audio. No sound is made here.
  async unlock() {
    if (this.#disposed) return false;
    if (typeof this.#AudioContext !== 'function') {
      this.#status = 'unsupported';
      return false;
    }
    let context;
    try {
      context = this.#context ??= new this.#AudioContext();
      if (context.state !== 'running') await context.resume();
      if (this.#disposed || context !== this.#context) return false;
      this.#unlocked = context.state === 'running';
      this.#status = this.#unlocked ? 'ready' : 'blocked';
      if (!this.#unlocked) {
        await this.#release();
        return false;
      }
      return true;
    } catch {
      if (!this.#disposed && (!context || context === this.#context)) {
        this.#status = 'blocked';
        await this.#release();
      }
      return false;
    }
  }

  // Synchronous boolean. Never creates/resumes a context, including when muted.
  // Monophonic replacement keeps overlapping events from stacking their gain.
  play(enabled = true) {
    const context = this.#context;
    if (!enabled) { this.#cleanVoice(this.#voice, true); return false; }
    if (this.#disposed || !this.#unlocked || context?.state !== 'running') return false;
    this.#cleanVoice(this.#voice, true);
    const voice = {oscillator: null, gain: null};
    this.#voice = voice;
    try {
      voice.oscillator = context.createOscillator();
      voice.gain = context.createGain();
      const now = context.currentTime;
      voice.oscillator.type = 'sine';
      voice.oscillator.frequency.setValueAtTime(880, now);
      voice.gain.gain.setValueAtTime(0, now);
      voice.gain.gain.linearRampToValueAtTime(0.025, now + 0.008);
      voice.gain.gain.linearRampToValueAtTime(0, now + 0.12);
      voice.oscillator.connect(voice.gain);
      voice.gain.connect(context.destination);
      voice.oscillator.onended = () => this.#cleanVoice(voice);
      voice.oscillator.start(now);
      voice.oscillator.stop(now + 0.12);
      this.#status = 'ready';
      return true;
    } catch {
      this.#status = 'error';
      void this.#release();
      return false;
    }
  }

  #cleanVoice(voice, stop = false) {
    if (!voice) return true;
    if (this.#voice === voice) this.#voice = null;
    let ok = true;
    if (voice.oscillator) {
      voice.oscillator.onended = null;
      if (stop) ok = attempt(() => voice.oscillator.stop()) && ok;
      ok = attempt(() => voice.oscillator.disconnect()) && ok;
    }
    if (voice.gain) ok = attempt(() => voice.gain.disconnect()) && ok;
    return ok;
  }

  async #release() {
    this.#unlocked = false;
    const context = this.#context;
    this.#context = null;
    const cleaned = this.#cleanVoice(this.#voice, true);
    try {
      if (context && context.state !== 'closed') await context.close();
      return cleaned;
    } catch { return false; }
  }

  // Stops/disconnects synchronously, then resolves after owned context closure.
  // Idempotent; false reports a platform cleanup failure without throwing.
  async dispose() {
    this.#disposed = true;
    this.#status = 'disposed';
    return this.#release();
  }
}
