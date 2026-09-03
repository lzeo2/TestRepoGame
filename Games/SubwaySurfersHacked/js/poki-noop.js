/*
 * poki-noop.js — offline no-op Poki SDK surface for the fan-hosted
 * Subway Surfers Unity WebGL port.
 *
 * The compiled build's JS glue (SanFrancisco.wasm.framework.unityweb) defines
 * _JS_PokiSDK_* stubs that call window.PokiSDK.<method>() and
 * window.initPokiBridge()/commercialBreak()/rewardedBreak() directly. The
 * original Poki loader (poki-sdk.js + poki-sdk-core) is NOT vendored here, so
 * this file provides the exact same call surface as a no-op: every method
 * exists, nothing throws, and nothing reaches the network. In-game Poki
 * features (ads, rewarded breaks) are therefore inert, exactly as they are
 * when the SDK is unreachable.
 *
 * Mirrors the upstream loader's observable behavior: PokiSDK.init() resolves,
 * marking the SDK "ready" and delivering the "ready" bridge message to the
 * game once it registers a bridge. Without this handshake the compiled
 * PokiUnitySDK falls back to its anti-rehosting sitelock redirect, so the
 * handshake is required to keep the game bootable.
 */
(function () {
  "use strict";

  // Methods the compiled _JS_PokiSDK_* stubs may call. All are no-ops.
  var noArgMethods = [
    "gameInteractive",
    "gameLoadingFinished",
    "gameLoadingStart",
    "gameplayStart",
    "gameplayStop"
  ];
  var oneArgMethods = [
    "customEvent",
    "destroyAd",
    "displayAd",
    "happyTime",
    "roundEnd",
    "roundStart",
    "setPlayerAge",
    "togglePlayerAdvertisingConsent"
  ];

  function noop() {}
  function resolved() { return Promise.resolve(); }

  window.PokiSDK = {
    init: resolved,                // no-op backend: resolves immediately
    initWithVideoHB: resolved,
    commercialBreak: function () { return Promise.resolve(false); },
    rewardedBreak: function () { return Promise.resolve(false); },
    getLeaderboard: function () { return Promise.resolve(null); }
  };
  noArgMethods.forEach(function (m) { window.PokiSDK[m] = noop; });
  oneArgMethods.forEach(function (m) { window.PokiSDK[m] = noop; });

  // Bridge glue the framework's _JS_PokiSDK_initPokiBridge/_commercialBreak/
  // _rewardedBreak stubs call. Once the SDK is "ready", the bridge receives
  // the ready message, exactly like the upstream loader with a live SDK.
  window.pokiReady = false;
  window.pokiBridge = null;
  window.initPokiBridge = function (name) {
    window.pokiBridge = name;
    window.commercialBreak = function () { return Promise.resolve(false); };
    window.rewardedBreak = function () { return Promise.resolve(false); };
    if (window.pokiReady) {
      try { window.unityGame.SendMessage(name, "ready"); } catch (e) {}
    }
  };

  // SDK init resolves immediately (no-op backend): mark ready and deliver the
  // ready message if the game already registered a bridge.
  Promise.resolve().then(function () {
    window.pokiReady = true;
    if (window.pokiBridge && window.unityGame) {
      try { window.unityGame.SendMessage(window.pokiBridge, "ready"); } catch (e) {}
    }
  });
})();
