# Circuit Ward / vehicle amendment

## Status, ownership and approval boundary

Mechanical concept rendering and documentation only, 2026-10-01. Main owns the
functional and visual design below; this worker follows it, not a redesign.
Worker environment actually verified: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Task limit: 15 minutes; no push.

The operator has given feature GO for this amendment. Visual approval
clarification remains **pending in `pi-912882-1790852965108`** at writing.
Capture the direct ticket answer and approved visual scope **before any vehicle
game code**. These newly rendered illustrations have not yet received main's
personal art review or operator visual approval. A timeout is not approval.

The current six-model Circuit Ward build is separate: it has no vehicles,
tier merges or these abilities. Its existing regression/release evidence is in
[circuit-ward-qa.md](circuit-ward-qa.md); the six delivered model inventory and
scoped publication permission are in [circuit-ward-models.md](circuit-ward-models.md).
Original self-made game approval is `pi-912882-1790827041648`, not generic
upstream ingestion permission. This amendment introduces a new functional path,
not a claim that the path already exists. No new game/catalog entry is proposed.

This task creates no vehicle primitives, GLBs, loaders, implementation,
scaffolding or files under `Games/`. Model delivery is pending: **do not build
primitive vehicles while waiting**. External Dot art delivery is a wishlist job,
not an instruction for the coding worker to manufacture assets.

## Two rendered concept illustrations

External artwork workspace: `circuit-vehicle-amendment` in the system temporary
root specified by the main task. Exactly two PNGs, each **1280 × 720**, with
combined PNG budget **under 700 KiB** and combined HTML source **under 80 KiB**.
No PNG or HTML is committed. Both frames visibly say **CONCEPT — NOT GAMEPLAY**:
these are **RENDERED CONCEPT illustrations**, not gameplay captures, built
assets, model previews of delivered GLBs, or runtime testing evidence.

1. `01-vehicle-fps.png`: open Scout seat in the same maintenance arena. Twenty-four
   cream wall panels, steel-blue floor, gray lane grid, low cover consoles,
   two enemy walkers and one drone by far cover, and a tiny blue friendly walker.
   Two angular steel-blue hover pods flank a cream front deck with a flat rail
   and small amber coil trim. No enclosed windshield, roof, instrument cluster
   or cockpit. Center crosshair; original cream/blue, amber-strip rectangular
   coil-blaster design at the right muzzle. HUD: Tier I, vehicle hull, score,
   wave 5. Four black 50px-high ability plates: `1 RAM`, `2 FLUX BURST`,
   `3 BARRIER CACHE`, `4 SPEED STACK`; `E Exit` label. HUD values are illustrative,
   not observed gameplay or finalized balance.
2. `02-tier-lineup.png`: three three-quarter comparison views, on cream with
   steel-blue floor pads. Identical camera distance/focal length shows growth;
   pod count, part changes and hull hue show progression, not color alone.
   Thin `2× I → II` and `2× II → III` connectors; small plan-view schematics,
   dimensions and triangle ceilings. **This comparison camera is not a play
   camera**. All tiers retain an open first-person seat.

Matte flat steel-blue, cream and amber; block corners, vents, faceted perspective
geometry. No gradients, glow, glass, purple postprocessing, spikes, cartoon faces,
brand assets or recognizable franchise weapon shapes. Main panels use 6px radius;
ability controls use 4px radius with high contrast. Local Bungee and Atkinson
fonts are reused, not downloaded.

### Physical and camera metadata

Dimensions are generator targets, **not measurements of delivered models**;
width X, height Y, depth Z in meters. Requested future vehicles use **+Y up,
+Z forward**, ground-centered origins. Existing six-model delivery declares
front/muzzle **-Z**: preserve it, and handle this deliberate vehicle difference
explicitly when integration is separately approved.

FPS illustration: eye `(0, 1.18, -1.8)` m, looking along +Z; 760px focal length.
The Scout foreground is an illustrative front-deck cutaway composed separately
from the arena, not an exact full physical mesh or asset validation. Arena
back wall has six panels; each side has nine. Walkers/coil blaster are authored
silhouette interpretations of the existing approved design, not loaded GLBs.
Lineup: eye `(5.3, 4.3, 6.3)` m, target `(0, 0.35, 0)` m, 650px focal length,
same camera for all tiers; only screen center changes. Flat polygon colors use
face-dependent matte shading with painter sorting, not a lighting/glow effect.

## Dot model wishlist: three future deliveries only

One invented family. These filenames are **future wishes only**; no files exist
or are created by this task. Each entry below is generator-ready under the
common export contract following the table.

| Future filename | Original mechanical prompt and dimensions W × H × D | Ceiling |
| --- | --- | ---: |
| `scout-hover-runner.glb` | Tier I Scout Hover-Runner: 1.65 × 0.65 × 2.40 m. Compact open steel-blue chassis, two low chamfered hover pods, cream deck and flat seat rails, one small amber central coil rail. Recessed open seat, block-corner vents; no canopy, cockpit, instrumentation, spikes or face. | 1,600 tris |
| `rail-van.glb` | Tier II Rail-Van: 2.05 × 0.90 × 3.00 m. Use the same base body geometry/body plan as Scout, enlarged with extension plates, four short pods and twin forward rail forks. Matte cream forward guard, stronger amber upper coil housing; lighter steel-blue hull. Keep the open seat and family vent/corner language. Scale and parts change, not just hue. | 2,400 tris |
| `aegis-goliath.glb` | Tier III Aegis-Goliath: 2.80 × 1.25 × 3.90 m. Unique redesigned boss-tier body, recognizably the same family: broader darker steel-blue chassis, six low pods, four flat cream hexagonal shield plates around an open upper deck, one central amber coil spine. No roof, windshield, cockpit, spikes, cartoon face or borrowed weapon silhouette. | 4,000 tris |

Family sharing: I and II share the same base body geometry with size/part/hue
changes; III requires a unique boss-tier GLB, not merely a rescaled/recolored II.
Export each final tier separately as one joined static mesh. Visible side panels
must not enclose the seat into a cockpit.

Common export contract: binary glTF 2.0 GLB; **one joined static mesh and one
opaque MATTE vertex-color material**, metallic 0, high roughness. Include normals;
meters, +Y up, +Z forward, origin centered at ground, applied transforms.
No textures, images, animations, rig, morph targets, Draco, required extensions
or external buffers/resources. No baked glow or transparent/glass materials.

Request an original, operator-owned mechanical source, plus the actual creator,
generator/provider identity, source record and usage/publication terms when the
operator delivers. Confirm legal terms then; **do not invent CC0**, author names,
upstream attribution or generic ingestion/redistribution permission. Existing
six-model permission does not automatically cover these future assets. Original
concept geometry here is illustrative SVG only; no GLB provenance is asserted.

## Main-owned tentative functional design, not implemented

- Preserve the original FPS and offline solo/manual 1–4-player co-op fallback.
  Host remains authoritative. No RTS mode, overhead camera, cockpit camera,
  signaling service, proxy or backend changes.
- `E`: enter/exit nearest friendly empty vehicle. Camera stays first-person at
  seated height. WASD drives/strafes, mouse aims, LMB uses the existing coil
  weapon. Hotkeys: `1` ram, `2` flux burst, `3` barrier cache, `4` speed stack.
  Tier gating, cooldowns and numerical balance remain tentative; illustrated
  ability plates are not final availability rules.
- At a bay, **two friendly EMPTY same-tier parked vehicles plus an explicit
  merge interaction** become one next-tier vehicle, capped at III. No automatic
  occupied merges. New duplicate pickups come from wave rewards, not an
  already-implemented pickup system.
- Hull is separate from player HP. Destroyed hull safely ejects the occupant;
  this must not grant invulnerability. Friendly fire stays off.
- Grounding Sentry counters vehicles in waves 5–6: reuse the existing walker
  GLB with amber leg bands, puncturing hull. No fourth vehicle-model request.
- New vehicle wire state needs validation and host-authoritative ownership,
  bounded occupancy/merges/actions and **at most four live vehicles**, including
  vehicles occupied by all four players. Existing stale-input bounds, role
  limits and authority safeguards must remain unchanged. This is functional
  simulation/network work, **not a visual-only model swap**.

## Performance and implementation limits

Retain the base ceiling of 24 bots, under 80 draws and 120k visible triangles.
Four tier-III vehicles at their 4k ceilings add at most **16,000 triangles**.
The historical synthetic six-model benchmark was **8 draws / 69,520 triangles**;
adding 16k arithmetically gives 85,520, not a measured expanded-scene result.
Four single-mesh vehicles suggest four extra mesh submissions, but actual draw
counts and complete worst-case content must be profiled after delivery.

DPR 1, render cap 1280×720, local three.js r160 with WebGL1 support and a **60fps
hardware target**, not a measurement. No new physics framework, network library
or backend. This renderer is SVG/Chromium/PIL, not the game's WebGL renderer.
Main personally reviews the two PNGs; image generation is not runtime QA.

## Reproduction and evidence

Renderer source: `docs/circuit-ward-vehicles-render.py`. Reuses the native SVG
perspective/painter-sorting, local-font Chromium capture and existing packages
technique from the original external `shooter-concepts/render.py`; no dependency
installation. Root-relative font resolution and `shutil.which('chromium')` avoid
machine-specific committed paths. Set `TMPDIR` to the task's system temporary
root before rendering; the script appends `circuit-vehicle-amendment`. Render only
into an empty PNG workspace, preserving already reviewed evidence.

```sh
python3 docs/circuit-ward-vehicles-render.py --check
python3 docs/circuit-ward-vehicles-render.py
```

The embedded runnable check validates the 24-panel count, triangle ceilings,
16k increment, straight/angled camera projection, HTML budget and concept labels.
Chromium capture asserts fonts loaded, records/blocks external HTTP(S) requests,
and closes its browser; no server remains running. PIL checks dimensions and
optimizes indexed-color PNGs. Exactly two PNGs and their combined byte budget
are asserted after capture. No game/browser performance, regression or ALL-games
release gate is claimed by these concept checks.

Actual final capture output:

```text
concept checks PASS; frames=2; HTML bytes=76221
01-vehicle-fps.png: 1280x720; bytes=26211
02-tier-lineup.png: 1280x720; bytes=45302
2 RENDERED CONCEPT illustrations; PNG bytes=71513; external requests=0; not gameplay or built assets
```

Final PNG SHA-256 values:

- `01-vehicle-fps.png`: `b5a4cb39ad90e5cfa1f8e02c691ced047fe9f8eb3d8d2bbad659638bb3c27f55`
- `02-tier-lineup.png`: `87624740d2448b5658e266a4ac4b61b16963b5d36a2c40cc6bea8b48e6f89ca6`

Two PNGs total **71,513 bytes**; two HTML sources total **76,221 bytes**;
external workspace growth **147,734 bytes**. Repository growth is limited to
this doc and its small renderer source. No packages were installed or game
assets materialized. Disk observation remained **2.3G free** before/after;
rounded `df` output is not a precise free-space delta.

The worker inspected both images and corrected an angled-camera projection
error before the final capture; main's personal review is still pending.
The runnable projection check now covers the angled camera as well.
Catalog schema/unique-ID/tracked-URL check output was:
`catalog schema/unique IDs/tracked URLs PASS: 113 games; no additions by this task`.
Scoped diff whitespace check passed. No scripts under `Games/` were touched;
Node syntax checks are not applicable to this Python/SVG-only task.
**Zero release-gate runs** were performed here: the main-owned ALL-113 gate
remains required after workers commit and freeze. No new games, no release
claim and no push. This worker freezes repository edits after its own
explicit-path docs/renderer commit.
