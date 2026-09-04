(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var p1ScoreEl = document.getElementById("p1score");
  var p2ScoreEl = document.getElementById("p2score");
  var modeLabelEl = document.getElementById("modeLabel");
  var effectsEl = document.getElementById("activeEffects");
  var modeSelectEl = document.getElementById("modeSelect");

  var W = canvas.width,
    H = canvas.height;
  var PW = 12,
    PH = 80;
  var BASE_SPEED = 320;
  var MAX_SPEED_MULT = 2.5;

  var mode = "classic";
  var left = { y: H / 2 - PH / 2, speed: 380 };
  var right = { y: H / 2 - PH / 2, speed: 380 };
  var keys = { p1Up: false, p1Down: false, p2Up: false, p2Down: false };
  var ball = null;
  var state = "start";
  var score1 = 0,
    score2 = 0;
  var last = 0;
  var serveTimer = 0;
  var winner = "";

  // Chaos mode state
  var rallyHits = 0;
  var pickupTimer = 0;
  var pickups = [];
  var extraBalls = [];
  var wideLeftTimer = 0;
  var wideRightTimer = 0;
  var leftH = PH;
  var rightH = PH;

  function resetBall(dx) {
    rallyHits = 0;
    ball = {
      x: W / 2,
      y: H / 2,
      r: 9,
      vx: dx * BASE_SPEED,
      vy: (Math.random() * 2 - 1) * 120,
      speed: BASE_SPEED
    };
    extraBalls = [];
    pickups = [];
    pickupTimer = 6;
    wideLeftTimer = 0;
    wideRightTimer = 0;
    leftH = PH;
    rightH = PH;
  }

  function reset() {
    score1 = 0;
    score2 = 0;
    left.y = H / 2 - PH / 2;
    right.y = H / 2 - PH / 2;
    p1ScoreEl.textContent = "0";
    p2ScoreEl.textContent = "0";
    winner = "";
    state = "play";
    serveTimer = 1.0;
    resetBall(Math.random() < 0.5 ? 1 : -1);
    updateModeUI();
  }

  function score(side) {
    if (side === "left") score1++;
    else score2++;
    p1ScoreEl.textContent = score1;
    p2ScoreEl.textContent = score2;
    extraBalls = [];
    if (score1 >= 5 || score2 >= 5) {
      winner = score1 > score2 ? "Player 1" : "Player 2";
      state = "win";
      showModeSelect();
      return;
    }
    state = "play";
    serveTimer = 1.0;
    resetBall(side === "left" ? -1 : 1);
  }

  function spawnPickup() {
    var type = Math.random() < 0.5 ? "WIDE" : "MULTI";
    pickups.push({
      x: W / 2,
      y: 40 + Math.random() * (H - 80),
      w: 20,
      h: 20,
      type: type
    });
  }

  function applyPickup(pickup, hitter) {
    if (pickup.type === "WIDE") {
      if (hitter === "left") {
        leftH = Math.round(PH * 1.5);
        wideLeftTimer = 10;
      } else {
        rightH = Math.round(PH * 1.5);
        wideRightTimer = 10;
      }
    } else if (pickup.type === "MULTI") {
      extraBalls.push({
        x: ball.x,
        y: ball.y,
        r: 7,
        vx: -ball.vx * 0.8,
        vy: (Math.random() * 2 - 1) * 200
      });
    }
  }

  function updateBall(b, dt, isExtra) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if (b.y - b.r < 0) {
      b.y = b.r;
      b.vy = Math.abs(b.vy);
    }
    if (b.y + b.r > H) {
      b.y = H - b.r;
      b.vy = -Math.abs(b.vy);
    }

    if (b.vx < 0 && b.x - b.r < 20 && b.x + b.r > 20) {
      if (b.y > left.y - 4 && b.y < left.y + leftH + 4) {
        var rel = (b.y - (left.y + leftH / 2)) / (leftH / 2);
        if (isExtra) {
          b.vx = Math.abs(b.vx) + 12;
          b.vy = rel * 300;
        } else if (mode === "chaos") {
          rallyHits++;
          var mult = Math.min(MAX_SPEED_MULT, 1 + rallyHits * 0.05);
          b.vx = BASE_SPEED * mult;
          b.vy = rel * 300 * mult;
        } else {
          b.vx = Math.abs(b.vx) + 12;
          b.vy = rel * 300;
        }
        b.x = 20 + b.r;
        return false;
      }
    }

    if (b.vx > 0 && b.x + b.r > W - 20 && b.x - b.r < W - 20) {
      if (b.y > right.y - 4 && b.y < right.y + rightH + 4) {
        var rel2 = (b.y - (right.y + rightH / 2)) / (rightH / 2);
        if (isExtra) {
          b.vx = -(Math.abs(b.vx) + 12);
          b.vy = rel2 * 300;
        } else if (mode === "chaos") {
          rallyHits++;
          var mult2 = Math.min(MAX_SPEED_MULT, 1 + rallyHits * 0.05);
          b.vx = -(BASE_SPEED * mult2);
          b.vy = rel2 * 300 * mult2;
        } else {
          b.vx = -(Math.abs(b.vx) + 12);
          b.vy = rel2 * 300;
        }
        b.x = W - 20 - b.r;
        return false;
      }
    }

    if (b.x < -30) return "right";
    if (b.x > W + 30) return "left";
    return false;
  }

  function updateEffectsDisplay() {
    var parts = [];
    if (wideLeftTimer > 0) parts.push("P1 WIDE " + Math.ceil(wideLeftTimer) + "s");
    if (wideRightTimer > 0) parts.push("P2 WIDE " + Math.ceil(wideRightTimer) + "s");
    if (extraBalls.length > 0) parts.push("MULTI active");
    effectsEl.textContent = parts.join(" | ");
  }

  function updateModeUI() {
    if (modeLabelEl) {
      if (mode === "mirror") {
        modeLabelEl.textContent = "Mirror - P2 controls flipped";
      } else if (mode === "chaos") {
        modeLabelEl.textContent = "Chaos Mode";
      } else {
        modeLabelEl.textContent = "";
      }
    }
    if (effectsEl) effectsEl.textContent = "";
    if (mode === "mirror") {
      document.getElementById("p2Up").innerHTML = "&#9660;";
      document.getElementById("p2Down").innerHTML = "&#9650;";
    } else {
      document.getElementById("p2Up").innerHTML = "&#9650;";
      document.getElementById("p2Down").innerHTML = "&#9660;";
    }
  }

  function showModeSelect() {
    if (modeSelectEl) modeSelectEl.style.display = "";
  }

  function hideModeSelect() {
    if (modeSelectEl) modeSelectEl.style.display = "none";
  }

  function update(dt) {
    if (state === "play") {
      if (keys.p1Up) left.y -= left.speed * dt;
      if (keys.p1Down) left.y += left.speed * dt;

      if (mode === "mirror") {
        if (keys.p2Up) right.y += right.speed * dt;
        if (keys.p2Down) right.y -= right.speed * dt;
      } else {
        if (keys.p2Up) right.y -= right.speed * dt;
        if (keys.p2Down) right.y += right.speed * dt;
      }

      left.y = Math.max(0, Math.min(H - leftH, left.y));
      right.y = Math.max(0, Math.min(H - rightH, right.y));

      if (mode === "chaos") {
        if (wideLeftTimer > 0) {
          wideLeftTimer -= dt;
          if (wideLeftTimer <= 0) {
            wideLeftTimer = 0;
            leftH = PH;
            left.y = Math.min(left.y, H - PH);
          }
        }
        if (wideRightTimer > 0) {
          wideRightTimer -= dt;
          if (wideRightTimer <= 0) {
            wideRightTimer = 0;
            rightH = PH;
            right.y = Math.min(right.y, H - PH);
          }
        }
      }

      if (serveTimer > 0) {
        serveTimer -= dt;
      } else {
        if (mode === "chaos") {
          pickupTimer -= dt;
          if (pickupTimer <= 0) {
            spawnPickup();
            pickupTimer = 5 + Math.random() * 2;
          }
        }

        var result = updateBall(ball, dt, false);
        if (result) {
          score(result);
        } else {
          for (var i = extraBalls.length - 1; i >= 0; i--) {
            var er = updateBall(extraBalls[i], dt, true);
            if (er) {
              score(er);
              break;
            }
          }

          if (mode === "chaos") {
            for (var j = pickups.length - 1; j >= 0; j--) {
              var p = pickups[j];
              if (Math.abs(ball.x - p.x) < p.w / 2 + ball.r && Math.abs(ball.y - p.y) < p.h / 2 + ball.r) {
                var hitter = ball.vx > 0 ? "left" : "right";
                applyPickup(p, hitter);
                pickups.splice(j, 1);
              }
            }
          }
        }
      }

      if (mode === "chaos") updateEffectsDisplay();
    }
  }

  function draw() {
    ctx.fillStyle = "#07140c";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = "#4dd2ff";
    ctx.fillRect(12, left.y, PW, leftH);
    ctx.fillStyle = "#ffd94a";
    ctx.fillRect(W - 12 - PW, right.y, PW, rightH);

    if (ball) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (mode === "chaos") {
      for (var i = 0; i < extraBalls.length; i++) {
        var eb = extraBalls[i];
        ctx.fillStyle = "#ff6666";
        ctx.beginPath();
        ctx.arc(eb.x, eb.y, eb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      for (var j = 0; j < pickups.length; j++) {
        var p = pickups[j];
        ctx.fillStyle = p.type === "WIDE" ? "#4dd2ff" : "#ff9944";
        ctx.fillRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.type === "WIDE" ? "W" : "M", p.x, p.y + 3);
      }
    }

    ctx.textAlign = "center";
    if (state === "start") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("PADDLE DUEL", W / 2, H / 2 - 50);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#cfe0ff";
      ctx.fillText("Player 1 (blue): W / S", W / 2, H / 2 - 10);
      ctx.fillText("Player 2 (gold): Up / Down", W / 2, H / 2 + 16);
      ctx.fillStyle = "#4dd2ff";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("Press SPACE to start", W / 2, H / 2 + 60);
    } else if (state === "win") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText(winner + " WINS!", W / 2, H / 2 - 20);
      ctx.fillStyle = "#fff";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText(score1 + " - " + score2, W / 2, H / 2 + 22);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE to play again", W / 2, H / 2 + 62);
    }
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function start() {
    if (state === "start" || state === "win") {
      hideModeSelect();
      reset();
    }
  }

  function selectMode(m) {
    mode = m;
    start();
  }

  window.addEventListener("keydown", function (e) {
    switch (e.code) {
      case "KeyW":
        keys.p1Up = true;
        break;
      case "KeyS":
        keys.p1Down = true;
        break;
      case "ArrowUp":
        e.preventDefault();
        keys.p2Up = true;
        break;
      case "ArrowDown":
        e.preventDefault();
        keys.p2Down = true;
        break;
      case "Space":
        e.preventDefault();
        start();
        break;
    }
  });
  window.addEventListener("keyup", function (e) {
    switch (e.code) {
      case "KeyW":
        keys.p1Up = false;
        break;
      case "KeyS":
        keys.p1Down = false;
        break;
      case "ArrowUp":
        keys.p2Up = false;
        break;
      case "ArrowDown":
        keys.p2Down = false;
        break;
    }
  });

  function hold(el, on, off) {
    var active = false;
    function d(e) {
      e.preventDefault();
      if (!active) {
        active = true;
        on();
      }
    }
    function u(e) {
      e.preventDefault();
      if (active) {
        active = false;
        off();
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
    document.getElementById("p1Up"),
    function () { keys.p1Up = true; },
    function () { keys.p1Up = false; }
  );
  hold(
    document.getElementById("p1Down"),
    function () { keys.p1Down = true; },
    function () { keys.p1Down = false; }
  );
  hold(
    document.getElementById("p2Up"),
    function () { keys.p2Up = true; },
    function () { keys.p2Up = false; }
  );
  hold(
    document.getElementById("p2Down"),
    function () { keys.p2Down = true; },
    function () { keys.p2Down = false; }
  );

  var modeBtns = document.querySelectorAll(".mode-btn");
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].addEventListener("click", function (e) {
      selectMode(e.target.getAttribute("data-mode"));
    });
  }

  canvas.addEventListener("pointerdown", start);

  requestAnimationFrame(loop);
})();
