# Credits

## Tower of Hanoi

- Source repo: https://github.com/zym9863/Tower-of-Hanoi-Game
- License: MIT (see LICENSE)
- Commit: e4118d667f4fe522da888084e027ca0c32ad8ec8 (2025-12-19)
- Retrieved: 2026-09-24

### Modifications made

- Removed the Google Fonts `@import` (external CDN request) and switched to the system sans-serif stack.
- Removed the CSS gradient background pattern and the gradient on disks, replaced with solid colors.
- Moved an inline instructions paragraph into a visible header (sentence case).
- Translated the visible Chinese UI copy (labels, buttons, move counter) to English.
- Replaced blocking `alert()` dialogs (win and invalid input) with an inline status message.
- Added click/tap-to-select-and-drop interaction so the game works on touch devices (drag and drop kept for mouse).
- Removed Open Graph/Twitter meta tags that referenced external image URLs.
- Raised disk height to 44px for the touch target rule.
- Kept all original game logic intact.
