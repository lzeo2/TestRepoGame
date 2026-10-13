// Renderer-free UI fixture. No flight/render acceptance is claimed by this page.
import './src/style.css'
import { createSpawnScreen } from './src/ui/spawn'
import { DEFAULT_ROOM_CONFIG } from './src/sim/protocol'
const html = new DOMParser().parseFromString(await (await fetch('./index.html')).text(), 'text/html')
for (const style of html.querySelectorAll('style,link[rel="stylesheet"]')) document.head.append(style.cloneNode(true))
const note = document.createElement('button')
note.textContent = 'UI fixture only - show HUD'
note.style.cssText = 'position:fixed;top:0;left:0;z-index:100;min-height:44px;background:black;color:white'
document.body.append(note)
const root = document.createElement('div'); root.className = 'game-ui'; document.body.append(root)
let launches = 0
const spawn = createSpawnScreen(root, { spawn() { launches++ }, board() {}, team() {}, leave() {}, click() {} })
spawn.update({me:{id:'check',team:0,respawnAt:0} as never,players:new Map(),vehicles:[],time:0,config:{...DEFAULT_ROOM_CONFIG,listed:false},room:'offline',dead:false})
spawn.show()
const hud = document.createElement('div'); hud.className = 'hud flying'; hud.hidden = true
// Actual production HUD selectors, with deliberately long weapon labels.
hud.innerHTML = '<div class="hud-radar z"><canvas></canvas><span class="rr">3 km</span></div><div class="hud-mapwrap z"><canvas class="hud-map"></canvas><span class="n">N</span></div><div class="hud-bottom"><div class="weapons"><div class="w"><span class="k">lmb</span><span class="n">20mm Vulcan</span><span class="a">500</span></div><div class="w"><span class="k">rmb</span><span class="n">Heat-seeking missile</span><span class="a">4</span></div></div><div class="seat">Pilot - fighter</div><div class="hp">Hull 450</div></div>'
root.append(hud)
note.onclick = () => { spawn.hide(); hud.hidden = false; note.textContent = 'UI fixture only - not rendered flight' }
const box = (s: string) => document.querySelector(s)!.getBoundingClientRect()
requestAnimationFrame(() => {
  const list = box('.sp-list'), detail = box('.sp-detail')
  if (innerWidth <= 760 && detail.top < list.bottom) throw new Error('Hangar list/detail overlap')
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'1'}))
  if (launches !== 1) throw new Error('Spawn quick-launch failed')
  spawn.dispose()
  window.dispatchEvent(new KeyboardEvent('keydown',{key:'1'}))
  if (launches !== 1) throw new Error('Disposed spawn listener still active')
  // Recreate for the visual/layout check after verifying cleanup.
  const visible = createSpawnScreen(root, { spawn() {}, board() {}, team() {}, leave() {}, click() {} })
  visible.update({me:{id:'check',team:0,respawnAt:0} as never,players:new Map(),vehicles:[],time:0,config:{...DEFAULT_ROOM_CONFIG,listed:false},room:'offline',dead:false})
  visible.show()
  note.onclick = () => { visible.hide(); hud.hidden = false; note.textContent = 'UI fixture only - not rendered flight' }
  document.title = 'PASS: Wings UI fixture'
})
