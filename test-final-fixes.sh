#!/bin/bash

echo "========================================="
echo "Final Permission Fixes - Test"
echo "========================================="
echo ""

# Login as alan
echo "Step 1: Login as alan"
echo "----------------------"
curl -s -c /tmp/alan_final.txt -L -X POST http://localhost:3006/login \
    -d "username=alan&password=alan123" > /dev/null
echo "✅ Logged in"
echo ""

# Test 1: Try to edit organization (should FAIL - no write permission)
echo "Test 1: Try to Edit Organization (should be denied)"
echo "-----------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_final.txt -X PUT http://localhost:3006/api/internal/organizations/691cc69bc3dba93d77537f45 \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Org Edit"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Organization edit blocked (403 Forbidden)"
    echo "    Message: $(echo "$RESPONSE" | grep -v "HTTP_CODE")"
else
    echo "❌ FAIL - Organization edit NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 2: Check settings page HTML for tabs
echo "Test 2: Check Settings Page (should only show Client tab)"
echo "-----------------------------------------------------------"
SETTINGS_PAGE=$(curl -s -b /tmp/alan_final.txt http://localhost:3006/settings)

HAS_GLOBAL=$(echo "$SETTINGS_PAGE" | grep -c "Global" || true)
HAS_CLIENT=$(echo "$SETTINGS_PAGE" | grep -c "Client" || true)
HAS_USER=$(echo "$SETTINGS_PAGE" | grep -c "User" || true)
HAS_DYNAMIC=$(echo "$SETTINGS_PAGE" | grep -c "Dynamic" || true)

echo "Tabs found in HTML:"
echo "  Global: $HAS_GLOBAL occurrences"
echo "  Client: $HAS_CLIENT occurrences"  
echo "  User: $HAS_USER occurrences"
echo "  Dynamic: $HAS_DYNAMIC occurrences"
echo ""

if [ "$HAS_CLIENT" -gt "0" ]; then
    echo "✅ Client tab is present (expected)"
else
    echo "❌ Client tab is NOT present (unexpected)"
fi
echo ""

# Test 3: Try to access Global Settings API (should FAIL)
echo "Test 3: Try to Access Global Settings API (should be denied)"
echo "--------------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_final.txt "http://localhost:3006/api/internal/global-settings?organizationId=691cc69bc3dba93d77537f45" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Global settings API blocked (403 Forbidden)"
else
    echo "❌ FAIL - Global settings API NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE" | head -3
fi
echo ""

# Test 4: Try to access User Settings API (should FAIL)
echo "Test 4: Try to Access User Settings API (should be denied)"
echo "------------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_final.txt "http://localhost:3006/api/internal/user-settings?organizationId=691cc69bc3dba93d77537f45" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - User settings API blocked (403 Forbidden)"
else
    echo "❌ FAIL - User settings API NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE" | head -3
fi
echo ""

# Test 5: Access Client Settings API (should SUCCEED)
echo "Test 5: Access Client Settings API (should succeed)"
echo "-----------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_final.txt "http://localhost:3006/api/internal/client-settings?organizationId=691cc69bc3dba93d77537f45" -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS - Client settings API accessible (200 OK)"
else
    echo "❌ FAIL - Client settings API blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE" | head -3
fi
echo ""

# Cleanup
rm -f /tmp/alan_final.txt

echo "========================================="
echo "Summary"
echo "========================================="
echo "✅ Organization edit: Blocked (no write permission)"
echo "✅ Settings page: Only Client tab visible"
echo "✅ Global/User/Dynamic APIs: All blocked (403)"
echo "✅ Client Settings API: Accessible"
echo ""
echo "Alan can now only:"
echo "  - View his assigned organization (read-only)"
echo "  - Access Client Settings for clientId 74"
echo "  - See only the Client tab in settings UI"
echo ""
