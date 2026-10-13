// Browser-local adaptation of the owner's FootballParty progression/services.
// The renderer supplies location; this module alone owns coins and recruits.
export const SAVE_KEY = 'steal-footballer:v1';
export const STAFF = [
  {id:'attacking',role:'attack',name:'Attacking Coach',cost:1500},
  {id:'defending',role:'defence',name:'Defensive Coach',cost:1500},
  {id:'fitness',role:'physio',name:'Physio',cost:1000},
  {id:'guardiola',role:'tactics',name:'Pep Guardiola',cost:5000,specialPlay:'triangle'},
  {id:'ancelotti',role:'tactics',name:'Carlo Ancelotti',cost:5000,specialPlay:'counter'},
  {id:'klopp',role:'tactics',name:'Jurgen Klopp',cost:5000,specialPlay:'surge'},
  {id:'passing',role:'attack',name:'Passing Coach',cost:800},
  {id:'elite',role:'tactics',name:'Academy Manager',cost:5000,specialPlay:'counter'}
];
export const MUTATIONS = [
  {id:'ordinary',name:'Ordinary',weight:94,incomeBonus:0,powerBonus:0},
  {id:'golden',name:'Golden',weight:4,incomeBonus:.15,powerBonus:.02},
  {id:'frost',name:'Frost',weight:1.5,incomeBonus:.30,powerBonus:.03},
  {id:'volt',name:'Volt',weight:.45,incomeBonus:.50,powerBonus:.04},
  {id:'cosmic',name:'Cosmic',weight:.05,incomeBonus:.75,powerBonus:.05}
];
const TRAITS = [
  {id:'quickFeet',name:'Quick Feet',stat:'pace'}, {id:'clinical',name:'Clinical',stat:'attacking'},
  {id:'playmaker',name:'Playmaker',stat:'passing'}, {id:'ballWinner',name:'Ball Winner',stat:'defending'},
  {id:'safeHands',name:'Safe Hands',stat:'goalkeeping'}, {id:'engine',name:'Engine',stat:'stamina'}
];
const FORMATIONS = {
  '4-4-2':['GK','DF','DF','DF','DF','MF','MF','MF','MF','ST','ST'],
  '4-3-3':['GK','DF','DF','DF','DF','MF','MF','MF','ST','ST','ST'],
  '3-5-2':['GK','DF','DF','DF','MF','MF','MF','MF','MF','ST','ST']
};
const JOBS = {
  '4-4-2':['GK','LB','LCB','RCB','RB','LM','LCM','RCM','RM','ST Link','ST Depth'],
  '4-3-3':['GK','LB','LCB','RCB','RB','LCM','DM','RCM','LW','CF','RW'],
  '3-5-2':['GK','LCB','CB','RCB','LWB','LCM','DM','RCM','RWB','ST Link','ST Depth']
};
const PRESETS = [['Balanced','4-4-2','balanced'],['High Press','4-3-3','pressing'],['Counterattack','3-5-2','counter'],['Possession','3-5-2','balanced'],['Defensive','4-4-2','balanced']];
const EVENTS = [
  {key:'golden_goal',name:'Golden Goal',objective:'Win 1 completed squad battle',target:1,offer:'zidane',cost:15,mutation:'golden',offerMutation:'golden'},
  {key:'transfer_festival',name:'Transfer Festival',objective:'Deliver 3 footballers to your team',target:3,offer:'ronaldinho',cost:12,mutation:'frost',offerMutation:'frost'},
  {key:'training_camp',name:'Training Camp',objective:'Train your owned team for 90 seconds',target:90,offer:'beckham',cost:12,mutation:'volt',offerMutation:'volt'},
  {key:'mutation_rush',name:'Mutation Rush',objective:'Complete 1 squad battle',target:1,offer:'ronaldinho',cost:13,mutation:'all',offerMutation:'cosmic'}
];
const AXES = ['attacking','pace','passing','defending','stamina','goalkeeping'];
const STADIUMS = [
  {name:'Home Pitch',cost:0,recruits:0}, {name:'Training Ground',cost:1200,recruits:3},
  {name:'Club Stadium',cost:4500,recruits:6}, {name:'Floodlit Stadium',cost:12000,recruits:11}
];
const DEV_SQUAD = ['courtois','maldini','vandijk','saliba','rodri','maradona','messi','neymar','mbappe','r9','yamal_superstar','ronaldo','henry','barcola'];
const DEV_XI = ['courtois','maldini','vandijk','saliba','neymar','maradona','rodri','messi','yamal_superstar','mbappe','r9'];
const finite = n => typeof n === 'number' && Number.isFinite(n);
const bound = (n,lo,hi) => finite(n) ? Math.min(hi,Math.max(lo,n)) : lo;
const int = (n,lo,hi) => Math.floor(bound(n,lo,hi));
const object = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const clone = v => JSON.parse(JSON.stringify(v));
const rounded = n => Math.round(n*100)/100;
const fail = message => ({ok:false,message});
const formationExists = name => typeof name==='string' && Object.hasOwn(FORMATIONS,name);
function hash(s) { let value=200; for (const c of String(s)) value=(value*31+c.charCodeAt(0))%1000000; return value+1; }
function validKit(value) {
  const v=object(value);
  return typeof v.enabled==='boolean' && typeof v.name==='string' && new TextEncoder().encode(v.name).length<=20 && !/[\x00-\x1f\x7f]/.test(v.name)
    && ['solid','stripes','hoops'].includes(v.pattern) && ['primary','secondary','shorts'].every(k=>typeof v[k]==='string' && /^#[0-9a-f]{6}$/i.test(v[k]));
}
function defaultKit() { return {enabled:false,name:'MY TEAM',primary:'#2456A6',secondary:'#F4F7FA',shorts:'#17263E',pattern:'solid'}; }

export class Game {
  constructor(data,{storage,clock=()=>Date.now()/1000,random=Math.random}={}) {
    this.data=data; this.catalog=new Map((Array.isArray(data.players)?data.players:Object.values(data.players||{})).map(p=>[p.id,p]));
    if (!this.catalog.size) throw new Error('Footballer catalog is empty');
    this.config=data.config||{}; this.random=random; this.clock=clock;
    this.listeners=new Set(); this.serial=0; this.saveElapsed=0; this.uiElapsed=0;
    this.location={atHome:true,base:0}; this.saveStatus='Browser-local save'; this.storage=storage;
    if (storage===undefined) { try { this.storage=globalThis.localStorage; } catch (error) { this.saveStatus='Storage unavailable: '+error.message; } }
    this.state=this.fresh(); this.load(); this.populate(); this.currentEvent();
  }
  now() { return bound(this.clock(),0,1e13); }
  rng() { return bound(this.random(),0,.999999999999); }
  choice(values) { return values[Math.floor(this.rng()*values.length)]; }
  fresh() {
    return {version:1,coins:150,roster:[],teamUpgrade:0,stadiumLevel:0,shieldUntil:0,shieldReadyAt:0,practiceLevel:0,wins:0,steals:0,eventTokens:0,
      tactics:{formation:'4-4-2',mentality:'balanced',selectedUids:[],captainUid:null,presets:PRESETS.map(([name,formation,mentality])=>({name,formation,mentality,selectedUids:[],captainUid:null}))},
      kit:defaultKit(),staff:{owned:[],slots:{},assignments:[]},settings:{lowGraphics:false,sound:true},market:[],rivals:[],carry:null,npcAttempt:null,
      tools:['whistle'],defenseReadyAt:0,battleLock:false,battleReadyAt:0,trainingLevel:0,sprintUntil:0,incomeBoostUntil:0,collection:[],rewardedUids:[],event:null,developerTeamRedeemed:false};
  }
  recruit(id,level=0,mutationId) {
    const seed=1+Math.floor(this.rng()*1000000);
    const known=new Set([...(this.state?.roster||[]),...(this.state?.rivals||[]).flatMap(r=>r.roster),this.state?.carry?.player].filter(Boolean).map(p=>p.uid));
    for (const previous of this.state?.rewardedUids||[]) known.add(previous);
    let uid;
    do { uid='p-'+Math.floor(this.now()).toString(36)+'-'+(++this.serial).toString(36)+'-'+seed.toString(36); } while (known.has(uid));
    const event=this.currentEvent();
    let roll=this.rng()*100, mutation='ordinary';
    const weights=MUTATIONS.map(m=>({...m,weight:m.id!=='ordinary' && event.active && (event.mutation==='all'||event.mutation===m.id) ? m.weight*2 : m.weight}));
    weights[0].weight=100-weights.slice(1).reduce((n,m)=>n+m.weight,0);
    for (const m of weights) { roll-=m.weight; if (roll<0) { mutation=m.id; break; } }
    return {uid,id,seed,level,traitId:this.choice(TRAITS).id,mutationId:mutationId||mutation,staff:{attackLevel:0,defenceLevel:0,conditionLevel:0,injuryUntil:0}};
  }
  normalizeRecruit(v,seen) {
    v=object(v); if (!this.catalog.has(v.id)||typeof v.uid!=='string'||!v.uid||v.uid.length>128||seen.has(v.uid)) return null;
    seen.add(v.uid); const s=object(v.staff);
    const seed=finite(v.seed)?int(v.seed,1,1000000):hash(v.uid);
    return {uid:v.uid,id:v.id,seed,level:int(v.level,0,5),traitId:TRAITS.some(t=>t.id===v.traitId)?v.traitId:TRAITS[seed%6].id,
      mutationId:MUTATIONS.some(m=>m.id===v.mutationId)?v.mutationId:'ordinary',
      staff:{attackLevel:int(s.attackLevel??s.attackTraining,0,5),defenceLevel:int(s.defenceLevel??s.defenceTraining,0,5),conditionLevel:int(s.conditionLevel??s.conditioningLevel,0,5),injuryUntil:bound(s.injuryUntil,0,1e13)}};
  }
  normalize(raw) {
    if (!raw || typeof raw!=='object' || raw.version!==1 || !finite(raw.coins)||raw.coins<0||!Array.isArray(raw.roster)||raw.roster.length>18) throw new Error('Unsupported or damaged save');
    const s=this.fresh(), seen=new Set();
    s.roster=raw.roster.map(v=>this.normalizeRecruit(v,seen));
    if (s.roster.some(v=>!v)) throw new Error('Invalid recruit identity in save');
    s.coins=bound(raw.coins,0,1e15);
    for (const [key,max] of Object.entries({teamUpgrade:3,stadiumLevel:3,practiceLevel:3,wins:1e9,steals:1e9,eventTokens:1e9,trainingLevel:3})) s[key]=int(raw[key],0,max);
    for (const key of ['shieldUntil','shieldReadyAt','defenseReadyAt','battleReadyAt','sprintUntil','incomeBoostUntil']) s[key]=bound(raw[key],0,1e13);
    const normalizeTactics=v=> {
      v=object(v); const uids=Array.isArray(v.selectedUids)?v.selectedUids.filter((u,i,a)=>seen.has(u)&&a.indexOf(u)===i).slice(0,11):[];
      return {formation:formationExists(v.formation)?v.formation:'4-4-2',mentality:['balanced','pressing','counter'].includes(v.mentality)?v.mentality:'balanced',selectedUids:uids,captainUid:seen.has(v.captainUid)&&(!uids.length||uids.includes(v.captainUid))?v.captainUid:null};
    };
    s.tactics={...normalizeTactics(raw.tactics),presets:PRESETS.map(([name,formation,mentality],i)=>({name,...normalizeTactics(Array.isArray(raw.tactics?.presets)?raw.tactics.presets[i]:{formation,mentality})}))};
    if (validKit(raw.kit)) s.kit=clone(raw.kit);
    s.settings={lowGraphics:raw.settings?.lowGraphics===true,sound:raw.settings?.sound!==false};
    const staff=object(raw.staff); s.staff.owned=Array.isArray(staff.owned)?[...new Set(staff.owned.filter(id=>STAFF.some(d=>d.id===id)))].slice(0,8):[];
    for (const [role,id] of Object.entries(object(staff.slots))) if (s.staff.owned.includes(id)&&STAFF.some(d=>d.id===id&&d.role===role)) s.staff.slots[role]=id;
    const assigned=new Set(),roles=new Set();
    for (const a of Array.isArray(staff.assignments)?staff.assignments:[]) {
      const role=a?.role, player=s.roster.find(p=>p.uid===a?.uid&&p.id===a?.id);
      if (player&&s.staff.slots[role]&&['attack','defence','physio'].includes(role)&&!roles.has(role)&&!assigned.has(a.uid)&&finite(a.endsAt)&&a.endsAt>=0&&((role==='physio'&&['injury','conditioning'].includes(a.kind))||a.kind===role)) {
        s.staff.assignments.push({role,uid:a.uid,id:a.id,kind:a.kind,endsAt:bound(a.endsAt,0,1e13)}); assigned.add(a.uid); roles.add(role);
      }
    }
    s.tools=Array.isArray(raw.tools)&&raw.tools.includes('baton')?['whistle','baton']:['whistle'];
    s.collection=Array.isArray(raw.collection)?[...new Set(raw.collection.filter(id=>this.catalog.has(id)))]:[];
    s.rewardedUids=Array.isArray(raw.rewardedUids)?[...new Set(raw.rewardedUids.filter(u=>typeof u==='string'&&u.length<=128))].slice(-2000):[];
    const e=object(raw.event); if (typeof e.id==='string'&&e.id.length<100) s.event={id:e.id,progress:int(e.progress,0,90),claimed:e.claimed===true,purchased:Array.isArray(e.purchased)?e.purchased.filter(id=>this.catalog.get(id)?.eventOnly):[]};
    s.developerTeamRedeemed=raw.developerTeamRedeemed===true;
    return s;
  }
  load() {
    if (!this.storage) return;
    let text;
    try { text=this.storage.getItem(SAVE_KEY); if (text) this.state=this.normalize(JSON.parse(text)); }
    catch (error) {
      this.saveStatus='Save could not load: '+error.message;
      if (text) { try { this.storage.setItem(SAVE_KEY+':damaged',text); } catch (backupError) { this.saveStatus+='; backup unavailable: '+backupError.message; } }
      try { const backup=this.storage.getItem(SAVE_KEY+':backup'); if (backup) { this.state=this.normalize(JSON.parse(backup)); this.saveStatus+='; recovered backup'; } } catch (backupError) { this.saveStatus+='; backup could not load: '+backupError.message; }
    }
  }
  save() {
    if (!this.storage) { this.saveStatus='Storage unavailable; progress stays in this session'; return false; }
    try {
      const canonical=this.normalize(this.state), current=this.storage.getItem(SAVE_KEY);
      if (current) {
        let valid=false;
        try { this.normalize(JSON.parse(current)); valid=true; }
        catch (error) { this.saveStatus='Replacing damaged save: '+error.message; }
        if (valid) this.storage.setItem(SAVE_KEY+':backup',current);
      }
      this.storage.setItem(SAVE_KEY,JSON.stringify(canonical)); this.saveStatus='Saved in this browser'; return true;
    } catch (error) { this.saveStatus='Save failed: '+error.message+'; progress stays in this session'; return false; }
  }
  reset() {
    this.state=this.fresh(); this.serial=0; this.populate(); this.currentEvent(); this.save(); this.notify();
  }
  subscribe(listener) { this.listeners.add(listener); return ()=>this.listeners.delete(listener); }
  notify() { for (const listener of this.listeners) listener(this.snapshot()); }
  setLocation(value) { const v=object(value); this.location={atHome:v.atHome===true,base:Number.isInteger(v.base)?v.base:null}; }
  currentEvent() {
    const now=Math.floor(this.now()),window=Math.floor(now/600),definition=EVENTS[window%4],id=definition.key+':'+window,elapsed=now%600;
    if (this.state && this.state.event?.id!==id) this.state.event={id,progress:0,claimed:false,purchased:[]};
    return {...definition,id,active:elapsed<480,remaining:(elapsed<480?480:600)-elapsed,nextName:EVENTS[(window+1)%4].name};
  }
  progress(key,amount=1) { const e=this.currentEvent(); if (e.active&&e.key===key) this.state.event.progress=Math.min(e.target,this.state.event.progress+amount); }
  delivered(p,stolen=false) {
    if (!this.state.collection.includes(p.id)) this.state.collection.push(p.id);
    if (this.state.rewardedUids.includes(p.uid)) return;
    this.state.rewardedUids.push(p.uid); if (this.state.rewardedUids.length>2000) this.state.rewardedUids.shift();
    this.state.eventTokens+=stolen?2:1; this.progress('transfer_festival');
  }
  stats(p) {
    const def=this.catalog.get(p.id),trait=TRAITS.find(t=>t.id===p.traitId)||TRAITS[5],mutation=MUTATIONS.find(m=>m.id===p.mutationId)||MUTATIONS[0];
    const variation=1+((p.seed%401)-200)/10000, power=def.power*variation*(1+p.level*.03)*(1+mutation.powerBonus);
    const baseline=def.stats||{},style=def.style||{};
    const stats={...baseline,power:rounded(power),income:def.income*(1+p.level*.1)*(1+mutation.incomeBonus),level:p.level,seed:p.seed,traitId:trait.id,traitName:trait.name,traitStat:trait.stat,traitBonus:.08,mutationId:mutation.id,mutationName:mutation.name,
      playstyleId:style.id||baseline.playstyleId||def.playstyleId,playstyleName:style.name||baseline.playstyleName,naturalRole:style.naturalRole||baseline.naturalRole||this.naturalRole(def),position:style.position||baseline.position||def.position};
    // The catalog export removes its baseline trait bonus. Reapply this recruit's trait.
    for (const key of AXES) {
      const factor=finite(baseline[key])&&baseline.power>0?baseline[key]/baseline.power:this.archetype(def,stats.naturalRole)[key];
      stats[key]=rounded(bound(power*factor*(trait.stat===key?1.08:1),0,130));
    }
    const s=p.staff||{},bonuses={attacking:(s.attackLevel||0)*.02,passing:(s.attackLevel||0)*.02,defending:(s.defenceLevel||0)*.02,stamina:(s.conditionLevel||0)*.02,pace:(s.conditionLevel||0)*.01};
    for (const [key,bonus] of Object.entries(bonuses)) stats[key]=rounded(bound(stats[key]*(1+bonus),0,130));
    stats.attackTraining=s.attackLevel||0; stats.defenceTraining=s.defenceLevel||0; stats.conditioningLevel=s.conditionLevel||0;
    stats.injuryUntil=s.injuryUntil||0; stats.injured=stats.injuryUntil>this.now();
    if (stats.injured) { stats.pace=rounded(stats.pace*.85); stats.stamina=rounded(stats.stamina*.9); }
    return stats;
  }
  naturalRole(def) { const position=def.position||''; return position==='GK'?'GK':/B$/.test(position)?'DF':['ST','CF','LW','RW'].includes(position)?'ST':'MF'; }
  archetype(def,role) {
    const shape=role==='GK'?[.23,.55,.62,.43,.86,.95]:role==='DF'?[.73,.94,.91,1.12,1.04,.68]:role==='ST'?[1.08,.95,.85,.67,.94,.52]:[.93,.94,1.04,.94,1.05,.55];
    return Object.fromEntries(AXES.map((k,i)=>[k,shape[i]]));
  }
  income(stable=false) {
    const s=this.state; if (s.battleLock&&!stable) return 0;
    const assigned=new Set(s.staff.assignments.map(a=>a.uid));
    const sum=s.roster.reduce((n,p)=>n+(assigned.has(p.uid)||s.npcAttempt?.uid===p.uid?0:this.stats(p).income),0);
    return sum*(1+s.teamUpgrade*.25)*(1+s.stadiumLevel*.05)*(1+s.trainingLevel*.1)*(!stable&&s.incomeBoostUntil>this.now()?1.5:1);
  }
  marketPlayer(index) {
    const groups=this.config.MarketLineup||this.config.marketLineup||[['saka','palmer'],['yamal'],['son','neymar','pedri','foden'],['debruyne','bellingham','vinicius','kane','lewandowski','vandijk'],['salah','mbappe','haaland','messi','ronaldo','r9','maradona','henry','maldini']];
    if (index===4&&this.rng()<.3) return 'mystery';
    const values=(Array.isArray(groups[index])?groups[index]:[groups[index]]).filter(id=>this.catalog.has(id)&&!this.catalog.get(id).eventOnly);
    return this.choice(values.length?values:[...this.catalog.values()].filter(d=>!d.eventOnly).map(d=>d.id));
  }
  populate() {
    const now=this.now();
    this.state.market=Array.from({length:5},(_,index)=>({marketId:'belt-'+index,id:this.marketPlayer(index),index,x:index*.2,readyAt:0}));
    const pool=(this.config.PracticeLineup||this.config.practiceLineup||['saka','son','debruyne']).filter(id=>this.catalog.has(id));
    this.state.rivals=Array.from({length:12},(_,index)=>({index,name:'Rival '+(index+1),shieldUntil:0,refillAt:now+45,roster:Array.from({length:3},(_,i)=>this.recruit(pool[i%pool.length]||this.catalog.keys().next().value))}));
    this.nextAttemptAt=now+35+this.rng()*25;
  }
  completeTraining() {
    if (this.state.battleLock) return;
    this.state.staff.assignments=this.state.staff.assignments.filter(a=>{
      const p=this.state.roster.find(p=>p.uid===a.uid&&p.id===a.id); if (!p) return false; if (a.endsAt>this.now()) return true;
      if (a.kind==='injury') p.staff.injuryUntil=0;
      else if (p.staff.injuryUntil<=this.now()) { const key=a.kind==='attack'?'attackLevel':a.kind==='defence'?'defenceLevel':'conditionLevel'; p.staff[key]=Math.min(5,p.staff[key]+1); }
      return false;
    });
  }
  tick(dt) {
    dt=bound(dt,0,.25); if (!dt) return;
    const s=this.state,now=this.now(); this.currentEvent(); this.completeTraining();
    s.coins=Math.min(1e15,s.coins+this.income()*dt);
    if (!s.battleLock&&s.roster.length) this.progress('training_camp',dt);
    for (const item of s.market) {
      if (item.id) { item.x+=dt/30; if (item.x>1) { item.id=null; item.x=0; item.readyAt=now; } }
      else if (now>=item.readyAt&&!s.market.some(other=>other!==item&&other.id&&other.x<.14)) { item.id=this.marketPlayer(item.index); item.x=0; }
    }
    for (const rival of s.rivals) if (now>=rival.refillAt) {
      rival.refillAt=now+45; const pool=(this.config.PracticeLineup||['saka','son','debruyne']).filter(id=>this.catalog.has(id));
      if (rival.roster.length<3&&pool.length) rival.roster.push(this.recruit(this.choice(pool)));
    }
    if (!s.battleLock) {
      if (s.npcAttempt&&now>=s.npcAttempt.endsAt) {
        const at=s.roster.findIndex(p=>p.uid===s.npcAttempt.uid); const rival=s.rivals[s.npcAttempt.base];
        if (s.shieldUntil<=now&&at>=0) { const [p]=s.roster.splice(at,1); rival.roster.push(p); this.cleanSelection(); }
        s.npcAttempt=null;
      }
      if (!s.npcAttempt&&s.roster.length&&now>=this.nextAttemptAt) {
        this.nextAttemptAt=now+45+this.rng()*30;
        if (s.shieldUntil<=now) { const eligible=s.roster.filter(p=>!s.staff.assignments.some(a=>a.uid===p.uid)); if (eligible.length) s.npcAttempt={uid:this.choice(eligible).uid,base:Math.floor(this.rng()*12),startsAt:now,endsAt:now+12}; }
      }
    }
    this.saveElapsed+=dt; this.uiElapsed+=dt;
    if (this.saveElapsed>=5) { this.saveElapsed=0; this.save(); }
    if (this.uiElapsed>=.25) { this.uiElapsed=0; this.notify(); }
  }
  cleanSelection() {
    const owned=new Set(this.state.roster.map(p=>p.uid));
    for (const setup of [this.state.tactics,...this.state.tactics.presets]) { setup.selectedUids=setup.selectedUids.filter(uid=>owned.has(uid)); if (!owned.has(setup.captainUid)) setup.captainUid=null; }
    this.state.staff.assignments=this.state.staff.assignments.filter(a=>owned.has(a.uid));
  }
  ownedMembers() {
    return this.state.roster.filter(p=>this.state.npcAttempt?.uid!==p.uid).map(p=>({uid:p.uid,id:p.id,name:this.catalog.get(p.id).name,power:this.stats(p).power,stats:this.stats(p),def:this.catalog.get(p.id),borrowed:false,role:this.stats(p).naturalRole}));
  }
  team(tactics=this.state.tactics) {
    const s={...this.state,tactics},roles=FORMATIONS[s.tactics.formation],jobs=JOBS[s.tactics.formation];
    const all=this.ownedMembers().sort((a,b)=>b.power-a.power||a.uid.localeCompare(b.uid));
    const manual=s.tactics.selectedUids.length>0,selected=manual?s.tactics.selectedUids.map(uid=>all.find(p=>p.uid===uid)).filter(Boolean):all;
    const used=new Set();
    return roles.map((role,index)=>{
      let member;
      if (manual&&selected.length===11) member=selected[index];
      else {
        const axis=role==='GK'?'goalkeeping':role==='DF'?'defending':role==='MF'?'passing':'attacking';
        const candidates=selected.filter(p=>!used.has(p.uid)&&(role==='GK'||p.stats.naturalRole!=='GK'));
        member=candidates.sort((a,b)=>((b.stats.naturalRole===role?1000:0)+b.stats[axis])-((a.stats.naturalRole===role?1000:0)+a.stats[axis]))[0];
        // Tiny original squads stay outfield; the practice keeper fills the goal.
        if (role==='GK'&&member?.stats.naturalRole!=='GK'&&selected.length<4) member=null;
      }
      if (member) used.add(member.uid);
      else {
        const ids=role==='GK'?['alisson','saka']:['saka','yamal','palmer']; const id=ids.find(id=>this.catalog.has(id))||this.catalog.keys().next().value,def=this.catalog.get(id);
        member={uid:'loan-'+index,id,name:def.name,def,power:24,borrowed:true,stats:{power:24,income:0,level:0,attacking:26,pace:34,passing:27,defending:28,stamina:34,goalkeeping:role==='GK'?34:18,naturalRole:role,...def.style}};
      }
      return {...member,role,roleLabel:jobs[index],captain:member.uid===s.tactics.captainUid};
    });
  }
  practiceTeam() {
    const pools={GK:[],DF:[],MF:[],ST:[]},used={};
    for (const def of this.catalog.values()) { const role=def.style?.naturalRole||def.stats?.naturalRole||this.naturalRole(def); if (pools[role]&&!def.eventOnly&&!def.isIcon&&!def.variantOf) pools[role].push(def); }
    for (const pool of Object.values(pools)) pool.sort((a,b)=>a.power-b.power||a.id.localeCompare(b.id));
    return FORMATIONS['4-4-2'].map((role,index)=>{
      const pool=pools[role],def=pool[(used[role]||0)%Math.max(1,pool.length)]||this.catalog.values().next().value; used[role]=(used[role]||0)+1;
      const base=role==='GK'?28:bound(def.power*.55,22,34),scale=1+this.state.practiceLevel*.05;
      const stats={...def.style,power:base,income:0,level:0,traitId:'practice',naturalRole:role,attacking:bound(base*(role==='ST'?1.05:role==='MF'?.88:.65),18,34),pace:bound(base*.9+2,22,32),passing:bound(base*(role==='MF'?1.05:.9),20,34),defending:bound(base*(role==='DF'?1.08:role==='MF'?.88:.65),18,34),stamina:bound(base,28,34),goalkeeping:role==='GK'?28:16};
      for (const key of ['power',...AXES]) stats[key]*=scale;
      return {uid:'practice-'+index,id:def.id,name:def.name,def,power:stats.power,stats,role,roleLabel:JOBS['4-4-2'][index],borrowed:true,captain:index===6};
    });
  }
  snapshot() {
    const e=this.currentEvent(),s=this.state,def=this.catalog.get(e.offer);
    return clone({...s,incomeRate:this.income(),saveStatus:this.saveStatus,staffCatalog:STAFF,mutations:MUTATIONS,
      stadium:{...STADIUMS[s.stadiumLevel],level:s.stadiumLevel,next:STADIUMS[s.stadiumLevel+1]||null},
      event:{...e,...s.event,tokens:s.eventTokens,reward:10,offers:def?[{id:def.id,name:def.name,cost:e.cost,mutationId:e.offerMutation,available:e.active&&!s.event.purchased.includes(def.id)&&s.eventTokens>=e.cost}]:[]},
      shop:{trainingCost:[200,450,900][s.trainingLevel]||null,sprintCost:120,incomeBoostCost:180},
      roster:s.roster.map(p=>({...p,name:this.catalog.get(p.id).name,def:this.catalog.get(p.id),stats:this.stats(p),upgradeCost:p.level<5?Math.max(75,Math.floor(this.catalog.get(p.id).cost*.4*(p.level+1))):null,income:this.stats(p).income}))});
  }
  spend(cost) { if (!finite(cost)||cost<0||this.state.coins<cost) return false; this.state.coins-=cost; return true; }
  action(name,payload={}) {
    if (typeof name!=='string'||!payload||typeof payload!=='object'||Array.isArray(payload)) return fail('Invalid action');
    const s=this.state,now=this.now(),p=s.roster.find(p=>p.uid===payload.uid);
    if (s.battleLock&&!['endBattle','settings'].includes(name)) return fail('Finish your match first');
    if (s.carry&&!['deposit','drop','settings','shield','defend'].includes(name)) return fail('Deliver or drop your carried footballer first');
    let message='Done';
    if (name==='buy') {
      const item=s.market.find(m=>m.marketId===payload.marketId); if (!item?.id) return fail('That market recruit has moved on');
      if (payload.expectedId!==undefined&&payload.expectedId!==item.id) return fail('That market recruit has changed; check the current footballer');
      const result=this.sign(item.id); if (!result.ok) return result; item.id=null; item.x=0; item.readyAt=now+3; message=result.message;
    } else if (name==='egg') {
      const egg=this.data.eggs?.find(e=>e.id===payload.id); if (!egg) return fail('Unknown egg');
      if (s.roster.length>=18) return fail('Your 18-player roster is full'); if (s.coins<egg.cost) return fail('Requires '+egg.cost+' coins');
      const id=this.rollGroups(egg.groups); if (!id) return fail('Egg roster is unavailable');
      this.spend(egg.cost); const recruit=this.recruit(id,1); s.roster.push(recruit); this.delivered(recruit); message=this.catalog.get(id).name+' hatched at level 1';
    } else if (name==='mystery') { const result=this.sign('mystery'); if (!result.ok) return result; message=result.message;
    } else if (name==='sell'||name==='upgradePlayer') {
      if (!p) return fail('Choose an owned footballer'); if (s.npcAttempt?.uid===p.uid) return fail('Recover this footballer from the thief first');
      if (s.staff.assignments.some(a=>a.uid===p.uid)) return fail('Cancel training first');
      const def=this.catalog.get(p.id);
      if (name==='sell') { const amount=Math.floor(def.cost*.5); s.roster.splice(s.roster.indexOf(p),1); s.coins+=amount; this.cleanSelection(); message='Sold '+def.name+' for '+amount+' coins'; }
      else { if (p.level>=5) return fail('Maximum player level 5'); const cost=Math.max(75,Math.floor(def.cost*.4*(p.level+1))); if (!this.spend(cost)) return fail('Requires '+cost+' coins'); p.level++; message=def.name+' upgraded to level '+p.level; }
    } else if (name==='upgradeTeam') {
      const cost=(this.config.UpgradeCosts||[300,1400,4200])[s.teamUpgrade]; if (!cost) return fail('Maximum team level'); if (!this.spend(cost)) return fail('Requires '+cost+' coins'); s.teamUpgrade++; message='Team income bonus +'+s.teamUpgrade*25+'%';
    } else if (name==='upgradeStadium') {
      const tier=STADIUMS[s.stadiumLevel+1]; if (!tier) return fail('Maximum stadium level'); if (!this.location.atHome) return fail('Visit your home stadium');
      if (s.roster.length<tier.recruits) return fail('Recruit '+tier.recruits+' players first'); if (!this.spend(tier.cost)) return fail('Requires '+tier.cost+' coins'); s.stadiumLevel++; message=tier.name+' unlocked';
    } else if (name==='shield') {
      if (!this.location.atHome) return fail('Visit your team shield pad'); if (now<s.shieldReadyAt) return fail('Shield is recharging'); s.shieldUntil=now+(this.config.ShieldDuration||25); s.shieldReadyAt=now+(this.config.ShieldCooldown||60); s.npcAttempt=null; message='Team shield active for 25 seconds';
    } else if (name==='steal') {
      const rival=Number.isInteger(payload.base)?s.rivals[payload.base]:null;
      if (!rival||!Number.isInteger(payload.index)||!rival.roster[payload.index]) return fail('Choose an available rival footballer');
      if (this.location.atHome||this.location.base!==payload.base) return fail('Move beside that rival team'); if (rival.shieldUntil>now) return fail('Rival team shield is active'); if (s.roster.length>=18) return fail('Your team is full');
      const [recruit]=rival.roster.splice(payload.index,1); s.carry={player:recruit,originBase:payload.base,originIndex:payload.index}; message='Carry '+this.catalog.get(recruit.id).name+' home';
    } else if (name==='deposit') {
      if (!s.carry) return fail('You are not carrying a footballer'); if (!this.location.atHome) return fail('Carry your footballer to your home deposit pad'); if (s.roster.length>=18) return fail('Your roster is full');
      s.roster.push(s.carry.player); this.delivered(s.carry.player,true); s.steals++; s.carry=null; message='Stolen footballer delivered';
    } else if (name==='drop') {
      if (!s.carry) return fail('You are not carrying a footballer'); s.rivals[s.carry.originBase].roster.splice(s.carry.originIndex,0,s.carry.player); s.carry=null; message='Footballer returned to their team';
    } else if (name==='buyTool') {
      if (payload.id!=='baton') return fail('Unknown defense tool'); if (s.tools.includes('baton')) return fail('Baton already owned'); if (!this.spend(350)) return fail('Requires 350 coins'); s.tools.push('baton'); message='Defender Baton unlocked';
    } else if (name==='defend') {
      if (!s.tools.includes(payload.tool)) return fail('Choose an owned defense tool'); if (!this.location.atHome) return fail('Defense tools work beside your team'); if (s.defenseReadyAt>now) return fail('Defense tool is recharging');
      s.defenseReadyAt=now+(payload.tool==='whistle'?8:4); message=s.npcAttempt?'Thief repelled; footballer recovered':'No intruder in range'; s.npcAttempt=null;
    } else if (name==='hire') {
      const staff=STAFF.find(d=>d.id===payload.id); if (!staff) return fail('Unknown staff'); if (s.staff.owned.includes(staff.id)) return fail('Staff already hired'); if (!this.spend(staff.cost)) return fail('Requires '+staff.cost+' coins'); s.staff.owned.push(staff.id); if (!s.staff.slots[staff.role]) s.staff.slots[staff.role]=staff.id; message=staff.name+' hired';
    } else if (name==='equipStaff') {
      const staff=STAFF.find(d=>d.id===payload.id); if (!staff||!s.staff.owned.includes(staff.id)) return fail('Hire staff first'); if (s.staff.assignments.some(a=>a.role===staff.role)) return fail('Cancel this job first'); s.staff.slots[staff.role]=staff.id; message='Staff selected';
    } else if (name==='assignStaff') {
      const staff=STAFF.find(d=>d.id===payload.id||d.role===payload.id),role=staff?.role;
      if (!staff||!['attack','defence','physio'].includes(role)||s.staff.slots[role]!==staff.id) return fail('Hire and select this coach first');
      if (!p||s.npcAttempt?.uid===p.uid) return fail('Choose an available owned player'); if (s.staff.assignments.some(a=>a.role===role||a.uid===p.uid)) return fail('Coach or footballer already assigned');
      const injured=p.staff.injuryUntil>now,kind=role==='physio'?(injured?'injury':'conditioning'):role;
      if (role!=='physio'&&injured) return fail('Treat the injury first'); if (payload.kind&&payload.kind!==kind) return fail('Choose the available training kind');
      const field=kind==='attack'?'attackLevel':kind==='defence'?'defenceLevel':'conditionLevel'; if (kind!=='injury'&&p.staff[field]>=5) return fail('Development already at level 5');
      s.staff.assignments.push({uid:p.uid,id:p.id,role,kind,endsAt:now+(kind==='injury'?45:kind==='conditioning'?90:120)}); message='Training started; this player income pauses';
    } else if (name==='cancelTraining') {
      const at=s.staff.assignments.findIndex(a=>a.uid===payload.uid); if (at<0) return fail('No training assignment'); s.staff.assignments.splice(at,1); message='Training cancelled; income restored';
    } else if (name==='tactics') { const result=this.updateTactics(payload); if (!result.ok) return result; message=result.message;
    } else if (name==='savePreset'||name==='loadPreset') {
      if (!Number.isInteger(payload.index)||payload.index<0||payload.index>4) return fail('Choose preset 1 to 5');
      if (name==='savePreset') { const {formation,mentality,selectedUids,captainUid}=s.tactics; s.tactics.presets[payload.index]={name:PRESETS[payload.index][0],formation,mentality,selectedUids:[...selectedUids],captainUid}; }
      else { const result=this.updateTactics(s.tactics.presets[payload.index]); if (!result.ok) return result; } message='Preset '+(payload.index+1)+(name==='savePreset'?' saved':' loaded');
    } else if (name==='kit'||name==='colors') {
      const kit={...s.kit,...payload}; if (!validKit(kit)||Object.keys(kit).some(k=>!Object.keys(defaultKit()).includes(k))) return fail('Use a name up to 20 bytes, hex colors and solid, stripes or hoops'); s.kit=clone(kit); message='Club kit saved';
    } else if (name==='settings') {
      for (const key of ['lowGraphics','sound']) if (payload[key]!==undefined&&typeof payload[key]!=='boolean') return fail('Invalid setting'); s.settings={...s.settings,...Object.fromEntries(Object.entries(payload).filter(([k])=>['lowGraphics','sound'].includes(k)))}; message='Settings saved';
    } else if (name==='shopBuy') {
      const id=payload.id,cost=id==='training'?[200,450,900][s.trainingLevel]:id==='sprint'?120:id==='incomeBoost'?180:null;
      if (!cost) return fail('Product unavailable'); if (id==='sprint'&&s.sprintUntil>now||id==='incomeBoost'&&s.incomeBoostUntil>now) return fail('Boost is already active'); if (!this.spend(cost)) return fail('Requires '+cost+' coins'); if (id==='training') s.trainingLevel++; else s[id==='sprint'?'sprintUntil':'incomeBoostUntil']=now+(id==='sprint'?180:120); message='Club product purchased';
    } else if (name==='eventClaim'||name==='eventBuy') {
      const event=this.currentEvent(); if (!event.active||(payload.eventId!==undefined&&payload.eventId!==event.id)||name==='eventClaim'&&payload.id!==event.id) return fail('That event has expired');
      if (name==='eventClaim') { if (s.event.claimed||s.event.progress<event.target) return fail('Complete the unclaimed objective first'); s.event.claimed=true; s.eventTokens+=10; message='+10 event tokens'; }
      else { if (payload.id!==event.offer||!this.catalog.get(payload.id)?.eventOnly||s.event.purchased.includes(payload.id)) return fail('Offer unavailable or already bought'); if (s.roster.length>=18) return fail('Your roster is full'); if (s.eventTokens<event.cost) return fail('Requires '+event.cost+' event tokens'); const recruit=this.recruit(payload.id,0,event.offerMutation); s.eventTokens-=event.cost; s.event.purchased.push(payload.id); s.roster.push(recruit); this.delivered(recruit); message='Limited signing completed'; }
    } else if (name==='beginBattle') {
      if (!s.roster.length) return fail('Buy your first footballer before playing'); if (now<s.battleReadyAt) return fail('Squad is resting'); if (s.npcAttempt) return fail('Repel the thief first');
      const team=this.team(),owned=team.filter(m=>!m.borrowed),average=owned.reduce((n,m)=>n+bound(m.power,20,150),0)/Math.max(1,owned.length),level=owned.reduce((n,m)=>n+m.stats.level,0)/Math.max(1,owned.length);
      this.battleScaling={multiplier:bound(1+Math.max(0,average-20)*.01*owned.length/11+level*.05*owned.length/11,1,2.5),incomeRate:bound(this.income(true),0,1000000),ownedPlayers:owned.length,averageSkill:average,averageLevel:level};
      s.battleLock=true; message='Squad battle started';
    } else if (name==='endBattle') {
      if (!s.battleLock||!this.battleScaling) return fail('No active battle');
      const result=object(payload.result),score=result.score;
      if (!Array.isArray(score)||score.length!==2||score.some(n=>!Number.isInteger(n)||n<0||n>100)) return fail('Invalid completed match result');
      const forfeit=result.forfeit===true,outcome=forfeit?'loss':result.winner===0?'win':result.winner===1?'loss':score[0]>score[1]?'win':score[0]===score[1]?'draw':'loss';
      const reward=this.battleReward(outcome,score[0],score[1],forfeit); s.coins=Math.min(1e15,s.coins+reward.total); s.battleLock=false; s.battleReadyAt=now+(this.config.BattleCooldown||45); this.battleScaling=null;
      if (!forfeit) {
        s.eventTokens+=outcome==='win'?5:3; this.progress('mutation_rush');
        if (outcome==='win') {
          s.wins++; this.progress('golden_goal');
          if (score[0]-score[1]>3) s.practiceLevel=Math.min(3,s.practiceLevel+1);
        }
      }
      for (const uid of Array.isArray(result.injuries)?result.injuries:[]) { const recruit=s.roster.find(p=>p.uid===uid); if (recruit) recruit.staff.injuryUntil=Math.max(recruit.staff.injuryUntil,now+180); }
      s.lastBattle={outcome,score,reward}; message=reward.resultLabel+'; +'+reward.total+' coins';
    } else if (name==='developerCode') {
      if (typeof payload.code!=='string'||payload.code.trim().toUpperCase()!=='DEVTEAM') return fail('Unknown developer code'); if (s.developerTeamRedeemed) return fail('Local test squad already redeemed');
      if (!DEV_SQUAD.every(id=>this.catalog.has(id))) return fail('Test squad is not installed'); const missing=DEV_SQUAD.filter(id=>!s.roster.some(p=>p.id===id)); if (s.roster.length+missing.length>18) return fail('Make room for the 14-player test squad');
      for (const id of missing) s.roster.push(this.recruit(id)); s.tactics.formation='3-5-2'; s.tactics.mentality='balanced'; s.tactics.selectedUids=DEV_XI.map(id=>s.roster.find(p=>p.id===id).uid); s.tactics.captainUid=s.roster.find(p=>p.id==='messi').uid; s.developerTeamRedeemed=true; message='DEVTEAM local test squad loaded; coins unchanged';
    } else return fail('Unknown action');
    this.save(); this.notify(); return {ok:true,message};
  }
  rollGroups(groups) {
    if (!Array.isArray(groups)||!groups.length) return null;
    const available=groups.map(g=>({...g,ids:(g.ids||[]).filter(id=>this.catalog.has(id)&&!this.catalog.get(id).eventOnly)})).filter(g=>g.ids.length&&finite(g.weight)&&g.weight>0);
    const sum=available.reduce((n,g)=>n+g.weight,0); if (!sum) return null; let roll=this.rng()*sum;
    for (const group of available) { roll-=group.weight; if (roll<0) return this.choice(group.ids); } return available.at(-1).ids[0];
  }
  sign(id) {
    if (this.state.roster.length>=18) return fail('Your 18-player roster is full');
    const mystery=id==='mystery',cost=mystery?(this.config.Progression?.mysteryCost||2000):this.catalog.get(id)?.cost;
    if (!finite(cost)) return fail('Unknown recruit'); if (this.state.coins<cost) return fail('Requires '+cost+' coins');
    if (mystery) {
      const candidates=[...this.catalog.values()].filter(d=>!d.eventOnly&&!d.variantOf);
      id=this.rollGroups(this.data.mysteryGroups||[{weight:80,ids:candidates.filter(d=>d.rarity==='Rare'&&!d.isIcon).map(d=>d.id)},{weight:18,ids:candidates.filter(d=>d.rarity==='Epic'&&!d.isIcon).map(d=>d.id)},{weight:2,ids:['r9','maradona','henry','maldini']}]);
      if (!id) return fail('Mystery roster unavailable');
    }
    this.spend(cost); const p=this.recruit(id,mystery?1:0); this.state.roster.push(p); this.delivered(p); return {ok:true,message:this.catalog.get(id).name+' signed'};
  }
  updateTactics(payload) {
    const previous=this.state.tactics,formation=payload.formation??previous.formation,mentality=payload.mentality??previous.mentality,selected=payload.selectedUids??previous.selectedUids,captain=payload.captainUid===undefined?previous.captainUid:payload.captainUid;
    if (!formationExists(formation)||!['balanced','pressing','counter'].includes(mentality)||!Array.isArray(selected)||selected.length>11||new Set(selected).size!==selected.length||selected.some(uid=>!this.state.roster.some(p=>p.uid===uid)||this.state.npcAttempt?.uid===uid)) return fail('Choose a formation and up to 11 different owned players');
    if (captain!==null&&(!this.state.roster.some(p=>p.uid===captain)||(selected.length&&!selected.includes(captain)))) return fail('Captain must be in your lineup');
    this.state.tactics={...previous,formation,mentality,selectedUids:[...selected],captainUid:captain}; return {ok:true,message:'Team tactics saved'};
  }
  battleReward(outcome,goals,conceded,forfeit) {
    const s=this.battleScaling,m=bound(s.multiplier,1,2.5),incomeRate=bound(s.incomeRate,0,1000000);
    const scored=int(goals,0,100),base=forfeit?0:(outcome==='win'?100:outcome==='draw'?50:25)+scored*15+(outcome==='win'&&conceded===0?20:0);
    const coverage=forfeit?0:outcome==='win'?1.25:outcome==='draw'?.6:.25,margin=forfeit?0:outcome==='win'?.15:outcome==='draw'?.05:0;
    const compensation=Math.round(incomeRate*90*coverage),progression=Math.round(incomeRate*90*margin*(m-1)),performance=Math.round(base*m),cap=forfeit?0:compensation+progression+Math.round(250*m);
    return {...s,incomeRate,multiplier:m,resultLabel:forfeit?'Forfeit':outcome==='win'?'Win':outcome==='draw'?'Draw':'Loss',incomeCompensation:compensation,incomeSkillBonus:progression,performance,cap,total:Math.min(cap,compensation+progression+performance)};
  }
}
