import assert from 'node:assert/strict';
import {CompletionCue} from './completion-cue.mjs';

function audioDouble(options = {}) {
  const contexts = [];
  class AudioContext {
    constructor() {
      if (options.constructError) throw new Error('Audio denied');
      this.state = options.state ?? 'suspended';
      this.currentTime = 4;
      this.destination = {};
      this.oscillators = [];
      this.gains = [];
      this.resumes = 0;
      this.closes = 0;
      contexts.push(this);
    }
    resume() {
      this.resumes++;
      if (options.resumeThrow) throw new Error('Permission denied');
      if (options.resumeReject) return Promise.reject(new Error('Permission denied'));
      if (options.resumePending) return new Promise(resolve => { this.finishResume = resolve; });
      if (!options.staySuspended) this.state = 'running';
      return Promise.resolve();
    }
    close() {
      this.closes++;
      this.state = 'closed';
      if (options.closeThrow) throw new Error('Close denied');
      if (options.closeReject) return Promise.reject(new Error('Close denied'));
      if (options.closePending) return new Promise(resolve => { this.finishClose = resolve; });
      return Promise.resolve();
    }
    createOscillator() {
      if (options.oscillatorError) throw new Error('Oscillator denied');
      const oscillator = node('oscillator');
      oscillator.frequency = parameter();
      oscillator.starts = [];
      oscillator.stops = [];
      oscillator.start = time => {
        if (options.startError) throw new Error('Start denied');
        oscillator.starts.push(time);
      };
      oscillator.stop = time => {
        oscillator.stops.push(time);
        if (options.stopError) throw new Error('Stop denied');
      };
      this.oscillators.push(oscillator);
      return oscillator;
    }
    createGain() {
      if (options.gainError) throw new Error('Gain denied');
      const gain = node('gain');
      gain.gain = parameter();
      this.gains.push(gain);
      return gain;
    }
  }
  function parameter() {
    return {
      events: [],
      setValueAtTime(value, time) { this.events.push(['set', value, time]); },
      linearRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); },
    };
  }
  function node(kind) {
    return {
      connections: [], disconnects: 0,
      connect(target) {
        if (options.connectError === kind) throw new Error('Connection denied');
        this.connections.push(target);
      },
      disconnect() {
        this.disconnects++;
        this.connections = [];
        if (options.disconnectError) throw new Error('Disconnect denied');
      },
    };
  }
  return {contexts, cue: new CompletionCue({AudioContext})};
}

let groups = 0;
{
  const {cue, contexts} = audioDouble();
  assert.equal(cue.status, 'locked');
  assert.equal(cue.play(), false);
  assert.equal(cue.play(false), false);
  assert.equal(contexts.length, 0, 'construction/play must not create audio before a gesture');
  const unlocked = cue.unlock();
  assert.equal(contexts.length, 1, 'context construction stays on the gesture stack');
  assert.equal(contexts[0].resumes, 1, 'resume stays on the gesture stack');
  assert.equal(cue.play(), false, 'resume settlement is required');
  assert.equal(await unlocked, true);
  const context = contexts[0];
  assert.equal(context.oscillators.length, 0, 'unlock is silent');
  assert.equal(cue.status, 'ready');
  assert.equal(cue.play(false), false);
  assert.equal(context.oscillators.length, 0, 'mute makes no nodes');
  assert.equal(cue.play(), true);
  const first = context.oscillators[0];
  const gain = context.gains[0];
  assert.equal(first.type, 'sine');
  assert.deepEqual(first.frequency.events, [['set', 880, 4]]);
  assert.deepEqual(first.starts, [4]);
  assert.deepEqual(first.stops, [4.12]);
  assert.deepEqual(gain.gain.events, [['set', 0, 4], ['ramp', 0.025, 4.008], ['ramp', 0, 4.12]]);
  assert.ok(gain.gain.events.every(([, value]) => value >= 0 && value <= 0.035));
  assert.deepEqual(first.connections, [gain]);
  assert.deepEqual(gain.connections, [context.destination]);
  assert.equal(cue.play(), true, 'parent, not cue, deduplicates objectives');
  assert.equal(first.disconnects, 1);
  assert.equal(gain.disconnects, 1);
  assert.equal(first.onended, null);
  assert.deepEqual(first.stops, [4.12, undefined], 'replacement prevents gain stacking');
  const second = context.oscillators[1];
  second.onended();
  assert.equal(second.disconnects, 1);
  assert.equal(context.gains[1].disconnects, 1);
  assert.equal(second.onended, null);
  assert.equal(await cue.unlock(), true);
  assert.equal(contexts.length, 1);
  assert.equal(context.resumes, 1);
  context.state = 'suspended';
  assert.equal(cue.play(), false, 'suspension never triggers an automatic resume');
  assert.equal(context.resumes, 1);
  assert.equal(await cue.unlock(), true);
  assert.equal(cue.play(), true);
  assert.equal(await cue.dispose(), true);
  assert.equal(context.oscillators[2].disconnects, 1);
  assert.equal(context.gains[2].disconnects, 1);
  assert.equal(context.closes, 1);
  assert.equal(await cue.dispose(), true);
  assert.equal(context.closes, 1);
  assert.equal(cue.status, 'disposed');
  assert.equal(cue.play(), false);
  assert.equal(await cue.unlock(), false);
  groups++;
}
{
  const {cue,contexts}=audioDouble();await cue.unlock();assert.equal(cue.play(),true);
  const voice=contexts[0].oscillators[0];assert.equal(cue.play(false),false);
  assert.equal(voice.disconnects,1);assert.deepEqual(voice.stops,[4.12,undefined],'mute stops the current cue immediately');
  assert.equal(contexts[0].gains[0].disconnects,1);assert.equal(await cue.dispose(),true);groups++;
}
{
  const cue = new CompletionCue({AudioContext: null});
  assert.equal(await cue.unlock(), false);
  assert.equal(cue.status, 'unsupported');
  assert.equal(cue.play(), false);
  assert.equal(await cue.dispose(), true);
  const {cue: denied, contexts} = audioDouble({constructError: true});
  assert.equal(await denied.unlock(), false);
  assert.equal(denied.status, 'blocked');
  assert.equal(contexts.length, 0);
  assert.equal(await denied.dispose(), true);
  groups++;
}
{
  for (const failure of ['resumeReject', 'resumeThrow', 'staySuspended']) {
    const {cue, contexts} = audioDouble({[failure]: true});
    assert.equal(await cue.unlock(), false, failure);
    assert.equal(cue.status, 'blocked');
    assert.equal(cue.play(), false);
    assert.equal(contexts[0].closes, 1);
    assert.equal(contexts[0].oscillators.length, 0);
    assert.equal(await cue.dispose(), true);
  }
  const {cue, contexts} = audioDouble({resumeReject: true});
  assert.equal(await cue.unlock(), false);
  assert.equal(await cue.unlock(), false, 'a later gesture may retry without leaked contexts');
  assert.equal(contexts.length, 2);
  assert.ok(contexts.every(context => context.closes === 1));
  groups++;
}
{
  for (const options of [
    {oscillatorError: true}, {gainError: true}, {connectError: 'oscillator'},
    {connectError: 'gain'}, {startError: true}, {stopError: true},
  ]) {
    const {cue, contexts} = audioDouble(options);
    assert.equal(await cue.unlock(), true);
    assert.equal(cue.play(), false, JSON.stringify(options));
    assert.equal(cue.status, 'error');
    const context = contexts[0];
    assert.equal(context.closes, 1);
    for (const node of [...context.oscillators, ...context.gains]) {
      assert.equal(node.disconnects, 1, JSON.stringify(options));
      assert.deepEqual(node.connections, []);
    }
    assert.equal(cue.play(), false);
    assert.equal(await cue.dispose(), true);
  }
  groups++;
}
{
  for (const options of [{closeReject: true}, {closeThrow: true}, {disconnectError: true}]) {
    const {cue, contexts} = audioDouble(options);
    assert.equal(await cue.unlock(), true);
    assert.equal(cue.play(), true);
    assert.equal(await cue.dispose(), false, 'cleanup errors are boolean, never unhandled');
    assert.equal(contexts[0].closes, 1);
    assert.equal(contexts[0].oscillators[0].disconnects, 1);
    assert.equal(contexts[0].gains[0].disconnects, 1);
    assert.equal(cue.play(), false);
    assert.equal(await cue.unlock(), false);
    await cue.dispose();
    assert.equal(contexts[0].closes, 1);
  }
  const {cue} = audioDouble({resumeReject: true, closeReject: true});
  assert.equal(await cue.unlock(), false);
  assert.equal(cue.status, 'blocked');
  groups++;
}
{
  const {cue, contexts} = audioDouble({resumePending: true});
  const unlock = cue.unlock();
  assert.equal(cue.play(), false);
  assert.equal(await cue.dispose(), true);
  contexts[0].finishResume();
  assert.equal(await unlock, false, 'late resume cannot revive a disposed cue');
  assert.equal(cue.status, 'disposed');
  assert.equal(contexts[0].closes, 1);
  groups++;
}
{
  const options = {staySuspended: true, closePending: true};
  const {cue, contexts} = audioDouble(options);
  const blockedUnlock = cue.unlock();
  await Promise.resolve();
  assert.equal(contexts[0].closes, 1);
  options.staySuspended = false;
  options.closePending = false;
  assert.equal(await cue.unlock(), true);
  contexts[0].finishClose();
  assert.equal(await blockedUnlock, false, 'a later successful gesture cannot rewrite an earlier failure');
  assert.equal(cue.status, 'ready');
  assert.equal(cue.play(), true);
  assert.equal(await cue.dispose(), true);
  assert.ok(contexts.every(context => context.closes === 1));
  groups++;
}
console.log(`completion-cue: ${groups} groups passed (gesture/mute/envelope/repeat/cleanup/permission/dispose races)`);
