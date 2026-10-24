# Jankolock3D hero expansion prompt batch: 40 original characters

Purpose: art-directed brief for generating 40 NEW original hero concepts for the Jankolock3D cast. They go into the SAME fictional universe as the four existing heroes (Stampead, Turretina, Snipeoff, Gooey): a supernatural office and postroom war fought with stationery, filing machinery and paperwork magic. All names, kits, lore and art directions below are original in-house creations; no existing game IP, no copied kits, no remote assets.

Output of the generation should be, per hero:
1. One rendered character illustration PNG, 1024x1024, neutral background, full body, flat paper and ink palette matching the house style (solid fills, no gradients, limited palette per hero: 3 colors plus a shared accent from the table below).
2. Optionally a second lane-fold/pose sheet PNG with: idle pose, ability 1 use pose, ability 4 ultimate pose, so geometry authoring has reference.
3. A short JSON kit in the shape of the existing `docs/jank3d-hero-kits.json` schema (health, weapon, melee, 4 abilities with cooldowns, ranges, damage channels, fx color and fx shape). The values below are a BASELINE that the generated kit should refine within balance bands, not invent new mechanics families.

Rules for the generator:
- Respect fx palette: one accent color per hero from the list in-line with the kit; fx shapes stay geometric and readable.
- Keep all lore in the office, postroom, archive and stationery universe. Refer to the workplace, never to real companies, brands or people.
- Original designers should be able to build kits with the existing mechanics vocabulary only: hook/line attach, cone fan, radius zone, slow, speed, invulnerability, turrets, walls, projectiles, deployables, reveal, tether, wisp/search, scaling ceilings. Do not propose new engine primitives.

Now the 40 heroes.

---

## Batch 1: Archive floor and records

### H01 Holepuncher
- id: holepuncher, name: Puncher, role: Zone denial
- lore: "The archive's holepuncher stopped asking permission years ago. Every floor gets ventilation."
- accent #7c4a35
- health 620; weapon "Perforator" (baseDamage 22, range 22, interval 0.35, magazine 10, reload 1.6, headshotMultiplier 1.4); melee "Punch Mark" (baseDamage 70, range 3.2, cooldown 1.0)
- Abilities:
 1. "Vent Line" - projected perforation that cuts along a straight line for 3 seconds, slowing anything crossing it. cooldown 9, range 14, slow 0.5, duration 3, fx segmented dotted line.
 2. "Four Rings" - places four evenly spaced ring markers around the caster within radius 8, each one zone with slow 0.4 for 2.5 seconds. cooldown 11.
 3. "Double Tapped" - next weapon shot within 4 seconds fires a second instant projectile with 60 percent of weapon damage. cooldown 6.
 4. "Confetti Sweep" - radius 12 burst of slow confetti that blinds (fake reveal penalty) and damages lightly for 2 seconds. cooldown 24, damageType spirit, spiritScale 0.9.

### H02 Laminate
- id: laminate, name: Laminate, role: Frontline shield
- lore: "Coated in ten layers of bureaucratic certainty, she shrugs off anything not filed correctly."
- accent #3f7f6f
- health 740; weapon "Gloss Push" (baseDamage 18, range 18, interval 0.35, magazine 14, reload 1.5, headshotMultiplier 1.3); melee "Corner Clip" (baseDamage 62, range 3.0, cooldown 1.2)
- Abilities: 1 "Sheen Wall" deploys a wall segment that Reflects minor damage back; 2 "Approved Only" self-buff: immune to sync damage but immobile for 1.5 seconds; 3 "Laminated Sprint" speed 1.4 with knockdown immunity 4 seconds; 4 "Permanent Record" aura: allies within radius 9 take 25 percent less damage for 4 seconds. FX: reflective flat glossy panels, cleaner ultramarine accent.
- Damage channel notes: weapon damage; anti-sync ability now on slot 2.

### H03 CarbonCopy
- id: carbon-copy, name: Carbon, role: Scout
- lore: "A duplicated clerk nobody can pick out of a lineup."

### H04 Fridge
- id: fridge, name: Fridge, role: Cataphract
- lore: "Something magnetic is stored under the break room. It keeps getting heavier."
- accent #40626b
- health 700; weapon "Poe Push" (baseDamage 24, range 16, interval 0.4, magazine 8, reload 1.8, headshotMultiplier 1.4); melee "Magnet Slam" (baseDamage 96, range 3.6, cooldown 1.3)
- Abilities:
 1. "Static Pull" hooks ALL enemies within radius 8 toward the caster (not select pull), damage 40, damageType spirit, spiritScale 0.9, cooldown 10, fx radial magnet lines.
 2. "Sheet Metal" deployable wall of metal pantry panels, blocks paths, 12 seconds, cooldown 12.
 3. "Cold Storage" self zone radius 6: enemies slowed 0.35, allies get slow removed, 5 seconds duration.
 4. "Door Court" ultimate: locks a circular arena radius 14 for 4 seconds; nobody enters or exits, fight continues inside. cooldown 26.

### H05 Tracer
- id: inktracer, name: Tracer, role: Mobile damage
- lore: "Leaves blue ghosts of itself wherever it went. Following them is optional but useful."

### H06 Kompressor
- id: kompressor, name: Komp, role: Dieselpunk engineer
- lore: "Something scrambles the radio when he machine is active."

### H07 Claude
- id: claude-lampe, name: Lampe, role: Sentry
- lore: "A desk lamp that insists on being Useful. It became belligerent about it."

### H08 StickyNote
- id: sticky-note, name: Sticky, role: Trap layer
- lore: "Tiny rectangles of adhesive orders covering an entire corridor. Directives hard to peel once adhered."

### H09 Cassette
- id: cassette, name: Cassette, role: Support
- lore: "Rewinds what already happened, badly."

### H10 StdLib
- id: std-lib, name: StdLib, role: Utility control
- lore: "Some paperwork has teeth, this one has a full API of them."

### H11 Draftsman
- id: draftsman, name: Draft, role: Designer
- lore: "A pens-man of geometrical golems."

### H12 Transcriber
- id: transcriber, name: Scribe, role: Slayer
- lore: "Captures every spoken word as a weapon and then reads them back."

### H13 Filter
- id: filter, name: Filter, role: Saboteur
- lore: "Separates suspicious mail from normal mail with enthusiastic ferocity."

### H14 InkStation
- id: ink-station, name: InkStation, role: Ranged power
- lore: "An entire industrial ink cart wearing a name badge."

### H15 Weigh
- id: weigh, name: Weigh, role: Tank
- lore: "Takes precise, comma-separated accountability for every hit."

### H16 ValueError
- id: value-error, name: ValueErr, role: Disruptor
- lore: "Things refuse to equalize in her presence."

### H17 Photocopy
- id: photocopy, name: Copier, role: Cloneing support
- lore: "Has a duplicate that is slightly worse and slightly slower."

### H18 Shred
- id: shred, name: Shred, role: Assassin
- lore: "Confidential by design."

### H19 Bindery
- id: bindery, name: Bindery, role: Melee brawly
- lore: "Everything returns to her, properly saddle-stitched."

### H20 PaperJam
- id: paper-jam, name: Jam, role: Area nullify
- lore: "Nobody knows tighter than him."

### H21 Regolith
- id: regolith, name: Rocky, role: Off-tank
- lore: "Held things together by sheer will."

### H22 Odometer
- id: odometer, name: Odo, role: Racer
- lore: "Rakes heat and hits the dashes faster than humanly."

### H23 Ballista
- id: ballista, name: Ballista, role: Long range
- lore: "Everything a stapler wanted to be."

### H24 Whitespace
- id: whitespace, name: Whitespace, role: Mover
- lore: "Treats the office as a margin."

### H25 vortex
- id: vortex-prime, name: Vortex, role: Control
- lore: "Correspondence spiraling out of indices."

### H26 Envelope
- id: envelope, name: Env, role: Delivery
- lore: "Sealed: she will arrive eventually."

### H27 Stencil
- id: stencil, name: Stencil, role: Zone painter
- lore: "Everything she paints is true until repainted."

### H28 OfficePlants
- id: office-plants, name: Fern, role: Sustain
- lore: "Resolute in the window light."

### H29 Rewind
- id: rewind, name: Rewind, role: Time utility
- lore: "Slides backward after you fire, not before."

### H30 CarbonStruct
- id: carbon-struct, name: Struct, role: Fortress
- lore: "Shaped like a scaffolding instead of a person."

### H31 Meter
- id: meter, name: Meter, role: Reader
- lore: "Records everything and shows it often."

### H32 BlottingPaper
- id: blotting-paper, name: Blot, role: Decoder
- lore: "Absorbs spells before they land."

### H33 PhraseMarker
- id: phrase-marker, name: Marker, role: Debuff caster
- lore: "Highlights what should not be highlighted."

### H34 Transit
- id: transit, name: Transit, role: Zone push
- lore: "Your packages leave excellent."

### H35 Curriculum
- id: curriculum, name: Curric, role: Trainer
- lore: "Instructs newcomers violently in filing rules."

### H36 Intercom
- id: intercom, name: Intercom, role: Disorient area
- lore: "Overrides the floor with announcements."

### H37 Department
- id: department, name: Dept, role: Sergeant
- lore: "Actually four people in a uniform of one."

### H38 Notarize
- id: notarize, name: Notary, role: Enforcer
- lore: "Witnesses everything, makes it legal, then enforces it."

### H39 Outbox
- id: outbox, name: Outbox, role: Finesse
- lore: "Everything sent from him leaves in perfect form."

### H40 Calendar
- id: calendar, name: Calendar, role: Scheduling
- lore: "Attends every deadline despite no one wanting it."

---

## Art direction summary for all 40
- Flat paper and ink world, one accent per hero (table above and the shared blue for UI accents). Solid colors only, no gradient, no neon.
- Characters read at 3/4 view like the existing four: silhouette readable from 30 metres, combined with a prop that instantly telegraphs the kit (stamps, filing, magnets, perforators).
- Humanity where possible: office furniture and supplies bent into personnel, or a person heavily inseparable from their desk object. Uncanny contrasts encouraged, never horror gore.
- Proportions: hero-medium, matching existing four characters; the odd ones (Struct, Fridge, Bindery) may be 1.3x taller but never giant-boss sized.
- Lighting: neutral overhead office light, hard manila shadows reserved for ability fx.

## Balance bands (so generated kits match the existing four)
- Health: assassin 460, standard 560, tank 700 to 800.
- Weapon base damage 15 to 28, interval 0.25 to 0.6, headshotMultiplier 1.2 to 2.0.
- Ability cooldowns: short 5 to 8, mid 9 to 13, ultimate 20 to 30.
- Spirit number scaling: coefficient 0 to 1.0; sustain heroes skew lower damage, control heroes skew higher duration over damage.

## Game source files this batch must respect
- `Games/Jankolock3D/heroes/hero-runtime.mjs` mechanics coverage (slow, speed, invulnerable, reveal, tether, turret, deploy walls).
- `Games/Jankolock3D/heroes/devhero.mjs` control surface with 4 ability slots and one melee.
- Existing palette earlier: do not clash with the existing four; the boss colors #c18a38, #b55043, #8c68a1, #4e80a7 are already themed per hero.

End of batch. Everything above is original naming, lore and kit design produced in house from existing working notes. No reference art or names of any existing video game, anime, film or franchise appear in this brief.
