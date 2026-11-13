// Fictional activities beside mapped streets. These names do not identify real businesses.
const service = value => Object.freeze({radius:8,...value});
export const SERVICES=Object.freeze([
  service({id:'crescent-kiosk',name:'Crescent kiosk',type:'food',x:-353.24,z:-419.66,road:'New South Wales Crescent',price:35,heal:35,robbery:180}),
  service({id:'manuka-store',name:'Manuka corner store',type:'food',x:-378.23,z:217.66,road:'Franklin Street',price:35,heal:35,robbery:350}),
  service({id:'kingston-gym',name:'Kingston gym',type:'gym',x:607.24,z:39.78,road:'Kennedy Street',price:120}),
  service({id:'canalside-supplies',name:'Canalside supplies',type:'arms',x:567.32,z:-634.87,road:'Wentworth Avenue',price:450,ammoPrice:60}),
]);
export const nearestService=pose=>SERVICES.reduce((best,item)=>!best||Math.hypot(item.x-pose.x,item.z-pose.z)<Math.hypot(best.x-pose.x,best.z-pose.z)?item:best,null);
