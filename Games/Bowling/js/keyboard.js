// Keyboard and restart glue (added for the portal; see CREDITS.md).
(function () {
	function getLocal() {
		try {
			return (typeof getLocalPlayer === "function") ? getLocalPlayer() : null;
		} catch (e) {
			return null;
		}
	}

	function restartGame() {
		var p = getLocal();
		if (!p) return;
		p.scores = new Scores();
		p.physics.resetPhysics();
		if (typeof scoresDiv !== "undefined" && scoresDiv) {
			scoresDiv.innerHTML = "  1  2  3  4  5  6  7  8  9  10<br/>| "
					+ p.scores.getResultString() + " | 0 |";
		}
	}

	var STEP = 0.07;

	document.addEventListener("keydown", function (e) {
		var active = document.activeElement;
		var onButton = active && (active.tagName === "BUTTON" || active.tagName === "A");

		if (e.key === "r" || e.key === "R") {
			restartGame();
			return;
		}

		var p = getLocal();
		if (!p || !p.physics || p.physics.simulationActive) return;

		if (e.key === "ArrowLeft") {
			p.physics.positionBall(p.physics.releasePosition - STEP, false);
			e.preventDefault();
		} else if (e.key === "ArrowRight") {
			p.physics.positionBall(p.physics.releasePosition + STEP, false);
			e.preventDefault();
		} else if ((e.key === " " || e.key === "Enter" || e.key === "ArrowUp") && !onButton) {
			p.physics.releaseBall(BALL_VELOCITY_MAX, 0.0);
			e.preventDefault();
		}
	});

	document.addEventListener("DOMContentLoaded", function () {
		var btn = document.getElementById("restartBtn");
		if (btn) btn.addEventListener("click", restartGame);
	});
})();
