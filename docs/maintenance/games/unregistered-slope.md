<!-- maintenance-game: Games/Slope -->
# Slope maintenance

## Identity and status

**Unregistered**, no current catalog id/category. Entry `Games/Slope/index.html`; baseline `8c8a055` contains one 2,720-byte file. This is an intentional offline-unavailable notice, **not a playable Slope port**. Historical id 3 was removed; the folder remains pending owner keep/remove disposition. Documentation does not authorize restoring a remote build or assigning a new id.

## Implementation map

Source review coverage: the complete HTML and inline CSS. There is no JavaScript, loader, iframe, game bundle, audio, model or binary engine in the directory. The DOM consists of `.wrap`, `.card[role="alert"]`, decorative `.icon[aria-hidden="true"]`, an h1, explanatory paragraph and `.actions` with one `a.btn.primary`. Its only destination is `../../index.html`.

CSS uses flex centering, a max-width 480px card, system font stack, 46px-minimum action, visible focus outline and a reduced-motion override. The entry declares dark color scheme and full-height page; no portal theme state is read. Existing runtime copy explicitly says retrying cannot restore the offline build. There are no functional gameplay patch points because there is no engine here.

## Gameplay and controls

No start, movement controls, score, outcome, restart or playable content exists. The only action is Back to Arcade, usable by pointer/touch and native keyboard link activation. Do not infer arrows/A/D or rolling-ball behavior from the title. Reloading repeats the same notice, not a game recovery path. This page's message is truthful unavailable-state feedback; it must not be counted as a game that passed gameplay verification.

## State and persistence

No state variables, save keys, localStorage, cookies, timers, RAF loops or cleanup routines exist. The browser alone owns navigation/focus. There is no pending download to resume and no offline cache configuration. Clearing site data or retrying does not change this source's intentional unavailable state.

## Dependencies and provenance

All styling is inline and fonts are system-local; no runtime script/font/image fetch is authored. No license, CREDITS, source URL, upstream pin or original-game distribution evidence is present. The sentence about the original build being online is not a grant of redistribution permission or proof of any particular upstream revision. Existing `docs/GAMES.md` and `docs/wiki/Game-List.md` record removed catalog status and pending disposition; their historical counts are stale and not used as current inventory.

## Audit findings

- **LOW**, entry `.btn.primary`, inherited purple action/rounded card and decorative icon: shell styling differs from house flat black-action guidance. This is a bounded source observation, not a subjective screenshot verdict. If the owner retains the notice, the smallest change is plain text/black native navigation styling; do not replace useful unavailable feedback with a launch animation.
- Evidence gap: no playable/legal source is available in the directory. This is intentional holding status, not a loader bug; do not label network-free notice rendering as successful Slope play.
- Non-finding: the source has no external iframe or automatic remote load. No proxy/security change is needed or allowed to make the notice load.

## Safe iteration

Keep the return link and accurate permanent-unavailable explanation. Main decides whether the orphan stays; a deletion requires full tracked/constructed-path consumer evidence, including sparse content. If a legitimate future port is authorized, verify source revision, code/assets terms, local dependency closure and actual controls before considering registration. Do not repoint to a remote iframe, reactivate `/bare/*`, invent source rights or fill this directory with an unrelated homemade substitute.

## Verification

Actually performed: complete static source read and Git-tree inventory; there is no JS to syntax-check and **zero browser/native tests** were run. Inspect without checkout using `git show HEAD:Games/Slope/index.html`. Main owns any narrow materialization. Recommended browser checks if retained: Tab focus on Back to Arcade, Enter navigation, 320px portrait/landscape card visibility, readable notice at browser zoom and no external requests. These checks verify the notice only. Because Slope is unregistered, the registered-catalog full gate will not exercise it.

## Future outlook

Week 1: owner keep/remove decision using consumer evidence. Week 2 if kept: small house-style navigation/accessibility review without pretending a game exists. Later restoration is source-first research, not a promised monthly addition; permissions and offline runnable evidence must precede a new loader. No assets, fonts, dependency install or engine fabrication is justified for this notice.
