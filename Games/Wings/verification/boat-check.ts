// CPU only: node boat-check.mjs MODEL_DIRECTORY [EXPECTED_SHA256]
// Compare printed hashes across independent model generations; rereading one file is not generator proof.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { Matrix4, Quaternion, Vector3, PerspectiveCamera, Color } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CameraRig } from './src/render/camera'
import { CONFIG, createAircraftView, aircraftReady, aircraftStats } from './src/render/aircraft'
import { VEHICLES, VEHICLE_KINDS, WEAPONS } from './src/sim/vehicles'
import { createFlightState, NEUTRAL_INPUT, boatNavigable, yawPitchRoll, forward, cloneFlight, stepFlight } from './src/sim/flight'
import { worldQuery, isWater, setFleetState, posedFleet, posedShip, shipAt, segmentHitsGround } from './src/sim/geography'
import { SHIP_SPECS, shipToWorld } from './src/sim/fleet'
import { RoomEngine } from './src/sim/room-engine'
import { applySeatInput, createCombatState, createWeapons, stepCombat, muzzlePosition, weaponDirection, deckCannonAngles, markSpawned } from './src/sim/combat'
import { createLoopbackRoom } from './src/sim/loopback'
import { DEFAULT_ROOM_CONFIG, type ServerMessage } from './src/sim/protocol'
import { TICK_DT, type Vec3, type Quat, type FlightInput, type VehicleEntity, type GameEvent, type SeatInput } from './src/sim/types'

assert(process.argv[2], 'Usage: node boat-check.mjs MODEL_DIRECTORY [EXPECTED_SHA256]')
const models = resolve(process.argv[2])
const bytes = readFileSync(resolve(models, 'speedboat.glb'))
const hash = createHash('sha256').update(bytes).digest('hex')
if (process.argv[3]) assert.equal(hash, process.argv[3], 'model differs from independently supplied generation hash')
assert.equal(bytes.readUInt32LE(0), 0x46546c67)
assert.equal(bytes.readUInt32LE(4), 2)
assert.equal(bytes.readUInt32LE(8), bytes.length)
assert(bytes.length < 1200000, `byte budget: ${bytes.length}`)
assert.equal(bytes.readUInt32LE(16), 0x4e4f534a)
const jsonEnd = 20 + bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.subarray(20, jsonEnd).toString())
assert.equal(bytes.readUInt32LE(jsonEnd + 4), 0x004e4942)
const bin = bytes.subarray(jsonEnd + 8)
assert.equal(bin.length, bytes.readUInt32LE(jsonEnd))
for (const field of ['images', 'textures', 'skins', 'animations']) assert.equal(gltf[field]?.length ?? 0, 0)
assert(gltf.buffers.every((b: any) => !b.uri && b.byteLength <= bin.length))
const node = (name: string) => { const i = gltf.nodes.findIndex((n: any) => n.name === name); assert(i >= 0, name); return i }
function matrix(index: number): Matrix4 {
  const result = new Matrix4(), seen = new Set<number>()
  while (index >= 0) {
    assert(!seen.has(index), 'cyclic ancestry'); seen.add(index)
    const n = gltf.nodes[index]
    result.premultiply(n.matrix ? new Matrix4().fromArray(n.matrix) : new Matrix4().compose(new Vector3(...(n.translation ?? [0,0,0])), new Quaternion(...(n.rotation ?? [0,0,0,1])), new Vector3(...(n.scale ?? [1,1,1]))))
    const parents = gltf.nodes.flatMap((p: any, i: number) => p.children?.includes(index) ? [i] : [])
    assert(parents.length <= 1, 'multiple parents'); index = parents[0] ?? -1
  }
  assert(result.elements.every(Number.isFinite)); return result
}
const position = (name: string) => new Vector3().setFromMatrixPosition(matrix(node(name)))
const near = (a: number, b: number, why = '', epsilon = 1e-6) => assert(Math.abs(a - b) < epsilon, `${why}: ${a} != ${b}`)
const near3 = (a: number[], b: number[], why = '') => a.forEach((x, i) => near(x, b[i], why))
function accessor(index: number): number[][] {
  const a = gltf.accessors[index]; assert(a && !a.sparse && Number.isInteger(a.count) && a.count > 0)
  const v = gltf.bufferViews[a.bufferView]; assert(v && v.buffer === 0)
  const widths: Record<number, number> = {5126:4, 5125:4, 5123:2, 5121:1}
  const count: Record<string, number> = {SCALAR:1, VEC2:2, VEC3:3, VEC4:4}
  const w = widths[a.componentType], n = count[a.type]; assert(w && n)
  const stride = v.byteStride ?? w * n, start = (v.byteOffset ?? 0) + (a.byteOffset ?? 0)
  assert(start >= 0 && stride >= w*n && start + (a.count-1)*stride + w*n <= (v.byteOffset ?? 0)+v.byteLength)
  assert((v.byteOffset ?? 0) + v.byteLength <= bin.length)
  return Array.from({length:a.count}, (_, i) => Array.from({length:n}, (_, j) => {
    const p = start+i*stride+j*w
    const value = a.componentType === 5126 ? bin.readFloatLE(p) : w === 4 ? bin.readUInt32LE(p) : w === 2 ? bin.readUInt16LE(p) : bin.readUInt8(p)
    assert(Number.isFinite(value), 'nonfinite attribute'); return value
  }))
}
for (const i of gltf.scenes[gltf.scene ?? 0].nodes) assert.deepEqual(matrix(i).elements, new Matrix4().elements, 'identity GLB root')
const primitives = gltf.meshes.flatMap((m: any) => m.primitives)
let triangles = 0
for (const p of primitives) {
  assert.equal(p.mode ?? 4, 4)
  const vertices = accessor(p.attributes.POSITION), normals = accessor(p.attributes.NORMAL)
  assert.equal(normals.length, vertices.length)
  assert(normals.every(n => Math.abs(Math.hypot(...n) - 1) < 1e-5), 'unit source normals')
  for (const i of Object.values(p.attributes)) assert.equal(accessor(i as number).length, vertices.length)
  const ao = accessor(p.attributes.COLOR_0)
  assert(ao.every(c => c.length === 3 && c[0] === c[1] && c[1] === c[2] && c[0] >= .55 - 1e-7 && c[0] <= 1), 'neutral source AO, not paint')
  const indices = accessor(p.indices).flat(); assert.equal(indices.length % 3, 0)
  assert(indices.every(i => Number.isInteger(i) && i >= 0 && i < vertices.length))
  triangles += indices.length / 3
}
assert(triangles >= 12000 && triangles <= 18000, `triangle budget: ${triangles}`)
assert(primitives.length >= 40)
assert(gltf.materials.length >= 40, 'meaningful authored surface materials')
assert.equal(new Set(gltf.materials.map(({name, ...surface}: any) => JSON.stringify(surface))).size,gltf.materials.length,'distinct PBR definitions, not renamed duplicates')
assert.equal(new Set(primitives.map((p: any) => p.material)).size, gltf.materials.length)
assert(primitives.every((p: any) => gltf.materials[p.material]))
assert(gltf.materials.some((m: any) => m.alphaMode === 'BLEND' && m.pbrMetallicRoughness.baseColorFactor[3] > 0 && m.pbrMetallicRoughness.baseColorFactor[3] < 1))
const water = VEHICLES.speedboat.water!
near3(position('cannon_pitch').toArray(), water.gunPivot, 'composed gun pivot')
near3(position('gun_muzzle').applyMatrix4(matrix(node('cannon_pitch')).invert()).toArray(), water.gunTip, 'pitch-local muzzle')
near3(position('helm_eye').toArray(), water.eye, 'helm eye')
near3(position('stern_exit').toArray(), water.stern, 'stern exit')
assert(water.stern[2] > water.halfLength)
// Weld position seams, not hard-normal vertices. Closed volumes need opposite directed edges.
const meshPoints = (name: string) => {
  const n = gltf.nodes[node(name)]; assert(Number.isInteger(n.mesh), `${name}: real mesh`)
  const transform = matrix(node(name))
  return gltf.meshes[n.mesh].primitives.flatMap((p: any) => accessor(p.attributes.POSITION).map(v => new Vector3(...v).applyMatrix4(transform))) as Vector3[]
}
function closedVolume(names: string[], convex = false): number {
  const edges = new Map<string, number>(); let volume = 0, count = 0
  for (const name of names) {
    const n = gltf.nodes[node(name)]; assert(Number.isInteger(n.mesh), name)
    const transform = matrix(node(name))
    for (const p of gltf.meshes[n.mesh].primitives) {
      const points = accessor(p.attributes.POSITION).map(v => new Vector3(...v).applyMatrix4(transform))
      const center = points.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(1 / points.length)
      const indices = accessor(p.indices).flat()
      for (let i = 0; i < indices.length; i += 3) {
        const [a,b,c] = indices.slice(i,i+3).map(j => points[j])
        const normal = new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a))
        assert(normal.lengthSq() > 1e-18, `${name}: degenerate triangle`)
        if (convex) assert(normal.dot(new Vector3().subVectors(a,center)) > 0, `${name}: outward convex face`)
        volume += a.dot(normal) / 6; count++
        const keys = [a,b,c].map(v => v.toArray().map(x => Math.round(x * 1e6)).join(','))
        for (let k = 0; k < 3; k++) {
          const edge = `${keys[k]}>${keys[(k+1)%3]}`
          assert.notEqual(keys[k],keys[(k+1)%3]); edges.set(edge,(edges.get(edge) ?? 0)+1)
        }
      }
    }
  }
  for (const [edge,n] of edges) assert(n === 1 && edges.get(edge.split('>').reverse().join('>')) === 1, `${names}: open/nonmanifold/inconsistent edge ${edge}`)
  assert(volume > 0, `${names}: inward or empty volume`)
  return count
}
const roofNames = gltf.nodes.filter((n: any) => n.name.startsWith('cabin_roof')).map((n: any) => n.name).sort()
assert.deepEqual(roofNames, ['cabin_roof','cabin_roof_end_0','cabin_roof_end_1','cabin_roof_side_0','cabin_roof_side_1','cabin_roof_under'])
assert.equal(closedVolume(roofNames),164)
for (const name of roofNames) for (const p of gltf.meshes[gltf.nodes[node(name)].mesh].primitives) {
  const material = gltf.materials[p.material]
  assert(!material.doubleSided && (material.alphaMode ?? 'OPAQUE') === 'OPAQUE', 'roof is an opaque closed shell, not double-sided shading')
  if (name === 'cabin_roof' || name === 'cabin_roof_under') {
    const top = name === 'cabin_roof'
    assert(accessor(p.attributes.NORMAL).every(n => n[1] * (top ? 1 : -1) > .95), 'outward roof normals')
    for (const [x,y,z] of accessor(p.attributes.POSITION)) {
      near(y,1.94 + .15 * Math.sin(Math.PI * (x / .83 + 1) / 2) - (top ? 0 : .045),'unchanged roof contour')
      assert(Math.min(Math.abs(z + .32),Math.abs(z - 1.98)) < 1e-6)
    }
  }
}
for (const name of ['windscreen','cabin_window_L','cabin_window_R']) {
  assert.equal(closedVolume([name],true),12)
  const material = gltf.materials[gltf.meshes[gltf.nodes[node(name)].mesh].primitives[0].material]
  assert.equal(material.alphaMode,'BLEND'); near(material.pbrMetallicRoughness.baseColorFactor[3],.48)
  assert(!material.doubleSided, 'glass must have real front/back geometry')
}
const pilotNode = gltf.nodes[node('pilot_1')], pilotParts = pilotNode.children.map((i: number) => gltf.nodes[i].name).sort()
assert.deepEqual(pilotParts, ['pilot_1_torso','pilot_1_hips','pilot_1_neck','pilot_1_helmet','pilot_1_face','pilot_1_visor',
  ...['L','R'].flatMap(side => ['arm_'+side+'_upper','arm_'+side+'_fore','hand_'+side,'leg_'+side+'_thigh','leg_'+side+'_shin','boot_'+side].map(part => 'pilot_1_'+part))].sort())
let driverTriangles = 0
for (const name of pilotParts) {
  driverTriangles += closedVolume([name],true)
  assert(meshPoints(name).every(p => Math.abs(p.x) < .4 && p.y > .83 && p.y < 1.94 && p.z > .25 && p.z < 1.30), `${name}: seated inside cabin`)
}
assert(driverTriangles >= 200 && driverTriangles <= 600, `real seated driver: ${driverTriangles}`)
assert.equal(closedVolume(['helm_wheel']),144)
const hullPoints = gltf.nodes.filter((n: any) => n.name.startsWith('hull_')).flatMap((n: any) => meshPoints(n.name)) as Vector3[]
near(Math.max(...hullPoints.map(p => Math.abs(p.x))),water.halfBeam,'geometry beam')
near(Math.max(...hullPoints.map(p => Math.abs(p.z))),water.halfLength,'geometry length')
near(-Math.min(...hullPoints.map(p => p.y)),water.draft,'geometry draft')
near(gltf.extras.waterline,water.waterline,'model waterline')
// The bore and rim must carry geometry at the actual muzzle, not just empty anchor nodes.
for (const name of ['cannon_bore_wall', 'cannon_muzzle_rim']) {
  const points = meshPoints(name)
  assert(points.length > 8)
  assert(Math.min(...points.map((v: Vector3) => v.distanceTo(position('gun_muzzle')))) < .2, 'muzzle aperture detached')
}
const rim = meshPoints('cannon_muzzle_rim').map(p => p.applyMatrix4(matrix(node('cannon_pitch')).invert()))
for (const p of rim) near(p.z,water.gunTip[2],'real muzzle plane')
near((Math.min(...rim.map(p => p.x)) + Math.max(...rim.map(p => p.x))) / 2,water.gunTip[0],'muzzle aperture center X')
near((Math.min(...rim.map(p => p.y)) + Math.max(...rim.map(p => p.y))) / 2,water.gunTip[1],'muzzle aperture center Y')
console.log(JSON.stringify({stage:'model', sha256:hash, bytes:bytes.length, triangles, driverTriangles, assignments:primitives.length, materials:gltf.materials.length, generatorDeterminism:process.argv[3] ? 'matches supplied hash' : 'unproven without independent generation hash'}))

// Real CameraRig math only. No claim about cockpit pixels or native visibility.
setFleetState(0,2)
assert(isWater(4000,4000), 'camera fixture must be actual map water')
for (const q of [[0,0,0,1], [0,Math.sin(.6),0,Math.cos(.6)]] as Quat[]) {
  const at: Vec3 = [4000,water.waterline,4000], orientation = new Quaternion(...q)
  const eye = position('helm_eye').applyQuaternion(orientation).add(new Vector3(...at))
  const look = new Vector3(0,0,-1).applyQuaternion(orientation)
  assert(isWater(eye.x,eye.z), 'composed camera eye stays over actual map water')
  for (const mode of ['cockpit','cockpitBody','gunner'] as const) {
    const camera = new PerspectiveCamera(), rig = new CameraRig(camera)
    if (mode === 'cockpitBody') rig.cockpitBody(TICK_DT,'speedboat',at,q,0,0)
    else rig[mode](TICK_DT,'speedboat',at,q,look)
    rig.apply(1); near3(camera.position.toArray(),eye.toArray(),`${mode}: composed helm eye`)
    near3(camera.getWorldDirection(new Vector3()).toArray(),look.toArray(),`${mode}: yaw direction`)
  }
  for (const body of [false,true]) {
    const camera = new PerspectiveCamera(62), rig = new CameraRig(camera), speed = 100
    if (body) rig.chaseBody(TICK_DT,'speedboat',at,[0,0,-speed],q,0,0,worldQuery.groundHeight)
    else rig.chase(TICK_DT,'speedboat',at,[0,0,-speed],look,worldQuery.groundHeight)
    rig.apply(1)
    assert(isWater(camera.position.x,camera.position.z), 'chase fixture stays over actual map water')
    near3(camera.position.toArray(),new Vector3(0,water.halfBeam*3,water.halfLength*2.6*(1+speed/900)).applyQuaternion(orientation).add(new Vector3(...at)).toArray(),'geometry-derived chase framing')
    near(camera.fov,rig.baseFov,'no aircraft boost FOV')
  }
}
// Compare the actual smooth transition from Three's default 50 degrees at rest and above boost speed.
for (const body of [false,true]) {
  const traces = [0,100].map(speed => {
    const camera = new PerspectiveCamera(), rig = new CameraRig(camera), trace: number[] = []
    for (let i=0;i<12;i++) {
      const previous = camera.fov
      if (body) rig.chaseBody(TICK_DT,'speedboat',[4000,0,4000],[0,0,-speed],[0,0,0,1],0,0,worldQuery.groundHeight)
      else rig.chase(TICK_DT,'speedboat',[4000,0,4000],[0,0,-speed],new Vector3(0,0,-1),worldQuery.groundHeight)
      rig.apply(TICK_DT)
      near(camera.fov,previous+(rig.baseFov-previous)*(1-Math.exp(-TICK_DT*8)),'actual FOV interpolation')
      assert(camera.fov>previous && camera.fov<rig.baseFov,'FOV approaches base without snapping')
      trace.push(camera.fov)
    }
    return trace
  })
  assert.deepEqual(traces[0],traces[1],'boat speed must add no FOV at any transition frame')
}
console.log('PASS CameraRig identity/yaw helm and passenger eye, cockpit direction, geometry-derived chase framing and identical rest/boost-speed FOV transitions (CPU only)')

// Isolated combat fixtures deliberately position actors. Not normal-input gameplay proof.
let serial = 0
function actor(team: 0 | 1 = 0, at: Vec3 = [4000,0,4000]): VehicleEntity {
  const id = `boat-check-${serial++}`
  return {id,kind:'speedboat',team,flight:createFlightState('speedboat',{position:[...at],yaw:0,onGround:false}),hp:650,maxHp:650,seats:[id,null],aim:[null,null],weapons:createWeapons('speedboat'),flaresReadyAt:0,flareCount:0,abilityReadyAt:0,spottedUntil:0,lastDamagedBy:null,alive:true}
}
function combat() { const cs = createCombatState(); cs.ships = {}; cs.turrets = []; return cs }
const seat: SeatInput = {aim:null,firePrimary:false,fireSecondary:true,flares:false,ability:false}
setFleetState(0,2)
const shooter = actor(), state = combat(), events: GameEvent[] = []
assert(isWater(4000,4000))
for (const q of [[0,0,0,1], [0,Math.sin(.6),0,Math.cos(.6)]] as Quat[]) {
  shooter.flight.orientation = q
  for (const [yaw, elevation, wantYaw, wantEl] of [[2,.8,100*Math.PI/180,35*Math.PI/180],[-2,-.5,-100*Math.PI/180,-5*Math.PI/180],[.3,.2,.3,.2]]) {
    const aim = new Vector3(Math.sin(yaw)*Math.cos(elevation),Math.sin(elevation),-Math.cos(yaw)*Math.cos(elevation)).applyQuaternion(new Quaternion(...q)).toArray() as Vec3
    const angles = deckCannonAngles(q,aim,[0,0]); near(angles[0],wantYaw); near(angles[1],wantEl)
    const tip = new Vector3(...water.gunTip).applyAxisAngle(new Vector3(1,0,0),wantEl).applyAxisAngle(new Vector3(0,1,0),-wantYaw).add(position('cannon_pitch')).applyQuaternion(new Quaternion(...q)).add(new Vector3(...shooter.flight.position))
    near3(muzzlePosition(shooter,0,'deckcannon',[0,0,0],0,aim),tip.toArray(),'explicit aimed muzzle')
    shooter.aim[0] = aim
    near3(muzzlePosition(shooter,0,'deckcannon',[0,0,0]),tip.toArray(),'default seat aim')
  }
}
shooter.flight.orientation = [0,0,0,1]; shooter.aim[0] = [1,0,0]
applySeatInput(state,shooter,0,{...seat,aim:shooter.aim[0],firePrimary:true,fireSecondary:false},[shooter],10,events)
assert.equal(shooter.weapons[0][0].ammo,119); assert.equal(state.projectiles.length,1)
const round = state.projectiles[0], muzzle = muzzlePosition(shooter,0,'deckcannon',[0,0,0])
near3(round.velocity,[350,0,0]); near3(round.position,muzzle,'actual launch muzzle'); assert.equal(round.age,0)
assert.equal(round.owner,shooter.seats[0]); assert.equal(round.weapon,'deckcannon')
const charges = combat(), blasts: GameEvent[] = []
applySeatInput(charges,shooter,0,seat,[shooter],10,blasts)
assert.equal(shooter.weapons[0][1].ammo,3); assert.equal(charges.projectiles.length,1); assert.equal(charges.missiles.length,0)
near3(charges.projectiles[0].position,new Vector3(...water.stern).add(new Vector3(...shooter.flight.position)).toArray())
assert(isWater(charges.projectiles[0].position[0],charges.projectiles[0].position[2]))
applySeatInput(charges,shooter,0,seat,[shooter],10.5,blasts); assert.equal(shooter.weapons[0][1].ammo,3)
const enemy = actor(1,[4000,0,4007]), friend = actor(0,[4000,0,4007]), protectedEnemy = actor(1,[4000,0,4007])
markSpawned(protectedEnemy,10)
for (let i=1;i<=119;i++) stepCombat(charges,[enemy,friend,protectedEnemy],TICK_DT,10+i*TICK_DT,blasts)
assert(!blasts.some(e => e.type === 'explosion')); assert.equal(enemy.hp,650)
assert(charges.projectiles[0].position[1] < 0, 'charge must sink, not explode on water entry')
const restored = JSON.parse(JSON.stringify(charges)), restoredEvents: GameEvent[] = []
stepCombat(restored,[],TICK_DT,12,restoredEvents)
stepCombat(charges,[enemy,friend,protectedEnemy],TICK_DT,12,blasts)
assert.deepEqual(blasts.filter(e=>e.type==='explosion'),restoredEvents.filter(e=>e.type==='explosion'),'JSON projectile-state continuation')
assert.equal(charges.projectiles.length,0); assert.equal(blasts.filter(e=>e.type==='explosion' && e.surface==='water').length,1)
assert(enemy.hp < 650); assert.equal(enemy.lastDamagedBy,shooter.seats[0]); assert.equal(friend.hp,650); assert.equal(protectedEnemy.hp,650)
for(let i=1;i<=180;i++) stepCombat(charges,[],TICK_DT,12+i*TICK_DT,blasts)
assert.equal(blasts.filter(e=>e.type==='explosion').length,1); assert(!blasts.some(e=>e.type==='crater')); assert.equal(charges.missiles.length,0)
const deck = actor(0,shipToWorld(posedFleet()[0],[0,0,0])), rejected = combat()
applySeatInput(rejected,deck,0,seat,[deck],10,[])
assert.equal(deck.weapons[0][1].ammo,4); assert.equal(rejected.projectiles.length,0)
console.log('PASS isolated combat: articulated arcs/muzzle, cannon, charge cadence/sink/2s single water blast, JSON continuation, hostile/friendly/protection, deck rejection, no homing/crater')

// Permanent counterexamples from the carrier/combat fix receipts. These are positioned CPU fixtures.
function fleetCombat() {
  const cs = createCombatState()
  for (const ship of Object.values(cs.ships)) for (const turret of Object.values(ship.turrets)) turret.manned = 'fixture'
  return cs
}
for (const phase of [10.1,10.123,10.249,10.5]) {
  const v=actor(), cs=combat(), ev: GameEvent[]=[]
  for(let i=0;i<180;i++) applySeatInput(cs,v,0,{...seat,firePrimary:true,fireSecondary:false},[v],phase+i*TICK_DT,ev)
  assert.equal(120-v.weapons[0][0].ammo,12,'actual cannon rounds')
  assert.equal(cs.projectiles.length,12); assert.equal(ev.filter(e=>e.type==='fire' && e.weapon==='deckcannon').length,12,'one event per round at arbitrary trigger phase')
}
setFleetState(0,2)
const carrier=posedShip('t0-carrier')!, outward: Vec3=[Math.cos(carrier.heading),0,-Math.sin(carrier.heading)]
const nearCarrier=actor(0,shipToWorld(carrier,[40,0,0]))
nearCarrier.flight=createFlightState('speedboat',{position:nearCarrier.flight.position,yaw:carrier.heading,onGround:false})
const clearMuzzle=muzzlePosition(nearCarrier,0,'deckcannon',[0,0,0],0,outward)
assert(isWater(nearCarrier.flight.position[0],nearCarrier.flight.position[2]))
assert.equal(segmentHitsGround(clearMuzzle,clearMuzzle.map((x,i)=>x+outward[i]*20) as Vec3),null)
const clearShot=fleetCombat(), clearEvents: GameEvent[]=[]
applySeatInput(clearShot,nearCarrier,0,{...seat,aim:outward,firePrimary:true,fireSecondary:false},[nearCarrier],10.1,clearEvents)
const clearRound=clearShot.projectiles[0]; assert(clearRound); near3(clearRound.position,clearMuzzle); assert.equal(clearRound.age,0)
stepCombat(clearShot,[nearCarrier],TICK_DT,10.1,clearEvents)
assert.equal(clearShot.projectiles.length,1,'carrier behind actual muzzle must not consume outward shot')
near(clearRound.age,TICK_DT); near3(clearRound.position,clearMuzzle.map((x,i)=>x+clearRound.velocity[i]*TICK_DT),'first tick starts at actual muzzle')
const target=actor(1,clearMuzzle.map((x,i)=>x+outward[i]*20) as Vec3)
for(let i=1;i<=10;i++) stepCombat(clearShot,[nearCarrier,target],TICK_DT,10.1+i*TICK_DT,clearEvents)
assert(target.hp<target.maxHp,'legitimate target ahead still takes damage')
assert(clearEvents.some(e=>e.type==='hit' && e.target===target.id && e.by===nearCarrier.seats[0]))
for(const team of [0,1] as const) {
  setFleetState(0,2)
  const ship=posedShip(`t${team}-carrier`)!, at=shipToWorld(ship,[0,-1,-SHIP_SPECS.carrier.halfLength-1]), cs=fleetCombat(), ev: GameEvent[]=[]
  cs.projectiles.push({id:1,weapon:'depthcharge',owner:'skipper',vehicle:'released-boat',team:0,position:[...at],velocity:[0,0,0],age:0,ttl:WEAPONS.depthcharge.ttl})
  const hostile=actor(1,at), friendly=actor(0,at), protectedBoat=actor(1,at), owner=actor(1,at)
  owner.id='released-boat'; markSpawned(protectedBoat,0)
  const hp=cs.ships[ship.id].hp; let covered=false
  for(let i=1;i<=120;i++) {
    setFleetState(i*TICK_DT,2); covered ||= shipAt(at[0],at[2])?.id===ship.id
    stepCombat(cs,[hostile,friendly,protectedBoat,owner],TICK_DT,i*TICK_DT,ev)
    if(i<120) { assert.equal(cs.projectiles.length,1,'submerged charge survives crossing hull until fuse'); assert(!ev.some(e=>e.type==='explosion' || e.type==='hit' || e.type==='ship-hit')) }
  }
  assert(covered,'moving carrier must actually cross submerged release point'); assert.equal(cs.projectiles.length,0)
  assert.equal(ev.filter(e=>e.type==='explosion' && e.surface==='water').length,1)
  assert(hostile.hp<hostile.maxHp); assert.equal(hostile.lastDamagedBy,'skipper')
  for(const v of [friendly,protectedBoat,owner]) assert.equal(v.hp,v.maxHp)
  const hits=ev.filter(e=>e.type==='ship-hit'); assert.equal(hits.length,team===1?1:0)
  if(team===1) { assert.equal(hits[0].by,'skipper'); assert(hp>cs.ships[ship.id].hp); near(hp-cs.ships[ship.id].hp,cs.shipDamageBy![0]) }
  else assert.equal(cs.ships[ship.id].hp,hp)
  for(let i=121;i<=180;i++) stepCombat(cs,[],TICK_DT,i*TICK_DT,ev)
  assert.equal(ev.filter(e=>e.type==='explosion').length,1); assert(!ev.some(e=>e.type==='crater')); assert.equal(cs.missiles.length,0)
}
let intrusionCases=0
for(const id of ['t0-carrier','t1-carrier','t0-dd1']) for(const phase of [0,137,700]) for(const throttle of [-1,0,1]) {
  setFleetState(phase,2)
  const ship=posedShip(id)!, s=createFlightState('speedboat',{position:shipToWorld(ship,[0,0,-SHIP_SPECS[ship.kind].halfLength-6]),yaw:ship.heading,onGround:false})
  const navigable=()=>boatNavigable(worldQuery,s.position[0],s.position[2],yawPitchRoll(s.orientation).yaw)
  assert(navigable()); stepFlight(s,NEUTRAL_INPUT,TICK_DT,worldQuery); assert(navigable())
  const predicted=cloneFlight(s), restored=JSON.parse(JSON.stringify(s)); let firstCrash=0
  for(let i=1;i<=180;i++) {
    setFleetState(phase+i*TICK_DT,2)
    const previous=cloneFlight(s), input={...NEUTRAL_INPUT,throttle,yaw:1}
    for(const state of [s,predicted,restored]) stepFlight(state,input,TICK_DT,worldQuery)
    assert.deepEqual(s,predicted); assert.deepEqual(s,restored)
    assert(s.crashed || navigable(),'no live overlap when moving ship intrudes')
    if(s.crashed && !firstCrash) { firstCrash=i; assert.deepEqual(s.position,previous.position); assert.deepEqual(s.orientation,previous.orientation) }
  }
  assert.equal(s.crashed,'terrain'); assert(firstCrash>0 && firstCrash<=6); intrusionCases++
}
// Verify the actual room turns intrusion into one crew death/credit, not a live crashed boat.
const collisionEvents: GameEvent[]=[], collisionRoom=new RoomEngine('boat-intrusion',{...DEFAULT_ROOM_CONFIG,bots:0},{send:(_id,m)=>{if(m.type==='events')collisionEvents.push(...m.events)}})
const pilot=collisionRoom.addPlayer('pilot'), attacker=collisionRoom.addPlayer('attacker'), passenger=collisionRoom.addPlayer('passenger')
collisionRoom.handle(pilot,{type:'spawn',kind:'speedboat'})
const intruded=collisionRoom.vehicles.find(v=>v.seats[0]===pilot)!; assert(intruded)
collisionRoom.handle(passenger,{type:'board',vehicle:intruded.id,seat:1}); assert.equal(intruded.seats[1],passenger)
setFleetState(0,2)
const bowShip=posedShip('t0-carrier')!
intruded.flight=createFlightState('speedboat',{position:shipToWorld(bowShip,[0,0,-SHIP_SPECS.carrier.halfLength-6]),yaw:bowShip.heading,onGround:false})
intruded.hp--; intruded.lastDamagedBy=attacker
for(let i=0;i<30;i++) collisionRoom.advance(TICK_DT)
assert.equal(intruded.alive,false); assert.equal(intruded.hp,0); assert.equal(intruded.flight.crashed,'terrain')
assert.equal(collisionRoom.players.get(attacker)!.info.kills,1)
for(const id of [pilot,passenger]) { const p=collisionRoom.players.get(id)!.info; assert.equal(p.deaths,1); assert.equal(p.vehicleId,null); assert(p.respawnAt>collisionRoom.time) }
const kills=collisionEvents.filter(e=>e.type==='kill'); assert.equal(kills.length,3,'one broadcast per human, not repeated kills'); assert(kills.every(e=>e.victim===intruded.id && e.killer===attacker && e.weapon==='crash'))
for(const id of [pilot,attacker,passenger]) collisionRoom.removePlayer(id)
assert.equal(collisionRoom.players.size,0)
setFleetState(0,2)
console.log(`PASS fixed roots: four arbitrary-phase 12-round/12-event bursts, outward carrier muzzle first tick/target, two submerged carrier-crossing charge fuses, ${intrusionCases} moving-ship intrusions with clone/JSON parity and real room crew death/credit`)

// Reuse pilot.test.ts's lightweight event fixture. This checks Input callbacks, not DOM propagation or pointer lock.
const savedGlobals=['window','document'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const)
const win=new EventTarget(), doc=new EventTarget(), canvas={requestPointerLock(){throw new Error('fixture has no pointer lock')}}
Object.assign(doc,{pointerLockElement:null,activeElement:canvas,exitPointerLock(){}})
Object.defineProperty(globalThis,'window',{value:win,configurable:true})
Object.defineProperty(globalThis,'document',{value:doc,configurable:true})
try {
  const { Input }=await import('./src/input')
  const key=(code:string,down=true,target:any=canvas)=>{ const e=new Event(down?'keydown':'keyup',{cancelable:true}); Object.defineProperties(e,{code:{value:code},target:{value:target}}); win.dispatchEvent(e) }
  const mouse=(down:boolean,target:any=canvas)=>{ const e=new Event(down?'mousedown':'mouseup'); Object.defineProperties(e,{button:{value:0},target:{value:target}}); win.dispatchEvent(e) }
  const editing={closest:()=>({})}, aim: Vec3=[0,0,-1]
  for(const reset of ['release','focus','blur','disable','dispose']) {
    const input=new Input(canvas as unknown as HTMLCanvasElement); input.setEnabled(true); input.requestLock()
    key('KeyW'); mouse(true); assert.equal(input.flightInput(aim,false,null,{},true).throttle,1); assert.equal(input.seatInput(aim,{},true).firePrimary,true)
    if(reset==='release') { key('KeyW',false,editing); mouse(false,editing) }
    if(reset==='focus') { Object.assign(doc,{activeElement:editing}); const e=new Event('focusin'); Object.defineProperty(e,'target',{value:editing}); win.dispatchEvent(e) }
    if(reset==='blur') win.dispatchEvent(new Event('blur'))
    if(reset==='disable') input.setEnabled(false)
    if(reset==='dispose') input.dispose()
    assert.equal(input.flightInput(aim,false,null,{},true).throttle,0); assert.equal(input.seatInput(aim,{},true).firePrimary,false); assert.deepEqual(input.takeActions(),[])
    Object.assign(doc,{activeElement:canvas}); if(reset!=='dispose') input.dispose()
  }
  const input=new Input(canvas as unknown as HTMLCanvasElement); input.setEnabled(true); input.requestLock()
  key('KeyV'); key('KeyV',false); assert.equal(input.seatInput(aim,{},true).fireSecondary,true); assert.equal(input.seatInput(aim,{},true).fireSecondary,false)
  input.dispose()
} finally {
  for(const [key,descriptor] of savedGlobals) { if(descriptor) Object.defineProperty(globalThis,key,descriptor); else Reflect.deleteProperty(globalThis,key) }
}
console.log('PASS Input lightweight event fixture: editing release/focus, blur/disable/dispose clear held state, short weapon tap retains exactly one tick; no DOM propagation claim')

// Real loopback, RoomEngine spawn and held input. No assigned position, velocity or health.
const messages: ServerMessage[] = []
const room = createLoopbackRoom({...DEFAULT_ROOM_CONFIG,bots:0,listed:false},'Boat CPU check',{onMessage:m=>messages.push(m)},{manual:true})
let boat: VehicleEntity
try {
  await Promise.resolve(); room.send({type:'spawn',kind:'speedboat'})
  boat = room.engine.vehicles.find(v=>v.seats[0]===room.playerId)!
  assert(boat, 'normal boat spawn failed')
  const start = [...boat.flight.position]
  assert(boatNavigable(worldQuery,start[0],start[2],yawPitchRoll(boat.flight.orientation).yaw),'spawn hull must be open navigable water, not a carrier deck')
  near(start[1],water.waterline); near3(boat.flight.velocity,[0,0,0])
  let seq=0
  const drive = (ticks:number, input:Partial<FlightInput>={}) => {
    for(let i=0;i<ticks;i++) {
      room.send({type:'input',seq:++seq,flight:{...NEUTRAL_INPUT,...input}}); room.step(TICK_DT)
      assert(boat.alive && !boat.flight.crashed,`normal-input boat failed: ${JSON.stringify({seq,time:room.engine.time,input,position:boat.flight.position,start,crashed:boat.flight.crashed,hp:boat.hp})}`); near(boat.flight.position[1],water.waterline,'no lift')
      assert(boat.flight.position.every(Number.isFinite)); assert(boat.flight.orientation.every(Number.isFinite))
    }
  }
  drive(180,{throttle:1,pitch:1,roll:1,boost:true,aim:[0,1,0]})
  assert(new Vector3(...boat.flight.position).distanceTo(new Vector3(...start))>10,'normal input did not propel boat')
  const speed = Math.hypot(...boat.flight.velocity), coastStart = [...boat.flight.position]
  drive(30); assert(Math.hypot(...boat.flight.velocity)>0 && Math.hypot(...boat.flight.velocity)<speed)
  assert(new Vector3(...boat.flight.position).distanceTo(new Vector3(...coastStart))>1)
  // Reverse along the proven outward path before turning toward nearby carrier traffic.
  drive(180,{brake:true}); drive(60,{throttle:-1})
  assert(new Vector3(...boat.flight.velocity).dot(new Vector3(...forward(boat.flight.orientation))) < -1,`reverse must move aft: ${JSON.stringify({position:boat.flight.position,velocity:boat.flight.velocity,throttle:boat.flight.throttle,start})}`)
  drive(120,{throttle:1})
  const beforeTurn = new Quaternion(...boat.flight.orientation)
  // Turn outboard. The opposite arc crosses the advancing carrier and correctly crashes.
  drive(45,{throttle:1,yaw:-.5}); assert(beforeTurn.angleTo(new Quaternion(...boat.flight.orientation))>.1)
  assert.equal(boat.seats[1],null,'no automatic boat gunner')
  const a=cloneFlight(boat.flight), b=cloneFlight(boat.flight)
  for(let i=0;i<120;i++){ const input={...NEUTRAL_INPUT,throttle:1,yaw:.2}; stepFlight(a,input,TICK_DT,worldQuery); stepFlight(b,input,TICK_DT,worldQuery) }
  assert.deepEqual(a,b,'fixed-input replay')
  await Promise.resolve()
  assert(messages.some(m=>m.type==='snapshot' && m.vehicles.some(v=>v.kind==='speedboat')),'real wire snapshot')
} finally { room.close() }
assert.equal(room.engine.players.size,0,'loopback close removes player')
console.log('PASS real room spawn/input: water hull, propulsion/yaw/coast/reverse/no lift, replay, decoded snapshots and close')

// Actual Three/GLTFLoader/template/view through the existing Node local-file adapter pattern.
const NativeRequest=globalThis.Request, nativeFetch=globalThis.fetch, nativeProgress=globalThis.ProgressEvent
class LocalRequest extends NativeRequest { constructor(input:any,init?:any){super(typeof input==='string'?new URL(input,'http://wings.invalid').href:input,init)} }
globalThis.Request=LocalRequest
globalThis.ProgressEvent=class extends Event {constructor(type:string,init:any){super(type);Object.assign(this,init)}} as any
globalThis.fetch=async(input:any)=>{
  const url=new URL(typeof input==='string'?input:input.url)
  assert.equal(url.origin,'http://wings.invalid'); assert.equal(url.pathname,'/models/speedboat.glb')
  return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}})
}
let view: ReturnType<typeof createAircraftView> | undefined
try {
  const sourceScene = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength), '')).scene
  sourceScene.updateMatrixWorld(true)
  assert(CONFIG.speedboat,'boat render descriptor must be integrated')
  view=createAircraftView('speedboat',0,'low')
  const deadline=performance.now()+20000
  while(!view.ready && performance.now()<deadline) await delay(1)
  assert(view.ready && aircraftReady('speedboat'),'real converted template did not load')
  const model=view.root.getObjectByName('model')!, stats=aircraftStats('speedboat')!
  assert(model); assert.equal(stats.sourceMeshes,primitives.length)
  const mesh=model.children.find((o:any)=>o.isSkinnedMesh) as any; assert(mesh)
  const bone=(name:string)=>{
    const index=mesh.skeleton.bones.findIndex((b:any)=>b.name===name);assert(index>=0,name)
    assert(model.children.some((m:any)=>{const a=m.geometry?.getAttribute('skinIndex');if(!a)return false;for(let i=0;i<a.count;i++)if(a.getX(i)===index)return true;return false}),`${name}: pivot needs actual geometry`)
    return mesh.skeleton.bones[index]
  }
  const cfg=CONFIG.speedboat
  assert.deepEqual(cfg.stores.map(g=>[g.weapons,g.order]),[[[[0,1]],['charge_1','charge_2','charge_3','charge_4']]])
  assert.equal(cfg.afterburners.length,0)
  const camera=new PerspectiveCamera(), fixture=actor()
  camera.position.fromArray(fixture.flight.position); camera.updateMatrixWorld(true); view.setLocal(true)
  const update=(n=1)=>{for(let i=0;i<n;i++) view!.update(fixture,[],TICK_DT,camera);view!.root.updateMatrixWorld(true)}
  view.update(shooter,[],TICK_DT,camera)
  assert.equal(cfg.stores[0].order.filter(name=>bone(name).scale.x>.9).length,shooter.weapons[0][1].ammo,'real charge release drives stores')
  update()
  for(let ammo=4;ammo>=0;ammo--){fixture.weapons[0][1].ammo=ammo;update();assert.equal(cfg.stores[0].order.filter(name=>bone(name).scale.x>.9).length,ammo)}
  assert(cfg.pivots.includes('pilot_1'),'driver must use the standard seat-occupancy pivot')
  const pilot = bone('pilot_1'), pilotIndex = mesh.skeleton.bones.indexOf(pilot)
  const dark = new Color('#232628'); let darkVertices = 0, checkedVertices = 0, checkedSurfaces = 0, shadedVertices = 0, driverVertices = 0
  // The converter expands indexed triangles before creasing/merging. Check every vertex in that order.
  for (const batch of model.children as any[]) {
    if (batch.name !== 'toon' && batch.name !== 'glass') continue
    const material = batch.material, geometry = batch.geometry, colors = geometry.getAttribute('color')
    assert(colors && geometry.userData.sourceMeshes?.length, 'source-to-batch mapping')
    assert.equal(material.vertexColors,true); assert.equal(material.color.getHex(),0xffffff)
    assert.equal(material.colorNode,null); assert.equal(material.roughnessNode,null,'no weathering replacement of authored roughness')
    let offset = 0
    for (const name of geometry.userData.sourceMeshes) {
      const source = sourceScene.getObjectByName(name) as any; assert(source?.isMesh,name)
      const src = source.material
      for (const key of ['roughness','metalness','opacity','transparent','side','alphaTest']) assert.equal(material[key],src[key],`${name}: PBR ${key}`)
      assert.equal(material.clearcoat,src.clearcoat ?? 0,`${name}: clearcoat`)
      assert.equal(material.clearcoatRoughness,src.clearcoatRoughness ?? 0,`${name}: clearcoat roughness`)
      assert.equal(material.depthWrite,batch.name === 'glass' ? false : src.depthWrite,`${name}: depth write`)
      const expanded = source.geometry.index ? source.geometry.toNonIndexed() : source.geometry
      const ao = expanded.getAttribute('color'); assert(ao,`${name}: source AO`)
      const count = expanded.getAttribute('position').count
      let ancestor = source, isPilot = false
      while (ancestor) { if (ancestor.name === 'pilot_1') isPilot = true; ancestor = ancestor.parent }
      for (let i = 0; i < count; i++) {
        const expected = new Float32Array([src.color.r*ao.getX(i),src.color.g*ao.getY(i),src.color.b*ao.getZ(i)])
        assert.deepEqual([colors.getX(offset+i),colors.getY(offset+i),colors.getZ(offset+i)],Array.from(expected),`${name}: source base*AO vertex ${i}`)
        const expectedPoint = new Vector3().fromBufferAttribute(expanded.getAttribute('position'),i).applyMatrix4(source.matrixWorld)
        near3(new Vector3().fromBufferAttribute(geometry.getAttribute('position'),offset+i).toArray(),expectedPoint.toArray(),`${name}: baked vertex`)
        if (ao.getX(i) < .98) shadedVertices++
        if (Math.max(Math.abs(src.color.r-dark.r),Math.abs(src.color.g-dark.g),Math.abs(src.color.b-dark.b)) < 1e-6) darkVertices++
        if (isPilot) {
          assert.equal(geometry.getAttribute('skinIndex').getX(offset+i),pilotIndex,`${name}: bound to authoritative skipper pivot`)
          near(geometry.getAttribute('skinWeight').getX(offset+i),1,`${name}: rigid driver weight`); driverVertices++
        } else if (name.startsWith('helm_wheel')) assert.equal(geometry.getAttribute('skinIndex').getX(offset+i),0,'wheel is fixed, not hidden with driver')
      }
      offset += count; checkedVertices += count; checkedSurfaces++
      if (expanded !== source.geometry) expanded.dispose()
    }
    assert.equal(offset,colors.count,'all batch vertices checked, including material-zone splits')
  }
  assert(darkVertices>100,'actual dark wet-gelcoat source must survive base*AO conversion')
  assert(shadedVertices>100,'nontrivial AO must survive conversion')
  assert.equal(driverVertices,driverTriangles*3,'every expanded driver triangle must bind to pilot_1')
  // Use real spawn/switch-seat messages, not a static decoration or assigned occupancy fixture.
  const crewRoom = createLoopbackRoom({...DEFAULT_ROOM_CONFIG,bots:0,listed:false},'Boat crew CPU check',{onMessage(){}},{manual:true})
  try {
    await Promise.resolve(); crewRoom.send({type:'spawn',kind:'speedboat'})
    const crewBoat = crewRoom.engine.vehicles.find(v => v.seats[0] === crewRoom.playerId)!
    assert(crewBoat,'real occupied boat spawn'); assert.equal(VEHICLES.speedboat.seatNames[0],'Skipper')
    const crewUpdate = () => { view!.update(crewBoat,[],TICK_DT,camera); view!.root.updateMatrixWorld(true) }
    crewUpdate(); near3(pilot.scale.toArray(),[1,1,1],'occupied skipper shown')
    crewRoom.send({type:'switch-seat',seat:1}); crewRoom.step(TICK_DT)
    assert.deepEqual(crewBoat.seats,[null,crewRoom.playerId]); crewUpdate()
    assert(pilot.scale.toArray().every((v: number) => v > 0 && v < 1e-3),'vacant skipper hidden despite occupied passenger')
    crewRoom.send({type:'switch-seat',seat:0}); crewRoom.step(TICK_DT)
    assert.deepEqual(crewBoat.seats,[crewRoom.playerId,null]); crewUpdate()
    near3(pilot.scale.toArray(),[1,1,1],'skipper shown again after authoritative seat transition')
  } finally { crewRoom.close() }
  assert.equal(crewRoom.engine.players.size,0,'crew room cleanup')
  update()
  sourceScene.traverse((o: any) => { if(o.isMesh) {o.geometry.dispose(); for(const m of Array.isArray(o.material)?o.material:[o.material]) m.dispose()} })
  console.log(JSON.stringify({stage:'source-surfaces-and-crew',checkedSurfaces,checkedVertices,shadedVertices,driverVertices}))
  for(const aim of [[1,1,1],[-1,-1,1],[0,0,-1]] as Vec3[]){
    fixture.aim[0]=aim; update(180)
    const gun=view.anchors.get('gun');assert(gun)
    near3(gun.getWorldPosition(new Vector3()).toArray(),muzzlePosition(fixture,0,'deckcannon',[0,0,0]),'render/combat muzzle')
    const direction=new Vector3(0,0,-1).applyQuaternion(bone('cannon_pitch').getWorldQuaternion(new Quaternion()))
    near3(direction.toArray(),weaponDirection(fixture,'deckcannon',aim,[0,0,0]),'render/combat turret direction')
  }
  const props=['prop_L','prop_R'].map(bone), idle=props.map(p=>p.quaternion.clone())
  const wakes=['wake_L_foam','wake_R_foam'].map(name=>{const o=view!.root.getObjectByName(name);assert(o,name);return o})
  update(60);props.forEach((p,i)=>near(p.quaternion.angleTo(idle[i]),0,'idle prop'))
  assert(wakes.every(w=>!w.visible),'idle wake must be hidden')
  fixture.flight.throttle=1; fixture.flight.velocity=[0,0,-12]; update(60)
  assert(props.every((p,i)=>p.quaternion.angleTo(idle[i])>.01),'moving props')
  assert(wakes.every(w=>w.visible),'moving water wake')
  for(const w of wakes) near(w.getWorldPosition(new Vector3()).y,.04,'wake at sea level')
  fixture.flight.throttle=0;fixture.flight.velocity=[0,0,0];update(60)
  assert(wakes.every(w=>!w.visible),'stopped wake cleanup')
  fixture.flight.velocity=[0,0,-12];fixture.flight.position[1]=5;update()
  assert(wakes.every(w=>!w.visible),'airborne wake must be hidden')
  fixture.flight.position[1]=0;update();assert(wakes.every(w=>w.visible))
  fixture.alive=false;update();assert.equal(view.root.visible,false);assert(wakes.every(w=>!w.visible),'death wake cleanup')
  console.log(JSON.stringify({stage:'converted',stats,darkVertices}))
} finally {
  view?.dispose(); if(view)assert.equal(view.root.children.length,0,'view disposal')
  globalThis.Request=NativeRequest;globalThis.fetch=nativeFetch;globalThis.ProgressEvent=nativeProgress
}
// Keep the existing hangar slots and original weapon fits intact.
assert.deepEqual(VEHICLE_KINDS.slice(0,7),['fighter','apache','warthog','blackbird','bomber','f15','f35'])
assert.deepEqual(VEHICLE_KINDS.slice(0,7).map(k=>[VEHICLES[k].cruise,VEHICLES[k].boost]),[[135,185],[75,98],[105,135],[190,260],[150,180],[155,215],[130,180]])
assert.deepEqual(VEHICLE_KINDS.slice(0,7).map(k=>VEHICLES[k].seatWeapons),[
  [['cannon20','aim9'],['tvmissile',null]],[['rockets',null],['chaingun30','hellfire']],
  [['gau8','rockets'],['maverick',null]],[[null,null],['aim47','radarpulse']],[['bomb',null],['bomb',null]],
  [['cannon20','aim9'],['maverick',null]],[['cannon20','tvmissile'],['tvmissile',null]],
])
assert(VEHICLE_KINDS.slice(0,5).every(k=>VEHICLES[k].hardpoints===undefined && VEHICLES[k].water===undefined))
console.log('PASS boat CPU check. Native interactive play, rendered pixels, GPU budgets and full original-seven flight equivalence are NOT claimed. Wake checks cover CPU visibility and cleanup only.')
