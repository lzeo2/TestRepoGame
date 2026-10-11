import {Game} from './game.js';
import {Match} from './match.js';
import {World} from './world.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = n => Math.floor(n || 0).toLocaleString('en');
const clone = value => JSON.parse(JSON.stringify(value));
const axes = ['attacking','pace','passing','defending','stamina','goalkeeping'];
const labels = ['Attack','Pace','Passing','Defense','Stamina','Keeping'];
const formations = {'4-4-2':[4,4,2], '4-3-3':[4,3,3], '3-5-2':[3,5,2]};
const button = (label, action, attrs = '', disabled = false) => `<button class="small" data-action="${action}" ${attrs} ${disabled?'disabled':''}>${esc(label)}</button>`;
const select = (id, options, selected) => `<select id="${id}">${options.map(([value,label])=>`<option value="${esc(value)}" ${String(value)===String(selected)?'selected':''}>${esc(label)}</option>`).join('')}</select>`;
const marketDefinition = id => id==='mystery'?{id,name:'Mystery Player',rarity:'Mystery',cost:data.config.Progression.mysteryCost,income:0,power:'?'}:game.catalog.get(id);

let data, worldData, game, world, state, match, matchState, report, lineup;
let started = false, panel = '', previousFocus, draft, selectedPosition = null;
let nearest, route = false, lastTime = 0, uiTime = 0, sheetTime = 0, toastUntil = 0;
let camera = {mode:'avatar',index:0,zoom:1,yaw:0,pitchIndex:0};
let beforeCelebration = null, celebrationSerial = null, callMode = 'attack';
let commentarySerial = -1, audioSerial = -1, captionUntil = 0, captionQueue = [];
let lastControlsKey = '', touchVector = {x:0,z:0}, keys = new Set(), pointer;

// Original synthesized crowd and referee cues: no speech or downloaded recordings.
class StadiumAudio {
  constructor() { this.enabled=true;this.context=null;this.ambient=null;this.voices=new Set(); }
  start() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context=new Audio();this.master=this.context.createGain();this.master.gain.value=.15;this.master.connect(this.context.destination);
      this.noise=this.context.createBuffer(1,this.context.sampleRate*3,this.context.sampleRate);
      const samples=this.noise.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
    }
    this.context.resume().catch(()=>{});
  }
  configure(enabled, inMatch) {
    this.enabled=enabled;
    if (!this.context) return;
    this.master.gain.setTargetAtTime(enabled?.15:0,this.context.currentTime,.15);
    if (enabled && inMatch && !this.ambient) {
      const source=this.context.createBufferSource(), filter=this.context.createBiquadFilter(), gain=this.context.createGain();
      source.buffer=this.noise;source.loop=true;filter.type='lowpass';filter.frequency.value=500;gain.gain.value=.12;
      source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();this.ambient={source,gain};
    } else if ((!enabled||!inMatch) && this.ambient) {
      const {source,gain}=this.ambient;gain.gain.setTargetAtTime(0,this.context.currentTime,.5);source.stop(this.context.currentTime+2);this.ambient=null;
    }
  }
  cue(kind) {
    if (!this.enabled||!this.context) return;
    const now=this.context.currentTime;
    if (['foul','offside','out','fullTime','kickoff'].includes(kind)) {
      const count=kind==='fullTime'?3:kind==='out'?2:1;
      for(let i=0;i<count;i++) {
        const tone=this.context.createOscillator(),gain=this.context.createGain();const t=now+i*.38;
        tone.type='sine';tone.frequency.setValueAtTime(2100+Math.random()*420,t);tone.frequency.linearRampToValueAtTime(2700,t+.08);
        gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.28,t+.03);gain.gain.exponentialRampToValueAtTime(.001,t+.27);
        tone.connect(gain);gain.connect(this.master);tone.start(t);tone.stop(t+.3);
      }
    }
    if (!['goal','save','commentary'].includes(kind)) return;
    if(kind==='commentary'&&Math.random()>.18)return;
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    const duration=kind==='goal'?3.7:kind==='save'?2.1:1.4;
    source.buffer=this.noise;source.loop=true;filter.type='bandpass';filter.frequency.value=600+Math.random()*700;filter.Q.value=.65;
    gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(kind==='goal'?.65:.3,now+.22);
    gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.stop(now+duration+.1);
    this.voices.add(source);source.onended=()=>this.voices.delete(source);
  }
  dispose() {for(const source of this.voices)try{source.stop();}catch{};this.context?.close().catch(()=>{});}
}
const audio=new StadiumAudio();

function toast(message) { $('toast').textContent=message;$('toast').hidden=false;toastUntil=performance.now()+3800; }
function updateLocation(action) {
  const pos=world.avatar, home=worldData.bases[0];
  const distance=p=>Math.hypot(pos.x-p[0],pos.z-p[2]);
  const pad=action==='shield'?home.shield:home.deposit;
  let atHome=distance(pad)<14;
  if(action==='upgradeStadium')atHome=distance(home.pitch.position)<140||distance(home.position)<32;
  const rivalPlots=[...worldData.bases.slice(1),worldData.rivalBase].filter(Boolean);
  const rival=rivalPlots.map((b,i)=>({i,distance:distance(b.deposit||b.position)})).sort((a,b)=>a.distance-b.distance)[0];
  game.setLocation({atHome,base:rival?.distance<30?rival.i:-1});
}
function act(name,payload={}) {
  updateLocation(name);const result=game.action(name,payload);state=game.snapshot();lineup=game.team();
  toast(result.message);audio.configure(state.settings.sound,!!match&&!match.finished);
  if(result.ok&&panel&&!['tactics','kits'].includes(panel))renderPanel();
  updateHUD();return result;
}
function travel(target) {
  if(state.carry){toast('Carry your stolen footballer home on foot, or drop them.');return;}
  if(match&&!match.finished){toast('Use the spectator controls during your match.');return;}
  const base=worldData.bases[0];world.teleport(target==='pitch'?base.pitch.spawn:base.spawn);
  camera={...camera,mode:'avatar',yaw:0};world.setCamera(camera);toast(target==='pitch'?'Your home stadium':'Your base');
}
function playerCard(p,controls='owned',index=0) {
  const def=p.def||game.catalog.get(p.id)||p,stats=p.stats||def.stats||{};
  const title=p.name||def.name,trait=p.traitId?.replace(/([A-Z])/g,' $1')||def.style?.name;
  const assigned=state.staff.assignments.find(a=>a.uid===p.uid);
  const tags=[def.rarity,def.style?.name,p.level!==undefined?'Level '+p.level:null,p.mutationId&&p.mutationId!=='ordinary'?p.mutationId:null,trait];
  const controlsHTML=controls==='owned'?`${button(p.upgradeCost?`UPGRADE ${number(p.upgradeCost)}`:'MAX LEVEL','upgradePlayer',`data-uid="${esc(p.uid)}"`,!p.upgradeCost||state.battleLock)}${button(`SELL ${number(def.cost*.5)}`,'sell',`data-uid="${esc(p.uid)}"`,state.battleLock)}`:
    controls==='rival'?button('STEAL & CARRY','steal',`data-base="${index.base}" data-index="${index.index}"`,state.battleLock||!!state.carry):'';
  return `<article class="card"><div class="player-heading"><div class="portrait" aria-hidden="true" style="--shirt:${esc(def.color||'#2456a6')};--skin:${esc(def.appearance?.skinColor||def.skin||'#c99a73')}">${esc(def.number||index+1||1)}</div><div><h3>${esc(title)}</h3><small>${esc(def.clubName||def.nationality||'Footballer')} · ${esc(stats.naturalRole||def.style?.naturalRole||'ST')}</small></div></div><p>${tags.filter(Boolean).map(t=>`<span class="tag ${def.isIcon||def.variantOf?'legendary':''}">${esc(t)}</span>`).join('')}</p><div class="row"><span>Power <b>${Math.round(p.power||stats.power||def.power)}</b></span>${controls==='owned'?`<span><b>${number(p.income)}</b> /s</span>`:`<span class="price">${number(def.cost)} coins</span>`}</div><p class="muted">Pace ${Math.round(stats.pace||0)} · Attack ${Math.round(stats.attacking||0)} · Defense ${Math.round(stats.defending||0)}</p>${def.abilityName?`<p>${esc(def.abilityName)}</p>`:''}${assigned?`<p>Training: ${esc(assigned.kind)} · ${Math.max(0,Math.ceil(assigned.endsAt-game.now()))}s · income paused</p>${button('CANCEL TRAINING','cancelTraining',`data-uid="${esc(p.uid)}"`)}`:''}${p.staff?.injuryUntil>game.now()?'<p>Injured: assign your physio for treatment.</p>':''}<div class="row">${controlsHTML}</div></article>`;
}
function radar(team) {
  const values=axes.map(a=>team.reduce((sum,p)=>sum+(p.stats[a]||0),0)/11),center=[180,125],r=83;
  const point=(i,f)=>{const a=-Math.PI/2+i*Math.PI/3;return [center[0]+Math.cos(a)*r*f,center[1]+Math.sin(a)*r*f];};
  const polygon=f=>axes.map((_,i)=>point(i,f).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 360 250" role="img" aria-label="Team stats: ${esc(labels.map((l,i)=>l+' '+Math.round(values[i])).join(', '))}">${[.25,.5,.75,1].map(f=>`<polygon points="${polygon(f)}" fill="none" stroke="#b9c3ad"/>`).join('')}${axes.map((_,i)=>`<line x1="180" y1="125" x2="${point(i,1)[0]}" y2="${point(i,1)[1]}" stroke="#b9c3ad"/>`).join('')}<polygon points="${axes.map((_,i)=>point(i,Math.min(1,values[i]/110)).join(',')).join(' ')}" fill="#55954b" fill-opacity=".5" stroke="#285331" stroke-width="3"/>${labels.map((l,i)=>`<text x="${point(i,1.3)[0]}" y="${point(i,1.3)[1]}" text-anchor="middle" fill="#17232b" font-size="12">${l} ${Math.round(values[i])}</text>`).join('')}</svg>`;
}
function formationPoints(formation) {
  const points=[{x:50,y:88}];formations[formation].forEach((count,row)=>{for(let i=0;i<count;i++)points.push({x:14+(72*(i+.5)/count),y:[67,43,20][row]});});return points;
}
function tacticMembers() {
  return game.team(draft);
}
function tacticsHTML() {
  const members=tacticMembers(),points=formationPoints(draft.formation);
  return `<p class="notice">Choose your starting XI on the pitch. Drag one position onto another, or tap two positions to swap. Select a reserve below to replace the highlighted player.</p><div class="toolbar"><label>Formation ${select('formation',Object.keys(formations).map(v=>[v,v]),draft.formation)}</label><label>Approach ${select('mentality',[['balanced','Balanced build-up'],['pressing','High press'],['counter','Counterattack']],draft.mentality)}</label></div><div class="field"><div class="half-line"></div>${members.map((p,i)=>`<button class="position ${p.borrowed?'loan':''} ${selectedPosition===i?'selected':''}" style="left:${points[i].x}%;top:${points[i].y}%" draggable="${!p.borrowed}" data-position="${i}" aria-label="${esc(p.roleLabel+': '+p.name)}"><span class="number">${esc(p.roleLabel||p.role)}</span><strong>${esc(p.name.split(' ').slice(-1)[0])}</strong><span>${p.borrowed?'Academy loan':Math.round(p.power)}${draft.captainUid===p.uid?' · C':''}</span></button>`).join('')}</div><div class="toolbar">${button('AUTO PICK XI','autoXI')}${button('MAKE CAPTAIN','captain','',selectedPosition===null||members[selectedPosition]?.borrowed)}</div><div class="row"><h3>RESERVES & ROSTER</h3><small>Select a pitch position, then a player.</small></div><div class="toolbar">${state.roster.map(p=>button(p.name,'assignPosition',`data-uid="${esc(p.uid)}"`,selectedPosition===null)).join('')}</div><h3 class="section-title">TEAM PROFILE</h3>${radar(members)}<h3 class="section-title">FIVE LINEUP PRESETS</h3><div class="stack">${state.tactics.presets.map((p,i)=>`<div class="row card"><div><b>${i+1}. ${esc(p.name)}</b><p>${esc(p.formation)} · ${esc(p.mentality)}</p></div><div>${button('LOAD','loadPreset',`data-index="${i}"`)} ${button('SAVE XI','savePreset',`data-index="${i}"`)}</div></div>`).join('')}</div><div class="sticky-bottom">${button('APPLY TACTICS','applyTactics','',state.battleLock)}</div>`;
}
function kitPreview(kit) {
  const shapes=kit.pattern==='stripes'?[38,68,98].map(x=>`<rect x="${x}" width="17" height="160"/>`).join(''):kit.pattern==='hoops'?[40,75,110].map(y=>`<rect y="${y}" width="160" height="18"/>`).join(''):'';
  return `<div class="kit-preview"><svg width="160" height="180" viewBox="0 0 160 180" role="img" aria-label="${esc(kit.name)} ${kit.pattern} kit"><defs><clipPath id="shirt-clip"><path d="M0 26 35 0 58 13 102 13 125 0 160 26 133 60 123 51 123 150 37 150 37 51 27 60Z"/></clipPath></defs><g clip-path="url(#shirt-clip)"><rect width="160" height="160" fill="${kit.primary}"/><g fill="${kit.secondary}">${shapes}</g><text x="80" y="100" fill="${kit.pattern==='solid'?kit.secondary:'#17232b'}" text-anchor="middle" font-family="Bungee" font-size="45">10</text></g><rect x="37" y="153" width="86" height="24" rx="3" fill="${kit.shorts}"/></svg></div>`;
}
function reportHTML() {
  if(!report)return '<p>Complete a match to see your debrief.</p>';
  const reward=state.lastBattle?.reward||{},stats=report.stats||[{},{}];
  const rows=[['Possession','possessionPercent','%'],['Shots','shots',''],['On target','shotsOnTarget',''],['Saves','saves',''],['Pass accuracy','passAccuracy','%'],['Passes completed','passesCompleted',''],['Tackles','tackles',''],['Interceptions','interceptions',''],['Blocks','blocks',''],['Corners','corners',''],['Offsides','offsides',''],['Fouls','fouls',''],['Take-ons won','dribblesWon','']];
  return `<article class="card accent"><p class="eyebrow">${esc(report.forfeit?'MATCH ABANDONED':state.lastBattle?.outcome?.toUpperCase()||'FULL TIME')}</p><h2>YOUR TEAM ${report.score[0]} : ${report.score[1]} PRACTICE XI</h2>${report.penalties?`<p>Penalties: ${report.penalties.scores.join(' : ')}</p>`:''}<p class="price">+${number(reward.total)} coins</p><p>Income resumes after the match. Rewards scale with your owned XI and permanent income.</p></article><h3 class="section-title">MATCH STATS</h3><table class="stats-table"><thead><tr><th>Statistic</th><th>Your team</th><th>Practice XI</th></tr></thead><tbody>${rows.map(([label,key,suffix])=>`<tr><td>${label}</td><td>${stats[0][key]||0}${suffix}</td><td>${stats[1][key]||0}${suffix}</td></tr>`).join('')}</tbody></table><h3 class="section-title">COIN BREAKDOWN</h3><div class="stack">${Object.entries(reward).filter(([key,value])=>typeof value==='number'&&!['total','multiplier'].includes(key)).map(([key,value])=>`<div class="row"><span>${esc(key.replace(/([A-Z])/g,' $1'))}</span><b>${number(value)}</b></div>`).join('')}</div><h3 class="section-title">DEBRIEF</h3><p>${report.forfeit?'Abandoned matches earn no coins.':stats[0].shotsOnTarget>stats[1].shotsOnTarget?'Your team created more shots on target; keep a compact defense behind your attack.':'Try recycling possession into midfield and using a through ball before shooting.'}</p><p>Practice level ${state.practiceLevel}/3: it increases slightly for the next match only after a win by 4 or more goals.</p>${button('RETURN TO CLUB','leaveMatch')}`;
}
function matchHTML() {
  if(!match||match.finished)return reportHTML();
  const s=matchState;
  return `<div class="card accent"><h3>${s.score[0]} : ${s.score[1]} · ${esc(s.period)}</h3><p>${Math.ceil(s.timeRemaining)} seconds remaining · Team stamina ${Math.round(s.stamina[0])}%</p><p>Income is paused for this battle.</p></div><h3 class="section-title">TEAM PLAY CALLS</h3><div class="toolbar">${playButtons(true)}</div><h3 class="section-title">SUPERSTAR ABILITIES</h3><div class="stack">${(s.abilities||[]).map(a=>`<div class="card row"><div><b>${esc(a.name)}</b><p>${esc(a.playerName)} · ${Math.ceil(a.remaining||a.cooldown||0)}s</p></div>${button('ACTIVATE','ability',`data-id="${esc(a.id)}"`,!a.available)}</div>`).join('')||'<p>Select a superstar in your starting XI to use an ability.</p>'}</div><h3 class="section-title">ICON CONTROL</h3><p>Control an owned outfield Icon for 10 seconds with WASD; shared cooldown is 20 seconds.</p><div class="toolbar">${s.players.filter(p=>p.side===0&&p.def.isIcon&&!p.borrowed&&p.role!=='GK').map(p=>button(p.name,'controlIcon',`data-index="${p.index}"`)).join('')||'<p>No Icons in your XI.</p>'}${s.control?button('RELEASE CONTROL','releaseControl'):''}</div><h3 class="section-title">COACH SPECIAL PLAY</h3>${button('CALL SPECIAL PLAY','manager','',!state.staff.slots.tactics)}<p>Hire a tactical coach to unlock their special play.</p><div class="toolbar">${button('SUBSTITUTIONS','openSubs')}${button('ABANDON MATCH','forfeit')}</div>`;
}
const titles={roster:'YOUR FOOTBALLERS',shop:'TRANSFER STORE',events:'LIMITED EVENTS',tactics:'STARTING XI',kits:'CREATE YOUR KIT',staff:'COACHING STAFF',upgrades:'BUILD YOUR CLUB',collection:'PLAYER ALBUM',help:'HOW TO PLAY',match:'SQUAD BATTLE',subs:'SUBSTITUTIONS',rival:'RIVAL TEAM',market:'TRANSFER CONVEYOR'};
function openPanel(name) {
  previousFocus=document.activeElement;panel=name;keys.clear();touchVector={x:0,z:0};
  if(name==='tactics'){draft=clone(state.tactics);selectedPosition=null;}
  if(name==='kits')draft=clone(state.kit);
  $('sheet').hidden=false;renderPanel();$('close-sheet').focus();
}
function closePanel() {panel='';draft=null;$('sheet').hidden=true;previousFocus?.focus?.();}
function renderPanel() {
  if(!panel)return;$('sheet-title').textContent=titles[panel]||'YOUR CLUB';
  const content=$('sheet-content');
  if(panel==='roster')content.innerHTML=`<p class="notice">${state.roster.length}/18 owned players. Reserves still earn income; players assigned to coaches pause their income.</p><div class="grid">${state.roster.map((p,i)=>playerCard(p,'owned',i)).join('')||'<p class="empty">Recruit your first player from the conveyor. You start with 150 coins.</p>'}</div>`;
  if(panel==='market')content.innerHTML=`<p class="notice">Footballers move along the conveyor and teleport directly to your base after purchase.</p><div class="grid">${state.market.filter(m=>m.id).map(m=>{const p=marketDefinition(m.id);return `<article class="card"><h3>${esc(p.name)}</h3><p>${esc(p.rarity)} · Power ${p.power} · ${number(p.income)}/s</p><p class="price">${number(p.cost)} coins</p>${button('SIGN PLAYER','buy',`data-market="${m.marketId}" data-id="${p.id}"`,state.battleLock)}</article>`;}).join('')}</div>`;
  if(panel==='shop')content.innerHTML=`<p class="notice">Keep an eye on the conveyor for individual footballers. Eggs always hatch a level 1 player.</p>${button('VIEW CONVEYOR','openMarket')}<h3 class="section-title">PLAYER EGGS</h3><div class="grid">${data.eggs.map(e=>`<article class="card"><h3>${esc(e.name)}</h3><p>${esc(e.description)}</p><p class="price">${number(e.cost)} coins</p>${button('HATCH','egg',`data-id="${e.id}"`)}</article>`).join('')}<article class="card"><h3>MYSTERY PLAYER</h3><p>Rare 80% · Epic 18% · Icon 2%. Identity reveals on signing.</p><p class="price">2,000 coins</p>${button('REVEAL','mystery')}</article></div><h3 class="section-title">CLUB SUPPLIES</h3><div class="stack">${[['training','Training equipment',state.shop.trainingCost,'Permanent team income +10% per level, up to 3 levels.'],['sprint','Sprint boots',120,'Faster movement for 180 seconds.'],['incomeBoost','Income boost',180,'Extra income for 120 seconds, excluded from battle reward scaling.']].map(([id,name,cost,description])=>`<article class="card row"><div><h3>${name}</h3><p>${description}</p></div>${button(cost?`BUY ${number(cost)}`:'MAX LEVEL','shopBuy',`data-id="${id}"`,!cost)}</article>`).join('')}<article class="card"><h3>BASE DEFENSE</h3><p>Your whistle repels NPC thieves beside your base. The baton has a shorter cooldown.</p>${button(state.tools.includes('baton')?'BATON OWNED':'BUY BATON 350','buyTool','data-id="baton"',state.tools.includes('baton'))}</article></div>`;
  if(panel==='events') { const e=state.event;content.innerHTML=`<article class="card accent"><p class="eyebrow">${e.active?'LIVE NOW':'NEXT EVENT'}</p><h2>${esc(e.name)}</h2><p>${esc(e.objective)}</p><p>${Math.floor(e.remaining/60)}m ${Math.floor(e.remaining%60)}s remaining · ${number(e.tokens)} event tokens</p><div class="progress"><span style="width:${Math.min(100,e.progress/e.target*100)}%"></span></div><p>${number(e.progress)} / ${e.target}</p>${button(e.claimed?'CLAIMED':'CLAIM 10 TOKENS','eventClaim',`data-id="${esc(e.id)}"`,!e.active||e.claimed||e.progress<e.target)}</article><h3 class="section-title">LIMITED SIGNINGS</h3><div class="grid">${e.offers.map(o=>`<article class="card"><h3>${esc(o.name)}</h3><p>${esc(o.mutationId)} mutation</p><p class="price">${o.cost} tokens</p>${button('SIGN','eventBuy',`data-id="${o.id}" data-event="${esc(e.id)}"`,!o.available)}</article>`).join('')}</div><p>Events rotate on a 40-minute cycle. Mutation chances increase during the active event.</p>`;}
  if(panel==='tactics')content.innerHTML=tacticsHTML();
  if(panel==='kits')content.innerHTML=`<p class="notice">Pick colors, a pattern and a club name. Save to dress your starting XI and base squad.</p><div id="kit-preview">${kitPreview(draft)}</div><div class="toolbar"><label>Club name <input id="kit-name" maxlength="20" value="${esc(draft.name)}"></label><label>Pattern ${select('kit-pattern',[['solid','Solid'],['stripes','Stripes'],['hoops','Hoops']],draft.pattern)}</label></div><div class="grid">${[['primary','Shirt'],['secondary','Trim'],['shorts','Shorts']].map(([key,label])=>`<label>${label}<input type="color" id="kit-${key}" value="${draft[key]}"></label>`).join('')}</div><div class="toolbar">${button('SAVE & WEAR KIT','saveKit','',state.battleLock)}${button('USE PLAYER CLUB KITS','defaultKit','',state.battleLock)}</div>`;
  if(panel==='upgrades') {const next=state.stadium.next,teamCost=data.config.UpgradeCosts[state.teamUpgrade];content.innerHTML=`<article class="card accent"><h3>${esc(state.stadium.name)}</h3><p>Stadium tier ${state.stadiumLevel}/3. Home matches take place here.</p>${next?`<p>Next: ${esc(next.name)} · ${next.recruits} owned players required</p>${button(`BUILD ${number(next.cost)}`,'upgradeStadium')}`:'<p>Floodlit stadium complete.</p>'}</article><div class="card"><h3 class="section-title">TEAM DEVELOPMENT</h3><p>Level ${state.teamUpgrade}/3 · Income +${state.teamUpgrade*25}%</p>${button(teamCost?`UPGRADE ${number(teamCost)}`:'MAX LEVEL','upgradeTeam','',!teamCost)}</div><p>Use GO PITCH to visit your stadium, then build stands and lights here.</p>`;}
  if(panel==='staff')content.innerHTML=`<p class="notice">Buy coaches, then assign one footballer to each job. Only that player's income pauses. Attack and defense training take 120 seconds; conditioning takes 90 seconds; injury treatment takes 45 seconds.</p><div class="stack">${state.staffCatalog.map(c=>{const owned=state.staff.owned.includes(c.id),active=state.staff.slots[c.role]===c.id,job=state.staff.assignments.find(a=>a.role===c.role);return `<article class="card"><div class="row"><div><h3>${esc(c.name)}</h3><p>${esc(c.role)} ${c.specialPlay?'· Special play: '+esc(c.specialPlay):''}</p></div>${button(!owned?`HIRE ${number(c.cost)}`:active?'SELECTED':'SELECT',owned?'equipStaff':'hire',`data-id="${c.id}"`,active||state.battleLock)}</div>${owned&&active&&c.role!=='tactics'?job?`<p>${esc(game.catalog.get(job.id)?.name)} · ${esc(job.kind)} · ${Math.max(0,Math.ceil(job.endsAt-game.now()))}s</p>${button('CANCEL','cancelTraining',`data-uid="${esc(job.uid)}"`)}`:`<div class="toolbar"><label>Footballer ${select('staff-'+c.id,state.roster.map(p=>[p.uid,p.name]),'')}</label>${button('ASSIGN','assignStaff',`data-id="${c.id}"`,!state.roster.length||state.battleLock)}</div>`:''}</article>`;}).join('')}</div>`;
  if(panel==='collection')content.innerHTML=`<p>${state.collection.length} / ${data.players.length} identities discovered. Duplicate footballers develop different traits and mutations.</p><label>Find a footballer<input id="album-search" placeholder="Player or club name" type="search"></label><div id="album-grid" class="grid">${albumHTML('')}</div>`;
  if(panel==='help')content.innerHTML=`<div class="stack"><article class="card"><h3>BUILD YOUR TEAM</h3><p>WASD or arrow keys move; E interacts; Space jumps. Drag the world to turn the camera and scroll to zoom. On touch screens, use the joystick.</p><p>Buy a footballer on the conveyor with your starting 150 coins. They teleport to your base and start earning. Recruit 11 starters and 7 reserves, set your formation, and build a stadium.</p><p>Approach an NPC rival base, choose a footballer and carry them home. Teleporting is blocked during a steal. Use your home shield or whistle when an NPC thief approaches.</p></article><article class="card"><h3>WIN SQUAD BATTLES</h3><p>BATTLE starts an 11 v 11 match in your home stadium. Academy loans fill empty positions. Call passes, dribbles, shots and defensive plays. Icons can be controlled for 10 seconds with a 20-second cooldown.</p><p>Matches include offsides, fouls, corners, extra time and penalties. During shootouts you can aim and choose a save direction, or leave both automatic.</p><p>Income pauses while battling. The final sheet includes possession, shots, goals and a reward scaled to your team and income.</p></article><article class="card"><h3>SETTINGS & SAVE</h3><label><span><input id="low-graphics" type="checkbox" ${state.settings.lowGraphics?'checked':''}> Low graphics</span></label><label><span><input id="sound" type="checkbox" ${state.settings.sound?'checked':''}> Crowd and referee sounds</span></label><p>${esc(state.saveStatus)}. This solo version saves on this device; it does not share your Roblox wallet or progress.</p>${button('SAVE NOW','saveNow')}${button('RESET PROGRESS','resetRequest')}</article><article class="card"><h3>LOCAL TEST CODE</h3><p>DEVTEAM unlocks the source superstar/Icon testing squad and Barcola once, with no coin grant.</p><label>Code<input id="dev-code" placeholder="Enter code" autocomplete="off"></label>${button('REDEEM','developerCode')}</article><p><a href="./CREDITS.md" target="_blank" rel="noopener">Source and credits</a> · <a href="../../index.html">Back to the arcade</a></p></div>`;
  if(panel==='match')content.innerHTML=matchHTML();
  if(panel==='subs')content.innerHTML=!match||match.finished?'<p>Start a battle to use substitutions.</p>':`<p class="notice">${matchState.substitutions.used}/5 substitutions used. Changes happen at a safe stoppage. A goalkeeper can only replace another goalkeeper.</p><label>Player coming off${select('sub-out',matchState.players.filter(p=>p.side===0).map(p=>[p.index,p.roleLabel+' · '+p.name]),0)}</label><h3 class="section-title">BENCH</h3><div class="stack">${matchState.bench.map(p=>`<article class="card row"><div><h3>${esc(p.name)}</h3><p>${esc(p.stats.naturalRole)} · Power ${Math.round(p.power)}</p></div>${button('BRING ON','substitute',`data-uid="${esc(p.uid)}"`,!!matchState.substitutions.pending||matchState.substitutions.used>=5)}</article>`).join('')||'<p>Recruit reserves to fill your bench.</p>'}</div>`;
  if(panel==='rival') { const rival=state.rivals[panelBase],shield=Math.max(0,Math.ceil(rival.shieldUntil-game.now()));content.innerHTML=`<p class="notice">NPC team ${panelBase+1}. ${shield?'Shield active: '+shield+'s.':'Choose a player, then carry them to your home deposit pad.'}</p><div class="grid">${rival.roster.map((p,i)=>playerCard(p,'rival',{base:panelBase,index:i})).join('')||'<p>No available footballers.</p>'}</div>`;}
}
function albumHTML(query) {query=query.toLowerCase();return data.players.filter(p=>(p.name+' '+p.clubName).toLowerCase().includes(query)).map(p=>`<article class="card"><h3>${esc(p.name)}</h3><p>${esc(p.clubName||p.nationality)} · ${esc(p.rarity)} · ${p.power}</p><p>${esc(p.style.name)} · ${state.collection.includes(p.id)?'DISCOVERED':'UNDISCOVERED'}</p>${(p.stats.signaturePlaystyles||[]).map(s=>`<span class="tag">${esc(s.name)}</span>`).join('')}${data.abilities.filter(a=>a.playerId===p.id).map(a=>`<p><b>${esc(a.name)}</b></p>`).join('')}</article>`).join('');}

let panelBase=0;
function swapPositions(a,b) {
  if(a===b||state.battleLock)return;
  const members=tacticMembers();
  if(members.some(p=>p.borrowed)){toast('Recruit 11 owned players before freely swapping the whole XI.');return;}
  draft.selectedUids=members.map(p=>p.uid);[draft.selectedUids[a],draft.selectedUids[b]]=[draft.selectedUids[b],draft.selectedUids[a]];
  selectedPosition=b;renderPanel();
}
function assignPosition(uid) {
  const members=tacticMembers(),i=selectedPosition;
  if(i===null)return;
  const existing=members.findIndex(p=>p.uid===uid);if(existing>=0){swapPositions(existing,i);return;}
  if(members.some(p=>p.borrowed)) {
    draft.selectedUids=[...new Set([...draft.selectedUids,uid])].slice(0,11);toast('Player added to the automatic XI. Full position swaps unlock at 11 owned starters.');
  } else {draft.selectedUids=members.map(p=>p.uid);draft.selectedUids[i]=uid;}
  renderPanel();
}
function startBattle() {
  if(match&&!match.finished){openPanel('match');return;}
  const result=act('beginBattle');if(!result.ok)return;
  const team=game.team(),selected=new Set(team.map(p=>p.uid));
  match=new Match(team,game.practiceTeam(),{data,formation:state.tactics.formation,mentality:state.tactics.mentality,kit:state.kit,practice:true,
    managerId:state.staff.slots.tactics,incomeRate:game.battleScaling.incomeRate,bench:game.ownedMembers().filter(p=>!selected.has(p.uid)).slice(0,7),seed:Math.floor(Math.random()*2**32)});
  matchState=match.snapshot();report=null;commentarySerial=-1;audioSerial=-1;captionQueue=[];captionUntil=0;beforeCelebration=null;celebrationSerial=null;
  camera={...camera,mode:'ball',index:0,yaw:0,pitchIndex:0,zoom:.85};world.setCamera(camera);world.teleport(worldData.bases[0].pitch.spawn);closePanel();
  $('follow').innerHTML='<option value="ball">FOLLOW BALL</option><option value="pitch">FULL PITCH</option>'+match.players.map((p,i)=>`<option value="${i}">${p.side===0?'YOUR':'XI'} · ${esc(p.name)}</option>`).join('');
  lastControlsKey='';audio.start();audio.configure(state.settings.sound,true);updateHUD();
}
function finishBattle(forfeit=false) {
  if(!match||report)return;
  if(forfeit) {
    const s=match.snapshot(),total=s.stats[0].possessionSeconds+s.stats[1].possessionSeconds;
    report={forfeit:true,score:s.score,winner:1,injuries:[...match.injuryUIDs],stats:s.stats.map(p=>({...p,possessionPercent:total?Math.round(p.possessionSeconds/total*100):0,passAccuracy:p.passesAttempted?Math.round(p.passesCompleted/p.passesAttempted*100):0}))};
    match.finished=true;
  } else report=clone(match.result);
  act('endBattle',{result:report});matchState=match.snapshot();audio.configure(state.settings.sound,false);if(forfeit)audio.cue('fullTime');
  camera={...camera,mode:'pitch'};world.setCamera(camera);$('caption').hidden=true;openPanel('match');updateHUD();
}
const attackPlays=[['throughBall','THROUGH','Z'],['lobbedBall','LOB','X'],['dribble','DRIBBLE','C'],['shoot','SHOOT','V'],['recycle','RECYCLE','B'],['forwardRuns','RUNS','N'],['overlap','OVERLAP','M']];
const defensePlays=[['contain','CONTAIN','Z'],['compact','COMPACT','X'],['highPress','PRESS','C'],['slideTackle','TACKLE','V']];
function playButtons(all=false) {
  return (all?[...attackPlays,...defensePlays]:callMode==='attack'?attackPlays:defensePlays).map(([id,label,key])=>button(`${label}${all?'':' '+key}`,'play',`data-id="${id}"`)).join('');
}
function runPlay(id) {if(match&&!match.finished){const r=match.callPlay(id);toast(r.message||'Play called');matchState=match.snapshot();}}
function setFollow(value) {
  beforeCelebration=null;camera={...camera,mode:value==='ball'||value==='pitch'?value:'player',index:Number(value)||0};world.setCamera(camera);$('follow').value=value;
}
function queueCommentary(event) {
  if(event.serial===commentarySerial)return;commentarySerial=event.serial;
  if(!event.important)captionQueue=captionQueue.filter(e=>e.important);
  captionQueue.push(event);if(captionQueue.length>4)captionQueue.splice(0,captionQueue.length-4);
}
function updateMatchUI(now) {
  if(!match)return;
  const s=matchState;
  $('score').textContent=s.score.join(' : ');$('match-period').textContent=s.penalties?'PENALTIES':s.period==='regulation'?'REGULATION':'EXTRA TIME';
  $('match-clock').textContent=s.penalties?s.penalties.scores.join(' : ')+' PK':Math.ceil(s.timeRemaining)+'s';
  queueCommentary(s.commentary);
  for(const event of s.events||[])if(event.serial>audioSerial){audio.cue(event.kind);audioSerial=event.serial;}
  if(now>=captionUntil&&captionQueue.length){const e=captionQueue.shift();$('caption').textContent=e.text;$('caption').hidden=false;captionUntil=now+(e.important?6000:4500);}
  if(now>=captionUntil&&!captionQueue.length)$('caption').hidden=true;
  const notice=s.penalties?`PENALTIES · ${s.penalties.side===0?'YOUR SHOT':'YOUR SAVE'} · ${s.penalties.phase}`:s.restart?`${s.restart.kind.replace(/([A-Z])/g,' $1').toUpperCase()}`:s.phase==='goalCelebration'?'GOAL!':s.control?'ICON CONTROL · '+Math.max(0,Math.ceil(s.control.endsAt-s.elapsed))+'s':'';
  $('referee').hidden=!notice;$('referee').textContent=notice;
  const key=JSON.stringify([!!s.penalties,s.penalties?.side,s.penalties?.manual,callMode,!!s.control,s.finished]);
  if(key!==lastControlsKey){lastControlsKey=key;$('match-controls').innerHTML=s.finished?'':s.penalties?`${button(s.penalties.manual?'AUTO':'MANUAL','penaltyMode')}${['left','center','right'].map(d=>button(d.toUpperCase(),s.penalties.side===0?'penaltyAim':'penaltySave',`data-id="${d}"`)).join('')}${s.penalties.side===0?button('SHOOT','penaltyShoot'):''}`:`${button(callMode==='attack'?'ATTACK PLAYS':'DEFENSE PLAYS','togglePlays')}${playButtons()}${button('ABILITY F','quickAbility')}${button(s.control?'RELEASE ICON':'CONTROL ICON','quickIcon')}`;}
  if(s.celebration&&s.phase==='goalCelebration') {
    if(celebrationSerial!==s.commentary.serial&&!beforeCelebration){beforeCelebration={...camera};celebrationSerial=s.commentary.serial;camera={...camera,mode:'celebration'};world.setCamera(camera);}
  }else if(beforeCelebration){camera=beforeCelebration;beforeCelebration=null;world.setCamera(camera);}
}
function updateHUD() {
  if(!state)return;$('coins').textContent=number(state.coins);$('income').textContent=state.battleLock?'PAUSED':number(state.incomeRate)+' /s';
  $('club-name').textContent=state.kit.enabled?state.kit.name:'COBALT FC';$('roster-count').textContent=state.roster.length+' / 18 players';$('save-status').textContent=state.saveStatus;
  const active=!!match&&!match.finished;$('score-strip').hidden=!match;$('match-controls').hidden=!active;$('spectator').hidden=!active;
  $('battle').lastChild.textContent=active?' MATCH':' BATTLE';
  $('shield').title=state.shieldUntil>game.now()?'Shield active':'Activate at your home shield pad';
  if(state.npcAttempt) {
    const p=state.roster.find(p=>p.uid===state.npcAttempt.uid);$('thief-alert').hidden=false;
    $('thief-alert').innerHTML=`NPC THIEF · ${esc(p?.name||'Footballer')}<p>${Math.max(0,Math.ceil(state.npcAttempt.endsAt-game.now()))}s to defend</p>${button('GO HOME','home')}${button('BLOW WHISTLE','defend','data-id="whistle"')}${state.tools.includes('baton')?button('USE BATON','defend','data-id="baton"'):''}`;
  }else $('thief-alert').hidden=true;
  if(active){$('interaction').hidden=true;return;}
  nearest=world.interactions()[0];
  let text='';
  if(state.carry){text='CARRYING '+game.catalog.get(state.carry.player.id).name.toUpperCase();if(nearest?.action==='deposit')text='E · DELIVER FOOTBALLER HOME';}
  else if(nearest){const p=nearest.marketId?state.market.find(m=>m.marketId===nearest.marketId):null;const def=p?.id?marketDefinition(p.id):null;text=def?`E · SIGN ${def.name} · ${number(def.cost)} COINS`:`E · ${nearest.name||nearest.panel||nearest.action||'INTERACT'}`;}
  $('interaction').hidden=!text;$('interaction').textContent=text;
  if(route||state.carry){const home=worldData.bases[0].deposit,dx=home[0]-world.avatar.x,dz=home[2]-world.avatar.z;$('route-label').hidden=false;$('route-label').textContent=`YOUR BASE · ${Math.ceil(Math.hypot(dx,dz))}m · ${Math.abs(dx)>Math.abs(dz)?dx>0?'EAST →':'WEST ←':dz>0?'SOUTH ↓':'NORTH ↑'}`;}else $('route-label').hidden=true;
}
function interact() {
  if(panel||!started||match&&!match.finished)return;
  nearest=world.interactions()[0];
  if(state.carry){if(nearest?.action==='deposit')act('deposit');else openCarry();return;}
  if(!nearest){toast('Move beside a footballer, rival base or club attendant.');return;}
  if(nearest.action==='buy'){const item=state.market.find(m=>m.marketId===nearest.marketId);act('buy',{marketId:nearest.marketId,expectedId:item?.id});}
  else if(nearest.action==='rival'){panelBase=nearest.base===-1?11:nearest.base-1;openPanel('rival');}
  else if(nearest.action==='deposit')openPanel('roster');
  else if(nearest.action==='travel')travel('pitch');
  else openPanel(nearest.panel||'market');
}
function openCarry(){openPanel('carry');$('sheet-title').textContent='CARRY YOUR FOOTBALLER HOME';$('sheet-content').innerHTML=`<p>Follow the home route to your deposit pad. Teleporting is locked during a steal.</p>${button('DROP & RETURN TO RIVAL','drop')}`;}

function handleAction(target) {
  const name=target.dataset.action;if(!name)return;
  const id=target.dataset.id,uid=target.dataset.uid,index=Number(target.dataset.index);
  if(name==='home'){travel('home');return;}
  if(name==='openMarket'){openPanel('market');return;}
  if(name==='openSubs'){openPanel('subs');return;}
  if(name==='play'){runPlay(id);return;}
  if(name==='ability'){const r=match?.ability(id);if(r)toast(r.message);return;}
  if(name==='manager'){const manager=state.staffCatalog.find(c=>c.id===state.staff.slots.tactics);const r=match?.callPlay(manager?.specialPlay);if(r)toast(r.message);return;}
  if(name==='togglePlays'){callMode=callMode==='attack'?'defense':'attack';lastControlsKey='';return;}
  if(name==='quickAbility'){const a=matchState?.abilities?.find(a=>a.available);if(!a)toast('No superstar ability is ready.');else{const r=match.ability(a.id);toast(r.message);}return;}
  if(name==='quickIcon'){if(matchState?.control){match.releaseControl();return;}const p=match?.players.find(p=>p.side===0&&p.def.isIcon&&!p.borrowed&&p.role!=='GK');if(p){const r=match.control(p.index);toast(r.message);if(r.ok)setFollow(String(p.index));}else toast('Add an Icon to your starting XI.');return;}
  if(name==='controlIcon'){const r=match.control(index);toast(r.message);if(r.ok){setFollow(String(index));closePanel();}return;}
  if(name==='releaseControl'){match.releaseControl();toast('Icon released');return;}
  if(name==='substitute'){const member=match.bench.find(p=>p.uid===uid);const r=match.substitute(Number($('sub-out').value),member);toast(r.message);matchState=match.snapshot();renderPanel();return;}
  if(name.startsWith('penalty')){const payload=name==='penaltyAim'?{direction:id}:name==='penaltySave'?{saveDirection:id}:name==='penaltyShoot'?{shoot:true}:{manual:!matchState.penalties.manual};const r=match.penaltyInput(payload);if(!r.ok)toast(r.message);matchState=match.snapshot();return;}
  if(name==='forfeit'){showConfirm('Abandon this match? You will receive no battle coins.','confirmForfeit');return;}
  if(name==='confirmForfeit'){closePanel();finishBattle(true);return;}
  if(name==='cancelConfirm'){closePanel();return;}
  if(name==='leaveMatch'){match=null;matchState=null;report=null;closePanel();travel('home');updateHUD();return;}
  if(name==='applyTactics'){act('tactics',{formation:draft.formation,mentality:draft.mentality,selectedUids:draft.selectedUids,captainUid:draft.captainUid});return;}
  if(name==='autoXI'){draft.selectedUids=[];draft.captainUid=null;selectedPosition=null;renderPanel();return;}
  if(name==='captain'){const p=tacticMembers()[selectedPosition];if(p&&!p.borrowed){draft.captainUid=p.uid;renderPanel();}return;}
  if(name==='assignPosition'){assignPosition(uid);return;}
  if(name==='savePreset'){const r=act('tactics',{formation:draft.formation,mentality:draft.mentality,selectedUids:draft.selectedUids,captainUid:draft.captainUid});if(r.ok){act(name,{index});renderPanel();}return;}
  if(name==='loadPreset'){if(act(name,{index}).ok){draft=clone(state.tactics);selectedPosition=null;renderPanel();}return;}
  if(name==='saveKit'){const r=act('kit',{...draft,enabled:true});if(r.ok){draft=clone(state.kit);renderPanel();}return;}
  if(name==='defaultKit'){if(act('kit',{enabled:false}).ok){draft=clone(state.kit);renderPanel();}return;}
  if(name==='assignStaff'){act(name,{id,uid:$('staff-'+id).value});return;}
  if(name==='developerCode'){act(name,{code:$('dev-code').value.trim().toUpperCase()});return;}
  if(name==='saveNow'){game.save();state=game.snapshot();toast(state.saveStatus);return;}
  if(name==='resetRequest'){showConfirm('Reset your local club, coins and recruits on this device?','confirmReset');return;}
  if(name==='confirmReset'){game.reset();state=game.snapshot();match=null;matchState=null;report=null;closePanel();travel('home');toast('New local club created');return;}
  const payload=name==='buy'?{marketId:target.dataset.market,expectedId:id}:name==='steal'?{base:Number(target.dataset.base),index}:name==='eventBuy'?{id,eventId:target.dataset.event}:name==='defend'?{tool:id}:uid?{uid}:id?{id}:{};
  const result=act(name,payload);if(result.ok&&['steal','drop'].includes(name)){closePanel();route=!!state.carry;}
}
function showConfirm(message,action){openPanel('confirm');$('sheet-title').textContent='CONFIRM';$('sheet-content').innerHTML=`<p>${esc(message)}</p><div class="toolbar">${button('CONFIRM',action)}${button('CANCEL','cancelConfirm')}</div>`;}

document.addEventListener('click',e=>{
  const target=e.target.closest('button');if(!target||target.disabled)return;
  if(target.dataset.panel){openPanel(target.dataset.panel);return;}
  if(target.dataset.position!==undefined){const i=Number(target.dataset.position);if(selectedPosition!==null&&selectedPosition!==i)swapPositions(selectedPosition,i);else{selectedPosition=i;renderPanel();}return;}
  handleAction(target);
});
$('close-sheet').onclick=closePanel;$('interaction').onclick=interact;$('home').onclick=()=>travel('home');$('pitch').onclick=()=>travel('pitch');
$('route').onclick=()=>{route=!route;updateHUD();};$('battle').onclick=startBattle;$('shield').onclick=()=>act('shield');
$('menu-toggle').onclick=()=>$('actions').classList.toggle('collapsed');
$('previous').onclick=()=>setFollow(String((camera.index+21)%22));$('next').onclick=()=>setFollow(String((camera.index+1)%22));
$('follow').onchange=e=>setFollow(e.target.value);
function zoom(delta){camera.zoom=Math.max(.35,Math.min(2.5,camera.zoom+delta));world?.setCamera(camera);}
$('zoom-in').onclick=()=>zoom(.15);$('zoom-out').onclick=()=>zoom(-.15);
$('sheet-content').addEventListener('input',e=>{
  const id=e.target.id;
  if(id==='album-search'){$('album-grid').innerHTML=albumHTML(e.target.value);return;}
  if(id==='low-graphics'||id==='sound'){act('settings',{[id==='sound'?'sound':'lowGraphics']:e.target.checked});return;}
  if(panel==='kits'&&id.startsWith('kit-')){const key=id.slice(4);draft[key==='pattern'?'pattern':key]=e.target.value;$('kit-preview').innerHTML=kitPreview(draft);}
});
$('sheet-content').addEventListener('change',e=>{if(panel==='tactics'&&['formation','mentality'].includes(e.target.id)){draft[e.target.id]=e.target.value;renderPanel();}});
let draggedPosition;
$('sheet-content').addEventListener('dragstart',e=>{const target=e.target.closest('[data-position]');if(!target)return;draggedPosition=Number(target.dataset.position);e.dataTransfer.setData('text/plain',String(draggedPosition));});
$('sheet-content').addEventListener('dragover',e=>{const target=e.target.closest('[data-position]');if(target){e.preventDefault();target.classList.add('drag-over');}});
$('sheet-content').addEventListener('dragleave',e=>e.target.closest('[data-position]')?.classList.remove('drag-over'));
$('sheet-content').addEventListener('drop',e=>{const target=e.target.closest('[data-position]');if(target){e.preventDefault();swapPositions(draggedPosition,Number(target.dataset.position));}});
const editable=target=>target.closest('input,select,textarea,button,a');
window.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&panel){e.preventDefault();closePanel();return;}
  if(panel||!started||editable(e.target))return;
  const key=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
  keys.add(key);if(e.repeat)return;
  if(key==='e')interact();if(key===' '&&!match)world.jump();
  if(match&&!match.finished){const play=(callMode==='attack'?attackPlays:defensePlays).find(p=>p[2].toLowerCase()===key);if(play)runPlay(play[0]);if(key==='f')handleAction({dataset:{action:'quickAbility'}});}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
function releaseInputs(){keys.clear();touchVector={x:0,z:0};pointer=null;$('stick').style.transform='';lastTime=0;}
window.addEventListener('blur',releaseInputs);document.addEventListener('visibilitychange',()=>{releaseInputs();audio.configure(state?.settings.sound&&!document.hidden,!!match&&!match.finished);});
$('sheet').addEventListener('keydown',e=>{if(e.key!=='Tab')return;const focusable=[...$('sheet').querySelectorAll('button:not(:disabled),input,select,a')];const first=focusable[0],last=focusable.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
const canvas=$('world');
canvas.addEventListener('pointerdown',e=>{if(!started||panel)return;canvas.focus();pointer={id:e.pointerId,x:e.clientX};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(pointer?.id!==e.pointerId)return;camera.yaw+=(e.clientX-pointer.x)*.008;pointer.x=e.clientX;world.setCamera(camera);});
canvas.addEventListener('pointerup',()=>pointer=null);canvas.addEventListener('pointercancel',()=>pointer=null);
canvas.addEventListener('wheel',e=>{if(!started||panel)return;e.preventDefault();zoom(-Math.sign(e.deltaY)*.1);},{passive:false});
const joystick=$('joystick');let stickPointer;
function moveStick(e){if(stickPointer!==e.pointerId)return;const r=joystick.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/40,z=(e.clientY-r.top-r.height/2)/40;const length=Math.max(1,Math.hypot(x,z));touchVector={x:x/length,z:z/length};$('stick').style.transform=`translate(${touchVector.x*33}px,${touchVector.z*33}px)`;}
joystick.onpointerdown=e=>{stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);};joystick.onpointermove=moveStick;
joystick.onpointerup=joystick.onpointercancel=()=>{stickPointer=null;touchVector={x:0,z:0};$('stick').style.transform='';};
$('touch-jump').onclick=()=>{if(!match)world.jump();};$('touch-interact').onclick=interact;
window.addEventListener('resize',()=>world?.resize());
window.addEventListener('pagehide',e=>{game?.save();if(!e.persisted){audio.dispose();world?.dispose();}});

function frame(now) {
  const dt=lastTime?Math.min(.05,(now-lastTime)/1000):0;lastTime=now;
  if(started&&!document.hidden) {
    game.tick(dt);uiTime+=dt;sheetTime+=dt;
    const vector={x:((keys.has('d')||keys.has('arrowright'))?1:0)-((keys.has('a')||keys.has('arrowleft'))?1:0)+touchVector.x,z:((keys.has('s')||keys.has('arrowdown'))?1:0)-((keys.has('w')||keys.has('arrowup'))?1:0)+touchVector.z};
    if(match&&!match.finished) {
      if(match.controlState&&!panel)match.control(match.controlState.index,vector);
      matchState=match.update(dt);updateMatchUI(now);if(match.finished)finishBattle();
    }else if(!panel) {
      const length=Math.max(1,Math.hypot(vector.x,vector.z)),sin=Math.sin(camera.yaw),cos=Math.cos(camera.yaw);
      const speed=game.state.sprintUntil>game.now()?1.5:1;
      world.moveAvatar({x:(vector.x*cos+vector.z*sin)/length,z:(vector.z*cos-vector.x*sin)/length},dt*speed);
    }
    if(uiTime>.2){uiTime=0;state=game.snapshot();lineup=game.team();updateHUD();}
    if(sheetTime>1&&['match','subs','staff','events','market'].includes(panel)&&!document.activeElement?.closest('#sheet-content')){sheetTime=0;const scroll=$('sheet-content').scrollTop;renderPanel();$('sheet-content').scrollTop=scroll;}
    const displayState={...state,lineup,kit:panel==='kits'?{...draft,enabled:true}:state.kit};
    world.update(dt,{state:displayState,match,camera,lowGraphics:state.settings.lowGraphics});
    if(now>toastUntil)$('toast').hidden=true;
  }else if(world&&!document.hidden)world.update(dt,{state:{...state,lineup},camera,lowGraphics:state.settings.lowGraphics});
  requestAnimationFrame(frame);
}
function deepFreeze(value){if(value&&typeof value==='object'){Object.freeze(value);for(const v of Object.values(value))deepFreeze(v);}return value;}
// Detached read-only diagnostics for renderer and browser regression evidence.
window.footballerSnapshot=()=>deepFreeze(clone({started,panel,state:game?.snapshot(),world:world?.snapshot(),match:match?.snapshot(),report}));
async function boot() {
  try {
    [data,worldData]=await Promise.all(['./data/catalog.json','./data/world.json'].map(async url=>{const response=await fetch(url);if(!response.ok)throw new Error('Could not load '+url);return response.json();}));
    game=new Game(data);state=game.snapshot();lineup=game.team();world=new World(canvas,{data,worldData});world.setCamera(camera);
    $('load-status').textContent='125 footballers · 11 v 11 · your home stadium';$('start').disabled=false;
    $('start').onclick=()=>{started=true;$('loading').hidden=true;$('hud').hidden=false;audio.start();audio.configure(state.settings.sound,false);canvas.focus();updateHUD();if(!state.roster.length)toast('Walk to the conveyor or open SHOP to sign your first footballer.');};
    requestAnimationFrame(frame);
  } catch(error) {$('load-status').textContent='The game could not start: '+error.message;console.error(error);}
}
boot();
