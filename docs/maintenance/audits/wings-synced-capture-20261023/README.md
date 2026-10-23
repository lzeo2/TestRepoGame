# Wings synced capture closeout (2026-10-23)

**Two authorized attempts exhausted; native full capture ABANDONED. Product outcome UNKNOWN / NOT_MEASURED.** Neither collector failure proves a product failure or a root cause. Existing release, rights, native gameplay, physical-input, hardware, roof/driver and variant gates retain their states.

## Authorization and bounds

Operator resume through `pi-829842-1792632763581-ba60545e` authorized the transient headed smoke route, then headless portrait variants within the two-attempt bound. The actual invocations are preserved in [attempt 1](attempt-01/README.md) and [attempt 2](attempt-02/README.md), with immutable logs, exit codes and JSON receipts. Both used system Chromium with launch30/navigation15 and a 50s overall collector/supervisor. Product boot30/draw-readiness20 limits remained untouched. Startup consumes the overall budget, so 50s can preempt the full product30+20 allowance; collector outcome is separate from product acceptance.

## Actual results

| Attempt | Observation | Collector result | Product result |
| --- | --- | --- | --- |
| 1, headed under Xvfb | Connection/context probe 2,874.028ms; CTF menu and Patrol Speedboat selected; Start offline clicked at 6,539.877ms | Supervisor exit 124 in `product-gate` | `NOT_MEASURED` |
| 2, headless SwiftShader | Context probe 2,371.824ms; first normal CTF click resolved the button, then `Locator.click: Timeout 5000ms exceeded` while waiting for visible/enabled/stable actionability | Exit 1 in `ctf-menu`, not overall supervisor expiry; no completed clicks, samples or screenshots | `NOT_MEASURED` |

The second receipt does not establish which actionability condition blocked the click. Neither failed capture establishes post-start CDP unresponsiveness, a product-gate defect or another root cause. No force click, state grant or acceptance workaround was used.

Both receipts report `browserClosed`, `serverClosed` and `profileRemoved` true, supervisor cleanup finished, no remaining owned processes and no ownership cleanup errors. Independent postflight checks recorded shared-slot release. Cleanup success is not gameplay success.

## Fresh visual evidence only

The only fresh image is [attempt-01/01-ctf-lobby.png](attempt-01/01-ctf-lobby.png). The orchestrator viewed it: mode Capture the flag, vehicle Patrol Speedboat, timer/capture controls and Start offline are visible. The bottom explanatory paragraph is clipped inside the scroll region. This is menu evidence, not polished mobile acceptance. No water, flag or boat-movement acceptance follows; no old image substitutes for missing gameplay captures.

## Pending diagnostic referral

The orchestrator filed `pi-197482-1792750271892-16c1c1c0`, referencing the original resume ticket. Its `ask_hermes` call timed out after 60 seconds and returned pending. The concrete request is operator/platform diagnostic evidence distinguishing post-start unresponsive CDP from product-gate failure, and explaining headless actionability without force clicks or state grants. This tooling referral grants no acceptance and no automatic third attempt. No repeat request, polling or further capture is authorized by this closeout.

## Source and release scope

Collector commits `5f410dc2e7c8b1c81591a3deb537056b10f07e31` and `3005be7` changed only `Games/Wings/verification/check-ctf-browser.py` as source, plus documentation/evidence. Runtime, models, catalog, source patch and protected content remain unchanged since `be0de0b`. Worker self-check, syntax, diff and receipt/cleanup checks already recorded exit 0; they were not rerun here. Their pre-commit maintenance staleness is reconciled by the docs-only inventory refresh after both source commits.

No games, IDs or dependencies were added. No build, install, browser/native test, full-fleet run or push occurs in this closeout. The full current 127-game gate remains deferred under the missing-browser blocker. The October 17 125/125 success is historical, not a current 127-game pass. Historical HOLD receipts remain untouched; source staging and tooling referral do not verify the product.
