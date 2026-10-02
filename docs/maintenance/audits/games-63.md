# Delegation 63: source audit and game manuals

## Scope and evidence

Baseline **8c8a055813b35bbd5d8b632423328333b4252d43**. Actual environment printed `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`. Ownership is the fifteen linked manuals below and this audit only. Runtime/catalog/shared emulator files remain unchanged. Git blobs were inspected through bounded temporary text extraction; no Games materialization, sparse changes, dependency installation, browser server, registration, deletion or push.

Native sessions **0**; new screenshots **0**; full-catalog gate **not run by this worker**. Main owns final integration, subjective UI review and serial release gate. Static syntax does not prove asset closure, gameplay, provenance, save correctness or hardware performance. Source review coverage is explicitly bounded in each Implementation map. Large obfuscated/minified engines, ROM/core/wasm binaries and art were not fully human-reviewed.

Historical evidence was inspected from `docs/GAMES.md`, `docs/wiki/Game-List.md`, `docs/audit_batches/` and catalog-parts source records. Older counts and pass summaries are not current verification. Examples of conflicts: Doge's batch-4 functional summary versus deterministic parse failure; Jetpack Hacked's early hook probe versus r5 boot failure; Doodle Hacked's r7 missed Play sprite versus its known source bounds. GAMES.md's NES/SNES labels for ids 114/115 conflict with their actual GBA filenames/core. These historical files are outside this lease and were not rewritten.

## Manuals and measured inventory

| Id | Manual | Tracked files | Git logical bytes |
|---|---|---:|---:|
| 83 | [Doodle Jump](../games/083-doodlejump.md) | 45 | 4,096,695 |
| 84 | [Chess](../games/084-chess.md) | 24 | 365,048 |
| 86 | [Jetpack Joyride](../games/086-jetpackjoyride.md) | 417 | 16,813,585 |
| 107 | [Jetpack Joyride Hacked](../games/107-jetpackjoyridehacked.md) | 417 | 16,815,820 |
| 87 | [Doge Miner](../games/087-dogeminer.md) | 14 | 4,297,578 |
| 89 | [Retro Bowl Hacked](../games/089-retrobowlhacked.md) | 35 | 5,592,655 |
| 90 | [Cookie Clicker Hacked](../games/090-cookieclickerhacked.md) | 336 | 5,802,253 |
| 94 | [Breakout Hacked](../games/094-breakouthacked.md) | 7 | 41,362 |
| 95 | [Snake Hacked](../games/095-snakehacked.md) | 8 | 346,395 |
| 111 | [Subway Surfers Hacked](../games/111-subwaysurfershacked.md) | 21 | 144,518,418 |
| 109 | [Doodle Jump Hacked](../games/109-doodlejumphacked.md) | 45 | 4,097,860 |
| 114 | [Dr. Mario](../games/114-drmario.md) | 2 | 1,049,276 |
| 115 | [Street Fighter II](../games/115-streetfighter2.md) | 2 | 8,389,317 |
| 116 | [Advance Wars](../games/116-advancewars.md) | 2 | 2,324,207 |
| 117 | [Mario Kart Super Circuit](../games/117-mariokartsupercircuit.md) | 2 | 4,195,058 |

Three largest assigned trees are Subway Surfers Hacked (144,518,418 bytes), Jetpack Joyride Hacked (16,815,820) and Jetpack Joyride (16,813,585). No binary assets were extracted. The fifteen authored pages total **76,336 bytes** before this audit. Shared-filesystem storage delta is not attributed to this worker; start/end `df -h / | tail -1` both reported **2.4G available**, above the 2 GB stop threshold. Exact doc bytes are logical authored size, not allocated disk use.

## Priority findings

Each item is source-backed unless marked historical triage. Reproductions below are **recommended**, not newly run browser checks. All runtime repair is held for Main/owner authorization.

| Priority/severity | Path and matching anchor | Impact / minimal root repair | Reproduction and status |
|---|---|---|---|
| 1 CRITICAL | `Games/SubwaySurfersHacked/subwaysurfers/index.html`, Google tag manager script; `master-loader.js`, SDK insertion | Reachable legacy launch loads external analytics/SDK chain despite guarded catalog entry. Authorize an offline launch boundary after consumer tracing, not size-only deletion. | Direct nested URL with network logging. Static script src confirmed; no native run. |
| 2 HIGH | `Games/DogeMiner/js/main.js`, diagnostic string `(eg <html>, <head>` followed by raw LF | Entire main script fails parsing, leaving static intro and inert controls. Restore verified original damaged literal/source, not a new replacement game. | `git show 8c8a055:Games/DogeMiner/js/main.js | node --check` fails. Deterministic current baseline finding; r5 agrees. |
| 3 HIGH | `Games/CookieClickerHacked/index.html`, Orteil rehosting restriction | Supplied header explicitly prohibits rehosting; readme's opposite claim is not clearance. Owner obtains rights evidence; preserve notices. | Read entry notice and readme. Static rights hold, no legal approval inferred. |
| 4 HIGH | four ROM wrapper `EJS_gameUrl` values, ids 114-117 | No supplied ROM redistribution grant. Emulator licensing is separate. Owner rights decision before release; no delete/replace order. | Compare Git trees/notices and actual filenames. Static evidence gap; binaries unread. |
| 5 HIGH | `Games/Chess/script.js`, `onDrop`, `makeBestMove`, New Game | Pending reply survives reset; terminal search can pass undefined into ugly_move. Own/cancel one timer, validate turn/terminal/missing move in shared reply path. | Reset within 250 ms of e2-e4; make terminal move. Source control-flow finding; no native repro. |
| 6 HIGH | `Games/BreakoutHacked/script.js`, `loop`, touch launch, `resetGame` | Active game can accumulate animation chains on launch/level changes. One cancellable rAF owner fixes all callers. | Tap launch, touch level repeatedly; instrument frame count. Static multi-entry proof. |
| 7 HIGH | `Games/SnakeHacked/game.js`, `generateFood` | Fully occupied board makes random rejection loop infinite. Select from free cells and handle empty explicitly, preserving god mode. | Construct all 400 occupied unique tiles. Static termination finding; no execution of game. |
| 8 HIGH | both Doodle production bundles, `GameState.init`/`ScoresState.init` saved JSON reads | Invalid statistics/score JSON aborts state. Shared validated load boundary with recoverable backup. | Inject invalid DJ_stats/DJ_localTopScores in isolated profile. Static finding. |
| 9 HIGH | `Games/SubwaySurfersHacked/Build/UnityLoader.js`, `parent.showUnitywebNoSupport()` | Error/WebGL-unavailable path itself throws in standalone launch. Provide authored error callback/UI without hiding underlying failure. | Disable WebGL; r7 historical exception agrees. Static callback dependency confirmed. |
| 10 HIGH triage | Jetpack pair `game3.js` startup/asset boundary; Retro `html5game/RetroBowl.js` initialization | Prior Unexpected-token/undefined-length and cpd boot failures unresolved. Identify exact response/stack dependency, repair source-level boundary. | Capture current boot requests/content type and stack. JS parses now; native status unknown. |
| 11 MEDIUM | Cookie `main.js:1553`, `Game.LoadMod` URL guard | Scheme regex can miss browser-normalized leading whitespace; type not validated. Parse resolved URL and permit only intended same-origin local resources. | Validate whitespace HTTPS rejection without fetching. API boundary, not a demonstrated remote exploit. |
| 12 MEDIUM | Snake `#restart-btn` hidden loss overlay; gameOver-only `snakeHighScore` write | God mode makes reset and high-score update unreachable in ordinary play. Expose existing reset and save at an appropriate live boundary. | Play without loss; inspect controls and reload. Static reachability confirmed. |
| 13 MEDIUM | Doodle Hacked `badge.style.cssText` and `applyHacks` intervals | Missing semicolon loses pointer transparency; unowned polling/update timers conceal drift. Repair declaration and timer lifecycle only. | Computed pointer-events/tap-through and timer count. Static finding. |
| 14 MEDIUM | Breakout cooldown/reset/touch anchors | Cooldown can pass zero forever; labeled statements do not reset paddle; scaled touch delta mismatches coordinates. Fix shared state/reset/coordinate boundaries. | Force failed chance at zero; reset with moving/enlarged objects; scaled touch. Static findings. |
| 15 MEDIUM | shared `Games/_emulatorjs/data/loader.js`, `loadScript`/`loadStyle` | Resource load errors never reject promises, leaving blank shell. Main-owned shared onerror and error feedback repair. | Block local runtime resource; applies across ROM wrappers. Static shared boundary. |

Additional per-page findings cover synchronous Chess depth-5 search, draw-label ordering, zoom prohibition, expired instructions, reduced motion, sensor/timer cleanup and guessed SendMessage cheat coverage. Cheats are intentional; none is labeled a security exploit merely for changing local score. Vendor eval/HTML string hits were not automatically reported as XSS. No deletion claim was based on file size or a plain grep miss.

## Actually run checks

Output from bounded source checks:

```text
DogeMiner/js/main.js: FAIL [stdin]:1
DogeMiner/js/plugins.js: PASS
CookieClickerHacked/main.js: PASS
RetroBowlHacked/html5game/RetroBowl.js: PASS
JetpackJoyride/game3.js: PASS
JetpackJoyrideHacked/game3.js: PASS
Chess/script.js: PASS
BreakoutHacked/script.js: PASS
SnakeHacked/game.js: PASS
DoodleJump/js/build/production.min.js: PASS
DoodleJumpHacked/js/build/production.min.js: PASS
PASS: 15 identities, 135 required sections, catalog URLs and relative tracked links; no email/absolute-local-path/em-dash
PASS: 21 inline classic scripts
PASS: 10 selected bootstrap/callee syntax checks
Owned page bytes: 76336
```

The ten extra scripts are shared loader/storage, both Doodle api/main, Retro uph_poki, Subway poki-noop/UnityLoader/nested master-loader. JS was supplied directly from Git through stdin to `node --check`; no game execution occurred. Inline JSON-LD was excluded from JavaScript parsing. Explicit-path `git diff --check` returned no output; final staged check is required at commit. Shared full inventory/manual checker belongs to Main and may remain incomplete while concurrent doc groups land.

Small repeatable manual check, from repository root:

```python
import json
from pathlib import Path
ids = {83, 84, 86, 87, 89, 90, 94, 95, 107, 109, 111, 114, 115, 116, 117}
headings = ['Identity and status', 'Implementation map', 'Gameplay and controls',
            'State and persistence', 'Dependencies and provenance', 'Audit findings',
            'Safe iteration', 'Verification', 'Future outlook']
entries = [g for g in json.loads(Path('games.json').read_text()) if g['id'] in ids]
assert len(entries) == 15
for game in entries:
    pages = list(Path('docs/maintenance/games').glob(f"{game['id']:03d}-*.md"))
    assert len(pages) == 1
    text = pages[0].read_text()
    folder = game['url'].rsplit('/', 1)[0]
    assert f'<!-- maintenance-game: {folder} -->' in text
    assert all(f'## {heading}\n' in text for heading in headings)
print('15 manuals / 135 sections OK')
```

## Refurbishment order and holds

1. Week one: owner/Main resolves rights and source recovery, nested remote launch, deterministic Doge parser blocker and fresh boot triage. No worker release decision.
2. Week two: small authorized timer/turn/reset/save/error-boundary fixes with one executable regression each; then factual controls, keyboard/focus and mobile/reduced-motion shells. Main reviews desktop/mobile screenshots in both portal themes.
3. Week three: native repeated-session/save/device tests and real-hardware load/input/memory profiling, especially Unity and obfuscated Jetpack builds. Duplicate Subway assets need constructed-path consumer evidence before any cleanup proposal.
4. Week four: reassess high-value maintenance and source-first 3D research, not guaranteed new games or self-made replacements. New ports require separate source/license/asset evidence and actual play proof; no new assets/dependencies authorized here.

Known holds: runtime repairs unassigned, commercial/ROM rights unresolved, unread vendor/binary internals, zero fresh native/gameplay/screenshots, and Main's full unchanged smoke/release gate pending. The current catalog has 115 entries; historical 120 counts do not imply deletion or permission to register the five unregistered games. This group documents fifteen registered existing games and adds **zero games**.
