# Arcade source and browser trust review, 26 November 2026

The review found user-entered text interpreted as HTML in a game roster,
unverified browser messages reaching a level editor, and stored history
launching paths outside the current arcade catalog. All three now use the
intended input boundary. Five old game wrapper pages and one developer
translation page also lost external script dependencies.

## Coverage

The frozen baseline was `82578aaf7463f2012c09370005a8e2f0aa2b2151`. The
scanner inventoried 16,286 tracked files and 2,328,149,748 logical bytes,
including sparse-excluded files. The catalog held 136 registered titles with
distinct IDs and a tracked entry for each. There were 142 game projects
in total, plus a shared emulator runtime.

The source pass read 4,248 HTML, CSS, JavaScript, JSON, Python, shell and
TOML files (331,965,526 bytes). Of these, 3,358 files and 310,562,048 bytes
were in the game tree. It scanned large sources in chunks and withheld
matched credential values. No credential pattern matched. The remaining
12,038 files included media and engine payloads. Sixteen WebAssembly files,
30 Unity containers and 11 Flash movies received inventory coverage only.
No disassembly, exploit reproduction or testing of external services was
part of this review.

The machine pass identified 353 files with HTML-writing or dynamic-code
patterns, 350 with network APIs and 21 with literal network calls. A pattern
can occur in documentation, platform code, an IDE helper or a dormant SDK.
Human inspection followed data from its owner to the consuming operation.
The audit did not read every vendor statement or establish an absence of
vulnerabilities. The protected Character AI project received no edits.

## Verified findings and fixes

| Surface | Data path and change | Verification |
| --- | --- | --- |
| [Achtung die Kurve](../../Games/AchtungDieKurve/javascripts/script.js) | A local rider name went from the text input through the ranking array into parsed HTML. The roster now creates a row, assigns its ID and colour separately and sets its label as text. Removing a rider in the lobby formerly fired the engine's uninitialized end-of-round callback. Lobby removal now uses its roster owner, and replacement riders use the original slot's identity. | A Chromium test enters punctuation and literal angle brackets, reads the displayed name and score, removes the rider and fills the reopened slot. |
| [Arcade history](../../assets/portal-ux.js) | The recent list previously trusted a stored title and an arbitrary syntactically local game path. A registered title can move or be retired. The page now looks up the path and current name in the downloaded catalog before showing a recent button or opening its frame. Existing valid history retains its timestamps, order and eight-item cap. | The portal browser regression mixes retired paths, duplicates, stale titles and current registrations. Only current games appear, with their canonical labels. It also checks a normal launch and unrelated storage. |
| [OvO editor](../../Games/Ovo/1.4.5/ovo-level-editor.js) | Fourteen shipped copies of a level-preview message listener used the sender's origin when replying but did not check it before processing scene changes. Each now checks the origin, reply window, message kind and basic payload type before handing a preview to the editor. Other local file-import paths retain their existing behavior. | The controller regression exercises all fourteen files with ordinary local readiness and level events, an unrelated origin, opaque origin and incomplete input. |
| [Disabled proxy](../../uv/index.js) | A missing distribution already prevented initial worker registration. If the local codec config was supplied while the backend remained disabled, the launcher could request a root worker before testing its opt-in flag. A disabled launcher now returns before registration and prevents form submission. | An isolated controller test records zero worker or launch requests with either missing or present codec config. The Netlify fallback function still reports status only. |
| [Subway Surfers](../../Games/SubwaySurfers/subwaysurfers/index.html) and its [hacked counterpart](../../Games/SubwaySurfersHacked/subwaysurfers/index.html) | Direct links to two old entry files ran a separate loader, a remote analytics tag and a missing cloak script. Each old entry now redirects to its own supported local game and supplies a keyboard-accessible link. The four San Francisco Unity manifests held identical Git blobs in the baseline. | The compatibility check verifies both local destinations and the absence of third-party script tags in these wrappers. |
| OvO export helpers and [EmulatorJS translator](../../Games/_emulatorjs/data/localization/Translate.html) | Three historical SDK preview pages loaded a remote testing SDK that targeted an authoring machine. They now link to their corresponding local build. The translation utility retains its translator UI and no longer downloads analytics. | The static regression checks all four documents. The compiled game engines and shared emulator cores were left intact. |

## Follow-up from the browser sweep

Nine EmulatorJS entries issued an upstream version request on localhost. The
upstream constructor previously treated a local web server as opt-in. Both
the readable JS and the shipped minified bundle now leave that request off
unless a maintainer explicitly sets `window.EJS_CHECK_FOR_UPDATES = true`
before loading the game. Game ROMs and emulator cores retain their local paths.

The registered OvO 1.4.5 build made a second request for translations after
Construct loaded the five-language dictionary bundled with the game. It now
uses that installed dictionary. The entry also uses the generated plugin's
built-in SDK-absent path instead of loading its third-party analytics SDK.
The translation and telemetry changes cover the registered edition. Archived
alternate exports still contain independent SDKs.

At frozen commit `00d0902c`, the static rescan covered 4,263 source files
(332,125,033 bytes) and passed all 244 selected script syntax checks. The
HTML reference scan went from eight external references to two canonical
links, and from thirteen missing literal references to nine. These numbers
pre-date the later runtime startup fixes above. The two reports provide
point-in-time comparisons for the same scanner and syntax modes.

## Other reviewed boundaries

- The authored portal uses text nodes for descriptions, names, how-to
  instructions and SEO metadata. Its static icon strings come from local
  tables. Launch paths are checked before assignment to a frame. Registered
  games intentionally execute on the portal origin where many keep local
  storage, use workers or access fullscreen. Isolating untrusted third-party
  code on a separate origin would require a save migration and compatibility
  tests for each engine family. The current shared origin remains a meaningful
  trust assumption. [Player](../../assets/portal-ux.js) · [Metadata](../../assets/portal-seo.js)
- Chess Workshop's shared bot importer limits input lengths and decodes a
  declarative bot format. Display names use DOM text. Circuit Ward's
  optional peer channel checks protocol shape, message size and direction,
  and caps roster/entity counts. Tanks and Soldiers reports errors through
  text content. Footballer and Basketballer include locally stored rosters
  and templated screens. Reviewed render paths escape dynamic display names
  or select numbers and in-repository game data. These samples do not cover
  all state transitions or prove that every possible imported save is valid.
  [Bot importer](../../Games/Chess%20Workshop/bots.js) · [Peer protocol](../../Games/Circuit%20Ward/multiplayer.js)
- The Netlify status function serializes an operator-supplied `PUBLIC_BARE_URL`
  into its response. Treat that intentionally public field as public config.
  The function forwards no requests. Browser response headers in
  `netlify.toml` apply on Netlify. They do not establish what GitHub Pages
  delivers. [Function](../../netlify/functions/bare.js) · [Hosting config](../../netlify.toml)
- The initial HTML pass flagged 13 missing local resources and eight external
  references. Two of the external links are canonical page metadata. The other
  six pointed to the helper/legacy scripts addressed above. Missing references
  also included intentionally absent UV dependencies, social imagery and
  Wings authoring/source-tree files. Resolve those in their own owner before
  treating a source snapshot as a shipped runtime. Shared SDKs can construct
  further URLs dynamically. Literal scans cannot inventory all such requests.
- Selected scripts at 128 KiB or less and eligible inline scripts received
  Node syntax checks. The original scanner classified the bundled Wings entry
  as a classic script. Its tracked HTML explicitly loads it as a module. The
  scanner now honors each declared script type regardless of Git path order.
  On the same frozen tree all 252 selected syntax checks pass. Another 106
  large files exceeded the 512 KiB structural parser budget and received
  chunk-pattern review only. This count is independent of native playtests.

## Integrated release scan

The final game source at `14c5f07f` contained 16,388 tracked files. The scanner read 4,295 source files (333,435,660 bytes), including 3,377 under Games. All 248 selected syntax checks passed. No credential pattern matched. Both external HTML references were canonical page metadata. Eight missing literal references remain in archived OvO and Wings material and the disabled proxy entry. All 419 literal assets in the 135 eligible registered game entries resolved. The protected chat entry remains read-only, and the binary and large-source inspection limits above still apply.

## Reproducing the defensive checks

Use a fresh external location for the JSON report. The source scan reads the
specified Git tree. The controller and Chromium regressions use the checked-out
files. Chromium needs the existing Python Playwright installation.

```sh
python3 -B scripts/audit_site_tree.py --self-test
python3 -B scripts/audit_site_tree.py --revision 82578aaf --syntax --output /tmp/arcade-defensive-baseline.json
node scripts/test_arcade_trust_boundaries.mjs
python3 -B scripts/test_achtung_roster.py
PORTAL_TEST_PORT=0 python3 -B scripts/test_portal_refurbishment.py
python3 -B scripts/test_portal_discovery.py
```
