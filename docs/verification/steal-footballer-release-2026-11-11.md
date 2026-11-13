# Steal a Footballer: requested push checks, 11 November 2026

The owner requested a push, then reported that running still looked janky.
That report steered the pending push: locomotion was repaired first. The prior
[continuation receipt](steal-footballer-2026-11-11.md) remains historical evidence
with incomplete browser acceptance, not a current release pass.

## Reviewed source

Origin was fetched before preparation: zero remote-only commits and 21 local
commits. Those changes affect only StealFootballer and its documentation. The
read-only outgoing review found no changed catalog, protected game, proxy,
security, vendor or license boundary, and no detected authored credentials,
personal emails or machine-specific paths. Commit metadata was excluded from
content scans. No new runtime external loads were added.

| Commit | Repair |
| --- | --- |
| `e5e59dde` | Reconcile tactics drafts against live ownership and contested players before Apply/Save XI. Preserve edits and explain unavailable-player removals; engine validation stays strict. |
| `98b85df2` | Continuous per-actor gait phase, eased speed/poses/facing, smaller strides and arm swings, steadier support height, measured avatar cadence and matching carrier ball rhythm. |
| `059f97a9` | Maintenance and interface explanation of those repairs. |
| `6b3ab29f` | Preserve gait, speed, transforms and heading on zero-time frames after opening menus; explicit static-preview pose resets. |
| `81696a2d` | Observe visible/enabled ability button bounds and use native pointer input in the browser runner, retaining the real cooldown assertion and 30-second bound. |

Delegation 27 reproduced the tactics failure: a theft starts while the editor
retains an unavailable selected UID, so strict Game validation rejects the old
draft. The next browser run passed saving with the explicit removal notice.
Delegations 28/29 reviewed outgoing changes and native gate prerequisites.
Delegations 30/31 repaired and independently diagnosed gait jumps caused by
`total time * current speed`. Delegations 32/33 caught and fixed zero-time menu
frames resetting that phase and snapping heading. Delegation 34 adjusted native
test input after locator waits failed to dispatch a click before timing out.
Workers used the requested model and bounded explicit-path commits, with no push.

Root reviewed diffs and four on-demand running frames. Actor geometry remains
unchanged: six articulated meshes and at most 2,946 triangles across the tested
kit variants. Motion remains procedural with rigid leg segments; this is not
acceptance of an imported skeletal animation pack or physical-device performance.
The [complete Dot brief](../steal-footballer-model-wishlist.md) and
[125-entry manifest](../steal-footballer-roster-models.json) remain included.

## Targeted checks

Five focused suites passed after the first repairs: input, game, match, actors
and world. Actor/world suites passed again after the zero-time fix. Coverage
includes eight complete seeded matches, immutable tactics reconciliation,
cadence at 30/60fps, late-clock speed changes, stopping/blending, zero-time pose
and heading preservation, synchronized ball touches and immediate root positions.
Six runtime modules passed syntax checks; the Python runner passed AST parsing.
Maintenance coverage passed after inventory refresh:

```text
PASS actors: continuous cadence/speed transitions/grounding; adult proportions; 11 fitted hair styles/cache disposal; 125 source profiles x3 kit patterns; max 2946 triangles; geometry release.
PASS running preview: four stepped frames, no browser exceptions.
PASS: 138 game documents cover 132 registered + 6 unregistered games; Git inventory current.
```

The first push-preparation quick browser run passed tactics saving, 22-player
match movement/spectating and all 12 signature definitions/descriptions. It
failed the activation outcome after locator clicks repeatedly timed out before
dispatch. That incomplete attempt is not counted as a pass. The native-pointer
runner change passed Python parsing but was not browser-rechecked before the
owner instructed stopping the fleet check and pushing.

## Full catalog gate

The unchanged `scripts/smoke_test_games.py` started at
`2026-11-11T09:35:31Z`, selecting all 132 catalog entries with its default waits
and retained failure filters. Native Windows has no `xvfb-run`; the existing
Chromium headless shell was supplied through the script's supported
`CHROMIUM_PATH` setting. No script launch flags, waits or filters were changed.
The process priority is below normal and the gate uses one browser sequentially.
Its bounded server uses port 8767, separate from the owner-requested localhost
server at 4173.

Runtime source is `6b3ab29f`; the subsequent runner-only commit changes no
entry/runtime code. At the owner's explicit instruction the fleet run was
stopped after **111/132 visits: 110 passing, one failure, 21 unvisited**.
Jetpack Joyride Hacked recorded zero console errors and one failed request.
Its tree is unchanged from origin (`c2060fe57873c07d5b5662e642e9b254fcfd7c39`).
The failed URL/reason was not available because the script prints those details
only after completing the whole catalog. No cause is claimed and no filters
were changed. The stopped run is **not a full gate pass**. Its Python/browser
process tree was terminated; the owner-requested localhost server was retained.

## Release decision and remaining limits

The owner explicitly overrode the fleet requirement: "if you dont edit other
games no point smoke test just push". This authorizes pushing the footballer
changes and documentation with the recorded partial/failed checks. Other games
were not edited. Catalog size stays 132, with no games added, ingested or
self-made. Exact likeness, full normal-input match/debrief,
physical-device performance and 20–30-minute session pacing remain outside the
short loading gate. The requested localhost server remains available for owner
testing; QA browsers and the gate's temporary server end with their runs.
Untracked `.gitignore.txt`, `.pi/` and legacy `react-app/` are preserved.

Game Git source is 2,917,670 bytes in 30 files, +12,299 bytes from the preceding
follow-up. Observed free disk space before saving the running captures was
110.83 GiB. Reviewed captures: [frame 0](steal-footballer-release-2026-11-11/run-0.png),
[frame 2](steal-footballer-release-2026-11-11/run-2.png),
[frame 4](steal-footballer-release-2026-11-11/run-4.png),
[frame 6](steal-footballer-release-2026-11-11/run-6.png).
