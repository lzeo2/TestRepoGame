# Wings synced capture: attempt 2, 2026-10-23

**EXITED capture incomplete, exit 1. Native attempts ABANDONED under the operator's two-attempt bound. Product outcome UNKNOWN / NOT_MEASURED.**
Ticket `pi-829842-1792632763581-ba60545e`; baseline `5f410dc2e7c8b1c81591a3deb537056b10f07e31`.
Exactly one new native invocation, no retries. Attempt 1 history is untouched.

## Command and actual result

```sh
python3 -B Games/Wings/verification/check-ctf-browser.py --headless --attempt-number 2 --out docs/maintenance/audits/wings-synced-capture-20261023/attempt-02
```

Native exit **1**, retained in `exit-code.txt`; `capture.log` is empty (no stdout/stderr).
`browser.json` retains the actual headless SwiftShader route, attempt number 2,
phases and first error saved before cleanup. System Chromium used the exact
operator-authorized launcher; default headed behavior remains unchanged.
Launch30/navigation15, collector50/supervisor50 and product boot30/readiness20
limits remain unchanged, without an outer 55-second supervisor.

Launch phase began at 1.328s, context creation at 1.895s, navigation at 2.417s
and `ctf-menu` at 2.766s. Connection/context probe was 2,371.824ms.
The first normal `Capture the flag` click failed:

```text
Locator.click: Timeout 5000ms exceeded.
```

The locator resolved to the menu button but remained waiting for visibility,
enabled state and stability. Which actionability condition blocked it is unproven.
No completed click, diagnostic sample or screenshot was obtained. No Start offline,
product readiness, boat movement or carried-flag phase was reached. The inherited
`collectorTimedOut: true` marks any timeout exception; this was a 5s locator
exception, NOT a 50s supervisor expiry (supervisorExit is 1, not 124).
No recorded console/page errors, failed requests or external loads establishes
only that partial observation, not clean gameplay. Product remains NOT_MEASURED.

The collector adds argument propagation and a read-only immediate post-start
sample using existing diagnostics. That sample was never reached. No runtime,
model, quality setting, source patch, state grant or renderer instrumentation changed.

## Checks and cleanup

- Python AST syntax: exit 0, `PASS Python syntax (AST; no bytecode)`.
- `--self-check`: exit 0, `PASS CTF timing verdict self-check; no browser started`.
  Argument propagation/default, inherited receipt/first-error/subreaper checks passed.
- `git diff --check`: exit 0.
- Preflight shared slot check: exit 0, clear. Independent postflight: exit 0,
  `PASS attempt 2 incomplete verdict, owned cleanup, closed server, absent profile and shared slot clear`.
- Maintenance checker before commit: exit 1, `Commit inspected source changes before validating its inventory.`
  Inventory refresh remains the coordinator's final docs-only task. Existing inventory
  Wings tree `d6167f64cc22ddf81f7d151632aa73ae4a7c9345` already differed from baseline
  `81365e364d05314203bf1f06723b70237e49c403`; entry blob matched.

Receipt confirms browser/server closed, profile removed, supervisor cleanup finished,
no remaining owned processes and no ownership cleanup errors. Independent TCP and
profile checks passed. No sibling killed or outside-repository deletion.
Preflight free bytes: 2,997,280,768; after capture/checks: 2,997,075,968.
Evidence then occupied 4,831 bytes, below the 10 MB cap. Disk delta is host-wide.

No install, checkout, build, full-fleet run or push. Catalog remains 127 games;
none added. All release/hardware/rights/physical-input and boat acceptance holds
remain. Source is safe; product is not verified. Orchestrator owns any new Hermes
ticket; no third attempt or new approval request was made here.
