#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="https://survey.n1b.kr/api/notion"

echo "========================================="
echo -e "${BLUE}Cloudflare Pages Environment Test${NC}"
echo "========================================="
echo ""

# Test 1: Health check with detailed debug info
echo -e "${YELLOW}1. Checking environment variables...${NC}"
HEALTH_RESPONSE=$(curl -s "$API_URL?path=health")

if [ -z "$HEALTH_RESPONSE" ]; then
  echo -e "${RED}✗ No response from server${NC}"
  exit 1
fi

echo "$HEALTH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$HEALTH_RESPONSE"

# Parse the response
HAS_KEY=$(echo "$HEALTH_RESPONSE" | grep -o '"hasNotionKey":[^,}]*' | cut -d':' -f2)
HAS_PARENT=$(echo "$HEALTH_RESPONSE" | grep -o '"hasParentId":[^,}]*' | cut -d':' -f2)
HAS_VERSION=$(echo "$HEALTH_RESPONSE" | grep -o '"hasVersion":[^,}]*' | cut -d':' -f2)

echo ""
echo -e "${YELLOW}2. Environment variable status:${NC}"

if [ "$HAS_KEY" = "true" ]; then
  echo -e "  ${GREEN}✓ NOTION_API_KEY is configured${NC}"
else
  echo -e "  ${RED}✗ NOTION_API_KEY is NOT configured${NC}"
fi

if [ "$HAS_PARENT" = "true" ]; then
  echo -e "  ${GREEN}✓ NOTION_PARENT_PAGE_ID is configured${NC}"
else
  echo -e "  ${RED}✗ NOTION_PARENT_PAGE_ID is NOT configured${NC}"
fi

if [ "$HAS_VERSION" = "true" ]; then
  echo -e "  ${GREEN}✓ NOTION_VERSION is configured${NC}"
else
  echo -e "  ${YELLOW}⚠ NOTION_VERSION is NOT configured (will use default)${NC}"
fi

echo ""
echo "========================================="

# Check if all required vars are set
if [ "$HAS_KEY" = "true" ] && [ "$HAS_PARENT" = "true" ]; then
  echo -e "${GREEN}✅ Environment is properly configured!${NC}"
  echo ""
  echo -e "${YELLOW}3. Testing API functionality...${NC}"
  
  # Test POST to databases endpoint
  TEST_RESPONSE=$(curl -s -X POST "$API_URL?path=databases" \
    -H 'Content-Type: application/json' \
    -d '{
      "title": [{"type":"text","text":{"content":"Test Survey"}}],
      "properties": {
        "Response ID": {"type":"title","title":{}},
        "Name": {"type":"rich_text","rich_text":{}},
        "Email": {"type":"email","email":{}}
      }
    }')
  
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL?path=databases" \
    -H 'Content-Type: application/json' \
    -d '{"title":[{"type":"text","text":{"content":"Test"}}]}')
  
  if [ "$STATUS_CODE" = "200" ] || [ "$STATUS_CODE" = "201" ]; then
    echo -e "  ${GREEN}✓ API is working correctly (Status: $STATUS_CODE)${NC}"
  else
    echo -e "  ${RED}✗ API returned status $STATUS_CODE${NC}"
    echo "  Response: $TEST_RESPONSE"
  fi
else
  echo -e "${RED}❌ Environment variables are NOT configured${NC}"
  echo ""
  echo -e "${YELLOW}Required actions:${NC}"
  echo "1. Go to https://dash.cloudflare.com"
  echo "2. Navigate to Workers & Pages > notion-survey-ai"
  echo "3. Go to Settings > Environment variables"
  echo "4. Add the following variables to BOTH Production and Preview:"
  echo "   - NOTION_API_KEY = your_notion_integration_token"
  echo "   - NOTION_PARENT_PAGE_ID = your_notion_page_id"
  echo "   - NOTION_VERSION = 2022-06-28"
  echo "5. Save and redeploy"
  echo ""
  echo -e "${BLUE}After adding variables, run this script again to verify.${NC}"
fi

echo "========================================="