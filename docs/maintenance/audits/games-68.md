# Delegation 68: source audit and maintenance handoff

## Scope and evidence

Provider/model actually printed: `PI_PROVIDER=openai-codex`, `PI_MODEL=gpt-6.1-sol`.
Source baseline: `8c8a055813b35bbd5d8b632423328333b4252d43`.
Owned output: twelve individual game manuals and this audit only. Runtime,
catalog, licenses, protected paths, sparse selection and publication were unchanged.
This group covers eight registered games and four unregistered directories;
115 current catalog entries is a repository fact, not this worker's test count.

Git blobs were read without materializing Games. Small HTML/JS/CSS/data/notices
were human-read. Duck Hunt's 599,042-byte bundle was reviewed only at loader,
renderer, query/audio and final controller boundaries. Balatro's 5,061,324-byte
ROM and core binaries were not reviewed; its 295,773-byte shared emulator was
sampled at settings/core/storage boundaries. Minified jQuery implementations and
numeric Sprig font data were not fully human-reviewed. A complete wrapper read
is not a complete engine audit. No upstream downloads/comparisons were made.

Historical `docs/audit_batches/playtest_p1a.md` describes replaced implementations
for Asteroids, Frogger, Missile Command, Lunar Lander and Space Invaders; its
reported HUD/Menu/fuel elements do not exist in this baseline. The historical
catalog-part source documents and wiki/GAMES notes were consulted, not rewritten.
`docs/ports-hextris.md` retains its earlier WONTFIX disposition; its speculative
id 223 is now occupied. Tag Relay's earlier evidence remains independently dated.

## Priority findings

All statuses below are **static only, runtime unchanged**. Repro steps are
recommended native checks, not commands already run. Detailed root fixes and
coverage limits appear in the linked manuals.

| Priority / severity | Source path and matching anchor | Impact and minimal root fix | Recommended repro |
| --- | --- | --- | --- |
| 1 / CRITICAL policy | `Games/MissileCommand/missile_command.js`, header `@contact` | Inherited personal metadata violates repository rules. Value withheld; Main/security owner decides minimal redaction while preserving author attribution. | Read only the identified header through a redacting accessor; do not print contact values. |
| 2 / HIGH | `Games/DuckHunt/duckhunt.js`, `i.u=t=>t+".js"`, browser `i.e(859)/i.e(384)`, renderer `i.e(369)/i.e(132)` | Missing chunks and comment-only local stubs cannot register required webpack modules. Obtain matching legitimately licensed build closure; no remote fallback or fake success stubs. | Boot with request/pageerror recording and renderer-path checks. |
| 3 / HIGH | `Games/MissileCommand/missile_command.js`, `_gameLoop`, `_level += 1` | Final wave advances past the table before same-tick dereference. End/return immediately when no next wave exists. | Complete wave index 39, verify win and restart without TypeError. |
| 4 / HIGH | `Games/Frogger/engine.js`, `Game.setupInput`, `event.keyCode` | Handlers ignore their supplied event and rely on ambient window.event. Use `e` in both handlers. | Arrow input in a browser without ambient event support. |
| 5 / HIGH | `Games/SpaceInvaders/javascripts/Game.js`, interval `launchEnemyRocket()` before `checkEndGame()` | Last enemy deletion can leave empty rows before random enemy fire. End-check/guard once at the shared boundary. | Kill last enemy on its scheduled fire tick. |
| 6 / HIGH | `Games/Hextris/js/main.js`, `JSONfn.parse(saveState)`; `vendor/jsonfn.min.js`, function-prefix eval | Persisted same-origin save content revives executable functions. Not a demonstrated remote XSS exploit. Use validated data-only saves and reconstruct instances with nonexecuting migration. | Malformed/hostile-shaped save fixtures in an isolated browser profile; no production save destruction. |
| 7 / HIGH | `Games/2048/js/local_storage_manager.js`, `getGameState`; `Games/QWOP/index.html`, `qwop_best`; Hextris persistence | Corrupt/denied storage can break boot; generic save keys can collide. Guard/validate once per storage boundary and trace legacy consumers before namespace migration. | Corrupt JSON/shape/nonnumeric best and denied-storage startup. |
| 8 / HIGH | `Games/LunarLander/lunar-lander.js`, `Player.collision`, `removeBody` | Crash removes player without reachable outcome/replay; loop continues. Add reset/outcome to existing lifecycle owner, not another Game loop. | Crash, then replay without browser reload. |
| 9 / HIGH evidence hold | `Games/Balatro/CREDITS.md`, MIT ROM claim | No local LICENSE/full demake pin/full digest. Reconcile source/art/ROM terms with owner; neither claim clearance nor delete. | Evidence collection, then ROM play/save checks only under Main's lease. |
| 10 / HIGH evidence hold | `Games/Asteroids/vector_battle_regular.typeface.js`, `original_font_information` | Distinct font copyright, blank license fields and contact metadata. Values withheld; reconcile terms/redaction through Main. | Review metadata with contacts redacted and retain required attribution. |
| 11 / MEDIUM | `Games/DuckHunt/duckhunt.js`, `openLevelCreator`, `/creator.html` | Navigation targets an untracked root editor. Disable absent affordance or source-vendor only with approval. | C and creator link. |
| 12 / MEDIUM | `Games/Tag Relay/script.js`, pagehide cleanup without pageshow recovery | Persisted page-cache restoration may return a dead board with hidden menu. Confirm then reset ready state on persisted pageshow. | Start, navigate away, Back with persisted cache. |
| 13 / MEDIUM | Shared `Games/_emulatorjs/data/loader.js` load promises and `storage.js` error handlers | Dependency failures and IndexedDB open failures may never settle promises. Central owner must repair error paths, including build source. | Abort dependency / deny IndexedDB and verify visible bounded failure. |

Additional per-game findings cover touch coordinate conversion, native-button
activation, stuck-key release, resize/zoom, rocket vectors, deletion indexing,
per-wave pause accounting and executable-save migration. Do not treat intentional
Tag Relay map repeats, bounded tune-handle retention, unused classic difficulty
fields or informational URLs as security vulnerabilities.

## Manuals

- [215 Asteroids](../games/215-asteroids.md)
- [216 Frogger](../games/216-frogger.md)
- [217 Missile Command](../games/217-missilecommand.md)
- [218 Lunar Lander](../games/218-lunarlander.md)
- [219 Space Invaders](../games/219-spaceinvaders.md)
- [220 Duck Hunt](../games/220-duckhunt.md)
- [221 Balatro](../games/221-balatro.md)
- [223 Tag Relay](../games/223-tag-relay.md)
- [Unregistered 2048](../games/unregistered-2048.md)
- [Unregistered Hextris](../games/unregistered-hextris.md)
- [Unregistered QWOP](../games/unregistered-qwop.md)
- [Unregistered Slope](../games/unregistered-slope.md)

## Actual verification and limits

- Owned documentation assertion: **`12 identities / 108 headings / 12 source-coverage declarations PASS`**. All per-page Markdown links resolve through local files or baseline Git; privacy/path/copy checks passed. Whitespace check: **`13 documentation files whitespace check PASS`**. Output logical size: **76,873 bytes before this verification-note update**.
- Largest three assigned trees: Balatro **3 files / 5,062,742 bytes**; Duck Hunt **11 / 2,023,491**; Space Invaders **15 / 577,745**. These are immutable-source inventory sizes, not workspace materialization.
- Git-blob STDIN syntax batch: **`SYNTAX_PASS 61 FAIL 0`**, covering all assigned
  `.js` files and nonempty inline entry scripts; Tag Relay parsed as ESM.
- Git existence checks: Duck Hunt `859.js`/`384.js` and root `creator.html` absent;
  shared emulator minified JS/CSS and mGBA data file present. Two Duck stubs were
  read, not accepted as functioning modules.
- No game dependency install, source modification, browser server, screenshots,
  native interaction or full smoke run. **Native checks: 0; full-gate passes: 0
  attempted by this worker.** Main owns the unchanged serial full catalog gate.
- Starting and final free space were reported as 2.4G; source scratch and authored
  docs stayed far below the 30MB workspace-growth allowance. Shared filesystem
  deltas are not attributable exclusively to this worker.

The following small runnable documentation check is intentionally independent
of engine correctness. Run from repository root; it checks only this lease:

```bash
python3 -B - <<'PY'
from pathlib import Path
pairs = {
    '215-asteroids': 'Asteroids', '216-frogger': 'Frogger',
    '217-missilecommand': 'MissileCommand', '218-lunarlander': 'LunarLander',
    '219-spaceinvaders': 'SpaceInvaders', '220-duckhunt': 'DuckHunt',
    '221-balatro': 'Balatro', '223-tag-relay': 'Tag Relay',
    'unregistered-2048': '2048', 'unregistered-hextris': 'Hextris',
    'unregistered-qwop': 'QWOP', 'unregistered-slope': 'Slope',
}
headings = ['Identity and status', 'Implementation map', 'Gameplay and controls',
            'State and persistence', 'Dependencies and provenance', 'Audit findings',
            'Safe iteration', 'Verification', 'Future outlook']
for slug, directory in pairs.items():
    text = Path('docs/maintenance/games', slug + '.md').read_text()
    assert f'<!-- maintenance-game: Games/{directory} -->' in text, slug
    for heading in headings:
        assert text.count('## ' + heading + '\n') == 1, (slug, heading)
    assert 'Source review coverage:' in text, slug
print('12 identities / 108 headings / 12 source-coverage declarations PASS')
PY
```

## Month handoff, not ongoing automation

Week 1 prioritizes rights/source closure, contact-policy escalation, missing
chunks, final-state crashes and persistence recovery. Week 2 targets bounded
input/lifecycle/accessibility fixes with actual desktop/mobile review. Week 3
can consider save migration/timing only after native regressions establish the
existing rules. Week 4 measures target hardware startup/play/save and reviews
release evidence. These are plans, not promises of background work or permission
to invent/register replacements. Main owns design, prose integration, source
inventory, subjective screenshots, full-gate disposition and any publication.

Contact-policy escalation ticket: `pi-1257971-1790906966780`; no contact values
were repeated in documentation. No new games were added, ingested or self-made.
Shared dirty paths from other workers are outside this lease and must not be
staged, reverted or described as a clean repository by this worker.
