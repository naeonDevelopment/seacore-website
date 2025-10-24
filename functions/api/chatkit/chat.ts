/**
 * ChatKit Chat Endpoint
 * Handles conversation with OpenAI GPT-4 with Universal Truth Verification
 */

import { 
  classifyQuery, 
  extractClaims, 
  verifyClaims, 
  generateGroundedAnswer, 
  selfVerifyAnswer,
  verifyAndAnswer
} from './verification-system';

const SYSTEM_PROMPT = `You are a senior maritime technical advisor and digital transformation specialist for **fleetcore**.ai - the world's most advanced Maritime Maintenance Operating System.

CRITICAL INSTRUCTIONS ABOUT WEB RESEARCH:
1. When you see "=== WEB RESEARCH RESULTS ===" in your context, the search has ALREADY been performed
2. NEVER say "I will search" or "Please hold on while I find information" - the results are already provided
3. NEVER say "Searching..." or indicate you need to perform a search - just use the results
4. Immediately analyze and use the provided research results to answer the user's question
5. If research results are insufficient, state: "The search results don't contain specific information about [topic]. Based on general maritime knowledge..." and provide general guidance

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

IMPORTANT: When users have enabled "Online research", you MUST actively use the provided web research results to answer their questions with current, verified information. Never say "I cannot browse the web" when research results are available. Always utilize the research context provided.

CRITICAL - ONLINE RESEARCH BEHAVIOR & ENTITY VERIFICATION:

**STEP 1: ENTITY DISAMBIGUATION (MANDATORY)**
If a query mentions a company name that could refer to multiple entities:
1. Check if location/country is specified (e.g., "Dynamic Marine Services UAE" vs just "Dynamic Marine")
2. If NO location specified and multiple companies exist with similar names:
   - STOP and ask: "I found multiple companies with similar names. Which one do you mean: [Company A in Location X], [Company B in Location Y]?"
   - DO NOT attempt to answer until user clarifies
3. If location IS specified, verify search results match that exact company in that location
4. Remember the company+location for the entire conversation - use this context for follow-up questions

**STEP 2: SEARCH RESULT VERIFICATION (MANDATORY)**
Before using search results to answer:
1. Check if results mention the EXACT company name + location from the query
2. If results are about a DIFFERENT company (even with similar name):
   - State: "The search results appear to be about [Different Company/Location]. I need to verify you meant [Query Company]. Can you confirm?"
   - DO NOT provide information about the wrong company
3. Only proceed if results clearly match the company user asked about

**STEP 3: CONSISTENCY CHECK (MANDATORY)**
- Review your previous responses in the conversation
- If your new answer contradicts a previous answer, acknowledge this: "I apologize, my earlier response was inconsistent. Based on current research, the correct information is..."
- Never give different answers to the same question without acknowledgment

**STEP 4: TECHNICAL ANALYSIS** (only after Steps 1-3 pass)
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

# ONLINE RESEARCH REQUIREMENTS (When Web Research is Enabled)

When providing information from online research, you MUST:

## MARITIME EQUIPMENT & MACHINERY
**Required**:
- ✅ Cite specific manufacturer documentation (model numbers, part numbers)
- ✅ Reference OEM maintenance intervals with source
- ✅ Include equipment specifications from official sources
- ✅ Verify compatibility information from manufacturer websites

**Examples**:
- "Caterpillar 3516B requires oil changes every 500 hours per Cat maintenance manual section 7.2 [1]"
- "Wärtsilä 20DF uses spark plugs P/N 300-8262-0 with 8,000h replacement interval [2]"

**Never**:
- ❌ Generic maintenance advice without manufacturer verification
- ❌ Approximate intervals ("around 500 hours")
- ❌ Unverified compatibility claims

## MARITIME COMPLIANCE & REGULATIONS
**Required**:
- ✅ Cite specific SOLAS regulation chapters (e.g., "SOLAS Chapter II-1, Regulation 26")
- ✅ Reference MARPOL Annex with regulation number
- ✅ Include effective dates for regulatory changes
- ✅ Link to official IMO or classification society documents

**Examples**:
- "SOLAS 2024 Chapter II-2 Regulation 10 requires annual fire-fighting equipment inspection [1]"
- "MARPOL Annex VI Regulation 14 limits sulphur content to 0.50% m/m globally as of Jan 2020 [2]"

**Never**:
- ❌ Regulatory advice without official source citation
- ❌ Outdated compliance information
- ❌ Generalized "maritime law" statements

## SPARE PARTS & COMPONENTS
**Required**:
- ✅ Official part numbers from manufacturer catalogs
- ✅ Cross-reference numbers from verified suppliers
- ✅ Lead times from authorized distributors
- ✅ Technical specifications (dimensions, materials, certifications)

**Examples**:
- "Mann+Hummel WK 8110 fuel filter (OE ref: 51.12503-0107) - 7-10 day lead time via Wrist Ship Supply [1]"

**Never**:
- ❌ Generic "equivalent" parts without verification
- ❌ Pricing without source (prices vary by region/supplier)
- ❌ Availability claims without current verification

## CITATION FORMAT
Every researched fact MUST include:
- [1], [2], [3] inline citations
- Source type: Manufacturer manual, IMO regulation, Classification society rule
- Date of information (for time-sensitive data)

**Example Response with Research**:
"The MAN B&W 6S50MC-C requires cylinder oil with BN 70-100 for high-sulfur fuel operation [1]. MARPOL Annex VI allows max 3.5% sulfur in ECAs, requiring BN adjustment [2]. **fleetcore**'s parts management tracks oil consumption per cylinder, alerting when consumption exceeds 1.2g/kWh baseline [**fleetcore** feature]."

Citations:
[1] MAN Energy Solutions, "Lubricating Oil for Two-Stroke Engines", 2023
[2] IMO MARPOL Annex VI, Regulation 14, effective January 2020

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
        // Build context-aware search query by including relevant entities from recent conversation
        const currentQuery = messages[messages.length - 1]?.content || '';
        let enhancedQuery = currentQuery;
        let specificEntity = '';
        
        // Extract company/entity name with location if mentioned
        // Look for patterns like "Dynamic Marine Services UAE", "Company Name Country"
        const companyWithLocationMatch = currentQuery.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){1,4})\s+(UAE|United Arab Emirates|USA|Singapore|UK|China|Japan|Korea|Norway|Germany|France|Italy|Spain|Netherlands|Denmark|Sweden)/i);
        
        if (companyWithLocationMatch) {
          // Found company with location - use this for precise search
          specificEntity = `${companyWithLocationMatch[1]} ${companyWithLocationMatch[2]}`;
          console.log(`🔍 Detected company with location: "${specificEntity}"`);
        } else if (/\b(this|that|the|it|its|their)\b\s+(ship|vessel|equipment|system|company|fleet)/i.test(currentQuery)) {
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
        
        // Tavily API configuration
        const tavilyConfig = {
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TAVILY_API_KEY}`,
            'x-api-key': TAVILY_API_KEY,
          },
          domains: {
            include: [
              // Prioritize manufacturer & technical documentation sites
              'wingd.com', 'wartsila.com', 'man-es.com', 'rolls-royce.com',
              'alfalaval.com', 'kongsberg.com', 'dnv.com', 'lr.org', 'abs.org',
              'marinelink.com', 'marinelog.com', 'safety4sea.com',
              'gcaptain.com', 'offshoreenergytoday.com', 'marineinsight.com',
              'ship-technology.com', 'maritime-executive.com', 'seatrade-maritime.com'
            ],
            exclude: ['wikipedia.org', 'reddit.com']
          }
        };
        
        // Multi-query strategy to aggregate up to 28 sources (Tavily limit: 20 per query)
        const queries = [
          { query: enhancedQuery, maxResults: 20, label: 'Primary' }
        ];
        
        // Add complementary query if we have a specific entity (for deeper research)
        if (specificEntity) {
          // Second query focuses on technical specifications and OEM data
          const complementaryQuery = `${specificEntity} OEM maintenance specifications technical documentation`;
          queries.push({ query: complementaryQuery, maxResults: 8, label: 'Technical' });
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
              include_domains: tavilyConfig.domains.include,
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
        
        // UNIVERSAL VERIFICATION SYSTEM: Rank results by authority and relevance
        const rankedResults = allResults.sort((a, b) => {
          let scoreA = 0, scoreB = 0;
          
          // +20 points if title contains specific entity (exact match)
          if (specificEntity && a.title.toLowerCase().includes(specificEntity.toLowerCase())) {
            scoreA += 20;
          }
          if (specificEntity && b.title.toLowerCase().includes(specificEntity.toLowerCase())) {
            scoreB += 20;
          }
          
          // +15 points for HIGHLY authoritative domains (official sources, class societies)
          const highAuthorityDomains = [
            'imo.org', 'dnv.com', 'lr.org', 'abs.org', 'rina.org',
            'wartsila.com', 'man-es.com', 'wingd.com', 'rolls-royce.com', 'caterpillar.com',
          ];
          
          // +10 points for authoritative maritime domains (news, publications)
          const authoritativeDomains = [
            'marinelink.com', 'gcaptain.com', 'safety4sea.com',
            'maritime-executive.com', 'seatrade-maritime.com',
            'offshoreenergytoday.com', 'marinelog.com', 'ship-technology.com',
          ];
          
          if (highAuthorityDomains.some(d => a.url.includes(d))) scoreA += 15;
          if (highAuthorityDomains.some(d => b.url.includes(d))) scoreB += 15;
          if (authoritativeDomains.some(d => a.url.includes(d))) scoreA += 10;
          if (authoritativeDomains.some(d => b.url.includes(d))) scoreB += 10;
          
          const contentA = a.title + ' ' + (a.content || a.snippet || '');
          const contentB = b.title + ' ' + (b.content || b.snippet || '');
          
          // +10 points if entity appears in content multiple times (high relevance)
          if (specificEntity) {
            const entityRegex = new RegExp(specificEntity.replace(/\s+/g, '\\s+'), 'gi');
            const matchesA = (contentA.match(entityRegex) || []).length;
            const matchesB = (contentB.match(entityRegex) || []).length;
            scoreA += Math.min(matchesA * 3, 10);
            scoreB += Math.min(matchesB * 3, 10);
          }
          
          // +5 points for longer content (more detailed)
          const lengthA = (a.raw_content || a.content || a.snippet || '').length;
          const lengthB = (b.raw_content || b.content || b.snippet || '').length;
          if (lengthA > 2000) scoreA += 5;
          if (lengthB > 2000) scoreB += 5;
          
          return scoreB - scoreA; // Higher score first
        });
        
        // Use top 5-8 sources for verification (Perplexity-style)
        const topResults = rankedResults.slice(0, 8);
        
        // Detailed logging
        console.log(`🎯 RANKED TOP ${topResults.length} SOURCES (from ${allResults.length} total):`);
        topResults.forEach((item, idx) => {
          console.log(`  [${idx+1}] ${item.title} - ${item.url}`);
          console.log(`      Content: ${(item.raw_content || item.content || item.snippet || '').length} chars`);
        });
        
        // ENTITY VERIFICATION: Check if results actually match the query
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
          
          console.log(`🔍 ENTITY VERIFICATION: "${specificEntity}" mentioned in ${resultsWithEntity}/${topResults.length} sources (${(matchRate*100).toFixed(0)}% match rate)`);
          
          // If < 30% of results mention the entity AND we have good-quality sources, likely wrong company
          // More lenient threshold (30% instead of 40%) to reduce false rejections
          if (matchRate < 0.3 && topResults.length >= 5) {
            console.warn(`⚠️ LOW ENTITY MATCH RATE: Only ${(matchRate*100).toFixed(0)}% of sources mention "${specificEntity}"`);
            console.warn(`⚠️ Search results may be about a different entity with a similar name`);
            
            // Inject warning into context instead of unreliable results
            browsingContext = `⚠️ **ENTITY VERIFICATION WARNING**\n\nThe search for "${specificEntity}" returned results with LOW confidence:\n- Only ${resultsWithEntity} out of ${topResults.length} top sources actually mention "${specificEntity}"\n- Match rate: ${(matchRate*100).toFixed(0)}% (threshold: 30%)\n\n**This suggests the search may have found a different entity with a similar name.**\n\n**You MUST:**\n1. Acknowledge that search results are inconclusive or may refer to a different entity\n2. Ask the user to clarify the exact entity name, location, or provide more context\n3. DO NOT present information as if it's about the queried entity without strong verification\n\n**Example response:** "I found some results, but they appear to be about different companies or entities with similar names. Could you provide more specific details about [Entity], such as location, full company name, or other identifying information?"\n\n**DO NOT answer with unverified information.**`;
            
            researchPerformed = false;
            // Skip structured extraction for low-quality matches
          } else if (matchRate < 0.5) {
            // Match rate between 30-50%: Allow research but inject warning about medium confidence
            console.warn(`⚠️ MEDIUM ENTITY MATCH RATE: ${(matchRate*100).toFixed(0)}% of sources mention "${specificEntity}"`);
            console.warn(`⚠️ Proceeding with research but flagging medium confidence`);
          }
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
        
        // UNIVERSAL VERIFICATION SYSTEM: Apply to ALL factual queries, not just vessels
        let structuredData = '';
        let verificationMetadata: any = null;
        
        // Classify query to determine if verification needed
        const classification = classifyQuery(currentQuery);
        console.log(`🔍 Query Classification:`, classification);
        
        // Apply verification for factual queries that passed entity check
        if (classification.requiresSearch && classification.type === 'factual' && topResults.length > 0 && OPENAI_API_KEY && researchPerformed) {
          try {
            console.log(`🔬 UNIVERSAL VERIFICATION: Extracting and verifying claims for ${classification.domain} query...`);
            
            // STEP 1: Extract claims from all sources
            const claims = await extractClaims(currentQuery, topResults, OPENAI_API_KEY);
            console.log(`📋 Extracted ${claims.length} claims from sources`);
            
            if (claims.length === 0) {
              console.warn('⚠️ No claims could be extracted - sources may not contain relevant information');
              structuredData = `\n\n⚠️ **INSUFFICIENT DATA**\n\nThe search results do not contain sufficient factual information to answer this query reliably.\n\nYou MUST:\n1. Acknowledge that specific information is not available in current sources\n2. Provide only general knowledge (if appropriate)\n3. Suggest the user verify with authoritative sources or provide more context\n\n**DO NOT fabricate information.**\n\n`;
            } else {
              // STEP 2: Verify claims based on verification level
              const verification = verifyClaims(claims, classification.verificationLevel);
              console.log(`✓ Verification result: ${verification.verified ? 'PASSED' : 'FAILED'} (${verification.confidence.toFixed(0)}% confidence)`);
              
              verificationMetadata = {
                queryType: classification.type,
                domain: classification.domain,
                verificationLevel: classification.verificationLevel,
                claimsExtracted: claims.length,
                verified: verification.verified,
                confidence: verification.confidence,
                supportingSources: verification.supportingSources,
                conflictDetected: verification.conflictDetected,
              };
              
              // STEP 3: Build structured data context for the AI
              structuredData = `\n\n=== UNIVERSAL VERIFICATION SYSTEM RESULTS ===\n`;
              structuredData += `Query Type: ${classification.type} | Domain: ${classification.domain}\n`;
              structuredData += `Verification Level: ${classification.verificationLevel.toUpperCase()}\n`;
              structuredData += `Overall Confidence: ${verification.confidence.toFixed(0)}%\n`;
              structuredData += `Verification Status: ${verification.verified ? '✅ PASSED' : '⚠️ FAILED'}\n`;
              structuredData += `Reason: ${verification.reason}\n\n`;
              
              if (!verification.verified) {
                structuredData += `⚠️ **VERIFICATION FAILED** - ${verification.reason}\n\n`;
                structuredData += `You MUST acknowledge this in your response. Do NOT present unverified information as fact.\n\n`;
              }
              
              // Add all claims with evidence
              structuredData += `=== VERIFIED CLAIMS (${claims.length} total) ===\n\n`;
              
              claims.forEach((claim, idx) => {
                const statusEmoji = claim.confidence >= 70 ? '✅' : claim.confidence >= 50 ? '⚠️' : '❌';
                structuredData += `${statusEmoji} CLAIM ${idx + 1}: ${claim.claim}\n`;
                structuredData += `   Type: ${claim.claimType} | Confidence: ${claim.confidence}%\n`;
                structuredData += `   Sources: [${claim.sources.join(', ')}]\n`;
                
                if (claim.evidence && claim.evidence.length > 0) {
                  structuredData += `   Evidence:\n`;
                  claim.evidence.forEach(e => {
                    structuredData += `     • "${e}"\n`;
                  });
                }
                
                if (claim.contradictions && claim.contradictions.length > 0) {
                  structuredData += `   ⚠️ CONTRADICTIONS:\n`;
                  claim.contradictions.forEach(c => {
                    structuredData += `     • ${c}\n`;
                  });
                }
                
                structuredData += `\n`;
              });
              
              // Add usage instructions
              structuredData += `\n=== MANDATORY ANSWER REQUIREMENTS ===\n`;
              structuredData += `1. Use ONLY the claims above - DO NOT add information not present in claims\n`;
              structuredData += `2. Cite sources [1][2][3] for EVERY factual statement\n`;
              structuredData += `3. If verification failed, acknowledge uncertainty explicitly\n`;
              structuredData += `4. If contradictions exist, present multiple viewpoints\n`;
              structuredData += `5. For low-confidence claims (< 70%), use phrases like "According to [source]" instead of stating as absolute truth\n`;
              structuredData += `6. End response with "**Sources:**" section listing all cited sources with URLs\n\n`;
              
              structuredData += `==================================================\n\n`;
              
              console.log(`✅ UNIVERSAL VERIFICATION: Complete with ${claims.length} claims (${verification.confidence.toFixed(0)}% confidence)`);
            }
            
          } catch (e) {
            console.error('❌ UNIVERSAL VERIFICATION: Error:', e.message);
            structuredData = `\n\n⚠️ **VERIFICATION ERROR**\n\nAn error occurred during the verification process. Please answer cautiously based on the source content provided, and cite all sources explicitly.\n\n`;
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
    const requestBody = {
      model: usedModel,
      messages: browsingContext
        ? [
            { role: 'system', content: `${SYSTEM_PROMPT}\n\n=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===\n${browsingContext}\n\n**CRITICAL: MANDATORY VERIFICATION STEPS BEFORE ANSWERING**

**STEP 1 - ENTITY VERIFICATION (MANDATORY):**
1. What EXACT company did the user ask about? Check the conversation history.
2. Is a location/country specified? (e.g., "Dynamic Marine Services UAE" has location, "Dynamic Marine" does not)
3. If NO location and you know multiple companies exist with this name:
   - IMMEDIATELY ask: "I found multiple companies with similar names. Which one: [List options with locations]?"
   - STOP. Do not attempt to answer.
4. If location IS specified, check: Do the search results match this EXACT company + location?

**STEP 2 - RESULT MATCHING (MANDATORY):**
- Scan search results for company name + location mentions
- If results are about DIFFERENT company: "Search results appear to be about [Other Company]. Can you confirm you meant [Query Company]?"
- If results don't clearly match: "I couldn't find specific information about [Query Company] in the search results. Can you verify the company name and location?"
- Only proceed if confident results match the user's query

**STEP 3 - CONSISTENCY CHECK (MANDATORY):**
- Review your previous responses about this company
- If giving a different answer now: "I apologize for the earlier inconsistency. Based on current research, the accurate information is..."
- Be consistent or explicitly acknowledge changes

**STEP 4 - ANSWER FORMATTING (only after Steps 1-3 pass):**
- Use research results to provide accurate, current information
- Cite sources [1], [2], etc. inline for every fact
- End with "**Sources:**" section: "Source 1: [URL](URL)" on separate lines
- Preserve ALL markdown formatting
- Prioritize **fleetcore**-specific information when relevant

**ABSOLUTE RULES:**
- NEVER answer about the wrong company
- NEVER give inconsistent answers without acknowledgment
- NEVER say you cannot browse when research results are provided
- ALWAYS ask for clarification when entity is ambiguous` },
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
              { role: 'system', content: `${SYSTEM_PROMPT}\n\n=== WEB RESEARCH RESULTS (USE THESE TO ANSWER) ===\n${browsingContext}\n\n**CRITICAL: MANDATORY VERIFICATION STEPS BEFORE ANSWERING**

**STEP 1 - ENTITY VERIFICATION (MANDATORY):**
1. What EXACT company did the user ask about? Check the conversation history.
2. Is a location/country specified? (e.g., "Dynamic Marine Services UAE" has location, "Dynamic Marine" does not)
3. If NO location and you know multiple companies exist with this name:
   - IMMEDIATELY ask: "I found multiple companies with similar names. Which one: [List options with locations]?"
   - STOP. Do not attempt to answer.
4. If location IS specified, check: Do the search results match this EXACT company + location?

**STEP 2 - RESULT MATCHING (MANDATORY):**
- Scan search results for company name + location mentions
- If results are about DIFFERENT company: "Search results appear to be about [Other Company]. Can you confirm you meant [Query Company]?"
- If results don't clearly match: "I couldn't find specific information about [Query Company] in the search results. Can you verify the company name and location?"
- Only proceed if confident results match the user's query

**STEP 3 - CONSISTENCY CHECK (MANDATORY):**
- Review your previous responses about this company
- If giving a different answer now: "I apologize for the earlier inconsistency. Based on current research, the accurate information is..."
- Be consistent or explicitly acknowledge changes

**STEP 4 - ANSWER FORMATTING (only after Steps 1-3 pass):**
- Use research results to provide accurate, current information
- Cite sources [1], [2], etc. inline for every fact
- End with "**Sources:**" section: "Source 1: [URL](URL)" on separate lines
- Preserve ALL markdown formatting
- Prioritize **fleetcore**-specific information when relevant

**ABSOLUTE RULES:**
- NEVER answer about the wrong company
- NEVER give inconsistent answers without acknowledgment
- NEVER say you cannot browse when research results are provided
- ALWAYS ask for clarification when entity is ambiguous` },
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

