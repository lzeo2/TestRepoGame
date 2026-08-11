/*
 * Word Relay Riot - original offline pass-and-play word chain game.
 *
 * HOW TO PLAY
 *   2-6 players share one device. Pick a category and a turn time.
 *   The first player plays any word from the bundled category list.
 *   Every word after that must start with the last letter of the word
 *   before it, must be in the category list, and must not be a repeat.
 *   Each player gets 3 turns; the highest score wins.
 *
 * CONTROLS
 *   Keyboard: type the word &middot; Enter submits &middot; Esc returns to
 *             the menu &middot; R restarts the game with the same settings.
 *   Touch / mouse: tap the text field and use the on-screen keyboard,
 *             then tap Submit.
 *
 * SCORING
 *   Valid word:  +1 point per letter.
 *   Duplicate:   -5 points (word rejected, turn passes, chain unchanged).
 *   Timeout:     -5 points (turn passes, chain unchanged).
 *   A wrong-starting or unknown word is rejected with no penalty and the
 *   player keeps their remaining time. If no unused words start with the
 *   required letter, any word is allowed (free play).
 *
 * The word lists are bundled below - the game makes no network requests.
 * The best winning score is kept in localStorage under "wordrelayriot_best".
 */
(function () {
  "use strict";

  // ---------------- constants ----------------
  var MIN_PLAYERS = 2;
  var MAX_PLAYERS = 6;
  var ROUNDS_PER_PLAYER = 3;
  var PENALTY_DUP = 5;
  var PENALTY_TIME = 5;
  var TIME_OPTIONS = [10, 15, 20, 30];
  var DEFAULT_TIME = 15;
  var DEFAULT_PLAYERS = 3;

  var PLAYER_COLORS = ["#ffd166", "#7be495", "#6ea8fe", "#f78fb3", "#c084fc", "#ffa94d"];

  // ---------------- bundled word lists ----------------
  var CATEGORIES = [
    {
      id: "animals",
      label: "Animals",
      icon: "🐾",
      words: [
        "cat","dog","lion","tiger","bear","elephant","giraffe","zebra","monkey","kangaroo",
        "koala","panda","penguin","parrot","eagle","owl","snake","turtle","frog","rabbit",
        "horse","cow","pig","sheep","goat","duck","goose","chicken","turkey","deer",
        "fox","wolf","mouse","rat","squirrel","beaver","otter","whale","dolphin","shark",
        "octopus","squid","crab","lobster","shrimp","snail","worm","ant","bee","butterfly",
        "mosquito","spider","scorpion","crocodile","alligator","lizard","chameleon","camel",
        "donkey","mule","llama","alpaca","bison","buffalo","moose","elk","reindeer","hedgehog",
        "porcupine","raccoon","skunk","badger","weasel","ferret","hamster","gerbil","guinea pig",
        "leopard","cheetah","panther","jaguar","lynx","cougar","seal","walrus","gorilla",
        "orangutan","chimpanzee","baboon","lemur","rhino","hippo","peacock","ostrich","emu",
        "flamingo","swan","crow","raven","sparrow","robin","finch","pigeon","seagull","pelican",
        "heron","stork","woodpecker","toucan","kiwi","toad","newt","salamander","carp","salmon",
        "trout","bass","tuna","cod","eel","herring","mackerel","piranha","goldfish","jellyfish",
        "starfish","seahorse","narwhal","platypus","anteater","armadillo","bat","cobra","viper",
        "python","boa","gecko","iguana","axolotl","dragonfly","ladybug","centipede","millipede",
        "cricket","grasshopper","moth","firefly","wasp","hornet","termite","flea","tick","leech",
        "clam","oyster","mussel","scallop","crayfish","prawn","anchovy","sardine"
      ]
    },
    {
      id: "food",
      label: "Food & Drink",
      icon: "🍎",
      words: [
        "apple","banana","orange","grape","mango","peach","pear","plum","cherry","strawberry",
        "blueberry","raspberry","watermelon","pineapple","coconut","lemon","lime","kiwi","papaya",
        "avocado","bread","butter","cheese","milk","yogurt","egg","bacon","sausage","ham","steak",
        "chicken","turkey","salmon","tuna","shrimp","rice","pasta","noodle","pizza","burger",
        "taco","burrito","sushi","sandwich","salad","soup","stew","chili","curry","pancake",
        "waffle","cereal","oatmeal","granola","muffin","donut","bagel","croissant","toast","jam",
        "honey","peanut","almond","walnut","cashew","chocolate","candy","cookie","cake","pie",
        "tart","pudding","ice cream","jelly","popcorn","pretzel","chip","cracker","salt","pepper",
        "sugar","flour","onion","garlic","potato","tomato","carrot","broccoli","spinach","lettuce",
        "cucumber","mushroom","pumpkin","squash","corn","bean","pea","olive","oil","vinegar",
        "coffee","tea","juice","soda","lemonade","smoothie","milkshake","cocoa","oats","cinnamon",
        "vanilla","syrup","raisin","prune","apricot","fig","date","melon","cream","yolk",
        "batter","dough","crust","gravy","sauce","ketchup","mustard","mayo","relish","pickle",
        "zucchini","celery","turnip","radish","beet","parsnip","cauliflower","cabbage","kale",
        "artichoke","asparagus","eggplant","chive","mint","basil","oregano","thyme","rosemary",
        "ginger","turmeric","nutmeg","clove"
      ]
    },
    {
      id: "countries",
      label: "Countries",
      icon: "🌍",
      words: [
        "america","canada","mexico","brazil","argentina","chile","peru","colombia","venezuela",
        "ecuador","uruguay","paraguay","bolivia","panama","cuba","jamaica","haiti","france",
        "spain","italy","germany","portugal","belgium","switzerland","austria","poland","norway",
        "sweden","finland","denmark","iceland","ireland","greece","turkey","egypt","morocco",
        "nigeria","kenya","tanzania","ethiopia","ghana","zimbabwe","india","china","japan",
        "korea","thailand","vietnam","philippines","indonesia","malaysia","singapore","cambodia",
        "laos","myanmar","nepal","bhutan","bangladesh","sri lanka","pakistan","afghanistan","iran",
        "iraq","israel","jordan","lebanon","syria","saudi arabia","yemen","oman","qatar","kuwait",
        "russia","ukraine","kazakhstan","uzbekistan","mongolia","australia","new zealand","fiji",
        "zambia","angola","mozambique","namibia","botswana","senegal","algeria","tunisia","libya",
        "sudan","somalia","cameroon","congo","uganda","rwanda","burundi","madagascar","malawi",
        "lesotho","guatemala","honduras","nicaragua","costa rica","el salvador","dominica","grenada",
        "barbados","trinidad","suriname","guyana","armenia","georgia","azerbaijan","bulgaria",
        "romania","hungary","czechia","slovakia","slovenia","croatia","serbia","albania","macedonia",
        "bosnia","latvia","lithuania","estonia","belarus","moldova","luxembourg","malta","cyprus",
        "andorra","monaco","san marino","mali","niger","chad","gambia","guinea","togo","benin",
        "gabon","djibouti","eritrea","mauritius","seychelles","vanuatu","samoa","tonga","palau"
      ]
    },
    {
      id: "objects",
      label: "Objects",
      icon: "🛋️",
      words: [
        "table","chair","lamp","desk","bed","pillow","blanket","rug","shelf","mirror",
        "clock","window","door","curtain","sofa","cabinet","drawer","box","basket","bucket",
        "broom","mop","sponge","towel","soap","comb","brush","scissors","knife","fork",
        "spoon","plate","bowl","cup","mug","glass","pot","pan","kettle","toaster",
        "microwave","oven","fridge","freezer","blender","jar","bottle","can","carton","bag",
        "backpack","suitcase","wallet","purse","phone","laptop","keyboard","mouse","monitor",
        "printer","speaker","camera","headphone","remote","charger","battery","cable","plug",
        "fan","heater","iron","vacuum","pen","pencil","eraser","ruler","marker","crayon",
        "paper","notebook","book","magazine","envelope","stamp","tape","glue","staple","pin",
        "needle","thread","button","zipper","hook","nail","screw","hammer","wrench","drill",
        "saw","ladder","paint","umbrella","raincoat","hat","cap","scarf","glove","sock",
        "shoe","boot","sandal","slipper","belt","watch","necklace","ring","earring","bracelet",
        "glasses","key","lock","padlock","rope","string","ribbon","bandage","tissue","napkin",
        "toothbrush","toothpaste","shampoo","razor","skillet","grater","ladle","spatula","whisk",
        "strainer","funnel","lid","dish","saucer","teapot","jug","pitcher","thermos","cooler",
        "globe","map","compass","telescope","microscope","binoculars","abacus","calculator",
        "stapler","folder","file","sticker","highlighter","sharpener","briefcase","trunk","crate"
      ]
    },
    {
      id: "nature",
      label: "Nature",
      icon: "🌲",
      words: [
        "mountain","river","lake","ocean","sea","island","beach","desert","forest","jungle",
        "valley","hill","cliff","canyon","cave","volcano","glacier","iceberg","waterfall","stream",
        "pond","swamp","marsh","meadow","field","plain","prairie","tundra","savanna","oasis",
        "bay","gulf","lagoon","reef","coral","wave","tide","cloud","rain","snow",
        "hail","sleet","fog","mist","storm","thunder","lightning","rainbow","tornado","hurricane",
        "cyclone","breeze","wind","sunshine","dawn","dusk","twilight","night","moon","star",
        "planet","comet","asteroid","meteor","eclipse","orbit","galaxy","universe","sky","horizon",
        "atmosphere","earth","soil","sand","rock","stone","pebble","boulder","gravel","clay",
        "mud","dust","ash","lava","magma","crystal","mineral","gem","diamond","gold",
        "silver","copper","iron","wood","bark","leaf","branch","root","trunk","seed",
        "flower","rose","tulip","daisy","lily","orchid","sunflower","dandelion","fern","moss",
        "grass","bamboo","cactus","palm","pine","oak","maple","birch","willow","cedar",
        "spruce","sequoia","acorn","pinecone","berry","petal","pollen","nectar","thorn","twig",
        "log","timber","driftwood","shoreline","coastline","peninsula","plateau","basin","gorge",
        "ridge","summit","peak","slope","delta","estuary","fjord","atoll","archipelago",
        "continent","equator","latitude","longitude"
      ]
    }
  ];

  var STORE_KEY = "wordrelayriot_best";

  // ---------------- DOM refs ----------------
  var menuScreen = document.getElementById("screen-menu");
  var gameScreen = document.getElementById("screen-game");
  var resultScreen = document.getElementById("screen-result");

  var decBtn = document.getElementById("decBtn");
  var incBtn = document.getElementById("incBtn");
  var playerCountEl = document.getElementById("playerCount");
  var nameGrid = document.getElementById("nameGrid");
  var catChipsEl = document.getElementById("catChips");
  var timeChipsEl = document.getElementById("timeChips");
  var roundsNote = document.getElementById("roundsNote");
  var menuBestEl = document.getElementById("menuBest");
  var startBtn = document.getElementById("startBtn");

  var catLabelEl = document.getElementById("catLabel");
  var restartBtn = document.getElementById("restartBtn");
  var turnBanner = document.getElementById("turnBanner");
  var letterBadge = document.getElementById("letterBadge");
  var availCountEl = document.getElementById("availCount");
  var timerSecsEl = document.getElementById("timerSecs");
  var timerFill = document.getElementById("timerFill");
  var lastWordEl = document.getElementById("lastWord");
  var wordInput = document.getElementById("wordInput");
  var submitBtn = document.getElementById("submitBtn");
  var msgEl = document.getElementById("msg");
  var standingsEl = document.getElementById("standings");
  var historyEl = document.getElementById("history");

  var resTitle = document.getElementById("resTitle");
  var resTable = document.getElementById("resTable");
  var resStats = document.getElementById("resStats");
  var resBest = document.getElementById("resBest");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");

  // ---------------- menu state ----------------
  var numPlayers = DEFAULT_PLAYERS;
  var selectedCategory = 0;
  var selectedTime = DEFAULT_TIME;
  var nameValues = [];

  var best = loadBest();

  // ---------------- helpers ----------------
  function normalize(s) {
    return String(s).toLowerCase().replace(/[^a-z]/g, "");
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  // build a map of normalized word -> display word for a raw list
  function buildIndex(list) {
    var idx = {};
    for (var i = 0; i < list.length; i++) {
      var disp = String(list[i]).trim().toLowerCase();
      var n = normalize(disp);
      if (n.length >= 2 && !idx[n]) idx[n] = disp;
    }
    return idx;
  }

  function loadBest() {
    var b = 0;
    try {
      b = parseInt(localStorage.getItem(STORE_KEY) || "0", 10);
    } catch (e) { /* ignore */ }
    if (!isFinite(b) || b < 0) b = 0;
    return b;
  }

  function saveBest() {
    try {
      localStorage.setItem(STORE_KEY, String(best));
    } catch (e) { /* ignore */ }
  }

  function showScreen(which) {
    menuScreen.classList.add("hidden");
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    which.classList.remove("hidden");
  }

  function setMsg(text, kind) {
    msgEl.textContent = text;
    msgEl.className = "msg" + (kind ? " " + kind : "");
  }

  // ---------------- menu rendering ----------------
  function renderMenu() {
    playerCountEl.textContent = numPlayers;
    renderNames();
    renderCategoryChips();
    renderTimeChips();
    roundsNote.textContent = ROUNDS_PER_PLAYER;
    menuBestEl.innerHTML = best > 0
      ? "Best winning score: <b>" + best + "</b>"
      : "&nbsp;";
  }

  function renderNames() {
    nameGrid.innerHTML = "";
    // keep existing typed names when possible
    while (nameValues.length < numPlayers) nameValues.push("");
    nameValues.length = numPlayers;
    for (var i = 0; i < numPlayers; i++) {
      (function (idx) {
        var input = document.createElement("input");
        input.type = "text";
        input.maxLength = 12;
        input.placeholder = "Player " + (idx + 1);
        input.value = nameValues[idx];
        input.setAttribute("aria-label", "Player " + (idx + 1) + " name");
        input.style.borderColor = PLAYER_COLORS[idx % PLAYER_COLORS.length];
        input.addEventListener("input", function () {
          nameValues[idx] = input.value;
        });
        nameGrid.appendChild(input);
      })(i);
    }
  }

  function renderCategoryChips() {
    catChipsEl.innerHTML = "";
    for (var i = 0; i < CATEGORIES.length; i++) {
      (function (idx, cat) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (idx === selectedCategory ? " sel" : "");
        b.textContent = cat.icon + " " + cat.label;
        b.addEventListener("click", function () {
          selectedCategory = idx;
          renderCategoryChips();
        });
        catChipsEl.appendChild(b);
      })(i, CATEGORIES[i]);
    }
  }

  function renderTimeChips() {
    timeChipsEl.innerHTML = "";
    for (var i = 0; i < TIME_OPTIONS.length; i++) {
      (function (secs) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (secs === selectedTime ? " sel" : "");
        b.textContent = secs + "s";
        b.addEventListener("click", function () {
          selectedTime = secs;
          renderTimeChips();
        });
        timeChipsEl.appendChild(b);
      })(TIME_OPTIONS[i]);
    }
  }

  function collectNames() {
    var names = [];
    for (var i = 0; i < numPlayers; i++) {
      var n = (nameValues[i] || "").trim();
      names.push(n || ("Player " + (i + 1)));
    }
    return names;
  }

  // ---------------- game state ----------------
  var game = null; // {category, catIdx, catLabel, catWords, time, players[], history[], used{}, turn, totalTurns, required, safety, busy}

  function availableFor(ch) {
    var out = [];
    for (var n in game.catWords) {
      if (!game.used[n] && (ch === null || n[0] === ch)) out.push(n);
    }
    return out;
  }

  function startGame() {
    var names = collectNames();
    var cat = CATEGORIES[selectedCategory];
    game = {
      catIdx: selectedCategory,
      catLabel: cat.icon + " " + cat.label,
      catWords: buildIndex(cat.words),
      time: selectedTime,
      players: names.map(function (nm, i) {
        return { name: nm, color: PLAYER_COLORS[i % PLAYER_COLORS.length], score: 0, words: 0, penalties: 0, turns: 0 };
      }),
      history: [],
      used: {},
      turn: 0,
      totalTurns: names.length * ROUNDS_PER_PLAYER,
      required: null,
      safety: false,
      busy: false,
      longest: null
    };
    catLabelEl.textContent = game.catLabel;
    renderStandings();
    renderHistory();
    startTurn();
    showScreen(gameScreen);
  }

  function restartGame() {
    if (game) stopTimer();
    startGame();
  }

  function quitToMenu() {
    stopTimer();
    game = null;
    renderMenu();
    showScreen(menuScreen);
  }

  // ---------------- turn flow ----------------
  function startTurn() {
    var g = game;
    var idx = g.turn % g.players.length;
    g.players[idx].turns++;
    g.current = idx;
    g.busy = false;

    var last = g.history.length > 0 ? g.history[g.history.length - 1].norm : null;
    g.required = last ? last.charAt(last.length - 1) : null;
    var avail = availableFor(g.required);
    g.safety = g.required !== null && avail.length === 0;

    renderStandings();
    renderBanner();
    renderLetterBadge();
    renderHistory();
    renderLastWord();

    wordInput.value = "";
    wordInput.disabled = false;
    submitBtn.disabled = false;
    setMsg("", "");
    startTimer();
    try { wordInput.focus({ preventScroll: true }); } catch (e) { wordInput.focus(); }
  }

  function renderBanner() {
    var p = game.players[game.current];
    turnBanner.textContent = p.name + "'s turn";
    turnBanner.style.color = p.color;
    turnBanner.style.borderColor = p.color;
  }

  function renderLetterBadge() {
    if (game.required === null) {
      letterBadge.textContent = "ANY WORD";
      letterBadge.classList.remove("free");
    } else if (game.safety) {
      letterBadge.textContent = "FREE PLAY";
      letterBadge.classList.add("free");
    } else {
      letterBadge.textContent = "Start with \"" + game.required.toUpperCase() + "\"";
      letterBadge.classList.remove("free");
    }
    var avail = availableFor(game.required);
    availCountEl.textContent = game.required === null
      ? avail.length + " words in " + CATEGORIES[game.catIdx].label
      : (game.safety
        ? "No words start with \"" + game.required.toUpperCase() + "\" left - play any word!"
        : avail.length + " words available");
  }

  function renderLastWord() {
    var last = game.history[game.history.length - 1];
    if (!last) {
      lastWordEl.innerHTML = "<span class=\"who\">no word yet</span>First word can be anything from the category";
      return;
    }
    var word = last.disp.toUpperCase();
    var next = word.charAt(word.length - 1);
    lastWordEl.innerHTML =
      word.slice(0, -1) + "<b>" + next + "</b>" +
      "<span class=\"who\">played by " + last.playerName + " &middot; +" + last.pts + "</span>";
  }

  function renderStandings() {
    standingsEl.innerHTML = "";
    for (var i = 0; i < game.players.length; i++) {
      var p = game.players[i];
      var chip = document.createElement("span");
      chip.className = "schip" + (game.current === i ? " active" : "");
      chip.style.color = p.color;
      chip.innerHTML = "<span class=\"sname\">" + escapeHtml(p.name) + "</span><span class=\"sscore\">" + p.score + "</span>";
      standingsEl.appendChild(chip);
    }
  }

  function renderHistory() {
    historyEl.innerHTML = "";
    for (var i = 0; i < game.history.length; i++) {
      var h = game.history[i];
      if (i > 0) {
        var link = document.createElement("span");
        link.className = "hlink";
        link.textContent = "\u2192";
        historyEl.appendChild(link);
      }
      var w = document.createElement("span");
      w.className = "hword" + (i === game.history.length - 1 ? " last" : "");
      var disp = h.disp.toUpperCase();
      w.innerHTML = "<i>" + escapeHtml(h.playerName) + "</i>" +
        disp.slice(0, -1) + "<b>" + disp.charAt(disp.length - 1) + "</b>";
      historyEl.appendChild(w);
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------------- timer ----------------
  var timerId = null;
  var deadline = 0;

  function startTimer() {
    stopTimer();
    deadline = Date.now() + game.time * 1000;
    renderTimer(deadline - Date.now());
    timerId = setInterval(function () {
      var left = deadline - Date.now();
      if (left <= 0) {
        stopTimer();
        onTimeout();
        return;
      }
      renderTimer(left);
    }, 100);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function renderTimer(left) {
    var secs = Math.max(0, Math.ceil(left / 1000));
    timerSecsEl.textContent = secs + "s";
    timerSecsEl.classList.toggle("warn", secs <= 3);
    var pct = Math.max(0, Math.min(100, (left / (game.time * 1000)) * 100));
    timerFill.style.width = pct + "%";
    timerFill.classList.toggle("low", pct <= 25);
  }

  // ---------------- actions ----------------
  function onTimeout() {
    if (!game || game.busy) return;
    var p = game.players[game.current];
    applyPenalty(PENALTY_TIME, p.name + " ran out of time!");
  }

  function onSubmitWord() {
    if (!game || game.busy) return;
    var raw = wordInput.value.trim();
    if (!raw) return;

    var g = game;
    var norm = normalize(raw);
    var disp = g.catWords[norm];

    if (!disp) {
      setMsg("\"" + raw.toUpperCase() + "\" is not on the " + CATEGORIES[g.catIdx].label + " list", "bad");
      wordInput.value = "";
      wordInput.focus();
      return;
    }
    if (g.used[norm]) {
      setMsg("\"" + disp.toUpperCase() + "\" was already used!", "bad");
      applyPenalty(PENALTY_DUP, "\"" + disp.toUpperCase() + "\" was already used!");
      return;
    }
    if (!g.safety && g.required !== null && norm.charAt(0) !== g.required) {
      setMsg("The word must start with \"" + g.required.toUpperCase() + "\"", "bad");
      wordInput.value = "";
      wordInput.focus();
      return;
    }

    // valid word
    var pts = norm.length;
    var player = g.players[g.current];
    player.score += pts;
    player.words++;
    g.used[norm] = true;
    if (!g.longest || disp.length > g.longest.length) g.longest = disp;
    g.history.push({ norm: norm, disp: disp, playerName: player.name, pts: pts });
    setMsg("\u2714 " + disp.toUpperCase() + "  +" + pts + " points", "good");
    renderStandings();
    renderHistory();
    renderLastWord();
    wordInput.value = "";
    wordInput.disabled = true;
    submitBtn.disabled = true;
    g.busy = true;
    stopTimer();
    setTimeout(function () {
      if (game === g) advanceTurn();
    }, 950);
  }

  function applyPenalty(points, text) {
    var g = game;
    if (!g || g.busy) return;
    var player = g.players[g.current];
    player.score -= points;
    player.penalties++;
    setMsg("\u2718 " + text + "  -" + points + " points", "bad");
    renderStandings();
    wordInput.value = "";
    wordInput.disabled = true;
    submitBtn.disabled = true;
    g.busy = true;
    stopTimer();
    setTimeout(function () {
      if (game === g) advanceTurn();
    }, 1500);
  }

  function advanceTurn() {
    if (!game) return;
    game.turn++;
    if (game.turn >= game.totalTurns) {
      finishGame();
    } else {
      startTurn();
    }
  }

  // ---------------- end of game ----------------
  function finishGame() {
    stopTimer();
    var sorted = game.players.slice().sort(function (a, b) { return b.score - a.score; });
    var top = sorted[0].score;
    var winners = sorted.filter(function (p) { return p.score === top; });

    if (winners.length === 1) {
      resTitle.textContent = winners[0].name + " wins!";
    } else {
      resTitle.textContent = "It's a tie between " + winners.map(function (w) { return w.name; }).join(" & ") + "!";
    }

    var medals = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
    resTable.innerHTML = "";
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var row = document.createElement("div");
      row.className = "rrow" + (i === 0 ? " top1" : "");
      row.style.color = p.color;
      row.innerHTML =
        "<span class=\"rank\">" + (medals[i] || (i + 1)) + "</span>" +
        "<span class=\"rname\">" + escapeHtml(p.name) + "</span>" +
        "<span class=\"rstat\">" + p.words + " words &middot; " + p.penalties + " penalties</span>" +
        "<span class=\"rscore\">" + p.score + "</span>";
      resTable.appendChild(row);
    }

    var totalWords = game.history.length;
    resStats.textContent = "Chain: " + totalWords + " words" +
      (game.longest ? " &middot; Longest: " + game.longest.toUpperCase() : "");

    var isNewBest = top > best;
    if (isNewBest && top > 0) {
      best = top;
      saveBest();
      resBest.innerHTML = "\u2728 New best winning score: <b>" + top + "</b> \u2728";
    } else {
      resBest.innerHTML = "Best winning score: <b>" + best + "</b>";
    }
    renderMenu();
    showScreen(resultScreen);
  }

  // ---------------- keyboard ----------------
  window.addEventListener("keydown", function (e) {
    if (!gameScreen.classList.contains("hidden")) {
      if (e.code === "Escape") {
        e.preventDefault();
        quitToMenu();
        return;
      }
      if (e.code === "KeyR") {
        e.preventDefault();
        restartGame();
        return;
      }
      if (e.code === "Enter") {
        e.preventDefault();
        onSubmitWord();
        return;
      }
      return;
    }
    if (!resultScreen.classList.contains("hidden")) {
      if (e.code === "Enter" || e.code === "KeyR") {
        e.preventDefault();
        restartGame();
      }
      if (e.code === "Escape") {
        e.preventDefault();
        quitToMenu();
      }
    }
  });

  // ---------------- wiring ----------------
  decBtn.addEventListener("click", function () {
    if (numPlayers > MIN_PLAYERS) {
      numPlayers--;
      nameValues.length = numPlayers;
      renderMenu();
    }
  });
  incBtn.addEventListener("click", function () {
    if (numPlayers < MAX_PLAYERS) {
      numPlayers++;
      renderMenu();
    }
  });
  startBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", restartGame);
  menuBtn.addEventListener("click", quitToMenu);
  restartBtn.addEventListener("click", restartGame);
  submitBtn.addEventListener("click", onSubmitWord);

  // ---------------- init ----------------
  renderMenu();
  showScreen(menuScreen);
})();
