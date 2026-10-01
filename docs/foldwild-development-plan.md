# Foldwild: full-game development proposal

Status: **AWAITING OWNER APPROVAL**. This is a proposal, not an implementation claim.
The [three concept shots](foldwild-concept-shots.md) are approval-only mockups
using the supplied creature models, personally reviewed for this visual proposal.
No gameplay, registration or push is authorized by this document.

## Direction

Turn the existing vertical slice into a compact, complete offline expedition RPG:
**explore meaningful places, discover creatures, build a three-member team,
master energy-based battles, and complete a field ledger of all 80 species.**

The identity is a handmade papercraft world: matte folded creatures, riverbank
villages, geometric woodland and stone terraces. The world should occupy most
of the screen, with a small task tracker and a compact team strip. Battles should
show expressive creature actions, not resemble a form. The field ledger should
feel like an illustrated naturalist's journal.

Proposed content target: **five regions, five regional trials, a final expedition,
12 named NPCs and 15 side tasks**. Aim for roughly **2–3 hours for the main route**
and additional collecting/rematch play. These are design targets, not measured
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

## Phase 1: approved look, controls and one finished region

**Deliverable: Rootfold Meadow becomes a genuinely explorable first chapter.**

- Replace the cross-shaped demonstration layout with a village, winding trail,
  riverbank, bridge, grove and a small optional clearing.
- Introduce shared walkable/collision geometry for player movement and rendering.
  Use simple bounds/obstacles and a small route graph for tap-to-walk, not a
  physics framework or unrestricted open-world navigation.
- Improve third-person camera framing, add bounded manual orbit/recenter and
  prevent the camera from looking through major obstacles.
- Give the player a readable folded-coat/backpack silhouette. Keep NPC visuals
  inexpensive and distinct through outfit silhouettes/colors.
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

**Gate:** every species has a provably reachable acquisition path; no duplicate
capture/reward bugs; party changes, capacity, favorites and evolution survive
reload. No preload of all 80 GLBs just to open the ledger.

## Phase 3: strategic combat and readable feedback

**Deliverable: teams and decisions matter, including in later battles.**

- Keep turn-based combat, three allies/one active, five elements, four equipped
  abilities per species, and energy rather than inventing a second combat system.
- Use the existing 50 abilities first. Clarify family roles such as durable
  defender, fast disruptor and energy-efficient support.
- Expand enemy choices to sensible shield/heal/status timing and strategic
  switching for trainer teams. Keep decisions reproducible from saved RNG state.
- Add a visible turn-order indicator, effective costs, element matchup guidance
  and concise status/shield explanations. Avoid presenting unknown damage as an
  exact guarantee if it depends on the opponent's next action.
- Animate whole-model lunges, recoil, recovery, the original paper Latch Kite,
  KO and evolution without claiming the supplied static assets are rigged.
- Use biome-appropriate battle surroundings and preserve model colors.
- Add local, original sound feedback with mute and reduced-motion settings.
- Tune XP, encounter levels, captures and opponent compositions through
  simulations and actual play. Log balance changes rather than silently
  rewriting the normative roster/glossary.

**Gate:** all 50 actions and element/status interactions remain covered; no
unbounded heal/shield stalls, negative resources or double command resolution.
First-time players can understand a battle without reading a wall of log text.

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

## Phase 5: durable saves, performance and release verification

Save work starts early alongside the first changing systems; it is not deferred
until the end of content implementation.

- Introduce a versioned save upgrade that preserves existing v1 collections,
  levels and completed progress. Keep a recoverable previous snapshot.
- Persist quests, inventory, regional state and pending battles/RNG so refresh
  cannot reroll encounters or duplicate rewards. Use validated atomic snapshots.
- Add explicit save status and guarded local export/import. Reject oversized,
  unknown-version or corrupt imports without replacing good progress.
- Reuse lazy GLB loading, bounded caching and shared/instanced scenery.
  Target DPR 1 and the existing 1280×720 drawing-buffer cap. Start with a budget
  of six visible wild creatures, approximately 60 draws and 100k visible triangles;
  measure and revise rather than claim hardware results from these targets.
- Check 320/390px phones, tablet, desktop, keyboard-only use, motion reduction,
  sound controls, storage denial/quota, missing-model fallback and restart cleanup.
- Run pure regressions, a full normal-input campaign playthrough, save migration
  tests and the mandatory full registered-catalog browser gate before any push.
  The unregistered RPG receives its own full-game checks too.

## Work breakdown and approval boundaries

After approval, split each phase into narrow 10–20-minute mechanical tasks with
non-overlapping paths: world/content, battle/balance, renderer, UI and saves.
I retain game direction, asset decisions and visual/integration review. Each
milestone is locally committed, checked and shown with actual playable captures.
Long all-catalog QA is a separately bounded monitored operation, not an extended
coding worker. No silent release or giant simultaneous rewrite.

Use a small plain-data `campaign.js` when campaign content is implemented.
Extract UI rendering into `ui.js` when it grows, rather than expanding the current
entry file into a multi-thousand-line monolith. No generic quest scripting
language, plugin layer, replacement renderer, build system or new dependencies.

**Not included by default:** multiplayer/trading, cloud accounts, breeding,
procedural infinite terrain, a full physics engine, voice acting, monetization,
extra species or a second combat mode. This proposal adds depth to the existing
80-species game rather than increasing the creature count.

The optional hidden creature stays unavailable until its unique asset and data
are supplied and approved. Its 10,000–15,000 triangle target / 15,999 hard maximum
remain separate; it cannot block the base game.

Catalog ID remains unresolved. No registration or push without separate owner
sign-off. Existing creator/license assertions and publication holds are not
cleared by approving a development plan; new assets must have documented
original/reusable-source provenance.

**Approval requested:** the five-region scope, papercraft visual direction in the
three concept shots, and strategic turn-based three-member-party design. Owner
may change scope/style/content before any gameplay implementation starts.
