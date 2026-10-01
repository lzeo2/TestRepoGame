# Foldwild view-only handoff (delegation 28)

This milestone is a drawing layer and HTML/CSS contract, **not a complete game**.
`index.html` intentionally references the integration worker's future `./script.js`.
No entry-module placeholder, save system, battle rules, catalog registration or
release gate is included. Future catalog ID remains unresolved. View source uses
only the existing local Three.js r160 / GLTFLoader and supplied roster models.
No supplied model bytes, vertex RGB, geometry or materials are replaced.

## View API

```js
import { createView } from './view.js';
const view = createView(canvas, { onCheckpoint: id => approach(id), reducedMotion });
await view.showWorld({ region: 0, position: { x: 0, z: 4 }, points });
// Core owns movement and the sole requestAnimationFrame loop:
view.setPlayerPosition(x, z, yaw);
view.render(dtSeconds);
view.resize();
// Before switching to battle:
await view.showBattle({ playerSpeciesId, enemySpeciesId });
view.animateAction({ type: 'ability', side: 'player' });
view.setReducedMotion(true);
const stats = view.inspect();
view.dispose();
```

The factory is synchronous and throws a descriptive error if WebGL 1 construction
fails. Core can then retain an accessible 2D UI; that is not evidence of GLB success.
`showWorld` and `showBattle` resolve `Promise<void>` even when individual models
fail. Check `inspect().fallbackModels` and `loadedModels`, not just resolution.
Each failed model produces a clearly disclosed primitive marker and writes the
reason to `#message`. Core must not overwrite that diagnostic with a model-pass
claim. A new scene clears current-scene statistics; stale requests cannot attach
models or overwrite diagnostics after scene replacement or disposal.

World points are `{id,x,z,type,speciesId?,label?}`. IDs can be strings or numbers;
coordinates must be finite and on the 28 × 20 ground. Types are `wild`, `rival`,
`camp`, `exit`. At most three wild models and one anonymous primitive rival are
drawn. Camp and exit pads are geometry, not 3D text. Core uses `label` to populate
`#nearby-actions`; view does not rasterize labels or mutate encounter state.
Pointer down/up raycasts through the CSS client rectangle, with a 44px minimum
screen hit area around visible ground markers. A drag over 8px is not a tap.
Callbacks only select a checkpoint; core decides movement and proximity.
No view-owned animation loop or persistent resize listener exists.

The world camera follows behind the player (height 5, distance 8) and looks at
player height 0.7. `yaw=0` looks toward negative Z; player position does not change
on pointer input. Reduced motion follows instantly and suppresses action effects.
Battle positions are X ±1.8, facing each other; camera is `(0,3,7)` looking at
`(0,0.6,0)`. Supplied creature bounds are measured with `Box3`, centered and
floor-aligned without rewriting source geometry. Basic creatures frame to a 1.45
maximum extent, stage-three silhouettes to 1.95 and bosses to 2.65, with scale
clamped to 0.25–5. Source matte vertex-colored materials remain intact.

Ability zoom is 3 degrees out of 45 (under 10%) for 0.2 seconds. Hits use a tiny
opaque amber floor flash, not emissive recoloring. Capture sends an original opaque
triangular paper Latch Kite with a wedge tail from player to enemy over 0.45 seconds.
No sphere, legacy capture asset, shake, bloom, shader water or physics framework.
Three region palettes are root meadow, sand/flat blue-water estuary, warm-stone
ridge. Trees reuse geometry. Rendering uses DPR 1 with a maximum drawing buffer of
1280 × 720 while preserving the CSS aspect ratio. 60 fps is a target, not a measured
benchmark. Render statistics are snapshots of the last core-driven frame.

The promise cache is a 12-entry `Map` with LRU eviction. Clones share source
geometry/materials. Retired resources are disposed only after their last active
or pending clone reference releases; scene resets release each reference, including
mirror matches. Loads are lazy: only requested on-screen species are fetched, never
the 80-model roster. `OPTIONAL_HIDDEN_SPECIES` is currently `null`; no hidden GLB
request or invented species/name/stats is generated. A future non-null descriptor
with a string `id` and valid local `models/...glb` path can be displayed when
explicitly requested. Gameplay validation (including unique stats) belongs to data
and core, not the view. Hidden availability does not affect ordinary loading.

## HTML integration contract

- Menu: `#menu`, `#start`, initially hidden `#continue`, three
  `[data-starter=cindupp|dewgob|pithnip]` buttons, `#starter-description`.
  Cindupp starts `aria-pressed=true`. Core implements selection, button state,
  description updates and start/continue; no second script handles these controls.
- World: initially hidden `#world-hud`, `#zone-name`, `#score`, `#dex-count`,
  `#kites`, `#save-state`; `[data-region=0|1|2]`; `#nearby-actions`, `#interact`,
  `#rest`, `#collection-btn`, `#pause`, `#new-run`, `#world-help`, `#team-list`.
  Core may hide `.play-layout` during the menu or reveal it for a live view.
- View: `#game-canvas`; `#message` is a polite live status. Core installs keyboard
  input and calls `resize()` whenever the canvas layout changes.
- Battle: initially hidden `#battle-panel`; `#player-name`, `#enemy-name`,
  `#player-hp`, `#enemy-hp`, `#player-energy`, `#enemy-energy` are **text spans**;
  the matching `*-bar` elements are native progress bars. Core writes both text
  and progress `value`/`max`. `#player-status`, `#enemy-status` are text nodes.
  Buttons `#ability-0`–`#ability-3` have `[data-slot=0..3]`; `#capture`, `#wait`,
  `#flee`, `#switch-list` complete the controls. `#battle-log` is an ordered list;
  append text-only `li` entries. Core updates ability labels and disabled state.
- Result: initially hidden `#result`, `#result-title`, `#result-description`,
  `#result-continue`. Campaign victories and outcomes belong to core.
- Native dialogs: `#dialogue-dialog` with `#dialogue-title`, `#dialogue-text`,
  `#dialogue-start`, `#dialogue-cancel`; `#collection-dialog` with
  `#collection-list`, `#collection-close`; `#reset-dialog` with `#reset-confirm`,
  `#reset-cancel`. Core uses `showModal()`/`close()` and confirms before data reset.
- `#reduce-motion` is labeled; core initializes it from `matchMedia` and persisted
  preference, then calls `setReducedMotion`. CSS also honors reduced motion.
- Skip link targets `#controls`. All buttons/links have 44px minimum targets;
  local Bungee headings / Atkinson body, cream, steel-blue, amber accents,
  black/white actions, 6px panels and 4px controls. No remote runtime resources.

## Isolated verification

```sh
node --check Games/Foldwild/view.js
python3 -c "from pathlib import Path; compile(Path('scripts/test_foldwild_view.py').read_text(), 'scripts/test_foldwild_view.py', 'exec')"
python3 scripts/test_foldwild_view.py
git diff --check
```

The runner creates a bounded temporary root server and a separate frame harness;
it never loads unfinished `index.html` or the missing integration entry module.
Browser/server cleanup is in `finally`. All external requests are blocked.
Tests cover lazy three-model loading, basic/boss battle framing, all three region
palettes, cache eviction/re-use and mirror matches, stale loads, frame snapshot
counts/no owned loop, CSS-scaled raycasts, drag rejection, player camera follow,
DPR/buffer cap, 390px and 320px touch layouts, reduced-motion frame stability,
disposal and static HTML IDs. Clean scenarios require zero console/page errors
and failed requests. A separate deliberate 404 fixture asserts a disclosed
fallback and two successful GLBs; its expected HTTP error is not a clean pass.

Actual isolated run output:

```text
world: drawCalls=36, triangles=2054, loadedModels=3, fallbackModels=[]
battle: drawCalls=12, triangles=2210, loadedModels=2, fallbackModels=[]
clean_console_errors=0, clean_failed_requests=0
intentional_404_fallback: cindupp, HTTP 404; not an asset pass
screenshot_bytes=390245
PASS: view-only GLB, framing budgets, pointer, resize, lifecycle and fallback checks
```

Three images are saved to `/tmp/foldwild-view-qa/`: `world-desktop.png`,
`battle-desktop.png`, `world-mobile.png` (under 500 KB combined). These are raw
view-harness evidence for main's personal visual review, not a subjective polish
approval or full-game test. No registration or full-catalog smoke gate was run;
those remain mandatory main-integration/release work. No push is authorized here.
