import { EvalFixture, EvalResult } from '../EvalTypes.js';
import {
  ContextManager,
  HarnessMessage,
  PriorityClass,
  ContextBudget,
} from '../../../core/src/context/ContextManager.js';

export const E06ContextPressure: EvalFixture = {
  id: 'E06',
  name: 'Context Window Pressure & Pruning',
  description: 'Under severe context budget constraints, preserves critical instructions and prunes discardable traces.',
  async run(): Promise<EvalResult> {
    const start = Date.now();
    try {
      const contextManager = new ContextManager();
      const now = Date.now();

      const messages: HarnessMessage[] = [
        {
          id: 'sys-critical',
          role: 'system',
          content: 'SYSTEM CRITICAL SAFETY DIRECTIVE: DO NOT EXCEED PRIVILEGES',
          priority: PriorityClass.CRITICAL,
          createdAt: now - 5000,
        },
        {
          id: 'user-goal',
          role: 'user',
          content: 'Execute audited pipeline',
          priority: PriorityClass.IMPORTANT,
          createdAt: now - 4000,
        },
        {
          id: 'old-trace-discardable-1',
          role: 'assistant',
          content: 'Intermediate debug trace string padding data '.repeat(30),
          priority: PriorityClass.DISCARDABLE,
          createdAt: now - 3000,
        },
        {
          id: 'old-trace-discardable-2',
          role: 'assistant',
          content: 'More discardable logs padding data '.repeat(30),
          priority: PriorityClass.DISCARDABLE,
          createdAt: now - 2000,
        },
        {
          id: 'recent-important-tool-result',
          role: 'tool',
          content: 'Confirmed verified output status: ready',
          priority: PriorityClass.IMPORTANT,
          createdAt: now - 1000,
        },
      ];

      // Constrained budget: only enough for critical + important, discardables MUST be dropped
      const budget: ContextBudget = {
        maxTokens: 60,
        reservedForOutput: 10,
      };

      const result = contextManager.build(messages, budget);

      const hasCritical = result.messages.some((m) => m.id === 'sys-critical');
      const hasImportantGoal = result.messages.some((m) => m.id === 'user-goal');
      const hasDiscardable1 = result.messages.some((m) => m.id === 'old-trace-discardable-1');
      const droppedProperly = result.droppedMessageIds.includes('old-trace-discardable-1');

      const passed =
        hasCritical &&
        hasImportantGoal &&
        !hasDiscardable1 &&
        droppedProperly &&
        result.estimatedTokens <= budget.maxTokens - budget.reservedForOutput;

      return {
        id: 'E06',
        name: 'Context Window Pressure & Pruning',
        passed,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        id: 'E06',
        name: 'Context Window Pressure & Pruning',
        passed: false,
        durationMs: Date.now() - start,
        error: err.message,
      };
    }
  },
};
