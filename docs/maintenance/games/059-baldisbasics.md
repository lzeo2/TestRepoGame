<!-- maintenance-game: Games/BaldisBasics -->
# Baldi's Basics maintenance

## Identity and status

Registered id **59**, category `action`, entry `Games/BaldisBasics/index.html`. Baseline `8c8a055`, entry `57cf9cc89ede0495cbef1a606aeb37a778fd8f88`, tree `a98b1f191bfd75c8a6b8e5f854755435e8be52d3`. Twelve tracked files total 37,508,155 bytes. Catalog offline-play assertions are not newly tested here.

## Implementation map

`index.html` creates `#shell`, `.webgl-content`, `#unityContainer`, `#gameContainer` and full-screen `#loader`. It loads `TemplateData/UnityProgress.js`, then **`baldi.js`**, which is UnityLoader code despite its game-like filename. `UnityLoader.instantiate("gameContainer", "baldi.json", …)` receives `onProgress: UnityProgress` and a `Module.onRuntimeInitialized` callback calling `UnityProgress(gameInstance, "complete")` and `hideLoader()`.

`baldi.json` names Mystman12, product version `1.4.3`, Unity `2019.2.20f1` and WebGL 2/1; the three relative payloads reside under `unity/`. `UnityProgress` creates `gameInstance.logo` and `gameInstance.progress` children, calculates full/empty percentages, and hides both only when numeric progress equals 1. `TemplateData/style.css` provides local Dark progress images and global 100%-size rules; entry CSS overrides aspect ratio to 8:5.

Source review coverage: complete entry, manifest, progress callback and both CSS sources. Selected loader `downloadJob`, `processWasmFrameworkJob`, decompression and IndexedDB paths were read. The 295,410-byte loader and binary Unity data/framework/WASM gameplay were not reviewed in entirety.

## Gameplay and controls

Loading-screen copy says WASD/arrows move, mouse looks, Shift runs, click/E interact and Esc pauses. These are wrapper-stated controls, not verified engine bindings in this audit. Catalog describes school/notebook exploration and pursuit; all interactions, progress, failure and restart are compiled Unity behavior. There is no touch movement pad in the wrapper. Do not infer phone support from viewport metadata or substitute familiar controls for a real play check.

## State and persistence

Authored state is `gameInstance`, loader visibility and dynamically created progress elements. No explicit game save key or gameplay interval appears in the shell. IndexedDB capability probing and Unity cache do not establish persistent notebook/progress saves. `hideLoader()` only changes display; it does not stop Unity. The spinner runs until loader hiding, with no reduced-motion override or failure timeout.

## Dependencies and provenance

Direct boot resources and Dark progress images are tracked. The entry comment claims ingestion from `https://github.com/deploythings123123123/seraph`, abbreviated commit `ae2fcc6`, path `games/baldisbasics`, and credits Mystman12. It describes prior tracker/favicon/Firebase removal. These are source comments, not a newly compared upstream pin or verified permission. No game license file is present. Company metadata and fan/archival language do not clear redistribution rights.

## Audit findings

- **MEDIUM, callback type defect:** `index.html`, `UnityProgress(gameInstance, "complete")`; `TemplateData/UnityProgress.js`, `(100 * progress)` and `progress == 1`. String input yields `NaN%` and misses completion hiding. Minimal root fix is pass numeric `1` or separate completion API; keep all progress calls type-consistent. Static deterministic mismatch, no browser repro run.
- **MEDIUM, geometry conflict:** entry `.webgl-content` declares `top:auto !important` and later `top:50%`, plus `transform:translateY(-50%)`. Important auto overrides centering; computed layout can shift/clamp the game. Fix the competing rule at this shell, then inspect portrait/landscape screenshots.
- **MEDIUM, accessibility/recovery:** viewport disables zoom; spinner has no reduced-motion alternative or authored error state. Restore zoom, reduce animation and route loader failure into readable status.
- **HIGH, rights hold:** game payloads have no verified permission evidence. Keep the claimed mirror revision distinct from a licensed source pin.

## Safe iteration

The smallest approved patches are typed progress completion and consistent shell centering. Preserve 8:5 content and original menu/art. Do not edit `baldi.js` as though it were gameplay source or replace build blobs. Keep loader/manifest pair intact and rollback wrapper/progress changes together.

## Verification

Actually run: Git resource inventory, manifest parsing, `node --check` through stdin for `baldi.js`, `UnityProgress.js` and entry executable script; passed. Native runs **0**, screenshots **0**.

Reproduce: `git show HEAD:Games/BaldisBasics/TemplateData/UnityProgress.js | node --check`. Recommended Main-approved HTTP lease: inspect numeric completion styles and computed top, wait for menu, play a notebook interaction, test pursuit/failure/restart, pause/resume and audio. Resize/mobile screenshots, denied storage and offline request capture are additional checks, not completed results.

## Future outlook

Rights and progress/centering fixes first. Next verify the loading-screen controls against actual engine input and make the shell readable without motion. Month work should prove failure/restart and hardware performance; touch controls require actual engine support and are deferred rather than promised.
