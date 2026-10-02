# Foldwild XP ceiling fix, delegation 79

Implementation only. Actual worker environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6-astra`. Owned paths are `Games/Foldwild/battle.js`,
`scripts/test_foldwild_cap_xp.mjs` and this report. Main owns design, integration,
manual/inventory refresh and subjective images. No native acceptance was run
while implementation workers were writing source.

## Demonstrated root and bounded policy

Before editing, Foldwild HEAD tree `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`
and entry `b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a` matched the inventory
(94 files, 8,937,020 bytes). `battle.js` matched HEAD; scoped diff exit 0.
This records the starting identity, not current integration acceptance.

Read completely: AGENTS, CODE_QUALITY, maintenance README, full Foldwild manual,
polish README and gameplay/UI/input reviews; actual `battle.js`, `world.js`,
`script.js`; existing data, battle, battle_v2 and continuity tests. Other pure
suite implementations, data/build/economy/region modules, presentation/vendor
internals and binary models were not completely reviewed for this bounded fix.

Tracked caller search:

```sh
git grep -n -E '\b(gainXP|GainXP)\b' -- ':!docs'
git grep -n -E 'finishBattle\(|\.xp\s*(\+=|=)' -- Games/Foldwild
```

Both searches exited 0. The sole runtime reward caller is `script.js`'s
`finishBattle`, reached from `beginBattle` and `command`. It copies canonical
party resources, awards `12 * enemyLevelSum + 20` to existing team members for
victory/capture, adds the captured ally afterward, clears pending battle and
saves. Loss/flee do not award XP. `GainXP` is the same exported function alias;
remaining callers are the battle regressions. `world.js` copies retained XP
through normalization and independently rejects roster/pending XP above 1000000.
No alternate runtime XP mutation/reward path was found.

The defect is accumulation after level 40, not validation: `gainXP` stops
spending level thresholds at 40 but previously kept adding XP without a ceiling.
An in-memory negative baseline fixture validated level-40 Hearthol XP=1000000,
applied the existing +44 reward, observed XP=1000044, and confirmed
`validateSave` rejected `Invalid XP`. The probe exited 0 with:

```text
NEGATIVE BASELINE FIXTURE: accepted level40 XP=1000000 +44 becomes 1000044; validateSave rejects Invalid XP.
```

The new regression was run before changing runtime source:

```sh
node --experimental-default-type=module scripts/test_foldwild_cap_xp.mjs
```

Actual foreground exit **1**, an assertion on near-ceiling XP=999955 plus1220:
actual1001175, expected1000000. This is an intentional failing baseline, not a
worker/tooling failure or ordinary-play evidence.

Fix: one `Math.min(c.xp, 1e6)` after the existing leveling loop. Preserve all
already accepted XP, saturating only excess remainder at the existing ceiling.
Apply level costs first, including when a reward reaches level40; clamping the
incoming total first would wrongly discard usable leveling XP. No early return,
new helper, dependency, validation relaxation or species/action change. Existing
safe-integer sum rejection remains before accumulation. Existing resource-delta,
KO, evolution12/26 and input-copy behavior is unchanged.

## Actual foreground verification

Executed serially, without a server or browser:

```sh
for suite in cap_xp data battle world regions economy builds battle_v2 save_v2 continuity; do
  node --experimental-default-type=module "scripts/test_foldwild_${suite}.mjs"
  code=$?
  printf 'EXIT %s=%s\n' "$suite" "$code"
  if [ "$code" -ne 0 ]; then exit "$code"; fi
done
```

| Suite | Output digest | Exit |
| --- | --- | ---: |
| cap_xp | PASS: v1/v2 accepted XP; near/exact ceiling reward/save/reload; frozen inputs; level12/26/40 resource deltas; unchanged rejection | 0 |
| data | PASS: 80 exact species; 50 normative actions; evolution12/26; hidden null; 80 tracked/local SHA matches; models=7300844 bytes | 0 |
| battle | PASS: 80 species; all50 abilities; 25 wheel pairs; effects/Wait/switch/KO/capture/replay/XP; hit seed670, miss671 | 0 |
| world | PASS: world/savev2; five regions/rivals; pools35/65/65/75/80; strict schema and corrupt-byte preservation | 0 |
| regions | PASS: 5 regions, 128000m², 480 trees, 48NPCs, 9shops/contracts; 185 collision-safe segments | 0 |
| economy | PASS: 9shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards | 0 |
| builds | PASS: 80species x10seeds, 77builds, neutral migration, caps, unlocks, synergy | 0 |
| battle_v2 | PASS: all80 profiles/evolutions; every class/trait; capture boundaries; energy/shield caps; frozen replay | 0 |
| save_v2 | PASS: v1 migration; no reload restock; scoped backup, quota, UTF-8 size and corrupt-byte preservation | 0 |
| continuity | PASS: exact pending action/RNG replay; effects/profiles; capture; release/history; scoped backup preservation | 0 |

The new test uses constructed module boundary fixtures, not browser state grants
or positive natural progression evidence. Negative overflow/unsafe-sum fixtures
are explicitly labeled. It covers zero rewards, retained sub-ceiling XP, +44 and
+1220 rewards, maximum old v1/v2 XP, save/reload, pure inputs, threshold-before-cap
ordering and living/defeated resource deltas. Original suites were not edited.

Additional foreground commands:

| Command | Exit / actual result |
| --- | --- |
| `node --experimental-default-type=module --check Games/Foldwild/battle.js` | 0 |
| `node --check scripts/test_foldwild_cap_xp.mjs` | 0 |
| `git diff --check -- Games/Foldwild/battle.js scripts/test_foldwild_cap_xp.mjs` | 0 |
| `python3 -B scripts/check_maintenance_docs.py` | 1: `AssertionError: Commit inspected source changes before validating its inventory.` |

The coverage guard is blocked by this implementation wave's uncommitted source,
not waived. No inventory/manual path is owned here. Main must integrate the
source commits, update the Foldwild manual with this cap policy, deliberately
refresh inventory and rerun the checker once other source writers are done.
Pure passes above are point-in-time implementation checks in a shared tree,
not a frozen-source or native acceptance claim.

## ABI and Main integration

`gainXP(creature, amount)` and alias `GainXP` retain their signatures and pure
canonical return shape. No import/export, save-key/schema/version, pending RNG,
reward formula, stats/actions/evolution identity, UI or controller ABI change.
Caller changes are unnecessary. Main should rerun the new cap test and existing
nine pure suites after integration, then separately schedule ordinary gameplay
and unchanged native M2 on frozen source. Do not import the world validator into
battle to share this number: world already imports battle; that would introduce
an unnecessary dependency cycle. The cross-boundary regression pins the ceiling.

Original80 GLBs/colors, vendors and data were untouched; data suite verifies the
original model hashes and normative actions. No new runtime loads, dependencies,
CDNs, games, protected paths, Netlify/UV/catalog changes or push. Catalog remains
115 entries; Foldwild remains unregistered. No screenshots (0bytes), native/full
gate passes (0), hardware measurement or rights certification. The original
single-touch Close failure stays held; no input workaround, repeated tap, timing
inflation or original M2 test change. Whole-game/full-polish acceptance is absent.

No scratch files, background processes, browser or server were created, so there
was no server to clean up in `finally`. Scratch growth: 0bytes, below2MB. Sparse
selection was not changed; Main retains its narrow Foldwild lease. Disk guards
before/after pure work both showed2.4G free, above2GB; shared-tree disk delta cannot
be exclusively attributed at that display precision. Runtime growth is110bytes;
new regression is3474bytes. Other workers' `view.js`, `world.js` and save-conflict
regression changes were visible during review and are not owned/staged here.
Final explicit-path commit and hygiene are reported in the delegation completion.
