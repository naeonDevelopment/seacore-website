/**
 * Tool Registry - All available maritime intelligence tools
 * Current: Gemini (verification + grounding) + Deep Research + Knowledge Base
 * ENABLED: Deep Research with Tavily integration for comprehensive analysis
 */

import { geminiTool } from './gemini-tool';
import { deepResearchTool } from './deep-research'; // ENABLED: Phase 4 implementation
import { maritimeKnowledgeTool } from './knowledge';

export const maritimeTools = [
  geminiTool,              // PRIMARY: Google-powered search (verification + grounding merged)
  deepResearchTool,        // ENABLED: Deep research mode with Tavily for comprehensive analysis
  maritimeKnowledgeTool    // SECONDARY: Internal fleetcore knowledge
];

export {
  geminiTool,
  deepResearchTool,        // ENABLED: Phase 4
  maritimeKnowledgeTool
};

