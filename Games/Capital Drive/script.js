import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from '../../assets/car-arcade/models.js';
import { createSimulation, projectSegment } from './simulation.js';
import { createWorldView } from './world-view.js';
import { findRoute } from './navigation.js';
import {createRouteGuidance} from './navigation-guidance.js';
import {createTrafficLightsView} from './traffic-lights-view.js';
import {createEquipment} from './equipment.js';
import {createEquipmentView} from './equipment-view.js';
import { createPedestrians } from './pedestrians.js';
import { createNeighbourhoodDetails } from './neighbourhood.js';
import { createMapProjection, mapPointFromClient } from './map-projection.js';
import { createGameplay } from './gameplay.js';
import { createProgression } from './progression.js';
import { createActorView } from './actor-view.js';
import { createStreetUI } from './street-ui.js';
import { createAddressSearch } from './address-search.js';
import { LANDMARKS, LANDMARK_CLEARINGS, replacedBuildingIds,POOL_BARRIERS,POOL_GATE_APPROACHES,MANUKA_POOL_BASIN } from './landmarks.js';
import { createLandmarksView } from './landmarks-view.js';
import {applyRoadProfiles,roadProfile} from './road-network.js';
import {createBuses} from './buses.js';
import {createBusView} from './bus-view.js';
import {createVehicleOccupantsView} from './vehicle-occupants-view.js';
import {createServicesView} from './services-view.js';
import {MAPPED_STORES} from './stores.js';
import {createStorefrontsView} from './storefronts-view.js';
import {createTrafficView} from './traffic-view.js';
import {createNoodleShopView,NOODLE_SHOP_ID} from './noodle-shop-view.js';
import {SHOPPING_BUILDING_IDS} from './shopping-precincts.js';
import {createShoppingView,SHOPPING_CLEARINGS} from './shopping-view.js';
import {CAMPUS_BARRIERS,CAMPUS_BUILDING_IDS,CAMPUS_GATES} from './campus.js';
import {createCampusView} from './campus-view.js';
import {createInteriors,createGymEntry} from './interiors.js';
import {createInteriorActivities} from './interior-activities.js';
import {createInteriorPeople} from './interior-people.js';
import {createInteriorPeopleView} from './interior-people-view.js';
import {createMicromobility} from './micromobility.js';
import {WEAPONS,weaponById} from './weapons.js';
import {createStreetDealers} from './street-dealers.js';
import {createStreetDealersView} from './street-dealers-view.js';
import {generateParkedCars} from './parking-layout.js';
import {createRideService} from './ride-service.js';
import {createRideServiceView} from './ride-service-view.js';
import {createVehicleChallenge} from './vehicle-challenges.js';
import {createMicromobilityView} from './micromobility-view.js';
import {EXTRA_STORES,SKATEPARK_LANDMARK,SKATE_BUILDING_OPENING,BARRIERS as SKATE_BARRIERS,skateHeightOffset} from './civic-extras.js';
import {createCivicExtrasView} from './civic-extras-view.js';
import {GENERIC_SERVICES} from './services.js';
import {createInteriorView} from './interior-view.js';
import {createCampaign} from './campaign.js';
import {applyMapExpansion,expansionPlaces} from './map-expansion.js';
import {createTerrainSampler} from './terrain.js';
import {createCivicView,CIVIC_BUILDING_IDS,CIVIC_LANDMARKS,CIVIC_INTERIOR_ENTRIES} from './civic-view.js';

const ALL_STORES=[...MAPPED_STORES,...EXTRA_STORES];
const $ = id => document.getElementById(id);
const keys = new Set(), touch = new Set();
const dialogs = [...document.querySelectorAll('dialog')];
const SAVE_KEY = 'capital-drive-v1';
const CAREER_KEY = 'capital-drive-career-v1';
const vehicles = [
  { id: 'lantern', name: 'Neighbourhood saloon', note: 'Everyday four-door', label: 'SALOON' },
  { id: 'orchard', name: 'Family wagon', note: 'Room for the long weekend', label: 'WAGON' },
  { id: 'gravel', name: 'Suburban SUV', note: 'A familiar sight in the inner south', label: 'SUV' },
  { id: 'relay', name: 'Executive tourer', note: 'A little more presence', label: 'TOURER' },
  { id: 'atlas', name: 'Weekend ute', note: 'Practical, with some attitude', label: 'UTE' },
  { id: 'finch', name: 'City hatchback', note: 'Small and nimble', label: 'HATCH' },
];
let map, simulation, world, renderer, scene, camera, playerMesh, route = [], destination = null;
let streetDealers,dealerView;
let rideService,rideView;
let signalsView,equipment,equipmentView;
const guidance=createRouteGuidance();
let guidanceRoute=null,guideState=null,followYoober=false;
let trafficView,storefrontsView,shoppingView,campusView,civicView,noodleShopView,civicExtrasView;
let interiors,interiorScene,interiorView,indoorActorView,campaign,terrainSampler,gymEntry;
let activities=createInteriorActivities(),roomPeople=createInteriorPeople(),roomPeopleView,micromobility,microView;
const miniKeys=new Set();
const rentalHack=createVehicleChallenge();
let rentalHackTarget=null,cueStamp='';
let parkedChunks = [], selectedCar = 'lantern', selectedPaint = '#e7e6df';
let quality = 'low', started = false, disposed = false, lastTime = 0, accumulator = 0, lastRender = 0, hudTime = 0;
let orbit = 0, orbitHeight = 0, orbitHold = 0, dragging = false, pointer = null, toastTimer;
let lookPitch = 0;
let discovered = new Set(), mapImage, mapScale, savedError = '', routeClock = 0, audio = null;
let cameraReady = false, raf = 0, frameCount = 0;
let compatibility = false;
const parkedResources = [];
let pedestrians, neighbourhood;
let gameplay, progression, actorView, landmarkView, streetUI, addressSearch;
let buses,busView,occupantsView,servicesView,previousActorMode='vehicle';
let gameMode = 'street', selectedGameMode = 'street', careerError = '', footCameraYaw = 0;
let mouseAim = false, mouseFire = false, lastJobTarget = '';
const actionTouch = new Set(), abandonedMeshes = new Map();
const parkedInstanceRecords = [];
const parkedSourceCars = [];
let carShadowGeometry, carShadowMaterial;
let mapSelection = null, mapDrag = null;
const mapView = { zoom: 1, x: null, z: null };
const pedestrianFocus={id:'player',x:0,z:0,yaw:0,speed:0};
const occupantPoses=new Map(),occupantInputs=[];
const desiredCamera = new THREE.Vector3(), lookTarget = new THREE.Vector3();
function freezeCopy(value) {
  const copy = JSON.parse(JSON.stringify(value));
  const freeze = object => { if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); } return object; };
  return freeze(copy);
}
document.body.classList.add('intro-open');

function notify(message) {
  $('toast').textContent = message; $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4200);
}
function loadProgress() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return;
    if (raw.length > 4096) throw new Error('Saved data is too large.');
    const save = JSON.parse(raw);
    if (save.version !== 1 || !Array.isArray(save.discovered) || save.discovered.length > map.landmarks.length ||
        save.discovered.some(id => !map.landmarks.some(p => p.id === id))) throw new Error('Unrecognised saved progress.');
    discovered = new Set(save.discovered);
  } catch (error) {
    savedError = `Progress could not be loaded: ${error.message} This drive will not overwrite it.`;
    $('save-status').textContent = savedError;
  }
}
function saveProgress() {
  if (savedError) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 1, discovered: [...discovered] })); }
  catch (error) { savedError = `Progress could not be saved: ${error.message}`; $('save-status').textContent = savedError; notify('Browser storage is unavailable. You can keep driving.'); }
}
function paused() { return !started || dialogs.some(dialog => dialog.open) || document.hidden; }
function liveTracking(){return started&&!document.hidden&&followYoober&&$('map-dialog').open&&!!rideService?.activeFare&&!!rideService.vehicles[0].active;}
function clearInput() { miniKeys.clear();keys.clear(); touch.clear(); actionTouch.clear(); mouseAim = false; mouseFire = false; dragging = false; pointer = null; mapDrag = null; }
const isSandbox = () => gameMode === 'free';
const focus = () => gameplay ? gameplay.focus() : simulation.player;
function careerContext() {
  const state = gameplay.state;
  return { pose: focus(), onFoot: state.mode === 'foot'&&!state.passenger, vehicle: { ...state.vehicle },
    wanted: state.wanted, vehicleHealth: state.vehicleHealth, respawnSerial: state.respawnSerial,
    health:state.health,weapon:state.weapon,reserveAmmo:state.reserveAmmo,ammunition:Object.fromEntries(WEAPONS.map(w=>[w.id,gameplay.getAmmo(w.id)])),recovering:!!state.recovery,sandbox:isSandbox(),campaign:gameMode==='campaign',interior:interiorContext() };
}
function rideContext(){
  return {pose:focus(),onFoot:gameplay.state.mode==='foot',sandbox:isSandbox(),wanted:gameplay.state.wanted,
    recovering:!!gameplay.state.recovery,indoors:!!interiors.active,
    busy:!!(progression.state.activeJob||progression.state.activity||campaign.state.active||micromobility.snapshot().active||streetChallenge()||activities.snapshot().active||buses?.passenger)};
}
function busContext(){const context=rideContext();return {...context,busy:!!(progression.state.activeJob||progression.state.activity||campaign.state.active||micromobility.snapshot().active||streetChallenge()||activities.snapshot().active||rideService?.activeFare)};}
function rideTracking(){
  if(!rideService?.activeFare||!rideService.vehicles[0].active)return {following:false,car:null,distance:null,eta:null};
  const state=rideService.snapshot(),car=state.car,target=state.passenger?state.dropoff:state.pickup;
  let best=null,total=0;
  const legs=state.route.map(id=>simulation.graph.edges[id]).filter(Boolean);
  for(let i=0;i<legs.length;i++){
    const edge=legs[i],at=Math.max(0,Math.min(edge.length,(car.x-edge.from.x)*edge.dx+(car.z-edge.from.z)*edge.dz));
    const x=edge.from.x+edge.dx*at+edge.dz*edge.laneOffset,z=edge.from.z+edge.dz*at-edge.dx*edge.laneOffset;
    const gap=Math.hypot(car.x-x,car.z-z);
    if(!best||gap<best.gap)best={gap,at,index:i};
  }
  if(best){for(let i=best.index;i<legs.length;i++)total+=legs[i].length;total-=best.at;if(target&&legs.at(-1)?.id===target.edgeId)total-=legs.at(-1).length-target.at;}
  else if(target)total=Math.hypot(car.x-target.x,car.z-target.z);
  return {following:followYoober,car:{x:car.x,z:car.z,yaw:car.yaw},phase:state.phase,distance:Math.max(0,Math.round(total)),eta:Math.ceil(Math.max(0,total)/6)};
}
function trackYoober(){
  if(!rideService?.activeFare)return;
  followYoober=true;const car=rideService.vehicles[0];mapView.x=car.x;mapView.z=car.z;mapView.zoom=6;
  $('map-zoom-level').textContent='6×';openDialog('map-dialog');
}
function updateNavigation(){
  if(guidanceRoute!==route){guidance.setRoute(route,destination);guidanceRoute=route;}
  guideState=guidance.update(focus());
  $('navigation-hud').hidden=!guideState||!destination||!!interiors.active||!started;
  if(guideState){
    const distance=guideState.distance>=1000?`${(guideState.distance/1000).toFixed(1)} km`:`${Math.max(0,Math.round(guideState.distance/5)*5)} m`;
    $('navigation-distance').textContent=distance;
    $('navigation-instruction').textContent=guideState.offRoute?'Rejoin the route':({left:'Turn left',right:'Turn right',uturn:'Make a U-turn',straight:'Continue',arrive:'Destination'}[guideState.kind]);
    const paths={right:'M12 42 V23 Q12 12 23 12 H39 M29 3 L39 12 L29 21',left:'M36 42 V23 Q36 12 25 12 H9 M19 3 L9 12 L19 21',uturn:'M36 42 V17 Q36 5 24 5 Q12 5 12 17 V28 M3 19 L12 28 L21 19',straight:'M24 43 V6 M12 18 L24 6 L36 18',arrive:'M12 42 V6 H36 V24 H12'};
    $('navigation-symbol').setAttribute('d',paths[guideState.kind]||paths.straight);
  }
  const tracking=rideTracking();
  $('yoober-follow-map').hidden=!tracking.car;
  $('yoober-track-state').hidden=!tracking.car;
  if(tracking.car){
    $('yoober-track-state').textContent=tracking.phase==='waiting'?'Yoober at pickup':`${liveTracking()?'Live Yoober':'Yoober'} · ${tracking.distance} m · ~${Math.max(1,Math.ceil(tracking.eta/60))} min`;
    if(liveTracking()){mapView.x=tracking.car.x;mapView.z=tracking.car.z;}
  }
}
const emptyView=()=>({update(){},dispose(){},stats:{}});
function moveBody(actor,dx,dz,radius=.45){
  const clip=interiors?.active?roomPeople.clipMovement(actor,dx,dz,radius):pedestrians?.clipMovement(actor,dx,dz,radius)||{dx,dz,blocked:false};
  const contact=!interiors?.active?streetDealers?.clipMovement(actor,clip.dx,clip.dz,radius)||clip:clip;
  const driverContact=!interiors?.active?rideService?.clipMovement(actor,contact.dx,contact.dz,radius)||contact:contact;
  const result=interiors?.active?interiors.moveActor(actor,driverContact.dx,driverContact.dz,radius):simulation.moveActor(actor,driverContact.dx,driverContact.dz,radius);
  return {...result,blocked:result.blocked||clip.blocked||contact.blocked||driverContact.blocked};
}
function servicePosition(site){
  const plan=interiors?.active;
  if(site.type==='gym'){
    if(plan?.serviceId===site.id){
      if(activities.nearest(focus())?.kind==='bench'||progression?.state.activity?.type==='workout')return {x:plan.exercise.approachX,z:plan.exercise.approachZ,radius:1.6};
      return {...plan.counter,radius:plan.counter.radius};
    }
    if(gymEntry)return {x:gymEntry.x-Math.sin(gymEntry.yaw)*2,z:gymEntry.z-Math.cos(gymEntry.yaw)*2};
  }
  if(plan?.storeId===site.id&&progression?.state.activity?.type==='work'){const {x,z,yaw,radius}=progression.state.activity.station;return {x,z,yaw,radius};}
  return plan?.storeId===site.id?{...plan.counter,radius:plan.counter.radius}:null;
}
function miniInput(){return {x:keys.has('KeyX')||miniKeys.has('x'),y:keys.has('KeyY')||miniKeys.has('y'),up:keys.has('ArrowUp')||miniKeys.has('up')};}
function stopMini(){activities.cancel();rentalHack.cancel();rentalHackTarget=null;gameplay?.cancelCarjacking();progression?.cancelActivity();clearInput();}
function beginMini(id){
  if(!interiors?.active||paused()||activities.snapshot().active)return;
  const station=id?interiors.active.activities.find(s=>s.id===id):activities.nearest(focus());
  if(!station){notify('Walk to an activity station.');return;}
  if(station.kind==='bench'&&!isSandbox()&&progression.state.fitnessLevel<3){
    const result=progression.startActivity('kingston-gym','workout',careerContext());
    if(!result.ok){notify(result.message);return;}
  }
  if(!activities.start(station.id,careerContext())){progression.cancelActivity();notify('Move closer and lose the police first.');return;}
  if(!isSandbox()&&interiors.active.storeId&&['noodle','stock'].includes(station.kind)){
    const shift=progression.startShift(interiors.active.storeId,careerContext());
    if(!shift.ok){activities.cancel();notify(shift.message);return;}
    notify(shift.message);
  }else notify(station.label);
  clearInput();
}
function streetChallenge(){
  const hack=rentalHack.snapshot();
  if(hack.active)return {...hack,label:'Bypass scooter lock'};
  const theft=gameplay?.state.carjacking;
  if(theft)return {...(theft.challenge||{}),active:true,kind:'car',label:'Take vehicle',
    prompt:theft.phase==='waiting'?'Stay beside the car while the driver stops.':theft.challenge?.prompt,
    progress:theft.progress,remaining:theft.challenge?.remaining||8-theft.waited};
  return null;
}
function beginRentalHack(offer){
  if(gameplay.state.passenger)return;
  if(!started||interiors.active||activities.snapshot().active||rentalHack.snapshot().active||gameplay.state.carjacking)return;
  const checked=micromobility.validateStart('scooter',{pose:focus(),onFoot:gameplay.state.mode==='foot',recovering:!!gameplay.state.recovery,assetId:offer.id,moveActor:moveBody});
  if(!checked.ok){notify(checked.reason);return;}
  if(!visible(focus(),checked.offer)){notify('Move into clear view of the scooter.');return;}
  rentalHack.clear();rentalHack.drainEvents();rentalHackTarget={...checked.offer};
  rentalHack.start('scooter',{targetId:offer.id,anchor:checked.offer,sandbox:isSandbox()});
  closeDialogs();clearInput();notify('Match the sequence to bypass the lock.');
}
function updateRentalHack(dt){
  const state=rentalHack.snapshot();
  if(state.active){
    const asset=micromobility.offers(focus()).find(a=>a.id===state.targetId);
    const valid=!!asset?.available&&asset.distance<=2.8&&gameplay.state.mode==='foot'&&!gameplay.state.recovery&&!interiors.active&&!gameplay.state.carjacking&&visible(focus(),asset);
    rentalHack.step(dt,miniInput(),{valid,sandbox:isSandbox()});
  }
  for(const event of rentalHack.drainEvents()){
    const terminal=rentalHack.snapshot();
    if(event.sessionId!==terminal.sessionId||event.targetId!==terminal.targetId)continue;
    if(event.type==='complete'&&terminal.phase==='complete'&&rentalHackTarget?.id===event.targetId&&event.sessionId===terminal.sessionId&&event.sandbox===isSandbox()){
      const result=micromobility.claimStolen(event.targetId,{permit:terminal,pose:gameplay.state.actor,onFoot:gameplay.state.mode==='foot',recovering:!!gameplay.state.recovery,moveActor:moveBody});
      if(result.ok){gameplay.reportOffence('scooter theft',1,{point:focus()});cameraReady=false;notify('Lock bypassed. WASD rides; S brakes; E dismounts.');}
      else notify(result.reason);
    }else if(event.type==='failed')notify(event.reason);
    rentalHackTarget=null;clearInput();
  }
}
function renderSequence(state){
  const sequence=state.sequence||[],index=state.index||0;
  const stamp=[state.kind,state.phase,index,state.expectedKey,sequence.join(','),state.active].join('|');
  if(stamp!==cueStamp){
    cueStamp=stamp;$('activity-sequence').replaceChildren();
    sequence.forEach((key,i)=>{const tile=document.createElement('kbd');tile.textContent={x:'X',y:'Y',up:'↑'}[key]||key;tile.dataset.key=key;
      tile.className=i<index?'done':i===index?'current':'upcoming';if(i===index)tile.setAttribute('aria-current','step');$('activity-sequence').append(tile);});
    $('activity-cue').textContent=!state.active?'':state.requiresGrip&&state.phase==='grip'?'HOLD X + Y':state.memorising?'READ THE SEQUENCE':state.phase==='lift'?'HOLD X + Y':state.phase==='prepare'?'WAIT':state.expectedKey?`PRESS ${{x:'X',y:'Y',up:'↑'}[state.expectedKey]}`:state.kind==='rest'?'REST':'WAIT';
    $('activity-cue').dataset.ready=String(state.phase==='cue'||state.acceptsInput===true);
    $('activity-grip').textContent=state.requiresGrip?'Keep X + Y held':'';
  }
  $('activity-window').hidden=!state.active||!state.cueWindow||state.phase!=='cue';
  $('activity-window').max=state.cueWindow||1;$('activity-window').value=state.cueRemaining||0;
}
function updateMini(){
  for(const event of activities.drainEvents()){
    if(event.kind==='bench'&&progression.state.activity?.type==='workout'){
      const result=progression.finishWorkout(careerContext(),event.type==='complete');
      if(result.ok)saveCareer();
    }
    if(progression.state.activity?.type==='work'&&event.sessionId===progression.state.activity.sessionId&&event.planId===progression.state.activity.planId){
      const result=progression.finishShift(careerContext(),event.type==='complete');
      if(result.ok)saveCareer();
    }
    if(event.type==='complete'&&event.heal&&!isSandbox())gameplay.heal(event.heal);
    if(event.type==='complete'||event.type==='failed')notify(event.reason);
  }
  const street=streetChallenge(),state=street||activities.snapshot(),nearest=interiors?.active&&activities.nearest(focus());
  $('activity-panel').hidden=!street&&(!interiors?.active||(!state.kind&&!nearest));
  renderSequence(state);
  $('activity-title').textContent=state.active||state.kind?state.label:nearest?.label||'';
  $('activity-prompt').textContent=street?(state.sequence?.length?'Release between presses. E cancels.':state.prompt):state.kind?state.prompt:'Q or Play starts this activity.';
  $('activity-progress').hidden=!!street;
  $('activity-progress').value=state.progress||0;
  $('activity-score').textContent=street?`${state.index||0}/${state.sequence?.length||8} · ${state.mistakes||0}/${state.maxMistakes||2} mistakes`:state.kind?`${state.score} points${state.kind==='bench'?` · ${state.reps}/6 reps`:''}`:'';
  $('activity-start').textContent=!isSandbox()&&interiors?.active?.storeId&&['noodle','stock'].includes(nearest?.kind)?`Work · +$${nearest.kind==='noodle'?60:45}`:'Play';
  $('activity-start').hidden=state.active;$('activity-start').disabled=!nearest;
  $('activity-cancel').hidden=!state.active;
  for(const b of document.querySelectorAll('[data-mini]'))b.disabled=!state.active;
}
$('activity-start').addEventListener('click',()=>{renderer.domElement.focus();beginMini();});
$('activity-cancel').addEventListener('click',stopMini);
for(const button of document.querySelectorAll('[data-mini]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);miniKeys.add(button.dataset.mini);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>miniKeys.delete(button.dataset.mini));
}
function openPhone(){
  if(!started)return;
  renderYoober();
  const state=micromobility.snapshot(),offers=micromobility.offers(focus()).slice(0,8);
  $('rental-offers').closest('details').open=!!state.active||(offers[0]?.distance<=5);
  $('rental-status').textContent=state.active?'S to brake, then end your ride.':'Nearby Lemon rides. Scooter $20 · e-bike $30. A scooter lock can also be hacked.';
  $('rental-offers').replaceChildren();
  for(const offer of offers){
    const row=document.createElement('div'),b=document.createElement('button'),routeButton=document.createElement('button');
    row.className='rental-offer';
    b.textContent=`Hire ${offer.kind==='bike'?'e-bike':'scooter'} · $${offer.price} · ${Math.round(offer.distance)} m`;
    b.disabled=!offer.available||offer.distance>2.8||!!state.active||gameplay.state.mode!=='foot'||gameplay.state.passenger||!!interiors.active||!!gameplay.state.recovery||!!streetChallenge()||!!rideService?.activeFare;
    b.dataset.hireKind=offer.kind;b.dataset.standId=offer.standId;
    b.addEventListener('click',()=>{
      const result=micromobility.start(offer.kind,{pose:gameplay.state.actor,onFoot:gameplay.state.mode==='foot'&&!gameplay.state.passenger,recovering:!!gameplay.state.recovery,standId:offer.standId,assetId:offer.id,moveActor:moveBody,pay:price=>{
        if(isSandbox())return true;const paid=progression.payRental(price,careerContext());if(paid.ok)saveCareer();else notify(paid.message);return paid.ok;
      }});
      if(result.ok){closeDialogs();cameraReady=false;notify('Ride hired. WASD rides; S brakes; E dismounts.');}else notify(result.reason);
    });
    routeButton.textContent='Route';routeButton.addEventListener('click',()=>{routeTo({...offer,name:'Lemon '+offer.kind});closeDialogs();});
    row.append(b,routeButton);
    if(offer.kind==='scooter'){const hack=document.createElement('button');hack.textContent='Hack';hack.dataset.hackAsset=offer.id;hack.disabled=b.disabled;hack.addEventListener('click',()=>beginRentalHack(offer));row.append(hack);}
    $('rental-offers').append(row);
  }
  $('end-rental').disabled=!state.active||Math.abs(state.active.speed)>.3;
  openDialog('phone-dialog');
}
function renderYoober(){
  const state=rideService.snapshot(),select=$('yoober-destination');
  if(!select.options.length)for(const place of rideService.destinations){const option=document.createElement('option');option.value=place.id;option.textContent=place.name||place.label;select.append(option);}
  const quote=rideService.quote(select.value,rideContext());
  const active=!!state.activeFare;
  select.disabled=active;
  $('yoober-quote').textContent=isSandbox()?'Free roam · no charge':active?`Fare $${state.fare} · ${state.paid?'Paid':'Pay when boarding'}`:quote.ok?`$${quote.fare} · ${(quote.metres/1000).toFixed(1)} km · Pay when boarding`:'';
  $('yoober-status').textContent=active?rideStatus(state):quote.reason||'';
  $('yoober-book').disabled=active||!quote.ok;
  $('yoober-cancel').disabled=!active;
  $('yoober-cancel').textContent=state.passenger?'End ride safely':'Cancel request';
  $('yoober-pickup').disabled=!active||!state.pickup||state.passenger;
  $('yoober-track').disabled=!active;
  $('yoober-jobs').replaceChildren();
  const driverReason=isSandbox()?'Driver fares are available in Street Life and Campaign.':gameplay.state.passenger?'Step out before driving fares.':rideService.activeFare?'End your requested ride first.':campaign.state.active?'Finish the campaign mission first.':progression.state.activeJob?'Finish or cancel your active job first.':progression.state.activity?'Finish your current activity first.':progression.rideEligibility(careerContext());
  $('yoober-driver-status').textContent=driverReason;
  $('yoober-driver-status').hidden=!driverReason;
  for(const job of progression.jobs.filter(job=>job.type==='ride')){
    const button=document.createElement('button');button.dataset.yooberJob=job.id;button.textContent=`${job.name} · $${job.reward}`;
    button.disabled=!!driverReason;button.title=driverReason;
    button.addEventListener('click',()=>{if(rideService.activeFare||gameplay.state.passenger)return;const result=progression.startJob(job.id,careerContext());if(result.ok){closeDialogs();routeTo(progression.state.activeJob.target);}notify(result.message);});
    $('yoober-jobs').append(button);
  }
}
function rideStatus(state){
  if(state.phase==='approaching')return 'Your driver is approaching. Wait at the pickup marker.';
  if(state.phase==='waiting')return 'Your driver is here. Walk to the car and press E to board.';
  if(state.phase==='riding')return 'On your way. T opens ride options.';
  if(state.phase==='arrived'||state.phase==='exit-ready')return 'Stopped. Press E to step out.';
  if(state.phase==='stopping')return 'Stopping at a safe place.';
  return state.reason||'Ride complete.';
}
$('yoober-destination').addEventListener('change',renderYoober);
$('yoober-book').addEventListener('click',()=>{const result=rideService.book($('yoober-destination').value,rideContext());if(result.ok){closeDialogs();routeTo({...rideService.snapshot().pickup,name:'Yoober pickup'});notify('Yoober requested. Walk to the pickup marker.');}else{notify(result.reason);renderYoober();}});
$('yoober-cancel').addEventListener('click',()=>{const result=rideService.cancel(rideContext());notify(result.reason||'Ride request cancelled.');closeDialogs();clearInput();});
$('yoober-pickup').addEventListener('click',()=>{const pickup=rideService.snapshot().pickup;if(pickup){routeTo({...pickup,name:'Yoober pickup'});closeDialogs();}});
$('yoober-track').addEventListener('click',trackYoober);
$('yoober-follow-map').addEventListener('click',trackYoober);
$('phone-button').addEventListener('click',openPhone);
$('end-rental').addEventListener('click',()=>{const r=micromobility.end({pose:focus(),onFoot:true,moveActor:moveBody});if(r.ok){closeDialogs();notify('Ride ended.');}else notify(r.reason);});
function interiorContext(){
  const plan=interiors?.active;
  if(!plan)return null;
  const p=focus();
  return {storeId:plan.storeId||null,roomId:plan.id,atCounter:!!plan.counter&&Math.hypot(p.x-plan.counter.x,p.z-plan.counter.z)<=plan.counter.radius};
}
function crimeTarget(id){return typeof id==='string'&&id.startsWith('ped:')?pedestrians?.getCrimeTarget(id):roomPeople.getCrimeTarget(id);}
function robberyTarget(serviceId){
  if(!interiors.active||interiors.active.storeId!==serviceId)return null;
  const pose=focus(),order={cashier:0,shopkeeper:1,cook:2};
  const person=roomPeople.snapshot().filter(person=>person.role in order&&person.health>0).sort((a,b)=>order[a.role]-order[b.role]||Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z))[0];
  return person?roomPeople.getCrimeTarget(person.id):null;
}
function crimeCandidate(){
  if(gameplay.state.mode!=='foot'||gameplay.state.passenger||gameplay.state.recovery||progression.state.activeJob||progression.state.activity||activities.snapshot().active||micromobility.snapshot().active||streetChallenge()||isSandbox())return null;
  if(interiors.active){
    const id=interiors.active.storeId;
    if(id&&!progression.robberyEligibility(id,careerContext()))return {type:'robbery',serviceId:id};
    return null;
  }
  const armed=!!weaponById(gameplay.state.weapon)&&!!progression.state.equipment[gameplay.state.weapon],pose=focus();
  const person=pedestrians.snapshot().filter(person=>person.health>0&&(armed||person.threatened)&&Math.hypot(person.x-pose.x,person.z-pose.z)<=2.6&&visible(pose,person)).sort((a,b)=>Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z))[0];
  return person?{type:'mugging',targetId:`ped:${person.id}`}:null;
}
function visible(a,b){
  if(interiors?.active){
    const plan=interiors.active,o=plan.origin,c=Math.cos(o.yaw),s=Math.sin(o.yaw);
    const inside=p=>{const x=p.x-o.x,z=p.z-o.z;return Math.abs(c*x-s*z)<plan.width/2&&s*x+c*z>0&&s*x+c*z<plan.depth;};
    if(inside(a)||inside(b))return interiors.hasLineOfSight(a,b);
  }
  return simulation.hasLineOfSight(a,b);
}
function clearInterior(){
  stopMini();activities.clear();roomPeople.clear();roomPeopleView?.clear();interiors?.reset();interiorView?.clear();indoorActorView?.dispose();indoorActorView=null;
}
function enterInterior(entry){
  const plan=interiors.enter(entry,gameplay.state.actor);
  if(!plan)return;
  interiorView.load(plan);activities.load(plan);roomPeople.load(plan);roomPeopleView?.load(plan);
  if(!compatibility)indoorActorView=createActorView(interiorScene,()=>plan.floorY,{policeLimit:0});
  cameraReady=false;clearInput();notify(`${entry.name}. E at the door leaves.`);
}
function leaveInterior(){
  if(!interiors.leave(gameplay.state.actor))return;
  stopMini();activities.clear();roomPeople.clear();roomPeopleView?.clear();interiorView.clear();indoorActorView?.dispose();indoorActorView=null;
  progression.cancelActivity();cameraReady=false;clearInput();notify('Outside.');
}
function interiorHint(){
  if(buses?.passenger)return 'E request stop / leave bus';
  if(rideService?.passenger)return ['arrived','exit-ready'].includes(rideService.phase)?'E step out · T phone':'Yoober passenger · T phone';
  if(gameplay?.state.mode!=='foot')return null;
  const pose=focus(),plan=interiors?.active;
  if(progression.state.activity?.interactive)return `${progression.state.activity.phase==='emptying'?'Emptying valuables':'Hold-up in progress'} · E cancel`;
  const victim=crimeCandidate();if(victim)return victim.type==='robbery'?'E demand the employee empty the till':'E demand valuables';
  const bus=buses?.nearest(pose,10);if(bus&&!rideService?.activeFare&&!plan)return bus.stopped?'E board bus':'E request bus stop';
  if(rideService?.phase==='waiting'&&Math.hypot(rideService.vehicles[0].x-pose.x,rideService.vehicles[0].z-pose.z)<9)return 'E board your Yoober';
  if(streetChallenge())return 'Match the sequence · E cancel';
  if(activities.snapshot().active)return 'X + Y / ↑ activity controls · E stop';
  if(micromobility?.snapshot().active)return 'WASD ride · S brake · E dismount · T phone';
  if(plan){
    if(interiors.nearExit(pose))return 'E leave building';
    if(plan.counter&&Math.hypot(pose.x-plan.counter.x,pose.z-plan.counter.z)<=plan.counter.radius)return `E ${plan.name} counter`;
    const station=activities.nearest(pose);
    return station?`Q ${station.label} · E at the door leaves`:'WASD walk · E at the door leaves';
  }
  const contact=streetDealers?.nearest(pose);if(contact)return `E trade with ${contact.name}`;
  const lemon=micromobility?.offers(pose)[0];
  if(lemon?.available&&lemon.distance<=2.8)return 'T hire or hack Lemon ride';
  const service=progression?.services.find(site=>!site.buildingId&&!site.dealer&&site.type==='arms'&&Math.hypot(site.x-pose.x,site.z-pose.z)<=site.radius);
  if(service)return `E open ${service.name}`;
  const entry=interiors?.findEntry(pose);
  return entry?`E enter ${entry.name}`:null;
}
function openWork(){
  if(buses?.passenger){notify('Step off the bus before starting work.');return;}
  if(rideService?.activeFare){notify('End your Yoober ride before starting work.');return;}
  if(gameMode==='campaign')openCampaign();
  else {streetUI.renderJobs();openDialog('jobs-dialog');}
}
function openCampaign(){
  const chapter=campaign.current(),active=campaign.state.active;
  $('campaign-title').textContent=chapter?.name||'Campaign complete';
  $('campaign-contact').textContent=chapter?.contact||'THE LATE SHIFT';
  $('campaign-briefing').textContent=chapter?.briefing||'Every chapter is complete. Continue exploring or switch to Street Life for jobs.';
  $('campaign-status').textContent=active?`${active.target.label} · ${Math.ceil(active.remaining)}s`:campaign.state.message;
  $('campaign-chapters').replaceChildren();
  for(const item of campaign.chapters){
    const li=document.createElement('li');li.textContent=item.name.replace(/^\d+\. /,'')+(campaign.state.completed.includes(item.id)?' · Complete':'');
    if(item.id===chapter?.id)li.setAttribute('aria-current','step');
    $('campaign-chapters').append(li);
  }
  $('campaign-start').disabled=!!active||!chapter||gameMode!=='campaign';
  $('campaign-start').textContent=campaign.state.failed?'Retry mission':'Start mission';
  $('campaign-cancel').disabled=!active;
  openDialog('campaign-dialog');
}
$('campaign-start').addEventListener('click',()=>{
  if(gameMode!=='campaign')return;
  const result=campaign.start(careerContext());
  if(result.ok){closeDialogs();routeTo(campaign.state.active.target);}else notify(result.message);
});
$('campaign-cancel').addEventListener('click',()=>{campaign.cancel();openCampaign();});
$('campaign-resume').addEventListener('click',closeDialogs);
function saveCareer() {
  if (careerError || isSandbox() || !started) return;
  const owned = progression.state.ownedVehicles.find(car => car.id === gameplay.state.vehicle.modelId);
  if (owned && !gameplay.state.vehicle.stolen) { owned.health = gameplay.state.vehicleHealth; owned.color = selectedPaint; }
  try { localStorage.setItem(CAREER_KEY, JSON.stringify({...progression.serialize(),campaign:campaign.serialize()})); }
  catch (error) { careerError = `Career could not be saved: ${error.message}`; $('save-status').textContent = careerError; notify('Career storage is unavailable. You can keep playing.'); }
}
function routeTo(point) {
  destination = { ...point, name: point.name || point.label || 'Selected point' };
  route = findRoute(simulation.graph, focus(), destination); routeClock = 0;
}
function refreshModeUI() {
  document.body.dataset.mode = gameMode;
  $('mode-label').textContent = isSandbox() ? 'FREE ROAM' : gameMode==='campaign' ? 'CAMPAIGN' : 'STREET LIFE';
  $('jobs-button').firstChild.textContent = gameMode==='campaign' ? 'Campaign ' : 'Jobs ';
  $('map-action-title').textContent = isSandbox() ? 'Teleport anywhere' : 'Plan a route';
  $('teleport-button').hidden = !isSandbox();
  $('teleport-button').disabled = !isSandbox() || !mapSelection;
  $('recover-button').hidden = !isSandbox();
  $('jobs-button').hidden = isSandbox();
  $('dev-code-section').hidden=isSandbox();
  $('store-car-button').hidden = isSandbox();
  $('paint-label').textContent = isSandbox() ? 'Paint' : `Paint · $${progression.garage.paintCost}`;
  $('repair-car-button').textContent = isSandbox() ? 'Repair vehicle' : `Repair · $${progression.garage.repairCost}`;
  $('map-search').placeholder = isSandbox() ? 'Address, street or landmark' : 'Street or landmark';
  $('search-note').textContent = isSandbox() ? 'Local OSM address tags. Some points are approximate building centres.' : 'Local streets and landmarks. Street Life has no teleporting.';
  $('map-mode-note').textContent = isSandbox() ? 'Click to select. Scroll to zoom, drag to pan. Enter teleports. Buildings and water adjust to nearby clear ground.' : 'Click to select. Scroll to zoom, drag to pan. Enter sets a road route. Street Life has no teleporting.';
  $('full-map').setAttribute('aria-label', isSandbox() ? 'Canberra map. Click to select; arrows adjust; Enter teleports.' : 'Canberra map. Click to select; arrows adjust; Enter sets a route.');
  for (const button of document.querySelectorAll('[data-start-nearby]')) button.hidden = !isSandbox();
}
function openDialog(id) {
  if (!simulation || !started) return;
  clearInput();
  for (const d of dialogs) if (d.open) d.close();
  if(id==='pause-dialog')resetDevEntry();
  $(id).showModal();
  if (id === 'map-dialog') { refreshModeUI(); fitMapCanvas(); drawMap($('full-map'), true); }
}
function closeDialogs() { for (const dialog of dialogs) if (dialog.open) dialog.close(); clearInput(); }
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
for (const dialog of dialogs) dialog.addEventListener('close', () => { clearInput(); renderer?.domElement.focus(); });
$('map-button').addEventListener('click', () => openDialog('map-dialog'));
$('minimap-button').addEventListener('click', () => openDialog('map-dialog'));
$('pause-button').addEventListener('click', () => openDialog('pause-dialog'));
$('pause-garage-button').addEventListener('click', () => { streetUI.renderGarage(); openDialog('garage-dialog'); });
function resetDevEntry(){
  $('dev-code-section').open=false;$('dev-code-input').value='';$('dev-code-status').textContent='';
}
$('pause-dialog').addEventListener('close',resetDevEntry);
$('dev-code-form').addEventListener('submit',event=>{
  event.preventDefault();
  const value=$('dev-code-input').value;$('dev-code-input').value='';
  if(!started||!$('pause-dialog').open||isSandbox())return;
  const result=progression.redeemDevCode(value,careerContext());
  if(result.ok){saveCareer();streetUI.refresh();}
  $('dev-code-status').textContent=result.ok?(careerError?'Applied for this session. Saving is unavailable.':'Applied.'):result.message;
});
$('resume-button').addEventListener('click', closeDialogs);
$('start-button').addEventListener('click', () => {
  if (!simulation || !gameplay || !streetUI) return;
  gameMode = selectedGameMode;
  clearInterior();micromobility?.reset();rideService?.reset();equipment?.reset();followYoober=false; campaign.cancel();campaign.drainEvents();
  simulation.reset(); restoreParkedCars(); gameplay.reset({ sandbox: isSandbox() });
  buses?.reset();progression.cancelActivity();
  streetDealers?.reset();
  if(!isSandbox())for(const weapon of WEAPONS)if(progression.state.equipment[weapon.id])gameplay.addAmmo(weapon.starterAmmo,weapon.id);
  if (progression.state.activeJob) progression.cancelJob();
  const starter=isSandbox()?null:progression.prepareStarterVehicle(careerContext());
  const owned = starter?.vehicle||progression.state.ownedVehicles.find(car => car.id === 'lantern');
  applyPlayerVehicle({ modelId: 'lantern', color: owned?.color || '#e7e6df', health: isSandbox() ? 100 : owned?.health ?? 100 });
  destination = null; route = []; lastJobTarget = ''; mapSelection = null;
  pedestrians.resetPopulation(focus()); refreshModeUI(); streetUI.refresh();
  started = true; $('start-panel').hidden = true; document.body.classList.remove('intro-open');
  if(starter?.assisted)saveCareer();
  clearInput(); cameraReady = false; renderer.domElement.focus();
  notify(starter?.assisted?starter.message:isSandbox() ? 'Free roam. Search the map for an address or landmark.' : gameMode==='campaign' ? 'Campaign. J opens the mission briefing.' : 'Street Life. E steps out; J opens jobs.');
  if(gameMode==='campaign') openCampaign();
});
for (const button of document.querySelectorAll('[data-game-mode]')) button.addEventListener('click', () => {
  selectedGameMode = button.dataset.gameMode;
  for (const option of document.querySelectorAll('[data-game-mode]')) option.setAttribute('aria-pressed', String(option === button));
});
$('change-mode-button').addEventListener('click', () => {
  saveCareer(); closeDialogs(); started = false; clearInput(); $('start-panel').hidden = false;
  document.body.classList.add('intro-open');
});
function recover() {
  if (!isSandbox()) return;
  clearInterior();micromobility.reset();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;
  const p = simulation.player, nearby = simulation.nearestRoad(p.x, p.z);
  if (nearby && nearby.distance < 500) {
    const yaw = nearby.road.oneway === -1 ? nearby.yaw + Math.PI : nearby.yaw;
    const lane = Math.min(2.3, roadProfile(nearby.road).driveWidth * .23);
    const trip = p.odometer;
    simulation.reset({ x: nearby.x - Math.cos(yaw) * lane, z: nearby.z + Math.sin(yaw) * lane, yaw });
    p.odometer = trip;
  } else simulation.reset();
  pedestrians?.resetPopulation(simulation.player);
  gameplay?.reset({ sandbox: true });
  cameraReady = false; clearInput(); notify('Back on the road.');
}
$('recover-button').addEventListener('click', () => { recover(); closeDialogs(); });
$('quality').addEventListener('change', () => { quality = $('quality').value; resize(); });
$('theme').addEventListener('change', () => document.body.classList.toggle('light', $('theme').value === 'light'));
$('clear-route').addEventListener('click', () => { route = []; destination = null; drawMap($('full-map'), true); });

function selectVehicle(id) {
  if (!scene) return;
  selectedCar = id;
  if (playerMesh) scene.remove(playerMesh);
  playerMesh = createCar(id, { color: selectedPaint });
  addCarShadow(playerMesh);
  scene.add(playerMesh);
  $('car-label').textContent = vehicles.find(v => v.id === id)?.label || id.toUpperCase();
  for (const button of $('car-options').children) button.setAttribute('aria-pressed', String(button.dataset.car === id));
}
function addCarShadow(mesh) {
  if (compatibility) return;
  if (!carShadowGeometry) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d'), image = context.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const radius = Math.hypot((x - 31.5) / 31.5, (y - 31.5) / 31.5);
      image.data[(y * 64 + x) * 4 + 3] = Math.round(Math.max(0, 1 - radius) ** 1.5 * 110);
    }
    context.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    carShadowGeometry = new THREE.PlaneGeometry(3.3, 6.2); carShadowGeometry.rotateX(-Math.PI / 2);
    carShadowMaterial = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    parkedResources.push(texture, carShadowGeometry, carShadowMaterial);
  }
  const shadow = new THREE.Mesh(carShadowGeometry, carShadowMaterial); shadow.position.y = -.01; mesh.add(shadow);
}
function applyPlayerVehicle(vehicle) {
  selectedPaint = typeof vehicle.color === 'number' ? '#' + vehicle.color.toString(16).padStart(6, '0') : vehicle.color || '#e7e6df';
  if (gameplay?.state.mode === 'foot') {
    const actor = focus();
    simulation.teleport({ x: actor.x + Math.cos(actor.yaw) * 3.6, z: actor.z - Math.sin(actor.yaw) * 3.6, yaw: actor.yaw });
  }
  simulation.setPlayerVehicle({ modelId: vehicle.modelId, color: selectedPaint });
  if (gameplay) {
    gameplay.state.vehicle = { modelId: vehicle.modelId, color: selectedPaint, stolen: Boolean(vehicle.stolen) };
    if (Number.isFinite(vehicle.health)) gameplay.state.vehicleHealth = vehicle.health;
  }
  selectVehicle(vehicle.modelId);
}

function toggleSound() {
  if (!audio) {
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      const context = new Audio(), oscillator = context.createOscillator(), filter = context.createBiquadFilter(), gain = context.createGain();
      oscillator.type = 'sawtooth'; oscillator.frequency.value = 36; filter.type = 'lowpass'; filter.frequency.value = 190; gain.gain.value = 0;
      oscillator.connect(filter).connect(gain).connect(context.destination); oscillator.start();
      audio = { context, oscillator, gain, enabled: false };
    } catch (error) { notify(`Audio unavailable: ${error.message}`); return; }
  }
  audio.enabled = !audio.enabled;
  if (audio.enabled) audio.context.resume().catch(() => notify('Your browser could not start audio.'));
  $('sound-button').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  $('sound-button').setAttribute('aria-pressed', String(audio.enabled));
  $('pause-sound-button').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  $('pause-sound-button').setAttribute('aria-pressed', String(audio.enabled));
  if (!dialogs.some(dialog => dialog.open)) renderer.domElement.focus();
}
$('sound-button').addEventListener('click', toggleSound);
$('pause-sound-button').addEventListener('click', toggleSound);
function horn() {
  if (!audio?.enabled) return;
  for (const frequency of [311, 392]) {
    const tone = audio.context.createOscillator(), volume = audio.context.createGain();
    tone.frequency.value = frequency; volume.gain.setValueAtTime(.07, audio.context.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.context.currentTime + .3);
    tone.connect(volume).connect(audio.context.destination); tone.start(); tone.stop(audio.context.currentTime + .32);
    tone.onended = () => { tone.disconnect(); volume.disconnect(); };
  }
}
window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) && event.code !== 'Escape') return;
  const controls = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
  if (controls.includes(event.code)) event.preventDefault();
  if (!event.repeat && started) {
    if(event.code==='KeyT'){openPhone();return;}
    if(event.code==='KeyQ'&&!paused()){beginMini();return;}
    if(event.code==='KeyB'&&!paused()){
      const result=equipment.throwFlare({...careerContext(),aimYaw:footCameraYaw,interior:!!interiors.active,passenger:gameplay.state.passenger});
      if(result.ok&&!isSandbox())saveCareer();notify(result.message);return;
    }
    if (event.code === 'KeyM') { $('map-dialog').open ? closeDialogs() : openDialog('map-dialog'); return; }
    if (event.code === 'KeyP' || event.code === 'Escape') { dialogs.some(d => d.open) ? closeDialogs() : openDialog('pause-dialog'); return; }
    if (event.code === 'KeyJ') { openWork(); return; }
    if (event.code === 'KeyG') { streetUI.renderGarage(); openDialog('garage-dialog'); return; }
    if (event.code === 'KeyK') { streetUI.renderServices(); openDialog('services-dialog'); return; }
    if (event.code === 'KeyE' && !paused()) { event.preventDefault(); interact(); return; }
    if (event.code === 'Digit1' && !paused()) gameplay.setWeapon('unarmed');
    if(!paused()){const weapon=WEAPONS.find(w=>event.code==='Digit'+w.key);if(weapon)gameplay.setWeapon(weapon.id);}
    if (event.code === 'KeyR' && !paused()) { gameplay.state.mode === 'foot' ? gameplay.reload() : recover(); return; }
    if (event.code === 'KeyH' && !paused()) horn();
  }
  if (!paused()) keys.add(event.code);
});
window.addEventListener('keyup', event => keys.delete(event.code));
window.addEventListener('blur', () => { clearInput(); if (started && !dialogs.some(d => d.open)) openDialog('pause-dialog'); });
document.addEventListener('visibilitychange', () => { clearInput(); if (document.hidden && started) openDialog('pause-dialog'); });
for (const button of document.querySelectorAll('[data-drive]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); touch.add(button.dataset.drive); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => touch.delete(button.dataset.drive));
}
function interact() {
  if (!gameplay || paused()) return;
  if(gameplay.state.recovery)return;
  if(progression.state.activity?.interactive){progression.cancelActivity();notify('Hold-up cancelled.');return;}
  const victim=crimeCandidate();
  if(victim){const result=victim.type==='robbery'?progression.startActivity(victim.serviceId,'robbery',careerContext()):progression.startMugging(victim.targetId,careerContext());notify(result.message);return;}
  if(buses?.passenger||(!rideService?.activeFare&&gameplay.state.mode==='foot'&&!interiors.active&&buses?.nearest(focus(),10)&&!busContext().busy)){
    const result=buses.interact(busContext());
    if(result.exited&&result.exitPose)Object.assign(gameplay.state.actor,result.exitPose,{speed:0,jumpHeight:0});
    if(result.boarded||result.exited){cameraReady=false;clearInput();}
    notify(result.reason||result.message||(result.boarded?'On the bus. E requests a stop.':result.exited?'Off the bus.':'Bus stopping.'));return;
  }
  if(rideService?.passenger||(rideService?.phase==='waiting'&&Math.hypot(focus().x-rideService.vehicles[0].x,focus().z-rideService.vehicles[0].z)<=3.5)){
    const result=rideService.interact(rideContext());
    if(result.exited&&result.exitPose){Object.assign(gameplay.state.actor,result.exitPose,{speed:0,jumpHeight:0});footCameraYaw=gameplay.state.actor.yaw;}
    if(result.boarded||result.exited){cameraReady=false;clearInput();if(result.boarded)routeTo({...rideService.snapshot().dropoff,name:'Yoober drop-off'});}
    notify(result.reason||(result.boarded?'Ride started.':result.exited?'Arrived.':'Move closer to your Yoober.'));return;
  }
  if(activities.snapshot().active||streetChallenge()){stopMini();return;}
  if(micromobility?.snapshot().active){const r=micromobility.end({pose:focus(),onFoot:true,moveActor:moveBody});notify(r.reason||r.message||(r.ok?'Dismounted.':'Brake before dismounting.'));return;}
  const contact=gameplay.state.mode==='foot'&&!interiors.active&&streetDealers?.nearest(focus());
  if(contact){$('services-filter').value='arms';streetUI.renderServices();openDialog('services-dialog');$('services-list').querySelector(`[data-service-id="${contact.id}"]`)?.scrollIntoView({block:'start'});return;}
  if(gameplay.state.mode==='foot'&&!gameplay.state.carjacking){
    const pose=focus();
    if(interiors.active){
      if(interiors.nearExit(pose)){leaveInterior();return;}
      const plan=interiors.active;
      if(plan.counter&&Math.hypot(pose.x-plan.counter.x,pose.z-plan.counter.z)<=plan.counter.radius){$('services-filter').value='all';streetUI.renderServices();openDialog('services-dialog');return;}
      notify('Walk to the door to leave.');return;
    }
    const entry=interiors.findEntry(pose);
    if(entry){enterInterior(entry);return;}
    const site=progression.services.find(s=>Math.hypot(s.x-pose.x,s.z-pose.z)<=s.radius&&progression.canUseService(s,careerContext()));
    if(site){$('services-filter').value='all';streetUI.renderServices();openDialog('services-dialog');return;}
  }
  const previousMode = gameplay.state.mode;
  gameplay.interact();
  if (gameplay.state.mode !== previousMode) {
    footCameraYaw = gameplay.state.actor.yaw; cameraReady = false; clearInput();
  }
  streetUI.refresh(); renderer.domElement.focus();
}
$('touch-enter').addEventListener('click', interact);
$('touch-weapon').addEventListener('click',()=>{if(paused())return;const owned=['unarmed',...WEAPONS.filter(w=>isSandbox()||progression.state.equipment[w.id]).map(w=>w.id)];gameplay.setWeapon(owned[(owned.indexOf(gameplay.state.weapon)+1)%owned.length]);});
for (const button of document.querySelectorAll('[data-action]')) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); if (!paused()) actionTouch.add(button.dataset.action); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => actionTouch.delete(button.dataset.action));
}
function walkingInput() {
  if(paused()||gameplay?.state.recovery||gameplay?.state.passenger||activities.snapshot().active||rentalHack.snapshot().active||micromobility?.snapshot().active)return {};
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp') || touch.has('throttle')) - Number(keys.has('KeyS') || keys.has('ArrowDown') || touch.has('brake'));
  const lateral = Number(keys.has('KeyD') || keys.has('ArrowRight') || touch.has('right')) - Number(keys.has('KeyA') || keys.has('ArrowLeft') || touch.has('left'));
  return { moveX: -Math.sin(footCameraYaw) * forward + Math.cos(footCameraYaw) * lateral,
    moveZ: -Math.cos(footCameraYaw) * forward - Math.sin(footCameraYaw) * lateral,
    aimYaw: footCameraYaw, sprint: keys.has('ShiftLeft') || keys.has('ShiftRight'),
    jump: keys.has('Space') || touch.has('handbrake'), aim: mouseAim || actionTouch.has('aim'),
    fire: mouseFire || actionTouch.has('fire'), melee: keys.has('KeyF') };
}
function input() {
  const held = (...codes) => codes.some(c => keys.has(c));
  return { throttle: Number(held('KeyW', 'ArrowUp') || touch.has('throttle')) - Number(held('KeyS', 'ArrowDown') || touch.has('brake')),
    steer: Number(held('KeyD', 'ArrowRight') || touch.has('right')) - Number(held('KeyA', 'ArrowLeft') || touch.has('left')),
    handbrake: held('Space') || touch.has('handbrake'), boost: held('ShiftLeft', 'ShiftRight') };
}

function createMapImage() {
  const b = map.bounds;
  mapImage = document.createElement('canvas'); mapImage.width = 1800;
  mapScale = mapImage.width / (b.maxX - b.minX);
  mapImage.height = Math.round((b.maxZ - b.minZ) * mapScale);
  const ctx = mapImage.getContext('2d'); ctx.fillStyle = '#dfdfcc'; ctx.fillRect(0, 0, mapImage.width, mapImage.height);
  const path = (points,begin=true) => { if(begin)ctx.beginPath(); points.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo']((x - b.minX) * mapScale, (z - b.minZ) * mapScale)); };
  for (const area of map.areas) {
    path(area.points);ctx.closePath();
    for(const hole of area.innerRings||[]){path(hole.points||hole,false);ctx.closePath();}
    ctx.fillStyle = area.type === 'water' ? '#9ab7ba' : '#bbca9b'; ctx.fill('evenodd');
  }
  ctx.fillStyle = '#bfc1b3';
  for (const building of map.buildings) { path(building.points); ctx.fill(); }
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const road of map.roads) { path(road.points); ctx.strokeStyle = '#c1c4b9'; ctx.lineWidth = Math.max(.6, roadProfile(road).driveWidth * mapScale + .7); ctx.stroke(); }
  for (const road of map.roads) { path(road.points); ctx.strokeStyle = '#fffef3'; ctx.lineWidth = Math.max(.35, roadProfile(road).driveWidth * mapScale); ctx.stroke(); }
}
function drawMap(canvas, full) {
  if (!mapImage) return;
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, p = focus(), b = map.bounds;
  ctx.fillStyle = '#dfdfcc'; ctx.fillRect(0, 0, w, h);
  const projection = createMapProjection(b, w, h, { zoom: mapView.zoom, x: mapView.x ?? undefined, z: mapView.z ?? undefined });
  const scale = full ? projection.scale : w / 760;
  const cx = full ? projection.cx : p.x, cz = full ? projection.cz : p.z;
  const sx = x => (x - cx) * scale + w / 2, sz = z => (z - cz) * scale + h / 2;
  const labelBoxes=[],trackedCar=rideService?.activeFare&&rideService.vehicles[0];
  if(full&&trackedCar?.active)labelBoxes.push({x:sx(trackedCar.x)+9,y:sz(trackedCar.z)-25,w:67,h:20});
  const label=(name,x,y,font='bold 16px Arial')=>{
    ctx.font=font;const width=ctx.measureText(name).width+5;
    for(const [left,top] of [[x+14,y-9],[x+14,y-28],[x-width-12,y-9],[x-width-12,y-28]]){
      const box={x:left,y:top,w:width,h:18};
      if(left<3||top<3||left+width>w-3||top+18>h-3||labelBoxes.some(b=>left<b.x+b.w+4&&left+width+4>b.x&&top<b.y+b.h+3&&top+21>b.y))continue;
      labelBoxes.push(box);ctx.fillStyle='#253a36';ctx.fillText(name,left,top+14);break;
    }
  };
  ctx.drawImage(mapImage, sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
  ctx.strokeStyle = '#6d7d70'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale); ctx.setLineDash([]);
  if (route.length) {
    ctx.beginPath(); route.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo'](sx(x), sz(z)));
    ctx.strokeStyle = '#db742a'; ctx.lineWidth = full ? 5 : 6; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const places=full?[...map.landmarks].sort((a,b)=>Number(b.id===destination?.id)-Number(a.id===destination?.id)):map.landmarks;
  for (const place of places) {
    const x = sx(place.x), y = sz(place.z);
    ctx.beginPath(); ctx.arc(x, y, full ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = discovered.has(place.id) ? '#608467' : '#efb15e'; ctx.fill(); ctx.strokeStyle = '#fff8e7'; ctx.lineWidth = 2; ctx.stroke();
    if(full&&(!place.store||mapView.zoom>=9||place.id===destination?.id))label(place.name,x,y);
  }
  if(progression)for(const site of progression.services){if(map.landmarks.some(place=>place.id===site.id))continue;const x=sx(site.x),y=sz(site.z);ctx.fillStyle=site.type==='gym'?'#37614e':site.type==='arms'?'#80563e':'#986b34';ctx.fillRect(x-4,y-4,8,8);if(full)label(site.name,x,y,'12px Arial');}
  if (full && mapSelection) {
    const x = sx(mapSelection.x), y = sz(mapSelection.z);
    ctx.strokeStyle = '#a34624'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.moveTo(x - 21, y); ctx.lineTo(x + 21, y); ctx.moveTo(x, y - 21); ctx.lineTo(x, y + 21); ctx.stroke();
  }
  const tracked=rideService?.activeFare&&rideService.vehicles[0];
  if(tracked?.active){
    const x=sx(tracked.x),y=sz(tracked.z);
    if(x>=0&&x<=w&&y>=0&&y<=h){ctx.save();ctx.translate(x,y);ctx.rotate(-tracked.yaw);ctx.fillStyle='#7054a1';ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.fillRect(-7,-10,14,20);ctx.strokeRect(-7,-10,14,20);ctx.restore();if(full){ctx.fillStyle='#3e2c61';ctx.font='bold 13px Arial';ctx.fillText('Yoober',x+12,y-10);}}
    else if(!full){const angle=Math.atan2(y-h/2,x-w/2),edge=Math.min((w/2-17)/Math.max(.001,Math.abs(Math.cos(angle))),(h/2-17)/Math.max(.001,Math.abs(Math.sin(angle))));ctx.save();ctx.translate(w/2+Math.cos(angle)*edge,h/2+Math.sin(angle)*edge);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#7054a1';ctx.fill();ctx.restore();}
  }
  if(guideState&&destination){
    let x=sx(guideState.point.x),y=sz(guideState.point.z);
    if(!full){const dx=x-w/2,dy=y-h/2,factor=Math.min(1,(w/2-24)/Math.max(1,Math.abs(dx)),(h/2-24)/Math.max(1,Math.abs(dy)));x=w/2+dx*factor;y=h/2+dy*factor;}
    if(x>-24&&x<w+24&&y>-24&&y<h+24){
      const incoming=guideState.incomingYaw,outgoing=guideState.outgoingYaw,fx=-Math.sin(outgoing),fz=-Math.cos(outgoing),size=full?21:17;
      ctx.beginPath();ctx.moveTo(x+Math.sin(incoming)*size,y+Math.cos(incoming)*size);ctx.lineTo(x,y);ctx.lineTo(x+fx*size,y+fz*size);ctx.strokeStyle='#3e3820';ctx.lineWidth=9;ctx.stroke();ctx.strokeStyle='#ffd23f';ctx.lineWidth=5;ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+fx*(size+5),y+fz*(size+5));ctx.lineTo(x+fx*(size-7)+fz*7,y+fz*(size-7)-fx*7);ctx.lineTo(x+fx*(size-7)-fz*7,y+fz*(size-7)+fx*7);ctx.closePath();ctx.fillStyle='#ffd23f';ctx.fill();
    }
  }
  for(const flare of equipment?.snapshot()||[]){ctx.beginPath();ctx.arc(sx(flare.x),sz(flare.z),full?7:5,0,Math.PI*2);ctx.fillStyle='#d94a31';ctx.fill();}
  for (const police of gameplay?.state.police||[]) {
    if (police.health <= 0) continue;
    const scanner=progression?.state.gear?.scanner,range=Math.hypot(police.x-p.x,police.z-p.z);
    if(scanner?range>1200:!gameplay.state.wanted||range>130||!simulation.hasLineOfSight(p,police))continue;
    ctx.fillStyle = police.seesPlayer ? '#a84637' : '#416f9b';
    ctx.beginPath(); ctx.arc(sx(police.x), sz(police.z), full ? 5 : 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.translate(sx(p.x), sz(p.z)); ctx.rotate(-p.yaw);
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 10); ctx.lineTo(0, 6); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fillStyle = '#182d38'; ctx.fill(); ctx.strokeStyle = '#fff9e9'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
function fullMapProjection() {
  return createMapProjection(map.bounds, $('full-map').width, $('full-map').height, {
    zoom: mapView.zoom, x: mapView.x ?? undefined, z: mapView.z ?? undefined,
  });
}
function fitMapCanvas() {
  const canvas = $('full-map'), rect = canvas.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 0) { canvas.width = Math.round(rect.width); canvas.height = Math.round(rect.height); }
}
function selectMapPoint(point) {
  mapSelection = point;
  $('teleport-button').disabled = !point || !isSandbox();
  $('map-route-button').disabled = !point;
  if (point) {
    const road = simulation.nearestRoad(point.x, point.z);
    const lat = map.meta.origin[1] - point.z / 111320;
    const lon = map.meta.origin[0] + point.x / (111320 * Math.cos(map.meta.origin[1] * Math.PI / 180));
    $('teleport-status').textContent = `${road?.road.name && road.distance < 50 ? 'Near ' + road.road.name : 'Selected ground'} · ${Math.abs(lat).toFixed(5)}° S, ${lon.toFixed(5)}° E`;
  } else $('teleport-status').textContent = 'Choose a point inside the mapped boundary.';
  drawMap($('full-map'), true);
}
function teleportSelected() {
  if (!isSandbox()) { $('teleport-status').textContent = 'Street Life uses road routes. Teleporting is available in Free roam.'; return; }
  if (!mapSelection) return;
  const arrival = simulation.teleport(mapSelection);
  if (!arrival.ok) { $('teleport-status').textContent = 'No clear ground at this point. Choose a nearby spot.'; return; }
  clearInterior();micromobility.reset();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;gameplay.reset({ sandbox: true });
  pedestrians.resetPopulation(simulation.player);
  cameraReady = false; accumulator = 0; orbit = 0; orbitHeight = 0; lookPitch = 0; clearInput();
  if (destination) route = findRoute(simulation.graph, simulation.player, destination);
  world.update(simulation.player); neighbourhood.update(simulation.player);
  closeDialogs();
  notify(arrival.adjusted ? `Teleported to clear ground ${Math.round(arrival.distance)} m from your selected point.` : 'Teleported to your selected point.');
}
function changeMapZoom(multiplier, point = null) {
  followYoober=false;
  const before = fullMapProjection(), next = THREE.MathUtils.clamp(mapView.zoom * multiplier, 1, 12);
  if (point) {
    mapView.x = THREE.MathUtils.clamp(point.x + (before.cx - point.x) * mapView.zoom / next, map.bounds.minX, map.bounds.maxX);
    mapView.z = THREE.MathUtils.clamp(point.z + (before.cz - point.z) * mapView.zoom / next, map.bounds.minZ, map.bounds.maxZ);
  }
  mapView.zoom = next;
  if (next === 1) { mapView.x = null; mapView.z = null; }
  $('map-zoom-level').textContent = `${next.toFixed(next % 1 ? 1 : 0)}×`;
  drawMap($('full-map'), true);
}
const mapCanvas = $('full-map');
mapCanvas.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || mapDrag) return;
  const projection = fullMapProjection(), rect = mapCanvas.getBoundingClientRect();
  mapDrag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, x: projection.cx, z: projection.cz, moved: false, rect, scale: projection.scale };
  mapCanvas.setPointerCapture(event.pointerId); mapCanvas.focus();
});
mapCanvas.addEventListener('pointermove', event => {
  if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
  const dx = event.clientX - mapDrag.clientX, dy = event.clientY - mapDrag.clientY;
  if (Math.hypot(dx, dy) > 5) mapDrag.moved = true;
  if (!mapDrag.moved) return;
  followYoober=false;
  mapView.x = THREE.MathUtils.clamp(mapDrag.x - dx * mapCanvas.width / mapDrag.rect.width / mapDrag.scale, map.bounds.minX, map.bounds.maxX);
  mapView.z = THREE.MathUtils.clamp(mapDrag.z - dy * mapCanvas.height / mapDrag.rect.height / mapDrag.scale, map.bounds.minZ, map.bounds.maxZ);
  drawMap(mapCanvas, true);
});
mapCanvas.addEventListener('pointerup', event => {
  if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
  if (!mapDrag.moved) selectMapPoint(mapPointFromClient(fullMapProjection(), mapCanvas.getBoundingClientRect(), event.clientX, event.clientY, map.bounds));
  mapDrag = null;
});
for (const type of ['pointercancel', 'lostpointercapture']) mapCanvas.addEventListener(type, event => { if (event.pointerId === mapDrag?.pointerId) mapDrag = null; });
mapCanvas.addEventListener('wheel', event => {
  event.preventDefault();
  changeMapZoom(event.deltaY < 0 ? 1.3 : 1 / 1.3, mapPointFromClient(fullMapProjection(), mapCanvas.getBoundingClientRect(), event.clientX, event.clientY, map.bounds));
}, { passive: false });
mapCanvas.addEventListener('keydown', event => {
  if (event.code === 'Enter') { event.preventDefault(); isSandbox() ? teleportSelected() : routeSelected(); return; }
  const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.code];
  if (!direction) return;
  event.preventDefault();
  const current = mapSelection || focus(), step = (event.shiftKey ? 200 : 40) / mapView.zoom;
  selectMapPoint({ x: THREE.MathUtils.clamp(current.x + direction[0] * step, map.bounds.minX + 2, map.bounds.maxX - 2),
    z: THREE.MathUtils.clamp(current.z + direction[1] * step, map.bounds.minZ + 2, map.bounds.maxZ - 2) });
});
$('teleport-button').addEventListener('click', teleportSelected);
$('map-zoom-in').addEventListener('click', () => changeMapZoom(1.5));
$('map-zoom-out').addEventListener('click', () => changeMapZoom(1 / 1.5));
$('map-recenter').addEventListener('click', () => { followYoober=false;mapView.x = focus().x; mapView.z = focus().z; mapView.zoom = 4; $('map-zoom-level').textContent = '4×'; drawMap(mapCanvas, true); });
function routeSelected() {
  if (!mapSelection) return;
  routeTo({ ...mapSelection, name: mapSelection.label || 'Selected point' });
  notify(route.length ? 'Road route set.' : 'No connected road route found.'); drawMap(mapCanvas, true);
}
$('map-route-button').addEventListener('click', routeSelected);
$('map-search-form').addEventListener('submit', event => {
  event.preventDefault(); const results = $('search-results'); results.replaceChildren();
  const matches = addressSearch.search($('map-search').value, 20).filter(result => isSandbox() || result.kind !== 'address').slice(0, 8);
  if (!matches.length) { results.textContent = 'No mapped match. Try a street or landmark name.'; return; }
  for (const match of matches) {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = match.label;
    const detail = document.createElement('span'); detail.textContent = `${match.kind} · ${match.detail || 'Local map point'}`; button.append(detail);
    button.addEventListener('click', () => {
      mapView.x = match.x; mapView.z = match.z; mapView.zoom = 5; $('map-zoom-level').textContent = '5×';
      selectMapPoint({ ...match }); results.replaceChildren(); mapCanvas.focus();
    }); results.append(button);
  }
});
function updatePlaces() {
  $('explored').textContent = `${discovered.size} / ${map.landmarks.length} places discovered`;
  for (const place of map.landmarks) {
    const item = document.querySelector(`[data-place="${place.id}"]`);
    if (item) item.classList.toggle('discovered', discovered.has(place.id));
  }
}
function populatePlaces() {
  for (const place of map.landmarks) {
    const item = document.createElement('div'); item.className = 'place-item'; item.dataset.place = place.id;
    const label = document.createElement('strong'); label.textContent = place.name;
    const buttons = document.createElement('div'); buttons.className = 'button-row';
    const gps = document.createElement('button'); gps.textContent = 'Set route';
    gps.addEventListener('click', () => {
      destination = place; route = findRoute(simulation.graph, simulation.player, place);
      drawMap($('full-map'), true);
      notify(route.length ? `Route set to ${place.name}.` : 'No connected road route found. Choose another place.');
    });
    const start = document.createElement('button'); start.textContent = 'Start nearby';
    start.dataset.startNearby = place.id; start.hidden = !isSandbox();
    start.addEventListener('click', () => {
      if (!isSandbox()) return;
      let road = null;
      for (const street of map.roads) {
        if (!street.name || street.type === 'service') continue;
        for (let i = 1; i < street.points.length; i++) {
          const a = street.points[i - 1], b = street.points[i];
          const projected = projectSegment(place.x, place.z, a, b);
          if (!road || projected.distance < road.distance) road = { ...projected, road: street, yaw: Math.atan2(a[0] - b[0], a[1] - b[1]) };
        }
      }
      if (road) {
        const yaw = road.road.oneway === -1 ? road.yaw + Math.PI : road.yaw;
        clearInterior();micromobility.reset();
        simulation.reset(place.id === 'telopea' ? map.spawn : { x: road.x - Math.cos(yaw) * 2, z: road.z + Math.sin(yaw) * 2, yaw });
        gameplay.reset({ sandbox: true }); pedestrians.resetPopulation(simulation.player);
        cameraReady = false; closeDialogs(); notify(`Starting near ${place.name}.`);
      }
    });
    buttons.append(gps, start); item.append(label, buttons); $('places').append(item);
  }
  updatePlaces();
}

function createParkedCars() {
  const chunks = new Map(), dummy = new THREE.Object3D(), color = new THREE.Color();
  for(const car of generateParkedCars(map,{isClear:(x,z,radius,pose)=>simulation.canOccupy(pose,{length:4.8,width:2})})){
    const key=`${Math.floor(car.x/300)},${Math.floor(car.z/300)}`;
    if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(car);
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1), material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  parkedResources.push(geometry, material);
  parkedSourceCars.push(...[...chunks.values()].flat()); simulation.setParkedCars(parkedSourceCars);
  for (const cars of chunks.values()) {
    if (!cars.length) continue;
    const group = new THREE.Group();
    const pieces = [new THREE.InstancedMesh(geometry, material, cars.length), new THREE.InstancedMesh(geometry, material, cars.length), new THREE.InstancedMesh(geometry, material, cars.length * 4)];
    cars.forEach((car, index) => {
      const matrices = [];
      const y = world.heightAt(car.x, car.z), height = car.suv ? .88 : .62;
      dummy.position.set(car.x, y + .36 + height / 2, car.z); dummy.rotation.set(0, car.yaw, 0); dummy.scale.set(car.suv ? 1.98 : 1.85, height, car.suv ? 4.5 : 4.7); dummy.updateMatrix();
      pieces[0].setMatrixAt(index, dummy.matrix); pieces[0].setColorAt(index, color.set(car.color));
      matrices.push(dummy.matrix.clone());
      dummy.position.y += height / 2 + .26; dummy.scale.set(1.58, .65, car.suv ? 2.7 : car.modelId === 'orchard' ? 3.3 : 2.3); dummy.updateMatrix(); pieces[1].setMatrixAt(index, dummy.matrix); pieces[1].setColorAt(index, color.set(0x43565a));
      matrices.push(dummy.matrix.clone());
      for (let wheel = 0; wheel < 4; wheel++) {
        const x = wheel % 2 ? .96 : -.96, z = wheel < 2 ? -1.45 : 1.45;
        dummy.position.set(car.x + Math.cos(car.yaw) * x + Math.sin(car.yaw) * z, y + .35, car.z - Math.sin(car.yaw) * x + Math.cos(car.yaw) * z);
        dummy.scale.set(.22, .6, .6); dummy.updateMatrix(); pieces[2].setMatrixAt(index * 4 + wheel, dummy.matrix); pieces[2].setColorAt(index * 4 + wheel, color.set(0x252b2b));
        matrices.push(dummy.matrix.clone());
      }
      parkedInstanceRecords.push({ id: car.id, pieces, index, matrices, hidden: false });
    });
    for (const mesh of pieces) { mesh.computeBoundingSphere(); group.add(mesh); }
    scene.add(group); parkedChunks.push({ group, x: cars[0].x, z: cars[0].z });
  }
}
function restoreParkedCars() {
  simulation.setParkedCars(parkedSourceCars); simulation.abandonedCars.length = 0;
  for (const record of parkedInstanceRecords) {
    if (!record.hidden) continue;
    record.pieces[0].setMatrixAt(record.index, record.matrices[0]); record.pieces[1].setMatrixAt(record.index, record.matrices[1]);
    for (let wheel = 0; wheel < 4; wheel++) record.pieces[2].setMatrixAt(record.index * 4 + wheel, record.matrices[wheel + 2]);
    for (const piece of record.pieces) piece.instanceMatrix.needsUpdate = true;
    record.hidden = false;
  }
}
function resize() {
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight, scale = Math.min(1, (quality === 'low' ? 960 : 1440) / w, (quality === 'low' ? 540 : 900) / h);
  renderer.setSize(Math.round(w * scale), Math.round(h * scale), false);
  camera.aspect = w / h; camera.updateProjectionMatrix(); cameraReady = false;
  if ($('map-dialog').open) { fitMapCanvas(); drawMap($('full-map'), true); }
}
function createCompatibilityRenderer(canvas) {
  const context = canvas.getContext('2d');
  return {
    domElement: canvas, info: { render: { calls: 1, triangles: 0 } },
    setSize(w, h) { canvas.width = w; canvas.height = h; },
    dispose() {},
    render() {
      if (!mapImage) return;
      const p = focus(), w = canvas.width, h = canvas.height, scale = 5;
      context.fillStyle = '#d5dbbb'; context.fillRect(0, 0, w, h);
      context.drawImage(mapImage, (map.bounds.minX - p.x) * scale + w / 2, (map.bounds.minZ - p.z) * scale + h / 2,
        (map.bounds.maxX - map.bounds.minX) * scale, (map.bounds.maxZ - map.bounds.minZ) * scale);
      const car = (state, color) => {
        const x = (state.x - p.x) * scale + w / 2, y = (state.z - p.z) * scale + h / 2;
        if (x < -30 || y < -30 || x > w + 30 || y > h + 30) return;
        context.save(); context.translate(x, y); context.rotate(-state.yaw);
        context.fillStyle = '#233135'; context.fillRect(-6, -10, 12, 20);
        context.fillStyle = color; context.fillRect(-4.5, -10.5, 9, 21);
        context.fillStyle = '#42606b'; context.fillRect(-3.7, -4.5, 7.4, 7); context.restore();
      };
      for (const other of simulation.traffic) if (other.active !== false) car(other, typeof other.color === 'number' ? '#' + other.color.toString(16).padStart(6, '0') : other.color);
      for (const police of gameplay?.state.police || []) if (police.health > 0) car(police, '#416c97');
      car(simulation.player, selectedPaint);
      if (gameplay?.state.mode === 'foot') { context.fillStyle = '#c08d68'; context.beginPath(); context.arc(w / 2, h / 2, 4, 0, Math.PI * 2); context.fill(); }
      context.fillStyle = '#976346';
      for (const person of pedestrians?.snapshot() || []) {
        const x = (person.x - p.x) * scale + w / 2, y = (person.z - p.z) * scale + h / 2;
        if (x > 0 && y > 0 && x < w && y < h) { context.beginPath(); context.arc(x, y, 2.5, 0, Math.PI * 2); context.fill(); }
      }
      context.fillStyle = '#172127'; context.fillRect(w - 265, 100, 250, 47);
      context.fillStyle = '#f5f2e9'; context.font = 'bold 12px Arial'; context.fillText('2D COMPATIBILITY VIEW', w - 252, 119);
      context.font = '10px Arial'; context.fillText('This browser does not provide WebGL.', w - 252, 135);
    },
  };
}
window.addEventListener('resize', resize);
function updateHud() {
  const p = focus(), nearby = simulation.nearestRoad(p.x, p.z);
  $('speed').textContent = String(Math.round(Math.abs(p.speed) * 3.6));
  $('gear').textContent = p.speed < -.5 ? 'R' : Math.abs(p.speed) < .6 ? 'N' : String(Math.min(6, Math.floor(Math.abs(p.speed) / 8) + 1));
  $('speed-fill').style.width = `${Math.min(100, Math.abs(p.speed) / 54 * 100)}%`;
  $('distance').textContent = `${(simulation.player.odometer / 1000).toFixed(1)} KM`;
  $('car-label').textContent = buses?.passenger?'BUS':rideService?.passenger?'YOOBER':gameplay?.state.mode === 'foot' ? 'ON FOOT' : vehicles.find(v => v.id === selectedCar)?.label || selectedCar.toUpperCase();
  $('street').textContent = interiors?.active?.name||nearby?.road.name || 'Canberra backstreets';
  const districtPlaces=map.landmarks.filter(place=>['telopea','manuka','kingston','foreshore','redhill','griffith','narrabundah','canberra-centre'].includes(place.id));
  const nearestPlace = districtPlaces.reduce((a, b) => Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b);
  $('district').textContent = nearestPlace.id === 'telopea' ? 'BARTON' : nearestPlace.id==='canberra-centre'?'CIVIC':nearestPlace.name.replace(/ shops$/i,'').toUpperCase();
  $('driving-hint').textContent = buses?.passenger?'E request stop / leave bus':rideService?.passenger?'T phone · E exits when stopped':gameplay?.state.mode === 'foot' ? 'SHIFT sprint · SPACE jump · RMB aim' : 'SPACE handbrake · SHIFT boost';
  $('destination-line').hidden=!destination;
  $('destination-line').textContent = destination ? `${destination.name} · ${(Math.hypot(destination.x - p.x, destination.z - p.z) / 1000).toFixed(1)} km away` : '';
  if (started && !paused()) for (const place of map.landmarks) {
    if (!discovered.has(place.id) && Math.hypot(place.x - p.x, place.z - p.z) < place.radius) {
      discovered.add(place.id); saveProgress(); updatePlaces();
      notify(discovered.size === map.landmarks.length ? 'Inner south explored. Every place discovered. Keep driving.' : `Discovered: ${place.name}`);
    }
  }
  updateNavigation();drawMap($('minimap'), false);
  if($('map-dialog').open&&followYoober)drawMap($('full-map'),true);
}
function placeCar(mesh, car, dt) {
  const y = world.heightAt(car.x, car.z), fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  const pitch = Math.atan2(world.heightAt(car.x + fx * 2, car.z + fz * 2) - world.heightAt(car.x - fx * 2, car.z - fz * 2), 4);
  mesh.position.set(car.x, y + .18, car.z); mesh.rotation.set(pitch, car.yaw, 0, 'YXZ');
  for (const wheel of mesh.userData.wheels) wheel.rotation.x -= car.speed * dt / .34;
}
function syncParkedVisibility() {
  const states = new Map(simulation.parkedCars.map(car => [car.id, car]));
  const empty = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const record of parkedInstanceRecords) {
    if (record.hidden || states.get(record.id)?.active !== false) continue;
    record.pieces[0].setMatrixAt(record.index, empty);
    record.pieces[1].setMatrixAt(record.index, empty);
    for (let wheel = 0; wheel < 4; wheel++) record.pieces[2].setMatrixAt(record.index * 4 + wheel, empty);
    for (const piece of record.pieces) piece.instanceMatrix.needsUpdate = true;
    record.hidden = true;
  }
}
function updateAbandonedMeshes(p, dt) {
  const active = new Set();
  for (const car of simulation.abandonedCars) {
    if (!car.active) continue;
    active.add(car.id);
    let mesh = abandonedMeshes.get(car.id);
    if (!mesh) { mesh = createCar(car.modelId, { color: car.color }); addCarShadow(mesh); scene.add(mesh); abandonedMeshes.set(car.id, mesh); }
    mesh.visible = Math.hypot(car.x - p.x, car.z - p.z) < 300;
    if (mesh.visible) placeCar(mesh, { ...car, speed: 0 }, dt);
  }
  for (const [id, mesh] of abandonedMeshes) if (!active.has(id)) { scene.remove(mesh); abandonedMeshes.delete(id); }
}
function updateCareer() {
  for(const event of rideService?.drainEvents()||[])if(event.reason||event.message)notify(event.reason||event.message);
  for(const event of campaign.drainEvents()){
    if(event.type==='started'&&event.incident)gameplay.reportOffence('suspect vehicle',2,{witnessed:true});
    if(event.type==='complete'){
      progression.state.cash=Math.min(1000000000,progression.state.cash+event.reward);saveCareer();
      notify(`${event.message} +$${event.reward}. J opens Campaign.`);
    }else if(event.message)notify(event.message);
  }
  for (const event of progression.drainEvents()) {
    if(event.type==='job-started'&&progression.state.activeJob?.type==='ride'){
      const job=progression.state.activeJob,road=simulation.nearestRoad(job.target.x,job.target.z);
      if(road)for(const side of [-1,1]){
        const offset=roadProfile(road.road).driveWidth/2+1.2;
        const pose={x:road.x+Math.cos(road.yaw)*offset*side,z:road.z-Math.sin(road.yaw)*offset*side,yaw:road.yaw};
        if(simulation.canOccupy(pose,{length:1,width:.8})&&simulation.hasLineOfSight(road,pose)){job.waitingPose=pose;break;}
      }
    }
    if (['job-stage','job-complete','job-failed','penalty','robbery-complete','mugging-complete','workout-complete','work-started','work-complete','activity-ended'].includes(event.type)) notify(event.message);
    if(event.type==='mugging-started'&&!isSandbox())gameplay.reportOffence('mugging',2,{witnessed:true,point:event.point});
    if(event.type==='robbery-started'&&!isSandbox())gameplay.reportOffence('shop robbery',2,{witnessed:true,point:event.point});
    if (['job-complete','penalty','robbery-complete','mugging-complete','workout-complete'].includes(event.type)) saveCareer();
  }
  if (isSandbox()) return;
  const target = gameMode==='campaign'?campaign.state.active?.target:progression.state.activeJob?.target;
  const key = target ? `${target.x},${target.z}` : '';
  if (key !== lastJobTarget) {
    if (target) routeTo(target);
    else if (lastJobTarget) { destination = null; route = []; }
    lastJobTarget = key;
  }
}
function syncExternalVehicles(){
  simulation.setExternalVehicles([...(buses?.vehicles||[]),...(rideService?.vehicles||[]),...gameplay.state.police.filter(p=>p.health>0&&p.car).map(p=>p.car)]);
}
function animate(time) {
  if (disposed) return;
  raf = requestAnimationFrame(animate);
  const dt = Math.min(.075, (time - (lastTime || time)) / 1000); lastTime = time;
  const tracking=liveTracking();
  if (!paused()||tracking) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      const walking = gameplay.state.mode === 'foot';
      syncExternalVehicles();
      simulation.step(1 / 60, tracking||walking||gameplay.state.recovery||gameplay.state.vehicleHealth<=0 ? { brake: true } : input(), focus());
      gameplay.step(1 / 60, {...walkingInput(),challenge:miniInput()});
      syncExternalVehicles();buses?.step(1/60,busContext());
      if(rideService?.vehicles[0].active)rideService.step(1/60,rideContext());
      equipment?.step(1/60,careerContext());
      if (!isSandbox()) progression.update(1 / 60, careerContext());
      activities.step(1/60,miniInput(),careerContext());
      streetDealers.update(1/60,{focus:focus(),wanted:gameplay.state.wanted,shots:gameplay.state.shots});
      roomPeople.setCrime(progression.state.activity);pedestrians.setCrime(progression.state.activity);
      roomPeople.update(1/60,{actor:gameplay.state.actor,activity:activities.snapshot()});
      micromobility?.step(1/60,{throttle:Math.max(0,input().throttle),brake:Math.max(0,-input().throttle),steer:input().steer},{pose:gameplay.state.actor,onFoot:gameplay.state.mode==='foot',recovering:!!gameplay.state.recovery,moveActor:moveBody});
      updateRentalHack(1/60);
      campaign.update(1/60,careerContext());
      if(previousActorMode!==gameplay.state.mode){previousActorMode=gameplay.state.mode;footCameraYaw=gameplay.state.actor.yaw;cameraReady=false;clearInput();}
      accumulator -= 1 / 60;
    }
    routeClock += dt;
    if (destination && routeClock > 6) { routeClock = 0; route = findRoute(simulation.graph, focus(), destination); }
  } else accumulator = 0;
  updateMini();updateCareer();
  if (audio) {
    const active = audio.enabled && !paused() && gameplay.state.mode === 'vehicle';
    audio.gain.gain.setTargetAtTime(active ? .022 : 0, audio.context.currentTime, .08);
    audio.oscillator.frequency.setTargetAtTime(35 + Math.abs(simulation.player.speed) * 3.4, audio.context.currentTime, .08);
  }
  if (time - lastRender < (quality === 'low' ? 1000 / 30 : 1000 / 60) - 1) return;
  const renderDt = Math.min(.1, (time - (lastRender || time)) / 1000); lastRender = time;
  const p = focus(), activeDt = paused()&&!tracking ? 0 : renderDt;
  if(!interiors.active){
  pedestrianFocus.x=p.x;pedestrianFocus.z=p.z;pedestrianFocus.yaw=p.yaw;pedestrianFocus.speed=gameplay.state.mode==='vehicle'?p.speed:0;
  pedestrians?.update(pedestrianFocus, activeDt, simulation.traffic,simulation.hasLineOfSight);
  placeCar(playerMesh, simulation.player, activeDt);
  trafficView?.update(p,{lowGraphics:quality==='low'});
  updateAbandonedMeshes(p, activeDt);
  busView?.update(buses.vehicles,p);servicesView?.update(p);signalsView?.update(simulation.trafficLights.heads,p);
  equipmentView?.update(equipment.snapshot(),p);
  occupantInputs.length=0;
  const seated=(car,occupied,modelId=car.modelId)=>{
    let pose=occupantPoses.get(car.id);if(!pose){pose={id:car.id};occupantPoses.set(car.id,pose);}
    pose.x=car.x;pose.z=car.z;pose.yaw=car.yaw;pose.modelId=modelId;pose.active=car.active;pose.occupied=occupied;occupantInputs.push(pose);
  };
  seated(simulation.player,gameplay.state.mode==='vehicle');
  for(const car of simulation.traffic)seated(car,true);
  for(const officer of gameplay.state.police)if(officer.health>0&&officer.car)seated(officer.car,officer.mode==='vehicle','relay');
  for(const car of rideService?.vehicles||[])if(car.active)seated(car,car.occupied!==false);
  occupantsView?.update(activeDt,{focus:p,cars:occupantInputs});
  if (++frameCount % 8 === 0) {
    world.update(p, time / 1000); neighbourhood?.update(p); landmarkView?.update(p, time / 1000);storefrontsView?.update(p);shoppingView?.update(p);campusView?.update(p);civicView?.update(p);noodleShopView?.update(p);civicExtrasView?.update(p);
    syncParkedVisibility();
    for (const chunk of parkedChunks) chunk.group.visible = Math.hypot(chunk.x - p.x, chunk.z - p.z) < 600;
  }
  }
  const onFoot = gameplay.state.mode === 'foot'&&!gameplay.state.passenger;
  document.body.classList.toggle('on-foot', onFoot);
  document.body.classList.toggle('passenger',gameplay.state.passenger);
  document.body.classList.toggle('indoors',!!interiors.active);
  $('aim-reticle').hidden = !onFoot || !gameplay.state.aiming || paused();
  const objective = isSandbox() ? destination : campaign.state.active?.target || progression.state.activeJob?.target || progression.garage;
  if(!interiors.active)actorView?.update(micromobility?.snapshot().active||gameplay.state.passenger?{...gameplay.state,mode:'vehicle'}:gameplay.state, { dt: activeDt, time: time / 1000, focus: p, objective });
  rideView?.update({car:rideService.vehicles[0],passenger:rideService.passenger},{focus:p,playerCar:{...simulation.player,modelId:gameplay.state.vehicle.modelId},job:progression.state.activeJob,dt:activeDt});
  roomPeopleView?.update(roomPeople.snapshot(),activeDt,{activity:activities.snapshot()});
  microView?.update(micromobility.snapshot(),p,activeDt);
  dealerView?.update(streetDealers.snapshot(),interiors.active?{x:Infinity,z:Infinity}:p,activeDt);
  if(interiors.active){
    const angle=footCameraYaw,ground=interiors.active.floorY;
    desiredCamera.set(p.x+Math.sin(angle)*3.2,ground+2.25,p.z+Math.cos(angle)*3.2);
    const ahead={x:desiredCamera.x,z:desiredCamera.z};
    const cameraClear=interiors.hasLineOfSight(p,ahead);
    if(!cameraClear)desiredCamera.set(p.x,ground+1.7,p.z);
    lookTarget.set(p.x-Math.sin(angle)*4,ground+1.4,p.z-Math.cos(angle)*4);
    if(activities.snapshot().active&&activities.snapshot().kind==='bench'){const b=interiors.active.exercise;desiredCamera.set(b.x+3,ground+2.2,b.z+2);lookTarget.set(b.x,ground+.9,b.z);}
    indoorActorView?.update({...gameplay.state,mode:cameraClear&&!(activities.snapshot().active&&activities.snapshot().kind==='bench')?'foot':'vehicle',police:[]},{dt:activeDt,time:time/1000,focus:p,objective:null});
  } else if (onFoot) {
    const angle = footCameraYaw, aiming = gameplay.state.aiming, distance = aiming ? 3.4 : 5.8;
    desiredCamera.set(p.x + Math.sin(angle) * distance + Math.cos(angle) * (aiming ? .65 : 0),
      world.heightAt(p.x, p.z) + 2.65 + p.jumpHeight + orbitHeight * .3,
      p.z + Math.cos(angle) * distance - Math.sin(angle) * (aiming ? .65 : 0));
    lookTarget.set(p.x - Math.sin(angle) * (aiming ? 12 : 1), world.heightAt(p.x, p.z) + 1.45 + p.jumpHeight,
      p.z - Math.cos(angle) * (aiming ? 12 : 1));
  } else {
    orbitHold = Math.max(0, orbitHold - renderDt);
    if (!dragging && orbitHold === 0 && Math.abs(p.speed) > 1) { orbit *= Math.exp(-renderDt * 1.6); lookPitch *= Math.exp(-renderDt * 1.6); }
    const angle = p.yaw + orbit, distance = !started ? 21 : 10.8 + Math.min(4, Math.abs(p.speed) * .065);
    desiredCamera.set(p.x + Math.sin(angle) * distance, world.heightAt(p.x, p.z) + (!started ? 10 : 5.4) + orbitHeight, p.z + Math.cos(angle) * distance);
    lookTarget.set(p.x - Math.sin(p.yaw) * 5, world.heightAt(p.x, p.z) + 1.4, p.z - Math.cos(p.yaw) * 5);
    lookTarget.y += Math.tan(lookPitch) * (distance + 5);
  }
  if(!interiors.active)desiredCamera.y = Math.max(desiredCamera.y, world.heightAt(desiredCamera.x, desiredCamera.z) + .65);
  camera.position.lerp(desiredCamera, interiors.active?1:cameraReady ? 1 - Math.exp(-renderDt * 5.5) : 1);
  camera.lookAt(lookTarget); cameraReady = true;
  renderer.render(interiors.active&&!compatibility?interiorScene:scene, camera);
  hudTime += renderDt;
  if (hudTime > .18) { updateHud(); streetUI.refresh(); hudTime = 0; }
}
async function boot() {
  const [response, addressResponse,profileResponse,northResponse,terrainResponse,signalResponse] = await Promise.all([fetch('./data/canberra.json'), fetch('./data/addresses.json'),fetch('./data/road-profiles.json'),fetch('./data/canberra-north.json'),fetch('./data/north-terrain.json'),fetch('./data/traffic-signals.json')]);
  if (!response.ok || !addressResponse.ok||!profileResponse.ok||!northResponse.ok||!terrainResponse.ok||!signalResponse.ok) throw new Error('Local map or address data could not be loaded.');
  map = applyMapExpansion(applyRoadProfiles(await response.json(),await profileResponse.json()),await northResponse.json());
  map.terrainTiles=[(await terrainResponse.json()).terrain];
  map.trafficSignals=await signalResponse.json();
  map.lakeWaterLevel=5.93;
  terrainSampler=createTerrainSampler(map);
  map.landmarks = [...map.landmarks, ...LANDMARKS.filter(place => !map.landmarks.some(old => old.id === place.id)),...ALL_STORES.map(store=>({id:store.id,name:store.name,aliases:[...store.aliases,store.sourceName],x:store.x,z:store.z,radius:store.radius,store:true,description:store.road+' · parody store'}))];
  for(const landmark of [...CIVIC_LANDMARKS,SKATEPARK_LANDMARK,...expansionPlaces(map)]){const old=map.landmarks.findIndex(p=>p.id===landmark.id);if(old>=0)map.landmarks[old]={...map.landmarks[old],...landmark};else map.landmarks.push(landmark);}
  map.barriers=[...POOL_BARRIERS,...CAMPUS_BARRIERS,...SKATE_BARRIERS.map(b=>{const dx=b.b[0]-b.a[0],dz=b.b[1]-b.a[1],d=Math.hypot(dx,dz)||1,nx=-dz/d*b.width/2,nz=dx/d*b.width/2;return {...b,points:[[b.a[0]+nx,b.a[1]+nz],[b.b[0]+nx,b.b[1]+nz],[b.b[0]-nx,b.b[1]-nz],[b.a[0]-nx,b.a[1]-nz]]};})];map.collisionReplacedBuildingIds=['act-75267-0','osm-584970595'];
  map.buildings=map.buildings.map(b=>b.id===SKATE_BUILDING_OPENING.buildingId?{...b,innerRings:[{points:SKATE_BUILDING_OPENING.polygon}]}:b);
  map.shoppingManagedBuildingIds=SHOPPING_BUILDING_IDS;map.campusBuildingIds=CAMPUS_BUILDING_IDS;
  map.areas=[...map.areas,{id:'manuka-pool-water',type:'water',points:MANUKA_POOL_BASIN}];
  map.landmarkBuildingIds = [...replacedBuildingIds(map),...SHOPPING_BUILDING_IDS,...CIVIC_BUILDING_IDS];
  map.landmarkTreeExclusions = [...LANDMARK_CLEARINGS,...SHOPPING_CLEARINGS];
  const addressData = await addressResponse.json(); addressSearch = createAddressSearch(map, addressData);
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c9d5); scene.fog = new THREE.Fog(0xa9c9d5, 230, 750);
  camera = new THREE.PerspectiveCamera(58, 1, .3, 4500);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' }) || canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
  compatibility = !context;
  if (context) {
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  } else renderer = createCompatibilityRenderer(document.createElement('canvas'));
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Drive with WASD or arrows. Drag to look around.');
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); clearInput(); notify('Graphics paused. Reload this page to restore the driving view.'); if (started) openDialog('pause-dialog'); });
  $('world').append(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xf8f5dc, 0x697258, 1.3));
  const sun = new THREE.DirectionalLight(0xfff0ce, 2.0); sun.position.set(-300, 450, 180); scene.add(sun);
  world = compatibility ? { heightAt: () => 0, update() {}, dispose() {}, stats: {} } : createWorldView(scene, map,{lowGraphics:true});
  civicView=compatibility?emptyView():createCivicView(scene,map,terrainSampler.heightAt);
  noodleShopView=compatibility?emptyView():createNoodleShopView(scene,terrainSampler.heightAt);
  map.barriers.push(...(civicView.barriers||[]),...(noodleShopView.obstacles||[]));
  simulation=createSimulation(map,{isOnBridge:terrainSampler.isOnBridge});
  signalsView=compatibility?emptyView():createTrafficLightsView(scene,world.heightAt);
  micromobility=createMicromobility(map);microView=compatibility?emptyView():createMicromobilityView(scene,(x,z)=>world.heightAt(x,z));
  const ground=world.heightAt;world.heightAt=(x,z)=>ground(x,z)+skateHeightOffset(x,z);
  civicExtrasView=compatibility?emptyView():createCivicExtrasView(scene,map,ground);
  world.update(simulation.player, 0);
  neighbourhood = compatibility ? { update() {}, dispose() {}, stats: {} } : createNeighbourhoodDetails(scene, map, world.heightAt,{lowGraphics:true});
  streetDealers=createStreetDealers(map,{avoidPoints:micromobility.snapshot().assets});dealerView=compatibility?emptyView():createStreetDealersView(scene,world.heightAt);
  pedestrians=createPedestrians(scene,map,world.heightAt,{entrances:[...ALL_STORES.map(s=>s.frontage).filter(Boolean),...CIVIC_INTERIOR_ENTRIES,...CAMPUS_GATES,...(neighbourhood.entries||[]),...streetDealers.services]});
  map.landmarks.push(...streetDealers.services.map(site=>({...site,aliases:['street dealer','arms dealer','weapons contact'],description:'Fictional street contact'})));
  neighbourhood.update(simulation.player);
  landmarkView = compatibility ? { update() {}, dispose() {}, stats: {} } : createLandmarksView(scene, map, world.heightAt);
  landmarkView.update(simulation.player, 0);
  map.interiorEntries=neighbourhood.entries||[];
  gymEntry=createGymEntry(map,GENERIC_SERVICES.find(s=>s.type==='gym'));
  interiors=createInteriors(map,{heightAt:world.heightAt,stores:ALL_STORES,publicEntries:[...CIVIC_INTERIOR_ENTRIES,...(gymEntry?[gymEntry]:[])]});
  interiorScene=new THREE.Scene();interiorScene.background=new THREE.Color(0xccc3ad);
  interiorScene.add(new THREE.HemisphereLight(0xfff8df,0x70685b,2));
  const indoorSun=new THREE.DirectionalLight(0xfff1d4,1.1);indoorSun.position.set(-2,5,3);interiorScene.add(indoorSun);
  interiorView=compatibility?{load(){},clear(){},dispose(){},stats:{}}:createInteriorView(interiorScene);
  roomPeopleView=compatibility?{load(){},update(){},clear(){},dispose(){},stats:{}}:createInteriorPeopleView(interiorScene,()=>interiors.active?.floorY||0);
  const careerOptions={extraServices:streetDealers.services,workSession:()=>({plan:interiors.active,session:activities.snapshot()}),interactiveWorkouts:true,interactiveRobbery:true,crimeTarget,robberyTarget,hasLineOfSight:visible,servicePosition:servicePosition,canUseService:site=>site.dealer?!interiors.active&&streetDealers.canTrade(site.id):site.type==='gym'?interiors.active?.serviceId===site.id:!site.buildingId||interiors.active?.storeId===site.id};
  try {
    const raw = localStorage.getItem(CAREER_KEY);
    if (raw && raw.length > 16000) throw new Error('Saved career is too large.');
    const saved=raw?JSON.parse(raw):null;
    const {campaign:savedCampaign,...careerSave}=saved||{};
    campaign=createCampaign(map,savedCampaign===undefined?null:savedCampaign);
    progression = createProgression(map, saved ? careerSave : null,careerOptions);
  } catch (error) {
    careerError = `Career could not be loaded: ${error.message} This session will not overwrite it.`;
    campaign=createCampaign(map);progression = createProgression(map,null,careerOptions); $('save-status').textContent = careerError;
  }
  const actorSimulation={...simulation,moveActor:(actor,...args)=>actor===gameplay?.state.actor?moveBody(actor,...args):simulation.moveActor(actor,...args),hasLineOfSight:visible};
  const witnesses={snapshot:()=>interiors.active?roomPeople.snapshot():[...pedestrians.snapshot(),...streetDealers.snapshot(),...(rideService?.people||[]).filter(person=>person.active)],
    drainEvents:()=>[...pedestrians.drainEvents(),...roomPeople.drainEvents(),...(rideService?.drainCombatEvents()||[])],
    alert:spec=>{if(interiors.active)roomPeople.alert(spec);else{pedestrians.alert(spec);streetDealers.alert(spec);rideService?.alert(spec);}},
    strike:spec=>{const results=(interiors.active?[roomPeople.strike(spec)]:[pedestrians.strike(spec),streetDealers.strike(spec),rideService?.strike(spec)]).filter(Boolean);return {hits:results.reduce((total,result)=>total+result.hits,0),people:results.flatMap(result=>result.people||[])};}};
  gameplay = createGameplay(map, actorSimulation, { pedestrians:witnesses, heightAt: (x,z)=>interiors.active?.floorY??world.heightAt(x,z),
    passengerPose:()=>rideService?.seatPose||buses?.seatPose,
    hasWeapon:id=>!!progression.state.equipment[id],hasPistol:()=>progression.state.equipment.pistol,fitness:()=>progression.state.fitnessLevel,
    onCarjacked:pose=>occupantsView?.addExit(pose),
    onVehicleChanged: applyPlayerVehicle,
    onRespawn: reason => {
      clearInterior();micromobility.reset();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;
      progression.penalize(reason === 'arrest' ? 'Arrest' : 'Hospital treatment');
      const owned = progression.state.ownedVehicles.find(car => car.id === gameplay.state.vehicle.modelId);
      if (owned && !gameplay.state.vehicle.stolen) owned.health = 100;
      cameraReady = false; clearInput(); pedestrians.resetPopulation(focus());
    },
    onEvent: event => {
      if (event.kind !== 'attack') notify(event.message);
      if (event.kind === 'respawn') cameraReady = false;
    } });
  actorView = compatibility ? { update() {}, dispose() {}, stats: {} } : createActorView(scene, world.heightAt);
  occupantsView=compatibility?{update(){},addExit(){},dispose(){},stats:{}}:createVehicleOccupantsView(scene,world.heightAt);
  servicesView=compatibility?{update(){},dispose(){},stats:{}}:createServicesView(scene,world.heightAt);
  storefrontsView=compatibility?{update(){},dispose(){},stats:{}}:createStorefrontsView(scene,world.heightAt,{excludeIds:[NOODLE_SHOP_ID]});
  trafficView=compatibility?{update(){},dispose(){},stats:{}}:createTrafficView(scene,world.heightAt,simulation.traffic);
  shoppingView=compatibility?emptyView():createShoppingView(scene,map,world.heightAt);
  campusView=compatibility?emptyView():createCampusView(scene,map,world.heightAt);
  busView=compatibility?{update(){},dispose(){},stats:{}}:createBusView(scene,world.heightAt);
  streetUI = createStreetUI({ gameplay, progression, simulation, vehicles, notify, openDialog, closeDialogs,
    onVehicleSelected: applyPlayerVehicle, onRoute: routeTo, saveCareer, isSandbox,campaign,isCampaign:()=>gameMode==='campaign',getContext:careerContext,onJobs:openWork,interactionHint:interiorHint,onWorkout:()=>{closeDialogs();const b=interiors.active?.activities.find(s=>s.kind==='bench');if(!b||Math.hypot(focus().x-b.x,focus().z-b.z)>b.radius){notify('Walk to the bench and press Q.');return;}beginMini(b.id);} });
  applyPlayerVehicle({ modelId: selectedCar, color: selectedPaint, health: 100 });
  createParkedCars();
  buses=createBuses(map,simulation);
  rideService=createRideService(map,simulation,{canPay:fare=>isSandbox()||progression.state.cash>=fare,pay:fare=>{if(isSandbox())return true;const result=progression.payRide(fare,careerContext());if(result.ok)saveCareer();return result.ok;}});
  rideView=compatibility?emptyView():createRideServiceView(scene,world.heightAt);
  equipment=createEquipment({consumeFlare:context=>progression.consumeFlare(context),hasLineOfSight:visible,canOccupy:(pose,options)=>simulation.canOccupy(pose,options),heightAt:world.heightAt});
  equipmentView=compatibility?emptyView():createEquipmentView(scene,world.heightAt);
  syncExternalVehicles();
  createMapImage(); loadProgress(); populatePlaces(); refreshModeUI(); resize(); updateHud();
  if (careerError) $('save-status').textContent = [savedError, careerError].filter(Boolean).join(' ');
  const viewCanvas = renderer.domElement;
  viewCanvas.addEventListener('contextmenu', event => event.preventDefault());
  viewCanvas.addEventListener('mousedown', event => {
    if (paused() || gameplay.state.mode !== 'foot' || gameplay.state.passenger) return;
    if (event.button === 0) mouseFire = true;
    if (event.button === 2) mouseAim = true;
  });
  viewCanvas.addEventListener('mouseup', event => { if (event.button === 0) mouseFire = false; if (event.button === 2) mouseAim = false; });
  viewCanvas.addEventListener('pointerdown', event => { if (paused()) return; dragging = true; pointer = [event.clientX, event.clientY]; viewCanvas.setPointerCapture(event.pointerId); });
  viewCanvas.addEventListener('pointermove', event => {
    if (!dragging || !pointer) return;
    if (gameplay.state.mode === 'foot'&&!gameplay.state.passenger) {
      footCameraYaw -= (event.clientX - pointer[0]) * .006;
      orbitHeight = THREE.MathUtils.clamp(orbitHeight + (event.clientY - pointer[1]) * .025, -1.5, 9);
    } else {
      orbit -= (event.clientX - pointer[0]) * .006;
      lookPitch = THREE.MathUtils.clamp(lookPitch - (event.clientY - pointer[1]) * .004, -.5, .72);
    }
    pointer = [event.clientX, event.clientY]; orbitHold = 3;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewCanvas.addEventListener(type, () => { dragging = false; pointer = null; });
  $('loading').textContent = compatibility?'Ready · 2D map view (WebGL unavailable)':'Ready';
  $('start-button').disabled = false;
  // Read-only diagnostics for QA; no production state setters.
  window.capitalDriveSnapshot = () => Object.freeze({ ready: true, started, paused: paused(), gameMode,
    player: Object.freeze({ ...simulation.player }), focus: Object.freeze({ ...focus() }),
    gameplay: gameplay.snapshot(),rentalHack:freezeCopy(rentalHack.snapshot()),nearbyVehicles:freezeCopy(simulation.nearbyVehicles(focus().x,focus().z,40)),miniGame:freezeCopy(activities.snapshot()),roomPeople:freezeCopy(roomPeople.snapshot()),roomPeopleView:freezeCopy(roomPeopleView.stats),rentals:freezeCopy(micromobility.snapshot()),microView:freezeCopy(microView.stats),gymEntry:freezeCopy(gymEntry),campaign:campaign.snapshot(),interiors:freezeCopy({...interiors.snapshot(),entrySample:interiors.entries.slice(0,8),publicEntries:CIVIC_INTERIOR_ENTRIES,active:interiors.active}),career: freezeCopy(progression.serialize()), totalPlaces: map.landmarks.length,
    activeJob:freezeCopy(progression.state.activeJob),rideService:rideService.snapshot(),rideView:freezeCopy(rideView.stats),
    guidance:guidance.snapshot(),rideTracking:freezeCopy(rideTracking()),signals:freezeCopy({elapsed:simulation.trafficLights.elapsed,sourceCount:map.trafficSignals.signals.length,groupCount:simulation.trafficLights.groups.length,heads:simulation.trafficLights.heads,view:signalsView.stats}),equipment:freezeCopy({flares:equipment.snapshot(),view:equipmentView.stats}),busPassenger:!!buses.passenger,
    places: Object.freeze(map.landmarks.map(place => Object.freeze({ ...place }))), addressCount: addressData.addresses.length,
    camera: Object.freeze({ x: camera.position.x, y: camera.position.y, z: camera.position.z, orbit, lookPitch,footYaw:footCameraYaw }),
    discovered: Object.freeze([...discovered]), roadCount: map.roads.length, buildings: map.buildings.length, traffic: simulation.traffic.length,
    visibleTraffic: trafficView.stats.visible||0,trafficView:Object.freeze({...trafficView.stats}), destination: destination?.id ?? null, routePoints: route.length,routePath:freezeCopy(route.map(p=>({x:p[0],z:p[1]}))),streetDealers:freezeCopy({services:streetDealers.services,people:streetDealers.snapshot(),view:dealerView.stats}),
    mapSelection: mapSelection ? Object.freeze({ ...mapSelection }) : null,
    mapView: Object.freeze({ zoom: mapView.zoom, ...map.bounds, x: fullMapProjection().cx, z: fullMapProjection().cz, scale: fullMapProjection().scale }),
    rendering: Object.freeze({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, quality, compatibility }), world: Object.freeze({ ...world.stats }),
    pedestrians: Object.freeze({ ...pedestrians.stats, sample: Object.freeze(pedestrians.snapshot().slice(0,8)),routineSample:freezeCopy(pedestrians.snapshot().filter(p=>['coffee','work'].includes(p.ambient)).slice(0,12)) }), neighbourhood: Object.freeze({ ...neighbourhood.stats }),
    landmarks: Object.freeze({ ...landmarkView.stats }), actors: Object.freeze({ ...actorView.stats }),
    services:freezeCopy(progression.services),activity:freezeCopy(progression.state.activity),
    buses:freezeCopy(buses.snapshot()),busView:Object.freeze({...busView.stats}),occupants:Object.freeze({...occupantsView.stats}),
    serviceView:Object.freeze({...servicesView.stats}),storefronts:Object.freeze({...storefrontsView.stats}),poolGates:freezeCopy(POOL_GATE_APPROACHES),campus:freezeCopy(campusView.stats),campusGates:freezeCopy(CAMPUS_GATES),shopping:freezeCopy(shoppingView.stats),civic:freezeCopy(civicView.stats),civicExtras:freezeCopy(civicExtrasView.stats),noodleShop:freezeCopy(noodleShopView.stats),interiorView:freezeCopy(interiorView.stats),
    trafficSample: freezeCopy(simulation.traffic.slice(0, 8).map(({ id, x, z, speed, active, behaviour, honkCount }) => ({ id, x, z, speed, active, behaviour, honkCount }))) });
  raf = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', () => {
  if (progression && gameplay) saveCareer();
  disposed = true; cancelAnimationFrame(raf); clearTimeout(toastTimer); clearInput();
  if (audio) audio.context.close().catch(error => console.warn('Could not release audio:', error.message));
  for (const resource of parkedResources) resource.dispose();
  streetUI?.dispose(); actorView?.dispose(); landmarkView?.dispose();busView?.dispose();occupantsView?.dispose();servicesView?.dispose();trafficView?.dispose();storefrontsView?.dispose();
  dealerView?.dispose();rideView?.dispose();rideService?.reset();signalsView?.dispose();equipmentView?.dispose();equipment?.reset();
  stopMini();roomPeopleView?.dispose();microView?.dispose();civicExtrasView?.dispose();
  shoppingView?.dispose();campusView?.dispose();civicView?.dispose();noodleShopView?.dispose();interiorView?.dispose();indoorActorView?.dispose();
  pedestrians?.dispose(); neighbourhood?.dispose(); world?.dispose(); disposeCars(); renderer?.dispose();
});
boot().catch(error => {
  $('loading').textContent = `Unable to start: ${error.message} Reload to try again.`;
  $('loading').setAttribute('role', 'alert'); $('start-button').textContent = 'Reload game'; $('start-button').disabled = false;
  $('start-button').addEventListener('click', () => location.reload(), { once: true });
  console.error('Capital Drive startup failed', error);
});
