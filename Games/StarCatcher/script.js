(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var livesEl = document.getElementById("lives");
  var scoreLabel = document.getElementById("scoreLabel");
  var livesSpan = document.getElementById("livesSpan");
  var modeSelect = document.getElementById("modeSelect");

  var W = canvas.width,
    H = canvas.height;
  var keyLeft = false,
    keyRight = false;

  var state = "start"; // start | play | over
  var currentMode = "classic"; // classic | lowg | storm
  var score = 0,
    lives = 3,
    level = 1;
  var survivalTime = 0;
  var bests = { classic: 0, lowg: 0, storm: 0 };

  // Migrate old localStorage best
  try {
    var oldBest = parseInt(localStorage.getItem("starcatcher_best") || "0", 10);
    if (oldBest > 0) bests.classic = oldBest;
  } catch (e) {}

  // Load per-mode bests via GameSave (may be undefined)
  try {
    if (typeof GameSave !== "undefined") {
      var saved = GameSave.load("starcatcher");
      if (saved) {
        if (saved.classic != null) bests.classic = saved.classic;
        if (saved.lowg != null) bests.lowg = saved.lowg;
        if (saved.storm != null) bests.storm = saved.storm;
      }
    }
  } catch (e) {}

  var best = bests.classic;
  bestEl.textContent = best;

  var basket = { x: W / 2, w: 76, h: 16, y: H - 36, speed: 340 };
  var items = [];
  var spawnTimer = 0;
  var last = 0;
  var msg = "";
  var msgT = 0;

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function persistBests() {
    try {
      if (typeof GameSave !== "undefined") {
        GameSave.save("starcatcher", {
          classic: bests.classic,
          lowg: bests.lowg,
          storm: bests.storm
        });
      }
    } catch (e) {}
  }

  function updateBest() {
    var currentScore = currentMode === "storm" ? survivalTime : score;
    if (currentScore > bests[currentMode]) {
      bests[currentMode] = currentMode === "storm"
        ? Math.round(currentScore * 10) / 10
        : currentScore;
      best = bests[currentMode];
      bestEl.textContent = currentMode === "storm" ? best.toFixed(1) : best;
      persistBests();
    }
  }

  function showModeButtons() {
    modeSelect.classList.remove("hidden");
    var btns = modeSelect.querySelectorAll(".mode-btn");
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].dataset.mode === currentMode) {
        btns[i].classList.add("mode-btn--active");
      } else {
        btns[i].classList.remove("mode-btn--active");
      }
    }
  }

  function reset(mode) {
    currentMode = mode || "classic";
    score = 0;
    lives = 3;
    level = 1;
    items = [];
    spawnTimer = 0;
    basket.x = W / 2;
    survivalTime = 0;
    msg = "";
    msgT = 0;

    // HUD setup per mode
    if (currentMode === "storm") {
      scoreLabel.textContent = "Time";
      livesSpan.style.display = "none";
      scoreEl.textContent = "0.0";
    } else {
      scoreLabel.textContent = "Score";
      livesSpan.style.display = "";
      scoreEl.textContent = "0";
      livesEl.textContent = "3";
    }

    best = bests[currentMode];
    bestEl.textContent = currentMode === "storm" ? best.toFixed(1) : best;

    modeSelect.classList.add("hidden");
    state = "play";
  }

  function spawn() {
    if (currentMode === "storm") {
      items.push({
        kind: "bomb",
        val: 1,
        x: rand(18, W - 18),
        y: -16,
        r: 11,
        vy: 130 + level * 15 + rand(0, 50)
      });
    } else {
      var star = Math.random() < 0.84;
      var r = Math.random();
      var val = star ? (r < 0.6 ? 1 : r < 0.86 ? 2 : 3) : 1;
      var vy = 130 + level * 12 + rand(0, 40);
      if (currentMode === "lowg") vy *= 0.5;
      items.push({
        kind: star ? "star" : "bomb",
        val: val,
        x: rand(18, W - 18),
        y: -16,
        r: star ? 13 : 11,
        vy: vy
      });
    }
  }

  function drawStar(x, y, r, c) {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var rad = i % 2 === 0 ? r : r * 0.45;
      var a = (Math.PI / 5) * i - Math.PI / 2;
      var px = x + Math.cos(a) * rad;
      var py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = "#0d1330";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (var i = 0; i < 40; i++) {
      var sx = (i * 53) % W,
        sy = (i * 97) % H;
      ctx.fillRect(sx, sy, 2, 2);
    }

    for (var j = 0; j < items.length; j++) {
      var it = items[j];
      if (it.kind === "star") {
        var colors = ["#ffd94a", "#ff9d4a", "#ff4ad2"];
        drawStar(it.x, it.y, it.r, colors[it.val - 1]);
      } else {
        ctx.fillStyle = "#3a3f52";
        ctx.beginPath();
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ff5a5a";
        ctx.fillRect(it.x - 2, it.y - it.r - 6, 4, 8);
      }
    }

    ctx.fillStyle = "#5b8cff";
    ctx.beginPath();
    ctx.moveTo(basket.x - basket.w / 2, basket.y);
    ctx.lineTo(basket.x - basket.w / 2 + 10, basket.y + basket.h);
    ctx.lineTo(basket.x + basket.w / 2 - 10, basket.y + basket.h);
    ctx.lineTo(basket.x + basket.w / 2, basket.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7fa4ff";
    ctx.fillRect(basket.x - basket.w / 2, basket.y - 4, basket.w, 6);

    ctx.textAlign = "center";
    if (state === "start") {
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.fillText("STAR CATCHER", W / 2, H / 2 - 60);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#cfe0ff";
      ctx.fillText("Catch stars, dodge bombs!", W / 2, H / 2 - 24);
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText("Pick a mode below or press 1/2/3", W / 2, H / 2 + 20);
      ctx.fillStyle = "#7f8db3";
      ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("1 = Classic  2 = Low Gravity  3 = Dodge Storm", W / 2, H / 2 + 50);
    } else if (state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff5a5a";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 40);
      ctx.fillStyle = "#fff";
      ctx.font = "20px system-ui, sans-serif";
      if (currentMode === "storm") {
        ctx.fillText("Survived: " + survivalTime.toFixed(1) + "s", W / 2, H / 2 + 4);
        ctx.fillStyle = "#ffd94a";
        ctx.fillText("Best: " + bests.storm.toFixed(1) + "s", W / 2, H / 2 + 34);
      } else {
        ctx.fillText("Score: " + score, W / 2, H / 2 + 4);
        ctx.fillStyle = "#ffd94a";
        ctx.fillText("Best: " + best, W / 2, H / 2 + 34);
      }
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE to replay or pick a mode", W / 2, H / 2 + 74);
    } else {
      if (msgT > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 18px system-ui, sans-serif";
        ctx.fillText(msg, W / 2, H / 2);
      }
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = "13px system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Level " + level, W - 10, 20);
      if (currentMode !== "classic") {
        ctx.textAlign = "left";
        ctx.fillText(currentMode === "lowg" ? "Low Gravity" : "Dodge Storm", 10, 20);
      }
      ctx.textAlign = "center";
    }
  }

  function flash(t) {
    msg = t;
    msgT = 1.2;
  }

  function update(dt) {
    if (state !== "play") return;

    // Storm: track survival time as score
    if (currentMode === "storm") {
      survivalTime += dt;
      scoreEl.textContent = survivalTime.toFixed(1);
      level = 1 + Math.floor(survivalTime / 10);
    } else {
      level = 1 + Math.floor(score / 25);
    }

    var dir = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
    basket.x += dir * basket.speed * dt;
    basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      spawn();
      if (currentMode === "lowg") {
        spawnTimer = Math.max(0.14, 0.45 - level * 0.03);
      } else if (currentMode === "storm") {
        spawnTimer = Math.max(0.15, 0.45 - level * 0.03);
      } else {
        spawnTimer = Math.max(0.28, 0.9 - level * 0.06);
      }
    }

    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y += it.vy * dt;
      if (it.y - it.r > basket.y + basket.h) {
        items.splice(i, 1);
        continue;
      }
      if (
        it.y + it.r >= basket.y &&
        it.x > basket.x - basket.w / 2 - it.r &&
        it.x < basket.x + basket.w / 2 + it.r
      ) {
        items.splice(i, 1);
        if (it.kind === "star") {
          score += it.val;
          scoreEl.textContent = score;
          updateBest();
        } else {
          if (currentMode === "storm") {
            // Storm: any bomb contact ends the run
            updateBest();
            state = "over";
            showModeButtons();
          } else {
            lives--;
            livesEl.textContent = lives;
            if (lives <= 0) {
              state = "over";
              updateBest();
              showModeButtons();
            } else {
              flash("Bomb! -1 life");
            }
          }
        }
      }
    }

    if (msgT > 0) msgT -= dt;
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function start(mode) {
    if (state === "start" || state === "over") reset(mode);
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keyLeft = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keyRight = true;
    if (e.code === "Space") {
      e.preventDefault();
      start(currentMode);
    }
    // Mode select keys (start or over screen)
    if (state === "start" || state === "over") {
      if (e.code === "Digit1") {
        e.preventDefault();
        start("classic");
      }
      if (e.code === "Digit2") {
        e.preventDefault();
        start("lowg");
      }
      if (e.code === "Digit3") {
        e.preventDefault();
        start("storm");
      }
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keyLeft = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") keyRight = false;
  });

  function hold(el, down, up) {
    var on = false;
    function d(e) {
      e.preventDefault();
      if (!on) {
        on = true;
        down();
      }
    }
    function u(e) {
      e.preventDefault();
      if (on) {
        on = false;
        if (up) up();
      }
    }
    el.addEventListener("touchstart", d, { passive: false });
    el.addEventListener("touchend", u, { passive: false });
    el.addEventListener("touchcancel", u, { passive: false });
    el.addEventListener("mousedown", d);
    el.addEventListener("mouseup", u);
    el.addEventListener("mouseleave", u);
    el.addEventListener("keydown", function (e) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        d(e);
      }
    });
    el.addEventListener("keyup", function (e) {
      if (e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        u(e);
      }
    });
  }

  hold(
    document.getElementById("leftBtn"),
    function () { keyLeft = true; },
    function () { keyLeft = false; }
  );
  hold(
    document.getElementById("rightBtn"),
    function () { keyRight = true; },
    function () { keyRight = false; }
  );

  // Mode button clicks
  var modeBtns = modeSelect.querySelectorAll(".mode-btn");
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].addEventListener("click", function () {
      start(this.dataset.mode);
    });
  }

  canvas.addEventListener("pointerdown", function () {
    start(currentMode);
  });

  requestAnimationFrame(loop);
})();
