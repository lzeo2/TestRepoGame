/* Dependency-free protocol regression, run from the repository root:
node --input-type=module <<'JS'
import assert from 'node:assert/strict';
import { validateInput, validateSnapshot, parseSignal } from './Games/Circuit Ward/multiplayer.js';
const input = { mx: 0, mz: 1, yaw: 0, pitch: 0, fire: false };
assert(validateInput(input));
assert(!validateInput({ ...input, mx: 1 }));
assert(!validateInput({ ...input, yaw: NaN }));
const state = { epoch: 0, phase: 'lobby', wave: 0, score: 0, time: 0,
  players: [{ id: 0, x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, shot: 0 }], bots: [], cells: [] };
assert(validateSnapshot(state));
assert(!validateSnapshot({ ...state, players: [null] }));
assert.throws(() => parseSignal('{}', 'offer'));
console.log('Protocol regression passed');
JS
*/
const MAX_SIGNAL = 32 * 1024;
const MAX_MESSAGE = 16 * 1024;
const PAIR_TIMEOUT = 15000;
const encoder = new TextEncoder();
const phases = ['lobby', 'playing', 'paused', 'won', 'lost'];
const bytes = text => encoder.encode(text).byteLength;
const integer = n => Number.isSafeInteger(n) && n >= 0;
const range = (n, min, max) => Number.isFinite(n) && n >= min && n <= max;
const position = n => range(n, -16, 16);
const sessionOK = value => typeof value === 'string' && /^[a-f0-9]{32}$/.test(value);
const fields = (value, names) => value !== null && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === names.length &&
  names.every(name => Object.hasOwn(value, name));
const unique = list => new Set(list.map(item => item?.id)).size === list.length;
const rosterOK = ids => Array.isArray(ids) && ids.length >= 1 && ids.length <= 4 &&
  ids[0] === 0 && ids.every(id => integer(id) && id <= 3) && new Set(ids).size === ids.length;

export function validateInput(input) {
  return fields(input, ['mx', 'mz', 'yaw', 'pitch', 'fire']) &&
    range(input.mx, -1, 1) && range(input.mz, -1, 1) &&
    Math.hypot(input.mx, input.mz) <= 1.000001 &&
    range(input.yaw, -Math.PI, Math.PI) && range(input.pitch, -1.3, 1.3) &&
    typeof input.fire === 'boolean';
}

export function validateSnapshot(state) {
  if (!fields(state, ['epoch', 'phase', 'wave', 'score', 'time', 'players', 'bots', 'cells']) ||
      !integer(state.epoch) || !phases.includes(state.phase) ||
      !integer(state.wave) || state.wave > 6 || !range(state.score, 0, 1e9) ||
      !range(state.time, 0, Number.MAX_VALUE) ||
      !Array.isArray(state.players) || state.players.length < 1 || state.players.length > 4 ||
      !Array.isArray(state.bots) || state.bots.length > 24 ||
      !Array.isArray(state.cells) || state.cells.length > 8) return false;
  return unique(state.players) && unique(state.bots) && unique(state.cells) &&
    state.players.every(p => fields(p, ['id', 'x', 'z', 'yaw', 'pitch', 'hp', 'shot']) &&
      integer(p.id) && p.id <= 3 && position(p.x) && position(p.z) &&
      range(p.yaw, -Math.PI, Math.PI) && range(p.pitch, -1.3, 1.3) &&
      range(p.hp, 0, 100) && integer(p.shot)) &&
    state.bots.every(b => fields(b, ['id', 'type', 'x', 'y', 'z', 'hp']) &&
      integer(b.id) && ['walker', 'drone'].includes(b.type) && position(b.x) &&
      range(b.y, 0, 6) && position(b.z) && range(b.hp, 0, 100)) &&
    state.cells.every(c => fields(c, ['id', 'x', 'z']) && integer(c.id) &&
      position(c.x) && position(c.z));
}

export function parseSignal(text, type) {
  if (typeof text !== 'string' || text.length > MAX_SIGNAL || bytes(text) > MAX_SIGNAL) {
    throw new Error('Paste a complete offer or answer under 32 KiB.');
  }
  let signal;
  try { signal = JSON.parse(text); }
  catch { throw new Error('The pasted offer or answer is not valid JSON.'); }
  if (!fields(signal, ['v', 'type', 'session', 'slot', 'sdp']) || signal.v !== 1 ||
      signal.type !== type || !sessionOK(signal.session) ||
      !integer(signal.slot) || signal.slot < 1 || signal.slot > 3 ||
      typeof signal.sdp !== 'string' || !signal.sdp.startsWith('v=0') ||
      !signal.sdp.includes('m=application')) {
    throw new Error('This is not a Circuit Ward ' + type + '. Copy the full text.');
  }
  return signal;
}

export class PeerRoom extends EventTarget {
  constructor() {
    super();
    this.role = 'solo';
    this.selfId = 0;
    this.session = '';
    this._peers = new Map();
    this._pending = null;
    this._roster = [];
    this._locked = false;
    this._phase = 'lobby';
    this._epoch = 0;
    this._stateSeq = 0;
    this._controlSeq = 0;
    this._inputSeq = 0;
    this._lastStateSeq = -1;
    this._lastControlSeq = -1;
    this._lastInputAt = -Infinity;
    this._lastBroadcastAt = -Infinity;
    this._lastSnapshotAt = 0;
    this._snapshot = null;
    this._watchdog = null;
    this._heartbeat = null;
  }

  get ids() {
    if (this.role === 'client') return this._peers.get(0)?.ready ? [...this._roster] : [];
    return [0, ...[...this._peers.values()].filter(p => p.ready).map(p => p.id).sort()];
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }

  _change(message, status = this._pending ? 'pairing' : this._phase) {
    this._emit('change', {
      role: this.role, selfId: this.selfId, count: this.ids.length,
      ready: this.role !== 'client' || !!this._peers.get(0)?.ready,
      status: this.role === 'solo' ? 'solo' : status, message
    });
  }

  _failure(message) { this._emit('failure', { message }); }

  host() {
    this.close();
    if (typeof RTCPeerConnection === 'undefined') {
      this._failure('This browser cannot pair players. Solo play is available.');
      return false;
    }
    const random = crypto.getRandomValues(new Uint8Array(16));
    this.session = [...random].map(n => n.toString(16).padStart(2, '0')).join('');
    this.role = 'host';
    // Hidden tabs suspend rendering, but an intentionally paused host is alive.
    this._heartbeat = setInterval(() => {
      if (this._phase === 'paused' && this._snapshot) this.broadcast(this._snapshot);
    }, 1000);
    this._change('Lobby ready. Create one offer for each guest.');
    return true;
  }

  async hostOffer() {
    if (this.role !== 'host' || this._locked || this._pending) {
      throw new Error('Create offers in the lobby, one guest at a time.');
    }
    const id = [1, 2, 3].find(slot => !this._peers.has(slot));
    if (!id) throw new Error('The room already has four players.');
    let peer;
    try {
      peer = this._makePeer(id);
      this._pending = peer;
      this._channel(peer, peer.pc.createDataChannel('fast', { ordered: false, maxRetransmits: 0 }));
      this._channel(peer, peer.pc.createDataChannel('control', { ordered: true }));
      this._change('Creating a local offer. Pairing expires after 15 seconds.', 'pairing');
      await peer.pc.setLocalDescription(await peer.pc.createOffer());
      await this._gather(peer);
      return this._signal(peer, 'offer', id);
    } catch (error) {
      if (peer && !peer.closed) this._failPeer(peer, 'Could not create the offer. Try again or play solo.');
      else if (!peer) this._failure('Could not create a peer connection. Solo play is available.');
      throw error;
    }
  }

  async acceptAnswer(text) {
    const peer = this._pending;
    if (this.role !== 'host' || this._locked || !peer) throw new Error('Create a fresh offer first.');
    try {
      const signal = parseSignal(text, 'answer');
      if (signal.session !== this.session || signal.slot !== peer.id || peer.answering) {
        throw new Error('This answer does not match the pending offer.');
      }
      peer.answering = true;
      await peer.pc.setRemoteDescription({ type: 'answer', sdp: signal.sdp });
      if (peer.closed) throw new Error('The offer has expired. Create a fresh offer.');
      if (!peer.ready) this._change('Answer accepted. Waiting for both data channels.', 'pairing');
    } catch (error) {
      if (!peer.closed) this._failPeer(peer, 'Pairing failed. Create a fresh offer or play solo.');
      throw error;
    }
  }

  async joinOffer(text) {
    let signal;
    try { signal = parseSignal(text, 'offer'); }
    catch (error) { this._failure(error.message); throw error; }
    this.close();
    this.role = 'client';
    this.selfId = signal.slot;
    this.session = signal.session;
    let peer;
    try {
      peer = this._makePeer(0);
      this._pending = peer;
      this._change('Creating an answer. Return it to the host within 15 seconds.', 'pairing');
      await peer.pc.setRemoteDescription({ type: 'offer', sdp: signal.sdp });
      await peer.pc.setLocalDescription(await peer.pc.createAnswer());
      await this._gather(peer);
      return this._signal(peer, 'answer', signal.slot);
    } catch (error) {
      if (peer && !peer.closed) this._failPeer(peer, 'Could not join. Ask for a fresh offer or play solo.');
      else if (!peer) {
        this.close();
        this._failure('This browser cannot pair players. Solo play is available.');
      }
      throw error;
    }
  }

  _signal(peer, type, slot) {
    if (peer.closed || this._peers.get(peer.id) !== peer) throw new Error('Pairing expired. Try a fresh offer.');
    const text = JSON.stringify({ v: 1, type, session: this.session, slot, sdp: peer.pc.localDescription.sdp });
    parseSignal(text, type);
    return text;
  }

  _makePeer(id) {
    const pc = new RTCPeerConnection({ iceServers: [] });
    const peer = {
      id, pc, abort: new AbortController(), fast: null, control: null, ready: false,
      closed: false, welcomed: false, lastInputSeq: -1, lastInputAt: -Infinity,
      windowAt: performance.now(), messages: 0, invalid: 0
    };
    this._peers.set(id, peer);
    peer.timer = setTimeout(() => this._failPeer(peer,
      'Pairing timed out. Local Wi-Fi or the browser may block it. Try a fresh offer or play solo.'), PAIR_TIMEOUT);
    pc.addEventListener('datachannel', event => this._channel(peer, event.channel), { signal: peer.abort.signal });
    pc.addEventListener('connectionstatechange', () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        this._failPeer(peer, peer.ready ? 'A player disconnected. Solo play is available.' :
          'Pairing failed. Try a fresh offer or play solo.');
      }
    }, { signal: peer.abort.signal });
    return peer;
  }

  _channel(peer, channel) {
    const key = channel.label;
    if (peer.closed || !['fast', 'control'].includes(key) || peer[key] ||
        (key === 'fast' && (channel.ordered || channel.maxRetransmits !== 0)) ||
        (key === 'control' && (!channel.ordered || channel.maxRetransmits !== null || channel.maxPacketLifeTime !== null))) {
      channel.close();
      if (!peer.closed) this._failPeer(peer, 'The peer used an incompatible data channel. Try a fresh offer.');
      return;
    }
    peer[key] = channel;
    channel.binaryType = 'arraybuffer';
    channel.addEventListener('open', () => this._ready(peer), { signal: peer.abort.signal });
    channel.addEventListener('message', event => this._receive(peer, key, event.data), { signal: peer.abort.signal });
    channel.addEventListener('close', () => this._failPeer(peer, 'A player disconnected. Solo play is available.'),
      { signal: peer.abort.signal });
    channel.addEventListener('error', () => this._failPeer(peer, 'The local connection stopped. Solo play is available.'),
      { signal: peer.abort.signal });
    this._ready(peer);
  }

  _ready(peer) {
    if (peer.closed || peer.ready || peer.fast?.readyState !== 'open' || peer.control?.readyState !== 'open') return;
    if (this.role === 'client' && !peer.welcomed) return;
    if (this.role === 'host' && this._locked) {
      this._failPeer(peer, 'The match has started. Joining during play is not available.');
      return;
    }
    peer.ready = true;
    clearTimeout(peer.timer);
    if (this._pending === peer) this._pending = null;
    if (this.role === 'host') {
      this._send(peer, 'control', this._packet('welcome', ++this._controlSeq,
        { slot: peer.id, ids: this.ids, locked: this._locked }));
      this._rosterChanged();
      if (this._snapshot) this._send(peer, 'control', this._packet('state', this._stateSeq, { snapshot: this._snapshot }));
    }
    if (!peer.closed) this._change('Player connected. The host starts the match.', 'connected');
  }

  _gather(peer) {
    return new Promise((resolve, reject) => {
      const done = () => {
        peer.pc.removeEventListener('icegatheringstatechange', check);
        peer.abort.signal.removeEventListener('abort', cancelled);
      };
      const check = () => {
        if (peer.pc.iceGatheringState === 'complete') { done(); resolve(); }
      };
      const cancelled = () => { done(); reject(new Error('Pairing ended. Try a fresh offer.')); };
      if (peer.closed) { reject(new Error('Pairing ended.')); return; }
      peer.pc.addEventListener('icegatheringstatechange', check);
      peer.abort.signal.addEventListener('abort', cancelled, { once: true });
      check();
    });
  }

  _packet(type, seq, data) { return { v: 1, session: this.session, type, seq, ...data }; }

  _send(peer, channelName, packet) {
    const channel = peer[channelName];
    if (peer.closed || channel?.readyState !== 'open') return false;
    const text = JSON.stringify(packet);
    const size = bytes(text);
    if (size > MAX_MESSAGE || channel.bufferedAmount + size > MAX_MESSAGE * 2) {
      if (channelName === 'control') this._failPeer(peer, 'The connection is too slow. Solo play is available.');
      return false;
    }
    try { channel.send(text); return true; }
    catch { this._failPeer(peer, 'The local connection stopped. Solo play is available.'); return false; }
  }

  _rosterChanged() {
    if (this.role !== 'host') return;
    const packet = this._packet('roster', ++this._controlSeq, { ids: this.ids, locked: this._locked });
    for (const peer of this._peers.values()) if (peer.ready) this._send(peer, 'control', packet);
  }

  _badPacket(peer) {
    if (++peer.invalid >= 3) this._failPeer(peer, 'The peer sent invalid game data. Solo play is available.');
  }

  _receive(peer, channel, text) {
    if (peer.closed) return;
    const now = performance.now();
    if (now - peer.windowAt >= 1000) { peer.windowAt = now; peer.messages = 0; }
    if (++peer.messages > 90) {
      this._failPeer(peer, 'The peer sent too much data. Solo play is available.');
      return;
    }
    if (typeof text !== 'string' || text.length > MAX_MESSAGE || bytes(text) > MAX_MESSAGE) {
      this._badPacket(peer); return;
    }
    let packet;
    try { packet = JSON.parse(text); }
    catch { this._badPacket(peer); return; }
    if (!packet || packet.v !== 1 || packet.session !== this.session || !integer(packet.seq)) return;
    if (this.role === 'host') {
      if (channel !== 'fast' || !peer.ready ||
          !fields(packet, ['v', 'session', 'type', 'seq', 'input', 'epoch']) ||
          packet.type !== 'input' || !validateInput(packet.input) || !integer(packet.epoch)) {
        this._badPacket(peer); return;
      }
      if (packet.seq <= peer.lastInputSeq || packet.epoch !== this._epoch || now - peer.lastInputAt < 25) return;
      peer.lastInputSeq = packet.seq;
      peer.lastInputAt = now;
      // Identity is the connection's assigned slot, never a client-supplied field.
      this._emit('input', { id: peer.id, input: packet.input, epoch: packet.epoch });
      return;
    }
    if (this.role !== 'client') return;
    if (channel === 'control' && ['welcome', 'roster'].includes(packet.type)) {
      const names = ['v', 'session', 'type', 'seq', 'ids', 'locked'];
      if (packet.type === 'welcome') names.push('slot');
      if (!fields(packet, names) || !rosterOK(packet.ids) || !packet.ids.includes(this.selfId) ||
          typeof packet.locked !== 'boolean' || (packet.type === 'welcome' && packet.slot !== this.selfId)) {
        this._badPacket(peer); return;
      }
      if (packet.seq <= this._lastControlSeq) return;
      this._lastControlSeq = packet.seq;
      this._roster = packet.ids;
      this._locked = packet.locked;
      if (packet.type === 'welcome') peer.welcomed = true;
      this._ready(peer);
      if (peer.ready) this._change(this._locked ? 'Match roster is locked.' : 'Waiting for the host to start.');
      return;
    }
    if (packet.type !== 'state' || !fields(packet, ['v', 'session', 'type', 'seq', 'snapshot']) ||
        !validateSnapshot(packet.snapshot)) { this._badPacket(peer); return; }
    const snapshot = packet.snapshot;
    if (!peer.ready || packet.seq <= this._lastStateSeq || snapshot.epoch < this._epoch) return;
    this._lastStateSeq = packet.seq;
    this._lastSnapshotAt = now;
    this._epoch = snapshot.epoch;
    const changed = this._phase !== snapshot.phase;
    this._phase = snapshot.phase;
    if (snapshot.phase === 'playing' && !this._watchdog) {
      this._watchdog = setInterval(() => {
        if (this.role === 'client' && ['playing', 'paused'].includes(this._phase) &&
            performance.now() - this._lastSnapshotAt >= 3000) {
          this.close();
          this._failure('Host updates stopped. Start a fresh solo run or return to the menu.');
        }
      }, 250);
    }
    this._emit('state', snapshot);
    if (changed) this._change('Host match: ' + snapshot.phase + '.');
  }

  lock() {
    if (this.role !== 'host') return;
    this._locked = true;
    if (this._pending) this._drop(this._pending);
    this._rosterChanged();
    this._change('Roster locked. No joining during play.');
  }

  sendInput(input, epoch) {
    if (this.role !== 'client' || !validateInput(input) || !integer(epoch) || epoch !== this._epoch) return false;
    const peer = this._peers.get(0);
    const now = performance.now();
    if (!peer?.ready || now - this._lastInputAt < 40) return false;
    this._lastInputAt = now;
    return this._send(peer, 'fast', this._packet('input', ++this._inputSeq, { input, epoch }));
  }

  broadcast(snapshot) {
    if (this.role !== 'host' || !validateSnapshot(snapshot) || snapshot.epoch < this._epoch) return false;
    const changed = snapshot.epoch !== this._epoch || snapshot.phase !== this._phase;
    const now = performance.now();
    if (!changed && now - this._lastBroadcastAt < 40) return false;
    this._lastBroadcastAt = now;
    this._epoch = snapshot.epoch;
    this._phase = snapshot.phase;
    // Keep a copy, not the simulation's mutable arrays, for newly ready guests.
    this._snapshot = JSON.parse(JSON.stringify(snapshot));
    const packet = this._packet('state', ++this._stateSeq, { snapshot: this._snapshot });
    for (const peer of this._peers.values()) {
      if (!peer.ready) continue;
      if (changed) this._send(peer, 'control', packet);
      this._send(peer, 'fast', packet);
    }
    if (changed) this._change('Host match: ' + snapshot.phase + '.');
    return true;
  }

  _drop(peer) {
    if (peer.closed) return;
    peer.closed = true;
    clearTimeout(peer.timer);
    peer.abort.abort();
    peer.fast?.close();
    peer.control?.close();
    peer.pc.close();
    this._peers.delete(peer.id);
    if (this._pending === peer) this._pending = null;
  }

  _failPeer(peer, message) {
    if (peer.closed) return;
    const ready = peer.ready;
    const id = peer.id;
    if (this.role === 'client') this.close();
    else {
      this._drop(peer);
      if (ready) this._emit('leave', { id });
      this._rosterChanged();
      this._change(ready ? 'Guest left. The host can continue.' : 'Pairing ended. Existing players stay connected.');
    }
    this._failure(message);
  }

  close() {
    clearInterval(this._watchdog);
    clearInterval(this._heartbeat);
    this._watchdog = this._heartbeat = null;
    for (const peer of this._peers.values()) this._drop(peer);
    this._pending = null;
    this._roster = [];
    this.role = 'solo';
    this.selfId = 0;
    this.session = '';
    this._locked = false;
    this._phase = 'lobby';
    this._epoch = 0;
    this._stateSeq = this._controlSeq = this._inputSeq = 0;
    this._lastStateSeq = this._lastControlSeq = -1;
    this._lastInputAt = this._lastBroadcastAt = -Infinity;
    this._lastSnapshotAt = 0;
    this._snapshot = null;
    this._change('Solo play is ready.');
  }
}
