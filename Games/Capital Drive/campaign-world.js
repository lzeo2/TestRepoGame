import {CAMPAIGN_AIRCRAFT_IDS} from './aircraft.js';
import {POLICE_POST_IDS,POLICE_POST_MAX_HEALTH} from './police-stations.js';

const VERSION=1;
const ownRecord=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&
  (Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null);
const validHealth=health=>Number.isFinite(health)&&health>=0&&health<=POLICE_POST_MAX_HEALTH;

function restoreState(saved){
  if(saved===undefined)return {absentAircraft:[],policePosts:{}};
  if(!ownRecord(saved)||Object.keys(saved).length!==3||saved.version!==VERSION||!Array.isArray(saved.absentAircraft)||
    !ownRecord(saved.policePosts)||saved.absentAircraft.length>CAMPAIGN_AIRCRAFT_IDS.length||
    new Set(saved.absentAircraft).size!==saved.absentAircraft.length||
    [...saved.absentAircraft].some(id=>!CAMPAIGN_AIRCRAFT_IDS.includes(id))||
    Object.entries(saved.policePosts).some(([id,health])=>!POLICE_POST_IDS.includes(id)||!validHealth(health)))
    throw new Error('Invalid saved campaign world.');
  return {absentAircraft:CAMPAIGN_AIRCRAFT_IDS.filter(id=>saved.absentAircraft.includes(id)),
    policePosts:Object.fromEntries(POLICE_POST_IDS.filter(id=>Object.hasOwn(saved.policePosts,id)&&saved.policePosts[id]<POLICE_POST_MAX_HEALTH)
      .map(id=>[id,saved.policePosts[id]]))};
}

// The controller commits this ledger only for Campaign play. Active flight,
// ordinary traffic, and runtime timers belong to the live world, not the save.
export function createCampaignWorld(saved){
  let state=restoreState(saved);
  function snapshot(){
    return Object.freeze({version:VERSION,absentAircraft:Object.freeze([...state.absentAircraft]),
      policePosts:Object.freeze({...state.policePosts})});
  }
  function recordAircraftTheft(event){
    if(event?.type!=='stolen'||event.sandbox!==false||!CAMPAIGN_AIRCRAFT_IDS.includes(event.id)||state.absentAircraft.includes(event.id))return false;
    state.absentAircraft=CAMPAIGN_AIRCRAFT_IDS.filter(id=>id===event.id||state.absentAircraft.includes(id));
    return true;
  }
  function recordPolicePosts(posts){
    if(!Array.isArray(posts)||posts.length>POLICE_POST_IDS.length)return false;
    const seen=new Set(),healths={...state.policePosts};
    for(const post of posts){
      if(!POLICE_POST_IDS.includes(post?.id)||seen.has(post.id)||!validHealth(post.health))return false;
      seen.add(post.id);
      if(post.health===POLICE_POST_MAX_HEALTH)delete healths[post.id];
      else healths[post.id]=post.health;
    }
    const changed=POLICE_POST_IDS.some(id=>healths[id]!==state.policePosts[id]);
    if(changed)state.policePosts=healths;
    return changed;
  }
  return {snapshot,recordAircraftTheft,recordPolicePosts,restore(savedWorld){state=restoreState(savedWorld);}};
}
