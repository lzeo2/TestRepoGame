(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var p1ScoreEl = document.getElementById("p1score");
  var p2ScoreEl = document.getElementById("p2score");

  var W = canvas.width,
    H = canvas.height;
  var PW = 12,
    PH = 80;
  var left = { y: H / 2 - PH / 2, speed: 380 };
  var right = { y: H / 2 - PH / 2, speed: 380 };
  var keys = { p1Up: false, p1Down: false, p2Up: false, p2Down: false };
  var ball = null;
  var state = "start"; // start | play | win
  var score1 = 0,
    score2 = 0;
  var last = 0;
  var serveTimer = 0;
  var winner = "";

  function resetBall(dx) {
    ball = {
      x: W / 2,
      y: H / 2,
      r: 9,
      vx: dx * 320,
      vy: (Math.random() * 2 - 1) * 120,
      speed: 320
    };
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
  }

  function score(side) {
    if (side === "left") score1++;
    else score2++;
    p1ScoreEl.textContent = score1;
    p2ScoreEl.textContent = score2;
    if (score1 >= 5 || score2 >= 5) {
      winner = score1 > score2 ? "Player 1" : "Player 2";
      state = "win";
      return;
    }
    state = "play";
    serveTimer = 1.0;
    resetBall(side === "left" ? -1 : 1);
  }

  function update(dt) {
    if (state === "play") {
      if (keys.p1Up) left.y -= left.speed * dt;
      if (keys.p1Down) left.y += left.speed * dt;
      if (keys.p2Up) right.y -= right.speed * dt;
      if (keys.p2Down) right.y += right.speed * dt;
      left.y = Math.max(0, Math.min(H - PH, left.y));
      right.y = Math.max(0, Math.min(H - PH, right.y));

      if (serveTimer > 0) {
        serveTimer -= dt;
      } else {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        if (ball.y - ball.r < 0) {
          ball.y = ball.r;
          ball.vy = Math.abs(ball.vy);
        }
        if (ball.y + ball.r > H) {
          ball.y = H - ball.r;
          ball.vy = -Math.abs(ball.vy);
        }

        if (ball.vx < 0 && ball.x - ball.r < 20 && ball.x + ball.r > 20) {
          if (ball.y > left.y - 4 && ball.y < left.y + PH + 4) {
            var rel = (ball.y - (left.y + PH / 2)) / (PH / 2);
            ball.vy = rel * 300;
            ball.vx = Math.abs(ball.vx) + 12;
            ball.x = 20 + ball.r;
          }
        }
        if (ball.vx > 0 && ball.x + ball.r > W - 20 && ball.x - ball.r < W - 20) {
          if (ball.y > right.y - 4 && ball.y < right.y + PH + 4) {
            var rel2 = (ball.y - (right.y + PH / 2)) / (PH / 2);
            ball.vy = rel2 * 300;
            ball.vx = -(Math.abs(ball.vx) + 12);
            ball.x = W - 20 - ball.r;
          }
        }

        if (ball.x < -30) score("right");
        else if (ball.x > W + 30) score("left");
      }
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
    ctx.fillRect(12, left.y, PW, PH);
    ctx.fillStyle = "#ffd94a";
    ctx.fillRect(W - 12 - PW, right.y, PW, PH);

    if (ball) {
      ctx.fillStyle = "#ffffff";
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
    if (state === "start" || state === "win") reset();
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

  canvas.addEventListener("pointerdown", start);

  requestAnimationFrame(loop);
})();
