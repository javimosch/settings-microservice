#!/bin/bash

echo "========================================="
echo "Resource Filtering - Test (Alan)"
echo "========================================="
echo ""

# Login as alan
echo "Step 1: Login as alan"
echo "----------------------"
curl -s -c /tmp/alan_test.txt -L -X POST http://localhost:3006/login \
    -d "username=alan&password=alan123" > /dev/null

# Get alan's configuration
echo "Alan's Configuration:"
echo "  Organization: Specific (691cc69bc3dba93d77537f45)"
echo "  Client IDs: 74"
echo ""

# Test 1: List organizations (should only see one)
echo "Test 1: List Organizations"
echo "---------------------------"
ORGS=$(curl -s -b /tmp/alan_test.txt http://localhost:3006/api/internal/organizations)
ORG_COUNT=$(echo "$ORGS" | grep -o '"_id"' | wc -l)
echo "Organizations visible: $ORG_COUNT"
if [ "$ORG_COUNT" = "1" ]; then
    echo "✅ PASS - Only 1 organization visible (expected)"
else
    echo "❌ FAIL - $ORG_COUNT organizations visible (expected 1)"
fi
echo ""

# Test 2: Try to create client setting with clientId 74 (should SUCCEED)
echo "Test 2: Create Client Setting for clientId 74 (allowed)"
echo "--------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_test.txt -X POST http://localhost:3006/api/internal/client-settings \
    -H "Content-Type: application/json" \
    -d '{
        "organizationId": "691cc69bc3dba93d77537f45",
        "clientId": "74",
        "settingKey": "test_setting",
        "settingValue": "test_value"
    }' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS - Client setting for 74 created (HTTP $HTTP_CODE)"
else
    echo "❌ FAIL - Client setting for 74 NOT created (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 3: Try to create client setting with clientId 99 (should FAIL)
echo "Test 3: Create Client Setting for clientId 99 (denied)"
echo "-------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_test.txt -X POST http://localhost:3006/api/internal/client-settings \
    -H "Content-Type: application/json" \
    -d '{
        "organizationId": "691cc69bc3dba93d77537f45",
        "clientId": "99",
        "settingKey": "test_setting",
        "settingValue": "test_value"
    }' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Client setting for 99 blocked (403 Forbidden)"
else
    echo "❌ FAIL - Client setting for 99 NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 4: List client settings (should only see clientId 74)
echo "Test 4: List Client Settings"
echo "-----------------------------"
SETTINGS=$(curl -s -b /tmp/alan_test.txt "http://localhost:3006/api/internal/client-settings?organizationId=691cc69bc3dba93d77537f45")
CLIENT_IDS=$(echo "$SETTINGS" | grep -o '"clientId":"[^"]*"' | cut -d'"' -f4 | sort -u)
UNIQUE_COUNT=$(echo "$CLIENT_IDS" | grep -v '^$' | wc -l)

echo "Unique client IDs visible: $CLIENT_IDS"
if [ "$UNIQUE_COUNT" = "1" ] && echo "$CLIENT_IDS" | grep -q "74"; then
    echo "✅ PASS - Only clientId 74 visible"
elif [ "$UNIQUE_COUNT" = "0" ]; then
    echo "⚠️  No client settings found (this is OK if none exist yet)"
else
    echo "❌ FAIL - Multiple client IDs visible: $CLIENT_IDS"
fi
echo ""

# Test 5: Try to edit organization (should succeed only for allowed org)
echo "Test 5: Try to Edit Allowed Organization"
echo "-----------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_test.txt -X PUT http://localhost:3006/api/internal/organizations/691cc69bc3dba93d77537f45 \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Org"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS - Can edit allowed organization (HTTP 200)"
else
    echo "❌ FAIL - Cannot edit allowed organization (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Cleanup
rm -f /tmp/alan_test.txt

echo "========================================="
echo "Summary"
echo "========================================="
echo "Alan should:"
echo "  ✅ See only 1 organization"
echo "  ✅ Create settings for clientId 74 only"
echo "  ❌ NOT create settings for other clientIds"
echo "  ✅ Only see clientId 74 in listings"
echo "  ✅ Edit allowed organization"
echo ""
