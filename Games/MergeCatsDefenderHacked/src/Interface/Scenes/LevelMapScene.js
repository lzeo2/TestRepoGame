/* =========================================================================
 * Merge Cats Defender — Scene: Level Map (campaign node select)
 * ========================================================================= */
window.PD = window.PD || {};

PD.LevelMapScene = class extends Phaser.Scene {
  constructor() { super('LevelMap'); }

  create() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT;

    PD.Audio.playMusic(PD.MUSIC.menu);   // menu flow shares one soundtrack

    var bg = this.add.image(W / 2, H / 2, 'ui_mapbg');
    PD.UIKit.cover(bg, W, H);
    this.add.rectangle(W / 2, H / 2, W, H, 0x0a1420, 0.25);

    PD.UIKit.label(this, W / 2, 56, 'SELECT A STAGE', 40, '#ffd479');

    this._currencyHeader();

    // Nodes laid along a gentle wave.
    var n = PD.LEVELS.length;
    var marginX = 150, span = W - marginX * 2;
    for (var i = 0; i < n; i++) {
      var x = marginX + span * (i / (n - 1));
      var y = 400 + Math.sin(i * 1.1) * 90;
      this._node(i, x, y);
      if (i > 0) this._link(marginX + span * ((i - 1) / (n - 1)), 400 + Math.sin((i - 1) * 1.1) * 90, x, y);
    }

    var menuBtn = PD.UIKit.pillButton(this, 90, H - 44, 150, 56, '‹ Menu', function () {
      this.scene.start('Landing');
    }.bind(this), 0x3d7fb5);

    // Keep the corner-anchored Menu button and currency header inside the safe
    // rectangle across display-mode / orientation changes.
    var self = this;
    PD.Display.bindLayout(this, function () {
      var r = PD.Display.safeRect();
      menuBtn.setPosition(r.x + 90, r.y + r.h - 44);
      if (self._coinBadge) self._coinBadge.setPosition(r.x + r.w - 170, r.y + 42);
      if (self._gemBadge) self._gemBadge.setPosition(r.x + r.w - 170, r.y + 96);
    });
  }

  _link(x1, y1, x2, y2) {
    var g = this.add.graphics().setDepth(1);
    g.lineStyle(8, 0x000000, 0.25); g.beginPath(); g.moveTo(x1, y1 + 4); g.lineTo(x2, y2 + 4); g.strokePath();
    g.lineStyle(6, 0xffe9b0, 0.6); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
  }

  _node(i, x, y) {
    var unlocked = PD.Save.isLevelUnlocked(i);
    var cleared = PD.Save.isCleared(i);
    var tex = cleared ? 'ui_nodeGreen' : (unlocked ? 'ui_nodeOrange' : 'ui_nodeLocked');
    var img = this.add.image(x, y, tex).setDepth(5);
    if (img.width > 130) img.setScale(130 / img.width);

    PD.UIKit.label(this, x, y - 4, '' + (i + 1), 34, '#ffffff').setDepth(6);
    PD.UIKit.label(this, x, y + 78, PD.LEVELS[i].name, 18, unlocked ? '#fff2cf' : '#9fb0bd').setDepth(6);

    if (unlocked) {
      img.setInteractive({ useHandCursor: true });
      var self = this;
      this.tweens.add({ targets: img, scale: img.scale * 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      img.on('pointerup', function () {
        PD.Audio.click();
        self.scene.start('SquadSelect', { level: i });
      });
    } else {
      img.setAlpha(0.85);
    }
  }

  _currencyHeader() {
    var d = PD.Save.load();
    // Same readable badge treatment as the Battle HUD. Kept as refs so the
    // safe-rect layout binding can re-anchor them (see create()).
    this._coinBadge = PD.UIKit.currencyBadge(this, PD.GAME.WIDTH - 170, 42, 'ui_coinbar', 'ui_coin', d.coins, 50);
    this._gemBadge = PD.UIKit.currencyBadge(this, PD.GAME.WIDTH - 170, 96, 'ui_gembar', 'ui_gem', d.gems, 50);
  }
};
