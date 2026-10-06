# Slipstream sandbox: bounded independent source review

## Frozen scope

Reviewed runtime `a5d78082f1da69fe41af11750ba8537ad9efb93d` against `1673670`, including worker commits `59d2e90` / `2ad5cd3` and Main integration `a5d7808`. Provider/model: `openai-codex/gpt-6-astra`; requested thinking: high. Read AGENTS, code-quality rules, Ponytail skill, maintenance entry/manual and inventory. Only this report is owned; no runtime, tests, catalog or shared assets changed.

## Result

**No actionable runtime source finding in the bounded reviewed paths.** This is not native certification or permission to publish.

- `core.js`: sandbox builds a temporary copied profile/run without reserving the banked profile. Sandbox constraints exclude NPCs, police, gadgets, rewards and progression; settlement explicitly rejects sandbox. Signed city speed is bounded to -6 m/s, reverse steering uses signed yaw, traveled distance remains nonnegative, containment uses absolute speed, and highway modes stay forward-only. Handling override is sandbox-only and bounded. Descriptor-safe validation, copied state, banked schema and current-run/once-only settlement guards remain intact.
- `script.js`: traced start, terminal settlement, parking, unpaid abandon, retry/automatic respawn, save failure/conflict, help/pause/blur/visibility, keyboard/held-pointer input, tuning and frame accumulation. Sandbox bypasses the driving lock only for an unbanked run, not the save guard. Ordinary starts save reservations before driving. Terminal phase ownership prevents repeated settlement. Per-car tuning stays in visit memory and ordinary inputs omit its override.
- `view.js`: player and NPC poses interpolate compatible run identities/modes/statuses; collision transitions snap, headings take the short angular path, and new NPCs fall back to current poses. Signed city displacement drives reverse wheel rotation; highway wheel progress remains forward. Controller resets previous snapshots/remainder on input clearing and phase boundaries. No source change requested to these paths.
- Private implementation bytes were compared without including them in this report and are unchanged from the baseline. No weakening of validation or settlement is proposed.

## Action outside owned scope

Maintenance inventory is stale for the reviewed continuation: recorded Slipstream tree `168ef6db179dfc0dad11d4156793504f65048c07` differs from frozen runtime tree `1e3ee36296b6115e956c9786149d31adf30786f8`. Main should update the existing manual for sandbox/reverse/interpolation, then deliberately refresh inventory after its sibling source/catalog work is committed. Do not treat the manual's historical native/full-gate passes as acceptance of this runtime.

## Checks actually run

All four source-only commands exited 0:

- `node scripts/test_slipstream_reverse_sandbox.mjs`: `PASS reverse/sandbox: all16, signed motion/mirror/tune/copy/rest/coast/contact, strict hostile bounds, no grants/banking, timeout; highway forward-only. Source-only.`
- `node scripts/test_slipstream_input.mjs`: `PASS actual controller: gentle press, immediate release, held touch, opposing controls, brake priority and optional Auto gas. Synthetic input only.`
- `node scripts/test_slipstream_city_render.mjs`: PASS, including synthetic 60/120Hz interpolation, guards, pause, NPC, reverse/highway, all16 cockpit transforms and disposal. No real WebGL/browser acceptance inferred.
- `node scripts/test_slipstream_core.mjs`: `PASS 15 Slipstream core groups; synthetic/controller/cheat evidence only, no native natural-progression claim.`

Frozen `core.js`, `script.js`, `view.js` each passed module syntax checking, exit 0. `git diff --quiet a5d7808 -- 'Games/Slipstream Borough'` exited 0, establishing working runtime equality for those tests. Private implementation equality check returned true.

`python3 -B scripts/check_maintenance_docs.py` exited 1 with `AssertionError: Commit inspected source changes before validating its inventory.` Main's pre-existing dirty catalog prevents that gate; no refresh or sibling staging attempted.

## Limits and handback

This review ran **0 browsers, 0 servers, 0 native interaction cases, 0 screenshots and 0 full registered-game gates**. Main's reported positive sandbox/all16/touch and modes/recovery/caught passes are external evidence, not independently repeated here. Synthetic checks cannot establish physical-phone behavior, visible interpolation quality, real storage-event timing, sustained performance, campaign balance or naturally earned all-car progression. No installs, games added, registration, push or cleanup.

Initial filesystem free space: 2,752,180,224 bytes, above the 2,000,000,000-byte floor. Existing dirty sibling paths were `games.json`, `scripts/test_foldwild_core_v2.py`, `scripts/test_slipstream_catalog.py` and untracked `scripts/test_foldwild_catalog.py`; they remain Main-owned. Final report-only diff/commit verification is recorded in the handback.
