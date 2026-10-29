# Site debloat: read-only before inventory

Status: **inventory started after Wings checkpointf38ca697; no cleanup/deletion**.
Portal paths are disjoint from the ready game-source integrations. No game writer
was interrupted, browser launched, telemetry triggered or runtime code changed.
Deployed portal identity isd3dbb39e; its HTML, catalog and six relevant authored/
compiled assets match the local checkpoint byte-for-byte. This does not claim
that the newly integrated game runtimes are published.

## Actual served response-body measurements

Canonical base: `https://lzeo2.github.io/TestRepoGame/`.
Direct GET with `Accept-Encoding: gzip` and `Cache-Control: no-cache`; decoded
entity hashes match Git. Counts exclude HTTP headers/TLS overhead. This is NOT a
browser waterfall or a measurement of cache-warm behavior, rendering speed,
offline behavior or dynamic thumbnails. No third-party requests were executed.

| Measured subset | Paths | Response-body transfer bytes | Decoded entity bytes |
| --- | ---: | ---: | ---: |
| HTML/scripts/styles/one catalog response |7|158,742|570,047|
| All measured declarations including fonts/metadata |14|213,016|635,848|

The14 includes favicon, sitemap, manifest and Apple icon declarations, plus three
CSS font URLs. Not every declaration is necessarily fetched on every initial
browser visit. Likewise the real page may request thumbnails/other dynamic data
not included here. Three catalog consumers are not counted as three network
transfers: browser cache/coalescing behavior is unmeasured.

| Core file | Transfer | Entity |
| --- | ---: | ---: |
| `index.html` |11,154|57,127|
| `games.json` |9,763|39,601|
| `assets/index-CRWHmtoy.js` |104,695|328,650|
| `assets/index-CUsUGgbt.css` |6,345|26,292|
| `assets/portal-polish.css` |3,814|17,788|
| `assets/portal-ux.js` |22,065|98,218|
| `assets/portal-seo.js` |906|2,371|

Three declared local WOFF2 entities total49,076bytes. The HTML contains one
51,184-byte authored style block with300 `!important` occurrences. These counts
are inventory facts, not proof that any declaration is redundant.

## References and next candidates, not deletion decisions

- Static HTML/CSS references were resolved to tracked paths and verified over
  canonical HTTP. Full dynamic/constructed-load and sparse-excluded consumer
  tracing remains required before declaring an asset/dependency unused.
- Inspect the inline stylesheet versus the later authored polish cascade; retain
  focus, reduced motion, loading/error states, responsive rules and both themes.
  Do not add another global override layer to hide conflicts.
- Compiled shelf, authored UX and SEO each have catalog readers. Investigate
  recovery/cache/parse semantics before considering shared authored work; no
  network-saving claim follows merely from three source mentions.
- Existing fullscreen/fallback modal, observers, metadata, thumbnails and SVG
  fallback paths have alternate consumers. Ordinary launch bypass is not dead-
  code proof. Inspect callers rather than deleting whole subsystems.
- The328,650-byte minified application has no authored source here. Do not
  hand-edit it or install a new build stack for this inventory.
- Preserve games, saves, telemetry, notices, unique models/assets and all tests/
  evidence. Repository and evidence bytes are not automatically startup payload.

Raw per-file measurements/edges/limits are retained locally in
`.tmp/portal-debloat-before-20261029.json`. Before/after comparison is **pending**;
no after run, byte savings, performance win or portal usability acceptance is
claimed. No asset, dependency, model, script or stylesheet has been deleted.
