/* =========================================================================
 * Merge Cats Defender — Data Layer: level + wave tables
 *
 * Five stages (Area1..5). Each stage is an ordered list of waves; a wave is
 * a set of spawn groups. `gap` is ms between spawns within the group,
 * `delay` is ms before the group starts once the wave begins. Milestone
 * waves flag a boss for the HUD / music sting.
 * ========================================================================= */
window.PD = window.PD || {};

function W(groups, opts) { return Object.assign({ groups: groups, boss: false }, opts || {}); }
function G(e, count, gap, delay) { return { e: e, count: count, gap: gap || 900, delay: delay || 0 }; }

PD.LEVELS = [
  /* ---- Level 1 : Backyard (Area1) — teaches the loop ------------------ */
  {
    area: 'area1', name: 'Sunny Backyard', drip: 1.0,
    waves: [
      W([G('reg1', 4, 1100)]),
      W([G('reg1', 4, 900), G('reg2', 3, 900, 2500)]),
      W([G('reg2', 5, 700), G('reg1', 3, 1100, 1500)]),
      W([G('reg1', 5, 800), G('reg3', 2, 1600, 1000)]),
      W([G('reg1', 6, 700), G('reg2', 5, 800, 1000)]),
      W([G('boss1', 1, 0), G('reg1', 6, 1000, 2000)], { boss: true })
    ]
  },
  /* ---- Level 2 : Rooftops (Area2) ------------------------------------ */
  {
    area: 'area2', name: 'Moonlit Rooftops', drip: 1.05,
    waves: [
      W([G('reg2', 6, 700)]),
      W([G('reg4', 8, 500), G('reg1', 4, 900, 1500)]),
      W([G('reg3', 3, 1400), G('reg2', 5, 700, 800)]),
      W([G('boss3', 1, 0), G('reg4', 8, 600, 1500)], { boss: true }),
      W([G('reg5', 4, 900), G('reg1', 6, 700, 500)]),
      W([G('reg3', 4, 1200), G('reg4', 10, 450, 1000)]),
      W([G('boss1', 1, 0), G('reg5', 5, 900, 2000)], { boss: true })
    ]
  },
  /* ---- Level 3 : Alley (Area3) --------------------------------------- */
  {
    area: 'area3', name: 'Grimy Alley', drip: 1.1,
    waves: [
      W([G('reg5', 5, 800)]),
      W([G('reg6', 6, 600), G('reg3', 3, 1300, 1200)]),
      W([G('reg4', 12, 400), G('reg5', 4, 900, 1500)]),
      W([G('boss2', 1, 0), G('reg6', 6, 700, 1500)], { boss: true }),
      W([G('reg7', 4, 1100), G('reg6', 6, 600, 800)]),
      W([G('reg5', 6, 800), G('reg7', 4, 1200, 1000)]),
      W([G('boss5', 1, 0), G('reg7', 5, 1000, 2000)], { boss: true })
    ]
  },
  /* ---- Level 4 : Docks (Area4) --------------------------------------- */
  {
    area: 'area4', name: 'Stormy Docks', drip: 1.15,
    waves: [
      W([G('reg7', 5, 900), G('reg6', 5, 600, 800)]),
      W([G('reg8', 3, 1300), G('reg4', 12, 400, 1000)]),
      W([G('boss4', 1, 0), G('reg5', 6, 800, 1500)], { boss: true }),
      W([G('reg8', 4, 1100), G('reg7', 5, 900, 1000)]),
      W([G('reg6', 10, 450), G('reg8', 4, 1200, 1200)]),
      W([G('boss6', 1, 0), G('reg8', 4, 1100, 1500)], { boss: true }),
      W([G('reg8', 6, 900), G('reg7', 6, 800, 1000)]),
      W([G('boss2', 1, 0), G('boss5', 1, 0, 6000), G('reg8', 6, 900, 2000)], { boss: true })
    ]
  },
  /* ---- Level 5 : Cat Kingdom (Area5) — finale ------------------------ */
  {
    area: 'area5', name: 'Cat Kingdom Gate', drip: 1.2,
    waves: [
      W([G('reg8', 6, 800), G('reg7', 6, 700, 800)]),
      W([G('boss1', 1, 0), G('boss3', 1, 0, 5000), G('reg6', 10, 500, 1000)], { boss: true }),
      W([G('reg8', 8, 700), G('reg5', 8, 700, 1000)]),
      W([G('boss4', 1, 0), G('reg8', 8, 700, 1500)], { boss: true }),
      W([G('boss6', 1, 0), G('reg7', 8, 800, 1500)], { boss: true }),
      W([G('reg8', 10, 600), G('reg4', 16, 350, 1000)]),
      W([G('boss7', 1, 0), G('reg8', 10, 800, 3000)], { boss: true })
    ]
  }
];
