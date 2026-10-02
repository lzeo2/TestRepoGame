<!-- maintenance-game: Games/JetpackJoyride -->
# Jetpack Joyride maintenance

## Identity and status

Registered id **86**, category `action`, entry [index.html](../../../Games/JetpackJoyride/index.html). Baseline `8c8a055`: 417 files, 16,813,585 bytes; entry blob `1ffc7179f0439c8105886718dcd7afd713c4ab7e`. Existing vendor-based runner; this page does not certify redistribution or actual play.

## Implementation map

Entry loads `css/styles.css`, `engine/phaser-3.24.1.min.js`, local ad no-ops and `game3.js`. `#phaser-canvas` is the canvas host, `#rotate_image` the initially hidden orientation prompt, `.fontLoader` primes `jetpackia`. CSS resolves the font from `css/font/Jetpackia.ttf`. Assets are spread across `assets/atlas`, `assets/audio` and image/font resources, including extensionless files. `assets/audio/index.html` is an empty directory entry, not gameplay bootstrap.

Source review coverage: full entry/style/audio-index; selected obfuscated `game3.js` window-load/config, audio decode and storage anchors read. The 1,196,802-byte game bundle and 1,623,651-byte Phaser engine were not fully human-reviewed or deobfuscated. `a0zy()` writes a JSON record containing `coin` and `best_score`; key lookup remains behind `a0zQ`. Historical reports identify scene names PrePreload/Preload/Splash/GamePlay/Result/Setting/Language/Credit/Transition, but their entire lifecycle was not retraced here.

## Gameplay and controls

Wrapper explicitly documents holding tap/click to fly upward and releasing to fall; the hint disappears after ten seconds. No authored keyboard handler is in this HTML, so keyboard behavior belongs to the unread obfuscated engine. Historical [playtest r4](../../audit_batches/playtest_r4.md) observed touch-anywhere menu, click/Space start, distance growth and pointer flight, but did not reach death/restart. Those observations are not a fresh native pass. Mechanics and result/retry UI must be verified in the engine, not inferred from the franchise title.

## State and persistence

Phaser owns scenes and animation; window-load constructs the game from `config`. The reviewed save function serializes coins/best distance, and a settings read uses literal key `data` with a `bgm` field. Exact coin-save key remains unresolved because it is decoded dynamically. Direct JSON parsing appears in those anchors; corruption robustness needs source-level review. The wrapper owns only hint timeouts. There is no wrapper save export/reset or verified scene shutdown path in this review.

## Dependencies and provenance

Phaser version is pinned by filename, not verified against an upstream revision. Ad surfaces `window.adsbygoogle.push` and `window.adBreak` are intentionally inert; the latter does not invoke callbacks, which may matter if engine flow waits on completion. This is a triage question, not a proven hang. `splash.jpg` and root favicon are wrapper references; local title/icon paths do not prove dependency closure. No README/LICENSE/CREDITS is tracked within this directory. Original game rights, art/font rights and mirror revision remain unknown. Preserve vendor content pending source verification.

## Audit findings

- **HIGH**, `game3.js`, boot/asset boundary: historical r4 recorded non-fatal `Unexpected token '<'`; id 107's r5 failed boot with that plus undefined length. Current JS parses, but endpoint/source was not isolated. Reproduce while recording response URL, status and content type; fix the actual asset/loader contract rather than suppress page errors.
- **MEDIUM**, `index.html`, viewport/controls hint: prohibits zoom and removes only instructions after ten seconds. Permit zoom and expose persistent help without masking the game menu.
- **MEDIUM**, `game3.js`, localStorage/JSON read anchors: no reviewed schema/catch at those reads. Verify corrupt settings/save behavior; repair the save boundary from legitimate source, not by scattered try/catches in wrappers.

## Safe iteration

Start with authored viewport/help and explicit local ad callback contracts after tracing all callers. Do not edit obfuscated bundle or Phaser manually. Assets have constructed/extensionless references, so absence from simple grep is not deletion evidence. Preserve engine start/menu/result behavior and consult the hacked pair before save migration.

## Verification

Actually run: `git show HEAD:Games/JetpackJoyride/game3.js | node --check` passed. Git inventory reviewed; native **0**, screenshots **0**. Recommended supervisor-approved narrow checkout: record boot through active scene, response content types, menu start, press/release pointer flight, eventual failure, result/retry and reload persistence. Test portrait/landscape, denied storage and audio-disabled device. Compare both variants without claiming software-rendered screenshots establish hardware performance. Main owns full catalog smoke.

## Future outlook

First isolate historical boot parse errors and establish source/rights. Next persistent accessible controls, orientation messaging and storage recovery. Later measure load time and memory on target hardware before compressing/removing assets. Defer stronger engine changes, online services and new art.
