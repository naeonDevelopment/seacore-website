/**
 * Conversation Summarization System
 * Automatically summarizes conversations every N turns to maintain context
 * 
 * Phase 4 (Partial) - P1 Implementation
 */

import type { SessionMemory } from './session-memory';

/**
 * Configuration for summarization
 */
const SUMMARIZE_EVERY_N_TURNS = 5;
const MAX_SUMMARY_LENGTH = 500; // characters

/**
 * Check if conversation should be summarized
 */
export function shouldSummarize(messageCount: number): boolean {
  return messageCount > 0 && messageCount % SUMMARIZE_EVERY_N_TURNS === 0;
}

/**
 * Generate conversation summary from session memory
 * Creates a concise narrative of what's been discussed
 */
export function generateSummary(sessionMemory: SessionMemory): string {
  const parts: string[] = [];
  
  // Part 1: User intent and conversation state
  if (sessionMemory.userIntent) {
    parts.push(`User intent: ${sessionMemory.userIntent}`);
  }
  
  if (sessionMemory.conversationState && sessionMemory.conversationState !== 'cold_start') {
    parts.push(`State: ${sessionMemory.conversationState}`);
  }
  
  // Part 2: Fleetcore features discussed
  const features = sessionMemory.accumulatedKnowledge.fleetcoreFeatures || [];
  if (features.length > 0) {
    const featureNames = features.slice(-3).map(f => f.name).join(', ');
    parts.push(`Discussed fleetcore: ${featureNames}`);
  }
  
  // Part 3: Entities discussed
  const vessels = Object.keys(sessionMemory.accumulatedKnowledge.vesselEntities || {});
  const companies = Object.keys(sessionMemory.accumulatedKnowledge.companyEntities || {});
  
  if (vessels.length > 0) {
    parts.push(`Vessels: ${vessels.join(', ')}`);
  }
  
  if (companies.length > 0) {
    parts.push(`Companies: ${companies.join(', ')}`);
  }
  
  // Part 4: Key connections
  const connections = sessionMemory.accumulatedKnowledge.connections || [];
  if (connections.length > 0) {
    const conn = connections[connections.length - 1];
    parts.push(`Relationship: ${conn.from} ${conn.relationship} ${conn.to}`);
  }
  
  // Part 5: Topic evolution
  if (sessionMemory.conversationTopic) {
    parts.push(`Topic: ${sessionMemory.conversationTopic}`);
  }
  
  // Join parts and truncate if too long
  let summary = parts.join('. ');
  if (summary.length > MAX_SUMMARY_LENGTH) {
    summary = summary.substring(0, MAX_SUMMARY_LENGTH) + '...';
  }
  
  return summary;
}

/**
 * Build enhanced context window based on conversation state
 * Returns recent messages relevant to current state
 */
export function buildContextWindow(
  sessionMemory: SessionMemory,
  windowSize: number = 3
): string {
  const recentMessages = sessionMemory.recentMessages.slice(-windowSize);
  
  if (recentMessages.length === 0) {
    return '';
  }
  
  const contextParts: string[] = [];
  
  // Add summary if available
  if (sessionMemory.conversationSummary) {
    contextParts.push(`CONVERSATION CONTEXT: ${sessionMemory.conversationSummary}`);
  }
  
  // Add recent exchanges
  contextParts.push(`\nRECENT EXCHANGES:`);
  for (const msg of recentMessages) {
    const preview = msg.content.substring(0, 100);
    contextParts.push(`${msg.role}: ${preview}${msg.content.length > 100 ? '...' : ''}`);
  }
  
  return contextParts.join('\n');
}

/**
 * Compress old conversation data to save memory
 * Keeps structured data, discards old message text
 */
export function compressOldTurns(sessionMemory: SessionMemory, keepLastN: number = 10): void {
  // Keep only last N messages
  if (sessionMemory.recentMessages.length > keepLastN) {
    const oldMessages = sessionMemory.recentMessages.slice(0, -keepLastN);
    
    // Extract any remaining entities from old messages before discarding
    // (This is already handled by accumulateKnowledge, so we can safely discard)
    
    sessionMemory.recentMessages = sessionMemory.recentMessages.slice(-keepLastN);
    
    console.log(`🗜️ Compressed: Kept last ${keepLastN} messages, discarded ${oldMessages.length} old messages`);
  }
  
  // Limit mode history
  if (sessionMemory.modeHistory.length > 10) {
    sessionMemory.modeHistory = sessionMemory.modeHistory.slice(-10);
  }
  
  // Limit state transitions
  if (sessionMemory.stateTransitions && sessionMemory.stateTransitions.length > 10) {
    sessionMemory.stateTransitions = sessionMemory.stateTransitions.slice(-10);
  }
  
  // Limit intent history
  if (sessionMemory.intentHistory && sessionMemory.intentHistory.length > 10) {
    sessionMemory.intentHistory = sessionMemory.intentHistory.slice(-10);
  }
}

/**
 * Update conversation summary with new information
 * Merges new summary with existing context
 */
export function updateSummary(
  sessionMemory: SessionMemory,
  newInfo: string
): void {
  if (!sessionMemory.conversationSummary) {
    sessionMemory.conversationSummary = newInfo;
    return;
  }
  
  // Merge new info with existing summary
  const combined = `${sessionMemory.conversationSummary}. ${newInfo}`;
  
  // If combined summary too long, regenerate from scratch
  if (combined.length > MAX_SUMMARY_LENGTH * 2) {
    sessionMemory.conversationSummary = generateSummary(sessionMemory);
  } else {
    sessionMemory.conversationSummary = combined;
  }
}

/**
 * Log summarization event
 */
export function logSummarization(
  turn: number,
  summaryLength: number,
  messagesCompressed: number
): void {
  console.log(`\n📝 CONVERSATION SUMMARIZATION (Turn ${turn})`);
  console.log(`   Summary length: ${summaryLength} chars`);
  console.log(`   Messages compressed: ${messagesCompressed}`);
  console.log(`   Memory optimization complete`);
}

