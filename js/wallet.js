// Payment Configuration
const PAYMENT_WALLET = '0x71af9Ed03B216a5dD66889EBd2f4Ec8f3912602B';
const ENTRY_FEE = '0x9184e72a000'; // 0.00001 ETH in hex
const ENTRY_FEE_ETH = '0.00001';

// DOM Elements
const connectBtn = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const addressEl = document.getElementById('walletAddress');
const balanceEl = document.getElementById('walletBalance');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

// State
let userAddress = null;
let isConnected = false;
let provider = null;

// Connect Wallet
async function connectWallet() {
    try {
        // Try Farcaster wallet first
        if (window.ethereum) {
            provider = window.ethereum;
        } else {
            alert('No wallet detected. Please use Warpcast or install MetaMask.');
            return;
        }

        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            isConnected = true;

            addressEl.textContent = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
            connectBtn.classList.add('hidden');
            walletInfo.classList.remove('hidden');

            const balance = await provider.request({
                method: 'eth_getBalance',
                params: [userAddress, 'latest']
            });

            const ethBalance = parseInt(balance, 16) / 1e18;
            balanceEl.textContent = ethBalance.toFixed(5) + ' ETH';

            startBtn.disabled = false;
            startBtn.textContent = '💰 PAY & START (0.00001 ETH)';
            restartBtn.textContent = '🎮 PLAY AGAIN (0.00001 ETH)';

            console.log('✅ Wallet connected:', userAddress);
        }
    } catch (error) {
        console.error('Connection failed:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

// Pay to Play
async function payToPlay() {
    if (!isConnected || !provider) {
        alert('⚠️ Please connect your wallet first!');
        return false;
    }

    try {
        console.log('💰 Processing payment...');
        
        startBtn.textContent = '⏳ Processing...';
        startBtn.disabled = true;

        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: PAYMENT_WALLET,
                value: ENTRY_FEE,
                gas: '0x5208'
            }]
        });

        console.log('✅ Payment successful:', txHash);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
    } catch (error) {
        console.error('❌ Payment failed:', error);
        
        startBtn.textContent = '💰 PAY & START (0.00001 ETH)';
        startBtn.disabled = false;
        
        if (error.code === 4001) {
            alert('❌ Payment cancelled.');
        } else {
            alert('❌ Payment failed: ' + (error.message || 'Unknown error'));
        }
        
        return false;
    }
}

// Check Winner
function checkWinner(score) {
    if (score >= 100) {
        document.getElementById('prizeSection').classList.remove('hidden');
        console.log('🏆 Winner! Score:', score);
    }
}

// Event Listeners
connectBtn.addEventListener('click', connectWallet);

// Export functions
window.payToPlay = payToPlay;
window.checkWinner = checkWinner;
window.isWalletConnected = function() { return isConnected; };
