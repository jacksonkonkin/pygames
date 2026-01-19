// Pong Game - JavaScript/Canvas Version
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');

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
let ballSpeedX = 4;
let ballSpeedY = 4;
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
    if (mode === 'twoPlayer') {
        aiEnabled = false;
        startCountdown();
    } else if (mode === 'ai') {
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
    overlayTitle.textContent = 'Classic Arcade Game';
    overlayText.innerHTML = 'Press 1 for Two Player<br>Press 2 for vs AI';
    overlay.style.display = 'flex';
    overlay.innerHTML = `
        <h1>PONG</h1>
        <h2>Classic Arcade Game</h2>
        <p>Press 1 for Two Player<br>Press 2 for vs AI</p>
        <p>W/S - Left Paddle | Arrow Keys - Right Paddle</p>
        <button class="button" onclick="startGame('twoPlayer')">1 - Two Player</button>
        <button class="button" onclick="startGame('ai')">2 - vs AI</button>
    `;
}

function showAIDifficultyMenu() {
    overlay.style.display = 'flex';
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
    overlay.style.display = 'none';
}

function resetGame() {
    ballX = WINDOW_WIDTH / 2;
    ballY = WINDOW_HEIGHT / 2;
    prevBallX = WINDOW_WIDTH / 2;
    prevBallY = WINDOW_HEIGHT / 2;
    ballSpeedX = 4;
    ballSpeedY = 4;
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
    // Left paddle collision
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
    
    // Right paddle collision
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
    
    // Edge collision with paddles (top/bottom edges)
    // Left paddle edges
    if (ballX >= leftPaddleX && ballX <= leftPaddleX + paddleWidth && ballSpeedX < 0) {
        // Top edge
        if (prevBallY + ballRadius < leftPaddleY && ballY + ballRadius >= leftPaddleY && ballSpeedY > 0) {
            ballY = leftPaddleY - ballRadius;
            ballSpeedY = -ballSpeedY;
            ballSpeedX = -ballSpeedX;
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
        // Bottom edge
        if (prevBallY - ballRadius > leftPaddleY + paddleHeight && ballY - ballRadius <= leftPaddleY + paddleHeight && ballSpeedY < 0) {
            ballY = leftPaddleY + paddleHeight + ballRadius;
            ballSpeedY = -ballSpeedY;
            ballSpeedX = -ballSpeedX;
            leftPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Right paddle edges
    if (ballX >= rightPaddleX && ballX <= rightPaddleX + paddleWidth && ballSpeedX > 0) {
        // Top edge
        if (prevBallY + ballRadius < rightPaddleY && ballY + ballRadius >= rightPaddleY && ballSpeedY > 0) {
            ballY = rightPaddleY - ballRadius;
            ballSpeedY = -ballSpeedY;
            ballSpeedX = -ballSpeedX;
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
        // Bottom edge
        if (prevBallY - ballRadius > rightPaddleY + paddleHeight && ballY - ballRadius <= rightPaddleY + paddleHeight && ballSpeedY < 0) {
            ballY = rightPaddleY + paddleHeight + ballRadius;
            ballSpeedY = -ballSpeedY;
            ballSpeedX = -ballSpeedX;
            rightPaddleFlash = 10;
            createHitParticles(ballX, ballY, NEON_CYAN);
            playPaddleHit();
        }
    }
    
    // Score left
    if (ballX + ballRadius > WINDOW_WIDTH) {
        ballX = WINDOW_WIDTH / 2;
        ballY = WINDOW_HEIGHT / 2;
        prevBallX = WINDOW_WIDTH / 2;
        prevBallY = WINDOW_HEIGHT / 2;
        ballSpeedX = 4;
        ballSpeedY = 4;
        ballSpeedMultiplier = 1.0;
        leftScore++;
        playScore();
        
        goalTextTimer = FPS;
        goalScorer = 'LEFT';
        
        if (leftScore >= WINNING_SCORE) {
            gameState = 'game_over';
            winner = 'LEFT';
            showGameOver();
        }
    }
    
    // Score right
    if (ballX - ballRadius < 0) {
        ballX = WINDOW_WIDTH / 2;
        ballY = WINDOW_HEIGHT / 2;
        prevBallX = WINDOW_WIDTH / 2;
        prevBallY = WINDOW_HEIGHT / 2;
        ballSpeedX = -4;
        ballSpeedY = 4;
        ballSpeedMultiplier = 1.0;
        rightScore++;
        playScore();
        
        goalTextTimer = FPS;
        goalScorer = 'RIGHT';
        
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

// Initialize
showMenu();
gameLoop(0);
