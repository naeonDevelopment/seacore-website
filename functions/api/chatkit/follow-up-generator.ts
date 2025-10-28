/**
 * FOLLOW-UP QUESTION GENERATOR (Phase C1 & C2)
 * Generates contextual follow-up suggestions to increase session engagement
 * 
 * Target: +30% session length, >40% sessions use follow-ups
 */

import { SessionMemory } from './session-memory';

export interface FollowUpSuggestion {
  question: string;
  category: 'entity_deep_dive' | 'comparison' | 'related_topic' | 'platform_feature' | 'verification';
  confidence: number;
  reasoning: string;
}

/**
 * Generate 3-5 contextual follow-up questions based on conversation state
 */
export async function generateFollowUps(
  query: string,
  answer: string,
  sessionMemory: SessionMemory,
  openaiKey: string
): Promise<FollowUpSuggestion[]> {
  
  // Extract context from session
  const entities = sessionMemory.entities || [];
  const lastEntity = entities[entities.length - 1];
  const conversationTopic = sessionMemory.conversationTopic || 'maritime operations';
  const conversationState = sessionMemory.conversationState || 'general_inquiry';
  
  const followUpPrompt = `You are a follow-up question generator for a maritime intelligence assistant.

CONVERSATION CONTEXT:
- Current Query: "${query}"
- Last Answer: "${answer.substring(0, 500)}..."
- Conversation Topic: ${conversationTopic}
- Conversation State: ${conversationState}
- Recent Entity: ${lastEntity?.name || 'None'}
- Total Messages: ${sessionMemory.messageCount || 0}

TASK: Generate 3-5 natural follow-up questions that:
1. Deepen understanding of the current topic
2. Explore related aspects (maintenance, compliance, equipment)
3. Compare with similar entities (if applicable)
4. Connect to Fleetcore platform features
5. Verify or expand on uncertain information

RULES:
- Keep questions concise (under 12 words)
- Make them actionable and specific
- Mix different question types
- Sound natural, not robotic
- Reference specific entities when possible

Return JSON array:
[
  {
    "question": "What maintenance schedule does [entity] follow?",
    "category": "entity_deep_dive",
    "confidence": 85,
    "reasoning": "User showed interest in vessel details, maintenance is logical next step"
  },
  {
    "question": "How does this compare to similar vessels?",
    "category": "comparison",
    "confidence": 75,
    "reasoning": "Comparison queries drive engagement"
  },
  {
    "question": "What are the SOLAS requirements for this type?",
    "category": "related_topic",
    "confidence": 70,
    "reasoning": "Regulatory compliance is relevant for vessel operations"
  }
]

Return ONLY the JSON array:`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a follow-up question generator. Generate natural, engaging questions. Return valid JSON only.' 
          },
          { role: 'user', content: followUpPrompt }
        ],
        temperature: 0.7, // Slightly higher for variety
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      console.error('❌ Follow-up generation failed:', response.status);
      return getFallbackFollowUps(conversationState, lastEntity?.name);
    }

    const json = await response.json();
    const extractedText = json.choices?.[0]?.message?.content || '[]';
    
    const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn('⚠️ No valid JSON in follow-up generation');
      return getFallbackFollowUps(conversationState, lastEntity?.name);
    }
    
    const followUps: FollowUpSuggestion[] = JSON.parse(jsonMatch[0]);
    console.log(`✅ Generated ${followUps.length} follow-up questions`);
    return followUps.slice(0, 5); // Max 5
    
  } catch (error) {
    console.error('❌ Follow-up generation error:', error);
    return getFallbackFollowUps(conversationState, lastEntity?.name);
  }
}

/**
 * Fallback follow-ups if generation fails (based on conversation state)
 */
function getFallbackFollowUps(
  conversationState: string,
  entityName?: string
): FollowUpSuggestion[] {
  
  const stateFollowUps: Record<string, FollowUpSuggestion[]> = {
    'entity_discovery': [
      {
        question: entityName ? `What equipment does ${entityName} use?` : 'What equipment specifications are available?',
        category: 'entity_deep_dive',
        confidence: 80,
        reasoning: 'Equipment details natural follow-up for vessel discovery'
      },
      {
        question: 'What are the maintenance requirements?',
        category: 'related_topic',
        confidence: 75,
        reasoning: 'Maintenance is core to maritime operations'
      },
      {
        question: 'How does Fleetcore track this vessel?',
        category: 'platform_feature',
        confidence: 70,
        reasoning: 'Connect entity to platform capabilities'
      }
    ],
    'platform_exploration': [
      {
        question: 'Can Fleetcore integrate with my existing systems?',
        category: 'platform_feature',
        confidence: 85,
        reasoning: 'Integration is common concern after feature exploration'
      },
      {
        question: 'What reporting capabilities does it have?',
        category: 'platform_feature',
        confidence: 80,
        reasoning: 'Reporting is key feature interest'
      },
      {
        question: 'How does the maintenance scheduling work?',
        category: 'entity_deep_dive',
        confidence: 75,
        reasoning: 'Dive into specific feature details'
      }
    ],
    'comparative_mode': [
      {
        question: 'What are the key differences in maintenance needs?',
        category: 'comparison',
        confidence: 85,
        reasoning: 'Extend comparison to operational aspects'
      },
      {
        question: 'Which vessel has better fuel efficiency?',
        category: 'comparison',
        confidence: 80,
        reasoning: 'Operational efficiency is important metric'
      },
      {
        question: 'How do their compliance records compare?',
        category: 'verification',
        confidence: 75,
        reasoning: 'Compliance comparison adds depth'
      }
    ]
  };
  
  return stateFollowUps[conversationState] || [
    {
      question: 'What other information would be helpful?',
      category: 'related_topic',
      confidence: 60,
      reasoning: 'Generic fallback'
    },
    {
      question: 'Would you like to explore similar topics?',
      category: 'related_topic',
      confidence: 55,
      reasoning: 'Generic fallback'
    }
  ];
}

/**
 * Track follow-up usage for analytics (Phase C2)
 */
export function trackFollowUpUsage(
  sessionMemory: SessionMemory,
  selectedFollowUp: string | null
): void {
  if (!sessionMemory.metadata) {
    sessionMemory.metadata = {};
  }
  
  // Initialize follow-up tracking
  if (!sessionMemory.metadata.followUpMetrics) {
    sessionMemory.metadata.followUpMetrics = {
      followUpsPresented: 0,
      followUpsClicked: 0,
      clickRate: 0,
      categories: {}
    };
  }
  
  const metrics = sessionMemory.metadata.followUpMetrics;
  
  if (selectedFollowUp) {
    // User clicked a follow-up
    metrics.followUpsClicked++;
    console.log(`📊 Follow-up clicked: ${selectedFollowUp}`);
  } else {
    // Follow-ups presented
    metrics.followUpsPresented++;
  }
  
  // Calculate click rate
  if (metrics.followUpsPresented > 0) {
    metrics.clickRate = (metrics.followUpsClicked / metrics.followUpsPresented) * 100;
  }
  
  console.log(`📊 Follow-up metrics: ${metrics.followUpsClicked}/${metrics.followUpsPresented} = ${metrics.clickRate.toFixed(1)}%`);
}

