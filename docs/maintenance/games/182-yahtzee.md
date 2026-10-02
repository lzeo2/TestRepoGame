<!-- maintenance-game: Games/Yahtzee -->
# Yahtzee maintenance

## Identity and status

Registered ID 182, category `classic`, not featured; entry `Games/Yahtzee/index.html`. Four files total 20,149 bytes at baseline `8c8a055`. This port uses a local scorecard and text dice, with operating-system dark-theme CSS. Offline source closure is evident; native gameplay was not run for this audit.

## Implementation map

Source review coverage: full HTML, `script.js`, `style.css` and MIT `LICENSE`; no vendor/minified code omitted. `window.onload = yahtzeeGame` creates one closure that owns all scoring state. Dice are spans with IDs `0` through `4`; hold checkboxes are `hold0` through `hold4`. `#roll`, `#totalScore`, `#rounds-left`, `#rolls-left`, `#yahtzeeTable`, `#end-screen` and `#restart-btn` are maintenance anchors.

`roll()` generates unheld dice, with all dice randomized on the first roll. `cellScore()` banks values, resets rolls, disables rows, increments base-category count and calls `endGame()`. Upper categories use `upperSec()`/`upperSecScore()`; lower categories use `kindScore`, `fullHouse`, `searchDice`, `checkStraightCombo`, `straight`, `chance`, `yahtzee`. `yahtzeeExtend()` changes old row IDs and appends a new bonus row. `disable()` removes the scoring class, handler and focusability.

## Gameplay and controls

The scorecard is ready on load. Each round allows up to three rolls, holds selected dice, and consumes one open category even when its result is zero. Upper values sum matching dice; three/four of a kind score the dice sum; full house is 25, small straight 30, large straight 40, first Yahtzee 50. Further matching Yahtzees use 100-point bonus rows. Upper subtotal 63 earns 35 once. All thirteen base categories used ends the session; total at least 200 wins. Restart reloads the page, rather than reusing the closure.

Space rolls when focus is not already on an input/button/score cell; 1-5 toggle holds. Tab and Enter/Space activate score rows. Touch/click labels toggle holds and clicking rows scores. Native checkbox Space changes that checkbox, not the roll. No audio or asset downloads occur in the source.

## State and persistence

`rolls`, `held`, `scored`, `scoredCount`, `finished`, `upperSecAccumulator`, `bonusAwarded` and `yahtzeeScore` belong to the closure. Dice values and total are read back from DOM text rather than independent numeric state. There are no localStorage keys, timers or animation-frame loops. Reload discards progress. Dynamic bonus rows keep only the latest `yahtzee` and `yahtzeeScore` IDs; edits must preserve that lookup contract.

## Dependencies and provenance

`LICENSE` identifies Taylor Hansen and MIT terms. HTML and [sources_7](../../catalog_parts/sources_7.md) record `https://github.com/taylorhansen/Yahtzee`, pinned revision `26dec5d9750a536f1c4e9515bf7c69b6bd15683c`. Shipped comments enumerate local changes: zero-score categories, counters, target, keyboard play and shell restyle. Prior ingestion is repository evidence, not fresh upstream verification. Runtime dependencies are only local CSS/JS and standard DOM APIs.

## Audit findings

- **HIGH**, `script.js`, `upperSec()` calls `cellScore()` before `checkUpperBonus()`: if the thirteenth category first crosses the 63-point upper threshold, `endGame()` computes outcome before the 35-point award. Recommended repro: save the final upper category until a subtotal of 60, then score enough to cross 63 while total moves across the 200 target. The overlay can report loss/old total despite an updated score. Root fix: award upper bonus before final outcome computation, or defer end evaluation until the scoring transaction finishes.
- **MEDIUM**, `index.html`, `.page-head p`: “Six or more ones” describes neither the implemented 63-point subtotal nor feasible five-die scoring. Root fix: state the aggregate threshold; keep `#upperSecBonus` and instructions consistent.
- **MEDIUM**, `script.js`, `yahtzee()`/`yahtzeeExtend()`: a bonus row passes through `cellScore()` and therefore resets rolls without increasing base-category count. This gives an extra round for a bonus rather than applying it within a base-category scoring turn. Treat as a rules discrepancy to resolve explicitly, not silently remove inherited bonus mechanics.

## Safe iteration

Keep scoring helpers and DOM row IDs stable. Repair the final-score ordering where upper-category scoring originates, not by altering overlay text after the fact. If bonus rules change, document the selected ruleset and preserve a reproducible five-dice example. Only separately authorized runtime commits may implement these recommendations.

## Verification

Actually run: Git-blob script syntax and documentation identity/section checks; [batch results](../audits/games-66.md). Native checks: zero. Re-run `git show HEAD:Games/Yahtzee/script.js | node --check`. Recommended native play: invalid category zero, three-roll cap, hold behavior under focus, all thirteen rows, final-upper-category bonus, repeated Yahtzee, restart, and dark/mobile screenshots. Historical quick play scored Chance but did not finish the session.

## Future outlook

Week one should fix final-score ordering and misleading bonus copy. Next verify the intended bonus-turn rules, semantic score-row controls and end-screen focus. Defer saved sessions or multiplayer until DOM-backed scoring can be restored safely and current category behavior has a small deterministic regression check.
