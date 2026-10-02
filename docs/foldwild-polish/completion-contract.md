# Foldwild completion contract: ending and class learning loop

Task 90 retained draft, finished by Task 92 as a documentation-only review.
**Main approval required before implementation.** Task 90 timed out without a
commit; its retained evidence below is not a completed-task claim. Task 92's
separate review and validation are recorded in section 11.
This extends the existing authorized original Foldwild, not another game.
Finale and three-rank classes are not implemented in the inspected source.
This report certifies neither gameplay nor native input. Main retains content,
balance, copy, visual judgment and implementation/release decisions.

## 1. Evidence, scope and current-source warning

Task 90's retained runtime/session evidence (reported exit 0, not Task 92's
execution identity):

```text
PI_CODING_AGENT=true
PI_PROVIDER=openai-codex
PI_MODEL=gpt-6-astra
PI_REASONING_LEVEL=high
PI_SESSION_ID=01a0fbe6-5964-767f-880b-7c7d81f7e95b
```

Session log basename:
`2026-10-02T09-16-12-522Z_01a0fbe6-5964-767f-880b-7c7d81f7e95b.jsonl`.
This identifies the earlier draft session only; Task 92's independently checked
execution identity is in section 11. Historical SOL references do not identify
either session's actual execution.

Task 90's retained reading ledger (not a claim that Task 92 repeated it): `AGENTS.md`, `docs/CODE_QUALITY.md`, the installed ponytail
skill, `docs/maintenance/README.md`, the exact
`docs/maintenance/games/unregistered-foldwild.md` manual,
`docs/foldwild-development-plan.md`, `docs/foldwild-implementation.md`,
`docs/foldwild-m2-contract.md`, `docs/foldwild-milestone-review.md`, and
`docs/foldwild-polish/{gameplay-review,ui-review,integration}.md`.
Read all eight authored `Games/Foldwild/*.js` modules, `index.html` and
`style.css`, plus the documentation checker. Read Foldwild's exact inventory
record and searched tracked runtime/test callers. Vendor implementations,
binary GLBs, other reports and gameplay test bodies were not fully reviewed.
No screenshots, native runners or game tests were executed.

Task 90's inspected HEAD: `fcf11de7b3aa9eef3b56f41cee9dd45665b3d3f2`.
Current Foldwild tree: `a95c344888434010772c481f419cc9b933bc6dc0`;
entry blob: `9d30203739b60208468345144590cf7c39c237db`.
`git diff --quiet HEAD -- Games/Foldwild` exited 0.
Inventory still records tree `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`
and entry `b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`: **stale**.
The manual's inspected-source limits and historical PASS reports therefore
cannot establish acceptance of current source. Main must update that manual
and refresh inventory after independently reviewing the intervening changes;
this worker owns neither path.

In particular, current source supersedes several older findings: `writeSave`
accepts expected primary bytes; the controller queues writes under cooperating
Web Locks, exposes import/export/backup previews, and never saves on unload.
`gainXP` now clamps XP to 1,000,000. The renderer now reports context loss and
pending/failing loads with a 20-second load limit. These are source observations,
not new verification of those fixes. The original uninstrumented M2 single-touch
close hold remains authoritative; the separate async-contract worker owns its
review, not this report.

## 2. Approved target versus missing decisions

The development plan's Phase 4 and implementation order's Adventure table and
milestone 3 approve a **multi-stage return expedition**, several encounters,
recovery between stages, target ally levels 30–35, then useful free exploration
and rematches. They do not specify stage count, opponents, locations, rewards,
loss checkpoint policy or ending dialogue. Merely renaming Oren's current
five-routes result would not satisfy that target.

The plan approves five specializations, one active at a time, three small ranks
per class, clear requirements, limited contextual perks, persistent progress
and free switching at camp/outposts. M1 fixes the unlocks and base benefits;
it explicitly leaves ranks for later. There are **no approved rank-2/3 numbers
or thresholds** in these inspected contracts. The following proposals are
bounded choices, never claims of previously approved content.

Immutable boundaries:

- Keep Rootfold Meadow/Maren (energy and defense), Stillwater Reach/Sola
  (switching), Emberstep Quarry/Neri (pressure and recovery), Stonefold Ridge/Iven
  (coverage and shields), Quietfold Hollow/Oren (disruption and adaptation),
  in the current order. No sixth region or new character roster.
- Keep all 80 species, supplied GLB bytes/default colors, 50 actions, five-element
  wheel, three-member team, level cap 40, evolution edges/thresholds 12/26,
  saved individual profile/trait/cosmetic/UID and current base class identities.
- Camp remains free full-roster recovery and a minimum of four kites. No rank,
  payment, completion requirement, rare drop or optional species gates recovery.
- `OPTIONAL_HIDDEN_SPECIES` remains null. No frontier, networking, new species,
  dependency, framework, vendor edit, new art or catalog registration.
- This narrow ending/rank milestone does not claim to finish all 15 distinct
  tasks, reactive NPC arcs, natural all-80 acquisition, evolution deferral,
  cosmetic fit, hardware or the whole development plan.

## 3. Canonical flow and every affected integration boundary

Paths below are relative to `Games/Foldwild/`; symbols are the patch anchors.

| Boundary | Current authority and required integration |
| --- | --- |
| Roster/constants | `data.js`: `SPECIES`, `BY_ID`, `ABILITIES`, `ELEMENT_WHEEL`, hidden null. Read-only input for stages; reject unknown IDs, never duplicate species stats/actions in campaign data. |
| Region identity/navigation | `region-data.js`: five layouts, authored POI IDs, colliders, `movePosition`/`routeTo`. Reuse existing gate/camp/mentor coordinates; no new navigation system. `worldPoints` feeds both controller interaction and view. |
| Fresh state/progression | `world.js`: `freshGame`, `validateSave`, `unlockedRegion`, `RIVALS`. `defeatedRivals` must remain exactly the sequential prefix 0..4, not finale wins. Finale completion must be separate. |
| Legacy rivals | `validateSave` maps v1 victories 0/1 directly, old Iven id 2 into `legacyRivals:[2]`, removes it from current trial prefix and safely relocates. `script.js:finishBattle` credits new Iven id 3 after Neri id 2 when the legacy badge exists, without another Iven payout. Keep this exact semantic mapping. |
| Discovery/class facts | `script.js:markOwned` records evolution/capture history into `seen`/`caught`; `releaseCreature` preserves that history. `builds.js:unlockedClasses` derives unlocks from caught species/elements, trial prefix and contracts. Class ranks must use canonical history, not current roster size or rendering. |
| World RNG | `worldPoints` derives habitat selections from seed, region and encounterIndex independently of battle RNG. Preserve wild UID/profile construction and ordinary RNG schedule; opening class/finale UI must not consume RNG or encounters. |
| Interaction/start | `approach`, `interact`, `beginBattle`, dialogue close/cancel, `travel`, `showWorld`. Current last exit emits "final expedition is not part of this milestone". Add approved finale availability at this shared dispatch, not only a decorative button. Recheck phase, location, trial completion and expected stage on Begin. Cancel is mutation-free. |
| Battle construction | `createBattle` permits only `wild`/`rival`, default class none/synergy disabled for old callers; controller explicitly supplies activeClass/synergy true. Reuse rival battle mechanics for uncapturable finale challenges; distinguish campaign context outside battle kind. Do not let generic rival branches infer a regional trial award. |
| Command/settlement | `command` -> `applyAction` -> `copyBattleTeam` -> `finishBattle` -> `save`; `battleFinished` suppresses repeated in-memory settlement. Combat owns all effects, active slots, RNG and result. Stage advancement/rewards belong to settlement, never a model callback, dialog close or Continue. |
| XP/evolution/rewards | Wins/captures currently award each existing team UID `12*sum(enemy levels)+20` XP before captured ally insertion. Ordinary Marks are `18+2*levels`; first trial `60+3*levels`, with score and integer caps. Finale must take an explicit reward branch, not the first-trial branch; preserve ordinary behavior. `gainXP` preserves individuals and caps XP. |
| Pending save | `localSnapshot` copies exact battle while phase=battle; `pendingBattleCopy` checks canonical effects/resources/team/class/seen enemies and generated identity. Its current non-wild branch assumes `RIVALS[state.region]` and rejects defeated trials. Finale and any rematch need explicit context validation before that branch, not relaxed enemy checking. |
| Class combat | `battle.js:classFor`, `perform` and capture chance resolve class benefits, traits and one synergy. Rank-aware perks must share one pure resolver; `createBattle`/`validateBattle` and pending-save checks must retain selected rank across reload. No serialized arbitrary perk objects. |
| Class field/economy | `collectSupply` grants Pathfinder +1 fiber once per canonical supply ID; the contract callback grants active Quartermaster +5 Marks after `completeContract`. Update these callers if approved ranks alter benefits, using the same resolver as class copy. Nine contracts/15 pickups remain one-shot; no retroactive payout on rank-up. |
| Services/team editing | `serviceAction` validates a copy and requires current field/shop/contract/outpost proximity. `atOutpost` includes camp, mentor or shop. `renderServices`/class selection must display current/next rank and preserve free outpost switching. Ledger/release/appearance edits remain blocked in battle and retain UID/favorite/last-ally safeguards. |
| Stock | `refreshStock` uses floor(encounterIndex/5); save validation checks but does not apply restock. Settlement currently increments encounterIndex on win, capture, loss and flee. Specify finale/rematch increment policy once; do not add a second stock clock or restock on load/rank/ending. |
| Durable storage | `validateSave` -> `writeSave(state,storage,expectedPrimary)` -> exact old bytes backup -> primary. `save()` snapshots before queued Web Lock execution; updates expected bytes only on success. All new fields must survive every projection, queued snapshot, export/import, preview/confirmation and resume. No second key or bypass writer. |
| Recovery/replacement | `readSave`, `previewSave`, `importFile`, Save/backup/replacement confirmation, `resumeSaved`, `confirmReset`/`start`/`returnToMenu`. Pending context and ranks must round-trip through all of them. Preview needs campaign status; replacement resumes selected snapshot, not current-tab stage. Async staleness fixes remain Main/other worker's boundary. |
| UI/results | `updateHUD`, `renderBattle`, `result`, `result-continue`, `renderServices`, `collection`, `saveSummary`, last-exit copy. Current Continue label incorrectly equates five trials with final free play for this future milestone. Distinguish routes cleared, next finale stage, campaign complete and collection progress. Result focus/announcement uses the existing transition, not a second screen framework. |
| View/input lifecycle | `showBattleModels`/`view.showBattle` use existing region/species/cosmetic IDs. `closeInspection` restores world/result using the same canvas; result may have a battle or be a nonbattle gate message. Keep both paths correct for ending review. Preserve `setPhase`, busy lock, `clearInput`, modal guards, pause/hidden behavior, one RAF, model generation tokens and truthful diagnostics. No rank or award writes from view. |
| Observability/acceptance | `foldwildSnapshot` stays a deep-frozen getter; new canonical fields may be observed, never assigned. Existing scripts consume save/battle/HUD APIs. Coordinate ABI additions without weakening unchanged M2 checks or calling a fixture a completed campaign. |

## 4. Smallest finale proposal for Main approval

**Recommended bounded option F2:** two explicit training encounters on the
return route, using existing maps and characters/species only. Stage 0 starts
at Quietfold Hollow's existing `exit` after all five trials; stage 1 is offered
at Rootfold Meadow's existing `camp` after stage 0. Main must approve the
selected existing hosts, exact one-to-three-species teams, levels within the
30–35 target, lesson/copy and whether this is enough "several encounters".
This report deliberately supplies no invented approved opponents or dialogue.
Use ordinary travel and camp, not automatic world teleporting or a new arena.

**Alternative F3:** three encounters, adding one approved existing-region
checkpoint between those endpoints. It costs one table row and one natural
stage test, not a new system. Main selects the intermediate existing POI and
opponents. Do not quietly implement F3 or five guardian battles on F2 authority.

For either choice:

1. Oren clears trial 4 as today. This unlocks the return expedition, not the
   campaign-complete flag. Show the next real location and recovery guidance.
2. Each stage has a compact prebattle reminder tied to its approved lesson,
   exact enemy preview and Begin/Back controls. A varied team is encouraged;
   do not impose a mandatory class/rank/three-element party without approval.
3. A won stage advances the checkpoint once. Loss heals/returns to the existing
   camp in that region, retains completed stages and collection, and permits
   retry of the same stage. No money fee or forced restart from stage 0.
4. Between stages, free exploration, free camp healing/kites, ledger and outpost
   class switching remain available. No automatic back-to-back fight. Stage
   completion persists even after training elsewhere or changing class.
5. Last stage settles, then existing result UI shows a genuine campaign ending
   and a Continue free play action. Completion remains visible after reload;
   no repeated reward is tied to viewing that result. A non-paying review of
   ending text can reuse the camp/service UI if Main wants replayable copy.
6. Recommended reward baseline, **not approved**: ordinary win XP/Marks/score
   once per stage, no extra economic ending payout; persistent completion is
   the ending reward. Main can instead approve one small fixed terminal payout,
   atomically gated by the last-stage transition. Never grant creatures or a
   new cosmetic/model merely to make the ending look substantial.
7. Recommended encounter counter policy: one increment per resolved challenge,
   including loss as today; none for stage travel, dialogs, camp or rank-up.
   Loss cannot pay stage XP/Marks. This preserves the ordinary stock epoch rule.

### Minimal canonical shape (proposed, not an implemented API)

Use the already proposed small plain-data `campaign.js`, with a fixed stage
array and pure descriptor lookup. It may import `data.js` for IDs, but not
`world.js`, controller, storage or DOM: avoid the world/battle/build/economy
import cycle. Do not build a quest DSL/event bus.

Add optional v2 top-level `finale: { stage: 0, pending: false }`, where stage is
the number of completed stages, 0..N. Missing old saves default to zero/false.
Ready is derived from five credited trials and stage<N; completed is stage=N.
Do not also save redundant ready/finished/rewardClaimed booleans for the baseline.
A nonzero stage or pending=true requires all five current credited trials.
`pending` is a discriminator for the existing `pendingBattle`, not another
battle copy. It may only be true with an ongoing rival-kind battle at the exact
approved region/checkpoint stage, stage<N, and canonical stage enemies.
An ordinary pending trial/wild battle remains possible between stages with
pending=false and all existing validation intact.

Stage descriptors supply deterministic neutral enemy individuals and canonical
UIDs, e.g. `finale-<stage>-<encounterIndex>-<slot>`; exact format and immutable
stage table are frozen at integration. Use the current `(seed+encounterIndex)
>>>0` battle seed unless Main explicitly approves another versioned rule.
The pending validator compares descriptor species/levels/order/UIDs/profile/
trait/cosmetic/XP after clearing effects while preserving actual battle
resources/effects/RNG. It must not validate only "a known species". Include
player UID ordering, active living allies, enemy class none, seen IDs, current
region and class-rank consistency. No ended/reward-bearing snapshot is accepted.

Stage settlement consumes the expected stage + pending context and a genuine
won result, clears pendingBattle/pending, applies canonical rewards and stage+1
in **one validated next-state copy**, then assigns/enqueues that copy. Invalid
or stale stage cannot partially pay or advance. Loss clears only the pending
context plus ordinary recovery/counter changes. Repeating settlement on the
settled state must be rejected or a no-op, never pay again. Keep the controller
one-shot guard too; it alone is not durable state.

Queued storage is asynchronous, not a multi-key transaction. The UI may show
in-memory completion while a save is pending/failed, but must say so. Reloading
an older pre-win primary can require replay; it must never combine its old
reward with a newer stage or advertise unsaved completion as durable. Backup
failure stops primary write; a primary-only failure can already have rotated
backup. Preserve this truthful limitation and conflict/export recovery UX.

### Rematches and restart are separate decisions

The approved larger target includes rematches; current `worldPoints` removes
beaten rivals. Main chooses **R0**, defer rematches explicitly while closing the
ending checkpoint, or **R1**, optional existing-team rematches after completion.
R0 is the smaller implementation, but not delivery of the full postgame target.
R1 needs a distinct validated pending context (not `finale.pending` or a fake
undefeated trial), canonical rival identity and a Main-approved repeat-reward
policy. No repeated first-trial score/Marks or finale stage credit. Do not add
R1 as an unreviewed consequence of allowing any rival battle after five trials.

Continue free play preserves all world travel, wild encounters, collection,
class progress and economy. Confirmed New run uses `freshGame`: clears finale,
trial/history/ranks/economy according to existing expedition reset semantics;
no cross-run prestige or meta currency. Cancel/Escape preserves bytes/state.
Export-before-replace and exact-primary confirmation stay available.

## 5. Three-rank learning contract for Main approval

Preserve existing rank-1 entry conditions and benefits:

| Class | Existing unlock | Existing benefit |
| --- | --- | --- |
| Pathfinder | Always | +1 fiber per unclaimed bundle |
| Binder | Three caught species | +0.04 capture chance, total cap 0.9 |
| Warden | One credited regional trial | +2 applied shield, total cap 26 |
| Tactician | Caught species span three elements | +1 incoming switch energy, capped at maximum |
| Quartermaster | One supply contract | +5 Marks on subsequent delivery while active |

**Recommended minimal requirements option H (history-derived):** use monotone
saved facts, not a new action telemetry counter. Rank 0 means locked; rank 1
means current unlock; ranks 2/3 follow an approved small table. Here is a
concrete candidate table for discussion, **not approved design**:

| Class | Candidate rank 2 / rank 3 | What cannot fake progress |
| --- | --- | --- |
| Pathfinder | 3 / 9 unique claimed supplies | Revisit or reload same pickup |
| Binder | 10 / 25 caught species | Recapturing the same species or releasing/readding it |
| Warden | 3 / 5 credited trials | Replaying a trial or finale stage |
| Tactician | 4 / 5 elements in caught history | Party reorder, switching spam |
| Quartermaster | 3 / 6 completed canonical contracts | Reopening or repeating one delivery |

This is attainable in the existing finite vocabulary and avoids arbitrary
per-command counters. It acknowledges discovery includes evolved species, and
credited trials include the preserved legacy Iven badge when applied. It does
**not** prove defensive or switching mastery. Main may instead require actual
behavioral tasks (option T), but must specify exact event conditions, bounded
IDs/counters, one-shot settlement and v1/v2 migration; never infer historical
shield use/switching from trial wins. Option T is a larger separate content task.

Ranks under H should be derived by one pure `classRank(state,classId)` from
canonical persistent history, so they survive release/reload/free switching
without redundant saved counters. Validate all relevant facts before deriving;
`unlockedClasses` retains its existing ABI. Old saves receive earned recognition
from recorded facts, never retroactive currency/items. Main must approve this
migration policy rather than unexpectedly awarding previously unseen perks.

**Perk decision remains open.** Smallest option P0 keeps base benefits and adds
rank recognition/next requirement only; it closes visible progression but does
not by itself deliver the plan's later additional perks. Option P1 freezes a
small rank-indexed table of increases to the *same* five effects, with no new
Wait, damage, healing or capture-turn rules. Main must supply exact rank-2/3
values and verify stacking with traits/one synergy before code. Keep capture
<=0.9, shield<=26, energy<=statsFor maximum, Marks<=1e6, item/kite<=999, zero-cost
switching, and no rank purchase/respec fee. Do not auto-multiply base perks by
rank: +4 shield or +2 switch energy is a balance decision, not an implementation
default. Keep all current class `waitEnergy` values zero unless separately
approved; the older Wait finding is dormant, not evidence of a missing bonus.

### Combat/save compatibility if P1 is chosen

A pending old battle must retain rank-1 mechanics even if history-derived new
rank is higher. Add optional canonical battle-side `classRank`: missing means
1 for a real class, 0 for `none`. New battles snapshot the selected earned rank;
`classFor` resolves that ID/rank through the approved table. `validateBattle`
projects/validates it and all callers preserve it; do not change the four-action
ABI or neutral old `createBattle` defaults. No earned rank changes mid-battle.

`pendingBattleCopy` must accept an old baseline-rank pending snapshot while
rejecting a rank above earned progress, invalid rank/class combinations and
any imported live perks. A lower pinned rank remains valid until that fight
ends; subsequent battles use the earned current rank. Enemy rank is 0/class
none for current regional/finale opponents. New pure tests must compare exact
next action/RNG before and after old-save migration, not merely final victory.
If rank values later change, old pending mechanics need an explicit rules
version/compatibility policy; freezing a number alone does not freeze a changed
table. Do not silently rebalance a resumed pending battle.

For P0, skip this combat schema extension entirely. For P1 field/economy perks,
calculate the bonus from the pre-transaction active class/rank; the pickup or
delivery that crosses a threshold gets no second/increased retroactive payout.
Recompute rank after canonical transaction/markOwned/trial settlement. Announce
new rank once at the event that earned it; loading/choosing a class merely shows
its current rank and must not rerun a reward.

### Learning UI, not a second tutorial game

Reuse class service rows: rank X/3, actual current benefit, next concrete
requirement and current progress; locked classes explain the existing unlock.
One concise objective in the existing HUD/message points to the next trial or
return stage. Before each approved stage, explain its existing energy/switch/
shield/disruption lesson; after it, show actual outcome, XP/evolution/rank
changes and next destination. No claimed prediction of enemy commands/damage,
no mandatory class build, no long overlay or new model showcase.

If displaying effective benefits in battle, use the shared resolver, including
Wait's nominal-versus-capped restoration; never maintain UI-only perk math.
Result/ending should direct keyboard focus to a meaningful heading/Continue
and announce status without masking save/render failures. Retain 44px controls,
visible focus, reduced motion, native dialog Escape/cancel and 320/390px layouts.
The shell is currently light-only; do not claim two-theme support from portal
screenshots. Main must review actual applicable layouts and themes.

## 6. Migration and validation contract

- Keep primary `foldwild-save-v1`, backup `foldwild-save-backup-v1`, canonical
  version 2 and accepted v1/v2 migration unless Main explicitly approves a schema
  revision. A missing optional finale field means unstarted, **even for five
  victories**; old progress is eligibility, not evidence of winning new stages.
- Preserve v1 neutral creature migration, safe spawn relocation, old Maren/Sola
  credit, legacy Iven badge and Neri -> automatic Iven credit. Neither old Iven
  nor five credited trials completes a finale or pays new trial rewards.
- Use existing descriptor-based reads: reject getters without execution,
  nonplain records, extra keys inside new exact records, sparse/duplicate arrays,
  unknown IDs, negative/fractional/NaN/out-of-range stages/ranks, inconsistent
  pending flags and unsupported versions. Do not relax old schema validation.
- Preserve roster 1..160, team 1..3, UID/nextUid limits, exact battle resources,
  round<=10000, log<=128, effects counters, UTF-8 save<=256 KiB and economic caps.
  Wrong enemy/stage/class/profile, completed-stage pending battle or ended result
  must fail without replacing primary/backup. At a hard counter/resource limit,
  refuse safely or use the existing approved cap policy; never wrap identifiers.
- All copy/projection boundaries must retain new fields: `freshGame`,
  `validateSave`, `pendingBattleCopy`, `validateBattle` if P1, transaction clones,
  release, `localSnapshot`, save queue, imported/backup preview, `resumeSaved`.
  UI/renderer cannot be an alternate source of progression truth.
- Forward migration does **not** imply downgrade safety: the old v2 validator
  projects known fields and will discard a new optional finale record. An older
  runtime can therefore erase progress when writing it. Main must approve the
  v2 forward-only support policy and rollback/export procedure, or explicitly
  revise schema/version handling before publication. Do not claim new saves are
  losslessly writable by historical code, and do not add an ignored version flag
  as a pretend fix.

## 7. Exact proposed ownership split and integration order

These are future assignments Main must issue, not permissions exercised here.
Each task needs bounded duration, explicit paths and its own reviewed commit.
No two workers edit `script.js` or shared suites simultaneously.

1. **Campaign/save owner:** new `Games/Foldwild/campaign.js`, existing
   `Games/Foldwild/world.js`, new `scripts/test_foldwild_campaign.mjs`.
   Own frozen stage descriptors, optional save context/defaults, pending identity
   checks and one small pure transition/idempotency regression. No controller,
   battle resolver, region geometry or content expansion. Main freezes content
   and ABI first. Reuse the existing battle engine, do not move it here.
2. **Class/combat owner:** `Games/Foldwild/builds.js`, and `battle.js` only if P1;
   new `scripts/test_foldwild_class_ranks.mjs`. Own rank/benefit resolver,
   baseline old-pending semantics and rank stack/cap checks. Preserve current
   exports/signatures with optional additions. No economy/controller writes.
3. **Main integration owner:** `Games/Foldwild/script.js`, `index.html`,
   `style.css`, new `scripts/test_foldwild_completion.py`. Wire gate/camp stage
   choices, guarded start, canonical settlement, field perks, rank/result/save
   summaries, reset/resume and ordinary-input campaign path. Coordinate with the
   async-contract review before touching save/modal callbacks. Do not change
   the unchanged M2 runner to accommodate an implementation regression.
4. **Main documentation/acceptance owner:**
   `docs/maintenance/games/unregistered-foldwild.md`,
   `docs/maintenance/inventory.json`, `docs/maintenance/README.md` when refreshed,
   and an explicitly assigned new milestone review. Refresh after committed
   reviewed runtime, then run the checker. Main reviews worker diffs, actual
   desktop/mobile captures and all held gates before any release decision.

`data.js`, `region-data.js`, `economy.js`, `view.js`, models and vendors remain
read-only under the recommended F2/H route; stage/lesson text belongs to small
campaign data and existing UI. If Main selects R1 or behavioral class tasks,
revise this split/ABI before delegation instead of silently crossing owners.
The separate `docs/foldwild-polish/m2-async-contract-review.md` report,
Worker 91's `scripts/test_foldwild_m2_async_v1.py` and
`docs/foldwild-polish/m2-async-check.md`, and Main's
`docs/new-games-plan/{collection-heist,tycoon}.md` are explicitly unowned here.

## 8. Required future evidence: natural route and negative checks

No tests below ran in Task 90. A test plan is not a pass.

**Natural positive path:** fresh seed/starter -> merchant/supply/contract ->
ordinary captures/team formation and class unlock -> camp -> sequential five
trials -> return gate -> first finale stage -> recovery/travel/optional class
change -> remaining stage(s) -> genuine ending -> free play -> save/Continue ->
confirmed/cancelled New run. Capture read-only snapshots/commands at each
boundary; no localStorage grants, teleports, assigned RNG or mutable snapshot.
Include one deliberately lost finale fight and ordinary retry, reload mid-stage
with exact next command, and reload between stages/after ending without double
payment. Repeat an alternate starter; actually reach level 12 and 26 and record
XP/time/grinding before calling pacing acceptable. The historical trial-XP
arithmetic and seed pool checks do not certify this path.

Rank evidence must naturally earn all selected thresholds/classes, freely switch
at valid locations, retain history after release, and demonstrate the actual
approved perk without fixtures as positive proof. This may exceed one campaign;
report unvisited ranks honestly rather than manufacturing a max-rank save.
Natural legacy history may be unavailable; label old-save migration cases as
compatibility fixtures, not natural modern campaign completion.

**Small pure regressions, existing framework-free Node style:** run the existing
11 suites (`data`, `battle`, `world`, `regions`, `economy`, `builds`, `battle_v2`,
`save_v2`, `continuity`, `cap_xp`, `save_conflict`) and the new small campaign/rank
checks. Cover immutable inputs; 0..N stages, monotone prerequisites, old v1/v2
migration, exact resumed effects/RNG, baseline-rank pending fights, all capped
class/trait/synergy combinations, one-shot terminal payout, no replayed contract/
pickup reward and no evolution/profile reroll. Inspect failures rather than
blindly updating test expectations.

**Negative-only fixtures/checks:** forged/skipped stage; stale Begin/double
command/settlement; cancel with no mutation; wrong stage region/opponents/UIDs;
finale win entering ordinary trial branch; ordinary trial entering finale branch;
legacy auto-Iven awarding twice; pending finale with missing battle; ended battle
in a save; earned rank mismatch; corrupt/oversized/getter/prototype/unknown-version
import; duplicate IDs; quota/backup failure; storage denial; stale cooperating
tab; changed primary after preview; deferred queued save overlapping reset or
replacement. Check both state and exact primary/backup bytes where appropriate;
retain current honest partial-backup-rotation limitation, not a false atomicity
assertion. Rematches, if approved, need all those pending/reward guards separately.

Zero Marks/zero kites must still permit normal camp recovery, capture access and
ending retries. At 160 allies, release safeguards must not block the campaign
(the recommended finale requires no new capture). Check no finale demand for
all 80 species, rank 3, a purchased item, hidden species or a precise RNG roll.

Main's native acceptance must include keyboard and real touch at 320/390px,
ending focus/scroll, free-play travel, inspector result restoration, single-tap
close, reduced motion, storage feedback, failed/late models/context loss and
no external requests. No retries/timing inflation/mouse substitute to turn M2
green. Full ordinary run and fresh screenshots are required; immutable model
hashes or mocked state screenshots do not prove color fidelity or hardware.
N100/8 GB hardware, rights and unfiltered pre-push registered-catalog smoke
remain separate gates. Foldwild is unregistered, so catalog smoke alone cannot
certify its campaign.

## 9. Decisions Main must record before code

1. F2 or F3; each existing host/POI, exact canonical team/levels, lesson, ending
   copy and accessible next objective. Approve stage-table identity/version.
2. Stage reward/terminal reward policy, loss checkpoint/recovery, encounterIndex
   behavior, and R0 deferral versus R1 rematch context/repeat reward rules.
3. H history-derived rank thresholds (accept/edit candidate table) versus T
   behavioral tasks; legacy credit and old-save rank recognition policy.
4. P0 recognition-only scope disclosure versus P1 exact perk numbers/stack caps;
   baseline old-pending rank handling and future combat-rule compatibility.
5. Optional v2 finale schema/forward-only support versus explicit version change;
   rollout/rollback handling for older tabs/runtimes and export/recovery.
6. Commit freeze/ownership after the async-contract review, maintenance refresh,
   and natural acceptance schedule. No source milestone is accepted from fixtures.

Until these are recorded, implement neither guessed stage content nor guessed
rank bonuses. The simplest useful next action is Main approval of this small
contract, not another engine, quest framework or more assets.

## 10. Task 90 retained command ledger and holds

The following ledger is inherited from the timed-out draft, not independently
reproduced Task 92 results or evidence that Task 90 finished or committed.
Its cited transcript is the Task 90 session log named above. Task 92 created no
scratch log, browser profile, image or server.

| Actual command/check | Exit / observed output |
| --- | --- |
| `env` sorted/filtered for `PI_*` | 0; exact provider/model/reasoning evidence above |
| `test ! -e docs/foldwild-polish/completion-contract.md` before creation | 0; owned path was new |
| `git rev-parse HEAD HEAD:Games/Foldwild HEAD:Games/Foldwild/index.html` | 0; hashes above |
| `git diff --quiet HEAD -- Games/Foldwild` | 0 |
| Tracked caller search with `git grep` | 0; callers traced in section 3 |
| `python3 -B scripts/check_maintenance_docs.py` | **1**; `AssertionError: Inventory stale: inspect changes, then run --refresh.` |
| Python stdlib inventory comparison/catalog schema, unique integer IDs and tracked URL check | 0; `tree ... STALE`, `entry_blob ... STALE`, `catalog schema/IDs/tracked URLs: 115` |
| `df -h /` disk guard before report write | 0; 2.2G available, above 2 GB stop threshold |

No runtime/scripts changed, so no script syntax run or game regression run is
claimed. Fresh native passes 0; full-catalog passes 0; screenshots 0. Games added
0, catalog unchanged at 115, Foldwild unregistered. No install/download, sparse
checkout change, registration or push. The stale inventory/manual, unresolved
M2 ordinary-input acceptance, all natural campaign/rank evidence, all-80/fit,
real N100 hardware, rights and release decisions remain held.

## 11. Task 92 finish-check provenance

Task 90 timed out with no commit. This separate bounded finish review completed
on 2026-10-02; only this document is owned. All proposed content, thresholds,
perks, migration and reward choices still await Main approval. No implementation
or browser, fixture, source-milestone or gameplay acceptance is granted.

Actual session `01a0fbf2-3e62-7438-9979-d404daf94981` records
`model_change: openai-codex / gpt-6-astra`, `thinking_level_change: high`, and
executed assistant metadata `provider=openai-codex`, `model=gpt-6-astra`,
`api=openai-codex-responses`. Matching `PI_*` values were observed. The conflicting
SWARMFORGE default variables are not the executing provider/model.
Execution and command-output log basename (no private absolute path):
`2026-10-02T09-29-12-037Z_01a0fbf2-3e62-7438-9979-d404daf94981.jsonl`.

Read the entire draft, required rules/skill, maintenance index, exact
[Foldwild manual](../maintenance/games/unregistered-foldwild.md),
[approved development plan](../foldwild-development-plan.md),
[implementation order](../foldwild-implementation.md) and
[M2 contract](../foldwild-m2-contract.md). Read current `world.js`, `builds.js`,
`battle.js` and controller `script.js` completely. Checked the section 3 source
interfaces, legacy credit, pending validation, rewards, class defaults and queued
save boundaries without rerunning broad investigation or game tests.

Finish-review HEAD was `3ea00d6fff3eb9f54ef3c8c7e85fc49c886a23df`;
Foldwild tree/entry still exactly match section 1's current-source hashes.
The inventory still matches its stale hashes there; no refresh was attempted.
Actual checks are recorded in the session transcript:

| Task 92 check | Actual exit / result |
| --- | --- |
| Session metadata extraction | 0; executing Astra/high confirmed |
| Source identity and `git diff --quiet HEAD -- Games/Foldwild` | 0; no Foldwild source drift |
| Static symbol-anchor check | 0; cited world/build/battle/controller anchors present |
| `python3 -B scripts/check_maintenance_docs.py` | **1**; `AssertionError: Inventory stale: inspect changes, then run --refresh.` |
| `git diff --check` | 0 before and after finish edit |
| Markdown links/private-path/email/secret-marker scan | 0; four local Markdown targets resolve; no prohibited markers found |
| Initial validation wrapper / `git diff --no-index --check` against empty file | **1 / 1**; no whitespace diagnostic, but the wrapper incorrectly required zero for an added-file comparison; not counted as a passing process |
| Corrected document validation / `git diff --cached --check -- docs/foldwild-polish/completion-contract.md` | **0 / 0**; links/privacy checks and owned-path-only staging confirmed; staged whitespace check clean |

The maintenance failure remains a hold, not a waived or passing gate. Disk guard
reported 2.2G free (2,327,261,184 bytes at the source check), above 2 GB. No native,
pure-game or full-catalog tests ran; passes and screenshots remain zero. No games,
runtime, scripts, assets, vendor or catalog changes; no installs, downloads or push.
