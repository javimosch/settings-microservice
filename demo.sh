#!/bin/bash

echo "=== Settings Microservice Demo Script ==="
echo ""

source .env

BASE_URL="http://localhost:${PORT:-3000}"
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
  echo "❌ Login failed. Make sure the server is running on port ${PORT:-3000}"
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

echo "Step 10: Create DynamicAuth with JWT Permission Filters"
echo "This demonstrates the new feature: filter-based permissions"
echo ""

# Create a JWT token for pizzorno_alan
CURRENT_TIME=$(date +%s)
FUTURE_TIME=$((CURRENT_TIME + 3600))
PAYLOAD='{"client":"pizzorno","user":"alan","exp":'$FUTURE_TIME'}'
PAYLOAD_B64=$(echo -n "$PAYLOAD" | base64 | tr '+/' '-_' | tr -d '=')
HEADER_B64=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 | tr '+/' '-_' | tr -d '=')
JWT_TOKEN="${HEADER_B64}.${PAYLOAD_B64}.fake-signature"

echo "Creating DynamicAuth with filter-based permissions..."
echo "This auth will only allow users to access their own settings"
echo ""

JWT_AUTH_RESPONSE=$(curl -s -X POST "${BASE_URL}/api/internal/dynamicauth" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"name\": \"jwt-user-filter\",
    \"type\": \"js\",
    \"jsCode\": \"const token = req.headers.authorization?.split(' ')[1]; const decoded = decodeJWT(token); const userId = getClientUserIfValid(decoded); if (!!userId) { return { ok: true, subject: { id: userId, type: 'api-key' }, permissions: { globalSettings: { read: true, write: false }, userSettings: { read: { filter: { userId: userId } }, write: { filter: { userId: userId } } } } }; } return { ok: false };\",
    \"cacheTTLSeconds\": 300,
    \"enabled\": true,
    \"description\": \"JWT auth with permission filters - users can only access own settings\"
  }")

if [ "$HAS_JQ" = true ]; then
  JWT_AUTH_ID=$(echo "$JWT_AUTH_RESPONSE" | jq -r '._id')
else
  JWT_AUTH_ID=$(echo "$JWT_AUTH_RESPONSE" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

echo "✅ JWT-based DynamicAuth created: ${JWT_AUTH_ID}"
echo ""

echo "Step 11: Create user settings for different users (Internal API)"
echo "Creating setting for pizzorno_alan..."
USER_SETTING_1=$(curl -s -X POST "${BASE_URL}/api/internal/user-settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"userId\": \"pizzorno_alan\",
    \"settingKey\": \"theme\",
    \"settingValue\": \"dark\",
    \"description\": \"Theme preference for Alan\"
  }")

if [ "$HAS_JQ" = true ]; then
  ALAN_SETTING_ID=$(echo "$USER_SETTING_1" | jq -r '._id')
  echo "$USER_SETTING_1" | jq .
else
  ALAN_SETTING_ID=$(echo "$USER_SETTING_1" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "$USER_SETTING_1"
fi
echo ""

echo "Creating setting for other_user..."
USER_SETTING_2=$(curl -s -X POST "${BASE_URL}/api/internal/user-settings" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=${SESSION_COOKIE}" \
  -d "{
    \"organizationId\": \"${ORG_ID}\",
    \"userId\": \"other_user\",
    \"settingKey\": \"theme\",
    \"settingValue\": \"light\",
    \"description\": \"Theme preference for other user\"
  }")

if [ "$HAS_JQ" = true ]; then
  OTHER_SETTING_ID=$(echo "$USER_SETTING_2" | jq -r '._id')
  echo "$USER_SETTING_2" | jq .
else
  OTHER_SETTING_ID=$(echo "$USER_SETTING_2" | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "$USER_SETTING_2"
fi
echo ""

echo "Step 12: Demonstrate Permission Filter Enforcement"
echo ""

echo "12a. ✓ pizzorno_alan can READ own settings"
echo "Request: GET /api/settings/user?userId=pizzorno_alan (with pizzorno_alan JWT)"
sleep 1
READ_OWN=$(curl -s -X GET "${BASE_URL}/api/settings/user?userId=pizzorno_alan" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter")

if [ "$HAS_JQ" = true ]; then
  COUNT=$(echo "$READ_OWN" | jq 'length')
  echo "Result: Got $COUNT settings (expected: 1)"
  echo "$READ_OWN" | jq .
else
  echo "$READ_OWN"
fi
echo ""

echo "12b. ✗ pizzorno_alan CANNOT read other user's settings"
echo "Request: GET /api/settings/user?userId=other_user (with pizzorno_alan JWT)"
echo "Expected: Query filter prevents access - permission filter overrides userId param"
sleep 1
READ_OTHER=$(curl -s -X GET "${BASE_URL}/api/settings/user?userId=other_user" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter")

if [ "$HAS_JQ" = true ]; then
  COUNT=$(echo "$READ_OTHER" | jq 'length')
  RETURNED_USER=$(echo "$READ_OTHER" | jq -r '.[0].userId // "none"')
  echo "Result: Got $COUNT settings with userId=$RETURNED_USER (expected: pizzorno_alan, NOT other_user)"
  echo "Explanation: Permission filter ({ userId: pizzorno_alan }) overrides query param"
  echo "$READ_OTHER" | jq .
else
  echo "$READ_OTHER"
fi
echo ""

echo "12c. ✓ pizzorno_alan can CREATE own settings"
echo "Request: POST /api/settings/user (userId=pizzorno_alan)"
sleep 1
CREATE_OWN=$(curl -s -X POST "${BASE_URL}/api/settings/user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter" \
  -d "{
    \"userId\": \"pizzorno_alan\",
    \"settingKey\": \"language\",
    \"settingValue\": \"en\",
    \"description\": \"Language preference\"
  }")

if [ "$HAS_JQ" = true ]; then
  STATUS=$(echo "$CREATE_OWN" | jq -r '.settingKey // .error')
  echo "Result: $STATUS (expected: language)"
  echo "$CREATE_OWN" | jq .
else
  echo "$CREATE_OWN"
fi
echo ""

echo "12d. ✗ pizzorno_alan CANNOT CREATE settings for other users"
echo "Request: POST /api/settings/user (userId=other_user)"
echo "Expected: 403 Forbidden (filter doesn't match)"
sleep 1
CREATE_OTHER=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X POST "${BASE_URL}/api/settings/user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter" \
  -d "{
    \"userId\": \"other_user\",
    \"settingKey\": \"language\",
    \"settingValue\": \"es\",
    \"description\": \"Language preference\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$CREATE_OTHER" | head -n -1 | jq .
  echo "$CREATE_OTHER" | tail -n 1
else
  echo "$CREATE_OTHER"
fi
echo ""

echo "12e. ✓ pizzorno_alan can UPDATE own settings"
echo "Request: PUT /api/settings/user/:id (where setting belongs to pizzorno_alan)"
sleep 1
UPDATE_OWN=$(curl -s -X PUT "${BASE_URL}/api/settings/user/${ALAN_SETTING_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter" \
  -d "{
    \"settingValue\": \"light\"
  }")

if [ "$HAS_JQ" = true ]; then
  NEW_VALUE=$(echo "$UPDATE_OWN" | jq -r '.settingValue // .error')
  echo "Result: Updated value to '$NEW_VALUE' (expected: light)"
  echo "$UPDATE_OWN" | jq .
else
  echo "$UPDATE_OWN"
fi
echo ""

echo "12f. ✗ pizzorno_alan CANNOT UPDATE other user's settings"
echo "Request: PUT /api/settings/user/:id (where setting belongs to other_user)"
echo "Expected: 403 Forbidden (filter doesn't match)"
sleep 1
UPDATE_OTHER=$(curl -s -w "\nHTTP Status: %{http_code}\n" -X PUT "${BASE_URL}/api/settings/user/${OTHER_SETTING_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "X-Organization-Id: ${ORG_ID}" \
  -H "X-Auth-Name: jwt-user-filter" \
  -d "{
    \"settingValue\": \"dark\"
  }")

if [ "$HAS_JQ" = true ]; then
  echo "$UPDATE_OTHER" | head -n -1 | jq .
  echo "$UPDATE_OTHER" | tail -n 1
else
  echo "$UPDATE_OTHER"
fi
echo ""

echo "Step 13: List all settings (Internal API)"
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
echo "- DynamicAuth ID (default): ${AUTH_ID}"
echo "- DynamicAuth ID (jwt-user-filter): ${JWT_AUTH_ID}"
echo "- Test Token (default): demo-token-123"
echo "- JWT Token (pizzorno_alan): ${JWT_TOKEN}"
echo ""
echo "Demonstrated features:"
echo "✓ Basic DynamicAuth with token validation"
echo "✓ JWT decoding with expiration validation"
echo "✓ Permission filter enforcement"
echo "✓ Filter-based read restrictions"
echo "✓ Filter-based write restrictions"
echo "✓ Multi-layer permission enforcement (query + record level)"
echo ""
echo "Access the UI at: ${BASE_URL}"
echo "Login with: admin / admin123"
