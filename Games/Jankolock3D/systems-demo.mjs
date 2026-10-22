import * as THREE from './vendor/three.module.js';
import { createSystems } from './systems.mjs';
import { mountSystemsUI } from './systems-ui.mjs';
import { createSystemsLayer } from './systems-view.mjs';
import { loadCharacter, disposeCharacterAssets } from './character-assets.mjs';

// Only a same-origin descriptor load. Missing export uses procedural lanes; invalid exports fail visibly.
export async function loadSystemsWorld(url = new URL('../../docs/jank3d-spawns.json', import.meta.url)) {
  let response;
  try { response = await fetch(url); }
  catch (error) { if (error instanceof TypeError) return { world: undefined, source: 'Procedural fallback: local world export unavailable.' }; throw error; }
  if (response.status === 404) return { world: undefined, source: 'Procedural fallback: local world export not yet supplied.' };
  if (!response.ok) throw new Error(`World export returned HTTP ${response.status}.`);
  return { world: await response.json(), source: 'Loaded local docs/jank3d-spawns.json.' };
}

async function start() {
  await loadCharacter('trooper');
  const { world, source } = await loadSystemsWorld(), sim = createSystems(world);
  const fixture = new URL(location.href).searchParams.get('fixture') ?? 'base';
  const hero = sim.addHero({ id: 'preview-player', team: fixture === 'deny' ? 'ivory' : 'carbon', lane: 'midway', souls: 4800 });
  sim.step(fixture === 'orbs' || fixture === 'deny' ? 75 : 30);
  if (fixture === 'waves') sim.moveHero(hero.id, { x: 2, y: 0, z: -375 });
  if (fixture === 'respawn') {
    const attacker = sim.addHero({ id: 'fixture-attacker', team: 'ivory', lane: 'midway', position: { ...hero.position, x: hero.position.x + 1 } });
    sim.damage(hero.id, 2000, attacker.id, { kind: 'ability' });
    sim.moveHero(attacker.id, sim.bases.ivory);
  }
  if (fixture === 'orbs' || fixture === 'deny') {
    const target = sim.troopers.find(t => t.alive && t.team === 'ivory' && t.lane === 'midway');
    const killer = fixture === 'deny' ? sim.addHero({ id: 'fixture-killer', team: 'carbon', lane: 'midway', position: { ...target.position, x: target.position.x + 2 } }) : hero;
    sim.moveHero(killer.id, { ...target.position, x: target.position.x + 2 });
    sim.damage(target.id, 180, killer.id, { kind: 'ability' });
    // Start just outside pickup radius so the ground orb is visibly reachable by walking.
    sim.moveHero(hero.id, { ...target.position, x: target.position.x + 6 });
    if (fixture === 'deny') sim.moveHero(killer.id, sim.bases.carbon);
  }
  const ui = mountSystemsUI(document.querySelector('#systems-ui'), sim, hero.id);
  document.querySelector('#world-source').textContent = `${source} Fixture: ${fixture}.`;
  const canvas = document.querySelector('#systems-canvas'), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setClearColor(0x8b8c8e);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000), layer = createSystemsLayer(scene), ray = new THREE.Raycaster();
  scene.add(new THREE.HemisphereLight(0xe1e8ed,0x77715f,2));
  const keyLight=new THREE.DirectionalLight(0xffe6bc,2);keyLight.position.set(-10,20,-10);scene.add(keyLight);
  const keys = new Set(), bindings = new AbortController(), options = { signal: bindings.signal };
  let paused = false, stopped = false, frame = 0, last = performance.now(), notice = '', lastPosition = { ...hero.position };
  const pause = document.querySelector('#pause');
  pause.addEventListener('click', () => { paused = !paused; pause.textContent = paused ? 'Resume' : 'Pause'; pause.setAttribute('aria-pressed', String(paused)); }, options);
  const resize = () => {
    const width = canvas.clientWidth, height = canvas.clientHeight;
    if (width && height) { renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); }
  };
  const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
  const editing = target => target instanceof Element && !!target.closest('input,textarea,select,[contenteditable="true"]');
  window.addEventListener('keydown', e => {
    if (!editing(e.target) && !e.ctrlKey && !e.metaKey && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { e.preventDefault(); keys.add(e.code); }
  }, options);
  window.addEventListener('keyup', e => keys.delete(e.code), options);
  const clear = () => { keys.clear(); sim.setRetreat(hero.id, false); last = performance.now(); };
  window.addEventListener('blur', clear, options);
  document.addEventListener('visibilitychange', clear, options);
  for (const b of document.querySelectorAll('[data-move],#retreat')) {
    const code = { forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD' }[b.dataset.move];
    b.addEventListener('pointerdown', e => { b.setPointerCapture(e.pointerId); code ? keys.add(code) : sim.setRetreat(hero.id, true); }, options);
    const release = () => code ? keys.delete(code) : sim.setRetreat(hero.id, false);
    b.addEventListener('pointerup', release, options); b.addEventListener('pointercancel', release, options); b.addEventListener('lostpointercapture', release, options);
  }
  canvas.addEventListener('pointerdown', e => {
    if (paused) return;
    const bounds = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((e.clientX - bounds.x) / bounds.width * 2 - 1, 1 - (e.clientY - bounds.y) / bounds.height * 2), camera);
    const result = layer.shoot(sim, hero.id, ray);
    ui.message(result.ok ? 'Shot fired.' : result.reason); ui.update();
  }, options);
  function draw(now) {
    if (stopped) return;
    const dt = Math.min(0.25, Math.max(0, (now - last) / 1000)); last = now;
    if (!paused && !document.hidden) {
      let x = Number(keys.has('KeyD')) - Number(keys.has('KeyA')), z = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const n = Math.hypot(x, z), speed = sim.stats(hero.id).moveSpeed;
      if (n && hero.alive) sim.moveHero(hero.id, { x: hero.position.x + x / n * speed * dt, y: hero.position.y, z: hero.position.z + z / n * speed * dt });
      sim.step(dt);
    }
    for (const e of sim.drainEvents()) {
      if (e.type === 'orb_shot') notice = `${e.outcome === 'deny' ? 'Denied' : 'Secured'} floating souls.`;
      if (e.type === 'orb_pickup') notice = 'Ground souls collected.';
      if (e.type === 'recall_complete') notice = 'Returned to base.';
      if (e.type === 'recall_cancel') notice = `Return cancelled: ${e.reason}. Release X before trying again.`;
      if (e.type === 'hero_death' && e.heroId === hero.id) notice = 'Respawning. The shop is available.';
    }
    if (notice) { ui.message(notice); notice = ''; }
    ui.update(); layer.sync(sim);
    if (hero.alive) lastPosition = { ...hero.position };
    camera.position.set(lastPosition.x + 8, lastPosition.y + 7, lastPosition.z - 16);
    camera.lookAt(lastPosition.x - 2, lastPosition.y + 1, lastPosition.z + 16);
    renderer.render(scene, camera);
    document.querySelector('#orb-hint').hidden = !sim.orbs.some(o => o.type === 'floating');
    frame = requestAnimationFrame(draw);
  }
  // Read-only observations. Fixture controls are visible links, never hidden HP/time grants.
  window.jank3dSystemsSnapshot = () => ({ fixture, source, time: sim.time, phase: sim.phase, winner: sim.winner,
    hero: { id: hero.id, souls: hero.souls, level: hero.level, position: { ...hero.position }, hp: hero.hp, alive: hero.alive, items: [...hero.items], flexSlots: hero.flexSlots },
    stats: { ...sim.stats(hero.id) }, paused, troopers: sim.troopers.map(t => ({ id: t.id, team: t.team, lane: t.lane, hp: t.hp, position: { ...t.position }, candleScale: t.candleScale })),
    orbs: sim.orbs.map(o => ({ id: o.id, type: o.type, team: o.team, souls: o.souls, expiresAt: o.expiresAt, position: { ...o.position } })), projections: layer.projections(camera),
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
  function stop() {
    if (stopped) return; stopped = true; cancelAnimationFrame(frame); bindings.abort(); observer.disconnect(); ui.dispose(); layer.dispose(); disposeCharacterAssets(); renderer.dispose();
    delete window.jank3dSystemsSnapshot;
  }
  window.addEventListener('pagehide', stop, { once: true });
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); stop(); const error = document.querySelector('#error'); error.hidden = false; error.textContent = 'The 3D preview lost its graphics context. Reload this page to continue.'; }, { once: true });
  frame = requestAnimationFrame(draw);
}
start().catch(error => {
  disposeCharacterAssets();
  const output = document.querySelector('#error'); output.hidden = false;
  output.textContent = `Systems preview could not start: ${error.message}`;
});
