/* =========================================================================
 * Merge Cats Defender — Data Layer: enemy definitions
 *
 * 8 regular walkers (reg1..8) with distinct role kits, and 7 bosses
 * (boss1..7) that are big, slow, and hit hard. Every enemy uses the
 * walk/attack animation pair generated in the frame manifest.
 * ========================================================================= */
window.PD = window.PD || {};

function reg(n, o) {
  return Object.assign({
    id: 'reg' + n, tier: 'reg',
    walkAnim: 'reg' + n + '_walk',
    attackAnim: 'reg' + n + '_attack',
    iconTex: 'reg' + n + '_walk',
    hp: 100, speed: 34, damage: 8, attackRate: 800, bounty: 12,
    armor: 0, scale: 0.65
  }, o);
}

function boss(n, o) {
  return Object.assign({
    id: 'boss' + n, tier: 'boss',
    walkAnim: 'boss' + n + '_walk',
    attackAnim: 'boss' + n + '_attack',
    iconTex: 'boss' + n + '_walk',
    hp: 1400, speed: 20, damage: 3, attackRate: 1100, bounty: 120,
    armor: 4, scale: 0.93, isBoss: true
  }, o);
}

PD.ENEMIES = {
  // Regular roster — each with a mechanical identity ---------------------
  reg1: reg(1, { name: 'Grunt',   hp: 110, speed: 34, damage: 8,  bounty: 12 }),
  reg2: reg(2, { name: 'Scout',   hp: 70,  speed: 62, damage: 6,  bounty: 10, scale: 0.59 }),
  reg3: reg(3, { name: 'Brute',   hp: 260, speed: 22, damage: 14, bounty: 22, scale: 0.78 }),
  reg4: reg(4, { name: 'Swarmer', hp: 55,  speed: 48, damage: 5,  bounty: 7,  scale: 0.53 }),
  reg5: reg(5, { name: 'Armored', hp: 180, speed: 30, damage: 10, bounty: 20, armor: 8, scale: 0.71 }),
  reg6: reg(6, { name: 'Runner',  hp: 90,  speed: 74, damage: 7,  bounty: 14, scale: 0.62 }),
  reg7: reg(7, { name: 'Bruiser', hp: 210, speed: 28, damage: 16, bounty: 24, armor: 3, scale: 0.78 }),
  reg8: reg(8, { name: 'Warcat',  hp: 320, speed: 26, damage: 18, bounty: 30, armor: 6, scale: 0.81 }),

  // Bosses — appear at milestone waves ----------------------------------
  boss1: boss(1, { name: 'Alley King',    hp: 1400, bounty: 120 }),
  boss2: boss(2, { name: 'Iron Whisker',  hp: 1900, armor: 10, speed: 17, bounty: 150 }),
  boss3: boss(3, { name: 'Shadow Prowler', hp: 1700, speed: 26, damage: 4, bounty: 150 }),
  boss4: boss(4, { name: 'Fat Cat',       hp: 2600, speed: 14, damage: 5, bounty: 190, scale: 1.05 }),
  boss5: boss(5, { name: 'Steel Tabby',   hp: 2300, armor: 12, bounty: 200 }),
  boss6: boss(6, { name: 'Warlord Mau',   hp: 2800, damage: 5, armor: 8, bounty: 230, scale: 1.02 }),
  boss7: boss(7, { name: 'The Overcat',   hp: 3600, damage: 6, armor: 12, speed: 16, bounty: 300, scale: 1.12 })
};
