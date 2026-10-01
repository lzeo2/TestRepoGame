# Foldwild pure combat contract

Delegation 26 owns only `Games/Foldwild/battle.js`,
`scripts/test_foldwild_battle.mjs`, and this document. Actual worker runtime:
`PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`, Node `v22.23.1`.
This is operator-authorized original self-made mechanical combat implementation,
not an ingested upstream game. Source constants are the committed 80-species
roster and 50-action normative glossary; see [foldwild-sources.md](foldwild-sources.md)
and [monster-roster-glbs.md](monster-roster-glbs.md).
No data, models, vendors, renderer, save system, portal or catalog were edited.

Foldwild remains **UNREGISTERED**, future catalog id **UNRESOLVED** after the
separate demo at 224 lands. No registration, backend, multiplayer, browser
verification, screenshots, full-game smoke gate or push is included here.

## Frozen public API

All exports are named ES-module exports. Inputs are inspected/copied, never
mutated; outputs are new mutable snapshots. Deeply frozen input is supported.
No DOM, timers, networking, filesystem access, dependency or random global.
`structuredClone` is the native copy mechanism.

```js
import {
  statsFor, createCreature, normalizeCreature, clearEffects,
  gainXP, GainXP, createBattle, applyAction
} from './battle.js';
```

- `statsFor(creature)` requires known `speciesId` and integer `level` in 1..40.
  Returns `{hp, energy, attack, defense, speed, maxHP, maxEnergy}`. `hp` and
  `energy` are maximum-stat aliases, not current resources. Each canonical base
  stat is `max(1, floor(base * (1 + .045 * (level - 1))))`. Battle modifiers do
  not change these maxima or this inspection API.
- `createCreature(speciesId, level=3, uid='c1')` returns exactly
  `{uid,speciesId,level,xp:0,hp:maxHP,energy:maxEnergy,status:null,shield:null,
  buffs:{},turnsTaken:0}`. The supplied species is preserved, even at a high
  level; evolution is performed by XP level-up loops. Main should assign
  distinct stable uids to owned and encountered creatures for readable logs.
- `normalizeCreature(creature)` deep-copies and validates identity, level,
  nonnegative safe-integer XP, finite resources, counters and known effects.
  Finite HP/energy are capped to `[0,max]`; nonfinite values are rejected.
  Missing XP/effects/counter default to zero/null/empty. HP/energy must exist.
  Unknown ids (including prototype property names), bad levels or corrupt
  effects throw. This is a battle snapshot guard, not a complete save schema.
- `clearEffects(creature)` returns a normalized copy with status/shield null,
  buffs empty and counter zero. HP, energy, XP, species and uid are preserved.
  It does not heal or revive. Call after battle before persisting roster members.
- `gainXP(creature, amount)` / `GainXP(creature, amount)` are the same function.
  Amount and XP totals must be nonnegative safe integers. While below level 40,
  subtract `30 + 12 * currentLevel`, increment level, then follow known
  `evolvesTo` links whose 12/26 thresholds were reached. Carry remaining XP,
  even at level 40. Preserve uid. Living HP and energy gain only the difference
  in maxima from leveling/evolution, never an implicit full heal. HP zero stays
  zero. Temporary effects remain until the caller explicitly clears them.
- `createBattle(playerTeam, enemyTeam, {kind='wild',seed=1,active=0}={})`
  deep-clones/validates both teams. Player size 1..3; wild enemy size exactly 1;
  rival enemy size 1..3. Kind is `'wild'` or `'rival'`; seed is uint32; active is
  a valid player index. Living replacements are selected for initially defeated
  active members. An entirely defeated team immediately ends the battle.
- `applyAction(battle, action)` deep-clones/validates the snapshot, resolves one
  command and retaliation, then returns it. Exact action forms:
  `{type:'ability',slot:0..3}`, `{type:'wait'}`, `{type:'switch',index:0..2}`,
  `{type:'capture'}`, `{type:'flee'}`. Invalid/unaffordable/ineligible commands
  append a notice, do not advance round or spend a turn. Corrupt battle
  snapshots throw. Ended states return equal-content new snapshots.

State shape:

```js
{
  player: { team: [/* creatures */], active: 0 },
  enemy: { team: [/* creatures */], active: 0 },
  kind: 'wild', seed: 1, round: 1, phase: 'command',
  result: null, log: [], captured: null
}
```

`result` is null or `'won'|'lost'|'captured'|'fled'`. A non-null result always
has `phase:'ended'`; otherwise phase is `'command'`. Logs are ordered plain
strings, suitable for `textContent`. Each consumed round increments `round`.
Successful capture/flee ends immediately without retaliation/round increment.
Losing all player members takes precedence if both teams are defeated.

## Resolution and effects

Ordinary ability/Wait commands resolve in descending effective speed; ties go
player-first. Both acting creature references are fixed before the round, so a
KO replacement never gets its predecessor's queued action. KO creatures neither
act nor heal. A newly unaffordable queued ability (Hush landed first) falls back
to Wait instead of negative energy. Living replacements become active for the
next command; no replacement retaliation occurs in the same round.

Switch/capture/flee have priority. Switching to a living nonactive player member
clears outgoing shield, modifiers and negative status, spends its turn, and lets
the enemy retaliate against the incoming member. The outgoing counter remains
monotonic inside battle. Invalid/dead/same-index switches do not spend a turn.
Wild flee ends immediately. Rival capture/flee are rejected, not progression
bypasses.

Enemy AI selects among its four affordable actions only: below 30% HP, healing
has priority on alternate owner turns, preventing consecutive-heal stalls;
otherwise use maximum power. If neither is available, use lowest-cost restore,
then lowest-cost available utility, then Wait. Equal best choices use seeded
LCG tie-breaking. Costs are always paid before effects. Energy-limited healing
and the alternate-turn guard preserve damage opportunities; no simulation can
promise termination if the player deliberately restores forever.

RNG is uint32 LCG: `seed = (imul(1664525, seed) + 1013904223) >>> 0`, then
`seed / 4294967296`. Capture consumes a roll; AI consumes a roll only for a tie.
No `Math.random`. Identical snapshots and commands reproduce exactly.

Damage uses the attacker's element for every damaging action. Wheel:
Cindrel > Loamveil > Gleamric > Hushmere > Rillune > Cindrel. Strong 1.5,
reverse .75, neutral 1. Raw damage is
`max(1, floor(power * effectiveAttack / max(1,effectiveDefense) * multiplier))`.
Shield absorbs first, then HP bottoms at zero. Heal/restore cap at owner maxima.
Self-positive effects target owner; negative effects target living enemy.
Backwash damages the enemy and removes only the sender's negative status.

Effects are inspectable objects:

```js
status = {name:'Scorch', remaining:2, appliedAt:0};
shield = {hp:18, remaining:2, appliedAt:1};
buffs = {defense:{percent:25, remaining:2, appliedAt:1}};
```

Counters increment at the start of an owner's action. Application stamps the
recipient's current counter. End-of-turn expiration/DOT runs only when its
counter exceeds `appliedAt`: own newly applied effects do not age that turn;
an enemy status applied before its action ages on that next affected action.
Effects persist through two subsequent affected/owner turns. Scorch deals 6
shield-bypassing HP at each such end-of-turn; Drag/Fray/Haze reduce
speed/defense/attack by 20%; Hush adds 2 even to nominal zero-cost abilities.
Wait is universally available, costs zero, restores 3 capped energy and consumes
a turn. It is not a fifth species ability.

One negative status at a time; application replaces it. One modifier per stat,
replacement/refresh rather than stacking. Applying a stat status removes that
stat's modifier; applying a modifier clears a same-stat status. Modified stats
are floored from canonical scaled stats, minimum 1. Cleanse removes only status,
not other modifiers (including Low Chord), shielding, or positive effects.
Shields replace rather than add and expire/deplete to null. Values come directly
from `ABILITIES`: **Prism Screen is 16**, others are 18/19/20/22, preserving the
normative glossary rather than inventing an 18-point minimum.

## Main integration example and ownership

```js
const party = [createCreature('cindupp', 3, 'owned-1')];
let battle = createBattle(party, [createCreature('dewgob', 3, 'wild-1')], {seed:7});
// Render read-only inspection; current HP comes from the creature, not statsFor.
const current = battle.player.team[battle.player.active];
const maximum = statsFor(current).maxHP;
battle = applyAction(battle, {type:'ability', slot:0});
// UI submits future commands only while phase === 'command'.
// On end: copy battle.player.team.map(clearEffects) into Main's roster.
// Main applies rewards separately with gainXP; battle never awards XP/items.
```

Main owns bag inventory, kites, capture legality UI, captured creature ownership,
seen collection, rewards, persistence, recovery/healing, encounter generation,
and rival progression. Before a capture, Main checks wild/alive/half-HP and kite
availability, deducts exactly one kite per legitimate attempt, then calls
`applyAction`. No deduction for an ineligible command. Capture chance is
`min(.90, .12 + .75*(1-hp/maxHP) + (status ? .08 : 0))`. Miss consumes the player
turn and enemy retaliation. Success sets `captured` to an effects-cleared enemy
copy with at least 1 HP, retaining current resources otherwise; Main assigns
ownership/uid and adds it once. Enemy state is not the collection.

This module only looks up validated ids in `BY_ID`. It does not import or invent
optional hidden species. Current null/absent optional data is ignored. Any future
approved hidden species must first be added with validated complete data and
ability slots by the data owner. Its 10,000..15,000 target / 15,999 maximum
triangle limit is exclusively a future renderer/asset constraint, not a combat
fallback. Solo RPG only; no cooperative wires or backend.

## Runnable verification

From repository root, Node 22:

```sh
node --experimental-default-type=module scripts/test_foldwild_battle.mjs
node --experimental-default-type=module --check Games/Foldwild/battle.js
node --check scripts/test_foldwild_battle.mjs
git diff --check -- Games/Foldwild/battle.js scripts/test_foldwild_battle.mjs docs/foldwild-combat.md
```

Actual regression output:

```text
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
```

The one framework-free regression also exercises shielding/DOT duration and
replacement, real status application, stat modifiers, cleanse, interrupted
turns, AI heal cadence/Hush fallback, rival restrictions, capture probability
boundaries and status bonus, KO auto-switch/team outcomes, exact replay, frozen
inputs, single/two/three-stage XP lines, 12/26 thresholds, level-40 remainder,
finite input guards, known-source validation and no runtime external loads.
This is Node-only logic evidence: **zero browser/full-game gate passes, no
screenshots**. Main must run its runtime/full registered-game release gate before
any release decision. No push was performed.
