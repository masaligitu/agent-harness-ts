import { ModelAdapter, ModelRequest, ModelResponse, ModelGenerateOptions } from '../../core/src/model/ModelTypes.js';
import { AgentDecision } from '../../core/src/agent/AgentDecision.js';

export type MockBehavior =
  | { type: 'decision'; decision: AgentDecision; delayMs?: number }
  | { type: 'raw'; rawText: string; decision: any; delayMs?: number }
  | { type: 'error'; error: Error; delayMs?: number };

export class MockModelAdapter implements ModelAdapter {
  public readonly name = 'MockModelAdapter';
  private behaviors: MockBehavior[] = [];
  private callCount = 0;

  constructor(behaviors: MockBehavior[] = []) {
    this.behaviors = [...behaviors];
  }

  public enqueue(behavior: MockBehavior): void {
    this.behaviors.push(behavior);
  }

  public getCallsCount(): number {
    return this.callCount;
  }

  public async generate(
    request: ModelRequest,
    options?: ModelGenerateOptions
  ): Promise<ModelResponse> {
    this.callCount++;
    const current = this.behaviors.shift();

    if (!current) {
      // Default fallback
      return {
        decision: {
          type: 'final',
          content: 'Default mock final completion.',
        },
      };
    }

    if (current.delayMs && current.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, current.delayMs));
    }

    if (options?.signal?.aborted) {
      throw new Error('Model request aborted by caller signal.');
    }

    if (current.type === 'error') {
      throw current.error;
    }

    if (current.type === 'raw') {
      return {
        decision: current.decision,
        rawText: current.rawText,
      };
    }

    return {
      decision: current.decision,
    };
  }
}
