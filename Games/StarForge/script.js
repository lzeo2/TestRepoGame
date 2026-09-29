"use strict";

// Star Forge: a timed idle-strategy game.
// Strike 1000 integrity out of four star cores before a 120 second
// meltdown timer runs out. Manual strikes are free; drones drain energy.

var GOAL = 1000;
var CORE_TIME = 250;         // integrity per core
var START_ENERGY = 100;
var ENERGY_MAX = 100;
var ROUND_SECONDS = 120;
var DRONE_COST = 20;         // energy to hire one drone
var VENT_COST = 40;          // energy to buy one vent
var DRONE_DRAIN = 1;         // energy burned per drone per hit
var DRONE_POWER = 2;         // integrity removed per drone hit
var VENT_REGEN = 2;          // energy restored per vent per second
var CORE_KEYS = ["1", "2", "3", "4"];

var $ = function (id) { return document.getElementById(id); };

var state = null;
var tickTimer = null;
var ui = {
  startScreen: $("startScreen"),
  gameScreen: $("gameScreen"),
  overlay: $("endOverlay"),
  cores: $("cores"),
  hudStars: $("hudStars"),
  hudEnergy: $("hudEnergy"),
  hudTime: $("hudTime"),
  energyFill: $("energyFill"),
  fleetLine: $("fleetLine"),
  droneBtn: $("droneBtn"),
  ventBtn: $("ventBtn")
};

function freshState() {
  return {
    cores: [CORE_TIME, CORE_TIME, CORE_TIME, CORE_TIME],
    forged: 0,          // total integrity removed (the score)
    energy: START_ENERGY,
    drones: 1,
    vents: 0,
    secondsLeft: ROUND_SECONDS,
    over: false
  };
}

function starsLeft() {
  return GOAL - state.forged;
}

function updateHud() {
  ui.hudStars.textContent = "Forged " + state.forged + " / " + GOAL;
  ui.hudEnergy.textContent = "Energy " + Math.floor(state.energy);
  ui.hudTime.textContent = Math.ceil(state.secondsLeft) + "s";
  ui.energyFill.style.width = (state.energy / ENERGY_MAX * 100) + "%";
  ui.fleetLine.textContent = "Drones " + state.drones + " | Vents " + state.vents;
  ui.droneBtn.textContent = "Hire drone (" + DRONE_COST + " E)";
  ui.ventBtn.textContent = "Buy vent (" + VENT_COST + " E)";
  ui.droneBtn.disabled = state.energy < DRONE_COST;
  ui.ventBtn.disabled = state.energy < VENT_COST;
}

function renderCores() {
  if (ui.cores.childElementCount === 0) {
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "core";
        btn.id = "core" + idx;
        btn.setAttribute("aria-label", "Strike core " + (idx + 1));
        btn.addEventListener("click", function () { strikeCore(idx); });
        ui.cores.appendChild(btn);
      })(i);
    }
  }
  paintCores();
}

function paintCores() {
  var glyphs = ["\u2605", "\u2606", "\u2726", "\u2727"];
  for (var i = 0; i < 4; i++) {
    var btn = $("core" + i);
    var left = state.cores[i];
    btn.innerHTML = "";
    var glyph = document.createElement("span");
    glyph.className = "glyph";
    glyph.textContent = glyphs[i];
    var num = document.createElement("span");
    num.className = "num";
    num.textContent = "Core " + (i + 1) + ": " + left + " left";
    var sub = document.createElement("span");
    sub.className = "sub";
    sub.textContent = left > 0 ? "Tap or press " + (i + 1) : "Hollow";
    btn.appendChild(glyph);
    btn.appendChild(num);
    btn.appendChild(sub);
    if (left === 0) { btn.classList.add("dead"); btn.disabled = true; }
  }
}

function strikeCore(idx) {
  if (!state || state.over) return;
  if (state.cores[idx] <= 0) return;
  state.cores[idx] -= 1;
  state.forged += 1;
  if (state.forged >= GOAL) {
    updateHud();
    paintCores();
    endRound(true);
    return;
  }
  updateHud();
  paintCores();
}

function strongestCore() {
  var best = 0;
  for (var i = 1; i < 4; i++) {
    if (state.cores[i] > state.cores[best]) best = i;
  }
  return best;
}

function hireDrone() {
  if (!state || state.over) return;
  if (state.energy < DRONE_COST || state.drones >= 12) return;
  state.energy -= DRONE_COST;
  state.drones += 1;
  updateHud();
}

function buyVent() {
  if (!state || state.over) return;
  if (state.energy < VENT_COST || state.vents >= 6) return;
  state.energy -= VENT_COST;
  state.vents += 1;
  updateHud();
}

// One simulation step, run 4x per second.
function tick() {
  if (!state || state.over) return;
  state.secondsLeft -= 0.25;

  // Drones hit the strongest core while energy lasts.
  var drain = state.drones * DRONE_DRAIN;
  if (state.energy >= drain) {
    state.energy -= drain;
    var target = strongestCore();
    var hit = Math.min(DRONE_POWER * state.drones, state.cores[target]);
    state.cores[target] -= hit;
    state.forged += hit;
  }

  state.energy = Math.min(ENERGY_MAX, state.energy + state.vents * VENT_REGEN * 0.25);

  if (state.forged >= GOAL) { endRound(true); return; }
  if (state.secondsLeft <= 0) { endRound(false); return; }
  updateHud();
  paintCores();
}

function endRound(won) {
  state.over = true;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  var title = $("endTitle");
  var result = $("endResult");
  var detail = $("endDetail");
  if (won) {
    title.textContent = "Forge complete";
    result.textContent = "You win!";
    result.className = "result good";
    var left = Math.ceil(state.secondsLeft);
    detail.textContent = "All " + GOAL + " star metal forged with " + left +
      " seconds to spare. Drones hired: " + (state.drones - 1) + ", vents bought: " + state.vents + ".";
  } else {
    title.textContent = "Meltdown";
    result.textContent = "You lose";
    result.className = "result bad";
    var remaining = 0;
    for (var i = 0; i < 4; i++) remaining += state.cores[i];
    detail.textContent = "The reactor blew with " + remaining +
      " integrity still locked in the cores. Forged " + state.forged + " of " + GOAL + ".";
  }
  ui.overlay.classList.remove("hidden");
  $("againBtn").focus();
}

function startRound() {
  state = freshState();
  if (tickTimer) clearInterval(tickTimer);
  ui.overlay.classList.add("hidden");
  ui.startScreen.classList.add("hidden");
  ui.gameScreen.classList.remove("hidden");
  renderCores();
  updateHud();
  tickTimer = setInterval(tick, 250);
}

function toMenu() {
  state = null;
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
  ui.overlay.classList.add("hidden");
  ui.gameScreen.classList.add("hidden");
  ui.startScreen.classList.remove("hidden");
}

function handleKey(e) {
  if (!ui.gameScreen.classList.contains("hidden")) {
    if (state && !state.over) {
      if (CORE_KEYS.indexOf(e.key) !== -1) { strikeCore(Number(e.key) - 1); return; }
      if (e.key === " ") { e.preventDefault(); strikeCore(strongestCore()); return; }
      if (e.key === "d" || e.key === "D") { hireDrone(); return; }
      if (e.key === "v" || e.key === "V") { buyVent(); return; }
    }
  }
  if (e.key === "r" || e.key === "R" || e.key === "Enter") {
    if (state && state.over || ui.overlay.classList.contains("hidden") === false) {
      startRound();
    }
  }
}

$("playBtn").addEventListener("click", startRound);
$("againBtn").addEventListener("click", startRound);
$("menuBtn").addEventListener("click", toMenu);
ui.droneBtn.addEventListener("click", hireDrone);
ui.ventBtn.addEventListener("click", buyVent);
document.addEventListener("keydown", handleKey);
