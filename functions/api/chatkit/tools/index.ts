/**
 * Tool Registry - All available maritime intelligence tools
 * Current: Gemini (verification + grounding) + Knowledge Base
 * DISABLED: Deep Research (coming soon with Tavily integration)
 */

import { geminiTool } from './gemini-tool';
// import { deepResearchTool } from './deep-research'; // DISABLED: Coming soon
import { maritimeKnowledgeTool } from './knowledge';

export const maritimeTools = [
  geminiTool,              // PRIMARY: Google-powered search (verification + grounding merged)
  // deepResearchTool,     // DISABLED: Deep research mode coming soon with Tavily
  maritimeKnowledgeTool    // SECONDARY: Internal fleetcore knowledge
];

export {
  geminiTool,
  // deepResearchTool,     // DISABLED: Coming soon
  maritimeKnowledgeTool
};

