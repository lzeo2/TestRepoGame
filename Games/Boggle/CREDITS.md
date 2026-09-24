# Boggle credits

- Upstream: https://github.com/mohdraqeeb3210/boggle
- License: MIT (see LICENSE)
- Upstream commit: 70a271d037905f7b0a70b7f8f1d5c2ef191e3489
- Date ingested: 2025-09-24

## Modifications made

- Removed emoji from the title, timer line and status messages.
- Replaced the radial-gradient page background with a flat color.
- Removed uppercase transform from the current-word and found-word displays so no all-caps copy ships; grid letters stay uppercase as in classic Boggle.
- Added keyboard input: type letters to build a word, Backspace edits, Escape clears, Enter submits (validated against a connected path on the grid).
- Documented controls inline in the intro line; raised the button to a 44px minimum touch target.
- No external scripts, fonts, fetches or trackers were present.
