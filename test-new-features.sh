#!/bin/bash

# Test script for new CLI features
# Tests the new bulk retrieval operations added to the CLI

echo "=== CLI New Features Test ==="
echo ""
echo "This script demonstrates the new CLI operations:"
echo "  - Get All Settings for ClientId"
echo "  - Get All Settings for UserId"
echo "  - Get All Settings for UniqueId"
echo ""
echo "Run the CLI with: ./cli.js"
echo ""
echo "Then follow these steps:"
echo ""
echo "1. Configure CLI (option 'c'):"
echo "   - Bearer Token: demo-token-123"
echo "   - Organization ID: 691cb39d024cf0698aac0e47"
echo "   - Auth Name: default"
echo ""
echo "2. Test new operations:"
echo "   - Option 13: Get All Settings for ClientId"
echo "     Enter clientId: client-123"
echo ""
echo "   - Option 20: Get All Settings for UserId"
echo "     Enter userId: user-456"
echo ""
echo "   - Option 27: Get All Settings for UniqueId"
echo "     Enter uniqueId: test-unique-id"
echo ""
echo "Expected results:"
echo "  - client-123 should return 1 setting (max_users: 50)"
echo "  - user-456 should return 1 setting (max_users: 10)"
echo "  - test-unique-id should return empty array []"
echo ""
echo "=== Direct API Test ==="
echo ""

BASE_URL="http://localhost:3006"
ORG_ID="691cb39d024cf0698aac0e47"
TOKEN="demo-token-123"

echo "Testing: GET /api/client-settings/all/client-123"
curl -s -X GET "$BASE_URL/api/client-settings/all/client-123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  -H "X-Auth-Name: default" | jq '.'
echo ""

echo "Testing: GET /api/user-settings/all/user-456"
curl -s -X GET "$BASE_URL/api/user-settings/all/user-456" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Organization-Id: $ORG_ID" \
  -H "X-Auth-Name: default" | jq '.'
echo ""

echo "=== All Tests Complete ==="
