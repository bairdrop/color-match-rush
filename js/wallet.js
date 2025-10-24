// Payment Configuration
const PAYMENT_WALLET = '0x71af9Ed03B216a5dD66889EBd2f4Ec8f3912602B';
const ENTRY_FEE = '0x9184e72a000'; // 0.00001 ETH in hex

// Get Farcaster wallet provider
async function getProvider() {
    // Farcaster provides ethereum in window
    if (window.ethereum) {
        return window.ethereum;
    }
    throw new Error('No wallet provider found');
}

// Pay to Play - Returns true if payment successful
async function payToPlay() {
    try {
        console.log('💰 Requesting payment...');
        
        const provider = await getProvider();
        
        // Get connected account
        const accounts = await provider.request({
            method: 'eth_accounts'
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No account found');
        }
        
        const userAddress = accounts[0];
        console.log('👛 User wallet:', userAddress);
        
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
        
        console.log('✅ Payment sent! Tx:', txHash);
        return true;
        
    } catch (error) {
        console.error('❌ Payment error:', error);
        
        if (error.code === 4001) {
            alert('❌ Payment cancelled');
        } else {
            alert('❌ Payment failed: ' + (error.message || 'Unknown error'));
        }
        
        return false;
    }
}

// Check if score qualifies for prize
function checkWinner(score) {
    if (score >= 100) {
        document.getElementById('prizeSection').classList.remove('hidden');
        console.log('🏆 Winner! Score:', score, '- Prize: 0.00002 ETH');
    }
}

// Export for game.js
window.payToPlay = payToPlay;
window.checkWinner = checkWinner;
