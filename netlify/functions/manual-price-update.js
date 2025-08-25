/*
 * Netlify Function: manual-price-update
 * 
 * Manual trigger for price updates during development/testing.
 * This allows you to test the price scraping functionality without
 * waiting for the scheduled function.
 * 
 * Usage: POST /.netlify/functions/manual-price-update
 * Or visit: /.netlify/functions/manual-price-update in browser
 */

const { handler: scheduledUpdate } = require('./scheduled-price-update');

exports.handler = async function (event, context) {
  console.log('Manual price update triggered...');
  
  // Add authentication check if needed in production
  // const authHeader = event.headers.authorization;
  // if (!authHeader || authHeader !== 'Bearer your-secret-token') {
  //   return {
  //     statusCode: 401,
  //     body: JSON.stringify({ error: 'Unauthorized' })
  //   };
  // }
  
  try {
    // Call the scheduled update function
    const result = await scheduledUpdate(event, context);
    
    // Add some additional logging for manual triggers
    const responseData = JSON.parse(result.body);
    console.log('Manual update completed:', responseData);
    
    return {
      statusCode: result.statusCode,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        ...responseData,
        triggeredBy: 'manual',
        message: `Manual price update completed. ${responseData.message || ''}`
      })
    };
    
  } catch (error) {
    console.error('Manual price update failed:', error);
    
    return {
      statusCode: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
      body: JSON.stringify({
        error: 'Manual price update failed',
        details: error.message,
        triggeredBy: 'manual',
        timestamp: new Date().toISOString()
      })
    };
  }
};
