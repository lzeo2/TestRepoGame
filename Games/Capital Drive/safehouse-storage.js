import {WEAPON_IDS,weaponById,optionalWeaponPool} from './weapons.js';
export const STASH_CASH_CAP=1000000000;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const amount=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export const emptyStash=()=>({weapons:[],ammo:Object.fromEntries(WEAPON_IDS.map(id=>[id,0])),cash:0});
export function validStash(value){
  return object(value)&&Object.keys(value).length===3&&Array.isArray(value.weapons)&&value.weapons.length<=WEAPON_IDS.length&&new Set(value.weapons).size===value.weapons.length&&value.weapons.every(id=>WEAPON_IDS.includes(id))&&object(value.ammo)&&
    Reflect.ownKeys(value.ammo).every(id=>WEAPON_IDS.includes(id))&&WEAPON_IDS.every(id=>{
      if(!Object.hasOwn(value.ammo,id))return optionalWeaponPool(id);
      const profile=weaponById(id);return amount(value.ammo[id],profile.reserveCap+profile.magazine);
    })&&amount(value.cash,STASH_CASH_CAP);
}
// Inventory callbacks are synchronous atomic transactions: false must leave inventory unchanged.
export function transferStash(stash,action,kind,id,count,inventory){
  if(!validStash(stash)||!['deposit','withdraw'].includes(action)||!['weapon','ammo'].includes(kind)||!WEAPON_IDS.includes(id)||!Number.isSafeInteger(count)||count<1)return false;
  const take=action==='deposit',profile=weaponById(id),cap=profile.reserveCap+profile.magazine;
  let snapshot;
  try{snapshot=inventory?.getInventory?.();}catch{return false;}
  if(!object(snapshot)||!object(snapshot.equipment)||!object(snapshot.ammunition))return false;
  const owned=snapshot.equipment[id]===true,ammo=snapshot.ammunition[id];
  if(!object(ammo)||!amount(ammo.ammo,profile.magazine)||!amount(ammo.reserveAmmo,profile.reserveCap))return false;
  if(kind==='weapon'){
    if(count!==1||(take?!owned||stash.weapons.includes(id):owned||!stash.weapons.includes(id)))return false;
  }else if(take?count>ammo.ammo+ammo.reserveAmmo||(stash.ammo[id]??0)>cap-count:!owned||count>(stash.ammo[id]??0)||ammo.ammo+ammo.reserveAmmo>cap-count)return false;
  const callback=take?inventory.takeInventory:inventory.giveInventory;
  if(typeof callback!=='function')return false;
  let success=false;
  try{success=callback({kind,weaponId:id,...(kind==='ammo'?{amount:count}:{})})===true;}catch{return false;}
  if(!success)return false;
  if(kind==='weapon'){if(take)stash.weapons.push(id);else stash.weapons.splice(stash.weapons.indexOf(id),1);}
  else stash.ammo[id]=(stash.ammo[id]??0)+(take?count:-count);
  return true;
}
