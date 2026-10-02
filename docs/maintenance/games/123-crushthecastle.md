# Crush the Castle maintenance manual

<!-- maintenance-game: Games/CrushTheCastle -->

Source baseline: `8c8a055`. Documentation-only static review, delegation 64.

## Identity and status

Registered ID **123**, category `action`, not featured. Entry: `Games/CrushTheCastle/index.html` ([local entry](../../../Games/CrushTheCastle/index.html)). Tracked tree: **4 files, 9,030,066 bytes**; entry blob `e6d5c7697634c280d64cbc9be4240bb0d0d03b00`. Existing Flash movie hosted through a local Ruffle bootstrap. The four-file tree is locally referenced, but historical native gameplay is held; neither source review nor script parsing establishes a playable movie.

## Implementation map

`index.html` loads `ruffle.js` before registering a window `load` callback. The callback gets `window.RufflePlayer.newest()`, creates a player, assigns `id="player"`, sets width/height to 100%, appends it to `#ruffle`, and calls `player.load("crush-the-castle-36145ed4.swf")`. Ruffle's minified webpack module 931 resolves `c5c02c4e65c1c4423a97.wasm`; the public path is derived from the script URL unless overridden.

**Source review coverage:** full 33-line entry read; Ruffle excerpts for WASM/publicPath, `newest`, `createPlayer`, `load`, diagnostic build identity and localStorage bridge inspected. The 83,706-byte minified emulator is not fully human-reviewed. The 2,351,537-byte SWF and 6,593,880-byte WASM were inventoried, not decoded or executed. No readable gameplay source is present. Diagnostic source identifies Ruffle nightly 2021-12-22 and commit `74ab24c0c3345025a1b7297c526c37783ecc9990`; this is embedded build metadata, not a separately verified upstream checkout.

## Gameplay and controls

The catalog describes trebuchet siege gameplay. Launch/release controls, stage completion and restart are inside the SWF and unknown from this bootstrap; do not infer Space/arrows or a touch scheme from the title. There is no authored start button, score HUD, restart handler or audio control outside Ruffle. Ruffle has its own compatibility/audio gates, and passing those gates is not gameplay. Historical [R8](../../audit_batches/playtest_r8.md) reports dismissing Run anyway but then static movie output despite clicks/keys, AVM2 property errors and a WebGL failure. That environment-specific result needs reproduction rather than a promise that GPU hardware fixes it.

## State and persistence

State and animation are movie/emulator-owned; the wrapper has no storage keys or timers and no teardown hook. Ruffle bridges localStorage to WASM, but neither SharedObject names nor save schema were inspected. Do not delete browser storage while diagnosing a boot defect. `player.load` is asynchronous in the inspected engine; the wrapper neither awaits nor catches it. Retrying should dispose a failed player rather than append multiple copies.

## Dependencies and provenance

The wrapper, Ruffle JS, WASM and SWF are local. Vendor help URLs in Ruffle diagnostics are links, not proof of a runtime external fetch. SWF network behavior remains uninspected. No game-local LICENSE/CREDITS or verified SWF redistribution grant is present; the title's Seraph suffix does not establish author/source rights. Ruffle upstream is identified by diagnostic links at https://github.com/ruffle-rs/ruffle, but this tree lacks a complete shipped license/revision dossier. Do not assign the emulator's expected license to the movie.

## Audit findings

- **HIGH, historical play hold:** SWF / R8 compatibility gate and AVM2 errors prevent demonstrated gameplay. Minimal next step: reproduce on current native browser and real GPU, then consider an owner-approved licensed local Ruffle update; do not bypass warnings or substitute a fabricated game.
- **MEDIUM, silent load rejection:** `index.html` / `player.load` lacks a catch/error UI. Block WASM/SWF to reproduce. Root fix: catch load failure and expose local accessible retry without swallowing engine errors.
- **MEDIUM, sizing:** `#ruffle` uses HTML width/height attributes on a div, while body/root heights are undefined and player uses `height:100%`. Percentage height may not fill the viewport. Confirm computed boxes on 360px/mobile rotation, then set actual host/root CSS height.
- **HIGH, rights evidence gap:** SWF and runtime notices need owner review before publication. Not remedied by the existence of a mirror or historical loading report.

## Safe iteration

Patch only host layout and bootstrap failure handling after approval; retain `#ruffle`, movie URL and matching JS/WASM pair. An emulator replacement must carry verified source pin/notices, remain local and preserve actual movie behavior. Do not hand-edit SWF/WASM or minified internals. Back up any discovered save identity before runtime migration; rollback the approved pair together.

## Verification

**Actually run:** tree/blob inventory, wrapper inline-script and local `ruffle.js` syntax via stdin; both parsed. Native checks and screenshots: **zero**. R8 is historical evidence only, including [its existing screenshot](../../audit_batches/shots_playtest/r8_ctc.png), not newly captured proof.

Sparse-safe syntax: `git show HEAD:Games/CrushTheCastle/ruffle.js | node --check`. For Main's later bounded Git-backed serving lease, include only these four files, verify WASM MIME and no outbound traffic, inspect compatibility dialog, reach the real menu, launch/release a shot, change stage state, fail/retry and reload any progress. Repeat with GPU and software rendering, portrait/landscape and audio gesture. Never treat a changing Ruffle splash as successful gameplay.

## Future outlook

Week 1: rights and compatibility hold. Week 2: approved layout/error repair if reproduced. Week 3: compare a licensed local emulator upgrade only after source/notice validation. Week 4: real-hardware movie interactions and save regression. Defer visual redesign and new launch overlays; they conceal rather than repair the unproven play path.
