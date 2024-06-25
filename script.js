const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOver');
const profilePicUpload = document.getElementById('profilePicUpload');
const startGameButton = document.getElementById('startGame');
const flashOverlay = document.getElementById('flashOverlay');
const controls = document.getElementById('controls');

const collisionSound = document.getElementById('collisionSound');
const gameOverSound = document.getElementById('gameOverSound');
const backgroundMusic = document.getElementById('backgroundMusic');

const basePlayerRadius = 30;
const baseObstacleRadius = 50;
const player = {
    x: 50,
    y: 200,
    radius: basePlayerRadius,
    speed: 5,  // Adjusted for reasonable speed on touch devices
    image: null,
    velocityX: 0,
    velocityY: 0,
    acceleration: 2,
    friction: 0.85
};

let difficultyFactor = 1;
let obstacleCreationRate = 0.02;
let obstacles = [];
let score = 0;
let lives = 10;
let gameLoop;
let gameStarted = false;
let keysPressed = {};
let hitCounts = {
    onlyfans: 0,
    marketer: 0,
    fitness: 0,
    crypto: 0
};
let isColliding = false;

const obstacleImages = {
    onlyfans: new Image(),
    marketer: new Image(),
    fitness: new Image(),
    crypto: new Image()
};

const imageUrls = {
    onlyfans: 'https://raw.githubusercontent.com/heybobjones/dodgy-dodger/main/images/OFCreator.png', // Replace with actual image URL for OF creator
    marketer: 'https://raw.githubusercontent.com/heybobjones/dodgy-dodger/main/images/NetworkMarketer.png', // Replace with actual image URL for Network Marketer
    fitness: 'https://raw.githubusercontent.com/heybobjones/dodgy-dodger/main/images/FitnessBro.png', // Replace with actual image URL for Fitness Influencer
    crypto: 'https://raw.githubusercontent.com/heybobjones/dodgy-dodger/main/images/CryptoBro.png' // Replace with actual image URL for Crypto Bro
};

function loadImages(callback) {
    let imagesLoaded = 0;
    const totalImages = Object.keys(obstacleImages).length;

    for (const key in obstacleImages) {
        obstacleImages[key].src = imageUrls[key];
        obstacleImages[key].onload = () => {
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                callback();
            }
        };
        obstacleImages[key].onerror = () => {
            console.error(`Failed to load image: ${imageUrls[key]}`);
            imagesLoaded++;
            if (imagesLoaded === totalImages) {
                callback();
            }
        };
    }
}

function drawPlayer() {
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    if (player.image) {
        const scaleFactor = player.radius / basePlayerRadius; // Scale the image based on the player's radius
        ctx.drawImage(player.image, player.x - player.radius, player.y - player.radius, player.radius * 2, player.radius * 2);
    } else {
        ctx.fillStyle = '#0F0';
        ctx.fill();
    }

    ctx.restore();
}

function createObstacle() {
    const types = ['onlyfans', 'marketer', 'fitness', 'crypto'];
    const type = types[Math.floor(Math.random() * types.length)];
    const obstacle = {
        x: canvas.width,
        y: Math.random() * (canvas.height - 40),
        radius: baseObstacleRadius,
        speed: (2 + Math.random() * 3) * difficultyFactor,
        type: type,
        title: getTitle(type)
    };
    obstacles.push(obstacle);
}

function getTitle(type) {
    switch(type) {
        case 'onlyfans': return 'Only Fans Creator';
        case 'marketer': return 'Network Marketer';
        case 'fitness': return 'Fitness Bro';
        case 'crypto': return 'Crypto Bro';
    }
}

function drawObstacle(obstacle) {
    const img = obstacleImages[obstacle.type];
    if (img.complete && img.naturalHeight !== 0) {
        ctx.drawImage(img, obstacle.x - obstacle.radius, obstacle.y - obstacle.radius, obstacle.radius * 2, obstacle.radius * 2);

        ctx.font = '14px Arial';
        const textWidth = ctx.measureText(obstacle.title).width;
        const textX = obstacle.x - textWidth / 2;
        const textY = obstacle.y + obstacle.radius + 20;

        const gradient = ctx.createLinearGradient(textX - 50, 0, textX + textWidth + 50, 0);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.9, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fillText(obstacle.title, textX, textY);
    }
}

function moveObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.x -= obstacle.speed;

        switch(obstacle.type) {
            case 'crypto':
                obstacle.y += Math.sin(obstacle.x * 0.1) * 2;
                break;
            case 'onlyfans':
                const dx = player.x - obstacle.x;
                const dy = player.y - obstacle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                obstacle.x += dx / dist * 0.5;
                obstacle.y += dy / dist * 0.5;
                break;
            case 'marketer':
                if (Math.random() < 0.001 && obstacle.radius > 20) {
                    obstacle.radius *= 0.7;
                    obstacles.push({...obstacle, y: obstacle.y + 30});
                }
                break;
            case 'fitness':
                obstacle.speed *= 1.001;
                break;
        }
    });
    obstacles = obstacles.filter(obstacle => obstacle.x + obstacle.radius > 0);
}

function movePlayer() {
    player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function checkCollision() {
    if (isColliding) return;

    obstacles.forEach(obstacle => {
        const dx = obstacle.x - player.x;
        const dy = obstacle.y - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < player.radius + obstacle.radius) {
            lives--;
            hitCounts[obstacle.type]++;
            obstacles = obstacles.filter(o => o !== obstacle);

            isColliding = true;
            flashOverlay.style.display = 'block';
            playSound(collisionSound); // Play collision sound
            setTimeout(() => {
                isColliding = false;
                flashOverlay.style.display = 'none';
            }, 500);
        }
    });
}

function drawScore() {
    ctx.fillStyle = '#0F0';
    ctx.font = '20px Courier New';
    ctx.fillText(`Score: ${score}`, 10, 30);
    ctx.fillText(`Lives: ${lives}`, canvas.width - 100, 30);
}

function getMostFrequentHit() {
    return Object.entries(hitCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
}

function gameOver() {
    cancelAnimationFrame(gameLoop);
    const mostFrequentHit = getMostFrequentHit();
    const gameOverSubheader = document.getElementById('gameOverSubheader');
    gameOverSubheader.textContent = `${getTitle(mostFrequentHit)} spammed you to death! 💀`;
    gameOverScreen.style.display = 'block';
    playSound(gameOverSound); // Play game over sound
    backgroundMusic.pause(); // Stop background music
    gameStarted = false;
    startGameButton.style.display = 'block';
}

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!isColliding) {
        movePlayer();
        moveObstacles();
        checkCollision();
    }

    drawPlayer();
    obstacles.forEach(drawObstacle);
    drawScore();

    if (Math.random() < obstacleCreationRate) {
        createObstacle();
    }

    score++;

    if (lives <= 0) {
        gameOver();
    } else {
        gameLoop = requestAnimationFrame(update);
        updateDifficulty(); // Increase difficulty over time
    }
}

document.addEventListener('keydown', (e) => {
    keysPressed[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

profilePicUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                player.image = img;
            }
            img.src = event.target.result;
        }
        reader.readAsDataURL(file);
    }
});

startGameButton.addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
        lives = 10;
        score = 0;
        obstacles = [];
        hitCounts = {onlyfans: 0, marketer: 0, fitness: 0, crypto: 0};
        gameOverScreen.style.display = 'none';
        startGameButton.style.display = 'none';
        controls.style.display = 'none'; // Hide the controls
        player.x = 50;
        player.y = 200;
        player.velocityX = 0;
        player.velocityY = 0;
        backgroundMusic.play(); // Start background music
        update();
    }
});

function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => {
            console.error("Sound playback error:", error);
        });
    }
}

// Handle touch events
let touchStartX = 0;
let touchStartY = 0;

function handleTouchStart(evt) {
    const firstTouch = evt.touches[0];
    touchStartX = firstTouch.clientX;
    touchStartY = firstTouch.clientY;
}

function handleTouchMove(evt) {
    if (!touchStartX || !touchStartY) {
        return;
    }

    const touchMoveX = evt.touches[0].clientX;
    const touchMoveY = evt.touches[0].clientY;

    const diffX = touchStartX - touchMoveX;
    const diffY = touchStartY - touchMoveY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0) {
            // Swipe left
            player.x -= player.speed;
        } else {
            // Swipe right
            player.x += player.speed;
        }
    } else {
        if (diffY > 0) {
            // Swipe up
            player.y -= player.speed;
        } else {
            // Swipe down
            player.y += player.speed;
        }
    }

    // Reset values
    touchStartX = touchMoveX;
    touchStartY = touchMoveY;
}

document.addEventListener('touchstart', handleTouchStart, false);
document.addEventListener('touchmove', handleTouchMove, false);

// Load images and start the game
loadImages(() => {
    startGameButton.style.display = 'block';
});
