# Basketball site listing correction, 14 November 2026

The owner reported that Basketballer was missing from the site after PR #8 had
merged. Fresh Pages metadata showed successful deployment `7766955409` of
`13c5b7e6` from `main` at repository root. The live direct game returned 200,
but `games.json` still contained 133 entries, maximum ID 245 and no basketball
row. The source merge/deployment worked; the missing catalog row hid the game
from the portal shelf, Sports, search, details and normal launch flow.

This correction registers the existing original preview as **246**,
**Steal a Basketballer (Preview)**, Sports. It adds the sitemap URL and an
original 1280×720 browser-captured JPEG thumbnail at the existing automatic slug.
No game engine, gameplay, save format, compiled portal bundle, networking or
security setting changed. Credits/contracts/manuals now reflect registration;
the old manual URL remains a pointer so historical links survive.

The catalog now has **134** entries across **140** existing projects, with six
unregistered. No new game was built or ingested. The original/private-sibling
provenance and curated-name/identity limitations remain in the credits.

## Verification

[Machine receipt](basketball-site-listing-browser-2026-11-14.json): **25 focused
checks PASS**. Normal desktop 1280×720 and phone 390×844 interactions verify the
All listing, basketball search, Sports filter, Info title/description, Info Play,
same-origin game iframe, actual PLAY and visible HUD, decoded new thumbnail,
native fullscreen and no game overflow. A natural Tyus Jones 50 signing and real
five-on-five frame produced the thumbnail; no game-state grant or image edit.

The raw collectors retain **26** legacy thumbnail 404 responses and matching
console messages across fourteen names. They are disclosed separately, not a
clean full-catalog claim. The new thumbnail/game/listing had no HTTP failure;
there were no page exceptions, failed requests, external loads or other console
errors. Servers and owned browsers closed after the bounded pass.

Catalog required fields, 134 unique IDs/URLs and Git-backed targets pass. The
existing game fixture passes dependency closure (15 local files), natural
recruit/theft/deposit/5v5/reward/reload and isolated save checks. Sitemap passes
134 game URLs plus the portal. Maintenance coverage is reconciled after the
committed source milestone. No new engine testing is claimed for this listing fix.

The historical full-catalog 123/133 certificate HOLD remains in the earlier
[receipt](capital-drive-2026-11-12.md); the full 134-game gate was not rerun.
The owner's merge-all authorization and reported missing-site goal cover this
listing correction. No smoke filters or TLS rules were weakened.

## Source and reproduction

- `96cb95d4`: catalog, sitemap, registered manual and source-status correction.
- `1fca9994`: original gameplay thumbnail, 105,705 bytes, SHA-256
  `2df99c307a8923fe33d8d197a3b10c6577f6f7fc056ead898053a4120b79d7df`.
- Source projects remain 140; source/manual status and inventory are reconciled
  separately. More than 27 GiB disk was free. The thumbnail is the only new runtime
  media asset; it depicts this original game using existing local dependencies.

```sh
node Games/StealBasketballer/tests/fixture.mjs
python3 -B scripts/check_maintenance_docs.py
python3 -B scripts/generate_sitemap.py --check
git diff --check
```

For the focused browser check, use the normal portal search/category/Info/Play
path and the real game start on desktop and phone. The original raw evidence
retains all errors; do not relabel legacy thumbnail failures as clean loading.
Pages responses observed `max-age=600`; verify the published catalog after its
normal main-branch deployment rather than assuming a browser refresh deploys code.
