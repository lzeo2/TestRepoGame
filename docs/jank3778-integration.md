# Jank ready gameplay integration and release checkpoint

## Delivery states and authority

The user explicitly authorized pushing the completed current repair batch after
required release checks. No further publication-permission request is needed.
That supersedes earlier no-unrequested-push statements, not failed gates or
native holds. **This checkpoint is local integration, not a push/deployment.**
Remote main remains `d3dbb39ed840cd47200e62f8e8d736c281b9e151`.

## Committed source to local integration

| Reviewed source slice | Local commit |
| --- | --- |
| `438a424d..ec282022`: apex, camera clock, hit notice, midpoint turning | `28145f20dbf900c120f2d7dea122644b1a5b6182` |
| `ec282022..3993ef02`: fair combat, reusable rails, six allies | `787d82b36497458c195dbff087e6323ea14893ec` |
| `3993ef02..e22109d4`: arena, objectives, camera motion and audio | `e5b98ad23c7fb8e46241c0a6babb245489d51757` |
| `e22109d4..3778ae1a`: QA confirmation adapter and earned exchanges | `b9135c12162f203ab7ea43be4ab97320376c31e4` |

The last slice includes `9b860c2c` and `afb4f0d8`; neither remains source-only.
Final game tree is exactly source `3778ae1add1e65493884432521d36c0f5e7be782`:
`ebce59f6c52100f3d0354e31e989a683df5d12c3`, **438 files /39,023,250 bytes**.
All44 scoped source/doc paths were reconstructed serially, not a mixed-history
branch merge. Official inventory refresh changes only row240. Main-only manual
notes, three repaired boot JSONs and all foreign game/catalog/portal/backend
bytes are preserved. No model, vendor, font or supplied-original bytes changed.

## Expanded scope: implemented versus still open

| Area | Source now integrated | Not established or still incomplete |
| --- | --- | --- |
| Teammates | Human plus six AI allies versus three foes; bounded perception/preparation, legal objective contribution and roster lifecycle CPU checks | Native clarity, natural full-map navigation/recovery, match balance and teammate feel |
| Combat and travel | Shared physical cover/ramps, NPC windups/rechecks, reusable bidirectional rails and state-safe exits | Actual normal-input rail/combat feel, mobile ergonomics and frame pacing |
| Objectives and arena | Eleven bounded covers, formation bypasses, one legal goal/real HP, depth-tested marker, bearing/blocked-view hint and deduplicated completion cue | Native readability/audibility, natural full-match progression; camps, Mid-Boss and rejuvenator remain incomplete |
| Camera and animation | Camera time consumed once, midpoint turning, render-only travel bob with off/reduced-motion controls, Stampead apex fade | Differentiated supplied animation/model/scenery detail, contact/blending and subjective quality; not forty finished heroes |
| Exchanges | Existing earned souls/base-respawn authority, three800-soul starter choices, review/confirm/cancel and explicit match-only policy | Native shop fit, ordinary pointer/keyboard/touch flow and human balance |

The ordinary roster still has eight definitions. Expansion support remains
18/160 proposed CPU QA slots,142 held, not forty complete playable kits.
No match-save format was added. Existing theme and separate motion/sound choices
remain distinct from match items/souls, which reset on a fresh match.

## Actual verification and evidence boundaries

- **22/22 CPU commands:** worker9 six, worker10 eight, parent eight. Some checks
  reuse nested helpers; this is a command count, not22 independent native cases.
- **35 touched JS syntax checks** and three QA AST parses preserve all87 prior
  assertions. The adapter clicks real purchase confirmation; no browser run.
- Combined production callbacks:163 groups. Both600s API-scripted match chains
  pass in46.994s, with actual19 falls/Patron phases. This is not natural gameplay
  or native FPS. The older ec282100s incomplete run remains incomplete.
- Systems40 groups, fairness8, rails8, bots26, team25, controller1396; arena
  six groups/157,050 samples, world506, objectives7 and completion audio8.
- **444/444 actual local HTTP200/hash/MIME checks**, two negative404s, exact
  pinned Git inputs: all438 game files, three boot JSONs and three fonts.
  Parsed47 entry modules with existing approved esbuild; two existing guarded
  Node-only imports are classified separately. No bundle/runtime file was edited.
  Total39,087,928 entity bytes is an inventory transfer, not initial payload or
  performance savings. Server, thread and port closed. No browser was launched.
- [Normalized CPU records](jank3778-integration-checks.json.gz),
  [parent stdout](jank3778-parent-checks.log.gz),
  [444-file freeze](jank3778-integration-freeze.json),
  [HTTP/module records](jank3778-integration-http.json).
  Original worker logs/JSONs remain unchanged locally; normalized records omit
  private host paths, not assertions, errors or outcomes.

Initial lexical graph collection rejected guarded Node imports and mistook
vendor comments for imports. That approach was abandoned for the installed
parser. Its first parse additionally identified the old guarded UI self-test
Node import; both guard sites were inspected. These are preserved collector
mistakes, not product failures or native passes. Advisor ticket
`pi-675994-1793263864804-085ac9b2` timed out; collection was resolved independently,
without advice being treated as approval.

## Preserved source-only work and native failures

The two dirty native QA files remain45,885+33,289=79,174 bytes against the
unchanged60,000-byte cap,17/18, with original SHA256s. They were neither executed,
staged nor replaced. The source working manual's older27-line D112 draft was
excluded. Subsequent Stampead pose work/tests appeared during this checkpoint.
At closeout the source lane advanced to `4bdc5129` and `8361956f`, with runtime-pose/
compatibility tests and manuals still in progress. Those two newer pose commits
remain **source-only, outside the frozen3778 integration**, not accepted native
animation or a reviewed READY closeout. Healthy art workers were not interrupted
or awaited for the completed gameplay slices.

Prism Warden zero-frame/cleanup failures remain actual failures. Current expanded
Jank native visuals/input/fit/audio/FPS are unaccepted. Citisten native0/5,
shaking/artifacts/Water-Save-Continue and Wings renderer/flight holds remain;
Slipstream's actual Start failure remains. No failure was filtered into PASS.

## Exact release blocker, not missing push authorization

Required `xvfb-run python3 scripts/smoke_test_games.py` is **NOT RUN: preflight
blocked**, not129 passes or an inferred new native failure. Its unchanged launch
uses `--no-sandbox --disable-gpu --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
No currently responsive permitted renderer and fresh exclusive browser admission
were established. Replaying the unchanged failed renderer/bypass routes is
forbidden; an idle process list is not admission. Environment advice ticket
`pi-675994-1793262964603-ca2706d8` confirms no evidenced compliant route, not a waiver.

The unchanged harness also serves the physical worktree. The129 catalog game
roots contain12,798 tracked files/1,992,994,049 bytes; current normal-floor growth
headroom at preflight was329,818,112 bytes. Blanket checkout is unsafe. The scoped
Git-object HTTP proof above avoids copying game/model packs but does not claim
full-fleet harness/browser acceptance. Fleet serving must stay bounded too.

Consequently no push, new deployment or new-served-target claim is made. Fresh
remote readback is d3; canonical Wings/Citisten/Jank entry GETs each returned200
and matched d3, not the local candidate. This is three-entry identity only.
Once the concrete environment/slot/serving prerequisites are available, run the
unchanged release checks, resolve real failures, then push main and verify remote,
deployment and canonical new hashes without asking for push authorization again.

Catalog remains129; maintenance coverage135/129+6 passes. Games added0;
new screenshots0; no installs, asset deletion or debloat implementation.
