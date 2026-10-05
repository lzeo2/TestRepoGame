# Bloons TD — play-flow audit (batch 1)

- Identity: catalog id 80, registered. `Games/BloonsTD/`, entry
  `Games/BloonsTD/index.html` (blob `1e424c632ae139ba04f5e9132966f6dff1258229`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 9 files / 5,918,198 B.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- Entry `index.html` (blob above), read fully: a launcher menu — `h1` "Bloons
  Tower Defense" plus `.game-list` with four links: `btd/index.html`,
  `btd2/index.html`, `btd3/index.html`, `btd4/index.html`.
- Sub-page wrapper `btd/index.html` (blob `17758bc280dea934ac6606858e6f925698b5dfaa`),
  read fully (siblings `btd2` 2b8f1b2c, `btd3` c6d44cfd, `btd4` 62d87472
  share the same pattern per structure): `#ruffle` container, then
  `window.RufflePlayer.newest()` → `ruffle.createPlayer()` →
  `player.load({ url: "btdN.swf", autoplay: "on", splashScreen: false,
  unmuteOverlay: "hidden", backgroundColor: "#000000" })`, loading
  `../../../storage/ruffle/ruffle.js`.
- Verified at baseline: `storage/ruffle` tree exists
  (`git ls-tree 5be686e storage/` → `storage/ruffle`), so the relative script
  path resolves inside the repository.
- SWF binaries (`btd/btd.swf` 644f6ffc, `btd2` bf66b040, `btd3` 9e6c25c2,
  `btd4` 20e6e160): **not inspected** (compiled Flash).
- Held: `storage/ruffle/` runtime internals (outside assignment directory).

## Flow (wrapper visible; engine UNKNOWN)

- Boot: launcher → sub-page → Ruffle loads the SWF with `autoplay: "on"` (no
  click gate) into `#ruffle`.
- Start/setup, input, core loop, tower placement, scoring, win/lose, restart:
  **UNKNOWN pending engine/runtime review.** Flash mechanics must not be
  inferred from the title; they live inside opaque `.swf` files.

## UI bloat: MILD (launcher) / UNKNOWN (engine)

- Launcher page: `h1` + four menu links — genuine navigation menu, no extra
  copy. No popups.
- Sub-pages: authored chrome is only `#ruffle`; Ruffle's own overlay is
  configured minimal (`splashScreen: false`, `unmuteOverlay: "hidden"`).
  In-SWF menus/HUD held.

## Popups / modals

- None authored. `autoplay: "on"` starts sound without a gesture — note for
  review (browser autoplay policies may block audio; untested here).

## Animation / simulation

- Opaque: Ruffle wasm renders the SWF. No authored loop in this directory.

## Findings

- LOW — `autoplay: "on"` skips the play gate; if audio-blocked or unexpected
  on load, switch to a click-to-play start. Root: each `btdN/index.html`
  `player.load(...)` options.
- Held — Ruffle runtime and all four SWFs uninspected; smallest needed check:
  open one sub-page in a browser and confirm load + input + round end.

## Recommended playable view

Launcher menu is already minimal; keep it. Sub-page decisions (overlays,
sound) belong to the shared Ruffle/Flash review; no authored text to move.
