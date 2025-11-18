#!/bin/bash

echo "=== Settings Microservice Demo Script ==="
echo ""

BASE_URL="http://localhost:3000"
ORG_ID=""
AUTH_ID=""

# Check if jq is available
if command -v jq &> /dev/null; then
  HAS_JQ=true
else
  HAS_JQ=false
  echo "Note: 'jq' not found. Using basic JSON parsing (install jq for better output)"
  echo ""
fi

echo "Step 1: Login to get session cookie"
SESSION_COOKIE=$(curl -s -c - -X POST "${BASE_URL}/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin123" | grep connect.sid | awk '{print $7}')

if [ -z "$SESSION_COOKIE" ]; then
  echo "❌ Login failed. Make sure the server is running on port 3000"
  exit 1
fi
echo "✅ Login successful"
echo ""

echo "Step 2: Create an organization"
TIMESTAMP=$(date +%s)
ORG_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/organizations" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{\"name\": \"Demo Org ${TIMESTAMP}\"}")

if [ "$HAS_JQ" = true ]; then
  ORG_ID=$(echo "$ORG_RESPONSE" | jq -r '._id')
else
  ORG_ID=$(echo "$ORG_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "✅ Organization created: ${ORG_ID}"
echo ""

echo "Step 3: Create Global Settings"
GLOBAL_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/global-settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"settingKey\": \"max_users\",
    \"settingValue\": 100,
    \"description\": \"Maximum number of users allowed\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$GLOBAL_RESPONSE" | jq .
else
  echo "$GLOBAL_RESPONSE"
fi
echo ""

echo "Step 4: Create Client Settings"
CLIENT_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/client-settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"clientId\": \"client-123\",
    \"settingKey\": \"max_users\",
    \"settingValue\": 50,
    \"description\": \"Client specific max users override\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$CLIENT_RESPONSE" | jq .
else
  echo "$CLIENT_RESPONSE"
fi
echo ""

echo "Step 5: Create User Settings"
USER_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/user-settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"userId\": \"user-456\",
    \"settingKey\": \"max_users\",
    \"settingValue\": 10,
    \"description\": \"User specific max users override\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$USER_RESPONSE" | jq .
else
  echo "$USER_RESPONSE"
fi
echo ""

echo "Step 6: Create DynamicAuth (JS type)"
AUTH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/dynamicauth" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"name\": \"default\",
    \"type\": \"js\",
    \"jsCode\": \"const auth = req.headers?.authorization || ''; const token = auth.split(' ')[1]; if (token === 'demo-token-123') { return { ok: true, subject: { id: 'api-user', type: 'api-key' }, permissions: { globalSettings: { read: true, write: true } }, ttl: 300 }; } return { ok: false };\",
    \"cacheTTLSeconds\": 300,
    \"enabled\": true,
    \"description\": \"Demo authentication for testing\"
  }")

if [ "$HAS_JQ" = true ]; then
  AUTH_ID=$(echo "$AUTH_RESPONSE" | jq -r '._id')
else
  AUTH_ID=$(echo "$AUTH_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "✅ DynamicAuth created: ${AUTH_ID}"
if [ "$HAS_JQ" = true ]; then
  echo "$AUTH_RESPONSE" | jq .
else
  echo "$AUTH_RESPONSE"
fi
echo ""

echo "Step 7: Test DynamicAuth"
TEST_AUTH=$(curl -s -X POST "${BASE_URL}/api/internal/dynamicauth/${AUTH_ID}/try" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"headers\": {
      \"authorization\": \"Bearer demo-token-123\"
    }
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$TEST_AUTH" | jq .
else
  echo "$TEST_AUTH"
fi
echo ""

echo "Step 8: Test External API - Get Setting with Cascade Resolution"
echo "8a. Get setting for user (should return user-level value: 10)"
USER_SETTING=$(curl -s -X GET "${BASE_URL}/api/global-settings/max_users?userId=user-456&clientId=client-123" \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: default")

if [ "$HAS_JQ" = true ]; then
  echo "$USER_SETTING" | jq .
else
  echo "$USER_SETTING"
fi
echo ""

echo "8b. Get setting for client only (should return client-level value: 50)"
CLIENT_SETTING=$(curl -s -X GET "${BASE_URL}/api/global-settings/max_users?clientId=client-123" \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: default")

if [ "$HAS_JQ" = true ]; then
  echo "$CLIENT_SETTING" | jq .
else
  echo "$CLIENT_SETTING"
fi
echo ""

echo "8c. Get setting globally (should return global-level value: 100)"
GLOBAL_SETTING=$(curl -s -X GET "${BASE_URL}/api/global-settings/max_users" \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: default")

if [ "$HAS_JQ" = true ]; then
  echo "$GLOBAL_SETTING" | jq .
else
  echo "$GLOBAL_SETTING"
fi
echo ""

echo "Step 9: Create/Update Setting via External API"
CREATE_SETTING=$(curl -s -X POST "${BASE_URL}/api/global-settings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-token-123" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: default" \
  -d "{
    \"settingKey\": \"api_rate_limit\",
    \"settingValue\": 1000,
    \"description\": \"API rate limit per minute\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$CREATE_SETTING" | jq .
else
  echo "$CREATE_SETTING"
fi
echo ""

echo "Step 10: List all settings (Internal API)"
echo "Global Settings:"
SETTINGS_LIST=$(curl -s -X GET "${BASE_URL}/api/internal/global-settings?organizationId=${ORG_ID}" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}")

if [ "$HAS_JQ" = true ]; then
  echo "$SETTINGS_LIST" | jq .
else
  echo "$SETTINGS_LIST"
fi
echo ""

echo "=== Demo Complete! ==="
echo ""
echo "Summary:"
echo "- Organization ID: ${ORG_ID}"
echo "- DynamicAuth ID: ${AUTH_ID}"
echo "- Test Token: demo-token-123"
echo ""
echo "Access the UI at: ${BASE_URL}"
echo "Login with: admin / admin123"
