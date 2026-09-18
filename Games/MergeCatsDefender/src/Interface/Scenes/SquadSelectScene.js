/* =========================================================================
 * Merge Cats Defender — Scene: Squad Select (pre-battle loadout)
 * Pick up to 6 unlocked cats to bring into the stage dock.
 * ========================================================================= */
window.PD = window.PD || {};

PD.SquadSelectScene = class extends Phaser.Scene {
  constructor() { super('SquadSelect'); }

  init(data) { this.levelIndex = (data && data.level) || 0; }

  create() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT;
    this.cameras.main.setBackgroundColor('#1a2836');

    PD.Audio.playMusic(PD.MUSIC.menu);   // still part of the menu flow

    var lvl = PD.LEVELS[this.levelIndex];
    PD.UIKit.label(this, W / 2, 44, 'STAGE ' + (this.levelIndex + 1) + ' — ' + lvl.name, 34, '#ffd479');
    this.hint = PD.UIKit.label(this, W / 2, 84, 'Choose up to 6 cats for your squad', 20, '#cfe3f2');

    // Working copy of the saved roster (drop unknown/removed ids, then keep
    // only still-unlocked ones).
    this.selected = PD.normalizeRoster(PD.Save.load().roster)
      .filter(function (id) { return PD.Save.isUnlocked(id); });

    var order = [];
    for (var i = 1; i <= 15; i++) order.push('char' + i);
    order.push('guardian', 'boxing');

    var cols = 6, cardW = 176, cardH = 150, gapX = 12, gapY = 16;
    var totalW = cols * cardW + (cols - 1) * gapX;
    var startX = (W - totalW) / 2 + cardW / 2;
    var startY = 190;

    this.cards = {};
    for (var k = 0; k < order.length; k++) {
      var r = Math.floor(k / cols), c = k % cols;
      var x = startX + c * (cardW + gapX);
      var y = startY + r * (cardH + gapY);
      this._card(order[k], x, y, cardW, cardH);
    }

    var backBtn = PD.UIKit.pillButton(this, W / 2 - 140, H - 46, 200, 62, '‹ Back to Map', function () {
      this.scene.start('LevelMap');
    }.bind(this), 0x3d7fb5);

    this.startBtn = PD.UIKit.pillButton(this, W / 2 + 140, H - 46, 220, 62, 'START ►', function () {
      this._start();
    }.bind(this), 0x6ab04c);

    // Anchor the bottom action bar to the safe rectangle so Fill-mode vertical
    // cropping / a bottom cutout never hides Back or Start.
    var self = this;
    PD.Display.bindLayout(this, function () {
      var r = PD.Display.safeRect();
      var cxr = r.x + r.w / 2, by = r.y + r.h - 46;
      backBtn.setPosition(cxr - 140, by);
      self.startBtn.setPosition(cxr + 140, by);
    });

    this._refreshHint();
  }

  _card(id, x, y, w, h) {
    var def = PD.UNITS[id];
    var unlocked = PD.Save.isUnlocked(id);
    var cont = this.add.container(x, y);

    var g = this.add.graphics();
    g.fillStyle(unlocked ? 0x2f4a63 : 0x24333f, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 12);
    g.lineStyle(2, 0x11202c, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
    cont.add(g);

    var spr = this.add.sprite(0, -18, def.iconTex, 0).setScale(def.scale * 0.9);
    if (def.tint) spr.setTint(def.tint);
    cont.add(spr);

    var name = PD.UIKit.label(this, 0, h / 2 - 40, def.name, 15, '#ffffff');
    var role = PD.UIKit.label(this, 0, h / 2 - 20, def.role + '  •  ' + def.cost + 'c', 13, '#ffd479');
    cont.add(name); cont.add(role);

    var border = this.add.image(0, 0, 'ui_selected').setVisible(false);
    border.setDisplaySize(w - 8, h - 8);
    cont.add(border);

    if (!unlocked) {
      var lock = this.add.image(0, -18, 'ui_lockedCat');
      if (lock.width > w - 20) lock.setScale((w - 20) / lock.width);
      lock.setAlpha(0.9);
      cont.add(lock);
      role.setText('LOCKED');
      role.setColor('#9fb0bd');
      spr.setAlpha(0.3);
    } else {
      cont.setSize(w, h);
      cont.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
      var self = this;
      cont.on('pointerup', function () { self._toggle(id); });
    }

    this.cards[id] = { border: border, selected: this.selected.indexOf(id) !== -1 };
    border.setVisible(this.cards[id].selected);
  }

  _toggle(id) {
    var idx = this.selected.indexOf(id);
    if (idx !== -1) {
      this.selected.splice(idx, 1);
      this.cards[id].border.setVisible(false);
      PD.Audio.click();
    } else {
      if (this.selected.length >= 6) { PD.Audio.error(); this._flashHint('Squad is full (6 max) — deselect one first'); return; }
      this.selected.push(id);
      this.cards[id].border.setVisible(true);
      PD.Audio.place();
    }
    this._refreshHint();
  }

  _refreshHint() {
    this.hint.setText('Squad: ' + this.selected.length + ' / 6 selected');
  }

  _flashHint(msg) {
    this.hint.setText(msg);
    this.hint.setColor('#ff8a5c');
    var self = this;
    this.time.delayedCall(1200, function () { self.hint.setColor('#cfe3f2'); self._refreshHint(); });
  }

  _start() {
    if (this.selected.length === 0) { PD.Audio.error(); this._flashHint('Pick at least one cat!'); return; }
    var d = PD.Save.load();
    d.roster = this.selected.slice();
    PD.Save.save();
    this.scene.start('Battle', { level: this.levelIndex, roster: this.selected.slice() });
  }
};
