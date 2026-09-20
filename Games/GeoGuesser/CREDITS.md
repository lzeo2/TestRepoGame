# GeoGuesser (WorldGuessr embed)

This catalog entry now serves [WorldGuessr](https://www.worldguessr.com) by
codergautam, embedded in a full-viewport iframe. WorldGuessr is a free
GeoGuessr-style game using real Google Street View panoramas, with solo and
multiplayer modes. All gameplay, assets, and infrastructure belong to
codergautam's WorldGuessr — this wrapper only frames it.

## History

- Earlier: original offline implementation with a bundled clue photo and a
  world-map guessing mini-game (see git history, `65f5806`).
- Before that: a Google Maps Street View + Supabase Realtime build, which was
  removed because an API key leaked into the repo (`6f4d304`).
- Now: direct embed of WorldGuessr, per the repo's decision to drop the
  offline-first policy. Requires internet.

## Licensing

WorldGuessr is codergautam's project (open source at
github.com/codergautam/worldguessr). Google Street View imagery remains the
property of Google and is loaded by WorldGuessr itself, not by this repo.
