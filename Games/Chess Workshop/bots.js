export const MIN_BOT_ELO = 100;
export const MAX_BOT_ELO = 3190;
export const MAX_BOT_RULES = 6;

export const TRIGGERS = Object.freeze({
  botMove: Object.freeze({ title: 'Bot plays a move', counter: 'botMoves' }),
  playerMove: Object.freeze({ title: 'Player moves', counter: 'playerMoves' }),
  botCapture: Object.freeze({ title: 'Bot captures a piece', counter: 'botCaptures' }),
  botCheck: Object.freeze({ title: 'Bot gives check', counter: 'botChecks' }),
});

export const ACTIONS = Object.freeze({
  drop: Object.freeze({ title: 'Drop Elo', direction: -1 }),
  raise: Object.freeze({ title: 'Raise Elo', direction: 1 }),
});

const profile = (id, name, elo, goal, rules = []) => Object.freeze({
  id, name, elo, goal, rules: Object.freeze(rules.map(rule => Object.freeze(rule))),
});

export const BUILTIN_BOTS = Object.freeze([
  profile('stockfish', 'Stockfish', 1500, 'win'),
  profile('fading', 'Fading Stockfish', 2250, 'win', [{ trigger: 'botMove', action: 'drop', amount: 50 }]),
  profile('draw', 'Draw Trial', 1450, 'draw'),
]);

const storageKey = 'chess-workshop-bots-v1';
const maxSavedBots = 24;
const idPattern = /^custom-[a-z0-9-]{1,80}$/;
const integerInRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;

export function normalizeBot(value, id = null) {
  if (typeof value?.name !== 'string') throw new Error('Give the bot a name.');
  const name = value.name.trim();
  if (!name || name.length > 40) throw new Error('Use a bot name between 1 and 40 characters.');
  if (!integerInRange(value.elo, MIN_BOT_ELO, MAX_BOT_ELO)) {
    throw new Error(`Choose a starting Elo between ${MIN_BOT_ELO} and ${MAX_BOT_ELO}.`);
  }
  if (value.goal !== 'win' && value.goal !== 'draw') throw new Error('Choose a goal for the player.');
  if (!Array.isArray(value.rules) || value.rules.length > MAX_BOT_RULES) {
    throw new Error(`Use up to ${MAX_BOT_RULES} rules.`);
  }
  const rules = Array.from(value.rules, (rule, index) => {
    if (!Object.hasOwn(TRIGGERS, rule?.trigger) || !Object.hasOwn(ACTIONS, rule?.action)) {
      throw new Error(`Choose an If block and a Then block for rule ${index + 1}.`);
    }
    if (!integerInRange(rule.amount, 1, 500)) throw new Error(`Use an Elo change from 1 to 500 in rule ${index + 1}.`);
    return { trigger: rule.trigger, action: rule.action, amount: rule.amount };
  });
  return profile(id, name, value.elo, value.goal, rules);
}

export function botStrength(bot, counters = {}) {
  let elo = bot.elo;
  for (const rule of bot.rules) {
    const count = counters[TRIGGERS[rule.trigger].counter];
    if (Number.isSafeInteger(count) && count > 0) {
      elo += count * rule.amount * ACTIONS[rule.action].direction;
    }
  }
  return Math.max(MIN_BOT_ELO, Math.min(MAX_BOT_ELO, elo));
}

export function exportBot(bot) {
  const { name, elo, goal, rules } = normalizeBot(bot);
  return JSON.stringify({ format: 'chess-workshop-bot', version: 1, bot: { name, elo, goal, rules } }, null, 2);
}

export function importBot(text) {
  if (typeof text !== 'string' || text.length > 8192) throw new Error('Choose a Chess Workshop bot file under 8 KB.');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not valid JSON.');
  }
  if (data?.format !== 'chess-workshop-bot' || data.version !== 1) {
    throw new Error('Choose a Chess Workshop bot file.');
  }
  return normalizeBot(data.bot);
}

export function createBotStore(storage) {
  let bots = [];
  let idSequence = 0;
  let stored;
  try {
    stored = JSON.parse(storage?.getItem(storageKey) || '[]');
  } catch {
    stored = [];
  }
  if (Array.isArray(stored)) {
    for (const item of stored.slice(0, maxSavedBots)) {
      if (typeof item?.id !== 'string' || !idPattern.test(item.id) || bots.some(bot => bot.id === item.id)) continue;
      try {
        bots.push(normalizeBot(item, item.id));
      } catch {
        // Keep the other profiles if an individual entry is invalid.
        continue;
      }
    }
  }
  function persist() {
    if (!storage) return false;
    try {
      storage.setItem(storageKey, JSON.stringify(bots));
      return true;
    } catch {
      return false;
    }
  }
  return {
    list: () => bots.slice(),
    save(value, id) {
      const index = bots.findIndex(bot => bot.id === id);
      if (index < 0 && bots.length >= maxSavedBots) throw new Error(`You can keep up to ${maxSavedBots} saved bots.`);
      const newId = index >= 0 ? id : `custom-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + '-' + ++idSequence}`;
      const bot = normalizeBot(value, newId);
      if (index >= 0) bots[index] = bot;
      else bots.push(bot);
      return { bot, persisted: persist() };
    },
    delete(id) {
      bots = bots.filter(bot => bot.id !== id);
      return persist();
    },
  };
}

function browserStorage() {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
const store = createBotStore(browserStorage());
export const listCustomBots = store.list;
export const saveCustomBot = store.save;
export const deleteCustomBot = store.delete;
