/*
 * Scheduled Product Database Update Function
 *
 * This function runs on a schedule to completely refresh the product database
 * by scraping fresh, comprehensive data from 1800PetMeds including:
 * - Product names, descriptions, and features
 * - High-quality product images
 * - Current pricing information
 * - Bag sizes and quantity options
 * - Health condition targeting
 * - Brand information
 * 
 * Schedule: Runs every Sunday at 2:00 AM UTC
 * 
 * Configuration in netlify.toml:
 * [[functions]]
 * schedule = "0 2 * * 0"
 * name = "scheduled-price-update"
 */

const fs = require('fs').promises;
const path = require('path');

// Import our comprehensive database updater
const { handler: databaseUpdater } = require('./update-product-database');

async function saveProductData(data) {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('Product database saved successfully to products.json');
    return true;
  } catch (error) {
    console.error('Error saving product database:', error);
    return false;
  }
}

async function createBackup() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'products.json');
    const backupPath = path.join(process.cwd(), 'data', `products-backup-${Date.now()}.json`);
    
    // Check if current file exists
    try {
      await fs.access(dataPath);
      await fs.copyFile(dataPath, backupPath);
      console.log(`Backup created: ${backupPath}`);
      return true;
    } catch (error) {
      console.log('No existing products.json to backup');
      return true;
    }
  } catch (error) {
    console.error('Error creating backup:', error);
    return false;
  }
}

exports.handler = async function (event, context) {
  const startTime = Date.now();
  
  try {
    console.log('=== Starting Scheduled Product Database Update ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Create backup of existing data
    const backupCreated = await createBackup();
    if (!backupCreated) {
      console.warn('Failed to create backup, continuing anyway...');
    }
    
    // Call our comprehensive database updater function
    const mockEvent = {
      queryStringParameters: {
        forceUpdate: 'true'
      }
    };

    console.log('Calling comprehensive product scraper...');
    const result = await databaseUpdater(mockEvent, {});
    
    if (result.statusCode !== 200) {
      throw new Error(`Database update failed with status ${result.statusCode}`);
    }

    const updateResult = JSON.parse(result.body);
    
    if (!updateResult.success) {
      throw new Error(`Database update failed: ${updateResult.error || 'Unknown error'}`);
    }

    console.log('Scraping completed successfully!');
    console.log(`- Total products: ${updateResult.statistics.totalProducts}`);
    console.log(`- Dog products: ${updateResult.statistics.dogProducts}`);
    console.log(`- Cat products: ${updateResult.statistics.catProducts}`);

    // Save the updated database to products.json
    const savedSuccessfully = await saveProductData(updateResult.database);
    
    if (!savedSuccessfully) {
      throw new Error('Failed to save updated product database to file');
    }

    const duration = Date.now() - startTime;
    const stats = updateResult.statistics;
    
    console.log(`=== Update Completed Successfully ===`);
    console.log(`Processing time: ${duration}ms`);
    console.log(`Data source: 1800petmeds.com`);
    console.log(`Last updated: ${stats.lastUpdated}`);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Scheduled product database update completed successfully',
        statistics: {
          totalProducts: stats.totalProducts,
          dogProducts: stats.dogProducts,
          catProducts: stats.catProducts,
          processingTimeMs: duration,
          lastUpdated: stats.lastUpdated,
          timestamp: new Date().toISOString()
        },
        dataSource: '1800petmeds.com',
        version: '2.0',
        backupCreated: backupCreated
      })
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    
    console.error('=== Scheduled Update Failed ===');
    console.error(`Error: ${error.message}`);
    console.error(`Processing time: ${duration}ms`);
    console.error(`Timestamp: ${new Date().toISOString()}`);

    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Scheduled product database update failed',
        details: error.message,
        processingTimeMs: duration,
        timestamp: new Date().toISOString(),
        suggestion: 'Check logs for detailed error information. Backup file may be available if update failed after scraping.'
      })
    };
  }
};