import * as THREE from '../../assets/car-arcade/vendor/three.module.js';

const SHIRTS = [0x425d79, 0xa44d3c, 0xd5ba76, 0x789477, 0xddd6c3, 0x655574, 0x393d48];
const TROUSERS = [0x343d4a, 0x656452, 0x293548, 0x807566];
const SKIN = [0xe0b490, 0xad7958, 0x79513c, 0xc99673, 0x593e32];
const HAIR = [0x302923, 0x655040, 0xa38c67, 0xaaa6a0];
const dimension = (x, y, z, sx, sy, sz) => Object.freeze({ x, y, z, sx, sy, sz });

// Unit adult in metres. Renderers apply one uniform standing-height or seat-fit scale.
export const PERSON_MODEL = Object.freeze({
  headWidth: 0.27,
  seatedHeadTop: 0.175,
  shapes: Object.freeze({ torso: 'capsule', head: 'sphere', hair: 'sphere', arms: 'capsule', legs: 'capsule', shoes: 'box', hands: 'sphere' }),
  torso: dimension(0, 1.12, 0, 0.23, 0.21, 0.15),
  head: dimension(0, 1.62, 0, 0.135, 0.17, 0.13),
  hair: dimension(0, 1.72, 0.015, 0.139, 0.09, 0.13),
  arms: dimension(0.29, 1.06, 0, 0.075, 0.19, 0.075),
  legs: dimension(0.105, 0.43, 0, 0.085, 0.235, 0.085),
  shoes: dimension(0.105, 0.055, -0.045, 0.17, 0.11, 0.28),
  hands: dimension(0.3, 0.76, 0, 0.062, 0.075, 0.065)
});

export function appearanceForPerson(id) {
  const raw = String(id);
  if (raw === 'player' || raw === 'police') return Object.freeze({
    id: raw, key: `${raw}:original`, shirt: raw === 'police' ? 0x25354d : 0xb47442,
    trousers: 0x354351, skin: 0xba8662, hair: 0x342b26, shoes: 0x292a28, height: 1, bag: false
  });
  const identity = /^(ped:)?\d+$/.test(raw) ? `ped:${Number(raw.replace(/^ped:/, ''))}` : raw;
  let seed = 2166136261;
  for (let i = 0; i < identity.length; i++) seed = Math.imul(seed ^ identity.charCodeAt(i), 16777619) >>> 0;
  const hash = seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = palette => palette[Math.floor(random() * palette.length)];
  return Object.freeze({ id: identity, key: `${identity}:${hash.toString(16)}`,
    shirt: pick(SHIRTS), trousers: pick(TROUSERS), skin: pick(SKIN), hair: pick(HAIR),
    height: 0.92 + random() * 0.2, bag: random() < 0.45, shoes: 0x303030 });
}

export function createPersonGeometries() {
  return { capsule: new THREE.CapsuleGeometry(1, 1, 2, 5), sphere: new THREE.SphereGeometry(1, 6, 4), box: new THREE.BoxGeometry(1, 1, 1) };
}

// The seated origin is the supplied vehicle eye anchor; negative Z faces forward.
// Appearance height is deliberately left to renderers, so roof fitting is uniform.
export function emitPersonParts(appearance, { kind = 'standing', stride = 0 } = {}, emit) {
  const seated = kind === 'driver' || kind === 'passenger';
  const shift = seated ? -1.635 : 0;
  const body = (name, tint) => {
    const d = PERSON_MODEL[name];
    emit(name, d.x, d.y + shift, d.z, d.sx, d.sy, d.sz, tint);
  };
  body('torso', appearance.shirt); body('head', appearance.skin); body('hair', appearance.hair);
  for (const side of [-1, 1]) {
    const arms = PERSON_MODEL.arms, legs = PERSON_MODEL.legs, shoes = PERSON_MODEL.shoes, hands = PERSON_MODEL.hands;
    const swing = Math.sin(stride * side);
    emit('arms', side * arms.x, arms.y + shift, seated ? -0.13 : -swing * 0.12,
      arms.sx, arms.sy, arms.sz, appearance.shirt, seated ? (kind === 'driver' ? -1.1 : -0.45) : -stride * side);
    emit('legs', side * legs.x, seated ? -0.92 : legs.y, seated ? -0.17 : swing * 0.13,
      legs.sx, legs.sy, legs.sz, appearance.trousers, seated ? -1.4 : stride * side);
    emit('shoes', side * shoes.x, seated ? -1.1 : shoes.y, seated ? -0.39 : swing * 0.22 + shoes.z,
      shoes.sx, shoes.sy, shoes.sz, appearance.shoes ?? 0x303030);
    emit('hands', side * hands.x, seated ? (kind === 'driver' ? -0.55 : -0.77) : hands.y, seated ? -0.32 : -swing * 0.22,
      hands.sx, hands.sy, hands.sz, appearance.skin);
  }
}
