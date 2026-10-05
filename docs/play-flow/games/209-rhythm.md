# Play flow: Rhythm (id 209, registered)

- Baseline `5be686e1ab350c8ddce7a827c413612e421c3a5c`. `Games/Rhythm`, 7 files, 941313 bytes (media/music.mp3 is 913284). Doc: `docs/maintenance/games/209-rhythm.md` (not owned). CODE-REVIEW ONLY.

## Source inspected

- `index.html` blob `97b84f2f582fed320990b50fe4d8ce779d0e3db4` read completely.
- `scripts/script.js` blob `205ca964f9f742c7aa6ae41a1d18260081f1d745` read completely: `initializeNotes`, `setupSpeed`, `setupChallenge`, `updateAnimation`, `setupStartButton`, `startTimer`, `showResult`, `setupNoteMiss`, `setupKeys`, `setupTouch`, `pressTrack`, `judge`, `getHitJudgement`, `displayAccuracy`, `showHitEffect`, `updateHits/Combo/MaxCombo`, `calculateScore`, `removeNoteFromTrack`, `updateNext`, `window.onload`.
- `scripts/song.js` (4924 bytes) read at head: per-lane objects `s/d/f/...` with `{color, next, notes:[{duration, delay}]}`; `song.sheet`/`song.duration` consumed by `script.js`. `css/style.css` structure noted; `CREDITS.md`/`LICENSE` read (upstream ChloeLiang/rhythm-game, MIT, commit 4995fbf, modifications documented).
- Provenance note: song credit text in `.menu__song` ("Your Name OST - Kataware Doki", Yojiro Noda / Theishter) is visible source copy, not verified licensing by this worker.

## Flow (from source)

1. Boot: `window.onload` grabs `.track-container`, `.keypress`, `.hit__combo`, runs `initializeNotes()` + all `setup*()`. Menu `.menu` is visible with `.btn--start`.
2. Start: `.btn--start` click sets `isPlaying`, `startTime = Date.now()`, starts `startTimer(song.duration)`, fades `.menu` (opacity 0 + `pointer-events:none`), plays `<audio class="song">`, sets every `.note` to `animationPlayState: running`.
3. Input: `document keydown/keyup` for keys `s d f Space j k l` (guarded by `isHolding` so a held key fires once); touch via `pointerdown/pointerup/pointerleave/pointercancel` on the seven `.key` elements calling `pressTrack`.
4. Core loop: notes are DOM `.note` elements animated by CSS `@keyframes moveDown` (`animationDuration = duration - speed`, `animationDelay = delay + speed`), i.e. the *simulation clock is CSS animation time*; `judge(index)` compares `Date.now()-startTime` to `nextNote.duration + nextNote.delay` with windows perfect <0.1s, good <0.2s, bad <0.3s, else miss; presses earlier than 1/4 of travel are ignored. Misses are detected on `trackContainer animationend`.
5. Score/progression: `hits{perfect,good,bad,miss}`, `combo/maxCombo`, `score += 1000 * multiplier[judgement]` with combo40/combo80 multipliers, displayed in `.hit__combo` / `.hit__accuracy`.
6. Win/lose: `startTimer` countdown hits 0 -> `showResult()` sets `.result__heading` to `Failed` if `hits.miss > total/2`, else `Cleared`, fills `.result__accuracy` counts and shows `.summary__result`.
7. Restart: `.btn--restart` href `./` (full page reload).

## UI bloat: MILD

- Persistent during play: `header.howto` one-line controls bar (candidate for one-time help), `.hit` combo/accuracy HUD, `.track-container`, `.key-container` (essential touch/visual keys), `.summary__timer`.
- `.menu` (title, credits, Speed/Challenge config, Start) is a genuine game menu; it is hidden during play by source, not overlapping gameplay.
- `.summary` result panel: genuine end state with `Play again`.
- No gradients (flattened per CREDITS), no popups, no ad/info modals.

## Popups/modals

None. Menu -> play -> summary are opacity/`display` state swaps in the same document.

## Animation vs simulation

CSS `moveDown` keyframes move note elements; judgement math is wall-clock based, so animation and simulation are coupled by design (a slowed/reduced-motion CSS would desync hits). No RAF in source; `startTimer` uses a 1 s `setInterval` (cleared when the countdown ends). Miss cleanup uses `animationend`.

## Findings

1. MEDIUM - restart relies on `href="./"` reload: state (`hits`, `score`, `song.sheet[].next`) is only reset by a full reload. Works, but a same-page reset would need all globals reinitialised; root: `.btn--restart` handler in `script.js`. No fix required now, note the coupling.
2. LOW - `displayAccuracy` does `document.querySelector('.hit__accuracy').remove()` then re-appends; if the node were missing it would throw. Present in markup, so no fix.
3. LOW - reduced-motion users still depend on CSS animation for note timing; verify in browser before claiming accessibility. Held.

No high-severity findings.

## Recommended playable view

Keep `.game` (tracks + keys + `.hit`), `.summary`, speed/challenge config. Move `header.howto` into one-time acknowledged help; keep `.menu__song` credits in help/about rather than on the play screen.

## Validation status

CODE-REVIEW ONLY. Smallest browser check: press Start, confirm audio + notes fall, hit one note (accuracy label + combo), let a note pass (miss), reach `.summary__result` with `Cleared`/`Failed`, press `Play again`.
