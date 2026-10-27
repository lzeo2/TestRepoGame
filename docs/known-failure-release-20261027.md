# Explicit known-failure release: Wings, Citisten, Jank

## Authority and scope

The user's explicit order authorizes pushing these existing games despite the
previously disclosed gameplay/QA failures. This is a testable release, **not an
acceptance certificate**. Failed checks remain failed; no tests were deleted,
thresholds changed or unsupported kits enabled. No new game or racing build.

Fresh main base: `c223c5837d5ad88a41775a51aab59f53ff802f0b` (published Foldwild).
Only the three named game trees and necessary scoped documentation are integrated;
no inherited multi-game branch merge. Three-way indexed application had zero
conflicts. Existing source worktrees and the dirty Jank QA repairs were not edited.
Source integration commit: `d0598e156afe043ecaf910cd7ecaae02a42c5515`.

| Game | Pinned committed source | Integration |
| --- | --- | --- |
| Wings232 | `fd0e87fb236eddca1030df4bf531d62afdd70710` | Exact source plus fresh served build of its original-UI Factions integration |
| Citisten241 | `de3ec4e6ba540e8b44c78b021f4a413490169d00` | Exact game tree `cf589170731afb5e3f974305a449045fc225ac14` |
| Jank240 | `c19405ab722e914a4b5b5bbd859eb83ccef75694` | Exact game tree `cd2298dd42ea4ef4cce6ec034044a7870bef2ebe` |

Citisten is the actual static source game, not a private Chromebook export.
Jank's released QA pair is exactly the pinned committed 38,824 + 21,175 = 59,999
bytes. The two unfinished dirty working-file replacements are not included.
Catalog, portal, shared fonts, proxy/backend and every other game are unchanged.
Foldwild's accepted tree remains `6929cd6f31b89841b1eafeb9e745e73aca002424`.

## Wings: actual deployment wiring, not authoring-only

The pinned snapshot's local source contains actual original lobby/GameSession,
loopback/RoomEngine hooks, fleet authority and shared supplied-model view. Its
old served bundles did not include those additions. We source-built that exact
committed source with the existing builder; generated chunks were not hand-edited.
Original UI, controls, notices, original models/fonts and attribution are retained.
No new dependency, remote service or replacement dashboard.

Actual final build used the operator-specified existing esbuild0.28.2 and existing
Three0.186.0, without installation. Source/authoring extraction used RAM only;
model packs were not duplicated. Output: **26 files, 3,809,698 bytes**. The second
build using the specified tool path exactly matched every first-build byte.

```text
PASS esbuild 0.28.2; Three 0.186.0; 26 files; 3809698 bytes
PASS generated imports, HTML/CSS entries and worker references resolve; no external module imports or .ts URLs
```

Served `Games/Wings/index.html` loads `assets/main.js`; its generated dependency
graph reaches `assets/game-YX45I7AR.js`, containing the actual Factions session
and both derived escort assets. Worker, CSS, dynamic chunks, models and fonts
resolve to tracked local files. The generated index intentionally preserves the
original UI HTML. Current source, not the historical baseline `port.patch`, is
the authoritative rebuild input. Old generated chunks remain for existing
consumers; no unproved asset deletion was performed.

[Wings implementation and retained failures](wings-local-integration.md),
[host bridge](wings-host-bridge-delivery.md), [trace phase](wings-local-trace-phase.md).
Missing upstream-license qualification is retained; this release invents no new
permission or independent rights clearance.

## Known failures and unfinished acceptance, explicitly retained

- **Wings:** native renderer/compositor/capture and actual flight gate remain
  unpassed. Earlier real session/fleet initialization is partial evidence, not
  accepted flight, clean loading, FPS, mobile or full-roster gameplay. No new
  browser run was made for this release.
- **Citisten:** native Water/Save/Continue acceptance remains unpassed, including
  failed scheduling/capture/post-Continue completion. Existing CPU results are
  source evidence only. No fresh complete native case, city preview or physical
  device/performance certification is claimed.
- **Jank:** the disclosed unfinished diagnostic draft exceeds the60,000-byte cap
  (79,317 bytes); its dirty replacements are excluded, not fixed or certified.
  Prism Warden's actual zero-frame/compositor/browser-ACK failures remain failed.
  Expansion is incomplete; **no forty-hero/native acceptance**. Proposed slots
  and CPU guard fixtures are not proof that undefined kits are playable.
- Fresh expansion native acceptance and current integrated full-fleet release
  testing were **not run**, not passed. The explicit user order releases the
  disclosed snapshot with these holds rather than waiving them into green tests.

[Citisten retained QA](citisten-river-upgrade-delivery.md) and
[corrective failures](citisten-river-fixfinish-qa.md); Jank's committed integration,
hero documentation and maintenance manual retain its narrower proven scopes.

## Packaging and maintenance verification

Unchanged passing CPU suites were not rerun, nor were known failing browser tests.
New checks cover committed-pin equality, three-way integration, generated build
closure/syntax, deployment wiring, catalog/schema/Git paths, privacy and whitespace.
One synthetic profile-path redaction fixture in Jank QA is deliberately invalid
input, not a personal host path; it was preserved rather than weakening its test.
No real private email or machine-specific absolute path was added to the report.

Only the three named inventory rows were recalculated from committed source.
All unrelated rows and shared-runtime metadata stay unchanged from main:

```text
PASS: 135 game documents cover 129 registered + 6 unregistered games; Git inventory current.
Coverage only: section presence does not certify documentation accuracy or gameplay.
```

Root free at admission: 2,375,708,672 bytes; all recorded operations remained
above the2,147,483,648-byte floor. No installs, full model checkout, broad source
worktree mutation, foreign cleanup, force push, garbage collection or history
rewrite. Sole integration writer owns the narrow release branch/index.

Actual push SHA and live HTTP hash checks are reported after publication. Hosting
is the existing `https://lzeo2.github.io/TestRepoGame/`; a pending Pages build is
reported as pending, never as deployed or accepted gameplay.
