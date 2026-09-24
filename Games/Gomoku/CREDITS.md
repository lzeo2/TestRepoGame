# CREDITS

- Repo: https://github.com/kevin2014123/gomoku-ai
- License: GPL-3.0 (upstream `LICENSE` shipped verbatim in this directory)
- Commit: 0da7b551af7354cdaffab9f156ecbfd3d9c01fa6
- Date: 2026-09-25

## Modifications made for offline/portal use

- Removed the external Font Awesome CDN stylesheet link (icons left as inert markup).
- Removed the three external MixKit audio files; audio elements kept as empty stubs and `playSound` now guards against missing audio, so the game runs silently offline.
- Removed the external `dummyimage.com` star-banner image and the whole GitHub star solicitation block.
- Removed the donation ("打赏") button, its agreement modal, and the "关于作者" author button/modal, plus their inline script and styles.
- Removed `window.open` reward-page navigation and the related listeners from `script.js`.
- Sound toggle now uses plain text instead of icon glyphs.
- Header replaced with inline sentence-case controls/instructions (no intro overlay, game starts on load).
- Removed emoji and one gradient from visible UI copy/styles.
