// Background script for Amazon Deal Finder

console.log('Background script loaded');

// Function to get AI suggestions for deals
async function getAISuggestions(query) {
    try {
        const API_KEY = ''; // Add your OpenAI API key here
        if (!API_KEY) {
            throw new Error('Please add your OpenAI API key in the extension settings');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: `You are an expert Amazon shopping assistant. For the given product search:
                        1. Suggest optimal search terms for finding the best deals
                        2. Recommend price ranges based on market analysis
                        3. Point out key features to look for
                        4. Warn about common issues or scams
                        5. Suggest alternative products if relevant
                        Format your response in clear sections with emojis.`
                }, {
                    role: "user",
                    content: query
                }],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get AI suggestions');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('AI Suggestion Error:', error);
        throw error;
    }
}

// Function to analyze product details
async function analyzeProduct(productInfo) {
    try {
        const API_KEY = ''; // Add your OpenAI API key here
        if (!API_KEY) {
            throw new Error('Please add your OpenAI API key');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: `You are an expert product analyzer. Analyze this product and provide:
                        1. Price analysis (is it a good deal?)
                        2. Quality assessment based on reviews
                        3. Pros and cons
                        4. Reliability score (1-10)
                        5. Recommendations
                        Use emojis and clear formatting.`
                }, {
                    role: "user",
                    content: JSON.stringify(productInfo)
                }],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error('Failed to analyze product');
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Product Analysis Error:', error);
        throw error;
    }
}

// Function to handle Amazon search
async function handleAmazonSearch(searchParams) {
    try {
        console.log('Handling Amazon search:', searchParams);
        const { keywords, country, category, minPrice, maxPrice, freeDelivery } = searchParams;
        
        let url = `https://www.amazon.${country}/s?k=${encodeURIComponent(keywords)}`;
        
        if (category) {
            url += `&rh=n%3A${category}`;
        }
        
        if (minPrice) {
            url += `&low-price=${minPrice}`;
        }
        
        if (maxPrice) {
            url += `&high-price=${maxPrice}`;
        }
        
        if (freeDelivery) {
            url += '&prime=true';
        }
        
        // Add deals filter
        url += '&deals-widget=%257B%2522version%2522%253A1%252C%2522viewIndex%2522%253A0%252C%2522presetId%2522%253A%2522deals-collection-all-deals%2522%257D';
        
        console.log('Opening URL:', url);
        const tab = await chrome.tabs.create({ url });
        return { success: true, tab };
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
}

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the URL is an Amazon URL
    if (changeInfo.url && isAmazonUrl(changeInfo.url)) {
        const newUrl = addAffiliateTag(changeInfo.url);
        if (newUrl !== changeInfo.url) {
            chrome.tabs.update(tabId, { url: newUrl });
        }
    }
});

// Check if URL is from Amazon
function isAmazonUrl(url) {
    const amazonDomains = [
        'amazon.com',
        'amazon.co.uk',
        'amazon.ca',
        'amazon.de',
        'amazon.fr',
        'amazon.it',
        'amazon.es',
        'amazon.co.jp',
        'amazon.cn'
    ];
    
    try {
        const urlObj = new URL(url);
        return amazonDomains.some(domain => urlObj.hostname.endsWith(domain));
    } catch {
        return false;
    }
}

// Add affiliate tag to URL
function addAffiliateTag(url) {
    try {
        const urlObj = new URL(url);
        const searchParams = new URLSearchParams(urlObj.search);
        
        // Don't modify URLs that already have our tag
        if (searchParams.get('tag') === 'bwizcom-20') {
            return url;
        }

        // Add or replace affiliate tag
        searchParams.set('tag', 'bwizcom-20');
        urlObj.search = searchParams.toString();
        
        return urlObj.toString();
    } catch {
        return url;
    }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === "getAISuggestions") {
        getAISuggestions(request.query)
            .then(suggestions => {
                console.log('AI suggestions received');
                sendResponse({ suggestions });
            })
            .catch(error => {
                console.error('AI error:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
    
    if (request.action === "analyzeProduct") {
        analyzeProduct(request.productInfo)
            .then(analysis => {
                console.log('Product analysis complete');
                sendResponse({ analysis });
            })
            .catch(error => {
                console.error('Analysis error:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
    
    if (request.action === "searchAmazon") {
        handleAmazonSearch(request.params)
            .then(result => {
                console.log('Search completed');
                sendResponse(result);
            })
            .catch(error => {
                console.error('Search error:', error);
                sendResponse({ error: error.message });
            });
        return true;
    }
    
    if (request.action === "search") {
        const url = buildSearchUrl(request.params);
        chrome.tabs.create({ url: url });
    }
});

// Build search URL with all parameters
function buildSearchUrl(params) {
    const {
        keywords,
        country,
        category,
        minPrice,
        maxPrice,
        discount,
        sort
    } = params;

    let url = `https://www.amazon.${country}/s?k=${encodeURIComponent(keywords)}&tag=bwizcom-20`;

    // Add category
    if (category) {
        url += `&rh=n:${category}`;
    }

    // Add price range
    if (minPrice || maxPrice) {
        url += '&p_36=';
        if (minPrice) url += `${minPrice}00-`;
        if (maxPrice) url += `${maxPrice}00`;
    }

    // Add discount filter
    if (discount > 0) {
        url += `&pct-off=${discount}-`;
    }

    // Add sorting
    if (sort) {
        switch(sort) {
            case 'price-asc':
                url += '&s=price-asc-rank';
                break;
            case 'price-desc':
                url += '&s=price-desc-rank';
                break;
            case 'reviews':
                url += '&s=review-rank';
                break;
            default:
                url += '&s=relevance-fs-rank';
        }
    }

    return url;
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('popup.html')
    });
});

// OpenAI API configuration
const OPENAI_API_KEY = ''; // Add your OpenAI API key here

// Function to analyze Amazon search results
async function analyzeAmazonPage(url) {
    try {
        // Fetch the Amazon page
        const response = await fetch(url);
        const html = await response.text();
        
        // Extract product data
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const products = Array.from(doc.querySelectorAll('.s-result-item')).map(item => ({
            title: item.querySelector('h2')?.textContent?.trim(),
            price: item.querySelector('.a-price')?.textContent?.trim(),
            originalPrice: item.querySelector('.a-text-strike')?.textContent?.trim(),
            rating: item.querySelector('.a-star-rating')?.textContent?.trim(),
            reviews: item.querySelector('.a-size-base')?.textContent?.trim(),
            url: item.querySelector('a.a-link-normal')?.href
        })).filter(p => p.title && p.price);

        // Analyze with OpenAI
        const analysis = await analyzeWithAI(products);
        return analysis;
    } catch (error) {
        console.error('Error analyzing Amazon page:', error);
        return null;
    }
}

// Function to analyze products with OpenAI
async function analyzeWithAI(products) {
    try {
        const prompt = `
            Analyze these Amazon products and find the best deals:
            ${JSON.stringify(products, null, 2)}
            
            Consider:
            1. Price compared to original price
            2. Rating and number of reviews
            3. Value for money
            4. Historical price trends
            
            Return the top 3 best deals with explanation.
        `;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{
                    role: "system",
                    content: "You are an AI shopping assistant that helps find the best Amazon deals."
                }, {
                    role: "user",
                    content: prompt
                }]
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('OpenAI API Error:', error);
        return null;
    }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Received message:', request);
    
    if (request.action === 'fetchDeals') {
        console.log('Fetching deals for URL:', request.url);
        
        // Add necessary headers for web request
        const headers = new Headers({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });

        fetch(request.url, { headers })
            .then(response => response.text())
            .then(html => {
                const products = [];
                
                // Match product blocks with improved regex
                const productBlocks = html.match(/<div[^>]*class="[^"]*s-result-item[^"]*"[^>]*data-asin="[^"]*"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g) || [];
                
                for (const block of productBlocks) {
                    try {
                        // Extract ASIN
                        const asin = block.match(/data-asin="([^"]*)"/)?.[1];
                        if (!asin) continue;

                        // Extract title
                        const titleMatch = block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/);
                        const title = titleMatch ? 
                            titleMatch[1].replace(/&quot;/g, '"')
                                        .replace(/&amp;/g, '&')
                                        .replace(/&lt;/g, '<')
                                        .replace(/&gt;/g, '>')
                                        .trim() : '';
                        if (!title) continue;

                        // Extract prices
                        const currentPriceMatch = block.match(/class="a-price"[^>]*>[\s\S]*?<span[^>]*>\$([\d,\.]+)/);
                        const currentPrice = currentPriceMatch ? currentPriceMatch[1].replace(/,/g, '') : '';
                        
                        const originalPriceMatch = block.match(/class="a-price a-text-price"[^>]*>[\s\S]*?<span[^>]*>\$([\d,\.]+)/);
                        const originalPrice = originalPriceMatch ? originalPriceMatch[1].replace(/,/g, '') : '';

                        // Extract rating
                        const ratingMatch = block.match(/class="a-icon-star-small"[^>]*>([^<]*)<\/i>/);
                        const rating = ratingMatch ? ratingMatch[1].trim() : '';

                        // Extract image
                        const imageMatch = block.match(/img[^>]*class="s-image"[^>]*src="([^"]*)"/);
                        const image = imageMatch ? imageMatch[1] : '';

                        // Extract URL
                        const urlMatch = block.match(/a[^>]*class="a-link-normal[^"]*s-no-outline"[^>]*href="([^"]*)"/);
                        const url = urlMatch ? 
                            urlMatch[1].startsWith('http') ? urlMatch[1] : `https://www.amazon.com${urlMatch[1]}` : '';

                        // Calculate savings if both prices exist
                        let savings = '';
                        if (originalPrice && currentPrice) {
                            const saveAmount = (parseFloat(originalPrice) - parseFloat(currentPrice)).toFixed(2);
                            const savePercent = Math.round((saveAmount / parseFloat(originalPrice)) * 100);
                            savings = `Save $${saveAmount} (${savePercent}%)`;
                        }

                        if (currentPrice) {  // Only add if we have at least a current price
                            products.push({
                                title,
                                currentPrice,
                                originalPrice,
                                rating,
                                image,
                                url,
                                asin,
                                savings
                            });
                        }
                    } catch (error) {
                        console.error('Error parsing product block:', error);
                        continue;
                    }
                }

                // Sort products based on deal type
                switch (request.dealType) {
                    case 'best-value':
                        products.sort((a, b) => {
                            const ratingA = parseFloat(a.rating) || 0;
                            const ratingB = parseFloat(b.rating) || 0;
                            const savingsPercentA = a.originalPrice ? (1 - parseFloat(a.currentPrice)/parseFloat(a.originalPrice)) : 0;
                            const savingsPercentB = b.originalPrice ? (1 - parseFloat(b.currentPrice)/parseFloat(b.originalPrice)) : 0;
                            return (ratingB * savingsPercentB) - (ratingA * savingsPercentA);
                        });
                        break;
                    case 'lowest-price':
                        products.sort((a, b) => parseFloat(a.currentPrice) - parseFloat(b.currentPrice));
                        break;
                    case 'trending':
                        // Keep original Amazon sorting
                        break;
                }

                console.log('Found products:', products.length);
                sendResponse({ deals: products });
            })
            .catch(error => {
                console.error('Error fetching deals:', error);
                sendResponse({ error: 'Failed to fetch deals. Please try again.' });
            });

        return true; // Will respond asynchronously
    }

    if (request.action === 'analyzeDeals') {
        analyzeAmazonPage(request.url)
            .then(analysis => {
                if (analysis) {
                    sendResponse({ success: true, analysis });
                } else {
                    sendResponse({ success: false, error: 'Analysis failed' });
                }
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });
        return true; // Keep the message channel open for async response
    }
});
