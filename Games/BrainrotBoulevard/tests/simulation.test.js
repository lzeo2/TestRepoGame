import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

let instance = 0;

/** Full main.js initialization with real Three geometry and a DOM/GPU boundary stub. */
async function loadGame({ secretPending = false } = {}) {
  const mainUrl = new URL('../src/main.js', import.meta.url);
  let source = readFileSync(mainUrl, 'utf8');
  source = source.replace("import * as THREE from '../vendor/three.module.js';", `
    import * as RealTHREE from ${JSON.stringify(new URL('../vendor/three.module.js', import.meta.url).href)};
    const THREE = { ...RealTHREE, WebGLRenderer: class {
      shadowMap = {};
      setSize() {} setPixelRatio() {} render() {}
    }};
  `);
  source = source.replace("from './characters.js'", `from ${JSON.stringify(new URL('../src/characters.js', import.meta.url).href)}`);
  source = source.replace("from './rules.js'", `from ${JSON.stringify(new URL('../src/rules.js', import.meta.url).href)}`);
  source = source.replace("from '../vendor/environments/RoomEnvironment.js'", `from ${JSON.stringify(new URL('../vendor/environments/RoomEnvironment.js', import.meta.url).href)}`);
  source = source.replace("import { createSecretCharacter, loadSecretCharacter, secretAssetStatus, disposeSecretCharacter } from './secret-character.js';", `
    import { createSecretCharacter, disposeSecretCharacter } from ${JSON.stringify(new URL('../src/secret-character.js', import.meta.url).href)};
    // Asset transport/GPU decoding are outside this DOM simulation boundary.
    const loadSecretCharacter = () => ${secretPending ? 'new Promise(() => {})' : 'Promise.resolve()'};
    const secretAssetStatus = () => ({ ready: ${!secretPending} });
  `);
  const environment = `
    // Independent fake browser surface for simulation instance ${++instance}.
    const elements = new Map(), stored = new Map();
    class FakeElement {
      listeners = new Map(); children = []; style = {}; dataset = {};
      hidden = false; disabled = false; textContent = ''; innerHTML = '';
      addEventListener(type, callback) {
        const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list);
      }
      dispatch(type, event = {}) { for (const callback of this.listeners.get(type) || []) callback(event); }
      click() { this.onclick?.(); this.dispatch('click', { target: this }); }
      focus() { document.activeElement = this; }
      setAttribute() {} setPointerCapture() {} hasPointerCapture() { return false; }
      getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 120 }; }
      querySelectorAll() { return []; }
      append(element) { element.parent = this; this.children.push(element); }
      remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); }
      get firstChild() { return this.children[0]; }
      getContext() { return new Proxy({}, { get: (_, key) => key === 'measureText' ? text => ({ width: text.length * 10 }) : () => {} }); }
    }
    const document = new FakeElement();
    document.hidden = false;
    document.getElementById = id => {
      if (!elements.has(id)) elements.set(id, new FakeElement());
      return elements.get(id);
    };
    document.createElement = () => new FakeElement();
    const window = new FakeElement();
    const localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) };
    const innerWidth = 1280, innerHeight = 800, devicePixelRatio = 1;
    const matchMedia = () => ({ matches: false });
    const requestAnimationFrame = () => {};
    const setTimeout = () => 0;
    const location = { reload() {} };
  `;
  const inspection = `
    export const testGame = {
      start() { elements.get('playButton').click(); },
      state: () => state, carried: () => carry, player, bots, bases, entities, scene,
      interact, unlockShrine, shrine, tick, frame, tickBots, swing, lockBase, findTarget, bankCarry, returnCarry,
      moveActor, canMoveTo, createEntity, placeEntity, arrangeBase, populatePlayer,
      showMenu, closeMenu, effectiveIncome, save,
      paused: () => paused, performanceMode: () => performanceMode, shadows: () => renderer.shadowMap.enabled, setPlayerLock: value => { playerLock = value; },
      gameTime: () => gameTime,
      document, window, element: id => document.getElementById(id),
      saved: () => stored.get(SAVE_KEY),
      vector: (...coordinates) => new THREE.Vector3(...coordinates),
    };
  `;
  const code = environment + source + inspection + `\n//# sourceURL=brainrot-simulation-${instance}.js`;
  const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  module.testGame.start();
  return module.testGame;
}

function nearestSale(game, kind = 0) {
  return game.entities.find(entity => entity.sale && entity.kind === kind);
}

function buyFirst(game) {
  const entity = nearestSale(game);
  game.player.pos.copy(entity.mesh.position);
  game.interact();
  return entity;
}

test('full scene initializes and purchases deliver real scene entities with a saved ID', async () => {
  const game = await loadGame();
  assert.ok(game.scene.children.length > 100);
  assert.equal(game.element('playButton').disabled, false);
  const bought = buyFirst(game);
  assert.equal(game.state().money, 350);
  assert.equal(game.state().owned.length, 1);
  assert.equal(bought.id, game.state().owned[0].id);
  assert.equal(bought.owner, 0);
  assert.equal(bought.sale, false);
  assert.equal(game.bases[0].items[0], bought);
  assert.equal(bought.mesh.parent, game.scene);
  assert.deepEqual(JSON.parse(game.saved()).owned, [{ id: bought.id, kind: 0 }]);
});

test('shielded rivals reject theft; successful carried loot banks only at home', async () => {
  const game = await loadGame();
  const base = game.bases[1], entity = base.items[0];
  game.player.pos.copy(entity.mesh.position);
  base.lock = 10;
  game.interact();
  assert.equal(game.carried(), null);
  assert.equal(entity.carried, false);
  base.lock = 0;
  game.interact();
  assert.equal(game.carried(), entity);
  assert.equal(game.state().owned.length, 0);
  game.bankCarry();
  assert.equal(game.carried(), entity, 'loot must not bank while still in the rival base');
  game.player.pos.set(game.bases[0].x, 0, game.bases[0].z);
  game.bankCarry();
  assert.equal(game.carried(), null);
  assert.equal(game.state().owned.length, 1);
  assert.equal(game.state().stats.steals, 1);
  assert.equal(entity.owner, 0);
  assert.equal(base.items.includes(entity), false);
  assert.equal(game.bases[0].items.includes(entity), true);
});

test('bat recovery restores a stolen unit without changing its persistent identity', async () => {
  const game = await loadGame();
  const entity = buyFirst(game), bot = game.bots[0];
  const originalId = entity.id;
  entity.carried = true; bot.carry = entity; bot.mode = 'raid';
  bot.pos.copy(game.player.pos).add(game.vector(1, 0, 0));
  assert.equal(game.effectiveIncome(), 0);
  game.swing();
  assert.equal(bot.carry, null);
  assert.equal(entity.carried, false);
  assert.equal(entity.id, originalId);
  assert.equal(entity.owner, 0);
  assert.equal(game.state().stats.defends, 1);
  assert.equal(game.state().owned.length, 1);
  assert.equal(game.effectiveIncome(), 5);
});

test('full rival deposit preserves simultaneous player-carried loot in the scene', async () => {
  const game = await loadGame();
  const stolenFromPlayer = buyFirst(game);
  const bot = game.bots[0], base = bot.base;
  while (base.items.length < 6) {
    const entity = game.createEntity(0, base.owner);
    base.items.push(entity); game.placeEntity(entity, base, base.items.length - 1);
  }
  const stolenFromRival = base.items[0];
  base.lock = 0;
  game.player.pos.copy(stolenFromRival.mesh.position);
  game.interact();
  assert.equal(game.carried(), stolenFromRival);
  stolenFromPlayer.carried = true; bot.carry = stolenFromPlayer; bot.mode = 'chase';
  bot.pos.set(base.x, 0, base.z);
  game.tickBots(0.05);
  assert.equal(bot.carry, null);
  assert.equal(game.state().owned.length, 0);
  assert.equal(base.items.length, 6);
  assert.ok(base.items.includes(stolenFromRival));
  assert.ok(game.entities.includes(stolenFromRival));
  assert.equal(stolenFromRival.mesh.parent, game.scene);
  game.player.pos.set(game.bases[0].x, 0, game.bases[0].z);
  game.bankCarry();
  assert.equal(game.state().owned.length, 1);
  assert.equal(stolenFromRival.owner, 0);
  assert.equal(stolenFromRival.mesh.parent, game.scene);
});

test('paused gameplay rejects interactions and repeated Escape does not resume', async () => {
  const game = await loadGame();
  game.player.pos.copy(nearestSale(game).mesh.position);
  game.showMenu('pause');
  let blockedSpace=false;
  game.window.dispatch('keydown',{key:' ',repeat:false,preventDefault(){blockedSpace=true;}});
  assert.equal(blockedSpace,false,'Space should activate a focused menu button normally');
  game.interact();
  assert.equal(game.state().owned.length, 0);
  game.window.dispatch('keydown', { key: 'Escape', repeat: true, preventDefault() {} });
  assert.equal(game.paused(), true);
  game.window.dispatch('keydown', { key: 'Escape', repeat: false, preventDefault() {} });
  assert.equal(game.paused(), false);
  game.interact();
  assert.equal(game.state().owned.length, 1);
});

test('movement blocks wall tunneling, locked rival gates, and arena boundaries', async () => {
  const game = await loadGame();
  const rear = game.vector(24.8, 0, 14);
  game.moveActor(rear, 2.3, 0, 1);
  assert.ok(rear.x <= 25.5);
  game.bases[1].lock = 10;
  const entrance = game.vector(10, 0, 14);
  game.moveActor(entrance, 10, 0, 0);
  assert.ok(entrance.x <= 11.4, 'enemy shield should block a player approaching the entrance');
  const boundary = game.vector(30, 0, 0);
  game.moveActor(boundary, 20, 0, 0);
  assert.ok(boundary.x <= 31);
});

test('income ticks suspend escaping loot and activating a home shield recovers it', async () => {
  const game = await loadGame();
  const entity = buyFirst(game), bot = game.bots[0];
  for (let frame = 0; frame < 20; frame++) game.tick(0.05);
  assert.equal(game.state().money, 355);
  assert.equal(game.state().lifetime, 5);
  bot.carry = entity; entity.carried = true; bot.stun = 2;
  for (let frame = 0; frame < 20; frame++) game.tick(0.05);
  assert.equal(game.state().money, 355);
  assert.equal(game.state().lifetime, 5);
  game.player.pos.set(game.bases[0].x, 0, game.bases[0].z);
  bot.pos.copy(game.player.pos);
  game.setPlayerLock(0);
  game.lockBase();
  assert.equal(bot.carry, null);
  assert.equal(entity.carried, false);
  assert.equal(game.state().owned.length, 1);
  assert.equal(game.effectiveIncome(), 5);
  assert.equal(game.canMoveTo(game.player.pos, 1), false);
  assert.equal(game.canMoveTo(game.player.pos, 0), true);
});

test('actual animation loop freezes game time in menus and hidden tabs', async () => {
  const game = await loadGame();
  buyFirst(game);
  game.frame(performance.now() + 50);
  assert.ok(game.gameTime() > 0);
  const runningMoney = game.state().money, runningTime = game.gameTime();
  game.showMenu('pause');
  game.frame(performance.now() + 100);
  assert.equal(game.state().money, runningMoney);
  assert.equal(game.gameTime(), runningTime);
  game.closeMenu();
  game.document.hidden = true;
  game.frame(performance.now() + 150);
  assert.equal(game.state().money, runningMoney);
  assert.equal(game.gameTime(), runningTime);
});


test('forgotten shrine requires three discoveries and claims exactly once', async () => {
  const game=await loadGame();
  game.player.pos.copy(game.shrine.position);
  assert.equal(game.findTarget().type,'shrine');
  game.interact();assert.equal(game.state().owned.length,0);
  game.state().collection=[0,1,2];
  game.interact();
  assert.equal(game.state().owned.length,1);
  assert.equal(game.state().owned[0].kind,8);
  assert.equal(game.state().secretClaimed,true);
  assert.equal(game.bases[0].items[0].kind,8);
  assert.equal(game.state().stats.steals,0);
  assert.equal(game.state().money,450);
  assert.ok(JSON.parse(game.saved()).secretClaimed);
  game.interact();assert.equal(game.state().owned.length,1);
});

test('shrine is physically reachable through the north perimeter gap', async()=>{
  const game=await loadGame();
  const pos=game.vector(8,0,-31);
  game.moveActor(pos,10,0,0);
  assert.ok(pos.distanceTo(game.shrine.position)<.01);
});


test('performance lighting toggle is repeatable and keeps gameplay paused',async()=>{
  const game=await loadGame();const initialCount=game.entities.length;
  game.showMenu('pause');assert.equal(game.paused(),true);assert.equal(game.performanceMode(),false);
  game.element('qualityButton').click();assert.equal(game.performanceMode(),true);assert.equal(game.shadows(),false);
  game.element('qualityButton').click();assert.equal(game.performanceMode(),false);assert.equal(game.shadows(),true);
  assert.equal(game.paused(),true);assert.equal(game.entities.length,initialCount);
  game.closeMenu();assert.equal(game.paused(),false);
});


test('a pending optional GLB does not block the original game or allow a fake secret claim',async()=>{
  const game=await loadGame({secretPending:true});
  assert.equal(game.element('playButton').disabled,false);
  buyFirst(game);assert.equal(game.state().owned.length,1);
  game.state().collection=[0,1,2];game.player.pos.copy(game.shrine.position);game.interact();
  assert.equal(game.state().owned.length,1);assert.equal(game.state().secretClaimed,false);
});
