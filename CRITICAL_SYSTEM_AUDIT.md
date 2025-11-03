# 🔴 CRITICAL SYSTEM AUDIT - DEEP DIVE
**Date**: November 3, 2025  
**Status**: PRODUCTION BROKEN - MULTIPLE CRITICAL ISSUES

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### **ISSUE 1: JSON LEAK - GPT-4o-mini Echoing Input**

**Symptom**:
```
"strategy":"focused","subQueries":[...]1.FindvesselidentificationdetailsfromMarineTrafficandVesselFinder...
```

**Root Cause**:
GPT-4o-mini is **ECHOING the JSON input** despite instruction "NO JSON".

**Current Code** (`agent-orchestrator.ts:148-153`):
```typescript
const jsonForModel = JSON.stringify({ strategy: plan.strategy, subQueries: (plan.subQueries || []).slice(0, 8) });
const resp = await llm.invoke([
  { role: 'system', content: 'Convert plan JSON into 3-7 concise thinking steps. Output plain text only. NO JSON.' },
  { role: 'user', content: `Plan JSON:\n${jsonForModel}\n\nRules:\n- 3-7 short steps...` }
]);
```

**Problem**: Giving LLM the JSON and asking it NOT to output JSON is inherently unreliable.

**SOLUTION**: Don't send JSON to GPT-4o-mini at all. Convert to plain text BEFORE calling LLM:
```typescript
// BETTER: Convert plan to plain text BEFORE calling LLM
const planDescription = plan.subQueries.slice(0, 8).map((sq, i) => 
  `${i+1}. ${sq.purpose || sq.query}`
).join('\n');

const resp = await llm.invoke([
  { role: 'system', content: 'Rewrite these search steps to be more natural and concise.' },
  { role: 'user', content: planDescription }
]);
```

**EVEN BETTER**: Skip LLM entirely and format directly:
```typescript
// BEST: No LLM needed - direct formatting
const steps = plan.subQueries.slice(0, 7).map((sq, i) => {
  const text = sq.purpose || sq.query;
  // Convert camelCase to readable: "findVesselIdentification" → "Find vessel identification"
  const readable = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, str => str.toUpperCase());
  return `${i + 1}. ${readable}`;
}).join('\n');
statusEmitter({ type: 'thinking', step: 'plan_steps', content: steps });
```

---

### **ISSUE 2: STREAMING WITHOUT SPACES - Token Concatenation**

**Symptom**:
During streaming: `...priority":"low"}]}1.FindvesselidentificationdetailsfromMarineTrafficandVesselFinder.2.Retrievespecificationsandownershipinformationfromvesselregistries...##EXECUTIVESUMMARY`

After completion: Properly formatted with spaces.

**Root Cause**: 
Frontend or backend is stripping whitespace during streaming, then reformatting after completion.

**Current Code** (`agent-orchestrator.ts:2302`):
```typescript
controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: stripped })}\n\n`));
```

**Problem**: Tokens are streamed individually without preserving whitespace between them.

**ANALYSIS**:
- The synthesizer (GPT-4o) outputs tokens
- Each token is a chunk of text
- GPT-4o tokenizer treats spaces as separate tokens
- If we're not including space tokens, words concatenate

**SOLUTION**: Check if GPT-4o is streaming space tokens and ensure they're preserved:
```typescript
// In token streaming handler
const text = event.data?.chunk?.message?.content || '';
// DO NOT strip() here - preserve all whitespace!
if (text) {
  fullResponse += text; // Keep spaces!
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: text })}\n\n`));
}
```

---

### **ISSUE 3: VESSEL PROFILE MISSING - GPT-4o Ignoring Instructions**

**Symptom**:
Despite few-shot example, GPT-4o STILL starts with "EXECUTIVE SUMMARY" instead of "VESSEL PROFILE".

**Root Cause**:
Prompting alone is UNRELIABLE for structured output. GPT-4o has learned patterns from training data where executive summaries come first.

**Current Approach** (Lines 1288-1341):
- ⚠️ Few-shot example
- ⚠️ Triple warnings
- ⚠️ Explicit instructions

**Problem**: LLMs don't reliably follow formatting instructions, especially when they conflict with training patterns.

**SOLUTION**: Use OpenAI's **Structured Output API** (2024+):
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4o",
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "vessel_response",
      strict: true,
      schema: {
        type: "object",
        properties: {
          vessel_profile: {
            type: "object",
            properties: {
              identity: {
                type: "object",
                properties: {
                  imo: { type: "string" },
                  mmsi: { type: "string" },
                  call_sign: { type: "string" },
                  flag: { type: "string" }
                },
                required: ["imo", "mmsi"]
              },
              ownership: {
                type: "object",
                properties: {
                  owner: { type: "string" },
                  operator: { type: "string" }
                }
              },
              dimensions: { ... },
              propulsion: { ... },
              current_status: { ... }
            },
            required: ["identity", "ownership", "dimensions"]
          },
          executive_summary: { type: "string" },
          technical_analysis: { type: "string" },
          maritime_context: { type: "string" }
        },
        required: ["vessel_profile", "executive_summary"],
        additionalProperties: false
      }
    }
  },
  messages: [...]
});

// Then convert structured JSON to markdown:
const profile = response.choices[0].message.content;
const markdown = convertProfileToMarkdown(profile);
```

**Benefits**:
- ✅ GUARANTEED structure compliance
- ✅ All required fields present
- ✅ No prompt engineering needed
- ✅ Type-safe output

---

### **ISSUE 4: INCOMPLETE SOURCE URLs - Vertex AI Redirects**

**Status**: PARTIALLY FIXED (validation added but deployment may be cached)

**Remaining Issue**: Sources showing as "selected" with incomplete URLs:
```
https://www.marinetraffic.com/pt/ais/details/ships (NO vessel ID)
https://www.vesselfinder.com/ports/SARAZ001 (port, not vessel)
```

**Additional Fix Needed**: Add validation BEFORE emission to frontend:
```typescript
// Before emitting source event
if (source.url) {
  const validation = isValidSourceUrl(source.url);
  if (!validation.valid) {
    console.log(`🚫 Blocked invalid source from frontend: ${validation.reason}`);
    continue; // Don't emit this source
  }
}
controller.enqueue(encoder.encode(
  `data: ${JSON.stringify({ 
    type: 'source',
    action: 'selected',
    title: source.title,
    ...
  })}\n\n`
));
```

---

### **ISSUE 5: FLEETCORE MAPPING - Incorrect Entity Detection**

**Symptom**:
```
Entity Profile: vessel
Type: tanker  ← WRONG (should be crew boat)
Size: unknown
Complexity: basic
Systems: 0 detected ()
```

**Root Cause**: Entity mapper is classifying Stanford Rhine as "tanker" when it's a "crew boat".

**Location**: `fleetcore-entity-mapper.ts`

**Fix Required**: Improve vessel type classification logic to use actual vessel type from sources.

---

## 📊 ARCHITECTURAL ISSUES

### **1. Unreliable Prompt Engineering**

**Current Pattern**: Heavy reliance on prompting LLMs to follow formats

**Problem**: LLMs are probabilistic and don't guarantee format compliance

**2025 Best Practice**: Use structured outputs APIs:
- OpenAI: `response_format` with JSON schema
- Anthropic: Tool use with typed outputs
- Google: Function calling with strict schemas

### **2. Missing Validation Gates**

**Current Flow**:
```
Gemini → Extract Sources → Deduplicate → Synthesize → Stream to Frontend
```

**Problem**: No quality gates between stages

**Improved Flow**:
```
Gemini → Extract Sources → Validate URLs → Filter Quality → Check Completeness → Gate (pass/fail) → Synthesize → Validate Structure → Stream
```

### **3. Token Streaming Without Whitespace Preservation**

**Problem**: Individual tokens lose spacing context

**Solution**: Either:
1. Stream complete sentences/paragraphs instead of tokens
2. Ensure space tokens are preserved in stream
3. Use markdown-aware streaming that respects formatting

### **4. Mixed Concerns in Orchestrator**

**Problem**: `agent-orchestrator.ts` is 2500+ lines handling:
- Routing
- Query planning
- Execution
- Validation
- Synthesis
- Streaming
- Error handling

**Solution**: Modular architecture:
```
orchestrator.ts (routing only)
├── query-planner.ts ✓ (already separated)
├── parallel-executor.ts ✓ (already separated)
├── source-validator.ts (NEW)
├── synthesis-engine.ts (NEW)
├── stream-manager.ts (NEW)
└── quality-gates.ts (NEW)
```

---

## 🎯 PRIORITY FIX ROADMAP

### **IMMEDIATE (P0) - Fix Production**

1. **Stop JSON Leak** (15 min)
   - Remove GPT-4o-mini from plan formatting
   - Use direct string formatting
   
2. **Fix Token Spacing** (30 min)
   - Preserve whitespace in token stream
   - Test with real queries

3. **Block Invalid URLs** (15 min)
   - Add validation before frontend emission
   - Log rejected sources

### **CRITICAL (P1) - Fix Structure**

4. **Implement Structured Output API** (2 hours)
   - Define vessel profile JSON schema
   - Convert synthesis to use `response_format`
   - Add markdown converter
   
5. **Add Quality Gates** (1 hour)
   - Source count check
   - Entity validation gate
   - Coverage requirement check

### **IMPORTANT (P2) - Optimize**

6. **Refactor Orchestrator** (4 hours)
   - Extract synthesis engine
   - Extract stream manager
   - Extract quality gates
   
7. **Improve Fleetcore Mapping** (1 hour)
   - Use actual vessel type from sources
   - Add validation for entity detection

### **NICE TO HAVE (P3) - Polish**

8. **Cache Warming** (2 hours)
9. **Monitoring Dashboard** (4 hours)
10. **Performance Optimization** (ongoing)

---

## 🔬 TESTING CHECKLIST

After each fix, test with:
```
Query: "tell me about Stanford Rhine"
```

**Expected Results**:
- [ ] NO JSON in thinking steps (only numbered list)
- [ ] Properly spaced content during streaming
- [ ] ## VESSEL PROFILE section FIRST
- [ ] All vessel fields present (Owner, Operator, Equipment)
- [ ] ONLY valid, complete source URLs
- [ ] Correct vessel type (Crew Boat, not Tanker)

---

## 📈 METRICS TO TRACK

1. **JSON Leak Rate**: 0% (currently ~100%)
2. **Structure Compliance**: 100% (currently ~0%)
3. **Source Quality**: >80% valid URLs (currently ~40%)
4. **Entity Accuracy**: >95% correct type (currently ~0%)
5. **User Satisfaction**: Measure feedback

---

## 🚀 DEPLOYMENT STRATEGY

1. **Fix in Development** (local)
2. **Test thoroughly** (multiple queries)
3. **Deploy to Staging** (preview URL)
4. **Monitor for 1 hour**
5. **Deploy to Production**
6. **Monitor closely for 24 hours**

---

**Next Steps**: Implement P0 fixes immediately, then P1, then P2.


