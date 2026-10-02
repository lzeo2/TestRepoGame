# Foldwild implementation order and first-milestone contract

## Authorization

The owner explicitly ordered: "now plan out the game in detail and get to
implemntaton". This authorizes development of the existing original Foldwild
RPG and the previously requested systems. It does not authorize another game,
extra catalog entries, registration of Foldwild, publication, a push, or a
rights/history rewrite. The original 80 supplied models and local MIT renderer
remain the foundation. The uploaded horror candidate remains a separately
reviewed optional integration; do not invent its species identity.

[Full design](foldwild-development-plan.md) and [visual direction](foldwild-concept-shots.md)
remain applicable. This file makes the work concrete; milestone completion must
be recorded with commands, commits and actual gameplay captures, not inferred
from new modules existing.

## Adventure and chapter pacing

The player is a field archivist reopening five expedition routes. Each chapter
includes a populated outpost, surveying/capture discoveries, a supplies task,
an optional team challenge and an authored regional trial. Trials award route
access, Marks, field-rank progress and outfit/class unlock opportunities.

| Chapter | Field route | Target ally levels | Regional trial |
| --- | --- | --- | --- |
| 1 | Rootfold Meadow | 3–8 | Maren: energy and defense |
| 2 | Stillwater Reach | 8–14 | Sola: switching and currents |
| 3 | Emberstep Quarry | 14–20 | Neri: pressure and recovery |
| 4 | Stonefold Ridge | 20–27 | Iven: coverage and shield timing |
| 5 | Quietfold Hollow | 27–34 | Oren: disruption and adaptation |
| Finale | Return expedition | 30–35 | Several encounters, recovery between stages |

These are pacing targets, not forced level caps. Existing v1 rival victories
and allies are preserved during migration, with legacy third-region progress
mapped explicitly rather than discarded. Level 40, rematches, all 80 acquisition
paths and class alternatives provide postgame goals.

Each authored region is 160 x 160 m, including scenery/non-walkable ground.
Populate 48 NPCs: region counts 10/10/10/9/9, including 12 principal characters.
There are five main outposts and four road posts across these maps. Residents
have concise reactive dialogue and useful jobs; only nearby actors update.

## Milestones and exact checkpoints

1. **Playable expedition foundation:** implement region data/collision/routes,
   five-region save structure with v1 migration, first-region population, economy,
   individual profiles, class/synergy rules, world-first interface and low preset.
   Then integrate and prove a real starter -> merchant -> wild battle/capture ->
   cosmetic/class/team edit -> save/continue loop. Other-region data is not proof
   of a completed campaign. Review desktop/mobile captures before expansion.
2. **Field ledger and character expression:** searchable discovered information,
   rotatable model inspection, safe release/favorites, outfit controls, tested
   creature accessories, item use, evolution presentation and explicit saving.
3. **Campaign content and balance:** all 15 tasks, 48 reactive NPCs, rival arcs,
   five trials/guardians, final expedition, acquired classes/ranks and all-species
   reachability. Complete naturally from a clean save with no grants.
4. **Optional secret integration:** approve textured-format/style/provenance,
   prepare documented lower-texture derivative, decide original data/encounter,
   implement an optional avoidable cave encounter and test its resource cleanup.
5. **Procedural frontier:** stable seeded 64 m chunks, shared-edge connectivity,
   bounded streaming and change records, outpost contracts and expedition returns.
   This follows the working authored loop, not a simultaneous engine rewrite.
6. **Release checks:** final visual/accessibility review, economy/build/attribute
   exploits, migration and recovery, cold/warm profiles, real N100/8 GB Chromebook
   measurement plus low fallback, and a fresh unfiltered registered-catalog gate
   before any owner-authorized push. Record unavailable hardware as unverified.

All coding workers use actual provider `openai-codex`, model `gpt-6.1-sol`, and
10–20 minute bounds. Main owns design, orchestration and subjective review.
Small disjoint-path commits; no persistent servers, new dependencies or broad
Games checkout. Preserve original asset bytes. First-milestone changes must not
wait for every later feature to exist before they can be played/tested.

## Module ownership and first-milestone ABI

All modules are native ES modules. Functions copy input rather than mutate it;
validation occurs at persistence and transaction boundaries. No plugin framework,
quest DSL, backend or renderer-owned simulation/animation loop.

### Region data and world/save (`region-data.js`, `world.js`)

Retain existing exports and signatures in `world.js`. Add:

- `REGION_LAYOUTS`: five objects keyed by index. Each has `bounds` (+/-80),
  `spawn` (`{x:0,z:16,yaw:0}` initially), `palette` (ground/leaves/stone/water),
  `paths` (arrays of `{x,z}`), `props` (kind/x/z/w/h/d/color), `colliders`
  (minX/maxX/minZ/maxZ), `waynodes` (x/z), and `points` (static named POIs).
- `movePosition(region, position, dx, dz)`: axis-sliding collision, player radius
  0.35 m, clamp to bounds, preserve yaw; no teleport through water/buildings.
- `routeTo(region, from, target)`: array of x/z waypoints including the target;
  use visibility edges through authored waynodes. Empty on unreachable, never
  silently walk through a collider. Test every static POI from the spawn.
- `unlockedRegion(state)`: greatest allowed route index; five sequential trial
  ids 0..4. Migrate old three-rival progress explicitly and document mapping.

`worldPoints(state)` retains ids `wild-0`, `wild-1`, `wild-2`, `camp`, `rival`,
`exit`; adds NPC/merchant/mentor/supply/contract POIs. Every point has id/type/
x/z/label. Merchant points add `shopId`; NPCs add `dialogue`; supplies add
`materialId`/`quantity`; contract points add `contractId`. Derive wild species
from region/seed/encounterIndex with habitat weighting, using canonical data.
Do not promise all-species reachability until the later acquisition audit.

`freshGame` returns version 2 plus the old fields. New fields:
`marks`, `inventory`, `cosmetics`, `shops`, `contracts`, `claimedSupplies`,
`activeClass`, `appearance`, `favorites`, `quality` ('low'/'standard'),
`legacyRivals`; creatures preserve optional profile/traitId/cosmeticId.
V1 Maren/Sola wins map to trial ids 0/1. Old Iven id 2 becomes a saved legacy
Iven badge; completing new trial 2 (Neri) later credits trial 3 (Iven) without
paying it again. Migration relocates to a safe new spawn rather than inside
changed scenery, preserving named victories, allies, XP and score. Fresh
`legacyRivals` is empty; fresh quality is low. Appearance defaults:
`{name:'Archivist',skin:'#bc916b',hair:'short',coat:'#365a74',backpack:'#b39a6c'}`
with a small allowed palette/style vocabulary, not arbitrary HTML/assets. Keep bounded canonical IDs, integer resources, a 256 KiB
serialized cap, and corrupt-save byte preservation. Keep the old storage key
for compatibility; create a scoped previous-snapshot backup and preserve good
progress on write/quota failures. V1 creatures migrate neutral, not rerolled.
Pending-battle recovery is a subsequent bounded save/core task, not faked here.

### Economy (`economy.js`)

Exports `ITEMS`, `COSMETICS`, `SHOPS`, `CONTRACTS`, `freshEconomy`, `buyItem`,
`sellItem`, `buyCosmetic`, `completeContract`, `refreshStock`.

`freshEconomy()` returns the six matching economic state fields plus
`claimedSupplies`. Initial Marks 90, inventory `{patch:2,charge:2,fiber:0}`,
cosmetics `['none']`, nine canonical shop stock records. Kites remain the existing
`state.kites` field (initial 8); other goods use `state.inventory`.
Items: kite (12 Marks, non-resellable because camp supplies a free safety floor),
patch (18/sell 6), charge (16/sell 5), fiber (5/sell 1).
Cosmetics: none/free, badge/20, scarf/35, paper-hat/45. Definitions have id/name/
price/sell where relevant; cosmetic list stays small and renderer-testable.

Transactions `(state, shopId, itemOrCosmeticId, quantity=1)` return a validated
copy or throw without changing input. `completeContract(state, contractId)` is
a single payout: deliver three fiber, reward 35 Marks. Catalog contracts belong
to the nine shops. Refresh stock only when `floor(encounterIndex/5)` advances;
not on opening/reloading a shop. Reject quantities/overflows, unknown IDs,
insufficient stock/credits and repeated contract payouts. No player-to-player
trading. Curated NPC creature exchange follows after the basic transaction loop.

### Individual builds and battle (`builds.js`, `battle.js`)

Exports `CLASSES`, `TRAITS`, `generateIndividual(seed)`, `validateIndividual`,
`unlockedClasses(state)`, `synergyFor(team)` from `builds.js`.

Creature `profile` has hp/energy/attack/defense/speed integer percentages -8..8,
sum zero. Missing profile is neutral. Trait ids: neutral, steady, nimble,
resourceful. `generateIndividual` is deterministic and returns profile/traitId.
`createCreature` accepts an optional fourth options argument with profile/
traitId/cosmeticId, while old calls remain neutral and retain old results.
`statsFor` uses canonical base x level scale x profile multiplier. Evolution
preserves the profile, trait and cosmetic; no all-stats maximum random roll.

Classes: pathfinder (always), binder (three caught species), warden (one trial),
tactician (three caught elements), quartermaster (one completed supply contract).
M1 establishes these unlocks and one small perk; later tasks implement all
three ranks. Perks: binder +0.04 capture chance; warden +2 applied shield;
tactician +1 switching energy; others field/economy context. Traits: steady +1
shield, nimble +1 switching energy, resourceful +1 Wait energy; neutral none.
Synergy: three distinct elements -> coverage/+1 switching energy; two same
family -> kinship/+1 shield; otherwise none. Exactly one synergy, coverage wins
when both apply. Shield hard cap 26 and energy/max capture bounds enforced.

`createBattle` accepts optional `classId`/`enemyClassId` with default none and
`synergyEnabled=false` so legacy neutral tests retain their semantics. The new
core explicitly enables synergies and passes its active class. Display the
derived synergy, with effects gated by the flag.
Keep normal snapshot-based pure resolution and improve enemy choices without
unlimited shield/heal loops. Export `validateBattle` for later pending-battle
persistence if safely implementable. Do not add an unfinished item action.

### View (`view.js`)

Retain all public methods; consume `REGION_LAYOUTS`. `showWorld` accepts optional
`appearance`; `showBattle` accepts optional region/playerCosmeticId/
enemyCosmeticId. Add `setAppearance`, `setQuality('low'|'standard')`,
`orbitCamera(delta)`, `recenterCamera`, `getCameraYaw`.

Build world-first third-person scenes like the approved concept: original
low-cost roofs/houses, winding paths, river/bridge, instanced groves/rocks,
landmarks and populated outposts. No floating showroom pads. Source geometry/
colors remain unmodified; cosmetics are separate attached shapes. Draw nearby
POIs only and preserve current lazy 12-entry ref-safe model cache. Drive idle,
lunge/recoil and kite motion from the core's existing `render(dt)` loop. No
unrigged limb/mouth motion claims. Default low max 960 x 540, DPR1, simple lights,
no expensive full-screen effects; standard max1280x720. Inspect actual draw/
triangle/cache counts. No fake N100 performance or fallback-model pass.

### UI (`index.html`, `style.css`)

Retain every existing id/data attribute the core uses. Add a reusable native
`service-dialog` with `service-title`, `service-description`, `service-content`,
`service-close`; a `services-btn`, `marks`, `class-name`, `synergy-name`,
`camera-reset`, `quality` select and optional `seed-input`. Add region buttons
3/4. Preserve movement controls added by the core, hidden semantics and modals.

Style exploration world-first, a compact team strip, short nearby actions,
model-focused battle with all primary controls visible, readable discovery
cards and service menus. Native local fonts, flat colors, radius6/4, 44px targets,
no gradients/emoji/emdashes. CSS is real shell work, no placeholder controls
misrepresented as implemented. Main/core subsequently wires all new ids.

### Core (`script.js`)

After modules/UI stabilize: wire native service interactions, wallet and class/
synergy displays, seeded individual encounters, purchases/sales/contracts,
recovery supplies outside battle, owned cosmetic equip, avatar colors/class
selection, discovery filters and UID-based party editing. Use collision/routes
for movement and five-region locks, camping with minimum four free kites and
no Marks reward, and actual saved economic/profile changes. Battle rewards:
ordinary win/capture 18 + 2*total enemy levels Marks; first trial 60 + 3*levels,
no money for fleeing/loss or repeated one-time trial reward. Transactions and
rewards occur once, then validated saving. Preserve pause/restart/input/modal
cleanup and the read-only snapshot getter; no mutable debug cheats.

Later core tasks add pending-battle recovery, final campaign content, advanced
ledger preview, authored exchanges and frontend frontier integration. Report
unimplemented elements rather than leaving attractive dead buttons.
