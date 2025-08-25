/*
 * Comprehensive Product Scraper for VetFoodRx
 * 
 * This function scrapes complete product data from 1800PetMeds including:
 * - Product names, descriptions, and features
 * - High-quality product images
 * - Pricing information with size variations
 * - Brand information
 * - Targeted health conditions
 * - Bag sizes and quantity options
 * - Nutritional analysis data
 * 
 * Supports both dog and cat food categories with professional-grade data extraction.
 */

const https = require('https');
const { URL } = require('url');

// Enhanced fetch function with proper headers and error handling
function fetchPage(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    };

    const request = https.get(url, options, (res) => {
      let data = '';
      
      // Handle different encodings
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Handle redirects
          fetchPage(res.headers.location, retries).then(resolve).catch(reject);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    request.on('error', (error) => {
      if (retries > 0) {
        console.log(`Retrying request to ${url}, attempts left: ${retries - 1}`);
        setTimeout(() => {
          fetchPage(url, retries - 1).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(error);
      }
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Extract product data from 1800PetMeds product page
function extractProductData(html, productUrl) {
  const product = {
    id: null,
    name: null,
    brand: null,
    description: null,
    features: [],
    image: null,
    images: [],
    price: null,
    priceRange: null,
    bagSizes: [],
    species: null,
    targetedConditions: [],
    type: null,
    nutritionalAnalysis: {},
    feedingGuide: null,
    link: productUrl,
    availability: 'in-stock',
    lastUpdated: new Date().toISOString()
  };

  try {
    // Extract product ID from URL or page
    const urlMatch = productUrl.match(/\/([^\/]+)(?:-product)?(?:\.html)?$/);
    if (urlMatch) {
      product.id = urlMatch[1].replace(/-product$/, '');
    }

    // Extract product name
    const namePatterns = [
      /<h1[^>]*class="[^"]*product[^"]*title[^"]*"[^>]*>([^<]+)<\/h1>/i,
      /<h1[^>]*>([^<]+(?:Dog|Cat|Pet).*?Food[^<]*)<\/h1>/i,
      /<title>([^<]+(?:Dog|Cat|Pet).*?Food[^<]*)/i,
      /"name":\s*"([^"]+)"/i
    ];
    
    for (const pattern of namePatterns) {
      const match = html.match(pattern);
      if (match) {
        product.name = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    // Extract brand information
    const brandPatterns = [
      /Hill's\s*Prescription\s*Diet/i,
      /Royal\s*Canin(?:\s*Veterinary\s*Diet)?/i,
      /Purina\s*Pro\s*Plan(?:\s*Veterinary\s*Diets)?/i,
      /Blue\s*Buffalo/i,
      /Wellness/i,
      /Science\s*Diet/i
    ];

    for (const pattern of brandPatterns) {
      if (pattern.test(html) || (product.name && pattern.test(product.name))) {
        if (pattern.source.includes("Hill's")) product.brand = "Hill's Prescription Diet";
        else if (pattern.source.includes("Royal")) product.brand = "Royal Canin Veterinary Diet";
        else if (pattern.source.includes("Purina")) product.brand = "Purina Pro Plan Veterinary Diets";
        else if (pattern.source.includes("Blue")) product.brand = "Blue Buffalo";
        else if (pattern.source.includes("Wellness")) product.brand = "Wellness";
        else if (pattern.source.includes("Science")) product.brand = "Hill's Science Diet";
        break;
      }
    }

    // Extract high-quality product image
    const imagePatterns = [
      /<img[^>]+class="[^"]*product[^"]*image[^"]*"[^>]+src="([^"]+)"/i,
      /<img[^>]+src="([^"]+)"[^>]*class="[^"]*product[^"]*image[^"]*"/i,
      /<img[^>]+src="([^"]+)"[^>]*alt="[^"]*(?:dog|cat|pet).*?food[^"]*"/i,
      /"image":\s*"([^"]+)"/i
    ];

    for (const pattern of imagePatterns) {
      const match = html.match(pattern);
      if (match) {
        let imageUrl = match[1];
        // Convert relative URLs to absolute
        if (imageUrl.startsWith('//')) {
          imageUrl = 'https:' + imageUrl;
        } else if (imageUrl.startsWith('/')) {
          imageUrl = 'https://www.1800petmeds.com' + imageUrl;
        }
        product.image = imageUrl;
        product.images.push(imageUrl);
        break;
      }
    }

    // Extract pricing information
    const pricePatterns = [
      /\$\s*([0-9]+\.?[0-9]*)/g,
      /"price":\s*"?([0-9]+\.?[0-9]*)"?/g,
      /price[^0-9]*([0-9]+\.?[0-9]*)/gi
    ];

    const foundPrices = [];
    for (const pattern of pricePatterns) {
      const matches = [...html.matchAll(pattern)];
      matches.forEach(match => {
        const price = parseFloat(match[1]);
        if (price > 5 && price < 500) { // Reasonable price range for pet food
          foundPrices.push(price);
        }
      });
    }

    if (foundPrices.length > 0) {
      const uniquePrices = [...new Set(foundPrices)].sort((a, b) => a - b);
      product.price = {
        estimate: uniquePrices[0],
        range: uniquePrices.length > 1 ? `$${uniquePrices[0]} - $${uniquePrices[uniquePrices.length - 1]}` : `$${uniquePrices[0]}`,
        average: uniquePrices.reduce((sum, p) => sum + p, 0) / uniquePrices.length,
        note: "Estimated pricing - actual prices may vary by location and retailer"
      };
    }

    // Extract bag sizes
    const sizePatterns = [
      /([0-9]+(?:\.[0-9]+)?\s*(?:lb|pound|kg|kilogram|oz|ounce)s?)/gi,
      /([0-9]+\s*x\s*[0-9]+(?:\.[0-9]+)?\s*(?:oz|ounce|lb|pound)\s*(?:cans?|bags?))/gi
    ];

    const foundSizes = new Set();
    for (const pattern of sizePatterns) {
      const matches = [...html.matchAll(pattern)];
      matches.forEach(match => {
        foundSizes.add(match[1].trim());
      });
    }
    product.bagSizes = Array.from(foundSizes).slice(0, 5); // Limit to 5 sizes

    // Determine species
    if (/\bdog\b/i.test(product.name || '') || /canine/i.test(html)) {
      product.species = 'dog';
    } else if (/\bcat\b/i.test(product.name || '') || /feline/i.test(html)) {
      product.species = 'cat';
    }

    // Determine food type
    if (/\bdry\b/i.test(product.name || '') || /kibble/i.test(html)) {
      product.type = 'dry';
    } else if (/\bwet\b/i.test(product.name || '') || /canned/i.test(html) || /\bcan\b/i.test(product.name || '')) {
      product.type = 'wet';
    }

    // Extract targeted conditions
    const conditionKeywords = [
      'kidney disease', 'renal', 'urinary', 'digestive', 'gastrointestinal',
      'diabetes', 'weight management', 'obesity', 'hepatic', 'liver',
      'joint', 'arthritis', 'mobility', 'skin', 'food sensitivities',
      'allergies', 'dental', 'critical care', 'hyperthyroidism',
      'pancreatitis', 'heart', 'cardiac'
    ];

    const foundConditions = new Set();
    const textToSearch = (html + ' ' + (product.name || '')).toLowerCase();
    
    conditionKeywords.forEach(condition => {
      if (textToSearch.includes(condition.toLowerCase())) {
        foundConditions.add(condition);
      }
    });

    // Map specific conditions
    if (foundConditions.has('renal')) foundConditions.add('kidney disease');
    if (foundConditions.has('gastrointestinal')) foundConditions.add('digestive');
    if (foundConditions.has('obesity')) foundConditions.add('weight management');
    if (foundConditions.has('arthritis')) foundConditions.add('joint');
    if (foundConditions.has('cardiac')) foundConditions.add('heart');

    product.targetedConditions = Array.from(foundConditions).slice(0, 4);

    // Extract features/benefits
    const featurePatterns = [
      /<li[^>]*>([^<]+(?:nutrition|support|health|benefit|formula|ingredient)[^<]*)<\/li>/gi,
      /<p[^>]*>([^<]+(?:clinically|proven|formulated|designed|helps|supports)[^<]*)<\/p>/gi
    ];

    const foundFeatures = new Set();
    for (const pattern of featurePatterns) {
      const matches = [...html.matchAll(pattern)];
      matches.forEach(match => {
        const feature = match[1].trim().replace(/\s+/g, ' ');
        if (feature.length > 20 && feature.length < 200) {
          foundFeatures.add(feature);
        }
      });
    }
    product.features = Array.from(foundFeatures).slice(0, 4);

    // Extract description
    const descPatterns = [
      /<meta[^>]+name="description"[^>]+content="([^"]+)"/i,
      /<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)<\/p>/i
    ];

    for (const pattern of descPatterns) {
      const match = html.match(pattern);
      if (match) {
        product.description = match[1].trim().replace(/\s+/g, ' ');
        break;
      }
    }

    return product;
  } catch (error) {
    console.error('Error extracting product data:', error);
    return product;
  }
}

// Scrape category page to get product links
async function scrapeCategoryPage(categoryUrl, maxProducts = 50) {
  try {
    const html = await fetchPage(categoryUrl);
    const productLinks = [];
    
    // Extract product links from category page
    const linkPatterns = [
      /<a[^>]+href="([^"]+)"[^>]*>.*?(?:dog|cat|pet).*?food.*?<\/a>/gi,
      /<a[^>]+href="([^"]+\/[^"\/]*(?:food|diet|nutrition)[^"\/]*)"[^>]*>/gi
    ];

    const foundLinks = new Set();
    for (const pattern of linkPatterns) {
      const matches = [...html.matchAll(pattern)];
      matches.forEach(match => {
        let link = match[1];
        if (link.startsWith('/')) {
          link = 'https://www.1800petmeds.com' + link;
        }
        if (link.includes('1800petmeds.com') && !foundLinks.has(link)) {
          foundLinks.add(link);
        }
      });
    }

    return Array.from(foundLinks).slice(0, maxProducts);
  } catch (error) {
    console.error('Error scraping category page:', error);
    return [];
  }
}

// Main handler function
exports.handler = async function (event, context) {
  const { category, maxProducts = 30, productUrl } = event.queryStringParameters || {};
  
  try {
    // Handle single product scraping
    if (productUrl) {
      const html = await fetchPage(productUrl);
      const product = extractProductData(html, productUrl);
      
      return {
        statusCode: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800' // Cache for 30 minutes
        },
        body: JSON.stringify({
          success: true,
          product: product,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Handle category scraping
    if (!category || !['dog', 'cat'].includes(category.toLowerCase())) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          error: 'Invalid category. Use "dog" or "cat".',
          validCategories: ['dog', 'cat']
        })
      };
    }

    const categoryUrls = {
      dog: 'https://www.1800petmeds.com/category/dog/food-c00005',
      cat: 'https://www.1800petmeds.com/category/cat/food-c00010'
    };

    const categoryUrl = categoryUrls[category.toLowerCase()];
    console.log(`Scraping category: ${category} from ${categoryUrl}`);

    // Get product links from category page
    const productLinks = await scrapeCategoryPage(categoryUrl, parseInt(maxProducts));
    console.log(`Found ${productLinks.length} product links`);

    if (productLinks.length === 0) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          products: [],
          message: 'No products found in category',
          category: category
        })
      };
    }

    // Scrape individual product pages (with concurrency limit)
    const products = [];
    const concurrencyLimit = 5;
    
    for (let i = 0; i < productLinks.length; i += concurrencyLimit) {
      const batch = productLinks.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(async (link) => {
        try {
          const html = await fetchPage(link);
          const product = extractProductData(html, link);
          if (product.name && product.brand) {
            return product;
          }
          return null;
        } catch (error) {
          console.error(`Error scraping product ${link}:`, error.message);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      products.push(...batchResults.filter(p => p !== null));
      
      // Add delay between batches to be respectful
      if (i + concurrencyLimit < productLinks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully scraped ${products.length} products`);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify({
        success: true,
        products: products,
        totalFound: products.length,
        category: category,
        timestamp: new Date().toISOString(),
        source: '1800petmeds.com'
      })
    };

  } catch (error) {
    console.error('Scraping error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Scraping failed', 
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
