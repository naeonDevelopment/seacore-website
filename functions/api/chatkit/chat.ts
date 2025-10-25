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

Queries about SPECIFIC entities require online research. These include:
- Named vessels: "Dynamic 17", "MV Seacore", "Stanford Buzzard"
- Named companies: "Stanford Marine", "Dynamic Marine Services", "Maersk"
- Specific equipment models: "Caterpillar 3516B", "Wärtsilä 20DF"
- Company fleet queries: "What vessels does [Company] own?"
- "Biggest/largest/newest vessel owned by [Company]"

**When you detect a specific entity query, respond with:**

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
- CITE sources [1][2][3] for EVERY factual statement - this builds trust
- End responses with "**Sources:**" section listing all cited URLs
- If research results are insufficient but general knowledge applies: "While the search didn't find specifics about [X], here's what I know about [general topic]..."
- Trust your intelligence - you are capable of filtering relevant from irrelevant information in search results

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
- Demo scheduling: https://calendly.com/fleetcore-ai/30min
- Technical details: https://fleetcore.ai/platform
- Use cases: https://fleetcore.ai/solutions  
- Company info: https://fleetcore.ai/about

# EXAMPLE EXCELLENT RESPONSE

**Question**: "Tell me about the PMS system and task management"

**Response**:
"**fleetcore**'s Planned Maintenance System represents an industry-first innovation through schedule-specific hours tracking, fundamentally solving the cascading reset problem that plagues traditional maritime PMS solutions. Unlike conventional systems where one equipment maintains a single hours counter, **fleetcore** isolates hours tracking per maintenance schedule, meaning that resetting your 500-hour oil change schedule leaves your 10,000-hour engine overhaul schedule completely unaffected.

The system implements dual-interval maintenance logic, managing tasks by both engine operating hours AND calendar dates simultaneously. Each schedule defines primary intervals (hours-based, following OEM recommendations) and secondary intervals (time-based, typically monthly or annual), with configurable logic for OR/AND/WHICHEVER_FIRST/WHICHEVER_LAST execution. When a task is completed, **fleetcore** automatically generates the next recurring task with updated due hours calculated from the equipment's current baseline plus the interval, ensuring precision maintenance timing that eliminates the guesswork.

Task management follows a comprehensive workflow with status tracking from pending → in_progress → for_review → completed, featuring real-time progress percentage updates, time tracking for accurate labor cost analysis, and parts consumption recording that links directly to your inventory system. The platform generates automated alerts when tasks approach critical thresholds (typically 50 hours before due), with severity escalation as equipment continues operating past maintenance intervals. All activities maintain a complete audit trail showing who performed what maintenance, when it was completed, and what parts were consumed, providing the documentation rigor required for SOLAS compliance and Port State Control inspections.

This architecture delivers measurable operational impact: our clients report 60-80% reduction in unplanned downtime through precision maintenance timing, 35% reduction in administrative overhead through automated scheduling, and 100% compliance readiness for regulatory inspections. You can explore the technical architecture details at https://fleetcore.ai/platform, or schedule a personalized demonstration at https://calendly.com/fleetcore-ai/30min to see how schedule-specific tracking transforms your maintenance operations."

---

Remember: Your goal is to provide technically accurate, maritime-specific guidance that demonstrates **fleetcore**'s revolutionary capabilities while maintaining strict accuracy standards for all equipment, compliance, and operational information.`;

export async function onRequestPost(context) {
  const { OPENAI_API_KEY, OPENAI_MODEL, TAVILY_API_KEY } = context.env;

  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'OpenAI API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await context.request.json();
    const { messages, enableBrowsing } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Invalid messages format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build conversation with system prompt
    const conversationMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    // Multi-query research strategy: aggregate up to 28 sources from multiple searches
    let browsingContext = '';
    let researchPerformed = false;
    if (enableBrowsing && TAVILY_API_KEY) {
      try {
        // MARITIME-AWARE ENTITY EXTRACTION
        // Detect vessel names, companies, equipment with maritime-specific patterns
        const currentQuery = messages[messages.length - 1]?.content || '';
        let enhancedQuery = currentQuery;
        let specificEntity = '';
        
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
        
        // MARITIME-OPTIMIZED QUERY STRATEGY
        // Detect query type and optimize search terms accordingly
        const isVesselQuery = /vessel|ship|boat|fleet|mv|m\/v/i.test(currentQuery);
        const isEquipmentQuery = /equipment|machinery|system|engine|generator|pump|thruster/i.test(currentQuery);
        const isSpecificationQuery = /specification|spec|datasheet|technical|overview|details/i.test(currentQuery);
        
        const queries = [
          { query: enhancedQuery, maxResults: 20, label: 'Primary' }
        ];
        
        // Add complementary query based on query type
        if (specificEntity) {
          let complementaryQuery = '';
          
          if (isVesselQuery && isEquipmentQuery) {
            // Query like "Dynamic 17 vessel equipment overview" - add specification focus
            complementaryQuery = `"${specificEntity}" technical specifications datasheet equipment list`;
          } else if (isVesselQuery) {
            // General vessel query - add vessel database terms
            complementaryQuery = `"${specificEntity}" vessel particulars specifications`;
          } else if (isEquipmentQuery) {
            // Equipment query - add OEM/manufacturer focus
            complementaryQuery = `"${specificEntity}" OEM maintenance manual specifications`;
          } else {
            // Generic entity query
            complementaryQuery = `"${specificEntity}" technical documentation specifications`;
          }
          
          queries.push({ query: complementaryQuery, maxResults: 10, label: 'Technical' });
          console.log(`🎯 Maritime-optimized complementary query: "${complementaryQuery}"`);
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
        
        // Use top 5-8 sources for verification (Perplexity-style)
        const topResults = rankedResults.slice(0, 8);
        
        // Detailed logging
        console.log(`🎯 RANKED TOP ${topResults.length} SOURCES (from ${allResults.length} total):`);
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
        } else {
          console.log('⚠️ No research results returned from any query');
        }
        
        // FAST MODE: Skip heavy verification pipeline (ChatGPT-style)
        // The multi-stage verification (6+ API calls) is only used for high-stakes queries
        // For most queries, we trust LLM intelligence with raw sources (2 API calls total)
        const ENABLE_DEEP_VERIFICATION = false; // Set to true for critical compliance/safety queries
        
        let structuredData = '';
        let verificationMetadata: any = null;
        
        if (ENABLE_DEEP_VERIFICATION && topResults.length > 0 && OPENAI_API_KEY && researchPerformed) {
          // DEEP VERIFICATION MODE (6+ API calls) - for high-stakes queries
          const classification = classifyQuery(currentQuery);
          console.log(`🔬 DEEP VERIFICATION MODE: ${classification.domain} query`);
          
          try {
            const entities = await extractEntities(currentQuery, topResults, OPENAI_API_KEY);
            const normalizedData = await normalizeData(currentQuery, topResults, entities, OPENAI_API_KEY);
            let comparativeAnalysis: any = null;
            
            if (classification.requiresComparison && normalizedData.length > 0) {
              comparativeAnalysis = await performComparativeAnalysis(currentQuery, normalizedData, entities, OPENAI_API_KEY);
            }
            
            const claims = await extractClaims(currentQuery, topResults, normalizedData, OPENAI_API_KEY);
            
            if (claims.length > 0) {
              const verification = verifyClaims(claims, classification.verificationLevel, comparativeAnalysis);
              
              structuredData = `\n\n=== DEEP VERIFICATION RESULTS ===\n`;
              structuredData += `Entities: ${entities.length} | Data Points: ${normalizedData.length} | Claims: ${claims.length}\n`;
              structuredData += `Confidence: ${verification.confidence.toFixed(0)}% | Status: ${verification.verified ? '✅ PASSED' : '⚠️ FAILED'}\n\n`;
              
              claims.forEach((claim, idx) => {
                const emoji = claim.confidence >= 70 ? '✅' : claim.confidence >= 50 ? '⚠️' : '❌';
                structuredData += `${emoji} CLAIM ${idx + 1}: ${claim.claim}\n`;
                structuredData += `   Confidence: ${claim.confidence}% | Sources: [${claim.sources.join(', ')}]\n\n`;
              });
              
              console.log(`✅ Deep verification: ${verification.confidence.toFixed(0)}% confidence`);
            }
          } catch (e) {
            console.error('❌ Deep verification error:', e.message);
            structuredData = `\n\n⚠️ Verification error - answering from raw sources\n\n`;
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
            
            structuredData += `ℹ️ Cite sources [1][2][3] for all factual statements\n`;
            structuredData += `ℹ️ End with "**Sources:**" section listing URLs\n\n`;
          }
        }
        
        // Add structured data if extracted by verification system
        if (structuredData && browsingContext) {
          browsingContext = structuredData + browsingContext;
        }
        
        // Add summary if available from primary query
        if (tavilySummary && browsingContext) {
          browsingContext = `**Research Summary**: ${tavilySummary}\n\n**Detailed Sources** (${topResults.length} high-authority sources from ${allResults.length} total):\n\n${browsingContext}`;
        }
      } catch (e) {
        console.error('❌ Research failed:', e);
        // Inform the AI that research failed
        browsingContext = `[RESEARCH FAILED: Unable to fetch current web data. Error: ${e.message}. Please answer based on your training data and inform the user that online research is temporarily unavailable.]`;
        researchPerformed = false;
      }
    }

    const DEFAULT_MODEL = 'gpt-4o-mini';
    
    // Known valid OpenAI models as of Oct 2025
    const VALID_MODELS = [
      // GPT-5 series (if available)
      'gpt-5', 'gpt-5-turbo', 'gpt-5-mini',
      // GPT-4o series
      'gpt-4o', 'gpt-4o-mini', 'gpt-4o-2024-08-06',
      // GPT-4 series
      'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-4', 
      'gpt-3.5-turbo', 'gpt-3.5-turbo-16k',
      // Reasoning models
      'o1-preview', 'o1-mini', 'o3-mini',
    ];
    
    const envModel = (OPENAI_MODEL || DEFAULT_MODEL).trim();
    // Normalize accidental spaces in model names (e.g., "gpt-5 mini" -> "gpt-5-mini")
    let selectedModel = envModel.replace(/\s+/g, '-');
    
    // Validate model and warn if invalid
    if (!VALID_MODELS.includes(selectedModel) && !selectedModel.startsWith('o1') && !selectedModel.startsWith('o3') && !selectedModel.startsWith('gpt-5')) {
      console.warn(`⚠️ Model "${selectedModel}" may not be valid. Attempting anyway, will fallback to ${DEFAULT_MODEL} on error.`);
    }
    
    // Detect if using reasoning-capable models (o1/o3 have built-in chain of thought)
    const isO1O3Model = selectedModel.includes('o1') || selectedModel.includes('o3');

    // PHASE 1 FIX: Detect factual queries to use deterministic temperature
    const currentQuery = messages[messages.length - 1]?.content || '';
    const isFactualQuery = /\b(what is|find|tell me|how many|when|where|which|largest|biggest|smallest|newest|oldest|first|last|list|show me|give me|get me)\b/i.test(currentQuery);
    const queryTemperature = isFactualQuery ? 0.1 : 0.7; // Low temp for facts, normal for conversation
    
    console.log(`🎯 Query type: ${isFactualQuery ? 'FACTUAL' : 'CONVERSATIONAL'} - Using temperature: ${queryTemperature}`);

    // Call OpenAI API with streaming enabled
    let usedModel = selectedModel;
    
    // Log model configuration
    console.log(`🤖 Using model: ${usedModel}`);
    if (isO1O3Model) {
      console.log('🧠 Using reasoning model (o1/o3) with built-in chain of thought');
    }
    
    // Build request body with model-specific parameters
    // When research is enabled, OVERRIDE system prompt to emphasize RESEARCH MODE
    const effectiveSystemPrompt = browsingContext 
      ? `${SYSTEM_PROMPT}

🔬 **YOU ARE NOW IN RESEARCH MODE** 🔬

Web research has been performed and results are provided below. You MUST follow these MANDATORY rules:

**RULE #1: MANDATORY SOURCE CITATIONS**
- CITE SOURCES [1][2][3] for EVERY factual statement
- End response with "**Sources:**" section listing ALL URLs with titles
- Format: **Sources:**
           [1] Page Title - https://example.com/page1
           [2] Page Title - https://example.com/page2
- **NO CITATIONS = FAILED RESPONSE**

**RULE #2: NO GENERIC ANSWERS ALLOWED**
- ❌ NEVER use phrases like: "Typically equipped with...", "Usually features...", "Approximately...", "Generally includes..."
- ❌ NEVER provide generic equipment descriptions without specific model numbers/manufacturers from sources
- ✅ ONLY provide SPECIFIC information directly from the search results with citations
- ✅ If search results lack specific details, explicitly state: "The search results don't contain specific technical details about [entity]. Based on the available information: [cite what you found]"

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
      : SYSTEM_PROMPT;

    const requestBody = {
      model: usedModel,
      messages: browsingContext
        ? [
            { role: 'system', content: effectiveSystemPrompt },
            { role: 'system', content: `=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===\n${browsingContext}` },
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
    
    let response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // If model is invalid (400), retry once with default cheaper model
    if (!response.ok && response.status === 400 && usedModel !== DEFAULT_MODEL) {
      console.log(`⚠️ Model "${usedModel}" failed, falling back to ${DEFAULT_MODEL}`);
      usedModel = DEFAULT_MODEL;
      
      const fallbackBody = {
        model: usedModel,
        messages: browsingContext
          ? [
              { role: 'system', content: effectiveSystemPrompt },
              { role: 'system', content: `=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===\n${browsingContext}` },
              ...messages,
            ]
          : conversationMessages,
        temperature: queryTemperature, // 0.1 for factual, 0.7 for conversational
        max_tokens: 3000,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
        top_p: 0.9,
        stream: true,
      };
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fallbackBody),
      });
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ OpenAI API error:', error);
      console.error('❌ Attempted model:', usedModel);
      console.error('❌ Original env model:', envModel);
      
      // Return a user-friendly error as a valid response (200) so the chat doesn't break
      return new Response(
        JSON.stringify({ 
          message: `I apologize, but I'm having trouble connecting with the "${usedModel}" model. Please check your OPENAI_MODEL environment variable or contact support. Valid models include: gpt-4o, gpt-4o-mini, gpt-4-turbo.`,
          error: true,
          attempted_model: usedModel,
          available_models: VALID_MODELS
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const rb = response.body;
        if (!rb) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }
        const reader = rb.getReader();
        const decoder = new TextDecoder();
        let buffer = ''; // Proper buffer to handle incomplete chunks

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
                
                // Check for native reasoning from o1/o3 models
                const reasoningDelta = delta.reasoning_content || '';
                if (reasoningDelta) {
                  // Stream actual model reasoning
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'thinking', content: reasoningDelta })}\n\n`)
                  );
                }

                // Stream content tokens
                if (content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ type: 'content', content })}\n\n`)
                  );
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
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'x-model': usedModel,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

