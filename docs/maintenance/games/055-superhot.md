<!-- maintenance-game: Games/Superhot -->
# Super Hot maintenance

## Identity and status

Registered id **55**, category `action`, entry `Games/Superhot/index.html`. Baseline `8c8a055`, entry `3fdd1ae3a5271510d054dd200d7ebee17cc1aa34`, tree `dc10b10b1b5cefbb0e51e263c8853ae3fc93d465`. Eight files total 45,537,221 bytes. No runtime or publication change is authorized by this documentation task. Catalog offline claims are not a native test result.

## Implementation map

This is an older Unity/Emscripten bootstrap, not the newer `UnityLoader.instantiate` template. The entry supplies global `Module` with `TOTAL_MEMORY: 268435456`, null `errorhandler`/`compatibilitycheck`, and `dataUrl`, `codeUrl`, `memUrl` pointing to `webgl.datagz`, `webgl.jsgz`, `webgl.memgz`. `UnityLoader.js` uses `LoadCompressedFile`, `DecompressAndLoadFile`, `LoadCompressedJS` and `SetIndexedDBAndLoadCompressedJS`. It probes server gzip support, inflates fallback bytes with bundled pako, and loads code blobs. Keep filenames and loader generation paired.

DOM anchors are `#unityContainer`, `#canvas`, `.logo.Dark` and `.progress.Dark`. `styles.css` forces the container/canvas to full size. `main.js` contains only an attribution/removal comment, no gameplay or loading logic.

Source review coverage: complete entry, CSS and comment-only main file; selected compression, indexedDB and compatibility loader paths. The 36,687-byte minified loader was not fully human-reviewed. Compressed engine code/data/memory, binary content, collision/input logic and embedded terms were not decoded or reviewed.

## Gameplay and controls

The catalog describes time advancing with movement and weapon encounters. The wrapper does not define that rule, bind gameplay keys or document mouse/touch input. The canvas only suppresses context menu. Start, score/progress, failure, level completion and restart live inside compressed Unity code; do not infer WASD or touch support from the title. The loader's `CompatibilityCheck` explicitly warns on mobile and can navigate back if declined. Hardware/browser compatibility must be evaluated before promising phone play.

## State and persistence

The wrapper holds the `Module` and no save key or authored animation loop. Loader code tests IndexedDB using `/idbfs-test` and assigns `Module.indexedDB`; that is capability detection, not evidence of a game save format. Engine persistence and cleanup are unknown. The hard-coded 256 MiB memory reservation is a loader setting, not a measured total-memory ceiling. Closing the portal iframe should dispose of this page's runtime; verify rather than adding another loop.

## Dependencies and provenance

Local dependencies are UnityLoader, the three compressed payloads, `styles.css`, `main.js` and `hot.jpg`. There is no game license, source URL or pinned game revision in this directory. The main comment credits a 3kh0 fork's site script author; it does not license the Unity game. Ownership/redistribution clearance remains unknown. Loader CSS references `progressLogo.Light.png`, `progressEmpty.Light.png`, `progressFull.Light.png` and their Dark variants, plus `fullscreen.png`, none present in this eight-file tree. Active logo/progress elements are initially hidden, so distinguish a dormant reference from an observed request failure.

## Audit findings

- **HIGH, privacy hold:** `main.js`, first-line attribution comment includes personal contact information. Escalated without repeating it. Minimal remediation belongs to Main: preserve name/source attribution while handling private contact data under repository policy; runtime/source remains untouched here.
- **HIGH, provenance hold:** game payloads have no verified license/source pin. Resolve separately from site-script attribution.
- **MEDIUM, boot feedback:** `index.html`, `Module.errorhandler: null` and hidden progress elements provide no authored retry/error path. Add shell status through supported loader callbacks after a real failure repro.
- **LOW, unresolved asset references:** `styles.css`, progress/background image URLs. Reconcile against actual loader use before vendoring or deleting; no missing-file gameplay failure was run here.
- **Historical limitation, not a confirmed defect:** `docs/audit_batches/playtest_r1.md` reported a SwiftShader `getSupportedExtensions` failure after Unity boot. That report labels the environment limitation; it is not proof the shipped build fails on hardware WebGL.

## Safe iteration

Limit authorized later changes to wrapper sizing, status and attribution hygiene. Do not hand-edit compressed `webgl.jsgz`, adjust memory speculatively or replace original content. Maintain gzip fallback behavior and rollback all paired loader settings together. Do not remove missing-reference evidence without tracing consumers.

## Verification

Actually run: Git tree/resource checks, stdin parser check on `UnityLoader.js`, `main.js` and entry inline `Module` definition; all passed. Native runs **0**; screenshots **0**.

Reproduce: `git show HEAD:Games/Superhot/UnityLoader.js | node --check`. Recommended Main-approved HTTP lease: test gzip and fallback responses, first playable encounter, movement/time behavior, weapon action, failure and restart on actual hardware WebGL; repeat portrait/landscape and offline request capture. Do not auto-accept compatibility dialogs. Main's catalog smoke gate cannot certify full encounters.

## Future outlook

Rights/privacy first; hardware compatibility and real loading feedback second. Month refurbishment should measure memory and old-loader browser support, then fix shell sizing and keyboard focus only where evidenced. Touch adaptation requires engine-level support and maintainable sources; no promise of a phone port or engine rewrite.
