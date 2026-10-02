# Worker 96: campaign/save implementation checkpoint

Implemented under Main's committed [implementation order](implementation-order.md)
at `df5b853727701989be165b5796df31e6f1a3f310`, not the superseded tentative
completion choices. Initial runtime tree and inventory both matched
`a95c344888434010772c481f419cc9b933bc6dc0`. Executing provider/model:
`openai-codex/gpt-6-astra`, reasoning `high`. Started 2026-10-02 11:20 UTC;
this is a bounded pure-module implementation, **not campaign acceptance**.

## Ownership and reading

Owned source: `Games/Foldwild/campaign.js`, `Games/Foldwild/world.js`.
Owned new regression: `scripts/test_foldwild_campaign.mjs`. This report is the
only owned documentation. Read AGENTS, CODE_QUALITY, complete ponytail skill,
maintenance index, complete Foldwild manual, its exact inventory record,
complete frozen implementation order via `git show df5b853`, and complete
completion contract. Read world, battle, builds, economy, data, region-data,
controller, and affected world/save/continuity/conflict/cap-XP/region suites.
Reviewed current sibling rank exports before composition checks.

No controller, economy, renderer, region, data, model, vendor, catalog or
protected path edit. Eighty immutable original GLBs and hidden-null remain
unchanged. No dependencies, installs, build, browser, native test, server,
registration, new game or push. Catalog remains 115; Foldwild unregistered.

## Exact APIs and integration instructions

- `campaign.js`: exports deeply frozen `RIVALS` (moved byte-for-byte unchanged),
  deeply frozen `FINALE_STAGES` in the exact ordered `{id,region,pointId,name,
  host,lesson,team:[{speciesId,level}]}` format, and `ENDING` with the frozen
  ending copy. No imports or cycles. World re-exports `RIVALS` for old callers.
- `freshGame` and `validateSave` return canonical `version:3`, required
  `finaleStage:0..3`, `pendingChallenge:null|{kind:'finale'|'rematch',id}`.
  Genuine v1/v2 default to 0/null. Pristine explicit defaults in relabeled test
  fixtures also migrate. Nondefault old-version completion/context and ranks
  above historical baseline are rejected, not erased. Five old trials do not
  imply finale completion. V1 neutral migration, safe relocation and legacy
  Iven credit remain unchanged. Storage keys and writer/read return APIs remain
  unchanged; old runtimes reject schema3.
- `challengeFor(state, context)` validates/copies the save, rejects any pending
  battle, checks five trials, expected stage, exact current region and authored
  point within 1.8 meters, and at least one conscious team member. Returns a
  frozen descriptor `{id,region,pointId,name,host,lesson,team,kind}`. Its nested
  `team` is the frozen species/level table, **not creature instances**. Invalid
  or unavailable challenges throw. No Marks, kites, collection or rank gate.
- Controller must call `challengeFor` again on Begin, also rechecking its own
  phase/input guards. Build neutral enemies with `createCreature(speciesId,
  level, \`${kind}-${id}-${encounterIndex}-${slot}\`)`; battle kind `rival`, seed
  `(seed+encounterIndex)>>>0`, active class plus `classRank(state,activeClass)`,
  synergy enabled. Record seen enemies and exact pending context/battle.
- Pending validation retains all existing player-resource/effect/order/UID,
  size, integer, economy and storage guards. Challenge opponents must match
  exact species, levels, order, UIDs, neutral profile/trait, no cosmetic and zero
  XP. Opponent class/rank must be none/0; player rank cannot exceed earned
  history. Lower pinned ranks remain valid. An ongoing active living team is
  required, not merely known species. Ordinary wild/trial identity and RNG
  code is unchanged.
- `settleChallenge(state, endedBattle)` returns a new validated state, never
  mutates either argument. **State must be the immediate pre-command checkpoint,
  including matching pendingBattle and roster resources. Call BEFORE copying
  ended resources into the roster.** It canonicalizes the ended battle and
  compares against at most eight deterministic legal `applyAction` results
  from the validated pending checkpoint (Wait, four abilities, three switches).
  This proves the terminal transition rather than trusting forged zero-HP
  opponents, outcome flags, identities or logs. It rejects mismatched/repeated
  settlements and non-win/loss results. No extra stored snapshot or telemetry.
- Settlement clears both pending fields, copies party resources, awards XP
  `12*sum(levels)+20` to existing team members only, ordinary Marks
  `18+2*sum(levels)` and score `40+10*sum(levels)` only on genuine victory;
  applies existing caps and XP evolution/history. Finale advances one stage;
  rematches never alter trials/stage or pay first-trial/terminal extras.
  Loss heals the full roster, restores at least four free kites and returns to
  the authored camp point; preserves stage, XP, Marks and trial history. Both
  outcomes increment encounterIndex once with the existing 1e9 cap.
- `worldPoints` preserves camp type, role and `Rest Camp` label; eligible camps
  add `challenge`, `challengeName`, `lesson`. Completed regional rivals retain
  `type:'rival'`, original position/metadata, explicit `<host> rematch` label,
  and `{kind:'rematch',id:region}` context. No RNG consumption added.

Controller integration remains unimplemented here. Existing controller must not
route these contexts through ordinary first-trial settlement. Its pre-command
pending snapshot must be kept current for every challenge command. UI Begin/
Back, result/ending focus, rank benefits, reset consent and saved summaries are
Main/integration-worker scope. Existing camp recovery code remains untouched.

## Existing-test changes, exhaustive justification

Only explicitly authorized additive/schema expectations changed:

1. `scripts/test_foldwild_world.mjs`: exact export list adds `challengeFor` and
   `settleChallenge`; fresh canonical version expectation 2 -> 3. Unsupported
   numeric version fixture 3 -> 4 in the bad-version loop, corrupt read and
   invalid-write checks. All old validation, pool, storage and replay assertions
   remain. Its historical PASS banner still says v2; no claim it tests only v2.
2. `scripts/test_foldwild_save_v2.mjs`: migrated canonical version expectation
   2 -> 3; unsupported corrupt version fixture 3 -> 4. All substantive legacy,
   identity, resource, economic, getter, backup and quota assertions remain.
3. `scripts/test_foldwild_continuity.mjs`: **unchanged**. It passes with factory
   snapshots carrying additive side ranks and pristine defaults in old fixtures.

Unowned `scripts/test_foldwild_save_conflict.mjs` still treats version3 as invalid
at line80 (also line97) and expects migrated version2 at line94. Left untouched.
It fails at line80 because the valid write returns null. Main must explicitly
review/update these schema-only expectations, then rerun the entire suite.
The new campaign suite independently exercises guarded writes, stale expected
bytes/null, invalid expectations, exact raw metadata, backup-before-primary
quota behavior, denied storage, corrupt imports and byte preservation.

## Regression evidence

New suite explicitly labels fixtures as composition/hostile imports. Covers
all three exact lessons and all five rematches, availability/location/ready
checks, rank pinning/earned mismatch, hostile exact contexts and identities,
v1/v2 migration and exact historical pending next action, terminal command
proof, win/loss/replay, stage one-shotness, ordinary rewards/caps, levels12/26
and persistent history, non-team reserve exclusion, zero Marks/kites recovery,
160-creature availability, copied/frozen inputs, pending continuation,
getters/prototypes/oversize and storage conflict/backup/quota semantics.
Synthetic preterminal damage and supplied high-level parties are fixtures,
not ordinary campaign progression or pacing proof.

Executed command:
`node --experimental-default-type=module scripts/test_foldwild_<suite>.mjs`.
Actual stdout prefixes and exit statuses, from the same shared working tree:

| Suite | Actual output prefix | Exit |
| --- | --- | --- |
| data | `PASS: 80 exact roster species; 16/element; 10 families x8; 50 exact normative actions` | 0 |
| battle | `PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse)` | 0 |
| world | `PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80` | 0 |
| regions | `PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts` | 0 |
| economy | `Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards).` | 0 |
| builds | `Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards).` | 0 |
| battle_v2 | `PASS: battle v2 all 80 profiles/evolutions; every class/trait` | 0 |
| save_v2 | `PASS: v1 neutral migration and legacy Iven badge; five-region route/reexports` | 0 |
| continuity | `PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay` | 0 |
| cap_xp | `PASS: XP cap fixtures; v1/v2 accepted XP retained` | 0 |
| save_conflict | `AssertionError [ERR_ASSERTION]: The "string" argument must be of type string. Received type object (null)` | 1 |
| campaign | `PASS: campaign composition fixtures; F3/R1 exact tables; schema3/v1/v2 migration and old-rank next-action replay` | 0 |
| class_ranks (sibling) | `PASS: class rank thresholds/history/immutable perks; getter/prototype/duplicate/rank rejection; pinned shield/switch/capture/Wait stacks and caps; 168 baseline legacy replay snapshots exact` | 0 |

Campaign reran after the final additional reserve/capacity/pinned-rank fixtures:
exit0, same PASS line ending `Natural campaign acceptance NOT established.`
Total distinct pure suites at this checkpoint: **12 pass, 1 blocked schema
expectation**, not 13 accepted gates. Shared sibling builds/battle/tests were
uncommitted during this run; Main must rerun after both commits.

ESM `node --experimental-default-type=module --check` on owned world, campaign,
new regression and two adjusted suites: five exit0, no syntax diagnostic.
`git diff --check`: exit0. Catalog/schema/tracked URL audit: exit0,
`catalog schema/unique IDs/tracked URLs: 115; Foldwild unregistered; additions 0`.
Original table comparison: exit0, `RIVALS moved byte-for-byte unchanged`.
Protected model/vendor/data/region/catalog diff from baseline: no output.
Data suite independently reported `80 tracked/local SHA matches; models=7300844 bytes`.
No new runtime external loads in the owned diff.

`python3 -B scripts/check_maintenance_docs.py`: **exit1**, actual assertion
`Commit inspected source changes before validating its inventory.` No refresh
was attempted on unowned documentation. Main must update the manual/inventory
for both source commits, then rerun; this is a hold, not a passing gate.

Disk guard before source work and after tests: both
`/dev/mmcblk0p2   29G   26G  2.2G  93% /`.
Rounded reported storage delta: 0.0G; precise initial byte count was not
captured, so no byte-accurate workspace delta is claimed. Above the 2GB guard.

## Handoff and holds

Report: `docs/foldwild-polish/campaign-save-implementation.md`.
Full command/output evidence is in session log basename
`2026-10-02T11-20-02-827Z_01a0fc57-ba08-7533-b088-9cb2ec29d7c2.jsonl`;
no private machine path is committed. Commit SHA and final report SHA256 are
returned in worker completion, avoiding a self-referential digest here.

Sibling dirty paths observed: `Games/Foldwild/builds.js`, `battle.js`,
`scripts/test_foldwild_battle_v2.mjs`, new `scripts/test_foldwild_class_ranks.mjs`;
these belong to worker95 and are not staged by worker96. New sibling reports
may appear during concurrent work. Rank ABI is required by world imports.

## Post-commit verification

Source commit `c2acba93e80d57a229d71a5cb313b42ee5c6dc63`, author and committer
`Arcade Worker <>`, follows sibling rank commit
`3cd9963c5ca0adf881930606df8f44d6c5cf0f1d`. Inspected staged paths: exactly
campaign/world, this report, new campaign regression and the two authorized
schema-expectation suites. No sibling paths staged.

After both source commits, reran world, save_v2, continuity, campaign and
class_ranks: all five exit0 with the same PASS output recorded above.
`git diff --check`: exit0; `git status --short`: empty.
Maintenance checker rerun: **exit1**, now with the expected actual assertion
`Inventory stale: inspect changes, then run --refresh.` Manual/inventory refresh
remains Main's unowned hold. Disk still 2.2G free. The unowned save-conflict
failure remains unresolved; no claim of a full clean suite or acceptance.

**Held:** Main review/integration, unowned save-conflict expectations,
maintenance refresh, stable uninstrumented native Close, original/async M2,
natural campaign/ranks/alternate starter/pacing, screenshot review, rights,
hardware, full registered-catalog browser gate and release. Browser/native/
full-smoke pass count0; screenshots0. No games added, no build/register commits,
no push. The narrow code milestone does not claim any of those acceptances.
