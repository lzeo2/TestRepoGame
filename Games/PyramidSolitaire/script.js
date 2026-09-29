/* Pyramid Solitaire - remove exposed card pairs that add up to 13 (Kings go alone).
   Win by clearing all 28 pyramid cards; lose when nothing is left to draw. */

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS = [
  { symbol: "\u2665", red: true },
  { symbol: "\u2666", red: true },
  { symbol: "\u2663", red: false },
  { symbol: "\u2660", red: false },
];
const REMOVAL_POINTS = 10;
const CLEAR_BONUS = 50;

const pyramidEl = document.getElementById("pyramid");
const stockEl = document.getElementById("stock");
const wasteEl = document.getElementById("waste");
const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");
const overlayTitleEl = document.getElementById("overlay-title");
const overlayScoreEl = document.getElementById("overlay-score");
const playAgainEl = document.getElementById("play-again");
const newGameEl = document.getElementById("new-game");

// Single source of truth for all game state; also the debug/test API surface.
window.Game = {
  pyramid: [],
  deck: [],
  waste: [],
  selected: null, // {where: "pyramid"|"waste", index, value}
  score: 0,
  tapped,
  draw,
  startGame,
  checkEnd,
};

function valueOf(card) {
  return RANKS.indexOf(card.rank) + 1; // A=1 ... K=13
}

function shuffledDeck() {
  const cards = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) cards.push({ rank, suit: suit.symbol, red: suit.red });
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function startGame() {
  const cards = shuffledDeck();
  window.Game.pyramid = cards.slice(0, 28).map((card) => ({ card, removed: false }));
  window.Game.deck = cards.slice(28); // last item is the next draw
  window.Game.waste = [];
  window.Game.selected = null;
  window.Game.score = 0;
  overlayEl.hidden = true;
  render();
}

function rowOf(i) {
  // Slot i sits in row r, where rows hold 1, 2, ... 7 cards (28 total).
  return Math.floor((Math.sqrt(8 * i + 1) - 1) / 2);
}

// A card is exposed once both cards overlapping it above are removed.
function isExposed(i) {
  const row = rowOf(i);
  if (row === 0) return true;
  const pos = i - (row * (row + 1)) / 2;
  const upLeft = ((row - 1) * row) / 2 + pos;
  return window.Game.pyramid[upLeft].removed && window.Game.pyramid[upLeft + 1].removed;
}

function removeAt(where, index) {
  if (where === "pyramid") window.Game.pyramid[index].removed = true;
  else window.Game.waste.pop();
  window.Game.score += REMOVAL_POINTS;
}

// Handle one tap on a playable card (or the stock pile button).
function tapped(where, index) {
  let card;
  if (where === "waste") {
    card = window.Game.waste[window.Game.waste.length - 1];
    if (!card) return;
  } else {
    card = window.Game.pyramid[index].card;
    if (window.Game.pyramid[index].removed || !isExposed(index)) {
      window.Game.selected = null;
      render();
      return;
    }
  }

  const value = valueOf(card);
  if (value === 13) {
    removeAt(where, index);
    window.Game.selected = null;
    render();
    return;
  }

  if (window.Game.selected && window.Game.selected.value + value === 13) {
    removeAt(window.Game.selected.where, window.Game.selected.index);
    removeAt(where, index);
    window.Game.selected = null;
    render();
    return;
  }

  // Clicking the already-selected card deselects; anything else becomes the new pick.
  const sel = window.Game.selected;
  if (sel && sel.where === where && sel.index === index) window.Game.selected = null;
  else window.Game.selected = { where, index, value };
  render();
}

function draw() {
  if (!window.Game.deck.length) return;
  window.Game.waste.push(window.Game.deck.pop());
  window.Game.selected = null;
  render();
}

function checkEnd() {
  if (window.Game.pyramid.every((s) => s.removed)) {
    window.Game.score += CLEAR_BONUS;
    showOverlay("You Win!", "Final score: " + window.Game.score);
  } else if (window.Game.deck.length === 0 && window.Game.waste.length === 0) {
    showOverlay("No Cards Left", "Final score: " + window.Game.score);
  } else if (window.Game.deck.length === 0 && !canMove()) {
    showOverlay("No Moves Left", "Final score: " + window.Game.score);
  }
}

// Stuck check for an empty deck: the only remaining cards are the exposed
// pyramid cards plus the top of the waste; if no two of them make 13, no move
// can ever exist again (only the top waste card is ever playable).
function canMove() {
  const values = [];
  window.Game.pyramid.forEach((slot, i) => {
    if (!slot.removed && isExposed(i)) values.push(valueOf(slot.card));
  });
  if (values.includes(13)) return true;
  const top = window.Game.waste[window.Game.waste.length - 1];
  if (top && values.includes(13 - valueOf(top))) return true;
  for (let a = 0; a < values.length; a++) {
    for (let b = a + 1; b < values.length; b++) {
      if (values[a] + values[b] === 13) return true;
    }
  }
  return false;
}

function showOverlay(title, finalText) {
  overlayTitleEl.textContent = title;
  overlayScoreEl.textContent = finalText;
  overlayEl.hidden = false;
}

// Rendering

function selectedClass(where, index) {
  const sel = window.Game.selected;
  return sel && sel.where === where && sel.index === index ? " selected" : "";
}

function cardButton(card, where, index) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = "card" + (card.red ? " red" : "") + selectedClass(where, index);
  const rank = document.createElement("span");
  rank.textContent = card.rank;
  const suit = document.createElement("span");
  suit.className = "suit";
  suit.textContent = card.suit;
  el.append(rank, suit);
  el.addEventListener("click", () => tapped(where, index));
  return el;
}

function render() {
  scoreEl.textContent = "Score: " + window.Game.score;
  pyramidEl.replaceChildren();
  window.Game.pyramid.forEach((slot, i) => {
    if (slot.removed) return;
    const el = cardButton(slot.card, "pyramid", i);
    const row = rowOf(i);
    const pos = i - (row * (row + 1)) / 2;
    // 14-column grid: row r starts at column 7-r, cards span 2 columns so
    // neighbors overlap by one column like a real pyramid.
    el.style.gridRow = String(row + 1);
    el.style.gridColumn = 2 * pos + (7 - row) + 1 + " / span 2";
    if (!isExposed(i)) el.classList.add("locked");
    pyramidEl.appendChild(el);
  });
  stockEl.disabled = window.Game.deck.length === 0;
  wasteEl.replaceChildren();
  const top = window.Game.waste[window.Game.waste.length - 1];
  if (top) wasteEl.appendChild(cardButton(top, "waste", 0));
  checkEnd();
}

stockEl.addEventListener("click", draw);
newGameEl.addEventListener("click", startGame);
playAgainEl.addEventListener("click", startGame);
document.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D") draw();
});

startGame();
