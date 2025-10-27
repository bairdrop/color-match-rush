const PAYMENT_WALLET = '0xeEa2d9A4B21B23443bF01C1ccD31632107eD8Ec1';
const ENTRY_FEE = '0x9184e72a000';
const GAME_DURATION = 15;
const CHAIN_ID = '0x2105';

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

async function getEthereumProvider() {
    if (window.ethereum) {
        return window.ethereum;
    }
    return null;
}

async function ensureCorrectNetwork(provider) {
    try {
        const currentChainId = await provider.request({
            method: 'eth_chainId'
        });
        
        console.log('Current chain:', currentChainId);
        
        if (currentChainId !== CHAIN_ID) {
            try {
                await provider.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: CHAIN_ID }]
                });
                console.log('✅ Switched to Base');
            } catch (switchError) {
                if (switchError.code === 4902) {
                    await provider.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: CHAIN_ID,
                            chainName: 'Base',
                            rpcUrls: ['https://mainnet.base.org/'],
                            nativeCurrency: {
                                name: 'Ether',
                                symbol: 'ETH',
                                decimals: 18
                            },
                            blockExplorerUrls: ['https://basescan.org/']
                        }]
                    });
                    console.log('✅ Added Base network');
                } else {
                    throw switchError;
                }
            }
        }
        return true;
    } catch (error) {
        console.error('Network switch error:', error);
        alert('Please switch to Base network in your wallet');
        return false;
    }
}

async function processPayment() {
    try {
        console.log('💰 Starting payment... Fee: 0.00001 ETH');
        
        let provider = await getFarcasterProvider();
        
        if (!provider) {
            provider = await getEthereumProvider();
            if (!provider) {
                console.log('⚠️ No provider available');
                return true;
            }
        }
        
        const networkOk = await ensureCorrectNetwork(provider);
        if (!networkOk) return false;
        
        let accounts;
        try {
            accounts = await provider.request({
                method: 'eth_requestAccounts'
            });
        } catch (error) {
            console.error('Account request error:', error);
            return false;
        }
        
        if (!accounts || accounts.length === 0) {
            return false;
        }
        
        const userAddress = accounts[0];
        console.log('✅ Connected to:', userAddress);
        
        const txParams = {
            from: userAddress,
            to: PAYMENT_WALLET,
            value: ENTRY_FEE,
            data: '0x'
        };
        
        try {
            const tx = await provider.request({
                method: 'eth_sendTransaction',
                params: [txParams]
            });
            
            console.log('✅ Payment successful! Tx:', tx);
            await new Promise(resolve => setTimeout(resolve, 1500));
            return true;
        } catch (error) {
            console.error('Transaction error:', error);
            if (error.code === 4001) {
                console.log('User rejected transaction');
            } else {
                alert('Transaction failed: ' + (error.message || error.code));
            }
            return false;
        }
    } catch (error) {
        console.error('Payment flow error:', error);
        return false;
    }
}

function goToGamePage() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('gamePage').classList.add('active');
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('landingStartBtn').addEventListener('click', async function(e) {
        e.preventDefault();
        
        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = '⏳ Processing...';
        btn.disabled = true;
        
        const paid = await processPayment();
        
        if (paid) {
            console.log('✅ Payment done, going to game page');
            await new Promise(resolve => setTimeout(resolve, 500));
            goToGamePage();
            initializeGame();
        } else {
            console.log('❌ Payment cancelled');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });
});

function initializeGame() {
    const canvas = document.getElementById('gameCanvas');
    
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    const ctx = canvas.getContext('2d');

    const scoreEl = document.getElementById('score');
    const bestEl = document.getElementById('best');
    const timerEl = document.getElementById('timer');
    const finalScoreEl = document.getElementById('finalScore');
    const gamesPlayedEl = document.getElementById('gamesPlayed');
    const lastScoreEl = document.getElementById('lastScore');
    const gameStartBtn = document.getElementById('gameStartBtn');
    const restartBtn = document.getElementById('restartBtn');
    const colorButtons = document.querySelectorAll('.color-btn');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const castScoreBtn = document.getElementById('castScoreBtn');
    const viewLeaderboardBtn = document.getElementById('viewLeaderboardBtn');
    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    const leaderboardModal = document.getElementById('leaderboardModal');

    let gameRunning = false;
    let score = 0;
    let bestScore = 0;
    let lastScore = 0;
    let gamesPlayed = 0;
    let timeLeft = GAME_DURATION;
    let circles = [];
    let particles = [];

    const CANVAS_HEIGHT = canvas.height;
    const TARGET_ZONE_HEIGHT = Math.floor(CANVAS_HEIGHT * 0.6);
    const TARGET_ZONE_Y = CANVAS_HEIGHT - TARGET_ZONE_HEIGHT;

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
        const scoringGradient = ctx.createLinearGradient(0, TARGET_ZONE_Y, 0, CANVAS_HEIGHT);
        scoringGradient.addColorStop(0, 'rgba(102, 126, 234, 1)');
        scoringGradient.addColorStop(0.5, 'rgba(138, 43, 226, 1)');
        scoringGradient.addColorStop(1, 'rgba(147, 51, 234, 1)');
        
        ctx.fillStyle = scoringGradient;
        ctx.fillRect(0, TARGET_ZONE_Y, canvas.width, TARGET_ZONE_HEIGHT);

        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(0, TARGET_ZONE_Y, canvas.width, TARGET_ZONE_HEIGHT / 2);
        ctx.restore();

        const pulseOffset = Math.sin(Date.now() / 300) * 3;
        ctx.strokeStyle = '#E0B0FF';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#E0B0FF';
        ctx.setLineDash([15, 8]);
        ctx.beginPath();
        ctx.moveTo(0, TARGET_ZONE_Y + pulseOffset);
        ctx.lineTo(canvas.width, TARGET_ZONE_Y + pulseOffset);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#000';
        ctx.fillText('⬇ TAP ZONE ⬇', canvas.width / 2, TARGET_ZONE_Y + 35);
        ctx.shadowBlur = 0;
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
            this.rotation = 0;
            this.rotationSpeed = (Math.random() - 0.5) * 0.1;
            this.pulsePhase = Math.random() * Math.PI * 2;
        }

        update() {
            this.y += this.speed;
            this.rotation += this.rotationSpeed;
            this.inTargetZone = (this.y >= TARGET_ZONE_Y && this.y <= CANVAS_HEIGHT - 40);
            
            if (this.y > CANVAS_HEIGHT - 30) {
                this.toRemove = true;
            }
        }

        draw() {
            const pulse = Math.sin(Date.now() / 200 + this.pulsePhase) * 3;
            
            if (this.inTargetZone) {
                ctx.save();
                
                const outerGlow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius + 30);
                outerGlow.addColorStop(0, COLORS[this.color] + '80');
                outerGlow.addColorStop(0.5, COLORS[this.color] + '30');
                outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = outerGlow;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + 30, 0, Math.PI * 2);
                ctx.fill();
                
                const pulseSize = Math.sin(Date.now() / 200) * 8 + 8;
                ctx.strokeStyle = COLORS[this.color];
                ctx.lineWidth = 4;
                ctx.shadowBlur = 20;
                ctx.shadowColor = COLORS[this.color];
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius + pulseSize, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.restore();
            }

            ctx.save();
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;
            
            const mainGradient = ctx.createRadialGradient(
                this.x - this.radius * 0.3, 
                this.y - this.radius * 0.3, 
                0,
                this.x, 
                this.y, 
                this.radius
            );
            mainGradient.addColorStop(0, this.lightenColor(COLORS[this.color], 40));
            mainGradient.addColorStop(1, COLORS[this.color]);
            
            ctx.fillStyle = mainGradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.save();
            const highlightGradient = ctx.createRadialGradient(
                this.x - this.radius * 0.4,
                this.y - this.radius * 0.4,
                0,
                this.x - this.radius * 0.4,
                this.y - this.radius * 0.4,
                this.radius * 0.6
            );
            highlightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            highlightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = highlightGradient;
            ctx.beginPath();
            ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = this.inTargetZone ? 4 : 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + pulse, 0, Math.PI * 2);
            ctx.stroke();

            if (this.inTargetZone) {
                ctx.save();
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.shadowBlur = 10;
                ctx.shadowColor = COLORS[this.color];
                ctx.fillText('▼', 0, 0);
                ctx.restore();
            }
        }

        lightenColor(color, percent) {
            const num = parseInt(color.replace("#",""), 16);
            const amt = Math.round(2.55 * percent);
            const R = (num >> 16) + amt;
            const G = (num >> 8 & 0x00FF) + amt;
            const B = (num & 0x0000FF) + amt;
            return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + 
                   (G<255?G<1?0:G:255)*0x100 + 
                   (B<255?B<1?0:B:255)).toString(16).slice(1);
        }
    }

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.alpha = 1;
            this.color = color;
            this.size = Math.random() * 6 + 3;
            this.rotation = 0;
            this.rotationSpeed = (Math.random() - 0.5) * 0.3;
        }

        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.2;
            this.alpha -= 0.015;
            this.rotation += this.rotationSpeed;
            this.size *= 0.98;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            
            ctx.fillStyle = this.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = this.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5;
                const x = Math.cos(angle) * this.size;
                const y = Math.sin(angle) * this.size;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        }

        isDead() {
            return this.alpha <= 0 || this.size < 0.5;
        }
    }

    function createParticles(x, y, color, count) {
        count = count || 30;
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
                    createParticles(circle.x, circle.y, COLORS[circle.color], 35);
                    
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

    function drawInitialCanvas() {
        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#2d1b69');
        bgGradient.addColorStop(0.5, '#4a2870');
        bgGradient.addColorStop(1, '#3d2463');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height / 3);
        ctx.restore();

        drawTargetZone();
    }

    function gameLoop() {
        if (!gameRunning) return;

        const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgGradient.addColorStop(0, '#2d1b69');
        bgGradient.addColorStop(0.5, '#4a2870');
        bgGradient.addColorStop(1, '#3d2463');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height / 3);
        ctx.restore();

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

    function saveScore(scoreValue) {
        try {
            let scores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            scores.push({
                score: scoreValue,
                date: new Date().toISOString()
            });
            
            scores.sort((a, b) => b.score - a.score);
            scores = scores.slice(0, 10);
            
            localStorage.setItem('leaderboard', JSON.stringify(scores));
        } catch (e) {
            console.error('Failed to save score:', e);
        }
    }

    function loadLeaderboard() {
        try {
            const scores = JSON.parse(localStorage.getItem('leaderboard') || '[]');
            const leaderboardList = document.getElementById('leaderboardList');
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<p style="text-align:center;color:#999;">No scores yet. Play to be first!</p>';
                return;
            }
            
            leaderboardList.innerHTML = scores.map((item, index) => {
                const date = new Date(item.date);
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
                
                return `
                    <div class="leaderboard-item">
                        <div class="leaderboard-rank">${medal} #${index + 1}</div>
                        <div class="leaderboard-score">${item.score} pts</div>
                        <div class="leaderboard-date">${formattedDate}</div>
                    </div>
                `;
            }).join('');
        } catch (e) {
            console.error('Failed to load leaderboard:', e);
        }
    }

    async function castScore(scoreValue) {
        try {
            if (!window.farcasterSDK) {
                alert('Farcaster SDK not available. Please open in Warpcast.');
                return;
            }
            
            const text = `🎨 I just scored ${scoreValue} points in Color Match Rush! Can you beat me? 🎮`;
            
            await window.farcasterSDK.actions.openUrl('https://warpcast.com/~/compose?text=' + encodeURIComponent(text));
            console.log('✅ Cast opened');
        } catch (error) {
            console.error('Cast error:', error);
            alert('Failed to cast score. Please try again.');
        }
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
        saveScore(score);

        if (score > bestScore) {
            bestScore = score;
            bestEl.textContent = bestScore;
            try {
                localStorage.setItem('colorMatchBest', bestScore);
            } catch (e) {}
        }
    }

    function startGameFromClick() {
        gameOverScreen.classList.add('hidden');
        leaderboardModal.classList.add('hidden');
        
        gameRunning = true;
        init();
        startTimer();
        gameLoop();
    }

    colorButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            const color = btn.getAttribute('data-color');
            handleColorClick(color);
        });
    });

    gameStartBtn.addEventListener('click', function(e) {
        e.preventDefault();
        startGameFromClick();
    });

    restartBtn.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const btn = this;
        const originalText = btn.textContent;
        btn.textContent = '⏳ Processing Payment...';
        btn.disabled = true;
        
        const paid = await processPayment();
        
        if (paid) {
            console.log('✅ Payment successful, playing again');
            btn.textContent = originalText;
            btn.disabled = false;
            startGameFromClick();
        } else {
            console.log('❌ Payment failed');
            btn.textContent = originalText;
            btn.disabled = false;
        }
    });

    castScoreBtn.addEventListener('click', function() {
        castScore(finalScoreEl.textContent);
    });

    viewLeaderboardBtn.addEventListener('click', function() {
        loadLeaderboard();
        leaderboardModal.classList.remove('hidden');
    });

    closeLeaderboardBtn.addEventListener('click', function() {
        leaderboardModal.classList.add('hidden');
    });

    console.log('✅ Game initialized with glass effect & leaderboard');
    drawInitialCanvas();
}
