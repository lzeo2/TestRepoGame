// CPU/source regression only. No DOM, browser, spawn authority or native-play proof.
// Bundle for Node with the existing esbuild, then run from games/wings.
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { stripTypeScriptTypes } from "node:module"
import { DEFAULT_ROOM_CONFIG, CTF_ROOM_CONFIG } from "./src/sim/protocol"
import { createCtfState } from "./src/sim/ctf"
import { VEHICLES, VEHICLE_KINDS } from "./src/sim/vehicles"

const source = (path: string) => readFileSync(resolve(process.argv[2] ?? ".", "src", path), "utf8")
const lobby = source("ui/lobby.ts"), spawn = source("ui/spawn.ts"), hud = source("render/hud.ts")
const between = (text: string, from: string, to: string) => {
  const start = text.indexOf(from), end = text.indexOf(to, start + from.length)
  assert(start >= 0 && end > start, `source boundary ${from}`)
  return text.slice(start, end)
}
// Execute the actual config closures without the surrounding DOM/menu code.
const initial = between(lobby, "  const fleetCfg =", "  const nameIn =")
  .replace(": GameMode", "").replace(": VehicleKind", "")
const readConfig = between(lobby, "  const readConfig =", "  const scoreSteps =").replace("(): RoomConfig", "()")
const selectMode = between(lobby, "  const selectMode =", "  const createScreen =")
  .replace("(next: GameMode)", "(next)").replace("    nameIn.value = cfg.name\n", "")
const configBody = stripTypeScriptTypes(`function setupConfig() {\n${initial}\n${readConfig}\n${selectMode}
  return { readConfig, selectMode, fleetCfg, ctfCfg, fleetBots, ctfBots,
    get aircraft() { return aircraft }, choose(kind) { aircraft = kind } }
}`)
const setup = new Function("DEFAULT_ROOM_CONFIG", "CTF_ROOM_CONFIG", `${configBody}; return setupConfig()`)(DEFAULT_ROOM_CONFIG, CTF_ROOM_CONFIG)
const defaultsBefore = JSON.stringify([DEFAULT_ROOM_CONFIG, CTF_ROOM_CONFIG])
let config = setup.readConfig()
assert.equal(config.mode, "fleet")
assert.equal(config.bots, 0)
assert.equal(config.botSkill, undefined)
assert.equal(config.scoreLimit, 50)
assert.equal(config.timeLimit, 600)
setup.fleetCfg.scoreLimit = 150
setup.fleetCfg.timeLimit = 20
setup.fleetCfg.teams = 4
setup.fleetBots.on = true
setup.fleetBots.perTeam = 7
setup.fleetBots.skill = 2
setup.selectMode("ctf")
config = setup.readConfig()
assert.deepEqual([config.mode, config.teams, config.bots, config.scoreLimit, config.timeLimit, config.botSkill], ["ctf", 2, 2, 3, 300, 0.5])
setup.ctfBots.on = false
setup.ctfBots.perTeam = 0
setup.ctfCfg.teams = 4
config = setup.readConfig()
assert.equal(config.bots, 2)
assert.equal(config.teams, 2)
setup.ctfCfg.scoreLimit = 5
setup.ctfCfg.timeLimit = 15
assert.equal(setup.readConfig().timeLimit, 900)
setup.selectMode("fleet")
config = setup.readConfig()
assert.deepEqual([config.teams, config.bots, config.scoreLimit, config.timeLimit, config.botSkill], [4, 7, 150, 1200, 0.85])
setup.fleetBots.on = false
assert.equal(setup.readConfig().bots, 0)
assert.equal(setup.readConfig().botSkill, undefined)
setup.selectMode("ctf")
assert.equal(setup.readConfig().scoreLimit, 5)
assert.equal(setup.readConfig().timeLimit, 900)
assert.equal(JSON.stringify([DEFAULT_ROOM_CONFIG, CTF_ROOM_CONFIG]), defaultsBefore)
setup.choose("speedboat")
setup.selectMode("fleet")
assert.equal(setup.aircraft, "fighter", "CTF vehicle choice cannot flip the Fleet default")
setup.choose("f15")
setup.selectMode("ctf")
assert.equal(setup.aircraft, "speedboat")
setup.selectMode("fleet")
assert.equal(setup.aircraft, "f15")
console.log("PASS CPU actual config closures: Fleet defaults/Bots Off, separate mode edits, fixed CTF teams/minimum bots, seconds and skill")

assert.match(lobby, /captureSteps = \[1, 3, 5, 10\]/)
assert.match(lobby, /timeSteps = \[5, 10, 15, 20, 30, 45, 60\]/)
assert.match(lobby, /label: "Capture the flag", run: \(\) => \{ selectMode\("ctf"\); nav.push\(createScreen\(\)\) \}/)
assert.match(lobby, /label: "Vehicle"[^\n]+cycle\(VEHICLE_KINDS, aircraft, d\)/)
assert.match(lobby, /opts.onStart\(\{ mode: "offline", config: readConfig\(\), aircraft \}\)/)
assert.match(lobby, /setAttribute\("aria-label", `\$\{it.label\}: \$\{it.value\(\)\}`\)/)
assert.equal(VEHICLE_KINDS.length, 8)
assert(VEHICLE_KINDS.includes("speedboat"))
for (const [label, name, bots, suffix] of [
  ["Solo flight", "Practice", 0, ""], ["Speedboat patrol", "Patrol", 0, ', aircraft: "speedboat"'], ["Play with bots", "Bots", 4, ""],
] as const) {
  const skill = bots ? ", botSkill: 0.5" : ""
  assert(lobby.includes(`label: "${label}", run: () => opts.onStart({ mode: "offline", config: { ...DEFAULT_ROOM_CONFIG, name: "${name}", teams: 2, bots: ${bots}${skill}, listed: false }${suffix} })`))
}
console.log("PASS source: same custom CTF entry, eight-kind vehicle/start path, accessible value labels, legacy three actions unchanged")

assert.match(spawn, /ctf = s.config.mode === "ctf"/)
assert.match(spawn, /if \(ctf && t === "guns"\) t = "air"/)
assert.match(spawn, /if \(!ctf && \(e.key === "g"/)
assert.match(spawn, /if \(ctf \|\| !actions.manTurret \|\| !s.ships\)/)
assert.match(spawn, /canSpawn = !!me && wait <= 0/)
assert.match(spawn, /ctf && k === "speedboat"/)
assert.match(spawn, /water flag base, independent of carriers/)
assert.match(spawn, /beside a surviving friendly carrier/)
console.log("PASS source: CTF gun entry guards/base copy; no carrier condition on spawn readiness; Fleet carrier copy retained")

const textSource = between(hud, "export function ctfFlagText(", "export function createHud(")
  .replace(/export function ctfFlagText\([^\n]+\): string/, "function ctfFlagText(flag, vehicles, players)")
const flagText = new Function("VEHICLES", `${textSource}; return ctfFlagText`)(VEHICLES)
const flag = createCtfState([[0, 1, 0], [100, 1, 0]], 3).flags[0]
assert.equal(flagText(flag, [], new Map()), "home")
flag.droppedAt = 0
assert.equal(flagText(flag, [], new Map()), "dropped")
flag.carrierId = "boat-1"
assert.equal(flagText(flag, [], new Map()), "carried · boat-1")
const carrier = { id: "boat-1", seats: [null, "p1"], kind: "speedboat" }
const players = new Map([["p1", { name: "SKIPPER" }]])
const before = JSON.stringify([flag, carrier, [...players]])
assert.equal(flagText(flag, [carrier], players), `carried · skipper / ${VEHICLES.speedboat.name.toLowerCase()}`)
assert.equal(JSON.stringify([flag, carrier, [...players]]), before)
assert.match(hud, /ctf\?: CtfState/)
assert.match(hud, /captures \/ target \$\{f.ctf.captureLimit\}/)
assert.match(hud, /esc\(ctfFlagText\(flag, f.vehicles, f.players\)\)/)
assert.match(hud, /if \(f.ctf\) \{\n      ctx.strokeStyle/)
assert.match(hud, /CTF_WATER_ROUTE.forEach/)
assert.match(hud, /flag.home\[0\]/)
assert.match(hud, /flag.position\[0\]/)
assert.match(hud, /else if \(f.ships\?\.length\)/)
console.log("PASS CPU flag text: home/drop-at-zero/carried/known occupant+vehicle/unknown carrier, no mutation; source guards CTF HUD/map and Fleet objectives")
const settingsSource = source("ui/settings.ts")
const loader = stripTypeScriptTypes(between(settingsSource, "function defaults()", "export const settings"))
const loadSettings = new Function("navigator", "localStorage", `const KEY = "wings.settings"; ${loader}; return load()`)
const readStored = (raw: string) => loadSettings({ hardwareConcurrency: 8, userAgent: "CPU fixture" }, { getItem: () => raw })
const malformed = readStored('{"name":42,"sensitivity":"bad","volume":"bad","muted":"false","invertY":"false","controlsV6":true}')
assert.deepEqual([malformed.name, malformed.sensitivity, malformed.volume, malformed.muted, malformed.invertY], ["", 1, 0.8, false, false])
assert.doesNotThrow(() => malformed.name.toLowerCase())
assert.doesNotThrow(() => malformed.sensitivity.toFixed(2))
const valid = readStored('{"name":"PILOT","sensitivity":1.8,"volume":0.3,"controlScheme":"point","controlStyle":"aim","mouseX":"roll","controlsV6":true}')
assert.deepEqual([valid.name, valid.sensitivity, valid.volume, valid.controlScheme, valid.controlStyle, valid.mouseX], ["PILOT", 1.8, 0.3, "point", "aim", "roll"])
const poisoned = readStored('{"__proto__":{"polluted":true},"controlsV6":true}')
assert.equal(Object.getPrototypeOf(poisoned), Object.prototype)
assert.equal(poisoned.polluted, undefined)
assert.equal(readStored('not json').controlScheme, "battlefield")
console.log("PASS actual settings loader: malformed name/sensitivity/audio cannot reach string/number consumers; valid preferences retained; prototype key rejected")

const main = source("main.ts"), game = source("ui/game.ts"), scene = source("render/scene.ts")
assert.match(main, /bootScene\(req\)/)
assert.match(main, /req\.config\.mode === "ctf" \? CTF_HOMES\[0\] : undefined/)
assert.match(scene, /if \(fn\) initialFocus = undefined/)
assert.match(game, /this\.ctfView\?\.update\(latest\.ctf, this\.visuals\)/)
assert.match(game, /f\.ctf = s\.ctf/)
assert.match(game, /ctf: this\.latest\?\.ctf \? cloneCtfState\(this\.latest\.ctf\) : null/)
assert.match(game, /this\.ctfView\?\.dispose\(\)/)
console.log("PASS source wiring: requested CTF play-area boot focus, authoritative HUD/view and copied diagnostics/disposal")
console.log("LIMIT: source/CPU checks only; no DOM, layout, browser, native play or UI interaction acceptance")
