var board,
    game = new Chess();
var positionCount = 0;
var aiThinking = false;
var replyTimer = null;
var searchWorker = null;
var searchDeadline = null;
var searchRequestId = 0;
var AI_SEARCH_BUDGET_MS = 1200;

var showGameStatus = function () {
    var el = document.getElementById('game-status');
    if (!el) return;
    var result = '';
    if (game.in_checkmate()) {
        var loser = game.turn() === 'w' ? 'White' : 'Black';
        result = 'Checkmate — ' + loser + ' loses!';
    } else if (game.in_stalemate()) {
        result = 'Stalemate — no legal moves.';
    } else if (game.in_draw()) {
        result = 'Draw — the game is over.';
    } else {
        result = 'Game over!';
    }
    el.textContent = result;
    el.classList.add('visible');
};

var clearGameStatus = function () {
    var el = document.getElementById('game-status');
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
};

var renderMoveHistory = function (moves) {
    var historyElement = $('#move-history').empty();
    for (var i = 0; i < moves.length; i += 2) {
        historyElement.append('<span>' + moves[i] + ' ' + (moves[i + 1] || ' ') + '</span><br>');
    }
    historyElement.scrollTop(historyElement[0].scrollHeight);
};

var finishSearch = function (requestId) {
    if (requestId !== searchRequestId) return;
    if (searchDeadline !== null) { window.clearTimeout(searchDeadline); searchDeadline = null; }
    if (searchWorker) { searchWorker.terminate(); searchWorker = null; }
    aiThinking = false;
};

var cancelAiTurn = function () {
    searchRequestId += 1;
    if (replyTimer !== null) { window.clearTimeout(replyTimer); replyTimer = null; }
    if (searchDeadline !== null) { window.clearTimeout(searchDeadline); searchDeadline = null; }
    if (searchWorker) { searchWorker.terminate(); searchWorker = null; }
    aiThinking = false;
};

var applyAiMove = function (requestId, move) {
    if (requestId !== searchRequestId) return;
    finishSearch(requestId);
    if (!move || game.game_over() || game.turn() !== 'b') {
        if (game.game_over()) showGameStatus();
        return;
    }

    clearGameStatus();
    var played = game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
    if (!played) return;
    board.position(game.fen());
    renderMoveHistory(game.history());
    if (game.game_over()) showGameStatus();
};

var fallbackMove = function () {
    var legalMoves = game.moves({ verbose: true });
    if (!legalMoves.length) return null;
    return { from: legalMoves[0].from, to: legalMoves[0].to, promotion: 'q' };
};

var updateSearchMetrics = function (data) {
    positionCount = data.positions || 0;
    var elapsed = data.elapsed || 0;
    $('#position-count').text(positionCount);
    $('#time').text((elapsed / 1000).toFixed(2) + 's');
    $('#positions-per-s').text(elapsed > 0 ? Math.round(positionCount * 1000 / elapsed) : 0);
};

var startAiSearch = function () {
    if (game.game_over() || game.turn() !== 'b') {
        aiThinking = false;
        if (game.game_over()) showGameStatus();
        return;
    }

    var requestId = ++searchRequestId;
    var bestMove = fallbackMove();
    var worker;
    try {
        worker = new Worker('chess-worker.js');
    } catch (error) {
        applyAiMove(requestId, bestMove);
        return;
    }
    searchWorker = worker;
    var status = document.getElementById('game-status');
    if (status) { status.textContent = 'AI thinking…'; status.classList.add('visible'); }
    worker.onmessage = function (event) {
        var data = event.data || {};
        if (requestId !== searchRequestId || data.requestId !== requestId) return;
        if (data.type === 'progress' && data.move) {
            bestMove = data.move;
            updateSearchMetrics(data);
        } else if (data.type === 'complete') {
            if (data.move) bestMove = data.move;
            updateSearchMetrics(data);
            applyAiMove(requestId, bestMove);
        } else if (data.type === 'error') {
            applyAiMove(requestId, bestMove);
        }
    };
    worker.onerror = function () { applyAiMove(requestId, bestMove); };
    searchDeadline = window.setTimeout(function () {
        applyAiMove(requestId, bestMove);
    }, AI_SEARCH_BUDGET_MS);
    worker.postMessage({
        type: 'search', requestId: requestId, fen: game.fen(),
        maxDepth: parseInt($('#search-depth').val(), 10) || 3
    });
};

var onDragStart = function (source, piece) {
    if (aiThinking || game.game_over() || game.turn() !== 'w' || piece.search(/^w/) !== 0) return false;
};

var onDrop = function (source, target) {
    if (aiThinking || game.game_over() || game.turn() !== 'w') return 'snapback';
    var move = game.move({ from: source, to: target, promotion: 'q' });
    removeGreySquares();
    if (move === null) return 'snapback';

    clearGameStatus();
    renderMoveHistory(game.history());
    aiThinking = true;
    replyTimer = window.setTimeout(function () {
        replyTimer = null;
        startAiSearch();
    }, 250);
};

var onSnapEnd = function () { board.position(game.fen()); };

var onMouseoverSquare = function (square) {
    var moves = game.moves({ square: square, verbose: true });
    if (!moves.length) return;
    greySquare(square);
    for (var i = 0; i < moves.length; i++) greySquare(moves[i].to);
};

var onMouseoutSquare = function () { removeGreySquares(); };

var removeGreySquares = function () {
    $('#board .square-55d63').css('background', '');
};

var greySquare = function (square) {
    var squareEl = $('#board .square-' + square);
    var background = squareEl.hasClass('black-3c85d') ? '#696969' : '#a9a9a9';
    squareEl.css('background', background);
};

var cfg = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onMouseoutSquare: onMouseoutSquare,
    onMouseoverSquare: onMouseoverSquare,
    onSnapEnd: onSnapEnd
};
board = ChessBoard('board', cfg);

$(window).on('resize', function () { board.resize(); });
$('#new-game-btn').on('click', function () {
    cancelAiTurn();
    game = new Chess();
    board.position('start', false);
    positionCount = 0;
    $('#position-count, #time, #positions-per-s').text('');
    $('#move-history').empty();
    clearGameStatus();
});
