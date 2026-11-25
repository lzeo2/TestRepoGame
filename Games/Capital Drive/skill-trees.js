// Career training is earned once per real completion source, never by time spent.
const node=(id,name,branch,cost,requires,description,effects)=>Object.freeze({id,name,branch,cost,requires:Object.freeze(requires),description,effects:Object.freeze(effects)});
export const SKILL_TREES=Object.freeze({
  player:Object.freeze([
    node('steady-stride','Steady stride','Fitness',1,[],'Walk and sprint 5% faster.',{footSpeed:1.05}),
    node('second-wind','Second wind','Fitness',2,['steady-stride'],'Medical recovery takes 20% less time.',{recoveryDuration:.8}),
    node('careful-hands','Careful hands','Practical work',1,[],'Repair kits restore 10 extra condition.',{repairAmount:10}),
    node('shift-lead','Shift lead','Practical work',2,['careful-hands'],'Completed paid shifts earn 20% more.',{workReward:1.2}),
  ]),
  crew:Object.freeze([
    node('keep-pace','Keep pace','Regroup',1,[],'Following crew walk 15% faster.',{crewRegroup:1.15}),
    node('quick-regroup','Quick regroup','Regroup',2,['keep-pace'],'Blocked crew retry safe regrouping 30% sooner.',{crewRetry:.7}),
    node('close-formation','Close formation','Teamwork',1,[],'Following crew retain a 25% tighter formation.',{crewFormation:.75}),
    node('shared-shift','Shared shift','Teamwork',2,['close-formation'],'A nearby crew member adds 15% to completed shift pay.',{crewWorkReward:1.15}),
  ]),
});
const KINDS=new Set(['job','mission','work','workout','delivery','activity']);
const CAPS=Object.freeze(Object.fromEntries(Object.entries(SKILL_TREES).map(([track,nodes])=>[track,nodes.reduce((sum,node)=>sum+node.cost,0)])));
const NEUTRAL=Object.freeze({footSpeed:1,recoveryDuration:1,repairAmount:0,workReward:1,crewRegroup:1,crewRetry:1,crewFormation:1,crewWorkReward:1});
const validReceipt=id=>typeof id==='string'&&/^(job|mission|work|workout|delivery|activity):[a-zA-Z0-9][a-zA-Z0-9:_-]{0,95}$/.test(id);
const record=value=>value&&typeof value==='object'&&!Array.isArray(value);
const allowed=ctx=>record(ctx)&&(ctx.mode==='campaign'||ctx.mode==='street')&&ctx.sandbox!==true&&ctx.preview!==true&&ctx.paused!==true&&ctx.recovering!==true;
const fresh=()=>({version:2,player:{earned:0,unlocked:[],receipts:[]},crew:{earned:0,unlocked:[],receipts:[]}});
export function sanitizeSkillSave(saved){
  const clean=fresh();
  if(!record(saved)||![1,2].includes(saved.version))return clean;
  for(const track of ['player','crew']){
    const source=saved[track];
    if(!record(source)||!Number.isSafeInteger(source.earned)||source.earned<0||source.earned>(saved.version===1?12:CAPS[track])||!Array.isArray(source.unlocked))continue;
    const ids=new Set(source.unlocked.filter(id=>typeof id==='string'));
    let spent=0;
    for(const entry of SKILL_TREES[track])if(ids.has(entry.id)&&entry.requires.every(id=>clean[track].unlocked.includes(id))&&spent+entry.cost<=source.earned){clean[track].unlocked.push(entry.id);spent+=entry.cost;}
    clean[track].earned=Math.min(CAPS[track],source.earned);
    // Old receipts did not record whether crew were present. Preserve the player
    // lockout, but let late hires earn their remaining points from real repeats.
    const receipts=saved.version===1?(track==='player'?saved.receipts:[]):source.receipts;
    if(Array.isArray(receipts))clean[track].receipts=[...new Set(receipts.filter(validReceipt))].slice(0,CAPS[track]);
  }
  return clean;
}
export function createSkillTrees(saved){
  const state=sanitizeSkillSave(saved);
  let soloEffects,crewEffects;
  function refreshEffects(){
    const value={...NEUTRAL};
    for(const track of ['player','crew'])for(const entry of SKILL_TREES[track])if(state[track].unlocked.includes(entry.id))Object.assign(value,entry.effects);
    crewEffects=Object.freeze(value);soloEffects=Object.freeze({...value,crewWorkReward:1});
  }
  refreshEffects();
  const spent=track=>SKILL_TREES[track].filter(node=>state[track].unlocked.includes(node.id)).reduce((sum,node)=>sum+node.cost,0);
  const serialize=()=>JSON.parse(JSON.stringify(state));
  function award(completion,ctx){
    if(!allowed(ctx)||completion?.success!==true||!KINDS.has(completion.kind)||typeof completion.id!=='string'||! /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,95}$/.test(completion.id))return false;
    const key=`${completion.kind}:${completion.id}`;
    let changed=false;
    for(const track of ['player','crew']){
      const account=state[track];
      if(track==='crew'&&ctx.crewPresent!==true||account.earned>=CAPS[track]||account.receipts.includes(key)||account.receipts.length>=CAPS[track])continue;
      account.receipts.push(key);account.earned++;changed=true;
    }
    return changed;
  }

  function purchase(track,id,ctx){
    if(!allowed(ctx)||!Object.hasOwn(SKILL_TREES,track))return {ok:false,message:'Training is available during an active career.'};
    const entry=SKILL_TREES[track].find(node=>node.id===id),current=state[track];
    if(!entry||current.unlocked.includes(id))return {ok:false,message:'Choose an available skill.'};
    if(!entry.requires.every(id=>current.unlocked.includes(id)))return {ok:false,message:'Learn the preceding skill first.'};
    if(current.earned-spent(track)<entry.cost)return {ok:false,message:'Complete more jobs or activities to earn training points.'};
    current.unlocked.push(id);refreshEffects();return {ok:true,message:`Learned ${entry.name}.`};
  }
  function effects(ctx){return !allowed(ctx)?NEUTRAL:ctx.crewPresent===true?crewEffects:soloEffects;}
  function describe(track){
    if(!Object.hasOwn(SKILL_TREES,track))return null;
    return {earned:state[track].earned,points:state[track].earned-spent(track),nodes:SKILL_TREES[track].map(entry=>({...entry,unlocked:state[track].unlocked.includes(entry.id),available:!state[track].unlocked.includes(entry.id)&&entry.requires.every(id=>state[track].unlocked.includes(id))&&state[track].earned-spent(track)>=entry.cost}))};
  }
  return {award,purchase,effects,describe,serialize};
}
