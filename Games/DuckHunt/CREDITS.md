# DuckHuntJS

Matt Surabian authored this game. The arcade uses revision `5a28db7442ebc7dc8060342413df24c0319f4190` of [DuckHunt-JS](https://github.com/MattSurabian/DuckHunt-JS/tree/5a28db7442ebc7dc8060342413df24c0319f4190). The game was first ingested on 24 September 2026. Its MIT notice is in [LICENSE](LICENSE). The original project’s attribution is preserved in the HTML.

The 26 November 2026 repair rebuilt the matching main script and all eight lazy JavaScript chunks. The upstream revision commits a prebuilt main but omits its lazy chunks. Its Git tree identifies the source, webpack configuration and npm lockfile used for the rebuild. Every unchanged audio and sprite asset here matches the corresponding upstream Git blob. Asset provenance is recorded separately from software licensing. The bundle contains components with additional licenses. See [third-party notices](THIRD-PARTY-NOTICES.txt) and [webpack’s extracted notices](duckhunt.js.LICENSE.txt).

## Rebuild

In a separate checkout of the exact revision, apply the [arcade source patch](offline.patch), then use its locked dependencies. The verified build used Node 24.22.1, npm 11.9.0 and webpack 5.105.4. The lockfile has Git blob ID `199778c6165dcc8b362d2f9e7f4ba73c9d7d352c`.

```sh
git apply /absolute/path/to/Games/DuckHunt/offline.patch
npm ci --ignore-scripts --no-audit --no-fund
npm run build
```

Publish the resulting `dist/duckhunt.js`, every `dist/[0-9]*.js`, `dist/duckhunt.js.LICENSE.txt` and `dist/creator.html` together. This release omits the large developer source maps and removes the trailing `//# sourceMappingURL=…` line from each distributed script, retaining the preceding newline. Its packaged main has SHA-256 `3c6fcf540a88f1bde51a72cbe8d9694b57f35a71fa87563c421ff03a70ce2144`. The archive already contains the verified sprite/audio files and the local entry wrapper.

The patch keeps creator links under the game directory, bounds generated levels (up to 64 ducks per wave), and resets paused time for each new wave. The recognizable visual and sound assets are the previously bundled upstream files. No runtime request to GitHub, npm or a CDN is required.

## Verification

From the arcade repository run `python scripts/test_duckhunt_offline.py` with Playwright, Pillow and Chromium installed. Set `CHROMIUM` to override the browser executable and pass `--captures DIRECTORY` to keep screenshots and a receipt. The test shoots a visible duck in a regular level, opens the creator and plays a custom level while blocking external requests.
