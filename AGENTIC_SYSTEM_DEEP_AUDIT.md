# AGENTIC SYSTEM DEEP AUDIT
**Date:** November 16, 2025  
**Query Tested:** "whis is the big danish cargo vessel"  
**Expected Behavior:** Chain of thought display, sources with citations, comprehensive answer  
**Actual Behavior:** No CoT, sources detected but not displayed properly, answer incomplete

---

## 🔍 EXECUTIVE SUMMARY

After analyzing the codebase and comparing with the test query logs, I've identified **5 CRITICAL ISSUES** preventing the agentic system from working correctly:

### Critical Issues Found:

1. **❌ Chain of Thought (CoT) Not Displaying**
   - LLM (GPT-4o) ignores `<thinking>` tag instructions despite explicit prompts
   - Frontend is ready to display thinking, but never receives it
   - CoT prompts are too buried in long synthesis instructions

2. **❌ Source Citations Not Clickable/Visible**
   - Sources are detected (10 sources in logs)
   - But citation format may be broken or not rendering properly
   - No inline citations showing [1](url)[2](url) format

3. **❌ Tool Orchestration May Not Be Working**
   - maritim-system-prompt.ts shows `deep_research` is DISABLED
   - Only `gemini_search` and `knowledge_base` tools are active
   - Need to verify if tools are actually being called by LLM

4. **❌ Missing Critical Data (Owner/Operator)**
   - Reflexion loop should detect missing owner data
   - Not triggering additional targeted searches
   - Gap analyzer may not be aggressive enough

5. **❌ Answer Format Issues**
   - Headers bleeding together (e.g., "OPERATIONAL STATUSAs of...")
   - No proper spacing between markdown sections
   - Streaming format needs better structure

---

## 📊 DETAILED FINDINGS

### Issue #1: Chain of Thought Not Displaying

#### Root Cause Analysis:

**Problem:** LLM doesn't generate `<thinking>` tags despite explicit instructions

**Evidence from Code:**
```typescript:1656:1714:functions/api/chatkit/agent-orchestrator.ts
// 🧠 PHASE 2: SYNTHETIC CHAIN OF THOUGHT INTEGRATION
const cotConfig = selectCoTTechnique(userQuery, classification, state.sources || []);

switch (cotConfig.technique) {
  case 'zero-shot':
    enhancedPrompt = buildZeroShotCoT(userQuery, synthesisPrompt, cotConfig.domain);
    // ... other cases
}
```

**The CoT prompt is being built correctly:**
```typescript:46:98:functions/api/chatkit/synthetic-cot-engine.ts
export function buildZeroShotCoT(
  query: string, 
  context: string,
  domain: 'maritime' | 'general'
): string {
  return `${context}

**═══════════════════════════════════════════════════════════════**
**MANDATORY STEP 1: YOU MUST SHOW YOUR REASONING PROCESS**
**═══════════════════════════════════════════════════════════════**

YOU MUST START YOUR RESPONSE WITH <thinking> TAGS. THIS IS NOT OPTIONAL.
```

**Why LLM Ignores It:**

1. **Long Prompt Dilution** - The CoT instruction is appended AFTER a very long synthesis prompt (1000+ chars). By the time the model sees the thinking instruction, it's already primed to generate the answer format.

2. **Competing Instructions** - The synthesis prompt has detailed markdown formatting instructions that compete with the `<thinking>` tag requirement.

3. **Temperature > 0** - GPT-4o with temperature 0.1-0.3 sometimes "forgets" format constraints when focused on content generation.

4. **No Examples** - The prompt tells the model to use `<thinking>` but doesn't show an actual example of a complete response with thinking.

#### Solution Approach:

**Option A: Pre-Generation Thinking (RECOMMENDED)**
- Run a separate LLM call BEFORE synthesis to generate thinking
- Pass thinking as context to synthesis
- Guaranteed thinking display, adds ~500ms latency

**Option B: More Aggressive Prompting**
- Put CoT instruction FIRST, before synthesis context
- Use few-shot examples showing complete responses with thinking
- Increase emphasis with repetition

**Option C: Structured Output**
- Use JSON mode to force thinking field
- Convert to markdown for display
- Most reliable but less natural flow

---

### Issue #2: Tool Calling - Are Tools Being Used?

#### Current Tool Configuration:

```typescript:19:21:functions/api/chatkit/agent-orchestrator.ts
import { maritimeTools } from './tools';
import { deepResearchTool } from './tools/deep-research';
import { geminiTool } from './tools/gemini-tool';
```

#### Critical Discovery - Tavily Research DISABLED:

From `maritime-system-prompt.ts`:
```markdown
🔬 **deep_research** - DISABLED (Coming soon with Tavily integration)
```

**This is a CRITICAL ISSUE!**

The system has TWO tools:
1. **gemini_search** - Google Search with Gemini grounding (ACTIVE)
2. **deep_research** - Tavily multi-source research (DISABLED per system prompt)

#### What's Actually Happening:

1. User enables "Online Research" toggle
2. Frontend sends `enableBrowsing: true`
3. Backend classifies query as requiring research
4. LLM is told `deep_research` is disabled
5. LLM falls back to `gemini_search` only
6. **Result:** Only using Google Search, not comprehensive Tavily research

#### Why This Matters:

From the logs:
```
🔍 [Source 1] selected https://www.marinetraffic.com/en/ais/details/ships
🔍 [Source 2] selected https://www.marinetraffic.com/en/ais/details/ships
...
📊 [Session Update] {sources: 10, verified: 10, browsing: true}
```

All sources are from Gemini grounding. **Tavily is not being used at all.**

#### Verification Needed:

We need to check if:
1. LLM is actually calling `gemini_search` tool
2. Tool results are being processed correctly
3. Why maritime-system-prompt says deep_research is disabled

---

### Issue #3: Source Citations Not Displaying Properly

#### Evidence:

From user's example, they see:
```
REFERENCES

[1] MarineTraffic, "Ship SKAWLINK 3..."
[2] MarineTraffic, "Ship DANISH..."
...
[10] gCaptain, "Small Ports Feel the Heat..."
```

But citations in content may not be clickable links.

#### Expected Format:

Should be inline citations like:
```markdown
The Majestic Maersk measures 400 meters [7](https://gcaptain.com/...) 
and can carry 18,270 TEU [7](https://gcaptain.com/...).
```

#### What's Configured:

Citation enforcement is active:
```typescript:1991:2028:functions/api/chatkit/agent-orchestrator.ts
// PHASE 4: Citation Enforcement
const citationResult = enforceCitations(fullContent, state.sources, { 
  technicalDepth: state.requiresTechnicalDepth, 
  minRequired: vesselQueryFlag ? 5 : undefined 
});

// Convert to modern citation format with REFERENCES section
const modernCitationResult = ensureModernCitationFormat(fullContent, state.sources);
```

#### Possible Issues:

1. **LLM not generating inline citations** - Synthesis prompt may not emphasize inline citations enough
2. **Frontend not rendering markdown links** - ReactMarkdown config issue
3. **Citation format mismatch** - Backend generates `[1](url)` but frontend expects different format

---

### Issue #4: Missing Owner/Operator Data

#### Expected Behavior:

Reflexion loop should:
1. Detect missing owner/operator
2. Generate targeted search query
3. Fetch additional data
4. Synthesize enhanced response

#### Code Analysis:

```typescript:2065:2178:functions/api/chatkit/agent-orchestrator.ts
// 🔄 REFLEXION LOOP: Self-healing research for vessel queries
if (isVesselQuery && fullContent) {
  const MAX_ITERATIONS = 3;
  
  while (currentIteration <= MAX_ITERATIONS) {
    const gapAnalysis: GapAnalysis = analyzeResearchGaps(
      enhancedContent,
      vesselName,
      allSources,
      currentIteration
    );
    
    if (!gapAnalysis.needsAdditionalResearch) {
      console.log(`   ✅ Data complete (${gapAnalysis.completeness}%) - stopping`);
      break;
    }
    
    // Trigger targeted research for gaps
    // ...
  }
}
```

The reflexion loop IS implemented, but:

1. **Not triggering for non-vessel queries** - "big danish cargo vessel" is vague, may not be classified as vessel query
2. **Gap detection may be too lenient** - Completeness threshold may be set too low
3. **Not running for brief queries** - User asked a simple question, system may skip detailed analysis

---

### Issue #5: Streaming Format Issues

#### Problem:

Headers bleeding together:
```
OPERATIONAL STATUSAs of the latest...
TECHNICAL ANALYSISDynamic17's design...
```

#### Root Cause:

LLM not adding proper spacing between markdown sections.

#### Current Instruction:

The synthesis prompt should have spacing rules, but they may not be explicit enough:
```typescript:1650:1651:functions/api/chatkit/agent-orchestrator.ts
**REMINDER**: ${isVesselQuery ? 'Start with ## VESSEL PROFILE section...' : 'Start with ## EXECUTIVE SUMMARY.'}
```

#### Fix Needed:

Add explicit formatting rules:
```markdown
**CRITICAL FORMATTING:**
1. Add TWO blank lines before every ## header
2. Add ONE blank line after every ## header
3. Example:

## EXECUTIVE SUMMARY

The Majestic Maersk is...

## TECHNICAL SPECIFICATIONS

Length: 400m...
```

---

## 🔧 RECOMMENDED FIXES

### Priority 1: Enable Deep Research (Tavily)

**Problem:** Tavily research is disabled, limiting source diversity

**Fix:**
```typescript
// In maritime-system-prompt.ts
// REMOVE this line:
// 🔬 **deep_research** - DISABLED (Coming soon with Tavily integration)

// ADD proper description:
🔬 **deep_research** - Comprehensive multi-source maritime intelligence
   - Use for: Specific vessels, technical specs, company research
   - Returns: 10-20 sources with content intelligence analysis
   - Best for: Queries requiring authoritative technical data
```

**Impact:** HIGH - Enables full research capabilities

---

### Priority 2: Fix Chain of Thought Display

**Recommended: Pre-Generation Thinking**

Add a new node in LangGraph that generates thinking BEFORE synthesis:

```typescript
// New node: generate_thinking
async function generateThinking(state: GraphState): Promise<Partial<GraphState>> {
  console.log('🧠 Generating chain of thought...');
  
  const thinkingPrompt = `You are analyzing a maritime query. Show your step-by-step reasoning.

USER QUERY: ${state.userQuery}

SOURCES AVAILABLE: ${state.sources?.length || 0} sources

Your task: Generate structured reasoning using ONLY <thinking> tags.

<thinking>
1. Understanding: [What is the user asking?]
2. Information Needs: [What data is needed?]
3. Source Analysis: [Which sources are most relevant?]
4. Data Quality: [Are sources authoritative?]
5. Synthesis Strategy: [How to structure the answer?]
6. Completeness Check: [Any missing critical data?]
</thinking>

Generate ONLY the thinking section above. No additional content.`;

  const thinkingLLM = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    maxTokens: 500,
    openAIApiKey: env.OPENAI_API_KEY
  });
  
  const response = await thinkingLLM.invoke([
    new SystemMessage(thinkingPrompt)
  ]);
  
  const thinking = extractBetweenTags(response.content, 'thinking', true);
  
  console.log(`✅ Thinking generated: ${thinking.length} chars`);
  
  // Emit thinking to frontend
  statusEmitter?.({
    type: 'thinking_complete',
    content: thinking
  });
  
  return { thinking };
}

// Update graph to include thinking node BEFORE synthesis
```

**Impact:** HIGH - Guarantees CoT display

---

### Priority 3: Fix Citation Format

**Problem:** Citations may not be clickable or visible

**Fix: Aggressive Citation Injection**

Update synthesis prompt to REQUIRE inline citations:

```typescript
**CRITICAL CITATION RULES (NON-NEGOTIABLE):**

1. EVERY factual statement MUST have an inline citation [N](url)
2. Minimum citations: 8 for technical queries, 5 for brief queries
3. Format: "The vessel measures 400 meters [7](https://gcaptain.com/...)"
4. NEVER write facts without immediate citations
5. After main content, add ## REFERENCES section with:
   [1] Author/Source, "Title", URL
   
Example of REQUIRED format:
"The Majestic Maersk was built in 2013 [9](url1) and operates for A.P. Moller-Maersk [7](url2)."

If you don't include inline citations, your response will be rejected.
```

**Impact:** MEDIUM - Ensures citations are visible

---

### Priority 4: Improve Gap Detection

**Problem:** Owner/operator data not detected as missing

**Fix: More Aggressive Gap Detection**

```typescript
// In research-gap-analyzer.ts
function analyzeResearchGaps(content: string, ...): GapAnalysis {
  const criticalFields = [
    { field: 'IMO', pattern: /IMO\s*:?\s*\d{7}/, importance: 'critical' },
    { field: 'Owner', pattern: /owner[:\s]+[A-Z]/i, importance: 'critical' }, // CRITICAL
    { field: 'Operator', pattern: /operat(or|ed by)[:\s]+[A-Z]/i, importance: 'critical' }, // CRITICAL
    { field: 'MMSI', pattern: /MMSI\s*:?\s*\d{9}/, importance: 'high' },
    // ... more fields
  ];
  
  // Lower completeness threshold to 85% (from 80%)
  const needsAdditionalResearch = completeness < 85 || 
    missingFields.some(f => f.importance === 'critical');
  
  return {
    completeness,
    missingFields,
    needsAdditionalResearch,
    confidenceLevel: completeness > 90 ? 'high' : 'medium'
  };
}
```

**Impact:** MEDIUM - Better data completeness

---

### Priority 5: Fix Streaming Format

**Problem:** Headers bleeding together

**Fix: Explicit Spacing Instructions**

Add to synthesis prompt (at the VERY BEGINNING):

```typescript
const synthesisPrompt = `**═══════════════════════════════════════**
**FORMATTING RULES (CRITICAL - READ FIRST)**
**═══════════════════════════════════════**

1. Add TWO blank lines before every ## header
2. Add ONE blank line after every ## header
3. Never let headers touch content

CORRECT FORMAT:
## HEADER

Content here...


## NEXT HEADER

More content...

WRONG FORMAT (DO NOT DO THIS):
## HEADERContent immediately after...

**═══════════════════════════════════════**

${originalSynthesisPrompt}`;
```

**Impact:** LOW - UX improvement

---

## 🧪 VERIFICATION PLAN

### Test Query: "what is the big danish cargo vessel"

**Expected Results After Fixes:**

1. ✅ **Chain of Thought Displays:**
   ```
   💭 Reasoning (click to expand)
   1. Understanding: User wants information about large Danish cargo ships
   2. Information Needs: Vessel name, specs, operator, current status
   3. Source Analysis: Found 10 sources, prioritizing authoritative sources
   ...
   ```

2. ✅ **Tools Called:**
   ```
   🔮 Using gemini_search for quick verification
   🔬 Using deep_research for comprehensive analysis
   ```

3. ✅ **Sources Displayed:**
   ```
   📊 10 Sources Verified
   - MarineTraffic (2 sources)
   - VesselFinder (3 sources)
   - gCaptain (5 sources)
   ```

4. ✅ **Inline Citations:**
   ```markdown
   The Majestic Maersk measures 400 meters [7](https://gcaptain.com/...)
   and is operated by A.P. Moller-Maersk [7](https://gcaptain.com/...).
   ```

5. ✅ **Complete Data:**
   ```markdown
   ## VESSEL PROFILE
   
   IMO: 9619919
   MMSI: 219018501
   Owner: A.P. Moller-Maersk
   Operator: A.P. Moller-Maersk
   ...
   ```

6. ✅ **Proper Formatting:**
   ```markdown
   ## EXECUTIVE SUMMARY
   
   The Majestic Maersk is one of...
   
   
   ## TECHNICAL SPECIFICATIONS
   
   Length Overall: 399 meters...
   ```

---

## 📋 ACTION ITEMS

### Immediate (This Session):

- [x] Complete deep audit analysis
- [ ] Fix maritime-system-prompt.ts (enable deep_research)
- [ ] Implement pre-generation thinking node
- [ ] Add aggressive citation instructions to synthesis prompt
- [ ] Add explicit spacing rules to synthesis prompt
- [ ] Test with "big danish cargo vessel" query

### High Priority (Next):

- [ ] Improve gap detection thresholds
- [ ] Add few-shot examples for CoT
- [ ] Verify frontend citation rendering
- [ ] Add metrics dashboard to track tool usage

### Medium Priority:

- [ ] Implement confidence scoring for thinking quality
- [ ] Add user preference for CoT display (collapsible by default)
- [ ] Optimize reflexion loop performance
- [ ] Add caching for repeated queries

---

## 🎯 SUCCESS METRICS

After implementing fixes, the system should achieve:

1. **CoT Display Rate:** 95%+ of queries show thinking
2. **Tool Usage:** Both gemini_search AND deep_research called
3. **Citation Quality:** 8+ inline citations per technical query
4. **Data Completeness:** 85%+ for vessel queries (90%+ with reflexion)
5. **Format Quality:** 0 formatting issues (proper spacing)
6. **Source Diversity:** 10+ sources from 3+ domains

---

## 💡 ARCHITECTURAL INSIGHTS

### What's Working Well:

1. ✅ **Tool Architecture** - Clean separation of gemini_search and deep_research
2. ✅ **Citation System** - Sophisticated enforcement and validation
3. ✅ **Reflexion Loop** - Self-healing research for gap filling
4. ✅ **Session Memory** - Proper context management
5. ✅ **Content Intelligence** - Smart source ranking

### What Needs Improvement:

1. ❌ **CoT Integration** - Too fragile, needs dedicated node
2. ❌ **Tool Visibility** - deep_research disabled, not communicated to user
3. ❌ **Prompt Engineering** - CoT instructions buried, competing with formatting
4. ❌ **Gap Detection** - Not aggressive enough for critical fields
5. ❌ **Frontend Communication** - Thinking events not reaching UI

### System Complexity:

The system has **3,342 lines** in agent-orchestrator.ts alone. This is a HIGHLY sophisticated agentic system with:

- LangGraph orchestration
- 2 research tools (Gemini + Tavily)
- Synthetic chain of thought engine
- Citation enforcement system
- Reflexion loop for self-improvement
- Session memory management
- Content intelligence analysis
- Owner/operator extraction
- Research gap analysis

**The architecture is EXCELLENT.** The issues are minor integration bugs, not fundamental design problems.

---

## 🚀 NEXT STEPS

1. **Enable Deep Research** - Uncomment/fix maritime-system-prompt.ts
2. **Implement Pre-Gen Thinking** - Add thinking node to LangGraph
3. **Aggressive Citation Prompt** - Update synthesis instructions
4. **Test End-to-End** - Run "big danish cargo vessel" query
5. **Monitor Metrics** - Track CoT display, tool usage, citation quality

---

**End of Deep Audit Report**

