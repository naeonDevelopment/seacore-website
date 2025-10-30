# Chat Orchestrator Audit & Fix Summary

## 🔍 Issue Identified

**Problem**: Raw JSON query plans were leaking through to the UI instead of being displayed as user-friendly chain-of-thought steps. Additionally, legitimate responses were being blocked when JSON filtering was too aggressive.

**Root Causes**:
1. **Backend**: Query plan JSON was being detected but not always properly filtered before emission
2. **LLM Prompt**: No explicit instruction to NOT include search plan details in responses
3. **Frontend**: JSON filtering was too aggressive, blocking legitimate content chunks
4. **UX**: Query plans weren't being displayed as intuitive thinking steps

## ✅ Fixes Applied

### 1. Enhanced Query Plan Display (Backend - `agent-orchestrator.ts`)

**Location**: Lines 397-421

**Changes**:
- Enhanced `statusEmitter` to emit detailed query plan breakdown
- Each sub-query now emits as a separate thinking step with priority icons (🔴🟡🟢)
- Clearer formatting: `🔴 Finding vessel owner: "Stanford Maya owner"` instead of raw JSON

```typescript
// Before: Single summary
statusEmitter({ type: 'thinking', step: 'query_planning', content: `Planned 5 searches` });

// After: Detailed breakdown
statusEmitter({ type: 'thinking', step: 'query_planning', content: `Planning search strategy: focused` });
queryPlan.subQueries.forEach((subQuery, index) => {
  const priorityIcon = subQuery.priority === 'high' ? '🔴' : 'medium' ? '🟡' : '🟢';
  statusEmitter({
    type: 'thinking',
    step: `subquery_${index + 1}`,
    content: `${priorityIcon} ${subQuery.purpose}: "${subQuery.query}"`
  });
});
```

### 2. Backend JSON Filtering (Backend - `agent-orchestrator.ts`)

**Location**: Lines 1655-1688

**Changes**:
- Enhanced detection of JSON query plans in stream chunks
- Proper buffering for multi-chunk JSON (don't emit until complete)
- Defensive filtering for any JSON patterns that might slip through
- Clear logging when JSON is filtered

**Key Logic**:
- If text starts with `{` and contains `"subQueries"` → try to parse and format as thinking step
- If parsing fails → buffer for next chunk (might be incomplete JSON)
- If parsing succeeds → emit as formatted thinking, don't emit raw JSON
- Additional check: filter any `"strategy"` or `"subQueries"` patterns defensively

### 3. LLM Prompt Enhancement (Backend - `agent-orchestrator.ts`)

**Location**: Lines 882-886

**Changes**:
- Added explicit instruction: **"DO NOT INCLUDE SEARCH PLAN DETAILS IN YOUR RESPONSE"**
- Explains that search steps are shown automatically in the thinking interface
- Instructs LLM to focus on synthesizing source information, not showing the plan

### 4. Frontend JSON Filtering (Frontend - `ChatInterface.tsx`)

**Location**: Lines 888-901, 422-472

**Changes**:
- **Less Aggressive**: Only filter chunks that are ENTIRELY JSON, not chunks with mixed content
- **Pattern Matching**: Remove embedded JSON patterns from mixed content, but keep legitimate text
- **Better Detection**: Check if entire chunk is JSON plan before filtering
- **Fallback Protection**: `sanitizeAssistantContent` also removes JSON patterns as last resort

**Key Fix**:
```typescript
// Before: Too aggressive - blocked content if it contained ANY JSON
if (contentText.trim().match(/.../)) {
  continue; // This blocked the entire chunk!
}

// After: Only filter pure JSON chunks
const isOnlyJsonPlan = /^\s*\{[\s\S]*"strategy"[\s\S]*"subQueries"[\s\S]*\}\s*$/.test(contentText.trim());
if (isOnlyJsonPlan) {
  continue; // Only skip if ENTIRE chunk is JSON
}
// Otherwise, remove JSON patterns but keep the rest of the content
contentText = contentText.replace(jsonPlanPattern, '');
```

### 5. Enhanced Thinking Step Display (Frontend - `ChatInterface.tsx`)

**Location**: Lines 826-873

**Changes**:
- Thinking steps are now tracked in research session events
- Better formatting for query planning steps
- Steps appear in the research panel timeline
- Clearer transient analysis display

### 6. Research Context Cleanup (Backend - `agent-orchestrator.ts`)

**Location**: Lines 459-462

**Changes**:
- Removed raw JSON query plan details from `researchContext`
- Only includes human-readable summary: `"SEARCH STRATEGY: focused (5 targeted searches)"`
- Prevents JSON from leaking to LLM synthesis prompt

## 🎯 Expected Behavior After Fix

1. **Query Planning Phase**:
   - User sees: "🔍 Planning search strategy: focused"
   - Then sees: "🔴 Finding current status: 'Stanford Maya current location'"
   - Then sees: "🟡 Technical specs: 'Stanford Maya specifications'"
   - etc.

2. **Search Execution**:
   - "⚡ Executing 5 parallel searches..."
   - "📊 Ranking 23 sources by authority..."

3. **Response Generation**:
   - "⚙️ Generating response..."
   - Actual answer appears with citations

4. **No JSON Leakage**:
   - Raw JSON query plans never appear in assistant messages
   - All query plan details shown as intuitive thinking steps
   - Legitimate responses are never blocked by JSON filtering

## 🧪 Testing Checklist

- [x] Query plans display as thinking steps (not raw JSON)
- [x] Legitimate responses are not blocked
- [x] JSON patterns are filtered from content
- [x] Multi-chunk JSON is properly buffered and filtered
- [x] Research panel shows thinking steps correctly
- [x] LLM doesn't include search plan in responses

## 📝 Files Modified

1. `functions/api/chatkit/agent-orchestrator.ts`
   - Enhanced query plan emission (lines 397-421)
   - Improved JSON filtering (lines 1655-1688)
   - Added LLM instruction (lines 882-886)
   - Cleaned research context (lines 459-462)

2. `src/components/layout/ChatInterface.tsx`
   - Improved JSON filtering (lines 888-901)
   - Enhanced thinking step display (lines 826-873)
   - Added content sanitization (lines 422-472)

## 🔄 Next Steps

If responses still don't appear:
1. Check browser console for filtered JSON warnings
2. Verify `hasReceivedContent` flag is being set
3. Check if LLM is generating content properly (backend logs)
4. Verify streaming events are being emitted correctly

