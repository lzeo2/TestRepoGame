/* =========================================================================
 * Merge Cats Defender — Scene: Landing (title screen)
 * ========================================================================= */
window.PD = window.PD || {};

PD.LandingScene = class extends Phaser.Scene {
  constructor() { super('Landing'); }

  create() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT;

    PD.Audio.playMusic(PD.MUSIC.menu);   // shared menu soundtrack

    var bg = this.add.image(W / 2, H / 2, 'ui_landing');
    PD.UIKit.cover(bg, W, H);

    var logo = this.add.image(W / 2, 150, 'ui_logo').setOrigin(0.5);
    if (logo.width > 560) logo.setScale(560 / logo.width);
    this.tweens.add({ targets: logo, y: 162, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    PD.UIKit.label(this, W / 2, 372, 'Defend the Cat Kingdom!', 24, '#fff2cf');

    PD.UIKit.pillButton(this, W / 2, 448, 300, 82, 'PLAY', function () {
      this.scene.start('LevelMap');
    }.bind(this), 0x6ab04c);

    PD.UIKit.pillButton(this, W / 2, 546, 240, 58, 'How to Play', function () {
      this._showHelp();
    }.bind(this), 0x3d7fb5);

    this._buildSettings();
  }

  // A single settings entry replaces the old three-icon row: audio, vibration,
  // and the new display-scaling choice all live in the shared settings panel.
  // Anchored to the safe rectangle's top-right so a display cutout / Fill crop
  // never hides it.
  _buildSettings() {
    var self = this;
    var btn = this.add.image(0, 0, 'ui_setting').setDepth(50).setInteractive({ useHandCursor: true });
    if (btn.width > 64) btn.setScale(64 / btn.width);
    btn.on('pointerup', function () { PD.Audio.click(); self._openSettings(); });
    this._settingsBtn = btn;

    // Keep the button inside the safe rect across resize/orientation/display
    // changes; bindLayout removes the subscription on scene shutdown (no leaks).
    PD.Display.bindLayout(this, function () {
      var r = PD.Display.safeRect();
      btn.setPosition(r.x + r.w - 46, r.y + 46);
    });
  }

  _openSettings() {
    if (this._settingsOpen) return;
    this._settingsOpen = true;
    var self = this;
    PD.SettingsPanel.open(this, {
      onClose: function () { self._settingsOpen = false; }
    });
  }

  _showHelp() {
    var W = PD.GAME.WIDTH, H = PD.GAME.HEIGHT;
    var layer = this.add.container(0, 0).setDepth(100);
    var shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setInteractive();
    var panel = this.add.graphics();
    panel.fillStyle(0x24384c, 1).fillRoundedRect(W / 2 - 380, H / 2 - 230, 760, 460, 20);
    panel.lineStyle(4, 0xffd479, 0.8).strokeRoundedRect(W / 2 - 380, H / 2 - 230, 760, 460, 20);
    var lines = [
      'HOW TO PLAY',
      '',
      '• Pick a cat from the dock, then tap a lane cell to deploy it.',
      '• Coins tick up over time and drop when enemies die — spend wisely.',
      '• Shooter cats fire down their lane. Guardian shields the frontline.',
      '• Cat Boxing punches anything that gets close.',
      '• Stop every wave before enemies reach the left edge.',
      '• Bosses appear at milestone waves — focus your fire!',
      '',
      'Tap anywhere to close.'
    ];
    var txt = this.add.text(W / 2, H / 2 - 10, lines.join('\n'), {
      fontFamily: PD.UIKit.FONT, fontSize: '22px', color: '#eaf3fb', align: 'center', lineSpacing: 8
    }).setOrigin(0.5);
    layer.add([shade, panel, txt]);
    shade.on('pointerup', function () { layer.destroy(); });
  }
};
