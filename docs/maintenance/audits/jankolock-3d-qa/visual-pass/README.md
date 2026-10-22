# JANKOLOCK procedural visual pass

## Current evidence

**Builder checks complete; independent A/E/H qualified mechanical pass only.**
See [bounded review](MODEL-REVIEW.md), commit `b91a600`. Art/hardware/release
remain held.

Ten A/H/E/P receipts contain **36 actual 1280x720 captures**, **635 HTTP200
responses** and **zero retained errors**. All 59 runtime source hashes are
identical across cases and match recorded revision `bedb052`. The later
operator-authorized dark-default UI flip retains A-I acceptance; it does not
rewrite these original receipts or pretend unchanged UI bytes. The verifier now
checks those source/runner bytes through Git at `bedb052`, while still checking
actual screenshot and current unchanged model bytes. The selector covers
JS/MJS/HTML/CSS/GLB, not JSON configs/kit data/receipts or environment PNGs;
capture-time coverage cannot be retroactively expanded. All screenshot and
runner hashes reverify. There are 42 PNG files: the 36 captures, one deliberate duplicate,
one ability contact sheet and four concept/model twins. Composites do not count
as additional gameplay captures.

```sh
python3 -B docs/maintenance/audits/jankolock-3d-qa/visual-pass/verify.py
```

`evidence-summary.json` records actual GLB arithmetic/hashes and the 60,000,000-byte
whole-pass growth ceiling from `db70557`. Growth includes concepts, source,
textures, models and both retained timeout sets. The unrelated pre-existing
`ui-mockup-world-controls.png` is excluded and untouched. No new file exceeds
20 MB; each of the six live GLBs is below 8 MiB.

## Frames to inspect

- A: [Graft](integration-A-graft.png), [Midway](integration-A-midway.png),
  [Greenhedge](integration-A-greenhedge.png), [aerial](integration-A.png).
  Separate `*-arrival.png` files show all three actual 770m zip arrivals.
- E: [sixteen ability effects](integration-E-all-heroes.png), plus each original
  full viewport `integration-E-<hero>-<slot>.png`.
- Clean GLBs: [Stampead](integration-E-stampead-model.png),
  [Turretina](integration-E-turretina-model.png),
  [Snipeoff](integration-E-snipeoff-model.png),
  [Gooey](integration-E-gooey-model.png).
- Comparisons: `concept-vs-model-{stampead,turretina,snipeoff,gooey}.png`.
  Left is the codex-imagen plate, not a mesh; right is the actual full viewport.
- Native inputs: [double jump](integration-E-double-jump.png),
  [dash](integration-E-dash.png), [slide](integration-E-slide.png).
- H: [normal light lobby](integration-H.png), [dark HTML theme](integration-H-dark.png).
  Selected GLB and supplied portrait relief share the scene.

## Actual model files

| Asset | Indexed triangles | Bytes | Drawables |
| --- | ---: | ---: | ---: |
| Stampead | 179,388 | 5,797,108 | 45 |
| Turretina | 171,818 | 4,648,580 | 48 |
| Snipeoff | 170,342 | 4,835,696 | 39 |
| Gooey Sticky | 179,556 | 4,612,808 | 43 |
| Candle trooper | 31,730 | 1,592,464 | 12 |
| Unchanged supplied portrait | 124,512 | 3,228,372 | 1 |

Five new GLBs total **21,486,656 bytes / 732,834 triangles**. With the portrait:
six files, **24,715,028 bytes / 857,346 triangles**. These are asset totals, not
per-frame GPU totals; characters/troopers are instantiated repeatedly.
Runtime meshes have UVs/normals/PBR materials and original shared 512px surface
and normal maps, not concept pixels. GLBs contain geometry and material colors;
procedural surface maps are generated locally at runtime, not embedded images.
Original generator, receipt and limitations live beside each new model.

Environment: 62 recessed facade buildings, 21 curved turnouts, roof/street
props and park foliage; 926,466 assembled full-detail triangles, 41 reusable
geometries / 2,376 unique triangles, 280 coarse batches and 66,904 instances.
Eleven original 512-1024px PNG maps total 1,210,564 bytes and include actual AO
maps. Instancing/cutoff are not an FPS claim. Authoritative collision, routes
and spawn JSON remain unchanged.

## What was exercised

A uses labeled API lane placement, a short native W walk and native E attach
per lane; fixture time completes each real 770m ride. All end alive at y=0,
free mode, 527.2 HP, without forced invulnerability. Overview is an API camera,
not native 900m walking. E uses each selected hero's real 1-4 keys/counters/FX.
P uses each selected GLB with a labeled inspection camera, then native
Space/Shift/W/C on Stampead with explicit elapsed fixture time. Clean cases
cast no abilities; they do not hide FX to manufacture a clear view. H has no
QA query and toggles HTML theme only, not independent world-lighting themes.

Paused/finished play no longer redraws the entire GPU scene continuously.
Frozen captures assert that the real renderer frame counter stays fixed;
resize and explicit sync/camera calls still render. This saves idle work,
not supported-hardware FPS. The advisory persistent-profile/CDP recipe was not
newly exercised. Each bounded invocation used one system `/usr/bin/chromium`,
explicit SwiftShader and normal cleanup. No downloads, new dependencies,
installs, parallel browsers or guard waiver occurred.

Fresh CPU checks passed: world 491 assertions; controller 1,365; environment
objectives/LOD/disposal; four real hero GLBs and 16 kit/seven generic FX;
hero runtime; 24 shared-geometry troops with isolated material/candle state;
bots eight groups; systems 18 groups plus 600s script; both integrated 600s
win chains; catalog 127 unique entries; UI eight checks. These are not native
full matches. Maintenance coverage/inventory also passed.

## Remaining limits

No Blender/bpy/sculpt tool was used. The wishlist remains operator-run external
art requests, not locally fulfilled assets. Procedural quality: Stampead 5,
Turretina 4, Snipeoff 4, Gooey 5 out of 10. Counts are not fidelity grades.
The twins show the gap: generic faces, rigid cloth/hoses/grips, no skin/IK/face
rig or character LOD. Slide state works but the body still reads visually
upright; Midway's arrival photo is occluded by objective geometry. Primary city
corridors remain broad and straight, park dressing sparse, clouds stylized and
combat objectives primitive. This is an
improved procedural prototype, not reference-quality art.

Timed-out batches remain in `../visual-pass-before-idle-fix/` and
`../visual-pass-before-single-hero/`; neither was relabeled complete. Current
single-hero retries completed every case. No old-image reuse is claimed.

Full 127-game smoke, supported GPU/real handheld, cold-offline acceptance,
full-match fun/balance and final subjective acceptance remain separate gates.
No games/IDs were added; 127 entries remain. No push/publication occurred.

## Milestones

- Concepts before meshes: `79dc4c8`; initial request appendix: `85fb6bd`.
- World architecture: `975ccc9`; retained contract/inventory: `248ce6a`,
  `e89430b`; separate world functional evidence: `d4dad57`.
- Local verified GLB pipeline/surfaces: `5e52f19`.
- Stampead: `e627cee`; delivery verification: `ce29c8f`.
- Turretina: `1eae17e`; Snipeoff: `5e3610c`; Gooey: `89e7c0d`;
  trooper: `a15c25e`.
- Parallel existing-system recall correction: `d69c12c`; resume receipt:
  `7f7f545`. No catalog/ID addition.
- Runtime integration: `918b108`; idle redraw/capture checks: `40d0448`.
- Procedural scores, documentation and preserved timeouts: `6942be0`.
- Independent qualified mechanical review: `b91a600`.
- Final packet/inventory commit is the subsequent commit introducing this
  README, current images/receipts, summary and runnable verifier.
