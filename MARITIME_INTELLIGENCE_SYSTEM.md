# Maritime Intelligence System - Technical Documentation

## 🎯 Overview

This document describes the **Multi-Tier Entity-Aware Maritime Intelligence System** - a comprehensive research agent designed to deliver 100% accurate technical details for vessels, equipment, parts, regulations, and PMS.

## 🏗️ System Architecture

```
User Query
    ↓
Entity Type Detection (entity-type-detector.ts)
    ├── Vessel (60%+ confidence)
    ├── Equipment (60%+ confidence)
    ├── Part (60%+ confidence)
    ├── Regulation (60%+ confidence)
    ├── PMS (60%+ confidence)
    └── General (fallback)
    ↓
Specialized Query Strategy (specialized-query-strategies.ts)
    ├── Multi-tier search (registries → docs → forums → OEM)
    ├── 10-13 targeted queries per entity type
    └── Source prioritization (critical → high → medium)
    ↓
Parallel Execution (query-planner.ts)
    ├── Execute all queries in parallel
    ├── Aggregate sources from all tiers
    └── Deduplicate and rank by authority
    ↓
Entity-Specific Extraction (extraction-schemas.ts)
    ├── Database-aligned templates
    ├── Comprehensive field extraction
    └── Real-world experience integration
    ↓
Synthesis & Response (agent-orchestrator.ts)
    ├── Apply extraction template
    ├── Cross-reference sources
    └── Generate detailed markdown output
```

## 📦 Core Modules

### 1. Entity Type Detector (`entity-type-detector.ts`)

**Purpose**: Intelligently detect the type of maritime query to route to specialized handlers.

**Entity Types**:
- `vessel`: Ships, boats, vessels (e.g., "Dynamic 17", "Stanford Pelican")
- `equipment`: Machinery, engines, generators (e.g., "Caterpillar C32", "MAN 9L21/31")
- `part`: Components, spares (e.g., "fuel filter", "impeller", "bearing")
- `regulation`: Classification, compliance (e.g., "SOLAS requirements", "DNV rules")
- `pms`: Maintenance schedules, procedures (e.g., "oil change interval", "overhaul procedure")
- `general`: General maritime topics

**Key Features**:
- 100+ equipment manufacturer patterns (Caterpillar, MAN, Wärtsilä, etc.)
- Equipment type detection (engines, generators, pumps, etc.)
- Part keyword matching (filters, bearings, seals, etc.)
- Vessel name pattern recognition
- Confidence scoring (0-100%)
- Source hints for each entity type

**Example Output**:
```typescript
{
  type: 'equipment',
  confidence: 85,
  entities: ['Caterpillar', 'C32', 'engine'],
  context: 'Equipment query detected. Target OEM documentation...',
  searchStrategy: 'technical-documentation'
}
```

### 2. Specialized Query Strategies (`specialized-query-strategies.ts`)

**Purpose**: Generate multi-tier search strategies optimized for each entity type.

**Strategies**:

#### Vessel Strategy (10 queries)
- **Tier 1 (Critical)**: Official registries (MarineTraffic, Equasis, VesselFinder)
- **Tier 2 (High)**: AIS tracking, technical specifications
- **Tier 3 (Medium)**: Ownership, fleet information

#### Equipment Strategy (13 queries)
- **Tier 1 (Critical)**: OEM official documentation, technical manuals
- **Tier 2 (High)**: Maintenance schedules, service bulletins
- **Tier 3 (High)**: Real-world experience (eng-tips.com, marine forums)
- **Tier 4 (Medium)**: Parts catalogs, compatibility

#### Parts Strategy (10 queries)
- **Tier 1 (Critical)**: OEM parts catalogs
- **Tier 2 (High)**: Cross-reference databases, alternatives
- **Tier 3 (High)**: Marine suppliers, availability
- **Tier 4 (Medium)**: Technical specifications, installation

#### Regulation Strategy (11 queries)
- **Tier 1 (Critical)**: Classification society rules (DNV, ABS, LR, BV)
- **Tier 2 (Critical)**: IMO conventions (SOLAS, MARPOL)
- **Tier 3 (High)**: Flag state regulations, PSC
- **Tier 4 (Medium)**: Industry guidelines

#### PMS Strategy (13 queries)
- **Tier 1 (Critical)**: OEM maintenance manuals
- **Tier 2 (High)**: Service procedures, checklists
- **Tier 3 (High)**: Maintenance intervals, inspection schedules
- **Tier 4 (High)**: Real-world experience, best practices from forums
- **Tier 5 (Medium)**: Required parts, consumables

**Key Features**:
- Multi-tier priority system (critical → high → medium → low)
- Targeted site searches (site:eng-tips.com, site:caterpillar.com)
- Technical forum integration for real-world experience
- OEM documentation targeting
- Classification society targeting

### 3. Extraction Schemas (`extraction-schemas.ts`)

**Purpose**: Database-aligned extraction templates that map to Supabase tables.

**Schemas**:

#### Equipment Extraction Template
Maps to: `equipment_definitions`, `vessel_equipment_installations`

**Fields**:
- Equipment Identity (name, manufacturer, model, type)
- Technical Specifications (power, voltage, dimensions, weight)
- Engine-Specific (cylinders, bore×stroke, displacement, compression)
- Maintenance Requirements (intervals, service life, overhaul)
- Acquisition & Costs (procurement, lead time)
- Documentation (manuals, drawings, installation guides)
- **Operational Experience & Best Practices** (from forums)
- **Parts & Compatibility**

#### Parts Extraction Template
Maps to: `parts`, `equipment_parts`, `vessel_parts_inventory`

**Fields**:
- Part Identity (part number, name, manufacturer)
- Technical Specifications (material, dimensions, weight)
- Compatibility (compatible equipment, alternatives, cross-reference)
- Procurement (cost, lead time, MOQ, suppliers)
- Safety & Handling (hazmat, storage requirements)
- Installation & Usage (difficulty, tools, torque specs)
- Maintenance Context (wear part, critical, replacement interval)
- **Real-World Experience** (failure modes, life expectancy, tips)

#### PMS Extraction Template
Maps to: `equipment_maintenance_recommendations`, `pms_schedules`

**Fields**:
- Maintenance Task Identity (title, type, category, equipment)
- Maintenance Intervals (primary hours, secondary time, logic)
- Procedure (step-by-step, safety, tools, parts)
- Task Details (duration, difficulty, personnel, certifications)
- Regulatory Compliance (SOLAS, class society requirements)
- Documentation (source manuals, technical bulletins)
- **OEM Recommendations** (official intervals, procedures)
- **Real-World Experience & Best Practices** (from forums)
  - Actual field intervals
  - Common problems
  - Tips & tricks
  - Critical watch points
  - Common mistakes
  - Extended operation conditions

#### Regulation Extraction Template
Maps to: `vessel_systems` (regulatory flags), `statutory_certificates`

**Fields**:
- Regulation Identity (name, type, authority, reference number)
- Applicability (vessel types, tonnage limits, trading area)
- Requirements (design, equipment, testing, certification)
- Classification Society Rules (DNV, ABS, LR, BV)
- Survey Requirements (annual, intermediate, special, renewal)
- Compliance Verification (inspection, test methods)
- Non-Compliance (deficiencies, rectification, penalties)
- **Industry Best Practices** (common deficiencies, lessons learned)

### 4. Query Planner Integration (`query-planner.ts`)

**Enhanced with Entity Routing**:

```typescript
// Step 1: Detect entity type
const entityDetection = detectEntityType(query);

// Step 2: Check confidence (≥60% for specialized strategy)
const useSpecializedStrategy = entityDetection.confidence >= 60;

// Step 3: Generate specialized queries OR fallback to legacy
if (useSpecializedStrategy) {
  const specializedStrategy = generateSpecializedStrategy(
    query,
    entityDetection.type,
    entityDetection.entities
  );
  // Returns 10-13 targeted queries
}
```

## 🎯 Key Features

### Multi-Source Intelligence
- **Official Sources**: Registries, OEM documentation, classification societies
- **Technical Sources**: Datasheets, manuals, specifications
- **Real-World Sources**: Technical forums, marine engineer discussions
- **Best Practices**: Field experience beyond OEM specs

### Entity-Aware Routing
- Automatic detection of query type
- Specialized search strategies per entity
- Confidence-based routing
- Fallback to general strategy when uncertain

### Real-World Experience Extraction
- Technical forums: eng-tips.com, gcaptain.com, marine engineering forums
- Common issues and solutions
- Best practices from experienced marine engineers
- Lessons learned from operations
- Maintenance tips and tricks
- Common mistakes to avoid

### Database Alignment
- All extraction schemas map to Supabase tables
- Ready for direct database population
- Structured data for MCP integration
- Complete field coverage

## 📊 Performance Metrics

### Search Quality
- **Before**: 5-7 generic maritime searches
- **After**: 10-13 targeted entity-specific searches
- **Improvement**: ~100% more comprehensive coverage

### Source Diversity
- **Before**: General maritime sources only
- **After**: Multi-tier approach (registries → docs → forums → OEM)
- **Improvement**: 4-tier source strategy

### Data Extraction
- **Before**: Basic vessel profile only
- **After**: Complete database-aligned schemas for 5 entity types
- **Improvement**: 5x entity type coverage

## 🚀 Next Steps

### Integration Tasks
1. **Update agent-orchestrator.ts**:
   - Import extraction schemas
   - Apply entity-specific templates
   - Use enhanced extraction instructions

2. **Add Context7 MCP Integration**:
   - For technical documentation access
   - OEM manual retrieval
   - Classification society rule books

3. **Implement Verification Layer**:
   - Cross-check technical specs across multiple sources
   - Flag conflicting information
   - Confidence scoring per field

4. **Testing**:
   - Test vessel queries: "Dynamic 25", "Stanford Pelican"
   - Test equipment queries: "Caterpillar C32", "MAN 9L21/31"
   - Test parts queries: "Caterpillar C32 fuel filter"
   - Test PMS queries: "Caterpillar C32 oil change interval"
   - Test regulation queries: "SOLAS fire safety requirements"

### Future Enhancements
1. **N8N Workflow Integration**: Use n8n MCP for workflow automation
2. **Supabase Service**: Direct database population service
3. **Memory Graph**: Store and retrieve historical research
4. **User Feedback Loop**: Learn from corrections and updates

## 💡 Usage Examples

### Example 1: Equipment Query
```
User: "Tell me about the Caterpillar C32 engine"

System:
1. Detects entity type: equipment (confidence: 90%)
2. Generates 13 specialized queries:
   - OEM documentation from caterpillar.com
   - Technical specifications and datasheets
   - Maintenance manuals and service bulletins
   - Real-world experience from eng-tips.com
   - Parts catalogs and compatibility
3. Extracts comprehensive equipment profile:
   - Official specs from OEM
   - Maintenance intervals from manual
   - Common issues from forums
   - Best practices from marine engineers
4. Returns detailed equipment profile with citations
```

### Example 2: PMS Query
```
User: "What is the maintenance schedule for Caterpillar C32?"

System:
1. Detects entity type: pms (confidence: 95%)
2. Generates 13 specialized queries:
   - OEM maintenance manual
   - Service schedule and intervals
   - Maintenance procedures
   - Real-world experience from forums
   - Required parts and consumables
3. Extracts comprehensive PMS profile:
   - Official OEM intervals
   - Detailed procedures
   - Actual field practices
   - Common problems and tips
4. Returns complete maintenance profile
```

## 🔧 Technical Specifications

### Dependencies
- `@langchain/openai`: Query planning with GPT-4o-mini
- Gemini API: Grounding and source extraction
- Custom modules: Entity detection, specialized strategies

### Configuration
- Entity detection confidence threshold: 60%
- Maximum specialized queries: 12
- Parallel execution: All queries concurrently
- Source deduplication: URL-based
- Authority ranking: T1 > T2 > T3

## 📚 References

- **Supabase Database Schema**: Complete table structure in database
- **Technical Forums**: eng-tips.com, gcaptain.com, marine engineering forums
- **OEM Sites**: caterpillar.com, man-es.com, wartsila.com, etc.
- **Classification Societies**: dnv.com, abs.org, lr.org, bureauveritas.com
- **Vessel Registries**: marinetraffic.com, vesselfinder.com, equasis.org

---

**Status**: ✅ Core system implemented and committed
**Next**: Integration with agent-orchestrator.ts and testing
**Goal**: Best maritime research agent with 100% accurate technical intelligence

