/* =========================================================================
 * Merge Cats Defender — entry point. Builds the Phaser.Game and registers scenes.
 * ========================================================================= */
(function () {
  // The display-mode setting was removed; the game is fixed to Fit (the whole
  // view, letterboxed) — the known-good presentation on every device.
  var startMode = Phaser.Scale.FIT;

  var config = {
    type: Phaser.AUTO,
    width: PD.GAME.WIDTH,
    height: PD.GAME.HEIGHT,
    backgroundColor: '#0e1a26',
    parent: 'game',
    scale: {
      mode: startMode,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: { antialias: true, roundPixels: false },
    scene: [
      PD.BootScene,
      PD.PreloadScene,
      PD.LandingScene,
      PD.LevelMapScene,
      PD.SquadSelectScene,
      PD.BattleScene
    ]
  };

  window.PawDefenseGame = new Phaser.Game(config);

  // Centralize presentation policy: owns display mode, safe rect, and the single
  // debounced layout notification scenes subscribe to.
  PD.Display.attach(window.PawDefenseGame);
})();
