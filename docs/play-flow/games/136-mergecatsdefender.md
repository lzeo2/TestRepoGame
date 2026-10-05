# Merge Cats Defender play-flow audit (batch 4)

Identity: registered id 136, entry `Games/MergeCatsDefender/index.html`, entry blob `aa5406aca163d7299555969600f9981de6123658`, tree `c81e21372042cb95e1300f0981219bc450fbefe0`, 207 files, 45,995,457 bytes. Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. Manual `docs/maintenance/games/136-mergecatsdefender.md` read for orientation; source re-checked directly.

Validation status: **CODE-REVIEW ONLY**. No browser play this run; historical batch-7/R10 receipts are not this run's test.

## Source inspected

- `Games/MergeCatsDefender/index.html` (blob above): script load order verified by grep: `src/lib/phaser.js`, `src/Data/{Config,Units,Enemies,Waves}.js`, `src/Core/{Save,Audio,Display}.js`, `src/Rendering/Assets.js`, `src/Interface/UIKit.js`, `src/Interface/SettingsPanel.js`, `src/Interface/Entities/{Projectile,Enemy,Unit}.js`, six scenes (`BootScene`, `PreloadScene`, `LandingScene`, `LevelMapScene`, `SquadSelectScene`, `BattleScene`), `src/main.js`.
- `src/Core/Save.js` (blob `0b2046939e1207d381a8dfe05e249412c1d351fa`): first 60 lines read verbatim. `PD.Save.KEY = 'pawdefense.save.v1'`; `_default()` returns `{coins:300, gems:5, unlocks:..., roster:..., cleared:[], settings:{...}}`; `load()` does `this.data = raw ? JSON.parse(raw) : this._default()` inside try/catch, then runs `for (var k in d) if (!(k in this.data)) this.data[k] = d[k];` **outside** the catch.
- `src/Interface/Scenes/BattleScene.js` (blob `f2b81f98058ec759b27120ce495050198fb08674`): anchor grep verified `_guarded` (line 108), `trash` bin (lines 144-158), `baseHP` (line 167).
- `CREDITS.md` (blob `c671ef2177e0d7b5842ee48c86acef660f70818a`) inventoried (orientation: permission requested, formal license pending).

Held: `src/lib/phaser.js` vendor bundle (1,375,976 bytes), binary PNG/MP3 assets, sheets manifest contents, and full line-by-line reads of scene/entity bodies beyond the anchors above.

## Flow

- Boot: `main.js` builds `window.PawDefenseGame` (1280x720, Phaser.AUTO, FIT/CENTER_BOTH) into plain `#game`; BootScene loads sheets + logo, Preload queues assets and waits >=1200ms (orientation).
- Start/setup: `LandingScene` shows Play / How to Play / Settings (orientation); Play -> LevelMap -> stage -> `SquadSelectScene` pick up to six unlocked cats -> Start -> Battle.
- Input: pointer/touch: tap dock unit, tap empty matching slot (towers for shooters, frontline for Guardian/Boxing); drag unit to painted `trash` to discard; Escape and pause control toggle pause (`_togglePause`, `_guarded`). No keyboard deploy path (orientation).
- Core loop: Phaser scene update with spawn/drip timers, unit/enemy/projectile stepping (anchors verified; bodies held).
- Score/progression: battle coins (drip timer), `baseHP` 5, wave counters; `clearLevel` awards campaign coins/gems into `pawdefense.save.v1` (orientation).
- Win/lose: survive all waves wins; `baseHP` zero loses; Retry/Next Stage/World Map after results (orientation, anchors `baseHP` verified).
- Restart: Retry restarts the scene; reload resumes from save.

## UI bloat classification: MILD

Persistent: HUD bars and coin/gem readouts (genuine). Scene menus (landing, level map, squad select, settings) are genuine game menus, keep. No ad cards or recurring popups authored in reviewed sources. Catalog "merge/upgrade" wording overstates controls that are select/place/discard (copy issue, orientation).

## Popup/modal inventory

- Settings panel and help overlay: user-triggered, dismissible, repeat on demand (orientation).
- Win/Lose result cards: once per terminal battle (orientation).
- Rotate guard in portrait (orientation). No ad or recurring info popups in reviewed source; `OrangeBTNAds.png` asset exists but no reviewed caller reached it this run (held).

## Animation/simulation

Real simulation inside Phaser: enemy/unit/projectile stepping and lane targeting in scene update; sprite-sheet animations registered by `Assets.registerAnims` (orientation). Vendor RAF/RAF-equivalent loop is engine-owned; not conflated with model animation here.

## Findings

- HIGH, rights hold: `CREDITS.md` records permission requested, formal license pending, plus CraftPix source-art mentions. Owner must resolve written game/asset rights; no removal by this report.
- HIGH: `src/Core/Save.js::load`, `k in this.data` executes on a parsed root that can be `null`/primitive (valid JSON `null` passes `JSON.parse` without throwing, then `in` throws TypeError out of `load`, breaking Boot). Wrong-type `unlocks` arrays later break selection. Root: `Save.load`. Fix: validate loaded root shape (object, arrays, numerics, settings) before merging defaults; recover the key rather than clearing origin storage.
- MEDIUM: `UIKit.pillButton` and scene cards are pointer-only; Escape pause does not make menus/deploy keyboard-usable (orientation, anchors verified present). Fix: bounded keyboard/focus path in shared UIKit.
- MEDIUM: `_togglePause` can unpause with `_guarded` still true (orientation; `_guarded` anchor verified at line 108). Fix: one guarded pause decision shared by Escape/settings/orientation.
- LOW: catalog/help copy vs actual controls (merge wording; wall-attack failure route). Main owns copy correction after native confirmation.
- No fix needed: scene shutdown listener unbinding in `Display.bindLayout` (orientation); keep splash snapshot iteration pattern.

## Recommended playable view

Keep canvas, HUD, dock/touch controls, pause, settings, result cards. Move "How to Play" text into a one-time acknowledged help with optional reopen (button may stay). No recurring popups exist to remove; do not hide the pause/HUD headers.

## Smallest browser check still needed

Write `null` into `pawdefense.save.v1` and reload (expects crash today); full start flow to one battle; placement on tower and frontline; one win and one loss with Retry; portrait rotate guard; pause via Escape during spawn.
