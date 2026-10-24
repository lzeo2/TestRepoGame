# 3D Soccer Simulation: Feature and Dot Asset Wishlist

## Scope

An original, offline, single-player browser soccer simulation with realistic 11-a-side matches, multiple modes and a persistent player career. EA Sports FC and FIFA describe the intended genre, not sources of code, assets, player likenesses, commentary, branding or animation.

This document is a wishlist, not an implementation or performance claim. Club identities, budgets and competition rules below are proposals. This documentation order does not authorize game construction, asset generation, catalog registration, ID allocation, publication or push. Future implementation requires separate approval and documented asset rights.

## 1. Engine recommendation

### Preferred: Three.js with a focused custom animation controller

Use Three.js for rendering, glTF loading, skeletal animation and clip mixing. Add a football-specific controller for locomotion selection, transitions, contact timing, bounded motion warping and IK integration. Do not replace its renderer, skeleton evaluation or existing animation mixer.

Three.js fits a self-contained static browser project and the repository's existing rendering experience. Its flexibility lets the simulation own movement and ball contacts while animation visualizes them. The tradeoff is substantial custom football engineering: rendering libraries do not provide realistic football AI, foot planting or career systems automatically.

| Option | Strengths | Limitations and decision |
| --- | --- | --- |
| Three.js | MIT licensed; flexible PBR rendering, glTF loading, skeletal animation, clip mixing and instancing. | Preferred baseline. Football-specific animation coordination, rules, AI and physics integration remain custom work. |
| Babylon.js | Apache-2.0 licensed; integrated scene tooling, PBR, glTF, animation groups, blending, IK-related tools and physics integrations. | Strong alternative if its integrated tools reduce proven implementation effort. Physics plugins have separate dependencies and licensing requirements. It does not supply a complete football animation or simulation system. |
| Godot web export | MIT licensed; editor workflow, AnimationTree, skeletal tools and integrated game systems. | Consider if an editor-centered production workflow outweighs export payload and browser integration constraints. Test web compatibility, storage and offline delivery first. |
| Unity web export | Mature editor and animation ecosystem. | Requires licensing, payload, browser and deployment assessment. Not the default for this directly authored static browser project. |
| Unreal Engine | Extensive native-game animation and rendering tools. | Unreal Engine 5 has no first-party HTML5 export target. Not the practical default for this portal. |

- Recommend Three.js provisionally, not because its renderer inherently produces more realistic animation than Babylon.js. Motion quality depends on animation coverage, rigs, contact handling and simulation integration.
- Reuse suitable locally vendored components after checking their exact versions and licenses. Pin all selected dependencies and retain notices. No CDN scripts, remote textures or runtime downloads.
- Keep the simulation independent of scene objects. Animation must not decide goals, collision outcomes, transfers or saves.
- Begin with phase-aware clip blending and limited motion warping. Consider motion matching only after obtaining a sufficiently broad, legally usable motion database and demonstrating a benefit worth its preprocessing and runtime cost.
- Propose WebGL2 as the compatibility baseline with capability detection. WebGPU can be an optional enhancement, not a mandatory requirement or an assumed feature of every engine release.
- Before a final engine decision, compare the same scene in the candidate engine: 22 animated players, goalkeeper interaction, ball, stadium section and crowd LODs. Measure frame-time percentiles, memory and offline requests on actual target hardware. Inspect turns, planted feet and ball contacts at normal speed and in slow motion.
- No engine selection alone justifies a promise of EA FC-level production quality.

## 2. Player career and single-player modes

### Modes

- **Exhibition:** Choose fictional teams, venue, weather, difficulty and match length. Offer team control or a locked player.
- **Player career:** Create and control one player across complete seasons. AI teammates, managers and clubs continue making decisions around that player.
- **Season:** Play or simulate a club season without the personal contract layer. Preserve fixtures, standings, discipline and statistics.
- **Tournament:** Save and resume a fictional cup or configurable short league.
- **Training:** Passing, finishing, defending, goalkeeper drills, set pieces and free practice with useful feedback. Ordinary controls do not require grinding to unlock.
- **Spectator:** Watch AI matches and inspect match events and tactical positioning. Full replay capture is optional and separately budgeted.
- Every mode needs start, controls, pause, settings, progress/result, restart or next-fixture, and exit paths. No multiplayer or backend is proposed.

### Career creation and season loop

- Create an adult fictional player, starting at age 18 by default, with appearance, preferred foot, primary and secondary positions, height and athletic profile.
- Begin through a trial, academy-to-senior transition or direct senior contract at a modest club. Physical profiles affect plausible reach and movement rather than providing cosmetic-only differences.
- Advance through preseason, league and cup fixtures, training, recovery, transfer windows, contract decisions and end-of-season review.
- Play, watch or simulate fixtures. When substituted, injured, suspended or unselected, allow watching or advancing without forcing control of someone else.
- Simulate the full competition calendar, including other clubs. Persist results, tables, registrations, injuries, suspensions, finances and transactions coherently.
- Roll into subsequent seasons with promotion/relegation, aging, retirements, new prospects and contract expiry. Support a career through retirement with a historical summary.
- Track minutes, starts, appearances, goals, assists, cards, injuries, relevant goalkeeper statistics, honors, transfers and earnings. Retain compact season summaries rather than every simulation tick indefinitely.

### Development and selection

- Separate technical ability, physical capacity, tactical understanding, form and confidence. Examples include first touch, passing, finishing, positioning, anticipation, acceleration and endurance.
- Development reflects age, coaching, meaningful minutes, training focus, recovery and position. Improvement slows near a player's ceiling; aging and serious injuries can reduce physical capacity.
- Use weekly training plans with fatigue and recovery costs, not unlimited repeatable attribute purchases. Rehabilitation and gradual return matter after injury.
- Manager selection considers fitness, positional fit, tactics, training and form. Explain changes without guaranteeing starts through a hidden progression counter.
- Evaluate role-specific contribution. Holding midfielders and defenders should not need goals to receive good feedback. Include defensive positioning, passing choices, chance creation and mistakes.
- Injury risk reflects workload, exposure and contact with bounded randomness. Do not present the model as medical advice.
- Difficulty primarily changes AI decision quality and explicit assistance, not hidden ball physics, score-dependent speed boosts or goalkeeper reach.

### Transfers, loans and contracts

- Publish two fictional transfer windows per season, effective transfer dates, offer expiry, free-agent rules and registration restrictions. Do not imply exact reproduction of every country's regulations.
- Clubs recruit for positional need, age, ability, tactical fit, wages, budget and squad depth. Interest is not a guaranteed offer.
- Support permanent transfers, transfer requests, loans, loan returns and free transfers after contract expiry. State loan duration and recall rules before acceptance.
- Show expected squad role, likely minutes, competition level, coaching and tactical suitability alongside money.
- Contracts include term, salary, role, relevant bonuses, renewal terms and optional release clauses under the fictional rulebook. Allow counteroffers, rejection and remaining at the current club.
- Store money as integer minor units of a disclosed fictional currency. Clearly distinguish weekly and annual wages.
- Apply moves on their effective dates. A loan player cannot appear for both clubs; expired offers cannot be accepted after advancing time.
- Enforce sustainable budgets and registration capacity. Record fees, renewals, loans and contract changes in an auditable history.
- A free-agent, injured or unselected career must remain playable. Earnings do not require an unrelated luxury-shopping simulator.

## 3. Fictional clubs and league structure

### Proposed Merevale football pyramid

The fictional Merevale Football Association contains two senior divisions with 12 clubs each. All names are proposals, not legally cleared marks. Fictional naming reduces licensing dependencies but cannot guarantee that no real-world name collision exists.

| Premier Division | National Division |
| --- | --- |
| Alderport Athletic | Willowford United |
| Brackenford City | Copperbridge Athletic |
| Calderwick United | Larchbury Town |
| Dunmere Rovers | Oakmarsh Rovers |
| Eastbarrow Town | Pember Quay FC |
| Fenwick Vale | Redwater City |
| Greyhaven Sporting | Southmere Wanderers |
| Highfell Albion | Thornbridge United |
| Kingswell Borough | Valehaven Sporting |
| Northquay FC | Westfen Borough |
| Stonebridge Wanderers | Whitestone Athletic |
| Westhaven Union | Yarrowfield Town |

- Each club plays every divisional opponent home and away: 22 league fixtures per club and 132 fixtures per division.
- Award three points for a win and one for a draw. Publish tie-breakers: goal difference, goals scored, head-to-head points, head-to-head goal difference, then a recorded seeded draw if still tied.
- Premier places 11 and 12 are relegated; National places 1 and 2 are promoted. Changes occur at season rollover after all fixtures finish. Stable club IDs, histories and contracts survive the move.
- No unmodeled third division is implied. The bottom National clubs remain in that division in the initial scope.
- A 24-club Association Cup starts with all 12 National clubs and four drawn Premier clubs in a 16-club preliminary round. Eight winners join the other eight Premier clubs in the round of 16. Total cup fixtures: 23.
- Cup ties are single-leg with published venue selection, extra time and penalties if required. League draws stand. Schedule recovery intervals and postponements consistently.
- Propose 24 senior players per club, including at least two goalkeepers: 576 senior roster places. Cap any additional reserve/prospect pool separately.
- Publish fictional substitution limits, registration rules, disciplinary thresholds and prize money. Store the ruleset version in each save.
- Give clubs distinct budgets, recruitment priorities, tactical tendencies, rivalries, academy strength and home-ground identities.
- Use independently authored crests, kit patterns and sponsors. Do not trace real badges or reproduce recognizable kits under new names. Check kit, goalkeeper and referee color conflicts.
- Screen proposed names and marks before release. No real player likenesses or implied endorsements. Additional countries, continental cups and national teams remain optional future scope.

## 4. Realistic animation system

### Motion sources and coverage

- Prefer commissioned motion capture with performer consent and explicit redistribution rights, supplemented by verified compatible motion libraries.
- Public coaching footage and biomechanics research may inform analysis, but viewing access does not grant permission to redistribute footage, extract game animations or train on restricted material.
- Cover idle, starts, stops, acceleration, jogging, sprinting, curved runs, shuffles, backpedaling, pivots and recovery steps with both foot leads.
- Include first touches, dribbling, short and long passes, crosses, shots, volleys, headers, shielding, tackles, interceptions and throw-ins. Add weak-foot and varied contact-height coverage where supported.
- Goalkeepers need ready positions, lateral set steps, low/high dives, catches, parries, smothers, recovery, distribution and one-on-one reactions.
- Deliver foot-plant, ball-contact, takeoff, landing and interruptibility metadata. Generic GLB animation clips do not automatically encode football semantics.

### Controller, IK and physical response

- Use a consistent humanoid skeleton, scale, rest pose and joint mapping. Validate retargeting before multiplying body variants.
- Blend locomotion by direction and speed with gait-phase synchronization. Simulation owns acceleration, turn limits and collisions.
- Use explicit action states and restrained additive upper-body layers. Prefer coherent weight transfer over a large number of unrelated clips.
- Apply bounded stride/orientation warping for feasible contacts. Select misses or recovery motions when a ball is unreachable rather than teleporting feet or the ball.
- Use two-bone leg IK, foot planting, limited pelvis adjustment and anatomically constrained head tracking. Hand IK supports keeper catches and throw-ins.
- Align animation contact markers with authoritative simulation touches. Shot velocity and spin come from the touch event, not guessed rendered boot velocity.
- Reconcile authored root-motion proposals with collision and movement constraints. Visual animation cannot move a player through an opponent.
- Use controlled reactions and selective ragdoll recovery for exceptional falls, not full-ragdoll locomotion. Dramatic poses alone do not determine fouls.
- Reduce offscreen animation evaluation while keeping player simulation intact. Returning to view must not reset actions or change outcomes.
- Inspect foot sliding, knee snapping, impossible reaches, wrong-foot contacts, ball clipping and abrupt transitions at both normal speed and slow motion. Test varied builds, fatigue and interrupted actions.

## 5. Match simulation, tactics and physics

### Authoritative match model

- Use a fixed timestep, provisionally 60 Hz, with render interpolation and bounded catch-up. Pause after hidden-tab interruption instead of processing an uncontrolled backlog.
- Persist seeded random state for reproducible checks on the same supported build. Do not promise bit-identical floating-point physics across browsers, engines or hardware.
- Keep movement, collisions, ball contacts, goals and rules authoritative in simulation. Animation, cameras and audio consume events.
- Use meters, seconds and kilograms internally. A proposed 105 by 68 meter pitch fits IFAB international-match dimension ranges, but is not the only lawful pitch size.

### Tactical AI

- Model buildup, settled possession, attack transition, defensive transition, settled defense and restarts with formation and role responsibilities.
- Expose defensive height, width, pressing triggers, tempo, passing risk, overlaps and marking approach. Tactics do not override physical limits or create perfect coordination.
- Include passing lanes, support triangles, receiving orientation, off-ball runs, cover shadows, defensive cover and rest defense.
- Give AI bounded perception, anticipation and reaction delay. Avoid omniscient interceptions and goalkeepers reacting before a shot is meaningfully readable.
- Consider pressure, fatigue, body orientation and scoring opportunity. Permit recycling possession instead of forcing every pass forward.
- Respect offside and maintain team shape. Teammates should not all chase the ball or abandon roles to follow the user.
- Managers adjust tactics and substitutions for fatigue, cards, injury and match state using the same rules and resources available to the player.

### Movement and ball physics

- Model finite acceleration, braking, inertia, turning limits and fatigue. Sprinting reduces precision and turning freedom rather than acting as an unlimited speed toggle.
- Use simplified player collision shapes and controlled contact resolution. Cosmetic mesh detail must not change hitboxes.
- Simulate a free ball with gravity, bounce, rolling resistance, friction, aerodynamic drag and spin-dependent curvature. Calibrate against lawful measurement references rather than visual guesswork alone.
- IFAB specifies ball circumference of 68 to 70 centimeters and start-of-match mass of 410 to 450 grams. Nominal radius near 0.11 meters and mass of 0.43 kilograms are starting values, not a complete aerodynamic model.
- Use swept collision tests or appropriate continuous collision detection/substeps for fast shots, posts and goal lines. Prevent tunneling.
- Dribbling consists of reachable controlled touches, not permanent foot attachment. Keeper possession is an explicit state with legal release events.
- Passing and shooting account for aim, power, orientation, pressure, balance, technique and preferred foot. Assistance is visible and configurable, not concealed post-contact magnetism.
- Calibrated rain presets may change surface friction and bounce; wind may alter flight. Weather effects must agree across physics, presentation and audio.
- Net deformation is cosmetic and cannot determine goal validity.

### Rules and season simulation

- Pin a reference edition of the IFAB Laws of the Game and document fictional competition variations.
- Include kickoffs, goals, throw-ins, corners, goal kicks, free kicks, penalties, offside, advantage, cards, injuries, substitutions, halftime, full time and stoppage time.
- Evaluate offside from the relevant teammate touch and subsequent involvement, not merely current position. Goals and out-of-play require the whole ball to cross the relevant boundary.
- Use explicit clock and restart states. Extra time and shootouts apply only where the competition requires a winner. Initial scope can omit VAR presentation explicitly.
- Played and watched matches share the authoritative match model. Background fixtures may use a faster seeded statistical/event simulator rather than stepping every match in full detail.
- Both paths share attributes, lineups, tactics, fatigue and discipline. Calibrate outcome distributions without claiming identical fidelity.
- Generate coherent scorers, minutes, substitutions, cards and injuries. Stable fixture IDs prevent duplicate results, rewards or table updates.
- Commit calendar advances, fixtures, finances and career events together. Resume from the last committed day or explicit match checkpoint after interruption.
- Compare goal, draw, shot, possession, passing and card distributions against a cited dataset with lawful usage terms. Separate measured reference ranges from fictional-league tuning choices.

## 6. Graphics, stadiums, crowd and weather

- Target realistic proportions, movement, contact and readable broadcast presentation. Do not promise AAA photorealism on low-power browser hardware.
- Use glTF metallic-roughness PBR, correctly tagged texture color spaces, tangent-space normal maps and consistent exposure. Avoid painted highlights that conflict with lighting.
- Prioritize kit silhouettes, believable cloth folds, grass scale, coherent shadows and faces at actual gameplay distance.
- Offer broadcast, career-follow and training cameras with adjustable zoom, obstruction handling, smoothing and reduced camera motion.
- Begin with three original stadium archetypes: community ground, medium enclosed stadium and larger modern bowl. Club dressing can vary without claiming 24 unique bespoke venues.
- Separate stands, tunnels, dugouts, floodlights, goals and pitch. Provide collision proxies and sufficient runoff space.
- Use instanced low-detail spectators or cards at distance, a small number of closer animated crowd types, LODs and culling. Do not simulate thousands of independent people.
- Include daylight, overcast and floodlit matches. Rain and wind follow only when their visual and simulation effects are consistent.
- Bound shadow casters and grass detail. Ray tracing, volumetrics, full cloth crowds and individual grass physics are not baseline requirements.
- Keep menus legible with local fonts, flat colors, visible focus, scalable text and original broadcast identity.

### Provisional performance goals

- Use the repository's provisional Intel N100/8 GB laptop class as a planning baseline pending confirmation. Identify a separate mobile touch/GPU test device.
- Aim for 60 FPS at 1280 by 720 in standard quality and 30 FPS at 960 by 540 in low quality. These are unmeasured goals, not acceptance claims.
- Begin profiling with visible-scene ceilings of 500,000 triangles, 250 draw calls and 256 MiB estimated resident texture data. Adjust downward if needed; counts alone do not guarantee frame rate.
- Measure p95/p99 frame time, stalls, memory growth, graphics-context loss and thermal behavior on actual hardware. Headless software rendering is not hardware acceptance.
- Lower crowds, shadows, render resolution and cosmetic animation rates before changing simulation fairness.
- Budget download size, decoded texture memory, first-play loading and long-session memory separately. Verify offline closure and loading/context-loss recovery.

## 7. Save system: localStorage and IndexedDB

### Storage split and save contents

- Use namespaced localStorage for small preferences and optional slot summaries only. It is synchronous, quota-limited and can throw.
- Use IndexedDB for authoritative career slots, rosters, fixtures, contracts, histories, checkpoints and optional replay chunks. Static game assets remain local files, not duplicate blobs inside every save.
- Treat localStorage summaries as rebuildable caches. There is no atomic transaction spanning both APIs; a stale summary must never overwrite newer career data.
- Provide at least three career slots, manual saves, rotating autosaves, export/import and visible save-success timestamps.
- Persist schema/game/ruleset versions, stable IDs, seed and current random state, calendar, player, rosters, contracts, transfers, standings, finances, development, injuries and suspensions.
- Commit dependent records in one IndexedDB transaction. Report success after completion and retain a previous valid checkpoint.
- Initially permit mid-match suspension at safe stoppages. Save clock, score, lineups, substitutions, fatigue, discipline, restart, ball and random state needed for reconstruction. Arbitrary-frame resume is a separate capability, not an implied promise.

### Reliability and safety

- Autosave after committed calendar advances, completed matches and confirmed negotiations. Do not depend on unload handlers for the only valid save.
- Prevent conflicting writes from multiple tabs through revision checks in write transactions and, where supported, a per-slot Web Lock.
- Handle unavailable storage, quota failures, aborted transactions and corruption. Offer clearly labeled in-memory play and export rather than false saved messages.
- Storage estimates and persistence requests can help, but approval is not guaranteed. Private browsing, site-data clearing and origin changes can remove or isolate saves.
- Export a versioned JSON file. Enforce import size limits and validate types, numeric ranges, references, stable IDs and supported schemas before writing a new slot.
- Imported names are untrusted text. Never execute save content, accept asset URLs from it or render it as HTML.
- Migrate old formats transactionally with recovery data retained. Reject unsupported newer saves without overwriting them. Checksums detect accidental corruption, not authenticity.
- Local saves remain editable. No server-side anti-cheat, accounts, cloud storage or online economy is required.
- Save storage does not cache the application itself. Any separately approved offline service worker must be narrowly scoped and tested for complete local asset availability without network access.

## 8. Controls and accessibility

| Action | Keyboard proposal | Gamepad proposal | Touch proposal |
| --- | --- | --- | --- |
| Move | WASD or arrows | Left stick | Left virtual stick |
| Aim | Movement direction; optional mouse aim | Movement direction; optional right-stick targeting | Movement direction or drag aim |
| Pass / standing tackle | J | South face button | Contextual Pass/Tackle |
| Through pass / keeper rush | K | North face button | Contextual Through/Rush |
| Shoot / clearance | L, hold for power | East face button, hold | Shoot/Clear, hold |
| Cross / lob | I | West face button | Cross/Lob |
| Sprint | Shift | Right trigger | Sprint or configurable stick threshold |
| Precision / shielding | Space | Left trigger | Precision/Shield |
| Switch player / request pass | Q | Left shoulder | Switch/Call |
| Pause | Escape | Menu button | Visible Pause button |

- Bindings are starting proposals, not implemented controls. Require remapping, sensitivity, hold/toggle sprint, dead zones and mode-aware labels.
- Career mode locks to the created player by default. Call requests a pass, not guaranteed possession. Team modes use Switch instead.
- Support browser Gamepad API standard-mapping detection, controller connection feedback and recovery on disconnect. Do not assume identical button labels on every controller.
- Teach jockeying, manual runs, first touches, keeper play and set pieces contextually. Essential touch actions must not require complex multi-button gestures.
- Keep keyboard-only menus, visible focus, readable contrast, scalable text, non-color-only team indicators, explicit assistance settings and reduced camera shake.
- Touch targets are at least 44 pixels with safe-area support and adjustable HUD placement. Provide a landscape match hint and accessible pause/menu layouts.
- Clear held inputs on focus loss and pause. Suppress page scrolling only while the relevant gameplay controls own input.

## 9. Audio: commentary, crowd and effects

- Start with locally stored ball strikes, footsteps, post/net contacts, whistles, keeper calls and interface feedback. Trigger effects from simulation events, not frame-dependent animation guesses.
- Layer licensed or commissioned crowd loops for neutral play, pressure, chances, goals, disappointment and halftime/full-time reactions. Avoid thousands of independent emitters.
- Use original chants. Stadium recordings can contain protected songs, identifiable speech or uncertain rights; availability is not clearance.
- Commentary uses a bounded local library of commissioned or appropriately licensed lines with event priority, repetition cooldowns and accurate match context.
- Obtain explicit performer consent and usage rights. Do not clone known commentators or imply endorsement. Generated voice requires documented consent, provider terms and truthful provenance.
- Record fictional-name pronunciation or use neutral phrasing where names are unavailable. Do not claim unlimited commentary from unnatural fragments.
- No remote text-to-speech, streaming radio, commentary service or runtime generative model is required.
- Provide separate master, commentary, crowd, effects and music levels, speech subtitles and visual cues for key whistles/events.
- Unlock Web Audio through user interaction, suspend appropriately when hidden/paused and release resources on exit. Prevent clipping and duplicate goal reactions.
- Budget commentary separately from essential effects. Missing local content produces an honest message, not a silent network fetch.

## 10. Dot generation prompts and delivery requirements

These prompts are for an external Dot workflow after separate approval. They do not assert that Dot can automatically deliver production-quality topology, rigs, animation, LODs or rights clearance. No generation or integration is ordered here. Report unsupported requirements rather than fabricating completion.

### Common prompt

> Create original, realistic football assets for an offline browser simulation using the specific request below. Do not use EA Sports FC or FIFA assets, recognizable player likenesses, real club crests, sponsors, copied kits or copied stadium architecture. References describe scale and function only. Deliver self-contained glTF 2.0 GLBs with no remote URIs, plus editable source if available and a truthful manifest.
>
> Use meters, glTF's right-handed coordinate system and +Y up. Use +Z as this project's documented asset-forward convention. Apply mesh transforms while preserving the documented rig bind pose. Provide base-color, tangent-space normal and metallic-roughness textures with channel and color-space documentation. No baked scene lighting, hidden duplicate meshes, embedded scripts, unnecessary lights or cameras. Separate LOD files must share pivots and material conventions. Deliver an uncompressed baseline; optional compression must identify the compatible local decoder.
>
> Include asset IDs, dimensions, hashes, triangle counts, material primitives, texture sizes, dependencies, skeleton/clip lists, tool/model/version, prompt, generation date, actual author/provider and redistribution evidence. Record every third-party input and its terms. Do not invent human authorship or infer rights merely from generation. Supply neutral front/side/back views and gameplay-distance previews labeled as previews, not in-engine acceptance.

Limits below are proposed caps, not guarantees or permission to grow the workspace. Review external delivery size and rights before import. Preserve original deliveries; approved optimized derivatives need their own provenance.

### Prompt A: Player and goalkeeper models

> Create one original adult professional footballer reference body with natural proportions, believable athletic anatomy and no recognizable real-person likeness. Validate this body before proposing a larger family of varied adult heights, builds, faces, skin tones and hairstyles on the same skeleton. Do not generate a full roster before approval.
>
> Supply blank original outfield and goalkeeper kits with separate boots, socks, shorts and shirt material regions. Gloves are a separate mesh. Document UV regions for fictional numbers, names and crests. Clothing must be correctly weighted and look plausible without real-time cloth. No real-team kit pattern or manufacturer branding.
>
> Provide a humanoid skeleton with root, pelvis, spine, neck, head, clavicles, arms, hands, fingers, thighs, shins, feet and toes. Maximum 80 deform bones and four influences per vertex. Include rest pose, joint mapping, limits and retargeting notes. Ground is Y=0, with origin between the feet and reference height 1.80 meters. Document foot/hand contact markers and root-motion conventions. Helper nodes must not require hidden authoring-tool constraints at runtime.
>
> Whole-player limits, including clothing and boots: LOD0 at most 25,000 triangles, LOD1 10,000 and LOD2 3,000, with at most four material primitives. Use shared body/kit maps up to 2048 by 2048 and a smaller face/hair set only where needed. Reference-player package cap: 20 MiB. Report decoded texture estimates and avoid a unique full texture library per roster member.
>
> Supply separately named rig-test clips for idle, walk, jog, sprint, left/right turn, pass, shot and jump/land, plus keeper set/dive/recovery where supported. Include contact metadata. Label them test clips, not motion capture or a complete gameplay library. If animation is unsupported, deliver the rig and identify missing clips honestly. Demonstrate no obvious foot skating, joint snapping or clothing penetration in the supplied tests.

### Prompt B: Stadiums

> Create an original modular football stadium family, beginning with a 6,000-seat community ground. Later variants target a 20,000-seat enclosed ground and a 45,000-seat modern bowl. Capacities describe design intent, not individually modeled spectators. Do not reproduce named stadiums or protected architectural designs.
>
> Center a 105 by 68 meter playable pitch at the origin, long axis along Z. Reserve at least five meters of unobstructed runoff outside all touchlines and goal lines before fixed props or stands. Separate pitch, markings, goals and structure. Include straight stands, corners, roof bays, entrances, tunnel, dugouts, railings, floodlight structures and blank original signage.
>
> Supply reusable UVs, instancing-ready modules, matching low-detail collision proxies, crowd placement anchors, camera-clearance notes and LODs. Do not embed thousands of spectators or dynamic lights. Lighting previews must not be baked into surface textures.
>
> Per assembled stadium, excluding players/crowd: maximum 150,000 triangles at LOD0, 60,000 at LOD1 and 20,000 at LOD2. Target at most 40 material primitives, eight shared material texture sets with maps no larger than 2048 by 2048, and 35 MiB for the uncompressed GLB package. Include a module-placement manifest. Report budget conflicts before delivering oversized files.

### Prompt C: Ball, goals and equipment

> Create an original unbranded equipment pack: size-5 match ball, goal/net assembly, corner flag, training cone, goalkeeper gloves and generic studded boots. No product branding. Wearables must fit the approved player rig rather than introducing incompatible hand/foot scales.
>
> Use nominal ball diameter 0.22 meters, origin at its center, an original panel pattern and a spherical collision specification. Goal clear internal width is 7.32 meters; height to the underside of the crossbar is 2.44 meters. Use proposed 0.10 meter post/crossbar thickness and document support/net depth. Goal origin is the goal-line center at ground level, opening toward +Z. Put physical dimensions in the manifest rather than an engine-specific rigid body.
>
> Separate posts, supports and net. Provide economical deformable net geometry or attachment anchors without requiring full cloth simulation. Corner flags are at least 1.5 meters high with non-pointed tops. Provide simple rigid-equipment collision proxies; cosmetic cloth needs no collider.
>
> LOD0 caps: ball 2,000 triangles, goal/net 8,000, flag/cone 500 each, and each wearable pair 4,000. Equipped wearables count toward the player budget. Supply lower-detail variants and shared maps up to 1024 by 1024. Equipment package cap: 10 MiB. Include dimension diagrams and unobstructed views of the goal opening.

### Asset acceptance

- Inspect geometry, dimensions, normals, UVs, bind pose, weights, texture memory, material primitives and external-resource absence. Validate actual files, not just manifests.
- Verify glTF structure and local dependencies. Keep any required decoders and notices local.
- Test one player and keeper in motion before expanding cosmetic variants. Check ball-foot, ball-hand, post and net contacts in the chosen engine.
- Compare real match-distance and close-up rendering to the supplied concepts. A still image or successful import proves neither rig quality nor performance.
- Reject recognizable protected identities, unclear rights and invented provenance. Asset acceptance and hardware acceptance remain distinct gates.

## Suggested delivery order and future verification

1. After implementation approval, prove grounded locomotion, a turn, pass, shot and keeper interaction with placeholder art. Resolve the engine choice before large art commissions.
2. Complete 11-a-side rules, tactical spacing, restarts, native inputs and start/pause/result/restart paths before presentation expansion.
3. Complete a full league/cup season and save/export/import round trip. Test interrupted writes, fixture uniqueness and table invariants.
4. Add player selection, training, contracts, transfers, loans, injury and multi-season rollover through retirement.
5. Integrate approved art, weather, crowd and audio within measured budgets. Rich commentary follows reliable matches and saves.

Future runnable regression checks should cover ball tunneling, offside/goal boundaries, fixture/cup counts, transfers, development, season rollover and corrupt/old saves. Native keyboard, gamepad and touch interaction, offline closure, real-device performance and legal provenance require separate evidence. None is established by this wishlist. No game or runtime dependency is added, and no release or push is requested.

## Reference starting points

Official references below support later version-pinned review. Links are not runtime dependencies, fresh-fetch claims or grants to redistribute linked assets.

- [Three.js documentation](https://threejs.org/docs/) and [MIT license](https://github.com/mrdoob/three.js/blob/master/LICENSE).
- [Babylon.js documentation](https://doc.babylonjs.com/) and [Apache-2.0 license](https://github.com/BabylonJS/Babylon.js/blob/master/license.md). Check physics plugin terms independently.
- [Godot web export](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html), [Unity web documentation](https://docs.unity3d.com/Manual/webgl.html) and [Unreal Engine release/platform documentation](https://dev.epicgames.com/documentation/en-us/unreal-engine/sharing-and-releasing-projects-for-unreal-engine).
- [Khronos glTF specification](https://registry.khronos.org/glTF/) for coordinates, skinning, animation and materials.
- [IFAB Laws of the Game](https://www.theifab.com/laws/latest/) for field, ball, equipment, restarts and offside. Pin an edition before implementation rather than silently following a changing latest page.
- MDN: [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage), [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria), [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) and [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API).
- Repository boundaries: [code quality](CODE_QUALITY.md), [3D runtime contracts](maintenance/site/3d-games-and-budgets.md), [browser state](maintenance/site/browser-state.md) and [rights workflow](maintenance/site/rights-and-sparse-workflow.md).
