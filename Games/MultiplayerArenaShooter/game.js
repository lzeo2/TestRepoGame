/* ============================================================================
 * Multiplayer Arena Shooter
 * ----------------------------------------------------------------------------
 * CONTROLS
 *   Desktop:
 *     WASD / Arrows ... move
 *     Mouse ........... aim
 *     Left click ...... shoot
 *     Space ........... dash
 *     R ............... respawn / ready
 *     Enter ........... start match (host)
 *   Touch:
 *     Left stick ...... move
 *     Right stick ..... aim + shoot (hold)
 *     DASH button ..... dash
 *     READY button .... respawn / ready
 *
 * NETWORK
 *   Peer-to-peer WebRTC over the locally vendored official PeerJS library
 *   (peers/peerjs v1.5.5). The HOST runs an authoritative simulation and
 *   relays state to up to 3 clients over PeerJS data channels (2-4 players
 *   total). Clients stream input packets; the host resolves hits, respawns,
 *   rounds and the match, then broadcasts compact state snapshots.
 *
 *   Default signalling is the public PeerJS cloud. You can point the game at
 *   your own PeerServer with URL params:
 *     index.html?host=192.168.1.5&port=9000&path=/&key=peerjs&secure=0
 * ==========================================================================*/
(function () {
  "use strict";

  /* ============================ CONFIG ============================ */
  var ARENA_W = 960,
    ARENA_H = 640;
  var MOVE_SPEED = 225; // px / s
  var DASH_SPEED = 520,
    DASH_TIME = 0.22,
    DASH_COOLDOWN = 2.0;
  var BULLET_SPEED = 560,
    BULLET_LIFE = 1.25,
    BULLET_DMG = 34,
    FIRE_COOLDOWN = 0.18,
    FIRE_SPREAD = 0.045;
  var MAX_PLAYERS = 4,
    MAX_HP = 100,
    RESPAWN_TIME = 2.5,
    ROUND_PREP = 15, // max seconds to wait for players to ready up
    FIGHT_TIME = 90, // max seconds per round (sudden-death tiebreak)
    ROUND_WIN = 3; // rounds to win a match
  var STATE_RATE = 30; // host state snapshots per second
  var COLORS = ["#ff5c8a", "#4dd2ff", "#ffd94a", "#7dff8a"];
  var CODES = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  /* ============================ DOM ============================ */
  var $ = function (id) { return document.getElementById(id); };
  var els = {
    lobby: $("lobby"), room: $("room"), game: $("game"), overlay: $("overlay"),
    nick: $("nick"), tabHost: $("tabHost"), tabJoin: $("tabJoin"),
    hostPane: $("hostPane"), joinPane: $("joinPane"), roomCode: $("roomCode"),
    btnHost: $("btnHost"), btnJoin: $("btnJoin"), lobbyError: $("lobbyError"),
    roomCodeLabel: $("roomCodeLabel"), playerList: $("playerList"),
    btnStart: $("btnStart"), btnLeaveRoom: $("btnLeaveRoom"),
    arena: $("arena"), ctx: $("arena").getContext("2d"),
    hpVal: $("hpVal"), killVal: $("killVal"), roundVal: $("roundVal"),
    pingVal: $("pingVal"), roleTag: $("roleTag"),
    stickL: $("stickLeft"), stickR: $("stickRight"),
    dashBtn: $("dashBtn"), readyBtn: $("readyBtn"),
    mm: $("mm"), mmCtx: $("mm").getContext("2d"),
    ovTitle: $("ovTitle"), ovText: $("ovText"), scoreBoard: $("scoreBoard"),
    btnNext: $("btnNext"), btnRematch: $("btnRematch"), btnQuit: $("btnQuit"),
    touchControls: $("touchControls")
  };

  var canvas = els.arena;
  function fitCanvas() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(2, Math.round(rect.width * (window.devicePixelRatio || 1)));
    canvas.height = Math.max(2, Math.round(rect.height * (window.devicePixelRatio || 1)));
  }
  window.addEventListener("resize", fitCanvas);
  window.addEventListener("orientationchange", function () { setTimeout(fitCanvas, 120); });

  /* ============================ STATE ============================ */
  var ROLE = null; // "host" | "client"
  var peer = null; // PeerJS peer
  var conns = [];  // host: array of data connections
  var myId = null; // assigned player id
  var myName = "";
  var myColor = "#ff5c8a";
  var arenaInfo = [ARENA_W, ARENA_H]; // client: [w,h] from host hello
  var netIn = { mvx: 0, mvy: 0, aimx: 1, aimy: 0, shoot: false, dash: false, ready: false };
  var game = null; // shared snapshot

  var localPlayer = null; // pointer into game.players for my entity
  var sendT = 0; // host send accumulator

  /* ============================ UI HELPERS ============================ */
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }
  function setError(msg) {
    if (msg) { els.lobbyError.textContent = msg; show(els.lobbyError); }
    else hide(els.lobbyError);
  }

  function gotoLobby() {
    hide(els.room); hide(els.game); hide(els.overlay); show(els.lobby);
  }
  function gotoRoom() {
    hide(els.lobby); hide(els.game); hide(els.overlay); show(els.room);
    renderRoom();
  }
  function gotoGame() {
    hide(els.lobby); hide(els.room); hide(els.overlay); show(els.game);
    fitCanvas();
    if (window.matchMedia("(pointer: coarse)").matches) {
      els.touchControls.style.display = "block";
    } else {
      els.touchControls.style.display = "none";
    }
    if (!loopStarted) {
      loopStarted = true;
      requestAnimationFrame(mainLoop);
    }
  }
  function showOverlay() {
    hide(els.lobby); hide(els.room); hide(els.game); show(els.overlay);
  }

  /* ============================ LOBBY ============================ */
  els.tabHost.addEventListener("click", function () {
    els.tabHost.classList.add("active");
    els.tabJoin.classList.remove("active");
    show(els.hostPane); hide(els.joinPane); setError(null);
  });
  els.tabJoin.addEventListener("click", function () {
    els.tabJoin.classList.add("active");
    els.tabHost.classList.remove("active");
    hide(els.hostPane); show(els.joinPane); setError(null);
  });
  if (localStorage.getItem("as_name")) els.nick.value = localStorage.getItem("as_name");

  function genRoomCode() {
    var s = "";
    for (var i = 0; i < 5; i++) s += CODES[Math.floor(Math.random() * CODES.length)];
    return s;
  }

  function readServerOpts() {
    // Allow pointing at a custom PeerServer via query string (default: PeerJS cloud).
    var q = new URLSearchParams(window.location.search);
    var o = { host: q.get("host"), port: null, path: q.get("path"), key: q.get("key"), secure: null };
    if (q.get("port")) o.port = parseInt(q.get("port"), 10) || null;
    if (q.get("secure") !== null) o.secure = q.get("secure") !== "0";
    var used = false;
    for (var k in o) if (o[k] !== null && o[k] !== undefined) used = true;
    return used ? o : null;
  }

  els.btnHost.addEventListener("click", hostRoom);
  els.btnJoin.addEventListener("click", joinRoom);
  els.btnLeaveRoom.addEventListener("click", leaveRoom);

  function hostRoom() {
    myName = (els.nick.value || "Player").trim().slice(0, 12);
    if (!myName) myName = "Host";
    localStorage.setItem("as_name", myName);
    setError(null);
    var code = genRoomCode();
    els.roomCodeLabel.textContent = code;
    els.btnStart.disabled = true;
    gotoRoom();
    openPeer(code, true);
  }

  function joinRoom() {
    myName = (els.nick.value || "Player").trim().slice(0, 12);
    if (!myName) myName = "Guest";
    localStorage.setItem("as_name", myName);
    var code = (els.roomCode.value || "").trim().toUpperCase();
    if (!code) { setError("Enter the host's room code first."); return; }
    setError(null);
    els.roomCodeLabel.textContent = code;
    gotoRoom();
    openPeer(null, false);
  }

  function openPeer(hostCode, isHost) {
    ROLE = isHost ? "host" : "client";
    els.roleTag.textContent = isHost ? "HOST" : "CLIENT";
    var serverOpts = readServerOpts();
    var opts = { debug: 0 };
    if (serverOpts) {
      if (serverOpts.host) opts.host = serverOpts.host;
      if (serverOpts.port) opts.port = serverOpts.port;
      if (serverOpts.path) opts.path = serverOpts.path;
      if (serverOpts.key) opts.key = serverOpts.key;
      if (serverOpts.secure !== null) opts.secure = serverOpts.secure;
    }
    try {
      peer = new Peer(hostCode, opts);
    } catch (e) {
      setError("PeerJS failed to initialise: " + e.message);
      leaveRoom();
      return;
    }
    peer.on("open", function (id) {
      els.roomCodeLabel.textContent = id;
      if (ROLE === "host") {
        // Host becomes player 0 immediately
        myId = 0;
        addLobbyPlayer({ id: 0, name: myName, color: COLORS[0], conn: null });
        renderRoom();
        els.btnStart.disabled = false;
      } else {
        // Client connects to the host
        var c = peer.connect(hostCode, { reliable: true, metadata: { name: myName } });
        setupConn(c, true);
      }
    });
    peer.on("connection", function (conn) {
      setupConn(conn, false);
    });
    peer.on("error", function (err) {
      if (err && err.type === "unavailable-id" && ROLE === "host") {
        // Room code collision - retry with a fresh code
        peer.destroy();
        peer = null;
        els.roomCodeLabel.textContent = genRoomCode();
        openPeer(els.roomCodeLabel.textContent, true);
        return;
      }
      setError("Network error: " + (err && (err.message || err.type) || "unknown"));
      if (ROLE === "client" && game === null) {
        leaveRoom();
      }
    });
    peer.on("disconnected", function () {
      setError("Lost connection to the signalling server - reconnecting…");
      if (peer) {
        try { peer.reconnect(); } catch (e) { /* ignore */ }
      }
    });
  }

  function setupConn(conn, isOutgoing) {
    conn.on("open", function () {
      if (ROLE === "host") {
        conns.push(conn);
        // Assign next free slot
        var slot = nextFreeSlot();
        var p = { id: slot, name: conn.metadata && conn.metadata.name || ("Player " + (slot + 1)), color: COLORS[slot], conn: conn };
        if (conn.metadata && conn.metadata.name) p.name = String(conn.metadata.name).slice(0, 12);
        conn.send({ t: "hello", id: slot, you: 1, name: p.name, color: p.color, map: [ARENA_W, ARENA_H] });
        addLobbyPlayer(p);
        broadcastLobby();
        renderRoom();
      } else {
        conns[0] = conn;
      }
    });
    conn.on("data", function (data) {
      onMessage(conn, data);
    });
    conn.on("close", function () {
      if (ROLE === "host") {
        var i = conns.indexOf(conn);
        if (i >= 0) conns.splice(i, 1);
        var removed = null;
        if (game) {
          for (var k = 0; k < game.players.length; k++) {
            if (game.players[k].conn === conn) {
              game.players[k].conn = null;
              removed = game.players[k];
              break;
            }
          }
        }
        if (removed && lobbyPlayers[removed.id]) delete lobbyPlayers[removed.id];
        for (var pid in lobbyPlayers) {
          if (lobbyPlayers[pid].conn === conn) delete lobbyPlayers[pid];
        }
        broadcastLobby();
        renderRoom();
      } else {
        setError("Host closed the connection.");
        leaveRoom();
      }
    });
  }

  function nextFreeSlot() {
    var taken = {};
    for (var lp in lobbyPlayers) taken[lp] = true;
    if (game) {
      for (var i = 0; i < game.players.length; i++) if (game.players[i].id !== undefined) taken[game.players[i].id] = true;
    }
    for (var s = 0; s < MAX_PLAYERS; s++) if (!taken[s]) return s;
    return -1;
  }

  var lobbyPlayers = {};
  function addLobbyPlayer(p) { lobbyPlayers[p.id] = p; }
  function renderRoom() {
    var isHost = ROLE === "host";
    var hint = els.room.querySelector(".pane-hint");
    if (hint) {
      hint.textContent = isHost
        ? "Hosting — share this code. The match starts when everyone is in."
        : "Joining room… the host will start the match.";
    }
    var keys = Object.keys(lobbyPlayers).sort(function (a, b) { return +a - +b; });
    els.playerList.innerHTML = "";
    for (var i = 0; i < keys.length; i++) {
      var p = lobbyPlayers[keys[i]];
      var li = document.createElement("li");
      var dot = document.createElement("span");
      dot.className = "dot";
      dot.style.background = p.color;
      li.appendChild(dot);
      li.appendChild(document.createTextNode(p.name));
      var who = document.createElement("span");
      who.className = "who";
      who.textContent = (p.id === myId) ? "YOU" : ("P" + (p.id + 1));
      li.appendChild(who);
      els.playerList.appendChild(li);
    }
    if (ROLE === "host") {
      els.btnStart.style.display = "block";
    } else {
      els.btnStart.style.display = "none";
    }
  }

  function broadcastLobby() {
    var list = [];
    for (var k in lobbyPlayers) list.push(lobbyPlayers[k]);
    var msg = { t: "lobby", list: list };
    for (var i = 0; i < conns.length; i++) safeSend(conns[i], msg);
  }

  function leaveRoom() {
    ROLE = null;
    if (peer) { try { peer.destroy(); } catch (e) { /* ignore */ } peer = null; }
    conns = [];
    lobbyPlayers = {};
    game = null;
    localPlayer = null;
    myId = null;
    myReady = false;
    gotoLobby();
  }

  function safeSend(conn, obj) {
    try { if (conn && conn.open) conn.send(obj); } catch (e) { /* ignore */ }
  }

  function broadcast(obj) {
    for (var i = 0; i < conns.length; i++) safeSend(conns[i], obj);
  }

  /* ============================ MESSAGING ============================ */
  function onMessage(conn, data) {
    if (!data || typeof data !== "object") return;
    if (ROLE === "host") {
      if (data.t === "in") {
        // client input -> apply to entity
        var ent = findEntByConn(conn);
        if (ent) {
          ent.in = {
            mvx: clampNum(data.mvx, -1, 1),
            mvy: clampNum(data.mvy, -1, 1),
            aimx: data.aimx, aimy: data.aimy,
            shoot: !!data.shoot,
            dash: !!data.dash
          };
        }
      } else if (data.t === "ready") {
        var e = findEntByConn(conn);
        if (e) e.ready = data.on !== false;
      }
    } else {
      // Client side
      if (data.t === "hello") {
        myId = data.id;
        myName = data.name;
        myColor = data.color;
        arenaInfo = data.map || [ARENA_W, ARENA_H];
        // Stay in the room screen; the match starts when the host says so.
      } else if (data.t === "lobby") {
        lobbyPlayers = {};
        for (var i = 0; i < (data.list || []).length; i++) {
          lobbyPlayers[data.list[i].id] = data.list[i];
        }
        renderRoom();
      } else if (data.t === "start") {
        startClientMatch(data);
      } else if (data.t === "state") {
        applySnapshot(data);
        lastState = Date.now();
      } else if (data.t === "end") {
        onMatchEnd(data);
      } else if (data.t === "chat") {
        // Reserved for future use
      }
    }
  }

  function findEntByConn(conn) {
    if (!game) return null;
    for (var i = 0; i < game.players.length; i++) {
      if (game.players[i].conn === conn) return game.players[i];
    }
    return null;
  }

  /* ============================ HOST SIMULATION ============================ */
  function freshGame(myId, myName, myColor, map) {
    var g = {
      players: [],
      bullets: [],
      particles: [],
      obstacles: buildObstacles(map ? map[0] : ARENA_W, map ? map[1] : ARENA_H),
      round: 1,
      phase: "prep", // prep | fight | over | matchover
      phaseT: ROUND_PREP,
      scores: {},
      seq: 0,
      arena: { w: map ? map[0] : ARENA_W, h: map ? map[1] : ARENA_H }
    };
    g.arena.w = g.arena.w || ARENA_W;
    g.arena.h = g.arena.h || ARENA_H;
    for (var i = 0; i < MAX_PLAYERS; i++) {
      g.scores[i] = 0;
    }
    return g;
  }

  function buildObstacles(w, h) {
    var obs = [];
    var defs = [
      { x: 0.32, y: 0.3, w: 90, h: 26 },
      { x: 0.62, y: 0.68, w: 90, h: 26 },
      { x: 0.5, y: 0.5, w: 30, h: 30 },
      { x: 0.2, y: 0.68, w: 26, h: 80 },
      { x: 0.76, y: 0.22, w: 26, h: 80 }
    ];
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      obs.push({ x: d.x * w - d.w / 2, y: d.y * h - d.h / 2, w: d.w, h: d.h });
    }
    return obs;
  }

  var SPAWNS = [
    { x: 0.08, y: 0.08 }, { x: 0.92, y: 0.08 },
    { x: 0.08, y: 0.92 }, { x: 0.92, y: 0.92 }
  ];

  function spawnEntity(id, name, color, conn) {
    var g = game;
    var aw = g.arena.w, ah = g.arena.h;
    var sp = SPAWNS[id % SPAWNS.length];
    var x = sp.x * aw, y = sp.y * ah;
    // nudge away from obstacles
    for (var i = 0; i < g.obstacles.length; i++) {
      var o = g.obstacles[i];
      if (x > o.x - 40 && x < o.x + o.w + 40 && y > o.y - 40 && y < o.y + o.h + 40) {
        x = (sp.x > 0.5 ? 0.85 : 0.15) * aw;
        y = (sp.y > 0.5 ? 0.85 : 0.15) * ah;
      }
    }
    return {
      id: id, name: name, color: color, conn: conn,
      x: x, y: y, a: sp.x > 0.5 ? Math.PI : 0,
      hp: MAX_HP, alive: true, kills: 0, deaths: 0,
      ready: false, dashT: -99, dashCd: 0, fireCd: 0, respawnT: 0,
      in: { mvx: 0, mvy: 0, aimx: 1, aimy: 0, shoot: false, dash: false }
    };
  }

  function startMatch() {
    if (ROLE !== "host" || !game) return;
    // Build game with all connected players
    game = freshGame(0, myName, COLORS[0], null);
    game.players = [];
    // host entity
    game.players.push(spawnEntity(0, myName, COLORS[0], null));
    for (var i = 0; i < conns.length; i++) {
      var c = conns[i];
      var slot = nextFreeSlotForGame();
      var pname = (c.metadata && c.metadata.name) || ("Player " + (slot + 1));
      game.players.push(spawnEntity(slot, String(pname).slice(0, 12), COLORS[slot], c));
    }
    game.phase = "prep";
    game.phaseT = ROUND_PREP;
    game.round = 1;
    // Host's own entity
    for (var i = 0; i < game.players.length; i++) {
      if (game.players[i].id === myId) localPlayer = game.players[i];
    }
    broadcast({ t: "start", round: 1, phase: "prep", prep: ROUND_PREP });
    // Client host also sees game
    hide(els.room);
    gotoGame();
  }

  function nextFreeSlotForGame() {
    var taken = {};
    for (var i = 0; i < game.players.length; i++) taken[game.players[i].id] = true;
    for (var s = 0; s < MAX_PLAYERS; s++) if (!taken[s]) return s;
    return MAX_PLAYERS - 1;
  }

  function startClientMatch(data) {
    game = freshGame(myId, myName, myColor, arenaInfo);
    game.players = [];
    game.round = data.round || 1;
    game.phase = data.phase || "prep";
    game.phaseT = data.prep || ROUND_PREP;
    localPlayer = null;
    myReady = false;
    hide(els.room);
    gotoGame();
    // Wait for state snapshots to fill in the entities
  }

  function applySnapshot(data) {
    if (!game) return;
    game.seq = data.seq;
    game.phase = data.phase;
    game.phaseT = data.phaseT;
    game.round = data.round;
    game.obstacles = data.obs || game.obstacles;
    // players
    var byId = {};
    for (var i = 0; i < game.players.length; i++) byId[game.players[i].id] = game.players[i];
    game.players = [];
    for (var j = 0; j < (data.players || []).length; j++) {
      var sp = data.players[j];
      var e = byId[sp.id] || { id: sp.id, name: sp.name, color: sp.color, kills: 0, deaths: 0, conn: null };
      e.x = sp.x; e.y = sp.y; e.a = sp.a;
      e.hp = sp.hp; e.alive = sp.alive; e.ready = sp.ready;
      e.dashT = sp.dashT || -99; e.dashCd = sp.dashCd || 0;
      e.name = sp.name; e.color = sp.color; e.kills = sp.kills; e.deaths = sp.deaths;
      game.players.push(e);
      if (sp.id === myId) localPlayer = e;
    }
    game.bullets = [];
    for (var k = 0; k < (data.bullets || []).length; k++) {
      game.bullets.push(data.bullets[k]);
    }
    // particles from snapshot (host only sends a few)
    if (data.fx) {
      for (var f = 0; f < data.fx.length; f++) spawnParticle(data.fx[f]);
    }
    game.scores = data.scores || game.scores;
    // HUD
    var me = localPlayer;
    if (me) {
      els.hpVal.textContent = Math.max(0, Math.round(me.hp));
      els.killVal.textContent = me.kills;
      els.roundVal.textContent = game.round;
    }
    if (game.phase === "over" || game.phase === "matchover") {
      showEndOverlay(data.winnerId !== undefined ? data.winnerId : data.lastWinner, game.scores, game, game.phase === "matchover");
    }
  }

  /* ============================ HOST TICK ============================ */
  var hostAcc = 0, prevT = 0;
  function hostTick(now) {
    if (ROLE !== "host" || !game) return;
    var dt = Math.min(0.05, (now - prevT) / 1000 || 0.016);
    prevT = now;
    hostAcc += dt;

    simStep(dt);

    if (hostAcc >= 1 / STATE_RATE) {
      hostAcc = 0;
      sendSnapshot();
    }
  }

  function simStep(dt) {
    var g = game;
    g.phaseT -= dt;

    if (g.phase === "prep") {
      // Host's own ready is latched via myReady (R / READY button)
      for (var r = 0; r < g.players.length; r++) {
        var rr = g.players[r];
        if (rr.id === myId) rr.ready = myReady;
      }
      // auto-start when everyone is ready (or after the prep timer elapses)
      var allReady = g.players.length > 0;
      for (var a = 0; a < g.players.length; a++) {
        if (!g.players[a].ready) allReady = false;
      }
      if (allReady || g.phaseT <= 0) {
        g.phase = "fight";
        g.phaseT = FIGHT_TIME;
      }
    } else if (g.phase === "fight") {
      // count alive
      var alive = 0, aliveId = -1;
      for (var j = 0; j < g.players.length; j++) {
        var pl = g.players[j];
        if (pl.alive) { alive++; aliveId = pl.id; }
      }
      if (alive <= 1) {
        var winner = alive === 1 ? aliveId : -1;
        endRound(winner);
        return;
      }
      // fight timeout: whoever has the most HP wins the round
      if (g.phaseT <= 0) {
        var best = -1, bestHp = -1;
        for (var t = 0; t < g.players.length; t++) {
          var tp = g.players[t];
          if (tp.alive && tp.hp > bestHp) { bestHp = tp.hp; best = tp.id; }
        }
        endRound(best);
        return;
      }
    } else if (g.phase === "over") {
      g.phaseT -= dt;
      if (g.phaseT <= 0) nextRound();
    } else if (g.phase === "matchover") {
      // waiting for host to press next
    }

    // Move players
    for (var m = 0; m < g.players.length; m++) {
      stepPlayer(g.players[m], dt);
    }
    // Bullets
    stepBullets(dt);
    // Particles
    stepParticles(dt);
  }

  function stepPlayer(p, dt) {
    var g = game;
    if (!p.alive) {
      p.respawnT -= dt;
      p.dashCd -= dt;
      if (p.respawnT <= 0 && g_phaseIsFight()) {
        p.alive = true;
        p.hp = MAX_HP;
        p.x = SPAWNS[p.id % SPAWNS.length].x * g_w();
        p.y = SPAWNS[p.id % SPAWNS.length].y * g_h();
        p.ready = false;
      }
      return;
    }
    var inp = p.in || {};
    if (p.id === myId && ROLE === "host") inp = netIn;
    if (!p.conn) inp = (p.id === myId) ? netIn : inp;

    // dash
    p.dashCd -= dt;
    if (inp.dash && p.dashCd <= 0 && p.dashT < 0) {
      p.dashT = DASH_TIME;
      p.dashCd = DASH_COOLDOWN;
      p.dashDir = { x: inp.mvx, y: inp.mvy };
      if (!p.dashDir.x && !p.dashDir.y) p.dashDir = { x: Math.cos(p.a), y: Math.sin(p.a) };
    }
    var spd = MOVE_SPEED;
    if (p.dashT > 0) {
      p.dashT -= dt;
      spd = DASH_SPEED;
      inp = { mvx: p.dashDir.x, mvy: p.dashDir.y, aimx: inp.aimx, aimy: inp.aimy, shoot: inp.shoot, dash: false };
    }
    // aim
    if (inp.aimx !== undefined && inp.aimy !== undefined && (Math.abs(inp.aimx) > 0.01 || Math.abs(inp.aimy) > 0.01)) {
      p.a = Math.atan2(inp.aimy, inp.aimx);
    }
    // move
    var nx = p.x + inp.mvx * spd * dt;
    var ny = p.y + inp.mvy * spd * dt;
    var r = 14;
    // walls
    nx = clampNum(nx, r, g_w() - r);
    ny = clampNum(ny, r, g_h() - r);
    // obstacles (axis-separated slide)
    for (var i = 0; i < g.obstacles.length; i++) {
      var o = g.obstacles[i];
      if (circleRect(nx, p.y, r, o)) { nx = p.x; }
      if (circleRect(p.x, ny, r, o)) { ny = p.y; }
    }
    p.x = nx; p.y = ny;
    // shooting
    p.fireCd -= dt;
    if (inp.shoot && p.fireCd <= 0 && p.dashT < 0) {
      p.fireCd = FIRE_COOLDOWN;
      var ang = p.a + (Math.random() - 0.5) * FIRE_SPREAD;
      var bx = p.x + Math.cos(ang) * 18;
      var by = p.y + Math.sin(ang) * 18;
      g.bullets.push({
        x: bx, y: by,
        vx: Math.cos(ang) * BULLET_SPEED, vy: Math.sin(ang) * BULLET_SPEED,
        owner: p.id, life: BULLET_LIFE, r: 4
      });
    }
  }

  function stepBullets(dt) {
    var g = game;
    var keep = [];
    for (var i = 0; i < g.bullets.length; i++) {
      var b = g.bullets[i];
      b.life -= dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < 0 || b.x > g_w() || b.y < 0 || b.y > g_h()) continue;
      // obstacle hit
      var hitObs = false;
      for (var j = 0; j < g.obstacles.length; j++) {
        var o = g.obstacles[j];
        if (b.x > o.x && b.x < o.x + o.w && b.y > o.y && b.y < o.y + o.h) { hitObs = true; break; }
      }
      if (hitObs) { burst(b.x, b.y, "#9fc3ff"); continue; }
      // player hit
      var dead = false;
      for (var k = 0; k < g.players.length; k++) {
        var p = g.players[k];
        if (!p.alive || p.id === b.owner) continue;
        if (p.dashT > 0) continue; // invulnerable while dashing
        var dx = p.x - b.x, dy = p.y - b.y;
        if (dx * dx + dy * dy < 18 * 18) {
          p.hp -= BULLET_DMG;
          burst(b.x, b.y, p.color);
          if (p.hp <= 0) {
            p.hp = 0; p.alive = false; p.respawnT = RESPAWN_TIME;
            p.deaths++;
            var killer = findPlayer(b.owner);
            if (killer) {
              killer.kills++;
              killer.ready = false;
            }
            burst(p.x, p.y, p.color, 26);
            dead = true;
          }
          break;
        }
      }
      if (!dead) keep.push(b);
    }
    g.bullets = keep;
  }

  function findPlayer(id) {
    for (var i = 0; i < game.players.length; i++) {
      if (game.players[i].id === id) return game.players[i];
    }
    return null;
  }

  function endRound(winnerId) {
    var g = game;
    if (g.phase === "over" || g.phase === "matchover") return;
    g.lastWinner = winnerId;
    if (winnerId >= 0) {
      g.scores[winnerId] = (g.scores[winnerId] || 0) + 1;
    }
    var winTotal = Math.max.apply(null, Object.keys(g.scores).map(function (k) { return g.scores[k]; }));
    var matchWon = winnerId >= 0 && winTotal >= ROUND_WIN;
    if (matchWon) {
      g.phase = "matchover";
      broadcast({ t: "end", winnerId: winnerId, scores: g.scores, match: true });
      showEndOverlay(winnerId, g.scores, g, true);
    } else {
      g.phase = "over";
      g.phaseT = 3.0;
      broadcast({ t: "end", winnerId: winnerId, scores: g.scores, match: false });
    }
  }

  function nextRound() {
    var g = game;
    g.round++;
    g.phase = "prep";
    g.phaseT = ROUND_PREP;
    g.bullets = [];
    g.particles = [];
    myReady = false;
    for (var i = 0; i < g.players.length; i++) {
      var p = g.players[i];
      p.alive = true;
      p.hp = MAX_HP;
      p.ready = false;
      p.respawnT = 0;
      p.x = SPAWNS[p.id % SPAWNS.length].x * g_w();
      p.y = SPAWNS[p.id % SPAWNS.length].y * g_h();
      p.in = { mvx: 0, mvy: 0, aimx: Math.cos(p.a), aimy: Math.sin(p.a), shoot: false, dash: false };
      if (p.id === myId) localPlayer = p;
    }
    broadcast({ t: "start", round: g.round, phase: "prep", prep: ROUND_PREP });
    hide(els.overlay);
    gotoGame();
  }

  function g_w() { return game.arena.w || ARENA_W; }
  function g_h() { return game.arena.h || ARENA_H; }
  function g_phaseIsFight() { return game.phase === "fight"; }

  /* ============================ SNAPSHOTS ============================ */
  function sendSnapshot() {
    var g = game;
    var pl = [];
    for (var i = 0; i < g.players.length; i++) {
      var p = g.players[i];
      pl.push({
        id: p.id, name: p.name, color: p.color,
        x: round1(p.x), y: round1(p.y), a: round3(p.a),
        hp: Math.round(p.hp), alive: p.alive, ready: p.ready,
        dashT: round3(p.dashT), dashCd: round3(p.dashCd),
        kills: p.kills, deaths: p.deaths
      });
    }
    var bl = [];
    for (var j = 0; j < g.bullets.length; j++) {
      var b = g.bullets[j];
      bl.push({ x: round1(b.x), y: round1(b.y), vx: round1(b.vx), vy: round1(b.vy), owner: b.owner, r: b.r });
    }
    var fx = [];
    for (var f = 0; f < g.particles.length; f++) {
      fx.push({ x: round1(g.particles[f].x), y: round1(g.particles[f].y), c: g.particles[f].c });
    }
    if (fx.length > 12) fx = fx.slice(0, 12);
    var msg = {
      t: "state", seq: g.seq++,
      phase: g.phase, phaseT: round3(g.phaseT), round: g.round,
      players: pl, bullets: bl, fx: fx, scores: g.scores,
      obs: g.obstacles
    };
    if (g.phase === "over") msg.winnerId = g.lastWinner;
    for (var k = 0; k < conns.length; k++) safeSend(conns[k], msg);
  }

  function round1(n) { return Math.round(n * 10) / 10; }
  function round3(n) { return Math.round(n * 1000) / 1000; }
  function clampNum(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function circleRect(cx, cy, r, o) {
    var nx = Math.max(o.x, Math.min(cx, o.x + o.w));
    var ny = Math.max(o.y, Math.min(cy, o.y + o.h));
    var dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  /* ============================ PARTICLES ============================ */
  function burst(x, y, color, n) {
    if (!game) return;
    var count = n || 10;
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2;
      var s = 40 + Math.random() * 180;
      game.particles.push({
        x: x, y: y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.3, max: 0.65,
        c: color, r: 1.5 + Math.random() * 2.5
      });
    }
    if (game.particles.length > 220) game.particles.splice(0, game.particles.length - 220);
  }

  function spawnParticle(f) {
    if (!game) return;
    game.particles.push({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.2, max: 0.2, c: f.c, r: 2 });
  }

  function stepParticles(dt) {
    if (!game) return;
    var keep = [];
    for (var i = 0; i < game.particles.length; i++) {
      var p = game.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= (1 - 4 * dt);
      p.vy *= (1 - 4 * dt);
      if (p.life > 0) keep.push(p);
    }
    game.particles = keep;
  }

  /* ============================ END / OVERLAYS ============================ */
  function showEndOverlay(winnerId, scores, g, isMatch) {
    els.ovTitle.textContent = isMatch ? "Match Complete" : (winnerId >= 0 ? "Round Won" : "Round Draw");
    els.ovText.textContent = winnerId >= 0
      ? (findPlayerLocal(winnerId, g) ? "You won!" : (g.players && g.players[winnerId] ? g.players[winnerId].name + " wins" : "Player wins"))
      : "Everyone died at once!";
    // scoreboard
    els.scoreBoard.innerHTML = "";
    show(els.scoreBoard);
    var sorted = (g && g.players ? g.players.slice() : []).sort(function (a, b) { return b.kills - a.kills; });
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      var row = document.createElement("div");
      row.className = "row" + (p.id === myId ? " me" : "");
      var left = document.createElement("span");
      left.textContent = (winnerId === p.id ? "🏆 " : "") + p.name + "  ·  " + p.kills + " kills / " + p.deaths + " deaths";
      var right = document.createElement("span");
      right.textContent = "Rounds: " + ((g.scores && g.scores[p.id]) || 0);
      row.appendChild(left);
      row.appendChild(right);
      els.scoreBoard.appendChild(row);
    }
    if (isMatch || ROLE === "host") {
      if (isMatch) {
        show(els.btnRematch);
        hide(els.btnNext);
      } else {
        hide(els.btnRematch);
        show(els.btnNext);
      }
      show(els.btnQuit);
    } else {
      hide(els.btnRematch);
      hide(els.btnNext);
      hide(els.btnQuit);
      els.ovText.textContent += " Waiting for host…";
    }
    showOverlay();
  }

  function findPlayerLocal(id, g) {
    if (!g || !g.players) return null;
    for (var i = 0; i < g.players.length; i++) if (g.players[i].id === id) return g.players[i];
    return null;
  }

  function onMatchEnd(data) {
    if (!game) return;
    game.scores = data.scores || game.scores;
    var isMatch = !!data.match;
    game.phase = isMatch ? "matchover" : "over";
    game.lastWinner = data.winnerId;
    showEndOverlay(data.winnerId, data.scores, game, isMatch);
  }

  els.btnNext.addEventListener("click", function () {
    if (ROLE === "host") nextRound();
  });
  els.btnRematch.addEventListener("click", function () {
    if (ROLE !== "host") return;
    // reset scores, same players
    for (var i = 0; i < game.players.length; i++) {
      game.players[i].kills = 0;
      game.players[i].deaths = 0;
    }
    for (var k in game.scores) game.scores[k] = 0;
    nextRound();
  });
  els.btnQuit.addEventListener("click", function () {
    if (ROLE === "host") {
      // close all connections
      for (var i = 0; i < conns.length; i++) {
        try { conns[i].close(); } catch (e) { /* ignore */ }
      }
    }
    leaveRoom();
  });

  /* ============================ RENDER ============================ */
  var loopStarted = false;
  function mainLoop(now) {
    collectInput();
    if (ROLE === "host") {
      hostTick(now);
    } else if (ROLE === "client") {
      sendClientInput(now);
    }
    if (game) {
      render(now);
      renderMinimap();
    }
    requestAnimationFrame(mainLoop);
  }

  function render(now) {
    var ctx = els.ctx;
    var W = canvas.width, H = canvas.height;
    var aw = g_w(), ah = g_h();
    var s = Math.min(W / aw, H / ah);
    var ox = (W - aw * s) / 2, oy = (H - ah * s) / 2;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0d1420";
    ctx.fillRect(0, 0, W, H);
    ctx.translate(ox, oy);
    ctx.scale(s, s);

    // grid
    ctx.strokeStyle = "rgba(80,120,160,0.08)";
    ctx.lineWidth = 1;
    for (var gx = 0; gx <= aw; gx += 80) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, ah); ctx.stroke();
    }
    for (var gy = 0; gy <= ah; gy += 80) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(aw, gy); ctx.stroke();
    }
    // arena border
    ctx.strokeStyle = "#33507a";
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, aw - 2, ah - 2);

    // obstacles
    for (var oi = 0; oi < game.obstacles.length; oi++) {
      var o = game.obstacles[oi];
      ctx.fillStyle = "#1c2b42";
      ctx.strokeStyle = "#3a5a86";
      ctx.lineWidth = 2;
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "rgba(120,180,255,0.12)";
      ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 8);
    }

    // particles
    for (var pi = 0; pi < game.particles.length; pi++) {
      var pa = game.particles[pi];
      ctx.globalAlpha = Math.max(0, pa.life / pa.max);
      ctx.fillStyle = pa.c;
      ctx.beginPath();
      ctx.arc(pa.x, pa.y, pa.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // bullets
    for (var bi = 0; bi < game.bullets.length; bi++) {
      var b = game.bullets[bi];
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.fillStyle = "#ffd94a";
      ctx.shadowColor = "#ffd94a";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // players
    for (var i = 0; i < game.players.length; i++) {
      var p = game.players[i];
      if (!p) continue;
      drawPlayer(ctx, p);
    }

    // phase banner
    ctx.restore();
    drawBanner(ctx, W, now);
  }

  function drawPlayer(ctx, p) {
    var r = 14;
    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 4, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    var flashing = p.respawnT > 0 && p.respawnT % 0.2 < 0.1;
    if (!p.alive && !flashing) {
      // corpse marker
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    // dash trail
    if (p.dashT > 0) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // body
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // gun
    ctx.fillStyle = "#e8f0ff";
    ctx.fillRect(r - 2, -3, 12, 6);
    // barrel tip
    ctx.fillStyle = "#aebfd6";
    ctx.fillRect(r + 6, -2, 5, 4);
    ctx.restore();

    // hp bar
    var bw = 34;
    var hpFrac = Math.max(0, p.hp) / MAX_HP;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(p.x - bw / 2, p.y - r - 12, bw, 5);
    ctx.fillStyle = hpFrac > 0.5 ? "#54d67c" : hpFrac > 0.25 ? "#ffd94a" : "#ff5c5c";
    ctx.fillRect(p.x - bw / 2, p.y - r - 12, bw * hpFrac, 5);

    // name
    ctx.fillStyle = "rgba(220,230,245,0.9)";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.name + (p.id === myId ? " (you)" : ""), p.x, p.y + r + 16);

    // ready / respawn indicator
    if (!p.alive && p.respawnT > 0) {
      ctx.fillStyle = "#ffd94a";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(Math.ceil(p.respawnT) + "s", p.x, p.y - r - 20);
    } else if (game.phase === "prep") {
      ctx.fillStyle = p.ready ? "#54d67c" : "#93a7c2";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(p.ready ? "READY" : "NOT READY", p.x, p.y - r - 20);
    }
    ctx.textAlign = "left";
  }

  function drawBanner(ctx, W, now) {
    var g = game;
    if (!g) return;
    var text = "";
    if (g.phase === "prep") {
      text = "Round " + g.round + " — press R to ready up (" + Math.max(0, Math.ceil(g.phaseT)) + "s)";
    } else if (g.phase === "fight") {
      text = "FIGHT!";
    } else if (g.phase === "over") {
      text = "Round over — next round in " + Math.max(0, Math.ceil(g.phaseT)) + "s";
    } else if (g.phase === "matchover") {
      text = "Match complete!";
    }
    ctx.fillStyle = "rgba(8,12,20,0.72)";
    ctx.fillRect(0, 8, W, 40);
    ctx.fillStyle = g.phase === "fight" ? "#ff5c8a" : "#cfe4ff";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(text, W / 2, 34);
    ctx.textAlign = "left";
  }

  function renderMinimap() {
    if (!game) return;
    var ctx = els.mmCtx;
    var w = 120, h = 80;
    var aw = g_w(), ah = g_h();
    ctx.fillStyle = "rgba(10,15,24,0.9)";
    ctx.fillRect(0, 0, w, h);
    var sx = w / aw, sy = h / ah;
    ctx.fillStyle = "#2a3a55";
    for (var i = 0; i < game.obstacles.length; i++) {
      var o = game.obstacles[i];
      ctx.fillRect(o.x * sx, o.y * sy, o.w * sx, o.h * sy);
    }
    for (var j = 0; j < game.players.length; j++) {
      var p = game.players[j];
      if (!p.alive) continue;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * sx, p.y * sy, p.id === myId ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ============================ INPUT ============================ */
  var keys = {};
  var mouse = { x: 0, y: 0, down: false };
  var mouseCanvasPos = { x: 0, y: 0 };
  var myReady = false;

  function toggleReady() {
    myReady = !myReady;
    netIn.ready = myReady;
    if (ROLE === "client" && conns[0]) safeSend(conns[0], { t: "ready", on: myReady });
    return myReady;
  }

  document.addEventListener("keydown", function (e) {
    keys[e.code] = true;
    if (e.code === "KeyR") {
      if (!e.repeat) toggleReady();
    }
    if (e.code === "Space") e.preventDefault();
  });
  document.addEventListener("keyup", function (e) {
    keys[e.code] = false;
  });
  window.addEventListener("blur", function () {
    keys = {};
    mouse.down = false;
  });

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    var scale = canvas.width / rect.width;
    mouseCanvasPos.x = (e.clientX - rect.left) * scale;
    mouseCanvasPos.y = (e.clientY - rect.top) * scale;
  });
  canvas.addEventListener("mousedown", function (e) {
    if (e.button === 0) {
      mouse.down = true;
      try { canvas.requestPointerLock && canvas.requestPointerLock(); } catch (err) { /* ignore */ }
    }
  });
  window.addEventListener("mouseup", function (e) {
    if (e.button === 0) mouse.down = false;
  });

  function collectInput() {
    // movement
    var mvx = 0, mvy = 0;
    if (keys["KeyA"] || keys["ArrowLeft"]) mvx -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) mvx += 1;
    if (keys["KeyW"] || keys["ArrowUp"]) mvy -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) mvy += 1;
    if (mvx || mvy) {
      var l = Math.hypot(mvx, mvy);
      mvx /= l; mvy /= l;
    }
    // aim from mouse (convert canvas px -> game coords, same transform as render)
    var aw = g_w(), ah = g_h();
    var W_PX = canvas.width, H_PX = canvas.height;
    var s = Math.min(W_PX / aw, H_PX / ah);
    var ox = (W_PX - aw * s) / 2, oy = (H_PX - ah * s) / 2;
    var aimx = 0, aimy = 0;
    var cx = localPlayer ? localPlayer.x : aw / 2;
    var cy = localPlayer ? localPlayer.y : ah / 2;
    var mxg = (mouseCanvasPos.x - ox) / s;
    var myg = (mouseCanvasPos.y - oy) / s;
    var dx = mxg - cx, dy = myg - cy;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      var al = Math.hypot(dx, dy);
      aimx = dx / al; aimy = dy / al;
    } else {
      // default aim toward right
      aimx = 1; aimy = 0;
    }

    // touch aim overrides
    var t = touchAim;
    if (t.active) {
      aimx = t.x; aimy = t.y;
    }

    var newIn = {
      mvx: touchMove.active ? touchMove.x : mvx,
      mvy: touchMove.active ? touchMove.y : mvy,
      aimx: aimx, aimy: aimy,
      shoot: mouse.down || touchFire.active || (touchAim.active && touchAim.firing),
      dash: dashPressed || touchDash.pressed,
      ready: netIn.ready
    };
    // edge-triggered dash
    dashPressed = false;
    touchDash.pressed = false;
    netIn = newIn;
  }

  var dashPressed = false;
  document.addEventListener("keydown", function (e) {
    if (e.code === "Space") dashPressed = true;
  });

  // touch sticks
  var touchMove = { active: false, id: -1, x: 0, y: 0, ox: 0, oy: 0 };
  var touchAim = { active: false, id: -1, x: 1, y: 0, ox: 0, oy: 0, firing: false };
  var touchFire = { active: false };
  var touchDash = { pressed: false };

  function bindStick(el, store) {
    el.addEventListener("touchstart", function (e) {
      e.preventDefault();
      var t = e.changedTouches[0];
      store.active = true;
      store.id = t.identifier;
      store.ox = t.clientX;
      store.oy = t.clientY;
      moveKnob(el, 0, 0);
    }, { passive: false });
    el.addEventListener("touchmove", function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        if (t.identifier !== store.id) continue;
        var dx = t.clientX - store.ox;
        var dy = t.clientY - store.oy;
        var max = 46;
        var l = Math.hypot(dx, dy);
        if (l > max) { dx = dx / l * max; dy = dy / l * max; l = max; }
        store.x = dx / max;
        store.y = dy / max;
        // normalize for movement
        moveKnob(el, dx, dy);
      }
    }, { passive: false });
    el.addEventListener("touchend", function (e) {
      e.preventDefault();
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === store.id) {
          store.active = false;
          store.x = 0; store.y = 0;
          moveKnob(el, 0, 0);
        }
      }
    }, { passive: false });
    el.addEventListener("touchcancel", function (e) {
      store.active = false;
      store.x = 0; store.y = 0;
      moveKnob(el, 0, 0);
    }, { passive: false });
  }
  function moveKnob(el, dx, dy) {
    var knob = el.querySelector(".stick-knob");
    knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
  }
  bindStick(els.stickL, touchMove);
  bindStick(els.stickR, touchAim);

  // right stick also fires while held beyond a small threshold
  (function () {
    var orig = els.stickR;
    orig.addEventListener("touchmove", function (e) {
      var t = e.changedTouches[0];
      if (t.identifier !== touchAim.id) return;
      var dx = t.clientX - touchAim.ox;
      var dy = t.clientY - touchAim.oy;
      if (Math.hypot(dx, dy) > 14) touchAim.firing = true;
    }, { passive: true });
    orig.addEventListener("touchend", function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchAim.id) {
          touchAim.firing = false;
        }
      }
    }, { passive: true });
  })();

  els.dashBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    touchDash.pressed = true;
  }, { passive: false });
  els.dashBtn.addEventListener("mousedown", function (e) {
    touchDash.pressed = true;
  });
  els.readyBtn.addEventListener("touchstart", function (e) {
    e.preventDefault();
    toggleReady();
  }, { passive: false });
  els.readyBtn.addEventListener("mousedown", function () {
    toggleReady();
  });

  /* ============================ CLIENT INPUT STREAM ============================ */
  var lastInputSend = 0;
  var lastState = 0;
  function sendClientInput(now) {
    if (!game || !conns[0]) return;
    if (now - lastInputSend >= 1000 / 30) {
      lastInputSend = now;
      safeSend(conns[0], {
        t: "in",
        mvx: round3(netIn.mvx),
        mvy: round3(netIn.mvy),
        aimx: round3(netIn.aimx),
        aimy: round3(netIn.aimy),
        shoot: netIn.shoot,
        dash: netIn.dash
      });
      // ping estimate (time since last state snapshot arrived)
      if (lastState > 0) {
        els.pingVal.textContent = Math.round(now - lastState) + "ms";
      }
    }
  }

  /* ============================ LOBBY READY / START ============================ */
  els.btnStart.addEventListener("click", function () {
    if (ROLE !== "host") return;
    if (Object.keys(lobbyPlayers).length < 2) {
      setError("Need at least 2 players (host + 1 joiner).");
      return;
    }
    setError(null);
    startMatch();
  });

  /* ============================ BOOT ============================ */
  gotoLobby();

  // Render idle anim behind lobby
  (function idle() {
    requestAnimationFrame(idle);
  })();

  // Export for debugging
  window.__arena = {
    get role() { return ROLE; },
    get players() { return game ? game.players : null; },
    get peerId() { return peer ? peer.id : null; }
  };
})();
