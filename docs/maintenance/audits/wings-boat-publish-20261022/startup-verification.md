# Terrain startup boundary: source verified, native proof HOLD

## Authorized change

Ticket `pi-829842-1792629513153-fad15e4a` and the operator authorized separating
worker availability from scene readiness. The worker sends `ready` only after
module imports and generator-handler installation. The fallback resolves backend
availability immediately, without running its queued terrain generation.

A separate **30-second** worker-boot bound precedes the original **20-second**
draw/world-readiness gate. Shader-error, nonzero-draw and near-field readiness
predicates, scheduling, density, generation budgets and result application remain
unchanged. No pre-launched scene, state grant, model edit or minified patch.
Read-only timestamps bracket this wait, not total browser/worker-constructor cost.

The earlier trace showed submitted draws and delayed results for dispatched jobs.
It did not establish that no jobs dispatched or isolate every cold-boot cost.
This is an authorized measurement-boundary change, not measured native success.

## Lifecycle and CPU evidence

Reviews repaired world/worker cleanup on failure and the same-turn handshake /
device-failure race that could reinstall an animation loop. The world cleanup
owner clears once; both stage timers clear. Full renderer/pipeline/effects-wide
disposal is not established by this world-only repair.

- Pinned source build: **28 files, 4,979,106 bytes**, esbuild 0.28.2 / Three 0.186.0.
- `worker-startup-check.mjs`: executes the real worker module with fake transport;
  ACK follows handler installation, ordinary results cannot grant startup, result
  accounting survives, error/disposal reject, and fallback pumping stays queued
  and bounded. Two deliberate mutations fail their expected assertions.
- `check-startup-clock.mjs PATH_TO_APPLIED_SRC/render/scene.ts`: executes actual
  authored failure/gate bodies with fake clock/firstDraw. Covers 30s boot,
  unchanged 20s draw, valid 27s+19s, errors/timeouts, same-turn failure, once-only
  cleanup and no retained loop/timer/unhandled rejection. Removing the boundary
  guard fails its negative control. Not GPU or generated-world proof.
- Existing boat, Astra, solo and all three serialized model checks passed again.
  Strict candidate geometry still fails against the selected older boat asset.
- Read-only review 51 found no high startup-contract defect. Its medium collector
  ownership finding is addressed below. These checks do not grant native acceptance.

Authored source is recoverable from the pinned source plus `Games/Wings/port.patch`.
Readable regressions remain under `Games/Wings/verification/`.

## Three retained native attempts

[ browser.json ](browser.json) retains all three attempts, each **HOLD**:

1. Persistent-context launch reported `Timeout 10000ms exceeded`, before app.
   The receipt honestly retains a command-output summary, not a reconstructed
   full call log or invented timing sample.
2. A 20s persistent-context launch allowance with the same 55s supervisor ended
   **exit 124**, without a completed product/gameplay receipt.
3. The separately authorized manual system-Chromium, dedicated fresh profile,
   loopback CDP and non-persistent context route **connected/probed successfully
   in 17,677.85ms**, inside its 20s budget. The 55s supervisor then expired in
   the coarse **menu** phase, before any new screenshot or product/gameplay sample.
   It cannot identify which navigation/settings/capture step stalled. This is
   **not connection failure and not proof of product-gate failure**.

Attempt 3 did not return normal API cleanup flags. Its later independent
postflight records absent collector/browser/driver processes and removal of its
exact owned leftover profile. That handoff evidence does not upgrade collector
status. World `b16dd16` received explicit release. No unrelated process was stopped.

The original lobby PNG remains prior real evidence, not a new attempt-3 capture.
**No requested water/gameplay frame exists.** Worker-boot and post-handshake
product deltas remain unmeasured in the native attempts.

## Collector-only follow-up, not browser-retested

The collector now persists granular menu phase and the first exception **before**
`context.close()` can stall, retaining any later cleanup error separately. Atomic
replacement preserves all prior attempts and a non-recursive current snapshot.
A valid product receipt is saved before boat movement/capture. If collection later
times out, only that already-measured product result may become
`PASSED-with-collector-timeout`; overall collector/gameplay acceptance remains HOLD.
No measurement can be inferred from the supervisor's generic timeout.

Review 51 recorded a **latent** ownership finding: exact-argv selectors can miss
Chromium utility descendants without the profile marker and driver processes;
group cleanup can be skipped after leader exit, allowing potential false PASS.
Independent postflight reports all-zero processes for the retained attempt, so
**no active orphan is claimed**. The verifier now uses Linux child-subreaper
ownership before spawning, so even double-forked/new-session children stay owned.
Cleanup enumerates that owned tree, signals birth-checked process handles, verifies
no survivors and refuses PASS/profile removal on ownership-cleanup errors. It does
not signal sibling processes by browser name or a guessed PID/group.

The no-browser self-check actually creates a short-lived Python fixture whose
leader exits and child starts a separate session without a profile token. The
owned child is detected and terminated. Verdict checks also reject survivors,
cleanup errors, timeouts and HOLD; first-failure/history/path checks pass.
These collector follow-ups have **not** been revalidated in Chromium. No extra
browser attempt or longer collector was silently added. The one supervisor stays
55s; every complete product proof still needs actual 30s/20s deltas and real draws.

Post-connect/menu ticket `pi-829842-1792641745174-2ca752e0` is marked answered;
its response is empty, so no new diagnosis or permission is inferred. Answered
review ticket `pi-2229574-1792642366676-041a8669` attributes intermittent shell
timeouts to board load, directs latent-finding wording and no further diagnostics
in that review. The operator's resume confirms staging-only finalization, no new
browser permission, no supervisor reruns and no push. Native HOLD is unchanged.

## Remaining scope and gates

The existing boat GLB remains byte-identical with its older roof and absent driver.
Closed-roof/driver, gameplay, audio, hardware, scene budget and rights acceptance
remain open. Full **127-game** gate is deferred; zero fleet visits in this lane.
No new game, model, dependency or catalog ID, main rebase, push or live verification.

The later operator CTF expansion is separate future implementation: keep patrol
and its defaults unchanged, add boat selection inside the existing fleet picker,
and implement offline two-team plane/boat CTF. It is not delivered or catalogued
as a fact by this startup checkpoint. New CTF evidence must not reuse these images
as proof of a mode that they do not show.
