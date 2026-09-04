# PLAN.md — TestRepoGame Overhaul: Game Roadmap + Platform Plan

Author: game-planning/research worker. Scope: research + planning only. Every recommendation below was checked against the actual repo (portal-ux.js, index.html, games.json, git tree of Games/, docs/). Sections follow TASK-PLANNING.md.

---

## 1. Current state assessment

### Platform
- Static site; repo root is deployed as-is (Netlify `publish="."`, mirror on GitHub Pages). No build step, no node_modules.
- Portal = minified React bundle (`assets/index-CRWHmtoy.js`, 329 KB, no source) + minified CSS + a ~700-line inline `<style>` override block in `index.html` + `assets/portal-ux.js` (authored vanilla-JS enhancement layer, 862 lines). Per AGENTS.md "Direction A", all polish goes through the CSS override layer + portal-ux.js; the bundle is never rebuilt.
- `games.json` = runtime catalog, single source of truth. 92 entries. Schema: `{id, title, cat, icon, desc, url, featured, tags[]}`. `tags` currently only ever contains `"hacked"`.
- `assets/game-save.js` = shared localStorage save helper available to games (few use it).
- QA gate: `scripts/smoke_test_games.py` (Playwright; console errors + failed/4xx requests per game). NOTE: Games/ is NOT checked out on the Pi (sparse checkout: only assets/docs/netlify/scripts/uv). The smoke gate and the §7 URL check require `git sparse-checkout add Games/<Name>` per game or a full checkout elsewhere; on this Pi, run the gate only against checked-out games.

### Catalog coverage (92 entries, counted from games.json)
| Category | Count | Notes |
|---|---|---|
| classic | 25 | includes 8 "hacked" + 6 Pokemon (4 base + 2... actually 4 base + 4 hacked = 8 Pokemon entries) |
| action | 22 | heavy on big Unity/Flash/Ruffle ports |
| strategy | 9 | |
| puzzle | 9 | |
| sports | 8 | |
| arcade + "Arcade" | 4 + 2 | casing split — see data bugs |
| story | 4 | |
| riddle | 3 | includes "Typing Speed" (miscategorized) |
| idle | 3 | |
| word | 1 | |
| simulation | 1 | |
| **multiplayer** | **1** | only House of Hazards |

### Local-multiplayer reality check
Games that actually support 2+ players on one keyboard (from docs/GAMES.md + index.html greps): Paddle Duel (2P), Thumb Fighter (2P), Gladihoppers (2P), Grid Heist (2–4 hotseat), Last Lantern (2–4), Queue Escape (1–4 co-op), House of Hazards (2–4), Connect Four (2P), Tic Tac Toe (2P). The three "Random" sports games are Construct 3 exports of a famously 2P series but their 2P bindings are unverified in our builds. So ~9–12 of 92 games are multiplayer-capable, yet only 1 carries `cat:"multiplayer"` and there is no tag/filter for 2P. **This is the single biggest catalog gap** and matches the owner's top gameplay priority.

### games.json data bugs (verified by parse)
1. **Duplicate entries:** "Subway Surfers" appears twice (ids 50 and 110, identical URL `Games/SubwaySurfers/index.html`); "Doodle Jump" twice (ids 83 and 108, identical URL). Portal renders duplicate cards.
2. **Category casing:** `arcade` (ids 110, 111, 108, 109) vs `Arcade` (ids 112, 113) — splits one category into two filter pills.
3. **Schema violations:** ids 108, 110, 112 lack the `tags` key entirely; several entries use emoji in `icon` while the design system forbids emojis in UI (portal-ux.js masks this by injecting SVG icons, but the raw data is inconsistent).
4. **Stale docs:** `docs/GAMES.md` claims "42 registered games" and still lists Hextris (12), Flappy Bird (13), and Age of War (2) as remote-dependent iframes/CDN — all three have since been rewritten as self-contained offline canvas games (verified: their index.html files are original offline builds titled "// Offline"). Doc drift will mislead workers.

### Portal strengths (from code)
- Strong a11y backbone already in portal-ux.js: skip link, focus trap + restore, keyboard grid navigation (arrows/Home/End/Enter), ARIA dialog semantics, `aria-keyshortcuts`, reduced-motion media queries, ≥44px targets, safe-area insets.
- SVG icon system: ~50 per-game icons + 9 category fallback icons, injected into `.game-card__icon`.
- Debounced search replay (180 ms), category-change transition, modal loading spinner + error state, theme toggle (dark/light, localStorage + prefers-color-scheme), random-game button, `safeGamePath` traversal guard, tag-badge CSS already authored (`.game-card__tag--hacked` red).

### Portal weaknesses (verified in code)
1. **BUG — tag badge system is dead:** `injectTagBadges()` and its `ready(...)` bootstrap live OUTSIDE the portal-ux IIFE (IIFE closes at line 788; the block starts at 789) but call IIFE-local helpers `$$`, `textOf`, `ready` (defined lines 8–23). Result: an uncaught `ReferenceError` on every portal page load and tag badges never render. The minified bundle has zero tag support (grep: `game-card__tag` = 0 hits in bundle JS and bundle CSS). Fix = move the block inside the IIFE and reuse the existing `fetchGames()` cache (it currently fetches games.json a second time).
2. **Modal is unreachable dead code:** `initCardNewTab()` installs a capture-phase document click listener that calls `stopImmediatePropagation()` on every `.game-card` click, and the keyboard Enter path also calls `openCard()` → `window.open`. The bundle's modal (backdrop, loading state, focus trap, "Open in new tab" link) never opens in normal use. Either kill the modal code or — better — repurpose that UX slot for a game-detail panel (§4/§5).
3. **Popup risk on school Chromebooks:** all game launches go through `window.open(url, '_blank')`. Managed policies can block popups; there is no fallback (should fall back to same-tab navigation when `window.open` returns null).
4. **CSS override layer is contradictory:** two competing `.game-card:hover` rules (§6 lift+glow vs later flat lift-only), two `prefers-reduced-motion` blocks, duplicate `.random-game-btn` and `.game-modal__backdrop` definitions, `!important` specificity wars throughout the ~700-line inline block in index.html. Hard to safely extend.
5. **Off-palette accents vs design system:** current accent is purple/violet (`#7c6aef`, `#9086c4`, `#b8b0cc`, spinner fallback `#c084fc`); design system mandates cyan/teal accent. Sports badge is green (`#059669`) — violates the "no green" rule. Featured badge uses a `★` text glyph (borderline emoji-rule; make it SVG).
6. **Duplicate network work:** bundle fetches games.json, portal-ux fetches it (`fetchGames`, cached), `injectTagBadges` fetches it again uncached.
7. **No discovery features:** no player-count info, no tag filtering, no recently-played, no per-game instructions; search matches only what the bundle matches (title/desc), not tags.
8. **Chromebook input audit gap:** Last Lantern binds P4 to Numpad 8456+0 — school Chromebooks have no numpad.

---

## 2. Candidate games (25 proposed, ranked)

Ranking criteria, weighted by the brief: 2P-on-one-keyboard value > offline/Chromebook safety > replayability > variety coverage > implementation cost. Difficulty 1 = trivial, 5 = hard. All candidates are original code, single-directory, canvas/DOM + keyboard, zero network, zero privileged APIs.

### Ranked table

| # | Name | Genre | Players | Diff | Collision check |
|---|---|---|---|---|---|
| 1 | **Reaction Duel** ★ | reaction/versus | 2P (1P vs timer) | 1 | none (Whack-a-Mole is single-player whack, not duel) |
| 2 | **Cycle Duel** ★ | versus arcade (light-cycle) | 2P + AI | 2 | Snake (9) is solo growth; this is elimination duel |
| 3 | **Freeze Tag Arena** ★ | tag/chase | 2P + AI bots | 3 | Last Lantern (37) is survival, no tag-swap loop |
| 4 | **Hoop Duel** ★ | sports (basketball) | 2P | 3 | Basket Random (5) is ragdoll chaos; this is skill shootout |
| 5 | **Tank Duel Arena** ★ | versus shooter | 2P + AI | 3 | FPS (24)/Boss Rush (35) are 1P; top-down duel distinct |
| 6 | **Air Hockey Duel** ★ | sports/arcade | 2P | 2 | Paddle Duel (17)/Pong (68) are 1D paddles; this is 2D mallets |
| 7 | **Quiz Clash** ★ | trivia buzz-in | 2P + 1P | 3 | Math Quiz (76) is solo arithmetic only |
| 8 | **Lemonade Stand** ★ | sim/management | 1P (hotseat compare) | 2 | BitLife/Pizzeria/clickers are different loops |
| 9 | **Twin Temple** ★ | co-op split-control platformer | 2P co-op | 4 | Queue Escape (42) co-op is management, not platforming |
| 10 | **Bomber Arena** ★ | versus grid arena | 2P + AI | 4 | Grid Heist (36) is territory claim, no bombs |
| 11 | Stack Tower | timing/arcade | 1P | 2 | none (Drift Boss is steering, not stacking) |
| 12 | Checkers | turn-based board | 2P + AI | 3 | Chess (84)/Connect Four (71) exist; checkers absent |
| 13 | Ultimate Tic-Tac-Toe | turn-based board | 2P | 2 | Tic Tac Toe (70) — this is the 9-board meta variant |
| 14 | Code Crack | logic puzzle | 1P | 1 | Wordle (82) guesses words; this guesses color codes |
| 15 | Sumo Ring | physics push duel | 2P | 2 | Thumb Fighter (85) is quick-time, not movement physics |
| 16 | Bow Duel | turn-based artillery | 2P | 2 | none (projectile-aim absent from catalog) |
| 17 | Anagram Attack | word race | 2P hotseat + 1P | 3 | Letter Boxed (31)/Wordle (82) — race format distinct |
| 18 | Disc Flip | turn-based board (Reversi-like) | 2P + AI | 3 | none (avoid the trademarked name) |
| 19 | Putt Duel | sports (mini-golf) | 2P turn-based | 3 | none |
| 20 | Dots and Boxes | turn-based territory | 2P + AI | 2 | none |
| 21 | Dice Duel | push-your-luck dice | 2P hotseat + AI | 2 | none |
| 22 | Rock Blaster | arcade shooter (Asteroids-like) | 1P | 3 | Boss Rush is twin-stick waves; momentum physics distinct |
| 23 | Battleship | turn-based strategy | 2P hotseat + AI | 3 | none |
| 24 | Type Duel | typing race | 2P turn-based | 2 | Typing Speed (75) is solo 30s test |
| 25 | Solitaire (Klondike) | card | 1P | 3 | none (Memory/Match Flip are the only card games) |

★ = top-10 picks (one-line justification each, below).

**Top-10 justifications:**
1. **Reaction Duel** — pure 2P-on-one-keyboard party game, ~200 lines, impossible to get wrong, huge classroom appeal.
2. **Cycle Duel** — iconic versus mechanic, cheap to build well, AI mode gives 1P value too.
3. **Freeze Tag Arena** — directly fills the owner's "random tag" request with a real chase loop and role swaps.
4. **Hoop Duel** — owner explicitly named 2-player basketball; skill-based shootout complements (not duplicates) Basket Random.
5. **Tank Duel Arena** — highest "one more round" factor per effort; ricochet shots make it genuinely competitive.
6. **Air Hockey Duel** — simplest possible physics that still feels great; fills sports with a true simultaneous 2P game.
7. **Quiz Clash** — only social/knowledge game with buzz-in tension; content is original questions (copyright-safe).
8. **Lemonade Stand** — the catalog has zero economy-sim; low cost, high replay via RNG weather/pricing decisions.
9. **Twin Temple** — the only *cooperative* platformer candidate; split-control co-op is exactly the "two people, one keyboard" brief.
10. **Bomber Arena** — the definitive couch-versus genre; biggest build on the list but the payoff is a flagship multiplayer title.

### Per-game detail

Standard 2P key convention for ALL new versus games (prevents conflicts, document in every start screen): **P1 = W/A/S/D move + F action; P2 = Arrow keys move + `.` (period) action** unless noted. Avoid Space/Enter as in-match keys (start/restart only), avoid numpads (Chromebooks lack them), avoid browser-reserved combos. Where a 1P mode exists, AI difficulty Easy/Normal/Hard.

---

**1. Reaction Duel** — two players wait for the signal (color flip / shape appears), first to hit their key wins the round; false start forfeits the round. Best of 9.
- Why: the simplest possible genuinely competitive 2P game; zero assets; perfect for classrooms.
- Difficulty: 1. Chromebook: perfect (DOM + timers only). Offline: yes, no caveat.
- Players: 2P on one keyboard (P1 = `A`, P2 = `L` — far apart); 1P mode = reaction-time leaderboard vs self.
- Scoring: first to 5 rounds; reaction ms shown each round; session best in localStorage via GameSave.
- Replayability: high (RNG delay 1–4 s, fake-out signals in "Tricky" mode).
- Tech: DOM/CSS only, no canvas needed. Performance: negligible.
- A11y: large high-contrast stage, text + color dual coding (never color alone), keyboard-only complete.
- Chromebook risks: none.

**2. Cycle Duel** — two light-cycles leave solid trails on a grid; last rider alive wins the round; walls wrap off; speed option.
- Why: proven versus design, trivially offline, one canvas.
- Difficulty: 2. Chromebook: perfect. Offline: yes.
- Players: 2P (P1 WASD, P2 arrows) + 1P vs AI (simple wall-avoidance heuristic).
- Scoring: first to 5 rounds; round timer; sudden-death grid shrink after 45 s.
- Replayability: high; options: grid size, speed, obstacles on/off.
- Tech: canvas 2D, fixed-timestep grid updates at 10–14 Hz (trivial CPU). A11y: distinct trail colors + P1/P2 labels, pause key.
- Chromebook risks: key-rollover on cheap keyboards (WASD+arrows are on separate matrices in practice; document "if a key sticks, tap it again").

**3. Freeze Tag Arena** — top-down arena; one player is "IT" (glowing); tagging swaps roles; you score 1 pt/second while NOT it; obstacles + dash with cooldown; 90 s match.
- Why: directly answers the brief's "random tag" example; chase games are the most replayable local-versus genre.
- Difficulty: 3 (AI bot for 1P needs pathing-around-obstacle heuristics — greedy steering + wall slide is enough).
- Chromebook: good (canvas, <60 entities). Offline: yes.
- Players: 2P (P1 WASD+F dash, P2 arrows+`.` dash) + 1P vs bot.
- Scoring: points for time-not-it + tag bonus; win screen with stat breakdown.
- Replayability: 3 arena layouts, random IT start, dash-cooldown modifier.
- Tech: canvas 2D, circle collision. Performance: trivial. A11y: IT indicated by icon + color (not color alone), dash = single key.
- Chromebook risks: none beyond rollover.

**4. Hoop Duel** — skill-based 2P basketball shootout: move along the arc, press-hold-release to set shot power/arc; first to 11 or most in 2 min; steal/block when defending.
- Why: owner explicitly asked for 2-player basketball; Basket Random is chaos-physics, this is skill — complementary, not duplicate.
- Difficulty: 3 (projectile arc + rim/backboard collision + steal timing windows).
- Chromebook: good. Offline: yes.
- Players: 2P (P1 WASD + F shoot/steal, P2 arrows + `.`).
- Scoring: 2s and (if behind arc) 3s; match to 11.
- Replayability: moving-hoop mode, wind modifier, best-of-3 sets.
- Tech: canvas 2D, simple ballistic physics. A11y: shot meter has numeric readout.
- Chromebook risks: none.

**5. Tank Duel Arena** — top-down tanks in a walled arena; shells ricochet once off walls; 3 hits = destroyed; destructible crates drop pickups (shield, double-shot); best of 7 rounds.
- Why: ricochet creates skill depth; reads instantly; hugely competitive.
- Difficulty: 3 (ricochet math + destructible grid + AI).
- Chromebook: good. Offline: yes.
- Players: 2P (P1 WASD + F fire, P2 arrows + `.`) + 1P vs AI.
- Scoring: rounds won; hit accuracy shown.
- Replayability: 3 arenas, pickup frequency option, sudden-death shrink.
- Tech: canvas 2D. A11y: tanks differ in shape AND color. Chromebook risks: none.

**6. Air Hockey Duel** — free 2D mallet movement on your half; first to 7; puck accelerates on mallet hits.
- Why: the missing simultaneous-2P sports game; 30-second onboarding.
- Difficulty: 2 (circle collision + friction + goal detection).
- Chromebook: perfect. Offline: yes.
- Players: 2P (P1 WASD, P2 arrows); 1P vs AI (defensive heuristic).
- Scoring: first to 7, match timer, save/shutout stats.
- Replayability: puck-speed and goal-size options. Tech: canvas 2D, negligible CPU.
- A11y: goal flash + score readout, no color-only info. Chromebook risks: none.

**7. Quiz Clash** — 2P buzz-in trivia: question appears, first to buzz (P1 `A`, P2 `L`) answers from 4 options within 5 s; right = +points, wrong = opponent gets a steal. 1P = solo streak mode.
- Why: social, knowledge-based, and the catalog has nothing like it; works great on one keyboard.
- Difficulty: 3 — code is a 2; the real work is authoring ~150 original questions (must be written, not scraped — copyright constraint) across school-friendly categories.
- Chromebook: perfect (DOM). Offline: yes (question bank vendored JSON ~60 KB).
- Scoring: points scale with speed; streak bonus; category breakdown at end.
- Replayability: category packs, random draw without repeat per session.
- Tech: DOM. A11y: full keyboard, generous timings, no color-only feedback.
- Chromebook risks: none. Risk = content quality; needs a review pass.

**8. Lemonade Stand** — classic economics sim: each day check weather forecast, buy cups/lemons/sugar/ice, set price and recipe, watch sales simulate; 7/14/30-day games; profit goal.
- Why: fills the sim/management gap with a thinking game, not a clicker.
- Difficulty: 2 (state machine + demand model). Chromebook: perfect (DOM). Offline: yes.
- Players: 1P; optional hotseat "rival stands" comparing final profit.
- Scoring: final cash vs goal; day-by-day chart (canvas sparkline).
- Replayability: RNG weather/events; three difficulty economies.
- Tech: DOM + tiny canvas chart; saves via GameSave. A11y: all decisions keyboard-operable, numbers in text.
- Chromebook risks: none.

**9. Twin Temple** — cooperative split-control platformer: two explorers (one cyan, one amber) must BOTH reach their exits; color-matched hazards kill only that player; switches, moving platforms, gem bonuses; 8–10 hand-built levels.
- Why: the only true co-op platformer candidate; "two kids, one Chromebook, same team" is the brief's core scenario.
- Difficulty: 4 (tile platformer physics ×2 characters + level design; the level editor is just JSON arrays).
- Chromebook: good (tile canvas, fixed timestep). Offline: yes.
- Players: 2P co-op (P1 WASD, P2 arrows); 1P mode = swap key `Tab` between characters.
- Scoring: per-level time + gems; level-select with star ratings (GameSave).
- Replayability: time medals; hardest levels optional.
- Tech: canvas 2D tile engine (~600 lines). A11y: characters differ in silhouette + label, not just color.
- Chromebook risks: simultaneous 4–6 key rollover — mitigate with jump-on-keypress buffering.

**10. Bomber Arena** — grid arena, drop bombs with timed cross-shaped blasts, soft blocks crumble revealing power-ups (blast+, bomb+, speed), last bomber standing; best of 5.
- Why: the definitive local-versus genre; instant classic for the multiplayer category.
- Difficulty: 4 (bomb propagation, chain reactions, power-up tables, 2 AI personalities for 1P).
- Chromebook: good (grid canvas). Offline: yes.
- Players: 2P (P1 WASD + F bomb, P2 arrows + `.`) + 1P vs 1–3 AI.
- Scoring: rounds, KOs, blocks destroyed.
- Replayability: random soft-block layout each round; 3 arena shapes.
- Tech: canvas 2D grid. A11y: distinct player glyphs. Chromebook risks: none.
- Copyright: mechanic is generic; all code/art original; name it "Bomber Arena", no borrowed assets.

**11. Stack Tower** — a block slides back and forth; tap to drop; overhang is sliced off; miss = game over; speed rises each floor.
- Why: one-button timing game with a perfect skill curve; fills "quick 1P arcade" between classes.
- Difficulty: 2. Chromebook: perfect. Offline: yes. Players: 1P (Space/click/tap).
- Scoring: height + perfect-drop combo multiplier; GameSave best.
- Replayability: endless, combo chase. Tech: canvas 2D. A11y: one input, large targets.
- Chromebook risks: none.

**12. Checkers** — 8×8 draughts with forced captures, multi-jumps, kinging; 2P hotseat + 3-level AI (random / greedy / 2-ply minimax).
- Why: the obvious missing board game; school-appropriate; deep.
- Difficulty: 3 (move generation with forced-jump rule is the only tricky part).
- Chromebook: perfect (DOM/canvas board). Offline: yes.
- Players: 2P same screen + 1P vs AI. Controls: click/tap or arrows+Enter cursor.
- Scoring: win/loss/draw, captured count; GameSave rating vs AI.
- Replayability: AI levels; undo in 2P. Tech: DOM grid is fine. A11y: full keyboard cursor play, move list in text.
- Chromebook risks: none.

**13. Ultimate Tic-Tac-Toe** — 3×3 grid of tic-tac-toe boards; your move's cell sends the opponent to that board; win boards to claim the meta-board.
- Why: transforms a solved kids' game into a genuinely deep 2P strategy game; tiny ruleset, big decisions.
- Difficulty: 2. Chromebook: perfect. Offline: yes. Players: 2P + 1P heuristic AI.
- Scoring: match wins; GameSave tally. Replayability: high for a board game.
- Tech: DOM. A11y: keyboard navigation cell-to-cell, board-state text summary.
- Chromebook risks: none. Note collision: extend as its own entry, not a mode of Tic Tac Toe (70) — different game tree, cleaner as new game.

**14. Code Crack** — Mastermind-style: break a 4-peg color code in 10 guesses; per-guess black/white hint pegs.
- Why: pure logic, near-zero build cost, great "2 minutes between classes" game.
- Difficulty: 1. Chromebook: perfect. Offline: yes. Players: 1P (+ optional 2P "codemaker" hotseat mode where P1 sets the code).
- Scoring: fewer guesses = more points; daily-seed mode (seeded RNG from date) for compare-with-friends.
- Replayability: 6-vs-8 color difficulty, daily seed. Tech: DOM. A11y: symbols on pegs (not color alone) — required for colorblind safety.
- Chromebook risks: none.

**15. Sumo Ring** — two round wrestlers in a ring; hold your key to charge forward, release to steer; push the other out; physics momentum; best of 7.
- Why: one-key-per-player simplicity with real physics depth; laugh generator.
- Difficulty: 2 (circle physics + friction). Chromebook: perfect. Offline: yes.
- Players: 2P (P1 `W`, P2 `Up` — single keys) + 1P vs AI.
- Scoring: rounds; ring-out style bonuses. Replayability: ring shrinks mode, ice physics mode.
- Tech: canvas 2D. A11y: single-key input is the most accessible versus scheme possible.
- Chromebook risks: none. Distinct from Thumb Fighter (85): movement physics vs quick-time prompts.

**16. Bow Duel** — turn-based archery artillery: set angle + power (hold key), wind shown, first to land 3 hits across procedurally generated terrain.
- Why: turn-based = zero key conflicts; trajectory skill is endlessly replayable.
- Difficulty: 2. Chromebook: perfect. Offline: yes.
- Players: 2P hotseat (shared keys fine — turns) + 1P vs AI (angle-error model).
- Scoring: hits, fewest-shots win bonus. Replayability: RNG terrain + wind each match.
- Tech: canvas 2D ballistic sim. A11y: numeric angle/power readouts; no simultaneous input needed.
- Chromebook risks: none.

**17. Anagram Attack** — 7-letter rack; 60 s; type as many valid words (3+ letters) as possible; 2P = same rack, alternate 60 s rounds or split-screen race; longest-word bonus.
- Why: competitive word play is absent (Hangman/Wordle/Letter Boxed are all solo/async).
- Difficulty: 3 — needs a vendored word list (curate ~40k common words ≈ 300 KB, gzipped by Netlify; validation via binary search or Set).
- Chromebook: good. Offline: yes (caveat: word-list file size — keep <400 KB).
- Players: 1P + 2P hotseat rounds. Scoring: word-length points + pangram bonus.
- Replayability: seeded daily rack. Tech: DOM. A11y: screen-reader-friendly text output.
- Chromebook risks: none (typing on one keyboard is turn-based by design).

**18. Disc Flip** — Reversi-style 8×8 flanking game (use original name/branding; "Reversi"/"Othello" naming avoided for trademark caution).
- Why: deep, deterministic, absent from catalog; strong AI is just greedy+corner weights at 1 ply.
- Difficulty: 3 (rule correctness + pass/move-legality UI). Chromebook: perfect. Offline: yes.
- Players: 2P + 1P vs AI (2 levels). Controls: arrows+Enter or click.
- Scoring: disc differential; GameSave ladder. Replayability: AI levels.
- Tech: DOM grid. A11y: pattern + color discs, move hints toggle.
- Chromebook risks: none.

**19. Putt Duel** — 9-hole top-down mini-golf; aim with keys, hold to set power; walls bounce; turn-based per hole.
- Why: sports variety without reflexes; turn-based = perfect for one keyboard; course RNG.
- Difficulty: 3 (ball-vs-wall reflection + hole editor as JSON polylines).
- Chromebook: good. Offline: yes. Players: 2P hotseat + 1P par chase.
- Scoring: strokes vs par across 9 holes. Replayability: 2 courses + mirror mode.
- Tech: canvas 2D. A11y: numeric power meter; no time pressure.
- Chromebook risks: none.

**20. Dots and Boxes** — classic line-claiming grid game; claim a box, go again; most boxes wins.
- Why: zero-art pure strategy; pairs with Checkers/Disc Flip as the "thinking 2P" trio.
- Difficulty: 2 (chain-detection for AI is the only hard part; 1-ply greedy AI acceptable).
- Chromebook: perfect. Offline: yes. Players: 2P + 1P vs AI.
- Scoring: boxes; grid sizes 4×4–8×8. Replayability: grid size changes strategy.
- Tech: DOM/canvas. A11y: keyboard edge selection; claimed boxes labeled P1/P2 text.
- Chromebook risks: none.

**21. Dice Duel** — push-your-luck dice poker: roll up to 3× per turn, hold dice, fill a 6-category scorecard (pairs, runs, 5-of-a-kind); 8 rounds.
- Why: chance + decisions; absent genre; hotseat works with zero key conflicts.
- Difficulty: 2. Chromebook: perfect. Offline: yes.
- Players: 2P hotseat + 1P vs AI (expected-value hold policy).
- Scoring: scorecard total. Replayability: RNG; "sudden death" variant.
- Tech: DOM. A11y: dice have pips + numbers. Chromebook risks: none.

**22. Rock Blaster** — Asteroids-style momentum shooter: rotate/thrust, wrap-around space, rocks split, UFO bonus targets, 3 ships.
- Why: physics-feel 1P arcade gap (Boss Rush is twin-stick; nothing inertia-based).
- Difficulty: 3 (polygon collision + particle budget). Chromebook: good. Offline: yes.
- Players: 1P. Scoring: waves + accuracy bonus; GameSave best.
- Replayability: endless waves. Tech: canvas 2D. A11y: auto-fire option.
- Chromebook risks: keep particle count capped (<200) for weak CPUs.

**23. Battleship** — place 5 ships (drag or keyboard), alternate volleys; salvo mode (shots = ships remaining) as variant.
- Why: known by every student; 2P hotseat with a pass-screen, or vs AI (hunt/target parity).
- Difficulty: 3 (placement UX + pass-the-device privacy screen).
- Chromebook: good. Offline: yes. Players: 2P hotseat + 1P vs AI.
- Scoring: shots-to-win efficiency. Replayability: salvo mode, random placement.
- Tech: DOM grids. A11y: full keyboard placement with rotation key.
- Chromebook risks: none. Note: generic rules, original code/art — fine.

**24. Type Duel** — 2P typing race, turn-based: same passage, P1 races the clock, then P2; live WPM/accuracy; handicap mode for mixed skill.
- Why: school-relevant skill game with real versus tension.
- Difficulty: 2 (caret tracking + error model). Chromebook: perfect. Offline: yes (passages vendored, original text).
- Players: 2P turn-based (simultaneous typing on one keyboard is physically impractical — explicit design decision) + 1P.
- Scoring: WPM × accuracy. Replayability: passage packs.
- Tech: DOM. A11y: text-first game, naturally strong.
- Chromebook risks: none. Distinct from Typing Speed (75): head-to-head format + handicap.

**25. Solitaire (Klondike)** — full rules: 1/3-card draw, tableau builds, foundation, undo, win detection, auto-finish.
- Why: the calm solo card game the catalog lacks; high engagement per byte.
- Difficulty: 3 (drag logic + rules correctness; keyboard play via cursor+Enter).
- Chromebook: good. Offline: yes. Players: 1P.
- Scoring: time + moves + win streak (GameSave). Replayability: daily-seed deal.
- Tech: DOM cards. A11y: suit symbols + colors, full keyboard play.
- Chromebook risks: none.

---

## 3. Original variant / mode ideas for existing games (10)

Hard constraint (from brief + CODE_QUALITY): variants only on **original code written for this repo** or clearly permissive small games. Never touch Unity WebGL ports (Subway Surfers, Superhot, Baldi's, 10MTD, Gladihoppers, Burrito Bison, BitLife), Flash/Ruffle titles, Construct 3 exports (the Random series, Thumb Fighter), Pokemon/Eaglercraft (licensing), or `Games/Character AI/` (read-only). Variants ship as **modes inside the existing game** (mode select on the start screen), surfaced via a `"variants"` tag in games.json — NOT as new catalog entries and NOT as separate "X Hacked" folders. Separately: the 6 Pokemon + Retro Bowl/Cookie Clicker/etc. "Hacked" entries that modify third-party commercial games are a licensing smell — flag to the owner for review (evidence-first, no deletion without sign-off).

| # | Game | Variant mode(s) | Implementation approach (file/layer) | Risk |
|---|---|---|---|---|
| 1 | Paddle Duel (17, original) | **Chaos Mode**: ball accelerates every rally, random multiball + wide-paddle pickups. **Mirror Mode**: P2 controls swapped | `Games/PaddleDuel/script.js`: mode select on start screen; branch in `reset()`/`score()`; pickup list + spawn timer; mirror = swap the P2 key mapping table | Low |
| 2 | Boss Rush (35, original) | **One-Hit Mode**: player and bosses all die in one hit; bullet speed ×1.25. **Bullet-Time Mode**: holding Shift slows time to 40% | `Games/BossRush/script.js`: hp constants → mode config object; dt scaling in the rAF loop for bullet-time | Low |
| 3 | Star Catcher (16, original) | **Low Gravity**: floaty fall, ×2 spawn rate. **Dodge Storm**: stars off, bombs only, survival timer score | `Games/StarCatcher/script.js`: gravity/spawn constants moved to a mode table selected on start screen | Low |
| 4 | Match Flip (20, original) | **Time Attack**: 60 s global timer. **Shift Chaos**: unmatched cards reshuffle positions every 8 s | `Games/MatchFlip/script.js`: add timer HUD + reshuffle interval; board-size option reuses existing grid builder | Low |
| 5 | Tile Merge (19, original) | **Chaos Board**: 5×5 grid with wildcard tiles. **Zen**: no game-over, score chase | `Games/TileMerge/script.js`: parameterize board size + spawn table; zen = skip lose-check | Low |
| 6 | Queue Escape (42, original) | **Rush Hour**: ×2 customer spawn, patience −40%. **Solo Hard**: one player runs all four stations | `Games/QueueEscape/script.js`: spawn/patience config constants; solo-hard = remap all station keys to one cluster | Low |
| 7 | Brick Dash (18, original) | **Hyper Dash**: ball/paddle ×2 speed, combo decay halved. **One Life**: single ball, doubled brick values | `Games/BrickDash/script.js`: speed constants + lives check behind mode flags | Low |
| 8 | Letter Boxed (31, original) | **Daily Seed**: same board for everyone (seeded RNG from date). **Sprint 90**: 90 s countdown scoring | `Games/LetterBoxed/script.js`: seedable PRNG for board gen + countdown mode; reuses the existing wordlist | Medium (seeded RNG plumbing) |
| 9 | Grid Heist (36, original) | **Fog of War**: vault hidden until you claim 3 cells. **Sudden Death**: playable board shrinks every 5 turns | `Games/GridHeist/script.js`: reveal flag + per-turn shrink in the turn scheduler | Medium (turn-scheduler changes) |
| 10 | FPS (24, original) | **Time Trial**: fixed map, kill-all-targets clock. **One-Hit Arena**: you and enemies die in one hit | `Games/FPS/script.js`: wave config + timer HUD; raycaster untouched | Medium (tuning to stay fun) |

Copyright note for the plan overall: every variant above is original code on original games — no proprietary assets, names, or code are copied. The word "hacked" stays only as the existing red tag; new variants use the `"variants"` tag.

---

## 4. UI/UX overhaul plan (CSS overrides + portal-ux.js only — no bundle rebuild)

All selectors below are confirmed present in the bundle markup or the authored layers.

### 4.0 Fix-first items (regressions, not polish)
- **portal-ux.js scoping bug** (§1): move the tag-badge block inside the IIFE; reuse `fetchGames()` cache (kills the duplicate games.json fetch AND the per-load uncaught error). Verify tag badges render for the 13 `"hacked"` entries.
- **Popup fallback** in `openGameUrl()`: `var w = window.open(safe, '_blank'); if (!w) location.href = safe;` — popup-blocked managed Chromebooks currently dead-end.
- **games.json hygiene** (§1 data bugs): dedupe ids 108/110, normalize `Arcade`→`arcade`, add missing `tags:[]`, recat "Typing Speed" (riddle→arcade), replace emoji `icon` values with "" (portal-ux SVG system owns icons).

### 4.1 Consolidate the CSS layer
- Extract the ~700-line inline `<style>` from index.html into `assets/portal-overrides.css` (single authored layer, cacheable). During extraction, delete the superseded rules: keep the later flat hover block, drop the §6 glow/lift block; merge the two `prefers-reduced-motion` blocks; single definition per selector. Zero behavior change at extraction; behavioral changes land as separate commits.
- Introduce a token block at the top: `--accent:#06b6d4` (cyan), `--accent-2:#14b8a6` (teal), `--danger:#e63946`, `--gold:#d4a017` — then remap existing purple usages: `--focus-ring`, `.skip-link` background, `.search-bar:focus-within` border/shadow, `.category-filter__btn.active` fallback `--cat-color`, `.game-modal__spinner` border-top-color fallback, light-mode logo color, `::selection`. Sports badge `#059669` (green) → teal `#0d9488`. Keep per-category badge colors otherwise; light theme gets darker teal `#0e7490` for contrast ≥4.5:1 on `#f5f5f7`.
- Replace the featured `★` text glyph (`.game-card--featured::after`) with an inline-SVG star via `content` replacement is not possible — instead portal-ux injects an SVG badge element; CSS hides the pseudo-element.

### 4.2 Game-detail panel (new, portal-ux-owned, vanilla)
The bundle modal is unreachable (§1) — do not resurrect the iframe modal for gameplay (2P keyboard games misbehave in iframes; new-tab with popup fallback is the right play path). Instead add an **info affordance**: portal-ux injects a 44px "i" button (`.game-card__info`) into each card header; click/`i` key opens a portal-ux-built detail panel (own markup: `.ux-detail`, role=dialog, aria-modal, focus trap reusing the existing modal a11y patterns) showing: title, category chip (data-cat color), tag badges, desc, **controls table** (new optional `howto` string field in games.json), players badge (new `players` field), Play button (new tab + fallback) and Close/Esc. Pure addition; no bundle dependency.

### 4.3 Discovery UI (depends on games.json tags — §5)
- Tag filter row above the grid (portal-ux-owned, `.ux-tag-filter`): pills for `2P`, `Co-op`, `Hacked`, `Variants`, `New`. Filtering = toggle card display by matching games.json tags (cards already get `data-cat`/`data-title`; add `data-tags` in `applyCardMetadata`). Independent of the bundle's category pills; composes with them.
- Category pill counts: portal-ux appends `<span class="category-filter__count">` per pill from games.json.
- `/` focuses `.search-bar__input` (guard: not while typing in an input); Esc already clears.
- Result count + empty-state reset: portal-ux maintains an `aria-live="polite"` `.ux-result-status` ("23 games") and, when `.app__empty` is visible, injects a "Clear search" button wired to the debounced-replay path.
- Recently played row: portal-ux records launches (localStorage `unblockmath_recent`, max 8, title+url+ts) and renders `.ux-recent` chips above `.bento-grid`. Fails silently if localStorage is denied (managed Chromebook policy) — wrap in try/catch like the theme code.
- Offline indicator: `navigator.onLine` + `online/offline` events → slim `.ux-net-banner` ("Offline mode — all games work offline"). Informational only.

### 4.4 States, motion, responsive, a11y
- Style `.app__skeleton-grid` (flat pulse, no shimmer gradient), `.app__error` (+ Retry button that reloads games.json via the bundle's own fetch is not reachable — retry = `location.reload()`), keep `.app__empty` styling consistent.
- Keep the single purposeful card hover (translateY -2px) and the `is-filtering` 220 ms category transition; no new animations beyond the detail panel in/out (reuse `modal-in`).
- Breakpoints stay 1024/768/400; verify the new tag row scrolls horizontally like `.category-filter` on ≤768.
- a11y: `aria-current="true"` on the active `.category-filter__btn`; `aria-pressed` on `.theme-toggle` and tag pills; focus-visible rings on all new controls; detail panel labeled by its title; all new text uses tokens for contrast.
- Performance: extend the existing `onMutations` debounce (80 ms) to cover tag/detail injection (delete the second MutationObserver from the broken block); icon injection already guards on svg presence — keep it O(1) per card.

---

## 5. Platform improvements

1. **games.json schema extension (backward compatible):** add optional `players` (`"1"`, `"2"`, `"1-4"`, `"2-4"`) and `howto` (one-line controls string). Old readers ignore them; the detail panel + 2P filter consume them. One owner edits games.json (swarm conflict rule).
2. **Tag taxonomy:** `2p` (simultaneous one-keyboard), `hotseat`, `coop`, `hacked` (exists), `variants`, `new`. Retro-tag existing 2P games (Paddle Duel, Thumb Fighter, Gladihoppers, Grid Heist, Last Lantern, Queue Escape, House of Hazards, Connect Four, Tic Tac Toe) and VERIFY the Random-series/Thumb Fighter 2P bindings in the smoke browser before tagging them. This makes the `multiplayer` category and the 2P pill honest.
3. **Chromebook input audit:** rebind Last Lantern P4 off the numpad (to `TFGH`+`R`-adjacent cluster or make P3/P4 share hotseat turns); document per-game key tables in `howto`; add the key-rollover note to every new 2P start screen.
4. **Save-layer adoption:** new games persist bests via `assets/game-save.js` (`GameSave.load/save`); do not invent per-game storage keys.
5. **Size budget:** new games ≤1 MB per directory, no binary assets beyond tiny SVG/PNG; keeps the repo lean (current ~0.8 GB is dominated by Eaglercraft + big ports).
6. **Docs sync:** rewrite `docs/GAMES.md` table for the current 92+ entries (it claims 42 and mislabels Hextris/Flappy Bird/Age of War as remote-dependent — they are now offline originals); update `docs/wiki/Game-List.md`; add `tags`/`players`/`howto` to the README schema table.
7. **QA operations:** the smoke gate needs games on disk — every new-game worker must `git sparse-checkout add Games/<Name>` (per BRIEF addendum) and run `xvfb-run -a ~/.local/geo-venv/bin/python3 scripts/smoke_test_games.py --games "<Titles>"` before handoff. Portal changes get a manual xvfb browser pass (console must show zero errors — this catches regressions of the portal-ux bug class).
8. **Deferred (not this overhaul):** favorites-row surfacing depends on the bundle's minified storage key (`Ku`); investigate cheaply, implement only if it doesn't require bundle surgery.

---

## 6. Recommended build order

**Phase 0 — unblock everything (sequential, single owner each):**
- 0a. portal-ux.js fix pack: IIFE scoping/tag badges, popup fallback, fetch dedupe. *(Blocks: nothing, but do first — it removes a per-load console error that would mask QA signal.)*
- 0b. games.json hygiene + schema extension + retro-tagging. *(Blocks: §4.3 discovery UI, detail panel content, 2P filter.)*

**Phase A — parallel (independent file ownership):**
- A1. CSS overhaul: extract `assets/portal-overrides.css`, dedupe rules, cyan/teal retone, states styling. Owns: index.html + new CSS file.
- A2. Games batch 1 (fast wins): **Reaction Duel, Cycle Duel, Air Hockey Duel, Stack Tower**. Owns: four new `Games/<Name>/` dirs.
- A3. Variants batch 1: **Paddle Duel Chaos/Mirror, Star Catcher modes, Match Flip Time Attack, Brick Dash Hyper**. Owns: four existing game dirs (original code only).

**Phase B — parallel:**
- B1. Discovery + detail panel (tag pills, counts, recent row, offline banner, `.ux-detail`). Depends on 0b (tags/players/howto) and A1 (tokens). Owns: portal-ux.js + portal-overrides.css.
- B2. Games batch 2 (2P core): **Freeze Tag Arena, Hoop Duel, Tank Duel Arena, Sumo Ring, Lemonade Stand, Quiz Clash**. Six new dirs; Quiz Clash includes original-question authoring.
- B3. Variants batch 2: **Boss Rush One-Hit/Bullet-Time, Tile Merge Chaos/Zen, Queue Escape Rush Hour, Letter Boxed Daily**. Four existing dirs.

**Phase C — parallel + hardening:**
- C1. Flagship builds: **Twin Temple, Bomber Arena, Checkers, Anagram Attack** (largest; start early if a worker frees up).
- C2. Docs sync (GAMES.md/wiki/README schema) + Last Lantern P4 rebind.
- C3. Chromebook-condition matrix (offline load of portal + 5 games; localStorage denied; reduced motion; keyboard-only; small viewport) + full smoke gate on every new/touched game. Depends on all above.

**Phase D — integration:** orchestrator review per batch, games.json appends (single owner), `node --check` all entry scripts, du audit, `git status` hygiene, final full smoke gate, final report inputs.

**Parallelizable:** every new game dir (A2/B2/C1) and every variant (A3/B3) is fully independent. **Sequential:** 0b → B1; A1 → B1 (shared CSS tokens); all games → games.json registration (one owner) → smoke gate. UI overhaul (A1/B1) never blocks game work.

---
*End of plan. Orchestrator selects from §2 by quality, not count — the top 10 are marked; batches in §6 assume ~14 new games + 8 variants is the realistic ceiling for this overhaul.*
