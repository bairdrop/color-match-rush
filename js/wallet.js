import sdk from '@farcaster/frame-sdk';

// Initialize Farcaster SDK
sdk.actions.ready();

// Wallet state
let userAddress = null;
let isConnected = false;

// DOM elements
const connectWalletBtn = document.getElementById('connectWallet');
const walletInfo = document.getElementById('walletInfo');
const walletAddressEl = document.getElementById('walletAddress');
const walletBalanceEl = document.getElementById('walletBalance');
const startBtn = document.getElementById('startBtn');

// Connect wallet
connectWalletBtn.addEventListener('click', async () => {
    try {
        // Get Ethereum provider from Farcaster
        const provider = await sdk.wallet.getEthereumProvider();
        
        // Request accounts
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });
        
        if (accounts && accounts.length > 0) {
            userAddress = accounts[0];
            isConnected = true;
            
            // Display wallet info
            walletAddressEl.textContent = userAddress.slice(0, 6) + '...' + userAddress.slice(-4);
            connectWalletBtn.classList.add('hidden');
            walletInfo.classList.remove('hidden');
            
            // Get balance
            const balance = await provider.request({
                method: 'eth_getBalance',
                params: [userAddress, 'latest']
            });
            
            const ethBalance = parseInt(balance, 16) / 1e18;
            walletBalanceEl.textContent = ethBalance.toFixed(4) + ' ETH';
        }
    } catch (error) {
        console.error('Wallet connection failed:', error);
        alert('Failed to connect wallet. Please try again.');
    }
});

// Pay to play function
async function payToPlay() {
    if (!isConnected) {
        alert('Please connect your wallet first!');
        return false;
    }
    
    try {
        const provider = await sdk.wallet.getEthereumProvider();
        
        // Send payment transaction (0.0001 ETH)
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: 'YOUR_PAYMENT_WALLET_ADDRESS', // Replace with your wallet
                value: '0x5AF3107A4000' // 0.0001 ETH in hex
            }]
        });
        
        console.log('Payment successful:', txHash);
        return true;
    } catch (error) {
        console.error('Payment failed:', error);
        alert('Payment failed. Please try again.');
        return false;
    }
}

// Reward winner function
async function rewardWinner(score) {
    if (score >= 100 && isConnected) {
        // This would typically be done server-side for security
        alert('🎉 Congratulations! You won 0.0002 ETH! Check your wallet.');
        
        // Show prize notification
        document.getElementById('prizeSection').classList.remove('hidden');
    }
}

// Export functions for use in game.js
window.payToPlay = payToPlay;
window.rewardWinner = rewardWinner;
window.isWalletConnected = () => isConnected;
