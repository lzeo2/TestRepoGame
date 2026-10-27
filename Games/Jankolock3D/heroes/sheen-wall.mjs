// Placement range 8 / wall lifetime 4 are independent of flight range 14 / lifetime 14/30.
export const SHEEN_WALL=Object.freeze({id:'sheenwall',name:'Sheen Wall',slot:1,cooldown:12,cooldownBand:'mid',range:8,windup:.25,duration:4,count:1,maxActive:1,width:7,height:3,depth:.3,health:650,layout:'line',placementRadius:0,spacing:0,blocks:'all_units_and_projectiles',damageType:'weapon',baseDamage:12,baseHeal:0,spiritScale:0,slow:0,radius:0,invulnerable:false,speedMultiplier:1,projectileCount:3,projectileSpeed:30,projectileRadius:.2,spreadDegrees:20,projectileRange:14,projectileDuration:14/30,maxHitsPerTarget:1,fireInterval:0,pattern:'fan'});
export const isSheenWall=a=>!!a&&Object.entries(SHEEN_WALL).every(([key,value])=>a[key]===value);
// Axis is the wall normal, unlike Keep Clear's corridor-length axis.
export function sheenWallBounds(origin,axis) {
  if(!origin||!['x','y','z'].every(k=>Number.isFinite(origin[k]))||!['x','z'].includes(axis))throw new TypeError('Invalid Sheen Wall geometry');
  const hx=(axis==='z'?SHEEN_WALL.width:SHEEN_WALL.depth)/2,hz=(axis==='x'?SHEEN_WALL.width:SHEEN_WALL.depth)/2;
  return Object.freeze({minX:origin.x-hx,maxX:origin.x+hx,minY:origin.y,maxY:origin.y+SHEEN_WALL.height,minZ:origin.z-hz,maxZ:origin.z+hz});
}
