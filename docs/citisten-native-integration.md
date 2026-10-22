# CITISTEN native integration

## Source and registration

The game entry is `Games/Citisten3D/index.html`, not either specimen.
`b6db8eb` connects the existing simulation, world and UI. `ce1c541` registers
catalog ID 241; the catalog now contains 128 entries. Registration is not
release acceptance. No push is authorized or performed by this lane.

Native placement uses one shared occupancy/budget boundary, with atomic
$10-per-new-lot road drags. Simulation IDs retain stable model handles;
agent poses use `roads.center`, while shot events retain grid coordinates.
Events drain once and feed UI and world effects. Starting either mode clears
the previous roads, model handles and simulation. Menu pauses, Resume restores
the selected speed, and the existing loss dialog offers Restart.

## Independent source review and corrections

UI owner `0b0bc54` found mobile panel overlap, a native-panel theme mismatch,
and cleanup registered too late for navigation during loading. Sim owner
`9347e97` found that the render-delta clamp could slow simulation on low-FPS
hosts. `93c104e` fixes these shared integration boundaries: observed HUD bounds
position the panel, its light palette follows the UI, cleanup is registered
before asset loading, and only visual deltas are capped. Hidden tabs do not
accumulate simulation catch-up. Partial native screenshots then exposed the
panel covering blackout toasts. `2540b8c` places it before the existing toast
list in normal HUD document flow and removes the positioning observer.
This does not resolve the rendering budget.

`14a19ab` adds the bounded actual-entry runner and its source-only contract at
`citisten-design/native-qa-receipt.md`. `a8d17f5` splits it into city/shell runs
with durable phase checkpoints and profiles inside the owned evidence folder.
It uses native pointer/tool/menu input and read-only diagnostics, rather than
grants or a fixture renderer.

## Verification boundaries

`native-check.mjs`, `sim-check.mjs`, `world-check.mjs`, the external-model and
external-material checks pass. External-model tests stub HTTP/image decoding;
they are not browser or GPU acceptance. Catalog validation passes 128 unique
records with Git-backed entry files and the native URL for 241. The smoke
selector regression rejects unmatched IDs instead of accepting zero visits.

The accepted batch-65 targeted loading result against `ce1c541` is **1/1,
exit 0**, zero retained console errors and failed requests. Its receipt is
`maintenance/audits/citisten-external/ship/smoke-241-batch65.txt`. Earlier
zero-match/interrupted runs remain rejected. Later native fixes need their
own acceptance; loading does not establish native gameplay or 40fps.

The first complete native command **timed out, exit 124 after 135.0507s**.
Its 120s alarm did not finish cleanup before the outer hard stop. Source hashes
were unchanged. Two inspected C-city/D-blackout screenshots are partial
progress only; no final `native-results.json` was produced. Fresh checks found
no owned browser/driver process and port 8751 closed. Two orphan temporary
profiles require operator-only cleanup under ticket `aeec9b65`; this lane does
not delete outside its repository. The next runner splits the same assertions
into bounded city and shell suites, rather than raising the time limit.

The first split CITY attempt also **failed: exit 1 in 29.9496s**, with
`Page.goto: Timeout 15000ms exceeded` waiting for DOMContentLoaded. No gameplay
check or screenshot was reached. The report has empty error/external-request
arrays, unchanged source hashes and true browser/driver/server/profile cleanup.
Fresh process and port checks confirmed cleanup. This is not offline or native
acceptance. SHELL remains unrun.

Hermes consultation `0aad480b` suggested a server-only readiness probe before
another browser attempt. Reproducing the harness HTTP server returned 200 for
the entry in **0.0720s**, and native/world/CSS requests in 0.0023..0.0027s;
`server-readiness-probe.json` retains the measurements and verified shutdown.
This probe does not support an ongoing server-bind failure, but does not prove
the cause of the browser navigation timeout. Host/renderer timing remains
unresolved. There is no third native run or raised navigation threshold.
World's adapter normalization/AFTER recapture must finish before a shared
source freeze; full-fleet coordination ticket `751c1d6a` remains pending.

Command output, exit status, source hashes and screenshots are retained under
`maintenance/audits/citisten-QA/native/`. Read the command/results JSON for later
run outcomes. The interrupted pre-launch command has an empty retained log and
is not a pass.

Natural combat F/G/H, per-model AFTER captures, current 40fps measurement and
full-fleet remain open until separately recorded. The full fleet needs a clean,
stable tree and coordinated no-merge/no-sparse window; a requested window is
not an acquired reservation. A targeted pass does not replace all-game smoke.
Native hardware, physical touch devices and independent supplier rights
verification are not certified by these software-only checks.
