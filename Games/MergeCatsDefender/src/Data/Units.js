/* =========================================================================
 * Merge Cats Defender — Data Layer: placeable unit definitions
 *
 * 15 ranged cats (tower/behind-wall), plus Guardian (lane shield) and Boxing
 * (frontline blocker/brawler). Each ranged cat is an individual sidegrade —
 * see artifacts/BALANCE.csv + BALANCE.md for the full derivation.
 * Balance-relevant declarative fields:
 *   damage, fireRate(ms), bullet(art 0/1/2), pierce, splash(px), armorPierce,
 *   bulletSpeed, range, cost. Tower shooters are never attacked, so shooter hp
 *   is nominal; hp only matters for melee/wall defenders.
 * Every ranged cat also declares a sprite-local `muzzle` offset (px, before
 * scale) so projectiles and shoot effects emerge from the visible gun rather
 * than the shared wall edge — see PD.Unit._muzzleOrigin.
 * ========================================================================= */
window.PD = window.PD || {};

function shooter(n, name, role, s) {
  return Object.assign({
    id: 'char' + n, kind: 'shooter', name: name, role: role, placement: 'tower',
    idleAnim: 'char' + n + '_idle', shootAnim: 'char' + n + '_shoot', iconTex: 'char' + n + '_idle',
    scale: 0.85, hp: 100, range: 1200, bulletSpeed: 640, pierce: 1, splash: 0, armorPierce: 0,
    muzzle: { x: 42, y: -6 }   // sprite-local gun-tip offset (toward enemies / right)
  }, s);
}

PD.UNITS = {
  // --- Starters (available from the first stage) ----------------------------
  // Tabby vs Sprint are deliberate starter sidegrades (see BALANCE.md):
  // Tabby is the cheaper, higher single-target-DPS pick (40.0 rawDPS @ 90c);
  // Sprint pays a higher cost (100c) and lower single-target DPS (30.0) for its
  // 2-target pierce, armor penetration, and faster projectiles (line control).
  char1:  shooter(1,  'Tabby Gunner',    'All-rounder',   { damage: 28, fireRate: 700,  bullet: 0, cost: 90 }),
  char2:  shooter(2,  'Calico Shot',     'Rapid chip',    { damage: 16, fireRate: 520,  bullet: 0, cost: 90 }),
  char6:  shooter(6,  'Sprint Kitten',   'Line piercer',  { damage: 12, fireRate: 400,  bullet: 2, pierce: 2, armorPierce: 1, bulletSpeed: 760, cost: 100 }),
  char11: shooter(11, 'Boomer Cat',      'Splash burst',  { damage: 46, fireRate: 1200, bullet: 1, splash: 80, bulletSpeed: 540, cost: 140 }),

  // --- Unlock tier 1 (clear stage 1) ---------------------------------------
  char7:  shooter(7,  'Flash Paw',       'Armor shredder',{ damage: 15, fireRate: 340,  bullet: 2, armorPierce: 5, bulletSpeed: 780, cost: 115 }),
  char12: shooter(12, 'Mortar Mane',     'Heavy splash',  { damage: 58, fireRate: 1550, bullet: 1, splash: 110, bulletSpeed: 500, cost: 170 }),

  // --- Unlock tier 2 (clear stage 2) ---------------------------------------
  char3:  shooter(3,  'Mittens Mk.II',   'Dual pierce',   { damage: 22, fireRate: 700,  bullet: 2, pierce: 2, cost: 120 }),
  char8:  shooter(8,  'Zippy',           'Swarm melter',  { damage: 9,  fireRate: 240,  bullet: 2, bulletSpeed: 800, cost: 105 }),
  char13: shooter(13, 'Heavy Tom',       'Sniper',        { damage: 95, fireRate: 1450, bullet: 0, armorPierce: 6, bulletSpeed: 720, cost: 180 }),

  // --- Unlock tier 3 (clear stage 3) ---------------------------------------
  char4:  shooter(4,  'Patch Ranger',    'Hybrid',        { damage: 27, fireRate: 820,  bullet: 1, splash: 50, cost: 135 }),
  char9:  shooter(9,  'Static Cat',      'Triple pierce', { damage: 14, fireRate: 470,  bullet: 2, pierce: 3, armorPierce: 2, cost: 140 }),
  char14: shooter(14, 'Big Bertha',      'Bombard',       { damage: 74, fireRate: 1650, bullet: 1, splash: 130, bulletSpeed: 480, cost: 185 }),

  // --- Unlock tier 4 (clear stage 4) ---------------------------------------
  char5:  shooter(5,  'Whisker Markscat','Marksman',      { damage: 42, fireRate: 900,  bullet: 0, armorPierce: 6, bulletSpeed: 700, cost: 155 }),
  char10: shooter(10, 'Needle Nine',     'Needle storm',  { damage: 12, fireRate: 300,  bullet: 2, pierce: 2, armorPierce: 3, bulletSpeed: 800, cost: 140 }),
  char15: shooter(15, 'Cannon Claws',    'Nuke',          { damage: 105, fireRate: 1750, bullet: 1, splash: 100, armorPierce: 4, bulletSpeed: 520, cost: 205 }),

  // --- Special defenders ----------------------------------------------------
  // Guardian is a non-attacking, high-HP frontline shield: it stands in front of
  // the wall and blocks the lane (placement is 'frontline', kind stays 'wall' so
  // it never attacks). Scratch Post stays a behind-wall barricade ('tower').
  guardian: {
    id: 'guardian', kind: 'wall', placement: 'frontline', name: 'Cat Guardian', short: 'Guardian', role: 'Lane shield',
    hp: 620, damage: 0, cost: 130, scale: 0.6,
    idleAnim: 'guardian_idle', shootAnim: null, iconTex: 'guardian_idle'
  },
  boxing: {
    id: 'boxing', kind: 'melee', placement: 'frontline', name: 'Cat Boxing', short: 'Boxing', role: 'Frontline brawler',
    hp: 280, damage: 42, fireRate: 560, meleeRange: 130, armorPierce: 2, cost: 125, scale: 0.6,
    idleAnim: 'boxing_idle', shootAnim: 'boxing_fight', iconTex: 'boxing_idle'
  }
};

/* Which units the player can bring into a battle dock (max 6 chosen). ------*/
PD.DEFAULT_ROSTER = ['char1', 'char6', 'char11', 'boxing', 'guardian'];

/* Units unlocked from the start; the rest unlock on stage clears. ----------*/
PD.STARTER_UNLOCKS = ['char1', 'char2', 'char6', 'char11', 'guardian', 'boxing'];

/* Unlock schedule: clearing level index N grants these unit ids. -----------*/
PD.UNLOCK_ON_CLEAR = {
  0: ['char7', 'char12'],
  1: ['char3', 'char8', 'char13'],
  2: ['char4', 'char9', 'char14'],
  3: ['char5', 'char10', 'char15']
};

/* Placement validation ------------------------------------------------------
 * Every shipped unit must declare a valid placement category ('tower' or
 * 'frontline') so battle placement never falls back to guessing from combat
 * kind. Runs at load so a missing/invalid category surfaces in the console
 * immediately rather than as a silent mis-placement mid-battle. Returns the
 * list of offending unit ids (empty when all definitions are valid). */
PD.PLACEMENTS = { tower: true, frontline: true };
PD.validatePlacements = function () {
  var bad = [];
  for (var id in PD.UNITS) {
    if (!PD.PLACEMENTS[PD.UNITS[id].placement]) {
      bad.push(id + ' (placement=' + PD.UNITS[id].placement + ')');
    }
  }
  if (bad.length) {
    console.error('[PD] Units missing a valid placement category: ' + bad.join(', '));
  }
  return bad;
};
PD.validatePlacements();

/* Roster normalization ------------------------------------------------------
 * Filters out unknown or removed unit ids (e.g. the deleted Scratch Post
 * `wall`) before squad-selection and the battle dock dereference PD.UNITS[id],
 * so a stale in-memory or persisted roster can never create a missing-definition
 * error or a broken dock card. Order and valid entries are preserved. */
PD.normalizeRoster = function (ids) {
  if (!Array.isArray(ids)) return [];
  return ids.filter(function (id) { return !!PD.UNITS[id]; });
};
