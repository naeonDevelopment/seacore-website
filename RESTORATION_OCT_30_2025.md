# Agent Restoration - October 30, 2025

## Problem Identified

The chat agent was producing garbled, concatenated responses like:
```
AI Research 10 Sources Verified Research Steps ⚠ Needs review - Confidence: 0% 
Evaluating answer quality... Generating follow-up questions... Source Evaluation 
(10 Verified) Accepted Rejected vertexaisearch.cloud.google.com...
strategy focused Queries query current status Stanford purpose latest operational 
status vessel priority query ifications Stanford purpose gather technical 
specifications dimensions vessel priority medium...
```

## Root Causes

### 1. **Buggy "Smart Join" Logic** (Introduced in commits 57eb07f, c31ae36)
- Attempted to intelligently join LLM token arrays with conditional spacing
- Failed to handle all edge cases, resulting in concatenated words
- Removed the complex joining logic in favor of simple `.join('')`

### 2. **Overly Aggressive Filtering** (Introduced in commits 4a8380a, 6bebcf5, b49dfee)
- Multiple redundant pattern checks for "query plan leakage"
- Patterns like `/strategy\s*(focused\s+)?Queries.*?query\s+\w+.*?purpose/i`
- Was rejecting legitimate content that contained common words like "strategy", "query", "purpose"
- Created cascading filters trying to catch edge cases, made the problem worse

### 3. **Verbose Prompt Bloat** (Introduced in commits b92cf74, 323f85a, 7ab47f7)
- Synthesis prompt expanded from ~200 lines to 400+ lines
- Included excessive templates with [placeholders] for every possible field
- Example sections like "## MAINTENANCE ANALYSIS" with 20+ bullet point templates
- Overwhelmed the LLM, reducing quality and increasing hallucination risk

### 4. **Console Log Removal** (Commits 35f358a, 803310d, 51173ad)
- Removed helpful debugging console logs
- Made troubleshooting difficult

## Solution

### Restored to Known-Good Version (Commit 1918abd)
**"fix: Enforce inline citations with explicit GPT-4o instructions"** - Oct 30, 10:20 AM

This version had:
- ✅ Working citation enforcement
- ✅ Simple, reliable content normalization
- ✅ Clean JSON filtering without false positives
- ✅ Concise, effective prompts (~200 lines)
- ✅ Helpful console logging for debugging

### Files Restored

1. **functions/api/chatkit/agent-orchestrator.ts** → Commit 1918abd
   - Removed buggy smart join logic (lines 1729-1755)
   - Removed aggressive query plan filtering patterns (lines 1863-1949)
   - Simplified synthesis prompt (removed 300+ lines of templates)
   - Restored simple content normalization

2. **src/components/layout/ChatInterface.tsx** → Before commit 35f358a
   - Restored console logs for debugging
   - Removed redundant JSON filtering (already handled in backend)

3. **src/utils/cookieConsent.ts** → Before commit 35f358a
   - Restored console logs: `[CookieConsent] GTM consent updated`

4. **src/utils/gtmPageTracking.ts** → Before commit 35f358a
   - Restored console logs: `[GTM] Page view tracked`, `[GTM] Event tracked`

## Changes Removed (Bad Commits)

### Commit Chain That Broke the Agent:
1. `c31ae36` - CRITICAL FIX: Detect and block concatenated query plan leakage
2. `57eb07f` - CRITICAL FIX: Restore spaces in concatenated content chunks (buggy smart join)
3. `7ab47f7` - RESTORE: Proper markdown formatting and citation requirements
4. `b92cf74` - ENHANCE: Match high-quality answer format from examples (verbose templates)
5. `323f85a` - FIX: Add comprehensive citation requirements for technical content
6. `4a8380a` - CRITICAL FIX: Catch query plan leakage with spaces
7. `b49dfee` - FIX: Resolve variable redeclaration error
8. `6bebcf5` - ENHANCE: Update early query plan detection to handle spaced patterns
9. `a87a719` - FIX: Update combined buffer check to use correct variable names
10. `35f358a` - REMOVE: All production console logs
11. `803310d` - REMOVE: Remaining console logs from ChatInterface
12. `51173ad` - REMOVE: All remaining console logs from ChatInterface

**Pattern:** Each "fix" attempted to patch issues introduced by previous fixes, creating a cascade of complexity.

## Key Lessons

### ❌ What Didn't Work:
1. **Complex heuristic-based filtering** - Too many edge cases, false positives
2. **Over-engineering content normalization** - Simple `.join('')` is more reliable
3. **Verbose template prompts** - More text ≠ better results
4. **Removing console logs** - Makes debugging impossible
5. **Cascading "critical fixes"** - Each fix introduced new problems

### ✅ What Works:
1. **Simple, focused prompts** - Clear instructions without excessive templates
2. **Trust the LLM** - Don't try to catch every possible output variation
3. **Minimal filtering** - Only filter obvious JSON structures
4. **Keep console logs** - Essential for debugging production issues
5. **Test before committing** - Verify fixes don't introduce new issues

## Testing

Test query: `"tell me about Stanford Maya"`

**Expected Output:**
- Clean markdown with proper headers (## EXECUTIVE SUMMARY)
- Proper spacing between all words
- Inline citations [[1]](url), [[2]](url)
- No JSON artifacts or query plan leakage
- ~500-800 words of relevant maritime information

**Previous Broken Output:**
- Concatenated words: "strategyfocusedQueriesquery"
- Missing spaces: "purposelatestoperationalstatus"
- Raw URLs mixed with content
- Source evaluation metadata leaked to user

## Files Modified
- `functions/api/chatkit/agent-orchestrator.ts` (685 lines reverted)
- `src/components/layout/ChatInterface.tsx` (console logs restored)
- `src/utils/cookieConsent.ts` (console logs restored)
- `src/utils/gtmPageTracking.ts` (console logs restored)

## Commit Message
```
RESTORE: Agent to known-good version (1918abd) + console logs

ISSUE:
Agent producing garbled, concatenated responses with leaked JSON artifacts.
Example: "strategyfocusedQueriesquerycurrentstatusStanfordpurpose..."

ROOT CAUSES:
1. Buggy "smart join" logic attempting conditional spacing (57eb07f)
2. Overly aggressive query plan filtering rejecting legitimate content (4a8380a, 6bebcf5)
3. Verbose prompt bloat (400+ lines of templates) overwhelming LLM (b92cf74, 323f85a)
4. Removed console logs making debugging impossible (35f358a, 803310d, 51173ad)

SOLUTION:
Restored agent-orchestrator.ts to commit 1918abd (Oct 30, 10:20 AM)
- Simple content normalization: .join('') instead of complex conditional spacing
- Clean JSON filtering without false positives
- Concise prompts (~200 lines) instead of verbose templates
- Restored console logs for debugging

RESTORED FILES:
✅ functions/api/chatkit/agent-orchestrator.ts → 1918abd
✅ src/components/layout/ChatInterface.tsx → with console logs
✅ src/utils/cookieConsent.ts → with console logs
✅ src/utils/gtmPageTracking.ts → with console logs

REMOVED BAD CODE:
❌ Smart join logic with conditional spacing (lines 1729-1755)
❌ Aggressive query plan filtering patterns (lines 1863-1949)
❌ Verbose synthesis prompt templates (300+ lines)

TEST:
Query: "tell me about Stanford Maya"
Expected: Clean markdown, proper spacing, inline citations, no JSON artifacts
```

---

**Status:** ✅ Agent restored to working state
**Version:** Commit 1918abd with console logs
**Date:** October 30, 2025

