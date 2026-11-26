// Weapon wheel DOM overlay. Flat colours, no gradients, 44px slot targets.

export function createWeaponWheelView({ wheel, onSelect }) {
  const root = document.createElement('div');
  root.id = 'weapon-wheel';
  root.hidden = true;
  const plate = document.createElement('div');
  plate.className = 'wheel-plate';
  plate.setAttribute('role', 'group');
  plate.setAttribute('aria-label', 'Weapon wheel');
  root.append(plate);
  document.getElementById('game').appendChild(root);
  let buttons = [];

  const centerVector = event => {
    const rect = plate.getBoundingClientRect();
    return { x: (event.clientX - rect.left - rect.width / 2) / (rect.width / 2),
      y: (event.clientY - rect.top - rect.height / 2) / (rect.height / 2) };
  };

  const paint = index => buttons.forEach((button, slot) => {
    button.classList.toggle('active', slot === index);
  });

  const render = () => {
    const { slots, highlighted } = wheel.snapshot();
    plate.textContent = '';
    buttons = slots.map((slot, index) => {
      const angle = -Math.PI / 2 + index * 2 * Math.PI / slots.length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'wheel-slot' + (slot.available ? '' : ' empty');
      button.style.left = `${50 + Math.cos(angle) * 40}%`;
      button.style.top = `${50 + Math.sin(angle) * 40}%`;
      const ammo = slot.id === 'unarmed' ? null : slot.ammo;
      button.textContent = slot.id === 'unarmed' ? slot.name : `${slot.name} ${ammo.ammo}/${ammo.reserveAmmo}`;
      button.setAttribute('aria-label', slot.id === 'unarmed' ? 'Equip fists' :
        `Equip ${slot.name}, ${ammo.ammo} loaded, ${ammo.reserveAmmo} in reserve`);
      button.addEventListener('click', () => finish(index));
      plate.appendChild(button);
      return button;
    });
    paint(highlighted);
  };

  const finish = index => {
    if (!wheel.isOpen()) return;
    if (Number.isInteger(index)) {
      const { slots } = wheel.snapshot();
      const angle = -Math.PI / 2 + index * 2 * Math.PI / slots.length;
      wheel.move({ x: Math.cos(angle) * 2, y: Math.sin(angle) * 2 });
    }
    const id = wheel.select();
    hide();
    if (id && onSelect) onSelect(id);
  };

  root.addEventListener('pointermove', event => { if (wheel.isOpen()) paint(wheel.move(centerVector(event))); });
  root.addEventListener('click', event => {
    if (event.target !== root && event.target !== plate) return;
    wheel.close();
    hide();
  });

  function hide() { root.hidden = true; }

  return {
    show() { root.hidden = false; render(); },
    step(direction) { paint(wheel.step(direction)); },
    hide,
    isOpen: () => !root.hidden
  };
}
