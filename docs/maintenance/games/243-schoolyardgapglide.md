# Gap Glide

<!-- maintenance-game: Games/SchoolyardGapGlide -->

## Identity and status
Original Schoolyard Trio flyer, catalog 243. Owner requested publication for production testing while native/device checks remain open. Pinned standalone source commit `8a853cbae92d6a14c9fafb2f290c10b72be49f79`. No private likeness models or photos are included.

## Implementation map
`index.html`, `style.css`, `engine.js`, `ui.js`, `scene3d.js`, `shared.js`, and local MIT-licensed `vendor/three.iife.js`. The independent HTML links were adjusted to this catalog directory; authored logic is otherwise unchanged.

## Gameplay and controls
Flap through moving courtyard gaps with Space, Up, touch or the Flap button. Pause and Restart are visible. WebGL polygonal gate solids and a 2D fallback share the engine's collision loop; score counts gaps passed.

## State and persistence
The best score uses the guarded local key `gap-glide-best`; selection uses the site-wide `schoolyard-character` key. Restart resets the run without clearing a valid best score.

## Dependencies and provenance
Owner-authorized original offline prototype. Three.js 0.186.0 is vendored locally with MIT notice, no remote runtime loads. Personal reference photos, uploaded GLBs and provisional 3D likenesses are excluded; the public roster is fictional placeholders.

## Audit findings
Source projection tests constrain the moving silhouette to the original collision size, but cannot certify actual mobile pixel readability. The host's default Chromium GPU route has failed before, so WebGL acceptance and physical-device performance stay open.

## Safe iteration
Retain hitbox/render alignment, saved best score, keyboard/touch support and a nonblank fallback. Do not publish private models, import commercial look assets or alter unrelated site paths. Preserve the embedded upstream shader whitespace rather than rewriting third-party code.

## Verification
The pinned source's `node tests/run.js` reached flyer engine regression (eight deterministic 40-gate runs), CPU-only silhouette projection and mock scene construction checks, but later timed out in the launcher-heavy aggregate after 100 seconds. This is not a full-suite PASS. The release HTML dependencies and touched JavaScript syntax were checked. The operator requested hosted testing without a fresh full-fleet smoke gate; keep that unrun gate explicit.

## Future outlook
Test hosted flap, scoring, pause, failure, restart, mobile gate readability, 3D pixels and 2D fallback by real interaction. Device/GPU acceptance is still open.
