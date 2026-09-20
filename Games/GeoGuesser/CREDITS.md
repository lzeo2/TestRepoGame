# GeoGuesser (offline variant)

Offline rewrite of the GeoGuesser concept for the UNBLOCKMATH // ARCADE catalog.
All gameplay logic, locations, scoring, map, and the offline BroadcastChannel
multiplayer path are original code written for this repo.

## What changed for offline

Earlier versions loaded the Google Maps JavaScript API at runtime and used
Google Street View tiles for the clue pane. That violated the repo's
offline-first policy (and the API key had leaked into the repo). The current
build removes all third-party runtime fetches:

- Google Maps JavaScript API loader: removed.
- Supabase Realtime client + WebSocket traffic: removed (was used for
  cross-device room sync). Cross-tab sync on the same origin still works via
  `BroadcastChannel` plus the `localStorage` 'storage' event fallback.
- The bundled `streetview.jpg` is now the single static clue photo shown in
  the street-view pane (no 360° panning, no navigable panorama). The round
  tag (e.g. "EASTERN SEABOARD") and the round title remain the primary
  geographic clues; the map is the answer input.
- The unused vendored `supabase.min.js` was removed.

## Why no Supabase / cross-device rooms

The site deploys as a static bundle (Netlify `publish = "."`) with no backend.
Re-enabling Supabase Realtime would (a) require shipping a runtime API key in
the bundle and (b) re-introduce a network dependency that breaks the offline
contract. Cross-tab sync is enough for a same-device classroom demo.

## Permission / licensing

Original Google Street View tiles belong to Google. None are loaded anymore,
so no attribution is required. The Supabase JS client was MIT-licensed; it
is no longer vendored.
