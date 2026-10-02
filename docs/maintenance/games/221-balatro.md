<!-- maintenance-game: Games/Balatro -->
# Balatro maintenance

## Identity and status

Registered id **221**, category `card`, not featured. Entry `Games/Balatro/index.html`; baseline `8c8a055` has 3 files and 5,062,742 bytes, of which 5,061,324 bytes are the GBA ROM. This is a GBA fan demake wrapper, not a native HTML5 implementation of the commercial game. ROM/software/art redistribution clearance remains an owner rights gate. No game, license or registration changes are authorized by this page.

## Implementation map

Source review coverage: complete HTML and CREDITS; full shared `Games/_emulatorjs/data/loader.js` and `storage.js`; bounded `emulator.min.js` extracts for GBA core selection, settings and IndexedDB storage. The **295,773-byte** minified emulator was not human-reviewed in entirety. ROM instructions, core binaries and game internals were not inspected or executed; this is bootstrap/storage-boundary review, not engine certification.

HTML provides full-viewport `#game` and sets `EJS_player`, `EJS_core="gba"`, `EJS_color`, `EJS_startOnLoaded=true`, `EJS_pathtodata="../_emulatorjs/data/"`, and `EJS_gameUrl="balatro-gba-0.2.2.gba"`. The local loader normally appends `emulator.min.js` and `emulator.min.css`, maps window globals into config, then constructs `window.EJS_emulator = new EmulatorJS(EJS_player, config)`. Reviewed core lookup maps GBA to mGBA. Git confirms the two minified dependencies and `cores/mgba-wasm.data` are tracked; this does not verify every transitive core request.

## Gameplay and controls

The wrapper requests automatic startup after loading and delegates all menu/gameplay/input/reset behavior to EmulatorJS and the ROM. No keyboard mapping, touch layout, hand-scoring function, blind progression or end condition is specified in this HTML. Catalog describes a poker roguelike, but this worker did not verify those mechanics in the binary. Do not document familiar commercial-game controls as if they were this demake's verified bindings. Recommended play verification must observe the emulator's mapping UI and actual ROM menus.

## State and persistence

No game-specific localStorage key or save callback is configured by the wrapper. Reviewed emulator settings code writes `ejs-settings` and `ejs-<core>-settings`; it owns controls/settings/cheats and volume/mute, not demonstrated ROM progress. `EJS_STORAGE` uses IndexedDB with constructor-supplied database/store names and `?EJS_KEYS!` as its key index. The exact database names, ROM save identity, battery-save support and export/restore behavior were not traced here. There is no wrapper pagehide cleanup or game-specific reset handler.

## Dependencies and provenance

[CREDITS](../../../Games/Balatro/CREDITS.md) cites `https://github.com/OutBlade/balatro-web`, short revision `3c8cf43`, and `https://github.com/GBALATRO/balatro-gba` version 0.2.2. It claims MIT ROM terms and a SHA-256 prefix comparison, but the directory has **no LICENSE** and no pinned demake source revision/full artifact digest. These remain claims in inherited evidence, not independently verified permission. The page also distinguishes commercial Balatro ownership from its unofficial demake. Emulator/component notices live in the shared tree and cannot authorize ROM or commercial assets by themselves. Existing `docs/GAMES.md` says MIT LICENSE is shipped; current Git inventory contradicts that statement.

## Audit findings

- **HIGH evidence hold**, `CREDITS.md`, `License: ROM is MIT`: license file/full pinned source and complete artifact verification are absent locally. Impact: reproducibility/rights cannot be certified. Minimal next step is owner-led evidence reconciliation, not a new license label or deletion.
- **MEDIUM**, shared `loader.js`, `loadScript`/`loadStyle`: promises resolve on load but have no error rejection or timeout. Missing local dependency can leave bootstrap pending without useful failure feedback. Repro recommendation: abort a minified dependency request in a browser. Fix centrally under the shared-runtime owner's lease, not in this wrapper alone.
- **MEDIUM**, shared `storage.js`, `put`/`remove` open-request `onerror`: handlers do not settle the returned promises. Storage-denied failures can hang callers. The same pattern was confirmed in minified runtime extracts. Fix both authored/build source paths through the runtime owner and validate denied IndexedDB.

## Safe iteration

The small wrapper is the appropriate patch point for truthful loading/help/return controls. Core/storage fixes affect sibling games and belong to Main/shared-runtime ownership. Do not hand-edit the minified bundle, alter the ROM, fabricate a license, swap remote emulators or delete shared infrastructure. Preserve configured ROM URL until the owner decides rights disposition.

## Verification

Actually run: inline configuration passed STDIN `node --check`; Git existence checks confirmed stated local loader/minified/core paths. No native/browser test, save test or screenshot was produced. Repeat inline extraction with Python's HTMLParser and `node --check`; this checks syntax only. Main must lease minimal ROM/core closure for recommended native checks: local-only boot, observed controls, playable hand, reset, save/export/reload and denied-storage fallback. A full catalog loading gate still cannot certify ROM gameplay or rights.

## Future outlook

Week 1: reconcile demake license/pin/digest and stale HTML5 claims. Week 2: shared loading/storage error handling plus documented observed controls after actual play. Later: profile core startup/memory and persist/export behavior on target hardware. No new ROM, commercial artwork, multiplayer or engine rewrite is proposed without separate permissions and source evidence.
