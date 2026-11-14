// Original arcade weapon balance; no real firearm models or specifications.
export const WEAPONS=Object.freeze([
  {id:'pistol',name:'Pistol',key:'2',price:450,ammoPrice:60,ammoPack:24,starterAmmo:24,magazine:12,reserveCap:240,reload:1.4,interval:.28,range:40,aimRange:65,damage:55,policeDamage:45,pellets:1,spread:0},
  {id:'shotgun',name:'Pump shotgun',key:'3',price:900,ammoPrice:90,ammoPack:12,starterAmmo:12,magazine:6,reserveCap:48,reload:2.3,interval:.85,range:24,aimRange:32,damage:22,policeDamage:18,pellets:6,spread:.16},
  {id:'smg',name:'Compact SMG',key:'4',price:1600,ammoPrice:140,ammoPack:60,starterAmmo:60,magazine:30,reserveCap:180,reload:1.8,interval:.09,range:38,aimRange:50,damage:24,policeDamage:22,pellets:1,spread:.055},
  {id:'carbine',name:'Patrol carbine',key:'5',price:2800,ammoPrice:180,ammoPack:48,starterAmmo:48,magazine:24,reserveCap:144,reload:2,interval:.16,range:75,aimRange:95,damage:42,policeDamage:36,pellets:1,spread:.018},
].map(Object.freeze));
export const WEAPON_IDS=Object.freeze(WEAPONS.map(weapon=>weapon.id));
export const weaponById=id=>WEAPONS.find(weapon=>weapon.id===id)||null;
