// Game configuration
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 50;
const MOVE_SPEED = 5;

// Game state
let canvas, ctx;
let characterScreen, menuScreen, gameScreen;
let peer, connection;
let isHost = false;
let roomCode = '';
let selectedCharacter = null;
let opponentCharacter = null;
let mainMusic;

// Sprite images
let sprites = {
    kirby: null,
    chicken: null
};

// Player data
let player1 = {
    x: 100,
    y: 300,
    character: 'kirby',
    keys: { w: false, a: false, s: false, d: false }
};

let player2 = {
    x: 700,
    y: 300,
    character: 'chicken',
    keys: { w: false, a: false, s: false, d: false }
};

// Initialize when page loads
window.addEventListener('load', init);

function init() {
    // Get DOM elements
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    characterScreen = document.getElementById('character-screen');
    menuScreen = document.getElementById('menu-screen');
    gameScreen = document.getElementById('game-screen');
    mainMusic = document.getElementById('main-music');

    // Load sprites
    loadSprites();

    // Setup character selection
    setupCharacterSelection();

    // Setup menu buttons
    document.getElementById('create-room-btn').addEventListener('click', createRoom);
    document.getElementById('join-code-btn').addEventListener('click', joinRoom);
    document.getElementById('random-match-btn').addEventListener('click', randomMatch);
    document.getElementById('leave-btn').addEventListener('click', leaveGame);
    document.getElementById('back-to-character-btn').addEventListener('click', backToCharacterSelect);

    // Setup keyboard controls
    setupControls();
    
    // Setup mobile controls
    setupMobileControls();

    // Music toggle with L key
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'l') {
            if (mainMusic.paused) {
                mainMusic.play().catch(err => console.log('Music play failed:', err));
            } else {
                mainMusic.pause();
            }
        }
    });

    // Initialize PeerJS
    initPeer();
}

function loadSprites() {
    sprites.kirby = new Image();
    sprites.kirby.src = '../../BQX assets/Game Assets/Birds/Admin/Kirby/kirby Sprites.png';
    
    sprites.chicken = new Image();
    sprites.chicken.src = '../../BQX assets/Game Assets/Birds/Chicken/Chicken Idle.png';
}

function setupCharacterSelection() {
    const characterCards = document.querySelectorAll('.character-card');
    const confirmBtn = document.getElementById('confirm-character-btn');

    characterCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove previous selection
            characterCards.forEach(c => c.classList.remove('selected'));
            // Add selection to clicked card
            card.classList.add('selected');
            selectedCharacter = card.getAttribute('data-character');
            confirmBtn.disabled = false;
        });
    });

    confirmBtn.addEventListener('click', () => {
        if (selectedCharacter) {
            characterScreen.style.display = 'none';
            menuScreen.style.display = 'block';
            // Try to start music
            mainMusic.play().catch(err => console.log('Music play failed:', err));
        }
    });
}

function backToCharacterSelect() {
    menuScreen.style.display = 'none';
    characterScreen.style.display = 'block';
    document.getElementById('your-room-code').innerHTML = '';
    document.getElementById('room-code').value = '';
    showStatus('', '');
}

function initPeer() {
    peer = new Peer();
    
    peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
    });

    peer.on('connection', (conn) => {
        handleConnection(conn);
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showStatus('Connection error: ' + err.type, 'error');
    });
}

function createRoom() {
    if (!peer || !peer.id) {
        showStatus('Initializing connection...', 'info');
        setTimeout(createRoom, 1000);
        return;
    }

    isHost = true;
    roomCode = peer.id;
    
    document.getElementById('your-room-code').innerHTML = 
        `Your Room Code: <strong>${roomCode}</strong><br>Share this code with your friend!`;
    showStatus('Waiting for player to join...', 'info');
}

function joinRoom() {
    const code = document.getElementById('room-code').value.trim();
    
    if (!code) {
        showStatus('Please enter a room code', 'error');
        return;
    }

    if (!peer || !peer.id) {
        showStatus('Initializing connection...', 'info');
        setTimeout(joinRoom, 1000);
        return;
    }

    isHost = false;
    roomCode = code;
    
    showStatus('Connecting to room...', 'info');
    connection = peer.connect(code);
    handleConnection(connection);
}

function randomMatch() {
    showStatus('Random matching not implemented in demo. Use "Create Room" or "Join with Code" instead.', 'info');
    // In a real implementation, this would connect to a matchmaking server
}

function handleConnection(conn) {
    connection = conn;

    connection.on('open', () => {
        showStatus('Connected! Exchanging character info...', 'success');
        document.getElementById('room-display').textContent = `Room: ${roomCode.substring(0, 8)}...`;
        
        // Send character selection
        connection.send({
            type: 'character',
            character: selectedCharacter
        });
    });

    connection.on('data', (data) => {
        handleNetworkData(data);
    });

    connection.on('close', () => {
        showStatus('Player disconnected', 'error');
        setTimeout(leaveGame, 2000);
    });

    connection.on('error', (err) => {
        console.error('Connection error:', err);
        showStatus('Connection failed', 'error');
    });
}

function handleNetworkData(data) {
    if (data.type === 'position') {
        // Update opponent's position
        if (isHost) {
            player2.x = data.x;
            player2.y = data.y;
        } else {
            player1.x = data.x;
            player1.y = data.y;
        }
    } else if (data.type === 'character') {
        // Receive opponent's character
        opponentCharacter = data.character;
        showStatus('Starting game...', 'success');
        
        // Set characters
        if (isHost) {
            player1.character = selectedCharacter;
            player2.character = opponentCharacter;
        } else {
            player2.character = selectedCharacter;
            player1.character = opponentCharacter;
        }
        
        setTimeout(() => {
            startGame();
        }, 1000);
    }
}

function startGame() {
    menuScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    // Reset positions
    player1.x = 100;
    player1.y = 300;
    player2.x = 700;
    player2.y = 300;
    
    gameLoop();
}

function setupControls() {
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        const myPlayer = isHost ? player1 : player2;
        
        if (key === 'w') myPlayer.keys.w = true;
        if (key === 'a') myPlayer.keys.a = true;
        if (key === 's') myPlayer.keys.s = true;
        if (key === 'd') myPlayer.keys.d = true;
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        const myPlayer = isHost ? player1 : player2;
        
        if (key === 'w') myPlayer.keys.w = false;
        if (key === 'a') myPlayer.keys.a = false;
        if (key === 's') myPlayer.keys.s = false;
        if (key === 'd') myPlayer.keys.d = false;
    });
}

function setupMobileControls() {
    const buttons = document.querySelectorAll('.control-btn');
    
    buttons.forEach(button => {
        const key = button.getAttribute('data-key');
        
        // Touch start - key down
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = true;
        });
        
        // Touch end - key up
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = false;
        });
        
        // Touch cancel - key up
        button.addEventListener('touchcancel', (e) => {
            e.preventDefault();
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = false;
        });
        
        // Also support mouse for testing
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = true;
        });
        
        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = false;
        });
        
        button.addEventListener('mouseleave', (e) => {
            const myPlayer = isHost ? player1 : player2;
            myPlayer.keys[key] = false;
        });
    });
}

function updatePlayer(player) {
    if (player.keys.w) player.y -= MOVE_SPEED;
    if (player.keys.s) player.y += MOVE_SPEED;
    if (player.keys.a) player.x -= MOVE_SPEED;
    if (player.keys.d) player.x += MOVE_SPEED;

    // Keep player in bounds
    player.x = Math.max(0, Math.min(CANVAS_WIDTH - PLAYER_SIZE, player.x));
    player.y = Math.max(0, Math.min(CANVAS_HEIGHT - PLAYER_SIZE, player.y));
}

function sendPosition(player) {
    if (connection && connection.open) {
        connection.send({
            type: 'position',
            x: player.x,
            y: player.y
        });
    }
}

function gameLoop() {
    if (gameScreen.style.display === 'none') return;

    // Update my player
    const myPlayer = isHost ? player1 : player2;
    updatePlayer(myPlayer);
    sendPosition(myPlayer);

    // Clear canvas with sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#E0F6FF');
    gradient.addColorStop(1, '#90EE90');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw clouds
    drawClouds();

    // Draw players
    drawBird(player1.x, player1.y, player1.character, 'P1');
    drawBird(player2.x, player2.y, player2.character, 'P2');

    requestAnimationFrame(gameLoop);
}

function drawClouds() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    // Simple cloud shapes
    const time = Date.now() * 0.0001;
    for (let i = 0; i < 5; i++) {
        const x = ((time * 20 + i * 200) % (CANVAS_WIDTH + 100)) - 50;
        const y = 50 + i * 80;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawBird(x, y, character, label) {
    const sprite = sprites[character];
    
    if (sprite && sprite.complete) {
        // Draw sprite
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sprite, x, y, PLAYER_SIZE, PLAYER_SIZE);
    } else {
        // Fallback if sprite not loaded
        ctx.fillStyle = character === 'kirby' ? '#FF69B4' : '#FFD700';
        ctx.fillRect(x, y, PLAYER_SIZE, PLAYER_SIZE);
    }
    
    // Draw border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, PLAYER_SIZE, PLAYER_SIZE);
    
    // Draw label
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.strokeText(label, x + PLAYER_SIZE / 2, y - 20);
    ctx.fillText(label, x + PLAYER_SIZE / 2, y - 20);
}

function showStatus(message, type) {
    const statusDiv = document.getElementById('connection-status');
    statusDiv.textContent = message;
    statusDiv.style.background = 
        type === 'error' ? 'rgba(244, 67, 54, 0.3)' :
        type === 'success' ? 'rgba(76, 175, 80, 0.3)' :
        'rgba(255, 255, 255, 0.2)';
}

function leaveGame() {
    if (connection) {
        connection.close();
    }
    
    gameScreen.style.display = 'none';
    characterScreen.style.display = 'block';
    
    document.getElementById('your-room-code').innerHTML = '';
    document.getElementById('room-code').value = '';
    showStatus('', '');
    
    roomCode = '';
    isHost = false;
    selectedCharacter = null;
    opponentCharacter = null;
    
    // Reset character selection
    document.querySelectorAll('.character-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('confirm-character-btn').disabled = true;
}
