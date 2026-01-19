// Pong Game - JavaScript/Canvas Version
let canvas, ctx, overlay, overlayTitle, overlayText;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Pong');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('overlay');
    overlayTitle = document.getElementById('overlayTitle');
    overlayText = document.getElementById('overlayText');
    
    if (!canvas || !ctx || !overlay) {
        console.error('Failed to find required DOM elements!', {canvas, ctx, overlay});
        return;
    }
    
    console.log('DOM elements found, setting up event listeners');
    
    // Use event delegation for buttons - attach to document to catch all clicks
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.button');
        if (button) {
            console.log('Button clicked!', button.dataset.action, button);
            const action = button.dataset.action;
            if (action === 'twoPlayer') {
                console.log('Starting two player game');
                startGame('twoPlayer');
            } else if (action === 'ai') {
                console.log('Starting AI game');
                startGame('ai');
            }
        }
    });
    
    // Initialize game
    console.log('Showing menu');
    showMenu();
    console.log('Starting game loop');
    gameLoop(0);
});

// Constants
const WINDOW_WIDTH = 1000;
const WINDOW_HEIGHT = 600;
const FPS = 120; // Match pygame version
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const YELLOW = '#FFFF00';
const WINNING_SCORE = 7;

// Game state
let gameState = 'menu'; // menu, ai_difficulty, countdown, playing, paused, game_over
let aiEnabled = false;
let aiDifficulty = 'medium';
let aiSpeed = 5;

// Ball
let ballX = WINDOW_WIDTH / 2;
let ballY = WINDOW_HEIGHT / 2;
let prevBallX = WINDOW_WIDTH / 2;
let prevBallY = WINDOW_HEIGHT / 2;
let ballSpeedX = 2.5;
let ballSpeedY = 2.5;
let ballSpeedMultiplier = 1.0;
const ballRadius = 15;

// Visual Effects
let ballTrail = [];
const MAX_TRAIL = 15;
let particles = [];

// Colors
const NEON_CYAN = '#00f3ff';
const NEON_MAGENTA = '#ff00ff';
const NEON_YELLOW = '#ffff00';

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 4 + 2;
        this.speedX = (Math.random() - 0.5) * 8;
        this.speedY = (Math.random() - 0.5) * 8;
        this.life = 1.0;
        this.decay = Math.random() * 0.05 + 0.02;
    }

    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay;
    }

    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }
}

function createHitParticles(x, y, color) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Paddles
let leftPaddleX = 50;
let leftPaddleY = WINDOW_HEIGHT / 2 - 40;
let rightPaddleX = WINDOW_WIDTH - 50;
let rightPaddleY = WINDOW_HEIGHT / 2 - 40;
const paddleSpeed = 5;
const paddleWidth = 10;
const paddleHeight = 80;

// Scores
let leftScore = 0;
let rightScore = 0;
let winner = null;

// Countdown
let countdown = 3;
let countdownTimer = 0;

// Goal text
let goalTextTimer = 0;
let goalScorer = null;

// Round start timer (pause after scoring)
let roundStartTimer = 0;

// Flash timers
let leftPaddleFlash = 0;
let rightPaddleFlash = 0;

// Keys
const keys = {};

// Sounds (using Web Audio API)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, duration, volume = 0.3) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playPaddleHit() {
    playBeep(800, 0.1, 0.4);
}

function playWallBounce() {
    playBeep(400, 0.08, 0.3);
}

function playScore() {
    playBeep(600, 0.15, 0.4);
    setTimeout(() => playBeep(800, 0.15, 0.4), 150);
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
    
    if (gameState === 'menu') {
        if (e.key === '1') {
            aiEnabled = false;
            startCountdown();
        } else if (e.key === '2') {
            gameState = 'ai_difficulty';
            showAIDifficultyMenu();
        }
    } else if (gameState === 'ai_difficulty') {
        if (e.key === '1') {
            aiDifficulty = 'easy';
            aiSpeed = 4;
            aiEnabled = true;
            startCountdown();
        } else if (e.key === '2') {
            aiDifficulty = 'medium';
            aiSpeed = 5;
            aiEnabled = true;
            startCountdown();
        } else if (e.key === '3') {
            aiDifficulty = 'hard';
            aiSpeed = 6;
            aiEnabled = true;
            startCountdown();
        } else if (e.key === 'Escape') {
            gameState = 'menu';
            showMenu();
        }
    } else if (gameState === 'playing') {
        if (e.key.toLowerCase() === 'a') {
            aiEnabled = !aiEnabled;
        } else if (e.key.toLowerCase() === 'p') {
            gameState = 'paused';
            showPaused();
        } else if (e.key === 'Escape') {
            gameState = 'menu';
            resetGame();
            showMenu();
        }
    } else if (gameState === 'paused') {
        if (e.key.toLowerCase() === 'p' || e.key === ' ') {
            gameState = 'playing';
            hideOverlay();
        } else if (e.key === 'Escape') {
            gameState = 'menu';
            resetGame();
            showMenu();
        }
    } else if (gameState === 'game_over') {
        if (e.key === ' ') {
            resetGame();
            gameState = 'menu';
            showMenu();
        }
    } else if (gameState === 'countdown') {
        // Can't skip countdown
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

function startGame(mode) {
    console.log('startGame called with mode:', mode);
    if (mode === 'twoPlayer') {
        console.log('Starting two player mode');
        aiEnabled = false;
        startCountdown();
    } else if (mode === 'ai') {
        console.log('Starting AI difficulty selection');
        gameState = 'ai_difficulty';
        showAIDifficultyMenu();
    }
}

function startCountdown() {
    gameState = 'countdown';
    countdown = 3;
    countdownTimer = 0;
    hideOverlay();
}

function showMenu() {
    if (!overlay) {
        console.error('showMenu: overlay not found!');
        return;
    }
    console.log('showMenu: Setting up menu');
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto'; // Enable pointer events for overlay
    overlay.innerHTML = `
        <h1>PONG</h1>
        <h2>Classic Arcade Game</h2>
        <p>Press 1 for Two Player<br>Press 2 for vs AI</p>
        <p>W/S - Left Paddle | Arrow Keys - Right Paddle</p>
        <button class="button" data-action="twoPlayer" onclick="window.startGame('twoPlayer')">1 - Two Player</button>
        <button class="button" data-action="ai" onclick="window.startGame('ai')">2 - vs AI</button>
    `;
    console.log('showMenu: Menu HTML set, buttons should be clickable');
    
    // Also attach event listeners directly as backup
    setTimeout(() => {
        const buttons = overlay.querySelectorAll('.button');
        console.log('Found buttons:', buttons.length);
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Direct click handler fired!', btn.dataset.action);
                const action = btn.dataset.action;
                if (action === 'twoPlayer') {
                    startGame('twoPlayer');
                } else if (action === 'ai') {
                    startGame('ai');
                }
            });
        });
    }, 100);
}

function showAIDifficultyMenu() {
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
    overlay.innerHTML = `
        <h1>Select AI Difficulty</h1>
        <h2>1 - Easy</h2>
        <p>(AI Speed: 4 - Slower reactions)</p>
        <h2>2 - Medium</h2>
        <p>(AI Speed: 5 - Balanced)</p>
        <h2>3 - Hard</h2>
        <p>(AI Speed: 6 - Fast reactions)</p>
        <p>Press ESC to go back</p>
    `;
}

function showPaused() {
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h1>PAUSED</h1>
        <p>Press P or SPACE to resume</p>
        <p>Press ESC for menu</p>
    `;
}

function hideOverlay() {
    if (overlay) {
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'none';
        console.log('Overlay hidden');
    }
}

function resetGame() {
    ballX = WINDOW_WIDTH / 2;
    ballY = WINDOW_HEIGHT / 2;
    prevBallX = WINDOW_WIDTH / 2;
    prevBallY = WINDOW_HEIGHT / 2;
    ballSpeedX = 2.5;
    ballSpeedY = 2.5;
    ballSpeedMultiplier = 1.0;
    leftPaddleY = WINDOW_HEIGHT / 2 - 40;
    rightPaddleY = WINDOW_HEIGHT / 2 - 40;
    leftScore = 0;
    rightScore = 0;
    winner = null;
    leftPaddleFlash = 0;
    rightPaddleFlash = 0;
    countdown = 3;
    countdownTimer = 0;
    goalTextTimer = 0;
    goalScorer = null;
    roundStartTimer = 0;
}

function update() {
    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (gameState === 'countdown') {
        countdownTimer++;
        if (countdownTimer >= FPS) {
            countdownTimer = 0;
            countdown--;
            if (countdown === 0) {
                gameState = 'playing';
            }
        }
        return;
    }
    
    if (goalTextTimer > 0) {
        goalTextTimer--;
        if (goalTextTimer === 0) {
            goalScorer = null;
        }
    }
    
    // Handle round start pause after scoring
    if (roundStartTimer > 0) {
        roundStartTimer--;
        if (roundStartTimer === 0) {
            // Reset ball position and speed after pause
            ballX = WINDOW_WIDTH / 2;
            ballY = WINDOW_HEIGHT / 2;
            prevBallX = WINDOW_WIDTH / 2;
            prevBallY = WINDOW_HEIGHT / 2;
            // Determine direction based on who scored last
            ballSpeedX = goalScorer === 'LEFT' ? 2.5 : -2.5;
            ballSpeedY = 2.5;
            ballSpeedMultiplier = 1.0;
        }
        // Don't update game during pause
        return;
    }
    
    if (gameState !== 'playing') {
        return;
    }
    
    // Left paddle movement
    if (keys['w'] && leftPaddleY > 0) {
        leftPaddleY -= paddleSpeed;
    }
    if (keys['s'] && leftPaddleY < WINDOW_HEIGHT - paddleHeight) {
        leftPaddleY += paddleSpeed;
    }
    
    // Right paddle movement (AI or player)
    if (aiEnabled) {
        const paddleCenter = rightPaddleY + paddleHeight / 2;
        // Improved AI: smaller deadzone and predict ball position
        const ballTargetY = ballSpeedX > 0 ? ballY + (rightPaddleX - ballX) / ballSpeedX * ballSpeedY : ballY;
        const deadzone = 5; // Smaller deadzone for better responsiveness
        
        if (ballTargetY < paddleCenter - deadzone && rightPaddleY > 0) {
            rightPaddleY -= aiSpeed;
        } else if (ballTargetY > paddleCenter + deadzone && rightPaddleY < WINDOW_HEIGHT - paddleHeight) {
            rightPaddleY += aiSpeed;
        }
    } else {
        if (keys['ArrowUp'] && rightPaddleY > 0) {
            rightPaddleY -= paddleSpeed;
        }
        if (keys['ArrowDown'] && rightPaddleY < WINDOW_HEIGHT - paddleHeight) {
            rightPaddleY += paddleSpeed;
        }
    }
    
    // Store previous position for collision detection
    prevBallX = ballX;
    prevBallY = ballY;
    
    // Update trail
    ballTrail.push({x: ballX, y: ballY});
    if (ballTrail.length > MAX_TRAIL) ballTrail.shift();
    
    // Ball movement
    const speedMultiplier = ballSpeedMultiplier;
    ballX += ballSpeedX * speedMultiplier;
    ballY += ballSpeedY * speedMultiplier;
    
    // Improved collision detection - check if ball crossed paddle boundary
    // Left paddle collision (side)
    if (ballSpeedX < 0 && prevBallX - ballRadius > leftPaddleX + paddleWidth && 
        ballX - ballRadius <= leftPaddleX + paddleWidth) {
        // Ball crossed the left paddle's right edge
        if (ballY + ballRadius > leftPaddleY && ballY - ballRadius < leftPaddleY + paddleHeight) {
            // Correct ball position to prevent phasing
            ballX = leftPaddleX + paddleWidth + ballRadius;
            ballSpeedX = -ballSpeedX;
            
            const paddleCenter = leftPaddleY + paddleHeight / 2;
            const hitPosition = ballY - paddleCenter;
            const angleAdjustment = hitPosition / (paddleHeight / 2) * 2;
            ballSpeedY += angleAdjustment;
            
            if (ballSpeedMultiplier < 2.0) {
                ballSpeedMultiplier += 0.05;
            }
            
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Right paddle collision (side)
    if (ballSpeedX > 0 && prevBallX + ballRadius < rightPaddleX && 
        ballX + ballRadius >= rightPaddleX) {
        // Ball crossed the right paddle's left edge
        if (ballY + ballRadius > rightPaddleY && ballY - ballRadius < rightPaddleY + paddleHeight) {
            // Correct ball position to prevent phasing
            ballX = rightPaddleX - ballRadius;
            ballSpeedX = -ballSpeedX;
            
            const paddleCenter = rightPaddleY + paddleHeight / 2;
            const hitPosition = ballY - paddleCenter;
            const angleAdjustment = hitPosition / (paddleHeight / 2) * 2;
            ballSpeedY += angleAdjustment;
            
            if (ballSpeedMultiplier < 2.0) {
                ballSpeedMultiplier += 0.05;
            }
            
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Additional check for ball phasing through paddle sides (backup detection)
    // Left paddle - check if ball is inside paddle bounds
    if (ballX - ballRadius < leftPaddleX + paddleWidth && ballX + ballRadius > leftPaddleX &&
        ballY + ballRadius > leftPaddleY && ballY - ballRadius < leftPaddleY + paddleHeight) {
        // Ball is intersecting with left paddle
        if (ballSpeedX < 0) {
            // Ball moving left, push it out to the right
            ballX = leftPaddleX + paddleWidth + ballRadius;
            ballSpeedX = -ballSpeedX;
            
            const paddleCenter = leftPaddleY + paddleHeight / 2;
            const hitPosition = ballY - paddleCenter;
            const angleAdjustment = hitPosition / (paddleHeight / 2) * 2;
            ballSpeedY += angleAdjustment;
            
            if (ballSpeedMultiplier < 2.0) {
                ballSpeedMultiplier += 0.05;
            }
            
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Right paddle - check if ball is inside paddle bounds
    if (ballX + ballRadius > rightPaddleX && ballX - ballRadius < rightPaddleX + paddleWidth &&
        ballY + ballRadius > rightPaddleY && ballY - ballRadius < rightPaddleY + paddleHeight) {
        // Ball is intersecting with right paddle
        if (ballSpeedX > 0) {
            // Ball moving right, push it out to the left
            ballX = rightPaddleX - ballRadius;
            ballSpeedX = -ballSpeedX;
            
            const paddleCenter = rightPaddleY + paddleHeight / 2;
            const hitPosition = ballY - paddleCenter;
            const angleAdjustment = hitPosition / (paddleHeight / 2) * 2;
            ballSpeedY += angleAdjustment;
            
            if (ballSpeedMultiplier < 2.0) {
                ballSpeedMultiplier += 0.05;
            }
            
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Top/bottom wall bounce
    if (ballY - ballRadius <= 0) {
        ballY = ballRadius; // Correct position
        ballSpeedY = -ballSpeedY;
        createHitParticles(ballX, ballY, WHITE);
        playWallBounce();
    }
    if (ballY + ballRadius >= WINDOW_HEIGHT) {
        ballY = WINDOW_HEIGHT - ballRadius; // Correct position
        ballSpeedY = -ballSpeedY;
        createHitParticles(ballX, ballY, WHITE);
        playWallBounce();
    }
    
    // Edge collision with paddles (top/bottom edges) - comprehensive detection
    // Left paddle top edge - check all movement directions
    if (ballX + ballRadius > leftPaddleX && ballX - ballRadius < leftPaddleX + paddleWidth) {
        // Ball is horizontally aligned with left paddle
        // Top edge collision - ball moving down into paddle top
        if (prevBallY + ballRadius < leftPaddleY && ballY + ballRadius >= leftPaddleY) {
            ballY = leftPaddleY - ballRadius;
            ballSpeedY = -ballSpeedY;
            // Also reverse X direction if ball is moving toward paddle
            if (ballSpeedX < 0) {
                ballSpeedX = -ballSpeedX;
            }
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
        // Bottom edge collision - ball moving up into paddle bottom
        else if (prevBallY - ballRadius > leftPaddleY + paddleHeight && ballY - ballRadius <= leftPaddleY + paddleHeight) {
            ballY = leftPaddleY + paddleHeight + ballRadius;
            ballSpeedY = -ballSpeedY;
            // Also reverse X direction if ball is moving toward paddle
            if (ballSpeedX < 0) {
                ballSpeedX = -ballSpeedX;
            }
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Right paddle top edge - check all movement directions
    if (ballX + ballRadius > rightPaddleX && ballX - ballRadius < rightPaddleX + paddleWidth) {
        // Ball is horizontally aligned with right paddle
        // Top edge collision - ball moving down into paddle top
        if (prevBallY + ballRadius < rightPaddleY && ballY + ballRadius >= rightPaddleY) {
            ballY = rightPaddleY - ballRadius;
            ballSpeedY = -ballSpeedY;
            // Also reverse X direction if ball is moving toward paddle
            if (ballSpeedX > 0) {
                ballSpeedX = -ballSpeedX;
            }
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
        // Bottom edge collision - ball moving up into paddle bottom
        else if (prevBallY - ballRadius > rightPaddleY + paddleHeight && ballY - ballRadius <= rightPaddleY + paddleHeight) {
            ballY = rightPaddleY + paddleHeight + ballRadius;
            ballSpeedY = -ballSpeedY;
            // Also reverse X direction if ball is moving toward paddle
            if (ballSpeedX > 0) {
                ballSpeedX = -ballSpeedX;
            }
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Additional check for corner collisions (ball hitting paddle corners)
    // Left paddle corners
    const leftPaddleTopX = leftPaddleX + paddleWidth;
    const leftPaddleTopY = leftPaddleY;
    const leftPaddleBottomY = leftPaddleY + paddleHeight;
    const distToLeftTop = Math.sqrt((ballX - leftPaddleTopX) ** 2 + (ballY - leftPaddleTopY) ** 2);
    const distToLeftBottom = Math.sqrt((ballX - leftPaddleTopX) ** 2 + (ballY - leftPaddleBottomY) ** 2);
    
    if (distToLeftTop < ballRadius && ballSpeedX < 0) {
        // Hit top corner
        const angle = Math.atan2(ballY - leftPaddleTopY, ballX - leftPaddleTopX);
        ballSpeedX = Math.abs(ballSpeedX) * Math.cos(angle);
        ballSpeedY = Math.abs(ballSpeedY) * Math.sin(angle);
        ballX = leftPaddleTopX + ballRadius * Math.cos(angle);
        ballY = leftPaddleTopY + ballRadius * Math.sin(angle);
        leftPaddleFlash = 10;
        createHitParticles(ballX, ballY, NEON_CYAN);
        playPaddleHit();
    } else if (distToLeftBottom < ballRadius && ballSpeedX < 0) {
        // Hit bottom corner
        const angle = Math.atan2(ballY - leftPaddleBottomY, ballX - leftPaddleTopX);
        ballSpeedX = Math.abs(ballSpeedX) * Math.cos(angle);
        ballSpeedY = Math.abs(ballSpeedY) * Math.sin(angle);
        ballX = leftPaddleTopX + ballRadius * Math.cos(angle);
        ballY = leftPaddleBottomY + ballRadius * Math.sin(angle);
        leftPaddleFlash = 10;
        createHitParticles(ballX, ballY, NEON_CYAN);
        playPaddleHit();
    }
    
    // Right paddle corners
    const rightPaddleTopY = rightPaddleY;
    const rightPaddleBottomY = rightPaddleY + paddleHeight;
    const distToRightTop = Math.sqrt((ballX - rightPaddleX) ** 2 + (ballY - rightPaddleTopY) ** 2);
    const distToRightBottom = Math.sqrt((ballX - rightPaddleX) ** 2 + (ballY - rightPaddleBottomY) ** 2);
    
    if (distToRightTop < ballRadius && ballSpeedX > 0) {
        // Hit top corner
        const angle = Math.atan2(ballY - rightPaddleTopY, ballX - rightPaddleX);
        ballSpeedX = -Math.abs(ballSpeedX) * Math.cos(angle);
        ballSpeedY = Math.abs(ballSpeedY) * Math.sin(angle);
        ballX = rightPaddleX - ballRadius * Math.cos(angle);
        ballY = rightPaddleTopY + ballRadius * Math.sin(angle);
        rightPaddleFlash = 10;
        createHitParticles(ballX, ballY, NEON_CYAN);
        playPaddleHit();
    } else if (distToRightBottom < ballRadius && ballSpeedX > 0) {
        // Hit bottom corner
        const angle = Math.atan2(ballY - rightPaddleBottomY, ballX - rightPaddleX);
        ballSpeedX = -Math.abs(ballSpeedX) * Math.cos(angle);
        ballSpeedY = Math.abs(ballSpeedY) * Math.sin(angle);
        ballX = rightPaddleX - ballRadius * Math.cos(angle);
        ballY = rightPaddleBottomY + ballRadius * Math.sin(angle);
        rightPaddleFlash = 10;
        createHitParticles(ballX, ballY, NEON_CYAN);
        playPaddleHit();
    }
    
    // Score left
    if (ballX + ballRadius > WINDOW_WIDTH) {
        leftScore++;
        playScore();
        
        goalTextTimer = FPS;
        goalScorer = 'LEFT';
        roundStartTimer = FPS; // 1 second pause at 120 FPS
        
        if (leftScore >= WINNING_SCORE) {
            gameState = 'game_over';
            winner = 'LEFT';
            showGameOver();
        }
    }
    
    // Score right
    if (ballX - ballRadius < 0) {
        rightScore++;
        playScore();
        
        goalTextTimer = FPS;
        goalScorer = 'RIGHT';
        roundStartTimer = FPS; // 1 second pause at 120 FPS
        
        if (rightScore >= WINNING_SCORE) {
            gameState = 'game_over';
            winner = 'RIGHT';
            showGameOver();
        }
    }
    
    // Decrement flash timers
    if (leftPaddleFlash > 0) leftPaddleFlash--;
    if (rightPaddleFlash > 0) rightPaddleFlash--;
}

function showGameOver() {
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h1>${winner} PLAYER WINS!</h1>
        <p>Press SPACE to return to menu</p>
    `;
}

function render() {
    // Clear canvas
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    
    // Draw particles
    particles.forEach(p => p.draw(ctx));

    if (gameState === 'countdown') {
        renderGame();
        // Countdown overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
        ctx.fillStyle = YELLOW;
        ctx.font = '74px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(countdown > 0 ? countdown.toString() : 'GO!', WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2);
        return;
    }
    
    if (gameState === 'playing' || gameState === 'paused' || gameState === 'game_over') {
        renderGame();
        
        // Goal text
        if (goalTextTimer > 0 && goalScorer) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
            ctx.fillStyle = YELLOW;
            ctx.font = '74px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GOAL!', WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 50);
            ctx.font = '36px Arial';
            ctx.fillText(`${goalScorer} SCORES!`, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 20);
        }
    }
}

function renderGame() {
    // Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(WINDOW_WIDTH / 2, 0);
    ctx.lineTo(WINDOW_WIDTH / 2, WINDOW_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw ball trail
    ballTrail.forEach((pos, index) => {
        const alpha = (index + 1) / ballTrail.length;
        ctx.fillStyle = `rgba(0, 243, 255, ${alpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, ballRadius * (index + 1) / ballTrail.length, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw ball with glow
    ctx.fillStyle = WHITE;
    ctx.shadowBlur = 15;
    ctx.shadowColor = NEON_CYAN;
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Draw paddles with glow
    const leftColor = leftPaddleFlash > 0 ? NEON_YELLOW : NEON_CYAN;
    const rightColor = rightPaddleFlash > 0 ? NEON_YELLOW : NEON_CYAN;
    
    ctx.fillStyle = leftColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = leftColor;
    ctx.fillRect(leftPaddleX, leftPaddleY, paddleWidth, paddleHeight);
    
    ctx.fillStyle = rightColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = rightColor;
    ctx.fillRect(rightPaddleX, rightPaddleY, paddleWidth, paddleHeight);
    ctx.shadowBlur = 0;
    
    // Draw scores
    ctx.fillStyle = WHITE;
    ctx.font = '74px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(leftScore.toString(), WINDOW_WIDTH / 4, 100);
    ctx.fillText(rightScore.toString(), 3 * WINDOW_WIDTH / 4, 100);
    
    // Draw AI indicator
    ctx.font = '16px "Orbitron"';
    ctx.textAlign = 'center';
    if (aiEnabled) {
        ctx.fillStyle = NEON_MAGENTA;
        ctx.fillText(`AI: ${aiDifficulty.toUpperCase()} | [A] TOGGLE | [ESC] MENU`, WINDOW_WIDTH / 2, WINDOW_HEIGHT - 30);
    } else {
        ctx.fillStyle = WHITE;
        ctx.fillText('2-PLAYER | [A] AI | [ESC] MENU', WINDOW_WIDTH / 2, WINDOW_HEIGHT - 30);
    }
}

// Game loop - optimized for smooth 120 FPS
let lastTime = performance.now();
let accumulator = 0;
const frameTime = 1000 / FPS;

function gameLoop(currentTime) {
    // If fonts aren't loaded, don't start the loop to prevent errors
    if (!document.fonts.check('16px "Press Start 2P"')) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Cap deltaTime to prevent large jumps
    const clampedDelta = Math.min(deltaTime, 100);
    accumulator += clampedDelta;
    
    // Run multiple updates if needed to catch up
    while (accumulator >= frameTime) {
        update();
        accumulator -= frameTime;
    }
    
    // Always render for smooth visuals
    render();
    
    requestAnimationFrame(gameLoop);
}

// Make functions globally accessible for onclick handlers (fallback)
window.startGame = startGame;
