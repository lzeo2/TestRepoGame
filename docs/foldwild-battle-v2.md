# Foldwild battle v2 mechanical checkpoint

Delegation 46, actual provider/model `openai-codex/gpt-6.1-sol`.
Scope: `Games/Foldwild/battle.js`, `scripts/test_foldwild_battle_v2.mjs`
and this note only. No catalog, entry-script, renderer, data, assets, vendor,
proxy or optional-secret changes. This is pure combat integration, not a
completed first-region loop or campaign. No registration or push.

## Implemented contract

- `createCreature(speciesId, level=3, uid='c1', options={})` accepts only
  `profile`, `traitId`, `cosmeticId` in options. These fields are validated by
  the existing `builds.js` implementation and preserved by normalization,
  capture, effect cleanup, XP and evolution. Absent fields become the neutral
  profile, neutral trait and original appearance. UIDs are bounded safe strings.
- Each stat is `max(1, floor(canonicalBase * (1 + .045 * (level-1)) *
  (1 + profilePercent/100)))`. HP/energy maxima and actual resource clamps use
  this result. Temporary stat effects still leave maxima untouched.
- `createBattle(team, enemyTeam, options)` adds `classId='none'`,
  `enemyClassId='none'`, `synergyEnabled=false`. Classes must be canonical or
  `none`. Both sides expose `classId` and derived `synergyId`. The synergy id is
  displayable while its effects remain disabled; new core wiring must explicitly
  pass its active class and enable synergies.
- Applied shield is ability shield plus side class, actor trait and enabled
  synergy, capped at 26. It replaces the previous shield, not a stack. Wait adds
  3 plus actor trait/class Wait perks, capped at the individual maximum.
  Voluntary switching adds class, incoming trait and enabled synergy energy,
  capped at that incoming maximum. Automatic KO replacement grants no bonus.
  Switching clears the outgoing effects without decreasing its battle counter.
- Capture retains the original weakening/status formula, plus the player class
  and active trait capture perks, capped at 0.9. Binder adds exactly .04; the
  currently canonical traits add zero. Enemy Binder cannot affect player capture.
- Enemy decisions score affordable attacks, low-HP recovery, useful cleansing,
  threatened low-HP shielding and energy recovery. Utility preference alternates
  owner turns; affordable attacks interrupt utility loops. No affordable attack
  permits recovery/Wait rather than an invented action. A queued attack made
  unaffordable by Hush uses the same trait-aware Wait fallback.
- Rival teams can switch on rounds divisible by three when a healthy reserve
  has at least .5 better elemental multiplier against the current player.
  Switching consumes their turn before the player's attack resolves against the
  actual incoming creature. The same player element cannot cause switch-back
  ping-pong. It is a one-turn heuristic, not predictive expert AI.

## Snapshot boundary

`validateBattle(battle)` is exported and also used by `applyAction`. It returns
an independent canonical copy. Missing legacy class/flag/build fields receive
neutral defaults. Side synergy is rederived; mismatching supplied ids and raw
bonus fields are rejected. Unknown fields, accessors, noncanonical identities,
invalid effects/resources, duplicate side UIDs and inconsistent terminal outcomes
are rejected. A captured record must match the weakened enemy with effects
cleared and minimum 1 HP.

Logs are at most 128 strings of at most 512 characters. Resolution retains the
latest 128; imported oversized logs are rejected, not silently accepted. The
serialized canonical battle has a 256 KiB byte cap. The boundary does not itself
store pending battles, establish reward transaction ownership or detect a player
editing an otherwise valid offline save. Those belong to later save/core work.

## Actual verification

All commands below were run locally with exit 0:

```text
node --experimental-default-type=module --check Games/Foldwild/battle.js
battle syntax exit=0
node --check scripts/test_foldwild_battle_v2.mjs
v2 syntax exit=0
node --experimental-default-type=module scripts/test_foldwild_battle.mjs
PASS: 80 species; all 50 abilities executed; 25 wheel pairs (5 strong/5 reverse); bounds/effects/Wait/switch/KO/teams/capture/replay/immutability/XP/invalid inputs/local-only
Capture reproducibility: hit seed=670, miss seed=671
legacy test exit=0
node --experimental-default-type=module scripts/test_foldwild_battle_v2.mjs
PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; synergy gating; NPC utility/switch targeting; frozen-input replay; canonical snapshots/log limits
v2 test exit=0
git diff --check -- Games/Foldwild/battle.js scripts/test_foldwild_battle_v2.mjs
owned diff check exit=0
```

The old battle test was not edited. The new assert-only check covers every
species' neutral/profile stats at five levels and preserved attributes through
all evolution chains; all class/trait pairs; real 31-energy and 26-shield caps;
Binder boundaries; synergy gating; shared NPC perks; recovery/cleanse decisions;
voluntary/automatic switching, enemy incoming targeting and deterministic frozen
snapshots. It replays 24 class/seed combinations twice, requiring termination
within 200 rounds. With the present canonical roster every family has one
single element, so simultaneous kinship and three-element coverage is impossible
for a legal three-member party; no fabricated roster was used to pretend to test
that overlap. The existing `synergyFor` retains coverage-first priority.

Storage guard reported 2.4G free before and after this small source-only task.
No dependencies, model materialization or test server. No browser screenshots,
normal-input campaign completion, catalog-wide smoke run or Chromebook hardware
measurements in this pure-module task. Core/UI integration, later class ranks,
field/economy class effects, pending-battle persistence and campaign balance
remain separate checkpoints. No full-game or release acceptance claim.
