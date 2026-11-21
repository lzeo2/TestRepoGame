const FILES = 'abcdefgh';
const SYMBOLS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAMES = { k: 'king', q: 'queen', r: 'rook', b: 'bishop', n: 'knight', p: 'pawn' };
const SIDE = { w: 'White', b: 'Black' };

export const uciMove = uci => ({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });

export function createBoard(element, onMove) {
  let frame, selected = null, destinations = [], dragFrom = null, focusedIndex = 56;
  const cells = Array.from({ length: 64 }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    const piece = document.createElement('span'), rank = document.createElement('span'), file = document.createElement('span');
    piece.className = 'piece';
    rank.className = 'coord rank';
    file.className = 'coord file';
    for (const child of [piece, rank, file]) child.setAttribute('aria-hidden', 'true');
    button.append(piece, rank, file);
    element.append(button);
    button.addEventListener('focus', () => {
      cells[focusedIndex].button.tabIndex = -1;
      focusedIndex = index;
      button.tabIndex = 0;
    });
    return { button, piece, rank, file };
  });

  function paint() {
    const { game, side, interactive, last, hint } = frame;
    const checked = game.isCheck();
    for (let index = 0; index < 64; index++) {
      const { button, piece, rank, file } = cells[index];
      const column = index % 8, row = Math.floor(index / 8);
      const square = side === 'w' ? FILES[column] + (8 - row) : FILES[7 - column] + (1 + row);
      const item = game.get(square);
      button.className = 'square';
      button.classList.toggle('dark', Boolean((column + row) % 2));
      button.classList.toggle('last', square === last?.from || square === last?.to);
      button.classList.toggle('hint', square === hint?.from || square === hint?.to);
      button.classList.toggle('selected', square === selected);
      button.classList.toggle('legal', destinations.some(move => move.to === square));
      button.classList.toggle('occupied', Boolean(item));
      button.classList.toggle('checked', Boolean(checked && item?.type === 'k' && item.color === game.turn()));
      button.dataset.square = square;
      button.tabIndex = index === focusedIndex ? 0 : -1;
      button.setAttribute('aria-label', item ? `${square} ${SIDE[item.color]} ${NAMES[item.type]}` : square);
      button.setAttribute('aria-pressed', String(selected === square));
      piece.textContent = item ? SYMBOLS[item.type] : '';
      piece.className = item?.color === 'w' ? 'piece white' : 'piece';
      piece.draggable = Boolean(interactive && item?.color === game.turn());
      rank.textContent = column === 0 ? square[1] : '';
      file.textContent = row === 7 ? square[0] : '';
    }
  }

  function choose(square) {
    selected = square;
    destinations = square ? frame.game.moves({ square, verbose: true }) : [];
    paint();
  }

  function move(to) {
    const choices = destinations.filter(candidate => candidate.to === to);
    if (!choices.length) return false;
    choose(null);
    onMove(choices);
    return true;
  }

  element.addEventListener('click', event => {
    const square = event.target.closest('.square')?.dataset.square;
    if (!frame?.interactive || !square) return;
    if (move(square)) return;
    choose(square !== selected && frame.game.get(square)?.color === frame.game.turn() ? square : null);
  });
  element.addEventListener('keydown', event => {
    const directions = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -8, ArrowDown: 8 };
    const delta = directions[event.key];
    if (!delta) return;
    event.preventDefault();
    const column = focusedIndex % 8;
    if ((delta === -1 && column === 0) || (delta === 1 && column === 7)) return;
    cells[focusedIndex + delta]?.button.focus();
  });
  element.addEventListener('dragstart', event => {
    if (!frame?.interactive || !event.target.draggable) return;
    dragFrom = event.target.closest('.square')?.dataset.square ?? null;
    if (!dragFrom) return;
    event.dataTransfer.setData('text/plain', dragFrom);
    event.dataTransfer.effectAllowed = 'move';
    choose(dragFrom);
  });
  element.addEventListener('dragover', event => {
    const square = event.target.closest('.square')?.dataset.square;
    if (frame?.interactive && dragFrom && destinations.some(candidate => candidate.to === square)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  });
  element.addEventListener('drop', event => {
    if (!frame?.interactive || !dragFrom) return;
    event.preventDefault();
    const square = event.target.closest('.square')?.dataset.square;
    dragFrom = null;
    if (!move(square)) choose(null);
  });
  element.addEventListener('dragend', () => {
    if (dragFrom) choose(null);
    dragFrom = null;
  });

  let lastFen;
  return {
    show(next) {
      const fen = next.game.fen();
      if (fen !== lastFen || !next.interactive || frame?.game !== next.game || frame.side !== next.side) {
        selected = null;
        destinations = [];
      }
      lastFen = fen;
      frame = next;
      paint();
    },
  };
}
