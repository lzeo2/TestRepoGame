// Original arcade weapon balance; no real firearm models or specifications.
export const WEAPONS=Object.freeze([
  {id:'pistol',name:'Pistol',key:'2',price:450,ammoPrice:60,ammoPack:24,starterAmmo:24,magazine:12,reserveCap:240,reload:1.4,interval:.28,range:40,aimRange:65,damage:55,policeDamage:45,pellets:1,spread:0,recoil:.34},
  {id:'shotgun',name:'Pump shotgun',key:'3',price:900,ammoPrice:90,ammoPack:12,starterAmmo:12,magazine:6,reserveCap:48,reload:2.3,interval:.85,range:24,aimRange:32,damage:22,policeDamage:18,pellets:6,spread:.16,recoil:.66},
  {id:'smg',name:'Compact SMG',key:'4',price:1600,ammoPrice:140,ammoPack:60,starterAmmo:60,magazine:30,reserveCap:180,reload:1.8,interval:.09,range:38,aimRange:50,damage:24,policeDamage:22,pellets:1,spread:.055,recoil:.16},
  {id:'carbine',name:'Patrol carbine',key:'5',price:2800,ammoPrice:180,ammoPack:48,starterAmmo:48,magazine:24,reserveCap:144,reload:2,interval:.16,range:75,aimRange:95,damage:42,policeDamage:36,pellets:1,spread:.018,recoil:.25},
  {id:'sniper',name:'Sniper rifle',key:'6',price:5400,ammoPrice:280,ammoPack:8,starterAmmo:8,magazine:4,reserveCap:32,reload:2.6,interval:1.05,range:85,aimRange:190,damage:110,policeDamage:95,pellets:1,spread:0,recoil:.72},
  {id:'rpg',name:'RPG launcher',key:'7',price:12000,ammoPrice:480,ammoPack:3,starterAmmo:3,magazine:1,reserveCap:12,reload:2.8,interval:1.2,range:75,aimRange:100,damage:0,policeDamage:0,pellets:1,spread:0,recoil:.95,projectile:'rocket'},
].map(Object.freeze));
export const WEAPON_IDS=Object.freeze(WEAPONS.map(weapon=>weapon.id));
export const weaponById=id=>WEAPONS.find(weapon=>weapon.id===id)||null;
export const optionalWeaponPool=id=>id==='sniper'||id==='rpg';

// Old v1 saves always contain the original four pools. New weapon pools start empty.
export function normalizeAmmoInventory(value){
  const record=pool=>pool&&typeof pool==='object'&&!Array.isArray(pool);
  if(!record(value)||Reflect.ownKeys(value).some(id=>!WEAPON_IDS.includes(id)))return null;
  const result={};
  for(const weapon of WEAPONS){
    const previous=Object.getOwnPropertyDescriptor(value,weapon.id);
    if(!previous&&optionalWeaponPool(weapon.id)){result[weapon.id]={ammo:0,reserveAmmo:0};continue;}
    const pool=previous?.enumerable?previous.value:null;
    if(!record(pool)||Reflect.ownKeys(pool).length!==2)return null;
    const loaded=Object.getOwnPropertyDescriptor(pool,'ammo'),reserve=Object.getOwnPropertyDescriptor(pool,'reserveAmmo');
    const ammo=loaded?.enumerable?loaded.value:null,reserveAmmo=reserve?.enumerable?reserve.value:null;
    if(!Number.isSafeInteger(ammo)||ammo<0||ammo>weapon.magazine||!Number.isSafeInteger(reserveAmmo)||reserveAmmo<0||reserveAmmo>weapon.reserveCap)return null;
    result[weapon.id]={ammo,reserveAmmo};
  }
  return result;
}
