// Weapon wheel state machine. No DOM, no timers: the view and script.js drive it.
export const WEAPON_WHEEL_KEY = 'BracketLeft';
export const WHEEL_DEADZONE = .35;
export const UNARMED = Object.freeze({ id: 'unarmed', name: 'Fists' });
export const WHEEL_SLOT_CAP = 8;

export function createWeaponWheel({ weapons, ownedFor, ammoFor, currentFor }) {
  const ownedIds = () => (ownedFor ? ownedFor() : weapons.map(weapon => weapon.id));
  let open = false, highlighted = 0, slots = [];

  function refreshSlots() {
    const owned = ownedIds().slice(0, WHEEL_SLOT_CAP - 1);
    slots = [UNARMED, ...owned.map(id => weapons.find(weapon => weapon.id === id)).filter(Boolean)];
    highlighted = Math.max(0, slots.findIndex(slot => slot.id === (currentFor?.() ?? 'unarmed')));
  }

  return {
    open() { refreshSlots(); open = true; return true; },
    close() { open = false; return false; },
    isOpen: () => open,
    // Radial nearest-slot pick. x/y are unit-ish vector coords from the wheel
    // centre, y growing downward like screen space. Slots start at the top.
    move({ x, y } = {}) {
      if (!open || slots.length < 2 || !Number.isFinite(x) || !Number.isFinite(y)) return highlighted;
      const radius = Math.hypot(x, y);
      if (radius <= WHEEL_DEADZONE) return highlighted;
      const step = 2 * Math.PI / slots.length;
      const angle = Math.atan2(y, x) + Math.PI / 2; // slot 0 sits at the top
      highlighted = ((Math.round(angle / step) % slots.length) + slots.length) % slots.length;
      return highlighted;
    },
    step(direction) {
      if (open && (direction === 1 || direction === -1)) highlighted = (highlighted + direction + slots.length) % slots.length;
      return highlighted;
    },
    select() {
      if (!open) return null;
      const chosen = slots[highlighted] || null;
      open = false;
      return chosen ? chosen.id : null;
    },
    snapshot() {
      if (!open) refreshSlots();
      return {
        open, highlighted,
        slots: slots.map(slot => {
          const ammo = slot.id === 'unarmed' ? null : (ammoFor ? ammoFor(slot.id) : null);
          return { id: slot.id, name: slot.name, ammo, available: slot.id === 'unarmed' || !ammo || ammo.ammo + ammo.reserveAmmo > 0 };
        })
      };
    }
  };
}
