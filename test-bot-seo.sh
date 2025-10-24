#!/bin/bash
# SEO Bot Detection Test Script
# Tests if bots receive optimized HTML content

echo "==================================="
echo "🤖 Bot SEO Detection Test Suite"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test URL (change after deployment)
BASE_URL="${1:-https://fleetcore.ai}"

echo "Testing URL: $BASE_URL"
echo ""

# Test 1: Googlebot
echo "1️⃣  Testing Googlebot..."
RESPONSE=$(curl -s -A "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" "$BASE_URL" | head -100)
if echo "$RESPONSE" | grep -q "Maritime Technical Operating System"; then
    echo -e "${GREEN}✓ Googlebot: Receives optimized content${NC}"
else
    echo -e "${RED}✗ Googlebot: NOT receiving optimized content${NC}"
fi
echo ""

# Test 2: GPTBot (ChatGPT)
echo "2️⃣  Testing GPTBot (ChatGPT)..."
RESPONSE=$(curl -s -A "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)" "$BASE_URL" | head -100)
if echo "$RESPONSE" | grep -q "Maritime Technical Operating System"; then
    echo -e "${GREEN}✓ GPTBot: Receives optimized content${NC}"
else
    echo -e "${RED}✗ GPTBot: NOT receiving optimized content${NC}"
fi
echo ""

# Test 3: ClaudeBot (Anthropic)
echo "3️⃣  Testing ClaudeBot..."
RESPONSE=$(curl -s -A "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)" "$BASE_URL" | head -100)
if echo "$RESPONSE" | grep -q "Maritime Technical Operating System"; then
    echo -e "${GREEN}✓ ClaudeBot: Receives optimized content${NC}"
else
    echo -e "${RED}✗ ClaudeBot: NOT receiving optimized content${NC}"
fi
echo ""

# Test 4: PerplexityBot
echo "4️⃣  Testing PerplexityBot..."
RESPONSE=$(curl -s -A "PerplexityBot" "$BASE_URL" | head -100)
if echo "$RESPONSE" | grep -q "Maritime Technical Operating System"; then
    echo -e "${GREEN}✓ PerplexityBot: Receives optimized content${NC}"
else
    echo -e "${RED}✗ PerplexityBot: NOT receiving optimized content${NC}"
fi
echo ""

# Test 5: Regular User (should NOT get optimized content)
echo "5️⃣  Testing Regular Browser..."
RESPONSE=$(curl -s -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" "$BASE_URL" | head -100)
if echo "$RESPONSE" | grep -q '<div id="root"></div>'; then
    echo -e "${GREEN}✓ Regular User: Gets SPA correctly${NC}"
else
    echo -e "${YELLOW}⚠ Regular User: Unexpected response${NC}"
fi
echo ""

# Check for structured data
echo "6️⃣  Checking Structured Data (Bot view)..."
RESPONSE=$(curl -s -A "Googlebot" "$BASE_URL")
if echo "$RESPONSE" | grep -q '"@type": "FAQPage"'; then
    echo -e "${GREEN}✓ FAQPage schema present${NC}"
else
    echo -e "${RED}✗ FAQPage schema missing${NC}"
fi

if echo "$RESPONSE" | grep -q '"@type": "VideoObject"'; then
    echo -e "${GREEN}✓ VideoObject schema present${NC}"
else
    echo -e "${YELLOW}⚠ VideoObject schema missing${NC}"
fi

if echo "$RESPONSE" | grep -q '"@type": "HowTo"'; then
    echo -e "${GREEN}✓ HowTo schema present${NC}"
else
    echo -e "${YELLOW}⚠ HowTo schema missing${NC}"
fi
echo ""

# Test different routes
echo "7️⃣  Testing Platform Page..."
RESPONSE=$(curl -s -A "Googlebot" "$BASE_URL/platform" | head -100)
if echo "$RESPONSE" | grep -q "Built for Maritime Excellence"; then
    echo -e "${GREEN}✓ Platform page: Optimized content${NC}"
else
    echo -e "${RED}✗ Platform page: NOT optimized${NC}"
fi
echo ""

echo "==================================="
echo "📊 Test Complete"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. If tests FAIL: Deploy middleware to Cloudflare"
echo "2. If tests PASS: Verify in Google Search Console"
echo "3. Check actual bot crawls in server logs"
echo ""

