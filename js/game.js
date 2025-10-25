const PAYMENT_WALLET = '0xeEa2d9A4B21B23443bF01C1ccD31632107eD8Ec1';
const ENTRY_FEE = '0x9184e72a000';
const GAME_DURATION = 10;
const WIN_THRESHOLD = 100;

async function getFarcasterProvider() {
    try {
        if (!window.farcasterSDK) {
            console.log('SDK not available');
            return null;
        }
        
        const provider = await window.farcasterSDK.wallet.getEthereumProvider();
        return provider;
    } catch (error) {
        console.error('Provider error:', error);
        return null;
    }
}

async function processPayment() {
    try {
        console.log('💰 Starting payment...');
        
        const provider = await getFarcasterProvider();
        if (!provider) {
            console.log('⚠️ No provider, free mode');
            return true;
        }
        
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });
        
        if (!accounts || accounts.length === 0) {
            return false;
        }
        
        const userAddress = accounts;
        
        const tx = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: PAYMENT_WALLET,
                value: ENTRY_FEE,
                gas: '0x5208'
            }]
        });
        
        console.log('✅ Payment success:', tx);
        return true;
    } catch (error) {
        console.error('Payment error:', error);
        if (error.code !== 4001) {
            alert('Payment error: ' + error.message);
        }
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeGame();
});

function initializeGame() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const timerEl = document.getElementById('timer');
    const finalScoreEl = document.getElementById('finalScore');
    const gamesPlayedEl = document.getElementById('gamesPlayed');
    const lastScoreEl = document.getElementById('lastScore');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const colorButtons = document.querySelectorAll('.color-btn');
    const gameOverScreen = document.getElementById('gameOverScreen');

    let gameRunning = false;
    let score = 0;
    let bestScore = 0;
    let lastScore = 0;
    let gamesPlayed = 0;
    let timeLeft = GAME_DURATION;
    let circles = [];
    let particles = [];

    const TARGET_ZONE_Y = canvas.height - 110;
    const TARGET_ZONE_HEIGHT = 90;

    const COLORS = {
        red: '#e74c3c',
        blue: '#3498db',
        green: '#2ecc71',
        yellow: '#f1c40f'
    };

    const colorNames = Object.keys(COLORS);

    try {
        const saved = localStorage.getItem('colorMatchBest');
        if (saved) {
            bestScore = parseInt(saved);
            bestEl.textContent = bestScore;
        }
    } catch (e) {}

    const audio = {
        correct: new Audio('sounds/correct.mp3'),
        wrong: new Audio('sounds/wrong.mp3'),
        gameOver: new Audio('sounds/gameover.mp3')
    };

    Object.values(audio).forEach(function(sound) {
        sound.volume = 0.3;
        sound.addEventListener('error', function() {});
    });

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
    }

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
        timeLeft = GAME_DURATION;
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

        gamesPlayed++;
        lastScore = score;
        gamesPlayedEl.textContent = gamesPlayed;
        lastScoreEl.textContent = lastScore;
        finalScoreEl.textContent = score;
        
        gameOverScreen.classList.remove('hidden');

        if (score >= WIN_THRESHOLD) {
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

    function startGameFromPayment() {
        gameOverScreen.classList.add('hidden');
        document.getElementById('prizeSection').classList.add('hidden');
        
        gameRunning = true;
        init();
        startTimer();
        gameLoop();
    }

    async function startGameWithPayment(btn) {
        console.log('🎮 START clicked');
        
        const originalText = btn.textContent;
        btn.textContent = '⏳ ...';
        btn.disabled = true;
        
        const paid = await processPayment();
        
        if (paid) {
            console.log('✅ Starting game');
            await new Promise(resolve => setTimeout(resolve, 500));
            startGameFromPayment();
        } else {
            console.log('❌ Payment failed');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    colorButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const color = btn.getAttribute('data-color');
            handleColorClick(color);
        });
    });

    startBtn.addEventListener('click', function(e) {
        e.preventDefault();
        startGameWithPayment(startBtn);
    });

    restartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        startGameWithPayment(restartBtn);
    });

    console.log('✅ Game ready');
}
