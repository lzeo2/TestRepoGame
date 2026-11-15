// Transient campaign abilities. The controller supplies live identity and time;
// Gameplay and Simulation remain the owners of movement, attacks and vehicles.
export const HERO_POWERS = Object.freeze({
  student: Object.freeze({ name: 'Adrenaline', hero: 'Kit', duration: 8, cooldown: 40, mode: 'foot' }),
  corporate: Object.freeze({ name: 'Focus', hero: 'Rowan', duration: 8, cooldown: 40, mode: 'foot' }),
  basement: Object.freeze({ name: 'Redline', hero: 'Milo', duration: 8, cooldown: 40, mode: 'vehicle' })
});
const NORMAL = Object.freeze({ footSpeed: 1, jump: 1, gunAttack: 1, reload: 1, engine: 1, handling: 1 });
const BOOSTS = Object.freeze({
  student: Object.freeze({ ...NORMAL, footSpeed: 1.35, jump: 1.35 }),
  corporate: Object.freeze({ ...NORMAL, gunAttack: 0.65, reload: 0.65 }),
  basement: Object.freeze({ ...NORMAL, engine: 1.25, handling: 1.25 })
});
const knownHero = id => typeof id === 'string' && Object.hasOwn(HERO_POWERS, id);

function denial(character, context) {
  if (!knownHero(character) || context?.campaign !== true || context.character !== character) return 'Choose a campaign hero.';
  if (!Number.isFinite(context.health) || context.health <= 0 || context.recovering) return 'Recover before using a power.';
  if (context.paused || context.protectedWork || context.cutscene || context.miniGame || context.passenger ||
      (context.impactTime !== undefined && (!Number.isFinite(context.impactTime) || context.impactTime !== 0))) {
    return 'Finish your current action before using a power.';
  }
  if (context.mode !== HERO_POWERS[character].mode ||
      (character === 'basement' && context.manualDriving !== true)) {
    return character === 'basement' ? 'Drive a car to use Redline.' : 'Go on foot to use this power.';
  }
  return null;
}

export function createHeroPowers() {
  const cooldowns = { student: 0, corporate: 0, basement: 0 };
  let character = null, activeCharacter = null, remaining = 0;
  function activate(id, context) {
    const reason = denial(id, context);
    if (reason) return Object.freeze({ ok: false, message: reason });
    if (cooldowns[id] > 0) return Object.freeze({ ok: false, message: `${HERO_POWERS[id].name} is recharging.` });
    character = id; activeCharacter = id; remaining = HERO_POWERS[id].duration;
    cooldowns[id] = HERO_POWERS[id].cooldown;
    return Object.freeze({ ok: true, message: `${HERO_POWERS[id].name} active.` });
  }
  function step(dt, context) {
    if (!Number.isFinite(dt) || dt <= 0 || context?.paused) return;
    for (const id of Object.keys(cooldowns)) cooldowns[id] = Math.max(0, cooldowns[id] - dt);
    character = knownHero(context?.character) ? context.character : null;
    if (activeCharacter && (character !== activeCharacter || denial(activeCharacter, context))) {
      activeCharacter = null; remaining = 0;
    } else if (activeCharacter) {
      remaining = Math.max(0, remaining - dt);
      if (remaining === 0) activeCharacter = null;
    }
  }
  function modifiers(context) {
    return activeCharacter && remaining > 0 && !denial(activeCharacter, context) ? BOOSTS[activeCharacter] : NORMAL;
  }
  function snapshot() {
    const heroes = {};
    for (const id of Object.keys(HERO_POWERS)) heroes[id] = Object.freeze({ ...HERO_POWERS[id],
      cooldown: cooldowns[id], active: activeCharacter === id, remaining: activeCharacter === id ? remaining : 0 });
    return Object.freeze({ character, activeCharacter, remaining,
      cooldown: character ? cooldowns[character] : 0, heroes: Object.freeze(heroes) });
  }
  function cancelActive() { activeCharacter = null; remaining = 0; }
  function resetSession() {
    character = null; activeCharacter = null; remaining = 0;
    for (const id of Object.keys(cooldowns)) cooldowns[id] = 0;
  }
  return { activate, step, modifiers, snapshot, cancelActive, resetSession };
}
