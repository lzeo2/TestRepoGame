/* Gladihoppers — offline bootstrap.
 * Loads the vendored Unity WebGL build (2019.3) with a local no-op Poki SDK
 * bridge so the game boots with zero network access: no ads, no analytics,
 * no external scripts. The compiled game calls the JS_PokiSDK_* bridge
 * functions defined in Build/Gladihoppers.wasm.framework.unityweb, which in
 * turn call PokiSDK.*, window.commercialBreak(), window.rewardedBreak() and
 * window.initPokiBridge(). All of those are satisfied locally here.
 */
(function () {
	"use strict";

	/* ---- Local no-op Poki SDK (ads/analytics replaced with resolved promises) ---- */
	function noop() {}
	function resolved() { return Promise.resolve(); }

	window.PokiSDK = {
		init: resolved,
		setDebug: noop,
		setDebugTouchOverlayController: noop,
		isAdBlocked: function () { return false; },
		happyTime: noop,
		gameLoadingStart: noop,
		gameLoadingProgress: noop,
		gameLoadingFinished: noop,
		gameplayStart: noop,
		gameplayStop: noop,
		commercialBreak: resolved,
		rewardedBreak: resolved,
		displayAd: noop,
		destroyAd: noop,
		customEvent: noop,
		roundStart: noop,
		roundEnd: noop,
		setPlayerAge: noop,
		togglePlayerAdvertisingConsent: noop,
		gameInteractive: noop
	};

	/* Fallbacks in case the game requests a break before initPokiBridge runs. */
	window.commercialBreak = resolved;
	window.rewardedBreak = resolved;

	/* The game registers its C# callback target here, then expects
	 * window.commercialBreak / window.rewardedBreak to resolve and report back
	 * through unityGame.SendMessage(name, "...Completed"). Offline both
	 * resolve instantly, so the game continues without waiting for an ad. */
	window.initPokiBridge = function (name) {
		window.pokiBridge = name;
		window.commercialBreak = function () {
			window.PokiSDK.commercialBreak().then(function () {
				if (window.unityGame && name) {
					window.unityGame.SendMessage(name, "commercialBreakCompleted");
				}
			});
		};
		window.rewardedBreak = function () {
			window.PokiSDK.rewardedBreak().then(function (e) {
				if (window.unityGame && name) {
					window.unityGame.SendMessage(name, "rewardedBreakCompleted", String(e));
				}
			});
		};
	};

	/* ---- Start screen wiring ---- */
	var overlay = document.getElementById("overlay");
	var playBtn = document.getElementById("playBtn");
	var hud = document.getElementById("hud");
	var errorEl = document.getElementById("error");
	var fullscreenBtn = document.getElementById("fullscreenBtn");
	var restartBtn = document.getElementById("restartBtn");

	function showError(msg) {
		errorEl.style.display = "block";
		errorEl.textContent = msg;
	}

	function startGame() {
		if (!window.UnityLoader || !window.UnityLoader.instantiate) {
			showError("Unity loader failed to load. Please restart the page.");
			return;
		}
		overlay.classList.add("hidden");
		hud.classList.add("visible");
		playBtn.disabled = true;
		/* unityGame must be set before the Poki bridge completes ad breaks. */
		window.unityGame = window.UnityLoader.instantiate("gameContainer", "Build/Gladihoppers.json");
	}

	playBtn.addEventListener("click", startGame);
	playBtn.addEventListener("keydown", function (e) {
		if (e.key === "Enter" || e.key === " ") { e.preventDefault(); startGame(); }
	});
	fullscreenBtn.addEventListener("click", function () {
		if (window.unityGame && window.unityGame.SetFullscreen) {
			window.unityGame.SetFullscreen(1);
		} else if (document.documentElement.requestFullscreen) {
			document.documentElement.requestFullscreen().catch(noop);
		}
	});
	/* Restart path for a compiled game: reload the page fresh. */
	restartBtn.addEventListener("click", function () {
		window.location.reload();
	});
})();
