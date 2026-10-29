// Continuous per-vehicle engine voices: jet turbines and the Apache rotor.
import type { VehicleEntity, VehicleKind } from "../sim/types"
import { NATIVE_HELICOPTER_MODELS, VEHICLES } from "../sim/vehicles"
import { clamp, type Core, Spatial } from "./core"

/** Relative loudness per airframe, used for voice selection and distance culling. */
export const ENGINE_LOUDNESS: Record<VehicleKind, number> = { fighter: 1, apache: 0.4, warthog: 0.8, blackbird: 1.3, bomber: 0.45, f15: 1, f35: 0.8, f16c: 0.9, mig29: 1.1, typhoon: 1.05, su35s: 1.15, rafale: 1.02, jf17: 0.88, gripen: 0.86, mig31: 1.22, mirage2000: 0.94, su34: 1.18, fa50: 0.82, yak130: 0.72, hawkt2: 0.65, su25sm: 0.88, a10c: 0.84, f35a: 0.96, j20: 1.08, tu160: 1.25, ah64d: 0.4, mi28n: 0.4 }
export const ENGINE_REF: Record<VehicleKind, number> = { fighter: 40, apache: 22, warthog: 35, blackbird: 50, bomber: 30, f15: 40, f35: 35, f16c: 38, mig29: 42, typhoon: 43, su35s: 46, rafale: 41, jf17: 37, gripen: 36, mig31: 48, mirage2000: 39, su34: 47, fa50: 34, yak130: 31, hawkt2: 29, su25sm: 36, a10c: 33, f35a: 41, j20: 45, tu160: 52, ah64d: 22, mi28n: 22 }

const TC = 0.06

interface Tone { osc: OscillatorNode; gain: GainNode }
interface Noise { src: AudioBufferSourceNode; filter: BiquadFilterNode; gain: GainNode }

export class EngineVoice {
  readonly spatial: Spatial
  readonly mix: GainNode
  private readonly sources: AudioScheduledSourceNode[] = []
  private readonly nodes: AudioNode[] = []
  private whineA: Tone | null = null
  private whistleA: Tone | null = null
  private sub: Tone | null = null
  private tail: Tone | null = null
  private tailFilter: BiquadFilterNode | null = null
  private roar: Noise | null = null
  private roar2: Noise | null = null
  private burner: Noise | null = null
  private chop: Noise | null = null
  private own = false
  private doppler = 1
  private burn = 0
  private subBase = 40
  dying = false
  stopAt = Infinity
  /** Selection score this frame (set by the manager). */
  score = 0

  constructor(private core: Core, readonly vehicleId: string, readonly kind: VehicleKind, v: VehicleEntity) {
    const ctx = core.ctx
    this.spatial = new Spatial(core, core.engineBus, v.flight.position, ENGINE_REF[kind], 1, false, true)
    this.mix = ctx.createGain()
    this.mix.gain.value = 0
    this.mix.connect(this.spatial.input)
    const bank = core.bank
    // Smooth, natural engines: noise roar does the work, tones are quiet sines kept under ~2.5 kHz.
    if (VEHICLES[kind].flight === "heli") {
      this.chop = this.noise(bank.rotor, "lowpass", 900, 0.5)
      this.whineA = this.tone("sine", 1150)
      this.tailFilter = ctx.createBiquadFilter()
      this.tailFilter.type = "lowpass"
      this.tailFilter.frequency.value = 250
      this.nodes.push(this.tailFilter)
      this.tail = this.tone("triangle", 107, this.tailFilter)
      this.roar = this.noise(bank.pink, "lowpass", 500, 0.5)
    } else {
      this.whineA = this.tone("sine", 300)
      // Roar = brighter pink layer (filter opens with throttle) over a deep brown body.
      this.roar = this.noise(bank.pink, "lowpass", 600, 0.5)
      this.roar2 = this.noise(bank.brown, "lowpass", 300, 0.5)
      if (kind === "warthog") {
        this.whistleA = this.tone("sine", 2000)
      } else if (kind === "bomber") {
        // B-2: four buried, shielded F118s — a deep, even drone with almost no high end.
        this.subBase = 28
        this.sub = this.tone("sine", this.subBase)
      } else if (kind !== "yak130" && kind !== "hawkt2" && kind !== "su25sm" && kind !== "a10c" && kind !== "f35a" && kind !== "j20" && kind !== "tu160") {
        this.burner = this.noise(bank.brown, "lowpass", kind === "blackbird" ? 160 : 220, 0.6)
        this.subBase = kind === "blackbird" ? 32 : 40
        this.sub = this.tone("sine", this.subBase)
      }
    }
    const now = ctx.currentTime
    for (const s of this.sources) s.start(now)
    this.mix.gain.setTargetAtTime(1, now, 0.12)
  }

  private tone(type: OscillatorType, freq: number, via?: AudioNode): Tone {
    const ctx = this.core.ctx
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.value = freq
    // Random phase/detune so two identical airframes never phase-lock into a comb filter.
    osc.detune.value = (Math.random() - 0.5) * 30
    const gain = ctx.createGain()
    gain.gain.value = 0
    if (via) {
      osc.connect(via)
      via.connect(gain)
    } else osc.connect(gain)
    gain.connect(this.mix)
    this.sources.push(osc)
    this.nodes.push(gain)
    return { osc, gain }
  }

  private noise(buffer: AudioBuffer, type: BiquadFilterType, freq: number, q: number): Noise {
    const ctx = this.core.ctx
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = type
    filter.frequency.value = freq
    filter.Q.value = q
    const gain = ctx.createGain()
    gain.gain.value = 0
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.mix)
    this.sources.push(src)
    this.nodes.push(filter, gain)
    return { src, filter, gain }
  }

  /** Per-frame parameter update. `hrtf` = this voice is among the nearest few. */
  update(v: VehicleEntity, own: boolean, hrtf: boolean): void {
    const core = this.core
    const now = core.now
    const f = v.flight
    if (own !== this.own) {
      this.own = own
      this.spatial.setDirect(own)
    }
    if (!own) {
      this.spatial.update(f.position)
      this.spatial.setHrtf(hrtf)
    }
    const dop = own ? 1 : core.doppler(f.position, f.velocity)
    this.doppler += (dop - this.doppler) * 0.35
    const d = this.doppler
    const thr = clamp(f.throttle, 0, 1)
    const vel = f.velocity
    const speed = Math.sqrt(vel[0] * vel[0] + vel[1] * vel[1] + vel[2] * vel[2])
    const spec = VEHICLES[this.kind]
    const sn = clamp(speed / spec.boost, 0, 1.3)
    const burnTarget = thr > 0.95 ? (thr - 0.95) / 0.05 : 0
    this.burn += (burnTarget - this.burn) * 0.08
    const b = this.burn
    // Wobble: tiny slow pitch drift so loops feel mechanical rather than synthetic.
    const wob = 1 + Math.sin(now * 1.7 + this.vehicleId.length) * 0.003
    // Own engine heard from the cockpit/chase cam: brighter, more turbine detail.
    const near = own ? 1.25 : 1
    const set = (p: AudioParam, value: number) => p.setTargetAtTime(value, now, TC)

    const roar = (lpBase: number, lpRange: number, gBase: number, gRange: number, rate: number) => {
      set(this.roar!.src.playbackRate, (0.85 + 0.25 * thr) * d * rate)
      set(this.roar!.filter.frequency, (lpBase + lpRange * Math.pow(thr, 1.2)) * near * d)
      set(this.roar!.gain.gain, gBase + gRange * thr + 0.06 * sn)
    }
    const body = (lpBase: number, lpRange: number, gBase: number, gRange: number) => {
      set(this.roar2!.src.playbackRate, (0.85 + 0.2 * thr) * d)
      set(this.roar2!.filter.frequency, (lpBase + lpRange * thr) * d)
      set(this.roar2!.gain.gain, gBase + gRange * thr)
    }
    const hum = (f0: number, f1: number, g0: number, g1: number) => {
      set(this.whineA!.osc.frequency, (f0 + f1 * thr) * d * wob)
      set(this.whineA!.gain.gain, (g0 + g1 * thr) * near)
    }

    switch (this.kind) {
      case "f15":
      case "f35":
      case "f16c":
      case "mig29": // Reuses the arcade fighter voice, not aircraft-specific recordings.
      case "fighter":
        // Twin F404s: a smooth roar that opens up with throttle, faint turbine hum, afterburner rumble.
        roar(350, 1400, 0.2, 0.3, 1)
        body(220, 260, 0.25, 0.25)
        hum(280, 420, 0.01, 0.018)
        this.updateBurner(b, 0.55, 0.25, d)
        break
      // Synthesized arcade voices, not recordings or real-engine signatures.
      case "typhoon":
        roar(380, 1500, 0.2, 0.3, 1.04)
        body(210, 280, 0.24, 0.26)
        hum(310, 440, 0.01, 0.018)
        this.updateBurner(b, 0.58, 0.26, d)
        break
      case "su35s":
        roar(300, 1250, 0.21, 0.3, 0.95)
        body(180, 320, 0.29, 0.29)
        hum(240, 380, 0.01, 0.017)
        this.updateBurner(b, 0.64, 0.3, d)
        break
      case "rafale":
        roar(360, 1380, 0.19, 0.29, 1.02)
        body(200, 290, 0.25, 0.27)
        hum(295, 410, 0.01, 0.017)
        this.updateBurner(b, 0.56, 0.27, d)
        break
      case "jf17":
        roar(400, 1320, 0.17, 0.27, 1.07)
        body(235, 235, 0.2, 0.23)
        hum(330, 465, 0.009, 0.016)
        this.updateBurner(b, 0.48, 0.22, d)
        break
      case "gripen":
        roar(415, 1360, 0.16, 0.26, 1.09)
        body(245, 225, 0.19, 0.22)
        hum(345, 480, 0.009, 0.015)
        this.updateBurner(b, 0.46, 0.21, d)
        break
      case "mig31":
        roar(270, 1150, 0.23, 0.32, 0.92)
        body(165, 335, 0.32, 0.34)
        hum(220, 355, 0.009, 0.018)
        this.updateBurner(b, 0.68, 0.32, d)
        break
      case "mirage2000":
        roar(390, 1420, 0.18, 0.28, 1.05)
        body(225, 255, 0.22, 0.24)
        hum(320, 450, 0.009, 0.017)
        this.updateBurner(b, 0.52, 0.24, d)
        break
      case "su34":
        roar(285, 1200, 0.22, 0.31, 0.94)
        body(175, 325, 0.31, 0.32)
        hum(230, 365, 0.01, 0.018)
        this.updateBurner(b, 0.66, 0.31, d)
        break
      case "fa50":
        roar(430, 1280, 0.15, 0.25, 1.1)
        body(250, 215, 0.18, 0.21)
        hum(355, 490, 0.008, 0.015)
        this.updateBurner(b, 0.43, 0.2, d)
        break
      case "yak130":
        // Non-afterburning twin turbine; native boost does not add burner rumble.
        roar(450, 1050, 0.13, 0.22, 1.03)
        body(240, 205, 0.17, 0.19)
        hum(370, 430, 0.008, 0.014)
        break
      case "hawkt2":
        // Single non-afterburning turbine; no native boost burner layer.
        roar(470, 980, 0.11, 0.2, 1.07)
        body(255, 185, 0.15, 0.17)
        hum(390, 405, 0.007, 0.013)
        break
      case "su25sm":
        // Synthesized twin non-afterburning voice, not an engine recording.
        roar(340, 1100, 0.18, 0.25, 0.97)
        body(195, 265, 0.24, 0.26)
        hum(265, 365, 0.009, 0.015)
        break
      case "a10c":
        // Synthesized non-afterburning turbofan pair, not a recording or certified signature.
        roar(365, 920, 0.16, 0.23, 0.96)
        body(205, 225, 0.22, 0.24)
        hum(250, 340, 0.01, 0.014)
        break
      case "f35a":
        // Synthesized jet via existing helpers; real afterburning is outside this slice.
        roar(325, 1340, 0.19, 0.28, 0.99)
        body(215, 275, 0.26, 0.25)
        hum(290, 395, 0.009, 0.016)
        break
      case "j20":
        // Existing synthesized jet helpers, no burner voice or real-engine signature claim.
        roar(305, 1280, 0.21, 0.29, 0.95)
        body(190, 305, 0.28, 0.28)
        hum(255, 375, 0.009, 0.017)
        break
      case "tu160":
        // Existing synthesized jet layers, no burner voice or real-engine signature claim.
        roar(260, 1120, 0.24, 0.3, 0.88)
        body(160, 330, 0.34, 0.31)
        hum(210, 330, 0.009, 0.016)
        break
      case "blackbird":
        // J58: deeper and heavier — the brown body dominates.
        roar(280, 1000, 0.12, 0.2, 0.9)
        body(180, 300, 0.35, 0.4)
        hum(200, 320, 0.008, 0.014)
        this.updateBurner(b, 0.7, 0.35, d)
        break
      case "bomber": {
        // Quiet stealth drone: dark body + a low sine, nothing bright.
        roar(160, 260, 0.05, 0.08, 0.7)
        body(110, 140, 0.28, 0.22)
        hum(90, 60, 0.004, 0.004)
        set(this.sub!.osc.frequency, (this.subBase + 6 * thr) * d)
        set(this.sub!.gain.gain, 0.12 + 0.08 * thr)
        break
      }
      case "warthog": {
        // TF34 high-bypass fans: softer roar + the A-10's whistle, kept low and quiet.
        // No afterburner on an A-10; full throttle just pushes the whistle a little harder.
        roar(400, 1000, 0.14, 0.22, 1)
        body(200, 200, 0.16, 0.16)
        hum(220, 300, 0.016, 0.016)
        set(this.whistleA!.osc.frequency, (1800 + 800 * thr) * d * wob)
        set(this.whistleA!.gain.gain, (0.01 + 0.014 * thr) * (1 + 0.3 * b) * near)
        break
      }
      case "ah64d":
      case "mi28n":
      case "apache": {
        // Governed rotor: rpm barely moves (97–102%); collective and forward speed make the
        // chop louder and a little brighter.
        const rpm = (0.97 + 0.05 * thr) * d
        const rotors = this.kind === "apache" ? null : NATIVE_HELICOPTER_MODELS[this.kind].rotors
        // Existing four-blade arcade loop follows the supplied four/five-blade main rotor, not a recording claim.
        const mainRate = rotors ? Math.abs(rotors.find(r => r.node === "main_rotor_spin")!.speed) / 30 * (this.kind === "mi28n" ? 5 / 4 : 1) : 1
        const tailRate = rotors ? Math.abs(rotors.find(r => r.node === "tail_rotor_spin")!.speed) / 70 : 1
        set(this.chop!.src.playbackRate, rpm * mainRate)
        set(this.chop!.filter.frequency, (500 + 700 * thr + 500 * sn) * near)
        set(this.chop!.gain.gain, 0.45 + 0.35 * thr)
        set(this.whineA!.osc.frequency, (1100 + 200 * thr) * d * wob)
        set(this.whineA!.gain.gain, (0.006 + 0.006 * thr) * near)
        set(this.tail!.osc.frequency, 19.2 * 5.6 * rpm * tailRate)
        set(this.tail!.gain.gain, 0.03 + 0.02 * thr)
        set(this.roar!.filter.frequency, 400 + 300 * thr)
        set(this.roar!.gain.gain, 0.05 + 0.1 * thr)
        break
      }
    }
  }

  private updateBurner(b: number, roar: number, sub: number, d: number): void {
    const now = this.core.now
    if (!this.burner || !this.sub) return
    this.burner.gain.gain.setTargetAtTime(roar * b, now, 0.15)
    this.burner.src.playbackRate.setTargetAtTime(d, now, TC)
    this.sub.gain.gain.setTargetAtTime(sub * b, now, 0.15)
    this.sub.osc.frequency.setTargetAtTime(this.subBase * d, now, TC)
  }

  /** Fade out; the manager disposes after `stopAt`. */
  release(): void {
    if (this.dying) return
    this.dying = true
    const now = this.core.now
    this.mix.gain.cancelScheduledValues(now)
    this.mix.gain.setTargetAtTime(0, now, 0.08)
    this.stopAt = now + 0.45
  }

  dispose(): void {
    for (const s of this.sources) {
      try { s.stop() } catch { /* already stopped */ }
      s.disconnect()
    }
    for (const n of this.nodes) n.disconnect()
    this.mix.disconnect()
    this.spatial.dispose()
  }
}
