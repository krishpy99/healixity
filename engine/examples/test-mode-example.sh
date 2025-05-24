#!/bin/bash

# Test Mode Example Script
# This script demonstrates how to use the test mode feature for API testing

echo "🧪 Health Dashboard Backend - Test Mode Example"
echo "==============================================="

# Check if server is running
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "❌ Server is not running on port 8080"
    echo "📝 Start the server with: TEST_MODE=true go run ./cmd/server/main.go"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Test 1: Add health data (no auth needed in test mode)
echo "🔬 Test 1: Adding health data..."
curl -X POST http://localhost:8080/api/health/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "type": "blood_pressure_systolic",
    "value": 120,
    "unit": "mmHg",
    "notes": "Test reading in test mode"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Add another metric
echo "🔬 Test 2: Adding heart rate data..."
curl -X POST http://localhost:8080/api/health/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "type": "heart_rate",
    "value": 72,
    "unit": "bpm",
    "notes": "Resting heart rate"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Get latest metrics
echo "🔬 Test 3: Getting latest metrics..."
curl -X GET http://localhost:8080/api/health/latest \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Get supported metrics (no auth needed anyway)
echo "🔬 Test 4: Getting supported metrics..."
curl -X GET http://localhost:8080/api/health/supported-metrics \
  -w "\nStatus: %{http_code}\n\n"

# Test 5: Get health summary
echo "🔬 Test 5: Getting health summary..."
curl -X GET http://localhost:8080/api/health/summary \
  -w "\nStatus: %{http_code}\n\n"

echo "✅ All tests completed!"
echo ""
echo "📋 Notes:"
echo "- All requests succeeded without authentication headers"
echo "- All data is stored with user_id = 'test'"
echo "- This only works when TEST_MODE=true is set"
echo ""
echo "⚠️  Remember: NEVER use TEST_MODE=true in production!" 