// Spawn / respawn screen: a numbered aircraft list (same menu language as the main menu) with the selected
// aircraft's detail on the right, team switch, open seats on teammates' aircraft and the respawn timer.
import type { RoomConfig, ShipState } from "../sim/protocol"
import { activeFleet, SHIP_SPECS } from "../sim/fleet"
import { shipName, turretName } from "./fleet-names"
import type { PlayerInfo, SeatIndex, TeamId, VehicleEntity, VehicleKind } from "../sim/types"
import { VEHICLES, VEHICLE_KINDS, WEAPONS } from "../sim/vehicles"
import { MenuNav, TEAM_COLORS, TEAM_NAMES, controlsTable, escapeHtml, hintsHtml, type MenuItem } from "./lobby"

interface RoleInfo { role: string; blurb: string; agility: number; firepower: number }
const ROLES: Partial<Record<VehicleKind, RoleInfo>> = {
  rafale: { role: "multirole fighter", agility: 0.9, firepower: 0.7, blurb: "Predictable low-speed control with moderate boost acceleration. Arcade cannon, two air-to-air and two strike rounds. This is the land-based C variant, not a naval Rafale M." },
  jf17: { role: "light combat fighter", agility: 0.85, firepower: 0.7, blurb: "Forgiving medium-speed control with modest acceleration and a lower boost ceiling. Arcade cannon, two air-to-air and two strike rounds. Fleet objectives currently take cannon hits." },
  typhoon: { role: "air-defense fighter", agility: 0.95, firepower: 0.7, blurb: "Fast roll and high-speed turns, with wider low-speed recovery. Arcade cannon and four air-to-air rounds; canards and elevons follow the native flight state." },
  su35s: { role: "heavy multirole fighter", agility: 0.75, firepower: 0.8, blurb: "Strong pitch authority with slower roll and a larger hit sphere. Arcade cannon, two air-to-air and two strike rounds, not the proposed six-missile fit. Fleet objectives currently take cannon hits." },
  f16c: { role: "Multirole fighter", agility: 0.85, firepower: 0.7, blurb: "Single-engine jet with an arcade cannon, heat-seeking missiles and guided missiles. See crew stations below for the fitted weapons." },
  mig29: { role: "Air-superiority fighter", agility: 0.85, firepower: 0.7, blurb: "Twin-engine jet with an arcade cannon and heat-seeking missiles at both crew stations. See crew stations below for the fitted weapons." },
  f15: { role: "twin-engine fighter", agility: 0.9, firepower: 0.7, blurb: "Fast flight and high roll rate. Pilot cannon and heat-seekers, officer guided strikes. Visible stores follow ammunition." },
  f35: { role: "single-engine fighter", agility: 0.95, firepower: 0.7, blurb: "Lower speed, tighter turns and existing stealth rules. Visible stores and bay doors follow the fitted weapons." },
  fighter: { role: "strike fighter", agility: 0.85, firepower: 0.7, blurb: "Fast, agile all-rounder. Guns and heat-seekers up front, lock-on radar missiles in the back." },
  apache: { role: "attack helicopter", agility: 0.95, firepower: 0.8, blurb: "Hovers, strafes and hides behind ridges. Rockets for the pilot, chain gun and Hellfires for the gunner." },
  warthog: { role: "close air support", agility: 0.45, firepower: 1, blurb: "Slow, armoured, terrifying. The GAU-8 shreds anything it points at." },
  blackbird: { role: "recon interceptor", agility: 0.35, firepower: 0.55, blurb: "The fastest thing in the sky. The pilot flies; the radar officer paints enemies and guides long-range missiles." },
  bomber: { role: "stealth bomber", agility: 0.2, firepower: 1, blurb: "Stealth bomber - invisible to radar unless spotted; immune to fleet AA above 600 m; poor maneuverability. The bombardier drops bombs on ships." },
}
const MAX_SPEED = Math.max(...VEHICLE_KINDS.map(k => VEHICLES[k].boost))
const MAX_HP = Math.max(...VEHICLE_KINDS.map(k => VEHICLES[k].maxHp))

/** Controls reference for the current steering scheme (pause menu). */
export function controlsHtml(_heli = false): string {
  return controlsTable()
}

export interface SpawnState {
  me: PlayerInfo | null
  players: Map<string, PlayerInfo>
  vehicles: VehicleEntity[]
  time: number
  config: RoomConfig
  room: string
  dead: boolean
  /** Ship objectives (Fleet Strike): hp, turrets and who mans them. */
  ships?: ShipState[]
}

export interface SpawnScreen {
  root: HTMLElement
  show(): void
  hide(): void
  visible(): boolean
  update(s: SpawnState): void
  /** Open directly on the "man the guns" tab. */
  showGuns(): void
  /** Open on the aircraft tab. */
  showAir(): void
  dispose(): void
}

const bar = (v: number) => `<i class="bar"><b style="width:${Math.round(Math.max(0.06, Math.min(1, v)) * 100)}%"></b></i>`

function detailHtml(k: VehicleKind, i: number): string {
  const v = VEHICLES[k], r = ROLES[k]
  const seats = [0, 1].map(s => {
    const ws = v.seatWeapons[s]
    const list = ws[0] === null && ws[1] === null ? [] : (ws[0] !== null && ws[0] === ws[1] ? [ws[0]] : ws).filter(Boolean).map(id => WEAPONS[id!].kind === "bomb" ? "bombs" : WEAPONS[id!].name.toLowerCase())
    if (s === 0) list.push("flares")
    return `<li><span class="n">${s + 1}</span><span class="s">${escapeHtml(v.seatNames[s])}</span><span class="w">${list.length ? list.join(" · ") : "flies only"}</span></li>`
  }).join("")
  return `<div class="crumb">${String(i + 1).padStart(2, "0")} - ${r?.role ?? (v.flight === "heli" ? "attack helicopter" : "aircraft")} · ${v.flight === "heli" ? "vtol" : "jet"}</div>
    <h3 class="name">${escapeHtml(v.name)}</h3>
    <p class="blurb">${r?.blurb ?? "Arcade fit. See crew stations below for the fitted weapons."}</p>
    <dl class="stats">
      <div><dt>speed</dt><dd>${Math.round(v.boost * 3.6)}<small> km/h</small></dd>${bar(v.boost / MAX_SPEED)}</div>
      <div><dt>hull</dt><dd>${v.maxHp}</dd>${bar(v.maxHp / MAX_HP)}</div>
      ${r ? `<div><dt>agility</dt><dd>${Math.round(r.agility * 10)}<small>/10</small></dd>${bar(r.agility)}</div>
      <div><dt>firepower</dt><dd>${Math.round(r.firepower * 10)}<small>/10</small></dd>${bar(r.firepower)}</div>` : ""}
      <div><dt>flares</dt><dd>${v.flares}</dd></div>
    </dl>
    <ol class="seats">${seats}</ol>`
}

export function createSpawnScreen(parent: HTMLElement, actions: {
  spawn(kind: VehicleKind): void
  board(vehicle: string, seat: SeatIndex): void
  team(team: TeamId): void
  leave(): void
  click(): void
  /** Optional rendered aircraft thumbnail (team livery). */
  thumb?(kind: VehicleKind, team: TeamId): Promise<string | null>
  /** Man one of your fleet's turrets instead of flying. */
  manTurret?(ship: string, turret: string): void
  fixedTeam?: boolean
  /** Absent getter keeps the ordinary roster; an empty/invalid result allows no aircraft. */
  aircraftKinds?(): readonly VehicleKind[]
  teamNames?(): readonly string[]
}): SpawnScreen {
  const root = document.createElement("div")
  root.className = "spawn"
  root.hidden = true
  root.innerHTML = `
    <div class="sp-head">
      <div class="crumb">offline room <b class="code"></b></div>
      <h2 class="title">Choose aircraft</h2>
      <div class="tabs" role="tablist"><button data-tab="air" class="on">aircraft</button><button data-tab="guns">man the guns</button><kbd>g</kbd></div>
      <div class="teams" aria-label="Team"></div>
    </div>
    <nav class="screen sp-list"></nav>
    <section class="sp-detail"><img class="thumb" alt="" hidden /><div class="info"></div></section>
    <div class="countdown"><span class="lbl">respawn in</span><span class="num"></span></div>
    <footer class="foot"><div class="hints"></div></footer>`
  parent.appendChild(root)

  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector(s) as T
  const teamsEl = $(".teams")
  teamsEl.hidden = !!actions.fixedTeam
  const title = $(".title")
  const code = $(".code")
  const info = $(".sp-detail .info")
  const thumbImg = $<HTMLImageElement>(".sp-detail .thumb")
  const countdown = $(".countdown")
  const cdNum = $(".countdown .num")
  const hints = $(".foot .hints")
  const nav = new MenuNav($(".sp-list"), actions.click)
  nav.onHints = h => { hints.innerHTML = hintsHtml(h) }

  let canSpawn = false
  let wait = 0
  let lastTeams = ""
  let boardKey = ""
  let myTeam: TeamId = 0
  let teamCount = 2
  let shownKind: VehicleKind | null = null
  const readKinds = (): VehicleKind[] => {
    if (!actions.aircraftKinds) return [...VEHICLE_KINDS]
    const kinds = actions.aircraftKinds()
    return Array.isArray(kinds) ? [...new Set(kinds.filter(k => VEHICLE_KINDS.includes(k)))] : []
  }
  let aircraftKinds = readKinds()
  const thumbs = new Map<string, string>()
  const requested = new Set<string>()

  const showDetail = (k: VehicleKind) => {
    if (k === shownKind) return
    shownKind = k
    info.innerHTML = detailHtml(k, aircraftKinds.indexOf(k))
    paintThumb()
  }
  const paintThumb = () => {
    if (!shownKind || !aircraftKinds.includes(shownKind)) { thumbImg.hidden = true; thumbImg.removeAttribute("src"); return }
    const url = thumbs.get(`${shownKind}:${myTeam}`)
    thumbImg.hidden = !url
    if (url && thumbImg.src !== url) thumbImg.src = url
  }
  const loadThumbs = (team: TeamId) => {
    if (!actions.thumb) return
    for (const k of aircraftKinds) {
      const key = `${k}:${team}`
      if (requested.has(key)) continue
      requested.add(key)
      actions.thumb(k, team).then(url => { if (url) { thumbs.set(key, url); paintThumb() } })
    }
  }

  let tab: "air" | "guns" = "air"
  let ships: ShipState[] = []
  let players: Map<string, PlayerInfo> = new Map()
  let gunsKey = ""
  interface Mount { ship: string; turret: string }
  let mounts: Mount[] = []
  const shipHp = (id: string) => ships.find(x => x.id === id)
  const mountStatus = (m: Mount) => {
    const st = shipHp(m.ship)
    const t = st?.turrets[m.turret]
    if (st?.sunk) return "sunk"
    if (t && t.hp <= 0) return "destroyed"
    if (t?.manned) return t.manned === me?.id ? "you" : `${(players.get(t.manned)?.name ?? "?").toLowerCase()}`
    return "free"
  }
  let me: PlayerInfo | null = null
  const showMount = (m: Mount) => {
    shownKind = null
    thumbImg.hidden = true
    const st = shipHp(m.ship)
    const pct = st ? Math.round((st.hp / st.maxHp) * 100) : 100
    const kind = turretName(m.ship, m.turret).split(" · ")[0]
    info.innerHTML = `<div class="crumb">man the guns - ${escapeHtml(shipName(m.ship))}</div>
      <h3 class="name">${escapeHtml(turretName(m.ship, m.turret))}</h3>
      <p class="blurb">${kind === "ciws"
        ? "Close-in weapon system: a fast rotary cannon. Hose incoming aircraft and missiles at short range."
        : "5-inch naval gun: slow, heavy flak shells that burst near aircraft at long range."} Mouse aims, left mouse fires, wheel zooms. Unmanned guns are run by the ship's AI.</p>
      <dl class="stats"><div><dt>ship hull</dt><dd>${pct}<small>%</small></dd><i class="bar"><b style="width:${pct}%"></b></i></div>
      <div><dt>status</dt><dd>${escapeHtml(mountStatus(m))}</dd></div></dl>`
  }

  let boardItems: MenuItem[] = []
  const launchMeta = () => (canSpawn ? "" : `respawn in ${Math.ceil(wait)} s · `)
  const buildGuns = (keepSel: boolean) => {
    const items: MenuItem[] = mounts.map(m => ({
      label: `${shipName(m.ship).replace(/^\S+ /, "")} · ${turretName(m.ship, m.turret).split(" · ")[1]}`,
      small: true,
      value: () => `${turretName(m.ship, m.turret).split(" · ")[0]} · ${mountStatus(m)}`,
      meta: () => (canSpawn ? "" : `available in ${Math.ceil(wait)} s`),
      disabled: () => ["sunk", "destroyed"].includes(mountStatus(m)),
      run: () => { const st = mountStatus(m); if (canSpawn && (st === "free" || st === "you")) actions.manTurret?.(m.ship, m.turret) },
    }))
    if (!items.length) items.push({ label: "No guns available", small: true, meta: "your fleet has no mannable turrets left" })
    items.push({ label: "Leave match", small: true, run: () => actions.leave(), meta: "back to the main menu" })
    const screen = {
      size: "mid" as const, items, sel: keepSel ? nav.index : 0,
      hints: [["↑↓", "select"], ["enter", "man gun"], ["g", "aircraft"], ["←→", "team"]] as [string, string][],
    }
    if (nav.depth) nav.replace(screen)
    else nav.push(screen)
  }
  const setTab = (t: "air" | "guns") => {
    if (t === tab || (t === "guns" && actions.fixedTeam)) return
    tab = t
    root.querySelectorAll<HTMLElement>("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === t))
    root.classList.toggle("guns", t === "guns")
    title.textContent = t === "guns" ? "Man the guns" : "Choose aircraft"
    if (t === "guns") { buildGuns(false); if (mounts[0]) showMount(mounts[0]) } else { shownKind = null; build(false) }
  }
  const build = (keepSel = true) => {
    if (tab === "guns") { buildGuns(keepSel); return }
    const items: MenuItem[] = aircraftKinds.map(k => ({
      label: VEHICLES[k].name,
      value: () => (VEHICLES[k].flight === "heli" ? "vtol" : "jet"),
      meta: () => (canSpawn ? "" : `respawn in ${Math.ceil(wait)} s`),
      run: () => { if (canSpawn && aircraftKinds.includes(k)) actions.spawn(k) },
    }))
    items.push(...boardItems)
    items.push({ label: "Leave match", small: true, run: () => actions.leave(), meta: "back to the main menu" })
    const screen = {
      size: "big" as const, items, sel: keepSel ? nav.index : 0,
      hints: [["↑↓", "select"], ["enter", aircraftKinds.length ? "launch" : "leave"], ...(actions.fixedTeam ? [] : [["←→", "team"]]), ...(aircraftKinds.length ? [[aircraftKinds.length === 1 ? "1" : `1–${Math.min(9, aircraftKinds.length)}`, "quick launch"]] : [])] as [string, string][],
    }
    if (nav.depth) nav.replace(screen)
    else nav.push(screen)
  }
  nav.onMove = i => {
    if (tab === "guns") { if (mounts[i]) showMount(mounts[i]); return }
    const k = aircraftKinds[i]
    if (k) showDetail(k)
    else {
      shownKind = null
      thumbImg.hidden = true
      thumbImg.removeAttribute("src")
      info.textContent = aircraftKinds.length ? "" : "No aircraft available for this side. Leave the match to choose another profile."
    }
  }
  nav.onSide = d => { if (!actions.fixedTeam && teamCount > 1) actions.team(((myTeam + d + teamCount) % teamCount) as TeamId) }
  build(false)

  const onKey = (e: KeyboardEvent) => {
    if (root.hidden || (e.target as HTMLElement)?.tagName === "INPUT") return
    if ((e.key === "g" || e.key === "G") && !e.repeat && actions.manTurret) { actions.click(); setTab(tab === "air" ? "guns" : "air"); return }
    const n = /^[1-9]$/.test(e.key) ? Number(e.key) : 0
    if (tab === "air" && n >= 1 && n <= aircraftKinds.length && !e.repeat) {
      if (canSpawn) { actions.click(); actions.spawn(aircraftKinds[n - 1]) }
      return
    }
    if (e.key === "Escape") return
    if (nav.handleKey(e)) e.preventDefault()
  }
  window.addEventListener("keydown", onKey)

  root.addEventListener("click", e => {
    const t = e.target as HTMLElement
    const team = t.closest<HTMLElement>("[data-team]")
    if (team) { actions.click(); actions.team(Number(team.dataset.team) as TeamId); return }
    const tb = t.closest<HTMLElement>("[data-tab]")
    if (tb) { actions.click(); setTab(tb.dataset.tab as "air" | "guns") }
  })

  return {
    root,
    show() { root.hidden = false },
    showGuns() { root.hidden = false; setTab("guns") },
    showAir() { root.hidden = false; setTab("air") },
    hide() { root.hidden = true },
    visible: () => !root.hidden,
    update(s) {
      code.textContent = s.room.toLowerCase()
      me = s.me
      wait = me ? Math.max(0, me.respawnAt - s.time) : 0
      const could = canSpawn
      canSpawn = !!me && wait <= 0
      root.classList.toggle("waiting", !canSpawn)
      countdown.classList.toggle("on", !canSpawn)
      const num = String(Math.ceil(wait)).padStart(2, "0")
      if (cdNum.textContent !== num) cdNum.textContent = num
      const factionNames = actions.fixedTeam ? actions.teamNames?.() : undefined
      const faction = Array.isArray(factionNames) && typeof factionNames[me?.team ?? 0] === "string" ? factionNames[me?.team ?? 0].trim() : ""
      const t = tab === "guns" ? "Man the guns" : s.dead ? "Shot down" : faction ? `Choose ${faction.replace(/ coalition$/, "")} aircraft` : "Choose aircraft"
      if (title.textContent !== t) title.textContent = t
      players = s.players
      ships = s.ships ?? []
      if (actions.fixedTeam || !actions.manTurret || !s.ships) root.querySelector<HTMLElement>(".tabs")!.hidden = true
      else root.querySelector<HTMLElement>(".tabs")!.hidden = false
      if (me) {
        const myT = me.team
        mounts = activeFleet(s.config.teams).filter(sh => sh.team === myT)
          .flatMap(sh => SHIP_SPECS[sh.kind].turrets.filter(tt => tt.mannable).map(tt => ({ ship: sh.id, turret: tt.id })))
        const gk = mounts.map(m => `${m.ship}:${m.turret}:${mountStatus(m)}`).join("|") + `:${canSpawn}`
        if (tab === "guns" && gk !== gunsKey) { gunsKey = gk; buildGuns(true); if (mounts[nav.index]) showMount(mounts[nav.index]) }
      }
      const kinds = readKinds()
      const rosterChanged = kinds.join("|") !== aircraftKinds.join("|") || (me !== null && me.team !== myTeam)
      aircraftKinds = kinds
      if (me) myTeam = me.team
      if (rosterChanged) {
        shownKind = null
        thumbImg.hidden = true
        thumbImg.removeAttribute("src")
        info.textContent = ""
      }
      loadThumbs(myTeam)
      teamCount = s.config.teams

      const counts = new Array(s.config.teams).fill(0)
      for (const p of s.players.values()) if (p.team < counts.length) counts[p.team]++
      const suppliedNames = actions.teamNames?.()
      const teamNames = Array.isArray(suppliedNames) ? [...suppliedNames] : []
      const teamsHtml = `<span class="lbl">team</span>` + counts.map((n, t) =>
        `<button data-team="${t}" class="${me?.team === t ? "on" : ""}" style="--c:${TEAM_COLORS[t]}" aria-pressed="${me?.team === t}"><i class="sw"></i>${escapeHtml((typeof teamNames[t] === "string" && teamNames[t].trim() ? teamNames[t] : TEAM_NAMES[t]).toLowerCase())}<span>${n}</span></button>`).join("")
      if (teamsHtml !== lastTeams) { teamsEl.innerHTML = teamsHtml; lastTeams = teamsHtml }

      const seats: { v: VehicleEntity; seat: SeatIndex; owner: string }[] = []
      if (me) for (const v of s.vehicles) {
        if (!v.alive || v.team !== me.team || !aircraftKinds.includes(v.kind)) continue
        for (const seat of [0, 1] as SeatIndex[]) {
          if (v.seats[seat] !== null) continue
          const owner = v.seats[seat === 0 ? 1 : 0]
          seats.push({ v, seat, owner: owner ? s.players.get(owner)?.name ?? "?" : "" })
        }
      }
      const key = seats.slice(0, 4).map(x => `${x.v.id}:${x.seat}:${x.owner}`).join("|")
      if ((rosterChanged || key !== boardKey || could !== canSpawn) && tab === "air") {
        boardKey = key
        boardItems = seats.slice(0, 4).map(x => ({
          label: x.owner ? `Join ${x.owner.toLowerCase()}` : `Empty ${VEHICLES[x.v.kind].name}`,
          small: true,
          value: () => VEHICLES[x.v.kind].seatNames[x.seat].toLowerCase(),
          meta: () => `${launchMeta()}board as ${VEHICLES[x.v.kind].seatNames[x.seat].toLowerCase()} · ${VEHICLES[x.v.kind].name}`,
          run: () => { if (canSpawn && aircraftKinds.includes(x.v.kind)) actions.board(x.v.id, x.seat) },
        }))
        build()
      } else if (!canSpawn) nav.refresh()
    },
    dispose() { window.removeEventListener("keydown", onKey); root.remove() },
  }
}
