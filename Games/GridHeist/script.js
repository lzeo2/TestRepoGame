/*
 * Grid Heist — a local hotseat territory-claiming race for 2-4 players.
 *
 * RULES
 *   A vault sits in the centre of the grid. On your turn (4 seconds) claim
 *   ONE unclaimed cell that is orthogonally adjacent to a cell you already
 *   own. Build a route to the vault and be the first to capture it, while
 *   claiming cells to block your rivals' routes.
 *
 *   The game ends when the vault is captured (at the end of that round),
 *   when the vault is sealed (every cell around it is claimed), when every
 *   player is boxed in, or after round 12.
 *
 * SCORING  (route-to-vault)
 *   Cells  1 point per cell you own
 *   Route  1 extra point per cell connected to the vault through your cells
 *          (cut off a rival's route and those cells stop scoring)
 *   Vault  +5 for the player who captured the vault
 *
 * CONTROLS
 *   Touch / mouse : tap a glowing cell to claim it.
 *   Keyboard      : arrows / WASD move the cursor, Space / Enter claim,
 *                   2 / 3 / 4 pick players in the menu, Enter starts,
 *                   R returns to the menu.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var statsEl = document.getElementById("stats");
  var statusEl = document.getElementById("status");
  var roundEl = document.getElementById("roundLabel");
  var timerEl = document.getElementById("timerBar");
  var menuEl = document.getElementById("menu");
  var endEl = document.getElementById("end");
  var endTitle = document.getElementById("endTitle");
  var endSub = document.getElementById("endSub");
  var resultTable = document.getElementById("resultTable");
  var startBtn = document.getElementById("startBtn");
  var againBtn = document.getElementById("againBtn");
  var menuBtn = document.getElementById("menuBtn");
  var restartBtn = document.getElementById("restartBtn");
  var countBtns = {
    2: document.getElementById("p2btn"),
    3: document.getElementById("p3btn"),
    4: document.getElementById("p4btn")
  };

  var COLS = 11, ROWS = 11, CELL = 50;
  var LOGICAL = COLS * CELL;
  var V = { c: 5, r: 5 }; /* vault cell */
  var TURN_TIME = 4; /* seconds per turn */
  var ROUND_CAP = 12;
  var PCOL = ["#4dd2ff", "#ffd94a", "#ff7a7a", "#7ee08a"];
  var PNAME = ["P1", "P2", "P3", "P4"];
  var BASES = {
    2: [{ c: 0, r: 0 }, { c: 10, r: 10 }],
    3: [{ c: 0, r: 0 }, { c: 10, r: 0 }, { c: 0, r: 10 }],
    4: [{ c: 0, r: 0 }, { c: 10, r: 0 }, { c: 10, r: 10 }, { c: 0, r: 10 }]
  };
  var DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

  var dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = LOGICAL * dpr;
  canvas.height = LOGICAL * dpr;
  ctx.scale(dpr, dpr);

  var grid = [];
  var n = 2, cur = 0, round = 1, turnLeft = TURN_TIME;
  var state = "menu"; /* menu | play | end */
  var endPending = false, capturedBy = -1;
  var cursor = { c: V.c, r: V.r };
  var terr = [0, 0, 0, 0], route = [0, 0, 0, 0];
  var bonus = [0, 0, 0, 0], total = [0, 0, 0, 0];
  var routeCells = [[], [], [], []];
  var fx = [];
  var statusFlash = 0;
  var last = performance.now(), time = 0;

  /* ---------------- helpers ---------------- */

  function idx(c, r) { return r * COLS + c; }
  function inB(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }

  function neigh(c, r) {
    var out = [];
    for (var i = 0; i < 4; i++) {
      var nc = c + DIRS[i][0], nr = r + DIRS[i][1];
      if (inB(nc, nr)) out.push({ c: nc, r: nr });
    }
    return out;
  }

  function isBase(c, r) {
    var bs = BASES[n];
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].c === c && bs[i].r === r) return true;
    }
    return false;
  }

  function legalFor(p, c, r) {
    if (!inB(c, r)) return false;
    if (grid[r][c] !== -1) return false;
    var ns = neigh(c, r);
    for (var i = 0; i < ns.length; i++) {
      if (grid[ns[i].r][ns[i].c] === p) return true;
    }
    return false;
  }

  function anyLegal(p) {
    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (legalFor(p, c, r)) return true;
      }
    }
    return false;
  }

  /* ---------------- scoring (route-to-vault) ---------------- */

  function computeScores() {
    var i, r, c, k;
    terr = [0, 0, 0, 0];
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        var o = grid[r][c];
        if (o >= 0 && o < n) terr[o]++;
      }
    }
    route = [0, 0, 0, 0];
    routeCells = [[], [], [], []];
    var vaultOwner = grid[V.r][V.c];
    for (i = 0; i < n; i++) {
      var starts = [];
      if (vaultOwner === i) {
        starts.push(V);
      } else {
        var ns = neigh(V.c, V.r);
        for (k = 0; k < ns.length; k++) {
          if (grid[ns[k].r][ns[k].c] === i) starts.push(ns[k]);
        }
      }
      if (!starts.length) continue;
      var seen = {};
      var q = [];
      for (k = 0; k < starts.length; k++) {
        var si = idx(starts[k].c, starts[k].r);
        if (!seen[si]) {
          seen[si] = 1;
          q.push(starts[k]);
          route[i]++;
          routeCells[i].push(si);
        }
      }
      while (q.length) {
        var cell = q.shift();
        var nb = neigh(cell.c, cell.r);
        for (var j = 0; j < nb.length; j++) {
          var ni = idx(nb[j].c, nb[j].r);
          if (grid[nb[j].r][nb[j].c] === i && !seen[ni]) {
            seen[ni] = 1;
            q.push(nb[j]);
            route[i]++;
            routeCells[i].push(ni);
          }
        }
      }
    }
    bonus = [0, 0, 0, 0];
    if (capturedBy >= 0) bonus[capturedBy] = 5;
    for (i = 0; i < n; i++) total[i] = terr[i] + route[i] + bonus[i];
  }

  /* ---------------- HUD ---------------- */

  function turnMsg() {
    return PNAME[cur] + "'s turn — claim a glowing cell (arrows/WASD + Space, or tap)";
  }

  function flash(msg) {
    statusEl.textContent = msg;
    statusFlash = 1.6;
  }

  function renderStats() {
    var html = "";
    for (var i = 0; i < n; i++) {
      var on = state === "play" && i === cur ? " on" : "";
      var v = capturedBy === i ? " vault" : "";
      var det = terr[i] + "+" + route[i];
      if (bonus[i]) det += "+" + bonus[i];
      html += "<span class=\"chip" + on + v + "\" style=\"--pc:" + PCOL[i] + "\">" +
        "<span class=\"nm\">" + PNAME[i] + "</span>" +
        "<b>" + total[i] + "</b>" +
        "<em>" + det + "</em></span>";
    }
    statsEl.innerHTML = html;
  }

  function renderTimer() {
    var frac = state === "play" ? Math.max(0, turnLeft / TURN_TIME) : 1;
    timerEl.style.width = Math.round(frac * 100) + "%";
    timerEl.style.background = state === "play" ? PCOL[cur] : "rgba(255,255,255,0.35)";
  }

  /* ---------------- game flow ---------------- */

  function resetBoard() {
    grid = [];
    for (var r = 0; r < ROWS; r++) {
      grid.push([]);
      for (var c = 0; c < COLS; c++) grid[r].push(-1);
    }
  }

  function startGame() {
    resetBoard();
    cur = 0;
    round = 1;
    endPending = false;
    capturedBy = -1;
    var bases = BASES[n];
    for (var i = 0; i < bases.length; i++) grid[bases[i].r][bases[i].c] = i;
    cursor.c = V.c;
    cursor.r = V.r;
    state = "play";
    computeScores();
    turnLeft = TURN_TIME;
    roundEl.textContent = "Round " + round + " / " + ROUND_CAP;
    statusEl.textContent = turnMsg();
    statusEl.style.color = PCOL[cur];
    renderStats();
    renderTimer();
    menuEl.classList.add("hidden");
    endEl.classList.add("hidden");
  }

  function toMenu() {
    state = "menu";
    resetBoard();
    endPending = false;
    capturedBy = -1;
    cur = 0;
    round = 1;
    roundEl.textContent = "Round 1 / " + ROUND_CAP;
    statusEl.textContent = "Pick 2-4 players, then Start.";
    statusEl.style.color = "";
    renderTimer();
    renderStats();
    menuEl.classList.remove("hidden");
    endEl.classList.add("hidden");
  }

  function setPlayers(p) {
    n = p;
    for (var k in countBtns) {
      countBtns[k].classList.toggle("sel", Number(k) === p);
    }
    renderStats();
  }

  function claim(c, r) {
    if (state !== "play") return;
    if (!legalFor(cur, c, r)) {
      flash("Not next to your territory — claim a glowing cell");
      return;
    }
    grid[r][c] = cur;
    fx.push({ c: c, r: r, t: 0 });
    var wasVault = c === V.c && r === V.r;
    if (wasVault) {
      capturedBy = cur;
      endPending = true;
    }
    computeScores();
    renderStats();
    if (grid[V.r][V.c] === -1) {
      var ns = neigh(V.c, V.r);
      var open = false;
      for (var i = 0; i < ns.length; i++) {
        if (grid[ns[i].r][ns[i].c] === -1) { open = true; break; }
      }
      if (!open) { endGame("sealed"); return; }
    }
    advance();
  }

  function advance() {
    var moved = false;
    var skipped = "";
    for (var i = 0; i < n; i++) {
      cur = (cur + 1) % n;
      if (cur === 0) round++;
      if (endPending && cur === 0) { endGame("capture"); return; }
      if (round > ROUND_CAP) { endGame("time"); return; }
      if (anyLegal(cur)) { moved = true; break; }
      skipped = PNAME[cur] + " is boxed in — turn skipped.";
    }
    if (!moved) { endGame("stuck"); return; }
    turnLeft = TURN_TIME;
    statusEl.textContent = turnMsg();
    statusEl.style.color = PCOL[cur];
    if (skipped) {
      statusEl.textContent = skipped;
      statusFlash = 1.6;
    }
    roundEl.textContent = "Round " + round + " / " + ROUND_CAP;
    renderTimer();
    renderStats();
  }

  function endGame(reason) {
    state = "end";
    computeScores();
    renderStats();
    var i, best = -1;
    for (i = 0; i < n; i++) if (total[i] > best) best = total[i];
    var winners = [];
    for (i = 0; i < n; i++) if (total[i] === best) winners.push(PNAME[i]);
    if (reason === "capture") endTitle.textContent = PNAME[capturedBy] + " cracked the vault!";
    else if (reason === "sealed") endTitle.textContent = "The vault is sealed!";
    else if (reason === "stuck") endTitle.textContent = "Everyone is boxed in!";
    else endTitle.textContent = "Time's up!";
    endSub.textContent = winners.join(" & ") + " take the loot with " + best + " points";
    resultTable.innerHTML = buildTable();
    endEl.classList.remove("hidden");
    statusEl.textContent = "Game over — " + winners.join(" & ") + " win!";
    statusEl.style.color = "";
  }

  function buildTable() {
    var order = [];
    for (var i = 0; i < n; i++) order.push(i);
    order.sort(function (a, b) {
      if (total[b] !== total[a]) return total[b] - total[a];
      if (terr[b] !== terr[a]) return terr[b] - terr[a];
      return a - b;
    });
    var best = total[order[0]];
    var rows = "";
    for (var k = 0; k < order.length; k++) {
      var p = order[k];
      var win = total[p] === best && total[p] > 0 ? " class=\"winner\"" : "";
      rows += "<tr" + win + ">" +
        "<td><span class=\"pdot\" style=\"background:" + PCOL[p] + "\"></span>" + PNAME[p] + "</td>" +
        "<td>" + terr[p] + "</td>" +
        "<td>" + route[p] + "</td>" +
        "<td>" + bonus[p] + "</td>" +
        "<td><b>" + total[p] + "</b></td></tr>";
    }
    return "<thead><tr><th>Player</th><th>Cells</th><th>Route</th><th>Vault</th><th>Total</th></tr></thead><tbody>" + rows + "</tbody>";
  }

  /* ---------------- input ---------------- */

  function moveCursor(dc, dr) {
    cursor.c = Math.max(0, Math.min(COLS - 1, cursor.c + dc));
    cursor.r = Math.max(0, Math.min(ROWS - 1, cursor.r + dr));
  }

  window.addEventListener("keydown", function (e) {
    var code = e.code || "";
    var handled = true;
    if (state === "menu") {
      if (code === "Digit2") setPlayers(2);
      else if (code === "Digit3") setPlayers(3);
      else if (code === "Digit4") setPlayers(4);
      else if (code === "Enter" || code === "NumpadEnter" || code === "Space") startGame();
      else handled = false;
    } else if (state === "play") {
      if (code === "ArrowLeft" || code === "KeyA") moveCursor(-1, 0);
      else if (code === "ArrowRight" || code === "KeyD") moveCursor(1, 0);
      else if (code === "ArrowUp" || code === "KeyW") moveCursor(0, -1);
      else if (code === "ArrowDown" || code === "KeyS") moveCursor(0, 1);
      else if (code === "Space" || code === "Enter" || code === "NumpadEnter") claim(cursor.c, cursor.r);
      else if (code === "KeyR") toMenu();
      else handled = false;
    } else {
      if (code === "Enter" || code === "NumpadEnter" || code === "Space") startGame();
      else if (code === "KeyR") toMenu();
      else handled = false;
    }
    if (handled) e.preventDefault();
  });

  canvas.addEventListener("pointerdown", function (e) {
    var rect = canvas.getBoundingClientRect();
    var px = (e.clientX - rect.left) * (LOGICAL / rect.width);
    var py = (e.clientY - rect.top) * (LOGICAL / rect.height);
    var c = Math.floor(px / CELL);
    var r = Math.floor(py / CELL);
    if (!inB(c, r)) return;
    cursor.c = c;
    cursor.r = r;
    if (state === "play") claim(c, r);
  });

  startBtn.addEventListener("click", startGame);
  againBtn.addEventListener("click", startGame);
  menuBtn.addEventListener("click", toMenu);
  restartBtn.addEventListener("click", toMenu);
  countBtns[2].addEventListener("click", function () { setPlayers(2); });
  countBtns[3].addEventListener("click", function () { setPlayers(3); });
  countBtns[4].addEventListener("click", function () { setPlayers(4); });

  /* ---------------- update / draw ---------------- */

  function update(dt) {
    time += dt;
    if (statusFlash > 0) {
      statusFlash -= dt;
      if (statusFlash <= 0 && state === "play") {
        statusEl.textContent = turnMsg();
        statusEl.style.color = PCOL[cur];
      }
    }
    for (var i = 0; i < fx.length; i++) fx[i].t += dt;
    if (state === "play") {
      turnLeft -= dt;
      renderTimer();
      if (turnLeft <= 0) {
        turnLeft = TURN_TIME;
        flash("Time's up for " + PNAME[cur] + "!");
        advance();
      }
    }
  }

  function drawVault() {
    var x = V.c * CELL, y = V.r * CELL;
    var cx = x + CELL / 2, cy = y + CELL / 2;
    var s = CELL * 0.4;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    if (capturedBy >= 0) ctx.fillStyle = PCOL[capturedBy];
    else ctx.fillStyle = "#ffd166";
    ctx.fill();
    ctx.strokeStyle = "#fff8e1";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#1a1a2e";
    ctx.font = "bold 20px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("$", cx, cy + 1);
  }

  function drawCursor() {
    var x = cursor.c * CELL, y = cursor.r * CELL;
    var legal = state === "play" && legalFor(cur, cursor.c, cursor.r);
    if (legal) {
      ctx.globalAlpha = 0.28 + 0.22 * Math.sin(time * 7);
      ctx.fillStyle = PCOL[cur];
      ctx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      ctx.globalAlpha = 1;
    }
    ctx.lineWidth = legal ? 3 : 1.5;
    ctx.strokeStyle = legal ? "#ffffff" : "rgba(255,255,255,0.4)";
    ctx.strokeRect(x + 2.5, y + 2.5, CELL - 5, CELL - 5);
  }

  function drawFx() {
    for (var i = 0; i < fx.length; i++) {
      var f = fx[i];
      var p = f.t / 0.35;
      if (p >= 1) { fx.splice(i, 1); i--; continue; }
      var x = f.c * CELL + CELL / 2, y = f.r * CELL + CELL / 2;
      ctx.globalAlpha = (1 - p) * 0.9;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 6 + 16 * p, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    ctx.fillStyle = "#0b0e16";
    ctx.fillRect(0, 0, LOGICAL, LOGICAL);

    var c, r, i;
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < COLS; c++) {
        var o = grid[r][c];
        if (o >= 0 && o < n) {
          var base = isBase(c, r);
          var conn = routeCells[o].indexOf(idx(c, r)) !== -1;
          ctx.globalAlpha = conn || base ? 0.95 : 0.4;
          ctx.fillStyle = PCOL[o];
          ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          if (base) {
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#0b0e16";
            ctx.font = "bold 16px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(PNAME[o], c * CELL + CELL / 2, r * CELL + CELL / 2 + 1);
          }
        }
      }
    }
    ctx.globalAlpha = 1;

    drawVault();

    if (state === "play") {
      var pulse = 0.5 + 0.5 * Math.sin(time * 7);
      ctx.globalAlpha = 0.2 + 0.24 * pulse;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (legalFor(cur, c, r)) {
            ctx.fillStyle = PCOL[cur];
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (c = 0; c <= COLS; c++) {
      ctx.moveTo(c * CELL + 0.5, 0);
      ctx.lineTo(c * CELL + 0.5, LOGICAL);
    }
    for (r = 0; r <= ROWS; r++) {
      ctx.moveTo(0, r * CELL + 0.5);
      ctx.lineTo(LOGICAL, r * CELL + 0.5);
    }
    ctx.stroke();

    drawFx();

    if (state === "play") drawCursor();
  }

  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  /* ---------------- init ---------------- */

  setPlayers(2);
  toMenu();
  requestAnimationFrame(loop);

  /* Read-only state hook so the offline test harness can verify the game.
     It cannot cheat: claim() still enforces turn order and adjacency. */
  if (typeof window !== "undefined" && window.__GRIDHEIST_TEST__ === true) {
    window.__GRIDHEIST_TEST__ = {
      state: function () {
        return {
          state: state, n: n, cur: cur, round: round,
          grid: grid.map(function (row) { return row.slice(); }),
          capturedBy: capturedBy, endPending: endPending,
          terr: terr.slice(), route: route.slice(),
          bonus: bonus.slice(), total: total.slice()
        };
      },
      start: function (p) { setPlayers(p); startGame(); },
      claim: function (c, r) { if (state === "play") claim(c, r); },
      menu: function () { toMenu(); }
    };
  }
})();
