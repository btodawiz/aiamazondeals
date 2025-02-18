document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        dealsContainer: document.getElementById('dealsContainer'),
        loadingContainer: document.getElementById('loadingContainer'),
        errorContainer: document.getElementById('errorContainer'),
        noResultsContainer: document.getElementById('noResultsContainer'),
        pagination: document.querySelector('.pagination'),
        prevButton: document.querySelector('.pagination button:first-child'),
        nextButton: document.querySelector('.pagination button:last-child'),
        currentPageSpan: document.querySelector('.pagination .current-page')
    };

    let currentPage = 1;
    const itemsPerPage = 12;
    let allDeals = [];

    function showLoading() {
        elements.loadingContainer.style.display = 'block';
        elements.dealsContainer.style.display = 'none';
        elements.errorContainer.style.display = 'none';
        elements.noResultsContainer.style.display = 'none';
    }

    function showError() {
        elements.loadingContainer.style.display = 'none';
        elements.dealsContainer.style.display = 'none';
        elements.errorContainer.style.display = 'block';
        elements.noResultsContainer.style.display = 'none';
    }

    function showNoResults() {
        elements.loadingContainer.style.display = 'none';
        elements.dealsContainer.style.display = 'none';
        elements.errorContainer.style.display = 'none';
        elements.noResultsContainer.style.display = 'block';
    }

    function showDeals() {
        elements.loadingContainer.style.display = 'none';
        elements.dealsContainer.style.display = 'grid';
        elements.errorContainer.style.display = 'none';
        elements.noResultsContainer.style.display = 'none';
    }

    try {
        showLoading();

        const urlParams = new URLSearchParams(window.location.search);
        const dealsParam = urlParams.get('deals');
        const searchType = urlParams.get('type') || '';
        const keywords = urlParams.get('keywords') || '';

        if (!dealsParam) {
            throw new Error('No deals data provided');
        }

        // Parse the deals data
        try {
            const parsedData = JSON.parse(dealsParam);
            allDeals = parsedData.deals || parsedData;
            
            if (!Array.isArray(allDeals) || allDeals.length === 0) {
                showNoResults();
                return;
            }

            // Update the page title and header
            const title = `Amazon ${searchType} Deals for "${keywords}"`;
            document.title = title;
            document.querySelector('.header h1').textContent = title;

            // Render the deals
            renderDeals();
            updatePaginationUI();
            showDeals();

        } catch (parseError) {
            console.error('JSON Parse error:', parseError);
            showError();
        }

    } catch (error) {
        console.error('Error:', error);
        showError();
    }

    function sanitizeDeal(deal) {
        return {
            title: String(deal.title || '').trim(),
            currentPrice: Number(deal.currentPrice || 0).toFixed(2),
            originalPrice: Number(deal.originalPrice || 0).toFixed(2),
            savings: String(deal.savings || '').trim(),
            rating: String(deal.rating || '').trim(),
            image: validateUrl(deal.image) || 'https://via.placeholder.com/300x300?text=No+Image',
            url: validateUrl(deal.url) || '#'
        };
    }

    function validateUrl(url) {
        if (!url) return null;
        try {
            // If it's a relative URL, make it absolute
            if (url.startsWith('/')) {
                return `https://www.amazon.com${url}`;
            }
            // If it's already absolute, validate it
            new URL(url);
            return url;
        } catch {
            return null;
        }
    }

    function createDealCard(deal) {
        const sanitizedDeal = sanitizeDeal(deal);
        return `
            <a href="${sanitizedDeal.url}" class="deal-card" target="_blank" rel="noopener noreferrer">
                <div class="deal-image-container">
                    <img src="${sanitizedDeal.image}" 
                        alt="${sanitizedDeal.title}" 
                        class="deal-image" 
                        onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
                        loading="lazy">
                </div>
                <h3>${sanitizedDeal.title}</h3>
                <div class="price-info">
                    <span class="current-price">$${sanitizedDeal.currentPrice}</span>
                    ${sanitizedDeal.originalPrice !== '0.00' ? 
                        `<span class="original-price">$${sanitizedDeal.originalPrice}</span>` : ''}
                    ${sanitizedDeal.savings ? 
                        `<span class="savings">${sanitizedDeal.savings}</span>` : ''}
                </div>
                ${sanitizedDeal.rating ? 
                    `<div class="rating">Rating: ${sanitizedDeal.rating}</div>` : ''}
            </a>
        `;
    }

    function renderDeals() {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentDeals = allDeals.slice(startIndex, endIndex);

        if (currentDeals.length === 0) {
            showNoResults();
            return;
        }

        elements.dealsContainer.innerHTML = currentDeals.map(createDealCard).join('');
    }

    function updatePaginationUI() {
        const totalPages = Math.ceil(allDeals.length / itemsPerPage);
        elements.prevButton.disabled = currentPage === 1;
        elements.nextButton.disabled = currentPage === totalPages;
        elements.currentPageSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    function handlePageChange(direction) {
        const totalPages = Math.ceil(allDeals.length / itemsPerPage);
        const newPage = currentPage + direction;

        if (newPage >= 1 && newPage <= totalPages) {
            currentPage = newPage;
            renderDeals();
            updatePaginationUI();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    elements.prevButton.addEventListener('click', () => handlePageChange(-1));
    elements.nextButton.addEventListener('click', () => handlePageChange(1));
});
