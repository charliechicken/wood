const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Define GRASS_HEIGHT first
const GRASS_HEIGHT = canvas.height / 2 - 37.5;

function calculateGroundLevel() {
    return canvas.height - GRASS_HEIGHT;
}

var spawnX = 50;
var spawnY = canvas.height - GRASS_HEIGHT - 75;
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000 / 60;
let lastRenderTime = 0;
const TARGET_FPS = 144;
const FRAME_TIME = 1000 / TARGET_FPS;
const TIME_STEP = 1 / TARGET_FPS;
const PARKOUR_OBJECT_SIZE = 75;
const messages = [];

document.addEventListener("DOMContentLoaded", () => {
    // Add chat functionality
document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const input = e.target;
        const message = input.value.trim();
                players[myPlayerId] = localPlayer;
        if (message && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'chat',
                playerId: myPlayerId,
                playerName: playerName,
                message: message
            }));
            input.value = '';
            }
        }
    });
});
    const backgroundMusic = document.getElementById("backgroundMusic");
    const startButton = document.getElementById("startGameButton");
    const youtubeLinkInput = document.getElementById("youtubeLinkInput");
    const loadYouTubeButton = document.getElementById("loadYouTubeButton");
    const youtubePlayer = document.getElementById("youtubePlayer");

    document.querySelectorAll('#iconSelection img').forEach(img => {
        img.addEventListener('click', () => {
            // Remove selected class from all icons
            document.querySelectorAll('#iconSelection img').forEach(i => i.classList.remove('selected'));
            // Add selected class to clicked icon
            img.classList.add('selected');
            playerIcon = img.getAttribute('data-icon');
        });
    });

    startButton.addEventListener("click", () => {
        backgroundMusic.volume = 0.2;
        backgroundMusic.loop = true;
        backgroundMusic.play()
            .then(() => {
                startButton.style.display = "none";
                document.getElementById('startScreen').style.display = 'none';
    
                myPlayerId = Math.random().toString(36).substring(2, 15);
                playerName = document.getElementById('playerNameInput').value || 'Player';
                
                const selectedIcon = document.querySelector('#iconSelection img.selected');
                playerIcon = selectedIcon ? selectedIcon.getAttribute('data-icon') : 'hawktuah.png';
                
                // Only create the local player, don't add to players object yet
                localPlayer = new Player(myPlayerId, spawnX, spawnY, 75, 75, playerIcon, playerName);
                controllers[myPlayerId] = new Controller(myPlayerId);
                
                // Initialize chat after game starts
                // Add global chat toggle
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const chatContainer = document.getElementById('chatContainer');
        const chatInput = document.getElementById('chatInput');
        
        if (chatContainer.style.display === 'none') {
            // Show chat and focus input
            chatContainer.style.display = 'block';
            chatInput.focus();
        } else if (document.activeElement === chatInput) {
            // Send message and hide chat
            const message = chatInput.value.trim();
            if (message && ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    type: 'chat',
                    playerId: myPlayerId,
                    playerName: playerName,
                    message: message
                }));
                chatInput.value = '';
            }
            chatContainer.style.display = 'none';
        }
    } else if (e.key === 'Escape' && document.getElementById('chatContainer').style.display === 'block') {
        // Hide chat on escape
        document.getElementById('chatContainer').style.display = 'none';
    }
});
                
                connectToServer();
                gameStarted = true;
                requestAnimationFrame(gameLoop);
            })
            .catch(error => {
                console.error("Failed to play background music:", error);
            });
    });

    loadYouTubeButton.addEventListener("click", () => {
        const youtubeUrl = youtubeLinkInput.value;
        if (youtubeUrl) {

            const videoId = youtubeUrl.split("v=")[1];
            if (videoId) {
                youtubePlayer.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`
            } else {
                alert("Invalid YouTube URL");
            }
        }
    });

// Add after the existing variable declarations
let ws;
let localPlayer;
const players = {};

function connectToServer() {
    ws = new WebSocket('ws://localhost:3000');

    ws.onopen = () => {
        console.log('Connected to server');
        ws.send(JSON.stringify({
            type: 'join',
            playerId: myPlayerId,
            x: spawnX,
            y: spawnY,
            name: playerName,
            icon: playerIcon  // Make sure playerIcon includes the full path to the image
        }));
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch(data.type) {
            case 'allPlayers':
                // Clear all existing players
                Object.keys(players).forEach(id => delete players[id]);
                
                // Add only other players
                Object.entries(data.players).forEach(([id, playerData]) => {
                    if (id !== myPlayerId) {
                        players[id] = new Player(
                            id,
                            playerData.x,
                            playerData.y,
                            75,
                            75,
                            playerData.icon,
                            playerData.name,
                            0.5
                        );
                    }
                });
                break;
    
            case 'playerJoined':
                if (data.id !== myPlayerId) {
                    players[data.id] = new Player(
                        data.id,
                        data.x,
                        data.y,
                        75,
                        75,
                        data.icon,
                        data.name,
                        0.5
                    );
                }
                break;
    
            case 'playerMoved':
                if (data.id !== myPlayerId) {
                    const player = players[data.id];
                    if (player) {
                        player.x = data.x;
                        player.y = data.y;
                        player.speedX = data.speedX;
                        player.speedY = data.speedY;
                    }
                }
                break;
    
            case 'playerLeft':
                if (players[data.id]) {
                    delete players[data.id];
                }
                case 'chatMessage':
                    messages.push(new Message(`${data.playerName}: ${data.message}`, data.playerId));
                    break;
        }
    };

    ws.onclose = () => {
        console.log('Disconnected from server');
        setTimeout(connectToServer, 1000);
    };
}

let playerName = "";
let playerIcon = "";
let playerIconHTML;
let myPlayerId = null;
let gameStarted = false;
let cameraX = 0;
let cameraY = 0;
const groundLevel = canvas.height - GRASS_HEIGHT;

class Player {
    constructor(id, x, y, w, h, spritePath, name, opacity = 1) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.speedX = 0;
        this.speedY = 0;
        if(spritePath != "ray.png") {
            this.gravity = 0.6;
        } else {
            this.gravity = 1.5;
        }
        this.jumpSpeed = -15;
        this.sprite = new Image();
        this.sprite.src = spritePath;
        this.loaded = false;
        this.opacity = opacity;
        this.name = name;
        this.onObject = false;
        this.jumpCount = 0;
        this.maxJumps = 2;
        this.health = 100;

        this.sprite.onload = () => {
            this.loaded = true;
        };
    }

    draw() {
        if (this.loaded) {
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(this.sprite, this.x - cameraX, this.y - cameraY, this.w, this.h);
            
            // Draw player name
            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x - cameraX + this.w / 2, this.y - cameraY - 10);
            
            ctx.globalAlpha = 1;
        }
    }

    update(parkourObjects, deltaTime) {
        // Apply horizontal movement with adjusted speed
        this.x += this.speedX * deltaTime * 60;
        
        // Check horizontal collisions
        for (let obj of parkourObjects) {
            if (this.collidesWith(obj)) {
                if (this.speedX > 0) {
                    this.x = obj.x - this.w;
                } else if (this.speedX < 0) {
                    this.x = obj.x + obj.w;
                }
            }
        }
        
        // Apply vertical movement
        this.y += this.speedY * deltaTime * 60;
        this.speedY += this.gravity * deltaTime * 60;
        
        // Check vertical collisions
        for (let obj of parkourObjects) {
            if (this.collidesWith(obj)) {
                if (this.speedY > 0) {
                    this.y = obj.y - this.h;
                    this.speedY = 0;
                    this.jumpCount = 0;
                    this.onObject = true;
                } else if (this.speedY < 0) {
                    this.y = obj.y + obj.h;
                    this.speedY = 0;
                }
            }
        }
        
        // Ground collision
        const onGround = this.y + this.h >= canvas.height - GRASS_HEIGHT;
        if (onGround) {
            this.y = canvas.height - this.h - GRASS_HEIGHT;
            this.speedY = 0;
            this.jumpCount = 0;
            this.onObject = false;
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.w &&
            this.x + this.w > obj.x &&
            this.y < obj.y + obj.h &&
            this.y + this.h > obj.y;
    }

    jump() {

        const onGround = this.y + this.h >= canvas.height - GRASS_HEIGHT;

        if (onGround) {
            this.jumpCount = 0;
        }

        const canJump = (this.jumpCount < this.maxJumps);
        console.log("yo: " + this.jumpCount);

        if (canJump) {
            this.speedY = this.jumpSpeed;
            this.jumpCount++;
        }
    }
}

class Message {
    constructor(text, playerId, duration = 3000) {
        this.text = text;
        this.playerId = playerId;
        this.createdAt = Date.now();
        this.duration = duration;
    }

    draw() {
        const player = this.playerId === myPlayerId ? localPlayer : players[this.playerId];
        if (!player) return;

        ctx.save();
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        
        // Draw text background
        const metrics = ctx.measureText(this.text);
        const padding = 5;
        const bgWidth = metrics.width + padding * 2;
        const bgHeight = 25;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
            player.x + player.w/2 - bgWidth/2 - cameraX,
            player.y - 45 - cameraY,
            bgWidth,
            bgHeight
        );
        
        // Draw text
        ctx.fillStyle = 'white';
        ctx.fillText(
            this.text,
            player.x + player.w/2 - cameraX,
            player.y - 30 - cameraY
        );
        ctx.restore();
    }

    isExpired() {
        return Date.now() - this.createdAt > this.duration;
    }
}

class ParkourObject {
    constructor(img, x, y, w, h, color, isMoving = false, minX = 0, maxX = 0, speed = 0, isTeleporter = false, teleportX = 0, teleportY = 0) {
        this.img = new Image();
        this.img.src = img;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.isMoving = isMoving;
        this.minX = minX;
        this.maxX = maxX;
        this.speed = speed;
        this.direction = 1;
        this.isTeleporter = isTeleporter;
        this.teleportX = teleportX;
        this.teleportY = teleportY;
        this.teleported = false; // New flag to track teleportation state
    }

    // Collision detection method for the parkour object
    collidesWith(player) {
        return player.x < this.x + this.w &&
               player.x + player.w > this.x &&
               player.y < this.y + this.h &&
               player.y + player.h > this.y;
    }
    

    update(player) {
        const deltaTime = 1/60;
        
        // Handle moving objects with normalized speed
        if (this.isMoving) {
            // Reduce base speed and apply deltaTime
            const baseSpeed = 6; // Adjust this value to control platform speed
            this.x += baseSpeed * this.direction * deltaTime * 60;
    
            if (this.x <= this.minX || this.x + this.w >= this.maxX) {
                this.direction *= -1;
            }
        }
    
        // Check for teleportation collision
        if (this.isTeleporter && this.collidesWith(player) && !this.teleported) {
            player.x = this.teleportX;
            player.y = this.teleportY;
            this.teleported = true;
        }
    
        if (!this.collidesWith(player) && this.teleported) {
            this.teleported = false;
        }
    
        this.draw();
    }
    

    draw() {
        ctx.fillStyle = this.color;
        ctx.drawImage(this.img, this.x - cameraX, this.y - cameraY, this.w, this.h);
    }
}


class Controller {
    constructor(playerId) {
        this.playerId = playerId;
        this.up = false;
        this.right = false;
        this.left = false;

        let keyEvent = (e) => {
            if (this.playerId === myPlayerId) {
                if (e.code === "KeyW" || e.code === "ArrowUp" || e.code === "Space") {
                    this.up = e.type === 'keydown';
                }
                if (e.code === "KeyD" || e.code === "ArrowRight") {
                    this.right = e.type === 'keydown';
                }
                if (e.code === "KeyA" || e.code === "ArrowLeft") {
                    this.left = e.type === 'keydown';
                }
            }
        };

        addEventListener('keydown', keyEvent);
        addEventListener('keyup', keyEvent);
    }
}

const parkourObjects = [

    new ParkourObject("platform_inner_repeating.png", 200, canvas.height - GRASS_HEIGHT - 150, 75, 75, 'brown', true, 0, 500, 5),
    new ParkourObject("platform_inner_repeating.png", 500, canvas.height - GRASS_HEIGHT - 175, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 850, canvas.height - GRASS_HEIGHT - 225, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 1200, canvas.height - GRASS_HEIGHT - 300, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 1600, canvas.height - GRASS_HEIGHT - 400, 75, 75, 'brown', true, 1500, 2000, 5),
    new ParkourObject("platform_inner_repeating.png", 2000, canvas.height - GRASS_HEIGHT - 500, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 2400, canvas.height - GRASS_HEIGHT - 600, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 2800, canvas.height - GRASS_HEIGHT - 700, 75, 75, 'brown', true, 2600, 3100, 5),
    new ParkourObject("platform_inner_repeating.png", 3200, canvas.height - GRASS_HEIGHT - 800, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 3100, canvas.height - GRASS_HEIGHT - 1150, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 3500, canvas.height - GRASS_HEIGHT - 1000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 3700, canvas.height - GRASS_HEIGHT - 1150, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 3900, canvas.height - GRASS_HEIGHT - 1200, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 4000, canvas.height - GRASS_HEIGHT - 1350, 75, 75, 'brown'),

    new ParkourObject("stephen.jpeg", -1275, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1350, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1425, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1500, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1575, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1650, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1725, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1800, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1875, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -1950, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2025, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2100, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2175, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2250, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2325, canvas.height - GRASS_HEIGHT - 33300, 75, 75, 'yellow'),
    new ParkourObject("stephen.jpeg", -2325, canvas.height - GRASS_HEIGHT - 33800, 200, 200, 'yellow'),

    new ParkourObject("platform_inner_repeating.png", 4200, canvas.height - GRASS_HEIGHT - 1400, 75, 75, 'brown', true, 4200, 4500, 3),
    new ParkourObject("platform_inner_repeating.png", 4500, canvas.height - GRASS_HEIGHT - 1500, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 4700, canvas.height - GRASS_HEIGHT - 1600, 75, 75, 'brown', true, 4700, 5100, 7),
    new ParkourObject("platform_inner_repeating.png", 5000, canvas.height - GRASS_HEIGHT - 1700, 75, 75, 'brown', true, 5000, 5200, 4, true),
    new ParkourObject("platform_inner_repeating.png", 5300, canvas.height - GRASS_HEIGHT - 1800, 75, 75, 'brown', true, 5200, 5400, 6, true),
    new ParkourObject("platform_inner_repeating.png", 5600, canvas.height - GRASS_HEIGHT - 1900, 75, 75, 'brown', true, 5500, 5800, 5),
    new ParkourObject("platform_inner_repeating.png", 5900, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 5975, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6050, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6125, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6200, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6275, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6350, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("platform_inner_repeating.png", 6425, canvas.height - GRASS_HEIGHT - 2000, 75, 75, 'brown'),
    new ParkourObject("portal_sprite.png", -1510, canvas.height - GRASS_HEIGHT - 150, 125, 150, 'blue', false, 0, 0, 0, true, 8000, canvas.height - GRASS_HEIGHT - 300),
];

const cloudImage = new Image();
cloudImage.src = 'cloud.png';

class Cloud {
    constructor() {

        this.startSide = Math.random() < 0.001 ? 'left' : 'right';

        if (this.startSide === 'left') {
            this.x = -Math.random() * 200 - 100;
        } else {
            this.x = canvas.width + Math.random() * 100;
        }

        this.y = Math.random() * (canvas.height / 5);

        this.speed = Math.random() * 2 + 1;

        this.width = Math.random() * 100 + 100;
        this.height = this.width * 0.6;

        this.verticalSpeed = Math.random() * 0.2 - 0.1;
    }

    update() {

        if (this.startSide === 'left') {
            this.x += this.speed;
        } else {
            this.x -= this.speed;
        }

        this.y += this.verticalSpeed;

        if (this.x + this.width < 0 || this.x > canvas.width) {
            this.reset();
        }
    }

    reset() {

        this.startSide = Math.random() < 0.2 ? 'left' : 'right';

        if (this.startSide === 'left') {
            this.x = -Math.random() * 200 - 100;
        } else {
            this.x = canvas.width + Math.random() * 100;
        }

        this.y = Math.random() * (canvas.height / 3);

        this.speed = Math.random() * 2 + 1;

        this.width = Math.random() * 100 + 100;
        this.height = this.width * 0.6;

        this.verticalSpeed = Math.random() * 0.2 - 0.1;
    }

    draw() {
        ctx.drawImage(cloudImage, this.x, this.y, this.width, this.height);
    }
}

const maxClouds = 3;
let clouds = [];

function spawnClouds() {
    if (Math.random() < 0.001) {
        if (clouds.length < maxClouds) {
            clouds.push(new Cloud());
        }
    }
}

function updateClouds() {
    clouds.forEach(cloud => {
        cloud.update();
        cloud.draw();
    });
}

const canvasWidth = canvas.width;
const canvasHeight = canvas.height;

const spikeHeight = 50;
const spikeWidth = 50;
const spikeSpacing = 100;

const spikes = [];
for (let x = 200; x < 98000; x += spikeSpacing) {
    spikes.push({
        x,
        y: canvasHeight - GRASS_HEIGHT,
        w: spikeWidth,
        h: spikeHeight,
        type: 'spike'
    });
}

function drawSpikes(cameraX, cameraY) {
    ctx.fillStyle = 'gray';

    spikes.forEach(spike => {

        ctx.beginPath();
        ctx.moveTo(spike.x - cameraX, spike.y - cameraY);
        ctx.lineTo(spike.x - cameraX + spike.w / 2, spike.y - cameraY - spike.h);
        ctx.lineTo(spike.x - cameraX + spike.w, spike.y - cameraY);
        ctx.closePath();
        ctx.fill();
    });
}

function checkForSpikeCollision(player) {
    for (let i = 0; i < spikes.length; i++) {
        const spike = spikes[i];

        if (
            player.x + player.w > spike.x &&
            player.x < spike.x + spike.w &&
            player.y + player.h > spike.y - spike.h &&
            player.y + player.h < spike.y
        ) {
            return true;
        }
    }
    return false;
}

function resetPlayerPosition(player) {
    player.x = spawnX;
    player.y = spawnY;
    player.speedX = 0;
    player.speedY = 0;
    player.jumpCount = 0;
    player.opacity = 1;
}

class WindBlower {
    constructor(x, y, w, h, force) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.force = force;
        this.sprite = new Image();
        this.sprite.src = "windblower.png";
        this.loaded = false;
        this.sprite.onload = () => {
            this.loaded = true;
        };
    }

    affectsPlayer(player) {
        return player.x + player.w > this.x &&
            player.x < this.x + this.w &&
            player.y + player.h > this.y &&
            player.y < this.y + this.h;
    }

    applyEffect(player) {
        if (this.affectsPlayer(player)) {
            player.speedY = this.force;
        }
    }

    draw() {
        if (this.loaded) {
            ctx.drawImage(this.sprite, this.x - cameraX, this.y - cameraY, this.w, this.h)
        }
    }
}

const windblowers = [
    new WindBlower(1000, canvas.height - GRASS_HEIGHT - 200, 200, 50, -15),
    new WindBlower(2200, canvas.height - GRASS_HEIGHT - 350, 200, 50, -20),
    new WindBlower(-1000, GRASS_HEIGHT, 200, 50, -200),
];

const controllers = {};

const icons = document.querySelectorAll('.icon');
icons.forEach(icon => {
    icon.addEventListener('click', function() {

        icons.forEach(i => i.classList.remove('selected'));

        this.classList.add('selected');
        playerIcon = this.getAttribute('data-icon');
        playerIconHTML = this.getAttribute('id') + ".png";
        document.getElementById('startGameButton').disabled = !playerIcon;
    });
});

document.getElementById('startGameButton').addEventListener('click', () => {
    playerName = document.getElementById('playerNameInput').value;
    if (!playerName || !playerIcon) return;

    document.getElementById('startScreen').style.display = 'none';

    myPlayerId = Math.random().toString(36).substring(2, 15);
    players[myPlayerId] = new Player(myPlayerId, 50, canvas.height - GRASS_HEIGHT - 150, 75, 75, playerIcon, playerName);
    controllers[myPlayerId] = new Controller(myPlayerId);
    gameStarted = true;

    requestAnimationFrame(gameLoop);
});

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.w = 50;
        this.h = 50;
        this.initialX = x;
        this.initialY = y;
        this.lastShot = 0;
        this.shootInterval = 2000;
    }

    update(player, deltaTime) {
        if (!player || player.health <= 0) return;
        
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 400) { // Detection range
            // Move towards player with deltaTime
            const speed = 2;
            this.x += (dx / distance) * speed * deltaTime * 60;
            this.y += (dy / distance) * speed * deltaTime * 60;

            // Shooting logic
            const now = Date.now();
            if (now - this.lastShot > this.shootInterval) {
                this.shoot(localPlayer); // Changed from player to localPlayer
                this.lastShot = now;
            }
        }
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - cameraX, this.y - cameraY, this.w, this.h);
    }

    shoot(player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const angle = Math.atan2(dy, dx);
        const speed = 5;
        const velocityX = Math.cos(angle) * speed;
        const velocityY = Math.sin(angle) * speed;

        projectiles.push({
            x: this.x + this.w/2,
            y: this.y + this.h/2,
            velocityX: velocityX,
            velocityY: velocityY,
            w: 10,
            h: 10,
            update(deltaTime) {
                this.x += this.velocityX * deltaTime * 60;
                this.y += this.velocityY * deltaTime * 60;
                
                // Check collision with local player
                if (this.collidesWith(localPlayer)) {
                    handlePlayerDeath();
                    return false;
                }
                return true;
            },
            draw() {
                ctx.fillStyle = 'red';
                ctx.beginPath();
                ctx.arc(this.x - cameraX, this.y - cameraY, 5, 0, Math.PI * 2);
                ctx.fill();
            },
            collidesWith(player) {
                return (
                    this.x < player.x + player.w &&
                    this.x + this.w > player.x &&
                    this.y < player.y + player.h &&
                    this.y + this.h > player.y
                );
            }
        });
    }

    reset() {
        this.x = this.initialX;
        this.y = this.initialY;
        this.lastShot = 0;
    }
}

class Projectile {
    constructor(x, y, speedX, speedY) {
        this.x = x;
        this.y = y;
        this.w = 10;
        this.h = 10;
        this.speedX = speedX;
        this.speedY = speedY;
    }

    update(deltaTime) {
        this.x += this.speedX * deltaTime * 60;
        this.y += this.speedY * deltaTime * 60;

        // Check collision with local player
        if (this.collidesWith(localPlayer)) {
            localPlayer.health = 0; // Set health to 0 to trigger death
            handlePlayerDeath();
            return false; // Return false to remove projectile
        }

        return true; // Keep projectile alive
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x - cameraX, this.y - cameraY, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    collidesWith(player) {
        return (
            this.x < player.x + player.w &&
            this.x + this.w > player.x &&
            this.y < player.y + player.h &&
            this.y + this.h > player.y
        );
    }
}

// Instantiate enemies with defined boundaries and detection radius
const enemies = [
    new Enemy(1000, canvas.height - GRASS_HEIGHT - 200),
    new Enemy(3000, canvas.height - GRASS_HEIGHT - 800),
    new Enemy(4000, canvas.height - GRASS_HEIGHT - 1700),
    new Enemy(5500, canvas.height - GRASS_HEIGHT - 2450)
];

// Function to reset the game when the player dies (including enemies and projectiles)
function resetGame() {
    // Reset all enemies to their initial positions and clear projectiles
    enemies.forEach(enemy => {
        enemy.reset();
    });

    // Clear all projectiles globally
    projectiles.length = 0;

    // Reset player position using localPlayer directly
    if (localPlayer) {
        resetPlayerPosition(localPlayer);
    }
}

// Example of handling player death
function handlePlayerDeath() {
    console.log("Player died! Resetting the game...");
    resetPlayerPosition(localPlayer);
    projectiles.length = 0; // Clear all projectiles
}

// Function to reset the player's position
function resetPlayerPosition(player) {
    // Set the player's position back to the starting position or spawn point
    player.x = spawnX;  // Adjust this to the player's spawn position
    player.y = spawnY;  // Adjust this to the ground level
    player.health = 100;  // Reset health or other status variables
}

function checkForDeathConditions() {
    if (!localPlayer) return;

    // Check if the player hits the spikes (or any other death condition)
    if (checkForSpikeCollision(localPlayer)) {
        console.log("Player hit the spikes! Resetting to start.");
        handlePlayerDeath();
    }

    // Check if player's health reaches 0
    if (localPlayer.health <= 0) {
        console.log("Player health reached 0! Resetting to start.");
        handlePlayerDeath();
    }
}




var projectiles = [];

// Call the death check function in your game loop
function gameLoop(timestamp) {
    if (!gameStarted || !localPlayer) {
        requestAnimationFrame(gameLoop);
        return;
    }

    requestAnimationFrame(gameLoop);

    // Calculate delta time
    const deltaTime = timestamp - lastRenderTime;
    
    if (deltaTime < FRAME_TIME) {
        return;
    }

    lastRenderTime = timestamp;
    
    // Clear only the visible area
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update game state with deltaTime
    updateGameState(deltaTime / 1000);
    
    // Render game state
    renderGame();
    
    // Network update
    updateNetwork();
}

function updateGameState(deltaTime) {
    if (localPlayer.health > 0) {
        localPlayer.speedX = 0;
        const controller = controllers[myPlayerId];

        if (controller.right) localPlayer.speedX = 7;
        if (controller.left) localPlayer.speedX = -7;
        if (controller.up) localPlayer.jump();

        // Pass deltaTime to update
        localPlayer.update(parkourObjects, deltaTime);
    }

    // Update camera position
    cameraX = localPlayer.x - canvas.width / 2 + localPlayer.w / 2;
    cameraY = localPlayer.y < canvas.height / 2 
        ? localPlayer.y - canvas.height / 2 + localPlayer.h / 2 
        : localPlayer.y - canvas.height / 2 + localPlayer.h / 2;

    // Update game objects with deltaTime
    parkourObjects.forEach(obj => obj.update(localPlayer, deltaTime));
    enemies.forEach(enemy => enemy.update(localPlayer, deltaTime));
    // Update and filter out collided projectiles
    projectiles = projectiles.filter(projectile => projectile.update(deltaTime));
}

function renderGame() {
    spawnClouds();
    updateClouds();

    const groundLevel = calculateGroundLevel();
    
    if (localPlayer.y + localPlayer.h < canvas.height) {
        // Draw dirt
        ctx.fillStyle = '#9b7a4b';
        ctx.fillRect(0, groundLevel - cameraY + 20, canvas.width, canvas.height / 2 - 37.5 - 20);

        // Draw grass gradient
        const grassGradient = ctx.createLinearGradient(0, groundLevel - cameraY, 0, groundLevel - cameraY + 20);
        grassGradient.addColorStop(0, '#6b8e23');
        grassGradient.addColorStop(1, '#9acd32');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, groundLevel - cameraY, canvas.width, 20);
    }

    if (localPlayer.y + localPlayer.h < canvas.height) {
        ctx.fillStyle = '#9b7a4b';
        ctx.fillRect(0, groundLevel - cameraY + 20, canvas.width, GRASS_HEIGHT - 20);

        const grassGradient = ctx.createLinearGradient(0, groundLevel - cameraY, 0, groundLevel - cameraY + GRASS_HEIGHT);
        grassGradient.addColorStop(0, '#6b8e23');
        grassGradient.addColorStop(1, '#9acd32');
        ctx.fillStyle = grassGradient;
        ctx.fillRect(0, groundLevel - cameraY, canvas.width, GRASS_HEIGHT);
    }

    // Draw game objects
    parkourObjects.forEach(obj => obj.draw());
    enemies.forEach(enemy => enemy.draw());
    projectiles.forEach(projectile => projectile.draw());

    // Draw all players (including local player) only once
    if (localPlayer) {
        localPlayer.draw();
    }
    Object.values(players).forEach(player => {
        if (player && player.id !== myPlayerId) {
            player.draw();
        }
    });

    // Draw effects
    if (localPlayer.health > 0) {
        windblowers.forEach(blower => {
            if (blower) {
                blower.applyEffect(localPlayer);
                blower.draw();
            }
        });
    }

        // Draw and cleanup messages
        messages.forEach((msg, index) => {
            if (msg.isExpired()) {
                messages.splice(index, 1);
            } else {
                msg.draw();
            }
        });

    drawSpikes(cameraX, cameraY);
    checkForDeathConditions();
}

function updateNetwork() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        const now = Date.now();
        if (now - lastUpdateTime > UPDATE_INTERVAL) {
            ws.send(JSON.stringify({
                type: 'update',
                playerId: myPlayerId,
                x: localPlayer.x,
                y: localPlayer.y,
                speedX: localPlayer.speedX,
                speedY: localPlayer.speedY
            }));
            lastUpdateTime = now;
        }
    }
}

window.addEventListener('resize', () => {
    // Store previous dimensions and states
    const prevWidth = canvas.width;
    const prevHeight = canvas.height;
    const prevGroundLevel = calculateGroundLevel();
    const wasOnGround = localPlayer.y + localPlayer.h >= prevGroundLevel;
    
    // Update canvas dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Get new ground level
    const groundLevel = calculateGroundLevel();
    
    // Keep parkour objects at original size and maintain relative positions
    parkourObjects.forEach((obj, index) => {
        obj.w = PARKOUR_OBJECT_SIZE;
        obj.h = PARKOUR_OBJECT_SIZE;
        
        // Calculate relative position from ground
        const prevRelativeY = prevGroundLevel - (obj.y + PARKOUR_OBJECT_SIZE);
        obj.y = groundLevel - prevRelativeY - PARKOUR_OBJECT_SIZE;
        
        // Scale X position
        obj.x = (obj.x / prevWidth) * canvas.width;
    });
    
    // Adjust player position
    if (localPlayer) {
        localPlayer.x = (localPlayer.x / prevWidth) * canvas.width;
        localPlayer.w = 75;
        localPlayer.h = 75;
        
        if (wasOnGround) {
            localPlayer.y = groundLevel - localPlayer.h;
            localPlayer.speedY = 0;
        } else {
            const prevRelativeY = prevGroundLevel - (localPlayer.y + localPlayer.h);
            localPlayer.y = groundLevel - prevRelativeY - localPlayer.h;
        }
    }
    
    // Update other players
    for (let id in players) {
        const player = players[id];
        const playerWasOnGround = player.y + player.h >= prevGroundLevel;
        
        player.x = (player.x / prevWidth) * canvas.width;
        player.w = 75;
        player.h = 75;
        
        if (playerWasOnGround) {
            player.y = groundLevel - player.h;
        } else {
            const prevRelativeY = prevGroundLevel - (player.y + player.h);
            player.y = groundLevel - prevRelativeY - player.h;
        }
    }

    // Add to resize handler before camera update
    spikes.forEach(spike => {
        // Keep original size relative to player size
        spike.w = 75 * 0.267;  // 20/75 ratio of original sizes
        spike.h = 75 * 0.267;
        
        // Scale X position
        spike.x = (spike.x / prevWidth) * canvas.width;
        
        // Maintain position relative to ground level
        const prevDistanceFromGround = prevGroundLevel - (spike.y + spike.h);
        spike.y = groundLevel - prevDistanceFromGround - spike.h;
    });
    
    // Update camera
    if (localPlayer) {
        cameraX = localPlayer.x - canvas.width / 2 + localPlayer.w / 2;
        cameraY = localPlayer.y < canvas.height / 2 
            ? localPlayer.y - canvas.height / 2 + localPlayer.h / 2 
            : localPlayer.y - canvas.height / 2 + localPlayer.h / 2;
    }
});

window.addEventListener('beforeunload', () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'leave',
            playerId: myPlayerId
        }));
    }
});