import { DELIVERY_METHODS } from './delivery-service.js';
import { UTILITY_GEAR } from './progression.js';
import { CAMERA_PULSE } from './security-cameras.js';

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
  let tab = 'properties', deliveryMethod = 'legal';
  function open(next) {
    tab = next; status.textContent = ''; onOpen?.(); render(); dialog.showModal();
  }
  button(section, 'Safehouses', () => open('properties'), 'city-properties-open');
  button(section, 'Crew', () => open('crew'), 'city-crew-open');
  button(section, 'Drone', () => open('drone'), 'city-drone-open');
  button(section, 'Gear', () => open('gear'), 'city-gear-open');
  button(section, 'Deliveries', () => open('deliveries'), 'city-deliveries-open');
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
    if(tab==='gear'){
      title.textContent='Gear';
      const gear=state.gear||{};
      const armour=make('section',undefined,body);armour.className='city-row';
      make('h3',`${UTILITY_GEAR.armour.name} · ${gear.armour??0}/${UTILITY_GEAR.armour.capacity}`,armour,'city-armour-state');
      make('p',state.sandbox?'Unlimited supplies in Free roam.':'Reduces incoming damage. Refill at an equipment dealer.',armour);
      for(const kind of ['medkit','repair-kit','jammer']){
        const item=UTILITY_GEAR[kind],count=gear[item.field]??0,availability=state.utilityAvailability?.[kind];
        const row=make('section',undefined,body);row.className='city-row';
        make('h3',`${item.name} · ${count}/${item.capacity}`,row,`city-${kind}-count`);
        make('p',kind==='medkit'?`+${item.amount} health · on foot`:kind==='repair-kit'?`+${item.amount} car condition · beside your stopped car outdoors`:'Jams nearby working cameras temporarily.',row);
        const use=button(row,'Use',()=>act('use-utility',kind),`city-use-${kind}`);
        use.setAttribute('aria-label',`Use ${item.name.toLowerCase()}`);
        use.disabled=count<1||availability?.ok!==true;
        use.setAttribute('aria-describedby',`city-${kind}-availability`);
        const reason=make('p',use.disabled?(availability?.message||(count<1?'Buy at an equipment dealer.':'Unavailable right now.')):'',row,`city-${kind}-availability`);
        reason.hidden=!use.disabled;
      }
      const scanner=make('section',undefined,body);scanner.className='city-row';
      make('h3','Police scanner',scanner);
      const pulse=button(scanner,'Camera pulse',()=>act('camera-pulse'),'city-camera-pulse');
      pulse.disabled=gear.scanner!==true;pulse.setAttribute('aria-describedby','city-camera-pulse-help');
      const detail=gear.scanner===true?`Marks cameras within ${CAMERA_PULSE.radius} m for ${CAMERA_PULSE.seconds}s.`:'Buy a police scanner at an equipment dealer.';
      make('p',detail,scanner,'city-camera-pulse-help');
      return;
    }
    if(tab==='deliveries'){
      title.textContent='Deliveries';
      const courier=state.delivery;
      if(courier&&['approaching','waiting'].includes(courier.phase)){
        make('h3',courier.order.sourceName,body);
        make('p',courier.order.method==='illegal'?`Illegal · ${DELIVERY_METHODS.illegal.speedMultiplier}× road speed`:'Legal · normal road speed',body,'city-delivery-method-state');
        make('p',courier.phase==='waiting'?'At the stop: walk beside the van and press E.':'En route to your original handover stop.',body);
        button(body,'Track courier',()=>act('track-delivery'),'city-delivery-track');
        button(body,'Route to handover',()=>onRoute({...courier.dropoff,name:'Courier handover',courierOrderId:courier.order.id}),'city-delivery-route');
        button(body,'Cancel and refund',()=>act('cancel-delivery'),'city-delivery-cancel');
        return;
      }
      make('p','Prices include $50 delivery. Collect outside on foot.',body);
      if(state.sandbox){make('p','Order deliveries in Street Life or Campaign.',body);return;}
      const methodLabel=make('label','Method',body);methodLabel.className='setting';
      const method=make('select',undefined,methodLabel,'city-delivery-method');
      method.setAttribute('aria-describedby','city-delivery-method-help');
      for(const [value,label] of [['legal','Legal'],['illegal','Illegal']]){
        const option=make('option',label,method);option.value=value;
      }
      method.value=deliveryMethod;
      method.addEventListener('change',()=>{deliveryMethod=method.value==='illegal'?'illegal':'legal';});
      const illegal=DELIVERY_METHODS.illegal,percent=value=>`${Math.round(value*100)}%`;
      make('p',`Legal: normal speed. Illegal: ${illegal.speedMultiplier}× speed; ${percent(illegal.arrestChance)} arrest and seizure (no refund), ${percent(illegal.reportChance)} delivery with one wanted star.`,body,'city-delivery-method-help');
      for(const source of state.deliveryOffers||[]){
        const row=make('section',undefined,body);row.className='city-row';
        make('h3',source.name,row);
        for(const item of source.items){
          const label=item.ok?`${item.name} · $${item.cost.toLocaleString()}`:`${item.name} · ${item.message}`;
          const order=button(row,label,()=>act('order-delivery',{kind:source.kind,sourceId:source.id,itemId:item.itemId,method:deliveryMethod}),`city-delivery-${source.id}-${item.itemId}`);
          order.disabled=!item.ok;
        }
      }
      return;
    }
    if (tab === 'crew') {
      title.textContent = 'Crew';
      for (const offer of state.crewOffers || []) {
        const row = make('section', undefined, body); row.className = 'city-row';
        const hired = state.hiredCrew?.includes(offer.id);
        const person = state.crew?.find(p => p.id.endsWith(offer.id));
        make('h3', offer.name, row);
        if (hired && person?.health <= 0 && (state.crewRenewals?.[offer.id] || 0) > (person.renewalSerial || 0)) {
          make('p', 'Returning', row);
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
      if(state.droneStrikeOwned){
        make('p','R: strike directly below the drone over clear outdoor ground.',body);
      }else if(state.droneOwned&&!state.sandbox){
        const upgrade=button(body,'Drone strike upgrade · $100,000',()=>act('buy-drone-strike'),'city-drone-strike-buy');
        upgrade.disabled=state.cash<100000;
        make('p',state.cash<100000?'Not enough cash. Buy at an equipment dealer.':'Buy at an equipment dealer.',body);
      }
      if (state.drone?.active) {
        make('p', `${Math.ceil(state.drone.battery)}s battery`, body);
        if(state.droneStrikeOwned)button(body,'Strike below',()=>act('drone-strike'),'city-drone-strike');
        button(body, 'Recall drone', () => act('recall-drone'), 'city-drone-recall');
      } else if (state.droneOwned || state.sandbox) {
        make('p', 'Launch outside on foot. WASD move · Space up · Shift down. Your body stays behind.', body);
        button(body, 'Launch drone', () => act('launch-drone'), 'city-drone-launch');
      } else {
        button(body, 'Buy drone · $900', () => act('buy-drone'), 'city-drone-buy');
        button(body, 'Find equipment dealer', () => onRoute(state.droneDealer), 'city-drone-route');
      }
      return;
    }
    title.textContent = 'Safehouses & storage';
    if(!state.stash)for (const offer of state.properties || []) {
      const row = make('section', undefined, body); row.className = 'city-row';
      make('h3', offer.label || offer.name, row);
      const owned = state.ownedProperties?.includes(offer.id);
      if (owned) make('p', 'Owned', row);
      else button(row, `Buy · $${offer.price.toLocaleString()}`, () => act('buy-property', offer.id), `city-buy-${offer.id}`);
      button(row, 'Route to door', () => onRoute(offer), `city-route-${offer.id}`);
    }
    if (!state.stash) {
      make('p', 'Enter your safehouse to use its storage.', body);
      return;
    }
    const storage = make('section', undefined, body); storage.className = 'city-storage';
    make('h3', 'Stash', storage);
    const cash = amount(storage, `Cash stored: $${state.stash.cash.toLocaleString()}`, 'city-stash-cash', 100);
    const cashButtons = make('div', undefined, storage); cashButtons.className = 'button-row';
    button(cashButtons, 'Store cash', () => act('stash', { action: 'deposit', kind: 'cash', amount: Number(cash.value) }), 'city-store-cash');
    button(cashButtons, 'Take cash', () => act('stash', { action: 'withdraw', kind: 'cash', amount: Number(cash.value) }), 'city-take-cash');
    const count = amount(storage, 'Rounds to transfer', 'city-stash-ammo', 30);
    for (const weapon of state.weapons || []) {
      const row = make('section', undefined, storage); row.className = 'city-row';
      make('h3', `${weapon.name} · ${state.stash.ammo[weapon.id] || 0} stored rounds`, row);
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
