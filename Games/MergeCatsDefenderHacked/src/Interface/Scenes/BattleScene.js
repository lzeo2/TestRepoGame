/* =========================================================================
 * Merge Cats Defender — Scene: Battle (the core lane-defense loop)
 * ========================================================================= */
window.PD = window.PD || {};

PD.BattleScene = class extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.levelIndex = (data && data.level) || 0;
    // Filter unknown/removed unit ids (e.g. legacy Scratch Post) so the dock
    // never dereferences a missing definition.
    this.roster = PD.normalizeRoster((data && data.roster) || PD.Save.load().roster);
    this.level = PD.LEVELS[this.levelIndex];
  }

  create() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT, G = PD.GAME;

    PD.Audio.playMusic(PD.MUSIC.forLevel(this.levelIndex));   // level battle track

    // State ---------------------------------------------------------------
    this.units = [];
    this.enemies = [];
    this.projPool = [];
    this.fxPool = [];

    this.coins = G.START_COINS;
    this.baseHP = PD.BATTLE.BASE_HP;
    this.selectedUnitId = null;
    this.paused = false;
    this.ended = false;
    this.waveIndex = -1;
    this.wavePending = 0;
    this.waveFullySpawned = false;
    this.levelDone = false;
    this.enemiesKilled = 0;

    // Background + source-art battlefield layout --------------------------
    var areaKey = 'area' + (this.levelIndex + 1 <= 5 ? this.levelIndex + 1 : 1);
    if (!this.textures.exists(areaKey)) areaKey = 'area1';
    var bg = this.add.image(W / 2, H / 2, areaKey);
    PD.UIKit.cover(bg, W, H);
    this.layout = PD.buildLayout(bg, areaKey);

    // Typed positions: 15 tower (behind wall) + 5 frontline (in front of wall).
    // The rects stay as invisible hit regions for placement zones, ghost
    // snapping and rejection flashes — no permanent slot backing is drawn, so
    // the illustrated battlefield boxes remain unobstructed.
    this.towers = this.layout.towers;
    this.frontline = this.layout.frontline;
    this.positions = this.layout.positions;

    // Layers for HP bars + ghost -----------------------------------------
    this.hpGfx = this.add.graphics().setDepth(60);
    this.ghost = this.add.sprite(-100, -100, 'char1_idle', 0).setAlpha(0.55).setDepth(55).setVisible(false);
    this.drag = null;   // active drag-to-trash record

    // The wall boundary is painted into the art, so no road-wide lane guides
    // or dashed danger marker are drawn over them.
    this._buildGauge();
    this._buildHUD();
    this._buildTrash();
    this._buildDock();
    this._buildPlacement();

    // Timers --------------------------------------------------------------
    var self = this;
    this.dripEvent = this.time.addEvent({
      delay: Math.round(G.DRIP_INTERVAL / (this.level.drip || 1)),
      loop: true,
      callback: function () { if (!self.paused && !self.ended) self.addCoins(G.DRIP_AMOUNT, true); }
    });

    this.time.delayedCall(900, function () { self._startNextWave(); });

    this.input.keyboard.on('keydown-ESC', function () { self._togglePause(); });

    // Narrow/portrait viewport guard: too-tall viewports can't preserve usable
    // lane interactions, so we pause + preserve state and show a rotate prompt.
    this._guarded = false;
    PD.Display.bindLayout(this, function () { self._checkOrientation(); });
  }

  /* ---- Orientation guard --------------------------------------------- */
  // When the battle viewport becomes too narrow (portrait), pause simulation
  // without destroying state and show a full-viewport rotate prompt that still
  // exposes settings and exit. Landscape return resumes unless the player had
  // explicitly paused or the battle already ended.
  _checkOrientation() {
    if (this.ended) return;
    var portrait = PD.Display.isPortrait();
    if (portrait && !this._guarded) this._engageGuard();
    else if (!portrait && this._guarded) this._releaseGuard();
    else if (portrait && this._guarded) this._layoutGuard();   // reposition on resize
  }

  _engageGuard() {
    this._guarded = true;
    // Remember whether the sim was running so we only auto-resume what we paused.
    this._guardResumes = !this.paused;
    this.time.paused = true;
    this.anims.pauseAll();
    this._buildGuardLayer();
  }

  _releaseGuard() {
    this._guarded = false;
    if (this.guardLayer) { this.guardLayer.destroy(); this.guardLayer = null; }
    // Only resume if the player did not explicitly pause and settings aren't open.
    if (this._guardResumes && !this.paused && !this._settingsOpen && !this.ended) {
      this.time.paused = false;
      this.anims.resumeAll();
    }
  }

  _buildGuardLayer() {
    var self = this;
    this.guardLayer = this.add.container(0, 0).setDepth(160);
    // Oversized opaque cover so no battlefield shows through at any crop.
    var cover = this.add.rectangle(PD.GAME.WIDTH / 2, PD.GAME.HEIGHT / 2,
      PD.GAME.WIDTH * 3, PD.GAME.HEIGHT * 3, 0x0e1a26, 1).setInteractive();
    this.guardLayer.add(cover);
    this.guardTitle = PD.UIKit.label(this, 0, 0, '↻  Rotate your device', 36, '#ffd479');
    this.guardMsg = PD.UIKit.label(this, 0, 0, 'This battle needs landscape.\nYour progress is paused and safe.', 22, '#eaf3fb');
    this.guardSettings = PD.UIKit.pillButton(this, 0, 0, 220, 58, 'Settings', function () { self._openBattleSettings(); }, 0x3d7fb5);
    this.guardQuit = PD.UIKit.pillButton(this, 0, 0, 220, 58, 'Quit to Map', function () {
      self.time.paused = false; self.anims.resumeAll(); self.scene.start('LevelMap');
    }, 0xc0603c);
    this.guardLayer.add([this.guardTitle, this.guardMsg, this.guardSettings, this.guardQuit]);
    this._layoutGuard();
  }

  _layoutGuard() {
    if (!this.guardLayer) return;
    var r = PD.Display.safeRect();
    var cx = r.x + r.w / 2, cy = r.y + r.h / 2;
    this.guardTitle.setPosition(cx, cy - 96);
    this.guardMsg.setPosition(cx, cy - 24);
    this.guardSettings.setPosition(cx, cy + 60);
    this.guardQuit.setPosition(cx, cy + 130);
  }

  /* ---- Drag-to-trash disposal (registered to the painted map bin) ----- */
  // No floating panel: the trash bin painted into the area art is the discard
  // affordance. Its transformed bounds (PD.buildLayout → layout.trash) are the
  // drop zone, with a restrained highlight shown only while a dragged unit
  // overlaps them — the idle bin art is left untouched.
  _buildTrash() {
    var t = this.layout.trash;
    this.trashRect = new Phaser.Geom.Rectangle(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
    this.trashActive = false;
    this.trashBg = this.add.graphics().setDepth(74);
    this._drawTrash(false);
  }

  _drawTrash(active) {
    var r = this.trashRect, g = this.trashBg;
    g.clear();
    if (!active) return;   // idle: leave the painted bin unobstructed
    g.fillStyle(0xc0392b, 0.30).fillRoundedRect(r.x, r.y, r.width, r.height, 12);
    g.lineStyle(3, 0xffe08a, 0.95).strokeRoundedRect(r.x, r.y, r.width, r.height, 12);
  }

  /* ---- Embedded wall health gauge ------------------------------------ */
  // Covers the baked green interior with a neutral track, then draws a
  // bottom-anchored fill for baseHP / BASE_HP inside the painted frame.
  _buildGauge() {
    this.gaugeGfx = this.add.graphics().setDepth(6);
    this._updateGauge();
  }

  _updateGauge() {
    var gg = this.layout.gauge, g = this.gaugeGfx;
    var frac = Phaser.Math.Clamp(this.baseHP / PD.BATTLE.BASE_HP, 0, 1);
    g.clear();
    // Neutral track fully covering the baked-in static green fill.
    g.fillStyle(0x1b2530, 1).fillRoundedRect(gg.x, gg.y, gg.w, gg.h, gg.w * 0.45);
    // Dynamic fill, anchored to the bottom, depleting downward.
    if (frac > 0) {
      var fh = gg.h * frac;
      var col = frac > 0.5 ? 0x8ee23a : (frac > 0.25 ? 0xe0b040 : 0xe0512a);
      g.fillStyle(col, 1).fillRoundedRect(gg.x, gg.y + gg.h - fh, gg.w, fh, gg.w * 0.45);
    }
  }

  /* ---- HUD ----------------------------------------------------------- */
  _buildHUD() {
    var self = this;

    this.coinBadge = PD.UIKit.currencyBadge(this, 96, 38, 'ui_coinbar', 'ui_coin', this.coins, 52).setDepth(71);

    // Base health is shown by the embedded wall gauge (see _buildGauge), so no
    // top-center horizontal base-health bar is drawn here.

    // Wave progress
    this.waveBarBg = this.add.image(0, 40, 'ui_wavebar').setOrigin(0, 0.5).setDepth(70);
    if (this.waveBarBg.height > 52) this.waveBarBg.setScale(52 / this.waveBarBg.height);
    this.waveFill = this.add.graphics().setDepth(69);
    this.waveText = PD.UIKit.label(this, 0, 40, 'Wave 0/' + this.level.waves.length, 18, '#ffffff').setDepth(72);

    // Pause button
    this.pauseBtn = PD.UIKit.pillButton(this, 0, 92, 96, 46, 'II', function () { self._togglePause(); }, 0x3d7fb5).setDepth(72);

    // Anchor the edge HUD (coins top-left, wave + pause top-right) to the safe
    // rectangle so Fill-mode cropping and device cutouts never hide them, and
    // re-anchor on every viewport/display change.
    PD.Display.bindLayout(this, function () { self._layoutHUD(); });
  }

  // Position edge-anchored HUD against the current safe rectangle. Gameplay-space
  // elements (gauge, dock, placement) stay registered to the battlefield art and
  // are handled separately by _relayoutField.
  _layoutHUD() {
    var r = PD.Display.safeRect();
    this.coinBadge.setPosition(r.x + 96, r.y + 38);
    this.pauseBtn.setPosition(r.x + r.w - 52, r.y + 92);
    var wbX = r.x + r.w - 250;
    this.waveBarBg.setPosition(wbX, r.y + 40);
    this.waveText.setPosition(wbX + this.waveBarBg.displayWidth / 2, r.y + 40);
    this._updateWaveBar();
  }

  _updateWaveBar() {
    var shown = Math.max(0, this.waveIndex + 1);
    var frac = Phaser.Math.Clamp(shown / this.level.waves.length, 0, 1);
    this.waveText.setText('Wave ' + shown + '/' + this.level.waves.length);
    var x = this.waveBarBg.x + 6, y = this.waveBarBg.y - this.waveBarBg.displayHeight * 0.32;
    var w = (this.waveBarBg.displayWidth - 12) * frac, h = this.waveBarBg.displayHeight * 0.5;
    this.waveFill.clear();
    if (w > 2) this.waveFill.fillStyle(0x6ab04c, 0.9).fillRoundedRect(x, y, w, h, 6);
  }

  /* ---- Unit dock ----------------------------------------------------- */
  _buildDock() {
    var G = PD.GAME, W = G.WIDTH, y = G.HEIGHT - 52;
    this.add.rectangle(W / 2, y, W, 104, 0x101c28, 0.82).setDepth(65);

    this.dockCards = {};
    var n = this.roster.length;
    var cw = 118, gap = 10, totalW = n * cw + (n - 1) * gap;
    var startX = (W - totalW) / 2 + cw / 2;
    var self = this;

    for (var i = 0; i < n; i++) {
      var id = this.roster[i];
      var def = PD.UNITS[id];
      var x = startX + i * (cw + gap);
      var cont = this.add.container(x, y).setDepth(66);

      var box = this.add.graphics();
      box.fillStyle(0x2c4459, 1).fillRoundedRect(-cw / 2, -46, cw, 92, 10);
      box.lineStyle(2, 0x0c1620, 1).strokeRoundedRect(-cw / 2, -46, cw, 92, 10);
      cont.add(box);

      var icon = this.add.sprite(-cw / 2 + 34, -6, def.iconTex, 0).setScale(def.scale * 0.62);
      if (def.tint) icon.setTint(def.tint);
      cont.add(icon);

      cont.add(PD.UIKit.label(this, 18, -26, def.short || def.name.split(' ')[0], 13, '#ffffff'));
      var cost = PD.UIKit.label(this, 18, 24, def.cost + 'c', 18, '#ffe08a');
      cont.add(cost);

      var sel = this.add.graphics();
      sel.lineStyle(3, 0xffe08a, 1).strokeRoundedRect(-cw / 2, -46, cw, 92, 10);
      sel.setVisible(false);
      cont.add(sel);

      cont.setSize(cw, 92);
      cont.setInteractive(new Phaser.Geom.Rectangle(0, 0, cw, 92), Phaser.Geom.Rectangle.Contains);
      (function (uid) {
        cont.on('pointerup', function () { self._selectUnit(uid); });
      })(id);

      this.dockCards[id] = { cont: cont, sel: sel, cost: cost, box: box, def: def };
    }
  }

  _selectUnit(id) {
    var def = PD.UNITS[id];
    if (def.cost > this.coins) { PD.Audio.error(); this._toast('Not enough coins'); return; }
    if (this.selectedUnitId === id) { this._clearSelection(); return; }
    this.selectedUnitId = id;
    for (var k in this.dockCards) this.dockCards[k].sel.setVisible(k === id);
    this.ghost.setTexture(def.iconTex, 0).setScale(def.scale).setVisible(true);
    if (def.tint) this.ghost.setTint(def.tint); else this.ghost.clearTint();
    PD.Audio.click();
  }

  _clearSelection() {
    this.selectedUnitId = null;
    this.ghost.setVisible(false);
    for (var k in this.dockCards) this.dockCards[k].sel.setVisible(false);
  }

  /* ---- Placement (typed, position-only) ------------------------------ */
  // A unit may only occupy a position whose type matches its declared placement
  // category (data-driven, independent of combat kind): tower-placement units on
  // the ten behind-wall boxes, frontline-placement units (Guardian + melee) on
  // the five in-front-of-wall boxes. The ghost snaps only to a hovered position.
  _buildPlacement() {
    var self = this;
    this.positions.forEach(function (pos) {
      var r = pos.rect;
      var zone = self.add.zone(r.x + r.width / 2, r.y + r.height / 2, r.width, r.height).setInteractive();
      zone.on('pointermove', function () {
        if (self.drag || !self.selectedUnitId) return;
        var def = PD.UNITS[self.selectedUnitId];
        var ok = self._typeMatches(def, pos) && pos.occupant === null;
        self.ghost.setPosition(pos.x, pos.y - (self.layout.seatDy || 0)).setVisible(true);
        self.ghost.setTint(ok ? (def.tint || 0x88ff88) : 0xff6666);
      });
      zone.on('pointerdown', function () {
        if (self.paused || self.ended || self.drag || !self.selectedUnitId) return;
        self._tryPlace(pos);
      });
    });

    // Global drag handlers for disposal (see _makeDraggable).
    this.input.on('pointermove', function (p) { self._dragMove(p); });
    this.input.on('pointerup', function (p) { self._dragEnd(p); });
    this.input.on('pointerupoutside', function () { self._dragCancel(); });
    this.input.on('gameout', function () { self._dragCancel(); });
  }

  _typeMatches(def, pos) {
    // Placement category is authoritative; fall back to a kind-derived category
    // only for legacy definitions that predate the explicit `placement` field.
    var placement = def.placement || (def.kind === 'melee' ? 'frontline' : 'tower');
    return pos.type === placement;
  }

  _tryPlace(pos) {
    var id = this.selectedUnitId;
    if (!id) return;
    var def = PD.UNITS[id];
    if (!this._typeMatches(def, pos)) {
      PD.Audio.error();
      this._toast(pos.type === 'frontline' ? 'Frontline: Guardian / melee only' : 'Towers take ranged / wall units');
      this._flashPos(pos); return;
    }
    if (pos.occupant !== null) { PD.Audio.error(); this._toast('Position occupied'); this._flashPos(pos); return; }
    if (def.cost > this.coins) { PD.Audio.error(); this._toast('Not enough coins'); return; }

    var unit = new PD.Unit(this, def, pos, this.layout);
    pos.occupant = unit;
    this.units.push(unit);
    this._makeDraggable(unit);
    this.addCoins(-def.cost);
    PD.Audio.place();
    PD.Audio.vibrate(15);

    this.tweens.add({ targets: unit, scale: { from: def.scale * 1.3, to: def.scale }, duration: 180, ease: 'Back.out' });

    if (def.cost > this.coins) this._clearSelection();
  }

  _flashPos(pos) {
    var r = pos.rect;
    var rect = this.add.rectangle(pos.x, pos.y, r.width, r.height, 0xff3333, 0.4).setDepth(58);
    this.tweens.add({ targets: rect, alpha: 0, duration: 300, onComplete: function () { rect.destroy(); } });
  }

  /* ---- Drag-to-trash disposal --------------------------------------- */
  _makeDraggable(unit) {
    var self = this;
    unit.setInteractive({ useHandCursor: true });
    unit.on('pointerdown', function (p) {
      if (self.paused || self.ended || self.drag) return;
      self._pending = { unit: unit, sx: p.x, sy: p.y };   // becomes a drag past threshold
    });
  }

  _dragMove(p) {
    if (!this.drag && this._pending) {
      var d = this._pending;
      if (d.unit._alive && Phaser.Math.Distance.Between(d.sx, d.sy, p.x, p.y) > 10) {
        this.drag = { unit: d.unit, ox: d.unit.x - p.x, oy: d.unit.y - p.y };
        d.unit.setDepth(90).setAlpha(0.85);
        this._clearSelection();          // dragging must not commit placement
        this._pending = null;
      }
    }
    if (this.drag) {
      var u = this.drag.unit;
      u.x = p.x + this.drag.ox; u.y = p.y + this.drag.oy;
      var over = Phaser.Geom.Rectangle.Contains(this.trashRect, p.x, p.y);
      if (over !== this.trashActive) { this.trashActive = over; this._drawTrash(over); }
    }
  }

  _dragEnd(p) {
    this._pending = null;
    if (!this.drag) return;
    var unit = this.drag.unit;
    var over = Phaser.Geom.Rectangle.Contains(this.trashRect, p.x, p.y);
    this.drag = null;
    this.trashActive = false; this._drawTrash(false);
    if (over) this._disposeUnit(unit); else this._restoreUnit(unit);
  }

  _dragCancel() {
    if (!this.drag) { this._pending = null; return; }
    var unit = this.drag.unit;
    this.drag = null;
    this.trashActive = false; this._drawTrash(false);
    this._restoreUnit(unit);
  }

  _restoreUnit(unit) {
    if (!unit._alive) return;
    unit.x = unit.pos.x; unit.y = unit.pos.y - (unit._seatDy || 0);
    unit.setAlpha(1).setDepth(30 + unit.lane);
  }

  // Idempotent: safe if called alongside a death or a duplicate callback.
  _disposeUnit(unit) {
    if (!unit._alive) return;
    unit._alive = false;
    this._removeUnit(unit);
    this.spawnExplosion(unit.x, unit.y, 0.22);
    PD.Audio.click();
    unit.clearTint();
    unit.destroy();
  }

  /* ---- Economy / base ------------------------------------------------ */
  addCoins(n, drip) {
    this.coins = Math.max(0, this.coins + n);
    this.coinBadge.setValue(this.coins);
    if (n > 0 && !drip) PD.Audio.coin();
    if (n > 0) {
      this.tweens.add({ targets: this.coinBadge._txt, scale: { from: 1.25, to: 1 }, duration: 160 });
    }
  }

  damageBase(n) {
    if (this.ended) return;
    this.baseHP = Math.max(0, this.baseHP - n);
    this._updateGauge();
    this.cameras.main.shake(160, 0.008);
    PD.Audio.vibrate(40);
    if (this.baseHP <= 0) this._lose();
  }

  // A living Guardian / Scratch Post in a lane soaks wall damage before the
  // base does. Returns true if the damage was absorbed by a defensive unit.
  routeWallDamage(lane, amount) {
    for (var i = 0; i < this.units.length; i++) {
      var u = this.units[i];
      if (u._alive && u.lane === lane && u.def.kind === 'wall') { u.takeDamage(amount); return true; }
    }
    this.damageBase(amount);
    return false;
  }

  /* ---- Callbacks from entities -------------------------------------- */
  onEnemyKilled(enemy) {
    this.enemiesKilled++;
    this.addCoins(enemy.bounty);
    this._floatText(enemy.x, enemy.y - 20, '+' + enemy.bounty, '#ffe08a');
    var i = this.enemies.indexOf(enemy);
    if (i !== -1) this.enemies.splice(i, 1);
  }

  onUnitDied(unit) { this._removeUnit(unit); }

  // Release position occupancy and drop the unit from the active list. Safe to
  // call more than once (idempotent) — disposal and death may both run.
  _removeUnit(unit) {
    if (unit.pos && unit.pos.occupant === unit) unit.pos.occupant = null;
    var i = this.units.indexOf(unit);
    if (i !== -1) this.units.splice(i, 1);
    if (this.drag && this.drag.unit === unit) { this.drag = null; this._drawTrash(false); }
    if (this._pending && this._pending.unit === unit) this._pending = null;
  }

  /* ---- Pools: projectiles + fx -------------------------------------- */
  spawnProjectile(x, y, lane, def) {
    var p = null;
    for (var i = 0; i < this.projPool.length; i++) if (!this.projPool[i]._alive) { p = this.projPool[i]; break; }
    if (!p) { p = new PD.Projectile(this); this.projPool.push(p); }
    p.fire(x, y, lane, def);
  }

  _getFx() {
    for (var i = 0; i < this.fxPool.length; i++) if (!this.fxPool[i].active) return this.fxPool[i];
    // Initialize with any loaded fx texture; play() replaces it before display.
    var initTex = this.textures.exists('shoot_fx') ? 'shoot_fx'
      : (this.textures.exists('explosion_fx') ? 'explosion_fx' : '__DEFAULT');
    var s = this.add.sprite(0, 0, initTex, 0).setActive(false).setVisible(false).setDepth(50);
    this.fxPool.push(s);
    return s;
  }

  // Play a pooled sprite animation with a COMPLETE reset so a reused object can
  // never inherit the previous effect's animation, frame, transform, alpha,
  // tint, flip, depth, or completion callback. Attaches exactly one cleanup.
  _playFx(anim, x, y, scale, depth) {
    var s = this._getFx();
    s.anims.stop();                       // stop any in-flight animation
    s.removeAllListeners('animationcomplete');   // drop stale completion handlers
    s.setPosition(x, y).setScale(scale).setAngle(0);
    s.setFlipX(false).setFlipY(false);
    s.clearTint();
    s.setAlpha(1).setActive(true).setVisible(true).setDepth(depth);
    s.play(anim);                         // resets to frame 0 of the target anim
    s.once('animationcomplete', function () {
      s.setActive(false).setVisible(false);
    });
    return s;
  }

  _explosionAvailable() {
    return !PD.Assets.isSkipped('explosion_fx') && this.anims.exists('explosion_fx');
  }

  spawnExplosion(x, y, scale) {
    // Explosion frames are 512px (downscaled from 1305 source); compensate so the
    // apparent world-space size matches the original art after the mobile-safe
    // multipart repack.
    var EXPLOSION_COMP = 1305 / 512;
    if (this._explosionAvailable()) {
      this._playFx('explosion_fx', x, y, scale * EXPLOSION_COMP, 50);
    } else {
      // Deterministic transparent fallback: never a black box, never blocking.
      this._proceduralBurst(x, y, scale * EXPLOSION_COMP);
    }
  }

  spawnShootFx(x, y) {
    if (PD.Assets.isSkipped('shoot_fx') || !this.anims.exists('shoot_fx')) return;
    this._playFx('shoot_fx', x, y, 0.28, 52);
  }

  // Small transparent procedural burst used when the explosion texture cannot be
  // submitted to the renderer. Drawn from primitives (no texture), so it has no
  // opaque rectangle; if even this cannot be produced the effect is omitted and
  // gameplay is unaffected.
  _proceduralBurst(x, y, scale) {
    try {
      var self = this;
      var R = 60 * scale;
      var ring = this.add.circle(x, y, Math.max(6, R * 0.4), 0xffce7a, 0.55).setDepth(50);
      ring.setStrokeStyle(Math.max(2, 3 * scale), 0xffa94d, 0.9);
      this.tweens.add({
        targets: ring, scale: { from: 0.4, to: 1.6 }, alpha: { from: 0.7, to: 0 },
        duration: 340, ease: 'Cubic.out', onComplete: function () { ring.destroy(); }
      });
      // A couple of quick spark dots for a little life; all fully transparent bg.
      for (var i = 0; i < 4; i++) {
        var a = (Math.PI * 2 * i) / 4 + Math.random();
        var d = this.add.circle(x, y, Math.max(2, 4 * scale), 0xfff0c2, 0.9).setDepth(51);
        this.tweens.add({
          targets: d, x: x + Math.cos(a) * R, y: y + Math.sin(a) * R,
          alpha: 0, duration: 300, ease: 'Quad.out',
          onComplete: (function (dot) { return function () { dot.destroy(); }; })(d)
        });
      }
    } catch (e) { /* omit visual effect only; gameplay continues */ }
  }

  /* ---- Wave runner --------------------------------------------------- */
  _startNextWave() {
    if (this.ended) return;
    this.waveIndex++;
    if (this.waveIndex >= this.level.waves.length) { this.levelDone = true; this._updateWaveBar(); return; }
    var wave = this.level.waves[this.waveIndex];
    this._updateWaveBar();

    // Boss waves get the dedicated boss theme; normal waves use the level track
    // (idempotent, so back-to-back normal waves never restart the music).
    PD.Audio.playMusic(wave.boss ? PD.MUSIC.boss : PD.MUSIC.forLevel(this.levelIndex));

    if (wave.boss) this._bossBanner();

    this.waveFullySpawned = false;
    this.wavePending = 0;
    var self = this;
    var maxTime = 0;

    wave.groups.forEach(function (grp) {
      for (var k = 0; k < grp.count; k++) {
        var t = grp.delay + k * grp.gap;
        maxTime = Math.max(maxTime, t);
        self.wavePending++;
        self.time.delayedCall(t, function () {
          if (!self.ended) self._spawnEnemy(grp.e);
        });
      }
    });

    this.time.delayedCall(maxTime + 60, function () { self.waveFullySpawned = true; });
  }

  _spawnEnemy(enemyId) {
    var def = PD.ENEMIES[enemyId];
    if (!def) return;
    var lane = Phaser.Math.Between(0, PD.BATTLE.LANES - 1);
    var e = new PD.Enemy(this, def, lane, this.layout);
    this.enemies.push(e);
  }

  _bossBanner() {
    var W = PD.GAME.WIDTH;
    PD.Audio.bossHorn();
    var t = PD.UIKit.label(this, W / 2, 250, 'BOSS INCOMING!', 56, '#ff5b5b').setDepth(90).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 350, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 500, onComplete: function () { t.destroy(); } });
  }

  /* ---- Toasts / floating text --------------------------------------- */
  _toast(msg) {
    if (this._toastObj) this._toastObj.destroy();
    this._toastObj = PD.UIKit.label(this, PD.GAME.WIDTH / 2, PD.GAME.HEIGHT - 130, msg, 20, '#ff9a5c').setDepth(95);
    this.tweens.add({ targets: this._toastObj, alpha: 0, y: PD.GAME.HEIGHT - 150, delay: 700, duration: 500 });
  }

  _floatText(x, y, msg, color) {
    var t = PD.UIKit.label(this, x, y, msg, 18, color).setDepth(80);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 800, onComplete: function () { t.destroy(); } });
  }

  /* ---- Pause --------------------------------------------------------- */
  _togglePause() {
    if (this.ended) return;
    this.paused = !this.paused;
    if (this.paused) { this.time.paused = true; this.anims.pauseAll(); this._showPauseOverlay(); }
    else { this.time.paused = false; this.anims.resumeAll(); if (this.pauseLayer) { this.pauseLayer.destroy(); this.pauseLayer = null; } }
  }

  _showPauseOverlay() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT, self = this;
    this.pauseLayer = this.add.container(0, 0).setDepth(120);
    var shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
    this.pauseLayer.add(shade);
    var pop = this.add.image(W / 2, H / 2, 'ui_paused');
    if (pop.width > 620) pop.setScale(620 / pop.width);
    this.pauseLayer.add(pop);
    this.pauseLayer.add(PD.UIKit.label(this, W / 2, H / 2 - 108, 'PAUSED', 44, '#ffd479'));
    this.pauseLayer.add(PD.UIKit.pillButton(this, W / 2, H / 2 - 34, 240, 62, 'Resume', function () { self._togglePause(); }, 0x6ab04c));
    this.pauseLayer.add(PD.UIKit.pillButton(this, W / 2, H / 2 + 42, 240, 62, 'Settings', function () { self._openBattleSettings(); }, 0x3d7fb5));
    this.pauseLayer.add(PD.UIKit.pillButton(this, W / 2, H / 2 + 118, 240, 62, 'Quit to Map', function () { self.time.paused = false; self.anims.resumeAll(); self.scene.start('LevelMap'); }, 0xc0603c));
  }

  // Modal settings from the pause overlay: simulation stays paused (time and
  // anims remain paused) while settings are open, and closing returns to the
  // pause overlay. Only an explicit Resume restarts the battle.
  _openBattleSettings() {
    if (this._settingsOpen) return;
    this._settingsOpen = true;
    var self = this;
    // Hide the pause buttons underneath so taps only reach the settings panel.
    if (this.pauseLayer) this.pauseLayer.setVisible(false);
    PD.SettingsPanel.open(this, {
      depth: 150,
      onClose: function () {
        self._settingsOpen = false;
        if (self.pauseLayer) self.pauseLayer.setVisible(true);
      }
    });
  }

  /* ---- Win / lose ---------------------------------------------------- */
  _win() {
    if (this.ended) return;
    this.ended = true;
    this.dripEvent.remove();
    PD.Audio.win();

    var coinReward = 120 + this.baseHP * 40 + this.enemiesKilled * 3;
    var gemReward = 1 + (this.baseHP >= 5 ? 2 : 0);
    var newly = PD.Save.clearLevel(this.levelIndex, coinReward, gemReward);

    this._resultPopup(true, coinReward, gemReward, newly);
  }

  _lose() {
    if (this.ended) return;
    this.ended = true;
    this.dripEvent.remove();
    PD.Audio.lose();
    this._resultPopup(false, 0, 0, []);
  }

  _resultPopup(win, coinReward, gemReward, newly) {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT, self = this;
    var layer = this.add.container(0, 0).setDepth(130);
    layer.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.68).setInteractive());

    var pop = this.add.image(W / 2, H / 2 - 20, win ? 'ui_winpop' : 'ui_losepop');
    if (pop.width > 680) pop.setScale(680 / pop.width);
    layer.add(pop);
    pop.setScale(pop.scale * 0.7);
    this.tweens.add({ targets: pop, scale: pop.scale / 0.7, duration: 400, ease: 'Back.out' });

    // The popup art already has a baked "YOU WIN" / "YOU LOSE" title, so we
    // only add the supporting detail below it.
    var cy = H / 2 + 6;
    if (win) {
      var bonus = this.add.image(W / 2, cy, 'ui_winbonus');
      if (bonus.width > 300) bonus.setScale(300 / bonus.width);
      layer.add(bonus);
      layer.add(PD.UIKit.label(this, W / 2, cy, '+' + coinReward + '   •   ' + gemReward + ' gem', 22, '#3b2a12'));
      if (newly.length) {
        var names = newly.map(function (id) { return PD.UNITS[id].name; }).join(', ');
        layer.add(PD.UIKit.label(this, W / 2, cy + 58, 'Unlocked: ' + names, 20, '#ffd479'));
      }
    } else {
      layer.add(PD.UIKit.label(this, W / 2, cy + 8, 'The cats broke through your defenses.', 20, '#f0d0d0'));
    }

    var by = H / 2 + 150;
    if (win) {
      var nextIdx = this.levelIndex + 1;
      if (nextIdx < PD.LEVELS.length) {
        layer.add(PD.UIKit.pillButton(this, W / 2 - 130, by, 220, 62, 'Next Stage ►', function () { self.scene.start('SquadSelect', { level: nextIdx }); }, 0x6ab04c));
        layer.add(PD.UIKit.pillButton(this, W / 2 + 130, by, 200, 62, 'World Map', function () { self.scene.start('LevelMap'); }, 0x3d7fb5));
      } else {
        layer.add(PD.UIKit.label(this, W / 2, by - 30, 'You cleared the whole campaign! 🐾', 22, '#ffd479'));
        layer.add(PD.UIKit.pillButton(this, W / 2, by + 10, 240, 62, 'World Map', function () { self.scene.start('LevelMap'); }, 0x6ab04c));
      }
    } else {
      layer.add(PD.UIKit.pillButton(this, W / 2 - 130, by, 200, 62, 'Retry', function () { self.scene.restart({ level: self.levelIndex, roster: self.roster }); }, 0x6ab04c));
      layer.add(PD.UIKit.pillButton(this, W / 2 + 130, by, 200, 62, 'World Map', function () { self.scene.start('LevelMap'); }, 0x3d7fb5));
    }
  }

  /* ---- Main loop ----------------------------------------------------- */
  update(time, delta) {
    if (this.paused || this.ended || this._guarded) return;

    var i;
    for (i = 0; i < this.units.length; i++) this.units[i].step(delta);
    for (i = 0; i < this.enemies.length; i++) this.enemies[i].step(delta);
    for (i = 0; i < this.projPool.length; i++) if (this.projPool[i]._alive) this.projPool[i].step(delta);

    this._drawBars();

    // Wave progression / win check
    if (!this.levelDone && this.waveFullySpawned && this.enemies.length === 0) {
      this.waveFullySpawned = false;
      var self = this;
      this.time.delayedCall(1200, function () { self._startNextWave(); });
    }
    if (this.levelDone && this.enemies.length === 0 && !this.ended) this._win();
  }

  _drawBars() {
    var g = this.hpGfx;
    g.clear();
    var drawFor = function (o, w) {
      if (!o._alive || o.hp >= o.maxhp) return;
      var frac = Phaser.Math.Clamp(o.hp / o.maxhp, 0, 1);
      var bx = o.x - w / 2, by = o.y - o.displayHeight * 0.5 - 10;
      g.fillStyle(0x000000, 0.55).fillRect(bx - 1, by - 1, w + 2, 7);
      g.fillStyle(frac > 0.5 ? 0x6ab04c : (frac > 0.25 ? 0xe0b040 : 0xd0402a), 1).fillRect(bx, by, w * frac, 5);
    };
    var i;
    for (i = 0; i < this.enemies.length; i++) drawFor(this.enemies[i], this.enemies[i].isBoss ? 60 : 40);
    for (i = 0; i < this.units.length; i++) drawFor(this.units[i], 44);
  }
};
