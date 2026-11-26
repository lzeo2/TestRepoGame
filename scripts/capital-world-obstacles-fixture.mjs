import assert from 'node:assert/strict';
import * as THREE from '../assets/car-arcade/vendor/three.module.js';
import {createCivicView} from '../Games/Capital Drive/civic-view.js';
import {createNoodleShopView} from '../Games/Capital Drive/noodle-shop-view.js';
import {PARK_AMENITIES} from '../Games/Capital Drive/park-amenities.js';
import {createParkAmenitiesView} from '../Games/Capital Drive/park-amenities-view.js';
import {createCampusView} from '../Games/Capital Drive/campus-view.js';
import {createLocalDetailsView} from '../Games/Capital Drive/local-details-view.js';
import {createNeighbourhoodDetails} from '../Games/Capital Drive/neighbourhood.js';
import {createSimulation} from '../Games/Capital Drive/simulation.js';
import {createNitroStations} from '../Games/Capital Drive/nitro-stations.js';
import {FUEL_STATIONS} from '../Games/Capital Drive/street-assets.js';
import {buildPetrolForecourts} from '../Games/Capital Drive/petrol-forecourts.js';
import {buildRentalStorefronts} from '../Games/Capital Drive/rental-storefronts.js';
import {createPoliceStations} from '../Games/Capital Drive/police-stations.js';
import {buildHeistSites} from '../Games/Capital Drive/heist-sites.js';
import {createAssassinationChapter} from '../Games/Capital Drive/assassination-mission.js';
import {createAssassinationSiteView} from '../Games/Capital Drive/assassination-site-view.js';

// Actual factory calls and controller registration order. Three geometry runs
// without a renderer: this is static collider integration, not a WebGL receipt.
// Call once on a fresh source fixture; it deliberately adds the live barriers.
export function addCapitalWorldObstacles(map,terrain){
  const scene=new THREE.Scene(),views=[],counts={source:map.barriers.length};
  const add=(name,barriers,simulation=null)=>{
    counts[name]=barriers.length;
    for(const barrier of barriers){
      assert(barrier.points?.length>=3,`${name} barrier polygon`);
      assert(barrier.points.every(p=>p.length===2&&p.every(Number.isFinite)),`${name} finite collider`);
    }
    map.barriers.push(...barriers);simulation?.registerStaticBarriers(barriers);
  };
  let simulation;
  try{
    const civic=createCivicView(scene,map,terrain.heightAt,{roadHeightAt:terrain.roadHeightAt});views.push(civic);
    const noodle=createNoodleShopView(scene,terrain.heightAt);views.push(noodle);
    const campus=createCampusView(scene,map,terrain.heightAt);views.push(campus);
    const local=createLocalDetailsView(scene,map,terrain.heightAt);views.push(local);
    const amenities=createParkAmenitiesView(scene,{entries:PARK_AMENITIES,heightAt:terrain.heightAt});views.push(amenities);
    add('parkAmenities',amenities.obstacles);
    add('campus',campus.obstacles||[]);add('localDetails',local.obstacles||[]);
    add('civic',civic.barriers||[]);add('noodleFurniture',noodle.obstacles||[]);
    const neighbourhood=createNeighbourhoodDetails(scene,map,terrain.heightAt,{lowGraphics:true,streaming:true});views.push(neighbourhood);
    add('backyards',neighbourhood.backyardBarriers||[]);
    map.interiorEntries=neighbourhood.entries;
    counts.renderedDoorDescriptors=neighbourhood.entries.length;
    simulation=createSimulation(map,{trafficCount:0,isOnBridge:terrain.isOnBridge,groundHeightAt:terrain.groundHeightAt,vehicleHeightAt:terrain.vehicleHeightAt,preserveVehicleSupport:true});
    const stations=createNitroStations(FUEL_STATIONS,simulation);
    const petrol=buildPetrolForecourts(stations,FUEL_STATIONS,simulation,terrain.heightAt,map.buildings);
    const rentals=buildRentalStorefronts(simulation,terrain.heightAt);
    add('petrol',petrol.barriers,simulation);add('rentalStorefronts',rentals.barriers,simulation);
    const police=createPoliceStations(map,simulation,terrain.heightAt);add('policePosts',police.barriers,simulation);
    // Boot adds the selected public police places before the later site planners.
    map.searchPlaces.push(...police.sites.map(site=>site.place));
    const heists=buildHeistSites(map,simulation,terrain.heightAt);add('heistSites',heists.barriers,simulation);
    const chapter=createAssassinationChapter(map,{
      canStand:pose=>!simulation.moveActor({...pose},0,0,.45).blocked,
      hasLineOfSight:simulation.hasLineOfSight,nearestRoad:simulation.nearestRoad,
      canTraverse:(from,to,radius)=>!simulation.moveActor({...from},to.x-from.x,to.z-from.z,radius).blocked,
    });
    const assassination=createAssassinationSiteView(scene,chapter?.compound,terrain.heightAt);views.push(assassination);
    add('assassination',assassination.barriers,simulation);
    counts.total=map.barriers.length;counts.added=counts.total-counts.source;
    return {simulation,counts,exclusions:[
      'No renderer or native input; optional canvas sign art is absent in Node and has no barrier authority.',
      'No moving/parked vehicles, people, rail vehicles, foliage or destructible state transitions.',
      'No full world mesh construction; this helper covers every barrier-producing factory registered in the boot sequence, not visual triangle occlusion.',
      'Stunt/skyline dynamic support and specialized water exemptions remain outside static road clearance.',
    ]};
  }finally{for(const view of views.reverse())view.dispose();}
}
