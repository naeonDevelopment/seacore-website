/**
 * Maritime Knowledge Tool - Internal fleetcore knowledge base
 * For quick lookups of standard maritime concepts
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const maritimeKnowledgeTool = tool(
  async ({ topic }: { topic: string }) => {
    console.log(`📚 Knowledge Base: "${topic}"`);
    
    const knowledge: Record<string, string> = {
      'SOLAS': 'SOLAS (Safety of Life at Sea) is the most important international maritime safety treaty, covering construction, equipment, operation, and training standards.',
      'MARPOL': 'MARPOL (International Convention for the Prevention of Pollution from Ships) regulates pollution from ships, including oil, chemicals, sewage, garbage, and air emissions.',
      'ISM': 'ISM Code (International Safety Management Code) provides an international standard for safe ship management and pollution prevention.',
      'fleetcore': 'fleetcore is an enterprise Maritime Maintenance Operating System providing predictive maintenance, compliance management, and digital transformation for maritime operations.',
    };
    
    const result = Object.entries(knowledge)
      .filter(([key]) => topic.toLowerCase().includes(key.toLowerCase()))
      .map(([_, value]) => value)
      .join('\n\n');
    
    return result || "Topic not found in knowledge base. Use other tools for specific queries.";
  },
  {
    name: "maritime_knowledge",
    description: "Query fleetcore's internal maritime knowledge base for regulations, standards, and general concepts (SOLAS, MARPOL, ISM, fleetcore features).",
    schema: z.object({
      topic: z.string().describe("Topic to query: SOLAS, MARPOL, ISM, fleetcore, vessel types")
    })
  }
);

