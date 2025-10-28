/**
 * Memory Accumulation Utilities
 * Extract and accumulate knowledge from conversations
 * (Ported from legacy agent)
 */

import { extractMaritimeEntities, extractEntityContextFromAnswer } from './utils/entity-utils';
import type { SessionMemory, SessionMemoryManager } from './session-memory';

/**
 * Extract fleetcore features mentioned in query/response
 * Tracks platform features discussed for context preservation
 */
export function extractFleetcoreFeatures(
  text: string,
  messageIndex: number = 0
): Array<{ name: string; explanation: string; messageIndex: number }> {
  const features: Array<{ name: string; explanation: string; messageIndex: number }> = [];
  
  const featurePatterns = [
    {
      pattern: /\bpms\b|planned maintenance system/i,
      name: "PMS (Planned Maintenance System)",
      explanation: "Core maintenance scheduling and tracking system"
    },
    {
      pattern: /work order|work orders/i,
      name: "work orders",
      explanation: "Task creation and management workflow"
    },
    {
      pattern: /inventory management|spare parts management/i,
      name: "inventory management",
      explanation: "Parts tracking and stock management"
    },
    {
      pattern: /compliance tracking|compliance management/i,
      name: "compliance tracking",
      explanation: "Regulatory compliance monitoring and reporting"
    },
    {
      pattern: /crew management|crew scheduling/i,
      name: "crew management",
      explanation: "Personnel scheduling and crew roster management"
    },
    {
      pattern: /safety management|sms system/i,
      name: "safety management system",
      explanation: "ISM Code compliance and safety tracking"
    },
    {
      pattern: /procurement|purchasing/i,
      name: "procurement system",
      explanation: "Purchasing and supplier management"
    },
    {
      pattern: /dashboard|analytics|reporting/i,
      name: "analytics & reporting",
      explanation: "Performance metrics and operational intelligence"
    },
    {
      pattern: /schedule-specific hours|schedule specific hours/i,
      name: "schedule-specific hours tracking",
      explanation: "Industry-first: Each maintenance schedule tracks its own working hours independently"
    },
    {
      pattern: /dual-interval|dual interval/i,
      name: "dual-interval logic",
      explanation: "Supports both hours-based and time-based maintenance intervals"
    },
    {
      pattern: /task management|task workflow/i,
      name: "task management workflow",
      explanation: "Tracks maintenance tasks from pending to completed with real-time updates"
    },
    {
      pattern: /certificate tracking|certification management/i,
      name: "certificate tracking",
      explanation: "Manages vessel certificates and regulatory documentation"
    },
    {
      pattern: /mobile app|offline mode/i,
      name: "mobile capabilities",
      explanation: "Mobile-first design with offline mode support"
    },
    {
      pattern: /real-time|live updates|subscriptions/i,
      name: "real-time updates",
      explanation: "Live data synchronization across all users"
    },
  ];
  
  for (const { pattern, name, explanation } of featurePatterns) {
    if (pattern.test(text)) {
      features.push({ name, explanation, messageIndex });
    }
  }
  
  return features;
}

/**
 * Extract discussed topics from text for knowledge tracking
 */
export function extractDiscussedTopics(text: string): string[] {
  const topicKeywords = [
    'PMS', 'maintenance', 'scheduling', 'fleetcore', 'seacore',
    'compliance', 'inspection', 'safety', 'crew', 'inventory',
    'procurement', 'work orders', 'tasks', 'certificates'
  ];
  
  return topicKeywords.filter(topic => 
    new RegExp(`\\b${topic}\\b`, 'i').test(text)
  );
}

/**
 * Detect user intent from query patterns
 */
export function detectUserIntent(query: string, currentIntent: string): string {
  const queryLower = query.toLowerCase();
  
  // Evaluation intent
  if (/\b(evaluate|assess|consider|implement|adopt|use|apply)\b.*\bfleetcore\b/i.test(query) ||
      /\bfleetcore\b.*\b(for|with|on)\b.*\b(vessel|ship|fleet|company)\b/i.test(query)) {
    return 'evaluating fleetcore for specific entity';
  }
  
  // Learning intent
  if (/\b(what is|tell me about|explain|how does)\b.*\bfleetcore\b/i.test(query)) {
    return 'learning about fleetcore';
  }
  
  // Comparison intent
  if (/\b(compare|vs|versus|difference|better)\b/i.test(query)) {
    return 'comparing options';
  }
  
  // Information gathering
  if (/\b(what|who|where|when|which)\b/i.test(query)) {
    return currentIntent || 'gathering information';
  }
  
  return currentIntent || 'general inquiry';
}

/**
 * Update conversation topic with new information
 * Merges topics into a flow (e.g., "fleetcore PMS → vessel Dynamic 17 → maintenance systems")
 */
export function updateConversationTopic(
  currentTopic: string,
  newTopicElements: string[]
): string {
  if (newTopicElements.length === 0) return currentTopic;
  
  const existingTopics = currentTopic ? currentTopic.split(' → ') : [];
  const newTopic = newTopicElements[0]; // Take primary topic
  
  // Don't add if already in chain
  if (existingTopics.includes(newTopic)) {
    return currentTopic;
  }
  
  // Add to chain
  const updatedTopics = [...existingTopics, newTopic].slice(-5); // Keep last 5
  return updatedTopics.join(' → ');
}

/**
 * Accumulate knowledge from conversation turn
 * Extracts entities, features, and updates session memory
 */
export async function accumulateKnowledge(
  userQuery: string,
  assistantResponse: string,
  sessionMemory: SessionMemory,
  sessionMemoryManager: SessionMemoryManager,
  messageIndex: number
): Promise<void> {
  console.log(`\n🧠 ACCUMULATING KNOWLEDGE (Turn ${messageIndex})`);
  
  // 1. Extract fleetcore features
  const queryFeatures = extractFleetcoreFeatures(userQuery, messageIndex);
  const responseFeatures = extractFleetcoreFeatures(assistantResponse, messageIndex);
  const allFeatures = [...queryFeatures, ...responseFeatures];
  
  if (allFeatures.length > 0) {
    console.log(`   ✨ Found ${allFeatures.length} fleetcore features`);
    allFeatures.forEach(feature => {
      sessionMemoryManager.addFleetcoreFeature(
        sessionMemory,
        feature.name,
        feature.explanation,
        feature.messageIndex
      );
    });
  }
  
  // 2. Extract entities from both query and response
  const queryEntities = extractMaritimeEntities(userQuery);
  const responseEntities = extractMaritimeEntities(assistantResponse);
  const allEntities = [...new Set([...queryEntities, ...responseEntities])];
  
  if (allEntities.length > 0) {
    console.log(`   🚢 Found ${allEntities.length} entities: ${allEntities.join(', ')}`);
    
    // Extract rich context for each entity from the response
    allEntities.forEach(entityName => {
      const entityContext = extractEntityContextFromAnswer(assistantResponse, entityName);
      
      // Add to appropriate category based on type
      if (entityContext.entityType === 'vessel' || entityContext.imo || entityContext.vesselType) {
        sessionMemoryManager.addVesselEntity(sessionMemory, entityName, {
          name: entityName,
          imo: entityContext.imo,
          type: entityContext.vesselType,
          operator: entityContext.operator,
          specs: entityContext.specs,
          discussed: true,
          firstMentioned: messageIndex,
        });
        console.log(`      → Added vessel: ${entityName}${entityContext.imo ? ` (IMO: ${entityContext.imo})` : ''}`);
      } else if (entityContext.entityType === 'company' || /marine|shipping|services|group/i.test(entityName)) {
        sessionMemoryManager.addCompanyEntity(sessionMemory, entityName, {
          name: entityName,
          ...entityContext,
          discussed: true,
          firstMentioned: messageIndex,
        });
        console.log(`      → Added company: ${entityName}`);
      }
    });
  }
  
  // 3. Extract and update topics
  const queryTopics = extractDiscussedTopics(userQuery);
  const responseTopics = extractDiscussedTopics(assistantResponse);
  const allTopics = [...new Set([...queryTopics, ...responseTopics])];
  
  if (allTopics.length > 0) {
    console.log(`   📝 Discussed topics: ${allTopics.join(', ')}`);
    const newTopic = updateConversationTopic(sessionMemory.conversationTopic, allTopics);
    if (newTopic !== sessionMemory.conversationTopic) {
      sessionMemoryManager.updateTopic(sessionMemory, newTopic);
      console.log(`   📊 Topic updated: "${sessionMemory.conversationTopic}"`);
    }
  }
  
  // 4. Detect and update intent
  const detectedIntent = detectUserIntent(userQuery, sessionMemory.userIntent);
  if (detectedIntent !== sessionMemory.userIntent) {
    sessionMemoryManager.updateIntent(sessionMemory, detectedIntent);
    console.log(`   🎯 Intent updated: "${detectedIntent}"`);
  }
  
  // 5. Add connections if we found vessels AND companies
  const vessels = Object.keys(sessionMemory.accumulatedKnowledge.vesselEntities);
  const companies = Object.keys(sessionMemory.accumulatedKnowledge.companyEntities);
  
  if (vessels.length > 0 && companies.length > 0) {
    // Look for operator/owner connections in response
    vessels.forEach(vesselKey => {
      const vessel = sessionMemory.accumulatedKnowledge.vesselEntities[vesselKey];
      if (vessel.operator) {
        // Check if operator matches any known company
        companies.forEach(companyKey => {
          const company = sessionMemory.accumulatedKnowledge.companyEntities[companyKey];
          if (vessel.operator.toLowerCase().includes(company.name.toLowerCase()) ||
              company.name.toLowerCase().includes(vessel.operator.toLowerCase())) {
            sessionMemoryManager.addConnection(
              sessionMemory,
              vessel.name,
              company.name,
              'operated by',
              messageIndex
            );
            console.log(`   🔗 Connection: ${vessel.name} ↔ ${company.name} (operated by)`);
          }
        });
      }
    });
  }
  
  // 6. Update conversation summary
  sessionMemoryManager.updateConversationSummary(sessionMemory);
  
  console.log(`   ✅ Knowledge accumulation complete`);
  console.log(`      Total features: ${sessionMemory.accumulatedKnowledge.fleetcoreFeatures.length}`);
  console.log(`      Total vessels: ${Object.keys(sessionMemory.accumulatedKnowledge.vesselEntities).length}`);
  console.log(`      Total companies: ${Object.keys(sessionMemory.accumulatedKnowledge.companyEntities).length}`);
}

