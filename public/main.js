const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var spawnX = 50;
const GRASS_HEIGHT = canvas.height / 2 - 37.5;
var spawnY = canvas.height - GRASS_HEIGHT - 150;

document.addEventListener("DOMContentLoaded", () => {
    const backgroundMusic = document.getElementById("backgroundMusic");
    const startButton = document.getElementById("startGameButton");
    const youtubeLinkInput = document.getElementById("youtubeLinkInput");
    const loadYouTubeButton = document.getElementById("loadYouTubeButton");
    const youtubePlayer = document.getElementById("youtubePlayer");

    startButton.addEventListener("click", () => {
        backgroundMusic.volume = 0.2;
        backgroundMusic.loop = true;
        backgroundMusic.play()
            .then(() => {
                startButton.style.display = "none";
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
});



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
        this.gravity = 0.6;
        this.jumpSpeed = -15;
        this.sprite = new Image();
        this.sprite.src = spritePath;
        this.loaded = false;
        this.opacity = opacity;
        this.name = name;
        this.onObject = false;
        this.jumpCount = 0;
        this.maxJumps = 2;

        this.sprite.onload = () => {
            this.loaded = true;
        };
    }

    draw() {
        if (this.loaded) {
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(this.sprite, this.x - cameraX, this.y - cameraY, this.w, this.h);
            ctx.globalAlpha = 1;

            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(this.name, this.x - cameraX + this.w / 2, this.y - cameraY - 10);
        }
    }

    update(parkourObjects) {

        this.x += this.speedX;

        for (let obj of parkourObjects) {
            if (this.collidesWith(obj)) {
                if (this.speedX > 0) {
                    this.x = obj.x - this.w;
                } else if (this.speedX < 0) {
                    this.x = obj.x + obj.w;
                }
            }
        }

        this.y += this.speedY;
        this.speedY += this.gravity;

        const onGround = this.y + this.h >= canvas.height - GRASS_HEIGHT;
        if (onGround) {
            this.y = canvas.height - this.h - GRASS_HEIGHT;
            this.speedY = 0;
            this.jumpCount = 0;
            this.onObject = false;
        }

        this.onObject = false;
        for (let obj of parkourObjects) {
            if (this.collidesWith(obj)) {

                if (this.speedY > 0 && this.y + this.h <= obj.y + obj.h) {
                    this.y = obj.y - this.h;
                    this.speedY = 0;
                    this.onObject = true;
                    this.jumpCount = 0;
                }

                if (this.speedY < 0 && this.y <= obj.y + obj.h && this.y + this.h > obj.y) {
                    this.y = obj.y + obj.h;
                    this.speedY = 0;
                }
            }
        }

        this.draw();
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

class ParkourObject {
    constructor(img, x, y, w, h, color, isMoving = false, minX = 0, maxX = 0, speed = 0) {
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
    }

    update() {
        if (this.isMoving) {
            this.x += this.speed * this.direction;

            if (this.x <= this.minX || this.x + this.w >= this.maxX) {
                this.direction *= -1;
            }
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

const players = {};

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
    constructor(id, x, y, w, h, spritePath, minX, maxX, minY, maxY, detectionRadius) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.speedX = 3;
        this.speedY = 0.5;
        this.sprite = new Image();
        this.sprite.src = spritePath;
        this.loaded = false;
        this.reloadTime = 500; // Delay between shots
        this.lastShot = 0;
        this.initialX = x;  // Store initial position for reset
        this.initialY = y;  // Store initial position for reset

        // Define boundaries for the enemy's movement
        this.minX = minX;
        this.maxX = maxX;
        this.minY = minY;
        this.maxY = maxY;

        // Define detection radius for shooting
        this.detectionRadius = detectionRadius;

        this.sprite.onload = () => {
            this.loaded = true;
        };
    }

    draw() {
        if (this.loaded) {
            ctx.drawImage(this.sprite, this.x - cameraX, this.y - cameraY, this.w, this.h);

            // Draw enemy id (name) above the enemy
            ctx.fillStyle = 'red';
            ctx.font = '20px serif';
            ctx.textAlign = 'center';
            ctx.fillText(this.id, this.x - cameraX + this.w / 2, this.y - cameraY - 10); // Positioning the name above the enemy
        }
    }

    update(player) {
        // Basic following behavior (within boundaries)
        if (player.x > this.x && this.x < this.maxX) this.x += this.speedX;
        else if (player.x < this.x && this.x > this.minX) this.x -= this.speedX;

        if (this.y < this.maxY) this.y += this.speedY; // Apply gravity until the maxY

        // Gravity and simple collision with ground
        if (this.y + this.h > groundLevel) {
            this.y = groundLevel - this.h;
            this.speedY = 0;
        }

        // Check the distance from the player
        const distanceToPlayer = Math.sqrt(Math.pow(this.x - player.x, 2) + Math.pow(this.y - player.y, 2));

        // If the distance to the player is less than the detection radius, start shooting
        if (distanceToPlayer <= this.detectionRadius) {
            if (Date.now() - this.lastShot > this.reloadTime) {
                this.shoot(player);
                this.lastShot = Date.now();
            }
        }

        this.draw();
    }

    shoot(player) {
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        const speed = 3.4;
        const projectile = new Projectile(this.x, this.y, Math.cos(angle) * speed, Math.sin(angle) * speed);
        projectiles.push(projectile);
    }

    // Reset enemy's position and clear projectiles
    reset() {
        this.x = this.initialX;
        this.y = this.initialY;
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

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Check if projectile exceeds certain distance from enemy (despawn condition)
        const enemy = enemies.find(enemy => 
            Math.abs(enemy.x - this.x) < 100 && Math.abs(enemy.y - this.y) < 100
        );
        if (enemy && (Math.abs(this.x - enemy.x) > 500 || Math.abs(this.y - enemy.y) > 500)) {
            return;  // If projectile is too far from the enemy, don't render it
        }

        // Check for collision with player
        if (players[myPlayerId] && this.collidesWith(players[myPlayerId])) {
            handlePlayerDeath(); // Reset player when hit by projectile
            console.log("Player hit by projectile! Resetting to start.");
        }

        this.draw();
    }

    draw() {
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - cameraX, this.y - cameraY, this.w, this.h);
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
    new Enemy('GAYSONGURNS1', 1000, canvas.height - GRASS_HEIGHT - 200, 75, 75, 'enemySprite.jpeg', 500, 1500, 0, groundLevel - 100, 500),
    new Enemy('GAYSONGURNS2', 1500, canvas.height - GRASS_HEIGHT - 600, 75, 75, 'enemySprite.jpeg', 1000, 2000, 0, groundLevel - 100, 500),
    new Enemy('GAYSONGURNS3', 3000, canvas.height - GRASS_HEIGHT - 800, 75, 75, 'enemySprite.jpeg', 3500, 4500, 0, groundLevel - 100, 500),
    new Enemy('GAYSONGURNS4', 4000, canvas.height - GRASS_HEIGHT - 1700, 75, 75, 'enemySprite.jpeg', 3500, 4500, 0, groundLevel - 100, 500),
    new Enemy('GAYSONGURNS5', 5500, canvas.height - GRASS_HEIGHT - 2450, 75, 75, 'enemySprite.jpeg', 5000, 6000, 0, groundLevel - 100, 500),
    new Enemy('GAYSONGURNS6', 6500, canvas.height - GRASS_HEIGHT - 2800, 75, 75, 'enemySprite.jpeg', 6000, 7000, 0, groundLevel - 100, 500),
];

// Function to reset the game when the player dies (including enemies and projectiles)
function resetGame() {
    // Reset all enemies to their initial positions and clear projectiles
    enemies.forEach(enemy => {
        enemy.reset();
    });

    // Clear all projectiles globally
    projectiles.length = 0; // Clear projectiles array

    // Reset player position
    const localPlayer = players[myPlayerId];
    resetPlayerPosition(localPlayer);
}

// Example of handling player death
function handlePlayerDeath() {
    console.log("Player died! Resetting the game...");
    resetGame();  // Call the reset game function when player dies
}

// Function to reset the player's position
function resetPlayerPosition(player) {
    // Set the player's position back to the starting position or spawn point
    player.x = spawnX;  // Adjust this to the player's spawn position
    player.y = spawnY;  // Adjust this to the ground level
    player.health = 100;  // Reset health or other status variables
}

// Check for spike collision or death conditions
function checkForDeathConditions() {
    const localPlayer = players[myPlayerId];

    // Check if the player hits the spikes (or any other death condition)
    if (checkForSpikeCollision(localPlayer)) {
        console.log("Player hit the spikes! Resetting to start.");
        handlePlayerDeath();
    }

    // Check if player's health reaches 0
    if (localPlayer && localPlayer.health <= 0) {
        console.log("Player health reached 0! Resetting to start.");
        handlePlayerDeath();
    }
}




const projectiles = [];

// Call the death check function in your game loop
function gameLoop() {
    const localPlayer = players[myPlayerId];

    if (gameStarted) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        spawnClouds();
        updateClouds();

        windblowers.forEach((blower) => {
            blower.applyEffect(localPlayer);
            blower.draw();
        });

        drawSpikes(cameraX, cameraY);

        // Check for death conditions (e.g., spike collision, health <= 0)
        checkForDeathConditions();

        if (localPlayer && localPlayer.y + localPlayer.h < canvas.height) {
            ctx.fillStyle = '#9b7a4b';
            ctx.fillRect(0, groundLevel - cameraY + 20, canvas.width, GRASS_HEIGHT - 20);

            const grassGradient = ctx.createLinearGradient(0, groundLevel - cameraY, 0, groundLevel - cameraY + GRASS_HEIGHT);
            grassGradient.addColorStop(0, '#6b8e23');
            grassGradient.addColorStop(1, '#9acd32');
            ctx.fillStyle = grassGradient;
            ctx.fillRect(0, groundLevel - cameraY, canvas.width, GRASS_HEIGHT);
        }

        if (localPlayer) {
            cameraX = localPlayer.x - canvas.width / 2 + localPlayer.w / 2;
            if (localPlayer.y < canvas.height / 2) {
                cameraY = localPlayer.y - canvas.height / 2 + localPlayer.h / 2;
            } else {
                cameraY = localPlayer.y - canvas.height / 2 + localPlayer.h / 2;
            }
        }

        parkourObjects.forEach((obj) => {
            obj.update();
        });

        enemies.forEach(enemy => enemy.update(localPlayer));

        // Update and draw projectiles
        projectiles.forEach((projectile, index) => {
            projectile.update();


        });

        for (let id in players) {
            if (id === myPlayerId) continue;

            let player = players[id];
            console.log(player);
            ctx.globalAlpha = player.opacity;
            ctx.drawImage(document.getElementById("hawk"), player.x - cameraX, player.y - cameraY, player.w, player.h);

            ctx.fillStyle = 'black';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(player.name, player.x - cameraX + player.w / 2, player.y - cameraY - 10);
        }

        if (localPlayer) {
            localPlayer.speedX = 0;
            const controller = controllers[myPlayerId];

            if (controller.right) {
                localPlayer.speedX = 7;
            }
            if (controller.left) {
                localPlayer.speedX = -7;
            }
            if (controller.up) {
                localPlayer.jump();
            }

            localPlayer.update(parkourObjects);
            localPlayer.draw();
        }

        requestAnimationFrame(gameLoop);
    }
}



window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const groundLevel = canvas.height - GRASS_HEIGHT;

    parkourObjects.forEach((obj, index) => {
        obj.y = groundLevel - (index + 1) * 50;
    });

    for (let id in players) {
        const player = players[id];
        if (player.y + player.h > groundLevel) {
            player.y = groundLevel - player.h;
            player.speedY = 0;
        }
    }
});
