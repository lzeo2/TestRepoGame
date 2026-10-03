import * as core from './core.js';
import { CARS, BY_ID } from '../../assets/car-arcade/fleet.js';
import { loadSave, saveSave } from '../../assets/car-arcade/storage.js';
import { createView } from './view.js';

const $ = id => document.getElementById(id), KEY = 'slipstream-borough-v1';
let profile, acceptedRaw, blocked = false, phase = 'garage', run = null, paused = false, view = null;
let raf = 0, last = 0, accumulator = 0, buffer = '', lastHud = 0, lastQuip = -20, resetToken, queuedDeploy=false;
const held = new Set(), keys = new Set();
function clearInput() { held.clear(); keys.clear(); queuedDeploy=false; accumulator = 0; last = 0; }
function io(text, error = false) { $('io').textContent = text; $('io').classList.toggle('error', error); }
function load() {
  const result = loadSave(KEY, core.validateProfile);
  profile = result.state || core.freshProfile(); blocked = !!result.error;
  acceptedRaw = result.error ? undefined : result.raw;
  io(result.error || (result.state ? 'Banked garage loaded. Unfinished runs do not pay.' : 'Fresh garage. Cash 0. Earn it on the highway, lad.'), blocked);
}
function save(next) {
  if (blocked) { io('Saving is locked. Reload or explicitly reset; existing bytes are preserved.', true); return false; }
  const result = saveSave(KEY, next, core.validateProfile, acceptedRaw);
  if (result.error) { blocked = true; io(result.error, true); return false; }
  acceptedRaw = result.raw; profile = next; io('Banked garage saved on this browser.'); return true;
}
function feedback(text) { $('feedback').textContent = text; }
function action(fn) { try { const next = fn(); if (save(next)) garageUI(); } catch (e) { feedback(e.message); } }
function garageUI() {
  $('bank').textContent = `Cash ${profile.cash.toLocaleString()} / Sector ${profile.level + 1} / Best ${profile.best}${profile.testMode ? ' / Test mode active' : ''}`;
  $('selected').textContent = BY_ID[profile.selected].name;
  const s = core.carStats(profile); $('specs').textContent = `${Math.round(s.speed * 3.6)} km/h / Accel ${s.acceleration.toFixed(1)} / Handling ${s.handling.toFixed(1)} / Toughness ${Math.round(s.toughness)}`;
  $('upgrades').replaceChildren();
  for (const kind of ['engine', 'handling', 'armor']) {
    const level = profile.upgrades[profile.selected][kind], button = document.createElement('button');
    const cost = level < 5 ? core.upgradeCost(profile, profile.selected, kind) : null;
    button.textContent = `${kind} ${level}/5${level < 5 ? `: upgrade${cost === null ? '' : ` ${cost}`}` : ': max'}`;
    button.disabled = level === 5 || blocked || (cost !== null && !profile.testMode && profile.cash < cost);
    button.onclick = () => action(() => { const next = core.upgradeCar(profile, profile.selected, kind); feedback(`${kind} improved. Paid ${profile.cash - next.cash}, cuh.`); return next; }); $('upgrades').append(button);
  }
  $('catalog').replaceChildren();
  for (const car of CARS) {
    const card = document.createElement('article'); card.className = 'car-card'; card.setAttribute('aria-current', String(profile.selected === car.id));
    const title = document.createElement('h3'); title.textContent = car.name;
    const stats = document.createElement('p'); stats.textContent = `${car.style} / ${Math.round(car.speed * 3.6)} km/h / ${car.acceleration} accel / ${car.handling} handling / ${car.toughness} body`;
    const button = document.createElement('button'), owned = profile.owned.includes(car.id);
    button.textContent = owned ? (profile.selected === car.id ? 'Selected' : 'Select') : `Buy ${car.price.toLocaleString()}`;
    button.disabled = blocked || profile.selected === car.id || (!owned && !profile.testMode && profile.cash < car.price);
    button.onclick = () => action(() => owned ? core.selectCar(profile, car.id) : core.buyCar(profile, car.id));
    card.append(title, stats, button); $('catalog').append(card);
  }
  const custom=profile.customizations[profile.selected];
  $('paint').value=custom.paint;$('wheelColor').value=custom.wheels;$('applyFinish').disabled=blocked;
  $('gadget').replaceChildren();
  for(const [id,kit] of Object.entries(core.GADGETS)) {
    const owned=id==='none'||custom.gadgets.includes(id), option=document.createElement('option');option.value=id;
    option.textContent=kit.name+(id==='none'?'':owned?' / owned':` / ${profile.testMode?0:kit.price} cash`);
    option.disabled=blocked||!owned&&!profile.testMode&&profile.cash<kit.price;$('gadget').append(option);
  }
  $('gadget').value=custom.gadget;$('fitGadget').disabled=blocked;
  $('start').disabled = blocked || !view;
}
function setPhase(next) {
  phase = next; document.documentElement.dataset.phase = next; clearInput(); paused = false;
  $('garage').hidden = next !== 'garage'; $('catalogSection').hidden = next !== 'garage'; $('drive').hidden = next !== 'run'; $('result').hidden = next !== 'end';
  $('pause').textContent = 'Pause'; if (next === 'garage') { run = null; garageUI(); } updateHud();
}
function start() {
  if (!view || blocked) return;
  try { const transaction = core.startRun(profile, $('mode').value); if (!save(transaction.profile)) return; run = transaction.run; lastQuip = -20; setPhase('run'); $('viewport').focus(); $('quip').textContent = run.mode === 'race' ? 'Three rivals. One finish line. Ready, lad.' : 'Keep the bodywork attached, cuh.'; }
  catch (e) { io(e.message, true); }
}
function finish() {
  // Only the running -> terminal transition calls settlement. No run is restored from storage.
  const terminal = run;
  try { const next = core.settleRun(profile, terminal); if (!save(next)) io('Run ended but payout was not saved. Reload or reset to resolve storage.', true); }
  catch (e) { blocked = true; io(`Settlement failed: ${e.message}`, true); }
  setPhase('end');
  $('resultTitle').textContent = terminal.status === 'finished' ? `Finished ${terminal.place}/4` : terminal.status === 'escaped' ? 'Escaped' : 'Busted';
  $('resultText').textContent = `${terminal.score} score / ${terminal.earnings} earned${blocked ? ' (not saved)' : ' and banked'} / ${terminal.nearMisses} near misses. ${terminal.status === 'busted' ? 'The paperwork found you, cuz.' : 'Back to the garage, lad.'}`;
}
function input() { const left = held.has('left') || keys.has('a') || keys.has('arrowleft'), right = held.has('right') || keys.has('d') || keys.has('arrowright'); const brake = +(held.has('brake') || keys.has('s') || keys.has('arrowdown')); return { steer: +right - +left, throttle: brake ? 0 : +($('cruise').checked || held.has('gas') || keys.has('w') || keys.has('arrowup')), brake,deploy:queuedDeploy }; }
function deploy() {
  if(phase==='run'&&!paused&&run.mode==='cutup'&&run.charges>0&&run.gadgetCooldown===0)queuedDeploy=true;
}
function updateHud() {
  $('hud').textContent = run ? `${paused ? 'PAUSED / ' : ''}${run.mode === 'race' ? `Position ${run.place}/4` : `Heat ${run.heat.toFixed(1)} / Arrest ${run.arrest.toFixed(1)}s`} / ${Math.round(run.speed * 3.6)} km/h / Body ${Math.ceil(run.hp)} / ${Math.floor(run.distance)} of ${run.finishDistance} m / Score ${run.score}${run.mode === 'race' ? ` / Rivals: ${run.rivals.map(e => `${Math.floor(e.distance)}m${e.finishTime !== null ? ' finished' : ''}`).join(', ')}` : ''}` : 'Garage inspection / Drag to orbit';
  const kit=run?core.GADGETS[run.gadget]:null;
  $('deploy').hidden=!run||run.mode!=='cutup'||run.gadget==='none';
  $('deploy').disabled=paused||!run||run.charges===0||run.gadgetCooldown>0;
  $('deploy').textContent=kit?`${kit.name}: ${run.charges}${run.gadgetCooldown>0?` / ${Math.ceil(run.gadgetCooldown)}s`:''} (Space)`: 'Deploy gadget';
}
function pause() { if (phase !== 'run') return; paused = !paused; clearInput(); $('pause').textContent = paused ? 'Resume' : 'Pause'; updateHud(); }
function renderFailure(e) { if (view) { view.dispose(); view = null; } paused = true; clearInput(); $('renderError').hidden = false; $('renderError').firstChild.textContent = `3D unavailable: ${e.message}. `; $('start').disabled = true; }
function bootView() { try { view = createView($('viewport')); $('renderError').hidden = true; garageUI(); } catch (e) { renderFailure(e); } }
function frame(now) {
  raf = 0; if (document.hidden) return;
  const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now;
  if (phase === 'run' && !paused && view) {
    accumulator += dt;
    try { while (accumulator >= 1 / 60 && phase === 'run') { const used=run.deployments;run = core.stepRun(run, input(), 1 / 60);queuedDeploy=false;if(run.deployments>used)$('quip').textContent=`${core.GADGETS[run.gadget].name} deployed. ${run.charges} charges left.`; accumulator -= 1 / 60; if (run.status !== 'running') finish(); } }
    catch (e) { paused = true; io(`Driving stopped: ${e.message}`, true); }
    if (run.elapsed - lastQuip > 18) { lastQuip = run.elapsed; $('quip').textContent = ['Indicators on holiday, cuh.', 'Cuz, that bumper has seen paperwork.', 'Eyes on the road, lad.'][Math.floor(run.elapsed / 18) % 3]; }
  }
  if (view) try { view.draw(profile, run, phase === 'run' ? input().steer : 0); } catch (e) { renderFailure(e); }
  if (now - lastHud > 160) { updateHud(); lastHud = now; }
  raf = requestAnimationFrame(frame);
}
function phrase(text, fromRadio = false) {
  if (phase !== 'garage' || blocked) return;
  const next = core.applyCode(profile, text);
  if (!profile.testMode && next.testMode) { if (save(next)) { feedback('Test mode active. Fleet unlocked and test cash available.'); garageUI(); } }
  else if (fromRadio) feedback('Radio received, cuh. Keep it tidy.');
}
const editable = target => target.closest('input,textarea,select,button,[contenteditable="true"]');
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || editable(e.target) || $('helpDialog').open || $('resetDialog').open) return;
  const key = e.key.toLowerCase();
  if (phase === 'garage' && /^[a-z]$/.test(key) && !e.repeat) { buffer = (buffer + key).slice(-6); phrase(buffer); }
  if(phase==='run'&&[' ','e'].includes(key)) {e.preventDefault();if(!e.repeat)deploy();}
  if (phase === 'run' && ['p', 'escape'].includes(key)) { e.preventDefault(); if (!e.repeat) pause(); }
  if (phase === 'run' && ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)) { e.preventDefault(); keys.add(key); }
});
document.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
for (const button of document.querySelectorAll('[data-drive]')) {
  button.addEventListener('pointerdown', e => { e.preventDefault(); button.setPointerCapture(e.pointerId); held.add(button.dataset.drive); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => held.delete(button.dataset.drive));
}
window.addEventListener('blur', () => { clearInput(); if (phase === 'run' && !paused) pause(); });
document.addEventListener('visibilitychange', () => { clearInput(); cancelAnimationFrame(raf); raf = 0; if (document.hidden) { if (phase === 'run' && !paused) pause(); } else raf = requestAnimationFrame(frame); });
window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) { blocked = true; io('Save changed in another tab. Automatic writes locked; reload before continuing.', true); garageUI(); } });
$('customize').onsubmit=e=>{e.preventDefault();action(()=>core.customizeCar(profile,profile.selected,{paint:$('paint').value,wheels:$('wheelColor').value}));};
$('equipment').onsubmit=e=>{e.preventDefault();action(()=>core.fitGadget(profile,profile.selected,$('gadget').value));};
$('deploy').onclick=deploy;
$('start').onclick = start; $('retry').onclick = start; $('pause').onclick = pause;
$('leave').onclick = $('garageButton').onclick = () => setPhase('garage');
$('orbitLeft').onclick = () => view?.turn(-.3); $('orbitRight').onclick = () => view?.turn(.3);
$('radio').onsubmit = e => { e.preventDefault(); phrase($('phrase').value, true); $('phrase').value = ''; };
$('help').onclick = () => { if (phase === 'run' && !paused) pause(); $('helpDialog').showModal(); }; $('closeHelp').onclick = () => $('helpDialog').close();
$('theme').onclick = () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; };
$('reload').onclick = () => { load(); setPhase('garage'); };
$('reset').onclick = () => {
  const current = loadSave(KEY, core.validateProfile);
  // null plus error means unread/unknown, never permission to overwrite absence.
  if (current.error && current.raw === null) { blocked = true; io('Cannot read existing save. Reset refused; restore storage access and reload.', true); return; }
  resetToken = current.raw; $('resetDialog').showModal();
};
$('cancelReset').onclick = () => $('resetDialog').close();
$('confirmReset').onclick = () => {
  const next = core.freshProfile(), result = saveSave(KEY, next, core.validateProfile, resetToken);
  $('resetDialog').close();
  if (result.error) { blocked = true; io(result.error, true); return; }
  profile = next; acceptedRaw = result.raw; blocked = false; io('Garage reset and saved. Other games unchanged.'); setPhase('garage');
};
$('renderRetry').onclick = bootView;
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
Object.defineProperty(window, 'slipstreamSnapshot', { get: () => freeze(structuredClone({ phase, paused, profile, run, view: view?.inspect() || null })) });
window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); clearInput(); view?.dispose(); view = null; });
load(); bootView(); setPhase('garage'); raf = requestAnimationFrame(frame);
