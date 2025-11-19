#!/bin/bash

echo "========================================="
echo "Permission Enforcement - Test"
echo "========================================="
echo ""

# Test 1: Login as alan
echo "Test 1: Login as alan"
echo "----------------------"
curl -s -c /tmp/alan_cookies.txt -X POST http://localhost:3006/login \
    -d "username=alan&password=alan123" \
    -w "HTTP %{http_code}\n" -o /dev/null

echo ""

# Test 2: Try to access user-settings (should FAIL - alan has read=false, write=false)
echo "Test 2: Try to access user-settings API (should be denied)"
echo "------------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_cookies.txt http://localhost:3006/api/internal/user-settings -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - User settings blocked (403 Forbidden)"
else
    echo "❌ FAIL - User settings NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 3: Try to access client-settings (should SUCCEED - alan has read=true, write=true)
echo "Test 3: Try to access client-settings API (should succeed)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_cookies.txt http://localhost:3006/api/internal/client-settings -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS - Client settings accessible (200 OK)"
else
    echo "❌ FAIL - Client settings blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE" | head -5
fi
echo ""

# Test 4: Try to access dynamicauth (should FAIL - alan has read=false, write=false)
echo "Test 4: Try to access dynamicauth API (should be denied)"
echo "---------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_cookies.txt http://localhost:3006/api/internal/dynamicauth -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Dynamic auth blocked (403 Forbidden)"
else
    echo "❌ FAIL - Dynamic auth NOT blocked (HTTP $HTTP_CODE)"
    echo "$RESPONSE" | grep -v "HTTP_CODE"
fi
echo ""

# Test 5: Check dashboard shows only allowed cards
echo "Test 5: Check dashboard visibility"
echo "-----------------------------------"
DASHBOARD=$(curl -s -b /tmp/alan_cookies.txt http://localhost:3006/dashboard)

if echo "$DASHBOARD" | grep -q "Settings"; then
    echo "✅ Settings card visible (expected - has clientSettings access)"
else
    echo "⚠️  Settings card NOT visible"
fi

if echo "$DASHBOARD" | grep -q "Dynamic Auth"; then
    echo "❌ FAIL - Dynamic Auth card visible (should be hidden)"
else
    echo "✅ Dynamic Auth card hidden (expected - no access)"
fi

if echo "$DASHBOARD" | grep -q "User Management"; then
    echo "❌ FAIL - User Management card visible (should be hidden - not admin)"
else
    echo "✅ User Management card hidden (expected - not admin)"
fi
echo ""

# Test 6: Try to access /dynamicauth page (should FAIL)
echo "Test 6: Try to access /dynamicauth page (should be denied)"
echo "-----------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_cookies.txt http://localhost:3006/dynamicauth -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Dynamic auth page blocked (403 Forbidden)"
else
    echo "❌ FAIL - Dynamic auth page NOT blocked (HTTP $HTTP_CODE)"
fi
echo ""

# Cleanup
rm -f /tmp/alan_cookies.txt

echo "========================================="
echo "Summary"
echo "========================================="
echo "Permission enforcement is working if all tests pass."
echo "Alan should only see Settings card and access client-settings."
echo ""
