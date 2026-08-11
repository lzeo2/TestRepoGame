/*
 * poki-noop.js — offline no-op Poki SDK surface for the fan-hosted
 * Temple Run 2 Babylon.js port.
 *
 * The compiled bundle (bundle_original.js) calls window.PokiSDK.* directly:
 * init()/initWithVideoHB() gate the boot sequence, and commercialBreak()/
 * rewardedBreak() are awaited around continue/revive flows. The original
 * loader (poki-sdk.js) dynamically fetched the real Poki SDK core
 * (poki-sdk-core-v2.234.2.js), which talks to ad servers — neither is
 * vendored here. This file provides the same call surface as a no-op: every
 * method exists, nothing throws, and nothing reaches the network. init()
 * resolves so the game boots; commercialBreak() resolves so continue panels
 * close; rewardedBreak() resolves false (no reward) so revive/boost features
 * are inert offline — exactly as they are when the SDK is unreachable.
 */
(function () {
  "use strict";

  var noop = function () {};
  var resolve = function () { return Promise.resolve(); };
  var resolveFalse = function () { return Promise.resolve(false); };

  window.PokiSDK = {
    // Boot / lifecycle
    init: resolve,
    initWithVideoHB: resolve,
    gameLoadingStart: noop,
    gameLoadingFinished: noop,
    gameLoadingProgress: noop,
    gameInteractive: noop,
    gameplayStart: noop,
    gameplayStop: noop,
    // Ads
    displayAd: noop,
    destroyAd: noop,
    commercialBreak: resolve,
    rewardedBreak: resolveFalse,
    // Misc
    customEvent: noop,
    happyTime: noop,
    roundStart: noop,
    roundEnd: noop,
    muteAd: noop,
    disableProgrammatic: noop,
    // Settings / analytics / leaderboards
    setDebug: noop,
    setPlayerAge: noop,
    togglePlayerAdvertisingConsent: noop,
    toggleNonPersonalized: noop,
    setConsentString: noop,
    logError: noop,
    sendHighscore: noop,
    getLeaderboard: function () { return Promise.resolve(null); },
    setDebugTouchOverlayController: noop
  };
})();
