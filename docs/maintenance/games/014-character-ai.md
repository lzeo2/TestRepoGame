# Character Alsen maintenance

<!-- maintenance-game: Games/Character AI -->

## Identity and status

Registered id 14, catalog title Character Alsen, category `riddle`, entry `Games/Character AI/Alsen.html`. Four tracked files occupy 647,694 bytes at `8c8a055`. The entire game directory is protected READ-ONLY. This documentation reports defects; it grants no patch permission. This is a scripted local chatbot, not a hosted model, account service or networked character application.

## Implementation map

Source review coverage: all 569 lines of `Alsen.html`, including inline CSS, response tables and JavaScript. Sibling `Ian.html` and both image binaries were inventoried but not human-reviewed; findings here are not certification of Ian. Main anchors: `#chatArea`, `#userInput`, `#statusText`, `#typingIndicator`, `#interactionCount`, `#personalityHint`. Send calls `handleInput()`, chips call `quickCmd()`, and Enter is bound through `keypress`. `detectIntent()` tests personality phrases first, then ordered keyword tables, then questions/sentiment. `generateResponse()` selects canned text and name-memory/fallback branches. `addMessage()` constructs avatars, bubbles and timestamps; `withPersonality()` decorates responses with a rotating phrase and random style.

## Gameplay and controls

Type and send, press Enter or click hello/joke/mood/help/exit chips. There is no score, win or failure state: the counter counts submitted chats. A delayed reply appears after 500-1100 ms; two greetings are queued at page load. Exit words queue a second timeout that disables the text field and asks for refresh. This is a conversation session, so inventing an arcade win condition would be inappropriate. Quick-command spans and Send are click handlers, not a backend API. No audio is loaded.

## State and persistence

`state` owns interaction count, current mood, mood list, last topic, user name and phrase index. Mood changes every fifth interaction. There is no localStorage, IndexedDB or session restore in the inspected entry; refresh discards history and ends any pending callbacks. Requests are independent timeouts without a pending-response guard, so rapid submissions can generate overlapping replies. Disabling `userInput` does not disable Send or chips and `handleInput()` does not test an ended-session flag.

## Dependencies and provenance

System fonts, inline CSS/JS and the local encoded JPG filename `Screenshot_20260104_185315_Photos%20%283%29.jpg`. No runtime script/fetch service occurs in Alsen. The other local image was not examined. No bundled LICENSE, upstream URL or revision evidence was found in the four-file tree; ownership/redistribution terms remain unknown. Protected status is separate from legal clearance. Historical `batch_0.md` correctly calls this a keyword bot; the catalog's AI wording is not engine evidence.

## Audit findings

- HIGH, `Alsen.html: addMessage()`, `bubble.innerHTML = text.replace(...)`: typed user text from `handleInput()` reaches HTML directly, and names can re-enter generated bot replies. Impact is same-origin HTML/script-capable DOM injection, not a remote-model issue. Recommended safe native repro is a harmless `<b>` string and inspection for an element rather than text. Root fix, only after explicit protected-boundary approval: render user/name text with `textContent`; build intended bot formatting with DOM nodes.
- MEDIUM, `.chat-area background-image`: `url("image/svg+xml,...")` lacks `data:`, producing an invalid local asset request. Historical playtest recorded this 404. Do not repair it under this task.
- MEDIUM, `.rule-tag` and Send markup: span chips are not keyboard buttons; input lacks an explicit label and Send an accessible name. Protected approval required for semantic fixes.
- LOW, `intentPatterns.mood` versus `updateMood()`: mood templates interpolate once at initialization; replacing the literal `${state.mood}` later cannot update already-expanded strings. Report, do not edit character copy.

## Safe iteration

Never alter, move or restructure this game. Route findings to Main/operator for a decision. Any future approved safety patch should target the shared rendering sink, including both user and name-derived response callers, while preserving intentional personality content. No sanitizer dependency, remote AI replacement or wholesale rewrite is justified.

## Verification

Actually performed: source/DOM/caller review only; no native browser or screenshots. Historical `playtest_0.md` recorded Enter reply/counter and CSS 404, not injection checks. Main can read `git show 'HEAD:Games/Character AI/Alsen.html'` without materializing the folder. Recommended protected read-only native checks: harmless markup rendering, rapid input, exit then chip click, keyboard-only chips and mobile text entry. Do not interpret an allowed historical 404 as a clean loading result.

## Future outlook

First seek a protected-boundary decision for the rendering finding. Then document honest chatbot labeling and provenance through Main-owned metadata, without touching game files. Later accessibility/session-end fixes require explicit approval. Defer hosted AI, accounts, save histories and content redesign.
