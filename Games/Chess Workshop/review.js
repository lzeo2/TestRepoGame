import { Chess } from './vendor/chess.js';
import { isEnginePosition } from './engine.js';

const REVIEW_NODES = 48_000;
const LINE_LENGTH = 12;
const CACHE_SIZE = 320;
const CACHE_BATCH = 16;
const CACHE_TAIL_LIMIT = 150;
const caches = new WeakMap();
const FEN_PREFIX = /^[prnbqk1-8]+(?:\/[prnbqk1-8]+){7}\s+[wb](?:\s|$)/i;
const STANDARD_VARIANTS = new Set(['standard', 'chess', 'from position']);

export function parseReview(pgn) {
  const text = String(pgn ?? '').trim();
  if (FEN_PREFIX.test(text)) throw new Error('This is a FEN position. Paste a PGN that includes moves.');
  const board = new Chess();
  let history;
  try {
    board.loadPgn(text);
    history = board.history({ verbose: true });
  } catch (error) {
    if (error.message.startsWith('Invalid FEN:')) throw new Error('The PGN starting position is invalid.', { cause: error });
    const move = error.message.match(/^Invalid move in PGN: ([^\s]{1,24})$/)?.[1];
    if (move) throw new Error(`Illegal move "${move}" in the PGN. Check the move list and try again.`, { cause: error });
    throw new Error('Paste the PGN for one legal chess game.', { cause: error });
  }
  const headers = board.getHeaders();
  const variant = Object.entries(headers).find(([key]) => key.toLowerCase() === 'variant')?.[1].trim().toLowerCase();
  if (variant && !STANDARD_VARIANTS.has(variant)) throw new Error('Review supports standard chess PGN.');
  if (!history.length) throw new Error('The PGN needs at least one move.');
  if (!isEnginePosition(history[0].before)) throw new Error('The PGN starting position is invalid.');
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
  const candidates = result.pv?.length && result.pv[0] === result.move ? result.pv : [result.move];
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
  return Object.freeze({
    score: Object.freeze(score), bestMove: pv[0] ?? null, pv: Object.freeze(pv), line: Object.freeze(line),
  });
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
  const best = move.uci === before.bestMove || (after.terminal === 'checkmate' && color * played.value > 0);
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
  signal?.throwIfAborted();
  const analysis = { positions: [], moves: [], complete: false };
  let cache = caches.get(engine);
  if (!cache) caches.set(engine, cache = new Map());
  let baseFen = game.positions[0], trail = '', batch = 0;
  const board = new Chess(baseFen);
  const moves = [];
  for (let index = 0; index < game.positions.length; index++) {
    signal?.throwIfAborted();
    const last = index === game.positions.length - 1;
    const move = game.moves[index - 1];
    const replayed = move ? board.move(uciMove(move.uci)) : null;
    const fen = replayed?.after ?? baseFen;
    if (replayed?.piece === 'p' || replayed?.captured) {
      // A pawn move or capture makes every preceding position unreachable.
      baseFen = fen;
      trail = '';
      moves.length = 0;
    } else if (move) {
      moves.push(move.uci);
      if (moves.length <= CACHE_TAIL_LIMIT) trail += '|' + move.uci;
    }
    const ending = terminal(board, last);
    const key = moves.length <= CACHE_TAIL_LIMIT ? baseFen + trail : null;
    let position;
    if (ending) {
      position = { ...ending, bestMove: null, pv: [], line: [] };
    } else if (cache.has(key)) {
      position = cache.get(key);
      cache.delete(key);
      cache.set(key, position);
    } else {
      const result = await engine.search(fen, {
        nodes: REVIEW_NODES, signal,
        history: moves.length ? { fen: baseFen, moves: moves.slice() } : undefined,
      });
      signal?.throwIfAborted();
      position = engineLine(fen, result, board.turn());
      if (key !== null) {
        cache.set(key, position);
        if (cache.size > CACHE_SIZE) cache.delete(cache.keys().next().value);
      }
      batch = 0;
    }
    analysis.positions.push(position);
    if (move) analysis.moves.push(classify(move, analysis.positions[index - 1], position));
    analysis.complete = last;
    onUpdate?.({ analysis, positionIndex: index, moveIndex: index - 1 });
    if (!last && ++batch >= CACHE_BATCH) {
      // A warm review can otherwise finish before the browser dispatches Stop.
      await new Promise(resolve => setTimeout(resolve, 0));
      batch = 0;
    }
  }
  return analysis;
}
