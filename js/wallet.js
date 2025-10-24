// Farcaster SDK initialization
let sdk;
let provider;
let userAddress = null;
let isConnected = false;

// Your payment wallet address
const PAYMENT_WALLET = '0x71af9Ed03B216a5dD66889EBd2f4Ec8f3912602B';
const ENTRY_FEE = '0x9184e72a000'; // 0.00001 ETH in hex
const PRIZE_AMOUNT = '0x12309ce54000'; // 0.00002 ETH in hex

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const walletAddressEl = document.getElementById('walletAddress');
const walletBalanceEl = document.getElementById('walletBalance');
const startBtn = document.getElementById('startBtn');

// Initialize Farcaster SDK
async function initializeFarcaster() {
    try {
        sdk = window.FarcasterFrameSDK;
        await sdk.actions.ready();
        console.log('Farcaster SDK initialized');
    } catch (error) {
        console.error('Failed to initialize Farcaster SDK:', error);
    }
}

// Connect wallet function
async function connectWallet() {
    try {
        // For Farcaster, get the provider
        if (sdk) {
            provider = await sdk.wallet.getEthereumProvider();
        } else {
            // Fallback to window.ethereum for testing
            provider = window.ethereum;
        }

        if (!provider) {
            alert('No Ethereum provider found. Please use Warpcast or install MetaMask.');
            return;
        }

        // Request accounts
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });

        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            isConnected = true;

            // Update UI
            walletAddressEl.textContent = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
            connectWalletBtn.classList.add('hidden');
            walletInfo.classList.remove('hidden');

            // Get and display balance
            const balance = await provider.request({
                method: 'eth_getBalance',
                params: [userAddress, 'latest']
            });

            const ethBalance = parseInt(balance, 16) / 1e18;
            walletBalanceEl.textContent = ethBalance.toFixed(5) + ' ETH';

            // Enable start button
            startBtn.disabled = false;
            startBtn.textContent = '💰 PAY 0.00001 ETH & START';

            console.log('Wallet connected:', userAddress);
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        alert('Failed to connect wallet. Please try again.');
    }
}

// Pay to play function
async function payToPlay() {
    if (!isConnected || !provider) {
        alert('⚠️ Please connect your wallet first!');
        return false;
    }

    try {
        console.log('Processing payment...');
        
        // Show loading on button
        startBtn.textContent = '⏳ Processing Payment...';
        startBtn.disabled = true;

        // Send payment transaction
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: PAYMENT_WALLET,
                value: ENTRY_FEE,
                gas: '0x5208' // 21000 gas
            }]
        });

        console.log('Payment successful! Tx:', txHash);
        
        // Wait a moment for transaction to be broadcast
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return true;
    } catch (error) {
        console.error('Payment failed:', error);
        
        // Re-enable button
        startBtn.textContent = '💰 PAY 0.00001 ETH & START';
        startBtn.disabled = false;
        
        if (error.code === 4001) {
            alert('❌ Payment cancelled by user.');
        } else {
            alert('❌ Payment failed: ' + error.message);
        }
        
        return false;
    }
}

// Reward winner function (placeholder - should be done server-side)
async function rewardWinner(score) {
    if (score >= 100 && isConnected) {
        console.log('Player won! Score:', score);
        
        // Show prize section
        document.getElementById('prizeSection').classList.remove('hidden');
        
        // In production, this should trigger a server-side transaction
        // For now, just log it
        console.log('Prize of 0.00002 ETH should be sent to:', userAddress);
        
        // Note: Server-side implementation needed for actual prize payout
        alert('🎉 Congratulations! You won 0.00002 ETH!\n\nNote: In production, prize will be sent automatically to your wallet.');
    }
}

// Event listener for connect wallet button
connectWalletBtn.addEventListener('click', connectWallet);

// Initialize when page loads
initializeFarcaster();

// Export functions for game.js
window.payToPlay = payToPlay;
window.rewardWinner = rewardWinner;
window.isWalletConnected = () => isConnected;
window.getUserAddress = () => userAddress;
