const game = new BattleshipLogic();
let isPlayerTurn = true;
let gameActive = false;
let aim = { r: 0, c: 0 }; // keyboard aim cursor on the computer board

// DOM Elements
const playerBoardDiv = document.getElementById('player-board');
const computerBoardDiv = document.getElementById('computer-board');
const messageLog = document.getElementById('message-log');
const startBtn = document.getElementById('start-btn');

// --- EVENT DELEGATION ---
// We attach the listener ONCE to the container, not the cells.
// This prevents the "stuck" bug where re-rendering removed listeners.
computerBoardDiv.addEventListener('click', (e) => {
    if (!gameActive || !isPlayerTurn) return;

    // Find the closest cell element
    const cell = e.target.closest('.cell');
    if (!cell) return;

    // Get coordinates
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);

    handlePlayerClick(r, c);
});

function startGame() {
    game.initGame();
    isPlayerTurn = true;
    gameActive = true;
    messageLog.textContent = "Game started, your turn."
    messageLog.style.color = "black";
    
    renderBoards();
}

function renderBoards() {
    renderBoard(playerBoardDiv, game.playerBoard, true);
    renderBoard(computerBoardDiv, game.computerBoard, false);
}

function renderBoard(container, boardData, isPlayer) {
    // We clear the HTML, but the container's event listener remains active
    container.innerHTML = '';
    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;

            const status = boardData[r][c];
            
            // Apply classes based on status
            if (status === 3) cell.classList.add('hit'); // Hit
            else if (status === 2) cell.classList.add('miss'); // Miss/Disable
            else if (status === 1 && isPlayer) cell.classList.add('ship'); // Show player ships

            if (!isPlayer && gameActive && isPlayerTurn && r === aim.r && c === aim.c) {
                cell.classList.add('aim');
            }
            
            container.appendChild(cell);
        }
    }
}

function handlePlayerClick(r, c) {
    const result = game.hit(PARTY.PLAYER, [r, c]);
    
    if (result.status === 'invalid') return;

    renderBoards();

    if (result.gameOver) {
        messageLog.textContent = "Victory, you sank all enemy ships.";
        messageLog.style.color = "green";
        gameActive = false;
        return;
    }

    if (result.status === 'hit' || result.status === 'sunk') {
        messageLog.textContent = result.status === 'sunk' ? "You sank a ship, shoot again." : "Hit, shoot again.";
        // IMPORTANT: Player keeps turn. We do NOT call computerTurn.
    } else {
        messageLog.textContent = "Miss, computer's turn.";
        isPlayerTurn = false;
        // Small delay before computer acts
        setTimeout(computerTurn, 800); 
    }
}

function computerTurn() {
    if (!gameActive) return;

    const [r, c] = game.predict(PARTY.COMPUTER);
    const result = game.hit(PARTY.COMPUTER, [r, c]);

    game.updateComputerPredictionAfterHit(r, c, result.status);
    renderBoards();

    if (result.gameOver) {
        messageLog.textContent = "Defeat, the computer sank all your ships.";
        messageLog.style.color = "red";
        gameActive = false;
        return;
    }

    if (result.status === 'hit' || result.status === 'sunk') {
        messageLog.textContent = result.status === 'sunk' ? "Computer sank your ship, it shoots again." : "Computer hit, it shoots again.";
        // Computer keeps turn
        setTimeout(computerTurn, 1000); 
    } else {
        messageLog.textContent = "Computer missed, your turn.";
        isPlayerTurn = true;
        // The event listener on computerBoardDiv is always active, 
        // so as soon as isPlayerTurn is true, the player can click.
    }
}

// Keyboard input: arrows move the aim, Enter or Space fires
document.addEventListener("keydown", (e) => {
    if (!gameActive || !isPlayerTurn) return;
    const moves = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
    };
    if (moves[e.key]) {
        e.preventDefault();
        aim.r = Math.min(9, Math.max(0, aim.r + moves[e.key][0]));
        aim.c = Math.min(9, Math.max(0, aim.c + moves[e.key][1]));
        renderBoards();
    } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handlePlayerClick(aim.r, aim.c);
        renderBoards();
    }
});

// Initial Start
startGame();
