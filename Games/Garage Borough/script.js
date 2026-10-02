import { CARS, BY_ID } from '../../assets/car-arcade/fleet.js';
import { loadSave, saveSave } from '../../assets/car-arcade/storage.js';
import { freshBusiness, validateBusiness, tickBusiness, buyStock, restoreCar, sellCar, wholesaleCar, hireStaff, expandGarage, continueBusiness } from './core.js';
import { createView } from './view.js';

const $=id=>document.getElementById(id), key='garage-borough-v1';
const loaded=loadSave(key,validateBusiness);
let business=loaded.state||freshBusiness(), raw=loaded.raw, saveError=loaded.error;
let started=false, paused=true, view=null, selected={carId:'bricklet',uid:null}, raf=0, previous=0, lastSave=0,lastUI=0, signature='';
const money=n=>`$${n.toLocaleString('en-US')}`;
const cost=id=>Math.max(200,Math.floor(BY_ID[id].price*.5));
const repair=id=>Math.max(50,Math.floor(cost(id)*.15));
const sale=item=>Math.max(500,Math.floor(cost(item.carId)*(100+item.condition)/100));
function errorDisplay(){ $('save-error').hidden=!saveError;$('save-error').textContent=saveError?`${saveError} Automatic saving stopped. Reload or explicitly reset to recover.`:''; }
function save(){if(saveError)return;const result=saveSave(key,business,validateBusiness,raw);if(result.error)saveError=result.error;else raw=result.raw;errorDisplay();}
function active(){return started&&!paused&&business.status==='playing'&&!!view;}
function message(text){$('status').textContent=text;}
function choose(carId,uid=null){selected={carId,uid};syncView();}
function syncView(){
  if(selected.uid!==null&&!business.inventory.some(i=>i.uid===selected.uid))selected={carId:selected.carId,uid:null};
  $('inspection').textContent=`${BY_ID[selected.carId].name} / ${selected.uid===null?'supplier preview, not owned':`owned stock #${selected.uid}`}`;
  view?.update(business,selected);
}
function action(fn,args,text){if(!active())return;try{const before=business.cash;business=fn(business,...args);if(fn===buyStock){const item=business.inventory.at(-1);selected={carId:item.carId,uid:item.uid};}const delta=business.cash-before;message(`${text} Cash ${delta<0?'-':'+'}${money(Math.abs(delta))}.`);save();refresh(true);}catch(error){message(error.message);}}
function button(label,callback,disabled=false){const b=document.createElement('button');b.textContent=label;b.disabled=disabled;b.addEventListener('click',callback);return b;}
function paragraph(text,className=''){const p=document.createElement('p');p.textContent=text;p.className=className;return p;}
function refresh(force=false){
  const running=active();
  $('cash').textContent=`Cash ${money(business.cash)}`;
  $('sales').textContent=`Sales ${business.sales} / Reputation ${business.reputation}`;
  $('rent').textContent=`Rent ${money(150+50*business.staff)} in ${Math.ceil(120-business.rentClock)}s`;
  $('capacity').textContent=`${business.inventory.length}/${business.bays*2} stock spaces / ${business.bays} bays`;
  $('start').hidden=started;$('start').textContent=loaded.state?'Open saved business':'Start business';$('start').disabled=!view||business.status!=='playing';
  $('pause').disabled=!started||!view||business.status!=='playing';$('pause').textContent=paused?'Resume':'Pause';
  $('hire').textContent=`Hire mechanic ${money(300+250*business.staff)}`;$('hire').disabled=!running||business.staff===3||business.cash<300+250*business.staff;
  $('expand').textContent=`Add bay ${money(800*business.bays)}`;$('expand').disabled=!running||business.bays===4||business.cash<800*business.bays;
  $('staff-note').textContent=`${business.staff}/3 mechanics. Each restores 1 condition every 3 active seconds. First damaged stock gets priority.`;
  $('result').hidden=business.status==='playing';$('result').textContent=business.status==='won'?'Garage of the day! Ten real customer sales. Cuz, the invoices finally agree.':business.status==='closed'?'Business closed: cash could not cover rent. Reset to open a new shop, lad.':'';
  $('continue').hidden=business.status!=='won';
  $('customers').replaceChildren(...business.customers.map(c=>paragraph(`Buyer #${c.uid}: ${c.style}, condition ${c.minCondition}+. Leaves in ${Math.ceil(c.expiresAt-business.elapsed)}s.`)));
  if(!business.customers.length)$('customers').append(paragraph(`Next arrival in ${Math.ceil(15-business.customerClock)}s. Cuh is checking the bus timetable.`));
  const next=JSON.stringify([running,business.cash,business.inventory,business.customers.map(c=>c.uid),business.bays]);
  if(force||signature!==next){
    signature=next;$('empty').hidden=business.inventory.length>0;$('inventory').replaceChildren();
    for(const item of business.inventory){
      const card=document.createElement('article');card.className='car-card';const title=document.createElement('h3');title.textContent=`${BY_ID[item.carId].name} #${item.uid}`;card.append(title,paragraph(`Condition ${item.condition}/100 / ${BY_ID[item.carId].style}`));
      card.append(button('Inspect owned car',()=>choose(item.carId,item.uid)),button(`Restore +25 / ${money(repair(item.carId))}`,()=>action(restoreCar,[item.uid],'Restored. That polish earned its lunch, lad'),!running||item.condition===100||business.cash<repair(item.carId)));
      for(const customer of business.customers){const match=customer.style===BY_ID[item.carId].style&&item.condition>=customer.minCondition;card.append(button(`Sell to #${customer.uid} / ${money(sale(item))}`,()=>action(sellCar,[item.uid,customer.uid],'Customer matched. Cuz, sold'),!running||!match));}
      const payout=Math.min(cost(item.carId),Math.max(Math.floor(cost(item.carId)*.5),Math.floor(cost(item.carId)*item.condition/100)));
      card.append(button(`Wholesale / ${money(payout)}`,()=>action(wholesaleCar,[item.uid],'Wholesaled, no sales reputation'),!running));$('inventory').append(card);
    }
    for(const b of $('catalog').querySelectorAll('[data-buy]'))b.disabled=!running||business.cash<cost(b.dataset.buy)||business.inventory.length>=business.bays*2;
    syncView();
  }
}
for(const car of CARS){
  const card=document.createElement('article');card.className='car-card';const title=document.createElement('h3');title.textContent=car.name;
  const buy=button(`Buy ${car.name} / ${money(cost(car.id))}`,()=>action(buyStock,[car.id],'Stock purchased'));buy.dataset.buy=car.id;
  card.append(title,paragraph(`${car.style} / used stock ${money(cost(car.id))} / repair ${money(repair(car.id))}`),paragraph(`${car.length}m long / ${car.width}m wide / toughness ${car.toughness}`,'spec'),button(`Preview ${car.name}`,()=>choose(car.id)),buy);$('catalog').append(card);
}
try{view=createView($('scene'));}catch(error){$('gl-error').hidden=false;$('gl-error').textContent='WebGL could not start. Business time is stopped. Try a WebGL-capable browser and reload. No progress was invented.';}
function pause(){paused=true;previous=0;save();refresh(true);}
$('start').onclick=()=>{started=true;paused=false;previous=0;message('Shutters open. Match stock to a buyer before they leave.');refresh(true);};
$('pause').onclick=()=>{if(paused){paused=false;previous=0;refresh(true);}else pause();};
$('hire').onclick=()=>action(hireStaff,[],'Mechanic hired');$('expand').onclick=()=>action(expandGarage,[],'Bay expanded');
$('continue').onclick=()=>{try{business=continueBusiness(business);started=true;paused=false;previous=0;save();refresh(true);}catch(error){message(error.message);}};
$('reset').onclick=()=>{
  const observed=loadSave(key,validateBusiness);
  if(observed.error&&observed.raw===null){saveError='Existing save could not be read. Reset refused until storage access is restored.';errorDisplay();return;}
  if(!confirm('Reset only Garage Borough? All this business progress will be replaced.'))return;
  const fresh=freshBusiness();const result=saveSave(key,fresh,validateBusiness,observed.raw);
  if(result.error){saveError=result.error;errorDisplay();return;}
  business=fresh;raw=result.raw;saveError=null;started=false;paused=true;previous=0;selected={carId:'bricklet',uid:null};errorDisplay();message('New business, cash $800. Buy Bricklet80, restore once, then match the compact buyer.');refresh(true);
};
$('help').onclick=()=>{pause();$('help-dialog').showModal();};
$('theme').onclick=()=>{const dark=document.documentElement.dataset.theme!=='dark';document.documentElement.dataset.theme=dark?'dark':'light';$('theme').textContent=dark?'Light theme':'Dark theme';};
$('left').onclick=()=>view?.rotate(-.25);$('right').onclick=()=>view?.rotate(.25);
$('closeup').onclick=()=>{const enabled=$('closeup').getAttribute('aria-pressed')!=='true';$('closeup').setAttribute('aria-pressed',String(enabled));$('closeup').textContent=enabled?'Workshop overview':'Inspect close-up';view?.closeup(enabled);};
let drag=null;
$('scene').addEventListener('pointerdown',event=>{drag={id:event.pointerId,x:event.clientX};$('scene').setPointerCapture(event.pointerId);});
$('scene').addEventListener('pointermove',event=>{if(drag?.id===event.pointerId){view?.rotate((event.clientX-drag.x)*.012);drag.x=event.clientX;}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('scene').addEventListener(name,()=>{drag=null;});
$('scene').addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();view?.rotate(event.key==='ArrowLeft'?-.15:.15);}});
window.addEventListener('blur',()=>{drag=null;if(started)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){drag=null;pause();}});
$('scene').addEventListener('webglcontextlost',event=>{event.preventDefault();pause();$('gl-error').hidden=false;$('gl-error').textContent='Graphics context lost. Reload to restore the workshop; saved business is preserved.';view?.dispose();view=null;refresh(true);});
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
Object.defineProperty(window,'garageSnapshot',{get:()=>freeze({phase:business.status!=='playing'?business.status:started?'business':'start',paused,business:structuredClone(business),view:view?.inspect()||null})});
function frame(now){
  if(active()&&!document.hidden){const dt=previous?Math.min(.05,(now-previous)/1000):0;try{business=tickBusiness(business,dt);}catch(error){paused=true;message(error.message);}if(business.status!=='playing'){paused=true;save();refresh(true);}if(now-lastSave>1000){save();lastSave=now;}}
  previous=now;
  if(now-lastUI>250){refresh();lastUI=now;}
  if(!document.hidden&&view){view.render();const stats=view.inspect();$('render-stats').textContent=`${stats.triangles.toLocaleString()} triangles / ${stats.drawCalls} draws / DPR 1. Device performance not certified.`;}
  raf=requestAnimationFrame(frame);
}
window.addEventListener('pagehide',()=>{save();cancelAnimationFrame(raf);view?.dispose();view=null;});
window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
errorDisplay();refresh(true);raf=requestAnimationFrame(frame);
