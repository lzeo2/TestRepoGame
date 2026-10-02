<!-- maintenance-game: Games/WordLadder -->
# Word Ladder maintenance

## Identity and status

Registered ID 188, category `word`, not featured; `Games/WordLadder/index.html` is the entry. Two files total 24,795 bytes at `8c8a055`. This ingested graph puzzle embeds its dictionary and all JavaScript/CSS. No runtime network dependency was found; native play was not run here.

## Implementation map

Source review coverage: complete HTML, inline dictionary, graph/generation/input/render code, CSS and `LICENSE`. There is no unread minified engine. One strict IIFE owns everything. `buildNeighbours()` groups four-letter words by wildcard buckets; `largestComponent()` chooses a connected component. `bfsFrom()` computes distances/parents. `puzzleFor(seed)` combines `fnv1a32()` and `mulberry32()` and searches for targets at distance three to five, falling back to two to six. `newLadder()` retries generation ten times before exposing an error.

`fold()` strips nonletters, normalizes combining accents and caps input to four characters; `normalise()` attempts to preserve selection. `commit()` validates dictionary membership, exactly one differing position and no repeated chain word. `rungEl()` creates text spans and changed-letter accessible labels. Anchors: `#playForm`, `#word`, `#chain`, `#chainbox`, `#target`, `#msg`, `#status`, `#undoBtn`, `#endOverlay`.

## Gameplay and controls

Start game produces a solvable start/target pair with displayed best-possible move count. Type a four-letter word and Submit or Enter; each valid step must change exactly one letter from the current top. Undo removes the last step before completion. Repeated words and unknown words produce live validation messages without consuming moves. Reaching target within twelve moves wins; the twelfth nontarget step loses. End screen offers New ladder/Menu. Fewer moves is better, but source does not permit a result below mathematical par. Pointer/touch use input and native buttons, not a letter-grid arrow scheme. IME composition events suspend normalization during composition. There is no audio.

## State and persistence

`WORDS`, `NBR`, `COMP`, `WORDSET` initialize once. `PUZ`, `START`, `TARGET`, `par`, `chain`, `over`, `seedCount` own the session. Only uppercase chain words are rendered; graph lookups use lowercase. `composing` tracks input-method state. No localStorage keys, daily/streak/share state, timers or animation loops remain. Reload loses the current ladder. Undo is disabled after win/loss; Menu sets `over=true` and returns to Start.

## Dependencies and provenance

MIT `LICENSE` names Kairui Ying. Entry and [sources_8](../../catalog_parts/sources_8.md) cite `https://github.com/yinggarykairui/word-ladder`, with curated dictionary ingestion described. Neither record supplies a pinned revision; pin is unknown. Historical word-count/byte-identity claims were not independently compared upstream in this audit. Runtime requires only DOM, Unicode normalization and standard JavaScript; do not infer a remote dictionary from the title.

## Audit findings

- **MEDIUM**, `index.html`, `playForm` submit listener and `commit()`: composition tracking protects input normalization, but submission does not inspect composition state or the triggering key's `isComposing`. `commit()` immediately sets `composing=false`. Candidate acceptance with Enter on some input methods could submit a partial word. Status: source-backed risk, native IME reproduction pending. Minimal fix: block submission while composition is active, preserving normal native form submission after composition ends.
- **MEDIUM**, `index.html`, `#endOverlay`: focused New ladder is not a modal focus boundary; Menu and other background controls can remain reachable. Root fix: native dialog or inert background, with correct focus restore to `#word`/Start.
- **LOW**, `index.html`, `buildNeighbours()` complexity comment: bucket construction is linear in words, but pair enumeration inside buckets is quadratic in bucket size. This is a bounded embedded dictionary, not a measured performance defect. Correct complexity wording before enlarging the dictionary; no new abstraction is needed.

## Safe iteration

Keep graph and validator dictionaries identical, and generation confined to connected words. Fix composition at the shared submit boundary rather than disabling text normalization altogether. Preserve live `#msg` feedback and changed-letter labels. Adding persistence requires saving seed/chain and revalidating every restored edge, not trusting raw saved DOM. No runtime edits are part of this assignment.

## Verification

Actually run: inline-script parsing, source/catalog identity and documentation assertions; [batch audit](../audits/games-66.md). Native checks: zero. Recommended checks: follow a BFS-derived valid path, invalid word/duplicate/two-letter rejection, undo, twelve-move loss, target on move twelve, generation failure feedback, IME Enter and mobile software keyboard. Historical short test tried an inadequate candidate-search algorithm and accepted no step; it is not evidence of a broken validator or a completed game.

## Future outlook

First obtain the source pin and verify a complete native solve plus IME behavior. Week-two refurbishment should improve result focus and phone input without altering graph rules. Defer daily ladders, saved streaks and sharing until seed stability, local storage validation and explicit offline product scope are established.
