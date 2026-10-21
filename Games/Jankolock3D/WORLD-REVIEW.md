# Jankolock 3D world: independent third-pass review

**Overall: HOLD. A: HOLD. I: PASS for retained world evidence only. World UI fidelity: PASS with caveats. Full-game acceptance: NOT CERTIFIED.**

Reviewed another builder's `13572f3` and `019c39b`, using
`openai-codex/gpt-6.1-sol`, xhigh (session settings verified). Read repository
AGENTS, CODE_QUALITY, maintenance entry/manual/inventory, the shared rebuild and
world brief, all authored world modules/tests/QA/mockup code and WORLD.md.
Reviewed the exported descriptor through its header and full JSON equality test.
World source has no working-tree difference from `019c39b` at review time.
Only this report is owned/changed; no browser, download, implementation or push.

## Grades and findings

| Scope | Grade | Basis / remaining gate |
| --- | --- | --- |
| A: three visible, color-coded, walkable 3D lanes and lane-length zips | **HOLD** | Images show yellow Graft, blue Midway and green Greenhedge; module fixtures pass complete walks and rides. Native evidence proves only Graft/Midway endpoints and Greenhedge in flight. No retained arrival walks. |
| I: nonblank QA images and HTTP 200 | **PASS, world-only** | Fresh reviewer variance checks pass all 12 retained PNGs. Completed builder UI receipt records 7 captures, 29 HTTP 200 responses and 0 errors. This is not a new reviewer browser run or all-spec screenshot coverage. |
| World-viewer UI fidelity | **PASS with caveats** | Approved normalized design's flat panels, black/white buttons, single yellow UI accent, small corners, local Bungee/Atkinson and breadcrumb survive in desktop/mobile captures. Not pixel-identical; not gameplay/HUD approval. |
| Literal skybox / gradient request | **FAIL literal wording** | An actual enclosing sky sphere exists, but it is uniformly colored, not a cube/environment or gradient skybox. Sky is present; the requested implementation is not. |
| Shared spec as a complete game | **HOLD / outside this review** | B-H, third-person gameplay integration, hardware and full-fleet acceptance are not established by this viewer. Do not demand a hero in this explicitly spectator/first-person world tool. |

1. **HIGH acceptance blocker, not a proven navigation defect:**
   `docs/maintenance/audits/jankolock-3d-qa/world-native-evidence.json:3-8,216`
   records `completed:false`, 210-second timeout, exit 137, unknown console/request
   history and `nativeArrivalWalks:null`. Only two endpoints survived. The older
   420-second interruption is also not a pass. `world-qa.py:145-172` intends to
   exercise all lanes and arrival walks, but its newer checkpoint instrumentation
   has no completed browser verification. A remains held pending retained native
   all-lane rides plus grounded walks. Module success cannot close this gate.

2. **MEDIUM collision mismatch:** `traversal.mjs:15-40,100-113` collides against
   boxes, while ramps contribute height support only. `world-scene.mjs:60-64`
   renders physical-looking slabs. A reviewer module probe starts beside
   `roof-access-1` at `(maxX+2,0,minZ+4)` and runs 25 steps of 0.025 seconds with
   `{side:-1}`. Result: `(-387,0,-364)`, grounded, inside the ramp footprint;
   ramp height is `1.116279`, between feet 0 and head 1.8. Side entry intersects
   the rendered slab. Normal bottom-to-roof ascent passes existing fixtures;
   those fixtures do not prove side/underside collision fidelity.

3. **MEDIUM conservative collision:** `world-data.mjs:61` defines Staple Tower
   as a solid 25x30x25 box; `world-scene.mjs:94-96` draws two legs and a top with
   an apparent opening. Reviewer `capsuleIntersects({x:-95,y:0,z:0},tower)` returns
   `true` inside that visible opening. WORLD.md:75-76 discloses this accurately.
   This limits visual/collision fidelity, not the tested roof/rope route.

4. **MEDIUM contract deviation:** `world-scene.mjs:23-25` uses an inward-facing
   solid-color sphere, separate sun and box clouds. `world-implemented.png` and
   `world-aerial.png` visibly show the pale uniform background/fog. This is a
   legitimate skydome, not evidence of the literal requested skybox/gradient.
   WORLD.md:74 already avoids that false claim. Guardian approaches likewise use
   functioning slopes, not individual stairs, as disclosed at WORLD.md:75.

5. **LOW scope qualification:** `world-data.mjs:23` puts zip stations at z +/-385:
   **770 m**, versus 900 m roads/district and Patrons at +/-415 (line 32).
   These are long station-to-station rides, not literal edge-to-edge or
   Patron-to-Patron coverage. `world-scene.mjs:87` and `traversal.mjs:77` use the
   same x/z and sinusoidal curve; cable is 2 m above feet, 0.2 m above capsule
   top. No lateral path mismatch found. Ride screenshots show each lane and
   interaction state, but no visible rider/trolley: attachment animation and
   third-person integration remain unproven. Do not invent a misalignment bug.

6. **LOW UI caveats:** `world.css:8-17`, `world-mobile-{dark,light}.png` show
   readable wrapped controls without overlap or horizontal overflow, but header
   and touch footer consume roughly 60% of the 720px height before the prompt.
   Desktop title/prompt sizing and thin gray outlines differ from the normalized
   layout; these do not defeat structural/token fidelity. Both browser color
   schemes intentionally use the same dark panels, not two designed palettes.
   No minimap was requested for this world viewer; its absence is not a defect.

## Image inspection and evidence limits

Read these actual image attachments under
`docs/maintenance/audits/jankolock-3d-qa/`, not inferred appearance from code:

- `world-implemented.png`, `world-light.png`: unmistakable perspective city,
  building height, lane stripe, original structure markers and flat viewer UI.
- `world-aerial.png`: three parallel corridors and rooftop ramps are visible;
  heavy distance fog reduces readability. An aerial view cannot prove collision.
- `world-graft-zip-ride.png`, `world-midway-zip-ride.png`,
  `world-greenhedge-zip-ride.png`: distinct colored lanes at elevated ride views.
- `world-graft-arrival.png`, `world-midway-arrival.png`: endpoint views only,
  not independent evidence of subsequent grounded walking. No Greenhedge arrival.
- `world-mobile-dark.png`, `world-mobile-light.png`: real 390x720 content padded
  at right to 1280x720. Padding is not a broken 1280px mobile layout.
- `world-foldwild-reference.png`: genuine reference start screen, not gameplay.
- `world-ui-comparison.png`: labeled transformed mockup/runtime composite,
  2560x752, not a native single-viewport screenshot.

Also inspected `docs/jank3d-design/ui-mockup-world-{imagen,flat,normalized}.png`.
The first two are generated designs, not runtime evidence. Exactly two attempts
and the operator-approved deterministic normalization are accepted here; no more
image generation is needed. The normalized image deliberately uses a blank
canvas placeholder. Runtime need not resemble that blank area. The original
imagen city illustration does not establish runtime city-art parity.

These are retained builder captures, not fresh reviewer captures. The UI report
explicitly lists three shared paths overwritten by the later native retry;
original UI variance numbers for those paths are historical. Fresh reviewer
checks measured the current bytes instead. The failed native run's missing
error history remains unknown, not zero. Software WebGL is not target-hardware
or performance approval. No all-game offline/native/full-fleet claim is made.

## Commands actually run

- `node Games/Jankolock3D/world-test.mjs`:
  `world-test: 468 assertions passed (module fixtures; native evidence separate)`.
  Includes exact descriptor/export equality, all lane walks/rides and roof access.
- `node --check` on world-data, traversal, world-scene, viewer, world-test and both
  vendor JS modules: **7 passed**. Python `ast.parse` on world-qa/world-mockup:
  **2 passed**, without running them or writing assets.
- Python/Pillow current-image variance: **12/12 >100**, range **2006.92-5301.16**.
  All are 1280x720 except the explicitly labeled 2560x752 comparison.
- Parsed UI receipt: `True 7 captures 29 responses 0 errors {200}`.
- Native module probes reproduced findings 2/3 and checked cable offset/span.
- `git diff 019c39b --` reviewed world paths: empty; `git diff --check`: no output.

No maintenance refresh, catalog edit or browser gate was run; the orchestrator
owns maintenance reconciliation. Inventory still identifies the old registered
`Games/Jankolock`, not this unregistered 3D viewer. No game was added by this
review. Existing sibling systems/hero/design edits were left untouched.
Pre-write `df -B1 /`: **4,203,593,728 bytes available**, above **2,178,940,928**.

**Disposition:** accept retained world loading/nonblank evidence and viewer-shell
fidelity only. Hold A and all full-game/release claims; retain collision and
literal skybox qualifications for the builder/orchestrator. No push authorized.
