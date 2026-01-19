// Adventure (Atari 2600) Clone - JavaScript/Canvas Version
let canvas, ctx, overlay, overlayTitle, overlayText, hud;

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Adventure');
    
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    overlay = document.getElementById('overlay');
    overlayTitle = document.getElementById('overlayTitle');
    overlayText = document.getElementById('overlayText');
    hud = document.getElementById('hud');
    
    if (!canvas || !ctx || !overlay) {
        console.error('Failed to find required DOM elements!');
        return;
    }
    
    // Disable image smoothing for pixelated look
    ctx.imageSmoothingEnabled = false;
    
    console.log('DOM elements found, setting up event listeners');
    
    // Use event delegation for buttons
    document.addEventListener('click', (e) => {
        const button = e.target.closest('.button');
        if (button) {
            const action = button.dataset.action;
            if (action === 'start') {
                startGame();
            } else if (action === 'restart') {
                restartGame();
            }
        }
    });
    
    // Initialize game
    initGame();
    console.log('Starting game loop');
    gameLoop(0);
});

// Constants
const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 768;
const FPS = 60;
const SCALE = 4; // Scale from original 160x192

// Colors (Original Atari palette)
const COLORS = {
    BACKGROUND: '#000033',
    BLACK: '#000000',
    WHITE: '#FFFFFF',
    GRAY: '#808080',
    RED: '#FF0000',
    GREEN: '#00FF00',
    YELLOW: '#FFFF00',
    BLUE: '#0000FF',
    GOLD: '#FFD700',
    SILVER: '#C0C0C0',
    BROWN: '#8B4513',
    CYAN: '#00f3ff',
    MAGENTA: '#ff00ff'
};

// Game state
let gameState = 'menu'; // menu, playing, paused, game_over, victory
let currentRoomId = 0;
let player = {
    x: 320,
    y: 384,
    width: 8,
    height: 8,
    speed: 2,
    inventory: null // Object being carried
};

// Rooms array - simplified Adventure layout (~30 rooms)
let rooms = [];
let objects = [];
let dragons = [];
let keys = {};

// Keys pressed
const keysPressed = {};

// Audio context
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playBeep(frequency, duration, volume = 0.3) {
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'square';
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
        console.log('Audio error:', e);
    }
}

// Initialize rooms - simplified Adventure layout
function initRooms() {
    rooms = [];
    
    // Create ~30 rooms in a grid-like structure
    // Room IDs: 0-29
    for (let i = 0; i < 30; i++) {
        rooms.push({
            id: i,
            name: `Room ${i}`,
            walls: [],
            exits: {
                north: null,
                south: null,
                east: null,
                west: null
            },
            backgroundColor: COLORS.BACKGROUND,
            isCastle: false,
            castleColor: null,
            gateLocked: false
        });
    }
    
    // Define room connections (simplified Adventure map)
    // Horizontal connections
    for (let i = 0; i < 29; i++) {
        if (i % 6 !== 5) { // Not right edge
            rooms[i].exits.east = i + 1;
            rooms[i + 1].exits.west = i;
        }
    }
    
    // Vertical connections
    for (let i = 0; i < 24; i++) {
        rooms[i].exits.south = i + 6;
        rooms[i + 6].exits.north = i;
    }
    
    // Add walls to rooms (maze-like)
    rooms.forEach((room, idx) => {
        const walls = [];
        
        // Outer walls
        walls.push({x: 0, y: 0, width: CANVAS_WIDTH, height: 20}); // Top
        walls.push({x: 0, y: CANVAS_HEIGHT - 20, width: CANVAS_WIDTH, height: 20}); // Bottom
        walls.push({x: 0, y: 0, width: 20, height: CANVAS_HEIGHT}); // Left
        walls.push({x: CANVAS_WIDTH - 20, y: 0, width: 20, height: CANVAS_HEIGHT}); // Right
        
        // Internal walls (maze)
        if (idx === 5) { // Black Castle
            room.isCastle = true;
            room.castleColor = 'black';
            room.gateLocked = true;
            walls.push({x: 200, y: 100, width: 240, height: 20});
            walls.push({x: 200, y: 200, width: 240, height: 20});
            walls.push({x: 200, y: 100, width: 20, height: 120});
            walls.push({x: 420, y: 100, width: 20, height: 120});
            // Gate at bottom
        } else if (idx === 11) { // White Castle
            room.isCastle = true;
            room.castleColor = 'white';
            room.gateLocked = true;
            walls.push({x: 200, y: 300, width: 240, height: 20});
            walls.push({x: 200, y: 400, width: 240, height: 20});
            walls.push({x: 200, y: 300, width: 20, height: 120});
            walls.push({x: 420, y: 300, width: 20, height: 120});
        } else if (idx === 17) { // Yellow Castle
            room.isCastle = true;
            room.castleColor = 'yellow';
            room.gateLocked = true;
            walls.push({x: 200, y: 500, width: 240, height: 20});
            walls.push({x: 200, y: 600, width: 240, height: 20});
            walls.push({x: 200, y: 500, width: 20, height: 120});
            walls.push({x: 420, y: 500, width: 20, height: 120});
        } else if (idx === 23) { // Golden Castle (goal)
            room.isCastle = true;
            room.castleColor = 'gold';
            walls.push({x: 200, y: 200, width: 240, height: 20});
            walls.push({x: 200, y: 400, width: 240, height: 20});
            walls.push({x: 200, y: 200, width: 20, height: 220});
            walls.push({x: 420, y: 200, width: 20, height: 220});
        } else {
            // Random internal walls for maze effect
            if (Math.random() > 0.5) {
                walls.push({x: 150, y: 200, width: 100, height: 20});
            }
            if (Math.random() > 0.5) {
                walls.push({x: 400, y: 400, width: 100, height: 20});
            }
        }
        
        room.walls = walls;
    });
}

// Initialize objects
function initObjects() {
    objects = [];
    
    // Enchanted Chalice (goal)
    objects.push({
        id: 'chalice',
        type: 'chalice',
        x: 400,
        y: 200,
        roomId: 2,
        carriedBy: null,
        color: COLORS.GOLD,
        width: 12,
        height: 12
    });
    
    // Sword
    objects.push({
        id: 'sword',
        type: 'sword',
        x: 300,
        y: 500,
        roomId: 8,
        carriedBy: null,
        color: COLORS.SILVER,
        width: 12,
        height: 4
    });
    
    // Keys
    objects.push({
        id: 'key_black',
        type: 'key',
        x: 100,
        y: 150,
        roomId: 1,
        carriedBy: null,
        color: COLORS.BLACK,
        width: 8,
        height: 12,
        keyColor: 'black'
    });
    
    objects.push({
        id: 'key_white',
        type: 'key',
        x: 500,
        y: 350,
        roomId: 7,
        carriedBy: null,
        color: COLORS.WHITE,
        width: 8,
        height: 12,
        keyColor: 'white'
    });
    
    objects.push({
        id: 'key_yellow',
        type: 'key',
        x: 200,
        y: 650,
        roomId: 13,
        carriedBy: null,
        color: COLORS.YELLOW,
        width: 8,
        height: 12,
        keyColor: 'yellow'
    });
    
    // Bridge
    objects.push({
        id: 'bridge',
        type: 'bridge',
        x: 350,
        y: 300,
        roomId: 4,
        carriedBy: null,
        color: COLORS.BROWN,
        width: 16,
        height: 8
    });
    
    // Magnet
    objects.push({
        id: 'magnet',
        type: 'magnet',
        x: 450,
        y: 600,
        roomId: 19,
        carriedBy: null,
        color: COLORS.BLUE,
        width: 10,
        height: 10
    });
}

// Initialize dragons
function initDragons() {
    dragons = [];
    
    // Yorgle (Red Dragon)
    dragons.push({
        id: 'yorgle',
        name: 'Yorgle',
        x: 250,
        y: 250,
        roomId: 3,
        speed: 1.5,
        color: COLORS.RED,
        width: 12,
        height: 12,
        alive: true,
        carriedObject: null
    });
    
    // Grundle (Green Dragon)
    dragons.push({
        id: 'grundle',
        name: 'Grundle',
        x: 400,
        y: 450,
        roomId: 9,
        speed: 1.5,
        color: COLORS.GREEN,
        width: 12,
        height: 12,
        alive: true,
        carriedObject: null
    });
    
    // Rhindle (Yellow Dragon)
    dragons.push({
        id: 'rhindle',
        name: 'Rhindle',
        x: 150,
        y: 550,
        roomId: 15,
        speed: 1.5,
        color: COLORS.YELLOW,
        width: 12,
        height: 12,
        alive: true,
        carriedObject: null
    });
}

// Initialize game
function initGame() {
    initRooms();
    initObjects();
    initDragons();
    keys = {};
    currentRoomId = 0;
    player.x = 320;
    player.y = 384;
    player.inventory = null;
}

// Keyboard input
document.addEventListener('keydown', (e) => {
    keysPressed[e.key.toLowerCase()] = true;
    
    if (gameState === 'playing') {
        if (e.key === ' ' || e.key === 'Space') {
            dropObject();
        }
        if (e.key === 'p' || e.key === 'P') {
            togglePause();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key.toLowerCase()] = false;
});

// Update player
function updatePlayer() {
    if (gameState !== 'playing') return;
    
    const prevX = player.x;
    const prevY = player.y;
    
    // Movement
    if (keysPressed['arrowup'] || keysPressed['w']) {
        player.y -= player.speed;
    }
    if (keysPressed['arrowdown'] || keysPressed['s']) {
        player.y += player.speed;
    }
    if (keysPressed['arrowleft'] || keysPressed['a']) {
        player.x -= player.speed;
    }
    if (keysPressed['arrowright'] || keysPressed['d']) {
        player.x += player.speed;
    }
    
    // Wall collision
    const room = rooms[currentRoomId];
    for (const wall of room.walls) {
        if (player.x < wall.x + wall.width &&
            player.x + player.width > wall.x &&
            player.y < wall.y + wall.height &&
            player.y + player.height > wall.y) {
            player.x = prevX;
            player.y = prevY;
            break;
        }
    }
    
    // Gate collision (if locked)
    if (room.isCastle && room.gateLocked) {
        const gateX = 300;
        const gateY = CANVAS_HEIGHT - 40;
        const gateWidth = 40;
        const gateHeight = 20;
        
        if (player.x < gateX + gateWidth &&
            player.x + player.width > gateX &&
            player.y < gateY + gateHeight &&
            player.y + player.height > gateY) {
            // Check if player has matching key
            if (player.inventory && player.inventory.type === 'key') {
                const keyColor = player.inventory.keyColor;
                if (keyColor === room.castleColor) {
                    room.gateLocked = false;
                    playBeep(500, 0.2);
                } else {
                    // Blocked by gate
                    player.x = prevX;
                    player.y = prevY;
                }
            } else {
                // Blocked by gate
                player.x = prevX;
                player.y = prevY;
            }
        }
    }
    
    // Room transitions
    if (player.x < 20 && room.exits.west !== null) {
        currentRoomId = room.exits.west;
        player.x = CANVAS_WIDTH - 40;
        playBeep(300, 0.1);
    } else if (player.x > CANVAS_WIDTH - 40 && room.exits.east !== null) {
        currentRoomId = room.exits.east;
        player.x = 20;
        playBeep(300, 0.1);
    } else if (player.y < 20 && room.exits.north !== null) {
        currentRoomId = room.exits.north;
        player.y = CANVAS_HEIGHT - 40;
        playBeep(300, 0.1);
    } else if (player.y > CANVAS_HEIGHT - 40 && room.exits.south !== null) {
        currentRoomId = room.exits.south;
        player.y = 20;
        playBeep(300, 0.1);
    }
    
    // Keep player in bounds
    player.x = Math.max(20, Math.min(CANVAS_WIDTH - 20 - player.width, player.x));
    player.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20 - player.height, player.y));
    
    // Object collision (pickup)
    if (!player.inventory) {
        const roomObjects = objects.filter(obj => 
            obj.roomId === currentRoomId && obj.carriedBy === null
        );
        
        for (const obj of roomObjects) {
            if (player.x < obj.x + obj.width &&
                player.x + player.width > obj.x &&
                player.y < obj.y + obj.height &&
                player.y + player.height > obj.y) {
                pickupObject(obj);
                break;
            }
        }
    }
    
    // Dragon collision
    const roomDragons = dragons.filter(d => 
        d.roomId === currentRoomId && d.alive
    );
    
    for (const dragon of roomDragons) {
        if (player.x < dragon.x + dragon.width &&
            player.x + player.width > dragon.x &&
            player.y < dragon.y + dragon.height &&
            player.y + player.height > dragon.y) {
            
            // Check if player has sword
            if (player.inventory && player.inventory.type === 'sword') {
                // Kill dragon
                dragon.alive = false;
                playBeep(200, 0.3);
                if (dragon.carriedObject) {
                    const obj = objects.find(o => o.id === dragon.carriedObject);
                    if (obj) {
                        obj.carriedBy = null;
                        obj.x = dragon.x;
                        obj.y = dragon.y;
                    }
                }
            } else {
                // Player eaten
                gameOver();
            }
        }
    }
    
    // Check win condition (chalice in golden castle)
    const goldenCastle = rooms.find(r => r.castleColor === 'gold');
    if (goldenCastle && currentRoomId === goldenCastle.id) {
        const chalice = objects.find(o => o.type === 'chalice');
        if (chalice && chalice.roomId === goldenCastle.id && chalice.carriedBy === null) {
            victory();
        }
    }
}

// Pickup object
function pickupObject(obj) {
    if (player.inventory) return; // Already carrying something
    
    player.inventory = obj;
    obj.carriedBy = 'player';
    playBeep(400, 0.15);
}

// Drop object
function dropObject() {
    if (!player.inventory) return;
    
    const obj = player.inventory;
    obj.carriedBy = null;
    obj.roomId = currentRoomId;
    obj.x = player.x;
    obj.y = player.y - 20;
    player.inventory = null;
    playBeep(300, 0.15);
}

// Update dragons
function updateDragons() {
    if (gameState !== 'playing') return;
    
    dragons.forEach(dragon => {
        if (!dragon.alive) return;
        
        // Chase player if in same room
        if (dragon.roomId === currentRoomId) {
            const dx = player.x - dragon.x;
            const dy = player.y - dragon.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                dragon.x += (dx / dist) * dragon.speed;
                dragon.y += (dy / dist) * dragon.speed;
            }
        } else {
            // Random movement when not chasing
            dragon.x += (Math.random() - 0.5) * dragon.speed;
            dragon.y += (Math.random() - 0.5) * dragon.speed;
        }
        
        // Wall collision for dragons
        const room = rooms[dragon.roomId];
        for (const wall of room.walls) {
            if (dragon.x < wall.x + wall.width &&
                dragon.x + dragon.width > wall.x &&
                dragon.y < wall.y + wall.height &&
                dragon.y + dragon.height > wall.y) {
                // Bounce off wall
                dragon.x -= (Math.random() - 0.5) * 20;
                dragon.y -= (Math.random() - 0.5) * 20;
            }
        }
        
        // Keep in bounds
        dragon.x = Math.max(20, Math.min(CANVAS_WIDTH - 20 - dragon.width, dragon.x));
        dragon.y = Math.max(20, Math.min(CANVAS_HEIGHT - 20 - dragon.height, dragon.y));
        
        // Room transitions for dragons (simplified)
        if (dragon.x < 20 && room.exits.west !== null && Math.random() > 0.95) {
            dragon.roomId = room.exits.west;
            dragon.x = CANVAS_WIDTH - 40;
        } else if (dragon.x > CANVAS_WIDTH - 40 && room.exits.east !== null && Math.random() > 0.95) {
            dragon.roomId = room.exits.east;
            dragon.x = 20;
        } else if (dragon.y < 20 && room.exits.north !== null && Math.random() > 0.95) {
            dragon.roomId = room.exits.north;
            dragon.y = CANVAS_HEIGHT - 40;
        } else if (dragon.y > CANVAS_HEIGHT - 40 && room.exits.south !== null && Math.random() > 0.95) {
            dragon.roomId = room.exits.south;
            dragon.y = 20;
        }
        
        // Dragon can pick up objects
        if (!dragon.carriedObject) {
            const roomObjects = objects.filter(obj => 
                obj.roomId === dragon.roomId && obj.carriedBy === null
            );
            
            for (const obj of roomObjects) {
                if (dragon.x < obj.x + obj.width &&
                    dragon.x + dragon.width > obj.x &&
                    dragon.y < obj.y + obj.height &&
                    dragon.y + dragon.height > obj.y) {
                    dragon.carriedObject = obj.id;
                    obj.carriedBy = 'dragon';
                }
            }
        } else {
            // Update carried object position
            const obj = objects.find(o => o.id === dragon.carriedObject);
            if (obj) {
                obj.x = dragon.x;
                obj.y = dragon.y - 16;
                obj.roomId = dragon.roomId;
            }
        }
    });
}

// Render room
function renderRoom() {
    const room = rooms[currentRoomId];
    
    // Background
    ctx.fillStyle = room.backgroundColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Walls
    ctx.fillStyle = COLORS.GRAY;
    ctx.shadowBlur = 0;
    room.walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });
    
    // Castle gate (if locked)
    if (room.isCastle && room.gateLocked) {
        ctx.fillStyle = room.castleColor === 'black' ? COLORS.BLACK :
                        room.castleColor === 'white' ? COLORS.WHITE :
                        room.castleColor === 'yellow' ? COLORS.YELLOW : COLORS.GOLD;
        ctx.fillRect(300, CANVAS_HEIGHT - 40, 40, 20);
    }
}

// Render objects
function renderObjects() {
    // Render objects in current room (not carried by player)
    const roomObjects = objects.filter(obj => 
        obj.roomId === currentRoomId && obj.carriedBy !== 'player'
    );
    
    roomObjects.forEach(obj => {
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = obj.color;
        
        if (obj.type === 'chalice') {
            // Draw chalice shape
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillRect(obj.x + 2, obj.y - 4, 8, 4);
        } else if (obj.type === 'sword') {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        } else if (obj.type === 'key') {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.fillRect(obj.x + 2, obj.y - 4, 4, 4);
        } else {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
        }
    });
    
    ctx.shadowBlur = 0;
}

// Render dragons
function renderDragons() {
    dragons.forEach(dragon => {
        if (!dragon.alive || dragon.roomId !== currentRoomId) return;
        
        ctx.fillStyle = dragon.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = dragon.color;
        ctx.fillRect(dragon.x, dragon.y, dragon.width, dragon.height);
        
        // Simple dragon shape
        ctx.fillRect(dragon.x - 2, dragon.y + 4, 4, 4); // Head
        ctx.fillRect(dragon.x + dragon.width, dragon.y + 4, 4, 4); // Tail
        
        // Render carried object above dragon
        if (dragon.carriedObject) {
            const obj = objects.find(o => o.id === dragon.carriedObject);
            if (obj) {
                ctx.fillStyle = obj.color;
                ctx.shadowBlur = 5;
                ctx.shadowColor = obj.color;
                ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            }
        }
    });
    
    ctx.shadowBlur = 0;
}

// Render player
function renderPlayer() {
    ctx.fillStyle = COLORS.WHITE;
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLORS.CYAN;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    // Show carried object above player
    if (player.inventory) {
        const obj = player.inventory;
        ctx.fillStyle = obj.color;
        ctx.shadowBlur = 5;
        ctx.shadowColor = obj.color;
        ctx.fillRect(player.x + 2, player.y - 16, obj.width, obj.height);
    }
    
    ctx.shadowBlur = 0;
}

// Render HUD
function renderHUD() {
    const room = rooms[currentRoomId];
    let hudText = `ROOM: ${currentRoomId}`;
    
    if (player.inventory) {
        hudText += ` | CARRYING: ${player.inventory.type.toUpperCase()}`;
    } else {
        hudText += ' | CARRYING: NOTHING';
    }
    
    hud.textContent = hudText;
}

// Game functions
function startGame() {
    gameState = 'playing';
    overlay.style.display = 'none';
    initGame();
    playBeep(400, 0.2);
}

function restartGame() {
    startGame();
}

function togglePause() {
    if (gameState === 'playing') {
        gameState = 'paused';
        overlay.style.display = 'flex';
        overlayTitle.textContent = 'PAUSED';
        overlayText.textContent = 'Press P to Resume';
    } else if (gameState === 'paused') {
        gameState = 'playing';
        overlay.style.display = 'none';
    }
}

function gameOver() {
    gameState = 'game_over';
    overlay.style.display = 'flex';
    overlayTitle.textContent = 'GAME OVER';
    overlayText.textContent = 'You were eaten by a dragon!';
    const button = overlay.querySelector('.button');
    if (button) {
        button.textContent = 'Try Again';
        button.dataset.action = 'restart';
    }
    playBeep(150, 0.5);
}

function victory() {
    gameState = 'victory';
    overlay.style.display = 'flex';
    overlayTitle.textContent = 'VICTORY!';
    overlayText.textContent = 'You returned the Enchanted Chalice!';
    const button = overlay.querySelector('.button');
    if (button) {
        button.textContent = 'Play Again';
        button.dataset.action = 'restart';
    }
    playBeep(600, 0.2);
    setTimeout(() => playBeep(800, 0.2), 200);
    setTimeout(() => playBeep(1000, 0.3), 400);
}

// Game loop
let lastTime = 0;
function gameLoop(currentTime) {
    requestAnimationFrame(gameLoop);
    
    const deltaTime = currentTime - lastTime;
    if (deltaTime < 1000 / FPS) return;
    lastTime = currentTime;
    
    if (gameState === 'playing' || gameState === 'paused') {
        if (gameState === 'playing') {
            updatePlayer();
            updateDragons();
        }
        
        renderRoom();
        renderObjects();
        renderDragons();
        renderPlayer();
        renderHUD();
    }
}

// Make functions globally accessible
window.startGame = startGame;
window.restartGame = restartGame;
