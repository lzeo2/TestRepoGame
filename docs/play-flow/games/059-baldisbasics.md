# Baldi's Basics — play-flow audit (batch 1)

- Identity: catalog id 59, registered. `Games/BaldisBasics/`, entry
  `Games/BaldisBasics/index.html` (blob `57cf9cc89ede0495cbef1a606aeb37a778fd8f88`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 12 files / 37,508,155 B.
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully, including the provenance comment:
  fan-hosted Unity WebGL port (companyName "Mystman12", v1.4.3) vendored from
  `github.com/deploythings123123123/seraph` branch main commit `ae2fcc6`;
  gtag, absolute `/js/main.js`, tab-cloak script, remote `ico.ico` favicon and
  unused Firebase SDK removed; compiled wasm/data claimed to contain only inert
  strings with no runtime fetches (claim in comment, not re-verified here).
- Wrapper structure: `#shell` → `.webgl-content` → `#unityContainer` (960x600)
  → `#gameContainer`; `#loader` with `.spinner`, h1, and
  `p.controls` ("WASD / arrow keys move · mouse to look · Shift run · click or
  E interact · Esc pause"); inline script calls
  `UnityLoader.instantiate("gameContainer", "baldi.json", {onProgress: UnityProgress,
  Module: {onRuntimeInitialized: ... hideLoader()}})`.
- Compiled engine files **not inspected** (binary/compiled): `baldi.js`
  (Unity loader, blob `ef6e42fc`), `baldi.json` (blob `780f57b5`),
  `unity/baldi.data.unityweb` (10bf333a), `unity/baldi.wasm.code.unityweb`
  (ac0e13d6), `unity/baldi.wasm.framework.unityweb` (381105dd),
  `TemplateData/*`.

## Flow (wrapper visible; engine UNKNOWN)

- Boot: `UnityProgress` load bar → `onRuntimeInitialized` → `hideLoader()`
  reveals `#gameContainer`.
- Start/setup, input, core loop, score/progression, win/lose, restart:
  **UNKNOWN pending engine/runtime review.** All mechanics live in the compiled
  Unity build. The controls sentence above is wrapper copy authored for the
  loader screen; it has not been confirmed against engine input bindings.

## UI bloat: NONE (wrapper)

- `#loader` is a genuine loading screen (spinner + one controls line) and is
  removed on load. No extra cards, badges, or description blocks in the
  authored shell.

## Popups / modals

- None authored. In-game menus/pauses are engine-side, held.

## Animation / simulation

- Loader spinner is CSS (`spinner-spin` keyframes); gameplay rendering is the
  opaque Unity wasm build. No game loop exists in authored source.

## Findings

- MEDIUM — compiled-engine gap: no source-level evidence for controls,
  progression, pause or restart. Smallest needed check: runtime browser pass
  through the loader into a session (and wasm/network trace if offline claims
  matter).
- LOW — loader controls copy could drift from actual engine bindings; root:
  `index.html` `#loader p.controls`. Verify before trusting it as documentation.

## Recommended playable view

The authored shell is already minimal (loader + canvas). In-engine HUD/menu
decisions require the runtime review; no authored text to relocate beyond the
single controls line.
