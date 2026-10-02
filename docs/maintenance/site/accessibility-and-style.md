# Portal accessibility, style and metadata

<!-- maintenance-site: accessibility-and-style -->

Source `8c8a055`. Read [portal features](portal.md), [browser state](browser-state.md) and [findings](../audits/portal.md). Main owns design decisions and subjective screenshot review. This page records selectors, implementation and the exact scope of automated evidence, not accessibility certification.

## Cascade and safe patch surfaces

Root stylesheet order is `assets/index-CUsUGgbt.css`, the large `index.html` inline block, then `assets/portal-polish.css`. The last file supplies current theme-qualified overrides. Historical comments saying the inline Phase 3 block has the final word or that pills stay 999px are superseded by polish. It sets `--radius: 6px` and `--radius-lg: var(--radius)`; secondary controls use `calc(var(--radius) - 2px)` (4px). Do not diagnose live UI from an earlier declaration alone.

The authored shelf uses solid surfaces, black action buttons, no gradients/glow and no theatrical animation. `html[data-theme] .app *` suppresses animations, transitions and background images; card transform/opacity overrides freeze motion-library card effects. The reduced-motion block additionally affects all elements/pseudo-elements and disables smooth scroll. `animateCategoryChange()` still toggles `is-filtering` for 260ms and timers/random-ready classes still run, but the final visual layer suppresses their animation. Removing source routines requires consumer evidence and separate runtime scope, not aesthetic dislike.

Tokens are `--ink`, `--slate`, `--paper`, `--white`, `--muted`, `--hacked`, theme `--bg`, `--bg-card`, `--text`, `--text-h`, `--text-muted`, `--border`, `--tile`, `--focus`. Light uses ink on paper/white; dark uses white/muted light text on ink/slate. `--sans` and `--heading` select local fonts. Make a bounded change in polish, then inspect computed style in both themes. Adding another global override stack makes ownership harder and should not be the default refurbishment.

## Responsive shelf and touch targets

Desktop `.app` is at most 1400px with 24px padding; header grid is logo/search/44px theme button. `.bento-grid` is four columns with 16px gaps. Featured/standard wrappers use `display: contents`, creating one continuous shelf while preserving their DOM/state partitions. At 900px the header becomes two rows, app padding becomes 16px and cards use two columns. At 479.98px app padding becomes safe-area-aware, sort/tag rows stack, grid becomes one column and each card becomes a 96px thumbnail plus flexible body.

Titles use a two-line clamp, wrapping and minimum height (desktop 45px, phone 40px); descriptions are hidden on the shelf and available in details. Category badges move into the thumbnail. Non-hacked card tags are hidden; when Hacked exists the category is hidden, avoiding overlapping badges. Real art fills the thumb with `object-fit: cover`. For missing art, `applyCardMetadata()` sets `data-initial` and CSS `:not(:has(img))::after` displays the first title letter; injected SVGs are hidden. Browser support for `:has()` is therefore part of the current presentation baseline, not an optional polyfill.

At 768px and below `.category-filter` scrolls horizontally with a visible thin scrollbar and nonshrinking 44px chips; it intentionally overflows its own viewport, not the document. Top-level tag pills wrap in the final polish layer. Recently played retains a horizontal scrolling row with hidden scrollbar from inline CSS; do not assume it has the same discoverability as categories. Controls including Play, favorite/info, theme, categories, tag pills, recent chips, detail close and modal links have 44px targets through the combined layers. A target declaration is not proof that all overlays are reachable on every device.

## Focus, landmarks and keyboard contracts

`index.html` provides `.skip-link` to `#main-content`, a visually hidden native `h1.site-h1` and `#root`. React renders `main#main-content` with `tabIndex=-1`; `ensureMainTarget()` only adds a fallback if missing. `ensureSkipLink()` binds focus to that target. `applyGrouping()` also marks the visible `.app__logo-text` span as `role=heading aria-level=1`, so the current page exposes both a native and an ARIA level-one heading. This duplication is a review item, not evidence that the H1 is absent.

`applyCardMetadata()` gives article cards `tabindex=0`, `role=button`, a title/category/Enter label and arrow/Enter shortcuts. Nested Play, favorite, info and some badge buttons remain separately focusable; test screen-reader output for this composite structure rather than claiming one simple native button. Card arrows use `visibleCards()` and geometry, while the bundle separately routes arrows from Play/favorite buttons. Hidden-filter candidates require particular attention in the compiled route, which reads all matching buttons rather than the UX visibility helper.

Polish gives 2px visible outlines using `--focus` for buttons/anchors/selects/tabindex elements. The search input's own outline is suppressed; the `.search-bar:focus-within` ring supplies its visible indicator. `/`, Home/End, Enter/Space and `i` are authored shortcuts; Tab remains browser-native. Enter on a card launches, it does not open the info dialog. Escape clears search or closes fallback game/detail dialogs according to current focus/listeners.

Detail dialog has `role=dialog`, `aria-modal=true`, `aria-labelledby=ux-detail-title`, initial Play focus, Tab cycling and focus restoration. The background is not made inert and the page is not scroll-locked by `openDetailPanel()`. The fallback game modal adds its own dialog focus trap/body overflow through compiled `Wu()`, with `syncModal()` preventing duplicate wrapper dialog roles. No screen-reader/native mobile dialog pass was run by this worker.

## Text safety and states

React renders titles/categories/descriptions as children, not raw HTML. UX uses `textContent` for catalog metadata, labels and recent chips. Its `innerHTML` sites create constant SVG/loading fragments, including `GAME_ICONS`/`CATEGORY_ICONS`; do not label them catalog XSS solely because the property occurs. Keep external/user data out of those constants. Invalid recent object shapes remain a crash issue independently of text safety.

`.ux-result-status` and `.ux-net-banner` are polite live status regions. The banner says loaded games **may** still work and uses navigator online/offline events; it does not promise asset cache completeness. Iframe loading UI has `aria-busy` and load/error status but cannot detect all engine failure states. Error styling exists, yet no retry control is rendered. Reduced motion preserves status/error information instead of hiding necessary feedback.

## Local fonts and source assets

`portal-polish.css` has three `@font-face` declarations with `font-display: swap`: Bungee 400 for display/initials and Atkinson Hyperlegible 400/700 for text/controls. URLs are under `assets/fonts/`, not Google Fonts runtime endpoints. The local OFL texts name The Bungee Project Authors (2023) and Braille Institute of America, Inc. (2020). Both are SIL Open Font License 1.1. [Font evidence](../../portal-font-sources.md) records official source family URLs, license snapshot revision and exact binary hashes; that revision pins notices, not a claimed WOFF2 build. This pass recomputed all three hashes and matched that evidence.

Latin subsets do not cover every language/glyph; CSS fallback remains necessary. No font binary conversion or dependency installation occurred. The old system-font-only README was inaccurate. Font licensing does not authorize game thumbnails, `portal-share.png`, legacy social SVG symbols or game art. `THUMBS` is a local title-to-file map and several variants intentionally reuse a base image; its old count comment is not an inventory. Confirm image provenance separately before claiming rights or changing supplied content.

## Metadata and sharing boundaries

Root title is `UNBLOCKMATH // ARCADE`; description and OG title/description match browsing game/genre/players. OG image points to `./assets/portal-share.png` with 1200x630 metadata and an alt description; Twitter uses `summary_large_image`. Favicon is local `favicon.svg`, a dark rounded tile with a white U mark. `meta color-scheme` updates on theme, while `meta theme-color` remains static `#101820`. No canonical/OG URL or deep-link handler is supplied here.

These are metadata hints. A deployed social crawler may require an absolute image URL; this was not crawler-tested. No copy-link button, navigator.share call, URL-state sharing or density toolbar exists in the inspected portal source/application tail. Do not invent those features from generic library clipboard/observer tokens. The root does not link a PWA manifest or register a caching service worker.

## Evidence and next review

Actual `scripts/test_portal_review.py` passed: 1280px desktop and 390/320px phones, light/dark, local font loading, radius values, selected token contrast at least 4.5:1, category counts, tag intersections, shelf geometry, 44px controls and overflow assertions. Screenshots were produced, not subjectively judged by this worker. Contrast checks sample computed tokens/active chips, not every text-on-image state. Recommended Main review: keyboard/screen-reader traversal, duplicate heading semantics, details at 200% zoom, short landscape viewport, recent row discovery, high-contrast settings and reduced-motion interaction. Keep those as pending native/subjective checks until actually run.
