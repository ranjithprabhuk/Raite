#!/bin/bash

# MongoDB API Test Script
# This script demonstrates how to use curl to interact with the MongoDB API endpoints

BASE_URL="http://localhost:3000/api/v1/mongo"

echo "🚀 Testing MongoDB API with curl..."
echo

# Test 1: Upload simple data to test-collection
echo "📤 Test 1: Uploading data to 'test-collection'..."
curl -X POST "${BASE_URL}/test-collection" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello from curl!",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "source": "curl_script",
    "count": 42
  }' | jq .

echo
echo "✅ Test 1 completed"
echo

# Test 2: Upload socket data
echo "📤 Test 2: Uploading socket data..."
curl -X POST "${BASE_URL}/socket-events" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "price_update",
    "symbol": "NIFTY",
    "price": 19800.50,
    "volume": 2000,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "metadata": {
      "source": "websocket",
      "exchange": "NSE"
    }
  }' | jq .

echo
echo "✅ Test 2 completed"
echo

# Test 3: Upload trading data
echo "📤 Test 3: Uploading trading data..."
curl -X POST "${BASE_URL}/trading-data" \
  -H "Content-Type: application/json" \
  -d '{
    "instrument": "BANKNIFTY",
    "side": "BUY",
    "price": 44600.75,
    "quantity": 25,
    "volume": 1000,
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
    "orderId": "ORD_'$(date +%s)'",
    "userId": "user_123"
  }' | jq .

echo
echo "✅ Test 3 completed"
echo

# Test 4: Retrieve data from test-collection
echo "📥 Test 4: Retrieving data from 'test-collection'..."
curl -X GET "${BASE_URL}/test-collection?page=1&limit=5" \
  -H "Content-Type: application/json" | jq .

echo
echo "✅ Test 4 completed"
echo

# Test 5: Retrieve socket events
echo "📥 Test 5: Retrieving socket events..."
curl -X GET "${BASE_URL}/socket-events?page=1&limit=3" \
  -H "Content-Type: application/json" | jq .

echo
echo "✅ Test 5 completed"
echo

# Test 6: Upload array of market data
echo "📤 Test 6: Uploading multiple market data entries..."

# Create array of instruments
instruments=("NIFTY" "BANKNIFTY" "SENSEX" "FINNIFTY")
sides=("BUY" "SELL" "BUY" "SELL")

for i in "${!instruments[@]}"; do
  instrument="${instruments[$i]}"
  side="${sides[$i]}"
  price=$((19000 + RANDOM % 2000))
  
  echo "  Uploading ${instrument} data..."
  curl -X POST "${BASE_URL}/market-data" \
    -H "Content-Type: application/json" \
    -d '{
      "instrument": "'${instrument}'",
      "side": "'${side}'",
      "price": '${price}'.50,
      "volume": '$((100 + RANDOM % 500))',
      "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")'",
      "exchange": "NSE",
      "segment": "FO"
    }' -s | jq -r '.data.insertedId // "Error"'
  
  # Small delay between requests
  sleep 0.2
done

echo
echo "✅ Test 6 completed"
echo

echo "🎉 All curl tests completed!"
echo
echo "💡 Tips:"
echo "   - Make sure the server is running on http://localhost:3000"
echo "   - Install 'jq' for better JSON formatting: brew install jq"
echo "   - Check MongoDB collections using MongoDB Compass or CLI"
