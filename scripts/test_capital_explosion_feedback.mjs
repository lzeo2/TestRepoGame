import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../Games/Capital Drive/script.js', import.meta.url), 'utf8');
const start = source.indexOf('function combatFeedback(event){');
const end = source.indexOf('\n}', start) + 2;
assert(start >= 0 && end > start);
const nodes = [], buffers = [];
const param = () => ({ value: 0, events: [],
  setValueAtTime(value, time) { this.events.push({ value, time }); },
  linearRampToValueAtTime(value, time) { this.events.push({ value, time }); },
  exponentialRampToValueAtTime(value, time) { this.events.push({ value, time }); } });
const node = kind => {
  const value = { kind, frequency: param(), gain: param(), connected: [], disconnected: 0,
    connect(target) { this.connected.push(target); }, disconnect() { this.disconnected++; },
    start(time) { this.startAt = time; }, stop(time) { this.stopAt = time; } };
  nodes.push(value); return value;
};
const audio = { enabled: false, context: { currentTime: 4, sampleRate: 8000, destination: {},
  createGain: () => node('gain'), createOscillator: () => node('tone'),
  createBufferSource: () => node('noise'), createBiquadFilter: () => node('filter'),
  createBuffer(channels, length) { const buffer = { getChannelData: () => new Float32Array(length) }; buffers.push(buffer); return buffer; } } };
const gameplay = { state: { weapon: 'unarmed', health: 100, ammo: 4, reloading: 0 } };
const stateBefore = JSON.stringify(gameplay.state);
const feedback = runInNewContext(source.slice(start, end)+';combatFeedback', {
  audio, gameplay, weaponById: () => null, combatCueTime: 0, combatReloadDuration: 0,
  combatStatusText: '', combatStatusTime: 0, Math, Set
});
feedback({ kind: 'explosion' });
assert.equal(nodes.length, 0, 'Muted explosions allocate no audio nodes');
audio.enabled = true;
feedback({ kind: 'explosion' });
assert.equal(audio.voices.size, 1);
const voice = [...audio.voices][0];
assert.equal(voice.tone.type, 'sawtooth');
assert(voice.tone.frequency.events[0].value < 100, 'Detonation starts with a low-frequency impact');
assert(voice.tone.stopAt > 4.2 && voice.tone.stopAt < 4.5, 'Detonation has a bounded audible decay');
assert.equal(voice.filter.type, 'lowpass');
assert(voice.filter.frequency.value < 1000);
for (let i = 0; i < 12; i++) feedback({ kind: 'explosion' });
assert.equal(audio.voices.size, 6, 'Existing six-voice cap also bounds explosions');
assert.equal(buffers.length, 1, 'Repeated explosions share one noise buffer');
const allocated = nodes.length;
feedback({ kind: 'explosion' });
assert.equal(nodes.length, allocated, 'Saturated audio creates no additional nodes');
for (const current of [...audio.voices]) current.tone.onended();
assert.equal(audio.voices.size, 0, 'Ended voices release the cap');
assert(nodes.every(current => current.disconnected === 1), 'Every voice node disconnects exactly once');
assert.equal(JSON.stringify(gameplay.state), stateBefore, 'Audio does not write gameplay health or ammunition');
console.log('PASS explosion feedback: actual controller audio, mute, low impact, bounded decay, shared buffer, six voices and cleanup');
