# Wings aircraft quality contract (standing rule for ALL agents)

Applies to every orchestrator/worker touching Games/Wings models, tuning, or
rendering. Created 2026-10-16 after operator rejected the first F-35 build.

## MANDATORY pre-work study phase (no exceptions)

Before generating, editing, or integrating ANY aircraft model or related game
behavior, agents MUST comprehensively study:

1. The existing game's OTHER planes first: load each GLB, measure triangles,
   materials, colors, scale. Read `aircraft-*.js` model registry entries
   (pivots, stores, afterburners, anchors, placeholder dims) for fa18 / a10 /
   yf12 / apache / b2 and understand exactly what the renderer does with each.
2. The renderer pipeline: how upstream renders models (aircraft.ts, toon.ts,
   scene.ts): afterburner cones, missile store pivots, gear pivots, shadow
   polygons, cockpit/bombsight/gunner camera offsets.
3. The upstream game itself: spawn flow, weapon systems per vehicle kind, bot
   weights, audio hooks. Play-relevant code, not just assets.

Write findings into the task notes BEFORE authoring. If a new plane's look or
behavior would sit outside the family, fix it BEFORE committing, not in a
follow-up pass.

## Appearance family rules (operator-set)

- ALL aircraft share the dark house palette: near-black base (#1d1f20 to
  #2c2f30 range), gray mid-tones, dark accents. No bright-white airframes.
  Operator: "the planes are white while the others are black, make them all
  black."
- Silhouette fidelity: a plane named F-35 must LOOK like a real F-35 to an
  operator's eye, not "F-35-like". Same for every named real aircraft. Do not
  ship wrong proportions (nose length, canopy position, wing sweep, tail cant,
  intake shape) and call them done. Render and compare against reference
  BEFORE commit.
- Never use qualifiers like "F-15-style"/"F-35-style" in docs or UI as cover
  for inaccurate shapes. If the shape is not recognizably the real aircraft,
  the work is not done.

## Visual completeness rules (operator findings from the first build)

- Exhaust: jets need working afterburner/exhaust entries in the model registry
  (pivots/afterburners like fa18's `afterburner_L/R` cones or yf12's), not
  empty arrays. No exhaust animation = incomplete.
- Weapons: named real fighters need visible weapons - underwing/underfuselage
  missile stores via `stores:` + `pivots:` entries (fa18 pattern: missile_L1/
  L2/R1/R2 + wingtip rails; a10 pattern; yf12 internal bay pattern for stealth
  craft). F-35: internal bay doors + missiles appearing from `weapon_bay_L/R`
  anchors. Empty `stores:[]` on a fighter is incomplete.
- No shared weapon clone behavior: weapon loadout follows the game's tuning
  tables and kind system; a fighter gets fighter-appropriate fit (gun +
  missiles) matching the fa18 structure unless the operator orders otherwise.
- Cockpit, camera offsets, exhaust anchors, bombsight offsets derive from the
  model's actual geometry, never copied from another plane's constants.

## Process

- Study, match, verify visually, then commit. The "style" qualifier never
  substitutes for accuracy.
- Universal: any future aircraft added to Wings (or a similar game) follows
  the same study-first pipeline.
