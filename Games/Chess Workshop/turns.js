import { Chess } from './vendor/chess.js';

export const BONUS_VARIANT = 'Workshop Bonus Turns';
export const BONUS_PASS = '--';

// Chess.js 1.4 uses this flag for its SAN null move in _makeMove.
const NULL_MOVE_FLAG = 128;
const PGN_PASS_TOKEN = 'Z--';
const PGN_PASS_SCAN = /\{[^}]*\}|;[^\r\n]*|"[^"]*"|(?<![\w=-])--(?![\w=-])/g;

export function canTakeBonus(game) {
  return !game.isCheck() && !game.isDraw();
}

export function passForBonus(game) {
  return game.passForBonus();
}

export class WorkshopChess extends Chess {
  #loadingPgn = false;

  passForBonus() {
    return canTakeBonus(this) ? super.move(null) : null;
  }

  move(move, options) {
    if (move !== null && !(typeof move === 'string' && move.replace(/=/, '').replace(/[+#]?[?!]*$/, '') === BONUS_PASS)) {
      return super.move(move, options);
    }
    const pass = this.passForBonus();
    if (!pass) throw new Error('Cannot skip a turn when in check or when the game has ended.');
    return pass;
  }

  loadPgn(pgn, options) {
    this.#loadingPgn = true;
    try {
      // Chess.js exports -- but its PGN reader only accepts letter-prefixed SAN.
      // Shield quoted headers and comments while adapting the standalone token.
      const text = pgn.replace(PGN_PASS_SCAN, token => token === BONUS_PASS ? PGN_PASS_TOKEN : token);
      return super.loadPgn(text, options);
    } finally {
      this.#loadingPgn = false;
    }
  }

  _moveFromSan(move, strict) {
    return super._moveFromSan(this.#loadingPgn && move === PGN_PASS_TOKEN ? BONUS_PASS : move, strict);
  }

  _makeMove(move) {
    if (!(move.flags & NULL_MOVE_FLAG)) return super._makeMove(move);
    // The PGN parser calls _makeMove directly. Bookkeeping passes made by
    // history() and pgn() must not use the live repetition table for validation.
    if (this.#loadingPgn) {
      const tag = Object.entries(this.getHeaders()).find(([key]) => key.toLowerCase() === 'variant')?.[1];
      if (tag?.trim().toLowerCase() !== BONUS_VARIANT.toLowerCase()) {
        throw new Error('Skipped turns require the Workshop Bonus Turns PGN variant.');
      }
      if (!canTakeBonus(this)) throw new Error('A bonus-turn PGN cannot skip a checked or finished position.');
    }
    const halfMoves = this._halfMoves;
    super._makeMove(move);
    // A skipped player turn expires en passant and can increment the move
    // number, but only real chess moves advance the fifty-move counter.
    this._halfMoves = halfMoves;
    // Stock chess.js omits the side and en passant updates to its null hash.
    // A canonical hash also lets the inherited _undoMove restore it exactly.
    this._hash = this._computeHash();
  }
}
