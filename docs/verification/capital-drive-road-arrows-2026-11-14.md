# World-space road arrow follow-up

14 November 2026, Australia/Sydney. Follow-up to the merged signals/transport/
crime update, PR #19 (`fa3893f2`), whose Pages run 43585175144 completed successfully.
The user requested the yellow route arrow in front of the car while driving.

`road-guidance-view.js` adds up to three yellow outlined markers 12/24/36 m along
the existing route ahead of the live manual driver. They use shared ground/bridge
height, an estimated left-lane shift and current clear-body placement queries.
They follow bends and stay ahead; arrival, reversed heading, invalid/off-route
poses, passengers, foot mode and interiors hide them. Clearing the route hides
them. Existing map/minimap arrows and next-turn distance remain.

The adapter is presentation only: two pooled draws, two owned geometries/materials
and 4,992 stable buffer bytes. No extra clock, lights, textures, remote assets,
route mutation, physics change, wallet or save write. Buffers/nodes do not grow;
disposal is isolated and idempotent. The controller owns enabling/updates/cleanup
and exposes detached read-only roadGuidance diagnostics.

## Validation

Targeted gates passed: script/module/suite syntax, the new road-view regression,
existing pure turn-guidance suite, both Python AST checks, diff checks and runner
dry plan. The view regression includes a 21-point actual OSM route with 128 visible
frames, turns/motion, placement callbacks, finite terrain, reversed/off-route/
arrival hiding and exact disposal. Current runner inventory is 57 modules/65 pure
suites/188 commands; this view-only follow-up did not repeat unchanged physics
suites. The prior full 185/185 pass remains in the [signals receipt](capital-drive-signals-2026-11-14.md).

Two complete normal-input guidance cases passed on cloud software WebGL:

- Initial: 20 checks, 50.67 seconds, exit 0. Report SHA256
  `f52d2a807b655643d5decdd8fb653a310cf3ea1390da4065701a4593f30fdfc4`.
- Final framing: 21 checks, 55.19 seconds, exit 0. Report SHA256
  `5861786bf123cd45b3f69a1c3d8106a3de3f9d3603357300b08e9ab7c1b86289`.

Both select an actual Kingston route, observe 1–3 finite world markers ahead of the
car, drive with normal W, check movement/distance changes, then normal E exit and
Map Clear hiding. The final case uses an ordinary mouse orbit to include the
actual road in the 390px frame. Both report no page/console errors, failed requests,
HTTP errors or external attempts. No setters, money/position/save grants or clock
mocks. Browser/context/temporary server cleanup completed.

Root reviewed desktop/390px frames: the desktop clearly shows three road arrows;
the portrait road view is tight because the starting car drove onto the curb.
Markers remain on the actual route rather than being moved toward the camera.
Native/N100 GPU frame rate and touch driving remain unmeasured.

M60 view/regression commit 75bf8733; M61 native harness 46b2c257. Root owns controller,
runner metadata, documentation/inventory and shipping. Workers committed explicit
disjoint paths under exclusive index windows and did not push. New release facts
and live hashes are stored externally after deployment; original sparse checkout
is restored. No new game, dependency, geographic data or shared vehicle asset.

Tracked game payload: 12,899,894→12,909,141 bytes (+9,247). Catalog remains134
registered/140maintained projects; maintenance and sitemap checks passed.
