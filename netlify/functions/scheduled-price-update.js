/*
 * Netlify Scheduled Function: scheduled-price-update
 *
 * This function runs on a schedule to update product pricing data
 * by scraping 1800PetMeds and Wag.com for all products in the database.
 * 
 * Schedule: Runs every Sunday at 2:00 AM UTC
 * 
 * To enable scheduled functions in Netlify:
 * 1. Add to netlify.toml: 
 *    [[functions]]
 *    schedule = "0 2 * * 0"
 *    name = "scheduled-price-update"
 * 
 * 2. Deploy to Netlify (scheduled functions only work in production)
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Import the scraping logic from the main scraper
const { handler: scrapePrices } = require('./productPriceScraper');

// Product slug mappings for different retailers
const PRODUCT_MAPPINGS = {
  // Hill's Prescription Diet products
  'hills-kd-dog-dry': {
    petmeds: 'hills-prescription-diet-k-d-kidney-care-dry-dog-food',
    wag: 'hills-prescription-diet-kd-kidney-care-dry-dog-food'
  },
  'hills-kd-dog-wet': {
    petmeds: 'hills-prescription-diet-k-d-kidney-care-canned-dog-food',
    wag: 'hills-prescription-diet-kd-kidney-care-wet-dog-food'
  },
  'hills-wd-dog-dry': {
    petmeds: 'hills-prescription-diet-w-d-multi-benefit-dry-dog-food',
    wag: 'hills-prescription-diet-wd-weight-management-dry-dog-food'
  },
  'hills-id-dog-dry': {
    petmeds: 'hills-prescription-diet-i-d-digestive-care-dry-dog-food',
    wag: 'hills-prescription-diet-id-digestive-care-dry-dog-food'
  },
  'hills-zd-dog-dry': {
    petmeds: 'hills-prescription-diet-z-d-skin-food-sensitivities-dry-dog-food',
    wag: 'hills-prescription-diet-zd-food-sensitivities-dry-dog-food'
  },
  'hills-cd-cat-dry': {
    petmeds: 'hills-prescription-diet-c-d-multicare-urinary-care-dry-cat-food',
    wag: 'hills-prescription-diet-cd-multicare-urinary-care-dry-cat-food'
  },
  'hills-yd-cat-dry': {
    petmeds: 'hills-prescription-diet-y-d-thyroid-care-dry-cat-food',
    wag: 'hills-prescription-diet-yd-thyroid-care-dry-cat-food'
  },
  // Royal Canin products
  'rc-renal-dog-dry': {
    petmeds: 'royal-canin-veterinary-diet-renal-support-a-dry-dog-food',
    wag: 'royal-canin-veterinary-diet-renal-support-dry-dog-food'
  },
  'rc-urinary-dog-dry': {
    petmeds: 'royal-canin-veterinary-diet-urinary-so-dry-dog-food',
    wag: 'royal-canin-veterinary-diet-urinary-so-dry-dog-food'
  },
  // Purina Pro Plan products
  'ppvd-en-dog-dry': {
    petmeds: 'purina-pro-plan-veterinary-diets-en-gastroenteric-dry-dog-food',
    wag: 'purina-pro-plan-veterinary-diets-en-gastroenteric-dry-dog-food'
  },
  'ppvd-om-dog-dry': {
    petmeds: 'purina-pro-plan-veterinary-diets-om-overweight-management-dry-dog-food',
    wag: 'purina-pro-plan-veterinary-diets-om-overweight-management-dry-dog-food'
  }
  // Add more product mappings as needed...
};

async function loadProductData() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load product data:', error);
    return { products: [] };
  }
}

async function saveProductData(data) {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log('Product data saved successfully');
  } catch (error) {
    console.error('Failed to save product data:', error);
    throw error;
  }
}

async function updateProductPrices(products) {
  const updatedProducts = [];
  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    const mapping = PRODUCT_MAPPINGS[product.id];
    
    if (!mapping) {
      console.log(`No mapping found for product: ${product.id}`);
      updatedProducts.push(product);
      continue;
    }

    try {
      // Create mock event object for the scraper function
      const mockEvent = {
        queryStringParameters: {
          petmedsSlug: mapping.petmeds,
          wagSlug: mapping.wag,
          productId: product.id
        }
      };

      const result = await scrapePrices(mockEvent, {});
      const responseData = JSON.parse(result.body);

      if (result.statusCode === 200 && responseData.averagePrice) {
        // Update product with new pricing data
        const updatedProduct = {
          ...product,
          price: {
            average: responseData.averagePrice,
            sources: responseData.sources,
            lastUpdated: responseData.timestamp
          }
        };
        
        updatedProducts.push(updatedProduct);
        successCount++;
        console.log(`Updated pricing for ${product.id}: $${responseData.averagePrice}`);
      } else {
        console.log(`No price data found for ${product.id}`);
        updatedProducts.push(product);
      }

      // Rate limiting: wait 2 seconds between requests
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`Error updating ${product.id}:`, error.message);
      updatedProducts.push(product);
      errorCount++;
    }
  }

  console.log(`Price update completed: ${successCount} updated, ${errorCount} errors`);
  return updatedProducts;
}

exports.handler = async function (event, context) {
  console.log('Starting scheduled price update...');
  
  try {
    // Load current product data
    const productData = await loadProductData();
    
    if (!productData.products || productData.products.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No products found to update' })
      };
    }

    // Update prices for all products
    const updatedProducts = await updateProductPrices(productData.products);
    
    // Save updated data
    const updatedData = {
      ...productData,
      products: updatedProducts,
      lastPriceUpdate: new Date().toISOString()
    };
    
    await saveProductData(updatedData);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Price update completed successfully',
        productsProcessed: updatedProducts.length,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Scheduled price update failed:', error);
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Price update failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
