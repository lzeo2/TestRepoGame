# A Dark Room maintenance

<!-- maintenance-game: Games/ADarkRoom -->

## Identity and status

Registered id 51, category `story`, entry `Games/ADarkRoom/index.html`. Baseline `8c8a055`: 180 files, 7,141,869 bytes. This is a local text-adventure source tree, not a compiled replacement. Entry says v1.4 while `Engine.VERSION` is 1.3; distinguish presentation version from save migration version.

## Implementation map

Source review coverage: full entry, engine, Button, header and prestige; state-manager initialization/get/set/migration/income through line 400; bounded Room fire, World controls/arrival and Space lifecycle excerpts; main CSS framework/button rules. Remaining event/story content, translations, audio engine, other modules/styles and vendor libraries were inventoried or sampled, not fully reviewed. Scripts load local jQuery/swipe/Base64/translation first, then engine/state manager and Room/Outside/World/Path/Ship/Space/Fabricator/events. `engine.js` ready callback calls `Engine.init()`, loads saved `State`, initializes modules and travels to Room. Anchors: `#wrapper`, `#main`, `#header`, `#outerSlider`, generated `#locationSlider`, `#saveNotify`, `#lightButton`, `#stokeButton`. `$SM` is the shared state API; `Header.addLocation()` creates navigation and `Button.Button()` creates cooldown-controlled actions.

## Gameplay and controls

Room begins with fire actions; `lightFire()` costs five wood when available, `stokeFire()` consumes one and raises fire state. Builder/resource progression unlocks Outside and equipment/World travel; engine initializes Path when a compass exists. World supports arrows/WASD and directional swipes, with food/water consumption and temporary expedition state committed upon returning home. Space supports held arrows/WASD for ship movement and has explicit end/crash cleanup. Buttons are clickable divs rather than native buttons. Engine menu supplies sound, lights, hyper mode, restart and save export/import. Do not invent a short arcade win condition for the long narrative progression.

## State and persistence

`localStorage.gameState` stores JSON `State`; `lang` stores locale. `$SM` categories include features/stores/character/income/timers/game/playStats/previous/outfit/config/wait/cooldown. `set/add/setM/addM` invoke `Engine.saveGame()` unless `noEvent`; migration moves older branches to version 1.3. `Button.cooldown()` persists `cooldown.<DOM id>` and owns a countdown interval cleaned by `clearCooldown()`. Room owns fire/temp/builder timeouts; income reschedules through `Engine.setTimeout`. Space clears its intervals and several global module timers on ending. `Prestige` carries previous stores/score across restart. Export is Base64 of JSON; import writes decoded text then reloads, without validation.

## Dependencies and provenance

Entry credits Michael Townsend and links `https://github.com/doublespeakgames/adarkroom/`; local `LICENSE.md` is MPL-2.0. No exact upstream revision was established. Local audio assets/library and translated strings have separate attribution/asset review still needed. `ga` calls are conditional and no analytics loader appears in inspected entry; app/share/GitHub links are user initiated. Locale script paths are whitelisted using `langs[lang]`; `document.write` exists but that guard prevents arbitrary locale path construction in the reviewed branch.

## Audit findings

- HIGH, `script/engine.js: deleteSave()`, `localStorage.clear()`: restarting deletes every origin key, including portal favorites and other games' saves. Root fix removes only owned game keys, then restores Prestige as intended. Recommended native repro uses a harmless unrelated sentinel before confirming restart; not run here.
- HIGH, `engine.js: import64()`: invalid decoded JSON replaces a working save before reload. Validate JSON/schema before write and retain backup; guard quota/storage errors in import/save paths.
- MEDIUM, `Engine.init()/isMobile()`: mobile user agents redirect to `mobileWarning.html`, absent from tracked tree. Browser rejection similarly targets missing `browserWarning.html`. Root fix supplies honest supported-layout feedback or approved responsive support; do not silently claim mobile play.
- MEDIUM, `Button.Button()` and `Header.addLocation()`: core actions/navigation are unfocusable clickable divs. Fix shared constructors, preserving cooldown semantics and visible focus.
- MEDIUM triage, `state_manager.js: buildPath()/eval`: dynamic path evaluation is a CSP/maintainability boundary; no exploit is asserted from the word eval alone. Trace imported/dynamic keys before replacing with a bounded property walker.

## Safe iteration

Fix destructive persistence at shared engine functions, not each menu/event caller. Preserve version migration, Prestige and upstream story. Avoid global storage deletion in tests. Responsive work must respect the engine's hardcoded 700-pixel slider arithmetic, not merely shrink wrapper CSS. No license/asset changes or whole-engine rewrite authorized.

## Verification

Actually run engine Git blob through stdin `node --check`, exit 0; no browser/screenshots. Repeat with `git show HEAD:Games/ADarkRoom/script/engine.js | node --check`. Recommended Main native lease: light/stoke, cooldown reload, unrelated-storage sentinel, valid/invalid import rollback, language whitelist, sound unlock, mobile redirect, World return/death and Space lifecycle. Separate long-progression testing from the full-catalog loading gate.

## Future outlook

First repair save isolation/import validation with one runnable regression. Next close missing warning routes and shared keyboard semantics. Later audit audio/translations and native long-progression save migration. Defer new narrative content and network/cloud save until explicitly requested and licensed.
