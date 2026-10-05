import * as core from './core.js';
import { CARS, BY_ID } from '../../assets/car-arcade/fleet.js';
import { loadSave, saveSave } from '../../assets/car-arcade/storage.js';
import { createView } from './view.js';
import { frameDelta } from './clock.js';

const $ = id => document.getElementById(id), KEY = 'slipstream-borough-v1', HELP_KEY = 'slipstream-help-v1';
const phone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
document.documentElement.dataset.phone = String(phone);
document.querySelector('.touch-controls').hidden = !phone;
let helpSeen = false, helpStorageDenied = false, resumeHelp = false;
try { helpSeen = localStorage.getItem(HELP_KEY) === '1'; } catch { helpStorageDenied = true; }
let profile, acceptedRaw, blocked = false, phase = 'garage', run = null, paused = false, view = null;
let raf = 0, last = 0, accumulator = 0, buffer = '', lastHud = 0, resetToken, queuedDeploy=false;
const held = new Set(), keys = new Set();
function clearInput() { held.clear(); keys.clear(); queuedDeploy=false; accumulator = 0; last = 0; }
function io(text, error = false) { $('io').textContent = text; $('io').classList.toggle('error', error); }
function load() {
  const result = loadSave(KEY, core.validateProfile);
  profile = result.state || core.freshProfile(); blocked = !!result.error;
  acceptedRaw = result.error ? undefined : result.raw;
  io(result.error || '', blocked);
}
function save(next) {
  if (blocked) { io('Saving is locked. Reload or explicitly reset; existing bytes are preserved.', true); return false; }
  const result = saveSave(KEY, next, core.validateProfile, acceptedRaw);
  if (result.error) { blocked = true; io(result.error, true); return false; }
  acceptedRaw = result.raw; profile = next; io(''); return true;
}
function feedback(text) { $('feedback').textContent = text; }
function action(fn) { try { const next = fn(); if (save(next)) garageUI(); } catch (e) { feedback(e.message); } }
function garageUI() {
  $('bank').textContent = `Cash ${profile.cash.toLocaleString()} · ${profile.careerDistance.toLocaleString()} m banked${profile.testMode ? ' · Test mode' : ''}`;
  const nextCar = CARS.filter(car => !profile.owned.includes(car.id)).sort((a, b) => core.CAR_UNLOCKS[a.id] - core.CAR_UNLOCKS[b.id])[0];
  $('career').textContent = nextCar ? `Next free car: ${nextCar.name} at ${core.CAR_UNLOCKS[nextCar.id].toLocaleString()} m (${Math.max(0, core.CAR_UNLOCKS[nextCar.id] - profile.careerDistance).toLocaleString()} m to bank).` : 'All base cars unlocked.';
  $('selected').textContent = BY_ID[profile.selected].name;
  const s = core.carStats(profile); $('specs').textContent = `${Math.round(s.speed * 3.6)} km/h / Accel ${s.acceleration.toFixed(1)} / Handling ${s.handling.toFixed(1)} / Toughness ${Math.round(s.toughness)}`;
  $('upgrades').replaceChildren();
  for (const kind of ['engine', 'handling', 'armor']) {
    const level = profile.upgrades[profile.selected][kind], button = document.createElement('button');
    const cost = level < 5 ? core.upgradeCost(profile, profile.selected, kind) : null;
    button.textContent = `${kind} ${level}/5${level < 5 ? `: upgrade${cost === null ? '' : ` ${cost}`}` : ': max'}`;
    button.disabled = level === 5 || blocked || (cost !== null && !profile.testMode && profile.cash < cost);
    button.onclick = () => action(() => { const next = core.upgradeCar(profile, profile.selected, kind); feedback(`${kind} improved. Paid ${profile.cash - next.cash}.`); return next; }); $('upgrades').append(button);
  }
  $('catalog').replaceChildren();
  for (const car of CARS) {
    const card = document.createElement('article'); card.className = 'car-card'; card.setAttribute('aria-current', String(profile.selected === car.id));
    const title = document.createElement('h3'); title.textContent = car.name;
    const stats = document.createElement('p'); stats.textContent = `${car.style} / ${Math.round(car.speed * 3.6)} km/h / ${car.acceleration} accel / ${car.handling} handling / ${car.toughness} body`;
    const button = document.createElement('button'), owned = profile.owned.includes(car.id);
    const distance = core.CAR_UNLOCKS[car.id], unlocked = profile.testMode || profile.careerDistance >= distance;
    const progress = document.createElement('p'); progress.textContent = owned ? 'Unlocked / owned' : `Free at ${distance.toLocaleString()} banked m / ${unlocked ? 'Unlocked' : 'Mileage locked'}`;
    button.textContent = owned ? (profile.selected === car.id ? 'Selected' : 'Select') : unlocked ? 'Claim free car' : `Locked: ${distance.toLocaleString()} m`;
    button.disabled = blocked || profile.selected === car.id || (!owned && !unlocked);
    button.onclick = () => action(() => owned ? core.selectCar(profile, car.id) : core.buyCar(profile, car.id));
    card.append(title, stats, progress, button); $('catalog').append(card);
  }
  const custom=profile.customizations[profile.selected];
  $('paint').value=custom.paint;$('wheelColor').value=custom.wheels;$('applyFinish').disabled=blocked;
  $('stripeEnabled').checked=custom.stripe!==null;$('stripe').value=custom.stripe||'#ffffff';$('spoiler').checked=custom.spoiler;
  $('gadget').replaceChildren();
  for(const [id,kit] of Object.entries(core.GADGETS)) {
    const owned=id==='none'||custom.gadgets.includes(id), option=document.createElement('option');option.value=id;
    const locked=!profile.testMode&&profile.careerDistance<kit.unlockDistance;
    option.textContent=`${kit.name} / ${kit.category}`+(id==='none'?'':` / ${owned?'owned':`${profile.testMode?0:kit.price} cash`}${!owned&&locked?` / locked until ${kit.unlockDistance} m`:''} / ${kit.charges} charges / ${kit.cooldown}s cooldown`);
    option.disabled=blocked||!owned&&!profile.testMode&&(locked||profile.cash<kit.price);$('gadget').append(option);
  }
  $('gadget').value=custom.gadget; equipmentUI();
  $('start').disabled = blocked || !view;
  modeUI();
}
function modeUI() {
  const mode = $('mode').value;
  $('modeGoal').textContent = mode === 'roam' ? 'Drive to earn cash and mileage. Park to bank it and unlock more cars.' : mode === 'cutup' ? 'Reach the finish while evading police and traffic. Leaving early pays nothing.' : 'Beat three rivals to the finish. A completed race earns cash and mileage.';
  $('start').textContent = mode === 'roam' ? 'Start city drive' : mode === 'cutup' ? 'Start pursuit' : 'Start race';
}
function equipmentUI() {
  const option=$('gadget').selectedOptions[0];
  $('fitGadget').disabled=blocked||!option||option.disabled;
  $('kitDetails').textContent=option?.textContent||'';
}
function setPhase(next) {
  phase = next; document.documentElement.dataset.phase = next; clearInput(); paused = false;
  $('garage').hidden = next !== 'garage'; $('catalogSection').hidden = next !== 'garage'; $('drive').hidden = next !== 'run'; $('result').hidden = next !== 'end';
  $('garageToggle').hidden = next !== 'garage';
  $('garageToggle').textContent = 'Hide garage'; $('garageToggle').setAttribute('aria-expanded', 'true');
  $('pause').textContent = 'Pause'; if (next === 'garage') { run = null; garageUI(); } updateHud();
}
function start(mode = $('mode').value) {
  if (!view || blocked || phase === 'run') return;
  try {
    const transaction = core.startRun(profile, mode);
    if (!save(transaction.profile)) { setPhase('garage'); return; }
    run = transaction.run; setPhase('run'); $('viewport').focus();
    if (!helpSeen) showHelp();
  } catch (e) { io(e.message, true); }
}
function finish() {
  // Only the running -> terminal transition calls settlement. No run is restored from storage.
  if (phase !== 'run' || !run || run.status === 'running') return;
  const terminal = run;
  try { const next = core.settleRun(profile, terminal); if (!save(next)) io('Run ended but payout was not saved. Reload or reset to resolve storage.', true); }
  catch (e) { blocked = true; io(`Settlement failed: ${e.message}`, true); }
  setPhase('end');
  $('resultTitle').textContent = terminal.status === 'finished' ? `Finished ${terminal.place}/4` : terminal.status === 'escaped' ? 'Escaped' : terminal.status === 'parked' ? 'Parked' : 'Busted';
  $('resultText').textContent = `${terminal.score} score / ${terminal.earnings} earned${blocked ? ' (not saved)' : ' and banked'} / ${terminal.nearMisses} near misses. ${blocked ? 'Resolve the save error before driving again.' : terminal.status === 'busted' ? 'Try again or change your setup.' : 'Return to the garage to choose your next drive.'}`;
}
function leave() {
  if (phase === 'run' && run.mode === 'roam') {
    try { run = core.parkRun(run); finish(); }
    catch (e) { paused = true; clearInput(); io(`Parking failed: ${e.message}`, true); return; }
  }
  setPhase('garage');
}
function input() { const left = held.has('left') || keys.has('a') || keys.has('arrowleft'), right = held.has('right') || keys.has('d') || keys.has('arrowright'); const brake = +(held.has('brake') || keys.has('s') || keys.has('arrowdown')); return { steer: +right - +left, throttle: brake ? 0 : +($('cruise').checked || held.has('gas') || keys.has('w') || keys.has('arrowup')), brake,deploy:queuedDeploy }; }
function deploy() {
  if(phase==='run'&&!paused&&!blocked&&run.mode!=='race'&&run.charges>0&&run.gadgetCooldown===0)queuedDeploy=true;
}
function updateHud() {
  $('hud').hidden = phase !== 'run';
  if (run) {
    const activity = run.mode === 'roam' ? (run.pursuit === 'chased' ? `Chase · escape ${run.escapeClock.toFixed(1)}/6s` : 'City · exploring') : run.mode === 'race' ? `Sprint · ${run.place}/4` : `Cutup · heat ${run.heat.toFixed(1)}`;
    $('activity').textContent = paused ? 'Paused' : activity;
    const getMoving = phone ? 'Hold Gas' : 'Hold W / Up';
    const goal = run.mode === 'roam' ? (run.pursuit === 'chased' ? 'Lose the police: stay 75 m away for 6 seconds.' : `${run.distance < 10 ? getMoving + ' to move. ' : ''}Explore, then Park to bank cash and mileage.`) : run.mode === 'race' ? `Beat three rivals. Finish at ${run.finishDistance} m.` : `Evade police and traffic. Reach ${run.finishDistance} m to earn your payout.`;
    const objective = paused ? 'Resume to keep driving, or return to the garage.' : goal;
    if ($('objective').textContent !== objective) $('objective').textContent = objective;
    $('speed').textContent = `${Math.round(run.speed * 3.6)} km/h`;
    $('body').textContent = `Body ${Math.ceil(run.hp)}%`;
    $('distance').textContent = `${Math.floor(run.distance)}${run.mode === 'roam' ? ' m' : ` / ${run.finishDistance} m`}`;
    $('score').textContent = `Score ${run.score}`;
  }
  $('leave').textContent = run?.mode === 'roam' ? 'Park' : 'Garage';
  $('leave').setAttribute('aria-label', run?.mode === 'roam' ? 'Park and bank this city drive' : 'Abandon this highway drive unpaid');
  const available = run && run.mode !== 'race' && run.gadget !== 'none';
  const kit = run ? core.GADGETS[run.gadget] : null;
  $('kitStatus').hidden = !available;
  $('kitStatus').textContent = available ? `${kit.name} · ${run.charges}${run.gadgetCooldown > 0 ? ` · ${Math.ceil(run.gadgetCooldown)}s` : ''}` : '';
  $('deploy').hidden = !phone || !available;
  $('deploy').disabled = paused || blocked || !run || run.charges === 0 || run.gadgetCooldown > 0;
  $('deploy').textContent = kit ? `Deploy ${kit.name}` : 'Deploy';
}
function pause() { if (phase !== 'run' || blocked && paused) return; paused = !paused; clearInput(); $('pause').textContent = paused ? 'Resume' : 'Pause'; updateHud(); }
function renderFailure(e) { if (view) { view.dispose(); view = null; } paused = true; clearInput(); $('renderError').hidden = false; $('renderError').firstChild.textContent = `3D unavailable: ${e.message}. `; $('start').disabled = true; }
function bootView() { try { view = createView($('viewport')); $('renderError').hidden = true; garageUI(); } catch (e) { renderFailure(e); } }
function frame(now) {
  raf = 0; if (document.hidden) return;
  const dt = frameDelta(now, last); last = now;
  if (phase === 'run' && !paused && !blocked && view) {
    accumulator += dt;
    try { while (accumulator >= 1 / 60 && phase === 'run') { run = core.stepRun(run, input(), 1 / 60); queuedDeploy=false; accumulator -= 1 / 60; if (run.status !== 'running') finish(); } }
    catch (e) { paused = true; io(`Driving stopped: ${e.message}`, true); }
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
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing || $('helpDialog').open || $('resetDialog').open) return;
  const key = e.key.toLowerCase(), button = e.target.closest('button');
  if (editable(e.target) && (!button || phase !== 'run' || [' ', 'enter'].includes(key))) return;
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
window.addEventListener('storage', e => { if (e.key === KEY || e.key === null) { if (phase === 'run' && !paused) pause(); blocked = true; clearInput(); io('Save changed in another tab. Driving and writes locked; reload before continuing.', true); garageUI(); updateHud(); } });
$('customize').onsubmit=e=>{e.preventDefault();action(()=>core.customizeCar(profile,profile.selected,{paint:$('paint').value,wheels:$('wheelColor').value,stripe:$('stripeEnabled').checked?$('stripe').value:null,spoiler:$('spoiler').checked}));};
$('gadget').onchange=equipmentUI;
$('equipment').onsubmit=e=>{e.preventDefault();action(()=>core.fitGadget(profile,profile.selected,$('gadget').value));};
$('deploy').onclick=deploy;
$('cruise').onchange = () => { clearInput(); $('viewport').focus(); };
$('mode').onchange = modeUI;
$('garageToggle').onclick = () => {
  if (phase !== 'garage') return;
  $('garage').hidden = !$('garage').hidden;
  $('garageToggle').textContent = $('garage').hidden ? 'Garage' : 'Hide garage';
  $('garageToggle').setAttribute('aria-expanded', String(!$('garage').hidden));
  if ($('garage').hidden) $('viewport').focus(); else $('start').focus();
};
$('start').onclick = () => start(); $('retry').onclick = () => start(run?.mode || $('mode').value); $('pause').onclick = pause;
$('leave').onclick = $('garageButton').onclick = leave;
$('orbitLeft').onclick = () => view?.turn(-.3); $('orbitRight').onclick = () => view?.turn(.3);
$('radio').onsubmit = e => { e.preventDefault(); phrase($('phrase').value, true); $('phrase').value = ''; };
function showHelp() {
  if ($('helpDialog').open) return;
  resumeHelp = phase === 'run' && !paused;
  if (resumeHelp) pause();
  clearInput(); $('helpDialog').showModal();
}
$('help').onclick = showHelp;
$('closeHelp').onclick = () => $('helpDialog').close();
$('helpDialog').addEventListener('close', () => {
  helpSeen = true;
  try { localStorage.setItem(HELP_KEY, '1'); } catch { helpStorageDenied = true; }
  if (resumeHelp && phase === 'run' && paused && !blocked && view) pause();
  resumeHelp = false;
  $('viewport').focus();
});
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
Object.defineProperty(window, 'slipstreamSnapshot', { get: () => freeze(structuredClone({ phase, paused, phone, helpSeen, helpStorageDenied, profile, run, view: view?.inspect() || null })) });
window.addEventListener('pagehide', () => { cancelAnimationFrame(raf); clearInput(); view?.dispose(); view = null; });
load(); bootView(); setPhase('garage'); raf = requestAnimationFrame(frame);
