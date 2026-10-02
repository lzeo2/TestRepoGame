<!-- maintenance-game: Games/JetpackJoyrideHacked -->
# Jetpack Joyride Hacked maintenance

## Identity and status

Registered id **107**, category `action`, entry [index.html](../../../Games/JetpackJoyrideHacked/index.html). Baseline `8c8a055`: 417 files, 16,815,820 bytes; entry blob `351b15e272de13fc24b8e55669eaf356918d0861`. Cheat mechanics are intentional. Runtime is read-only for this audit.

## Implementation map

Entry loads `css/styles.css`, Phaser 3.24.1 and `game3.js`, with local `adsbygoogle`/`adBreak` no-ops before the game. Hosts are `#content`, `#phaser-canvas`, `#rotate_image` and `.fontLoader`; local `jetpackia` font resolves beneath CSS's font directory. Atlas/audio assets include extensionless files. The separate audio-directory HTML is empty.

Source review coverage: entire entry and the shared-form style; selected game3 window-load/config/audio/save anchors, including `a0zy`, inspected. The obfuscated 1,196,802-byte game3 and 1,623,651-byte Phaser engine are not fully human-reviewed. Authored hack code is completely read: creates `window.JJ_HACK`, attempts a storage method override, polls for `window.game || window.phaserGame`, then wraps updates for currently registered scenes.

## Gameplay and controls

Hint explicitly documents hold click/tap to ascend and release to descend; keyboard mapping is not established by the HTML. Cheat wrapper forces `scene.coins`, `scene.totalCoin` and `scene.textCoins` where present, disables `scene.player.body.enable`, and hides/deactivates active `coinGroup` children. These property checks do not prove each real scene exposes those fields. Disabling a physics body can affect movement as well as obstacle damage and must be tested, not treated as automatically safe invincibility. Engine owns start/menu/result/retry; wrapper adds no restart button.

## State and persistence

`hookInterval` polls every 100 ms until a global game exists, then wraps scene updates once. It does not handle scenes created after discovery or restore original functions on shutdown. Direct `localStorage.setItem` replacement substitutes scalar `'999999'` for any key containing coin or score, regardless of expected schema. The underlying game's reviewed `a0zy` serializes an object with `coin`/`best_score`; actual decoded save key is unresolved. Settings key `data` is literal. `JJ_HACK` is declared, but no consumer was verified in the compiled bundle; do not claim that flag alone supplies gameplay cheats.

## Dependencies and provenance

No license/README/CREDITS/source pin exists in the assigned directory inventory. Filename versions and familiar game branding are not proof of engine, font or art rights. Keep offline ad no-ops and existing notices; do not reintroduce CDN loaders. [Batch 4](../../audit_batches/batch_4.md) reports live update hooks, but later [playtest r5](../../audit_batches/playtest_r5.md) found no active scenes and two page errors. The evidence conflicts and requires fresh reproduction, not averaging into a pass.

## Audit findings

- **HIGH**, `game3.js`, startup/asset boundary: r5's `Unexpected token '<'` and undefined-length boot errors are historical unresolved failures; current syntax pass does not disprove them. Capture failing response URL/body type and scene activation on both variants; repair the real dependency boundary.
- **MEDIUM**, `index.html`, `localStorage.setItem` override: page-wide substring matching may replace structured saves with a scalar and relies on overriding a Storage instance method. Identify exact keys and use game-specific numeric mutation at the real save boundary. Verify installation/storage contents; preserve intentional high coins.
- **MEDIUM**, same file, `hookInterval` and scene update replacement: discovery is unbounded on failed boot; wrapper ownership and future-scene coverage are absent. Bound polling and tie wrappers to verified scene lifecycle instead of adding another timer.
- **MEDIUM**, same file, `#hack-badge`/viewport/hint: perpetual pulse ignores reduced motion, zoom is disabled and instructions expire. Small authored CSS/help changes are sufficient.

## Safe iteration

Do not remove cheats as a supposed security repair. Change only verified wrapper contracts first, preserving normal game identity and authored hack intent. Any source-level physics alteration needs legitimate source and focused play evidence. No manual obfuscated-bundle editing, asset deletion or broad save-key migration without caller tracing and rollback copies.

## Verification

Actually run: game3 Git blob through `node --check` passed. Native **0**, screenshots **0**. Recommended: capture scene activation and boot requests, confirm update wrappers execute, hold/release to fly, verify physics stays mobile, coin spending/reload and retry after result where available. Inspect actual storage shape and test denied/corrupt storage. Compare with id 86 in separate profiles. Main owns full smoke and subjective visual review.

## Future outlook

Resolve boot and provenance first. Then isolate cheat saves, bound discovery and remove unnecessary badge animation while retaining a clear variant label. Later profile load/CPU on actual hardware; defer new cheats and engine refurbishment until reliable play/source rights exist.
