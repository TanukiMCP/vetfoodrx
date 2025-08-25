/*
 * Netlify Serverless Function: productPriceScraper
 *
 * This function scrapes product pricing from 1800PetMeds and Wag.com
 * to provide up-to-date pricing information for veterinary prescription diets.
 * It accepts query parameters for product identifiers and returns averaged
 * pricing data from both sources when available.
 *
 * Usage: /.netlify/functions/productPriceScraper?petmedsSlug=product-slug&wagSlug=product-slug
 */

const https = require('https');

function fetchPage(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    };

    https
      .get(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function scrape1800PetMeds(slug) {
  try {
    const url = `https://www.1800petmeds.com/${slug}`;
    const html = await fetchPage(url);
    
    // 1800PetMeds price extraction patterns
    const pricePatterns = [
      /\$\s*([0-9]+\.[0-9]{2})/g,
      /"price":\s*"([0-9]+\.[0-9]{2})"/g,
      /price["\s]*:\s*["\s]*\$?([0-9]+\.[0-9]{2})/gi
    ];

    for (const pattern of pricePatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        const prices = matches.map(match => parseFloat(match[1])).filter(p => p > 0);
        if (prices.length > 0) {
          return Math.min(...prices); // Return lowest price found
        }
      }
    }
    return null;
  } catch (error) {
    console.error('1800PetMeds scraping error:', error.message);
    return null;
  }
}

async function scrapeWag(slug) {
  try {
    const url = `https://www.wag.com/${slug}`;
    const html = await fetchPage(url);
    
    // Wag.com price extraction patterns
    const pricePatterns = [
      /\$\s*([0-9]+\.[0-9]{2})/g,
      /"price":\s*([0-9]+\.[0-9]{2})/g,
      /data-price["\s]*=["\s]*([0-9]+\.[0-9]{2})/gi
    ];

    for (const pattern of pricePatterns) {
      const matches = [...html.matchAll(pattern)];
      if (matches.length > 0) {
        const prices = matches.map(match => parseFloat(match[1])).filter(p => p > 0);
        if (prices.length > 0) {
          return Math.min(...prices); // Return lowest price found
        }
      }
    }
    return null;
  } catch (error) {
    console.error('Wag scraping error:', error.message);
    return null;
  }
}

exports.handler = async function (event, context) {
  const { petmedsSlug, wagSlug, productId } = event.queryStringParameters || {};
  
  if (!petmedsSlug && !wagSlug) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Missing product slug parameters. Provide petmedsSlug and/or wagSlug.' 
      })
    };
  }

  const results = {
    productId: productId || 'unknown',
    sources: {},
    averagePrice: null,
    timestamp: new Date().toISOString()
  };

  // Scrape from available sources
  const scrapingPromises = [];
  
  if (petmedsSlug) {
    scrapingPromises.push(
      scrape1800PetMeds(petmedsSlug).then(price => {
        if (price) results.sources['1800petmeds'] = price;
      })
    );
  }
  
  if (wagSlug) {
    scrapingPromises.push(
      scrapeWag(wagSlug).then(price => {
        if (price) results.sources['wag'] = price;
      })
    );
  }

  try {
    await Promise.all(scrapingPromises);
    
    // Calculate average price from successful scrapes
    const prices = Object.values(results.sources);
    if (prices.length > 0) {
      results.averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      results.averagePrice = Math.round(results.averagePrice * 100) / 100; // Round to 2 decimal places
    }

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify(results)
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Scraping failed', 
        details: error.message,
        productId: productId || 'unknown'
      })
    };
  }
};
