# Capital Drive code and security review

23 November 2026. The review covers the authored Capital Drive runtime, its local assets and shared vehicle factory, save and cache handling, and the portal boundary that hosts the game. Parallel workstreams examined campaign state, geometry, room and vehicle simulation, transit, rendering, and browser security. The game tree has 163 JavaScript files, including generated data and the cache manifest. The review traced the main state owners and scanned authored code for DOM injection, external requests and storage access. Hosting isolation and third-party advisory coverage are separate checks.

## Fixed during the review

| Severity | Finding | Fix and verification |
| --- | --- | --- |
| Medium, hardening | Capital Drive had no game-specific policy restricting script, worker and connection origins. | [`index.html`](../../Games/Capital%20Drive/index.html) restricts those sources to the local origin. The policy also disables plugins and external base URLs and form targets. Inline CSS remains enabled for the existing runtime styling. |
| Low, integrity | A cache miss could return network bytes after revision verification failed or cache storage was unavailable. | [`service-worker.js`](../../Games/Capital%20Drive/service-worker.js) verifies a manifest asset independently of storage. It retries the digest URL once and returns a non-cacheable 503 if both checks fail. Regressions cover storage exceptions, bad bytes of the same size, failed hashes and unchanged warm-cache behavior. |
| Low, data loss | Falsy saved JSON could be interpreted as absent progress and later replaced by a fresh career. | [`career-reset.js`](../../Games/Capital%20Drive/career-reset.js) rejects malformed, oversized and non-record values. The controller enters its existing read-error state, which blocks subsequent automatic writes. |
| Gameplay | Restoring a campaign checkpoint cloned the active contract but left its private stage and credential state on the discarded object. | [`stealth-contracts.js`](../../Games/Capital%20Drive/stealth-contracts.js) pairs private, opaque retry state with the campaign checkpoint. Tests cover all 14 approaches, repeated failures, wrong tokens and one final payout. |
| Gameplay | Visibility inferred indoor ownership from a rectangle even for negative local coordinates, concave walls and courtyard cutouts. | [`police-rooms.js`](../../Games/Capital%20Drive/police-rooms.js) uses the same transformed footprint and hole containment as the collider. The regression also exercises the controller's visibility call without allocating a navigation field. |
| Lifecycle | Returning to a cached browser page could leave the game frozen after its loop and GPU owners were disposed. | [`script.js`](../../Games/Capital%20Drive/script.js) still saves on `pagehide` and preserves live resources when the browser retains the page. The lifecycle change was reviewed in source. |

## Remaining findings and limits

- **Medium, shared-origin storage.** The portal gives game frames both scripts and same-origin access. Pages served from the same origin share browser storage authority, including warm cache entries. The game's source policy restricts where resources load from. Deploying games on distinct origins would isolate their saves and caches. The bundled portal and disabled proxy configuration are outside the game change. [`assets/index-CRWHmtoy.js`](../../assets/index-CRWHmtoy.js)
- **Low, conditional hosting configuration.** The Netlify configuration retains a broad worker scope header for the historical UV worker. Worker deployment was outside this verification. [`netlify.toml`](../../netlify.toml)
- **Gameplay, GPS access.** The general route finder can choose a private-road edge between public endpoints. This was reproduced with a bounded graph fixture. Route access rules for private destination approaches, services and mission paths remain a separate routing decision.
- **Maintenance, legacy timed activities.** The unused default timed workout and hold-up branch of `createProgression` has a broken duration field. The browser always enables the interactive paths, which require live room sessions or employee targets. Regression coverage exercises those production paths.
- No confirmed High or Critical finding was established in the reviewed game source. Authored DOM updates use text and elements, and runtime imports and data requests are local. Worker messages and asset requests use a scoped client and a manifest list. The vendored Three.js revision is r160. No external advisory lookup or live penetration test was performed.

## Verification coverage

The Campaign domain audit completed all 24 story chapters. The eight placement points for Replica Relay support two approaches and two exits, with clearance and visibility checks. Domain checks verify the objective rules and source placement. Human difficulty and full native travel across all missions remain unmeasured.

The workshop scenario uses the actual mapped-street placement and interior controller, checks room and case reach, interrupts on exit and awards cash once after escape. Bus tests use the sourced world and hold a stop request through a 25-second red signal, platform arrival and a blocked door. Tests bound the active interior render to one main batch, the Memorial to two draws, birds to three instanced draws, and the traffic view to 56 slots. These are component budgets. Actual Intel N100 frame rate and sustained driving performance remain unmeasured.

Run `python3 -B scripts/check_capital_drive.py` from the repository root for the authored gate. Use `python3 -B scripts/build_capital_cache.py --check` for manifest coherence and the commands in [the source record](../capital-drive-war-memorial-sources.md) for the Memorial's deterministic source build.
