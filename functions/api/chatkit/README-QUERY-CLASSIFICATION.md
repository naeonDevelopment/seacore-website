# Query Classification System

## Overview

Centralized query classification rules for the Maritime Intelligence Agent. All mode detection logic is consolidated in `query-classification-rules.ts`.

## Classification Modes

### 🎯 **Knowledge Mode** (`none`)
- **Purpose**: Answer from training data (no external tools)
- **Triggers**:
  - System organization queries: "systems organisation management", "system structure"
  - Platform feature queries: "fleetcore PMS", "compliance tracking"
  - How-to questions: "how to use maintenance scheduling"
  - Platform capabilities: "what features does fleetcore have"

### 🔮 **Verification Mode** (`verification`)
- **Purpose**: Quick Gemini grounding for real-time entity data
- **Triggers**:
  - Entity queries: "what is MSC Loreto", "who owns Dynamic 17"
  - Hybrid queries: "how can fleetcore support vessel Dynamic 17"
  - Maritime lookups: vessel specs, company info, equipment details

### 📚 **Research Mode** (`research`)
- **Purpose**: Deep multi-source research with comprehensive analysis
- **Triggers**:
  - User explicitly enables "Online research" toggle
  - Overrides all other classification logic

## Key Features

### Enhanced Keyword Detection
- **300+ platform keywords** covering all fleetcore features
- **Support for British spelling** (organisation/organization)
- **Word boundary matching** prevents false positives
- **Multi-word phrase detection** for complex terms

### Special Query Patterns
- **System organization detection**: Catches abstract queries about system structure
- **How-to detection**: Identifies tutorial/guide questions
- **Entity pattern matching**: Recognizes vessel names, IMO/MMSI numbers

## Architecture

```
query-classification-rules.ts (SINGLE SOURCE OF TRUTH)
  ├── PLATFORM_KEYWORDS[]
  ├── ENTITY_KEYWORDS[]
  ├── isPlatformQuery()
  ├── hasEntityMention()
  ├── isHowToQuery()
  ├── isSystemOrganizationQuery()
  ├── classifyQuery() ← Main classification function
  └── generateClassificationLog() ← Debugging output
```

## Usage

```typescript
import { classifyQuery, generateClassificationLog } from './query-classification-rules';

// Classify query
const mode = classifyQuery(userQuery, enableBrowsing);

// Get detailed log for debugging
const log = generateClassificationLog(userQuery, mode, enableBrowsing);
console.log(log);
```

## Examples

| Query | Mode | Reason |
|-------|------|--------|
| "systems organisation management" | `none` | System organization pattern |
| "how to use PMS" | `none` | How-to query |
| "fleetcore compliance features" | `none` | Pure platform query |
| "what is MSC Loreto" | `verification` | Entity query |
| "how can fleetcore support Dynamic 17" | `verification` | Platform + entity hybrid |
| Any query with browsing enabled | `research` | User override |

## Maintenance

To add new keywords or patterns:

1. **Platform keywords**: Add to `PLATFORM_KEYWORDS` array
2. **Entity keywords**: Add to `ENTITY_KEYWORDS` array
3. **Special patterns**: Add detection function (e.g., `isSystemOrganizationQuery`)
4. **Classification logic**: Update `classifyQuery()` function

## Previous Issue Fixed

**Problem**: Query "give me details about the systems organisation management" was incorrectly classified as `verification` mode, causing Gemini to search for maritime industry information instead of answering about fleetcore's system structure.

**Root Cause**: Missing keywords: `system`, `systems`, `management`, `organisation`, `organization`

**Solution**: Enhanced keyword list with 300+ terms and specialized pattern detection for system organization queries.

## Files

- `query-classification-rules.ts` - **All classification logic** (SINGLE SOURCE)
- `agent-orchestrator.ts` - Uses `classifyQuery()` function
- `maritime-system-prompt.ts` - System prompt with mode-specific instructions

