/**
 * Tool Registry - All available maritime intelligence tools
 * Simplified: Gemini (80% of queries) + Deep Research (complex queries) + Knowledge Base
 */

import { geminiTool } from './gemini-tool';
import { deepResearchTool } from './deep-research';
import { maritimeKnowledgeTool } from './knowledge';

export const maritimeTools = [
  geminiTool,              // PRIMARY: Google-powered search (verification + grounding merged)
  deepResearchTool,        // SECONDARY: Comprehensive multi-source research
  maritimeKnowledgeTool    // TERTIARY: Internal fleetcore knowledge
];

export {
  geminiTool,
  deepResearchTool,
  maritimeKnowledgeTool
};

