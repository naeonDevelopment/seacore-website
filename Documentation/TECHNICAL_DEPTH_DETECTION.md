# Technical Depth Detection System

## Overview

The agent orchestrator now intelligently detects when users require **detailed technical analysis** versus a **quick executive summary**. This transforms the system from providing generic overviews to acting as the world's best vertical maritime expert, providing comprehensive maintenance data, OEM recommendations, real-world scenarios, and operational best practices.

## Problem Statement

**Before:**
```
User: "Tell me about Dynamic 17"
System: → Generic overview (400 words)

User: "Tell me more details about the engines - maintenance, reports and specifics"
System: → Another generic overview (400 words) ❌ NOT HELPFUL
```

**After:**
```
User: "Tell me about Dynamic 17"
System: → Quick executive summary (400 words, Technical Director level)

User: "Tell me more details about the engines - maintenance, reports and specifics"
System: → COMPREHENSIVE technical analysis (600-800 words, Chief Engineer level):
  ✅ OEM service intervals with part numbers
  ✅ Common failure modes and known issues
  ✅ Critical maintenance points and procedures
  ✅ Performance optimization tips
  ✅ Warning signs and monitoring parameters
  ✅ Real-world operational scenarios
  ✅ Troubleshooting recommendations
```

## Implementation

### 1. Query Classification Enhancement (`query-classification-rules.ts`)

#### New Detection Keywords
- **Maintenance-specific**: maintenance, service, overhaul, inspection, service interval, PM schedule
- **Equipment technical**: engine, engines, propulsion, generator, specifications, model number, part number
- **OEM/Manufacturer**: OEM, manufacturer, caterpillar, wartsila, man, cummins, factory specs
- **Real-world data**: failure, breakdown, common issues, failure modes, wear, degradation
- **Reports/Documentation**: report, data, inspection report, performance data, maintenance history
- **Technical procedures**: procedure, protocol, troubleshooting, diagnostics
- **Warnings/Tips**: warning, recommendation, tip, best practice, monitor
- **Depth indicators**: more details, detailed, comprehensive, in-depth, specifics, elaborate
- **Real-world scenarios**: scenario, case study, example, real-world, practical

#### Detection Phrases
- `/more\s+(details|information|info|data|specifics)/i`
- `/tell\s+me\s+more/i`
- `/explain\s+in\s+detail/i`
- `/maintenance\s+(recommendations|procedures|schedule)/i`
- `/oem\s+(recommendations|specs|requirements)/i`
- `/real[\s-]world\s+(scenarios?|data|examples)/i`
- `/common\s+(issues?|problems?|failures?)/i`

#### Detection Logic
```typescript
function requiresTechnicalDepth(query: string): boolean {
  // 1. Check for explicit depth request phrases
  const hasDepthPhrase = TECHNICAL_DEPTH_PHRASES.some(pattern => pattern.test(query));
  
  // 2. Count technical depth keywords (need at least 2)
  // Example: "engines" + "maintenance" = technical depth
  const technicalKeywordCount = TECHNICAL_DEPTH_KEYWORDS.filter(...)
  
  // 3. Special case: Follow-up queries with context
  // Example: "ok tell me more details about the engines"
  const isFollowUpTechnical = /^(ok|okay|yes),?\s+(tell|give|show)/i.test(query) && 
                               (query.includes('detail') || query.includes('more'))
  
  return hasDepthPhrase || technicalKeywordCount >= 2 || isFollowUpTechnical;
}
```

#### Classification Output
```typescript
interface QueryClassification {
  mode: 'none' | 'verification' | 'research';
  preserveFleetcoreContext: boolean;
  enrichQuery: boolean;
  isHybrid: boolean;
  resolvedQuery: ResolvedQuery;
  
  // NEW: Technical depth detection
  requiresTechnicalDepth: boolean;  // true when detailed analysis needed
  technicalDepthScore: number;      // 0-10 score (6+ = high depth)
}
```

#### Auto-Route to Research Mode
When `technicalDepthScore >= 6` AND entity context exists, the system automatically switches from `verification` mode (quick Gemini search) to `research` mode (comprehensive deep research with 20+ sources).

### 2. Maritime System Prompt Enhancement (`maritime-system-prompt.ts`)

#### Critical Flag Detection
```
# CRITICAL: TECHNICAL DEPTH DETECTION

**When TECHNICAL DEPTH REQUIRED = true:**
- User is asking for DETAILED technical information (not a generic overview)
- Provide comprehensive maintenance schedules, OEM recommendations, real-world scenarios
- Include specific part numbers, service intervals, common failure modes
- Add warnings, tips, and operational best practices
- Write as a Chief Engineer / Technical Superintendent (hands-on expert level)
- Response length: 600-800 words minimum with exhaustive technical detail

**When TECHNICAL DEPTH REQUIRED = false:**
- User wants a quick overview or general information
- Provide concise executive summary (400-500 words)
- High-level specs and operational context
- Write as a Technical Director (strategic level)
```

#### Response Format for Technical Depth
When `TECHNICAL DEPTH = true`:
1. **Executive Summary** (2-3 sentences)
2. **Technical Specifications** (comprehensive - all available details)
3. **Operational Status** (current deployment, operating profile)
4. **MAINTENANCE ANALYSIS** ⭐ NEW CRITICAL SECTION:
   - OEM-recommended service intervals with part numbers
   - Common failure modes and known issues from field data
   - Critical maintenance points and inspection procedures
   - Typical consumables and expected service life
5. **OPERATIONAL RECOMMENDATIONS** ⭐ NEW CRITICAL SECTION:
   - Performance optimization tips
   - Warning signs and monitoring parameters
   - Best practices from operational experience
   - Troubleshooting common issues
6. **REAL-WORLD SCENARIOS** ⭐ NEW CRITICAL SECTION:
   - Typical operating conditions and scenarios
   - Case studies or field reports
   - Lessons learned from operational fleet
7. **Maritime Context** (industry implications, fleet position)

#### Example Response Template
The prompt includes a complete 800-word example showing:
- Caterpillar C32 engine maintenance intervals
- Common failure modes (aftercooler corrosion, turbocharger bearing failures)
- Critical maintenance points (oil analysis, impeller replacement)
- Warning signs (coolant temp >85°C, oil pressure <40 PSI)
- Real-world scenarios (offshore operations, field experience)
- Fleet data best practices (CBM, monitoring parameters)

### 3. Agent Orchestrator Integration (`agent-orchestrator.ts`)

#### State Extension
```typescript
const AgentState = Annotation.Root({
  // ... existing state ...
  
  // NEW: Technical depth tracking
  requiresTechnicalDepth: Annotation<boolean>({
    reducer: (_, next) => next,
    default: () => false,
  }),
  technicalDepthScore: Annotation<number>({
    reducer: (_, next) => next,
    default: () => 0,
  }),
});
```

#### Router Node Enhancement
```typescript
async function routerNode(state: State, config: any) {
  // ... existing classification ...
  const classification = classifyQuery(userQuery, state.enableBrowsing, sessionMemory);
  
  // NEW: Chain of Thought - Emit technical depth detection
  if (classification.requiresTechnicalDepth && statusEmitter) {
    statusEmitter({
      type: 'thinking',
      step: 'technical_depth',
      content: `Technical depth required (score: ${classification.technicalDepthScore}/10) - Detailed analysis`
    });
  }
  
  // NEW: Pass technical depth to all return statements
  return {
    mode: classification.mode,
    requiresTechnicalDepth: classification.requiresTechnicalDepth,
    technicalDepthScore: classification.technicalDepthScore,
    // ... other state ...
  };
}
```

#### Synthesizer Node Enhancement
```typescript
async function synthesizerNode(state: State, config: any) {
  console.log(`   Technical Depth Required: ${state.requiresTechnicalDepth} (score: ${state.technicalDepthScore}/10)`);
  
  // NEW: Build technical depth flag for synthesis prompt
  const technicalDepthFlag = `**TECHNICAL DEPTH REQUIRED: ${state.requiresTechnicalDepth ? 'TRUE' : 'FALSE'}**

${state.requiresTechnicalDepth ? `
**IMPORTANT: This is a TECHNICAL DEPTH query - user needs detailed analysis:**
- Provide comprehensive maintenance schedules and OEM recommendations
- Include specific part numbers, service intervals, common failure modes
- Add warnings, tips, and operational best practices
- Target length: 600-800 words minimum with exhaustive technical detail
- Use format: Executive Summary, Technical Specs, Operational Status, 
  MAINTENANCE ANALYSIS, OPERATIONAL RECOMMENDATIONS, REAL-WORLD SCENARIOS, Maritime Context
` : `
**This is an OVERVIEW query - user needs executive summary:**
- Target length: 400-500 words
- Use format: Executive Summary, Technical Specifications, Operational Status, 
  Technical Analysis, Maritime Context
`}`;

  const synthesisPrompt = `${MARITIME_SYSTEM_PROMPT}${contextAddition}
${state.researchContext}
${technicalDepthFlag}
**USER QUERY**: ${userQuery}
...`;
}
```

## Detection Examples

### Example 1: Simple Overview (No Technical Depth)
```
Query: "what is dynamic 17"
Detection:
  - Technical keywords: 0
  - Depth phrases: 0
  - Result: requiresTechnicalDepth = false, score = 0

Response:
  - Mode: verification (Gemini quick search)
  - Length: 400-500 words
  - Format: Executive summary, specs, operational status, analysis, context
  - Tone: Technical Director level
```

### Example 2: Technical Depth Required
```
Query: "ok tell me more details about the engines - maintenance, reports and specifics from real-world scenarios"
Detection:
  - Technical keywords: engines (1), maintenance (1), reports (1), specifics (1) = 4 keywords
  - Depth phrases: "more details" (1), "real-world scenarios" (1) = 2 phrases
  - Technical depth score: (4 keywords × 2) + (2 phrases × 4) = 8 + 8 = 16 → capped at 10
  - Result: requiresTechnicalDepth = true, score = 10

Response:
  - Mode: research (forced due to score >= 6 + entity context)
  - Length: 600-800+ words
  - Format: Executive summary, specs, operational status, 
            MAINTENANCE ANALYSIS, OPERATIONAL RECOMMENDATIONS, 
            REAL-WORLD SCENARIOS, context
  - Tone: Chief Engineer / Technical Superintendent level
  - Content: OEM intervals, failure modes, warnings, tips, case studies
```

### Example 3: Follow-up Technical Query
```
Query: "okay give me more information about maintenance"
Detection:
  - Follow-up pattern: ✅ starts with "okay give"
  - Contains "more": ✅
  - Technical keyword: "maintenance" = 1 keyword
  - Result: requiresTechnicalDepth = true (special case for follow-ups)

Response:
  - Detailed maintenance analysis
  - OEM recommendations
  - Service intervals
  - Best practices
```

## User-Facing Chain of Thought

When technical depth is detected, the UI shows:

```
🔄 State: follow_up → technical_inquiry
💡 Intent: technical_inquiry (92%)
🔬 Technical depth required (score: 10/10) - Detailed analysis
🔮 Deep research mode (technical depth)
🔍 Searching 20+ maritime databases...
✓ 15 sources found
📊 Extracting technical specifications...
✓ Maintenance analysis complete
```

## Benefits

### For Maritime Professionals
1. **Detailed Maintenance Data**: Get specific OEM intervals, part numbers, service procedures
2. **Real-World Experience**: Common failure modes, operational best practices, field-tested tips
3. **Actionable Insights**: Warning signs to watch for, troubleshooting steps, optimization techniques
4. **Comprehensive Coverage**: 600-800+ words of technical depth vs 400-word generic overviews

### For System Intelligence
1. **Context-Aware**: Understands when users want overview vs deep-dive
2. **Automatic Routing**: High technical depth (score >= 6) triggers deep research mode
3. **Vertical Expertise**: Acts as Chief Engineer for technical queries, Technical Director for overviews
4. **Fleetcore Integration**: Relates technical findings back to fleetcore PMS capabilities

## Future Enhancements

1. **Learning from Feedback**: Track which responses users find helpful to refine detection
2. **Domain-Specific Depth**: Different technical depth for engines vs navigation equipment
3. **Experience Level Adaptation**: Adjust detail based on user's expertise (junior vs senior engineer)
4. **Predictive Depth**: Anticipate follow-up technical queries based on conversation flow

## Testing Queries

Test the system with these queries to verify technical depth detection:

### Should Trigger Technical Depth (score >= 6)
- ✅ "tell me more details about the engines - maintenance, reports and specifics"
- ✅ "give me OEM maintenance recommendations for each engine"
- ✅ "what are common failure modes and service intervals"
- ✅ "provide comprehensive maintenance analysis with real-world scenarios"
- ✅ "detailed technical specifications and troubleshooting procedures"

### Should NOT Trigger Technical Depth
- ❌ "what is dynamic 17"
- ❌ "who owns this vessel"
- ❌ "where is the vessel now"
- ❌ "tell me about the company"

## Conclusion

The technical depth detection system transforms the agent from a generic information provider into a true vertical maritime expert that understands the difference between:

- **Strategic Executive Briefing** (400-500 words, high-level)
- **Hands-On Technical Analysis** (600-800+ words, exhaustive detail)

This ensures maritime professionals get the exact level of detail they need, when they need it, without having to explicitly request "deep research mode."

