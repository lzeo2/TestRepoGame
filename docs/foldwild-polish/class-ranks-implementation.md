# Worker 95: class ranks and pinned combat

Bounded implementation checkpoint, not campaign/native/release acceptance.
Executing provider/model: `openai-codex/gpt-6-astra`, thinking `high`, confirmed
from this session's PI environment. Session transcript basename:
`2026-10-02T11-20-02-802Z_01a0fc57-b9ef-70dd-9162-11ab7343d06d.jsonl`.
No separate scratch log was created; command evidence is also recorded below.

## Source and ownership

Started at `df5b853727701989be165b5796df31e6f1a3f310`, Foldwild tree
`a95c344888434010772c481f419cc9b933bc6dc0`. HEAD, working owned modules and
maintenance inventory matched those identities before editing. Read AGENTS,
CODE_QUALITY, complete ponytail skill, maintenance index/manual/inventory record,
Main's complete committed `implementation-order.md` via `git show df5b853`,
complete completion contract and M2 contract. Read complete builds/battle,
world/controller/economy and every tracked builds/battle caller suite, including
builds, battle, battle_v2 and continuity, before editing. Tracked caller search
included sparse-excluded content. Vendor implementations/GLB interiors were not
reviewed here.

Owned changes only:
- `Games/Foldwild/builds.js`
- `Games/Foldwild/battle.js`
- `scripts/test_foldwild_class_ranks.mjs`
- `scripts/test_foldwild_battle_v2.mjs` (additive ABI fixture update below)
- this report

World/campaign and their tests belong to simultaneous worker 96. Controller,
field transactions, economy, region geometry, models, vendor and catalog are
unchanged by worker 95. No installation, build tool, dependency, new game,
registration, sparse selection change or push.

## Exact ABI

- `classRank(state,id)` returns integer 0..3; `none` returns 0.
- `classProgress(state,id)` returns a frozen flat object
  `{rank,current,target,requirement}`. `current` is the relevant history count;
  `target` is the next rank threshold, or the final threshold at rank 3.
  `requirement` is the count label: `distinct claimed supplies`, `caught species`,
  `credited regional trials`, `caught elements`, or `completed contracts`.
  None returns `{rank:0,current:0,target:0,requirement:'No class.'}`.
- History inputs are own descriptor-read optional arrays (missing means empty),
  not roster size or new counters. Caught IDs and contracts must be canonical,
  unique and bounded; defeated trials must be the canonical sequential prefix;
  supplies must be distinct canonical `0..4:supply-0..2` IDs. Sparse, accessor,
  extra-property and nonstandard-prototype arrays are rejected without invoking
  their getters. Legacy Iven only counts when the existing progression puts
  trial 3 into `defeatedRivals`; no extra badge count or retroactive payment.
- Rank thresholds 1/2/3: Pathfinder 0/3/9 supplies; Binder 3/10/25 species;
  Warden 1/3/5 trials; Tactician 3/4/5 caught elements; Quartermaster 1/3/6
  contracts. Existing `unlockedClasses`, traits and synergy return APIs remain.
  Synergy's shared array read is now getter-safe; its rules/bonuses are unchanged.
- `perksFor(id,rank=1)` returns a frozen flat object with exactly
  `captureBonus,shieldBonus,switchEnergy,waitEnergy,fiberBonus,contractBonus`.
  Known locked classes with rank 0 have six zero fields. None must be passed as
  `perksFor('none',0)`; none with nonzero rank is invalid. Real classes accept
  0..3 here, with rank 0 for locked-class display, but only 1..3 in battle.
  Benefits at ranks 1/2/3: fiber 1/2/3, capture .04/.06/.08, shield 2/3/4,
  switch energy 1/2/3, contract Marks 5/7/10. Every class Wait bonus stays 0.
  Existing `CLASSES[id].perks` remains the unchanged four-field base table for
  compatibility; combat uses only the new resolver, never saved perk objects.
- `createBattle(playerTeam,enemyTeam,options={})` additionally accepts
  `classRank` and `enemyClassRank`. Options are validated plain data descriptors
  before destructuring. Canonical sides add `classRank`. Missing legacy ranks
  become 1 for real classes and 0 for none; explicit undefined, null, fractions,
  nonnumbers, unknown classes and inconsistent class/rank combinations fail.
- `validateBattle` validates/copies those side ranks and derives perks from the
  frozen rules. `perform` and capture resolution always use that pinned rank,
  including enemy shield/switch actions. Trait/synergy mechanics and caps remain
  unchanged: shield 26, capture .9, energy maximum. No RNG/counter added.

Integration handoff: worker 96 owns pending rank <= earned validation and neutral
opponent identity. Controller integration must pass earned `classRank` for new
fights, retain old pending ranks, use resolver field bonuses from the
**pre-transaction** history, and preserve inventory/Marks caps. This worker has
not wired field/economy/controller callers or claimed those paths accepted.

## Regression evidence and old-suite change

The new pure suite covers every threshold/count, monotonic history, immutable
inputs/results, release/current-roster independence, legacy Iven semantics,
all six exact perk fields, duplicate/getter/prototype/invalid rank boundaries,
legacy missing-rank canonicalization, explicit high-history/old-rank pinning,
actual Bark Wrap, voluntary switch, Wait and capture actions, every trait at all
three ranks, synergy gating, enemy shield/switch resolution and caps.

Before source edits, the exact seven-command sequence across six classes and
four seeds produced baseline SHA-256
`c5eb75962d4e52847e4b436df2fa5451a3061f1e5c12c24a29e94709a5ba165d`.
The new regression compares all 168 full legacy snapshots to that digest,
stripping **only** new side rank metadata. RNG, logs, resources, effects, builds,
outcomes and all other old fields remain compared. Each step also compares
missing-rank replay with the canonical pinned version.

In `test_foldwild_battle_v2.mjs`, the existing legacy fixture now deletes the
new side `classRank` along with the already-deleted class/synergy IDs. Otherwise
it would manufacture an invalid none/rank1 hybrid rather than a historical
snapshot. Added three assertions: both migrated neutral ranks equal zero, and
the saved real-class rank equals one. No existing assertion removed or weakened.
`test_foldwild_builds.mjs` is unchanged. All fixtures use actual canonical module
species/actions; they are pure copied-state fixtures, not rendered-model tests,
natural progression or native acceptance.

## Actual commands and exits

Initial owned-source run, before sibling world changes, used
`node --experimental-default-type=module scripts/test_foldwild_<name>.mjs`:
`builds`, `battle`, `battle_v2`, `continuity` each exited **0**.

Later full pure run used that same command for each row, while worker 96 was
editing world/campaign. This is not a frozen integrated acceptance run:

| Suite | Exit | Actual stdout / failure |
| --- | --- | --- |
| data | 0 | `PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions; evolution 12/26 acyclic; hidden null; wheel/schema; 80 tracked/local SHA matches; models=7300844 bytes` |
| battle | 0 | `PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only` and `Capture reproducibility: hit seed=670, miss seed=671` |
| world | 0 | `PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; deterministic points/proximity; immutable inputs; strict schema/UID/effects/prototype/unknown ids; canonical resources/progress; storage namespace/quota/security/corrupt-byte preservation` |
| regions | 0 | `PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments; water/bridge/house/sliding/bounds/invalid inputs/immutability` |
| economy | 0 | `Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).` |
| builds | 0 | `Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).` |
| battle_v2 | 0 | `PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; synergy gating; NPC utility/switch targeting; frozen-input replay; canonical snapshots/log limits` |
| save_v2 | 0 | `PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports; v2 economic/profile/cosmetic/class/appearance/favorites validation; no reload restock; descriptor/UID alias defenses; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation` |
| continuity | 0 | `PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay; missed capture; five canonical trials; roster/enemy/HP/XP/counter/schema/accessor rejection; immutable release guards/history; scoped backup/quota/corrupt-byte preservation` |
| cap_xp | 0 | `PASS: XP cap fixtures; v1/v2 accepted XP retained; near/exact ceiling rewards save/reload; frozen inputs; level 12/26/40 resource deltas; validation rejection unchanged` |
| save_conflict | **1** | `AssertionError [ERR_ASSERTION]: The "string" argument must be of type string. Received type object (null)` at `scripts/test_foldwild_save_conflict.mjs:80:8`; expected `/version/`. This old assertion rejects version 3, now accepted by sibling's new world schema. Not edited by worker 95. |
| class_ranks | 0 | `PASS: class rank thresholds/history/immutable perks; getter/prototype/duplicate/rank rejection; pinned shield/switch/capture/Wait stacks and caps; 168 baseline legacy replay snapshots exact` |

Thus **11/12 pure suites passed in that shared-tree run**, not all-green. Several
inherited stdout strings still say v2; that text does not establish schema v2.
After adding the explicit high-history/pinned-rank assertions, class_ranks ran
again with the identical PASS line and exit **0**.

`node --experimental-default-type=module --check <path>` on builds.js, battle.js,
class_ranks.mjs and battle_v2.mjs: each exit **0**, no stdout.
`git diff --check`: exit **0**, no stdout.
Catalog schema/unique IDs/tracked URL check: exit **0**,
`catalog schema/unique IDs/tracked URLs: 115`.
Added-source external-load/RNG/DOM scan: no matches.

`python3 -B scripts/check_maintenance_docs.py`: exit **1**,
`AssertionError: Commit inspected source changes before validating its inventory.`
No refresh attempted. Main owns manual/inventory refresh after reviewed source
commits; the manual's no-ranks description and source fingerprint need updating.

Disk guard before and after: `/dev/mmcblk0p2   29G   26G  2.2G  93% /`.
Later exact free space was 2,324,099,072 bytes, above 2 GB. Rounded free-space
delta is 0.0G; concurrent writes prevent attributing filesystem byte deltas to
this worker. No asset growth; 80 model hashes and hidden null passed data suite.

## Holds and handoff

Main must independently rerun the frozen integrated pure suites after both
workers commit, resolve the old save_conflict schema expectation under its proper
owner, and review both diffs. At report time sibling-owned dirty/untracked paths
were world.js, campaign.js, test_foldwild_world.mjs and test_foldwild_save_v2.mjs;
none are staged by worker 95. Other sibling report/tests may appear concurrently.

No browser/native/full-catalog smoke run, screenshots, natural campaign/ranks,
physical hardware or release acceptance: **zero**. Original and async M2 Close
holds, rights/hardware/full campaign and pre-push gates remain. Games added zero;
catalog stays 115, Foldwild remains unregistered. Commit identity is anonymous
`Arcade Worker <>`; exact SHA and report digest are returned with the task.
