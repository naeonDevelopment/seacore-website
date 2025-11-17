# Maritime Intelligence Agent - LangGraph Implementation

## Quick Start

### Enable LangGraph Agent
Set environment variable in your Cloudflare Pages settings:
```bash
USE_LANGGRAPH=true
```

### Test Endpoints
- **LangGraph:** `/api/chatkit/chat-langgraph` (new)
- **Legacy:** `/api/chatkit/chat` (existing)

### Check Agent Status
```bash
GET /api/chatkit/chat-langgraph
```

Returns:
```json
{
  "status": "healthy",
  "agent": {
    "active": "langgraph",
    "featureFlag": true,
    "capabilities": [...]
  }
}
```

## Architecture Overview

### Files
- `langgraph-agent.ts` (753 lines) - LangGraph StateGraph implementation
- `chat-langgraph.ts` - New endpoint
- `chat.ts` (2673 lines) - Legacy agent (kept for fallback reference only)

### Flow
```
User Query
    ↓
Router Node (gpt-4o-mini) - Detects entities, decides tools
    ↓
Tools Node (maritime_search, maritime_knowledge)
    ↓
Process Node - Source selection, confidence scoring
    ↓
Synthesizer Node (gpt-4o) - Comprehensive answer
    ↓
SSE Stream to Client
```

## Key Features

✅ **Tool-Based Research** - Tavily as LangGraph tool
✅ **State Management** - MemorySaver for conversation persistence
✅ **Follow-up Detection** - Reuses research context
✅ **Source Selection** - Smart quality-based filtering
✅ **Confidence Scoring** - Auto-refinement if needed
✅ **Streaming** - SSE with thinking/sources/content events

## Cost Optimization

| Task | Model | Cost |
|------|-------|------|
| Planning | gpt-4o-mini | $0.0001/query |
| Synthesis | gpt-4o | $0.005/query |
| **Total** | - | **~$0.006/query** (50% reduction) |

## Next Steps

1. ✅ Install dependencies (`npm install`)
2. ✅ Build project (`npm run build`)
3. ⏳ Set `USE_LANGGRAPH=true` in Cloudflare
4. ⏳ Test with frontend
5. ⏳ Monitor performance
6. ⏳ Remove dead code from `chat.ts` once validated

## Migration Status

- **Phase 1:** ✅ Complete - Dependencies, agent, router
- **Phase 2:** ✅ Complete - Tavily tools, streaming
- **Phase 3:** ⏳ Pending - Remove dead code after validation

