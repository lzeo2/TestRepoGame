# CITISTEN native integration

## Source and registration

The game entry is `Games/Citisten3D/index.html`, not either specimen.
`b6db8eb` connects the existing simulation, world and UI. `ce1c541` registers
catalog ID 241; the catalog now contains 128 entries. Registration is not
release acceptance. No push is authorized or performed by this lane.

The operator confirmed that 241 means the ledger/game ID, not 241 model
records. The separate operator ledger file was not located; the working
references are `maintenance/games/241-citisten3d.md` and
`citisten-design/catalog-241.draft.json`. Its absence does not block the
operator-authorized catalog row; it remains a reported documentation gap.

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
`a108429` adds the operator-approved HTTP readiness/content precondition before
browser launch. Navigation stays at 15 seconds and the action/cleanup limits
stay 100+20 seconds. It uses native pointer/tool/menu input and read-only
diagnostics, rather than grants or a fixture renderer.

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

## Actual native attempts: all failed, no complete CITY or SHELL pass

| Attempt | Exit / duration | Retained outcome |
| --- | --- | --- |
| Combined, before split | 124 / 135.0507s | Partial C/D screenshots; action alarm and cleanup exceeded the reservation. No final runner JSON. |
| Split CITY, before HTTP guard | 1 / 29.9496s | `Page.goto` 15s DOMContentLoaded timeout before gameplay; cleanup passed. |
| HTTP-guard CITY | 1 / 23.2221s | Server 200 in 0.05955s; two loopback module requests failed `ERR_NETWORK_CHANGED`, then readiness timed out at 15s. Cleanup passed. |
| Final approved monitored CITY | -9 / 120.1524s | Entry ready at 12.172s; placement/C/D checkpoints reached, but the 100s action alarm interrupted the D screenshot and the outer stop killed cleanup. Not PASS. |
| Distinct first SHELL | 1 / 20.9700s | HTTP 200 in 0.06270s, then 15s DOMContentLoaded navigation timeout before gameplay. No screenshots; all normal cleanup flags passed. |

All source-hash comparisons were unchanged. The final attempt finished six
placements at 87.106s, asserted population and both networks at 88.575s, saved
its C screenshot at 95.007s, and asserted blackout/panel bounds at 99.224s.
It did not finish D capture, power rebuild, Menu/Resume or repair selection.
Partial checkpoints must not be promoted to a complete CITY pass. The distinct
first SHELL attempt reached no mode/mobile/offline assertions. Natural combat
remains unrun. Operator batch 69 explicitly holds further CITY browser attempts
this session; there is no budget raise or filter weakening. No further native
browser run is planned without operator direction.

### Read-only host evidence and cleanup

The standalone server probe returned HTTP 200 in 0.0720s. The live HTTP guard
also passed before the module failures, so an ongoing bind failure was not
reproduced. The failed 23.2221s run spans 08:48:19.620..08:48:42.842 local time;
NetworkManager recorded virtual-interface carrier events at 08:48:22..24.
Similar events recur roughly every minute. The approved separate 25s route
watch saw zero events; that did not establish a quiet 120s window. The final
monitored run recorded **24 route events and 10 virtual-interface events**,
but no request/console/page errors. Its immediate failure was the action budget,
not another recorded transport error. Raw addresses/MACs/hostnames were omitted
from committed diagnostic summaries. The separate first SHELL run saw zero
route events and empty error/external-request arrays, but still hit navigation
timeout. That is not another recorded `ERR_NETWORK_CHANGED` case, nor proof
of a stable 120s host window. No host configuration was changed.

The disk-action agent removed the two old shared-memory profile orphans in
batch 67. After the final hard stop, fresh checks found zero browser roots,
drivers or matching profile processes and port 8751 closed. Only the repo-owned
`run-kyyw2x0x/profile` was then removed, after proving it untracked and unused:
**33,619,681 file bytes**. `cleanup-followup.json` records this separately;
the original failed report and its missing cleanup flags were not rewritten.
No live profile is evidence to stage. Full-fleet coordination ticket
`751c1d6a` remains pending; no source/global freeze is inferred.

Command output, exit status, source hashes and screenshots are retained under
`maintenance/audits/citisten-QA/native/`. Read the command/results JSON for later
run outcomes. The interrupted pre-launch command has an empty retained log and
is not a pass.

World reports 34 successful AFTER photos for all 17 models across three
bounded passes at `be3024f`, separately from native gameplay. Its 34 BEFORE
photos, 17 comparison plates, reviewed source/API/provenance and refreshed
inventory are committed in world receipt `37119d2`; these are not native-game
acceptance. Natural combat F/G/H, complete native
CITY/SHELL acceptance, current 40fps measurement and full-fleet remain open. The full fleet needs a clean,
stable tree and coordinated no-merge/no-sparse window; a requested window is
not an acquired reservation. A targeted pass does not replace all-game smoke.
Native hardware, physical touch devices and independent supplier rights
verification are not certified by these software-only checks.
