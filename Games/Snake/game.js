class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 20;
        this.tileCount = this.canvas.width / this.gridSize;

        // Game state
        this.gameRunning = false;
        this.gamePaused = false;
        this.gameLoop = null;

        // Snake initial state
        this.snake = [
            {x: 10, y: 10}
        ];
        this.dx = 0;
        this.dy = 0;

        // Food position
        this.food = {x: 15, y: 15};

        // Score
        this.score = 0;
        this.scoreKey = 'snakeHighScore';
        this.highScore = 0;
        try {
            const saved = Number(localStorage.getItem(this.scoreKey));
            if (Number.isSafeInteger(saved) && saved >= 0) this.highScore = saved;
        } catch { /* The current game still works without browser storage. */ }
        this.turns = [];

        this.initializeGame();
        this.setupEventListeners();
        this.updateScoreDisplay();
    }

    initializeGame() {
        this.drawGame();
    }

    setupEventListeners() {
        const keys = {ArrowUp:'up', w:'up', ArrowDown:'down', s:'down',
            ArrowLeft:'left', a:'left', ArrowRight:'right', d:'right'};
        document.addEventListener('keydown', event => {
            if (!this.gameRunning) return;
            if (event.code === 'KeyP' && !event.repeat) {
                event.preventDefault();
                this.togglePause();
                return;
            }
            const direction = keys[event.key] || keys[event.key.toLowerCase()];
            if (direction && !this.gamePaused) {
                event.preventDefault();
                this.turn(direction);
            }
        });
        document.querySelectorAll('.control-btn').forEach(button => {
            button.addEventListener('click', () => this.turn(button.dataset.direction));
        });
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.gameRunning && !this.gamePaused) this.togglePause();
        });

        // Game control buttons
        document.getElementById('start-btn').addEventListener('click', () => {
            this.startGame();
        });

        document.getElementById('pause-btn').addEventListener('click', () => {
            this.togglePause();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.restartGame();
        });
    }

    turn(direction) {
        if (!this.gameRunning || this.gamePaused || this.turns.length >= 2) return;
        const next = SnakeGame.directions[direction];
        if (!next) return;
        const last = this.turns.at(-1);
        const dx = last ? last[0] : this.dx;
        const dy = last ? last[1] : this.dy;
        if ((next[0] && dx) || (next[1] && dy)) return;
        this.turns.push(next);
    }

    startGame() {
        if (this.gameRunning) return;

        this.gameRunning = true;
        this.gamePaused = false;

        // Set initial movement direction (right)
        if (this.dx === 0 && this.dy === 0) {
            this.dx = 1;
            this.dy = 0;
        }

        this.gameLoop = setInterval(() => {
            this.update();
            this.drawGame();
        }, 150);

        document.getElementById('start-btn').textContent = 'Playing...';
        document.getElementById('start-btn').disabled = true;
    }

    togglePause() {
        if (!this.gameRunning) return;

        this.gamePaused = !this.gamePaused;

        if (this.gamePaused) {
            clearInterval(this.gameLoop);
            document.getElementById('pause-btn').textContent = 'Resume';
            this.drawGame();
        } else {
            this.gameLoop = setInterval(() => {
                this.update();
                this.drawGame();
            }, 150);
            document.getElementById('pause-btn').textContent = 'Pause';
        }
    }

    update() {
        if (this.gamePaused) return;

        // If snake hasn't started moving, don't update
        if (this.dx === 0 && this.dy === 0) return;

        const next = this.turns.shift();
        if (next) [this.dx, this.dy] = next;
        // Move snake head
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};

        // Check collision
        if (this.checkCollision(head)) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // Check if food is eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            this.updateScoreDisplay();
            this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    checkCollision(head) {
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return true;
        }

        // Check self collision
        const eats = head.x === this.food.x && head.y === this.food.y;
        // The tail departs this tick unless the snake is eating.
        for (let i = 0; i < this.snake.length - (eats ? 0 : 1); i++) {
            const segment = this.snake[i];
            if (head.x === segment.x && head.y === segment.y) {
                return true;
            }
        }

        return false;
    }

    generateFood() {
        const occupied = new Set(this.snake.map(part => part.y * this.tileCount + part.x));
        const free = this.tileCount * this.tileCount - occupied.size;
        if (!free) {
            document.querySelector('#game-over h2').textContent = 'Board complete!';
            this.gameOver();
            return;
        }
        let choice = Math.floor(Math.random() * free);
        for (let cell = 0; cell < this.tileCount * this.tileCount; cell++) {
            if (occupied.has(cell)) continue;
            if (choice-- === 0) {
                this.food = {x: cell % this.tileCount, y: Math.floor(cell / this.tileCount)};
                return;
            }
        }
    }

    drawGame() {
        // Clear canvas
        this.ctx.fillStyle = '#1a202c';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw snake
        this.drawSnake();

        // Draw food
        this.drawFood();

        // If game is paused, show pause message
        if (this.gamePaused) {
            this.drawPauseScreen();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = '#2d3748';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.tileCount; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.gridSize, 0);
            this.ctx.lineTo(i * this.gridSize, this.canvas.height);
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.gridSize);
            this.ctx.lineTo(this.canvas.width, i * this.gridSize);
            this.ctx.stroke();
        }
    }

    drawSnake() {
        this.snake.forEach((segment, index) => {
            if (index === 0) {
                // Snake head
                this.ctx.fillStyle = '#38a169';
            } else {
                // Snake body
                this.ctx.fillStyle = '#48bb78';
            }

            this.ctx.fillRect(
                segment.x * this.gridSize + 1,
                segment.y * this.gridSize + 1,
                this.gridSize - 2,
                this.gridSize - 2
            );

            // Add rounded corners
            this.ctx.beginPath();
            this.ctx.roundRect(
                segment.x * this.gridSize + 2,
                segment.y * this.gridSize + 2,
                this.gridSize - 4,
                this.gridSize - 4,
                3
            );
            this.ctx.fill();
        });
    }

    drawFood() {
        this.ctx.fillStyle = '#e53e3e';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize / 2,
            this.food.y * this.gridSize + this.gridSize / 2,
            this.gridSize / 2 - 2,
            0,
            2 * Math.PI
        );
        this.ctx.fill();
    }

    drawPauseScreen() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
    }

    gameOver() {
        this.gameRunning = false;
        clearInterval(this.gameLoop);

        // Update high score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            try { localStorage.setItem(this.scoreKey, String(this.highScore)); } catch { /* Keep the session score. */ }
            this.updateScoreDisplay();
        }

        // Show game over screen
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').classList.remove('hidden');
    }

    restartGame() {
        // Reset game state
        this.gameRunning = false;
        this.gamePaused = false;
        clearInterval(this.gameLoop);

        this.turns.length = 0;
        // Reset snake
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;

        // Reset score
        this.score = 0;
        this.updateScoreDisplay();

        // Generate new food
        this.generateFood();

        document.querySelector('#game-over h2').textContent = 'Game Over!';
        // Hide game over screen
        document.getElementById('game-over').classList.add('hidden');

        // Reset button states
        document.getElementById('start-btn').textContent = 'Start Game';
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').textContent = 'Pause';

        // Redraw game
        this.drawGame();
    }

    updateScoreDisplay() {
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('high-score').textContent = this.highScore;
    }
}

// Add rounded rectangle support (if browser doesn't support it)
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

SnakeGame.directions = {up:[0,-1], down:[0,1], left:[-1,0], right:[1,0]};

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
