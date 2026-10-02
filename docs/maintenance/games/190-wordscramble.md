<!-- maintenance-game: Games/WordScramble -->
# Word Scramble maintenance

## Identity and status

Registered ID 190, `word`, not featured. Entry `Games/WordScramble/index.html`; two files, 34,696 bytes at baseline `8c8a055`. Auto-starting timed word game is source-local but has a data defect that can randomly halt a round. No browser session was executed by this docs-only audit.

## Implementation map

Source review coverage: full HTML/CSS, embedded `words` objects, inline engine and MIT `LICENSE`; no compiled/vendor bundle is omitted. `startGame()` immediately calls `renderRound()`. `pickWord()` samples the entire array with replacement. `renderRound()` derives `correctWord`, difficulty/time budget, scramble and hint, then starts its interval. `scramble()` Fisher-Yates shuffles uppercase letters and retries if unchanged. `getWordClass()` normally uses explicit difficulty; fallback inspects length/repeats.

`check()` compares a trimmed lowercase answer, handles wrong-answer feedback or awards points, then schedules `advance()`. `timeUp()` schedules the same progression after revealing the answer. `endGame()` writes the ten-round result. Maintenance DOM IDs: `#answer`, `#scrambled`, `#hint`, `#badge`, `#round`, `#score`, `#time`, `#streak`, `#msg`, `#endOverlay`, `#restartBtn`.

## Gameplay and controls

Round one starts on page load. Type the unscrambled word and press Enter or Check. Reshuffle rearranges the same word, clears input and does not reset the timer. Common/rare/exclusive/legendary budgets are 20/25/30/35 seconds. Correct answers earn ten base points plus speed bonuses, five more for streaks of at least three, and difficulty bonuses for exclusive/legendary. Wrong answers reset streak but allow retries; timeout reveals the word and advances. Ten rounds end with a win at 100 points or Target missed. Restart is available on the result overlay. Pointer/touch uses native text input/buttons. No sound is implemented; the shake feedback is CSS animation.

## State and persistence

`round`, `score`, `streak`, `correctWord`, `wordClass`, `maxTime`, `timeLeft`, `timer`, `running`, `locked` are globals. No storage or save keys. `stopTimer()` clears the one tracked interval before another starts and at game end. Inter-round 1300/1600 ms timeouts and 400 ms error cleanup are untracked. There is no pause-on-hidden-tab policy; elapsed time is interval ticks rather than a wall-clock deadline. `locked` prevents duplicate normal scoring while waiting to advance.

## Dependencies and provenance

HTML records `https://github.com/GZ30eee/Word-Scramble-Game`, revision `712322df701b5c7fb3d78b426ec5c245c1de6923`, and ingestion of word/timer/scoring logic. MIT `LICENSE` names Word Scramble Game. The recorded source notice describes removal of remote images and Google Fonts, not an independently verified upstream comparison. Current source has no external load. Embedded word data is a dependency requiring validation, not decorative content.

## Audit findings

- **HIGH**, `index.html`, word object with `arakter: "network"` and `renderRound()` line `correctWord = w.word.toLowerCase()`: this record lacks `word`, so random selection throws and halts progression/startup. Recommended repro: force `pickWord()` to return that record in an authorized test harness. Minimal root fix: correct the field and validate every word record once before sampling; do not filter randomly failed rounds after the fact. Syntax parsing alone cannot catch it.
- **MEDIUM**, `index.html`, `scramble()`: recursive unchanged-word retry has no bound. Current words can terminate probabilistically, but an all-identical future word cannot. Root fix: bounded retries plus deterministic nonidentical-letter swap when possible, and reject unshufflable data. Status: current data-extension risk, not a demonstrated stack overflow in normal play.
- **MEDIUM**, `index.html`, `endGame()`/`#endOverlay`: no focus transfer, dialog semantics or inert background. The answer field keeps focus under the result overlay. Root fix: focus restart and contain result focus with native dialog/background inertness.
- **LOW**, `index.html`, `words`: repeated Algorithm/Quantum entries alter sampling frequency; review intentional weighting before deduplication. Do not silently change inherited word probabilities.

## Safe iteration

Fix the malformed record at the data boundary and add a tiny all-record assertion beside the authorized patch. Keep difficulty/time/streak math intact. Interval teardown is already centralized; extend lifecycle cancellation there rather than introduce a framework. No dictionary service, art replacement or gameplay rewrite is proposed; runtime is read-only for this task.

## Verification

Actually run: inline-script syntax and catalog/source/document checks; [batch audit](../audits/games-66.md). Native checks: zero. Recommended native tests: select every record deterministically, correct/wrong/empty answers, unchanged shuffle fallback, timeout, all ten rounds, win/loss restart, mobile keyboard and hidden-tab timing. Historical quick play exercised a wrong answer and Reshuffle but did not reach restart; it cannot clear the random data crash.

## Future outlook

Week one must repair and validate word data before cosmetic refurbishment. Then add bounded shuffle behavior and accessible end-state focus/reduced motion. Later consider reproducible rounds or optional pause only after timer policy is agreed. Defer expanded dictionaries until record schema and asset/source terms are recorded.
