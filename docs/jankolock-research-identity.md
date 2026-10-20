# Jankolock: Deadlock identity research

Delegation #1, research only. Accessed **2026-10-20 UTC** using the current
`openai-codex/gpt-6.1-sol` session with `xhigh` reasoning. No other model or
subdelegation was used. Command findings and ongoing progress are recorded in
`.swarmforge-logs/jankolock-01-identity.log` (ignored, not committed).

## Finding

**The claimed “1991 Brøderbund DOS Deadlock maze shooter” is unverified. Do not
repeat that year, publisher, platform or genre as established provenance.**
The verified Valve game and the verified Accolade game are different candidates;
neither establishes that identity or an intended puzzle-game reference.

No identifiable existing game or remix named **Jankolock** was established by
the bounded searches below. That is not proof of originality, name availability,
trademark clearance or an exhaustive search of historical releases. The local
`docs/jankolock-provenance.md` describes an operator-ordered original mechanics
remix, not an ingested port; that document is project context, not independent
historical evidence.

## Candidate comparison

| Candidate | Evidence established | Fit and remaining uncertainty |
| --- | --- | --- |
| **Deadlock, Valve, Steam app 1422450** | Valve is developer and publisher. The primary store description calls it a multiplayer game in early development. Official announcements describe heroes, bullets and a rocket launcher. | The contemporary hero-shooter/MOBA candidate is real. Nothing inspected connects it to a historical DOS maze shooter or makes it a source for a puzzle design. The operator's intended reference remains unresolved. |
| **Deadlock: Planetary Conquest, Accolade, 1996** | Current Steam/GOG catalogs agree on the year and Accolade. The archived original Accolade site describes colony/resource management, turn-based gameplay and Windows requirements. | A verified historical namesake, not evidence for a 1991 Brøderbund DOS maze shooter. Storefronts disagree on the exact release date. No Jankolock relationship was found. |
| **Claimed 1991 Brøderbund DOS maze shooter** | No primary title record, manual, credits, box or publisher entry establishing this combination was located. Two primary Brøderbund catalog OCR texts produced no `deadlock` or `dead lock` matches. | **Unsupported, not conclusively disproved.** One catalog covers education in spring 1991; the other is earlier and covers Commodore/Atari. Neither is a complete 1991 DOS entertainment catalog. Do not silently substitute the 1996 game as a correction. |
| **Other archival Deadlock matches** | Archive metadata identifies a 1990 Housebreakers item as a **C64 Demo** and an undated item as an Amiga musicdisk collection entry. | Metadata-only leads, not inspected original programs and not evidence for the claimed game. Matching titles alone are insufficient. |
| **Jankolock / Deadlock remix** | No exact Jankolock title was identified in checked Steam, itch.io, GitHub repository or Internet Archive searches. | Search coverage is limited. No creator, source revision, license or documented connection to either verified Deadlock was established. |

### Why not infer a puzzle source from the hero shooter?

The Valve store's “MOBA,” “Third-Person Shooter” and “Hero Shooter” labels appear
under **“Popular user-defined tags.”** They are community classification, not
publisher-authored proof of specific mechanics. The publisher-authored text and
official announcements independently support a multiplayer game with combat
heroes. They do not identify a maze-puzzle predecessor, a block-pushing ruleset
or any relationship to Jankolock. A shared title or the word “remix” cannot supply
that missing connection. Ask for the intended game's URL, screenshot, credits
or manual before attributing a puzzle ruleset to a particular Deadlock.

## Verified primary and commercial catalog sources

Short quotations below reproduce source text, with whitespace collapsed where
needed. HTTP status refers to this research session, not continuing availability.
No game binary, image, model, PDF or browser artifact was saved.

### V1. Valve Steam store and structured catalog

- [Steam product page](https://store.steampowered.com/app/1422450/Deadlock/?l=english),
  **HTTP 200**. Text: “Developer Valve Publisher Valve”; “Deadlock is a
  multiplayer game in early development.” Also: “Deadlock is still in early
  development stages with lots of temporary art and experimental gameplay.”
- [Steam appdetails API](https://store.steampowered.com/api/appdetails?appids=1422450&l=english),
  **HTTP 200**. Returned `"developers":["Valve"]`, `"publishers":["Valve"]`,
  `"coming_soon":true`, release date “To be announced,” and genre “Action.”
  The `website` field was present with value `null`, so the API was not used
  as proof of a separate website link.
- The page describes access as “currently limited to friend invites via our
  playtesters.” This is the accessed listing's state, not a verified launch
  date or a claim about every later build.

### V2. Deadlock website and Valve announcements

- [playdeadlock.com](https://www.playdeadlock.com/), **HTTP 200**, redirected to
  [City Never Sleeps](https://www.playdeadlock.com/cityneversleeps). HTML title:
  “Deadlock - City Never Sleeps.” The HTML was a React shell, not a rendered
  gameplay description. Its linked
  [main JavaScript](https://www.playdeadlock.com/public/javascript/react/main.js?v=NQscr-1zzsWk&l=english&_cdn=fastly)
  also returned **HTTP 200**, beginning “(c) Valve Corporation. Use is governed
  by the terms of the Steam Subscriber Agreement”. It was inspected as text
  in memory only, not executed or vendored.
- [Publisher-announcement API](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1422450&count=3&maxlength=1300&feeds=steam_community_announcements),
  **HTTP 200**. Filtering to `steam_community_announcements` avoids treating
  syndicated news outlets in the unfiltered API as Valve sources.
  “Paint the Town” says Violet's Living Ink “empowers her bullets” and calls
  Nurse Harrow the “final hero” in that update. “Fairfax Industries Employee
  Spotlight” describes Deadman Danny “Wielding a rocket launcher”. These are
  primary combat/hero evidence, not evidence for a historical puzzle game.
- `https://www.valvesoftware.com/en/games` returned **HTTP 200** but redirected
  to the corporate homepage. It did not provide a useful games catalog in
  the extracted text and was not used to establish the genre.

### H1. Planetary Conquest, current product catalogs

- [Steam app 328440](https://store.steampowered.com/app/328440/Deadlock_Planetary_Conquest/?l=english),
  **HTTP 200**. “Developer Accolade, Inc.”; current “Publisher Atari,
  Nightdive Studios”; “Release Date: 1 Jan, 1996”. Authored description:
  “Explore new planets, exploit their resources to the fullest, and manage
  the growth of a space colony.” Current publisher fields must not be
  misreported as the original 1996 publishing arrangement.
- [GOG product catalog](https://www.gog.com/en/game/deadlock_planetary_conquest),
  **HTTP 200**. “Genre: Strategy - Turn-based - Sci-fi”; “Company: Accolade /
  Atari”. The HTML release-date template contains
  `1996-08-14T00:00:00+02:00`, unlike Steam's January 1 date.
  **1996 is corroborated; the exact original release day is unresolved.**
  GOG is a commercial distribution catalog, not a contemporary 1996 document.

### H2. Original Accolade product site, archived

- [Archived product index](https://web.archive.org/web/19980201100853id_/http://www.accolade.com/products/deadlock/index.htm),
  **HTTP 200**. It contains frames `nav.htm` and `main.htm`; the index alone
  supplies no readable gameplay description.
- Following its links returned the
  [main frame](https://web.archive.org/web/19980201102145id_/http://www.accolade.com/products/deadlock/main.htm),
  **HTTP 200**, with “Copyright” and “1996, 1997 Accolade Inc.”
- The linked
  [product home](https://web.archive.org/web/19980201111236id_/http://www.accolade.com/products/deadlock/home.htm)
  returned **HTTP 200** after Wayback selected that capture. Actual text:
  “Explore new planets, develop their resources to the fullest, and fully
  manage the growth of a space colony”; “Turn-based gameplay with optional
  real-time play”; “Requires: Windows 3.1, Windows 95 or Windows NT”.
  This is archived publisher-authored product material, stronger identity
  evidence than an unattributed retrospective. It does not establish a
  1991 DOS version or an exact original release date.

### B1. Brøderbund spring 1991 education catalog

- [Catalog metadata](https://archive.org/metadata/Broderbund_Software_for_Education_Catalog_Spring_1991),
  **HTTP 200**, identifies creator “Broderbund Software, Inc.”, date “1991”
  and title “Broderbund Software for Education Catalog (Spring 1991)”.
- [Catalog OCR](https://archive.org/download/Broderbund_Software_for_Education_Catalog_Spring_1991/Broderbund%20Software%20for%20Education%20Catalog%20%28Spring%201991%29_djvu.txt),
  **HTTP 200** after redirect to Archive storage. Actual text: “Welcome to
  our spring catalog.” It discusses “The New Print Shop Network Edition for
  the IBM/Tandy” and educational products. Case-insensitive literal counts:
  `deadlock: 0`, `dead lock: 0`.
- OCR body: 73,515 bytes; SHA-256
  `dd7e791115322a5b8ac1993a70325e259aef4cd997d4ab7fd1a868d2e25db359`.
  **Limit:** original publisher artifact hosted by an archive, inspected
  through OCR only. No visual scan review; OCR can miss words. Education
  coverage is not an exhaustive entertainment-release list.

### B2. Earlier Brøderbund general catalog

- [Catalog metadata](https://archive.org/metadata/vgmuseum_broderbund_broderbund-catalog3)
  and [OCR](https://archive.org/download/vgmuseum_broderbund_broderbund-catalog3/broderbund-catalog3_djvu.txt),
  both **HTTP 200**. Text begins “FOR COMMODORE AND ATARI COMPUTERS” and says
  “All prices are valid through December 31, 1986”. It explicitly lists
  “LODE RUNNER” and other entertainment titles. Literal counts:
  `deadlock: 0`, `dead lock: 0`.
- OCR body: 29,640 bytes; SHA-256
  `d683b04c9364fdf8318597ede1ec2e7664349acef4761350b806ad412f69690f`.
  **Limit:** this is not a 1991 DOS catalog. Its missing title cannot refute a
  later release. The museum/archive is the custodian, not the game's publisher
  or a grantor of redistribution rights.

## Name search and discovery limits

These are discovery checks, not primary proof that a game never existed.

| Exact request | Access and observed result |
| --- | --- |
| [Steam: Jankolock](https://store.steampowered.com/search/?term=Jankolock&l=english) | **200**: “0 results match your search.” |
| [itch.io: Jankolock](https://itch.io/search?q=Jankolock) | **200**: “2 projects match”, but the returned titles were **Koppy Kopsocks (DEMO)** and **Peter Dan the Dungeon Man**, not Jankolock. Their listed creators were `jackalocked` and `jacklockerbie`. Do not report this as two Jankolock games or as a literal zero-result response. |
| [GitHub repositories: Jankolock](https://api.github.com/search/repositories?q=Jankolock) | **200**: `total_count: 0`, `incomplete_results: false`. Repository search is not an exhaustive code, private-repository or web search. |
| [GitHub repositories: Deadlock remix](https://api.github.com/search/repositories?q=%22deadlock%22+%22remix%22&per_page=10) | **200**: `total_count: 0`, `incomplete_results: false`. No named connection established. |
| [Internet Archive: Jankolock](https://archive.org/advancedsearch.php?q=jankolock&fl%5B%5D=identifier%2Ctitle&rows=10&output=json) | **200**: `numFound: 0`. Archive metadata coverage only. |
| [DOSGames: Deadlock](https://dosgames.com/listing.php?terms=deadlock) | **200**: returned **Ukraine Deadlock**, “2024 Freeware Simulation / Strategy Pasi Toivonen”, not the claimed 1991 title. This is a secondary curated catalog, not Brøderbund evidence. |
| [MobyGames title search](https://www.mobygames.com/search/?q=deadlock) | **403 Forbidden**. No content verified. |
| [Google exact Jankolock query](https://www.google.com/search?q=%22Jankolock%22) and [claimed-history query](https://www.google.com/search?q=%22Deadlock%22+%221991%22+Broderbund) | **200**, but only a JavaScript/redirect fallback was extractable. The `gbv=1` alternate also failed to expose search results. No absence claim follows. |
| [DuckDuckGo claimed-history query](https://html.duckduckgo.com/html/?q=%22Deadlock%22%20%221991%22%20game), [publisher query](https://html.duckduckgo.com/html/?q=%22Deadlock%22%20%22Broderbund%22), [name query](https://html.duckduckgo.com/html/?q=%22Jankolock%22) | **202** human/bot challenge. No search results verified; challenge not bypassed. |
| [Bing DOS maze query](https://www.bing.com/search?q=%22Deadlock%22%20DOS%20maze%20game) | **200**, but extracted results concerned unrelated clothing pages. Not useful evidence for or against any game. |
| [itch.io: Deadlock](https://itch.io/search?q=Deadlock) | **429 Too Many Requests**. Broader creator-title search remains unresolved. |

The corrected [DOS Games Archive search](https://www.dosgamesarchive.com/games?t=deadlock)
returned **200**, but the inspected page was dominated by catalog/filter text;
no reliable result count was established. Initial guessed search paths on this
site and DOSGames returned **404**. Those failures are not evidence of absence.

Two additional **200** Archive metadata responses illustrate title collisions:
[Housebreakers, 1990](https://archive.org/metadata/Deadlock_1990-07-11_The_Housebreakers)
says “C64 Demo” and “11 July 1990”; the
[undated Deadlock item](https://archive.org/metadata/Deadlock_19xx_-)
is in `softwarelibrary_amiga_musicdisks`. These are catalog descriptions only;
no original program was loaded and no rights were inferred from hosting.

## Rights and attribution boundary

**This research establishes no permission to reuse any Deadlock game's code,
models, portraits, screenshots, textures, sounds, music, maps or level layouts.**
No reusable source revision or permissive asset license was established for
any candidate. Historical age, public access, free play, DRM-free sale, archival
hosting, a “remix” label and attribution are not redistribution permission.

The [Steam Subscriber Agreement](https://store.steampowered.com/subscriber_agreement/?l=english)
returned **HTTP 200**. Section 2A says “The Content and Services are licensed,
not sold” and describes a personal, non-commercial-use license with exceptions.
Its separate fan-art and developer-tool provisions are not a blanket license to
ship extracted game assets in this portal. This is a scope/permission finding,
not a comprehensive legal opinion on every possible use or jurisdiction.

For an original project, keep code, levels, drawing, audio and copy independently
authored or separately licensed and evidenced. Do not call it an official Valve
or Brøderbund port, assert endorsement, fabricate an upstream author/license, or
claim its title is cleared. Operator permission to make a project does not
transfer third-party intellectual-property rights.

## Unresolved items and handoff

1. Obtain the intended reference: exact title, source URL, screenshot or original
   credits/manual. Specifically request support for **1991**, **Brøderbund**,
   **DOS** and **maze shooter** rather than carrying those assumptions forward.
2. Check a complete contemporary 1991 DOS entertainment catalog or original
   game credits if that candidate is still asserted. The two inspected
   Brøderbund catalogs do not close this question.
3. Treat “Jankolock has never existed” and “the name is legally clear” as
   **unproven**. General-web search was access-limited.
4. Any ingestion or asset reuse needs a separate license/provenance review.
   Nothing here authorizes implementation, registration, publication or push.

Verification is source retrieval and documentation review only. No runtime code,
catalog entry or maintenance file changed; no game was added. No browser smoke
or screenshot gate was run or claimed. Below-floor disk capacity remains an
implementation/artifact blocker; this lane used only bounded text evidence.
