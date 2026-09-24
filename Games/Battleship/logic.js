/**
 * Logic for Sea Battle Chess
 */

const BOARD_SIZE = 10;
const SHIPS_CONFIG = [
    { size: 4, count: 1 },
    { size: 3, count: 2 },
    { size: 2, count: 3 },
    { size: 1, count: 4 }
];

const STATUS = { EMPTY: 0, SHIP: 1, MISS: 2, HIT: 3 };
const PARTY = { PLAYER: 1, COMPUTER: 2 };

class BattleshipLogic {
    constructor() {
        this.playerBoard = this.createEmptyBoard();
        this.computerBoard = this.createEmptyBoard();
        this.playerShips = []; 
        this.computerShips = [];
        this.computerHitStack = [];
    }

    createEmptyBoard() {
        return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(STATUS.EMPTY));
    }

    initGame() {
        this.playerBoard = this.createEmptyBoard();
        this.computerBoard = this.createEmptyBoard();
        this.playerShips = [];
        this.computerShips = [];
        this.computerHitStack = [];

        this.placeShipsRandomly(this.playerBoard, this.playerShips);
        this.placeShipsRandomly(this.computerBoard, this.computerShips);
    }

    placeShipsRandomly(board, shipTracker) {
        const allShips = [];
        SHIPS_CONFIG.forEach(conf => {
            for (let i = 0; i < conf.count; i++) allShips.push(conf.size);
        });

        for (let size of allShips) {
            let placed = false, attempts = 0;
            while (!placed && attempts < 1000) {
                const r = Math.floor(Math.random() * BOARD_SIZE);
                const c = Math.floor(Math.random() * BOARD_SIZE);
                const horizontal = Math.random() > 0.5;
                if (this.canPlaceShip(board, r, c, size, horizontal)) {
                    this.placeShip(board, shipTracker, r, c, size, horizontal);
                    placed = true;
                }
                attempts++;
            }
        }
    }

    canPlaceShip(board, r, c, size, horizontal) {
        if (horizontal && c + size > BOARD_SIZE) return false;
        if (!horizontal && r + size > BOARD_SIZE) return false;
        const rStart = Math.max(0, r - 1), rEnd = Math.min(BOARD_SIZE - 1, horizontal ? r + 1 : r + size);
        const cStart = Math.max(0, c - 1), cEnd = Math.min(BOARD_SIZE - 1, horizontal ? c + size : c + 1);
        for (let i = rStart; i <= rEnd; i++) {
            for (let j = cStart; j <= cEnd; j++) {
                if (board[i][j] !== STATUS.EMPTY) return false;
            }
        }
        return true;
    }

    placeShip(board, shipTracker, r, c, size, horizontal) {
        const shipObj = { coords: [], hits: 0, size: size };
        for (let i = 0; i < size; i++) {
            const curR = horizontal ? r : r + i;
            const curC = horizontal ? c + i : c;
            board[curR][curC] = STATUS.SHIP;
            shipObj.coords.push([curR, curC]);
        }
        shipTracker.push(shipObj);
    }

    checkSunkAndDisableNeighbors(board, shipTracker, r, c) {
        const ship = shipTracker.find(s => s.coords.some(coord => coord[0] === r && coord[1] === c));
        if (ship) {
            ship.hits++;
            if (ship.hits === ship.size) {
                this.disableNeighbors(board, ship);
                return true;
            }
        }
        return false;
    }

    disableNeighbors(board, ship) {
        ship.coords.forEach(([r, c]) => {
            for (let i = r - 1; i <= r + 1; i++) {
                for (let j = c - 1; j <= c + 1; j++) {
                    if (i >= 0 && i < BOARD_SIZE && j >= 0 && j < BOARD_SIZE) {
                        if (board[i][j] === STATUS.EMPTY) board[i][j] = STATUS.MISS;
                    }
                }
            }
        });
    }

    isGameOver(shipTracker) {
        return shipTracker.every(s => s.hits === s.size);
    }

    getBoard(party) {
        const sourceBoard = (party === PARTY.PLAYER) ? this.playerBoard : this.computerBoard;
        return sourceBoard.map(row => row.map(cell => {
            if (cell === STATUS.EMPTY || cell === STATUS.SHIP) return 0; 
            if (cell === STATUS.HIT) return 1; 
            if (cell === STATUS.MISS) return 2; 
            return 0;
        }));
    }

    hit(party, squareID) {
        const [r, c] = squareID;
        const targetBoard = (party === PARTY.PLAYER) ? this.computerBoard : this.playerBoard;
        const targetShips = (party === PARTY.PLAYER) ? this.computerShips : this.playerShips;

        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) return { status: 'invalid' };
        const currentStatus = targetBoard[r][c];
        if (currentStatus === STATUS.MISS || currentStatus === STATUS.HIT) return { status: 'invalid' };

        if (currentStatus === STATUS.SHIP) {
            targetBoard[r][c] = STATUS.HIT;
            const sunk = this.checkSunkAndDisableNeighbors(targetBoard, targetShips, r, c);
            return { status: sunk ? 'sunk' : 'hit', gameOver: this.isGameOver(targetShips) };
        } else {
            targetBoard[r][c] = STATUS.MISS;
            return { status: 'miss', gameOver: false };
        }
    }

    predict(party) {
        // We only implement this for COMPUTER guessing PLAYER board
        if (party !== PARTY.COMPUTER) return [0,0];

        const targetBoard = this.playerBoard;

        // --- Phase 1: Target Mode (Stack) ---
        // If we have a pending target in the stack, use it.
        while(this.computerHitStack.length > 0) {
            const [r, c] = this.computerHitStack[this.computerHitStack.length - 1];
            if (targetBoard[r][c] === STATUS.MISS || targetBoard[r][c] === STATUS.HIT) {
                this.computerHitStack.pop();
            } else {
                return this.computerHitStack.pop();
            }
        }

        // --- Phase 2: Search Mode (PDF/Heatmap) ---
        // In a real game, computer wouldn't know playerShips, but logic.js tracks state for both.
        // We use playerShips to know which ships are remaining (sizes) and which hits are "sunk" hits.
        const targetShips = this.playerShips;

        // 1. Classify Hits on the Board
        const sunkHits = new Set();
        const activeHits = [];

        targetShips.forEach(ship => {
            if (ship.hits === ship.size) {
                ship.coords.forEach(([r,c]) => sunkHits.add(`${r},${c}`));
            }
        });

        for(let r = 0; r < BOARD_SIZE; r++) {
            for(let c = 0; c < BOARD_SIZE; c++) {
                if (targetBoard[r][c] === STATUS.HIT) {
                    if (!sunkHits.has(`${r},${c}`)) {
                        activeHits.push([r, c]);
                    }
                }
            }
        }

        // 2. Identify Remaining Ships
        const remainingShips = targetShips.filter(s => s.hits < s.size).map(s => s.size);

        // 3. Generate Probability Heatmap
        const heatmap = Array(BOARD_SIZE).fill(0).map(() => Array(BOARD_SIZE).fill(0));

        // Strategy:
        // - If there are Active Hits, we prioritize placements that overlap them (Target Mode).
        // - If no Active Hits, we look for any valid placement (Hunt Mode).
        // Placements overlapping Active Hits get a massive weight bonus.

        remainingShips.forEach(size => {
            // Horizontal Scans
            for (let r = 0; r < BOARD_SIZE; r++) {
                for (let c = 0; c <= BOARD_SIZE - size; c++) {
                     this.processPlacement(r, c, size, true, targetBoard, sunkHits, activeHits, heatmap);
                }
            }
            // Vertical Scans
            for (let r = 0; r <= BOARD_SIZE - size; r++) {
                for (let c = 0; c < BOARD_SIZE; c++) {
                     this.processPlacement(r, c, size, false, targetBoard, sunkHits, activeHits, heatmap);
                }
            }
        });

        // 4. Select Best Target from Heatmap
        let maxScore = -1;
        let bestMoves = [];

        for(let r = 0; r < BOARD_SIZE; r++) {
            for(let c = 0; c < BOARD_SIZE; c++) {
                // Determine if cell is a valid target (Unknown)
                // STATUS.EMPTY (0) or STATUS.SHIP (1) are valid targets.
                // STATUS.MISS (2) or STATUS.HIT (3) are already revealed.
                const cell = targetBoard[r][c];
                if (cell !== STATUS.MISS && cell !== STATUS.HIT) {
                   if (heatmap[r][c] > maxScore) {
                       maxScore = heatmap[r][c];
                       bestMoves = [[r,c]];
                   } else if (heatmap[r][c] === maxScore) {
                       bestMoves.push([r,c]);
                   }
                }
            }
        }

        if (bestMoves.length === 0) {
            // Should rare/impossible if game is not over
            return this.randomAvailable(targetBoard);
        }

        // Randomly pick one of the best moves (break ties)
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    updateComputerPredictionAfterHit(r, c, resultStatus) {
        if (resultStatus === 'hit') {
            // Check adjacent cells to determine if we have established an orientation
            const isHorizontal = (c > 0 && this.playerBoard[r][c - 1] === STATUS.HIT) ||
                                 (c < BOARD_SIZE - 1 && this.playerBoard[r][c + 1] === STATUS.HIT);
            const isVertical = (r > 0 && this.playerBoard[r - 1][c] === STATUS.HIT) ||
                               (r < BOARD_SIZE - 1 && this.playerBoard[r + 1][c] === STATUS.HIT);

            let neighbors;

            // If direction is known, only hunt along that axis. Otherwise, hunt all directions.
            if (isHorizontal) {
                neighbors = [[r, c - 1], [r, c + 1]];
            } else if (isVertical) {
                neighbors = [[r - 1, c], [r + 1, c]];
            } else {
                neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
            }

            for (let i = neighbors.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
            }
            neighbors.forEach(([nr, nc]) => {
                if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
                    const cell = this.playerBoard[nr][nc];
                    if (cell !== STATUS.HIT && cell !== STATUS.MISS) this.computerHitStack.push([nr, nc]);
                }
            });
        }
    }

    processPlacement(r, c, size, horizontal, board, sunkHits, activeHits, heatmap) {
        let coords = [];
        let hitOverlapCount = 0;

        for (let i = 0; i < size; i++) {
            const cr = horizontal ? r : r + i;
            const cc = horizontal ? c + i : c;

            // Invalid placement if it covers a 'MISS' or a 'SUNK HIT'
            if (board[cr][cc] === STATUS.MISS) return;
            if (sunkHits.has(`${cr},${cc}`)) return;

            // Check Hit Overlap (Un-sunk hits)
            if (board[cr][cc] === STATUS.HIT) {
                hitOverlapCount++;
            }
            coords.push([cr, cc]);
        }

        // Weight Calculation
        let weight = 1;

        // Adaptation: If we have active hits, heavily bias towards placements that explain them.
        if (activeHits.length > 0) {
             if (hitOverlapCount > 0) {
                 // Massive spike for explaining hits.
                 // The more hits covered, the more likely this placement is the "truth".
                 weight = 1000 + (hitOverlapCount * 100);
             } else {
                 // Placements that don't explain the current hits are possible (other ships),
                 // but significantly less likely to be the immediate target logic.
                 weight = 1;
             }
        }

        // Add weight to all VALID TARGET cells in this placement
        // (We don't fire at cells that are already HIT)
        coords.forEach(([cr, cc]) => {
            if (board[cr][cc] !== STATUS.HIT) {
                heatmap[cr][cc] += weight;
            }
        });
    }

    randomAvailable(targetBoard) {
        let available = [];
        for(let r=0; r<BOARD_SIZE; r++) {
            for(let c=0; c<BOARD_SIZE; c++) {
                if (targetBoard[r][c] === STATUS.EMPTY || targetBoard[r][c] === STATUS.SHIP) {
                    available.push([r, c]);
                }
            }
        }
        if (available.length === 0) return [0,0];
        return available[Math.floor(Math.random() * available.length)];
    }


}
