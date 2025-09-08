/**
 * Sample functions to interact with MongoDB API endpoints
 * These examples show how to upload and retrieve data from MongoDB collections
 */

// Sample function using fetch API (works in both Node.js and browser)
export async function uploadDataToMongoDB(
  collectionName: string, 
  data: any, 
  baseUrl: string = 'http://localhost:3000'
): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/mongo/${collectionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Data uploaded successfully:', result);
    return result;
  } catch (error) {
    console.error('Error uploading data:', error);
    throw error;
  }
}

// Sample function to get data from MongoDB collection
export async function getDataFromMongoDB(
  collectionName: string,
  page: number = 1,
  limit: number = 10,
  baseUrl: string = 'http://localhost:3000'
): Promise<any> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/mongo/${collectionName}?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Data retrieved successfully:', result);
    return result;
  } catch (error) {
    console.error('Error retrieving data:', error);
    throw error;
  }
}

// Sample function using Node.js built-in fetch (Node.js 18+)
export async function uploadSocketData(socketData: any): Promise<any> {
  const data = {
    timestamp: new Date().toISOString(),
    eventType: 'socket_event',
    payload: socketData,
    metadata: {
      source: 'trading_socket',
      version: '1.0'
    }
  };

  return await uploadDataToMongoDB('socket-events', data);
}

// Sample function to upload trading data
export async function uploadTradingData(tradingData: any): Promise<any> {
  const data = {
    timestamp: new Date().toISOString(),
    instrument: tradingData.instrument,
    price: tradingData.price,
    volume: tradingData.volume,
    side: tradingData.side, // 'BUY' or 'SELL'
    metadata: {
      source: 'trading_engine',
      sessionId: tradingData.sessionId
    }
  };

  return await uploadDataToMongoDB('trading-data', data);
}

// Sample function to upload market data
export async function uploadMarketData(marketData: any): Promise<any> {
  const data = {
    timestamp: new Date().toISOString(),
    symbol: marketData.symbol,
    bid: marketData.bid,
    ask: marketData.ask,
    last: marketData.last,
    volume: marketData.volume,
    openInterest: marketData.openInterest
  };

  return await uploadDataToMongoDB('market-data', data);
}

// Example usage functions
export async function runExamples() {
  try {
    console.log('=== MongoDB API Examples ===\n');

    // Example 1: Upload socket data
    console.log('1. Uploading socket data...');
    const socketResult = await uploadSocketData({
      event: 'price_update',
      data: { symbol: 'AAPL', price: 150.25, volume: 1000 }
    });
    console.log('Socket data upload result:', socketResult);

    // Example 2: Upload trading data
    console.log('\n2. Uploading trading data...');
    const tradingResult = await uploadTradingData({
      instrument: 'NIFTY',
      price: 19500.75,
      volume: 500,
      side: 'BUY',
      sessionId: 'session_123'
    });
    console.log('Trading data upload result:', tradingResult);

    // Example 3: Upload market data
    console.log('\n3. Uploading market data...');
    const marketResult = await uploadMarketData({
      symbol: 'BANKNIFTY',
      bid: 44500.25,
      ask: 44502.75,
      last: 44501.50,
      volume: 2500,
      openInterest: 150000
    });
    console.log('Market data upload result:', marketResult);

    // Example 4: Upload custom document
    console.log('\n4. Uploading custom document...');
    const customResult = await uploadDataToMongoDB('custom-collection', {
      userId: 'user_123',
      action: 'login',
      timestamp: new Date(),
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
      metadata: {
        device: 'mobile',
        os: 'iOS'
      }
    });
    console.log('Custom data upload result:', customResult);

    // Example 5: Retrieve data
    console.log('\n5. Retrieving socket events...');
    const retrievedData = await getDataFromMongoDB('socket-events', 1, 5);
    console.log('Retrieved data:', retrievedData);

  } catch (error) {
    console.error('Error in examples:', error);
  }
}

// Utility function for batch uploads
export async function batchUploadData(
  collectionName: string, 
  dataArray: any[]
): Promise<any[]> {
  const results: any[] = [];
  
  for (const data of dataArray) {
    try {
      const result = await uploadDataToMongoDB(collectionName, data);
      results.push(result);
      
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error: any) {
      console.error(`Error uploading item:`, error);
      results.push({ error: error.message });
    }
  }
  
  return results;
}

// Example with error handling and retry logic
export async function uploadWithRetry(
  collectionName: string,
  data: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} to upload data...`);
      return await uploadDataToMongoDB(collectionName, data);
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to upload after ${maxRetries} attempts. Last error: ${lastError}`);
}
