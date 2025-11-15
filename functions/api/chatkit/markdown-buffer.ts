/**
 * Markdown Buffer - Prevents streaming breaks in markdown structures
 * 
 * Problem: Token-by-token streaming can break:
 * - Headers: "##" arriving in separate chunks
 * - Links: "[text](" split from "url)"
 * - Code blocks: "```" split across chunks
 * 
 * Solution: Buffer partial structures until complete
 */

export class MarkdownBuffer {
  private buffer: string = '';
  private pendingStructures: Array<{type: string; start: number}> = [];
  
  /**
   * Add chunk to buffer and return complete markdown elements
   */
  public processChunk(chunk: string): string {
    this.buffer += chunk;
    
    // Extract complete markdown structures
    return this.extractCompleteStructures();
  }
  
  /**
   * Flush remaining buffer (call when stream ends)
   */
  public flush(): string {
    const remaining = this.buffer;
    this.buffer = '';
    this.pendingStructures = [];
    return remaining;
  }
  
  /**
   * Extract complete markdown structures, leave incomplete ones in buffer
   */
  private extractCompleteStructures(): string {
    let output = '';
    let lastSafeIndex = 0;
    
    // Check for incomplete headers at end
    const headerMatch = this.buffer.match(/(^|\n)(#{1,6})$/);
    if (headerMatch) {
      // Keep incomplete header in buffer
      lastSafeIndex = headerMatch.index!;
      output = this.buffer.substring(0, lastSafeIndex);
      this.buffer = this.buffer.substring(lastSafeIndex);
      return output;
    }
    
    // Check for incomplete links at end [text](
    const linkMatch = this.buffer.match(/\[([^\]]*)\]\(([^)]*)?$/);
    if (linkMatch && !linkMatch[2]?.includes(')')) {
      // Keep incomplete link in buffer
      lastSafeIndex = linkMatch.index!;
      output = this.buffer.substring(0, lastSafeIndex);
      this.buffer = this.buffer.substring(lastSafeIndex);
      return output;
    }
    
    // Check for incomplete code blocks ```
    const openBackticks = (this.buffer.match(/```/g) || []).length;
    if (openBackticks % 2 !== 0) {
      // Odd number of ``` means one is open
      const lastBacktickIndex = this.buffer.lastIndexOf('```');
      const afterLastBacktick = this.buffer.substring(lastBacktickIndex);
      
      // If no newline after last ```, keep it in buffer
      if (!afterLastBacktick.includes('\n')) {
        output = this.buffer.substring(0, lastBacktickIndex);
        this.buffer = this.buffer.substring(lastBacktickIndex);
        return output;
      }
    }
    
    // Check for incomplete bold/italic at end
    const emphasisMatch = this.buffer.match(/(\*\*?|__?)([^*_]*)$/);
    if (emphasisMatch && emphasisMatch[2].length < 20) {
      // Keep incomplete emphasis in buffer (unless very long, then it's likely not emphasis)
      lastSafeIndex = emphasisMatch.index!;
      output = this.buffer.substring(0, lastSafeIndex);
      this.buffer = this.buffer.substring(lastSafeIndex);
      return output;
    }
    
    // All structures complete, emit entire buffer
    output = this.buffer;
    this.buffer = '';
    return output;
  }
  
  /**
   * Check if buffer has pending incomplete structures
   */
  public hasPending(): boolean {
    return this.buffer.length > 0;
  }
  
  /**
   * Get current buffer content (for debugging)
   */
  public getBuffer(): string {
    return this.buffer;
  }
}

/**
 * Streaming markdown processor
 * Usage:
 * 
 * const buffer = new MarkdownBuffer();
 * for await (const chunk of stream) {
 *   const completeMarkdown = buffer.processChunk(chunk.content);
 *   if (completeMarkdown) {
 *     emit(completeMarkdown);
 *   }
 * }
 * // Don't forget to flush at end
 * const remaining = buffer.flush();
 * if (remaining) emit(remaining);
 */

export function createMarkdownBuffer(): MarkdownBuffer {
  return new MarkdownBuffer();
}

