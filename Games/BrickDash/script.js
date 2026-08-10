(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var scoreEl = document.getElementById("score");
  var comboEl = document.getElementById("combo");
  var livesEl = document.getElementById("lives");

  var W = canvas.width,
    H = canvas.height;
  var keyLeft = false,
    keyRight = false;

  var PAD_W = 90,
    PAD_H = 14;
  var paddle = { x: W / 2, y: H - 40, speed: 430, dash: 0, dir: 0 };
  var ball = null;
  var bricks = [];
  var state = "start"; // start | ready | play | over | win
  var score = 0,
    lives = 3,
    level = 1;
  var combo = 0,
    comboT = 0;
  var last = 0;
  var best = parseInt(localStorage.getItem("brickdash_best") || "0", 10);
  var colors = ["#ff6b6b", "#ff9d4a", "#ffd94a", "#4dd2ff", "#7dff8a", "#c77dff"];

  var COLS = 8,
    ROWS = 6;

  function buildLevel() {
    bricks = [];
    var margin = 10,
      gap = 4;
    var bw = (W - margin * 2 - gap * (COLS - 1)) / COLS;
    var bh = 20;
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (Math.random() < 0.06) continue; // a few random gaps
        bricks.push({
          x: margin + c * (bw + gap),
          y: 42 + r * (bh + gap),
          w: bw,
          h: bh,
          hp: r >= ROWS - 2 ? 2 : 1,
          color: colors[r % colors.length]
        });
      }
    }
  }

  function placeBall() {
    ball = {
      x: paddle.x,
      y: paddle.y - 10,
      r: 8,
      vx: 0,
      vy: 0,
      speed: 300 + level * 20,
      stuck: true
    };
  }

  function reset() {
    score = 0;
    lives = 3;
    level = 1;
    combo = 0;
    buildLevel();
    placeBall();
    scoreEl.textContent = "0";
    livesEl.textContent = "3";
    comboEl.textContent = "x1";
    state = "ready";
  }

  function launch() {
    if (state !== "ready") return;
    state = "play";
    ball.stuck = false;
    var a = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
    ball.vx = Math.cos(a) * ball.speed * (Math.random() < 0.5 ? 1 : -1);
    ball.vy = Math.sin(a) * ball.speed;
  }

  function addScore(n) {
    score += n;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      localStorage.setItem("brickdash_best", String(best));
    }
  }

  function hitBrick(b) {
    b.hp--;
    if (b.hp <= 0) {
      bricks.splice(bricks.indexOf(b), 1);
      combo++;
      comboT = 2.5;
      var mult = Math.min(8, combo);
      addScore(10 * mult);
      comboEl.textContent = "x" + mult;
    } else {
      addScore(5);
    }
  }

  function loseLife() {
    lives--;
    livesEl.textContent = lives;
    combo = 0;
    comboT = 0;
    comboEl.textContent = "x1";
    if (lives <= 0) {
      state = "over";
    } else {
      state = "ready";
      placeBall();
    }
  }

  function update(dt) {
    if (state !== "play" && state !== "ready") return;

    var dir = (keyRight ? 1 : 0) - (keyLeft ? 1 : 0);
    if (dir !== 0) paddle.dir = dir;

    var speed = paddle.speed;
    if (state === "play" && paddle.dash > 0) {
      paddle.dash -= dt;
      speed = 920;
      if (paddle.dir !== 0) dir = paddle.dir;
    }
    paddle.x += dir * speed * dt;
    paddle.x = Math.max(PAD_W / 2, Math.min(W - PAD_W / 2, paddle.x));

    if (state === "ready") {
      ball.x = paddle.x;
      ball.y = paddle.y - 10;
      return;
    }

    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) {
        combo = 0;
        comboEl.textContent = "x1";
      }
    }

    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx = Math.abs(ball.vx);
    }
    if (ball.x + ball.r > W) {
      ball.x = W - ball.r;
      ball.vx = -Math.abs(ball.vx);
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy = Math.abs(ball.vy);
    }

    if (
      ball.vy > 0 &&
      ball.y + ball.r > paddle.y &&
      ball.y + ball.r < paddle.y + 16 &&
      ball.x > paddle.x - PAD_W / 2 - ball.r &&
      ball.x < paddle.x + PAD_W / 2 + ball.r
    ) {
      var rel = (ball.x - paddle.x) / (PAD_W / 2);
      var ang = rel * 1.15;
      ball.vx = Math.sin(ang) * ball.speed;
      ball.vy = -Math.abs(Math.cos(ang)) * ball.speed;
      ball.y = paddle.y - ball.r;
    }

    for (var i = bricks.length - 1; i >= 0; i--) {
      var b = bricks[i];
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        var overlapX = Math.min(
          ball.x + ball.r - b.x,
          b.x + b.w - (ball.x - ball.r)
        );
        var overlapY = Math.min(
          ball.y + ball.r - b.y,
          b.y + b.h - (ball.y - ball.r)
        );
        if (overlapX < overlapY) {
          ball.vx = ball.x < b.x + b.w / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        } else {
          ball.vy = ball.y < b.y + b.h / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy);
        }
        hitBrick(b);
        break;
      }
    }

    if (ball.y - ball.r > H) {
      loseLife();
      return;
    }

    if (bricks.length === 0) {
      state = "win";
    }
  }

  function draw() {
    ctx.fillStyle = "#160b1f";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Level " + level, 12, 24);

    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      ctx.fillStyle = b.hp > 1 ? "#ffffff" : b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.hp > 1) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
      }
    }

    ctx.fillStyle = "#ff9d4a";
    if (state === "play" && paddle.dash > 0) {
      ctx.fillStyle = "#ffd94a";
      ctx.shadowColor = "#ffd94a";
      ctx.shadowBlur = 16;
    }
    ctx.beginPath();
    ctx.roundRect(paddle.x - PAD_W / 2, paddle.y - PAD_H / 2, PAD_W, PAD_H, 7);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (ball) {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.textAlign = "center";
    if (state === "start") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("BRICK DASH", W / 2, H / 2 - 60);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillStyle = "#cfe0ff";
      ctx.fillText("Break bricks fast to build combos!", W / 2, H / 2 - 24);
      ctx.fillStyle = "#ff9d4a";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("Press SPACE or tap to start", W / 2, H / 2 + 20);
    } else if (state === "over") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#ff5a5a";
      ctx.font = "bold 34px system-ui, sans-serif";
      ctx.fillText("GAME OVER", W / 2, H / 2 - 30);
      ctx.fillStyle = "#fff";
      ctx.font = "20px system-ui, sans-serif";
      ctx.fillText("Score: " + score + "  Best: " + best, W / 2, H / 2 + 8);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE to play again", W / 2, H / 2 + 48);
    } else if (state === "win") {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#7dff8a";
      ctx.font = "bold 30px system-ui, sans-serif";
      ctx.fillText("LEVEL CLEARED!", W / 2, H / 2 - 40);
      ctx.fillStyle = "#fff";
      ctx.font = "18px system-ui, sans-serif";
      ctx.fillText("Score: " + score, W / 2, H / 2 - 4);
      ctx.fillStyle = "#cfe0ff";
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText("Press SPACE for next level", W / 2, H / 2 + 32);
    } else if (state === "ready") {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "bold 18px system-ui, sans-serif";
      ctx.fillText("Press SPACE to launch", W / 2, H / 2);
    }
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function primary() {
    if (state === "start" || state === "over") {
      reset();
    } else if (state === "win") {
      level++;
      buildLevel();
      placeBall();
      state = "ready";
    } else if (state === "ready") {
      launch();
    } else if (state === "play") {
      paddle.dash = 0.22;
      if (paddle.dir === 0 && (keyLeft || keyRight)) {
        paddle.dir = keyLeft ? -1 : 1;
      }
    }
  }

  window.addEventListener("keydown", function (e) {
    if (e.code === "ArrowLeft" || e.code === "KeyA") keyLeft = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") keyRight = true;
    if (e.code === "Space") {
      e.preventDefault();
      primary();
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
    // Keyboard: Enter/Space on the focused button press-and-hold like touch.
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
  hold(document.getElementById("dashBtn"), primary, null);

  canvas.addEventListener("pointerdown", primary);

  requestAnimationFrame(loop);
})();
