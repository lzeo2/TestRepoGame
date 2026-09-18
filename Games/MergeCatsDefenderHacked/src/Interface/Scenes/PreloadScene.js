/* =========================================================================
 * Merge Cats Defender — Scene: Preload
 * Queues every image, shows a progress bar, registers animations.
 * ========================================================================= */
window.PD = window.PD || {};

PD.PreloadScene = class extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT;
    // The supplied CrimSun mark has a white background, so present it on white
    // and start the minimum-visibility clock now.
    this.cameras.main.setBackgroundColor('#ffffff');
    this._presentStart = this.time.now;

    // CrimSun studio launch logo — aspect ratio preserved, never upscaled,
    // sitting clear above the progress feedback.
    if (this.textures.exists('ui_crimsun')) {
      var logo = this.add.image(W / 2, H / 2 - 60, 'ui_crimsun').setOrigin(0.5);
      var scale = Math.min(560 / logo.width, 320 / logo.height, 1);
      logo.setScale(scale);
    }

    // Progress feedback below the logo (no overlap). Use plain text with a
    // clean dark fill and no heavy stroke — the shared PD.UIKit.label bakes in a
    // thick dark stroke meant for light text on dark scenes, which reads badly
    // (harsh, low-contrast) as dark text on this white launch screen.
    var bw = 560, bh = 26, bx = W / 2 - bw / 2, by = H - 150;
    var textStyle = { fontFamily: PD.UIKit.FONT, color: '#1c2b3a', align: 'center' };
    this.add.text(W / 2, by - 26, 'loading the litter...',
      Object.assign({ fontSize: '18px' }, textStyle)).setOrigin(0.5);
    var box = this.add.graphics();
    box.fillStyle(0xd7dee5, 1).fillRoundedRect(bx - 4, by - 4, bw + 8, bh + 8, 9);
    var bar = this.add.graphics();
    var pct = this.add.text(W / 2, by + bh + 26, '0%',
      Object.assign({ fontSize: '20px' }, textStyle)).setOrigin(0.5);

    // Cap simultaneous requests so single-threaded dev servers don't stall.
    this.load.maxParallelDownloads = 6;

    this.load.on('progress', function (v) {
      bar.clear();
      bar.fillStyle(0x6ab04c, 1).fillRoundedRect(bx, by, Math.max(1, bw * v), bh, 7);
      pct.setText(Math.round(v * 100) + '%');
    });

    PD.Assets.queueAll(this);
  }

  create() {
    PD.Assets.registerAnims(this);
    // Keep the CrimSun mark visible for a brief minimum window (runs concurrently
    // with loading) so it is perceptible even on a warm cache, then hand off to
    // the game's own Merge Cats Defender Landing identity.
    var MIN_MS = 1200, self = this;
    var wait = Math.max(0, MIN_MS - (this.time.now - this._presentStart));
    this.time.delayedCall(wait, function () { self.scene.start('Landing'); });
  }
};
