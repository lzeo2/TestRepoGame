# Wings speedboat reroll: files for operator review

2026-10-19. Existing Wings, catalog 232; no new portal game or ID. Operator
approved the initial shape, then requested materially greater realism through
procedural geometry, vertex colors and PBR only. No texture images, external
assets, dependency installation, runtime network load or outside-repository
removal. Rights qualifications for the upstream game remain unchanged.

## Final candidate and reproducibility

`Games/Wings/models/speedboat.glb` is an experimental raw asset, not a selectable
vehicle in the delivered runtime yet. Original procedural geometry by
`openai-codex/gpt-6-astra`; parent supplied visual review and bow-closure repair.

| Stage | Triangles | Used material definitions | Primitive assignments |
| --- | ---: | ---: | ---: |
| Initial generator `f3ce4dd` | 16,344 | 14 | 121 |
| First surface reroll `b70d464` | 17,428 | 55 | 201 |
| Second reroll `6c375af` | 17,236 | 92 | 257 |
| Final bow closure and review files `5563371` | 17,252 | 92 | 258 |

Final bytes: **1,069,292**; vertices: **24,746**. SHA-256:
`1f0eae7f3b962669c2f95f1ce52e3f27cce008595f4875bae41e9274b24da65a`.
Committed bytes equal two fresh in-memory generations. Existing F-15/F-35 bytes
remain exact. `python3 -B Games/Wings/verification/check-models.py` now checks
all three models, including the experimental boat, without relaxing jet checks.
Generator CLI `--speedboat` writes only temporary boat evidence.

Finishes distinguish wet/dry gelcoat, non-skid deck, painted cabin, window
rubber/glass, blued gun steel, brass/copper/bronze fittings and reflective hardware.
Paint roughness is approximately .2-.4, deck .7-.9, hardware metallic near .9;
selected surfaces use local clearcoat. Linearized sRGB, one subdued ochre accent,
functional panel finishes and neutral vertex AO replace a uniform gray hull.
AO is a deterministic contact heuristic, not a ray-traced bake. Real micro-detail
includes gaskets, vents, chamfered hatch/seat edges, cleats/fasteners, stitching
and recessed muzzle rifling. Approved hull/deck contours and articulated anchors
remain; the parent added a small closing face at the finite-width bow station.

## Actual rendered files and parent judgment

[Preview folder](../../../Games/Wings/docs/previews-v2/speedboat-reroll/)
contains **16 PNG files**, `browser.json` and `stats.json`. True front, side,
top, rear, below-lit belly and both quarter cameras were rendered in both themes;
mobile quarter views are additional. Three 0.186.0, system Chromium/SwiftShader,
standard-Three raw GLB rendering. Procedural RoomEnvironment illumination,
self-shadows and projection-based framing; no material recoloring in the viewer.
This is not Wings' native renderer or total scene-budget acceptance.

Parent opened front/side/top/rear, both quarters, lit belly and mobile captures.
The first reroll was rejected internally as too flat. The second shows stronger
hull reflectance, distinct dark deck/hardware finishes and localized shadowing,
but still reads as a clean game model rather than a photograph. **Operator realism
verdict remains open.** Counts do not establish photorealism.
The larger front view exposed an open bow seam; parent closed it and reran all
16 cases. The initial cap name collided with a side-skin normal assertion;
it was renamed to its actual closing-face role, retaining that side assertion.
The final front no longer shows daylight through the seam. Lit belly remains
continuous with no visible inverted patches. No further realism claim is made.

Capture checks: **16/16**, zero console/page errors, external or failed requests;
all cameras distinct, geometry contained, no overflow. Final model hash is bound
in the saved browser receipt. New capture code is a runnable bounded regression.

```sh
python3 -B Games/Wings/verification/check-speedboat-browser.py \
  --model Games/Wings/models/speedboat.glb \
  --three-root "$HOME/.hermes/cache/tools/three-0.186.0/package" \
  --out .tmp/boat-review-fresh
```

## Source work and release boundary

The F/A-18 study landed as `2fe6f4c` before implementation; parent approved the
water-class deck-cannon/depth-charge design, omitting wake-slam. Seventy pinned
source files were recovered with Git blob verification and the existing patch
applied cleanly. Builder `a017419` uses existing esbuild 0.28.2 and external Three
0.186.0, with no install or repository node_modules. Unchanged baseline builds
byte-reproducibly and existing generated CPU checks pass.

Private source commits in `.tmp/wings-speedboat-source` are not delivered runtime:
`a99f950` contracts, `e0faacf` water physics, `3eeedb9` combat, `1ed2592` spawn/lifecycle,
`145de97` rig/wake, `67b2190` CPU check, `9961c67` menu, `3091f80` motor,
`6f73e2d` PBR/AO conversion. Parent's slot-order correction in vehicles.ts and
interrupted audio-dispatch edit in audio/engine.ts remain private WIP. Input,
camera, UI/event integration, patch/build delivery and final regression are not
complete. No claim of a newly selectable delivered boat.

Final experimental conversion independently checked all 256 opaque source
surfaces, 57 with varying AO: **17,252 triangles, 92 batches**, plus four wake
triangles when visible. Source PBR and base-color times AO match. Rig, articulated
muzzle, stores, signed props, wake/disposal and original-seven converter parity
pass in CPU fixtures. Increased draw count is explicit, not a performance gain.
No target-device performance or full visible scene under 120,000 triangles claim.

Sampled up to two worker-log tails per delegation cycle, rotating among water/
combat, render/regression, engine/menu and converter/browser; sampled the final
reroll log too. Reviewed actual commits. Corrected the parent's slot-order defect,
reassigned the audio owner after a correct scope refusal, preserved the interrupted
partial edit, and rejected the flat first reroll. Did not alter original-seven
behavior, smoke filters, failure gates or hardware assertions to obtain a pass.
Transient advisor timeouts `pi-1084209-1792391448507-f86d7c89` and
`pi-1087115-1792392002166-bf8036ad` remain advisory failures; the corresponding
fixture diagnosis was completed independently, not inferred from advice.

Fresh mandatory full fleet gate: **0/125 visits, not run**; exclusions not newly
measured or changed. It must follow completed runtime integration, releasing
between sparse batches, then actual normal-input boat weapon/restart acceptance.
No push or deploy verification. Operator receives raw files now for pixel review;
none of the pending gates is replaced by these previews.

Main continuation milestones: `2fe6f4c`, `a017419`, `f3ce4dd`, `b70d464`,
`41d56fa`, `6c375af`, `5563371`, followed by the manual/inventory receipt.
Fresh syntax, catalog/schema/unique-ID/tracked-URL and diff checks pass.
Maintenance check: 130 documents, 125 registered plus five unregistered, current
Git inventory. Main working tree is clean after the receipt commit; the two
explicit private WIP paths above are ignored staging, not delivered changes.

Available bytes at entry: 2,631,307,264; before final receipt: 2,585,178,112,
a filesystem decrease of 46,129,152, not exclusively task-attributed. Strict
2 GiB floor held. No sparse selection change or bulk game checkout. All owned
render browsers/servers exited. No new game registration, push or deploy.
