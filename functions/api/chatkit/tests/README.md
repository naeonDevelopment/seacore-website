Agentic System Tests (Phase 7)

What’s covered
- grounding-extractor.test.ts: Gemini 2.5 grounding normalization
  - Handles zero webResults, uses groundingChunks
  - Filters Vertex AI redirect URLs
  - Falls back to Google search link when only searchEntryPoint
- entity-validation.test.ts: Vessel entity validation
  - Positive IMO-aligned match
  - Drift case (wrong vessel) yields low/false match
- source-categorizer.test.ts: Coverage categories
  - Categorization of AIS/registry/owner/class/directory
  - Coverage complete vs missing categories

How to run
- With ts-node (recommended):
  npx ts-node functions/api/chatkit/tests/grounding-extractor.test.ts
  npx ts-node functions/api/chatkit/tests/entity-validation.test.ts
  npx ts-node functions/api/chatkit/tests/source-categorizer.test.ts

Notes
- Tests have no network calls and can run standalone.
- They assert PASS/FAIL via Node’s assert and print a ✓ on success.


