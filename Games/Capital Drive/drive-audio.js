const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const EMPTY=Object.freeze({});

// Original synthesized car sound. The caller owns the context, permission and
// clock; this voice owns its nine persistent nodes and one looping noise buffer.
export function createDriveAudio(context){
 const fundamental=context.createOscillator(),harmonic=context.createOscillator();
 const lowMix=context.createGain(),highMix=context.createGain(),engineFilter=context.createBiquadFilter(),master=context.createGain();
 const noise=context.createBufferSource(),tyreFilter=context.createBiquadFilter(),tyreGain=context.createGain();
 fundamental.type='triangle';harmonic.type='sawtooth';fundamental.frequency.value=46;harmonic.frequency.value=92;
 lowMix.gain.value=.58;highMix.gain.value=.16;master.gain.value=0;tyreGain.gain.value=0;
 engineFilter.type='lowpass';engineFilter.frequency.value=320;engineFilter.Q.value=.65;
 tyreFilter.type='bandpass';tyreFilter.frequency.value=1300;tyreFilter.Q.value=.7;
 const sampleRate=context.sampleRate||44100,buffer=context.createBuffer(1,Math.round(sampleRate),sampleRate),samples=buffer.getChannelData(0);
 let seed=48271;for(let i=0;i<samples.length;i++){seed=(seed*16807)%2147483647;samples[i]=seed/1073741823.5-1;}
 noise.buffer=buffer;noise.loop=true;
 fundamental.connect(lowMix);harmonic.connect(highMix);lowMix.connect(engineFilter);highMix.connect(engineFilter);engineFilter.connect(master);
 noise.connect(tyreFilter);tyreFilter.connect(tyreGain);tyreGain.connect(master);master.connect(context.destination);
 fundamental.start();harmonic.start();noise.start();
 let disposed=false,previousGear=0,shift=0;
 function update(input=EMPTY,dt=1/60){
  if(disposed)return;
  const active=input.active===true,time=finite(context.currentTime),elapsed=clamp(finite(dt,1/60),0,.1);
  const speed=clamp(Math.abs(finite(input.speed)),0,90),load=clamp(finite(input.throttle),0,1),slip=clamp(Math.abs(finite(input.slip)),0,1);
  const gear=Number.isInteger(input.gear)&&input.gear>=1&&input.gear<=6?input.gear:clamp(1+Math.floor(speed/9),1,6);
  if(active&&previousGear&&gear!==previousGear)shift=1;
  previousGear=active?gear:0;shift=Math.max(0,shift-elapsed*5);
  const boost=input.boost===true?1:0;
  const rpm=clamp(850+speed*245*(1+gear*.16)/gear+load*1000+boost*350,700,6800);
  const pitch=(30+rpm/55)*(1-shift*.12),volume=(.018+load*.018+Math.min(speed/60,1)*.008+boost*.004)*(1-shift*.24);
  fundamental.frequency.setTargetAtTime(pitch,time,.065);harmonic.frequency.setTargetAtTime(pitch*2.01,time,.065);
  engineFilter.frequency.setTargetAtTime(260+load*650+rpm*.11+boost*120,time,.08);
  highMix.gain.setTargetAtTime(.1+load*.13+boost*.025,time,.09);
  // Slip adds a restrained tyre layer; quiet rolling never becomes white-noise hiss.
  tyreGain.gain.setTargetAtTime(active?slip*Math.min(speed/8,1)*.2:0,time,.06);
  tyreFilter.frequency.setTargetAtTime(900+slip*1000+Math.min(speed,40)*12,time,.1);
  master.gain.setTargetAtTime(active?volume:0,time,active ? .09 : .12);
 }
 function dispose(){
  if(disposed)return;disposed=true;
  fundamental.stop();harmonic.stop();noise.stop();
  fundamental.disconnect();harmonic.disconnect();lowMix.disconnect();highMix.disconnect();engineFilter.disconnect();
  noise.disconnect();tyreFilter.disconnect();tyreGain.disconnect();master.disconnect();
 }
 return {update,dispose};
}
