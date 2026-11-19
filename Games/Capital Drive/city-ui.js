// Event-driven phone panels. All money, inventory and world actions stay with owners.
export function createCityUI({ document, getState, onAction, onRoute, onOpen, onClose }) {
  const make = (tag, text, parent, id) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (id) node.id = id;
    if (parent) parent.append(node);
    return node;
  };
  const status = make('p', '', null, 'city-action-status');
  status.setAttribute('role', 'status');
  const phone = document.getElementById('phone-dialog');
  const section = make('section', undefined, phone);
  section.className = 'phone-service';
  make('h3', 'Services', section);
  let disposed = false;
  const act = (action, value) => {
    const result = onAction(action, value);
    status.textContent = result?.message || '';
    render();
    return result;
  };
  const button = (parent, text, action, id) => {
    const node = make('button', text, parent, id);
    node.type = 'button'; node.addEventListener('click', action);
    return node;
  };
  const dialog = make('dialog', undefined, document.body, 'city-dialog');
  dialog.setAttribute('aria-labelledby', 'city-title');
  const heading = make('div', undefined, dialog); heading.className = 'dialog-heading';
  const title = make('h2', 'Safehouses', heading, 'city-title');
  button(heading, 'Close', () => dialog.close(), 'city-close');
  dialog.addEventListener('close', () => onClose?.());
  const body = make('div', undefined, dialog); body.className = 'city-panel';
  dialog.append(status);
  let tab = 'properties';
  function open(next) {
    tab = next; status.textContent = ''; onOpen?.(); render(); dialog.showModal();
  }
  button(section, 'Safehouses & storage', () => open('properties'), 'city-properties-open');
  button(section, 'Hire crew', () => open('crew'), 'city-crew-open');
  button(section, 'Drone', () => open('drone'), 'city-drone-open');
  button(section, 'Food & weapon deliveries', () => open('deliveries'), 'city-deliveries-open');
  const amount = (parent, label, id, value) => {
    const wrapper = make('label', label, parent);
    const input = make('input', undefined, wrapper, id);
    input.type = 'number'; input.min = '1'; input.step = '1'; input.value = String(value);
    return input;
  };
  function render() {
    if (disposed) return;
    const state = getState();
    body.replaceChildren();
    if(tab==='deliveries'){
      title.textContent='Food & weapon deliveries';
      const courier=state.delivery;
      if(courier&&['approaching','waiting'].includes(courier.phase)){
        make('h3',courier.order.sourceName,body);
        make('p',courier.phase==='waiting'?'Courier stopped. Walk beside the van and press E.':'Courier en route. Your handover stop stays where you ordered.',body);
        button(body,'Route to handover',()=>onRoute({...courier.dropoff,name:'Courier handover'}),'city-delivery-route');
        button(body,'Cancel and refund',()=>act('cancel-delivery'),'city-delivery-cancel');
        return;
      }
      make('p','Orders arrive by road. Collect outside on foot. Prices include $50 delivery.',body);
      if(state.sandbox){make('p','Order deliveries in Street Life or Campaign.',body);return;}
      for(const source of state.deliveryOffers||[]){
        const row=make('section',undefined,body);row.className='city-row';
        make('h3',source.name,row);
        for(const item of source.items){
          const label=item.ok?`${item.name} · $${item.cost.toLocaleString()}`:`${item.name} · ${item.message}`;
          const order=button(row,label,()=>act('order-delivery',{kind:source.kind,sourceId:source.id,itemId:item.itemId}),`city-delivery-${source.id}-${item.itemId}`);
          order.disabled=!item.ok;
        }
      }
      return;
    }
    if (tab === 'crew') {
      title.textContent = 'Hire crew';
      for (const offer of state.crewOffers || []) {
        const row = make('section', undefined, body); row.className = 'city-row';
        const hired = state.hiredCrew?.includes(offer.id);
        const person = state.crew?.find(p => p.id.endsWith(offer.id));
        make('h3', offer.name, row);
        if (hired && person?.health <= 0 && (state.crewRenewals?.[offer.id] || 0) > (person.renewalSerial || 0)) {
          make('p', 'Crew returning', row);
        } else if (hired && person?.health <= 0) {
          button(row, `Rehire · $${offer.price.toLocaleString()}`, () => act('rehire', offer.id), `city-rehire-${offer.id}`);
        } else if (!hired) {
          button(row, `Hire · $${offer.price.toLocaleString()}`, () => act('hire', offer.id), `city-hire-${offer.id}`);
        } else make('p', 'Hired', row);
        if (hired) button(row, 'Dismiss', () => act('dismiss', offer.id), `city-dismiss-${offer.id}`);
      }
      return;
    }
    if (tab === 'drone') {
      title.textContent = 'Drone';
      if (state.drone?.active) {
        make('p', `${Math.ceil(state.drone.battery)} seconds remaining`, body);
        button(body, 'Recall drone', () => act('recall-drone'), 'city-drone-recall');
      } else if (state.droneOwned || state.sandbox) {
        make('p', 'Launch outside on foot. WASD moves, Space rises, Shift lowers. Your body stays behind.', body);
        button(body, 'Launch drone', () => act('launch-drone'), 'city-drone-launch');
      } else {
        button(body, 'Buy drone · $900', () => act('buy-drone'), 'city-drone-buy');
        button(body, 'Route to an equipment dealer', () => onRoute(state.droneDealer), 'city-drone-route');
      }
      return;
    }
    title.textContent = 'Safehouses & storage';
    if(!state.stash)for (const offer of state.properties || []) {
      const row = make('section', undefined, body); row.className = 'city-row';
      make('h3', offer.label || offer.name, row);
      const owned = state.ownedProperties?.includes(offer.id);
      if (owned) make('p', 'Owned safehouse', row);
      else button(row, `Buy · $${offer.price.toLocaleString()}`, () => act('buy-property', offer.id), `city-buy-${offer.id}`);
      button(row, 'Route to door', () => onRoute(offer), `city-route-${offer.id}`);
    }
    if (!state.stash) {
      make('p', 'Enter your safehouse to use its storage.', body);
      return;
    }
    const storage = make('section', undefined, body); storage.className = 'city-storage';
    make('h3', 'Safehouse stash', storage);
    const cash = amount(storage, `Loot cash stored: $${state.stash.cash.toLocaleString()}`, 'city-stash-cash', 100);
    const cashButtons = make('div', undefined, storage); cashButtons.className = 'button-row';
    button(cashButtons, 'Store cash', () => act('stash', { action: 'deposit', kind: 'cash', amount: Number(cash.value) }), 'city-store-cash');
    button(cashButtons, 'Take cash', () => act('stash', { action: 'withdraw', kind: 'cash', amount: Number(cash.value) }), 'city-take-cash');
    const count = amount(storage, 'Ammunition amount', 'city-stash-ammo', 30);
    for (const weapon of state.weapons || []) {
      const row = make('section', undefined, storage); row.className = 'city-row';
      make('h3', `${weapon.name} · ${state.stash.ammo[weapon.id] || 0} rounds stored`, row);
      const stored = state.stash.weapons.includes(weapon.id);
      const transfer = (action, kind, quantity) => act('stash', { action, kind, id: weapon.id, amount: quantity });
      button(row, stored ? 'Take weapon' : 'Store weapon', () => transfer(stored ? 'withdraw' : 'deposit', 'weapon', 1), `city-weapon-${weapon.id}`).disabled = !stored && !state.equipment?.[weapon.id];
      button(row, 'Store ammo', () => transfer('deposit', 'ammo', Number(count.value)), `city-store-ammo-${weapon.id}`);
      button(row, 'Take ammo', () => transfer('withdraw', 'ammo', Number(count.value)), `city-take-ammo-${weapon.id}`);
    }
  }
  return { dialogs: [dialog], render, open,
    dispose() { if (disposed) return; disposed = true; dialog.close(); dialog.remove(); section.remove(); } };
}
