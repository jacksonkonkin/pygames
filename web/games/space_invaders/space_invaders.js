// Space Invaders Game - JavaScript/Canvas Version
let canvas, ctx, overlay;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Space Invaders');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('overlay');
    
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
            if (button.dataset.action === 'start') {
                console.log('Starting game');
                startGame();
            }
        }
    });
    
    // Initialize game
    console.log('Initializing game systems');
    initStars();
    initEnemies();
    initBarriers();
    console.log('Showing menu');
    showMenu();
    console.log('Starting game loop');
    gameLoop(0);
});

// Constants
const WINDOW_WIDTH = 800;
const WINDOW_HEIGHT = 600;
const FPS = 60;

// Colors
const BLACK = '#000000';
const WHITE = '#FFFFFF';
const GREEN = '#39ff14'; // Neon Green
const YELLOW = '#ffff00';
const RED = '#ff003c';   // Neon Red
const CYAN = '#00f3ff';   // Neon Cyan
const MAGENTA = '#ff00ff';

// Visual Effects
let stars = [];
let particles = [];
let screenFlicker = 0;

class Star {
    constructor(parallax) {
        this.x = Math.random() * WINDOW_WIDTH;
        this.y = Math.random() * WINDOW_HEIGHT;
        this.size = Math.random() * 2 + 1;
        this.speed = (Math.random() * 0.5 + 0.2) * parallax;
        this.parallax = parallax;
    }

    update() {
        this.y += this.speed;
        if (this.y > WINDOW_HEIGHT) {
            this.y = 0;
            this.x = Math.random() * WINDOW_WIDTH;
        }
    }

    draw(ctx) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * this.parallax})`;
        ctx.fillRect(this.x, this.y, this.size, this.size);
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 10;
        this.speedY = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
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

function initStars() {
    stars = [];
    for (let i = 0; i < 50; i++) stars.push(new Star(1));
    for (let i = 0; i < 30; i++) stars.push(new Star(2));
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 20; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Player settings
const PLAYER_SPEED = 5;
const PLAYER_START_X = 400;
const PLAYER_START_Y = 550;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const PLAYER_LIVES = 3;

// Bullet settings
const PLAYER_BULLET_SPEED = 8;
const ENEMY_BULLET_SPEED = 4;
const BULLET_WIDTH = 3;
const BULLET_HEIGHT = 10;

// Enemy settings
const ENEMY_ROWS = 5;
const ENEMY_COLS = 11;
const ENEMY_WIDTH = 40;
const ENEMY_HEIGHT = 30;
const ENEMY_SPACING_X = 50;
const ENEMY_SPACING_Y = 40;
const ENEMY_START_X = 100;
const ENEMY_START_Y = 100;
const ENEMY_SPEED = 1;
const ENEMY_DROP_DISTANCE = 20;

// Enemy points
const ENEMY_POINTS_TOP = 10;
const ENEMY_POINTS_MIDDLE = 20;
const ENEMY_POINTS_BOTTOM = 30;

// Barrier settings
const BARRIER_COUNT = 4;
const BARRIER_WIDTH = 80;
const BARRIER_HEIGHT = 50;
const BARRIER_Y = 450;

// Shooting settings
const ENEMY_SHOOT_CHANCE = 0.001;
const ENEMY_BULLET_COOLDOWN = 60;

// Game state
let gameState = 'menu'; // menu, playing, paused, game_over, wave_transition
let playerX = PLAYER_START_X;
let playerY = PLAYER_START_Y;
let playerLives = PLAYER_LIVES;
let playerBullets = [];
let playerDeathTimer = 0;

// Enemies
let enemies = [];
let enemyDirection = 1;
let enemySpeed = ENEMY_SPEED;
let enemyBullets = [];
let enemyShootTimer = 0;

// Barriers
let barriers = [];

// Scoring
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore') || '0');
let wave = 1;
let waveTransitionTimer = 0;

// Keys
const keys = {};

// Audio context for sounds
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

function playShoot() {
    playBeep(1000, 0.05, 0.3);
}

function playEnemyShoot() {
    playBeep(400, 0.1, 0.3);
}

function playExplosion() {
    playBeep(300, 0.1, 0.2);
    setTimeout(() => playBeep(100, 0.1, 0.2), 50);
}

function playPlayerDeath() {
    playBeep(400, 0.2, 0.4);
    setTimeout(() => playBeep(150, 0.3, 0.4), 200);
}

function playWaveComplete() {
    playBeep(400, 0.1, 0.4);
    setTimeout(() => playBeep(600, 0.1, 0.4), 150);
    setTimeout(() => playBeep(800, 0.15, 0.4), 300);
}

function playGameOver() {
    playBeep(200, 0.4, 0.5);
    setTimeout(() => playBeep(100, 0.4, 0.5), 400);
}

function initEnemies() {
    enemies = [];
    for (let row = 0; row < ENEMY_ROWS; row++) {
        const enemyRow = [];
        for (let col = 0; col < ENEMY_COLS; col++) {
            const x = ENEMY_START_X + col * ENEMY_SPACING_X;
            const y = ENEMY_START_Y + row * ENEMY_SPACING_Y;
            const enemyType = Math.floor(row / 2);
            enemyRow.push({
                x: x,
                y: y,
                alive: true,
                type: enemyType
            });
        }
        enemies.push(enemyRow);
    }
    enemySpeed = ENEMY_SPEED + (wave - 1) * 0.5;
}

function initBarriers() {
    barriers = [];
    const barrierSpacing = WINDOW_WIDTH / (BARRIER_COUNT + 1);
    const blockSize = 4;
    const blocksX = BARRIER_WIDTH / blockSize;
    const blocksY = BARRIER_HEIGHT / blockSize;
    
    for (let i = 0; i < BARRIER_COUNT; i++) {
        const x = barrierSpacing * (i + 1) - BARRIER_WIDTH / 2;
        const barrier = [];
        
        for (let by = 0; by < blocksY; by++) {
            const barrierRow = [];
            for (let bx = 0; bx < blocksX; bx++) {
                const centerX = blocksX / 2;
                const centerY = blocksY;
                const distFromCenter = Math.sqrt((bx - centerX) ** 2 + (by - centerY) ** 2);
                const maxDist = blocksY * 0.8;
                
                if (distFromCenter < maxDist && by > blocksY / 3) {
                    barrierRow.push(true);
                } else {
                    barrierRow.push(false);
                }
            }
            barrier.push(barrierRow);
        }
        
        barriers.push({
            x: x,
            y: BARRIER_Y,
            blocks: barrier,
            blockSize: blockSize
        });
    }
}

function getAliveEnemies() {
    const alive = [];
    for (let row of enemies) {
        for (let enemy of row) {
            if (enemy.alive) {
                alive.push(enemy);
            }
        }
    }
    return alive;
}

function getBottomEnemies() {
    const bottomEnemies = [];
    for (let col = 0; col < ENEMY_COLS; col++) {
        for (let row = ENEMY_ROWS - 1; row >= 0; row--) {
            const enemy = enemies[row][col];
            if (enemy.alive) {
                bottomEnemies.push(enemy);
                break;
            }
        }
    }
    return bottomEnemies;
}

// Event listeners
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    keys[e.code] = true;
    
    if (gameState === 'menu') {
        if (e.key === ' ') {
            startNewGame();
        }
    } else if (gameState === 'playing') {
        if (e.key === ' ' && playerBullets.length === 0) {
            playerBullets.push({
                x: playerX,
                y: playerY - BULLET_HEIGHT
            });
            playShoot();
        } else if (e.key.toLowerCase() === 'p') {
            gameState = 'paused';
            showPaused();
        } else if (e.key === 'Escape') {
            gameState = 'menu';
            showMenu();
        }
    } else if (gameState === 'paused') {
        if (e.key.toLowerCase() === 'p' || e.key === ' ') {
            gameState = 'playing';
            hideOverlay();
        } else if (e.key === 'Escape') {
            gameState = 'menu';
            showMenu();
        }
    } else if (gameState === 'game_over') {
        if (e.key === ' ') {
            gameState = 'menu';
            showMenu();
        }
    } else if (gameState === 'wave_transition') {
        if (e.key === ' ') {
            startNextWave();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
});

function startGame() {
    console.log('startGame called');
    startNewGame();
}

function startNewGame() {
    console.log('startNewGame: Initializing new game');
    playerX = PLAYER_START_X;
    playerY = PLAYER_START_Y;
    playerLives = PLAYER_LIVES;
    playerBullets = [];
    enemyBullets = [];
    score = 0;
    wave = 1;
    playerDeathTimer = 0;
    initEnemies();
    initBarriers();
    gameState = 'playing';
    console.log('startNewGame: Hiding overlay');
    hideOverlay();
}

function startNextWave() {
    wave++;
    playerBullets = [];
    enemyBullets = [];
    playerDeathTimer = 0;
    enemyShootTimer = 0;
    initEnemies();
    initBarriers();
    gameState = 'playing';
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
        <h1>👾 SPACE INVADERS</h1>
        <h2>Defend Earth!</h2>
        <p>Arrow Keys / A/D - Move<br>SPACE - Shoot<br>P - Pause</p>
        <p>High Score: ${highScore}</p>
        <button class="button" data-action="start" onclick="window.startGame()">Press SPACE to Start</button>
    `;
    console.log('showMenu: Menu HTML set, button should be clickable');
    
    // Also attach event listener directly as backup
    setTimeout(() => {
        const button = overlay.querySelector('.button');
        if (button) {
            console.log('Found button, attaching direct listener');
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Direct click handler fired!');
                startGame();
            });
        } else {
            console.error('Button not found in overlay!');
        }
    }, 100);
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

function update() {
    // Update background and particles
    stars.forEach(s => s.update());
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
    if (screenFlicker > 0) screenFlicker--;

    if (gameState === 'wave_transition') {
        waveTransitionTimer++;
        if (waveTransitionTimer >= 180) {
            startNextWave();
        }
        return;
    }
    
    if (gameState !== 'playing') {
        return;
    }
    
    if (playerDeathTimer > 0) {
        playerDeathTimer--;
        if (playerDeathTimer === 0) {
            if (playerLives > 0) {
                playerX = PLAYER_START_X;
                playerY = PLAYER_START_Y;
            } else {
                if (score > highScore) {
                    highScore = score;
                    localStorage.setItem('highScore', highScore.toString());
                }
                gameState = 'game_over';
                showGameOver();
                playGameOver();
            }
        }
        return;
    }
    
    // Player movement
    if ((keys['ArrowLeft'] || keys['a']) && playerX > PLAYER_WIDTH / 2) {
        playerX -= PLAYER_SPEED;
    }
    if ((keys['ArrowRight'] || keys['d']) && playerX < WINDOW_WIDTH - PLAYER_WIDTH / 2) {
        playerX += PLAYER_SPEED;
    }
    
    // Update player bullets
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        bullet.y -= PLAYER_BULLET_SPEED;
        if (bullet.y < 0) {
            playerBullets.splice(i, 1);
        }
    }
    
    // Enemy movement
    let moveDown = false;
    const aliveEnemies = getAliveEnemies();
    if (aliveEnemies.length > 0) {
        const minX = Math.min(...aliveEnemies.map(e => e.x));
        const maxX = Math.max(...aliveEnemies.map(e => e.x));
        
        if ((enemyDirection === 1 && maxX + ENEMY_WIDTH / 2 >= WINDOW_WIDTH - 50) ||
            (enemyDirection === -1 && minX - ENEMY_WIDTH / 2 <= 50)) {
            enemyDirection *= -1;
            moveDown = true;
        }
    }
    
    for (let row of enemies) {
        for (let enemy of row) {
            if (enemy.alive) {
                enemy.x += enemySpeed * enemyDirection;
                if (moveDown) {
                    enemy.y += ENEMY_DROP_DISTANCE;
                }
                
                if (enemy.y + ENEMY_HEIGHT >= PLAYER_START_Y - 10) {
                    gameState = 'game_over';
                    if (score > highScore) {
                        highScore = score;
                        localStorage.setItem('highScore', highScore.toString());
                    }
                    showGameOver();
                    playGameOver();
                }
            }
        }
    }
    
    // Enemy shooting
    enemyShootTimer++;
    if (enemyShootTimer >= ENEMY_BULLET_COOLDOWN) {
        if (enemyBullets.length === 0) {
            const bottomEnemies = getBottomEnemies();
            if (bottomEnemies.length > 0) {
                const shooter = bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)];
                enemyBullets.push({
                    x: shooter.x,
                    y: shooter.y + ENEMY_HEIGHT
                });
                playEnemyShoot();
                enemyShootTimer = 0;
            }
        }
    }
    
    // Update enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        bullet.y += ENEMY_BULLET_SPEED;
        if (bullet.y > WINDOW_HEIGHT) {
            enemyBullets.splice(i, 1);
        }
    }
    
    // Collision: Player bullets vs enemies
    for (let i = playerBullets.length - 1; i >= 0; i--) {
        const bullet = playerBullets[i];
        let hit = false;
        
        for (let row of enemies) {
            for (let enemy of row) {
                if (enemy.alive) {
                    if (bullet.x >= enemy.x - ENEMY_WIDTH / 2 &&
                        bullet.x <= enemy.x + ENEMY_WIDTH / 2 &&
                        bullet.y >= enemy.y - ENEMY_HEIGHT / 2 &&
                        bullet.y <= enemy.y + ENEMY_HEIGHT / 2) {
                        
                        if (enemy.type === 0) {
                            score += ENEMY_POINTS_TOP;
                        } else if (enemy.type === 1) {
                            score += ENEMY_POINTS_MIDDLE;
                        } else {
                            score += ENEMY_POINTS_BOTTOM;
                        }
                        
                        enemy.alive = false;
                        playerBullets.splice(i, 1);
                        createExplosion(enemy.x, enemy.y, 
                            enemy.type === 0 ? RED : (enemy.type === 1 ? YELLOW : CYAN));
                        playExplosion();
                        hit = true;
                        break;
                    }
                }
            }
            if (hit) break;
        }
        
        if (hit) continue;
        
        // Collision: Player bullets vs barriers
        for (let barrier of barriers) {
            const blockSize = barrier.blockSize;
            const bulletBlockX = Math.floor((bullet.x - barrier.x + BARRIER_WIDTH / 2) / blockSize);
            const bulletBlockY = Math.floor((bullet.y - barrier.y) / blockSize);
            
            if (bulletBlockX >= 0 && bulletBlockX < barrier.blocks[0].length &&
                bulletBlockY >= 0 && bulletBlockY < barrier.blocks.length) {
                if (barrier.blocks[bulletBlockY][bulletBlockX]) {
                    // Destroy blocks around impact
                    createExplosion(bullet.x, bullet.y, GREEN);
                    for (let dy = -1; dy < 3; dy++) {
                        for (let dx = -2; dx < 3; dx++) {
                            const by = bulletBlockY + dy;
                            const bx = bulletBlockX + dx;
                            if (by >= 0 && by < barrier.blocks.length &&
                                bx >= 0 && bx < barrier.blocks[0].length) {
                                barrier.blocks[by][bx] = false;
                            }
                        }
                    }
                    playerBullets.splice(i, 1);
                    break;
                }
            }
        }
    }
    
    // Collision: Enemy bullets vs player
    if (playerDeathTimer === 0) {
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const bullet = enemyBullets[i];
            if (bullet.x >= playerX - PLAYER_WIDTH / 2 &&
                bullet.x <= playerX + PLAYER_WIDTH / 2 &&
                bullet.y >= playerY - PLAYER_HEIGHT / 2 &&
                bullet.y <= playerY + PLAYER_HEIGHT / 2) {
                playerLives--;
                enemyBullets.splice(i, 1);
                playerBullets = [];
                playerDeathTimer = 120;
                createExplosion(playerX, playerY, WHITE);
                screenFlicker = 10;
                playPlayerDeath();
                break;
            }
        }
    }
    
    // Collision: Enemy bullets vs barriers
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];
        let hit = false;
        
        for (let barrier of barriers) {
            const blockSize = barrier.blockSize;
            const bulletBlockX = Math.floor((bullet.x - barrier.x + BARRIER_WIDTH / 2) / blockSize);
            const bulletBlockY = Math.floor((bullet.y - barrier.y) / blockSize);
            
            if (bulletBlockX >= 0 && bulletBlockX < barrier.blocks[0].length &&
                bulletBlockY >= 0 && bulletBlockY < barrier.blocks.length) {
                if (barrier.blocks[bulletBlockY][bulletBlockX]) {
                    createExplosion(bullet.x, bullet.y, GREEN);
                    for (let dy = -1; dy < 3; dy++) {
                        for (let dx = -2; dx < 3; dx++) {
                            const by = bulletBlockY + dy;
                            const bx = bulletBlockX + dx;
                            if (by >= 0 && by < barrier.blocks.length &&
                                bx >= 0 && bx < barrier.blocks[0].length) {
                                barrier.blocks[by][bx] = false;
                            }
                        }
                    }
                    enemyBullets.splice(i, 1);
                    hit = true;
                    break;
                }
            }
        }
        if (hit) break;
    }
    
    // Check if all enemies destroyed
    if (getAliveEnemies().length === 0) {
        gameState = 'wave_transition';
        waveTransitionTimer = 0;
        playWaveComplete();
    }
}

function showGameOver() {
    overlay.style.display = 'flex';
    const newRecord = score === highScore && score > 0 ? '<h2 style="color: yellow;">NEW HIGH SCORE!</h2>' : '';
    overlay.innerHTML = `
        <h1 style="color: red;">GAME OVER</h1>
        <h2>Final Score: ${score}</h2>
        ${newRecord}
        <p>Press SPACE to return to menu</p>
    `;
}

function drawAlien(x, y, enemyType) {
    ctx.shadowBlur = 15;
    if (enemyType === 0) {
        // Top row - squid-like
        ctx.fillStyle = RED;
        ctx.shadowColor = RED;
        ctx.beginPath();
        ctx.moveTo(x, y - ENEMY_HEIGHT / 2 + 5);
        ctx.lineTo(x - ENEMY_WIDTH / 2 + 8, y - ENEMY_HEIGHT / 2 + 15);
        ctx.lineTo(x - ENEMY_WIDTH / 2, y);
        ctx.lineTo(x - ENEMY_WIDTH / 3, y + ENEMY_HEIGHT / 2 - 5);
        ctx.lineTo(x + ENEMY_WIDTH / 3, y + ENEMY_HEIGHT / 2 - 5);
        ctx.lineTo(x + ENEMY_WIDTH / 2, y);
        ctx.lineTo(x + ENEMY_WIDTH / 2 - 8, y - ENEMY_HEIGHT / 2 + 15);
        ctx.closePath();
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(x - 8, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(x - 8, y - 5, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 8, y - 5, 1, 0, Math.PI * 2);
        ctx.fill();
    } else if (enemyType === 1) {
        // Middle rows - crab-like
        ctx.fillStyle = YELLOW;
        ctx.shadowColor = YELLOW;
        ctx.beginPath();
        ctx.ellipse(x, y, ENEMY_WIDTH / 2, (ENEMY_HEIGHT - 10) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(x, y - ENEMY_HEIGHT / 2, 6, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = YELLOW;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - ENEMY_WIDTH / 2, y + 8);
        ctx.lineTo(x - ENEMY_WIDTH / 2 - 5, y + 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + ENEMY_WIDTH / 2, y + 8);
        ctx.lineTo(x + ENEMY_WIDTH / 2 + 5, y + 15);
        ctx.stroke();
        
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(x - 10, y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(x - 10, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 10, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Bottom rows - octopus-like
        ctx.fillStyle = CYAN;
        ctx.shadowColor = CYAN;
        ctx.beginPath();
        ctx.ellipse(x, y, (ENEMY_WIDTH - 6) / 2, (ENEMY_HEIGHT - 6) / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(x, y - ENEMY_HEIGHT / 2 - 3, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.strokeStyle = CYAN;
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * 6;
            ctx.beginPath();
            ctx.moveTo(x + offset - 3, y + ENEMY_HEIGHT / 2 - 3);
            ctx.lineTo(x + offset - 5, y + ENEMY_HEIGHT / 2 + 5);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + offset + 3, y + ENEMY_HEIGHT / 2 - 3);
            ctx.lineTo(x + offset + 5, y + ENEMY_HEIGHT / 2 + 5);
            ctx.stroke();
        }
        
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(x - 9, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 9, y - 5, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = BLACK;
        ctx.beginPath();
        ctx.arc(x - 9, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 9, y - 5, 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = BLACK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y + 5);
        ctx.lineTo(x + 4, y + 5);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;
}

function render() {
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    
    // Draw stars
    stars.forEach(s => s.draw(ctx));
    
    // Draw particles
    particles.forEach(p => p.draw(ctx));
    
    // Apply screen flicker
    if (screenFlicker > 0 && Math.random() > 0.5) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, WINDOW_WIDTH, WINDOW_HEIGHT);
    }
    
    if (gameState === 'wave_transition') {
        ctx.fillStyle = GREEN;
        ctx.font = '74px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 20;
        ctx.shadowColor = GREEN;
        ctx.fillText(`WAVE ${wave}`, WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 - 50);
        ctx.font = '18px "Orbitron"';
        ctx.shadowBlur = 0;
        ctx.fillText('Press SPACE to continue', WINDOW_WIDTH / 2, WINDOW_HEIGHT / 2 + 50);
        return;
    }
    
    if (gameState === 'playing' || gameState === 'paused' || gameState === 'game_over') {
        // Draw barriers
        for (let barrier of barriers) {
            const blockSize = barrier.blockSize;
            ctx.fillStyle = GREEN;
            ctx.shadowBlur = 5;
            ctx.shadowColor = GREEN;
            for (let y = 0; y < barrier.blocks.length; y++) {
                for (let x = 0; x < barrier.blocks[y].length; x++) {
                    if (barrier.blocks[y][x]) {
                        const blockX = barrier.x - BARRIER_WIDTH / 2 + x * blockSize;
                        const blockY = barrier.y + y * blockSize;
                        ctx.fillRect(blockX, blockY, blockSize, blockSize);
                    }
                }
            }
            ctx.shadowBlur = 0;
        }
        
        // Draw enemies
        for (let row of enemies) {
            for (let enemy of row) {
                if (enemy.alive) {
                    drawAlien(enemy.x, enemy.y, enemy.type);
                }
            }
        }
        
        // Draw player (if not dead)
        if (playerDeathTimer === 0) {
            ctx.fillStyle = WHITE;
            ctx.shadowBlur = 15;
            ctx.shadowColor = CYAN;
            ctx.beginPath();
            ctx.moveTo(playerX, playerY - PLAYER_HEIGHT / 2);
            ctx.lineTo(playerX - PLAYER_WIDTH / 2, playerY + PLAYER_HEIGHT / 2);
            ctx.lineTo(playerX + PLAYER_WIDTH / 2, playerY + PLAYER_HEIGHT / 2);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
        
        // Draw player bullets
        ctx.fillStyle = YELLOW;
        ctx.shadowBlur = 10;
        ctx.shadowColor = YELLOW;
        for (let bullet of playerBullets) {
            ctx.fillRect(bullet.x - BULLET_WIDTH / 2, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
        }
        
        // Draw enemy bullets
        ctx.fillStyle = RED;
        ctx.shadowBlur = 10;
        ctx.shadowColor = RED;
        for (let bullet of enemyBullets) {
            ctx.fillRect(bullet.x - BULLET_WIDTH / 2, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
        }
        ctx.shadowBlur = 0;
        
        // Draw score
        ctx.fillStyle = WHITE;
        ctx.font = '16px "Press Start 2P"';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${score}`, 20, 40);
        ctx.fillText(`WAVE: ${wave}`, 20, 70);
        ctx.fillText(`LIVES: ${playerLives}`, 20, 100);
        
        ctx.textAlign = 'right';
        ctx.fillText(`HI-SCORE: ${highScore}`, WINDOW_WIDTH - 20, 40);
    }
}

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    // If fonts aren't loaded, don't start the loop to prevent errors
    if (!document.fonts.check('16px "Press Start 2P"')) {
        requestAnimationFrame(gameLoop);
        return;
    }

    const deltaTime = currentTime - lastTime;
    const frameTime = 1000 / FPS;
    
    if (deltaTime >= frameTime) {
        update();
        render();
        lastTime = currentTime - (deltaTime % frameTime);
    }
    
    requestAnimationFrame(gameLoop);
}

// Make functions globally accessible (fallback)
window.startGame = startGame;
