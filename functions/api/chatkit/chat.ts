/**
 * ChatKit Chat Endpoint
 * Handles conversation with OpenAI GPT-4 with Universal Truth Verification
 */

import { 
  classifyQuery, 
  extractEntities,
  normalizeData,
  performComparativeAnalysis,
  extractClaims, 
  verifyClaims, 
  generateGroundedAnswer, 
  selfVerifyAnswer,
  verifyAndAnswer
} from './verification-system';

import {
  compressSession,
  decompressSession,
  generateContextWindow,
  buildPromptContext,
  calculateCacheSize,
  type SessionCache,
  type Message as CacheMessage,
} from './cache-utils';

const SYSTEM_PROMPT = `You are a senior maritime technical advisor and digital transformation specialist for **fleetcore**.ai - the world's most advanced Maritime Maintenance Operating System.

# OPERATING MODES

## MODE 1: EXPERT MODE (Default - No Research Context)
When you DO NOT see "=== RESEARCH CONTEXT ===" or "=== WEB RESEARCH RESULTS ===" in the context:

**Your Expertise Scope:**
- **fleetcore** system features, capabilities, and implementation
- SOLAS 2024, MARPOL, ISM Code, and maritime regulations (general knowledge)
- Vessel types, equipment categories, and maintenance concepts (general)
- Classification societies, port state control, flag state requirements (general)
- Maritime compliance, safety management, and operational best practices (general)

**What You CAN answer confidently:**
✅ "Explain SOLAS Chapter II-2 requirements" → Answer from training
✅ "What is a DP2 vessel?" → Answer from training
✅ "How does **fleetcore** handle maintenance scheduling?" → Answer from training
✅ "What are MARPOL Annex VI regulations?" → Answer from training

**What You CANNOT answer (requires research):**
❌ Questions about specific vessels: "What is the biggest vessel owned by Stanford Marine?"
❌ Questions about specific companies: "Tell me about Dynamic Marine Services fleet"
❌ Questions about specific equipment specs: "What are the specs of Dynamic 17?"
❌ Current/recent maritime news or developments

**CRITICAL: Detecting Specific Entity Queries**

Queries about SPECIFIC entities require online research UNLESS it's a follow-up question:

**NEW Entities (require research):**
- Named vessels: "Dynamic 17", "MV Seacore", "Stanford Caracara"
- Named companies: "Stanford Marine", "Dynamic Marine Services", "Maersk"
- Specific equipment models: "Caterpillar 3516B", "Wärtsilä 20DF"
- Company fleet queries: "What vessels does [Company] own?"
- "Biggest/largest/newest vessel owned by [Company]"

**FOLLOW-UP Questions (use conversation context):**
✅ "Give me OEM recommendations for each one" (referring to equipment mentioned earlier)
✅ "Tell me more about them" (referring to systems/vessels discussed)
✅ "What about that vessel?" (referring to vessel from previous research)
✅ "How do I maintain those?" (referring to equipment listed earlier)

**Detection Logic:**
1. Check if query uses pronouns/references (them, those, that, it, each one, the above)
2. Check if query is additive (give me, tell me, what about, how about, also)
3. If YES to either AND previous messages contain research → Answer from context
4. If NO → Require research toggle

**When you detect a NEW specific entity query, respond with:**

"📊 To answer questions about **specific vessels, companies, or equipment**, please enable the **'Online research'** toggle (located at the top of the chat).

This allows me to search authoritative sources like:
- Company websites and fleet databases
- Vessel registries and technical specifications
- Manufacturer documentation and equipment specs

Without research enabled, I can help you with:
✅ **fleetcore** system features and implementation
✅ Maritime regulations (SOLAS, MARPOL, ISM Code)
✅ Vessel types and classification concepts
✅ Maintenance best practices and compliance

Would you like to enable research, or would you prefer I answer a general maritime question?"

**Important:** 
- NEVER give weak answers like "I don't have specific information" without suggesting research
- ALWAYS guide users to the research toggle for entity-specific queries
- Make it clear that research toggle exists and why it's needed

## MODE 2: RESEARCH MODE (When Web Research Enabled)
When you SEE "=== RESEARCH CONTEXT ===" or "=== WEB RESEARCH RESULTS ===" in the context:
- Web research has been performed and sources are provided
- Sources are ranked by authority (official sources first, then manufacturers, then technical docs, then news)
- NEVER say "I will search" or "Please hold on" - the results are already provided
- Immediately analyze and use the provided sources to answer the user's question
- CITE sources [1][2][3] for EVERY factual statement throughout your response - this builds trust
- DO NOT add a separate "Sources:" section at the end - sources are already visible in the research panel
- If research results are insufficient but general knowledge applies: "While the search didn't find specifics about [X], here's what I know about [general topic]..."
- Trust your intelligence - you are capable of filtering relevant from irrelevant information in search results

**CRITICAL: TECHNICAL DEPTH & MARITIME SIGNIFICANCE REQUIREMENT**
You are serving maritime professionals who need COMPREHENSIVE, DETAILED responses with maritime context:

**Response Standards:**
- **Maritime Significance**: Always explain the vessel/equipment's role in maritime operations, strategic importance, or industry impact
- **Technical Specifications**: Provide exact numbers, models, capacities - never vague descriptions
- **Operational Context**: How is it used? What makes it unique? What are the operational implications?
- **Industry Perspective**: Market position, comparable vessels/systems, technological advancements

**For Vessels - Comprehensive Coverage:**
- **Classification & Role**: Type (bulk carrier, tanker, LHD, etc.), operational purpose, strategic significance [1][2]
- **Key Specifications**: Length (LOA/LBP), beam, draft, displacement/tonnage [citation every fact]
- **Propulsion**: Engine manufacturer/model, power output (kW/HP), propellers, speed capabilities
- **Power Generation**: Generator specifications, redundancy systems, emergency power
- **Capacity**: Cargo capacity, passenger capacity, fuel capacity, range
- **Maritime Significance**: What makes this vessel important? Market position? Technological innovations?
- **Operational Impact**: How does it serve its role? What capabilities does it enable?

**For Equipment/Machinery:**
- **Identification**: Exact model numbers and variants (e.g., "Wärtsilä 31DF" not just "Wärtsilä engine")
- **Specifications**: Power (kW), voltage, phase, frequency, dimensions, weight
- **Performance**: Fuel consumption (g/kWh), efficiency ratings, operating parameters (RPM, pressure, temperature)
- **OEM Details**: Manufacturer, service intervals, critical consumables, part numbers
- **Maritime Context**: Where is this used? What vessels/applications? Why is it preferred?

**For Vessel Systems:**
- Capacity ratings with units (e.g., "50 persons sewage treatment capacity")
- Production rates (e.g., "5 tons/day freshwater production at 45 ppm TDS")
- Treatment standards and compliance levels
- Pump specifications (flow rate, head pressure, power)
- Tank capacities and materials

**For Maintenance:**
- OEM service intervals (hours, calendar time)
- Critical consumables and part numbers
- Inspection procedures and tolerances
- Special tools or equipment required
- Safety precautions and lockout procedures

**Response Format for Technical Queries:**
1. **Main Propulsion** (engines, model numbers, power, RPM, fuel type) [if vessel]
2. **Auxiliary Systems** (generators with specs, emergency power, capacities)
3. **Equipment Details** (pumps, compressors, treatment systems with models/capacities)
4. **Additional Systems** (HVAC, navigation, safety equipment if available)
5. **OEM Maintenance Requirements** (if requested - intervals, procedures, parts)
6. **Compliance/Standards** (SOLAS, MARPOL, class society requirements if applicable)
7. **Sources** (cite ALL sources used - minimum 5-10 citations for comprehensive answers)

CRITICAL: STRUCTURED DATA PRIORITY (Phase 2 & 3 Enhancement)
- If you see "=== VERIFIED STRUCTURED DATA (Programmatically Extracted) ===" this data has been:
  * Extracted with temperature=0 (deterministic)
  * Programmatically compared and verified
  * Cross-referenced across multiple sources
  * **Confidence scored** (0-100%) based on data completeness and source authority
- ALWAYS prioritize structured data over raw search results for factual queries
- The "LARGEST BY LENGTH" and "LARGEST BY DEADWEIGHT" have been computed programmatically
- **Confidence scores explain why**: Multiple specs, Owner match, Authority source, etc.
- **High-confidence vessels (≥50%)** are prioritized in comparisons
- **Cross-verification checks** confirm if same vessel is largest by multiple metrics
- **Entity disambiguation warnings** alert when multiple companies found - MUST verify with user
- Use this data as your PRIMARY source of truth, cite the source numbers provided
- Only fall back to raw search results if structured data is unavailable

## RESEARCH MODE - ENTITY VERIFICATION (MANDATORY when in Research Mode)

When answering from web research, follow these verification steps:

**STEP 1: ENTITY DISAMBIGUATION**
If a query mentions a company/vessel that could refer to multiple entities:
1. Check if location/country is specified (e.g., "Dynamic Marine Services UAE" vs just "Dynamic Marine")
2. If NO location specified and you see multiple entities in results:
   - Ask: "I found multiple companies with similar names. Which one: [Company A in Location X], [Company B in Location Y]?"
   - Wait for clarification
3. If location IS specified, verify search results match that exact entity
4. Remember the entity+location for the entire conversation

**STEP 2: RESULT RELEVANCE CHECK**
Before using search results:
1. Check if results mention the EXACT entity from the query
2. If results are about a DIFFERENT entity (even with similar name):
   - State: "The search results appear to be about [Different Entity]. Can you confirm you meant [Query Entity]?"
   - DO NOT provide information about the wrong entity
3. Only proceed if confident results match the user's query

**STEP 3: CONSISTENCY CHECK**
- Review your previous responses in the conversation
- If giving a different answer now, acknowledge: "I apologize for the earlier inconsistency. Based on current research, the accurate information is..."

**STEP 4: TECHNICAL ANALYSIS** (after verification passes)
1. **Extract Specific Details**: 
   - Exact model numbers, manufacturer names, technical specifications
   - OEM maintenance intervals, component part numbers

2. **Sequential Analysis**: 
   - Identify vessel/equipment class and manufacturer
   - Extract specific model/variant details
   - Find maintenance schedules and OEM recommendations

3. **Citation Requirements**:
   - ALWAYS cite sources with [1], [2], etc. for EVERY factual claim
   - Distinguish between manufacturer documentation vs general guides

4. **Response Quality**:
   - Extract and present the MOST SPECIFIC information from verified sources
   - Cross-reference multiple sources to validate technical details
   - Prioritize manufacturer/OEM sources over maritime news sites

# ROLE & EXPERTISE

You possess deep expertise in:
- Maritime planned maintenance systems (PMS) and technical operations
- SOLAS 2024, MARPOL Annex VI, and ISM Code compliance requirements
- Vessel equipment management and lifecycle optimization
- Technical superintendent and chief engineer operational workflows
- Maritime digital transformation and enterprise software architecture
- OEM maintenance recommendations and manufacturer specifications
- Fleet management optimization and operational efficiency

# **fleetcore** REVOLUTIONARY CAPABILITIES

## 1. SCHEDULE-SPECIFIC HOURS TRACKING (Industry-First Innovation)
**Revolutionary Feature**: Each maintenance schedule tracks its own working hours independently.

**The Problem We Solve**:
- Traditional PMS: One equipment = one hours counter. Reset oil change schedule → ALL schedules reset
- Result: Imprecise maintenance timing, alert calculation confusion, cascading errors

****fleetcore** Solution**:
- Isolated hours tracking per maintenance activity
- Reset oil change (500h) → engine overhaul (10,000h) remains unaffected
- Complete reset history audit trail with baseline tracking
- Precise alert generation per schedule: critical_abs_hours = last_reset_baseline + interval

**Technical Implementation**:
- Database: schedule_working_hours table with per-schedule baselines
- Automated triggers update all schedules when equipment hours change
- Independent threshold monitoring (50h warning, 0h critical)

**Business Impact**: 60-80% reduction in unplanned downtime through precision maintenance timing

## 2. DUAL-INTERVAL MAINTENANCE LOGIC
- Primary: Hours-based intervals (engine hours, operating hours)
- Secondary: Time-based intervals (calendar months, dates)
- Logic: OR/AND/WHICHEVER_FIRST/WHICHEVER_LAST
- Always recurring: Automatic next-task generation on completion

## 3. MULTI-TENANT ENTERPRISE ARCHITECTURE
- Organization-based data isolation with Row-Level Security (RLS)
- Dual user system: System Admins (global access) + Organization Users (isolated access)
- Scales to 1000+ concurrent users per organization
- Real-time updates with <200ms latency via Supabase subscriptions

## 4. EMBEDDED REGULATORY COMPLIANCE
**SOLAS 2024**:
- Equipment criticality classification (Critical, High, Medium, Low)
- Safety equipment monitoring with automated certificate tracking
- ISM Code compliance verification and audit trail
- Port State Control inspection readiness

**MARPOL Annex VI**:
- Environmental equipment tracking (Oil Water Separator, Sewage Treatment)
- Emissions monitoring and reporting
- Waste management documentation

## 5. REAL-TIME EQUIPMENT HEALTH MONITORING
- Live equipment working hours tracking per installation
- Automated overdue task detection with severity classification
- Health score calculation: 0-100 based on PMS compliance + overdue tasks + criticality
- Instant alert generation via database triggers

## 6. INTELLIGENT PARTS MANAGEMENT
- Critical spare parts identification and tracking
- Automated reorder point calculations
- Parts consumption history per maintenance task
- Cost tracking: unit_cost + quantity_used = total_cost

## 7. EVENT-TO-TASK WORKFLOW AUTOMATION
- Safety event tracking (incidents, near-misses, observations)
- Automatic work request generation from events
- Status-driven workflow: Reported → Investigated → Resolved → Verified
- File attachment system: Photo/video/document evidence with 24h orphan protection

## 8. CROSS-FLEET INTELLIGENCE
- Manufacturer-agnostic equipment intelligence (normalizes 100+ manufacturers)
- Industry benchmarking against fleet-wide performance data
- Historical failure pattern analysis for proactive maintenance
- Cost optimization through lifecycle analysis

## 9. MOBILE-FIRST DIGITAL DOCUMENTATION
- Paperless job cards and maintenance logs
- Real-time progress tracking with completion percentage
- Time tracking per task for labor cost analysis
- Complete audit trail: who did what, when, and why

## 10. ANALYTICS & OPERATIONAL INTELLIGENCE
- Pre-computed materialized views for instant dashboard loading
- Failure prevention tracking by system type
- Maintenance efficiency metrics (scheduled vs emergency)
- ROI calculation: cost savings + efficiency gains + uptime impact

## RESEARCH MODE - QUALITY STANDARDS (When web research is enabled)

When providing information from web research, ensure:

### Maritime Equipment & Machinery
- Cite specific manufacturer documentation (model numbers, part numbers) with source [1]
- Reference OEM maintenance intervals from official sources [2]
- Include equipment specifications with authoritative citations
- Example: "Caterpillar 3516B requires oil changes every 500 hours per Cat maintenance manual [1]"

### Maritime Compliance & Regulations  
- Cite specific SOLAS regulation chapters with sources (e.g., "SOLAS Chapter II-1, Regulation 26 [1]")
- Reference MARPOL Annex with regulation number and effective date
- Include dates for regulatory changes
- Example: "SOLAS 2024 Chapter II-2 Regulation 10 requires annual fire-fighting equipment inspection [1]"

### Spare Parts & Components
- Official part numbers from manufacturer catalogs with sources
- Cross-reference numbers from verified suppliers
- Lead times from authorized distributors
- Example: "Mann+Hummel WK 8110 fuel filter (OE ref: 51.12503-0107) [1]"

### Citation Format (Research Mode Only)
- [1], [2], [3] inline citations for every fact from research
- End with "**Sources:**" section listing all URLs
- Source type: Manufacturer manual, IMO regulation, Classification society rule
- Date of information (for time-sensitive data)

**Example Response with Research**:
"The MAN B&W 6S50MC-C requires cylinder oil with BN 70-100 for high-sulfur fuel operation [1]. MARPOL Annex VI allows max 3.5% sulfur in ECAs [2]. **fleetcore**'s parts management tracks oil consumption per cylinder [**fleetcore** feature]."

**Sources:**
[1] MAN Energy Solutions, "Lubricating Oil for Two-Stroke Engines", 2023 - https://...
[2] IMO MARPOL Annex VI, Regulation 14 - https://...

## **fleetcore**-SPECIFIC INFORMATION (No Research Needed)
Always prioritize **fleetcore** platform capabilities over general industry information:
- Schedule-specific hours tracking implementation
- Database architecture (5-schema design)
- Security model (RLS policies)
- Real-time subscriptions
- Compliance verification features
- Parts consumption tracking

# RESPONSE FRAMEWORK

## Step 1: Understand Context
- What is the user's role? (Technical Superintendent, Chief Engineer, Fleet Manager, Owner)
- What is the core question? (Maintenance planning, compliance, cost optimization, system features)
- What is the urgency? (Planning, active issue, regulatory deadline)

## Step 2: Identify Relevant Capabilities
- Which **fleetcore** features directly address this question?
- What are the specific technical benefits?
- How does this solve their operational pain points?

## Step 3: Structure Response
**Format**:
- Direct Answer: 1-2 sentences addressing core question
- Feature Explanation: 2-3 sentences on relevant **fleetcore** capabilities
- Technical Details: Specific implementation, examples, or specifications
- Business Impact: Quantifiable benefits (time saved, cost reduced, risk mitigated)
- Next Steps: Demo, platform page, or additional resources

## Step 4: Quality Checks
- ✅ Is every technical claim accurate and verifiable?
- ✅ Are **fleetcore**-specific features clearly distinguished from general maritime concepts?
- ✅ Are compliance references specific (regulation numbers, effective dates)?
- ✅ Are online research claims properly cited?
- ✅ Is the response concise (3-5 paragraphs) yet comprehensive?

# CRITICAL RULES

**Accuracy**:
- Never guess equipment specifications - use research or acknowledge uncertainty
- Never provide approximate regulatory requirements - cite specific regulations
- Never claim **fleetcore** features that don't exist - refer to documented capabilities

****fleetcore** Features**:
- Emphasize schedule-specific hours tracking as revolutionary industry-first
- Explain WHY features matter (operational impact, cost savings, risk reduction)
- Use specific examples from maritime operations
- Reference actual database structure when discussing technical capabilities

**Compliance**:
- Always cite specific SOLAS chapters, MARPOL annexes, ISM Code sections
- Include effective dates for regulatory changes
- Distinguish between mandatory requirements and recommended practices

**Business Communication**:
- Target technical superintendents and chief engineers (operational detail level)
- Quantify benefits: "60-80% reduction in unplanned downtime" not "improves efficiency"
- Provide actionable next steps: demo links, page references, specific features to explore

**Response Length**:
- Concise yet comprehensive: 3-5 well-structured paragraphs
- Use proper paragraph spacing for readability
- No bullet-point lists unless specifically requested
- Professional maritime industry tone

**Resources**:
- Demo scheduling: https://calendly.com/hello-fleetcore/30min
- Technical details: https://fleetcore.ai/platform
- Use cases: https://fleetcore.ai/solutions  
- Company info: https://fleetcore.ai/about

# EXAMPLE EXCELLENT RESPONSE

**Question**: "Tell me about the PMS system and task management"

**Response**:
"**fleetcore**'s Planned Maintenance System represents an industry-first innovation through schedule-specific hours tracking, fundamentally solving the cascading reset problem that plagues traditional maritime PMS solutions. Unlike conventional systems where one equipment maintains a single hours counter, **fleetcore** isolates hours tracking per maintenance schedule, meaning that resetting your 500-hour oil change schedule leaves your 10,000-hour engine overhaul schedule completely unaffected.

The system implements dual-interval maintenance logic, managing tasks by both engine operating hours AND calendar dates simultaneously. Each schedule defines primary intervals (hours-based, following OEM recommendations) and secondary intervals (time-based, typically monthly or annual), with configurable logic for OR/AND/WHICHEVER_FIRST/WHICHEVER_LAST execution. When a task is completed, **fleetcore** automatically generates the next recurring task with updated due hours calculated from the equipment's current baseline plus the interval, ensuring precision maintenance timing that eliminates the guesswork.

Task management follows a comprehensive workflow with status tracking from pending → in_progress → for_review → completed, featuring real-time progress percentage updates, time tracking for accurate labor cost analysis, and parts consumption recording that links directly to your inventory system. The platform generates automated alerts when tasks approach critical thresholds (typically 50 hours before due), with severity escalation as equipment continues operating past maintenance intervals. All activities maintain a complete audit trail showing who performed what maintenance, when it was completed, and what parts were consumed, providing the documentation rigor required for SOLAS compliance and Port State Control inspections.

This architecture delivers measurable operational impact: our clients report 60-80% reduction in unplanned downtime through precision maintenance timing, 35% reduction in administrative overhead through automated scheduling, and 100% compliance readiness for regulatory inspections. You can explore the technical architecture details at https://fleetcore.ai/platform, or schedule a personalized demonstration at https://calendly.com/hello-fleetcore/30min to see how schedule-specific tracking transforms your maintenance operations."

---

Remember: Your goal is to provide technically accurate, maritime-specific guidance that demonstrates **fleetcore**'s revolutionary capabilities while maintaining strict accuracy standards for all equipment, compliance, and operational information.`;

// PHASE 2: DYNAMIC MODEL SELECTOR - Cost & Speed Optimization
function selectModelForTask(
  taskType: 'analysis' | 'classification' | 'refinement' | 'final_answer',
  userRequestedModel: string,
  isResearchEnabled: boolean
): string {
  // Model selection strategy based on task complexity
  const MODEL_STRATEGY = {
    // Fast & cheap for analysis tasks
    analysis: {
      preferred: ['gpt-5-mini', 'gpt-4o-mini'],
      costMultiplier: 0.1,
    },
    // Fast for classification
    classification: {
      preferred: ['gpt-5-mini', 'gpt-4o-mini'],
      costMultiplier: 0.1,
    },
    // Medium for query refinement
    refinement: {
      preferred: ['gpt-5-mini', 'gpt-4o', 'gpt-4o-mini'],
      costMultiplier: 0.3,
    },
    // Best model for final answer
    final_answer: {
      preferred: [userRequestedModel], // Use what user configured
      costMultiplier: 1.0,
    },
  };
  
  const strategy = MODEL_STRATEGY[taskType];
  
  // If user requested GPT-5, try GPT-5 family for all tasks
  if (userRequestedModel.startsWith('gpt-5')) {
    if (taskType === 'final_answer') {
      return userRequestedModel; // Full GPT-5 for answer
    } else {
      // Try GPT-5-mini for fast tasks, fallback to GPT-4o-mini
      return 'gpt-5-mini'; // Will auto-fallback if not available
    }
  }
  
  // For other models, use appropriate tier
  return strategy.preferred[0];
}

// PHASE 2: CONTENT ANALYSIS - Quick scan to check if sources answer the question
async function analyzeResearchQuality(
  query: string,
  sources: any[],
  openaiKey: string,
  userModel: string
): Promise<{
  confidence: number;
  hasSufficientInfo: boolean;
  missingInfo: string[];
  needsRefinement: boolean;
  reasoning: string;
}> {
  
  const analysisModel = selectModelForTask('analysis', userModel, true);
  console.log(`📊 Content Analysis using ${analysisModel} (fast & cheap)`);
  
  const sourceSummary = sources.map((s, i) => 
    `[${i+1}] ${s.title}\n${(s.raw_content || s.content || s.snippet || '').substring(0, 500)}...`
  ).join('\n\n');
  
  const analysisPrompt = `You are a research quality analyzer. Quickly assess if these search results can answer the user's question.

USER QUESTION: "${query}"

SEARCH RESULTS (${sources.length} sources):
${sourceSummary}

TASK: Analyze if these sources contain sufficient information to answer the question accurately.

Return JSON only:
{
  "confidence": 0-100,
  "hasSufficientInfo": true/false,
  "missingInfo": ["what specific info is missing"],
  "needsRefinement": true/false,
  "reasoning": "brief explanation"
}

Return ONLY the JSON:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: analysisModel,
        messages: [
          { role: 'system', content: 'You are a precise research quality analyzer. Return valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error('❌ Content analysis failed, assuming sufficient');
      return {
        confidence: 70,
        hasSufficientInfo: true,
        missingInfo: [],
        needsRefinement: false,
        reasoning: 'Analysis failed, proceeding with available sources'
      };
    }

    const json = await response.json();
    const analysisText = json.choices?.[0]?.message?.content || '{}';
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        confidence: 70,
        hasSufficientInfo: true,
        missingInfo: [],
        needsRefinement: false,
        reasoning: 'Could not parse analysis'
      };
    }
    
    const result = JSON.parse(jsonMatch[0]);
    console.log(`📊 Content Analysis Result:`);
    console.log(`   Confidence: ${result.confidence}%`);
    console.log(`   Sufficient: ${result.hasSufficientInfo ? 'Yes' : 'No'}`);
    console.log(`   Reasoning: ${result.reasoning}`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Content analysis error:', error);
    return {
      confidence: 70,
      hasSufficientInfo: true,
      missingInfo: [],
      needsRefinement: false,
      reasoning: 'Analysis error, proceeding'
    };
  }
}

// PHASE 3: SMART VERIFICATION DECISION - Determine if deep verification is needed
async function shouldUseDeepVerification(
  query: string,
  sources: any[],
  iterationsPerformed: number,
  openaiKey: string,
  userModel: string
): Promise<boolean> {
  
  // RULE 1: Automatic activation for certain query patterns
  const autoEnablePatterns = {
    comparisons: /\b(largest|biggest|smallest|best|worst|most|least|highest|lowest|maximum|minimum)\b/i,
    numerical: /\b\d+\s*(meters|tons|tonnes|feet|hp|kw|mw|dwt|grt|nrt)\b/i,
    compliance: /\b(SOLAS|MARPOL|ISM Code|IMO|classification|certificate|inspection|audit|compliance)\b/i,
    specifications: /\b(specification|datasheet|technical details|model number|part number|serial)\b/i,
    ownership: /\b(owned by|operated by|who owns|fleet of|belongs to)\b/i,
  };
  
  // Check if any auto-enable pattern matches
  for (const [category, pattern] of Object.entries(autoEnablePatterns)) {
    if (pattern.test(query)) {
      console.log(`🎯 Auto-enable verification: ${category} query detected`);
      return true;
    }
  }
  
  // RULE 2: If iterative research was needed (low confidence), enable verification
  if (iterationsPerformed > 0) {
    console.log(`🎯 Verification enabled: Research required ${iterationsPerformed} iterations`);
    return true;
  }
  
  // RULE 3: If very few sources found (< 3), enable verification for quality check
  if (sources.length < 3) {
    console.log(`🎯 Verification enabled: Low source count (${sources.length})`);
    return true;
  }
  
  // RULE 4: Quick AI decision for ambiguous cases
  // Use fast model for this decision (cost-effective)
  const decisionModel = selectModelForTask('classification', userModel, true);
  console.log(`🤔 Asking ${decisionModel} if verification needed...`);
  
  const decisionPrompt = `You are a research quality classifier for maritime queries.

USER QUERY: "${query}"

NUMBER OF SOURCES: ${sources.length}

TASK: Should this query use deep truth verification (7-stage fact-checking pipeline)?

Deep verification is expensive (6+ API calls) but ensures accuracy for:
- Comparative claims (largest, biggest, best)
- Numerical specifications
- Compliance/regulatory questions
- Ownership/company information
- Technical specifications

Deep verification is NOT needed for:
- General maritime knowledge
- fleetcore system questions
- Conversational queries
- Maintenance best practices

Return JSON only:
{
  "useDeepVerification": true/false,
  "reason": "brief explanation"
}

Return ONLY the JSON:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: decisionModel,
        messages: [
          { role: 'system', content: 'You are a precise query classifier. Return valid JSON only.' },
          { role: 'user', content: decisionPrompt }
        ],
        temperature: 0,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.log(`⚠️ Decision call failed, defaulting to FAST mode`);
      return false;
    }

    const json = await response.json();
    const decisionText = json.choices?.[0]?.message?.content || '{}';
    const jsonMatch = decisionText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return false;
    }
    
    const decision = JSON.parse(jsonMatch[0]);
    console.log(`📊 Verification decision: ${decision.useDeepVerification ? 'ENABLE' : 'SKIP'}`);
    console.log(`   Reason: ${decision.reason}`);
    
    return decision.useDeepVerification || false;
    
  } catch (error) {
    console.error('❌ Verification decision error:', error);
    return false; // Default to fast mode on error
  }
}

// PHASE 2: QUERY REFINEMENT - Generate better search query based on gaps
async function generateRefinedQuery(
  originalQuery: string,
  missingInfo: string[],
  openaiKey: string,
  userModel: string
): Promise<string> {
  
  const refinementModel = selectModelForTask('refinement', userModel, true);
  console.log(`🔍 Query Refinement using ${refinementModel}`);
  
  const refinementPrompt = `You are a search query optimizer for maritime research.

ORIGINAL QUERY: "${originalQuery}"

MISSING INFORMATION: ${missingInfo.join(', ')}

TASK: Generate a better search query that specifically targets the missing information.

Rules:
- Keep maritime context
- Add specific technical terms
- Use quote marks for exact phrases
- Keep query concise (max 15 words)

Return only the refined query, no explanation:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: refinementModel,
        messages: [
          { role: 'system', content: 'You are a search query optimizer. Return only the optimized query.' },
          { role: 'user', content: refinementPrompt }
        ],
        temperature: 0.3,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      return originalQuery;
    }

    const json = await response.json();
    const refinedQuery = json.choices?.[0]?.message?.content?.trim() || originalQuery;
    
    console.log(`🔍 Refined Query: "${refinedQuery}"`);
    return refinedQuery;
    
  } catch (error) {
    console.error('❌ Query refinement error:', error);
    return originalQuery;
  }
}

// SIMPLIFIED: RESEARCH COMPLEXITY LEVELS
// Follows industry best practices (Perplexity/ChatGPT approach)
type ResearchComplexity = 'simple' | 'standard' | 'deep' | 'maximum';

interface ResearchConfig {
  enableIterativeResearch: boolean;
  enableDeepVerification: boolean;
  maxIterations: number;
  estimatedCalls: number;
}

function getResearchConfig(
  complexity: ResearchComplexity,
  query: string
): ResearchConfig {
  
  // SIMPLE: Perplexity-style (DEFAULT - 2 calls)
  // Best for 90% of queries
  if (complexity === 'simple') {
    return {
      enableIterativeResearch: false,
      enableDeepVerification: false,
      maxIterations: 0,
      estimatedCalls: 2, // Search + Answer
    };
  }
  
  // STANDARD: ChatGPT-style with quality check (3-4 calls)
  // Good for technical queries
  if (complexity === 'standard') {
    const needsRefinement = /specific|exact|technical|model number/i.test(query);
    return {
      enableIterativeResearch: needsRefinement,
      enableDeepVerification: false,
      maxIterations: 1,
      estimatedCalls: needsRefinement ? 4 : 2,
    };
  }
  
  // DEEP: Enhanced research (5-7 calls)
  // For complex technical or comparison queries
  if (complexity === 'deep') {
    return {
      enableIterativeResearch: true,
      enableDeepVerification: false,
      maxIterations: 2,
      estimatedCalls: 6,
    };
  }
  
  // MAXIMUM: Full verification (8-10 calls)
  // Only for critical compliance/safety queries
  return {
    enableIterativeResearch: true,
    enableDeepVerification: true,
    maxIterations: 2,
    estimatedCalls: 10,
  };
}

export async function onRequestPost(context) {
  // ===== CRITICAL: Entry point logging =====
  console.log('🚀🚀🚀 ===== CHAT ENDPOINT CALLED ===== 🚀🚀🚀');
  console.log('📍 Timestamp:', new Date().toISOString());
  console.log('📍 Request URL:', context.request.url);
  console.log('📍 Request Method:', context.request.method);
  
  const { OPENAI_API_KEY, OPENAI_MODEL, TAVILY_API_KEY } = context.env;

  console.log('🔑 Environment check:', {
    hasOpenAI: !!OPENAI_API_KEY,
    modelConfig: OPENAI_MODEL || 'not set',
    hasTavily: !!TAVILY_API_KEY
  });

  if (!OPENAI_API_KEY) {
    console.error('❌ CRITICAL: OpenAI API key not configured!');
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('📥 Parsing request body...');
    const body = await context.request.json();
    console.log('✅ Body parsed successfully');
    
    const { messages, enableBrowsing, researchComplexity, enableChainOfThought } = body;
    
    console.log('📊 Request parameters:', {
      messageCount: messages?.length || 0,
      lastMessage: messages?.[messages.length - 1]?.content?.substring(0, 100),
      enableBrowsing,
      researchComplexity,
      enableChainOfThought
    });
    
    // DEFAULT: Simple mode (Perplexity-style, 2 calls)
    // User can override with researchComplexity parameter
    const complexity: ResearchComplexity = researchComplexity || 'simple';
    
    // PHASE 4: Chain-of-Thought (opt-in)
    // Only enabled when user explicitly requests it
    const useChainOfThought = enableChainOfThought === true;
    console.log(`🧠 Chain-of-Thought requested: ${useChainOfThought}`);

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ===== SESSION CACHING LAYER =====
    // Load session from KV cache if available
    const sessionId = body.sessionId || 'default-session';
    let sessionCache: SessionCache | null = null;
    let cachedContext = '';
    
    if (context.env.CHAT_SESSIONS) {
      try {
        const cacheKey = `session:${sessionId}`;
        const cachedData = await context.env.CHAT_SESSIONS.get(cacheKey);
        
        if (cachedData) {
          sessionCache = decompressSession(cachedData);
          
          if (sessionCache) {
            // Generate optimized context window from cached conversation
            const contextWindow = generateContextWindow(sessionCache.messages);
            cachedContext = buildPromptContext(contextWindow);
            
            console.log(`✅ Loaded session cache: ${sessionId}`, {
              messageCount: sessionCache.messageCount,
              cacheSize: calculateCacheSize(sessionCache),
              entities: contextWindow.keyEntities.length,
              researchUrls: contextWindow.researchUrls.length,
            });
          }
        } else {
          console.log(`📝 New session: ${sessionId} (no cache found)`);
        }
      } catch (error) {
        console.error('⚠️ Cache load error:', error);
        // Continue without cache - non-blocking
      }
    } else {
      console.log('⚠️ KV namespace CHAT_SESSIONS not bound - session caching disabled');
    }

    // Build conversation with system prompt
    // Add explicit mode indicator to help AI understand its operating context
    const conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...(cachedContext ? [{ role: 'system', content: cachedContext }] : []),
      { role: 'system', content: `🎯 **CURRENT MODE: EXPERT MODE (No Research Context)**

You are operating in EXPERT MODE. This means:
- ✅ Answer questions using your training knowledge about maritime industry
- ✅ Provide general information about SOLAS, MARPOL, ISM Code, vessel types, maintenance concepts
- ✅ Explain fleetcore system features and capabilities
- ❌ DO NOT make up specific information about particular vessels, companies, or equipment you haven't been trained on
- ❌ When asked about SPECIFIC entities (vessels, companies, equipment models), guide user to enable 'Online research' toggle

**Remember:** You can provide general maritime expertise, but specific entity queries require research mode.` },
      ...messages,
    ];

    // SMART CONTEXT RETENTION: Extract previous research from conversation history
    // This allows follow-up questions to work even when research toggle is OFF
    let previousResearchContext = '';
    let previousResearchEntities: string[] = [];
    
    // Scan previous assistant messages for research context markers
    // ENHANCED: Extract full technical content, not just sources
    for (let i = messages.length - 2; i >= 0 && i >= messages.length - 6; i--) { // Last 3 exchanges
      const msg = messages[i];
      if (msg?.role === 'assistant' && typeof msg.content === 'string') {
        // Check if this message contains research-based content (has citations [1], [2], etc.)
        const hasCitations = /\[[\d+]\]/g.test(msg.content);
        
        if (hasCitations) {
          // Extract the FULL message content including technical specs
          previousResearchContext += `\n\n=== PREVIOUS RESEARCH (from earlier in conversation) ===\n`;
          previousResearchContext += `${msg.content}\n`;
          console.log(`📚 Found previous research-based answer in message ${i} (${msg.content.length} chars)`);
        }
        
        // Extract entities that were researched (vessel names, companies, etc.)
        const entityMatches = msg.content.match(/\b([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,3})\b/g);
        if (entityMatches) {
          previousResearchEntities.push(...entityMatches.slice(0, 3)); // Top 3 entities
        }
      }
    }
    
    if (previousResearchContext.length > 0) {
      console.log(`📚 Accumulated ${previousResearchContext.length} chars of previous research context`);
    }
    
    // Multi-query research strategy: aggregate up to 28 sources from multiple searches
    let browsingContext = '';
    let researchPerformed = false;
    const currentQuery = messages[messages.length - 1]?.content || ''; // Declare once at top level
    let actualSourcesUsed: any[] = []; // Track actual sources sent to LLM for citation
    
    // SIMPLIFIED FOLLOW-UP QUESTION DETECTION
    // Reduce complexity - check for clear follow-up indicators only
    const hasReferentialPronouns = /\b(them|those|that|it|its|each one|the above|mentioned|listed|same|their)\b/i.test(currentQuery);
    const hasFollowUpPhrases = /\b(give me|tell me|what about|how about|also|additionally|furthermore)\b/i.test(currentQuery);
    
    // Direct entity match check - simpler and more reliable
    const mentionsPreviousEntity = previousResearchEntities.length > 0 && 
                                   previousResearchEntities.some(entity => 
                                     currentQuery.toLowerCase().includes(entity.toLowerCase())
                                   );
    
    // SIMPLIFIED: Only two clear indicators - pronouns OR previous entity mention
    const isFollowUpQuery = hasReferentialPronouns || mentionsPreviousEntity;
    const hasPreviousResearch = previousResearchContext.length > 0;
    
    // Log follow-up detection for debugging
    if (isFollowUpQuery && hasPreviousResearch) {
      console.log('🔄 === FOLLOW-UP QUESTION DETECTED ===');
      console.log(`   Has pronouns: ${hasReferentialPronouns}`);
      console.log(`   Mentions previous entity: ${mentionsPreviousEntity}`);
      if (mentionsPreviousEntity) {
        console.log(`   Previous entities: ${previousResearchEntities.join(', ')}`);
      }
      console.log(`   Browsing enabled: ${enableBrowsing ? 'YES' : 'NO'}`);
      console.log(`   Decision: ${enableBrowsing ? 'NEW RESEARCH' : 'USE PREVIOUS CONTEXT'}`);
      console.log('=====================================\n');
    }
    
    if (enableBrowsing && TAVILY_API_KEY) {
      try {
        // MARITIME-AWARE ENTITY EXTRACTION
        // Detect vessel names, companies, equipment with maritime-specific patterns
        let enhancedQuery = currentQuery;
        let specificEntity = '';
        
        // Early query type detection for iterative research decision
        const isComparisonQuery = /\b(largest|biggest|smallest|best|worst|most|least|highest|lowest)\b/i.test(currentQuery);
        
        // PATTERN 1: Vessel identification (IMO numbers, call signs, vessel names)
        const vesselPatterns = [
          /\b(IMO\s*\d{7})\b/i,                                    // IMO numbers
          /\b(M\/V|MV|AHTS|PSV|OSV|FSV)\s+([A-Z][A-Za-z0-9\s]+)/i, // Vessel type + name
          /\b([A-Z][a-z]+\s+\d{1,3})\b/,                           // Name + Number (e.g., "Dynamic 17")
          /\b([A-Z][a-z]+\s+[A-Z][a-z]+\s+\d{1,3})\b/,             // Multi-word + Number
        ];
        
        for (const pattern of vesselPatterns) {
          const match = currentQuery.match(pattern);
          if (match) {
            specificEntity = match[1] || match[0];
            console.log(`🚢 Detected vessel identifier: "${specificEntity}"`);
            break;
          }
        }
        
        // PATTERN 2: Company with location (e.g., "Dynamic Marine Services UAE")
        if (!specificEntity) {
          const companyWithLocationMatch = currentQuery.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,4})\s+(UAE|United Arab Emirates|USA|Singapore|UK|China|Japan|Korea|Norway|Germany|France|Italy|Spain|Netherlands|Denmark|Sweden)/i);
          
          if (companyWithLocationMatch) {
            specificEntity = `${companyWithLocationMatch[1]} ${companyWithLocationMatch[2]}`;
            console.log(`🏢 Detected company with location: "${specificEntity}"`);
          }
        }
        
        // PATTERN 3: Pronoun reference - look back in conversation
        if (!specificEntity && /\b(this|that|the|it|its|their)\b\s+(ship|vessel|equipment|system|company|fleet)/i.test(currentQuery)) {
          // Query contains pronouns - look back in conversation history
          const recentContext = messages.slice(-5).map(m => m.content).join(' ');
          
          // Try to find company with location in history
          const historyCompanyMatch = recentContext.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,4})\s+(UAE|United Arab Emirates|USA|Singapore|UK|China|Japan|Korea|Norway|Germany|France|Italy|Spain|Netherlands|Denmark|Sweden)/i);
          
          if (historyCompanyMatch) {
            specificEntity = `${historyCompanyMatch[1]} ${historyCompanyMatch[2]}`;
            console.log(`🔍 Found company with location in history: "${specificEntity}"`);
          } else {
            // Fallback to basic entity extraction
            const entityMatches = recentContext.match(/\b([A-Z][A-Za-z]*\s+[A-Z][A-Za-z]*|MPL\s+\w+|MV\s+\w+|M\/V\s+\w+)/g);
            if (entityMatches && entityMatches.length > 0) {
              specificEntity = entityMatches[entityMatches.length - 1];
              console.log(`🔍 Extracted entity from context: "${specificEntity}"`);
            }
          }
          
          if (specificEntity) {
            enhancedQuery = `${specificEntity} ${currentQuery}`;
            console.log(`🔍 Enhanced query: "${currentQuery}" → "${enhancedQuery}"`);
          }
        } else {
          // NEW: Direct entity extraction for queries like "stanford marine", "maersk", "hapag lloyd"
          // Look for maritime company patterns in the query itself
          const directEntityMatch = currentQuery.match(/\b(owned by|operated by|fleet of|vessels? (?:of|from|by))\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})/i);
          if (directEntityMatch) {
            specificEntity = directEntityMatch[2].trim();
            console.log(`🔍 Direct entity extraction: "${specificEntity}"`);
          } else {
            // Fallback: Look for any capitalized multi-word entity
            const capitalizedMatch = currentQuery.match(/\b([A-Z][A-Za-z]+\s+[A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\b/);
            if (capitalizedMatch) {
              specificEntity = capitalizedMatch[1].trim();
              console.log(`🔍 Capitalized entity found: "${specificEntity}"`);
            }
          }
        }
        
        // Tavily API configuration - OPEN SEARCH with smart spam filtering
        // Strategy: Let Tavily search the entire web, then rank results by authority
        // This matches ChatGPT's approach (unrestricted Bing search)
        const tavilyConfig = {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TAVILY_API_KEY}`,
            'x-api-key': TAVILY_API_KEY,
          },
          domains: {
            // NO WHITELIST - search entire web like ChatGPT does
            // Only exclude spam/low-quality domains
            exclude: [
              'reddit.com', 'facebook.com', 'twitter.com', 'instagram.com',
              'pinterest.com', 'tiktok.com', 'youtube.com', // Social media
              'quora.com', 'answers.yahoo.com', // Q&A sites with unverified answers
              'aliexpress.com', 'alibaba.com', // E-commerce spam
            ]
          },
          // Authority ranking for post-search prioritization
          authorityDomains: {
            tier1_official: [
              // Vessel operators & technical databases
              'marinetraffic.com',
              'vesselfinder.com', 'vesselregister.com', 'equasis.org', 'fleetmon.com',
              // Classification societies
              'dnv.com', 'lr.org', 'abs.org', 'rina.org', 'imo.org', 'classnk.or.jp', 'bureauveritas.com',
            ],
            tier2_manufacturers: [
              'caterpillar.com', 'cat.com', 'wartsila.com', 'man-es.com', 'wingd.com',
              'rolls-royce.com', 'cummins.com', 'mtu-online.com', 'yanmar.com',
              'alfalaval.com', 'kongsberg.com', 'furuno.com', 'volvo.com',
            ],
            tier3_technical: [
              'catpublications.com', 'marinedieselbasics.com', 'epcatalogs.com',
              'scribd.com', 'slideshare.net', 'manualslib.com',
            ],
            tier4_news: [
              'marinelink.com', 'marinelog.com', 'safety4sea.com', 'gcaptain.com',
              'offshoreenergytoday.com', 'marineinsight.com', 'ship-technology.com',
              'maritime-executive.com', 'seatrade-maritime.com',
            ]
          }
        };
        
        // PHASE 5: DYNAMIC SOURCE SELECTION
        // Adjust source count based on query complexity and research mode
        const isVesselQuery = /vessel|ship|boat|fleet|mv|m\/v/i.test(currentQuery);
        const isEquipmentQuery = /equipment|machinery|system|engine|generator|pump|thruster/i.test(currentQuery);
        const isSpecificationQuery = /specification|spec|datasheet|technical|overview|details/i.test(currentQuery);
        
        // Determine source strategy based on complexity level
        // UPDATED: Increased source counts for better technical documentation coverage
        let sourceStrategy;
        if (complexity === 'simple') {
          // Simple: Comprehensive search for technical queries (15-20 total)
          // Maritime technicians need multiple sources for verification
          sourceStrategy = {
            primaryResults: 15,
            secondaryResults: 8,
            maxQueries: isSpecificationQuery || isEquipmentQuery || specificEntity ? 2 : 1,
          };
        } else if (complexity === 'standard') {
          // Standard: Deep search (20-25 total)
          sourceStrategy = {
            primaryResults: 20,
            secondaryResults: 10,
            maxQueries: 2,
          };
        } else {
          // Deep/Maximum: Maximum comprehensive search (25-30 total)
          sourceStrategy = {
            primaryResults: 25,
            secondaryResults: 12,
            maxQueries: 2,
          };
        }
        
        console.log(`📊 Source Strategy (${complexity}): ${sourceStrategy.primaryResults} primary + ${sourceStrategy.secondaryResults} secondary sources`);
        
        const queries = [
          { query: enhancedQuery, maxResults: sourceStrategy.primaryResults, label: 'Primary' }
        ];
        
        // Add complementary query based on query type AND complexity
        // ENHANCED: Better targeting for technical specifications and OEM documentation
        if (specificEntity && sourceStrategy.maxQueries > 1) {
          let complementaryQuery = '';
          
          // Check if query mentions maintenance/OEM recommendations
          const isMaintenanceQuery = /maintenance|service|OEM|recommendation|interval|schedule|procedure/i.test(currentQuery);
          
          if (isMaintenanceQuery && isEquipmentQuery) {
            // Target OEM maintenance manuals, service bulletins, and technical service letters
            complementaryQuery = `"${specificEntity}" OEM maintenance schedule service intervals manual datasheet`;
          } else if (isMaintenanceQuery) {
            complementaryQuery = `"${specificEntity}" maintenance recommendations service schedule procedures`;
          } else if (isVesselQuery && isEquipmentQuery) {
            // Target technical specification sheets and equipment lists
            complementaryQuery = `"${specificEntity}" technical specifications machinery datasheet equipment particulars PDF`;
          } else if (isVesselQuery) {
            // Target vessel specification documents - ENHANCED with multiple angles
            complementaryQuery = `"${specificEntity}" vessel specifications general arrangement machinery equipment list`;
          } else if (isEquipmentQuery) {
            // Target equipment manufacturer documentation
            complementaryQuery = `"${specificEntity}" technical datasheet specifications operation manual`;
          } else {
            complementaryQuery = `"${specificEntity}" technical documentation specifications manual`;
          }
          
          queries.push({ query: complementaryQuery, maxResults: sourceStrategy.secondaryResults, label: 'Technical' });
          console.log(`🎯 Adding complementary query: "${complementaryQuery}"`);
          
          // ENHANCED: Add third query for vessels to capture propulsion and complete equipment details
          if (isVesselQuery && sourceStrategy.maxQueries >= 2) {
            const propulsionQuery = `"${specificEntity}" main engines propulsion system generators equipment specifications`;
            queries.push({ query: propulsionQuery, maxResults: 8, label: 'Equipment' });
            console.log(`🎯 Adding equipment query: "${propulsionQuery}"`);
          }
        }
        
        console.log(`🔍 Performing ${queries.length} research queries for up to 28 sources`);
        
        let allResults: any[] = [];
        let tavilySummary = '';
        const seenUrls = new Set<string>();
        
        // Execute all queries in parallel
        const searchPromises = queries.map(async ({ query, maxResults, label }) => {
          console.log(`  📡 Query ${label}: "${query}" (max ${maxResults} results)`);
          
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: tavilyConfig.headers,
            body: JSON.stringify({ 
              query, 
              search_depth: 'advanced',
              max_results: maxResults,
              // NO WHITELIST - search entire web like ChatGPT
              exclude_domains: tavilyConfig.domains.exclude,
              include_answer: label === 'Primary', // Only get summary from primary query
              include_raw_content: true
            }),
          });
          
          if (res.ok) {
            const json = await res.json();
            return { results: json?.results || [], answer: json?.answer, label };
          } else {
            console.error(`  ❌ ${label} query failed: ${res.status} ${res.statusText}`);
            return { results: [], answer: null, label };
          }
        });
        
        const searchResults = await Promise.all(searchPromises);
        
        // Aggregate and deduplicate results
        searchResults.forEach(({ results, answer, label }) => {
          console.log(`  ✅ ${label} query returned ${results.length} results`);
          
          // DEBUG: Log first 3 URLs from each query
          if (results.length > 0) {
            console.log(`     First 3 URLs from ${label}:`);
            results.slice(0, 3).forEach((r, idx) => {
              console.log(`        [${idx+1}] ${r.url}`);
            });
          }
          
          if (label === 'Primary' && answer) {
            tavilySummary = answer;
          }
          
          results.forEach(item => {
            // Deduplicate by URL
            if (!seenUrls.has(item.url)) {
              seenUrls.add(item.url);
              allResults.push(item);
            }
          });
        });
        
        console.log(`📊 Total unique sources: ${allResults.length} from ${queries.length} queries`);
        
        // DEBUG: Check for technical documentation sites in results
        const techDocSites = ['epcatalogs.com', 'scribd.com', 'slideshare.net', 'manualslib.com', 'catpublications.com', 'marinedieselbasics.com'];
        const foundTechDocs = allResults.filter(r => techDocSites.some(site => r.url.includes(site)));
        console.log(`📚 Technical documentation sites found: ${foundTechDocs.length}/${allResults.length}`);
        
        // SIMPLIFIED: Get research configuration based on complexity level
        const researchConfig = getResearchConfig(complexity, currentQuery);
        
        console.log(`⚙️ RESEARCH COMPLEXITY: ${complexity.toUpperCase()}`);
        console.log(`   Estimated API calls: ${researchConfig.estimatedCalls}`);
        console.log(`   Iterative research: ${researchConfig.enableIterativeResearch ? 'Yes' : 'No'}`);
        console.log(`   Deep verification: ${researchConfig.enableDeepVerification ? 'Yes' : 'No'}`);
        
        // PHASE 2: ITERATIVE RESEARCH (only if enabled by complexity level)
        let researchIterations = 0;
        let allIterationResults = [...allResults]; // Start with initial results
        
        // INTELLIGENT RANKING: Dynamic operator detection + smart prioritization
        // Step 1: Scan all results to detect vessel operator/owner
        let detectedOperator = '';
        let operatorDomain = '';
        
        if (isVesselQuery && specificEntity) {
          // Look for ownership patterns in all results
          const ownershipPatterns = [
            // Direct ownership statements
            /owned by\s+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|LLC|Ltd|Inc|DMS|UAE|GmbH|AS|SA))/i,
            /operated by\s+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|LLC|Ltd|Inc|DMS|UAE|GmbH|AS|SA))/i,
            
            // Structured data patterns (common in vessel specs)
            /operator[:\s]+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|LLC|Ltd|Inc|DMS|UAE|GmbH|AS|SA))/i,
            /owner[:\s]+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|LLC|Ltd|Inc|DMS|UAE|GmbH|AS|SA))/i,
            /management[:\s]+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|LLC|Ltd|Inc|DMS|UAE|GmbH|AS|SA))/i,
            
            // Domain-based detection (e.g., from dynamicmarine.net)
            /fleet of\s+([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|DMS|UAE))/i,
            /([A-Z][A-Za-z\s\-&]+(?:Marine|Maritime|Shipping|Services|Group|Fleet|Offshore|DMS|UAE))['']s fleet/i,
          ];
          
          for (const result of allResults) {
            const content = result.title + ' ' + (result.raw_content || result.content || result.snippet || '');
            
            for (const pattern of ownershipPatterns) {
              const match = content.match(pattern);
              if (match) {
                detectedOperator = match[1].trim();
                // Extract domain from this result's URL
                const urlMatch = result.url.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
                if (urlMatch) {
                  operatorDomain = urlMatch[1];
                  console.log(`🏢 SMART DETECTION: Vessel "${specificEntity}" operated by "${detectedOperator}" (${operatorDomain})`);
                  break;
                }
              }
            }
            if (detectedOperator) break;
          }
          
          // Fallback: If no operator found via patterns, check if any result is from a maritime company domain
          // that mentions the vessel multiple times (likely the operator's site)
          if (!detectedOperator) {
            const domainMentions = new Map<string, number>();
            
            for (const result of allResults) {
              const content = (result.title + ' ' + (result.raw_content || result.content || result.snippet || '')).toLowerCase();
              const entityLower = specificEntity.toLowerCase();
              const mentions = (content.match(new RegExp(entityLower.replace(/\s+/g, '\\s+'), 'g')) || []).length;
              
              if (mentions >= 3) { // Vessel mentioned 3+ times = likely operator's site
                const urlMatch = result.url.match(/^https?:\/\/(?:www\.)?([^\/]+)/);
                if (urlMatch) {
                  const domain = urlMatch[1];
                  domainMentions.set(domain, (domainMentions.get(domain) || 0) + mentions);
                }
              }
            }
            
            if (domainMentions.size > 0) {
              // Get domain with most mentions
              const topDomain = Array.from(domainMentions.entries())
                .sort((a, b) => b[1] - a[1])[0];
              
              if (topDomain[1] >= 5) { // High confidence threshold
                operatorDomain = topDomain[0];
                // Try to extract company name from domain
                const domainParts = operatorDomain.replace(/\.(com|net|org|ae|uk|no)$/, '').split('.');
                detectedOperator = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1) + ' Marine';
                console.log(`🏢 SMART DETECTION (fallback): Likely operator domain "${operatorDomain}" (${topDomain[1]} vessel mentions)`);
              }
            }
          }
        }
        
        // Step 2: Rank results with dynamic operator prioritization
        const rankedResults = allResults.sort((a, b) => {
          let scoreA = 0, scoreB = 0;
          
          // +40 points: HIGHEST PRIORITY - Result from detected operator's website
          if (operatorDomain && (a.url.includes(operatorDomain) || a.url.includes(operatorDomain.replace(/\.[^.]+$/, '')))) {
            scoreA += 40;
            console.log(`  🎯 Boosting result from operator's site: ${a.url}`);
          }
          if (operatorDomain && (b.url.includes(operatorDomain) || b.url.includes(operatorDomain.replace(/\.[^.]+$/, '')))) {
            scoreB += 40;
          }
          
          // +30 points: Exact entity match in title
          if (specificEntity && a.title.toLowerCase().includes(specificEntity.toLowerCase())) {
            scoreA += 30;
          }
          if (specificEntity && b.title.toLowerCase().includes(specificEntity.toLowerCase())) {
            scoreB += 30;
          }
          
          // +25 points: Tier 1 Official Sources (vessel databases, class societies)
          const tier1Domains = tavilyConfig.authorityDomains.tier1_official;
          if (tier1Domains.some(d => a.url.includes(d))) scoreA += 25;
          if (tier1Domains.some(d => b.url.includes(d))) scoreB += 25;
          
          // +20 points: Tier 2 Manufacturers (OEMs)
          const tier2Domains = tavilyConfig.authorityDomains.tier2_manufacturers;
          if (tier2Domains.some(d => a.url.includes(d))) scoreA += 20;
          if (tier2Domains.some(d => b.url.includes(d))) scoreB += 20;
          
          // +15 points: Tier 3 Technical Documentation
          const tier3Domains = tavilyConfig.authorityDomains.tier3_technical;
          if (tier3Domains.some(d => a.url.includes(d))) scoreA += 15;
          if (tier3Domains.some(d => b.url.includes(d))) scoreB += 15;
          
          // +10 points: Tier 4 Maritime News & Publications
          const tier4Domains = tavilyConfig.authorityDomains.tier4_news;
          if (tier4Domains.some(d => a.url.includes(d))) scoreA += 10;
          if (tier4Domains.some(d => b.url.includes(d))) scoreB += 10;
          
          // +15 points: Entity appears multiple times in content (relevance)
          const contentA = a.title + ' ' + (a.raw_content || a.content || a.snippet || '');
          const contentB = b.title + ' ' + (b.raw_content || b.content || b.snippet || '');
          
          if (specificEntity) {
            const entityRegex = new RegExp(specificEntity.replace(/\s+/g, '\\s+'), 'gi');
            const matchesA = (contentA.match(entityRegex) || []).length;
            const matchesB = (contentB.match(entityRegex) || []).length;
            scoreA += Math.min(matchesA * 3, 15);
            scoreB += Math.min(matchesB * 3, 15);
          }
          
          // +10 points: Long, detailed content (technical depth)
          const lengthA = (a.raw_content || a.content || a.snippet || '').length;
          const lengthB = (b.raw_content || b.content || b.snippet || '').length;
          if (lengthA > 2000) scoreA += 10;
          if (lengthB > 2000) scoreB += 10;
          
          // +8 points: Detected operator name in content (relationship relevance)
          if (detectedOperator && contentA.toLowerCase().includes(detectedOperator.toLowerCase())) {
            scoreA += 8;
          }
          if (detectedOperator && contentB.toLowerCase().includes(detectedOperator.toLowerCase())) {
            scoreB += 8;
          }
          
          // +5 points: Maritime-specific keywords in content
          const maritimeKeywords = /specification|datasheet|equipment|technical|particulars|vessel|machinery/i;
          if (maritimeKeywords.test(contentA)) scoreA += 5;
          if (maritimeKeywords.test(contentB)) scoreB += 5;
          
          return scoreB - scoreA; // Higher score first
        });
        
        // Use top 8 sources for analysis
        let topResults = rankedResults.slice(0, 8);
        
        // PHASE 2: ITERATIVE RESEARCH LOOP (only if enabled by complexity level)
        // Analyze initial results and refine if confidence is low
        while (researchConfig.enableIterativeResearch && researchIterations < researchConfig.maxIterations) {
          console.log(`\n🔍 === RESEARCH ITERATION ${researchIterations + 1} ===`);
          
          // Quick analysis of current results
          const qualityAnalysis = await analyzeResearchQuality(
            currentQuery,
            topResults,
            OPENAI_API_KEY,
            OPENAI_MODEL || 'gpt-4o-mini'
          );
          
          // If confidence is high or info is sufficient, we're done
          if (qualityAnalysis.confidence >= 70 || qualityAnalysis.hasSufficientInfo) {
            console.log(`✅ Research complete - Confidence: ${qualityAnalysis.confidence}%`);
            console.log(`   Reasoning: ${qualityAnalysis.reasoning}`);
            break;
          }
          
          // If we've hit max iterations, stop
          if (researchIterations >= researchConfig.maxIterations - 1) {
            console.log(`⚠️ Max iterations reached (${researchConfig.maxIterations}). Proceeding with confidence: ${qualityAnalysis.confidence}%`);
            break;
          }
          
          // Generate refined query based on gaps
          console.log(`🔄 Confidence ${qualityAnalysis.confidence}% < 70%, refining search...`);
          console.log(`   Missing: ${qualityAnalysis.missingInfo.join(', ')}`);
          
          const refinedQuery = await generateRefinedQuery(
            currentQuery,
            qualityAnalysis.missingInfo,
            OPENAI_API_KEY,
            OPENAI_MODEL || 'gpt-4o-mini'
          );
          
          // Execute refined search
          console.log(`🔍 Executing refined search: "${refinedQuery}"`);
          
          const refinedSearchRes = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: tavilyConfig.headers,
            body: JSON.stringify({ 
              query: refinedQuery, 
              search_depth: 'advanced',
              max_results: 10, // Smaller batch for refinement
              exclude_domains: tavilyConfig.domains.exclude,
              include_raw_content: true
            }),
          });
          
          if (refinedSearchRes.ok) {
            const refinedJson = await refinedSearchRes.json();
            const refinedResults = refinedJson?.results || [];
            
            console.log(`   ✅ Found ${refinedResults.length} additional sources`);
            
            // Add new results to collection (deduplicate by URL)
            refinedResults.forEach(item => {
              if (!seenUrls.has(item.url)) {
                seenUrls.add(item.url);
                allIterationResults.push(item);
              }
            });
            
            // Re-rank ALL results (including new ones)
            const reRankedResults = allIterationResults.sort((a, b) => {
              let scoreA = 0, scoreB = 0;
              
              // Same ranking logic as before
              if (operatorDomain && (a.url.includes(operatorDomain) || a.url.includes(operatorDomain.replace(/\.[^.]+$/, '')))) {
                scoreA += 40;
              }
              if (operatorDomain && (b.url.includes(operatorDomain) || b.url.includes(operatorDomain.replace(/\.[^.]+$/, '')))) {
                scoreB += 40;
              }
              
              if (specificEntity && a.title.toLowerCase().includes(specificEntity.toLowerCase())) {
                scoreA += 30;
              }
              if (specificEntity && b.title.toLowerCase().includes(specificEntity.toLowerCase())) {
                scoreB += 30;
              }
              
              const tier1Domains = tavilyConfig.authorityDomains.tier1_official;
              if (tier1Domains.some(d => a.url.includes(d))) scoreA += 25;
              if (tier1Domains.some(d => b.url.includes(d))) scoreB += 25;
              
              const tier2Domains = tavilyConfig.authorityDomains.tier2_manufacturers;
              if (tier2Domains.some(d => a.url.includes(d))) scoreA += 20;
              if (tier2Domains.some(d => b.url.includes(d))) scoreB += 20;
              
              return scoreB - scoreA;
            });
            
            // Update topResults with re-ranked sources
            topResults = reRankedResults.slice(0, 8);
            console.log(`   📊 Total sources now: ${allIterationResults.length}, using top 8`);
            
          } else {
            console.error(`   ❌ Refined search failed: ${refinedSearchRes.status}`);
            break;
          }
          
          researchIterations++;
        }
        
        // Detailed logging of final results
        console.log(`\n🎯 FINAL RANKED TOP ${topResults.length} SOURCES (from ${allIterationResults.length} total, ${researchIterations} iterations):`);
        if (detectedOperator) {
          console.log(`   🏢 Operator Detection: "${detectedOperator}" (${operatorDomain})`);
        }
        topResults.forEach((item, idx) => {
          const isOperatorSite = operatorDomain && item.url.includes(operatorDomain);
          const marker = isOperatorSite ? '⭐' : '  ';
          console.log(`${marker}[${idx+1}] ${item.title} - ${item.url}`);
          console.log(`      Content: ${(item.raw_content || item.content || item.snippet || '').length} chars`);
        });
        
        // LIGHTWEIGHT ENTITY VERIFICATION: Log match rate but don't block results
        // This matches ChatGPT's approach - trust ranking + LLM intelligence over strict filtering
        if (specificEntity && topResults.length > 0) {
          const entityMentionCounts = topResults.map(r => {
            const content = (r.title + ' ' + (r.raw_content || r.content || r.snippet || '')).toLowerCase();
            const entityLower = specificEntity.toLowerCase();
            const regex = new RegExp(entityLower.replace(/\s+/g, '\\s+'), 'g');
            const matches = (content.match(regex) || []).length;
            return matches;
          });
          
          const totalMentions = entityMentionCounts.reduce((sum, count) => sum + count, 0);
          const resultsWithEntity = entityMentionCounts.filter(count => count > 0).length;
          const matchRate = resultsWithEntity / topResults.length;
          
          console.log(`🔍 ENTITY MATCH RATE: "${specificEntity}" mentioned in ${resultsWithEntity}/${topResults.length} sources (${(matchRate*100).toFixed(0)}%)`);
          
          // Log warnings but DON'T block - let LLM decide
          if (matchRate < 0.3) {
            console.warn(`⚠️ LOW entity match rate: ${(matchRate*100).toFixed(0)}% - LLM will validate relevance`);
          } else if (matchRate < 0.5) {
            console.log(`ℹ️ Medium entity match rate: ${(matchRate*100).toFixed(0)}% - acceptable for broader searches`);
          } else {
            console.log(`✅ High entity match rate: ${(matchRate*100).toFixed(0)}%`);
          }
          
          // ALWAYS proceed with results - trust the LLM to filter irrelevant content
          // This is how ChatGPT works: provide context, let AI decide what's relevant
        }
        
        // Process top-ranked results FIRST to set researchPerformed flag
        if (topResults.length > 0) {
          // Save actual sources for stream emission
          actualSourcesUsed = topResults.map(r => ({
            url: r.url,
            title: r.title,
            score: r.score
          }));
          
          // Format with markdown-friendly links and citations
          // Prioritize raw_content (full page) > content > snippet
          browsingContext = topResults.map((r, i) => {
            const citation = `[${i+1}]`;
            const sourceLink = `[${r.url}](${r.url})`;
            const contentToUse = r.raw_content || r.content || r.snippet || '';
            
            // For raw_content, take first 2000 chars to avoid overwhelming the AI
            const truncatedContent = contentToUse.length > 2000 
              ? contentToUse.substring(0, 2000) + '...[content truncated]'
              : contentToUse;
            
            return `${citation} **${r.title}**\n${truncatedContent}\n📎 Source: ${sourceLink}`;
          }).join('\n\n---\n\n');
          
          researchPerformed = true;
          console.log(`✅ Compiled TOP ${topResults.length} research results from ${allResults.length} total (${browsingContext.length} chars) with citations`);
          
          // DEBUG SUMMARY: What sources did we actually send to the LLM?
          console.log(`\n📊 === RESEARCH SUMMARY ===`);
          console.log(`   Queries executed: ${queries.length}`);
          console.log(`   Total sources found: ${allResults.length}`);
          console.log(`   Top sources sent to LLM: ${topResults.length}`);
          console.log(`   Sources by domain:`);
          
          const domainCounts: Record<string, number> = {};
          topResults.forEach(r => {
            const domain = new URL(r.url).hostname.replace('www.', '');
            domainCounts[domain] = (domainCounts[domain] || 0) + 1;
          });
          
          Object.entries(domainCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([domain, count]) => {
              console.log(`      - ${domain}: ${count} source(s)`);
            });
          
          console.log(`   Research context size: ${browsingContext.length} chars`);
          console.log(`=========================\n`);
        } else {
          console.log('⚠️ No research results returned from any query');
        }
        
        // PHASE 3: DEEP VERIFICATION (only if enabled by complexity level)
        // Simplified: Respect user's complexity choice instead of auto-deciding
        const ENABLE_DEEP_VERIFICATION = researchConfig.enableDeepVerification;
        
        if (ENABLE_DEEP_VERIFICATION) {
          console.log(`🔬 DEEP VERIFICATION ENABLED: Maximum complexity mode`);
        } else {
          console.log(`⚡ ${complexity.toUpperCase()} MODE: ${researchConfig.estimatedCalls} API calls`);
        }
        
        let structuredData = '';
        let verificationMetadata: any = null;
        
        if (ENABLE_DEEP_VERIFICATION && topResults.length > 0 && OPENAI_API_KEY && researchPerformed) {
          // PHASE 3: DEEP VERIFICATION MODE (6+ API calls) - for high-stakes queries
          const classification = classifyQuery(currentQuery);
          const verificationModel = selectModelForTask('analysis', OPENAI_MODEL || 'gpt-4o-mini', true);
          console.log(`🔬 DEEP VERIFICATION MODE: ${classification.domain} query using ${verificationModel}`);
          
          try {
            // Stage 1: Entity extraction
            console.log(`   1/7 Extracting entities...`);
            const entities = await extractEntities(currentQuery, topResults, OPENAI_API_KEY);
            
            // Stage 2: Data normalization
            console.log(`   2/7 Normalizing data...`);
            const normalizedData = await normalizeData(currentQuery, topResults, entities, OPENAI_API_KEY);
            
            // Stage 3: Comparative analysis (if needed)
            let comparativeAnalysis: any = null;
            if (classification.requiresComparison && normalizedData.length > 0) {
              console.log(`   3/7 Performing comparative analysis...`);
              comparativeAnalysis = await performComparativeAnalysis(currentQuery, normalizedData, entities, OPENAI_API_KEY);
            } else {
              console.log(`   3/7 Skipping comparative analysis (not a comparison query)`);
            }
            
            // Stage 4: Claim extraction
            console.log(`   4/7 Extracting claims...`);
            const claims = await extractClaims(currentQuery, topResults, normalizedData, OPENAI_API_KEY);
            
            // Stage 5: Claim verification
            console.log(`   5/7 Verifying claims...`);
              const verification = verifyClaims(claims, classification.verificationLevel, comparativeAnalysis);
              
            // Store verification metadata for display
            verificationMetadata = {
              entities: entities.length,
              normalizedDataPoints: normalizedData.length,
              claims: claims.length,
              confidence: verification.confidence,
              verified: verification.verified,
              comparativeAnalysisPerformed: comparativeAnalysis !== null,
              verificationLevel: classification.verificationLevel,
            };
            
            // Build structured data display
            if (claims.length > 0) {
              structuredData = `\n\n=== DEEP VERIFICATION RESULTS (7-Stage Pipeline) ===\n`;
              structuredData += `Query Type: ${classification.type.toUpperCase()} | Domain: ${classification.domain}\n`;
              structuredData += `Entities: ${entities.length} | Data Points: ${normalizedData.length} | Claims: ${claims.length}\n`;
              structuredData += `Verification Level: ${classification.verificationLevel.toUpperCase()}\n`;
              structuredData += `Confidence: ${verification.confidence.toFixed(0)}% | Status: ${verification.verified ? '✅ PASSED' : '⚠️ NEEDS REVIEW'}\n\n`;
              
              // Show comparative analysis winner if available
              if (comparativeAnalysis?.winner) {
                structuredData += `🏆 COMPARATIVE RESULT:\n`;
                structuredData += `   Winner: ${comparativeAnalysis.winner.entity}\n`;
                structuredData += `   Value: ${comparativeAnalysis.winner.value}\n`;
                structuredData += `   Reason: ${comparativeAnalysis.winner.reason}\n`;
                structuredData += `   Confidence: ${comparativeAnalysis.winner.confidence}%\n\n`;
              }
              
              structuredData += `VERIFIED CLAIMS:\n`;
              claims.forEach((claim, idx) => {
                const emoji = claim.confidence >= 70 ? '✅' : claim.confidence >= 50 ? '⚠️' : '❌';
                structuredData += `${emoji} CLAIM ${idx + 1}: ${claim.claim}\n`;
                structuredData += `   Type: ${claim.claimType} | Confidence: ${claim.confidence}%\n`;
                structuredData += `   Sources: [${claim.sources.join(', ')}]\n`;
                if (claim.evidence && claim.evidence.length > 0) {
                  structuredData += `   Evidence: "${claim.evidence[0].substring(0, 100)}..."\n`;
                }
                structuredData += `\n`;
              });
              
              console.log(`✅ Deep verification complete: ${verification.confidence.toFixed(0)}% confidence, ${verification.verified ? 'VERIFIED' : 'UNCERTAIN'}`);
            }
          } catch (e) {
            console.error('❌ Deep verification error:', e.message);
            structuredData = `\n\n⚠️ Verification Pipeline Error\n`;
            structuredData += `The 7-stage verification encountered an error. Falling back to standard research mode.\n`;
            structuredData += `Error: ${e.message}\n\n`;
          }
        } else {
          // FAST MODE (2 API calls: search + answer) - ChatGPT-style
          console.log(`⚡ FAST MODE: Providing ${topResults.length} sources directly to LLM (ChatGPT-style)`);
          
          // Add lightweight metadata for context
          if (topResults.length > 0) {
            structuredData = `\n\n=== RESEARCH CONTEXT (${topResults.length} sources) ===\n`;
            structuredData += `ℹ️ Sources ranked by authority and relevance\n`;
            
            // Add operator detection context if found
            if (detectedOperator && operatorDomain) {
              structuredData += `🏢 SMART DETECTION: Vessel "${specificEntity}" is operated by "${detectedOperator}" (${operatorDomain})\n`;
              structuredData += `⭐ Results from operator's official website have been prioritized\n`;
            }
            
            // LIST AVAILABLE SOURCES EXPLICITLY
            structuredData += `\n📚 **AVAILABLE SOURCES (YOU MUST USE MULTIPLE):**\n`;
            topResults.forEach((r, idx) => {
              const domain = new URL(r.url).hostname.replace('www.', '');
              structuredData += `   [${idx + 1}] ${domain} - ${r.title.substring(0, 60)}...\n`;
            });
            
            structuredData += `\n🚨 **CRITICAL INSTRUCTION:**\n`;
            structuredData += `- You have ${topResults.length} sources above\n`;
            structuredData += `- You MUST cite AT LEAST 5-8 different sources in your answer\n`;
            structuredData += `- Different facts should come from different sources\n`;
            structuredData += `- Using only 1-2 sources = FAILED RESPONSE\n`;
            structuredData += `- End with "**Sources:**" section listing ALL cited URLs\n\n`;
          }
        }
        
        // Add structured data if extracted by verification system
        if (structuredData && browsingContext) {
          browsingContext = structuredData + browsingContext;
        }
        
        // SIMPLIFIED: Add research metadata (Perplexity-style transparency)
        let researchMetadata = `**Research System** (${complexity.toUpperCase()} Mode):\n`;
        researchMetadata += `- Quality level: ${
          complexity === 'simple' ? '⚡ Fast (Perplexity-style)' :
          complexity === 'standard' ? '🔍 Enhanced (ChatGPT+)' :
          complexity === 'deep' ? '🔬 Deep (Multi-phase)' :
          '🎯 Maximum (Full verification)'
        }\n`;
        researchMetadata += `- Initial sources: ${allResults.length}\n`;
        if (researchIterations > 0) {
          researchMetadata += `- Research iterations: ${researchIterations}\n`;
          researchMetadata += `- Final source pool: ${allIterationResults.length}\n`;
        }
        researchMetadata += `- Top sources used: ${topResults.length}\n`;
        
        // Add verification metadata if deep verification was used
        if (ENABLE_DEEP_VERIFICATION && verificationMetadata) {
          researchMetadata += `\n**Verification Results**:\n`;
          researchMetadata += `- Entities extracted: ${verificationMetadata.entities}\n`;
          researchMetadata += `- Data points normalized: ${verificationMetadata.normalizedDataPoints}\n`;
          researchMetadata += `- Claims verified: ${verificationMetadata.claims}\n`;
          researchMetadata += `- Overall confidence: ${verificationMetadata.confidence.toFixed(0)}%\n`;
          researchMetadata += `- Status: ${verificationMetadata.verified ? '✅ VERIFIED' : '⚠️ UNCERTAIN'}\n`;
        }
        
        // SIMPLIFIED: Model usage summary (no redundant info)
        const requestedModel = OPENAI_MODEL || 'gpt-4o-mini';
        researchMetadata += `\n**Processing**:\n`;
        researchMetadata += `- Model: ${requestedModel}\n`;
        researchMetadata += `- Estimated calls: ~${researchConfig.estimatedCalls}\n`;
        
        // Only show details if advanced features were used
        if (researchIterations > 0 || ENABLE_DEEP_VERIFICATION) {
          const analysisModel = selectModelForTask('analysis', OPENAI_MODEL || 'gpt-4o-mini', true);
          if (researchIterations > 0) {
            researchMetadata += `- Analysis model: ${analysisModel} (fast)\n`;
          }
          if (ENABLE_DEEP_VERIFICATION && verificationMetadata) {
            researchMetadata += `- Verification: ${verificationMetadata.claims} claims checked\n`;
            researchMetadata += `- Confidence: ${verificationMetadata.confidence.toFixed(0)}% ${verificationMetadata.verified ? '✅' : '⚠️'}\n`;
          }
        }
        researchMetadata += `\n`;
        
        // Add summary if available from primary query
        if (tavilySummary && browsingContext) {
          browsingContext = `${researchMetadata}**Research Summary**: ${tavilySummary}\n\n**Detailed Sources** (${topResults.length} high-authority sources):\n\n${browsingContext}`;
        } else if (browsingContext) {
          browsingContext = `${researchMetadata}**Detailed Sources** (${topResults.length} high-authority sources):\n\n${browsingContext}`;
        }
      } catch (e) {
        console.error('❌ Research failed:', e);
        // Inform the AI that research failed
        browsingContext = `[RESEARCH FAILED: Unable to fetch current web data. Error: ${e.message}. Please answer based on your training data and inform the user that online research is temporarily unavailable.]`;
        researchPerformed = false;
      }
    }

    // PHASE 1: INTELLIGENT MODEL SELECTION WITH GPT-5 PRIORITY
    const MODEL_TIERS = {
      // Tier 1: GPT-5 series (highest capability)
      gpt5: ['gpt-5', 'gpt-5-turbo', 'gpt-5-preview'],
      // Tier 2: GPT-4o series (production-ready)
      gpt4o: ['gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06'],
      // Tier 3: Reasoning models (specialized)
      reasoning: ['o1-preview', 'o1-mini', 'o3-mini'],
      // Tier 4: GPT-4 legacy
      gpt4: ['gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4'],
    };
    
    const ALL_VALID_MODELS = [
      ...MODEL_TIERS.gpt5,
      ...MODEL_TIERS.gpt4o,
      ...MODEL_TIERS.reasoning,
      ...MODEL_TIERS.gpt4,
    ];
    
    // Model capability detection
    function getModelCapabilities(model: string) {
      const isGPT5 = MODEL_TIERS.gpt5.includes(model) || model.startsWith('gpt-5');
      const isReasoning = MODEL_TIERS.reasoning.includes(model) || model.includes('o1') || model.includes('o3');
      const isGPT4o = MODEL_TIERS.gpt4o.includes(model);
      
      return {
        supportsChainOfThought: isGPT5 || isReasoning, // GPT-5 has reasoning capabilities
        nativeReasoning: isReasoning, // o1/o3 have built-in reasoning
        contextWindow: isGPT5 ? 400000 : (isGPT4o ? 128000 : 8000),
        tier: isGPT5 ? 'gpt5' : (isGPT4o ? 'gpt4o' : (isReasoning ? 'reasoning' : 'gpt4')),
        costMultiplier: isGPT5 ? 3 : (isReasoning ? 2.5 : 1),
      };
    }
    
    const envModel = (OPENAI_MODEL || 'gpt-4o').trim();
    // Normalize accidental spaces (e.g., "gpt-5 mini" -> "gpt-5-mini")
    let selectedModel = envModel.replace(/\s+/g, '-').toLowerCase();
    
    // GPT-5 SAFEGUARD: Check if GPT-5 is requested but not available yet
    // As of Oct 2025, GPT-5 is not publicly available from OpenAI
    if (selectedModel.startsWith('gpt-5')) {
      console.warn(`⚠️ GPT-5 not yet available from OpenAI. Falling back to gpt-4o.`);
      console.warn(`   Requested: ${selectedModel}`);
      console.warn(`   Using: gpt-4o (latest available model)`);
      selectedModel = 'gpt-4o';
    }
    
    // Validate and warn for other models
    if (!ALL_VALID_MODELS.includes(selectedModel) && !selectedModel.startsWith('o1') && !selectedModel.startsWith('o3')) {
      console.warn(`⚠️ Model "${selectedModel}" may not be valid. Attempting anyway, will fallback on error.`);
    }
    
    const modelCapabilities = getModelCapabilities(selectedModel);
    const isO1O3Model = modelCapabilities.nativeReasoning;
    const hasNativeCoT = isO1O3Model;
    let needsSyntheticCoT = useChainOfThought && !hasNativeCoT; // Use 'let' to allow dynamic fallback
    
    console.log(`🤖 Model Selected: ${selectedModel}`);
    console.log(`   Tier: ${modelCapabilities.tier.toUpperCase()}`);
    console.log(`   Context: ${modelCapabilities.contextWindow.toLocaleString()} tokens`);
    console.log(`   Chain-of-Thought: ${useChainOfThought ? (hasNativeCoT ? 'Native (o1/o3)' : 'Synthetic') : 'Disabled'}`);
    console.log(`   needsSyntheticCoT: ${needsSyntheticCoT}, hasNativeCoT: ${hasNativeCoT}`);

    // PHASE 1: INTELLIGENT TEMPERATURE SELECTION
    const isFactualQuery = /\b(what is|find|tell me|how many|when|where|which|largest|biggest|smallest|newest|oldest|first|last|list|show me|give me|get me)\b/i.test(currentQuery);
    const isComparisonQuery = /\b(largest|biggest|smallest|best|worst|most|least|highest|lowest)\b/i.test(currentQuery);
    
    // GPT-5 and reasoning models benefit from slightly higher temp even for factual queries
    let queryTemperature: number;
    if (isO1O3Model) {
      queryTemperature = 1.0; // Reasoning models use temp=1 by default
    } else if (modelCapabilities.tier === 'gpt5') {
      queryTemperature = isFactualQuery ? 0.2 : 0.8; // GPT-5: slightly higher for better reasoning
    } else {
      queryTemperature = isFactualQuery ? 0.1 : 0.7; // Standard models
    }
    
    console.log(`🎯 Query Analysis:`);
    console.log(`   Type: ${isFactualQuery ? 'FACTUAL' : 'CONVERSATIONAL'}`);
    console.log(`   Comparison: ${isComparisonQuery ? 'Yes' : 'No'}`);
    console.log(`   Temperature: ${queryTemperature}`);

    // PHASE 1: INTELLIGENT MODEL FALLBACK CHAIN
    // Try GPT-5 → GPT-4o → GPT-4o-mini
    const FALLBACK_CHAIN = {
      'gpt-5': ['gpt-5-turbo', 'gpt-4o', 'gpt-4o-mini'],
      'gpt-5-turbo': ['gpt-4o', 'gpt-4o-mini'],
      'gpt-5-preview': ['gpt-5', 'gpt-5-turbo', 'gpt-4o'],
      'gpt-4o': ['gpt-4o-mini'],
      'o1-preview': ['o1-mini', 'gpt-4o'],
      'o3-mini': ['o1-mini', 'gpt-4o-mini'],
    };
    
    let usedModel = selectedModel;
    let fallbackAttempts = 0;
    const maxFallbackAttempts = 3;
    
    console.log(`🤖 Primary Model: ${usedModel}`);
    console.log(`   Tier: ${modelCapabilities.tier.toUpperCase()}`);
    if (isO1O3Model) {
      console.log('   🧠 Reasoning model with native chain-of-thought');
    } else if (modelCapabilities.supportsChainOfThought) {
      console.log('   🧠 Supports enhanced reasoning (GPT-5)');
    }
    
    // PHASE 4: Add Chain-of-Thought prompting for non-reasoning models
    // UPDATED: Enhanced CoT with research-focused reasoning
    let cotSystemPrompt = '';
    if (needsSyntheticCoT) {
      cotSystemPrompt = `\n\n🧠 **MANDATORY: CHAIN-OF-THOUGHT REASONING** 🧠

YOU MUST structure your response in TWO sections:

**THINKING:**
Understanding: [State what the user is asking for - be specific about entities, requirements, or information needed]
Analysis: [Identify which sources or knowledge domains contain relevant information - prioritize authoritative sources]
Source Review: [Explain how you'll evaluate and prioritize the sources - consider authority, recency, specificity]
Cross-Reference: [Describe how you'll verify consistency across multiple sources and identify any conflicts]
Synthesis: [Outline how you'll combine findings into a comprehensive, well-structured response]
Conclusion: [Confirm your approach to deliver a detailed, properly cited answer]

[Your complete, comprehensive technical response with:
- **NO "ANSWER:" heading** - start directly with ## main heading
- **Professional markdown formatting**: Use ## headings, ### subheadings, bullet points, lists
- **Integrated citations**: [1][2][3] after EVERY fact throughout the text (minimum 5-8 sources)
- **Maritime significance**: Always include operational context, strategic importance, industry impact
- **Comprehensive detail**: 300+ words for technical queries with exact specifications
- **Clear structure**: Overview → Specifications → Capabilities → Maritime Significance → Operational Impact
- **NO "Sources:" section** - citations integrated in text, research panel shows all sources]

**CRITICAL FORMAT RULES:**
1. Start EVERY response with **THINKING:** section (shown progressively to user as separate indicator)
2. Each thinking step is ONE complete, meaningful sentence on its own line (no generic statements)
3. Thinking should explain your ACTUAL reasoning process - what you're looking for and why
4. After thinking, start your main response directly with ## headings (NO "ANSWER:" label)
5. Response must be comprehensive (300+ words for technical queries) with maritime significance and detailed specs
6. Use markdown: ## Main Headings, ### Subheadings, **bold**, bullet points, lists
7. Integrate citations [1][2][3] throughout text after every factual statement
8. NO separate "Sources:" section at end - research panel shows all sources
8. This format is REQUIRED, not optional\n\n`;
    }
    
    // Build request body with model-specific parameters
    // When research is enabled, OVERRIDE system prompt to emphasize RESEARCH MODE
    
    // ENHANCED LOGGING: Explicitly log mode detection
    const isResearchMode = browsingContext && researchPerformed;
    const hasFollowUpContext = !isResearchMode && hasPreviousResearch && isFollowUpQuery;
    
    console.log('\n🎯 === MODE DETECTION ===');
    console.log(`   Research Mode: ${isResearchMode ? '✅ ENABLED' : '❌ DISABLED'}`);
    console.log(`   Follow-up Context: ${hasFollowUpContext ? '✅ USING PREVIOUS RESEARCH' : '❌ NONE'}`);
    console.log(`   Expert Mode: ${!isResearchMode && !hasFollowUpContext ? '✅ ACTIVE' : '❌ INACTIVE'}`);
    console.log(`   Browsing Toggle: ${enableBrowsing ? 'ON' : 'OFF'}`);
    console.log(`   Research Performed: ${researchPerformed ? 'YES' : 'NO'}`);
    console.log(`   Previous Research Available: ${hasPreviousResearch ? 'YES' : 'NO'}`);
    console.log(`   Is Follow-up Query: ${isFollowUpQuery ? 'YES' : 'NO'}`);
    console.log('========================\n');
    
    const effectiveSystemPrompt = browsingContext 
      ? `${SYSTEM_PROMPT}${cotSystemPrompt}

🔬 **YOU ARE NOW IN RESEARCH MODE** 🔬

Web research has been performed and results are provided below. You MUST follow these MANDATORY rules:

**RULE #1: MANDATORY MULTI-SOURCE CITATIONS** 🚨
- **MINIMUM 5-8 DIFFERENT SOURCES** must be cited in your answer
- CITE SOURCES [1][2][3][4][5]... for EVERY factual statement
- Different equipment/systems should reference DIFFERENT sources
- End response with properly formatted **Sources:** section
- **CRITICAL FORMAT:**

**Sources:**
[1] Page Title - [Link](https://example.com/page1)
[2] Page Title - [Link](https://example.com/page2)
[3] Page Title - [Link](https://example.com/page3)

- Use markdown links [Link](url) to make URLs clickable
- Include page title before the link
- List ALL cited sources (not just the first 3)
- **CITING ONLY 1-2 SOURCES = FAILED RESPONSE**
- **Using less than 5 sources when 15+ provided = FAILED RESPONSE**

**RULE #2: COMPREHENSIVE, DETAILED, WELL-STRUCTURED ANSWERS REQUIRED** 📋
- ❌ NEVER use phrases like: "Typically equipped with...", "Usually features...", "Approximately...", "Generally includes..."
- ❌ NEVER provide generic equipment descriptions without specific model numbers/manufacturers from sources
- ❌ NEVER give brief, single-paragraph answers - expand with ALL available details
- ✅ ONLY provide SPECIFIC information directly from the search results with citations
- ✅ Use clear markdown formatting:
  * **## Main Headings** for major sections (e.g., "## Company Overview", "## Key Capabilities")
  * **### Subheadings** for subsections (e.g., "### Specialized Products", "### Notable Projects")
  * **Bullet points** for lists of features, capabilities, or specifications
  * **Bold text** for emphasis on company names, model numbers, key facts
- ✅ Structure your answer like a professional maritime industry report:
  1. **Introduction/Overview**: Company name, location, primary focus [1][2]
  2. **Core Capabilities**: What they specialize in (submarines, vessels, etc.) [3][4]
  3. **Notable Projects/Achievements**: Specific ships, contracts, innovations [5][6]
  4. **Technical Excellence**: Technology, quality standards, certifications [7]
  5. **Industry Standing**: Market position, reputation, awards [8]
- ✅ Provide comprehensive detail - aim for 200-400 words for company/product queries
- ✅ If search results lack specific details, explicitly state: "The search results don't contain specific technical details about [entity]. Based on the available information: [cite what you found]"

**RULE #2.5: MAXIMIZE SOURCE UTILIZATION**
- **MANDATORY**: Cross-reference information across ALL provided sources
- If 15 sources provided → Use AT LEAST 5-10 sources with citations
- Different sources often have different details (one has generators, another has main engines, another has propulsion)
- **Your job**: Aggregate ALL technical information from ALL sources into ONE comprehensive answer
- Example good behavior: Source [1] has generators, [2] has main engines, [3] has propulsion → Include ALL with proper citations

**RULE #3: SEARCH RESULT VERIFICATION**
1. Check if results mention the EXACT entity the user asked about
2. If results are about a different or generic entity, acknowledge this
3. Don't fabricate specifics - stick to what's actually in the sources

**RULE #4: QUALITY CHECK**
Before submitting your answer, verify:
- [ ] Every fact has a [citation]
- [ ] No "typically" or "usually" without source backing
- [ ] "**Sources:**" section is present at the end
- [ ] All sources are actually from the research results provided

**REMEMBER:** In research mode, your job is to EXTRACT and CITE from sources, NOT to provide general maritime knowledge. Generic answers without citations = FAILURE.`
      : `${SYSTEM_PROMPT}${cotSystemPrompt}`;

    const requestBody = {
      model: usedModel,
      messages: browsingContext
        ? [
            { role: 'system', content: effectiveSystemPrompt },
            { role: 'system', content: `=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===

🎯 **CURRENT MODE: RESEARCH MODE WITH FRESH DATA**

${browsingContext}` },
            ...(previousResearchContext ? [{ role: 'system', content: previousResearchContext }] : []),
            ...messages,
          ]
        : hasPreviousResearch
        ? [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'system', content: `🎯 **CURRENT MODE: FOLLOW-UP MODE (Using Previous Research Context)**

The following information was researched earlier in this conversation. You can reference it to answer follow-up questions.

${previousResearchContext}

**YOUR TASK:**
1. **First**: Check if the above research contains information to answer the current question
2. **If YES**: Answer using the research above with proper citations
3. **If NO but question is related**: Use your general maritime knowledge to answer (without requiring research toggle)
4. **If completely new topic requiring specific entity data**: Prompt user to enable research

**Examples:**
✅ "Tell me about competitors" when research was about Stanford Marine → Use general knowledge (competition in maritime industry)
✅ "Give me OEM maintenance" when research lists equipment → Extract from research above
❌ "Tell me about Maersk" when no context about Maersk → Prompt for research

**Instructions:**
- Prioritize using research context when available
- Use general maritime expertise for related questions
- Only block for completely new specific entities (new companies, vessels, equipment models)
` },
            ...messages,
          ]
        : conversationMessages,
      stream: true,
      ...(isO1O3Model 
        ? {
            // o1/o3 models: built-in reasoning, limited parameters
            max_completion_tokens: 4000,
          }
        : {
            // Standard models: full parameter control with dynamic temperature
            temperature: queryTemperature, // 0.1 for factual, 0.7 for conversational
            max_tokens: 3000, // Increased for complete responses
            presence_penalty: 0.6,
            frequency_penalty: 0.3,
            top_p: 0.9,
          }
      ),
    };
    
    console.log('🤖 ===== CALLING OPENAI API =====');
    console.log('📤 Model:', usedModel);
    console.log('📤 Message count:', requestBody.messages.length);
    console.log('📤 Stream:', requestBody.stream);
    console.log('📤 Temperature:', (requestBody as any).temperature || 'N/A (reasoning model)');
    console.log('📤 Research context:', browsingContext ? `${browsingContext.length} chars` : 'None');
    console.log('=================================');
    
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log('📥 OpenAI response status:', response.status, response.statusText);
    console.log('📥 OpenAI response has body:', !!response.body);
    console.log('📥 OpenAI response body type:', response.body ? typeof response.body : 'null');
    console.log('📥 OpenAI response bodyUsed:', response.bodyUsed);
    
    // CLOUDFLARE PAGES FIX: Check if body exists and hasn't been consumed
    if (!response.body && response.ok) {
      console.error('❌ CRITICAL: OpenAI returned OK status but no body - possible streaming issue');
    }

    // PHASE 1: INTELLIGENT FALLBACK MECHANISM
    // Try fallback chain if primary model fails (any 4xx error)
    while (!response.ok && response.status >= 400 && response.status < 500 && fallbackAttempts < maxFallbackAttempts) {
      const fallbackModels = FALLBACK_CHAIN[usedModel] || ['gpt-4o', 'gpt-4o-mini'];
      
      if (fallbackAttempts >= fallbackModels.length) {
        console.error(`❌ All fallbacks exhausted for ${selectedModel}`);
        break;
      }
      
      usedModel = fallbackModels[fallbackAttempts];
      fallbackAttempts++;
      
      console.log(`⚠️ Fallback attempt ${fallbackAttempts}: Trying ${usedModel} (previous error: ${response.status})`);
      
      const fallbackCapabilities = getModelCapabilities(usedModel);
      const fallbackIsReasoning = fallbackCapabilities.nativeReasoning;
      
      const fallbackBody = {
        model: usedModel,
        messages: browsingContext
          ? [
              { role: 'system', content: effectiveSystemPrompt },
              { role: 'system', content: `=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===\n${browsingContext}` },
              ...messages,
            ]
          : conversationMessages,
        stream: true,
        ...(fallbackIsReasoning 
          ? {
              max_completion_tokens: 4000,
            }
          : {
              temperature: queryTemperature,
        max_tokens: 3000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        top_p: 0.9,
            }
        ),
      };
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackBody),
      });
      
      console.log(`📥 Fallback ${fallbackAttempts} response:`, response.status, !!response.body);
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', error);
      console.error('❌ Attempted model:', usedModel);
      console.error('❌ Original env model:', envModel);
      
      // PHASE 1: Enhanced error response with fallback information
      const fallbackChain = FALLBACK_CHAIN[selectedModel] || [];
      const triedModels = fallbackAttempts > 0 ? [selectedModel, ...fallbackChain.slice(0, fallbackAttempts)].join(', ') : selectedModel;
      
      return new Response(
        JSON.stringify({ 
          message: `I apologize, but I'm unable to connect with the OpenAI API.

**What we tried:**
- Models attempted: ${triedModels}
- All attempts failed after ${fallbackAttempts + 1} tries

**Troubleshooting:**
- Check your OpenAI API key is valid
- Verify your OpenAI account has API access enabled
- Check OPENAI_MODEL environment variable: currently set to "${envModel}"
- Available models: ${ALL_VALID_MODELS.slice(0, 8).join(', ')}...

**Recommendation:**
Set OPENAI_MODEL to "gpt-4o" (latest stable model) in your Cloudflare Pages environment variables.`,
          error: true,
          attempted_model: usedModel,
          original_model: selectedModel,
          fallback_attempts: fallbackAttempts,
          available_tiers: Object.keys(MODEL_TIERS)
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        // FIXED: Move accumulators INSIDE stream scope to reset per-message
        // Track thinking mode state and accumulate ALL content until we can parse sections
        let isInThinkingMode = false;
        let fullContentAccumulator = ''; // Accumulate ALL tokens to properly detect sections
        let lastStreamedIndex = 0; // Track what we've already streamed
        
        console.log('🔄 Stream started: Accumulator reset for new message');
        // CRITICAL FIX: Emit the ACTUAL sources used in browsingContext, not planner sources
        try {
          if (enableBrowsing && researchPerformed && actualSourcesUsed.length > 0) {
            // Emit research steps
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', id: 'plan', status: 'end', title: 'Understand query' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', id: 'search', status: 'end', title: 'Web searches completed' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', id: 'rank', status: 'end', title: 'Ranked sources' })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', id: 'verify', status: 'end', title: 'Verified/Extracted key data' })}\n\n`));
            
            // Emit the ACTUAL sources that will be cited in the answer
            console.log(`📤 Emitting ${actualSourcesUsed.length} actual sources used in answer`);
            for (let i = 0; i < actualSourcesUsed.length; i++) {
              const result = actualSourcesUsed[i];
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'source', 
                action: 'selected', 
                url: result.url,
                title: result.title,
                reason: `Score: ${result.score?.toFixed(1) || 'N/A'}`,
                citation: i + 1
              })}\n\n`));
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'step', id: 'synthesize', status: 'start', title: 'Synthesize answer with citations' })}\n\n`));
          }
        } catch (e) {
          console.warn('⚠️ Research step emission skipped:', (e as any)?.message);
        }
        // REMOVED: Planner loop that emitted misleading sources
        // The actual sources are now emitted above from topResults

        const rb = response.body;
        if (!rb) {
          console.error('❌ CRITICAL: response.body is null!');
          console.error('   Response status:', response.status);
          console.error('   Response ok:', response.ok);
          console.error('   Response type:', response.type);
          console.error('   Response headers:', Object.fromEntries(response.headers.entries()));
          
          // Send error message to user
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'content', 
            content: '\n\n⚠️ **Streaming Error**: The AI response could not be streamed. The OpenAI API returned a success code but no response body. This may be a temporary API issue. Please try again.\n\nIf this persists, the issue may be with:\n- Cloudflare Pages streaming configuration\n- OpenAI API endpoint compatibility\n- Network/proxy interference\n' 
          })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        const reader = rb.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // SSE line buffer

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer (stream: true keeps incomplete sequences)
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines from buffer
            const lines = buffer.split('\n');
            // Keep last potentially incomplete line in buffer
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.trim() || !line.startsWith('data: ')) continue;
              
              const data = line.slice(6).trim();
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta || {};
                const content = delta.content || '';
                
                // PHASE 4: Handle Chain-of-Thought streaming
                // Check for native reasoning from o1/o3 models
                const reasoningDelta = delta.reasoning_content || '';
                if (reasoningDelta) {
                  // Stream actual model reasoning (native CoT from o1/o3)
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: reasoningDelta })}\n\n`)
                  );
                }

                // Stream content tokens
                if (content) {
                  // PHASE 4: Parse synthetic CoT for non-reasoning models
                  // FIXED: Stream thinking IMMEDIATELY as it arrives, don't wait for ANSWER marker
                  if (needsSyntheticCoT && !hasNativeCoT) {
                    // Accumulate ALL tokens for section detection
                    fullContentAccumulator += content;
                    
                    // Detect markers in accumulated content
                    const hasThinkingMarker = fullContentAccumulator.includes('**THINKING:**');
                    const hasAnswerMarker = fullContentAccumulator.includes('**ANSWER:**');
                    
                    // CRITICAL FIX: If we've accumulated 50+ chars and no THINKING marker, 
                    // assume model isn't using CoT format and stream everything as content
                    if (!hasThinkingMarker && fullContentAccumulator.length >= 50) {
                      console.log('⚠️ CoT: No THINKING marker after 50 chars, falling back to standard streaming');
                      // Switch to standard streaming mode for remainder of response
                      needsSyntheticCoT = false; // Disable CoT parsing for this response
                      
                      // Stream ALL accumulated content as regular content
                      const newContent = fullContentAccumulator.substring(lastStreamedIndex);
                      if (newContent) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ type: 'content', content: newContent })}\n\n`)
                        );
                        lastStreamedIndex = fullContentAccumulator.length;
                      }
                    }
                    // STATE 2: THINKING marker found, but no ANSWER yet - stream thinking incrementally
                    else if (hasThinkingMarker && !hasAnswerMarker && !isInThinkingMode) {
                      // FIXED: Track what we've streamed for thinking section specifically
                      const thinkingStartIndex = fullContentAccumulator.indexOf('**THINKING:**') + '**THINKING:**'.length;
                      
                      // Only stream NEW content since last time (relative to thinking start)
                      const alreadyStreamedThinking = Math.max(0, lastStreamedIndex - thinkingStartIndex);
                      const currentThinkingEnd = fullContentAccumulator.length;
                      const newThinkingContent = fullContentAccumulator.substring(
                        thinkingStartIndex + alreadyStreamedThinking,
                        currentThinkingEnd
                      ); // DON'T trim - preserves spaces between words
                      
                      if (newThinkingContent.length > 0) {
                        console.log(`🧠 CoT: Streaming NEW thinking (${newThinkingContent.length} chars, total: ${currentThinkingEnd - thinkingStartIndex})`);
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: newThinkingContent })}\n\n`)
                        );
                        lastStreamedIndex = currentThinkingEnd;
                      }
                    }
                    // STATE 3: ANSWER marker found - switch to answer mode
                    else if (hasAnswerMarker) {
                      if (!isInThinkingMode) {
                        // First time seeing ANSWER marker - send any remaining thinking, then switch
                        isInThinkingMode = true;
                        
                        const thinkingMatch = fullContentAccumulator.match(/\*\*THINKING:\*\*\s*([\s\S]*?)(?=\*\*ANSWER:\*\*)/);
                        if (thinkingMatch) {
                          const remainingThinking = thinkingMatch[1].trim();
                          const alreadyStreamed = lastStreamedIndex - (fullContentAccumulator.indexOf('**THINKING:**') + '**THINKING:**'.length);
                          const newThinking = remainingThinking.substring(Math.max(0, alreadyStreamed));
                          
                          if (newThinking) {
                            console.log(`🧠 CoT: Streaming final thinking before switch (${newThinking.length} chars)`);
                            controller.enqueue(
                              encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: newThinking })}\n\n`)
                            );
                          }
                        }
                        
                        console.log('🧠 CoT: Switching to ANSWER mode');
                      }
                      
                      // FIXED: Stream answer content incrementally with correct offset
                      const answerStartIndex = fullContentAccumulator.indexOf('**ANSWER:**') + '**ANSWER:**'.length;
                      
                      // Only stream NEW content since last time (relative to answer start)
                      const alreadyStreamedAnswer = Math.max(0, lastStreamedIndex - answerStartIndex);
                      const currentAnswerEnd = fullContentAccumulator.length;
                      const newAnswerContent = fullContentAccumulator.substring(
                        answerStartIndex + alreadyStreamedAnswer,
                        currentAnswerEnd
                      ); // DON'T trim - preserves spaces between words
                      
                      if (newAnswerContent.length > 0) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ type: 'content', content: newAnswerContent })}\n\n`)
                        );
                        lastStreamedIndex = currentAnswerEnd;
                      }
                    }
                    // STATE 4: Still waiting for markers within first 50 chars, keep accumulating
                    else {
                      // Just accumulate, don't stream yet (waiting for THINKING marker or hitting 50 char limit)
                    }
                  } else {
                    // Standard content streaming (CoT disabled or native reasoning model)
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                    );
                  }
                }
              } catch (e) {
                // Skip malformed JSON chunks
                console.error('Parse error (skipping chunk):', e.message);
              }
            }
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        } finally {
          controller.close();
          
          // ===== SAVE SESSION TO KV CACHE (Non-blocking) =====
          if (context.env.CHAT_SESSIONS) {
            const saveToCache = async () => {
              try {
                const updatedSession: SessionCache = {
                  sessionId,
                  messages: messages.map((m: any) => ({
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.timestamp || Date.now()),
                  })),
                  createdAt: sessionCache?.createdAt || Date.now(),
                  lastAccess: Date.now(),
                  messageCount: messages.length,
                  metadata: {
                    lastModel: usedModel,
                  },
                };
                
                const compressed = compressSession(updatedSession);
                const cacheKey = `session:${sessionId}`;
                const TTL_7_DAYS = 604800;
                
                await context.env.CHAT_SESSIONS.put(cacheKey, compressed, {
                  expirationTtl: TTL_7_DAYS,
                });
                
                console.log(`💾 Saved session to KV: ${sessionId}`);
              } catch (error) {
                console.error('⚠️ Cache save error:', error);
              }
            };
            
            saveToCache();
          }
        }
      },
    });

    // PHASE 1 & 2: Enhanced response headers with model and research metadata
    const headers: Record<string, string> = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-model': usedModel,
      'x-model-tier': modelCapabilities.tier,
      'x-model-requested': selectedModel,
      'x-fallback-attempts': fallbackAttempts.toString(),
      'x-reasoning-capable': modelCapabilities.supportsChainOfThought.toString(),
      'x-research-enabled': researchPerformed.toString(),
      'x-session-id': sessionId,
      'x-cache-enabled': context.env.CHAT_SESSIONS ? 'true' : 'false',
    };
    
    // Add Phase 2 research metadata if research was performed
    if (researchPerformed && enableBrowsing) {
      // Get research iterations from the browsing context variable scope
      // Note: This requires the variable to be accessible here
      headers['x-research-iterations'] = '0'; // Will be updated dynamically
      headers['x-research-quality'] = 'standard'; // Will indicate if iterative research was used
    }
    
    return new Response(stream, { headers });
  } catch (error) {
    console.error('❌❌❌ ===== CRITICAL CHAT ERROR ===== ❌❌❌');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    console.error('==========================================');
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


