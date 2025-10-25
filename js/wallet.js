// ===== FARCASTER WALLET INTEGRATION =====
// Handles wallet connection and payment using Farcaster SDK EIP-1193 provider

const PAYMENT_WALLET = '0x71af9Ed03B216a5dD66889EBd2f4Ec8f3912602B';
const ENTRY_FEE = '0x9184e72a000'; // 0.00001 ETH in hex

// Get Farcaster Ethereum Provider (Official Method)
async function getFarcasterProvider() {
    try {
        if (!window.farcasterSDK) {
            throw new Error('Farcaster SDK not loaded');
        }
        
        const provider = await window.farcasterSDK.wallet.getEthereumProvider();
        if (!provider) {
            throw new Error('No wallet provider available');
        }
        
        return provider;
    } catch (error) {
        console.error('Error getting Farcaster provider:', error);
        return null;
    }
}

// Request User Accounts (Prompts wallet connection)
async function requestAccounts(provider) {
    try {
        const accounts = await provider.request({
            method: 'eth_requestAccounts'
        });
        
        if (!accounts || accounts.length === 0) {
            throw new Error('No accounts returned');
        }
        
        return accounts[0];
    } catch (error) {
        console.error('Error requesting accounts:', error);
        
        if (error.code === 4001) {
            alert('❌ User rejected connection');
        } else {
            alert('❌ Failed to connect wallet: ' + error.message);
        }
        
        return null;
    }
}

// Send Payment Transaction
async function sendPayment(provider, userAddress) {
    try {
        console.log('💰 Sending payment from:', userAddress);
        
        const txHash = await provider.request({
            method: 'eth_sendTransaction',
            params: [{
                from: userAddress,
                to: PAYMENT_WALLET,
                value: ENTRY_FEE,
                gas: '0x5208'
            }]
        });
        
        console.log('✅ Payment successful! Tx:', txHash);
        return txHash;
    } catch (error) {
        console.error('Payment error:', error);
        
        if (error.code === 4001) {
            alert('❌ Payment rejected by user');
        } else {
            alert('❌ Payment failed: ' + error.message);
        }
        
        return null;
    }
}

// Main Payment Flow
async function processPaymentFlow() {
    try {
        console.log('🔄 Starting payment flow...');
        
        // Step 1: Get Farcaster provider
        const provider = await getFarcasterProvider();
        if (!provider) {
            console.log('⚠️ No wallet provider in preview mode');
            return true; // Allow free play in preview
        }
        
        // Step 2: Request user accounts (connects wallet if needed)
        const userAddress = await requestAccounts(provider);
        if (!userAddress) {
            return false;
        }
        
        // Step 3: Send payment
        const txHash = await sendPayment(provider, userAddress);
        if (!txHash) {
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Payment flow error:', error);
        alert('❌ Payment error: ' + error.message);
        return false;
    }
}

// Export for game.js
window.walletModule = {
    processPaymentFlow,
    getFarcasterProvider,
    requestAccounts,
    sendPayment
};
