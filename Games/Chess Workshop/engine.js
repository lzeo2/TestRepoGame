import { Chess, validateFen } from './vendor/chess.js';

export const MIN_ELO = 1320;
export const MAX_ELO = 3190;
const DEFAULT_NODES = 32_000;
const MAX_NODES = 450_000;
const BOOT_TIMEOUT = 20_000;
const SEARCH_TIMEOUT = 12_000;
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const workerUrl = new URL('./vendor/stockfish-17.1-lite-single-03e3232.js', import.meta.url);
const CASTLING_ROOKS = { K: 'h1', Q: 'a1', k: 'h8', q: 'a8' };

function validPosition(fen) {
  if (typeof fen !== 'string' || fen.length > 160 || !/^[a-zA-Z0-9 /-]+$/.test(fen) || !validateFen(fen).ok) return false;
  const [ranks, turn, rights, , halfmoves, fullmoves] = fen.split(/ +/);
  if (!/^\d+$/.test(halfmoves) || !/^\d+$/.test(fullmoves) || Number(halfmoves) > 0x7fffffff || Number(fullmoves) > 0x3fffffff) return false;
  if ((ranks.match(/[A-Z]/g)?.length ?? 0) > 16 || (ranks.match(/[a-z]/g)?.length ?? 0) > 16 ||
      (ranks.match(/P/g)?.length ?? 0) > 8 || (ranks.match(/p/g)?.length ?? 0) > 8) return false;
  const board = new Chess(fen);
  const defendingKing = board.findPiece({ type: 'k', color: turn === 'w' ? 'b' : 'w' })[0];
  if (board.isAttacked(defendingKing, turn)) return false;
  // A FEN from an imported PGN can claim castling without a corresponding
  // rook. Require real home pieces before handing the string to the UCI parser.
  if (rights !== '-') {
    for (const right of rights) {
      const square = CASTLING_ROOKS[right];
      if (!square) return false;
      const rook = board.get(square);
      const king = board.get(`e${square[1]}`);
      const color = square[1] === '1' ? 'w' : 'b';
      if (rook?.type !== 'r' || rook.color !== color || king?.type !== 'k' || king.color !== color) return false;
    }
  }
  return true;
}

function abortError() {
  return new DOMException('Chess search cancelled.', 'AbortError');
}

// A single classic worker serves all analysis and opponent searches. A cancelled
// search retires its worker so a stale bestmove cannot complete a later request.
export function createEngine({ makeWorker = () => new Worker(workerUrl) } = {}) {
  const pending = [];
  let worker = null;
  let ready = false;
  let active = null;
  let timer;
  let disposed = false;

  function retireWorker() {
    const retired = worker;
    worker = null;
    ready = false;
    if (retired) retired.terminate();
  }

  function finish(error, result) {
    clearTimeout(timer);
    const job = active;
    active = null;
    if (job) {
      job.signal?.removeEventListener('abort', job.cancel);
      if (error) job.reject(error);
      else job.resolve(result);
    }
    advance();
  }

  function fail(error) {
    retireWorker();
    finish(error);
  }

  function startSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => fail(new Error('Stockfish search timed out.')), SEARCH_TIMEOUT);
    const { fen, elo, moves, nodes } = active;
    try {
      worker.postMessage(`setoption name UCI_LimitStrength value ${elo !== null}`);
      if (elo !== null) worker.postMessage(`setoption name UCI_Elo value ${elo}`);
      worker.postMessage(`position fen ${fen}`);
      worker.postMessage(`go nodes ${nodes}${moves.length ? ` searchmoves ${moves.join(' ')}` : ''}`);
    } catch (error) {
      fail(error);
    }
  }

  function receive(line) {
    if (line === 'uciok' && !ready) {
      worker.postMessage('isready');
      return;
    }
    if (line === 'readyok' && !ready) {
      ready = true;
      startSearch();
      return;
    }
    if (!ready || !active) return;
    if (line.startsWith('info ') && !line.startsWith('info string ')) {
      const rank = line.match(/\bmultipv (\d+)/)?.[1];
      const score = line.match(/\bscore (cp|mate) (-?\d+)/);
      if (score && (rank === undefined || rank === '1')) {
        active.score = { type: score[1], value: Number(score[2]) };
        const pv = line.match(/\bpv (.+)$/)?.[1];
        active.pv = pv ? pv.split(/\s+/).filter(move => UCI_MOVE.test(move)) : [];
      }
      return;
    }
    if (!line.startsWith('bestmove ')) return;
    const reply = line.split(/\s+/)[1];
    const move = UCI_MOVE.test(reply) ? reply : null;
    if (!move && !['(none)', '0000'].includes(reply)) {
      fail(new Error('Stockfish returned an invalid move.'));
      return;
    }
    if (move && !active.score) {
      fail(new Error('Stockfish returned no evaluation.'));
      return;
    }
    finish(null, { move, score: active.score ?? { type: 'cp', value: 0 }, pv: active.pv });
  }

  function advance() {
    if (disposed || active || !pending.length) return;
    active = pending.shift();
    if (ready) {
      startSearch();
      return;
    }
    timer = setTimeout(() => fail(new Error('Stockfish could not start.')), BOOT_TIMEOUT);
    try {
      const instance = makeWorker();
      worker = instance;
      instance.addEventListener('message', event => {
        if (instance !== worker || typeof event.data !== 'string') return;
        try {
          for (const line of event.data.split(/\r?\n/)) {
            if (instance !== worker) break;
            receive(line.trim());
          }
        } catch (error) {
          fail(error);
        }
      });
      instance.addEventListener('error', () => {
        if (instance === worker) fail(new Error('Stockfish could not run in this browser.'));
      });
      instance.postMessage('uci');
    } catch (error) {
      fail(error);
    }
  }

  function search(fen, { nodes = DEFAULT_NODES, elo, searchMoves = [], signal } = {}) {
    if (disposed || signal?.aborted) return Promise.reject(abortError());
    if (!validPosition(fen)) {
      return Promise.reject(new Error('Invalid position for Stockfish.'));
    }
    if (!Array.isArray(searchMoves) || searchMoves.length > 256 || searchMoves.some(move => !UCI_MOVE.test(move))) {
      return Promise.reject(new Error('Invalid analysis moves.'));
    }
    return new Promise((resolve, reject) => {
      const job = {
        fen,
        nodes: Number.isFinite(nodes) ? Math.max(1_000, Math.min(MAX_NODES, Math.round(nodes))) : DEFAULT_NODES,
        elo: Number.isFinite(elo) ? Math.max(MIN_ELO, Math.min(MAX_ELO, Math.round(elo))) : null,
        moves: [...searchMoves],
        pv: [],
        score: null,
        signal,
        resolve,
        reject,
        cancel: () => {
          if (job === active) {
            fail(abortError());
            return;
          }
          const index = pending.indexOf(job);
          if (index !== -1) pending.splice(index, 1);
          job.signal?.removeEventListener('abort', job.cancel);
          reject(abortError());
        },
      };
      pending.push(job);
      signal?.addEventListener('abort', job.cancel, { once: true });
      advance();
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    retireWorker();
    for (const job of pending.splice(0)) job.cancel();
    finish(abortError());
  }

  return { search, dispose };
}
