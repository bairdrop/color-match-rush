// ===== CANVAS SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ===== DOM ELEMENTS =====
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const timerEl = document.getElementById('timer');
const finalScoreEl = document.getElementById('finalScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const colorButtons = document.querySelectorAll('.color-btn');

// ===== GAME STATE =====
let gameRunning = false;
let score = 0;
let bestScore = 0;
let timeLeft = 20;
let circles = [];
let particles = [];

// ===== CONSTANTS =====
const TARGET_ZONE_Y = canvas.height - 110; // Adjusted for 400px height
const TARGET_ZONE_HEIGHT = 90;

// ===== COLORS =====
const COLORS = {
    red: '#e74c3c',
    blue: '#3498db',
    green: '#2ecc71',
    yellow: '#f1c40f'
};

const colorNames = Object.keys(COLORS);

// ===== LOAD BEST SCORE =====
try {
    const saved = localStorage.getItem('colorMatchBest');
    if (saved) {
        bestScore = parseInt(saved);
        bestEl.textContent = bestScore;
    }
} catch (e) {}

// ===== AUDIO =====
const audio = {
    correct: new Audio('sounds/correct.mp3'),
    wrong: new Audio('sounds/wrong.mp3'),
    gameOver: new Audio('sounds/gameover.mp3')
};

Object.values(audio).forEach(sound => {
    sound.volume = 0.3;
    sound.addEventListener('error', () => {});
});

// ===== DRAW TARGET ZONE =====
function drawTargetZone() {
    // Draw background zone with gradient (more visible)
    const gradient = ctx.createLinearGradient(0, TARGET_ZONE_Y, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(102, 126, 234, 0.15)');
    gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.25)');
    gradient.addColorStop(1, 'rgba(102, 126, 234, 0.35)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, TARGET_ZONE_Y, canvas.width, TARGET_ZONE_HEIGHT);

    // Draw top border with animation (pulsing)
    const pulseOffset = Math.sin(Date.now() / 300) * 3;
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 4;
    ctx.setLineDash([15, 8]);
    ctx.beginPath();
    ctx.moveTo(0, TARGET_ZONE_Y + pulseOffset);
    ctx.lineTo(canvas.width, TARGET_ZONE_Y + pulseOffset);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw "TAP ZONE" text (larger)
    ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⬇ TAP ZONE ⬇', canvas.width / 2, TARGET_ZONE_Y + 25);
    
    // Draw helper text
    ctx.font = '14px Arial';
    ctx.fillStyle = 'rgba(102, 126, 234, 0.6)';
    ctx.fillText('Match color when circle is here!', canvas.width / 2, TARGET_ZONE_Y + 50);

    // Draw bottom border
    ctx.strokeStyle = '#667eea';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height - 40);
    ctx.stroke();
}

// ===== CIRCLE CLASS =====
class Circle {
    constructor() {
        this.x = Math.random() * (canvas.width - 60) + 30;
        this.y = -30;
        this.radius = 25;
        this.color = colorNames[Math.floor(Math.random() * colorNames.length)];
        this.speed = 2 + Math.random() * 2;
        this.toRemove = false;
        this.inTargetZone = false;
    }

    update() {
        this.y += this.speed;
        
        // Check if in target zone (bigger zone now)
        this.inTargetZone = (this.y >= TARGET_ZONE_Y && this.y <= canvas.height - 40);
        
        // Check if passed target zone (missed)
        if (this.y > canvas.height - 30) {
            this.toRemove = true;
        }
    }

    draw() {
        // Add glow effect when in target zone
        if (this.inTargetZone) {
            ctx.save();
            ctx.shadowBlur = 25;
            ctx.shadowColor = COLORS[this.color];
            
            // Draw pulsing ring around circle
            const pulseSize = Math.sin(Date.now() / 200) * 6 + 6;
            ctx.strokeStyle = COLORS[this.color];
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + pulseSize, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.beginPath();
        ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw circle
        ctx.fillStyle = COLORS[this.color];
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x - 8, this.y - 8, 8, 0, Math.PI * 2);
        ctx.fill();

        // Draw border (thicker when in zone)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = this.inTargetZone ? 4 : 3;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw arrow pointing down when in target zone (bigger)
        if (this.inTargetZone) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('▼', this.x, this.y + 8);
        }
    }
}

// ===== PARTICLE CLASS =====
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 5;
        this.vy = (Math.random() - 0.5) * 5;
        this.alpha = 1;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

// ===== CREATE PARTICLES =====
function createParticles(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// ===== SPAWN CIRCLE =====
function spawnCircle() {
    if (gameRunning && Math.random() < 0.02) {
        circles.push(new Circle());
    }
}

// ===== TIMER =====
let timerInterval;
function startTimer() {
    timerInterval = setInterval(() => {
        if (gameRunning) {
            timeLeft--;
            timerEl.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

// ===== HANDLE COLOR BUTTON CLICK =====
function handleColorClick(clickedColor) {
    if (!gameRunning) return;

    let matched = false;
    let foundInZone = false;
    
    // Check circles in target zone ONLY
    circles.forEach((circle, index) => {
        if (circle.inTargetZone && !circle.toRemove) {
            foundInZone = true;
            
            if (circle.color === clickedColor) {
                // Correct match!
                score += 10;
                matched = true;
                circle.toRemove = true;
                
                audio.correct.play().catch(() => {});
                createParticles(circle.x, circle.y, COLORS[circle.color], 20);
                
                // Button animation
                const btn = document.querySelector(`[data-color="${clickedColor}"]`);
                btn.classList.add('correct');
                setTimeout(() => btn.classList.remove('correct'), 300);
            } else {
                // Wrong color match
                score = Math.max(0, score - 5);
                matched = true;
                
                audio.wrong.play().catch(() => {});
                
                // Button animation
                const btn = document.querySelector(`[data-color="${clickedColor}"]`);
                btn.classList.add('wrong');
                setTimeout(() => btn.classList.remove('wrong'), 300);
            }
        }
    });

    // Penalty for clicking when no circle in zone
    if (!foundInZone) {
        score = Math.max(0, score - 2);
    }

    scoreEl.textContent = score;
}

// ===== INITIALIZE GAME =====
function init() {
    score = 0;
    timeLeft = 20;
    circles = [];
    particles = [];
    scoreEl.textContent = score;
    timerEl.textContent = timeLeft;
}

// ===== GAME LOOP =====
function gameLoop() {
    if (!gameRunning) return;

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGradient.addColorStop(0, '#ffffff');
    bgGradient.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw target zone FIRST (behind circles)
    drawTargetZone();

    // Spawn new circles
    spawnCircle();

    // Update and draw circles
    circles = circles.filter(c => !c.toRemove);
    circles.forEach(circle => {
        circle.update();
        circle.draw();
    });

    // Update and draw particles
    particles = particles.filter(p => !p.isDead());
    particles.forEach(p => {
        p.update();
        p.draw();
    });

    requestAnimationFrame(gameLoop);
}

// ===== END GAME =====
function endGame() {
    gameRunning = false;
    clearInterval(timerInterval);
    audio.gameOver.play().catch(() => {});

    finalScoreEl.textContent = score;
    gameOverScreen.classList.remove('hidden');

    // Check for winner (100+ score)
    if (score >= 100) {
        document.getElementById('prizeSection').classList.remove('hidden');
    }

    if (score > bestScore) {
        bestScore = score;
        bestEl.textContent = bestScore;
        try {
            localStorage.setItem('colorMatchBest', bestScore);
        } catch (e) {}
    }
}

// ===== START GAME =====
function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameRunning = true;
    init();
    startTimer();
    gameLoop();
}

// ===== EVENT LISTENERS =====
colorButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        handleColorClick(color);
    });
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

console.log('✅ Color Match Rush (20s, Bigger Zone) loaded!');
```

**Save this as `js/game.js`**

