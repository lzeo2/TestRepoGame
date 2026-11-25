import {createParkedCarsView} from './parked-cars-view.js';
import {GAME_DATA_FILES,loadGameData} from './game-data.js';
import {composeCapitalMap,decodeCapitalMapResponses,appendCapitalHighwayBarriers} from './map-source.js';
import {createTutorial} from './tutorial.js';
import {createActivityUI} from './activity-ui.js';
import {createTouchJoystick} from './touch-joystick.js';
import {MAX_AIM_PITCH} from './ballistics.js';
import {createShotObstacles} from './shot-obstacles.js';
import {createRecon} from './recon.js';
import {createAssassinationChapter} from './assassination-mission.js';
import {createAssassinationSiteView} from './assassination-site-view.js';
import {createContractTarget} from './contract-target.js';
import {lookAngles,footCameraFrame,cameraBlend,createExplosionShake} from './camera-control.js';
import {createFootMotion} from './foot-motion.js';
import {createHeroPowers} from './hero-powers.js';
import {blastLimits,createOrdnance,validExplosion} from './ordnance.js';
import {createOrdnanceView} from './ordnance-view.js';
import {createAtmosphere} from './atmosphere.js';
import {createAtmosphereView} from './atmosphere-view.js';
import {createHeadlightsView} from './headlights-view.js';
import {createPoliceSupportView} from './police-support-view.js';
import {createPoliceStations} from './police-stations.js';
import {createPoliceStationView} from './police-station-view.js';
import {createDrone} from './drone.js';
import {createDroneView} from './drone-view.js';
import {createSecurityCameras,shopCameraLocation,streetCameraLocations} from './security-cameras.js';
import {createSecurityCamerasView,drawCameraMarks} from './security-cameras-view.js';
import {createCityUI} from './city-ui.js';
import {createBurglary} from './burglary.js';
import {createHouseController} from './house-controller.js';
import {createDeliveryService,deliverySources} from './delivery-service.js';
import {createDeliveryView} from './delivery-view.js';
import {createStuntRampsView} from './stunt-ramps-view.js';
import {stuntVehicleHeightAt} from './vehicle-flight.js';
import {emptyStash} from './safehouse-storage.js';
import {createDefenceDepotView,createDepotTankView} from './defence-depot-view.js';
import {createDepotTank} from './depot-tank.js';
import {createAirportView} from './airport-view.js';
import {createAircraft} from './aircraft.js';
import {createAircraftView} from './aircraft-view.js';
import {createVehicleDamage,createVehicleFires} from './vehicle-damage.js';
import {createVehicleDamageView} from './vehicle-damage-view.js';
import {matchesMissionCode,matchesGodModeCode} from './dev-missions.js';
import {createPoliceRooms} from './police-rooms.js';
import {clipInteriorActors} from './interior-navigation.js';
import {createRenderGate,createFramePacer,renderProfile,chooseRenderQuality} from './render-gate.js';
import {createGraphicsDiagnostics} from './graphics-diagnostics.js';
import {setupGameCache} from './cache-client.js';
import {showGameStartupError} from './cache-launcher.js';
import * as THREE from '../../assets/car-arcade/vendor/three.module.js';
import { createCar, disposeCars } from './car-model.js';
import {CAPITAL_BY_ID as BY_ID} from '../../assets/car-arcade/fleet.js';
import { createSimulation, projectSegment } from './simulation.js';
import { createWorldView } from './world-view.js';
import { aerialGuidance, findRoute } from './navigation.js';
import {createRouteGuidance} from './navigation-guidance.js';
import {createRoadGuidanceView} from './road-guidance-view.js';
import {createTrafficLightsView} from './traffic-lights-view.js';
import {createEquipment} from './equipment.js';
import {createEquipmentView} from './equipment-view.js';
import { createPedestrians } from './pedestrians.js';
import { createNeighbourhoodDetails } from './neighbourhood.js';
import { createMapProjection, drawMapDetail, mapPointFromClient } from './map-projection.js';
import { createGameplay } from './gameplay.js';
import { createProgression, JETPACK_OFFER } from './progression.js';
import { createActorView } from './actor-view.js';
import { createStreetUI } from './street-ui.js';
import { createAddressSearch } from './address-search.js';
import { POOL_GATE_APPROACHES } from './landmarks.js';
import { createLandmarksView } from './landmarks-view.js';
import {createNorthPlacesView} from './north-places-view.js';
import {createRegionalLandmarksView} from './regional-landmarks-view.js';
import {createDriveAudio} from './drive-audio.js';
import {roadProfile,roadSpeed} from './road-network.js';
import {createBuses} from './buses.js';
import {createBirdsView} from './birds-view.js';
import {createWarMemorialView} from './war-memorial-view.js';
import {createLightRail} from './light-rail.js';
import {createLightRailView} from './light-rail-view.js';
import {buildHeistSites} from './heist-sites.js';
import {createHeistSitesView} from './heist-sites-view.js';
import {createHeistActivities} from './heist-activities.js';
import {createCampaignAftermath} from './campaign-aftermath.js';
import {createCampaignWorld} from './campaign-world.js';
import {gearForMode} from './free-roam-gear.js';
import {SAVE_KEY,CAREER_KEY,TUTORIAL_KEY,clearCapitalProgress,parseCareerSave} from './career-reset.js';
import {createBusView} from './bus-view.js';
import {createVehicleOccupantsView} from './vehicle-occupants-view.js';
import {createServicesView} from './services-view.js';
import {MAPPED_STORES} from './stores.js';
import {createStorefrontsView} from './storefronts-view.js';
import {createTrafficView} from './traffic-view.js';
import {createVehicleContactShadow,vehicleShadowScale} from './vehicle-contact-shadow.js';
import {createNoodleShopView,NOODLE_SHOP_ID} from './noodle-shop-view.js';
import {createShoppingView} from './shopping-view.js';
import {CAMPUS_GATES} from './campus.js';
import {createCampusView} from './campus-view.js';
import {createInteriors,createGymEntry,createSchoolEntry,memorialGalleryActions} from './interiors.js';
import {createInteriorActivities,isWorkoutKind} from './interior-activities.js';
import {createInteriorPeople} from './interior-people.js';
import {createInteriorPeopleView} from './interior-people-view.js';
import {createMicromobility} from './micromobility.js';
import {WEAPONS,WEAPON_IDS,weaponById} from './weapons.js';
import {createStreetDealers} from './street-dealers.js';
import {createStreetDealersView} from './street-dealers-view.js';
import {generateParkedCars} from './parking-layout.js';
import {createRideService} from './ride-service.js';
import {createRideServiceView} from './ride-service-view.js';
import {createVehicleChallenge} from './vehicle-challenges.js';
import {createMicromobilityView} from './micromobility-view.js';
import {EXTRA_STORES,skateHeightOffset} from './civic-extras.js';
import {createCivicExtrasView} from './civic-extras-view.js';
import {GENERIC_SERVICES,SOURCE_GYM_SERVICES} from './services.js';
import {createWildlifeView} from './wildlife-view.js';
import {createStreetAssetsView} from './street-assets-view.js';
import {BUS_STOPS,FUEL_STATIONS} from './street-assets.js';
import {createNitroStations,createNitroStationDamage} from './nitro-stations.js';
import {buildPetrolForecourts} from './petrol-forecourts.js';
import {buildRentalStorefronts} from './rental-storefronts.js';
import {createRentalStorefrontsView} from './rental-storefronts-view.js';
import {createHighwayBarriersView} from './highway-barriers-view.js';
import {createLocalDetailsView} from './local-details-view.js';
import {prepareCharacterStart} from './character-start.js';
import {createProtagonistState,PROTAGONIST_IDS} from './protagonist-state.js';
import {createCampaignScenes} from './campaign-scenes.js';
import {createCampaignScenesView} from './campaign-scenes-view.js';
import {createInteriorView} from './interior-view.js';
import {createCampaign} from './campaign.js';
import {createCutscenes} from './cutscenes.js';
import {selectStoryHomes,createMissionGuide} from './mission-locations.js';
import {createMissionFootpath,createFootTraversal} from './mission-footpath.js';
import {planSafehouseReturn} from './safehouse-recovery.js';
import {anuBridgeHeightAt} from './anu-campus.js';
import {createAnuCampusView} from './anu-campus-view.js';
import {createMacquarieShopsView} from './macquarie-shops-view.js';
import {createSkylineJob} from './skyline-job.js';
import {createSkylineOpponents} from './skyline-opponents.js';
import {createSkylineSiteView} from './skyline-site-view.js';
import {createSkylineCover} from './skyline-cover.js';
import {createSkylineAtv} from './skyline-atv.js';
import {createSkylineAtvView} from './skyline-atv-view.js';
import {createSkylinePressure} from './skyline-pressure.js';
import {createSkylinePressureView} from './skyline-pressure-view.js';
import {createSkylineSupport} from './skyline-support.js';
import {createSkylineBackup} from './skyline-backup.js';
import {createCivicView,CIVIC_INTERIOR_ENTRIES} from './civic-view.js';
import {carCockpitFrame,drivingCameraShake} from './car-camera.js';
import {createJetpack} from './jetpack.js';
import {createJetpackView} from './jetpack-view.js';
import {CAR_RENTAL_OFFERS,createCarRental} from './car-rental.js';
import {createNitroView} from './nitro-view.js';
import {createServiceMapIcons} from './service-map-icons.js';
import {createStealthContracts,planStealthChapter} from './stealth-contracts.js';
import {createStealthContractsView} from './stealth-contracts-view.js';
import {createWatercraft,WATERCRAFT_OFFERS} from './watercraft.js';
import {createWatercraftView} from './watercraft-view.js';

const ALL_STORES=[...MAPPED_STORES,...EXTRA_STORES];
const $ = id => document.getElementById(id);
const fpsBadge=$('fps-count');
const serviceMapIcons=createServiceMapIcons(document);
const keys = new Set(), touch = new Set();
const dialogs = [...document.querySelectorAll('dialog')];
let clearingProgress=false;
const vehicles = [
  { id: 'lantern', name: 'Neighbourhood saloon', note: 'Everyday four-door', label: 'SALOON' },
  { id: 'orchard', name: 'Family wagon', note: 'Room for the long weekend', label: 'WAGON' },
  { id: 'gravel', name: 'Suburban SUV', note: 'A familiar sight in the inner south', label: 'SUV' },
  { id: 'relay', name: 'Executive tourer', note: 'A little more presence', label: 'TOURER' },
  { id: 'atlas', name: 'Weekend ute', note: 'Practical, with some attitude', label: 'UTE' },
  { id: 'finch', name: 'City hatchback', note: 'Small and nimble', label: 'HATCH' },
  { id: 'flux', name: 'Flux Borough EV', note: 'Quick electric hatchback', label: 'EV' },
  { id: 'rill', name: 'Rill Workmate', note: 'Compact tray ute', label: 'TRAY UTE' },
  { id: 'gather', name: 'Gather Shuttle', note: 'Roomy people mover', label: 'SHUTTLE' },
];
const BIRD_SITES = new Set(['parliament-house','telopea','manuka-pool','kingston-powerhouse',
  'foreshore','redhill','australian-war-memorial','giant-spray','dickson']);
let map, simulation, world, renderer, scene, camera, playerMesh, route = [], destination = null;
let godMode=false,policeStations,policeStationView;
let watercraft,watercraftView,watercraftDock,watercraftViewState;
let nitroView,rentalStorefrontsView,carRentalSites=[];
let streetDealers,dealerView,delivery,deliveryView,deliveryCatalog=[],houseController,stunts,stuntsView;
let jetpack,jetpackView,cockpitCamera=false;
let jetpackBodies=[];
const deliveryReceipts=new Map(),deliveryViewState={car:null};
let rideService,rideView,aircraft,aircraftView,aircraftRescueHealth=null;
let carRental;
let signalsView,equipment,equipmentView;
let roadGuidanceView;
const guidance=createRouteGuidance();
let guidanceRoute=null,guideState=null,airGuideState=null,followYoober=false,followCourier=false;
let trafficView,storefrontsView,shoppingView,campusView,civicView,noodleShopView,civicExtrasView;
let interiors,interiorScene,interiorView,indoorActorView,campaign,terrainSampler,gymEntry;
let missionCheckpoint=null;
const MISSION_FAILURE_HOLD=1.6,MISSION_FAILURE_FADE=.8;
let missionFailureTitle=null;
let stealthContracts,stealthContractView,stealthOutcome=null,stealthPreview=null,planningContractId=null;
let contractTarget,assassinationSiteView,assassinationMarkers=[],assassinationOutcome=null;
let lightRail,lightRailView,heists,heistSitesView,railHeistMarker,campaignAftermath,campaignWorld,streetWorld,inquiryOfficer=null;
let depotTank,depotTankView;
let inquiryHarm=false;
const stealthPlans=new Map();
let gymEntries=[],wildlifeView,birdsView,warMemorialView,streetAssetsView,highwayBarriersView,localDetailsView;
let campaignScenes,campaignScenesView,indoorCampaignScenesView,headlightsView,policeSupportView;
let headlightsOverride=null,activeCrewEntry=null;
let drone,droneView,droneActive=false,securityCameras,securityCamerasView,indoorSecurityCamerasView,cityUI,cameraCrimeSerial=0,cameraRoomPlan=null;
const handledVehicleBlasts=new WeakSet();
const burglary=createBurglary({canApproach:(entry,ctx)=>!interiors.active&&visible(ctx.pose,entry)});
const droneInput={forward:0,right:0,lift:0,yaw:0,body:null,paused:false,interiorId:null};
function headlightsEnabled(hour){return headlightsOverride??(hour<7||hour>=18);}
function toggleHeadlights(){headlightsOverride=!headlightsEnabled(atmosphere.snapshot().hour);viewRevision++;}
function utilityContext(){
  const context=careerContext(),jammerPoint={...context.pose,interiorId:interiors.active?.id||null};
  return {...context,preview:!!developerReturn,vehiclePose:simulation.player,jammerPoint,jammerTargets:securityCameras?.jammerTargets(jammerPoint)||0};
}
function currentGear(){return gearForMode(progression.state.gear,isSandbox());}
function cityState(){
  const roomId=interiors.active?.id,stash=roomId&&progression.isSafehouse(roomId)?progression.state.stashes[roomId]||emptyStash():null;
  const properties=progression.propertyOffers.map(offer=>({...offer,label:'House near '+(simulation.nearestRoad(offer.x,offer.z)?.road.name||'local street')}));
  const droneDealer=streetDealers.services.reduce((nearest,site)=>!nearest||Math.hypot(site.x-focus().x,site.z-focus().z)<Math.hypot(nearest.x-focus().x,nearest.z-focus().z)?site:nearest,null);
  const gearContext=utilityContext(),utilityAvailability=Object.fromEntries(['medkit','repair-kit','jammer'].map(item=>[item,progression.utilityAvailability(item,gearContext)]));
  const gear=currentGear();
  return {droneStrikeOwned:gear.droneStrike===true,cash:progression.state.cash,crewOffers:progression.crewOffers,hiredCrew:progression.state.hiredCrew,crew:campaignScenes.people,crewRenewals:Object.fromEntries(progression.crewOffers.map(offer=>[offer.id,progression.crewRenewalSerial(offer.id)])),properties,ownedProperties:progression.ownedProperties,stash,
    delivery:delivery?.snapshot(),deliveryOffers:deliveryCatalog.map(site=>({...site,items:(site.kind==='food'?['food']:site.weaponIds||[]).map(itemId=>({itemId,name:site.kind==='food'?'Meal':weaponById(itemId)?.name||itemId,...progression.quoteDelivery({sourceId:site.id,kind:site.kind,itemId},careerContext())}))})),
    weapons:WEAPON_IDS.map(weaponById),equipment:progression.state.equipment,gear,utilityAvailability,drone:drone.snapshot(),droneOwned:gear.drone===true,sandbox:isSandbox(),droneDealer};
}
function cityAction(action,value){
  const ctx={...careerContext(),sandbox:isSandbox()||!!developerReturn};let result={ok:false,message:'Action unavailable.'};
  if(action==='order-delivery')return orderDelivery(value);
  if(action==='track-delivery')return trackCourier();
  if(action==='camera-pulse')return pulseCameras();
  if(action==='drone-strike'){closeDialogs();return strikeDrone();}
  if(action==='cancel-delivery'){delivery?.cancel('Order cancelled');handleDeliveryEvents();result={ok:true,message:'Delivery cancelled. Payment refunded.'};}
  else if(action==='hire')result=progression.hireCrew(value,ctx);
  else if(action==='dismiss')result=progression.dismissCrew(value,ctx);
  else if(action==='rehire'){
    const person=campaignScenes.people.find(person=>person.id===value&&person.health<=0);
    result=person&&progression.crewRenewalSerial(value)<=(person.renewalSerial||0)?progression.rehireCrew(value,ctx):{ok:false,message:'Crew renewal is already pending or unavailable.'};
  }
  else if(action==='buy-property')result=progression.buyProperty(value,ctx);
  else if(action==='buy-drone')result=progression.buyDrone(ctx);
  else if(action==='buy-drone-strike')result=progression.buyDroneStrike({...ctx,mission:!!campaign.state.active});
  else if(action==='use-utility'){
    const utility=utilityContext();result=progression.useUtility(value,utility);
    if(result.ok){
      if(result.heal)gameplay.heal(result.heal);
      if(Number.isFinite(result.vehicleHealth))gameplay.state.vehicleHealth=result.vehicleHealth;
      if(result.kind==='jammer')securityCameras.jamNearby(utility.jammerPoint);
      streetUI?.refresh();
    }
  }
  else if(action==='stash'&&value&&typeof value==='object')result=progression.stash(interiors.active?.id,value.action,value.kind,value.id,value.amount,{...ctx,
    getInventory:()=>({equipment:{...progression.state.equipment},ammunition:gameplay.inventorySnapshot()}),takeInventory:item=>gameplay.takeInventory(item),giveInventory:item=>gameplay.giveInventory(item)});
  else if(action==='recall-drone')result={ok:recallDrone('recalled'),message:'Drone recalled.'};
  else if(action==='launch-drone'){
    closeDialogs();
    const owned=currentGear().drone===true;
    const allowed=!gameplay.state.passenger&&!activities.snapshot().active&&!streetChallenge()&&!micromobility.snapshot().active;
    const launched=allowed&&drone.deploy(gameplay.state,{owned,sandbox:isSandbox(),paused:paused(),interiorId:interiors.active?.id||null});
    if(launched){droneActive=true;refreshDroneNightVision();clearRecon();cameraReady=false;}
    result={ok:launched,message:launched?'Drone launched.':'Launch outside on foot with a drone.'};
  }
  if(result.ok&&!['launch-drone','recall-drone'].includes(action))saveCareer();
  clearInput();if(result.message)notify(result.message);cityUI?.render();return result;
}
function deliveryContext(){
  return {...rideContext(),onFoot:gameplay.state.mode==='foot'&&!gameplay.state.passenger,
    busy:!!(progression.state.activeJob||progression.state.activity||campaign.state.active||activities.snapshot().active||burglary.searching||micromobility.snapshot().active||streetChallenge()||rideService?.activeFare||buses?.passenger||aircraft?.active)};
}
function handleDeliveryEvents(){
  for(const event of delivery?.drainEvents()||[]){
    if(['completed','cancelled','failed','confiscated'].includes(event.type)){
      const redraw=followCourier&&$('map-dialog').open;
      followCourier=false;
      if(destination?.courierOrderId===event.orderId){destination=null;route=[];}
      if(redraw)drawMap($('full-map'),true);
      deliveryReceipts.clear();deliveryReceipts.set(event.orderId,event);
      const result=progression?.completeDelivery(event.orderId,careerContext());deliveryReceipts.delete(event.orderId);
      if(result?.ok){
        if(result.heal)gameplay.heal(result.heal);
        if(result.ammo)gameplay.addAmmo(result.ammo,result.weaponId);
        if(result.weaponId)gameplay.setWeapon(result.weaponId);
        const policeReported=result.method==='illegal'&&result.risk&&gameplay.resolveDeliveryRisk(result.risk);
        saveCareer();streetUI?.refresh();notify(policeReported&&result.risk==='reported'?`${result.message} Police spotted the handover.`:result.message);
      }
    }else if(event.type==='arrived')notify('Courier stopped. Walk beside the van and press E.');
  }
}
function resetDelivery(reason='Delivery cancelled'){
  if(!delivery)return;
  delivery.cancel(reason);handleDeliveryEvents();delivery.reset();handleDeliveryEvents();followCourier=false;deliveryReceipts.clear();
}
function orderDelivery(request){
  const ctx=careerContext(),quote=progression.quoteDelivery(request,ctx);
  if(!quote.ok)return quote;
  const booked=delivery.order(request,deliveryContext());
  if(!booked.ok)return {ok:false,message:booked.reason};
  const paid=progression.reserveDelivery(booked.orderId,request,ctx);
  if(!paid.ok){delivery.cancel(paid.message);handleDeliveryEvents();return paid;}
  handleDeliveryEvents();saveCareer();closeDialogs();clearInput();
  if(booked.dropoff)routeTo({...booked.dropoff,name:'Courier handover',label:'Meet the courier',courierOrderId:booked.orderId});
  notify(`${paid.method==='illegal'?'Illegal':'Legal'} courier dispatched. Meet the van at the marked stop.`);return paid;
}
function recallDrone(reason){
  const recalled=drone?.recall(reason)||false;droneActive=false;
  refreshDroneNightVision();
  if(recalled){clearInput();cameraReady=false;clearRecon();}
  return recalled;
}
function refreshDroneNightVision(){
  const button=$('drone-night-vision');
  button.hidden=!droneActive||compatibility;
  button.setAttribute('aria-pressed', String(droneActive&&drone.snapshot().nightVision===true));
}
function toggleDroneNightVision(){
  if(!droneActive||compatibility||paused())return;
  if(drone.setNightVision(!drone.snapshot().nightVision))refreshDroneNightVision();
}
$('drone-night-vision').addEventListener('click',()=>{
  toggleDroneNightVision();
  renderer?.domElement.focus();
});
function inventoryProfile(){return gameMode==='campaign'?campaign.state.character:'street';}
function captureCareerInventory(){
  if(developerReturn||!started||isSandbox())return;
  progression.saveInventory(inventoryProfile(),gameplay.inventorySnapshot());
  for(const person of campaignScenes.people){
    if(person.hired&&progression.crewRenewalSerial(person.id)<=(person.renewalSerial||0))progression.saveCrewHealth(person.id,person.health);
  }
}
function restoreCareerInventory(id=inventoryProfile()){
  if(developerReturn||isSandbox())return;
  const pools=progression.getInventory(id);if(pools)gameplay.restoreInventory(pools);
}
function resumeCheckpoint(checkpoint){
  const weapon=checkpoint?.weapon;
  if(weaponById(weapon)&&!progression.state.equipment[weapon]&&Object.values(progression.state.stashes||{}).some(stash=>Array.isArray(stash?.weapons)&&stash.weapons.includes(weapon)))return {...checkpoint,weapon:'unarmed'};
  return checkpoint;
}
function stepDrone(dt){
  if(!droneActive)return;
  const stick=moveStick.snapshot();
  droneInput.forward=THREE.MathUtils.clamp(Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'))-stick.y,-1,1);
  droneInput.right=THREE.MathUtils.clamp(Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'))+stick.x,-1,1);
  droneInput.lift=Number(keys.has('Space')||touch.has('handbrake'))-Number(keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.has('boost'));
  droneInput.yaw=footCameraYaw;droneInput.body=gameplay.state;droneInput.interiorId=interiors.active?.id||null;droneInput.paused=paused();
  drone.step(dt,droneInput);
  if(!drone.snapshot().active){droneActive=false;refreshDroneNightVision();clearInput();cameraReady=false;clearRecon();}
}
function strikeDrone(){
  const gear=currentGear();
  const result=drone.strike(gameplay.state,{owned:gear.drone===true,upgraded:gear.droneStrike===true,
    paused:paused(),interiorId:interiors.active?.id||null});
  if(result.ok&&applyWorldExplosion(result.event)){
    ordnance.showExplosion(result.event);
    if(!isSandbox()&&!developerReturn)gameplay.reportOffence('explosives',3,{witnessed:true,point:result.event});
  }
  notify(result.message);return result;
}
function applyWorldExplosion(event){
  if(!gameplay.applyExplosion(event))return false;
  if(!reducedCombatMotion.matches&&(event.interiorId||null)===(interiors.active?.id||null)){
    const listener=droneActive?drone.snapshot():focus();
    explosionShake.kick(Math.hypot(listener.x-event.x,listener.z-event.z,(listener.y??event.y??0)-(event.y??0)),event.radius,event.maxDamage);
  }
  return true;
}
function policeDroneSight(from,to,{unit}={}){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(distance)||distance<=0)return false;
  const ray={x:from.x,y:from.y,z:from.z,dx:dx/distance,dy:dy/distance,dz:dz/distance,range:distance,interiorId:null,
    ...(unit?.car?.id?{ignoreVehicleIds:[unit.car.id]}:{})};
  return !ordnance?.blocksSight(from,to,{interiorId:null})&&traceWorldShot(ray,null)>=distance-.02;
}
function droneCanOccupy(next,{from,radius=.45,height=.3}={}){
  if(!from||![next.x,next.y,next.z,from.x,from.y,from.z].every(Number.isFinite))return false;
  const dx=next.x-from.x,dy=next.y-from.y,dz=next.z-from.z,distance=Math.hypot(dx,dy,dz);
  if(distance>4||next.y-height/2<=world.groundHeightAt(next.x,next.z))return false;
  if(distance<1e-8)return true;
  for(const [x,y,z] of [[0,0,0],[-radius,0,0],[radius,0,0],[0,0,-radius],[0,0,radius],[0,-height/2,0],[0,height/2,0]]){
    const ray={x:from.x+x,y:from.y+y,z:from.z+z,dx:dx/distance,dy:dy/distance,dz:dz/distance,range:distance,interiorId:null};
    if(shotObstacles.trace(ray,null,[])<distance-1e-4)return false;
  }
  return true;
}
function cameraSight(from,to){
  if((from.interiorId||null)!==(to.interiorId||null))return false;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(distance)||distance<=0||distance>42||ordnance?.blocksSight(from,to,{interiorId:from.interiorId||null}))return false;
  // A sighting targets the occupied body, so its own vehicle is the endpoint,
  // while other cars and solid cover must still obstruct the camera.
  const player=focus(),occupied=!to.kind&&!interiors.active&&Math.hypot(to.x-player.x,to.z-player.z)<1e-6?
    aircraft?.active?.id||(buses?.passenger&&buses.seatPose?.id)||(rideService?.passenger&&rideService.seatPose?.id)||(gameplay.state.mode==='vehicle'?'player':null):null;
  const plan=from.interiorId?interiors.active:null;
  if(from.interiorId&&plan?.id!==from.interiorId)return false;
  return traceWorldShot({x:from.x,y:from.y,z:from.z,dx:dx/distance,dy:dy/distance,dz:dz/distance,range:distance,interiorId:from.interiorId||null,ignoreVehicleIds:occupied?[occupied]:[]},plan)>=distance-.02;
}
function cameraMountClear(from,to,plan){
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
  return Number.isFinite(distance)&&distance>0&&shotObstacles.trace({x:from.x,y:from.y,z:from.z,dx:dx/distance,dy:dy/distance,
    dz:dz/distance,range:distance,interiorId:plan?.id||null},plan,[])>=distance-.02;
}
function recordCameraCrime(kind,point=focus(),alreadyReported=false){
  if(isSandbox()||!securityCameras||!point||![point.x,point.z].every(Number.isFinite))return;
  const plan=interiors.active;
  securityCameras.reportCrime({serial:++cameraCrimeSerial,kind,level:1,x:point.x,z:point.z,
    y:point.crouching?(plan?.floorY??world.heightAt(point.x,point.z))+.85:plan?plan.floorY+1.35:undefined,
    interiorId:plan?.id||null,alreadyReported});
}
function recordCameraGameplayEvent(event){
  if(event.kind==='attack'&&(event.weapon||event.hits>0)&&typeof event.offenceReported==='boolean')recordCameraCrime(event.weapon?'gunfire':'assault',focus(),event.offenceReported);
}
function recordCameraWorkEvent(event){
  if(!['mugging-started','robbery-started'].includes(event.type))return;
  const reported=!isSandbox()&&gameplay.reportOffence(event.type==='mugging-started'?'mugging':'shop robbery',2,{witnessed:true,point:event.point});
  recordCameraCrime(event.type,event.point,reported);
}
function stepSecurityCameras(dt){
  const plan=interiors.active,p=focus();
  if(plan!==cameraRoomPlan){
    cameraRoomPlan=plan;
    securityCameras.setRoomCamera(shopCameraLocation(plan,cameraMountClear));
  }
  const player=p.crouching?{...p,y:(plan?.floorY??world.heightAt(p.x,p.z))+.85}:plan?{...p,y:plan.floorY+1.35}:p;
  securityCameras.step(dt,{player,wanted:gameplay.state.wanted,interiorId:plan?.id||null});
  for(const event of securityCameras.drainEvents()){
    if(event.type==='crime-spotted'&&!event.alreadyReported)gameplay.reportOffence('camera report',1,{witnessed:true,point:event});
    else gameplay.reportSighting(event);
  }
}
function updateCameraAlert(p){
  const notice=$('camera-alert');if(!notice)return;
  const state=securityCameras.nearStatus({...p,interiorId:interiors.active?.id||null});
  notice.hidden=!state;
  const message=state?.state==='jammed'?`Camera jammed · ${Math.ceil(state.jamRemaining)}s`:state?'Camera spotted you':'';
  if(notice.textContent!==message)notice.textContent=message;
}
function pulseCameras(){
  if(currentGear().scanner!==true)return {ok:false,message:'Buy a police scanner at an equipment dealer first.'};
  if(gameplay.state.recovery)return {ok:false,message:'Recover before using the scanner.'};
  const count=securityCameras.markNearby({...focus(),interiorId:interiors.active?.id||null});
  if(!count)return {ok:false,message:'No cameras detected nearby.'};
  const message=`Camera pulse marked ${count} ${count===1?'camera':'cameras'} on your map.`;
  closeDialogs();notify(message);
  return {ok:true,message,count};
}
let ordnance,ordnanceView,indoorOrdnanceView,atmosphereView,airportView,defenceDepotView,vehicleDamageView,playerCarKey=0,fireWarningKey=null;
const heroPowers=createHeroPowers(),atmosphere=createAtmosphere(),vehicleDamage=createVehicleDamage();
let stationDamage=null;
const vehicleFires=createVehicleFires({resolve:vehicleForGunfire,
  damage:(id,amount)=>typeof id==='string'&&id.startsWith('pump:')?stationDamage?.burn(id,amount)===true:damageWorldVehicle(id,amount),
  heightAt:car=>car.pump?car.y:world.vehicleHeightAt(car,car.edge?.road)});
let presentationOutcome={serial:0,roomId:null,outcome:null},workCompletion={serial:0,storeId:null};
let schoolEntry,schoolAlarmOutcome={serial:0,roomId:null,outcome:null},heistOutcome={serial:0,storeId:null,kind:null};
const cutscenes=createCutscenes(),renderGate=createRenderGate();
const framePacer=createFramePacer(),footMotion=createFootMotion();
let viewRevision=0,renderedFrames=0,missionToolsUnlocked=false,developerReturn=null;
let pendingCutscene=null,cutsceneAnchor=null,windowFocused=true;
let homeActionOutcome={serial:0,roomId:null,outcome:null},missionLocations,missionFootpath,missionGuideState=null,missionRing;
const policeRooms=createPoliceRooms({clipMovement:(room,actor,dx,dz,radius)=>{
  if(interiors?.active?.id!==room.id)return {dx,dz,blocked:false};
  let clipped=roomPeople.clipMovement(actor,dx,dz,radius);
  if(gameplay&&actor!==gameplay.state.actor)clipped=clipInteriorActors(actor,clipped.dx,clipped.dz,radius,[{...gameplay.state.actor,id:'player',radius:.45}]);
  return campaignScenes?.clipMovement({...actor,interiorId:room.id},clipped.dx,clipped.dz,radius)||clipped;
}});
let dialogueId=null,playerAppearanceId='player',protagonists;
let activities=createInteriorActivities(),roomPeople=createInteriorPeople(),roomPeopleView,micromobility,microView;
const miniKeys=new Set();
const rentalHack=createVehicleChallenge();
let rentalHackTarget=null;
let parkedView = null, selectedCar = 'lantern', selectedPaint = '#e7e6df';
let quality = 'low', started = false, disposed = false, lastTime = 0, accumulator = 0, lastRender = 0, hudTime = 0;
const graphicsPresets = ['realism', 'standard', 'low', 'performance'];
const graphicsTest = createGraphicsDiagnostics(graphicsPresets.map(id => ({id, fps:renderProfile(id).fps})));
let graphicsBeforeTest = null, graphicsResult = null;
let orbit = 0, orbitHeight = 0, orbitHold = 0, dragging = false, pointer = null, toastTimer;
let lookPitch = 0, footLookPitch = 0;
let shotObstacles,scanHeld=false,combatCueTime=0,reconGuideKey='',combatStatusTime=0,combatStatusText='',combatReloadDuration=0,evidenceSessionKey='';
const reconScreenPoint=new THREE.Vector3(),reducedCombatMotion=matchMedia('(prefers-reduced-motion: reduce)');
const stableCameraPosition=new THREE.Vector3(),explosionShake=createExplosionShake();
let fpsStart=0,fpsFrames=0;
const reconnaissance=createRecon();
let reconOutcome={serial:0,missionId:null,targetId:null},evidenceOutcome={serial:0,missionId:null,storeId:null,roomId:null};
let discovered = new Set(), mapImage, mapScale, savedError = '', routeClock = 0, audio = null;
let cameraReady = false, raf = 0, frameCount = 0;
let compatibility = false;
const parkedResources = [];
let pedestrians, neighbourhood;
let gameplay, progression, actorView, landmarkView, northPlacesView, regionalLandmarksView, streetUI, addressSearch;
let anuCampusView,macquarieShopsView;
let skylineJob,skylineOpponents,skylineSiteView,skylineLease=null,skylineAirPose=null,skylineHelicopter=null;
let skylineAtv,skylineAtvView,skylineCover=[];
let skylinePressure,skylinePressureView,skylineSupport,skylineBackup;
const SKYLINE_SITE=Object.freeze({x:2760,z:2750,yaw:0}),SKYLINE_WEAPON='carbine';
// While the Skylark retrieval is active, the river arm crossing the freight yard
// stops acting as a wall inside the yard ring; water rules elsewhere are unchanged.
const SKYLINE_YARD_RADIUS=283,
skylineYardWaterExempt=(x,z)=>Boolean(skylineJob?.snapshot().active)&&Math.hypot(x-SKYLINE_SITE.x,z-SKYLINE_SITE.z)<=SKYLINE_YARD_RADIUS;
const skylineSymbols=new Set();
let buses,busView,occupantsView,servicesView,previousActorMode='vehicle';
let gameMode = 'street', selectedGameMode = 'street', careerError = '', footCameraYaw = 0, careerNitro = 1;
let mouseAim = false, mouseFire = false, lastJobTarget = '';
const actionTouch = new Set(), abandonedMeshes = new Map();
const touchHolds = new Map();
let moveStick, lookStick;
const parkedSourceCars = [];
let carShadowGeometry, carShadowMaterial;
let mapSelection = null, mapDrag = null, showBusRoutes = false;
const mapView = { zoom: 1, x: null, z: null };
const MAP_MAX_ZOOM = 48;
let minimapZoomed = false;
const pedestrianFocus={id:'player',x:0,z:0,yaw:0,speed:0};
const occupantPoses=new Map(),occupantInputs=[],occupantIds=new Set();
const pedestrianContacts=[],externalPeopleContacts=[],auxiliaryContacts=[];
const playerContact={id:'player-body',x:0,z:0,radius:.35};
const activityUI=createActivityUI();
let tutorial=createTutorial(readTutorialPreference()),tutorialRunning=false,tutorialVisible=false,tutorialStamp='';
const tutorialSerials={orbitSerial:0,phoneSerial:0,mapRouteSerial:0,shopsSerial:0,jobsSerial:0};
try{$('guided-tutorial').checked=tutorial.snapshot().status==='active'||(tutorial.snapshot().status==='idle'&&tutorial.snapshot().savedValid&&!localStorage.getItem(CAREER_KEY));}catch{$('guided-tutorial').checked=true;}
function readTutorialPreference(){
  try{const raw=localStorage.getItem(TUTORIAL_KEY);return raw===null?null:raw.length<=256?JSON.parse(raw):false;}catch{return false;}
}
function tutorialContext(){
  const state=gameplay?.state;
  return {...tutorialSerials,started,paused:paused(),recovering:!!state?.recovery||!!state?.carjacking||(state?.actor.impactTime||0)>0||!!micromobility?.snapshot().active||!!activities.snapshot().active||!!streetChallenge(),
    interior:!!interiors?.active,cutscene:cutscenes.snapshot().active,mode:state?.passenger?'passenger':state?.mode,
    pose:gameplay?.focus(),speed:gameplay?.focus()?.speed||0};
}
function syncTutorial(){
  const snapshot=tutorial.snapshot();tutorialRunning=snapshot.active;
  const coarse=typeof matchMedia==='function'&&matchMedia('(pointer:coarse)').matches;
  const touchInstructions={look:'Move the right stick to look around.',walk:gameplay?.state.mode==='foot'?'Push the left stick to walk a few metres.':'Tap USE to stop, then USE again to get out. Walk with the left stick.',
    'enter-car':'Walk beside your car and tap USE to get in.',drive:'Push the left stick up to drive at least 10 metres.',brake:'Pull the left stick down to brake until you stop.',
    phone:'Tap Phone to open your phone.','map-route':'Tap Map, choose a destination and set a route.',shops:'Tap Pause, then Shops & gym to see nearby services.',jobs:'Tap Jobs to see your available work.'};
  const instruction=coarse?touchInstructions[snapshot.step]||snapshot.instruction:snapshot.instruction;
  if(tutorial.drainEvents().length){
    try{localStorage.setItem(TUTORIAL_KEY,JSON.stringify(tutorial.serialize()));}
    catch{$('tutorial-save-status').textContent='Tutorial progress could not be saved. You can still play.';}
  }
  const hidden=!tutorialVisible||!started||paused()||!!interiors?.active||!!gameplay?.state.recovery||(gameplay?.state.actor.impactTime||0)>0||!!micromobility?.snapshot().active||!!activities.snapshot().active||!!streetChallenge();
  const stamp=[hidden,snapshot.status,snapshot.index,instruction].join('|');
  if(stamp===tutorialStamp)return;tutorialStamp=stamp;
  $('tutorial-coach').hidden=hidden;document.body.classList.toggle('learning',!hidden);
  $('tutorial-title').textContent=snapshot.title;
  $('tutorial-instruction').textContent=snapshot.status==='complete'?'Keep exploring, choose a job from Jobs, or replay these controls from Help.':instruction;
  $('tutorial-step').textContent=snapshot.status==='complete'?'Tutorial complete':`Step ${snapshot.index+1} of ${snapshot.total}`;
  $('tutorial-progress').value=snapshot.index;
  $('tutorial-skip').hidden=snapshot.status==='complete';$('tutorial-done').hidden=snapshot.status!=='complete';
}
function observeTutorialMenu(menu){
  const key={phone:'phoneSerial','map-route':'mapRouteSerial',shops:'shopsSerial',jobs:'jobsSerial'}[menu];
  if(!key)return;tutorialSerials[key]++;
  if(tutorialRunning){tutorial.observeMenu(tutorialContext(),menu);syncTutorial();}
}
function setGameControls(enabled){
  for(const id of ['map-button','jobs-button','phone-button','services-button','garage-button','sound-button','pause-button'])$(id).disabled=!enabled;
}
function openHelp(){
  if(cutscenes.snapshot().active)return;
  clearInput();for(const dialog of dialogs)if(dialog.open)dialog.close();
  $('tutorial-replay').textContent=started?'Replay guided tutorial':'Learn when I start';$('help-dialog').showModal();
}
function startTutorial(){
  tutorial.start(tutorialContext());tutorialRunning=true;tutorialVisible=true;tutorialStamp='';syncTutorial();
}
$('help-button').addEventListener('click',openHelp);
$('intro-help-button').addEventListener('click',openHelp);
$('pause-help-button').addEventListener('click',openHelp);
$('pause-jobs-button').addEventListener('click',()=>openWork());
$('tutorial-replay').addEventListener('click',()=>{
  if(!started){$('guided-tutorial').checked=true;closeDialogs();$('guided-tutorial').focus();return;}
  if(gameplay.state.recovery||gameplay.state.actor.impactTime>0){$('tutorial-save-status').textContent='Recover before starting guided controls.';return;}
  if(interiors.active||gameplay.state.passenger||micromobility.snapshot().active||activities.snapshot().active){$('tutorial-save-status').textContent='Finish your activity or ride and step outside to start guided controls.';return;}
  closeDialogs();startTutorial();clearInput();renderer.domElement.focus();
});
$('tutorial-skip').addEventListener('click',()=>{tutorial.skip();tutorialRunning=false;tutorialVisible=false;syncTutorial();clearInput();renderer.domElement.focus();});
$('tutorial-done').addEventListener('click',()=>{tutorialVisible=false;syncTutorial();renderer.domElement.focus();});
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
    if (raw === null) return;
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
function paused() { return !started || cutscenes.snapshot().active || dialogs.some(dialog => dialog.open) || document.hidden; }
function liveTracking(){return started&&!document.hidden&&$('map-dialog').open&&((followYoober&&!!rideService?.activeFare&&!!rideService.vehicles[0].active)||(followCourier&&!!delivery?.busy&&!!delivery.vehicles[0].active));}
function clearInput() {
  miniKeys.clear(); keys.clear(); touch.clear(); actionTouch.clear();
  moveStick?.clear(); lookStick?.clear();
  for (const [button, hold] of touchHolds) {
    touchHolds.delete(button);
    if (button.hasPointerCapture(hold.id)) button.releasePointerCapture(hold.id);
  }
  mouseAim = false; mouseFire = false; dragging = false; pointer = null; mapDrag = null;scanHeld=false;
}
const isSandbox = () => gameMode === 'free';
const focus = () => skylineAirPose || (gameplay ? gameplay.focus() : simulation.player);
function protectedWork(){
  return tutorialRunning||(gameMode==='campaign'&&campaign?.state.active?.combat===false)||progression?.state.activity?.type==='work'||['delivery','ride'].includes(progression?.state.activeJob?.type);
}
function canCrewAttack(){return !paused()&&!cutscenes.snapshot().active&&!activities.snapshot().active&&!protectedWork();}
function canPlayerAttack(){return !skylineAirPose&&!droneActive&&!gameplay?.state?.actor?.swimming&&!watercraft?.isActive&&canCrewAttack();}
function directStation(station){const goal=campaign?.state.active?.target;return station&&(isWorkoutKind(station.kind)||['presentation','alarm'].includes(station.kind)||(gameMode==='campaign'&&['work','home-action','evidence'].includes(goal?.kind)&&station.kind===(goal.stationKind||'stock')));}
function powerContext(){
  const state=gameplay?.state;
  return {campaign:gameMode==='campaign',character:campaign?.state.character,mode:state?.mode,health:state?.health,
    manualDriving:state?.mode==='vehicle'&&!state.passenger,paused:paused(),protectedWork:protectedWork(),cutscene:cutscenes.snapshot().active,
    miniGame:!!activities.snapshot().active||!!streetChallenge(),recovering:!!state?.recovery,passenger:!!state?.passenger,impactTime:state?.actor.impactTime||0};
}
function activatePower(){const result=heroPowers.activate(campaign.state.character,powerContext());notify(result.message);}
function throwEquipment(kind){
  if(jetpack?.active||!canPlayerAttack()||!touchInputEnabled())return;
  const result=ordnance.throw(kind,{...careerContext(),pose:{...focus(),y:interiors.active?.floorY??world.heightAt(focus().x,focus().z)},aimYaw:footCameraYaw,interiorId:interiors.active?.id||null,passenger:gameplay.state.passenger});
  if(result.ok){if(kind==='grenade'&&!isSandbox())gameplay.reportOffence('explosives',3,{witnessed:true,point:focus()});if(!isSandbox())saveCareer();}
  notify(result.message);
}
function careerContext() {
  const state = gameplay.state;
  return { pose: focus(), onFoot: state.mode === 'foot'&&!state.passenger&&!jetpack?.active&&!state.actor.swimming, vehicleKey:playerCarKey,vehicle: { ...state.vehicle },
    wanted: state.wanted, vehicleHealth: state.vehicleHealth, respawnSerial: state.respawnSerial, aircraft:aircraft?.active||null,
    health:state.health,weapon:state.weapon,reserveAmmo:state.reserveAmmo,ammunition:Object.fromEntries(WEAPONS.map(w=>[w.id,gameplay.getAmmo(w.id)])),planId:interiors.active?.id,passenger:!!state.passenger,recovering:!!state.recovery,sandbox:isSandbox(),campaign:gameMode==='campaign',interior:interiorContext(),presentation:presentationOutcome,workCompletion,schoolAlarm:schoolAlarmOutcome,heist:heistOutcome,homeAction:homeActionOutcome,encounter:roomPeople?.encounter,recon:reconOutcome,evidence:evidenceOutcome,stealthOutcome,
    assassinationOutcome,aftermathResolved:!developerReturn&&campaignAftermath?.isCase(campaign.state.active?.id)?campaignAftermath.recorded(campaign.state.active.id):undefined };
}
function rideContext(){
  return {pose:focus(),onFoot:gameplay.state.mode==='foot',sandbox:isSandbox(),wanted:gameplay.state.wanted,
    recovering:!!gameplay.state.recovery,indoors:!!interiors.active,
    busy:!!(progression.state.activeJob||progression.state.activity||campaign.state.active||micromobility.snapshot().active||streetChallenge()||activities.snapshot().active||buses?.passenger)};
}
function busContext(){const context=rideContext();return {...context,busy:!!(progression.state.activeJob||progression.state.activity||campaign.state.active||micromobility.snapshot().active||streetChallenge()||activities.snapshot().active||rideService?.activeFare)};}
function railContext(){
  const state=gameplay.state;
  return {pose:focus(),indoors:!!interiors.active,recovering:!!state.recovery,onFoot:state.mode==='foot'&&!state.passenger&&!state.actor.swimming,
    busy:!!(tutorialRunning||campaign.state.active||progression.state.activeJob||progression.state.activity||activities.active||streetChallenge()||micromobility.active||rideService?.activeFare)};
}
function heistContext(){
  const state=gameplay.state,pose=focus(),plan=interiors.active;
  const room=plan?.heist?{id:plan.id,storeId:plan.storeId,heistSiteId:plan.heistSiteId,employeeId:plan.heist.employee.id,exit:plan.exit,loot:plan.heist.loot,console:plan.heist.console}:null;
  return {pose,room,employee:room?roomPeople.getCrimeTarget(room.employeeId):null,doorway:!!room&&interiors.nearExit(pose),
    armed:!!weaponById(state.weapon)&&(isSandbox()||progression.state.equipment[state.weapon]===true),
    aiming:mouseAim||keys.has('KeyZ')||actionTouch.has('aim'),aimYaw:footCameraYaw,
    onFoot:state.mode==='foot'&&!state.passenger,indoors:!!plan,swimming:!!state.actor.swimming,
    paused:paused(),recovering:!!state.recovery,sandbox:isSandbox(),wanted:state.wanted,
    railPassenger:!!lightRail?.passenger,railStopId:lightRail?.passengerStopId,
    busy:!!(tutorialRunning||developerReturn||campaign.state.active||progression.state.activeJob||progression.state.activity||state.carjacking||activities.active||
      micromobility.active||burglary.active||aircraft?.active||aircraft?.challenge.active||rentalHack.active||watercraft?.isActive||rideService?.activeFare||buses?.passenger)};
}
function toggleHeistHostage(){
  if(!heists?.active)return false;
  const context=heistContext();
  if(!heists.hostageAction(context))return false;
  const result=heists.toggleHostage(context);
  if(result?.message)notify(result.message);
  return !!result;
}
$('heist-hostage').addEventListener('click',()=>{
  toggleHeistHostage();
  renderer?.domElement.focus();
});
function interactLightRail(){
  if(!lightRail)return false;
  const context=railContext();
  if(!lightRail.passenger&&(!context.onFoot||context.indoors||context.busy||!lightRail.nearStop(context.pose)))return false;
  const result=lightRail.interact(context);
  if(result?.exitPose){
    const {x,z,yaw}=result.exitPose;const actor=gameplay.state.actor;
    delete actor.y;Object.assign(actor,{x,z,yaw,speed:0,jumpHeight:0});footCameraYaw=yaw;
  }
  if(result?.boarded||result?.exited){cameraReady=false;clearInput();}
  if(result?.message||result?.reason)notify(result.message||result.reason);
  return true;
}
function interactHeist(){
  if(!heists)return false;
  const result=heists.interact(heistContext());
  if(!result)return false;
  interiorView.setHeistTarget?.(heists.snapshot().indoorTarget);
  clearInput();notify(result.message);return true;
}
function interactDepotTank(){
  if(!depotTank)return false;
  const pose=focus(),state=gameplay.state,onFoot=state.mode==='foot'&&!state.passenger&&!state.actor.swimming;
  if(!depotTank.isActive&&(!onFoot||interiors.active||!depotTank.nearest(pose)))return false;
  const result=depotTank.interact({pose,onFoot,valid:!tutorialRunning&&!developerReturn&&!streetChallenge()&&!activities.active,
    paused:paused(),indoors:!!interiors.active,sandbox:isSandbox(),recovering:!!state.recovery});
  if(result.stolen&&!isSandbox())gameplay.reportOffence('depot tank theft',3,{witnessed:true,point:pose});
  if(result.ok&&result.pose&&!depotTank.isActive){
    const {x,z,yaw}=result.pose;
    Object.assign(state.actor,{x,z,yaw,speed:0,jumpHeight:0});footCameraYaw=yaw;
  }
  if(result.ok){clearInput();cameraReady=false;}
  if(result.message)notify(result.message);
  return true;
}
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
function trackCourier(){
  const tracking=delivery?.tracking();
  if(!tracking)return {ok:false,message:'No active courier to track.'};
  followYoober=false;followCourier=true;
  mapView.x=tracking.car.x;mapView.z=tracking.car.z;mapView.zoom=6;
  $('map-zoom-level').textContent='6×';closeDialogs();clearInput();openDialog('map-dialog');
  return {ok:true,message:'Following your courier live.'};
}
function trackYoober(){
  if(!rideService?.activeFare)return;
  followCourier=false;followYoober=true;const car=rideService.vehicles[0];mapView.x=car.x;mapView.z=car.z;mapView.zoom=6;
  $('map-zoom-level').textContent='6×';openDialog('map-dialog');
}
const airNavigationActive = () => !!(aircraft?.active||jetpack?.active||droneActive||skylineAirPose);
function navigationFlightPose(){
  if(droneActive)return drone.snapshot();
  return skylineAirPose||aircraft?.active||(jetpack?.active?focus():null);
}
const skylineObjective=()=>skylineLease?skylineJob.snapshot().marker:null;
function updateNavigation(){
  const flight=navigationFlightPose();
  const objective=skylineObjective()||destination;
  airGuideState=flight&&objective?aerialGuidance(flight,objective):null;
  if(guidanceRoute!==route){guidance.setRoute(route,destination);guidanceRoute=route;}
  guideState=flight?null:guidance.update(focus());
  const atObjective=destination?.campaignObjective&&guideState?.kind==='arrive'&&guideState.distance<35&&gameplay.state.mode==='foot';
  const navigation=$('navigation-hud');
  navigation.hidden=(!guideState&&!airGuideState)||!objective||!!interiors.active||!started||atObjective;
  if(!navigation.hidden&&airGuideState){
    const {distance,turnAngle,arrived}=airGuideState;
    $('navigation-distance').textContent=distance>=1000?`${(distance/1000).toFixed(1)} km`:`${Math.round(distance)} m`;
    const gate=skylineLease&&skylineJob.snapshot().stage==='flight',rise=gate?objective.y-flight.y:0;
    $('navigation-instruction').textContent=gate&&Math.abs(rise)>25?`${rise>0?'Climb':'Descend'} ${Math.round(Math.abs(rise))} m to gate`:
      arrived?'Over target':objective.label||`Fly to ${objective.name}`;
    const symbol=$('navigation-symbol');
    symbol.setAttribute('d',arrived?'M12 42 V6 H36 V24 H12':'M24 43 V6 M12 18 L24 6 L36 18');
    symbol.setAttribute('transform',arrived?'':`rotate(${turnAngle*180/Math.PI} 24 24)`);
  }else if(!navigation.hidden){
    const distance=guideState.distance>=1000?`${(guideState.distance/1000).toFixed(1)} km`:`${Math.max(0,Math.round(guideState.distance/5)*5)} m`;
    $('navigation-distance').textContent=distance;
    $('navigation-instruction').textContent=guideState.offRoute?'Rejoin the route':({left:'Turn left',right:'Turn right',uturn:'Make a U-turn',straight:'Continue',arrive:'Destination'}[guideState.kind]);
    const paths={right:'M12 42 V23 Q12 12 23 12 H39 M29 3 L39 12 L29 21',left:'M36 42 V23 Q36 12 25 12 H9 M19 3 L9 12 L19 21',uturn:'M36 42 V17 Q36 5 24 5 Q12 5 12 17 V28 M3 19 L12 28 L21 19',straight:'M24 43 V6 M12 18 L24 6 L36 18',arrive:'M12 42 V6 H36 V24 H12'};
    $('navigation-symbol').setAttribute('d',paths[guideState.kind]||paths.straight);
    $('navigation-symbol').removeAttribute('transform');
  }
  const tracking=rideTracking();
  $('yoober-follow-map').hidden=!tracking.car;
  $('yoober-track-state').hidden=!tracking.car;
  if(tracking.car){
    $('yoober-track-state').textContent=tracking.phase==='waiting'?'Yoober at pickup':`${followYoober&&liveTracking()?'Live Yoober':'Yoober'} · ${tracking.distance} m · ~${Math.max(1,Math.ceil(tracking.eta/60))} min`;
    if(followYoober&&liveTracking()){mapView.x=tracking.car.x;mapView.z=tracking.car.z;}
  }
  const courier=delivery?.tracking();
  const courierButton=$('courier-follow-map'),courierStatus=$('courier-track-state');
  if(courierButton) courierButton.hidden=!courier;
  if(courierStatus) courierStatus.hidden=!courier;
  if(courier){
    const label=courier.method==='illegal'?'Illegal courier':'Legal courier';
    const eta=courier.eta<60?`${Math.max(1,courier.eta)} s`:`${Math.ceil(courier.eta/60)} min`;
    if(courierStatus) courierStatus.textContent=courier.phase==='waiting'?`${label} at handover stop`:`${followCourier&&liveTracking()?'Live · ':''}${label} · ${courier.distance} m · ~${eta}`;
    if(followCourier&&liveTracking()){mapView.x=courier.car.x;mapView.z=courier.car.z;}
  }else followCourier=false;
}
const emptyView=()=>({update(){},dispose(){},stats:{}});
function moveBody(actor,dx,dz,radius=.45,swim=false){
  if(swim&&actor.swimming&&!interiors?.active&&simulation.waterAt(actor.x+dx,actor.z+dz,{underBridge:true}))return simulation.moveSwimmingActor(actor,dx,dz,radius);
  if(!interiors?.active&&stunts&&world){const here=stunts.heightAt(actor.x,actor.z),next=stunts.heightAt(actor.x+dx,actor.z+dz);if(next!==null&&next-Math.max(here??-Infinity,world.groundHeightAt(actor.x,actor.z))>.6+(actor.jumpHeight||0))return {blocked:true,dx:0,dz:0};}
  const clip=interiors?.active?roomPeople.clipMovement(actor,dx,dz,radius):pedestrians?.clipMovement(actor,dx,dz,radius)||{dx,dz,blocked:false};
  const policeClip=interiors?.active?clipInteriorActors(actor,clip.dx,clip.dz,radius,gameplay?.state.police.filter(unit=>unit.interiorId===interiors.active.id&&unit.health>0)||[]):clip;
  const contact=!interiors?.active?streetDealers?.clipMovement(actor,clip.dx,clip.dz,radius)||policeClip:policeClip;
  const driverContact=!interiors?.active?rideService?.clipMovement(actor,contact.dx,contact.dz,radius)||contact:contact;
  const castActor=interiors?.active?{...actor,interiorId:interiors.active.id}:actor;
  const castContact=campaignScenes?.clipMovement(castActor,driverContact.dx,driverContact.dz,radius)||driverContact;
  const sweep=swim?simulation.moveSwimmingActor:simulation.moveActor;
  const result=interiors?.active?interiors.moveActor(actor,castContact.dx,castContact.dz,radius):sweep(actor,castContact.dx,castContact.dz,radius);
  return {...result,blocked:result.blocked||clip.blocked||policeClip.blocked||contact.blocked||driverContact.blocked||castContact.blocked};
}
function servicePosition(site){
  const plan=interiors?.active;
  if(site.type==='gym'){
    if(plan?.serviceId===site.id){
      const station=activities.snapshot().active?activities.snapshot().station:activities.nearest(focus(),availableHouseStation);
      if(isWorkoutKind(station?.kind))return {x:station.x,z:station.z,radius:station.radius};
      return {...plan.counter,radius:plan.counter.radius};
    }
    const entry=gymEntries.find(item=>item.serviceId===site.id);
    if(entry)return {x:entry.x-Math.sin(entry.yaw)*2,z:entry.z-Math.cos(entry.yaw)*2};
  }
  if(plan?.storeId===site.id&&progression?.state.activity?.type==='work'){const {x,z,yaw,radius}=progression.state.activity.station;return {x,z,yaw,radius};}
  return plan?.storeId===site.id?{...plan.counter,radius:plan.counter.radius}:null;
}
function miniInput(){return {x:keys.has('KeyX')||miniKeys.has('x'),y:keys.has('KeyY')||miniKeys.has('y'),up:keys.has('ArrowUp')||miniKeys.has('up')};}
function stopMini(){if(skylineLease&&skylineJob.snapshot().stage==='safe'){skylineJob.cancel();handleSkylineEvents();return;}if(heists?.active&&heists.snapshot().challenge)heists.cancel();burglary.cancel();aircraft?.clearChallenge();activities.cancel();rentalHack.cancel();rentalHackTarget=null;gameplay?.cancelCarjacking();progression?.cancelActivity();clearInput();}
function availableHouseStation(station){return !burglary.hasSearched(station.id)&&(!burglary.searching||station.kind==='stock');}
function nearbyActivityStation(pose){
  const active=gameMode==='campaign'&&campaign?.state.active,plan=interiors?.active;
  const preferred=active&&plan?missionLocations.guide(active,{pose,plan})?.stationId:null;
  return activities.nearest(pose,availableHouseStation,preferred);
}
function beginMini(id){
  if(jetpack?.active)return;
  if(!interiors?.active||paused()||activities.snapshot().active)return;
  const station=id?interiors.active.activities.find(s=>s.id===id):nearbyActivityStation(focus());
  if(station&&burglary.hasSearched(station.id)){notify('Already searched. Find another cabinet or leave through the door.');return;}
  if(station?.kind==='rest'&&!isSandbox()){
    const reason=!progression.isSafehouse(interiors.active.id)?'Rest at an owned safehouse.':gameplay.state.health>=100?'Health is already full.':progression.state.cash<80?'Rest costs $80.':progression.state.activeJob?'Finish your current job before resting.':null;
    if(reason){notify(reason);return;}
  }
  if(!station){notify('Walk to an activity station.');return;}
  if(!activities.start(station.id,{...careerContext(),visible:visible(focus(),station)})){progression.cancelActivity();notify('Move closer and finish any current activity.');return;}
  if(isWorkoutKind(station.kind)&&!isSandbox()&&progression.state.fitnessLevel<3){
    const result=progression.startActivity(interiors.active.serviceId,'workout',careerContext());
    if(!result.ok){activities.cancel();notify(result.message);return;}
  }
  if(!isSandbox()&&interiors.active.storeId&&['noodle','stock'].includes(station.kind)){
    const shift=progression.startShift(interiors.active.storeId,careerContext());
    if(!shift.ok){activities.cancel();notify(shift.message);return;}
    notify(shift.message);
  }else notify(station.label);
  clearInput();
}
function aircraftContext(){
  const state=gameplay.state;
  return {pose:focus(),onFoot:state.mode==='foot'&&!state.passenger,sandbox:isSandbox(),
    valid:started&&!state.recovery&&state.health>0&&!(state.actor.impactTime>0)&&!interiors.active&&(!campaign.state.active||campaign.state.active.aviation===true||campaign.state.active.target?.kind==='escape')&&
      !progression.state.activeJob&&!progression.state.activity&&!activities.snapshot().active&&!rentalHack.snapshot().active&&!state.carjacking&&
      !micromobility.snapshot().active&&!rideService?.activeFare&&!buses?.passenger&&!cutscenes.snapshot().active&&!developerReturn};
}
function aircraftInput(){
  const controls=input();
  return {throttle:controls.throttle,turn:controls.steer,climb:controls.handbrake,descend:controls.boost,challenge:miniInput()};
}
function refreshAircraftRescue(){
  const wrecked=!!aircraft?.active?.wrecked;
  $('recover-button').hidden=!isSandbox()&&!wrecked;
  $('recover-button').textContent=wrecked?'Request rescue':'Return to road';
}
function aircraftStandParking(plane){
  const planes=aircraft.snapshot().planes;
  const radius=Math.hypot(Math.max(6,simulation.player.length||0),Math.max(2.6,simulation.player.width||0))/2+.75;
  const helicopter=plane.kind==='helicopter';
  for(const side of helicopter?[0,5,-5,9,-9]:[14,-14,18,-18])for(const forward of helicopter?[14,-14,20,-20]:[0,6,-6,12]){
    const pose={x:plane.x+Math.cos(plane.yaw)*side-Math.sin(plane.yaw)*forward,
      z:plane.z-Math.sin(plane.yaw)*side-Math.cos(plane.yaw)*forward};
    if(planes.some(other=>Math.hypot(pose.x-other.x,pose.z-other.z)<=Math.hypot(other.length,other.width)/2+radius))continue;
    // Search results retain the arrival car's yaw. Clear its complete turning
    // envelope, including the rendered wing span that exceeds car-body width.
    if([0,Math.PI/4,Math.PI/2,Math.PI*3/4].every(yaw=>simulation.canOccupy({...pose,yaw},
      {length:radius*2,width:4,ignoreId:'player'})))return pose;
  }
  return null;
}
function aircraftAltitude(){const plane=aircraft?.active;if(plane)return Math.max(0,plane.y-world.heightAt(plane.x,plane.z));if(jetpack?.active)return gameplay.state.actor.jumpHeight;const car=simulation?.player;return gameplay?.state.mode==='vehicle'&&car?.stuntActive?Math.max(0,car.stuntY-.18-world.groundHeightAt(car.x,car.z)):0;}
function jetpackContext(){
  return {owned:currentGear().jetpack===true,paused:paused(),interior:!!interiors.active,mission:!!campaign.state.active,
    job:!!progression.state.activeJob,activity:!!(progression.state.activity||activities.active||streetChallenge()),
    drone:droneActive,aircraft:!!aircraft?.active,micromobility:!!micromobility?.active,
    launchAllowed:!tutorialRunning&&!developerReturn&&!gameplay.state.actor.swimming&&!rideService?.activeFare&&!delivery?.busy};
}
function refreshJetpackBodies(pose){
  jetpackBodies=simulation.nearbyVehicles(pose.x,pose.z,12);
  for(const vehicles of [buses?.vehicles,lightRail?.vehicles,rideService?.vehicles,delivery?.vehicles,
    gameplay.policeWrecks,gameplay.state.police.map(unit=>unit.car)]){
    for(const vehicle of vehicles||[])if(vehicle&&Math.hypot(vehicle.x-pose.x,vehicle.z-pose.z)<=18)jetpackBodies.push(vehicle);
  }
}
function toggleJetpack(){
  const context=jetpackContext();
  if(!context.owned&&!jetpack?.active){notify(`Buy a jetpack for $${JETPACK_OFFER.price.toLocaleString('en-AU')} at ${JETPACK_OFFER.siteName}. Find it in Shops (K).`);return;}
  const actor=gameplay.state.actor;
  if(!jetpack.active){
    context.feetY=world.heightAt(actor.x,actor.z);
    refreshJetpackBodies(actor);
  }
  if(!jetpack?.toggle(gameplay.state,context)){
    notify(jetpack.chargeFraction<.15?'The jetpack needs time on the ground to refill.':'Start the jetpack on clear ground outside between jobs.');return;
  }
  clearInput();
  notify(jetpack.landing?'Jetpack landing.':'Jetpack ready · Space rises · Shift descends · U lands');
}
function cockpitAvailable(){
  return started&&!compatibility&&!interiors?.active&&!aircraft?.active&&!droneActive&&
    gameplay?.state.mode==='vehicle'&&!gameplay.state.passenger&&!gameplay.state.recovery&&!cutscenes.snapshot().active&&!!playerMesh?.userData.cockpit?.eye;
}
function toggleCockpit(){
  if(!cockpitAvailable())return;
  cockpitCamera=!cockpitCamera;cameraReady=false;orbit=lookPitch=orbitHeight=orbitHold=0;viewRevision++;
}
function aircraftObstacles(){return (aircraft?.snapshot().planes||[]).filter(plane=>!plane.airborne).map(plane=>({...plane,width:plane.kind==='helicopter'?3.4:4}));}
function activeWorldRecord(){
  if(developerReturn||isSandbox())return null;
  return gameMode==='campaign'?campaignWorld:streetWorld;
}
function resetCampaignWorld(){
  const state=activeWorldRecord()?.snapshot();
  aircraft?.reset({absentAircraft:state?.absentAircraft});
  for(const post of policeStations?.restoreHealth(state?.policePosts||{})||[]){
    shotObstacles?.setBarrierDestroyed(post.id,post.destroyed);
  }
}
function handleAircraftEvents(){
  for(const event of aircraft?.drainEvents()||[]){
    if(event.type==='stolen'&&!event.sandbox)gameplay.reportOffence('aircraft theft',3,{witnessed:true,point:event.pose});
    if(activeWorldRecord()?.recordAircraftTheft(event))saveCareer();
    if(event.type==='impact'&&aircraft?.active?.id===event.id&&!isSandbox())gameplay.state.health=Math.max(0,gameplay.state.health-event.damage);
    if(event.type==='boarded'||event.type==='exited'){cameraReady=false;clearInput();heroPowers.cancelActive();}
    if(event.reason)notify(event.reason);
  }
}
function updateAircraft(dt){
  aircraft?.step(dt,aircraftInput(),aircraftContext());handleAircraftEvents();
}
function skylineContext(enemyOutcomes=[]){
  const state=gameplay.state,pose=focus(),pilot=aircraft.active;
  const craft=pilot?.id===skylineHelicopter?.id?pilot:skylineHelicopter;
  const onFoot=state.mode==='foot'&&!state.passenger&&!state.actor.swimming&&!skylineAirPose&&!interiors.active;
  return {player:{...pose,y:!onFoot&&Number.isFinite(pose.y)?pose.y:world.heightAt(pose.x,pose.z)},onFoot,
    recovering:!!state.recovery,dead:state.health<=0,enemyOutcomes,
    extraction:craft?{...craft,vehicleId:craft.id,active:!craft.wrecked,
      boarded:pilot?.id===craft.id,pilotControlled:pilot?.id===craft.id&&!craft.wrecked}:null};
}
function skylineLaunchReason(){
  if(skylineLease)return 'This retrieval is already active.';
  if(!skylineJob)return 'The extraction yard is unavailable.';
  if(campaign.state.active||progression.state.activeJob||interiors.active||tutorialRunning||droneActive)
    return 'Finish the current activity and go outside first.';
  if(Math.abs(focus().speed||0)>2)return 'Stop moving before starting the retrieval.';
  return missionLaunchReason();
}
function renderSkylineOffer(){
  const active=!!skylineLease,reason=skylineLaunchReason();
  $('skylark-offer').textContent=isSandbox()?'Free roam practice · About 15 minutes':'Repeatable job · About 15 minutes · $8,500';
  $('skylark-start').hidden=active;$('skylark-start').disabled=!!reason;
  $('skylark-cancel').hidden=!active;
  $('skylark-open-support').hidden=!active;
  const status=$('skylark-status');status.hidden=!reason;
  status.textContent=active?skylineJob.snapshot().objective:reason;
}
function openSkylineOffer(){if(started){renderSkylineOffer();openDialog('skylark-dialog');}}
function skylineRadioContext(mission=skylineJob.snapshot()){
  const context=skylineContext(),state=gameplay.state;
  return {...context,mission,missionId:mission.missionId,encounterId:mission.encounterId,active:mission.active,health:state.health,
    onFoot:context.onFoot&&!(state.actor.impactTime>0),paused:document.hidden};
}
function canOrderSkylineSupport(id,context){
  if(id==='backup')return skylineBackup.canRequest(context.mission,context);
  if(id==='resupply'){
    const ammo=gameplay.getAmmo(SKYLINE_WEAPON),weapon=weaponById(SKYLINE_WEAPON);
    const needed=!!ammo&&ammo.reserveAmmo<weapon.reserveCap||context.health<100;
    return needed?{ok:true}:{ok:false,message:'Your health and carbine reserve are full.'};
  }
  return {ok:id==='jammer'};
}
function applySkylineSupport(id,context){
  if(id==='backup')return skylineBackup.request(context.mission,context);
  if(id==='resupply'){
    const ammo=gameplay.addAmmo(48,SKYLINE_WEAPON),healed=gameplay.heal(40);
    return ammo||healed?{ok:true,message:'Resupply received.'}:{ok:false,message:'Your health and carbine reserve are full.'};
  }
  return {ok:id==='jammer',message:'Drone jammer active for 20 seconds.'};
}
function renderSkylineRadio(message=''){
  const funds=skylineSupport.snapshot(),context=skylineRadioContext();
  $('skylark-support-balance').textContent=`$${funds.balance.toLocaleString('en-AU')} available · $${funds.spent.toLocaleString('en-AU')} spent`;
  const status=$('skylark-support-status');status.hidden=!message;status.textContent=message;
  const choices=skylineSupport.offers(context).map(offer=>{
    const button=document.createElement('button');
    button.type='button';button.textContent=`${offer.name} · $${offer.cost.toLocaleString('en-AU')}`;
    button.disabled=!offer.available;button.title=offer.reason;
    button.addEventListener('click',()=>{
      const result=skylineSupport.buy(offer.id,skylineRadioContext());
      if(result.ok){closeDialogs();notify(result.message);}
      else renderSkylineRadio(result.message);
    });
    return button;
  });
  $('skylark-support-actions').replaceChildren(...choices);
}
function openSkylineRadio(){
  if(!started||!skylineLease)return;
  const context=skylineRadioContext();
  if(!context.onFoot||context.dead||context.recovering){notify('Use the support radio on foot.');return;}
  if(context.mission.stage==='safe'){notify('Step away from the safe panel to use the radio.');return;}
  renderSkylineRadio();openDialog('skylark-support-dialog');
}
function setSkylineCover(active){
  if(active)simulation.registerStaticBarriers(skylineCover);
  else simulation.unregisterStaticBarriers(skylineCover);
  for(const part of skylineCover)shotObstacles.setBarrierDestroyed(part.id,!active);
}
function skylineOpponentSight(from,to){
  if(!visible(from,to))return false;
  // Player bullets already pass through the height-aware shot trace.
  if(!Number.isFinite(from.y)||!Number.isFinite(to.y)||Number.isFinite(from.range))return true;
  const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z,range=Math.hypot(dx,dy,dz);
  return range<.03||shotObstacles.trace({x:from.x,y:from.y,z:from.z,dx:dx/range,dy:dy/range,dz:dz/range,range})>=range-.02;
}
function startSkyline(){
  const blocked=skylineLaunchReason();if(blocked){notify(blocked);return;}
  saveCareer();
  const start=skylineJob.start();if(!start.ok){notify(start.message);return;}
  const state=gameplay.state;
  skylineLease={body:{...protagonistCheckpoint(),...gameplay.missionRecoverySnapshot()},destination};
  setSkylineCover(true);
  const atv=skylineAtv.spawn(skylineJob.layout.landing);
  if(!atv.ok){skylineJob.fail('The ATV parking spot is blocked. Start the retrieval again.');handleSkylineEvents();return;}
  skylineSymbols.clear();footMotion.capture(null,null);
  state.mode='foot';state.actor.swimming=false;
  const loan=weaponById(SKYLINE_WEAPON);
  gameplay.restoreInventory({...gameplay.inventorySnapshot(),[SKYLINE_WEAPON]:{ammo:loan.magazine,reserveAmmo:loan.reserveCap}});
  gameplay.setWeapon(SKYLINE_WEAPON);
  placeSkylineFall(skylineJob.snapshot().pose);
  footCameraYaw=state.actor.yaw;footLookPitch=-.36;cameraReady=false;
  routeTo(null);closeDialogs();renderer.domElement.focus();handleSkylineEvents();notify(start.message);
}
function placeSkylineFall(pose,stage='freefall'){
  skylineAirPose={...pose,speed:Math.abs(pose.verticalSpeed||0),skydive:stage==='flare'?'flare':'fall'};
  Object.assign(gameplay.state.actor,{x:pose.x,z:pose.z,yaw:pose.yaw,speed:0,
    jumpHeight:Math.max(0,pose.y-world.heightAt(pose.x,pose.z))});
}
function handleSkylineEvents(){
  for(const event of skylineJob.drainEvents()){
    if(event.type==='landing-flare'){
      clearTimeout(toastTimer);$('toast').hidden=true;
    }else if(event.type==='landed'){
      const {pose}=event;
      if((simulation.waterAt(pose.x,pose.z,{underBridge:true})&&!skylineYardWaterExempt(pose.x,pose.z))||simulation.moveActor({...pose},0,0,.45).blocked){
        skylineJob.fail('Landing blocked. Aim for the marked drop zone.');continue;
      }
      skylineAirPose=null;
      Object.assign(gameplay.state.actor,{x:pose.x,z:pose.z,yaw:pose.yaw,jumpHeight:0,speed:0});
      footMotion.capture(null,null);cameraReady=false;
      notify('On the ground. Press E beside the ATV to ride to the first cache.');
    }else if(event.type==='reinforcement-alert'){
      notify('The cache crew called for backup. Get behind cover.');
    }else if(event.type==='cache-searched'){
      notify('Cache secured. Press T to trade loot for support.');
    }else if(event.type==='extraction-ready'){
      const result=aircraft.addJobHelicopter(event.vehicleId,event.pad);
      if(result.ok){skylineHelicopter=result.aircraft;notify('Extraction helicopter is on the pad.');}
      else notify(result.reason);
    }else if(event.type==='board-request'){
      const entered=aircraft.interact(aircraftContext());
      if(entered.boarded){clearInput();cameraReady=false;notify('Pilot through the three marked air gates.');}
      else notify(entered.reason||'Move to the helicopter door and press E.');
    }else if(event.type==='complete'||event.type==='failed'||event.type==='cancelled'){
      finishSkyline(event);
    }
  }
}
function finishSkyline(event){
  const lease=skylineLease;if(!lease)return;
  const succeeded=event.type==='complete';
  const settlement=succeeded?skylineSupport.complete(skylineJob.snapshot(),{missionId:event.missionId}):null;
  const reward=settlement?.reward??(succeeded?Math.max(0,event.reward-skylineSupport.snapshot().spent):0);
  skylineSupport.clear();skylinePressure.reset();skylineBackup.reset();
  skylineLease=skylineAirPose=null;skylineSymbols.clear();skylineOpponents.clear();
  skylineAtv.reset();setSkylineCover(false);syncExternalVehicles();
  if(skylineHelicopter)aircraft.releaseJobHelicopter(skylineHelicopter.id);
  skylineHelicopter=null;
  const state=gameplay.state;
  const restored=!succeeded&&!aircraft.active&&gameplay.restoreMissionCheckpoint(lease.body).ok;
  if(!restored){
    state.actor.jumpHeight=0;
    gameplay.restoreInventory({...gameplay.inventorySnapshot(),[SKYLINE_WEAPON]:lease.body.ammunition[SKYLINE_WEAPON]});
    gameplay.setWeapon(lease.body.weapon);
  }
  routeTo(lease.destination);clearInput();footMotion.capture(null,null);cameraReady=false;
  if(succeeded&&!isSandbox()){progression.state.cash=Math.min(1000000000,progression.state.cash+reward);saveCareer();}
  notify(succeeded?(isSandbox()?'Retrieval complete.':`Retrieval complete. +$${reward.toLocaleString('en-AU')}`):event.reason||'Retrieval abandoned.');
}
function updateSkyline(dt,walk){
  if(!skylineLease)return;
  if(skylineAtv.seatPose)skylineAtv.step(dt,input(),{valid:!gameplay.state.recovery&&gameplay.state.health>0});
  const mission=skylineJob.snapshot();
  const ctx=skylineRadioContext(mission);
  skylinePressure.step(dt,mission,{...ctx,jammed:skylineSupport.jammerActive});
  for(const event of skylinePressure.drainEvents()){
    if(event.type!=='airstrike-impact'||event.missionId!==mission.missionId)continue;
    const kind='skylark-airstrike';
    const blast={type:'explosion',id:event.id,kind,x:event.x,y:world.groundHeightAt(event.x,event.z)+.2,z:event.z,
      interiorId:null,...blastLimits(kind)};
    if(applyWorldExplosion(blast))ordnance.showExplosion(blast);
  }
  skylineOpponents.step(dt,mission,{...ctx,active:mission.active,health:gameplay.state.health});
  ctx.health=gameplay.state.health;ctx.dead=ctx.health<=0;
  skylineBackup.step(dt,mission,ctx);
  skylineBackup.drainEvents();
  ctx.enemyOutcomes=skylineOpponents.drainEvents();
  const pressed=miniInput();let confirmSymbol;
  for(const [key,down] of Object.entries(pressed)){
    if(down&&!skylineSymbols.has(key)){skylineSymbols.add(key);confirmSymbol??=key;}
    else if(!down)skylineSymbols.delete(key);
  }
  if(ctx.extraction?.boarded&&!ctx.extraction.active)skylineJob.fail('Extraction helicopter disabled.');
  skylineJob.step(dt,ctx,{steerX:walk.moveX,steerZ:walk.moveZ,confirmSymbol});
  const next=skylineJob.snapshot();
  skylineSupport.step(dt,next,{...ctx,active:next.active});
  if(next.stage==='freefall'||next.stage==='flare')placeSkylineFall(next.pose,next.stage);
  handleSkylineEvents();
}
function nearbySkylineAtv(pose){
  const atv=skylineAtv.vehicle;
  return atv&&Math.hypot(atv.x-pose.x,atv.z-pose.z)<=3;
}
function interactSkylineAtv(ctx){
  const ride=skylineAtv.interact({pose:ctx.player,onFoot:ctx.onFoot,
    valid:!ctx.dead&&!ctx.recovering&&!(gameplay.state.actor.impactTime>0)});
  if(ride.exitPose){
    const {x,z,yaw}=ride.exitPose;
    delete gameplay.state.actor.y;
    Object.assign(gameplay.state.actor,{x,z,yaw,speed:0,jumpHeight:0});
    footCameraYaw=yaw;
  }
  if(ride.boarded||ride.exited){clearInput();cameraReady=false;}
  if(ride.boarded)notify('WASD drive. Stop and press E to hop off.');
  else if(ride.exited)notify('Off the ATV.');
  else if(ride.reason==='stop-before-exit')notify('Stop the ATV before hopping off.');
  else if(ride.reason==='atv-exit-blocked')notify('Move the ATV to a clear spot before hopping off.');
  else notify('Move beside the ATV on foot.');
}
function interactSkyline(){
  if(!skylineLease)return false;
  const mission=skylineJob.snapshot();
  if(skylineAirPose)return true;
  if(skylineAtv.seatPose){interactSkylineAtv(skylineContext());return true;}
  if(mission.stage==='flight'){notify('Fly through the remaining marked gates.');return true;}
  if(mission.stage==='boarding'&&!aircraft.active){interactAircraft();return true;}
  if(mission.stage==='safe')return true;
  if(mission.stage==='helipad'&&!skylineHelicopter){
    const result=aircraft.addJobHelicopter(mission.extraction.vehicleId,mission.layout.helipad);
    if(!result.ok){notify(result.reason);return true;}skylineHelicopter=result.aircraft;
  }
  const ctx=skylineContext(),result=skylineJob.interact(ctx);
  if(!result.ok&&ctx.onFoot&&nearbySkylineAtv(ctx.player)){interactSkylineAtv(ctx);return true;}
  handleSkylineEvents();if(!aircraft.active)notify(result.message);
  return true;
}
$('skylark-menu').addEventListener('click',openSkylineOffer);
$('jobs-skylark').addEventListener('click',openSkylineOffer);
$('skylark-open-support').addEventListener('click',openSkylineRadio);
$('skylark-start').addEventListener('click',startSkyline);
$('skylark-cancel').addEventListener('click',()=>{skylineJob.cancel();handleSkylineEvents();closeDialogs();});
function interactAircraft(){
  if(!aircraft)return false;
  if(!aircraft.active&&!aircraft.challenge.active&&(gameplay.state.mode!=='foot'||gameplay.state.passenger||interiors.active))return false;
  if(!aircraft.active&&!aircraft.challenge.active&&!aircraft.nearest(focus()))return false;
  const result=aircraft.interact(aircraftContext());
  if(result.exited&&result.exitPose){Object.assign(gameplay.state.actor,result.exitPose,{speed:0,jumpHeight:0});footCameraYaw=result.exitPose.yaw;}
  handleAircraftEvents();clearInput();cameraReady=false;
  notify(result.reason||(result.boarded?'Aircraft controls ready.':result.exited?'Out of the aircraft.':'Match the lock cues.'));
  return true;
}
function streetChallenge(){
  const mission=skylineLease&&skylineJob.snapshot();
  if(mission?.stage==='safe'){
    const {sequence,index,round,remaining,mistakes}=mission.safe;
    return {active:true,label:`Skylark safe · Row ${round+1} of 3`,sequence,index,mistakes,phase:'cue',
      expectedKey:sequence[index],cueWindow:sequence.length*2.4,cueRemaining:remaining,
      guidance:'Match the displayed row. Release each key between presses.'};
  }
  const heist=heists?.active&&heists.snapshot().challenge;
  if(heist)return heist;
  if(burglary.active)return {...burglary.snapshot(),label:'House lock · Alternating beats'};
  if(aircraft?.challenge.active)return {...aircraft.challenge,aircraft:true,label:`${aircraft.challenge.aircraftKind} console`};
  const hack=rentalHack.snapshot();
  if(hack.active)return {...hack,label:'Scooter lock · Quick cues'};
  const theft=gameplay?.state.carjacking;
  if(theft?.challenge)return {...theft.challenge,active:true,label:`Parked car · ${theft.challenge.label}`,progress:theft.progress};
  if(theft)return {active:true,kind:'car',phase:'waiting',label:theft.occupied?'Taking vehicle':'Parked car lock',
    prompt:theft.occupied?'Stay alongside until the driver stops. E cancels.':'Move beside the stopped car. E cancels.',progress:0,remaining:Math.max(0,8-theft.waited)};
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
function burglaryContext(){
  return {...careerContext(),sandbox:isSandbox()||!!developerReturn,interiorId:interiors.active?.id||null,
    paused:paused(),mission:!!campaign.state.active,job:!!progression.state.activeJob,
    sprinting:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.has('boost'),attackSerial:(gameplay.state.attackSerial||0)+(gameplay.state.combatFeedback?.shotSerial||0)};
}
function requestHouseEntry(entry){
  if(entry.type!=='house'||isSandbox()||progression.isSafehouse(entry.id))return false;
  const cooldown=progression.state.burglaryCooldowns[entry.id]||0;
  if(cooldown>0){notify(`This house was searched recently. Try again in ${Math.ceil(cooldown/60)} minutes.`);return true;}
  const startedLock=burglary.start({...entry,owned:false,safehouse:false},burglaryContext());
  clearInput();notify(startedLock?'Follow the house lock cues. E cancels.':'Stand close to the house door and finish your current mission or job.');
  return true;
}
function renderBurglaryHUD(){
  const state=burglary.snapshot(),node=$('burglary-status');
  const searching=state.sessionPhase==='searching';node.hidden=!searching;
  if(searching)node.textContent=`${state.carriedLoot}/${state.totalStations} valuables · Noise ${Math.round(state.noise)}% · Alarm ${Math.round(state.alarm)}%. Walk quietly; Q searches; leave through the door to bank loot.`;
}
function updateBurglary(dt){
  if(!burglary.active&&!burglary.searching)return;
  const ctx=burglaryContext();
  if(burglary.active)burglary.step(dt,miniInput(),ctx);
  burglary.stepSession(dt,ctx);
  for(const event of burglary.drainEvents()){
    if(event.type==='complete'){
      const entry=interiors.entries.find(item=>item.id===event.targetId);
      const outside={...focus()};
      if(entry&&!progression.isSafehouse(entry.id)&&burglary.consumeEntry(entry.id,burglaryContext())){
        enterInterior(entry);
        if(interiors.active?.id===entry.id&&burglary.entered(interiors.active)){
          notify('Move quietly. Q searches cabinets. Leave through the door with the loot.');
        }else notify('The door landing is blocked.');
      }
    }else if(event.type==='alarm'){gameplay.reportOffence('house alarm',2,{witnessed:true,point:event.point});playSchoolAlarm();notify('House alarm triggered. Police are responding.');}
    else if(event.type==='failed')notify(event.reason);
    if(event.type!=='alarm')clearInput();
  }
}
function recordEvidence(event){
  if(event.kind!=='evidence'||event.type!=='complete'||event.outcome!=='secured'||isSandbox())return false;
  const active=campaign.state.active,goal=active?.target,plan=interiors.active,terminal=activities.snapshot();
  const key=`${active?.id}:${event.planId}:${event.sessionId}`;
  if(key===evidenceSessionKey||goal?.kind!=='evidence'||plan?.storeId!==goal.storeId||plan.id!==event.planId||
    event.stationId!==`${plan.id}-evidence`||event.stationId!==terminal.station?.id||event.sessionId!==terminal.sessionId||
    terminal.kind!=='evidence'||terminal.phase!=='complete'||gameplay.state.mode!=='foot'||gameplay.state.passenger||gameplay.state.health<=0||gameplay.state.recovery)return false;
  evidenceSessionKey=key;evidenceOutcome={serial:evidenceOutcome.serial+1,missionId:active.id,storeId:plan.storeId,roomId:plan.id,outcome:'secured'};
  notify('Ledger case secured. Get the crew out.');return true;
}
function updateMini(){
  for(const event of activities.drainEvents()){
    let burglaryMessage=null;
    const houseResult=houseController?.recordActivity(event,burglaryContext());
    if(houseResult?.handled)burglaryMessage=houseResult.message;
    recordEvidence(event);
    const workout=progression.state.activity;
    if(isWorkoutKind(event.kind)&&workout?.type==='workout'&&event.sessionId===workout.sessionId&&event.planId===workout.planId&&event.station?.id===workout.station?.id){
      const result=progression.finishWorkout(careerContext(),event.type==='complete');
      if(result.ok)saveCareer();
    }
    if(event.kind==='presentation'&&event.type==='complete'&&event.outcome==='outage'){
      const terminal=activities.snapshot(),plan=interiors.active;
      if(plan?.id===event.planId&&event.sessionId===terminal.sessionId&&event.stationId===terminal.station?.id&&terminal.phase==='complete'&&gameplay.state.mode==='foot'){
        presentationOutcome={serial:presentationOutcome.serial+1,roomId:plan.id,outcome:'outage'};
        notify('Microstall PowerPunt is unavailable. Your slideshow could not be saved.');
      }
    }
    if(event.kind==='alarm'&&event.type==='complete'&&event.outcome==='triggered'&&!isSandbox()){
      const terminal=activities.snapshot(),plan=interiors.active;
      if(plan?.type==='school'&&plan.id===event.planId&&event.sessionId===terminal.sessionId&&event.stationId===terminal.station?.id&&terminal.phase==='complete'&&gameplay.state.mode==='foot'){
        schoolAlarmOutcome={serial:schoolAlarmOutcome.serial+1,roomId:plan.id,outcome:'triggered'};
        gameplay.reportOffence('false alarm',1,{witnessed:true,point:focus()});
        roomPeople.alert({...focus(),radius:30,kind:'alarm',offenderId:'alarm-system'});
        playSchoolAlarm();notify('School alarm. Get outside and stay out of sight.');
      }
    }
    if(event.kind==='stock'&&event.type==='complete'&&!isSandbox()){
      const terminal=activities.snapshot(),plan=interiors.active,home=map.storyHomes?.basement;
      if(plan?.type==='house'&&plan.id===home?.roomId&&plan.id===event.planId&&event.sessionId===terminal.sessionId&&event.id===`${plan.id}-stash`&&terminal.station?.id===event.id&&terminal.phase==='complete'&&gameplay.state.mode==='foot')homeActionOutcome={serial:homeActionOutcome.serial+1,roomId:plan.id,outcome:'packed'};
    }
    if(progression.state.activity?.type==='work'&&event.sessionId===progression.state.activity.sessionId&&event.planId===progression.state.activity.planId){
      const result=progression.finishShift(careerContext(),event.type==='complete');
      if(result.ok)saveCareer();
    }
    if(event.type==='complete'&&event.heal&&event.kind!=='rest'&&!isSandbox())gameplay.heal(event.heal);
    if(event.type==='complete'||event.type==='failed')notify(burglaryMessage||event.reason);
  }
  let previous=activities.snapshot();
  if(!previous.active&&previous.kind&&previous.station&&interiors.active&&Math.hypot(focus().x-previous.station.x,focus().z-previous.station.z)>previous.station.radius+1){activities.load(interiors.active);previous=activities.snapshot();}
  const street=streetChallenge(),state=street||previous,nearest=interiors?.active&&nearbyActivityStation(focus());
  const gym=isWorkoutKind(nearest?.kind)?progression.services.find(site=>site.id===interiors.active.serviceId):null;
  activityUI.render({street,state,nearest,interior:interiors?.active,safehouse:!!interiors.active&&progression.isSafehouse(interiors.active.id),sandbox:isSandbox(),fitnessLevel:progression.state.fitnessLevel,gymPrice:gym?.price||120});
}
$('activity-start').addEventListener('click',()=>{renderer.domElement.focus();beginMini();});
$('activity-cancel').addEventListener('click',stopMini);
$('activity-done').addEventListener('click',()=>{if(!activities.snapshot().active&&interiors.active){activities.load(interiors.active);clearInput();renderer.domElement.focus();}});
for(const button of document.querySelectorAll('[data-mini]')){
  button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);miniKeys.add(button.dataset.mini);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>miniKeys.delete(button.dataset.mini));
}
function openPhone(){
  if(skylineLease){openSkylineRadio();return;}
  if(jetpack?.active){notify('Land the jetpack before ordering a service.');return;}
  if(!started)return;
  cityUI?.render();
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
  $('personal-car-route').disabled=gameplay.state.mode!=='foot'||gameplay.state.passenger||!!interiors.active||!!gameplay.state.recovery;
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
$('courier-follow-map')?.addEventListener('click',trackCourier);
$('phone-button').addEventListener('click',openPhone);
$('personal-car-route').addEventListener('click',()=>{
  if(gameplay.state.mode!=='foot'||gameplay.state.passenger||interiors.active||gameplay.state.recovery)return;
  routeTo({...simulation.player,id:'personal-car',name:'Your '+(vehicles.find(car=>car.id===gameplay.state.vehicle.modelId)?.label||'car')});
  closeDialogs();notify('Follow the route to your car. E gets in.');
});
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
    if(interiors.active.heist)return null;
    const id=interiors.active.storeId;
    if(id&&!progression.robberyEligibility(id,careerContext()))return {type:'robbery',serviceId:id};
    return null;
  }
  const armed=!!weaponById(gameplay.state.weapon)&&!!progression.state.equipment[gameplay.state.weapon],pose=focus();
  const person=pedestrians.snapshot().filter(person=>person.health>0&&(armed||person.threatened)&&Math.hypot(person.x-pose.x,person.z-pose.z)<=2.6&&visible(pose,person)).sort((a,b)=>Math.hypot(a.x-pose.x,a.z-pose.z)-Math.hypot(b.x-pose.x,b.z-pose.z))[0];
  return person?{type:'mugging',targetId:`ped:${person.id}`}:null;
}
function visible(a,b,ignoreSmoke=false){
  const room=policeRooms.current;
  const space=pose=>pose&&Object.hasOwn(pose,'interiorId')?(pose.interiorId||null):room?.contains(pose)?room.id:null;
  const first=space(a),second=space(b);
  if(first!==second)return false;
  if(!ignoreSmoke&&ordnance?.blocksSight(a,b,{interiorId:first}))return false;
  if(first)return !!policeRooms.resolve(first)?.hasLineOfSight(a,b);
  return simulation.hasLineOfSight(a,b);
}
function clearInterior(){
  burglary.reset();houseController?.reset();
  recallDrone('reset');
  campaignScenes?.leaveInterior();activeCrewEntry=null;indoorCampaignScenesView?.dispose();indoorCampaignScenesView=null;
  policeRooms.clear();
  stopMini();activities.clear();roomPeople.clear();roomPeopleView?.clear();interiors?.reset();interiorView?.clear();indoorActorView?.dispose();indoorActorView=null;
}
function resolveInquiry(result){
  if(!result)return;
  inquiryOfficer=null;
  if(result.severity&&gameplay.state.wanted===0)gameplay.reportOffence('witness description',result.severity,{point:result.point,witnessed:true});
  notify(result.message);
}
function openInquiry(){
  if(!campaignAftermath?.canSpeak(focus())||interiors.active||gameplay.state.mode!=='foot'||gameplay.state.passenger)return false;
  const file=campaignAftermath.current();
  $('inquiry-line').textContent=file.civilianHarm?'A witness says someone else was hurt in the fight. What happened?':
    file.witnesses?`I’m taking descriptions from ${file.witnesses} people who saw the booth fight. Can you tell me what happened?`:'I’m checking what happened at the booth. Would you like to give a statement?';
  openDialog('inquiry-dialog');
  return true;
}
for(const button of document.querySelectorAll('[data-inquiry-answer]'))button.addEventListener('click',()=>{
  const result=campaignAftermath.choose(button.dataset.inquiryAnswer,{pose:focus(),onFoot:gameplay.state.mode==='foot'&&!gameplay.state.passenger,indoors:!!interiors.active});
  if(result){closeDialogs();resolveInquiry(result);}
});
function placeInquiryOfficer(pose){
  for(const [side,forward] of [[2,1],[-2,1],[2,-1],[-2,-1],[0,2]]){
    const point={x:pose.x+Math.cos(pose.yaw)*side-Math.sin(pose.yaw)*forward,
      z:pose.z-Math.sin(pose.yaw)*side-Math.cos(pose.yaw)*forward};
    if(simulation.hasLineOfSight(pose,point)&&!simulation.moveActor({...point},0,0,.45).blocked)return point;
  }
  return {x:pose.x,z:pose.z};
}
function enterInterior(entry){
  recallDrone('interior');
  const outside={...gameplay.state.actor};
  const known=gameplay.state.wanted>0&&gameplay.state.police.some(unit=>unit.health>0&&!unit.interiorId&&unit.seesPlayer&&simulation.hasLineOfSight(unit,outside));
  const plan=interiors.enter(entry,gameplay.state.actor);
  if(!plan)return;
  footCameraYaw=gameplay.state.actor.yaw;footLookPitch=0;
  const safehouse=progression?.isSafehouse(plan.id)||map.storyHomes?.basement?.roomId===plan.id;
  const gate=CAMPUS_GATES.find(gate=>gate.id===entry.gateId);
  const approach=gate?[gate.outside,{x:gate.x,z:gate.z},gate.inside].map(p=>Array.isArray(p)?{x:p[0],z:p[1]}:p):[];
  policeRooms.enter(plan,entry,{outside:interiors.exteriorPose||outside,safehouse,known,units:gameplay.state.police,approach});
  interiorView.load(plan);activities.load(plan);roomPeople.load(plan);roomPeopleView?.load(plan);
  activeCrewEntry=entry;campaignScenes?.enterInterior(plan,entry,interiors.exteriorPose||outside);
  indoorCampaignScenesView?.dispose();indoorCampaignScenesView=null;
  if(!compatibility)indoorActorView=createActorView(interiorScene,()=>plan.floorY,{policeLimit:safehouse?0:6,policeCars:false});
  syncPlayerAppearance();
  const entryHint=campaign.state.active?.target.roomId===plan.id?'Follow the marked objective.':
    plan.heist?.kind==='memorial'?'Walk to the exhibition case and press E / USE.':
    plan.heist?'Approach the employee to start a hold-up.':'E at the door leaves.';
  cameraReady=false;clearInput();notify(`${plan.name}. ${entryHint}`);
}
function leaveInterior(){
  const roomId=interiors.active?.id;
  const mission=campaign?.state.active?.id,encounter=roomPeople.encounter;
  const cases=gameMode==='campaign'&&!developerReturn&&campaignAftermath?.isCase(mission)&&encounter?.missionId===mission;
  const bystanders=cases?roomPeople.snapshot().filter(person=>person.character!=='booth-guest'):[];
  if(bystanders.some(person=>person.health<100))inquiryHarm=true;
  if(!interiors.leave(gameplay.state.actor))return;
  const houseResult=houseController?.afterExit(roomId,burglaryContext());
  campaignScenes?.leaveInterior();activeCrewEntry=null;indoorCampaignScenesView?.dispose();indoorCampaignScenesView=null;
  policeRooms.leave();policeRooms.prune(gameplay.state.police);
  stopMini();activities.clear();roomPeople.clear();roomPeopleView?.clear();interiorView.clear();indoorActorView?.dispose();indoorActorView=null;
  progression.cancelActivity();cameraReady=false;clearInput();notify(houseResult?.message||'Outside.');
  if(cases&&encounter.outcome==='noodle-victory'){
    const pose=gameplay.state.actor,point=placeInquiryOfficer(pose);
    if(campaignAftermath.begin(mission,point,{witnesses:bystanders.filter(person=>person.health>0).length,civilianHarm:inquiryHarm})){
      inquiryOfficer={...point,id:'campaign-inquiry-officer',mode:'foot',health:100,yaw:Math.atan2(point.x-pose.x,point.z-pose.z),speed:0};
      notify('Police are taking witness descriptions. Speak to the officer or leave the area.');
    }
  }
}
function nitroContext(){
  const state=gameplay?.state,car=simulation?.player;
  if(!started||!car||state?.mode!=='vehicle'||droneActive||aircraft?.active||jetpack?.active)return null;
  return {
    pose:car,onFoot:false,sandbox:isSandbox(),interior:!!interiors.active,
    passenger:state.passenger,recovering:!!state.recovery,airborne:!!car.stuntActive,
    health:state.health,vehicleHealth:state.vehicleHealth,wanted:state.wanted,respawnSerial:state.respawnSerial,
  };
}
function nitroOfferForCar(){
  const context=nitroContext();
  return context?progression.nitroOffer(simulation.driving,context):null;
}
function refillCarNitro(){
  const context=nitroContext(),offer=context&&progression.nitroOffer(simulation.driving,context);
  if(!offer)return false;
  if(offer.moving){
    Object.assign(simulation.player,{speed:0,vx:0,vz:0});clearInput();
    notify('Stopped at the nitro bay. Press E or USE again to refill.');return true;
  }
  if(!offer.ok){
    if(offer.station&&stationDamage?.outOfService(offer.station.id)){notify('The petrol station is burning.');return true;}
    return false;
  }
  const result=progression.refillNitro(simulation.driving,context);
  if(result.ok&&!isSandbox())saveCareer();
  notify(result.message);streetUI.refresh();return true;
}
function carRentalContext(){
  return {...careerContext(),airborne:!!simulation.player.stuntActive,
    busy:!!(developerReturn||tutorialRunning||campaign.state.active||progression.state.activeJob||progression.state.activity||
      activities.snapshot().active||streetChallenge()||rideService?.activeFare||delivery?.busy||droneActive||jetpack?.active||aircraft?.active||micromobility?.active)};
}
function installRentalVehicle(vehicle,mode,exit){
  const state=gameplay.state,rented=carRental.active;
  selectedPaint=typeof vehicle.color==='number'?'#'+vehicle.color.toString(16).padStart(6,'0'):vehicle.color;
  state.vehicle={modelId:vehicle.modelId,color:selectedPaint,stolen:!!vehicle.stolen,...(rented?{rented:true}:{})};
  state.vehicleHealth=vehicle.health;state.mode=mode;
  if(exit){Object.assign(state.actor,exit);footCameraYaw=exit.yaw;footLookPitch=0;}
  else Object.assign(state.actor,{speed:0,jumpHeight:0});
  simulation.setPlayerVehicle({modelId:vehicle.modelId,color:parseInt(selectedPaint.slice(1),16)});
  playerCarKey++;cockpitCamera=false;cameraReady=false;clearInput();selectVehicle(vehicle.modelId);
}
function openRentalDesk(site){
  const status=$('car-rental-status'),options=$('car-rental-options');
  $('car-rental-title').textContent=site.name;
  status.textContent=carRental.active?'Return your current rental to a marked bay first.':'';
  options.replaceChildren();
  if(!carRental.active)for(const offer of CAR_RENTAL_OFFERS){
    const button=document.createElement('button');button.type='button';button.dataset.rentalCar=offer.modelId;
    button.textContent=`${offer.name} · ${isSandbox()?'Free':'$'+offer.price}`;
    button.disabled=!isSandbox()&&progression.state.cash<offer.price;
    button.addEventListener('click',()=>{
      if(!$('car-rental-dialog').open)return;
      const ctx=carRentalContext();
      saveCareer();
      const result=carRental.rent(site.id,offer.modelId,ctx);
      if(!result.ok){status.textContent=result.message;return;}
      closeDialogs();saveCareer();streetUI.refresh();notify(result.message);
    });options.append(button);
  }
  openDialog('car-rental-dialog');
}
function interactCarRental(){
  if(!carRental)return false;
  const context=carRentalContext();
  if(carRental.rentalBay(context)){
    const result=carRental.returnCar(context);
    if(result.ok){saveCareer();streetUI.refresh();renderer.domElement.focus();}
    notify(result.message);return true;
  }
  const site=carRental.desk(context);
  if(!site)return false;
  openRentalDesk(site);return true;
}
function watercraftContext(){
  const state=gameplay.state;
  const busy=!!(progression.state.activity||activities.snapshot().active||state.carjacking||streetChallenge()||micromobility.active||rideService?.activeFare);
  const afloat=watercraft?.isActive===true;
  return {...careerContext(),onFoot:state.mode==='foot'&&!state.passenger,interior:interiors.active,indoors:!!interiors.active,
    recovering:!!state.recovery,paused:paused(),sandbox:isSandbox(),preview:!!developerReturn,health:state.health,
    swimming:!!state.actor.swimming,watercraft:afloat,busy,aircraft:aircraft?.active,
    valid:!interiors.active&&!jetpack?.active&&!droneActive&&!busy&&!developerReturn&&!state.recovery&&state.health>0&&(!state.passenger||afloat)};
}
function nearBoatShed(){
  if(!watercraftDock||!gameplay||gameplay.state.mode!=='foot'||interiors.active||
    gameplay.state.passenger||gameplay.state.actor.swimming||gameplay.state.recovery)return false;
  const pose=focus();
  return Math.hypot(pose.x-watercraftDock.x,pose.z-watercraftDock.z)<=watercraftDock.radius&&simulation.hasLineOfSight(pose,watercraftDock);
}
function enterWatercraft(id){
  const result=watercraft.board(id,watercraftContext());
  if(result.ok){closeDialogs();clearInput();cameraReady=false;orbit=lookPitch=orbitHeight=0;}
  notify(result.message);
}
function renderBoatShed(message=''){
  const list=$('watercraft-offers');list.replaceChildren();
  const ctx=watercraftContext(),money=progression.state.cash;
  const craftByKind=new Map(watercraft.vehicles.map(craft=>[craft.kind,craft]));
  for(const offer of WATERCRAFT_OFFERS){
    const row=document.createElement('article'),title=document.createElement('h3'),info=document.createElement('p');
    const craft=craftByKind.get(offer.kind),owned=isSandbox()||progression.ownsWatercraft(offer.kind);
    title.textContent=offer.name;
    const status=owned?(isSandbox()?'Available in Free roam':'Owned'):'$'+offer.price.toLocaleString();
    info.textContent=`${Math.round(offer.maxSpeed*3.6)} km/h top speed · ${status}`;
    const action=document.createElement('button');action.type='button';
    if(owned){
      action.dataset.boardWatercraft=offer.kind;action.textContent='Board';
      action.disabled=!craft||!ctx.valid||Math.hypot(ctx.pose.x-craft.x,ctx.pose.z-craft.z)>7;
      action.addEventListener('click',()=>enterWatercraft(craft.id));
    }else{
      action.dataset.buyWatercraft=offer.kind;action.textContent='Buy';
      action.disabled=!ctx.valid||!nearBoatShed()||money<offer.price;
      action.addEventListener('click',()=>{
        const result=progression.buyWatercraft(offer.kind,watercraftContext());
        if(result.ok)saveCareer();
        renderBoatShed(result.message);
      });
    }
    row.append(title,info,action);list.append(row);
  }
  $('watercraft-message').textContent=message||(isSandbox()?'Choose a craft to board.':'Available cash · $'+money.toLocaleString());
}
function interactWatercraft(){
  if(!watercraft||!gameplay)return false;
  const ctx=watercraftContext();
  if(watercraft.isActive){
    const result=watercraft.dismount(ctx);
    if(result.ok){
      const {x,z,yaw}=result.pose,actor=gameplay.state.actor;
      delete actor.y;
      Object.assign(actor,{x,z,yaw,speed:0,jumpHeight:0});
      gameplay.syncSwimming({underBridge:result.swimming});
      footCameraYaw=result.pose.yaw;footLookPitch=0;cameraReady=false;clearInput();
    }
    notify(result.message);return true;
  }
  if(!ctx.onFoot||ctx.indoors||!ctx.valid)return false;
  const nearest=watercraft.nearest(ctx.pose);
  if(nearBoatShed()){
    renderBoatShed();openDialog('watercraft-dialog');return true;
  }
  if(nearest){enterWatercraft(nearest.id);return true;}
  if(ctx.swimming)notify('Swim to shore or to your moored watercraft.');
  return ctx.swimming;
}
function interiorHint(){
  if(skylineLease){
    const {stage,marker}=skylineJob.snapshot(),pose=focus();
    if(stage==='freefall')return 'WASD steer · Release over the ring';
    if(stage==='flare')return '';
    if(stage==='flight')return aircraft.snapshot().prompt;
    if(skylineAtv.seatPose)return 'WASD drive ATV · E / USE hop off when stopped';
    const action={search:'Activate cache',capture:'Capture cache','safe-approach':'Open safe',loot:'Collect case',helipad:'Board helicopter',boarding:'Board helicopter'}[stage];
    if(action&&marker&&Math.hypot(marker.x-pose.x,marker.z-pose.z)<=marker.radius)return `E / USE · ${action}`;
    return nearbySkylineAtv(pose)?'E / USE · Ride the ATV':'';
  }
  if(jetpack?.active)return 'SPACE rise · SHIFT descend · U land · Z aim';
  if(inquiryOfficer&&!interiors.active&&campaignAftermath.canSpeak(focus()))return 'E / USE · Speak to the investigating officer';
  const railJourney=lightRail?.passengerJourney;
  if(railJourney)return lightRail.passengerStopId
    ? `To ${railJourney.destination} · E / USE exits here`
    : `Next ${railJourney.nextStop} · E / USE requests exit`;
  if(depotTank?.isActive)return 'WASD drive tank · Space brake · E / USE exit when stopped';
  if(watercraft?.isActive)return 'W/S throttle · A/D steer · Space brake · E exit when stopped';
  if(nearBoatShed())return 'E / USE · Boat Shed';
  if(gameplay?.state.actor.swimming)return watercraft?.nearest(focus())?'E / USE · Board watercraft':'WASD swim · Shift sprint · Head for shore';
  if(aircraft?.active)return aircraft.snapshot().prompt;
  if(aircraft?.challenge.active)return 'Match the lock sequence · E cancel';
  const nearbyAircraft=aircraft?.nearest(focus());
  if(nearbyAircraft)return nearbyAircraft.stolen||nearbyAircraft.loaner?`E board ${nearbyAircraft.name||nearbyAircraft.kind}`:`E take ${nearbyAircraft.name||nearbyAircraft.kind} · match lock cues`;
  if(buses?.passenger)return buses.tracking().prompt;
  if(rideService?.passenger)return ['arrived','exit-ready'].includes(rideService.phase)?'E step out · T phone':'Yoober passenger · T phone';
  const rentalDriver=carRental?.active&&nitroContext();
  if(rentalDriver&&carRental.rentalBay(rentalDriver))return 'Stop on the bay · E return rental';
  if(gameplay?.state.mode!=='foot'){
    const offer=nitroOfferForCar();
    if(!offer)return null;
    if(offer.moving)return 'E stop at the nitro bay';
    return offer.ok?`E refill nitro${offer.cost?' · $'+offer.cost:''}`:`${offer.reason} E exits the car.`;
  }
  const pose=focus(),plan=interiors?.active;
  const contractAction=availableContractAction();
  if(contractAction)return `E / USE · ${contractAction.label}`;
  if(!plan&&depotTank?.nearest(pose))return 'E / USE · Take depot tank';
  if(!plan&&!tutorialRunning&&!campaign.state.active){
    const site=!heists?.active&&heists?.nearby(pose);
    if(site?.kind==='rail')return `E / USE · ${site.name}`;
    const station=lightRail?.nearStop(pose,5);
    if(station){
      const journey=lightRail.platformJourney(station.id,station.direction);
      return journey?`E / USE · Board for ${journey.destination}`:`E / USE · Call tram at ${station.name}`;
    }
  }
  if(!plan&&delivery?.phase==='waiting'&&Math.hypot(pose.x-delivery.vehicles[0].x,pose.z-delivery.vehicles[0].z)<=6)return 'E collect your delivery';
  if(plan){
    if(plan.heist){
      if(interiors.nearExit(pose))return 'E / USE · Leave building';
      const current=heists?.snapshot();
      if(current?.phase==='surrender'||current?.phase==='loot')return `E / USE · ${current.nextAction}`;
      if(current?.phase==='release'||current?.phase==='puzzle')return '';
      if(current?.phase==='escape')return 'Get out through the front door';
      if(campaign.state.active?.stealth)return nearbyStealthObjective(pose)?.label??null;
      if(plan.heist.kind==='memorial')return 'Walk to the exhibition case · E / USE opens the puzzle';
      return 'Aim at the employee or land a punch, then press E / USE';
    }
    const hostile=roomPeople.snapshot().find(person=>person.character==='booth-guest'&&person.health>0&&person.reaction==='angry'&&Math.hypot(person.x-pose.x,person.z-pose.z)<=5&&visible(pose,person));
    if(hostile)return 'F punch · Move to dodge';
    const person=roomPeople.nearestDialogue(pose,{hasLineOfSight:visible});
    if(person)return `E talk to ${person.label}`;
    const station=nearbyActivityStation(pose);
    if(directStation(station)&&!activities.snapshot().active)return `E or Q · ${station.label}`;
  }
  if(progression.state.activity?.interactive)return `${progression.state.activity.phase==='emptying'?'Emptying valuables':'Hold-up in progress'} · E cancel`;
  const victim=crimeCandidate();if(victim)return victim.type==='robbery'?'E demand the employee empty the till':'E demand valuables';
  const bus=buses?.nearest(pose,10);if(bus&&!rideService?.activeFare&&!plan)return bus.stopped?'E board bus':'E request bus stop';
  if(rideService?.phase==='waiting'&&Math.hypot(rideService.vehicles[0].x-pose.x,rideService.vehicles[0].z-pose.z)<9)return 'E board your Yoober';
  const challenge=streetChallenge();
  if(challenge)return challenge.phase==='waiting'?(gameplay.state.carjacking?.occupied?'Stay alongside the car · E cancel':'Parked car lock · E cancel'):
    challenge.phase==='memorise'?'Read the pattern · E cancel':'Follow the puzzle cues · E cancel';
  if(activities.snapshot().active)return 'X + Y / ↑ activity controls · E stop';
  if(micromobility?.snapshot().active)return 'WASD ride · S brake · E dismount · T phone';
  if(carRental&&!plan){
    const desk=carRental.desk({pose,onFoot:true,passenger:gameplay.state.passenger,recovering:gameplay.state.recovery});
    if(desk)return `E · ${desk.name}`;
  }
  if(plan){
    if(interiors.nearExit(pose))return 'E leave building';
    if(plan.counter&&Math.hypot(pose.x-plan.counter.x,pose.z-plan.counter.z)<=plan.counter.radius)return `E ${plan.name} counter`;
    const station=nearbyActivityStation(pose);
    return station?`Q ${station.label} · E at the door leaves`:'WASD walk · E at the door leaves';
  }
  const contact=streetDealers?.nearest(pose);if(contact)return `E trade with ${contact.name}`;
  const lemon=micromobility?.offers(pose)[0];
  if(lemon?.available&&lemon.distance<=2.8)return 'T hire or hack Lemon ride';
  const service=progression?.services.find(site=>!site.buildingId&&!site.dealer&&site.type==='arms'&&Math.hypot(site.x-pose.x,site.z-pose.z)<=site.radius);
  if(service)return `E open ${service.name}`;
  const entry=interiors?.findEntry(pose);
  if(entry?.type==='house'&&!isSandbox()&&!progression.isSafehouse(entry.id))return 'E force the house lock';
  return entry?`E enter ${map.storyHomes?.basement?.roomId===entry.id?map.storyHomes.basement.name:entry.name}`:null;
}
function openWork(){
  if(skylineLease||isSandbox()){openSkylineOffer();return;}
  if(jetpack?.active){notify('Land the jetpack before starting work.');return;}
  if(aircraft?.active){notify('Land and leave the aircraft before starting work.');return;}
  if(buses?.passenger){notify('Step off the bus before starting work.');return;}
  if(rideService?.activeFare){notify('End your Yoober ride before starting work.');return;}
  if(gameMode==='campaign')openCampaign();
  else {streetUI.renderJobs();openDialog('jobs-dialog');}
}
function missionLaunchReason(){
  const state=gameplay.state;
  if(skylineLease)return 'Finish or abandon Skylark retrieval first.';
  if(state.vehicle.rented)return 'Return the rental before starting a mission.';
  if(developerReturn)return 'Return from the preview before starting a mission.';
  if(aircraft?.active||jetpack?.active)return 'Land before starting a mission.';
  if(watercraft?.isActive||depotTank?.isActive)return 'Leave the boat or tank before starting a mission.';
  if(state.actor.swimming)return 'Reach the shore before starting a mission.';
  if(state.health<=0||state.recovery||state.actor.impactTime>0)return 'Recover before starting a mission.';
  if(state.passenger||buses?.passenger||rideService?.activeFare||micromobility?.active)return 'Finish your ride before starting a mission.';
  if(state.carjacking||streetChallenge()||progression.state.activity||activities.snapshot().active)return 'Finish or cancel the active task first.';
  if(delivery?.busy)return 'Collect or cancel your delivery before starting a mission.';
  if(heists?.active)return 'Finish the active heist before starting a campaign mission.';
  return '';
}
function startCampaignMission(optionalId=null,plan){
  if(missionCheckpoint)return;
  const blocked=missionLaunchReason();
  if(blocked){notify(blocked);return;}
  const body=protagonistCheckpoint();
  if(PROTAGONIST_IDS.includes(campaign.state.character)){
    try{protagonists.capture(campaign.state.character,body);}
    catch{notify('Move to a clear place before starting the mission.');return;}
  }
  // A reload during an attempt resumes the same prelaunch career.
  saveCareer();
  const economy=progression.captureMissionState();
  if(!economy){notify('Finish the current activity before starting a mission.');return;}
  const flightMission=campaign.optionalChapters?.some(chapter=>chapter.id===optionalId&&chapter.aviation);
  missionCheckpoint={...captureMissionPosition(economy,body,flightMission),steps:[],failure:null,retryStep:null,retryIn:0,prepared:false};
  clearRecon();
  inquiryHarm=false;
  const aircraftLocations=aircraft?.snapshot().planes;
  const optionalAircraft=aircraftLocations?.some(plane=>plane.kind==='jet'&&!plane.depot)?aircraftLocations.filter(plane=>plane.kind!=='jet'||!plane.depot):aircraftLocations;
  const result=optionalId?campaign.startOptional(optionalId,{...careerContext(),aircraftLocations:optionalAircraft,stealthOutcome:null},plan):campaign.start(careerContext());
  if(!result.ok){
    acceptMissionCheckpoint();
    notify(result.message);return;
  }
  if(campaign.state.active.combat===false)gameplay.setWeapon('unarmed');
  contractTarget?.clear();
  if(campaign.state.active.stealth){stealthOutcome=null;stealthPreview=null;}
  // Capture the opening after any scripted incident has set the initial heat.
  for(const event of campaign.drainEvents())if(event.type==='started')reportCampaignIncident(event);
  rememberMissionStep();
  closeDialogs();routeTo(campaignNavigationTarget());
}
function reportCampaignIncident(event){
  if(!event.incident)return;
  const scrutiny=developerReturn?0:(campaignAftermath?.scrutiny()||0);
  gameplay.reportOffence(scrutiny?'suspect vehicle · linked witness report':'suspect vehicle',Math.min(4,(event.wantedLevel||2)+scrutiny),{witnessed:true});
}
function captureMissionPosition(economy,body=protagonistCheckpoint(),flightMission=campaign.state.active?.aviation){
  const inFlight=!!aircraft?.active;
  if(inFlight&&missionCheckpoint){
    const ground=missionCheckpoint.steps.findLast(step=>!step.inFlight)||missionCheckpoint;
    body={...body,actor:ground.body.actor};
  }
  return {body:{...body,...gameplay.missionRecoverySnapshot()},economy,protagonists:protagonists.serialize(),
    world:campaignWorld?.snapshot(),aftermath:campaignAftermath?.serialize(),inFlight,
    planes:inFlight||flightMission?aircraft?.captureCheckpoint():null,
    room:interiors.active?{id:interiors.active.id,actor:{...gameplay.state.actor}}:null,
    abandoned:simulation.abandonedCars.map(car=>({...car})),carKey:playerCarKey,nitro:simulation.driving.nitroFuel,
    destination:destination&&{...destination},mapSelection:mapSelection&&{...mapSelection},
    view:{footCameraYaw,footLookPitch,orbit,orbitHeight,orbitHold,lookPitch,cockpitCamera}};
}
function rememberMissionStep(){
  const pending=missionCheckpoint;
  if(!pending||pending.failure||watercraft?.isActive||depotTank?.isActive||jetpack?.active||
    micromobility?.active||(gameplay.state.passenger&&!aircraft?.active)||gameplay.state.actor.swimming||heists?.active)return;
  const goal=campaign.state.active?.target;
  if(goal?.aftermath&&!campaignAftermath?.recorded(campaign.state.active.id))return;
  const economy=progression.captureMissionStep(pending.economy);
  if(!economy)return;
  const position=captureMissionPosition(economy);
  if(position.inFlight&&!position.planes)return;
  const active=campaign.state.active;
  const stealth=active?.stealth?stealthContracts.captureRetry(active):null;
  if(active?.stealth&&!stealth)return;
  const attempt=campaign.captureRetry();
  if(!attempt)return;
  pending.steps=[...pending.steps.filter(entry=>entry.attempt.stage<attempt.stage),{...position,attempt,stealth}];
}
function advanceCampaign(dt){
  const before=campaign.state.active?.stage;
  campaign.update(dt,careerContext());
  if(campaign.state.active&&campaign.state.active.stage!==before)rememberMissionStep();
}
function contractPlanSelection(){
  return {approachId:$('contract-approach').value,exitId:$('contract-exit').value};
}
function plannedContract(){
  const contract=stealthContracts.chapters.find(item=>item.id===planningContractId);
  return contract&&planStealthChapter(contract,contractPlanSelection());
}
function updateContractPlan(){
  const plan=contractPlanSelection(),choices=campaign.contractPlans(planningContractId);
  if(!choices)return;
  stealthPlans.set(planningContractId,plan);
  const approach=choices.approaches.find(item=>item.id===plan.approachId);
  const planned=plannedContract();
  $('contract-plan-detail').textContent=planned
    ? `${approach.description} Entry at ${planned.stages[0].location}. ${planned.stages.length} objectives.`
    : 'Choose a valid approach and exit.';
  $('contract-go').disabled=!planned;
  $('contract-map').disabled=!planned;
}
function openContractPlan(id){
  const choices=campaign.contractPlans(id);
  if(!choices||campaign.state.active||campaign.isCompleted(id))return;
  planningContractId=id;
  const prior=stealthPlans.get(id);
  const populate=(node,options,selected)=>{
    node.replaceChildren(...options.map(item=>new Option(item.name,item.id)));
    if(options.some(item=>item.id===selected))node.value=selected;
  };
  populate($('contract-approach'),choices.approaches,prior?.approachId);
  populate($('contract-exit'),choices.exits,prior?.exitId);
  const contract=stealthContracts.chapters.find(item=>item.id===id);
  $('contract-plan-title').textContent=contract.name;
  $('contract-plan-briefing').textContent=contract.briefing;
  $('contract-plan').hidden=false;
  updateContractPlan();
  $('contract-approach').focus();
}
function showContractPlanMap(){
  const planned=plannedContract();
  if(!planned||campaign.state.active)return;
  const first=planned.stages[0],exit=planned.stages.at(-1);
  const entry=first.roomId?missionLocations.guide({target:first})?.point??first:first;
  stealthPreview={entry,exit,route:findRoute(simulation.graph,entry,exit)};
  mapView.x=(entry.x+exit.x)/2;mapView.z=(entry.z+exit.z)/2;
  openDialog('map-dialog');
  $('map-mode-note').textContent='Green marks the approach. Purple marks extraction. Open Campaign to keep planning.';
  const canvas=$('full-map'),scale=createMapProjection(map.bounds,canvas.width,canvas.height).scale;
  mapView.zoom=Math.max(1,Math.min(12,Math.floor(Math.min(
    (canvas.width-140)/Math.max(1,Math.abs(entry.x-exit.x)),
    (canvas.height-112)/Math.max(1,Math.abs(entry.z-exit.z)))/scale)));
  $('map-zoom-level').textContent=`${mapView.zoom}×`;drawMap(canvas,true);
}
for(const id of ['contract-approach','contract-exit'])$(id).addEventListener('change',updateContractPlan);
$('contract-go').addEventListener('click',()=>startCampaignMission(planningContractId,contractPlanSelection()));
$('contract-map').addEventListener('click',showContractPlanMap);
$('map-dialog').addEventListener('close',()=>{stealthPreview=null;});
function acceptMissionCheckpoint(){
  if(!missionCheckpoint)return;
  progression.commitMissionState(missionCheckpoint.economy);missionCheckpoint=null;
}
function prepareFailedMissionReturn(checkpoint){
  if(missionCheckpoint.prepared)return;
  missionCheckpoint.prepared=true;
  const outside=interiors.exteriorPose;
  campaignWorld?.restore(checkpoint.world);campaignAftermath?.restore(checkpoint.aftermath);inquiryOfficer=null;inquiryHarm=false;
  resetCampaignWorld();lightRail?.reset();heists?.cancel();depotTank?.reset();
  watercraft?.reset();jetpack?.reset(gameplay.state);aircraftRescueHealth=null;
  clearInterior();
  if(outside)Object.assign(gameplay.state.actor,outside,{speed:0});
  micromobility?.reset();resetDelivery();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;
  campaignScenes?.clear();contractTarget?.clear();ordnance?.reset();heroPowers.cancelActive();vehicleDamage.reset();fireWarningKey=null;
  clearRecon();clearInput();syncExternalVehicles();syncExternalPeople();
}
function restoreMissionRoom(room){
  if(!room)return true;
  const entry=interiors.entries.find(item=>item.id===room.id);
  if(!entry)return false;
  const actor=gameplay.state.actor;
  if(interiors.findEntry(actor)!==entry){
    const probe={x:entry.x-Math.sin(entry.yaw)*1.8,z:entry.z-Math.cos(entry.yaw)*1.8,yaw:entry.yaw,y:entry.y};
    if(interiors.findEntry(probe)!==entry||simulation.moveActor(probe,0,0,.45).blocked)return false;
    Object.assign(actor,probe);
  }
  enterInterior(entry);
  if(interiors.active?.id!==room.id)return false;
  const pose={x:room.actor.x,z:room.actor.z,yaw:room.actor.yaw,y:interiors.active.floorY};
  if(interiors.moveActor(pose,0,0,.45).blocked)return false;
  Object.assign(actor,pose,{speed:0,jumpHeight:0});
  return true;
}
function clearMissionFailureTitle(){
  if(!missionFailureTitle)return;
  missionFailureTitle=null;
  const screen=$('recovery-screen');
  if(screen){screen.hidden=true;screen.style.backgroundColor='';}
}
function beginMissionFailureTitle(message){
  if(gameplay.state.recovery)return; // Death or arrest already owns the screen with WASTED or BUSTED.
  missionFailureTitle={elapsed:0,message:String(message||'Mission failed.')};
  updateMissionFailureTitle(0);
}
function updateMissionFailureTitle(dt=0){
  const overlay=missionFailureTitle;
  if(!overlay)return;
  const screen=$('recovery-screen');
  if(!screen){missionFailureTitle=null;return;}
  if(dt>0)overlay.elapsed+=dt;
  if(overlay.elapsed>=MISSION_FAILURE_HOLD+MISSION_FAILURE_FADE){
    clearMissionFailureTitle();
    streetUI?.refresh();
    return;
  }
  screen.hidden=false;
  // Same alpha fade as the death recovery overlay: darken fast, hold, then
  // fade out while the mission restore proceeds underneath.
  const alpha=overlay.elapsed<MISSION_FAILURE_HOLD
    ?Math.min(.96,.96*overlay.elapsed/.35)
    :Math.max(0,.96-.96*(overlay.elapsed-MISSION_FAILURE_HOLD)/MISSION_FAILURE_FADE);
  screen.style.backgroundColor=`rgba(10,15,18,${alpha})`;
  const title=$('recovery-title');
  if(title){
    if(title.textContent!=='MISSION FAILED')title.textContent='MISSION FAILED';
    title.style.letterSpacing='.12em';
  }
  const status=$('recovery-status');
  if(status&&status.textContent!==overlay.message)status.textContent=overlay.message;
}
function restoreFailedMission(dt=0,force=false){
  const pending=missionCheckpoint;
  if(!pending?.failure)return true;
  const failure=pending.failure;
  const retry=pending.retryStep;
  const checkpoint=retry||pending;
  if(!force){
    pending.retryIn=Math.max(0,pending.retryIn-Math.max(0,dt));
    if(pending.retryIn>0)return false;
  }
  prepareFailedMissionReturn(checkpoint);
  const abandoned=simulation.abandonedCars,live=abandoned.slice();
  abandoned.splice(0,abandoned.length,...checkpoint.abandoned.map(car=>({...car})));
  const restored=gameplay.restoreMissionCheckpoint(checkpoint.body,{
    canRestoreWeapon:checkpoint.economy.weaponOwned,
    commit:()=>progression.restoreMissionState(checkpoint.economy,gameplay.state.respawnSerial,{keep:!!retry})
  });
  if(!restored.ok){
    abandoned.splice(0,abandoned.length,...live);
    pending.retryIn=.5;
    if(!pending.notified){pending.notified=true;notify('Mission return is waiting for a clear space.');}
    return false;
  }
  protagonists=createProtagonistState(checkpoint.protagonists,{bounds:map.bounds});
  playerCarKey=checkpoint.carKey;simulation.driving.nitroFuel=checkpoint.nitro;
  const roomRestored=restoreMissionRoom(checkpoint.room);
  const flightRestored=!checkpoint.planes||aircraft.restoreCheckpoint(checkpoint.planes).ok;
  const resumed=retry&&roomRestored&&flightRestored&&campaign.resumeRetry(retry.attempt,careerContext()).ok;
  if(retry&&(!resumed||(retry.stealth&&!stealthContracts.restoreRetry(campaign.state.active,retry.stealth)))){
    if(resumed){campaign.cancel();campaign.drainEvents();}
    pending.retryStep=retry.attempt.stage>0?pending.steps.find(step=>step.attempt.stage===0)||null:null;
    pending.prepared=false;
    return false;
  }
  ({footCameraYaw,footLookPitch,orbit,orbitHeight,orbitHold,lookPitch,cockpitCamera}=checkpoint.view);
  previousActorMode=gameplay.state.mode;
  cameraReady=false;accumulator=0;clearInput();syncExternalVehicles();syncExternalPeople();
  pedestrians.resetPopulation(focus());refreshProtagonistVehicle();syncPlayerAppearance();
  if(!missionFailureTitle)streetUI.refresh();
  destination=null;route=[];lastJobTarget='';mapSelection=checkpoint.mapSelection;
  if(retry){
    pending.steps=pending.steps.filter(step=>step.attempt.stage<=retry.attempt.stage);
    pending.failure=null;pending.retryStep=null;pending.retryIn=0;pending.prepared=false;pending.notified=false;
    routeTo(campaignNavigationTarget());
    notify(`${failure} Retrying step ${retry.attempt.stage+1}.`);
    return true;
  }
  missionCheckpoint=null;
  if(checkpoint.destination)routeTo(checkpoint.destination);
  saveCareer();
  notify(`${checkpoint.failure} ${roomRestored&&!restored.adjusted?'Returned to your mission start.':'Returned near your mission start.'} J opens Campaign.`);
  return true;
}
function endCampaignAttempt(){
  campaign.cancel();campaign.drainEvents();
  clearMissionFailureTitle();
  if(!missionCheckpoint)return true;
  if(missionCheckpoint.retryStep)missionCheckpoint.prepared=false;
  missionCheckpoint.retryStep=null;
  missionCheckpoint.failure||='Mission cancelled.';
  return restoreFailedMission(0,true);
}
function campaignIntroChapter(optionalId){
  if(!optionalId)return campaign.current();
  return campaign.optionalUnlocked()?campaign.optionalChapters.find(item=>item.id===optionalId&&!campaign.isCompleted(item.id)):null;
}
function playCampaignIntro(optionalId=null){
  if(missionCheckpoint?.failure){restoreFailedMission(0,true);openCampaign();return;}
  const chapter=campaignIntroChapter(optionalId);
  if(gameMode!=='campaign'||campaign.state.active||!chapter)return;
  const blocked=missionLaunchReason();
  if(blocked){notify(blocked);return;}
  syncPlayerAppearance();
  if(!chapter.cutscene||!cutscenes.play(chapter.cutscene,{character:campaign.state.character,missionId:chapter.id})){startCampaignMission(optionalId);return;}
  const state=cutscenes.snapshot();
  pendingCutscene={runId:state.runId,character:state.character,missionId:state.missionId,optionalId};
  cutsceneAnchor={...focus()};
  renderCutscene(0);
  closeDialogs();setCutsceneVisible(true);clearInput();
}
function setCutsceneVisible(show){
  $('cutscene-dialog').hidden=!show;document.body.classList.toggle('in-cutscene',show);
  for(const element of $('game').children)if(element!==$('cutscene-dialog'))element.inert=show;
  if(show)$('cutscene-skip').focus();
  else renderer?.domElement.focus();
}
function renderCutscene(dt){
  if(!pendingCutscene&&!cutscenes.snapshot().active)return;
  cutscenes.step(dt,{paused:document.hidden||!windowFocused});
  const state=cutscenes.snapshot();
  $('cutscene-title').textContent=state.title||'';$('cutscene-speaker').textContent=state.speaker||'';$('cutscene-line').textContent=state.text||'';
  for(const event of cutscenes.drainEvents()){
    if(!pendingCutscene||event.runId!==pendingCutscene.runId)continue;
    const captured=pendingCutscene;pendingCutscene=null;cutsceneAnchor=null;setCutsceneVisible(false);
    clearInput();cameraReady=false;
    if(event.type==='completed'&&started&&gameMode==='campaign'&&campaign.state.character===captured.character&&
      campaignIntroChapter(captured.optionalId)?.id===captured.missionId&&!campaign.state.active)startCampaignMission(captured.optionalId);
    else if(started&&gameMode==='campaign'&&!document.hidden)openCampaign();
  }
}
$('cutscene-skip').addEventListener('click',()=>cutscenes.skip());
$('cutscene-cancel').addEventListener('click',()=>cutscenes.cancel());

function openCampaign(){
  const chapter=campaign.current(),active=campaign.state.active,required=campaign.nextRequiredCharacter();
  const unlocked=campaign.optionalUnlocked(),journal=campaign.journal();
  const story=campaign.state.legacy?journal.shared:[...journal.introductions.flatMap(item=>item.chapters),{complete:journal.meeting},...journal.shared];
  renderCharacterChoices();
  $('campaign-title').textContent=active?.name??chapter?.name??(required?`Switch to ${required.name}`:unlocked?'Story complete':'Campaign');
  $('campaign-contact').textContent=`${story.filter(item=>item.complete).length}/${story.length} story missions`;
  const briefing=$('campaign-briefing');
  briefing.textContent=active||unlocked?'':chapter?.briefing||(required?`${required.name} leads the next mission.`:'Choose a character to continue.');
  briefing.hidden=!briefing.textContent;
  $('campaign-status').textContent=active?(active.prompt || active.target.label):campaign.state.failed?campaign.state.message:'';
  const itinerary=$('campaign-itinerary'), stages=chapter?.stages || [];
  itinerary.hidden=!stages.length;
  const currentStep=active?.stage ?? 0;
  const list=$('campaign-steps');
  list.replaceChildren(...stages.map((stage,index)=>{
    const row=document.createElement('li');
    row.textContent=stage.label;
    if(index===currentStep)row.setAttribute('aria-current','step');
    if(index<currentStep)row.className='completed-step';
    return row;
  }));
  $('campaign-itinerary-label').textContent=active?`Mission plan · Step ${currentStep+1} of ${stages.length}`:'Mission plan';
  $('campaign-status').hidden=!$('campaign-status').textContent;
  $('campaign-chapters').replaceChildren();
  const files=Object.entries(campaignAftermath?.serialize()||{});
  const history=$('campaign-witness-files');
  history.hidden=files.length===0;
  history.textContent=files.map(([id,file])=>`${id==='earmuffs-rematch'?'Rematch':'Lunch Breakpoint'} · ${file.decision} · ${file.civilianHarm?'civilian injured':'civilians spared'}`).join(' • ');
  $('campaign-contracts').replaceChildren();
  $('campaign-contracts-group').hidden=!campaign.optionalChapters.length;
  $('campaign-optionals-lock').hidden=unlocked;
  $('contract-plan').hidden=true;
  for(const item of campaign.chapters){
    const li=document.createElement('li');li.textContent=item.name.replace(/^\d+\. /,'')+(campaign.isCompleted(item.id)?' · Complete':'');
    if(item.id===chapter?.id)li.setAttribute('aria-current','step');
    $('campaign-chapters').append(li);
  }
  for(const item of unlocked?campaign.optionalChapters:[]){
    const li=document.createElement('li'),button=document.createElement('button');
    button.type='button';button.id=`campaign-optional-${item.id}`;
    const name=item.name.replace(/^Optional: /,'');
    button.textContent=campaign.isCompleted(item.id)?`${name} · Complete`:`${name} · $${item.reward.toLocaleString()}`;
    button.disabled=!!active||!campaign.state.character||campaign.isCompleted(item.id)||gameMode!=='campaign'||!!developerReturn?.blocked;
    button.addEventListener('click',()=>item.stealth&&!item.assassination?openContractPlan(item.id):playCampaignIntro(item.id));li.append(button);
    $('campaign-contracts').append(li);
  }
  const startButton=$('campaign-start'),cancelButton=$('campaign-cancel');
  startButton.disabled=!!active||!chapter||gameMode!=='campaign'||!!developerReturn?.blocked;
  startButton.hidden=!!active||unlocked&&!chapter;
  startButton.textContent=campaign.state.failed?'Retry mission':'Start mission';
  cancelButton.disabled=cancelButton.hidden=!active;
  openDialog('campaign-dialog');
  if(unlocked&&!active&&planningContractId)openContractPlan(planningContractId);
}
function openNpcDialogue(person){
  const lunch=gameMode==='campaign'&&currentHero()?.id==='corporate'&&campaign.state.active?.id==='corporate-lunch-breakpoint';
  if(lunch&&campaign.state.active.stage===0){notify('Stand beside the marked service counter until the booth objective appears.');return;}
  const goal=campaign.state.active?.target,victoryRequired=gameMode==='campaign'&&goal?.victory===true&&['encounter','fight'].includes(goal.kind);
  const scriptedFight=lunch&&campaign.state.active.target.kind==='encounter';
  const result=roomPeople.startDialogue(person.id,{actor:focus(),hasLineOfSight:visible,scriptedFight:scriptedFight||victoryRequired,victoryRequired,missionId:victoryRequired?campaign.state.active.id:null});
  if(!result.ok){notify(result.reason||result.message||'Move closer.');return;}
  const dialogue=result.dialogue;dialogueId=dialogue.id;
  $('npc-title').textContent=dialogue.title;$('npc-line').textContent=dialogue.line;$('npc-status').textContent='';
  $('npc-choices').replaceChildren();
  for(const choice of dialogue.choices){
    const button=document.createElement('button');button.textContent=choice.label;button.dataset.dialogueChoice=choice.id;
    button.disabled=choice.id==='fight'&&protectedWork();
    button.addEventListener('click',()=>{
      if(choice.id==='fight'&&protectedWork())return;
      const answer=roomPeople.respondDialogue(dialogueId,choice.id,{actor:focus(),hasLineOfSight:visible});
      if(answer.ok&&choice.id==='fight'&&victoryRequired)gameplay.setWeapon('unarmed');
      if(!answer.ok){$('npc-status').textContent=answer.reason||answer.message||'Conversation ended.';return;}
      closeDialogs();notify(answer.message);dialogueId=null;
    });$('npc-choices').append(button);
  }
  openDialog('npc-dialog');
}
function syncPlayerAppearance(){
  const hero=currentHero();
  playerAppearanceId=hero?`player:${hero.appearance}`:'player';
  const workwear=!!(campaign?.state.active?.assassination&&contractTarget?.snapshot()?.stealth?.disguised);
  actorView?.setPlayerAppearance?.(playerAppearanceId,{workwear});indoorActorView?.setPlayerAppearance?.(playerAppearanceId,{workwear});
  rideView?.setPlayerAppearance?.(playerAppearanceId);busView?.setPlayerAppearance?.(playerAppearanceId);
  roomPeopleView?.setPlayerAppearance?.(playerAppearanceId);
  refreshModeLabel();
}
function currentHero(){
  if(gameMode!=='campaign'||!campaign)return null;
  const id=campaign.state.active?.character||(campaign.state.character==='legacy'?(campaign.current()?.character||'basement'):campaign.state.character);
  return campaign.characters.find(hero=>hero.id===id)||null;
}
function refreshModeLabel(){
  const hero=currentHero();
  $('mode-label').textContent=isSandbox()?'FREE ROAM':gameMode==='campaign'?(hero?.name||'CAMPAIGN'):'STREET LIFE';
}
function campaignNavigationTarget(){
  const active=campaign.state.active,guide=missionLocations?.guide(active,{pose:focus(),plan:interiors.active,vehicle:simulation.player,people:roomPeople.snapshot(),wanted:gameplay.state.wanted});
  if(guide?.escaping||guide?.roaming||guide?.indoors)return null;
  if(guide)return {...guide.point,label:guide.instruction,name:guide.location,campaignObjective:true};
  return active?{...active.target,campaignObjective:true}:null;
}
function renderMissionGuide(){
  const active=campaign.state.active,aftermathResolved=!campaignAftermath?.isCase(active?.id)||campaignAftermath.recorded(active.id)||!!developerReturn;
  const pose=focus(), plan=interiors.active;
  const onFoot=gameplay.state.mode==='foot'&&!gameplay.state.passenger&&!jetpack?.active;
  const goal=gameMode==='campaign'&&active?missionLocations.guide(active,{
    pose,plan,vehicle:simulation.player,people:roomPeople.snapshot(),wanted:gameplay.state.wanted,aftermathResolved
  }):null;
  missionGuideState=missionFootpath.guide(goal,{pose,onFoot,indoors:!!plan,stage:active?.stage,
    // A stationary player can need new guidance when a passing car moves.
    obstructionRevision:Math.floor(performance.now()/4000)});
  if(missionRing){
    const indoor=!!(plan&&missionGuideState?.indoors);
    const outdoor=onFoot&&!plan&&missionGuideState?.entryId&&missionGuideState.distance<=32;
    missionRing.visible=Boolean(indoor||outdoor);
    if(missionRing.visible){
      const parent=indoor?interiorScene:scene, {x,z}=missionGuideState.point;
      if(missionRing.parent!==parent)parent.add(missionRing);
      missionRing.position.set(x,(indoor?plan.floorY:world.heightAt(x,z))+.045,z);
    }
  }
  if(!missionGuideState)return null;
  const metres=Number.isFinite(missionGuideState.distance)?` · ${Math.round(missionGuideState.distance)} m`:'';
  const stealth=active?.assassination?contractTarget?.snapshot()?.stealth:null;
  const status=stealth?.alerted?' · Alerted':stealth?.guard?.suspicion>.25||stealth?.suspicion>.25?' · Suspicious':stealth?.disguised?' · Disguised':'';
  return `${missionGuideState.instruction}${metres}${status}`;
}
function nearbyStealthObjective(pose){
  const active=campaign?.state.active;
  if(!active?.stealth||gameplay.state.mode!=='foot'||gameplay.state.passenger||gameplay.state.actor.swimming)return null;
  const goal=active.target;
  if((interiors.active?.id??null)!==(goal.roomId??null))return null;
  return Math.hypot(pose.x-goal.x,pose.z-goal.z)<=goal.radius?goal:null;
}
function interactStealthObjective(){
  const pose=focus();
  if(!nearbyStealthObjective(pose))return false;
  const state=gameplay.state;
  const result=stealthContracts.resolve(campaign.state.active,{pose,onFoot:true,interior:interiors.active,
    recovering:!!state.recovery,wanted:state.wanted,health:state.health,visible,
    crouching:state.actor.crouching||keys.has('KeyX')||actionTouch.has('crouch')});
  if(result.ok)stealthOutcome=result.receipt;
  notify(result.message);
  return true;
}
function clearRecon(){reconnaissance.clear();reconGuideKey='';scanHeld=false;}
function contractContext(){
  const state=gameplay.state;
  const armed=state.weapon!=='unarmed';
  const aiming=armed&&(state.aiming||mouseAim||keys.has('KeyZ')||actionTouch.has('aim'));
  return {activeMissionId:campaign.state.active?.id,player:{...focus(),interiorId:interiors.active?.id||null},
    onFoot:state.mode==='foot'&&!state.passenger&&!state.actor.swimming&&!jetpack?.active,
    health:state.health,crouching:state.actor.crouching||keys.has('KeyX')||actionTouch.has('crouch'),
    sprinting:keys.has('ShiftLeft')||keys.has('ShiftRight')||touch.has('boost'),armed,aiming,
    paused:paused(),recovering:!!state.recovery};
}
function availableContractAction(){
  if(!contractTarget?.body||campaign.state.active?.target.kind!=='assassination')return null;
  return contractTarget.availableAction(contractContext());
}
function interactContractTarget(){
  const action=availableContractAction();
  if(!action)return false;
  const result=contractTarget.interact(action.id,contractContext());
  if(result?.message)notify(result.message);
  syncPlayerAppearance();
  return true;
}
function updateContractTarget(dt){
  const active=campaign.state.active;
  if(!active?.assassination){if(contractTarget.body){contractTarget.clear();syncPlayerAppearance();}return;}
  const goal=active.target;
  if(goal.kind==='assassination'&&!contractTarget.body){
    contractTarget.load({missionId:active.id,targetId:goal.targetId,pose:goal,appearanceId:goal.appearanceId,label:goal.targetName,space:null,stealth:active.assassinationSite});
  }
  if(contractTarget.body)contractTarget.step(dt,contractContext());
}
function reportContractOutcome(){
  for(const event of contractTarget.drainEvents()){
    const active=campaign.state.active;
    if(!active?.assassination||active.id!==event.missionId)continue;
    if(event.type==='alerted'){
      if(gameplay.state.wanted<2)gameplay.reportOffence('yard alert',2,{witnessed:true,point:event.point||contractTarget.body});
      continue;
    }
    if(event.type!=='defeated'||active.target.targetId!==event.targetId)continue;
    assassinationOutcome=event;
    if(event.stealthOutcome==='clean')notify('Undetected. Reach the pickup.');
  }
}
function shotTargets(){
  const result=[];
  for(const [prefix,owner] of interiors.active?[['room',roomPeople],['camera',securityCameras]]:[['ped',pedestrians],['dealer',streetDealers],['ride',rideService],['camera',securityCameras],['contract',contractTarget],['skyline',skylineOpponents],['skyline-drone',skylinePressure]]){
    for(const target of owner?.shotTargets?.()||[])result.push({...target,id:`${prefix}:${target.id}`,damage:(amount,ray)=>owner.hitByShot(target.id,amount,{...ray,targetId:target.id})});
  }
  return result;
}
function shotVehicles(ray,room){
  const atv=skylineAtv?.vehicle;
  const vehicles=room?[]:[...simulation.nearbyVehicles(ray.x,ray.z,ray.range+12),...(lightRail?.vehicles||[]),...(depotTank?.vehicle?[depotTank.vehicle]:[]),...(atv?[atv]:[]),...(buses?.vehicles||[]),...(rideService?.vehicles||[]),...(delivery?.vehicles||[]),
    ...gameplay.state.police.filter(unit=>unit.health>0&&unit.car).map(unit=>unit.car),...(gameplay.policeWrecks||[]),
    ...(stationDamage?.near(ray.x,ray.z,ray.range+12)||[]),
    ...(aircraft?.snapshot().planes||[]).map(plane=>({...plane,kind:'aircraft',width:plane.kind==='helicopter'?3.4:4}))];
  return vehicles;
}
function traceWorldShot(ray,room=interiors.active){return shotObstacles.trace(ray,room,shotVehicles(ray,room));}
function tracePlayerShot(ray){const room=interiors.active;return shotObstacles.traceHit(ray,room,shotVehicles(ray,room));}
function damageWorldVehicle(id,amount){
  if(typeof id!=='string'||!Number.isFinite(amount)||amount<=0)return false;
  if(id.startsWith('pump:'))return stationDamage?.damage(id,amount)===true;
  if(id==='player')return gameplay.damageVehicle(amount)===true;
  return simulation.damageVehicle(id,amount)===true||gameplay.damagePoliceVehicle(id,amount)===true||rideService?.damageVehicle(id,amount)===true||buses?.damageVehicle(id,amount)===true||delivery?.damageVehicle(id,amount)===true;
}
function vehicleForGunfire(id){
  if(typeof id==='string'&&id.startsWith('pump:'))return stationDamage?.pumpFor(id)||null;
  return simulation.vehicleForDamage(id)||gameplay.state.police.find(unit=>unit.car?.id===id)?.car||
    gameplay.policeWrecks.find(car=>car.id===id)||rideService?.vehicles.find(car=>car.id===id)||
    buses?.vehicles.find(car=>car.id===id)||delivery?.vehicles.find(car=>car.id===id);
}
function hitWorldVehicle({vehicleId,damage}){
  const car=vehicleId==='player'?null:vehicleForGunfire(vehicleId),previousHealth=car?.health??100;
  const hit=damageWorldVehicle(vehicleId,damage);
  if(hit&&car&&vehicleFires.recordShot(car,previousHealth)&&car.pump)stationDamage?.markBurning(vehicleId);
  return hit;
}
function damageExplosionVehicles(event){
  if(!validExplosion(event)||event.interiorId||handledVehicleBlasts.has(event))return 0;
  handledVehicleBlasts.add(event);
  const sourceY=Number.isFinite(event.y)?event.y:world.heightAt(event.x,event.z)+.2;
  if(!Number.isFinite(sourceY))return 0;
  const nearby=shotVehicles({x:event.x,z:event.z,range:event.radius},null);
  const vehicles=event.kind==='vehicle-fire'?nearby.filter(car=>car?.id!==event.sourceVehicleId):nearby;
  const seen=new Set();let hits=0;
  for(const site of policeStations?.damageExplosion(event,ray=>shotObstacles.trace(ray,null,vehicles))||[]){
    shotObstacles.removeBarrier(site.id);
    notify('Police post out of action. Reinforcements will take longer.');
  }
  if(policeStations&&activeWorldRecord()?.recordPolicePosts(policeStations.snapshot()))saveCareer();
  for(const car of vehicles){
    if(!car||typeof car.id!=='string'||car.id==='player'||seen.has(car.id)||car.active===false||car.interiorId||car.health===0||![car.x,car.z].every(Number.isFinite))continue;
    seen.add(car.id);
    const model=BY_ID[car.modelId],dimension=(name,fallback)=>Number.isFinite(car[name])&&car[name]>0?car[name]:model?.[name]||fallback;
    const width=dimension('width',1.9),length=dimension('length',4.8),height=dimension('height',car.kind==='bus'||car.id.startsWith('bus:')?3:1.6);
    const base=Number.isFinite(car.y)?car.y:world.vehicleHeightAt(car,car.edge?.road)+.18;
    const yaw=Number.isFinite(car.yaw)?car.yaw:0,c=Math.cos(yaw),s=Math.sin(yaw),dx=event.x-car.x,dz=event.z-car.z;
    const x=Math.max(-width/2,Math.min(width/2,c*dx-s*dz)),z=Math.max(-length/2,Math.min(length/2,s*dx+c*dz));
    const target={x:car.x+c*x+s*z,y:Math.max(base,Math.min(base+height,sourceY)),z:car.z-s*x+c*z};
    const vx=target.x-event.x,vy=target.y-sourceY,vz=target.z-event.z,distance=Math.hypot(vx,vy,vz);
    if(!Number.isFinite(distance)||distance>=event.radius)continue;
    if(distance>1e-6){
      const ray={x:event.x,y:sourceY,z:event.z,dx:vx/distance,dy:vy/distance,dz:vz/distance,range:distance,interiorId:null,ignoreVehicleIds:[car.id]};
      if(shotObstacles.trace(ray,null,vehicles)<distance-.001)continue;
    }
    const previousHealth=car.health;
    if(damageWorldVehicle(car.id,event.maxDamage*(1-distance/event.radius))){
      hits++;
      if(car.pump&&vehicleFires.recordShot(car,previousHealth))stationDamage?.markBurning(car.id);
    }
  }
  return hits;
}
function policeShotClear(from,to,{room,interiorId}={}){
  const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z);
  if(!(distance>0))return false;
  let occupied;
  if(to.id==='player')occupied=aircraft?.active?.id||skylineAtv?.seatPose?.id||lightRail?.seatPose?.id||depotTank?.seatPose?.id||(buses?.passenger&&buses.seatPose?.id)||(rideService?.passenger&&rideService.seatPose?.id)||
    (gameplay.state.mode==='vehicle'?'player':null);
  else occupied=(campaignScenes?.people||[]).find(person=>person.id===to.id&&person.seated)?.vehicleId;
  const ray={x:from.x,y:from.y,z:from.z,dx:(to.x-from.x)/distance,dy:(to.y-from.y)/distance,dz:(to.z-from.z)/distance,
    range:distance,interiorId:interiorId||null,ignoreVehicleIds:occupied?[occupied]:[]};
  return traceWorldShot(ray,room||null)>=distance-.02;
}
function reconSight(from,to){
  const y=(interiors.active?.floorY??world.heightAt(from.x,from.z))+(from.crouching?1.15:1.6);
  const dx=to.x-from.x,dy=to.y-y,dz=to.z-from.z,distance=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(distance)||distance<=0||distance>40||ordnance?.blocksSight({...from,y},to,{interiorId:to.space||null}))return false;
  const ray={x:from.x,y,z:from.z,dx:dx/distance,dy:dy/distance,dz:dz/distance,range:Math.max(.01,distance-.15),interiorId:to.space||null};
  return traceWorldShot(ray)>=ray.range-.02;
}
function updateRecon(dt){
  if(droneActive){clearRecon();return;}
  const active=gameMode==='campaign'?campaign.state.active:null;
  const key=active?.target.kind==='recon'?`${active.id}:${active.stage}`:'';
  if(key!==reconGuideKey){
    reconGuideKey=key;
    const descriptor=key?missionLocations.guide(active,{pose:focus(),plan:interiors.active,people:[]})?.recon:null;
    reconnaissance.setObjective(active,descriptor?{...descriptor,y:world.heightAt(descriptor.x,descriptor.z)+descriptor.y}:null);
  }
  const pose=focus();
  reconnaissance.step(dt,{pose,yaw:footCameraYaw,pitch:footLookPitch,eyeHeight:(interiors.active?.floorY??world.heightAt(pose.x,pose.z))+(pose.crouching?1.15:1.6),
    onFoot:gameplay.state.mode==='foot'&&!gameplay.state.passenger&&!activities.snapshot().active&&!streetChallenge(),space:interiors.active?.id||null,
    campaign:gameMode==='campaign',sandbox:isSandbox(),paused:paused(),recovering:!!gameplay.state.recovery,health:gameplay.state.health,
    respawnSerial:gameplay.state.respawnSerial,missionId:active?.id,stage:active?.stage,scan:scanHeld||keys.has('KeyI'),hasLineOfSight:reconSight});
  scanHeld=false;
  for(const event of reconnaissance.drainEvents())if(active?.id===event.missionId&&active.stage===event.stage&&active.target.targetId===event.targetId){reconOutcome=event;notify('Recon documented.');}
}
const combatNodes=new Map();
const combatNode=id=>{if(!combatNodes.has(id))combatNodes.set(id,$(id));return combatNodes.get(id);};
function combatValue(id,key,value){const node=combatNode(id);if(node[key]!==value)node[key]=value;}
function combatStyle(id,key,value){const style=combatNode(id).style;if(style[key]!==value)style[key]=value;}
function combatClass(node,key,value){if(node.classList.contains(key)!==value)node.classList.toggle(key,value);}
function reconCameraVisible(recon){
  const state=gameplay.state,pose=focus(),subject=recon.objective;
  return !!(recon.active&&subject&&!paused()&&!state.recovery&&state.mode==='foot'&&!state.passenger&&
    Math.hypot(pose.x-subject.x,pose.z-subject.z)<=40);
}
function renderCombatUI(){
  const state=gameplay.state,recon=reconnaissance.snapshot(),fight=roomPeople.encounter;
  const reconVisible=reconCameraVisible(recon),fightVisible=!!interiors.active&&!!fight.missionId&&fight.session>0&&!paused();
  combatClass(document.body,'reconning',reconVisible);combatClass(document.body,'fighting',fightVisible);
  combatValue('recon-hud','hidden',!reconVisible);combatValue('recon-status','textContent',recon.reason);
  combatValue('recon-progress','value',recon.objective?recon.held/recon.objective.hold:0);combatValue('recon-scan','disabled',!recon.ready);
  combatValue('recon-phone-camera','hidden',!recon.active);
  let subjectVisible=false;
  if(reconVisible&&recon.objective){
    const target=recon.objective;reconScreenPoint.set(target.x,target.y,target.z).project(camera);
    subjectVisible=reconScreenPoint.z>-1&&reconScreenPoint.z<1&&Math.abs(reconScreenPoint.x)<1&&Math.abs(reconScreenPoint.y)<1;
    if(subjectVisible){combatStyle('recon-subject','left',`${(reconScreenPoint.x+1)*50}%`);combatStyle('recon-subject','top',`${(1-reconScreenPoint.y)*50}%`);}
  }
  combatValue('recon-subject','hidden',!subjectVisible);combatValue('fight-hud','hidden',!fightVisible);
  if(fightVisible){
    combatValue('fight-health','value',Math.max(0,fight.dotHealth||0));
    combatValue('fight-cue','textContent',fight.won?'Fight won. Leave and clear the search.':fight.phase==='retry'?'Fight interrupted. Speak to Dot for a rematch.':fight.phase==='noodle-windup'?'Dot is reaching for her bowl. Move away from the table.':fight.phase==='noodle-flight'?'Noodles incoming! Dodge, then close in.':fight.windup>0?'Dot is winding up. Step back, then counter.':`F to punch. Land your hits and knock Dot down. ${fight.meleeHits||0} hits`);
    combatValue('fight-retry','hidden',fight.phase!=='retry');
  }
  combatValue('aim-reticle','hidden',paused()||!!state.recovery||state.mode!=='foot'||state.passenger||(!state.aiming&&!reconVisible&&combatCueTime<=0));
  combatClass(combatNode('aim-reticle'),'hit',combatCueTime>0);
  combatClass(combatNode('aim-reticle'),'scope',state.aiming&&state.weapon==='sniper'&&!reconVisible);
  const recoil=state.combatFeedback?.recoil||0,reduced=reducedCombatMotion.matches;
  combatStyle('aim-reticle','transform',`translate(-50%,-50%) scale(${reduced?1:1+recoil*.45})`);
  combatValue('reload-progress','hidden',!(state.reloading>0)||paused());
  combatValue('reload-progress','value',1-state.reloading/(combatReloadDuration||weaponById(state.weapon)?.reload||1));
  combatValue('combat-status','textContent',state.reloading>0?'Reloading':combatStatusTime>0?combatStatusText:'');
}
// Checkpoints deliberately exclude rewards, ownership and transient missions.
function protagonistCheckpoint(){
  const state=gameplay.state,actor=interiors?.exteriorPose||state.actor,car=simulation.player;
  return {mode:state.mode,actor:{x:actor.x,z:actor.z,yaw:actor.yaw},
    vehicle:{x:car.x,z:car.z,yaw:car.yaw,modelId:state.vehicle.modelId,color:state.vehicle.color,health:state.vehicleHealth,stolen:!!state.vehicle.stolen},
    health:state.health,weapon:state.weapon,ammunition:Object.fromEntries(WEAPONS.map(weapon=>[weapon.id,gameplay.getAmmo(weapon.id)]))};
}
function characterSwitchReason(){
  if(skylineLease)return 'Finish or abandon Skylark retrieval before switching characters.';
  if(developerReturn?.blocked)return 'Return from the mission preview before switching characters.';
  if(missionCheckpoint?.failure)return 'Return to your mission start before switching characters.';
  if(campaign.state.active)return 'Finish or cancel the active mission before switching characters.';
  if(!started)return '';
  const state=gameplay.state;
  if(state.vehicle.rented)return 'Return the rental before switching characters.';
  if(state.health<=0||state.recovery)return 'Recover before switching characters.';
  if(state.actor.impactTime>0)return 'Recover from the impact before switching characters.';
  if(state.actor.swimming)return 'Reach the shore before switching characters.';
  if(state.wanted)return 'Lose the police before switching characters.';
  if(state.passenger||buses?.passenger||rideService?.activeFare)return 'End your passenger ride before switching characters.';
  if(micromobility?.snapshot().active)return 'End your rental before switching characters.';
  if(progression.state.activeJob||progression.state.activity||activities.snapshot().active)return 'Finish or cancel your work or activity before switching characters.';
  if(state.carjacking||streetChallenge())return 'Finish or cancel the vehicle challenge before switching characters.';
  if(cutscenes.snapshot().active)return 'Finish the cutscene before switching characters.';
  return '';
}
function captureActiveProtagonist(){
  if(developerReturn||!started||gameMode!=='campaign'||!PROTAGONIST_IDS.includes(campaign.state.character)||characterSwitchReason())return;
  protagonists.capture(campaign.state.character,protagonistCheckpoint());
}
function refreshProtagonistVehicle(){
  selectedPaint=gameplay.state.vehicle.color;
  selectVehicle(gameplay.state.vehicle.modelId);
}
function missionAllyContext(id){
  const state=gameplay.state;
  return {...careerContext(),pose:{...focus()},companion:campaignScenes.people.find(person=>person.id===`campaign-ally:${id}`),
    impactTime:state.actor.impactTime,carjacking:!!state.carjacking,activeJob:!!progression.state.activeJob,
    activity:!!progression.state.activity||activities.snapshot().active||!!micromobility.snapshot().active||!!streetChallenge(),cutscene:cutscenes.snapshot().active};
}
function missionAllyReason(id){
  if(developerReturn)return 'Finish the mission preview before switching allies.';
  if(gameplay.state.mode!=='foot'||gameplay.state.passenger)return 'Get out of the car to switch allies.';
  const context=missionAllyContext(id),reason=campaign.companionSwitchReason(id,context);
  if(reason)return reason;
  return campaignScenes.canExchangeLeader(id,{...context,mission:campaign.state.active,character:campaign.state.character,playerMode:'foot',mode:gameMode})?'':'This ally needs a clear place nearby.';
}
function selectMissionAlly(id){
  const reason=missionAllyReason(id);if(reason)return {ok:false,message:reason};
  const context=missionAllyContext(id),oldHero=campaign.state.character,previous=protagonistCheckpoint();
  const sceneContext={...context,mission:campaign.state.active,character:oldHero,mode:gameMode,playerMode:'foot',armed:gameplay.state.weapon!=='unarmed'};
  const personal=protagonists.get(id)||{...previous,weapon:'unarmed',ammunition:Object.fromEntries(WEAPONS.map(weapon=>[weapon.id,{ammo:0,reserveAmmo:0}]))};
  const result=gameplay.switchToCompanion(context.companion,personal);
  if(!result.ok)return {ok:false,message:result.reason};
  // All three owners were checked above. These commits are synchronous while
  // the Campaign menu pauses the world and the old contact index is retained.
  campaignScenes.exchangeLeader(id,sceneContext);
  campaign.switchCompanion(id,{...context,switchSafe:true});
  progression.saveInventory(oldHero,previous.ammunition);restoreCareerInventory(id);
  protagonists.capture(oldHero,previous);heroPowers.cancelActive();recallDrone('character-switch');
  clearInput();cameraReady=false;footCameraYaw=gameplay.state.actor.yaw;footLookPitch=0;orbit=0;orbitHeight=0;orbitHold=0;lookPitch=0;
  syncExternalPeople();syncPlayerAppearance();streetUI.refresh();
  return {ok:true,message:`Playing as ${currentHero()?.name||id}.`};
}
function selectCampaignCharacter(id){
  if(campaign.state.character===id)return {ok:true,unchanged:true};
  if(started&&gameMode==='campaign'&&campaign.state.active)return selectMissionAlly(id);
  const reason=characterSwitchReason();
  if(reason)return {ok:false,message:reason};
  if(!started||gameMode!=='campaign')return campaign.selectCharacter(id,{...careerContext(),campaign:true,sandbox:false});
  const hero=campaign.characters.find(hero=>hero.id===id);
  if(!hero)return {ok:false,message:'Choose an available character.'};
  const previousHero=campaign.state.character,previous=protagonistCheckpoint(),player={...simulation.player},oldRoom=interiors.active,
    oldActor={...gameplay.state.actor},oldEntry=oldRoom&&interiors.entries.find(entry=>entry.id===oldRoom.id);
  captureActiveProtagonist();
  // Leave through the captured outside pose before the live placement checks.
  if(oldRoom)leaveInterior();
  const checkpoint=protagonists.get(id);
  let restored;
  if(checkpoint)restored=gameplay.restoreProtagonist(resumeCheckpoint(checkpoint));
  else {
    simulation.setPlayerVehicle({modelId:'lantern',color:0xe7e6df});
    const pose=prepareCharacterStart(simulation,hero,{initial:true,publicEntries:CIVIC_INTERIOR_ENTRIES});
    if(pose){
      gameplay.reset({sandbox:false,startPose:pose,onFoot:hero.onFoot!==false});
      gameplay.state.vehicle={modelId:'lantern',color:'#e7e6df',stolen:false};
      for(const weapon of WEAPONS)if(progression.state.equipment[weapon.id])gameplay.addAmmo(weapon.starterAmmo,weapon.id);
      restored={ok:true};
    }else restored={ok:false,reason:'No clear place to start this character.'};
  }
  if(!restored.ok){
    // Restore exact car physics; failed first-visit preparation may have moved it.
    Object.assign(simulation.player,player);
    if(oldRoom&&oldEntry){enterInterior(oldEntry);Object.assign(gameplay.state.actor,oldActor);}
    return {ok:false,message:restored.reason||'This character cannot resume here.'};
  }
  const selected=campaign.selectCharacter(id,{...careerContext(),campaign:true,sandbox:false});
  if(!selected.ok){
    gameplay.restoreProtagonist(previous);Object.assign(simulation.player,player);
    if(oldRoom&&oldEntry){enterInterior(oldEntry);Object.assign(gameplay.state.actor,oldActor);}
    return selected;
  }
  progression.saveInventory(previousHero,previous.ammunition);
  restoreCareerInventory(id);
  buses?.reset();resetDelivery();rideService?.reset();micromobility?.reset();equipment?.reset();followYoober=false;
  heroPowers.cancelActive();ordnance?.reset();recallDrone('character-switch');
  destination=null;route=[];lastJobTarget='';mapSelection=null;dialogueId=null;
  clearInput();cameraReady=false;footCameraYaw=gameplay.state.actor.yaw;footLookPitch=0;orbit=0;orbitHeight=0;orbitHold=0;lookPitch=0;pedestrians.resetPopulation(focus());
  refreshProtagonistVehicle();syncPlayerAppearance();streetUI.refresh();
  return selected;
}
function renderCharacterChoices(){
  if(!campaign)return;
  $('intro-characters').hidden=selectedGameMode!=='campaign';
  for(const id of ['intro-characters','campaign-characters']){
    const container=$(id);container.replaceChildren();
    for(const hero of campaign.characters){
      const button=document.createElement('button'),name=document.createElement('strong'),line=document.createElement('span');
      name.textContent=hero.name;line.textContent=hero.tagline;button.append(name,line);
      button.dataset.character=hero.id;button.setAttribute('aria-pressed',String(campaign.state.character===hero.id));
      const inMission=started&&gameMode==='campaign'&&!!campaign.state.active;
      const reason=campaign.state.character===hero.id?'':inMission?missionAllyReason(hero.id):characterSwitchReason();
      button.disabled=(inMission?campaign.state.character===hero.id:!campaign.canSelectCharacter(hero.id))||!!reason;
      if(reason){button.title=reason;line.textContent=reason;}
      button.addEventListener('click',()=>{
        const result=selectCampaignCharacter(hero.id);
        if(result.ok){saveCareer();syncPlayerAppearance();renderCharacterChoices();if(started&&$('campaign-dialog').open)openCampaign();}
        else notify(result.message);
      });container.append(button);
    }
  }
  $('start-button').disabled=!simulation||(selectedGameMode==='campaign'&&!campaign.state.character);
}
$('campaign-start').addEventListener('click',()=>{
  if(gameMode!=='campaign')return;
  playCampaignIntro();
});
$('campaign-cancel').addEventListener('click',()=>{endCampaignAttempt();clearRecon();finishDeveloperPreview(true);openCampaign();});
$('campaign-resume').addEventListener('click',closeDialogs);
function saveCareer() {
  if (clearingProgress || careerError || isSandbox() || !started || missionCheckpoint || skylineLease) return;
  const owned = progression.state.ownedVehicles.find(car => car.id === gameplay.state.vehicle.modelId);
  if (owned && !gameplay.state.vehicle.stolen&&!gameplay.state.vehicle.rented&&!developerReturn) { owned.health = gameplay.state.vehicleHealth; owned.color = selectedPaint; }
  try { captureCareerInventory();captureActiveProtagonist();localStorage.setItem(CAREER_KEY, JSON.stringify({...progression.serialize(),campaign:developerReturn?.campaign||campaign.serialize(),protagonists:protagonists.serialize(),nitroFuel:simulation.driving.nitroFuel,
    ...(campaignWorld?{campaignWorld:campaignWorld.snapshot()}:{}),...(streetWorld?{streetWorld:streetWorld.snapshot()}:{}),
    ...(campaignAftermath?{campaignAftermath:campaignAftermath.serialize()}:{})})); }
  catch (error) { careerError = `Career could not be saved: ${error.message}`; $('save-status').textContent = careerError; notify('Career storage is unavailable. You can keep playing.'); }
}
function routeTo(point) {
  if(!point){destination=null;route=[];routeClock=0;return;}
  destination = { ...point, name: point.name || point.label || 'Selected point' };
  route = airNavigationActive() ? [] : findRoute(simulation.graph, focus(), destination); routeClock = 0;
}
function refreshModeUI() {
  document.body.dataset.mode = gameMode;
  simulation?.setNitroAutoRecharge(isSandbox());
  refreshModeLabel();
  $('jobs-button').firstChild.textContent = gameMode==='campaign' ? 'Campaign ' : 'Jobs ';
  $('map-action-title').textContent = isSandbox() ? 'Teleport anywhere' : 'Plan a route';
  $('teleport-button').hidden = !isSandbox();
  $('teleport-button').disabled = !isSandbox() || !mapSelection;
  refreshAircraftRescue();
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
  if (!simulation || !started || cutscenes.snapshot().active) return;
  if(skylineLease&&['services-dialog','garage-dialog','jobs-dialog','campaign-dialog','phone-dialog'].includes(id)){
    notify('Finish or abandon Skylark retrieval before opening this menu.');return;
  }
  if((aircraft?.active||jetpack?.active)&&['services-dialog','garage-dialog','jobs-dialog','campaign-dialog','phone-dialog'].includes(id)){notify('Land before opening this menu.');return;}
  const controls=$('control-menu');if(controls?.hidePopover&&controls.matches(':popover-open'))controls.hidePopover();
  clearInput();
  for (const d of dialogs) if (d.open) d.close();
  if(id==='pause-dialog'){resetDevEntry();refreshAircraftRescue();}
  $(id).showModal();
  const lesson={'phone-dialog':'phone','services-dialog':'shops','jobs-dialog':'jobs','campaign-dialog':'jobs'}[id];if(lesson)observeTutorialMenu(lesson);
  if (id === 'map-dialog') { refreshModeUI(); fitMapCanvas(); drawMap($('full-map'), true); }
}
function closeDialogs() { for (const dialog of dialogs) if (dialog.open) dialog.close(); clearInput(); }
for (const button of document.querySelectorAll('[data-close]')) button.addEventListener('click', () => $(button.dataset.close).close());
for (const dialog of dialogs) dialog.addEventListener('close', () => { clearInput(); renderer?.domElement.focus(); });
$('map-button').addEventListener('click', () => openDialog('map-dialog'));
$('minimap-button').addEventListener('click', () => openDialog('map-dialog'));
$('minimap-zoom').addEventListener('click', event => {
  minimapZoomed = !minimapZoomed;
  event.currentTarget.setAttribute('aria-pressed', String(minimapZoomed));
  event.currentTarget.textContent = minimapZoomed ? '−' : '+';
  drawMap($('minimap'), false);
});
$('pause-button').addEventListener('click', () => openDialog('pause-dialog'));
$('pause-garage-button').addEventListener('click', () => { streetUI.renderGarage(); openDialog('garage-dialog'); });
function resetDevEntry(){
  $('dev-code-section').open=false;$('dev-code-input').value='';$('dev-code-status').textContent='';
}
$('pause-dialog').addEventListener('close',resetDevEntry);
$('dev-code-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const value=$('dev-code-input').value;$('dev-code-input').value='';
  if(!started||!$('pause-dialog').open)return;
  if(await matchesGodModeCode(value)){
    if(!started||!$('pause-dialog').open)return;
    godMode=!godMode;$('dev-code-status').textContent=godMode?'God Mode enabled for this session.':'God Mode disabled.';return;
  }
  if(await matchesMissionCode(value)){missionToolsUnlocked=true;showDeveloperMissions();$('dev-code-status').textContent='Mission selector unlocked.';return;}
  if(isSandbox())return;
  const result=progression.redeemDevCode(value,careerContext());
  if(result.ok){saveCareer();streetUI.refresh();}
  $('dev-code-status').textContent=result.ok?(careerError?'Applied for this session. Saving is unavailable.':'Applied.'):result.message;
});
function showDeveloperMissions(){
  $('mission-dev-picker').hidden=!missionToolsUnlocked;
  const select=$('mission-dev-select');select.replaceChildren();
  for(const chapter of campaign.developerChapters()){
    const option=document.createElement('option');option.value=chapter.id;
    const hero=campaign.characters.find(hero=>hero.id===chapter.character);
    option.textContent=`${hero?.name||'Crew'} · ${chapter.name}`;select.append(option);
  }
}
function finishDeveloperPreview(retry=false){
  if(!developerReturn)return true;
  if(campaign.state.active||gameplay.state.recovery||developerReturn.blocked&&!retry)return false;
  const back=developerReturn;
  aircraft?.reset();clearInterior();resetDelivery();rideService?.reset();buses?.reset();micromobility?.reset();equipment?.reset();
  gameMode=back.mode;selectedGameMode=back.mode;gameplay.reset({sandbox:isSandbox()});syncExternalVehicles();
  const result=gameplay.restoreProtagonist(back.body);
  if(result.ok){developerReturn=null;resetCampaignWorld();syncExternalVehicles();}
  else {back.blocked=true;notify('Your return place is blocked. Original state is kept. Retry return in Pause > Developer.');}
  $('mission-dev-return').hidden=!!result.ok;
  refreshProtagonistVehicle();syncPlayerAppearance();refreshModeUI();
  destination=null;route=[];lastJobTarget='';cameraReady=false;clearInput();pedestrians.resetPopulation(focus());
  return result.ok;
}
$('mission-dev-return').addEventListener('click',()=>{campaign.cancel();finishDeveloperPreview(true);});
$('mission-dev-play').addEventListener('click',()=>{
  if(aircraft?.active){notify('Land and leave the aircraft before a mission preview.');return;}
  if(!missionToolsUnlocked||!started||gameplay.state.recovery)return;
  if(interiors.active){notify('Go outside before starting a mission preview so your position can be kept.');return;}
  if(gameplay.state.vehicle.rented){notify('Return the rental before a mission preview.');return;}
  if(gameplay.state.health<=0||gameplay.state.actor.impactTime>0){notify('Recover from the impact before starting a mission preview.');return;}
  if(developerReturn){campaign.cancel();if(!finishDeveloperPreview(true))return;}
  const chapter=campaign.developerChapters().find(chapter=>chapter.id===$('mission-dev-select').value);
  const hero=campaign.characters.find(hero=>hero.id===chapter?.character);if(!chapter||!hero)return;
  if(!endCampaignAttempt())return;
  saveCareer();developerReturn={mode:gameMode,body:protagonistCheckpoint(),campaign:campaign.serialize()};
  progression.cancelJob();progression.cancelActivity();
  aircraft?.reset();clearInterior();resetDelivery();rideService?.reset();buses?.reset();micromobility?.reset();equipment?.reset();
  gameMode='campaign';selectedGameMode='campaign';gameplay.reset({sandbox:false});syncExternalVehicles();
  const captured=developerReturn.body;
  const launch={...captured,weapon:progression.state.equipment[captured.weapon]?captured.weapon:'unarmed',
    ammunition:Object.fromEntries(WEAPONS.map(weapon=>[weapon.id,progression.state.equipment[weapon.id]?captured.ammunition[weapon.id]:{ammo:0,reserveAmmo:0}]))};
  const restored=gameplay.restoreProtagonist(launch);
  if(!restored.ok){finishDeveloperPreview();$('dev-code-status').textContent='Your current position is blocked. Move clear before starting the preview.';return;}
  const result=campaign.startDeveloper(chapter.id,{...careerContext(),developer:true});
  if(!result.ok){finishDeveloperPreview();$('dev-code-status').textContent=result.message;return;}
  refreshProtagonistVehicle();syncPlayerAppearance();refreshModeUI();
  cameraReady=false;clearInput();closeDialogs();pedestrians.resetPopulation(focus());
  routeTo(campaignNavigationTarget());notify('Mission preview started here. Campaign progress is kept.');
});
$('resume-button').addEventListener('click', closeDialogs);
$('clear-progress-open').addEventListener('click',()=>{
  $('clear-progress-text').value='';
  $('clear-progress-status').textContent='';
  openDialog('clear-progress-dialog');
  $('clear-progress-text').focus();
});
$('clear-progress-form').addEventListener('submit',event=>{
  event.preventDefault();
  if(clearingProgress)return;
  if($('clear-progress-text').value.trim()!=='CLEAR'){
    $('clear-progress-status').textContent='Type CLEAR to confirm.';
    return;
  }
  if(skylineLease){skylineJob.cancel();handleSkylineEvents();}
  clearingProgress=true;
  let result;
  try { result=clearCapitalProgress(localStorage); } catch { result={ok:false,message:'Save storage is unavailable.'}; }
  if(!result.ok){
    clearingProgress=false;$('clear-progress-status').textContent=result.message;return;
  }
  location.reload();
});
$('start-button').addEventListener('click', () => {
  if (!simulation || !gameplay || !streetUI || aircraft?.active) return;
  finishGraphicsTest();
  if(missionCheckpoint&&!endCampaignAttempt())return;
  jetpack?.reset(gameplay.state);cockpitCamera=false;
  cutscenes.cancel();cutscenes.drainEvents();pendingCutscene=null;cutsceneAnchor=null;setCutsceneVisible(false);
  if(selectedGameMode==='campaign'&&!campaign.state.character){renderCharacterChoices();notify('Choose a character first.');return;}
  carRental?.recover();
  if(!isSandbox())careerNitro=simulation.driving.nitroFuel;
  gameMode = selectedGameMode;
  burglary.reset();resetCampaignWorld();lightRail?.reset();heists?.cancel();depotTank?.reset();watercraft?.reset();clearInterior();micromobility?.reset();resetDelivery();rideService?.reset();equipment?.reset();followYoober=false; campaign.cancel();campaign.drainEvents();
  simulation.reset(); restoreParkedCars();
  if(!isSandbox())simulation.driving.nitroFuel=careerNitro;
  const hero=gameMode==='campaign'&&campaign.characters.find(c=>c.id===campaign.state.character);
  const heroCheckpoint=hero&&protagonists.get(hero.id);
  if(hero&&!heroCheckpoint)simulation.setPlayerVehicle({modelId:'lantern',color:0xe7e6df});
  const heroPose=hero&&!heroCheckpoint&&prepareCharacterStart(simulation,hero,{initial:true,publicEntries:CIVIC_INTERIOR_ENTRIES});
  if(hero&&!heroCheckpoint&&!heroPose){notify('No clear place to start this character. Try another opening.');return;}
  gameplay.reset({ sandbox: isSandbox(),startPose:heroPose,onFoot:!!hero&&hero.onFoot!==false });
  buses?.reset();progression.cancelActivity();
  streetDealers?.reset();
  if(!isSandbox()&&!heroCheckpoint)for(const weapon of WEAPONS)if(progression.state.equipment[weapon.id])gameplay.addAmmo(weapon.starterAmmo,weapon.id);
  if (progression.state.activeJob) progression.cancelJob();
  const starter=isSandbox()||hero?null:progression.prepareStarterVehicle(careerContext());
  const owned = starter?.vehicle||progression.state.ownedVehicles.find(car => car.id === 'lantern');
  if(heroCheckpoint){
    const restored=gameplay.restoreProtagonist(resumeCheckpoint(heroCheckpoint));
    if(!restored.ok){notify(`This character cannot resume: ${restored.reason}.`);return;}
    refreshProtagonistVehicle();
  }else if(hero){
    simulation.setPlayerVehicle({modelId:'lantern',color:0xe7e6df});
    gameplay.state.vehicle={modelId:'lantern',color:'#e7e6df',stolen:false};
    refreshProtagonistVehicle();
  }else applyPlayerVehicle({ modelId: 'lantern', color: owned?.color || '#e7e6df', health: isSandbox() ? 100 : owned?.health ?? 100 });
  restoreCareerInventory();
  destination = null; route = []; lastJobTarget = ''; mapSelection = null;
  pedestrians.resetPopulation(focus()); refreshModeUI(); streetUI.refresh();
  started = true; setGameControls(true);$('start-panel').hidden = true; document.body.classList.remove('intro-open');
  if($('guided-tutorial').checked){if(tutorial.snapshot().status==='active'){tutorial.resume(tutorialContext());tutorialRunning=true;tutorialVisible=true;syncTutorial();}else startTutorial();}
  else{tutorial.skip();tutorialRunning=false;tutorialVisible=false;syncTutorial();}
  syncPlayerAppearance();
  if(!isSandbox())saveCareer();
  clearInput(); cameraReady = false; renderer.domElement.focus();
  notify(starter?.assisted?starter.message:isSandbox() ? 'Free roam. Search the map for an address or landmark.' : gameMode==='campaign' ? 'Campaign. J opens the mission briefing.' : 'Street Life. E steps out; J opens jobs.');
  if(gameMode==='campaign') openCampaign();
});
for (const button of document.querySelectorAll('[data-game-mode]')) button.addEventListener('click', () => {
  selectedGameMode = button.dataset.gameMode;
  for (const option of document.querySelectorAll('[data-game-mode]')) option.setAttribute('aria-pressed', String(option === button));
  renderCharacterChoices();
});
$('change-mode-button').addEventListener('click', () => {
  if(skylineLease){notify('Finish or abandon Skylark retrieval before changing modes.');return;}
  if(depotTank?.isActive||lightRail?.passenger){notify('Exit the vehicle before changing modes.');return;}
  if(watercraft?.isActive){notify('Stop and leave the watercraft before changing modes.');return;}
  if(aircraft?.active){notify('Land and leave the aircraft before changing modes.');return;}
  if(jetpack?.active){notify('Land the jetpack before changing modes.');return;}
  if(developerReturn){campaign.cancel();if(!finishDeveloperPreview(true))return;}
  if(!endCampaignAttempt())return;
  clearRecon();
  aircraft?.reset();ordnance?.reset();heroPowers.cancelActive();vehicleDamage.reset();
  saveCareer();closeDialogs();tutorial=createTutorial(tutorial.serialize());tutorialRunning=false;tutorialVisible=false;tutorialStamp='';started=false;setGameControls(false);syncTutorial();clearInput();$('start-panel').hidden=false;
  document.body.classList.add('intro-open');
});
function recover() {
  if(skylineLease){notify('Abandon Skylark retrieval from its briefing before returning.');return;}
  if(depotTank?.isActive||lightRail?.passenger){notify('Exit the vehicle before returning to the road.');return;}
  if(watercraft?.isActive){notify('Stop and leave the watercraft first.');return;}
  if(jetpack?.active){notify('Land the jetpack first.');return;}
  if(aircraft?.active&&!aircraft.active.wrecked){notify('Land and leave the aircraft first.');return;}
  if(aircraft?.active?.wrecked&&!isSandbox()){
    if(gameplay.state.recovery)return;
    aircraftRescueHealth=gameplay.state.vehicleHealth;gameplay.state.health=0;clearInput();closeDialogs();notify('Rescue requested. Medical recovery is starting.');return;
  }
  if (!isSandbox()) return;
  carRental?.recover();
  aircraft?.reset();clearInterior();micromobility.reset();resetDelivery();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;
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
function previewGraphicsQuality(next) {
  if (quality === next) return;
  quality = next;
  resize();
}
function applyGraphicsQuality(next) {
  if (!graphicsPresets.includes(next)) return;
  previewGraphicsQuality(next);
  $('quality').value = $('startup-quality').value = quality;
  if (graphicsResult?.recommendation === quality) $('graphics-test-apply').hidden = true;
  try { localStorage.setItem('capital-drive-rendering-v1', quality); }
  catch {
    $('save-status').textContent = 'Graphics preference could not be saved.';
    if (!started) showGraphicsStatus('Graphics preference applies for this session.');
  }
}
function showGraphicsStatus(message) {
  const status = $('graphics-test-status');
  status.textContent = message;
  status.hidden = !message;
}
function graphicsLabel(id) {
  return Array.from($('startup-quality').options).find(option => option.value === id)?.textContent || id;
}
function showGraphicsPhase() {
  const current = graphicsTest.current;
  previewGraphicsQuality(current);
  showGraphicsStatus(`Testing ${graphicsLabel(current)} · ${graphicsPresets.indexOf(current) + 1}/${graphicsPresets.length}`);
}
function finishGraphicsTest(result = null, message = '') {
  if (graphicsBeforeTest === null) return;
  graphicsTest.cancel();
  previewGraphicsQuality(graphicsBeforeTest);
  graphicsBeforeTest = null;
  $('startup-quality').disabled = false;
  $('graphics-test').textContent = 'Test graphics';
  const apply = $('graphics-test-apply');
  if (!result?.results.some(profile => profile.fps > 0)) {
    graphicsResult = null;
    apply.hidden = true;
    showGraphicsStatus(message || (result ? 'The graphics test could not measure a frame rate.' : ''));
    return;
  }
  graphicsResult = result;
  const picked = graphicsLabel(result.recommendation);
  const rates = result.results.map(profile => `${graphicsLabel(profile.id)} ${Math.round(profile.fps)}`).join(' · ');
  showGraphicsStatus(`${result.fallback ? 'Fastest measured' : 'Suggested'}: ${picked}. Preview FPS: ${rates}.`);
  apply.textContent = `Use ${picked}`;
  apply.hidden = result.recommendation === quality;
}
$('quality').addEventListener('change', event => applyGraphicsQuality(event.target.value));
$('startup-quality').addEventListener('change', event => applyGraphicsQuality(event.target.value));
$('graphics-test').addEventListener('click', () => {
  if (graphicsTest.active) { finishGraphicsTest(); return; }
  if (started || !renderer || compatibility || document.hidden || !graphicsTest.start(performance.now())) return;
  graphicsBeforeTest = quality;
  graphicsResult = null;
  $('startup-quality').disabled = true;
  $('graphics-test-apply').hidden = true;
  $('graphics-test').textContent = 'Cancel test';
  showGraphicsPhase();
});
$('graphics-test-apply').addEventListener('click', () => {
  if (graphicsResult && !graphicsTest.active) applyGraphicsQuality(graphicsResult.recommendation);
});
$('theme').addEventListener('change', () => document.body.classList.toggle('light', $('theme').value === 'light'));
$('clear-route').addEventListener('click', () => { route = []; destination = null; drawMap($('full-map'), true); });

function selectVehicle(id) {
  if (!scene) return;
  viewRevision++;
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
    const {geometry,material,texture}=createVehicleContactShadow();
    carShadowGeometry=geometry;carShadowMaterial=material;
    parkedResources.push(texture,geometry,material);
  }
  const shadow=new THREE.Mesh(carShadowGeometry,carShadowMaterial);
  shadow.scale.copy(vehicleShadowScale(BY_ID[mesh.userData.carId]));
  mesh.add(shadow);
}
function applyPlayerVehicle(vehicle, {newVehicle=true, sourceId}={}) {
  if(newVehicle)playerCarKey++;
  if(sourceId)parkedView?.hide(sourceId);
  selectedPaint = typeof vehicle.color === 'number' ? '#' + vehicle.color.toString(16).padStart(6, '0') : vehicle.color || '#e7e6df';
  if (gameplay?.state.mode === 'foot') {
    const actor = focus();
    simulation.teleport({ x: actor.x + Math.cos(actor.yaw) * 3.6, z: actor.z - Math.sin(actor.yaw) * 3.6, yaw: actor.yaw });
  }
  simulation.setPlayerVehicle({ modelId: vehicle.modelId, color: selectedPaint });
  if (gameplay) {
    gameplay.state.vehicle = { modelId: vehicle.modelId, color: selectedPaint, stolen: Boolean(vehicle.stolen), ...(vehicle.rented?{rented:true}:{}) };
    if (Number.isFinite(vehicle.health)) gameplay.state.vehicleHealth = vehicle.health;
  }
  selectVehicle(vehicle.modelId);
}

function toggleSound() {
  if (!audio) {
    let context;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      context = new Audio();
      audio = {context, engine:createDriveAudio(context), input:{}, enabled:false};
    } catch (error) {
      context?.close().catch(()=>{});
      notify(`Audio unavailable: ${error.message}`);
      return;
    }
  }
  audio.enabled = !audio.enabled;
  if (audio.enabled) audio.context.resume().catch(() => notify('Your browser could not start audio.'));
  else audio.engine.update({active:false});
  $('sound-button').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  $('sound-button').setAttribute('aria-pressed', String(audio.enabled));
  $('pause-sound-button').textContent = audio.enabled ? 'Sound on' : 'Sound off';
  $('pause-sound-button').setAttribute('aria-pressed', String(audio.enabled));
  if (!dialogs.some(dialog => dialog.open)) renderer.domElement.focus();
}
function combatFeedback(event){
  if(event.kind==='attack'&&event.hits>0)combatCueTime=.18;
  if(event.kind==='reload')combatReloadDuration=gameplay?.state.reloading||0;
  if(event.kind==='dry-fire'){combatStatusText='Out of ammunition';combatStatusTime=1.2;}
  if(!audio?.enabled||!['attack','reload','reload-complete','dry-fire','explosion'].includes(event.kind))return;
  const context=audio.context,voices=audio.voices||(audio.voices=new Set());
  if(voices.size>=6)return;
  const now=context.currentTime,weapon=weaponById(event.weapon||gameplay.state.weapon),gun=event.kind==='attack'&&weapon,blast=event.kind==='explosion';
  const duration=blast?.3:gun?(weapon.id==='shotgun'?.18:.11):.045;
  const gain=context.createGain(),tone=context.createOscillator();
  const voice={gain,tone};voices.add(voice);
  gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(blast?.06:gun?.05:.014,now+.004);gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  tone.type=blast?'sawtooth':gun?'triangle':'square';tone.frequency.setValueAtTime(blast?65:gun?(weapon.id==='shotgun'?78:145):event.kind==='dry-fire'?100:420,now);
  tone.frequency.exponentialRampToValueAtTime(blast?22:gun?45:150,now+duration);tone.connect(gain);gain.connect(context.destination);
  if(gun||blast){
    if(!audio.combatNoise){
      const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.2),context.sampleRate),samples=buffer.getChannelData(0);let seed=92731;
      for(let i=0;i<samples.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;samples[i]=(seed/4294967296*2-1)*.7;}
      audio.combatNoise=buffer;
    }
    voice.noise=context.createBufferSource();voice.filter=context.createBiquadFilter();voice.noise.buffer=audio.combatNoise;
    voice.filter.type='lowpass';voice.filter.frequency.value=blast?650:weapon.id==='shotgun'?1300:2600;voice.noise.connect(voice.filter);voice.filter.connect(gain);voice.noise.start(now);voice.noise.stop(now+duration);
  }
  tone.onended=()=>{tone.disconnect();gain.disconnect();voice.noise?.disconnect();voice.filter?.disconnect();voices.delete(voice);};
  tone.start(now);tone.stop(now+duration+.005);
}
$('sound-button').addEventListener('click', toggleSound);
$('pause-sound-button').addEventListener('click', toggleSound);
function horn(level=.07,duration=.3) {
  if (!audio?.enabled) return;
  const now=audio.context.currentTime;
  for (const frequency of [311, 392]) {
    const tone = audio.context.createOscillator(), volume = audio.context.createGain();
    tone.frequency.value = frequency; volume.gain.setValueAtTime(level,now);
    volume.gain.exponentialRampToValueAtTime(.001,now+duration);
    tone.connect(volume).connect(audio.context.destination); tone.start(now); tone.stop(now+duration+.02);
    tone.onended = () => { tone.disconnect(); volume.disconnect(); };
  }
}
function soundTrafficHorn({x,z}){
  if(!audio?.enabled||!gameplay||paused())return;
  const p=focus(),distance=Math.hypot(x-p.x,z-p.z),now=audio.context.currentTime;
  if(!Number.isFinite(distance)||distance>65||now-(audio.lastTrafficHorn??-Infinity)<.2)return;
  audio.lastTrafficHorn=now;
  horn(.058*(1-distance/90),.24);
}
function playSchoolAlarm(){
  if(!audio?.enabled)return;
  const now=audio.context.currentTime,tone=audio.context.createOscillator(),volume=audio.context.createGain();
  tone.type='triangle';volume.gain.setValueAtTime(.001,now);
  for(let i=0;i<6;i++){
    const t=now+i*.28;tone.frequency.setValueAtTime(i%2?640:960,t);
    volume.gain.setTargetAtTime(.055,t,.02);volume.gain.setTargetAtTime(.001,t+.22,.02);
  }
  tone.connect(volume).connect(audio.context.destination);tone.onended=()=>{tone.disconnect();volume.disconnect();};tone.start(now);tone.stop(now+1.75);
}
window.addEventListener('keydown', event => {
  if(cutscenes.snapshot().active){
    if(event.code==='Escape'){event.preventDefault();cutscenes.cancel();}
    else if(event.code==='Tab'){
      event.preventDefault();const skip=$('cutscene-skip'),cancel=$('cutscene-cancel');
      (document.activeElement===skip?cancel:skip).focus();
    }else if(!['Enter','Space'].includes(event.code)||!['cutscene-skip','cutscene-cancel'].includes(event.target.id))event.preventDefault();
    return;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if(event.code==='F1'){event.preventDefault();if(!event.repeat)openHelp();return;}
  if (/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(event.target.tagName) && event.code !== 'Escape') return;
  const controls = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyX', 'KeyZ', 'KeyI', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
  if (controls.includes(event.code)) event.preventDefault();
  if(event.code==='KeyF'&&started&&!paused()&&cockpitAvailable()){
    event.preventDefault();if(!event.repeat)toggleCockpit();return;
  }
  if (!event.repeat && started) {
    if(event.code==='KeyY'&&!paused()&&toggleHeistHostage()){event.preventDefault();return;}
    if(event.code==='KeyL'&&!paused()){activatePower();return;}
    if(event.code==='KeyN'&&!paused()){
      if(droneActive)toggleDroneNightVision();
      else toggleHeadlights();
      return;
    }
    if(event.code==='KeyO'&&!paused()){recallDrone('recalled');return;}
    if(event.code==='KeyR'&&droneActive&&!paused()){strikeDrone();return;}
    if(event.code==='KeyV'&&!paused()){throwEquipment('grenade');return;}
    if(event.code==='KeyC'&&!paused()){if(!jetpack?.active)throwEquipment('smoke');return;}
    if(event.code==='KeyU'&&!paused()){if(!skylineLease&&gameplay.state.mode==='foot'&&!gameplay.state.passenger)toggleJetpack();return;}
    if(event.code==='KeyT'){openPhone();return;}
    if(event.code==='KeyQ'&&!paused()){beginMini();return;}
    if(event.code==='KeyB'&&!paused()&&!jetpack?.active){
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
window.addEventListener('blur', () => { windowFocused=false;clearInput(); if (started && !cutscenes.snapshot().active && !dialogs.some(d => d.open)) openDialog('pause-dialog'); });
window.addEventListener('focus',()=>{windowFocused=true;});
document.addEventListener('visibilitychange', () => {
  clearInput();
  if (!document.hidden) return;
  finishGraphicsTest(null, 'Keep this tab visible during the graphics test.');
  if (started && !cutscenes.snapshot().active) openDialog('pause-dialog');
});
function touchInputEnabled() {
  return !paused() && !gameplay?.state.recovery && !(gameplay?.state.actor.impactTime > 0)
    && !activities.snapshot().active && !rentalHack.snapshot().active && !streetChallenge();
}
moveStick = createTouchJoystick($('touch-move'), { enabled: () => touchInputEnabled() && (!gameplay.state.passenger||!!aircraft?.active||!!watercraft?.isActive||!!depotTank?.isActive) });
lookStick = createTouchJoystick($('touch-look'), { enabled: touchInputEnabled });
function bindTouchHold(button, target, action) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (!touchInputEnabled() || touchHolds.has(button) || (event.pointerType === 'mouse' && event.button !== 0)) return;
    touchHolds.set(button, { id: event.pointerId });
    button.setPointerCapture(event.pointerId); target.add(action);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, event => {
    if (touchHolds.get(button)?.id !== event.pointerId) return;
    touchHolds.delete(button); target.delete(action);
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
  });
}
for (const button of document.querySelectorAll('[data-drive]')) bindTouchHold(button, touch, button.dataset.drive);
function interact() {
  if (!gameplay || paused() || droneActive) return;
  if(interactSkyline())return;
  if(jetpack?.active){notify('Press U to land before interacting.');return;}
  if(gameplay.state.recovery||gameplay.state.actor.impactTime>0)return;
  if(interactContractTarget()||openInquiry()||interactHeist()||interactLightRail()||interactDepotTank())return;
  if(interactStealthObjective())return;
  if(interactWatercraft())return;
  if(gameplay.state.mode==='vehicle'&&simulation.player.stuntActive){notify('Land and stop before getting out.');return;}
  if(interactAircraft())return;
  if(interactCarRental())return;
  if(refillCarNitro())return;
  if(delivery?.phase==='waiting'&&gameplay.state.mode==='foot'&&!interiors.active&&Math.hypot(focus().x-delivery.vehicles[0].x,focus().z-delivery.vehicles[0].z)<=6){
    const result=delivery.interact(deliveryContext());handleDeliveryEvents();
    if(!result.ok)notify(result.reason||result.message);return;
  }
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
    if(result.exited&&result.exitPose){Object.assign(gameplay.state.actor,result.exitPose,{speed:0,jumpHeight:0});footCameraYaw=gameplay.state.actor.yaw;footLookPitch=0;}
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
      const person=roomPeople.nearestDialogue(pose,{hasLineOfSight:visible});
      if(person){openNpcDialogue(person);return;}
      const station=nearbyActivityStation(pose);
      if(directStation(station)){beginMini(station.id);return;}
      if(plan.counter&&Math.hypot(pose.x-plan.counter.x,pose.z-plan.counter.z)<=plan.counter.radius){$('services-filter').value='all';streetUI.renderServices();openDialog('services-dialog');return;}
      if(station){beginMini(station.id);return;}
      notify('E at a station, counter or the exit.');return;
    }
    const entry=interiors.findEntry(pose);
    if(entry){if(!requestHouseEntry(entry))enterInterior(entry);return;}
    const site=progression.services.find(s=>Math.hypot(s.x-pose.x,s.z-pose.z)<=s.radius&&progression.canUseService(s,careerContext()));
    if(site){$('services-filter').value='all';streetUI.renderServices();openDialog('services-dialog');return;}
  }
  const previousMode = gameplay.state.mode;
  gameplay.interact();
  if (gameplay.state.mode !== previousMode) {
    footCameraYaw = gameplay.state.actor.yaw;footLookPitch=0; cameraReady = false; clearInput();
  }
  streetUI.refresh(); renderer.domElement.focus();
}
$('touch-enter').addEventListener('click', interact);
$('touch-power').addEventListener('click',activatePower);
$('touch-grenade').addEventListener('click',()=>throwEquipment('grenade'));
$('touch-smoke').addEventListener('click',()=>throwEquipment('smoke'));
$('recon-scan').addEventListener('click',()=>{if(!paused()){scanHeld=true;renderer.domElement.focus();}});
$('recon-phone-camera').addEventListener('click',()=>{closeDialogs();renderer.domElement.focus();notify('Frame the marked subject, then press I or SCAN.');});
$('fight-retry').addEventListener('click',()=>{const person=roomPeople.snapshot().find(p=>p.character==='booth-guest');if(person)openNpcDialogue(person);});
$('touch-weapon').addEventListener('click',()=>{if(paused())return;const owned=['unarmed',...WEAPONS.filter(w=>isSandbox()||progression.state.equipment[w.id]).map(w=>w.id)];gameplay.setWeapon(owned[(owned.indexOf(gameplay.state.weapon)+1)%owned.length]);});
for (const button of document.querySelectorAll('[data-action]')) bindTouchHold(button, actionTouch, button.dataset.action);
function walkingInput() {
  if(droneActive||paused()||gameplay?.state.recovery||gameplay?.state.passenger||(streetChallenge()?.aircraft||streetChallenge()?.house)||(activities.active??activities.snapshot().active)||rentalHack.snapshot().active||(micromobility?.active??micromobility?.snapshot().active))return {};
  const combat=canPlayerAttack();
  const stick = moveStick.snapshot();
  const vaultInput=skylineLease&&skylineJob.snapshot().stage==='safe';
  const forward = THREE.MathUtils.clamp(Number(keys.has('KeyW') || !vaultInput&&keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown')) - stick.y, -1, 1);
  const lateral = THREE.MathUtils.clamp(Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')) + stick.x, -1, 1);
  return { moveX: -Math.sin(footCameraYaw) * forward + Math.cos(footCameraYaw) * lateral,
    moveZ: -Math.cos(footCameraYaw) * forward - Math.sin(footCameraYaw) * lateral,
    aimYaw: footCameraYaw, aimPitch:footLookPitch, sprint: keys.has('ShiftLeft') || keys.has('ShiftRight') || touch.has('boost'),
    crouch: keys.has('KeyX') || actionTouch.has('crouch'),
    jump: keys.has('Space') || touch.has('handbrake'), aim: combat&&(mouseAim || keys.has('KeyZ') || actionTouch.has('aim')),
    fire: combat&&(mouseFire || actionTouch.has('fire')), melee: combat&&keys.has('KeyF') };
}
function input() {
  if(droneActive)return {throttle:0,steer:0,handbrake:true,boost:false};
  const held = (...codes) => codes.some(c => keys.has(c));
  const stick = moveStick.snapshot();
  return { throttle: THREE.MathUtils.clamp(Number(held('KeyW', 'ArrowUp')) - Number(held('KeyS', 'ArrowDown')) - stick.y, -1, 1),
    steer: THREE.MathUtils.clamp(Number(held('KeyD', 'ArrowRight')) - Number(held('KeyA', 'ArrowLeft')) + stick.x, -1, 1),
    handbrake: held('Space') || touch.has('handbrake'), boost: held('ShiftLeft', 'ShiftRight') || touch.has('boost') };
}
function updateTouchCamera(dt) {
  if (!touchInputEnabled() || !(dt > 0)) { moveStick.clear(); lookStick.clear(); return; }
  const look = lookStick.snapshot();
  if (!look.x && !look.y) return;
  const step = Math.min(.075, dt);
  const before = [footCameraYaw, footLookPitch, orbit, lookPitch];
  if (gameplay.state.mode === 'foot' && !gameplay.state.passenger) {
    footCameraYaw -= look.x * 2.1 * step;
    footLookPitch=THREE.MathUtils.clamp(footLookPitch-look.y*1.7*step,-MAX_AIM_PITCH,MAX_AIM_PITCH);
  } else {
    orbit -= look.x * 2.1 * step;
    lookPitch = THREE.MathUtils.clamp(lookPitch - look.y * 1.2 * step, -.5, .72);
  }
  if (before.some((value, i) => value !== [footCameraYaw, footLookPitch, orbit, lookPitch][i])) tutorialSerials.orbitSerial++;
  orbitHold = 3;
}
function updateKeyboardLook(dt){
  if(paused()||gameplay.state.mode!=='foot'||gameplay.state.passenger||gameplay.state.recovery||gameplay.state.actor.impactTime>0||activities.snapshot().active||streetChallenge())return;
  const change=(Number(keys.has('PageUp'))-Number(keys.has('PageDown')))*Math.min(.075,dt)*1.5;
  if(change){footLookPitch=THREE.MathUtils.clamp(footLookPitch+change,-MAX_AIM_PITCH,MAX_AIM_PITCH);tutorialSerials.orbitSerial++;}
}

function createMapImage() {
  const b = map.bounds;
  mapImage = document.createElement('canvas');
  mapScale = Math.min(1800 / (b.maxX - b.minX), 2400 / (b.maxZ - b.minZ));
  mapImage.width = Math.round((b.maxX - b.minX) * mapScale);
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
  for(const line of lightRail?.routes||[]){
    if(!line.direction)continue;
    path(line.points);ctx.strokeStyle='#a24342';ctx.lineWidth=1.7;ctx.stroke();
  }
}
function drawMap(canvas, full) {
  if (!mapImage) return;
  const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height, p = focus(), b = map.bounds;
  ctx.fillStyle = '#dfdfcc'; ctx.fillRect(0, 0, w, h);
  const projection = full ? fullMapProjection() : null;
  const scale = full ? projection.scale : w / (minimapZoomed ? 380 : 760);
  const details = full ? mapView.zoom >= 4 : minimapZoomed;
  const cx = full ? projection.cx : p.x, cz = full ? projection.cz : p.z;
  const sx = x => (x - cx) * scale + w / 2, sz = z => (z - cz) * scale + h / 2;
  const visible = (x,y,pad=12) => x >= -pad && x <= w+pad && y >= -pad && y <= h+pad;
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
  if(full&&mapView.zoom>12)drawMapDetail(ctx,map,projection,lightRail?.routes);
  else ctx.drawImage(mapImage, sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale);
  ctx.strokeStyle = '#6d7d70'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.strokeRect(sx(b.minX), sz(b.minZ), (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale); ctx.setLineDash([]);
  if(full&&(showBusRoutes||buses?.passenger)&&!stealthPreview){
    const busRide=buses.tracking();
    for(const service of buses.services){
      if(!showBusRoutes&&service.id!==busRide?.routeId)continue;
      const colour=service.id===busRide?.routeId?'#147372':'#426d88';
      ctx.beginPath();
      service.points.forEach(({x,z},i)=>ctx[i?'lineTo':'moveTo'](sx(x),sz(z)));
      ctx.closePath();ctx.strokeStyle=colour;ctx.lineWidth=3;ctx.setLineDash([6,4]);ctx.stroke();ctx.setLineDash([]);
      for(const stop of service.stops){
        const x=sx(stop.x),y=sz(stop.z);
        ctx.beginPath();ctx.arc(x,y,6,0,Math.PI*2);ctx.fillStyle=colour;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
        label(`${service.name} · ${stop.name}`,x,y,'bold 13px Arial');
      }
    }
  }
  const target=skylineObjective()||destination,flight=target&&navigationFlightPose();
  if(flight){
    ctx.beginPath();ctx.moveTo(sx(flight.x),sz(flight.z));ctx.lineTo(sx(target.x),sz(target.z));
    ctx.setLineDash([8,6]);ctx.strokeStyle='#a24933';ctx.lineWidth=full?4:5;ctx.stroke();ctx.setLineDash([]);
  }else if (route.length) {
    ctx.beginPath(); route.forEach(([x, z], i) => ctx[i ? 'lineTo' : 'moveTo'](sx(x), sz(z)));
    ctx.strokeStyle = '#db742a'; ctx.lineWidth = full ? 5 : 6; ctx.lineJoin = 'round'; ctx.stroke();
  }
  const places=details ? map.landmarks : [];
  for (const place of places) {
    const x = sx(place.x), y = sz(place.z);
    if (!visible(x,y)) continue;
    ctx.beginPath(); ctx.arc(x, y, full ? 8 : 6, 0, Math.PI * 2); ctx.fillStyle = discovered.has(place.id) ? '#608467' : '#efb15e'; ctx.fill(); ctx.strokeStyle = '#fff8e7'; ctx.lineWidth = 2; ctx.stroke();
    if(full&&!stealthPreview&&(!place.store||mapView.zoom>=9||place.id===destination?.id))label(place.name,x,y);
  }
  if(details&&progression)for(const site of progression.services){
    const x=sx(site.x),y=sz(site.z);
    if(!visible(x,y)||map.landmarks.some(place=>place.id===site.id))continue;
    ctx.fillStyle=site.type==='gym'?'#37614e':site.type==='arms'?'#80563e':'#986b34';ctx.fillRect(x-4,y-4,8,8);
    if(full&&!stealthPreview)label(site.name,x,y,'12px Arial');
  }
  for(const site of details ? map.servicePins||[] : []){
    const x=sx(site.x),y=sz(site.z),size=full?22:24,r=size/2;
    if(x < -r||x > w+r||y < -r||y > h+r)continue;
    serviceMapIcons.draw(ctx,site.service,x,y,size);
    if(full&&!stealthPreview&&(mapView.zoom>=4||site.id===mapSelection?.id))label(site.name,x,y,'bold 13px Arial');
  }
  if(target){
    const x=sx(target.x),y=sz(target.z);
    if(visible(x,y)){
      ctx.beginPath();ctx.arc(x,y,full?8:6,0,Math.PI*2);ctx.fillStyle='#db742a';ctx.fill();
      ctx.strokeStyle='#fff8e7';ctx.lineWidth=2;ctx.stroke();
      if(full&&!stealthPreview&&(!details||skylineLease))label(target.name||target.label,x,y);
    }
  }
  if(full&&stealthPreview){
    const {route:preview,entry,exit}=stealthPreview;
    if(preview.length){
      ctx.beginPath();preview.forEach(([x,z],index)=>ctx[index?'lineTo':'moveTo'](sx(x),sz(z)));
      ctx.strokeStyle='#166756';ctx.lineWidth=3;ctx.setLineDash([7,5]);ctx.stroke();ctx.setLineDash([]);
    }
    for(const [stage,name,colour] of [[entry,'Approach','#166756'],[exit,'Extraction','#483781']]){
      const x=sx(stage.x),y=sz(stage.z);
      ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fillStyle=colour;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
      label(name,x,y,'bold 13px Arial');
    }
  }
  if (full && mapSelection) {
    const x = sx(mapSelection.x), y = sz(mapSelection.z);
    ctx.strokeStyle = '#a34624'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 13, 0, Math.PI * 2); ctx.moveTo(x - 21, y); ctx.lineTo(x + 21, y); ctx.moveTo(x, y - 21); ctx.lineTo(x, y + 21); ctx.stroke();
  }
  if(details)drawCameraMarks(ctx,securityCameras?.mapMarks(interiors?.active?.id||null)||[],{w,h,sx,sz,full,label});
  const pressure=skylineLease&&skylinePressure.snapshot();
  if(pressure?.strike?.active){
    const {strike}=pressure,x=sx(strike.x),y=sz(strike.z),r=Math.max(7,strike.radius*scale);
    if(visible(x,y,r)){
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#ba282957';ctx.fill();
      ctx.strokeStyle='#b32223';ctx.lineWidth=2;ctx.stroke();
    }
  }
  const tracked=rideService?.activeFare&&rideService.vehicles[0];
  if(tracked?.active){
    const x=sx(tracked.x),y=sz(tracked.z);
    if(x>=0&&x<=w&&y>=0&&y<=h){ctx.save();ctx.translate(x,y);ctx.rotate(-tracked.yaw);ctx.fillStyle='#7054a1';ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.fillRect(-7,-10,14,20);ctx.strokeRect(-7,-10,14,20);ctx.restore();if(full){ctx.fillStyle='#3e2c61';ctx.font='bold 13px Arial';ctx.fillText('Yoober',x+12,y-10);}}
    else if(!full){const angle=Math.atan2(y-h/2,x-w/2),edge=Math.min((w/2-17)/Math.max(.001,Math.abs(Math.cos(angle))),(h/2-17)/Math.max(.001,Math.abs(Math.sin(angle))));ctx.save();ctx.translate(w/2+Math.cos(angle)*edge,h/2+Math.sin(angle)*edge);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#7054a1';ctx.fill();ctx.restore();}
  }
  const courier=delivery?.tracking();
  if(courier){
    const x=sx(courier.car.x),y=sz(courier.car.z),dx=sx(courier.dropoff.x),dy=sz(courier.dropoff.z);
    ctx.strokeStyle='#684716';ctx.lineWidth=2;ctx.strokeRect(dx-8,dy-8,16,16);
    if(full)label('Handover',dx,dy,'bold 13px Arial');
    if(x>=0&&x<=w&&y>=0&&y<=h){ctx.save();ctx.translate(x,y);ctx.rotate(-courier.car.yaw);ctx.fillStyle='#a16a19';ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.fillRect(-7,-10,14,20);ctx.strokeRect(-7,-10,14,20);ctx.restore();if(full)label('Courier',x,y,'bold 13px Arial');}
    else if(!full){const angle=Math.atan2(y-h/2,x-w/2),edge=Math.min((w/2-17)/Math.max(.001,Math.abs(Math.cos(angle))),(h/2-17)/Math.max(.001,Math.abs(Math.sin(angle))));ctx.save();ctx.translate(w/2+Math.cos(angle)*edge,h/2+Math.sin(angle)*edge);ctx.rotate(angle);ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(-7,-7);ctx.lineTo(-7,7);ctx.closePath();ctx.fillStyle='#a16a19';ctx.fill();ctx.restore();}
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
    const scanner=progression&&currentGear().scanner,range=Math.hypot(police.x-p.x,police.z-p.z);
    if(scanner?range>1200:!gameplay.state.wanted||range>130||!simulation.hasLineOfSight(p,police))continue;
    ctx.fillStyle = police.seesPlayer ? '#a84637' : '#416f9b';
    ctx.beginPath(); ctx.arc(sx(police.x), sz(police.z), full ? 5 : 4, 0, Math.PI * 2); ctx.fill();
  }
  const airPin=(pose,kind,name)=>{
    const x=sx(pose.x),y=sz(pose.z);
    if(x<-12||x>w+12||y<-12||y>h+12)return;
    serviceMapIcons.draw(ctx,kind,x,y,full?23:20);
    if(full)label(name,x,y,'bold 13px Arial');
  };
  for(const craft of gameplay?.policeSupport?.()||[]){
    if(craft.kind==='helicopter')airPin(craft,'helicopter','Police helicopter');
    if(craft.kind==='drone')airPin(craft,'police-drone','Police drone');
  }
  if(pressure?.drone?.active)airPin(pressure.drone,'police-drone','Skylark drone');
  for(const plane of details ? aircraft?.snapshot().planes||[] : []){
    if(plane.kind==='helicopter'&&!plane.wrecked)airPin(plane,'depot-helicopter',plane.name);
  }
  ctx.save(); ctx.translate(sx(p.x), sz(p.z)); ctx.rotate(-p.yaw);
  ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 10); ctx.lineTo(0, 6); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fillStyle = '#182d38'; ctx.fill(); ctx.strokeStyle = '#fff9e9'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  if(droneActive)airPin(drone.snapshot(),'player-drone','Your drone');
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
    const location=road?.road.name && road.distance < 50 ? 'Near ' + road.road.name : 'Selected ground';
    $('teleport-status').textContent = point.service ? `${point.label} · ${point.detail}` : `${location} · ${Math.abs(lat).toFixed(5)}° S, ${lon.toFixed(5)}° E`;
  } else $('teleport-status').textContent = 'Choose a point inside the mapped boundary.';
  drawMap($('full-map'), true);
}
function teleportSelected() {
  if(skylineLease){notify('Finish or abandon Skylark retrieval before map travel.');return;}
  if(aircraft?.active){notify('Land and leave the aircraft before map travel.');return;}
  if(jetpack?.active){notify('Land the jetpack before map travel.');return;}
  if(watercraft?.isActive){notify('Stop and leave the watercraft before map travel.');return;}
  if(depotTank?.isActive||lightRail?.passenger){notify('Exit the vehicle before map travel.');return;}
  if (!isSandbox()) { $('teleport-status').textContent = 'Street Life uses road routes. Teleporting is available in Free roam.'; return; }
  if (!mapSelection) return;
  const arrival = simulation.teleport(mapSelection);
  if (!arrival.ok) { $('teleport-status').textContent = 'No clear ground at this point. Choose a nearby spot.'; return; }
  carRental?.recover();
  aircraft?.reset();clearInterior();micromobility.reset();resetDelivery();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;gameplay.reset({ sandbox: true });
  pedestrians.resetPopulation(simulation.player);
  cameraReady = false; accumulator = 0; orbit = 0; orbitHeight = 0; lookPitch = 0; clearInput();
  if (destination) route = findRoute(simulation.graph, simulation.player, destination);
  world.update(simulation.player); neighbourhood.update(simulation.player);
  closeDialogs();
  notify(arrival.adjusted ? `Teleported to clear ground ${Math.round(arrival.distance)} m from your selected point.` : 'Teleported to your selected point.');
}
function changeMapZoom(multiplier, point = null) {
  followYoober=false;followCourier=false;
  const before = fullMapProjection(), next = THREE.MathUtils.clamp(mapView.zoom * multiplier, 1, MAP_MAX_ZOOM);
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
  followYoober=false;followCourier=false;
  mapView.x = THREE.MathUtils.clamp(mapDrag.x - dx * mapCanvas.width / mapDrag.rect.width / mapDrag.scale, map.bounds.minX, map.bounds.maxX);
  mapView.z = THREE.MathUtils.clamp(mapDrag.z - dy * mapCanvas.height / mapDrag.rect.height / mapDrag.scale, map.bounds.minZ, map.bounds.maxZ);
  drawMap(mapCanvas, true);
});
mapCanvas.addEventListener('pointerup', event => {
  if (!mapDrag || event.pointerId !== mapDrag.pointerId) return;
  if (!mapDrag.moved){
    const projection=fullMapProjection();
    const point=mapPointFromClient(projection,mapCanvas.getBoundingClientRect(),event.clientX,event.clientY,map.bounds);
    const pin=point&&mapView.zoom>=4&&nearestServicePin(point,14/projection.scale);
    selectMapPoint(pin?serviceMapMatch(pin):point);
  }
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
$('map-bus-routes').addEventListener('click',event=>{
  showBusRoutes=!showBusRoutes;
  event.currentTarget.setAttribute('aria-pressed',String(showBusRoutes));
  drawMap(mapCanvas,true);
});
$('map-recenter').addEventListener('click', () => { followYoober=false;followCourier=false;mapView.x = focus().x; mapView.z = focus().z; mapView.zoom = 4; $('map-zoom-level').textContent = '4×'; drawMap(mapCanvas, true); });
function routeSelected() {
  if (!mapSelection) return;
  routeTo({ ...mapSelection, name: mapSelection.label || 'Selected point' });
  if(route.length||airNavigationActive()){observeTutorialMenu('map-route');closeDialogs();updateNavigation();}
  notify(route.length ? 'Road route set. Follow the yellow arrow.' : 'No connected road route found.');drawMap(mapCanvas,true);
}
$('map-route-button').addEventListener('click', routeSelected);
function nearestServicePin(point,range,service){
  let nearest=null;
  for(const site of map.servicePins||[]){
    if(service&&site.service!==service)continue;
    const distance=Math.hypot(site.x-point.x,site.z-point.z);
    if(distance<range){nearest=site;range=distance;}
  }
  return nearest;
}
function serviceMapMatch(site){
  const kind={petrol:'Petrol',rental:'Car rental','boat-shop':'Watercraft',rail:'Light rail',heist:'Heist'};
  return {...site,label:site.name,kind:kind[site.service]||'Service',detail:site.description};
}
function showMapMatches(matches){
  const results = $('search-results'); results.replaceChildren();
  if (!matches.length) { results.textContent = 'No mapped match. Try a street or landmark name.'; return; }
  for (const result of matches) {
    const pin=(map.servicePins||[]).find(site=>`landmark:${site.id}`===result.id);
    const match=pin?serviceMapMatch(pin):result;
    const button = document.createElement('button'); button.type = 'button';
    const copy=document.createElement('span'), title=document.createElement('strong'), detail=document.createElement('small');
    copy.className='map-result-copy';title.textContent=match.label;
    detail.textContent=`${match.kind} · ${match.detail||'Local map point'}`;copy.append(title,detail);
    const icon=serviceMapIcons.createElement(match.service);
    if(icon)button.append(icon);
    button.append(copy);
    button.addEventListener('click', () => {
      mapView.x = match.x; mapView.z = match.z; mapView.zoom = 5; $('map-zoom-level').textContent = '5×';
      selectMapPoint({ ...match }); results.replaceChildren(); mapCanvas.focus();
    }); results.append(button);
  }
}
$('map-search-form').addEventListener('submit', event => {
  event.preventDefault();
  const stands=new Set(aircraft.snapshot().planes.map(plane=>`landmark:stand:${plane.id}`));
  showMapMatches(addressSearch.search($('map-search').value, 20)
    .filter(result=>(isSandbox()||result.kind!=='address')&&(!result.id.startsWith('landmark:stand:')||stands.has(result.id))).slice(0,8));
});
for(const button of document.querySelectorAll('[data-map-service]')){
  const service=button.dataset.mapService;
  const icon=serviceMapIcons.createElement(service);
  if(icon)button.prepend(icon);
  button.addEventListener('click',()=>{
    const p=focus();
    showMapMatches((map.servicePins||[]).filter(site=>site.service===service)
      .map(site=>({...serviceMapMatch(site),distance:Math.round(Math.hypot(site.x-p.x,site.z-p.z))}))
      .sort((a,b)=>a.distance-b.distance).map(match=>({...match,detail:`${match.distance} m · ${match.detail}`})));
  });
}
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
      routeTo(place);
      if(route.length||airNavigationActive()){observeTutorialMenu('map-route');closeDialogs();updateNavigation();}
      drawMap($('full-map'), true);
      notify(route.length ? `Route set to ${place.name}.` : 'No connected road route found. Choose another place.');
    });
    const start = document.createElement('button'); start.textContent = 'Start nearby';
    start.dataset.startNearby = place.id; start.hidden = !isSandbox();
    start.addEventListener('click', () => {
      if (!isSandbox()||aircraft?.active) return;
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
        aircraft?.reset();clearInterior();micromobility.reset();
        carRental?.recover();
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
  parkedSourceCars.push(...generateParkedCars(map,{isClear:(_x,_z,_radius,pose)=>simulation.canOccupy(pose)}));
  simulation.setParkedCars(parkedSourceCars);
  parkedView = createParkedCarsView(scene, parkedSourceCars, car=>world.vehicleHeightAt(car,car.edge?.road));
}
function restoreParkedCars() {
  vehicleFires.reset();
  simulation.setParkedCars(parkedSourceCars); simulation.abandonedCars.length = 0;
  parkedView?.restore();
}
function resize() {
  clearInput();
  viewRevision++;
  if (!renderer) return;
  const w = window.innerWidth, h = window.innerHeight,profile=renderProfile(quality),scale=Math.min(1,profile.width/w,profile.height/h);
  if(!compatibility)renderer.toneMappingExposure=profile.exposure??1.05;
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
      for(const craft of watercraft?.vehicles||[])car(craft,craft.kind==='boat'?'#e6e2d3':'#37bdd5');
      for (const unit of gameplay?.state.police || []) {
        if(unit.health<=0||unit.interiorId)continue;
        if(unit.car?.active)car(unit.car,'#416c97');
        if(unit.mode==='vehicle')continue;
        const x=(unit.x-p.x)*scale+w/2,y=(unit.z-p.z)*scale+h/2;
        if(x<0||x>w||y<0||y>h)continue;
        context.fillStyle='#416c97';context.beginPath();context.arc(x,y,3,0,Math.PI*2);context.fill();
      }
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
const coverDirections=[[1,0],[-1,0],[0,1],[0,-1]];
function nearbyCrouchCover(pose){
  const plan=interiors.active, y=(plan?.floorY??world.heightAt(pose.x,pose.z))+.85, range=1.65;
  return Number.isFinite(y)&&coverDirections.some(([dx,dz])=>shotObstacles.trace({x:pose.x,y,z:pose.z,dx,dy:0,dz,range,
    interiorId:plan?.id||null},plan,[])<range-.02);
}
function updateHud() {
  const p = focus(), nearby = simulation.nearestRoad(p.x, p.z);
  const gear=currentGear(),armour=$('armour-value');
  if(armour)armour.textContent=String(Math.floor(gear.armour??0));
  const heistNotice=$('heist-notice'),robbery=heists?.active?heists.snapshot():null;
  const skyline=skylineLease&&skylineJob.snapshot();
  const pressure=skyline&&skylinePressure.snapshot(),strike=pressure?.strike;
  heistNotice.hidden=(!robbery || !!robbery.challenge) && !skyline;
  heistNotice.classList.toggle('skyline-danger',!!strike?.active);
  if(skyline){
    const support=skylineSupport.snapshot();
    const detail=strike?.active?`Airstrike in ${Math.ceil(strike.remaining)}s · Leave the red ring`:
      support.jammerRemaining>0?`Jammer ${Math.ceil(support.jammerRemaining)}s`:
      pressure?.drone?.active?'Hostile drone overhead':support.balance>0?'T · Support radio':'';
    const notice=`${skyline.objective}${detail?' · '+detail:''}`;
    if(heistNotice.textContent!==notice)heistNotice.textContent=notice;
  }
  const hostage=$('heist-hostage'),hostageAction=robbery?heists.hostageAction(heistContext()):null;
  hostage.hidden=!hostageAction;
  if(hostageAction)hostage.textContent=hostageAction==='release'?'Release hostage · Y':'Hold hostage · Y';
  if(robbery&&!robbery.challenge){
    const hold=robbery.hostage?` · Standoff ${Math.ceil(robbery.hostage.remaining)}s`:'';
    const notice=`${robbery.site.name}${hold} · ${robbery.guidance}`;
    if(heistNotice.textContent!==notice)heistNotice.textContent=notice;
  }
  updateCameraAlert(p);
  const manual=gameplay.state.mode==='vehicle'&&!aircraft?.active&&!gameplay.state.passenger;
  const car=simulation.player,speed=manual?Math.hypot(car.vx,car.vz):Math.abs(p.speed);
  const bus=buses?.tracking();
  const tram=lightRail?.passenger;
  const tank=depotTank?.isActive;
  const atv=skylineAtv?.seatPose;
  $('speed').textContent = String(Math.round(speed * 3.6));
  refreshAircraftRescue();
  $('gear').textContent = tram?'–':watercraft?.isActive?'LAKE':aircraft?.active?(aircraft.active.airborne?'AIR':'LAND'):p.speed < -.5 ? 'R' : Math.abs(p.speed) < .6 ? 'N' : String(Math.min(6, Math.floor(Math.abs(p.speed) / 8) + 1));
  $('speed-fill').style.width = `${Math.min(100, speed / 54 * 100)}%`;
  const busDistance=bus?.currentStop?'AT PLATFORM':bus?.distanceToNextStop!=null?`${bus.distanceToNextStop} M TO STOP`:null;
  $('distance').textContent = tram?(lightRail.passengerStopId?'AT PLATFORM':'EN ROUTE'):busDistance||(watercraft?.isActive?'LAKE BURLEY GRIFFIN':aircraft?.active?`${Math.round(aircraftAltitude())} M AGL`:`${(simulation.player.odometer / 1000).toFixed(1)} KM`);
  const carLabel=vehicles.find(v=>v.id===selectedCar)?.label||selectedCar.toUpperCase();
  $('car-label').textContent = tank?'DEPOT TANK':atv?'SKYLARK ATV':tram?'CAPITAL LINE':aircraft?.active?(aircraft.active.kind==='helicopter'?'HELICOPTER':'JET'):bus?`BUS · ${bus.routeName.toUpperCase()}`:rideService?.passenger?'YOOBER':gameplay?.state.mode==='foot'?'ON FOOT':gameplay.state.vehicle.rented?`RENTAL · ${carLabel}`:carLabel;
  $('street').textContent = interiors?.active?.name||nearby?.road.name || 'Canberra backstreets';
  const districtPlaces=map.landmarks.filter(place=>place.sourceTags?.place==='suburb'||[
    'telopea','manuka','kingston','foreshore','redhill','griffith','narrabundah','canberra-centre','canberra-airport',
    'capital-defence-depot','black-mountain-tower','giant-spray','australian-war-memorial',
  ].includes(place.id));
  const nearestPlace = districtPlaces.reduce((a, b) => Math.hypot(a.x - p.x, a.z - p.z) < Math.hypot(b.x - p.x, b.z - p.z) ? a : b);
  const namedDistricts={'telopea':'Barton','canberra-centre':'Civic','black-mountain-tower':'Black Mountain','giant-spray':'Macquarie'};
  $('district').textContent=(namedDistricts[nearestPlace.id]||nearestPlace.name.replace(/ shops$/i,'')).toUpperCase();
  const boost=simulation.driving;
  const roadLimit=$('road-limit');
  roadLimit.hidden=!started||!manual||!nearby||nearby.distance>roadProfile(nearby.road).driveWidth/2+2;
  if(!roadLimit.hidden){
    const along=speed>.6?-(Math.sin(nearby.yaw)*car.vx+Math.cos(nearby.yaw)*car.vz):Math.cos(car.yaw-nearby.yaw);
    const limit=roadSpeed(nearby.road,along>=0?1:-1),mapped=limit.source==='mapped';
    roadLimit.classList.toggle('estimated',!mapped);
    roadLimit.textContent=`${limit.kmh}${mapped?'':' est.'}`;
    roadLimit.title=`${mapped?'Mapped speed limit':'Estimated road speed'} ${limit.kmh} km/h`;
  }
  $('nitro-display').hidden=!manual;
  if(manual){
    $('nitro-fuel').value=boost.nitroFuel;
    $('drift-status').textContent=boost.nitroActive?'Nitro active':boost.driftActive?`Drift ${Math.round(Math.abs(boost.slipAngle)*180/Math.PI)}°`:'Nitro';
  }
  const petrol=started&&manual?nearestServicePin(p,65,'petrol'):null;
  const petrolCue=$('petrol-cue');
  petrolCue.hidden=!petrol;
  if(petrol){
    const distance=Math.hypot(p.x-petrol.x,p.z-petrol.z);
    petrolCue.textContent=distance>petrol.radius?`${petrol.name} · ${Math.round(distance)} m to nitro bay`:boost.nitroFuel>=.995?'Nitro bay · tank full':'Nitro bay · stop and press E';
  }
  $('jetpack-status').hidden=!jetpack.active;
  if(jetpack.active){
    const status=jetpack.snapshot();
    const landing=status.reason==='surface-supported'?' · Move off the raised surface to land':jetpack.landing?' · Landing':'';
    $('jetpack-status').textContent=`Jetpack fuel ${Math.round(jetpack.chargeFraction*100)}% · ${Math.round(gameplay.state.actor.jumpHeight)} m${landing}`;
  }
  const crouching=gameplay.state.mode==='foot'&&gameplay.state.actor.crouching&&!gameplay.state.passenger&&!droneActive;
  const stance=$('stance-status');stance.hidden=!crouching;
  if(crouching)stance.textContent=nearbyCrouchCover(gameplay.state.actor)?'Crouched · cover nearby':'Crouched';
  $('driving-hint').textContent = aircraft?.active?aircraft.snapshot().prompt:buses?.passenger?'E request stop / leave bus':rideService?.passenger?'T phone · E exits when stopped':jetpack.active?'SPACE rise · SHIFT descend · U land':gameplay.state.mode==='foot'?'SHIFT sprint · SPACE jump · U jetpack':'SPACE drift · SHIFT nitro · F camera';
  const destinationLine=$('destination-line');
  destinationLine.hidden=!destination||!!destination.campaignObjective;
  if(!destinationLine.hidden)destinationLine.textContent=`${destination.name} · ${(Math.hypot(destination.x - p.x, destination.z - p.z) / 1000).toFixed(1)} km away`;
  if (started && !paused()) for (const place of map.landmarks) {
    if (!discovered.has(place.id) && Math.hypot(place.x - p.x, place.z - p.z) < place.radius) {
      discovered.add(place.id); saveProgress(); updatePlaces();
      notify(discovered.size === map.landmarks.length ? 'Inner south explored. Every place discovered. Keep driving.' : `Discovered: ${place.name}`);
    }
  }
  $('combat-note').hidden=!protectedWork();
  $('combat-note').textContent=campaign.state.active?.stealth?'Stealth contract · stay unnoticed':tutorialRunning?'Tutorial: close combat and weapons disabled.':'Work objective: close combat and weapons disabled.';
  const power=heroPowers.snapshot().heroes[campaign.state.character];
  $('hero-power-status').hidden=gameMode!=='campaign'||!power;
  if(power)$('hero-power-status').textContent=`${power.name}: ${power.active?`${Math.ceil(power.remaining)}s active`:power.cooldown>0?`${Math.ceil(power.cooldown)}s recharge`:'ready · L'}`;
  if(droneActive)$('driving-hint').textContent=`WASD move · SPACE/SHIFT altitude · N night vision · O recall${gear.droneStrike?' · R strike below':''}`;
  if(lightRail?.passenger)$('driving-hint').textContent='Capital Line · E requests an exit at the next platform';
  if(tank)$('driving-hint').textContent='WASD drive tank · Space brake · E exits when stopped';
  const stealthGoal=!droneActive&&!jetpack.active&&nearbyStealthObjective(p);
  if(stealthGoal)$('driving-hint').textContent=stealthGoal.crouch?'Hold X / DUCK, then E / USE':'E / USE · Contract objective';
  if(watercraft?.isActive)$('driving-hint').textContent='SPACE brake · E exit when stopped';
  else if(gameplay.state.actor.swimming)$('driving-hint').textContent='WASD swim · SHIFT swim faster';
  if(vehicleDamage.snapshot().burning)$('driving-hint').textContent='ENGINE FIRE · Stop and get out with E / USE';
  const footCombat=gameplay.state.mode==='foot'&&!gameplay.state.passenger&&!gameplay.state.actor.swimming&&!protectedWork();
  for(const button of document.querySelectorAll('#touch-actions [data-action]:not([data-action=crouch])'))button.disabled=!footCombat;
  $('touch-grenade').disabled=$('touch-smoke').disabled=!footCombat||jetpack.active;
  $('touch-crouch').disabled=gameplay.state.mode!=='foot'||!!gameplay.state.passenger||!!jetpack.active||droneActive;
  updateNavigation();drawMap($('minimap'), false);
  if($('map-dialog').open&&(followYoober||followCourier))drawMap($('full-map'),true);
}
function placeCar(mesh, car, dt) {
  const y = world.vehicleHeightAt(car,car.edge?.road), fx = -Math.sin(car.yaw), fz = -Math.cos(car.yaw);
  const pitch = Math.atan2(world.vehicleHeightAt({...car,x:car.x+fx*2,z:car.z+fz*2},car.edge?.road) - world.vehicleHeightAt({...car,x:car.x-fx*2,z:car.z-fz*2},car.edge?.road), 4);
  mesh.position.set(car.x, y + .18, car.z); mesh.rotation.set(pitch, car.yaw, 0, 'YXZ');
  for (const wheel of mesh.userData.wheels) wheel.rotation.x -= car.speed * dt / .34;
}
function updateAbandonedMeshes(p, dt) {
  const active = new Set();
  for (const car of [...simulation.abandonedCars,...(gameplay.policeWrecks||[])].slice(0,18)) {
    if (car.active===false||active.has(car.id)) continue;
    active.add(car.id);
    let mesh = abandonedMeshes.get(car.id);
    if (!mesh) { mesh = createCar(Object.hasOwn(BY_ID,car.modelId)?car.modelId:'lantern', { color: car.health===0?0x64707b:car.color }); addCarShadow(mesh); scene.add(mesh); abandonedMeshes.set(car.id, mesh); }
    mesh.visible = Math.hypot(car.x - p.x, car.z - p.z) < 300;
    if (mesh.visible) placeCar(mesh, { ...car, speed: 0 }, dt);
  }
  for (const [id, mesh] of abandonedMeshes) if (!active.has(id)) { scene.remove(mesh); abandonedMeshes.delete(id); }
}
function updateCareer(dt=0) {
  for(const event of rideService?.drainEvents()||[])if(event.reason||event.message)notify(event.reason||event.message);
  for(const event of campaign.drainEvents()){
    if(event.type==='started')reportCampaignIncident(event);
    if(event.type==='complete'){
      acceptMissionCheckpoint();
      clearInput();
      progression.state.cash=Math.min(1000000000,progression.state.cash+event.reward);saveCareer();syncPlayerAppearance();
      notify(`${event.message} +$${event.reward}. J opens Campaign.`);
    }else if(event.type==='failed'&&missionCheckpoint){
      const previous=Math.max(0,event.stage-1);
      missionCheckpoint.retryStep=missionCheckpoint.steps.findLast(step=>step.attempt.id===event.id&&step.attempt.stage<=previous)||null;
      missionCheckpoint.failure=event.message;
      // A genuine failure holds the restore behind the shared MISSION FAILED
      // overlay; cancels keep the plain notify and death or arrest recovery
      // already owns the screen with WASTED or BUSTED.
      if(gameplay.state.recovery||event.message==='Mission cancelled.')missionCheckpoint.retryIn=0;
      else{missionCheckpoint.retryIn=MISSION_FAILURE_HOLD;beginMissionFailureTitle(event.message);}
    }else if(event.message)notify(event.message);
  }
  restoreFailedMission(dt);
  for (const event of progression.drainEvents()) {
    if(event.type==='work-complete')workCompletion={serial:workCompletion.serial+1,storeId:event.serviceId};
    if(event.type==='robbery-complete')heistOutcome={serial:heistOutcome.serial+1,storeId:event.serviceId,kind:'robbery'};
    if(['job-complete','work-complete'].includes(event.type))clearInput();
    if(event.type==='job-started'&&progression.state.activeJob?.type==='ride'){
      const job=progression.state.activeJob,road=simulation.nearestRoad(job.target.x,job.target.z);
      if(road)for(const side of [-1,1]){
        const offset=roadProfile(road.road).driveWidth/2+1.2;
        const pose={x:road.x+Math.cos(road.yaw)*offset*side,z:road.z-Math.sin(road.yaw)*offset*side,yaw:road.yaw};
        if(simulation.canOccupy(pose,{length:1,width:.8})&&simulation.hasLineOfSight(road,pose)){job.waitingPose=pose;break;}
      }
    }
    if (['job-stage','job-complete','job-failed','penalty','robbery-complete','mugging-complete','workout-complete','work-started','work-complete','activity-ended'].includes(event.type)) notify(event.message);
    recordCameraWorkEvent(event);
    if (['job-complete','penalty','robbery-complete','mugging-complete','workout-complete'].includes(event.type)) saveCareer();
  }
  finishDeveloperPreview();
  if (isSandbox()&&!heists?.active&&!lastJobTarget) return;
  const target = heists?.active?heists.snapshot().target:gameMode==='campaign'?(campaign.state.active?campaignNavigationTarget():null):progression.state.activeJob?.target;
  const key = target ? `${target.x},${target.z}:${target.label||target.name||''}` : '';
  if (key !== lastJobTarget) {
    if (target&&!interiors.active) routeTo(target);
    else if (lastJobTarget) { destination = null; route = []; }
    lastJobTarget = key;
  }
}
function syncExternalVehicles(){
  const atv=skylineAtv?.vehicle;
  simulation.setExternalVehicles([...(atv?[atv]:[]),...aircraftObstacles(),...(depotTank?.vehicle?[depotTank.vehicle]:[]),...(lightRail?.vehicles||[]),...(buses?.vehicles||[]),...(rideService?.vehicles||[]),...(delivery?.vehicles||[]),...gameplay.state.police.filter(p=>p.health>0&&p.car).map(p=>p.car),...(gameplay.policeWrecks||[])]);
}
function syncExternalPeople(){
  externalPeopleContacts.length=0;
  let count=0;
  const add=(person,radius)=>{
    const body=auxiliaryContacts[count]||(auxiliaryContacts[count]={});count++;
    body.id=person.id;body.x=person.x;body.z=person.z;body.radius=radius;body.active=person.active!==false;
    externalPeopleContacts.push(body);
  };
  for(const person of pedestrians.writeContacts(pedestrianContacts))externalPeopleContacts.push(person);
  for(const person of streetDealers.snapshot())add(person,.34);
  for(const person of rideService?.people||[])if(person.active)add(person,.38);
  for(const person of campaignScenes?.people||[])if(!person.seated&&!person.bedRider&&!person.interiorId)add(person,.32);
  if(contractTarget?.body?.health>0)add(contractTarget.body,.34);
  if(contractTarget?.guardBody?.health>0)add(contractTarget.guardBody,.34);
  if(skylineLease){
    for(const opponent of skylineOpponents.bodies)if(opponent.health>0)add(opponent,.34);
    for(const ally of skylineBackup.bodies)add(ally,.36);
  }
  for(const officer of gameplay.state.police)if(officer.health>0&&officer.mode==='foot'&&!officer.interiorId)add(officer,.35);
  const job=progression.state.activeJob;
  if(job?.type==='ride'&&job.stage===0&&!job.passenger){
    const pose=job.waitingPose||job.target;
    if(pose)add({id:'waiting-fare',x:pose.x,z:pose.z},.32);
  }
  if(!interiors.active&&!jetpack?.active&&gameplay.state.mode==='foot'&&!gameplay.state.passenger&&!gameplay.state.recovery&&!gameplay.state.actor.swimming){
    playerContact.x=gameplay.state.actor.x;playerContact.z=gameplay.state.actor.z;
    externalPeopleContacts.push(playerContact);
  }
  simulation.setExternalPeople(externalPeopleContacts);
}
function pendingWorldChunks(){return interiors.active?0:(world.pendingChunks||0)+(neighbourhood.stats.queue||0)+(airportView?.stats.pendingChunks||0);}
function ordinaryFootPose(){
  const state=gameplay.state;
  if(state.mode!=='foot'||state.passenger||micromobility.active||state.recovery||jetpack?.active||skylineAirPose||
    state.actor.swimming||state.aiming||state.attackTimer>0||state.combatFeedback.recoil>.001||state.actor.impactTime>0)return null;
  return state.actor;
}
function animate(time) {
  if (disposed) return;
  raf = requestAnimationFrame(animate);
  const dt = Math.min(.075, (time - (lastTime || time)) / 1000); lastTime = time;
  renderCutscene(dt);
  updateTouchCamera(dt);
  updateKeyboardLook(dt);
  const tracking=liveTracking();
  if (!paused()||tracking) {
    accumulator += dt;
    while (accumulator >= 1 / 60) {
      footMotion.capture(ordinaryFootPose(),interiors.active);
      stepDrone(1/60);
      stepSecurityCameras(1/60);updateBurglary(1/60);
      combatCueTime=Math.max(0,combatCueTime-1/60);
      combatStatusTime=Math.max(0,combatStatusTime-1/60);
      updateRecon(1/60);
      heroPowers.step(1/60,powerContext());atmosphere.step(1/60);
      vehicleDamage.step(1/60,{car:simulation.player,carKey:playerCarKey,health:gameplay.state.vehicleHealth});
      if(vehicleDamage.snapshot().burning){if(fireWarningKey!==playerCarKey){notify('Engine fire. Stop and use E / USE to get out.');fireWarningKey=playerCarKey;}}else fireWarningKey=null;
      for(const event of vehicleDamage.drainEvents())if(event.type==='burnDamage'&&event.carKey===playerCarKey)gameplay.state.vehicleHealth=Math.max(0,gameplay.state.vehicleHealth-event.damage);
      vehicleFires.step(1/60);
      for(const event of vehicleFires.drainExplosions()){
        ordnance.showExplosion(event);applyWorldExplosion(event);
      }
      ordnance.step(1/60);
      for(const event of ordnance.drainEvents())if(event.type==='explosion')applyWorldExplosion(event);
      const walking = gameplay.state.mode === 'foot';
      if(interiors.active&&activeCrewEntry&&campaignScenes.roomStats?.id!==interiors.active.id)campaignScenes?.enterInterior(interiors.active,activeCrewEntry,interiors.exteriorPose);
      campaignScenes?.update({hiredMembers:(progression.state.hiredCrew||[]).filter(id=>['merc-river','merc-stone'].includes(id)).map(id=>({id,armed:true})),rehireSerial:Object.fromEntries(['merc-river','merc-stone'].map(id=>[id,progression.crewRenewalSerial?.(id)??0])),hiredHealth:Object.fromEntries(progression.state.hiredCrew.map(id=>[id,progression.getCrewHealth(id)])),attacksAllowed:canCrewAttack(),mission:campaign.state.active,character:currentHero()?.id||campaign.state.character,mode:gameMode,pose:{...focus(),interiorId:interiors.active?.id||null},health:gameplay.state.health,playerMode:gameplay.state.passenger?'passenger':gameplay.state.mode,hostiles:gameplay.state.police,paused:false,recovering:!!gameplay.state.recovery,interior:!!interiors.active,car:simulation.player,carKey:playerCarKey,hasLOS:visible},1/60);
      for(const event of campaignScenes.drainEvents())if(event.type==='ally-shot')gameplay.strikePolice(event);
      updateContractTarget(1/60);
      syncExternalVehicles();
      syncExternalPeople();
      simulation.step(1 / 60, tracking||walking||gameplay.state.recovery||gameplay.state.vehicleHealth<=0 ? { brake: true } : input(), focus());
      campaignScenes.syncCarPose(simulation.player,playerCarKey);
      updateAircraft(1/60);
      if(watercraft?.isActive&&!tracking&&!gameplay.state.recovery){
        const drive=input();
        watercraft.step(1/60,{...drive,brake:drive.handbrake},{valid:true});
      }
      const walk=walkingInput();
      const flying=jetpack.active;
      updateSkyline(1/60,walk);
      gameplay.step(1/60,skylineAirPose?{externalFlight:true}:flying?{externalFlight:true,aim:walk.aim,aimYaw:walk.aimYaw,aimPitch:walk.aimPitch,
        fire:walk.fire&&!!weaponById(gameplay.state.weapon)}:{...walk,challenge:miniInput()});
      if(contractTarget.body)reportContractOutcome();
      if(flying)refreshJetpackBodies(gameplay.state.actor);
      if(flying||jetpack.chargeFraction<1)jetpack.step(1/60,{moveX:walk.moveX,moveZ:walk.moveZ,aiming:walk.aim||walk.fire,
        lift:Number(!!walk.jump)-Number(!!walk.sprint)},gameplay.state,jetpackContext());
      let hiredCasualty=false;
      for(const event of gameplay.drainPoliceEvents()){
        if(campaignScenes.receiveHit(event)&&campaignScenes.people.some(person=>person.hired&&person.id===event.targetId&&person.health<=0))hiredCasualty=true;
      }
      if(hiredCasualty)saveCareer();
      policeRooms.prune(gameplay.state.police);
      lightRail?.step(1/60);
      if(depotTank?.isActive){
        const drive=input();
        depotTank.step(1/60,{...drive,brake:drive.handbrake},{valid:!gameplay.state.recovery,paused:paused()});
      }
      syncExternalVehicles();syncExternalPeople();buses?.step(1/60,busContext());
      if(rideService?.vehicles[0].active)rideService.step(1/60,rideContext());
      if(delivery?.vehicles[0].active){delivery.step(1/60,deliveryContext());handleDeliveryEvents();}
      equipment?.step(1/60);
      if (!isSandbox()&&!aircraft?.active) progression.update(1 / 60, careerContext());
      const miniState=activities.snapshot();
      activities.step(1/60,miniInput(),{...careerContext(),visible:!miniState.station||visible(focus(),miniState.station)});
      streetDealers.update(1/60,{focus:focus(),wanted:gameplay.state.wanted,shots:gameplay.state.shots});
      roomPeople.setCrime(heists?.roomCrime||progression.state.activity);pedestrians.setCrime(progression.state.activity);
      roomPeople.update(1/60,{actor:{...gameplay.state.actor,health:gameplay.state.health},activity:activities.snapshot(),hasLineOfSight:visible});
      if(micromobility.active){
        const drive=input();
        micromobility.step(1/60,{throttle:Math.max(0,drive.throttle),brake:Math.max(0,-drive.throttle),steer:drive.steer},{pose:gameplay.state.actor,onFoot:gameplay.state.mode==='foot',recovering:!!gameplay.state.recovery,moveActor:moveBody});
      }
      updateRentalHack(1/60);
      if(heists){
        const result=heists.step(1/60,heists.active?heistContext():{paused:paused()},heists.active?miniInput():undefined);
        if(result){
          const heist=heists.snapshot();
          interiorView.setHeistTarget?.(heist.indoorTarget);
          if(!heist.challenge || heist.feedback!==result.message){clearInput();notify(result.message);}
        }
      }
      if(inquiryOfficer)resolveInquiry(campaignAftermath.step({pose:focus(),indoors:!!interiors.active,recovering:!!gameplay.state.recovery}));
      if(!aircraft?.active||campaign.state.active?.aviation===true||campaign.state.active?.target?.kind==='escape')advanceCampaign(1/60);
      if(previousActorMode!==gameplay.state.mode){
        previousActorMode=gameplay.state.mode;footCameraYaw=gameplay.state.actor.yaw;footLookPitch=0;cameraReady=false;cockpitCamera=false;clearInput();
        if(gameplay.state.mode==='vehicle'&&destination?.id==='personal-car'){
          const target=gameMode==='campaign'&&campaign.state.active?campaignNavigationTarget():progression.state.activeJob?.target;
          if(target)routeTo(target);else{destination=null;route=[];}
        }
      }
      accumulator -= 1 / 60;
    }
    routeClock += dt;
    if (destination&&routeClock>6&&!interiors.active&&!airNavigationActive()) { routeClock=0;route=findRoute(simulation.graph,focus(),destination); }
  } else {accumulator = 0;updateRecon(0);}
  if(tutorialRunning||tutorialVisible){if(tutorialRunning)tutorial.observe(tutorialContext(),dt);syncTutorial();}
  updateMini();updateCareer(dt);updateMissionFailureTitle(dt);
  if (audio) {
    const active=audio.enabled&&!paused()&&gameplay.state.mode==='vehicle'&&!gameplay.state.passenger&&gameplay.state.vehicleHealth>0;
    const car=simulation.player,driving=simulation.driving;
    const sound=audio.input;
    sound.active=active;sound.speed=Math.hypot(car.vx,car.vz);sound.throttle=active?input().throttle:0;
    sound.slip=driving.driftActive?Math.min(1,Math.abs(driving.slipAngle)/.55):0;
    sound.boost=driving.nitroActive;
    audio.engine.update(sound,dt);
  }
  if (graphicsTest.active) {
    if (dialogs.some(dialog => dialog.open)) finishGraphicsTest();
    else {
      const previous = graphicsTest.current;
      const result = graphicsTest.advance(performance.now());
      if (result) finishGraphicsTest(result);
      else if (graphicsTest.current !== previous) showGraphicsPhase();
    }
  }
  if (!framePacer.ready(time,renderProfile(quality).fps)) return;
  if(!renderGate.shouldRender({paused:paused()&&!graphicsTest.active,hidden:document.hidden,cinematic:cutscenes.snapshot().active,tracking,revision:viewRevision,pendingChunks:pendingWorldChunks()}))return;
  const renderDt = Math.min(.1, (time - (lastRender || time)) / 1000); lastRender = time;
  const p = focus(), activeDt = paused()&&!tracking ? 0 : renderDt;
  const drawnActor=skylineAirPose?{...gameplay.state.actor,feetY:skylineAirPose.y,skydive:skylineAirPose.skydive}:jetpack.active?{...gameplay.state.actor,feetY:jetpack.feetY}:
    footMotion.sample(ordinaryFootPose(),interiors.active,accumulator*60,!cameraReady)||gameplay.state.actor;
  const cameraPose=p===gameplay.state.actor?drawnActor:p;
  const cockpit=cockpitCamera&&cockpitAvailable();
  if(!cockpit)cockpitCamera=false;
  const droneState=drone.snapshot();
  atmosphereView?.update(atmosphere.snapshot(),p,{interior:!!interiors.active,quality,nightVision:droneActive&&droneState.nightVision});
  droneView?.update(droneState,{firstPerson:droneActive});
  const roomId=interiors.active?.id||null;
  (roomId?indoorSecurityCamerasView:securityCamerasView)?.update(securityCameras.snapshot(),p,roomId);
  const effectFocus=droneActive?droneState:p;
  ordnanceView?.update(ordnance.snapshot(),effectFocus,{interiorId:null});
  indoorOrdnanceView?.update(ordnance.snapshot(),p,{interiorId:interiors.active?.id||null});
  vehicleDamageView?.update(vehicleDamage.snapshot(),playerMesh,{interiorId:roomId,npcFires:roomId?[]:vehicleFires.snapshot(effectFocus)});
  headlightsView?.update(simulation.player,{enabled:!aircraft?.active&&gameplay.state.mode==='vehicle'&&headlightsEnabled(atmosphere.snapshot().hour),interiorId:interiors.active?.id||null});
  policeSupportView?.update(gameplay.policeSupport(),activeDt,{interior:!!interiors.active});
  jetpackView?.update(drawnActor,jetpack);
  if(!interiors.active){
  airportView?.update(p);defenceDepotView?.update(p);policeStationView?.update(p);
  const activeMission=campaign.state.active;
  stealthContractView?.update(activeMission?.stealth?(activeMission.target.roomId?null:[activeMission.target]):activeMission?.target.kind==='assassination'?assassinationMarkers:railHeistMarker?[railHeistMarker]:null,p);
  watercraftView?.update(watercraftViewState,p);
  pedestrianFocus.x=p.x;pedestrianFocus.z=p.z;pedestrianFocus.yaw=p.yaw;pedestrianFocus.speed=gameplay.state.mode==='vehicle'?p.speed:0;
  pedestrians?.update(pedestrianFocus, activeDt, simulation.traffic,simulation.hasLineOfSight);
  placeCar(playerMesh, simulation.player, activeDt);
  const car=simulation.player;
  nitroView?.update(playerMesh,BY_ID[car.modelId],started&&gameplay.state.mode==='vehicle'&&!gameplay.state.passenger&&simulation.driving.nitroActive,activeDt);
  trafficView?.update(p,{lowGraphics:quality!=='standard'});
  updateAbandonedMeshes(p, activeDt);
  busView?.update(buses.vehicles,p);servicesView?.update(p);signalsView?.update(simulation.trafficLights.heads,p);
  lightRailView?.update(lightRail.vehicles,p);
  depotTankView?.update(depotTank.vehicle,p);
  heistSitesView?.update(p);
  northPlacesView?.update(p);
  regionalLandmarksView?.update(p);
  anuCampusView?.update(p);
  macquarieShopsView?.update(p);
  skylineSiteView?.update(skylineJob.snapshot(),p);
  skylineAtvView?.update(skylineAtv.snapshot(),p);
  skylinePressureView?.update(skylinePressure.snapshot(),p);
  warMemorialView?.update(p);
  birdsView?.update(p,activeDt,{lowGraphics:quality==='low'||quality==='performance',paused:activeDt===0,reducedMotion:reducedCombatMotion.matches});
  assassinationSiteView?.update(p);
  equipmentView?.update(equipment.snapshot(),p);
  wildlifeView?.update(p,activeDt);noodleShopView?.update(p,activeDt);
  occupantInputs.length=0;
  occupantIds.clear();
  const seated=(car,occupied,modelId=car.modelId,personId=car.personId??car.id)=>{
    occupantIds.add(car.id);
    let pose=occupantPoses.get(car.id);if(!pose){pose={id:car.id};occupantPoses.set(car.id,pose);}
    pose.x=car.x;pose.z=car.z;pose.yaw=car.yaw;pose.modelId=modelId;pose.personId=personId;pose.active=car.active;pose.occupied=occupied;occupantInputs.push(pose);
    if(car.stuntActive){pose.stuntActive=true;pose.stuntY=car.stuntY;pose.stuntVy=car.stuntVy;pose.stuntPitch=car.stuntPitch;pose.stuntX=car.stuntX;pose.stuntZ=car.stuntZ;}
    else if(pose.stuntActive){delete pose.stuntActive;delete pose.stuntY;delete pose.stuntVy;delete pose.stuntPitch;delete pose.stuntX;delete pose.stuntZ;}
  };
  seated(simulation.player,gameplay.state.mode==='vehicle'&&!cockpit,simulation.player.modelId,playerAppearanceId);
  for(const car of simulation.traffic)seated(car,true);
  for(const officer of gameplay.state.police)if(officer.health>0&&officer.car)seated(officer.car,officer.mode==='vehicle','relay','police');
  for(const car of rideService?.vehicles||[])if(car.active)seated(car,car.occupied!==false,car.modelId,'yoober-driver-npc');
  for(const id of occupantPoses.keys())if(!occupantIds.has(id))occupantPoses.delete(id);
  occupantsView?.update(activeDt,{focus:p,cars:occupantInputs});
  frameCount++;
  if (world.pendingChunks || frameCount % 4 === 0) world.update(p, {maxLoads:1});
  if (frameCount % 8 === 0) {
    neighbourhood?.update(p); landmarkView?.update(p, time / 1000);storefrontsView?.update(p);shoppingView?.update(p);campusView?.update(p);civicView?.update(p);civicExtrasView?.update(p);
    streetAssetsView?.update(p);highwayBarriersView?.update(p);localDetailsView?.update(p);
    rentalStorefrontsView?.update(p);
    parkedView?.cull(p);
  }
  }
  const onFoot = gameplay.state.mode === 'foot'&&!gameplay.state.passenger;
  document.body.classList.toggle('on-foot', onFoot);
  document.body.classList.toggle('passenger',gameplay.state.passenger);
  document.body.classList.toggle('piloting',!!aircraft?.active);
  document.body.classList.toggle('boating',!!watercraft?.isActive);
  document.body.classList.toggle('tanking',!!depotTank?.isActive);
  document.body.classList.toggle('swimming',!!gameplay.state.actor.swimming);
  document.body.classList.toggle('indoors',!!interiors.active);
  const objective = skylineObjective()||(isSandbox()?destination:campaign.state.active?campaignNavigationTarget():progression.state.activeJob?.target||progression.garage);
  roadGuidanceView?.update(route,p,{enabled:started&&gameplay.state.mode==='vehicle'&&!gameplay.state.passenger&&!interiors.active&&!!destination,guidance:guidanceRoute===route?guideState:null});
  const exteriorState={...gameplay.state,actor:drawnActor,armour:currentGear().armour??0,police:[...(inquiryOfficer?[inquiryOfficer]:[]),...gameplay.state.police].map(unit=>unit.interiorId||unit.car?.health===0?{...unit,mode:unit.interiorId?'inside':unit.mode,car:unit.car?.health===0?{...unit.car,active:false}:unit.car}:unit),shots:gameplay.state.shots.filter(shot=>!shot.interiorId)};
  const scoped=onFoot&&gameplay.state.aiming&&gameplay.state.weapon==='sniper'&&!gameplay.state.recovery&&!droneActive&&!paused()&&!reconCameraVisible(reconnaissance.snapshot());
  if(!interiors.active)actorView?.update(micromobility?.active||gameplay.state.passenger||scoped?{...exteriorState,mode:'vehicle'}:exteriorState, { dt: activeDt, time: time / 1000, focus: p, objective });
  deliveryView?.update(deliveryViewState,{focus:p,dt:activeDt});
  rideView?.update({car:rideService.vehicles[0],passenger:rideService.passenger,driver:rideService.people[0]},{focus:p,playerCar:{...simulation.player,modelId:gameplay.state.vehicle.modelId},job:progression.state.activeJob,dt:activeDt});
  const targetPerson=contractTarget.body;
  const cast=targetPerson?[targetPerson,contractTarget.guardBody,...campaignScenes.people]:
    skylineLease?[...skylineBackup.bodies,...skylineOpponents.bodies,...campaignScenes.people]:campaignScenes.people;
  campaignScenesView?.update(cast,p,{interiorId:null,dt:activeDt});
  if(interiors.active){
    if(!indoorCampaignScenesView&&!compatibility&&campaignScenes.people.some(person=>person.interiorId===interiors.active.id))indoorCampaignScenesView=createCampaignScenesView(interiorScene,()=>interiors.active?.floorY||0);
    indoorCampaignScenesView?.update(campaignScenes.people,p,{interiorId:interiors.active.id,dt:activeDt});
  }
  aircraftView?.update(aircraft.snapshot(),p,activeDt);
  roomPeopleView?.update(roomPeople.snapshot(),activeDt,{activity:activities.snapshot()});
  microView?.update(micromobility.snapshot(),p,activeDt);
  dealerView?.update(streetDealers.snapshot(),interiors.active?{x:Infinity,z:Infinity}:p,activeDt);
  let cockpitFrame;
  if(cockpit){
    const car=simulation.player;
    cockpitFrame=carCockpitFrame(car,{eye:playerMesh.userData.cockpit.eye,ground:world.vehicleHeightAt(car,car.edge?.road),pitch:playerMesh.rotation.x,lookYaw:orbit,lookPitch});
    desiredCamera.set(cockpitFrame.camera.x,cockpitFrame.camera.y,cockpitFrame.camera.z);
    lookTarget.set(cockpitFrame.target.x,cockpitFrame.target.y,cockpitFrame.target.z);
  } else if(droneActive){desiredCamera.set(droneState.x,droneState.y,droneState.z);lookTarget.set(droneState.x-Math.sin(footCameraYaw)*10,droneState.y+Math.tan(footLookPitch)*10,droneState.z-Math.cos(footCameraYaw)*10);}
  else if(interiors.active){
    const angle=footCameraYaw,ground=interiors.active.floorY;
    const frame=footCameraFrame(cameraPose,{yaw:angle,pitch:footLookPitch,ground,aiming:gameplay.state.aiming||reconCameraVisible(reconnaissance.snapshot()),indoors:true,scoped});
    desiredCamera.set(frame.camera.x,frame.camera.y,frame.camera.z);
    const ahead={x:desiredCamera.x,z:desiredCamera.z};
    const cameraClear=interiors.hasLineOfSight(p,ahead);
    if(!cameraClear)desiredCamera.set(p.x,ground+(cameraPose.crouching?1.25:1.7),p.z);
    lookTarget.set(frame.target.x,frame.target.y,frame.target.z);
    const workout=activities.snapshot().active&&isWorkoutKind(activities.snapshot().kind),exercise=roomPeopleView?.exerciseFocus;
    if(workout&&exercise){
      lookTarget.set(exercise.x,exercise.y,exercise.z);
      for(const [dx,dz] of [[2.7,1.7],[-2.7,1.7],[0,-3],[0,3]]){
        const view={x:exercise.x+dx,z:exercise.z+dz};
        if(interiors.hasLineOfSight(p,view)){desiredCamera.set(view.x,ground+2.25,view.z);break;}
      }
    }
    indoorActorView?.update({...gameplay.state,actor:drawnActor,armour:exteriorState.armour,mode:cameraClear&&!workout&&!scoped?'foot':'vehicle',police:gameplay.state.police.filter(unit=>unit.interiorId===interiors.active.id),shots:gameplay.state.shots.filter(shot=>shot.interiorId===interiors.active.id)},{dt:activeDt,time:time/1000,focus:p,objective:null});
  } else if(skylineAirPose){
    const angle=footCameraYaw,distance=12;
    desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+18,p.z+Math.cos(angle)*distance);
    lookTarget.set(p.x,p.y+2,p.z);
  } else if(aircraft?.active){
    const angle=p.yaw+orbit,distance=19+Math.min(7,aircraft.active.speed*.1);
    desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+7+orbitHeight,p.z+Math.cos(angle)*distance);
    lookTarget.set(p.x-Math.sin(p.yaw)*10,p.y+Math.tan(lookPitch)*(distance+10),p.z-Math.cos(p.yaw)*10);
  } else if(skylineAtv?.seatPose){
    const angle=p.yaw+orbit,distance=6.5;
    desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+2.9+orbitHeight,p.z+Math.cos(angle)*distance);
    lookTarget.set(p.x-Math.sin(p.yaw)*3,p.y+Math.tan(lookPitch)*9,p.z-Math.cos(p.yaw)*3);
  } else if(lightRail?.passenger){
    const angle=p.yaw+orbit,distance=22;
    desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+8+orbitHeight,p.z+Math.cos(angle)*distance);
    lookTarget.set(p.x-Math.sin(p.yaw)*4,p.y+Math.tan(lookPitch)*12,p.z-Math.cos(p.yaw)*4);
  } else if(watercraft?.isActive||depotTank?.isActive){
    const angle=p.yaw+orbit,distance=10+Math.min(5,Math.abs(p.speed)*.24);
    desiredCamera.set(p.x+Math.sin(angle)*distance,p.y+4+orbitHeight,p.z+Math.cos(angle)*distance);
    lookTarget.set(p.x-Math.sin(p.yaw)*4,p.y+Math.tan(lookPitch)*(distance+4),p.z-Math.cos(p.yaw)*4);
  } else if (onFoot) {
    const aiming=gameplay.state.aiming||reconCameraVisible(reconnaissance.snapshot());
    const ground=gameplay.state.actor.swimming?gameplay.state.actor.swimSurfaceY-.85:world.heightAt(cameraPose.x,cameraPose.z);
    const frame=footCameraFrame(cameraPose,{yaw:footCameraYaw,pitch:footLookPitch,ground,aiming,scoped});
    desiredCamera.set(frame.camera.x,frame.camera.y,frame.camera.z);
    lookTarget.set(frame.target.x,frame.target.y,frame.target.z);
  } else {
    orbitHold = Math.max(0, orbitHold - renderDt);
    if (!dragging && orbitHold === 0 && Math.abs(p.speed) > 1) { orbit *= Math.exp(-renderDt * 1.6); lookPitch *= Math.exp(-renderDt * 1.6); }
    const angle = p.yaw + orbit, distance = !started ? 21 : 10.8 + Math.min(4, Math.abs(p.speed) * .065);
    desiredCamera.set(p.x + Math.sin(angle) * distance, world.vehicleHeightAt(p,p.edge?.road) + (!started ? 10 : 5.4) + orbitHeight, p.z + Math.cos(angle) * distance);
    lookTarget.set(p.x - Math.sin(p.yaw) * 5, world.vehicleHeightAt(p,p.edge?.road) + 1.4, p.z - Math.cos(p.yaw) * 5);
    lookTarget.y += Math.tan(lookPitch) * (distance + 5);
  }
  const cinematic=cutscenes.snapshot();
  if(cinematic.active&&cutsceneAnchor){
    const a=cutsceneAnchor,yaw=(a.yaw||0)+.55+cinematic.cameraShotIndex*.7+cinematic.cameraProgress*.22;
    const distance=gameplay.state.mode==='foot'?4.5:8,ground=interiors.active?.floorY??world.heightAt(a.x,a.z);
    let view={x:a.x+Math.sin(yaw)*distance,z:a.z+Math.cos(yaw)*distance};
    if(!visible(a,view))view={x:a.x+Math.sin(yaw)*.8,z:a.z+Math.cos(yaw)*.8};
    desiredCamera.set(view.x,ground+2.25,view.z);lookTarget.set(a.x,ground+1.25,a.z);
  }
  if(!cockpit&&!interiors.active&&!droneActive){const floor=gameplay.state.mode==='vehicle'&&!aircraft?.active?world.vehicleHeightAt({...p,x:desiredCamera.x,z:desiredCamera.z},p.edge?.road):
    jetpack.active?world.groundHeightAt(desiredCamera.x,desiredCamera.z):world.heightAt(desiredCamera.x,desiredCamera.z);desiredCamera.y=Math.max(desiredCamera.y,floor+.65);}
  if(jetpack.active&&!scoped){
    const {x,z,feetY}=drawnActor,y=feetY+1.45,dx=desiredCamera.x-x,dy=desiredCamera.y-y,dz=desiredCamera.z-z;
    const range=Math.hypot(dx,dy,dz);
    if(range>.1){
      const clear=shotObstacles.trace({x,y,z,dx:dx/range,dy:dy/range,dz:dz/range,range});
      if(clear<range){const t=Math.max(0,clear-.18)/range;desiredCamera.set(x+dx*t,y+dy*t,z+dz*t);cameraReady=false;}
    }
  }
  stableCameraPosition.lerp(desiredCamera,cameraReady&&!cockpit?cameraBlend(renderDt,gameplay.state.aiming):1);
  camera.position.copy(stableCameraPosition);
  const shake=explosionShake.advance(renderDt,paused()||cinematic.active||reducedCombatMotion.matches);
  if(shake){camera.position.x+=shake.x;camera.position.y+=shake.y;camera.position.z+=shake.z;}
  const roadShake=drivingCameraShake.advance(renderDt,simulation.player,{cockpit,suppressed:!started||paused()||cinematic.active||reducedCombatMotion.matches||compatibility||interiors.active||onFoot||droneActive||aircraft?.active||lightRail?.passenger||watercraft?.isActive||depotTank?.isActive||gameplay.state.passenger||simulation.player.stuntActive||gameplay.state.aiming});
  const targetFov=cockpitFrame?.fov??(scoped?28:gameplay.state.aiming?50:58),near=cockpitFrame?.near??.3;
  if(camera.near!==near||Math.abs(camera.fov-targetFov)>.05){
    const cameraChanged=camera.near!==near;
    camera.near=near;camera.fov+= (targetFov-camera.fov)*(cameraChanged?1:cameraBlend(renderDt,true));camera.updateProjectionMatrix();
  }
  camera.lookAt(lookTarget);if(shake)camera.rotateZ(shake.roll);
  if(roadShake){camera.translateX(roadShake.x);camera.translateY(roadShake.y);}
  camera.updateMatrixWorld();renderCombatUI(); cameraReady = true;
  renderer.render(interiors.active&&!compatibility?interiorScene:scene, camera);renderedFrames++;
  if (graphicsTest.active) graphicsTest.record(performance.now());
  if(fpsBadge){
    const measuring=started&&!paused();
    if(fpsBadge.hidden===measuring)fpsBadge.hidden=!measuring;
    if(!measuring){
      if(fpsStart)fpsBadge.textContent='— FPS';
      fpsStart=fpsFrames=0;
    }
    else if(!fpsStart)fpsStart=time;
    else{
      fpsFrames++;
      if(time-fpsStart>=1000){fpsBadge.textContent=`${Math.round(fpsFrames*1000/(time-fpsStart))} FPS`;fpsStart=time;fpsFrames=0;}
    }
  }
  hudTime += renderDt;
  if (hudTime > .18) { renderBurglaryHUD();updateHud(); const missionLine=renderMissionGuide();if(!missionFailureTitle)streetUI.refresh(missionLine); hudTime = 0; }
}
async function boot() {
  const responses = await loadGameData(GAME_DATA_FILES);
  if (responses.some(response=>!response.ok)) throw new Error('Local map or address data could not be loaded.');
  const sourcePacks = await decodeCapitalMapResponses(responses);
  const sourceWorld = composeCapitalMap(sourcePacks);
  ({ map, terrainSampler, stunts } = sourceWorld);
  const addressData = sourceWorld.addressData;
  const tower = map.landmarks.find(place => place.id === 'black-mountain-tower');
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xa9c9d5); scene.fog = new THREE.Fog(0xa9c9d5, 230, 750);
  camera = new THREE.PerspectiveCamera(58, 1, .3, 4500);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { antialias: false, powerPreference: 'low-power' }) || canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
  compatibility = !context;
  const foliageImage=compatibility?null:new THREE.TextureLoader()
    .loadAsync(new URL('./assets/canopy-clusters.png',import.meta.url).href).catch(()=>null);
  if (context) {
    renderer = new THREE.WebGLRenderer({ canvas, context, antialias: false, powerPreference: 'low-power' });
    const debug=context.getExtension('WEBGL_debug_renderer_info');
    const rendererName=debug?context.getParameter(debug.UNMASKED_RENDERER_WEBGL):context.getParameter(context.RENDERER);
    let savedQuality=null;
    try{savedQuality=localStorage.getItem('capital-drive-rendering-v1');}catch{savedQuality=null;}
    quality=chooseRenderQuality(savedQuality,rendererName);$('quality').value=quality;
    renderer.setPixelRatio(1); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  } else renderer = createCompatibilityRenderer(document.createElement('canvas'));
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Drive with WASD or arrows. Drag to look around.');
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); clearInput(); finishGraphicsTest(null, 'Reload to restore 3D graphics.'); notify('Graphics paused. Reload this page to restore the driving view.'); if (started) openDialog('pause-dialog'); });
  $('world').append(renderer.domElement);
  const hemisphere=new THREE.HemisphereLight(0xf8f5dc, 0x697258, 1.3);scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xfff0ce, 2.0); sun.position.set(-300, 450, 180); scene.add(sun);
  atmosphereView=compatibility?emptyView():createAtmosphereView(scene,{hemisphere,sun,heightAt:terrainSampler.heightAt,quality});
  airportView=compatibility?emptyView():createAirportView(scene,map,terrainSampler.heightAt);
  defenceDepotView=compatibility?emptyView():createDefenceDepotView(scene,map,terrainSampler.heightAt);
  vehicleDamageView=compatibility?emptyView():createVehicleDamageView(scene,terrainSampler.heightAt);
  const surfaceAt=compatibility?()=>0:terrainSampler.heightAt;
  headlightsView=compatibility?emptyView():createHeadlightsView(scene,{heightAt:(x,z)=>world.vehicleHeightAt({...simulation.player,x,z},simulation.player.edge?.road)});
  policeSupportView=compatibility?emptyView():createPoliceSupportView(scene);
  civicView=compatibility?emptyView():createCivicView(scene,map,terrainSampler.heightAt,{roadHeightAt:terrainSampler.roadHeightAt});
  noodleShopView=compatibility?emptyView():createNoodleShopView(scene,terrainSampler.heightAt);
  campusView=compatibility?emptyView():createCampusView(scene,map,terrainSampler.heightAt);
  localDetailsView=compatibility?emptyView():createLocalDetailsView(scene,map,terrainSampler.heightAt);
  appendCapitalHighwayBarriers(map);
  map.barriers.push(...(campusView.obstacles||[]),...(localDetailsView.obstacles||[]));
  map.barriers.push(...(civicView.barriers||[]),...(noodleShopView.obstacles||[]));
  neighbourhood = compatibility ? { update() {}, dispose() {}, stats: {},entries:[] } : createNeighbourhoodDetails(scene, map, surfaceAt,{lowGraphics:true,streaming:true});
  map.barriers.push(...(neighbourhood.backyardBarriers||[]));
  const groundVehicleHeightAt=compatibility?surfaceAt:terrainSampler.vehicleHeightAt;
  stuntsView=compatibility?emptyView():createStuntRampsView(scene,stunts);
  simulation=createSimulation(map,{
    isOnBridge:terrainSampler.isOnBridge,groundHeightAt:terrainSampler.groundHeightAt,
    vehicleHeightAt:groundVehicleHeightAt,preserveVehicleSupport:!compatibility,
    actorHeightAt:body=>world?.heightAt(body.x,body.z)??surfaceAt(body.x,body.z),
    stuntSupportAt:stunts.supportAt,nitroAutoRecharge:false,onTrafficHorn:soundTrafficHorn,vehicleMods:()=>!isSandbox()&&gameplay?progression.vehicleMods(gameplay.state.vehicle):{},powerModifiers:()=>heroPowers.modifiers(powerContext()),waterExemption:skylineYardWaterExempt});
  const nitroStations=createNitroStations(FUEL_STATIONS,simulation),nitroById=new Map(nitroStations.map(site=>[site.id,site]));
  stationDamage=createNitroStationDamage(nitroStations,{groundHeightAt:terrainSampler.heightAt});
  const forecourts=buildPetrolForecourts(nitroStations,FUEL_STATIONS,simulation,terrainSampler.heightAt,map.buildings);
  const rentals=buildRentalStorefronts(simulation,terrainSampler.heightAt);
  carRentalSites=rentals.sites;
  const serviceBarriers=[...forecourts.barriers,...rentals.barriers];
  map.barriers.push(...serviceBarriers);
  simulation.registerStaticBarriers(serviceBarriers);
  policeStations=createPoliceStations(map,simulation,terrainSampler.heightAt);
  map.barriers.push(...policeStations.barriers);
  simulation.registerStaticBarriers(policeStations.barriers);
  map.searchPlaces.push(...policeStations.sites.map(site=>site.place));
  map.landmarkTreeExclusions.push(...policeStations.barriers.map(barrier=>barrier.points));
  policeStationView=compatibility?emptyView():createPoliceStationView(scene,policeStations);
  map.landmarkTreeExclusions.push(...carRentalSites.map(site=>site.apron).filter(Boolean));
  map.servicePins=[];
  const standClear=(pose,ignoreId)=>!simulation.moveActor({...pose,id:ignoreId},0,0,.45).blocked;
  lightRail=createLightRail(map,{heightAt:surfaceAt,canStand:standClear,canReach:simulation.hasLineOfSight});
  lightRailView=compatibility?emptyView():createLightRailView(scene,lightRail,surfaceAt);
  depotTank=createDepotTank(map,simulation,{heightAt:terrainSampler.heightAt});
  depotTankView=compatibility?emptyView():createDepotTankView(scene);
  if(map.defenceDepot?.drivableTank){
    const tank=map.defenceDepot.drivableTank;
    map.searchPlaces.push({...tank,aliases:['tank','military tank','depot tank'],radius:12,description:'Driveable fictional depot tank'});
  }
  for(const stop of lightRail.stops){
    const pin={...stop.approach,id:stop.id,name:stop.name,aliases:stop.aliases,service:'rail',radius:10,description:'Capital Line light rail · '+stop.sourceId};
    map.servicePins.push(pin);map.searchPlaces.push(pin);
  }
  const heistSites=buildHeistSites(map,simulation,surfaceAt);
  map.barriers.push(...heistSites.barriers);
  simulation.registerStaticBarriers(heistSites.barriers);
  map.landmarkTreeExclusions.push(...heistSites.sites.filter(site=>site.apron).map(site=>site.apron));
  heistSitesView=compatibility?emptyView():createHeistSitesView(scene,heistSites.sites);
  const towerFootprint=map.buildings.find(building=>building.id===tower?.buildingId)?.points;
  northPlacesView=compatibility?null:createNorthPlacesView(scene,{tower,towerFootprint,waterpark:map.giantSpray,heightAt:surfaceAt});
  regionalLandmarksView=compatibility?null:createRegionalLandmarksView(scene,map,terrainSampler.groundHeightAt);
  if(regionalLandmarksView)map.landmarkBuildingIds.push(...regionalLandmarksView.managedBuildingIds);
  anuCampusView=compatibility?null:createAnuCampusView(scene,surfaceAt);
  anuCampusView?.update(map.spawn);
  macquarieShopsView=compatibility?null:createMacquarieShopsView(scene,map,terrainSampler.groundHeightAt,{canStand:standClear});
  macquarieShopsView?.update(map.spawn);
  warMemorialView=compatibility?null:createWarMemorialView(scene,map,terrainSampler.groundHeightAt);
  const assassinationMission=createAssassinationChapter(map,{
    canStand:pose=>standClear(pose),hasLineOfSight:simulation.hasLineOfSight,nearestRoad:simulation.nearestRoad,
    canTraverse:(from,to,radius)=>!simulation.moveActor({...from},to.x-from.x,to.z-from.z,radius).blocked,
  });
  const setup=assassinationMission?.compound.stealth;
  if(setup)assassinationMarkers=[{...setup.uniform,visual:'credential'},{...setup.distraction,visual:'relay'}];
  assassinationSiteView=createAssassinationSiteView(compatibility?null:scene,assassinationMission?.compound,surfaceAt);
  map.barriers.push(...assassinationSiteView.barriers);
  simulation.registerStaticBarriers(assassinationSiteView.barriers);
  if(assassinationSiteView.treeExclusion?.length)map.landmarkTreeExclusions.push(assassinationSiteView.treeExclusion);
  const foliageTexture=await foliageImage;
  if(foliageTexture){foliageTexture.colorSpace=THREE.SRGBColorSpace;foliageTexture.anisotropy=2;}
  world=compatibility?{heightAt:surfaceAt,groundHeightAt:surfaceAt,update(){},dispose(){},stats:{}}:
    createWorldView(scene,map,{lowGraphics:true,streaming:true,terrainSampler,rail:lightRail,foliageTexture,openingChunks:9});
  world.vehicleHeightAt=(pose,road)=>stuntVehicleHeightAt(pose)??groundVehicleHeightAt(pose,road);
  const [boarding,pickup]=lightRail.stops;
  const parcelPoint=boarding&&[8,-8,14,-14,18,-18,22].map(distance=>{
    const {x,z,yaw}=boarding.approach;
    return {x:x-Math.sin(yaw)*distance,z:z-Math.cos(yaw)*distance,yaw};
  }).find(point=>standClear(point)&&simulation.hasLineOfSight(point,boarding.approach));
  const railParcel=parcelPoint&&pickup?{...parcelPoint,id:'rail-parcel-heist',name:'Capital Line parcel job',kind:'rail',radius:3.5,stopId:boarding.id,arrivalStopId:pickup.id,boarding:boarding.approach,pickup:pickup.approach}:null;
  if(railParcel)railHeistMarker={...railParcel,visual:'case'};
  const robberyLocations=[...heistSites.sites,...(railParcel?[railParcel]:[])];
  for(const site of robberyLocations){
    const pin={...site,service:'heist',aliases:[...(site.aliases||[]),'heist','robbery'],description:site.description||'Fictional light rail job'};
    map.servicePins.push(pin);map.searchPlaces.push(pin);
  }
  heists=createHeistActivities({sites:robberyLocations,canSee:visible,
    onHeat:({kind,point,severity})=>{
      const offence=({rail:'light rail robbery',jeweller:'jewellery robbery',tower:'tower archive robbery',bank:'bank robbery',memorial:'exhibition case theft'})[kind];
      const reported=gameplay.reportOffence(offence,severity,{witnessed:true,point});
      recordCameraCrime(offence,point,reported);
    },
    onReward:({amount})=>{progression.state.cash=Math.min(1000000000,progression.state.cash+amount);saveCareer();}});
  watercraft=createWatercraft(map,simulation,{heightAt:terrainSampler.groundHeightAt,owns:kind=>isSandbox()||progression?.ownsWatercraft(kind)===true});
  watercraftDock=watercraft.dock;
  watercraftViewState={crafts:watercraft.vehicles,dock:watercraftDock};
  watercraftView=compatibility?emptyView():createWatercraftView(scene);
  if(watercraftDock){
    const pin={id:watercraftDock.id,name:watercraftDock.name,service:'boat-shop',x:watercraftDock.x,z:watercraftDock.z,
      aliases:['boat','jet ski','watercraft','lake launch'],radius:watercraftDock.radius,description:'Watercraft sales · '+watercraftDock.roadName};
    map.servicePins.push(pin);map.searchPlaces.push(pin);
  }
  for(const site of FUEL_STATIONS){
    if(site.category!=='petrol')continue;
    const bay=nitroById.get(site.id);
    const road=bay&&simulation.nearestRoad(bay.x,bay.z)?.road.name;
    const pin={id:site.id,name:site.name,service:'petrol',aliases:[site.sourceName,'petrol','gas station','fuel',...(bay?['nitro','nitro refill']:[])],
      x:bay?.x??site.x,z:bay?.z??site.z,radius:bay?.radius??3.25,description:road?`${road} · Nitro refill`:bay?'Nitro refill':'Petrol station'};
    map.servicePins.push(pin);map.searchPlaces.push(pin);
  }
  for(const site of carRentalSites){
    const pin={...site,service:'rental',description:site.road||'Car rental storefront'};
    map.servicePins.push(pin);map.searchPlaces.push(pin);
  }
  wildlifeView=compatibility?emptyView():createWildlifeView(scene,map,terrainSampler.heightAt);
  birdsView=compatibility?null:createBirdsView(scene,{sites:map.landmarks.filter(site=>BIRD_SITES.has(site.id)),heightAt:terrainSampler.groundHeightAt});
  streetAssetsView=compatibility?emptyView():createStreetAssetsView(scene,terrainSampler.heightAt,{nitroStations,petrolForecourts:forecourts.sites});
  rentalStorefrontsView=compatibility?emptyView():createRentalStorefrontsView(scene,terrainSampler.heightAt,carRentalSites);
  nitroView=compatibility?emptyView():createNitroView(scene);
  highwayBarriersView=compatibility?emptyView():createHighwayBarriersView(scene,terrainSampler.heightAt);
  signalsView=compatibility?emptyView():createTrafficLightsView(scene,world.heightAt);
  roadGuidanceView=compatibility?emptyView():createRoadGuidanceView(scene,(x,z,yaw)=>world.vehicleHeightAt({x,z,yaw}),{
    placePoint:(point,yaw)=>{
      const road=simulation.nearestRoad(point.x,point.z),width=road?roadProfile(road.road).driveWidth:8,offset=Math.min(2.3,width*.23);
      return {x:point.x-Math.cos(yaw)*offset,z:point.z+Math.sin(yaw)*offset};
    },
    isClear:(x,z,yaw)=>simulation.canOccupy({x,z,yaw},{length:1,width:.5})
  });
  micromobility=createMicromobility(map);microView=compatibility?emptyView():createMicromobilityView(scene,(x,z)=>world.heightAt(x,z));
  const ground=world.heightAt;world.heightAt=(x,z)=>Math.max(ground(x,z)+skateHeightOffset(x,z),stunts.heightAt(x,z)??-Infinity);
  civicExtrasView=compatibility?emptyView():createCivicExtrasView(scene,map,ground);
  world.update(simulation.player, {maxLoads:0});
  streetDealers=createStreetDealers(map,{heightAt:world.heightAt,avoidPoints:micromobility.snapshot().assets});dealerView=compatibility?emptyView():createStreetDealersView(scene,world.heightAt);
  pedestrians=createPedestrians(scene,map,world.heightAt,{moveActor:(actor,dx,dz,radius)=>simulation.moveActor(actor,dx,dz,radius),entrances:[...ALL_STORES.map(s=>s.frontage).filter(Boolean),...CIVIC_INTERIOR_ENTRIES,...CAMPUS_GATES,...(neighbourhood.entries||[]),...streetDealers.services]});
  map.landmarks.push(...streetDealers.services.map(site=>({...site,aliases:['street dealer','arms dealer','weapons contact'],description:'Fictional street contact'})));
  neighbourhood.update(simulation.player);
  landmarkView = compatibility ? { update() {}, dispose() {}, stats: {} } : createLandmarksView(scene, map, world.heightAt);
  landmarkView.update(simulation.player, 0);
  map.interiorEntries=neighbourhood.entries||[];
  gymEntries=[...GENERIC_SERVICES,...SOURCE_GYM_SERVICES].filter(s=>s.type==='gym').map(site=>createGymEntry(map,site)).filter(Boolean);
  gymEntry=gymEntries.find(entry=>entry.serviceId==='kingston-gym')||gymEntries[0];
  schoolEntry=createSchoolEntry(map);map.schoolEntry=schoolEntry;
  if(schoolEntry)map.searchPlaces.push({...schoolEntry,name:'Telopea after-hours wing',aliases:['Telopea Park School','school'],radius:12});
  interiors=createInteriors(map,{heightAt:world.heightAt,stores:ALL_STORES,heistSites:heistSites.sites,publicEntries:[...CIVIC_INTERIOR_ENTRIES,...gymEntries,...(schoolEntry?[schoolEntry]:[])]});
  createParkedCars();
  map.storyHomes=selectStoryHomes(map,interiors.entries,{canApproach:pose=>!simulation.moveActor({...pose},0,0,.45).blocked,roadName:pose=>simulation.nearestRoad(pose.x,pose.z)?.road.name||''});
  missionLocations=createMissionGuide(interiors.entries,map.storyHomes);
  missionFootpath=createMissionFootpath({canTraverse:createFootTraversal(simulation.moveActor)});
  const home=map.storyHomes.basement;if(home)map.searchPlaces.push({...home,id:'milo-safehouse',aliases:['Milo','safehouse','home'],description:'Milo’s safehouse'});
  aircraft=createAircraft(map,simulation,{heightAt:world.heightAt});
  aircraftView=compatibility?emptyView():createAircraftView(scene);
  skylineJob=createSkylineJob({site:SKYLINE_SITE,groundHeightAt:world.groundHeightAt});
  skylineCover=createSkylineCover(skylineJob.layout,{heightAt:world.groundHeightAt,canOccupy:simulation.canOccupy,nearestRoad:simulation.nearestRoad});
  skylineSiteView=compatibility?null:createSkylineSiteView(scene,world.groundHeightAt,{cover:skylineCover});
  skylineAtv=createSkylineAtv({heightAt:world.groundHeightAt,canOccupy:simulation.canOccupy,moveVehicle:simulation.moveVehicle,
    canStand:(pose,{ignoreId})=>standClear(pose,ignoreId)&&(!simulation.waterAt(pose.x,pose.z,{underBridge:true})||skylineYardWaterExempt(pose.x,pose.z)),
    canSee:(from,to)=>visible(from,to)});
  skylineAtvView=compatibility?null:createSkylineAtvView(scene);
  skylineOpponents=createSkylineOpponents({heightAt:world.heightAt,hasLineOfSight:skylineOpponentSight,
    clipMovement:(body,dx,dz,radius)=>{const step=simulation.moveActor({...body},dx,dz,radius);return {dx:step.x-body.x,dz:step.z-body.z};},
    onPlayerHit:amount=>gameplay.damageActor(amount)});
  skylinePressure=createSkylinePressure({hasLineOfSight:skylineOpponentSight});
  skylinePressureView=compatibility?null:createSkylinePressureView(scene,world.groundHeightAt);
  skylineBackup=createSkylineBackup({opponents:skylineOpponents,heightAt:world.heightAt,hasLineOfSight:skylineOpponentSight,
    canStand:pose=>standClear(pose)&&(!simulation.waterAt(pose.x,pose.z,{underBridge:true})||skylineYardWaterExempt(pose.x,pose.z))});
  skylineSupport=createSkylineSupport({canUse:canOrderSkylineSupport,apply:applySkylineSupport});
  for(const plane of aircraft.snapshot().planes){
    const parking=aircraftStandParking(plane);
    if(!parking)continue;
    const helicopter=plane.kind==='helicopter';
    map.searchPlaces.push({id:'stand:'+plane.id,name:helicopter?(plane.depot?'Depot helicopter':'Airport helicopter stand'):plane.depot?'Depot interceptor':'Airport jet stand',
      aliases:helicopter?['helicopter','helipad',plane.name]:['jet','plane',plane.name,...(plane.depot?['military jet','depot jet','interceptor']:[])],...parking,radius:12,
      description:`Checked parking beside a fictional ${plane.kind} stand`});
  }
  addressSearch=createAddressSearch(map,addressData);
  campaignScenes=createCampaignScenes(map,simulation,{entrances:interiors.entries});
  campaignScenesView=compatibility?emptyView():createCampaignScenesView(scene,world.heightAt,{capacity:6});
  interiorScene=new THREE.Scene();interiorScene.background=new THREE.Color(0xccc3ad);
  interiorScene.add(new THREE.HemisphereLight(0xfff8df,0x70685b,2));
  if(!compatibility){const ring=new THREE.RingGeometry(.35,.49,18);ring.rotateX(-Math.PI/2);missionRing=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:0xf2b544,side:THREE.DoubleSide,depthWrite:false}));missionRing.visible=false;interiorScene.add(missionRing);}
  const indoorSun=new THREE.DirectionalLight(0xfff1d4,1.1);indoorSun.position.set(-2,5,3);interiorScene.add(indoorSun);
  interiorView=compatibility?{load(){},clear(){},dispose(){},stats:{}}:createInteriorView(interiorScene);
  roomPeopleView=compatibility?{load(){},update(){},clear(){},dispose(){},stats:{}}:createInteriorPeopleView(interiorScene,()=>interiors.active?.floorY||0);
  const careerOptions={nitroStations,isNitroStationDestroyed:id=>stationDamage.outOfService(id),isStoryRobbery:id=>gameMode==='campaign'&&campaign?.isStoryRobbery(id),watercraftDock:()=>watercraftDock,takeSafehouseRest:(roomId,ctx)=>houseController?.takeRestReceipt(roomId,ctx),deliveryOrder:()=>delivery?.busy?delivery.snapshot().order:null,takeDeliveryReceipt:orderId=>{const receipt=deliveryReceipts.get(orderId);deliveryReceipts.delete(orderId);return receipt;},takeHouseLoot:(roomId,ctx)=>burglary.takeHouseLoot(roomId,ctx),homes:interiors.entries.filter(entry=>entry.type==='house'),extraServices:streetDealers.services,workSession:()=>({plan:interiors.active,session:activities.snapshot()}),interactiveWorkouts:true,interactiveRobbery:true,crimeTarget,robberyTarget,hasLineOfSight:visible,servicePosition:servicePosition,canUseService:site=>site.dealer?!interiors.active&&streetDealers.canTrade(site.id):site.type==='gym'?interiors.active?.serviceId===site.id:!site.buildingId||interiors.active?.storeId===site.id};
  const memorialSite=heistSites.sites.find(site=>site.kind==='memorial');
  const memorialEntry=memorialSite&&interiors.entries.find(entry=>entry.heistSiteId===memorialSite.id);
  const gallery=memorialEntry&&{roomId:memorialEntry.id,
    points:memorialGalleryActions(memorialEntry,memorialEntry.floorY),exits:memorialSite.exits};
  stealthContracts=createStealthContracts(map,{gallery,canStand:pose=>simulation.canOccupy({...pose,yaw:0},{length:1,width:1,ignoreId:'player'}),
    nearestRoad:simulation.nearestRoad,hasLineOfSight:simulation.hasLineOfSight});
  stealthContractView=compatibility?emptyView():createStealthContractsView(scene,world.heightAt);
  const campaignOptions={meetingPoint:campaignScenes.meetingPoint||undefined,stealthContracts,assassinationMission};
  try {
    const saved=parseCareerSave(localStorage.getItem(CAREER_KEY));
    const {campaign:savedCampaign,protagonists:savedProtagonists,nitroFuel:savedNitro,campaignWorld:savedWorld,streetWorld:savedStreetWorld,campaignAftermath:savedAftermath,...careerSave}=saved||{};
    if(savedNitro!==undefined&&(!Number.isFinite(savedNitro)||savedNitro<0||savedNitro>1))throw new Error('Invalid saved nitro level.');
    protagonists=createProtagonistState(savedProtagonists===undefined?null:savedProtagonists,{bounds:map.bounds});
    campaign=createCampaign(map,savedCampaign===undefined?null:savedCampaign,campaignOptions);
    campaignWorld=createCampaignWorld(savedWorld);streetWorld=createCampaignWorld(savedStreetWorld);campaignAftermath=createCampaignAftermath(savedAftermath);
    progression = createProgression(map, saved ? careerSave : null,careerOptions);
    simulation.driving.nitroFuel=savedNitro??1;
  } catch (error) {
    protagonists=createProtagonistState(null,{bounds:map.bounds});
    careerError = `Career could not be loaded: ${error.message} This session will not overwrite it.`;
    campaign=createCampaign(map,null,campaignOptions);progression = createProgression(map,null,careerOptions); $('save-status').textContent = careerError;
    campaignWorld=createCampaignWorld();streetWorld=createCampaignWorld();campaignAftermath=createCampaignAftermath();
  }
  shotObstacles=createShotObstacles({...map,barriers:[...map.barriers,...skylineCover]},{heightAt:world.heightAt,groundHeightAt:world.groundHeightAt,vehicleHeightAt:world.vehicleHeightAt,bridgeSegments:terrainSampler.bridgeSegments});
  setSkylineCover(false);
  drone=createDrone({heightAt:world.groundHeightAt,canOccupy:droneCanOccupy});droneView=compatibility?emptyView():createDroneView(scene);
  const cameraLocations=streetCameraLocations(ALL_STORES,world.heightAt,cameraMountClear);
  securityCameras=createSecurityCameras(cameraLocations,{heightAt:world.heightAt,hasLineOfSight:cameraSight});
  securityCamerasView=compatibility?emptyView():createSecurityCamerasView(scene);
  indoorSecurityCamerasView=compatibility?emptyView():createSecurityCamerasView(interiorScene);
  const actorSimulation={...simulation,moveActor:(actor,...args)=>actor===gameplay?.state.actor?moveBody(actor,...args):simulation.moveActor(actor,...args),
    moveSwimmingActor:(actor,dx,dz,radius)=>moveBody(actor,dx,dz,radius,true),hasLineOfSight:visible};
  contractTarget=createContractTarget({heightAt:world.heightAt,hasLineOfSight:visible,
    clipMovement:(body,dx,dz,radius)=>{
      const step=simulation.moveActor({...body},dx,dz,radius);
      return {dx:step.x-body.x,dz:step.z-body.z};
    }});
  const witnesses={snapshot:()=>interiors.active?roomPeople.snapshot():[...pedestrians.snapshot(),...streetDealers.snapshot(),...(rideService?.people||[]).filter(person=>person.active)],
    drainEvents:()=>[...pedestrians.drainEvents(),...roomPeople.drainEvents(),...(rideService?.drainCombatEvents()||[])],
    alert:spec=>{if(interiors.active)roomPeople.alert(spec);else{pedestrians.alert(spec);streetDealers.alert(spec);rideService?.alert(spec);}},
    strike:spec=>{const results=(interiors.active?[roomPeople.strike(spec)]:[pedestrians.strike(spec),streetDealers.strike(spec),rideService?.strike(spec),contractTarget.body&&contractTarget.strike(spec),skylineLease&&skylineOpponents.strike(spec)]).filter(Boolean);return {hits:results.reduce((total,result)=>total+result.hits,0),people:results.flatMap(result=>result.people||[])};}};
  const canStandForRecovery=pose=>!simulation.moveActor({...pose},0,0,.45).blocked;
  const recoveryHouse=origin=>planSafehouseReturn({
    entries:interiors.entries,origin,storyHome:map.storyHomes?.basement,
    isOwned:id=>progression.isSafehouse(id),canStand:canStandForRecovery,
    findEntry:pose=>interiors.findEntry(pose,{exteriorPreview:true}),
  });
  let recoveryPlan=null;
  gameplay = createGameplay(map, actorSimulation, { pedestrians:witnesses, heightAt:(x,z)=>interiors.active?.floorY??anuBridgeHeightAt(x,z,surfaceAt)??world.heightAt(x,z),
    absorbArmour:damage=>!isSandbox()&&!developerReturn?progression.absorbArmour(damage):damage,
    godMode:()=>godMode,getResponseLoss:()=>policeStations?.responseLoss()||0,
    getPatrolStations:()=>policeStations?.patrolStations()||[],
    getDrone:()=>droneActive?drone.snapshot():null,droneLineOfSight:policeDroneSight,
    onAwareness:event=>{if(event.kind==='drone-spotted')notify('Police spotted your drone.');},
    powerModifiers:()=>heroPowers.modifiers(powerContext()),onVehicleImpacts:(events,dt)=>pedestrians.applyVehicleImpacts(events,dt),hasBlastLineOfSight:(a,b)=>visible(a,b,true),
    getInterior:()=>policeRooms.current,getHostageRoomId:()=>heists?.hostageRoomId,resolveInterior:id=>policeRooms.resolve(id),
    canAttack:canPlayerAttack,canFireWeapon:()=>campaign.state.active?.target.victory!==true,getShotTargets:shotTargets,traceShot:tracePlayerShot,
    playerFeetY:()=>skylineAirPose?.y??jetpack?.feetY,
    launchRocket:ray=>ordnance?.launchRocket(ray),onVehicleShot:hitWorldVehicle,onVehicleExplosion:damageExplosionVehicles,policeShotClear,getAllies:()=>campaignScenes?.people||[],
    getSearchDuration:campaign.policeSearchDuration,
    passengerPose:()=>aircraft?.seatPose||skylineAtv?.seatPose||depotTank?.seatPose||watercraft?.seatPose||lightRail?.seatPose||rideService?.seatPose||buses?.seatPose,
    playerAltitude:aircraftAltitude,isPiloting:()=>!!aircraft?.active||watercraft?.isActive===true||depotTank?.isActive===true,
    hasWeapon:id=>!!progression.state.equipment[id]||!!skylineLease&&id===SKYLINE_WEAPON,hasPistol:()=>progression.state.equipment.pistol,fitness:()=>progression.state.fitnessLevel,
    onCarjacked:pose=>occupantsView?.addExit(pose),
    onVehicleChanged: applyPlayerVehicle,
    getMedicalRecoveryOrigin: origin => {
      recoveryPlan=!developerReturn&&!missionCheckpoint?recoveryHouse(origin):null;
      return recoveryPlan?.approach||origin;
    },
    onRespawn: reason => {
      watercraft?.reset();
      lightRail?.reset();heists?.cancel();depotTank?.reset();
      const missionTransfer=!!missionCheckpoint;
      const deliverySeizure=reason==='arrest'&&gameplay.state.recovery?.deliverySeizure;
      const plannedHouse=recoveryPlan;
      recoveryPlan=null;
      resetCampaignWorld();jetpack?.reset(gameplay.state);cockpitCamera=false;clearInterior();micromobility.reset();resetDelivery();rideService?.reset();buses?.reset();equipment?.reset();followYoober=false;
      if(!developerReturn&&!missionTransfer&&!deliverySeizure)progression.penalize(reason === 'arrest' ? 'Arrest' : 'Hospital treatment');
      const rentalRecovered=carRental?.recover();
      const owned = progression.state.ownedVehicles.find(car => car.id === gameplay.state.vehicle.modelId);
      if (owned && !rentalRecovered&&!gameplay.state.vehicle.stolen&&!developerReturn&&aircraftRescueHealth===null) owned.health = 100;
      if(aircraftRescueHealth!==null){gameplay.state.vehicleHealth=aircraftRescueHealth;aircraftRescueHealth=null;}
      let safehouse;
      if(reason==='knockout'&&!missionTransfer&&!developerReturn){
        const target=plannedHouse&&canStandForRecovery(plannedHouse.approach)&&interiors.findEntry(plannedHouse.approach)===plannedHouse.entry
          ? plannedHouse : recoveryHouse(gameplay.state.recovery?.origin||focus());
        if(target){
          const body=gameplay.state.actor;
          Object.assign(body,target.approach);
          gameplay.state.mode='foot';
          enterInterior(target.entry);
          if(interiors.active?.id===target.entry.id)safehouse=target.name;
          else gameplay.state.mode='vehicle';
        }
      }
      cameraReady = false; clearInput(); pedestrians.resetPopulation(focus());
      if(safehouse)return {safehouse};
    },
    onEvent: event => {
      combatFeedback(event);
      recordCameraGameplayEvent(event);
      if(event.kind==='attack'&&event.weapon&&contractTarget?.body)contractTarget.heardShot({...focus(),interiorId:interiors.active?.id||null});
      if (!['attack','dry-fire','reload','reload-complete'].includes(event.kind)) notify(event.message);
      if (event.kind === 'respawn') cameraReady = false;
    } });
  carRental=createCarRental(carRentalSites,simulation,{pay:progression.payCarRental,install:installRentalVehicle,visible});
  houseController=createHouseController({burglary,activities,progression,getPlan:()=>interiors.active,save:saveCareer,heal:amount=>gameplay.heal(amount)});
  jetpack=createJetpack({moveActor:moveBody,heightAt:world.groundHeightAt,
    moveFlight:(actor,dx,dz,options)=>shotObstacles.moveBody(actor,dx,dz,{...options,vehicles:jetpackBodies}),
    canOccupy:(pose,options)=>shotObstacles.canOccupyBody(pose,{...options,vehicles:jetpackBodies}),
    supportHeightAt:(x,z,options)=>shotObstacles.supportHeightAt(x,z,{...options,vehicles:jetpackBodies})});
  jetpackView=compatibility?emptyView():createJetpackView(scene,world.groundHeightAt);
  ordnance=createOrdnance({consumeThrow:(kind,ctx)=>progression.consumeThrowable(kind,ctx),canThrow:()=>!jetpack?.active&&canPlayerAttack(),
    moveProjectile:(body,dx,dz,radius,ctx)=>ctx.interiorId?(policeRooms.resolve(ctx.interiorId)?.moveActor(body,dx,dz,radius)||{blocked:true}):simulation.moveActor(body,dx,dz,radius),
    traceRocket:ray=>{
      const room=ray.interiorId?interiors.active:null;
      return ray.interiorId&&room?.id!==ray.interiorId?0:traceWorldShot(ray,room);
    },
    heightAt:(x,z,roomId)=>roomId?policeRooms.resolve(roomId)?.floorY:world.heightAt(x,z)});
  ordnanceView=compatibility?emptyView():createOrdnanceView(scene,{quality});
  indoorOrdnanceView=compatibility?emptyView():createOrdnanceView(interiorScene,{quality});
  actorView = compatibility ? { update() {}, dispose() {}, stats: {} } : createActorView(scene, world.heightAt);
  occupantsView=compatibility?{update(){},addExit(){},dispose(){},stats:{}}:createVehicleOccupantsView(scene,world.heightAt,{vehicleHeightAt:world.vehicleHeightAt});
  servicesView=compatibility?{update(){},dispose(){},stats:{}}:createServicesView(scene,world.heightAt);
  storefrontsView=compatibility?{update(){},dispose(){},stats:{}}:createStorefrontsView(scene,world.heightAt,{excludeIds:[NOODLE_SHOP_ID]});
  trafficView=compatibility?{update(){},dispose(){},stats:{}}:createTrafficView(scene,world.heightAt,simulation.traffic,{vehicleHeightAt:world.vehicleHeightAt});
  shoppingView=compatibility?emptyView():createShoppingView(scene,map,world.heightAt);
  busView=compatibility?{update(){},dispose(){},stats:{}}:createBusView(scene,world.heightAt,{vehicleHeightAt:world.vehicleHeightAt});
  cityUI=createCityUI({document,getState:cityState,onAction:cityAction,onRoute:point=>{if(point)routeTo(point);closeDialogs();},onOpen:()=>{closeDialogs();clearInput();},onClose:()=>{clearInput();renderer?.domElement.focus();}});
  dialogs.push(...cityUI.dialogs);
  streetUI = createStreetUI({ gameplay, progression, simulation, vehicles, notify, openDialog, closeDialogs,
    onVehicleSelected: applyPlayerVehicle, onRoute: routeTo, saveCareer, isSandbox,campaign,isCampaign:()=>gameMode==='campaign',getContext:careerContext,onJobs:openWork,interactionHint:interiorHint,onWorkout:()=>{closeDialogs();const station=activities.nearest(focus(),availableHouseStation);if(!station||!isWorkoutKind(station.kind)){notify('Walk beside the bench, treadmill, weights or rower. Press E to train.');return;}beginMini(station.id);} });
  applyPlayerVehicle({ modelId: selectedCar, color: selectedPaint, health: 100 });
  buses=createBuses(map,simulation);
  rideService=createRideService(map,simulation,{heightAt:world.heightAt,canPay:fare=>isSandbox()||progression.state.cash>=fare,pay:fare=>{if(isSandbox())return true;const result=progression.payRide(fare,careerContext());if(result.ok)saveCareer();return result.ok;}});
  rideView=compatibility?emptyView():createRideServiceView(scene,world.heightAt,{vehicleHeightAt:world.vehicleHeightAt});
  deliveryCatalog=deliverySources(progression.services,streetDealers.services);
  delivery=createDeliveryService(map,simulation,{sources:deliveryCatalog});deliveryViewState.car=delivery.vehicles[0];deliveryView=compatibility?emptyView():createDeliveryView(scene,world.heightAt,{vehicleHeightAt:world.vehicleHeightAt});
  equipment=createEquipment({consumeFlare:context=>progression.consumeFlare(context),hasLineOfSight:visible,canOccupy:(pose,options)=>simulation.canOccupy(pose,options),heightAt:world.heightAt});
  equipmentView=compatibility?emptyView():createEquipmentView(scene,world.heightAt);
  syncExternalVehicles();
  createMapImage(); loadProgress(); populatePlaces(); refreshModeUI(); renderCharacterChoices(); syncPlayerAppearance(); resize(); updateHud();
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
    const freeAim=gameplay.state.mode==='foot'&&!gameplay.state.passenger&&(keys.has('KeyZ')||mouseAim);
    if(paused()||(!dragging&&!freeAim)){pointer=[event.clientX,event.clientY];return;}
    if(!pointer){pointer=[event.clientX,event.clientY];return;}
    if (gameplay.state.mode === 'foot'&&!gameplay.state.passenger) {
      const angles=lookAngles(footCameraYaw,footLookPitch,event.clientX-pointer[0],event.clientY-pointer[1]);
      footCameraYaw=angles.yaw;footLookPitch=angles.pitch;
    } else {
      orbit -= (event.clientX - pointer[0]) * .006;
      if(cockpitCamera)orbit=THREE.MathUtils.clamp(orbit,-1.45,1.45);
      lookPitch = THREE.MathUtils.clamp(lookPitch - (event.clientY - pointer[1]) * .004, -.5, .72);
    }
    if(Math.abs(event.clientX-pointer[0])+Math.abs(event.clientY-pointer[1])>1)tutorialSerials.orbitSerial++;
    pointer = [event.clientX, event.clientY]; orbitHold = 3;
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) viewCanvas.addEventListener(type, () => { dragging = false; pointer = null; });
  $('loading').textContent = compatibility?'Ready · 2D map view (WebGL unavailable)':'Ready';
  $('startup-quality').value = quality;
  $('startup-quality').disabled = compatibility;
  $('graphics-test').disabled = compatibility;
  $('graphics-test').hidden = compatibility;
  renderCharacterChoices();
  // Read-only diagnostics for QA; no production state setters.
  window.capitalDriveSnapshot = () => Object.freeze({ ready: true, started, paused: paused(), gameMode,
    player: Object.freeze({ ...simulation.player }), focus: Object.freeze({ ...focus() }),
    nitro:freezeCopy({bays:nitroStations,offer:nitroOfferForCar()}),
    deliveries:delivery?.snapshot(),stunts:stunts?.ramps,driving:freezeCopy(simulation.driving),jetpack:freezeCopy({...jetpack.snapshot(),altitude:jetpack.active?gameplay.state.actor.jumpHeight:0}),
    aircraft:aircraft.snapshot(),aircraftView:freezeCopy(aircraftView.stats),powers:heroPowers.snapshot(),vehicleDamage:freezeCopy({state:vehicleDamage.snapshot(),view:vehicleDamageView.stats}),ordnance:ordnance.snapshot(),atmosphere:atmosphere.snapshot(),airport:freezeCopy(airportView.stats),defenceDepot:freezeCopy(defenceDepotView.stats),touch:freezeCopy({move:moveStick.snapshot(),look:lookStick.snapshot()}),tutorial:tutorial.snapshot(),uiStats:Object.freeze({activity:activityUI.stats}),gameplay: gameplay.snapshot(),rentalHack:freezeCopy(rentalHack.snapshot()),burglary:burglary.snapshot(),nearbyVehicles:freezeCopy(simulation.nearbyVehicles(focus().x,focus().z,40)),miniGame:freezeCopy(activities.snapshot()),roomPeople:freezeCopy(roomPeople.snapshot()),roomPeopleView:freezeCopy(roomPeopleView.stats),rentals:freezeCopy(micromobility.snapshot()),microView:freezeCopy(microView.stats),gymEntry:freezeCopy(gymEntry),campaign:campaign.snapshot(),protagonists:protagonists.serialize(),interiors:freezeCopy({...interiors.snapshot(),entrySample:interiors.entries.slice(0,8),publicEntries:CIVIC_INTERIOR_ENTRIES,active:interiors.active}),career: freezeCopy(progression.serialize()), totalPlaces: map.landmarks.length,
    activeJob:freezeCopy(progression.state.activeJob),rideService:rideService.snapshot(),rideView:freezeCopy(rideView.stats),
    guidance:guidance.snapshot(),rideTracking:freezeCopy(rideTracking()),courierTracking:freezeCopy({...delivery.tracking(),following:followCourier}),signals:freezeCopy({elapsed:simulation.trafficLights.elapsed,sourceCount:map.trafficSignals.signals.length,groupCount:simulation.trafficLights.groups.length,heads:simulation.trafficLights.heads,view:signalsView.stats}),equipment:freezeCopy({flares:equipment.snapshot(),view:equipmentView.stats}),busPassenger:!!buses.passenger,
    roadGuidance:freezeCopy(roadGuidanceView.stats),
    places: Object.freeze(map.landmarks.map(place => Object.freeze({ ...place }))), addressCount: addressData.addresses.length,
    camera: Object.freeze({ x: camera.position.x, y: camera.position.y, z: camera.position.z, orbit, lookPitch,footYaw:footCameraYaw,footPitch:footLookPitch,viewMode:cockpitCamera&&cockpitAvailable()?'cockpit':'chase' }),recon:reconnaissance.snapshot(),evidence:freezeCopy(evidenceOutcome),combatAudioVoices:audio?.voices?.size||0,vehicleWrecks:freezeCopy({police:gameplay.policeWrecks,meshes:abandonedMeshes.size,capacity:18}),drone:freezeCopy({state:drone.snapshot(),view:droneView.stats}),securityCameras:freezeCopy(securityCameras.snapshot()),headlights:freezeCopy({enabled:headlightsEnabled(atmosphere.snapshot().hour),override:headlightsOverride,view:headlightsView.stats}),policeSupport:freezeCopy({people:gameplay.policeSupport(),view:policeSupportView.stats}),
    discovered: Object.freeze([...discovered]), roadCount: map.roads.length, buildings: map.buildings.length, traffic: simulation.traffic.length,
    visibleTraffic: trafficView.stats.visible||0,trafficView:Object.freeze({...trafficView.stats}), destination: destination?.id ?? null, routePoints: route.length,routePath:freezeCopy(route.map(p=>({x:p[0],z:p[1]}))),streetDealers:freezeCopy({services:streetDealers.services,people:streetDealers.snapshot(),view:dealerView.stats}),
    mapSelection: mapSelection ? Object.freeze({ ...mapSelection }) : null,
    mapView: Object.freeze({ zoom: mapView.zoom, ...map.bounds, x: fullMapProjection().cx, z: fullMapProjection().cz, scale: fullMapProjection().scale }),
    rendering: Object.freeze({ frames:renderedFrames,calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, occupantPoseCacheSize:occupantPoses.size, quality, compatibility }), graphicsTest:freezeCopy({active:graphicsTest.active,profile:graphicsTest.current,result:graphicsResult}), world: Object.freeze({ ...world.stats }),
    pedestrians: Object.freeze({ ...pedestrians.stats, sample: Object.freeze(pedestrians.snapshot().slice(0,8)),routineSample:freezeCopy(pedestrians.snapshot().filter(p=>['coffee','work'].includes(p.ambient)).slice(0,12)) }), neighbourhood: Object.freeze({ ...neighbourhood.stats }),
    landmarks: Object.freeze({ ...landmarkView.stats }), actors: Object.freeze({ ...actorView.stats }),
    services:freezeCopy(progression.services),activity:freezeCopy(progression.state.activity),
    buses:freezeCopy(buses.snapshot()),busView:Object.freeze({...busView.stats}),occupants:Object.freeze({...occupantsView.stats}),peopleContacts:simulation.peopleContacts,
    playerAppearance:playerAppearanceId,storyHomes:freezeCopy(map.storyHomes),homeAction:freezeCopy(homeActionOutcome),missionGuide:freezeCopy(missionGuideState),gymEntries:freezeCopy(gymEntries),schoolEntry:freezeCopy(schoolEntry),schoolAlarm:freezeCopy(schoolAlarmOutcome),indoorActors:freezeCopy(indoorActorView?.stats||{officers:0,police:0}),policeRooms:policeRooms.snapshot(),heist:freezeCopy(heistOutcome),cutscene:cutscenes.snapshot(),combatAllowed:canPlayerAttack(),encounter:roomPeople.encounter,presentation:freezeCopy(presentationOutcome),workCompletion:freezeCopy(workCompletion),
    wildlife:freezeCopy({...wildlifeView.stats,animals:wildlifeView.animals}),streetAssets:freezeCopy(streetAssetsView.stats),highwayBarriers:freezeCopy(highwayBarriersView.stats),localDetails:freezeCopy(localDetailsView.stats),
    campaignCast:freezeCopy({people:campaignScenes.people,lines:campaignScenes.dialogueLines,meetingPoint:campaignScenes.meetingPoint,view:campaignScenesView.stats}),
    serviceView:Object.freeze({...servicesView.stats}),storefronts:Object.freeze({...storefrontsView.stats}),poolGates:freezeCopy(POOL_GATE_APPROACHES),campus:freezeCopy(campusView.stats),campusGates:freezeCopy(CAMPUS_GATES),shopping:freezeCopy(shoppingView.stats),civic:freezeCopy(civicView.stats),civicExtras:freezeCopy(civicExtrasView.stats),noodleShop:freezeCopy(noodleShopView.stats),interiorView:freezeCopy(interiorView.stats),
    policeStations:freezeCopy(policeStations.snapshot()),policeStationView:freezeCopy(policeStationView.stats),
    stealth:freezeCopy({preview:stealthPreview,view:stealthContractView.stats}),
    assassination:freezeCopy({approach:assassinationMission?.stages[0],target:contractTarget.snapshot(),site:assassinationSiteView.stats}),
    watercraft:freezeCopy({...watercraft.snapshot(),view:watercraftView.stats}),
    lightRail:freezeCopy({...lightRail.snapshot(),view:lightRailView.stats}),depotTank:freezeCopy(depotTank.snapshot()),
    heists:freezeCopy(heists.snapshot()),skyline:freezeCopy(skylineJob.snapshot()),skylineView:freezeCopy(skylineSiteView?.stats()||null),skylineAtv:freezeCopy(skylineAtv.snapshot()),flightGuide:freezeCopy(airGuideState),minimapZoomed,northPlaces:freezeCopy(northPlacesView?.stats()||null),regionalLandmarks:freezeCopy(regionalLandmarksView?.stats||null),anuCampus:freezeCopy(anuCampusView?.stats()||null),regions:freezeCopy(map.regionalExpansion),memorial:freezeCopy(warMemorialView?.stats||null),birds:freezeCopy(birdsView?.stats()||null),campaignWorld:campaignWorld.snapshot(),streetWorld:streetWorld.snapshot(),
    aftermath:freezeCopy({case:campaignAftermath.current(),history:campaignAftermath.serialize()}),
    skylinePressure:skylinePressure.snapshot(),skylineSupport:skylineSupport.snapshot(),skylineBackup:freezeCopy(skylineBackup.snapshot()),
    trafficSample: freezeCopy(simulation.traffic.slice(0, 8).map(({ id, x, z, speed, active, behaviour, honkCount }) => ({ id, x, z, speed, active, behaviour, honkCount }))) });
  raf = requestAnimationFrame(animate);
}
window.addEventListener('pagehide', event => {
  if (progression && gameplay) saveCareer();
  if (event.persisted) return;
  nitroView?.dispose();rentalStorefrontsView?.dispose();
  disposed = true;resetDelivery();deliveryView?.dispose();stuntsView?.dispose();houseController?.reset();drone?.dispose();droneActive=false;droneView?.dispose();securityCameras?.dispose();securityCamerasView?.dispose();indoorSecurityCamerasView?.dispose();cityUI?.dispose(); cancelAnimationFrame(raf); clearTimeout(toastTimer); clearInput();
  moveStick.dispose(); lookStick.dispose();
  stealthContractView?.dispose();
  watercraft?.dispose();watercraftView?.dispose();
  lightRailView?.dispose();heistSitesView?.dispose();northPlacesView?.dispose();depotTankView?.dispose();
  regionalLandmarksView?.dispose();anuCampusView?.dispose();macquarieShopsView?.dispose();skylineSiteView?.dispose();skylineOpponents?.dispose();skylineAtvView?.dispose();skylineAtv?.reset();
  skylinePressureView?.dispose();skylinePressure?.dispose();skylineSupport?.dispose();skylineBackup?.reset();
  warMemorialView?.dispose();birdsView?.dispose();
  aircraft?.reset();aircraftView?.dispose();jetpack?.reset(gameplay?.state);jetpackView?.dispose();ordnance?.reset();ordnanceView?.dispose();indoorOrdnanceView?.dispose();atmosphereView?.dispose();airportView?.dispose();defenceDepotView?.dispose();policeStationView?.dispose();vehicleDamageView?.dispose();
  if (audio) { audio.engine.dispose(); audio.context.close().catch(error => console.warn('Could not release audio:', error.message)); }
  parkedView?.dispose(); parkedView = null;
  for (const resource of parkedResources) resource.dispose();
  activityUI.dispose();streetUI?.dispose(); actorView?.dispose(); landmarkView?.dispose();busView?.dispose();occupantsView?.dispose();servicesView?.dispose();trafficView?.dispose();storefrontsView?.dispose();
  dealerView?.dispose();rideView?.dispose();resetDelivery();rideService?.reset();signalsView?.dispose();roadGuidanceView?.dispose();equipmentView?.dispose();equipment?.reset();
  policeRooms.clear();cutscenes.cancel();pendingCutscene=null;missionRing?.geometry.dispose();missionRing?.material.dispose();
  stopMini();roomPeopleView?.dispose();microView?.dispose();civicExtrasView?.dispose();
  shoppingView?.dispose();campusView?.dispose();civicView?.dispose();noodleShopView?.dispose();interiorView?.dispose();indoorActorView?.dispose();
  wildlifeView?.dispose();streetAssetsView?.dispose();highwayBarriersView?.dispose();localDetailsView?.dispose();
  campaignScenes?.clear();campaignScenesView?.dispose();contractTarget?.clear();assassinationSiteView?.dispose();indoorCampaignScenesView?.dispose();headlightsView?.dispose();policeSupportView?.dispose();
  pedestrians?.dispose(); neighbourhood?.dispose(); world?.dispose(); disposeCars(); renderer?.dispose();
});
boot().then(() => setupGameCache({canReload:()=>!started})).catch(showGameStartupError);
