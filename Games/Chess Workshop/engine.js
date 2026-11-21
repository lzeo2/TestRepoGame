import { Chess, validateFen } from './vendor/chess.js';

export const MIN_ELO = 1320;
export const MAX_ELO = 3190;
const DEFAULT_NODES = 32_000;
const MAX_NODES = 450_000;
const BOOT_TIMEOUT = 20_000;
const SEARCH_TIMEOUT = 12_000;
const STOP_TIMEOUT = 4_000;
const MAX_HISTORY_PLIES = 20_000;
const CACHED_HISTORY_PLIES = 512;
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const workerUrl = new URL('./vendor/stockfish-17.1-lite-single-03e3232.js', import.meta.url);
const CASTLING_ROOKS = { K: 'h1', Q: 'a1', k: 'h8', q: 'a8' };

function parsePosition(fen) {
  if (typeof fen !== 'string' || fen.length > 160 || !/^[a-zA-Z0-9 /-]+$/.test(fen) || !validateFen(fen).ok) return null;
  const [ranks, turn, rights, , halfmoves, fullmoves] = fen.split(/ +/);
  if (!/^\d+$/.test(halfmoves) || !/^\d+$/.test(fullmoves) || Number(halfmoves) > 0x7fffffff || Number(fullmoves) > 0x3fffffff) return null;
  if ((ranks.match(/[A-Z]/g)?.length ?? 0) > 16 || (ranks.match(/[a-z]/g)?.length ?? 0) > 16 ||
      (ranks.match(/P/g)?.length ?? 0) > 8 || (ranks.match(/p/g)?.length ?? 0) > 8) return null;
  const board = new Chess(fen, { skipValidation: true });
  const defendingKing = board.findPiece({ type: 'k', color: turn === 'w' ? 'b' : 'w' })[0];
  if (board.isAttacked(defendingKing, turn)) return null;
  // A FEN from an imported PGN can claim castling without a corresponding
  // rook. Require real home pieces before handing the string to the UCI parser.
  if (rights !== '-') {
    for (const right of rights) {
      const square = CASTLING_ROOKS[right];
      if (!square) return null;
      const rook = board.get(square);
      const king = board.get(`e${square[1]}`);
      const color = square[1] === '1' ? 'w' : 'b';
      if (rook?.type !== 'r' || rook.color !== color || king?.type !== 'k' || king.color !== color) return null;
    }
  }
  return board;
}

export function isEnginePosition(fen) {
  return parsePosition(fen) !== null;
}

function validMove(move) {
  return typeof move === 'string' && UCI_MOVE.test(move);
}

function abortError() {
  return new DOMException('Chess search cancelled.', 'AbortError');
}

// A single classic worker serves all analysis and opponent searches. The next
// search waits for the current search's bestmove even if its caller has left.
export function createEngine({ makeWorker = () => new Worker(workerUrl) } = {}) {
  const pending = [];
  let worker = null;
  let configuredElo;
  let verifiedHistory = null;
  let phase = 'idle';
  let active = null;
  let timer;
  let disposed = false;

  function positionCommand(fen, current, history) {
    if (history === undefined) return `position fen ${fen}`;
    if (!history || !Array.isArray(history.moves) || history.moves.length > MAX_HISTORY_PLIES) return null;
    const { fen: start, moves } = history;
    const prefix = verifiedHistory && verifiedHistory.start === start && verifiedHistory.moves.length <= moves.length &&
      verifiedHistory.moves.every((move, index) => moves[index] === move) ? verifiedHistory : null;
    const length = prefix ? prefix.moves.length : 0;
    let reached = prefix?.end;
    if (!prefix || length < moves.length) {
      // Legal move validation can start at the end of the checked prefix.
      // Preserve the full history in the UCI command for repetition analysis.
      const board = prefix ? new Chess(prefix.end, { skipValidation: true }) : parsePosition(start);
      if (!board) return null;
      try {
        for (let i = length; i < moves.length; i++) {
          const move = moves[i];
          if (!validMove(move)) return null;
          board.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
        }
      } catch {
        return null;
      }
      reached = board.fen();
    }
    if (reached !== current.fen()) return null;
    if (!prefix || length !== moves.length) {
      verifiedHistory = moves.length <= CACHED_HISTORY_PLIES ? { start, moves: moves.slice(), end: reached } : null;
    }
    return `position fen ${start}${moves.length ? ` moves ${moves.join(' ')}` : ''}`;
  }

  function retireWorker() {
    const retired = worker;
    worker = null;
    configuredElo = undefined;
    if (retired) retired.terminate();
  }

  function settle(job, error, result) {
    if (!job) return;
    job.signal?.removeEventListener('abort', job.cancel);
    if (error) job.reject(error);
    else job.resolve(result);
  }

  function finish(error, result) {
    clearTimeout(timer);
    phase = 'idle';
    const job = active;
    active = null;
    settle(job, error, result);
    advance();
  }

  function fail(error) {
    retireWorker();
    finish(error);
  }

  function startSearch() {
    clearTimeout(timer);
    phase = 'searching';
    timer = setTimeout(() => fail(new Error('Stockfish search timed out.')), SEARCH_TIMEOUT);
    const { position, elo, moves, nodes } = active;
    try {
      if (configuredElo !== elo) {
        if (configuredElo === undefined || (configuredElo === null) !== (elo === null)) {
          worker.postMessage(`setoption name UCI_LimitStrength value ${elo !== null}`);
        }
        if (elo !== null) worker.postMessage(`setoption name UCI_Elo value ${elo}`);
        configuredElo = elo;
      }
      worker.postMessage(position);
      worker.postMessage(`go nodes ${nodes}${moves.length ? ` searchmoves ${moves.join(' ')}` : ''}`);
    } catch (error) {
      fail(error);
    }
  }

  function receive(line) {
    if (phase === 'booting') {
      if (line === 'uciok') worker.postMessage('isready');
      if (line === 'readyok') {
        if (active) startSearch();
        else finish();
      }
      return;
    }
    if (phase === 'draining') {
      if (line.startsWith('bestmove ')) finish();
      return;
    }
    if (phase !== 'searching') return;
    if (line.startsWith('info ') && !line.startsWith('info string ')) {
      const rank = line.match(/\bmultipv (\d+)/)?.[1];
      const score = line.match(/\bscore (cp|mate) (-?\d+)/);
      if (score && (rank === undefined || rank === '1')) {
        active.score = { type: score[1], value: Number(score[2]) };
        const pv = line.match(/\bpv (.+)$/)?.[1];
        active.pv = pv ? pv.split(/\s+/).filter(validMove) : [];
      }
      return;
    }
    if (!line.startsWith('bestmove ')) return;
    const reply = line.split(/\s+/)[1];
    const move = validMove(reply) ? reply : null;
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
    if (disposed || phase !== 'idle') return;
    while (pending[0]?.signal?.aborted) settle(pending.shift(), abortError());
    if (!pending.length) return;
    active = pending.shift();
    if (worker) {
      startSearch();
      return;
    }
    phase = 'booting';
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

  function cancel(job) {
    if (job !== active) {
      const index = pending.indexOf(job);
      if (index !== -1) pending.splice(index, 1);
      settle(job, abortError());
      return;
    }
    active = null;
    settle(job, abortError());
    if (phase !== 'searching') return;
    // Flush the cancelled search's output instead of sending a new position
    // to a busy worker. Restart only if the worker cannot acknowledge stop.
    phase = 'draining';
    clearTimeout(timer);
    timer = setTimeout(() => fail(new Error('Stockfish could not stop.')), STOP_TIMEOUT);
    try {
      worker.postMessage('stop');
    } catch (error) {
      fail(error);
    }
  }

  // Optional history supplies the starting FEN and legal UCI moves through
  // the requested FEN, allowing Stockfish to see previous repetitions.
  function search(fen, { nodes = DEFAULT_NODES, elo, searchMoves = [], history, signal } = {}) {
    if (disposed || signal?.aborted) return Promise.reject(abortError());
    const current = parsePosition(fen);
    if (!current) {
      return Promise.reject(new Error('Invalid position for Stockfish.'));
    }
    if (!Array.isArray(searchMoves) || searchMoves.length > 256 || searchMoves.some(move => !validMove(move))) {
      return Promise.reject(new Error('Invalid analysis moves.'));
    }
    const position = positionCommand(fen, current, history);
    if (!position) return Promise.reject(new Error('Game history does not match the position.'));
    return new Promise((resolve, reject) => {
      const job = {
        position,
        nodes: Number.isFinite(nodes) ? Math.max(1_000, Math.min(MAX_NODES, Math.round(nodes))) : DEFAULT_NODES,
        elo: Number.isFinite(elo) ? Math.max(MIN_ELO, Math.min(MAX_ELO, Math.round(elo))) : null,
        moves: [...searchMoves],
        pv: [],
        score: null,
        signal,
        resolve,
        reject,
        cancel: () => cancel(job),
      };
      pending.push(job);
      signal?.addEventListener('abort', job.cancel, { once: true });
      advance();
    });
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    verifiedHistory = null;
    retireWorker();
    for (const job of pending.splice(0)) job.cancel();
    finish(abortError());
  }

  return { search, dispose };
}
