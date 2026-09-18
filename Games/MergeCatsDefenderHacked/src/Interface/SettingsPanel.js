/* =========================================================================
 * Merge Cats Defender — Interface: shared Settings panel
 *
 * One reusable modal used from both the landing screen and the paused battle
 * overlay. It edits the same persisted `settings` object used elsewhere — just
 * the Music, Sound, and Vibration toggles (each saves immediately on change).
 *
 * The panel is anchored to PD.Display.safeRect() so it is never cropped, and
 * returns a handle with close(); the caller supplies onClose so the battle pause
 * flow can stay modal until explicit Resume.
 * ========================================================================= */
window.PD = window.PD || {};

PD.SettingsPanel = {
  open: function (scene, opts) {
    opts = opts || {};
    var s = PD.Save.load().settings;
    var safe = PD.Display.safeRect();
    var cx = safe.x + safe.w / 2, cy = safe.y + safe.h / 2;

    var PW = 620, PH = 348;
    var layer = scene.add.container(0, 0).setDepth(opts.depth || 140);

    // Full-view shade (covers the whole logical view, not just the safe rect, so
    // nothing behind is interactive). Sized generously to survive Fill cropping.
    var shade = scene.add.rectangle(PD.GAME.WIDTH / 2, PD.GAME.HEIGHT / 2,
      PD.GAME.WIDTH * 2, PD.GAME.HEIGHT * 2, 0x000000, 0.66).setInteractive();
    layer.add(shade);

    var panel = scene.add.graphics();
    panel.fillStyle(0x20140a, 1).fillRoundedRect(cx - PW / 2 + 4, cy - PH / 2 + 5, PW, PH, 22);
    panel.fillStyle(0x24384c, 1).fillRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 22);
    panel.lineStyle(4, 0xffd479, 0.85).strokeRoundedRect(cx - PW / 2, cy - PH / 2, PW, PH, 22);
    layer.add(panel);

    layer.add(PD.UIKit.label(scene, cx, cy - PH / 2 + 44, 'SETTINGS', 40, '#ffd479'));

    var rowX = cx - PW / 2 + 46;
    var toggleX = cx + PW / 2 - 46;
    var y0 = cy - PH / 2 + 112, dy = 62;

    // --- Audio + vibration boolean rows --------------------------------------
    function boolRow(label, key, y, onChange) {
      layer.add(PD.UIKit.label(scene, rowX, y, label, 24, '#eaf3fb').setOrigin(0, 0.5));
      var pill = PD.SettingsPanel._togglePill(scene, toggleX, y, s[key], function (val) {
        s[key] = val;
        PD.Save.save();
        PD.Audio.click();
        if (onChange) onChange(val);
      });
      layer.add(pill);
    }

    boolRow('Music', 'music', y0, function (v) { PD.Audio.setMusicEnabled(v); });
    boolRow('Sound', 'sound', y0 + dy);
    boolRow('Vibration', 'vibrate', y0 + dy * 2, function (v) { if (v) PD.Audio.vibrate(30); });

    // --- Close ----------------------------------------------------------------
    var close = function () {
      if (layer._closed) return;
      layer._closed = true;
      layer.destroy();
      if (opts.onClose) opts.onClose();
    };
    shade.on('pointerup', function () { /* modal: outside tap does not dismiss */ });
    layer.add(PD.UIKit.pillButton(scene, cx, cy + PH / 2 - 44, 220, 58, 'Close', close, 0x6ab04c));

    return { layer: layer, close: close };
  },

  // A small ON/OFF pill toggle. Green = on, grey = off. Calls cb(newValue).
  _togglePill: function (scene, x, y, value, cb) {
    var w = 96, h = 40;
    var c = scene.add.container(x - w / 2, y);
    var g = scene.add.graphics();
    var t = PD.UIKit.label(scene, w / 2, 0, '', 20, '#ffffff');
    function draw(on) {
      g.clear();
      g.fillStyle(on ? 0x6ab04c : 0x55606a, 1).fillRoundedRect(0, -h / 2, w, h, h / 2);
      g.lineStyle(2, 0xffffff, 0.3).strokeRoundedRect(0, -h / 2, w, h, h / 2);
      t.setText(on ? 'ON' : 'OFF');
    }
    draw(value);
    c.add([g, t]);
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(0, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    c._value = value;
    c.on('pointerup', function () {
      c._value = !c._value;
      draw(c._value);
      if (cb) cb(c._value);
    });
    return c;
  }
};
