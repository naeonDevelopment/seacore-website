/**
 * CONVERSATION SUMMARIZATION SYSTEM
 * Maintains long-term context through intelligent compression
 */

import { ChatOpenAI } from "@langchain/openai";

export interface ConversationMessage {
  role: string;
  content: string;
  timestamp?: number;
}

export interface SummaryResult {
  summary: string;
  topics: string[];
  entities: string[];
  user_intent: string;
  key_facts: string[];
}

/**
 * Summarize conversation history intelligently
 * Used when message count exceeds threshold
 */
export async function summarizeConversation(
  messages: ConversationMessage[],
  openaiApiKey: string,
  existingSummary?: string
): Promise<SummaryResult> {
  
  console.log(`📝 Summarizing ${messages.length} messages...`);
  
  const model = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: 0.1,
    apiKey: openaiApiKey,
  });
  
  // Build conversation text
  const conversationText = messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');
  
  const promptText = existingSummary
    ? `You are summarizing a maritime intelligence conversation.

PREVIOUS SUMMARY:
${existingSummary}

NEW MESSAGES:
${conversationText}

Task: Update the summary to include the new information while maintaining continuity.`
    : `You are summarizing a maritime intelligence conversation.

CONVERSATION:
${conversationText}

Task: Create a comprehensive summary.`;
  
  const response = await model.invoke(`${promptText}

Extract:
1. SUMMARY: 2-3 sentences capturing the conversation essence
2. TOPICS: List of main discussion topics (e.g., ["vessel specifications", "maintenance procedures"])
3. ENTITIES: All vessels, companies, equipment mentioned (exact names)
4. USER_INTENT: What the user is trying to accomplish
5. KEY_FACTS: Important technical details or conclusions

Format as JSON:
{
  "summary": "...",
  "topics": [...],
  "entities": [...],
  "user_intent": "...",
  "key_facts": [...]
}

Output ONLY valid JSON, no markdown.`);
  
  try {
    const result = JSON.parse(
      typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content)
    );
    
    console.log(`   ✅ Summary generated`);
    console.log(`   Topics: ${result.topics.join(', ')}`);
    console.log(`   Entities: ${result.entities.join(', ')}`);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to parse summary JSON:', error);
    
    // Fallback: simple summary
    return {
      summary: `Conversation about maritime intelligence covering ${messages.length} messages`,
      topics: ['general maritime discussion'],
      entities: [],
      user_intent: 'maritime research',
      key_facts: []
    };
  }
}

/**
 * Incremental summarization - summarize old messages, keep recent ones
 * Maintains 10 recent messages + summary of older context
 */
export async function incrementalSummarize(
  allMessages: ConversationMessage[],
  openaiApiKey: string,
  threshold: number = 15
): Promise<{
  summary: string;
  recentMessages: ConversationMessage[];
  shouldSummarize: boolean;
}> {
  
  if (allMessages.length < threshold) {
    return {
      summary: '',
      recentMessages: allMessages,
      shouldSummarize: false
    };
  }
  
  // Split: summarize old, keep recent
  const splitPoint = allMessages.length - 10;
  const oldMessages = allMessages.slice(0, splitPoint);
  const recentMessages = allMessages.slice(splitPoint);
  
  console.log(`📊 Incremental summary: ${oldMessages.length} old, ${recentMessages.length} recent`);
  
  const summaryResult = await summarizeConversation(
    oldMessages,
    openaiApiKey
  );
  
  return {
    summary: summaryResult.summary,
    recentMessages,
    shouldSummarize: true
  };
}

/**
 * Extract maritime entities from text using pattern matching
 * Quick extraction without LLM call
 */
export function extractEntitiesQuick(text: string): {
  vessels: string[];
  companies: string[];
  equipment: string[];
} {
  
  const vessels: string[] = [];
  const companies: string[] = [];
  const equipment: string[] = [];
  
  // Vessel patterns (IMO numbers, ship names)
  const imoPattern = /\b(IMO\s*)?(\d{7})\b/gi;
  const imoMatches = text.match(imoPattern);
  if (imoMatches) {
    imoMatches.forEach(imo => vessels.push(imo.replace(/IMO\s*/i, 'IMO ')));
  }
  
  // Capitalized vessel names (heuristic)
  const vesselKeywords = /\b(vessel|ship|boat|tanker|carrier|barge)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
  const vesselMatches = text.matchAll(vesselKeywords);
  for (const match of vesselMatches) {
    vessels.push(match[2]);
  }
  
  // Company patterns
  const companyKeywords = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Marine|Maritime|Shipping|Lines|Corp|Corporation|Ltd|Limited|Inc|Group)/g;
  const companyMatches = text.matchAll(companyKeywords);
  for (const match of companyMatches) {
    companies.push(`${match[1]} ${match[2]}`);
  }
  
  // Equipment patterns
  const equipmentKeywords = /\b(engine|motor|propeller|generator|radar|GPS|AIS|ECDIS|gyro|compass)\b/gi;
  const equipmentMatches = text.match(equipmentKeywords);
  if (equipmentMatches) {
    equipment.push(...new Set(equipmentMatches.map(e => e.toLowerCase())));
  }
  
  return {
    vessels: [...new Set(vessels)],
    companies: [...new Set(companies)],
    equipment: [...new Set(equipment)]
  };
}

/**
 * Determine if conversation needs summarization
 */
export function shouldSummarize(messageCount: number, threshold: number = 15): boolean {
  return messageCount >= threshold;
}

/**
 * Build context string from summary + recent messages
 * Used to inject into LLM prompts
 */
export function buildContextString(
  summary: string,
  recentMessages: ConversationMessage[],
  maxRecentMessages: number = 5
): string {
  
  const parts: string[] = [];
  
  if (summary) {
    parts.push(`CONVERSATION CONTEXT:\n${summary}\n`);
  }
  
  if (recentMessages.length > 0) {
    const messagesToShow = recentMessages.slice(-maxRecentMessages);
    parts.push(`RECENT EXCHANGES:\n${
      messagesToShow.map(m => `${m.role}: ${m.content}`).join('\n')
    }`);
  }
  
  return parts.join('\n\n');
}

