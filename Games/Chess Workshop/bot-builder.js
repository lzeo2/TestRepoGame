import {
  ACTIONS, MAX_BOT_CODE_LENGTH, MAX_BOT_ELO, MAX_BOT_RULES, MAX_BOT_RULE_EVERY,
  MAX_BOT_TURN_MOVES, MIN_BOT_ELO, TRIGGERS, decodeBotCode, deleteCustomBot,
  describeBotRule, encodeBotCode, exportBot, importBot, listCustomBots, normalizeBot, saveCustomBot,
} from './bots.js';

const blockType = 'application/x-chess-workshop-block';
const blankRule = () => ({ trigger: '', action: '', amount: 50 });

function node(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text) item.textContent = text;
  return item;
}

function button(text, className) {
  const item = node('button', className, text);
  item.type = 'button';
  return item;
}

function downloadBot(bot) {
  const file = new Blob([exportBot(bot)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  const slug = bot.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  link.download = `${slug || 'custom-bot'}.chessbot.json`;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountBotBuilder(container, { onPlay }) {
  container.innerHTML = `
    <div class="bot-builder">
      <form class="bot-profile">
        <div class="bot-profile-fields">
          <label>Bot name<input name="name" required maxlength="40" placeholder="e.g. The Fading Knight"></label>
          <label>Starting Elo<input name="elo" type="number" required min="${MIN_BOT_ELO}" max="${MAX_BOT_ELO}" step="1"></label>
          <label>Starting moves per turn<select name="turnMoves" aria-describedby="bot-turn-help">
            ${Array.from({ length: MAX_BOT_TURN_MOVES }, (_, index) => `<option>${index + 1}</option>`).join('')}
          </select></label>
          <label>Your goal<select name="goal"><option value="win">Win the game</option><option value="draw">Draw to win</option></select></label>
        </div>
        <p class="bot-turn-help" id="bot-turn-help">Move-count rules apply at the start of each bot turn. Giving check ends that turn.</p>
        <div class="bot-builder-workspace">
          <div class="bot-palette">
            <h3>Blocks</h3>
            <p>Drag a block into a rule, or select a block and then its slot.</p>
            <div class="bot-palette-group" data-blocks="trigger"></div>
            <div class="bot-palette-group" data-blocks="action"></div>
          </div>
          <div class="bot-rule-editor">
            <h3>Rules</h3>
            <div class="bot-rules"></div>
            <button type="button" class="bot-button bot-add-rule">+ Add rule</button>
          </div>
        </div>
        <p class="bot-builder-status" role="status" aria-live="polite"></p>
        <div class="bot-builder-actions">
          <button type="submit" class="bot-button bot-button-primary">Save bot</button>
          <button type="button" class="bot-button bot-play-draft">Play draft</button>
          <button type="button" class="bot-button bot-new">New bot</button>
        </div>
      </form>
      <details class="bot-code">
        <summary>Bot codes</summary>
        <div class="bot-code-body">
          <label>Bot code<textarea class="bot-code-input" rows="3" maxlength="${MAX_BOT_CODE_LENGTH}"
            spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="Paste a CW1. code"></textarea></label>
          <div class="bot-code-actions">
            <button type="button" class="bot-button bot-generate-code">Get draft code</button>
            <button type="button" class="bot-button bot-copy-code">Copy code</button>
            <button type="button" class="bot-button bot-load-code">Load as draft</button>
          </div>
          <p class="bot-code-status" role="status"></p>
        </div>
      </details>
      <section class="bot-library">
        <div class="bot-library-heading">
          <h3>Saved bots</h3>
          <button type="button" class="bot-button bot-import">Import file</button>
          <input type="file" accept=".json,application/json" hidden aria-label="Import a bot file">
        </div>
        <ul class="bot-saved-list"></ul>
      </section>
    </div>`;

  const form = container.querySelector('.bot-profile');
  const nameInput = form.elements.namedItem('name');
  const eloInput = form.elements.namedItem('elo');
  const turnMovesInput = form.elements.namedItem('turnMoves');
  const goalInput = form.elements.namedItem('goal');
  const rulesList = form.querySelector('.bot-rules');
  const addRule = form.querySelector('.bot-add-rule');
  const status = form.querySelector('.bot-builder-status');
  const savedList = container.querySelector('.bot-saved-list');
  const importInput = container.querySelector('input[type="file"]');
  const codePanel = container.querySelector('.bot-code');
  const codeInput = container.querySelector('.bot-code-input');
  const codeStatus = container.querySelector('.bot-code-status');
  const paletteButtons = [];
  let botId = null;
  let rules = [];
  let picked = null;
  let dragging = null;

  function announce(text, error = false) {
    status.textContent = text;
    status.classList.toggle('bot-builder-error', error);
  }

  function showCode(bot) {
    codePanel.open = true;
    codeInput.value = encodeBotCode(bot);
    codeInput.focus();
    codeInput.select();
    announceCode(`Code ready for ${bot.name}.`);
  }

  function announceCode(text, error = false) {
    codeStatus.textContent = text;
    codeStatus.classList.toggle('bot-builder-error', error);
  }

  function pick(block) {
    picked = block;
    for (const item of paletteButtons) {
      item.button.setAttribute('aria-pressed', String(item.block === picked));
    }
  }

  for (const [kind, options] of [['trigger', TRIGGERS], ['action', ACTIONS]]) {
    const group = form.querySelector(`[data-blocks="${kind}"]`);
    group.append(node('h4', 'bot-block-heading', kind === 'trigger' ? 'IF' : 'THEN'));
    for (const [value, { title }] of Object.entries(options)) {
      const block = { kind, value, title };
      const item = button(title, `bot-block bot-block-${kind}`);
      item.setAttribute('aria-label', title);
      item.setAttribute('aria-pressed', 'false');
      item.draggable = true;
      paletteButtons.push({ button: item, block });
      group.append(item);
      item.addEventListener('click', () => {
        if (picked === block) {
          pick(null);
          announce('Block deselected.');
        } else {
          pick(block);
          announce(`Selected ${title}. Choose a slot marked ${kind === 'trigger' ? 'If' : 'Then'}.`);
        }
      });
      item.addEventListener('dragstart', event => {
        if (!event.dataTransfer) return;
        dragging = block;
        event.dataTransfer.setData(blockType, value);
        event.dataTransfer.effectAllowed = 'copy';
      });
      item.addEventListener('dragend', () => {
        dragging = null;
        for (const slot of rulesList.querySelectorAll('.bot-drop-ready')) slot.classList.remove('bot-drop-ready');
      });
    }
  }

  function ruleSlot(rule, index, kind, options, onPlace) {
    const slot = button(null, `bot-slot bot-slot-${kind}`);
    const title = node('span', 'bot-slot-title');
    const prefix = kind === 'trigger' ? 'If' : 'Then';
    const showValue = () => {
      title.textContent = options[rule[kind]]?.title ?? 'Choose block';
      slot.setAttribute('aria-label', `Rule ${index + 1}, ${prefix}: ${title.textContent}`);
      slot.classList.toggle('bot-slot-filled', !!rule[kind]);
    };
    const place = block => {
      if (block.kind !== kind) {
        announce(`Use ${kind === 'trigger' ? 'an If' : 'a Then'} block in that slot.`, true);
        return;
      }
      const previous = rule[kind];
      rule[kind] = block.value;
      showValue();
      onPlace?.(previous);
      pick(null);
      announce(`${block.title} added to rule ${index + 1}.`);
    };
    slot.append(node('span', 'bot-slot-label', prefix), title);
    showValue();
    slot.addEventListener('click', () => {
      if (picked) place(picked);
      else announce(`Select or drag a block from the ${prefix} group.`);
    });
    slot.addEventListener('dragover', event => {
      if (dragging?.kind !== kind || !event.dataTransfer) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      slot.classList.add('bot-drop-ready');
    });
    slot.addEventListener('dragleave', event => {
      if (!(event.relatedTarget instanceof Node) || !slot.contains(event.relatedTarget)) {
        slot.classList.remove('bot-drop-ready');
      }
    });
    slot.addEventListener('drop', event => {
      if (!dragging || event.dataTransfer?.getData(blockType) !== dragging.value) return;
      event.preventDefault();
      slot.classList.remove('bot-drop-ready');
      place(dragging);
    });
    return slot;
  }

  function renderRules() {
    const cards = rules.map((rule, index) => {
      const card = node('fieldset', 'bot-rule');
      card.append(node('legend', 'bot-rule-label', `Rule ${index + 1}`));
      const slots = node('div', 'bot-rule-slots');
      const preview = node('p', 'bot-rule-preview');
      const updatePreview = () => { preview.textContent = describeBotRule(rule); };
      const cadence = node('label', 'bot-cadence', 'Every');
      const frequency = node('input');
      const eventUnit = node('span', 'bot-change-unit', (rule.every ?? 1) === 1 ? 'event' : 'events');
      frequency.type = 'number';
      frequency.value = rule.every ?? 1;
      frequency.min = '1';
      frequency.max = MAX_BOT_RULE_EVERY;
      frequency.step = '1';
      frequency.required = true;
      frequency.setAttribute('aria-label', `Rule ${index + 1} event frequency`);
      frequency.addEventListener('input', () => {
        rule.every = frequency.valueAsNumber;
        eventUnit.textContent = rule.every === 1 ? 'event' : 'events';
        updatePreview();
      });
      cadence.append(frequency, eventUnit);
      const change = node('label', 'bot-change', 'By');
      const amount = node('input');
      const unit = node('span', 'bot-change-unit');
      amount.type = 'number';
      amount.min = '1';
      amount.step = '1';
      amount.required = true;
      const updateUnit = () => {
        const action = ACTIONS[rule.action];
        unit.textContent = action?.metric === 'elo' ? 'Elo' : action ? (rule.amount === 1 ? 'move' : 'moves') : '';
      };
      const updateAmount = () => {
        const action = ACTIONS[rule.action];
        amount.disabled = !action;
        amount.value = rule.amount;
        amount.max = action?.max ?? '';
        const label = action?.metric === 'turnMoves' ? 'move change' : 'Elo change';
        amount.setAttribute('aria-label', `Rule ${index + 1} ${label}`);
        updateUnit();
      };
      amount.addEventListener('input', () => {
        rule.amount = amount.valueAsNumber;
        updateUnit();
        updatePreview();
      });
      change.append(amount, unit);
      slots.append(
        ruleSlot(rule, index, 'trigger', TRIGGERS, updatePreview),
        ruleSlot(rule, index, 'action', ACTIONS, previous => {
          const action = ACTIONS[rule.action];
          if (ACTIONS[previous]?.metric !== action.metric) rule.amount = action.initial;
          updateAmount();
          updatePreview();
        }),
        cadence, change,
      );
      updateAmount();
      updatePreview();
      const remove = button('Remove', 'bot-button bot-remove-rule');
      remove.setAttribute('aria-label', `Remove rule ${index + 1}`);
      remove.addEventListener('click', () => {
        rules.splice(index, 1);
        renderRules();
        addRule.focus();
        announce(`Removed rule ${index + 1}.`);
      });
      const footer = node('div', 'bot-rule-footer');
      footer.append(preview, remove);
      card.append(slots, footer);
      return card;
    });
    rulesList.replaceChildren(...cards);
    addRule.disabled = rules.length >= MAX_BOT_RULES;
  }

  function edit(bot) {
    botId = bot?.id ?? null;
    nameInput.value = bot?.name ?? '';
    eloInput.value = bot?.elo ?? 1800;
    turnMovesInput.value = bot?.turnMoves ?? 1;
    goalInput.value = bot?.goal ?? 'win';
    rules = bot ? bot.rules.map(rule => ({ ...rule })) : [{ trigger: 'botMove', action: 'drop', amount: 50 }];
    pick(null);
    renderRules();
  }

  function readDraft() {
    return normalizeBot({
      name: nameInput.value, elo: eloInput.valueAsNumber, goal: goalInput.value,
      turnMoves: Number(turnMovesInput.value), rules,
    }, botId);
  }

  function publishSavedList() {
    renderLibrary();
    container.dispatchEvent(new Event('chess-workshop:bots-changed', { bubbles: true }));
  }

  function renderLibrary() {
    const profiles = listCustomBots();
    if (!profiles.length) {
      savedList.replaceChildren(node('li', 'bot-library-empty', 'Save a bot to play it again or share its rules.'));
      return;
    }
    savedList.replaceChildren(...profiles.map(bot => {
      const row = node('li', 'bot-saved');
      const detail = node('div', 'bot-saved-detail');
      const target = bot.goal === 'draw' ? 'Draw to win' : 'Play to win';
      const ruleCount = `${bot.rules.length} ${bot.rules.length === 1 ? 'rule' : 'rules'}`;
      const turnSize = `${bot.turnMoves} ${bot.turnMoves === 1 ? 'move' : 'moves'}/turn`;
      detail.append(node('strong', '', bot.name), node('span', '', `${bot.elo} Elo · ${turnSize} · ${target} · ${ruleCount}`));
      const commands = node('div', 'bot-saved-actions');
      const editBot = button('Edit', 'bot-button');
      editBot.addEventListener('click', () => {
        edit(bot);
        nameInput.focus();
        announce(`Editing ${bot.name}.`);
      });
      const play = button('Play', 'bot-button bot-button-primary');
      play.addEventListener('click', () => onPlay(bot));
      const download = button('Export', 'bot-button');
      download.addEventListener('click', () => downloadBot(bot));
      const share = button('Share code', 'bot-button');
      share.addEventListener('click', () => showCode(bot));
      const remove = button('Delete', 'bot-button');
      remove.addEventListener('click', () => {
        const persisted = deleteCustomBot(bot.id);
        if (botId === bot.id) botId = null;
        publishSavedList();
        container.querySelector('.bot-import').focus();
        announce(persisted ? `Deleted ${bot.name}.` : `Deleted ${bot.name} for this session.`);
      });
      for (const command of [editBot, play, download, share, remove]) {
        command.setAttribute('aria-label', `${command.textContent} ${bot.name}`);
        commands.append(command);
      }
      row.append(detail, commands);
      return row;
    }));
  }

  addRule.addEventListener('click', () => {
    rules.push(blankRule());
    renderRules();
    rulesList.lastElementChild.querySelector('button').focus();
    announce(`Rule ${rules.length} added.`);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const { bot, persisted } = saveCustomBot(readDraft(), botId);
      botId = bot.id;
      publishSavedList();
      announce(persisted ? `Saved ${bot.name}.` : `Saved ${bot.name} for this session. Browser storage is unavailable.`);
    } catch (error) {
      announce(error.message, true);
    }
  });
  form.querySelector('.bot-play-draft').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    try {
      onPlay(readDraft());
    } catch (error) {
      announce(error.message, true);
    }
  });
  form.querySelector('.bot-new').addEventListener('click', () => {
    edit(null);
    announce('New bot draft.');
    nameInput.focus();
  });
  codePanel.querySelector('.bot-generate-code').addEventListener('click', () => {
    if (!form.reportValidity()) return;
    try {
      showCode(readDraft());
    } catch (error) {
      announceCode(error.message, true);
    }
  });
  codePanel.querySelector('.bot-copy-code').addEventListener('click', async () => {
    const code = codeInput.value.trim();
    try {
      decodeBotCode(code);
    } catch (error) {
      announceCode(error.message, true);
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      announceCode('Bot code copied.');
    } catch {
      codeInput.focus();
      codeInput.select();
      announceCode('Bot code selected. Use your device’s copy command.');
    }
  });
  codePanel.querySelector('.bot-load-code').addEventListener('click', () => {
    try {
      edit(decodeBotCode(codeInput.value));
      announceCode('');
      announce('Loaded as a new draft. Save bot to add it to your library.');
      nameInput.focus();
    } catch (error) {
      announceCode(error.message, true);
    }
  });
  codeInput.addEventListener('input', () => announceCode(''));
  container.querySelector('.bot-import').addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    importInput.value = '';
    if (!file) return;
    try {
      if (file.size > 8192) throw new Error('Choose a Chess Workshop bot file under 8 KB.');
      edit(importBot(await file.text()));
      announce('Imported as a draft. Save bot to add it to your library.');
      nameInput.focus();
    } catch (error) {
      announce(error.message, true);
    }
  });

  edit(null);
  renderLibrary();
  return { refresh: renderLibrary };
}
