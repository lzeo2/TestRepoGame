# Rhythm: maintenance manual

<!-- maintenance-game: Games/Rhythm -->

## Identity and status

Registered ID 209, category `arcade`, featured `false`. Entry: `Games/Rhythm/index.html` ([open source](../../../Games/Rhythm/index.html)). Source baseline `8c8a055`; 7 tracked files, 941,313 logical bytes. This is an existing game, not a new addition. Runtime is read-only in delegation 67. Local source/dependency evidence is not an offline browser pass. No native gameplay, screenshot or hardware measurement was performed here.

## Implementation map

SourceReview coverage: inspected entry/CSS, `scripts/script.js`, `scripts/song.js`, credits/license through bounded source views. Chart and judgment branches were inspected, not played or synchronized against audio. MP3 was inventoried but not listened to or legally cleared here. `song.js` defines seven lane arrays with notes and `next` indices; duration is 56 seconds. `window.onload` builds tracks, initializes configuration, start, keyboard, pointer and miss handlers.

`initializeNotes` builds animated DOM notes under `.track-container`; speed changes duration/delay while keeping target sum constant. `setupStartButton` sets wall-clock `startTime`, starts countdown, plays local `.song` and unpauses CSS notes. `judge/getHitJudgement/calculateScore` compare next chart timing to Date.now and assign accuracy/combos. `animationend` treats an unhit note as a miss and advances that lane.

## Gameplay and controls

Start initiates the chart. Lowercase S,D,F, Space,J,K,L hit lanes; pointer presses on `.key` call `pressTrack`. Holding is suppressed until release. Perfect/good/bad thresholds are 0.1/0.2/0.3 seconds; only good/perfect sustain combo. Scores are 1000 times accuracy multiplier with bonuses at combos 40/80. Speed 1x/2x/3x and Fade configure the chart. Summary declares Failed if misses exceed half judged notes, otherwise Cleared; Play again reloads.

## State and persistence

Globals own hits, score, combo, hold flags, speed, animation and chart indices. There is no save key. `startTimer` holds a local one-second interval and clears it at the end. CSS animations own note motion, audio owns playback, while judging uses wall clock: these are separate clocks. `showResult` does not set `isPlaying=false`. `showHitEffect` appends DOM effect nodes without removing them after animation.

## Dependencies and provenance

Local `CREDITS.md` records upstream https://github.com/ChloeLiang/rhythm-game, revision `4995fbf1573f0dbdfac00bfe99c18523b610f24d`. Shipped `LICENSE` inspected: MIT. These are repository evidence, not a fresh network/source-pin verification. Preserve notices and inspect code, asset and component terms separately; a game license does not automatically clear every bundled recording/font/image. Dependencies and asset consumers are identified above; no newly added remote loads or dependency installs in this audit.

## Audit findings

- HIGH rights-evidence hold, `index.html::.menu__song` and `media/music.mp3`: page attributes composition to Yojiro Noda and performance to Theishter; the shipped MIT code license does not independently establish recording/composition redistribution permission. Obtain explicit asset evidence before further publication decisions. This is not a claim that the MP3 is definitely unauthorized.
- MEDIUM, `scripts/script.js::setupChallenge/updateAnimation`: switching Fade off changes class/flag but never restores `animation='moveDown'` or rebuilds plain notes. Repro: toggle Fade on then off; notes still use fading animation. Fix configuration at the common animation assignment.
- MEDIUM, `setupStartButton`: playback promise is ignored while chart/timer immediately start. Blocked/failed audio still consumes the run. Start all clocks only after playback succeeds or show a recoverable error.
- MEDIUM, `css/style.css::.game/.key`: seven lanes share at most a half-width game pane; mobile target widths may be far below 44px. No mobile stacking rule is present.

## Safe iteration

Preserve chart order/timing and attribution while resolving recording rights. Fix configuration and clock start boundaries, not note-by-note delays. Add hold release on blur and effect cleanup without new libraries. No new copyrighted song or remote player is permitted. Keep result threshold factual rather than rewriting difficulty to obtain passes.

## Verification

Recommended native sequence: start with audio success and blocked play; hit early/perfect/late, hold then release, compare pointer/keyboard, toggle Fade both ways and all speeds, wait through summary and reload. Background tab mid-song to measure clock drift. No audio synchronization or interaction pass was run here.

Actually run: Git blob inventory and `node --check` via standard input for 2 external/inline script units, 2/2 PASS. No execution implied. Reproduce parsing without checkout; focused extraction commands are in [batch verification](../audits/games-67.md#verification):

```sh
git show 8c8a055:"Games/Rhythm/scripts/script.js" | node --check
```

A future authorized focused browser run may extract only this directory with `git archive` into a disposable directory, serve that root over HTTP, block third-party requests and terminate the server. Check disk first; do not alter sparse selection or leave dependencies. Main owns the unchanged serial full-catalog smoke gate, separately from these recommended interactions.

## Future outlook

Week 1: music rights evidence and reliable playback start. Week 2: reversible Fade, mobile lane layout, accessible key/control labels and result live region. Later: measured audio-clock judging/calibration and reduced-motion alternatives that preserve timing cues. More songs are deferred until rights and chart QA exist.
