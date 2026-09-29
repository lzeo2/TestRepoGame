/* EcoSphere - sealed terrarium simulation for UNBLOCKMATH // ARCADE.
 * Balance sunlight and water so plants and grazers survive 40 days.
 * Zero network use. All state is local; the only timers are ours. */
"use strict";

const DAY_MS = 1100;
const FINAL_DAY = 40;
const START_PLANTS = 4;
const START_GRAZERS = 3;
const MAX_PLANTS = 14;
const MAX_GRAZERS = 10;
const PLANT_MAX_SIZE = 6;

const SUN_LABELS = ["Off", "Low", "Mid", "Full"];
const WATER_LABELS = ["Off", "Drip", "Shower", "Storm"];
/* Per day: moisture delta from water setting, minus drying from sun. */
const WATER_MOISTURE = [-0.3, 0.2, 0.7, 1.4];
const SUN_DRYING = [0, 0.15, 0.2, 0.45];

const el = {
  startScreen: document.getElementById("startScreen"),
  gameScreen: document.getElementById("gameScreen"),
  endOverlay: document.getElementById("endOverlay"),
  playBtn: document.getElementById("playBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  restartBtn: document.getElementById("restartBtn"),
  sunBtn: document.getElementById("sunBtn"),
  waterBtn: document.getElementById("waterBtn"),
  dayValue: document.getElementById("dayValue"),
  plantValue: document.getElementById("plantValue"),
  grazerValue: document.getElementById("grazerValue"),
  statusLine: document.getElementById("statusLine"),
  endTitle: document.getElementById("endTitle"),
  endText: document.getElementById("endText"),
  againBtn: document.getElementById("againBtn"),
  menuBtn: document.getElementById("menuBtn"),
  canvas: document.getElementById("terrarium"),
};

const ctx = el.canvas.getContext("2d");
const FONT = '12px system-ui, "Segoe UI", Arial, sans-serif';

let game = null;
let tickTimer = 0;

function randomInt(max) {
  return Math.floor(Math.random() * max);
}

function plantTotalSize() {
  return game.plants.reduce(function (sum, p) { return sum + p.size; }, 0);
}

function newRun() {
  game = {
    day: 0,
    sun: 1,
    water: 1,
    moisture: 2,
    paused: false,
    over: false,
    plants: [],
    grazers: [],
  };
  for (let i = 0; i < START_PLANTS; i++) {
    game.plants.push({ x: (i + 0.5) * 60, y: randomInt(20), size: 2 });
  }
  for (let i = 0; i < START_GRAZERS; i++) {
    game.grazers.push({ x: randomInt(480), y: randomInt(30), energy: 2 });
  }
  el.endOverlay.classList.add("hidden");
  el.startScreen.classList.add("hidden");
  el.gameScreen.classList.remove("hidden");
  el.pauseBtn.textContent = "Pause";
  startTicks();
  updateHud();
  draw();
}

function startTicks() {
  stopTicks();
  tickTimer = window.setInterval(tick, DAY_MS);
}

function stopTicks() {
  if (tickTimer) {
    window.clearInterval(tickTimer);
    tickTimer = 0;
  }
}

function togglePause() {
  if (game.over) return;
  game.paused = !game.paused;
  el.pauseBtn.textContent = game.paused ? "Resume" : "Pause";
  el.statusLine.textContent = game.paused
    ? "Paused. The dome holds its breath."
    : "Resumed.";
}

function cycleSun() {
  game.sun = (game.sun + 1) % SUN_LABELS.length;
  el.sunBtn.textContent = "Sun: " + SUN_LABELS[game.sun];
  draw();
}

function cycleWater() {
  game.water = (game.water + 1) % WATER_LABELS.length;
  el.waterBtn.textContent = "Water: " + WATER_LABELS[game.water];
  draw();
}

function updateHud() {
  el.dayValue.textContent = String(game.day);
  el.plantValue.textContent = String(Math.round(plantTotalSize()));
  el.grazerValue.textContent = String(game.grazers.length);
}

/* One simulated day: water cycle, plant growth/loss, grazing, breeding. */
function tick() {
  if (!game || game.paused || game.over) return;
  game.day += 1;

  game.moisture += WATER_MOISTURE[game.water] - SUN_DRYING[game.sun];
  game.moisture = Math.max(0, Math.min(4, game.moisture));

  growPlants();
  graze();
  updateHud();

  if (game.plants.length === 0) return endRun(false, "Every plant died. The grazers starve next.");
  if (game.grazers.length === 0) return endRun(true, "Your plants outlived everything. A garden, not an ecosystem.", true);
  if (game.day >= FINAL_DAY) {
    if (game.grazers.length >= 2) return endRun(true, "Day " + FINAL_DAY + ": a stable, living sphere. Well kept.");
    return endRun(true, "Day " + FINAL_DAY + ": plants survived, but the grazers nearly vanished. Barely a win.");
  }
  setStatus();
  draw();
}

function growPlants() {
  const survivors = [];
  for (const plant of game.plants) {
    if (game.sun === 0) {
      plant.size -= 0.5; // no light, no photosynthesis
    } else if (game.sun === 3 && game.moisture < 1.2 && Math.random() < 0.6) {
      plant.size -= 1.5; // scorched
    } else if (game.moisture < 0.3) {
      plant.size -= 0.8; // drought
    } else if (game.moisture > 3.4) {
      plant.size -= 1.2; // waterlogged
    } else if (game.sun >= 2 && game.moisture >= 0.8 && game.moisture <= 3) {
      plant.size = Math.min(PLANT_MAX_SIZE, plant.size + 1);
    } else {
      plant.size += 0.25; // dim or wet, but alive
    }
    if (plant.size > 0) survivors.push(plant);
  }
  game.plants = survivors;

  /* Healthy worlds spread: a mature plant may seed a neighbour. */
  if (
    game.plants.length < MAX_PLANTS &&
    game.day % 3 === 0 &&
    game.moisture >= 0.6 &&
    game.moisture <= 3.2 &&
    game.sun >= 1
  ) {
    const parent = game.plants[randomInt(game.plants.length)];
    if (parent && parent.size >= 2) {
      game.plants.push({
        x: Math.max(20, Math.min(460, parent.x + (Math.random() < 0.5 ? -60 : 60))),
        y: randomInt(20),
        size: 1,
      });
    }
  }
}

function graze() {
  const survivors = [];
  for (const grazer of game.grazers) {
    grazer.energy -= 0.9;
    const prey = game.plants.filter(function (p) { return p.size >= 1; });
    if (prey.length > 0 && Math.random() < 0.8) {
      const plant = prey[randomInt(prey.length)];
      grazer.x += (plant.x - grazer.x) * 0.4;
      grazer.y = plant.y - 6;
      plant.size -= 0.6;
      grazer.energy += 1.5;
    }
    if (grazer.energy > 0) {
      if (grazer.energy >= 3 && game.grazers.length + survivors.length < MAX_GRAZERS) {
        grazer.energy = 1;
        survivors.push({ x: grazer.x, y: grazer.y, energy: 1 });
      }
      survivors.push(grazer);
    }
  }
  /* Overgrazed plants die outright; the collapsed check runs after graze(). */
  game.plants = game.plants.filter(function (p) { return p.size > 0; });
  game.grazers = survivors;
}

function setStatus() {
  const m = game.moisture;
  let line = "Day " + game.day + ". Soil is comfortable.";
  if (m < 0.5) line = "Day " + game.day + ". Soil is bone dry. Water soon.";
  else if (m > 3.4) line = "Day " + game.day + ". The dome is flooding. Ease off the rain.";
  else if (game.sun === 3) line = "Day " + game.day + ". Full sun. Watch for scorch.";
  else if (game.sun === 0) line = "Day " + game.day + ". Darkness. Plants are withering.";
  el.statusLine.textContent = line;
}

function endRun(win, text, quietWin) {
  game.over = true;
  stopTicks();
  const score = Math.round(plantTotalSize() + game.grazers.length * 10 + game.day);
  el.endTitle.textContent = win
    ? (quietWin ? "Plants only" : "Sphere survives!")
    : "Ecosystem collapsed";
  el.endTitle.className = win ? "win" : "lose";
  el.endText.textContent = "Day " + game.day + " - Score: " + score + " - " + text;
  el.endOverlay.classList.remove("hidden");
}

function showMenu() {
  stopTicks();
  game = null;
  el.gameScreen.classList.add("hidden");
  el.endOverlay.classList.add("hidden");
  el.startScreen.classList.remove("hidden");
}

/* ---------- rendering ---------- */

function draw() {
  if (!game) return;
  const w = el.canvas.width;
  const h = el.canvas.height;
  const groundTop = h - 140;

  /* Sky darkens as the sun is dialed down. */
  const sky = ["#0d1120", "#2b3a66", "#7ba7d9", "#a9d3f2"][game.sun];
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, groundTop);

  /* Dome outline. */
  ctx.strokeStyle = "#3b4470";
  ctx.beginPath();
  ctx.arc(w / 2, groundTop, w * 0.44, Math.PI, 0);
  ctx.stroke();

  /* Sun disc. */
  if (game.sun > 0) {
    ctx.fillStyle = ["#5a4a1e", "#e0b23a", "#f5c542", "#fff3a0"][game.sun];
    ctx.beginPath();
    ctx.arc(w / 2 + 120, 80, 16 + game.sun * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Rain streaks: intensity follows the water setting. */
  if (game.water > 0) {
    ctx.strokeStyle = "#9cc7ff";
    ctx.lineWidth = game.water === 3 ? 3 : 1.5;
    const drops = game.water * 8;
    const offset = (game.day * 17) % 40;
    for (let i = 0; i < drops; i++) {
      const x = 40 + ((i * 53 + offset) % (w - 80));
      const y = 110 + ((i * 37) % (groundTop - 160));
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 12);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  }

  /* Ground, tinted by moisture (dry tan to wet brown). */
  const dry = Math.min(1, game.moisture / 4);
  ctx.fillStyle = "rgb(" + Math.round(120 - 40 * dry) + ", " + Math.round(95 + 25 * dry) + ", " + Math.round(60 + 15 * dry) + ")";
  ctx.fillRect(0, groundTop, w, h - groundTop);

  /* Plants: stem height and leaf width follow size. */
  ctx.fillStyle = "#3ecf8e";
  for (const plant of game.plants) {
    const size = Math.max(0.3, plant.size);
    const stemH = 18 + size * 14;
    ctx.fillRect(plant.x - 2, groundTop - stemH + plant.y, 4, stemH);
    ctx.beginPath();
    ctx.ellipse(plant.x, groundTop - stemH + plant.y, 6 + size * 2, 5 + size * 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Grazers: small beige dots that hug the ground. */
  ctx.fillStyle = "#e8d9a0";
  for (const grazer of game.grazers) {
    ctx.beginPath();
    ctx.ellipse(grazer.x, groundTop - 6 + grazer.y - 14, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Moisture meter. */
  ctx.font = FONT;
  ctx.fillStyle = "#eef2ff";
  ctx.fillText("Moisture", 20, h - 110);
  ctx.strokeStyle = "#3b4470";
  ctx.strokeRect(20, h - 100, 220, 14);
  ctx.fillStyle = "#5aa9e6";
  ctx.fillRect(21, h - 99, Math.round(218 * (game.moisture / 4)), 12);
  ctx.fillStyle = "#eef2ff";
  ctx.fillText("Sun: " + SUN_LABELS[game.sun] + "  Water: " + WATER_LABELS[game.water], 20, h - 60);
}

/* ---------- input wiring ---------- */

el.playBtn.addEventListener("click", newRun);
el.againBtn.addEventListener("click", newRun);
el.menuBtn.addEventListener("click", showMenu);
el.restartBtn.addEventListener("click", newRun);
el.pauseBtn.addEventListener("click", togglePause);
el.sunBtn.addEventListener("click", cycleSun);
el.waterBtn.addEventListener("click", cycleWater);

document.addEventListener("keydown", function (event) {
  if (el.startScreen.classList.contains("hidden") === false) {
    if (event.key === "Enter") {
      event.preventDefault();
      newRun();
    }
    return;
  }
  if (!game || game.over) return;
  const key = event.key.toLowerCase();
  if (key === "s") cycleSun();
  else if (key === "w") cycleWater();
  else if (key === "p") togglePause();
  else if (key === "n") newRun();
});
