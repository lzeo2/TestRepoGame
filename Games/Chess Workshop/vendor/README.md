# Chess Workshop dependencies

Chess Workshop uses chess.js for legal moves and Stockfish.js for local analysis.
Both load from this directory. The browser worker does its searches without a
server or a subscription.

## chess.js

The ESM file and source map come unchanged from the [chess.js 1.4.0 package](https://registry.npmjs.org/chess.js/-/chess.js-1.4.0.tgz).
The rules library is by Jeff Hlywa and contributors. Its package metadata
identifies revision [ce1ff9e9fc342984ff75ca475ab39f37888cb28a](https://github.com/jhlywa/chess.js/tree/ce1ff9e9fc342984ff75ca475ab39f37888cb28a).
The BSD 2-Clause license is included in [chess.js.LICENSE](chess.js.LICENSE).
The npm tarball integrity is `sha512-BBJgrrtKQOzFLonR0l+k64A98NLemPwNsCskwb+29bRwobUa4iTm51E1kwGPbWXAcfdDa18nad6vpPPKPWarqw==`.

## Stockfish.js

Stockfish 17.1 Lite WASM is by the Stockfish developers. The JavaScript port is
by Nathan Rugg and Chess.com, with the Lite net by Linmiao Xu (linrock). The
single-threaded worker and WASM are unmodified files from the
[stockfish 17.1.0 package](https://registry.npmjs.org/stockfish/-/stockfish-17.1.0.tgz)
and correspond to [upstream revision 602fd7e1a571a2be71f242942db90483731f2a1f](https://github.com/nmrugg/stockfish.js/tree/602fd7e1a571a2be71f242942db90483731f2a1f).

- [GPLv3 license](stockfish.COPYING)
- [Stockfish contributors](stockfish.AUTHORS)
- [Corresponding source archive](stockfish-17.1-lite-source.tar.gz)

The source archive contains the pinned C++ sources, Emscripten JavaScript glue
and build files, NNUE build scripts and the exact Lite network
[`nn-9067e33176e8.nnue`](https://tests.stockfishchess.org/api/nn/nn-9067e33176e8.nnue).
The archive excludes the upstream precompiled variants and sample web pages.
To compile the included variant, unpack the archive and run
`node build.js --lite --single-threaded --no-split` with GNU Make and Emscripten
3.1.7 on the path. The upstream script optionally uses `uglify-js` for outer
loader minification. The vendored NNUE file permits rebuilding without
downloading a net. The project uses the published binaries, whose hashes are
recorded below.

The npm tarball integrity is `sha512-LvxdOzngaMjwdDKkZML4riABX9EWUkIE2ZJUsNvR2yFnM4WLiM6ggEXcBY8v53dK7uAfbxdJFcBiKTIQyGg6Zg==`.

| File | SHA-256 |
| --- | --- |
| `chess.js` | `76c7c34f0e2e9ab076521a5d6fe786a9cce537bb1b6f29d32a9c9970b5b232d2` |
| `chess.js.map` | `2a9afbda2477e80182786555b0bbb03d66d33d425e90d61c087b51fa0e8e3b20` |
| `stockfish-17.1-lite-single-03e3232.js` | `1c8265e52fdaef797684b4979b42c5dcfe0350df3e11a87e48e4ec5f86e0ca5c` |
| `stockfish-17.1-lite-single-03e3232.wasm` | `7ca31bedd166148931a1cc84dbd8dd9cf001744e9994caf23a3c6ff4988d7086` |
| `stockfish-17.1-lite-source.tar.gz` | `9211634ae9c9c05a257f745af9f0da4478a9789ffee08ecc9d2c3fd7922a06b8` |
| `nn-9067e33176e8.nnue` in the source archive | `9067e33176e8c5edb7aa8db6a3aedd012f84a1f39872e86357c6c2d0993f314d` |
