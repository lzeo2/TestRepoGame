import { instruments, tones } from '../api.js';
export function playFrequency(frequency, duration, instrument, ctx, dest) {
    const osc = ctx.createOscillator();
    const rampGain = ctx.createGain();
    osc.connect(rampGain);
    rampGain.connect(dest);
    osc.frequency.value = frequency;
    osc.type = instrument ?? 'sine';
    osc.start();
    const endTime = ctx.currentTime + duration * 2 / 1000;
    osc.stop(endTime);
    rampGain.gain.setValueAtTime(0, ctx.currentTime);
    rampGain.gain.linearRampToValueAtTime(.2, ctx.currentTime + duration / 5 / 1000);
    rampGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration / 1000);
    rampGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration * 2 / 1000); // does this ramp from the last ramp
    osc.onended = () => {
        osc.disconnect();
        rampGain.disconnect();
    };
}
// Local port: end() also owns and cancels the pending tune delay.
const sleep = (duration, ref) => new Promise(resolve => {
    ref.resolve = resolve;
    ref.timer = setTimeout(resolve, duration);
});
export async function playTuneHelper(tune, number, playingRef, ctx, dest) {
    for (let i = 0; i < tune.length * number; i++) {
        const index = i % tune.length;
        if (!playingRef.playing)
            break;
        const noteSet = tune[index];
        const sleepTime = noteSet[0];
        for (let j = 1; j < noteSet.length; j += 3) {
            const instrument = noteSet[j];
            const note = noteSet[j + 1];
            const duration = noteSet[j + 2];
            const frequency = typeof note === 'string'
                ? tones[note.toUpperCase()]
                : 2 ** ((note - 69) / 12) * 440;
            if (instruments.includes(instrument) && frequency !== undefined)
                playFrequency(frequency, duration, instrument, ctx, dest);
        }
        await sleep(sleepTime, playingRef);
    }
}
let audioCtx = null;
export function playTune(tune, number = 1) {
    const playingRef = { playing: true };
    if (audioCtx === null)
        audioCtx = new AudioContext();
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    playTuneHelper(tune, number, playingRef, audioCtx, gain).finally(() => gain.disconnect());
    return {
        end() {
            playingRef.playing = false;
            clearTimeout(playingRef.timer);
            gain.gain.value = 0;
            playingRef.resolve?.();
        },
        isPlaying() { return playingRef.playing; }
    };
}
//# sourceMappingURL=tune.js.map