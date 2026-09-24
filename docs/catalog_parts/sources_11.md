# Catalog part 11: provenance

Batch 11: one game **ingested** from a permissively-licensed open-source
repository (MIT; LICENSE file shipped in the game folder), two games
**built in-house** because no genuine permissively-licensed offline
candidate met the repo rules. No third-party art, audio files or fonts are
bundled; every visual is flat CSS/SVG drawn by the shipped code, all data
(decks, cave geometry) is generated locally at runtime, nothing is fetched.

## Hunt The Wumpus (Games/HuntTheWumpus/) - built in-house

- **Reason:** no permissively-licensed browser implementation of the classic
  1973 cave hunt exists on GitHub. Rejected from search:
  `deciduously/hunt-the-wumpus` (MIT but a Yew/Rust tutorial: the shipped
  `docs/` is only compiled wasm + glue, no start screen, score or rounds,
  and the game cannot be modified without a Rust toolchain),
  `gliderkite/wumpus` (MIT, Python terminal), `tleguern/ansible-playbook-wumpus`
  (ISC, an Ansible playbook), `thiagodnf/wumpus-world-simulator` and
  `luka1199/wumpus-world` (MIT but the AI-textbook four-room Wumpus World,
  a different game), `RayKV423/original-hunt-the-wumpus` (Unlicense: the
  original BASIC source, used only as a rules reference, not as shipped
  code), `benjamw/wumpus` and others with no license at all.
- **Implementation:** twenty-room dodecahedral cave (adjacency and the
  Schlegel-diagram map computed from the twenty vertices of a unit
  dodecahedron), three tunnels per room, two bottomless pits, two super
  bats, one Wumpus, five arrows. Classic percepts (draft, smell, flapping),
  bats relocate the player (drop destination excludes bat rooms so chains
  cannot loop), move or shoot through up to three tunnels, self-hit loss,
  arrow bonus scoring (100 + 20 per arrow left), rounds, win/lose streak,
  start screen with documented controls, keys 1/2/3/S/Enter/Esc/M, all
  controls as 44px buttons, flat colors.

## Backgammon (Games/Backgammon/) - ingested

- **Repo:** https://github.com/binarymax/backgammon.js
- **License:** MIT (LICENSE shipped), Copyright (c) 2013 Max Irwin
- **Commit:** b00c2e67e97dda35d43f6f8068f19f90e835798a
- **Taken:** `main.js` (namespace, RNG helpers, default starting position)
  and `game.js` (rules engine: FEN-style setup and parsing, automatic dice
  with doubles counting four moves, full legal move generation including bar
  re-entry, blot hits, bear-off with the exact-or-higher-die rules, blocked
  turn auto-pass, win detection) vendored as `engine.js`; `brain.js`
  (the simple greedy move-ranking AI) verbatim. Verified in Node: the
  default position loads 15 checkers per side and 55 AI-vs-AI matches
  completed with zero errors.
- **Rejected from search:** `quasoft/backgammonjs` (MIT but a multiplayer
  client/server app needing node servers, sockets and a gulp build),
  `danialm/backgammon`, `lkowalick/backgammon-react` (MIT but React apps
  needing a build step), `timiles/backgammon` (GPL-2.0 TypeScript app),
  `mmermerkaya/tavla` (AGPL-3.0), several repos with no license.
- **Modifications:** the debug `console.log('WINNER!...)` line removed from
  `game.js` (repo rule: no console output in production paths). **Not
  taken:** `board.js` (jQuery drag-drop UI), the jQuery vendor file, the
  felt texture and piece PNG/GIF images, and the Google Analytics stub in
  `example.html`. Replaced with a new flat, dependency-free UI: snake-grid
  board of four-point rows so every point is a 44px target at 360px width,
  tap source then highlighted legal destination, keyboard via native
  buttons (Tab/Enter), dice/status display, score (5 per blot hit, 2 per
  checker borne off, 100 per match), match win/lose overlay, new match and
  menu paths. Documented simplification: the "must play the higher die
  when only one can be played" tiebreak is not enforced; using both dice
  whenever legally possible is.

## Higher Or Lower (Games/HigherOrLower/) - built in-house

- **Reason:** no permissively-licensed self-contained browser game found.
  Rejected from search: `MomchilGorchev/high-low` (MIT, but a thin jQuery
  client for the online deckofcardsapi.com HTTP API with remote card
  images and a Google Fonts import; every gameplay line depends on network
  calls, so nothing offline-usable could be ingested and no streak or
  score logic exists), `Dug-F/HigherOrLowerReact` (GPL-3.0 React),
  `lightsparks/Higher-or-Lower`, `FitFingers/JavaScript-Simple-Card-Game`,
  `David-CB-UK/higher-lower-card-game`, `leemander/cards` and others with
  no license at all.
- **Implementation:** local 52-card deck (jokers removed, Fisher-Yates
  shuffle, Ace high), guess higher or lower against the drawn card, ties
  lose, streak with goal of eight (win) and score of 10 times streak per
  correct guess, cards-left counter for card counting, session best streak,
  start screen with documented rules and controls (buttons plus H/L and
  Up/Down keys), win/lose overlays, restart and menu paths, flat CSS card
  faces with text-presentation suit glyphs.

## Gate

All three games were temporarily appended to `games.json` (ids 143-145,
backup kept), then verified with
`xvfb-run -a python3 scripts/smoke_test_games.py --games
"Hunt The Wumpus,Backgammon,Higher Or Lower"`:

```
ok   Hunt The Wumpus              console_errors=0 failed_reqs=0
ok   Backgammon                   console_errors=0 failed_reqs=0
ok   Higher Or Lower              console_errors=0 failed_reqs=0

== 3/3 games pass ==
```

A separate interaction pass (Playwright, 360x740 viewport) played real
input: Wumpus keyboard moves, shooting and four round restarts; Backgammon
12 legal checker moves with highlight validation, AI replies, new match
and menu; Higher Or Lower repeated guesses through a lose overlay, restart
and menu. Result: zero page errors, zero console errors (favicon 404
excluded as benign per the smoke-test policy), zero horizontal overflow.

`games.json` was then restored byte-for-byte; final `git diff games.json`
is empty. Note: a concurrent worker's own temporary gate entries shared
the file during this batch; the file was restored to HEAD, which is also
that worker's restore target.

Registration for this batch lives in `docs/catalog_parts/part_11.json`.
