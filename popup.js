document.addEventListener('DOMContentLoaded', async function() {
    // Get DOM elements
    const elements = {
        searchInput: document.getElementById('keywords'),
        categorySelect: document.getElementById('categorySelect'),
        minPriceInput: document.getElementById('minPrice'),
        maxPriceInput: document.getElementById('maxPrice'),
        bestValueBtn: document.getElementById('bestValueBtn'),
        lowestPriceBtn: document.getElementById('lowestPriceBtn'),
        trendingDealsBtn: document.getElementById('trendingDealsBtn'),
        errorMessage: document.getElementById('errorMessage')
    };

    // Verify all elements exist
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Missing element: ${key}`);
            return;
        }
    }

    // Function to show error
    function showError(message) {
        elements.errorMessage.textContent = message;
        elements.errorMessage.style.display = 'block';
    }

    // Function to hide error
    function hideError() {
        elements.errorMessage.style.display = 'none';
    }

    // Function to validate inputs
    function validateInputs() {
        const keywords = elements.searchInput.value.trim();
        if (!keywords) {
            showError('Please enter search keywords');
            return false;
        }

        const minPrice = parseFloat(elements.minPriceInput.value);
        const maxPrice = parseFloat(elements.maxPriceInput.value);

        if (minPrice && maxPrice && minPrice > maxPrice) {
            showError('Minimum price cannot be greater than maximum price');
            return false;
        }

        if ((minPrice && minPrice < 0) || (maxPrice && maxPrice < 0)) {
            showError('Prices cannot be negative');
            return false;
        }

        return true;
    }

    // Function to handle search
    async function handleSearch(dealType) {
        try {
            hideError();
            
            if (!validateInputs()) {
                return;
            }

            // Disable all buttons during search
            elements.bestValueBtn.disabled = true;
            elements.lowestPriceBtn.disabled = true;
            elements.trendingDealsBtn.disabled = true;

            // Build Amazon search URL
            const searchQuery = encodeURIComponent(elements.searchInput.value.trim());
            let amazonUrl = `https://www.amazon.com/s?k=${searchQuery}`;
            
            // Add category if specified
            const category = elements.categorySelect.value;
            if (category !== 'all') {
                amazonUrl += `&i=${category}`;
            }
            
            // Add price range if specified
            const minPrice = elements.minPriceInput.value;
            const maxPrice = elements.maxPriceInput.value;
            if (minPrice || maxPrice) {
                amazonUrl += '&rh=p_36%3A';
                if (minPrice) amazonUrl += encodeURIComponent(minPrice + '00-');
                if (maxPrice) amazonUrl += encodeURIComponent(maxPrice + '00');
            }

            // Add sorting based on deal type
            switch (dealType) {
                case 'best-value':
                    amazonUrl += '&s=review-rank'; // Sort by customer reviews
                    break;
                case 'lowest-price':
                    amazonUrl += '&s=price-asc-rank'; // Sort by price: low to high
                    break;
                case 'trending':
                    amazonUrl += '&s=date-desc-rank'; // Sort by newest arrivals
                    break;
            }

            // Send message to background script
            chrome.runtime.sendMessage({
                action: 'fetchDeals',
                url: amazonUrl,
                dealType: dealType
            }, response => {
                // Re-enable all buttons
                elements.bestValueBtn.disabled = false;
                elements.lowestPriceBtn.disabled = false;
                elements.trendingDealsBtn.disabled = false;

                if (chrome.runtime.lastError) {
                    showError('Error fetching deals: ' + chrome.runtime.lastError.message);
                    return;
                }

                if (response.error) {
                    showError(response.error);
                    return;
                }

                // Open deals in new tab
                chrome.tabs.create({
                    url: `deals.html?deals=${encodeURIComponent(JSON.stringify(response.deals))}&type=${dealType}&keywords=${searchQuery}`
                });
            });

        } catch (error) {
            console.error('Search error:', error);
            showError('An error occurred while searching. Please try again.');
            
            // Re-enable all buttons
            elements.bestValueBtn.disabled = false;
            elements.lowestPriceBtn.disabled = false;
            elements.trendingDealsBtn.disabled = false;
        }
    }

    // Add click handlers for each button
    elements.bestValueBtn.addEventListener('click', () => handleSearch('best-value'));
    elements.lowestPriceBtn.addEventListener('click', () => handleSearch('lowest-price'));
    elements.trendingDealsBtn.addEventListener('click', () => handleSearch('trending'));

    // Add enter key handler for search input
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch('best-value'); // Default to best value on enter
        }
    });
});
