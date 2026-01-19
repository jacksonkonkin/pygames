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
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 360;
const FPS = 60;
const WALL_THICKNESS = 20;
const DOOR_WIDTH = 60;

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
    x: 240,
    y: 180,
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

// Initialize rooms - 6 room simplified layout
function initRooms() {
    rooms = [];
    
    // Create 6 rooms:
    // Room 0: Golden Castle (locked, goal)
    // Room 1: Transition room with sword (hub)
    // Room 2: Dragon room with key 1
    // Room 3: Dragon room with key 2
    // Room 4: Room with chalice
    // Room 5: Empty transition room
    
    for (let i = 0; i < 6; i++) {
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
    
    // Room connections:
    // Room 0 (Golden Castle) <-> Room 1 (Sword/Hub)
    rooms[0].exits.south = 1;
    rooms[1].exits.north = 0;
    
    // Room 1 (Hub) connects to all other rooms
    rooms[1].exits.east = 2;  // Dragon + Key 1
    rooms[1].exits.west = 3;  // Dragon + Key 2
    rooms[1].exits.south = 5; // Transition room
    
    rooms[2].exits.west = 1;  // Back to hub
    rooms[3].exits.east = 1;  // Back to hub
    
    // Room 5 connects Room 4 to Room 1 (transition room)
    rooms[5].exits.north = 1; // Back to hub
    rooms[5].exits.south = 4; // To chalice room
    rooms[4].exits.north = 5; // Back through transition
    
    // Add walls to rooms with clear doorways
    rooms.forEach((room, idx) => {
        const walls = [];
        const doorCenterX = CANVAS_WIDTH / 2;
        const doorCenterY = CANVAS_HEIGHT / 2;
        
        // Outer walls with doorways
        // Top wall (with door if exit north)
        if (room.exits.north === null) {
            walls.push({x: 0, y: 0, width: CANVAS_WIDTH, height: WALL_THICKNESS});
        } else {
            // Doorway in top wall
            walls.push({x: 0, y: 0, width: doorCenterX - DOOR_WIDTH/2, height: WALL_THICKNESS});
            walls.push({x: doorCenterX + DOOR_WIDTH/2, y: 0, width: CANVAS_WIDTH - (doorCenterX + DOOR_WIDTH/2), height: WALL_THICKNESS});
        }
        
        // Bottom wall (with door if exit south)
        if (room.exits.south === null) {
            walls.push({x: 0, y: CANVAS_HEIGHT - WALL_THICKNESS, width: CANVAS_WIDTH, height: WALL_THICKNESS});
        } else {
            // Doorway in bottom wall
            walls.push({x: 0, y: CANVAS_HEIGHT - WALL_THICKNESS, width: doorCenterX - DOOR_WIDTH/2, height: WALL_THICKNESS});
            walls.push({x: doorCenterX + DOOR_WIDTH/2, y: CANVAS_HEIGHT - WALL_THICKNESS, width: CANVAS_WIDTH - (doorCenterX + DOOR_WIDTH/2), height: WALL_THICKNESS});
        }
        
        // Left wall (with door if exit west)
        if (room.exits.west === null) {
            walls.push({x: 0, y: 0, width: WALL_THICKNESS, height: CANVAS_HEIGHT});
        } else {
            // Doorway in left wall
            walls.push({x: 0, y: 0, width: WALL_THICKNESS, height: doorCenterY - DOOR_WIDTH/2});
            walls.push({x: 0, y: doorCenterY + DOOR_WIDTH/2, width: WALL_THICKNESS, height: CANVAS_HEIGHT - (doorCenterY + DOOR_WIDTH/2)});
        }
        
        // Right wall (with door if exit east)
        if (room.exits.east === null) {
            walls.push({x: CANVAS_WIDTH - WALL_THICKNESS, y: 0, width: WALL_THICKNESS, height: CANVAS_HEIGHT});
        } else {
            // Doorway in right wall
            walls.push({x: CANVAS_WIDTH - WALL_THICKNESS, y: 0, width: WALL_THICKNESS, height: doorCenterY - DOOR_WIDTH/2});
            walls.push({x: CANVAS_WIDTH - WALL_THICKNESS, y: doorCenterY + DOOR_WIDTH/2, width: WALL_THICKNESS, height: CANVAS_HEIGHT - (doorCenterY + DOOR_WIDTH/2)});
        }
        
        // Room 0: Golden Castle (locked gate at bottom)
        if (idx === 0) {
            room.isCastle = true;
            room.castleColor = 'gold';
            room.gateLocked = true;
            // Add internal castle walls
            const castleX = 120;
            const castleY = 60;
            const castleW = 240;
            const castleH = 180;
            walls.push({x: castleX, y: castleY, width: castleW, height: WALL_THICKNESS}); // Top
            walls.push({x: castleX, y: castleY + castleH - WALL_THICKNESS, width: castleW, height: WALL_THICKNESS}); // Bottom (gate will be here)
            walls.push({x: castleX, y: castleY, width: WALL_THICKNESS, height: castleH}); // Left
            walls.push({x: castleX + castleW - WALL_THICKNESS, y: castleY, width: WALL_THICKNESS, height: castleH}); // Right
        }
        
        room.walls = walls;
    });
}

// Initialize objects
function initObjects() {
    objects = [];
    
    // Sword - Room 1 (hub/transition room)
    objects.push({
        id: 'sword',
        type: 'sword',
        x: CANVAS_WIDTH / 2 - 6,
        y: CANVAS_HEIGHT / 2,
        roomId: 1,
        carriedBy: null,
        color: COLORS.SILVER,
        width: 12,
        height: 4
    });
    
    // Key 1 - Room 2 (dragon room)
    objects.push({
        id: 'key_1',
        type: 'key',
        x: CANVAS_WIDTH / 2 - 4,
        y: CANVAS_HEIGHT / 2 - 30,
        roomId: 2,
        carriedBy: null,
        color: COLORS.YELLOW,
        width: 8,
        height: 12,
        keyColor: 'gold' // Unlocks golden castle
    });
    
    // Key 2 - Room 3 (dragon room)
    objects.push({
        id: 'key_2',
        type: 'key',
        x: CANVAS_WIDTH / 2 - 4,
        y: CANVAS_HEIGHT / 2 - 30,
        roomId: 3,
        carriedBy: null,
        color: COLORS.YELLOW,
        width: 8,
        height: 12,
        keyColor: 'gold' // Unlocks golden castle
    });
    
    // Enchanted Chalice (goal) - Room 4
    objects.push({
        id: 'chalice',
        type: 'chalice',
        x: CANVAS_WIDTH / 2 - 6,
        y: CANVAS_HEIGHT / 2 - 6,
        roomId: 4,
        carriedBy: null,
        color: COLORS.GOLD,
        width: 12,
        height: 12
    });
}

// Initialize dragons
function initDragons() {
    dragons = [];
    
    // Yorgle (Red Dragon) - Room 2
    dragons.push({
        id: 'yorgle',
        name: 'Yorgle',
        x: CANVAS_WIDTH / 2 - 6,
        y: CANVAS_HEIGHT / 2 + 30,
        roomId: 2,
        speed: 1.5,
        color: COLORS.RED,
        width: 12,
        height: 12,
        alive: true,
        carriedObject: null
    });
    
    // Grundle (Green Dragon) - Room 3
    dragons.push({
        id: 'grundle',
        name: 'Grundle',
        x: CANVAS_WIDTH / 2 - 6,
        y: CANVAS_HEIGHT / 2 + 30,
        roomId: 3,
        speed: 1.5,
        color: COLORS.GREEN,
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
    currentRoomId = 1; // Start in hub room (Room 1)
    player.x = CANVAS_WIDTH / 2 - 4;
    player.y = CANVAS_HEIGHT / 2 - 4;
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
    
    // Gate collision (if locked) - Golden Castle gate at bottom
    if (room.isCastle && room.gateLocked && currentRoomId === 0) {
        const castleX = 120;
        const castleY = 60;
        const castleW = 240;
        const gateY = castleY + 180 - WALL_THICKNESS;
        const gateX = castleX + castleW / 2 - DOOR_WIDTH / 2;
        
        if (player.x < gateX + DOOR_WIDTH &&
            player.x + player.width > gateX &&
            player.y < gateY + WALL_THICKNESS &&
            player.y + player.height > gateY) {
            // Check if player has matching key
            if (player.inventory && player.inventory.type === 'key') {
                const keyColor = player.inventory.keyColor;
                if (keyColor === 'gold' || keyColor === room.castleColor) {
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
    
    // Room transitions (check doorways)
    const doorCenterX = CANVAS_WIDTH / 2;
    const doorCenterY = CANVAS_HEIGHT / 2;
    const doorHalfWidth = DOOR_WIDTH / 2;
    
    // Check west exit (left wall)
    if (player.x < WALL_THICKNESS && room.exits.west !== null) {
        const playerCenterY = player.y + player.height / 2;
        if (playerCenterY > doorCenterY - doorHalfWidth && playerCenterY < doorCenterY + doorHalfWidth) {
            currentRoomId = room.exits.west;
            player.x = CANVAS_WIDTH - WALL_THICKNESS - player.width - 5;
            playBeep(300, 0.1);
        }
    }
    
    // Check east exit (right wall)
    if (player.x + player.width > CANVAS_WIDTH - WALL_THICKNESS && room.exits.east !== null) {
        const playerCenterY = player.y + player.height / 2;
        if (playerCenterY > doorCenterY - doorHalfWidth && playerCenterY < doorCenterY + doorHalfWidth) {
            currentRoomId = room.exits.east;
            player.x = WALL_THICKNESS + 5;
            playBeep(300, 0.1);
        }
    }
    
    // Check north exit (top wall)
    if (player.y < WALL_THICKNESS && room.exits.north !== null) {
        const playerCenterX = player.x + player.width / 2;
        if (playerCenterX > doorCenterX - doorHalfWidth && playerCenterX < doorCenterX + doorHalfWidth) {
            currentRoomId = room.exits.north;
            player.y = CANVAS_HEIGHT - WALL_THICKNESS - player.height - 5;
            playBeep(300, 0.1);
        }
    }
    
    // Check south exit (bottom wall)
    if (player.y + player.height > CANVAS_HEIGHT - WALL_THICKNESS && room.exits.south !== null) {
        const playerCenterX = player.x + player.width / 2;
        if (playerCenterX > doorCenterX - doorHalfWidth && playerCenterX < doorCenterX + doorHalfWidth) {
            currentRoomId = room.exits.south;
            player.y = WALL_THICKNESS + 5;
            playBeep(300, 0.1);
        }
    }
    
    // Keep player in bounds
    player.x = Math.max(WALL_THICKNESS, Math.min(CANVAS_WIDTH - WALL_THICKNESS - player.width, player.x));
    player.y = Math.max(WALL_THICKNESS, Math.min(CANVAS_HEIGHT - WALL_THICKNESS - player.height, player.y));
    
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
    
    // Castle gate (if locked) - Golden Castle
    if (room.isCastle && room.gateLocked && currentRoomId === 0) {
        const castleX = 120;
        const castleY = 60;
        const castleW = 240;
        const gateY = castleY + 180 - WALL_THICKNESS;
        const gateX = castleX + castleW / 2 - DOOR_WIDTH / 2;
        ctx.fillStyle = COLORS.GOLD;
        ctx.fillRect(gateX, gateY, DOOR_WIDTH, WALL_THICKNESS);
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
