# Canonical artwork: full-dark CRT sonar dive

Supersedes the rejected paper landing-page interpretation. Existing game 235 only; no new game, catalog changes, release or push.

## Mockup first

The corrected [abyss mockup](../../../../kirrlion-art/ui-mockup-trivia-abyss.png) was generated with codex-imagen and committed as `9ce8759` before this iteration's source edits. Its illustrated seabed is direction, not imported runtime artwork, and its sample question was never added to the dataset.

## Current implementation

- `style.css`: abyss `#050914` / deep `#02040a`, dark panels `#101d33` / `#0a1426`, foam text `#e8f1ff`, 18px system monospace, huge spaced uppercase headings and a single cyan accent `#4de3ff`.
- `ocean.svg`: original full-page depth bands, six-pixel sonar pattern with dashed strokes, suspended particles and angular seafloor. No gradients or third-party assets. Local SVG patterns plus translucent fills/shadows provide the requested texture and halos while preserving the repository's no-gradient constraint.
- `index.html`: edge-to-edge scene behind a transparent depth instrument and dark question panel; no cream paper or inset ocean card. Original depth annotations and guide slot.
- `guide.svg`: original translucent cyan-eyed Glim, not copied reference art. Subtle 2s bob and existing eased depth position remain.
- `script.js`: only visual changes this iteration: depth-dependent original flavour text and a Dim glow / Restore glow control. Both modes remain full-dark. Legacy stored `light` / `dark` values select normal / dim glow respectively; no storage migration or scoring change.
- Core, question, timer, scoring, seed and run-state logic untouched. Runtime remains offline, without fetches, external fonts or new dependencies. System monospace is not claimed to be VT323.

## Verification

`node --check 'Games/Dive Trivia/script.js'`: exit 0.

`node scripts/test_dive_trivia.mjs`: **8 checks passed**, 28 prompts / 4 packs / version 2026.10.1. Core and questions byte-identical to pre-rework HEAD. Python AST / SVG XML syntax and `git diff --check` passed.

`python3 -B scripts/test_kirrlion_art.py`: final run **exit 0**, [machine report](focused-report.json) with source SHA-256 hashes. Four groups:

1. Default abyss background and transparent instrument, sonar muted/toggles and 2s bob.
2. Seven actual input fills plus Enter submissions; depth equals accumulated points ×10; mascot's eased position checked after every score, through completion.
3. Home resets depth; reduced motion disables both bob and transition.
4. Zero console errors or external runtime requests.

The initial focused attempt stopped on an assertion expecting mixed-case `innerText` for a CSS-uppercase label. The checker now uses `textContent` for button labels. No runtime workaround, timer extension or game-state grant was added.

The run used an explicitly pinned system Chromium, a dedicated fresh temporary user-data directory, immediate pre-launch process checks and a 160s work alarm with 10s reserved for cleanup. It ended normally before the bound. Browser/context/server closed and the profile was cleaned. The slot was explicitly released to CITISTEN UI/sim and Wings; no foreign process was stopped.

This focused check is not a fresh full gameplay regression, full fleet gate, real audio audibility test or physical mobile/keyboard/screen-reader acceptance. Prior incomplete paper-theme testing does not accept current source. Live-reference capture and side-by-side remain absent; no visual identity claim.

## Current screenshots

- [Full desktop midgame question](abyss-desktop-midgame-question.png): 3,000m reached through actual answers; desktop view includes surface-to-trench instrument, full-page water bands, scanlines, title and Glim.
- [Desktop launch](abyss-desktop-launch.png), [midgame reveal](abyss-desktop-midgame-reveal.png), [dim glow](abyss-desktop-dim-glow.png).
- [Full-viewport bands/scanlines](abyss-bands-scanlines.png), [glow title](abyss-glow-title.png), [mascot](abyss-mascot.png), [sonar on UI](abyss-sonar-ui.png).
- [390px full-page](abyss-mobile-390-midgame.png), [dim](abyss-mobile-390-dim-glow.png); [320px full-page](abyss-mobile-320-midgame.png), [dim](abyss-mobile-320-dim-glow.png).

Visually reviewed desktop midgame, full-viewport bands and 320px mobile reveal. Desktop now reads as a continuous dark dive, with cyan sonar texture and foam text, rather than a paper page with a blue card. Mobile keeps the full depth column above gameplay and therefore requires scrolling. **The 320px full-page screenshot has a lower-right black raster tile; root overflow check passes, but the image is not clean visual acceptance.** Original captures are retained honestly. A viewport-only recapture is requested after CITISTEN UI's next slot; no source defect or sole renderer root cause is proven.

## Storage and gates

Iteration initial free bytes: **5,053,149,184**. No installs, new browser binaries or out-of-repository deletions. Sparse selection temporarily includes only the existing Dive Trivia folder in addition to its original set; it will be restored after source/inventory checks. Final commit/disk state will be reported separately. No full fleet gate or push performed.
