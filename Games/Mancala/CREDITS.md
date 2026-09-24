# CREDITS

- Repo: https://github.com/99fk/mancala-html
- License: GPL-3.0 (upstream `LICENSE` shipped verbatim in this directory)
- Commit: 67b4573f8171863ba66b991f221b63f6b0b990c5
- Date: 2026-09-25

## Modifications made for offline/portal use

- Upstream was already a single self-contained offline HTML file (WebAudio sound, data-URI favicon, no external requests). No assets stripped.
- Removed `text-transform: uppercase` from section titles (all-caps tell).
- Added `min-height: 44px` to buttons/selects for touch-target compliance.
- Added inline sentence-case controls/instructions line in the header (game already starts on load, no intro overlay upstream).
- Draw status now shows the word "Draw" instead of an em-dash.
- Tidied an em-dash inside an inline code comment.

No other game logic was modified.
