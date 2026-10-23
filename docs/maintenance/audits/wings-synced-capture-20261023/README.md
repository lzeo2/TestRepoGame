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

## Answered findings

Ticket `pi-197482-1792750271892-16c1c1c0` is answered with an operator decision; the earlier 60s advisor timeout is historical. The two-attempt bound is exhausted and native full capture remains **ABANDONED**. This closeout authorizes documentation/inventory only, not a browser retry or runtime change.

- **Attempt-01:** phase `product-gate`, supervisor exit 124 at 50s. The overall budget was exhausted after launch/navigation and menu work. It cannot guarantee the full subsequent 30s worker-boot plus 20s readiness windows. `ProductGate NOT_MEASURED` stays unchanged: neither product failure nor success is inferred. Post-start CDP/main-thread stall versus product failure remains undistinguished.
- **Attempt-02:** the operator classifies the headless first-paint/actionability timeout as an **environment-class limitation**, consistent with a known SwiftShader/headless rendering-stability pattern. The button existed in the DOM but normal click actionability did not complete within 5s. This classification does not independently establish which actionability condition blocked, a shader/compositor root cause, CDP responsiveness or a product defect. No force click or state grant is warranted.

## Operator-owned diagnostic inventory

| Route | Status | Scheduling and authority |
| --- | --- | --- |
| Diagnostic-only CDP listener prepared before launch: curl polling of the loopback `/json/version` endpoint plus CDP Page observations; one single `Performance.getMetrics` read after the menu click | **PROPOSED** | **Not scheduled, not executed.** Requires separate, specific operator authorization and browser-slot coordination. |

The answered decision identifies this as the only proposed evidence path for separating post-start CDP/main-thread stall from product failure under the fixed limits. Listing it is not a new capture request, reservation, executable collector or permission to poll now. No third capture, automatic retry, runtime change or push is authorized. Retain the original ticket, both attempt timelines and unchanged receipts.

## Source and release scope

Collector commits `5f410dc2e7c8b1c81591a3deb537056b10f07e31` and `3005be7` changed only `Games/Wings/verification/check-ctf-browser.py` as source, plus documentation/evidence. Runtime, models, catalog, source patch and protected content remain unchanged since `be0de0b`. Worker self-check, syntax, diff and receipt/cleanup checks already recorded exit 0; they were not rerun here. Their pre-commit maintenance staleness is reconciled by the docs-only inventory refresh after both source commits.

No games, IDs or dependencies were added. No build, install, browser/native test, full-fleet run or push occurs in this closeout. The full current 127-game gate remains deferred; these incomplete captures do not replace it. The October 17 125/125 success is historical, not a current 127-game pass. Historical HOLD receipts remain untouched; source staging and tooling referral do not verify the product.
