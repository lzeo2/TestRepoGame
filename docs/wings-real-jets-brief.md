# Wings real-jets brief (operator-ordered 2026-10-15)

You are the ORCHESTRATOR. You have delegate_to_worker. BY DELEGATION: plan it, hand
implementation to workers, verify with your own reading of the diffs. Never absorb
worker tasks silently — delegation failure means retry the other worker model (all
astra here) then STOP and report, never do the work yourself.

Operator directive (verbatim intent): "use an actual plane ... f15 and f35, make
astra make it itself but use a lot of triangles and lock in both of them from
scratch." So: NOT vendor-downloaded meshes, NOT the current 328/368-tri fakes. The
existing `openai-codex/gpt-6-astra`-authored procedural generator gets extended to
author two REAL fighter aircraft from scratch as original geometry.

## Verified current state (do not re-derive)

- HEAD = ad34ed5, tree CLEAN. Prior fleet landed (124/125 gate, holds documented in
  docs/maintenance/audits/fleet-followup-handover.md - read it, do not undo holds).
- Wings models dir (locally sparse-checked): a10, ac130, apache, astra-interceptor
  (328 tris), astra-trainer (368 tris), b2, carrier, destroyer, fa18 (16,896 tris),
  yf12 (18,028 tris). Largest shipped model ac130.glb = 53,404 tris, 1.68 MB.
- Generator: `Games/Wings/verification/generate-models.py` (Python stdlib, zero
  deps, deterministic). Existing astra GLBs: indexed tris, flat normals, UV0,
  identity root, no textures/skins/animations.
- Integration: seven-aircraft hangar, keys 1-7; astra = slots 6/7. Selection via
  `StartRequest.aircraft`; tuning table + bot weights in docs/models.md.
- df -h / = ~2.2 GB free. DISK GUARD: if free < 1.5 GB, stop, commit, report.

## Task

1. Read docs/maintenance/games/232-wings.md, Games/Wings/docs/models.md, and the
   generator source before any edit. Print a short phase plan before editing.
2. Extend the generator (same file or sibling, keep stdlib-only + deterministic)
   to author TWO new models:
   - `f15.glb` (slot 6, replaces astra-interceptor): twin-tail twin-engine
     fighter, shoulder swept wings, rectangular intakes, bubble canopy, exhaust
     nozzles. TARGET 40,000-55,000 triangles.
   - `f35.glb` (slot 7, replaces astra-trainer): single-engine stealth fighter,
     trapezoidal wings, canted twin stabilizers, internal-bay underside, diamond
     intake. TARGET 35,000-50,000 triangles.
   - Triangle budget is a HARD floor and ceiling. NOTE (operator): the 53k-tri
   AC-130 is NOT player-selectable in the game - it is scenery, so it is NOT
   the load-experience precedent. The heaviest player-selectable precedent is
   yf12/fa18 at ~17-18k tris. The operator explicitly wants a lot of triangles
   anyway, so keep the 35-55k targets, but flag load-time delta in the report. Land gear either omitted
   (gear-up) or retracted flush - no dangling struts. Vertex-based flat materials
   (house palette, gray camo tones), NO textures, NO embedded images, NO skins,
   NO animation clips. Each file < 1.2 MB. Identity root transform, Y-up.
   - Names/tail codes: generic marks only, no real insignia. These are
   "F-15-style" and "F-35-style" builds; identical fuselage silhouette is the
   goal, exact unit markings are not.
   - MATERIAL RICHNESS PARITY (operator requirement after seeing in-game
   F/A-18F render): fa18.glb has ZERO textures but ~170 material assignments
   (dark cowl, light radome, blue tail accents, red marks, transparent canopy
   alpha .4, cockpit tub, pylons, separate missiles). Our jets currently ship
   5 flat materials - too sparse. Both f15 and f35 must ship comparable
   separation: transparent canopy, cockpit interior, two-tone panel splits,
   accent/marking color regions, landing-gear-up bays tinted differently,
   nozzle/interior metals, and (f35) open-and-dark bay door interiors. Target
   40+ material assignments per jet; still zero texture images.
3. Extend `astra-check.mjs` (or its successor) to validate both new models the
   same way: offline config/spawn/snapshot/simulation + GLB descriptors/camera
   math. It must PASS for both.
4. Integrate: hangar keys 6/7 select f15/f35; Custom setup Aircraft row +
   `StartRequest.aircraft` updated; tuning table rows for both aircraft
   (interceptor-style speed/corner/roll numbers tuned to model character -
   F-15 = fast high-rate, F-35 = slower, tighter-turning); bot weights zero
   (same as current astra).
5. Update Games/Wings/docs/models.md (provenance: original astra-authored
   geometry from x2, generator hash, triangle/byte table) and
   docs/maintenance/games/232-wings.md.
6. Regression: run the existing Wings verification set (astra-check successor +
   unavailable-GPU UI test + ordinary-input simulation regression). Do NOT claim
   native flight acceptance - simulation fixtures are not flight acceptance.
   The failed 122/125 full gate is NOT superseded; do not rerun the full 125
   gate, report the hold state as-is.
6b. STANDARDS SECTION (standing operator directive): every game doc in
   docs/maintenance/games/ must carry a "## Standards" section describing how
   the game's standards work and function (what counts as a PASS, which
   verification scripts exist, what holds are active and why, provenance rules,
   triangle/size budgets if applicable). For THIS task: write the full Standards
   section into docs/maintenance/games/232-wings.md. Pattern is reusable for
   other games later - keep it copy-adaptable: same five headings (PASS
   criteria, verification scripts, active holds, provenance, budgets).
7. Commit milestones (feat/fix/docs prefixes, explicit paths, NO push, NO origin
   writes). Delete the replaced astra GLBs + their generator remnants cleanly
   (trace consumers first). Final: clean `git status`, report commits, triangle
   counts measured from the ACTUAL files, byte sizes, disk delta.

## HARD RULES (anti-hang, proven)

- Every worker task small + bounded; one file/feature per task.
- Worker model on EVERY delegation: model openai-codex/gpt-6-astra (explicit
  model param), thinking "low" for mechanical tasks, "medium" for renderer/logic.
- Worker stalls/errors twice -> abandon that task, note it, continue. No worker
  task silently waits beyond 20 min.
- Print a one-line progress note before each delegation.
- No dev servers, no long-running tails. Bounded test servers must terminate.
- Never edit minified bundles; Vite + Bun rebuild via the documented recipe from
  pinned source (see 232-wings.md follow-up section).
- "report with evidence, never fabricate success" - quote actual command output.
- If tooling/policy blocks you (ask_hermes): write a ticket to ~/.swarm-help/
  with a concrete question, keep working on what you CAN, never fabricate.

## Deliverable report (final message)

- commits (full list), per-model: measured triangles / verts / file bytes,
- verification transcript summary (exit codes), docs updated, tree state,
- any abandoned tasks + open questions (numbered).
