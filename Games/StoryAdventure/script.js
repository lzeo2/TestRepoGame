/*
 * The Last Lighthouse - an offline text-choice adventure set on a
 * storm-threatened island in 1897. Pure vanilla JS, no network requests.
 *
 * CONTROLS
 *   Touch / Mouse: tap a choice button (large, mobile-friendly targets).
 *   Keyboard:
 *     1-9           pick a choice by number
 *     R             restart the story from the beginning
 *     M             return to the menu (start page)
 *
 * GAMEPLAY
 *   A branching story of 23 story nodes with five distinct endings.
 *   Choices are permanent within a playthrough. Ending screen offers
 *   Play Again (restart) and Menu.
 *
 * PERSISTENCE
 *   localStorage key "storyadventure_stats" stores the total number of
 *   completed plays and a per-ending discovery count. Reaching an ending
 *   for the first time marks it as a new discovery. The start page shows
 *   how many of the five endings have been found.
 */
(function () {
  "use strict";

  var STORE_KEY = "storyadventure_stats";
  var DEFAULT_STATS = { plays: 0, endings: {} };

  /* ---- the five endings ---- */
  var ENDINGS = {
    end_fire: {
      name: "The Guiding Flame",
      rank: "Best ending",
      tone: "gold",
      text: "The Dawnswift rounds the Siren Rocks on a single beam of gold and makes the channel. At dawn her crew rows ashore to thank you; the captain offers a purse of coin. You refuse it, and instead ask for a compass - for the light, you say, and for the ships that will come after.\n\nIn spring, when Marlow's fever finally breaks, he tells the Trinity Board that the Grey Helm light is in good hands. They agree. You are the keeper now, and the lamp is never dark again."
    },
    end_salt: {
      name: "The Salt and the Storm",
      rank: "Brave ending",
      tone: "blue",
      text: "The sea is faster than any rower. The boat capsizes in a roar of white, and for a long moment there is nothing but cold and salt. You wash ashore at dawn on the western beach, half-drowned, clinging to a broken oar.\n\nFar out, the Dawnswift's masts stand empty against the sky - she foundered, but her boats made the rocks, and no life was lost. The crew calls you a fool, kindly, and builds a fire. Marlow, when he hears of it, laughs until he coughs. \"The light,\" he says. \"You'll learn the light.\" You are alive. Sometimes that is enough."
    },
    end_silent: {
      name: "The Silent Lamp",
      rank: "Dark ending",
      tone: "grey",
      text: "By midnight the sound of timber on stone reaches the tower, drawn out and terrible. You stand at the gallery rail with the dark lamp behind you and watch the Dawnswift break apart on the Siren Rocks - a thing that your light, your oil, your hands could have turned away.\n\nAt dawn the sea is calm and empty. Marlow asks no questions; he already knows. He tends the lamp himself that night, and neither of you speaks of the wreck again. But it is a long, long season before the light feels like yours."
    },
    end_warning: {
      name: "The Old Man's Warning",
      rank: "Wise ending",
      tone: "teal",
      text: "You ring the bell and swing the lens east, and the beam finds the Siren Rocks like a finger on a map. The Dawnswift's lamps waver, then turn - she reads your signal, and by morning she is anchored safe in the bay.\n\nWhen you carry the news to Marlow, he is sitting up, eyes clear, and for the first time in a week he smiles. \"Told you,\" he says. \"Old men see wrecks before they happen.\" He teaches you the currents that season - every rock, every shoal, every mercy of the tide. The light keeps, and so does he."
    },
    end_vigil: {
      name: "The Keeper's Vigil",
      rank: "Quiet ending",
      tone: "green",
      text: "You ring the bell until your arms fail, then sit with Marlow while the storm spends itself against the window. In the morning the Dawnswift is gone - but a boat is in the bay, and a note under the tower door: \"Sound light, sound bell. Come in on the afternoon tide.\"\n\nYou carry it down to Marlow, who reads it twice and folds it away. \"We'll go together,\" he says. \"Two keepers, one lamp. It's how it ought to be.\" The bell is rung again that night, softer this time, for no one in particular."
    }
  };

  /* ---- the story graph (23 story nodes + 5 endings) ---- */
  var NODES = {
    start: {
      loc: "The Tower, Dusk",
      text: "The wind has teeth tonight. Below you, in the cramped keeper's cottage, old Marlow burns with fever - he will not climb the stairs again tonight. Far out on the grey water, the lanterns of a merchant ship rise and fall. She flies no name you can read, but her course is wrong: straight toward the Siren Rocks.\n\nThe tower lamp is dark and the oil is nearly spent. The choice is yours alone.",
      choices: [
        { t: "Climb the spiral stairs to the lamp room", to: "lamp" },
        { t: "Check the boat shed below the cliffs", to: "shed" }
      ]
    },
    lamp: {
      loc: "The Lamp Room",
      text: "The great lens turns its slow, patient circle around a flame the size of a thumb. The oil can is light in your hand - a swallow or two left at the bottom. Whatever you decide, there will be no second chance at the light tonight.",
      choices: [
        { t: "Pour in the last of the oil and burn bright", to: "lamp_refill" },
        { t: "Ration it - burn low, burn long", to: "lamp_ration" }
      ]
    },
    lamp_refill: {
      loc: "The Lamp Room",
      text: "The wick drinks the oil and the lamp answers with a roar. Light floods the lens, sweeping a blade of gold across the sea. From the dark water, something answers: a single lamp blinking back from the ship's masthead.",
      choices: [
        { t: "Ring the great fog bell to call her in", to: "bell" },
        { t: "Go down and sit with Marlow", to: "marlow" }
      ]
    },
    bell: {
      loc: "The Gallery",
      text: "The bell's iron voice booms across the water, one heavy stroke after another. The ship's lamps swing - she has heard you, and she turns toward the light like a moth toward a flame.",
      choices: [
        { t: "Hold the flame through the night", to: "end_fire" },
        { t: "Take the hand-lantern and row out to meet her", to: "end_salt" }
      ]
    },
    marlow: {
      loc: "The Keeper's Cottage",
      text: "Marlow's eyes are glassy, but his grip on your wrist is iron. \"Siren Rocks,\" he rasps. \"Due east of the point. She'll be on 'em by midnight, sure as tide.\" His chart, drawn from a lifetime of fog, trembles in his hand.",
      choices: [
        { t: "Trust the old man - ring the bell and swing the lamp east", to: "end_warning" },
        { t: "He is raving. Leave him and tend the lamp", to: "dismiss" }
      ]
    },
    dismiss: {
      loc: "The Tower",
      text: "You tell yourself it is fever talk, that old men see wrecks behind every wave. You climb back to the lamp with Marlow's warning still ringing in your ears - and by the time you reach the top, the wind is carrying a sound you wish you had not heard: a long, grinding cry of timber on stone.",
      choices: [
        { t: "Watch the wreck from the gallery window", to: "end_silent" }
      ]
    },
    lamp_ration: {
      loc: "The Lamp Room",
      text: "You trim the wick to a coal-glow - a small, stubborn star. It will burn for hours yet, but it will not pierce the coming spray. Somewhere out in the dark, the ship waits.",
      choices: [
        { t: "Step out onto the gallery to watch the sea", to: "watch_sea" },
        { t: "Search the cellar for more oil", to: "cellar" }
      ]
    },
    watch_sea: {
      loc: "The Gallery",
      text: "Spray wets your face as you lean into the wind. The ship has drifted: her sails luff and her bow swings toward the point, closer to the Siren Rocks than any hull should go. Her crew cannot see what you can.",
      choices: [
        { t: "Pour the rationed oil in and light the lamp now", to: "lamp_late" },
        { t: "Take the old clinker boat and row out to warn them", to: "row_warn" }
      ]
    },
    lamp_late: {
      loc: "The Lamp Room",
      text: "You slosh the last of the oil into the burner with shaking hands. The wick catches, gutters, catches again - and then the whole lens blazes. The light falls on the ship just as her bow begins to swing toward the rocks.",
      choices: [
        { t: "Ring the bell to mark the channel", to: "end_fire" },
        { t: "Leave the lamp and row out to meet her", to: "end_salt" }
      ]
    },
    row_warn: {
      loc: "The Coves",
      text: "The clinker boat is light and cranky, and the sea is in a temper. Every stroke pushes you toward the ship, but the water between you and her is a mile of black, moving hills.",
      choices: [
        { t: "Keep rowing - straight for the ship's lights", to: "row_out" },
        { t: "Turn back - the lamp is the better weapon", to: "tower_return" }
      ]
    },
    cellar: {
      loc: "The Cellar",
      text: "The cellar smells of rope, rust and rain. On a shelf behind the coal you find a single jar of whale oil, corked and dusty - enough for one full burn, if it pours true.",
      choices: [
        { t: "Carry it up and fill the lamp to the brim", to: "lamp_full" },
        { t: "Leave it - go check the ship first", to: "watch_sea2" }
      ]
    },
    lamp_full: {
      loc: "The Lamp Room",
      text: "You pour the old oil in slow, careful circles. The wick drinks, the flame steadies, and the lens throws a beam of gold you can feel on your skin. Out on the water, the ship sheers off the rocks and into the channel, guided by a light that will not fail.",
      choices: [
        { t: "Keep the flame until dawn", to: "end_fire" },
        { t: "Row out to meet her and tell them of Marlow", to: "end_salt" }
      ]
    },
    watch_sea2: {
      loc: "The Gallery",
      text: "You watch too long. The ship hesitates at the very edge of the rocks, sails cracking - and you realize the only thing standing between her and ruin is your own hesitation.",
      choices: [
        { t: "Race back and light the lamp", to: "lamp_late" },
        { t: "Fire the signal flares from the cliff", to: "flares" }
      ]
    },
    shed: {
      loc: "The Boat Shed",
      text: "The shed is lashed against the storm: the rowboat rests on its skids, storm-rigged and ready. Beneath a canvas in the corner sits a crate of old signal flares - red, waxy, and precious.",
      choices: [
        { t: "Take the flares to the cliff", to: "flares" },
        { t: "Ready the rowboat for launching", to: "boat_ready" }
      ]
    },
    flares: {
      loc: "The North Cliff",
      text: "The wind tears at your coat. Far below, the sea throws itself at the rocks. The flares are heavy in your hands - one crack of the cap and a red star will climb over the water.",
      choices: [
        { t: "Fire a red flare toward the ship", to: "flare_shot" },
        { t: "Leave them - go light the lamp instead", to: "lamp_refill" }
      ]
    },
    flare_shot: {
      loc: "The North Cliff",
      text: "The flare kicks like a mule and climbs, trailing smoke, bursting into a red bloom over the sea. The ship's deck lanterns swing - she has seen it. But a flare is a warning, not a guide.",
      choices: [
        { t: "Race back and light the lamp while there is time", to: "lamp_late" },
        { t: "Fire the second flare to be sure", to: "flare_two" }
      ]
    },
    flare_two: {
      loc: "The North Cliff",
      text: "The second flare sputters, spits, and dies halfway up the sky. The crate is empty. Down in the tower the lamp stands dark and cold, and the ship has lost both your warning and your light.",
      choices: [
        { t: "Return to the dark tower and wait", to: "end_silent" }
      ]
    },
    boat_ready: {
      loc: "The Boat Shed",
      text: "You cast off the lashings and run the boat down the skids. She floats, tugging at her painter like a dog on a leash. The sea beyond the cove is a white, churning chaos.",
      choices: [
        { t: "Row out to the Dawnswift", to: "row_out" },
        { t: "It would be suicide - go light the lamp instead", to: "tower_return" }
      ]
    },
    row_out: {
      loc: "The Open Water",
      text: "The boat climbs and falls, climbs and falls. The ship's lights swing wildly ahead. Your arms burn; your lungs taste salt. Then the sea makes up its mind - a comber the height of the boat's mast rises out of the dark.",
      choices: [
        { t: "Turn and ride the wave back toward shore", to: "tower_return" },
        { t: "Stroke hard, straight for the ship's lantern", to: "swim_ship" }
      ]
    },
    swim_ship: {
      loc: "The Open Water",
      text: "The comber breaks over you. The boat is torn from your hands like a leaf. You surface gasping, seize a broken oar, and kick for the ship's ladder, which looms and falls in the dark.",
      choices: [
        { t: "Claw for the ladder", to: "end_salt" }
      ]
    },
    tower_return: {
      loc: "The Tower",
      text: "The sea will not have you tonight. You climb back to the tower, salt-stung and shaking. The lamp still burns its small, stubborn flame - the last of the oil, and the last of your choices.",
      choices: [
        { t: "Scrape together the dregs and force the flame high", to: "lamp_low" },
        { t: "Ring the bell blind through the night", to: "bell2" }
      ]
    },
    lamp_low: {
      loc: "The Lamp Room",
      text: "You tilt the can to the very last drop, then feed the wick pages from the keeper's log - the flame leaps, greedy and gold. It is a smaller light than it should be, but it is a light, and it is yours.",
      choices: [
        { t: "Feed the flame until the ship is clear", to: "end_fire" },
        { t: "Hold the lamp and wait for dawn", to: "end_vigil" }
      ]
    },
    bell2: {
      loc: "The Gallery",
      text: "You haul on the bell rope until your hands blister. The iron voice rolls out over the water, and the ship - blind, brave, or both - edges past the rocks by sound and by the faint gleam of your lamp.",
      choices: [
        { t: "Keep ringing until the wind dies", to: "end_fire" },
        { t: "Go down to Marlow and stay with him", to: "end_vigil" }
      ]
    }
  };

  /* ---- screens & elements ---- */
  var screens = {
    menu: document.getElementById("screen-menu"),
    story: document.getElementById("screen-story"),
    ending: document.getElementById("screen-ending")
  };
  var hudEndings = document.getElementById("hudEndings");
  var hudPlays = document.getElementById("hudPlays");
  var menuStats = document.getElementById("menuStats");
  var startBtn = document.getElementById("startBtn");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");
  var locChip = document.getElementById("locChip");
  var nodeText = document.getElementById("nodeText");
  var choicesEl = document.getElementById("choices");
  var endCard = document.getElementById("endCard");
  var endBadge = document.getElementById("endBadge");
  var endRank = document.getElementById("endRank");
  var endTitle = document.getElementById("endTitle");
  var endText = document.getElementById("endText");

  var currentNode = "start";
  var totalEndings = Object.keys(ENDINGS).length;

  /* ---- persistence ---- */
  function loadStats() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATS));
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return JSON.parse(JSON.stringify(DEFAULT_STATS));
      if (typeof s.plays !== "number") s.plays = 0;
      if (!s.endings || typeof s.endings !== "object") s.endings = {};
      return s;
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATS));
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(stats));
    } catch (e) {
      /* storage unavailable (private mode etc.) - run without persistence */
    }
  }

  var stats = loadStats();

  /* ---- rendering ---- */
  function showScreen(name) {
    Object.keys(screens).forEach(function (k) {
      screens[k].classList.toggle("hidden", k !== name);
    });
  }

  function refreshHud() {
    hudEndings.textContent = countDiscovered() + "/" + totalEndings;
    hudPlays.textContent = String(stats.plays);
  }

  function countDiscovered() {
    var n = 0;
    Object.keys(ENDINGS).forEach(function (id) {
      if ((stats.endings[id] || 0) > 0) n++;
    });
    return n;
  }

  function renderMenu() {
    var discovered = countDiscovered();
    var html =
      '<p class="headline">Endings discovered: ' + discovered + " of " + totalEndings + "</p>";
    Object.keys(ENDINGS).forEach(function (id) {
      var count = stats.endings[id] || 0;
      var label = count > 0 ? "found " + count + (count === 1 ? " time" : " times") : "not yet found";
      html +=
        '<p><span class="' + (count > 0 ? "found" : "lost") + '">' +
        (count > 0 ? "\u2713 " : "\u25CB ") + escapeHtml(ENDINGS[id].name) +
        "</span> &mdash; " + label + "</p>";
    });
    html += '<p class="headline">Completed plays: ' + stats.plays + "</p>";
    menuStats.innerHTML = html;
    refreshHud();
  }

  function renderNode(id) {
    var node = NODES[id];
    if (!node) {
      renderEnding(id);
      return;
    }
    currentNode = id;
    locChip.textContent = node.loc;
    nodeText.textContent = node.text;
    choicesEl.innerHTML = "";
    node.choices.forEach(function (c, i) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "opt";
      btn.innerHTML = "<em>" + (i + 1) + "</em>" + escapeHtml(c.t);
      btn.addEventListener("click", function () {
        goTo(c.to);
      });
      choicesEl.appendChild(btn);
    });
    showScreen("story");
    // move focus to the first choice for keyboard/screen-reader users
    var first = choicesEl.querySelector(".opt");
    if (first) first.focus({ preventScroll: true });
  }

  function renderEnding(id) {
    var end = ENDINGS[id];
    var wasNew = (stats.endings[id] || 0) === 0;
    stats.endings[id] = (stats.endings[id] || 0) + 1;
    stats.plays = (stats.plays || 0) + 1;
    saveStats(stats);

    endCard.className = "card end-card " + end.tone;
    endBadge.classList.toggle("hidden", !wasNew);
    endRank.textContent = end.rank;
    endTitle.textContent = end.name;
    endText.textContent = end.text;
    showScreen("ending");
    refreshHud();
    againBtn.focus({ preventScroll: true });
  }

  function goTo(id) {
    if (ENDINGS[id]) {
      renderEnding(id);
    } else {
      renderNode(id);
    }
  }

  function restart() {
    currentNode = "start";
    renderMenu();
    renderNode("start");
  }

  function backToMenu() {
    renderMenu();
    showScreen("menu");
    startBtn.focus({ preventScroll: true });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* ---- events ---- */
  startBtn.addEventListener("click", function () {
    renderNode("start");
  });
  againBtn.addEventListener("click", restart);
  menuBtn.addEventListener("click", backToMenu);

  document.addEventListener("keydown", function (e) {
    // number keys pick choices
    if (!screens.story.classList.contains("hidden")) {
      var n = parseInt(e.key, 10);
      if (!isNaN(n) && n >= 1 && n <= 9) {
        var node = NODES[currentNode];
        if (node && n <= node.choices.length) {
          goTo(node.choices[n - 1].to);
        }
      }
    }
    if (e.key === "r" || e.key === "R") {
      restart();
    } else if (e.key === "m" || e.key === "M") {
      backToMenu();
    }
  });

  /* ---- boot ---- */
  renderMenu();
  showScreen("menu");
})();
