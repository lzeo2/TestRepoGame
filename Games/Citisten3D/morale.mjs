const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const unit = value => value === true ? 1 : Number.isFinite(value) ? clamp(value, 0, 1) : 0;

// Inputs are per-home conditions, not city-wide guesses. Simulation owns timing
// and eligibility: this multiplier must never make an unsafe home grow.
export function homeMorale({ safe = true, taxRate = 0.1, crime = 0, amenity = 0, festival = 0, pollution = 0, foodShortage = 0 } = {}) {
  const tax = Number.isFinite(taxRate) ? clamp(taxRate, 0, 0.3) : 0.1;
  const factors = [];
  let value = 0.5;
  const add = (amount, label) => {
    if (!amount) return;
    value += amount;
    factors.push(`${amount > 0 ? '+' : '-'} ${label}`);
  };
  add(safe === false ? -0.3 : 0, 'Unmet basic needs');
  add(tax < 0.1 ? (0.1 - tax) * 0.5 : -(tax - 0.1), tax < 0.1 ? 'Low taxes' : 'High taxes');
  add(-unit(crime) * 0.2, 'Crime');
  add(unit(amenity) * 0.12, 'Amenities');
  add(unit(festival) * 0.2, 'Festival');
  add(-unit(pollution) * 0.18, 'Pollution');
  add(-unit(foodShortage) * 0.2, 'Food shortage');
  value = clamp(value, 0, 1);
  const growthMultiplier = clamp(1 + (value - 0.5) * (value < 0.5 ? 0.5 : 0.3), 0.75, 1.15);
  return { value, factors, growthMultiplier };
}
