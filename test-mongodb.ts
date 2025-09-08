#!/usr/bin/env bun

/**
 * Test script to demonstrate MongoDB API usage
 * Run this script with: bun run test-mongodb.ts
 */

import { uploadDataToMongoDB, getDataFromMongoDB, uploadSocketData, runExamples } from './examples/mongodb-api-examples';

async function testMongoDBAPI() {
  console.log('🚀 Testing MongoDB API endpoints...\n');

  try {
    // Test 1: Upload simple data
    console.log('📤 Test 1: Uploading simple data to "test-collection"...');
    const simpleData = {
      message: 'Hello MongoDB!',
      timestamp: new Date().toISOString(),
      count: 1
    };

    const uploadResult = await uploadDataToMongoDB('test-collection', simpleData);
    console.log('✅ Upload result:', uploadResult);

    // Test 2: Upload socket data
    console.log('\n📤 Test 2: Uploading socket data...');
    const socketResult = await uploadSocketData({
      event: 'price_update',
      symbol: 'NIFTY',
      price: 19750.25,
      volume: 1500,
      timestamp: Date.now()
    });
    console.log('✅ Socket upload result:', socketResult);

    // Test 3: Retrieve data
    console.log('\n📥 Test 3: Retrieving data from "test-collection"...');
    const retrieveResult = await getDataFromMongoDB('test-collection', 1, 5);
    console.log('✅ Retrieved data:', retrieveResult);

    // Test 4: Upload array of data
    console.log('\n📤 Test 4: Uploading array of trading data...');
    const tradingDataArray = [
      {
        instrument: 'BANKNIFTY',
        price: 44500.75,
        volume: 100,
        side: 'BUY',
        timestamp: new Date().toISOString()
      },
      {
        instrument: 'SENSEX',
        price: 66800.25,
        volume: 200,
        side: 'SELL',
        timestamp: new Date().toISOString()
      },
      {
        instrument: 'NIFTY',
        price: 19751.50,
        volume: 150,
        side: 'BUY',
        timestamp: new Date().toISOString()
      }
    ];

    for (const data of tradingDataArray) {
      const result = await uploadDataToMongoDB('trading-data', data);
      console.log(`✅ Uploaded ${data.instrument}:`, result.data?.insertedId);
    }

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testMongoDBAPI();
