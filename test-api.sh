#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="https://survey.n1b.kr/api/notion"

echo "========================================="
echo "Cloudflare Pages API Test Script"
echo "========================================="

# Test 1: OPTIONS request (CORS preflight)
echo -e "\n${YELLOW}Test 1: OPTIONS request (CORS)${NC}"
curl -i -X OPTIONS "$API_URL" 2>/dev/null | head -n 20

# Test 2: GET request without parameters
echo -e "\n${YELLOW}Test 2: GET request (should fail - no params)${NC}"
curl -i -X GET "$API_URL" 2>/dev/null | head -n 10

# Test 3: POST request to databases endpoint
echo -e "\n${YELLOW}Test 3: POST to databases endpoint${NC}"
RESPONSE=$(curl -i -X POST "$API_URL?path=databases" \
  -H 'Content-Type: application/json' \
  -d '{
    "title": [{"type":"text","text":{"content":"Test Survey"}}],
    "properties": {
      "Response ID": {"type":"title","title":{}},
      "Name": {"type":"rich_text","rich_text":{}},
      "Email": {"type":"email","email":{}},
      "Phone": {"type":"phone_number","phone_number":{}}
    }
  }' 2>/dev/null)

echo "$RESPONSE" | head -n 20

# Extract status code
STATUS=$(echo "$RESPONSE" | grep "HTTP" | awk '{print $2}')
if [ "$STATUS" = "200" ] || [ "$STATUS" = "201" ]; then
  echo -e "${GREEN}✓ API is working correctly${NC}"
elif [ "$STATUS" = "400" ]; then
  echo -e "${YELLOW}⚠ Bad Request - Check request format${NC}"
elif [ "$STATUS" = "401" ] || [ "$STATUS" = "403" ]; then
  echo -e "${RED}✗ Authentication failed - Check NOTION_API_KEY${NC}"
elif [ "$STATUS" = "405" ]; then
  echo -e "${RED}✗ Method Not Allowed - Check Functions routing${NC}"
elif [ "$STATUS" = "500" ]; then
  echo -e "${RED}✗ Server Error - Check environment variables${NC}"
else
  echo -e "${RED}✗ Unexpected status: $STATUS${NC}"
fi

echo -e "\n========================================="
echo "Test completed"
echo "========================================="