# Stranded In Isekai maintenance

<!-- maintenance-game: Games/StrandedInIsekai -->

## Identity and status

Registered id 52, category `story`, entry `Games/StrandedInIsekai/index.html`. Baseline `8c8a055`: 46 files, 10,927,434 bytes. Indonesian-language RPG. The November 2026 browser check started the game on map 1.

## Implementation map

Source review coverage: complete entry/CSS/touch adapter, `dialog.js`, README; `flashRPG.js` header/first 220 lines; bounded obfuscated JS engine excerpts around keyboard, title, game loop and gameOver; map/quiz bootstrap excerpts. Remaining obfuscated battle/map logic and archival ActionScript were not fully human-reviewed. Entry loads `map-min.js`, `dialog.js`, `soal_db-min.js`, and `jsRPG-min.js`. The ActionScript file `flashRPG.js` remains in the archive. Inline bootstrap resolves 960-by-640 `#scene`, creates `konten`, and calls `preload(fileGambar,fileSuara,setup)`. `setup()` activates keyboard and title, `startGame()` initializes character, `setMap(1,16,8)`, seven NPCs, then `jalankanGame()`. Important wrapper IDs: `game-wrap`, `scene`, `touch-controls`; buttons have `data-key`.

## Gameplay and controls

Arrows move and Space starts/interacts, supported by `aktifkanKeyboard()` and key flags. Touch adapter dispatches matching keydown/keyup codes through `fire()`; direction buttons are 56 pixels, action 72. `dialog.js` contains village/inn/shop conversations, HP/ATK/DEF/EXP item effects, gold costs and level requirements. Quiz/battle content is supplied by `soal_db-min.js`; detailed answer navigation is not verified here. Title loop waits for Space, then clears its interval and calls the start callback. Engine `gameOver()` removes listeners, resets initial state, clears loop and returns through `setup()`. No invented victory rule or mouse control promise. Audio lists local village/forest/battle/gameover and effect MP3s.

## State and persistence

Obfuscated JS engine exposes `key_space/key_left/key_right/key_up/key_down`, `isActive`, `storyID`, character coordinates, HP/EXP/level/equipment and `enterFrame`. `jalankanGame()` runs `gameLoops` every 0x21 (33) ms; `halamanJudul()` similarly owns title interval. `gameOver()` clears and rebuilds that lifecycle. No localStorage occurrence was found in the inspected JS engine text; there is no verified save/continue key. Touch `pressed` flags are per button; pointercancel/leave release keys, but no window blur reset occurs in the wrapper.

## Dependencies and provenance

Local images and sounds, native Canvas/keyboard events. README credits Daffa Ahmad Ibrahim; archival header spells its name differently, so preserve existing evidence rather than inventing attribution. Bundled LICENSE is Apache-2.0 text, but exact upstream URL/revision and asset-specific grant remain unverified. Entry's old claim that everything is self-contained does not excuse parser errors or missing asset provenance.

## Audit findings

- Resolved in the HTML entry. The browser used to parse archived ActionScript as JavaScript. Only the runtime script tag was removed.
- MEDIUM, `index.html: #touch-controls aria-hidden="true"`: focusable buttons sit inside a permanently hidden accessibility subtree. Remove inappropriate hiding or synchronize it with actual display after keyboard/mobile review.
- MEDIUM, touch `bind()/down/up`: no blur/visibility key release. Native repro recommended: hold a direction, switch tabs, return. Fix shared release path without editing every button separately.
- MEDIUM content-review hold, `dialog.js: talk_3/item_2`: mature sexual references and insults exist in story content. Main/owner must judge age suitability; documentation does not authorize rewriting or removing upstream dialogue.

## Safe iteration

Patch wrapper dependency tag/input lifecycle first, preserving engine/data/art and Indonesian story. Synthetic legacy KeyboardEvents must be tested on actual browsers; do not assume constructor keyCode is universally respected. Any save feature needs a requested schema, not a fabricated current save key.

## Verification

On 26 November 2026, a clean local Chromium session pressed Space at the title screen and observed `mapID === 1` with the player sprite initialized. The browser recorded zero uncaught JavaScript errors, external requests or HTTP errors. Run `python3 scripts/test_arcade_legacy_startup.py --game StrandedInIsekai` to repeat. [Local browser regression](../../../scripts/test_arcade_legacy_startup.py)

Earlier Git-blob audit: `jsRPG-min.js`, `map-min.js`, `soal_db-min.js` exit 0; `flashRPG.js` exit 1 as above. That earlier audit used static checks. Reproduce `git show HEAD:Games/StrandedInIsekai/flashRPG.js | node --check`. Main narrow native lease should test title Space, walk, NPC interaction, shop/quiz battle, death/title restart, touch multi-button release, tab blur and local audio under denied network. Full catalog smoke must report the parser finding without weakening filters.

### Static metadata receipt (2026-10-15)

Only the entry head description changed. Entry/tree matched inventory at `e787681`.
[Metadata checks and exact paths](../audits/fleet-followup-descriptions.md).
No engine audit or gameplay acceptance; source-coverage limits and known holds remain.

## Future outlook

Document upstream asset terms. Next fix accessible touch semantics and key release with a tiny regression. Later document actual battle controls/content suitability. Defer new maps, translated story and save system until existing gameplay/provenance are verified.

The entry now declares its English page language. See the [arcade presentation review](../../verification/arcade-presentation-2026-11-26.md).
