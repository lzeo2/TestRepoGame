/* =========================================================================
 * Merge Cats Defender — Rendering: asset queue + animation registration
 *
 * Every animation's frames are packed into a single spritesheet under
 * src/ASSETS/sheets/, described by `sheets.json` (key -> {fw, fh, n}). This
 * keeps the game to ~100 HTTP requests instead of ~700 individual frames,
 * so even a single-threaded static server loads it reliably.
 *
 * Frame textures are addressed as (sheetKey, frameIndex); frame 0 is the
 * canonical "portrait" used for icons and freshly-spawned sprites.
 * ========================================================================= */
window.PD = window.PD || {};

PD.Assets = (function () {
  var A = PD.GAME.ASSETS;

  // UI atlas: clean key -> file name (some source names contain spaces).
  var UI = {
    landing: 'LandingScreen.png', logo: 'Logo.png', ribbon: 'TitleRibbon.png',
    mapbg: 'LevelMap_Bg_Screen.png', nodeGreen: 'GreenLevel.png',
    nodeOrange: 'OrangeLvl.png', nodeLocked: 'LockedLevel.png',
    coinbar: 'CoinBar.png', coin: 'CoinIcon.png', gembar: 'GemsBarBg.png', gem: 'GemsIcon.png',
    wavebar: 'WaveBar.png',
    bar0: '0Bar.png', bar1: '1Bar.png', bar2: '2Bar.png', bar3: '3Bar.png', bar4: '4Bar.png', bar5: '5Bar.png',
    addbtn: 'AddBtn.png', addbtnDown: 'AddBtn_Pressed.png',
    paused: 'BgPaused.png',
    winpop: 'WinPopUp.png', winbonus: 'WinBonus.png', losepop: 'LosePopUp.png',
    btnGreen: 'BtnGreen.png', btnGreenDown: 'BtnGreenPressed.png',
    btnOrange: 'BtnOrange.png', btnOrangeDown: 'BtnOrangePressed.png',
    music: 'BtnMusic.png', musicOff: 'BtnMusicOff.png',
    sound: 'BtnSound.png', soundOff: 'BtnSound Off.png',
    vibra: 'BtnVibra.png', vibraOff: 'BtnVibra Off.png',
    setting: 'SettingBtn.png', help: 'BtnHelp.png',
    iconCat: 'Icon_Cat.png', iconHome: 'Icon_home.png', iconShop: 'Icon_Shop.png', iconAddon: 'Icon_Addon.png',
    selected: 'SelectedBorder.png', lockedCat: 'LockedCatBox.png', wallIcon: 'WallIcon.png',
    crimsun: 'CrimSunLogo.png'   // studio launch branding (distinct from ui_logo)
  };

  // Animation keys skipped this session because a required texture part exceeds
  // the live renderer's maximum texture size. Callers (spawnExplosion) consult
  // this to fall back safely instead of submitting an unsupported texture.
  var skipped = {};

  // Live renderer maximum texture size, with defensive fallbacks. WebGL exposes
  // it directly; Canvas has no hard GL cap, so our small shipped grids are safe.
  function maxTextureSize(scene) {
    var r = scene.game && scene.game.renderer;
    if (!r) return 4096;
    if (typeof r.maxTextureSize === 'number' && r.maxTextureSize > 0) return r.maxTextureSize;
    if (r.gl && r.gl.getParameter && r.gl.MAX_TEXTURE_SIZE) {
      try { return r.gl.getParameter(r.gl.MAX_TEXTURE_SIZE); } catch (e) { /* ignore */ }
    }
    return 4096;
  }

  // Largest texture dimension a sheet will submit, from the manifest. Multipart
  // sheets know their grid (cols*fw, rows*fh); single grids are already within
  // the shipped budget and validated statically, so treat their frame size as
  // the conservative floor.
  function sheetMaxDim(s) {
    if (s.parts) {
      var m = 0;
      for (var i = 0; i < s.parts.length; i++) {
        m = Math.max(m, s.parts[i].cols * s.fw, s.parts[i].rows * s.fh);
      }
      return m;
    }
    return Math.max(s.fw, s.fh);
  }

  return {
    UI_KEYS: UI,

    isSkipped: function (key) { return !!skipped[key]; },

    // Queue every image the game needs. Call inside a scene's preload().
    queueAll: function (scene) {
      var sheets = scene.cache.json.get('sheets') || {};
      var maxTex = maxTextureSize(scene);
      skipped = {};

      // Animation spritesheets (one request per animation). Sheets repacked into
      // mobile-safe grids still load through the same frameWidth/frameHeight call;
      // Phaser derives the column count from the image width. Multipart sheets
      // (see `parts`) load each ordered texture part instead of one strip.
      //
      // Preload-time capability guard: if a required texture part exceeds the
      // live renderer limit we skip submitting it entirely (no black/failed
      // texture) and record the key so the effect falls back at spawn time.
      for (var key in sheets) {
        var s = sheets[key];
        if (sheetMaxDim(s) > maxTex) { skipped[key] = true; continue; }
        if (s.parts) {
          for (var pi = 0; pi < s.parts.length; pi++) {
            var pk = s.parts[pi].key;
            scene.load.spritesheet(pk, A + 'sheets/' + pk + '.png', { frameWidth: s.fw, frameHeight: s.fh });
          }
        } else {
          scene.load.spritesheet(key, A + 'sheets/' + key + '.png', { frameWidth: s.fw, frameHeight: s.fh });
        }
      }

      // Areas
      for (var a = 1; a <= 5; a++) scene.load.image('area' + a, A + 'areas/area' + a + '.png');

      // Bullets
      scene.load.image('bullet0', A + 'bullets/bullet0.png');
      scene.load.image('bullet1', A + 'bullets/bullet1.png');
      scene.load.image('bullet2', A + 'bullets/bullet2.png');

      // UI (encode spaces so a static server resolves the file). Skip any that
      // Boot already loaded (e.g. the CrimSun launch logo).
      for (var uk in UI) {
        if (scene.textures.exists('ui_' + uk)) continue;
        scene.load.image('ui_' + uk, A + 'ui/' + UI[uk].replace(/ /g, '%20'));
      }

      // Soundtracks (one looping track per semantic key; see PD.MUSIC).
      var files = (PD.MUSIC && PD.MUSIC.files) || {};
      for (var mk in files) scene.load.audio(mk, A + files[mk]);
    },

    // Build all named animations from the loaded spritesheets.
    registerAnims: function (scene) {
      var sheets = scene.cache.json.get('sheets') || {};
      var am = scene.anims;

      for (var key in sheets) {
        if (am.exists(key)) continue;
        if (skipped[key]) continue;   // texture skipped by capability guard
        var sheet = sheets[key];
        var n = sheet.n;
        var fps = 12, repeat = -1;
        if (/_shoot$/.test(key))        { fps = 18; repeat = 0; }
        else if (/_idle$/.test(key))    { fps = 10; repeat = -1; }
        else if (/_walk$/.test(key))    { fps = 14; repeat = -1; }
        else if (/_attack$/.test(key) || /_fight$/.test(key)) { fps = 14; repeat = 0; }
        else if (key === 'shoot_fx')     { fps = 30; repeat = 0; }
        else if (key === 'explosion_fx') { fps = 34; repeat = 0; }

        // Multipart animations concatenate each part's frames in source order so
        // the public animation key (e.g. explosion_fx) and its 34fps/repeat=0
        // timing are unchanged; single-sheet animations keep the original path.
        var frames;
        if (sheet.parts) {
          frames = [];
          for (var pi = 0; pi < sheet.parts.length; pi++) {
            var part = sheet.parts[pi];
            frames = frames.concat(am.generateFrameNumbers(part.key, { start: 0, end: part.count - 1 }));
          }
        } else {
          frames = am.generateFrameNumbers(key, { start: 0, end: n - 1 });
        }

        am.create({ key: key, frames: frames, frameRate: fps, repeat: repeat });
      }
    }
  };
})();
