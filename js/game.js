// ===== PAYMENT CONFIGURATION =====
const PAYMENT_WALLET = '0x71af9Ed03B216a5dD66889EBd2f4Ec8f3912602B';
const ENTRY_FEE = '0x9184e72a000'; // 0.00001 ETH in hex

// ===== WAIT FOR DOM TO LOAD =====
document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
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
    const TARGET_ZONE_Y = canvas.height - 110;
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

    Object.values(audio).forEach(function(sound) {
        sound.volume = 0.3;
        sound.addEventListener('error', function() {});
    });

    // ===== DRAW TARGET ZONE =====
    function drawTargetZone() {
        const gradient = ctx.createLinearGradient(0, TARGET_ZONE_Y, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.15)');
        gradient.addColorStop(0.5, 'rgba(102, 126, 234, 0.25)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.35)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, TARGET_ZONE_Y, canvas.width, TARGET_ZONE_HEIGHT);

        const pulseOffset = Math.sin(Date.now() / 300) * 3;
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 4;
        ctx.setLineDash([15, 8]);
        ctx.beginPath();
        ctx.moveTo(0, TARGET_ZONE_Y + pulseOffset);
        ctx.lineTo(canvas.width, TARGET_ZONE_Y + pulseOffset);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(102, 126, 234, 0.8)';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('⬇ TAP ZONE ⬇', canvas.width / 2, TARGET_ZONE_Y + 25);
        
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(102, 126, 234, 0.6)';
        ctx.fillText('Match color when circle is here!', canvas.width / 2, TARGET_ZONE_Y + 50);

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
            this.inTargetZone = (this.y >= TARGET_ZONE_Y && this.y <= canvas.height - 40);
            if (this.y > canvas.height - 30) {
                this.toRemove = true;
            }
        }

        draw() {
            if (this.inTargetZone) {
                ctx.save();
                ctx.shadowBlur = 25;
                ctx.shadowColor = COLORS[this.color];
                
                const pulseSize = Math.sin(Date.now() / 200) * 6 + 6;
                ctx.strokeStyle = COLORS[this.color];
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + pulseSize, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(this.x + 3, this.y + 3, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = COLORS[this.color];
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(this.x - 8, this.y - 8, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = this.inTargetZone ? 4 : 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.stroke();

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

    function createParticles(x, y, color, count) {
        count = count || 15;
        for (var i = 0; i < count; i++) {
            particles.push(new Particle(x, y, color));
        }
    }

    function spawnCircle() {
        if (gameRunning && Math.random() < 0.02) {
            circles.push(new Circle());
        }
    }

    let timerInterval;
    function startTimer() {
        timerInterval = setInterval(function() {
            if (gameRunning) {
                timeLeft--;
                timerEl.textContent = timeLeft;
                
                if (timeLeft <= 0) {
                    endGame();
                }
            }
        }, 1000);
    }

    function handleColorClick(clickedColor) {
        if (!gameRunning) return;

        let foundInZone = false;
        
        circles.forEach(function(circle) {
            if (circle.inTargetZone && !circle.toRemove) {
                foundInZone = true;
                
                if (circle.color === clickedColor) {
                    score += 10;
                    circle.toRemove = true;
                    
                    audio.correct.play().catch(function() {});
                    createParticles(circle.x, circle.y, COLORS[circle.color], 20);
                    
                    const btn = document.querySelector('[data-color="' + clickedColor + '"]');
                    btn.classList.add('correct');
                    setTimeout(function() { btn.classList.remove('correct'); }, 300);
                } else {
                    score = Math.max(0, score - 5);
                    
                    audio.wrong.play().catch(function() {});
                    
                    const btn = document.querySelector('[data-color="' + clickedColor + '"]');
                    btn.classList.add('wrong');
                    setTimeout(function() { btn.classList.remove('wrong'); }, 300);
                }
            }
        });

        if (!foundInZone) {
            score = Math.max(0, score - 2);
        }

        scoreEl.textContent = score;
    }

    function init() {
        score = 0;
        timeLeft = 20;
        circles = [];
        particles = [];
        scoreEl.textContent = score;
        timerEl.textContent = timeLeft;
    }

    function gameLoop() {
        if (!gameRunning) return;

        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#ffffff');
        bgGradient.addColorStop(1, '#f0f0f0');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        drawTargetZone();
        spawnCircle();

        circles = circles.filter(function(c) { return !c.toRemove; });
        circles.forEach(function(circle) {
            circle.update();
            circle.draw();
        });

        particles = particles.filter(function(p) { return !p.isDead(); });
        particles.forEach(function(p) {
            p.update();
            p.draw();
        });

        requestAnimationFrame(gameLoop);
    }

    function endGame() {
        gameRunning = false;
        clearInterval(timerInterval);
        audio.gameOver.play().catch(function() {});

        finalScoreEl.textContent = score;
        
        startScreen.style.display = 'none';
        startScreen.classList.add('hidden');
        gameOverScreen.classList.remove('hidden');
        gameOverScreen.style.display = 'flex';

        if (score >= 100) {
            document.getElementById('prizeSection').classList.remove('hidden');
            console.log('🏆 Winner! Score:', score);
        }

        if (score > bestScore) {
            bestScore = score;
            bestEl.textContent = bestScore;
            try {
                localStorage.setItem('colorMatchBest', bestScore);
            } catch (e) {}
        }
    }

    function startGameFromPayment() {
        startScreen.style.display = 'none';
        startScreen.classList.add('hidden');
        gameOverScreen.classList.add('hidden');
        gameOverScreen.style.display = 'none';
        
        gameRunning = true;
        init();
        startTimer();
        gameLoop();
    }

    async function startGameWithPayment(btn) {
        console.log('🎮 START button clicked');
        
        const originalText = btn.textContent;
        btn.textContent = '⏳ Processing Payment...';
        btn.disabled = true;
        
        // Use official Farcaster wallet module
        const paid = await window.walletModule.processPaymentFlow();
        
        if (paid) {
            console.log('✅ Payment successful, starting game');
            await new Promise(resolve => setTimeout(resolve, 500));
            startGameFromPayment();
        } else {
            console.log('❌ Payment failed or cancelled');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    // ===== EVENT LISTENERS =====
    colorButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const color = btn.getAttribute('data-color');
            handleColorClick(color);
        });
    });

    startBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startGameWithPayment(startBtn);
    });

    restartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        startGameWithPayment(restartBtn);
    });

    console.log('✅ Color Match Rush initialized!');
}
