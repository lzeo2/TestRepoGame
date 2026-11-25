import {clamp, distance, terrainHeight, isWater, emitEvent} from './core.js';

export function buildBattlefield(w) {
  const box = (kind,x,z,width,depth,h) => w.obstacles.push({kind,x,z,w:width,d:depth,y:terrainHeight(x,z),h});
  // Roads remain level with the authoritative terrain, not hidden collision decks.
  w.roads = [
    {kind:'road',width:16,points:[[-110,180],[-70,80],[100,-40],[130,-230],[80,-480]]},
    {kind:'road',width:18,points:[[-110,180],[-110,-100],[-220,-430],[-340,-620]]},
    {kind:'road',width:16,points:[[100,-40],[-110,-100],[-380,-240],[-650,-370],[-820,-800]]},
    {kind:'road',width:14,points:[[-110,180],[-420,150],[-600,-40],[-380,-240],[-220,-430]]},
    {kind:'road',width:12,points:[[100,-40],[150,80],[185,140]]},
    {kind:'runway',width:30,points:[[-165,340],[-165,-20]]},
    {kind:'runway',width:30,points:[[-340,-480],[-340,-820]]}
  ];
  w.surfaces.push({kind:'pier',x:220,z:140,w:70,d:18,y:3});
  // Bases, port warehouses, inland depot, relay mast, and distant hill forts.
  for (const b of [
    ['hangar',-215,245,44,58,16],['barracks',-60,215,30,22,9],
    ['hangar',-395,-660,42,62,16],['barracks',-270,-465,28,24,9],
    ['warehouse',145,-90,44,28,15],['warehouse',65,-110,36,24,12],
    ['warehouse',165,10,30,38,13],['crane',205,-35,5,5,38],
    // Visible harbor shelter, not spawn invulnerability; ships leave around the east end.
    ['breakwater',330,65,180,12,20],
    ['cover',125,-40,3,50,2.4], // Infantry shelter inside Harbor; north/south flanks stay open.
    ['relay',-145,-135,9,9,36],['depot',-435,-300,38,30,13],
    ['depot',-300,-290,28,24,10],['fort',-710,-400,28,28,22],
    ['fort',-880,470,32,32,30],['fort',-600,830,40,30,24]
  ]) box(...b);
  for (const [x,z] of [[55,20],[140,-10],[-70,-145],[-155,-65],[-340,-185],[-455,-225],[-490,50],[-550,-160],[-270,-350],[20,-300],[130,-390]]) {
    box('cover',x,z,12,3,2.4);
    box('crate',x+20,z+13,4,4,3);
  }
  w.objectives.push(...[
    ['harbor','HARBOR',100,-40],['relay','RELAY',-110,-100],['depot','DEPOT',-380,-240]
  ].map(([id,name,x,z]) => ({id,name,x,z,radius:45,owner:null,progress:0})));
}

// Weak keys keep reset state independent and do not retain expired event objects.
const accounting = new WeakMap();
export function updateObjectives(w,dt) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > .1) throw Error('dt must be in (0,.1]');
  if (w.winner !== null) return;
  let seen = accounting.get(w);
  if (!seen) accounting.set(w,seen = new WeakSet());
  for (const event of w.events) {
    if (event.type !== 'destroyed' || seen.has(event)) continue;
    seen.add(event);
    if (event.team === 0 || event.team === 1) w.tickets[event.team] = Math.max(0,w.tickets[event.team]-1);
  }
  for (const o of w.objectives) {
    const participants = [[],[]], previousOwner=o.owner;
    for (const e of w.entities) {
      if (!e.alive || e.seatId != null || (e.team !== 0 && e.team !== 1) || distance(e,o)>o.radius) continue;
      if (e.kind === 'jet' && (isWater(e.x,e.z) || Math.abs(e.y-terrainHeight(e.x,e.z))>1.5)) continue;
      participants[e.team].push(e.id);
    }
    const present=participants.map(ids=>ids.length>0);
    o.contested = present[0] && present[1];
    if (o.contested || (!present[0] && !present[1])) continue;
    const team = present[0] ? 0 : 1, sign = team === 0 ? 1 : -1;
    o.progress = clamp(o.progress + sign*dt/12,-1,1);
    if ((o.owner === 0 && o.progress<=0) || (o.owner === 1 && o.progress>=0)) o.owner=null;
    if (Math.abs(o.progress-sign)<1e-9 && o.owner!==team) {
      o.progress=sign;o.owner=team;w.stats.captures++;
    }
    if (o.owner!==previousOwner) emitEvent(w,{type:'capture',objectiveId:o.id,team,owner:o.owner,previousOwner,
      participantIds:participants[team],x:o.x,y:terrainHeight(o.x,o.z),z:o.z});
  }
  for (const o of w.objectives) if (o.owner!==null) w.tickets[1-o.owner]=Math.max(0,w.tickets[1-o.owner]-dt*.5);
  if (w.tickets[0]<=0 || w.tickets[1]<=0) w.winner=w.tickets[0]<=0 ? 1 : 0;
}
