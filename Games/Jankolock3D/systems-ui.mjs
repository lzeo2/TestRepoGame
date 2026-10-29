import { ITEMS } from './systems.mjs';
const number = n => Math.floor(n).toLocaleString('en-US');
const title = item => item.id.replaceAll('-', ' ').replace(/^./, c => c.toUpperCase());

// Mount inside the host's page; this component owns neither the game loop nor HUD layout.
export function mountSystemsUI(root, sim, heroId) {
  root.classList.add('systems-ui');
  root.innerHTML = `<div class="sys-hud" aria-label="Hero resources">
    <span>Souls <strong data-souls></strong></span><span>Level <strong data-level></strong></span>
    <span>Health <strong data-health></strong></span><span>Next wave <strong data-wave></strong></span>
    <button type="button" data-open>Shop (B)</button></div>
    <aside class="sys-shop" aria-labelledby="sys-shop-title" hidden>
      <div class="sys-heading"><h2 id="sys-shop-title">Shop</h2><button type="button" data-close>Close</button></div>
      <p>Earn souls. Shop at base (B on map) or during respawn.</p>
      <p class="sys-policy">Match-only, one of each. No selling, refunds or replacements. Restart clears items and souls.</p>
      <section class="sys-confirm" aria-label="Review purchase" hidden><p data-review></p><button type="button" data-confirm-purchase>Confirm purchase</button><button type="button" data-cancel-purchase>Cancel</button></section>
      <div class="sys-balance"><span>Souls available <strong data-balance></strong></span><span>Inventory <strong data-capacity></strong></span></div>
      <div class="sys-tiers" role="group" aria-label="Item tier"></div>
      <div class="sys-items"></div><div class="sys-slots" aria-label="Inventory"></div>
      <p class="sys-flex"></p>
    </aside>
    <p class="sys-notice" role="status" aria-live="polite">Hold X at a retreat ring to return to base.</p>`;
  const $ = selector => root.querySelector(selector);
  const panel = $('.sys-shop'), tierRoot = $('.sys-tiers'), itemRoot = $('.sys-items'), slots = $('.sys-slots');
  const openButton = $('[data-open]'), closeButton = $('[data-close]');
  const reviewPanel=$('.sys-confirm'),confirmButton=$('[data-confirm-purchase]');
  let tier = 1, pending = null, previousAvailable = false, previousAlive = true, previousItems = '', disposed = false;
  const listeners = new AbortController(), options = { signal: listeners.signal };
  let noticeUntil = 0;
  const message = (text, passive = false) => {
    if(disposed)return;
    // Per-frame hints must not erase a hit, purchase or error before it can be read.
    if (passive && sim.time < noticeUntil) return;
    if (!passive) noticeUntil = sim.time + .6;
    const output = $('.sys-notice'); if (output.textContent !== text) output.textContent = text;
  };
  const hero = () => sim.heroes.find(h => h.id === heroId);
  const button = (text, label, fn) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = text;
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', fn, options); return b;
  };
  function clearReview(focus=false) {
    const trigger=pending?.button;pending=null;reviewPanel.hidden=true;
    if(focus&&trigger?.isConnected)trigger.focus();
  }
  function setOpen(open, focus = false) {
    if(disposed)return;
    if (open && !sim.shopAvailable(heroId)) { message('Return to your base or wait until respawning to shop.'); return; }
    if(open)document.exitPointerLock?.();else clearReview();
    panel.hidden = !open;
    openButton.setAttribute('aria-expanded', String(open));
    if (focus) (open ? closeButton : openButton).focus();
  }
  confirmButton.addEventListener('click',()=>{
    const item=pending?.item;if(!item||disposed)return;
    clearReview(); // Consume the review before the authoritative transaction.
    const result=sim.buyItem(heroId,item.id);
    message(result.ok?`${title(item)} purchased for ${number(item.cost)} souls.`:result.reason);
    update();closeButton.focus();
  },options);
  $('[data-cancel-purchase]').addEventListener('click',()=>clearReview(true),options);
  function drawItems() {
    clearReview();itemRoot.replaceChildren();
    for (const item of ITEMS.filter(i => i.tier === tier)) {
      const card = document.createElement('section'); card.className = 'sys-item';
      const heading = document.createElement('h3'); heading.textContent = title(item); heading.title = item.name;
      const description = document.createElement('p'); description.textContent = item.description;
      const price = document.createElement('strong'); price.textContent = `${number(item.cost)} souls`;
      const buy = button('Buy', `Buy ${title(item)}`, () => {
        if(disposed)return;pending={item,button:buy};reviewPanel.hidden=false;update();confirmButton.focus();
      });
      buy.dataset.item = item.id; card.append(heading, description, price, buy); itemRoot.append(card);
    }
    for (const input of tierRoot.querySelectorAll('input')) input.checked = Number(input.value) === tier;
  }
  for (let t = 1; t <= 4; t++) {
    const label = document.createElement('label'), input = document.createElement('input');
    input.type = 'radio'; input.name = 'systems-item-tier'; input.value = String(t);
    input.addEventListener('change', () => { tier = t; drawItems(); update(); }, options);
    label.append(input, `Tier ${t} / ${number(800 * 2 ** (t - 1))}`); tierRoot.append(label);
  }
  openButton.addEventListener('click', () => setOpen(panel.hidden, true), options);
  closeButton.addEventListener('click', () => setOpen(false, true), options);
  const editing = target => target instanceof Element && !!target.closest('input,textarea,select,[contenteditable="true"]');
  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || editing(event.target)) return;
    if (event.code === 'KeyB' && !event.repeat) { event.preventDefault(); setOpen(panel.hidden, true); }
    if (event.code === 'Escape' && !panel.hidden) { event.preventDefault(); if(pending)clearReview(true);else setOpen(false, true); }
    if (event.code === 'KeyX' && !event.repeat) sim.setRetreat(heroId, true);
  }, options);
  window.addEventListener('keyup', event => { if (event.code === 'KeyX') sim.setRetreat(heroId, false); }, options);
  const clearInput = () => sim.setRetreat(heroId, false);
  window.addEventListener('blur', clearInput, options);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInput(); }, options);
  function drawSlots(h) {
    slots.replaceChildren();
    for (let i = 0; i < 6 + h.flexSlots; i++) {
      const item = ITEMS.find(a => a.id === h.items[i]);
      const slot = item?.active ? button(title(item), `Activate ${title(item)}`, () => {
        const result = sim.activateItem(heroId, item.id);
        message(result.ok ? `${title(item)} activated.` : result.reason); update();
      }) : document.createElement('span');
      if (!item?.active) slot.textContent = item ? title(item) : '';
      slot.className = 'sys-slot'; slot.setAttribute('aria-label', item ? `${title(item)}${item.active ? ', activate' : ', passive'}` : `Empty slot ${i + 1}`);
      if (item?.active) slot.dataset.active = item.id;
      slots.append(slot);
    }
  }
  function update() {
    if (disposed) return;
    const h = hero(); if (!h) return;
    $('[data-souls]').textContent = $('[data-balance]').textContent = number(h.souls);
    $('[data-level]').textContent = String(h.level);
    $('[data-health]').textContent = h.alive ? `${number(h.hp)} / ${number(h.maxHp)}` : `Respawn ${Math.ceil(h.respawnRemaining)}s`;
    $('[data-wave]').textContent = sim.winner ? 'Match ended' : `${Math.ceil(sim.time < 30 ? 30 - sim.time : 25 - (sim.time - 30) % 25)}s`;
    $('[data-capacity]').textContent = `${h.items.length} / ${6 + h.flexSlots} slots`;
    $('.sys-flex').textContent = h.flexSlots === 3 ? 'All 3 flex slots unlocked.' : `Defeat Walkers to unlock ${3 - h.flexSlots} flex slot${h.flexSlots === 2 ? '' : 's'}.`;
    const available = sim.shopAvailable(heroId);
    if (available && (!previousAvailable || previousAlive && !h.alive)) setOpen(true);
    if (!available) setOpen(false);
    previousAvailable = available; previousAlive = h.alive;
    const cannotBuy=item=>h.items.includes(item.id)||!available||h.souls<item.cost||h.items.length>=6+h.flexSlots;
    for (const b of itemRoot.querySelectorAll('button')) {
      const item = ITEMS.find(i => i.id === b.dataset.item), owned = h.items.includes(item.id);
      b.textContent = owned ? 'Owned' : 'Buy';b.disabled=cannotBuy(item);
    }
    if(pending){
      const item=pending.item;
      $('[data-review]').textContent=`${title(item)}: ${item.description} Cost ${number(item.cost)} souls.`;
      confirmButton.textContent=`Confirm ${number(item.cost)} souls`;confirmButton.disabled=cannotBuy(item);
    }
    const key = `${h.items.join(',')}/${h.flexSlots}`;
    if (key !== previousItems) { drawSlots(h); previousItems = key; }
    for (const b of slots.querySelectorAll('button')) {
      const id = b.dataset.active, cooling = (h.cooldowns[id] ?? 0) > sim.time;
      b.disabled = !h.alive || sim.phase === 'pregame' || sim.phase === 'finished' || cooling || id === 'dash-charge' && h.dashCharges <= 0;
      b.title = cooling ? `Ready in ${Math.ceil(h.cooldowns[id] - sim.time)}s` : 'Activate item';
    }
    if (h.recall) message(`Returning to base in ${Math.max(0, Math.ceil(3 - sim.time + h.recall.started))}s. Keep holding X.`, true);
  }
  drawItems(); update();
  return { update, message, open: () => setOpen(true, true), close: () => setOpen(false, true),
    dispose() { if (disposed) return; disposed = true; clearReview(); clearInput(); listeners.abort(); root.replaceChildren(); root.classList.remove('systems-ui'); } };
}
