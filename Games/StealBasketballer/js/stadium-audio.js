// Original local synthesis: no recordings, network or import-time audio device access.
export class StadiumAudio {
  constructor({audioContextFactory}={}) {
    this.factory=audioContextFactory||(()=>{const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;return Audio?new Audio():null;});
    this.enabled=true;this.inMatch=false;this.context=null;this.ambient=null;
    this.voices=new Set();this.disposed=false;
  }
  start() {
    if(this.disposed)return;
    if(!this.context) {
      this.context=this.factory();if(!this.context)return;
      this.master=this.context.createGain();this.master.gain.value=this.enabled?.15:0;this.master.connect(this.context.destination);
      this.noise=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate);
      const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    }
    const resume=this.context.resume();resume?.catch(()=>{});
    this.configure(this.enabled,this.inMatch);
  }
  _release(voice,stop=false) {
    if(!this.voices.delete(voice))return;
    for(const source of voice.sources) {
      source.onended=null;
      if(stop) {try{source.stop();}catch(error){if(error.name!=='InvalidStateError')throw error;}}
    }
    for(const node of voice.nodes)node.disconnect();
    if(this.ambient===voice)this.ambient=null;
  }
  _voice(sources,nodes) {
    // A burst has at most four sources; repeated UI/event input cannot grow nodes forever.
    if(this.voices.size>=12){const oldest=[...this.voices].find(v=>v!==this.ambient);if(oldest)this._release(oldest,true);}
    const voice={sources,nodes,pending:sources.length};this.voices.add(voice);
    for(const source of sources)source.onended=()=>{if(--voice.pending===0)this._release(voice);};
    return voice;
  }
  configure(enabled,inMatch) {
    this.enabled=!!enabled;this.inMatch=!!inMatch;
    if(!this.context||this.disposed)return;
    this.master.gain.setTargetAtTime(this.enabled?.15:0,this.context.currentTime,.025);
    if(!this.enabled||!this.inMatch){for(const v of [...this.voices])this._release(v,true);return;}
    if(!this.ambient) {
      const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
      source.buffer=this.noise;source.loop=true;filter.type='lowpass';filter.frequency.value=500;gain.gain.value=.12;
      source.connect(filter);filter.connect(gain);gain.connect(this.master);
      this.ambient=this._voice([source],[source,filter,gain]);source.start();
    }
  }
  _envelope(gain,t,duration,volume) {
    gain.gain.setValueAtTime(.0001,t);gain.gain.linearRampToValueAtTime(volume,t+.025);
    gain.gain.setValueAtTime(volume*.8,t+duration*.55);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
  }
  _whistle(t) {
    const c=this.context,duration=.22,sources=[],nodes=[],breath=c.createBufferSource(),filter=c.createBiquadFilter(),air=c.createGain();
    breath.buffer=this.noise;filter.type='bandpass';filter.frequency.value=2650;filter.Q.value=1.8;
    this._envelope(air,t,duration,.14);breath.connect(filter);filter.connect(air);air.connect(this.master);
    sources.push(breath);nodes.push(breath,filter,air);
    for(const [frequency,volume] of [[2350,.18],[3100,.055]]) {
      const tone=c.createOscillator(),gain=c.createGain();tone.type='sine';
      tone.frequency.setValueAtTime(frequency,t);
      // Tiny breath instability around a stable pitch, never a siren sweep.
      tone.frequency.linearRampToValueAtTime(frequency+7,t+.075);tone.frequency.linearRampToValueAtTime(frequency-5,t+.15);
      this._envelope(gain,t,duration,volume);tone.connect(gain);gain.connect(this.master);
      sources.push(tone);nodes.push(tone,gain);
    }
    this._voice(sources,nodes);for(const s of sources){s.start(t);s.stop(t+duration+.015);}
  }
  _buzzer(t,final) {
    const sources=[],nodes=[],duration=final?.95:.48;
    for(const frequency of [155,233]) {
      const tone=this.context.createOscillator(),gain=this.context.createGain();tone.type='sawtooth';tone.frequency.setValueAtTime(frequency,t);
      this._envelope(gain,t,duration,.11);tone.connect(gain);gain.connect(this.master);sources.push(tone);nodes.push(tone,gain);
    }
    this._voice(sources,nodes);for(const s of sources){s.start(t);s.stop(t+duration+.02);}
  }
  cue(kind) {
    if(!this.enabled||!this.context||this.disposed)return;
    const t=this.context.currentTime;
    if(kind==='period'||kind==='fullTime'){this._buzzer(t,kind==='fullTime');return;}
    if(['foul','violation','tipoff','out','outOfBounds'].includes(kind)) {
      this._whistle(t);if(kind==='foul')this._whistle(t+.3);return;
    }
    if(!['basket','block','steal','commentary'].includes(kind)||(kind==='commentary'&&Math.random()>.18))return;
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain(),duration=kind==='basket'?1.8:1;
    source.buffer=this.noise;source.loop=true;filter.type='bandpass';filter.frequency.value=850;filter.Q.value=.65;
    this._envelope(gain,t,duration,kind==='basket'?.55:.25);source.connect(filter);filter.connect(gain);gain.connect(this.master);
    this._voice([source],[source,filter,gain]);source.start(t);source.stop(t+duration+.02);
  }
  dispose() {
    if(this.disposed)return;this.disposed=true;
    for(const v of [...this.voices])this._release(v,true);
    this.master?.disconnect();const close=this.context?.close();close?.catch(()=>{});
    this.context=null;this.master=null;this.noise=null;
  }
}
