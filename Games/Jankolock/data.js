function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const ARENA = freeze({
  width: 960,
  height: 600,
  zone: { x: 480, y: 300, radius: 70 },
  cover: [
    { x: 250, y: 130, w: 90, h: 90 },
    { x: 620, y: 130, w: 90, h: 90 },
    { x: 250, y: 380, w: 90, h: 90 },
    { x: 620, y: 380, w: 90, h: 90 },
  ],
  spawns: [
    { x: 110, y: 260 },
    { x: 110, y: 340 },
    { x: 850, y: 260 },
    { x: 850, y: 340 },
  ],
});

export const HEROES = freeze([
  {
    id: 'courier',
    name: 'Tin Courier',
    description: 'A square-helmeted runner with a paper satchel. Dash between cover and fire a short cone of stamps.',
    shape: 'square',
    abilities: [
      { id: 'rush', name: 'Receipt Rush', description: 'Dash 180 units toward your aim. Solid cover stops the dash.', cooldown: 8 },
      { id: 'burst', name: 'Stamp Burst', description: 'Fire three projectiles in a cone toward your aim. Cover blocks each shot.', cooldown: 7 },
    ],
  },
  {
    id: 'postmaster',
    name: 'Wobble Postmaster',
    description: 'A round padded coat built to hold ground. Absorb incoming damage and knock nearby opponents back.',
    shape: 'round',
    abilities: [
      { id: 'shield', name: 'Filing Shield', description: 'Absorb up to 40 damage for 3 seconds.', cooldown: 10 },
      { id: 'slam', name: 'Desk Slam', description: 'Deal 20 damage to opponents within 70 units and briefly knock them back. Cover bounds the knockback.', cooldown: 8 },
    ],
  },
  {
    id: 'clerk',
    name: 'Rattle Clerk',
    description: 'A tall triangular hat with a distraction plan. Leave a decoy and send a fan of staples toward opponents.',
    shape: 'triangle',
    abilities: [
      { id: 'decoy', name: 'Carbon Copy', description: 'Leave a stationary decoy that draws bot aim for 3 seconds.', cooldown: 10 },
      { id: 'fan', name: 'Staple Fan', description: 'Fire five low-damage projectiles in a spread toward your aim. Cover blocks each shot.', cooldown: 8 },
    ],
  },
]);

export const ITEMS = freeze([
  { id: 'envelope', name: 'Thick Envelope', description: '+20 maximum HP per stack. Start each round healed to the new maximum.' },
  { id: 'soles', name: 'Greased Soles', description: '+10% movement speed per stack, multiplied together.' },
  { id: 'staple', name: 'Extra Staple', description: '+15% basic-shot damage per stack, multiplied together.' },
  { id: 'forms', name: 'Quick Forms', description: '-10% basic-shot cooldown per stack, multiplied together.' },
  { id: 'thermos', name: 'Pocket Thermos', description: '-10% ability cooldowns per stack, multiplied together.' },
  { id: 'badge', name: 'Union Badge', description: '+10 shield on respawn per stack. Does not change capture scoring.' },
]);

export const RULES = freeze({
  roundSeconds: 60,
  winInfluence: 40,
  captureRate: 2,
  captureWarmup: 1,
  killInfluence: 4,
  respawnSeconds: 3,
  winsNeeded: 3,
});

function itemCounts(items) {
  if (!Array.isArray(items)) throw new TypeError('items must be an array of item IDs');
  const counts = Object.fromEntries(ITEMS.map(({ id }) => [id, 0]));
  for (const id of items) {
    if (typeof id !== 'string' || !Object.hasOwn(counts, id)) {
      throw new RangeError('unknown item ID');
    }
    counts[id] += 1;
    if (counts[id] > 2) throw new RangeError('item stacks cannot exceed two');
  }
  return counts;
}

export function statsFor(items) {
  const counts = itemCounts(items);
  return freeze({
    maxHp: 100 + 20 * counts.envelope,
    speed: 150 * 1.1 ** counts.soles,
    damage: 14 * 1.15 ** counts.staple,
    shotCooldown: 0.24 * 0.9 ** counts.forms,
    abilityMultiplier: 0.9 ** counts.thermos,
    spawnShield: 10 * counts.badge,
  });
}

function uint32(value, name) {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${name} must be an unsigned 32-bit integer`);
  }
}

function randomFor(seed, round, actorId) {
  uint32(seed, 'seed');
  uint32(round, 'round');
  uint32(actorId, 'actorId');
  if (round < 1 || round > 4) throw new RangeError('draft round must be 1 through 4');
  if (actorId > 3) throw new RangeError('actorId must be 0 through 3');
  // Separate round/actor streams; the LCG also accepts seed zero without getting stuck.
  let state = (seed ^ Math.imul(round, 0x9e3779b9) ^ Math.imul(actorId + 1, 0x85ebca6b)) >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function eligibleItems(items) {
  const counts = itemCounts(items);
  return ITEMS.filter(({ id }) => counts[id] < 2).map(({ id }) => id);
}

export function draftOffers(seed, round, items) {
  const random = randomFor(seed, round, 0);
  const eligible = eligibleItems(items);
  if (eligible.length < 3) throw new RangeError('draft requires three eligible items');
  const offers = [];
  for (let i = 0; i < 3; i += 1) {
    offers.push(eligible.splice(Math.floor(random() * eligible.length), 1)[0]);
  }
  return freeze(offers);
}

export function botItem(seed, round, actorId, items) {
  const random = randomFor(seed, round, actorId);
  const eligible = eligibleItems(items);
  if (!eligible.length) throw new RangeError('bot requires an eligible item');
  return eligible[Math.floor(random() * eligible.length)];
}
