// Explicit prior-wealth/equipment/checkpoint setup, never earned native progress.
import { createCampaignFixture } from './capital-campaign-fixture.mjs';
import { createProgression } from '../Games/Capital Drive/progression.js';
import { createCampaign } from '../Games/Capital Drive/campaign.js';
import { createProtagonistState } from '../Games/Capital Drive/protagonist-state.js';
import { WEAPON_IDS } from '../Games/Capital Drive/weapons.js';
import { CIVIC_INTERIOR_ENTRIES } from '../Games/Capital Drive/civic-view.js';
import { createInteriorNavigation } from '../Games/Capital Drive/interior-navigation.js';

const scenario=process.argv[2]||'city';
if(!['city','workplace','burglary'].includes(scenario))throw new Error('Unknown city fixture scenario.');
const fixture=await createCampaignFixture(),{map,interiors,simulation,stores}=fixture;
const homes=interiors.entries.filter(entry=>entry.type==='house');
const progression=createProgression(map,null,{homes});
const home=progression.propertyOffers[0];if(!home)throw new Error('No actual property offer.');
const homeEntry=interiors.entries.find(entry=>entry.id===home.id);
const workplace=CIVIC_INTERIOR_ENTRIES[0],noodles=stores.find(store=>store.id==='store-5656111023');
if(!homeEntry||!workplace||!noodles?.frontage)throw new Error('Missing source entry.');
const hero=scenario==='workplace'?'corporate':'student',door=scenario==='workplace'?workplace:homeEntry;
const outside=(entry,distance)=>({x:entry.x-Math.sin(entry.yaw)*distance,z:entry.z-Math.cos(entry.yaw)*distance,yaw:entry.yaw+Math.PI});
const actor=outside(door,4),ammunition=Object.fromEntries(WEAPON_IDS.map(id=>[id,{ammo:id==='pistol'?12:0,reserveAmmo:id==='pistol'?60:0}]));
progression.state.cash=100000;
Object.assign(progression.state.gear,{drone:true,grenades:1});progression.state.equipment.pistol=true;
const campaign={version:2,character:hero,intros:{student:[],corporate:scenario==='workplace'?['corporate-present-tense']:[],basement:[]},meeting:false,legacy:false,completed:[]};
const protagonists={version:1,student:null,corporate:null,basement:null};
protagonists[hero]={mode:'foot',actor,vehicle:{x:map.spawn.x,z:map.spawn.z,yaw:map.spawn.yaw||0,modelId:'lantern',color:'#e7e6df',health:100,stolen:false},
  health:100,weapon:scenario==='city'?'pistol':'unarmed',ammunition};
const career={...progression.serialize(),campaign,protagonists};
// Reject a malformed fixture through the actual normal save readers.
const {campaign:campaignSave,protagonists:heroSave,...careerSave}=career;
createProgression(map,careerSave,{homes});
createCampaign(map,campaignSave,fixture.campaignOptions);
createProtagonistState(heroSave,{bounds:map.bounds});
const waypoints=[];
if(scenario==='workplace'){
  // Source Bunda vertices, on the same public-facing side as the Centre door.
  const points=map.roads.filter(road=>road.name==='Bunda Street').flatMap(road=>road.points.map((p,i)=>{
    const a=road.points[Math.max(0,i-1)],b=road.points[Math.min(road.points.length-1,i+1)],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz)||1;
    const sign=dz>=0?1:-1;return {x:p[0]+sign*dz/length*7,z:p[1]-sign*dx/length*7};
  })).filter(p=>p.z<actor.z-8&&p.z>noodles.publicApproach.z+8).sort((a,b)=>b.z-a.z);
  for(const p of points)if(!waypoints.length||Math.hypot(p.x-waypoints.at(-1).x,p.z-waypoints.at(-1).z)>3)waypoints.push(p);
  waypoints.push({...noodles.publicApproach});
}
let burglaryPlan=null;
if(scenario==='burglary'){
  const probe=outside(homeEntry,2),plan=interiors.enter(homeEntry,probe);
  if(!plan)throw new Error('Source house planning entry failed.');
  const station=plan.activities.find(s=>s.id===`${plan.id}-valuables`&&s.kind==='stock');
  if(!station)throw new Error('Source house has no actual valuables station.');
  const nav=createInteriorNavigation(plan);
  const route=(from,to)=>{
    const pose={...from},points=[];
    for(let i=0;i<100&&Math.hypot(pose.x-to.x,pose.z-to.z)>.25;i++){
      const next=nav.nextWaypoint(pose,to,'native-burglary-fixture');
      if(!next)throw new Error('Source house station/exit route is blocked.');
      const before={...pose};nav.moveActor(pose,next.x-pose.x,next.z-pose.z,.45);
      if(Math.hypot(pose.x-before.x,pose.z-before.z)<.01)throw new Error('Source house navigation made no progress.');
      points.push({x:pose.x,z:pose.z});
    }
    if(Math.hypot(pose.x-to.x,pose.z-to.z)>.25)throw new Error('Source house waypoint budget exhausted.');
    return points;
  };
  burglaryPlan={roomId:plan.id,station,spawn:plan.spawn,exit:plan.exit,toStation:route(plan.spawn,station),toExit:route(station,plan.exit),navigation:nav.stats};
  interiors.leave(probe);
}
const sourceClearance=[];let previous={...actor};
for(const target of waypoints){const probe={...previous},result=simulation.moveActor(probe,target.x-probe.x,target.z-probe.z,.45);
  sourceClearance.push({from:previous,target,blocked:result.blocked,endpoint:{x:probe.x,z:probe.z}});previous={...target};}
console.log(JSON.stringify({scenario,hero,career,home:homeEntry,properties:progression.propertyOffers,crewOffers:progression.crewOffers,
  initialActor:actor,door,burglaryPlan,noodles: {id:noodles.id,name:noodles.name,frontage:noodles.frontage,publicApproach:noodles.publicApproach},waypoints,sourceClearance,
  provenance:'FAKE prior wealth, equipment and exterior checkpoint are accepted source-built setup, not earned progress. No property ownership or stash is seeded. Workplace additionally seeds only Rowan first intro completion.',
  limits:fixture.limits}));
