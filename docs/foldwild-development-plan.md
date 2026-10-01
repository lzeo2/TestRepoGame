# Foldwild: full-game development proposal

Status: **DEVELOPMENT AUTHORIZED; IMPLEMENTATION IN PROGRESS**. The owner ordered
"now plan out the game in detail and get to implemntaton". See the
[build order and milestone contract](foldwild-implementation.md). Features below
remain design targets until the milestone report verifies their implementation.
The [three concept shots](foldwild-concept-shots.md) are approval-only mockups
using the supplied creature models, personally reviewed for this visual proposal.
Gameplay development is now authorized. Registration, publication and push
remain separately gated; concept mockups are not completed-game evidence.

## Direction

Turn the existing vertical slice into a compact, complete offline expedition RPG:
**explore meaningful places, discover creatures, build a three-member team,
master energy-based battles, and complete a field ledger of all 80 species.**

The identity is a handmade papercraft world: matte folded creatures, riverbank
villages, geometric woodland and stone terraces. The world should occupy most
of the screen, with a small task tracker and a compact team strip. Battles should
show expressive creature actions, not resemble a form. The field ledger should
feel like an illustrated naturalist's journal.

Revised content target: **five authored regions, five regional trials, a final
expedition, 48 persistent NPCs (12 core characters plus 36 residents/traders),
five main trading outposts, four smaller road posts and 15 side tasks**. Add
merchants/currency, unlockable trainer classes, team synergies, individual
creature attributes and creature cosmetics. Include a separately gated seeded
frontier for procedural replayability, not a replacement for the authored story.
Aim for roughly **2–3 hours for the main route** and additional collecting,
class-building, trade and expedition play. These are design targets, not measured
playtime or a promised delivery estimate.

## What already works, and what needs development

The current code has the 80 supplied models, five elements, four abilities per
species, a three-member party, turn resolution, statuses, weakened capture,
levels/evolution, three rivals, basic movement, native controls and guarded saves.
Pure checks and focused capture/save/browser checks passed. This is not proof
of a balanced complete campaign.

The gaps are concrete:

- Three regions share essentially the same flat ground and crossroads geometry.
- Wild encounters are three stationary markers; habitats are broad tier pools.
- There is no substantive quest/story structure or exploration progression.
- Movement clamps bounds but has no environmental collision or camera avoidance.
- Enemy AI mostly chooses the highest-power affordable attack; it never
  strategically switches its team.
- The collection exposes all 80 names, abilities and evolution links immediately,
  as a long text list with no model inspection, search or favorites.
- Camp freely heals the entire collection and replenishes 18 kites; there is no
  resource progression. Defeat always fully restores the collection.
- Every new expedition uses seed 1. Saves do not preserve an ongoing battle.
- The three-rival route finishes below the second evolution threshold; late
  evolution and the full collection have not been naturally playthrough-tested.

Reuse `data.js`, `battle.js`, `world.js`, `view.js` and the existing checks. Do not
replace the engine or start a second game framework.

## World scale and populated settlements

Use **one world unit = one meter** consistently for movement, scenery and assets.
The existing playable bounds are x = -10..10 and z = -7..7: **20 x 14 m = 280 m²
per region**. That is movement-bound area, not the larger decorative ground mesh.
The current three regions total 840 m² of equivalent bounded layouts, not an
840 m² continuous open world.

Proposed authored region bounds are **160 x 160 m = 25,600 m² each**. Five regions
provide **128,000 m² / 12.8 hectares** of gross map area; rivers, hills and scenery
mean not all of it is walkable. Connected routes, villages, clearings, shortcuts
and discoveries should justify the space, rather than padding walking time.
These are new design dimensions, not current implemented map sizes. Density and
navigation are checked in the first region before expanding all five.

Place the 48 authored NPCs across settlements, road posts and trails. Twelve get
substantial quest/rival dialogue; the remaining residents/traders have concise,
location-specific conversations and useful roles. Include supply merchants,
tailors, class mentors, healers, couriers, local challengers and residents reacting
to completed tasks. Give settlements short movement routines and activity beats,
not an expensive simulated daily life or real-time schedules. Keep identities
and important progress stable across reloads. Only nearby NPCs need rendering
and movement updates; all 48 must not run every frame.

## Economy, customization and build diversity

### Currency, merchants and trading outposts

- One ordinary earnable currency: **Marks**, gained from tasks, challenges,
  exploration and supply contracts. No premium currency or real-money purchase.
- Outposts combine a supply merchant, barter counter, recovery point, class
  mentor and cosmetic stall. Road posts provide smaller services and route tasks.
- Buy/sell capture supplies and recovery items; exchange field materials; buy
  outfits and creature accessories; fulfill regional supply contracts.
- Include curated NPC creature exchanges with explicit previews/confirmation.
  Never silently trade a favorite, a story-required creature or the last usable
  teammate. Player-to-player trading remains outside scope.
- Show buy/sell prices, quantities, stock and resulting wallet balance before
  confirmation. Use bounded integer currency/item counts and atomic saved trades.
  Selling should not create an unlimited same-shop buyback exploit; regional
  trade profit comes from deliberately limited stocks/contracts.
- Stock/contract refresh follows completed expedition or progression milestones,
  not browser refresh or wall-clock waiting. Trades, pickups and task rewards
  cannot be paid out twice after reloading. Basic recovery/kite access prevents
  zero currency from making the main story impossible.

### Player and rival appearance

Add player name, skin tone, hairstyle, coat/backpack colors and small accessories.
Offer optional rival appearance edits without replacing their authored personality,
dialogue or progression. Keep rival outfit development visible across chapters.
Save appearance choices and permit later editing at camp/outposts. New parts
need original/documented-source provenance. No promised character-rig assets
exist yet; the first version uses reusable procedural character parts.

### Five unlockable trainer classes

Classes apply to the player as expedition specializations, not extra species or
five separate creature combat systems:

| Class | Unlock direction | Build identity |
| --- | --- | --- |
| Pathfinder | Early route/survey tasks | Habitat discovery and exploration utility |
| Binder | Capture/research milestones | Capture setup and efficient kite use |
| Warden | Defensive trial tasks | Shielding and team protection |
| Tactician | Varied-team challenges | Switching and energy management |
| Quartermaster | Supply/trade contracts | Supplies, crafting and contract efficiency |

One class is active at a time. Each gets a small three-rank progression with
clear unlock requirements and a few understandable perks, not a huge skill tree.
Switch freely at camp/outposts; no permanent class lock or paid respec. Keep
bonuses limited/contextual: the creature team remains the source of combat power.
Class unlocks and ranks persist; new expeditions let players try different builds.

### Team synergies

Use the three-member team's elements, families and battle roles to unlock a small
set of named, previewable synergies. Examples for balance testing: mixed-element
coverage helps energy recovery after switching; a defensive/support pairing
helps shielding; a matched-family pairing rewards coordinated play. Keep these
as different viable builds, not a mandatory all-same-element bonus.

Show requirements and effects in team editing before a fight. Start with **one
active party synergy plus the active class's defined perks**, cap stacking and
use explicit timing/conditions. Apply benefits through pure combat rules, not
renderer callbacks. Opponents can use clearly telegraphed synergies too.

### Variable creature attributes

Species identity, element, evolution and base stat tables remain canonical.
Give each newly generated individual a saved, seeded attribute profile: small
bounded deviations (initial target **within ±8%**) across HP, energy, attack,
defense and speed, using a fixed overall budget so one specimen cannot simply
roll the maximum in everything. Add one modest disposition/trait from a small
original list. These are sidegrades, not an endless hunt for a perfect specimen.

Expose the profile, trait and resulting stats in the ledger and trade preview.
Never reroll on loading, switching, evolution or capture. Existing v1 creatures
migrate with neutral attributes rather than being randomly rewritten. Evolve
using the same individual profile; verify that traits/class/synergy interactions
cannot create runaway loops or invalidate capture/stat bounds.

### Creature cosmetics

Offer paper scarves, badges, hats and optional accent/pattern presets, unlocked
through field ranks, tasks, class milestones and cosmetic merchants. Cosmetics
never modify stats, element or capture odds. Equip/remove them per creature and
save choices by creature UID.

Use tested family-specific attachment points with unique-model overrides so
accessories fit rather than float or cover faces. Retain unchanged original GLB
bytes and a default original-color appearance; any optional visual override is
an explicit cosmetic, not a rewrite of source material. Derive previews from the
same appearance as the world/battle model. Verify clipping and readability
across all 80 models, with reduced-motion and performance budgets intact.

## Phase 1: approved look, controls and one finished region

**Deliverable: Rootfold Meadow becomes a genuinely explorable first chapter.**

- Replace the cross-shaped demonstration layout with a village, winding trail,
  riverbank, bridge, grove and a small optional clearing.
- Introduce shared walkable/collision geometry for player movement and rendering.
  Use simple bounds/obstacles and a small route graph for tap-to-walk, not a
  physics framework or unrestricted open-world navigation.
- Improve third-person camera framing, add bounded manual orbit/recenter and
  prevent the camera from looking through major obstacles.
- Give the player a readable folded-coat/backpack silhouette with the first
  appearance controls. Keep NPC visuals inexpensive and distinct through outfit
  silhouettes/colors; demonstrate a populated first settlement and road post.
- Add visible wild creatures with small wandering/idle motions and deliberate
  interaction. No unavoidable battle every few steps.
- Replace the sidebar-heavy shell with the concept's world-first HUD, compact
  objective/team information and usable touch movement controls.
- Fix misleading phase hints and make scene/loading/error transitions explicit.

**Gate:** keyboard and touch exploration, obstacle sliding, camera/recenter,
first discovery/capture, camp, dialogue, save/continue and restart all work on
real desktop/mobile browsers. Owner reviews actual playable captures against
approved concepts before the remaining regions are expanded.

## Phase 2: discovery, collection and progression

**Deliverable: collecting and raising a team becomes a satisfying game loop.**

- Build the field ledger with search, element/family filters, favorites and
  seen/caught progress. Conceal undiscovered information in the UI without
  pretending it is secret from someone inspecting the game files.
- Add a rotatable local 3D creature viewer, four-ability explanations, habitat
  notes, stat/XP displays and clear evolution previews after discovery.
- Add easy team replacement, sorting and safe release of surplus creatures;
  protect favorites and never allow an empty active team.
- Give all 80 species explicit encounter/evolution/reward acquisition paths.
  Regional ecology replaces the current all-species random pools.
- Make evolution a visible milestone using the existing models and thresholds
  12/26. Explain changed abilities and allow the player to defer an evolution.
- Add a small supply loop: basic/advanced Latch Kites, recovery supplies and
  a few field materials. Camps remain reliable recovery points, with enough
  basic kite access that running out cannot soft-lock the campaign.
- Add expedition variety through a persisted run seed, without wall-clock
  waiting, daily reward timers or online services.

Implement the first outpost economy, attribute profiles and creature cosmetic
editing alongside collection/supplies. Class progression and synergies integrate
with combat in Phase 3; expand merchant/NPC content with the regions in Phase 4.

**Gate:** every species has a provably reachable acquisition path; no duplicate
capture/reward/trade bugs; party changes, capacity, favorites, individual profiles,
cosmetics and evolution survive reload. Reject invalid currency/items and prevent
last-teammate trades. No preload of all 80 GLBs just to open the ledger.

## Phase 3: strategic combat and readable feedback

**Deliverable: teams and decisions matter, including in later battles.**

- Keep turn-based combat, three allies/one active, five elements, four equipped
  abilities per species, and energy rather than inventing a second combat system.
- Use the existing 50 abilities first. Clarify family roles such as durable
  defender, fast disruptor and energy-efficient support. Integrate the five
  trainer classes and a small set of capped, previewable team synergies.
- Expand enemy choices to sensible shield/heal/status timing and strategic
  switching for trainer teams. Keep decisions reproducible from saved RNG state.
- Add a visible turn-order indicator, effective costs, element matchup guidance
  and concise status/shield explanations. Avoid presenting unknown damage as an
  exact guarantee if it depends on the opponent's next action.
- Animate whole-model lunges, recoil, recovery, the original paper Latch Kite,
  KO and evolution without claiming the supplied static assets are rigged.
- Use biome-appropriate battle surroundings and preserve original model colors
  by default; display explicitly equipped creature cosmetics consistently.
- Add local, original sound feedback with mute and reduced-motion settings.
- Tune XP, encounter levels, captures and opponent compositions through
  simulations and actual play. Log balance changes rather than silently
  rewriting the normative roster/glossary.

**Gate:** all 50 actions and element/status interactions remain covered, including
attribute/class/synergy combinations; no unbounded heal/shield stalls, negative
resources or double command resolution. Verify viable alternative builds, class
switching boundaries and reproducible traits. First-time players can understand
a battle without reading a wall of log text.

## Phase 4: the five-region campaign

**Deliverable: a complete adventure with a beginning, climax and useful postgame.**

Proposed region identities, subject to owner changes:

| Region | Main identity | Exploration hook |
| --- | --- | --- |
| Rootfold Meadow | Loamveil village and woodland | First surveys, bridge route and team formation |
| Stillwater Reach | Rillune channels and wetlands | Connected banks, nesting sites and hidden shallows |
| Emberstep Quarry | Cindrel clay terraces | Quarry trails, workshops and durable opponents |
| Stonefold Ridge | Gleamric mineral outcrops | Switchback paths, sightlines and precise tactics |
| Quietfold Hollow | Hushmere sheltered woodland | Quiet clearings, alternate routes and disruption tactics |

- Keep Maren, Sola and Iven, give them actual personalities and changing teams,
  and introduce two additional regional trial characters.
- Suggested story: an apprentice field archivist rebuilds the scattered ledger
  and reopens five expedition routes, learning from rival approaches to caring
  for and training creatures. Original terminology and presentation only.
- Use 15 side tasks across surveying, route repair, supplies, team challenges and
  unusual habitat discoveries. These must change access, knowledge or rewards,
  not be fifteen copies of a collection counter.
- Give the five existing unique boss-tier models curated guardian encounters.
  All remain obtainable through defined collection/evolution paths.
- Finish with a multi-stage final expedition that tests a varied team, followed
  by rematches and completion rewards. No endlessly scaling mandatory grind.
- Schedule enough natural XP to experience both evolution thresholds during the
  main route, rather than leaving level 26 to repetitive postgame farming.

**Gate:** complete the campaign from a clean save using ordinary controls,
without debug grants. Verify a losing/recovery path, alternate starter, guardian
acquisition and continued free exploration after the ending.

## Phase 5: seeded frontier and replayable expeditions

**Deliverable: an effectively unbounded procedural frontier for optional play,
not a claim of mathematical infinity or unlimited saved-world storage.**

Keep the five authored regions for meaningful towns, story and guaranteed species
access. Enter frontier expeditions from trading outposts after the core campaign
loop is stable. Seeded generation varies trails, habitat clusters, resource sites,
small camps, challenger teams and contracts, using the five biome identities and
existing species. No new creatures or required rare procedural luck for the story.

- Generate **64 x 64 m / 4,096 m² chunks** on demand. A starting 3 x 3 chunk window
  covers **192 x 192 m / 36,864 m²**; this is a streaming window, not a permanently
  rendered nine-chunk scene. Cull/instance scenery and cap visible actors.
- Derive boundary exits from shared edge coordinates so neighboring chunks
  connect. Verify walkable access to every required generated camp/objective;
  use a safe template if generation cannot meet its invariants.
- Persist seed, generator version, entity identities, accepted contracts and
  claimed/consumed changes. Revisiting or refreshing cannot duplicate rewards.
- Unload distant visuals and regenerate unchanged terrain from the seed. Use
  local render coordinates to avoid precision problems on long journeys.
- Bound coordinates, pending contracts and saved world-change records. If a
  safety/save cap is reached, clearly require expedition return rather than
  silently discarding history or resurrecting claimed rewards. On return,
  preserve earned creatures/currency/class progression; a new expedition can
  use a fresh seed. No permanent construction/terrain editing is proposed.
- Difficulty changes through selected expedition tiers and deeper challenge
  bands, not unlimited creature levels beyond the existing level-40 cap.
- Reward fresh team/class combinations with varied contracts and opponents.
  Avoid relying solely on increasingly inflated enemy HP or repetitive layouts.

**Gate:** test generation across many seeds and positive/negative chunk seams,
return/revisit/reload, long travel, bounded loading, objective reachability,
resource/reward uniqueness and safe handling of storage caps. This phase is
separately accepted after the authored game works; the owner can approve the
core additions without requiring the frontier in the first release.

## Phase 6: durable saves, performance and release verification

**Low-end Chromebook support is an acceptance requirement, not an optional
polish pass.** The owner provisionally reports an **Intel N100 Chromebook with
8 GB RAM and 64 GB storage**. Use that as the primary reference, subject to model
confirmation, running supported Chrome OS/Chrome with working WebGL. Aim for
60 FPS at 1280 x 720 on standard, retaining the 30 FPS low preset below. These
are targets, not measured results. An N4020 / UHD 600 / 4 GB Chromebook remains
an optional lower-spec test if available; passing the N100 must not imply that
older device passed. Exact hardware must be recorded in results. No actual
Chromebook performance certification exists yet.

64 GB storage is not a game-size budget or evidence of available free space.
Browser save quotas still apply regardless of SSD/eMMC capacity; keep saves
compact, bounded and exportable.

### Default low preset and rendering limits

- Default to a **30 FPS target**, DPR 1 and a **960 x 540 maximum drawing buffer**
  on the low preset. DOM text/buttons retain native display resolution. Permit
  lower adaptive render scale without changing controls, collision or rewards.
  Standard targets 60 FPS with the proposed 1280 x 720 cap on the reported N100;
  retain safe low defaults until actual-device profiling supports that choice.
- Support the local r160 WebGL 1 path. Disable real-time shadows, postprocessing,
  bloom, SSAO, volumetric effects and expensive full-screen filters. Use simple
  directional/hemisphere lighting; animation uses elapsed time, not frame counts.
- Start low-preset scene targets at **50 draws / 60k visible triangles**, including
  cosmetics/effects, **four nearby wild creatures and four nearby NPCs**, and at
  most 16 lightweight effect particles. These are budgets to verify, not reported
  achievements. Active interactions remain visible/usable; background actors get
  distance culling or inexpensive shared silhouettes, not deleted gameplay state.
- Instance repeated trees/rocks/character parts, cull distant scenery and update
  only nearby actors. Frontier streaming must not render/update the entire
  nine-chunk window at full detail or all previously visited chunks.
- Bound the ordinary creature model cache (initial target 12 entries, protecting
  active models), dispose GPU geometry/materials/textures on eviction, and load
  the optional horror asset only near its own encounter. Do not load all 80 models
  or every cosmetic just to start the game or browse the ledger.
- Target **at most 32 MiB of resident model textures on low**, with explicit
  estimates and actual loader inspection. Prepare offline derived texture sizes
  where needed; never assume a small JPEG/GLB file means small GPU allocation.
  Preserve uploaded originals and document any approved optimized derivative.
- Keep one animation loop; pause hidden-tab work and avoid frame-by-frame DOM
  rebuilds. Indicate region/model loading and handle failure without freezing
  controls or claiming that a fallback is the real model.

### Hardware acceptance gate

On the recorded reference Chromebook, run warm gameplay at the low preset and
measure actual rendered-frame intervals: **target 30 FPS, mean at least 29 FPS,
95th-percentile frame interval at most 50 ms, and no sustained 10-second period
below 25 FPS**. Measure cold loads separately rather than hiding their cost in
warm results. A loading transition is not a valid way to mask ongoing stutters.
Separately measure the 60 FPS / 1280 x 720 standard target on the N100 and report
actual results; if it cannot sustain that target, keep the low fallback and do
not describe standard as verified 60 FPS. Record optional older-device testing
separately from the primary device.

Cover a busy settlement, traversal/chunk boundaries, battles with cosmetics and
synergies, ledger scrolling/model rotation, and the optional horror encounter.
Repeat at least 20 region/ledger/secret-scene transitions and restarts; confirm
resource counts/memory stabilize rather than accumulating retained GPU assets,
loops or handlers. Include a sustained 10-minute play session, keyboard/touchpad
responsiveness, zero normal browser/load errors and offline-local asset use.

Desktop software rendering, CPU throttling and draw/triangle counts provide
useful preliminary checks, **not a substitute for the Chromebook test**. If
reference hardware is unavailable, report the gate unverified and do not claim
low-end compatibility. Density/render-scale adjustments must preserve gameplay
and be reviewed visually before accepting them.

Save work starts early alongside the first changing systems; it is not deferred
until the end of content implementation.

- Introduce a versioned save upgrade that preserves existing v1 collections,
  levels and completed progress. Keep a recoverable previous snapshot.
- Persist quests, integer wallet/inventory, shop stock, class unlocks/ranks,
  individual attributes, player/rival/creature cosmetics, regional state and
  pending battles/RNG so refresh cannot reroll encounters or duplicate rewards.
  Persist frontier seeds/deltas if Phase 5 is approved. Use validated atomic
  snapshots and generator-version compatibility checks.
- Add explicit save status and guarded local export/import. Reject oversized,
  unknown-version or corrupt imports without replacing good progress.
- Reuse lazy GLB loading, bounded caching and shared/instanced scenery. Enforce
  the low-preset budgets above first; standard may target six visible wild
  creatures, eight nearby NPCs, approximately 60 draws and 100k visible triangles
  at DPR 1 / 1280 x 720. Measure rather than claim hardware results from targets.
  Never update the whole NPC population/visited frontier every frame.
- Check 320/390px phones, tablet, desktop, keyboard-only use, motion reduction,
  sound controls, storage denial/quota, missing-model fallback and restart cleanup.
- Run pure regressions, a full normal-input campaign playthrough, save migration,
  class/synergy/attribute balance, trading-exploit and cosmetic fit tests, plus
  frontier checks when included. Run the mandatory full registered-catalog browser
  gate before any push. The unregistered RPG receives its own full-game checks too.

## Work breakdown and approval boundaries

Implement each phase through narrow 10–20-minute mechanical tasks with
non-overlapping paths: world/content, battle/build balance, renderer, UI,
economy and saves. Procedural frontier work follows the stable authored loop.
I retain game direction, asset decisions and visual/integration review. Each
milestone is locally committed, checked and shown with actual playable captures.
Long all-catalog QA is a separately bounded monitored operation, not an extended
coding worker. No silent release or giant simultaneous rewrite.

Use a small plain-data `campaign.js` when campaign content is implemented.
Extract UI rendering into `ui.js` when it grows, rather than expanding the current
entry file into a multi-thousand-line monolith. No generic quest scripting
language, plugin layer, replacement renderer, build system or new dependencies.

**Still excluded:** multiplayer/player-to-player trading, cloud accounts,
breeding, permanent player-built terrain/settlements, a full physics engine,
voice acting, monetization, extra species or a second combat mode. NPC trading
and the separately gated seeded frontier are now proposed, not excluded.
This adds depth to the existing 80-species game rather than creature count.

The optional horror creature now has a separately uploaded candidate GLB; it is
**delivered for review, not ingested or implemented**. The [decoded audit and
native WebGL1 review](foldwild-hidden-delivery.md) passed geometry/reference and
loader checks with 13,926 indexed triangles, within the 10,000–15,000 target /
15,999 hard maximum. Main personally inspected front/side/back/three-quarter
captures as an appearance review, not gameplay or rights approval. It has four
embedded textures/materials, unlike the texture-free base roster, and no
animation rig. Three images are 2048 x 2048; one is 512 x 512.
An RGBA8 estimate is 49 MiB before mipmaps / approximately 65.3 MiB with full
mipmaps, not a measured GPU allocation. The upload is 6,384,292 bytes.

For low-end support, prepare a documented derivative in the optional-secret
milestone with the three large images limited to 1024 x 1024 (about 17.3 MiB
RGBA8 with mipmaps in total), or 512-wide textures if hardware tests require it.
The uploaded original remains unchanged; no derivative has been produced yet. Preserve the normal/metallic-roughness
maps' non-color meaning when optimizing, rather than naively treating them as
color images. Texture format/style acceptance, optimized appearance, actual
device performance, provenance, species data and encounter design still require
approval before activation. `OPTIONAL_HIDDEN_SPECIES` stays null until that
integration is approved. The secret encounter remains optional and cannot block
the base 80; provide an avoid/disable option and no mandatory loud jump scare.

Catalog ID remains unresolved. No registration or push without separate owner
sign-off. Existing creator/license assertions and publication holds are not
cleared by approving a development plan; new assets must have documented
original/reusable-source provenance.

**Approved development scope:** the expanded five-region/NPC/economy design,
papercraft visual direction, turn-based three-member teams, trainer classes,
synergies, individual attributes and appearance options. The separately gated
frontier follows the working authored game; release inclusion is decided later.
Gameplay implementation has started; unavailable hardware/provenance and
registration/publication holds remain explicit. No registration or push is
authorized by the development order.
