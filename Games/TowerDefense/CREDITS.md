# Credits: Tower defense

- Source repo: https://github.com/oldj/html5-tower-defense
- License: MIT (see LICENSE), copyright (c) 2017 oldj
- Commit: e3e009c7673121e98d6ff02c85fb442c774b6391
- Date ingested: 2025-09-24

## Files shipped

- index.html (adapted from build/td.html)
- td-pkg-en-min.js (unmodified build/td-pkg-en-min.js)
- favicon.ico (unmodified)
- LICENSE (upstream License.md)

## Modifications

- Switched the page from the Chinese bundle to the English bundle (td-pkg-en-min.js).
- Rewrote visible page copy in English, sentence case (title, loading text, canvas fallback text).
- Added a visible inline header with controls and rules instead of any overlay.
- Removed the external footer links (about, source, blog) so nothing loads or links out.
- Added minimal touch glue: taps on the canvas are translated to the clicks the game already handles.
