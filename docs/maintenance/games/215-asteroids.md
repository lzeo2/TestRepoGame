<!-- maintenance-game: Games/Asteroids -->
# Asteroids maintenance

## Identity and status

Registered id **215**, category `classic`, not featured. Entry: `Games/Asteroids/index.html`; reviewed source baseline `8c8a055`. The directory contains 9 tracked files, 255,664 bytes. This is the Doug McInnes canvas port, not the earlier in-house version described by historical playtests. Local script/audio references support offline dependency closure, not an actual browser pass.

## Implementation map

Source review coverage: read complete `index.html`, `ipad.js`, `game.js`, `CREDITS.md` and MIT `LICENSE`. The 70,843-byte jQuery 1.4.1 vendor implementation and 27,861-byte vector font data were not human-reviewed in entirety; WAV assets were inventoried, not listened to.

HTML loads jQuery, `vector_battle_regular.typeface.js`, `ipad.js`, then `game.js`. DOM anchors are `#hud`, `#canvas`, `#left-controls`, `#right-controls`, and movement divs `#up`, `#left`, `#right`, `#space`. `Sprite.run()` combines movement, spatial-grid membership, polygon drawing and collision dispatch. `GridNode` maintains linked sprite lists; `Ship`, `BigAlien`, `Bullet`, `Asteroid` and `Explosion` specialize the shared sprite. `Asteroid.collision()` splits large rocks and increments score. `Text.renderText()` uses locally bundled glyph outlines, not a network font. The jQuery-ready bootstrap builds the collision grid and one `mainLoop()`.

## Gameplay and controls

`Game.FSM.boot` enters `start` directly; no click-to-start screen is required by current code. Left/right rotate, up thrusts, Space fires. P toggles pause, M toggles sound, F displays framerate, G shows the collision grid. The down/H mappings have no corresponding gameplay action found. Touch divs feed the same `KEY_STATUS` map through `ipad.js`.

`start` resets score and gives two spare lives. Clearing all asteroids starts a larger wave after one second, capped at twelve starting rocks. Death consumes a spare life; `end_game` shows Game over and automatically restarts after five seconds. There is no finite win condition or persistent best score.

## State and persistence

Global `Game`, `KEY_STATUS` and `SFX` own state. FSM timers and alien spawning use `Date.now()`; movement uses elapsed time divided by 30. No localStorage/save key occurs in inspected authored files. Pause stops scheduling the next frame, and resume resets `lastFrame`. Audio preloads while muted; `SFX.muted` starts true. Page exit relies on document destruction rather than an explicit lifecycle cleanup.

## Dependencies and provenance

[CREDITS](../../../Games/Asteroids/CREDITS.md) records upstream `https://github.com/dmcinnes/HTML5-Asteroids`, revision `930301cbda83ed3b120f64b801d937d077ee2da0`, and Doug McInnes's MIT notice in [LICENSE](../../../Games/Asteroids/LICENSE). This run checked local notices, not the remote revision or previous byte-comparison claims. Separate WAV/font rights are not individually established by the notice; retain that evidence gap rather than assuming the game-code grant covers every asset.

## Audit findings

- **MEDIUM**, `game.js`, SFX preload at `audio.play()`: pre-gesture playback promises are unhandled and modern autoplay policy may reject them. Recommended repro: fresh browser profile, first load, then M/fire. Root fix: initialize/unlock playback from an actual user gesture and handle rejected play promises; do not infer an audio pass from asset presence.
- **HIGH evidence hold**, `vector_battle_regular.typeface.js`, `original_font_information`: font copyright is distinct from the game author, license fields are empty, and personal contact metadata is embedded. Values withheld. Main must reconcile font terms and redaction policy without discarding required attribution.
- **MEDIUM**, `ipad.js`, `document.elementFromPoint(touches[i].pageX, touches[i].pageY)`: hit-testing uses page coordinates where client coordinates are required. Repro recommendation: scroll until controls move, then hold thrust/fire. Use `clientX/clientY` and add `touchcancel` release at the shared input boundary.
- **MEDIUM**, `index.html`, `.button` divs: touch controls are not focusable native buttons. Preserve the shared key path while giving actions keyboard activation and focus styling.

## Safe iteration

Patch input conversion in `ipad.js`, not every sprite. Preserve the wraparound collision grid, rock splitting, sound/font notices and automatic restart identity. Do not modernize jQuery blindly: `$.browser.mozilla` is a real collision-path dependency. Make any approved fix a separate runtime commit, with rollback by reverting that explicit commit.

## Verification

Actually run: all four JavaScript files passed `node --check` via Git-blob STDIN; no browser, native gameplay or screenshots were produced. Repeat authored syntax with `git show HEAD:Games/Asteroids/game.js | node --check`. Main alone may lease a narrow materialization for real testing. Recommended: thrust/fire, rock splitting and score, three deaths, five-second restart, P/M, simultaneous touch, scroll hit-testing and hidden-tab return. Historical `docs/audit_batches/playtest_p1a.md` references absent Menu/HUD behavior and does not validate this source.

## Future outlook

Week 1: reconcile font rights/contact metadata and repair input coordinate/release handling if reproduced. Week 2: native touch actions and pause/restart accessibility, followed by desktop/mobile image review. Later: bound hidden-tab elapsed time and review audio unlock behavior. A new engine, promotional overlay or replacement artwork is deferred; rights and actual gameplay evidence come first.
