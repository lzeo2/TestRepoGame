/* =========================================================================
 * Merge Cats Defender — Scene: Boot
 * Loads only the frame manifest, then hands off to the main preloader.
 * ========================================================================= */
window.PD = window.PD || {};

PD.BootScene = class extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('sheets', PD.GAME.ASSETS + 'sheets.json');
    // Load the CrimSun launch logo here (a minimal Boot asset) so it is ready
    // to display throughout the full Preload asset load.
    this.load.image('ui_crimsun', PD.GAME.ASSETS + 'ui/CrimSunLogo.png');
  }

  create() {
    PD.Save.load();
    this.scene.start('Preload');
  }
};
