// Main menu (lobby) plus the shared typographic menu component used by the spawn screen and pause menu.
// Design: numbered, stacked sentence-case items directly on the world; the selected item gets full opacity
// and a short orange rule; tiny mono metadata under the selection; ↑↓ Enter Esc (and ←→ for values).
import type { RoomConfig } from "../sim/protocol"
import { DEFAULT_ROOM_CONFIG } from "../sim/protocol"
import type { Quality, VehicleKind } from "../sim/types"
import { VEHICLES, VEHICLE_KINDS } from "../sim/vehicles"
import { callsign, randomCallsign, settings, updateSettings } from "./settings"
import type { ControlScheme } from "../input"
import { COALITIONS } from "../../../../../authoring/coalition-rosters.mjs"

export type StartRequest =
  | { mode: "quick" }
  | { mode: "join"; code: string }
  | { mode: "create"; config: Partial<RoomConfig> }
  | { mode: "offline"; config: RoomConfig; aircraft?: VehicleKind; rules?: "factions"; coalition?: "nato" | "eastern" }

export interface LobbyApi {
  show(): void
  hide(): void
  busy(text: string | null): void
  status(html: string): void
}

/** Muted team colours (mirrors TEAM_COLORS in render/aircraft.ts; not imported to keep three.js out of the entry chunk). */
export const TEAM_COLORS = ["#3c6ea8", "#c98a2e", "#4e8a5a", "#b04a44"]
/** Lighter tints of the team colours for text over the world. */
export const TEAM_TINTS = ["#b4d0f0", "#f2c98a", "#b4dcba", "#efb2aa"]
export const TEAM_NAMES = ["Cobalt", "Amber", "Emerald", "Crimson"]

/** Small square swatch in the team colour. */
export function teamGlyph(team: number): string {
  return `<i class="sw" style="--c:${TEAM_COLORS[team]}" aria-hidden="true"></i>`
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T

export function toast(text: string, error = false): void {
  const host = $("toast")
  const el = document.createElement("div")
  el.textContent = text.toLowerCase()
  if (error) el.className = "err"
  host.appendChild(el)
  setTimeout(() => el.remove(), 3300)
  while (host.childElementCount > 4) host.firstElementChild!.remove()
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

// ---------------------------------------------------------------------------------------------- controls

// Mirrors CONTROL_SCHEMES / CONTROL_SCHEME_LABELS / controlScheme() / setControlScheme() from input.ts.
// Importing input.ts here would drag the whole Input module into the instant-paint entry chunk (+8 kB).
const CONTROL_SCHEMES: readonly ControlScheme[] = ["battlefield", "aim", "keys", "point"]
const CONTROL_SCHEME_LABELS: Record<ControlScheme, string> = { battlefield: "Battlefield (default)", aim: "Mouse-aim (instructor)", keys: "Keyboard flight + mouse aim", point: "Point & turn" }
const controlScheme = (): ControlScheme => settings.controlScheme === "aim" || settings.controlScheme === "keys" || settings.controlScheme === "point" ? settings.controlScheme : "battlefield"
const setControlScheme = (scheme: ControlScheme) => updateSettings({ controlStyle: scheme === "aim" || scheme === "point" ? "aim" : "direct", controlScheme: scheme })

const kb = (...keys: string[]) => keys.map(x => `<kbd>${x}</kbd>`).join("")

/** Default (Battlefield) rows. */
function battlefieldRows(): { title: string; rows: [string, string][] }[] {
  const turn = settings.mouseX !== "roll"
  const common: [string, string][] = [
    ["Throttle · collective (heli)", `${kb("w")} up · ${kb("s")} down (jets: airbrake)`],
    ["Boost · airbrake / auto-hover", `${kb("shift")} · ${kb("x")}`],
  ]
  return [
    { title: "flight · battlefield", rows: [...(turn ? [
      ["Turn (nose left / right)", `mouse ←→ · ${kb("←", "→")}`],
      ["Pitch", `mouse ↑↓ (away = nose up) · ${kb("↓")} up ${kb("↑")} down`],
      ["Roll · strafe (heli)", `${kb("a", "d")} · full roll ${kb("q", "e")}`],
    ] as [string, string][] : [
      ["Roll", `mouse ←→ · ${kb("q", "e")} · ${kb("←", "→")}`],
      ["Pitch", `mouse ↑↓ (away = nose up) · ${kb("↓")} up ${kb("↑")} down`],
      ["Yaw / pedals", kb("a", "d")],
    ] as [string, string][]), ...common] },
    { title: "combat", rows: [
      ["Guns · missiles", `${kb("lmb")} · ${kb("rmb")} ${kb("v")}`], ["Flares · ability", `${kb("space")} ${kb("f")} · ${kb("r")}`],
      ["Switch seat", `${kb("1")} ${kb("2")} · gunners aim with the mouse`],
    ] },
    { title: "view & comms", rows: [
      ["Free-look (plane holds course) · camera", `hold ${kb("c")} or ${kb("alt")} · ${kb("t")}`], ["Chat · scores · menu", `${kb("enter")} · ${kb("tab")} · ${kb("esc")}`],
    ] },
  ]
}

/** Keyboard-flight rows: keyboard flies, mouse aims the guns. */
function keyFlightRows(): { title: string; rows: [string, string][] }[] {
  return [
    { title: "flight · keyboard + mouse aim", rows: [
      ["Pitch", `${kb("w")} nose down · ${kb("s")} nose up`],
      ["Roll · strafe (heli)", `${kb("a", "d")} · heli flips ${kb("←", "→")}`],
      ["Rudder / pedals", kb("q", "e")],
      ["Throttle", `${kb("shift")} up + boost · ${kb("z")} down · wheel`],
      ["Collective (heli)", `${kb("space")} up · ${kb("z")} down`],
      ["Airbrake · auto-hover", kb("x")],
    ] },
    { title: "combat", rows: [
      ["Aim guns", "mouse moves the gun reticle (push it to the edge to steer)"],
      ["Guns · missiles", `${kb("lmb")} · ${kb("rmb")} ${kb("v")}`], ["Flares · ability", `${kb("f")} · ${kb("r")}`],
      ["Switch seat", `${kb("1")} ${kb("2")} · gunners aim with the mouse`],
    ] },
    { title: "b-2 bomber", rows: [
      ["Pilot", `${kb("lmb")} drops bombs - the diamond impact marker shows where they land · ${kb("b")} peek through the bomb sight`],
      ["Bombardier (seat 2)", "bomb-sight view, precise drops · \"release\" appears when the impact point is over a ship"],
    ] },
    { title: "man the guns (fleet strike)", rows: [
      ["Take a ship gun", `spawn screen → <b>man the guns</b> tab (${kb("g")}) · pause → switch role`],
      ["Aim · fire", `mouse · ${kb("lmb")} ${kb("space")} - ciws for close range, 5-inch flak for long range`],
      ["Zoom · free-look", `${kb("wheel")} · hold ${kb("c")} - watch the heat bar, overheated guns pause`],
    ] },
    { title: "view & comms", rows: [
      ["Free-look · camera", `hold ${kb("c")} · ${kb("t")}`], ["Chat · scores · menu", `${kb("enter")} · ${kb("tab")} · ${kb("esc")}`],
    ] },
  ]
}

/** Control rows for a scheme, grouped into sections (help screen, pause menu). */
export function controlRows(scheme: ControlScheme = controlScheme()): { title: string; rows: [string, string][] }[] {
  if (scheme === "keys") return keyFlightRows()
  if (scheme === "battlefield") return battlefieldRows()
  const flight: [string, string][] = scheme === "aim"
    ? [
        ["Steer", "move the mouse where you want to fly"],
        ["Roll (barrel rolls, inverted)", kb("q", "e")],
        ["Pitch override (loops)", `${kb("↓")} up ${kb("↑")} down`],
        ["Rudder / strafe (heli)", kb("a", "d")],
        ["Manual mouse (roll + pitch)", `hold ${kb("alt")} · toggle ${kb("m")}`],
      ]
    : [
        ["Turn", `mouse ←→ · ${kb("←", "→")}`],
        ["Nose up / down", `mouse ↑↓ · ${kb("↓")} up ${kb("↑")} down`],
        ["Roll", kb("q", "e")],
        ["Rudder / strafe (heli)", kb("a", "d")],
      ]
  flight.push(["Throttle / collective", kb("w", "s")], ["Boost · airbrake / auto-hover", `${kb("shift")} · ${kb("x")}`])
  return [
    { title: `flight · ${CONTROL_SCHEME_LABELS[scheme].toLowerCase()}`, rows: flight },
    { title: "combat", rows: [
      ["Guns", `${kb("lmb")} ${kb("space")}`], ["Missiles", `${kb("rmb")} ${kb("v")}`], ["Flares · ability", `${kb("f")} · ${kb("r")}`],
      ["Switch seat", `${kb("1")} ${kb("2")} · gunners aim with the mouse`],
    ] },
    { title: "b-2 bomber", rows: [
      ["Pilot", `${kb("lmb")} drops bombs - the diamond impact marker shows where they land · ${kb("b")} peek through the bomb sight`],
      ["Bombardier (seat 2)", "bomb-sight view, precise drops · \"release\" appears when the impact point is over a ship"],
    ] },
    { title: "man the guns (fleet strike)", rows: [
      ["Take a ship gun", `spawn screen → <b>man the guns</b> tab (${kb("g")}) · pause → switch role`],
      ["Aim · fire", `mouse · ${kb("lmb")} ${kb("space")} - ciws for close range, 5-inch flak for long range`],
      ["Zoom · free-look", `${kb("wheel")} · hold ${kb("c")} - watch the heat bar, overheated guns pause`],
    ] },
    { title: "view & comms", rows: [
      ["Free-look · camera", `hold ${kb("c")} · ${kb("t")}`], ["Chat · scores · menu", `${kb("enter")} · ${kb("tab")} · ${kb("esc")}`],
    ] },
  ]
}

/** Controls reference table for the current scheme. */
export function controlsTable(): string {
  return `<p class="note">Day and night cycle every 10 minutes of room time, starting at 09:00. Night reduces visibility. Your aircraft's landing or search light turns on automatically.</p><table class="keys">${controlRows().map(sec =>
    `<tr><th colspan="2">${escapeHtml(sec.title)}</th></tr>` + sec.rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")).join("")}</table>`
}

// ---------------------------------------------------------------------------------------------- menu

export interface MenuItem {
  label: string
  /** Mono line shown under the item while selected. */
  meta?: string | (() => string)
  /** Value shown at the end of the row (mono). */
  value?: () => string
  /** ←→ (and click) change the value. */
  adjust?: (dir: 1 | -1) => void
  /** Enter / click. */
  run?: () => void
  /** Inline text field: "value" sits at the row end, "label" replaces the label. */
  input?: { el: HTMLInputElement; at: "value" | "label" }
  disabled?: () => boolean
  /** Smaller row (secondary actions). */
  small?: boolean
}

export interface MenuScreen {
  /** Crumb above the list, e.g. "03 — create a lobby". */
  crumb?: string
  items?: MenuItem[]
  size?: "big" | "mid"
  /** Static content instead of (or after) items. */
  html?: string
  note?: string
  /** Key hints shown while this screen is on top. */
  hints?: [string, string][]
  /** Initial selection. */
  sel?: number
}

/**
 * A stack of typographic menu screens rendered into `host`. Keyboard: ↑↓ select, Enter run, ←→ adjust,
 * Esc back (or `onEscape` at the root). Hover selects; click runs/adjusts.
 */
export class MenuNav {
  private stack: { screen: MenuScreen; sel: number }[] = []
  private els: HTMLElement[] = []
  private metaEl: HTMLElement | null = null
  onEscape: (() => void) | null = null
  /** ←→ on an item without `adjust` (e.g. team switch on the spawn screen). */
  onSide: ((dir: 1 | -1) => void) | null = null
  onHints: ((hints: [string, string][]) => void) | null = null
  onMove: ((i: number) => void) | null = null

  constructor(readonly host: HTMLElement, private sound: (() => void) | null = null) {
    host.addEventListener("pointermove", e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".mi")
      if (b?.dataset.i) this.select(Number(b.dataset.i), false)
    })
    host.addEventListener("click", e => {
      const t = e.target as HTMLElement
      const b = t.closest<HTMLElement>(".mi")
      if (!b?.dataset.i || t.tagName === "INPUT") return
      const i = Number(b.dataset.i)
      this.select(i, false)
      const arr = t.closest(".arr")
      this.activate(i, arr?.classList.contains("l") ? -1 : 1, !!arr)
    })
    host.addEventListener("focusin", e => {
      const b = (e.target as HTMLElement).closest<HTMLElement>(".mi")
      if (b?.dataset.i) this.select(Number(b.dataset.i), false)
    })
  }

  get depth(): number { return this.stack.length }
  get top(): MenuScreen | null { return this.stack[this.stack.length - 1]?.screen ?? null }
  get index(): number { return this.stack[this.stack.length - 1]?.sel ?? 0 }

  private item(i: number): MenuItem | undefined { return this.top?.items?.[i] }

  push(screen: MenuScreen): void { this.stack.push({ screen, sel: screen.sel ?? 0 }); this.render() }
  replace(screen: MenuScreen): void { this.stack[this.stack.length - 1] = { screen, sel: Math.min(this.index, (screen.items?.length ?? 1) - 1) }; this.render() }
  reset(screen: MenuScreen): void { this.stack = [{ screen, sel: screen.sel ?? 0 }]; this.render() }
  pop(): boolean { if (this.stack.length <= 1) return false; this.stack.pop(); this.render(); return true }

  /** Re-render values/meta without rebuilding (keeps input focus). */
  refresh(): void {
    const items = this.top?.items ?? []
    items.forEach((it, i) => {
      const el = this.els[i]
      if (!el) return
      el.classList.toggle("off", !!it.disabled?.())
      const v = el.querySelector<HTMLElement>(".v")
      if (v && it.value && !it.input) v.innerHTML = this.valueHtml(it)
    })
    this.paintMeta()
  }

  private valueHtml(it: MenuItem): string {
    const v = escapeHtml(it.value?.() ?? "")
    return it.adjust ? `<span class="arr l">‹</span>${v}<span class="arr">›</span>` : v
  }

  render(): void {
    const s = this.top
    if (!s) return
    const items = s.items ?? []
    this.host.innerHTML = `<div class="crumb">${s.crumb ?? ""}</div>` +
      (items.length ? `<div class="menu ${s.size ?? "big"}">${items.map((it, i) => {
        const label = it.input?.at === "label" ? "" : escapeHtml(it.label)
        return `<div class="mi${it.small ? " sm" : ""}" data-i="${i}" role="button" tabindex="0"><span class="ix">${String(i + 1).padStart(2, "0")}</span><span class="rule"></span><span class="t">${label}</span><span class="v">${it.value && !it.input ? this.valueHtml(it) : ""}</span></div>`
      }).join("")}</div>` : "") + (s.html ?? "") + (s.note ? `<div class="note">${s.note}</div>` : "")
    this.els = Array.from(this.host.querySelectorAll<HTMLElement>(".mi"))
    items.forEach((it, i) => {
      if (!it.input) return
      const slot = this.els[i].querySelector(it.input.at === "label" ? ".t" : ".v")!
      slot.appendChild(it.input.el)
    })
    this.metaEl = null
    this.select(this.index, false, true)
    this.refresh()
    this.onHints?.(s.hints ?? (this.stack.length > 1 ? [["↑↓", "select"], ["enter", "confirm"], ["esc", "back"]] : [["↑↓", "select"], ["enter", "confirm"]]))
  }

  select(i: number, sound = true, force = false): void {
    const entry = this.stack[this.stack.length - 1]
    if (!entry) return
    const n = this.els.length
    if (!n) return
    i = Math.max(0, Math.min(n - 1, i))
    if (i === entry.sel && !force) return
    entry.sel = i
    this.els.forEach((el, k) => el.classList.toggle("sel", k === i))
    if (sound) { this.sound?.(); this.els[i].scrollIntoView({ block: "nearest" }) }
    this.paintMeta()
    this.onMove?.(i)
  }

  private paintMeta(): void {
    const it = this.item(this.index)
    const el = this.els[this.index]
    const meta = typeof it?.meta === "function" ? it.meta() : it?.meta
    if (!meta || !el) { this.metaEl?.remove(); this.metaEl = null; return }
    if (!this.metaEl || this.metaEl.previousElementSibling !== el) {
      this.metaEl?.remove()
      this.metaEl = document.createElement("div")
      this.metaEl.className = "meta"
      el.after(this.metaEl)
    }
    if (this.metaEl.innerHTML !== meta) this.metaEl.innerHTML = meta
  }

  private activate(i: number, dir: 1 | -1 = 1, viaArrow = false): void {
    const it = this.item(i)
    if (!it || it.disabled?.()) return
    if (it.input && !it.run) { it.input.el.focus(); return }
    if (it.adjust && (viaArrow || !it.run)) { it.adjust(dir); this.sound?.(); this.refresh(); return }
    if (it.run) { this.sound?.(); it.run() }
  }

  /** Returns true when the key was handled. */
  handleKey(e: KeyboardEvent): boolean {
    if (!this.top) return false
    const inInput = (e.target as HTMLElement)?.tagName === "INPUT"
    const items = this.top.items ?? []
    const step = (d: number) => {
      let i = this.index
      for (let k = 0; k < items.length; k++) {
        i = (i + d + items.length) % items.length
        if (!items[i].disabled?.()) break
      }
      this.select(i)
    }
    switch (e.key) {
      case "ArrowDown": if (inInput) (e.target as HTMLElement).blur(); step(1); return true
      case "ArrowUp": if (inInput) (e.target as HTMLElement).blur(); step(-1); return true
      case "ArrowLeft": case "ArrowRight": {
        if (inInput) return false
        const it = this.item(this.index), d = e.key === "ArrowLeft" ? -1 : 1
        if (it?.adjust) { it.adjust(d); this.sound?.(); this.refresh() } else this.onSide?.(d)
        return true
      }
      case "Enter": {
        if (inInput) {
          const it = this.item(this.index)
          ;(e.target as HTMLElement).blur()
          if (it?.run) it.run()
          return true
        }
        this.activate(this.index)
        return true
      }
      case "Escape":
        if (inInput) { (e.target as HTMLElement).blur(); return true }
        if (!this.pop()) this.onEscape?.()
        else this.sound?.()
        return true
    }
    return false
  }
}

/** Render key hints ("↑↓ select …") into a footer element. */
export function hintsHtml(hints: [string, string][]): string {
  return hints.map(([k, t]) => `<span><kbd>${escapeHtml(k)}</kbd> ${escapeHtml(t)}</span>`).join("")
}

const cycle = <T,>(list: readonly T[], cur: T, d: number): T => list[(list.indexOf(cur) + d + list.length) % list.length]

/** Settings screen (shared by the lobby and pause menu). */
export function settingsScreen(nav: MenuNav, onQuality: (q: Quality) => void, crumb = "settings"): MenuScreen {
  const qualities: Quality[] = ["low", "balanced", "high"]
  return {
    crumb, size: "mid",
    items: [
      { label: "Graphics", value: () => settings.quality, adjust: d => { const q = cycle(qualities, settings.quality, d); updateSettings({ quality: q }); onQuality(q) },
        meta: () => ({ low: "1× resolution · no shadows or post", balanced: "soft shadows · anti-aliasing", high: "full resolution · sharper shadows" })[settings.quality] },
      { label: "Sound", value: () => (settings.muted ? "off" : "on"), adjust: () => updateSettings({ muted: !settings.muted }) },
      { label: "Steering", value: () => CONTROL_SCHEME_LABELS[controlScheme()].replace(/ \(.*\)$/, "").toLowerCase(), adjust: d => setControlScheme(cycle(CONTROL_SCHEMES, controlScheme(), d)),
        meta: () => ({ keys: "keys fly, mouse aims the guns", point: "mouse turns and pitches the nose", battlefield: "mouse turns & pitches, a/d roll, w/s throttle", aim: "fly toward a mouse cursor" })[controlScheme()] },
      { label: "Mouse X", value: () => (settings.mouseX === "roll" ? "roll" : "turn"), adjust: () => updateSettings({ mouseX: settings.mouseX === "roll" ? "turn" : "roll" }),
        meta: () => settings.mouseX === "roll" ? "classic bf4: mouse left/right rolls" : "mouse left/right turns the nose (battlefield steering)" },
      { label: "Mouse sensitivity", value: () => settings.sensitivity.toFixed(2), adjust: d => updateSettings({ sensitivity: Math.round(Math.max(0.2, Math.min(3, settings.sensitivity + d * 0.1)) * 100) / 100 }) },
      { label: "Invert mouse Y", value: () => (settings.invertY ? "on" : "off"), adjust: () => updateSettings({ invertY: !settings.invertY }), meta: "on = mouse away moves the nose down" },
      { label: "Controls", run: () => nav.push({ crumb: `${crumb} - controls`, html: controlsTable(), hints: [["esc", "back"]] }), meta: "full key reference" },
    ],
  }
}

// ---------------------------------------------------------------------------------------------- lobby

export function initLobby(opts: { onStart(req: StartRequest): void; onQuality(q: Quality): void; onClick?(): void }): LobbyApi {
  const lobby = $("lobby")
  const name = $<HTMLInputElement>("callsign")
  name.value = settings.name.toLowerCase()
  name.placeholder = randomCallsign().toLowerCase()
  name.addEventListener("input", () => updateSettings({ name: name.value.toUpperCase().slice(0, 16) }))
  name.addEventListener("blur", () => { name.value = settings.name.toLowerCase() })
  name.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === "Escape") { e.stopPropagation(); name.blur() } })

  const hints = $("hints")
  const nav = new MenuNav($("screen"), () => opts.onClick?.())
  nav.onHints = h => { hints.innerHTML = hintsHtml(h) }

  // Create lobby
  const cfg = { ...DEFAULT_ROOM_CONFIG, bots: 0, timeLimit: DEFAULT_ROOM_CONFIG.timeLimit / 60 }
  const botCfg = { on: false, perTeam: 4, skill: 1 }
  let aircraft: VehicleKind = "fighter"
  const SKILLS = [{ name: "easy", v: 0.25 }, { name: "normal", v: 0.5 }, { name: "hard", v: 0.85 }]
  const nameIn = document.createElement("input")
  nameIn.maxLength = 32
  nameIn.value = cfg.name
  nameIn.spellcheck = false
  nameIn.addEventListener("input", () => { cfg.name = nameIn.value })
  const readConfig = (): RoomConfig => ({
    ...DEFAULT_ROOM_CONFIG, name: (cfg.name || DEFAULT_ROOM_CONFIG.name).slice(0, 32), teams: cfg.teams, bots: botCfg.on ? botCfg.perTeam : 0,
    ...(botCfg.on ? { botSkill: SKILLS[botCfg.skill].v } : {}),
    maxPerTeam: cfg.maxPerTeam, scoreLimit: cfg.scoreLimit, timeLimit: cfg.timeLimit * 60, listed: false,
  })
  const scoreSteps = [25, 50, 75, 100, 150, 200, 300], timeSteps = [5, 10, 15, 20, 30, 45, 60]
  const createScreen = (): MenuScreen => ({
    crumb: "<b>Offline custom setup</b>", size: "mid",
    hints: [["↑↓", "select"], ["←→", "change"], ["enter", "confirm"], ["esc", "back"]],
    items: [
      { label: "Bots", value: () => (botCfg.on ? "on" : "off"), adjust: () => { botCfg.on = !botCfg.on; nav.replace(createScreen()) },
        meta: () => botCfg.on ? "AI pilots fill each team, including your own" : "no AI aircraft - enemy fleet guns remain active" },
      ...(botCfg.on ? [
        { label: "Bots per team", value: () => String(botCfg.perTeam), adjust: (d: 1 | -1) => { botCfg.perTeam = Math.max(1, Math.min(10, botCfg.perTeam + d)) },
          meta: "target pilots per team - your pilot takes one place" },
        { label: "Bot skill", value: () => SKILLS[botCfg.skill].name, adjust: (d: 1 | -1) => { botCfg.skill = Math.max(0, Math.min(2, botCfg.skill + d)) } },
      ] as MenuItem[] : []),
      { label: "Aircraft", value: () => VEHICLES[aircraft].name, adjust: d => { aircraft = cycle(VEHICLE_KINDS, aircraft, d) },
        meta: "initial aircraft - change again in the hangar after returning to base" },
      { label: "Name", input: { el: nameIn, at: "value" } },
      { label: "Teams", value: () => String(cfg.teams), adjust: d => { cfg.teams = Math.max(2, Math.min(4, cfg.teams + d)) } },
      { label: "Pilots per team", value: () => String(cfg.maxPerTeam), adjust: d => { cfg.maxPerTeam = Math.max(1, Math.min(10, cfg.maxPerTeam + d)) } },
      { label: "Score limit", value: () => String(cfg.scoreLimit), adjust: d => { cfg.scoreLimit = cycle(scoreSteps, scoreSteps.includes(cfg.scoreLimit) ? cfg.scoreLimit : 50, d) } },
      { label: "Time limit", value: () => `${cfg.timeLimit} min`, adjust: d => { cfg.timeLimit = cycle(timeSteps, timeSteps.includes(cfg.timeLimit) ? cfg.timeLimit : 15, d) } },
      { label: "Start offline", run: () => opts.onStart({ mode: "offline", config: readConfig(), aircraft }), meta: "local match only, no server or invitations" },
      { label: "Back", small: true, run: () => { nav.pop() } },
    ],
  })

  let coalition: "nato" | "eastern" = "nato"
  const coalitionScreen = (): MenuScreen => {
    const selected = () => COALITIONS.find(profile => profile.id === coalition)!
    return {
      crumb: "Factions · starter rosters", size: "mid",
      hints: [["↑↓", "select"], ["←→", "coalition"], ["enter", "confirm"], ["esc", "back"]],
      items: [
        { label: "Coalition", value: () => selected().shortName,
          adjust: d => { coalition = cycle(["nato", "eastern"] as const, coalition, d) },
          meta: () => `${selected().aircraft.map(kind => VEHICLES[kind as VehicleKind].name).join(" / ")} · ${selected().vessels.map(vessel => vessel.name).join(" / ")} · ${selected().aircraft.length}/${selected().aircraftModels.length} aircraft and ${selected().vessels.length}/${selected().vesselModels.length} vessels integrated` },
        { label: "Start Factions", run: () => opts.onStart({ mode: "offline", rules: "factions", coalition,
          config: { ...DEFAULT_ROOM_CONFIG, name: `${selected().shortName} Factions`, teams: 2, bots: 2, listed: false } }),
          meta: "fictional coalitions · cannon against flagships · aircraft only" },
        { label: "Back", small: true, run: () => nav.pop() },
      ],
    }
  }

  const rootScreen = (): MenuScreen => ({
    size: "big",
    items: [
      { label: "Solo flight", run: () => opts.onStart({ mode: "offline", config: { ...DEFAULT_ROOM_CONFIG, name: "Practice", teams: 2, bots: 0, listed: false } }),
        meta: "offline · no AI aircraft · enemy fleet guns remain active" },
      { label: "Play with bots", run: () => opts.onStart({ mode: "offline", config: { ...DEFAULT_ROOM_CONFIG, name: "Bots", teams: 2, bots: 4, botSkill: 0.5, listed: false } }),
        meta: "offline · 2 teams · AI pilots · normal skill" },
      { label: "Custom setup", run: () => nav.push(createScreen()), meta: "offline bots, skill, teams and match limits" },
      { label: "Factions", run: () => nav.push(coalitionScreen()),
        meta: "NATO-inspired or Eastern-inspired · distinct starter rosters · aircraft only" },
      { label: "Controls", run: () => nav.push({ crumb: "controls", html: controlsTable(), hints: [["esc", "back"]] }), meta: "keyboard and mouse required" },
      { label: "Settings", run: () => nav.push(settingsScreen(nav, opts.onQuality, "<b>settings</b>")), meta: "graphics · sound · steering · controls" },
    ],
  })
  nav.reset(rootScreen())

  window.addEventListener("keydown", e => {
    if (lobby.hidden || !$("busy").hidden) return
    if (e.target === name) return
    if (nav.handleKey(e)) e.preventDefault()
  })

  const statusEl = $("load-status")
  const busyEl = $("busy")
  return {
    show() { lobby.hidden = false; document.body.classList.add("in-lobby"); nav.reset(rootScreen()) },
    hide() { lobby.hidden = true; document.body.classList.remove("in-lobby") },
    busy(text) {
      busyEl.hidden = text === null
      if (text !== null) busyEl.firstElementChild!.textContent = text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
    },
    status(html) {
      if (/unavailable|failed/i.test(html)) { statusEl.hidden = false; statusEl.className = "status err"; statusEl.textContent = "3D unavailable - renderer failed to start" }
      else statusEl.hidden = /awake|ready/i.test(html)
    },
  }
}

export { callsign }
