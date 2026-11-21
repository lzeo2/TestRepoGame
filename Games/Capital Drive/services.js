import {EXTRA_STORES} from './civic-extras.js';
import {MAPPED_STORES,LEGACY_SHOP_IDS} from './stores.js';
import {GYM_SITES} from './street-assets.js';
export {LEGACY_SHOP_IDS};
// Businesses use source locations with original parody names. Gym/arms activities are fictional.
export const GENERIC_SERVICES=Object.freeze([
  Object.freeze({id:'kingston-gym',name:'Kingston gym',type:'gym',x:607.24,z:39.78,radius:8,road:'Kennedy Street',price:120}),
  Object.freeze({id:'canalside-supplies',name:'Canalside supplies',type:'arms',x:567.32,z:-634.87,radius:8,road:'Wentworth Avenue',price:450,ammoPrice:60}),
]);
// Source points locate fitness centres, not observed doors or operating status.
// Interior equipment, prices and parody names are original game fiction.
const GYM_NAMES=Object.freeze({
  'gym-1811932828':'Fitness Eventually',
  'gym-12548497015':'Hybrid Patience',
  'gym-12859619300':'Occasional Fitness',
});
export const SOURCE_GYM_SERVICES=Object.freeze(GYM_SITES.filter(site=>Object.hasOwn(GYM_NAMES,site.id)).map(site=>Object.freeze({
  id:site.id,name:GYM_NAMES[site.id],type:'gym',x:site.x,z:site.z,radius:8,road:'Mapped fitness approach',price:120,
  source:site.source,sourceName:site.sourceName,sourceTags:site.sourceTags,sourcePolygon:site.sourcePolygon,
  buildingId:site.buildingMatches[0].id,sourceBuildingIds:Object.freeze(site.buildingMatches.map(building=>building.id)),
  accessNote:site.accessNote,
})));
export const SERVICES=Object.freeze([...MAPPED_STORES,...EXTRA_STORES,...GENERIC_SERVICES,...SOURCE_GYM_SERVICES]);
export const nearestService=pose=>SERVICES.reduce((best,item)=>!best||Math.hypot(item.x-pose.x,item.z-pose.z)<Math.hypot(best.x-pose.x,best.z-pose.z)?item:best,null);
