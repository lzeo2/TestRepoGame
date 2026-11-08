/* Local-only cosmetic progression. Saved data never supplies physics values. */
(function(root,factory){'use strict';const api=factory(typeof module==='object'&&module.exports?require('./levels.js').length:root.LauncherLevels.length);if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.LauncherProgress=api;}(typeof window!=='undefined'?window:null,function(count){
  'use strict';
  const key='schoolyard-cast-progress-v1',roles=['jack','ian','sim'];
  const base={id:'base',name:'Original',body:null,cap:null};
  const skins={
    jack:[base,{id:'field',name:'Field',body:'#47675f',cap:'#bfa676',stars:10},{id:'brick',name:'Brick',body:'#a26552',cap:'#d0b88b',stars:30},{id:'captain',name:'Captain',body:'#6f717b',cap:'#e3cf8d',chapter:20}],
    ian:[base,{id:'slate',name:'Slate',body:'#4a626b',cap:'#bec7c0',stars:12},{id:'rust',name:'Rust',body:'#77564b',cap:'#9faaa8',stars:32},{id:'coach',name:'Coach',body:'#586b84',cap:'#d7c386',chapter:20}],
    sim:[base,{id:'clay',name:'Clay',body:'#8c6655',cap:'#c7b38e',stars:15},{id:'pine',name:'Pine',body:'#426658',cap:'#90ac8b',stars:35},{id:'pilot',name:'Pilot',body:'#7e5f75',cap:'#d4bea0',chapter:20}]
  };
  for(const entries of Object.values(skins)){entries.forEach(Object.freeze);Object.freeze(entries);}Object.freeze(skins);
  const level=n=>Number.isInteger(n)&&n>=1&&n<=count;
  const score=n=>Number.isInteger(n)&&n>=0&&n<=10000000;
  function fresh(){return {version:1,highest:1,stars:{},scores:{},equipped:{jack:'base',ian:'base',sim:'base'}};}
  function totalStars(p){return Object.values(p.stars).reduce((a,b)=>a+b,0);}
  function owned(p,role,id){
    if(!roles.includes(role))return false;
    const skin=skins[role].find(s=>s.id===id);
    return Boolean(skin&&(id==='base'||skin.stars&&totalStars(p)>=skin.stars||skin.chapter&&p.stars[skin.chapter]>0));
  }
  function equip(p,role,id){if(!owned(p,role,id))return false;p.equipped[role]=id;return true;}
  function normalize(raw){
    const p=fresh();if(!raw||Array.isArray(raw)||(raw.version!==0&&raw.version!==1))return p;
    const old=raw.version===0,stars=old?raw.bestStars:raw.stars,scores=old?raw.bestScores:raw.scores;
    const highest=old?raw.unlocked:raw.highest;if(level(highest))p.highest=highest;
    for(let n=1;n<=count;n++)if(stars&&Number.isInteger(stars[n])&&stars[n]>=1&&stars[n]<=3){
      p.stars[n]=stars[n];p.highest=Math.max(p.highest,Math.min(count,n+1));
      if(scores&&score(scores[n]))p.scores[n]=scores[n];
    }
    const chosen=old?raw.selected:raw.equipped;
    for(const role of roles)if(chosen)equip(p,role,chosen[role]);
    return p;
  }
  function load(storage){
    try{const text=storage.getItem(key);return {data:text&&text.length<=65536?normalize(JSON.parse(text)):fresh(),available:true};}
    catch(_){return {data:fresh(),available:false};}
  }
  function save(storage,p){try{storage.setItem(key,JSON.stringify(normalize(p)));return true;}catch(_){return false;}}
  function recordWin(p,n,points,stars){
    if(!level(n)||!score(points)||!Number.isInteger(stars)||stars<1||stars>3)return false;
    p.stars[n]=Math.max(p.stars[n]||0,stars);p.scores[n]=Math.max(p.scores[n]||0,points);
    p.highest=Math.max(p.highest,Math.min(count,n+1));return true;
  }
  function palette(p,role){return skins[roles.includes(role)?role:'jack'].find(s=>s.id===p.equipped[role])||base;}
  return Object.freeze({key,skins,fresh,load,save,recordWin,equip,owned,totalStars,palette});
}));
