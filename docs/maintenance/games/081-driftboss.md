<!-- maintenance-game: Games/DriftBoss -->
# Drift Boss maintenance

## Identity and status

Registered id **81**, category `action`, entry `Games/DriftBoss/index.html`. Baseline `8c8a055`: entry `95d27e34e09c3ee131f258f34cf1d001c082854e`, tree `beee086ddf746edeb15eafa1f8440821250150a3`. Ninety-seven files total 7,539,147 bytes. Existing combined Impact/Babylon build; documentation-only audit, not a fresh native verdict.

## Implementation map

Entry loads `game.css` and `game.js`; `#game/#canvas` supplies Impact UI and `#webgl/#webglcanvas` Babylon rendering. `#orientate` contains landscape artwork; `#play` cover exists but entry CSS forces both `#play` and `#play-desktop` hidden. A 12-second `#controls-hint` overlays the game. `unlock()` attempts `ig.webaudio_ctx.resume()` once on pointerdown/keydown. `dismiss()` hides hint after 600 ms and is invoked by timeout, key/touch or its dismiss span.

Selected bundle launch calls `ig.main('#canvas',MyGame,60,…,ig.SplashLoader)` and `wgl.webglmain('#webglcanvas',60)`. `MyGame.init` constructs IoManager/storage and finalizes; `startIfBabylonReady` polls at 500 ms until WebGL game readiness. Scene/controller anchors include `EntityMainMenuController`, `EntityGameOverController`, `EntitySelectBoostersController`, `goToLevel` and `getLevelID`. These distinguish real menu UI from the disabled HTML cover.

Source review coverage: complete entry/inline CSS and `game.css`; selected launch, input, storage manager, MyGame state, daily rewards, menu/game-over and car-direction paths. The 4,582,907-byte bundle includes vendors and readable baked modules, but was not fully human-reviewed; Babylon geometry/physics, all entities/audio/art/font terms remain uninspected. Vendor metadata containing personal contact data was not copied into docs.

## Gameplay and controls

Wrapper hint says hold tap/click/Space to drift, release to drive straight. Source corroborates `ig.input.bind(ig.KEY.SPACE,'space')`; gameplay/tutorial set car direction from `isClicking` with touch Y thresholds or `ig.input.state("space")`. This does not mean Space starts the main menu. Selected game-over controller has home/restart artwork and menu controller has real play/settings/car-selection entities. Score and collected coins are engine state. A full fall/failure/restart sequence has not been newly verified.

## State and persistence

`MyGame.name="mjs-drift-boss-game"`, version `1.0.2-dailyreward`. Storage manager forms **`mjs-drift-boss-game-v1.0.2-dailyreward`** via name + `-v` + version. State defaults include sound/music, score, tutorial flags, coins, cars/current car, tips, boosters and KO count. Daily reward key is **`mjs-drift-boss-dailyreward`**. `loadAll` merges stored fields into sessionData; `saveAll` updates keys already present in stored data, which is a migration-sensitive behavior.

IoManager probes storage with a `test` key and chooses `ig.FakeStorage` on failure. Two baked modules define `ig.Storage`; both parse JSON then return raw text on parse failure. That fallback does not validate save shape. `pauseGame`/`resumeGame` call Impact stop/startRunLoop; never layer another animation loop over these.

## Dependencies and provenance

Entry/bundle/CSS use local media and bundled Babylon/Impact/Howler/jukebox/physics components. CSS defines `mainfont.ttf`; some legacy ad/debug/Flash styles remain but are not proof they run. Bundle metadata identifies cannon.js 0.6.2 and its source `https://github.com/schteppe/cannon.js`; that licenses neither the full game nor other assets. No verified game source revision or full-game redistribution permission was established. `Seraph` title suffix is not legal evidence.

## Audit findings

- **MEDIUM, dead dismiss control:** `index.html`, `#controls-hint{pointer-events:none}` applies to the parent; dismiss span does not re-enable pointer events and is not keyboard-focusable. Its click listener cannot offer normal pointer activation. Root fix: real button with `pointer-events:auto`, visible focus and 44px target, leaving the rest of hint click-through.
- **MEDIUM, misleading boot copy:** entry comment says game starts on load; source has a distinct main-menu controller. Rewrite guidance after native play evidence; no automatic gameplay claim.
- **MEDIUM, corrupt-save risk:** `game.js`, both `ig.Storage.get` definitions return raw text after JSON parse failure, `loadAll` merges arbitrary fields. Root fix: validated object restore in storage manager, retaining backup/defaults and both duplicate storage definitions in review.
- **HIGH, privacy/provenance hold:** baked cannon metadata includes personal contact information; rights/source notices must be reviewed by Main without copying private data. Do not hand-edit vendor notices under this docs task.
- **Historical play hold:** `docs/audit_batches/playtest_r4.md` reports menu rendered but play input did not start gameplay. Current source still has menu/controller/input layers; exact coordinate/lifecycle cause was not reproduced here. Trace EntityButton hit mapping and scene transition before assuming the cover fix solved it.

## Safe iteration

Prefer the hint's authored HTML/CSS and accurate copy. Menu/input diagnosis belongs at existing button coordinate mapping/scene transition, not another splash. Preserve both canvas coordinate systems, rewards and save keys. Storage migration must add defaults without overwriting user data. No compiled vendor rewrite or new assets.

## Verification

Actually run: Git inventory/anchors, stdin `node --check` on `game.js` and entry script; passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/DriftBoss/game.js | node --check`.

Recommended Main-approved HTTP lease: compute menu button bounds against both canvases, enter gameplay, hold/release pointer and Space, fall/restart, save/reload car/coins, corrupt-save recovery, denied storage, audio and orientation. Record actual input-driven state, not animated menu pixels. Full catalog gate is separate.

## Future outlook

First resolve rights/privacy and reproduce the held menu-start issue. Next fix the small hint accessibility defect and validate save migration. Month work should profile dual-canvas hardware rendering and test pause/resume/reward lifecycle. New cars, ad services and broad engine refurbishment are deferred.
