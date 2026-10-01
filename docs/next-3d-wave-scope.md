# Next 3D wave: latest operator order

## Sequence and ownership

**Release current Circuit Ward first.** Its updated regression and unchanged
ALL-121 gate are pending; see [circuit-ward-qa.md](circuit-ward-qa.md).
This document records future scope only: no pitch, roster, art or build work now.

After release:

1. Submit **two separate Creative pitch tickets**, each with its required art,
   and wait for operator response before code.
2. Submit a **2–3-candidate open-source 3D port shortlist ticket** with verified
   license/provenance, pinned source, author and asset terms; wait for choice.
3. Build **exactly three new games**, sequentially:
   **Creative 1 (223) -> Creative 2 (224) -> selected port (225)**.

`games.json` currently has 121 entries with unique IDs; **223, 224 and 225 are
free** at this docs milestone. Recheck the actual catalog before allocating;
these numbers are not standing reservations or permission to add more games.

Every 3D worker must use separate **provider=`openai-codex`** and
**model=`gpt-6.1-sol`** flags, actually verify both, and work in bounded
10–20-minute tasks with disjoint paths and explicit-path commits. No substitute
provider/model. The orchestrator owns design, model/concept/pitch decisions,
review and UI judgment; workers perform mechanical implementation/collection.
No overlapping builds, speculative scaffolds, unrequested pushes or bypass of
full-game release gates.

## Creative 1, intended id 223

Original RTS with a command view over a 3D base arena. Waves, building/turret
placement, unit abilities on **1–4**, and merging **two surviving adjacent units
of the same type and tier**. Use **three or four visible tiers**, with larger
geometry, color and added parts showing upgrades. Strategy centers on keeping
units alive versus tempo, not just action speed.

Mouse click to place/select; touch supports 44px tap targets and dragging.
Matte cream, amber and steel-blue palette. Local three.js **r160**, WebGL1,
offline solo; **60fps is a target, not a measured claim**. No backend or co-op
in v1 and no scaffolding for those deferred features.

Before code, its individual operator ticket must include a concept name, core
loop, controls, **at least three rendered concept frames**, Dot model wishlist,
GLB delivery specifications and per-model triangle ceilings. Do not design these
assets in this documentation task.

## Creative 2, intended id 224

An **original monster-collector RPG**, with no existing franchise or trademark
names anywhere in its concept, roster, art, filenames, copy or tickets.

The latest launch minimum is **80 original species**. This supersedes the older
30-species scope; do not implement the older minimum. Plan approximately
14–17 species per each of **five original elements**, with exact distribution
decided in the later pitch.

The pre-code ticket needs a **full roster appendix** giving every species its
own name, element, tier, four abilities and individually assigned base **HP,
energy, attack, defense and speed**. Document single-, double- and triple-stage
evolution structures. Share body geometry within families using species-specific
hues and parts; **do not request 80 unique models**.

Add a separate **family-grouped GLB production appendix**: each family's base
geometry, each species' hue/part differences, and clearly marked boss/key unique
model candidates. Include the Dot wishlist, GLB specifications and triangle
ceilings. Do not design the roster or art now.

Gameplay: third-person 3D zones with tap-waypoint movement, weakening wild
creatures to capture them with an original device, a team of three with one
active creature, and turn-based battles. Five-element wheel, four abilities,
HP/energy/status, switching, XP and evolution. Include rival dialogue,
intro/outro camera work and ability zoom, with Reduce Motion support and 44px
controls. Local **r160**, WebGL1 and offline play.

Its individual pre-code operator ticket must contain **at least three rendered
frames, including two original creature concept shots**, the full 80-species
stat appendix and the family-grouped production appendix. Submit and wait
before implementation.

## Selected open-source port, intended id 225

Only after the two individual Creative pitches, submit 2–3 legitimate
open-source 3D candidates for operator choice. Verify upstream revision,
redistribution license and asset terms; preserve author/source attribution and
notices. No remote iframe substitution or invented provenance. Port the selected
working game after Creative 1 and Creative 2, not concurrently. Source or license
failure is a blocker, not permission to invent a replacement.
