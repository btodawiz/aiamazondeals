console.log('Amazon Deal Finder content script loaded');

// Initialize state
let isInitialized = false;

// Initialize the extension
function initialize() {
    if (isInitialized) return;
    isInitialized = true;
    
    console.log('Initializing Amazon Deal Finder...');
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log('Content script received message:', message);
        
        if (message.type === 'SEARCH_DEALS') {
            handleDealSearch(message.data);
            sendResponse({ success: true });
        }
        
        return true; // Keep message channel open for async response
    });
}

// Handle deal search
function handleDealSearch(data) {
    console.log('Searching for deals:', data);
    // This function can be expanded later for additional functionality
}

// Function to wait for elements to load
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkElement = () => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            if (Date.now() - startTime >= timeout) {
                reject(new Error(`Timeout waiting for ${selector}`));
                return;
            }
            
            requestAnimationFrame(checkElement);
        };
        
        checkElement();
    });
}

// Function to find and click coupons
async function findAndClickCoupons() {
    try {
        // Wait for product grid to load
        await waitForElement('[data-component-type="s-search-result"]');
        
        // Find all product cards
        const productCards = document.querySelectorAll('[data-component-type="s-search-result"]');
        let couponsFound = 0;
        
        productCards.forEach(card => {
            // Find coupon checkbox
            const couponElement = card.querySelector('.s-coupon-unclipped');
            if (couponElement) {
                // Get product details
                const title = card.querySelector('h2')?.textContent?.trim() || 'Unknown Product';
                const priceElement = card.querySelector('.a-price-whole');
                const price = priceElement ? parseFloat(priceElement.textContent.replace(/[^0-9.]/g, '')) : 0;
                
                // Click the coupon
                couponElement.click();
                couponsFound++;
                
                console.log(`Applied coupon for: ${title} - $${price}`);
            }
        });
        
        // Show results
        if (couponsFound > 0) {
            // Create floating notification
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #8B5CF6;
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 9999;
                font-family: Arial, sans-serif;
                animation: slideIn 0.3s ease-out;
            `;
            notification.textContent = `Applied ${couponsFound} coupons! 🎉`;
            document.body.appendChild(notification);
            
            // Remove after 5 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }, 5000);
        }
        
    } catch (error) {
        console.error('Error finding coupons:', error);
    }
}

// Add styles for animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'findCoupons') {
        findAndClickCoupons()
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Keep the message channel open for async response
    }
});

// Start initialization
initialize();
