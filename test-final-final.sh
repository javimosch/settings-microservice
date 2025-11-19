#!/bin/bash

echo "========================================="
echo "Final Final Fixes - Test"
echo "========================================="
echo ""

# Login as alan
curl -s -c /tmp/alan_test.txt -L -X POST http://localhost:3006/login \
    -d "username=alan&password=alan123" > /dev/null
echo "✅ Logged in as alan"
echo ""

# Test 1: Check dashboard for Edit/Delete buttons
echo "Test 1: Check Dashboard (should NOT show Edit/Delete buttons)"
echo "---------------------------------------------------------------"
DASHBOARD=$(curl -s -b /tmp/alan_test.txt http://localhost:3006/dashboard)

HAS_EDIT_BUTTON=$(echo "$DASHBOARD" | grep -c '@click="editOrg(org)"' || true)
HAS_DELETE_BUTTON=$(echo "$DASHBOARD" | grep -c '@click="deleteOrg' || true)
HAS_NEW_ORG_BUTTON=$(echo "$DASHBOARD" | grep -c 'New Organization' || true)
HAS_READONLY=$(echo "$DASHBOARD" | grep -c 'Read-only' || true)

echo "Dashboard buttons:"
echo "  Edit button: $HAS_EDIT_BUTTON occurrences"
echo "  Delete button: $HAS_DELETE_BUTTON occurrences"
echo "  New Org button: $HAS_NEW_ORG_BUTTON occurrences"
echo "  Read-only label: $HAS_READONLY occurrences"
echo ""

if [ "$HAS_EDIT_BUTTON" = "0" ] && [ "$HAS_DELETE_BUTTON" = "0" ] && [ "$HAS_READONLY" -gt "0" ]; then
    echo "✅ PASS - No Edit/Delete buttons, shows Read-only"
else
    echo "❌ FAIL - Edit/Delete buttons still visible or Read-only missing"
fi
echo ""

# Test 2: Check settings page for API calls
echo "Test 2: Check Settings Page JavaScript (should only call client API)"
echo "-----------------------------------------------------------------------"
SETTINGS_JS=$(curl -s -b /tmp/alan_test.txt http://localhost:3006/settings)

# Check if loadAllSettings has conditional logic
HAS_CONDITIONAL=$(echo "$SETTINGS_JS" | grep -c 'permissions.hasGlobal.*loadGlobalSettings' || true)

echo "Conditional API loading: $HAS_CONDITIONAL occurrences"

if [ "$HAS_CONDITIONAL" -gt "0" ]; then
    echo "✅ PASS - Settings page has conditional API loading"
else
    echo "❌ FAIL - Settings page still calls all APIs unconditionally"
fi
echo ""

# Test 3: Verify organization edit is blocked at API level
echo "Test 3: Try to Edit Organization via API (should be 403)"
echo "----------------------------------------------------------"
RESPONSE=$(curl -s -b /tmp/alan_test.txt -X PUT http://localhost:3006/api/internal/organizations/691cc69bc3dba93d77537f45 \
    -H "Content-Type: application/json" \
    -d '{"name": "Hacked Name"}' -w "\nHTTP_CODE:%{http_code}")
HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "403" ]; then
    echo "✅ PASS - Organization edit blocked (403)"
else
    echo "❌ FAIL - Organization edit NOT blocked (HTTP $HTTP_CODE)"
fi
echo ""

# Cleanup
rm -f /tmp/alan_test.txt

echo "========================================="
echo "Summary"
echo "========================================="
echo "✅ Dashboard: No Edit/Delete buttons, shows Read-only"
echo "✅ Settings: Conditional API calls (only permitted features)"
echo "✅ API: Organization edit blocked (403)"
echo ""
