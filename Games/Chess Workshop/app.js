import { Chess } from './vendor/chess.js';
import { createEngine, MIN_ELO } from './engine.js';
import { BUILTIN_BOTS, botStrength, listCustomBots } from './bots.js';
import { mountBotBuilder } from './bot-builder.js';
import { createPuzzles, puzzleReply, puzzleHint } from './puzzles.js';
import { parseReview, analyzeReview } from './review.js';
import { createBoard, uciMove } from './board.js';

const $ = id => document.getElementById(id);
const SIDE = { w: 'White', b: 'Black' };
const PROMOTE = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
const opposite = side => side === 'w' ? 'b' : 'w';
const DRAW_START = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1';
const BOT_DESCRIPTIONS = {
  stockfish: 'Standard chess against Stockfish at a 1500 Elo target.',
  fading: 'Starts at 2250 and drops 50 Elo after every move the bot plays.',
  draw: 'Start in an even pawn endgame. A genuine draw wins the challenge.',
};
const MODES = {
  play: ['Play chess', 'Pick a bot, choose your side and play at your own pace.'],
  puzzles: ['Tactics puzzles', 'Find a forced mate. Every position is generated and checked for legal replies.'],
  review: ['Review a game', 'See what Stockfish would play and where the game changed.'],
  studio: ['Bot Studio', 'Drag If and Then blocks into a rule to build your own opponent.'],
};
const engine = createEngine(), puzzles = createPuzzles();
const emptyBoard = new Chess();
const board = createBoard($('board'), chooseMove);
const review = { game: null, position: emptyBoard, analysis: null, index: 0, controller: null, cells: [] };
let mode = 'play', orientation = 'w', play, puzzle, promotion, shownPlayPly = -1;
let solvedCount = 0, lastPgn = '';
try {
  solvedCount = Math.max(0, Number(localStorage.getItem('chess-workshop:solved')) || 0);
  lastPgn = localStorage.getItem('chess-workshop:last-pgn') || '';
} catch (error) {
  console.info('Chess progress stays in this tab.', error.name);
}
function store(key, value) {
  try { localStorage.setItem('chess-workshop:' + key, String(value)); }
  catch (error) { console.info('Chess progress stays in this tab.', error.name); }
}
function status(element, message, tone = '') {
  element.textContent = message;
  element.dataset.tone = tone;
}
function dialPlayer(id, name, detail, side) {
  const band = $(id);
  band.querySelector('strong').textContent = name;
  band.querySelector('small').textContent = detail;
  band.querySelector('.player-token').dataset.side = side;
}
function pieceBand(side) {
  if (mode === 'play') {
    if (side === play.side) return ['You', SIDE[side]];
    const detail = play.thinking ? 'Thinking…' : `${botStrength(play.bot, play.counters)} Elo target`;
    return [play.bot.name, detail];
  }
  if (mode === 'puzzles') return [SIDE[side], side === puzzle?.definition?.side ? 'Find the mate' : 'Defender'];
  return [side === 'w' ? review.game?.white ?? 'White' : review.game?.black ?? 'Black', SIDE[side]];
}
function canPlay() {
  return !!play && !play.ended && !play.thinking && play.game.turn() === play.side && !play.error;
}
function renderBoard() {
  if (mode === 'studio') return;
  const state = mode === 'play' ? play : mode === 'puzzles' ? puzzle : review;
  const game = mode === 'review' ? review.position : state?.game ?? emptyBoard;
  const analysis = mode === 'review' ? review.analysis?.positions[review.index] : null;
  const last = mode === 'review' ? review.game?.moves[review.index - 1] : state?.last;
  const hint = mode === 'review' && analysis?.bestMove ? uciMove(analysis.bestMove) : state?.hint;
  board.show({
    game, side: orientation, last, hint,
    interactive: mode === 'play' ? canPlay() : mode === 'puzzles' && !!puzzle?.definition && !puzzle.solved,
  });
  dialPlayer('top-player', ...pieceBand(opposite(orientation)), opposite(orientation));
  dialPlayer('bottom-player', ...pieceBand(orientation), orientation);
  const evaluation = $('evaluation');
  evaluation.hidden = !analysis;
  evaluation.classList.toggle('flipped', orientation === 'b');
  if (analysis) {
    const { value, type } = analysis.score;
    const share = type === 'mate' ? value > 0 ? 99 : 1 : 50 + 49 * Math.tanh(value / 600);
    $('evaluation-fill').style.height = share + '%';
    evaluation.setAttribute('aria-label', formatScore(analysis));
  }
}

function listBots() { return [...BUILTIN_BOTS, ...listCustomBots()]; }
function selectedBot() { return listBots().find(bot => bot.id === $('opponent').value) ?? BUILTIN_BOTS[0]; }
function showBotChoice() {
  const bot = selectedBot();
  $('play-format').textContent = bot.goal === 'draw' ? 'Draw challenge' : 'Standard';
  $('bot-description').textContent = BOT_DESCRIPTIONS[bot.id] ?? `${bot.elo} starting Elo · ${bot.rules.length} ${bot.rules.length === 1 ? 'rule' : 'rules'}`;
}
function loadBotChoices(id = $('opponent').value) {
  const select = $('opponent'), bots = listBots();
  select.replaceChildren(...bots.map(bot => new Option(bot.name, bot.id)));
  if (bots.some(bot => bot.id === id)) select.value = id;
  showBotChoice();
}
function setLastPgn() {
  if (!play.moves.length) return;
  lastPgn = play.game.pgn();
  store('last-pgn', lastPgn);
  $('use-last').disabled = false;
}
function safeHeader(name) { return name.replace(/[\n\r"\\]/g, '').trim(); }
function startMatch(bot = selectedBot()) {
  stopBot();
  const choice = $('play-color').value;
  const side = choice === 'random' ? Math.random() < .5 ? 'w' : 'b' : choice;
  const game = bot.id === 'draw' ? new Chess(DRAW_START) : new Chess();
  game.setHeader('White', side === 'w' ? 'You' : safeHeader(bot.name));
  game.setHeader('Black', side === 'b' ? 'You' : safeHeader(bot.name));
  play = {
    game, bot, side, moves: [], counters: { botMoves: 0, playerMoves: 0, botCaptures: 0, botChecks: 0 },
    last: null, ended: null, thinking: null, error: '',
  };
  orientation = side;
  shownPlayPly = -1;
  render();
  void runBot();
}
function stopBot() {
  if (!play?.thinking) return;
  play.thinking.abort();
  play.thinking = null;
}
function finishMatch(match, result, message) {
  const success = match.bot.goal === 'draw' ? result === 'draw' : result === 'win';
  const whiteWon = (result === 'win') === (match.side === 'w');
  match.game.setHeader('Result', result === 'draw' ? '1/2-1/2' : whiteWon ? '1-0' : '0-1');
  match.ended = { success, message: message + (match.bot.goal === 'draw' ? success ? ' Draw challenge complete.' : ' This challenge requires a draw.' : '') };
  setLastPgn();
}
function recordMove(match, move, bot) {
  match.last = move;
  match.moves.push({ ...move, number: Number(move.before.split(' ').at(-1)) });
  if (bot) {
    match.counters.botMoves++;
    if (move.captured) match.counters.botCaptures++;
    if (match.game.isCheck()) match.counters.botChecks++;
  } else match.counters.playerMoves++;
  if (match.game.isCheckmate()) {
    const lost = match.game.turn() === match.side;
    finishMatch(match, lost ? 'loss' : 'win', lost ? 'Checkmate. The bot wins.' : 'Checkmate. You win.');
  } else if (match.game.isDraw()) {
    const game = match.game;
    const reason = game.isStalemate() ? 'stalemate' : game.isThreefoldRepetition() ? 'threefold repetition' :
      game.isInsufficientMaterial() ? 'insufficient material' : 'the fifty-move rule';
    finishMatch(match, 'draw', `Draw by ${reason}.`);
  }
}

async function runBot() {
  const match = play;
  if (mode !== 'play' || !match || match.ended || match.thinking || match.game.turn() === match.side) return;
  const request = new AbortController();
  match.thinking = request;
  match.error = '';
  render();
  try {
    const elo = botStrength(match.bot, match.counters);
    // Below Stockfish's calibrated range, mix in uniformly sampled legal moves.
    const weak = Math.max(0, (MIN_ELO - elo) / (MIN_ELO - 100));
    let move;
    if (weak > 0 && Math.random() < weak) {
      const legal = match.game.moves({ verbose: true });
      move = legal[Math.floor(Math.random() * legal.length)];
    } else {
      const answer = await engine.search(match.game.fen(), { elo: Math.max(elo, MIN_ELO), nodes: 48_000, signal: request.signal });
      if (answer.move) move = uciMove(answer.move);
    }
    if (play !== match || request.signal.aborted) return;
    if (!move) throw new Error('The bot could not find a legal move.');
    recordMove(match, match.game.move(move), true);
  } catch (error) {
    if (!request.signal.aborted) match.error = error.message || 'The engine could not move.';
  } finally {
    if (match.thinking === request) match.thinking = null;
    if (mode === 'play' && play === match) render();
  }
}

function nextPuzzle() {
  puzzle = null;
  try {
    const definition = puzzles.next($('difficulty').value);
    puzzle = { definition, game: new Chess(definition.fen), last: null, hint: null, solved: false };
    orientation = definition.side;
    status($('puzzle-status'), definition.description);
  } catch (error) {
    status($('puzzle-status'), error.message || 'Could not generate a puzzle. Try again.', 'error');
  }
  render();
}
function applyPuzzleMove(move) {
  if (!puzzle || puzzle.solved) return;
  const guess = puzzleReply(puzzle.definition, puzzle.game, move.lan);
  puzzle.hint = null;
  if (!guess.correct) {
    status($('puzzle-status'), 'That move lets the defender escape. Try again.', 'error');
  } else {
    puzzle.last = puzzle.game.move(move);
    if (guess.solved) {
      puzzle.solved = true;
      store('solved', ++solvedCount);
      status($('puzzle-status'), 'Checkmate. Puzzle solved!', 'good');
    } else {
      if (guess.reply) puzzle.last = puzzle.game.move(uciMove(guess.reply));
      status($('puzzle-status'), 'Correct first move. Find checkmate.', 'good');
    }
  }
  render();
}
function applyMove(move) {
  if (mode === 'puzzles') return applyPuzzleMove(move);
  if (mode !== 'play' || !canPlay()) return;
  recordMove(play, play.game.move(move), false);
  render();
  void runBot();
}
function chooseMove(choices) {
  if (choices.length === 1) return applyMove(choices[0]);
  promotion = choices;
  $('promotion').returnValue = '';
  $('promotion').showModal();
}

function notation(container, moves, onMove) {
  const fragment = document.createDocumentFragment(), cells = [];
  let row = null, number = null;
  for (const [index, move] of moves.entries()) {
    if (move.number !== number || !row) {
      row = document.createElement('div');
      row.className = 'move-row';
      number = move.number;
      const count = document.createElement('span');
      count.textContent = number + '.';
      row.append(count);
      if (move.color === 'b') row.append(document.createElement('span'));
      fragment.append(row);
    }
    const cell = document.createElement(onMove ? 'button' : 'div');
    cell.className = 'move-cell';
    const name = document.createElement('strong');
    name.textContent = move.san;
    cell.append(name);
    if (onMove) {
      const label = document.createElement('small');
      cell.type = 'button';
      cell.append(label);
      cell.addEventListener('click', () => onMove(index + 1));
    }
    cells.push(cell);
    row.append(cell);
  }
  container.replaceChildren(fragment);
  return cells;
}
function renderPlay() {
  if (shownPlayPly !== play.moves.length) {
    shownPlayPly = play.moves.length;
    notation($('play-moves'), play.moves);
    $('play-moves').scrollTop = $('play-moves').scrollHeight;
  }
  $('review-match').disabled = !play.moves.length;
  $('resign').disabled = !!play.ended;
  if (play.ended) status($('play-status'), play.ended.message, play.ended.success ? 'good' : '');
  else if (play.error) status($('play-status'), play.error + ' Start a new game to retry.', 'error');
  else {
    const action = play.game.turn() === play.side ? 'Your move.' : `${play.bot.name} is thinking…`;
    const objective = play.bot.goal === 'draw' ? 'Make a draw to win the challenge. ' : '';
    status($('play-status'), objective + action + (play.game.isCheck() ? ' Check.' : ''));
  }
}
function formatScore(position) {
  if (position.terminal === 'checkmate') return position.score.value > 0 ? 'White checkmates' : 'Black checkmates';
  if (position.terminal === 'draw') return 'Draw';
  const { type, value } = position.score;
  if (type === 'mate') return `${value > 0 ? 'White' : 'Black'} mates in ${Math.abs(value)}`;
  return (value > 0 ? '+' : '') + (value / 100).toFixed(2) + ' for White';
}
function renderReview() {
  const { game, analysis, index, controller } = review;
  $('use-last').disabled = !lastPgn;
  $('stop-review').hidden = !controller;
  $('review-count').textContent = game ? `${analysis?.moves.length ?? 0} / ${game.moves.length} plies` : 'No game loaded';
  $('review-position').hidden = !game;
  for (const button of document.querySelectorAll('[data-step]')) {
    button.disabled = ['first', 'previous'].includes(button.dataset.step) ? index === 0 : !game || index === game.moves.length;
  }
  if (!game) return;
  const position = analysis?.positions[index], annotation = analysis?.moves[index - 1];
  const played = game.moves[index - 1];
  const text = played ? `${played.san}${annotation ? ' · ' + annotation.label : ''}` : 'Starting position';
  $('position-title').textContent = position ? `${text} · ${formatScore(position)}` : text;
  const parts = [];
  if (annotation?.note) parts.push(annotation.note);
  if (annotation?.bestSan && annotation.label !== 'Best') parts.push(`Engine preferred ${annotation.bestSan}.`);
  if (position?.line?.length) parts.push('Best line · ' + position.line.join(' '));
  $('position-line').textContent = parts.join(' ');
}
function setReviewIndex(index) {
  if (!review.game) return;
  review.cells[review.index - 1]?.removeAttribute('aria-current');
  review.index = Math.max(0, Math.min(index, review.game.moves.length));
  review.position = new Chess(review.game.positions[review.index]);
  review.cells[review.index - 1]?.setAttribute('aria-current', 'step');
  render();
}
function stopReview() {
  if (!review.controller) return;
  review.controller.abort();
  review.controller = null;
  status($('review-status'), 'Analysis stopped. You can review the moves already analysed.');
}
async function startReview() {
  stopReview();
  let game;
  try { game = parseReview($('review-pgn').value); }
  catch (error) { status($('review-status'), error.message, 'error'); render(); return; }
  review.game = game;
  review.analysis = null;
  review.cells = notation($('review-moves'), game.moves, setReviewIndex);
  const controller = new AbortController();
  review.controller = controller;
  setReviewIndex(0);
  status($('review-status'), 'Analysing with Stockfish…');
  try {
    await analyzeReview(game, engine, {
      signal: controller.signal,
      onUpdate({ analysis, moveIndex, positionIndex }) {
        if (review.controller !== controller) return;
        review.analysis = analysis;
        if (moveIndex >= 0) review.cells[moveIndex].lastElementChild.textContent = analysis.moves[moveIndex].label;
        renderReview();
        if (positionIndex === review.index || moveIndex + 1 === review.index) renderBoard();
      },
    });
    if (review.controller === controller) status($('review-status'), 'Review complete. Select a move to see its evaluation.', 'good');
  } catch (error) {
    if (!controller.signal.aborted) status($('review-status'), error.message, 'error');
  } finally {
    if (review.controller === controller) review.controller = null;
    if (mode === 'review') render();
  }
}
function reviewMatch() {
  setLastPgn();
  selectMode('review');
  $('review-pgn').value = lastPgn;
  void startReview();
}

function render() {
  if (mode === 'play') renderPlay();
  if (mode === 'puzzles') {
    $('puzzle-count').textContent = `${solvedCount} solved`;
    $('puzzle-title').textContent = puzzle?.definition?.title ?? 'Tactics';
    $('puzzle-hint').disabled = !puzzle || puzzle.solved;
  }
  if (mode === 'review') renderReview();
  renderBoard();
}
function selectMode(next) {
  if (next === mode) return;
  if (mode === 'play') stopBot();
  if (mode === 'review') stopReview();
  mode = next;
  orientation = next === 'play' ? play.side : next === 'puzzles' ? puzzle?.definition?.side ?? 'w' : 'w';
  [$('mode-title').textContent, $('mode-description').textContent] = MODES[next];
  for (const element of document.querySelectorAll('[data-mode]')) {
    if (element.dataset.mode === mode) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  }
  $('studio').hidden = mode !== 'studio';
  $('table').hidden = $('flip-board').hidden = mode === 'studio';
  for (const id of ['play', 'puzzles', 'review']) $(id + '-panel').hidden = mode !== id;
  if (mode === 'puzzles' && !puzzle) nextPuzzle();
  else render();
  if (mode === 'play') void runBot();
}

for (const element of document.querySelectorAll('[data-mode]')) element.addEventListener('click', () => selectMode(element.dataset.mode));
$('flip-board').addEventListener('click', () => { orientation = opposite(orientation); renderBoard(); });
$('opponent').addEventListener('change', showBotChoice);
$('new-game').addEventListener('click', () => startMatch());
$('review-match').addEventListener('click', reviewMatch);
$('resign').addEventListener('click', () => { $('resignation').returnValue = ''; $('resignation').showModal(); });
$('resignation').addEventListener('close', () => {
  if ($('resignation').returnValue !== 'confirm' || play.ended) return;
  stopBot();
  finishMatch(play, 'loss', 'You resigned.');
  render();
});
$('promotion').addEventListener('close', () => {
  const choice = promotion?.find(move => move.promotion === $('promotion').returnValue);
  promotion = null;
  if (choice) applyMove(choice);
});
$('difficulty').addEventListener('change', nextPuzzle);
$('puzzle-next').addEventListener('click', nextPuzzle);
$('puzzle-hint').addEventListener('click', () => {
  const hint = puzzleHint(puzzle.definition, puzzle.game);
  if (hint) {
    puzzle.hint = uciMove(hint);
    const promote = puzzle.hint.promotion ? ` Promote to a ${PROMOTE[puzzle.hint.promotion]}.` : '';
    status($('puzzle-status'), `Try ${puzzle.hint.from} to ${puzzle.hint.to}.` + promote);
    renderBoard();
  }
});
$('start-review').addEventListener('click', () => void startReview());
$('stop-review').addEventListener('click', () => { stopReview(); render(); });
$('use-last').addEventListener('click', () => { $('review-pgn').value = lastPgn; void startReview(); });
for (const button of document.querySelectorAll('[data-step]')) {
  button.addEventListener('click', () => {
    const steps = { first: 0, previous: review.index - 1, next: review.index + 1, last: review.game.moves.length };
    setReviewIndex(steps[button.dataset.step]);
  });
}
$('studio').addEventListener('chess-workshop:bots-changed', () => loadBotChoices());
mountBotBuilder($('studio'), {
  onPlay(bot) {
    loadBotChoices(bot.id);
    startMatch(bot);
    selectMode('play');
  },
});
window.addEventListener('pagehide', event => {
  stopBot();
  stopReview();
  if (!event.persisted) engine.dispose();
});
window.addEventListener('pageshow', event => { if (event.persisted) void runBot(); });
loadBotChoices();
$('use-last').disabled = !lastPgn;
startMatch();
