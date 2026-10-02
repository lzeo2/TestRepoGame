# Foldwild M2 core integration

Delegation 54. Actual environment: `PI_PROVIDER=openai-codex`,
`PI_MODEL=gpt-6.1-sol`. Anonymous author/committer: Arcade Worker, empty email.
Owned paths only: `Games/Foldwild/script.js`, `scripts/test_foldwild_m2.py`,
this report. No catalog, asset, vendor, optional-secret or publication changes.

## Wired checkpoint

- UID-owned and canonical seen-species Inspect actions. Unknown cards disclose
  only their number and Undiscovered label, never a name or model action.
- The same canvas moves into the ledger host, using the existing renderer/cache
  and core RAF. Modal rendering receives dt=0; world input and routing stop.
  Real rotation buttons, reset and touch drag use the view's inspection API.
  Loading/fallback status stays live inside the ledger. Generation checks prevent
  a late actual model request from reopening a closed preview.
- Owned accessories refresh the inspected individual immediately. Preview-close
  keeps the ledger open and restores focus; ledger close/Escape restores the
  canvas to the field. Result previews restore battle presentation without
  discarding the result phase; model keys reset, and an already released former
  active ally falls back to the current party for presentation.
- Release names the exact species and UID in a native confirmation. Team,
  favorite, last-ally and last-conscious guards have visible explanations.
  Confirmation calls the shared pure release boundary again; cancellation and
  Escape perform no transaction or save. Seen/caught history and resources stay.
- Outpost-only short/cropped/long/none hairstyle controls pass saved hair through
  the actual renderer appearance alias. Explicit Save progress reports success
  or storage refusal/failure, retaining disclosed model/hardware diagnostics.
- Every resolved ongoing command saves the canonical full pending battle, not
  cleared roster effects. Continue clones the validated snapshot with busy and
  pause clear, before rendering; it never creates a new encounter or applies XP.
  Settlement clears pending synchronously and saves rewards once. Reset clears
  battle-finished/model flags. Unload cleanup runs in finally.
- Evolution result text compares pre/post-XP species of existing party UIDs only.
  A newly captured UID is not mistaken for an evolution. New results clear text.
  Whole-model replacement remains presentation, not a new rig or cutscene.

## Actual checks

Commands (run from the repository root):

- `node --experimental-default-type=module --check Games/Foldwild/script.js`
  completed with exit 0 and no syntax output.
- `node --experimental-default-type=module scripts/test_foldwild_<suite>.mjs`
  passed for data, battle, world, regions, economy, builds, battle_v2, save_v2,
  and continuity: eight existing pure suites plus the actual M2 save suite.
  Output includes `PASS: optional v1/v2 continuity; canonical effects/profiles,
  active index and exact action/RNG replay; missed capture`.
- `PYTHONDONTWRITEBYTECODE=1 timeout 420s xvfb-run -a python3 scripts/test_foldwild_m2.py`
  an earlier stable run completed with exit 0. Output: `PASS: Foldwild M2
  native integration; screenshots await Main review; campaign/N100/publication
  held`. Seven native stages, three separate negative persistence/hardware
  fixtures; zero console/page errors, failed requests, HTTP errors and external
  requests. The game-source hashes stayed unchanged during that run.
  Final freshness rerun exited 1 after parallel edits to `view.js` changed the
  source hash; gameplay assertions passed. A last rerun capped at 95s exited
  124 after six native stages. CURRENT integrated gate is therefore HELD: Main
  must rerun the full 420s command against stable modules. The later core change
  adds a presentation fallback for a released former active result ally.
- `git diff --check` on owned paths completed with exit 0. Disk remained 2.4 GiB
  available; native evidence is under 300 KiB combined, no dependencies installed.

The native run buys a badge with real Marks, saves long hair, shows and rotates
real Cindupp, weakens wild Budriv with keyboard ability 1, reloads before capture,
compares the entire resumed canonical battle, actually captures Budriv, restores
result presentation after inspection, and reloads twice without changed rewards.
It then exercises real team/favorite guards, byte-identical release cancellation,
UID removal with retained history, and seen-only inspection after release.
A 390px real single-contact touch drag changes only inspection yaw; 320px checks
show no horizontal overflow and all visible button/select targets at least 44px.
A separately deferred real GLB request cannot resurrect a closed ledger.
Quota, corrupt-slot and combined storage/WebGL-denial fixtures are explicitly
separate from positive gameplay and preserve the prior primary bytes.

Measured loaded inspection: one model reference, cache 4, no fallback or textures.
Cindupp: 2 draws / 414 triangles; with badge: 3 draws / 426 triangles.
Seen-only Budriv: 2 draws / 564 triangles. These are renderer counters, not FPS.
Native JSON/log evidence is in the temporary `foldwild-m2-core` output directory
and `foldwild-m2-core-native.log`; these are not committed assets.

Screenshots, awaiting Main's subjective review:
`desktop-inspection.jpg`, `mobile-inspection.jpg`, `release-confirm.jpg`,
`battle-resumed.jpg` in that output directory, each below 300 KiB.

## Holds

No natural level-12/26 evolution was reached in this short native loop; pure
battle/build checks cover evolution, not a completed native evolution sequence.
The campaign/finale, all-species acquisition and accessory fit, class ranks,
rival appearance edits, secret integration, frontier and actual N100 hardware
acceptance remain open. No full registered-catalog gate was run or claimed.
No game or catalog entry was added, no registration or push was performed.
