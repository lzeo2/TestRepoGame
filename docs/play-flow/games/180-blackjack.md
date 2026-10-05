# Blackjack — play-flow audit (batch 1)

- Identity: catalog id 180, registered. `Games/Blackjack/`, entry
  `Games/Blackjack/index.html` (blob `1d2d548b19032af406b6bbceb8bbaf0c42b53039`),
  source baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. 4 files / 29,452 B.
  Ingestion comment in entry: `github.com/Vimal9RAM-NAP/blackjack-web`,
  MIT (LICENSE blob `460b99a7`), commit `81e00b0e...`; modifications listed
  (fonts removed, gradients flattened, natural settle added, session win at
  2,000 chips, H/S/D/Enter keys, start overlay replaced by static header,
  44px targets).
- Validation status: **CODE-REVIEW ONLY**. No browser run by this worker.

## Source inspected

- `index.html` (blob above), read fully. Screens/ids: `header.page-head`
  (static non-blocking controls doc), `#win-screen` overlay ("Session won",
  Keep playing / `resetGame()`), `#broke-screen` overlay ("Bankrupt",
  "Reload 1,000 chips"), `.table-header` (`.brand` "High Roller Club",
  `.table-rules`, "New session" with `confirm(...)`), `.score-board`
  (`#player-title`, `#chips`), `#dealer-cards`/`#player-cards`/`#player-cards-2`,
  `#dealer-score`/`#player-score`/`#player-score-2`, `#status-message`,
  `#betting-controls` (`#bet-input`, chip buttons +10/50/100/500, Deal →
  `startGame()`), `#game-controls` (Hit `hit()`, Stand `stand()`,
  Double `doubleDown()`, Split `handleSplit()`), `#split-hand-section`.
- `script.js` (blob `cd8ec5a57097b61ae3021170d694a0fab7559037`, 531 lines),
  function inventory + selected greps inspected, not every line:
  `initAudio`/`playSound`, `loadGameState`/`saveGameState` (localStorage keys
  `bj_chips`, `bj_highest`, `bj_title`, lines 91-113), `checkBrokeState`,
  `resetGame`, `checkMilestones`, `createDeck`, `getCardValue`,
  `calculateScore`, `renderHand`, `isNatural`, `settleNaturals`, `startGame`,
  `updateUI`, `enterGame` (references `#start-screen`, a leftover id — see
  findings); `document.addEventListener('keydown', ...)` at line 505 (H/S/D/
  Enter key cases inside that block were not read line-by-line — held).
- Held: `style.css`, `LICENSE`, body of the keydown handler, most
  line-by-line game-loop details (split/double flows read only at function
  signature level).

## Flow (from source)

- Boot: table live on load (start overlay removed per comment);
  `loadGameState()` restores chips/rank into `#chips`/`#player-title`.
- Setup: set bet via `#bet-input` or chip buttons → Deal (`startGame()`),
  which hides `#betting-controls`, shows `#game-controls` (+ `#split-btn`
  when legal), deals into `#dealer-cards`/`#player-cards`.
- Input: buttons + keyboard (handler at line 505, cases held).
- Core loop: `hit()`/`stand()`/`doubleDown()`/`handleSplit()` → `updateUI()`
  → `calculateScore` into score badges; dealer settle via `settleNaturals()`
  (dealer peek, natural 3:2) and stand resolution (bodies partly held).
- Score/progression: `#chips` bankroll, `#player-title` rank via
  `checkMilestones()`; persistence via `saveGameState()`.
- Win/lose: reaching 2,000 chips → `#win-screen` (dismissable: "Keep playing"
  or `resetGame()`); `checkBrokeState()` → `#broke-screen` with
  `resetGame()` reload.
- Restart: "New session" header button with `confirm(...)`, `resetGame()`.

## UI bloat: MILD

- Persistent `header.page-head` controls doc and `.table-header` brand +
  rules line: genuine, static, non-blocking (replaced an old start overlay
  deliberately). `.brand` "High Roller Club" is decorative flavor text.
- Genuine HUD: score board, hands, `#status-message`, control groups.
- Overlays `#win-screen`/`#broke-screen` are real terminal states with
  actions, not nags; they reappear only when the condition recurs.

## Popups / modals

- `#win-screen` (trigger: bankroll ≥ 2,000; dismiss keeps play),
  `#broke-screen` (trigger: chips ≤ 0; action reloads), one `confirm()` on
  "New session". No recurring ad/info popups.

## Animation / simulation

- Card rendering through `renderHand()` DOM updates; `initAudio`/`playSound`
  WebAudio blips (implementation partly held). No game RAF.

## Findings

- LOW — `enterGame(event)` references `#start-screen` (lines 120-133) but the
  entry no longer contains `#start-screen` (overlay removed). Dead path;
  root `script.js enterGame`. Fix: delete the dead handler after confirming
  no caller.
- LOW — `header.page-head` repeats rules that `.table-rules` also states;
  fold into one-time help if touched.
- Held — keydown key cases (line 505+) and split/double/settle bodies not read
  line-by-line; smallest needed check: read `script.js` fully (531 lines).

## Recommended playable view

Keep table, score board, controls, overlays. Keep `page-head` summary or move
it to one-time help with reopen. Remove `.brand` flavor text only if the
header row needs space; no recurring popups exist.
