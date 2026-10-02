<!-- maintenance-game: Games/CutTheRope -->
# Cut the Rope maintenance

## Identity and status

Registered id **62**, category `puzzle`, entry `Games/CutTheRope/index.html`. Baseline `8c8a055`: entry `2bf5b41b3c8f924e35612ed75098e143dc8e1ca3`, tree `268f2e93f6dbdd7376419fffed0f2db38f43ec9c`. The 344 files total 26,063,657 bytes. Current play/load is unverified in this documentation-only task.

## Implementation map

Entry order is `scripts/detectmobilebrowser.js` (tiny local stub), `scripts/sm2.js`, `scripts/libraries.js`, then `scripts/ctr.js`. The libraries bundle identifies Modernizr 2.6.3, jQuery 2.0.3 and PxLoader; SoundManager2 identifies V2.97a.20130101. The engine coordinates canvas `#c` with menu/box/level panels, `#levelResults`, `#gameBtnTray`, `#levelMenu`, `#loaderWindow` and `#popupWindow`.

Selected `ctr.js` bindings around lines 488-490 route `#gameRestartBtn` to `da(f.Nb,true,true)`, `#replayBtn` to `da(f.Nb,false)` and `#nextBtn` to the next level or box. `pb` is the panel coordinator; selected sound wrapper `eb` configures HTML5 audio (`preferFlash:false`) and PxLoader sound readiness. Intro/outro functions create `#vid`, set `intro_`/`outro_` media URLs, load/play and remove it across panel transitions.

Source review coverage: complete entry and `css/ctr.css`; selected engine tutorial data, input, panel transitions, sound setup, persistence, browser-support fallback and code-redemption AJAX. Library/SoundManager headers and relevant APIs were sampled, not fully reviewed. The 489,892-byte minified game, physics, all levels/media/fonts and binary assets were not reviewed in entirety.

## Gameplay and controls

Level data explicitly instructs “Slide across to cut the rope” and “Deliver candy to Om Nom”. Input setup chooses pointer/MSPointer or touch/mouse event pairs. Options expose drag/click-to-cut modes; result stars/score, replay/next/menu, in-level restart and reset confirmation are real DOM interfaces with engine bindings, not decorative claims. Keyboard gameplay support was not established. Music/sound preferences are separate. The game should retain original physics and star progression, not receive a generic timed win condition.

## State and persistence

`za` wraps storage with prefix `jF:"normal-"`; a subscribed `Nr` value can add another prefix segment. `qa` stores suffixes `music`, `sound`, `clickToCut`, `language`, `isHD`. Storage support detection catches initial access, but later get/set/remove calls are unguarded. Selected level progress calls exist, but all progress suffixes were not mapped; do not invent a single save key. Back up matching keys before reset/migration. A Chrome storage fallback references `chrome` with a flawed typeof comparison. Exact denial behavior needs focused testing.

## Dependencies and provenance

ZeptoLab metadata appears in the entry; no verified full-game license or authoritative revision pin was found. Local fonts, audio/video, cursors and art have separate unresolved terms. SoundManager's header states BSD; Modernizr's header MIT/BSD, and jQuery points to its license. Component headers are not blanket game permission.

The only engine absolute HTTP URL found in the sampled boundary scan is the code-redemption POST to `http://ctrbk.cloudapp.net/api/CTRBKCodes`. Current entry has no `#codeText`/`#codeOkButton`; reachability is not established. Treat this as conditional legacy backend capability, not proof a request happens during ordinary play.

## Audit findings

- **MEDIUM, compatibility failure:** `scripts/ctr.js`, `ft` support check around line 163 uses `_gaq.push` when support fails, but entry declares no `_gaq`. A fallback can throw instead of showing `css/nosupport.css`. Root fix: remove the dead analytics notification at this unsupported-browser boundary, not reintroduce analytics.
- **MEDIUM, save reliability risk:** `za` storage methods around lines 109-110 have no per-operation catch/validation. Denied/quota storage can break preferences/progress. Fix centrally with recoverable in-memory behavior and explicit unsaved status.
- **MEDIUM, accessibility:** entry menu actions are image-backed divs; CSS removes anchor focus outlines and `#gameRestartBtn` is 42x42. Add semantic/focusable controls and labels at existing bindings, retaining art.
- **HIGH, conditional offline risk:** redemption AJAX URL around line 393. Trace activation; disable unavailable redemption locally if reachable, not a remote backend replacement.
- **HIGH, rights hold:** game/art/font redistribution is unverified.
- **Historical hold:** `docs/audit_batches/batch_2.md` reports aborted intro video; `playtest_r2.md` reports menu/cut input but restart untested. Neither is current verification. Old cloak/favicon 404 claims are stale: current entry references neither legacy resource.

## Safe iteration

Patch support fallback, storage boundary and existing DOM semantics only when authorized. Preserve engine physics, result panels and save prefix. Video cancellation needs consumer tracing before removing media or filtering smoke failures. Do not hand-edit unrelated minified code or replace original levels.

## Verification

Actually run: Git tree inspection and stdin syntax checks for `ctr.js`, libraries, SoundManager and detector, all passed. Native runs **0**, screenshots **0**. Reproduce: `git show HEAD:Games/CutTheRope/scripts/ctr.js | node --check`.

Recommended Main-approved HTTP lease: menu/box/level, pointer cut, candy delivery, star/score update, failure/replay/next, reset confirmation and reload persistence; repeat storage denial, unsupported-feature fallback and audio/video transitions. Capture requests without suppressing media aborts. Full catalog gate remains Main's separate operation.

## Future outlook

Rights and save/unsupported-browser recovery first. Next inspect the video abort with real panel transitions and improve keyboard/focus access around existing controls. Month work should test progress reset/restore and narrow mobile fit without rebuilding physics or replacing licensed art.
