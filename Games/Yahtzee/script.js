// Yahtzee scoring, ingested from github.com/taylorhansen/Yahtzee (MIT),
// commit 26dec5d9. Modified: zero scores for invalid categories, fixed
// upper bonus award, round/roll counters, 200-point win target, end state.
window.onload = yahtzeeGame;

function yahtzeeGame () {

	var TARGET = 200;
	var BASE_CATEGORIES = ["ones", "twos", "threes", "fours", "fives", "sixes",
		"threeOfAKind", "fourOfAKind", "fullHouse", "smallStraight",
		"largeStraight", "chance", "yahtzee"];

	var upperSecAccumulator = 0;
	var bonusAwarded = false;
	var yahtzeeScore = 50;
	var totalElm = getElm("totalScore");
	var rolls = 0;
	var held = [false, false, false, false, false];
	var dice = [getElm("0"), getElm("1"), getElm("2"), getElm("3"), getElm("4")];
	var scored = {};
	var scoredCount = 0;
	var finished = false;

	function getElm (id) {

		return document.getElementById(id);
	};

	function total (value) {

		totalElm.textContent = Number(totalElm.textContent) + value;
	};

	function updateCounters () {

		getElm("rolls-left").textContent = Math.max(0, 3 - rolls);
		getElm("rounds-left").textContent = 13 - scoredCount;
		getElm("roll").disabled = finished || rolls >= 3;
	};

	//Dice roll and hold start

	function updateHeld () {

		for (var i = 0; i < 5; i++) {

			held[i] = getElm("hold" + i).checked;
		}
		updateCounters();
	};

	function roll () {

		if (finished || rolls >= 3) return;

		if (rolls < 3) {

			for (var i = 0; i < 5; i++) {

				if (held[i] === false || rolls === 0) {

					dice[i].textContent = Math.floor(Math.random() * 6) + 1;
				}
			}
			rolls++;
		}
		updateCounters();
	};

	function rollReset () {

		rolls = 0;

		for (var i = 0; i < 5; i++) {

			dice[i].textContent = "";
			getElm("hold" + i).checked = false;
			held[i] = false;
		}
	};

	function disable (name) {

		var elm = getElm(name);
		elm.classList.add("strike");
		elm.classList.remove("cell");
		elm.onclick = undefined;
		elm.tabIndex = -1;
	};

	for (var i = 0; i < 5; i++) {

		getElm("hold" + i).onclick = updateHeld;
	}

	// Bank a score, close the row and advance the round. Guarded so a
	// category clicked before any roll does nothing; after a roll every
	// category scores, zero points if the dice do not fit it.
	function cellScore (name, value) {

		if (rolls === 0 || finished) return;

		getElm(name + "Score").textContent = value;
		rollReset();
		disable(name);
		total(value);

		if (BASE_CATEGORIES.indexOf(name) !== -1 && !scored[name]) {
			scored[name] = true;
			scoredCount++;
		}
		updateCounters();

		if (scoredCount >= 13) {
			endGame();
		}
	};

	function sumDice () {

		var accumulator = 0;

		for (var i = 0; i < 5; i++) {

			accumulator = accumulator + Number(dice[i].textContent);
		}

		return accumulator;
	};

	getElm("roll").onclick = roll;

	//End dice
	//Upper section start

	function upperSecScore (value) { //Sums up dice containing value.

		var accumulator = 0;

		for (var i = 0; i < 5; i++) {

			if (Number(dice[i].textContent) === value) {

				accumulator = accumulator + value;
			}
		}

		return accumulator;
	};

	function upperSec (name, value) {

		function func1 () {

			if (rolls > 0 && !finished) {

				var upperScore = upperSecScore(value);
				upperSecAccumulator = upperSecAccumulator + upperScore;
				cellScore(name, upperScore);
				checkUpperBonus();
			}
		};
		return func1;
	};

	getElm("ones").onclick = upperSec("ones", 1);
	getElm("twos").onclick = upperSec("twos", 2);
	getElm("threes").onclick = upperSec("threes", 3);
	getElm("fours").onclick = upperSec("fours", 4);
	getElm("fives").onclick = upperSec("fives", 5);
	getElm("sixes").onclick = upperSec("sixes", 6);

	//Upper section end
	//kind lower section start

	function kindScore (value, kindVal) { //Used in 3 or 4 of a kind, full house and yahtzee.

		var numbersOfAKind = 0;

		for (var i = 0; i < 5; i++) {

			if (Number(dice[i].textContent) === value) {

				numbersOfAKind = numbersOfAKind + 1;
			}
		}

		if (numbersOfAKind >= kindVal) {

			return sumDice();

		} else {

			return undefined;
		}
	};

	function kind (kindVal) {

		function func2 () {

			var score = 0;

			for (var i = 1; i < 7; i++) {

				var candidate = kindScore(i, kindVal);

				if (candidate) {
					score = candidate;
					break;
				}
			}

			cellScore(kindVal === 3 ? "threeOfAKind" : "fourOfAKind", score);
		};

		return func2;
	};

	getElm("threeOfAKind").onclick = kind(3);
	getElm("fourOfAKind").onclick = kind(4);

	//kind lower section end
	//Full house lower section start

	function fullHouse () {

		var threeOfAKindFound = 0;
		var twoOfAKindFound = 0;

		for (var i = 1; i < 7; i++) {

			if (kindScore(i, 3)) {

				threeOfAKindFound = i;
			}
		}

		for (var i = 1; i < 7; i++) {

			if (threeOfAKindFound !== i && kindScore(i, 2)) {

				twoOfAKindFound = i;
			}
		}

		cellScore("fullHouse", (threeOfAKindFound && twoOfAKindFound) ? 25 : 0);
	};

	getElm("fullHouse").onclick = fullHouse;

	//Full house lower section end
	//Small and Large straight lower section start

	function searchDice (val) { //Returns true if a dice equal to value is found.

		var foundDice = false;

		for (var i = 0; i < 5; i++) {

			if (Number(dice[i].textContent) === val) {

				foundDice = true;
			}
		}

		return foundDice;
	};

	function checkStraightCombo (search) {

		if (search[4] === undefined) { //Checking small straight combo

			if (searchDice(search[0]) && searchDice(search[1]) && searchDice(search[2]) && searchDice(search[3])) return true;

		} else { //Checking large straight combo

			if (searchDice(search[0]) && searchDice(search[1]) && searchDice(search[2]) && searchDice(search[3]) && searchDice(search[4])) return true;
		}
	};

	function straight (smallOrLarge) { //True means small straight, false means large straight.

		function func3 () {

			if (smallOrLarge) { //Small straight

				if (checkStraightCombo([1, 2, 3, 4, undefined]) || checkStraightCombo([2, 3, 4, 5, undefined]) || checkStraightCombo([3, 4, 5, 6, undefined])) {
					cellScore("smallStraight", 30);
				} else {
					cellScore("smallStraight", 0);
				}

			} else { //Large straight

				if (checkStraightCombo([1, 2, 3, 4, 5]) || checkStraightCombo([2, 3, 4, 5, 6])) {
					cellScore("largeStraight", 40);
				} else {
					cellScore("largeStraight", 0);
				}
			}
		};

		return func3;
	};

	getElm("smallStraight").onclick = straight(true);
	getElm("largeStraight").onclick = straight(false);

	//Small and Large straight lower section end
	//Chance lower section start

	function chance () {

		cellScore("chance", sumDice());
	};

	getElm("chance").onclick = chance;

	//Chance lower section end
	//Yahtzee lower section start

	function yahtzee () {

		var match = false;

		for (var i = 1; i < 7; i++) {

			if (kindScore(i, 5)) match = true;
		}

		if (match) {

			cellScore("yahtzee", yahtzeeScore);
			yahtzeeScore = 100;
			yahtzeeExtend();

		} else {

			cellScore("yahtzee", 0);
		}
	};

	getElm("yahtzee").onclick = yahtzee;

	//Yahtzee lower section end
	//Upper section bonus start

	function checkUpperBonus () {

		if (!bonusAwarded && upperSecAccumulator >= 63) {

			bonusAwarded = true;
			getElm("upperSecBonusScore").textContent = 35;
			total(35);
		}
	};

	//Upper section bonus end
	//Yahtzee bonus start

	function yahtzeeExtend () {

		//Remove current Yahtzee cell functionality

		getElm("yahtzee").removeAttribute("id");
		getElm("yahtzeeScore").removeAttribute("id");

		//Create new Yahtzee cell elements

		var newYahtzeeRow = document.createElement("tr");
		var newYahtzeeData1 = document.createElement("td");
		var newYahtzeeData2 = document.createElement("td");

		//Attribute new Yahtzee cell elements

		newYahtzeeData1.textContent = "Yahtzee bonus";
		newYahtzeeData2.textContent = "-";
		newYahtzeeData1.setAttribute("id", "yahtzee");
		newYahtzeeData1.setAttribute("class", "cell");
		newYahtzeeData1.tabIndex = 0;
		newYahtzeeData1.onclick = yahtzee;
		newYahtzeeData2.setAttribute("id", "yahtzeeScore");

		//Add new Yahtzee cell elements to Yahtzee table

		newYahtzeeRow.appendChild(newYahtzeeData1);
		newYahtzeeRow.appendChild(newYahtzeeData2);
		getElm("yahtzeeTable").appendChild(newYahtzeeRow);
	};

	//Yahtzee bonus end
	//Game over start

	function endGame () {

		finished = true;
		updateCounters();

		var finalScore = Number(totalElm.textContent);
		var won = finalScore >= TARGET;

		getElm("end-title").textContent = won ? "Target reached" : "Game over";
		getElm("end-detail").textContent = won
			? `Final score: ${finalScore}. You beat the 200 point target.`
			: `Final score: ${finalScore}. The 200 point target slipped away.`;
		getElm("end-screen").classList.remove("hidden");
	};

	//Game over end
	//Keyboard and start screen start

	// Every open scorecard row is focusable for Tab / Enter play.
	var cells = document.querySelectorAll("#yahtzeeTable .cell");
	for (var c = 0; c < cells.length; c++) {
		cells[c].tabIndex = 0;
	}

	document.getElementById("yahtzeeTable").addEventListener("keydown", function (e) {

		if (e.key !== "Enter" && e.key !== " ") return;
		var target = e.target;
		if (target && target.classList && target.classList.contains("cell")) {
			e.preventDefault();
			target.click();
		}
	});

	document.addEventListener("keydown", function (e) {

		if (document.querySelector(".overlay:not(.hidden)")) return;

		var target = e.target;
		if (target && (target.tagName === "INPUT" || target.tagName === "BUTTON" || target.classList.contains("cell"))) {
			return; // native activation
		}

		if (e.key === " ") {
			e.preventDefault();
			document.getElementById("roll").click();
		} else if (e.key >= "1" && e.key <= "5") {
			document.getElementById("hold" + (Number(e.key) - 1)).click();
		}
	});

	document.getElementById("playBtn").addEventListener("click", function () {
		document.getElementById("start-screen").classList.add("hidden");
	});

	document.getElementById("restart-btn").addEventListener("click", function () {
		window.location.reload();
	});

	updateCounters();

	//Keyboard and start screen end
};
