#!/bin/bash
# Test script for Gemini integration audit
# Tests the complete flow: Gemini API → Router → Synthesizer

echo "🔍 GEMINI INTEGRATION TEST"
echo "=========================="
echo ""

# Test 1: Simple vessel query
echo "TEST 1: Simple vessel query"
echo "Query: 'tell me about vessel Dynamic 17'"
echo ""

curl -X POST http://localhost:8788/api/chatkit/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "tell me about vessel Dynamic 17"
      }
    ],
    "sessionId": "test-gemini-'$(date +%s)'",
    "enableBrowsing": false
  }' 2>&1 | tee /tmp/gemini-test-1.log

echo ""
echo "=========================="
echo ""

# Check logs for key indicators
echo "📊 LOG ANALYSIS:"
echo ""

if grep -q "✅ Gemini complete" /tmp/gemini-test-1.log; then
  echo "✅ Gemini API call succeeded"
else
  echo "❌ Gemini API call may have failed"
fi

if grep -q "✅ Building research context" /tmp/gemini-test-1.log; then
  echo "✅ Research context was built"
else
  echo "❌ Research context was NOT built"
fi

if grep -q "✅ Research context validated" /tmp/gemini-test-1.log; then
  echo "✅ Synthesizer received research context"
else
  echo "❌ Synthesizer did NOT receive research context"
fi

if grep -q "timeout" /tmp/gemini-test-1.log; then
  echo "⚠️  Timeout detected in response"
else
  echo "✅ No timeout errors"
fi

echo ""
echo "Full logs saved to: /tmp/gemini-test-1.log"
echo ""
echo "Run 'tail -f wrangler.log' to see backend logs"

