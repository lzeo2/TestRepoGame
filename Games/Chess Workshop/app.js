import { Chess } from './vendor/chess.js';
import { createEngine, MIN_ELO } from './engine.js';
import { BUILTIN_BOTS, MIN_BOT_ELO, botStrength, botTurnMoves, listCustomBots } from './bots.js';
import { mountBotBuilder } from './bot-builder.js';
import { puzzleReply, puzzleHint } from './puzzles.js';
import { createPuzzleSource } from './puzzle-source.js';
import { mountAppearance } from './appearance.js';
import { parseReview, analyzeReview } from './review.js';
import { createBoard, legalMoveChoices, uciMove } from './board.js';
import { WorkshopChess, BONUS_VARIANT, passForBonus } from './turns.js';

const $ = id => document.getElementById(id);
const SIDE = { w: 'White', b: 'Black' };
const PROMOTE = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' };
const opposite = side => side === 'w' ? 'b' : 'w';
const DRAW_START = '8/5pk1/6p1/8/8/6P1/5PK1/8 w - - 0 1';
const BOT_SEARCH_NODES = 48_000;
const BONUS_TURN_NODES = 96_000;
const BOT_DESCRIPTIONS = {
  stockfish: 'Standard chess against Stockfish at a 1500 Elo target.',
  fading: 'Starts at 2250 and drops 50 Elo after every move the bot plays.',
  draw: 'Start in an even pawn endgame. A genuine draw wins the challenge.',
  double: 'Stockfish can play two moves in a row.',
  triple: 'Stockfish can play three moves in a row.',
  momentum: 'Starts with one move. Each capture adds one move to later turns, up to four.',
};
const MODES = {
  play: ['Play chess', 'Pick a bot, choose your side and play at your own pace.'],
  puzzles: ['Tactics puzzles', 'Find a forced mate. Every position is generated and checked for legal replies.'],
  review: ['Review a game', 'See what Stockfish would play and where the game changed.'],
  studio: ['Bot Studio', 'Drag If and Then blocks into a rule to build your own opponent.'],
};
const engine = createEngine(), puzzles = createPuzzleSource();
const emptyBoard = new Chess();
const board = createBoard($('board'), chooseMove);
const appearance = mountAppearance($('appearance'), { onChange: renderBoard });
$('appearance-open').addEventListener('click', () => appearance.open());
const playNotation = createNotation($('play-moves'));
const reviewNotation = createNotation($('review-moves'), setReviewIndex);
const review = { game: null, position: emptyBoard, analysis: null, index: 0, controller: null, cells: [] };
let mode = 'play', orientation = 'w', play, puzzle, promotion, puzzleRequest, draftBot;
let solvedCount = 0, lastPgn = '';
try {
  const savedCount = Number(localStorage.getItem('chess-workshop:solved'));
  if (Number.isSafeInteger(savedCount) && savedCount >= 0) solvedCount = savedCount;
  lastPgn = localStorage.getItem('chess-workshop:last-pgn') || '';
} catch (error) {
  console.info('Chess progress stays in this tab.', error.name);
}
function store(key, value) {
  try { localStorage.setItem('chess-workshop:' + key, String(value)); }
  catch (error) { console.info('Chess progress stays in this tab.', error.name); }
}
function status(element, message, tone = '') {
  if (element.textContent !== message) element.textContent = message;
  if (element.dataset.tone !== tone) element.dataset.tone = tone;
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
  const previous = mode === 'review' ? review.game?.moves[review.index - 1] : state?.last;
  const last = previous?.from && previous?.to ? previous : undefined;
  const hint = mode === 'review' && analysis?.bestMove ? uciMove(analysis.bestMove) : state?.hint;
  board.show({
    game, side: orientation, last, hint, ...appearance.getPrefs(),
    interactive: !promotion && (mode === 'play' ? canPlay() :
      mode === 'puzzles' && !!puzzle && !puzzle.solved && !puzzleRequest),
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

function listBots() {
  const bots = [...BUILTIN_BOTS, ...listCustomBots()];
  if (draftBot) bots.push(draftBot);
  return bots;
}
function selectedBot() { return listBots().find(bot => bot.id === $('opponent').value) ?? BUILTIN_BOTS[0]; }
function hasBonusTurns(bot) { return bot.turnMoves > 1 || bot.rules.some(rule => rule.action === 'raiseMoves'); }
function showBotChoice() {
  const bot = selectedBot();
  const bonus = hasBonusTurns(bot);
  $('play-format').textContent = bonus ? 'Bonus turns' : bot.goal === 'draw' ? 'Draw challenge' : 'Standard';
  const allowance = bonus ? ` · Starts with ${bot.turnMoves} per turn` : '';
  const description = BOT_DESCRIPTIONS[bot.id] ?? `${bot.elo} starting Elo${allowance} · ${bot.rules.length} ${bot.rules.length === 1 ? 'rule' : 'rules'}`;
  $('bot-description').textContent = description + (bonus ? ' If the bot gives check, you move next.' : '');
}
function loadBotChoices(id = $('opponent').value) {
  const select = $('opponent'), bots = listBots();
  select.replaceChildren(...bots.map(bot => new Option(bot === draftBot ? bot.name + ' (draft)' : bot.name, bot.id)));
  if (bots.some(bot => bot.id === id)) select.value = id;
  showBotChoice();
}
function setLastPgn() {
  if (!play.moves.length) return;
  lastPgn = play.game.pgn();
  store('last-pgn', lastPgn);
  $('use-last').disabled = false;
}
function safeHeader(name) { return name.replace(/[\n\r"\\]/g, '').trim() || 'Custom bot'; }
function startMatch(bot = selectedBot()) {
  stopBot();
  const choice = $('play-color').value;
  const side = choice === 'random' ? Math.random() < .5 ? 'w' : 'b' : choice;
  const bonus = hasBonusTurns(bot), Game = bonus ? WorkshopChess : Chess;
  const game = new Game(bot.id === 'draw' ? DRAW_START : undefined);
  if (bonus) {
    game.setHeader('Variant', BONUS_VARIANT);
    game.setHeader('WorkshopBot', SIDE[opposite(side)]);
  }
  game.setHeader('White', side === 'w' ? 'You' : safeHeader(bot.name));
  game.setHeader('Black', side === 'b' ? 'You' : safeHeader(bot.name));
  play = {
    game, bot, side, moves: [], counters: { botMoves: 0, playerMoves: 0, botCaptures: 0, botChecks: 0 },
    last: null, ended: null, thinking: null, burst: null, error: '', historyFen: game.fen(), historyMoves: [],
  };
  orientation = side;
  playNotation.reset();
  if (mode === 'play' && game.turn() !== side) void runBot();
  else render();
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
function finishDraw(match) {
  const game = match.game;
  const reason = game.isThreefoldRepetition() ? 'threefold repetition' :
    game.isInsufficientMaterial() ? 'insufficient material' :
    game.isDrawByFiftyMoves() ? 'the fifty-move rule' :
    game.isStalemate() ? 'stalemate' : null;
  if (reason) finishMatch(match, 'draw', `Draw by ${reason}.`);
}
function recordMove(match, move, bot) {
  match.last = move;
  match.moves.push({ ...move, number: Number(move.before.split(' ').at(-1)) });
  // A pawn move, capture, or lost castling right ends the reversible history.
  const beforeRights = move.before.split(' ')[2], afterRights = move.after.split(' ')[2];
  if (move.piece === 'p' || move.captured || beforeRights !== afterRights) {
    match.historyFen = move.after;
    match.historyMoves.length = 0;
  } else match.historyMoves.push(move.lan);
  if (bot) {
    match.counters.botMoves++;
    if (move.captured) match.counters.botCaptures++;
    if (match.game.isCheck()) match.counters.botChecks++;
  } else match.counters.playerMoves++;
  const game = match.game;
  if (move.san.endsWith('#')) {
    const lost = game.turn() === match.side;
    finishMatch(match, lost ? 'loss' : 'win', lost ? 'Checkmate. The bot wins.' : 'Checkmate. You win.');
    return;
  }
  finishDraw(match);
}
function continueBonusTurn(match) {
  const pass = passForBonus(match.game);
  if (!pass) return false;
  match.moves.push({ san: 'Pass', color: pass.color, number: Number(pass.before.split(' ').at(-1)) });
  // UCI accepts real alternating moves. Start a fresh engine history after a skip.
  match.historyFen = pass.after;
  match.historyMoves.length = 0;
  finishDraw(match);
  return !match.ended;
}

async function botMove(match, nodes, signal) {
  const elo = botStrength(match.bot, match.counters);
  // Below Stockfish's calibrated range, mix in uniformly sampled legal moves.
  const weak = Math.max(0, (MIN_ELO - elo) / (MIN_ELO - MIN_BOT_ELO));
  if (weak > 0 && Math.random() < weak) {
    const legal = legalMoveChoices(match.game);
    return legal[Math.floor(Math.random() * legal.length)];
  }
  const history = match.historyMoves.length ? { fen: match.historyFen, moves: match.historyMoves } : undefined;
  const answer = await engine.search(match.game.fen(), {
    elo: Math.max(elo, MIN_ELO), nodes, signal, history,
  });
  return answer.move ? uciMove(answer.move) : null;
}

async function runBot() {
  const match = play;
  if (mode !== 'play' || !match || match.ended || match.thinking || match.game.turn() === match.side) return;
  const request = new AbortController();
  match.thinking = request;
  match.error = '';
  // Rules change the next turn's allowance. Finish a paused turn at its original limit.
  const burst = match.burst ??= { limit: botTurnMoves(match.bot, match.counters), done: 0 };
  const nodes = Math.min(BOT_SEARCH_NODES, Math.floor(BONUS_TURN_NODES / burst.limit));
  render();
  try {
    while (burst.done < burst.limit) {
      const move = await botMove(match, nodes, request.signal);
      if (play !== match || request.signal.aborted) return;
      if (!move) throw new Error('The bot could not find a legal move.');
      recordMove(match, match.game.move(move), true);
      burst.done++;
      if (match.ended || burst.done === burst.limit || !continueBonusTurn(match)) break;
      render();
    }
    match.burst = null;
  } catch (error) {
    if (!request.signal.aborted) match.error = error.message || 'The engine could not move.';
  } finally {
    if (match.thinking === request) match.thinking = null;
    if (mode === 'play' && play === match) render();
  }
}

function stopPuzzle() {
  if (!puzzleRequest) return;
  puzzleRequest.abort();
  puzzleRequest = null;
  puzzle = null;
}

async function nextPuzzle() {
  stopPuzzle();
  const request = new AbortController();
  puzzleRequest = request;
  const difficulty = $('difficulty').value;
  status($('puzzle-status'), 'Generating a puzzle…');
  render();
  try {
    const definition = await puzzles.next(difficulty, { signal: request.signal });
    if (puzzleRequest !== request) return;
    puzzle = { definition, difficulty, game: new Chess(definition.fen), last: null, hint: null, solved: false };
    orientation = definition.side;
    status($('puzzle-status'), definition.description);
  } catch (error) {
    if (puzzleRequest === request) status($('puzzle-status'), error.message || 'Could not generate a puzzle. Try again.', 'error');
  } finally {
    if (puzzleRequest === request) {
      puzzleRequest = null;
      render();
    }
  }
}
function applyPuzzleMove(move) {
  if (!puzzle || puzzle.solved || puzzleRequest) return;
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
  if (play.ended) render();
  else void runBot();
}
function chooseMove(choices) {
  if (choices.length === 1) return applyMove(choices[0]);
  promotion = choices;
  renderBoard();
  $('promotion').returnValue = '';
  $('promotion').showModal();
}

function createNotation(container, onMove) {
  const cells = [];
  let row = null, number = null;
  function append(moves) {
    if (cells.length === moves.length) return false;
    const fragment = document.createDocumentFragment();
    for (let index = cells.length; index < moves.length; index++) {
      const move = moves[index];
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
        cell.type = 'button';
        cell.append(document.createElement('small'));
        cell.addEventListener('click', () => onMove(index + 1));
      }
      cells.push(cell);
      row.append(cell);
    }
    container.append(fragment);
    return true;
  }
  function reset() {
    cells.length = 0;
    row = number = null;
    container.replaceChildren();
  }
  return { cells, append, reset };
}
function renderPlay() {
  if (playNotation.append(play.moves)) $('play-moves').scrollTop = $('play-moves').scrollHeight;
  $('retry-bot').hidden = !play.error || !!play.ended;
  $('review-match').disabled = !play.moves.length;
  $('resign').disabled = !!play.ended;
  if (play.ended) status($('play-status'), play.ended.message, play.ended.success ? 'good' : '');
  else if (play.error) status($('play-status'), play.error, 'error');
  else {
    const burst = play.burst;
    const action = play.game.turn() === play.side ? 'Your move.' : burst?.limit > 1
      ? `${play.bot.name} is thinking · Move ${burst.done + 1} of ${burst.limit}…` : `${play.bot.name} is thinking…`;
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
  $('review-bonus-note').hidden = !game?.bonusTurns;
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
  reviewNotation.reset();
  reviewNotation.append(game.moves);
  review.cells = reviewNotation.cells;
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
        if (positionIndex === review.index) renderBoard();
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
    $('puzzle-hint').disabled = !puzzle || puzzle.solved || !!puzzleRequest;
  }
  if (mode === 'review') renderReview();
  renderBoard();
}
function selectMode(next) {
  if (next === mode) return;
  if (mode === 'play') stopBot();
  if (mode === 'puzzles') stopPuzzle();
  if (mode === 'review') stopReview();
  mode = next;
  orientation = next === 'play' ? play.side : next === 'puzzles' ? puzzle?.definition?.side ?? 'w' : 'w';
  [$('mode-title').textContent, $('mode-description').textContent] = MODES[next];
  for (const element of document.querySelectorAll('[data-mode]')) {
    if (element.dataset.mode === mode) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  }
  $('studio').hidden = mode !== 'studio';
  $('table').hidden = $('board-tools').hidden = mode === 'studio';
  for (const id of ['play', 'puzzles', 'review']) $(id + '-panel').hidden = mode !== id;
  if (mode === 'puzzles' && puzzle?.difficulty !== $('difficulty').value) void nextPuzzle();
  else if (mode === 'play' && !play.ended && play.game.turn() !== play.side) void runBot();
  else render();
}

for (const element of document.querySelectorAll('[data-mode]')) element.addEventListener('click', () => selectMode(element.dataset.mode));
$('flip-board').addEventListener('click', () => { orientation = opposite(orientation); renderBoard(); });
$('opponent').addEventListener('change', showBotChoice);
$('new-game').addEventListener('click', () => startMatch());
$('retry-bot').addEventListener('click', () => void runBot());
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
  else renderBoard();
});
$('difficulty').addEventListener('change', nextPuzzle);
$('puzzle-next').addEventListener('click', nextPuzzle);
$('puzzle-hint').addEventListener('click', () => {
  if (!puzzle || puzzle.solved || puzzleRequest) return;
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
    if (!bot.id) bot = draftBot = { ...bot, id: 'draft' };
    loadBotChoices(bot.id);
    startMatch(bot);
    selectMode('play');
  },
});
window.addEventListener('pagehide', event => {
  stopBot();
  stopPuzzle();
  stopReview();
  if (!event.persisted) {
    engine.dispose();
    puzzles.dispose();
  }
});
window.addEventListener('pageshow', event => {
  if (!event.persisted) return;
  if (mode === 'puzzles' && puzzle?.difficulty !== $('difficulty').value) void nextPuzzle();
  else render();
  void runBot();
});
loadBotChoices();
$('use-last').disabled = !lastPgn;
startMatch();
