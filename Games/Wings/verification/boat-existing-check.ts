// CPU integration of the existing committed asset, not candidate geometry or native acceptance.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'
import { PerspectiveCamera, Vector3 } from 'three'
import { CONFIG, createAircraftView, aircraftStats } from './src/render/aircraft'
import { createLoopbackRoom } from './src/sim/loopback'
import { DEFAULT_ROOM_CONFIG } from './src/sim/protocol'
import { VEHICLES, VEHICLE_KINDS } from './src/sim/vehicles'
import { NEUTRAL_INPUT, boatNavigable, yawPitchRoll } from './src/sim/flight'
import { worldQuery } from './src/sim/geography'
import { TICK_DT, type GameEvent } from './src/sim/types'
const bytes=readFileSync(process.argv[2] ?? 'Games/Wings/models/speedboat.glb')
assert.equal(bytes.length,1069292)
assert.equal(createHash('sha256').update(bytes).digest('hex'),'1f0eae7f3b962669c2f95f1ce52e3f27cce008595f4875bae41e9274b24da65a')
const gltf=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)).toString())
assert(!gltf.nodes.some((n:any)=>n.name==='pilot_1'),'existing old model must not be silently replaced')
assert.equal(VEHICLES.speedboat.model,'models/speedboat.glb')
assert.deepEqual(VEHICLE_KINDS,['fighter','apache','warthog','blackbird','bomber','f15','f35','speedboat'])
const native={Request:globalThis.Request,fetch:globalThis.fetch,ProgressEvent:globalThis.ProgressEvent}
globalThis.Request=class extends native.Request { constructor(input:any,init?:any){super(typeof input==='string'?new URL(input,'http://wings.invalid').href:input,init)} }
globalThis.ProgressEvent=class extends Event {constructor(type:string,init:any){super(type);Object.assign(this,init)}} as any
globalThis.fetch=async(input:any)=>{
 const url=new URL(typeof input==='string'?input:input.url)
 assert.equal(url.origin,'http://wings.invalid');assert.equal(url.pathname,'/models/speedboat.glb')
 return new Response(bytes,{headers:{'Content-Length':String(bytes.length)}})
}
const view=createAircraftView('speedboat',0,'low'), camera=new PerspectiveCamera()
const events: GameEvent[]=[]
const room=createLoopbackRoom({...DEFAULT_ROOM_CONFIG,bots:0,listed:false},'Existing boat CPU',{onMessage(m){if(m.type==='events')events.push(...m.events)}},{manual:true})
try {
 const until=performance.now()+20000
 while(!view.ready && performance.now()<until)await delay(1)
 assert(view.ready,'existing GLB converter must become ready')
 const model=view.root.getObjectByName('model')!
 assert(model)
 const mesh=model.children.find((o:any)=>o.isSkinnedMesh) as any
 assert(mesh && !mesh.skeleton.bones.some((b:any)=>b.name==='pilot_1'),'converter must not fabricate absent driver bone')
 await Promise.resolve();room.send({type:'spawn',kind:'speedboat'})
 const boat=room.engine.vehicles.find(v=>v.seats[0]===room.playerId)!
 assert(boat)
 const start=[...boat.flight.position], waterline=VEHICLES.speedboat.water!.waterline
 assert(boatNavigable(worldQuery,start[0],start[2],yawPitchRoll(boat.flight.orientation).yaw))
 const update=()=>{camera.position.fromArray(boat.flight.position);camera.updateMatrixWorld(true);view.update(boat,[],TICK_DT,camera);view.root.updateMatrixWorld(true)}
 let seq=0
 const drive=(n:number,flight:any={})=>{for(let i=0;i<n;i++){
  room.send({type:'input',seq:++seq,flight:{...NEUTRAL_INPUT,...flight}});room.step(TICK_DT);update()
  assert(boat.alive && !boat.flight.crashed);assert.equal(boat.flight.position[1],waterline)
 }}
 drive(180,{throttle:1,pitch:1,roll:1,boost:true,aim:[0,1,0]})
 assert(new Vector3(...boat.flight.position).distanceTo(new Vector3(...start))>10)
 const speed=Math.hypot(...boat.flight.velocity)
 drive(30);assert(Math.hypot(...boat.flight.velocity)>0 && Math.hypot(...boat.flight.velocity)<speed)
 drive(180,{brake:true});drive(60,{throttle:-1});drive(120,{throttle:1});drive(45,{throttle:1,yaw:-.5})
 const fire=(primary:boolean,secondary:boolean)=>{room.send({type:'input',seq:++seq,flight:NEUTRAL_INPUT,seat:{aim:null,firePrimary:primary,fireSecondary:secondary,flares:false,ability:false}});room.step(TICK_DT);update()}
 assert.equal(boat.weapons[0][0].ammo,120);fire(true,false);assert.equal(boat.weapons[0][0].ammo,119)
 assert(room.engine.combat.projectiles.some(p=>p.weapon==='deckcannon' && p.owner===room.playerId))
 fire(false,false);assert.equal(boat.weapons[0][1].ammo,4);fire(false,true);assert.equal(boat.weapons[0][1].ammo,3)
 assert(room.engine.combat.projectiles.some(p=>p.weapon==='depthcharge' && p.owner===room.playerId))
 fire(false,false)
 for(let i=0;i<120;i++) {room.step(TICK_DT);update()}
 assert(!room.engine.combat.projectiles.some(p=>p.weapon==='depthcharge'))
 await Promise.resolve() // Loopback delivers its queued protocol messages in a microtask.
 assert(events.some(e=>e.type==='fire' && e.weapon==='deckcannon'))
 assert(events.some(e=>e.type==='fire' && e.weapon==='depthcharge'))
 assert(events.some(e=>e.type==='explosion' && e.surface==='water'))
 assert.equal(boat.seats[1],null)
 room.send({type:'switch-seat',seat:1});room.step(TICK_DT);update()
 assert.deepEqual(boat.seats,[null,room.playerId])
 room.send({type:'switch-seat',seat:0});room.step(TICK_DT);update()
 assert.deepEqual(boat.seats,[room.playerId,null])
 const gun=view.anchors.get('gun')!;assert(gun)
 assert(gun.getWorldPosition(new Vector3()).toArray().every(Number.isFinite))
 console.log(JSON.stringify({stage:'existing-asset',sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,driverNode:false,driverBone:false,stats:aircraftStats('speedboat'),anchors:[...view.anchors.keys()]}))
 console.log('PASS existing-model CPU loader/converter and real room held-input propulsion/coast/brake/reverse/turn/no-lift; both authoritative seat transitions update without absent-pilot crash; no roof/driver/candidate/native/render acceptance')
} finally {
 room.close();view.dispose();Object.assign(globalThis,native)
 assert.equal(room.engine.players.size,0);assert.equal(view.root.children.length,0)
}
