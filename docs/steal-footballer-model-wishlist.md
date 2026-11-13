# Steal a Footballer model wishlist for Dot

Create a cohesive 3D art pack for **Steal a Footballer for Your Team**, an
existing solo browser game. Aim for stylized human proportions and recognizable
footballer faces, hairlines, hairstyles and builds. Superstars and Icons should
be distinguishable without their names or shirt numbers. Natural-looking hair
is a particular priority.

The complete roster is **125 entries representing 124 people**. Use the attached
[roster manifest](steal-footballer-roster-models.json) for IDs, names, appearance
hints, kit colors and variant mapping. Share Yamal's likeness between `yamal`
and `yamal_superstar`; give the Superstar presentation its own optional visual
treatment through reusable materials/accessories.

## Priorities and first delivery

| Priority | Deliverable | Coverage |
| --- | --- | --- |
| P0 | One reference athlete, shared rig and six finished likenesses | Messi, Cristiano Ronaldo, R9, Henry, Maldini and Ronaldinho |
| P1 | Remaining featured players and legends | Maradona, Neymar, Mbappe, Yamal, Zidane and Beckham |
| P2 | Complete roster | Remaining 112 people, using the same style and skeleton |
| P3 | World and equipment polish | Reusable models for every current asset family listed below |
| Optional | New visual representations of existing mechanics | Carrying, thieves, shields, eggs and held defense tools |

First deliver one reference body and the six P0 heads, with front, side and
three-quarter stills plus a short pose demonstration. Establish the quality and
shared attachment standard before producing the rest of the roster. The full
wishlist remains the delivery scope; use these batches to keep corrections
small.

The highest-value external work is individually sculpted likenesses, believable
hair, clean skinning and authored motion. The current game already creates
bodies, generic people and world props procedurally. P3 provides a complete
optional polish inventory for those assets, which can remain in their existing
form while character work lands.

## Character model and integration contract

These are **proposed delivery conventions**. The current game uses a procedural
`ActorFactory`; it still needs an imported-character loader and animation
adapter before this pack can appear in normal play.

- Deliver local, self-contained **glTF 2.0 binary `.glb`** files, plus editable
  source files and a manifest. Embed runtime textures. Use ordinary opaque
  materials and standard geometry; keep the initial pack free of decoder or
  custom-shader requirements.
- Author one unit as one metre, Y up, character front facing local **-Z**. Put
  the origin on the ground between the feet. Use a neutral A-pose, applied
  transforms and consistent bind pose across the pack.
- Use a 1.8-metre reference athlete. The browser's current reference actor is
  about 6.1 world units tall, so the future adapter can apply a base scale of
  `6.1 / 1.8`, then the catalog's `heightScale` and `buildScale` once each.
- Supply lean, standard and strong body shapes through compatible meshes or
  modest morphs on the same skeleton. Keep head and hair attachment positions
  consistent. Give goalkeepers compatible gloves and kit parts.
- Use a shared humanoid skeleton with hips, spine, chest, neck, head, shoulders,
  upper arms, forearms, hands, thighs, shins, feet and toes. Keep it within
  32 bones and four skin weights per vertex for the initial delivery. Provide
  the exact hierarchy and bind transforms in the pack.
- Provide interchangeable heads with neck seams hidden by the collar. Heads,
  hair, beards and accessories must follow the shared head/neck bones. Include
  an assembled character example that demonstrates the correct attachment.
- Keep skin, hair, shirt primary, shirt secondary, shorts, socks, boots and
  gloves independently customizable. Preserve solid, stripes and hoops kits,
  and space for runtime name/number printing.
- Use the manifest's appearance colors and proportions as starting hints.
  Agree on reference images/era for each likeness before final sculpting;
  existing catalog hair labels and club links are not a fresh photographic
  likeness check.

### Per-character performance budget

| Resource | Requested limit |
| --- | --- |
| LOD0, assembled body plus head, hair, boots and accessories | Under 4,000 triangles; aim for 2,500–3,500 |
| LOD1 | About 1,500–2,000 triangles |
| LOD2, crowd/distant figures | About 500–900 triangles |
| Renderable parts/material groups | At most 7; aim for 2–4 |
| Head/face texture | 512 x 512 starting target; use a larger atlas only when the visible benefit is clear |
| Shared body/kit atlas | 512 or 1024 x 1024, reused across the roster |
| Unique head package | Aim below 512 KiB per likeness at LOD0; report actual sizes |

LOD limits include hair and facial hair. A 4,000-triangle body with additional
unbudgeted hair does not meet the assembled-character budget. Preserve
silhouette, face readability and hairline at lower detail. Share bodies,
materials, rigs and hair bases across compatible characters to keep downloads
and memory modest. Use opaque sculpted hair volumes with restrained surface
detail; dense individual strands and layered transparent cards are unsuitable
for this first browser pack.

## Hair and facial likeness requirements

Each person needs an individual hairline, face shape, brow, nose, jaw, ears and
facial-hair silhouette. Shared hair families support production, while each
player's cut, parting, fringe and hairline should match the approved reference.

| Hair family | Current entries | Shape requirement |
| --- | ---: | --- |
| Cropped | 23 | Close fitted scalp, natural front/temple line and subtle surface texture |
| Fade | 24 | Clear transition from close sides into the top; avoid a hard helmet edge |
| Quiff | 40 | Attached swept volume, visible direction and asymmetry; avoid a flat roof or broad slab |
| Curls | 12 | Cohesive curly volume with varied clumps; avoid a row of separate beads |
| Afro | 1 | Dense rounded volume with a softly broken silhouette |
| Ponytail | 3 | Swept roots, visible tie/attachment and a tail that follows the back of the head |
| Long slicked hair | 8 | Swept crown and natural nape, with believable side volume |
| Braids | 6 | Scalp-rooted rows with partings and attached ends |
| Locs | 3 | Rooted locks, varied thickness/length and coherent mass |
| R9 fringe | 1 | The distinctive short front patch on an otherwise closely shaved head |
| Bald | 4 | Clean scalp and individually recognizable head shape |

The catalog also contains four facial-hair treatments: **47 clean-shaven,
44 stubble, 22 beard and 12 goatee entries**. Fit facial hair to cheeks and jaw;
use a consistent style for mustaches, sideburns and lips. Preserve the optional
headband and accent-color capability. Doue's existing profile includes a hair
accent; Alisson's includes a headband.

## Animation pack

Provide in-place clips on the shared rig, with clean start/end poses, grounded
feet and no baked movement across the pitch. Gameplay owns position, speed,
ball flight and scoring. Keep the support foot planted during kicks, and make
the contact moment easy for an adapter to synchronize.

| Required clip | Current pose/event family |
| --- | --- |
| `idle_loop` | Idle and waiting |
| `run_loop` | World movement and match running |
| `dribble_close_loop` | Short alternating touches, lowered centre of gravity and balancing arms |
| `dribble_run_loop` | Faster carrying with longer touches, distinct from ordinary running |
| `pass_short` | Pass/kick action |
| `shoot` | Shot action |
| `feint` | Dribble take-on/stepover |
| `slide_tackle` | Tackle/slide action |
| `keeper_dive_left` | Keeper dive/save, left |
| `keeper_dive_right` | Keeper dive/save, right |
| `celebrate` | Goal/victory celebration |
| `block` | Defensive block |
| `fall_and_recover` | Foul/fall feedback |

### Signature move clips

These 12 gameplay skills share the character rig. Deliver recognizably distinct
motions with a marked contact frame, recovery frame, loop range if applicable,
and left/right-foot variants where the motion needs them. One reusable animation
can support multiple footballers with timing and posture adjustments.

| Gameplay ID | Featured player | Requested clip and motion |
| --- | --- | --- |
| `dribbleGlue` | Messi | `close_control`: low posture, compact alternating touches and quick shielding turns |
| `rocketShot` | Cristiano Ronaldo | `power_strike`: planted support foot, strong backswing and controlled follow-through |
| `speedBurst` | Mbappe | `burst_acceleration`: forward lean and a push touch into accelerating strides |
| `sambaStep` | Neymar | `samba_feint`: readable shoulder/hip feint and a wider lateral exit |
| `stepovers` | R9 | `stepover_chain`: alternating feet circling the ball, then an exit touch |
| `wingWeave` | Yamal Superstar | `wing_weave`: successive inside/outside touches with balanced upper-body movement |
| `slalom` | Maradona | `slalom`: short linked cuts with the ball close to the feet |
| `roulette` | Zidane | `roulette`: a sole drag through a shielded turn and an exit touch |
| `elastico` | Ronaldinho | `elastico`: outside-to-inside touch by the same foot with a sharp hip change |
| `finesseFinish` | Henry | `finesse_finish`: angled approach, open hips, inside-foot strike and recovery |
| `bendingDelivery` | Beckham | `bending_delivery`: planted support foot, curved approach and across-body follow-through |
| `anticipation` | Maldini | `anticipation`: low defensive stance, lane-reading side steps and a controlled interception reach |

The runtime already owns skill duration, movement and ball trajectory; clips
must not guarantee a successful take-on, pass or goal. Supply normalized contact
timings so touches can follow footwork without moving the authoritative ball
twice. Keep transitions clean between idle, run, close dribble, fast dribble,
signature move and recovery. Avoid sliding planted feet, pendulum-like straight
legs or large ball offsets that detach the ball from its carrier.

NPC teams use these same rigs and moves. Their saved training levels are
gameplay data; share existing models and clips at all levels. Do not export
separate bodies or duplicate animations for each NPC development level.

Optional supporting clips: walk, sprint, goalkeeper ready/catch, whistle,
controlled baton action, carrying a recruit and the matching carried-player
pose. Carry clips should come with paired attachment offsets. These optional
visuals need integration; they do not add new gameplay rules.

## Other people and crowds

Reuse the shared rig and body parts. These models are separate from the
124 named footballer likenesses.

| Asset ID | Model | Current use |
| --- | --- | --- |
| `avatar_club_owner` | Customizable club owner with neutral training outfit | One controllable YOU avatar |
| `npc_club_attendant` | Club attendant with readable staff outfit | Existing ClubAttendant service NPC |
| `npc_tactics_coach` | Coach with tracksuit and optional clipboard | Existing TacticsCoach service NPC |
| `npc_fitness_coach` | Trainer/physio with distinct outfit | Existing FitnessCoach service NPC |
| `npc_event_host` | Football event host with a distinct silhouette | Existing EventHost service NPC |
| `crowd_seated_pack` | A small family of reusable seated spectators | Existing stadium crowds, 8–24 visible by tier |
| `mystery_player` | Obscured generic recruit with customizable kit | Existing mystery conveyor actor |

Crowd variations should come from a few shared heads, hair shapes, outfits and
body colors. Include seated idle and a simple cheering pose. Keep crowd detail
below that of active footballers.

Eight hireable staff menu entries currently share four placed service actors.
Optional future staff appearances can cover attacking coach, defensive coach,
physio, passing coach, academy manager, Guardiola, Ancelotti and Klopp. Named
manager heads would require their own approved references. Individual hired
staff are not currently spawned as eight separate world characters.

## Complete world and equipment model inventory

Build modular pieces that can be instanced. The source has 12 club plots plus
one Practice XI plot, 234 roster display positions, 3,095 static primitives and
a reusable 261-part stadium template. Deliver reusable asset families rather
than a new monolithic map. Keep the existing positions, collision boundaries,
interaction pads, pitch coordinates and stadium progression intact during
integration.

All items in this table are **P3 optional art polish** for currently represented
asset families. Basic geometry, pitch paint and simple markers can stay
procedural.

| Asset ID | Deliverable | Assembly details |
| --- | --- | --- |
| `match_ball` | Readable football with restrained seams/panels | Shared sphere-based model; separate from the selection ring |
| `goal_full` | Goal frame and net | Separate frame/net groups; clear mouth and collision dimensions |
| `goal_mini` | Miniature goal variant | Reuse the full-goal design at the miniature pitch scale |
| `pitch_surface_detail` | Turf edge and restrained surface detail | Retain runtime pitch lines/stripes as reusable geometry or decals |
| `training_cone` | Training cone | One model with recolorable bands, heavily instanced |
| `roster_display_pad` | Player slot/display pad | Reused for 18 positions per plot; leave number/label areas blank |
| `deposit_pad` | Recruit deposit marker/platform | Keep its interaction footprint and readable landing area |
| `shield_pad` | Shield activation pad | Distinct shape and customizable status material |
| `upgrade_pad` | Club/stadium upgrade pad | Distinct silhouette, with room for dynamic labeling |
| `club_gate` | Entrance posts/gate | Modular opening sized to the existing paths |
| `sign_frame` | Club and service sign frames | Blank surfaces for runtime club names and labels |
| `dugout_shelter` | Dugout roof/rear wall module | Reusable shell with separate bench space |
| `dugout_bench` | Bench/seating module | One reusable segment |
| `trophy_cup` | Football trophy | Shared cup, handles and plinth; recolorable finishes |
| `trophy_shelf` | Trophy shelf/display | Modular shelf and supports |
| `conveyor_chassis` | Transfer belt chassis and rails | Preserve the existing conveyor path and market slots |
| `conveyor_tread` | Repeating belt segment | Separate rigid piece suitable for instancing/scrolling |
| `conveyor_roller` | Belt roller/support module | Consistent pivot for optional rotation |
| `shop_kiosk` | Shop counter, canopy and display window | Reusable structure with blank sign area |
| `event_stage` | Event counter/stage assembly | Separate blank countdown/sign panels |
| `kit_display_rail` | Rail with display jerseys | Recolorable shirt surfaces, no baked player names |
| `boot_display` | Boots and display stand | Shared boot models with tint/trim slots |
| `training_rack` | Training equipment rack | Reuse cones and props where practical |
| `stadium_seat` | Seat/back module | Shared geometry for terraces and crowd anchors |
| `grandstand_module` | Terrace/riser/steps section | Repeatable width, modular ends |
| `stand_roof` | Roof/canopy/post module | Compatible with the four existing stadium tiers |
| `floodlight` | Pole, bracket and light housing | Separate light face; lighting stays engine-controlled |
| `boundary_rail` | Pitch rail/barrier segment | Repeatable straight, corner and end pieces |
| `pitchside_board` | Advertising/club board frame | Blank customizable face |
| `scoreboard_frame` | Scoreboard and posts | Leave score/time faces blank for live UI |
| `perimeter_led_panel` | Stadium panel segment | Simple material slot; no baked animation/video |
| `tunnel_entrance` | Stadium tunnel/entrance section | Reuse existing walkway openings |
| `path_kerb` | Kerb/path edge | Repeating modules, modest polygon count |
| `bollard_light` | Courtyard bollard/light | Shared small prop |
| `club_tree` | A small family of original stylized trees | Reuse through scale/rotation variation |
| `garden_sculpture` | Football-themed garden sculpture and plinth | Original shape, consistent with the football setting |
| `club_coin` | Decorative club coin/token | Recolorable, readable silhouette |

Use shared atlases and simple collision proxies for props. Small props should
normally be a few hundred triangles; repeated furniture and goal/stand modules
should remain low thousands. Report the actual triangle/material counts for
each piece. Preserve instancing opportunities, especially seats, cones,
treads, rails and display pads.

The four stadium appearances are Home Pitch, Training Ground, Club Stadium and
Floodlit Stadium. Supply one compatible modular kit with tier assembly notes.
Twelve independently duplicated stadium exports would add needless download
and memory cost.

## Optional models for existing gameplay feedback

These mechanics exist, while their dedicated model/animation presentation still
needs implementation. Package them separately so their optional status is clear.

| Asset ID | Requested visual | Existing mechanic it represents |
| --- | --- | --- |
| `egg_academy` | Simple football academy egg/container | Academy Egg purchase |
| `egg_elite` | Distinct elite variant | Elite Egg purchase |
| `egg_icon` | Distinct Icon variant | Icon Egg purchase |
| `npc_rival_thief` | Rival-club recruit/raider variant on the shared rig | NPC theft alerts |
| `carry_attachment` | Paired carrier/carried poses and offsets | Carrying a stolen footballer home |
| `shield_state` | Lightweight visible shield marker/boundary | Timed base shield |
| `defense_whistle` | Held whistle | Existing defense action |
| `defense_baton` | Simple sports-game defense tool | Existing baton action |
| `sprint_boots` | Recolorable/equippable boot treatment | Temporary sprint boost |
| `income_boost_marker` | Small readable club bonus marker | Temporary income boost |

## Full player roster

`Head key` is the unique likeness ID and filename key. `Hair hint` comes from the
current catalog and should be refined against the approved reference. Roles
are the game's broad GK/DF/MF/ST categories, not a claim about a player's exact
real-world position. The JSON manifest contains the complete appearance fields.

<!-- roster:start -->
| Priority | Catalog ID | Player | Role | Head key | Hair hint |
| --- | --- | --- | --- | --- | --- |
| P0 | ronaldo | Cristiano Ronaldo | ST | ronaldo | quiff |
| P0 | messi | Lionel Messi | ST | messi | quiff |
| P0 | maldini | Paolo Maldini | DF | maldini | longslick |
| P0 | ronaldinho | Ronaldinho | ST | ronaldinho | pony |
| P0 | r9 | Ronaldo Nazário (R9) | ST | r9 | r9fringe |
| P0 | henry | Thierry Henry | ST | henry | bald |
| P1 | beckham | David Beckham | MF | beckham | quiff |
| P1 | maradona | Diego Maradona | MF | maradona | curls |
| P1 | mbappe | Kylian Mbappe | ST | mbappe | fade |
| P1 | yamal | Lamine Yamal | ST | yamal | curls |
| P1 | yamal_superstar | Lamine Yamal (Superstar) | ST | yamal | curls |
| P1 | neymar | Neymar Jr | ST | neymar | fade |
| P1 | zidane | Zinedine Zidane | MF | zidane | bald |
| P2 | ramsdale | Aaron Ramsdale | GK | ramsdale | quiff |
| P2 | bastoni | Alessandro Bastoni | DF | bastoni | quiff |
| P2 | macallister | Alexis Mac Allister | MF | macallister | quiff |
| P2 | alisson | Alisson Becker | GK | alisson | longslick |
| P2 | areola | Alphonse Areola | GK | areola | fade |
| P2 | rudiger | Antonio Rudiger | DF | rudiger | cropped |
| P2 | bento | Bento | GK | bento | quiff |
| P2 | bernardosilva | Bernardo Silva | MF | bernardosilva | cropped |
| P2 | leno | Bernd Leno | GK | leno | quiff |
| P2 | barcola | Bradley Barcola | ST | barcola | braids |
| P2 | brunofernandes | Bruno Fernandes | MF | brunofernandes | quiff |
| P2 | saka | Bukayo Saka | ST | saka | cropped |
| P2 | kelleher | Caoimhín Kelleher | GK | kelleher | longslick |
| P2 | palmer | Cole Palmer | MF | palmer | cropped |
| P2 | gallagher | Conor Gallagher | MF | gallagher | longslick |
| P2 | raya | David Raya | GK | raya | fade |
| P2 | upamecano | Dayot Upamecano | DF | upamecano | cropped |
| P2 | deanhenderson | Dean Henderson | GK | deanhenderson | quiff |
| P2 | rice | Declan Rice | MF | rice | quiff |
| P2 | diogocosta | Diogo Costa | GK | diogocosta | fade |
| P2 | doue | Désiré Doué | MF | doue | curls |
| P2 | eze | Eberechi Eze | MF | eze | locs |
| P2 | ederson | Ederson | GK | ederson | fade |
| P2 | emilianomartinez | Emiliano Martinez | GK | emilianomartinez | fade |
| P2 | enzofernandez | Enzo Fernandez | MF | enzofernandez | fade |
| P2 | haaland | Erling Haaland | ST | haaland | pony |
| P2 | fabianruiz | Fabian Ruiz | MF | fabianruiz | cropped |
| P2 | valverde | Federico Valverde | MF | valverde | quiff |
| P2 | wirtz | Florian Wirtz | MF | wirtz | quiff |
| P2 | dejong | Frenkie de Jong | MF | dejong | longslick |
| P2 | martinelli | Gabriel Martinelli | ST | martinelli | cropped |
| P2 | gavi | Gavi | MF | gavi | quiff |
| P2 | donnarumma | Gianluigi Donnarumma | GK | donnarumma | cropped |
| P2 | dilorenzo | Giovanni Di Lorenzo | DF | dilorenzo | cropped |
| P2 | goncaloramos | Goncalo Ramos | ST | goncaloramos | quiff |
| P2 | kane | Harry Kane | ST | kane | quiff |
| P2 | maguire | Harry Maguire | DF | maguire | cropped |
| P2 | lloris | Hugo Lloris | GK | lloris | quiff |
| P2 | igorthiago | Igor Thiago | ST | igorthiago | bald |
| P2 | grealish | Jack Grealish | ST | grealish | longslick |
| P2 | sancho | Jadon Sancho | ST | sancho | braids |
| P2 | musiala | Jamal Musiala | MF | musiala | curls |
| P2 | maddison | James Maddison | MF | maddison | quiff |
| P2 | bowen | Jarrod Bowen | ST | bowen | quiff |
| P2 | cancelo | Joao Cancelo | DF | cancelo | fade |
| P2 | joaofelix | Joao Felix | ST | joaofelix | curls |
| P2 | joaoneves | Joao Neves | MF | joaoneves | curls |
| P2 | stones | John Stones | DF | stones | quiff |
| P2 | tah | Jonathan Tah | DF | tah | cropped |
| P2 | pickford | Jordan Pickford | GK | pickford | longslick |
| P2 | kimmich | Joshua Kimmich | MF | kimmich | quiff |
| P2 | bellingham | Jude Bellingham | MF | bellingham | fade |
| P2 | kounde | Jules Kounde | DF | kounde | braids |
| P2 | julianalvarez | Julian Alvarez | ST | julianalvarez | quiff |
| P2 | havertz | Kai Havertz | ST | havertz | curls |
| P2 | kepa | Kepa Arrizabalaga | GK | kepa | quiff |
| P2 | debruyne | Kevin De Bruyne | MF | debruyne | quiff |
| P2 | schade | Kevin Schade | ST | schade | curls |
| P2 | trapp | Kevin Trapp | GK | trapp | quiff |
| P2 | kvaratskhelia | Khvicha Kvaratskhelia | ST | kvaratskhelia | quiff |
| P2 | trippier | Kieran Trippier | DF | trippier | fade |
| P2 | coman | Kingsley Coman | ST | coman | braids |
| P2 | mainoo | Kobbie Mainoo | MF | mainoo | locs |
| P2 | walker | Kyle Walker | DF | walker | fade |
| P2 | lautaromartinez | Lautaro Martinez | ST | lautaromartinez | fade |
| P2 | goretzka | Leon Goretzka | MF | goretzka | quiff |
| P2 | sane | Leroy Sane | ST | sane | afro |
| P2 | luisdiaz | Luis Díaz | ST | luisdiaz | fade |
| P2 | shaw | Luke Shaw | DF | shaw | quiff |
| P2 | neuer | Manuel Neuer | GK | neuer | cropped |
| P2 | terstegen | Marc-Andre ter Stegen | GK | terstegen | quiff |
| P2 | rashford | Marcus Rashford | ST | rashford | fade |
| P2 | thuram | Marcus Thuram | ST | thuram | cropped |
| P2 | marquinhos | Marquinhos | DF | marquinhos | curls |
| P2 | olise | Michael Olise | ST | olise | locs |
| P2 | maignan | Mike Maignan | GK | maignan | cropped |
| P2 | damsgaard | Mikkel Damsgaard | MF | damsgaard | cropped |
| P2 | salah | Mohamed Salah | ST | salah | curls |
| P2 | nathancollins | Nathan Collins | DF | nathancollins | quiff |
| P2 | pope | Nick Pope | GK | pope | cropped |
| P2 | schlotterbeck | Nico Schlotterbeck | DF | schlotterbeck | quiff |
| P2 | barella | Nicolo Barella | MF | barella | quiff |
| P2 | nunomendes | Nuno Mendes | DF | nunomendes | braids |
| P2 | watkins | Ollie Watkins | ST | watkins | curls |
| P2 | dembele | Ousmane Dembele | ST | dembele | cropped |
| P2 | dybala | Paulo Dybala | ST | dybala | quiff |
| P2 | pedri | Pedri | MF | pedri | quiff |
| P2 | pepe | Pepe | DF | pepe | bald |
| P2 | foden | Phil Foden | MF | foden | fade |
| P2 | raphinha | Raphinha | ST | raphinha | fade |
| P2 | cherki | Rayan Cherki | MF | cherki | cropped |
| P2 | reecejames | Reece James | DF | reecejames | fade |
| P2 | richarlison | Richarlison | ST | richarlison | cropped |
| P2 | lewandowski | Robert Lewandowski | ST | lewandowski | quiff |
| P2 | robertsanchez | Robert Sanchez | GK | robertsanchez | fade |
| P2 | rodri | Rodri | MF | rodri | cropped |
| P2 | rodrygo | Rodrygo | ST | rodrygo | fade |
| P2 | rubendias | Ruben Dias | DF | rubendias | quiff |
| P2 | ruipatricio | Rui Patricio | GK | ruipatricio | cropped |
| P2 | gravenberch | Ryan Gravenberch | MF | gravenberch | fade |
| P2 | tonali | Sandro Tonali | MF | tonali | longslick |
| P2 | son | Son Heung-min | ST | son | quiff |
| P2 | ortega | Stefan Ortega | GK | ortega | quiff |
| P2 | theohernandez | Theo Hernandez | DF | theohernandez | fade |
| P2 | courtois | Thibaut Courtois | GK | courtois | cropped |
| P2 | alexanderarnold | Trent Alexander-Arnold | DF | alexanderarnold | braids |
| P2 | unaisimon | Unai Simon | GK | unaisimon | cropped |
| P2 | vinicius | Vinicius Junior | ST | vinicius | fade |
| P2 | vandijk | Virgil van Dijk | DF | vandijk | pony |
| P2 | janelt | Vitaly Janelt | MF | janelt | quiff |
| P2 | vitinha | Vitinha | MF | vitinha | quiff |
| P2 | saliba | William Saliba | DF | saliba | fade |
<!-- roster:end -->

## Delivery package

Use this proposed structure, with one common skeleton and reusable materials:

```text
steal-footballer-art/
  README.md
  manifest.json
  provenance.json
  rig/master_rig.glb
  bodies/athlete_lean_lod0.glb
  bodies/athlete_standard_lod0.glb
  bodies/athlete_strong_lod0.glb
  heads/<head-key>/head_lod0.glb
  heads/<head-key>/head_lod1.glb
  heads/<head-key>/head_lod2.glb
  animations/common_clips.glb
  npcs/<asset-id>.glb
  props/<asset-id>_lod0.glb
  previews/<asset-id>_front.png
  previews/<asset-id>_side.png
  previews/<asset-id>_three-quarter.png
  source/<editable-source-files>
```

Each manifest record should include the asset ID, covered catalog IDs, files,
LOD triangle counts, material/draw counts, dimensions, pivot, skeleton version,
clip names, texture dimensions, file sizes and SHA-256 hashes. State how the
body and interchangeable head are assembled, and include a tested assembled
reference character. Explain which delivery components are shared rather than
duplicated.

Record the author/generator, creation date, editable source, reference URLs and
the actual supplied reuse/redistribution terms. Use original mesh and texture
work. Roblox catalog asset IDs in the roster are metadata, not a request or
permission to extract those catalog meshes. Keep kit surfaces customizable and
use original or owner-approved marks.

## Acceptance checklist

1. Review the P0 characters from the front, side, rear and three-quarter view,
   including a close view of the hairline. Approve silhouette and likeness
   before extending that style to the full roster.
2. Demonstrate head/neck seams and hair attachment in running, kicking and
   keeper poses. Check for scalp holes, floating hair, detached ponytails,
   shoulder clipping and stretched skinning.
3. Show all 11 hair families, all four facial-hair treatments, boots/gloves and
   solid/striped/hooped kits on the shared rig.
4. Validate every file locally and report real geometry/material/texture counts.
   Confirm the assembled character meets the budget at each LOD.
5. Provide an all-roster contact sheet and an exact mapping of 125 entries to
   124 unique likenesses. Preserve stable IDs and the Yamal variant reuse.
6. Provide a local viewing scene that renders on demand or at a capped rate.
   Test the same rig across several differently proportioned players before
   exporting the remaining heads.
7. Keep reusable architecture separate from gameplay collision/interaction data.
   Final browser integration must preserve the game's economy, formations,
   physical positions and local saves.

Deliver assets and their manifest first. Game integration, visual acceptance
and performance acceptance are separate implementation steps; this brief does
not claim the proposed GLB pack is already loaded by the current browser game.
