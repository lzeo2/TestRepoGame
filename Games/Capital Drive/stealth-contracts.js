import {roadProfile} from './road-network.js';

const sites = Object.freeze([
  {
    id:'ledger-switch', name:'Ledger Switch', district:'manuka', location:'Manuka paperwork set',
    briefing:'A fictional broker is passing altered accounts through a pop-up desk. Copy the ledger and leave with the evidence.',
    outro:'The real and altered accounts are safely in the same file.', reward:1100,
    approaches:[
      {id:'quiet',name:'Quiet route',description:'Scout from a crouch, retrieve a blank ledger sleeve, then copy the ledger at the side desk.',
        actions:[['scout',0,'Hold X and press E to scout the side desk'],['handoff',2,'Press E to pick up the blank ledger sleeve'],
          ['evidence',4,'Press E to copy the ledger at the side desk']]},
      {id:'visitor',name:'Visitor pass',description:'Pick up a visitor pass and clear it at the sign-in desk before copying the ledger.',
        actions:[['cover',1,'Press E to pick up the visitor pass','visitor'],['handoff',3,'Press E to sign in at the visitor desk','visitor'],
          ['evidence',5,'Press E to copy the ledger at the visitor station','visitor']]},
    ],
  },
  {
    id:'echo-box', name:'Echo Box', district:'foreshore', location:'Foreshore signal workshop',
    briefing:'Recover the rehearsal recording from a fictional workshop. Either use its quiet service relay or collect its marked technician badge.',
    outro:'The recording is out and the rehearsal relay has reset.', reward:1450,
    approaches:[
      {id:'relay',name:'Service relay',description:'Scout the access marker, switch the training signal, then collect the recording.',
        actions:[['scout',0,'Hold X and press E to observe the relay'],['divert',2,'Press E to switch the workshop’s training signal'],
          ['evidence',4,'Press E to copy the recording from the relay box']]},
      {id:'badge',name:'Technician badge',description:'Collect the work badge and switch the alternate relay beside its recording desk.',
        actions:[['cover',1,'Press E to pick up the technician badge','technician'],['divert',3,'Press E to switch the alternate relay','technician'],
          ['evidence',5,'Press E to copy the recording at the technician desk','technician']]},
    ],
  },
  {
    id:'silent-exchange', name:'Silent Exchange', district:'canberra-centre', location:'Civic collector set',
    briefing:'Two staged drop desks look alike. Locate the marked collector, retrieve the sealed case and complete the quiet exchange.',
    outro:'The sealed case changed hands at the correct desk.', reward:1500,
    approaches:[
      {id:'observer',name:'Observer',description:'Identify the real drop under cover, collect the case and make the marked exchange.',
        actions:[['scout',0,'Hold X and press E to verify the collector marker'],['evidence',2,'Press E to pick up the staged evidence case'],
          ['handoff',4,'Press E to hand the case to the marked collector']]},
      {id:'courier',name:'Courier pass',description:'Take the courier pass for access to a different case and handover desk.',
        actions:[['cover',1,'Press E to take the courier pass','courier'],['evidence',3,'Press E to pick up the courier’s sealed case','courier'],
          ['handoff',5,'Press E to hand the case through the courier slot','courier']]},
    ],
  },
  {
    id:'after-last-bell', name:'Last Light Rehearsal', district:'redhill', location:'Red Hill rehearsal set',
    briefing:'Reset the rogue stunt dummy on a fictional closed set. Choose a diversion or take the stagehand pass to the alternate controls.',
    outro:'The stunt dummy is safely reset and the set is clear.', reward:1750,
    approaches:[
      {id:'decoy',name:'Rehearsal diversion',description:'Scout the closed set, start the prop diversion and crouch at the dummy reset.',
        actions:[['scout',0,'Hold X and press E to inspect the rehearsal marker'],['divert',2,'Press E to run the prop diversion'],
          ['disarm',4,'Hold X and press E to reset the stunt dummy']]},
      {id:'crew',name:'Stagehand pass',description:'Collect the stagehand pass, clear the rehearsal marker, and use the alternate dummy reset.',
        actions:[['cover',1,'Press E to pick up the stagehand pass','stagehand'],['handoff',3,'Press E to clear the alternate rehearsal marker','stagehand'],
          ['disarm',5,'Hold X and press E to reset the alternate stunt dummy','stagehand']]},
    ],
  },
  {
    id:'glasshouse-double', name:'Glasshouse Double', district:'kingston', location:'Kingston film set',
    targetName:'Double Seven',
    briefing:'Take Double Seven, a fictional screen antagonist played by a stunt rig, out of the scene. Use a quiet takedown cue or score an upright tag with a crew badge.',
    outro:'Double Seven is out of the scene. The film crew can reset the take.', reward:1950,
    approaches:[
      {id:'quiet-take',name:'Quiet take',description:'Check the scene from a crouch, run the prop cue, and score the close takedown while crouched.',
        actions:[['scout',0,'Hold X and press E to check the set'],['divert',2,'Press E to run the prop cue'],
          ['drop-target',4,'Hold X and press E to score the Double Seven takedown']]},
      {id:'crew-mark',name:'Crew mark',description:'Pick up a crew badge, check the scene board, and score a standing target tag at the alternate mark.',
        actions:[['cover',1,'Press E to take the crew badge','crew-mark'],['evidence',3,'Press E to check the rehearsal board','crew-mark'],
          ['tag-target',5,'Stand and press E at the Double Seven tag marker','crew-mark']]},
    ],
  },
  {
    id:'false-courier', name:'The False Courier', district:'griffith', location:'Griffith stunt course',
    targetName:'The False Courier',
    briefing:'A costumed dummy on a closed stunt course carries the prize prop. Score a target action first, collect the case, and leave through your chosen pickup.',
    outro:'The courier scene is complete and the prize case is back with the crew.', reward:2150,
    approaches:[
      {id:'spotter',name:'Spotter route',description:'Identify the marked prop from a crouch, stand to score the courier tag, then collect its case.',
        actions:[['scout',0,'Hold X and press E to identify the marked courier'],['tag-target',2,'Stand and press E to score the courier tag'],
          ['handoff',4,'Press E to collect the prize case']]},
      {id:'costume-pass',name:'Costume pass',description:'Pick up a wardrobe pass, reach the alternate dummy for a crouched takedown, then collect the marked wardrobe case.',
        actions:[['cover',1,'Press E to take the wardrobe pass','wardrobe'],['drop-target',3,'Hold X and press E to score the courier takedown','wardrobe'],
          ['handoff',5,'Press E to collect the wardrobe case','wardrobe']]},
    ],
  },
  {
    id:'replica-relay', name:'Replica Relay', district:'australian-war-memorial', location:'Memorial replica crew lot',
    briefing:'The crew has built a duplicate exhibit case for a private rehearsal. Identify the correct replica and get it to the pickup before the rehearsal ends.',
    outro:'The replica reached the pickup. The crew can close out the rehearsal.', reward:2250,
    approaches:[
      {id:'spotter',name:'Spotter route',description:'Check the mock lot, match the display tag and collect the replica case.',
        actions:[['scout',0,'Hold X and press E to check the rehearsal lot'],['evidence',2,'Press E to match the replica tag'],
          ['handoff',4,'Press E to collect the replica case']]},
      {id:'exhibit-crew',name:'Exhibit crew',description:'Pick up the crew pass, copy the dispatch slip and collect the alternate replica case.',
        actions:[['cover',1,'Press E to collect the exhibit crew pass','exhibit-crew'],['evidence',3,'Press E to copy the dispatch slip','exhibit-crew'],
          ['handoff',5,'Press E to collect the alternate replica case','exhibit-crew']]},
    ],
  },
]);

export const STEALTH_CONTRACT_IDS = Object.freeze(sites.map(site=>site.id));
const VISUALS = Object.freeze({scout:'scope',cover:'credential',evidence:'ledger',divert:'relay',handoff:'case',disarm:'dummy',
  'drop-target':'dummy','tag-target':'dummy',extract:'exit'});
const FEEDBACK = Object.freeze({scout:'Location checked.',cover:'Pass collected.',evidence:'Evidence secured.',
  divert:'Rehearsal signal changed.',handoff:'Exchange confirmed.',disarm:'Stunt dummy reset.',
  'drop-target':'Stunt takedown scored.', 'tag-target':'Target tagged.',extract:'Extraction confirmed.'});
const STREET = new Set(['residential','living_street','unclassified','secondary','tertiary','service','pedestrian']);
const finite = p => p && Number.isFinite(p.x) && Number.isFinite(p.z);
const distance = (a,b) => Math.hypot(a.x-b.x,a.z-b.z);
const deny = message=>({ok:false,message});

// Props are original mission fiction beside mapped roads. Each point must have
// clear foot clearance and sight from its approach before publishing a route.
function findPoints(map,anchor,canStand,hasLineOfSight,nearestRoad) {
  const candidates=[];
  for(const road of map.roads||[]){
    if(!road.name||!STREET.has(road.type)||road.bridge||road.tunnel)continue;
    const edge=roadProfile(road).driveWidth/2+4;
    for(let i=1;i<road.points.length;i++){
      const a=road.points[i-1],b=road.points[i],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
      if(length<12||Math.max(a[0],b[0])<anchor.x-200||Math.min(a[0],b[0])>anchor.x+200||
        Math.max(a[1],b[1])<anchor.z-200||Math.min(a[1],b[1])>anchor.z+200)continue;
      const nx=-dz/length,nz=dx/length,yaw=Math.atan2(-dx,-dz);
      for(const t of [.25,.55,.8]){
        const approach={x:a[0]+dx*t,z:a[1]+dz*t,yaw};
        for(const side of [-1,1]){
          const p={x:approach.x+nx*edge*side,z:approach.z+nz*edge*side,yaw,road:road.name};
          const gap=distance(anchor,p);
          if(gap<185)candidates.push({p,approach,gap});
        }
      }
    }
  }
  candidates.sort((a,b)=>a.gap-b.gap||a.p.x-b.p.x||a.p.z-b.p.z);
  const points=[];
  for(const {p,approach} of candidates){
    if(points.some(other=>distance(p,other)<18)||!canStand(p)||!hasLineOfSight(approach,p))continue;
    const nearby=nearestRoad?.(p.x,p.z);
    if(nearby&&nearby.distance<roadProfile(nearby.road).driveWidth/2+2)continue;
    if(![-.62,.62].every(side=>canStand({...p,x:p.x+Math.cos(p.yaw)*side,z:p.z-Math.sin(p.yaw)*side})))continue;
    points.push(p);
    if(points.length===8)break;
  }
  return points;
}

function stage(id,site,p,action,label,credential) {
  const target = action==='drop-target'||action==='tag-target';
  return Object.freeze({id,kind:'stealth-contract',action,label,location:site.location,x:p.x,z:p.z,yaw:p.yaw,
    radius:action==='extract'?3.5:2.7,hold:0,visual:VISUALS[action],crouch:action==='scout'||action==='disarm'||action==='drop-target',
    ...(target?{targetName:site.targetName,stand:action==='tag-target'}:{}),
    ...(credential?{cover:credential}:{})});
}

export function planStealthChapter(chapter,plan = {}) {
  if(!chapter?.stealth||!plan||typeof plan!=='object')return null;
  const {approachId=chapter.approaches[0]?.id,exitId=chapter.exits[0]?.id}=plan;
  const approach=chapter.approaches.find(item=>item.id===approachId),exit=chapter.exits.find(item=>item.id===exitId);
  if(!approach||!exit)return null;
  const extraction=stage(`${chapter.id}:extract:${exit.id}`,chapter,exit,'extract',`Press E to extract at ${exit.name}`);
  return Object.freeze({...chapter,stealthPlan:Object.freeze({approachId,exitId}),stages:Object.freeze([...approach.stages,extraction])});
}

export function createStealthContracts(map,{canStand=()=>false,hasLineOfSight=()=>false,nearestRoad}={}) {
  const chapters=[];
  for(const site of sites){
    const anchor=map?.landmarks?.find(place=>place.id===site.district);
    if(!finite(anchor))continue;
    const points=findPoints(map,anchor,canStand,hasLineOfSight,nearestRoad);
    if(points.length!==8)continue;
    const approaches=site.approaches.map(approach=>Object.freeze({id:approach.id,name:approach.name,description:approach.description,
      stages:Object.freeze(approach.actions.map(([action,point,label,credential],index)=>
        stage(`${site.id}:${approach.id}:${index}`,site,points[point],action,label,credential)))}));
    const exits=points.slice(6).map((p,index)=>Object.freeze({id:index?'side':'main',name:`${index?'Side':'Main'} pickup · ${p.road}`,x:p.x,z:p.z,yaw:p.yaw}));
    chapters.push(Object.freeze({id:site.id,name:site.name,location:site.location,briefing:site.briefing,outro:site.outro,
      reward:site.reward,time:600,optional:true,stealth:true,combat:false,approaches:Object.freeze(approaches),exits:Object.freeze(exits)}));
  }
  const attempts=new WeakMap(), retrySnapshots=new WeakMap();
  function retryObjective(active) {
    if(!active?.stealth||!Number.isInteger(active.stage)||active.stage<0||!active.target||
      typeof active.stealthPlan?.approachId!=='string'||typeof active.stealthPlan?.exitId!=='string')return null;
    const chapter=chapters.find(item=>item.id===active.id),planned=planStealthChapter(chapter,active.stealthPlan);
    const objective=planned?.stages[active.stage];
    return objective&&active.target.id===objective.id&&active.target.kind===objective.kind&&
      active.target.x===objective.x&&active.target.z===objective.z ? objective : null;
  }
  // Retry authority is opaque and local. Campaign owns attempt generation and rewards;
  // this owner restores only the private action cursor/credential at a stage boundary.
  function captureRetry(active) {
    const objective=retryObjective(active);
    if(!objective)return null;
    const progress=attempts.get(active)||(active.stage===0?{next:0,cover:null}:null);
    if(!progress||progress.next!==active.stage)return null;
    const token=Object.freeze({});
    retrySnapshots.set(token,{id:active.id,stage:active.stage,objectiveId:objective.id,
      approachId:active.stealthPlan.approachId,exitId:active.stealthPlan.exitId,
      next:progress.next,cover:progress.cover});
    return token;
  }
  function restoreRetry(active,token) {
    const saved=token&&typeof token==='object'?retrySnapshots.get(token):null;
    const objective=retryObjective(active);
    if(!saved||!objective||attempts.has(active)||active.id!==saved.id||active.stage!==saved.stage||objective.id!==saved.objectiveId||
      active.stealthPlan.approachId!==saved.approachId||active.stealthPlan.exitId!==saved.exitId)return false;
    attempts.set(active,{next:saved.next,cover:saved.cover});
    return true;
  }
  let serial=0;
  function resolve(active,context={}) {
    if(!active?.stealth||!Number.isInteger(active.stage)||!active.target)return deny('No contract objective is active.');
    const chapter=chapters.find(item=>item.id===active.id),planned=planStealthChapter(chapter,active.stealthPlan);
    const objective=planned?.stages[active.stage];
    if(!objective||active.target.kind!==objective.kind||active.target.id!==objective.id||active.target.x!==objective.x||active.target.z!==objective.z)
      return deny('Use the marked objective in your contract plan.');
    const {pose,onFoot,interior,paused,passenger,recovering,wanted,crouching,health}=context;
    if(!finite(pose)||onFoot!==true||interior||paused||passenger||recovering||
      health!==undefined&&(!Number.isFinite(health)||health<=0))return deny('Approach the marked objective on foot.');
    if(wanted!==0)return deny('Clear the police search before continuing.');
    if(distance(pose,objective)>objective.radius||context.visible===false||
      (typeof context.visible==='function'&&!context.visible(pose,objective))||!hasLineOfSight(pose,objective))
      return deny('Move into clear reach of the marked objective.');
    if(objective.crouch&&!crouching)return deny('Hold X to crouch, then press E.');
    if(objective.stand&&crouching)return deny('Stand up, then press E at the target marker.');
    const progress=attempts.get(active)||{next:0,cover:null};
    if(progress.next!==active.stage)return deny('This contract step is already processed or out of order.');
    if(objective.cover&&objective.action!=='cover'&&progress.cover!==objective.cover)return deny('Collect your planned cover pass first.');
    if(objective.action==='cover')progress.cover=objective.cover;
    progress.next++;
    attempts.set(active,progress);
    return {ok:true,message:FEEDBACK[objective.action],
      receipt:Object.freeze({id:active.id,stage:active.stage,serial:++serial})};
  }
  return {chapters:Object.freeze(chapters),resolve,captureRetry,restoreRetry};
}
