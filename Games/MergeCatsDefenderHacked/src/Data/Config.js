/* =========================================================================
 * Merge Cats Defender — Data Layer: global config + geometry constants
 * Plain-JS, no modules. Everything hangs off the global `PD` namespace.
 * ========================================================================= */
window.PD = window.PD || {};

PD.GAME = {
  WIDTH: 1280,
  HEIGHT: 720,

  // Battlefield geometry -------------------------------------------------
  // Tuned so lanes sit on the open "road" of the CraftPix area art, with the
  // defended base aligned to the fortified tower baked into the background.
  LANES: 5,
  COLS: 5,
  FIELD_TOP: 158,
  FIELD_BOTTOM: 600,
  FIRST_COL_X: 470,
  COL_STEP: 120,
  SPAWN_X: 1250,     // where enemies appear (right edge)
  BASE_X: 384,       // the fortified base the enemies march toward

  // Economy --------------------------------------------------------------
  // Tuned for the five-lane / fifteen-position battlefield: a slightly larger
  // opening and faster drip fund one extra lane without trivialising cost.
  // HACKED variant: unlimited-coin economy. BattleScene seeds battle coins
  // from START_COINS and tops up DRIP_AMOUNT on its own looping timer, and
  // every deploy deducts def.cost (now 0 for all units), so no drain is
  // possible and no custom timer/loop is needed here.
  START_COINS: 999999,
  DRIP_AMOUNT: 9999,
  DRIP_INTERVAL: 4200,   // ms between passive coin drips
  BASE_HP: 5,

  // Assets root ----------------------------------------------------------
  ASSETS: 'src/ASSETS/'
};

/* =========================================================================
 * Soundtrack manifest — semantic keys, not filenames. Scenes request a key;
 * PD.Audio owns the single looping player. `files` maps each key to its
 * runtime asset (queued by PD.Assets). Assignments:
 *   menu  -> marimba (menu.mp3)  : Landing / LevelMap / SquadSelect flow
 *   level -> cat-portal (level.mp3) : all normal campaign battle waves
 *   boss  -> fierce-fight (boss.mp3) : swapped in while a boss wave is active
 * See artifacts/AUDIO.md for the inventory + rationale.
 * ========================================================================= */
PD.MUSIC = {
  menu: 'music_menu',
  level: 'music_level',
  boss: 'music_boss',
  files: {
    music_menu:  'music/menu.mp3',
    music_level: 'music/level.mp3',
    music_boss:  'music/boss.mp3'
  },
  forLevel: function () { return this.level; }   // one shared normal-battle track
};

/* =========================================================================
 * Battlefield layout profiles — source-art (native image) coordinates.
 *
 * Five combat lanes. Fifteen TOWER positions (3 columns x 5 rows) sit behind the
 * fortified wall and hold shooter/wall-kind defenders. Five FRONTLINE
 * positions (one per lane) sit just in front of the wall and hold melee
 * defenders that visibly block the road. Anchors are stored in the area PNG's
 * native pixel space and converted at scene-create time with the SAME
 * cover-scale/crop transform that draws the background (see PD.buildLayout),
 * so everything stays registered on all five backgrounds.
 *
 * All five area PNGs share the same illustrated 2-column box grid, cardboard
 * wall and gauge, so the DEFAULT anchors below are calibrated once against the
 * painted boxes and reused by every area (no per-area overrides needed). No
 * slot-backing is drawn over the art any more — the anchors seat deployed cats
 * directly on the illustrated boxes.
 * ========================================================================= */
PD.BATTLE = {
  LANES: 5,
  BASE_HP: 5,

  // Default source-art geometry, measured against the placement grid painted
  // into the area PNGs (2143x1062, shared by all five areas). The tower grid is
  // THREE columns x FIVE rows = 15 positions: two translucent square columns
  // plus the brown cardboard-box stack. Column X centres: grey col 268, grey
  // col 408, cardboard-box stack 590 (left of the embedded gauge). Row centres
  // read from a contrast-stretched trace of the overlay. The painted trash bin
  // sits on the bottom-left grey box (col 0, row 4), doubling as its anchor.
  DEFAULT: {
    laneY: [300, 415, 530, 645, 760],   // five lane row centres (source px)
    towerColX: [268, 408, 610],         // three tower column centres (source px)
    // Per-column vertical offset (source px, negative = up) added to laneY. The
    // two grey slot columns share the lane rows; the cardboard-box column (col 2)
    // is a separate stack that sits higher and further right, so it is pushed out
    // and raised rather than forced into the shared grid.
    towerColDy: [0, 0, -45],
    frontlineX: 812,                    // frontline melee X, in front of wall
    slotW: 108, slotH: 108,             // tower hit-rect (source px)
    frontW: 132, frontH: 128,           // frontline hit-rect (source px)
    // Deployed cats RENDER this many source-px above their box anchor so they sit
    // ON the box rather than centered on it (the box/hit-region stays put). The
    // ghost preview and muzzle use the same shift, so preview == placement and
    // taps still land on the box.
    seatDy: 30,
    wallX: 722,                         // wall face: enemies stop here if unblocked
    combatX: 726,                       // shooter target/range origin (wall edge)
    spawnX: 2060,                       // enemies appear just past the right crop
    gauge: { x: 660, y: 258, w: 38, h: 428 },  // gauge interior (source px)
    trash: { x: 268, y: 760, w: 118, h: 118 }  // painted map trash-bin drop zone (source px)
  },

  // Per-area overrides merged over DEFAULT. All five backgrounds share an
  // identical box grid / wall / gauge / trash-bin layout, so every area is empty
  // here; add an override only if a future area repaints those at different
  // anchors.
  AREAS: { area1: {}, area2: {}, area3: {}, area4: {}, area5: {} }
};

/**
 * Build a scene-space battlefield layout for the given cover-fitted
 * background image. Returns typed tower/frontline positions plus lane, wall,
 * combat, frontline and gauge world geometry.
 */
PD.buildLayout = function (bg, areaKey) {
  var d = Object.assign({}, PD.BATTLE.DEFAULT, PD.BATTLE.AREAS[areaKey] || {});
  var ox = bg.width * bg.originX, oy = bg.height * bg.originY;
  function wx(sx) { return bg.x + (sx - ox) * bg.scaleX; }
  function wy(sy) { return bg.y + (sy - oy) * bg.scaleY; }
  var sc = bg.scaleX;

  function rect(cx, cy, w, h) {
    return new Phaser.Geom.Rectangle(cx - w * sc / 2, cy - h * sc / 2, w * sc, h * sc);
  }

  var laneY = d.laneY.map(wy);
  var colDy = d.towerColDy || [];
  var towers = [], frontline = [];
  for (var lane = 0; lane < PD.BATTLE.LANES; lane++) {
    for (var col = 0; col < d.towerColX.length; col++) {
      var cx = wx(d.towerColX[col]);
      // Column may be raised/lowered off the shared lane row (source px).
      var cy = wy(d.laneY[lane] + (colDy[col] || 0));
      towers.push({
        id: 't' + lane + '_' + col, type: 'tower', lane: lane, col: col,
        x: cx, y: cy, occupant: null, rect: rect(cx, cy, d.slotW, d.slotH)
      });
    }
    var fx = wx(d.frontlineX);
    frontline.push({
      id: 'f' + lane, type: 'frontline', lane: lane,
      x: fx, y: laneY[lane], occupant: null, rect: rect(fx, laneY[lane], d.frontW, d.frontH)
    });
  }

  return {
    lanes: PD.BATTLE.LANES,
    laneY: laneY,
    towers: towers,
    frontline: frontline,
    positions: towers.concat(frontline),
    wallX: wx(d.wallX),
    combatX: wx(d.combatX),
    frontlineX: wx(d.frontlineX),
    spawnX: wx(d.spawnX),
    gauge: { x: wx(d.gauge.x), y: wy(d.gauge.y), w: d.gauge.w * sc, h: d.gauge.h * sc },
    // Discard drop zone registered to the trash bin painted into the area art.
    trash: { x: wx(d.trash.x), y: wy(d.trash.y), w: d.trash.w * sc, h: d.trash.h * sc },
    // Render-only upward seat shift (screen px) so deployed cats sit on their box.
    seatDy: d.seatDy * sc,
    scale: sc
  };
};

// Derived helpers (legacy 5-lane road model; retained for reference) -------
PD.laneY = function (lane) {
  var g = PD.GAME;
  var h = (g.FIELD_BOTTOM - g.FIELD_TOP) / g.LANES;
  return Math.round(g.FIELD_TOP + h * (lane + 0.5));
};
PD.colX = function (col) {
  var g = PD.GAME;
  return g.FIRST_COL_X + g.COL_STEP * col;
};
PD.laneFromY = function (y) {
  var g = PD.GAME;
  var h = (g.FIELD_BOTTOM - g.FIELD_TOP) / g.LANES;
  var lane = Math.floor((y - g.FIELD_TOP) / h);
  return Phaser.Math.Clamp(lane, 0, g.LANES - 1);
};
PD.colFromX = function (x) {
  var g = PD.GAME;
  var col = Math.round((x - g.FIRST_COL_X) / g.COL_STEP);
  return Phaser.Math.Clamp(col, 0, g.COLS - 1);
};
