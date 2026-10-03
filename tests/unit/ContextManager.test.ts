import { describe, it, expect } from 'vitest';
import {
  ContextManager,
  HarnessMessage,
  PriorityClass,
} from '../../packages/core/src/context/ContextManager.js';
import { HarnessError } from '../../packages/core/src/errors/HarnessError.js';
import { ErrorCodes } from '../../packages/core/src/errors/ErrorCodes.js';

describe('ContextManager', () => {
  it('preserves critical messages and prunes discardable ones under budget', () => {
    const cm = new ContextManager();
    const now = Date.now();

    const messages: HarnessMessage[] = [
      {
        id: '1',
        role: 'system',
        content: 'System prompt instructions',
        priority: PriorityClass.CRITICAL,
        createdAt: now - 300,
      },
      {
        id: '2',
        role: 'user',
        content: 'User query target',
        priority: PriorityClass.IMPORTANT,
        createdAt: now - 200,
      },
      {
        id: '3',
        role: 'assistant',
        content: 'Super lengthy discardable trace message '.repeat(20),
        priority: PriorityClass.DISCARDABLE,
        createdAt: now - 100,
      },
    ];

    const budget = { maxTokens: 40, reservedForOutput: 10 };
    const res = cm.build(messages, budget);

    expect(res.messages.some((m) => m.id === '1')).toBe(true);
    expect(res.messages.some((m) => m.id === '2')).toBe(true);
    expect(res.messages.some((m) => m.id === '3')).toBe(false);
    expect(res.droppedMessageIds).toContain('3');
  });

  it('throws CONTEXT_BUDGET_EXCEEDED if critical instructions exceed budget alone', () => {
    const cm = new ContextManager();
    const messages: HarnessMessage[] = [
      {
        id: 'critical_huge',
        role: 'system',
        content: 'Huge critical directive '.repeat(50),
        priority: PriorityClass.CRITICAL,
        createdAt: Date.now(),
      },
    ];

    const budget = { maxTokens: 20, reservedForOutput: 5 };
    try {
      cm.build(messages, budget);
      expect.fail('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HarnessError);
      expect(err.code).toBe(ErrorCodes.CONTEXT_BUDGET_EXCEEDED);
    }
  });
});
