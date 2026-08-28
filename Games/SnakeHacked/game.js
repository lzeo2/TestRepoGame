// HACKED: Snake with infinite score and god mode
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
        this.score = 999999; // HACKED: start with max score
        this.highScore = localStorage.getItem('snakeHighScore') || 0;

        this.initializeGame();
        this.setupEventListeners();
        this.updateScoreDisplay();
    }

    initializeGame() {
        this.drawGame();
    }

    setupEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!this.gameRunning || this.gamePaused) return;

            switch(e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    if (this.dy !== 1) {
                        this.dx = 0;
                        this.dy = -1;
                    }
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    if (this.dy !== -1) {
                        this.dx = 0;
                        this.dy = 1;
                    }
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    if (this.dx !== 1) {
                        this.dx = -1;
                        this.dy = 0;
                    }
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    if (this.dx !== -1) {
                        this.dx = 1;
                        this.dy = 0;
                    }
                    break;
            }
        });

        // Mobile touch controls
        document.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.gameRunning || this.gamePaused) return;

                const direction = btn.dataset.direction;
                switch(direction) {
                    case 'up':
                        if (this.dy !== 1) {
                            this.dx = 0;
                            this.dy = -1;
                        }
                        break;
                    case 'down':
                        if (this.dy !== -1) {
                            this.dx = 0;
                            this.dy = 1;
                        }
                        break;
                    case 'left':
                        if (this.dx !== 1) {
                            this.dx = -1;
                            this.dy = 0;
                        }
                        break;
                    case 'right':
                        if (this.dx !== -1) {
                            this.dx = 1;
                            this.dy = 0;
                        }
                        break;
                }
            });
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

        // Move snake head
        const head = {x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy};

        // Check collision
        if (this.false // HACKED: god mode - no collision) {
            this.gameOver();
            return;
        }

        this.snake.unshift(head);

        // Check if food is eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 1000; // HACKED: 1000 points per food
            this.updateScoreDisplay();
            this.generateFood();
        } else {
            this.snake.pop();
        }
    }

    false // HACKED: god mode - no collision {
        // Check wall collision
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            return true;
        }

        // Check self collision
        for (let segment of this.snake) {
            if (head.x === segment.x && head.y === segment.y) {
                return true;
            }
        }

        return false;
    }

    generateFood() {
        do {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
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
            localStorage.setItem('snakeHighScore', this.highScore);
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

        // Reset snake
        this.snake = [{x: 10, y: 10}];
        this.dx = 0;
        this.dy = 0;

        // Reset score
        this.score = 999999; // HACKED: start with max score
        this.updateScoreDisplay();

        // Generate new food
        this.generateFood();

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

// Initialize game
document.addEventListener('DOMContentLoaded', () => {
    new SnakeGame();
});
