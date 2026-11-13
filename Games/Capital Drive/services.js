import {MAPPED_STORES,LEGACY_SHOP_IDS} from './stores.js';
export {LEGACY_SHOP_IDS};
// Businesses use source locations with original parody names. Gym/arms activities are fictional.
export const GENERIC_SERVICES=Object.freeze([
  Object.freeze({id:'kingston-gym',name:'Kingston gym',type:'gym',x:607.24,z:39.78,radius:8,road:'Kennedy Street',price:120}),
  Object.freeze({id:'canalside-supplies',name:'Canalside supplies',type:'arms',x:567.32,z:-634.87,radius:8,road:'Wentworth Avenue',price:450,ammoPrice:60}),
]);
export const SERVICES=Object.freeze([...MAPPED_STORES,...GENERIC_SERVICES]);
export const nearestService=pose=>SERVICES.reduce((best,item)=>!best||Math.hypot(item.x-pose.x,item.z-pose.z)<Math.hypot(best.x-pose.x,best.z-pose.z)?item:best,null);
