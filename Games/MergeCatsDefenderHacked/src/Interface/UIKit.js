/* =========================================================================
 * Merge Cats Defender — Interface: small UI helpers (buttons, labels, panels)
 * ========================================================================= */
window.PD = window.PD || {};

PD.UIKit = {
  FONT: 'Georgia, "Passion One", sans-serif',

  // Image button with a pressed-frame swap + tap feedback.
  // Assumes default origin 0.5. Scale is applied BEFORE interactivity, and an
  // explicit hit rectangle is bound to the frame's local (pre-scale) bounds:
  // Phaser hit-tests in the object's local space and applies the scale/origin
  // transform itself, so this rect maps to the full displayed button at any
  // scale — including the natural (unscaled) size.
  imageButton: function (scene, x, y, texUp, texDown, onClick, scale) {
    var btn = scene.add.image(x, y, texUp);
    if (scale) btn.setScale(scale);
    btn.setInteractive({
      useHandCursor: true,
      hitArea: new Phaser.Geom.Rectangle(0, 0, btn.width, btn.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains
    });
    var base = btn.scale;
    btn.on('pointerdown', function () { if (texDown && scene.textures.exists(texDown)) btn.setTexture(texDown); btn.setScale(base * 0.94); });
    btn.on('pointerup', function () { btn.setTexture(texUp); btn.setScale(base); PD.Audio.click(); if (onClick) onClick(); });
    btn.on('pointerout', function () { btn.setTexture(texUp); btn.setScale(base); });
    return btn;
  },

  // Text label with a soft shadow, centered by default.
  label: function (scene, x, y, text, size, color) {
    return scene.add.text(x, y, text, {
      fontFamily: PD.UIKit.FONT,
      fontSize: (size || 24) + 'px',
      color: color || '#ffffff',
      stroke: '#20140a',
      strokeThickness: Math.max(3, Math.round((size || 24) / 6)),
      align: 'center'
    }).setOrigin(0.5);
  },

  // A rounded pill button drawn from primitives (used where no art fits).
  pillButton: function (scene, x, y, w, h, text, onClick, color) {
    var c = scene.add.container(x, y);
    var g = scene.add.graphics();
    var fill = color || 0x6ab04c;
    g.fillStyle(0x20140a, 1).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, h / 2);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.lineStyle(3, 0xffffff, 0.35).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    var t = PD.UIKit.label(scene, 0, 0, text, Math.round(h * 0.42));
    c.add([g, t]);
    // A sized Container's input hit-area rectangle uses TOP-LEFT origin
    // (0,0)->(w,h), not centered: Phaser offsets it by the container size,
    // so a centered rect only covers the left/upper region. See UIKit note.
    c.setSize(w, h);
    c.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains);
    c.on('pointerdown', function () { c.setScale(0.95); });
    c.on('pointerup', function () { c.setScale(1); PD.Audio.click(); if (onClick) onClick(); });
    c.on('pointerout', function () { c.setScale(1); });
    c.label = t;
    return c;
  },

  // Readable currency badge: the CoinBar/GemsBar frame has a baked dark
  // interior, so we cover that interior with a deliberate light panel and put
  // dark text + the icon on top. Shared by Battle and LevelMap for consistency.
  // Returns a container with setValue(n); text stays centered in the panel.
  currencyBadge: function (scene, x, y, barTex, iconTex, value, height) {
    var h = height || 52;
    var c = scene.add.container(x, y);
    var bar = scene.add.image(0, 0, barTex).setOrigin(0.5);
    if (bar.height) bar.setScale(h / bar.height);
    var bw = bar.displayWidth, bh = bar.displayHeight;

    var panel = scene.add.graphics();
    panel.fillStyle(0xf3e2b8, 1).fillRoundedRect(-bw * 0.44, -bh * 0.30, bw * 0.88, bh * 0.60, bh * 0.28);

    var icon = scene.add.image(-bw * 0.32, 0, iconTex).setOrigin(0.5);
    if (icon.height) icon.setScale((bh * 0.72) / icon.height);

    var txt = PD.UIKit.label(scene, bw * 0.10, 0, '' + value, Math.round(h * 0.42), '#5a3d12').setOrigin(0.5);
    txt.setStroke('#f3e2b8', 2);

    c.add([bar, panel, icon, txt]);
    c.setValue = function (n) { txt.setText('' + n); };
    c._txt = txt;
    return c;
  },

  // Fit an image to cover a target box (like CSS background cover).
  cover: function (img, w, h) {
    var s = Math.max(w / img.width, h / img.height);
    img.setScale(s);
    return img;
  }
};
