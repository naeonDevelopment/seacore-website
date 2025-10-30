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

### Restored to Known-Good Version (Commit d996665)
**"feat(phase-3): Add confidence indicator to research panel"** - Oct 30, 09:48 AM

This was the ACTUAL working version that produced the excellent "Dynamic 17" responses.

This version had:
- ✅ Clean, properly formatted markdown responses
- ✅ Inline citations [[1]](url) format working perfectly
- ✅ Simple synthesis prompt without verbose templates
- ✅ NO aggressive JSON filtering (no "Content became empty" errors)
- ✅ NO buggy smart join logic
- ✅ Simple content normalization with `.join('')`
- ✅ Helpful console logging for debugging

### Files Restored

1. **functions/api/chatkit/agent-orchestrator.ts** → Commit d996665
   - Simple synthesis prompt (no verbose templates)
   - Clean technical depth instructions
   - Simple content normalization with `.join('')`
   - NO aggressive filtering patterns
   - NO buggy smart join logic

2. **src/components/layout/ChatInterface.tsx** → Commit d996665
   - NO aggressive JSON filtering causing "Content became empty" errors
   - Clean content handling
   - Console logs present for debugging

3. **src/utils/cookieConsent.ts** → Before commit 35f358a
   - Restored console logs: `[CookieConsent] GTM consent updated`

4. **src/utils/gtmPageTracking.ts** → Before commit 35f358a
   - Restored console logs: `[GTM] Page view tracked`, `[GTM] Event tracked`

## Changes Removed (Bad Commits)

### Commit Chain That Broke the Agent (from d996665 onwards):
1. `fba8675` - feat(phase-4): Citation enforcement post-processor
2. `5ccf53f` - CRITICAL FIX: Prevent query plan JSON from leaking to UI
3. `1918abd` - fix: Enforce inline citations with explicit GPT-4o instructions
4. `e7c7ab5` - Fix: Add keep-alive heartbeat to prevent QUIC_PROTOCOL_ERROR timeouts
5. `aeec461` - Fix: Critical UX improvements for chat orchestrator
6. `fc8fec1` - Fix: Aggressive JSON filtering and strengthened LLM prompt
7. `3ac9574` - Fix: Improve technical query handling for precise technician-level information
8. `c31ae36` - CRITICAL FIX: Detect and block concatenated query plan leakage
9. `57eb07f` - CRITICAL FIX: Restore spaces in concatenated content chunks (buggy smart join)
10. `7ab47f7` - RESTORE: Proper markdown formatting and citation requirements
11. `b92cf74` - ENHANCE: Match high-quality answer format from examples (verbose templates)
12. `323f85a` - FIX: Add comprehensive citation requirements for technical content
13. `4a8380a` - CRITICAL FIX: Catch query plan leakage with spaces
14. `b49dfee` - FIX: Resolve variable redeclaration error
15. `6bebcf5` - ENHANCE: Update early query plan detection to handle spaced patterns
16. `a87a719` - FIX: Update combined buffer check to use correct variable names
17. `35f358a` - REMOVE: All production console logs
18. `803310d` - REMOVE: Remaining console logs from ChatInterface
19. `51173ad` - REMOVE: All remaining console logs from ChatInterface
20. `ab796ee` - RESTORE: Agent to known-good version (1918abd) + console logs (WRONG VERSION!)

**Pattern:** Each "fix" attempted to patch issues introduced by previous fixes, creating a cascade of complexity. Even the first restoration attempt (ab796ee) went to the wrong commit!

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
RESTORE: Agent to CORRECT working version (d996665 - Phase 3)

ISSUE:
Agent producing garbled, concatenated responses with leaked JSON artifacts.
Example: "strategyfocusedQueriesquerycurrentstatusStanfordpurpose..."
First restoration (ab796ee) went to WRONG commit (1918abd) - still broken!

ROOT CAUSES:
1. Buggy "smart join" logic attempting conditional spacing (57eb07f)
2. Overly aggressive JSON filtering in ChatInterface causing "Content became empty"
3. Verbose prompt bloat (400+ lines of templates) overwhelming LLM (b92cf74, 323f85a)
4. Citation post-processor and query plan filtering rejecting legitimate content

CORRECT SOLUTION:
Restored to commit d996665 (Phase 3) - the ACTUAL working version that produced
the excellent "Dynamic 17" responses with proper formatting and citations.

RESTORED FILES:
✅ functions/api/chatkit/agent-orchestrator.ts → d996665 (Phase 3)
✅ src/components/layout/ChatInterface.tsx → d996665 (Phase 3)
✅ src/utils/cookieConsent.ts → with console logs
✅ src/utils/gtmPageTracking.ts → with console logs

WHAT THIS VERSION HAS:
✅ Clean markdown formatting (## EXECUTIVE SUMMARY, etc.)
✅ Working inline citations [[1]](url) format
✅ Simple synthesis prompt without verbose templates
✅ NO aggressive "Content became empty" filtering
✅ NO buggy smart join logic
✅ Console logs for debugging

TEST:
Query: "tell me about Stanford Maya"
Expected: Clean markdown with ## headers, proper spacing, inline citations [[1]](url), 
no JSON artifacts, no "Content became empty" errors
```

---

**Status:** ✅ Agent restored to CORRECT working version (Phase 3)
**Version:** Commit d996665 - feat(phase-3): Add confidence indicator to research panel
**Date:** October 30, 2025

