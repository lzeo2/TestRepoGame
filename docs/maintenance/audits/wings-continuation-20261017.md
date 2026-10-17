# Wings input and UI continuation, 2026-10-17

Continuation after the [repair baseline](wings-repair-20261017.md), authorized by
the operator's request to keep going. Existing game only; no new registration,
dependency installation, Character AI change, push, release or deployment.

## Source repair

`fa52d3d` delivers source-built input and recovery-UI fixes:

- Every local input frame writes all four pilot/officer weapon hints. Seat
  changes and pauses clear the previous seat's trigger. Losing local ownership
  clears all hints and returns boost to normal throttle inference.
- Renderer startup errors use their recovery dialog without a duplicate toast.
  Other toasts wrap inside the viewport and clear the mobile lobby footer.
- Credits and rebuild instructions now describe the current F-15/F-35 models and
  approved external tooling, preserving the missing-license qualification and
  historical ingestion failures.

The input helper is called by the actual controller and tested with the actual
converted F-35 view. No flight tuning, weapon IDs, protocol or original-five
model data changed. Models retain the exact hashes in the standing contract.

Vite 7.3.7 with the approved external dependency set built 63 modules, exit 0.
The source patch applies to the clean pinned index. Generated HTML/chunks and
CPU bundle were copied from source output; none was hand-edited. Upstream
typechecking is not a PASS and the existing large-chunk warning remains.

Before removing five old hashes, the full tracked Pi tree showed their live
consumers only in replaced Wings HTML/chunks, plus a dated aircraft audit
mention. Their replacements resolve 30 static local references; no live old-hash
consumer remains. Model-path construction is covered separately by CPU/browser
checks, rather than inferred from a static import scan.

## Verification and delegation

Workers retained the repository's gpt-6.1-sol requirement. Root owned scope,
review, visual judgment, wording, generated delivery and the full catalog gate.

| Task | Scope and outcome |
| --- | --- |
| D29 | Actual CPU missile acquisition/fire fixtures for all four jet seat/slots; committed `b605529`. |
| D30, D32 | Pi graphics collection; default context unavailable, early software/Low collectors failed before a complete result. |
| D31 | Actual-input audio graph collection; partial useful evidence, restart-state collector error on both attempts. |
| D33 | Complete local input hint bridge, ownership cleanup and converted-view regression; authored check committed `3386c81`. |
| D34, D35 | Bounded normal-input officer missile attempts; Bots selector failed first, then a case-sensitive HUD assertion rejected a correct F-35 spawn. No missile acceptance. |
| D36 | Independent source/patch review; no new correctness defect found, clean-pin application and source mirrors passed. |
| D37 | Pi probe cleanup and pre-deletion consumer tracing; owned port closed, no probe-owned process, clean checkout and safe disk floor. |
| D38 | 12 Node v22.23.1 syntax checks, catalog/protected checks and local reference closure passed; generated whitespace findings reported separately. |
| D39 | Mechanical, sanitized evidence consolidation; root reviewed before publication. |
| D40 | Preserved hashed failed helpers, corrected audio `spawn` readiness and case-insensitive F-35 HUD assertions; static Bun parsing passed, no further browser launch. |

Fresh geometry and rebuilt CPU/solo checks exited 0. The missile fixtures call
real acquisition, input and combat functions; own ammo changes 2 to 1 and the
matching converted store disappears. F-35 covers open/reclose. Targets and poses
are deliberately positioned CPU fixtures, not native targeting acceptance.
Seat transitions, pause and ownership loss also pass through the real helper.

The parent reran actual Windows Edge WebGPU flight on the delivered source build.
Both jets climbed above 100 m under ordinary input, turned, switched cockpit/
chase and produced four cannon projectiles in the sampled cockpit phase. Escape
paused; ordinary menu return left zero sessions and fresh restart created one.
No page/console errors or external requests. Root reviewed new native captures.
The F-35 headless pointer-lock attempt failed; keyboard flight worked. These
brief samples are not a hardware, physical-input or performance benchmark.

The current unavailable-GPU UI regression passed four cases, exit 0: 1280 x 720
and 390 x 844 with dark/light preferences. New assertions check no duplicate
renderer toast and a long real-helper toast inside the viewport/above the lobby
footer. One earlier run stopped on an ambiguous fixture footer; `78e2230` scopes
the selector to the lobby. This was a harness error, not a product failure.
Root reviewed the four toast captures. Their synthetic page retains HUD under
the lobby, so those combined captures establish toast bounds only, not a native
menu state. [Case data](wings-continuation-ui-20261017.json).

## Partial diagnostics and remaining limits

The [diagnostic receipt](wings-continuation-diagnostics-20261017.json) retains
raw-file hashes, build hashes and scoped outcomes.

Audio: both jets had running 48 kHz contexts and nonzero master PCM at idle,
throttle and gun phases. Gun sources stopped/ended after release; all five active
flight sources stopped/ended on menu return, with zero sessions. The global
context's menu ambience is intentional. Both attempts later waited for the wrong
debug restart state (`spawning` instead of `spawn`), so neither entire harness
passed. No human listening, speaker output, isolated boost layer, restart-audio
or missile-audio acceptance is claimed.

Pi: the parent's corrected Low/SwiftShader probe at baseline `a3f5554` reached
software WebGL2 and failed closed on `First scene draw timed out`; its screenshot
also timed out. WebGPU was unavailable. Default headless context creation also
failed. Existing driver/device nodes do not prove browser acceleration. Owned
port/process cleanup, clean Git and more than 2 GiB free were verified. This is
a software-renderer result, not physical Pi GPU acceptance or proof of a model
defect. No further browser retry was made after the bounded probes.

Native missile lock/fire remains unverified. The two earlier terrain crashes and
the two new harness failures are retained; global bot missiles were never counted
as player fire. Physical mouse/speaker checks, converted-family parity, Pi target
performance, load-time comparison and operator silhouette approval remain open.
Corrected helper SHA-256: officer
`99e432f95588b30dd6f3f6ee16645d958038734af01351492079a6be92beb235`;
audio `c10be6afea8fb1d2f0edebce43b88b3031abf2481ed69f5a0984be3a1006a015`.
These are static harness repairs, with no new native acceptance claim.

The public upstream repository metadata on 2026-10-17 reports `license: null`;
the pinned source tree has font OFL files but no game LICENSE. Existing Three/font
notices do not grant rights to the whole game/model set. No permission was
invented or maintainer contacted. Primary references:
[upstream](https://github.com/anomalyco/arcade),
[GitHub repository metadata](https://api.github.com/repos/anomalyco/arcade), and
[GitHub licensing guidance](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

Authored whitespace scope passes. Two inherited generated shader-template
findings remain: `assets/aircraft-BIwDLCoz.js:30` and
`verification/astra-check.mjs:3848`. This is not a globally whitespace-clean
range; generated bundles were not hand-patched to hide the finding.
The [static receipt](wings-continuation-static-20261017.json) separates syntax,
catalog/reference checks and whitespace outcomes.

## Full catalog continuation

The first fresh run stopped after two passing games when `.git/index.lock`
blocked the third sparse selection. Exit 1; no full-catalog pass. Exact coding
configuration and protected hashes restored, repository clean, HTTP port closed.
Raw log SHA-256:
`f9432fb5738bd21b7e17eef5a752d3c71d2f478f7f0cba6448c83b867e5731fa`.
The lock owner was not proven. A parallel static worker had used `git status`,
whose optional index refresh could contend despite a read-only task. It completed
before the isolated rerun; no lock was deleted. Future concurrent read tasks
must use `GIT_OPTIONAL_LOCKS=0` and avoid Git work during sparse transitions.

A local partial-clone inventory attempt was stopped when Git began lazy object
fetches/automatic packing. It did not produce an inventory PASS. No temporary
pack, index lock or GC lock remained afterward. Final inventory refresh/check
uses the Pi's full object store after the documentation commits; a narrow
checkout alone does not make a size-reporting Git inventory cheap to run.

The isolated unchanged full gate at `bfbc5640146cfc38f8af8c34afadaa7f3efb9b21`
passed **125/125, exit 0**, in **1,591.93 seconds**. Independent log counts agree:
125 visits, 125 passes, zero failures. The [full results](wings-continuation-full-gate-20261017.json)
and [interrupted attempt](wings-continuation-interrupted-gate-20261017.json) retain
their distinct outcomes. The earlier `b52d942` result remains a baseline receipt.

The same catalog, waits/filters, 300 MiB cap and stricter 2 GiB floor were used.
Peak materialization was 195,853,427 bytes. Exact coding sparse/config restoration,
protected hashes, clean repository and unchanged HEAD passed. Free space at
restoration was 3,390,652,416 bytes. The owned HTTP server closed and no active
adapter remained. No concurrent Git commands ran during this isolated gate.

Environment: Python 3.13.5, Node v20.19.2, Playwright 1.62.0, Chromium
149.0.7827.196, Debian aarch64. D38's separate static shell used Node v22.23.1;
these are recorded environments, not a claim that the shells had identical PATHs.
Log SHA-256:
`b46958a4bfa392746c43f0e9a90576b9be1bbda6dfcc1f87db01e9ba6f067fc8`.
Runner/wrapper hashes match the earlier unchanged gate. Existing exclusion
counts are not instrumented; this establishes loading under those filters,
not unfiltered loading, complete offline/gameplay, hardware or rights acceptance.

Later changes are credits/audit/manual/inventory records only. Served runtime,
catalog and gate scripts remain unchanged after the tested commit. Final
inventory refresh/check uses the full Pi object store. No publication or push
is authorized.
