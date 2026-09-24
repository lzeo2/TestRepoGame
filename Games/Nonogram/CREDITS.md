# Credits

## Nonogram

- Source repo: https://github.com/monkeyArms/nonogram
- License: MIT (see LICENSE, upstream file text starts with "The MIT License")
- Commit: a61efe2cb85452417fcdcdb6e2399eb4f7bd45b1 (2019-12-09)
- Retrieved: 2026-09-24

### Modifications made

- Removed the Google Fonts `<link>` (external CDN request) and switched font stacks to `sans-serif`.
- Removed the Wikipedia and GitHub icon links from the header (external links).
- Added an inline instructions paragraph and a score line (filled cell count, solved state) under the header.
- Added a small score/status script in `index.html` that reads the rendered grid (no changes to the upstream game bundle).
- Stripped the `sourceMappingURL` comment from `dist/nonogram.min.js` (the `.map` file is not shipped).
- Shipped only the runtime files: `index.html`, `dist/nonogram.min.js`, `dist/themes/default/`, `example/css/`, `example/images/`. Source, webpack config and package files were not copied.
- All upstream game logic (creator, puzzle, solver, GUI) is unchanged.
