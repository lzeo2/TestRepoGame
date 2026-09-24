/* Klondike Solitaire, ingested from https://github.com/AJimber/KMN_Solitaire
   License: MIT (see LICENSE), commit c25d7a989898fa5e1db3aff41950b2106d9fba97.
   Spanish copy translated to English; start screen, keyboard play (Enter /
   Shift+Enter on cards, S draw, U undo, N new game), focus restore across
   renders and a no-moves-left lose state added; leave-warning checkbox and
   beforeunload prompt removed; gradients and the card-back.svg background
   flattened. Core deal / drag / click-to-move / undo logic is upstream. */
"use strict";

const suits = [
  { id: "hearts", symbol: "\u2665", color: "red" },
  { id: "diamonds", symbol: "\u2666", color: "red" },
  { id: "clubs", symbol: "\u2663", color: "black" },
  { id: "spades", symbol: "\u2660", color: "black" },
];

const ranks = [
  { label: "A", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7", value: 7 },
  { label: "8", value: 8 },
  { label: "9", value: 9 },
  { label: "10", value: 10 },
  { label: "J", value: 11 },
  { label: "Q", value: 12 },
  { label: "K", value: 13 },
];

const state = {
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  moves: 0,
  startedAt: null,
  timerId: null,
  dragged: null,
  history: [],
  running: false,
  focusId: null,
};

const els = {
  gameScreen: document.getElementById("gameScreen"),
  stock: document.getElementById("stock"),
  stockCount: document.getElementById("stock-count"),
  waste: document.getElementById("waste"),
  foundations: document.getElementById("foundations"),
  tableau: document.getElementById("tableau"),
  moves: document.getElementById("moves"),
  timer: document.getElementById("timer"),
  undo: document.getElementById("undo"),
  newGame: document.getElementById("new-game"),
  menuBtn: document.getElementById("menuBtn"),
  winDialog: document.getElementById("win-dialog"),
  winSummary: document.getElementById("win-summary"),
  playAgain: document.getElementById("play-again"),
  winMenu: document.getElementById("win-menu"),
  loseDialog: document.getElementById("lose-dialog"),
  loseSummary: document.getElementById("lose-summary"),
  retryBtn: document.getElementById("retry-btn"),
  loseMenu: document.getElementById("lose-menu"),
};

function createDeck() {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({
      id: `${rank.label}-${suit.id}`,
      suit: suit.id,
      symbol: suit.symbol,
      color: suit.color,
      rank: rank.label,
      value: rank.value,
      faceUp: false,
    }))
  );
}

function shuffle(deck) {
  const cards = [...deck];
  crypto.getRandomValues(new Uint32Array(cards.length)).forEach((random, index) => {
    const swapIndex = index + (random % (cards.length - index));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  });
  return cards;
}

function startGame() {
  clearInterval(state.timerId);
  const deck = shuffle(createDeck());
  state.stock = [];
  state.waste = [];
  state.foundations = [[], [], [], []];
  state.tableau = [[], [], [], [], [], [], []];
  state.moves = 0;
  state.startedAt = Date.now();
  state.dragged = null;
  state.history = [];
  state.running = true;
  state.focusId = null;
  if (els.winDialog.open) els.winDialog.close();
  if (els.loseDialog.open) els.loseDialog.close();

  for (let column = 0; column < 7; column += 1) {
    for (let row = 0; row <= column; row += 1) {
      const card = deck.pop();
      card.faceUp = row === column;
      state.tableau[column].push(card);
    }
  }

  state.stock = deck;
  state.timerId = setInterval(updateTimer, 1000);
  render();
}

function render() {
  renderStock();
  renderWaste();
  renderFoundations();
  renderTableau();
  els.moves.textContent = `${state.moves} ${state.moves === 1 ? "move" : "moves"}`;
  els.undo.disabled = state.history.length === 0 || !state.running;
  updateTimer();
  restoreFocus();
}

function restoreFocus() {
  if (!state.focusId || !state.running) return;
  if (els.winDialog.open || els.loseDialog.open) return;
  const el = document.querySelector('.card[data-card-id="' + state.focusId + '"]');
  if (el && !el.classList.contains("preview") && el.hasAttribute("tabindex")) {
    if (document.activeElement !== el) el.focus();
  }
}

function renderStock() {
  els.stock.classList.toggle("has-cards", state.stock.length > 0);
  els.stockCount.textContent = String(state.stock.length);
  els.stock.setAttribute(
    "aria-label",
    state.stock.length > 0 ? `Draw a card, ${state.stock.length} left` : "Empty stock, recycle the waste"
  );
}

function renderWaste() {
  els.waste.replaceChildren();
  els.waste.dataset.source = "waste";
  const visibleCards = state.waste.slice(-3);
  const firstVisibleIndex = state.waste.length - visibleCards.length;

  visibleCards.forEach((card, visibleIndex) => {
    const cardIndex = firstVisibleIndex + visibleIndex;
    const isTopCard = cardIndex === state.waste.length - 1;
    const cardEl = createCardElement(
      card,
      { source: "waste", index: cardIndex },
      { interactive: isTopCard }
    );
    cardEl.style.left = `${visibleIndex * wasteSpread()}px`;
    cardEl.style.zIndex = String(visibleIndex + 1);
    els.waste.append(cardEl);
  });
  attachDropTarget(els.waste, "waste");
}

function renderFoundations() {
  els.foundations.replaceChildren();
  state.foundations.forEach((pile, index) => {
    const foundation = document.createElement("div");
    foundation.className = "pile foundation";
    foundation.dataset.foundation = String(index);
    foundation.dataset.suit = suits[index].id;
    foundation.setAttribute("aria-label", `${suits[index].id} foundation`);
    attachDropTarget(foundation, "foundation", index);

    const topCard = pile.at(-1);
    if (topCard) {
      foundation.append(createCardElement(topCard, { source: "foundation", pile: index, index: pile.length - 1 }));
    }
    els.foundations.append(foundation);
  });
}

function renderTableau() {
  els.tableau.replaceChildren();
  state.tableau.forEach((columnCards, columnIndex) => {
    const column = document.createElement("div");
    column.className = `column${columnCards.length === 0 ? "" : ""}`;
    if (columnCards.length === 0) column.classList.add("empty");
    column.dataset.column = String(columnIndex);
    column.setAttribute("aria-label", `Column ${columnIndex + 1}`);
    attachDropTarget(column, "tableau", columnIndex);

    columnCards.forEach((card, cardIndex) => {
      const cardEl = createCardElement(card, {
        source: "tableau",
        column: columnIndex,
        index: cardIndex,
      });
      cardEl.style.top = `${cardIndex * stackOffset()}px`;
      column.append(cardEl);
    });

    els.tableau.append(column);
  });
}

function createCardElement(card, location, options = {}) {
  const interactive = options.interactive !== false;
  const cardEl = document.createElement("div");
  cardEl.className = `card ${card.color}${card.faceUp ? "" : " face-down"}`;
  cardEl.dataset.cardId = card.id;
  if (interactive) {
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("aria-label", card.faceUp ? `${card.rank} of ${card.suit}` : "Face-down card");
    cardEl.tabIndex = 0;
  } else {
    cardEl.classList.add("preview");
    cardEl.setAttribute("aria-hidden", "true");
  }

  if (card.faceUp && interactive) {
    cardEl.draggable = canDrag(location);
    cardEl.innerHTML = `
      <span class="rank">${card.rank}</span>
      <span class="center-suit">${card.symbol}</span>
      <span class="suit">${card.symbol}</span>
    `;
    cardEl.addEventListener("click", (event) => {
      event.stopPropagation();
      autoMove(location);
    });
    cardEl.addEventListener("dragstart", (event) => onDragStart(event, location));
    cardEl.addEventListener("dragend", onDragEnd);
    cardEl.addEventListener("dblclick", () => autoFoundation(location));
    cardEl.addEventListener("focus", () => {
      state.focusId = card.id;
    });
    cardEl.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        if (event.shiftKey) autoFoundation(location);
        else autoMove(location);
      }
    });
  } else if (card.faceUp) {
    cardEl.innerHTML = `
      <span class="rank">${card.rank}</span>
      <span class="center-suit">${card.symbol}</span>
      <span class="suit">${card.symbol}</span>
    `;
  }

  return cardEl;
}

function attachDropTarget(element, type, index = null) {
  element.addEventListener("dragover", (event) => {
    if (canDrop(type, index)) {
      event.preventDefault();
      element.classList.add("drop-ok");
    }
  });
  element.addEventListener("dragleave", () => element.classList.remove("drop-ok"));
  element.addEventListener("drop", (event) => {
    event.preventDefault();
    element.classList.remove("drop-ok");
    moveDragged(type, index);
  });
}

function onDragStart(event, location) {
  state.dragged = buildMove(location);
  if (!state.dragged) {
    event.preventDefault();
    return;
  }
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", state.dragged.cards.map((card) => card.id).join(","));
  requestAnimationFrame(() => event.target.classList.add("dragging"));
}

function onDragEnd(event) {
  event.target.classList.remove("dragging");
  document.querySelectorAll(".drop-ok").forEach((el) => el.classList.remove("drop-ok"));
}

function buildMove(location) {
  if (location.source === "waste") {
    const card = state.waste.at(-1);
    return card ? { from: location, cards: [card] } : null;
  }

  if (location.source === "foundation") {
    const card = state.foundations[location.pile].at(-1);
    return card ? { from: location, cards: [card] } : null;
  }

  const column = state.tableau[location.column];
  const cards = column.slice(location.index);
  if (!cards.length || !cards.every((card) => card.faceUp) || !isValidSequence(cards)) {
    return null;
  }
  return { from: location, cards };
}

function canDrag(location) {
  return Boolean(buildMove(location));
}

function canDrop(type, index) {
  const move = state.dragged;
  if (!move) return false;
  if (type === "waste") return false;
  if (type === "foundation") return canMoveToFoundation(move.cards, index);
  if (type === "tableau") return canMoveToTableau(move.cards, index);
  return false;
}

function moveDragged(type, index) {
  if (!state.dragged || !canDrop(type, index)) return;
  saveHistory();
  const move = state.dragged;
  removeFromSource(move);

  if (type === "foundation") {
    state.foundations[index].push(move.cards[0]);
  } else {
    state.tableau[index].push(...move.cards);
  }

  afterMove();
}

function removeFromSource(move) {
  const { from, cards } = move;
  if (from.source === "waste") {
    state.waste.pop();
  } else if (from.source === "foundation") {
    state.foundations[from.pile].pop();
  } else {
    state.tableau[from.column].splice(from.index, cards.length);
  }
}

function canMoveToFoundation(cards, foundationIndex) {
  if (cards.length !== 1) return false;
  const card = cards[0];
  const pile = state.foundations[foundationIndex];
  const expectedSuit = suits[foundationIndex].id;
  if (card.suit !== expectedSuit) return false;
  if (pile.length === 0) return card.value === 1;
  return pile.at(-1).value + 1 === card.value;
}

function canMoveToTableau(cards, columnIndex) {
  const card = cards[0];
  const destination = state.tableau[columnIndex];
  const topCard = destination.at(-1);
  if (!topCard) return card.value === 13;
  return topCard.faceUp && topCard.color !== card.color && topCard.value === card.value + 1;
}

function isValidSequence(cards) {
  return cards.every((card, index) => {
    if (index === 0) return true;
    const previous = cards[index - 1];
    return previous.color !== card.color && previous.value === card.value + 1;
  });
}

function afterMove() {
  flipAvailableCards();
  state.moves += 1;
  state.dragged = null;
  render();
  checkWin();
  checkStuck();
}

function flipAvailableCards() {
  state.tableau.forEach((column) => {
    const topCard = column.at(-1);
    if (topCard && !topCard.faceUp) {
      topCard.faceUp = true;
    }
  });
}

function drawFromStock() {
  if (!state.running) return;
  if (state.stock.length > 0) {
    saveHistory();
    const card = state.stock.pop();
    card.faceUp = true;
    state.waste.push(card);
    state.moves += 1;
  } else if (state.waste.length > 0) {
    saveHistory();
    state.stock = state.waste.reverse().map((card) => ({ ...card, faceUp: false }));
    state.waste = [];
    state.moves += 1;
  }
  render();
  checkStuck();
}

function autoFoundation(location) {
  if (!state.running) return;
  const move = buildMove(location);
  if (!move || move.cards.length !== 1) return;
  const foundationIndex = state.foundations.findIndex((_, index) => canMoveToFoundation(move.cards, index));
  if (foundationIndex === -1) return;
  state.dragged = move;
  moveDragged("foundation", foundationIndex);
}

function autoMove(location) {
  if (!state.running) return;
  const move = buildMove(location);
  if (!move) return;

  const tableauIndex = state.tableau.findIndex((_, index) => {
    return !isSameTableauSource(move, index) && canMoveToTableau(move.cards, index);
  });
  if (tableauIndex !== -1) {
    state.dragged = move;
    moveDragged("tableau", tableauIndex);
    return;
  }

  if (move.cards.length !== 1) return;
  const foundationIndex = state.foundations.findIndex((_, index) => canMoveToFoundation(move.cards, index));
  if (foundationIndex === -1) return;
  state.dragged = move;
  moveDragged("foundation", foundationIndex);
}

function isSameTableauSource(move, columnIndex) {
  return move.from.source === "tableau" && move.from.column === columnIndex;
}

function checkWin() {
  const completed = state.foundations.every((pile) => pile.length === 13);
  if (!completed) return;
  state.running = false;
  clearInterval(state.timerId);
  els.winSummary.textContent = `Completed in ${state.moves} moves and ${formatTime(elapsedSeconds())}.`;
  els.winDialog.showModal();
  els.playAgain.focus();
}

/* Lose state: no legal move remains. With an empty stock the waste cannot be
   recycled into a new order, so a missing waste-top move means real deadlock. */
function hasAnyLegalMove() {
  if (state.stock.length > 0) return true;

  let col, i, card, cards;

  if (state.waste.length > 0) {
    card = state.waste.at(-1);
    for (i = 0; i < 4; i += 1) if (canMoveToFoundation([card], i)) return true;
    for (col = 0; col < 7; col += 1) if (canMoveToTableau([card], col)) return true;
  }

  for (i = 0; i < 4; i += 1) {
    const top = state.foundations[i].at(-1);
    if (!top) continue;
    for (col = 0; col < 7; col += 1) if (canMoveToTableau([top], col)) return true;
  }

  for (col = 0; col < 7; col += 1) {
    const pile = state.tableau[col];
    for (i = 0; i < pile.length; i += 1) {
      if (!pile[i].faceUp) continue;
      cards = pile.slice(i);
      if (!isValidSequence(cards)) continue;
      if (cards.length === 1) {
        for (let f = 0; f < 4; f += 1) if (canMoveToFoundation(cards, f)) return true;
      }
      for (let d = 0; d < 7; d += 1) {
        if (d === col) continue;
        if (canMoveToTableau(cards, d)) return true;
      }
    }
  }
  return false;
}

function checkStuck() {
  if (!state.running) return;
  if (hasAnyLegalMove()) return;
  state.running = false;
  clearInterval(state.timerId);
  els.loseSummary.textContent = `No legal moves after ${state.moves} moves and ${formatTime(elapsedSeconds())}.`;
  els.loseDialog.showModal();
  els.retryBtn.focus();
}

function saveHistory() {
  state.history.push({
    stock: cloneCards(state.stock),
    waste: cloneCards(state.waste),
    foundations: state.foundations.map(cloneCards),
    tableau: state.tableau.map(cloneCards),
    moves: state.moves,
  });
}

function undoMove() {
  if (!state.running) return;
  const previous = state.history.pop();
  if (!previous) return;
  state.stock = previous.stock;
  state.waste = previous.waste;
  state.foundations = previous.foundations;
  state.tableau = previous.tableau;
  state.moves = previous.moves;
  state.dragged = null;
  render();
}

function cloneCards(cards) {
  return cards.map((card) => ({ ...card }));
}

function updateTimer() {
  els.timer.textContent = formatTime(elapsedSeconds());
}

function elapsedSeconds() {
  if (!state.startedAt) return 0;
  return Math.floor((Date.now() - state.startedAt) / 1000);
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function stackOffset() {
  return window.matchMedia("(max-width: 780px)").matches ? 22 : 30;
}

function wasteSpread() {
  return window.matchMedia("(max-width: 780px)").matches ? 18 : 30;
}

function toMenu() {
  startGame(); // no start screen: the Menu button deals a fresh round
  els.stock.focus();
}

els.stock.addEventListener("click", drawFromStock);
els.undo.addEventListener("click", undoMove);
els.newGame.addEventListener("click", startGame);
els.menuBtn.addEventListener("click", toMenu);
els.playAgain.addEventListener("click", startGame);
els.retryBtn.addEventListener("click", startGame);
els.winMenu.addEventListener("click", toMenu);
els.loseMenu.addEventListener("click", toMenu);

document.addEventListener("keydown", (event) => {
  if (els.winDialog.open || els.loseDialog.open) return;
  if (event.key === "Enter" && event.target.tagName === "BUTTON") return;
  const key = event.key.toLowerCase();
  if (key === "s") {
    event.preventDefault();
    drawFromStock();
  } else if (key === "u") {
    event.preventDefault();
    undoMove();
  } else if (key === "n") {
    event.preventDefault();
    startGame();
  }
});

// auto-start on load
startGame();
els.stock.focus({ preventScroll: true });

window.addEventListener("resize", render);
