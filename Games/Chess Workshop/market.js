import {
  MAX_BOT_CODE_LENGTH, decodeBotCode, describeBotRule, encodeBotCode,
  listCustomBots, normalizeBot, saveCustomBot,
} from './bots.js';

const catalog = [
  {
    key: 'opening-rush',
    name: 'Opening Rush',
    elo: 1500,
    turnMoves: 3,
    description: 'Weather an early rush. The bot loses a move from its allowance after every two moves it plays.',
    rules: [{ trigger: 'botMove', action: 'dropMoves', amount: 1, every: 2 }],
  },
  {
    key: 'counterpunch',
    name: 'Counterpunch',
    elo: 1400,
    description: 'Every piece you capture raises the bot’s Elo target by 100.',
    rules: [{ trigger: 'playerCapture', action: 'raise', amount: 100 }],
  },
  {
    key: 'three-beat',
    name: 'Three Beat',
    elo: 1350,
    description: 'Every third move the bot plays adds a move to its future turns, up to four.',
    rules: [{ trigger: 'botMove', action: 'raiseMoves', amount: 1, every: 3 }],
  },
  {
    key: 'quiet-siege',
    name: 'Quiet Siege',
    elo: 1500,
    turnMoves: 2,
    description: 'The bot starts with two moves per turn. Each check it gives reduces its future allowance.',
    rules: [{ trigger: 'botCheck', action: 'dropMoves', amount: 1 }],
  },
  {
    key: 'check-pressure',
    name: 'Check Pressure',
    elo: 2000,
    description: 'Every second check you give drops the bot’s Elo target by 150.',
    rules: [{ trigger: 'playerCheck', action: 'drop', amount: 150, every: 2 }],
  },
  {
    key: 'truce',
    name: 'Truce',
    elo: 1600,
    goal: 'draw',
    description: 'Aim for a drawn game. The bot weakens after every eight moves you play.',
    rules: [{ trigger: 'playerMove', action: 'drop', amount: 50, every: 8 }],
  },
];

export const MARKET_BOTS = Object.freeze(catalog.map(({ key, description, ...data }) => Object.freeze({
  key, description, bot: normalizeBot({ goal: 'win', ...data }),
})));

const shareInputLimit = MAX_BOT_CODE_LENGTH + 2048;
const submissionsUrl = 'https://github.com/lzeo2/TestRepoGame/issues/new';

export function findMarketBots(query = '', filter = 'all') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return MARKET_BOTS.filter(({ bot, description }) => {
    if (filter === 'draw' && bot.goal !== 'draw') return false;
    if (filter === 'bonus' && bot.turnMoves === 1 && !bot.rules.some(rule => rule.action === 'raiseMoves')) return false;
    if (filter === 'elo' && !bot.rules.some(rule => rule.action === 'raise' || rule.action === 'drop')) return false;
    const text = [bot.name, description, ...bot.rules.map(describeBotRule)].join(' ').toLowerCase();
    return words.every(word => text.includes(word));
  });
}

export function decodeMarketCode(value) {
  if (typeof value !== 'string' || value.length > shareInputLimit) {
    throw new Error('Paste a valid reusable bot code or share link.');
  }
  const input = value.trim();
  const hash = input.indexOf('#');
  const code = hash === -1 ? input : new URLSearchParams(input.slice(hash + 1)).get('bot');
  if (!code) throw new Error('Paste a reusable bot code or share link.');
  return decodeBotCode(code);
}

export function mountMarketplace(container, { onPlay }) {
  const doc = container.ownerDocument;
  const window = doc.defaultView;
  container.innerHTML = `
    <div class="market-layout">
      <section class="market-catalog" aria-labelledby="market-title">
        <h2 id="market-title">Bot marketplace</h2>
        <div class="market-filters">
          <label>Search bots
            <input type="search" class="market-search" placeholder="Name or rule" maxlength="90">
          </label>
          <label>Bot style
            <select class="market-filter">
              <option value="all">All styles</option>
              <option value="bonus">Bonus turns</option>
              <option value="elo">Elo rules</option>
              <option value="draw">Draw goals</option>
            </select>
          </label>
        </div>
        <p class="market-state" role="status"></p>
        <div class="market-grid"></div>
      </section>
      <aside class="market-side" aria-labelledby="market-import-title">
        <details class="market-import">
          <summary id="market-import-title">Load a bot code</summary>
          <form class="market-import-form">
            <label class="market-code-label">Reusable code or share link
              <textarea rows="3" class="market-code-input" spellcheck="false" autocomplete="off"></textarea>
            </label>
            <button type="submit" class="secondary">Preview bot</button>
          </form>
          <p class="market-message" role="status"></p>
        </details>
        <div class="market-preview"></div>
      </aside>
    </div>
    <dialog class="market-share" aria-labelledby="market-share-title">
      <div class="market-share-title">
        <h2 id="market-share-title">Share bot</h2>
        <form method="dialog"><button type="submit" class="quiet">Close</button></form>
      </div>
      <label>Reusable bot code
        <textarea class="market-export-code" readonly rows="3"></textarea>
      </label>
      <label>Share link
        <input class="market-export-link" type="text" readonly>
      </label>
      <div class="market-share-actions">
        <button type="button" class="primary market-copy-code">Copy code</button>
        <button type="button" class="secondary market-copy-link">Copy link</button>
      </div>
      <p class="market-copy-status" role="status"></p>
      <div class="market-submit" hidden>
        <a class="market-submit-link" target="_blank" rel="noopener noreferrer">Open submission draft</a>
        <p>Submissions are reviewed before they appear in the catalog.</p>
      </div>
    </dialog>
  `;
  const find = selector => container.querySelector(selector);
  const search = find('.market-search');
  const filter = find('.market-filter');
  const grid = find('.market-grid');
  const state = find('.market-state');
  const importer = find('.market-import');
  const form = find('.market-import-form');
  const input = find('.market-code-input');
  const preview = find('.market-preview');
  const message = find('.market-message');
  const dialog = find('.market-share');
  const sharedCode = find('.market-export-code');
  const sharedLink = find('.market-export-link');
  const copyStatus = find('.market-copy-status');
  const submit = find('.market-submit');
  const submitLink = find('.market-submit-link');
  importer.open = window.matchMedia('(min-width: 691px)').matches;
  input.maxLength = shareInputLimit;

  let saved = new Map();

  function create(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action, label) {
    const node = create('button', className, text);
    node.type = 'button';
    if (label) node.setAttribute('aria-label', label);
    node.addEventListener('click', action);
    return node;
  }

  function showMessage(text, tone = '') {
    message.dataset.tone = tone;
    message.textContent = text;
  }

  function refresh() {
    saved = new Map(listCustomBots().map(bot => [encodeBotCode(bot), bot]));
    for (const node of container.querySelectorAll('[data-market-save]')) {
      const bot = saved.get(node.dataset.marketSave);
      node.textContent = bot ? 'Saved' : 'Save bot';
      node.classList.toggle('market-saved', Boolean(bot));
    }
  }

  function save(bot, code) {
    if (saved.has(code)) return showMessage(`${bot.name} is already in your collection.`, 'good');
    try {
      const { persisted } = saveCustomBot(bot);
      refresh();
      container.dispatchEvent(new window.Event('chess-workshop:bots-changed', { bubbles: true }));
      showMessage(persisted ? `Saved ${bot.name} to Bot Studio.` : `Saved ${bot.name} for this visit.`, 'good');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  function openShare(bot, code, maySubmit) {
    find('#market-share-title').textContent = `Share ${bot.name}`;
    sharedCode.value = code;
    const link = new URL(window.location.href);
    link.hash = new URLSearchParams({ bot: code }).toString();
    sharedLink.value = link.href;
    copyStatus.textContent = '';
    submit.hidden = !maySubmit;
    if (maySubmit) {
      const draft = new URL(submissionsUrl);
      draft.searchParams.set('title', `Chess Workshop bot: ${bot.name}`);
      draft.searchParams.set('body', `## Bot code\n\n${code}\n\n## Description\n\nDescribe how this bot plays.\n`);
      submitLink.href = draft.href;
    }
    dialog.showModal();
  }

  async function copy(field, label) {
    field.focus();
    field.select();
    try {
      await window.navigator.clipboard.writeText(field.value);
      copyStatus.textContent = `${label} copied.`;
    } catch {
      copyStatus.textContent = `${label} selected. Use your device’s copy command.`;
    }
  }

  function card({ bot, description, key }) {
    const code = encodeBotCode(bot);
    const article = create('article', 'market-card');
    if (key) article.dataset.marketBot = key;
    article.append(create('h3', '', bot.name));

    const stats = create('dl', 'market-stats');
    for (const [label, value] of [
      ['Starting Elo', bot.elo],
      ['Starting moves', bot.turnMoves],
      ['Your goal', bot.goal === 'draw' ? 'Draw' : 'Win'],
    ]) {
      const pair = create('div');
      pair.append(create('dt', '', label), create('dd', '', value));
      stats.append(pair);
    }
    article.append(stats);
    if (description) article.append(create('p', 'market-description', description));
    if (bot.rules.length) {
      const details = create('details', 'market-rules');
      const rules = create('ul');
      for (const rule of bot.rules) rules.append(create('li', '', describeBotRule(rule)));
      details.append(create('summary', '', 'Rules'), rules);
      article.append(details);
    }

    const actions = create('div', 'market-actions');
    const saveButton = button('Save bot', 'secondary', () => save(bot, code), `Save ${bot.name}`);
    saveButton.dataset.marketSave = code;
    actions.append(
      button('Play', 'primary', () => onPlay(saved.get(code) ?? bot), `Play ${bot.name}`),
      saveButton,
      button('Share', 'quiet', () => openShare(bot, code, !key), `Share ${bot.name}`),
    );
    article.append(actions);
    return article;
  }

  function displayCatalog() {
    const results = findMarketBots(search.value, filter.value);
    grid.replaceChildren(...results.map(card));
    state.textContent = results.length ? `${results.length} ${results.length === 1 ? 'bot' : 'bots'}` : 'No bots match these filters.';
    refresh();
  }

  function importCode(value) {
    importer.open = true;
    input.value = typeof value === 'string' ? value.slice(0, shareInputLimit) : '';
    try {
      const bot = decodeMarketCode(value);
      preview.replaceChildren(card({ bot }));
      showMessage(`${bot.name} is ready to play or save.`, 'good');
      refresh();
      return true;
    } catch (error) {
      preview.replaceChildren();
      showMessage(error.message, 'error');
      return false;
    }
  }

  search.addEventListener('input', displayCatalog);
  filter.addEventListener('change', displayCatalog);
  form.addEventListener('submit', event => {
    event.preventDefault();
    importCode(input.value);
  });
  find('.market-copy-code').addEventListener('click', () => void copy(sharedCode, 'Code'));
  find('.market-copy-link').addEventListener('click', () => void copy(sharedLink, 'Link'));
  displayCatalog();
  return { importCode, refresh };
}
