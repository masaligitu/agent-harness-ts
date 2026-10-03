export class TokenEstimator {
  /**
   * Deterministic token estimation without heavy external vendor libraries.
   * Standard rule of thumb for English/code: ~4 chars per token.
   */
  public static estimate(text: string): number {
    if (!text || text.length === 0) return 0;
    return Math.ceil(text.length / 4);
  }

  public static estimateMessage(msg: { content: string; role?: string }): number {
    const roleTokens = msg.role ? 4 : 0;
    return roleTokens + TokenEstimator.estimate(msg.content);
  }
}
