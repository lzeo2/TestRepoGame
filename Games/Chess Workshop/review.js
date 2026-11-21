import { Chess } from './vendor/chess.js';

const REVIEW_NODES = 48_000;
const LINE_LENGTH = 12;
const CASTLING = [
  ['K', 'w', 'e1', 'h1'], ['Q', 'w', 'e1', 'a1'],
  ['k', 'b', 'e8', 'h8'], ['q', 'b', 'e8', 'a8'],
];

function validSetup(fen) {
  const board = new Chess(fen);
  const opponent = board.turn() === 'w' ? 'b' : 'w';
  const [king] = board.findPiece({ type: 'k', color: opponent });
  if (board.isAttacked(king, board.turn())) return false;
  const rights = fen.split(' ')[2];
  for (const [flag, color, origin, corner] of CASTLING) {
    if (!rights.includes(flag)) continue;
    const king = board.get(origin), rook = board.get(corner);
    if (king?.type !== 'k' || king.color !== color || rook?.type !== 'r' || rook.color !== color) return false;
  }
  return true;
}

export function parseReview(pgn) {
  const board = new Chess();
  try {
    board.loadPgn(String(pgn ?? '').trim());
  } catch (error) {
    throw new Error('Paste the PGN for one legal chess game.', { cause: error });
  }
  const history = board.history({ verbose: true });
  if (!history.length) throw new Error('The PGN needs at least one move.');
  if (!validSetup(history[0].before)) throw new Error('The PGN starting position is invalid.');
  const headers = board.getHeaders();
  const name = (text, fallback) => text && text !== '?' ? text : fallback;
  return {
    positions: [history[0].before, ...history.map(move => move.after)],
    moves: history.map(({ lan: uci, san, color, before, from, to, promotion }) => ({
      uci, san, color, number: Number(before.split(' ').at(-1)), from, to, promotion,
    })),
    white: name(headers.White, 'White'),
    black: name(headers.Black, 'Black'),
    result: headers.Result || '*',
  };
}

function whiteScore(score, turn) {
  if (!score || !['cp', 'mate'].includes(score.type) || !Number.isFinite(score.value)) {
    throw new Error('The engine returned no evaluation.');
  }
  return { type: score.type, value: (turn === 'w' ? score.value : -score.value) || 0 };
}

function uciMove(uci) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] };
}

function engineLine(fen, result, turn) {
  const score = whiteScore(result.score, turn);
  const board = new Chess(fen);
  const candidates = result.pv?.[0] === result.move ? result.pv : [result.move];
  const pv = [], line = [];
  for (const uci of candidates.slice(0, LINE_LENGTH)) {
    // Only display the legal portion of the engine's line.
    if (typeof uci !== 'string') break;
    try {
      line.push(board.move(uciMove(uci)).san);
      pv.push(uci);
    } catch (error) {
      if (!line.length) throw new Error('The engine returned an invalid best move.', { cause: error });
      break;
    }
  }
  return { score, bestMove: pv[0] ?? null, pv, line };
}

function terminal(board, last) {
  if (board.isCheckmate()) {
    return { score: { type: 'mate', value: board.turn() === 'w' ? -1 : 1 }, terminal: 'checkmate' };
  }
  // A recorded game may have continued after a draw could have been claimed.
  if (board.isStalemate() || board.isInsufficientMaterial() || (last && board.isDraw())) {
    return { score: { type: 'cp', value: 0 }, terminal: 'draw' };
  }
  return null;
}

function classify(move, before, after) {
  const color = move.color === 'w' ? 1 : -1;
  const evaluation = before.score, played = after.score;
  const best = move.uci === before.bestMove;
  const comparable = evaluation.type === 'cp' && played.type === 'cp';
  const loss = comparable ? best ? 0 : Math.max(0, color * (evaluation.value - played.value)) : null;
  let label = 'Good';
  let note = '';
  if (best) label = 'Best';
  else if (comparable) {
    if (loss <= 25) label = 'Excellent';
    else if (loss > 200) label = 'Blunder';
    else if (loss > 100) label = 'Mistake';
    else if (loss > 55) label = 'Inaccuracy';
  } else {
    const originalMate = evaluation.type === 'mate' ? Math.sign(color * evaluation.value) : 0;
    const playedMate = played.type === 'mate' ? Math.sign(color * played.value) : 0;
    if (playedMate < 0 && originalMate >= 0) {
      label = 'Blunder';
      note = 'Allows a forced mate.';
    } else if (originalMate > 0 && playedMate <= 0) {
      label = 'Mistake';
      note = 'Misses a forced mate.';
    }
  }
  return {
    label, loss, note, bestMove: before.bestMove, bestSan: before.line[0] ?? null,
    before: evaluation, after: played,
  };
}

export async function analyzeReview(game, engine, { signal, onUpdate } = {}) {
  const analysis = { positions: [], moves: [], complete: false };
  const board = new Chess(game.positions[0]);
  for (let index = 0; index < game.positions.length; index++) {
    signal?.throwIfAborted();
    const last = index === game.positions.length - 1;
    const move = game.moves[index - 1];
    if (move) board.move(uciMove(move.uci));
    const fen = board.fen();
    const ending = terminal(board, last);
    let position;
    if (ending) {
      position = { ...ending, bestMove: null, pv: [], line: [] };
    } else {
      const result = await engine.search(fen, { nodes: REVIEW_NODES, signal });
      signal?.throwIfAborted();
      position = engineLine(fen, result, board.turn());
    }
    analysis.positions.push(position);
    if (move) analysis.moves.push(classify(move, analysis.positions[index - 1], position));
    analysis.complete = last;
    onUpdate?.({ analysis, positionIndex: index, moveIndex: index - 1 });
  }
  return analysis;
}
