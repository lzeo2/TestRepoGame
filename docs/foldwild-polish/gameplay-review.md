# Foldwild gameplay diagnostic, delegation 76

Review only. Actual session: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6-astra`.
Latest owner order supersedes older SOL worker references for this task.
Only this document is assigned for commit. Main owns design, written scope,
subjective screenshots, integration and any subsequent implementation decision.
No runtime, test, catalog, vendor or model edits; no native writer or mobile retry.

## Source and evidence boundaries

Reviewed completely: `AGENTS.md`, `docs/CODE_QUALITY.md`, maintenance README and
Foldwild manual; `docs/foldwild-development-plan.md`, `foldwild-implementation.md`,
`foldwild-m2-contract.md`, `foldwild-combat.md`, `foldwild-battle-v2.md`,
`foldwild-economy-v2.md`, `foldwild-world.md`, `foldwild-world-v2.md`,
`foldwild-continuity.md`, `foldwild-core.md`, `foldwild-core-v2.md`,
`foldwild-m2-core.md`, `foldwild-m2-review.md`, `foldwild-m2-finish.md`.
Historical descriptions are not current acceptance: for example the economy
report's kite resale and original world's three regions are superseded in source.

Completely read authored `Games/Foldwild/{battle,world,builds,economy,data,script,region-data}.js`
and `index.html`. Traced the actual controller callers of battle settlement,
XP, transactions, saves, pending recovery, team/release and input dispatch.
Tracked caller search found `gainXP` settlement and `readSave`/`writeSave` in the
controller, not an alternate runtime persistence route. Inspected Foldwild's
inventory entry and compared current Git tree/entry and working source:

- Review HEAD: `559f825`.
- Tree: `e6e0305f82a0bcf2458f7cb2b4d22bb2a0302fe9`.
- Entry: `b0e1ed5bac4f6aaca89960c50fdfdc3bd4ce363a`.
- Both match `docs/maintenance/inventory.json`; `git diff --quiet HEAD -- Games/Foldwild` exited 0.

Unread in full for this task: `view.js`, CSS, vendor implementations, binary
models, nine pure suite implementations, native runners and other presentation,
attachment, rights/input-audit reports. Pure suites were executed unchanged,
not claimed as fully human-reviewed tests. No browser, screenshot, native input,
normal campaign or device measurement was run. The immutable read-only
`window.foldwildSnapshot` getter was not exercised or changed.

## Ranked concrete follow-up fixes, not implementation authorization

Paths below are under `Games/Foldwild/`. Rankings concern a compact authored
five-region game. None authorizes frontier, horror or decorative expansion.

1. **High, persistence bug: stale tabs can replace newer progress and then its backup.**
   `script.js:16-17` caches the slot once; `save` at `49-69`, movement autosave
   at `772-787` and unload at `932-935` do not compare the current slot to the
   last observed bytes. `world.js:305-318` backs up whatever is present and
   unconditionally writes its caller's snapshot. An older valid tab can therefore
   overwrite a newer expedition; the next distinct autosave replaces the only
   backup with already stale progress. The in-memory negative probe below proves
   this boundary behavior, not an observed browser data-loss incident.
   **Minimum fix:** compare expected slot bytes/revision before writing; surface
   conflict and require an explicit reload/replace choice, including unload.
   **Preserve:** corrupt-slot refusal, synchronous validation, backup-before-write,
   exact pending RNG and existing storage keys. **Acceptance:** two ordinary tabs,
   advance one, attempt stale save/unload from the other; neither primary nor
   recoverable newer bytes silently regress. Retain a pure storage conflict check.

2. **High completeness gap, approved design unimplemented: there is no campaign ending.**
   `script.js:264-269` explicitly says the final expedition is absent;
   `finishBattle:423-455` records five trials then free play. `world.js:13-28`
   supplies five teams, and `worldPoints:351-353` removes defeated trial markers,
   so repeatable rival rematches are absent too. Implementation contract's
   Adventure table and milestone 3 require a multi-stage return expedition.
   **Minimum fix:** Main specifies a small final sequence with recovery,
   persisted stage/reward state and a genuine ending, then optional rematches.
   Do not relabel the current result as a finished finale.
   **Preserve:** legacy Iven credit at `script.js:428`, five sequential route
   unlocks and continued exploration. **Acceptance:** clean ordinary play through
   all five trials, loss/recovery and final stages; reload each stage and ending
   without repeated rewards; free play remains usable.

3. **High acceptance gap: XP pacing and all-80 acquisition are structurally possible,
   not naturally certified.** `world.js:333-350` uses pools of 35/65/65/75/80;
   all species have positive weights in the final region. `data.js:57-136`
   supplies explicit evolution edges, including the five boss lines.
   `battle.js:126-147` evolves only on a level-up, not merely when a high-level
   basic is captured. `script.js:418-442` gives existing team members
   `12 * enemyLevelSum + 20` XP; the newly captured member joins afterward.
   Source arithmetic: the five trials yield 3136 XP total to an ever-present
   starter, reaching level 21 with 112 remainder. Level 3 to 12 needs 1026 XP;
   to 26 needs 4554; to 34 needs 7626. This deliberately impossible trial-only
   schedule is a budget calculation, not a viable playthrough or proof of a
   softlock. Wild training/capture is necessary. Habitat weighting plus unlimited
   encounter refresh is not a bounded, explicit all-species acquisition plan.
   **Minimum fix:** Main assigns reachable acquisition notes/guarantees and an XP
   budget through existing encounters/tasks, then measures before changing values.
   **Preserve:** original roster/actions, 12/26 thresholds, bounded profiles,
   capture rules and level 40. **Acceptance:** alternate-starter ordinary campaign,
   actual level-12/26 evolution, and an all-80 acquisition ledger identifying
   normal encounter/evolution paths; report time and grinding, not seed-scan
   coverage as natural play. Boss acquisition must not depend on hidden content.

4. **Medium, battle clarity plus dormant Wait class mismatch.**
   `script.js:315-376` shows effective Hush cost and remaining effect turns, but
   no effective-speed order or active matchup explanation. The wheel lives in
   `collection:718`, while `collection-btn` is disabled during battle at `115`.
   `battle.js:235-258,408-413` resolves effective stats and speed ordering;
   switches have priority and enemy choices can change the target. Wait's label
   at `script.js:357` omits class `waitEnergy`, whereas `battle.js:321` includes it.
   **Important:** every current class has `waitEnergy:0` (`builds.js:4-20`), so
   this is not evidence of an active missing class benefit. Resourceful's +1
   is shown correctly. Wait/log also describe nominal restoration at the energy
   cap rather than actual gain.
   **Minimum fix:** a concise visible matchup/status/order explanation, shared
   derived Wait amount if class ranks introduce that perk, and honest capped-gain
   wording. Do not invent a Quartermaster combat perk to make the issue active.
   **Preserve:** no guaranteed damage/AI prediction, Hush fallback, switch and KO
   timing, bounded energy. **Acceptance:** ordinary neutral/resourceful Wait near
   cap, Hush, shield and switching are understandable; pure displayed-vs-resolved
   amount check for every canonical class/trait. Main judges screenshots.

5. **Medium, approved durable-save UX missing: backup recovery and local export/import.**
   `world.js:295-318` reads only primary and writes the previous snapshot to backup;
   `script.js:49-69,845-875` exposes save status but no backup restoration/export/
   import controls. `index.html` contains no such inputs/actions. The development
   plan's Phase 6 explicitly calls for guarded local export/import. A backup key
   alone is not a usable recovery path. **Minimum fix:** deliberate local file
   export/import and previewed backup recovery through `validateSave`, never a
   silent fallback or permissive importer. **Preserve:** 256 KiB UTF-8 limit,
   supported versions, no getter execution, exact prior bytes and explicit
   replacement consent. **Acceptance:** export/reload/import an ordinary pending
   battle with identical next action/RNG; separate negative oversized/corrupt/
   unknown-version/quota fixtures leave good primary and backup intact.

6. **Medium completeness gap: campaign tasks and reactive arcs are not implemented.**
   `economy.js:25-30` defines nine identical one-shot three-fiber deliveries, not
   15 varied tasks. `region-data.js:24-64,98-186` creates the 48 NPCs and static
   dialogue; `script.js:527` displays those strings without progress-dependent
   branching. Five trials and the 15 supply pickups must not be counted as the
   promised 15 side tasks. **Minimum fix:** Main defines bounded useful tasks and
   reactive lines against current POIs, with one-shot state/rewards, not another
   map or quest framework. **Preserve:** canonical supply IDs, nine shop epochs,
   legacy progress and zero-currency recovery. **Acceptance:** each of the 15
   approved tasks has an ordinary trigger, observable effect and reload-safe
   completion; dialogue reflects real state, with no duplicate payout.

7. **Medium completeness gap: class ranks and evolution choice remain absent.**
   `builds.js:4-20,99-112` implements five unlocks/one perk each, with no ranks;
   `script.js:562` explicitly discloses that. `battle.js:135-139` auto-evolves;
   `script.js:453-458` reports the change afterward, with no defer choice or
   changed-ability comparison. These are approved development targets, not
   regressions against the M1/M2 implementation contract.
   **Minimum fix:** Main chooses the small rank milestones and a defer policy
   before bounded implementation; show actual XP needed, not just the remainder
   at `script.js:695`. **Preserve:** UID/profile/trait/cosmetic and no bonus reroll,
   free class switching at outposts, original stats/actions. **Acceptance:** ranks
   and deferred evolution survive reload; accepting evolution pays no duplicate
   XP, shows replaced abilities, and cannot strand the next evolution path.

8. **Low-frequency persistence bug: capped-level XP can exceed the save ceiling.**
   `battle.js:129-147` retains all XP at level 40; `world.js:96` rejects XP above
   1000000; `script.js:421` continues rewarding level-40 members. A currently
   accepted maximum-XP save becomes unsaveable after one reward. Long natural
   play can reach this eventually; no natural occurrence was observed here.
   **Minimum fix:** adopt a bounded level-cap XP policy compatible with old valid
   saves, before settlement produces an invalid canonical state.
   **Preserve:** sub-cap leveling/evolution and resource deltas; do not raise or
   remove validation limits just to suppress the error. **Acceptance:** accepted
   near-ceiling level-40 save plus one reward remains saveable, with unchanged
   battle/capture rewards and a legacy compatibility check.

## Existing safety mechanisms and non-findings

No source-proven zero-Marks/kites dead end: `script.js:221-241` camp heals the
whole roster and guarantees four free kites; loss heals and returns to spawn
at `443-445`. Flee changes encounters without paying money/XP. Low-resource
ordinary play still needs verification, not a fabricated save presented as play.
Shop stock refreshes after five encounters, including flee/loss (`450`), not
wall-clock time; that is current contract behavior, not an established exploit.
Kites cannot be sold (`economy.js:131`); contract profit is limited to nine
one-time payouts. Release/team/favorite guards exist at the shared boundary
(`world.js:279-292`) and UI. A 160-ally roster can be reduced through release;
no proven capacity softlock was found. These facts do not certify balance.

**Authoritative inherited hold:** original uninstrumented M2 mobile-close failure
remains open. No third blind mobile implementation attempt, timing workaround,
repeated taps or mouse substitution was made. A fresh stable unchanged ordinary
run must supersede it; traced passes and this source review cannot.

Original 80 GLBs/default colors remain immutable; hidden descriptor remains null.
Frontier/horror are separately gated optional work, not required fixes for this
compact base game. Real N100/8 GB hardware acceptance is mandatory but unverified;
rights, registration and publication remain separate holds. No extra species,
new game, catalog ID, push or full-catalog acceptance is implied.

## Fresh foreground verification and retained logs

All nine commands ran serially in the foreground, unchanged, using:

```sh
for suite in data battle world regions economy builds battle_v2 save_v2 continuity; do
  node --experimental-default-type=module "scripts/test_foldwild_${suite}.mjs"
  code=$?
  printf 'EXIT %s=%s\n' "$suite" "$code"
done
```

Actual output digest and individual exits, retained in `.tmp/foldwild76/pure.log`
(2747 bytes):

| Suite | Actual output digest | Exit |
| --- | --- | --- |
| data | PASS: 80 exact roster species; 50 exact normative actions; hidden null; 80 tracked/local SHA matches; models=7300844 bytes | 0 |
| battle | PASS: 80 species; all 50 abilities executed; 25 wheel pairs; capture hit seed=670, miss seed=671 | 0 |
| world | PASS: world/save v2 API; five regions/rivals; habitat pools 35/65/65/75/80; corrupt-byte preservation | 0 |
| regions | PASS: 5 regions, 128000 m², 480 trees, 48 NPCs (12 principal), 9 shops/contracts; 73 POI + 15 wild routes, 185 collision-safe segments | 0 |
| economy | Foldwild economy: PASS (9 shops, atomic trades, caps, reload stock, one-shot contracts, prototype guards). | 0 |
| builds | Foldwild builds: PASS (80 species x 10 seeds, 77 builds, neutral migration, caps, unlocks, synergy, prototype guards). | 0 |
| battle_v2 | PASS: battle v2 all 80 profiles/evolutions; every class/trait; capture boundaries; 31 energy/26 shield caps; frozen-input replay | 0 |
| save_v2 | PASS: v1 neutral migration and legacy Iven badge; no reload restock; scoped rotating backup, quota failure and UTF-8 256 KiB corrupt-byte preservation | 0 |
| continuity | PASS: optional v1/v2 continuity; canonical effects/profiles, active index and exact action/RNG replay; immutable release guards/history | 0 |

Additional foreground in-memory Node probes, exit 0, retained in
`.tmp/foldwild76/source-probes.log` (332 bytes):

```text
SOURCE ARITHMETIC ONLY {"trialXP":3136,"levelAfterOnlyTrialXP":21,"remainder":112,"to12":1026,"to26":4554,"to34":7626}
NEGATIVE IN-MEMORY STORAGE FIXTURE: stale writer overwrote score 250 with 0; next distinct stale write replaced backup too.
NEGATIVE CAP FIXTURE: accepted level-40 XP=1000000 becomes unsaveable after gainXP(+44).
```

These deliberately constructed module inputs used an in-memory Map storage
adapter, not browser storage or state grants. They are negative/source fixtures,
never positive natural gameplay. Reproduction: call `writeSave` with score 250,
then a stale fresh state's score 0, then that stale state with position.x=0.1;
inspect primary and backup after each. For the XP case, validate a fresh state's
roster replaced with canonical level-40 Hearthol/UID owned-1 at XP=1000000;
`gainXP(+44)` followed by `validateSave` throws the XP bound error.

`python3 -B scripts/check_maintenance_docs.py` exited 0; log
`.tmp/foldwild76/maintenance.log` (178 bytes):

```text
PASS: 120 game documents cover 115 registered + 5 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Nine pure passes, zero native/full-catalog gate passes. Images: none, 0 bytes.
No servers/browser/owned background processes were started, so none remain to
terminate. Old evidence was neither overwritten nor deleted. Scratch logs total
3257 bytes, below the 2 MiB task limit. Initial disk guard reported 2.4G free;
final disk guard also reported 2.4G free (no change at that display precision).
Owned document growth is 16294 bytes before this final accounting update; scratch
is 3257 bytes. No asset materialization/install or sparse change. Games added: zero. Catalog
count: 115 from fresh maintenance coverage. Final commit/hygiene are reported in
the delegation completion; only this new documentation path is staged.
Scoped `git diff --check` exited 0; report sanity checks found no em dash or
machine-local home path. Sparse selection remained Foldwild/assets/docs/scripts.
