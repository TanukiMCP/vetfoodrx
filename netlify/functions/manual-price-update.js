/*
 * Manual Product Database Update Function
 * 
 * This function provides an on-demand way to update the product database
 * by scraping fresh data from 1800PetMeds. It can be triggered manually
 * or called from the admin interface.
 * 
 * Usage: GET /.netlify/functions/manual-price-update
 * Optional parameters:
 * - category: 'dog' or 'cat' (updates only that category)
 * - maxProducts: number (limits products per category)
 * - saveToFile: 'true' (saves results to products.json)
 */

const fs = require('fs').promises;
const path = require('path');

// Import our comprehensive scraper functions
const { handler: comprehensiveScraper } = require('./comprehensive-product-scraper');
const { handler: databaseUpdater } = require('./update-product-database');

async function saveProductData(data) {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Product database saved to products.json');
    return true;
  } catch (error) {
    console.error('Error saving product database:', error);
    return false;
  }
}

async function scrapeSingleCategory(category, maxProducts = 30) {
  try {
    const mockEvent = {
      queryStringParameters: {
        category: category,
        maxProducts: maxProducts.toString()
      }
    };

    const result = await comprehensiveScraper(mockEvent, {});
    
    if (result.statusCode === 200) {
      return JSON.parse(result.body);
    } else {
      throw new Error(`Scraping failed with status ${result.statusCode}`);
    }
  } catch (error) {
    console.error(`Error scraping ${category} category:`, error);
    throw error;
  }
}

exports.handler = async function (event, context) {
  const startTime = Date.now();
  const { 
    category, 
    maxProducts = 30, 
    saveToFile = 'false',
    fullUpdate = 'false' 
  } = event.queryStringParameters || {};
  
  try {
    console.log('=== Manual Product Update Started ===');
    console.log(`Category: ${category || 'all'}`);
    console.log(`Max products: ${maxProducts}`);
    console.log(`Save to file: ${saveToFile}`);
    console.log(`Full update: ${fullUpdate}`);

    let result;

    if (fullUpdate === 'true') {
      // Use the full database updater
      console.log('Performing full database update...');
      
      const mockEvent = {
        queryStringParameters: {
          forceUpdate: 'true'
        }
      };

      const updateResult = await databaseUpdater(mockEvent, {});
      
      if (updateResult.statusCode !== 200) {
        throw new Error(`Full update failed with status ${updateResult.statusCode}`);
      }

      result = JSON.parse(updateResult.body);
      
      if (saveToFile === 'true' && result.success) {
        await saveProductData(result.database);
      }

    } else if (category && ['dog', 'cat'].includes(category.toLowerCase())) {
      // Scrape single category
      console.log(`Scraping ${category} products...`);
      
      result = await scrapeSingleCategory(category.toLowerCase(), parseInt(maxProducts));
      
      if (!result.success) {
        throw new Error(`Category scraping failed: ${result.error || 'Unknown error'}`);
      }

    } else {
      // Scrape both categories
      console.log('Scraping both dog and cat products...');
      
      const [dogResult, catResult] = await Promise.all([
        scrapeSingleCategory('dog', parseInt(maxProducts)),
        scrapeSingleCategory('cat', parseInt(maxProducts))
      ]);

      result = {
        success: true,
        categories: {
          dog: dogResult,
          cat: catResult
        },
        totalProducts: (dogResult.products?.length || 0) + (catResult.products?.length || 0),
        timestamp: new Date().toISOString()
      };
    }

    const duration = Date.now() - startTime;

    console.log('=== Manual Update Completed ===');
    console.log(`Processing time: ${duration}ms`);
    console.log(`Success: ${result.success}`);

    return {
      statusCode: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify({
        success: true,
        message: 'Manual product update completed',
        processingTimeMs: duration,
        timestamp: new Date().toISOString(),
        parameters: {
          category: category || 'all',
          maxProducts: parseInt(maxProducts),
          saveToFile: saveToFile === 'true',
          fullUpdate: fullUpdate === 'true'
        },
        results: result,
        dataSource: '1800petmeds.com'
      })
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('=== Manual Update Failed ===');
    console.error(`Error: ${error.message}`);
    console.error(`Processing time: ${duration}ms`);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Manual update failed',
        details: error.message,
        processingTimeMs: duration,
        timestamp: new Date().toISOString(),
        parameters: {
          category: category || 'all',
          maxProducts: parseInt(maxProducts),
          saveToFile: saveToFile === 'true',
          fullUpdate: fullUpdate === 'true'
        }
      })
    };
  }
};