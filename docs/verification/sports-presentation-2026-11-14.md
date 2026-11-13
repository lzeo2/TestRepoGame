# Sports presentation verification, 14 November 2026

Owner order: correct Basketballer scale, ball follow/zoom, player variety,
referee/whistle and visible upgradeable stadiums in Basketballer246/Footballer227.
No new game or catalog entry; catalog remains134, source projects140.

## Inspected implementation

Source milestone `72f7e2a3`, progression regression `b3e0d55f`, preceded by the
six disjoint swarm module commits recorded in Git. Court-local feet share one
94-by-50 contract across simulation/metadata/presentation, with human adult
heights and .4-foot ball radius. Camera target and position smooth independently;
full court/venue fitting is aspect-aware and zoom is bounded .65–1.8. Generic
appearance traits are independent. Referee stays on the apron and observes events.
Whistle is short breath/noise plus stable tones, distinct from the buzzer.

Both sports show saved tiers0–3: basic ground, bleachers/benches, expanded
stands/live score, then lights/canopies/entrance. Build UI exposes actual cost and
recruit gates and updates eligibility without replacing focused controls.
Game remains purchase/save authority. Football field/match/actor rules and both
save namespaces are preserved; ordinary basketball plot records are retained.

## Fresh results

Eight Basketballer Node suites pass: game, match, actors, camera, officiating,
stadium, world and fixture. Footballer game/stadium/world pass. The additional
both-sport stadium authority check passes every tier, exact cost, five rejection
gates without mutation, maximum level, save/reload and storage isolation.
Actual-app boot/UI boundary passes with 59 bounded callbacks using
`node --experimental-vm-modules scripts/check_basketball_boot.mjs`. The initial
attempt without that required flag failed with `vm.SyntheticModule` unavailable;
the corrected invocation passed. Authored JS syntax and diff checks pass.
Boundary doubles do not establish native rendering.

`scripts/test_sports_presentation.py` completed **43/43 PASS in204.25seconds**.
The raw [browser receipt](sports-presentation-browser-2026-11-14.json) retains
all observations and unfiltered collectors. Actual desktop1280x720/light and
phone390x844/dark PLAY, affordable signing, cameras/clamps/orbit, ten varied
athletes and visible official pass. A normal unseeded full match ended **6:8**
in Q4. Game awarded **65coins**, retained with roster through actual save/reload.
Match's estimated reward81 is separately retained; it did not award the wallet.
No clocks were shortened and no cash/roster/match state was granted.

Both actual upgrade panels show tier0 requirements and disabled unaffordable
purchase, with no coin loss and working VIEW VENUE. Separate World-only
**VisualFixture** tier0/3 captures show both games' upgrade geometry. These
explicit fixtures instantiate no Game and establish no naturally earned purchase.
Actual Game purchases for all tiers are covered by the detached authority suite.

Basketball venue budgets by tier:7/9/12/14draws and2970/3258/4110/4314triangles.
Football new tier presentation max4draws/1682triangles. Referee is outside play;
sampled ten athlete heights6.093–7.088feet within the5.7–7.1contract.
Offline generated whistle WAV is nonzero/unclipped: RMS0.0093479, peak0.0445624.
This is an offline waveform check; native audition remains unverified.

Zero page exceptions, console errors, HTTP failures, failed requests or external
runtime requests. Four software ReadPixels warnings remain in the raw log.
Browser and temporary server closed in finally. Captures/WAV remain outside Git
in the task's sports preview directory. Root reviewed actual court, athlete,
referee, portrait and both stadium-tier frames.

## Limits and reproducibility

Software WebGL used system Chromium with no-sandbox, disable-dev-shm-usage,
enable-unsafe-swiftshader and ignore-gpu-blocklist. This does not establish native
sandbox or Intel N100/8GB frame rate. The prior123/133fleet result remains a
separate held historical gate with ten unrelated certificate failures; these
focused checks do not erase it. Owner explicitly authorized merging completed PRs.
No new packages, remote runtime assets, protected-game edits or proxy changes.

Reproduce pure checks using the updated local basketball development skill and
`node scripts/check_sports_stadium_progression.mjs`. The bounded browser command
is `python3 -B scripts/test_sports_presentation.py --artifacts <external-directory>`.
Do not use fixture tiers as earned gameplay evidence.

| Source | SHA256 |
| --- | --- |
| `Games/StealBasketballer/js/app.js` | `2d416e7d45574c5275ce722a2d95666d02d8f40e29003a4e07b87fd9fc725800` |
| `Games/StealBasketballer/js/world.js` | `08e3a108d4c56bc46ffd380f95ce21769b803468a2948a8fda99e8d0684f2c91` |
| `Games/StealBasketballer/js/match.js` | `0ccdda0707a7bef61440ae149c3ce36cff9ca383a411228ebf73ae516e1aa3e9` |
| `Games/StealBasketballer/data/world.json` | `90c7a1f6c4bdcc786a7635c0a86f02c00f54f1198302a43deea7b8a2c811f8b5` |
| `Games/StealFootballer/js/world.js` | `a6d581d983a2f553a2bc63ee2194db0e63fb14fe23806b0bbbb7fafae6ed58ad` |
| `Games/StealFootballer/js/app.js` | `e5dede28a62f8449eefdec6082de64f0373ac9ec1bbd335f2e361779543f0463` |
